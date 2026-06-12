const app = require("../server/app");

module.exports = (req, res) => {
  if (req.url.startsWith("/api/index.js")) {
    const url = new URL(req.url, "http://localhost");
    const path = url.searchParams.get("path");
    if (path) {
      url.searchParams.delete("path");
      req.url = `/api/${path}${url.search ? url.search : ""}`;
    }
  }

  console.log("[api]", req.method, req.url);
  app(req, res);
};
