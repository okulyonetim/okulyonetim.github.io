/* ====================================================================
   KORUK ASİSTAN — MOBİL ÜST BAR KURUMSAL BAŞLIK
   Hamburger yerine okul logosu, okul adı + canlı sıcaklık ve çıkış onayı.
   ==================================================================== */
(function(){
'use strict';
if(window.__KORUK_MOBILE_HEADER_BRAND__) return;
window.__KORUK_MOBILE_HEADER_BRAND__ = true;

const mobilMi = () => window.matchMedia('(max-width:1023px)').matches;
const $ = (s,r=document) => r.querySelector(s);

function stilKur(){
  if($('#korukMobileHeaderBrandStyle')) return;
  const s = document.createElement('style');
  s.id = 'korukMobileHeaderBrandStyle';
  s.textContent = `
    @media(max-width:1023px){
      .koruk-topbar #topbarHamburger{display:none!important}
      .koruk-mobile-school-logo{
        width:42px;height:42px;min-width:42px;display:block;object-fit:cover;
        padding:2px;border:1px solid color-mix(in srgb,var(--khdr-green) 25%,var(--khdr-line));
        border-radius:50%;background:#fff;box-shadow:0 3px 10px rgba(20,90,70,.10)
      }
      .koruk-topbar-page{
        display:flex!important;flex-direction:column!important;justify-content:center!important;
        min-width:0!important;padding-left:5px!important;margin-left:0!important;border-left:0!important
      }
      .koruk-topbar-page>strong{
        font-size:13.5px!important;line-height:1.15!important;font-weight:850!important;
        color:var(--khdr-text)!important;letter-spacing:-.025em!important
      }
      .koruk-school-meta{
        display:flex!important;align-items:center!important;gap:7px!important;
        min-width:0;margin-top:3px;color:var(--khdr-muted);
        font:700 8.8px/1.1 Manrope,Inter,sans-serif;white-space:nowrap
      }
      .koruk-school-meta-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .koruk-school-meta-sep{width:3px;height:3px;border-radius:50%;background:var(--khdr-gold);flex:none}
      .koruk-school-meta #topbarHava{
        display:flex!important;align-items:center!important;gap:3px!important;
        width:auto!important;height:auto!important;min-width:0!important;padding:0!important;margin:0!important;
        border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;
        color:var(--khdr-green)!important;font:850 9.5px/1 Manrope,Inter,sans-serif!important
      }
      .koruk-school-meta #topbarHava span{display:inline!important;margin:0!important;font:inherit!important;color:inherit!important}
    }
    @media(max-width:390px){
      .koruk-mobile-school-logo{width:39px;height:39px;min-width:39px}
      .koruk-topbar-page>strong{font-size:12.6px!important}
      .koruk-school-meta{gap:5px;font-size:8.2px}
      .koruk-school-meta #topbarHava{font-size:9px!important}
    }
  `;
  document.head.appendChild(s);
}

function anaSayfaMi(){
  const p = $('.tab-panel.active');
  return !!p && p.id === 'tab-panel';
}

function logoKur(top,page){
  if($('.koruk-mobile-school-logo',top)) return;
  const img = document.createElement('img');
  img.className = 'koruk-mobile-school-logo';
  img.src = 'assets/icon-192.png';
  img.alt = 'Koruk İlk-Ortaokulu logosu';
  img.setAttribute('aria-label','Koruk İlk-Ortaokulu');
  if(page) top.insertBefore(img,page); else top.prepend(img);
}

function metaKur(page){
  let meta = $('.koruk-school-meta',page);
  if(!meta){
    meta = document.createElement('div');
    meta.className = 'koruk-school-meta';
    meta.innerHTML = '<span class="koruk-school-meta-label">Koruk Asistan</span><i class="koruk-school-meta-sep" aria-hidden="true"></i>';
    page.appendChild(meta);
  }

  const eskiAlt = Array.from(page.children).find(el => el.tagName === 'SPAN' && !el.closest('.koruk-school-meta'));
  if(eskiAlt) eskiAlt.style.display = 'none';

  const hava = document.getElementById('topbarHava');
  if(hava && hava.parentElement !== meta) meta.appendChild(hava);
}

function baslikKur(){
  if(!mobilMi()) return false;
  stilKur();
  const top = $('.topbar');
  if(!top) return false;
  top.classList.add('koruk-topbar');
  const page = $('.koruk-topbar-page',top);
  if(!page) return false;

  logoKur(top,page);
  metaKur(page);

  const baslik = $('#korukTopbarPage',page);
  if(baslik && anaSayfaMi() && baslik.textContent !== 'Koruk İlk-Ortaokulu'){
    baslik.textContent = 'Koruk İlk-Ortaokulu';
  }
  return true;
}

/* Profil menüsündeki Çıkış Yap eylemini onaydan sonra çalıştır. */
document.addEventListener('click',function(e){
  const btn = e.target.closest && e.target.closest('[data-kmenu="logout"]');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();
  if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  const tamam = window.confirm('Çıkış yapmak istediğinize emin misiniz?');
  if(!tamam) return;
  try{
    if(typeof window.cikisYap === 'function') window.cikisYap();
    else if(typeof cikisYap === 'function') cikisYap();
  }catch(err){ console.error('[Koruk] Çıkış işlemi başlatılamadı:',err); }
},true);

let raf = 0;
function yenile(){
  if(raf) return;
  raf = requestAnimationFrame(function(){ raf=0; baslikKur(); });
}

function baslat(){
  if(!mobilMi()) return;
  baslikKur();
  const root = document.body;
  if(root && !window.__KORUK_MOBILE_HEADER_OBSERVER__){
    window.__KORUK_MOBILE_HEADER_OBSERVER__ = true;
    new MutationObserver(yenile).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  }
  window.addEventListener('resize',yenile,{passive:true});
  window.addEventListener('hashchange',yenile);
  document.addEventListener('click',function(e){
    if(e.target.closest && e.target.closest('.nav-tab,[data-tab]')) setTimeout(yenile,30);
  },true);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',baslat,{once:true});
else baslat();
[150,500,1100,2000].forEach(ms=>setTimeout(baslikKur,ms));
})();
