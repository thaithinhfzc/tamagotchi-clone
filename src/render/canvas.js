// 96×80 logical-pixel canvas (CSS scales it with image-rendering: pixelated) and drawing primitives.
export const W = 96, H = 80, OUT = "#2a2238";
export let ctx = null;

export function initCanvas(canvas) {
  ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
}

export const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

/* pixel-crisp filled circle */
export function disc(cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(Math.round(cx - dx), Math.round(cy + dy), 2 * dx + 1, 1);
  }
}

/* draw a sprite with its feet on groundY, horizontally centred on cx */
export function drawAt(s, cx, groundY, scale = 1, flip = false) {
  const x = Math.round(cx - (s.cx + 0.5) * scale), y = Math.round(groundY - (s.bottom + 1) * scale);
  if (flip) {
    ctx.save(); ctx.translate(x + s.w * scale, y); ctx.scale(-1, 1);
    ctx.drawImage(s.cv, 0, 0, s.w * scale, s.h * scale); ctx.restore();
  } else ctx.drawImage(s.cv, x, y, s.w * scale, s.h * scale);
}
