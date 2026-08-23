/* ================================================================
   js/core/repositories/odev-not-cizelgeleri.repository.js
   ÖDEV TAKİP + NOT ÇİZELGESİ — TEK FIRESTORE ERİŞİM NOKTASI
   ================================================================ */

const OdevNotCizelgeleriRepository = {
  _cacheKey(tip, aktifUid, adminMi){
    return `koruk_onc_${tip}_${aktifUid || 'anon'}_${adminMi ? 'admin' : 'user'}_v1`;
  },

  _cacheOku(tip, aktifUid, adminMi){
    try{
      const ham = localStorage.getItem(this._cacheKey(tip, aktifUid, adminMi));
      if(!ham) return null;
      const paket = JSON.parse(ham);
      if(!paket || !Array.isArray(paket.kayitlar)) return null;
      return paket.kayitlar;
    }catch(e){
      console.warn('[ONC cache] okunamadı', e);
      return null;
    }
  },

  _cacheYaz(tip, aktifUid, adminMi, kayitlar){
    try{
      localStorage.setItem(this._cacheKey(tip, aktifUid, adminMi), JSON.stringify({
        tarih: Date.now(),
        kayitlar: Array.isArray(kayitlar) ? kayitlar : []
      }));
    }catch(e){
      console.warn('[ONC cache] yazılamadı', e);
    }
  },

  /**
   * Local-first dinleme:
   * 1) Aynı kullanıcı/rol için daha önce alınmış kayıtları senkron olarak döndürür.
   * 2) Firestore snapshot geldiğinde gerçek kaynakla uzlaştırır ve cache'i yeniler.
   * Böylece eski çizelgeler ekran açılışında Firestore beklemez.
   */
  kayitlariDinle(tip, aktifUid, adminMi, callback, hataCb){
    const cache = this._cacheOku(tip, aktifUid, adminMi);
    if(cache !== null){
      try{ callback(cache, { kaynak: 'local-cache' }); }catch(e){ console.warn('[ONC cache callback]', e); }
    }

    let ref = db.collection(COL[tip]);
    if(!adminMi){
      ref = ref.where('sahipUid', '==', aktifUid);
    }
    return ref.onSnapshot(
      s => {
        const kayitlar = s.docs.map(d => ({ id: d.id, ...d.data() }));
        this._cacheYaz(tip, aktifUid, adminMi, kayitlar);
        callback(kayitlar, { kaynak: 'firestore' });
      },
      err => {
        if(cache === null){
          (hataCb || hataGoster)(err);
        }else{
          console.warn('[ONC] Firestore güncellemesi alınamadı; yerel kayıtlar gösteriliyor.', err);
        }
      }
    );
  },

  kayitEkle(tip, veri){
    return db.collection(COL[tip]).add({ ...veri, olusturmaTarihi: new Date().toISOString() });
  },
  kayitGuncelle(tip, id, veri){
    return db.collection(COL[tip]).doc(id).update(veri);
  },
  kayitSil(tip, id){
    return db.collection(COL[tip]).doc(id).delete();
  },
  hucreGuncelle(tip, id, hucreAnahtari, deger){
    return db.collection(COL[tip]).doc(id).update({ ['hucreler.' + hucreAnahtari]: deger });
  },
  alanGuncelle(tip, id, alanAdi, deger){
    return db.collection(COL[tip]).doc(id).update({ [alanAdi]: deger });
  },
  taslakKaydet(tip, id, sutunlar, ogrenciler, hucreler){
    return db.collection(COL[tip]).doc(id).update({ sutunlar, ogrenciler, hucreler });
  }
};
