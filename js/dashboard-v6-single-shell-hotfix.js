/* Koruk Asistan — v6 tek ana sayfa acil düzeltme
 * Mobil ana sayfada v6 dışındaki eski dashboard katmanlarını görünmez yapar.
 * Hava ve zil widgetlarını v6 kabuğunda sabitler.
 * Alt navigasyon ve üst uygulama çubuğuna dokunmaz.
 */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
function kullaniciAdi(){
  try{
    const u=window.AKTIF_KULLANICI||null;
    const t=typeof window.bagliOgretmenimGetir==='function'?window.bagliOgretmenimGetir():null;
    const aday=[
      t&&[t.ad,t.soyad].filter(Boolean).join(' '),
      u?.adSoyad,u?.adiSoyadi,u?.isimSoyisim,u?.displayName,
      [u?.ad,u?.soyad].filter(Boolean).join(' '),u?.kullaniciAdi
    ].find(x=>String(x||'').trim());
    return String(aday||'').trim();
  }catch(_){return''}
}
function widgetleriSabitle(shell){
  const weather=$('#heroHavaSatir');
  const weatherHost=$('.db6-weather',shell);
  if(weather&&weatherHost&&weather.parentElement!==weatherHost) weatherHost.appendChild(weather);
  const bell=$('#zilWidget');
  const bellHost=$('.db6-clock',shell);
  if(bell&&bellHost&&bell.parentElement!==bellHost) bellHost.appendChild(bell);
}
function uygula(){
  if(window.matchMedia&&window.matchMedia('(min-width: 1024px)').matches)return false;
  const root=$('#tab-panel');
  const shell=$('.db6-shell',root||document);
  if(!root||!shell)return false;
  root.classList.add('db6-v6-only');
  widgetleriSabitle(shell);
  Array.from(root.children).forEach(el=>{
    if(el===shell)return;
    el.classList.add('db6-legacy-hidden');
    el.setAttribute('aria-hidden','true');
  });
  const ad=kullaniciAdi();
  const h=$('.db6-greet h1',shell);
  if(ad&&h&&/Kullanıcı/i.test(h.textContent||'')){
    const saat=new Date().getHours();
    const selam=saat<11?'Günaydın':saat<18?'Merhaba':'İyi akşamlar';
    h.textContent=`${selam}, ${ad} 👋`;
  }
  return true;
}
function css(){
  if($('#db6-single-shell-css'))return;
  const s=document.createElement('style');
  s.id='db6-single-shell-css';
  s.textContent=`
#tab-panel.db6-v6-only>.db6-legacy-hidden{display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important}
#tab-panel.db6-v6-only>.db6-shell{display:flex!important;width:100%!important}
#tab-panel.db6-v6-only{overflow-x:hidden!important}
.db6-v6-only .db6-weather:empty,.db6-v6-only .db6-clock:empty{min-height:92px}
`;
  document.head.appendChild(s);
}
function boot(){css();return uygula()}
let n=0,t=setInterval(()=>{if(boot()||++n>100)clearInterval(t)},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));
window.addEventListener('load',()=>setTimeout(boot,100));
const mo=new MutationObserver(()=>{const root=$('#tab-panel');if(root&&$('.db6-shell',root))requestAnimationFrame(uygula)});
mo.observe(document.documentElement,{childList:true,subtree:true});
})();