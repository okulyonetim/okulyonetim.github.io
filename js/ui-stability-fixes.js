/* Koruk Asistan — ortak UI kararlılık başlangıcı */
(function(){
'use strict';
function scriptYukle(src,key){if(document.querySelector('script[data-'+key+']'))return;const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute('data-'+key,'1');document.head.appendChild(s)}
function stilYukle(href,key){if(document.querySelector('link[data-'+key+']'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.setAttribute('data-'+key,'1');document.head.appendChild(l)}
function gv(n){try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null}}
scriptYukle('js/theme-contrast-fixes.js','theme-contrast');
scriptYukle('js/excel-visual-fidelity.js','excel-visual-fidelity');
scriptYukle('js/excel-turkish-date-fix.js','excel-turkish-date');
scriptYukle('js/excel-visual-fidelity-v3.js','excel-visual-fidelity-v3');
scriptYukle('js/nav-scroll-fix.js','nav-scroll-fix');
scriptYukle('js/modal-interaction-fix.js?v=5','modal-interaction-fix-js');
scriptYukle('js/rapor-preview.js?v=5','rapor-preview');
scriptYukle('js/nobet-rapor.js?v=2','nobet-rapor');
stilYukle('css/checkbox-standard.css?v=1','checkbox-standard');
scriptYukle('js/app-pages-theme.js?v=3','app-pages-theme-js');
try{localStorage.removeItem('oyGorunum')}catch(_){}document.documentElement.removeAttribute('data-skin');
const mobil=window.matchMedia('(max-width:1023px)').matches;let basladi=false;
function kullaniciHazir(){const u=gv('AKTIF_KULLANICI');if(!u)return false;if(u.bagliOgretmenId){try{if(typeof bagliOgretmenimGetir==='function'&&bagliOgretmenimGetir())return true;const og=gv('ogretmenler');return Array.isArray(og)&&og.some(x=>x&&x.id===u.bagliOgretmenId)}catch(_){return false}}return true}
function anaSayfaBaslat(){if(!mobil||basladi||!kullaniciHazir())return false;basladi=true;stilYukle('css/dashboard-home.css?v=3','dashboard-home');stilYukle('css/dashboard-home-neutral.css?v=1','dashboard-home-neutral');stilYukle('css/dashboard-home-colors.css?v=7','dashboard-home-colors');scriptYukle('js/dashboard-home.js?v=6','dashboard-home');scriptYukle('js/dashboard-duyuru.js?v=2','dashboard-duyuru');scriptYukle('js/dashboard-home-shared.js?v=2','dashboard-home-shared');scriptYukle('js/dashboard-home-enhancements.js?v=3','dashboard-home-enhancements');scriptYukle('js/dashboard-teacher-school-summary.js?v=1','dashboard-teacher-school-summary');return true}
if(mobil){let deneme=0;const timer=setInterval(()=>{if(anaSayfaBaslat()||++deneme>300)clearInterval(timer)},100);document.addEventListener('DOMContentLoaded',()=>setTimeout(anaSayfaBaslat,0));window.addEventListener('load',()=>setTimeout(anaSayfaBaslat,100))}
scriptYukle('js/role-ui-hardening.js','role-ui-hardening');
let sarildi=false,deneme=0;function kur(){if(sarildi)return true;if(typeof window.dokumanYukleModalAc!=='function')return false;const eski=window.dokumanYukleModalAc;window.dokumanYukleModalAc=function(){const r=eski.apply(this,arguments);requestAnimationFrame(()=>{const b=document.getElementById('modalKaydetBtn');if(!b)return;b.style.display='';b.disabled=false;b.removeAttribute('aria-disabled');b.textContent='💾 Kaydet';const resim=document.getElementById('dok_panel_resim'),bir=document.getElementById('dok_panel_birlestir');if(bir&&bir.style.display!=='none')b.disabled=true;else if(resim&&resim.style.display!=='none'&&!window._dokResimPdfBlob)b.disabled=true});return r};sarildi=true;return true}const t=setInterval(()=>{if(kur()||++deneme>120)clearInterval(t)},100);document.addEventListener('DOMContentLoaded',()=>setTimeout(kur,0));
})();
