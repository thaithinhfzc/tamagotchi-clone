// Cloud save endpoint. One JSON file per account, optimistic concurrency on `rev`.
// Identity comes from a Google ID token, exchanged once for a session token.
// No dependencies; binds to localhost and expects a TLS proxy (Caddy) in front.
import { createServer } from "node:http";
import { chmod, mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { accountIdFor, makeSession, newSecret, readSession, verifyIdToken } from "./google-auth.js";

const MAX_BODY = 512 * 1024;
const ID_RE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$/;
const SAVE_VERSION = 3;

/* ---------- rate limiting ---------- */
const hits = new Map();
function allow(ip, bucket, max, windowMs) {
  const key = bucket + " " + ip, now = Date.now(), e = hits.get(key);
  if (!e || now > e.resetAt) { hits.set(key, { n:1, resetAt:now + windowMs }); return true; }
  if (e.n >= max) return false;
  e.n++;
  return true;
}
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [k, e] of hits) if (now > e.resetAt) hits.delete(k);
}, 60_000);
sweeper.unref();

/* ---------- storage ---------- */
// Serialises writes per account so two devices racing on the same `rev` cannot both win.
const locks = new Map();
function withLock(id, fn) {
  const run = (locks.get(id) || Promise.resolve()).then(fn, fn);
  locks.set(id, run.catch(() => {}));
  return run;
}

/* ---------- helpers ---------- */
const ipOf = req => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?";
const bearer = req => (req.headers.authorization || "").replace(/^Bearer /i, "").trim();

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error("body too large"), { code:413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// A save must look like a game save, so the endpoint cannot be used as free blob storage.
const looksLikeSave = s => !!s && typeof s === "object" && !Array.isArray(s) && s.v === SAVE_VERSION && !!s.pet;

export function createApp({ dataDir, secret, clientId, origins = ["*"],
  signInPerHour = 20, maxAccounts = 5000, accounts = 0, fetchImpl = fetch }) {
  const fileOf = id => join(dataDir, id + ".json");
  let count = accounts;

  async function readRec(id) {
    try { return JSON.parse(await readFile(fileOf(id), "utf8")); } catch { return null; }
  }
  async function writeRec(id, rec) {
    const target = fileOf(id), tmp = target + ".tmp";
    await writeFile(tmp, JSON.stringify(rec));
    await rename(tmp, target);                 // rename is atomic, so a reader never sees a half-written file
  }

  function cors(req, res) {
    const origin = req.headers.origin;
    const allowed = origins.includes("*") ? "*" : (origins.includes(origin) ? origin : null);
    if (allowed) res.setHeader("Access-Control-Allow-Origin", allowed);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  const send = (res, code, body) => {
    res.writeHead(code, { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" });
    res.end(JSON.stringify(body));
  };

  async function jsonBody(req, res) {
    try { return JSON.parse(await readBody(req)); }
    catch (e) {
      send(res, e.code === 413 ? 413 : 400, { error:e.code === 413 ? "Dữ liệu quá lớn" : "JSON không đọc được" });
      return null;
    }
  }

  return async function handle(req, res) {
    cors(req, res);
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

    const path = new URL(req.url, "http://x").pathname.replace(/\/+$/, "") || "/";
    const ip = ipOf(req);

    if (path === "/api/health") return send(res, 200, { ok:true });

    /* Trade a Google ID token for a session token. */
    if (path === "/api/session" && req.method === "POST") {
      if (!allow(ip, "signin", signInPerHour, 3600_000)) return send(res, 429, { error:"Thử lại sau" });
      const body = await jsonBody(req, res);
      if (!body) return;

      let who;
      try { who = await verifyIdToken(body.idToken, clientId, fetchImpl); }
      catch (e) { return send(res, 401, { error:"Đăng nhập không hợp lệ: " + e.message }); }

      const id = accountIdFor(who.sub);
      let rec = await readRec(id);
      if (!rec) {
        if (count >= maxAccounts) return send(res, 503, { error:"Server đã đầy" });
        rec = { rev:0, updatedAt:Date.now(), state:null };
        await writeRec(id, rec);
        count++;
      }

      return send(res, 200, { token:makeSession(secret, id), rev:rec.rev });
    }

    if (path === "/api/save") {
      const session = readSession(secret, bearer(req));
      if (!session) return send(res, 401, { error:"Phiên đã hết hạn, đăng nhập lại" });
      if (!allow(ip, "io", 120, 60_000)) return send(res, 429, { error:"Thử lại sau" });
      const id = session.accountId;

      if (req.method === "GET") {
        const rec = await readRec(id);
        if (!rec) return send(res, 404, { error:"Chưa có save nào" });
        return send(res, 200, rec);
      }

      if (req.method === "PUT") {
        const body = await jsonBody(req, res);
        if (!body) return;
        if (!Number.isInteger(body.rev) || body.rev < 0) return send(res, 400, { error:"rev không hợp lệ" });
        if (!looksLikeSave(body.state)) return send(res, 400, { error:"Save không đúng định dạng" });

        return withLock(id, async () => {
          const rec = await readRec(id);
          if (!rec) return send(res, 404, { error:"Chưa có save nào" });
          if (rec.rev !== body.rev) return send(res, 409, rec);   // caller is stale; hand back the winner
          const next = { rev:rec.rev + 1, updatedAt:Date.now(), state:body.state };
          await writeRec(id, next);
          return send(res, 200, { rev:next.rev, updatedAt:next.updatedAt });
        });
      }

      return send(res, 405, { error:"Method không hỗ trợ" });
    }

    return send(res, 404, { error:"Không có route này" });
  };
}

/* The secret signs session tokens. Replacing the file signs everyone out. */
async function loadSecret(dataDir) {
  const path = join(dataDir, ".session-secret");
  try { return (await readFile(path, "utf8")).trim(); }
  catch { /* first run */ }
  const s = newSecret();
  await writeFile(path, s, { mode:0o600 });
  await chmod(path, 0o600);
  return s;
}

export async function start({ port, host, dataDir, clientId, origins, signInPerHour, maxAccounts, fetchImpl }) {
  await mkdir(dataDir, { recursive:true });
  const secret = await loadSecret(dataDir);
  const accounts = (await readdir(dataDir)).filter(f => f.endsWith(".json")).length;
  const handle = createApp({ dataDir, secret, clientId, origins, signInPerHour, maxAccounts, accounts, fetchImpl });
  const server = createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500, { "content-type":"application/json" });
      res.end(JSON.stringify({ error:"Lỗi server" }));
    });
  });
  await new Promise(r => server.listen(port, host, r));
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) { console.error("Thiếu GOOGLE_CLIENT_ID"); process.exit(1); }
  const port = +(process.env.PORT || 8787);
  const host = process.env.HOST || "127.0.0.1";
  const dataDir = process.env.DATA_DIR || "./data";
  const origins = (process.env.ALLOW_ORIGIN || "*").split(",").map(s => s.trim());
  await start({ port, host, dataDir, clientId, origins,
    signInPerHour:+(process.env.SIGNIN_PER_HOUR || 20), maxAccounts:+(process.env.MAX_ACCOUNTS || 5000) });
  console.log(`save-server on http://${host}:${port} · data=${dataDir} · origins=${origins.join(",")}`);
}
