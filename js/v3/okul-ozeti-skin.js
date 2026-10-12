/* Koruk Asistan — Okul Özeti Glassmorphism (V6)
 * Tasarım artık design-system-base.css içinde CSS ile yönetilmektedir.
 * Bu dosya geriye dönük uyumluluk için boş çalışır.
 */
(function(global){
'use strict';
if(global.KorukOkulOzetiSkin)return;
global.KorukOkulOzetiSkin={enabled:true,refresh:function(){}};
return;
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

/* ---- Kart konfigürasyonu ----
 * dark: şeffaf cam yüzey + renkli accent glow
 * light: beyaz frosted cam + hafif renkli tint
 */
var CARDS={
  'is-teacher':{
    emoji:'👨‍🏫',
    /* light */
    lBg:'rgba(255,255,255,0.72)',
    lBorder:'rgba(59,130,246,0.22)',
    lShadow:'0 4px 24px rgba(59,130,246,0.12), 0 1px 0 rgba(255,255,255,0.9) inset',
    lIconBg:'rgba(59,130,246,0.12)',
    lIconBorder:'rgba(59,130,246,0.20)',
    lIconColor:'#2563eb',
    lText:'#1e3a8a',
    lMuted:'rgba(30,58,138,0.55)',
    lAccentOverlay:'rgba(59,130,246,0.06)',
    /* dark */
    dBg:'rgba(255,255,255,0.055)',
    dBorder:'rgba(96,165,250,0.18)',
    dShadow:'0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.07) inset',
    dIconBg:'rgba(96,165,250,0.15)',
    dIconBorder:'rgba(96,165,250,0.25)',
    dIconColor:'#93c5fd',
    dText:'#e0f2fe',
    dMuted:'rgba(224,242,254,0.5)',
    dAccentOverlay:'rgba(59,130,246,0.10)'
  },
  'is-student':{
    emoji:'👨‍👩‍👧‍👦',
    lBg:'rgba(255,255,255,0.72)',
    lBorder:'rgba(16,185,129,0.22)',
    lShadow:'0 4px 24px rgba(16,185,129,0.12), 0 1px 0 rgba(255,255,255,0.9) inset',
    lIconBg:'rgba(16,185,129,0.12)',
    lIconBorder:'rgba(16,185,129,0.20)',
    lIconColor:'#059669',
    lText:'#065f46',
    lMuted:'rgba(6,95,70,0.55)',
    lAccentOverlay:'rgba(16,185,129,0.06)',
    dBg:'rgba(255,255,255,0.055)',
    dBorder:'rgba(52,211,153,0.18)',
    dShadow:'0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.07) inset',
    dIconBg:'rgba(52,211,153,0.15)',
    dIconBorder:'rgba(52,211,153,0.25)',
    dIconColor:'#6ee7b7',
    dText:'#d1fae5',
    dMuted:'rgba(209,250,229,0.5)',
    dAccentOverlay:'rgba(16,185,129,0.10)'
  },
  'is-class':{
    emoji:'🏫',
    lBg:'rgba(255,255,255,0.72)',
    lBorder:'rgba(245,158,11,0.25)',
    lShadow:'0 4px 24px rgba(245,158,11,0.14), 0 1px 0 rgba(255,255,255,0.9) inset',
    lIconBg:'rgba(245,158,11,0.12)',
    lIconBorder:'rgba(245,158,11,0.22)',
    lIconColor:'#b45309',
    lText:'#78350f',
    lMuted:'rgba(120,53,15,0.55)',
    lAccentOverlay:'rgba(245,158,11,0.07)',
    dBg:'rgba(255,255,255,0.055)',
    dBorder:'rgba(251,191,36,0.18)',
    dShadow:'0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.07) inset',
    dIconBg:'rgba(251,191,36,0.15)',
    dIconBorder:'rgba(251,191,36,0.25)',
    dIconColor:'#fde68a',
    dText:'#fef3c7',
    dMuted:'rgba(254,243,199,0.5)',
    dAccentOverlay:'rgba(234,179,8,0.12)'
  },
  'is-service':{
    emoji:'🚌',
    lBg:'rgba(255,255,255,0.72)',
    lBorder:'rgba(239,68,68,0.22)',
    lShadow:'0 4px 24px rgba(239,68,68,0.12), 0 1px 0 rgba(255,255,255,0.9) inset',
    lIconBg:'rgba(239,68,68,0.12)',
    lIconBorder:'rgba(239,68,68,0.20)',
    lIconColor:'#dc2626',
    lText:'#881337',
    lMuted:'rgba(136,19,55,0.55)',
    lAccentOverlay:'rgba(239,68,68,0.06)',
    dBg:'rgba(255,255,255,0.055)',
    dBorder:'rgba(248,113,113,0.18)',
    dShadow:'0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.07) inset',
    dIconBg:'rgba(248,113,113,0.15)',
    dIconBorder:'rgba(248,113,113,0.25)',
    dIconColor:'#fca5a5',
    dText:'#ffe4e6',
    dMuted:'rgba(255,228,230,0.5)',
    dAccentOverlay:'rgba(239,68,68,0.10)'
  }
};

/* ---- Kart tipini sınıfa göre bul ---- */
function getCfg(card){
  var keys=Object.keys(CARDS);
  for(var i=0;i<keys.length;i++){
    if(card.classList.contains(keys[i]))return CARDS[keys[i]];
  }
  /* fallback: small etiket metni */
  var t=String(($('small',card)||{}).textContent||'').toLocaleUpperCase('tr');
  if(/ÖĞRETMEN/.test(t))return CARDS['is-teacher'];
  if(/ÖĞRENCİ/.test(t))return CARDS['is-student'];
  if(/SINIF/.test(t))return CARDS['is-class'];
  if(/SERV/.test(t))return CARDS['is-service'];
  return null;
}

/* ---- Glassmorphism uygula ---- */
function applyGlass(card,cfg){
  var dk=isDark();
  var sp=card.style.setProperty.bind(card.style);
  /* Cam yüzey */
  sp('background',dk?cfg.dBg:cfg.lBg,'important');
  sp('backdrop-filter','blur(20px) saturate(1.6)','important');
  sp('-webkit-backdrop-filter','blur(20px) saturate(1.6)','important');
  sp('border-color',dk?cfg.dBorder:cfg.lBorder,'important');
  sp('box-shadow',dk?cfg.dShadow:cfg.lShadow,'important');
  /* Accent overlay — ::before ile değişken üzerinden */
  sp('--sk-accent-overlay',dk?cfg.dAccentOverlay:cfg.lAccentOverlay,'');
  /* Metin */
  var fg=dk?cfg.dText:cfg.lText;
  var muted=dk?cfg.dMuted:cfg.lMuted;
  sp('color',fg,'important');
  var sm=$('small',card);if(sm)sm.style.setProperty('color',muted,'important');
  var b=$(':scope>b',card)||$('b',card);if(b)b.style.setProperty('color',fg,'important');
  var meta=$('.ka-school-summary-meta',card);if(meta)meta.style.setProperty('color',muted,'important');
  /* İkon kutusu */
  var icon=$('.ka-school-summary-icon',card);
  if(icon){
    icon.style.setProperty('background',dk?cfg.dIconBg:cfg.lIconBg,'important');
    icon.style.setProperty('border','1px solid '+(dk?cfg.dIconBorder:cfg.lIconBorder),'important');
    icon.style.setProperty('box-shadow',dk?'none':'0 2px 8px rgba(0,0,0,0.06)','important');
    icon.style.setProperty('color',dk?cfg.dIconColor:cfg.lIconColor,'important');
  }
}

/* ---- Emoji dekorasyon ekle (bir kez) ---- */
function addEmoji(card,cfg){
  if($('[data-sk-emoji]',card))return;
  var em=D.createElement('div');
  em.setAttribute('data-sk-emoji','1');
  em.setAttribute('aria-hidden','true');
  em.style.cssText='position:absolute;right:8px;top:8px;font-size:48px;line-height:1;opacity:0.10;pointer-events:none;user-select:none;z-index:0;';
  em.textContent=cfg.emoji;
  card.style.position='relative';
  card.style.overflow='hidden';
  card.insertBefore(em,card.firstChild);
  card.classList.add('sk-glass');
}

/* ---- Grid arka planı (glassmorphism için zemin şart) ---- */
function styleGrid(){
  var dk=isDark();
  $$('.ka-school-summary-grid').forEach(function(g){
    if(dk){
      g.style.setProperty('background','linear-gradient(135deg,rgba(30,58,138,.55) 0%,rgba(6,78,59,.55) 50%,rgba(120,53,15,.55) 100%)','important');
      g.style.setProperty('border-radius','22px','important');
      g.style.setProperty('padding','10px','important');
    }else{
      g.style.setProperty('background','linear-gradient(135deg,rgba(219,234,254,.85) 0%,rgba(209,250,229,.85) 50%,rgba(254,243,199,.85) 100%)','important');
      g.style.setProperty('border-radius','22px','important');
      g.style.setProperty('padding','10px','important');
    }
    g.setAttribute('data-sk-grid','1');
  });
}

/* ---- Ana döngü ---- */
function decorate(){
  styleGrid();
  $$('.ka-school-summary-card').forEach(function(c){
    var cfg=getCfg(c);
    if(!cfg)return;
    addEmoji(c,cfg);
    applyGlass(c,cfg);
  });
}

/* ---- Tema değişimini izle ---- */
function watchTheme(){
  new MutationObserver(function(muts){
    muts.forEach(function(m){if(m.attributeName==='data-theme')decorate();});
  }).observe(D.documentElement,{attributes:true,attributeFilter:['data-theme']});
  try{global.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',decorate);}catch(_){}
}

/* ---- DOM değişimini izle (kartlar sonradan render edilebilir) ---- */
var raf=0;
function boot(){
  D.documentElement.classList.add('ka-skin3');
  decorate();
  watchTheme();
  try{
    new MutationObserver(function(){
      if(raf)return;
      raf=requestAnimationFrame(function(){raf=0;decorate();});
    }).observe(D.body,{childList:true,subtree:true});
  }catch(e){}
}

global.KorukOkulOzetiSkin={enabled:true,refresh:decorate};
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
