/* Koruk Asistan — Documents veri katmanı
 * Doküman metadata'sı cihaz-first; Firestore yalnız DeviceData queue + SyncEngine arka planındadır.
 * Binary dosya aktarımı Firebase Storage üzerinden yapılır.
 */
(function(global){
'use strict';
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
const active=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
function _dokumanTarihDegeri(d){const t=d?.yuklenmeTarihi;if(!t)return 0;if(typeof t.toMillis==='function')return t.toMillis();if(typeof t.seconds==='number')return t.seconds*1000;const ms=new Date(t).getTime();return Number.isFinite(ms)?ms:0;}
function _dokumanGuvenliDosyaAdi(ad){const temiz=String(ad||'dosya').replace(/[\\/\u0000-\u001f\u007f]+/g,'_').replace(/\s+/g,' ').trim();return(temiz||'dosya').slice(0,180);}
function allDocs(){const map=new Map();['dokumanlar','dokumanlarAcik','dokumanlarBenim'].forEach(t=>device().list(t).forEach(d=>d?.id&&map.set(d.id,d)));return[...map.values()];}
function primaryType(){return active().admin?'dokumanlar':'dokumanlarBenim';}
async function mirror(row){
  if(active().admin)return;
  const mine=device().list('dokumanlarBenim').filter(x=>x.id!==row.id);mine.push(row);await device().persist('dokumanlarBenim',mine);
  const open=device().list('dokumanlarAcik').filter(x=>x.id!==row.id);if(row.gorunurluk==='herkes')open.push(row);await device().persist('dokumanlarAcik',open);
}
async function unmirror(id){if(active().admin)return;await device().persist('dokumanlarBenim',device().list('dokumanlarBenim').filter(x=>x.id!==id));await device().persist('dokumanlarAcik',device().list('dokumanlarAcik').filter(x=>x.id!==id));}
function fakeDoc(row,id){return{exists:!!row,id:id||row?.id||'',data:()=>row?{...row}:undefined};}

const DokumanlarRepository={
  dokumanlariDinle(callback){
    const emit=()=>callback(allDocs().sort((a,b)=>_dokumanTarihDegeri(b)-_dokumanTarihDegeri(a)),{source:'device'});emit();
    const off=['data.dokumanlar','data.dokumanlarAcik','data.dokumanlarBenim'].map(p=>AppStore.subscribe(p,emit));return()=>off.forEach(f=>f());
  },
  dokumanGetir(id){return Promise.resolve(fakeDoc(allDocs().find(x=>x.id===id),id));},
  async dokumanEkle(meta){const row=await device().add(primaryType(),COL.dokumanlar,{...meta,yuklenmeTarihi:meta.yuklenmeTarihi||new Date().toISOString()});await mirror(row);return row;},
  async dokumanSil(id){await device().remove(primaryType(),COL.dokumanlar,id);await unmirror(id);return true;},
  async dokumanGuncelle(id,veri){const mevcut=allDocs().find(x=>x.id===id)||{id},row=await device().update(primaryType(),COL.dokumanlar,id,veri);await mirror({...mevcut,...row});return row;},
  dosyaYukle(dosya,sahipUid,gorunurluk,ilerlemeCb){return new Promise((resolve,reject)=>{if(!sahipUid){reject(new Error('Dosya sahibi bulunamadı.'));return;}const dosyaAdi=_dokumanGuvenliDosyaAdi(dosya?.name),yol=`dokumanlar/${sahipUid}/${Date.now()}_${dosyaAdi}`,ref=storage.ref().child(yol),metadata={contentType:dosya?.type||'application/octet-stream',customMetadata:{olusturanUid:String(sahipUid),gorunurluk:gorunurluk==='herkes'?'herkes':'kisisel'}},g=ref.put(dosya,metadata);g.on('state_changed',s=>{if(ilerlemeCb)ilerlemeCb(Math.round((s.bytesTransferred/s.totalBytes)*100));},reject,async()=>{try{resolve({url:await g.snapshot.ref.getDownloadURL(),storagePath:yol});}catch(e){reject(e);}});});},
  async dosyaGorunurlukGuncelle(storagePath,gorunurluk){if(!storagePath||!/^dokumanlar\/[^/]+\/.+/.test(storagePath))return false;const ref=storage.ref().child(storagePath),mevcut=await ref.getMetadata(),customMetadata={...(mevcut.customMetadata||{}),gorunurluk:gorunurluk==='herkes'?'herkes':'kisisel'};await ref.updateMetadata({customMetadata});return true;},
  dosyaSil(storagePath){return storage.ref().child(storagePath).delete();}
};
global.DokumanlarRepository=DokumanlarRepository;

const DokumanlarService={
  _kendiKimlik(){const u=active(),kimlik=typeof _hesapKimligi==='function'?_hesapKimligi():{ad:''};return{uid:u.uid||null,ad:kimlik.ad||u.adSoyad||u.displayName||'Kullanıcı',adminMi:u.admin===true};},
  gorunurMu(d){if(!d)return false;if(d.gorunurluk==='herkes')return true;const ben=this._kendiKimlik();return ben.adminMi||!!(ben.uid&&d.olusturanUid===ben.uid);},gorunurListele(l){return(l||[]).filter(d=>this.gorunurMu(d));},gorunurlukDegistirilebilirMi(){return this._kendiKimlik().adminMi;},
  async dokumanGorunurlukGuncelle(id,yeniGorunurluk){if(!this.gorunurlukDegistirilebilirMi())throw new Error('yetkisiz');const yeni=yeniGorunurluk==='herkes'?'herkes':'kisisel',snap=await DokumanlarRepository.dokumanGetir(id);if(!snap.exists)throw new Error('Döküman bulunamadı.');const mevcut={id:snap.id,...snap.data()},eski=mevcut.gorunurluk==='herkes'?'herkes':'kisisel';let storageGuncellendi=false;if(mevcut.storagePath)storageGuncellendi=await DokumanlarRepository.dosyaGorunurlukGuncelle(mevcut.storagePath,yeni);try{return await DokumanlarRepository.dokumanGuncelle(id,{gorunurluk:yeni});}catch(e){if(storageGuncellendi)await DokumanlarRepository.dosyaGorunurlukGuncelle(mevcut.storagePath,eski).catch(()=>{});throw e;}},
  dokumanSilinebilirMi(d){const ben=this._kendiKimlik();return ben.adminMi||!!(ben.uid&&d?.olusturanUid===ben.uid);},
  async dokumanEkle(metaTaban,dosya,ilerlemeCb){if(typeof gorebilir==='function'&&!gorebilir('dokumanlar')){if(typeof toast==='function')toast('Bu işlem için yetkiniz yok.');throw new Error('yetkisiz');}const ben=this._kendiKimlik();if(!ben.uid)throw new Error('Aktif kullanıcı bulunamadı.');const gorunurluk=ben.adminMi&&metaTaban.gorunurluk==='herkes'?'herkes':'kisisel';let meta={...metaTaban,gorunurluk,olusturanUid:ben.uid,olusturanAdi:ben.ad,yuklenmeTarihi:new Date().toISOString()};if(dosya){if(global.DepolamaSinirService){const izin=await DepolamaSinirService.yuklemeIzniVarMi('dokuman',dosya.size);if(!izin.izinVar)throw new Error('depolama-siniri:'+izin.mesaj);}const{url,storagePath}=await DokumanlarRepository.dosyaYukle(dosya,ben.uid,gorunurluk,ilerlemeCb);meta={...meta,dosyaUrl:url,storagePath,dosyaAdi:dosya.name,dosyaBoyutu:dosya.size,dosyaTipi:dosya.type};if(global.IstatistikService)IstatistikService.depolamaKullanimEkle('dokuman',dosya.size);}if(global.IstatistikService)IstatistikService.dosyaYuklemeKaydet();return DokumanlarRepository.dokumanEkle(meta);},
  async dokumanSil(id,storagePath,mevcut){if(!this.dokumanSilinebilirMi(mevcut))throw new Error('sahip-degil');if(storagePath)await DokumanlarRepository.dosyaSil(storagePath).catch(()=>{});if(mevcut?.dosyaBoyutu&&global.IstatistikService)IstatistikService.depolamaKullanimCikar('dokuman',mevcut.dosyaBoyutu);return DokumanlarRepository.dokumanSil(id);}
};
global.DokumanlarService=DokumanlarService;
})(window);
