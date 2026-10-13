// DOM overlay on the screen: corner texts, status panel, toast, plus the meta line above it.
// Menus and lists are not drawn here any more — ui/sheet.js renders them as tappable DOM.
import { ui } from "./state.js";
import { gameHud, gameKind } from "./runner.js";
import { store, clockStr, saleFood, saleToy, DIFF_NAME } from "../core/store.js";
import { FIELDS, ALL_FIELDS, TIER_NAME } from "../data/fields.js";
import { HU_MAX, HA_MAX, FUEL_FULL } from "../core/rules.js";
import { adultRow, alive } from "../core/creatures.js";

const $ = id => document.getElementById(id);
const last = {};
const setHtml = (id, html) => { if (last[id] !== html) { last[id] = html; $(id).innerHTML = html; } };
const setHidden = (id, h) => { const el = $(id); if (el.hidden !== h) el.hidden = h; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

function statusPanel(p) {
  if (ui.statusPage === 1) {
    const bars = Math.round(p.happy / 2);
    return "<b>TRẠNG THÁI</b>" +
      "<div class=row><span>ĐÓI</span><span>" + "●".repeat(p.hunger) + "○".repeat(HU_MAX - p.hunger) + "</span></div>" +
      "<div class=row><span>VUI</span><span>" + "▮".repeat(bars) + "▯".repeat(10 - bars) + "</span></div>" +
      "<div class=row><span>TUỔI</span><span>" + Math.floor(p.age / 1440) + " năm</span></div>" +
      "<div class='row dim'><span>Lỗi " + p.mist + " · ốm " + p.sickStage + "/5</span><span>chạm: tiếp</span></div>";
  }
  const head = p.stage === "baby" ? "CHƯA RÕ LOÀI"
    : FIELDS[p.stage === "kid" ? p.kidField : p.sf].short + " · " + (p.stage === "kid" ? "TRẺ CON" : p.special ? "ĐẶC BIỆT" : FIELDS[p.sf].species[p.young]);
  return "<b>" + head + "</b><div>" + esc(p.name) + "</div>" +
    (p.stage === "adult" && !p.special ? "<div class=dim>" + TIER_NAME[p.tier] + " · đói " + adultRow(p)[1] + "′ · vui " + adultRow(p)[2] + "′</div>" : "") +
    "<div class=dim>Đời thứ " + p.gen + (p.genes.pure ? " · thuần chủng" : " · lai") + "</div>";
}

const STAGE = { egg:"Trứng", baby:"Em bé", kid:"Trẻ con", young:"Thiếu niên", adult:"Trưởng thành", dead:"Đã về với các vì sao" };

const pips = (n, of, low) => "<div class='pips" + (low ? " low" : "") + "'>" +
  Array.from({ length:of }, (_, i) => "<i class='" + (i < n ? "on" : "") + "'></i>").join("") + "</div>";

/* The two numbers that decide whether the pet lives belong on screen, not behind a menu. */
function vitals(p) {
  if (!alive(p) || p.stage === "egg") return "";
  const ha = Math.round(p.happy / (HA_MAX / HU_MAX));
  return "<div class=vital><span>Đói</span>" + pips(p.hunger, HU_MAX, p.hunger <= 1) + "</div>" +
    "<div class=vital><span>Vui</span>" + pips(ha, HU_MAX, ha <= 1) + "</div>" +
    "<div class='vital flat'><span>Tuổi</span><b>" + Math.floor(p.age / 1440) + " năm</b></div>";
}

/* A dot on a tab means: there is something for you at that depth. */
function attention(s, p) {
  if (!alive(p)) return [false, false, p.stage === "dead", false];
  return [
    s.fuel >= FUEL_FULL,
    p.poops.length > 0,
    !!(p.calls.hunger || p.calls.happy || p.grim || p.injured || p.dirty || p.wiggle),
    !!(p.sick || p.prompt),
  ];
}

const dots = want => document.querySelectorAll("#zoomTabs .dot")
  .forEach((d, i) => { if (d.hidden === want[i]) d.hidden = !want[i]; });

/* Before a pet exists there is no clock, so nothing here may touch the save until it is proven
   to be there — a single unguarded read (saleFood) threw every frame and left a new player
   staring at a black screen with no buttons. The early return is the guarantee. */
function updateShell(s) {
  if (ui.mode === "start" || !s) {
    setHtml("petName", "Hành Tinh Bỏ Túi");
    setHtml("petSub", "Chọn nơi bé chào đời");
    setHidden("coins", true);
    setHidden("vitals", true);
    return dots([false, false, false, false]);
  }
  const p = s.pet;
  const sale = saleFood() ? " · giảm giá đồ ăn" : saleToy() ? " · giảm giá đồ chơi" : "";
  setHtml("petName", esc(p.stage === "egg" ? "Quả trứng" : p.name));
  setHtml("petSub", esc(STAGE[p.stage] + " · " + FIELDS[p.field].name + (s.paused ? " · tạm dừng" : "") + sale));
  setHidden("coins", false);
  setHtml("coins", s.gp + "G");

  const v = vitals(p);
  setHidden("vitals", !v);
  if (v) setHtml("vitals", v);
  dots(attention(s, p));
}

export function updateHud(t) {
  let TL = "", TR = "", BL = "", BR = "", panel = null, ghost = false;
  const s = store.state;
  if (ui.mode === "start") {
    const f = ALL_FIELDS[ui.startSel];
    panel = "<b>" + FIELDS[f].name.toUpperCase() + "</b><div>Bé sẽ lớn lên ở đây</div><div style='margin-top:.5em'>Chọn vùng ở bên dưới</div>";
  } else {
    const p = s.pet, main = ui.mode === "main";
    TL = clockStr() + (s.paused ? " ⏸" : "");
    if (p.grim) TR += "<span class='ic grim blink'>☠</span>";
    if (p.calls.hunger || p.calls.happy) TR += "<span class='ic call blink'>!</span>";
    if (p.sick) TR += "<span class='ic sick blink'>✚</span>";
    if (p.prompt) TR += "<span class='ic call blink'>★</span>";
    if (p.asleep) TR += "<span class='ic'>z</span>";
    // the zoom tabs name the level now, so this corner is free for whatever needs doing
    BR = ui.zoom === 2 ? (p.stage === "dead" ? "" : p.name) : ui.zoom === 0 ? "Cấp " + s.level
      : ui.zoom === 1 ? "Nhiên liệu " + Math.min(s.fuel, FUEL_FULL) + "/" + FUEL_FULL : FIELDS[p.field].short;
    if (ui.zoom === 3 && alive(p) && ui.statusPage) { ghost = true; panel = statusPanel(p); }
    if (ui.zoom === 3 && p.sick && main) { BL = "Chạm trúng vi khuẩn!"; BR = p.viruses + " con"; }
    if (ui.zoom === 3 && p.prompt && main) BL = "Chạm để tiến hoá!";
    if (p.stage === "dead" && ui.zoom === 2) panel = "<b>VỀ VỚI CÁC VÌ SAO</b><div>" + esc(p.name) + " · đời " + p.gen + "</div><div>Lý do: " + esc(p.cause) + "</div><div style='margin-top:.5em'>Chạm để ấp trứng mới</div>";
    if (ui.mode === "game") {
      const h = gameHud(t);
      TR = h.TR || ""; BL = h.BL || ""; BR = h.BR || "";
      if (gameKind() === "lab" && !ui.game.event) TL = DIFF_NAME[ui.game.diff];
    }
    if (ui.mode === "anim" && ui.anim.type === "travel") { BL = ui.anim.pl.n; BR = ""; }
    // the egg has no actions at all, so without this the first five minutes look like a bug
    if (main && p.stage === "egg") BL = "Trứng đang ấp…";
    if (main && p.grim && ui.zoom === 2) BL = "Chạm vào thần chết!";
    if (main && p.wiggle && (ui.zoom === 1 || ui.zoom === 2)) BL = "Sắp ị! Chạm vào bé!";
    if (main && p.injured && ui.zoom === 2) BL = "Chạm để băng bó (" + p.injured + ")";
    if (main && p.poops.length && ui.zoom === 1) BL = "Chạm vào bãi phân để dọn";
    if (main && p.asleep && ui.zoom === 2) TR += "<span class='ic'>" + (Math.floor(t / 600) % 2 ? "Zz" : "zZ") + "</span>";
  }
  setHtml("hTL", TL); setHtml("hTR", TR); setHtml("hBL", esc(BL)); setHtml("hBR", esc(BR));
  setHidden("hPanel", !panel);
  if (panel) { setHtml("hPanel", panel); $("hPanel").classList.toggle("ghost", ghost); }
  const showToast = ui.toast && t < ui.toast.until && ui.mode !== "menu";
  setHidden("hToast", !showToast);
  if (showToast) setHtml("hToast", esc(ui.toast.text));
  updateShell(s);
}
