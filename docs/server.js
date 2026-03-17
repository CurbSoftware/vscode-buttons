const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = "0.0.0.0";
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".md": "text/markdown; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".txt": "text/plain; charset=UTF-8",
  ".xml": "application/xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = path.join(ROOT, decodeURIComponent(url.pathname));

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // Serve index.html for directory roots
  if (filePath.endsWith("/") || filePath === ROOT) {
    filePath = path.join(filePath, "index.html");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      const status = err.code === "ENOENT" ? 404 : 500;
      const ts = new Date().toISOString();
      console.log(`${ts} ${req.method} ${req.url} ${status}`);
      res.writeHead(status, { "Content-Type": "text/plain" });
      res.end(status === 404 ? "Not Found" : "Internal Server Error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const ts = new Date().toISOString();
    console.log(`${ts} ${req.method} ${req.url} 200`);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Docs server listening on http://${HOST}:${PORT}`);
});
