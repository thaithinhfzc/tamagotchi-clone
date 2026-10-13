// Ephemeral UI state (never saved). mode: start | main | menu | list | anim | game
export const ui = {
  mode:"start", zoom:2, startSel:0, statusPage:0,
  menuStack:[], list:null, toast:null, anim:null, game:null,
  flashUntil:0, zoomFx:0, lastA:0, lastB:0,
  // wandering positions for the Tama view, Field view and field residents
  tama:{ x:48, tx:48, face:false, next:0 },
  field:{ x:48, tx:48, face:false, next:0 },
  walkers:null, walkersKey:"",
};
