// Grid → cached offscreen canvas. Creature sprites are composed from body grid + species parts + genes.
import { OUT } from "./canvas.js";
import { GRID, ICONS, TPL, TOY_TPL, TOY_COL, TIER_SHAPE } from "./art.js";
import { FIELDS } from "../data/fields.js";
import { DECO } from "../data/items.js";
import { genesOf } from "../core/creatures.js";

const cache = new Map();
const hsl = (h, s, l) => `hsl(${Math.round(((h % 360) + 360) % 360)} ${Math.round(s)}% ${l}%)`;

function gridCanvas(g, pal) {
  const c = document.createElement("canvas");
  c.width = g[0].length; c.height = g.length;
  const x = c.getContext("2d");
  g.forEach((row, y) => [...row].forEach((ch, i) => { if (ch !== ".") { x.fillStyle = pal[ch] || OUT; x.fillRect(i, y, 1, 1); } }));
  return { cv:c, w:c.width, h:c.height, bottom:c.height - 1, cx:(c.width - 1) / 2 };
}
function cached(key, make) { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); }

export const iconSprite = name => cached("i:" + name, () => gridCanvas(ICONS[name].g, ICONS[name].p));
export const tplSprite = (tpl, c1, c2) => cached("t:" + tpl + c1 + c2, () => gridCanvas(TPL[tpl], { a:c1, b:c2, c:"#ffffff" }));
export const toySprite = id => tplSprite(TOY_TPL[id], ...TOY_COL[id]);
export const decoSprite = id => { const d = DECO[id]; return tplSprite(d.tpl, d.c1, d.c2); };

const M = 4;   // margin around a body grid for accessories
/* species parts are placed relative to the top row extents (tl..tr), the middle row extents (ml..mr) and centre column cx */
function partPixels(part, { T, tl, tr, cx, ml, mr, my }) {
  const A = [], put = (x, y, c = "a") => A.push([x, y, c]);
  switch (part) {
    case "fin": put(cx,T-1);put(cx+1,T-1);put(cx-1,T-1);put(cx,T-2);put(cx+1,T-2);put(cx+1,T-3); break;
    case "sidefins": for (const s of [-1, 1]) { const b = s < 0 ? ml : mr; put(b+s,my+1);put(b+2*s,my+1);put(b+s,my+2); } break;
    case "tuft": put(cx,T-1);put(cx,T-2);put(cx-1,T-3);put(cx+1,T-3); break;
    case "antennae": put(tl+1,T-1);put(tl,T-2);put(tl-1,T-3,"y"); put(tr-1,T-1);put(tr,T-2);put(tr+1,T-3,"y"); break;
    case "bubble": put(cx+4,T-2,"w");put(cx+5,T-2,"w");put(cx+4,T-3,"w");put(cx+5,T-3,"w"); break;
    case "ears": put(tl,T-1);put(tl+1,T-1);put(tl,T-2); put(tr,T-1);put(tr-1,T-1);put(tr,T-2); break;
    case "roundears": put(tl-1,T-1);put(tl,T-1);put(tl-1,T-2);put(tl,T-2); put(tr+1,T-1);put(tr,T-1);put(tr+1,T-2);put(tr,T-2); break;
    case "horn": put(cx,T-1);put(cx+1,T-1);put(cx,T-2);put(cx,T-3,"y"); break;
    case "wings": for (const s of [-1, 1]) { const b = s < 0 ? ml : mr; put(b+s,my);put(b+s,my+1);put(b+2*s,my-1);put(b+2*s,my);put(b+3*s,my-1);put(b+3*s,my-2); } break;
    case "crest": put(cx-1,T-1);put(cx,T-1);put(cx+1,T-1);put(cx-1,T-2);put(cx+1,T-2);put(cx,T-3); break;
    case "sprout": put(cx,T-1,"g");put(cx-1,T-2,"g");put(cx-2,T-2,"g");put(cx-2,T-3,"g");put(cx+1,T-2,"g");put(cx+2,T-2,"g");put(cx+2,T-3,"g"); break;
  }
  return A;
}

/* eye styles are inherited genes; `dir` points toward the face centre so both eyes mirror */
function paintEye(C, x, y, dir, style, closed, tiny) {
  if (tiny) { C[y][x] = "e"; return; }
  if (closed) { C[y + 1][x] = "e"; C[y + 1][x + dir] = "e"; return; }
  switch (style) {
    case "dot": C[y + 1][x] = "e"; break;
    case "wide": C[y + 1][x] = "e"; C[y + 1][x + dir] = "e"; break;
    case "sparkle": C[y][x] = "w"; C[y][x + dir] = "e"; C[y + 1][x] = "e"; C[y + 1][x + dir] = "e"; break;
    default: C[y][x] = "e"; C[y + 1][x] = "e";
  }
}

export function petSprite(gk, genes, parts, accHue, closed) {
  return cached([gk, genes.hue, genes.sat, genes.l, genes.eye, parts && parts.join("+"), accHue, closed].join("|"), () => {
    const g = GRID[gk], gw = g[0].length, gh = g.length, cw = gw + 2 * M, ch = gh + 2 * M;
    const C = Array.from({ length:ch }, () => Array(cw).fill(null));
    let top = -1, bottom = 0;
    g.forEach((r, y) => { if (/[^.]/.test(r)) { if (top < 0) top = y; bottom = y; } });
    const ext = y => { const r = g[y], l = r.search(/[^.]/), rr = r.length - 1 - [...r].reverse().join("").search(/[^.]/); return [l + M, rr + M]; };
    const midY = Math.floor((top + bottom) / 2), [tl, tr] = ext(top), [ml, mr] = ext(midY);
    const anchors = { T:top + M, tl, tr, cx:Math.floor((gw - 1) / 2) + M, ml, mr, my:midY + M };
    if (parts) {
      const inB = (x, y) => y >= 0 && y < ch && x >= 0 && x < cw;
      const A = parts.flatMap(part => partPixels(part, anchors));
      for (const [x, y, c] of A) if (inB(x, y)) C[y][x] = c;
      for (const [x, y] of A) for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const X = x + dx, Y = y + dy; if (inB(X, Y) && C[Y][X] === null) C[Y][X] = "o"; }
    }
    const eyes = [];
    g.forEach((r, y) => [...r].forEach((c, x) => { if (c !== ".") { C[y + M][x + M] = c === "E" ? "b" : c; if (c === "E") eyes.push([x + M, y + M]); } }));
    const centre = (gw - 1) / 2 + M;
    for (const [x, y] of eyes) paintEye(C, x, y, x < centre ? 1 : -1, genes.eye, closed, gk === "baby");
    const egg = gk === "egg", L = genes.l || 72;
    const col = { o:OUT, e:OUT, m:"#8a2f4a", c:"#ff8fab", w:"#ffffff", y:"#ffd34d", g:"#4cbf5a",
      b:egg ? "#fff8ec" : hsl(genes.hue, genes.sat, L), l:egg ? "#ffffff" : hsl(genes.hue, genes.sat, Math.min(94, L + 14)),
      d:hsl(genes.hue, genes.sat, L - 12), s:hsl(genes.hue, genes.sat, 62), a:hsl(accHue || 0, 62, 56) };
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const x2 = c.getContext("2d");
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (C[y][x]) { x2.fillStyle = col[C[y][x]]; x2.fillRect(x, y, 1, 1); }
    return { cv:c, w:cw, h:ch, bottom:bottom + M, cx:centre };
  });
}

export const eggSprite = hue => petSprite("egg", { hue, sat:60, l:70, eye:"tall" }, null, 0, false);
export const shiroSprite = () => petSprite("shiro", { hue:0, sat:0, l:95, eye:"tall" }, null, 0, false);

/* sprite for any creature (pet, resident, partner, NPC) */
export function spriteOf(o, closed = false) {
  const g = genesOf(o);
  if (o.stage === "egg") return eggSprite(FIELDS[o.field].hue);
  if (o.stage === "baby") return petSprite("baby", g, null, 0, closed);
  if (o.stage === "kid") return petSprite("kid", g, null, 0, closed);
  if (o.special) return petSprite("bbmaru", g, null, 0, closed);
  const F = FIELDS[o.sf], accHue = F.accHue + o.young * 28;
  if (o.stage === "young") return petSprite("kid", g, F.parts[o.young].slice(0, 1), accHue, closed);
  return petSprite(TIER_SHAPE[o.tier], g, F.parts[o.young], accHue, closed);
}
