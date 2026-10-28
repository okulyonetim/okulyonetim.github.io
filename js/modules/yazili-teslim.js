/* Koruk Asistan — Yazılı Kâğıdı Teslim Tutanağı
 * Öğretmenin yazılı sınav kâğıtlarını okul idaresine teslim ederken imzalanan tutanak. Okul, öğretmen, branş ve eğitim-öğretim yılı uygulamadan gelir;
 * sınıf / ders / dönem başına miktar (birim: top ya da adet, seçilir), öğretmenin Yazılı Sınavlar sayfasındaki kayıtlarından hesaplanır (her sınav, her sınıf için bir) ve ekranda değiştirilebilir.
 * Yönetici, öğretmen seçerek onun tutanağını hazırlayabilir. Çıktı merkezi ReportEngine ile yazdırılır / PDF alınır; kâğıt stili css/design-system-base.css (.ytt-*).
 * Mantık: yazili-teslim-core.js.
 */
(function(global){
'use strict';
if(global.YaziliTeslimModule)return;
const C=global.YaziliTeslimCore,B=global.SinifBaglam;
if(!C||!B)throw new Error('Yazılı teslim tutanağı için gerekli bileşenler yüklenmedi.');

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {rows,isManager,adBicimi,adSoyad,teacherId,okulAdi,egitimYili}=B;
const EK=['sinavlar','dersProgrami','dersListesi'];
const iso=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const BIRIM_ANAHTAR='yazili-teslim-birim';
let S=null,unsubs=[];

/* ── veri ── */
const ogretmenler=()=>rows('ogretmenler').filter(t=>t&&t.id&&t.aktif!==false).sort((a,b)=>adSoyad(a).localeCompare(adSoyad(b),'tr'));
const ogretmenBul=id=>id?rows('ogretmenler').find(t=>String(t.id)===String(id))||null:null;
const kendiOgretmenId=()=>{const id=teacherId();return id&&ogretmenBul(id)?String(id):''};
const satirlarHesapla=id=>C.sinavSatirlari(rows('sinavlar'),id).map(r=>({sinif:r.sinif,ders:r.ders,d1:r.d1?String(r.d1):'',d2:r.d2?String(r.d2):''}));

function blank(){
 return{ogretmenId:kendiOgretmenId(),ogretmen:'',brans:'',okul:'',yil:egitimYili(),belgeTarihi:iso(),teslimAlan:'',teslimUnvan:'',teslimTarihi:iso(),birim:C.birimNormal(global.KaPrefs?.get?.(BIRIM_ANAHTAR,'top')),satirlar:[],duzenlendi:false,elle:{}};
}
const ensure=()=>S||(S=blank());
/* Elle değiştirilmeyen alanları veriden doldurur; değişen bir şey olduysa true. */
function varsayilanlar(){
 const s=ensure(),once=JSON.stringify([s.ogretmen,s.brans,s.okul,s.duzenlendi?null:s.satirlar]);
 const t=ogretmenBul(s.ogretmenId);
 if(!s.elle.ogretmen&&s.ogretmenId)s.ogretmen=adBicimi(adSoyad(t));
 if(!s.elle.brans&&s.ogretmenId)s.brans=String(t?.brans||'').trim();
 if(!s.elle.okul)s.okul=okulAdi(0);
 if(!s.duzenlendi)s.satirlar=satirlarHesapla(s.ogretmenId);
 return once!==JSON.stringify([s.ogretmen,s.brans,s.okul,s.duzenlendi?null:s.satirlar]);
}
const model=()=>{const s=ensure();return{okul:s.okul,yil:s.yil,belgeTarihi:s.belgeTarihi,ogretmen:s.ogretmen,brans:s.brans,teslimAlan:s.teslimAlan,teslimUnvan:s.teslimUnvan,teslimTarihi:s.teslimTarihi,birim:s.birim,satirlar:s.satirlar}};

/* ── ekran ── */
const field=(label,html)=>`<label class="ka-field"><span class="ka-field__label">${esc(label)}</span>${html}</label>`;
const input=(key,type='text',ph='')=>`<input class="ka-input" type="${type}" value="${esc(ensure()[key])}" placeholder="${esc(ph)}" data-ytt="${key}" autocomplete="off">`;
function ogretmenSecici(){
 const s=ensure(),l=ogretmenler();
 return`<select class="ka-select" data-ytt="ogretmenId"><option value="">— Elle yazacağım —</option>${l.map(t=>`<option value="${esc(t.id)}"${String(t.id)===String(s.ogretmenId)?' selected':''}>${esc(adBicimi(adSoyad(t)))}</option>`).join('')}</select>`;
}
function birimSecici(){
 const s=ensure();
 return`<select class="ka-select" data-ytt="birim" aria-label="Miktar birimi">${Object.entries(C.BIRIMLER).map(([k,b])=>`<option value="${k}"${k===s.birim?' selected':''}>${esc(b.ad)}</option>`).join('')}</select>`;
}
function satirHtml(r,i){
 const sil=`<button type="button" class="ka-btn ka-btn--ghost ytt-sil" data-ytt-sil="${i}" aria-label="Satırı sil" title="Satırı sil">×</button>`;
 const a=(k,ph,tip='text',ek='')=>`<input class="ka-input" type="${tip}" value="${esc(r[k])}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" data-ytt-satir="${i}" data-k="${k}" autocomplete="off"${ek}>`;
 return`<div class="ytt-satir" data-ytt-satir-kok="${i}"><span class="ytt-no">${i+1}</span>${a('sinif','Sınıf','text',' list="yttSiniflar"')}${a('ders','Ders','text',' list="yttDersler"')}${a('d1','1. Dönem','number',' inputmode="numeric" min="0" max="999" step="1"')}${a('d2','2. Dönem','number',' inputmode="numeric" min="0" max="999" step="1"')}<output class="ytt-top" data-ytt-top="${i}" aria-label="Toplam">${C.satirToplami(r)||''}</output>${sil}</div>`;
}
function tabloKarti(){
 const s=ensure(),bk=C.BIRIMLER[s.birim],sinifAdlari=B.siniflar().liste.map(c=>c.ad),dersAdlari=[...new Set(rows('dersListesi').map(d=>String(d?.ad||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
 const hazirSinav=satirlarHesapla(s.ogretmenId).length>0;
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Sınıf, ders ve ${bk.kucuk} sayıları</strong>
<small class="ka-muted">${hazirSinav?`Yazılı Sınavlar sayfasındaki kayıtlarınızdan hesaplandı: her sınav, seçilen her sınıf için bir ${bk.kucuk} sayılır. Değiştirebilir, satır ekleyip silebilirsiniz.`:'Bu öğretmen için yazılı sınav kaydı bulunamadı; satırları elle yazabilirsiniz.'}</small>
<div class="ka-grid">${field('Miktar birimi',birimSecici())}</div>
<datalist id="yttSiniflar">${sinifAdlari.map(a=>`<option value="${esc(a)}"></option>`).join('')}</datalist><datalist id="yttDersler">${dersAdlari.map(a=>`<option value="${esc(a)}"></option>`).join('')}</datalist>
<div class="ytt-tablo-ekran"><div class="ytt-satir ytt-satir--baslik" aria-hidden="true"><span>#</span><span>Sınıf</span><span>Ders</span><span>1. Dönem</span><span>2. Dönem</span><span>Toplam</span><span></span></div>${s.satirlar.map(satirHtml).join('')}<div class="ytt-toplamlar" aria-live="polite"><span>1. Dönem: <b data-ytt-toplam="d1">0</b></span><span>2. Dönem: <b data-ytt-toplam="d2">0</b></span><span>Toplam: <b data-ytt-toplam="toplam">0</b> ${bk.kucuk}</span></div></div>
<div class="ytt-eylem"><button type="button" class="ka-btn ka-btn--secondary" data-ytt-ekle>＋ Satır ekle</button>${hazirSinav?'<button type="button" class="ka-btn ka-btn--ghost" data-ytt-doldur>Yazılı sınavlarımdan yeniden doldur</button>':''}</div></div></article>`;
}
function render(kok=document.getElementById('v2ModuleRoot')){
 if(!kok)return false;
 const s=ensure(),y=global.scrollY,yonetici=isManager();
 varsayilanlar();
 kok.innerHTML=`<section class="ytt-page" data-ytt-page>
 <header class="ytt-head"><h2>Yazılı Kâğıdı Teslim Tutanağı</h2><p class="ka-muted">Yazılı sınav kâğıtlarını okul idaresine teslim ederken imzalanan tutanak. Bilgiler ve miktarlar hazır gelir; kontrol edip yazdırın.</p></header>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Okul ve belge</strong><div class="ka-grid">${field('Okul adı',input('okul','text','Okul adı'))}${field('Eğitim-öğretim yılı',input('yil','text','2026-2027'))}${field('Belge tarihi',input('belgeTarihi','date'))}</div></div></article>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Öğretmen ve teslim alan</strong><div class="ka-grid">${yonetici?field('Öğretmen',ogretmenSecici()):''}${field('Öğretmen adı soyadı',input('ogretmen','text','Ad SOYAD'))}${field('Branş',input('brans','text','Matematik'))}${field('Teslim alan adı soyadı',input('teslimAlan','text','Ad SOYAD'))}${field('Teslim alan unvanı',input('teslimUnvan','text','Müdür Yardımcısı'))}${field('Teslim tarihi',input('teslimTarihi','date'))}</div><small class="ka-muted">Boş bıraktığınız alanlar çıktıda noktalı kalır; elle yazabilirsiniz.</small></div></article>
 ${tabloKarti()}
 <div class="ytt-eylem ytt-eylem--yazdir"><button type="button" class="ka-btn ka-btn--primary" data-ytt-yazdir>Yazdır / PDF</button></div>
 </section>`;
 baglan(kok);toplamGuncelle(kok);
 global.scrollTo?.(0,y);
 return true;
}
function toplamGuncelle(kok){
 const T=C.toplamlar(ensure().satirlar);
 ['d1','d2','toplam'].forEach(k=>{const el=kok.querySelector(`[data-ytt-toplam="${k}"]`);if(el)el.textContent=String(T[k])});
}
function degistir(k,v){
 const s=ensure();
 if(k==='ogretmenId'){
  s.ogretmenId=String(v||'');s.elle={};s.duzenlendi=false;s.ogretmen=s.ogretmenId?s.ogretmen:'';s.brans=s.ogretmenId?s.brans:'';
  return true;
 }
 if(k==='birim'){s.birim=C.birimNormal(v);global.KaPrefs?.set?.(BIRIM_ANAHTAR,s.birim);return true}
 s[k]=String(v??'');
 if(k==='ogretmen'||k==='brans'||k==='okul')s.elle[k]=true;
 return false;
}
function satirDegistir(i,k,v){
 const s=ensure(),r=s.satirlar[i];if(!r||!['sinif','ders','d1','d2'].includes(k))return;
 r[k]=String(v??'');s.duzenlendi=true;
}
function baglan(kok){
 kok.querySelectorAll('[data-ytt]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{if(degistir(el.dataset.ytt,el.value))render(kok)}));
 kok.querySelectorAll('[data-ytt-satir]').forEach(el=>el.addEventListener('input',()=>{
  const i=Number(el.dataset.yttSatir);satirDegistir(i,el.dataset.k,el.value);
  const top=kok.querySelector(`[data-ytt-top="${i}"]`);if(top)top.textContent=C.satirToplami(ensure().satirlar[i])||'';
  toplamGuncelle(kok);
 }));
 kok.querySelectorAll('[data-ytt-sil]').forEach(b=>b.addEventListener('click',()=>{ensure().satirlar.splice(Number(b.dataset.yttSil),1);ensure().duzenlendi=true;render(kok)}));
 kok.querySelector('[data-ytt-ekle]')?.addEventListener('click',()=>{
  const s=ensure();s.satirlar.push({sinif:'',ders:'',d1:'',d2:''});s.duzenlendi=true;render(kok);
  kok.querySelector(`[data-ytt-satir="${s.satirlar.length-1}"][data-k="sinif"]`)?.focus?.();
 });
 kok.querySelector('[data-ytt-doldur]')?.addEventListener('click',()=>{
  const s=ensure();
  if(s.duzenlendi&&global.confirm&&!global.confirm('Tablodaki değişiklikleriniz silinip satırlar yazılı sınav kayıtlarınızdan yeniden doldurulsun mu?'))return;
  s.duzenlendi=false;s.satirlar=satirlarHesapla(s.ogretmenId);render(kok);
 });
 kok.querySelector('[data-ytt-yazdir]')?.addEventListener('click',yazdir);
}

function yazdir(){
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 const m=model(),ad=String(m.ogretmen||'').trim();
 global.ReportEngine.printReport('Yazılı Kâğıdı Teslim Tutanağı',C.belge(m),{fileName:`Yazili Kagidi Teslim Tutanagi${ad?` ${ad}`:''}`,yon:'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' ',akis:true,kenarBosluk:10,ozellestirilebilir:false});
 return true;
}

function temizle(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
function open(){
 S=blank();temizle();
 const ok=render();
 B.abonelik(EK).forEach(p=>{
  const u=global.AppStore?.subscribe?.(p,()=>{
   const kok=document.querySelector('[data-ytt-page]');if(!kok)return temizle();
   /* Veri sonradan geldiyse (senkron) yalnız değişiklik varsa yeniden çiz; yazarken odak kaybolmasın. */
   if(varsayilanlar()&&!kok.contains(document.activeElement))render();
  });
  if(u)unsubs.push(u);
 });
 B.hazirla(EK).catch(e=>console.warn('[Yazılı Teslim Tutanağı]',e?.message||e));
 return ok;
}

global.YaziliTeslimModule={open,render,model,yazdir,degistir,satirDegistir,reset:()=>{S=null;temizle()}};
})(window);
