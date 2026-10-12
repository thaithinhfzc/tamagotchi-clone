// DOM overlay on the screen: corner texts, status/list panel, menu, toast; plus the status line under the device.
import { ui } from "./state.js";
import { gameHud, gameKind } from "./runner.js";
import { store, today, dateOf, clockStr, saleFood, saleToy, DIFF_NAME } from "../core/store.js";
import { FIELDS, ALL_FIELDS, TIER_NAME } from "../data/fields.js";
import { HU_MAX, FUEL_FULL } from "../core/rules.js";
import { adultRow, alive } from "../core/creatures.js";
import { clamp } from "../util.js";

const $ = id => document.getElementById(id);
const last = {};
const setHtml = (id, html) => { if (last[id] !== html) { last[id] = html; $(id).innerHTML = html; } };
const setHidden = (id, h) => { const el = $(id); if (el.hidden !== h) el.hidden = h; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const ZNAMES = ["VŨ TRỤ", "", "THÚ CƯNG", "TẾ BÀO"];

function statusPanel(p) {
  if (ui.statusPage === 1) {
    const bars = Math.round(p.happy / 2);
    return "<b>TRẠNG THÁI</b>" +
      "<div class=row><span>ĐÓI</span><span>" + "●".repeat(p.hunger) + "○".repeat(HU_MAX - p.hunger) + "</span></div>" +
      "<div class=row><span>VUI</span><span>" + "▮".repeat(bars) + "▯".repeat(10 - bars) + "</span></div>" +
      "<div class=row><span>TUỔI</span><span>" + Math.floor(p.age / 1440) + " năm</span></div>" +
      "<div class='row dim'><span>Lỗi " + p.mist + " · ốm " + p.sickStage + "/5</span><span>A: tiếp</span></div>";
  }
  const head = p.stage === "baby" ? "CHƯA RÕ LOÀI"
    : FIELDS[p.stage === "kid" ? p.kidField : p.sf].short + " · " + (p.stage === "kid" ? "TRẺ CON" : p.special ? "ĐẶC BIỆT" : FIELDS[p.sf].species[p.young]);
  return "<b>" + head + "</b><div>" + esc(p.name) + "</div>" +
    (p.stage === "adult" && !p.special ? "<div class=dim>" + TIER_NAME[p.tier] + " · đói " + adultRow(p)[1] + "′ · vui " + adultRow(p)[2] + "′</div>" : "") +
    "<div class=dim>Đời thứ " + p.gen + (p.genes.pure ? " · thuần chủng" : " · lai") + "</div>";
}

export function updateHud(t) {
  let TL = "", TR = "", BL = "", BR = "", panel = null, ghost = false, menu = null;
  const s = store.state;
  if (ui.mode === "start") {
    const f = ALL_FIELDS[ui.startSel];
    panel = "<b>CHỌN MÁY</b><div>◀ " + FIELDS[f].shell + " ▶</div><div>Bắt đầu ở " + FIELDS[f].name + "</div><div style='margin-top:.5em'>B: Egg Bang!</div>";
  } else {
    const p = s.pet, main = ui.mode === "main";
    TL = clockStr() + (s.paused ? " ⏸" : "");
    if (p.grim) TR += "<span class='ic grim blink'>☠</span>";
    if (p.calls.hunger || p.calls.happy) TR += "<span class='ic call blink'>!</span>";
    if (p.sick) TR += "<span class='ic sick blink'>✚</span>";
    if (p.prompt) TR += "<span class='ic call blink'>★</span>";
    if (p.asleep) TR += "<span class='ic'>z</span>";
    BL = [0, 1, 2, 3].map(i => (i === ui.zoom ? "●" : i === 3 && p.prompt ? "!" : "○")).join("") + " " + (ui.zoom === 1 ? FIELDS[p.field].short : ZNAMES[ui.zoom]);
    BR = ui.zoom === 2 ? (p.stage === "dead" ? "" : p.name) : ui.zoom === 0 ? "Cấp " + s.level : ui.zoom === 1 ? "Nhiên liệu " + Math.min(s.fuel, FUEL_FULL) + "/" + FUEL_FULL : "";
    if (ui.zoom === 3 && alive(p) && ui.statusPage) { ghost = true; panel = statusPanel(p); }
    if (ui.zoom === 3 && p.sick && main) { TR = "Bấm nút!"; BR = p.viruses + " vi khuẩn"; }
    if (p.stage === "dead" && ui.zoom === 2) panel = "<b>VỀ VỚI CÁC VÌ SAO</b><div>" + esc(p.name) + " · đời " + p.gen + "</div><div>Lý do: " + esc(p.cause) + "</div><div style='margin-top:.5em'>B: trứng mới</div>";
    if (ui.mode === "list") {
      const l = ui.list;
      panel = "<b>" + esc(l.title) + "</b>" + l.lines.slice(l.off, l.off + 5).map(x => "<div>" + esc(x) + "</div>").join("") +
        (l.lines.length > 5 ? "<div class=dim>◀ ▶ cuộn · " + (l.off + 1) + "/" + (l.lines.length - 4) + "</div>" : "");
      ghost = false;
    }
    if (ui.mode === "menu") {
      const m = ui.menuStack[ui.menuStack.length - 1], n = m.items.length, start = clamp(m.sel - 2, 0, Math.max(0, n - 4));
      menu = "<b>" + esc(m.title) + "</b>" + (start > 0 ? "<div class=more>▲</div>" : "") +
        m.items.slice(start, start + 4).map((it, i) => "<div class='" + (start + i === m.sel ? "sel" : "") + (it.dis ? " dis" : "") + "'>" + esc(it.label) + "</div>").join("") +
        (start + 4 < n ? "<div class=more>▼</div>" : "");
    }
    if (ui.mode === "game") {
      const h = gameHud(t);
      TR = h.TR || ""; BL = h.BL || ""; BR = h.BR || "";
      if (gameKind() === "lab" && !ui.game.event) TL = DIFF_NAME[ui.game.diff];
    }
    if (ui.mode === "anim" && ui.anim.type === "travel") { BL = ui.anim.pl.n; BR = ""; }
    if (main && p.grim && ui.zoom === 2) BR = "Bấm nút đuổi đi!";
    if (main && p.wiggle && (ui.zoom === 1 || ui.zoom === 2)) BR = "Sắp ị! Bấm nút!";
    if (main && p.injured && ui.zoom === 2) BR = "Bấm A/B băng bó (" + p.injured + ")";
    if (main && p.asleep && ui.zoom === 2) TR += "<span class='ic'>" + (Math.floor(t / 600) % 2 ? "Zz" : "zZ") + "</span>";
  }
  setHtml("hTL", TL); setHtml("hTR", TR); setHtml("hBL", esc(BL)); setHtml("hBR", esc(BR));
  setHidden("hPanel", !panel);
  if (panel) { setHtml("hPanel", panel); $("hPanel").classList.toggle("ghost", ghost); }
  setHidden("hMenu", !menu);
  if (menu) setHtml("hMenu", menu);
  const showToast = ui.toast && t < ui.toast.until && ui.mode !== "menu";
  setHidden("hToast", !showToast);
  if (showToast) setHtml("hToast", esc(ui.toast.text));
  if (s) setHtml("statusLine", dateOf(today()).toLocaleDateString("vi-VN") + " · " + clockStr() + " · " + s.gp + "G · " + s.speed + "×" +
    (s.paused ? " · dừng" : "") + (saleFood() ? " · giảm giá đồ ăn" : saleToy() ? " · giảm giá đồ chơi" : ""));
}
