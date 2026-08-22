/* Koruk Asistan — Yazılı Sınavlar Modern v4 */
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
      }else toplam=root.querySelectorAll('#sinavlarListesi .evrak-row').length;
    }catch(e){ toplam=root.querySelectorAll('#sinavlarListesi .evrak-row').length; }
    const a=root.querySelector('[data-ys-stat="toplam"] b');
    const b=root.querySelector('[data-ys-stat="yaklasan"] b');
    const c=root.querySelector('[data-ys-stat="bugun"] b');
    if(a) a.textContent=toplam;if(b) b.textContent=yaklasan;if(c) c.textContent=bugun;
  }

  function toolbarDuzenle(root){
    const kart=root.querySelector('#sinavYaziliBolum > .card');
    if(!kart) return;
    const toolbar=kart.firstElementChild;
    if(toolbar && toolbar.querySelector('button')) toolbar.classList.add('ys-toolbar');
  }

  function alanTonu(metin){
    metin=String(metin||'').toLocaleLowerCase('tr');
    if(metin.includes('sınıf')) return 'violet';
    if(metin.includes('dönem')||metin.includes('yazılı sırası')) return 'blue';
    if(metin.includes('ders')||metin.includes('öğretmen')) return 'teal';
    if(metin.includes('tarih')) return 'cyan';
    if(metin.includes('senaryo')||metin.includes('yayınevi')) return 'amber';
    if(metin.includes('not')) return 'violet';
    return 'blue';
  }

  function important(el,prop,val){ if(el) el.style.setProperty(prop,val,'important'); }

  function sinavModalTasarimla(){
    const ders=document.getElementById('f_snDers');
    const donem=document.getElementById('f_snDonem');
    if(!ders || !donem) return false;

    const overlay=document.getElementById('modalOverlay') || ders.closest('.modal-overlay');
    const modal=ders.closest('.modal') || (overlay && overlay.querySelector('.modal'));
    if(overlay) overlay.classList.add('ys-exam-overlay');
    if(modal) modal.classList.add('ys-exam-modal');

    const titleEl=document.getElementById('modalTitle') || (modal && modal.querySelector('.modal-title'));
    const dark=document.documentElement.getAttribute('data-theme')==='dark';
    if(titleEl){
      titleEl.classList.add('ys-exam-title');
      important(titleEl,'color',dark?'#f7f9fd':'#16213a');
      const titleWrap=titleEl.parentElement;
      if(titleWrap && modal && titleWrap!==modal && modal.contains(titleWrap)){
        titleWrap.classList.add('ys-exam-header');
        important(titleWrap,'background',dark?'linear-gradient(135deg,#101827 0%,#17213a 58%,#211a3b 100%)':'linear-gradient(135deg,#eef4ff 0%,#edf2ff 55%,#f3efff 100%)');
        important(titleWrap,'border-bottom-color',dark?'#29313e':'#d8e1ee');
      }
    }

    const body=document.getElementById('modalBody') || (modal && modal.querySelector('.modal-body')) || ders.closest('.modal-content') || ders.parentElement;
    if(!body) return true;
    body.classList.add('ys-exam-modal-body');

    if(!body.querySelector('.ys-modal-intro')){
      const intro=document.createElement('div');
      intro.className='ys-modal-intro';
      const baslik=(titleEl?.textContent || '').toLocaleLowerCase('tr');
      const duzenleme=baslik.includes('düzenle');
      intro.innerHTML='<div class="ys-modal-intro-icon">✓</div><div><strong>'+(duzenleme?'Sınav kaydını güncelle':'Yeni yazılı sınav oluştur')+'</strong><span>Sınıf, ders, tarih ve sınav ayrıntılarını düzenli biçimde tamamlayın.</span></div>';
      body.insertBefore(intro,body.firstChild);
    }

    body.querySelectorAll('.form-group').forEach(function(grup){
      grup.classList.add('ys-form-group');
      const label=grup.querySelector(':scope > label') || grup.querySelector('label');
      const metin=label ? label.textContent.trim() : '';
      grup.dataset.ysTone=alanTonu(metin);
      if(label){
        label.classList.add('ys-field-label');
        const ops=label.querySelector('span');
        if(ops && ops.textContent.toLocaleLowerCase('tr').includes('isteğe bağlı')) ops.classList.add('ys-optional');
      }
    });
    body.querySelectorAll('.form-row').forEach(function(row){ row.classList.add('ys-form-row'); });

    const ilkCb=body.querySelector('.snSinifCb');
    if(ilkCb){
      const grup=ilkCb.closest('.form-group');
      if(grup){
        const picker=[].slice.call(grup.children).find(function(el){return el.tagName==='DIV' && el.querySelector('.snSinifCb');});
        if(picker) picker.classList.add('ys-class-picker');
      }
      body.querySelectorAll('.snSinifCb').forEach(function(cb){const lbl=cb.closest('label');if(lbl) lbl.classList.add('ys-class-chip');});
    }

    const notlar=document.getElementById('f_snNotlar');
    if(notlar) notlar.setAttribute('placeholder','Sınavla ilgili kısa bir not ekleyin…');

    const footer=(modal && (modal.querySelector('.modal-footer')||modal.querySelector('.modal-actions')||modal.querySelector('.modal-buttons'))) || document.getElementById('modalFooter');
    if(footer) footer.classList.add('ys-exam-footer');

    /* Android / mobil: başlık ve alt butonlar sabit, orta içerik tek başına kayar. */
    if(modal){
      important(modal,'display','flex');
      important(modal,'flex-direction','column');
      important(modal,'overflow','hidden');
      if(window.matchMedia('(max-width:640px)').matches){
        important(modal,'height','calc(100dvh - 96px)');
        important(modal,'max-height','calc(100dvh - 96px)');
      }else{
        important(modal,'max-height','min(90dvh,820px)');
      }
    }
    important(body,'flex','1 1 auto');
    important(body,'min-height','0');
    important(body,'height','auto');
    important(body,'overflow-y','auto');
    important(body,'overflow-x','hidden');
    important(body,'overscroll-behavior','contain');
    important(body,'touch-action','pan-y');
    body.style.setProperty('-webkit-overflow-scrolling','touch','important');
    if(footer) important(footer,'flex','0 0 auto');
    return true;
  }

  function sayfaKur(){
    const root=document.getElementById('tab-yaziliSinavlar');
    if(!root) return false;
    root.classList.add('ys-modern');
    const title=root.querySelector(':scope > .page-header .page-title');
    const sub=root.querySelector(':scope > .page-header .page-sub');
    if(title) title.textContent='Yazılı Sınavlar';
    if(sub) sub.textContent='Sınav takvimini, sınıfları ve sınav ayrıntılarını tek ekrandan yönetin.';
    if(!root.querySelector('.ys-summary')){
      const summary=document.createElement('div');summary.className='ys-summary';
      summary.innerHTML='<div class="ys-stat" data-ys-stat="toplam"><b>0</b><span>Toplam sınav</span></div><div class="ys-stat" data-ys-stat="yaklasan"><b>0</b><span>7 gün içinde</span></div><div class="ys-stat" data-ys-stat="bugun"><b>0</b><span>Bugün</span></div>';
      const yazili=root.querySelector('#sinavYaziliBolum');if(yazili) root.insertBefore(summary,yazili);
    }
    toolbarDuzenle(root);ozetGuncelle(root);
    const liste=root.querySelector('#sinavlarListesi');
    if(liste && liste.dataset.ysObserver!=='1'){
      liste.dataset.ysObserver='1';new MutationObserver(function(){ozetGuncelle(root);}).observe(liste,{childList:true,subtree:true});
    }
    return true;
  }

  function modalIzle(){
    const hedef=document.getElementById('modalOverlay') || document.body;
    if(hedef.dataset && hedef.dataset.ysModalObserver==='1') return;
    if(hedef.dataset) hedef.dataset.ysModalObserver='1';
    new MutationObserver(function(){ setTimeout(sinavModalTasarimla,0); }).observe(hedef,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  }

  function baslat(){
    if(!sayfaKur()){
      const obs=new MutationObserver(function(){if(sayfaKur()) obs.disconnect();});
      obs.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(function(){obs.disconnect();sayfaKur();},8000);
    }
    modalIzle();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true}); else baslat();
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-tab="yaziliSinavlar"],#bnMenuBtn')) setTimeout(sayfaKur,60);
    if(e.target.closest('#tab-yaziliSinavlar button,[onclick*="sinavModalAc"]')) setTimeout(sinavModalTasarimla,30);
  },true);
})();
