// Boot: restore the save, wire controls, run the frame loop (game time = real time × speed).
import { store } from "./core/store.js";
import { onEvent } from "./core/bus.js";
import { load, save, clearSave, catchUp } from "./core/state.js";
import { simMinute } from "./core/sim.js";
import { initCanvas } from "./render/canvas.js";
import { ui } from "./ui/state.js";
import { handleEvent, finishAnim, summariseAbsence, toast } from "./ui/feedback.js";
import { tickGame } from "./ui/runner.js";
import { runPendingEvents } from "./ui/menus.js";
import { renderScreen } from "./ui/screen.js";
import { bindControls } from "./ui/input.js";
import { initCloud } from "./ui/cloudpanel.js";

const $ = id => document.getElementById(id);
const SAVE_EVERY_MS = 3000, MAX_TICKS_PER_FRAME = 400;

initCanvas($("cv"));
onEvent(handleEvent);

function setShell(shell) { $("device").dataset.shell = shell; }

function syncControls() {
  const s = store.state;
  document.querySelectorAll("#speedSeg button").forEach(b => b.setAttribute("aria-pressed", String(!!s && +b.dataset.s === s.speed)));
  $("pauseBtn").textContent = s && s.paused ? "Chạy tiếp" : "Tạm dừng";
  $("soundBtn").textContent = "Âm thanh: " + (!s || s.sound ? "bật" : "tắt");
  if (s) setShell(s.shell);
  document.querySelectorAll("#zoomList li").forEach(li => li.classList.toggle("on", !!s && ui.mode !== "start" && +li.dataset.z === ui.zoom));
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
  Object.assign(ui, { mode:"start", startSel:0, menuStack:[], game:null, anim:null, walkers:null, list:null });
  $("resetBtn").textContent = "Chơi lại từ đầu";
  setShell("land");
});

bindControls({
  onNewGame:() => { save(localStorage); toast("Egg Bang! Hành tinh mới ra đời…", 3000); },
  onShellPreview:setShell,
});

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
  requestAnimationFrame(frame);
}

document.addEventListener("visibilitychange", () => { if (document.hidden) save(localStorage); });
addEventListener("pagehide", () => save(localStorage));

if (load(localStorage)) { ui.mode = "main"; summariseAbsence(catchUp()); }
else setShell("land");

function toStart() {
  Object.assign(ui, { mode:"start", startSel:0, menuStack:[], game:null, anim:null, walkers:null, list:null });
  setShell("land");
}

initCloud({
  onAdopted:away => {
    Object.assign(ui, { mode:"main", menuStack:[], game:null, anim:null, walkers:null, list:null });
    setShell(store.state.shell);
    summariseAbsence(away);
  },
  onSignedIn:toStart,
  onSignedOut:() => { clearSave(localStorage); toStart(); },
});

requestAnimationFrame(t => { lastT = t; frame(t); });
