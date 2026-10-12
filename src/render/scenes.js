// The four zoom levels (Space, Field, Tama, Cell) plus shared backgrounds.
import { W, H, OUT, ctx, rect, disc, drawAt } from "./canvas.js";
import { iconSprite, toySprite, decoSprite, spriteOf, eggSprite, shiroSprite } from "./sprites.js";
import { store, today, hourNow, fieldsOpen } from "../core/store.js";
import { FIELDS, FIELD_ORDER_BY_SHELL } from "../data/fields.js";
import { RAW } from "../data/items.js";
import { PLANETS } from "../data/planets.js";
import { FUEL_FULL } from "../core/rules.js";
import { genesOf, npcCreature, alive } from "../core/creatures.js";
import { visitorsActive } from "../core/actions.js";
import { ui } from "../ui/state.js";
import { ri, rnd } from "../util.js";

export const blinkNow = t => t % 3200 < 140;
const S = () => store.state;

/* step a wandering actor {x, tx, face, next} toward a random target */
function wander(a, t, speed, lo, hi, chooseTarget) {
  if (t > a.next) { a.tx = chooseTarget ? chooseTarget() : ri(lo, hi); a.next = t + rnd(1500, 3600); }
  const d = a.tx - a.x;
  if (Math.abs(d) > 0.5) { a.x += Math.sign(d) * speed; a.face = d < 0; }
  return Math.abs(d) <= 0.5;
}

function cloudAt(x, y) { rect(x + 3, y, 10, 3, "#ffffff"); rect(x, y + 2, 18, 4, "#ffffff"); rect(x + 6, y - 2, 5, 2, "#ffffff"); }

export function bgScene(f, t, wide) {
  if (f === "water") {
    rect(0,0,W,22,"#c4f0ff"); rect(0,22,W,22,"#9fe0ff"); rect(0,44,W,24,"#7fcdf5"); rect(0,66,W,14,"#f2dca6"); rect(0,66,W,1,"#dcc083");
    for (const x of wide ? [6,30,62,88] : [7,88]) for (let i = 0; i < 9; i++) rect(x + ((i + Math.floor(t / 500)) % 2), 64 - i * 2, 1, 2, i % 3 ? "#3fae5a" : "#2b7a3f");
    for (let i = 0; i < 6; i++) rect((i * 23 + 7) % W, 66 - ((t / 45 + i * 17) % 62), 2, 2, "rgba(255,255,255,.7)");
  } else if (f === "land") {
    rect(0,0,W,48,"#c8edff");
    for (let x = 0; x < W; x++) { const h = 46 - Math.round(4 * Math.sin(x / 9) + 2 * Math.sin(x / 4)); rect(x, h, 1, 64 - h, "#a6dc96"); }
    rect(0,62,W,18,"#7bc46a"); rect(0,62,W,1,"#5ea84f");
    cloudAt(((t / 120) % 130) - 20, 10); if (wide) cloudAt(((t / 90 + 60) % 130) - 20, 20);
    for (const x of [10,26,70,84]) { rect(x,72,1,1,"#ff7fb6"); rect(x,73,1,1,"#3fae5a"); }
  } else {
    rect(0,0,W,26,"#ffe3f2"); rect(0,26,W,22,"#f1d9ff"); rect(0,48,W,32,"#dccdff");
    cloudAt(((t / 100) % 140) - 24, 12); cloudAt(((t / 140 + 70) % 140) - 24, 30);
    for (let x = -4; x < W + 8; x += 10) disc(x, 70, 6, "#ffffff");
    rect(0,70,W,10,"#ffffff");
  }
  const w = S() && S().weather.w, h = S() ? hourNow() : 12;
  if (w === "cloud") rect(0,0,W,H,"rgba(120,120,140,.18)");
  if (w === "rain") { rect(0,0,W,H,"rgba(90,100,140,.22)"); for (let i = 0; i < 18; i++) rect((i * 29 + t / 8) % W, (i * 17 + t / 4) % H, 1, 3, "rgba(200,220,255,.8)"); }
  if (h >= 19 || h < 6) rect(0,0,W,H,"rgba(30,22,80,.35)");
}

/* ---------- Tama view ---------- */
export function drawTamaView(t) {
  const s = S(), p = s.pet, G = 70, a = ui.anim;
  bgScene(p.field, t, false);
  if (p.stage === "dead") { drawAt(iconSprite("starsad"), 48, 48 - Math.sin(t / 500) * 3, 4); return; }
  if (p.stage === "egg") { drawAt(spriteOf(p), 48 + (Math.floor(t / 350) % 4 === 0 ? 1 : 0), G, 2); return; }
  const me = ui.tama;
  let x, flip, closed = blinkNow(t), bob = Math.floor(t / 500) % 2;
  if (p.asleep || p.injured || p.grim || p.wiggle) { x = 48; flip = false; closed = p.asleep; bob = 0; }
  else if (a && ["eat", "no", "bath"].includes(a.type)) { x = a.type === "eat" ? 40 : 48; flip = false; }
  else { wander(me, t, 0.35, 20, 76); x = me.x; flip = me.face; }
  if (p.danceUntil > s.clock) bob = Math.floor(t / 150) % 2 * 3;
  if (a && a.type === "no") x += Math.floor((t - a.t0) / 90) % 2 ? 2 : -2;
  if (a && a.type === "eat") closed = Math.floor((t - a.t0) / 160) % 2 === 0;
  if (p.wiggle) x += Math.floor(t / 80) % 2 ? 1 : -1;
  drawAt(spriteOf(p, closed), x, G - bob, 2, flip);
  if (p.wiggle) for (const sd of [-1, 1]) { rect(x + sd * 18, 46, 1, 3, OUT); rect(x + sd * 20, 44, 1, 3, OUT); }
  if (p.dirty) { for (const [dx, dy] of [[-8,-10],[6,-4],[-2,-18],[9,-14]]) rect(x + dx, G + dy, 2, 2, "#8a6a4a"); rect(x + Math.sin(t / 150) * 12, 34 + Math.cos(t / 110) * 4, 1, 1, OUT); }
  if (p.injured) { drawAt(iconSprite("bandage"), x - 6, G - 18, 2); drawAt(iconSprite("bandage"), x + 7, G - 8, 1); }
  if (p.sparkleUntil > s.clock) for (let i = 0; i < 4; i++) if (Math.sin(t / 200 + i * 2) > 0.3) rect(x + Math.cos(i * 1.7) * 18, 40 + Math.sin(i * 2.3) * 14, 1, 1, "#ffffff");
  if (a && a.type === "eat") {
    const ic = iconSprite(a.icon), part = 1 - Math.min(2, Math.floor((t - a.t0) / 500)) / 3, sw = Math.max(1, Math.round(ic.w * part));
    ctx.drawImage(ic.cv, ic.w - sw, 0, sw, ic.h, 64 + (ic.w - sw) * 2, 40, sw * 2, ic.h * 2);   // bitten food shrinks
  }
  if (a && a.type === "bath") { const k = (t - a.t0) / a.dur; for (let i = 0; i < 10; i++) disc(x + Math.cos(i * 1.3 + t / 120) * 16, 40 + Math.sin(i * 1.7 + t / 140) * 14 - k * 10, 2, "rgba(255,255,255,.85)"); }
  if (p.love) drawAt(iconSprite("heart"), x + 14, 26 + Math.sin(t / 250) * 2, 1);
  if (p.sick) drawAt(iconSprite("virus"), x - 14, 30 + Math.sin(t / 300) * 2, 1);
  if (p.grim) drawAt(iconSprite("grim"), 80 - Math.min(20, p.grim.min * 1.5), 30 + Math.sin(t / 200) * 3, 2);
  if (p.asleep) rect(0,0,W,H,"rgba(6,6,22,.66)");
}

/* ---------- Field view ---------- */
const TOY_X = [14, 38, 62, 84];
function walkersFor(field) {
  const s = S(), vis = visitorsActive(PLANETS);
  const key = field + "|" + s.residents.length + "|" + s.pet.gen + "|" + s.pet.stage + "|" + vis.map(v => v.id).join(",");
  if (ui.walkersKey !== key || !ui.walkers) {
    ui.walkersKey = key;
    const list = s.residents.filter(r => r.field === field).map(r => ({ o:r }));
    vis.forEach(pl => pl.npc.forEach(n => list.push({ o:npcCreature(n) })));
    ui.walkers = list.slice(0, 8).map(w => ({ ...w, x:ri(10, 86), tx:ri(10, 86), face:false, next:0 }));
  }
  return ui.walkers;
}

export function drawFieldView(t) {
  const s = S(), p = s.pet, a = ui.anim;
  bgScene(p.field, t, true);
  s.toysPlaced.forEach((id, i) => drawAt(toySprite(id), TOY_X[i], 62, 2));
  for (const pp of p.poops) drawAt(iconSprite(pp.age >= 60 ? "poopd" : "poop"), pp.x, 78, pp.big ? 2 : 1);
  const toyXs = TOY_X.slice(0, s.toysPlaced.length);
  for (const w of walkersFor(p.field)) {
    const arrived = wander(w, t, 0.12, 8, 88, () => (toyXs.length && Math.random() < 0.5 ? toyXs[ri(0, toyXs.length - 1)] : ri(8, 88)));
    const onToy = arrived && toyXs.some(x => Math.abs(x - w.x) < 2);
    drawAt(spriteOf(w.o, blinkNow(t + (w.o.gen || 3) * 400)), w.x, 75 - (onToy ? Math.floor(t / 250) % 2 * 2 : 0), 1, w.face);
  }
  if (p.stage === "dead") { drawAt(iconSprite("starsad"), 48, 50 - Math.sin(t / 500) * 2, 2); return; }
  if (a && a.type === "mate") return drawMate(t, a, p);
  if (a && a.type === "hunt") return drawHunt(t, a);
  if (a && a.type === "flush") { const k = (t - a.t0) / a.dur; rect(-20 + k * 130, 66, 24, 14, "rgba(160,220,255,.85)"); drawAt(shiroSprite(), -14 + k * 130, 78, 1); }
  const me = ui.field;
  if (!p.asleep && !p.wiggle) wander(me, t, 0.22, 12, 84);
  drawAt(spriteOf(p, p.asleep || blinkNow(t)), me.x + (p.wiggle ? (Math.floor(t / 80) % 2 ? 1 : -1) : 0), 77 - (p.asleep ? 0 : Math.floor(t / 500) % 2), 1, me.face);
  if (p.asleep) rect(0,0,W,H,"rgba(6,6,22,.5)");
}

function drawMate(t, a, p) {
  const e = t - a.t0, q = a.partner, px = Math.max(62, 100 - e / 40), shake = Math.floor(e / 80) % 2 ? 2 : -2, fighting = !a.ok && e > 1100;
  drawAt(spriteOf(p, blinkNow(t)), 36 + (fighting ? shake : 0), 76, 1, false);
  if (e < 2700) drawAt(spriteOf(q, false), px + (fighting ? shake : 0), 76, 1, true);
  if (a.ok && e > 1100 && e < 2700) for (let i = 0; i < 3; i++) drawAt(iconSprite("heart"), 44 + i * 6, 50 - ((e / 30 + i * 8) % 16), 1);
  if (fighting && e < 2700) for (let i = 0; i < 4; i++) drawAt(iconSprite("cloud"), 48 + Math.sin(e / 90 + i) * 8, 64 + Math.cos(e / 70 + i) * 4, 1);
  if (a.ok && e > 2500) drawAt(eggSprite(FIELDS[p.field].hue), 50, 76, 1);
}

function drawHunt(t, a) {
  const e = t - a.t0, k = e / a.dur;
  if (a.loc === "volcano") for (let i = 0; i < 8; i++) rect(70 + i, 48 - i, 16 - 2 * i, 1, i < 2 ? "#ff6a3d" : "#7a4a3a");
  else { disc(78, 58, 9, "#9fe0ff"); disc(78, 58, 6, "#c4f0ff"); }
  const team = [...a.party, ...Array(a.hunters).fill(null)];
  team.forEach((o, i) => drawAt(o ? spriteOf(o, false) : shiroSprite(), -10 + k * 70 - i * 13, 76 - (Math.floor(e / 200 + i) % 2), 1, false));
  if (a.ghost && e > 2200) drawAt(iconSprite("ghost"), 60, 50 + Math.sin(e / 200) * 3, 2);
  else for (let i = 0; i < a.eggs; i++) if (e > 1200 + i * 220) drawAt(eggSprite(i * 40), 10 + i * 9, 52 - Math.max(0, 6 - (e - 1200 - i * 220) / 40), 1);
}

/* ---------- Space view ---------- */
export const STARS = Array.from({ length:44 }, (_, i) => [(i * 37 + 5) % W, (i * 53 + 11) % H, i]);
const PLANET_COL = { water:["#5ab8f5","#a6e0ff","#3a86c8"], land:["#6cc05a","#a8e294","#4b9140"], sky:["#c8b6ff","#e6dcff","#9a84e0"] };
const LOCKED = ["#4a4f68","#5d6380","#3a3e55"];

/* planet split into one sector per field of this shell; locked fields are grey */
export function drawPlanet(cx, cy, r, rot, cols) {
  for (let dy = -r - 2; dy <= r + 2; dy++) for (let dx = -r - 2; dx <= r + 2; dx++) {
    const d = Math.hypot(dx, dy);
    if (d > r + 1.6) continue;
    if (d > r) { rect(cx + dx, cy + dy, 1, 1, "#3a4aa8"); continue; }
    let ang = Math.atan2(dy, dx) + rot;
    ang = ((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const pal = cols(Math.floor(ang / (2 * Math.PI / 3)) % 3), sh = (dx + dy) / r;
    rect(cx + dx, cy + dy, 1, 1, sh < -0.75 ? pal[1] : sh > 0.75 ? pal[2] : pal[0]);
  }
}
export const planetCols = () => i => { const f = FIELD_ORDER_BY_SHELL[S().shell][i]; return fieldsOpen().includes(f) ? PLANET_COL[f] : LOCKED; };

export function drawSpaceView(t) {
  const s = S(), a = ui.anim;
  rect(0,0,W,H,"#0d1033");
  for (const [x, y, i] of STARS) rect(x, y, 1, 1, Math.sin(t / 380 + i) > 0.55 ? "#ffffff" : "#5c66b0");
  if (a && a.type === "travel") return drawTravel(t, a);
  const cx = 52, cy = 44, r = 12 + s.level;
  drawPlanet(cx, cy, r, t / 7000, planetCols());
  s.decoPlaced.forEach((id, i) => { const an = -Math.PI / 2 + (i - (s.decoPlaced.length - 1) / 2) * 0.55; drawAt(decoSprite(id), cx + Math.cos(an) * (r + 1), cy + Math.sin(an) * (r + 1) + 2, 1); });
  if (s.fuel >= FUEL_FULL && Math.floor(t / 500) % 2) drawAt(iconSprite("rocket"), cx + r + 6, cy + r, 1);
  s.memories.slice(-8).forEach((m, i) => { if (Math.sin(t / 300 + i * 2) > -0.6) drawAt(iconSprite(m.smile ? "star" : "starsad"), 6 + (i % 4) * 7, 14 + Math.floor(i / 4) * 7, 1); });
  if (s.events.starDay === today() && hourNow() >= 20) { const k = (t / 1200) % 1; rect(90 - k * 80, 6 + k * 20, 3, 1, "#ffffff"); }
}

function drawTravel(t, a) {
  const e = t - a.t0, pl = a.pl;
  if (e < 1400) { drawPlanet(48, 60 + e / 40, 21, 0, planetCols()); drawAt(iconSprite("rocket"), 48, 40 - e / 30, 2); return; }
  if (e < 2600) { for (let i = 0; i < 20; i++) rect((i * 37) % W, (i * 23 + e / 3) % H, 1, 4, "#9fb0ff"); drawAt(iconSprite("rocket"), 48 + Math.sin(e / 120) * 2, 50, 2); return; }
  drawPlanet(48, 92, 34, 0, () => [pl.col, "#ffffff", "#2a2238"]);
  pl.npc.forEach((n, i) => drawAt(spriteOf(npcCreature(n), blinkNow(t + i * 900)), 20 + i * 56, 66 - (Math.floor(e / 300 + i) % 2), 1, i === 1));
  drawAt(spriteOf(S().pet, false), 42, 66, 1);
  a.guests.forEach((o, i) => drawAt(spriteOf(o, false), 54 + i * 10, 66, 1));
  if (a.gift) drawAt(decoSprite(a.gift), 48, 40 - Math.abs(Math.sin(e / 250)) * 4, 3);
}

/* ---------- Cell view ---------- */
const CELLS = Array.from({ length:9 }, (_, i) => ({ x:(i * 29 + 7) % W, y:(i * 17 + 9) % H, r:5 + (i % 3) * 2, v:(i % 2 ? 1 : -1) * (0.5 + (i % 3) * 0.3) }));

/* icons orbiting the Tama Cell: field cells (baby/kid), food cells (kid), care cells (young/adult) */
export function cellIcons(p) {
  const out = [], rep = (n, ic) => { for (let i = 0; i < n; i++) out.push(ic); };
  if (p.stage === "baby") p.fieldCells.slice(-8).forEach(f => out.push(FIELDS[f].cell));
  if (p.stage === "kid") {
    p.fieldCells.slice(-4).forEach(f => out.push(FIELDS[f].cell));
    p.foodCells.forEach(c => out.push(RAW.find(r => r.f === c.f && r.t === c.t).ic));
    rep(Math.min(6, p.mist), "squig");
  }
  if (p.stage === "young" || p.stage === "adult") {
    rep(Math.min(5, p.maxHu), "rice"); rep(Math.min(5, p.maxHa), "sun"); rep(Math.min(6, p.mist), "squig"); rep(p.sickStage, "sickc");
  }
  if (p.vitamin) out.push("vitc");
  return out;
}

export function drawCellView(t) {
  rect(0,0,W,H,"#ffc3d0");
  for (const c of CELLS) { const x = ((c.x + t / 1000 * c.v * 3) % (W + 20) + W + 20) % (W + 20) - 10; disc(x, c.y, c.r, "#ffa6bc"); disc(x, c.y, c.r - 2, "#ffb8ca"); }
  const p = S().pet;
  if (!alive(p)) return;
  const cx = 48, cy = 42, mood = p.hunger + p.happy / 4;
  disc(cx, cy, 15, "#ffe0ea"); disc(cx, cy, 13, "#ff9fbf"); disc(cx, cy, 9, "#ff7fa8");
  const g = genesOf(p), ey = cy - 2;
  if (p.stage === "adult" && g.eye === "wide") { rect(cx - 5, ey + 1, 2, 1, OUT); rect(cx + 3, ey + 1, 2, 1, OUT); }
  else if (p.stage === "adult" && g.eye === "dot") { rect(cx - 4, ey + 1, 1, 1, OUT); rect(cx + 3, ey + 1, 1, 1, OUT); }
  else { rect(cx - 4, ey, 1, 2, OUT); rect(cx + 3, ey, 1, 2, OUT); }
  rect(cx - 1, cy + 2, 2, 1, "#ffd34d");
  if (mood < 4) rect(cx - 2, cy + 5, 4, 1, OUT);
  else if (mood > 7) { rect(cx - 2, cy + 4, 1, 1, OUT); rect(cx + 1, cy + 4, 1, 1, OUT); rect(cx - 1, cy + 5, 2, 1, OUT); }
  const icons = cellIcons(p), n = Math.max(icons.length, 1);
  icons.forEach((ic, i) => { const an = -Math.PI / 2 + i * (2 * Math.PI / n) + t / 9000; drawAt(iconSprite(ic), cx + Math.cos(an) * 34, cy + Math.sin(an) * 24 + 3, 1); });
  if (p.sick) for (let i = 0; i < p.viruses; i++) drawAt(iconSprite("virus"), cx + Math.cos(t / 400 + i * 1.6) * 14, cy + Math.sin(t / 400 + i * 1.6) * 12 + 2, 2);
}

/* start screen: chosen shell's field with a wobbling egg */
export function drawStart(t, field) {
  bgScene(field, t, false);
  drawAt(eggSprite(FIELDS[field].hue), 48 + (Math.floor(t / 350) % 4 === 0 ? 1 : 0), 70, 2);
}
