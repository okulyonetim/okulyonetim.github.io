/* ====================================================================
   KORUK ASİSTAN — MOBİL ÜST BAR KURUMSAL BAŞLIK
   Tek okul logosu, büyük harf okul adı + canlı sıcaklık ve çıkış onayı.
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
      .koruk-topbar .topbar-brand{display:none!important}
      .koruk-mobile-school-logo{display:none!important}
      .koruk-topbar #korukTopbarSchoolLogo{
        width:42px!important;height:42px!important;min-width:42px!important;
        display:grid!important;place-items:center!important;margin:0 3px 0 0!important;
        padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important
      }
      .koruk-topbar #korukTopbarSchoolLogo img{
        width:40px!important;height:40px!important;display:block!important;object-fit:contain!important;
        border-radius:50%!important;background:#fff!important;box-shadow:0 2px 8px rgba(20,90,70,.12)!important
      }
      .koruk-topbar-page{
        display:flex!important;flex-direction:column!important;justify-content:center!important;
        min-width:0!important;padding-left:5px!important;margin-left:0!important;border-left:0!important
      }
      .koruk-topbar-page>strong{
        font-size:13.5px!important;line-height:1.15!important;font-weight:850!important;
        color:var(--khdr-text)!important;letter-spacing:-.025em!important;text-transform:uppercase!important
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
      .koruk-topbar #topbarAvatar{
        width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;
        padding:0!important;border:0!important;border-radius:10px!important;background:transparent!important;
        box-shadow:none!important;overflow:hidden!important
      }
      .koruk-topbar #topbarAvatar img{
        width:38px!important;height:38px!important;display:block!important;object-fit:cover!important;
        border-radius:10px!important;background:transparent!important
      }
    }
    @media(max-width:390px){
      .koruk-topbar #korukTopbarSchoolLogo{width:39px!important;height:39px!important;min-width:39px!important}
      .koruk-topbar #korukTopbarSchoolLogo img{width:37px!important;height:37px!important}
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

function eskiFazlaLogoTemizle(top){
  top.querySelectorAll('.koruk-mobile-school-logo').forEach(el=>el.remove());
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
  eskiFazlaLogoTemizle(top);
  const page = $('.koruk-topbar-page',top);
  if(!page) return false;

  metaKur(page);

  const baslik = $('#korukTopbarPage',page);
  if(baslik && anaSayfaMi() && baslik.textContent !== 'KORUK İLK-ORTAOKULU'){
    baslik.textContent = 'KORUK İLK-ORTAOKULU';
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
