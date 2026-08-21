/* Koruk Asistan — Mobil dashboard veri senkronu v2
 * Auth/Firestore verileri sonradan geldikce dashboard'u guvenli biçimde yeniler.
 * Kritik fark: hava durumu / zil / sosyal medya widget DOM'larini shell silinmeden
 * once korur; yeniden kurulumda bu canli widgetlar kaybolmaz.
 */
(function(){
'use strict';
if(window.__db6DataSyncV2)return;window.__db6DataSyncV2=true;
if(!window.matchMedia('(max-width:1023px)').matches)return;

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function gv(name){try{return eval(`typeof ${name}!=='undefined'?${name}:null`)}catch(_){return null}}
function list(name){const v=gv(name);return Array.isArray(v)?v:[]}
function user(){return gv('AKTIF_KULLANICI')||window.AKTIF_KULLANICI||null}
function teacher(){try{if(typeof bagliOgretmenimGetir==='function')return bagliOgretmenimGetir()}catch(_){}const u=user();return u?.bagliOgretmenId?list('ogretmenler').find(x=>x.id===u.bagliOgretmenId)||null:null}
function nameNow(){const t=teacher(),u=user();return t?`${t.ad||''} ${t.soyad||''}`.trim():(u?.ad||u?.adSoyad||u?.kullaniciAdi||'').trim()}
function counts(){return {u:!!user(),t:!!teacher(),teachers:list('ogretmenler').length,schedule:list('dersProgrami').length,exams:list('sinavlar').length,duties:list('nobetAtamalari').length,news:list('haberler').length,notes:list('notlar').length,tasks:list('gorevler').length,rem:list('hatirlaticilar').length}}
function signature(){return JSON.stringify(counts())+'|'+nameNow()}
function shellStale(){const sh=$('.db6-shell');if(!sh)return false;const txt=sh.textContent||'';const c=counts(),u=user();
 if(/(Merhaba|Günaydın|İyi akşamlar), Kullanıcı/.test(txt))return true;
 if(u?.bagliOgretmenId&&teacher()&&(c.schedule||c.exams||c.duties)&&!(/Bugünkü Derslerim|Sınavlarım|Bugünkü Nöbetim|Ders Programım/.test(txt)))return true;
 if(c.news&&txt.includes('Okul ve eğitim haberleri burada yayınlanacaktır.'))return true;
 if(u?.admin&&(c.schedule||c.exams||c.duties)&&!(/Haftanın Nöbet Programı|Yaklaşan Yazılı Sınavlar|Şu Anki Dersler/.test(txt)))return true;
 return false;
}
function widgetleriKoru(p,sh){let keep=$('#db6-live-widget-keep',p);if(!keep){keep=document.createElement('div');keep.id='db6-live-widget-keep';keep.style.display='none';p.append(keep)}
 ['heroHavaSatir','zilWidget','heroSosyalMedya'].forEach(id=>{const el=$('#'+id,sh)||$('#'+id,p);if(el)keep.append(el)});return keep}
function rebuild(){const p=$('#tab-panel'),sh=$('.db6-shell',p||document);if(!p||!sh)return false;widgetleriKoru(p,sh);$$('.db6-backtop').forEach(x=>x.remove());sh.remove();return true}
function updateGreetingOnly(){const h=$('.db6-greet h1');const n=nameNow();if(!h||!n)return;const saat=new Date().getHours(),g=saat<11?'Günaydın':saat<18?'Merhaba':'İyi akşamlar';h.textContent=`${g}, ${n} 👋`}
function liveWidgetGuvence(){const sh=$('.db6-shell');if(!sh)return;const keep=$('#db6-live-widget-keep');const w=$('#heroHavaSatir',keep||document),z=$('#zilWidget',keep||document),s=$('#heroSosyalMedya',keep||document);const wh=$('.db6-weather',sh),zh=$('.db6-clock',sh);if(w&&wh&&!wh.contains(w))wh.replaceChildren(w);if(z&&zh&&!zh.contains(z))zh.replaceChildren(z);if(s&&keep&&keep.contains(s))keep.append(s);try{if(typeof renderZilSayaci==='function')renderZilSayaci()}catch(_){}try{if(window.sonHavaVerisi&&typeof renderHava==='function')renderHava(window.sonHavaVerisi)}catch(_){}
}
let last='',stable=0,rebuilds=0;
function tick(){const sig=signature();if(sig===last)stable++;else{last=sig;stable=0}updateGreetingOnly();liveWidgetGuvence();if(stable>=2&&shellStale()&&rebuilds<3){rebuilds++;stable=0;rebuild();setTimeout(liveWidgetGuvence,250);setTimeout(liveWidgetGuvence,700)}}
setInterval(tick,700);[250,700,1400,2600,5000,9000].forEach(ms=>setTimeout(tick,ms));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(tick,100)});
})();