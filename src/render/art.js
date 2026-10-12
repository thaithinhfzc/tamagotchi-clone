// Pixel art as character grids. "." is transparent; other letters index the palette.
// Body grids use: o outline · b body · l highlight · d shade · m mouth · c cheek · E eye anchor (style comes from genes).
import { OUT } from "./canvas.js";

const pad = rows => { const w = Math.max(...rows.map(r => r.length)); return rows.map(r => r.padEnd(w, ".")); };

export const GRID = {
  egg:["...oooo...","..obbbbo..",".obblbbbo.",".oblbbsbo.","obbbbbbbbo","obsbbbbsbo","obbbbbbbbo","obbbsbbbbo","obbbbbbsbo",".obsbbbbo.","..obbbbo..","...oooo..."],
  baby:["..oooo..",".obbbbo.","oblbbbbo","obEbbEbo","obbmmbbo","obbbbbbo",".obbbbo.","..oooo.."],
  kid:["............","...oooooo...","..obbbbbbo..",".oblbbbbbbo.",".obbbbbbbbo.",".obEbbbbEbo.",".obbbbbbbbo.",".obcbmmbcbo.",".obbbbbbbbo.","..obbbbbbo..","...oo..oo...","............"],
  bbmaru:["....oooooo....","..oobbbbbboo..",".oblbbbbbbbbo.",".olbbbbbbbbbo.","obbbEbbbbEbbbo","obbbbbbbbbbbbo","obcbbbmmbbbcbo","obbbbbbbbbbbbo",".obbbbbbbbbbo.","..oooooooooo.."],
  round:["................","................","................",".....oooooo.....","...oobbbbbboo...","..obllbbbbbbbo..","..olbbbbbbbbbo..",".obbbEbbbbEbbbo.",".obbbbbbbbbbbbo.",".obcbbbmmbbbcbo.",".obbbbbbbbbbbbo.",".obbbddddddbbbo.","..obbddddddbbo..","...oobbbbbboo...","....oo....oo....","................"],
  squat:["................","................","................","................","................","...oooooooooo...","..obbbbbbbbbbo..",".oblbbbbbbbbbbo.","obbbEbbbbbbEbbbo","obbbbbbbbbbbbbbo","obcbbbbmmbbbbcbo","obbbbbbbbbbbbbbo",".obbddddddddbbo.","..oooooooooooo..","...oo......oo...","................"],
  tall:["................","......oooo......",".....obbbbo.....","....oblbbbbo....","....olbbbbbo....","...obbbbbbbbo...","...obEbbbbEbo...","...obbbbbbbbo...","...obcbmmbcbo...","...obbbbbbbbo...","...obbddddbbo...","...obbddddbbo...","...obbbbbbbbo...","....obbbbbbo....","....oo....oo....","................"],
  drop:["................",".......oo.......","......obbo......","......obbo......",".....obbbbo.....","....obbbbbbo....","...oblbbbbbbo...","..obbbbbbbbbbo..","..obEbbbbbbEbo..","..obbbbbbbbbbo..","..obcbbmmbbcbo..","..obbbbbbbbbbo..","...obddddddbo...","....oobbbboo....","......oooo......","................"],
  shiro:["...oooo...","..owwwwo..",".owwwwwwo.","owwewwewwo","owwwwwwwwo","owwwmmwwwo",".owwwwwwo.","..oooooo.."],
};
/* adult body by care tier: perfect, 0–1, 2–5, 6+ */
export const TIER_SHAPE = ["tall", "round", "drop", "squat"];

export const ICONS = {
  poop:{g:["...o....","..obo...","..obbo..",".obblbo.",".obbbbo.","obbbbbbo","oooooooo"],p:{o:"#3b2a20",b:"#8a5a3b",l:"#b98257"}},
  poopd:{g:["...o....","..obo...","..obbo..",".obblbo.",".obbbbo.","obbbbbbo","oooooooo"],p:{o:"#1a120c",b:"#4a3020",l:"#6a4630"}},
  meat:{g:[".ooo..","orrro.","orlrow","orrro.",".ooo.."],p:{o:OUT,r:"#c9503f",l:"#f08a7a",w:"#ffffff"}},
  meat2:{g:[".oo..","orro.","orrow",".oo.."],p:{o:OUT,r:"#d9705f",w:"#ffffff"}},
  apple:{g:["...tg..",".ootoo.","orlrrro","orrrrro","orrrrro",".ooooo."],p:{o:OUT,r:"#e53950",l:"#ff9aa8",g:"#3fae5a",t:"#7a4a2a"}},
  carrot:{g:["..gg","..g.",".oo.","obbo","obo.","oo.."],p:{g:"#3fae5a",o:OUT,b:"#ff8a2a"}},
  worm:{g:["oo....","obo.oo","obbobo",".obbo."],p:{o:OUT,b:"#e8c27a"}},
  worm2:{g:["oo....","obo.oo","obbobo",".obbo."],p:{o:OUT,b:"#ff9fb0"}},
  fish:{g:["..ooo...o",".obbbo.ob","obebbbobo",".obbbo.ob","..ooo...o"],p:{o:OUT,b:"#ff9f4a",e:OUT}},
  shell:{g:["..o..",".obo.","obbbo","obobo","ooooo"],p:{o:OUT,b:"#ffd6c2"}},
  weed:{g:[".g..g.","gd.gd.",".gd.gd","gd.gd.",".gd.gd","..d..d"],p:{g:"#4cc46a",d:"#2b7a3f"}},
  weedr:{g:[".g..g.","gd.gd.",".gd.gd","gd.gd.",".gd.gd","..d..d"],p:{g:"#ef6a7a",d:"#b23a4a"}},
  shrimp:{g:[".oo...","obbo..","obbbo.","..obbo","...oo."],p:{o:OUT,b:"#ff8f7a"}},
  plankton:{g:[".g.g","g.g.",".g.g","g.g."],p:{g:"#7ad6a0"}},
  chicken:{g:["..ooo.",".obbbo","obbbbo",".obbo.","..ow..",".ow..."],p:{o:OUT,b:"#d98a3f",w:"#ffffff"}},
  chicken2:{g:[".ooo.","obbbo",".obo.","..ow."],p:{o:OUT,b:"#e8a060",w:"#ffffff"}},
  corn:{g:[".yy.","yyyy","yyyy","gyyg",".gg."],p:{y:"#ffd34d",g:"#3fae5a"}},
  cherry:{g:["..g..",".g.g.","rr.rr","rr.rr"],p:{g:"#3fae5a",r:"#e2304f"}},
  flower:{g:[".p.p.","ppypp",".p.p.","..g..","..g.."],p:{p:"#ff7fb6",y:"#ffd34d",g:"#3fae5a"}},
  honey:{g:[".kkk.","oyyyo","oywyo","oyyyo",".ooo."],p:{k:"#8a5a3b",o:OUT,y:"#f5b82e",w:"#ffe9a8"}},
  bowl:{g:["..sss..",".sssss.","ooooooo",".obbbo.","..ooo.."],p:{s:"#fff3d6",o:OUT,b:"#e2554f"}},
  pellet:{g:[".ooo.","obbbo","oblbo","obbbo",".ooo."],p:{o:OUT,b:"#c9a46a",l:"#f3e1c0"}},
  milk:{g:[".w.","www","bbb","bbb","bbb"],p:{w:"#ffffff",b:"#f3f3ff"}},
  jelly:{g:["..k","pp.","pp.","pp."],p:{k:"#c98a4b",p:"#7fd6ff"}},
  icecream:{g:[".ppp.","ppwpp",".ppp.",".yyy.","..y.."],p:{p:"#ff7fb6",w:"#ffffff",y:"#e0a85a"}},
  juice:{g:[".k.",".w.","ojo","ojo","ooo"],p:{k:"#e2554f",w:"#ffffff",o:OUT,j:"#ff9f4a"}},
  pancake:{g:["..y..","ooooo","ybbby","ooooo"],p:{y:"#ffd34d",o:"#c98a4b",b:"#f3e1c0"}},
  popcorn:{g:[".w.w.","wwwww","rwrwr","rwrwr"],p:{w:"#fff7e0",r:"#e2554f"}},
  tea:{g:[".www.","ogggo","ogggoo","ogggo",".ooo."],p:{w:"#ffffff",o:OUT,g:"#9fd08a"}},
  cotton:{g:[".ppp.","ppppp",".ppp.","..k..","..k.."],p:{p:"#ffb3d9",k:"#c98a4b"}},
  ufo:{g:["....oooo....","...oddddlo..","..oddddddo..",".oooooooooo.","ommmmmmmmmmo","omymmymmymmo",".oooooooooo.","...o....o..."],p:{o:OUT,d:"#aee8ff",l:"#ffffff",m:"#c9ccd8",y:"#ffd34d"}},
  star:{g:["..y..","..y..","yywyy",".yyy.",".y.y."],p:{y:"#ffe066",w:"#ffffff"}},
  starsad:{g:["..y..","..y..","yyyyy",".yyy.",".y.y."],p:{y:"#b8b08a"}},
  heart:{g:[".r.r.","rrrrr","rrrrr",".rrr.","..r.."],p:{r:"#ff4d7d"}},
  virus:{g:["g.d.g",".ggg.","dgegd",".ggg.","g.d.g"],p:{g:"#57c84d",d:"#2f7d2a",e:"#ffffff"}},
  ghost:{g:[".www.","wkwkw","wwwww","wwwww","w.w.w"],p:{w:"#eef0ff",k:OUT}},
  grim:{g:["..kkk..",".kkkkk.","kkwkwkk","kkkkkkk",".kkkkk.","kk.k.kk"],p:{k:"#3a2a50",w:"#ff6b6b"}},
  rocket:{g:["..w..",".wrw.",".wbw.",".www.","rw.wr","y...y"],p:{w:"#ffffff",r:"#e2554f",b:"#5ab0f0",y:"#ffd34d"}},
  cloud:{g:[".www.","wwwww",".www."],p:{w:"#d9d9e6"}},
  rock:{g:[".ooo.","olkko","okkko",".ooo."],p:{o:OUT,k:"#8a8fa3",l:"#c3c8d6"}},
  tree:{g:[".ggg.","ggggg","ggggg",".gtg.","..t.."],p:{g:"#3fae5a",t:"#8a5a3b"}},
  chest:{g:[".yyyy.","ykkkky","yyyyyy","ykyyky","yyyyyy"],p:{y:"#d9a03a",k:"#7a4a1a"}},
  meteor:{g:["..oo","rooo","roo.",".r.."],p:{o:"#8a6a5a",r:"#ff8a2a"}},
  vitamin:{g:[".yy.","yrry","yrry",".yy."],p:{y:"#ffd34d",r:"#e2554f"}},
  leaf:{g:["..gg",".ggg","ggg.","g..."],p:{g:"#5cbf4a"}},
  bubble:{g:[".bb.","bwbb","bbbb",".bb."],p:{b:"#7fd0ff",w:"#ffffff"}},
  cloudc:{g:[".ww.","wwww","wwww"],p:{w:"#ffffff"}},
  rice:{g:[".ww.","wwww","wkkw","wkkw"],p:{w:"#ffffff",k:"#2a2238"}},
  sun:{g:["y.y.y",".yyy.","yyyyy",".yyy.","y.y.y"],p:{y:"#ffb020"}},
  squig:{g:["k...k",".k.k.","..k..",".k.k."],p:{k:"#2a2238"}},
  sickc:{g:["r.r.r",".rrr.","rkrkr",".rrr.","r.r.r"],p:{r:"#c9203f",k:"#2a2238"}},
  vitc:{g:[".yy.","yrry","y.ry",".yy."],p:{y:"#ffd34d",r:"#e2554f"}},
  bandage:{g:["w.w",".w.","w.w"],p:{w:"#ffffff"}},
  shirodust:{g:[".kk.","kkkk","kwkk",".kk."],p:{k:"#9a9aa8",w:"#c9c9d6"}},
  vac:{g:[".k.","kkk","kwk",".k."],p:{k:"#5ab0f0",w:"#ffffff"}},
  burnt:{g:["..sss..",".sssss.","ooooooo",".okkko.","..ooo.."],p:{s:"#3a3030",o:OUT,k:"#2a2020"}},
};

/* two-colour templates for outside toys and deco items: a = colour 1, b = colour 2, c = white */
export const TPL = {
  bounce:["a.....a","aaaaaaa","bbbbbbb","b.....b"], box:["bbbbbbb","bacacab","bcacacb","bbbbbbb"], ring:["..aaa..",".a...a.","a..b..a",".a...a.","..aaa.."],
  pool:[".bbbbb.","baaaaab","baacaab",".bbbbb."], umbrella:["..aaa..",".aabaa.","aaaaaaa","...b...","...b...","..bbb.."],
  house:["...a...","..aaa..",".aaaaa.","aaaaaaa",".bbbbb.",".bbcbb.",".bbcbb."], balloon:[".a..b.","aaabbb",".a..b.","..cc..","..c...","..c..."],
  stump:[".bbb.","baaab","bbbbb","bbbbb"], cone:["..a..",".aba.",".aaa.","aaaaa","bbbbb"], dome:[".aaa.","aaaaa","aabaa","bbbbb"],
  crown:["a.a.a","aabaa","aaaaa"], bow:["aa.aa","abbba","aa.aa"], held:["..a.",".aa.","aab.","..b.","..b."], glasses:["aa.aa","aabaa","aa.aa"],
};
export const TOY_TPL = { tramp:"bounce", ballpit:"box", wheel:"ring", pool:"pool", parasol:"umbrella", swimring:"ring", house:"house", ferris:"ring",
  balloons:"balloon", sandbox:"box", tire:"ring", stump:"stump", onsen:"pool", merry:"umbrella", hammock:"bounce" };
export const TOY_COL = { tramp:["#5ab0f0","#2a2238"], ballpit:["#ff7fb6","#ffd34d"], wheel:["#e2554f","#c3c8d6"], pool:["#7fd0ff","#ffffff"], parasol:["#ff7fb6","#ffffff"],
  swimring:["#ff8a2a","#ffffff"], house:["#e2554f","#f3e1c0"], ferris:["#9b7bff","#ffd34d"], balloons:["#e2554f","#5ab0f0"], sandbox:["#f0cf7a","#c98a4b"],
  tire:["#3a3a44","#8a8fa3"], stump:["#8a5a3b","#c98a4b"], onsen:["#bfe8ff","#8a8fa3"], merry:["#ffd34d","#e2554f"], hammock:["#3fae5a","#8a5a3b"] };

for (const k in GRID) GRID[k] = pad(GRID[k]);
for (const k in ICONS) ICONS[k].g = pad(ICONS[k].g);
for (const k in TPL) TPL[k] = pad(TPL[k]);
