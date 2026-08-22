/* Koruk Asistan — Deneme Sınavları Modern v1 */
(function(){
  'use strict';

  function gunFarki(iso){
    if(!iso) return null;
    var t=new Date(); t.setHours(0,0,0,0);
    var d=new Date(iso+'T00:00:00');
    if(isNaN(d.getTime())) return null;
    return Math.round((d-t)/86400000);
  }

  function ozetGuncelle(root){
    var toplam=0,yaklasan=0,aktif=0;
    try{
      if(typeof denemeSinavlari!=='undefined' && Array.isArray(denemeSinavlari)){
        toplam=denemeSinavlari.length;
        denemeSinavlari.forEach(function(d){
          var f=gunFarki(d.tarih);
          if(f!==null && f>=0 && f<=7) yaklasan++;
          if(d.sayacDurumu && d.sayacDurumu.aktif) aktif++;
        });
      }else toplam=root.querySelectorAll('#denemeSinavlariListesi .dn-kart').length;
    }catch(e){ toplam=root.querySelectorAll('#denemeSinavlariListesi .dn-kart').length; }
    [['toplam',toplam],['yaklasan',yaklasan],['aktif',aktif]].forEach(function(x){var el=root.querySelector('[data-dn-stat="'+x[0]+'"] b');if(el)el.textContent=x[1];});
  }

  function sayfaKur(){
    var root=document.getElementById('tab-denemeSinavlari');
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
    var liste=root.querySelector('#denemeSinavlariListesi');
    if(liste && liste.dataset.dnObs!=='1'){
      liste.dataset.dnObs='1';
      new MutationObserver(function(){ozetGuncelle(root);}).observe(liste,{childList:true,subtree:true});
    }
    ozetGuncelle(root);
    return true;
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
      var intro=document.createElement('div');
      intro.className='dn-intro';
      var bas=(document.getElementById('modalTitle')?.textContent||'').toLocaleLowerCase('tr');
      intro.innerHTML='<div class="dn-intro-icon">⌛</div><div><strong>'+(bas.includes('düzenle')?'Deneme sınavını güncelle':'Yeni deneme sınavı oluştur')+'</strong><span>Oturum saatlerini, sınıfları ve süreleri tek formda düzenleyin. Bitiş saatleri otomatik hesaplanır.</span></div>';
      body.insertBefore(intro,body.firstChild);
    }
    body.querySelectorAll('.form-row').forEach(function(r){r.classList.add('dn-form-row');});
    body.querySelectorAll('.form-group').forEach(function(g){
      g.classList.add('dn-form-group');
      var l=g.querySelector(':scope > label')||g.querySelector('label');
      g.dataset.dnTone=ton(l?l.textContent:'');
    });
    body.querySelectorAll('.dnSinifCb').forEach(function(cb){var l=cb.closest('label');if(l)l.classList.add('dn-class-chip');});
    var footer=modal&&(modal.querySelector('.modal-footer')||modal.querySelector('.modal-actions')||modal.querySelector('.modal-buttons'));
    if(footer) footer.classList.add('dn-exam-footer');
    return true;
  }

  function sayaçKur(){
    var ov=document.getElementById('denemeSayacOv');
    if(!ov) return false;
    ov.classList.add('dn-modern-counter');
    return true;
  }

  function izle(){
    if(document.documentElement.dataset.dnModernObs==='1') return;
    document.documentElement.dataset.dnModernObs='1';
    new MutationObserver(function(){
      setTimeout(function(){denemeModalTasarimla();sayaçKur();sayfaKur();},0);
    }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  }

  function baslat(){
    sayfaKur();
    izle();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat,{once:true});else baslat();
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-tab="denemeSinavlari"]'))setTimeout(sayfaKur,50);
    if(e.target.closest('[onclick*="denemeModalAc"]'))setTimeout(denemeModalTasarimla,40);
    if(e.target.closest('[onclick*="denemeSayacAc"],#denemeSinavlariListesi .dn-kart'))setTimeout(sayaçKur,20);
  },true);
})();