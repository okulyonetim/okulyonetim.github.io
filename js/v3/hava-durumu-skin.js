/* Koruk Asistan — Canlı Hava Durumu sahnesi (üretime uygulanan üçüncü V3 parçası)
 * Yalnızca Ana Sayfa hero'sundaki hava durumu kartını (#khWeather) süsler; menü, zil
 * kartı, bannerlar, Okul Özeti kartları gibi diğer V3 görsellerine DOKUNMAZ.
 * Veri/iş mantığına dokunmaz, yalnızca görsel katman ekler. Kapatmak için: localStorage['ka-skin']='off'.
 * Kaynağı: js/v3/scene-skin.js'deki wxSvg()/classifyWx()/wxState()/wxApply() fonksiyonlarının
 * birebir aynısı (gerçek sıcaklık/hal metnini #khWeather kartının kendi DOM'undan okur;
 * ayrı bir veri kaynağı kullanmaz).
 */
(function(global){
'use strict';
if(global.KorukHavaDurumuSkin)return;
var OFF=false;try{OFF=localStorage.getItem('ka-skin')==='off'}catch(_){}
if(OFF){global.KorukHavaDurumuSkin={enabled:false};return}
var D=document;
function $(s,r){return(r||D).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s))}
function hourNow(){var o=global.__KORUK_SKIN_HOUR;if(typeof o==='number')return o;var d=new Date();return d.getHours()+d.getMinutes()/60}
/* ---- sahne kütüphanesi (scene-skin.js ile birebir aynı üretim fonksiyonları) ---- */
function T(x,y,z,d){return '<g transform="translate('+x+' '+y+') scale('+z+')"><ellipse cx="2" cy="1" rx="14" ry="2.6" fill="#0003"/><g class="sway" style="animation-delay:'+d+'s"><path d="M-3 0Q-2.4-14-3.6-27H3.6Q2.4-14 3 0z" fill="#6b4a2b"/><path d="M.4 0Q1-14 .4-27H3.6Q2.4-14 3 0z" fill="#4e351d"/><path d="M-1-15L-9-26M1-13L8-23" stroke="#6b4a2b" stroke-width="2.4" stroke-linecap="round"/><circle cx="-10" cy="-30" r="9" fill="var(--t2)"/><circle cx="10" cy="-30" r="9.5" fill="var(--t2)"/><circle cy="-39" r="11.5" fill="var(--t1)"/><circle cx="-4" cy="-27" r="9" fill="var(--t1)"/><circle cx="6" cy="-25" r="8" fill="var(--t1)"/><circle cx="-4" cy="-43" r="6" fill="var(--t3)" opacity=".75"/><circle cx="8" cy="-34" r="4.5" fill="var(--t3)" opacity=".7"/><circle cx="-12" cy="-33" r="4" fill="var(--t3)" opacity=".6"/></g></g>'}
var WX={sun:['Güneşli',24,'Rüzgâr 8 km/s · Nem %40','☀️'],pc:['Parçalı bulutlu',16,'Rüzgâr 12 km/s · Nem %58','⛅'],cloud:['Kapalı',14,'Rüzgâr 14 km/s · Nem %66','☁️'],rain:['Yağmurlu',11,'Rüzgâr 18 km/s · Nem %84','🌧️'],storm:['Gök gürültülü sağanak',10,'Rüzgâr 32 km/s · Nem %90','⛈️'],snow:['Karlı',-1,'Rüzgâr 10 km/s · Nem %88','❄️'],fog:['Sisli',7,'Rüzgâr 3 km/s · Nem %95','🌫️']},
  WP={sun:[['#3aa7ee','#cdeeff'],['#0b1226','#1d2b52'],['#fff','#aab']],pc:[['#6fb0e0','#dcedf8'],['#121a33','#2a3556'],['#fff','#5a6280']],cloud:[['#8fa2b3','#c7d0d8'],['#1a2030','#343b4d'],['#e8edf1','#4a5268']],rain:[['#5d7488','#9fb0bd'],['#10151f','#273041'],['#b9c3cc','#3c4456']],storm:[['#3d4a5c','#6b7787'],['#070a12','#1a2030'],['#8a94a0','#2c3342']],snow:[['#a9bccf','#eef3f8'],['#1b2438','#46526b'],['#f3f6f9','#7a869c']],fog:[['#b5bcc2','#dfe3e6'],['#232831','#4a505c'],['#e6e9eb','#5a606c']]};
function CD(x,y,z,d){d=d||0;return '<g transform="translate('+x+' '+y+') scale('+z+')" class="cld wcld" style="fill:var(--wcl);animation-delay:'+d+'s"><ellipse rx="16" ry="6"/><ellipse cx="-7" cy="-5" rx="8" ry="6"/><ellipse cx="5" cy="-7" rx="9" ry="7"/></g>'}
function wxSvg(suf){suf=suf||'';var gId='skwg'+suf,s1Id='skws1'+suf,s2Id='skws2'+suf;
  var r='<defs><linearGradient id="'+gId+'" x1="0" y1="0" x2="0" y2="1"><stop id="'+s1Id+'" offset="0"/><stop id="'+s2Id+'" offset="1"/></linearGradient></defs><rect width="200" height="100" fill="url(#'+gId+')"/>',rays='',rn='',sn='';
  for(var a=0;a<8;a++){var z=a*Math.PI/4;rays+='<line x1="'+(150+Math.cos(z)*15).toFixed(1)+'" y1="'+(28+Math.sin(z)*15).toFixed(1)+'" x2="'+(150+Math.cos(z)*21).toFixed(1)+'" y2="'+(28+Math.sin(z)*21).toFixed(1)+'" stroke="#ffd54a" stroke-width="2" stroke-linecap="round"/>'}
  for(var i=0;i<14;i++){rn+='<line class="rn" x1="'+(8+i*14)+'" y1="0" x2="'+(5+i*14)+'" y2="7" stroke="#cfe3f5" stroke-width="1.3" style="animation-delay:-'+(i*.13).toFixed(2)+'s"/>'}
  for(i=0;i<12;i++){sn+='<circle class="sn" cx="'+(10+i*16)+'" cy="0" r="1.7" fill="#fff" style="animation-delay:-'+(i*.4).toFixed(1)+'s"/>'}
  r+='<g data-s="sun pc" data-d="d"><circle class="sun-glow" cx="150" cy="28" r="15" fill="#ffd54a"/><g class="spin" style="transform-origin:150px 28px">'+rays+'</g><circle cx="150" cy="28" r="11" fill="#ffd54a"/></g><g data-s="sun pc" data-d="n"><circle class="sun-glow" cx="150" cy="22" r="13" fill="#f1ead0"/><path d="M150 16a12 12 0 1 0 9 20a9 9 0 1 1-9-20z" fill="#f1ead0"/><circle class="win" cx="110" cy="14" r="1.2" fill="#fff"/><circle class="win w2" cx="180" cy="50" r="1.2" fill="#fff"/><circle class="win" cx="124" cy="40" r="1" fill="#fff"/></g>'+
  '<g data-s="pc">'+CD(110,34,1,-4)+CD(172,52,.8,-15)+'</g><g data-s="cloud rain storm snow fog">'+CD(90,26,1.3,-2)+CD(150,34,1.5,-11)+CD(190,20,1,-18)+'</g><g data-s="rain storm">'+rn+'</g><g data-s="snow">'+sn+'</g><g data-s="storm"><polygon class="bolt" points="120,30 108,52 116,52 108,74 130,46 121,46" fill="#ffe66d"/><polygon class="bolt bolt-far" points="168,22 158,42 165,42 157,62 177,38 169,38" fill="#ffe66d" opacity=".75"/></g><g data-s="fog"><rect class="fgb" x="60" y="52" width="150" height="8" rx="4" fill="#fff" opacity=".5"/><rect class="fgb" style="animation-delay:-3s" x="20" y="66" width="170" height="8" rx="4" fill="#fff" opacity=".4"/></g>'+
  '<path d="M0 84Q50 68 110 80T200 74V100H0z" fill="var(--h1)"/>'+T(176,96,.9,0)+T(118,98,.65,1.2)+'<rect x="60" y="84" width="26" height="16" fill="var(--bwall)"/><path d="M56 84L73 74L90 84z" fill="var(--roof)"/>';return r}
/* ---- motor (scene-skin.js'deki wxApply() sistemiyle birebir aynı) ---- */
function classifyWx(t){t=(t||'').toLocaleLowerCase('tr');
  if(/⛈|🌩|fırtına|gök gürül/.test(t))return'storm';if(/❄|🌨|kar\b|karlı/.test(t))return'snow';if(/🌫|sis/.test(t))return'fog';if(/🌧|🌦|yağmur|yağış|sağanak|çise/.test(t))return'rain';
  if(/☁|kapalı|bulutlu/.test(t)&&!/parçalı|az bulut/.test(t))return'cloud';if(/☀|güneşli|açık/.test(t))return'sun';return'pc'}
function wxState(card){var e=$('.kh-weather-emoji',card),tx=((e&&e.textContent)||'')+' '+(($('.kh-live-main small',card)||{}).textContent||'');return classifyWx(tx)}
function wxApply(){var card=$('#khWeather');if(!card)return;var w=$('.sk-wx',card);
  if(!w){w=D.createElement('div');w.className='sk sk-wx';w.setAttribute('data-sk-wx','1');w.setAttribute('aria-hidden','true');w.innerHTML='<svg class="on" viewBox="0 0 200 100" preserveAspectRatio="xMaxYMid slice">'+wxSvg()+'</svg>';card.insertBefore(w,card.firstChild)}
  var state=wxState(card),h=Math.floor(hourNow()),night=h<6||h>=19,key=state+(night?'n':'d');if(w.getAttribute('data-k')===key)return;w.setAttribute('data-k',key);
  var p=WP[state]||WP.pc,c=p[night?1:0],s1=$('#skws1',w),s2=$('#skws2',w),sv=$('svg',w);if(s1)s1.setAttribute('stop-color',c[0]);if(s2)s2.setAttribute('stop-color',c[1]);sv.style.setProperty('--wcl',p[2][night?1:0]);
  $$('[data-s]',w).forEach(function(g){g.style.opacity=(g.getAttribute('data-s').split(' ').indexOf(state)>-1&&(!g.getAttribute('data-d')||g.getAttribute('data-d')===(night?'n':'d')))?1:0})}
/* ---- yalnızca #khWeather'a sahne ekler; menü/zil/banner/karta DOKUNMAZ ---- */
var IO=global.IntersectionObserver?new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('sk-pause',!e.isIntersecting)})},{rootMargin:'160px'}):null;
function watch(){if(!IO)return;$$('[data-sk-wx]').forEach(function(el){if(!el.__skw){el.__skw=1;IO.observe(el)}})}
var raf=0,ACT=true;
function decorate(){if(!ACT)return;try{wxApply();watch()}catch(e){try{console.warn('[KorukHavaDurumuSkin]',e)}catch(_){}}}
function boot(){D.documentElement.classList.add('ka-skin3');decorate();
  try{new MutationObserver(function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;decorate()})}).observe(D.body,{childList:true,subtree:true})}catch(e){}}
global.KorukHavaDurumuSkin={enabled:true,refresh:decorate};
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
