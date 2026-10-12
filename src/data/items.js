// Foods, snacks, outside toys and deco items. Food points, recipes and prices follow the wiki item list;
// toy/deco prices are ƯL. `ic` names an icon in render/art.js.
import { PLANETS } from "./planets.js";

/* raw food from Egg Hunt · loc: v = volcano, s = spring · +1 hunger, `pts` toward that type's food cell */
export const RAW = [
  ["bigmeat","Thịt to","land",0,2,"v","meat"],["smallmeat","Thịt nhỏ","land",0,1,"v","meat2"],
  ["apple","Táo","land",1,2,"s","apple"],["carrot","Cà rốt","land",1,1,"s","carrot"],
  ["mealbug","Sâu bột","land",2,2,"vs","worm"],["mealworm","Giun đất","land",2,1,"vs","worm2"],
  ["seafood","Hải sản","water",0,2,"v","fish"],["shellfish","Sò","water",0,1,"v","shell"],
  ["greenweed","Rong xanh","water",1,2,"s","weed"],["redweed","Rong đỏ","water",1,1,"s","weedr"],
  ["mealshrimp","Tôm tép","water",2,2,"vs","shrimp"],["plankton","Phù du","water",2,1,"vs","plankton"],
  ["chicken","Gà nguyên con","sky",0,2,"v","chicken"],["chickenpc","Miếng gà","sky",0,1,"v","chicken2"],
  ["cherry","Anh đào","sky",1,2,"s","cherry"],["corn","Bắp","sky",1,1,"s","corn"],
  ["flowersyrup","Siro hoa","sky",2,2,"vs","flower"],["honey","Siro mật","sky",2,1,"vs","honey"],
].map(([id, n, f, t, pts, loc, ic]) => ({ id, n, f, t, pts, loc, ic, kind:"raw" }));

/* cooked meals: 3 × one raw ingredient · +6 hunger, +4 points */
export const MEALS = [
  ["steak","Bít tết","land",0,"smallmeat",600],["applepie","Bánh táo","land",1,"apple",800],["shredcarrot","Cà rốt bào","land",1,"carrot",400],["bugcookie","Bánh quy sâu","land",2,"mealworm",500],
  ["friedfish","Cá chiên","water",0,"seafood",800],["grillshell","Sò nướng","water",0,"shellfish",600],["weedsalad","Gỏi rong","water",1,"redweed",400],["dumpling","Há cảo phù du","water",2,"plankton",300],
  ["chickensteak","Gà bít tết","sky",0,"chickenpc",800],["cherrypie","Bánh anh đào","sky",1,"cherry",600],["cornflakes","Ngũ cốc bắp","sky",1,"corn",500],["flowerdrops","Kẹo hoa","sky",2,"honey",400],
].map(([id, n, f, t, from, p]) => ({ id, n, f, t, from, p, ic:"bowl", kind:"meal" }));
export const MEAL_HUNGER = 6, MEAL_PTS = 4, COOK_COUNT = 3;

export const ITEM = {};
RAW.forEach(r => { ITEM[r.id] = r; });
MEALS.forEach(m => { ITEM[m.id] = m; });

export const SNACKS = [
  { id:"jelly", n:"Thạch que", p:0, lv:0, ha:1, ic:"jelly" },
  { id:"ice", n:"Kem Tình Yêu", p:3000, lv:6, ha:5, fx:"love", ic:"icecream" },
  { id:"vivid", n:"Nước màu rực", p:3000, lv:6, ha:1, fx:"vivid", ic:"juice" },
  { id:"pastel", n:"Nước màu pastel", p:3000, lv:6, ha:1, fx:"pastel", ic:"juice" },
  { id:"rjelly", n:"Thạch bất ngờ", p:3000, lv:6, ha:0, fx:"random", ic:"jelly" },
  { id:"pancake", n:"Bánh kếp vui", p:3000, lv:7, ha:20, fx:"slow", ic:"pancake" },
  { id:"popcorn", n:"Bỏng ngô khoẻ", p:3000, lv:7, ha:5, fx:"vitamin", ic:"popcorn" },
  { id:"red", n:"Nước màu đỏ", p:5000, lv:8, ha:1, fx:"dye", hue:2, l:66, ic:"juice" },
  { id:"blue", n:"Nước màu xanh dương", p:5000, lv:8, ha:1, fx:"dye", hue:222, l:66, ic:"juice" },
  { id:"green", n:"Nước màu xanh lá", p:5000, lv:8, ha:1, fx:"dye", hue:120, l:62, ic:"juice" },
  { id:"softserve", n:"Kem ốc quế to", p:3000, lv:8, ha:5, fx:"bigpoop", ic:"icecream" },
  { id:"tea", n:"Trà ngủ ngon", p:3000, lv:8, ha:20, fx:"nap", ic:"tea" },
  { id:"pink", n:"Nước màu hồng", p:5000, lv:9, ha:1, fx:"dye", hue:335, l:84, ic:"juice" },
  { id:"skyblue", n:"Nước màu da trời", p:5000, lv:9, ha:1, fx:"dye", hue:195, l:82, ic:"juice" },
  { id:"purple", n:"Nước màu oải hương", p:5000, lv:9, ha:1, fx:"dye", hue:268, l:82, ic:"juice" },
  { id:"cotton", n:"Kẹo bông nhảy múa", p:3000, lv:9, ha:5, fx:"dance", ic:"cotton" },
  { id:"sparkle", n:"Nước lấp lánh", p:3000, lv:9, ha:5, fx:"sparkle", ic:"juice" },
];
export const SNACK = {};
SNACKS.forEach(s => { SNACK[s.id] = s; });

/* outside toys (level 2) and deco items (level 6); the shop shows group = day % 5 */
export const TOYS = [["tramp","Bạt nhún",800,0],["ballpit","Bể bóng",1000,0],["wheel","Bánh xe chạy",1200,0],
  ["pool","Hồ bơi",1200,1],["parasol","Ô che nắng",800,1],["swimring","Phao bơi",600,1],
  ["house","Nhà lớn",2000,2],["ferris","Vòng quay",2000,2],["balloons","Chùm bóng bay",700,2],
  ["sandbox","Hộp cát",900,3],["tire","Xích đu lốp",800,3],["stump","Gốc cây",500,3],
  ["onsen","Suối nước nóng",1800,4],["merry","Ngựa gỗ quay",1600,4],["hammock","Võng",900,4],
].map(([id, n, p, g]) => ({ id, n, p, g }));
export const TOY = {};
TOYS.forEach(t => { TOY[t.id] = t; });

/* deco: tpl + two colours drive the sprite (render/art.js TPL) */
export const DECOS = [["partyhat","Mũ tiệc",1500,0,"cone","#ff7fb6","#ffd34d"],["bow","Nơ",1200,0,"bow","#e2554f","#ff9aa8"],["nightcap","Mũ ngủ",1200,0,"dome","#5ab0f0","#ffffff"],
  ["witchhat","Mũ phù thuỷ",2000,1,"cone","#6b4bb0","#ffd34d"],["applehat","Mũ quả táo",1500,1,"dome","#e53950","#3fae5a"],["eggshell","Mũ vỏ trứng",1500,1,"dome","#fff3d6","#c9a46a"],
  ["tiara","Vương miện nhỏ",2500,2,"crown","#c3c8d6","#ff7fb6"],["nonla","Nón lá",1500,2,"cone","#e8cf8a","#c9a46a"],["guitar","Đàn guitar",2000,2,"held","#c98a4b","#5a3a20"],
  ["bouquet","Bó hoa",1500,3,"held","#ff7fb6","#3fae5a"],["knit","Mũ len",1200,3,"dome","#e2554f","#ffffff"],["sunglass","Kính tim",1800,3,"glasses","#ff4d7d","#2a2238"],
  ["santa","Mũ Noel",1500,4,"cone","#e2554f","#ffffff"],["crown","Vương miện",3000,4,"crown","#ffd34d","#e2554f"],["starwand","Đũa sao",2000,4,"held","#ffd34d","#ffffff"],
].map(([id, n, p, g, tpl, c1, c2]) => ({ id, n, p, g, tpl, c1, c2 }));
export const DECO = {};
DECOS.forEach(d => { DECO[d.id] = d; });
PLANETS.forEach(pl => pl.gifts.forEach(([id, n, tpl, c1, c2]) => { DECO[id] = { id, n, tpl, c1, c2, p:1500, gift:true }; }));
