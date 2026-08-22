/* Koruk Asistan — Dinamik ana sayfa kart senkronu v1
   Amaç:
   1) Eski sinavlar.js intervali geç devreye girip yeni canlı sayaç kartını ezmesin.
   2) Duyuru ve sayaç kartı Firestore ilk snapshot gelmeden önce son başarılı içerikten anında gösterilebilsin.
   3) Yeni renderer tek görünür kaynak olarak kalsın.
*/
(function(){
  'use strict';
  if(!window.matchMedia('(max-width:1023px)').matches) return;
  if(window.__KH_DYNAMIC_LIVE_SYNC__) return;
  window.__KH_DYNAMIC_LIVE_SYNC__=true;

  var CACHE_SAYAC='kh:last-live-counter-html';
  var CACHE_SAYAC_ID='kh:last-live-counter-id';
  var CACHE_DUYURU='kh:last-announcement-html';
  var kendiInterval=null;
  var legacyBaglandi=false;
  var mutasyonKilidi=false;

  function lsGet(k){try{return localStorage.getItem(k)||'';}catch(_){return '';}}
  function lsSet(k,v){try{if(v)localStorage.setItem(k,v);else localStorage.removeItem(k);}catch(_){}}

  function sayacKart(){return document.getElementById('dashSayacKarti');}
  function modernSayacVar(k){return !!(k&&k.querySelector('.dn4-home-card'));}

  function sayacCacheKaydet(){
    var k=sayacKart();
    if(!modernSayacVar(k)) return;
    lsSet(CACHE_SAYAC,k.innerHTML);
    if(window._dashSayacAktifId) lsSet(CACHE_SAYAC_ID,String(window._dashSayacAktifId));
  }

  function sayacCacheGoster(){
    var k=sayacKart(); if(!k||modernSayacVar(k)) return false;
    var html=lsGet(CACHE_SAYAC); if(!html) return false;
    k.innerHTML=html;
    k.style.display='block';
    k.classList.add('dn4-dashboard-live');
    var id=lsGet(CACHE_SAYAC_ID);
    if(id){
      window._dashSayacAktifId=id;
      k.onclick=function(){if(typeof window.denemeSayacAc==='function')window.denemeSayacAc(id);};
    }
    return true;
  }

  function modernSayaciZorla(){
    var k=sayacKart(); if(!k) return;
    try{
      if(typeof window._anaSayfaSayacKartiGuncelle==='function') window._anaSayfaSayacKartiGuncelle();
    }catch(_){ }
    if(modernSayacVar(k)) sayacCacheKaydet();
    else sayacCacheGoster();
  }

  function legacyIntervaliDevral(){
    /* sinavlar.js auth/veri bağlantısından sonra yüklenebildiği için bu kontrol
       tek seferlik değil. Lexical _anaSayfaSayacInt oluştuğu anda eski interval
       temizlenip yeni renderer aynı handle'a bağlanır. */
    try{
      if(typeof _anaSayfaSayacInt!=='undefined'){
        if(_anaSayfaSayacInt!==kendiInterval && _anaSayfaSayacInt){clearInterval(_anaSayfaSayacInt);}
        if(!kendiInterval) kendiInterval=setInterval(modernSayaciZorla,1000);
        _anaSayfaSayacInt=kendiInterval;
        legacyBaglandi=true;
      }
    }catch(_){ }
  }

  function duyuruCacheKaydet(){
    var a=document.querySelector('#tab-panel.kh-home .kh-dynamic .kh-announcement');
    if(a) lsSet(CACHE_DUYURU,a.outerHTML);
  }

  function duyuruCacheGoster(){
    var dyn=document.querySelector('#tab-panel.kh-home .kh-dynamic');
    if(!dyn||dyn.querySelector('.kh-announcement')) return false;
    var html=lsGet(CACHE_DUYURU); if(!html) return false;
    var box=document.createElement('div'); box.innerHTML=html;
    var a=box.firstElementChild; if(!a) return false;
    a.dataset.cached='1';
    a.addEventListener('click',function(e){
      if(e.target.closest('input,[data-action="read"],[data-action="readers"]')) return;
      try{if(typeof sekmeAc==='function')sekmeAc('duyurular');}catch(_){ }
    });
    dyn.prepend(a);
    return true;
  }

  function ilkBoyama(){
    sayacCacheGoster();
    duyuruCacheGoster();
    modernSayaciZorla();
  }

  var mo=new MutationObserver(function(){
    if(mutasyonKilidi) return;
    mutasyonKilidi=true;
    requestAnimationFrame(function(){
      mutasyonKilidi=false;
      var k=sayacKart();
      if(k){
        if(modernSayacVar(k)) sayacCacheKaydet();
        else modernSayaciZorla();
      }
      duyuruCacheKaydet();
      if(!document.querySelector('#tab-panel.kh-home .kh-dynamic .kh-announcement')) duyuruCacheGoster();
    });
  });

  function baslat(){
    var panel=document.getElementById('tab-panel');
    if(panel) mo.observe(panel,{childList:true,subtree:true});
    ilkBoyama();
    var n=0;
    var bekle=setInterval(function(){
      legacyIntervaliDevral();
      modernSayaciZorla();
      if(++n>120 && legacyBaglandi) clearInterval(bekle);
    },100);
    window.addEventListener('focus',function(){setTimeout(function(){legacyIntervaliDevral();ilkBoyama();},30);});
    document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(function(){legacyIntervaliDevral();ilkBoyama();},30);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat,{once:true});else baslat();
})();