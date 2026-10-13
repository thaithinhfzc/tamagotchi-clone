// First-run walkthrough. It points a ring at a real element rather than drawing a fake one, so
// what you are told about is the thing you will actually tap. Shown once; repeatable from Cài đặt.
const KEY = "hanh-tinh-bo-tui.coach";
const $ = id => document.getElementById(id);

const STEPS = [
  { el:"screen", text:"Đây là bé của bạn. Chạm thẳng vào màn hình để xử lý thứ đang cần: bãi phân, vi khuẩn, hay thần chết." },
  { el:"acts", text:"Hàng nút này là những việc làm được ngay lúc này. Nó đổi theo tầng bạn đang xem." },
  { el:"zoomTabs", text:"Bốn tầng: vũ trụ, vùng, bé, tế bào. Bấm vào đây, hoặc vuốt ngang trên màn hình." },
  { el:"zoomTabs", text:"Tầng nào hiện chấm đỏ là ở đó đang có việc cần bạn." },
  { el:"vitals", text:"Đói và Vui tụt dần theo thời gian thật. Để trống quá lâu là bé mắc lỗi chăm sóc, rồi ốm." },
  { el:"helpBtn", text:"Luật chơi đầy đủ nằm trong Sổ tay. Tốc độ thời gian và các cài đặt khác ở nút bánh răng." },
];

let steps = [], i = 0;

export const coachSeen = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(KEY, "1"); } catch { /* private mode */ } };

const visible = el => !!el && !el.hidden && el.getBoundingClientRect().height > 0;

function place() {
  const st = steps[i], el = $(st.el);
  if (!visible(el)) return next();
  const r = el.getBoundingClientRect(), ring = $("coachRing"), box = $("coachBox");
  Object.assign(ring.style, { left:(r.left - 6) + "px", top:(r.top - 6) + "px",
    width:(r.width + 12) + "px", height:(r.height + 12) + "px" });
  $("coachText").textContent = st.text;
  $("coachDots").innerHTML = steps.map((_, k) => "<i class='" + (k === i ? "on" : "") + "'></i>").join("");
  $("coachNext").textContent = i === steps.length - 1 ? "Bắt đầu chơi" : "Tiếp";
  // reading offsetHeight forces layout, so the box can be placed without waiting for a frame
  const h = box.offsetHeight, below = r.bottom + 14;
  box.style.top = (below + h < innerHeight - 10 ? below : Math.max(10, r.top - 14 - h)) + "px";
}

function next() {
  if (++i >= steps.length) return finish();
  place();
}

function finish() {
  $("coach").hidden = true;
  markSeen();
}

/* `force` is the "Xem lại hướng dẫn" button; without it this runs only on a first play. */
export function startCoach(force = false) {
  if (!force && coachSeen()) return;
  steps = STEPS.filter(s => visible($(s.el)));
  if (!steps.length) return;
  i = 0;
  $("coach").hidden = false;
  place();
}

export function initCoach() {
  $("coachNext").addEventListener("click", next);
  $("coachSkip").addEventListener("click", finish);
  addEventListener("resize", () => { if (!$("coach").hidden) place(); });
}
