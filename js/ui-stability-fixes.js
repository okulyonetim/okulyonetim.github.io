/* Koruk Asistan — ortak UI kararlılık başlangıcı */
(function(){
'use strict';
function scriptYukle(src,key){if(document.querySelector('script[data-'+key+']'))return;const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute('data-'+key,'1');document.head.appendChild(s)}
function stilYukle(href,key){if(document.querySelector('link[data-'+key+']'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.setAttribute('data-'+key,'1');document.head.appendChild(l)}
function gv(n){try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null}}
stilYukle('css/auth-header-redesign.css?v=2','auth-header-redesign');
scriptYukle('js/auth-header-redesign-v2.js?v=2','auth-header-redesign-js');
scriptYukle('js/mobile-header-brand.js?v=2','mobile-header-brand');
scriptYukle('js/theme-contrast-fixes.js','theme-contrast');
scriptYukle('js/excel-visual-fidelity.js','excel-visual-fidelity');
scriptYukle('js/excel-turkish-date-fix.js','excel-turkish-date');
scriptYukle('js/excel-visual-fidelity-v3.js','excel-visual-fidelity-v3');
scriptYukle('js/nav-scroll-fix.js','nav-scroll-fix');
scriptYukle('js/modal-interaction-fix.js?v=5','modal-interaction-fix-js');
scriptYukle('js/rapor-preview.js?v=5','rapor-preview');
scriptYukle('js/nobet-rapor.js?v=3','nobet-rapor');
scriptYukle('js/school-data-consistency.js?v=5','school-data-consistency');
stilYukle('css/checkbox-standard.css?v=2','checkbox-standard');
scriptYukle('js/app-pages-theme.js?v=3','app-pages-theme-js');
/* Çizelge modern katmanları artık yalnız Service Worker HTML enjeksiyonuna bağlı değil.
   ui-stability-fixes.js index.html'den her açılışta yüklendiği için, mevcut WebView
   dokümanı eski shell ile açılmış olsa bile bu dosyalar güvenilir biçimde devreye girer. */
stilYukle('css/sosyal-kulupler-modern.css?v=3','sosyal-kulupler-modern-css');
scriptYukle('js/sosyal-kulupler-modern.js?v=2','sosyal-kulupler-modern-js');
stilYukle('css/belirli-gunler-modern.css?v=2','belirli-gunler-modern-css');
scriptYukle('js/belirli-gunler-local-first.js?v=2','belirli-gunler-local-first-js');
scriptYukle('js/belirli-gunler-modern.js?v=2','belirli-gunler-modern-js');
try{localStorage.removeItem('oyGorunum')}catch(_){}document.documentElement.removeAttribute('data-skin');
const mobil=window.matchMedia('(max-width:1023px)').matches;let basladi=false;
/* Dashboard artık öğretmen Firestore snapshot'ını beklemez. Kullanıcı kimliği
   hazır olur olmaz yerel dashboard cache'iyle çizilir; Firestore geldikçe state
   eventleri aynı renderer'ı günceller. */
function kullaniciHazir(){return !!gv('AKTIF_KULLANICI')}
function anaSayfaBaslat(){if(!mobil||basladi||!kullaniciHazir())return false;basladi=true;stilYukle('css/dashboard-home.css?v=3','dashboard-home');stilYukle('css/dashboard-home-neutral.css?v=2','dashboard-home-neutral');stilYukle('css/dashboard-home-colors.css?v=7','dashboard-home-colors');scriptYukle('js/dashboard-home.js?v=7','dashboard-home');scriptYukle('js/dashboard-duyuru-v4.js?v=4','dashboard-duyuru-v4');scriptYukle('js/dashboard-home-shared.js?v=2','dashboard-home-shared');scriptYukle('js/dashboard-home-bootstrap-sync.js?v=1','dashboard-home-bootstrap-sync');scriptYukle('js/dashboard-home-enhancements.js?v=3','dashboard-home-enhancements');scriptYukle('js/dashboard-teacher-school-summary.js?v=1','dashboard-teacher-school-summary');return true}
if(mobil){let deneme=0;const timer=setInterval(()=>{if(anaSayfaBaslat()||++deneme>300)clearInterval(timer)},50);document.addEventListener('DOMContentLoaded',()=>setTimeout(anaSayfaBaslat,0));window.addEventListener('load',()=>setTimeout(anaSayfaBaslat,0));window.addEventListener('koruk:data-updated',anaSayfaBaslat)}
scriptYukle('js/role-ui-hardening.js','role-ui-hardening');
let sarildi=false,deneme=0;function kur(){if(sarildi)return true;if(typeof window.dokumanYukleModalAc!=='function')return false;const eski=window.dokumanYukleModalAc;window.dokumanYukleModalAc=function(){const r=eski.apply(this,arguments);requestAnimationFrame(()=>{const b=document.getElementById('modalKaydetBtn');if(!b)return;b.style.display='';b.disabled=false;b.removeAttribute('aria-disabled');b.textContent='💾 Kaydet';const resim=document.getElementById('dok_panel_resim'),bir=document.getElementById('dok_panel_birlestir');if(bir&&bir.style.display!=='none')b.disabled=true;else if(resim&&resim.style.display!=='none'&&!window._dokResimPdfBlob)b.disabled=true});return r};sarildi=true;return true}const t=setInterval(()=>{if(kur()||++deneme>120)clearInterval(t)},100);document.addEventListener('DOMContentLoaded',()=>setTimeout(kur,0));
})();