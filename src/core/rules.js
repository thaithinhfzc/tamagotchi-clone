// Numeric rules. Values come from the Tamagotchi fandom wiki / TamaVault unless marked ƯL (ước lượng = estimate).
// Keep the "Số liệu đang dùng" table in index.html in sync when changing a value.

export const HU_MAX = 5;                 // hunger icons (manual)
export const HA_MAX = 20;                // happiness bars (wiki)

/* minutes per hunger icon / happiness bar; adults use their own row in ADULTS */
export const RATE = { baby:{ hu:3, ha:5 }, kid:{ hu:45, ha:20 }, young:{ hu:60, ha:30 } };

export const EGG_MIN = 5;
export const BABY_MAX = 240;             // baby auto-evolves (or becomes Bbmaru) after 4 h
export const BABY_NAP_AT = 30, BABY_NAP_LEN = 5, BABY_SICK_AT = 10;
export const KID_MIN = 1440, KID_EXTRA_MAX = 240;   // 24–28 h
export const YOUNG_MIN = 1440;           // 24 h

export const FIELD_CELL_MIN = 15;        // one field cell per 15 min in a field (baby)
export const PROMPT_MIN = 15;            // evolution prompt lifetime
export const KID_MOVE_MIN = 60;          // kid adopts a new field after 60 consecutive min
export const FOOD_PTS_PER_CELL = 5, MAX_FOOD_CELLS = 4;
export const CALL_MIN = 15;              // unanswered call → care mistake
export const SICK_CHANCE = 0.35;         // after mistakes not divisible by 2 or 3
export const DARK_POOP_MIN = 60, DARK_POOP_SICK = 6;
export const SICK_DEATH_COUNT = 5;       // sick 5 times in one stage → death
export const STAR_SAVE_DAYS = 30;        // pets living 30+ days become a rescuing Tama Star

export const POOP_EVERY = { baby:[10, 10], kid:[60, 90], young:[90, 120], adult:[120, 180] }; // baby: wiki · others: ƯL
export const POOP_WIGGLE_MIN = 2;
export const DIRTY_EVERY = [240, 360];   // ƯL
export const STARVE_DEATH = 720;         // ƯL ("hours on end")
export const GRIM_WINDOW = 15;           // ƯL
export const FUEL_FULL = 20;             // ƯL
export const FUEL_CAP = FUEL_FULL * 2;

export const SLEEP_FROM = 19, SLEEP_AUTO = 22, WAKE_FROM = 6, WAKE_AUTO = 10, HUNT_UNTIL = 19;
export const MAX_RESIDENTS = 4, MAX_TOYS = 4, MAX_DECO = 4;
export const BREEDS_PER_DAY = 3;
export const SITTER_COST = 300, SITTER_UNTIL_H = 19;
export const MISSION_REWARD = 1000;
export const STAR_PAY = [0, 100, 200, 300];   // ƯL · × difficulty
export const SLOW_HAPPY_MIN = 360;       // ƯL (Happy Pancakes)
export const MAX_EGGS = 9, PERFECT_HUNT_CHANCE = 0.1;

export const SAVE_KEY = "hanh-tinh-bo-tui.v3";
export const SAVE_VERSION = 3;
export const MAX_CATCHUP_MIN = 1440;
