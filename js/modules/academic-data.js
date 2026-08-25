/* Koruk Asistan — Academic veri katmanı
 * Sınavlar, yıllık plan, ders saatleri, akademik takvim ve sınav sonuçları
 * repository/service birleşimi. Mevcut global API adları korunur.
 */

const SinavlarRepository = {
  sinavlariDinle(callback, hataCb){
    return db.collection(COL.sinavlar).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  sinavEkle(veri){ return db.collection(COL.sinavlar).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  sinavGuncelle(id, veri){ return db.collection(COL.sinavlar).doc(id).update(veri); },
  sinavSil(id){ return db.collection(COL.sinavlar).doc(id).delete(); },
  denemeSinavlariniDinle(callback, hataCb){
    return db.collection(COL.denemeSinavlari).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  denemeEkle(veri){ return db.collection(COL.denemeSinavlari).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  denemeGuncelle(id, veri){ return db.collection(COL.denemeSinavlari).doc(id).update(veri); },
  denemeSil(id){ return db.collection(COL.denemeSinavlari).doc(id).delete(); },
  denemeSayacBaslat(id, uid){
    return db.collection(COL.denemeSinavlari).doc(id).update({
      sayacDurumu: { aktif: true, baslatanUid: uid || '', baslatmaTarihi: new Date().toISOString() }
    });
  },
  denemeSayacDurdur(id){
    return db.collection(COL.denemeSinavlari).doc(id).update({
      'sayacDurumu.aktif': false,
      'sayacDurumu.durdurulmaTarihi': new Date().toISOString()
    });
  }
};

const SinavlarService = {
  _yetkiKontrol(){
    if(!duzenleyebilir('sinavIslemleri')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },
  sinavDuzenlenebilirMi(s){
    if(!duzenleyebilir('sinavIslemleri')) return false;
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin) return true;
    if(!s || !s.sahipUid) return true;
    return !!(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && s.sahipUid === AKTIF_KULLANICI.uid);
  },
  denemeDuzenlenebilirMi(d){
    if(!duzenleyebilir('sinavIslemleri')) return false;
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin) return true;
    if(!d || !d.sahipUid) return true;
    return !!(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && d.sahipUid === AKTIF_KULLANICI.uid);
  },
  sinavKaydet(mevcutId, mevcutKayit, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(mevcutId){
      if(!this.sinavDuzenlenebilirMi(mevcutKayit)) return Promise.reject(new Error('sahip-degil'));
      return SinavlarRepository.sinavGuncelle(mevcutId, veri);
    }
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) veri = { ...veri, sahipUid: AKTIF_KULLANICI.uid };
    return SinavlarRepository.sinavEkle(veri);
  },
  sinavSil(id, mevcutKayit){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(!this.sinavDuzenlenebilirMi(mevcutKayit)) return Promise.reject(new Error('sahip-degil'));
    return SinavlarRepository.sinavSil(id);
  },
  denemeKaydet(mevcutId, mevcutKayit, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(mevcutId){
      if(!this.denemeDuzenlenebilirMi(mevcutKayit)) return Promise.reject(new Error('sahip-degil'));
      return SinavlarRepository.denemeGuncelle(mevcutId, veri);
    }
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) veri = { ...veri, sahipUid: AKTIF_KULLANICI.uid };
    return SinavlarRepository.denemeEkle(veri);
  },
  denemeSil(id, mevcutKayit){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(!this.denemeDuzenlenebilirMi(mevcutKayit)) return Promise.reject(new Error('sahip-degil'));
    return SinavlarRepository.denemeSil(id);
  },
  _sayacYetkiKontrol(mevcutKayit){
    const admin = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin;
    if(admin) return true;
    const sahibi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && mevcutKayit && mevcutKayit.sahipUid === AKTIF_KULLANICI.uid;
    if(sahibi) return true;
    toast(mevcutKayit && mevcutKayit.sahipUid ? 'Bu sayacı yalnızca oluşturan kişi veya yönetici başlatabilir.' : 'Bu işlem için yönetici yetkisi gereklidir.');
    return false;
  },
  denemeSayacBaslat(id, mevcutKayit){
    if(!this._sayacYetkiKontrol(mevcutKayit)) return Promise.reject(new Error('yetkisiz'));
    const uid = AKTIF_KULLANICI?.uid || '';
    return SinavlarRepository.denemeSayacBaslat(id, uid);
  },
  denemeSayacDurdur(id, mevcutKayit){
    if(!this._sayacYetkiKontrol(mevcutKayit)) return Promise.reject(new Error('yetkisiz'));
    return SinavlarRepository.denemeSayacDurdur(id);
  }
};

const YillikPlanRepository = {
  basliklariDinle(callback, hataCb){
    return db.collection(COL.yillikPlanBasliklari).orderBy('sira').onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  baslikEkle(veri){ return db.collection(COL.yillikPlanBasliklari).add(veri); },
  baslikGuncelle(id, veri){ return db.collection(COL.yillikPlanBasliklari).doc(id).update(veri); },
  baslikSil(id){ return db.collection(COL.yillikPlanBasliklari).doc(id).delete(); },
  tanimlariDinle(callback, hataCb){
    return db.collection(COL.yillikPlanTanimlari).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  tanimEkle(veri){ return db.collection(COL.yillikPlanTanimlari).add(veri); },
  tanimGuncelle(id, veri){ return db.collection(COL.yillikPlanTanimlari).doc(id).update(veri); },
  tanimSil(id){ return db.collection(COL.yillikPlanTanimlari).doc(id).delete(); },
  secimGetir(ogretmenId){ return db.collection(COL.ogretmenYillikPlanSecimleri).doc(ogretmenId).get(); },
  secimKaydet(ogretmenId, planIdler){
    return db.collection(COL.ogretmenYillikPlanSecimleri).doc(ogretmenId).set({ ogretmenId, planIdler }, { merge:true });
  },
  notlariGetir(ogretmenId, planId){ return db.collection(COL.yillikPlanNotlari).doc(`${ogretmenId}_${planId}`).get(); },
  notKaydet(ogretmenId, planId, haftaIndex, metin){
    const id = `${ogretmenId}_${planId}`;
    return db.collection(COL.yillikPlanNotlari).doc(id).set(
      { ogretmenId, planId, notlar: { [haftaIndex]: metin } }, { merge:true }
    );
  }
};

const YillikPlanService = {
  _yaziYetkisiVar(){ return typeof duzenleyebilir==='function' && duzenleyebilir('yillikPlan'); },
  _goruntuleyebilir(){ return typeof gorebilir==='function' && gorebilir('yillikPlan'); },
  basliklariDinle(cb, hataCb){ return YillikPlanRepository.basliklariDinle(cb, hataCb); },
  baslikEkle(veri){ if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz')); return YillikPlanRepository.baslikEkle(veri); },
  baslikGuncelle(id, veri){ if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz')); return YillikPlanRepository.baslikGuncelle(id, veri); },
  baslikSil(id){ if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz')); return YillikPlanRepository.baslikSil(id); },
  tanimlariDinle(cb, hataCb){ return YillikPlanRepository.tanimlariDinle(cb, hataCb); },
  tanimEkle(veri){ if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz')); return YillikPlanRepository.tanimEkle(veri); },
  tanimGuncelle(id, veri){ if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz')); return YillikPlanRepository.tanimGuncelle(id, veri); },
  tanimSil(id){ if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz')); return YillikPlanRepository.tanimSil(id); },
  goruntuAyarlariniKaydet(id, { sutunGenislikleri, fontBoyutuPx, imzaTarihi, okulAdiManuel, satirlar } = {}){
    if(!this._goruntuleyebilir()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
    const veri = {};
    if (sutunGenislikleri !== undefined) veri.sutunGenislikleri = sutunGenislikleri;
    if (fontBoyutuPx !== undefined) veri.fontBoyutuPx = fontBoyutuPx;
    if (imzaTarihi !== undefined) veri.imzaTarihi = imzaTarihi;
    if (okulAdiManuel !== undefined) veri.okulAdiManuel = okulAdiManuel;
    if (satirlar !== undefined) veri.satirlar = satirlar;
    return YillikPlanRepository.tanimGuncelle(id, veri);
  },
  secimGetir(ogretmenId){ return YillikPlanRepository.secimGetir(ogretmenId); },
  secimKaydet(ogretmenId, planIdler){
    if(!this._goruntuleyebilir()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
    return YillikPlanRepository.secimKaydet(ogretmenId, planIdler);
  },
  notlariGetir(ogretmenId, planId){ return YillikPlanRepository.notlariGetir(ogretmenId, planId); },
  notKaydet(ogretmenId, planId, haftaIndex, metin){
    if(!this._goruntuleyebilir()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
    return YillikPlanRepository.notKaydet(ogretmenId, planId, haftaIndex, metin);
  }
};

const DersSaatleriRepository = {
  ayarlariDinle(callback, hataCb){
    return db.collection(COL.dersSaatleri).doc('ayarlar').onSnapshot(
      { includeMetadataChanges: true },
      doc => callback(doc.exists ? doc.data() : null, doc.metadata),
      hataCb || hataGoster
    );
  },
  ayarlariSunucudanOku(){
    return db.collection(COL.dersSaatleri).doc('ayarlar').get({ source: 'server' })
      .then(doc => doc.exists ? doc.data() : null);
  },
  ayarlariKaydet(veri){ return db.collection(COL.dersSaatleri).doc('ayarlar').set(veri); }
};

const DersSaatleriService = {
  _yetkiKontrol(){
    if(!duzenleyebilir('sistemAyarlari')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },
  ayarlariKaydet(veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return DersSaatleriRepository.ayarlariKaydet(veri);
  }
};

const AkademikTakvimRepository = {
  dinle(callback, hataCb){
    return db.collection(COL.akademikTakvim).doc('aktif').onSnapshot(
      doc => callback(doc.exists ? { id: doc.id, ...doc.data() } : null),
      hataCb || hataGoster
    );
  },
  gorselKaydet(meta){ return db.collection(COL.akademikTakvim).doc('aktif').set(meta, { merge:false }); },
  dosyaYukle(dosya, ilerlemeCb){
    return new Promise((resolve, reject)=>{
      const yol = `akademikTakvim/${Date.now()}_${dosya.name}`;
      const ref = storage.ref().child(yol);
      const gorev = ref.put(dosya);
      gorev.on('state_changed',
        snap=>{ if(ilerlemeCb) ilerlemeCb(Math.round((snap.bytesTransferred/snap.totalBytes)*100)); },
        err=>reject(err),
        async ()=>{
          try{ const url = await gorev.snapshot.ref.getDownloadURL(); resolve({ url, storagePath: yol }); }
          catch(err){ reject(err); }
        }
      );
    });
  },
  dosyaSil(storagePath){ return storage.ref().child(storagePath).delete(); }
};

const AkademikTakvimService = {
  _adminMi(){ return typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true; },
  dinle(cb, hataCb){ return AkademikTakvimRepository.dinle(cb, hataCb); },
  async gorselYukle(dosya, ilerlemeCb, mevcut){
    if(!this._adminMi()){ if(typeof toast==='function') toast('Sadece admin görseli değiştirebilir.'); throw new Error('yetkisiz'); }
    if(typeof DepolamaSinirService !== 'undefined'){
      const izin = await DepolamaSinirService.yuklemeIzniVarMi('takvim', dosya.size);
      if(!izin.izinVar) throw new Error('depolama-siniri:' + izin.mesaj);
    }
    const { url, storagePath } = await AkademikTakvimRepository.dosyaYukle(dosya, ilerlemeCb);
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: 'Admin' };
    const yeniVeri = {
      gorselUrl: url, storagePath, dosyaBoyutu: dosya.size,
      guncellenmeTarihi: firebase.firestore.FieldValue.serverTimestamp(),
      yukleyenAdi: kimlik.ad || 'Admin'
    };
    await AkademikTakvimRepository.gorselKaydet(yeniVeri);
    if(typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimEkle('takvim', dosya.size);
    if(mevcut && mevcut.storagePath && mevcut.storagePath !== storagePath){
      AkademikTakvimRepository.dosyaSil(mevcut.storagePath).catch(()=>{});
      if(mevcut.dosyaBoyutu && typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimCikar('takvim', mevcut.dosyaBoyutu);
    }
    return yeniVeri;
  }
};

function SinavSonuclariRepositoryOlustur(koleksiyonAdi){
  return {
    sinavlariDinle(callback, hataCb){
      return db.collection(koleksiyonAdi).orderBy('tarih','desc').onSnapshot(
        s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        hataCb || hataGoster
      );
    },
    sinavEkle(veri){ return db.collection(koleksiyonAdi).add(veri); },
    sinavGuncelle(id, veri){ return db.collection(koleksiyonAdi).doc(id).update(veri); },
    sinavSil(id){ return db.collection(koleksiyonAdi).doc(id).delete(); }
  };
}

function SinavSonuclariServisOlustur(koleksiyonAdi, modulAdi){
  const repo = SinavSonuclariRepositoryOlustur(koleksiyonAdi);
  return {
    _yetkiVar(){ return typeof gorebilir==='function' && gorebilir(modulAdi); },
    sinavlariDinle(cb, hataCb){ return repo.sinavlariDinle(cb, hataCb); },
    sinavEkle(veri){
      if(!this._yetkiVar()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
      return repo.sinavEkle(veri);
    },
    sinavGuncelle(id, veri){
      if(!this._yetkiVar()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
      return repo.sinavGuncelle(id, veri);
    },
    sinavSil(id){
      if(!this._yetkiVar()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
      return repo.sinavSil(id);
    }
  };
}
const DenemeSonuclariService = SinavSonuclariServisOlustur(COL.denemeSonuclari, 'denemeSonuclari');
const TestSonuclariService = SinavSonuclariServisOlustur(COL.testSonuclari, 'testSonuclari');
