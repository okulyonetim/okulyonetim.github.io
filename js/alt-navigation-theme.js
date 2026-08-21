/* Koruk Asistan — Alt navigasyon menü renkleri / kişiselleştirme */
(function(){
'use strict';
if(window.__ALT_NAV_THEME_JS__)return;window.__ALT_NAV_THEME_JS__=true;
const PALETTE=['#7c5ce7','#2e7bd8','#1a9a72','#dc7b16','#d65378','#168ba0','#8b5cf6','#0f9f8f','#e36f44','#b94fc7'];
const SOFT_LIGHT=['#f0ebff','#eaf3ff','#e9f8f1','#fff2df','#fff0f4','#e9f8fb','#f3edff','#e7f8f4','#fff0e9','#f9ebfb'];
const SOFT_DARK=['#2b2147','#172f4b','#153a2e','#3c2c18','#422431','#153841','#312451','#123832','#41271f','#3c2141'];
const STORE='kh-alt-nav-colors-v2';
function norm(s){return String(s||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr')}
function read(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch(_){return{}}}
function write(v){try{localStorage.setItem(STORE,JSON.stringify(v))}catch(_){}}
function keyOf(el,scope){return scope+':'+norm(el.dataset.tab||el.dataset.group||el.getAttribute('aria-label')||el.textContent||'item')}
function candidates(root){if(!root)return[];let a=[...root.querySelectorAll('button,a,[role="button"]')];a=a.filter(el=>!el.closest('.bottom-nav')&&!el.matches('[data-an-color-ignore]'));return [...new Set(a)]}
function isDark(){return document.documentElement.getAttribute('data-theme')==='dark'||document.body?.getAttribute('data-theme')==='dark'}
function applyOne(el,i,scope){const map=read(),key=keyOf(el,scope),idx=Number.isInteger(map[key])?map[key]:i%PALETTE.length;el.dataset.anColorKey=key;el.style.setProperty('--an-item',PALETTE[idx]);el.style.setProperty('--an-item-soft',(isDark()?SOFT_DARK:SOFT_LIGHT)[idx]);el.classList.add('an-themed-item')}
function apply(){const grid=document.querySelector('.an-grid-katman');candidates(grid).forEach((el,i)=>applyOne(el,i,'grid'));const list=document.querySelector('.an-liste-katman');candidates(list).forEach((el,i)=>applyOne(el,i,'list'))}
function paletteFor(el){document.getElementById('anColorPalette')?.remove();const ov=document.createElement('div');ov.id='anColorPalette';ov.className='an-color-overlay';const p=document.createElement('div');p.className='an-color-panel';p.innerHTML='<div class="an-color-head"><b>Menü rengini seç</b><button type="button" data-close>×</button></div><div class="an-color-grid"></div><button type="button" class="an-color-reset">Varsayılana dön</button>';PALETTE.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='an-color-swatch';b.style.background=c;b.setAttribute('aria-label','Renk '+(i+1));b.onclick=()=>{const map=read();map[el.dataset.anColorKey]=i;write(map);ov.remove();apply()};p.querySelector('.an-color-grid').append(b)});p.querySelector('[data-close]').onclick=()=>ov.remove();p.querySelector('.an-color-reset').onclick=()=>{const map=read();delete map[el.dataset.anColorKey];write(map);ov.remove();apply()};ov.onclick=e=>{if(e.target===ov)ov.remove()};ov.append(p);document.body.append(ov)}
let timer=null,start=null;
document.addEventListener('pointerdown',e=>{const el=e.target.closest?.('.an-themed-item');if(!el)return;start={x:e.clientX,y:e.clientY,el};timer=setTimeout(()=>{timer=null;paletteFor(el)},650)},true);
document.addEventListener('pointermove',e=>{if(!start)return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>12){clearTimeout(timer);timer=null;start=null}},true);
document.addEventListener('pointerup',()=>{clearTimeout(timer);timer=null;start=null},true);
document.addEventListener('pointercancel',()=>{clearTimeout(timer);timer=null;start=null},true);
const mo=new MutationObserver(()=>requestAnimationFrame(apply));mo.observe(document.documentElement,{subtree:true,childList:true});new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});window.addEventListener('load',()=>setTimeout(apply,200));setInterval(apply,1200);
})();