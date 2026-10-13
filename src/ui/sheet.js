// The two surfaces that replaced the dial and the A/B/C buttons.
//
//   .acts   — everything you can do at this zoom right now, one tap away, no menu to open first
//   .sheet  — a bottom sheet for anything deeper: lists of food, shops, the Lab
//
// Menus in menus.js are plain { title, items:[{label, fn, dis}] } data, so both surfaces render
// the same structures; only the depth differs.
import { ui } from "./state.js";
import { store } from "../core/store.js";
import { contextMenu, openLab } from "./menus.js";
import { gamePad, quitGame } from "./runner.js";
import { ALL_FIELDS, FIELDS } from "../data/fields.js";
import { buzz } from "./sound.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

let hooks = {};
let acts = [];                 // what the rendered action buttons currently do
let lastActs = "", lastSheet = "";

const topMenu = () => ui.menuStack[ui.menuStack.length - 1] || null;

export function closeSheet() {
  ui.menuStack = [];
  ui.list = null;
  if (ui.mode === "menu" || ui.mode === "list") ui.mode = "main";
}

function back() {
  if (ui.mode === "list") return closeSheet();
  ui.menuStack.pop();
  if (!ui.menuStack.length) ui.mode = "main";
}

export function initSheet(h) {
  hooks = h;
  $("acts").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b && !b.disabled) { buzz(); acts[+b.dataset.i]?.fn(); }
  });
  $("sheetItems").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    buzz();
    topMenu()?.items[+b.dataset.i]?.fn();
  });
  $("sheetBack").addEventListener("click", back);
  $("sheetClose").addEventListener("click", closeSheet);
  // tapping the dimmed backdrop, but not the sheet itself
  $("sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });
}

/* ---------- the action row ---------- */
function buildActs() {
  if (ui.mode === "start") return [
    ...ALL_FIELDS.map((f, i) => ({ label:FIELDS[f].name, cls:ui.startSel === i ? "primary" : "",
      fn:() => { ui.startSel = i; hooks.onFieldPreview(f); } })),
    { label:"Egg Bang! Bắt đầu", cls:"wide primary", fn:() => hooks.onStart(ALL_FIELDS[ui.startSel]) },
  ];
  if (ui.mode === "game") return [...gamePad(), ...(ui.game.event ? [] : [{ label:"Thôi không chơi", cls:"wide quiet", fn:quitGame }])];
  if (!store.state) return [];
  const m = contextMenu();
  return [...m.items, { label:"Phòng Lab", cls:(m.items.length % 2 ? "" : "wide ") + "quiet", fn:openLab }];
}

function renderActs() {
  acts = buildActs();
  const frozen = ui.mode === "anim";
  const key = ui.mode + "|" + frozen + "|" + acts.map(a => a.label + (a.cls || "") + (a.dis ? "!" : "")).join("~");
  if (key === lastActs) return;
  lastActs = key;
  $("acts").innerHTML = acts.map((a, i) =>
    "<button data-i=" + i + ' class="' + (a.cls || "") + '"' + (a.dis || frozen ? " disabled" : "") + ">" + esc(a.label) + "</button>").join("");
}

/* ---------- the sheet ---------- */
function renderSheet() {
  const m = ui.mode === "menu" ? topMenu() : null;
  const l = ui.mode === "list" ? ui.list : null;
  const key = !m && !l ? "" : (m ? "m" + ui.menuStack.length + m.title + m.sel + m.items.map(i => i.label + (i.dis ? "!" : "")).join("~")
    : "l" + l.title + l.lines.join("~"));
  if (key === lastSheet) return;
  lastSheet = key;
  $("sheet").hidden = !key;
  if (!key) return;
  $("sheetTitle").textContent = m ? m.title : l.title;
  $("sheetItems").innerHTML = m
    ? m.items.map((it, i) => "<button data-i=" + i + ' class="' + (i === m.sel ? "sel" : "") + '"' +
        (it.dis ? " disabled" : "") + ">" + esc(it.label) + "</button>").join("")
    : l.lines.map(x => "<div class=line>" + esc(x) + "</div>").join("");
  $("sheetItems").scrollTop = 0;
}

export function renderBars() { renderActs(); renderSheet(); }
