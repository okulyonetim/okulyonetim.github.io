/* ================================================================
   js/core/services/dokumanlar.service.js
   DÖKÜMANLAR MODÜLÜ — YETKİ KONTROLÜ + GÖRÜNÜRLÜK KURALI
   ================================================================ */

const DokumanlarService = {

  _kendiKimlik(){
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '' };
    return {
      uid: (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null,
      ad: kimlik.ad || 'Kullanıcı',
      adminMi: typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true
    };
  },

  gorunurMu(d){
    if(!d) return false;
    if(d.gorunurluk === 'herkes') return true;
    const ben = this._kendiKimlik();
    if(ben.adminMi) return true;
    return !!(ben.uid && d.olusturanUid === ben.uid);
  },
  gorunurListele(hamListe){ return (hamListe||[]).filter(d => this.gorunurMu(d)); },

  gorunurlukDegistirilebilirMi(){ return this._kendiKimlik().adminMi; },

  /* Yeni güvenli Storage yolunda görünürlük hem Firestore metadata'sında hem
     Storage custom metadata'sında tutulur. Storage güncellemesi başarılı olup
     Firestore başarısız olursa Storage metadata eski değere geri alınır. Eski
     tek-segment Storage yollarında yalnız Firestore davranışı korunur. */
  async dokumanGorunurlukGuncelle(id, yeniGorunurluk){
    if(!this.gorunurlukDegistirilebilirMi()) return Promise.reject(new Error('yetkisiz'));
    const yeni = yeniGorunurluk === 'herkes' ? 'herkes' : 'kisisel';
    const snap = await DokumanlarRepository.dokumanGetir(id);
    if(!snap.exists) throw new Error('Döküman bulunamadı.');
    const mevcut = { id: snap.id, ...snap.data() };
    const eski = mevcut.gorunurluk === 'herkes' ? 'herkes' : 'kisisel';
    let storageGuncellendi = false;
    if(mevcut.storagePath){
      storageGuncellendi = await DokumanlarRepository.dosyaGorunurlukGuncelle(mevcut.storagePath, yeni);
    }
    try{
      await DokumanlarRepository.dokumanGuncelle(id, { gorunurluk: yeni });
    }catch(err){
      if(storageGuncellendi){
        await DokumanlarRepository.dosyaGorunurlukGuncelle(mevcut.storagePath, eski).catch(()=>{});
      }
      throw err;
    }
  },

  dokumanSilinebilirMi(d){
    const ben = this._kendiKimlik();
    if(ben.adminMi) return true;
    return !!(ben.uid && d && d.olusturanUid === ben.uid);
  },

  async dokumanEkle(metaTaban, dosya, ilerlemeCb){
    if(!gorebilir('dokumanlar')){ toast('Bu işlem için yetkiniz yok.'); throw new Error('yetkisiz'); }
    const ben = this._kendiKimlik();
    if(!ben.uid) throw new Error('Aktif kullanıcı bulunamadı.');
    const gorunurluk = ben.adminMi && metaTaban.gorunurluk === 'herkes' ? 'herkes' : 'kisisel';
    let meta = { ...metaTaban, gorunurluk, olusturanUid: ben.uid, olusturanAdi: ben.ad };
    if(dosya){
      if(typeof DepolamaSinirService !== 'undefined'){
        const izin = await DepolamaSinirService.yuklemeIzniVarMi('dokuman', dosya.size);
        if(!izin.izinVar) throw new Error('depolama-siniri:' + izin.mesaj);
      }
      const { url, storagePath } = await DokumanlarRepository.dosyaYukle(dosya, ben.uid, gorunurluk, ilerlemeCb);
      meta = { ...meta, dosyaUrl: url, storagePath, dosyaAdi: dosya.name, dosyaBoyutu: dosya.size, dosyaTipi: dosya.type };
      if(typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimEkle('dokuman', dosya.size);
    }
    if(typeof IstatistikService !== 'undefined') IstatistikService.dosyaYuklemeKaydet();
    return DokumanlarRepository.dokumanEkle(meta);
  },

  async dokumanSil(id, storagePath, mevcutDokuman){
    if(!this.dokumanSilinebilirMi(mevcutDokuman)) return Promise.reject(new Error('sahip-degil'));
    if(storagePath) await DokumanlarRepository.dosyaSil(storagePath).catch(()=>{});
    if(mevcutDokuman && mevcutDokuman.dosyaBoyutu && typeof IstatistikService !== 'undefined'){
      IstatistikService.depolamaKullanimCikar('dokuman', mevcutDokuman.dosyaBoyutu);
    }
    return DokumanlarRepository.dokumanSil(id);
  }
};
