// Play · 3 UFOs: one beams the pet up, they shuffle (faster each round), pick the right one. Win +10, loss +5 (TamaVault).
import { rect, drawAt, OUT } from "../render/canvas.js";
import { spriteOf, iconSprite } from "../render/sprites.js";
import { bgScene } from "../render/scenes.js";
import { ri } from "../util.js";
import { SLOTX } from "./common.js";

function newRound(G, t) {
  Object.assign(G, { slot:[0, 1, 2], pet:G.pet, hidden:ri(0, 2), phase:"show", t0:t, sel:1, si:0, chosen:null,
    swapDur:Math.max(200, 430 - G.round * 75), swaps:[] });
  for (let i = 0; i < 2 + G.round * 2; i++) { const a = ri(0, 2); G.swaps.push([a, (a + ri(1, 2)) % 3]); }
}

export default {
  id:"ufo", name:"Ba UFO", kind:"play",
  setup(G, t) { G.round = 1; newRound(G, t); },
  input(G, a, t) {
    if (G.phase !== "pick") return;
    if (a === "L") G.sel = (G.sel + 2) % 3;
    if (a === "R" || a === "A") G.sel = (G.sel + 1) % 3;
    if (a === "B") {
      G.chosen = G.slot.indexOf(G.sel);
      const hit = G.chosen === G.hidden; if (hit) G.score++;
      G.phase = "reveal"; G.t0 = t;
      return hit ? "good" : "bad";
    }
  },
  update(G, t) {
    const e = t - G.t0;
    if (G.phase === "show" && e > 1100) { G.phase = "hide"; G.t0 = t; }
    else if (G.phase === "hide" && e > 450) { G.phase = "shuffle"; G.t0 = t; }
    else if (G.phase === "shuffle" && e > G.swapDur) {
      const [a, b] = G.swaps[G.si], ua = G.slot.indexOf(a), ub = G.slot.indexOf(b);
      G.slot[ua] = b; G.slot[ub] = a; G.si++; G.t0 = t;
      if (G.si >= G.swaps.length) G.phase = "pick";
      return "tick";
    } else if (G.phase === "reveal" && e > 1200) {
      if (G.round < 3) { G.round++; newRound(G, t); return; }
      return { win:G.score >= 2, perfect:G.score === 3, add:G.score >= 2 ? 10 : 5, msg:"Đúng " + G.score + "/3" };
    }
  },
  draw(G, t) {
    bgScene(G.pet.field, t, false);
    const e = t - G.t0, ufo = iconSprite("ufo");
    if (G.phase === "show" || G.phase === "reveal") drawAt(spriteOf(G.pet, false), SLOTX[G.slot[G.hidden]], 70, 1);
    for (let u = 0; u < 3; u++) {
      let x = SLOTX[G.slot[u]], y = 66;
      if (G.phase === "show") y = 26;
      if (G.phase === "hide") y = 26 + Math.min(1, e / 450) * 40;
      if (G.phase === "shuffle") {
        const [a, b] = G.swaps[G.si] || [0, 0], k = Math.min(1, e / G.swapDur), s = G.slot[u];
        if (s === a) { x = SLOTX[a] + (SLOTX[b] - SLOTX[a]) * k; y = 66 - Math.sin(k * Math.PI) * 10; }
        if (s === b) { x = SLOTX[b] + (SLOTX[a] - SLOTX[b]) * k; y = 66 + Math.sin(k * Math.PI) * 3; }
      }
      if (G.phase === "reveal" && (u === G.chosen || u === G.hidden)) y = 66 - Math.min(1, e / 300) * 40;
      drawAt(ufo, x, y, 2);
    }
    if (G.phase === "pick") { const x = SLOTX[G.sel], bob = Math.floor(t / 300) % 2; rect(x - 2, 30 + bob, 5, 1, OUT); rect(x - 1, 31 + bob, 3, 1, OUT); rect(x, 32 + bob, 1, 1, OUT); }
  },
  hud(G) { return { BL:"Vòng " + G.round + "/3", BR:"Đúng " + G.score, TR:G.phase === "pick" ? "Bé ở đâu? B chọn" : G.phase === "show" ? "Nhìn kỹ!" : "" }; },
};
