/* Koruk Asistan — v6 tek ana sayfa acil düzeltme
 * Mobil ana sayfada v6 dışındaki eski dashboard katmanlarını görünmez yapar.
 * Hava ve zil widgetlarını v6 kabuğunda sabitler.
 * Selamlamada cinsiyet/hitap varsayımı yapmaz; yalnızca gerçek adı kullanır.
 * Hava durumu ve zil sayacını mobilde alt alta gösterir.
 * Açık/koyu tema kontrastını güçlendirir.
 * Alt navigasyon ve üst uygulama çubuğuna dokunmaz.
 */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
function temizAd(v){
  return String(v||'').replace(/\s+(Bey|Hanım|Beyefendi|Hanımefendi)\s*$/i,'').trim();
}
function kullaniciAdi(){
  try{
    const u=window.AKTIF_KULLANICI||null;
    const t=typeof window.bagliOgretmenimGetir==='function'?window.bagliOgretmenimGetir():null;
    const aday=[
      t&&[t.ad,t.soyad].filter(Boolean).join(' '),
      u?.adSoyad,u?.adiSoyadi,u?.isimSoyisim,u?.displayName,
      [u?.ad,u?.soyad].filter(Boolean).join(' '),u?.kullaniciAdi
    ].map(temizAd).find(x=>x);
    return temizAd(aday);
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
function selamlamayiDuzelt(shell){
  const ad=kullaniciAdi();
  const h=$('.db6-greet h1',shell);
  if(!h)return;
  const saat=new Date().getHours();
  const selam=saat<11?'Günaydın':saat<18?'Merhaba':'İyi akşamlar';
  if(ad) h.textContent=`${selam}, ${ad} 👋`;
  else h.textContent=`${selam} 👋`;
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
  selamlamayiDuzelt(shell);
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
.db6-v6-only .db6-topgrid{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}
.db6-v6-only .db6-weather,.db6-v6-only .db6-clock{width:100%!important;min-height:96px!important;border-radius:18px!important;overflow:hidden!important}
.db6-v6-only .db6-weather:empty,.db6-v6-only .db6-clock:empty{min-height:96px}
.db6-v6-only .db6-weather #heroHavaSatir,.db6-v6-only .db6-clock #zilWidget{width:100%!important;min-height:96px!important;padding:12px 14px!important;border-radius:18px!important;background:transparent!important;box-shadow:none!important}
/* Açık tema */
:root:not([data-theme="dark"]) #tab-panel.db6-v6-only .db6-top{background:linear-gradient(135deg,#3b2585,#6b45d8)!important;color:#fff!important}
:root:not([data-theme="dark"]) #tab-panel.db6-v6-only .db6-weather,
:root:not([data-theme="dark"]) #tab-panel.db6-v6-only .db6-clock{background:rgba(255,255,255,.14)!important;border:1px solid rgba(255,255,255,.24)!important}
:root:not([data-theme="dark"]) #tab-panel.db6-v6-only .db6-weather *,
:root:not([data-theme="dark"]) #tab-panel.db6-v6-only .db6-clock *{color:#fff!important;text-shadow:none!important}
/* Koyu tema */
[data-theme="dark"] #tab-panel.db6-v6-only .db6-top{background:linear-gradient(135deg,#17102f,#2b1e56)!important;color:#f8fafc!important}
[data-theme="dark"] #tab-panel.db6-v6-only .db6-weather,
[data-theme="dark"] #tab-panel.db6-v6-only .db6-clock{background:#13263a!important;border:1px solid #31506a!important}
[data-theme="dark"] #tab-panel.db6-v6-only .db6-weather *,
[data-theme="dark"] #tab-panel.db6-v6-only .db6-clock *{color:#f8fafc!important;text-shadow:none!important}
[data-theme="dark"] #tab-panel.db6-v6-only .db6-weather small,
[data-theme="dark"] #tab-panel.db6-v6-only .db6-clock small{color:#cbd5e1!important}
/* Tema attribute body/html dışında tutuluyorsa yedek kontrast */
body.dark #tab-panel.db6-v6-only .db6-top{background:linear-gradient(135deg,#17102f,#2b1e56)!important;color:#f8fafc!important}
body.dark #tab-panel.db6-v6-only .db6-weather,body.dark #tab-panel.db6-v6-only .db6-clock{background:#13263a!important;border-color:#31506a!important}
body.dark #tab-panel.db6-v6-only .db6-weather *,body.dark #tab-panel.db6-v6-only .db6-clock *{color:#f8fafc!important}
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