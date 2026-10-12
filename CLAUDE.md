# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Hành Tinh Bỏ Túi" — a browser simulation of the **Tamagotchi Paradise (wave 1: Land / Water / Sky)** virtual pet, built so the user can try it before buying the real device. Vanilla ES modules, no build step, no dependencies. All UI text is Vietnamese; the user writes casual Vietnamese. It is a local project now — do not publish it as a claude.ai Artifact.

## Commands

```bash
npm start            # static server → http://localhost:5178 (ES modules need http://; port 5173 is taken by another app on this machine)
npm test             # node:test, all tests/*.test.js
npm run check        # node --check every file + import every core/data/games module to prove they stay DOM-free
node --test --test-name-pattern="predator" "tests/**/*.test.js"   # single test
```

Tests import `src/core`, `src/data` and `src/games` directly. `tests/helpers.js` gives `fresh(shell, seed)` (deterministic RNG via `setRandom(mulberry32(seed))`, start at 10:00 on a fixed date), `advance(minutes, each)` (runs `simMinute`; stop by returning `false` from `each`) and `perfectCare(pet, kidFood)`.

Browser check: rAF is paused in background tabs, so scripted `dispatchEvent` input changes state but the HUD won't redraw — verify visually with real clicks/keys and screenshots.

## Fidelity to the real device

The user wants mechanics as close to the real Paradise as possible. Rules and numbers come from community sources; don't invent them:
- Tamagotchi fandom wiki pages `Tamagotchi_Paradise`, `Tamagotchi_Paradise/Character_list` (per-adult hunger/happy minutes, predator/prey), `Tamagotchi_Paradise/Item_list`, `Tamagotchi_Paradise/Unlocks_and_Missions`, `User_blog:NightBladeSequel/Tamagotchi_Paradise_FAQ`. WebFetch gets HTTP 402 there; use `curl "https://tamagotchi.fandom.com/api.php?action=parse&page=<Page>&prop=wikitext&format=json"`.
- tamavault.com/paradise/ guides; official manual PDF (image-only — read pages with the Read tool): `https://tamagotchi-official.com/manual/toy/paradise/paradise_web_manual_IS_EN.pdf`.

Unmeasured values are marked `ƯL` (ước lượng) in code comments **and** with the `.est` badge in the "Số liệu đang dùng" table in `index.html`; keep both in sync. Character/planet names and pixel art are original on purpose (originals are copyrighted); species structure, care tiers and per-character stats mirror the wiki.

## Architecture

Layering (imports only point downward; `core`, `data`, `games` logic must not touch the DOM at import time):

```
main.js           boot, frame loop (game minutes = real ms × speed / 60000), save/load, side panel
ui/               input → menus/runner → feedback (toasts, anims) → hud/screen; ui/state.js is ephemeral UI state
render/           canvas primitives, char-grid art, cached sprite builder, the four zoom-level scenes
games/            one file per mini game + registry
core/             rules, state, simulation, player actions — pure logic
data/             fields/adults, items, planets, level goals & missions
```

- **State**: `core/store.js` holds the single persisted `store.state` (saved to localStorage under `SAVE_KEY` in `core/rules.js`). Bump `SAVE_KEY`/`SAVE_VERSION` for incompatible state changes. Derived calendar/progress helpers (`today`, `dateOf`, `fieldsOpen`, `unlocked`, sale days…) live in `store.js`. Every per-pet counter must be initialised in `newPet()` (`core/creatures.js`) — an undefined counter `+ 1` is `NaN` and silently stops a timer.
- **Time**: `core/sim.js` `simMinute()` is the only thing that advances time: sleep windows, meter decay, poop/dirt, calls → `mistake()` → `getSick()`, death checks (Tama Star rescue, then Grim Gotchi window), growth (baby field cells → kid; kid food cells → young species; young care cells → adult tier) and calendar events. `core/state.js` `catchUp()` replays real time away at 1× inside `captureEvents()`.
- **Core → UI**: core emits events through `core/bus.js` (`emit("evolve", name)` etc.); `ui/feedback.js` `handleEvent` turns them into toasts/sounds. Player actions in `core/actions.js` return a plain **Result** `{ msg?, zoom?, anim?:{type, dur, …}, then?:() => Result, list? }`; the UI runs them with `act(fn)` / `perform(result)`. Mutations meant to happen after an animation go in `then`. Calendar events are flagged in `state.events` by the sim and presented by `ui/menus.js` `runPendingEvents()`.
- **Mini games**: each module in `src/games/` exports `{ id, name, kind:"play"|"lab", unlock?, setup, input, update, draw, hud }` (contract documented in `games/common.js`). `update` returns `undefined`/a sound hint (`"good"|"bad"|"tick"`) while running, or an outcome (`{win, perfect, add, msg}` for play, `{stars}` for lab). `ui/runner.js` owns the running game and applies rewards via `rewardPlay`/`rewardLab`; the meteor game doubles as the 9/19/29 emergency event (`G.event`). Register new games in `games/index.js`.
- **Sprites**: `render/sprites.js` `petSprite()` composes a body grid (`render/art.js` `GRID`, eye anchors `E`) + species parts + genes (`hue/sat/l/eye`) and caches the canvas; `spriteOf(creature)` picks the grid by stage/tier. Pure-bred colours come from `pureGenes()`, bred/dyed ones from stored genes (`genesOf()` in `core/creatures.js`).
- **Menus**: a stack of `{ title, items:[{ label, fn, dis }] }` pushed with `sub()`; level-locked entries use `lockItem(label, level)` with levels from `UNLOCK` in `data/progress.js`.

## Pitfalls seen so far

- Use `>>>` (not `>>`) when deriving values from `hash()`; signed shifts gave negative array indexes.
- Conditions checked every tick (e.g. 6 dark poops → sick) need a latch (`p.poopSick`), otherwise the pet re-sickens right after being cured.
- In tests, `advance()` callbacks see the egg stage first — guard for it before returning `false`.
