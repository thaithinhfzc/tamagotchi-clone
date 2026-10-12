// Menu trees for each zoom level, the Lab (dial press) and calendar-event prompts.
import { ui } from "./state.js";
import { toast, sub, showList, lockItem, act, closeMenu } from "./feedback.js";
import { startGame } from "./runner.js";
import { store, today, dateOf, fieldsOpen, labDiff, DIFF_NAME, saleFood, saleToy, shopGroup, unlocked } from "../core/store.js";
import { FIELDS, ALL_FIELDS, ADULTS } from "../data/fields.js";
import { ITEM, MEALS, SNACKS, TOYS, TOY, DECOS, DECO, COOK_COUNT } from "../data/items.js";
import { PLANETS } from "../data/planets.js";
import { LEVEL_GOAL, MISSIONS, UNLOCK } from "../data/progress.js";
import { FUEL_FULL, MAX_TOYS, MAX_DECO, SITTER_COST } from "../core/rules.js";
import { PLAY_GAMES, LAB_GAMES } from "../games/index.js";
import { resolveStampede, makeWish } from "../core/sim.js";
import * as A from "../core/actions.js";

const S = () => store.state;

export function openMenu() {
  const s = S(), p = s.pet;
  if (ui.zoom === 0) return spaceMenu();
  if (ui.zoom === 1) return fieldMenu();
  if (p.stage === "dead") return;
  if (ui.zoom === 3) {
    if (p.sick) return toast("Bấm nút để đánh bay vi khuẩn!");
    ui.statusPage = (ui.statusPage + 1) % 3;
    return;
  }
  if (p.stage === "egg") return toast("Trứng đang ấp…");
  tamaMenu();
}

function tamaMenu() {
  const p = S().pet;
  const items = [
    { label:"Cho ăn", fn:() => sub({ title:"CHO ĂN", items:[{ label:"Đồ ăn", fn:foodMenu }, { label:"Đồ ăn vặt", fn:snackMenu }] }) },
    { label:"Chơi", fn:() => sub({ title:"CHƠI", items:PLAY_GAMES.map(g => ({ label:g.name, fn:() => startGame(g.id) })) }) },
    { label:"Tắm cho bé" + (p.dirty ? " !" : ""), fn:() => act(A.bathe) },
  ];
  if (A.canSleepNow()) items.push({ label:"Cho đi ngủ", fn:() => act(A.putToSleep) });
  if (A.canWakeNow()) items.push({ label:"Đánh thức", fn:() => act(A.wakeUp) });
  sub({ title:p.name.toUpperCase(), items });
}

function foodMenu() {
  const s = S(), baby = s.pet.stage === "baby";
  const base = baby ? { label:"Sữa ∞", fn:() => act(() => A.feed("milk")) } : { label:"Hạt dinh dưỡng ∞", fn:() => act(() => A.feed("pellet")) };
  const owned = baby ? [] : Object.keys(s.inv).filter(k => ITEM[k] && s.inv[k] > 0);
  sub({ title:"ĐỒ ĂN", items:[base, ...owned.map(k => ({ label:ITEM[k].n + " ×" + s.inv[k], fn:() => act(() => A.feed(k)) }))] });
}

function snackMenu() {
  const s = S();
  sub({ title:"ĐỒ ĂN VẶT", items:[
    { label:"Thạch que ∞", fn:() => act(() => A.feedSnack("jelly")) },
    ...SNACKS.filter(sn => sn.p && A.invHas(sn.id)).map(sn => ({ label:sn.n + " ×" + s.inv[sn.id], fn:() => act(() => A.feedSnack(sn.id)) })),
  ] });
}

function fieldMenu() {
  const s = S(), p = s.pet;
  sub({ title:FIELDS[p.field].name.toUpperCase(), items:[
    unlocked("toys") ? { label:"Đồ chơi ngoài trời", fn:toyMenu } : lockItem("Đồ chơi ngoài trời", UNLOCK.toys),
    unlocked("hunt") ? { label:"Săn trứng", fn:() => sub({ title:"ĐI ĐÂU?", items:[
      { label:"Núi lửa", fn:() => act(() => A.startHunt("volcano")) }, { label:"Suối", fn:() => act(() => A.startHunt("spring")) }] }) } : lockItem("Săn trứng", UNLOCK.hunt),
    { label:"Dọn phân (" + p.poops.length + ")", fn:() => act(A.cleanPoop) },
    unlocked("switchField") ? { label:"Đổi vùng", fn:() => sub({ title:"ĐỔI VÙNG", items:ALL_FIELDS.map(f => fieldsOpen().includes(f)
      ? { label:FIELDS[f].name + (f === p.field ? " ●" : ""), fn:() => act(() => A.setField(f)) }
      : { label:FIELDS[f].name + " (khoá)", dis:true, fn:() => toast("Chưa mở") }) }) } : lockItem("Đổi vùng", UNLOCK.switchField),
  ] });
}

function toyMenu() {
  const s = S();
  if (!s.toysOwned.length) return toast("Chưa có đồ chơi. Mua ở Lab › Cửa hàng");
  sub({ title:"ĐỒ CHƠI · " + s.toysPlaced.length + "/" + MAX_TOYS,
    items:s.toysOwned.map(id => ({ label:(s.toysPlaced.includes(id) ? "✓ " : "  ") + TOY[id].n, fn:() => act(() => A.toggleToy(id)) })) });
}

function spaceMenu() {
  const s = S(), lv = s.level;
  sub({ title:"VŨ TRỤ", items:[
    { label:"Kết nối", fn:() => toast("Cần một máy thứ hai để kết nối") },
    { label:"Vì sao ký ức (" + s.memories.length + ")", fn:() => showList("VÌ SAO KÝ ỨC", s.memories.slice().reverse()
      .map(m => (m.smile ? "☆ " : "★ ") + m.name + " · " + m.days + " tuổi · " + m.cause + (m.smile && !m.used ? " · còn cứu được" : ""))) },
    unlocked("deco") ? { label:"Trang trí hành tinh", fn:decoMenu } : lockItem("Trang trí hành tinh", UNLOCK.deco),
    unlocked("travel") ? { label:"Du hành (" + Math.min(s.fuel, FUEL_FULL) + "/" + FUEL_FULL + ")", fn:travelMenu } : lockItem("Du hành", UNLOCK.travel),
    { label:"Cấp hành tinh: " + lv, fn:() => showList("HÀNH TINH CẤP " + lv, [
      lv < 10 ? "Mục tiêu: " + LEVEL_GOAL[lv] : "Đã đạt cấp tối đa!",
      "Đã nuôi lớn (tính khi mai mối/trứng mới): " + s.adultsCounted,
      "Vùng: " + fieldsOpen().map(f => FIELDS[f].short).join(", "),
      ...(lv >= 10 ? ["Đội ngũ phòng Lab cảm ơn bạn đã chăm hành tinh!"] : [])]) },
  ] });
}

function travelMenu() {
  const s = S();
  sub({ title:"CHỌN HÀNH TINH", items:PLANETS.map(pl => (s.level >= pl.lv
    ? { label:pl.n + " " + "★".repeat(pl.gifts.filter(g => s.decoOwned.includes(g[0])).length), fn:() => act(() => A.travel(pl)) }
    : lockItem(pl.n, pl.lv))) });
}

function decoMenu() {
  const s = S();
  if (!s.decoOwned.length) return toast("Chưa có đồ trang trí. Mua ở cửa hàng hoặc đi du hành");
  sub({ title:"TRANG TRÍ · " + s.decoPlaced.length + "/" + MAX_DECO,
    items:s.decoOwned.map(id => ({ label:(s.decoPlaced.includes(id) ? "✓ " : "  ") + DECO[id].n, fn:() => { act(() => A.toggleDeco(id)); ui.walkers = null; } })) });
}

/* ---------- Lab (dial press) ---------- */
export function openLab() {
  const s = S(), d = labDiff();
  sub({ title:"PHÒNG LAB · " + s.gp + "G", items:[
    { label:"Thông tin", fn:() => sub({ title:"THÔNG TIN", items:[
      { label:"Hồ sơ", fn:() => showList("HỒ SƠ", ["Ngày thứ " + (today() + 1), "Xu: " + s.gp + "G",
        ...ALL_FIELDS.map(f => FIELDS[f].name + ": " + (s.discovered[f] || []).length + " dạng"), "Hôm nay: " + dateOf(today()).toLocaleDateString("vi-VN")]) },
      { label:"Nhiệm vụ", fn:() => showList("NHIỆM VỤ · +1000G MỖI CÁI", MISSIONS.map(([k, n, target]) =>
        (s.missionDone[k] ? "✓ " : "· ") + n + " " + Math.min(s.mission[k] || 0, target) + "/" + target)) }] }) },
    { label:"Trò chơi Lab · " + DIFF_NAME[d], fn:() => sub({ title:"KIẾM XU · " + DIFF_NAME[d].toUpperCase(),
      items:LAB_GAMES.map(g => (s.level >= g.unlock ? { label:g.name, fn:() => startGame(g.id) } : lockItem(g.name, g.unlock))) }) },
    unlocked("shop") ? { label:"Cửa hàng" + (saleFood() ? " · giảm đồ ăn" : saleToy() ? " · giảm đồ chơi" : ""), fn:shopMenu } : lockItem("Cửa hàng", UNLOCK.shop),
    { label:"Trợ giúp", fn:helpMenu },
    { label:"Sổ tay Lab", fn:fileMenu },
    { label:"Âm thanh: " + (s.sound ? "bật" : "tắt"), fn:() => { s.sound = !s.sound; closeMenu(); } },
  ] });
}

function helpMenu() {
  sub({ title:"TRỢ GIÚP", items:[
    { label:"Bé Trắng trông trẻ · " + SITTER_COST + "G", fn:() => act(A.hireSitter) },
    unlocked("newEgg") ? { label:"Trứng mới (thả về vùng)", fn:() => sub({ title:"THẢ BÉ VỀ VÙNG ĐẤT?", items:[
      { label:"Đồng ý", fn:() => { act(A.newTama); ui.walkers = null; } }, { label:"Thôi", fn:closeMenu }] }) } : lockItem("Trứng mới", UNLOCK.newEgg),
    unlocked("breed") ? { label:"Mai mối (" + A.breedsLeft() + " lần)", fn:breedMenu } : lockItem("Mai mối", UNLOCK.breed),
  ] });
}

function breedMenu() {
  const why = A.breedCheck();
  if (why) return toast(why);
  sub({ title:"CHỌN BẠN ĐỜI", items:A.makePartners().map(q => ({ label:q.name, fn:() => { act(() => A.tryBreed(q)); ui.walkers = null; } })) });
}

function fileMenu() {
  const s = S();
  sub({ title:"SỔ TAY · CÁC DẠNG ĐÃ GẶP", items:ALL_FIELDS.map(f => ({ label:FIELDS[f].name, fn:() => {
    const seen = s.discovered[f] || [];
    const all = [FIELDS[f].kid, ...FIELDS[f].species.map(sp => "Nhóc " + sp), ...ADULTS[f].flat().map(a => a[0])];
    showList(FIELDS[f].name.toUpperCase() + " " + seen.length + "/" + all.length, all.map(n => (seen.includes(n) ? n : "???")));
  } })) });
}

function shopMenu() {
  const s = S(), lv = s.level, g = shopGroup(), open = fieldsOpen();
  const sale = on => (on ? " · GIẢM 50%" : "");
  sub({ title:"CỬA HÀNG · " + s.gp + "G", items:[
    { label:"Đồ ăn", fn:() => {
      if (!unlocked("mealsInShop")) return toast("Món nấu sẵn bán từ cấp " + UNLOCK.mealsInShop + ". Đồ sống lấy ở Săn trứng");
      sub({ title:"ĐỒ ĂN" + sale(saleFood()), items:MEALS.filter(m => open.includes(m.f)).map(m => ({ label:m.n + " · " + A.price(m.p, "food") + "G", fn:() => act(() => A.buyMeal(m)) })) });
    } },
    { label:"Đồ ăn vặt", fn:() => sub({ title:"ĐỒ ĂN VẶT" + sale(saleFood()), items:SNACKS.filter(sn => sn.p).map(sn => (lv >= sn.lv
      ? { label:sn.n + " · " + A.price(sn.p, "food") + "G", fn:() => act(() => A.buySnack(sn)) } : lockItem(sn.n, sn.lv))) }) },
    unlocked("toys") ? { label:"Đồ chơi ngoài trời", fn:() => {
      const list = TOYS.filter(t => t.g === g && !s.toysOwned.includes(t.id));
      if (!list.length) return toast("Hôm nay đã mua hết, mai có hàng mới");
      sub({ title:"ĐỒ CHƠI HÔM NAY" + sale(saleToy()), items:list.map(t => ({ label:t.n + " · " + A.price(t.p, "toy") + "G", fn:() => act(() => A.buyToy(t)) })) });
    } } : lockItem("Đồ chơi ngoài trời", UNLOCK.toys),
    unlocked("deco") ? { label:"Đồ trang trí", fn:() => {
      const list = DECOS.filter(d => d.g === g && !s.decoOwned.includes(d.id));
      if (!list.length) return toast("Hôm nay đã mua hết, mai có hàng mới");
      sub({ title:"TRANG TRÍ HÔM NAY" + sale(saleToy()), items:list.map(d => ({ label:d.n + " · " + A.price(d.p, "toy") + "G", fn:() => act(() => A.buyDeco(d)) })) });
    } } : lockItem("Đồ trang trí", UNLOCK.deco),
    unlocked("cook") ? { label:"Nấu ăn", fn:() => sub({ title:"BẾP · " + COOK_COUNT + " NGUYÊN LIỆU", items:MEALS.filter(m => open.includes(m.f)).map(m => {
      const have = s.inv[m.from] || 0;
      return { label:m.n + " (" + have + "/" + COOK_COUNT + " " + ITEM[m.from].n + ")", dis:have < COOK_COUNT, fn:() => act(() => A.cook(m)) };
    }) }) } : lockItem("Nấu ăn", UNLOCK.cook),
    unlocked("sell") ? { label:"Bán đồ", fn:sellMenu } : lockItem("Bán đồ", UNLOCK.sell),
  ] });
}

function sellMenu() {
  const s = S(), keys = Object.keys(s.inv).filter(k => s.inv[k] > 0);
  if (!keys.length) return toast("Không có gì để bán");
  sub({ title:"BÁN ĐỒ", items:keys.map(k => ({ label:(ITEM[k] || SNACKS.find(x => x.id === k)).n + " ×" + s.inv[k] + " → " + A.sellValue(k) + "G", fn:() => act(() => A.sell(k)) })) });
}

/* ---------- calendar events waiting for the player ---------- */
export function runPendingEvents() {
  const E = S().events, p = S().pet;
  if (ui.mode !== "main") return;
  if (E.meteorPending) { E.meteorPending = false; E.meteorDone = true; toast("Cảnh báo! Thiên thạch đang lao tới!", 2000); startGame("meteor", { event:true }); return; }
  if (E.stampedePending && !["egg", "dead"].includes(p.stage)) {
    sub({ title:"ĐÀN THÚ ĐANG CHẠY TỚI! TRỐN?", items:[
      { label:"Trốn đi!", fn:() => act(() => ({ msg:resolveStampede(true) })) },
      { label:"Không trốn", fn:() => act(() => ({ msg:resolveStampede(false) })) }] });
    E.stampedePending = false;
    return;
  }
  if (E.starPending) {
    sub({ title:"SAO BĂNG! ƯỚC MỘT ĐIỀU?", items:[
      { label:"Ước được nhiều xu", fn:() => act(() => ({ msg:makeWish("gp") })) },
      { label:"Ước bé luôn vui", fn:() => act(() => ({ msg:makeWish("happy") })) },
      { label:"Ước có đồ ăn ngon", fn:() => act(() => ({ msg:makeWish("food") })) }] });
    E.starPending = false;
  }
}
