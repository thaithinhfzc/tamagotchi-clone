// State transitions on the current pet that both the tick and player actions trigger.
import { store, today } from "./store.js";
import { emit } from "./bus.js";
import { HU_MAX, HA_MAX, SICK_CHANCE, SICK_DEATH_COUNT, STARVE_DEATH, STAR_SAVE_DAYS, FOOD_PTS_PER_CELL, MAX_FOOD_CELLS } from "./rules.js";
import { ri, random, clamp } from "../util.js";
import { mission } from "./progress.js";

const pet = () => store.state.pet;

/* meters; reaching the max during the Young stage earns a rice-ball / sun care cell */
export function gain(p, key, n) {
  const max = key === "hunger" ? HU_MAX : HA_MAX, before = p[key];
  p[key] = clamp(p[key] + n, 0, max);
  if (before < max && p[key] === max && p.stage === "young") { if (key === "hunger") p.maxHu++; else p.maxHa++; }
}

/* Kid stage only: every 5 points of one food type becomes a food cell (max 4, oldest dropped) */
export function addFoodPts(p, field, type, pts) {
  if (p.stage !== "kid") return;
  const k = field + type;
  p.foodPts[k] = (p.foodPts[k] || 0) + pts;
  while (p.foodPts[k] >= FOOD_PTS_PER_CELL) {
    p.foodPts[k] -= FOOD_PTS_PER_CELL;
    p.foodCells.push({ f:field, t:type });
    if (p.foodCells.length > MAX_FOOD_CELLS) p.foodCells.shift();
  }
}

/* mistakes count from the Kid stage; sickness roll only when the count isn't divisible by 2 or 3 */
export function mistake(p) {
  if (p.stage === "baby") return;
  p.mist++;
  if (p.mist % 2 !== 0 && p.mist % 3 !== 0) {
    if (p.vitamin) { p.vitamin = false; return; }
    if (random() < SICK_CHANCE) getSick();
  }
}

export function getSick() {
  const p = pet();
  if (p.sick || ["dead", "egg"].includes(p.stage)) return;
  p.sick = true; p.sickMin = 0; p.sickStage++; p.viruses = ri(3, 5);
  if (p.sickStage >= SICK_DEATH_COUNT) return deathCheck("ốm 5 lần");
  emit("sick");
}

export function cure(p, quiet = false) {
  p.sick = false; p.sickMin = 0; p.calls.sick = null; p.viruses = 0;
  if (!quiet) emit("cured");
}

/* a smiling Tama Star rescues once; otherwise the Grim Gotchi appears and can be shooed in Tama view */
export function deathCheck(cause) {
  const s = store.state, p = s.pet;
  if (p.grim) return;
  const star = s.memories.find(m => m.smile && !m.used);
  if (star) {
    star.used = true; p.starveMin = 0;
    if (cause === "ốm 5 lần") p.sickStage = SICK_DEATH_COUNT - 1;
    emit("saved", star.name); return;
  }
  p.grim = { cause, min:0 };
  emit("grim");
}

export function shooGrim() {
  const p = pet();
  if (!p.grim) return false;
  const c = p.grim.cause; p.grim = null;
  if (c === "đói lả") p.starveMin = Math.floor(STARVE_DEATH / 2); else p.sickStage = SICK_DEATH_COUNT - 1;
  return true;
}

export function die(cause) {
  const s = store.state, p = s.pet, days = Math.floor(p.age / 1440);
  s.memories.push({ name:p.name, gen:p.gen, field:p.field, cause, days, smile:days >= STAR_SAVE_DAYS, used:false, day:today() });
  Object.assign(p, { stage:"dead", cause, asleep:false, calls:{ hunger:null, happy:null, sick:null }, sick:false, grim:null });
  emit("die", cause);
}

export function sleepNow(manual) {
  const p = pet(); p.asleep = true; p.nap = 0;
  if (manual) mission("sleep"); else emit("sleep");
}
export function wakeNow(manual) {
  const p = pet(); p.asleep = false;
  if (manual) mission("wake"); else emit("wake");
}
