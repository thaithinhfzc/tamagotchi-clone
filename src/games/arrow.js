// Play · Arrow: guess which way the pet turns. A = left, B = right; 3/5 wins (+5 happy, +1 on loss — TamaVault).
import { drawAt } from "../render/canvas.js";
import { spriteOf } from "../render/sprites.js";
import { bgScene, blinkNow } from "../render/scenes.js";
import { random } from "../util.js";

export default {
  id:"arrow", name:"Mũi tên", kind:"play",
  setup(G) { Object.assign(G, { round:1, phase:"wait" }); },
  input(G, a, t) {
    if (G.phase !== "wait" || !["A", "B", "L", "R"].includes(a)) return;
    G.guess = a === "A" || a === "L" ? "L" : "R";
    G.dir = random() < 0.5 ? "L" : "R";
    G.win = G.guess === G.dir; if (G.win) G.score++;
    G.phase = "result"; G.t0 = t;
    return G.win ? "good" : "bad";
  },
  // the pet is in the middle: tap the side you think it will turn to
  tap(G, x, y, t, phase) { return phase === "down" ? this.input(G, x < 48 ? "L" : "R", t) : undefined; },
  update(G, t) {
    if (G.phase !== "result" || t - G.t0 <= 1000) return;
    if (G.round < 5) { G.round++; G.phase = "wait"; return; }
    return { win:G.score >= 3, perfect:G.score === 5, add:G.score >= 3 ? 5 : 1, msg:"Đoán trúng " + G.score + "/5" };
  },
  draw(G, t) {
    bgScene(G.pet.field, t, false);
    const x = G.phase === "result" ? 48 + (G.dir === "L" ? -22 : 22) * Math.min(1, (t - G.t0) / 300) : 48;
    drawAt(spriteOf(G.pet, blinkNow(t)), x, 70, 2, G.phase === "result" && G.dir === "L");
  },
  hud(G) { return { BL:"Vòng " + G.round + "/5", BR:"Đúng " + G.score, TR:G.phase === "wait" ? "Chạm trái hoặc phải" : G.win ? "Trúng!" : "Trật rồi" }; },
};
