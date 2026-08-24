/* Koruk Asistan — mevcut hava durumu motorunun üstünde modern detay görünümü */
(function(){
'use strict';
if(window.__KH_HAVA_MODERN_V1__)return;window.__KH_HAVA_MODERN_V1__=true;
function modernize(){
 const panel=document.getElementById('havaDurumuDetayPanel');if(!panel)return false;
 panel.classList.add('kh-weather-modern');document.body.classList.add('kh-weather-open');
 const page=panel.firstElementChild;if(!page)return false;page.classList.add('kh-weather-page');
 const kids=Array.from(page.children);const head=kids[0],current=kids[1],tabs=document.getElementById('havDetayTabBar');
 if(head){head.classList.add('kh-weather-head');const b=head.querySelector('button');if(b){b.textContent='←';b.setAttribute('aria-label','Hava durumu detayını kapat');b.title='Geri'}}
 if(current)current.classList.add('kh-weather-current');
 if(tabs){tabs.classList.add('kh-weather-tabs');const saat=tabs.querySelector('#havTab_saatlik'),gun=tabs.querySelector('#havTab_gunluk'),ay=tabs.querySelector('#havTab_haftalik');if(saat)saat.textContent='Saatlik';if(gun)gun.textContent='7 Günlük';if(ay)ay.style.display='none';}
 const hourly=document.getElementById('havPanelSaatlik'),daily=document.getElementById('havPanelGunluk'),fake=document.getElementById('havPanelHaftalik');
 if(hourly){hourly.classList.add('kh-weather-panel');const sc=hourly.firstElementChild;if(sc)sc.classList.add('kh-weather-hour-scroll')}
 if(daily){daily.classList.add('kh-weather-panel');const list=daily.firstElementChild;if(list)list.classList.add('kh-weather-daily-list')}
 if(fake)fake.style.display='none';
 if(tabs&&!tabs.previousElementSibling?.classList?.contains('kh-weather-section-label')){const label=document.createElement('div');label.className='kh-weather-section-label';label.textContent='TAHMİN';tabs.parentNode.insertBefore(label,tabs)}
 const oldTab=window.havDetayTabGoster;
 if(typeof oldTab==='function'&&!oldTab.__khModern){const wrap=function(tab){if(tab==='haftalik')tab='gunluk';const r=oldTab.call(this,tab);requestAnimationFrame(()=>{['saatlik','gunluk'].forEach(t=>document.getElementById('havTab_'+t)?.classList.toggle('kh-active',t===tab));const fake=document.getElementById('havPanelHaftalik');if(fake)fake.style.display='none'});return r};wrap.__khModern=true;window.havDetayTabGoster=wrap}
 document.getElementById('havTab_saatlik')?.classList.add('kh-active');
 return true;
}
function closeCleanup(){document.body.classList.remove('kh-weather-open')}
function wrapOpen(){if(typeof window.havaDurumuDetayAc!=='function'||window.havaDurumuDetayAc.__khModern)return false;const old=window.havaDurumuDetayAc;const fn=function(){const r=old.apply(this,arguments);requestAnimationFrame(()=>{modernize();setTimeout(modernize,0)});return r};fn.__khModern=true;window.havaDurumuDetayAc=fn;return true}
function wrapClose(){if(typeof window.havaDurumuDetayKapat!=='function'||window.havaDurumuDetayKapat.__khModern)return false;const old=window.havaDurumuDetayKapat;const fn=function(){const r=old.apply(this,arguments);closeCleanup();return r};fn.__khModern=true;window.havaDurumuDetayKapat=fn;return true}
let n=0;const t=setInterval(()=>{const a=wrapOpen(),b=wrapClose();if((a||window.havaDurumuDetayAc?.__khModern)&&(b||window.havaDurumuDetayKapat?.__khModern)){clearInterval(t)}else if(++n>160)clearInterval(t)},50);
document.addEventListener('DOMContentLoaded',()=>{wrapOpen();wrapClose()});
})();
