/* Koruk Asistan — Yazılı Sınavlar Modern v1 */
(function(){
  'use strict';

  function gunFarki(iso){
    if(!iso) return null;
    const bugun=new Date(); bugun.setHours(0,0,0,0);
    const d=new Date(iso+'T00:00:00');
    if(Number.isNaN(d.getTime())) return null;
    return Math.round((d-bugun)/86400000);
  }

  function ozetGuncelle(root){
    let toplam=0,yaklasan=0,bugun=0;
    try{
      if(typeof sinavlar!=='undefined' && Array.isArray(sinavlar)){
        toplam=sinavlar.length;
        sinavlar.forEach(function(s){
          const f=gunFarki(s.tarih);
          if(f===0) bugun++;
          if(f!==null && f>=0 && f<=7) yaklasan++;
        });
      }else{
        toplam=root.querySelectorAll('#sinavlarListesi .evrak-row').length;
      }
    }catch(e){ toplam=root.querySelectorAll('#sinavlarListesi .evrak-row').length; }
    const a=root.querySelector('[data-ys-stat="toplam"] b');
    const b=root.querySelector('[data-ys-stat="yaklasan"] b');
    const c=root.querySelector('[data-ys-stat="bugun"] b');
    if(a) a.textContent=toplam;
    if(b) b.textContent=yaklasan;
    if(c) c.textContent=bugun;
  }

  function toolbarDuzenle(root){
    const kart=root.querySelector('#sinavYaziliBolum > .card');
    if(!kart) return;
    const toolbar=kart.firstElementChild;
    if(toolbar && toolbar.querySelector('button')) toolbar.classList.add('ys-toolbar');
  }

  function sayfaKur(){
    const root=document.getElementById('tab-yaziliSinavlar');
    if(!root) return false;
    if(!root.classList.contains('ys-modern')) root.classList.add('ys-modern');

    const title=root.querySelector(':scope > .page-header .page-title');
    const sub=root.querySelector(':scope > .page-header .page-sub');
    if(title) title.textContent='Yazılı Sınavlar';
    if(sub) sub.textContent='Sınav takvimini, sınıfları ve sınav ayrıntılarını tek ekrandan yönetin.';

    if(!root.querySelector('.ys-summary')){
      const summary=document.createElement('div');
      summary.className='ys-summary';
      summary.innerHTML='\
        <div class="ys-stat" data-ys-stat="toplam"><b>0</b><span>Toplam sınav</span></div>\
        <div class="ys-stat" data-ys-stat="yaklasan"><b>0</b><span>7 gün içinde</span></div>\
        <div class="ys-stat" data-ys-stat="bugun"><b>0</b><span>Bugün</span></div>';
      const yazili=root.querySelector('#sinavYaziliBolum');
      if(yazili) root.insertBefore(summary,yazili);
    }

    toolbarDuzenle(root);
    ozetGuncelle(root);

    const liste=root.querySelector('#sinavlarListesi');
    if(liste && liste.dataset.ysObserver!=='1'){
      liste.dataset.ysObserver='1';
      new MutationObserver(function(){ozetGuncelle(root);}).observe(liste,{childList:true,subtree:true});
    }
    return true;
  }

  function baslat(){
    if(sayfaKur()) return;
    const obs=new MutationObserver(function(){if(sayfaKur()) obs.disconnect();});
    obs.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(function(){obs.disconnect();sayfaKur();},8000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true}); else baslat();
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-tab="yaziliSinavlar"],#bnMenuBtn')) setTimeout(sayfaKur,60);
  },true);
})();
