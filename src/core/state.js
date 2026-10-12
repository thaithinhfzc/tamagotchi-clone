// Creating, saving and restoring the persisted state.
import { store } from "./store.js";
import { newPet } from "./creatures.js";
import { simMinute } from "./sim.js";
import { captureEvents } from "./bus.js";
import { SAVE_KEY, SAVE_VERSION, MAX_CATCHUP_MIN } from "./rules.js";

export function newGame(shell, now = new Date()) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  store.state = {
    v:SAVE_VERSION, shell, epoch0:midnight, clock:now.getHours() * 60 + now.getMinutes(),
    speed:10, paused:false, sound:true,
    gp:0, gpTotal:0, level:0, credits:false, adultsCounted:0,
    goals:{ kid:false, young:false, adult:false, newgen:false, switched:false },
    inv:{}, toysOwned:[], toysPlaced:[], decoOwned:[], decoPlaced:[], fuel:0,
    memories:[], residents:[], visits:{}, discovered:{}, foodSeen:{}, mealsMade:{}, mission:{}, missionDone:{},
    breedsToday:{ day:-1, n:0 }, hunterHunts:{ day:-1, used:0 }, sitterUntil:-1,
    events:{}, weather:{ day:-1, w:"sun" },
    pet:newPet(shell), lastReal:now.getTime(),
  };
  return store.state;
}

export function save(storage) {
  if (!store.state) return;
  store.state.lastReal = Date.now();
  try { storage.setItem(SAVE_KEY, JSON.stringify(store.state)); } catch (e) { /* private mode / quota */ }
}

export function load(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && saved.v === SAVE_VERSION && saved.pet) { store.state = saved; return true; }
  } catch (e) { /* corrupt save */ }
  return false;
}

export function clearSave(storage) {
  try { storage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  store.state = null;
}

/* the device keeps running in your pocket: replay real time away at 1× (capped), returning what happened */
export function catchUp() {
  const s = store.state;
  if (s.paused) return { minutes:0, events:[] };
  const minutes = Math.min(MAX_CATCHUP_MIN, Math.floor((Date.now() - (s.lastReal || Date.now())) / 60000));
  if (minutes < 1) return { minutes:0, events:[] };
  const events = captureEvents(() => { for (let i = 0; i < minutes; i++) simMinute(); });
  return { minutes, events };
}
