const express = require("express");
const path = require("path");
const { openDb, hashText, todayKey, rootDir } = require("./db");

const app = express();
const db = openDb();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(rootDir, "public")));
app.use("/assets", express.static(path.join(rootDir, "assets")));

const getQuoteById = db.prepare(`
  SELECT q.*, EXISTS(SELECT 1 FROM favorites f WHERE f.quote_id = q.id) AS favorite
  FROM quotes q
  WHERE q.id = ? AND q.active = 1
`);

function recordHistory(quoteId, source) {
  db.prepare("INSERT INTO history (quote_id, shown_on, source) VALUES (?, ?, ?)").run(quoteId, todayKey(), source);
}

function serializeQuote(row) {
  return {
    id: row.id,
    eyebrow: row.eyebrow,
    headline: row.headline,
    message: row.message,
    favorite: Boolean(row.favorite)
  };
}

app.get("/api/today", (req, res) => {
  const rows = db.prepare("SELECT id FROM quotes WHERE active = 1 ORDER BY id").all();
  if (rows.length === 0) {
    res.status(404).json({ error: "No quotes available" });
    return;
  }

  const index = hashText(todayKey()) % rows.length;
  const quote = getQuoteById.get(rows[index].id);
  recordHistory(quote.id, "today");
  res.json({ quote: serializeQuote(quote), dateKey: todayKey() });
});

app.get("/api/quotes/random", (req, res) => {
  const excludeId = Number(req.query.exclude || 0);
  const rows = db.prepare("SELECT id FROM quotes WHERE active = 1 AND id != ? ORDER BY RANDOM() LIMIT 1").all(excludeId);
  const fallback = db.prepare("SELECT id FROM quotes WHERE active = 1 ORDER BY RANDOM() LIMIT 1").get();
  const picked = rows[0] || fallback;

  if (!picked) {
    res.status(404).json({ error: "No quotes available" });
    return;
  }

  const quote = getQuoteById.get(picked.id);
  recordHistory(quote.id, "random");
  res.json({ quote: serializeQuote(quote) });
});

app.get("/api/quotes", (req, res) => {
  const quotes = db.prepare(`
    SELECT q.*, EXISTS(SELECT 1 FROM favorites f WHERE f.quote_id = q.id) AS favorite
    FROM quotes q
    WHERE q.active = 1
    ORDER BY q.id
  `).all();
  res.json({ quotes: quotes.map(serializeQuote) });
});

app.get("/api/backgrounds", (req, res) => {
  const backgrounds = db.prepare("SELECT id, label, file, swatch_a AS swatchA, swatch_b AS swatchB FROM backgrounds ORDER BY rowid").all();
  const active = db.prepare("SELECT value FROM settings WHERE key = 'background'").get()?.value || "lake";
  res.json({ backgrounds, active });
});

app.put("/api/settings/background", (req, res) => {
  const id = String(req.body?.id || "");
  const exists = db.prepare("SELECT 1 FROM backgrounds WHERE id = ?").get(id);
  if (!exists) {
    res.status(400).json({ error: "Unknown background" });
    return;
  }

  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('background', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(id);
  res.json({ ok: true, active: id });
});

app.get("/api/favorites", (req, res) => {
  const favorites = db.prepare(`
    SELECT q.*, 1 AS favorite
    FROM favorites f
    JOIN quotes q ON q.id = f.quote_id
    ORDER BY f.created_at DESC
  `).all();
  res.json({ favorites: favorites.map(serializeQuote) });
});

app.post("/api/favorites", (req, res) => {
  const quoteId = Number(req.body?.quoteId);
  const quote = getQuoteById.get(quoteId);
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  db.prepare("INSERT OR IGNORE INTO favorites (quote_id) VALUES (?)").run(quoteId);
  res.status(201).json({ ok: true, quote: { ...serializeQuote(quote), favorite: true } });
});

app.delete("/api/favorites/:quoteId", (req, res) => {
  db.prepare("DELETE FROM favorites WHERE quote_id = ?").run(Number(req.params.quoteId));
  res.json({ ok: true });
});

app.get("/api/history", (req, res) => {
  const history = db.prepare(`
    SELECT h.id, h.shown_on AS shownOn, h.source, h.created_at AS createdAt, q.eyebrow, q.headline, q.message
    FROM history h
    JOIN quotes q ON q.id = h.quote_id
    ORDER BY h.created_at DESC
    LIMIT 30
  `).all();
  res.json({ history });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(rootDir, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Night Focus is running at http://localhost:${port}`);
});
