// Boot: restore the save, wire controls, run the frame loop (game time = real time × speed).
import { store } from "./core/store.js";
import { onEvent } from "./core/bus.js";
import { load, save, clearSave, catchUp } from "./core/state.js";
import { simMinute } from "./core/sim.js";
import { initCanvas } from "./render/canvas.js";
import { ui } from "./ui/state.js";
import { ALL_FIELDS } from "./data/fields.js";
import { handleEvent, finishAnim, summariseAbsence, toast } from "./ui/feedback.js";
import { tickGame } from "./ui/runner.js";
import { runPendingEvents } from "./ui/menus.js";
import { renderScreen } from "./ui/screen.js";
import { bindControls, startNew } from "./ui/input.js";
import { initSheet, renderBars, closeSheet } from "./ui/sheet.js";
import { initCloud } from "./ui/cloudpanel.js";

const $ = id => document.getElementById(id);
const SAVE_EVERY_MS = 3000, MAX_TICKS_PER_FRAME = 400;

initCanvas($("cv"));
onEvent(handleEvent);

// The field tints the whole app now that there is no plastic shell to colour.
function setField(f) { $("app").dataset.field = f; }

function syncControls() {
  const s = store.state;
  document.querySelectorAll("#speedSeg button").forEach(b => b.setAttribute("aria-pressed", String(!!s && +b.dataset.s === s.speed)));
  $("pauseBtn").textContent = s && s.paused ? "Chạy tiếp" : "Tạm dừng";
  $("soundBtn").textContent = "Âm thanh: " + (!s || s.sound ? "bật" : "tắt");
  if (s) setField(s.pet.field);
  const live = !!s && ui.mode !== "start";
  document.querySelectorAll("#zoomTabs button").forEach(b => {
    b.setAttribute("aria-pressed", String(live && +b.dataset.z === ui.zoom));
    b.disabled = !live || ui.mode === "game";
  });
  document.querySelectorAll("#zoomList li").forEach(li => li.classList.toggle("on", live && +li.dataset.z === ui.zoom));
}

/* ---------- side panel ---------- */
document.querySelectorAll("#speedSeg button").forEach(b => b.addEventListener("click", () => { if (store.state) { store.state.speed = +b.dataset.s; save(localStorage); } }));
$("pauseBtn").addEventListener("click", () => { if (store.state) { store.state.paused = !store.state.paused; save(localStorage); } });
$("soundBtn").addEventListener("click", () => { if (store.state) { store.state.sound = !store.state.sound; save(localStorage); } });
let resetArmedAt = 0;
$("resetBtn").addEventListener("click", () => {
  if (Date.now() - resetArmedAt > 3000) {
    resetArmedAt = Date.now();
    $("resetBtn").textContent = "Bấm lần nữa để xoá hết";
    setTimeout(() => { $("resetBtn").textContent = "Chơi lại từ đầu"; }, 3000);
    return;
  }
  clearSave(localStorage);
  $("resetBtn").textContent = "Chơi lại từ đầu";
  toStart();
});

const hooks = {
  onNewGame:() => { save(localStorage); toast("Egg Bang! Hành tinh mới ra đời…", 3000); },
  onFieldPreview:setField,
  onStart:startNew,
};
bindControls(hooks);
initSheet(hooks);

/* ---------- loop ---------- */
let lastT = performance.now(), acc = 0, lastSave = 0;
function frame(t) {
  const dt = Math.min(t - lastT, 1000);
  lastT = t;
  const s = store.state;
  if (s && ui.mode !== "start") {
    if (!s.paused) {
      acc += dt * s.speed;
      for (let n = 0; acc >= 60000 && n < MAX_TICKS_PER_FRAME; n++) { acc -= 60000; simMinute(); }
    }
    if (ui.mode === "anim" && t - ui.anim.t0 >= ui.anim.dur) finishAnim();
    if (ui.mode === "game") tickGame(t);
    runPendingEvents();
    if (t - lastSave > SAVE_EVERY_MS) { lastSave = t; save(localStorage); }
  }
  renderScreen(t);
  syncControls();
  renderBars();
  requestAnimationFrame(frame);
}

document.addEventListener("visibilitychange", () => { if (document.hidden) save(localStorage); });
addEventListener("pagehide", () => save(localStorage));

function toStart() {
  closeSheet();
  Object.assign(ui, { mode:"start", startSel:0, game:null, anim:null, walkers:null });
  setField(ALL_FIELDS[0]);
}

if (load(localStorage)) { ui.mode = "main"; summariseAbsence(catchUp()); }
else toStart();

initCloud({
  onAdopted:away => {
    closeSheet();
    Object.assign(ui, { mode:"main", game:null, anim:null, walkers:null });
    setField(store.state.pet.field);
    summariseAbsence(away);
  },
  onSignedIn:toStart,
  onSignedOut:() => { clearSave(localStorage); toStart(); },
});

requestAnimationFrame(t => { lastT = t; frame(t); });
