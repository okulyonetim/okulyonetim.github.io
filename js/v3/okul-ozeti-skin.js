/* Koruk Asistan — Okul Özeti Glassmorphism Kartları (V4)
 * SVG sahne yerine renkli degrade arka planlar + büyük emoji ikonlar.
 * Kapatmak için: localStorage['ka-skin']='off'.
 */
(function(global){
'use strict';
if(global.KorukOkulOzetiSkin)return;
var OFF=false;try{OFF=localStorage.getItem('ka-skin')==='off'}catch(_){}
if(OFF){global.KorukOkulOzetiSkin={enabled:false};return}
var D=document;
function $(s,r){return(r||D).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s))}

/* ---- Tema tespiti ---- */
function isDark(){
  var t=D.documentElement.getAttribute('data-theme');
  if(t==='dark')return true;
  if(t==='light')return false;
  return global.matchMedia&&global.matchMedia('(prefers-color-scheme:dark)').matches;
}

/* ---- Kart renk konfigürasyonu ---- */
var CARDS={
  ogretmen:{
    icon:'👨‍🏫',
    lightBg:'linear-gradient(145deg,#dbeafe,#eff6ff)',
    darkBg:'linear-gradient(145deg,#1a2a5e,#1e3a7a)',
    lightBorder:'rgba(59,130,246,.20)',
    darkBorder:'rgba(99,149,255,.16)',
    lightShadow:'0 4px 24px rgba(59,130,246,.14)',
    darkShadow:'0 8px 40px rgba(0,0,0,.45)',
    lightText:'#1e3a8a',
    darkText:'#e0f2fe',
    lightMuted:'rgba(30,58,138,.60)',
    darkMuted:'rgba(224,242,254,.55)',
    lightOrb:'rgba(59,130,246,.12)',
    darkOrb:'rgba(96,165,250,.12)'
  },
  ogrenci:{
    icon:'👨‍👩‍👧‍👦',
    lightBg:'linear-gradient(145deg,#d1fae5,#ecfdf5)',
    darkBg:'linear-gradient(145deg,#0d2e2e,#0f3d35)',
    lightBorder:'rgba(16,185,129,.20)',
    darkBorder:'rgba(52,211,153,.16)',
    lightShadow:'0 4px 24px rgba(16,185,129,.14)',
    darkShadow:'0 8px 40px rgba(0,0,0,.45)',
    lightText:'#065f46',
    darkText:'#d1fae5',
    lightMuted:'rgba(6,95,70,.60)',
    darkMuted:'rgba(209,250,229,.55)',
    lightOrb:'rgba(16,185,129,.12)',
    darkOrb:'rgba(52,211,153,.12)'
  },
  sinif:{
    icon:'🏫',
    lightBg:'linear-gradient(145deg,#fef3c7,#fffbeb)',
    darkBg:'linear-gradient(145deg,#2a1a00,#3d2800)',
    lightBorder:'rgba(245,158,11,.24)',
    darkBorder:'rgba(251,191,36,.16)',
    lightShadow:'0 4px 24px rgba(245,158,11,.16)',
    darkShadow:'0 8px 40px rgba(0,0,0,.45)',
    lightText:'#78350f',
    darkText:'#fef3c7',
    lightMuted:'rgba(120,53,15,.60)',
    darkMuted:'rgba(254,243,199,.55)',
    lightOrb:'rgba(245,158,11,.14)',
    darkOrb:'rgba(251,191,36,.12)'
  },
  servis:{
    icon:'🚌',
    lightBg:'linear-gradient(145deg,#ffe4e6,#fff1f2)',
    darkBg:'linear-gradient(145deg,#2a0a14,#3d0f1e)',
    lightBorder:'rgba(239,68,68,.20)',
    darkBorder:'rgba(248,113,113,.16)',
    lightShadow:'0 4px 24px rgba(239,68,68,.14)',
    darkShadow:'0 8px 40px rgba(0,0,0,.45)',
    lightText:'#881337',
    darkText:'#ffe4e6',
    lightMuted:'rgba(136,19,55,.60)',
    darkMuted:'rgba(255,228,230,.55)',
    lightOrb:'rgba(239,68,68,.12)',
    darkOrb:'rgba(248,113,113,.12)'
  }
};

/* ---- Karta glassmorphism uygula ---- */
function applyGlass(card,cfg){
  var dark=isDark();
  /* Arka plan */
  card.style.setProperty('background',dark?cfg.darkBg:cfg.lightBg,'important');
  card.style.setProperty('border-color',dark?cfg.darkBorder:cfg.lightBorder,'important');
  card.style.setProperty('box-shadow',dark?cfg.darkShadow:cfg.lightShadow,'important');
  /* Metin renkleri */
  var fg=dark?cfg.darkText:cfg.lightText;
  var muted=dark?cfg.darkMuted:cfg.lightMuted;
  card.style.setProperty('color',fg,'important');
  var small=$('small',card);
  if(small)small.style.setProperty('color',muted,'important');
  var b=$(':scope>b',card)||$('b',card);
  if(b)b.style.setProperty('color',fg,'important');
  var meta=$('.ka-school-summary-meta',card);
  if(meta)meta.style.setProperty('color',muted,'important');
  /* İkon kutusu */
  var icon=$('.ka-school-summary-icon',card);
  if(icon){
    icon.style.setProperty('background',dark?'rgba(255,255,255,.10)':'rgba(255,255,255,.70)','important');
    icon.style.setProperty('border-color',dark?'rgba(255,255,255,.14)':'rgba(255,255,255,.85)','important');
    icon.style.setProperty('box-shadow','0 2px 8px rgba(0,0,0,.08)','important');
    icon.style.setProperty('color',fg,'important');
  }
  /* Dekoratif orb (::after pseudo-element yerine data attr ile) */
  card.style.setProperty('--ka-card-orb',dark?cfg.darkOrb:cfg.lightOrb,'');
}

/* ---- Kartlara emoji ikonu ekle (sadece bir kez) ---- */
function addEmoji(card,cfg){
  if($('[data-sk-card]',card))return;
  /* Büyük dekoratif emoji — sağ üst köşe */
  var em=D.createElement('div');
  em.setAttribute('data-sk-card','1');
  em.setAttribute('aria-hidden','true');
  em.style.cssText='position:absolute;right:10px;top:10px;font-size:36px;line-height:1;opacity:.18;pointer-events:none;user-select:none;z-index:0;filter:saturate(0.5)';
  em.textContent=cfg.icon;
  card.style.position='relative';
  card.insertBefore(em,card.firstChild);
  card.classList.add('sk-has-scene');
}

/* ---- Ana döngü ---- */
function decorate(){
  $$('.ka-school-summary-card').forEach(function(c){
    var t=String(($('small',c)||{}).textContent||'').toLocaleUpperCase('tr');
    var cfg=/ÖĞRETMEN/.test(t)?CARDS.ogretmen
            :/ÖĞRENCİ/.test(t)?CARDS.ogrenci
            :/SINIF/.test(t)?CARDS.sinif
            :/SERV/.test(t)?CARDS.servis
            :null;
    if(!cfg)return;
    addEmoji(c,cfg);
    applyGlass(c,cfg);
  });
}

/* ---- Tema değişikliğini izle ---- */
function watchTheme(){
  var obs=new MutationObserver(function(muts){
    muts.forEach(function(m){if(m.attributeName==='data-theme')decorate()});
  });
  obs.observe(D.documentElement,{attributes:true,attributeFilter:['data-theme']});
  try{global.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',decorate)}catch(_){}
}

/* ---- DOM değişikliklerini izle (kartlar sonradan yüklenebilir) ---- */
var raf=0;
function boot(){
  D.documentElement.classList.add('ka-skin3');
  decorate();
  watchTheme();
  try{
    new MutationObserver(function(){
      if(raf)return;
      raf=requestAnimationFrame(function(){raf=0;decorate()});
    }).observe(D.body,{childList:true,subtree:true});
  }catch(e){}
}

global.KorukOkulOzetiSkin={enabled:true,refresh:decorate};
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
