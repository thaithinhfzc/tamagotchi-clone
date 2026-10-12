// Every mini game must reach an outcome under random input (logic only; draw() is not called).
import { test } from "node:test";
import assert from "node:assert/strict";
import { fresh, advance } from "./helpers.js";
import { store } from "../src/core/store.js";
import { GAMES } from "../src/games/index.js";
import { pick } from "../src/util.js";

for (const game of Object.values(GAMES)) {
  test(game.id + " ends with a valid outcome", () => {
    fresh("sky", 7);
    advance(70);
    let t = 0;
    const G = { id:game.id, t0:t, last:t, score:0, diff:2, event:false, pet:store.state.pet };
    game.setup(G, t);
    let out;
    for (let i = 0; i < 20000 && (!out || typeof out === "string"); i++) {
      t += 16;
      if (i % 3 === 0) game.input(G, pick(["A", "B", "L", "R"]), t);
      out = game.update(G, t, 0.016);
      assert.equal(typeof game.hud(G, t), "object");
    }
    assert.ok(out && typeof out === "object", "never finished");
    if (game.kind === "lab") assert.ok(out.stars >= 0 && out.stars <= 3);
    else assert.ok(typeof out.add === "number" && typeof out.msg === "string");
  });
}
