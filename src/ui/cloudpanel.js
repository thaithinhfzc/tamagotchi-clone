// Side-panel controls for cloud save, plus the auto-sync cadence.
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

let conflict = null;      // the cloud record a push lost to, awaiting the user's choice
let lastPushed = null;    // serialised save as last accepted by the server
let busy = false;

export function initCloud({ onAdopted }) {
  const els = {
    status:$("cloudStatus"), code:$("cloudCode"), conflict:$("cloudConflict"),
    neu:$("cloudNew"), copy:$("cloudCopy"), push:$("cloudPush"), pull:$("cloudPull"),
    link:$("cloudLink"), unlink:$("cloudUnlink"),
    keepLocal:$("cloudKeepLocal"), takeCloud:$("cloudTakeCloud"),
  };

  function render() {
    const info = C.cloudInfo(localStorage);
    els.conflict.hidden = !conflict;
    els.copy.hidden = !info;
    els.unlink.hidden = !info;
    els.neu.hidden = !!info;
    for (const b of [els.push, els.pull]) b.disabled = !info || busy;
    els.link.disabled = busy;
    els.neu.disabled = busy;

    if (conflict) {
      els.status.innerHTML = "Máy khác đã đẩy bản mới hơn (bản " + conflict.rev
        + ", " + ago(conflict.updatedAt) + "). Chọn bản nào thắng:";
      return;
    }
    if (!info) { els.status.textContent = "Chưa liên kết máy nào."; return; }
    els.status.innerHTML = 'Mã: <span class="code">' + groups(info.id) + "</span><br>Bản " + info.rev
      + (info.lastSync ? " · đồng bộ " + ago(info.lastSync) : " · chưa đồng bộ lần nào");
  }

  /* Every call goes through here so the buttons cannot be double-fired and errors always surface. */
  async function run(fn) {
    if (busy) return null;
    busy = true;
    render();
    try { return await fn(); }
    finally { busy = false; render(); }
  }

  const announce = r => { if (r && r.msg) toast(r.msg, 3200); };

  function adopted(r) {
    lastPushed = JSON.stringify(store.state);
    if (onAdopted) onAdopted(r.away);
  }

  els.neu.addEventListener("click", () => run(async () => {
    const r = await C.linkNew(localStorage);
    if (!r.ok) return announce(r);
    lastPushed = null;
    toast("Đã tạo mã. Copy sang máy khác để dùng chung save", 4000);
    const p = await C.push(localStorage);
    if (p.ok) lastPushed = JSON.stringify(store.state);
  }));

  els.link.addEventListener("click", () => run(async () => {
    const r = await C.linkExisting(localStorage, els.code.value);
    if (!r.ok) return announce(r);
    els.code.value = "";
    if (r.empty) { lastPushed = null; toast("Đã liên kết. Mã này chưa có save, bấm Đẩy lên", 3600); return; }
    adopted(r);
    toast("Đã lấy save từ mã này", 3000);
  }));

  els.push.addEventListener("click", () => run(async () => {
    const r = await C.push(localStorage);
    if (r.conflict) { conflict = r.remote; return announce(r); }
    if (!r.ok) return announce(r);
    lastPushed = JSON.stringify(store.state);
    toast("Đã đẩy lên (bản " + r.rev + ")", 2600);
  }));

  els.pull.addEventListener("click", () => run(async () => {
    const r = await C.pull(localStorage);
    if (!r.ok) return announce(r);
    if (r.already) return toast("Đã là bản mới nhất", 2400);
    adopted(r);
    toast("Đã tải save từ cloud", 2600);
  }));

  els.keepLocal.addEventListener("click", () => run(async () => {
    const r = await C.resolveConflict(localStorage, "local", conflict);
    if (!r.ok) return announce(r);
    conflict = null;
    lastPushed = JSON.stringify(store.state);
    toast("Đã ghi đè cloud bằng bản máy này", 3000);
  }));

  els.takeCloud.addEventListener("click", () => run(async () => {
    const r = await C.resolveConflict(localStorage, "cloud", conflict);
    if (!r.ok) return announce(r);
    conflict = null;
    adopted(r);
    toast("Đã lấy bản trên cloud", 3000);
  }));

  els.copy.addEventListener("click", async () => {
    const info = C.cloudInfo(localStorage);
    if (!info) return;
    try { await navigator.clipboard.writeText(info.id); toast("Đã copy mã", 2000); }
    catch { toast("Không copy được, bấm vào mã rồi Cmd+C", 3000); }
  });

  let unlinkArmedAt = 0;
  els.unlink.addEventListener("click", () => {
    if (Date.now() - unlinkArmedAt > 3000) {
      unlinkArmedAt = Date.now();
      els.unlink.textContent = "Bấm lần nữa để bỏ liên kết";
      setTimeout(() => { els.unlink.textContent = "Bỏ liên kết máy này"; }, 3000);
      return;
    }
    C.unlink(localStorage);
    conflict = null;
    lastPushed = null;
    els.unlink.textContent = "Bỏ liên kết máy này";
    render();
    toast("Đã bỏ liên kết. Save trên server vẫn còn", 3000);
  });

  els.code.addEventListener("keydown", e => { if (e.key === "Enter") els.link.click(); });

  /* ---------- automatic sync ---------- */
  async function autoPush() {
    if (conflict || busy || !store.state || !C.cloudInfo(localStorage)) return;
    const json = JSON.stringify(store.state);
    if (json === lastPushed) return;
    await run(async () => {
      const r = await C.push(localStorage);
      if (r.conflict) { conflict = r.remote; toast("Máy khác đã đẩy bản mới hơn — chọn bản nào thắng ở khung bên", 4200); return; }
      if (r.ok) lastPushed = JSON.stringify(store.state);
      // a network blip stays silent: the next tick retries
    });
  }

  setInterval(autoPush, PUSH_EVERY_MS);
  document.addEventListener("visibilitychange", () => { if (document.hidden) autoPush(); });
  setInterval(render, 30_000);   // keeps the "x phút trước" line honest
  render();

  if (C.cloudInfo(localStorage)) {
    run(async () => {
      const r = await C.pull(localStorage);
      if (r.ok && !r.already) { adopted(r); toast("Đã tải save mới từ cloud", 3000); }
      else if (r.ok) lastPushed = JSON.stringify(store.state);
    });
  }
}
