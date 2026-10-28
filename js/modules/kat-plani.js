/* Koruk Asistan — Kat Planı / Acil Durum Tahliye Planı editörü
 * Okul › Kat Planı (yalnız admin ve yönetici). Kat projesini (PDF/görsel) altlık olarak alır; üzerine yangın söndürücü, alarm, elektrik panosu,
 * ilk yardım gibi işaretleri, yeşil kaçış yollarını ve "ŞU AN BURADASINIZ" noktalarını koydurur; A3/A4 PDF, JPEG (≤150 KB) ve yazdırma çıktısı verir.
 *
 * Katmanlar: kat-plani-core.js (veri/geometri) · kat-plani-image.js (altlık hazırlama) · kat-plani-cizim.js (çizim/çıktı) · bu dosya (arayüz + kayıt).
 * Kayıt yerel-öncelikli: DeviceData → IndexedDB; Firestore yalnız arka plan eşitlemesidir. Koleksiyon oy_katPlanlari:
 *   <katId> (kat belgesi, küçük) · <katId>__altlik (proje görüntüsü) · ayar (başlık, okul adı, onay bloğu).
 * Görünüm TAMAMEN merkezi CSS'tedir: css/design-system-base.css → ".kpl-" kuralları.
 */
(function(global){
'use strict';
if(global.KatPlani)return;
const D=document;
const TIP='katPlanlari';
const SRC=['js/modules/kat-plani-core.js?v=2','js/modules/kat-plani-image.js?v=2','js/modules/kat-plani-cizim.js?v=2'];
const core=()=>global.KatPlaniCore,Z=()=>global.KatPlaniCizim,IM=()=>global.KatPlaniImage;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const toast=(m,o)=>{try{global.toast?.(m,o)}catch(_){}};
const bugun=()=>{const d=new Date();return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear()};
const TR_ASCII={'Ç':'C','ç':'c','Ğ':'G','ğ':'g','İ':'I','ı':'i','Ö':'O','ö':'o','Ş':'S','ş':'s','Ü':'U','ü':'u'};
const dosyaAdi=s=>String(s||'').replace(/[ÇçĞğİıÖöŞşÜü]/g,c=>TR_ASCII[c]).replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'Plan';
const ICONS={
  close:'<path d="M6 6l12 12M18 6L6 18"/>',undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
  more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
  fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',sec:'<path d="M5 3l14 8-6 2-2 6z"/>',sembol:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
  yol:'<path d="M4 18c5 0 3-6 8-6s3-6 8-6"/><path d="M17 3l3 3-3 3"/>',bur:'<path d="M12 21s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>',
  sil:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',dondur:'<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v5h-5"/>',check:'<path d="M5 12l5 5 9-10"/>',
  uyari:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',resim:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  cikti:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',ayar:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  liste:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',kalem:'<path d="M4 20h4L19 9l-4-4L4 16z"/>'
};
const ic=n=>`<svg class="kpl-ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;

let S=null,root=null,ac=null,ro=null,raf=0;
const R=n=>root?.querySelector(`[data-r="${n}"]`);

/* ───────── kimlik / yetki / okul bilgisi ───────── */
const kullanici=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const duzenleyebilir=()=>kullanici().admin===true||!!global.PermissionService?.isManager?.();
function okulAdi(){try{return global.ReportEngine?.schoolInfo?.().okulAdi||''}catch(_){return''}}
function mudurAdi(){
  const l=arr('okulBilgileri'),o=l.find(r=>r.id==='ayarlar')||l[0]||{},t=arr('ogretmenler').find(x=>String(x.id)===String(o.mudurId||o.mudirId||''));
  return(t?`${t.ad||''} ${t.soyad||''}`:String(o.mudurAdSoyad||o.mudurAdi||'')).trim();
}
const ayarEtkin=()=>({...S.ayar,okulAdi:S.ayar.okulAdi||okulAdi(),onayAd:S.ayar.onayAd||mudurAdi(),onayTarih:S.ayar.onayTarih||bugun()});

/* ───────── yükleme / kayıt ───────── */
async function bagimlilik(){
  if(core()&&Z()&&IM())return;
  for(const s of SRC)await global.AppLoader?.loadScript?.(s);
  if(!(core()&&Z()&&IM()))throw new Error('Kat planı bileşenleri yüklenemedi.');
}
async function veriHazirla(){
  if(global.SyncEngine&&global.COL?.[TIP]){
    global.SyncEngine.register(TIP,global.COL[TIP]);
    try{await global.SyncEngine.localHydrate([TIP])}catch(e){console.warn('[KatPlani/hydrate]',e)}
  }
}
const satirlar=()=>{try{return global.DeviceData?.list?.(TIP)||[]}catch(_){return[]}};
async function katlariKur(){
  const C=core(),rows=satirlar(),alt=new Map();
  rows.filter(r=>r&&r.tur==='altlik'&&r.katId).forEach(r=>alt.set(r.katId,r));
  const katlar=rows.filter(r=>r&&r.tur==='kat').map(r=>C.normalizeKat(r));
  for(const k of katlar){
    const a=alt.get(k.id);k._u=[];k._r=[];k.altlik=null;
    if(a&&a.veri){
      k.altlik={veri:a.veri,w:a.w||k.w,h:a.h||k.h,resim:null};
      Z().resimYukle(a.veri).then(im=>{k.altlik.resim=im;if(root&&aktif()===k)iste()}).catch(()=>{});
    }
  }
  if(!katlar.length){const k=C.yeniKat('Zemin Kat');k._u=[];k._r=[];k.altlik=null;katlar.push(k)}
  katlar.sort((a,b)=>a.sira-b.sira||a.ad.localeCompare(b.ad,'tr'));
  const ayar=C.normalizeAyar(rows.find(r=>r&&r.tur==='ayar')||{});
  return{katlar,ayar};
}
function kirletKat(k){S.kirli.add(k.id);k.guncellendi=new Date().toISOString();durumGuncelle()}
const kirliMi=()=>S&&(S.kirli.size>0||S.silinen.size>0||S.ayarKirli);
async function kaydet(){
  if(!S||S.kaydediyor)return false;
  if(!kirliMi())return true;
  if(!duzenleyebilir()){toast('Kat planını düzenleme yetkiniz yok.');return false}
  S.kaydediyor=true;durumGuncelle();
  try{
    const DD=global.DeviceData,COLN=global.COL?.[TIP];
    if(!DD||!COLN)throw new Error('Cihaz deposu hazır değil.');
    const C=core();
    for(const id of [...S.kirli]){
      const k=S.katlar.find(x=>x.id===id);if(!k)continue;
      await DD.set(TIP,COLN,k.id,C.katBelgesi(k),{merge:false});
      if(k.altlikKirli){
        if(k.altlik)await DD.set(TIP,COLN,C.altlikId(k.id),{tur:'altlik',katId:k.id,w:k.altlik.w,h:k.altlik.h,veri:k.altlik.veri},{merge:false});
        else await DD.remove(TIP,COLN,C.altlikId(k.id));
        k.altlikKirli=false;
      }
    }
    for(const id of [...S.silinen]){await DD.remove(TIP,COLN,id);await DD.remove(TIP,COLN,C.altlikId(id))}
    if(S.ayarKirli)await DD.set(TIP,COLN,'ayar',{tur:'ayar',...S.ayar},{merge:false});
    S.kirli.clear();S.silinen.clear();S.ayarKirli=false;
    try{global.SyncEngine?.schedule?.(0)}catch(_){}
    toast('Kaydedildi.');return true;
  }catch(e){console.error('[KatPlani/kaydet]',e);toast('Kaydedilemedi: '+(e?.message||e));return false}
  finally{S.kaydediyor=false;durumGuncelle()}
}

/* ───────── model işlemleri ───────── */
const aktif=()=>S.katlar.find(k=>k.id===S.aktifId)||S.katlar[0];
const anlik=k=>JSON.stringify({ogeler:k.ogeler,yollar:k.yollar,buradasiniz:k.buradasiniz,sembolBoyut:k.sembolBoyut});
function geriYaz(k,j){const o=JSON.parse(j);k.ogeler=o.ogeler;k.yollar=o.yollar;k.buradasiniz=o.buradasiniz;k.sembolBoyut=o.sembolBoyut}
function degisim(k){                    /* değişiklikten ÖNCE çağrılır: geri alma noktası koyar */
  k._u.push(anlik(k));if(k._u.length>60)k._u.shift();k._r=[];
}
function sonrasi(k){kirletKat(k);iste();selCiz();ipucuCiz()}
function geriAl(){const k=aktif();if(!k||!k._u.length)return;k._r.push(anlik(k));geriYaz(k,k._u.pop());S.sec=null;S.taslak=null;kirletKat(k);iste();selCiz();ipucuCiz();palCiz()}
function yinele(){const k=aktif();if(!k||!k._r.length)return;k._u.push(anlik(k));geriYaz(k,k._r.pop());S.sec=null;S.taslak=null;kirletKat(k);iste();selCiz();ipucuCiz();palCiz()}
function katSec(id){
  if(!S.katlar.some(k=>k.id===id))return;
  S.aktifId=id;S.sec=null;S.taslak=null;S.hover=null;
  tabsCiz();selCiz();ipucuCiz();durumGuncelle();sigdir();palCiz();
}

/* ───────── görünüm: izgara, kamera ───────── */
function iste(){if(!raf)raf=requestAnimationFrame(ciz)}
function ekran2model(px,py){const g=S.g;return{x:(px-g.x)/g.z,y:(py-g.y)/g.z}}
function sigdir(){
  const st=R('stage');if(!st||!S)return;const k=aktif(),w=st.clientWidth||1,h=st.clientHeight||1;
  const z=Math.max(.01,Math.min((w-20)/k.w,(h-20)/k.h));
  S.fitZ=z;S.g={z,x:(w-k.w*z)/2,y:(h-k.h*z)/2};iste();
}
function zoomla(f,cx,cy){
  const st=R('stage'),g=S.g;if(cx==null){cx=st.clientWidth/2;cy=st.clientHeight/2}
  const z=clamp(g.z*f,S.fitZ*.35,S.fitZ*12),r=z/g.z;g.x=cx-(cx-g.x)*r;g.y=cy-(cy-g.y)*r;g.z=z;iste();
}
function boyutla(){
  const st=R('stage'),cv=R('cv');if(!st||!cv)return;
  const dpr=Math.min(3,global.devicePixelRatio||1),w=st.clientWidth,h=st.clientHeight;
  S.dpr=dpr;const pw=Math.max(1,Math.round(w*dpr)),ph=Math.max(1,Math.round(h*dpr));
  if(cv.width!==pw||cv.height!==ph){cv.width=pw;cv.height=ph}
  if(!S.kameraDokunuldu)sigdir();else iste();
}
function ciz(){
  raf=0;if(!root||!S)return;
  const cv=R('cv'),k=aktif();if(!cv||!k)return;
  const c=cv.getContext('2d'),dpr=S.dpr||1,g=S.g,C=core();
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);
  c.setTransform(dpr*g.z,0,0,dpr*g.z,dpr*g.x,dpr*g.y);
  c.save();c.shadowColor='rgba(0,0,0,.25)';c.shadowBlur=8*dpr;c.fillStyle='#fff';c.fillRect(0,0,k.w,k.h);c.restore();
  const gorunen=S.taslak&&S.taslak.yi!=null?{...k,yollar:k.yollar.filter((_,i)=>i!==S.taslak.yi)}:k;
  Z().planCiz(c,gorunen,k.altlik?.resim||null,{bur:'tum'});
  const px=1/g.z,sp=C.sembolPx(k),acc=S.accent;
  /* kaçış yolu taslağı */
  if(S.taslak&&S.taslak.noktalar.length){
    const pts=S.taslak.noktalar.slice();
    if(S.hover&&S.arac==='yol')pts.push(yakala(k,S.hover,pts[pts.length-1]));
    c.save();c.globalAlpha=.88;if(pts.length>=2)Z().yolCiz(c,k,{noktalar:pts});c.restore();
    c.save();c.lineWidth=2*px;c.strokeStyle=acc;c.fillStyle='#fff';
    S.taslak.noktalar.forEach(p=>{c.beginPath();c.arc(p[0],p[1],6*px,0,Math.PI*2);c.fill();c.stroke()});c.restore();
  }else if(S.hover&&S.arac==='sembol'&&S.fare){
    c.save();c.globalAlpha=.5;Z().sembolCiz(c,S.sembolTur,S.hover.x,S.hover.y,sp,0);c.restore();
  }
  /* seçim ve tutamaklar */
  c.save();c.lineWidth=2*px;c.strokeStyle=acc;c.setLineDash([6*px,4*px]);
  const s=S.sec;
  if(s){
    if(s.t==='oge'&&k.ogeler[s.i]){
      const o=k.ogeler[s.i],a=C.ogeYari(k,o,Z().metinGenislik);
      if(o.tur==='etiket')c.strokeRect(o.x-a.hw-6*px,o.y-a.hh-6*px,2*a.hw+12*px,2*a.hh+12*px);
      else{c.beginPath();c.arc(o.x,o.y,a.s*.78,0,Math.PI*2);c.stroke()}
    }
    else if(s.t==='bur'&&k.buradasiniz[s.i]){const b=k.buradasiniz[s.i];c.beginPath();c.arc(b.x,b.y,sp*(b.boy||1)*.72,0,Math.PI*2);c.stroke()}
  }
  c.restore();
  const yolSec=s&&(s.t==='yol'||s.t==='nokta')?s.yi:-1;
  if(S.arac==='sec'||S.arac==='yol'){
    k.yollar.forEach((y,yi)=>{
      if(yi!==yolSec&&S.arac!=='yol')return;
      if(S.taslak&&S.taslak.yi===yi)return;
      y.noktalar.forEach((p,ni)=>{
        const sel=s&&s.t==='nokta'&&s.yi===yi&&s.ni===ni;
        c.save();c.beginPath();c.arc(p[0],p[1],(sel?8:6)*px,0,Math.PI*2);c.fillStyle=sel?acc:'#fff';c.fill();c.lineWidth=2*px;c.strokeStyle=acc;c.stroke();c.restore();
      });
    });
  }
}

/* ───────── arayüz parçaları ───────── */
function tabsCiz(){
  const t=R('tabs');if(!t)return;
  t.innerHTML=S.katlar.map(k=>`<button type="button" class="kpl-tab${k.id===S.aktifId?' is-on':''}" data-act="kat" data-id="${esc(k.id)}" aria-pressed="${k.id===S.aktifId}">${esc(k.ad)}</button>`).join('')
    +'<button type="button" class="kpl-tab kpl-tab--add" data-act="katekle" aria-label="Kat ekle">'+ic('plus')+'</button>';
  const on=t.querySelector('.is-on');try{on?.scrollIntoView({block:'nearest',inline:'center'})}catch(_){}
}
function palCiz(){
  const p=R('pal');if(!p)return;
  p.hidden=S.arac!=='sembol';
  if(p.hidden)return;
  const C=core();
  if(!p.dataset.kur){
    p.dataset.kur='1';
    p.innerHTML=`<div class="kpl-pal__bas"><div class="kpl-gruplar" role="tablist" aria-label="Sembol grupları">${C.GRUPLAR.map(g=>`<button type="button" class="kpl-gchip" role="tab" data-act="grup" data-g="${g.id}">${esc(g.ad)}</button>`).join('')}</div>`
      +`<span class="kpl-genel" role="group" aria-label="Tüm sembollerin boyutu"><button type="button" data-act="genelboy" data-d="-1" aria-label="Tüm sembolleri küçült">${ic('minus')}</button><output data-r="genelboy" title="Tüm sembollerin boyutu"></output><button type="button" data-act="genelboy" data-d="1" aria-label="Tüm sembolleri büyüt">${ic('plus')}</button></span></div>`
      +'<div class="kpl-pal__liste" data-r="pallist"></div>';
  }
  p.querySelectorAll('.kpl-gchip').forEach(b=>{const on=b.dataset.g===S.grup;b.classList.toggle('is-on',on);b.setAttribute('aria-selected',String(on))});
  const l=R('pallist');
  if(l.dataset.g!==S.grup){
    l.dataset.g=S.grup;
    l.innerHTML=C.SEMBOLLER.filter(s=>s.grup===S.grup).map(s=>`<button type="button" class="kpl-sym" data-act="sembol" data-tur="${s.id}" aria-label="${esc(s.ad)}"><canvas width="88" height="88" data-sym="${s.id}"></canvas><span>${esc(s.kisa)}</span></button>`).join('');
    l.querySelectorAll('canvas[data-sym]').forEach(cv=>{const c=cv.getContext('2d');c.translate(44,44);Z().sembolCiz(c,cv.dataset.sym,0,0,64,0,'Aa')});
    l.scrollLeft=0;
  }
  l.querySelectorAll('.kpl-sym').forEach(b=>b.classList.toggle('is-on',b.dataset.tur===S.sembolTur));
  const o=R('genelboy');if(o)o.textContent=Math.round(aktif().sembolBoyut*100)+'%';
}
function aracCiz(){
  root.querySelectorAll('[data-act="arac"]').forEach(b=>{const on=b.dataset.a===S.arac;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on))});
  palCiz();
}
function ipucuCiz(){
  const el=R('hint');if(!el)return;
  const sb=core().sembol(S.sembolTur);
  const m={sec:'Nesneye dokunup sürükleyin; iki parmakla yakınlaştırın.',
    sembol:`${sb?sb.ad:'Sembol'}: yerleştirmek için plana dokunun.`,
    yol:S.taslak&&S.taslak.noktalar.length?'Sonraki noktaya dokunun; bitirmek için "Bitti" ya da çift dokunun.':'Kaçış yolunun başlangıç noktasına dokunun.',
    bur:'"Şu an buradasınız" için plana dokunun.'};
  el.textContent=m[S.arac]||'';
  const k=aktif(),bos=!k.altlik&&!k.ogeler.length&&!k.yollar.length&&!k.buradasiniz.length;
  const e=R('empty');if(e)e.hidden=!bos;
}
/* Seçili sembolün/noktanın kendi boyutu (katın genel boyutuna ek çarpan) */
const boyDenetimi=o=>`<label class="kpl-boyrow"><span>Boyut</span><input class="kpl-range" data-r="ogeboy" type="range" min="0.4" max="4" step="0.1" value="${o.boy||1}" aria-label="Seçili öğenin boyutu"></label>`;
function selCiz(){
  const el=R('sel');if(!el)return;
  const k=aktif(),s=S.sec;let h='';
  if(S.taslak){
    const n=S.taslak.noktalar.length;
    h=`<span class="kpl-sel__t">Kaçış yolu çiziliyor · ${n} nokta</span>`
      +`<button type="button" class="kpl-btn" data-act="sonnoktasil"${n?'':' disabled'}>${ic('undo')}Son noktayı sil</button>`
      +`<button type="button" class="kpl-btn" data-act="taslakiptal">Vazgeç</button>`
      +`<button type="button" class="kpl-btn kpl-pri" data-act="bitti"${n>=2?'':' disabled'}>${ic('check')}Bitti</button>`;
  }else if(s&&s.t==='oge'&&k.ogeler[s.i]){
    const o=k.ogeler[s.i],sb=core().sembol(o.tur),yazi=o.tur==='etiket';
    h=`<span class="kpl-sel__t">${esc(sb?sb.ad:'Sembol')}</span>`
      +`<input class="kpl-inp" data-r="ogenot" list="kplOda" type="text" maxlength="60" placeholder="${yazi?'Oda adı (örn. Kazan Dairesi)':'Etiket (isteğe bağlı)'}" value="${esc(o.not)}" aria-label="${yazi?'Oda adı':'Sembol etiketi'}">`
      +boyDenetimi(o)
      +(o.tur==='cikis'?`<button type="button" class="kpl-btn" data-act="dondur">${ic('dondur')}Döndür</button>`:'')
      +`<button type="button" class="kpl-btn kpl-dng" data-act="sil">${ic('sil')}Sil</button>`;
  }else if(s&&s.t==='bur'&&k.buradasiniz[s.i]){
    h=`<input class="kpl-inp" data-r="burad" type="text" maxlength="40" placeholder="Bu noktanın adı (örn. Ana giriş)" value="${esc(k.buradasiniz[s.i].ad)}" aria-label="Nokta adı">`
      +boyDenetimi(k.buradasiniz[s.i])
      +`<button type="button" class="kpl-btn kpl-dng" data-act="sil">${ic('sil')}Sil</button>`;
  }else if(s&&s.t==='nokta'){
    h=`<span class="kpl-sel__t">Yol noktası</span>`
      +`<button type="button" class="kpl-btn" data-act="noktasil">${ic('sil')}Noktayı sil</button>`
      +`<button type="button" class="kpl-btn kpl-dng" data-act="yolsil">Yolu sil</button>`;
  }else if(s&&s.t==='yol'){
    h=`<span class="kpl-sel__t">Kaçış yolu</span>`
      +`<button type="button" class="kpl-btn" data-act="uzat">${ic('yol')}Uzat</button>`
      +`<button type="button" class="kpl-btn kpl-dng" data-act="yolsil">${ic('sil')}Yolu sil</button>`;
  }
  el.innerHTML=h;el.hidden=!h;
}
function eksikSayisi(k){return core().kontrol(k,{altlik:!!k.altlik}).filter(x=>!x.ok).length}
function durumGuncelle(){
  if(!root||!S)return;
  const k=aktif(),u=R('undo'),r=R('redo'),sv=R('save');
  if(u)u.disabled=!k||!k._u.length;if(r)r.disabled=!k||!k._r.length;
  if(sv){const d=kirliMi();sv.classList.toggle('is-dirty',!!d);sv.disabled=!!S.kaydediyor;sv.textContent=S.kaydediyor?'Kaydediliyor…':(d?'Kaydet':'Kaydedildi')}
  const e=eksikSayisi(k),sub=R('sub');if(sub)sub.textContent=`${k.ad} · ${e?e+' madde eksik':'Kontrol listesi tamam'}`;
}

/* ───────── dokunma / fare ───────── */
function yakala(k,m,onceki){
  let p=[m.x,m.y];const tol=14/S.g.z;
  for(const y of k.yollar)for(const q of y.noktalar)if(core().uzaklik(m.x,m.y,q[0],q[1])<tol)return[q[0],q[1]];
  if(onceki){
    const dx=p[0]-onceki[0],dy=p[1]-onceki[1],L=Math.hypot(dx,dy);
    if(L>0){const a=Math.atan2(dy,dx),adim=Math.PI/4,n=Math.round(a/adim);if(Math.abs(a-n*adim)<5*Math.PI/180){const a2=n*adim;p=[onceki[0]+Math.cos(a2)*L,onceki[1]+Math.sin(a2)*L]}}
  }
  return[Math.round(p[0]*10)/10,Math.round(p[1]*10)/10];
}
function projeksiyon(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy,t=l2?clamp(((p.x-a[0])*dx+(p.y-a[1])*dy)/l2,0,1):0;return[a[0]+t*dx,a[1]+t*dy]}
function dokunBas(e){
  if(S.sheet)return;
  const cv=R('cv'),r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  S.fare=e.pointerType==='mouse';
  S.ptr.set(e.pointerId,{x,y});
  if(S.ptr.size===2){const [a,b]=[...S.ptr.values()];S.pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1};S.drag=null;return}
  const k=aktif(),m=ekran2model(x,y),tol=16/S.g.z;
  const d={sx:x,sy:y,m0:m,hit:null,hareket:false,mod:'bekle',gx:S.g.x,gy:S.g.y};
  if(S.arac==='sec'){
    let hit=core().isabet(k,m.x,m.y,tol,Z().metinGenislik);
    if(hit&&hit.t==='yol'&&S.sec&&(S.sec.t==='yol'||S.sec.t==='nokta')&&S.sec.yi===hit.yi){   /* seçili yolun doğrusuna dokun: yeni köşe ekle */
      const y=k.yollar[hit.yi],p=projeksiyon(m,y.noktalar[hit.ni-1],y.noktalar[hit.ni]);
      degisim(k);y.noktalar.splice(hit.ni,0,[Math.round(p[0]*10)/10,Math.round(p[1]*10)/10]);hit={t:'nokta',yi:hit.yi,ni:hit.ni};d.eklendi=true;
    }
    if(hit){S.sec=hit;d.hit=hit;d.mod='tasi';d.anlikAlindi=!!d.eklendi;
      if(hit.t==='oge'){const o=k.ogeler[hit.i];d.o0={x:o.x,y:o.y}}
      else if(hit.t==='bur'){const b=k.buradasiniz[hit.i];d.o0={x:b.x,y:b.y}}
      else if(hit.t==='nokta'){const p=k.yollar[hit.yi].noktalar[hit.ni];d.o0={x:p[0],y:p[1]}}
      else if(hit.t==='yol')d.o0=k.yollar[hit.yi].noktalar.map(p=>[p[0],p[1]]);
      selCiz();iste();
    }else d.mod='pan';
  }
  S.drag=d;
}
function dokunHareket(e){
  const cv=R('cv');if(!cv)return;const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  if(e.pointerType==='mouse'&&S&&!S.drag&&!S.pinch){S.fare=true;S.hover=ekran2model(x,y);if(S.arac==='sembol'||(S.arac==='yol'&&S.taslak))iste()}
  if(!S.ptr.has(e.pointerId))return;
  const onceki=S.ptr.get(e.pointerId);S.ptr.set(e.pointerId,{x,y});
  if(S.pinch&&S.ptr.size>=2){
    const [a,b]=[...S.ptr.values()],d=Math.hypot(a.x-b.x,a.y-b.y)||1,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    zoomla(d/S.pinch.d,mx,my);S.pinch.d=d;S.kameraDokunuldu=true;
    S.g.x+=(x-onceki.x)/2;S.g.y+=(y-onceki.y)/2;iste();return;
  }
  const d=S.drag;if(!d)return;
  const dx=x-d.sx,dy=y-d.sy;
  if(!d.hareket&&Math.hypot(dx,dy)>6)d.hareket=true;
  if(!d.hareket)return;
  const k=aktif();
  if(d.mod==='pan'||d.mod==='bekle'){S.g.x=d.gx+dx;S.g.y=d.gy+dy;S.kameraDokunuldu=true;iste();return}
  if(d.mod==='tasi'){
    if(!d.anlikAlindi){degisim(k);d.anlikAlindi=true}
    const m=ekran2model(x,y),mx=m.x-d.m0.x,my=m.y-d.m0.y,h=d.hit,rd=v=>Math.round(v*10)/10;
    if(h.t==='oge'){const o=k.ogeler[h.i];o.x=rd(clamp(d.o0.x+mx,0,k.w));o.y=rd(clamp(d.o0.y+my,0,k.h))}
    else if(h.t==='bur'){const b=k.buradasiniz[h.i];b.x=rd(clamp(d.o0.x+mx,0,k.w));b.y=rd(clamp(d.o0.y+my,0,k.h))}
    else if(h.t==='nokta'){const p=k.yollar[h.yi].noktalar[h.ni];p[0]=rd(clamp(d.o0.x+mx,0,k.w));p[1]=rd(clamp(d.o0.y+my,0,k.h))}
    else if(h.t==='yol'){k.yollar[h.yi].noktalar.forEach((p,i)=>{p[0]=rd(d.o0[i][0]+mx);p[1]=rd(d.o0[i][1]+my)})}
    d.degisti=true;iste();
  }
}
function dokunBitir(e){
  const had=S.ptr.delete(e.pointerId);
  try{R('cv').releasePointerCapture(e.pointerId)}catch(_){}
  if(S.pinch){if(S.ptr.size<2)S.pinch=null;S.drag=null;return}
  const d=S.drag;S.drag=null;
  if(!had||!d)return;
  const k=aktif();
  if(d.mod==='tasi'){if(d.degisti||d.eklendi)sonrasi(k);else{selCiz();iste()}return}
  if(d.hareket)return;                       /* sürükleme: kamera kaydırıldı, dokunuş sayılmaz */
  const m=ekran2model(d.sx,d.sy);
  dokun(k,m,e);
}
function dokun(k,m,e){
  const C=core();
  if(S.arac==='sec'){S.sec=null;selCiz();iste();return}
  if(S.arac==='sembol'){
    degisim(k);k.ogeler.push(C.normalizeOge({tur:S.sembolTur,x:clamp(m.x,0,k.w),y:clamp(m.y,0,k.h),aci:0}));
    S.sec={t:'oge',i:k.ogeler.length-1};sonrasi(k);return;
  }
  if(S.arac==='bur'){
    if(k.buradasiniz.length>=20){toast('Bir katta en fazla 20 nokta konulabilir.');return}
    degisim(k);k.buradasiniz.push(C.normalizeBur({x:clamp(m.x,0,k.w),y:clamp(m.y,0,k.h),ad:''}));
    S.sec={t:'bur',i:k.buradasiniz.length-1};S.arac='sec';aracCiz();sonrasi(k);return;
  }
  if(S.arac==='yol'){
    const simdi=performance.now(),cift=S.sonDokunus&&simdi-S.sonDokunus.t<340&&Math.hypot(e.clientX-S.sonDokunus.x,e.clientY-S.sonDokunus.y)<18;
    S.sonDokunus={t:simdi,x:e.clientX,y:e.clientY};
    if(cift&&S.taslak){taslakBitir();return}
    if(!S.taslak)S.taslak={noktalar:[]};
    const son=S.taslak.noktalar[S.taslak.noktalar.length-1];
    S.taslak.noktalar.push(yakala(k,m,son));
    selCiz();ipucuCiz();iste();
  }
}
function taslakBitir(){
  const k=aktif(),t=S.taslak;if(!t)return;
  if(t.noktalar.length>=2){
    degisim(k);
    if(t.yi!=null&&k.yollar[t.yi])k.yollar[t.yi].noktalar=t.noktalar.map(p=>[p[0],p[1]]);
    else k.yollar.push(core().normalizeYol({noktalar:t.noktalar}));
    S.taslak=null;S.sec=null;sonrasi(k);
  }else{S.taslak=null;selCiz();ipucuCiz();iste()}
}
function tekerlek(e){
  if(S.sheet)return;e.preventDefault();
  const r=R('cv').getBoundingClientRect();zoomla(Math.exp(-e.deltaY*.0016),e.clientX-r.left,e.clientY-r.top);S.kameraDokunuldu=true;
}
function tusa(e){
  if(!root||S.sheet&&e.key!=='Escape')return;
  const yaz=/^(input|textarea|select)$/i.test(e.target?.tagName||'');
  if(e.key==='Escape'){e.preventDefault();if(S.sheet)sheetKapat();else if(S.taslak){S.taslak=null;selCiz();ipucuCiz();iste()}else if(S.sec){S.sec=null;selCiz();iste()}else kapatIste();return}
  if(yaz)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?yinele():geriAl();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();yinele();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();kaydet();return}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(S.taslak)taslakGeri();else secileniSil();return}
  if(e.key==='Enter'&&S.taslak){e.preventDefault();taslakBitir()}
}
function taslakGeri(){if(!S.taslak)return;S.taslak.noktalar.pop();if(!S.taslak.noktalar.length&&S.taslak.yi==null)S.taslak=null;selCiz();ipucuCiz();iste()}
function secileniSil(){
  const k=aktif(),s=S.sec;if(!s)return;
  degisim(k);
  if(s.t==='oge')k.ogeler.splice(s.i,1);
  else if(s.t==='bur')k.buradasiniz.splice(s.i,1);
  else if(s.t==='yol')k.yollar.splice(s.yi,1);
  else if(s.t==='nokta'){const y=k.yollar[s.yi];if(y.noktalar.length>2)y.noktalar.splice(s.ni,1);else k.yollar.splice(s.yi,1)}
  S.sec=null;sonrasi(k);
}

/* ───────── alt sayfalar (sheet) ───────── */
const shBas=(b,sag)=>`<div class="kpl-sh-head"><b>${esc(b)}</b>${sag||''}<button type="button" class="kpl-ibtn" data-act="sheetclose" data-close aria-label="Kapat">${ic('close')}</button></div>`;
function sheetAc(html,tam){
  const sh=R('sheet');if(!sh)return;
  sh.innerHTML=html;sh.hidden=false;sh.classList.toggle('kpl-sheet--tam',!!tam);R('scrim').dataset.on='1';S.sheet=true;
  try{sh.focus({preventScroll:true})}catch(_){}
}
function sheetKapat(){
  const sh=R('sheet');if(!sh)return;
  sh.hidden=true;sh.innerHTML='';R('scrim').dataset.on='0';S.sheet=false;S.W=null;S.onayKapat=null;
}
function menuAc(){
  const k=aktif();
  sheetAc(shBas('Kat planı')
    +`<div class="kpl-sh-body kpl-menu">
      <button type="button" class="kpl-row" data-act="altlikac">${ic('resim')}<span><b>${k.altlik?'Kat projesini değiştir':'Kat projesi yükle'}</b><small>PDF, PNG veya JPG; kırpma ve sadeleştirme</small></span></button>
      ${k.altlik?`<button type="button" class="kpl-row" data-act="altlikkaldir">${ic('sil')}<span><b>Kat projesini kaldır</b><small>Semboller ve yollar kalır</small></span></button>`:''}
      <button type="button" class="kpl-row" data-act="kontrol">${ic('liste')}<span><b>Kontrol listesi</b><small>${eksikSayisi(k)?eksikSayisi(k)+' madde eksik':'Tüm maddeler tamam'}</small></span></button>
      <button type="button" class="kpl-row" data-act="cikti">${ic('cikti')}<span><b>Çıktı al</b><small>PDF (A3 / A4), JPEG ve yazdırma</small></span></button>
      <button type="button" class="kpl-row" data-act="ayarlar">${ic('ayar')}<span><b>Başlık ve onay bloğu</b><small>Okul adı, müdür, tarih</small></span></button>
      <button type="button" class="kpl-row" data-act="katadi">${ic('kalem')}<span><b>Katı yeniden adlandır</b><small>${esc(k.ad)}</small></span></button>
      <button type="button" class="kpl-row kpl-row--dng" data-act="katsil">${ic('sil')}<span><b>Katı sil</b><small>${esc(k.ad)} ve içindekiler</small></span></button>
    </div>`);
}
function katEkleAc(){
  const kullanilan=new Set(S.katlar.map(k=>k.ad)),oner=core().KAT_ADLARI.filter(a=>!kullanilan.has(a));
  sheetAc(shBas('Kat ekle')
    +`<div class="kpl-sh-body"><div class="kpl-chips">${oner.map(a=>`<button type="button" class="kpl-chip" data-act="katekleyap" data-ad="${esc(a)}">${esc(a)}</button>`).join('')}</div>
      <label class="kpl-lbl" for="kplKatAd">Başka bir ad</label>
      <div class="kpl-inline"><input class="kpl-inp" id="kplKatAd" data-r="katad" type="text" maxlength="40" placeholder="Örn. Müstakil Spor Salonu"><button type="button" class="kpl-btn kpl-pri" data-act="katekleyap" data-ozel="1">Ekle</button></div></div>`);
}
function katEkle(ad){
  ad=String(ad||'').trim().slice(0,40);
  if(!ad){toast('Kat adı yazın.');return}
  if(S.katlar.some(k=>k.ad.toLocaleLowerCase('tr')===ad.toLocaleLowerCase('tr'))){toast('Bu adda bir kat var.');return}
  const k=core().yeniKat(ad);k._u=[];k._r=[];k.altlik=null;S.katlar.push(k);
  S.katlar.sort((a,b)=>a.sira-b.sira||a.ad.localeCompare(b.ad,'tr'));
  kirletKat(k);sheetKapat();katSec(k.id);
}
function katAdiAc(){
  sheetAc(shBas('Katı yeniden adlandır')
    +`<div class="kpl-sh-body"><input class="kpl-inp" data-r="katad" type="text" maxlength="40" value="${esc(aktif().ad)}" aria-label="Kat adı"><div class="kpl-sh-foot"><button type="button" class="kpl-btn" data-act="sheetclose">Vazgeç</button><button type="button" class="kpl-btn kpl-pri" data-act="katadikaydet">Kaydet</button></div></div>`);
}
function katSilAc(){
  if(S.katlar.length<2){toast('En az bir kat bulunmalı.');return}
  const k=aktif();
  sheetAc(shBas('Katı sil')
    +`<div class="kpl-sh-body"><p><b>${esc(k.ad)}</b> katı; projesi, sembolleri ve yollarıyla birlikte silinecek.</p><div class="kpl-sh-foot"><button type="button" class="kpl-btn" data-act="sheetclose">Vazgeç</button><button type="button" class="kpl-btn kpl-dng" data-act="katsilonay">Sil</button></div></div>`);
}
function katSilOnay(){
  const k=aktif(),i=S.katlar.indexOf(k);
  S.katlar.splice(i,1);S.kirli.delete(k.id);S.silinen.add(k.id);sheetKapat();katSec(S.katlar[Math.max(0,i-1)].id);durumGuncelle();
}
function kontrolAc(){
  const satir=(x)=>`<li class="kpl-chk ${x.ok?'is-ok':'is-eksik'}">${ic(x.ok?'check':'uyari')}<span>${esc(x.ad)}</span></li>`;
  const k=aktif(),l=core().kontrol(k,{altlik:!!k.altlik});
  const diger=S.katlar.filter(x=>x!==k).map(x=>{const e=eksikSayisi(x);return`<li class="kpl-chk ${e?'is-eksik':'is-ok'}">${ic(e?'uyari':'check')}<span>${esc(x.ad)}: ${e?e+' madde eksik':'tamam'}</span></li>`}).join('');
  sheetAc(shBas('Kontrol listesi')
    +`<div class="kpl-sh-body"><p class="kpl-muted">MEM tahliye planı kılavuzundaki öğelere göre uyarılar; çıktıyı engellemez.</p><b>${esc(k.ad)}</b><ul class="kpl-chklist">${l.map(satir).join('')}</ul>${diger?`<b>Diğer katlar</b><ul class="kpl-chklist">${diger}</ul>`:''}</div>`);
}
function ayarlarAc(){
  const a=S.ayar;
  sheetAc(shBas('Başlık ve onay bloğu')
    +`<div class="kpl-sh-body kpl-form">
      <label class="kpl-lbl">Başlık<input class="kpl-inp" data-f="baslik" maxlength="60" value="${esc(a.baslik)}"></label>
      <label class="kpl-lbl">Okul adı<input class="kpl-inp" data-f="okulAdi" maxlength="90" value="${esc(a.okulAdi)}" placeholder="${esc(okulAdi())}"></label>
      <label class="kpl-lbl">Onaylayan (müdür)<input class="kpl-inp" data-f="onayAd" maxlength="60" value="${esc(a.onayAd)}" placeholder="${esc(mudurAdi())}"></label>
      <label class="kpl-lbl">Unvan<input class="kpl-inp" data-f="onayUnvan" maxlength="40" value="${esc(a.onayUnvan)}"></label>
      <label class="kpl-lbl">Tarih<input class="kpl-inp" data-f="onayTarih" maxlength="10" value="${esc(a.onayTarih)}" placeholder="${bugun()}"></label>
      <p class="kpl-muted">Boş bırakılan alanlar okul bilgilerinden, tarih ise bugünden alınır.</p>
      <div class="kpl-sh-foot"><button type="button" class="kpl-btn" data-act="sheetclose">Vazgeç</button><button type="button" class="kpl-btn kpl-pri" data-act="ayarkaydet">Tamam</button></div></div>`);
}
function ayarKaydet(){
  const sh=R('sheet'),v=f=>sh.querySelector(`[data-f="${f}"]`)?.value??'';
  S.ayar=core().normalizeAyar({baslik:v('baslik'),okulAdi:v('okulAdi'),onayAd:v('onayAd'),onayUnvan:v('onayUnvan'),onayTarih:v('onayTarih')});
  S.ayarKirli=true;
  sheetKapat();durumGuncelle();iste();
}
function kapatSorAc(){
  sheetAc(shBas('Kaydedilmemiş değişiklikler')
    +`<div class="kpl-sh-body"><p>Kat planında kaydedilmemiş değişiklikler var.</p><div class="kpl-sh-foot kpl-sh-foot--col"><button type="button" class="kpl-btn kpl-pri" data-act="kaydetkapat">Kaydet ve çık</button><button type="button" class="kpl-btn kpl-dng" data-act="kaydetmedenkapat">Kaydetmeden çık</button><button type="button" class="kpl-btn" data-act="sheetclose">Vazgeç</button></div></div>`);
}
function kapatIste(){
  if(!root)return;
  if(S.sheet){sheetKapat();return}
  if(kirliMi()){kapatSorAc();return}
  kapat();
}

/* ───────── kat projesi (altlık) sihirbazı ───────── */
function altlikAc(){
  sheetAc(shBas('Kat projesi')
    +`<div class="kpl-sh-body" data-r="wbody">
      <p>Kat projesinin PDF'ini ya da görüntüsünü seçin. Koyu zeminli CAD çıktıları otomatik olarak beyaz zemine çevrilir.</p>
      <button type="button" class="kpl-btn kpl-pri" data-act="dosyasec">${ic('resim')}Dosya seç (PDF, PNG, JPG)</button>
      <input type="file" hidden data-r="dosya" accept="application/pdf,image/png,image/jpeg,image/webp,.pdf">
      <p class="kpl-muted">En temiz sonuç için çizim programında yalnız duvar, kapı, pencere ve merdiven katmanlarını açıp öyle çıktı alın.</p></div>`,true);
}
function sihirbazKur(kaynak){
  const W={src:kaynak.canvas,pdf:kaynak.pdf,n:kaynak.sayfaSayisi,sayfa:1,ayar:{...IM().VARSAYILAN},sade:true,kirp:{x0:0,y0:0,x1:1,y1:1},isleniyor:false};
  W.ayar.renk=kaynak.canvas&&S.sonRenk?S.sonRenk:'tum';
  S.W=W;
  const sh=R('sheet');
  sh.innerHTML=shBas('Kat projesi')
   +`<div class="kpl-sh-body kpl-wiz">
      <div class="kpl-crop" data-r="cropwrap"><canvas data-r="cropcv" aria-label="Projeyi kırpma alanı"></canvas></div>
      <p class="kpl-muted" data-r="wbilgi"></p>
      <div class="kpl-ctl">
        ${W.n>1?`<label class="kpl-lbl">PDF sayfası (${W.n})<input class="kpl-inp" data-w="sayfa" type="number" min="1" max="${W.n}" value="1"></label>`:''}
        <label class="kpl-chkrow"><input type="checkbox" data-w="sade" checked><span>Sadeleştir (beyaz zemin, açık gri çizgi)</span></label>
        <div class="kpl-seg" role="group" aria-label="Zemin"><span>Zemin</span>
          <button type="button" data-w="mod" data-v="auto" class="is-on">Otomatik</button><button type="button" data-w="mod" data-v="koyu">Koyu</button><button type="button" data-w="mod" data-v="acik">Açık</button></div>
        <div class="kpl-seg" role="group" aria-label="Renk"><span>Çizgiler</span>
          <button type="button" data-w="renk" data-v="tum">Tüm renkler</button><button type="button" data-w="renk" data-v="duvar">Yalnız duvar (sarı/beyaz)</button></div>
        <label class="kpl-lbl">Gürültü eşiği<input class="kpl-range" type="range" data-w="esik" min="0" max="80" step="1" value="${W.ayar.esik}"></label>
        <label class="kpl-lbl">Silikleştirme<input class="kpl-range" type="range" data-w="silik" min="0" max="90" step="1" value="${W.ayar.silik}"></label>
        <label class="kpl-lbl">Çizgi kalınlığı<input class="kpl-range" type="range" data-w="kalin" min="0" max="3" step="1" value="${W.ayar.kalin}"></label>
        <button type="button" class="kpl-btn" data-act="icerikkirp">İçeriğe göre kırp</button>
      </div></div>
      <div class="kpl-sh-foot"><button type="button" class="kpl-btn" data-act="sheetclose">Vazgeç</button><button type="button" class="kpl-btn kpl-pri" data-act="altlikuygula">Uygula</button></div>`;
  sihirbazDugme();wOnizle();
}
function sihirbazDugme(){
  const W=S.W;if(!W)return;
  R('sheet').querySelectorAll('[data-w="mod"]').forEach(b=>b.classList.toggle('is-on',b.dataset.v===W.ayar.mod));
  R('sheet').querySelectorAll('[data-w="renk"]').forEach(b=>b.classList.toggle('is-on',b.dataset.v===W.ayar.renk));
}
let wZamanlayici=0;
function wOnizle(hemen){
  clearTimeout(wZamanlayici);
  const is=()=>{
    const W=S.W;if(!W||!root)return;
    if(!W.kucuk||W.kucukKaynak!==W.src){W.kucuk=IM().kucult(W.src,1100);W.kucukKaynak=W.src}
    W.prev=W.sade?IM().sadelestir(W.kucuk,W.ayar).canvas:W.kucuk;
    const b=R('wbilgi');if(b)b.textContent=`${W.src.width} × ${W.src.height} piksel`+(W.sade?' · sadeleştirilmiş önizleme':'');
    wKirpCiz();
  };
  if(hemen)is();else wZamanlayici=setTimeout(is,70);
}
function wKirpCiz(){
  const W=S.W,cv=R('cropcv'),wrap=R('cropwrap');if(!W||!cv||!wrap||!W.prev)return;
  const dpr=Math.min(2.5,global.devicePixelRatio||1),cw=wrap.clientWidth||320,oran=W.prev.height/W.prev.width,ch=Math.min(Math.round(cw*oran),Math.round((global.innerHeight||700)*.36));
  const sw=Math.min(cw,ch/oran),sh=sw*oran;
  cv.style.width=sw+'px';cv.style.height=sh+'px';cv.width=Math.round(sw*dpr);cv.height=Math.round(sh*dpr);
  W.gs={w:sw,h:sh};
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#fff';c.fillRect(0,0,sw,sh);c.imageSmoothingQuality='high';c.drawImage(W.prev,0,0,sw,sh);
  const k=W.kirp,x0=k.x0*sw,y0=k.y0*sh,x1=k.x1*sw,y1=k.y1*sh;
  c.fillStyle='rgba(15,23,42,.55)';c.fillRect(0,0,sw,y0);c.fillRect(0,y1,sw,sh-y1);c.fillRect(0,y0,x0,y1-y0);c.fillRect(x1,y0,sw-x1,y1-y0);
  c.lineWidth=2;c.strokeStyle=S.accent;c.strokeRect(x0,y0,x1-x0,y1-y0);
  c.fillStyle='#fff';[[x0,y0],[x1,y0],[x0,y1],[x1,y1],[(x0+x1)/2,y0],[(x0+x1)/2,y1],[x0,(y0+y1)/2],[x1,(y0+y1)/2]].forEach(p=>{c.fillRect(p[0]-6,p[1]-6,12,12);c.strokeRect(p[0]-6,p[1]-6,12,12)});
}
function wTut(e){
  const W=S.W;if(!W||!W.gs)return null;
  const cv=R('cropcv'),r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,{w,h}=W.gs,k=W.kirp;
  const x0=k.x0*w,y0=k.y0*h,x1=k.x1*w,y1=k.y1*h,T=18,yakin=(a,b)=>Math.abs(a-b)<=T;
  const sol=yakin(x,x0),sag=yakin(x,x1),ust=yakin(y,y0),alt=yakin(y,y1),icX=x>x0-T&&x<x1+T,icY=y>y0-T&&y<y1+T;
  let m='';
  if(sol&&ust)m='nw';else if(sag&&ust)m='ne';else if(sol&&alt)m='sw';else if(sag&&alt)m='se';
  else if(ust&&icX)m='n';else if(alt&&icX)m='s';else if(sol&&icY)m='w';else if(sag&&icY)m='e';
  else if(x>x0&&x<x1&&y>y0&&y<y1)m='move';
  return{m,x,y};
}
function wBas(e){
  const W=S.W;if(!W)return;const t=wTut(e);if(!t||!t.m)return;
  try{R('cropcv').setPointerCapture(e.pointerId)}catch(_){}
  W.tut={m:t.m,x:t.x,y:t.y,k0:{...W.kirp}};e.preventDefault();
}
function wHareket(e){
  const W=S.W;if(!W||!W.tut||!W.gs)return;
  const cv=R('cropcv'),r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,{w,h}=W.gs,t=W.tut,k0=t.k0,k=W.kirp,dx=(x-t.x)/w,dy=(y-t.y)/h,MIN=.04;
  const m=t.m;
  if(m==='move'){const gw=k0.x1-k0.x0,gh=k0.y1-k0.y0;k.x0=clamp(k0.x0+dx,0,1-gw);k.y0=clamp(k0.y0+dy,0,1-gh);k.x1=k.x0+gw;k.y1=k.y0+gh}
  else{
    if(m.includes('w'))k.x0=clamp(k0.x0+dx,0,k0.x1-MIN);
    if(m.includes('e'))k.x1=clamp(k0.x1+dx,k0.x0+MIN,1);
    if(m.includes('n'))k.y0=clamp(k0.y0+dy,0,k0.y1-MIN);
    if(m.includes('s'))k.y1=clamp(k0.y1+dy,k0.y0+MIN,1);
  }
  wKirpCiz();
}
function wBirak(){const W=S.W;if(W)W.tut=null}
async function dosyaSecildi(file){
  if(!file)return;
  const b=R('wbody');if(b)b.innerHTML='<p class="kpl-busy">Proje okunuyor…</p>';
  try{const k=await IM().dosyaAc(file);if(!S.sheet)return;sihirbazKur(k)}
  catch(e){console.error('[KatPlani/dosya]',e);toast(e?.message||'Dosya açılamadı.');if(S.sheet)altlikAc()}
}
async function wSayfa(no){
  const W=S.W;if(!W||!W.pdf)return;
  try{W.src=await IM().pdfSayfa(W.pdf,no);W.sayfa=no;W.kirp={x0:0,y0:0,x1:1,y1:1};wOnizle(true)}catch(e){toast('PDF sayfası okunamadı.')}
}
function wIcerikKirp(){
  const W=S.W;if(!W||!W.prev)return;
  const p=IM().sadelestir(W.kucuk,{...W.ayar,mod:W.ayar.mod}).canvas,x=p.getContext('2d').getImageData(0,0,p.width,p.height),kb=IM().icerikKutusu(x.data,p.width,p.height);
  if(!kb){toast('Çizim bulunamadı.');return}
  W.kirp={x0:kb.x/p.width,y0:kb.y/p.height,x1:(kb.x+kb.w)/p.width,y1:(kb.y+kb.h)/p.height};wKirpCiz();
}
async function altlikUygula(){
  const W=S.W;if(!W||W.isleniyor)return;
  W.isleniyor=true;
  const b=R('sheet').querySelector('[data-act="altlikuygula"]');if(b){b.disabled=true;b.textContent='Hazırlanıyor…'}
  try{
    const sx=W.src.width,sy=W.src.height,r=W.kirp;
    let c=IM().kirp(W.src,{x:r.x0*sx,y:r.y0*sy,w:(r.x1-r.x0)*sx,h:(r.y1-r.y0)*sy});
    if(W.sade)c=IM().sadelestir(c,W.ayar).canvas;
    S.sonRenk=W.ayar.renk;
    const sk=await IM().sikistir(c),resim=await Z().resimYukle(sk.veri),k=aktif();
    if(sk.veri.length>950000)toast('Proje görüntüsü büyük; kaydedilemezse "Sadeleştir"i açın ya da daha küçük kırpın.',{sure:6000});
    const ox=k.w,oy=k.h,fx=sk.w/ox,fy=sk.h/oy;
    if(k.ogeler.length||k.yollar.length||k.buradasiniz.length){
      k.ogeler.forEach(o=>{o.x=Math.round(o.x*fx*10)/10;o.y=Math.round(o.y*fy*10)/10});
      k.buradasiniz.forEach(o=>{o.x=Math.round(o.x*fx*10)/10;o.y=Math.round(o.y*fy*10)/10});
      k.yollar.forEach(y=>y.noktalar.forEach(p=>{p[0]=Math.round(p[0]*fx*10)/10;p[1]=Math.round(p[1]*fy*10)/10}));
    }
    k.w=sk.w;k.h=sk.h;k.altlik={veri:sk.veri,w:sk.w,h:sk.h,resim};k.altlikKirli=true;k._u=[];k._r=[];S.sec=null;
    kirletKat(k);sheetKapat();ipucuCiz();selCiz();sigdir();S.kameraDokunuldu=false;
    toast('Kat projesi hazırlandı ('+Math.round(sk.bayt/1024)+' KB).');
  }catch(e){console.error('[KatPlani/altlik]',e);toast('Proje hazırlanamadı: '+(e?.message||e));W.isleniyor=false;if(b){b.disabled=false;b.textContent='Uygula'}}
}
function altlikKaldir(){
  const k=aktif();if(!k.altlik)return;
  k.altlik=null;k.altlikKirli=true;k.w=core().BOS.w;k.h=core().BOS.h;k._u=[];k._r=[];kirletKat(k);sheetKapat();ipucuCiz();sigdir();
}

/* ───────── çıktı ───────── */
function ciktiAc(){
  const k=aktif(),n1=core().sayfalar(k).length,nt=S.katlar.reduce((t,x)=>t+core().sayfalar(x).length,0);
  sheetAc(shBas('Çıktı al')
    +`<div class="kpl-sh-body">
      <div class="kpl-seg kpl-seg--blok" role="group" aria-label="Kapsam"><span>Kapsam</span>
        <button type="button" data-act="kapsam" data-v="kat" class="${S.kapsam==='tum'?'':'is-on'}">Bu kat (${n1} sayfa)</button>
        <button type="button" data-act="kapsam" data-v="tum" class="${S.kapsam==='tum'?'is-on':''}">Tüm katlar (${nt} sayfa)</button></div>
      <p class="kpl-muted">Her "şu an buradasınız" noktası için ayrı sayfa hazırlanır; nokta yoksa kat tek sayfa olur.</p>
      <div class="kpl-menu">
        <button type="button" class="kpl-row" data-act="pdfa3">${ic('cikti')}<span><b>PDF (A3 yatay)</b><small>Asmak için; her sayfada 10 mm kenar boşluğu</small></span></button>
        <button type="button" class="kpl-row" data-act="pdfa4">${ic('cikti')}<span><b>PDF (A4 yatay)</b><small>Dosya olarak paylaşmak için</small></span></button>
        <button type="button" class="kpl-row" data-act="jpeg">${ic('resim')}<span><b>JPEG (en çok 150 KB)</b><small>MEBBİS'e yüklemek için; sayfa başına bir dosya</small></span></button>
        <button type="button" class="kpl-row" data-act="yazdir">${ic('liste')}<span><b>Yazdır (A4 yatay)</b><small>Önizleme açılır</small></span></button>
      </div><p class="kpl-busy" data-r="cbilgi" hidden></p></div>`);
}
function sayfaListesi(){
  const kl=S.kapsam==='tum'?S.katlar:[aktif()],L=[];
  for(const k of kl)for(const i of core().sayfalar(k))L.push({k,i});
  return L;
}
const sayfaAdi=(x,L)=>{const ayni=L.filter(y=>y.k===x.k).length>1,b=x.i>=0?x.k.buradasiniz[x.i]:null;return dosyaAdi(x.k.ad)+(ayni?'_'+(b?.ad?dosyaAdi(b.ad):(x.i+1)):'')};
function cBilgi(t){const e=R('cbilgi');if(e){e.hidden=!t;e.textContent=t||''}}
async function dosyaKaydet(blob,ad,mime){
  if(typeof global.uygulamaDosyaKaydet==='function'){
    const b64=await new Promise((ok,no)=>{const fr=new FileReader();fr.onloadend=()=>ok(String(fr.result).split(',')[1]);fr.onerror=no;fr.readAsDataURL(blob)});
    return global.uygulamaDosyaKaydet(b64,ad,mime,false);
  }
  const u=URL.createObjectURL(blob),a=D.createElement('a');a.href=u;a.download=ad;a.rel='noopener';D.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
}
async function resimleriHazirla(L){for(const x of L){if(x.k.altlik&&!x.k.altlik.resim)x.k.altlik.resim=await Z().resimYukle(x.k.altlik.veri)}}
async function cikti(tur){
  const L=sayfaListesi();if(!L.length)return;
  const ayar=ayarEtkin();let rapor=0;
  try{
    await resimleriHazirla(L);
    const uret=(boyut,ppm)=>async i=>Z().sayfaCiz(L[i].k,L[i].k.altlik?.resim||null,ayar,L[i].i,{boyut,ppm});
    if(tur==='pdfa3'||tur==='pdfa4'){
      const boyut=tur==='pdfa3'?'A3':'A4',blob=await Z().pdfYap(L.length,uret(boyut,boyut==='A3'?6.5:8),boyut,(i,n)=>cBilgi(`Sayfa ${i}/${n} hazırlanıyor…`));
      const ad='Tahliye_Plani_'+(S.kapsam==='tum'?'Tum_Katlar':dosyaAdi(L[0].k.ad))+'_'+boyut+'.pdf';
      await dosyaKaydet(blob,ad,'application/pdf');toast('PDF hazırlandı.');
    }else if(tur==='jpeg'){
      const u=uret('A3',5.2);
      for(let i=0;i<L.length;i++){
        cBilgi(`JPEG ${i+1}/${L.length} hazırlanıyor…`);
        const cv=await u(i),j=await Z().jpegSigdir(cv,150*1024);
        await dosyaKaydet(j.blob,'Tahliye_Plani_'+sayfaAdi(L[i],L)+'.jpg','image/jpeg');
        if(j.bayt>150*1024)toast(`${L[i].k.ad}: görüntü 150 KB'a indirilemedi (${Math.round(j.bayt/1024)} KB).`,{sure:6000});
      }
      toast(L.length>1?L.length+' JPEG hazırlandı.':'JPEG hazırlandı.');
    }else if(tur==='yazdir'){
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=9');
      if(!global.ReportEngine?.printReport)throw new Error('Yazdırma altyapısı yüklenemedi.');
      cBilgi('Sayfalar hazırlanıyor…');
      const govde=await Z().yazdirGovde(L.length,uret('A4',6.5));
      await global.ReportEngine.printReport('Acil Durum Tahliye Planı',govde,{baslikGoster:false,logoGoster:false,tarihGoster:false,akis:true,kenarBosluk:10,yon:'yatay',fileName:'Tahliye_Plani'});
    }
    rapor=1;
  }catch(e){console.error('[KatPlani/cikti]',e);toast('Çıktı hazırlanamadı: '+(e?.message||e))}
  finally{cBilgi('');void rapor}
}

/* ───────── olaylar ───────── */
function tikla(e){
  const b=e.target.closest('[data-act]');if(!b||!root.contains(b))return;
  const a=b.dataset.act;
  switch(a){
    case'kapat':kapatIste();break;
    case'sheetclose':sheetKapat();break;
    case'undo':geriAl();break;
    case'redo':yinele();break;
    case'save':kaydet();break;
    case'menu':menuAc();break;
    case'kat':katSec(b.dataset.id);break;
    case'katekle':katEkleAc();break;
    case'katekleyap':katEkle(b.dataset.ozel?R('katad')?.value:b.dataset.ad);break;
    case'katadi':katAdiAc();break;
    case'katadikaydet':{const ad=String(R('katad')?.value||'').trim().slice(0,40);if(!ad){toast('Kat adı yazın.');break}const k=aktif();k.ad=ad;k.sira=core().katSira(ad);S.katlar.sort((x,y)=>x.sira-y.sira||x.ad.localeCompare(y.ad,'tr'));kirletKat(k);sheetKapat();tabsCiz();durumGuncelle();break}
    case'katsil':katSilAc();break;
    case'katsilonay':katSilOnay();break;
    case'arac':S.arac=b.dataset.a;S.taslak=null;S.sec=null;S.hover=null;aracCiz();selCiz();ipucuCiz();iste();break;
    case'sembol':S.sembolTur=b.dataset.tur;palCiz();ipucuCiz();break;
    case'grup':{S.grup=b.dataset.g;if(core().sembol(S.sembolTur)?.grup!==S.grup)S.sembolTur=core().SEMBOLLER.find(x=>x.grup===S.grup)?.id||S.sembolTur;palCiz();ipucuCiz();break}
    case'genelboy':{const k=aktif(),yeni=clamp(Math.round((k.sembolBoyut+(Number(b.dataset.d)||0)*.1)*10)/10,.5,2.5);if(yeni===k.sembolBoyut)break;degisim(k);k.sembolBoyut=yeni;sonrasi(k);palCiz();break}
    case'zoomin':zoomla(1.3);S.kameraDokunuldu=true;break;
    case'zoomout':zoomla(1/1.3);S.kameraDokunuldu=true;break;
    case'zoomfit':S.kameraDokunuldu=false;sigdir();break;
    case'sil':case'noktasil':case'yolsil':{
      const k=aktif(),s=S.sec;if(!s)break;
      if(a==='yolsil'&&s.yi!=null){degisim(k);k.yollar.splice(s.yi,1);S.sec=null;sonrasi(k)}else secileniSil();break;
    }
    case'dondur':{const k=aktif(),s=S.sec;if(s?.t==='oge'){degisim(k);const o=k.ogeler[s.i];o.aci=(o.aci+90)%360;sonrasi(k)}break}
    case'uzat':{const k=aktif(),s=S.sec;if(!s||s.yi==null)break;S.taslak={yi:s.yi,noktalar:k.yollar[s.yi].noktalar.map(p=>[p[0],p[1]])};S.arac='yol';S.sec=null;aracCiz();selCiz();ipucuCiz();iste();break}
    case'bitti':taslakBitir();break;
    case'sonnoktasil':taslakGeri();break;
    case'taslakiptal':S.taslak=null;selCiz();ipucuCiz();iste();break;
    case'altlikac':altlikAc();break;
    case'altlikkaldir':altlikKaldir();break;
    case'dosyasec':R('dosya')?.click();break;
    case'icerikkirp':wIcerikKirp();break;
    case'altlikuygula':altlikUygula();break;
    case'kontrol':kontrolAc();break;
    case'ayarlar':ayarlarAc();break;
    case'ayarkaydet':ayarKaydet();break;
    case'cikti':ciktiAc();break;
    case'kapsam':S.kapsam=b.dataset.v==='tum'?'tum':'kat';ciktiAc();break;
    case'pdfa3':case'pdfa4':case'jpeg':case'yazdir':{b.disabled=true;cikti(a).finally(()=>{b.disabled=false});break}
    case'kaydetkapat':kaydet().then(ok=>{if(ok)kapat()});break;
    case'kaydetmedenkapat':kapat();break;
  }
}
function degis(e){
  const t=e.target;
  if(t.matches('[data-r="dosya"]')){dosyaSecildi(t.files?.[0]);t.value='';return}
  if(t.matches('[data-r="ogenot"],[data-r="ogeboy"]')){S.duzenAlindi=false;return}
  const w=t.dataset?.w;
  if(w&&S.W){
    const W=S.W;
    if(w==='sade'){W.sade=t.checked;wOnizle(true)}
    else if(w==='sayfa'){wSayfa(clamp(parseInt(t.value,10)||1,1,W.n))}
  }
}
function girdi(e){
  const t=e.target;
  if(t.matches('[data-r="burad"]')){const k=aktif(),s=S.sec;if(s?.t==='bur'&&k.buradasiniz[s.i]){k.buradasiniz[s.i].ad=t.value.slice(0,40);kirletKat(k)}return}
  if(t.matches('[data-r="ogenot"],[data-r="ogeboy"]')){             /* seçili öğenin etiketi / kendi boyutu: bir düzenleme oturumu tek geri alma adımıdır */
    const k=aktif(),s=S.sec,o=s&&(s.t==='oge'?k.ogeler[s.i]:s.t==='bur'?k.buradasiniz[s.i]:null);if(!o)return;
    if(!S.duzenAlindi){degisim(k);S.duzenAlindi=true}
    if(t.dataset.r==='ogenot')o.not=t.value.slice(0,60);else o.boy=clamp(Math.round((Number(t.value)||1)*100)/100,.4,4);
    kirletKat(k);iste();return;
  }
  const w=t.dataset?.w;
  if(w&&S.W&&t.type==='range'){S.W.ayar[w]=Number(t.value);wOnizle()}
}
function wTik(e){
  const b=e.target.closest('[data-w]');if(!b||!S.W||b.tagName!=='BUTTON')return;
  const w=b.dataset.w;if(w==='mod'||w==='renk'){S.W.ayar[w]=b.dataset.v;sihirbazDugme();wOnizle(true)}
}

/* ───────── yaşam döngüsü ───────── */
const KABUK=`<div class="kpl-app">
  <header class="kpl-top">
    <button type="button" class="kpl-ibtn" data-act="kapat" data-close aria-label="Kapat">${ic('close')}</button>
    <div class="kpl-ttl"><h1>Kat planı</h1><small data-r="sub"></small></div>
    <button type="button" class="kpl-ibtn" data-act="undo" data-r="undo" aria-label="Geri al" disabled>${ic('undo')}</button>
    <button type="button" class="kpl-ibtn" data-act="redo" data-r="redo" aria-label="Yinele" disabled>${ic('redo')}</button>
    <button type="button" class="kpl-btn kpl-pri kpl-savebtn" data-act="save" data-r="save">Kaydedildi</button>
    <button type="button" class="kpl-ibtn" data-act="menu" aria-label="Diğer işlemler">${ic('more')}</button>
  </header>
  <nav class="kpl-tabs" data-r="tabs" aria-label="Katlar"></nav>
  <p class="kpl-hint" data-r="hint" aria-live="polite"></p>
  <main class="kpl-stage" data-r="stage">
    <canvas class="kpl-cv" data-r="cv" aria-label="Kat planı çizim alanı"></canvas>
    <div class="kpl-zoom"><button type="button" data-act="zoomout" aria-label="Küçült">${ic('minus')}</button><button type="button" data-act="zoomin" aria-label="Büyüt">${ic('plus')}</button><button type="button" data-act="zoomfit" aria-label="Tamamını sığdır">${ic('fit')}</button></div>
    <div class="kpl-float"><div class="kpl-sel" data-r="sel" hidden></div><div class="kpl-pal" data-r="pal" hidden></div></div>
    <div class="kpl-empty" data-r="empty" hidden><b>Bu kat için proje yüklenmedi</b><p>Kat projesini yükleyin; semboller ve kaçış yolu onun üzerine çizilir.</p><button type="button" class="kpl-btn kpl-pri" data-act="altlikac">${ic('resim')}Kat projesi yükle</button></div>
  </main>
  <nav class="kpl-tools" aria-label="Araçlar">
    <button type="button" data-act="arac" data-a="sec" aria-pressed="true">${ic('sec')}<span>Seç</span></button>
    <button type="button" data-act="arac" data-a="sembol" aria-pressed="false">${ic('sembol')}<span>Sembol</span></button>
    <button type="button" data-act="arac" data-a="yol" aria-pressed="false">${ic('yol')}<span>Kaçış yolu</span></button>
    <button type="button" data-act="arac" data-a="bur" aria-pressed="false">${ic('bur')}<span>Buradasınız</span></button>
  </nav>
  <datalist id="kplOda" data-r="odalar"></datalist>
  <div class="kpl-scrim" data-r="scrim" data-on="0" data-act="sheetclose"></div>
  <section class="kpl-sheet" data-r="sheet" role="dialog" aria-modal="true" aria-label="Kat planı işlemleri" tabindex="-1" hidden></section>
</div>`;
async function ac_(opts){
  opts=opts||{};
  if(root)kapat(true);
  await bagimlilik();
  await veriHazirla();
  const {katlar,ayar}=await katlariKur();
  let accent='#2563eb';try{accent=getComputedStyle(D.documentElement).getPropertyValue('--t-accent').trim()||accent}catch(_){}
  S={katlar,ayar,aktifId:katlar.find(k=>k.ad==='Zemin Kat')?.id||katlar[0].id,arac:'sec',grup:'yangin',sembolTur:'sondurucu',duzenAlindi:false,sec:null,taslak:null,hover:null,fare:false,
    g:{x:0,y:0,z:1},fitZ:1,dpr:1,ptr:new Map(),drag:null,pinch:null,kirli:new Set(),silinen:new Set(),ayarKirli:false,kaydediyor:false,sheet:false,W:null,
    kapsam:'kat',accent,onClose:opts.onClose||null,kameraDokunuldu:false};
  root=D.createElement('div');root.className='kpl-root';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Kat planı');root.setAttribute('data-kat-plani','');
  root.innerHTML=KABUK;R('odalar').innerHTML=core().ODA_ADLARI.map(a=>`<option value="${esc(a)}"></option>`).join('');(opts.host||D.body).appendChild(root);
  try{D.body.classList.add('modal-open')}catch(_){}
  try{const r=global.KorukPlatformAdapter?.setPullToRefreshEnabled?.(false);if(r?.catch)r.catch(()=>{})}catch(_){}
  ac=new AbortController();const sg={signal:ac.signal};
  root.addEventListener('click',tikla,sg);root.addEventListener('click',wTik,sg);root.addEventListener('change',degis,sg);root.addEventListener('input',girdi,sg);
  const cv=R('cv');
  cv.addEventListener('pointerdown',dokunBas,sg);cv.addEventListener('pointermove',dokunHareket,sg);cv.addEventListener('pointerup',dokunBitir,sg);cv.addEventListener('pointercancel',dokunBitir,sg);
  cv.addEventListener('pointerleave',()=>{if(S.hover){S.hover=null;iste()}},sg);
  cv.addEventListener('wheel',tekerlek,{signal:ac.signal,passive:false});
  cv.addEventListener('contextmenu',e=>e.preventDefault(),sg);
  root.addEventListener('pointerdown',e=>{if(e.target.closest('[data-r="cropcv"]'))wBas(e)},sg);
  root.addEventListener('pointermove',e=>{if(S.W?.tut)wHareket(e)},sg);
  root.addEventListener('pointerup',wBirak,sg);root.addEventListener('pointercancel',wBirak,sg);
  D.addEventListener('keydown',tusa,sg);
  global.addEventListener('beforeunload',e=>{if(root&&kirliMi()){e.preventDefault();e.returnValue=''}},sg);
  if(typeof ResizeObserver==='function'){ro=new ResizeObserver(()=>{if(!root)return;boyutla();if(S.W)wKirpCiz()});ro.observe(R('stage'))}
  tabsCiz();aracCiz();selCiz();ipucuCiz();durumGuncelle();
  requestAnimationFrame(()=>{boyutla();sigdir()});
  /* başka cihazdaki kayıtlar: arka planda çekilir; kullanıcı henüz değişiklik yapmadıysa yenilenir */
  try{
    if(global.SyncEngine?.sync&&navigator.onLine!==false)global.SyncEngine.sync([TIP]).then(async()=>{
      if(!root||!S||kirliMi()||S.drag||S.sheet)return;
      const yeni=await katlariKur(),onceki=S.aktifId;
      if(!root||kirliMi())return;
      S.katlar=yeni.katlar;S.ayar=yeni.ayar;S.aktifId=S.katlar.some(k=>k.id===onceki)?onceki:S.katlar[0].id;
      tabsCiz();selCiz();ipucuCiz();durumGuncelle();sigdir();
    }).catch(()=>{});
  }catch(_){}
  return true;
}
function kapat(sessiz){
  if(!root)return;
  try{ac?.abort()}catch(_){}ac=null;try{ro?.disconnect()}catch(_){}ro=null;if(raf){cancelAnimationFrame(raf);raf=0}
  const cb=S?.onClose;
  root.remove();root=null;S=null;
  try{D.body.classList.remove('modal-open')}catch(_){}
  try{const r=global.KorukPlatformAdapter?.setPullToRefreshEnabled?.(true);if(r?.catch)r.catch(()=>{})}catch(_){}
  if(!sessiz&&typeof cb==='function'){try{cb()}catch(_){}}
}
global.KatPlani={open:ac_,close:kapat,isOpen:()=>!!root,
  _t:{durum:()=>S,aktif:()=>S&&aktif(),kirliMi,sayfaListesi}};
})(window);
