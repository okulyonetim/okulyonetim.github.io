/* Koruk Asistan — alt navigasyon liste renk senkronu
   Alt menü satırları, çekirdeğin gerçek grup rengini devralır. */
(function(){
'use strict';
if(window.__AN_LIST_THEME__)return;window.__AN_LIST_THEME__=true;
function kaynaklariYukle(){
 if(!document.querySelector('link[data-onc-modern-style]')){const l=document.createElement('link');l.rel='stylesheet';l.href='css/odev-not-cizelgeleri-modern.css?v=1';l.setAttribute('data-onc-modern-style','1');document.head.appendChild(l)}
 if(!document.querySelector('script[data-onc-modern]')){const s=document.createElement('script');s.src='js/odev-not-cizelgeleri-modern.js?v=1';s.async=false;s.setAttribute('data-onc-modern','1');document.head.appendChild(s)}
}
function hexFromRgb(s){const m=String(s||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);if(!m)return'';return '#'+[m[1],m[2],m[3]].map(x=>Number(x).toString(16).padStart(2,'0')).join('')}
function uygula(){document.querySelectorAll('.an-liste-ogesi').forEach(row=>{const ico=row.querySelector('.an-oge-ikon');if(!ico)return;const c=ico.style.color||hexFromRgb(getComputedStyle(ico).color);if(!c)return;row.dataset.anColored='1';row.style.setProperty('--an-item-color',c);row.style.setProperty('border-color',`color-mix(in srgb, ${c} 30%, var(--an-line))`,'important');row.style.setProperty('background',`linear-gradient(100deg, color-mix(in srgb, ${c} 11%, var(--an-surface)) 0%, var(--an-surface) 46%)`,'important');row.style.setProperty('box-shadow',`inset 3px 0 0 ${c}, 0 5px 15px rgba(31,41,55,.07)`,'important');ico.style.setProperty('background',`color-mix(in srgb, ${c} 14%, transparent)`,'important');ico.style.setProperty('border-color',`color-mix(in srgb, ${c} 28%, transparent)`,'important')})}
const mo=new MutationObserver(()=>requestAnimationFrame(uygula));const baslat=()=>{kaynaklariYukle();const root=document.getElementById('altNavKatmanlar')||document.body;mo.observe(root,{subtree:true,childList:true});uygula()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat,{once:true});else baslat();document.addEventListener('click',e=>{if(e.target.closest?.('.an-grup-kart,.an-geri-btn'))setTimeout(uygula,40)},false);
})();