/* Koruk Asistan — Hava durumu kartı: "Gökyüzü Camı"
 * Ana Sayfa hero'sundaki hava durumu kartını (#khWeather) canlı, hava durumuna göre değişen gökyüzü kartına çevirir.
 * Kartın içeriğini (gökyüzü katmanı + konum + büyük sıcaklık + nem/rüzgâr/basınç) SchoolLiveStatus.weatherCard() üretir;
 * bu dosya yalnızca onu #khWeather'a yerleştirir ve veri/saat değiştikçe yeniler. Görünüm tamamen merkezi CSS'tedir:
 * css/design-system-base.css → TEMA MERKEZİ --ka-wx-* belirteçleri + "HAVA DURUMU — GÖKYÜZÜ CAMI" kuralları.
 * Dashboard'a dokunmaz (dashboard.js kartı yazmaya devam eder, eski çocukları CSS gizler). Kartı tıklayınca açılan pencere
 * SchoolLiveStatus.openWeather()'dır. Kapatmak için: localStorage['ka-skin']='off' (sade eski kart görünür).
 */
(function(global){
'use strict';
if(global.KorukHavaDurumuSkin)return;
var OFF=false;try{OFF=localStorage.getItem('ka-skin')==='off'}catch(_){}
if(OFF){global.KorukHavaDurumuSkin={enabled:false};return}
var D=document,raf=0;
/* ekran dışındaki kartın animasyonunu duraklat (pil / işlemci) */
var IO=global.IntersectionObserver?new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('is-paused',!e.isIntersecting)})},{rootMargin:'160px'}):null;
function decorate(){
  var card=D.getElementById('khWeather'),L=global.SchoolLiveStatus;
  if(!card||!L||typeof L.weatherCard!=='function')return;
  try{
    var m=L.weatherCard();
    if(card.__wxSig===m.sig&&card.querySelector('.ka-wx-body'))return;
    card.__wxSig=m.sig;
    Array.prototype.slice.call(card.querySelectorAll('.ka-wx-sky,.ka-wx-body')).forEach(function(n){n.remove()});
    card.className=card.className.replace(/(^|\s)(ka-wx|k-(?:sun|pc|cloud|rain|storm|snow|fog)|is-day|is-night)(?=\s|$)/g,' ').replace(/\s+/g,' ').trim()+' '+m.cls;
    card.insertAdjacentHTML('afterbegin',m.html);
    card.setAttribute('aria-label',m.label);
    if(IO&&!card.__wxIO){card.__wxIO=1;IO.observe(card)}
  }catch(e){try{console.warn('[KorukHavaDurumuSkin]',e)}catch(_){}}
}
function schedule(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;decorate()})}
function boot(){
  decorate();
  try{new MutationObserver(schedule).observe(D.body,{childList:true,subtree:true})}catch(_){}
  global.addEventListener('koruk:module-ready',schedule);
  global.addEventListener('koruk:school-live-tick',schedule);
  try{global.AppStore&&global.AppStore.subscribe&&global.AppStore.subscribe('ui.weather',schedule)}catch(_){}
}
global.KorukHavaDurumuSkin={enabled:true,refresh:decorate};
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
