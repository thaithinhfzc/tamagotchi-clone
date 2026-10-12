// Lifecycle and rule tests against the pure core (no DOM).
import { test } from "node:test";
import assert from "node:assert/strict";
import { fresh, advance, perfectCare } from "./helpers.js";
import { store } from "../src/core/store.js";
import { mistake, addFoodPts } from "../src/core/pet.js";
import { tierFor } from "../src/core/sim.js";
import { setRandom } from "../src/util.js";
import * as A from "../src/core/actions.js";
import { ADULTS } from "../src/data/fields.js";

const untilAdultOrDead = p => !(p.stage === "adult" || p.stage === "dead");

test("perfect care on seafood → Glide species, perfect tier", () => {
  fresh("water");
  advance(6 * 1440, p => { perfectCare(p, "seafood"); return untilAdultOrDead(p); });
  const p = store.state.pet;
  assert.equal(p.stage, "adult");
  assert.equal(p.young, 0);
  assert.equal(p.tier, 0);
  assert.equal(p.name, ADULTS.water[0][0][0]);
});

test("pellets only → default species (index 3)", () => {
  fresh("land");
  advance(6 * 1440, p => { perfectCare(p, null); return untilAdultOrDead(p); });
  assert.equal(store.state.pet.young, 3);
});

test("total neglect → starves after the Grim Gotchi window", () => {
  fresh("sky");
  advance(6 * 1440, p => p.stage !== "dead");
  assert.equal(store.state.pet.stage, "dead");
  assert.equal(store.state.pet.cause, "đói lả");
});

test("switching fields before 4 alike cells → Bbmaru-style special adult", () => {
  const s = fresh("water");
  s.level = 5;
  advance(300, p => {
    if (p.stage === "egg") return;
    if (p.stage !== "baby") return false;
    if (p.fieldMin === 14 && p.fieldCells.filter(c => c === p.field).length === 3) A.setField(p.field === "water" ? "sky" : "water");
    if (!p.asleep) { p.hunger = 5; p.happy = 20; }
    while (p.sick) A.tapVirus();
    p.poops = []; p.poopSick = false;
  });
  assert.equal(store.state.pet.special, true);
});

test("planet: level 3 after first adult, level 4 after New Egg, adult counted", () => {
  fresh("water");
  advance(6 * 1440, p => { perfectCare(p, "seafood"); return untilAdultOrDead(p); });
  assert.equal(store.state.level, 3);
  A.newTama();
  assert.equal(store.state.level, 4);
  assert.equal(store.state.adultsCounted, 1);
  assert.equal(store.state.residents.length, 1);
});

test("sickness roll only on mistakes not divisible by 2 or 3", () => {
  fresh("land");
  setRandom(() => 0);   // every roll succeeds
  const p = store.state.pet;
  p.stage = "kid";
  const sickAt = [];
  for (let i = 1; i <= 8; i++) { p.sick = false; mistake(p); if (p.sick) sickAt.push(i); }
  assert.deepEqual(sickAt, [1, 5, 7]);
});

test("food cells: 5 points per cell, at most 4, oldest dropped", () => {
  fresh("land");
  const p = store.state.pet;
  p.stage = "kid";
  addFoodPts(p, "land", 0, 10);   // 2 meat cells
  addFoodPts(p, "land", 1, 15);   // 3 carrot cells → oldest meat dropped
  assert.deepEqual(p.foodCells.map(c => c.t), [0, 1, 1, 1]);
});

test("care tiers follow the wiki thresholds", () => {
  const t = (mist, hu = 5, ha = 5) => tierFor({ mist, maxHu:hu, maxHa:ha });
  assert.equal(t(0), 0);
  assert.equal(t(0, 4, 5), 1);
  assert.equal(t(1), 1);
  assert.equal(t(2), 2);
  assert.equal(t(5), 2);
  assert.equal(t(6), 3);
});

test("six dark poops make the pet sick once until cleaned", () => {
  fresh("water");
  advance(70, p => { if (p.stage === "baby") return false; });
  const p = store.state.pet;
  while (p.sick) A.tapVirus();
  p.poops = Array.from({ length:6 }, () => ({ x:10, age:60 }));
  p.poopIn = 1e9; p.hunger = 5; p.happy = 20;
  const before = p.sickStage;
  advance(1);
  assert.equal(p.sick, true);
  while (p.sick) A.tapVirus();
  advance(5);
  assert.equal(p.sickStage, before + 1);
});

test("predator × prey never breeds, even with Love-Love Ice Cream", () => {
  fresh("land");
  const s = store.state, p = s.pet;
  Object.assign(p, { stage:"adult", sf:"land", young:0, tier:2, love:true, hunger:5, happy:20 });   // predator
  s.level = 3;
  const prey = { stage:"adult", sf:"land", young:0, tier:3, special:false, genes:{ pure:true } };
  const res = A.tryBreed(prey);
  assert.equal(res.anim.ok, false);
});

test("egg hunt yields ≤ 9 raw foods of the current field and spends the party", () => {
  const s = fresh("land");
  s.level = 6;
  advance(70);
  const res = A.startHunt("volcano");
  const n = Object.values(s.inv).reduce((a, b) => a + b, 0);
  assert.ok(n <= 9);
  assert.ok(Object.keys(s.inv).every(k => ["bigmeat", "smallmeat", "mealbug", "mealworm"].includes(k)));
  assert.equal(A.startHunt("volcano").msg !== undefined || res.anim, true);
});
