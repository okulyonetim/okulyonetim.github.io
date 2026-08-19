/* ================================================================
   DASHBOARD v2 INIT — WEB ONLY
   Mobil dashboard v4 ile masaüstü web v2 birbirinden kesin ayrılır.
   ================================================================ */
(function(){
'use strict';
if(window.__dashboardV2WebInit)return;
window.__dashboardV2WebInit=true;

const WEB_MQ=window.matchMedia('(min-width: 1024px)');
const $=(s,r=document)=>r.querySelector(s);
const el=id=>document.getElementById(id);

/* Breakpoint değişirse iki ayrı motor aynı oturumda karışmasın: temiz reload. */
if(typeof WEB_MQ.addEventListener==='function')WEB_MQ.addEventListener('change',()=>location.reload());

function mobilWebStilleriniKaldir(){
  ['css/dashboard-v2.css','css/web-shell-fix.css','css/mobil-dashboard.css'].forEach(path=>{
    const link=Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(x=>(x.getAttribute('href')||'').includes(path));
    if(link)link.disabled=true;
  });
}

if(!WEB_MQ.matches){
  mobilWebStilleriniKaldir();
  return;
}

document.documentElement.classList.add('web-shell-v2');
document.body.classList.add('web-shell-v2');
const mobilCss=Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(x=>(x.getAttribute('href')||'').includes('css/mobil-dashboard.css'));
if(mobilCss)mobilCss.disabled=true;

function navCollapsedBaslangic(){
  try{document.body.classList.toggle('nav-collapsed',localStorage.getItem('navCollapsed')==='1');}catch(_){ }
}

function sidebarToggleKur(){
  if(el('wsSidebarToggle'))return;
  const topbar=$('.topbar');if(!topbar)return;
  const btn=document.createElement('button');
  btn.id='wsSidebarToggle';btn.type='button';btn.title='Menüyü küçült / büyüt';btn.setAttribute('aria-label',btn.title);
  btn.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  btn.addEventListener('click',()=>{document.body.classList.toggle('nav-collapsed');try{localStorage.setItem('navCollapsed',document.body.classList.contains('nav-collapsed')?'1':'0');}catch(_){}});
  topbar.prepend(btn);
}

function temaToggleKur(){
  if(el('wsThemeToggle'))return;
  const topbar=$('.topbar');if(!topbar)return;
  const btn=document.createElement('button');btn.id='wsThemeToggle';btn.type='button';btn.className='topbar-bell ws-theme-toggle';btn.title='Açık / koyu tema';btn.setAttribute('aria-label',btn.title);
  const ikon=()=>document.documentElement.getAttribute('data-theme')==='dark'?'☀️':'🌙';btn.textContent=ikon();
  btn.addEventListener('click',()=>{
    const ana=el('temaDugmesi');
    if(ana)ana.click();
    else{
      const dark=document.documentElement.getAttribute('data-theme')==='dark';
      if(dark)document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme','dark');
      try{localStorage.setItem('oyTema',dark?'light':'dark');}catch(_){ }
    }
    setTimeout(()=>btn.textContent=ikon(),30);
  });
  const bell=topbar.querySelector('.topbar-bell');if(bell&&bell.parentNode)bell.parentNode.insertBefore(btn,bell);else topbar.appendChild(btn);
}

const SIDE_ATTRS=new Set(['miniTakvim','ajanda','etkinlikGorev','duyuruPanosu','haberKarusel','okulSitesiKart','haberTicker']);
function dashboardSar(){
  const panel=el('tab-panel');if(!panel||panel.classList.contains('db4'))return;
  panel.classList.add('dash-modern');
  if(panel.querySelector(':scope > .dash-inner'))return;
  const children=Array.from(panel.children);if(!children.length)return;
  const inner=document.createElement('div');inner.className='dash-inner';
  const main=document.createElement('div');main.className='dash-col-main';
  const side=document.createElement('div');side.className='dash-col-side';
  inner.append(main,side);
  children.forEach(child=>SIDE_ATTRS.has(child.dataset?.kartId)?side.appendChild(child):main.appendChild(child));
  panel.appendChild(inner);
}

function rolHeroUygula(){
  const hero=$('#tab-panel.dash-modern .dash-hero');if(!hero)return;
  hero.classList.remove('rol-admin','rol-ogretmen');
  if(typeof AKTIF_KULLANICI==='undefined'||!AKTIF_KULLANICI)return;
  if(AKTIF_KULLANICI.admin===true)hero.classList.add('rol-admin');
  else if(typeof bagliOgretmenimGetir==='function'&&bagliOgretmenimGetir())hero.classList.add('rol-ogretmen');
}

function sidebarProfilGuncelle(){
  const sidebar=$('.sidebar');if(!sidebar)return;
  let kutu=sidebar.querySelector('.sidebar-hesap');
  if(!kutu){kutu=document.createElement('div');kutu.className='sidebar-hesap';kutu.innerHTML='<div class="sidebar-hesap-avatar" id="wsHesapAvatar">👤</div><div class="sidebar-hesap-bilgi"><div class="sidebar-hesap-ad" id="wsHesapAd">—</div><div class="sidebar-hesap-rol" id="wsHesapRol">—</div></div>';sidebar.appendChild(kutu);}
  if(typeof AKTIF_KULLANICI==='undefined'||!AKTIF_KULLANICI)return;
  const bagli=(typeof bagliOgretmenimGetir==='function')?bagliOgretmenimGetir():null;
  const ad=bagli?.adSoyad||bagli?.ad||AKTIF_KULLANICI.adSoyad||AKTIF_KULLANICI.kullaniciAdi||'Kullanıcı';
  const rol=AKTIF_KULLANICI.admin?'Süper Admin':((typeof AKTIF_ROL!=='undefined'&&AKTIF_ROL?.ad)||(bagli?'Öğretmen':'Kullanıcı'));
  if(el('wsHesapAd'))el('wsHesapAd').textContent=ad;if(el('wsHesapRol'))el('wsHesapRol').textContent=rol;if(el('wsHesapAvatar'))el('wsHesapAvatar').textContent=AKTIF_KULLANICI.admin?'🛡️':(bagli?'👨‍🏫':'👤');
}

function aktifSekmeGuncelle(){
  const topbar=$('.topbar');if(!topbar)return;
  let span=el('wsTopbarSekmeAdi');if(!span){span=document.createElement('span');span.id='wsTopbarSekmeAdi';span.className='topbar-sekme-adi';topbar.appendChild(span);}
  const aktif=$('.nav-tab.active');span.textContent=aktif?.querySelector('.nt-label')?.textContent?.trim()||'Ana Sayfa';
}

function webDuzeniniUygula(){dashboardSar();rolHeroUygula();sidebarProfilGuncelle();aktifSekmeGuncelle();}
function boot(){navCollapsedBaslangic();sidebarToggleKur();temaToggleKur();webDuzeniniUygula();setTimeout(webDuzeniniUygula,250);setTimeout(webDuzeniniUygula,900);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('click',e=>{if(e.target.closest('.nav-tab'))requestAnimationFrame(aktifSekmeGuncelle);});
})();
