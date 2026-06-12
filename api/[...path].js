const app = require("../server/app");

module.exports = (req, res) => {
  console.log("[api]", req.method, req.url);
  app(req, res);
};
