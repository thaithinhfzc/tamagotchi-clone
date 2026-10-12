// Test helpers: deterministic RNG, fresh state at 10:00, and a scripted caretaker.
import { setRandom, mulberry32 } from "../src/util.js";
import { store } from "../src/core/store.js";
import { newGame } from "../src/core/state.js";
import { simMinute, evolveKid } from "../src/core/sim.js";
import * as A from "../src/core/actions.js";

export function fresh(shell = "water", seed = 1) {
  setRandom(mulberry32(seed));
  const s = newGame(shell, new Date(2026, 0, 3, 10, 0));
  return s;
}

export function advance(minutes, each) {
  for (let m = 0; m < minutes; m++) {
    simMinute();
    if (each && each(store.state.pet, m) === false) return m;
  }
  return minutes;
}

/* keep meters full via the real actions, feed `kidFood` during the Kid stage, answer prompts, cure, clean */
export function perfectCare(p, kidFood) {
  if (["egg", "dead"].includes(p.stage)) return;
  if (p.prompt) evolveKid(p.prompt.field);
  while (p.sick) A.tapVirus();
  if (p.poops.length) { p.poops = []; p.poopSick = false; }
  if (p.asleep) return;
  for (let i = 0; i < 8 && p.hunger < 5; i++) {
    if (p.stage === "kid" && kidFood) store.state.inv[kidFood] = 9;
    A.feed(p.stage === "baby" ? "milk" : p.stage === "kid" && kidFood ? kidFood : "pellet");
  }
  if (p.happy < 15) for (let i = 0; i < 25 && p.happy < 20; i++) A.feedSnack("jelly");
}
