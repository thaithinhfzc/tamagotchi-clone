// Cloud save against a real server instance. Google's JWKs are replaced with a keypair
// generated here, so the real token-verification path runs against tokens we control.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createSign, createHmac, generateKeyPairSync } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fresh, advance } from "./helpers.js";
import { store } from "../src/core/store.js";
import { save, load } from "../src/core/state.js";
import * as C from "../src/core/cloud.js";
import { start } from "../server/save-server.js";
import { accountIdFor, makeSession, newSecret, readSession } from "../server/google-auth.js";

const CLIENT_ID = "test-client.apps.googleusercontent.com";
const KID = "test-key-1";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength:2048 });
const jwk = { ...publicKey.export({ format:"jwk" }), kid:KID, alg:"RS256", use:"sig" };

const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");

/* Mints an ID token the way Google would, with knobs for the malformed cases. */
function idToken({ sub = "google-user-1", aud = CLIENT_ID, iss = "https://accounts.google.com",
  expSec = 3600, alg = "RS256", kid = KID, badSig = false } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg, kid, typ:"JWT" });
  const body = b64({ iss, aud, sub, iat:now, exp:now + expSec });
  const input = head + "." + body;
  if (alg === "none") return input + ".";
  if (alg === "HS256") return input + "." + createHmac("sha256", publicKey.export({ type:"spki", format:"pem" })).update(input).digest("base64url");
  const sig = createSign("RSA-SHA256").update(input).sign(privateKey, "base64url");
  return input + "." + (badSig ? sig.slice(0, -4) + "AAAA" : sig);
}

// Only the JWKS endpoint is faked; every other request hits the real server over HTTP.
const fakeFetch = async (url, opts) => (String(url).includes("googleapis.com")
  ? { ok:true, json:async () => ({ keys:[jwk] }) }
  : fetch(url, opts));

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
  server = await start({ port:0, host:"127.0.0.1", dataDir, clientId:CLIENT_ID,
    origins:["*"], signInPerHour:10_000, fetchImpl:fakeFetch });
  base = "http://127.0.0.1:" + server.address().port;
});

after(async () => {
  await new Promise(r => server.close(r));
  await rm(dataDir, { recursive:true, force:true });
});

/* A device signed in as `sub`. */
const signedIn = async (sub = "google-user-1") => {
  const d = device();
  C.setApiBase(d, base);
  const r = await C.signIn(d, idToken({ sub }));
  assert.ok(r.ok, r.msg);
  return d;
};

const post = (path, body, token) => fetch(base + path, {
  method:"POST",
  headers:{ "content-type":"application/json", ...(token ? { authorization:"Bearer " + token } : {}) },
  body:JSON.stringify(body),
});

test("one Google account always maps to the same save slot", () => {
  const a = accountIdFor("google-user-1");
  assert.equal(a, accountIdFor("google-user-1"));
  assert.notEqual(a, accountIdFor("google-user-2"));
  assert.match(a, /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$/);
});

test("session tokens survive a signature check and expire", () => {
  const secret = newSecret();
  const id = accountIdFor("x");
  const token = makeSession(secret, id);
  assert.equal(readSession(secret, token).accountId, id);
  assert.equal(readSession(newSecret(), token), null, "another secret must not validate it");
  assert.equal(readSession(secret, token.slice(0, -2) + "zz"), null, "tampered token rejected");
  assert.equal(readSession(secret, makeSession(secret, id, -1)), null, "expired token rejected");
});

test("signing in on a second device brings the first device's pet across", async () => {
  const a = await signedIn("shared-user");
  fresh("water", 5);
  advance(90);
  save(a);
  const name = store.state.pet.name;
  const pushed = await C.push(a);
  assert.ok(pushed.ok, pushed.msg);

  store.state = null;                       // device B, same Google account
  const b = device();
  C.setApiBase(b, base);
  const r = await C.signIn(b, idToken({ sub:"shared-user" }));
  assert.ok(r.ok, r.msg);
  const got = await C.pull(b);
  assert.ok(got.ok, got.msg);
  assert.equal(store.state.pet.name, name);
  assert.ok(load(b), "the pulled save must also land in device B's local storage");
});

test("a different Google account gets its own pet", async () => {
  const a = await signedIn("user-alpha");
  fresh("land", 7);
  advance(60);
  save(a);
  await C.push(a);

  const b = await signedIn("user-beta");
  store.state = null;
  const r = await C.pull(b);
  assert.equal(r.ok, false, "beta must not see alpha's save");
});

test("the device played most recently wins a clash", async () => {
  const a = await signedIn("clash-user");
  fresh("sky", 3);
  advance(40);
  save(a);
  await C.push(a);

  const b = device();
  C.setApiBase(b, base);
  await C.signIn(b, idToken({ sub:"clash-user" }));
  await C.pull(b);

  advance(200);                             // B plays on and pushes first
  save(b);
  const bPush = await C.push(b);
  assert.ok(bPush.ok, bPush.msg);
  const bClock = store.state.clock;

  store.state = null;
  load(a);
  const stale = await C.push(a);            // A still believes the older rev
  assert.equal(stale.conflict, true);

  const r = await C.resolveConflict(a, "cloud", stale.remote);
  assert.ok(r.ok, r.msg);
  assert.equal(store.state.clock, bClock);
});

test("tokens that fail verification are refused", async () => {
  const cases = {
    "chữ ký sai":idToken({ badSig:true }),
    "phát cho app khác":idToken({ aud:"someone-else.apps.googleusercontent.com" }),
    "issuer không phải Google":idToken({ iss:"https://evil.example.com" }),
    "đã hết hạn":idToken({ expSec:-7200 }),
    "kid không tồn tại":idToken({ kid:"unknown-kid" }),
    "alg none":idToken({ alg:"none" }),
    "alg đổi sang HS256":idToken({ alg:"HS256" }),
  };
  for (const [label, token] of Object.entries(cases)) {
    const res = await post("/api/session", { idToken:token });
    assert.equal(res.status, 401, label + " phải bị từ chối");
  }
  const missing = await post("/api/session", {});
  assert.equal(missing.status, 401, "thiếu token phải bị từ chối");
});

test("saves cannot be read or written without a valid session", async () => {
  assert.equal((await fetch(base + "/api/save")).status, 401);
  assert.equal((await fetch(base + "/api/save", { headers:{ authorization:"Bearer nonsense" } })).status, 401);

  const a = await signedIn("session-user");
  const token = JSON.parse(a.getItem(C.CLOUD_KEY)).token;
  const tampered = token.slice(0, -3) + "zzz";
  assert.equal((await fetch(base + "/api/save", { headers:{ authorization:"Bearer " + tampered } })).status, 401);
});

test("an expired session is cleared so the panel can fall back to signed out", async () => {
  const d = device();
  C.setApiBase(d, base);
  d.setItem(C.CLOUD_KEY, JSON.stringify({ token:makeSession(newSecret(), accountIdFor("whoever")), rev:0 }));
  const r = await C.pull(d);
  assert.equal(r.expired, true);
  assert.equal(C.session(d), null, "the dead session must be removed");
});

test("the server refuses a payload that is not a game save", async () => {
  const a = await signedIn("junk-user");
  const token = JSON.parse(a.getItem(C.CLOUD_KEY)).token;
  const res = await fetch(base + "/api/save", {
    method:"PUT",
    headers:{ "content-type":"application/json", authorization:"Bearer " + token },
    body:JSON.stringify({ rev:0, state:{ junk:true } }),
  });
  assert.equal(res.status, 400);
});
