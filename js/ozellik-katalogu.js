/* =====================================================================
   Merkezi Navigasyon Özellik Kataloğu

   Amaç:
   - index.html içindeki data-tab sekmelerini otomatik keşfetmek,
   - JS modüllerinin fonksiyon/overlay hedeflerini kaydedebilmesini sağlamak,
   - Ayarlar > Navigasyon Düzeni > Yeni Öğe Ekle listesini aynı kaynaktan
     beslemek,
   - kaydedilmiş hedefleri tek bir yürütücü üzerinden açmak.

   Yeni standart sekmeler için ekstra kayıt gerekmez: data-tab otomatik bulunur.
   Fonksiyon/overlay tabanlı özellikler AltNav kataloğundan otomatik kaydolur.
   ===================================================================== */
(function(global){
  'use strict';

  const kayitlar = new Map();
  const OZELLIK_ON_EK = '@ozellik:';

  function temizMetin(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }

  function kaydet(tanim){
    if(!tanim || !tanim.id) return null;
    const id = temizMetin(tanim.id);
    if(!id) return null;
    const onceki = kayitlar.get(id) || {};
    const yeni = Object.assign({}, onceki, tanim, { id });
    yeni.ad = temizMetin(yeni.ad || id);
    kayitlar.set(id, yeni);
    return yeni;
  }

  function kaldir(id){ kayitlar.delete(String(id || '')); }

  function domSekmeleriniTopla(){
    if(typeof document === 'undefined') return [];
    const gorulen = new Set();
    const sonuc = [];
    document.querySelectorAll('[data-tab]').forEach(el => {
      const tab = temizMetin(el.getAttribute('data-tab'));
      if(!tab || gorulen.has(tab)) return;
      gorulen.add(tab);
      const labelEl = el.querySelector && el.querySelector('.nt-label');
      const ad = temizMetin((labelEl && labelEl.textContent) || el.getAttribute('data-nav-label') || el.textContent || tab);
      sonuc.push({ id:'tab:'+tab, ad:ad || tab, tip:'sekme', hedef:tab, deger:tab, kaynak:'dom' });
    });
    return sonuc;
  }

  function liste(){
    const sonuc = [];
    const gorulenDeger = new Set();

    domSekmeleriniTopla().forEach(x => {
      if(gorulenDeger.has(x.deger)) return;
      gorulenDeger.add(x.deger);
      sonuc.push(x);
    });

    kayitlar.forEach(k => {
      if(k.navigasyondaGoster === false) return;
      const deger = OZELLIK_ON_EK + k.id;
      if(gorulenDeger.has(deger)) return;
      gorulenDeger.add(deger);
      sonuc.push({
        id:k.id,
        ad:k.ad || k.id,
        tip:k.tip || 'aksiyon',
        hedef:k.hedef || null,
        modul:k.modul || null,
        ikon:k.ikon || null,
        deger,
        kaynak:'katalog'
      });
    });

    return sonuc.sort((a,b) => String(a.ad).localeCompare(String(b.ad), 'tr'));
  }

  function ac(deger){
    deger = temizMetin(deger);
    if(!deger) return false;

    if(!deger.startsWith(OZELLIK_ON_EK)){
      if(typeof global.sekmeAc === 'function'){
        global.sekmeAc(deger);
        return true;
      }
      return false;
    }

    const id = deger.slice(OZELLIK_ON_EK.length);
    const kayit = kayitlar.get(id);
    if(!kayit) return false;

    if(typeof kayit.ac === 'function'){
      kayit.ac();
      return true;
    }
    if(kayit.tip === 'sekme' && kayit.hedef && typeof global.sekmeAc === 'function'){
      global.sekmeAc(kayit.hedef);
      return true;
    }
    if(kayit.tip === 'fonksiyon' && kayit.hedef){
      const fn = temizMetin(kayit.hedef).split('.').reduce((o,k) => o && o[k], global);
      if(typeof fn === 'function'){
        fn();
        return true;
      }
    }
    return false;
  }

  function varMi(deger){
    deger = temizMetin(deger);
    if(!deger) return false;
    if(deger.startsWith(OZELLIK_ON_EK)) return kayitlar.has(deger.slice(OZELLIK_ON_EK.length));
    return domSekmeleriniTopla().some(x => x.deger === deger);
  }

  global.OzellikKatalogu = {
    ON_EK: OZELLIK_ON_EK,
    kaydet,
    kaldir,
    liste,
    ac,
    varMi,
    _kayitlar: kayitlar
  };
})(window);
