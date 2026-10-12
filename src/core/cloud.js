// Cloud save: link a device to an account code, then push/pull the whole save blob.
// Kept DOM-free — the panel in ui/cloudpanel.js owns the buttons and the sync cadence.
import { store } from "./store.js";
import { save, catchUp } from "./state.js";
import { SAVE_VERSION } from "./rules.js";

export const CLOUD_KEY = "hanh-tinh-bo-tui.cloud";
export const API_KEY = "hanh-tinh-bo-tui.api";
export const DEFAULT_API = "https://tama-thinh.duckdns.org";

const TIMEOUT_MS = 8000;
const ID_RE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$/;

/* ---------- device-local account link ---------- */
export function cloudInfo(storage) {
  try {
    const raw = storage.getItem(CLOUD_KEY);
    const info = raw ? JSON.parse(raw) : null;
    return info && ID_RE.test(info.id || "") ? info : null;
  } catch { return null; }
}

function setInfo(storage, info) {
  try { storage.setItem(CLOUD_KEY, JSON.stringify(info)); } catch { /* private mode / quota */ }
}

export function unlink(storage) {
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

/* Typed codes get the Crockford treatment: the alphabet has no I/L/O/U, so those are always typos. */
export function normaliseCode(input) {
  return String(input || "").toUpperCase().replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0").replace(/[IL]/g, "1").replace(/U/g, "V");
}

export const validCode = code => ID_RE.test(code);

/* ---------- transport ---------- */
async function call(storage, path, options = {}) {
  const res = await fetch(apiBase(storage) + path, {
    ...options,
    headers:options.body ? { "content-type":"application/json" } : undefined,
    signal:AbortSignal.timeout(TIMEOUT_MS),
  });
  let body = null;
  try { body = await res.json(); } catch { /* empty or non-JSON */ }
  return { status:res.status, ok:res.ok, body };
}

const netErr = e => (e.name === "TimeoutError" || e.name === "AbortError"
  ? "Server không trả lời" : "Không kết nối được server");

const compatible = s => !!s && s.v === SAVE_VERSION && !!s.pet;

/* Replace the running save with one from the cloud, replaying the time since that device last wrote. */
function adopt(storage, rec, info) {
  store.state = rec.state;
  const away = catchUp();                      // uses the pulled state's lastReal, so the gap is honoured
  save(storage);                               // ...then stamps lastReal to now
  setInfo(storage, { ...info, id:info.id, rev:rec.rev, lastSync:Date.now() });
  return away;
}

/* ---------- account ---------- */
export async function linkNew(storage) {
  let r;
  try { r = await call(storage, "/api/account", { method:"POST" }); }
  catch (e) { return { ok:false, msg:netErr(e) }; }
  if (r.status === 429) return { ok:false, msg:"Tạo mã quá nhiều lần, thử lại sau" };
  if (!r.ok || !validCode(r.body?.id || "")) return { ok:false, msg:r.body?.error || "Không tạo được mã" };
  setInfo(storage, { id:r.body.id, rev:0, lastSync:0 });
  return { ok:true, id:r.body.id };
}

export async function linkExisting(storage, input) {
  const id = normaliseCode(input);
  if (!validCode(id)) return { ok:false, msg:"Mã phải đủ 16 ký tự" };
  let r;
  try { r = await call(storage, "/api/save/" + id); }
  catch (e) { return { ok:false, msg:netErr(e) }; }
  if (r.status === 404) return { ok:false, msg:"Không tìm thấy mã này" };
  if (!r.ok) return { ok:false, msg:r.body?.error || "Lỗi khi kiểm tra mã" };

  const info = { id, rev:r.body.rev, lastSync:0 };
  if (!r.body.state) { setInfo(storage, info); return { ok:true, id, empty:true }; }
  if (!compatible(r.body.state)) return { ok:false, msg:"Save trên cloud thuộc phiên bản khác" };
  const away = adopt(storage, r.body, info);
  return { ok:true, id, away };
}

/* ---------- sync ---------- */
export async function pull(storage) {
  const info = cloudInfo(storage);
  if (!info) return { ok:false, msg:"Chưa liên kết mã nào" };
  let r;
  try { r = await call(storage, "/api/save/" + info.id); }
  catch (e) { return { ok:false, msg:netErr(e) }; }
  if (r.status === 404) return { ok:false, msg:"Mã này không còn trên server" };
  if (!r.ok) return { ok:false, msg:r.body?.error || "Tải về thất bại" };
  if (!r.body.state) return { ok:false, msg:"Trên cloud chưa có save nào" };
  if (!compatible(r.body.state)) return { ok:false, msg:"Save trên cloud thuộc phiên bản khác" };
  if (r.body.rev === info.rev && store.state) return { ok:true, already:true, rev:info.rev };
  const away = adopt(storage, r.body, info);
  return { ok:true, away, rev:r.body.rev };
}

export async function push(storage) {
  const info = cloudInfo(storage);
  if (!info) return { ok:false, msg:"Chưa liên kết mã nào" };
  if (!store.state) return { ok:false, msg:"Chưa có save để đẩy" };
  save(storage);                               // stamp lastReal first, so the other device replays the right gap
  let r;
  try { r = await call(storage, "/api/save/" + info.id, { method:"PUT", body:JSON.stringify({ rev:info.rev, state:store.state }) }); }
  catch (e) { return { ok:false, msg:netErr(e) }; }
  if (r.status === 409) return { ok:false, conflict:true, remote:r.body, msg:"Máy khác đã đẩy bản mới hơn" };
  if (r.status === 404) return { ok:false, msg:"Mã này không còn trên server" };
  if (!r.ok) return { ok:false, msg:r.body?.error || "Đẩy lên thất bại" };
  setInfo(storage, { ...info, rev:r.body.rev, lastSync:Date.now() });
  return { ok:true, rev:r.body.rev };
}

/* After a 409 the user picks a winner: keep this device's save, or take the cloud one. */
export async function resolveConflict(storage, choice, remote) {
  const info = cloudInfo(storage);
  if (!info) return { ok:false, msg:"Chưa liên kết mã nào" };
  if (choice === "cloud") {
    if (!compatible(remote?.state)) return { ok:false, msg:"Save trên cloud thuộc phiên bản khác" };
    const away = adopt(storage, remote, info);
    return { ok:true, took:"cloud", away };
  }
  setInfo(storage, { ...info, rev:remote.rev });   // adopt the cloud's rev, then overwrite its contents
  const r = await push(storage);
  return r.ok ? { ...r, took:"local" } : r;
}
