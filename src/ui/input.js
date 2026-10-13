// Touch first: the screen itself is the control surface. You tap the thing you mean — the poop,
// the virus, the Grim Gotchi — and swipe sideways to change zoom. The keyboard path is kept for
// desktop and still funnels into handle(action) with "L" "R" "A" "B" "C" "LAB".
import { ui } from "./state.js";
import { perform, act } from "./feedback.js";
import { closeSheet } from "./sheet.js";
import { unlockAudio, click } from "./sound.js";
import { gameInput, gameTap } from "./runner.js";
import { openMenu, openLab } from "./menus.js";
import { store, clockStr, dateOf, today } from "../core/store.js";
import { W, H } from "../render/canvas.js";
import { virusPos } from "../render/scenes.js";
import { ALL_FIELDS } from "../data/fields.js";
import { newGame } from "../core/state.js";
import { evolveKid } from "../core/sim.js";
import * as A from "../core/actions.js";
import { clamp } from "../util.js";

let hooks = { onNewGame:() => {}, onFieldPreview:() => {} };
const BOTH_MS = 160;      // A and B within this window = both flags
const SWIPE_PX = 40;      // past this, a drag across the screen is a zoom change, not a tap
const MOVE_PX = 10;       // past this, the finger has moved too far to count as a tap

const setZoom = z => {
  z = clamp(z, 0, 3);
  if (z === ui.zoom) return;
  ui.zoom = z; ui.zoomFx = performance.now(); ui.statusPage = 0;
  click(true);
};

/* ---------- tapping the scene ---------- */
function tapScene(x, y, t) {
  const p = store.state.pet;

  if (ui.zoom === 3) {
    if (p.prompt) return evolveKid(p.prompt.field);
    // hunting the drifting viruses by hand is the whole cure, so the tap has to land on one
    if (p.sick) {
      for (let i = 0; i < p.viruses; i++) {
        const [vx, vy] = virusPos(i, t);
        if (Math.hypot(x - vx, y - vy) < 10) return perform(A.tapVirus());
      }
      return;
    }
    if (p.stage !== "dead") ui.statusPage = (ui.statusPage + 1) % 3;
    return;
  }

  if (ui.zoom === 2) {
    if (p.grim) return perform(A.scareGrim());
    if (p.stage === "dead") return perform(A.newEggAfterDeath());
    if (p.injured) return perform(A.tendInjury());
  }

  const caught = A.catchPoop();                    // Bé Trắng catches it mid-air, either view
  if (caught && (ui.zoom === 1 || ui.zoom === 2)) return perform(caught);

  if (ui.zoom === 1 && y > 58 && p.poops.some(pp => Math.abs(pp.x - x) < 9)) return act(A.cleanPoop);

  openMenu();                                      // nothing under the finger: show what is possible here
}

/* ---------- keyboard ---------- */
export function handle(a) {
  unlockAudio();
  const t = performance.now();
  click(a === "L" || a === "R");

  switch (ui.mode) {
    case "start":
      if (a === "L") ui.startSel = (ui.startSel + 2) % 3;
      if (a === "R" || a === "A") ui.startSel = (ui.startSel + 1) % 3;
      hooks.onFieldPreview(ALL_FIELDS[ui.startSel]);
      if (a === "B") startNew(ALL_FIELDS[ui.startSel]);
      return;
    case "menu": {
      if (a === "LAB" || a === "C") return closeSheet();
      const m = ui.menuStack[ui.menuStack.length - 1];
      if (a === "L") m.sel = (m.sel - 1 + m.items.length) % m.items.length;
      if (a === "R" || a === "A") m.sel = (m.sel + 1) % m.items.length;
      if (a === "B" && !m.items[m.sel].dis) m.items[m.sel].fn();
      return;
    }
    case "list": {
      if (a === "B" || a === "C" || a === "LAB") closeSheet();
      return;
    }
    case "game": {
      const both = (a === "A" && t - ui.lastB < BOTH_MS) || (a === "B" && t - ui.lastA < BOTH_MS);
      if (a === "A") ui.lastA = t;
      if (a === "B") ui.lastB = t;
      return gameInput(both && ui.game.id === "flags" ? "AB" : a);
    }
    case "anim": return;
  }

  // main
  if (a === "LAB") return openLab();
  if (a === "L" || a === "R") return setZoom(ui.zoom + (a === "R" ? 1 : -1));
  if (a === "A" || a === "B") return tapScene(-99, -99, t);   // off-scene: falls through to the menu
  if (a === "C") perform({ msg:clockStr() + " · " + dateOf(today()).toLocaleDateString("vi-VN") });
}

export function startNew(field) {
  newGame(field);
  ui.mode = "main"; ui.zoom = 2;
  hooks.onNewGame();
}

const KEYMAP = { ArrowLeft:"L", ArrowRight:"R", q:"L", e:"R", Q:"L", E:"R", z:"A", Z:"A", 1:"A", x:"B", X:"B", 2:"B", Enter:"B", " ":"B",
  c:"C", C:"C", 3:"C", Escape:"C", Backspace:"C", v:"LAB", V:"LAB" };

export function bindControls(h) {
  hooks = h;
  addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest("button, a, input") && (e.key === "Enter" || e.key === " ")) return;
    const a = KEYMAP[e.key];
    if (!a || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault(); handle(a);
  });

  const screen = document.getElementById("screen");
  const at = e => {
    const r = screen.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
  };
  let down = null;

  screen.addEventListener("pointerdown", e => {
    unlockAudio();
    screen.setPointerCapture(e.pointerId);
    down = { sx:e.clientX, sy:e.clientY, moved:false };
    if (ui.mode === "game") { const [x, y] = at(e); gameTap(x, y, "down"); }
  });

  screen.addEventListener("pointermove", e => {
    if (!down) return;
    if (Math.hypot(e.clientX - down.sx, e.clientY - down.sy) > MOVE_PX) down.moved = true;
    if (ui.mode === "game") { const [x, y] = at(e); gameTap(x, y, "move"); }
  });

  const end = e => {
    const d = down;
    down = null;
    if (!d) return;
    if (ui.mode === "game") { const [x, y] = at(e); return gameTap(x, y, "up"); }
    if (ui.mode === "anim" || !store.state) return;
    const dx = e.clientX - d.sx;
    // swipe left to go deeper (Space → Field → Tama → Cell), right to pull back out
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - d.sy)) return setZoom(ui.zoom + (dx < 0 ? 1 : -1));
    if (d.moved || ui.mode !== "main") return;
    click(false);
    const [x, y] = at(e);
    tapScene(x, y, performance.now());
  };
  screen.addEventListener("pointerup", end);
  screen.addEventListener("pointercancel", () => { down = null; });

  document.getElementById("zoomTabs").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b && !b.disabled) { unlockAudio(); setZoom(+b.dataset.z); }
  });
}
