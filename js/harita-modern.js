/* Koruk Asistan — Harita modern UI runtime */
(function(){
'use strict';
if(window.__KH_MAP_MODERN__)return;window.__KH_MAP_MODERN__=true;
function css(){if(document.querySelector('link[data-kh-map-modern]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='css/harita-modern.css?v=1';l.dataset.khMapModern='1';document.head.appendChild(l)}
function panelBul(){const map=document.getElementById('haritaKonteyner');if(!map)return null;return map.closest('.tab-panel')||map.parentElement}
function sinifla(el,cls){if(el&&!el.classList.contains(cls))el.classList.add(cls)}
function kur(){css();const map=document.getElementById('haritaKonteyner');if(!map)return false;const panel=panelBul();if(!panel)return false;sinifla(panel,'kh-map-modern');if(!panel.querySelector('.kh-map-hero')){const hero=document.createElement('section');hero.className='kh-map-hero';hero.innerHTML='<div class="kh-map-eyebrow">ULAŞIM & GÜZERGÂH</div><h2>Harita</h2><p>Servis güzergâhını oluşturun, konum arayın ve rota mesafesini anlık takip edin.</p>';const ph=panel.querySelector('.page-header');if(ph&&ph.nextSibling)ph.parentNode.insertBefore(hero,ph.nextSibling);else panel.insertBefore(hero,panel.firstChild)}
if(!panel.querySelector('.kh-map-hint')){const hint=document.createElement('div');hint.className='kh-map-hint';hint.innerHTML='<span>📍</span><span>Haritaya dokunarak güzergâh noktası ekleyin. Noktaları sürükleyerek rotayı güncelleyebilirsiniz.</span>';map.insertAdjacentElement('afterend',hint)}
['haritaAramaInput','haritaServisSec','haritaMesafe','haritaNoktaSayisi','haritaKaydetBtn','haritaAramaSonuc'].forEach(id=>{const el=document.getElementById(id);if(el){const p=el.parentElement;sinifla(p,'kh-map-card')}});
const arama=document.getElementById('haritaAramaInput');if(arama){arama.setAttribute('autocomplete','off');arama.setAttribute('inputmode','search');arama.setAttribute('aria-label','Haritada yer ara')}
const kaydet=document.getElementById('haritaKaydetBtn');if(kaydet)kaydet.setAttribute('aria-label','Güzergâhı kaydet');
const controls=[document.getElementById('haritaServisSec'),document.getElementById('haritaKaydetBtn')].filter(Boolean);if(controls.length===2&&controls[0].parentElement===controls[1].parentElement)sinifla(controls[0].parentElement,'kh-map-toolbar');
setTimeout(()=>{try{if(window.haritaOrnek&&typeof haritaOrnek.invalidateSize==='function')haritaOrnek.invalidateSize()}catch(_){}},120);return true}
function markerTemasiniKur(){if(typeof window.L==='undefined')return;if(typeof window.haritaOzelIkon==='function'&&!window.haritaOzelIkon.__khWrapped){const eski=window.haritaOzelIkon;const yeni=function(numara){return L.divIcon({className:'',html:`<div style="background:#0b7b5b;color:#fff;font-weight:800;font-size:12px;width:30px;height:30px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.28)">${numara}</div>`,iconSize:[30,30],iconAnchor:[15,15]})};yeni.__khWrapped=true;window.haritaOzelIkon=yeni;try{if(Array.isArray(window.haritaMarkerlar))haritaMarkerlar.forEach((m,i)=>m.setIcon(yeni(i+1)))}catch(_){}}
}
function dene(){if(kur())markerTemasiniKur()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',dene,{once:true});else dene();
[300,900,1800].forEach(ms=>setTimeout(dene,ms));
new MutationObserver(()=>{if(document.getElementById('haritaKonteyner'))requestAnimationFrame(dene)}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>{try{if(window.haritaOrnek)haritaOrnek.invalidateSize()}catch(_){}},{passive:true});
})();
