// Shared pieces for mini games.
//
// A game module exports { id, name, kind:"play"|"lab", setup(G, t), input(G, a, t), update(G, t, dt), draw(G, t), hud(G, t) }.
//   G       – per-run state object; the runner fills G.t0, G.last, G.diff (1–3), G.event, G.pet
//   input   – a ∈ "L" "R" "A" "B" "C" "AB"
//   update  – returns undefined while running, or an outcome:
//               play games: { win, perfect, add, msg }   (happiness reward)
//               lab games:  { stars }                     (0–3, Gotchi Points)
//   hud     – { TL?, TR?, BL?, BR? } strings for the screen corners
import { W, rect } from "../render/canvas.js";

export const SLOTX = [18, 48, 78];
export const secondsLeft = (G, t) => Math.max(0, Math.ceil((G.dur - (t - G.t0)) / 1000)) + "s";

export function labBackdrop() {
  rect(0, 0, W, 80, "#f4efe6"); rect(0, 60, W, 20, "#e3d6c2");
  for (let x = 0; x < W; x += 12) rect(x, 0, 1, 60, "#ece4d6");
}
