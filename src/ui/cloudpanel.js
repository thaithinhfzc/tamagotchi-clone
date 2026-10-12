// Playing one pet on several devices. Syncing is automatic and silent.
// The player gets a code to carry to the other device; nothing else is their business.
// When two devices diverge, the one played most recently wins — asking would mean
// explaining revisions, and no game asks that.
import { store } from "../core/store.js";
import * as C from "../core/cloud.js";
import { toast } from "./feedback.js";

const $ = id => document.getElementById(id);
const PUSH_EVERY_MS = 60_000;

const groups = id => id.replace(/(.{4})(?=.)/g, "$1 ");
const ago = ms => {
  const m = Math.floor((Date.now() - ms) / 60000);
  return m < 1 ? "vừa xong" : m < 60 ? m + " phút trước" : Math.floor(m / 60) + " giờ trước";
};
const petName = s => s?.pet?.name || "bé";
const playedAt = s => s?.lastReal || 0;

let lastPushed = null;    // serialised save as last accepted by the server
let lastError = null;
let busy = false;

export function initCloud({ onAdopted }) {
  const els = {
    status:$("cloudStatus"), code:$("cloudCode"), out:$("cloudCodeOut"),
    neu:$("cloudNew"), copy:$("cloudCopy"), link:$("cloudLink"),
  };

  function render() {
    const info = C.cloudInfo(localStorage);
    els.neu.hidden = !!info;
    els.out.hidden = !info;
    els.copy.hidden = !info;
    for (const b of [els.link, els.neu]) b.disabled = busy;

    if (info) els.out.textContent = groups(info.id);
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

  els.neu.addEventListener("click", () => run(async () => {
    const r = await C.linkNew(localStorage);
    if (!r.ok) { lastError = r.msg; return toast(r.msg, 3200); }
    lastError = null;
    lastPushed = null;
    const p = await C.push(localStorage);
    if (p.ok) synced(); else lastError = p.msg;
    toast("Dán mã này vào máy khác là chơi tiếp đúng bé này", 4200);
  }));

  els.link.addEventListener("click", () => run(async () => {
    const r = await C.linkExisting(localStorage, els.code.value);
    if (!r.ok) return toast(r.msg, 3200);
    els.code.value = "";
    lastError = null;
    if (r.empty) { lastPushed = null; return toast("Xong. Bé ở máy này sẽ được lưu lên mây", 3600); }
    adopted(r);
    toast("Đã đưa " + petName(store.state) + " về máy này", 3000);
  }));

  els.copy.addEventListener("click", async () => {
    const info = C.cloudInfo(localStorage);
    if (!info) return;
    try { await navigator.clipboard.writeText(info.id); toast("Đã copy mã", 2000); }
    catch { toast("Không copy được, bấm vào mã rồi Cmd+C", 3000); }
  });

  els.code.addEventListener("keydown", e => { if (e.key === "Enter") els.link.click(); });

  /* ---------- automatic sync ---------- */
  async function autoPush() {
    if (busy || !store.state || !C.cloudInfo(localStorage)) return;
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
    if (busy || !C.cloudInfo(localStorage)) return;
    await run(async () => {
      const r = await C.pull(localStorage);
      if (r.ok && !r.already) { adopted(r); toast("Đã lấy " + petName(store.state) + " mới nhất từ mây", 3000); }
      else if (r.ok) synced();
      else lastError = r.msg;
    });
  }

  /* Leaving pushes, coming back pulls — without the pull, a device left open but idle would
     never learn another one had played, then overwrite it the moment play resumed here. */
  async function onReturn() {
    if (busy || !store.state || !C.cloudInfo(localStorage)) return;
    if (JSON.stringify(store.state) !== lastPushed) return autoPush();   // unsent progress here wins the tie
    await autoPull();
  }

  setInterval(autoPush, PUSH_EVERY_MS);
  document.addEventListener("visibilitychange", () => { if (document.hidden) autoPush(); else onReturn(); });
  setInterval(render, 30_000);   // keeps the "x phút trước" line honest
  render();

  if (C.cloudInfo(localStorage)) autoPull();
}
