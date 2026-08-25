/* Koruk Asistan — Settings veri katmanı
 * Kullanıcı yönetimi repository/service + depolama sınır servisi.
 * Yetki ve Firestore veri modeli korunur.
 */

const KullaniciYonetimiRepository={
  rolleriDinle(callback,hataCb){
    return db.collection(COL.roller).onSnapshot(
      s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),
      hataCb||(err=>console.warn('Roller dinlenemedi:',err))
    );
  },
  rolEkle(veri){return db.collection(COL.roller).add(veri);},
  rolGuncelle(id,veri){return db.collection(COL.roller).doc(id).update(veri);},
  rolSil(id){return db.collection(COL.roller).doc(id).delete();},
  kullanicilariDinle(callback,hataCb){
    return db.collection(COL.kullanicilar).onSnapshot(
      s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),
      hataCb||(err=>console.warn('Kullanıcılar dinlenemedi:',err))
    );
  },
  kullaniciGuncelle(uid,veri){return db.collection(COL.kullanicilar).doc(uid).update(veri);},
  kullaniciSil(uid){return db.collection(COL.kullanicilar).doc(uid).delete();}
};

const KullaniciYonetimiService={
  _yetkiKontrol(){
    if(!kullaniciYonetimiYetkisiVar()){toast('Bu işlem için yetkiniz yok.');return false;}
    return true;
  },
  rolKaydet(mevcutId,veri){
    if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));
    return mevcutId?KullaniciYonetimiRepository.rolGuncelle(mevcutId,veri):KullaniciYonetimiRepository.rolEkle(veri);
  },
  rolSil(id,atanmisKullaniciSayisi){
    if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));
    if(atanmisKullaniciSayisi>0)return Promise.reject(new Error('rol-kullanimda:'+atanmisKullaniciSayisi));
    return KullaniciYonetimiRepository.rolSil(id);
  },
  kullaniciKaydet(uid,veri,kendiUid){
    if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));
    if(uid===kendiUid&&veri.aktif===false)return Promise.reject(new Error('kendini-pasif-yapamaz'));
    return KullaniciYonetimiRepository.kullaniciGuncelle(uid,veri);
  },
  kullaniciSil(uid,kendiUid){
    if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));
    if(uid===kendiUid)return Promise.reject(new Error('kendini-silemez'));
    return KullaniciYonetimiRepository.kullaniciSil(uid);
  }
};

const DEPOLAMA_KATEGORILERI=['mesaj','duyuru','dokuman','takvim'];
const DEPOLAMA_KATEGORI_ADLARI={
  mesaj:'Mesajlaşma Dosyaları',
  duyuru:'Duyurular Galerisi',
  dokuman:'Dokümanlar',
  takvim:'Akademik Takvim'
};
const DepolamaSinirService={
  _ref(){return db.collection(COL.depolamaAyarlari).doc('ayarlar');},
  varsayilanAyarlar(){
    const t={};DEPOLAMA_KATEGORILERI.forEach(k=>{t[k]={aktif:true,MB:100};});return t;
  },
  _tamamla(veri){
    const tam=this.varsayilanAyarlar();DEPOLAMA_KATEGORILERI.forEach(k=>{if(veri&&veri[k])tam[k]={...tam[k],...veri[k]};});return tam;
  },
  dinle(callback,hataCb){
    return this._ref().onSnapshot(doc=>callback(this._tamamla(doc.exists?doc.data():null)),hataCb||hataGoster);
  },
  kaydet(ayarlar){
    if(!(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI&&AKTIF_KULLANICI.admin))return Promise.reject(new Error('yetkisiz'));
    return this._ref().set(ayarlar,{merge:true});
  },
  async yuklemeIzniVarMi(kategori,yeniBayt){
    if(typeof AKTIF_KULLANICI==='undefined'||!AKTIF_KULLANICI)return{izinVar:true};
    try{
      const ayarSnap=await this._ref().get();
      const ayar=(ayarSnap.exists&&ayarSnap.data()[kategori])||{aktif:false,MB:100};
      if(!ayar.aktif)return{izinVar:true};
      const kulSnap=await db.collection(COL.kullanicilar).doc(AKTIF_KULLANICI.uid).get();
      if(kulSnap.exists&&kulSnap.data().depolamaMuaf)return{izinVar:true};
      const istSnap=await db.collection(COL.kullaniciIstatistikleri).doc(AKTIF_KULLANICI.uid).get();
      const mevcutBayt=(istSnap.exists&&istSnap.data().depolamaKullanimi&&istSnap.data().depolamaKullanimi[kategori])||0;
      const sinirBayt=ayar.MB*1024*1024;
      if(mevcutBayt+(yeniBayt||0)>sinirBayt){
        const kalanMB=Math.max(0,(sinirBayt-mevcutBayt)/(1024*1024)).toFixed(1);
        return{izinVar:false,mesaj:`${DEPOLAMA_KATEGORI_ADLARI[kategori]||kategori} için depolama sınırınıza (${ayar.MB} MB) ulaştınız. Kalan: ${kalanMB} MB.`};
      }
      return{izinVar:true};
    }catch(e){
      console.warn('[Depolama Sınırı] Kontrol başarısız, izin verildi:',e);return{izinVar:true};
    }
  }
};
