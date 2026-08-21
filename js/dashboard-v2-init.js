/* Koruk Asistan — Web kabuk başlangıcı
 * Bu dosya artık MOBİL ANA SAYFAYA dokunmaz.
 * index.html eski dosya adını doğrudan çağırdığı için ad korunmuştur;
 * içerik yalnızca >=1024px web kabuğu davranışlarını yönetir.
 */
(function(){
'use strict';
if(!window.matchMedia('(min-width:1024px)').matches)return;
if(window.__KORUK_WEB_SHELL_INIT__)return;
window.__KORUK_WEB_SHELL_INIT__=true;

const $=(s,r=document)=>r.querySelector(s);
function collapsedApply(){
  try{document.body.classList.toggle('nav-collapsed',localStorage.getItem('navCollapsed')==='1')}catch(_){}
}
function collapseToggleInstall(){
  if($('#wsSidebarToggle'))return;
  const topbar=$('.topbar');if(!topbar)return;
  const b=document.createElement('button');
  b.id='wsSidebarToggle';b.type='button';b.title='Menüyü küçült / büyüt';b.setAttribute('aria-label','Menüyü küçült / büyüt');
  b.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  b.addEventListener('click',()=>{
    document.body.classList.toggle('nav-collapsed');
    try{localStorage.setItem('navCollapsed',document.body.classList.contains('nav-collapsed')?'1':'0')}catch(_){}
  });
  const hamburger=$('#topbarHamburger');
  if(hamburger)topbar.insertBefore(b,hamburger);else topbar.prepend(b);
}
function profileUpdate(){
  const u=window.AKTIF_KULLANICI||null;if(!u)return;
  const ad=$('#hesapAd'),mail=$('#hesapEmail');
  if(ad)ad.textContent=u.adSoyad||u.ad||u.displayName||u.kullaniciAdi||'';
  if(mail)mail.textContent=u.email||u.kullaniciAdi||'';
}
function activeTitleUpdate(){
  const active=$('.nav-tab.active .nt-label');
  const title=$('#topbarAktifSekme');
  if(title&&active)title.textContent=active.textContent.trim();
}
function boot(){collapsedApply();collapseToggleInstall();profileUpdate();activeTitleUpdate()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('resize',()=>{collapseToggleInstall();activeTitleUpdate()},{passive:true});
document.addEventListener('click',e=>{if(e.target.closest('.nav-tab'))setTimeout(activeTitleUpdate,0)});
})();
