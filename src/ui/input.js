// Every control funnels into handle(action): "L" / "R" (dial), "A" / "B" / "C", "LAB" (dial press).
import { ui } from "./state.js";
import { closeMenu, perform } from "./feedback.js";
import { unlockAudio, click } from "./sound.js";
import { gameInput } from "./runner.js";
import { openMenu, openLab } from "./menus.js";
import { store, clockStr, dateOf, today } from "../core/store.js";
import { ALL_FIELDS } from "../data/fields.js";
import { newGame } from "../core/state.js";
import { evolveKid } from "../core/sim.js";
import * as A from "../core/actions.js";
import { clamp } from "../util.js";

let hooks = { onNewGame:() => {}, onShellPreview:() => {} };
const BOTH_MS = 160;   // A and B within this window = both flags

export function handle(a) {
  unlockAudio();
  const t = performance.now();
  if (a === "L" || a === "R") { ui.dialRot += a === "L" ? -20 : 20; document.getElementById("device").style.setProperty("--rot", ui.dialRot + "deg"); }
  click(a === "L" || a === "R");

  switch (ui.mode) {
    case "start":
      if (a === "L") ui.startSel = (ui.startSel + 2) % 3;
      if (a === "R" || a === "A") ui.startSel = (ui.startSel + 1) % 3;
      hooks.onShellPreview(ALL_FIELDS[ui.startSel]);
      if (a === "B") { newGame(ALL_FIELDS[ui.startSel]); ui.mode = "main"; ui.zoom = 2; hooks.onNewGame(); }
      return;
    case "menu": {
      if (a === "LAB") return closeMenu();
      const m = ui.menuStack[ui.menuStack.length - 1];
      if (a === "L") m.sel = (m.sel - 1 + m.items.length) % m.items.length;
      if (a === "R" || a === "A") m.sel = (m.sel + 1) % m.items.length;
      if (a === "B") m.items[m.sel].fn();
      if (a === "C") { ui.menuStack.pop(); if (!ui.menuStack.length) ui.mode = "main"; }
      return;
    }
    case "list": {
      const l = ui.list;
      if (a === "L") l.off = Math.max(0, l.off - 1);
      if (a === "R" || a === "A") l.off = Math.min(Math.max(0, l.lines.length - 5), l.off + 1);
      if (a === "B" || a === "C") { ui.list = null; ui.mode = "main"; }
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
  const p = store.state.pet;
  if (a === "L" || a === "R") {
    const z = clamp(ui.zoom + (a === "R" ? 1 : -1), 0, 3);
    if (z !== ui.zoom) { ui.zoom = z; ui.zoomFx = t; ui.statusPage = 0; }
    if (z === 3 && p.prompt) evolveKid(p.prompt.field);   // answering the baby's evolution prompt
    return;
  }
  const caught = A.catchPoop();
  if (caught && (ui.zoom === 1 || ui.zoom === 2)) return perform(caught);
  if (ui.zoom === 2) {
    if (p.grim) return perform(A.scareGrim());
    if (p.stage === "dead") { if (a === "A" || a === "B") { perform(A.newEggAfterDeath()); ui.walkers = null; } return; }
    if (p.injured && (a === "A" || a === "B")) return perform(A.tendInjury());
  }
  if (ui.zoom === 3 && p.sick) return perform(A.tapVirus());
  if (a === "A" || a === "B") return openMenu();
  if (a === "C") {
    if (ui.zoom === 3) { ui.statusPage = 0; return; }
    perform({ msg:clockStr() + " · " + dateOf(today()).toLocaleDateString("vi-VN") });
  }
}

const KEYMAP = { ArrowLeft:"L", ArrowRight:"R", q:"L", e:"R", Q:"L", E:"R", z:"A", Z:"A", 1:"A", x:"B", X:"B", 2:"B", Enter:"B", " ":"B",
  c:"C", C:"C", 3:"C", Escape:"C", Backspace:"C", v:"LAB", V:"LAB" };

/* keyboard, the three buttons, and the dial (click halves, centre press, wheel, horizontal drag) */
export function bindControls(h) {
  hooks = h;
  const $ = id => document.getElementById(id);
  addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest("button") && (e.key === "Enter" || e.key === " ")) return;
    const a = KEYMAP[e.key];
    if (!a || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault(); handle(a);
  });
  document.querySelectorAll(".btn").forEach(b => b.addEventListener("click", () => handle(b.dataset.a)));
  let dragX = null, dragged = false, wheelT = 0;
  $("dialL").addEventListener("click", () => { if (!dragged) handle("L"); });
  $("dialR").addEventListener("click", () => { if (!dragged) handle("R"); });
  $("dialCap").addEventListener("click", () => { if (!dragged) handle("LAB"); });
  const dial = $("dial");
  dial.addEventListener("wheel", e => {
    e.preventDefault();
    const t = performance.now(); if (t - wheelT < 90) return; wheelT = t;
    handle(e.deltaY > 0 || e.deltaX > 0 ? "R" : "L");
  }, { passive:false });
  dial.addEventListener("pointerdown", e => { dragX = e.clientX; dragged = false; });
  addEventListener("pointermove", e => {
    if (dragX === null) return;
    const d = e.clientX - dragX;
    if (Math.abs(d) >= 16) { dragged = true; handle(d > 0 ? "R" : "L"); dragX = e.clientX; }
  });
  addEventListener("pointerup", () => { dragX = null; setTimeout(() => { dragged = false; }, 0); });
}
