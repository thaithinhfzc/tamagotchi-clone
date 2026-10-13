// Play · Walking: the pet walks down a top-down map; steer with the dial, dodge ghosts and obstacles, reach the treasure.
import { W, H, rect, drawAt } from "../render/canvas.js";
import { spriteOf, iconSprite } from "../render/sprites.js";
import { ri, rnd, pick, clamp, random } from "../util.js";

const GROUND = { land:"#9ad68a", water:"#9fe0ff", sky:"#e8ddff" };

export default {
  id:"walk", name:"Đi dạo", kind:"play",
  setup(G) { Object.assign(G, { x:48, dist:0, lives:3, obs:[], next:0, goal:60, hitT:-1e9 }); },
  input(G, a) {
    if (a === "L" || a === "A") G.x = clamp(G.x - 8, 10, 86);
    if (a === "R" || a === "B") G.x = clamp(G.x + 8, 10, 86);
  },
  tap(G, x) { G.x = clamp(x, 10, 86); },
  update(G, t, dt) {
    G.dist += dt * 6;
    if (t > G.next && G.dist < G.goal - 6) { G.obs.push({ x:ri(10, 86), y:84, kind:random() < 0.35 ? "ghost" : pick(["rock", "tree"]), vx:rnd(-14, 14) }); G.next = t + rnd(500, 900); }
    let ev;
    for (const o of G.obs) {
      o.y -= dt * 22;
      if (o.kind === "ghost") { o.x += o.vx * dt; if (o.x < 8 || o.x > 88) o.vx *= -1; }
      if (!o.hit && Math.abs(o.y - 26) < 5 && Math.abs(o.x - G.x) < 7) { o.hit = true; G.lives--; G.hitT = t; ev = "bad"; }
    }
    G.obs = G.obs.filter(o => o.y > -10);
    if (G.lives <= 0) return { win:false, perfect:false, add:3, msg:"Lạc đường mất rồi" };       // rewards ƯL
    if (G.dist >= G.goal) return { win:true, perfect:G.lives === 3, add:10, msg:"Tìm được kho báu!" };
    return ev;
  },
  draw(G, t) {
    rect(0, 0, W, H, GROUND[G.pet.field]);
    for (let i = 0; i < 10; i++) rect((i * 41) % W, ((i * 29 - G.dist * 22) % H + H) % H, 2, 2, "rgba(255,255,255,.5)");
    for (const o of G.obs) drawAt(iconSprite(o.kind), o.x, o.y + 3, 2);
    if (G.goal - G.dist < 8) drawAt(iconSprite("chest"), 48, 30 + (G.goal - G.dist) * 6, 2);
    if (!(t - G.hitT < 600 && Math.floor(t / 100) % 2)) drawAt(spriteOf(G.pet, false), G.x, 30, 1);
  },
  hud(G) { return { BL:"♥".repeat(G.lives), BR:Math.max(0, Math.ceil(G.goal - G.dist)) + "m", TR:"Kéo để né" }; },
};
