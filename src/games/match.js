// Lab · Matching Meals!: memory pairs under cloches; avoid the burnt meal (3 burns ends the game).
import { rect, drawAt, OUT } from "../render/canvas.js";
import { iconSprite } from "../render/sprites.js";
import { random } from "../util.js";
import { labBackdrop } from "./common.js";

const FOODS = ["meat", "fish", "apple", "corn"];
const pos = i => [18 + (i % 3) * 30, 18 + Math.floor(i / 3) * 18];

export default {
  id:"match", name:"Tìm cặp món ăn", kind:"lab", unlock:4,
  setup(G) {
    const cards = [...FOODS, ...FOODS, "burnt"].map(c => ({ c, open:false, done:false, r:random() })).sort((a, b) => a.r - b.r);
    Object.assign(G, { cards, sel:0, first:null, tries:0, burnt:0, lockUntil:0, reclose:null });
  },
  input(G, a, t) {
    if (t < G.lockUntil) return;
    if (a === "L") G.sel = (G.sel + 8) % 9;
    if (a === "R" || a === "A") G.sel = (G.sel + 1) % 9;
    if (a !== "B") return;
    const c = G.cards[G.sel];
    if (c.open || c.done) return;
    c.open = true;
    const closeLater = cs => { G.reclose = cs; G.lockUntil = t + 700; };
    if (c.c === "burnt") { G.burnt++; closeLater(G.first ? [c, G.first] : [c]); G.first = null; return "bad"; }
    if (!G.first) { G.first = c; return; }
    G.tries++;
    if (G.first.c === c.c) { G.first.done = c.done = true; G.first = null; return "good"; }
    closeLater([G.first, c]); G.first = null;
    return "bad";
  },
  tap(G, x, y, t, phase) {
    if (phase !== "down") return;
    const i = G.cards.findIndex((c, k) => { const [cx, cy] = pos(k); return Math.abs(x - cx) < 11 && Math.abs(y - cy) < 9; });
    if (i < 0) return;
    G.sel = i;
    return this.input(G, "B", t);
  },
  update(G, t) {
    if (G.reclose && t >= G.lockUntil) { G.reclose.forEach(c => { if (!c.done) c.open = false; }); G.reclose = null; }
    if (G.cards.every(c => c.c === "burnt" || c.done)) return { stars:G.burnt === 0 && G.tries <= 6 ? 3 : G.tries <= 9 ? 2 : 1 };
    if (G.burnt >= 3) return { stars:0 };
  },
  draw(G) {
    labBackdrop();
    G.cards.forEach((c, i) => {
      const [x, y] = pos(i);
      if (c.open || c.done) drawAt(iconSprite(c.c === "burnt" ? "burnt" : c.c), x, y + 6, 2);
      else { rect(x - 8, y - 6, 16, 12, "#c3c8d6"); rect(x - 8, y + 5, 16, 1, OUT); rect(x - 1, y - 8, 2, 2, "#8a8fa3"); }
      if (i === G.sel) rect(x - 10, y + 8, 20, 1, "#c93b6c");
    });
  },
  hud(G) { return { BL:"Lật " + G.tries, BR:"Cháy " + G.burnt + "/3" }; },
};
