/* Koruk Asistan — Academic veri katmanı
 * Sınav, yıllık plan, ders saatleri, akademik takvim ve sonuçlar cihaz-first çalışır.
 * Firestore metadata/CRUD yalnız DeviceData queue + SyncEngine arka planındadır.
 * Binary akademik takvim dosyaları Firebase Storage üzerinden yüklenir/silinir.
 */
(function(global){
'use strict';
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
const list=t=>device().list(t);
const activeUser=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
function fakeDoc(row,id){return{exists:!!row,id:id||row?.id||'',data:()=>row?{...row}:undefined};}

const SinavlarRepository={
  sinavlariDinle(callback){return device().listen('sinavlar',callback);},
  sinavEkle(veri){return device().add('sinavlar',COL.sinavlar,{...veri,eklenmeTarihi:new Date().toISOString()});},
  sinavGuncelle(id,veri){return device().update('sinavlar',COL.sinavlar,id,veri);},
  sinavSil(id){return device().remove('sinavlar',COL.sinavlar,id);},
  denemeSinavlariniDinle(callback){return device().listen('denemeSinavlari',callback);},
  denemeEkle(veri){return device().add('denemeSinavlari',COL.denemeSinavlari,{...veri,eklenmeTarihi:new Date().toISOString()});},
  denemeGuncelle(id,veri){return device().update('denemeSinavlari',COL.denemeSinavlari,id,veri);},
  denemeSil(id){return device().remove('denemeSinavlari',COL.denemeSinavlari,id);},
  async denemeSayacBaslat(id,uid){const d=device().get('denemeSinavlari',id)||{};return device().update('denemeSinavlari',COL.denemeSinavlari,id,{sayacDurumu:{...(d.sayacDurumu||{}),aktif:true,baslatanUid:uid||'',baslatmaTarihi:new Date().toISOString()}});},
  async denemeSayacDurdur(id){const d=device().get('denemeSinavlari',id)||{};return device().update('denemeSinavlari',COL.denemeSinavlari,id,{sayacDurumu:{...(d.sayacDurumu||{}),aktif:false,durdurulmaTarihi:new Date().toISOString()}});}
};
global.SinavlarRepository=SinavlarRepository;
const SinavlarService={
  _yetkiKontrol(){if(!duzenleyebilir('sinavIslemleri')){toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  sinavDuzenlenebilirMi(s){if(!duzenleyebilir('sinavIslemleri'))return false;const u=activeUser();if(u.admin)return true;return!s?.sahipUid||s.sahipUid===u.uid;},
  denemeDuzenlenebilirMi(d){if(!duzenleyebilir('sinavIslemleri'))return false;const u=activeUser();if(u.admin)return true;return!d?.sahipUid||d.sahipUid===u.uid;},
  sinavKaydet(id,mevcut,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(id){if(!this.sinavDuzenlenebilirMi(mevcut))return Promise.reject(new Error('sahip-degil'));return SinavlarRepository.sinavGuncelle(id,veri);}const u=activeUser();return SinavlarRepository.sinavEkle(u.uid?{...veri,sahipUid:u.uid}:veri);},
  sinavSil(id,mevcut){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(!this.sinavDuzenlenebilirMi(mevcut))return Promise.reject(new Error('sahip-degil'));return SinavlarRepository.sinavSil(id);},
  denemeKaydet(id,mevcut,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(id){if(!this.denemeDuzenlenebilirMi(mevcut))return Promise.reject(new Error('sahip-degil'));return SinavlarRepository.denemeGuncelle(id,veri);}const u=activeUser();return SinavlarRepository.denemeEkle(u.uid?{...veri,sahipUid:u.uid}:veri);},
  denemeSil(id,mevcut){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(!this.denemeDuzenlenebilirMi(mevcut))return Promise.reject(new Error('sahip-degil'));return SinavlarRepository.denemeSil(id);},
  _sayacYetkiKontrol(mevcut){const u=activeUser();if(u.admin||mevcut?.sahipUid===u.uid)return true;toast(mevcut?.sahipUid?'Bu sayacı yalnızca oluşturan kişi veya yönetici başlatabilir.':'Bu işlem için yönetici yetkisi gereklidir.');return false;},
  denemeSayacBaslat(id,mevcut){if(!this._sayacYetkiKontrol(mevcut))return Promise.reject(new Error('yetkisiz'));return SinavlarRepository.denemeSayacBaslat(id,activeUser().uid||'');},
  denemeSayacDurdur(id,mevcut){if(!this._sayacYetkiKontrol(mevcut))return Promise.reject(new Error('yetkisiz'));return SinavlarRepository.denemeSayacDurdur(id);}
};
global.SinavlarService=SinavlarService;

const YillikPlanRepository={
  basliklariDinle(callback){return device().listen('yillikPlanBasliklari',rows=>callback([...rows].sort((a,b)=>(a.sira||0)-(b.sira||0))));},
  baslikEkle(veri){return device().add('yillikPlanBasliklari',COL.yillikPlanBasliklari,veri);},
  baslikGuncelle(id,veri){return device().update('yillikPlanBasliklari',COL.yillikPlanBasliklari,id,veri);},
  baslikSil(id){return device().remove('yillikPlanBasliklari',COL.yillikPlanBasliklari,id);},
  tanimlariDinle(callback){return device().listen('yillikPlanTanimlari',callback);},
  tanimEkle(veri){return device().add('yillikPlanTanimlari',COL.yillikPlanTanimlari,veri);},
  tanimGuncelle(id,veri){return device().update('yillikPlanTanimlari',COL.yillikPlanTanimlari,id,veri);},
  tanimSil(id){return device().remove('yillikPlanTanimlari',COL.yillikPlanTanimlari,id);},
  secimGetir(ogretmenId){return Promise.resolve(fakeDoc(device().get('ogretmenYillikPlanSecimleri',ogretmenId),ogretmenId));},
  secimKaydet(ogretmenId,planIdler){return device().set('ogretmenYillikPlanSecimleri',COL.ogretmenYillikPlanSecimleri,ogretmenId,{ogretmenId,planIdler},{merge:true});},
  notlariGetir(ogretmenId,planId){const id=`${ogretmenId}_${planId}`;return Promise.resolve(fakeDoc(device().get('yillikPlanNotlari',id),id));},
  async notKaydet(ogretmenId,planId,haftaIndex,metin){const id=`${ogretmenId}_${planId}`,m=device().get('yillikPlanNotlari',id)||{},notlar={...(m.notlar||{}),[haftaIndex]:metin};return device().set('yillikPlanNotlari',COL.yillikPlanNotlari,id,{ogretmenId,planId,notlar},{merge:true});}
};
global.YillikPlanRepository=YillikPlanRepository;
const YillikPlanService={
  _yaziYetkisiVar(){return typeof duzenleyebilir==='function'&&duzenleyebilir('yillikPlan');},_goruntuleyebilir(){return typeof gorebilir==='function'&&gorebilir('yillikPlan');},
  basliklariDinle(cb,h){return YillikPlanRepository.basliklariDinle(cb,h);},baslikEkle(v){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return YillikPlanRepository.baslikEkle(v);},baslikGuncelle(id,v){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return YillikPlanRepository.baslikGuncelle(id,v);},baslikSil(id){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return YillikPlanRepository.baslikSil(id);},
  tanimlariDinle(cb,h){return YillikPlanRepository.tanimlariDinle(cb,h);},tanimEkle(v){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return YillikPlanRepository.tanimEkle(v);},tanimGuncelle(id,v){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return YillikPlanRepository.tanimGuncelle(id,v);},tanimSil(id){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return YillikPlanRepository.tanimSil(id);},
  goruntuAyarlariniKaydet(id,{sutunGenislikleri,fontBoyutuPx,imzaTarihi,okulAdiManuel,satirlar}={}){if(!this._goruntuleyebilir()){toast?.('Bu modülü kullanma yetkiniz yok.');return Promise.reject(new Error('yetkisiz'));}const v={};if(sutunGenislikleri!==undefined)v.sutunGenislikleri=sutunGenislikleri;if(fontBoyutuPx!==undefined)v.fontBoyutuPx=fontBoyutuPx;if(imzaTarihi!==undefined)v.imzaTarihi=imzaTarihi;if(okulAdiManuel!==undefined)v.okulAdiManuel=okulAdiManuel;if(satirlar!==undefined)v.satirlar=satirlar;return YillikPlanRepository.tanimGuncelle(id,v);},
  secimGetir(id){return YillikPlanRepository.secimGetir(id);},secimKaydet(id,p){if(!this._goruntuleyebilir())return Promise.reject(new Error('yetkisiz'));return YillikPlanRepository.secimKaydet(id,p);},notlariGetir(o,p){return YillikPlanRepository.notlariGetir(o,p);},notKaydet(o,p,h,m){if(!this._goruntuleyebilir())return Promise.reject(new Error('yetkisiz'));return YillikPlanRepository.notKaydet(o,p,h,m);}
};
global.YillikPlanService=YillikPlanService;

const DersSaatleriRepository={
  ayarlariDinle(callback){const run=rows=>callback((rows.find(x=>x.id==='ayarlar')||null)?.id?{...rows.find(x=>x.id==='ayarlar')}:null,{source:'device'});return device().listen('dersSaatleri',run);},
  async ayarlariSunucudanOku(){global.SyncEngine?.schedule?.(0);return device().get('dersSaatleri','ayarlar')||null;},
  ayarlariKaydet(veri){return device().set('dersSaatleri',COL.dersSaatleri,'ayarlar',veri,{merge:false});}
};
global.DersSaatleriRepository=DersSaatleriRepository;
const DersSaatleriService={_yetkiKontrol(){if(!duzenleyebilir('sistemAyarlari')){toast('Bu işlem için yetkiniz yok.');return false;}return true;},ayarlariKaydet(v){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return DersSaatleriRepository.ayarlariKaydet(v);}};
global.DersSaatleriService=DersSaatleriService;

const AkademikTakvimRepository={
  dinle(callback){const run=rows=>callback(rows.find(x=>x.id==='aktif')||null,{source:'device'});return device().listen('akademikTakvim',run);},
  gorselKaydet(meta){return device().set('akademikTakvim',COL.akademikTakvim,'aktif',meta,{merge:false});},
  dosyaYukle(dosya,ilerlemeCb){return new Promise((resolve,reject)=>{const yol=`akademikTakvim/${Date.now()}_${dosya.name}`,ref=storage.ref().child(yol),g=ref.put(dosya);g.on('state_changed',s=>{if(ilerlemeCb)ilerlemeCb(Math.round((s.bytesTransferred/s.totalBytes)*100));},reject,async()=>{try{resolve({url:await g.snapshot.ref.getDownloadURL(),storagePath:yol});}catch(e){reject(e);}});});},
  dosyaSil(storagePath){return storage.ref().child(storagePath).delete();}
};
global.AkademikTakvimRepository=AkademikTakvimRepository;
const AkademikTakvimService={
  _adminMi(){return activeUser().admin===true;},dinle(cb,h){return AkademikTakvimRepository.dinle(cb,h);},
  async gorselYukle(dosya,ilerlemeCb,mevcut){if(!this._adminMi()){toast?.('Sadece admin görseli değiştirebilir.');throw new Error('yetkisiz');}if(global.DepolamaSinirService){const izin=await DepolamaSinirService.yuklemeIzniVarMi('takvim',dosya.size);if(!izin.izinVar)throw new Error('depolama-siniri:'+izin.mesaj);}const{url,storagePath}=await AkademikTakvimRepository.dosyaYukle(dosya,ilerlemeCb),kimlik=typeof _hesapKimligi==='function'?_hesapKimligi():{ad:'Admin'},yeni={gorselUrl:url,storagePath,dosyaBoyutu:dosya.size,guncellenmeTarihi:new Date().toISOString(),yukleyenAdi:kimlik.ad||'Admin'};await AkademikTakvimRepository.gorselKaydet(yeni);if(global.IstatistikService)IstatistikService.depolamaKullanimEkle('takvim',dosya.size);if(mevcut?.storagePath&&mevcut.storagePath!==storagePath){AkademikTakvimRepository.dosyaSil(mevcut.storagePath).catch(()=>{});if(mevcut.dosyaBoyutu&&global.IstatistikService)IstatistikService.depolamaKullanimCikar('takvim',mevcut.dosyaBoyutu);}return yeni;}
};
global.AkademikTakvimService=AkademikTakvimService;

function SinavSonuclariRepositoryOlustur(type,collection){return{sinavlariDinle(callback){return device().listen(type,rows=>callback([...rows].sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')))));},sinavEkle(v){return device().add(type,collection,v);},sinavGuncelle(id,v){return device().update(type,collection,id,v);},sinavSil(id){return device().remove(type,collection,id);}};}
function SinavSonuclariServisOlustur(type,collection,modulAdi){const repo=SinavSonuclariRepositoryOlustur(type,collection);return{_yetkiVar(){return typeof gorebilir==='function'&&gorebilir(modulAdi);},sinavlariDinle(cb,h){return repo.sinavlariDinle(cb,h);},sinavEkle(v){if(!this._yetkiVar())return Promise.reject(new Error('yetkisiz'));return repo.sinavEkle(v);},sinavGuncelle(id,v){if(!this._yetkiVar())return Promise.reject(new Error('yetkisiz'));return repo.sinavGuncelle(id,v);},sinavSil(id){if(!this._yetkiVar())return Promise.reject(new Error('yetkisiz'));return repo.sinavSil(id);}};}
const DenemeSonuclariService=SinavSonuclariServisOlustur('denemeSonuclari',COL.denemeSonuclari,'denemeSonuclari');
const TestSonuclariService=SinavSonuclariServisOlustur('testSonuclari',COL.testSonuclari,'testSonuclari');
global.DenemeSonuclariService=DenemeSonuclariService;global.TestSonuclariService=TestSonuclariService;
})(window);
