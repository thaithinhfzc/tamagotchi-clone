// The single persisted game state lives in store.state; these helpers derive calendar/progress facts from it.
import { FIELD_ORDER_BY_SHELL } from "../data/fields.js";
import { UNLOCK } from "../data/progress.js";

export const store = { state:null };
const S = () => store.state;

export const today = () => Math.floor(S().clock / 1440);
export const hourNow = () => (S().clock % 1440) / 60;
/* noon of game day d in the real calendar (epoch0 = local midnight of the start day) */
export const dateOf = d => new Date(S().epoch0 + d * 86400000 + 43200000);
export const dayOfMonth = () => dateOf(today()).getDate();
export const clockStr = () => {
  const m = S().clock % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};

export const unlocked = feature => S().level >= UNLOCK[feature];
export const fieldsOpen = () => FIELD_ORDER_BY_SHELL[S().shell].slice(0, S().level >= 6 ? 3 : S().level >= 4 ? 2 : 1);
export const labDiff = () => (S().level >= 9 ? 3 : S().level >= 6 ? 2 : 1);
export const DIFF_NAME = ["", "Dễ", "Vừa", "Khó"];
export const hunterCount = () => (S().level >= 10 ? 4 : S().level >= 6 ? 3 : 2);
export const saleFood = () => [5, 15, 25].includes(dayOfMonth());
export const saleToy = () => [10, 20, 30].includes(dayOfMonth());
export const shopGroup = () => today() % 5;
