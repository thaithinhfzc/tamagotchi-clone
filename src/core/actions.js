// Player actions. Each returns a plain Result the UI presents (ui/feedback.js perform()):
//   { msg?, zoom?, anim?:{ type, dur, ...data }, then?:() => Result, list?:{ title, lines } }
// State changes that should only appear after an animation go in `then`.
import { store, today, hourNow, fieldsOpen, hunterCount, saleFood, saleToy, unlocked } from "./store.js";
import * as R from "./rules.js";
import { FIELDS } from "../data/fields.js";
import { RAW, ITEM, SNACK, TOY, DECO, MEAL_HUNGER, MEAL_PTS, COOK_COUNT } from "../data/items.js";
import { ri, pick, random, clamp, hash } from "../util.js";
import { newPet, nameOf, genesOf, mixHue, isPredPrey, alive } from "./creatures.js";
import { gain, addFoodPts, cure, shooGrim, sleepNow, wakeNow } from "./pet.js";
import { addGP, mission, checkLevel } from "./progress.js";

const S = () => store.state;
const P = () => store.state.pet;
const invAdd = (k, n = 1) => { S().inv[k] = (S().inv[k] || 0) + n; };
export const invHas = k => (S().inv[k] || 0) > 0;

/* reason the pet can't act right now, or null */
export function blocked() {
  const p = P();
  if (!alive(p)) return p.stage === "egg" ? "Trứng đang ấp…" : "…";
  if (p.asleep) return "Suỵt… bé đang ngủ";
  if (p.injured) return "Bé đang bị thương, bấm A/B để băng bó";
  return null;
}

/* ---------- Tama view ---------- */
export function feed(id) {
  const p = P(), why = blocked();
  if (why) return { msg:why };
  if (p.hunger >= R.HU_MAX) return { msg:"No căng rồi!", anim:{ type:"no", dur:900 } };
  let icon = id, msg;
  if (id === "milk" || id === "pellet") {
    gain(p, "hunger", 1);
    if (id === "pellet" && p.stage === "adult") { p.happy = Math.max(0, p.happy - 1); msg = "Bé không thích hạt lắm…"; }   // adults dislike pellets (wiki)
  } else {
    if (!invHas(id)) return {};
    const it = ITEM[id]; S().inv[id]--;
    const meal = it.kind === "meal";
    gain(p, "hunger", meal ? MEAL_HUNGER : 1);
    addFoodPts(p, it.f, it.t, meal ? MEAL_PTS : it.pts);
    icon = it.ic;
  }
  mission("food");
  return { msg, anim:{ type:"eat", dur:1500, icon } };
}

export function feedSnack(id) {
  const p = P(), why = blocked();
  if (why) return { msg:why };
  const s = SNACK[id];
  if (id !== "jelly") { if (!invHas(id)) return {}; S().inv[id]--; }
  gain(p, "happy", s.ha); mission("snack");
  const msg = applySnack(p, s.fx === "random" ? pick(["slow", "love", "vitamin"]) : s.fx, s);
  return { msg, anim:{ type:"eat", dur:1500, icon:s.ic } };
}

function applySnack(p, fx, s) {
  const c = S().clock;
  switch (fx) {
    case "love": p.love = true; return "Bé đang say nắng… mai mối chắc chắn thành!";
    case "slow": gain(p, "happy", R.HA_MAX); p.slowUntil = c + R.SLOW_HAPPY_MIN; return "Bé vui lâu hơn hẳn";
    case "vitamin": p.vitamin = true; return "Có vitamin, chặn được một lần ốm";
    case "bigpoop": p.poops.push({ x:48, age:0, big:true }); S().fuel = Math.min(R.FUEL_CAP, S().fuel + 8); return "Ui… một bãi to tướng! Bình nhiên liệu đầy thêm";
    case "nap": p.asleep = true; p.nap = 30; return undefined;
    case "dance": p.danceUntil = c + 30; return undefined;
    case "sparkle": p.sparkleUntil = c + 120; return undefined;
    case "vivid": p.genes.dye = { hue:ri(0, 359), sat:90, l:62 }; return "Bé đổi màu rực rỡ!";
    case "pastel": p.genes.dye = { hue:ri(0, 359), sat:70, l:84 }; return "Bé đổi màu pastel!";
    case "dye": p.genes.dye = { hue:s.hue, sat:75, l:s.l }; return "Bé đổi màu!";
    default: return undefined;
  }
}

export function bathe() {
  const p = P(), why = blocked();
  if (why) return { msg:why };
  if (!p.dirty) return { msg:"Bé đang sạch thơm rồi" };
  return { anim:{ type:"bath", dur:1200 }, then:() => { p.dirty = false; p.dirtyIn = ri(...R.DIRTY_EVERY); mission("bath"); return { msg:"Sạch bong!" }; } };
}

export function canSleepNow() { const p = P(), h = hourNow(); return p.stage !== "baby" && !p.asleep && h >= R.SLEEP_FROM && h < R.SLEEP_AUTO; }
export function canWakeNow() { const p = P(), h = hourNow(); return p.asleep && !p.nap && h >= R.WAKE_FROM && h < R.WAKE_AUTO; }
export function putToSleep() { sleepNow(true); return { msg:"Chúc ngủ ngon" }; }
export function wakeUp() { wakeNow(true); return { msg:"Dậy thôi nào!" }; }

export function tendInjury() {
  const p = P(); p.injured--;
  if (!p.injured) { gain(p, "happy", 5); return { msg:"Băng bó xong! Bé nhẹ nhõm hẳn" }; }
  return {};
}
export function tapVirus() {
  const p = P(); p.viruses--;
  if (p.viruses <= 0) { cure(p); return { msg:"Khỏi bệnh rồi!" }; }
  return {};
}
export function scareGrim() { return shooGrim() ? { msg:"Đuổi được thần chết rồi! Chăm bé ngay" } : {}; }
export function newEggAfterDeath() { S().pet = newPet(P().field); return { msg:"Một quả trứng mới…" }; }

/* ---------- Field view ---------- */
export function cleanPoop() {
  const p = P();
  if (!p.poops.length) return { msg:"Không có bãi nào" };
  const n = p.poops.reduce((a, x) => a + (x.big ? 3 : 1), 0);
  return { zoom:1, anim:{ type:"flush", dur:1100 }, then:() => {
    p.poops = []; p.poopSick = false; S().fuel = Math.min(R.FUEL_CAP, S().fuel + n);
    mission("cleanpoop"); mission("poops", n);
    return { msg:"Gom " + n + " bãi vào bình nhiên liệu (" + Math.min(S().fuel, R.FUEL_FULL) + "/" + R.FUEL_FULL + ")" };
  } };
}

/* pressing any button while the pet wiggles: Shirotama catches it straight into the fuel tank */
export function catchPoop() {
  const p = P();
  if (!(p.wiggle > 0)) return null;
  p.wiggle = 0; S().fuel = Math.min(R.FUEL_CAP, S().fuel + 1); mission("catchpoop"); mission("poops");
  return { msg:"Bé Trắng hứng kịp! +1 nhiên liệu" };
}

export function setField(f) {
  const s = S(), p = P();
  if (!fieldsOpen().includes(f)) return { msg:"Vùng này chưa mở" };
  if (f === p.field) return { msg:"Bé đang ở " + FIELDS[f].name };
  if (!["egg", "baby", "kid"].includes(p.stage)) return { msg:"Thiếu niên và trưởng thành không chuyển vùng được" };
  p.field = f; p.fieldMin = 0; p.fieldStay = 0;
  if (p.stage === "egg") p.sf = f;
  if (!s.goals.switched) { s.goals.switched = true; checkLevel(); }
  return { msg:"Chuyển tới " + FIELDS[f].name };
}

export function toggleToy(id) {
  const s = S(), i = s.toysPlaced.indexOf(id);
  if (i >= 0) { s.toysPlaced.splice(i, 1); return { msg:"Đã cất " + TOY[id].n }; }
  if (s.toysPlaced.length >= R.MAX_TOYS) return { msg:"Vùng chỉ đặt được " + R.MAX_TOYS + " món" };
  s.toysPlaced.push(id); return { msg:"Đã đặt " + TOY[id].n };
}

/* Egg Hunt (wiki): party ≤3, each member once per day, before 19:00, ≤9 eggs; 10% for 9 with the pet at full happiness */
export function huntParty() {
  const s = S(), p = s.pet, d = today(), party = [];
  if (["kid", "young", "adult"].includes(p.stage) && p.lastHunt !== d && !p.asleep && !p.injured) party.push(p);
  for (const r of s.residents) if (party.length < 3 && r.field === p.field && r.lastHunt !== d) party.push(r);
  if (s.hunterHunts.day !== d) s.hunterHunts = { day:d, used:0 };
  let hunters = 0;
  while (party.length + hunters < 3 && s.hunterHunts.used + hunters < hunterCount()) hunters++;
  return { party, hunters };
}

export function eggCount(withPet, happy, partySize) {
  if (withPet && happy === 0) return random() < 0.5 ? { eggs:0, ghost:true } : { eggs:ri(0, 2) };
  if (withPet && happy === R.HA_MAX && random() < R.PERFECT_HUNT_CHANCE) return { eggs:R.MAX_EGGS, perfect:true };
  if (withPet) return { eggs:clamp(3 + Math.round(happy / R.HA_MAX * 2) + ri(0, 2), 0, R.MAX_EGGS - 1) };   // ƯL distribution
  return { eggs:ri(1, 4) + Math.min(2, partySize) };
}

export function startHunt(loc) {
  const s = S(), p = s.pet;
  if (!unlocked("hunt")) return { msg:"Cấp 1 mới săn trứng được" };
  if (hourNow() >= R.HUNT_UNTIL || hourNow() < R.WAKE_FROM) return { msg:"Muộn rồi, mai đi săn tiếp" };
  const { party, hunters } = huntParty();
  if (!party.length && !hunters) return { msg:"Hôm nay cả đội đi săn hết rồi" };
  const d = today();
  party.forEach(o => { o.lastHunt = d; });
  s.hunterHunts.used += hunters;
  const withPet = party.includes(p);
  const { eggs, ghost = false, perfect = false } = eggCount(withPet, p.happy, party.length);
  const pool = RAW.filter(r => r.f === p.field && r.loc.includes(loc === "volcano" ? "v" : "s"));
  const loot = [];
  for (let i = 0; i < eggs; i++) {
    const r = pick(pool); invAdd(r.id); loot.push(r.id);
    if (!s.foodSeen[r.id]) { s.foodSeen[r.id] = true; mission("foodkinds"); }
  }
  if (perfect) mission("hunt9");
  return { zoom:1, anim:{ type:"hunt", dur:3800, party, hunters, eggs, ghost, loc }, then:() => {
    if (ghost) return { msg:"Gặp ma! Bé buồn rũ nên cả đội chạy về" };
    const sum = {};
    loot.forEach(k => { sum[k] = (sum[k] || 0) + 1; });
    return { list:{ title:(perfect ? "TUYỆT ĐỐI! " : "") + eggs + " TRỨNG NỞ RA", lines:eggs ? Object.keys(sum).map(k => ITEM[k].n + " ×" + sum[k]) : ["Không nhặt được gì…"] } };
  } };
}

/* ---------- Space view ---------- */
export function toggleDeco(id) {
  const s = S(), i = s.decoPlaced.indexOf(id);
  if (i >= 0) { s.decoPlaced.splice(i, 1); return { msg:"Đã cất " + DECO[id].n }; }
  if (s.decoPlaced.length >= R.MAX_DECO) return { msg:"Hành tinh chỉ đeo được " + R.MAX_DECO + " món" };
  s.decoPlaced.push(id); return { msg:"Đã đặt " + DECO[id].n };
}

export function travel(pl) {
  const s = S(), p = s.pet;
  if (s.fuel < R.FUEL_FULL) return { msg:"Bình nhiên liệu mới " + s.fuel + "/" + R.FUEL_FULL };
  const why = blocked(); if (why) return { msg:why };
  s.fuel -= R.FUEL_FULL;
  s.visits[pl.id] = (s.visits[pl.id] || 0) + 1;
  const gift = pl.gifts.map(g => g[0]).find(id => !s.decoOwned.includes(id)) || null;
  if (gift) s.decoOwned.push(gift); else addGP(500);
  const guests = s.residents.filter(r => r.field === p.field).slice(0, 2);
  mission("travel");
  return { zoom:0, anim:{ type:"travel", dur:5600, pl, gift, guests },
    then:() => ({ msg:gift ? "Nhận được " + DECO[gift].n + "! Đặt lên hành tinh ở Trang trí" : "Cư dân tặng 500G" }) };
}

/* ---------- Lab: help ---------- */
function addResident(p) {
  const s = S();
  const r = { name:p.name, gen:p.gen, field:p.sf || p.field, sf:p.sf || p.field, young:p.young, tier:p.tier, special:p.special,
    kidField:p.kidField, genes:p.genes, stage:p.stage, lastHunt:-1 };
  const same = s.residents.filter(x => x.field === r.field);
  let msg;
  if (same.length >= R.MAX_RESIDENTS) { const old = same[0]; s.residents.splice(s.residents.indexOf(old), 1); msg = old.name + " đã rời vùng"; }
  s.residents.push(r);
  return msg;
}

export function newTama() {
  const s = S(), p = s.pet;
  if (!unlocked("newEgg")) return { msg:"Cấp 3 mới mở chức năng này" };
  if (!alive(p)) return {};
  if (p.stage === "adult") s.adultsCounted++;
  if (p.stage !== "baby") addResident(p);
  s.pet = newPet(p.field);
  s.goals.newgen = true; checkLevel();
  return { msg:p.name + " ra sống ở vùng đất. Có trứng mới!" };
}

export function hireSitter() {
  const s = S();
  if (hourNow() >= R.SITTER_UNTIL_H) return { msg:"Bé Trắng trông trẻ chỉ làm tới 19:00" };
  if (s.gp < R.SITTER_COST) return { msg:"Cần " + R.SITTER_COST + "G" };
  s.gp -= R.SITTER_COST; s.sitterUntil = today() * 1440 + R.SITTER_UNTIL_H * 60;
  return { msg:"Bé Trắng sẽ trông bé tới 19:00" };
}

export const breedsLeft = () => (S().breedsToday.day === today() ? R.BREEDS_PER_DAY - S().breedsToday.n : R.BREEDS_PER_DAY);

/* four pure partners from the pet's field (cross-field needs a second device) */
export function breedCheck() {
  const p = P();
  if (!unlocked("breed")) return "Cấp 3 mới mai mối được";
  if (p.stage !== "adult") return "Phải trưởng thành mới mai mối được";
  if (p.special) return "Bé Tròn Bự không mai mối được. Dùng Trứng mới";
  const why = blocked(); if (why) return why;
  if (breedsLeft() <= 0) return "Hôm nay đã thử " + R.BREEDS_PER_DAY + " lần rồi";
  return null;
}
export function makePartners() {
  const f = P().sf;
  return Array.from({ length:4 }, () => { const o = { stage:"adult", sf:f, young:ri(0, 3), tier:ri(0, 3), special:false, genes:{ pure:true } }; o.name = nameOf(o); return o; });
}
const compat = (a, b) => ((hash(nameOf(a) + "|" + nameOf(b)) % 100) / 100) * 0.25;   // hidden species values (ƯL)
export const breedChance = (p, q) => 0.15 + (p.hunger / R.HU_MAX) * 0.25 + (p.happy / R.HA_MAX) * 0.3 + compat(p, q);   // ƯL

export function tryBreed(q) {
  const s = S(), p = s.pet;
  if (s.breedsToday.day !== today()) s.breedsToday = { day:today(), n:0 };
  s.breedsToday.n++;
  const pp = isPredPrey(p, q);
  const ok = pp ? false : p.love ? true : random() < breedChance(p, q);
  if (!pp) p.love = false;
  return { zoom:1, anim:{ type:"mate", dur:3600, partner:q, ok }, then:() => (ok ? makeChild(q)
    : { msg:pp ? "Hai bé là thú săn và con mồi, không thể thành đôi!" : "Không hợp nhau… thử lại sau (" + breedsLeft() + " lần nữa)" }) };
}

/* child inherits one parent's eyes and a blend of body colours; its body depends on how it is raised */
function makeChild(q) {
  const s = S(), p = s.pet, g = genesOf(p), h = genesOf(q);
  const genes = { pure:false, hue:(mixHue(g.hue, h.hue) + ri(-20, 20) + 360) % 360,
    sat:clamp(Math.round((g.sat + h.sat) / 2 + ri(-8, 8)), 35, 92), l:clamp(Math.round((g.l + h.l) / 2), 60, 86),
    eye:random() < 0.5 ? g.eye : h.eye };
  s.adultsCounted++; mission("breed");
  const left = addResident(p);
  s.pet = newPet(p.field, p.gen + 1, genes);
  s.goals.newgen = true; checkLevel();
  return { msg:(left ? left + " · " : "") + "Thành đôi! Trứng đời thứ " + s.pet.gen + " ra đời" };
}

/* ---------- Lab: shop ---------- */
export function price(base, kind) { return (kind === "food" && saleFood()) || (kind === "toy" && saleToy()) ? Math.round(base / 2) : base; }

export function buy(label, cost, give) {
  const s = S();
  if (s.gp < cost) return { msg:"Thiếu xu (cần " + cost + "G)" };
  s.gp -= cost; give(s);
  return { msg:"Đã mua " + label };
}
export const buyMeal = m => buy(m.n, price(m.p, "food"), () => invAdd(m.id));
export const buySnack = sn => buy(sn.n, price(sn.p, "food"), () => invAdd(sn.id));
export const buyToy = t => buy(t.n, price(t.p, "toy"), s => s.toysOwned.push(t.id));
export const buyDeco = d => buy(d.n, price(d.p, "toy"), s => s.decoOwned.push(d.id));

export function cook(m) {
  const s = S();
  if (!unlocked("cook")) return { msg:"Cấp 5 mới nấu ăn được" };
  if ((s.inv[m.from] || 0) < COOK_COUNT) return { msg:"Cần " + COOK_COUNT + " " + ITEM[m.from].n };
  s.inv[m.from] -= COOK_COUNT; invAdd(m.id);
  if (!s.mealsMade[m.id]) { s.mealsMade[m.id] = true; mission("mealkinds"); }
  return { msg:"Bé Trắng đầu bếp nấu xong " + m.n + "!" };
}

export const sellValue = k => Math.max(20, Math.round((ITEM[k] ? (ITEM[k].kind === "meal" ? ITEM[k].p : 100) : SNACK[k] ? SNACK[k].p : 0) / 4));   // ƯL
export function sell(k) {
  const s = S(), val = sellValue(k);
  s.inv[k]--; addGP(val);
  return { msg:"Bán được " + val + "G" };
}

/* ---------- mini game rewards ---------- */
export function rewardPlay(add, perfect) {
  gain(P(), "happy", add);
  if (perfect) mission("play");
}
export function rewardLab(stars, diff) {
  const pts = R.STAR_PAY[stars] * diff;
  if (pts) addGP(pts);
  if (stars === 3) mission("lab3");
  return pts;
}

export const visitorsActive = planets => planets.filter(pl => pl.gifts.every(g => S().decoPlaced.includes(g[0])));
