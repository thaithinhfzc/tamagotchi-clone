// One frame of the device screen.
import { W, H, ctx, rect } from "../render/canvas.js";
import { drawStart, drawSpaceView, drawFieldView, drawTamaView, drawCellView } from "../render/scenes.js";
import { ALL_FIELDS } from "../data/fields.js";
import { ui } from "./state.js";
import { drawGame } from "./runner.js";
import { updateHud } from "./hud.js";

const VIEWS = [drawSpaceView, drawFieldView, drawTamaView, drawCellView];

export function renderScreen(t) {
  ctx.clearRect(0, 0, W, H);
  if (ui.mode === "start") drawStart(t, ALL_FIELDS[ui.startSel]);
  else if (ui.mode === "game") drawGame(t);
  else VIEWS[ui.zoom](t);
  if (t < ui.flashUntil && Math.floor(t / 90) % 2 === 0) rect(0, 0, W, H, "rgba(255,255,255,.85)");
  if (t - ui.zoomFx < 160) rect(0, 0, W, H, "rgba(255,255,255," + (1 - (t - ui.zoomFx) / 160) * 0.7 + ")");
  updateHud(t);
}
