// Lab · Punching Meteorite!: A / B / C punch meteors coming from left / middle / right at the right moment.
// Also runs as the 9th/19th/29th emergency event (G.event): ≥2 stars protects the planet.
import { W, H, rect, drawAt } from "../render/canvas.js";
import { iconSprite } from "../render/sprites.js";
import { drawPlanet, planetCols, STARS } from "../render/scenes.js";
import { ri, rnd } from "../util.js";

const LANES = [[4, 4], [48, -4], [92, 4]];
const LANE_OF = { A:0, B:1, C:2, L:0, R:2 };

export default {
  id:"meteor", name:"Đấm thiên thạch", kind:"lab", unlock:1,
  setup(G, t) { Object.assign(G, { list:[], spawned:0, total:15, hits:0, next:t + 800 }); },
  input(G, a) {
    const lane = LANE_OF[a];
    if (lane === undefined) return;
    const m = G.list.find(m => !m.done && m.lane === lane && m.k > 0.72 && m.k < 1.04);
    if (!m) return "bad";
    m.done = true; m.hit = true; G.hits++;
    return "good";
  },
  tap(G, x, y, t, phase) { return phase === "down" ? this.input(G, x < 32 ? "A" : x < 64 ? "B" : "C") : undefined; },
  update(G, t) {
    if (G.spawned < G.total && t >= G.next) {
      G.list.push({ lane:ri(0, 2), t0:t, dur:1600 / (0.7 + G.diff * 0.3), k:0 });
      G.spawned++; G.next = t + rnd(600, 1100) / (0.7 + G.diff * 0.3);
    }
    let ev;
    for (const m of G.list) {
      if (m.hit) m.k += 0.02; else m.k = (t - m.t0) / m.dur;
      if (!m.done && m.k > 1.05) { m.done = true; ev = "bad"; }
    }
    const lastT = G.list.length ? G.list[G.list.length - 1].t0 : t;
    if (G.spawned >= G.total && G.list.every(m => m.done) && t - lastT > 400)
      return { stars:G.hits >= 14 ? 3 : G.hits >= 10 ? 2 : G.hits >= 6 ? 1 : 0 };
    return ev;
  },
  draw(G) {
    rect(0, 0, W, H, "#0d1033");
    for (const [x, y] of STARS) rect(x, y, 1, 1, "#5c66b0");
    drawPlanet(48, 92, 30, 0, planetCols());
    for (const m of G.list) {
      if (m.done && !m.hit) continue;
      const [sx, sy] = LANES[m.lane], k = Math.min(m.k, 1.05), x = sx + (48 - sx) * k * 0.7, y = sy + (62 - sy) * k;
      if (m.hit) drawAt(iconSprite("meteor"), x + (m.lane - 1) * (m.k - 0.8) * 80, y - (m.k - 0.8) * 80, 2);
      else drawAt(iconSprite("meteor"), x, y, 2);
    }
    [14, 44, 74].forEach(x => rect(x, 64, 8, 1, "rgba(255,255,255,.35)"));
  },
  hud(G) { return { BL:"Chạm trái · giữa · phải", BR:G.hits + "/" + G.total, TR:G.event ? "Bảo vệ hành tinh!" : "" }; },
};
