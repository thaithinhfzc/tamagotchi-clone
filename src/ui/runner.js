// Runs one mini game at a time (ui.game) and turns its outcome into rewards.
import { ui } from "./state.js";
import { toast, closeMenu } from "./feedback.js";
import { beep, jingle, good, bad } from "./sound.js";
import { GAMES } from "../games/index.js";
import { store, labDiff } from "../core/store.js";
import { blocked, rewardPlay, rewardLab } from "../core/actions.js";
import { meteorOutcome } from "../core/sim.js";

const now = () => performance.now();
const sfx = ev => { if (ev === "good") good(); else if (ev === "bad") bad(); else if (ev === "tick") beep(600, 0.02); };

export function startGame(id, { event = false } = {}) {
  closeMenu();
  const game = GAMES[id];
  if (game.kind === "play") { const why = blocked(); if (why) return toast(why); }
  const t = now();
  const G = { id, t0:t, last:t, score:0, diff:event ? 1 : labDiff(), event, pet:store.state.pet };
  game.setup(G, t);
  ui.game = G; ui.mode = "game";
}

export function gameInput(a) {
  const G = ui.game;
  if (!G) return;
  if (a === "C") { if (G.event) return; ui.game = null; ui.mode = "main"; toast("Thôi không chơi nữa"); return; }
  sfx(GAMES[G.id].input(G, a, now()));
}

export function tickGame(t) {
  const G = ui.game;
  if (!G) return;
  const dt = Math.min(60, t - G.last) / 1000;
  G.last = t;
  const out = GAMES[G.id].update(G, t, dt);
  if (!out || typeof out === "string") { sfx(out); return; }
  ui.game = null; ui.mode = "main";
  const game = GAMES[G.id];
  if (G.event) {
    const ok = out.stars >= 2;
    toast(meteorOutcome(ok), 3500); ok ? jingle() : beep(200, 0.3);
  } else if (game.kind === "play") {
    rewardPlay(out.add, out.perfect);
    toast(out.msg + " · vui +" + out.add, 2600); out.win ? jingle() : beep(300, 0.15);
  } else {
    const pts = rewardLab(out.stars, G.diff);
    toast("★".repeat(out.stars) + "☆".repeat(3 - out.stars) + " · +" + pts + "G", 2800); out.stars ? jingle() : beep(300, 0.15);
  }
}

export const drawGame = t => GAMES[ui.game.id].draw(ui.game, t);
export const gameHud = t => GAMES[ui.game.id].hud(ui.game, t);
export const gameKind = () => GAMES[ui.game.id].kind;
