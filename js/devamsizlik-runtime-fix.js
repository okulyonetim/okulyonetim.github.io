/* Devamsızlık Çizelgesi — local-first / ilk render düzeltmesi */
(function(){
  'use strict';

  if(window.__devamsizlikRuntimeFixYuklendi) return;
  window.__devamsizlikRuntimeFixYuklendi = true;

  const CACHE_PREFIX = 'dc:last:';
  const CACHE_TTL = 1000 * 60 * 60 * 24 * 14; // 14 gün

  function cacheKey(yil, ay){ return CACHE_PREFIX + yil + '-' + ay; }

  function cacheOku(yil, ay){
    try{
      const raw = localStorage.getItem(cacheKey(yil, ay));
      if(!raw) return null;
      const paket = JSON.parse(raw);
      if(!paket || !paket.ts || (Date.now() - paket.ts) > CACHE_TTL){
        localStorage.removeItem(cacheKey(yil, ay));
        return null;
      }
      return paket.doc || null;
    }catch(_){ return null; }
  }

  function cacheYaz(yil, ay, doc){
    try{
      if(!doc){
        localStorage.removeItem(cacheKey(yil, ay));
        return;
      }
      localStorage.setItem(cacheKey(yil, ay), JSON.stringify({ ts: Date.now(), doc }));
    }catch(_){ }
  }

  function yukleniyorCiz(){
    const hedef = document.getElementById('devamsizlikCizelgesiIcerik');
    if(!hedef || hedef.children.length) return;
    const toolbar = typeof window._devamsizlikToolbarHtml === 'function' ? window._devamsizlikToolbarHtml() : '';
    hedef.innerHTML = toolbar + `
      <div class="dc-runtime-yukleniyor" style="padding:26px 18px;text-align:center;border:1px solid var(--border);border-radius:16px;color:var(--ink-muted);">
        <div style="font-weight:800;color:var(--ink);margin-bottom:5px;">Çizelge hazırlanıyor</div>
        <div style="font-size:12px;">Yerel kayıt gösteriliyor, güncel veri arka planda kontrol ediliyor.</div>
      </div>`;
  }

  function repositorySar(){
    const repo = window.DevamsizlikCizelgesiRepository;
    if(!repo || repo.__localFirstSarildi || typeof repo.ayDinle !== 'function') return false;
    repo.__localFirstSarildi = true;
    const asilAyDinle = repo.ayDinle.bind(repo);

    repo.ayDinle = function(yil, ay, callback, hataCb){
      const yerel = cacheOku(yil, ay);
      if(yerel){
        try{ callback(yerel, true); }catch(_){ }
      }
      return asilAyDinle(yil, ay, function(doc, fromCache){
        // Sunucudan kesin cevap geldiğinde yerel kopyayı güncelle veya temizle.
        if(!fromCache) cacheYaz(yil, ay, doc);
        callback(doc, fromCache);
      }, hataCb);
    };
    return true;
  }

  function baglantiFonksiyonunuSar(){
    if(window.__devamsizlikBaglantiSarildi || typeof window.devamsizlikBaglantilariKur !== 'function') return false;
    window.__devamsizlikBaglantiSarildi = true;
    const asil = window.devamsizlikBaglantilariKur;
    window.devamsizlikBaglantilariKur = function(){
      yukleniyorCiz();
      return asil.apply(this, arguments);
    };
    return true;
  }

  function aktifEkraniKurtar(){
    const hedef = document.getElementById('devamsizlikCizelgesiIcerik');
    if(!hedef || hedef.children.length) return;
    yukleniyorCiz();
    if(typeof window._devamsizlikAyDinle === 'function'){
      try{ window._devamsizlikAyDinle(); }catch(_){ }
    }
  }

  function kur(){
    const a = repositorySar();
    const b = baglantiFonksiyonunuSar();
    aktifEkraniKurtar();
    return a && b;
  }

  if(!kur()){
    const timer = setInterval(function(){
      if(kur()) clearInterval(timer);
    },100);
    setTimeout(function(){ clearInterval(timer); aktifEkraniKurtar(); },12000);
  }
})();
