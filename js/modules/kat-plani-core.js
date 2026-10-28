/* Koruk Asistan — Kat Planı / Acil Durum Tahliye Planı · saf veri katmanı
 * Arayüz ve çizim yok: model (kat, sembol, kaçış yolu, "şu an buradasınız"), geometri, kontrol listesi, lejant ve sayfa düzeni.
 * Koordinatlar altlığın (kat projesi görüntüsü) piksel düzlemindedir; altlık yoksa BOS boyutlu boş tuval kullanılır.
 * Kullananlar: kat-plani-cizim.js (çizim/çıktı), kat-plani.js (editör).
 */
(function(global){
'use strict';
if(global.KatPlaniCore)return;

const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const num=(v,d)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const str=(v,m)=>String(v??'').trim().slice(0,m);
const r1=n=>Math.round(n*10)/10;
const r2=n=>Math.round(n*100)/100;
const BOY=v=>r2(clamp(num(v,1),.4,4));          /* tek sembolün/yazının boyut çarpanı (katın genel boyutuna ek) */
const yeniId=p=>p+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3);

/* Altlıksız katın tuval boyutu (yatay A3 oranı) */
const BOS={w:2400,h:1700};
/* Güvenlik işaretleri ISO 7010 renkleridir; temaya göre değişmez. */
const RENK={kirmizi:'#d32f2f',yesil:'#1b8a3a',sari:'#ffd400',mavi:'#1d5fb8',yol:'#12a150',koyu:'#1f2933',gri:'#6b7280'};

/* Sembol kataloğu (palet bu gruplarla açılır). renk: yangın kırmızı · kaçış/ilk yardım yeşil · uyarı ve kesme noktaları sarı (üçgen, siyah işaret) · mekân mavi.
   onerilen: kat planında bulunması beklenen (kontrol listesinde uyarı verir, engellemez). lejant:false: kendi yazısı olan öğe (oda adı) lejanta girmez. */
const GRUPLAR=[{id:'yangin',ad:'Yangın'},{id:'kacis',ad:'Kaçış'},{id:'uyari',ad:'Uyarı'},{id:'mekan',ad:'Mekân'},{id:'yazi',ad:'Yazı'}];
const sb=(id,ad,kisa,grup,renk,o)=>({id,ad,kisa,grup,renk,sekil:renk===RENK.sari?'ucgen':'kare',onerilen:false,lejant:true,...o});
const SEMBOLLER=[
  sb('sondurucu','Yangın söndürücü','Yangın söndürücü','yangin',RENK.kirmizi,{onerilen:true}),
  sb('hortum','Yangın dolabı / hortum','Yangın dolabı / hortum','yangin',RENK.kirmizi),
  sb('alarm','Yangın alarm butonu','Alarm butonu','yangin',RENK.kirmizi,{onerilen:true}),
  sb('ihbar','Yangın ihbar paneli','İhbar paneli','yangin',RENK.kirmizi),
  sb('siren','Alarm sireni / zil','Alarm sireni','yangin',RENK.kirmizi),
  sb('duman','Duman dedektörü','Duman dedektörü','yangin',RENK.kirmizi),
  sb('yangin_kapisi','Yangın kapısı','Yangın kapısı','yangin',RENK.kirmizi),
  sb('cikis','Acil çıkış kapısı','Acil çıkış','kacis',RENK.yesil),
  sb('yangin_merdiveni','Yangın merdiveni','Yangın merdiveni','kacis',RENK.yesil),
  sb('toplanma','Toplanma alanı yönü','Toplanma alanı','kacis',RENK.yesil),
  sb('ilkyardim','İlk yardım dolabı','İlk yardım dolabı','kacis',RENK.yesil,{onerilen:true}),
  sb('aed','Defibrilatör (AED)','Defibrilatör','kacis',RENK.yesil),
  sb('siginak','Sığınak / güvenli alan','Sığınak','kacis',RENK.yesil),
  sb('pano','Elektrik panosu','Elektrik panosu','uyari',RENK.sari,{onerilen:true}),
  sb('salter','Ana elektrik şalteri','Ana şalter','uyari',RENK.sari),
  sb('dogalgaz','Doğalgaz kesme vanası','Doğalgaz vanası','uyari',RENK.sari),
  sb('kazan','Kazan dairesi','Kazan dairesi','uyari',RENK.sari),
  sb('jenerator','Jeneratör','Jeneratör','uyari',RENK.sari),
  sb('kimyasal','Kimyasal / laboratuvar','Laboratuvar','uyari',RENK.sari),
  sb('asansor','Asansör','Asansör','mekan',RENK.mavi),
  sb('merdiven','Merdiven','Merdiven','mekan',RENK.mavi),
  sb('wc','Tuvalet (WC)','WC','mekan',RENK.mavi),
  sb('engelli','Engelli erişimi','Engelli erişimi','mekan',RENK.mavi),
  sb('su','Su vanası / deposu','Su vanası','mekan',RENK.mavi),
  sb('etiket','Oda adı / yazı','Oda adı','yazi',RENK.koyu,{sekil:'yazi',lejant:false})
];
const SEMBOL_ID=new Set(SEMBOLLER.map(s=>s.id));
const sembol=id=>SEMBOLLER.find(s=>s.id===id)||null;

/* Oda adı / etiket önerileri (yazı kutusunda öneri listesi olarak çıkar; istenen her ad yazılabilir) */
const ODA_ADLARI=['Müdür Odası','Müdür Yardımcısı Odası','Öğretmenler Odası','Rehberlik Servisi','Kazan Dairesi','Pano Odası','Jeneratör Odası','Depo','Arşiv','Kantin','Yemekhane','Kütüphane','Spor Salonu','Çok Amaçlı Salon','Fen Laboratuvarı','Bilişim Sınıfı','Anasınıfı','Revir','Sığınak','Hizmetli Odası','Nöbetçi Öğretmen','Ana Giriş','Bahçe Kapısı','Mescit','Tuvalet'];
/* Hızlı kat adları ve doğal sıralama (bodrum < zemin < 1. kat …) */
const KAT_ADLARI=['Bodrum Kat','Zemin Kat','1. Kat','2. Kat','3. Kat','4. Kat','Çatı Katı'];
function katSira(ad){
  const s=String(ad||'').toLocaleLowerCase('tr');
  if(/bodrum/.test(s)){const m=s.match(/(\d+)/);return m?-Number(m[1]):-1}
  if(/zemin/.test(s))return 0;
  if(/çatı|cati/.test(s))return 90;
  const m=s.match(/(\d+)/);
  return m?Number(m[1]):50;
}

/* ───────── model ───────── */
function normalizeOge(o){
  if(!o||typeof o!=='object'||!SEMBOL_ID.has(o.tur))return null;
  return{id:str(o.id,40)||yeniId('o'),tur:o.tur,x:r1(num(o.x,0)),y:r1(num(o.y,0)),aci:((Math.round(num(o.aci,0))%360)+360)%360,not:str(o.not,60),boy:BOY(o.boy)};
}
/* Bellekte noktalar [[x,y],…]; Firestore iç içe dizi kabul etmediği için kayıtta düz dizi p:[x0,y0,x1,y1,…] kullanılır. */
function ciftlere(p){const o=[];if(Array.isArray(p))for(let i=0;i+1<p.length;i+=2)o.push([p[i],p[i+1]]);return o}
function normalizeYol(y){
  const ham=Array.isArray(y?.noktalar)?y.noktalar:ciftlere(y?.p);
  const pts=ham.map(p=>Array.isArray(p)&&p.length>=2?[r1(num(p[0],NaN)),r1(num(p[1],NaN))]:null).filter(p=>p&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
  if(pts.length<2)return null;
  return{id:str(y.id,40)||yeniId('y'),noktalar:pts.slice(0,200)};
}
function normalizeBur(b){
  if(!b||typeof b!=='object')return null;
  const x=num(b.x,NaN),y=num(b.y,NaN);
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  return{id:str(b.id,40)||yeniId('b'),x:r1(x),y:r1(y),ad:str(b.ad,40),boy:BOY(b.boy)};
}
function normalizeKat(x){
  x=x&&typeof x==='object'?x:{};
  const w=Math.round(clamp(num(x.w,BOS.w),200,6000)),h=Math.round(clamp(num(x.h,BOS.h),200,6000));
  const ad=str(x.ad,40)||'Kat';
  return{
    id:str(x.id,60)||yeniId('kat'),ad,sira:Number.isFinite(Number(x.sira))?Number(x.sira):katSira(ad),
    w,h,olcek:str(x.olcek,16),sembolBoyut:clamp(num(x.sembolBoyut,1),.5,2.5),
    ogeler:(Array.isArray(x.ogeler)?x.ogeler:[]).map(normalizeOge).filter(Boolean).slice(0,400),
    yollar:(Array.isArray(x.yollar)?x.yollar:[]).map(normalizeYol).filter(Boolean).slice(0,60),
    buradasiniz:(Array.isArray(x.buradasiniz)?x.buradasiniz:[]).map(normalizeBur).filter(Boolean).slice(0,20),
    guncellendi:str(x.guncellendi,40)
  };
}
function yeniKat(ad,sira){const a=str(ad,40)||'Kat';return normalizeKat({ad:a,sira:Number.isFinite(Number(sira))?Number(sira):katSira(a)})}
function normalizeAyar(a){
  a=a&&typeof a==='object'?a:{};
  return{baslik:str(a.baslik,60)||'ACİL DURUM TAHLİYE PLANI',okulAdi:str(a.okulAdi,90),onayAd:str(a.onayAd,60),onayUnvan:str(a.onayUnvan,40)||'Okul Müdürü',onayTarih:str(a.onayTarih,10)};
}
/* Firestore doküman kimlikleri: kat belgesi küçük kalır, altlık görüntüsü ayrı belgededir. */
const altlikId=katId=>katId+'__altlik';
/* Kayda giden kat belgesi (altlık görüntüsü hariç). */
function katBelgesi(k){const n=normalizeKat(k);return{...n,yollar:n.yollar.map(y=>({id:y.id,p:y.noktalar.flat()})),tur:'kat'}}

/* ───────── geometri ───────── */
const sembolPx=k=>Math.max(k.w,k.h)*.026*(k.sembolBoyut||1);
const yolKalinlik=k=>sembolPx(k)*.26;
/* Tek öğenin boyutu: katın genel boyutu × kendi çarpanı. Oda adında yazı yüksekliği boyutun yarısıdır. */
const ogeBoyut=(k,o)=>sembolPx(k)*(o.boy||1);
const etiketMetni=o=>o.not||'Oda adı';
/* Öğenin yarı genişlik/yükseklik kutusu. olcu(metin,punto): gerçek yazı ölçüsü (tuvalden); yoksa kaba tahmin. */
function ogeYari(k,o,olcu){
  const s=ogeBoyut(k,o);
  if(o.tur!=='etiket')return{hw:s/2,hh:s/2,s};
  const fs=s*.5,m=(olcu||((t,f)=>t.length*f*.6))(etiketMetni(o),fs);
  return{hw:(m+fs*.9)/2,hh:fs*.8,s};
}
const uzaklik=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
function noktaSegMesafe(px,py,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
  if(!l2)return uzaklik(px,py,ax,ay);
  const t=clamp(((px-ax)*dx+(py-ay)*dy)/l2,0,1);
  return uzaklik(px,py,ax+t*dx,ay+t*dy);
}
function yolUzunluk(pts){let t=0;for(let i=1;i<pts.length;i++)t+=uzaklik(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]);return t}
/* Kaçış yolu üzerinde yön okları: her doğru parçasında aralık kadar bir ok (kısa parçalarda yok) + yolun ucunda son ok.
   aci: radyan (0 = sağa). */
function okNoktalari(pts,aralik){
  const out=[];
  if(!Array.isArray(pts)||pts.length<2||!(aralik>0))return out;
  for(let i=1;i<pts.length;i++){
    const ax=pts[i-1][0],ay=pts[i-1][1],bx=pts[i][0],by=pts[i][1],L=uzaklik(ax,ay,bx,by);
    if(L<aralik*.5)continue;
    const n=Math.max(1,Math.round(L/aralik)),a=Math.atan2(by-ay,bx-ax);
    for(let j=0;j<n;j++){const t=(j+.5)/n;out.push({x:ax+(bx-ax)*t,y:ay+(by-ay)*t,aci:a,uc:false})}
  }
  const p=pts[pts.length-2],q=pts[pts.length-1];
  out.push({x:q[0],y:q[1],aci:Math.atan2(q[1]-p[1],q[0]-p[0]),uc:true});
  return out;
}
/* Dokunulan nesneyi bul: önce "buradasınız", sonra semboller, yol köşeleri, yol doğruları. tol: model birimi; olcu: ogeYari'ye */
function isabet(k,x,y,tol,olcu){
  const sp=sembolPx(k),t=Math.max(tol||0,sp*.15);
  for(let i=k.buradasiniz.length-1;i>=0;i--){const b=k.buradasiniz[i];if(uzaklik(x,y,b.x,b.y)<=Math.max(t,sp*(b.boy||1)*.7))return{t:'bur',i}}
  for(let i=k.ogeler.length-1;i>=0;i--){
    const o=k.ogeler[i],a=ogeYari(k,o,olcu);
    if(o.tur==='etiket'?(Math.abs(x-o.x)<=Math.max(t,a.hw)&&Math.abs(y-o.y)<=Math.max(t,a.hh)):uzaklik(x,y,o.x,o.y)<=Math.max(t,a.s*.62))return{t:'oge',i};
  }
  for(let yi=k.yollar.length-1;yi>=0;yi--){const p=k.yollar[yi].noktalar;for(let ni=0;ni<p.length;ni++)if(uzaklik(x,y,p[ni][0],p[ni][1])<=Math.max(t,sp*.4))return{t:'nokta',yi,ni}}
  for(let yi=k.yollar.length-1;yi>=0;yi--){const p=k.yollar[yi].noktalar;for(let ni=1;ni<p.length;ni++)if(noktaSegMesafe(x,y,p[ni-1][0],p[ni-1][1],p[ni][0],p[ni][1])<=Math.max(t,yolKalinlik(k)*.9))return{t:'yol',yi,ni}}
  return null;
}

/* ───────── sayım, kontrol listesi, lejant ───────── */
function sayim(k){const m={};SEMBOLLER.forEach(s=>{m[s.id]=0});k.ogeler.forEach(o=>{m[o.tur]=(m[o.tur]||0)+1});return m}
/* Kılavuz kontrolü: uyarı verir, engellemez. opt.altlik: katın projesi yüklü mü */
function kontrol(k,opt){
  const m=sayim(k),L=[];
  L.push({id:'altlik',ok:!!opt?.altlik,ad:'Kat projesi (altlık) yüklü'});
  L.push({id:'yol',ok:k.yollar.length>0,ad:'Yeşil kaçış yolu çizildi'});
  L.push({id:'buradasiniz',ok:k.buradasiniz.length>0,ad:'"Şu an buradasınız" noktası konuldu'});
  SEMBOLLER.filter(s=>s.onerilen).forEach(s=>L.push({id:s.id,ok:m[s.id]>0,ad:s.kisa+' işaretlendi'}));
  return L;
}
function lejant(k){
  const m=sayim(k),L=SEMBOLLER.filter(s=>s.lejant&&m[s.id]>0).map(s=>({id:s.id,ad:s.kisa,renk:s.renk}));
  if(k.yollar.length)L.unshift({id:'yol',ad:'Kaçış yolu',renk:RENK.yol});
  if(k.buradasiniz.length)L.unshift({id:'buradasiniz',ad:'Şu an buradasınız',renk:RENK.kirmizi});
  return L;
}
/* Çıktı sayfaları: her "şu an buradasınız" noktası bir sayfa; hiç yoksa noktasız tek sayfa (-1). */
const sayfalar=k=>k.buradasiniz.length?k.buradasiniz.map((_,i)=>i):[-1];

/* ───────── sayfa düzeni (mm) ─────────
 * Kenar boşluğu her sayfada üst/alt/yan 10 mm; çizim yalnız kalan içerik kutusuna yapılır.
 * A3 yatay 420×297, A4 yatay 297×210. */
const SAYFA_KENAR=10;
function sayfaDuzen(boyut){
  const a4=boyut==='A4',pw=a4?297:420,ph=a4?210:297,m=SAYFA_KENAR,w=pw-2*m,h=ph-2*m;
  const ust=a4?14:18,alt=a4?34:42,onayW=a4?64:84,bosluk=a4?3:4;
  return{boyut:a4?'A4':'A3',pw,ph,m,w,h,ust,alt,onayW,bosluk,
    plan:{x:0,y:ust+bosluk,w,h:h-ust-alt-2*bosluk},
    lejant:{x:0,y:h-alt,w:w-onayW-bosluk,h:alt},
    onay:{x:w-onayW,y:h-alt,w:onayW,h:alt}};
}
function fitRect(w,h,r){const s=Math.min(r.w/w,r.h/h);return{s,x:r.x+(r.w-w*s)/2,y:r.y+(r.h-h*s)/2,w:w*s,h:h*s}}

global.KatPlaniCore={BOS,RENK,GRUPLAR,SEMBOLLER,sembol,KAT_ADLARI,ODA_ADLARI,katSira,SAYFA_KENAR,
  normalizeKat,normalizeOge,normalizeYol,normalizeBur,normalizeAyar,yeniKat,yeniId,altlikId,katBelgesi,
  sembolPx,yolKalinlik,ogeBoyut,ogeYari,etiketMetni,uzaklik,noktaSegMesafe,yolUzunluk,okNoktalari,isabet,
  sayim,kontrol,lejant,sayfalar,sayfaDuzen,fitRect};
if(typeof module!=='undefined'&&module.exports)module.exports=global.KatPlaniCore;
})(typeof window!=='undefined'?window:globalThis);
