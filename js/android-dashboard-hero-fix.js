/* Koruk Asistan — Android dashboard hero kalıcılık düzeltmesi */
(function(){
'use strict';
if(window.__androidDashboardHeroFix)return;
function native(){try{return !!(window.Capacitor&&typeof window.Capacitor.isNativePlatform==='function'&&window.Capacitor.isNativePlatform())}catch(_){return false}}
if(!native()||!window.matchMedia('(max-width: 1023px)').matches)return;
window.__androidDashboardHeroFix=true;
const $=(s,r=document)=>r.querySelector(s);
function gv(n){try{return window[n]!==undefined?window[n]:eval(n)}catch(_){return null}}
function kullaniciAdi(){const u=gv('AKTIF_KULLANICI')||{};const ham=u.adSoyad||u.ad_soyad||u.ad||u.isim||u.displayName||'';return String(ham).trim().split(/\s+/)[0]||'Kullanıcı'}
function selamlama(){const h=new Date().getHours();return h<12?'Günaydın':h<18?'Tünaydın':'İyi akşamlar'}
function tarihMetni(){return new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'})}
function css(){if($('#android-hero-fix-css'))return;const s=document.createElement('style');s.id='android-hero-fix-css';s.textContent=`
#androidHeroRecovery{display:none}
#androidHeroRecovery.fallback{display:block;margin:8px 12px 18px;padding:18px 14px;border:1px solid var(--border,#dfe7ef);border-radius:24px;background:var(--surface,#fff);color:var(--ink,#102038);box-shadow:0 8px 25px rgba(22,42,68,.08)}
#androidHeroRecovery.fallback .ahr-greet{font-size:30px;font-weight:850;line-height:1.08;color:inherit}
#androidHeroRecovery.fallback #panelTarih{margin-top:8px;color:var(--ink-muted,#69798f);font-weight:650}
#androidHeroRecovery.fallback .ahr-live{display:grid;grid-template-columns:1fr 1.15fr;gap:9px;margin-top:16px}
#androidHeroRecovery.fallback .ahr-live>div{min-width:0;min-height:104px;border:1px solid var(--border,#dfe7ef);border-radius:18px;padding:10px;background:var(--surface-2,#f8fafc);display:flex;align-items:center}
#androidHeroRecovery.fallback #heroHavaSatir,#androidHeroRecovery.fallback #zilWidget{display:flex!important;width:100%!important;margin:0!important;color:inherit!important}
[data-theme="dark"] #androidHeroRecovery.fallback{background:#0c2338;color:#f7f9fc;border-color:#1e3c56}
[data-theme="dark"] #androidHeroRecovery.fallback .ahr-live>div{background:#102940;border-color:#1e3c56}
`;document.head.appendChild(s)}
function havaDoldur(el){if(!el)return;const v=window.sonHavaVerisi;if(v){let b={e:'🌤️',t:'Hava Durumu'};try{const f=gv('havaKoduOku');if(typeof f==='function')b=f(v.kod)||b}catch(_){}const k=(()=>{try{return localStorage.getItem('oyHavaKonum')||''}catch(_){return''}})();el.innerHTML=`<span style="font-size:28px;margin-right:10px">${b.e}</span><div style="min-width:0"><div style="font-size:20px;font-weight:850">${Math.round(v.sicaklik)}°C <span style="font-size:14px;font-weight:600">${b.t}</span></div><div style="font-size:11px;opacity:.72;margin-top:3px">${k?'📍 '+k:''}</div></div>`;el.style.display='flex';return true}return false}
function kaynaklariOlustur(){const p=$('#tab-panel');if(!p)return null;if($('.db4-shell',p))return null;let host=$('#androidHeroRecovery');if(!host){host=document.createElement('section');host.id='androidHeroRecovery';host.innerHTML='<div class="ahr-greet"><div class="dash-hero-hi" id="heroSelamla"></div><div class="page-sub" id="panelTarih"></div></div><div class="ahr-live"><div class="ahr-weather"><div class="dash-hero-hava-satir" id="heroHavaSatir"></div></div><div class="ahr-bell"><div class="dash-hero-bell" id="zilWidget"></div></div></div><div id="heroSosyalMedya" style="display:none"></div>';p.prepend(host)}
 const g=$('#heroSelamla'),d=$('#panelTarih');if(g)g.textContent=`${selamlama()}, ${kullaniciAdi()} Bey 👋`;if(d)d.textContent=tarihMetni();
 const weather=$('#heroHavaSatir');if(!havaDoldur(weather)){const f=gv('konumIsteVeBaslat');if(typeof f==='function'&&!window.__androidHeroWeatherRetry){window.__androidHeroWeatherRetry=true;setTimeout(()=>{try{f()}catch(_){}},120)}}
 const rz=gv('renderZilSayaci');if(typeof rz==='function'){try{rz()}catch(_){}}
 const rs=gv('renderSosyalMedyaIkonlari');if(typeof rs==='function'){try{rs()}catch(_){}}
 return host}
function remount(){css();if($('.db4-shell')){$('#androidHeroRecovery')?.remove();return true}const host=kaynaklariOlustur();if(!host)return !!$('.db4-shell');const api=window.DashboardMobilStateV3;if(api&&typeof api.nativeHeroYenile==='function'){try{api.nativeHeroYenile()}catch(_){}}
 return false}
function guvence(){if(remount())return;setTimeout(()=>{if(!$('.db4-shell')){$('#androidHeroRecovery')?.classList.add('fallback');const rz=gv('renderZilSayaci');if(typeof rz==='function'){try{rz()}catch(_){}}havaDoldur($('#heroHavaSatir'))}},900)}
[0,80,240,700,1500,3000].forEach(ms=>setTimeout(guvence,ms));
document.addEventListener('DOMContentLoaded',guvence,{once:true});window.addEventListener('load',()=>setTimeout(guvence,120));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(guvence,80)});document.addEventListener('click',e=>{if(e.target.closest('[data-tab],.nav-tab,.bottom-nav,.bn-item'))setTimeout(guvence,120)},true);
window.AndroidDashboardHeroFix={yenile:guvence};
})();
