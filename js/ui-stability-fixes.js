/* Koruk Asistan — ortak UI kararlılık başlangıcı / performans v2 */
(function(){
'use strict';
function ayniKaynakVar(tur,url){
  const temiz=String(url||'').split('?')[0].replace(/^\.\//,'');
  const sec=tur==='script'?'script[src]':'link[rel="stylesheet"][href]';
  return [...document.querySelectorAll(sec)].some(el=>{
    const v=(tur==='script'?el.getAttribute('src'):el.getAttribute('href'))||'';
    return v.split('?')[0].replace(/^\.\//,'')===temiz;
  });
}
function scriptYukle(src,key){
  if(document.querySelector('script[data-'+key+']')||ayniKaynakVar('script',src))return null;
  const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute('data-'+key,'1');document.head.appendChild(s);return s;
}
function stilYukle(href,key){
  if(document.querySelector('link[data-'+key+']')||ayniKaynakVar('style',href))return null;
  const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.setAttribute('data-'+key,'1');document.head.appendChild(l);return l;
}
function gv(n){try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null}}
function idle(fn,timeout=2200){
  if('requestIdleCallback'in window)requestIdleCallback(()=>fn(),{timeout});
  else setTimeout(fn,Math.min(timeout,1200));
}

/* İlk boyama için gerekli ortak katmanlar. */
stilYukle('css/auth-header-redesign.css?v=2','auth-header-redesign');
scriptYukle('js/auth-header-redesign-v2.js?v=2','auth-header-redesign-js');
scriptYukle('js/mobile-header-brand.js?v=2','mobile-header-brand');
scriptYukle('js/theme-contrast-fixes.js','theme-contrast');
scriptYukle('js/nav-scroll-fix.js?v=6','nav-scroll-fix');
scriptYukle('js/pull-to-refresh-guard.js?v=1','pull-to-refresh-guard');
scriptYukle('js/modal-interaction-fix.js?v=5','modal-interaction-fix-js');
stilYukle('css/checkbox-standard.css?v=2','checkbox-standard');
scriptYukle('js/app-pages-theme.js?v=3','app-pages-theme-js');

/* İlk ekranda gerekmeyen rapor/Excel yardımcılarını ağ ve ana thread sakinleşince yükle. */
idle(()=>{
  scriptYukle('js/excel-visual-fidelity.js','excel-visual-fidelity');
  scriptYukle('js/excel-turkish-date-fix.js','excel-turkish-date');
  scriptYukle('js/excel-visual-fidelity-v3.js','excel-visual-fidelity-v3');
  scriptYukle('js/rapor-preview.js?v=5','rapor-preview');
  scriptYukle('js/nobet-rapor.js?v=3','nobet-rapor');
},2600);

/* Modern sayfa katmanları — mevcut davranış korunur. */
stilYukle('css/sosyal-kulupler-modern.css?v=4','sosyal-kulupler-modern-css');
scriptYukle('js/sosyal-kulupler-modern.js?v=2','sosyal-kulupler-modern-js');
stilYukle('css/belirli-gunler-modern.css?v=3','belirli-gunler-modern-css');
scriptYukle('js/belirli-gunler-local-first.js?v=2','belirli-gunler-local-first-js');
scriptYukle('js/belirli-gunler-modern.js?v=2','belirli-gunler-modern-js');
stilYukle('css/zumre-modern.css?v=3','zumre-modern-css');
scriptYukle('js/zumre-local-first.js?v=1','zumre-local-first-js');
scriptYukle('js/zumre-modern.js?v=4','zumre-modern-js');
stilYukle('css/dashboard-bell-modern.css?v=4','dashboard-bell-modern-css');
stilYukle('css/dashboard-home-wide.css?v=1','dashboard-home-wide-css');
scriptYukle('js/dashboard-bell-modern.js?v=2','dashboard-bell-modern-js');
stilYukle('css/ders-nobet-programim-modern.css?v=1','ders-nobet-programim-modern-css');
scriptYukle('js/ders-nobet-programim-modern.js?v=1','ders-nobet-programim-modern-js');
stilYukle('css/kullanici-yonetimi-modern.css?v=1','kullanici-yonetimi-modern-css');
scriptYukle('js/kullanici-yonetimi-modern.js?v=1','kullanici-yonetimi-modern-js');
stilYukle('css/veri-modern.css?v=1','veri-modern-css');
scriptYukle('js/veri-modern.js?v=1','veri-modern-js');
stilYukle('css/istatistikler-modern.css?v=1','istatistikler-modern-css');
scriptYukle('js/istatistikler-modern.js?v=1','istatistikler-modern-js');
stilYukle('css/takvim-modern.css?v=1','takvim-modern-css');
scriptYukle('js/takvim-modern.js?v=1','takvim-modern-js');
stilYukle('css/hava-durumu-modern.css?v=1','hava-durumu-modern-css');
scriptYukle('js/hava-durumu-modern.js?v=1','hava-durumu-modern-js');
try{localStorage.removeItem('oyGorunum')}catch(_){}document.documentElement.removeAttribute('data-skin');

const mobil=window.matchMedia('(max-width:1023px)').matches;let basladi=false;
function kullaniciHazir(){return !!gv('AKTIF_KULLANICI')}
function anaSayfaBaslat(){
  if(!mobil||basladi||!kullaniciHazir())return false;
  basladi=true;
  stilYukle('css/dashboard-home.css?v=3','dashboard-home');
  stilYukle('css/dashboard-home-neutral.css?v=2','dashboard-home-neutral');
  stilYukle('css/dashboard-home-colors.css?v=7','dashboard-home-colors');
  scriptYukle('js/dashboard-home.js?v=7','dashboard-home');
  scriptYukle('js/dashboard-duyuru-v4.js?v=4','dashboard-duyuru-v4');
  scriptYukle('js/dashboard-home-shared.js?v=2','dashboard-home-shared');
  scriptYukle('js/dashboard-home-bootstrap-sync.js?v=1','dashboard-home-bootstrap-sync');
  scriptYukle('js/dashboard-home-enhancements.js?v=3','dashboard-home-enhancements');
  scriptYukle('js/dashboard-teacher-school-summary.js?v=1','dashboard-teacher-school-summary');
  return true;
}
if(mobil){
  const dene=()=>anaSayfaBaslat();
  document.addEventListener('DOMContentLoaded',()=>setTimeout(dene,0),{once:true});
  window.addEventListener('load',dene,{once:true});
  window.addEventListener('koruk:data-updated',dene);
  window.addEventListener('koruk:dashboard-render',dene);
  [120,500,1500,3500].forEach(ms=>setTimeout(dene,ms));
}

/* Okul veri tutarlılığı ilk açılışı bloklamaz. İlgili ekran ilk kullanıldığında yüklenir. */
let tutarlilikYukleniyor=false;
function tutarlilikYukle(){
  if(window.__KORUK_SCHOOL_DATA_CONSISTENCY__||tutarlilikYukleniyor)return;
  tutarlilikYukleniyor=true;
  const s=scriptYukle('js/school-data-consistency.js?v=6','school-data-consistency');
  if(s){s.addEventListener('load',()=>{tutarlilikYukleniyor=false},{once:true});s.addEventListener('error',()=>{tutarlilikYukleniyor=false},{once:true})}
  else tutarlilikYukleniyor=false;
}
document.addEventListener('click',e=>{
  const tab=e.target.closest?.('[data-tab]')?.getAttribute('data-tab');
  if(tab&&['ogretmenler','siniflar','ogrenciler'].includes(tab))tutarlilikYukle();
},true);
/* İlk ekran çizildikten sonra sessizce hazırla; v6 artık polling veya açılış Firestore taraması yapmaz. */
idle(()=>tutarlilikYukle(),5000);

scriptYukle('js/role-ui-hardening.js','role-ui-hardening');

/* Doküman modal yaması: 12 saniyelik polling yerine olay + az sayıda güvenli deneme. */
let sarildi=false;
function kur(){
  if(sarildi)return true;
  if(typeof window.dokumanYukleModalAc!=='function')return false;
  const eski=window.dokumanYukleModalAc;
  window.dokumanYukleModalAc=function(){
    const r=eski.apply(this,arguments);
    requestAnimationFrame(()=>{
      const b=document.getElementById('modalKaydetBtn');if(!b)return;
      b.style.display='';b.disabled=false;b.removeAttribute('aria-disabled');b.textContent='💾 Kaydet';
      const resim=document.getElementById('dok_panel_resim'),bir=document.getElementById('dok_panel_birlestir');
      if(bir&&bir.style.display!=='none')b.disabled=true;
      else if(resim&&resim.style.display!=='none'&&!window._dokResimPdfBlob)b.disabled=true;
    });
    return r;
  };
  sarildi=true;return true;
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(kur,0),{once:true});
window.addEventListener('load',kur,{once:true});
document.addEventListener('click',()=>{if(!sarildi)kur()},{passive:true});
[300,1200,3500].forEach(ms=>setTimeout(()=>{if(!sarildi)kur()},ms));
})();
