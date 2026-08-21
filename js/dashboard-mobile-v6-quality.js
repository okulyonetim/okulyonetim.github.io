/* Koruk Asistan — Mobil Dashboard v6 kalite katmanı
 * Gerçek cihazlarda uzun metin, küçük ekran, güvenli alan ve yinelenen kart
 * sorunlarını azaltır. Alt navigasyon DOM yapısına dokunmaz.
 */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
let frame=0;
function user(){try{return window.AKTIF_KULLANICI||null}catch(_){return null}}
function role(){return user()?.admin===true?'admin':'teacher'}
function title(sec){return $('.db6-title h2',sec)?.textContent?.replace(/\s+/g,' ').trim()||''}
function css(){if($('#db6-quality-css'))return;const s=document.createElement('style');s.id='db6-quality-css';s.textContent=`
#tab-panel.db6{overflow-x:hidden!important;padding-bottom:calc(92px + env(safe-area-inset-bottom))!important}
.db6 .db6-shell,.db6 .db6-section,.db6 .db6-card,.db6 .db6-row,.db6 .db6-stat{min-width:0!important;max-width:100%}
.db6 .db6-title{gap:8px;align-items:center}.db6 .db6-title h2{min-width:0;overflow-wrap:anywhere}
.db6 .db6-row>div,.db6 .db6-exam-row>div:not(.db6-exam-date){min-width:0}
.db6 .db6-row strong,.db6 .db6-row small,.db6 .db6-note-row strong,.db6 .db6-note-row small,.db6 .db6-mini-line span,.db6 .db6-exam-row strong,.db6 .db6-exam-row small{overflow-wrap:anywhere;word-break:normal}
.db6 .db6-row strong,.db6 .db6-exam-row strong{line-height:1.28}
.db6 .db6-chip{max-width:42%;white-space:normal;text-align:center;line-height:1.15;overflow-wrap:anywhere;flex-shrink:0}
.db6 .db6-quick button,.db6 .db6-stat,.db6 .db6-link,.db6 .db6-row button,.db6 button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.db6 .db6-quick button{min-height:74px;line-height:1.18;overflow-wrap:anywhere;padding-inline:5px}
.db6 .db6-stats{align-items:stretch}.db6 .db6-stat{height:100%;display:flex;flex-direction:column;justify-content:center}
.db6 .db6-stat .sub{line-height:1.25;overflow-wrap:anywhere}
.db6 .db6-calendar-strip{scrollbar-width:none}.db6 .db6-calendar-strip::-webkit-scrollbar{display:none}
.db6 .db6-day{min-width:42px;min-height:58px}
.db6 .db6-weekday,.db6 .db6-personal,.db6 .db6-list{overflow:hidden}
.db6 .db6-backtop{bottom:calc(78px + env(safe-area-inset-bottom))!important}
@media(max-width:430px){
 .db6 .db6-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 .db6 .db6-quick{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important}
 .db6 .db6-quick button{font-size:10px!important;min-height:70px!important}
 .db6 .db6-quick button i{font-size:21px!important}
 .db6 .db6-row{gap:8px!important}.db6 .db6-chip{font-size:9.5px!important;max-width:38%}
}
@media(max-width:350px){.db6 .db6-quick{grid-template-columns:repeat(2,minmax(0,1fr))!important}.db6 .db6-chip{max-width:45%}}
@media(orientation:landscape) and (max-height:520px){.db6 .db6-top{padding-top:max(8px,env(safe-area-inset-top))!important}.db6 .db6-backtop{bottom:64px!important}}
@media(prefers-reduced-motion:reduce){.db6 *{scroll-behavior:auto!important;animation-duration:.001ms!important;transition-duration:.001ms!important}}
`;
document.head.appendChild(s)}
function markRole(root){root.dataset.db6Role=role();root.classList.remove('db4','db5','db41')}
function fixButtons(root){$$('button',root).forEach(b=>{if(!b.hasAttribute('type'))b.type='button';if(!b.getAttribute('aria-label')){const t=(b.textContent||'').replace(/\s+/g,' ').trim();if(t)b.setAttribute('aria-label',t.slice(0,120))}});const settings=$('#db6LayoutBtn',root);if(settings)settings.setAttribute('aria-label','Ana sayfayı düzenle');const back=$('.db6-backtop',root);if(back)back.setAttribute('aria-label','Sayfanın başına dön')}
function removeDuplicates(shell){const seen=new Map();$$(':scope > .db6-section',shell).forEach(sec=>{const k=sec.dataset.db6Key||title(sec);if(!k)return;const prev=seen.get(k);if(!prev){seen.set(k,sec);return}const prevEmpty=!prev.textContent?.trim(),curEmpty=!sec.textContent?.trim();if(prevEmpty&&!curEmpty){prev.remove();seen.set(k,sec)}else sec.remove()})}
function apply(){const root=$('#tab-panel.db6')||$('.db6');const shell=$('.db6-shell',root||document);if(!root||!shell)return false;css();markRole(root);removeDuplicates(shell);fixButtons(root);return true}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(apply)}
document.addEventListener('DOMContentLoaded',()=>setTimeout(schedule,0));window.addEventListener('load',()=>setTimeout(schedule,250));window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});document.addEventListener('click',e=>{if(e.target.closest('.db6-link,.db6x-save,#db6LayoutBtn'))setTimeout(schedule,80)},true);
})();
