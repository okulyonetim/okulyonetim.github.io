/* Koruk Asistan — Mobil dashboard veri senkronu v1
 * V6 ekranı auth/Firestore verileri gelmeden oluşursa, gerekli veri hazır olduğunda
 * dashboard'u bir kez güvenli biçimde yeniden kurar. Haber, ders, yazılı, nöbet ve
 * kullanıcı/öğretmen eşleşmesini canlı veriye bağlar.
 */
(function(){
'use strict';
if(window.__db6DataSyncV1)return;window.__db6DataSyncV1=true;
if(!window.matchMedia('(max-width:1023px)').matches)return;

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function gv(name){try{return eval(`typeof ${name}!=='undefined'?${name}:null`)}catch(_){return null}}
function list(name){const v=gv(name);return Array.isArray(v)?v:[]}
function user(){return gv('AKTIF_KULLANICI')||window.AKTIF_KULLANICI||null}
function teacher(){try{if(typeof bagliOgretmenimGetir==='function')return bagliOgretmenimGetir()}catch(_){}const u=user();return u?.bagliOgretmenId?list('ogretmenler').find(x=>x.id===u.bagliOgretmenId)||null:null}
function nameNow(){const t=teacher(),u=user();return t?`${t.ad||''} ${t.soyad||''}`.trim():(u?.ad||u?.adSoyad||u?.kullaniciAdi||'').trim()}
function counts(){return {
 u:!!user(),t:!!teacher(),teachers:list('ogretmenler').length,schedule:list('dersProgrami').length,
 exams:list('sinavlar').length,duties:list('nobetAtamalari').length,news:list('haberler').length,
 notes:list('notlar').length,tasks:list('gorevler').length,rem:list('hatirlaticilar').length
}}
function signature(){const c=counts();return JSON.stringify(c)+'|'+nameNow()}
function shellStale(){const sh=$('.db6-shell');if(!sh)return false;const txt=sh.textContent||'';const c=counts(),u=user();
 if(txt.includes('Merhaba, Kullanıcı')||txt.includes('Günaydın, Kullanıcı')||txt.includes('İyi akşamlar, Kullanıcı'))return true;
 if(u?.bagliOgretmenId&&teacher()&&(c.schedule||c.exams||c.duties)&&!(/Bugünkü Derslerim|Sınavlarım|Bugünkü Nöbetim|Ders Programım/.test(txt)))return true;
 if(c.news&&txt.includes('Okul ve eğitim haberleri burada yayınlanacaktır.'))return true;
 if(u?.admin&&(c.schedule||c.exams||c.duties)&&!(/Haftanın Nöbet Programı|Yaklaşan Yazılı Sınavlar|Şu Anki Dersler/.test(txt)))return true;
 return false;
}
function rebuild(){const p=$('#tab-panel'),sh=$('.db6-shell',p||document);if(!p||!sh)return false;
 $$('.db6-backtop').forEach(x=>x.remove());sh.remove();
 // dashboard-mobile-v4.js içindeki MutationObserver, shell yokluğunu görüp
 // mevcut güncel global verilerle build() fonksiyonunu tekrar çağırır.
 return true;
}
function updateGreetingOnly(){const h=$('.db6-greet h1');const n=nameNow();if(!h||!n)return;const saat=new Date().getHours(),g=saat<11?'Günaydın':saat<18?'Merhaba':'İyi akşamlar';h.textContent=`${g}, ${n} 👋`;}
let last='',stable=0,rebuilds=0;
function tick(){const sig=signature();if(sig===last)stable++;else{last=sig;stable=0}updateGreetingOnly();
 if(stable>=2&&shellStale()&&rebuilds<4){rebuilds++;stable=0;rebuild();}
}
setInterval(tick,700);
[300,900,1800,3500,6000,10000].forEach(ms=>setTimeout(tick,ms));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(tick,100)});
})();