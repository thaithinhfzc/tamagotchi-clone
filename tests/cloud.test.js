// Cloud save against a real server instance: two fake devices sharing one account code.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fresh, advance } from "./helpers.js";
import { store } from "../src/core/store.js";
import { save, load } from "../src/core/state.js";
import * as C from "../src/core/cloud.js";
import { start, newId } from "../server/save-server.js";

/* localStorage stand-in: same three methods cloud.js and state.js use */
const device = () => {
  const m = new Map();
  return {
    getItem:k => (m.has(k) ? m.get(k) : null),
    setItem:(k, v) => m.set(k, String(v)),
    removeItem:k => m.delete(k),
  };
};

let server, dataDir, base;

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "tama-cloud-"));
  server = await start({ port:0, host:"127.0.0.1", dataDir, origins:["*"], newPerHour:10_000 });
  base = "http://127.0.0.1:" + server.address().port;
});

after(async () => {
  await new Promise(r => server.close(r));
  await rm(dataDir, { recursive:true, force:true });
});

const linked = async () => {
  const d = device();
  C.setApiBase(d, base);
  const r = await C.linkNew(d);
  assert.ok(r.ok, r.msg);
  return d;
};

test("server generates codes in the unambiguous alphabet", () => {
  for (let i = 0; i < 50; i++) {
    const id = newId();
    assert.match(id, /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$/);
    assert.ok(!/[ILOU]/.test(id), "code must avoid I, L, O and U: " + id);
  }
});

test("typed codes normalise: spaces, lowercase and the four lookalike letters", () => {
  assert.equal(C.normaliseCode("k7m2 9qxp 3rtv 8wnh"), "K7M29QXP3RTV8WNH");
  assert.equal(C.normaliseCode("OILU"), "011V", "O→0, I and L→1, U→V");
  assert.equal(C.normaliseCode("  k7m2-9qxp_3rtv.8wnh  "), "K7M29QXP3RTV8WNH");
  assert.ok(C.validCode("K7M29QXP3RTV8WNH"));
  assert.ok(!C.validCode("TOOSHORT"));
  assert.ok(!C.validCode("K7M29QXP3RTV8WNHX"), "17 characters is not a code");
});

test("a second device entering the code receives the first device's pet", async () => {
  const a = await linked();
  fresh("water", 5);
  advance(90);
  save(a);
  const name = store.state.pet.name, stage = store.state.pet.stage;
  const pushed = await C.push(a);
  assert.ok(pushed.ok, pushed.msg);
  assert.equal(pushed.rev, 1);

  const code = C.cloudInfo(a).id;
  store.state = null;                       // device B starts empty
  const b = device();
  C.setApiBase(b, base);
  const r = await C.linkExisting(b, code);
  assert.ok(r.ok, r.msg);
  assert.equal(store.state.pet.name, name);
  assert.equal(store.state.pet.stage, stage);
  assert.ok(load(b), "the pulled save must also land in device B's local storage");
});

test("pulling twice without a change in between reports it is already current", async () => {
  const a = await linked();
  fresh("land", 2);
  advance(30);
  await C.push(a);
  const r = await C.pull(a);
  assert.ok(r.ok, r.msg);
  assert.equal(r.already, true);
});

test("a stale device loses the push and is handed the winning save", async () => {
  const a = await linked();
  fresh("sky", 3);
  advance(40);
  await C.push(a);

  const code = C.cloudInfo(a).id;
  const b = device();
  C.setApiBase(b, base);
  await C.linkExisting(b, code);            // B is now level with A at rev 1

  advance(200);                             // B plays on and wins the race
  save(b);
  const bPush = await C.push(b);
  assert.ok(bPush.ok, bPush.msg);
  assert.equal(bPush.rev, 2);

  const aPush = await C.push(a);            // A still believes rev 1
  assert.equal(aPush.ok, false);
  assert.equal(aPush.conflict, true);
  assert.equal(aPush.remote.rev, 2);
});

test("resolving a conflict toward the cloud adopts the other device's save", async () => {
  const a = await linked();
  fresh("water", 11);
  advance(20);
  await C.push(a);

  const b = device();
  C.setApiBase(b, base);
  await C.linkExisting(b, C.cloudInfo(a).id);
  advance(300);
  save(b);
  await C.push(b);
  const bClock = store.state.clock;

  store.state = null;
  load(a);                                  // back to A's older save
  const conflict = await C.push(a);
  assert.equal(conflict.conflict, true);

  const r = await C.resolveConflict(a, "cloud", conflict.remote);
  assert.ok(r.ok, r.msg);
  assert.equal(store.state.clock, bClock);
  assert.equal(C.cloudInfo(a).rev, 2);
});

test("resolving toward the local device overwrites the cloud and bumps the revision", async () => {
  const a = await linked();
  fresh("land", 12);
  advance(20);
  await C.push(a);

  const b = device();
  C.setApiBase(b, base);
  await C.linkExisting(b, C.cloudInfo(a).id);
  advance(300);
  save(b);
  await C.push(b);

  store.state = null;
  load(a);
  const myClock = store.state.clock;
  const conflict = await C.push(a);
  const r = await C.resolveConflict(a, "local", conflict.remote);
  assert.ok(r.ok, r.msg);
  assert.equal(r.took, "local");
  assert.equal(r.rev, 3);

  store.state = null;                       // B pulls and must now see A's save
  const back = await C.pull(b);
  assert.ok(back.ok, back.msg);
  assert.equal(store.state.clock, myClock);
});

test("an unknown code is rejected rather than silently linked", async () => {
  const d = device();
  C.setApiBase(d, base);
  const r = await C.linkExisting(d, "ZZZZZZZZZZZZZZZZ");
  assert.equal(r.ok, false);
  assert.equal(C.cloudInfo(d), null);
});

test("the server refuses a payload that is not a game save", async () => {
  const a = await linked();
  const id = C.cloudInfo(a).id;
  const res = await fetch(base + "/api/save/" + id, {
    method:"PUT",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({ rev:0, state:{ junk:true } }),
  });
  assert.equal(res.status, 400);
});

test("a malformed code never reaches the filesystem", async () => {
  for (const bad of ["../etc/passwd", "short", "%2e%2e%2fx"]) {
    const res = await fetch(base + "/api/save/" + encodeURIComponent(bad));
    assert.equal(res.status, 400, bad + " must be rejected as a bad code");
  }
});
