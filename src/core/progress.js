// Planet level, missions, Gotchi Points, discovery log.
import { store } from "./store.js";
import { emit } from "./bus.js";
import { MISSIONS } from "../data/progress.js";
import { MISSION_REWARD } from "./rules.js";
import { nameOf } from "./creatures.js";

export function addGP(n) {
  const s = store.state;
  s.gp += n; s.gpTotal += n;
  mission("gp", n);
}

export function mission(key, n = 1) {
  const s = store.state;
  const def = MISSIONS.find(m => m[0] === key);
  if (!def) return;
  s.mission[key] = (s.mission[key] || 0) + n;
  if (!s.missionDone[key] && s.mission[key] >= def[2]) {
    s.missionDone[key] = true; s.gp += MISSION_REWARD; emit("mission", def[1]);
  }
}

export function discover(o) {
  const s = store.state, n = nameOf(o), f = o.sf || o.field;
  s.discovered[f] = s.discovered[f] || [];
  if (s.discovered[f].includes(n)) return;
  s.discovered[f].push(n);
  if (o.stage === "adult" && !o.special) mission("kinds_" + f);
}

/* goal for going from `lv` to `lv + 1`; levels 5→10 count adults that left via breeding or New Egg */
export function goalMet(lv) {
  const s = store.state, g = s.goals;
  return [g.kid, g.young, g.adult, g.newgen, g.switched][lv] ?? s.adultsCounted >= lv - 3;
}

export function checkLevel() {
  const s = store.state;
  while (s.level < 10 && goalMet(s.level)) {
    s.level++;
    if (s.level === 10) s.credits = true;
    emit("level", s.level);
  }
}
