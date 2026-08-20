/* Koruk Asistan — modal durum ve tema kontrast kararlılık düzeltmeleri */
(function(){
'use strict';
function scriptYukle(src,key){if(document.querySelector('script[data-'+key+']'))return;const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute('data-'+key,'1');document.head.appendChild(s);}
scriptYukle('js/theme-contrast-fixes.js','theme-contrast');
scriptYukle('js/excel-visual-fidelity.js','excel-visual-fidelity');
scriptYukle('js/excel-turkish-date-fix.js','excel-turkish-date');
scriptYukle('js/excel-visual-fidelity-v3.js','excel-visual-fidelity-v3');
scriptYukle('js/nav-scroll-fix.js','nav-scroll-fix');

/* Dashboard motorları artık aynı anda çalışmaz.
   <=1023px: mevcut mobil v4
   >=1024px: yeni web v2 katmanı */
const mobilDashboard=window.matchMedia('(max-width: 1023px)').matches;
if(mobilDashboard){
  scriptYukle('js/dashboard-mobile-v4.js','dashboard-mobile-v4');
  scriptYukle('js/dashboard-mobile-v4-polish.js','dashboard-mobile-v4-polish');
  scriptYukle('js/dashboard-card-count-fix.js','dashboard-card-count-fix');
  scriptYukle('js/dashboard-mobile-v4-hotfix.js','dashboard-mobile-v4-hotfix');
  scriptYukle('js/dashboard-today-cleanup.js','dashboard-today-cleanup');
}

/* Rol/yetki sertleştirme tüm platformlarda çalışır. */
scriptYukle('js/role-ui-hardening.js','role-ui-hardening');
/* Mobil dashboard tercihleri en son tek merkezden uygulanır. */
if(mobilDashboard){
  scriptYukle('js/dashboard-mobile-state-v3.js','dashboard-mobile-state-v3');
  /* Android WebView dashboard DOM'u yeniden çizdiğinde hero kaynaklarını
     yeniden üretir; normal web/PWA'da kendi kendine devre dışı kalır. */
  scriptYukle('js/android-dashboard-hero-fix.js','android-dashboard-hero-fix');
}

let sarildi=false,deneme=0;
function kur(){if(sarildi)return true;if(typeof window.dokumanYukleModalAc!=='function')return false;const eski=window.dokumanYukleModalAc;window.dokumanYukleModalAc=function(){const r=eski.apply(this,arguments);requestAnimationFrame(()=>{const b=document.getElementById('modalKaydetBtn');if(!b)return;b.style.display='';b.disabled=false;b.removeAttribute('aria-disabled');b.textContent='💾 Kaydet';const resim=document.getElementById('dok_panel_resim'),bir=document.getElementById('dok_panel_birlestir');if(bir&&bir.style.display!=='none')b.disabled=true;else if(resim&&resim.style.display!=='none'&&!window._dokResimPdfBlob)b.disabled=true;});return r;};sarildi=true;return true;}
const t=setInterval(()=>{if(kur()||++deneme>120)clearInterval(t);},100);document.addEventListener('DOMContentLoaded',()=>setTimeout(kur,0));
})();