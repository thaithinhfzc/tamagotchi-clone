// Zero-dependency static server (ES modules need http://, not file://). Usage: npm start [-- --port 5178]
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const portArg = process.argv.indexOf("--port");
const port = Number(portArg > -1 ? process.argv[portArg + 1] : process.env.PORT || 5178);
const TYPES = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png" };

http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = normalize(join(root, path === "/" ? "index.html" : path));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type":TYPES[extname(file)] || "application/octet-stream", "cache-control":"no-store" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, () => console.log(`Hành Tinh Bỏ Túi → http://localhost:${port}`));
