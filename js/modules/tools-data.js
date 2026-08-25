/* Koruk Asistan — Tools veri katmanı
 * Kontrol Listeleri + Harita + Çizelgeler.
 * Veri AppStore/IndexedDB'de yaşar; Firestore yalnız Core SyncEngine/queue üzerinden çalışır.
 */
(function(global){
'use strict';
if(global.ToolsData)return;
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
const arr=t=>device().list(t);
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const sortLists=rows=>(Array.isArray(rows)?rows:[]).slice().sort((a,b)=>(Number(a?.sira)||0)-(Number(b?.sira)||0));
const teacherId=()=>{const u=user();return u.bagliOgretmenId||u.ogretmenId||'';};
const fakeDoc=row=>({exists:!!row,id:row?.id||'',data:()=>row||undefined});

const KontrolListeleriRepository={
  listeleriDinle(callback){return device().listen('kontrolListeleri',rows=>callback(sortLists(rows),{source:'device'}));},
  listeEkle(veri){return device().add('kontrolListeleri',COL.kontrolListeleri,veri);},
  listeGuncelle(id,veri){return device().update('kontrolListeleri',COL.kontrolListeleri,id,veri);},
  listeSil(id){return device().remove('kontrolListeleri',COL.kontrolListeleri,id);},
  tamamlamaGetir(ogretmenId,listeId){const id=`${ogretmenId}_${listeId}`;return Promise.resolve(fakeDoc(arr('kontrolListeTamamlama').find(x=>x.id===id)));},
  tamamlamaKaydet(ogretmenId,listeId,tamamlananMaddeIdler){const id=`${ogretmenId}_${listeId}`;return device().set('kontrolListeTamamlama',COL.kontrolListeTamamlama,id,{ogretmenId,listeId,tamamlananMaddeIdler:Array.isArray(tamamlananMaddeIdler)?tamamlananMaddeIdler:[]},{merge:true});},
  tumTamamlamalariDinle(listeId,callback){return device().listen('kontrolListeTamamlama',rows=>callback(rows.filter(x=>x.listeId===listeId)));}
};
global.KontrolListeleriRepository=KontrolListeleriRepository;
const KontrolListeleriService={
  _yaziYetkisiVar(){return typeof duzenleyebilir==='function'&&duzenleyebilir('kontrolListeleri');},
  _goruntuleyebilir(){return typeof gorebilir==='function'&&gorebilir('kontrolListeleri');},
  listeleriDinle(cb,hataCb){try{return KontrolListeleriRepository.listeleriDinle(cb,hataCb);}catch(e){hataCb?.(e);return null;}},
  listeEkle(veri){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return KontrolListeleriRepository.listeEkle(veri);},
  listeGuncelle(id,veri){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return KontrolListeleriRepository.listeGuncelle(id,veri);},
  listeSil(id){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return KontrolListeleriRepository.listeSil(id);},
  tamamlamaGetir(ogretmenId,listeId){return KontrolListeleriRepository.tamamlamaGetir(ogretmenId,listeId);},
  tamamlamaKaydet(ogretmenId,listeId,tamamlananMaddeIdler){if(!this._goruntuleyebilir()){if(typeof toast==='function')toast('Bu modülü kullanma yetkiniz yok.');return Promise.reject(new Error('yetkisiz'));}return KontrolListeleriRepository.tamamlamaKaydet(ogretmenId,listeId,tamamlananMaddeIdler);},
  tumTamamlamalariDinle(listeId,cb,hataCb){if(!this._yaziYetkisiVar())return null;try{return KontrolListeleriRepository.tumTamamlamalariDinle(listeId,cb,hataCb);}catch(e){hataCb?.(e);return null;}}
};
global.KontrolListeleriService=KontrolListeleriService;

const HaritaRepository={
  favorileriDinle(callback){return device().listen('haritaFavoriler',rows=>callback((rows||[]).slice().sort((a,b)=>String(b.olusturmaTarihi||'').localeCompare(String(a.olusturmaTarihi||'')))));},
  favoriEkle(veri){return device().add('haritaFavoriler',COL.haritaFavoriler,{...veri,olusturmaTarihi:new Date().toISOString()});},
  favoriSil(id){return device().remove('haritaFavoriler',COL.haritaFavoriler,id);}
};
global.HaritaRepository=HaritaRepository;
const HaritaService={
  _yetkiKontrol(){if(!duzenleyebilir('harita')){if(typeof toast==='function')toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  _kendiKimlik(){const u=user(),kimlik=(typeof _hesapKimligi==='function')?_hesapKimligi():{ad:''};return{uid:u.uid||null,ad:kimlik.ad||u.adSoyad||u.ad||'Kullanıcı',adminMi:u.admin===true};},
  favoriGorunurMu(f){const ben=this._kendiKimlik();return ben.adminMi||!!(ben.uid&&f.olusturanUid===ben.uid);},
  gorunurFavoriler(rows){return(rows||[]).filter(f=>this.favoriGorunurMu(f));},
  favoriSilinebilirMi(f){return this.favoriGorunurMu(f);},
  favoriEkle(veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));const ben=this._kendiKimlik();return HaritaRepository.favoriEkle({...veri,olusturanUid:ben.uid,olusturanAdi:ben.ad});},
  favoriSil(id,mevcut){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(mevcut&&!this.favoriSilinebilirMi(mevcut))return Promise.reject(new Error('sahip-degil'));return HaritaRepository.favoriSil(id);},
  guzergahKaydet(servisId,mesafeKm,koordinatlar){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(!global.TasimaRepository)return Promise.reject(new Error('tasima-hazir-degil'));return global.TasimaRepository.servisGuncelle(servisId,{guzergahMesafe:mesafeKm,guzergahKoordinatlar:koordinatlar});}
};
global.HaritaService=HaritaService;

const FORM_TYPES=['sosyalKulupler','sok','zumre','bepPlani','rehberlik','maarifRapor','belirliGunler','digerEvrak'];
const CizelgelerRepository={
  kayitlariDinle(tip,callback){if(!FORM_TYPES.includes(tip))throw new Error('gecersiz-tip');return device().listen(tip,callback);},
  kayitEkle(tip,veri){if(!FORM_TYPES.includes(tip))return Promise.reject(new Error('gecersiz-tip'));return device().add(tip,COL[tip],{...veri,eklenmeTarihi:new Date().toISOString()});},
  kayitGuncelle(tip,id,veri){return device().update(tip,COL[tip],id,veri);},
  kayitSil(tip,id){return device().remove(tip,COL[tip],id);},
  kontrolleriGuncelle(tip,id,kontroller){return device().update(tip,COL[tip],id,{kontroller});}
};
global.CizelgelerRepository=CizelgelerRepository;
const CizelgelerService={
  _yetkiKontrol(tip){if(!duzenleyebilir(tip)){if(typeof toast==='function')toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  kayitKaydet(tip,mevcutId,veri){if(!this._yetkiKontrol(tip))return Promise.reject(new Error('yetkisiz'));return mevcutId?CizelgelerRepository.kayitGuncelle(tip,mevcutId,veri):CizelgelerRepository.kayitEkle(tip,veri);},
  kayitSil(tip,id){if(!this._yetkiKontrol(tip))return Promise.reject(new Error('yetkisiz'));return CizelgelerRepository.kayitSil(tip,id);},
  kontrolToggle(tip,id,kontroller){if(!this._yetkiKontrol(tip))return Promise.reject(new Error('yetkisiz'));return CizelgelerRepository.kontrolleriGuncelle(tip,id,kontroller);},
  async cokluKayitOlustur(tip,veriTabani,sinifAlanAdi,seciliSiniflar){if(!this._yetkiKontrol(tip))throw new Error('yetkisiz');for(const sinif of seciliSiniflar)await CizelgelerRepository.kayitEkle(tip,{...veriTabani,[sinifAlanAdi]:sinif});return seciliSiniflar.length;}
};
global.CizelgelerService=CizelgelerService;

async function prepareControlLists(){if(!global.SyncEngine||!global.COL)return;const types=[];if(COL.kontrolListeleri){SyncEngine.register('kontrolListeleri',COL.kontrolListeleri);types.push('kontrolListeleri');}if(COL.kontrolListeTamamlama){const u=user(),admin=!!u.admin,tid=teacherId();SyncEngine.register('kontrolListeTamamlama',COL.kontrolListeTamamlama,{query:q=>admin||!tid?q:q.where('ogretmenId','==',tid)});types.push('kontrolListeTamamlama');}if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(100);}}
async function prepareMap(){if(!global.SyncEngine||!global.COL?.haritaFavoriler)return;const u=user();SyncEngine.register('haritaFavoriler',COL.haritaFavoriler,{query:q=>u.admin===true||!u.uid?q:q.where('olusturanUid','==',u.uid)});await SyncEngine.localHydrate(['haritaFavoriler']);SyncEngine.schedule(100);}
async function prepareForms(){if(!global.SyncEngine||!global.COL)return;const types=[];for(const tip of FORM_TYPES){if(COL[tip]){SyncEngine.register(tip,COL[tip]);types.push(tip);}}if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(100);}}

global.ToolsData={prepareControlLists,prepareMap,prepareForms,teacherId,FORM_TYPES};
})(window);
