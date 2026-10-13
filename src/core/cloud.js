// Cloud save: sign in with Google once per device, then push/pull the whole save blob.
// No DOM here — ui/cloudpanel.js owns the gate and the sync cadence.
import { store } from "./store.js";
import { save, catchUp } from "./state.js";
import { SAVE_VERSION } from "./rules.js";

export const CLOUD_KEY = "hanh-tinh-bo-tui.cloud";
export const API_KEY = "hanh-tinh-bo-tui.api";
export const DEFAULT_API = "https://tama-thinh.duckdns.org";
// Public by design: Google's protection is the authorised-origin list, not secrecy here.
export const CLIENT_ID = "792165330364-ostulcr3lv40kmjcb4a6j77e5gdsg1a7.apps.googleusercontent.com";

const TIMEOUT_MS = 8000;

/* ---------- device-local session ---------- */
function stored(storage) {
  try {
    const raw = storage.getItem(CLOUD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function session(storage) {
  const s = stored(storage);
  return s && typeof s.token === "string" && s.token ? s : null;
}

function setSession(storage, info) {
  try { storage.setItem(CLOUD_KEY, JSON.stringify(info)); } catch { /* private mode / quota */ }
}

export function signOut(storage) {
  try { storage.removeItem(CLOUD_KEY); } catch { /* ignore */ }
}

const LOCAL_HOST = h => h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost");

export function apiBase(storage) {
  // ?api= is a dev convenience for testing two windows at once (incognito has its own storage).
  // Gated to a locally served page, so a shared link can never point someone's save at another host.
  if (typeof location !== "undefined" && LOCAL_HOST(location.hostname)) {
    const q = new URLSearchParams(location.search).get("api");
    if (q) return q.replace(/\/+$/, "");
  }
  let override = null;
  try { override = storage.getItem(API_KEY); } catch { /* ignore */ }
  return (override || DEFAULT_API).replace(/\/+$/, "");
}

export function setApiBase(storage, url) {
  try { url ? storage.setItem(API_KEY, url) : storage.removeItem(API_KEY); } catch { /* ignore */ }
}

/* ---------- transport ---------- */
async function call(storage, path, { token, body, method } = {}) {
  const headers = {};
  if (body) headers["content-type"] = "application/json";
  if (token) headers.authorization = "Bearer " + token;
  const res = await fetch(apiBase(storage) + path, {
    method:method || (body ? "PUT" : "GET"),
    headers,
    body,
    signal:AbortSignal.timeout(TIMEOUT_MS),
  });
  let parsed = null;
  try { parsed = await res.json(); } catch { /* empty or non-JSON */ }
  return { status:res.status, ok:res.ok, body:parsed };
}

const netErr = e => (e.name === "TimeoutError" || e.name === "AbortError"
  ? "Server không trả lời" : "Không kết nối được server");

const compatible = s => !!s && s.v === SAVE_VERSION && !!s.pet;

/* Replace the running save with one from the cloud, replaying the time since that device last wrote. */
function adopt(storage, rec, info) {
  store.state = rec.state;
  const away = catchUp();                      // uses the pulled state's lastReal, so the gap is honoured
  save(storage);                               // ...then stamps lastReal to now
  setSession(storage, { ...info, rev:rec.rev, lastSync:Date.now() });
  return away;
}

/* A dead session is cleared here so the panel falls back to the signed-out state. */
function expired(storage) {
  signOut(storage);
  return { ok:false, expired:true, msg:"Phiên đã hết hạn, đăng nhập lại" };
}

/* ---------- Google redirect flow ----------
   Plain OAuth 2.0 in the top-level page: no third-party script and no iframe, because the
   Google Identity Services button draws itself in a cross-origin frame that Chrome on
   Android refuses to paint — which left the gate blank with no way in. */
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const NONCE_KEY = "hanh-tinh-bo-tui.nonce";

/* Google demands a byte-exact match against a registered URI, so normalise index.html away. */
export function redirectUri() {
  return location.origin + location.pathname.replace(/index\.html$/, "");
}

const randomNonce = () => {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, "0")).join("");
};

export function beginSignIn() {
  const nonce = randomNonce();
  // Private mode can refuse storage; the token's own signature, aud and exp still gate the server.
  try { sessionStorage.setItem(NONCE_KEY, nonce); } catch { /* ignore */ }
  const q = new URLSearchParams({
    client_id:CLIENT_ID,
    response_type:"id_token",
    scope:"openid",
    redirect_uri:redirectUri(),
    nonce,
    prompt:"select_account",
  });
  location.assign(AUTH_URL + "?" + q);
}

const claimsOf = token => {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); }
  catch { return {}; }
};

/* Reads what Google put in the fragment on the way back. The nonce only proves this is the
   sign-in *this tab* asked for; the token itself is verified on the server, never here. */
export function takeRedirectToken() {
  const hash = typeof location === "undefined" ? "" : location.hash.slice(1);
  if (!hash || !/(^|&)(id_token|error)=/.test(hash)) return null;
  const q = new URLSearchParams(hash);
  // Scrub it either way: an id token left in the address bar gets shared by accident.
  history.replaceState(null, "", location.pathname + location.search);

  if (q.get("error")) return { error:q.get("error") === "access_denied" ? "Bạn đã huỷ đăng nhập." : "Google từ chối đăng nhập." };
  const token = q.get("id_token");
  if (!token) return null;

  let want = null;
  try { want = sessionStorage.getItem(NONCE_KEY); sessionStorage.removeItem(NONCE_KEY); } catch { /* ignore */ }
  if (!want || claimsOf(token).nonce !== want) return { error:"Lần đăng nhập này không khớp, thử lại." };
  return { token };
}

/* ---------- sign in ---------- */
export async function signIn(storage, idToken) {
  let r;
  try { r = await call(storage, "/api/session", { method:"POST", body:JSON.stringify({ idToken }) }); }
  catch (e) { return { ok:false, msg:netErr(e) }; }

  if (r.status === 429) return { ok:false, msg:"Đăng nhập quá nhiều lần, thử lại sau" };
  if (r.status === 401) return { ok:false, msg:r.body?.error || "Đăng nhập không hợp lệ" };
  if (!r.ok || !r.body?.token) return { ok:false, msg:r.body?.error || "Không đăng nhập được" };

  setSession(storage, { token:r.body.token, rev:r.body.rev, lastSync:0 });
  return { ok:true, rev:r.body.rev };
}

/* ---------- sync ---------- */
export async function pull(storage) {
  const info = session(storage);
  if (!info) return { ok:false, msg:"Chưa đăng nhập" };
  let r;
  try { r = await call(storage, "/api/save", { token:info.token }); }
  catch (e) { return { ok:false, msg:netErr(e) }; }
  if (r.status === 401) return expired(storage);
  if (r.status === 404) return { ok:false, msg:"Trên mây chưa có save nào" };
  if (!r.ok) return { ok:false, msg:r.body?.error || "Tải về thất bại" };
  if (!r.body.state) return { ok:false, msg:"Trên mây chưa có save nào" };
  if (!compatible(r.body.state)) return { ok:false, msg:"Save trên mây thuộc phiên bản khác" };
  if (r.body.rev === info.rev && store.state) return { ok:true, already:true, rev:info.rev };
  const away = adopt(storage, r.body, info);
  return { ok:true, away, rev:r.body.rev };
}

export async function push(storage) {
  const info = session(storage);
  if (!info) return { ok:false, msg:"Chưa đăng nhập" };
  if (!store.state) return { ok:false, msg:"Chưa có save để đẩy" };
  save(storage);                               // stamp lastReal first, so the other device replays the right gap
  let r;
  try { r = await call(storage, "/api/save", { token:info.token, body:JSON.stringify({ rev:info.rev, state:store.state }) }); }
  catch (e) { return { ok:false, msg:netErr(e) }; }
  if (r.status === 401) return expired(storage);
  if (r.status === 409) return { ok:false, conflict:true, remote:r.body, msg:"Máy khác đã đẩy bản mới hơn" };
  if (!r.ok) return { ok:false, msg:r.body?.error || "Đẩy lên thất bại" };
  setSession(storage, { ...info, rev:r.body.rev, lastSync:Date.now() });
  return { ok:true, rev:r.body.rev };
}

/* After a 409 one side has to win: keep this device's save, or take the cloud one. */
export async function resolveConflict(storage, choice, remote) {
  const info = session(storage);
  if (!info) return { ok:false, msg:"Chưa đăng nhập" };
  if (choice === "cloud") {
    if (!compatible(remote?.state)) return { ok:false, msg:"Save trên mây thuộc phiên bản khác" };
    const away = adopt(storage, remote, info);
    return { ok:true, took:"cloud", away };
  }
  setSession(storage, { ...info, rev:remote.rev });   // adopt the cloud's rev, then overwrite its contents
  const r = await push(storage);
  return r.ok ? { ...r, took:"local" } : r;
}
