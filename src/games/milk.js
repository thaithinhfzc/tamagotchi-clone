// Lab · Feeding Baby Milk!: move the bottle (A / dial), B feeds a crying baby. Won after feeding 10 (wiki).
import { rect, drawAt, OUT } from "../render/canvas.js";
import { petSprite, iconSprite } from "../render/sprites.js";
import { pick, rnd } from "../util.js";
import { labBackdrop, secondsLeft } from "./common.js";

const BABY = { hue:52, sat:70, l:80, eye:"tall" };
const cribX = i => 12 + i * 24;

export default {
  id:"milk", name:"Cho bé bú", kind:"lab", unlock:1,
  setup(G, t) { Object.assign(G, { sel:1, cribs:[{}, {}, {}, {}], fed:0, miss:0, next:t + 500, dur:30000 }); },
  input(G, a, t) {
    if (a === "A" || a === "R") G.sel = (G.sel + 1) % 4;
    if (a === "L") G.sel = (G.sel + 3) % 4;
    if (a !== "B") return;
    const c = G.cribs[G.sel];
    if (c.cry) { c.cry = false; c.fedT = t; G.fed++; return "good"; }
    G.miss++; return "bad";
  },
  update(G, t) {
    let ev;
    if (t >= G.next) {
      const free = [0, 1, 2, 3].filter(i => !G.cribs[i].cry);
      if (free.length) Object.assign(G.cribs[pick(free)], { cry:true, t, lim:3600 / (0.6 + G.diff * 0.4) });
      G.next = t + rnd(700, 1300) / (0.7 + G.diff * 0.3);
    }
    for (const c of G.cribs) if (c.cry && t - c.t > c.lim) { c.cry = false; G.miss++; ev = "bad"; }
    if (G.fed >= 10) return { stars:G.miss <= 1 ? 3 : G.miss <= 3 ? 2 : 1 };
    if (t - G.t0 >= G.dur || G.miss >= 6) return { stars:G.fed >= 6 ? 1 : 0 };
    return ev;
  },
  draw(G, t) {
    labBackdrop();
    G.cribs.forEach((c, i) => {
      const x = cribX(i);
      rect(x - 10, 54, 20, 8, "#c98a4b"); rect(x - 10, 54, 20, 1, OUT);
      drawAt(petSprite("baby", BABY, null, 0, !c.cry), x, 55, 2);
      if (c.cry) {
        if (Math.floor(t / 200) % 2) { rect(x - 5, 46, 1, 3, "#5ab0f0"); rect(x + 4, 46, 1, 3, "#5ab0f0"); }
        const k = 1 - (t - c.t) / c.lim;
        rect(x - 9, 26, 18, 3, OUT); rect(x - 8, 27, Math.max(0, Math.round(16 * k)), 1, k > 0.4 ? "#57c84d" : "#e2554f");
      }
      if (c.fedT && t - c.fedT < 500) drawAt(iconSprite("heart"), x, 38 - (t - c.fedT) / 60, 1);
    });
    drawAt(iconSprite("milk"), cribX(G.sel), 76, 2);
  },
  hud(G, t) { return { BL:"Cho bú " + G.fed + "/10", BR:secondsLeft(G, t), TR:"Lỡ " + G.miss }; },
};
