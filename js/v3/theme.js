/* Koruk Asistan — V3 Merkezi Tema Motoru (TEK KONTROL NOKTASI)
 * Kullanım: KorukTheme.set({mode:'dark'|'light'|'auto', accent:'#3b82f6'|'mavi'|null, density:'compact'|'normal'|'roomy', font:.9|1|1.12})
 * Ayarlar ekranı, ilk açılış ve yönetici paneli yalnız bu API'yi çağırır; hiçbir modül renk/tema kodu yazmaz.
 * Yalnız <html> sınıfı/özniteliği ve CSS değişkenleri değişir; veri katmanına dokunmaz. */
(function(g){
'use strict';
if(g.KorukTheme&&g.KorukTheme.__v3)return; // zaten v3 motoru kurulu; eski basit KorukTheme (varsa) burada devralınır
var D=document,R=D.documentElement,K={mode:'ka-theme',accent:'ka-accent',density:'ka-density',font:'ka-font-scale'};
var PRESETS={altin:'#f2b600',yesil:'#2fbf6a',mavi:'#3b82f6',mor:'#7c3aed',kirmizi:'#ef4b5f',turkuaz:'#14b8a6'};
var DENS={compact:.88,normal:1,roomy:1.12};
function rd(k){try{return localStorage.getItem(k)}catch(e){return null}}
function wr(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,String(v))}catch(e){}}
function lum(h){var m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return .5;var n=parseInt(m[1],16),c=[n>>16&255,n>>8&255,n&255].map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function onColor(h){var d=contrast(h,'#1b1812'),w=contrast(h,'#ffffff');return d>=w?'#1b1812':'#ffffff'}
function norm(a){if(!a)return null;if(PRESETS[a])return PRESETS[a];return /^#[0-9a-f]{6}$/i.test(a)?a.toLowerCase():null}
var st={mode:'auto',accent:null,density:'normal',font:1};
(function load(){var m=rd(K.mode);st.mode=m==='light'||m==='dark'?m:'auto';st.accent=norm(rd(K.accent));var d=rd(K.density);st.density=DENS[d]?d:'normal';var f=parseFloat(rd(K.font));st.font=f>=.85&&f<=1.3?f:1})();
var mq=g.matchMedia?g.matchMedia('(prefers-color-scheme: dark)'):null,own=false;
function resolved(){return st.mode==='auto'?(mq&&mq.matches?'dark':'light'):st.mode}
function apply(){own=true;R.classList.add('ka-v3');R.setAttribute('data-theme',resolved());R.setAttribute('data-ka-theme-mode',st.mode);
  if(st.accent){R.style.setProperty('--v3-accent',st.accent);R.style.setProperty('--v3-on-accent',onColor(st.accent))}else{R.style.removeProperty('--v3-accent');R.style.removeProperty('--v3-on-accent')}
  R.style.setProperty('--v3-density',DENS[st.density]);R.style.setProperty('--v3-font',st.font);
  try{var meta=D.querySelector('meta[name="theme-color"]');if(meta&&D.body){meta.setAttribute('content',getComputedStyle(R).getPropertyValue('--ka-header-bg').trim()||'#000')}}catch(e){}
  try{var dark=resolved()==='dark';D.querySelectorAll('[data-ka-theme-toggle]').forEach(function(btn){if(!btn.querySelector('svg')){btn.textContent=dark?'☀️':'🌙'}btn.setAttribute('aria-pressed',dark?'true':'false');btn.setAttribute('aria-label',dark?'Açık temaya geç':'Koyu temaya geç');btn.title=dark?'Açık temaya geç':'Koyu temaya geç'})}catch(e){}
  own=false;try{g.dispatchEvent(new CustomEvent('koruk:theme-change',{detail:get()}))}catch(e){}}
function get(){return{mode:st.mode,resolved:resolved(),accent:st.accent,density:st.density,font:st.font}}
function set(p){p=p||{};if('mode' in p)st.mode=p.mode==='light'||p.mode==='dark'?p.mode:'auto';if('accent' in p)st.accent=norm(p.accent);if(p.density&&DENS[p.density])st.density=p.density;if('font' in p&&p.font>=.85&&p.font<=1.3)st.font=+p.font;
  wr(K.mode,st.mode==='auto'?null:st.mode);wr(K.accent,st.accent);wr(K.density,st.density==='normal'?null:st.density);wr(K.font,st.font===1?null:st.font);apply();return get()}
function reset(){return set({mode:'auto',accent:null,density:'normal',font:1})}
function toggle(){return set({mode:resolved()==='dark'?'light':'dark'})}
/* WCAG kontrast oranı (iki #rrggbb) */
function contrast(a,b){var x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);return (hi+.05)/(lo+.05)}
if(mq&&mq.addEventListener)mq.addEventListener('change',function(){if(st.mode==='auto')apply()});
/* uygulamanın eski tema düğmesi data-theme'i değiştirirse durumu eşitle */
try{new MutationObserver(function(){if(own)return;var t=R.getAttribute('data-theme');if((t==='light'||t==='dark')&&t!==resolved()){st.mode=t;wr(K.mode,t);R.setAttribute('data-ka-theme-mode',t);g.dispatchEvent(new CustomEvent('koruk:theme-change',{detail:get()}))}}).observe(R,{attributes:true,attributeFilter:['data-theme']})}catch(e){}
g.KorukTheme={get:get,set:set,reset:reset,toggle:toggle,presets:PRESETS,contrast:contrast,apply:apply,__v3:true};
apply();
})(window);
