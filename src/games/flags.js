// Play · Flags: A = white (left), B = red (right), A+B = both. Half-raised flag or both down = don't press. 10 rounds.
import { rect, drawAt, OUT } from "../render/canvas.js";
import { spriteOf } from "../render/sprites.js";
import { bgScene } from "../render/scenes.js";
import { random, pick } from "../util.js";

export default {
  id:"flags", name:"Giơ cờ", kind:"play",
  setup(G) { Object.assign(G, { round:1, phase:"cue" }); },
  input(G, a) {
    if (G.phase !== "act" || G.answered || !["A", "B", "AB"].includes(a)) return;
    if (a !== "AB" && G.cmd === "AB") {             // pressing A then B separately also counts as both
      G.partial += a;
      if (!(G.partial.includes("A") && G.partial.includes("B"))) return;
      a = "AB";
    }
    G.answered = true; G.ok = a === G.cmd; if (G.ok) G.score++;
    return G.ok ? "good" : "bad";
  },
  update(G, t) {
    const e = t - G.t0;
    if (G.phase === "cue" && e > 600) {
      const r = random();
      Object.assign(G, { phase:"act", t0:t, partial:"", answered:false, ok:false, half:pick(["A", "B"]),
        cmd:r < 0.3 ? "A" : r < 0.6 ? "B" : r < 0.72 ? "AB" : r < 0.86 ? "HALF" : "DOWN" });
    } else if (G.phase === "act" && e > 1150) {
      if ((G.cmd === "HALF" || G.cmd === "DOWN") && !G.answered) { G.ok = true; G.score++; }
      G.phase = "res"; G.t0 = t;
    } else if (G.phase === "res" && e > 450) {
      if (G.round < 10) { G.round++; G.phase = "cue"; G.t0 = t; return; }
      return { win:G.score >= 7, perfect:G.score === 10, add:G.score >= 7 ? 10 : 3, msg:"Đúng " + G.score + "/10" };   // win threshold ƯL
    }
  },
  draw(G, t) {
    bgScene(G.pet.field, t, false);
    drawAt(spriteOf(G.pet, false), 48, 70, 2);
    const e = t - G.t0;
    const lift = side => {
      if (G.phase === "cue") return 0;
      const k = Math.min(1, G.phase === "res" ? 1 : e / 180);
      if (G.cmd === "AB" || G.cmd === side) return k;
      if (G.cmd === "HALF" && G.half === side) return G.phase === "act" && e < 650 ? k * 0.5 : 0;
      return 0;
    };
    for (const [side, x, c] of [["A", 22, "#ffffff"], ["B", 74, "#e2554f"]]) {
      const top = 58 - lift(side) * 28, fx = x + (side === "A" ? -7 : 1);
      rect(x, top, 1, 70 - top, "#8a5a3b"); rect(fx, top, 7, 5, c); rect(fx, top, 7, 1, OUT);
    }
  },
  hud(G) { return { BL:"Vòng " + G.round + "/10", BR:"Đúng " + G.score, TR:G.phase === "res" ? (G.ok ? "Đúng!" : "Sai rồi") : "A trắng · B đỏ" }; },
};
