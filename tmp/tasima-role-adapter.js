/* === TASIMA ROLE UI v1 === */
(function(){
  'use strict';

  function tasimaDuzenlemeYetkiliMi(){
    try{
      if (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI?.admin) return true;
      if (typeof duzenleyebilir === 'function') return !!duzenleyebilir('tasima');
    }catch(_){ }
    return false;
  }
  window.tasimaDuzenlemeYetkiliMi = tasimaDuzenlemeYetkiliMi;
  window.tasimaSaltOkumaMi = function(){ return !tasimaDuzenlemeYetkiliMi(); };

  function tasimaModalSinifiTemizle(){
    const ov = document.getElementById('modalOverlay');
    if(!ov) return;
    ov.classList.remove('tasima-yonetim-modal','tasima-oturma-modal','tasima-oturma-readonly');
  }

  function tasimaModalIsaretle(sinif){
    const ov = document.getElementById('modalOverlay');
    if(!ov) return;
    tasimaModalSinifiTemizle();
    ov.classList.add(sinif);
  }

  function tasimaSayfaRolunuUygula(){
    const tab = document.getElementById('tab-tasima');
    if(!tab) return;
    const salt = !tasimaDuzenlemeYetkiliMi();
    tab.classList.toggle('tasima-readonly', salt);
    tab.classList.add('tasima-modern-ui');

    if(salt){
      const yazmaKaliplari = [
        'servisModalAc(',
        'servisOgrenciEkleModalAc(',
        'servisOgrenciExcelIceAktarModalAc(',
        'servisOgrenciExceliIceAktar(',
        'servisListeOlusturModalAc('
      ];
      tab.querySelectorAll('button,[role="button"],a').forEach(el=>{
        const oc = el.getAttribute('onclick') || '';
        if(yazmaKaliplari.some(k=>oc.includes(k))){
          el.dataset.tasimaRoleHidden = '1';
          el.hidden = true;
        }
      });
    }else{
      tab.querySelectorAll('[data-tasima-role-hidden="1"]').forEach(el=>{
        el.hidden = false;
        el.removeAttribute('data-tasima-role-hidden');
      });
    }
  }

  function tasimaDetayRolunuUygula(servisId){
    const body = document.getElementById('detayBody');
    const ov = document.getElementById('detayOverlay');
    if(!body || !ov) return;
    const salt = !tasimaDuzenlemeYetkiliMi();
    body.classList.add('tasima-detay-body');
    ov.classList.add('tasima-detay-overlay');
    ov.classList.toggle('tasima-readonly', salt);

    const duzenle = document.getElementById('detayDuzenleBtn');
    const rapor = document.getElementById('detayRaporBtn');
    if(duzenle) duzenle.hidden = salt;
    if(rapor) rapor.hidden = salt;

    body.querySelectorAll('.detay-card-actions').forEach(el=>el.hidden = salt);
    body.querySelectorAll('.btn-takip-cizelge,.btn-denetim-formu').forEach(el=>el.hidden = salt);
    if(salt){
      body.querySelectorAll('button,[role="button"],a').forEach(el=>{
        const oc = el.getAttribute('onclick') || '';
        if(/servisOgrenci|servisListeOlustur|servisModalAc/.test(oc)) el.hidden = true;
      });
    }

    const bilgiKart = body.querySelector('.detay-card');
    if(bilgiKart && !bilgiKart.querySelector('.tasima-oturma-preview-btn')){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tasima-oturma-preview-btn';
      btn.innerHTML = '<span class="tasima-oturma-preview-ikon">💺</span><span><strong>Servis Oturma Planı</strong><small>'+(salt?'Önizlemeyi aç':'Planı görüntüle ve yönet')+'</small></span><span class="tasima-preview-ok">›</span>';
      btn.addEventListener('click', function(){
        if(typeof servisOturmaModalAc === 'function') servisOturmaModalAc(servisId);
      });
      bilgiKart.appendChild(btn);
    }
  }

  function tasimaOturmaRolunuUygula(){
    const ov = document.getElementById('modalOverlay');
    const wrap = document.querySelector('#modalOverlay .so-modal-wrap');
    if(!ov || !wrap) return;
    const salt = !tasimaDuzenlemeYetkiliMi();
    tasimaModalIsaretle('tasima-oturma-modal');
    ov.classList.toggle('tasima-oturma-readonly', salt);
    wrap.classList.toggle('so-readonly-preview', salt);

    if(salt){
      wrap.querySelectorAll('.so-sablon-grup,.so-duzenle-satir,#soDuzenleToolbar,.so-alt-butonlar,.sye-ozel-olusturucu').forEach(el=>el.hidden=true);
      const kaydet = document.getElementById('modalKaydetBtn');
      const sil = document.getElementById('modalSilBtn');
      if(kaydet) kaydet.hidden = true;
      if(sil) sil.hidden = true;

      if(!wrap.querySelector('.tasima-readonly-banner')){
        const b = document.createElement('div');
        b.className = 'tasima-readonly-banner';
        b.innerHTML = '<span>👁️</span><span><strong>Oturma Planı Önizleme</strong><small>Bu görünüm salt okunurdur.</small></span>';
        const hero = wrap.querySelector('#soHeroKart');
        if(hero?.parentNode) hero.parentNode.insertBefore(b, hero.nextSibling);
        else wrap.prepend(b);
      }
    }
  }

  function wrapFn(ad, factory){
    const fn = window[ad];
    if(typeof fn !== 'function' || fn.__tasimaRoleWrapped) return false;
    const yeni = factory(fn);
    yeni.__tasimaRoleWrapped = true;
    window[ad] = yeni;
    return true;
  }

  function engelliYazmaFonksiyonlariniSar(){
    const yazmaFns = [
      'soSablonSec','soDuzenlemeToggle','soDuzenlemeKaydet','soDuzenlemeVazgec',
      'soTumunuTemizle','soYuvaAktifEt','soKoltukTikla','soKaydet',
      'sozelSiraEkle','sozelSonSiraSil','sozelTumunuSil'
    ];
    yazmaFns.forEach(ad=>wrapFn(ad, eski=>function(){
      if(!tasimaDuzenlemeYetkiliMi()) return;
      return eski.apply(this, arguments);
    }));
  }

  function anaFonksiyonlariSar(){
    wrapFn('renderServisler', eski=>function(){
      const r = eski.apply(this, arguments);
      requestAnimationFrame(tasimaSayfaRolunuUygula);
      return r;
    });

    wrapFn('servisDetayAc', eski=>function(id){
      const r = eski.apply(this, arguments);
      requestAnimationFrame(()=>tasimaDetayRolunuUygula(id));
      setTimeout(()=>tasimaDetayRolunuUygula(id),80);
      return r;
    });

    ['servisModalAc','servisOgrenciEkleModalAc','servisOgrenciExcelIceAktarModalAc'].forEach(ad=>{
      wrapFn(ad, eski=>function(){
        if(!tasimaDuzenlemeYetkiliMi()) return;
        const r = eski.apply(this, arguments);
        requestAnimationFrame(()=>tasimaModalIsaretle('tasima-yonetim-modal'));
        return r;
      });
    });

    wrapFn('servisListeOlusturModalAc', eski=>function(){
      if(!tasimaDuzenlemeYetkiliMi()) return;
      const r = eski.apply(this, arguments);
      requestAnimationFrame(()=>tasimaModalIsaretle('tasima-yonetim-modal'));
      return r;
    });

    wrapFn('servisOturmaModalAc', eski=>function(servisId){
      const r = eski.apply(this, arguments);
      requestAnimationFrame(tasimaOturmaRolunuUygula);
      setTimeout(tasimaOturmaRolunuUygula,90);
      return r;
    });

    wrapFn('modalKapat', eski=>function(){
      const r = eski.apply(this, arguments);
      setTimeout(tasimaModalSinifiTemizle,0);
      return r;
    });
  }

  function kur(){
    anaFonksiyonlariSar();
    engelliYazmaFonksiyonlariniSar();
    tasimaSayfaRolunuUygula();
  }

  let deneme=0;
  const t=setInterval(()=>{
    kur();
    if(++deneme>120) clearInterval(t);
  },250);
  document.addEventListener('DOMContentLoaded', kur);
  window.addEventListener('load', ()=>setTimeout(kur,100));

  let obsBekliyor=false;
  const obs=new MutationObserver(()=>{
    if(obsBekliyor) return;
    obsBekliyor=true;
    requestAnimationFrame(()=>{
      obsBekliyor=false;
      tasimaSayfaRolunuUygula();
      const ov=document.getElementById('modalOverlay');
      if(ov && !ov.classList.contains('active') && !ov.classList.contains('show')) tasimaModalSinifiTemizle();
    });
  });
  document.addEventListener('DOMContentLoaded',()=>obs.observe(document.body,{subtree:true,childList:true}));
})();
