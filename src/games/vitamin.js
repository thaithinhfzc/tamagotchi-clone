// Lab · Delivering Vitamin!: the vitamin bounces upward through the vessel; steer onto platforms.
// Platform kinds (wiki): r red blood cell = high jump · c Tama Cell = moves · y bubble = breaks after one jump · o small · w normal.
import { W, H, rect, drawAt, OUT } from "../render/canvas.js";
import { iconSprite } from "../render/sprites.js";
import { ri, pick } from "../util.js";
import { secondsLeft } from "./common.js";

const COLOR = { w:"#ffffff", r:"#e2304f", y:"#ffd34d", o:"#ff8a2a", c:"#ff8fb0" };
const width = pl => (pl.kind === "o" ? 6 : 10);
const height = G => Math.floor(G.best / 4);

export default {
  id:"vitamin", name:"Chở vitamin", kind:"lab", unlock:4,
  setup(G) {
    Object.assign(G, { x:48, y:60, vy:-60, cam:0, best:0, dur:45000,
      plats:Array.from({ length:9 }, (_, i) => ({ x:i === 0 ? 48 : ri(10, 86), y:70 - i * 10, kind:i === 0 ? "w" : pick(["w", "w", "w", "r", "y", "o", "c"]), used:false, dx:pick([-12, 12]) })) });
  },
  input(G, a) {
    if (a === "L" || a === "A") G.x -= 6;
    if (a === "R" || a === "B") G.x += 6;
    G.x = (G.x + W) % W;
  },
  update(G, t, dt) {
    G.vy += 140 * dt; G.y += G.vy * dt;
    let ev;
    for (const pl of G.plats) {
      if (pl.kind === "c") { pl.x += pl.dx * dt; if (pl.x < 8 || pl.x > 88) pl.dx *= -1; }
      if (!pl.used && G.vy > 0 && Math.abs(G.y - (pl.y - G.cam)) < 3 && Math.abs(G.x - pl.x) < width(pl) / 2 + 2) {
        G.vy = pl.kind === "r" ? -120 : -85; if (pl.kind === "y") pl.used = true; ev = "tick";
      }
    }
    if (G.y < 30) { const d = 30 - G.y; G.y = 30; G.cam -= d; G.best += d; }
    for (const pl of G.plats) if (pl.y - G.cam > 84) Object.assign(pl, { y:pl.y - 90, x:ri(10, 86), used:false, kind:pick(["w", "w", "r", "y", "o", "c"]) });
    if (G.y > 90 || t - G.t0 >= G.dur) { const h = height(G); return { stars:h >= 120 ? 3 : h >= 70 ? 2 : h >= 30 ? 1 : 0 }; }
    return ev;
  },
  draw(G) {
    rect(0, 0, W, H, "#ffd0dc");
    for (const pl of G.plats) {
      if (pl.used) continue;
      const y = pl.y - G.cam, w = width(pl);
      rect(pl.x - w / 2, y, w, 2, COLOR[pl.kind]); rect(pl.x - w / 2, y + 2, w, 1, OUT);
    }
    drawAt(iconSprite("vitamin"), G.x, G.y, 2);
  },
  hud(G, t) { return { BL:"◀ ▶", BR:secondsLeft(G, t) + " · " + height(G) + "m" }; },
};
