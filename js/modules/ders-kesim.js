/* Koruk Asistan — Ders Kesim Raporu
 * Öğretmenin dönem / yıl sonunda okul müdürlüğüne verdiği "ders kesim durumu" raporu. Okul, öğretmen, müdür, eğitim-öğretim yılı ve dönem uygulamadan gelir;
 * sınıf ve dersler öğretmenin ders programından hazırlanır ("Müfredata uygun tamamlanmıştır." durumuyla), ekranda satır satır değiştirilebilir.
 * Yönetici, öğretmen seçerek onun raporunu hazırlayabilir. Çıktı merkezi ReportEngine ile yazdırılır / PDF alınır; kâğıt stili css/design-system-base.css (.dkr-*).
 * Mantık: ders-kesim-core.js.
 */
(function(global){
'use strict';
if(global.DersKesimModule)return;
const C=global.DersKesimCore,B=global.SinifBaglam;
if(!C||!B)throw new Error('Ders Kesim Raporu için gerekli bileşenler yüklenmedi.');

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {rows,isManager,adBicimi,adSoyad,teacherId,okulAdi,okulMuduru,egitimYili}=B;
const EK=['dersProgrami','dersListesi'];
const iso=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

let S=null,unsubs=[];

/* ── veri ── */
const ogretmenler=()=>rows('ogretmenler').filter(t=>t&&t.id&&t.aktif!==false).sort((a,b)=>adSoyad(a).localeCompare(adSoyad(b),'tr'));
const ogretmenBul=id=>id?rows('ogretmenler').find(t=>String(t.id)===String(id))||null:null;
const kendiOgretmenId=()=>{const id=teacherId();return id&&ogretmenBul(id)?String(id):''};
const satirlarHesapla=id=>C.programSatirlari(rows('dersProgrami'),id);

function blank(){
 return{ogretmenId:kendiOgretmenId(),ogretmen:'',okul:'',mudur:'',yil:egitimYili(),donem:C.varsayilanDonem(),belgeTarihi:iso(),satirlar:[],duzenlendi:false,elle:{}};
}
const ensure=()=>S||(S=blank());
/* Elle değiştirilmeyen alanları veriden doldurur; değişen bir şey olduysa true. */
function varsayilanlar(){
 const s=ensure(),once=JSON.stringify([s.ogretmen,s.okul,s.mudur,s.duzenlendi?null:s.satirlar]);
 if(!s.elle.ogretmen&&s.ogretmenId)s.ogretmen=adBicimi(adSoyad(ogretmenBul(s.ogretmenId)));
 if(!s.elle.okul)s.okul=okulAdi(0);
 if(!s.elle.mudur)s.mudur=okulMuduru();
 if(!s.duzenlendi)s.satirlar=satirlarHesapla(s.ogretmenId);
 return once!==JSON.stringify([s.ogretmen,s.okul,s.mudur,s.duzenlendi?null:s.satirlar]);
}
const model=()=>{const s=ensure();return{okul:s.okul,yil:s.yil,donem:s.donem,belgeTarihi:s.belgeTarihi,ogretmen:s.ogretmen,mudur:s.mudur,satirlar:s.satirlar}};

/* ── ekran ── */
const field=(label,html)=>`<label class="ka-field"><span class="ka-field__label">${esc(label)}</span>${html}</label>`;
const input=(key,type='text',ph='')=>`<input class="ka-input" type="${type}" value="${esc(ensure()[key])}" placeholder="${esc(ph)}" data-dkr="${key}" autocomplete="off">`;
function ogretmenSecici(){
 const s=ensure();
 return`<select class="ka-select" data-dkr="ogretmenId"><option value="">— Elle yazacağım —</option>${ogretmenler().map(t=>`<option value="${esc(t.id)}"${String(t.id)===String(s.ogretmenId)?' selected':''}>${esc(adBicimi(adSoyad(t)))}</option>`).join('')}</select>`;
}
const donemSecici=()=>`<select class="ka-select" data-dkr="donem">${C.DONEMLER.map(([v,ad])=>`<option value="${v}"${v===C.donemNo(ensure().donem)?' selected':''}>${esc(ad)}</option>`).join('')}</select>`;
function satirHtml(r,i){
 const a=(k,ph,ek='')=>`<input class="ka-input" type="text" value="${esc(r[k])}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" data-dkr-satir="${i}" data-k="${k}" autocomplete="off"${ek}>`;
 return`<div class="dkr-satir" data-dkr-satir-kok="${i}"><span class="dkr-no">${i+1}</span>${a('sinif','Sınıf',' list="dkrSiniflar"')}${a('ders','Ders',' list="dkrDersler"')}${a('durum','Durum')}<button type="button" class="ka-btn ka-btn--ghost dkr-sil" data-dkr-sil="${i}" aria-label="Satırı sil" title="Satırı sil">×</button></div>`;
}
function tabloKarti(){
 const s=ensure(),sinifAdlari=B.siniflar().liste.map(c=>c.ad),dersAdlari=[...new Set(rows('dersListesi').map(d=>String(d?.ad||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
 const hazirProgram=satirlarHesapla(s.ogretmenId).length>0;
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Sınıf, ders ve durum</strong>
<small class="ka-muted">${hazirProgram?'Ders programınızdan hazırlandı: her sınıf-ders çifti bir satırdır. Durumu değiştirebilir, satır ekleyip silebilirsiniz.':'Bu öğretmen için ders programı kaydı bulunamadı; satırları elle yazabilirsiniz.'}</small>
<datalist id="dkrSiniflar">${sinifAdlari.map(a=>`<option value="${esc(a)}"></option>`).join('')}</datalist><datalist id="dkrDersler">${dersAdlari.map(a=>`<option value="${esc(a)}"></option>`).join('')}</datalist>
<div class="dkr-tablo-ekran"><div class="dkr-satir dkr-satir--baslik" aria-hidden="true"><span>#</span><span>Sınıf</span><span>Ders</span><span>Durum</span><span></span></div>${s.satirlar.map(satirHtml).join('')}</div>
<div class="dkr-eylem"><button type="button" class="ka-btn ka-btn--secondary" data-dkr-ekle>＋ Satır ekle</button>${hazirProgram?'<button type="button" class="ka-btn ka-btn--ghost" data-dkr-doldur>Ders programımdan yeniden doldur</button>':''}</div></div></article>`;
}
function render(kok=document.getElementById('v2ModuleRoot')){
 if(!kok)return false;
 const y=global.scrollY,yonetici=isManager();
 varsayilanlar();
 kok.innerHTML=`<section class="dkr-page" data-dkr-page>
 <header class="dkr-head"><h2>Ders Kesim Raporu</h2><p class="ka-muted">Dönem ve yıl sonunda okul müdürlüğüne verilen ders kesim durumu raporu. Bilgiler ve ders satırları hazır gelir; kontrol edip yazdırın.</p></header>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Okul ve belge</strong><div class="ka-grid">${field('Okul adı',input('okul','text','Okul adı'))}${field('Eğitim-öğretim yılı',input('yil','text','2026-2027'))}${field('Dönem',donemSecici())}${field('Belge tarihi',input('belgeTarihi','date'))}</div></div></article>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Öğretmen ve okul müdürü</strong><div class="ka-grid">${yonetici?field('Öğretmen',ogretmenSecici()):''}${field('Öğretmen adı soyadı',input('ogretmen','text','Ad SOYAD'))}${field('Okul müdürü',input('mudur','text','Ad SOYAD'))}</div><small class="ka-muted">Boş bıraktığınız alanlar çıktıda noktalı kalır; elle yazabilirsiniz.</small></div></article>
 ${tabloKarti()}
 <div class="dkr-eylem dkr-eylem--yazdir"><button type="button" class="ka-btn ka-btn--primary" data-dkr-yazdir>Yazdır / PDF</button></div>
 </section>`;
 baglan(kok);
 global.scrollTo?.(0,y);
 return true;
}
function degistir(k,v){
 const s=ensure();
 if(k==='ogretmenId'){
  s.ogretmenId=String(v||'');s.elle.ogretmen=false;s.duzenlendi=false;s.ogretmen=s.ogretmenId?s.ogretmen:'';
  return true;
 }
 s[k]=String(v??'');
 if(k==='ogretmen'||k==='okul'||k==='mudur')s.elle[k]=true;
 return false;
}
function satirDegistir(i,k,v){
 const s=ensure(),r=s.satirlar[i];if(!r||!['sinif','ders','durum'].includes(k))return;
 r[k]=String(v??'');s.duzenlendi=true;
}
function baglan(kok){
 kok.querySelectorAll('[data-dkr]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{if(degistir(el.dataset.dkr,el.value))render(kok)}));
 kok.querySelectorAll('[data-dkr-satir]').forEach(el=>el.addEventListener('input',()=>satirDegistir(Number(el.dataset.dkrSatir),el.dataset.k,el.value)));
 kok.querySelectorAll('[data-dkr-sil]').forEach(b=>b.addEventListener('click',()=>{ensure().satirlar.splice(Number(b.dataset.dkrSil),1);ensure().duzenlendi=true;render(kok)}));
 kok.querySelector('[data-dkr-ekle]')?.addEventListener('click',()=>{
  const s=ensure();s.satirlar.push({sinif:'',ders:'',durum:C.DURUM});s.duzenlendi=true;render(kok);
  kok.querySelector(`[data-dkr-satir="${s.satirlar.length-1}"][data-k="sinif"]`)?.focus?.();
 });
 kok.querySelector('[data-dkr-doldur]')?.addEventListener('click',()=>{
  const s=ensure();
  if(s.duzenlendi&&global.confirm&&!global.confirm('Tablodaki değişiklikleriniz silinip satırlar ders programınızdan yeniden doldurulsun mu?'))return;
  s.duzenlendi=false;s.satirlar=satirlarHesapla(s.ogretmenId);render(kok);
 });
 kok.querySelector('[data-dkr-yazdir]')?.addEventListener('click',yazdir);
}

function yazdir(){
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 const m=model(),ad=String(m.ogretmen||'').trim();
 global.ReportEngine.printReport('Ders Kesim Raporu',C.belge(m),{fileName:`Ders Kesim Raporu${ad?` ${ad}`:''}`,yon:'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' ',akis:true,kenarBosluk:10,ozellestirilebilir:false});
 return true;
}

function temizle(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
function open(){
 S=blank();temizle();
 const ok=render();
 B.abonelik(EK).forEach(p=>{
  const u=global.AppStore?.subscribe?.(p,()=>{
   const kok=document.querySelector('[data-dkr-page]');if(!kok)return temizle();
   /* Veri sonradan geldiyse (senkron) yalnız değişiklik varsa yeniden çiz; yazarken odak kaybolmasın. */
   if(varsayilanlar()&&!kok.contains(document.activeElement))render();
  });
  if(u)unsubs.push(u);
 });
 B.hazirla(EK).catch(e=>console.warn('[Ders Kesim Raporu]',e?.message||e));
 return ok;
}

global.DersKesimModule={open,render,model,yazdir,degistir,satirDegistir,reset:()=>{S=null;temizle()}};
})(window);
