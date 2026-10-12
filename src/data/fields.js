// Tama Fields (wave 1: Land / Water / Sky). Species structure and per-adult stats mirror the fandom wiki;
// names are original (the real ones are trademarks).

export const FIELDS = {
  land:{ name:"Vùng Đất", short:"ĐẤT", hue:28, accHue:12, shell:"Vỏ Hồng Đất", kid:"Bé Đất", cell:"leaf",
    species:["Gầm","Lẫm Chẫm","Liếm","Mầm"], types:["Thịt","Cà rốt","Sâu"],
    parts:[["ears"],["roundears"],["tuft"],["sprout"]] },
  water:{ name:"Vùng Nước", short:"NƯỚC", hue:200, accHue:186, shell:"Vỏ Xanh Nước", kid:"Bé Nước", cell:"bubble",
    species:["Lướt","Nhảy","Chèo","Trôi"], types:["Hải sản","Rong","Phù du"],
    parts:[["fin","sidefins"],["tuft","sidefins"],["antennae"],["bubble"]] },
  sky:{ name:"Vùng Trời", short:"TRỜI", hue:48, accHue:262, shell:"Vỏ Tím Trời", kid:"Bé Trời", cell:"cloudc",
    species:["Vỗ Cánh","Ríu Rít","Vờn Hoa","Khoáng"], types:["Gà","Bắp","Mật"],
    parts:[["wings","crest"],["wings"],["antennae","wings"],["horn"]] },
};
export const ALL_FIELDS = ["land", "water", "sky"];
/* which fields a shell unlocks, in order (first = starting field) */
export const FIELD_ORDER_BY_SHELL = { land:["land","water","sky"], water:["water","sky","land"], sky:["sky","land","water"] };

/* ADULTS[field][species][tier] = [name, minutes per hunger icon, minutes per happy bar, 0 normal · 1 predator · 2 prey]
   species index 3 = default species (indeterminate diet); tier 0 perfect · 1 0–1 mistakes · 2 2–5 · 3 6+ */
export const ADULTS = {
  land:[[["Mèo Mướp",70,60,0],["Cún Bông",80,50,0],["Gấu Xám",90,30,1],["Chuột Nhắt",40,50,2]],
        [["Đậu Nhỏ",60,80,0],["Thỏ Tai Dài",50,70,0],["Chuột Lang",40,50,0],["Cừu Bông",40,90,0]],
        [["Báo Đốm",70,90,0],["Kỳ Đà",60,70,1],["Thằn Lằn Diềm",50,60,0],["Rùa Nặng",90,30,0]],
        [["Hoa Nhỏ",40,90,0],["Mầm Lẻ Loi",70,80,2],["Cây Bút",50,80,0],["Bụi Rậm",90,90,0]]],
  water:[[["Cá Heo",70,60,0],["Rùa Biển",80,70,0],["Cá Voi",90,80,1],["Cá Mắt Lồi",40,90,0]],
         [["Kỳ Giông",60,80,0],["Sa Giông",50,60,0],["Ếch Suối",40,70,0],["Hải Ly",90,30,0]],
         [["Bạch Tuộc",60,70,0],["Cá Mập",90,20,1],["Cá Lồng Đèn",50,60,0],["Cá Con",60,30,2]],
         [["Sứa Ngọc",40,90,2],["Bạch Tuộc Dù",50,80,0],["Thỏ Biển",70,80,0],["Bọ Biển",80,40,0]]],
  sky:[[["Cú Mèo",70,60,0],["Bướm Đêm",80,50,0],["Đại Bàng",90,30,1],["Dơi Nhỏ",40,50,0]],
       [["Công Xanh",50,60,0],["Chim Sẻ",70,60,0],["Mỏ Tròn",30,90,1],["Chim Kiwi",60,70,0]],
       [["Bướm Ngọc",60,80,0],["Bọ Hung",50,70,2],["Bọ Rùa",40,50,2],["Ong Mật",40,90,0]],
       [["Ngọc Thạch",60,90,0],["Quặng Sắt",50,80,0],["Đá Cuội",90,80,0],["Dung Nham",50,90,0]]],
};
export const BBMARU = { n:"Bé Tròn Bự", hu:5, ha:10 };
export const TIER_NAME = ["Hoàn hảo", "0–1 lỗi", "2–5 lỗi", "6+ lỗi"];
export const EYES = ["tall", "dot", "wide", "sparkle"];
