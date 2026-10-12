// Planet levels (goal to reach the next level + what it unlocks) and missions, per wiki "Unlocks and Missions".

export const LEVEL_GOAL = [
  "Nuôi bé tới tuổi trẻ con", "Nuôi tới tuổi thiếu niên", "Nuôi tới tuổi trưởng thành", "Mai mối hoặc lấy trứng mới", "Đổi vùng lần đầu",
  "Nuôi lớn bé thứ 2", "Nuôi lớn bé thứ 3", "Nuôi lớn bé thứ 4", "Nuôi lớn bé thứ 5", "Nuôi lớn bé thứ 6",
];
export const LEVEL_UNLOCK = [
  "",
  "Cửa hàng đồ ăn vặt · 2 Bé Trắng săn trứng · 3 trò Lab",
  "Đồ chơi ngoài trời",
  "Mai mối và trứng mới trong Trợ giúp",
  "Mở vùng thứ hai · đổi vùng · thêm 3 trò Lab",
  "Nấu ăn",
  "Mở vùng thứ ba · độ khó Vừa · du hành · trang trí · bán đồ · Bé Trắng thứ 3",
  "Hành tinh Ẩm Thực · bánh kếp, bỏng ngô",
  "Hành tinh Nghệ Thuật · nước màu, kem to, trà",
  "Hành tinh Ninja · độ khó Khó",
  "Hành tinh Xanh, Âm Nhạc · Bé Trắng thứ 4 · danh sách đội ngũ",
];
/* feature → level it unlocks at */
export const UNLOCK = { shop:1, hunt:1, toys:2, breed:3, newEgg:3, switchField:4, cook:5, travel:6, deco:6, sell:6, mealsInShop:6 };

/* [key, label, target] · each completed mission pays MISSION_REWARD */
export const MISSIONS = [
  ["food","Số lần cho ăn",500],["snack","Số lần cho ăn vặt",500],["bath","Số lần tắm",100],["play","Thắng tuyệt đối trò chơi",100],
  ["cleanpoop","Số lần dọn phân",100],["poops","Số bãi phân gom được",1000],["catchpoop","Bắt kịp lúc sắp ị",10],["travel","Số lần du hành",7],
  ["sleep","Cho đi ngủ đúng giờ",50],["wake","Đánh thức đúng giờ",50],["lab3","3 sao trò Lab",100],["gp","Tổng xu kiếm được",99999],
  ["breed","Mai mối thành công",50],["hunt9","Săn trứng tuyệt đối",50],["foodkinds","Loại đồ săn được",18],["mealkinds","Loại món đã nấu",12],
  ["kinds_land","Dạng trưởng thành Vùng Đất",16],["kinds_water","Dạng trưởng thành Vùng Nước",16],["kinds_sky","Dạng trưởng thành Vùng Trời",16],
];
