const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = 8765;

const server = http.createServer((req, res) => {
  const url = req.url === "/" ? "/ecpr_commander_v5.1_legacy.html" : req.url.split("?")[0];
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
    const types = { ".html": "text/html; charset=utf-8", ".txt": "text/html; charset=utf-8", ".js": "text/javascript" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`ready http://127.0.0.1:${PORT}`);
});
