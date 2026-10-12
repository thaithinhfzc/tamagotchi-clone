// Lab · Cleaning Dust!: move the board, bounce the vacuum into dust clouds until the hidden Shirotama is found.
// The real game has 10 rounds; 5 here to keep a run short.
import { rect, drawAt } from "../render/canvas.js";
import { iconSprite, shiroSprite } from "../render/sprites.js";
import { ri, pick, clamp } from "../util.js";
import { labBackdrop, secondsLeft } from "./common.js";

function resetBoard(G) {
  const hidden = ri(0, 11);
  G.bricks = Array.from({ length:12 }, (_, i) => ({ x:10 + (i % 6) * 15, y:16 + Math.floor(i / 6) * 9, alive:true, tama:i === hidden }));
  G.launched = false; G.bx = G.padX; G.by = 66;
}
const stars = G => (G.lost <= 1 ? 3 : G.lost <= 3 ? 2 : 1);

export default {
  id:"dust", name:"Lau bụi", kind:"lab", unlock:1,
  setup(G) { Object.assign(G, { round:1, rounds:5, padX:48, vx:0, vy:0, dur:60000, lost:0 }); resetBoard(G); },
  input(G, a) {
    if (a === "L" || a === "A") G.padX = clamp(G.padX - 7, 8, 88);
    if (a === "R" || a === "B") G.padX = clamp(G.padX + 7, 8, 88);
    if (!G.launched) { G.launched = true; G.vx = pick([-30, 30]); G.vy = -45 - G.diff * 8; }
  },
  update(G, t, dt) {
    if (!G.launched) { G.bx = G.padX; G.by = 66; }
    else {
      G.bx += G.vx * dt; G.by += G.vy * dt;
      if (G.bx < 3 || G.bx > 93) { G.vx *= -1; G.bx = clamp(G.bx, 3, 93); }
      if (G.by < 10) G.vy = Math.abs(G.vy);
      if (G.vy > 0 && G.by >= 68 && G.by <= 72 && Math.abs(G.bx - G.padX) < 9) { G.vy = -Math.abs(G.vy); G.vx = clamp(G.vx + (G.bx - G.padX) * 4, -60, 60); }
      if (G.by > 82) { G.launched = false; G.lost++; return "bad"; }
      const b = G.bricks.find(b => b.alive && Math.abs(G.bx - b.x) < 7 && Math.abs(G.by - b.y) < 4);
      if (b) {
        b.alive = false; G.vy *= -1;
        if (b.tama) { G.score++; if (G.round >= G.rounds) return { stars:stars(G) }; G.round++; resetBoard(G); return "good"; }
      }
    }
    if (t - G.t0 >= G.dur) return { stars:G.score >= 4 ? 2 : G.score >= 2 ? 1 : 0 };
  },
  draw(G) {
    labBackdrop();
    for (const b of G.bricks) if (b.alive) drawAt(iconSprite("shirodust"), b.x, b.y + 2, 2);
    const hidden = G.bricks.find(b => b.tama);
    if (hidden && !hidden.alive) drawAt(shiroSprite(), hidden.x, hidden.y + 4, 1);
    rect(G.padX - 8, 70, 16, 2, "#5a5f73");
    drawAt(iconSprite("vac"), G.bx, G.by + 2, 1);
  },
  hud(G, t) { return { BL:"Vòng " + G.round + "/" + G.rounds, BR:secondsLeft(G, t), TR:G.launched ? "" : "Bấm để bắn" }; },
};
