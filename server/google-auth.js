// Verifying Google ID tokens and minting our own session tokens. No dependencies:
// node:crypto can import Google's JWKs directly and check an RS256 signature.
import { createHmac, createPublicKey, createVerify, randomBytes, timingSafeEqual, createHash } from "node:crypto";

const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const JWKS_TTL = 3600_000;
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const SKEW_MS = 60_000;
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SESSION_DAYS = 90;

let cache = { keys:null, at:0 };

async function keys(fetchImpl = fetch) {
  if (cache.keys && Date.now() - cache.at < JWKS_TTL) return cache.keys;
  const res = await fetchImpl(JWKS_URL, { signal:AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("không lấy được khoá công khai của Google");
  const body = await res.json();
  if (!Array.isArray(body.keys)) throw new Error("JWKS sai định dạng");
  cache = { keys:body.keys, at:Date.now() };
  return cache.keys;
}

const b64urlJson = s => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

/* Google's `sub` is an opaque stable user id. Fold it into the same 16-char shape the
   save files already use, so storage and validation stay unchanged. */
export function accountIdFor(sub) {
  const h = createHash("sha256").update("gid:" + sub).digest();
  let out = "";
  for (let i = 0; i < 16; i++) out += ALPHABET[h[i] % 32];
  return out;
}

export async function verifyIdToken(token, clientId, fetchImpl = fetch) {
  if (typeof token !== "string") throw new Error("thiếu token");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("token không đúng dạng JWT");
  const [rawHeader, rawPayload, rawSig] = parts;

  let header, payload;
  try { header = b64urlJson(rawHeader); payload = b64urlJson(rawPayload); }
  catch { throw new Error("không đọc được token"); }

  // Pin the algorithm: accepting whatever the token claims is how "alg: none" bypasses happen.
  if (header.alg !== "RS256") throw new Error("thuật toán không được chấp nhận");
  if (!header.kid) throw new Error("token thiếu kid");

  const jwk = (await keys(fetchImpl)).find(k => k.kid === header.kid);
  if (!jwk) throw new Error("không tìm thấy khoá khớp kid");

  const ok = createVerify("RSA-SHA256")
    .update(rawHeader + "." + rawPayload)
    .verify(createPublicKey({ key:jwk, format:"jwk" }), rawSig, "base64url");
  if (!ok) throw new Error("chữ ký không hợp lệ");

  if (!ISSUERS.includes(payload.iss)) throw new Error("issuer không phải Google");
  if (payload.aud !== clientId) throw new Error("token phát cho ứng dụng khác");
  const now = Date.now();
  if (!payload.exp || payload.exp * 1000 + SKEW_MS < now) throw new Error("token đã hết hạn");
  if (payload.iat && payload.iat * 1000 - SKEW_MS > now) throw new Error("token từ tương lai");
  if (!payload.sub) throw new Error("token thiếu sub");

  return { sub:payload.sub, email:payload.email || null };
}

/* ---------- our own session tokens ---------- */
// Signed rather than stored: a restart must not sign everyone out, and there is no
// session table to keep. Rotating the secret file revokes every session at once.
export function newSecret() { return randomBytes(32).toString("hex"); }

const sign = (secret, body) => createHmac("sha256", secret).update(body).digest("base64url");

export function makeSession(secret, accountId, days = SESSION_DAYS) {
  const body = Buffer.from(accountId + "." + (Date.now() + days * 86400_000)).toString("base64url");
  return body + "." + sign(secret, body);
}

export function readSession(secret, token) {
  if (typeof token !== "string") return null;
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  const body = token.slice(0, i), sig = token.slice(i + 1);
  const want = Buffer.from(sign(secret, body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const [accountId, expiry] = Buffer.from(body, "base64url").toString("utf8").split(".");
  if (!/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$/.test(accountId || "")) return null;
  if (!(+expiry > Date.now())) return null;
  return { accountId, expiry:+expiry };
}
