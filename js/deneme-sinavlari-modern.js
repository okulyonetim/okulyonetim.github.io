/* Koruk Asistan — Deneme Sınavları Modern v4
 * Görsel katman yalnız mevcut sinavlar.js / SinavlarService verisini kullanır.
 * Ayrı Firestore listener oluşturmaz.
 */
(function(){
  'use strict';
  if(window.__KORUK_DENEME_MODERN_V4__) return;
  window.__KORUK_DENEME_MODERN_V4__ = true;

  function ekKatmanlariYukle(){
    if(!document.querySelector('link[data-dn-fixes]')){
      var l=document.createElement('link');
      l.rel='stylesheet'; l.href='css/deneme-sinavlari-fixes.css?v=1';
      l.setAttribute('data-dn-fixes','1');
      document.head.appendChild(l);
    }
    if(!document.querySelector('script[data-dn-stability]')){
      var s=document.createElement('script');
      s.src='js/deneme-sinavlari-stability.js?v=1';
      s.async=false; s.setAttribute('data-dn-stability','1');
      document.head.appendChild(s);
    }
  }
  ekKatmanlariYukle();

  function rootBul(){
    return document.getElementById('tab-denemeSinavlari') ||
      (document.getElementById('sinavDenemeBolum') && document.getElementById('sinavDenemeBolum').closest('.tab-panel')) ||
      document.getElementById('tab-sinavIslemleri');
  }
  function gunFarki(iso){
    if(!iso) return null;
    var t=new Date(); t.setHours(0,0,0,0);
    var d=new Date(iso+'T00:00:00');
    if(isNaN(d.getTime())) return null;
    return Math.round((d-t)/86400000);
  }
  function durdurulmusMu(id){
    try{return !!window.KorukExamStopState?.isStopped?.(id)}catch(_){return false}
  }
  function liste(){
    try{
      if(typeof denemeSinavlari!=='undefined' && Array.isArray(denemeSinavlari)) return denemeSinavlari;
      return window.KorukRuntimeState?.get?.('denemeSinavlari') || [];
    }catch(_){return []}
  }
  function denemeSiraliListe(){
    var t=new Date(); t.setHours(0,0,0,0);
    var bugunIso=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
    return liste().slice().sort(function(a,b){
      var at=a.tarih||'', bt=b.tarih||'';
      var ag=at>=bugunIso, bg=bt>=bugunIso;
      if(ag!==bg) return ag?-1:1;
      if(ag) return at.localeCompare(bt) || String(b.eklenmeTarihi||'').localeCompare(String(a.eklenmeTarihi||''));
      return bt.localeCompare(at) || String(b.eklenmeTarihi||'').localeCompare(String(a.eklenmeTarihi||''));
    });
  }
  function kartIdBul(kart){
    var fn=kart.getAttribute('onclick')||'';
    var m=fn.match(/denemeSayacAc\(['"]([^'"]+)['"]\)/);
    return m?m[1]:'';
  }
  function listeyiSirala(root){
    var hedef=root?.querySelector('#denemeSinavlariListesi');
    if(!hedef) return;
    var kartlar=Array.prototype.slice.call(hedef.querySelectorAll('.dn-kart'));
    if(kartlar.length<2) return;
    var map={};
    kartlar.forEach(function(k){var id=kartIdBul(k);if(id)map[id]=k;});
    denemeSiraliListe().forEach(function(d){if(map[d.id])hedef.appendChild(map[d.id]);});
  }
  function ozetGuncelle(root){
    if(!root) return;
    var arr=liste(), toplam=arr.length, yaklasan=0, aktif=0;
    arr.forEach(function(d){
      var f=gunFarki(d.tarih);
      if(f!==null && f>=0 && f<=7) yaklasan++;
      if(d.sayacDurumu?.aktif && !durdurulmusMu(d.id)) aktif++;
    });
    [['toplam',toplam],['yaklasan',yaklasan],['aktif',aktif]].forEach(function(x){
      var el=root.querySelector('[data-dn-stat="'+x[0]+'"] b');
      if(el) el.textContent=x[1];
    });
  }
  function veriGorunumunuYenile(){
    var root=rootBul();
    if(!root) return;
    listeyiSirala(root);
    ozetGuncelle(root);
  }
  function sayfaKur(){
    var root=rootBul();
    if(!root) return false;
    root.classList.add('dn-modern','dn-modern-v4');
    var title=root.querySelector(':scope > .page-header .page-title');
    var sub=root.querySelector(':scope > .page-header .page-sub');
    if(title) title.textContent='Deneme Sınavları';
    if(sub) sub.textContent='Deneme takvimini, oturumları ve canlı sınav sayacını tek ekrandan yönetin.';
    if(!root.querySelector('.dn-summary')){
      var sum=document.createElement('div');
      sum.className='dn-summary';
      sum.innerHTML='<div class="dn-stat" data-dn-stat="toplam"><b>0</b><span>Toplam deneme</span></div><div class="dn-stat" data-dn-stat="yaklasan"><b>0</b><span>7 gün içinde</span></div><div class="dn-stat" data-dn-stat="aktif"><b>0</b><span>Aktif sayaç</span></div>';
      var bol=root.querySelector('#sinavDenemeBolum');
      if(bol) root.insertBefore(sum,bol);
    }
    var kart=root.querySelector('#sinavDenemeBolum > .card');
    if(kart){
      var tb=kart.firstElementChild;
      if(tb&&tb.querySelector('button')) tb.classList.add('dn-toolbar');
    }
    veriGorunumunuYenile();
    return true;
  }
  function ton(m){
    m=String(m||'').toLocaleLowerCase('tr');
    if(m.includes('oturum')||m.includes('sınav süresi')||m.includes('başlama')) return 'emerald';
    if(m.includes('tarih')||m.includes('bitiş')||m.includes('başlaması')) return 'cyan';
    if(m.includes('sınıf')||m.includes('not')) return 'amber';
    return 'teal';
  }
  function denemeModalTasarimla(){
    var ad=document.getElementById('f_dnAd');
    if(!ad) return false;
    var overlay=document.getElementById('modalOverlay') || ad.closest('.modal-overlay');
    var modal=ad.closest('.modal') || overlay?.querySelector('.modal');
    var body=document.getElementById('modalBody') || modal?.querySelector('.modal-body') || ad.closest('.modal-content');
    if(overlay) overlay.classList.add('dn-exam-overlay','dn-exam-v4');
    if(modal) modal.classList.add('dn-exam-modal');
    if(!body) return true;
    body.classList.add('dn-exam-body');
    if(!body.querySelector('.dn-intro')){
      var intro=document.createElement('div');
      intro.className='dn-intro';
      var bas=(document.getElementById('modalTitle')?.textContent||'').toLocaleLowerCase('tr');
      intro.innerHTML='<div class="dn-intro-icon">⌛</div><div><strong>'+(bas.includes('düzenle')?'Deneme sınavını güncelle':'Yeni deneme sınavı oluştur')+'</strong><span>Oturum, süre ve sınıf bilgilerini tek formda yönetin.</span></div>';
      body.insertBefore(intro,body.firstChild);
    }
    body.querySelectorAll('.form-row').forEach(function(r){r.classList.add('dn-form-row');});
    body.querySelectorAll('.form-group').forEach(function(g){
      g.classList.add('dn-form-group');
      var l=g.querySelector(':scope > label')||g.querySelector('label');
      g.dataset.dnTone=ton(l?l.textContent:'');
    });
    body.querySelectorAll('.dnSinifCb').forEach(function(cb){
      var l=cb.closest('label'); if(l) l.classList.add('dn-class-chip');
    });
    return true;
  }
  function sayacKur(){
    var ov=document.getElementById('denemeSayacOv');
    if(!ov) return false;
    ov.classList.add('dn-modern-counter','dn-counter-v4');
    return true;
  }
  function baslat(){
    sayfaKur(); denemeModalTasarimla(); sayacKur();
    [120,500,1400].forEach(function(ms){setTimeout(function(){sayfaKur();denemeModalTasarimla();sayacKur();},ms);});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true});
  else baslat();

  document.addEventListener('click',function(e){
    if(e.target.closest('[data-tab="denemeSinavlari"]')) setTimeout(function(){sayfaKur();veriGorunumunuYenile();},30);
    if(e.target.closest('[onclick*="denemeModalAc"]')) setTimeout(denemeModalTasarimla,0);
    if(e.target.closest('[onclick*="denemeSayacAc"],#denemeSinavlariListesi .dn-kart')) setTimeout(sayacKur,0);
  },true);
  window.addEventListener('koruk:data-updated',function(){requestAnimationFrame(function(){sayfaKur();veriGorunumunuYenile();});});
  window.addEventListener('koruk:exam-stop-state',function(){requestAnimationFrame(veriGorunumunuYenile);});
  window.addEventListener('koruk:deneme-sayac-local',function(){requestAnimationFrame(veriGorunumunuYenile);});
})();
