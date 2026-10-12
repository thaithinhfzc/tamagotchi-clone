// The clock. simMinute() advances the world by one game minute; nothing else changes time.
import { store, today, hourNow, dateOf, fieldsOpen } from "./store.js";
import { emit } from "./bus.js";
import * as R from "./rules.js";
import { ALL_FIELDS } from "../data/fields.js";
import { RAW } from "../data/items.js";
import { ri, random } from "../util.js";
import { nameOf, adultRates } from "./creatures.js";
import { gain, getSick, cure, mistake, deathCheck, die, sleepNow, wakeNow } from "./pet.js";
import { addGP, discover, checkLevel } from "./progress.js";

export function simMinute() {
  const s = store.state, p = s.pet;
  s.clock++;
  const h = hourNow();
  dailyEvents(today(), h);
  if (p.stage === "dead") return;
  if (p.stage === "egg") { if (++p.stageAge >= R.EGG_MIN) hatch(); return; }
  p.age++; p.stageAge++;

  // sleep: baby only naps; others fall asleep by 22:00 and wake by 10:00 (earlier by hand, see actions)
  if (p.stage !== "baby") {
    if (!p.asleep && (h >= R.SLEEP_AUTO || h < R.WAKE_FROM)) sleepNow(false);
    if (p.asleep && !p.nap && h >= R.WAKE_AUTO && h < R.SLEEP_FROM) wakeNow(false);
  } else if (!p.napped && p.stageAge >= R.BABY_NAP_AT) { p.napped = true; p.asleep = true; p.nap = R.BABY_NAP_LEN; }
  if (p.nap > 0 && --p.nap === 0) p.asleep = false;

  const sitting = s.sitterUntil > s.clock;
  if (!p.asleep) {
    const r = rates(p);
    if (++p.huT >= r.hu) { p.huT = 0; p.hunger = Math.max(0, p.hunger - 1); }
    p.haT += (p.dirty ? 1.5 : 1) / (p.slowUntil > s.clock ? 2 : 1);   // dirt factor ƯL
    if (p.haT >= r.ha) { p.haT = 0; p.happy = Math.max(0, p.happy - 1); }
    if (p.wiggle > 0) { if (--p.wiggle === 0) dropPoop(p); }
    else if (--p.poopIn <= 0) { p.wiggle = R.POOP_WIGGLE_MIN; p.poopIn = ri(...R.POOP_EVERY[p.special ? "adult" : p.stage]); }
    if (--p.dirtyIn <= 0) p.dirty = true;
    if (p.stage === "baby" && !p.sickedBaby && p.stageAge >= R.BABY_SICK_AT) { p.sickedBaby = true; getSick(); }
  }
  for (const pp of p.poops) pp.age++;
  // 6 dark poops → sick, once per pile (latched until cleaned, otherwise it re-triggers right after curing)
  if (!p.sick && !p.poopSick && p.poops.filter(x => x.age >= R.DARK_POOP_MIN).length >= R.DARK_POOP_SICK) { p.poopSick = true; getSick(); }
  if (sitting) sitter(p);
  if (p.sick) p.sickMin++;
  if (p.hunger === 0 && !p.asleep) { if (++p.starveMin >= R.STARVE_DEATH) deathCheck("đói lả"); }
  else if (p.hunger > 0) p.starveMin = 0;
  if (p.stage === "dead") return;
  if (p.grim && ++p.grim.min >= R.GRIM_WINDOW) { const c = p.grim.cause; p.grim = null; return die(c); }
  updateCalls(p, sitting);
  if (p.stage === "dead") return;
  growth(p);
}

export function rates(p) { return p.stage === "adult" ? adultRates(p) : R.RATE[p.stage]; }

function dropPoop(p) { if (p.poops.length < 12) p.poops.push({ x:ri(8, 88), age:0 }); }

function sitter(p) {
  if (p.hunger <= 1) p.hunger = Math.min(R.HU_MAX, p.hunger + 2);
  if (p.happy <= 3) p.happy = Math.min(R.HA_MAX, p.happy + 6);
  if (p.poops.length) { store.state.fuel = Math.min(R.FUEL_CAP, store.state.fuel + p.poops.length); p.poops = []; p.poopSick = false; }
  if (p.sick) cure(p, true);
  p.dirty = false;
}

function updateCalls(p, sitting) {
  const want = { hunger:!p.asleep && p.hunger === 0, happy:!p.asleep && p.happy === 0, sick:p.sick };
  for (const k in want) {
    if (!want[k]) { p.calls[k] = null; continue; }
    if (!p.calls[k]) { p.calls[k] = { min:0, counted:false }; emit("call"); }
    const c = p.calls[k];
    if (++c.min >= R.CALL_MIN && !c.counted && !sitting) { c.counted = true; mistake(p); if (p.stage === "dead") return; }
  }
}

/* ---------- growth ---------- */
function growth(p) {
  if (p.stage === "baby") return babyGrowth(p);
  if (p.stage === "kid") {
    if (p.field !== p.kidField) {
      if (++p.fieldStay >= R.KID_MOVE_MIN) {
        p.kidField = p.field; p.fieldCells = [p.field, p.field, p.field, p.field];
        p.foodCells = []; p.foodPts = {}; p.fieldStay = 0; p.name = nameOf(p); emit("kidmove");
      }
    } else p.fieldStay = 0;
    if (p.stageAge >= p.kidLen) evolveYoung();
    return;
  }
  if (p.stage === "young" && p.stageAge >= R.YOUNG_MIN) evolveAdult();
}

/* field cells: 1 per 15 min; 4 of a kind raises a prompt answered by zooming into Cell view.
   A missed prompt removes that field's cells; the second miss evolves anyway. Never 4 alike by 4 h → Bbmaru. */
function babyGrowth(p) {
  if (!p.asleep && ++p.fieldMin >= R.FIELD_CELL_MIN) {
    p.fieldMin = 0; p.fieldCells.push(p.field);
    if (p.fieldCells.length > 12) p.fieldCells.shift();
  }
  const four = ALL_FIELDS.find(f => p.fieldCells.filter(c => c === f).length >= 4);
  if (four && !p.prompt) { p.prompt = { field:four, min:0 }; emit("prompt"); }
  if (p.prompt && ++p.prompt.min > R.PROMPT_MIN) {
    p.promptMiss++;
    if (p.promptMiss >= 2) return evolveKid(p.prompt.field);
    const f = p.prompt.field;
    p.fieldCells = p.fieldCells.filter(c => c !== f); p.prompt = null;
  }
  if (p.stage === "baby" && p.age >= R.BABY_MAX) { if (p.prompt) evolveKid(p.prompt.field); else evolveBbmaru(); }
}

function hatch() {
  const p = store.state.pet;
  Object.assign(p, { stage:"baby", stageAge:0, age:0, hunger:2, happy:10, poopIn:10 });
  p.name = nameOf(p); discover(p); emit("hatch");
}

export function evolveKid(f) {
  const s = store.state, p = s.pet;
  Object.assign(p, { stage:"kid", kidField:f, stageAge:0, sickStage:0, prompt:null, kidLen:R.KID_MIN + ri(0, R.KID_EXTRA_MAX), fieldCells:[f, f, f, f] });
  p.name = nameOf(p); discover(p);
  s.goals.kid = true; checkLevel(); emit("evolve", p.name);
}

function evolveBbmaru() {
  const s = store.state, p = s.pet;
  Object.assign(p, { stage:"adult", special:true, stageAge:0, sickStage:0, prompt:null, sf:p.field, young:3, tier:3 });
  p.name = nameOf(p); discover(p);
  s.goals.kid = s.goals.young = s.goals.adult = true; checkLevel(); emit("evolve", p.name + " (đặc biệt)");
}

/* species = food type with the most cells of the kid's field; none or a tie → default species (index 3) */
function evolveYoung() {
  const s = store.state, p = s.pet, f = p.kidField;
  const cnt = [0, 0, 0];
  p.foodCells.filter(c => c.f === f).forEach(c => cnt[c.t]++);
  const best = Math.max(...cnt), tied = [0, 1, 2].filter(t => cnt[t] === best);
  p.young = best === 0 || tied.length > 1 ? 3 : tied[0];
  Object.assign(p, { sf:f, stage:"young", stageAge:0, sickStage:0, maxHu:0, maxHa:0 });
  p.name = nameOf(p); discover(p);
  s.goals.young = true; checkLevel(); emit("evolve", p.name);
}

/* tier: perfect = 0 mistakes + 5 hunger-max + 5 happy-max cells; then 0–1, 2–5, 6+ mistakes */
export const tierFor = p => (p.mist === 0 && p.maxHu >= 5 && p.maxHa >= 5 ? 0 : p.mist <= 1 ? 1 : p.mist <= 5 ? 2 : 3);

function evolveAdult() {
  const s = store.state, p = s.pet;
  Object.assign(p, { tier:tierFor(p), stage:"adult", stageAge:0, sickStage:0 });
  p.name = nameOf(p); discover(p);
  s.goals.adult = true; checkLevel(); emit("evolve", p.name);
}

/* ---------- calendar events (wiki "Monthly Events"): flagged here, presented by the UI ---------- */
function dailyEvents(d, h) {
  const s = store.state, E = s.events, date = dateOf(d), month = date.getMonth() + 1, day = date.getDate();
  if (s.weather.day !== d) s.weather = { day:d, w:random() < 0.15 ? "rain" : random() < 0.3 ? "cloud" : "sun" };
  if (month === 1 && day === 1 && E.newyear !== date.getFullYear()) { E.newyear = date.getFullYear(); addGP(1000); emit("gift", "Quà năm mới 1000G"); }
  if ([9, 19, 29].includes(day) && E.meteorDay !== d) { E.meteorDay = d; E.meteorAt = ri(10 * 60, 18 * 60); E.meteorDone = false; }
  if (E.meteorDay === d && !E.meteorDone && h * 60 >= E.meteorAt && h < 19) E.meteorPending = true;
  if (day === 13 && s.level >= 6 && E.stampedeDay !== d && h >= 17) { E.stampedeDay = d; E.stampedePending = true; }
  if ([7, 14, 21, 28].includes(day) && E.starDay !== d && h >= 20) { E.starDay = d; E.starPending = true; }
}

/* ---------- event outcomes (chosen by the player in the UI) ---------- */
export function resolveStampede(hide) {
  const p = store.state.pet;
  store.state.events.stampedePending = false;
  if (hide) { gain(p, "happy", 5); return "Trốn kịp! Bé vui hẳn lên"; }
  p.injured = 6; return "Ối! Bé bị thương, bấm A/B ở tầng Thú cưng để băng bó";
}
export function makeWish(kind) {
  const p = store.state.pet;
  store.state.events.starPending = false;
  if (kind === "gp") { const n = [100, 300, 500][ri(0, 2)]; addGP(n); return "Điều ước thành sự thật: +" + n + "G"; }
  if (kind === "happy") { if (!["egg", "dead"].includes(p.stage)) gain(p, "happy", 10); return "Bé cười tít mắt!"; }
  const pool = RAW.filter(x => fieldsOpen().includes(x.f)), r = pool[ri(0, pool.length - 1)];
  store.state.inv[r.id] = (store.state.inv[r.id] || 0) + 1;
  return "Nhận được " + r.n;
}
export function meteorOutcome(success) {
  const s = store.state, p = s.pet;
  if (success) { if (!["egg", "dead"].includes(p.stage)) gain(p, "happy", 5); return "Bảo vệ hành tinh thành công!"; }
  s.toysPlaced = [];
  if (!["egg", "dead"].includes(p.stage)) p.injured = 6;
  return "Thiên thạch rơi trúng! Đồ chơi bị cuốn mất, bé bị thương";
}
