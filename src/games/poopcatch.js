// Lab · Catching Poop: move Shirotama between 4 lanes to sweep scrolling poop; a vacuum pulls poop toward you for a while.
import { W, rect, drawAt } from "../render/canvas.js";
import { iconSprite, shiroSprite } from "../render/sprites.js";
import { bgScene } from "../render/scenes.js";
import { ri, rnd, clamp, random } from "../util.js";
import { secondsLeft } from "./common.js";

const laneY = l => 36 + l * 13;

export default {
  id:"poopcatch", name:"Hứng phân", kind:"lab", unlock:4,
  setup(G, t) { Object.assign(G, { y:1, items:[], next:t + 300, dur:30000, vacUntil:0 }); },
  input(G, a) {
    if (a === "L" || a === "A") G.y = clamp(G.y - 1, 0, 3);
    if (a === "R" || a === "B") G.y = clamp(G.y + 1, 0, 3);
  },
  update(G, t, dt) {
    if (t >= G.next) { G.items.push({ x:100, lane:ri(0, 3), kind:random() < 0.08 ? "vac" : "poop" }); G.next = t + rnd(380, 700) / (0.7 + G.diff * 0.3); }
    let ev;
    for (const it of G.items) {
      const sp = (28 + G.diff * 6) * dt;
      it.x -= sp;
      if (t < G.vacUntil && it.kind === "poop") { it.lane += Math.sign(G.y - it.lane) * Math.min(Math.abs(G.y - it.lane), dt * 3); it.x -= sp; }
      if (!it.done && it.x < 22 && it.x > 8 && Math.round(it.lane) === G.y) {
        it.done = true;
        if (it.kind === "vac") G.vacUntil = t + 2500; else G.score++;
        ev = "good";
      }
    }
    G.items = G.items.filter(i => !i.done && i.x > -6);
    if (t - G.t0 >= G.dur) return { stars:G.score >= 24 ? 3 : G.score >= 16 ? 2 : G.score >= 8 ? 1 : 0 };
    return ev;
  },
  draw(G, t) {
    bgScene(G.pet.field, t, true);
    for (let i = 0; i < 4; i++) rect(0, 28 + i * 13, W, 1, "rgba(255,255,255,.4)");
    for (const it of G.items) drawAt(iconSprite(it.kind === "vac" ? "vac" : "poop"), it.x, laneY(it.lane), it.kind === "vac" ? 2 : 1);
    drawAt(shiroSprite(), 14, laneY(G.y) + 1, 1);
    if (t < G.vacUntil) rect(0, 0, W, 2, "#5ab0f0");
  },
  hud(G, t) { return { BL:"◀ ▶ lên xuống", BR:secondsLeft(G, t) + " · " + G.score }; },
};
