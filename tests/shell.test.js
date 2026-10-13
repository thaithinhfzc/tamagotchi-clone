// The header, vitals and tab dots run on every frame, including the frames before a pet exists.
// A throw there is invisible: no error reaches the player, the frame loop just stops and the
// screen stays black with no buttons. So the shell gets rendered here against a stub DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { store } from "../src/core/store.js";
import { ui } from "../src/ui/state.js";
import { updateHud } from "../src/ui/hud.js";
import { fresh, advance } from "./helpers.js";

function stubDom() {
  const els = new Map();
  const dots = Array.from({ length:4 }, () => ({ hidden:true }));
  // A real node backs textContent and innerHTML with one tree; keeping them as two independent
  // properties makes the stub lie about what the player would see.
  const el = () => {
    let html = "";
    return { hidden:false, classList:{ toggle() {} },
      get innerHTML() { return html; }, set innerHTML(v) { html = v; },
      get textContent() { return html.replace(/<[^>]*>/g, ""); }, set textContent(v) { html = v; } };
  };
  globalThis.document = {
    getElementById(id) { if (!els.has(id)) els.set(id, el()); return els.get(id); },
    querySelectorAll(sel) { return sel.includes(".dot") ? dots : []; },
  };
  return { get:id => globalThis.document.getElementById(id), dots };
}

test("the shell renders before any pet exists", () => {
  const dom = stubDom();
  store.state = null;
  Object.assign(ui, { mode:"start", startSel:0, zoom:2 });
  updateHud(0);                                   // no clock to read yet: must not throw
  assert.equal(dom.get("petSub").textContent, "Chọn nơi bé chào đời");
  assert.equal(dom.get("vitals").hidden, true);
  assert.equal(dom.get("coins").hidden, true);
  assert.ok(dom.dots.every(d => d.hidden), "nothing can need attention yet");
});

test("the shell renders a living pet, with a dot where the work is", () => {
  const dom = stubDom();
  fresh("water", 11);
  advance(400);
  Object.assign(ui, { mode:"main", zoom:2 });
  store.state.pet.poops = [{ x:40, age:70, big:false }];
  store.state.pet.sick = true;
  updateHud(0);
  assert.equal(dom.get("vitals").hidden, false);
  assert.match(dom.get("vitals").innerHTML, /Đói[\s\S]*Vui/);
  assert.equal(dom.get("coins").hidden, false);
  assert.equal(dom.dots[1].hidden, false, "a poop in the field must raise its dot");
  assert.equal(dom.dots[3].hidden, false, "being sick must raise the Cell dot");
});

test("the shell survives a pet that has died", () => {
  const dom = stubDom();
  fresh("land", 3);
  advance(60);
  Object.assign(ui, { mode:"main", zoom:2 });
  store.state.pet.stage = "dead";
  store.state.pet.cause = "đói";
  updateHud(0);                                   // vitals have nothing to show, and must not throw
  assert.equal(dom.get("vitals").hidden, true);
  assert.equal(dom.dots[2].hidden, false, "the pet tier is where a new egg is started");
});
