/* Koruk Asistan — Kat Planı · simgeler ve çizgi/alan biçimleri
 * Katalogdaki (kat-plani-core.js › SEMBOLLER) her sembolün çizimi IC tablosunda AYNI kimlikle durur; çizgi ve alan türlerinin (YOL_TURLERI)
 * çizimi yolCizLw'dedir. Editör ekranı, palet, lejant, JPEG/PDF ve yazdırma hep bu işlevlerle çizer (ekranda gördüğünüz çıktıdır).
 * Yeni sembol eklemek: core.SEMBOLLER'e satır + IC tablosuna aynı kimlikle bir işlev.
 *
 * Simge kutusu ±.75 birimdir (1 birim = sembolün yarı kenarı). Kare rozette beyaz, sarı üçgende siyah, beyaz fayansta siyah çizilir.
 */
(function(global){
'use strict';
if(global.KatPlaniSimge)return;
const core=()=>global.KatPlaniCore;

function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
let _font=null;
function yazitipi(){
  if(_font)return _font;
  try{_font=getComputedStyle(document.documentElement).getPropertyValue('--ka-font').trim()||null}catch(_){}
  return _font||'system-ui,"Segoe UI",sans-serif';
}
let _olcu=null;
/* Oda adı kutusunun genişliği için yazı ölçüsü (editördeki isabet sınaması ile çizim aynı ölçüyü kullanır) */
function metinGenislik(t,fs){
  try{_olcu=_olcu||document.createElement('canvas').getContext('2d');_olcu.font='800 '+fs+'px '+yazitipi();return _olcu.measureText(t).width}
  catch(_){return String(t).length*fs*.6}
}

/* ───────── kaplar ───────── */
function rozet(c,s,renk,kenar){
  rr(c,-s/2,-s/2,s,s,s*.14);c.fillStyle=renk;c.fill();
  c.lineWidth=s*.05;c.strokeStyle=kenar||'rgba(0,0,0,.45)';c.stroke();
}
function ucgen(c,u){
  c.beginPath();c.moveTo(0,-u*1.0);c.lineTo(u*1.02,u*.82);c.lineTo(-u*1.02,u*.82);c.closePath();
  c.fillStyle=core().RENK.sari;c.fill();c.lineWidth=u*.14;c.strokeStyle='#111';c.stroke();
}

/* ───────── çizim yardımcıları (simge birimi) ───────── */
const cizgi=(c,p)=>{c.beginPath();p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke()};
const dolgu=(c,p)=>{c.beginPath();p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.closePath();c.fill()};
const daire=(c,x,y,r)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()};
const halka=(c,x,y,r)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke()};
function ok(c,boy){                         /* sağa bakan ok */
  c.beginPath();c.moveTo(-boy,0);c.lineTo(boy*.55,0);c.stroke();
  c.beginPath();c.moveTo(boy,0);c.lineTo(boy*.25,-.34);c.lineTo(boy*.25,.34);c.closePath();c.fill();
}
function alev(c,k,bg){                      /* alev; bg: içindeki oyuğun rengi */
  c.save();c.scale(k,k);
  c.beginPath();c.moveTo(0,-.75);c.bezierCurveTo(.12,-.3,.55,-.1,.5,.3);c.bezierCurveTo(.45,.62,.2,.75,0,.75);c.bezierCurveTo(-.25,.75,-.5,.55,-.5,.25);c.bezierCurveTo(-.5,-.05,-.15,-.2,0,-.75);c.closePath();c.fill();
  c.fillStyle=bg;c.beginPath();c.moveTo(.02,.1);c.bezierCurveTo(.2,.28,.26,.45,.14,.58);c.bezierCurveTo(.08,.64,-.18,.64,-.2,.42);c.bezierCurveTo(-.22,.26,-.04,.2,.02,.1);c.closePath();c.fill();
  c.restore();
}
function kisi(c,x,y,k){                     /* ayakta insan silüeti: baş + gövde */
  c.save();c.translate(x,y);c.scale(k,k);
  daire(c,0,-.5,.2);c.beginPath();c.moveTo(-.3,.6);c.lineTo(-.3,-.12);c.quadraticCurveTo(0,-.3,.3,-.12);c.lineTo(.3,.6);c.closePath();c.fill();
  c.restore();
}
function ahize(c){                          /* telefon ahizesi */
  c.lineWidth=.17;c.beginPath();c.moveTo(-.5,-.2);c.quadraticCurveTo(0,.62,.5,-.2);c.stroke();daire(c,-.5,-.2,.17);daire(c,.5,-.2,.17);
}
function merdivenIc(c){c.lineWidth=.16;cizgi(c,[[-.7,.62],[-.7,.3],[-.35,.3],[-.35,-.02],[0,-.02],[0,-.34],[.35,-.34],[.35,-.66],[.72,-.66]])}
function merdivenOk(c,yon){                 /* yon: 1 yukarı, -1 aşağı, 0 ikisi */
  c.lineWidth=.14;cizgi(c,[[-.1,.64],[-.1,.38],[.12,.38],[.12,.12],[.34,.12],[.34,-.14],[.56,-.14],[.56,-.4],[.74,-.4]]);
  const o=(x,yukari)=>{c.lineWidth=.12;cizgi(c,[[x,-.3],[x,.3]]);dolgu(c,yukari?[[x,-.62],[x-.17,-.32],[x+.17,-.32]]:[[x,.62],[x-.17,.32],[x+.17,.32]])};
  if(yon===0){o(-.62,true);o(-.34,false)}else o(-.5,yon>0);
}
function noktaIc(c,renk){
  c.beginPath();c.arc(0,0,.62,0,Math.PI*2);c.fillStyle=renk;c.fill();c.lineWidth=.14;c.strokeStyle='#fff';c.stroke();
  c.lineWidth=.05;c.strokeStyle='rgba(0,0,0,.5)';c.beginPath();c.arc(0,0,.7,0,Math.PI*2);c.stroke();
}

/* ───────── simgeler ───────── */
const IC={
  /* tahliye ve yönlendirme */
  kosan(c){
    daire(c,.2,-.58,.13);c.lineWidth=.17;
    cizgi(c,[[.12,-.4],[-.02,.08]]);cizgi(c,[[.1,-.3],[.38,-.12],[.52,-.3]]);cizgi(c,[[.1,-.3],[-.2,-.2],[-.34,-.04]]);
    cizgi(c,[[-.02,.08],[.26,.24],[.18,.6]]);cizgi(c,[[-.02,.08],[-.22,.4],[-.52,.46]]);
  },
  acil_kapi(c){c.lineWidth=.12;rr(c,-.42,-.7,.84,1.4,.05);c.stroke();daire(c,.22,.04,.07);c.lineWidth=.1;cizgi(c,[[-.2,-.5],[-.2,.5]])},
  cikis(c){c.lineWidth=.2;ok(c,.62);c.lineWidth=.14;cizgi(c,[[.74,-.58],[.74,.58]])},
  yon(c){c.lineWidth=.26;ok(c,.62)},
  merdiven_cikis(c){merdivenOk(c,1)},
  merdiven_inis(c){merdivenOk(c,-1)},
  engelli_tahliye(c){
    c.save();c.translate(-.2,.02);c.scale(.8,.8);IC.engelli(c);c.restore();
    c.lineWidth=.12;cizgi(c,[[.34,.02],[.62,.02]]);dolgu(c,[[.74,.02],[.56,-.14],[.56,.18]]);
  },
  /* yangın güvenliği */
  sondurucu(c){
    rr(c,-.34,-.02,.68,.86,.12);c.fill();c.fillRect(-.12,-.34,.24,.34);
    c.lineWidth=.14;cizgi(c,[[-.12,-.36],[.3,-.42]]);
    c.lineWidth=.1;c.beginPath();c.moveTo(.3,-.42);c.quadraticCurveTo(.62,-.1,.5,.3);c.stroke();
  },
  yangin_dolabi(c){
    c.lineWidth=.12;rr(c,-.6,-.68,1.2,1.36,.08);c.stroke();
    c.lineWidth=.1;[-.36,-.14,.08,.3].forEach(y=>cizgi(c,[[-.38,y],[.12,y]]));daire(c,.34,-.1,.12);cizgi(c,[[.34,-.1],[.34,.36]]);
  },
  hortum(c){
    c.lineWidth=.16;halka(c,0,-.08,.5);daire(c,0,-.08,.16);
    c.lineWidth=.1;c.beginPath();c.moveTo(.36,.28);c.quadraticCurveTo(.7,.56,.2,.7);c.stroke();
  },
  hidrant(c){
    c.fillRect(-.3,-.16,.6,.79);c.beginPath();c.arc(0,-.15,.3,Math.PI,0);c.fill();
    c.fillRect(-.12,-.58,.24,.2);c.fillRect(-.52,.02,.24,.2);c.fillRect(.28,.02,.24,.2);c.fillRect(-.42,.55,.84,.14);
  },
  alarm(c){
    daire(c,0,-.04,.3);c.lineWidth=.12;
    c.beginPath();c.arc(0,-.04,.56,Math.PI*.8,Math.PI*1.2);c.stroke();
    c.beginPath();c.arc(0,-.04,.56,-Math.PI*.2,Math.PI*.2);c.stroke();
    c.fillRect(-.4,.5,.8,.16);
  },
  siren(c){
    c.beginPath();c.moveTo(-.5,.32);c.quadraticCurveTo(-.5,-.55,0,-.55);c.quadraticCurveTo(.5,-.55,.5,.32);c.closePath();c.fill();
    c.fillRect(-.64,.3,1.28,.14);daire(c,0,.62,.1);daire(c,0,-.64,.08);
  },
  ihbar(c){
    c.lineWidth=.12;rr(c,-.62,-.58,1.24,1.16,.1);c.stroke();
    [-.3,0,.3].forEach(x=>daire(c,x,-.26,.08));c.fillRect(-.4,.02,.8,.13);c.fillRect(-.4,.28,.5,.1);
  },
  yangin_merdiveni(c){c.lineWidth=.13;cizgi(c,[[-.32,-.7],[-.32,.7]]);cizgi(c,[[.32,-.7],[.32,.7]]);c.lineWidth=.1;[-.45,-.15,.15,.45].forEach(y=>cizgi(c,[[-.32,y],[.32,y]]))},
  battaniye(c){c.lineWidth=.1;rr(c,-.5,-.5,1,1.1,.06);c.stroke();[-.2,.05,.3].forEach(y=>cizgi(c,[[-.3,y],[.3,y]]));c.fillRect(-.16,-.7,.32,.16)},
  balta(c){c.lineWidth=.14;cizgi(c,[[-.5,.68],[.2,-.4]]);dolgu(c,[[0,-.62],[.5,-.66],[.64,-.1],[.2,-.12],[-.02,-.34]])},
  kova(c){dolgu(c,[[-.5,-.28],[.5,-.28],[.38,.58],[-.38,.58]]);c.fillRect(-.56,-.4,1.12,.12);c.lineWidth=.09;c.beginPath();c.arc(0,-.4,.46,Math.PI,0);c.stroke()},
  sprinkler(c){
    c.lineWidth=.14;cizgi(c,[[0,-.72],[0,-.3]]);c.fillRect(-.16,-.32,.32,.16);c.lineWidth=.12;cizgi(c,[[-.34,-.1],[.34,-.1]]);
    c.lineWidth=.09;[[-.36,.1,-.5,.42],[-.16,.12,-.2,.55],[0,.12,0,.6],[.16,.12,.2,.55],[.36,.1,.5,.42]].forEach(a=>cizgi(c,[[a[0],a[1]],[a[2],a[3]]]));
  },
  yangin_telefonu(c,bg){c.save();c.translate(-.1,.15);c.scale(.8,.8);ahize(c);c.restore();c.save();c.translate(.42,-.4);alev(c,.3,bg);c.restore()},
  yangin_kapisi(c,bg){
    c.lineWidth=.12;rr(c,-.44,-.72,.88,1.44,.06);c.stroke();
    c.save();c.translate(0,.1);alev(c,.4,bg);c.restore();
  },
  /* ilk yardım ve sağlık */
  ilkyardim(c){c.lineWidth=.12;rr(c,-.62,-.62,1.24,1.24,.1);c.stroke();c.fillRect(-.12,-.38,.24,.76);c.fillRect(-.38,-.12,.76,.24)},
  ilkyardim_noktasi(c){c.fillRect(-.17,-.56,.34,1.12);c.fillRect(-.56,-.17,1.12,.34)},
  revir(c,bg){dolgu(c,[[0,-.68],[.72,-.02],[.52,-.02],[.52,.62],[-.52,.62],[-.52,-.02],[-.72,-.02]]);c.fillStyle=bg;c.fillRect(-.07,.0,.14,.5);c.fillRect(-.22,.15,.44,.14)},
  sedye(c){
    c.fillRect(-.62,-.1,1.24,.2);c.fillRect(-.74,-.18,.16,.36);c.fillRect(.58,-.18,.16,.36);
    c.lineWidth=.1;cizgi(c,[[-.4,.1],[-.4,.4]]);cizgi(c,[[.4,.1],[.4,.4]]);cizgi(c,[[-.55,.4],[-.25,.4]]);cizgi(c,[[.25,.4],[.55,.4]]);
  },
  aed(c,bg){
    c.beginPath();c.moveTo(0,.68);c.bezierCurveTo(-.85,.08,-.62,-.62,0,-.22);c.bezierCurveTo(.62,-.62,.85,.08,0,.68);c.closePath();c.fill();
    c.fillStyle=bg;dolgu(c,[[.1,-.3],[-.2,.12],[0,.12],[-.1,.5],[.22,0],[.02,0]]);
  },
  acil_dus(c){
    c.lineWidth=.12;cizgi(c,[[0,-.72],[0,-.5]]);dolgu(c,[[-.42,-.46],[.42,-.46],[.26,-.24],[-.26,-.24]]);
    c.lineWidth=.09;[-.3,-.1,.1,.3].forEach(x=>{cizgi(c,[[x,-.1],[x,-.02]]);cizgi(c,[[x,.18],[x,.26]]);cizgi(c,[[x,.46],[x,.54]])});
  },
  goz_dusu(c){
    c.lineWidth=.1;c.beginPath();c.moveTo(-.64,.1);c.quadraticCurveTo(0,-.5,.64,.1);c.quadraticCurveTo(0,.7,-.64,.1);c.stroke();daire(c,0,.1,.18);
    [-.3,0,.3].forEach(x=>cizgi(c,[[x,-.72],[x,-.52]]));
  },
  saglik_personeli(c,bg){
    daire(c,0,-.3,.2);c.fillRect(-.26,-.66,.52,.14);
    c.beginPath();c.moveTo(-.5,.62);c.quadraticCurveTo(-.5,.04,0,.04);c.quadraticCurveTo(.5,.04,.5,.62);c.closePath();c.fill();
    c.fillStyle=bg;c.fillRect(-.05,.2,.1,.32);c.fillRect(-.16,.31,.32,.1);
  },
  ilkyardim_malzeme(c,bg){
    rr(c,-.6,-.3,1.2,.9,.1);c.fill();c.lineWidth=.1;cizgi(c,[[-.2,-.3],[-.2,-.5],[.2,-.5],[.2,-.3]]);
    c.fillStyle=bg;c.fillRect(-.06,-.08,.12,.46);c.fillRect(-.23,.1,.46,.12);
  },
  /* tehlike ve uyarı */
  pano(c){dolgu(c,[[.18,-.72],[-.4,.12],[-.04,.12],[-.2,.72],[.4,-.14],[.06,-.14]])},
  genel_tehlike(c){rr(c,-.1,-.62,.2,.78,.1);c.fill();daire(c,0,.46,.12)},
  yanici(c,bg){alev(c,.95,bg)},
  patlayici(c){const p=[];for(let i=0;i<16;i++){const r=i%2?.32:.72,a=i*Math.PI/8;p.push([Math.cos(a)*r,Math.sin(a)*r])}dolgu(c,p)},
  zehirli(c,bg){
    c.lineWidth=.1;cizgi(c,[[-.58,.4],[.58,.7]]);cizgi(c,[[.58,.4],[-.58,.7]]);daire(c,0,-.15,.4);c.fillRect(-.2,.1,.4,.3);
    c.fillStyle=bg;daire(c,-.16,-.18,.1);daire(c,.16,-.18,.1);dolgu(c,[[0,-.02],[-.06,.1],[.06,.1]]);
  },
  biyolojik(c){c.lineWidth=.1;halka(c,0,-.26,.3);halka(c,-.26,.18,.3);halka(c,.26,.18,.3);daire(c,0,0,.1)},
  radyasyon(c){
    for(let i=0;i<3;i++){const a=(-90+i*120)*Math.PI/180-Math.PI/6;c.beginPath();c.arc(0,0,.7,a,a+Math.PI/3);c.arc(0,0,.24,a+Math.PI/3,a,true);c.closePath();c.fill()}
    daire(c,0,0,.12);
  },
  kaygan(c){
    daire(c,-.2,-.5,.12);c.lineWidth=.15;cizgi(c,[[-.16,-.34],[.08,.06],[.4,.24]]);cizgi(c,[[.08,.06],[-.16,.42]]);cizgi(c,[[-.1,-.2],[.2,-.2]]);cizgi(c,[[-.62,.62],[.62,.62]]);
  },
  makine(c){c.lineWidth=.14;halka(c,0,0,.34);for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);c.fillRect(-.08,-.62,.16,.22);c.restore()}},
  dusme(c){
    c.lineWidth=.12;cizgi(c,[[-.68,-.1],[-.2,-.1],[-.2,.62]]);daire(c,.1,-.2,.12);
    c.lineWidth=.15;cizgi(c,[[.14,-.04],[.3,.34]]);cizgi(c,[[.14,-.04],[.5,-.14]]);cizgi(c,[[.14,-.04],[-.04,-.3]]);cizgi(c,[[.3,.34],[.1,.62]]);cizgi(c,[[.3,.34],[.5,.5]]);
  },
  yuksek_sicaklik(c){
    c.lineWidth=.12;rr(c,-.12,-.62,.24,.9,.12);c.stroke();daire(c,0,.4,.24);c.fillRect(-.035,-.1,.07,.5);
    c.lineWidth=.09;[-.45,-.25,-.05].forEach(y=>cizgi(c,[[.28,y],[.5,y]]));
  },
  dusuk_sicaklik(c){
    c.lineWidth=.1;
    for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI/3);cizgi(c,[[0,-.68],[0,.68]]);c.restore()}
    for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);cizgi(c,[[-.14,-.5],[0,-.36],[.14,-.5]]);c.restore()}
  },
  kimyasal(c){
    c.lineWidth=.13;cizgi(c,[[-.2,-.7],[-.2,-.2],[-.68,.52],[.68,.52],[.2,-.2],[.2,-.7]]);cizgi(c,[[-.32,-.7],[.32,-.7]]);
    dolgu(c,[[-.44,.12],[.44,.12],[.68,.52],[-.68,.52]]);
  },
  /* yapı ve tesis */
  asansor(c){
    c.lineWidth=.12;rr(c,-.62,-.72,1.24,1.44,.1);c.stroke();
    dolgu(c,[[-.24,-.5],[-.42,-.1],[-.06,-.1]]);dolgu(c,[[.24,.5],[.06,.1],[.42,.1]]);
  },
  asansor_yasak(c){IC.asansor(c);c.lineWidth=.14;cizgi(c,[[-.7,-.7],[.7,.7]])},
  wc(c){c.save();c.scale(.01,.01);c.font='800 66px '+yazitipi();c.textAlign='center';c.textBaseline='middle';c.fillText('WC',0,4);c.restore()},
  su(c){
    c.beginPath();c.moveTo(0,-.7);c.bezierCurveTo(.15,-.4,.55,.05,.55,.3);c.bezierCurveTo(.55,.62,.3,.78,0,.78);c.bezierCurveTo(-.3,.78,-.55,.62,-.55,.3);c.bezierCurveTo(-.55,.05,-.15,-.4,0,-.7);c.closePath();c.fill();
  },
  su_vanasi(c){
    c.lineWidth=.14;cizgi(c,[[-.26,-.66],[.26,-.66]]);cizgi(c,[[0,-.66],[0,-.4]]);rr(c,-.45,-.4,.8,.2,.05);c.fill();
    c.fillRect(-.7,-.36,.3,.14);c.fillRect(.18,-.2,.2,.3);daire(c,.28,.46,.1);
  },
  dogalgaz(c){
    c.lineWidth=.16;cizgi(c,[[-.74,.3],[.74,.3]]);dolgu(c,[[-.36,.02],[0,.3],[-.36,.58]]);dolgu(c,[[.36,.02],[0,.3],[.36,.58]]);
    c.lineWidth=.12;cizgi(c,[[0,.3],[0,-.28]]);c.lineWidth=.14;cizgi(c,[[-.34,-.3],[.34,-.3]]);
  },
  salter(c){
    c.lineWidth=.13;rr(c,-.46,-.7,.92,1.4,.1);c.stroke();
    c.lineWidth=.16;cizgi(c,[[0,.36],[.18,-.34]]);daire(c,.18,-.42,.13);daire(c,0,.4,.1);
  },
  kazan(c,bg){
    c.lineWidth=.14;rr(c,-.46,-.55,.92,1.05,.2);c.stroke();
    c.fillRect(-.12,-.78,.24,.22);c.fillRect(-.38,.5,.2,.22);c.fillRect(.18,.5,.2,.22);
    alev(c,.34,bg);
  },
  jenerator(c){
    c.lineWidth=.13;rr(c,-.7,-.42,1.4,.9,.12);c.stroke();
    dolgu(c,[[.1,-.3],[-.24,.1],[-.02,.1],[-.1,.4],[.24,-.06],[.02,-.06]]);
    c.fillRect(-.55,.46,.22,.18);c.fillRect(.33,.46,.22,.18);
  },
  teknik_oda(c){
    c.lineWidth=.14;cizgi(c,[[-.5,.55],[.25,-.2]]);c.lineWidth=.16;c.beginPath();c.arc(.4,-.38,.24,Math.PI*.15,Math.PI*1.7);c.stroke();
    c.lineWidth=.1;cizgi(c,[[.5,.55],[-.2,-.15]]);c.lineWidth=.16;cizgi(c,[[-.2,-.15],[-.34,-.3]]);
  },
  havalandirma(c){
    for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI*2/3);c.beginPath();c.ellipse(0,-.3,.17,.3,0,0,Math.PI*2);c.fill();c.restore()}
    daire(c,0,0,.1);c.lineWidth=.08;halka(c,0,0,.66);
  },
  cop(c,bg){
    dolgu(c,[[-.4,-.28],[.4,-.28],[.32,.65],[-.32,.65]]);c.fillRect(-.52,-.46,1.04,.12);c.fillRect(-.14,-.6,.28,.12);
    c.strokeStyle=bg;c.lineWidth=.07;[-.16,0,.16].forEach(x=>cizgi(c,[[x,-.14],[x,.5]]));
  },
  /* acil durum ekipmanları */
  anons(c){
    dolgu(c,[[-.58,-.16],[-.2,-.16],[.3,-.5],[.3,.5],[-.2,.16],[-.58,.16]]);c.fillRect(-.4,.16,.16,.34);
    c.lineWidth=.09;c.beginPath();c.arc(.3,0,.28,-.9,.9);c.stroke();c.beginPath();c.arc(.3,0,.5,-.8,.8);c.stroke();
  },
  aydinlatma(c){
    c.beginPath();c.arc(0,.1,.4,Math.PI,0);c.closePath();c.fill();c.fillRect(-.52,.1,1.04,.12);
    c.lineWidth=.1;[-60,-90,-120,-30,-150].forEach(d=>{const a=d*Math.PI/180;cizgi(c,[[Math.cos(a)*.52,.1+Math.sin(a)*.52],[Math.cos(a)*.72,.1+Math.sin(a)*.72]])});
  },
  duman(c){
    c.lineWidth=.12;halka(c,0,.1,.5);daire(c,0,.1,.16);
    [-150,-90,-30].forEach(d=>{const a=d*Math.PI/180;cizgi(c,[[Math.cos(a)*.66,.1+Math.sin(a)*.66],[Math.cos(a)*.82,.1+Math.sin(a)*.82]])});
  },
  isi_dedektoru(c){c.lineWidth=.1;halka(c,0,.05,.55);c.fillRect(-.045,-.32,.09,.45);daire(c,0,.2,.14)},
  alev_dedektoru(c,bg){c.lineWidth=.1;halka(c,0,0,.62);alev(c,.4,bg)},
  acil_telefon(c){ahize(c)},
  kum_unitesi(c){c.lineWidth=.1;rr(c,-.56,.05,1.12,.55,.06);c.stroke();dolgu(c,[[-.46,.05],[0,-.5],[.46,.05]])},
  acil_canta(c,bg){
    rr(c,-.6,-.3,1.2,.9,.12);c.fill();c.lineWidth=.1;cizgi(c,[[-.2,-.3],[-.2,-.5],[.2,-.5],[.2,-.3]]);
    c.fillStyle=bg;c.fillRect(-.6,.06,1.2,.08);c.fillRect(-.07,-.02,.14,.24);
  },
  acil_dugme(c){c.lineWidth=.1;halka(c,0,0,.58);daire(c,0,0,.34)},
  /* erişilebilirlik */
  engelli(c){
    daire(c,-.12,-.56,.12);c.lineWidth=.12;
    cizgi(c,[[-.12,-.32],[-.12,.12],[.28,.12],[.42,.5]]);cizgi(c,[[-.12,-.1],[.2,-.1]]);
    c.beginPath();c.arc(-.08,.26,.38,Math.PI*.25,Math.PI*1.5);c.stroke();
  },
  rampa(c){dolgu(c,[[-.7,.5],[.7,.5],[.7,-.35]])},
  engelli_wc(c){
    c.save();c.translate(.2,.14);c.scale(.78,.78);IC.engelli(c);c.restore();
    c.save();c.scale(.01,.01);c.font='800 40px '+yazitipi();c.textAlign='center';c.textBaseline='middle';c.fillText('WC',-34,-48);c.restore();
  },
  gorme_engelli(c){for(let i=0;i<5;i++)for(let j=0;j<5;j++)daire(c,-.52+i*.26,-.52+j*.26,.075)},
  isitme_engelli(c){
    c.lineWidth=.12;c.beginPath();c.arc(.05,-.15,.4,Math.PI*1.05,Math.PI*2.1);c.stroke();c.beginPath();c.arc(.02,-.12,.2,Math.PI*1.2,Math.PI*2);c.stroke();
    cizgi(c,[[.45,-.1],[.4,.25],[.15,.5],[-.1,.45]]);cizgi(c,[[-.56,-.56],[.56,.56]]);
  },
  engelli_asansor(c){c.lineWidth=.1;rr(c,-.64,-.72,1.28,1.44,.1);c.stroke();c.save();c.translate(0,.05);c.scale(.55,.55);IC.engelli(c);c.restore()},
  /* toplanma ve güvenli alanlar */
  toplanma(c){
    c.lineWidth=.14;
    for(let i=0;i<4;i++){c.save();c.rotate(i*Math.PI/2);c.translate(-.04,-.08);c.rotate(Math.PI/2);c.translate(-.74,0);c.beginPath();c.moveTo(0,0);c.lineTo(.5,0);c.stroke();c.beginPath();c.moveTo(.72,0);c.lineTo(.38,-.24);c.lineTo(.38,.24);c.closePath();c.fill();c.restore()}
  },
  guvenli_alan(c){
    c.lineWidth=.11;c.beginPath();c.moveTo(0,-.68);c.lineTo(.52,-.48);c.lineTo(.52,0);c.quadraticCurveTo(.52,.42,0,.7);c.quadraticCurveTo(-.52,.42,-.52,0);c.lineTo(-.52,-.48);c.closePath();c.stroke();
    c.lineWidth=.13;cizgi(c,[[-.22,0],[-.04,.2],[.26,-.2]]);
  },
  dis_toplanma(c){daire(c,-.3,-.2,.3);c.fillRect(-.34,.05,.08,.4);kisi(c,.34,.1,.5);c.lineWidth=.08;cizgi(c,[[-.65,.6],[.65,.6]])},
  ic_toplanma(c){c.lineWidth=.12;cizgi(c,[[-.66,-.02],[0,-.66],[.66,-.02]]);kisi(c,-.28,.2,.38);kisi(c,0,.2,.38);kisi(c,.28,.2,.38)},
  siginak(c,bg){
    dolgu(c,[[0,-.68],[.72,-.02],[.52,-.02],[.52,.62],[-.52,.62],[-.52,-.02],[-.72,-.02]]);
    c.fillStyle=bg;c.fillRect(-.14,.12,.28,.5);
  },
  /* plan sembolleri */
  merdiven(c){merdivenIc(c)},
  kat_gecisi(c){merdivenOk(c,0)},
  kapi(c){c.lineWidth=.12;rr(c,-.34,-.66,.68,1.32,.04);c.stroke();daire(c,.16,.04,.07)},
  kapi_acilis(c){
    c.lineWidth=.12;cizgi(c,[[-.5,.55],[-.5,-.5]]);
    c.lineWidth=.09;c.setLineDash([.12,.1]);c.beginPath();c.arc(-.5,.55,1.05,-Math.PI/2,0);c.stroke();c.setLineDash([]);
    dolgu(c,[[.55,.72],[.43,.46],[.67,.46]]);
  },
  sutun(c){c.fillStyle='#111';c.strokeStyle='#fff';c.lineWidth=.12;rr(c,-.5,-.5,1,1,.04);c.fill();c.stroke()},
  tahliye_noktasi(c){noktaIc(c,core().RENK.yesil)},
  yangin_noktasi(c){noktaIc(c,core().RENK.kirmizi)},
  onemli_nokta(c){
    c.beginPath();c.moveTo(0,.74);c.bezierCurveTo(-.64,0,-.52,-.74,0,-.74);c.bezierCurveTo(.52,-.74,.64,0,0,.74);c.closePath();
    c.fillStyle='#111';c.fill();c.lineWidth=.1;c.strokeStyle='#fff';c.stroke();c.fillStyle='#fff';daire(c,0,-.2,.2);
  }
};

/* Oda adı: beyaz zeminli, koyu çerçeveli yazı kutusu. s: boyut (yazı yüksekliği s/2) */
function etiketCiz(c,s,metin){
  const fs=s*.5,t=metin||'Oda adı';
  c.font='800 '+fs+'px '+yazitipi();c.textAlign='center';c.textBaseline='middle';
  const bw=c.measureText(t).width+fs*.9,bh=fs*1.6;
  rr(c,-bw/2,-bh/2,bw,bh,bh*.22);c.fillStyle='rgba(255,255,255,.94)';c.fill();c.lineWidth=fs*.09;c.strokeStyle='#111';c.stroke();
  c.fillStyle='#111';c.fillText(t,0,fs*.04);
}
/* Bir sembolü (x,y) merkezli, s kenar uzunluğunda çizer. aci: döndürme (yalnız katalogda don olanlar). metin: oda adı yazısı */
function sembolCiz(c,tur,x,y,s,aci,metin){
  const sb=core().sembol(tur);if(!sb)return;
  const u=s/2;
  c.save();c.translate(x,y);c.lineCap='round';c.lineJoin='round';
  if(sb.sekil==='yazi'){etiketCiz(c,s,metin);c.restore();return}
  let bg=sb.renk;
  if(sb.sekil==='ucgen'){ucgen(c,u);c.fillStyle=c.strokeStyle='#111';c.translate(0,u*.24);c.scale(u*.62,u*.62)}
  else if(sb.sekil==='beyaz'){rozet(c,s,'#fff','#111');bg='#fff';c.fillStyle=c.strokeStyle='#111';c.scale(u,u)}
  else if(sb.sekil==='ham'){bg='#fff';c.fillStyle=c.strokeStyle='#111';c.scale(u*1.15,u*1.15)}
  else{rozet(c,s,sb.renk);c.fillStyle=c.strokeStyle='#fff';c.scale(u,u)}
  if(sb.don)c.rotate((aci||0)*Math.PI/180);
  if(IC[tur])IC[tur](c,bg);
  c.restore();
}
/* Plandaki bir öğe: sembol + (varsa) altında etiketi. s: bu öğenin boyutu (genel boyut × kendi çarpanı) */
function ogeCiz(c,o,s){
  sembolCiz(c,o.tur,o.x,o.y,s,o.aci,o.not);
  if(o.tur==='etiket'||!o.not)return;
  const fs=s*.36;
  c.save();c.font='700 '+fs+'px '+yazitipi();c.textAlign='center';c.textBaseline='top';c.lineJoin='round';
  c.lineWidth=fs*.34;c.strokeStyle='rgba(255,255,255,.95)';c.strokeText(o.not,o.x,o.y+s*.5+fs*.12);
  c.fillStyle='#111';c.fillText(o.not,o.x,o.y+s*.5+fs*.12);c.restore();
}

/* ───────── çizgi ve alan türleri ───────── */
const hexA=(h,a)=>{const n=parseInt(String(h).slice(1),16);return`rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`};
/* y: {tur,noktalar}; w: çizgi kalınlığı (model birimi, türün kalınlık çarpanı dahil); aralikK: ok aralığı (w × aralikK) */
function yolCizLw(c,y,w,aralikK){
  const C=core(),st=C.yolStil(y.tur),p=st.kapali?C.kapaliNoktalar(y.noktalar):y.noktalar;
  if(!p||p.length<2)return;
  const iz=()=>{c.beginPath();p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));if(st.kapali)c.closePath()};
  c.save();c.lineJoin='round';c.lineCap='round';
  if(st.kapali){                                    /* alan: hafif dolgu + (taralı | kesikli) sınır */
    iz();c.fillStyle=hexA(st.renk,st.cizgi==='tarali'?.1:.09);c.fill();
    if(st.cizgi==='tarali'){
      c.save();iz();c.clip();
      let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;p.forEach(q=>{x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])});
      c.strokeStyle=hexA(st.renk,.7);c.lineWidth=w*.3;c.lineCap='butt';const h=y1-y0,a=w*1.6;
      for(let d=-h;d<=x1-x0;d+=a){c.beginPath();c.moveTo(x0+d,y1);c.lineTo(x0+d+h,y0);c.stroke()}
      c.restore();
      iz();c.lineWidth=w*.4;c.strokeStyle=st.renk;c.stroke();
    }else{iz();c.setLineDash([w*1.9,w*1.2]);c.lineCap='butt';c.lineWidth=w*.5;c.strokeStyle=st.renk;c.stroke()}
    c.restore();return;
  }
  const kesik=st.cizgi==='kesik'?[w*2.6,w*1.7]:[];
  c.setLineDash(kesik);if(kesik.length||st.ok)c.lineCap='butt';        /* okluların ucu okun ucunu aşmasın */
  if(st.ok||st.id==='bolge'){iz();c.lineWidth=w*1.5;c.strokeStyle='#fff';c.stroke()}     /* beyaz zarf: altlık çizgileri üzerinde okunur */
  iz();c.lineWidth=w;c.strokeStyle=st.renk;c.stroke();
  if(st.cizgi==='cift'){c.setLineDash([]);iz();c.lineWidth=w*.4;c.strokeStyle='#fff';c.stroke()}
  c.setLineDash([]);
  if(st.ok){
    const boy=w*2.9,gen=w*2.5;
    C.okNoktalari(p,w*(aralikK||16)).forEach(o=>{
      c.save();c.translate(o.x,o.y);c.rotate(o.aci);if(o.uc)c.translate(-boy*.5,0);
      c.beginPath();c.moveTo(boy*.5,0);c.lineTo(-boy*.5,-gen*.5);c.lineTo(-boy*.5,gen*.5);c.closePath();
      c.fillStyle=st.renk;c.fill();c.lineWidth=w*.22;c.strokeStyle='#fff';c.stroke();c.restore();
    });
  }
  c.restore();
}
/* Palet ve lejant için küçük örnek: (cx,cy) merkezli gen×yuks kutuda türün çizimi */
function yolOrnek(c,tur,cx,cy,gen,yuks){
  const st=core().yolStil(tur),w=yuks*(st.kapali?.13:.2)*(st.kapali?1:st.kalin);
  yolCizLw(c,{tur,noktalar:st.kapali?[[cx-gen/2,cy-yuks/2],[cx+gen/2,cy+yuks/2]]:[[cx-gen/2,cy],[cx+gen/2,cy]]},w,gen*3/w);   /* aralık büyük: ortada ok çıkmaz, yalnız uçtaki ok */
}

global.KatPlaniSimge={rr,yazitipi,metinGenislik,sembolCiz,ogeCiz,yolCizLw,yolOrnek};
})(typeof window!=='undefined'?window:globalThis);
