/* Koruk Asistan — Android dashboard hero guvencesi
 * v6 dashboard aktifken eski recovery hero URETMEZ.
 * Yalnizca gercek dashboard henuz olusmadiysa kisa sureli kaynak kurtarma yapar.
 */
(function(){
'use strict';
if(window.__androidDashboardHeroFix)return;
if(!window.matchMedia('(max-width:1023px)').matches)return;
window.__androidDashboardHeroFix=true;

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function gv(n){try{return window[n]!==undefined?window[n]:eval(n)}catch(_){return null}}
function kullaniciAdi(){const u=gv('AKTIF_KULLANICI')||{};const ham=u.adSoyad||u.ad_soyad||u.ad||u.isim||u.displayName||'';return String(ham).trim().split(/\s+/)[0]||'Kullanıcı'}
function selamlama(){const h=new Date().getHours();return h<11?'Günaydın':h<18?'Merhaba':'İyi akşamlar'}
function tarihMetni(){return new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'})}
function dashboardVarMi(p){return !!($('.db6-shell',p)||$('.db4-shell',p));}

function css(){
 if($('#android-hero-fix-css'))return;
 const s=document.createElement('style');s.id='android-hero-fix-css';s.textContent=`
#androidHeroRecovery{display:none!important}
#androidHeroRecovery.fallback{display:block!important;margin:8px 0 18px;padding:18px 14px;border:1px solid var(--border,#dfe7ef);border-radius:24px;background:var(--surface,#fff);color:var(--ink,#102038);box-shadow:0 8px 25px rgba(22,42,68,.08)}
#androidHeroRecovery.fallback .ahr-greet{font-size:30px;font-weight:850;line-height:1.08;color:inherit}
#androidHeroRecovery.fallback #panelTarih{margin-top:8px;color:var(--ink-muted,#69798f);font-weight:650}
#androidHeroRecovery.fallback .ahr-live{display:grid;grid-template-columns:1fr 1.15fr;gap:9px;margin-top:16px}
#androidHeroRecovery.fallback .ahr-live>div{min-width:0;min-height:104px;border:1px solid var(--border,#dfe7ef);border-radius:18px;padding:10px;background:var(--surface-2,#f8fafc);display:flex;align-items:center}
[data-theme="dark"] #androidHeroRecovery.fallback{background:#0c2338;color:#f7f9fc;border-color:#1e3c56}
[data-theme="dark"] #androidHeroRecovery.fallback .ahr-live>div{background:#102940;border-color:#1e3c56}
`;document.head.appendChild(s);
}

function havaDoldur(el){
 if(!el)return false;const v=window.sonHavaVerisi;if(!v)return false;
 let b={e:'🌤️',t:'Hava Durumu'};try{const f=gv('havaKoduOku');if(typeof f==='function')b=f(v.kod)||b}catch(_){}
 let k='';try{k=localStorage.getItem('oyHavaKonum')||''}catch(_){}
 el.innerHTML=`<span style="font-size:28px;margin-right:10px">${b.e}</span><div style="min-width:0"><div style="font-size:20px;font-weight:850">${Math.round(v.sicaklik)}°C <span style="font-size:14px;font-weight:600">${b.t}</span></div><div style="font-size:11px;opacity:.72;margin-top:3px">${k?'📍 '+k:''}</div></div>`;
 return true;
}

function recoveryTemizle(p){$$('#androidHeroRecovery',p||document).forEach(x=>x.remove());}

function enUsteSabitle(){
 const p=$('#tab-panel');if(!p)return false;
 const shell=$('.db6-shell',p)||$('.db4-shell',p);
 if(shell){
   recoveryTemizle(p);
   if(p.firstElementChild!==shell)p.prepend(shell);
   return true;
 }
 return false;
}

function kaynaklariOlustur(){
 const p=$('#tab-panel');if(!p||dashboardVarMi(p))return null;
 let host=$('#androidHeroRecovery',p);
 if(!host){
   host=document.createElement('section');host.id='androidHeroRecovery';
   host.innerHTML='<div class="ahr-greet"><div class="dash-hero-hi" id="heroSelamla"></div><div class="page-sub" id="panelTarih"></div></div><div class="ahr-live"><div class="ahr-weather"><div class="dash-hero-hava-satir" id="heroHavaSatir"></div></div><div class="ahr-bell"><div class="dash-hero-bell" id="zilWidget"></div></div></div><div id="heroSosyalMedya" style="display:none"></div>';
   p.prepend(host);
 }
 const g=$('#heroSelamla',host),d=$('#panelTarih',host);if(g)g.textContent=`${selamlama()}, ${kullaniciAdi()} 👋`;if(d)d.textContent=tarihMetni();
 havaDoldur($('#heroHavaSatir',host));
 return host;
}

function guvence(){
 css();const p=$('#tab-panel');if(!p)return false;
 if(enUsteSabitle())return true;
 const host=kaynaklariOlustur();
 setTimeout(()=>{
   const panel=$('#tab-panel');if(!panel)return;
   if(enUsteSabitle())return;
   const h=$('#androidHeroRecovery',panel);if(h&&!dashboardVarMi(panel))h.classList.add('fallback');
 },900);
 return !!host;
}

[0,80,250,700,1500,3000].forEach(ms=>setTimeout(guvence,ms));
document.addEventListener('DOMContentLoaded',guvence,{once:true});
window.addEventListener('load',()=>setTimeout(guvence,80));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(guvence,80)});

let kilit=false;
const mo=new MutationObserver(()=>{if(kilit)return;kilit=true;requestAnimationFrame(()=>{try{const p=$('#tab-panel');if(!p)return;if(dashboardVarMi(p)){recoveryTemizle(p);enUsteSabitle();}}finally{kilit=false}})});
(function observerBaslat(){const p=$('#tab-panel');if(p)mo.observe(p,{childList:true});else setTimeout(observerBaslat,200)})();
window.AndroidDashboardHeroFix={yenile:guvence,sabitle:enUsteSabitle};
})();