/* Koruk Asistan — Deneme Sınavları Modern v3 */
(function(){
  'use strict';
  var _dnCanliUnsub=null;

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

  function denemeSiraliListe(){
    if(typeof denemeSinavlari==='undefined' || !Array.isArray(denemeSinavlari)) return [];
    var t=new Date(); t.setHours(0,0,0,0);
    var bugunIso=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
    return denemeSinavlari.slice().sort(function(a,b){
      var at=a.tarih||'', bt=b.tarih||'';
      var ag=at>=bugunIso, bg=bt>=bugunIso;
      if(ag!==bg) return ag?-1:1;
      if(ag) return at.localeCompare(bt) || String(b.eklenmeTarihi||'').localeCompare(String(a.eklenmeTarihi||''));
      return bt.localeCompare(at) || String(b.eklenmeTarihi||'').localeCompare(String(a.eklenmeTarihi||''));
    });
  }

  function kartIdBul(kart){
    var fn=kart.getAttribute('onclick')||'';
    var m=fn.match(/denemeSayacAc\(['\"]([^'\"]+)['\"]\)/);
    return m?m[1]:'';
  }

  function listeyiSirala(root){
    if(!root) return;
    var liste=root.querySelector('#denemeSinavlariListesi');
    if(!liste) return;
    var kartlar=Array.prototype.slice.call(liste.querySelectorAll('.dn-kart'));
    if(kartlar.length<2) return;
    var harita={};
    kartlar.forEach(function(k){var id=kartIdBul(k);if(id)harita[id]=k;});
    denemeSiraliListe().forEach(function(d){if(harita[d.id])liste.appendChild(harita[d.id]);});
  }

  function ozetGuncelle(root){
    if(!root) return;
    var toplam=0,yaklasan=0,aktif=0;
    if(typeof denemeSinavlari!=='undefined' && Array.isArray(denemeSinavlari)){
      toplam=denemeSinavlari.length;
      denemeSinavlari.forEach(function(d){
        var f=gunFarki(d.tarih);
        if(f!==null && f>=0 && f<=7) yaklasan++;
        if(d.sayacDurumu && d.sayacDurumu.aktif) aktif++;
      });
    }
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
    root.classList.add('dn-modern');
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
    if(kart){var tb=kart.firstElementChild;if(tb&&tb.querySelector('button'))tb.classList.add('dn-toolbar');}
    veriGorunumunuYenile();
    return true;
  }

  /* Ana sinavBaglantilariKur zamanlamasından bağımsız, gerçek Firestore koleksiyonunu
     bu ekran için tek ek listener ile canlı tut. Yeni kayıt eklenince tüm snapshot
     gelir; eski kartın geri dönmesi / ilk açılışta 0 görünmesi bu katmanda engellenir. */
  function canliVeriyiKur(){
    if(_dnCanliUnsub || typeof SinavlarRepository==='undefined' || !SinavlarRepository.denemeSinavlariniDinle) return;
    _dnCanliUnsub=SinavlarRepository.denemeSinavlariniDinle(function(v){
      denemeSinavlari=Array.isArray(v)?v:[];
      if(typeof renderDenemeSinavlari==='function') renderDenemeSinavlari();
      requestAnimationFrame(function(){sayfaKur();veriGorunumunuYenile();});
    },function(err){ console.warn('[Deneme] canlı veri dinleme hatası',err); });
  }

  function ton(m){
    m=String(m||'').toLocaleLowerCase('tr');
    if(m.includes('oturum')||m.includes('sınav süresi')||m.includes('başlama'))return 'violet';
    if(m.includes('tarih')||m.includes('bitiş')||m.includes('başlaması'))return 'cyan';
    if(m.includes('sınıf')||m.includes('not'))return 'amber';
    return 'blue';
  }

  function denemeModalTasarimla(){
    var ad=document.getElementById('f_dnAd');
    if(!ad) return false;
    var overlay=document.getElementById('modalOverlay') || ad.closest('.modal-overlay');
    var modal=ad.closest('.modal') || (overlay&&overlay.querySelector('.modal'));
    var body=document.getElementById('modalBody') || (modal&&modal.querySelector('.modal-body')) || ad.closest('.modal-content');
    if(overlay) overlay.classList.add('dn-exam-overlay');
    if(modal) modal.classList.add('dn-exam-modal');
    if(!body) return true;
    body.classList.add('dn-exam-body');
    if(!body.querySelector('.dn-intro')){
      var intro=document.createElement('div'); intro.className='dn-intro';
      var bas=(document.getElementById('modalTitle')?.textContent||'').toLocaleLowerCase('tr');
      intro.innerHTML='<div class="dn-intro-icon">⌛</div><div><strong>'+(bas.includes('düzenle')?'Deneme sınavını güncelle':'Yeni deneme sınavı oluştur')+'</strong><span>Oturum saatlerini, sınıfları ve süreleri tek formda düzenleyin. Bitiş saatleri otomatik hesaplanır.</span></div>';
      body.insertBefore(intro,body.firstChild);
    }
    body.querySelectorAll('.form-row').forEach(function(r){r.classList.add('dn-form-row');});
    body.querySelectorAll('.form-group').forEach(function(g){g.classList.add('dn-form-group');var l=g.querySelector(':scope > label')||g.querySelector('label');g.dataset.dnTone=ton(l?l.textContent:'');});
    body.querySelectorAll('.dnSinifCb').forEach(function(cb){var l=cb.closest('label');if(l)l.classList.add('dn-class-chip');});
    return true;
  }

  function sayacKur(){var ov=document.getElementById('denemeSayacOv');if(!ov)return false;ov.classList.add('dn-modern-counter','dn-counter-v3');return true;}

  function izle(){
    if(document.documentElement.dataset.dnModernObs==='3') return;
    document.documentElement.dataset.dnModernObs='3';
    new MutationObserver(function(){setTimeout(function(){denemeModalTasarimla();sayacKur();sayfaKur();canliVeriyiKur();},0);}).observe(document.body,{childList:true,subtree:true});
  }

  function baslat(){sayfaKur();canliVeriyiKur();izle();[150,500,1200].forEach(function(ms){setTimeout(function(){sayfaKur();canliVeriyiKur();veriGorunumunuYenile();},ms);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat,{once:true});else baslat();
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-tab="denemeSinavlari"]'))setTimeout(function(){sayfaKur();canliVeriyiKur();veriGorunumunuYenile();},30);
    if(e.target.closest('[onclick*="denemeModalAc"]'))setTimeout(denemeModalTasarimla,30);
    if(e.target.closest('[onclick*="denemeSayacAc"],#denemeSinavlariListesi .dn-kart'))setTimeout(sayacKur,10);
  },true);
})();