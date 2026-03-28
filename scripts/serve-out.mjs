/**
 * Next.js `output: "export"` の out/ を配信する。
 * `counter.html` のようにルート直下に置かれる HTML へ、/counter など拡張子なし URL でアクセスできる（Vercel 静的配信に近い）。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "out");
const port = parseInt(String(process.env.PORT || "3000"), 10) || 3000;
const host = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
};

function resolveFile(urlPath) {
  let p = urlPath.split("?")[0] || "/";
  if (p.includes("..")) return null;
  p = decodeURIComponent(p);
  if (p.endsWith("/")) p = p.slice(0, -1) || "/";
  if (p === "/") return path.join(root, "index.html");

  const rel = p.slice(1);
  const direct = path.join(root, rel);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;

  const withHtml = path.join(root, `${rel}.html`);
  if (fs.existsSync(withHtml)) return withHtml;

  const dirIndex = path.join(root, rel, "index.html");
  if (fs.existsSync(dirIndex)) return dirIndex;

  return null;
}

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

const server = http.createServer((req, res) => {
  const filePath = resolveFile(req.url || "/");
  if (!filePath) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType(filePath) });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  // Playwright の webServer は stdout を待つので 1 行出す
  process.stdout.write(`serve-out: http://${host}:${port}/\n`);
});
