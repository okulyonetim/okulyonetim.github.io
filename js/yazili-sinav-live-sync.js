/* Koruk Asistan — Yazılı sınav canlı Firestore senkronu v1
   Modern özet kartlarının Firestore ilk snapshot gelmeden 0 göstermesini engeller.
   renderSinavlar() her gerçek veri güncellemesinde özetleri aynı anda yeniler.
*/
(function(){
  'use strict';

  function root(){ return document.getElementById('tab-yaziliSinavlar'); }
  function gunFarki(iso){
    if(!iso) return null;
    var bugun=new Date(); bugun.setHours(0,0,0,0);
    var d=new Date(String(iso)+'T00:00:00');
    if(Number.isNaN(d.getTime())) return null;
    return Math.round((d-bugun)/86400000);
  }
  function statlariHesapla(){
    var liste=(typeof sinavlar!=='undefined' && Array.isArray(sinavlar)) ? sinavlar : [];
    var yaklasan=0,bugun=0;
    liste.forEach(function(s){
      var f=gunFarki(s&&s.tarih);
      if(f===0) bugun++;
      if(f!==null && f>=0 && f<=7) yaklasan++;
    });
    return {toplam:liste.length,yaklasan:yaklasan,bugun:bugun};
  }
  function ozetYaz(stats, yuklendi){
    var r=root(); if(!r) return;
    var alanlar={toplam:'toplam',yaklasan:'yaklasan',bugun:'bugun'};
    Object.keys(alanlar).forEach(function(k){
      var el=r.querySelector('[data-ys-stat="'+alanlar[k]+'"] b');
      if(el) el.textContent=yuklendi ? String(stats[k]) : '…';
    });
    r.classList.toggle('ys-data-loading',!yuklendi);
  }
  function guncelle(){
    var stats=statlariHesapla();
    window.__yaziliSinavlarYuklendi=true;
    ozetYaz(stats,true);
    try{ localStorage.setItem('koruk_yazili_sinav_ozet',JSON.stringify(stats)); }catch(_){ }
    window.dispatchEvent(new CustomEvent('koruk:yazili-sinavlar-guncellendi',{detail:stats}));
  }
  function ilkDurum(){
    var r=root(); if(!r) return;
    if(window.__yaziliSinavlarYuklendi){ guncelle(); return; }
    /* Sahte 0 yerine yükleniyor durumu. Önceki başarılı özet varsa anlık göster,
       gerçek Firestore snapshot geldiğinde renderSinavlar sarmalı kesin günceller. */
    try{
      var c=JSON.parse(localStorage.getItem('koruk_yazili_sinav_ozet')||'null');
      if(c && Number.isFinite(Number(c.toplam))) { ozetYaz(c,true); return; }
    }catch(_){ }
    ozetYaz({toplam:0,yaklasan:0,bugun:0},false);
  }
  function sar(){
    if(typeof renderSinavlar!=='function' || renderSinavlar.__korukLiveSync) return false;
    var eski=renderSinavlar;
    var yeni=function(){
      var sonuc=eski.apply(this,arguments);
      guncelle();
      return sonuc;
    };
    yeni.__korukLiveSync=true;
    renderSinavlar=yeni;
    return true;
  }
  function kur(){
    ilkDurum();
    if(!sar()){
      var n=0, t=setInterval(function(){ if(sar() || ++n>80) clearInterval(t); },100);
    }
    /* Script yüklendiğinde Firestore snapshot zaten gelmiş olabilir. */
    if(typeof sinavlar!=='undefined' && Array.isArray(sinavlar) && sinavlar.length){ guncelle(); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',kur,{once:true}); else kur();
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-tab="yaziliSinavlar"]')) setTimeout(ilkDurum,0);
  },true);
})();