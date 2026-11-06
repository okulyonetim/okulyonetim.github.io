/* Koruk Asistan — Ortak Sınavlar Modülü
 * Üç bölüm: Görevlendirme Tebliği · Gözetmen Görevleri · Sınav Evrakı Teslim Tutanağı
 * Öğretmenler ve dersler uygulamanın Firestore verisinden gelir.
 * Mantık: ortak-sinav-core.js  Çıktı: ReportEngine.printReport()
 */
(function(global){
'use strict';
if(global.OrtakSinavModule)return;
const C=global.OrtakSinavCore,B=global.SinifBaglam,RE=global.ReportEngine;
if(!C||!B)throw new Error('Ortak Sınavlar modülü için gerekli bileşenler yüklenmedi.');

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {rows,isManager,adSoyad,adBicimi,teacherId,okulAdi,egitimYili}=B;
const EK=['ogretmenler','dersListesi','okulBilgileri'];

let kok=null, sekme='teblig';
let ST=null; // Görevlendirme tebliği state
let GT=null; // Gözetmen görevleri state
let TT=null; // Tutanak state

/* ── veri yardımcıları ── */
const ogretmenler=()=>rows('ogretmenler').filter(t=>t?.id&&t?.aktif!==false).sort((a,b)=>adSoyad(a).localeCompare(adSoyad(b),'tr'));
const dersler=()=>[...new Set(rows('dersListesi').map(d=>String(d?.ad||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
const okulLogosu=()=>{const ob=rows('okulBilgileri');return(Array.isArray(ob)?ob:[]).find(x=>x?.logoUrl)?.logoUrl||null};
const kendiId=()=>{const id=teacherId();return id?String(id):'';};
const ogretmenBul=id=>id?rows('ogretmenler').find(t=>String(t.id)===String(id))||null:null;

/* ── blank state ── */
function blankST(){
 const id=kendiId(), t=ogretmenBul(id);
 return{
  ogretmenId:id,
  ogretmen:t?adBicimi(adSoyad(t)):'',
  gorev:'Öğretmen',
  sinif:'', ders:'', kapsam:'Ülke Geneli',
  sinavTarihi:C.isoBugün(), sinavSaati:'09.00',
  salon:'',
  tarih:C.isoBugün(), sayi:'',
  gorevlendiren:'', gorevlendirenUnvan:'Müdür Yardımcısı'
 };
}
function blankGT(){
 return{
  gorevler:[...C.GOZETMEN_GOREVLERI],
  kurallar:[...C.SINAV_KURALLARI]
 };
}
function blankTT(){
 const id=kendiId(), t=ogretmenBul(id);
 const gozetmenAd=t?adSoyad(t):'';
 const parcalar=gozetmenAd.split(' ');
 const soyad=parcalar.length>1?parcalar.pop():'';
 const ad=parcalar.join(' ');
 return{
  sinavAdi:'', sinavYeri:'', tarih:C.isoBugün(), saat:'',
  onceki:{soruKitabi:'', teslimEden:'', teslimAlan:'', diger:'', tarih:C.isoBugün(), saat:''},
  sirasinda:{olumsuzluk:false, olumsuzlukAciklama:'', katilimci:'', kitapciDurum:''},
  sonrasi:{soruKitabi:'', teslimEden:'', teslimAlan:'', tarih:C.isoBugün(), saat:''},
  gozetmen:{ad, soyad}
 };
}

/* ── field builder ── */
const field=(label,html)=>`<label class="ka-field"><span class="ka-field__label">${esc(label)}</span>${html}</label>`;
const inp=(ns,key,type='text',ph='',extra='')=>`<input class="ka-input" type="${type}" value="${esc((ns||{})[key]||'')}" placeholder="${esc(ph)}" data-os="${ns===ST?'st':ns===GT?'gt':'tt'}" data-key="${key}" autocomplete="off"${extra}>`;
const inpNested=(ns,ns2,key,type='text',ph='',extra='')=>`<input class="ka-input" type="${type}" value="${esc(((ns||{})[ns2]||{})[key]||'')}" placeholder="${esc(ph)}" data-os="tt" data-ns="${ns2}" data-key="${key}" autocomplete="off"${extra}>`;

function ogretmenSelect(val,dsAttr){
 const list=ogretmenler();
 return`<select class="ka-select" ${dsAttr}><option value="">— Elle gireceğim —</option>${list.map(t=>`<option value="${esc(t.id)}"${String(t.id)===String(val||'')?' selected':''}>${esc(adBicimi(adSoyad(t)))}</option>`).join('')}</select>`;
}
function dersDatalist(id){
 return`<datalist id="${id}">${dersler().map(d=>`<option value="${esc(d)}"></option>`).join('')}</datalist>`;
}
function kapsamSelect(val){
 return`<select class="ka-select" data-os="st" data-key="kapsam">${C.KAPSAM_SECENEKLERI.map(k=>`<option value="${k}"${k===val?' selected':''}>${esc(k)}</option>`).join('')}</select>`;
}

/* ══════════════ BÖLÜM 1: Görevlendirme Tebliği ══════════════ */
function renderST(){
 const s=ST||(ST=blankST());
 const yonetici=isManager();
 return`<section class="os-bolum">
 <div class="ka-card"><div class="ka-card__body ka-stack">
  <strong>Öğretmen</strong>
  <div class="ka-grid">
   ${yonetici?field('Öğretmen seç',ogretmenSelect(s.ogretmenId,'data-os="st" data-key="ogretmenId"')):''}
   ${field('Ad Soyad',inp(s,'ogretmen','text','Ad SOYAD'))}
   ${field('Görevi',inp(s,'gorev','text','Öğretmen'))}
  </div>
 </div></div>
 <div class="ka-card"><div class="ka-card__body ka-stack">
  <strong>Sınav bilgileri</strong>
  <div class="ka-grid">
   ${field('Sınıf',`<input class="ka-input" type="text" value="${esc(s.sinif)}" placeholder="7. Sınıf" data-os="st" data-key="sinif" autocomplete="off" list="osDersler">`)}
   ${field('Ders',`<input class="ka-input" type="text" value="${esc(s.ders)}" placeholder="Matematik" data-os="st" data-key="ders" autocomplete="off" list="osDersler">`)}
   ${field('Kapsam',kapsamSelect(s.kapsam))}
   ${field('Sınav tarihi',inp(s,'sinavTarihi','date'))}
   ${field('Sınav saati',inp(s,'sinavSaati','text','09.00'))}
   ${field('Salon',inp(s,'salon','text',''))}
  </div>
  ${dersDatalist('osDersler')}
 </div></div>
 <div class="ka-card"><div class="ka-card__body ka-stack">
  <strong>Belge bilgileri</strong>
  <div class="ka-grid">
   ${field('Belge tarihi',inp(s,'tarih','date'))}
   ${field('Sayı',inp(s,'sayi','text','2026/...'))}
   ${field('Görevlendiren',inp(s,'gorevlendiren','text','Ad SOYAD'))}
   ${field('Unvan',inp(s,'gorevlendirenUnvan','text','Müdür Yardımcısı'))}
  </div>
 </div></div>
 <div class="os-yazdir-alan"><button type="button" class="ka-btn ka-btn--primary" data-os-yazdir="teblig">📄 Yazdır / PDF</button></div>
</section>`;
}

/* ══════════════ BÖLÜM 2: Gözetmen Görevleri ══════════════ */
function renderGT(){
 const g=GT||(GT=blankGT());
 const gorevListesi=g.gorevler.map((gv,i)=>`
  <div class="os-gorev-satir">
   <span class="os-gorev-harf">${String.fromCharCode(97+i)})</span>
   <textarea class="ka-input os-gorev-ta" data-os="gt" data-liste="gorevler" data-idx="${i}" rows="2">${esc(gv)}</textarea>
   <button type="button" class="ka-btn ka-btn--ghost os-sil-btn" data-os-sil-gorev="${i}" title="Sil">×</button>
  </div>`).join('');
 const kuralListesi=g.kurallar.map((kr,i)=>`
  <div class="os-gorev-satir">
   <span class="os-gorev-harf">${i+1}.</span>
   <textarea class="ka-input os-gorev-ta" data-os="gt" data-liste="kurallar" data-idx="${i}" rows="2">${esc(kr)}</textarea>
   <button type="button" class="ka-btn ka-btn--ghost os-sil-btn" data-os-sil-kural="${i}" title="Sil">×</button>
  </div>`).join('');
 return`<section class="os-bolum">
 <div class="ka-card"><div class="ka-card__body ka-stack">
  <div class="os-gorev-baslik-satir"><strong>Gözetmen Öğretmenlerin Görevleri</strong>
   <button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-os-ekle="gorevler">＋ Görev ekle</button>
  </div>
  <div class="os-gorev-alan" id="osGorevler">${gorevListesi}</div>
 </div></div>
 <div class="ka-card"><div class="ka-card__body ka-stack">
  <div class="os-gorev-baslik-satir"><strong>Sınavlarda Uyulması Gereken Kurallar</strong>
   <button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-os-ekle="kurallar">＋ Kural ekle</button>
  </div>
  <div class="os-gorev-alan" id="osKurallar">${kuralListesi}</div>
 </div></div>
 <div class="os-yazdir-alan">
  <button type="button" class="ka-btn ka-btn--ghost" data-os-sifirla-gt>↺ Varsayılana sıfırla</button>
  <button type="button" class="ka-btn ka-btn--primary" data-os-yazdir="gozetmen">📄 Yazdır / PDF</button>
 </div>
</section>`;
}

/* ══════════════ BÖLÜM 3: Tutanak ══════════════ */
function renderTT(){
 const t=TT||(TT=blankTT());
 return`<section class="os-bolum">
 <div class="ka-card"><div class="ka-card__body ka-stack">
  <strong>Sınav bilgileri</strong>
  <div class="ka-grid">
   ${field('Sınav adı',inp(t,'sinavAdi','text',''))}
   ${field('Sınav yeri (Sınıf/Şube)',inp(t,'sinavYeri','text',''))}
   ${field('Tarih',inp(t,'tarih','date'))}
   ${field('Saat',inp(t,'saat','text','09.00'))}
  </div>
 </div></div>

 <div class="ka-card"><div class="ka-card__body ka-stack">
  <strong>A) Sınav Öncesi</strong>
  <div class="ka-grid">
   ${field('Soru kitapçığı adedi',inpNested(t,'onceki','soruKitabi','number',''))}
   ${field('Teslim eden',inpNested(t,'onceki','teslimEden','text',''))}
   ${field('Teslim alan',inpNested(t,'onceki','teslimAlan','text',''))}
   ${field('Diğer',inpNested(t,'onceki','diger','text',''))}
   ${field('Tarih',inpNested(t,'onceki','tarih','date'))}
   ${field('Saat',inpNested(t,'onceki','saat','text',''))}
  </div>
 </div></div>

 <div class="ka-card"><div class="ka-card__body ka-stack">
  <strong>B) Sınav Sırasında</strong>
  <div class="ka-grid">
   <label class="ka-field"><span class="ka-field__label">Olumsuzluk</span>
    <label class="os-cb-label"><input type="checkbox" data-os="tt" data-key="olumsuzluk"${t.sirasinda.olumsuzluk?' checked':''}> Olumsuzluk var</label>
   </label>
   ${field('Olumsuzluk açıklaması',inpNested(t,'sirasinda','olumsuzlukAciklama','text',''))}
   ${field('Katılımcı sayısı',inpNested(t,'sirasinda','katilimci','number',''))}
   ${field('Kitapçık durumu',inpNested(t,'sirasinda','kitapciDurum','text',''))}
  </div>
 </div></div>

 <div class="ka-card"><div class="ka-card__body ka-stack">
  <strong>Gözetmen</strong>
  <div class="ka-grid">
   ${isManager()?field('Gözetmen seç',ogretmenSelect(t._gozetmenId||'','data-os="tt" data-key="_gozetmenId"')):''}
   ${field('Adı',inpNested(t,'gozetmen','ad','text',''))}
   ${field('Soyadı',inpNested(t,'gozetmen','soyad','text',''))}
  </div>
 </div></div>

 <div class="ka-card"><div class="ka-card__body ka-stack">
  <strong>C) Sınav Sonrası</strong>
  <div class="ka-grid">
   ${field('Soru kitapçığı adedi',inpNested(t,'sonrasi','soruKitabi','number',''))}
   ${field('Teslim eden',inpNested(t,'sonrasi','teslimEden','text',''))}
   ${field('Teslim alan',inpNested(t,'sonrasi','teslimAlan','text',''))}
   ${field('Tarih',inpNested(t,'sonrasi','tarih','date'))}
   ${field('Saat',inpNested(t,'sonrasi','saat','text',''))}
  </div>
 </div></div>

 <div class="os-yazdir-alan"><button type="button" class="ka-btn ka-btn--primary" data-os-yazdir="tutanak">📄 Yazdır / PDF</button></div>
</section>`;
}

/* ══════════════ ANA RENDER ══════════════ */
function render(){
 if(!kok)return;
 const sc=sekme;
 const tabs=[
  {id:'teblig',  label:'Görevlendirme Tebliği'},
  {id:'gozetmen',label:'Gözetmen Görevleri'},
  {id:'tutanak', label:'Sınav Evrakı Tutanağı'}
 ];
 const tabBar=tabs.map(t=>`<button type="button" class="os-tab${sc===t.id?' os-tab--aktif':''}" data-os-tab="${t.id}">${esc(t.label)}</button>`).join('');
 let icerik='';
 if(sc==='teblig')icerik=renderST();
 else if(sc==='gozetmen')icerik=renderGT();
 else icerik=renderTT();

 kok.innerHTML=`<section class="os-page" data-os-page data-ortak-sinav-module>
<header class="os-sayfa-bas">
 <h2>Ortak Sınavlar</h2>
 <p class="ka-muted">Görevlendirme tebliği, gözetmen görev listesi ve sınav evrakı teslim tutanağı.</p>
</header>
<nav class="os-tabs" role="tablist">${tabBar}</nav>
<div class="os-icerik">${icerik}</div>
</section>`;
 baglan();
}

/* ══════════════ OLAY DİNLEYİCİLERİ ══════════════ */
function baglan(){
 if(!kok)return;

 /* Sekme geçişi */
 kok.querySelectorAll('[data-os-tab]').forEach(btn=>{
  btn.addEventListener('click',()=>{sekme=btn.dataset.osTab;render()});
 });

 /* ST (tebliğ) input/select */
 kok.querySelectorAll('[data-os="st"]').forEach(el=>{
  el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{
   const s=ST||(ST=blankST()),k=el.dataset.key,v=el.value;
   if(k==='ogretmenId'){
    s.ogretmenId=v;
    const t=ogretmenBul(v);
    if(t){s.ogretmen=adBicimi(adSoyad(t));render();}
   }else{s[k]=v;}
  });
 });

 /* GT (gözetmen görevleri) textarea */
 kok.querySelectorAll('[data-os="gt"]').forEach(el=>{
  el.addEventListener('input',()=>{
   const g=GT||(GT=blankGT()), liste=el.dataset.liste, idx=Number(el.dataset.idx);
   if(g[liste])g[liste][idx]=el.value;
  });
 });
 kok.querySelectorAll('[data-os-sil-gorev]').forEach(btn=>{
  btn.addEventListener('click',()=>{(GT||(GT=blankGT())).gorevler.splice(Number(btn.dataset.osSilGorev),1);render();});
 });
 kok.querySelectorAll('[data-os-sil-kural]').forEach(btn=>{
  btn.addEventListener('click',()=>{(GT||(GT=blankGT())).kurallar.splice(Number(btn.dataset.osSilKural),1);render();});
 });
 kok.querySelectorAll('[data-os-ekle]').forEach(btn=>{
  btn.addEventListener('click',()=>{const g=GT||(GT=blankGT()),liste=btn.dataset.osEkle;g[liste].push('');render();});
 });
 kok.querySelector('[data-os-sifirla-gt]')?.addEventListener('click',()=>{
  if(!global.confirm||global.confirm('Gözetmen görevleri ve kurallar varsayılana dönsün mü?')){
   GT=blankGT();render();
  }
 });

 /* TT (tutanak) inputs */
 kok.querySelectorAll('[data-os="tt"]').forEach(el=>{
  el.addEventListener(el.tagName==='SELECT'?'change':(el.type==='checkbox'?'change':'input'),()=>{
   const t=TT||(TT=blankTT()), k=el.dataset.key, ns=el.dataset.ns, v=el.type==='checkbox'?el.checked:el.value;
   if(k==='_gozetmenId'){
    t._gozetmenId=v;
    const og=ogretmenBul(v);
    if(og){const full=adSoyad(og),parts=full.split(' '),soyad=parts.length>1?parts.pop():'',ad=parts.join(' ');t.gozetmen={ad,soyad};render();}
   }else if(k==='olumsuzluk'){
    t.sirasinda.olumsuzluk=v;
   }else if(ns){
    if(!t[ns])t[ns]={};t[ns][k]=v;
   }else{t[k]=v;}
  });
 });

 /* Yazdır düğmeleri */
 kok.querySelectorAll('[data-os-yazdir]').forEach(btn=>{
  btn.addEventListener('click',()=>yazdir(btn.dataset.osYazdir));
 });
}

/* ══════════════ YAZDIR ══════════════ */
function yazdir(bolum){
 const okul=okulAdi(0)||'', yil=egitimYili()||'', logo=okulLogosu();
 let belgeIcerigi='';
 if(bolum==='teblig'){
  const s=ST||(ST=blankST());
  belgeIcerigi=C.gorevlendirmeBelgesi({...s,okul,yil,logo});
 }else if(bolum==='gozetmen'){
  const g=GT||(GT=blankGT());
  belgeIcerigi=C.gozetmenGorevleriBelgesi(okul,yil,logo,g.gorevler,g.kurallar);
 }else{
  const t=TT||(TT=blankTT());
  belgeIcerigi=C.tutanakBelgesi({...t,okul,yil,logo});
 }
 const html=C.printHtml(belgeIcerigi);
 if(RE?.printReport){
  RE.printReport({html, title:'Ortak Sınav'});
 }else{
  /* Yedek: yeni sekme */
  const w=global.open('','_blank');if(w){w.document.write(html);w.document.close();w.print();}
 }
}

/* ══════════════ MODÜL YAŞAM DÖNGÜSÜ ══════════════ */
const unsubs=[];
function temizle(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs.length=0;}

function mount(){
 kok=document.getElementById('v2ModuleRoot');
 if(!kok)return false;
 temizle();
 // AppStore abonelikleri
 if(B.abonelik){
  B.abonelik(EK).forEach(key=>{
   const u=global.AppStore?.subscribe?.(key,()=>{
    const page=kok?.querySelector('[data-ortak-sinav-module]');
    if(!page){temizle();return;}
    render();
   });
   if(u)unsubs.push(u);
  });
 }
 if(B.hazirla)B.hazirla(EK).catch(e=>console.warn('[OrtakSınav]',e?.message||e));
 render();
 return true;
}
function unmount(){temizle();kok=null;}
function reset(){ST=null;GT=null;TT=null;}

/* ── CSS ── */
(function(){
 const id='os-modul-stiller';
 if(document.getElementById(id))return;
 const s=document.createElement('style');s.id=id;
 s.textContent=`
.os-page{max-width:860px;margin:0 auto}
.os-sayfa-bas{margin-bottom:12px}
.os-sayfa-bas h2{font-size:1.3rem;font-weight:700}
.os-tabs{display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid var(--ka-border,#e2e8f0);padding-bottom:0}
.os-tab{background:none;border:none;padding:8px 16px;font-size:.92rem;font-weight:500;color:var(--ka-muted,#64748b);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;border-radius:4px 4px 0 0;transition:color .15s,border-color .15s}
.os-tab:hover{color:var(--ka-accent,#2563eb)}
.os-tab--aktif{color:var(--ka-accent,#2563eb);border-bottom-color:var(--ka-accent,#2563eb);font-weight:700}
.os-bolum{display:flex;flex-direction:column;gap:14px}
.os-yazdir-alan{display:flex;justify-content:flex-end;gap:8px;padding:4px 0}
.os-gorev-satir{display:flex;align-items:flex-start;gap:6px;margin-bottom:8px}
.os-gorev-harf{flex:0 0 24px;font-weight:600;padding-top:9px;color:var(--ka-muted,#64748b)}
.os-gorev-ta{flex:1;min-height:52px;resize:vertical;line-height:1.5}
.os-gorev-baslik-satir{display:flex;justify-content:space-between;align-items:center}
.os-sil-btn{flex:0 0 auto;font-size:1rem;padding:4px 8px}
.os-gorev-alan{display:flex;flex-direction:column}
.os-cb-label{display:flex;align-items:center;gap:6px;font-size:.92rem;padding:8px 0;cursor:pointer}
@media print{.os-tabs,.os-yazdir-alan{display:none!important}}
`;
 document.head.appendChild(s);
})();

global.OrtakSinavModule={mount,unmount,reset};
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='ortakSinav')mount()});
})(window);
