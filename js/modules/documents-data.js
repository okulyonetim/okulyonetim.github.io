/* Koruk Asistan — Documents veri katmanı
 * DokumanlarRepository + DokumanlarService birleşimi.
 * Firestore/Storage yolu, sahiplik ve görünürlük kuralları korunur.
 */

function _dokumanTarihDegeri(d){
  const t=d&&d.yuklenmeTarihi;if(!t)return 0;
  if(typeof t.toMillis==='function')return t.toMillis();
  if(typeof t.seconds==='number')return t.seconds*1000;
  const ms=new Date(t).getTime();return Number.isFinite(ms)?ms:0;
}
function _dokumanGuvenliDosyaAdi(ad){
  const temiz=String(ad||'dosya').replace(/[\\/\u0000-\u001f\u007f]+/g,'_').replace(/\s+/g,' ').trim();
  return(temiz||'dosya').slice(0,180);
}
const DokumanlarRepository={
  dokumanlariDinle(callback,hataCb){
    const hata=hataCb||hataGoster;
    const ben=(typeof AKTIF_KULLANICI!=='undefined')?AKTIF_KULLANICI:null;
    const adminMi=!!(ben&&ben.admin===true);
    if(adminMi){
      return db.collection(COL.dokumanlar).orderBy('yuklenmeTarihi','desc').onSnapshot(
        snap=>callback(snap.docs.map(d=>({id:d.id,...d.data()}))),hata
      );
    }
    const authUid=(typeof auth!=='undefined'&&auth&&auth.currentUser)?auth.currentUser.uid:null;
    const uid=(ben&&ben.uid)||authUid;
    if(!uid){
      if(typeof auth!=='undefined'&&auth&&typeof auth.onAuthStateChanged==='function'){
        let iptal=false,asilIptal=()=>{};
        const authIptal=auth.onAuthStateChanged(u=>{
          if(iptal||!u)return;try{authIptal();}catch(_){}if(iptal)return;
          asilIptal=this.dokumanlariDinle(callback,hataCb)||(()=>{});
        });
        return()=>{iptal=true;try{authIptal();}catch(_){}try{asilIptal();}catch(_){}};
      }
      hata(new Error('Aktif kullanıcı kimliği hazır değil.'));return()=>{};
    }
    let acik=[],benim=[];
    const birlestir=()=>{const map=new Map();[...acik,...benim].forEach(d=>map.set(d.id,d));callback([...map.values()].sort((a,b)=>_dokumanTarihDegeri(b)-_dokumanTarihDegeri(a)));};
    const u1=db.collection(COL.dokumanlar).where('gorunurluk','==','herkes').onSnapshot(s=>{acik=s.docs.map(d=>({id:d.id,...d.data()}));birlestir();},hata);
    const u2=db.collection(COL.dokumanlar).where('olusturanUid','==',uid).onSnapshot(s=>{benim=s.docs.map(d=>({id:d.id,...d.data()}));birlestir();},hata);
    return()=>{try{u1();}catch(_){}try{u2();}catch(_){}};
  },
  dokumanGetir(id){return db.collection(COL.dokumanlar).doc(id).get();},
  dokumanEkle(meta){return db.collection(COL.dokumanlar).add(meta);},
  dokumanSil(id){return db.collection(COL.dokumanlar).doc(id).delete();},
  dokumanGuncelle(id,veri){return db.collection(COL.dokumanlar).doc(id).update(veri);},
  dosyaYukle(dosya,sahipUid,gorunurluk,ilerlemeCb){
    return new Promise((resolve,reject)=>{
      if(!sahipUid){reject(new Error('Dosya sahibi bulunamadı.'));return;}
      const dosyaAdi=_dokumanGuvenliDosyaAdi(dosya&&dosya.name);
      const yol=`dokumanlar/${sahipUid}/${Date.now()}_${dosyaAdi}`;
      const ref=storage.ref().child(yol);
      const metadata={contentType:(dosya&&dosya.type)||'application/octet-stream',customMetadata:{olusturanUid:String(sahipUid),gorunurluk:gorunurluk==='herkes'?'herkes':'kisisel'}};
      const gorev=ref.put(dosya,metadata);
      gorev.on('state_changed',snap=>{if(ilerlemeCb)ilerlemeCb(Math.round((snap.bytesTransferred/snap.totalBytes)*100));},reject,async()=>{
        try{const url=await gorev.snapshot.ref.getDownloadURL();resolve({url,storagePath:yol});}catch(err){reject(err);}
      });
    });
  },
  async dosyaGorunurlukGuncelle(storagePath,gorunurluk){
    if(!storagePath||!/^dokumanlar\/[^/]+\/.+/.test(storagePath))return false;
    const ref=storage.ref().child(storagePath),mevcut=await ref.getMetadata();
    const customMetadata={...(mevcut.customMetadata||{}),gorunurluk:gorunurluk==='herkes'?'herkes':'kisisel'};
    await ref.updateMetadata({customMetadata});return true;
  },
  dosyaSil(storagePath){return storage.ref().child(storagePath).delete();}
};

const DokumanlarService={
  _kendiKimlik(){
    const kimlik=(typeof _hesapKimligi==='function')?_hesapKimligi():{ad:''};
    return{uid:(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI)?AKTIF_KULLANICI.uid:null,ad:kimlik.ad||'Kullanıcı',adminMi:typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI&&AKTIF_KULLANICI.admin===true};
  },
  gorunurMu(d){if(!d)return false;if(d.gorunurluk==='herkes')return true;const ben=this._kendiKimlik();if(ben.adminMi)return true;return!!(ben.uid&&d.olusturanUid===ben.uid);},
  gorunurListele(hamListe){return(hamListe||[]).filter(d=>this.gorunurMu(d));},
  gorunurlukDegistirilebilirMi(){return this._kendiKimlik().adminMi;},
  async dokumanGorunurlukGuncelle(id,yeniGorunurluk){
    if(!this.gorunurlukDegistirilebilirMi())return Promise.reject(new Error('yetkisiz'));
    const yeni=yeniGorunurluk==='herkes'?'herkes':'kisisel';
    const snap=await DokumanlarRepository.dokumanGetir(id);if(!snap.exists)throw new Error('Döküman bulunamadı.');
    const mevcut={id:snap.id,...snap.data()},eski=mevcut.gorunurluk==='herkes'?'herkes':'kisisel';let storageGuncellendi=false;
    if(mevcut.storagePath)storageGuncellendi=await DokumanlarRepository.dosyaGorunurlukGuncelle(mevcut.storagePath,yeni);
    try{await DokumanlarRepository.dokumanGuncelle(id,{gorunurluk:yeni});}
    catch(err){if(storageGuncellendi)await DokumanlarRepository.dosyaGorunurlukGuncelle(mevcut.storagePath,eski).catch(()=>{});throw err;}
  },
  dokumanSilinebilirMi(d){const ben=this._kendiKimlik();if(ben.adminMi)return true;return!!(ben.uid&&d&&d.olusturanUid===ben.uid);},
  async dokumanEkle(metaTaban,dosya,ilerlemeCb){
    if(!gorebilir('dokumanlar')){toast('Bu işlem için yetkiniz yok.');throw new Error('yetkisiz');}
    const ben=this._kendiKimlik();if(!ben.uid)throw new Error('Aktif kullanıcı bulunamadı.');
    const gorunurluk=ben.adminMi&&metaTaban.gorunurluk==='herkes'?'herkes':'kisisel';let meta={...metaTaban,gorunurluk,olusturanUid:ben.uid,olusturanAdi:ben.ad};
    if(dosya){
      if(typeof DepolamaSinirService!=='undefined'){const izin=await DepolamaSinirService.yuklemeIzniVarMi('dokuman',dosya.size);if(!izin.izinVar)throw new Error('depolama-siniri:'+izin.mesaj);}
      const{url,storagePath}=await DokumanlarRepository.dosyaYukle(dosya,ben.uid,gorunurluk,ilerlemeCb);
      meta={...meta,dosyaUrl:url,storagePath,dosyaAdi:dosya.name,dosyaBoyutu:dosya.size,dosyaTipi:dosya.type};
      if(typeof IstatistikService!=='undefined')IstatistikService.depolamaKullanimEkle('dokuman',dosya.size);
    }
    if(typeof IstatistikService!=='undefined')IstatistikService.dosyaYuklemeKaydet();
    return DokumanlarRepository.dokumanEkle(meta);
  },
  async dokumanSil(id,storagePath,mevcutDokuman){
    if(!this.dokumanSilinebilirMi(mevcutDokuman))return Promise.reject(new Error('sahip-degil'));
    if(storagePath)await DokumanlarRepository.dosyaSil(storagePath).catch(()=>{});
    if(mevcutDokuman&&mevcutDokuman.dosyaBoyutu&&typeof IstatistikService!=='undefined')IstatistikService.depolamaKullanimCikar('dokuman',mevcutDokuman.dosyaBoyutu);
    return DokumanlarRepository.dokumanSil(id);
  }
};
