/* Koruk Asistan — Belge Tarayıcı (Resimden PDF)
 * Belgeler › Belge Tarayıcı. Canlı kamera (köşeleri kendisi bulur, otomatik çekim) ya da galeriden seçilen fotoğrafları
 * sayfa sayfa düzenler: köşe/perspektif, filtre, ışık-renk-netlik ayarları, döndürme; sonra tek PDF yapar (kaydet, paylaş, arşivle).
 *
 * Katmanlar: belge-tarayici-core.js (görüntü işleme + PDF yazıcı, saf) · belge-tarayici-kamera.js (canlı kamera) · bu dosya (arayüz).
 * Sayfa kaynağı cihazda JPEG olarak (en uzun kenar ≤2400 px) tutulur; köşe, döndürme ve ayarlar sayfa kaydında durur,
 * işlenmiş görüntü yalnızca önizleme ve çıktı sırasında üretilir (özgün fotoğraf hiç bozulmaz).
 * Görünüm TAMAMEN merkezi CSS'tedir: css/design-system-base.css → ".bts-" kuralları.
 */
(function(global){
'use strict';
if(global.BelgeTarayici)return;
const D=document;
const SRC=['js/modules/belge-tarayici-core.js?v=1','js/modules/belge-tarayici-kamera.js?v=1'];
const core=()=>global.BelgeTarayiciCore,kam=()=>global.BelgeTarayiciKamera;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const toast=(m,o)=>{try{global.toast?.(m,o)}catch(_){}};
const bekle=()=>new Promise(r=>setTimeout(r,0));
const bugun=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const boyutYazi=n=>n<1048576?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(1).replace('.',',')+' MB';

const MAKS_KAYNAK=2400,MAKS_DUZEN=1200,MAKS_KUCUK=420;
const KALITE={dusuk:{ad:'Düşük',maks:1500,q:.68},orta:{ad:'Orta',maks:2000,q:.82},yuksek:{ad:'Yüksek',maks:2400,q:.92}};
const BOYUTLAR=[['a4','A4'],['a3','A3'],['a5','A5'],['letter','Letter'],['orijinal','Orijinal']];
const YONLER=[['otomatik','Otomatik'],['dikey','Dikey'],['yatay','Yatay']];
const KENARLAR=[5,10,15,20];
const KATEGORILER=['Öğrenci Formları','Veli Formları','Gezi & Etkinlik','Proje Formları','Yazılı Senaryoları','Yönetim & İdari','Diğer'];
/* Ayar çubukları: hangi filtrede etkili oldukları çekirdeğin işleme sırasına göre belirlenir (etkisiz çubuk gösterilmez). */
const GRI=['bw','gri','belge'];
const AYARLAR=[
  {k:'parlaklik',ad:'Parlaklık',min:-100,max:100,ok:()=>true},
  {k:'kontrast',ad:'Kontrast',min:-100,max:100,ok:f=>f!=='bw'},
  {k:'doygunluk',ad:'Doygunluk',min:-100,max:100,ok:f=>!GRI.includes(f)},
  {k:'sicaklik',ad:'Renk sıcaklığı',min:-100,max:100,ok:f=>!GRI.includes(f)},
  {k:'golge',ad:'Gölge giderme',min:0,max:100,ok:f=>['orijinal','gri','canli'].includes(f)},
  {k:'beyazlik',ad:'Beyazlık',min:0,max:100,ok:f=>f!=='bw'},
  {k:'metin',ad:'Metin koyuluğu',min:0,max:100,ok:f=>f!=='bw'},
  {k:'netlik',ad:'Netlik',min:0,max:100,ok:f=>f!=='bw'},
  {k:'gurultu',ad:'Gürültü azaltma',min:0,max:100,ok:f=>f!=='bw'},
  {k:'hareli',ad:'Hare giderme',min:0,max:100,ok:f=>f!=='bw'},
  {k:'esik',ad:'Koyuluk (S/B)',min:-50,max:50,ok:f=>f==='bw'}
];
const ICONS={
  kapat:'<path d="M6 6l12 12M18 6L6 18"/>',onceki:'<path d="M15 5l-7 7 7 7"/>',sonraki:'<path d="M9 5l7 7-7 7"/>',
  kamera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.6"/>',
  galeri:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  pdf:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  kirp:'<path d="M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14"/>',
  filtre:'<path d="M12 3l1.9 5 5.1 1.9-5.1 1.9L12 17l-1.9-5.2L5 9.9 10.1 8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
  ayarla:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  dondur:'<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v5h-5"/>',
  sol:'<path d="M4 12a8 8 0 103-6.2"/><path d="M4 4v5h5"/>',sag:'<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v5h-5"/>',
  sil:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  fener:'<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  oto:'<circle cx="12" cy="12" r="9"/><path d="M8 16l4-8 4 8M9.5 13h5"/>',
  tara:'<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><path d="M4 12h16"/>',
  tam:'<rect x="4" y="4" width="16" height="16" rx="1.5"/>',
  goz:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  paylas:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>',
  indir:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',klasor:'<path d="M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z"/>',
  onay:'<path d="M5 12l5 5 9-10"/>',belge:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M4 8V5M4 8h2" opacity="0"/>',
  yeni:'<path d="M12 5v14M5 12h14"/>'
};
const ic=n=>`<svg class="bts-ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;

let S=null,root=null,ac=null,ro=null,kuyrukCalisiyor=false;
const R=n=>root?.querySelector(`[data-r="${n}"]`);

/* ───────── görüntü yardımcıları (tarayıcı katmanı) ───────── */
const boyutOku=k=>({w:k.naturalWidth||k.videoWidth||k.width,h:k.naturalHeight||k.videoHeight||k.height});
function resimYukle(blob){return new Promise((ok,no)=>{const u=URL.createObjectURL(blob),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);no(new Error('Görsel açılamadı.'))};i.src=u})}
async function blobCoz(blob){
  if(typeof createImageBitmap==='function'){try{return await createImageBitmap(blob,{imageOrientation:'from-image'})}catch(_){}}
  return resimYukle(blob);
}
/** Kaynağı (bitmap/img/video/canvas) en uzun kenarı ≤maks olacak biçimde yeni tuvale çizer. */
function tuvalCiz(kaynak,maks){
  const {w,h}=boyutOku(kaynak),k=Math.min(1,maks/Math.max(w,h)),W=Math.max(1,Math.round(w*k)),H=Math.max(1,Math.round(h*k));
  const c=D.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(kaynak,0,0,W,H);
  return c;
}
const veriAl=c=>c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height);
function veriTuval(img){const c=D.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').putImageData(new ImageData(img.data,img.width,img.height),0,0);return c}
const tuvalBlob=(c,q)=>new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('Görsel kodlanamadı.')),'image/jpeg',q));

/* ───────── sayfa modeli ───────── */
const TAM=()=>[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
/** Algılanan köşeler masa/kenar kalıntısı bırakmasın diye merkeze doğru çok az (%0,4) çekilir. */
function iceriAl(k,oran=.004){
  const cx=k.reduce((a,p)=>a+p.x,0)/4,cy=k.reduce((a,p)=>a+p.y,0)/4;
  return k.map(p=>({x:clamp(p.x+(cx-p.x)*oran*2,0,1),y:clamp(p.y+(cy-p.y)*oran*2,0,1)}));
}
const tamMi=k=>k.every((p,i)=>Math.abs(p.x-(i===1||i===2?1:0))<.004&&Math.abs(p.y-(i>=2?1:0))<.004);
async function kaynakCoz(p,maks){
  const bmp=await blobCoz(p.kaynak),c=tuvalCiz(bmp,maks);
  try{bmp.close&&bmp.close()}catch(_){}
  return core().dondur(veriAl(c),p.dondurme);
}
/** Köşeler (0..1) → düzleştirilmiş görüntü. Tam kare ise yeniden örnekleme yapılmaz. */
function kirp(img,k,maks){
  if(tamMi(k))return core().kenarSinirla(img,maks);
  const pk=k.map(a=>({x:a.x*(img.width-1),y:a.y*(img.height-1)})),hb=core().hedefBoyut(pk,{maksKenar:maks});
  return core().perspektif(img,pk,hb.w,hb.h);
}
async function sayfaCiktisi(p,maks,kalite){
  const img=await kaynakCoz(p,MAKS_KAYNAK),k=kirp(img,p.koseler,maks),son=core().isle(k,p.ayar);
  const b=await tuvalBlob(veriTuval(son),kalite);
  return new Uint8Array(await b.arrayBuffer());
}
async function kucukUret(p){
  const s=p.surum,img=await kaynakCoz(p,640),k=kirp(img,p.koseler,MAKS_KUCUK),son=core().isle(k,p.ayar);
  const b=await tuvalBlob(veriTuval(son),.8);
  if(p.kucukUrl)URL.revokeObjectURL(p.kucukUrl);
  p.kucukUrl=URL.createObjectURL(b);p.kucukSurum=s;
}
/** Küçük resmi güncel olmayan sayfalar sırayla yenilenir; hazır olan kartın yalnız <img>'i değişir. */
async function kucukKuyruk(){
  if(kuyrukCalisiyor)return;kuyrukCalisiyor=true;
  try{
    for(;;){
      if(!S)return;
      const p=S.sayfalar.find(x=>x.kucukSurum!==x.surum);if(!p)return;
      try{await kucukUret(p)}catch(e){console.warn('[BelgeTarayici/kucuk]',e);p.kucukSurum=p.surum}
      if(!S)return;
      kucukGoster(p);await bekle();
    }
  }finally{kuyrukCalisiyor=false}
}
function kucukGoster(p){
  if(!root)return;
  const i=S.sayfalar.indexOf(p);if(i<0)return;
  const kart=root.querySelector(`.bts-card[data-i="${i}"] .bts-card__img`);
  if(kart){
    let im=kart.querySelector('img');
    if(!im){kart.querySelector('.bts-spin')?.remove();im=D.createElement('img');im.alt='Sayfa '+(i+1);kart.prepend(im)}
    im.src=p.kucukUrl;
  }
  const son=R('camson');if(son&&S.kam?.son===p)camSonGoster(p);
}
function sayfaYarat(kaynak,koseler,algilandi){
  return{id:++S.sayac,kaynak,dondurme:0,koseler,algilandi,kirpildi:false,ayar:core().varsayilanAyar(),surum:1,kucukSurum:0,kucukUrl:''};
}
/** Bitmap/img/canvas/blob → yeni sayfa (köşeler otomatik aranır). */
async function resimEkle(girdi){
  const bmp=girdi instanceof Blob?await blobCoz(girdi):girdi,c=tuvalCiz(bmp,MAKS_KAYNAK);
  if(girdi instanceof Blob){try{bmp.close&&bmp.close()}catch(_){}}
  const blob=await tuvalBlob(c,.92);
  let kose=null,alg=false;
  try{const r=core().kenarBul(veriAl(c));if(r&&r.guven>=.3){kose=iceriAl(core().koseSirala(r.koseler));alg=true}}catch(e){console.warn('[BelgeTarayici/kenar]',e)}
  const p=sayfaYarat(blob,kose||TAM(),alg);
  S.sayfalar.push(p);
  return p;
}
async function dosyalariEkle(liste){
  const dosyalar=[...liste].filter(f=>/^image\//i.test(f.type||'')||/\.(jpe?g|png|webp|bmp|gif)$/i.test(f.name||''));
  if(!dosyalar.length){toast('Görsel dosyası seçilmedi.');return}
  let hata=0;
  for(let i=0;i<dosyalar.length;i++){
    if(!S)return;
    mesgul(`Sayfa ${i+1}/${dosyalar.length} hazırlanıyor…`);await bekle();
    try{await resimEkle(dosyalar[i])}catch(e){hata++;console.warn('[BelgeTarayici/ekle]',e)}
  }
  mesgul('');
  if(!S)return;
  if(hata)toast(hata===dosyalar.length?'Görseller açılamadı.':`${hata} görsel açılamadı.`);
  if(S.ekran==='liste')listeCiz();
  kucukKuyruk();
}

/* ───────── ortak arayüz parçaları ───────── */
function mesgul(t){const e=R('mesgul');if(!e)return;e.hidden=!t;e.textContent=t||''}
function sheetAc(html,tam){
  const sh=R('sheet');if(!sh)return;
  sh.innerHTML=html;sh.hidden=false;sh.classList.toggle('bts-sheet--tam',!!tam);R('scrim').dataset.on='1';S.sheet=true;
  try{sh.focus({preventScroll:true})}catch(_){}
}
function sheetKapat(){
  const sh=R('sheet');if(!sh)return;
  sh.hidden=true;sh.innerHTML='';R('scrim').dataset.on='0';S.sheet=false;S.onay=null;
}
const shBas=b=>`<div class="bts-sh-head"><b>${esc(b)}</b><button type="button" class="bts-ibtn" data-act="sheetclose" data-close aria-label="Kapat">${ic('kapat')}</button></div>`;
function onayAc(baslik,mesaj,etiket,eylem,tehlike){
  S.onay=eylem;
  sheetAc(shBas(baslik)+`<div class="bts-sh-body"><p>${esc(mesaj)}</p><div class="bts-sh-foot"><button type="button" class="bts-btn" data-act="sheetclose">Vazgeç</button><button type="button" class="bts-btn ${tehlike?'bts-dng':'bts-pri'}" data-act="onayevet">${esc(etiket)}</button></div></div>`);
}
function renk(ad){try{return getComputedStyle(root).getPropertyValue(ad).trim()||getComputedStyle(root).color}catch(_){return'currentColor'}}

/* ───────── liste ekranı ───────── */
const kart=(p,i,n)=>`<article class="bts-card" data-i="${i}">
  <button type="button" class="bts-card__img" data-act="duzenle" data-i="${i}" aria-label="Sayfa ${i+1} düzenle">${p.kucukUrl?`<img src="${esc(p.kucukUrl)}" alt="Sayfa ${i+1}">`:'<span class="bts-spin" aria-hidden="true"></span>'}<span class="bts-card__no">${i+1}</span></button>
  <div class="bts-card__ac">
    <button type="button" class="bts-ibtn bts-ibtn--s" data-act="sola" data-i="${i}" aria-label="Öne al" ${i===0?'disabled':''}>${ic('onceki')}</button>
    <button type="button" class="bts-ibtn bts-ibtn--s" data-act="saga" data-i="${i}" aria-label="Sona al" ${i===n-1?'disabled':''}>${ic('sonraki')}</button>
    <button type="button" class="bts-ibtn bts-ibtn--s bts-ibtn--dng" data-act="sayfasil" data-i="${i}" aria-label="Sayfayı sil">${ic('sil')}</button>
  </div></article>`;
const BOS=`<div class="bts-bos"><div class="bts-bos__ic">${ic('tara')}</div><h2>Belgeyi tarayın</h2>
  <p>Kamerayla çekin ya da galeriden seçin. Belge kenarları kendiliğinden bulunur; sonra perspektifi, rengi ve netliği sayfa sayfa düzenleyip tek PDF yapabilirsiniz.</p>
  <div class="bts-bos__ac"><button type="button" class="bts-btn bts-pri" data-act="kamera">${ic('kamera')}Kamera</button><button type="button" class="bts-btn" data-act="galeri">${ic('galeri')}Galeri</button></div></div>`;
function listeCiz(){
  const n=S.sayfalar.length;
  R('ekran').innerHTML=`<header class="bts-top">
    <button type="button" class="bts-ibtn" data-act="geri" data-close aria-label="Kapat">${ic('kapat')}</button>
    <div class="bts-ttl"><h1>Belge Tarayıcı</h1><small>${n?n+' sayfa':'Kamera veya galeri'}</small></div>
    <button type="button" class="bts-btn bts-pri" data-act="pdf" ${n?'':'disabled'}>${ic('pdf')}PDF oluştur</button>
  </header>
  <main class="bts-body">${n?`<div class="bts-grid">${S.sayfalar.map((p,i)=>kart(p,i,n)).join('')}</div>`:BOS}</main>
  ${n?`<nav class="bts-dock" aria-label="Sayfa ekle">
    <button type="button" class="bts-dbtn bts-dbtn--ana" data-act="kamera">${ic('kamera')}<span>Kamera</span></button>
    <button type="button" class="bts-dbtn" data-act="galeri">${ic('galeri')}<span>Galeri</span></button>
  </nav>`:''}`;
}
function listeGit(){
  S.ekran='liste';
  try{ro?.disconnect()}catch(_){}ro=null;
  listeCiz();kucukKuyruk();
}

/* ───────── kamera ekranı ───────── */
function kameraCiz(){
  R('ekran').innerHTML=`<div class="bts-cam" data-r="cam">
    <video class="bts-cam__video" data-r="video" playsinline muted autoplay></video>
    <canvas class="bts-cam__ov" data-r="ov" aria-hidden="true"></canvas>
    <header class="bts-cam__top">
      <button type="button" class="bts-ibtn bts-ibtn--cam" data-act="geri" data-close aria-label="Kapat">${ic('kapat')}</button>
      <span class="bts-cam__durum" data-r="camdurum" aria-live="polite">Kamera açılıyor…</span>
      <button type="button" class="bts-ibtn bts-ibtn--cam" data-act="oto" data-r="oto" aria-pressed="false" aria-label="Otomatik çekim">${ic('oto')}</button>
      <button type="button" class="bts-ibtn bts-ibtn--cam" data-act="fener" data-r="fener" aria-pressed="false" aria-label="Fener" hidden>${ic('fener')}</button>
    </header>
    <div class="bts-cam__hata" data-r="camhata" hidden></div>
    <footer class="bts-cam__alt">
      <button type="button" class="bts-ibtn bts-ibtn--cam bts-ibtn--b" data-act="galeri" aria-label="Galeriden seç">${ic('galeri')}</button>
      <button type="button" class="bts-shutter" data-act="cek" data-r="cek" aria-label="Fotoğraf çek"></button>
      <button type="button" class="bts-cam__son" data-act="kamerabitti" data-r="camson" aria-label="Bitti">${ic('onay')}<b data-r="camsayi">0</b></button>
    </footer></div>`;
}
function camSonGoster(p){
  const e=R('camson');if(!e||!p?.kucukUrl)return;
  let im=e.querySelector('img');if(!im){im=D.createElement('img');im.alt='';e.prepend(im);e.classList.add('has-img')}
  im.src=p.kucukUrl;
}
function containRect(vw,vh,W,H){const k=Math.min(W/vw,H/vh),w=vw*k,h=vh*k;return{x:(W-w)/2,y:(H-h)/2,w,h}}
function camOverlay(durum){
  const ov=R('ov');if(!ov||!S.kam)return;
  const dpr=Math.min(global.devicePixelRatio||1,2),W=ov.clientWidth,H=ov.clientHeight;
  if(ov.width!==Math.round(W*dpr)||ov.height!==Math.round(H*dpr)){ov.width=Math.round(W*dpr);ov.height=Math.round(H*dpr)}
  const x=ov.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
  const K=S.kam;if(!durum||!durum.koseler||!K.k)return;
  const b=K.k.boyut();if(!(b.w>0))return;
  const r=containRect(b.w,b.h,W,H),kararli=durum.kararliMs>600,renkli=kararli?renk('--bts-ok'):renk('--bts-accent');
  x.beginPath();durum.koseler.forEach((p,i)=>{const px=r.x+p.x*r.w,py=r.y+p.y*r.h;i?x.lineTo(px,py):x.moveTo(px,py)});x.closePath();
  x.globalAlpha=.2;x.fillStyle=renkli;x.fill();x.globalAlpha=1;x.lineWidth=3;x.lineJoin='round';x.strokeStyle=renkli;x.stroke();
  x.fillStyle=renkli;durum.koseler.forEach(p=>{x.beginPath();x.arc(r.x+p.x*r.w,r.y+p.y*r.h,6,0,Math.PI*2);x.fill()});
}
function camDurumYaz(t){const e=R('camdurum');if(e&&e.textContent!==t)e.textContent=t}
async function kameraAc(){
  if(!S)return;
  kameraKapat();
  S.ekran='kamera';kameraCiz();
  S.kam={k:null,otomatik:S.kamOto===true,sayi:0,son:null,kilit:false,kilitZaman:0,mesgul:false,hata:''};
  oto_(S.kam.otomatik);
  try{
    if(!kam()?.destek())throw Object.assign(new Error('Bu cihazda canlı kamera kullanılamıyor.'),{kod:'yok'});
    const video=R('video');
    const k=await kam().ac(video,{onDurum:camDurum,onBitti:()=>{if(S?.kam&&S.ekran==='kamera')camHata('Kamera kapandı.')}});
    if(!S||S.ekran!=='kamera'){k.durdur();return}
    S.kam.k=k;
    const f=R('fener');if(f)f.hidden=!k.fenerVar;
    camDurumYaz('Belgeyi çerçeveye alın');
  }catch(e){
    if(!S||S.ekran!=='kamera')return;
    console.warn('[BelgeTarayici/kamera]',e);
    camHata(e.message||'Kamera açılamadı.');
  }
}
function camHata(m){
  const e=R('camhata');if(!e)return;
  if(S.kam)S.kam.hata=m;
  e.hidden=false;
  e.innerHTML=`<p>${esc(m)}</p><div class="bts-cam__hataac"><button type="button" class="bts-btn bts-pri" data-act="sistemkamera">${ic('kamera')}Sistem kamerasıyla çek</button><button type="button" class="bts-btn" data-act="kamera">Tekrar dene</button><button type="button" class="bts-btn" data-act="galeri">Galeriden seç</button></div>`;
  camDurumYaz('Kamera kullanılamıyor');
}
function camDurum(d){
  if(!S?.kam||S.ekran!=='kamera')return;
  const K=S.kam;camOverlay(d);
  if(!d.koseler)camDurumYaz('Belgeyi çerçeveye alın');
  else if(d.kararliMs<700)camDurumYaz('Sabit tutun…');
  else camDurumYaz(K.kilit?'Çekildi — sonraki sayfa için belgeyi değiştirin':K.otomatik?'Çekiliyor…':'Hazır — çekebilirsiniz');
  if(K.kilit&&(!d.koseler||d.kararliMs===0)&&performance.now()-K.kilitZaman>1500)K.kilit=false;
  if(K.otomatik&&!K.kilit&&!K.mesgul&&d.koseler&&d.kararliMs>=1100)cekmeyiDene();
}
function oto_(ac_){
  const b=R('oto');if(b){b.setAttribute('aria-pressed',ac_?'true':'false');b.classList.toggle('is-on',!!ac_)}
}
async function cekmeyiDene(){
  const K=S?.kam;if(!K||!K.k||K.mesgul)return;
  K.mesgul=true;K.kilit=true;K.kilitZaman=performance.now();
  try{
    const c=K.k.cek();
    const cam=R('cam');if(cam){cam.classList.add('is-flash');setTimeout(()=>cam?.classList.remove('is-flash'),180)}
    try{navigator.vibrate&&navigator.vibrate(25)}catch(_){}
    const p=await resimEkle(c);
    K.sayi++;K.son=p;const n=R('camsayi');if(n)n.textContent=String(K.sayi);
    if(S.ekran==='liste')listeCiz();
    kucukKuyruk();
  }catch(e){console.warn('[BelgeTarayici/cek]',e);toast('Fotoğraf alınamadı.')}
  finally{if(S?.kam)S.kam.mesgul=false}
}
function kameraKapat(){
  const K=S?.kam;
  if(K?.k){try{K.k.durdur()}catch(_){}}
  if(S){S.kamOto=K?K.otomatik:S.kamOto;S.kam=null}
}

/* ───────── düzenleyici ───────── */
const SEKMELER=[['kirp','Kırp','kirp'],['filtre','Filtre','filtre'],['ayarla','Ayarla','ayarla'],['dondur','Döndür','dondur']];
function duzenKabuk(){
  const d=S.duzen,n=S.sayfalar.length;
  R('ekran').innerHTML=`<header class="bts-top">
    <button type="button" class="bts-ibtn" data-act="geri" data-close aria-label="Kapat">${ic('kapat')}</button>
    <div class="bts-ttl"><h1 data-r="baslik">Sayfa ${d.i+1} / ${n}</h1><small data-r="alt"></small></div>
    <button type="button" class="bts-ibtn" data-act="onceki" aria-label="Önceki sayfa" ${d.i===0?'disabled':''}>${ic('onceki')}</button>
    <button type="button" class="bts-ibtn" data-act="sonraki" aria-label="Sonraki sayfa" ${d.i===n-1?'disabled':''}>${ic('sonraki')}</button>
    <button type="button" class="bts-btn bts-pri" data-act="tamam">Bitti</button>
  </header>
  <main class="bts-stage" data-r="stage">
    <canvas class="bts-cv" data-r="cv" aria-label="Sayfa düzenleme alanı"></canvas>
    <canvas class="bts-lupe" data-r="lupe" hidden aria-hidden="true"></canvas>
    <button type="button" class="bts-karsi" data-act="karsi" data-r="karsi" hidden>${ic('goz')}<span>Orijinal</span></button>
    <p class="bts-isleniyor" data-r="isleniyor" hidden>İşleniyor…</p>
  </main>
  <section class="bts-panel" data-r="panel"></section>
  <nav class="bts-tabs" role="tablist" aria-label="Düzenleme">${SEKMELER.map(([k,ad,i])=>`<button type="button" role="tab" data-act="sekme" data-k="${k}" aria-selected="false">${ic(i)}<span>${ad}</span></button>`).join('')}</nav>`;
}
async function duzenAc(i,sekme){
  if(!S||!S.sayfalar[i])return;
  kameraKapat();
  const p=S.sayfalar[i];
  S.ekran='duzen';
  S.duzen={i,p,sekme:'',src:null,srcCv:null,kirpik:null,kirpikCv:null,kirpikGecerli:false,sonuc:null,sonucCv:null,goster:'sonuc',istek:false,calisiyor:false,drag:null,degisti:false,W:0,H:0,r:null,dpr:1,renkler:null};
  const d=S.duzen;
  duzenKabuk();
  d.renkler={accent:renk('--bts-accent'),ink:renk('--bts-ink'),line:renk('--bts-line-strong'),scrim:renk('--bts-scrim'),surface:renk('--bts-surface'),muted:renk('--bts-muted')};
  const stage=R('stage'),cv=R('cv'),sg={signal:ac.signal};
  cv.addEventListener('pointerdown',kirpBas,sg);cv.addEventListener('pointermove',kirpHareket,sg);cv.addEventListener('pointerup',kirpBitirDokunus,sg);cv.addEventListener('pointercancel',kirpBitirDokunus,sg);
  const kr=R('karsi');kr.addEventListener('pointerdown',e=>{e.preventDefault();d.goster='kaynak2';ciz()},sg);
  for(const o of['pointerup','pointercancel','pointerleave'])kr.addEventListener(o,()=>{if(d.goster==='kaynak2'){d.goster='sonuc';ciz()}},sg);
  kr.addEventListener('contextmenu',e=>e.preventDefault(),sg);
  try{ro?.disconnect()}catch(_){}ro=null;
  if(typeof ResizeObserver==='function'){ro=new ResizeObserver(()=>{if(S?.duzen===d){duzenBoyutla();ciz()}});ro.observe(stage)}
  mesgul('Sayfa açılıyor…');
  try{
    d.src=await kaynakCoz(p,MAKS_DUZEN);
    if(S?.duzen!==d)return;
    d.srcCv=veriTuval(d.src);
  }catch(e){
    console.error('[BelgeTarayici/ac]',e);mesgul('');toast('Sayfa açılamadı.');if(S?.duzen===d)listeGit();return;
  }
  mesgul('');
  duzenBoyutla();
  sekmeGec(sekme||(p.kirpildi?'filtre':'kirp'));
}
function duzenBoyutla(){
  const d=S?.duzen,stage=R('stage'),cv=R('cv');if(!d||!stage||!cv)return;
  const W=Math.max(40,stage.clientWidth),H=Math.max(40,stage.clientHeight),dpr=Math.min(global.devicePixelRatio||1,2.5);
  d.W=W;d.H=H;d.dpr=dpr;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
}
function sigdir(w,h,W,H,pad){
  const aw=Math.max(10,W-2*pad),ah=Math.max(10,H-2*pad),k=Math.min(aw/w,ah/h),rw=w*k,rh=h*k;
  return{x:(W-rw)/2,y:(H-rh)/2,w:rw,h:rh};
}
const PAD_KIRP=26,PAD_SONUC=14;
function ciz(){
  const d=S?.duzen,cv=R('cv');if(!d||!cv||!d.W)return;
  const x=cv.getContext('2d'),dpr=d.dpr;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,d.W,d.H);
  const c=d.renkler;
  if(d.sekme==='kirp'){
    if(!d.srcCv)return;
    const r=d.r=sigdir(d.srcCv.width,d.srcCv.height,d.W,d.H,PAD_KIRP);
    x.imageSmoothingQuality='high';x.drawImage(d.srcCv,r.x,r.y,r.w,r.h);
    const q=d.p.koseler.map(k=>({x:r.x+k.x*r.w,y:r.y+k.y*r.h}));
    x.save();x.beginPath();x.rect(r.x,r.y,r.w,r.h);q.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();
    x.fillStyle=c.scrim;x.fill('evenodd');x.restore();
    x.beginPath();q.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();
    x.lineWidth=2.5;x.lineJoin='round';x.strokeStyle=c.accent;x.stroke();
    for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;x.beginPath();x.arc(mx,my,7,0,Math.PI*2);x.fillStyle=c.surface;x.fill();x.lineWidth=2;x.strokeStyle=c.accent;x.stroke()}
    for(const p of q){x.beginPath();x.arc(p.x,p.y,12,0,Math.PI*2);x.fillStyle=c.accent;x.globalAlpha=.28;x.fill();x.globalAlpha=1;x.beginPath();x.arc(p.x,p.y,8,0,Math.PI*2);x.fillStyle=c.surface;x.fill();x.lineWidth=3;x.strokeStyle=c.accent;x.stroke()}
    return;
  }
  const kaynak=d.goster==='kaynak2'?d.kirpikCv:d.sonucCv;
  if(!kaynak)return;
  const r=d.r=sigdir(kaynak.width,kaynak.height,d.W,d.H,PAD_SONUC);
  x.imageSmoothingQuality='high';x.drawImage(kaynak,r.x,r.y,r.w,r.h);
  x.lineWidth=1;x.strokeStyle=c.line;x.strokeRect(r.x-.5,r.y-.5,r.w+1,r.h+1);
}
/* köşe sürükleme */
function koseNoktasi(i){const d=S.duzen,r=d.r,k=d.p.koseler[i];return{x:r.x+k.x*r.w,y:r.y+k.y*r.h}}
function dokunNoktasi(e){const cv=R('cv'),b=cv.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top}}
function enYakin(pt){
  const d=S.duzen,esik=34;let en=null,mesafe=esik;
  for(let i=0;i<4;i++){const k=koseNoktasi(i),m=Math.hypot(k.x-pt.x,k.y-pt.y);if(m<mesafe){mesafe=m;en={t:'k',i}}}
  if(en)return en;
  for(let i=0;i<4;i++){const a=koseNoktasi(i),b=koseNoktasi((i+1)%4),m=Math.hypot((a.x+b.x)/2-pt.x,(a.y+b.y)/2-pt.y);if(m<mesafe){mesafe=m;en={t:'e',i}}}
  return en;
}
function kirpBas(e){
  const d=S?.duzen;if(!d||d.sekme!=='kirp'||!d.r)return;
  const pt=dokunNoktasi(e),h=enYakin(pt);if(!h)return;
  e.preventDefault();
  try{R('cv').setPointerCapture(e.pointerId)}catch(_){}
  d.drag={...h,id:e.pointerId,son:pt,bas:d.p.koseler.map(k=>({x:k.x,y:k.y}))};
  lupeGoster(pt,h);
}
function kirpHareket(e){
  const d=S?.duzen;if(!d?.drag||d.drag.id!==e.pointerId)return;
  e.preventDefault();
  const pt=dokunNoktasi(e),g=d.drag,r=d.r,k=d.p.koseler;
  if(g.t==='k'){
    k[g.i]={x:clamp((pt.x-r.x)/r.w,0,1),y:clamp((pt.y-r.y)/r.h,0,1)};
  }else{
    const a=g.i,b=(g.i+1)%4,A=g.bas[a],B=g.bas[b];
    const ex=(B.x-A.x)*r.w,ey=(B.y-A.y)*r.h,uz=Math.hypot(ex,ey)||1,nx=-ey/uz,ny=ex/uz;
    const dp=(pt.x-g.son.x)*nx+(pt.y-g.son.y)*ny;
    let dx=nx*dp/r.w,dy=ny*dp/r.h;
    /* iki köşe de 0..1 içinde kalacak kadar kaydırılır */
    for(const q of[A,B]){dx=clamp(dx,-q.x,1-q.x);dy=clamp(dy,-q.y,1-q.y)}
    k[a]={x:A.x+dx,y:A.y+dy};k[b]={x:B.x+dx,y:B.y+dy};
    g.son=pt;g.bas=[0,1,2,3].map(j=>({x:k[j].x,y:k[j].y}));
    ciz();lupeGoster(pt,g);d.degisti=true;return;
  }
  d.degisti=true;g.son=pt;ciz();lupeGoster(pt,g);
}
function kirpBitirDokunus(e){
  const d=S?.duzen;if(!d?.drag||d.drag.id!==e.pointerId)return;
  d.drag=null;
  const l=R('lupe');if(l)l.hidden=true;
  if(d.degisti){d.p.koseler=core().koseSirala(d.p.koseler);ciz()}
}
function lupeGoster(pt,h){
  const d=S.duzen,l=R('lupe');if(!l||!d.srcCv||!d.r)return;
  const L=96,dpr=d.dpr,r=d.r;
  const nokta=h.t==='k'?koseNoktasi(h.i):pt;
  if(l.width!==Math.round(L*dpr)){l.width=Math.round(L*dpr);l.height=Math.round(L*dpr)}
  l.hidden=false;
  l.classList.toggle('is-sag',pt.x<d.W/2);
  const x=l.getContext('2d'),zoom=2.6,yar=L/2/zoom,olcek=d.srcCv.width/r.w;
  x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,L,L);
  x.save();x.beginPath();x.arc(L/2,L/2,L/2-2,0,Math.PI*2);x.clip();
  x.fillStyle=d.renkler.surface;x.fillRect(0,0,L,L);
  const sx=(nokta.x-r.x-yar)*olcek,sy=(nokta.y-r.y-yar)*olcek,sw=2*yar*olcek;
  x.imageSmoothingQuality='high';x.drawImage(d.srcCv,sx,sy,sw,sw,0,0,L,L);
  x.restore();
  x.lineWidth=2;x.strokeStyle=d.renkler.accent;x.beginPath();x.arc(L/2,L/2,L/2-2,0,Math.PI*2);x.stroke();
  x.beginPath();x.moveTo(L/2-8,L/2);x.lineTo(L/2+8,L/2);x.moveTo(L/2,L/2-8);x.lineTo(L/2,L/2+8);x.stroke();
}

/* sekmeler ve paneller */
function sekmeGec(ad){
  const d=S?.duzen;if(!d)return;
  if(d.sekme==='kirp'&&ad!=='kirp')kirpBitir();
  d.sekme=ad;
  root.querySelectorAll('.bts-tabs [data-k]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.k===ad)));
  const kr=R('karsi');if(kr)kr.hidden=ad==='kirp';
  const alt=R('alt');if(alt)alt.textContent=SEKMELER.find(s=>s[0]===ad)?.[1]||'';
  panelCiz();
  if(ad==='kirp'){d.goster='sonuc';ciz();return}
  yenile();
}
function kirpBitir(){
  const d=S.duzen;
  if(d.degisti){d.p.koseler=core().koseSirala(d.p.koseler);d.p.surum++;d.kirpikGecerli=false;d.degisti=false}
  d.p.kirpildi=true;
}
function kirpikHazirla(){
  const d=S.duzen;if(d.kirpikGecerli&&d.kirpik)return;
  d.kirpik=kirp(d.src,d.p.koseler,MAKS_DUZEN);d.kirpikCv=veriTuval(d.kirpik);d.kirpikGecerli=true;d.sonuc=null;
}
/** Önizlemeyi (süzgeç+ayarlar) yeniden üretir; art arda gelen istekler tek turda birleştirilir. */
function yenile(){
  const d=S?.duzen;if(!d||d.sekme==='kirp')return;
  d.istek=true;if(d.calisiyor)return;d.calisiyor=true;
  const yaz=R('isleniyor');
  (async()=>{
    try{
      while(d.istek&&S?.duzen===d){
        d.istek=false;
        if(yaz)yaz.hidden=false;
        await bekle();
        if(S?.duzen!==d)return;
        kirpikHazirla();
        const o=core().isle(d.kirpik,d.p.ayar);
        if(S?.duzen!==d)return;
        d.sonuc=o;d.sonucCv=veriTuval(o);d.p.surum++;
        ciz();
      }
    }catch(e){console.error('[BelgeTarayici/yenile]',e);toast('Önizleme üretilemedi.')}
    finally{d.calisiyor=false;const y=R('isleniyor');if(y)y.hidden=true}
  })();
}
function panelCiz(){
  const d=S.duzen,pn=R('panel');if(!pn)return;
  const a=d.p.ayar;
  if(d.sekme==='kirp'){
    pn.innerHTML=`<p class="bts-ipucu">Köşeleri sürükleyerek belgenin kenarlarına oturtun; perspektif otomatik düzelir.</p>
      <div class="bts-chips"><button type="button" class="bts-chip" data-act="otokose">${ic('tara')}Otomatik algıla</button><button type="button" class="bts-chip" data-act="tamkose">${ic('tam')}Tüm görsel</button></div>`;
  }else if(d.sekme==='filtre'){
    pn.innerHTML=`<div class="bts-filtreler" data-r="filtreler">${core().FILTRELER.map(f=>`<button type="button" class="bts-fcard${a.filtre===f.id?' is-on':''}" data-act="filtre" data-f="${f.id}" aria-pressed="${a.filtre===f.id}"><canvas width="72" height="96" data-fc="${f.id}" aria-hidden="true"></canvas><span>${esc(f.ad)}</span></button>`).join('')}</div>
      <div class="bts-chips"><button type="button" class="bts-chip" data-act="hepsine">${ic('onay')}Tüm sayfalara uygula</button></div>`;
    pn.querySelector('.bts-fcard.is-on')?.scrollIntoView?.({inline:'center',block:'nearest'});
    filtreKucukleri();
  }else if(d.sekme==='ayarla'){
    const f=a.filtre,liste=AYARLAR.filter(s=>s.ok(f));
    pn.innerHTML=`<div class="bts-sliders">${liste.map(s=>`<label class="bts-sl"><span class="bts-sl__t">${s.ad}</span><input type="range" class="bts-range" min="${s.min}" max="${s.max}" step="1" value="${a[s.k]|0}" data-s="${s.k}" aria-label="${s.ad}"><output data-o="${s.k}">${a[s.k]|0}</output></label>`).join('')}</div>
      <div class="bts-chips"><button type="button" class="bts-chip" data-act="sifirla">Ayarları sıfırla</button><button type="button" class="bts-chip" data-act="hepsine">${ic('onay')}Tüm sayfalara uygula</button></div>`;
  }else{
    pn.innerHTML=`<div class="bts-chips bts-chips--b"><button type="button" class="bts-chip" data-act="dondursol">${ic('sol')}Sola 90°</button><button type="button" class="bts-chip" data-act="dondursag">${ic('sag')}Sağa 90°</button><button type="button" class="bts-chip bts-chip--dng" data-act="duzensil">${ic('sil')}Sayfayı sil</button></div>
      <p class="bts-ipucu">Döndürdükten sonra köşeleri Kırp sekmesinden yeniden ayarlayabilirsiniz.</p>`;
  }
}
async function filtreKucukleri(){
  const d=S.duzen;if(!d)return;
  kirpikHazirla();
  const kucuk=core().kenarSinirla(d.kirpik,170),bos=core().varsayilanAyar(),oran=clamp(kucuk.width/kucuk.height,.6,1.5);
  for(const f of core().FILTRELER){
    if(S?.duzen!==d||d.sekme!=='filtre')return;
    const cv=root.querySelector(`canvas[data-fc="${f.id}"]`);if(!cv)continue;
    await bekle();
    try{
      const o=veriTuval(core().isle(kucuk,Object.assign({},bos,{filtre:f.id}))),dpr=Math.min(global.devicePixelRatio||1,2),ch=96,cw=Math.round(ch*oran);
      cv.style.width=cw+'px';cv.style.height=ch+'px';cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);
      const x=cv.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(o,0,0,cv.width,cv.height);
      cv.closest('.bts-fcard').style.width=Math.max(84,cw+10)+'px';
    }catch(_){}
  }
}
function otoKose(){
  const d=S.duzen;
  const r=core().kenarBul(d.src);
  if(r&&r.guven>=.25){d.p.koseler=iceriAl(core().koseSirala(r.koseler));d.degisti=true;ciz();toast('Belge kenarları bulundu.')}
  else toast('Belge kenarı bulunamadı. Köşeleri elle ayarlayın.');
}
function dondurSayfa(q){
  const d=S.duzen;
  d.p.dondurme=(d.p.dondurme+q+4)%4;d.p.koseler=core().koseDondur(d.p.koseler,q);
  d.src=core().dondur(d.src,q);d.srcCv=veriTuval(d.src);d.kirpikGecerli=false;d.p.surum++;
  ciz();yenile();
}
function sayfaSil(i){
  const p=S.sayfalar[i];if(!p)return;
  if(p.kucukUrl)URL.revokeObjectURL(p.kucukUrl);
  S.sayfalar.splice(i,1);
  sheetKapat();
  if(S.ekran==='duzen'){
    if(!S.sayfalar.length){listeGit();return}
    duzenAc(Math.min(i,S.sayfalar.length-1),S.duzen?.sekme==='dondur'?'filtre':S.duzen?.sekme);
  }else listeCiz();
}
function duzenBitir(){
  const d=S?.duzen;if(!d)return;
  if(d.sekme==='kirp')kirpBitir();
  S.duzen=null;listeGit();
}
async function sayfayaGit(i){
  const d=S.duzen;if(!d)return;
  if(d.sekme==='kirp')kirpBitir();
  await duzenAc(i,d.sekme==='dondur'?'filtre':d.sekme);
}

/* ───────── PDF ───────── */
function pdfAyarAc(){
  const o=S.pdf,n=S.sayfalar.length,seg=(baslik,anahtar,liste,secili)=>`<div class="bts-seg" data-seg="${anahtar}"><span>${baslik}</span>${liste.map(([v,ad])=>`<button type="button" data-v="${v}" class="${String(secili)===String(v)?'is-on':''}">${ad}</button>`).join('')}</div>`;
  sheetAc(shBas('PDF oluştur')+`<div class="bts-sh-body">
    <label class="bts-lbl">Dosya adı<input class="bts-inp" data-f="ad" maxlength="80" value="${esc(o.ad)}" autocomplete="off"></label>
    ${seg('Sayfa boyutu','boyut',BOYUTLAR,o.boyut)}
    <div data-r="yonseg">${o.boyut==='orijinal'?'':seg('Yön','yon',YONLER,o.yon)}</div>
    ${seg('Kenar boşluğu (her sayfada)','kenarMm',KENARLAR.map(k=>[k,k+' mm']),o.kenarMm)}
    ${seg('Görüntü kalitesi','kalite',Object.entries(KALITE).map(([k,v])=>[k,v.ad]),o.kalite)}
    <p class="bts-muted">${n} sayfa · Kalite arttıkça dosya büyür; “Orta” çoğu belge için yeterlidir.</p>
    <div class="bts-sh-foot"><button type="button" class="bts-btn bts-pri" data-act="pdfuret">${ic('pdf')}PDF’i oluştur</button></div></div>`);
}
async function pdfUret(){
  const o=S.pdf,k=KALITE[o.kalite]||KALITE.orta,n=S.sayfalar.length;
  const adGir=root.querySelector('[data-f="ad"]');if(adGir)o.ad=adGir.value.trim()||o.ad;
  sheetKapat();
  const sayfalar=[];
  try{
    for(let i=0;i<n;i++){
      mesgul(`Sayfa ${i+1}/${n} işleniyor…`);await bekle();
      if(!S)return;
      sayfalar.push({jpeg:await sayfaCiktisi(S.sayfalar[i],k.maks,k.q)});
    }
    mesgul('PDF yazılıyor…');await bekle();
    const bayt=core().pdfYaz(sayfalar,{boyut:o.boyut,yon:o.yon,kenarMm:o.kenarMm,dpi:150,baslik:o.ad});
    const blob=new Blob([bayt],{type:'application/pdf'});
    const ad=await dosyaAdiYap(o.ad);
    S.sonuc={blob,ad,sayfa:n};
    mesgul('');sonucAc();
  }catch(e){
    console.error('[BelgeTarayici/pdf]',e);mesgul('');
    toast('PDF oluşturulamadı: '+(e?.message||'bilinmeyen hata'));
  }
}
async function reportEngine(){
  if(!global.ReportEngine?.savePdfBlob)await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=10');
  if(!global.ReportEngine?.savePdfBlob)throw new Error('Dosya işlemleri hazır değil.');
  return global.ReportEngine;
}
async function dosyaAdiYap(ad){
  try{return(await reportEngine()).pdfFileName(ad,'Taranan Belge')}catch(_){return String(ad||'Taranan_Belge').replace(/[^\wÀ-ɏ\s.-]+/g,'-').replace(/\.pdf$/i,'')+'.pdf'}
}
const arsivIzin=()=>!!global.DokumanlarService?.dokumanEkle&&global.PermissionService?.can?.('documents.edit','edit')!==false;
function sonucAc(){
  const s=S.sonuc;if(!s)return;
  sheetAc(shBas('PDF hazır')+`<div class="bts-sh-body"><div class="bts-sonuc"><span class="bts-sonuc__ic">${ic('pdf')}</span><div><b>${esc(s.ad)}</b><small>${s.sayfa} sayfa · ${boyutYazi(s.blob.size)}</small></div></div>
    <div class="bts-menu">
      <button type="button" class="bts-row" data-act="onizle">${ic('goz')}<span><b>Önizle</b><small>PDF’i açıp sayfalara bakın</small></span></button>
      <button type="button" class="bts-row" data-act="kaydet">${ic('indir')}<span><b>Kaydet</b><small>Cihaza indir</small></span></button>
      <button type="button" class="bts-row" data-act="paylas">${ic('paylas')}<span><b>Paylaş</b><small>WhatsApp, e-posta ve diğer uygulamalar</small></span></button>
      ${arsivIzin()?`<button type="button" class="bts-row" data-act="arsiv">${ic('klasor')}<span><b>Dökümanlara kaydet</b><small>Okul döküman arşivine ekle</small></span></button>`:''}
    </div></div>`);
}
async function sonucEylem(tur){
  const s=S.sonuc;if(!s)return;
  try{
    const RE=await reportEngine();
    if(tur==='onizle')RE.previewPdfBlob(s.blob,{title:'Taranan Belge',fileName:s.ad});
    else await RE.savePdfBlob(s.blob,s.ad,tur==='paylas');
  }catch(e){console.error('[BelgeTarayici/sonuc]',e);toast('İşlem yapılamadı: '+(e?.message||'bilinmeyen hata'))}
}
function arsivFormu(){
  const s=S.sonuc;if(!s)return;
  const yonetici=(global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{}).admin===true;
  sheetAc(shBas('Dökümanlara kaydet')+`<div class="bts-sh-body">
    <label class="bts-lbl">Belge adı<input class="bts-inp" data-f="arsivad" value="${esc(s.ad.replace(/\.pdf$/i,''))}" maxlength="120"></label>
    <label class="bts-lbl">Kategori<input class="bts-inp" data-f="arsivkat" list="btsKat" value="Diğer" maxlength="60"></label>
    <datalist id="btsKat">${KATEGORILER.map(k=>`<option value="${esc(k)}"></option>`).join('')}</datalist>
    ${yonetici?`<label class="bts-lbl">Görünürlük<select class="bts-inp" data-f="arsivgor"><option value="kisisel">Sadece bana özel</option><option value="herkes">Herkese açık</option></select></label>`:''}
    <label class="bts-lbl">Açıklama<textarea class="bts-inp bts-inp--ta" rows="2" data-f="arsivack" maxlength="300"></textarea></label>
    <div class="bts-sh-foot"><button type="button" class="bts-btn" data-act="sonucgeri">Geri</button><button type="button" class="bts-btn bts-pri" data-act="arsivkaydet" data-r="arsivbtn">Kaydet</button></div></div>`);
}
async function arsivKaydet(){
  const s=S.sonuc,sh=R('sheet'),v=f=>sh.querySelector(`[data-f="${f}"]`)?.value??'';
  const ad=v('arsivad').trim()||'PDF Belgesi',btn=R('arsivbtn');
  try{
    if(btn){btn.disabled=true;btn.textContent='Kaydediliyor…'}
    const dosya=new File([s.blob],s.ad,{type:'application/pdf',lastModified:Date.now()});
    await global.DokumanlarService.dokumanEkle({ad,kategori:v('arsivkat').trim()||'Diğer',aciklama:v('arsivack').trim(),gorunurluk:v('arsivgor')||'kisisel'},dosya,pr=>{if(btn&&typeof pr==='number')btn.textContent=`Kaydediliyor… %${Math.round(pr)}`});
    toast('PDF döküman arşivine kaydedildi.');sonucAc();
  }catch(e){
    console.error('[BelgeTarayici/arsiv]',e);toast('Kaydedilemedi: '+(e?.message||'bilinmeyen hata'));
    if(btn){btn.disabled=false;btn.textContent='Kaydet'}
  }
}

/* ───────── olaylar ───────── */
function geri(){
  if(!root)return;
  if(S.sheet){sheetKapat();return}
  if(S.ekran==='kamera'){kameraKapat();listeGit();return}
  if(S.ekran==='duzen'){duzenBitir();return}
  if(S.sayfalar.length){onayAc('Çıkılsın mı?','Taranan sayfalar henüz PDF yapılmadı; çıkarsanız silinir.','Çık',()=>{sheetKapat();kapat()},true);return}
  kapat();
}
function tikla(e){
  const b=e.target.closest('[data-act]');if(!b||!root?.contains(b)||b.disabled)return;
  const a=b.dataset.act,i=Number(b.dataset.i);
  switch(a){
    case'geri':geri();break;
    case'sheetclose':sheetKapat();break;
    case'onayevet':{const f=S.onay;S.onay=null;if(f)f();break}
    case'kamera':kameraAc();break;
    case'galeri':R('galeri').click();break;
    case'sistemkamera':R('sistemkamera').click();break;
    case'kamerabitti':kameraKapat();listeGit();break;
    case'cek':cekmeyiDene();break;
    case'oto':if(S.kam){S.kam.otomatik=!S.kam.otomatik;S.kamOto=S.kam.otomatik;oto_(S.kam.otomatik);camDurumYaz(S.kam.otomatik?'Otomatik çekim açık':'Otomatik çekim kapalı')}break;
    case'fener':{const K=S.kam;if(K?.k){K.k.fener(!K.k.fenerAcik).then(acik=>{b.setAttribute('aria-pressed',String(!!acik));b.classList.toggle('is-on',!!acik)})}break}
    case'duzenle':duzenAc(i);break;
    case'sola':case'saga':{const j=a==='sola'?i-1:i+1;if(j>=0&&j<S.sayfalar.length){[S.sayfalar[i],S.sayfalar[j]]=[S.sayfalar[j],S.sayfalar[i]];listeCiz()}break}
    case'sayfasil':onayAc('Sayfa silinsin mi?',`${i+1}. sayfa silinecek.`,'Sil',()=>sayfaSil(i),true);break;
    case'pdf':pdfAyarAc();break;
    case'pdfuret':pdfUret();break;
    case'onizle':case'kaydet':case'paylas':sonucEylem(a);break;
    case'arsiv':arsivFormu();break;
    case'sonucgeri':sonucAc();break;
    case'arsivkaydet':arsivKaydet();break;
    case'tamam':duzenBitir();break;
    case'onceki':sayfayaGit(S.duzen.i-1);break;
    case'sonraki':sayfayaGit(S.duzen.i+1);break;
    case'sekme':if(S.duzen)sekmeGec(b.dataset.k);break;
    case'otokose':otoKose();break;
    case'tamkose':{const d=S.duzen;d.p.koseler=TAM();d.degisti=true;ciz();break}
    case'filtre':{const d=S.duzen;d.p.ayar.filtre=b.dataset.f;d.p.surum++;
      root.querySelectorAll('.bts-fcard').forEach(x=>{const on=x.dataset.f===b.dataset.f;x.classList.toggle('is-on',on);x.setAttribute('aria-pressed',String(on))});yenile();break}
    case'sifirla':{const d=S.duzen,f=d.p.ayar.filtre;d.p.ayar=Object.assign(core().varsayilanAyar(),{filtre:f});panelCiz();yenile();break}
    case'hepsine':{const d=S.duzen;for(const p of S.sayfalar){if(p!==d.p){p.ayar=Object.assign({},d.p.ayar);p.surum++}}toast('Ayarlar tüm sayfalara uygulandı.');break}
    case'dondursol':dondurSayfa(3);break;
    case'dondursag':dondurSayfa(1);break;
    case'duzensil':onayAc('Sayfa silinsin mi?',`${S.duzen.i+1}. sayfa silinecek.`,'Sil',()=>sayfaSil(S.duzen.i),true);break;
  }
}
function girdi(e){
  const t=e.target;
  if(t.matches?.('[data-s]')&&S?.duzen){
    const k=t.dataset.s,d=S.duzen;d.p.ayar[k]=Number(t.value)||0;
    const o=root.querySelector(`[data-o="${k}"]`);if(o)o.textContent=String(d.p.ayar[k]);
    yenile();
  }
}
function degis(e){
  const t=e.target;
  if(t.dataset?.r==='galeri'||t.dataset?.r==='sistemkamera'){
    const f=[...t.files];t.value='';
    if(f.length){
      if(S.ekran==='kamera'){kameraKapat();S.ekran='liste';listeCiz()}
      dosyalariEkle(f);
    }
  }
}
function segTikla(e){
  const b=e.target.closest('.bts-seg [data-v]');if(!b||!S)return;
  const k=b.closest('[data-seg]').dataset.seg,v=b.dataset.v;
  S.pdf[k]=(k==='kenarMm')?Number(v):v;
  b.closest('[data-seg]').querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('is-on',x===b));
  if(k==='boyut'){
    const y=R('yonseg');
    if(y)y.innerHTML=v==='orijinal'?'':`<div class="bts-seg" data-seg="yon"><span>Yön</span>${YONLER.map(([a,ad])=>`<button type="button" data-v="${a}" class="${S.pdf.yon===a?'is-on':''}">${ad}</button>`).join('')}</div>`;
  }
}
function tusa(e){if(e.key==='Escape'&&root){e.preventDefault();geri()}}

/* ───────── yaşam döngüsü ───────── */
const KABUK=`<div class="bts-app">
  <div class="bts-screen" data-r="ekran"></div>
  <div class="bts-mesgul" data-r="mesgul" role="status" aria-live="polite" hidden></div>
  <div class="bts-scrim" data-r="scrim" data-on="0" data-act="sheetclose"></div>
  <section class="bts-sheet" data-r="sheet" role="dialog" aria-modal="true" aria-label="Belge tarayıcı işlemleri" tabindex="-1" hidden></section>
  <input type="file" hidden accept="image/*" multiple data-r="galeri">
  <input type="file" hidden accept="image/*" capture="environment" data-r="sistemkamera">
</div>`;
async function bagimlilik(){
  if(core()&&kam())return;
  for(const s of SRC)await global.AppLoader?.loadScript?.(s);
  if(!(core()&&kam()))throw new Error('Belge tarayıcı bileşenleri yüklenemedi.');
}
async function ac_(opts){
  opts=opts||{};
  if(root)kapat(true);
  await bagimlilik();
  S={ekran:'liste',sayfalar:[],sayac:0,duzen:null,kam:null,kamOto:false,sheet:false,onay:null,sonuc:null,onClose:opts.onClose||null,
    pdf:{ad:'Tarama '+bugun(),boyut:'a4',yon:'otomatik',kenarMm:10,kalite:'orta'}};
  root=D.createElement('div');root.className='bts-root';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Belge tarayıcı');root.setAttribute('data-belge-tarayici','');root.setAttribute('data-ptr-block','');
  root.innerHTML=KABUK;(opts.host||D.body).appendChild(root);
  try{D.body.classList.add('modal-open')}catch(_){}
  try{const r=global.KorukPlatformAdapter?.setPullToRefreshEnabled?.(false);if(r?.catch)r.catch(()=>{})}catch(_){}
  ac=new AbortController();const sg={signal:ac.signal};
  root.addEventListener('click',tikla,sg);root.addEventListener('click',segTikla,sg);root.addEventListener('input',girdi,sg);root.addEventListener('change',degis,sg);
  D.addEventListener('keydown',tusa,sg);
  listeCiz();
  return true;
}
function kapat(sessiz){
  if(!root)return;
  const cb=S?.onClose;
  try{S?.kam?.k?.durdur()}catch(_){}
  try{ac?.abort()}catch(_){}ac=null;try{ro?.disconnect()}catch(_){}ro=null;
  for(const p of(S?.sayfalar||[]))if(p.kucukUrl){try{URL.revokeObjectURL(p.kucukUrl)}catch(_){}}
  root.remove();root=null;S=null;
  try{D.body.classList.remove('modal-open')}catch(_){}
  try{const r=global.KorukPlatformAdapter?.setPullToRefreshEnabled?.(true);if(r?.catch)r.catch(()=>{})}catch(_){}
  if(!sessiz&&typeof cb==='function'){try{cb()}catch(_){}}
}
global.BelgeTarayici={open:ac_,close:kapat,isOpen:()=>!!root,
  _t:{durum:()=>S,AYARLAR,tamMi,TAM,iceriAl,KALITE,sayfaCiktisi,kirp,kaynakCoz,veriTuval}};
})(window);
