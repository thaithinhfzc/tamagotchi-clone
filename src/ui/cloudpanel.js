// Playing one pet on several devices: sign in with Google, then syncing is automatic and silent.
// When two devices diverge, the one played most recently wins — asking would mean explaining
// revisions, and no game asks that.
import { store } from "../core/store.js";
import * as C from "../core/cloud.js";
import { toast } from "./feedback.js";

const $ = id => document.getElementById(id);
const PUSH_EVERY_MS = 60_000;
const GIS_SRC = "https://accounts.google.com/gsi/client";

const ago = ms => {
  const m = Math.floor((Date.now() - ms) / 60000);
  return m < 1 ? "vừa xong" : m < 60 ? m + " phút trước" : Math.floor(m / 60) + " giờ trước";
};
const petName = s => s?.pet?.name || "bé";
const playedAt = s => s?.lastReal || 0;

let lastPushed = null;    // serialised save as last accepted by the server
let lastError = null;
let busy = false;
let gis = null;           // promise for the Google script, started on first need

/* Loaded on demand rather than at boot: a player who never opens the panel never
   fetches anything from Google, and a signed-in device does not need it at all. */
function loadGis() {
  if (gis) return gis;
  gis = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve(window.google?.accounts?.id || null);
    s.onerror = () => reject(new Error("không tải được Google Sign-In"));
    document.head.appendChild(s);
  });
  return gis;
}

export function initCloud({ onAdopted }) {
  const els = { fold:$("cloudFold"), status:$("cloudStatus"), btn:$("cloudBtn"), out:$("cloudOut") };
  const summary = els.fold.querySelector("summary");
  let buttonShown = false;

  function render() {
    const info = C.session(localStorage);
    els.out.hidden = !info;
    els.btn.hidden = !!info;
    els.out.disabled = busy;
    summary.textContent = !info && !store.state
      ? "Đã có bé ở máy khác? Đăng nhập để mang sang"
      : "Chơi bé này trên máy khác";

    if (!C.CLIENT_ID) {
      els.status.textContent = "Chưa cấu hình Google Sign-In, bé chỉ được lưu trên máy này.";
      return;
    }
    els.status.textContent = !info
      ? "Bé đang chỉ được lưu trên máy này."
      : lastError ? "Chưa lưu lên mây được, sẽ tự thử lại."
      : info.lastSync ? "Đã lưu lên mây · " + ago(info.lastSync)
      : "Đang lưu lên mây…";
  }

  async function run(fn) {
    if (busy) return null;
    busy = true;
    render();
    try { return await fn(); }
    finally { busy = false; render(); }
  }

  const synced = () => { lastError = null; lastPushed = JSON.stringify(store.state); };

  function adopted(r) {
    synced();
    if (onAdopted) onAdopted(r.away);
  }

  /* The newest play wins. Returns true when this device took the cloud's pet. */
  async function autoResolve(remote) {
    const choice = playedAt(remote?.state) > playedAt(store.state) ? "cloud" : "local";
    const r = await C.resolveConflict(localStorage, choice, remote);
    if (!r.ok) { lastError = r.msg; return false; }
    if (choice === "local") { synced(); return false; }
    adopted(r);
    return true;
  }

  /* ---------- sign in ---------- */
  async function onCredential(response) {
    await run(async () => {
      const r = await C.signIn(localStorage, response.credential);
      if (!r.ok) { lastError = r.msg; return toast(r.msg, 4000); }
      lastError = null;
      lastPushed = null;
      buttonShown = false;
      if (r.claimed) toast("Đã gắn " + petName(store.state) + " vào tài khoản Google của bạn", 4200);
      else if (r.rev > 0) await autoPull();
      else { const p = await C.push(localStorage); if (p.ok) synced(); else lastError = p.msg; }
      if (!r.claimed && r.rev === 0) toast("Đăng nhập cùng Google này ở máy khác là chơi tiếp bé này", 4200);
    });
  }

  async function showButton() {
    if (buttonShown || C.session(localStorage) || !C.CLIENT_ID) return;
    let api;
    try { api = await loadGis(); }
    catch (e) { lastError = e.message; return render(); }
    if (!api) { lastError = "không tải được Google Sign-In"; return render(); }
    api.initialize({ client_id:C.CLIENT_ID, callback:onCredential, auto_select:false });
    api.renderButton(els.btn, { type:"standard", theme:"outline", size:"medium", text:"signin_with", shape:"pill" });
    buttonShown = true;
  }

  els.fold.addEventListener("toggle", () => { if (els.fold.open) showButton(); });

  els.out.addEventListener("click", () => {
    C.signOut(localStorage);
    lastPushed = null;
    lastError = null;
    buttonShown = false;
    try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* script not loaded */ }
    render();
    if (els.fold.open) showButton();
    toast("Đã đăng xuất. Bé vẫn còn trên máy này và trên mây", 3600);
  });

  /* ---------- automatic sync ---------- */
  async function autoPush() {
    if (busy || !store.state || !C.session(localStorage)) return;
    const json = JSON.stringify(store.state);
    if (json === lastPushed) return;
    await run(async () => {
      const r = await C.push(localStorage);
      if (r.conflict) {
        if (await autoResolve(r.remote)) toast("Đã dùng bản chơi gần nhất từ máy khác", 3600);
        return;
      }
      if (r.ok) synced(); else lastError = r.msg;   // a blip stays quiet; the next tick retries
    });
  }

  async function autoPull() {
    if (!C.session(localStorage)) return;
    const r = await C.pull(localStorage);
    if (r.ok && !r.already) { adopted(r); toast("Đã lấy " + petName(store.state) + " mới nhất từ mây", 3000); }
    else if (r.ok) synced();
    else lastError = r.msg;
  }

  /* Leaving pushes, coming back pulls — without the pull, a device left open but idle would
     never learn another one had played, then overwrite it the moment play resumed here. */
  async function onReturn() {
    if (busy || !store.state || !C.session(localStorage)) return;
    if (JSON.stringify(store.state) !== lastPushed) return autoPush();   // unsent progress here wins the tie
    await run(autoPull);
  }

  setInterval(autoPush, PUSH_EVERY_MS);
  document.addEventListener("visibilitychange", () => { if (document.hidden) autoPush(); else onReturn(); });
  setInterval(render, 30_000);   // keeps the "x phút trước" line honest
  render();

  if (C.session(localStorage)) run(autoPull);
  // A fresh device has no pet and no session: the offer has to be visible, or the player
  // starts a second pet without ever learning the first one could come across.
  else if (!store.state) { els.fold.open = true; showButton(); }
}
