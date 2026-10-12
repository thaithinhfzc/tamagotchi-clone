// Registry. Play games raise happiness (Tama view › Play); Lab games earn Gotchi Points (Lab › Mini Games).
import arrow from "./arrow.js";
import flags from "./flags.js";
import ufo from "./ufo.js";
import walk from "./walk.js";
import milk from "./milk.js";
import dust from "./dust.js";
import meteor from "./meteor.js";
import vitamin from "./vitamin.js";
import match from "./match.js";
import poopcatch from "./poopcatch.js";

export const PLAY_GAMES = [arrow, flags, ufo, walk];
export const LAB_GAMES = [milk, dust, meteor, vitamin, match, poopcatch];
export const GAMES = Object.fromEntries([...PLAY_GAMES, ...LAB_GAMES].map(g => [g.id, g]));
