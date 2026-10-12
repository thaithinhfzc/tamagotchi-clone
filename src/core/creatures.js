// Creature identity: names, species stats, genes. A "creature" is the current pet, a field resident,
// a breeding partner or a travel NPC — all share {stage, field, sf, kidField, young, tier, special, genes}.
import { FIELDS, ADULTS, BBMARU, EYES, ALL_FIELDS } from "../data/fields.js";
import { DIRTY_EVERY } from "./rules.js";
import { hash, ri } from "../util.js";

export const adultRow = o => (o.special ? BBMARU : ADULTS[o.sf][o.young][o.tier]);
export const adultRates = o => { const r = adultRow(o); return { hu:r.hu ?? r[1], ha:r.ha ?? r[2] }; };
export const ppOf = o => (o.special ? 0 : adultRow(o)[3]);
export const isPredPrey = (a, b) => { const x = ppOf(a), y = ppOf(b); return (x === 1 && y === 2) || (x === 2 && y === 1); };
export const alive = o => !["egg", "dead"].includes(o.stage);

/* colours/eyes of a pure-bred creature are fixed per character */
export function pureGenes(o) {
  if (o.stage === "adult") {
    const h = hash(o.special ? "bbmaru" : adultRow(o)[0]);
    return { hue:o.special ? 52 : h % 360, sat:55 + (h >>> 9) % 30, l:72, eye:EYES[(h >>> 13) % 4] };
  }
  if (o.stage === "young") return { hue:FIELDS[o.sf].hue + o.young * 40, sat:62, l:74, eye:"tall" };
  if (o.stage === "kid") return { hue:FIELDS[o.kidField || o.field].hue, sat:60, l:76, eye:"tall" };
  return { hue:52, sat:70, l:80, eye:"tall" };
}
/* bred creatures carry inherited genes; juices add a dye override on top */
export function genesOf(o) {
  const base = o.genes.pure ? pureGenes(o) : o.genes;
  return o.genes.dye ? { ...base, ...o.genes.dye } : base;
}

export function nameOf(o) {
  switch (o.stage) {
    case "egg": return "Trứng";
    case "baby": return "Bé Tròn";
    case "kid": return FIELDS[o.kidField || o.field].kid;
    case "young": return "Nhóc " + FIELDS[o.sf].species[o.young];
    case "adult": return o.special ? BBMARU.n : adultRow(o)[0];
    default: return o.name || "?";
  }
}

export function npcCreature(name) {
  const h = hash(name);
  return { stage:"adult", sf:ALL_FIELDS[h % 3], young:(h >>> 3) % 4, tier:(h >>> 6) % 4, special:false, name,
    genes:{ hue:(h >>> 9) % 360, sat:60 + (h % 25), l:72, eye:EYES[(h >>> 12) % 4] } };
}

export function mixHue(a, b) { const d = ((b - a + 540) % 360) - 180; return (a + d / 2 + 360) % 360; }

/* every per-pet counter must be initialised here (an undefined counter + 1 is NaN and silently stops a timer) */
export function newPet(field, gen = 1, genes = null) {
  return {
    field, sf:field, kidField:null, gen, stage:"egg", name:"Trứng", age:0, stageAge:0, cause:null,
    hunger:0, happy:0, huT:0, haT:0, starveMin:0,
    poops:[], wiggle:0, poopIn:10, poopSick:false, dirty:false, dirtyIn:ri(...DIRTY_EVERY),
    sick:false, sickMin:0, sickStage:0, viruses:0, mist:0, calls:{ hunger:null, happy:null, sick:null },
    fieldCells:[], fieldMin:0, prompt:null, promptMiss:0, sickedBaby:false, napped:false, nap:0,
    foodPts:{}, foodCells:[], fieldStay:0, kidLen:0, maxHu:0, maxHa:0, young:null, tier:null, special:false,
    vitamin:false, love:false, slowUntil:0, sparkleUntil:0, danceUntil:0, injured:0, grim:null, asleep:false, lastHunt:-1,
    genes:genes || { pure:true },
  };
}
