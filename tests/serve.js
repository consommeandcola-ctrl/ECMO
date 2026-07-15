const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = 8765;

function createServer() {
  return http.createServer((req, res) => {
    const rawUrl = req.url === "/" ? "/ecpr_commander_v5.1_legacy.html" : req.url.split("?")[0];
    const url = rawUrl.endsWith("/") ? rawUrl + "index.html" : rawUrl;
    const filePath = path.join(ROOT, decodeURIComponent(url.slice(1)));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const ext = path.extname(filePath);
      const types = { ".html": "text/html; charset=utf-8", ".txt": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
}

function startServer(port = PORT) {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

if (require.main === module) {
  startServer().then((server) => {
    console.log(`ready http://127.0.0.1:${PORT}`);
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.on(signal, () => {
        server.close(() => process.exit(0));
        if (server.closeAllConnections) server.closeAllConnections();
        setTimeout(() => process.exit(0), 500).unref();
      });
    }
  });
}

module.exports = { startServer };
