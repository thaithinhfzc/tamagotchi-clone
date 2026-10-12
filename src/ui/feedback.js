// Presenting results: toasts, animations, list panels, menus, and core events.
import { ui } from "./state.js";
import { beep, jingle, callBeep } from "./sound.js";
import { store } from "../core/store.js";
import { LEVEL_UNLOCK } from "../data/progress.js";

const now = () => performance.now();

export function toast(text, ms = 2400) { if (text) ui.toast = { text, until:now() + ms }; }

export function closeMenu() {
  ui.menuStack = [];
  if (ui.mode === "menu" || ui.mode === "list") ui.mode = "main";
}
export function sub(menu) { ui.menuStack.push({ sel:0, ...menu }); ui.mode = "menu"; }
export function showList(title, lines) { ui.menuStack = []; ui.list = { title, lines:lines.length ? lines : ["(trống)"], off:0 }; ui.mode = "list"; }
export const lockItem = (label, lv) => ({ label:label + " (cấp " + lv + ")", dis:true, fn:() => toast("Lên cấp " + lv + " để mở") });

/* run a core action and present its Result. Menus close first so the screen is visible. */
export function act(fn) {
  closeMenu();
  perform(fn());
}
export function perform(res) {
  if (!res) return;
  if (res.zoom !== undefined) ui.zoom = res.zoom;
  if (res.msg) toast(res.msg, res.anim ? 2400 : 2600);
  if (res.list) showList(res.list.title, res.list.lines);
  if (res.anim) {
    ui.anim = { t0:now(), ...res.anim, then:res.then };
    ui.mode = "anim";
  } else if (res.then) perform(res.then());
}
/* called by the frame loop when an animation's time is up */
export function finishAnim() {
  const a = ui.anim;
  ui.anim = null; ui.mode = "main";
  if (a && a.then) perform(a.then());
}

/* core events → toasts and sounds (offline catch-up summarises instead) */
export function handleEvent(type, arg) {
  const p = store.state && store.state.pet;
  switch (type) {
    case "sleep": toast("Bé tự đi ngủ rồi"); break;
    case "wake": toast("Bé tự thức dậy"); beep(660, 0.06); break;
    case "sick": toast("Bé bị ốm! Xoay vào Tế bào để chữa"); beep(330, 0.15); setTimeout(() => beep(260, 0.2), 180); break;
    case "cured": jingle(); break;
    case "evolve": ui.flashUntil = now() + 700; toast("Tiến hoá: " + arg + "!", 3000); jingle(); break;
    case "hatch": ui.flashUntil = now() + 500; toast("Trứng nở rồi!"); jingle(); break;
    case "prompt": toast("Ô vùng đã đủ! Zoom vào Tế bào để tiến hoá", 3000); beep(1175, 0.08); break;
    case "kidmove": toast("Bé đã quen vùng mới · ô thức ăn bị xoá"); break;
    case "die": toast((p ? p.name : "Bé") + " đã về với các vì sao"); beep(220, 0.4); break;
    case "grim": toast("Thần chết xuất hiện! Bấm nút ở tầng Thú cưng!", 3500); beep(200, 0.3); break;
    case "saved": toast("Vì sao " + arg + " đã cứu bé!", 3500); jingle(); break;
    case "call": callBeep(); break;
    case "level": ui.flashUntil = now() + 500; toast("Hành tinh lên cấp " + arg + "! " + LEVEL_UNLOCK[arg], 4000); jingle(); break;
    case "mission": toast("Hoàn thành nhiệm vụ: " + arg + " · +1000G", 3500); jingle(); break;
    case "gift": toast(arg, 3000); jingle(); break;
  }
}

export function summariseAbsence({ minutes, events }) {
  if (!minutes) return;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  const died = events.some(e => e[0] === "die"), evo = events.filter(e => e[0] === "evolve").pop();
  toast("Vắng " + (h ? h + " giờ " : "") + m + " phút" + (died ? " · bé đã mất" : evo ? " · bé đã thành " + evo[1] : ""), 3500);
}
