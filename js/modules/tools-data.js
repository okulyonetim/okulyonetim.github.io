/* Koruk Asistan — Tools veri katmanı
 * Kontrol Listeleri + Harita + Çizelgeler + Devamsızlık + Ödev/Not.
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

const DevamsizlikCizelgesiRepository={
  _belgeId(yil,ay){return `${yil}-${ay}`;},
  ayDinle(yil,ay,callback){const id=this._belgeId(yil,ay);return device().listen('devamsizlikCizelgesi',rows=>callback(rows.find(x=>x.id===id)||null,false));},
  ayGetir(yil,ay){return Promise.resolve(arr('devamsizlikCizelgesi').find(x=>x.id===this._belgeId(yil,ay))||null);},
  aySetle(yil,ay,veri){const id=this._belgeId(yil,ay);return device().set('devamsizlikCizelgesi',COL.devamsizlikCizelgesi,id,{...veri,yil,ay,guncellemeTarihi:new Date().toISOString()});},
  async gunGuncelle(yil,ay,ogretmenId,gun,kod){const id=this._belgeId(yil,ay),mevcut=arr('devamsizlikCizelgesi').find(x=>x.id===id)||{id,yil,ay,ogretmenler:{}},ogretmenler=structuredClone(mevcut.ogretmenler||{});if(!ogretmenler[ogretmenId])ogretmenler[ogretmenId]={ogretmenId,gunler:{}};ogretmenler[ogretmenId].gunler={...(ogretmenler[ogretmenId].gunler||{}),[gun]:kod};return device().set('devamsizlikCizelgesi',COL.devamsizlikCizelgesi,id,{...mevcut,ogretmenler,guncellemeTarihi:new Date().toISOString()});},
  async ogretmenVerisiSetle(yil,ay,ogretmenId,veri){const id=this._belgeId(yil,ay),mevcut=arr('devamsizlikCizelgesi').find(x=>x.id===id)||{id,yil,ay,ogretmenler:{}},ogretmenler={...(mevcut.ogretmenler||{}),[ogretmenId]:veri};return device().set('devamsizlikCizelgesi',COL.devamsizlikCizelgesi,id,{...mevcut,ogretmenler,guncellemeTarihi:new Date().toISOString()});},
  async ogretmenSil(yil,ay,ogretmenId){const id=this._belgeId(yil,ay),mevcut=arr('devamsizlikCizelgesi').find(x=>x.id===id);if(!mevcut)return;const ogretmenler={...(mevcut.ogretmenler||{})};delete ogretmenler[ogretmenId];return device().set('devamsizlikCizelgesi',COL.devamsizlikCizelgesi,id,{...mevcut,ogretmenler,guncellemeTarihi:new Date().toISOString()});},
  araliktakiAylariGetir(baslangicYilAy,bitisYilAy){const bas=baslangicYilAy.yil*12+baslangicYilAy.ay,bit=bitisYilAy.yil*12+bitisYilAy.ay;return Promise.resolve(arr('devamsizlikCizelgesi').filter(v=>{const s=Number(v.yil)*12+Number(v.ay);return s>=bas&&s<=bit;}).sort((a,b)=>(a.yil*12+a.ay)-(b.yil*12+b.ay)));}
};
global.DevamsizlikCizelgesiRepository=DevamsizlikCizelgesiRepository;
const DevamsizlikCizelgesiService={
  IDARECI_UNVANLARI:['Müdür','Müdür Yardımcısı','İdari Personel'],
  IZIN_TUR_KOD_ESLESTIRME:{'Sağlık Raporu':'R','Görevlendirme':'+'},
  HAFTAICI_ANAHTARLARI:['pzt','sal','car','per','cum'],
  _yetkiKontrol(){if(typeof duzenleyebilir!=='function'||!duzenleyebilir('personel')){if(typeof toast==='function')toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  gunSayisi(yil,ay){return new Date(yil,ay,0).getDate();},
  haftaGunu(yil,ay,gun){return new Date(yil,ay-1,gun).getDay();},
  haftaSonuMu(yil,ay,gun){const g=this.haftaGunu(yil,ay,gun);return g===0||g===6;},
  _haftaIciSaat(haftalikSaatler,yil,ay,gun){const g=this.haftaGunu(yil,ay,gun);if(g<1||g>5)return 0;return Number((haftalikSaatler||{})[this.HAFTAICI_ANAHTARLARI[g-1]])||0;},
  _resmiTatilMi(resmiTatiller,iso){return(resmiTatiller||[]).some(t=>t.tarih===iso);},
  _aktifIzinKaydi(izinKayitlari,ogretmenId,iso){return(izinKayitlari||[]).find(k=>k.ogretmenId===ogretmenId&&k.baslangic<=iso&&iso<=k.bitis)||null;},
  izinTurundenKodUret(tur){return this.IZIN_TUR_KOD_ESLESTIRME[tur]||'İ';},
  otomatikKodUret(ogretmen,yil,ay,gun,resmiTatiller,izinKayitlari){const iso=`${yil}-${String(ay).padStart(2,'0')}-${String(gun).padStart(2,'0')}`,izin=this._aktifIzinKaydi(izinKayitlari,ogretmen.ogretmenId,iso);if(izin)return this.izinTurundenKodUret(izin.tur);if(this._resmiTatilMi(resmiTatiller,iso)){const idareci=this.IDARECI_UNVANLARI.includes(ogretmen.gorev);if(!idareci)return'T';const saat=this._haftaIciSaat(ogretmen.haftalikSaatler,yil,ay,gun);return saat>0?saat:'T';}if(this.haftaSonuMu(yil,ay,gun))return null;return this._haftaIciSaat(ogretmen.haftalikSaatler,yil,ay,gun);},
  ogretmenAyiniOtomatikUret(ogretmen,yil,ay,resmiTatiller,izinKayitlari){const gunler={};for(let gun=1;gun<=this.gunSayisi(yil,ay);gun++){const kod=this.otomatikKodUret(ogretmen,yil,ay,gun,resmiTatiller,izinKayitlari);if(kod!==null)gunler[gun]=kod;}return gunler;},
  ayOlustur(yil,ay,ogretmenlerMap){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return DevamsizlikCizelgesiRepository.aySetle(yil,ay,{ogretmenler:ogretmenlerMap});},
  gunGuncelle(yil,ay,ogretmenId,gun,kod){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));const ok=['D','İ','Y','R','T','+'].includes(kod)||(!isNaN(Number(kod))&&Number(kod)>=0);if(!ok)return Promise.reject(new Error('Geçersiz kod: '+kod));return DevamsizlikCizelgesiRepository.gunGuncelle(yil,ay,ogretmenId,gun,kod);},
  ogretmeniYenidenOlustur(ogretmen,yil,ay,resmiTatiller,izinKayitlari){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));const veri={...ogretmen,gunler:this.ogretmenAyiniOtomatikUret(ogretmen,yil,ay,resmiTatiller,izinKayitlari)};return DevamsizlikCizelgesiRepository.ogretmenVerisiSetle(yil,ay,ogretmen.ogretmenId,veri);},
  ogretmenSil(yil,ay,ogretmenId){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return DevamsizlikCizelgesiRepository.ogretmenSil(yil,ay,ogretmenId);}
};
global.DevamsizlikCizelgesiService=DevamsizlikCizelgesiService;

const GRADE_TYPES=['odevTakip','notCizelgesi'];
const OdevNotCizelgeleriRepository={
  kayitlariDinle(tip,aktifUid,adminMi,callback){if(!GRADE_TYPES.includes(tip))throw new Error('gecersiz-tip');return device().listen(tip,rows=>callback(adminMi?rows:rows.filter(x=>x.sahipUid===aktifUid),{kaynak:'device'}));},
  kayitEkle(tip,veri){return device().add(tip,COL[tip],{...veri,olusturmaTarihi:new Date().toISOString()});},
  kayitGuncelle(tip,id,veri){return device().update(tip,COL[tip],id,veri);},
  kayitSil(tip,id){return device().remove(tip,COL[tip],id);},
  hucreGuncelle(tip,id,hucreAnahtari,deger){const kayit=arr(tip).find(x=>x.id===id);if(!kayit)return Promise.reject(new Error('kayit-yok'));return device().update(tip,COL[tip],id,{hucreler:{...(kayit.hucreler||{}),[hucreAnahtari]:deger}});},
  alanGuncelle(tip,id,alanAdi,deger){return device().update(tip,COL[tip],id,{[alanAdi]:deger});},
  taslakKaydet(tip,id,sutunlar,ogrenciler,hucreler){return device().update(tip,COL[tip],id,{sutunlar,ogrenciler,hucreler});}
};
global.OdevNotCizelgeleriRepository=OdevNotCizelgeleriRepository;
const OdevNotCizelgeleriService={
  sahibiMiyimYaAdminMiyim(kayit){const u=user();return u.admin===true||!!kayit&&kayit.sahipUid===u.uid;},
  _sahiplikKontrol(kayit){if(!this.sahibiMiyimYaAdminMiyim(kayit)){if(typeof toast==='function')toast('Bu çizelgeyi sadece oluşturan öğretmen veya yönetici düzenleyebilir.');return false;}return true;},
  cizelgeOlustur(tip,veri){const u=user();if(!u.uid)return Promise.reject(new Error('girissiz'));return OdevNotCizelgeleriRepository.kayitEkle(tip,{...veri,sahipUid:u.uid});},
  cizelgeSil(tip,kayit){if(!this._sahiplikKontrol(kayit))return Promise.reject(new Error('yetkisiz'));return OdevNotCizelgeleriRepository.kayitSil(tip,kayit.id);},
  cizelgeAdiGuncelle(tip,kayit,yeniAd){if(!this._sahiplikKontrol(kayit))return Promise.reject(new Error('yetkisiz'));return OdevNotCizelgeleriRepository.alanGuncelle(tip,kayit.id,'ad',yeniAd);},
  hucreGuncelle(tip,kayit,ogrenciId,sutunId,deger){if(!this._sahiplikKontrol(kayit))return Promise.reject(new Error('yetkisiz'));return OdevNotCizelgeleriRepository.hucreGuncelle(tip,kayit.id,ogrenciId+'_'+sutunId,deger);},
  taslagiKaydet(tip,taslak){if(!this._sahiplikKontrol(taslak))return Promise.reject(new Error('yetkisiz'));return OdevNotCizelgeleriRepository.taslakKaydet(tip,taslak.id,taslak.sutunlar||[],taslak.ogrenciler||[],taslak.hucreler||{});}
};
global.OdevNotCizelgeleriService=OdevNotCizelgeleriService;

async function prepareControlLists(){if(!global.SyncEngine||!global.COL)return;const types=[];if(COL.kontrolListeleri){SyncEngine.register('kontrolListeleri',COL.kontrolListeleri);types.push('kontrolListeleri');}if(COL.kontrolListeTamamlama){const u=user(),admin=!!u.admin,tid=teacherId();SyncEngine.register('kontrolListeTamamlama',COL.kontrolListeTamamlama,{query:q=>admin||!tid?q:q.where('ogretmenId','==',tid)});types.push('kontrolListeTamamlama');}if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(100);}}
async function prepareMap(){if(!global.SyncEngine||!global.COL?.haritaFavoriler)return;const u=user();SyncEngine.register('haritaFavoriler',COL.haritaFavoriler,{query:q=>u.admin===true||!u.uid?q:q.where('olusturanUid','==',u.uid)});await SyncEngine.localHydrate(['haritaFavoriler']);SyncEngine.schedule(100);}
async function prepareForms(){if(!global.SyncEngine||!global.COL)return;const types=[];for(const tip of FORM_TYPES){if(COL[tip]){SyncEngine.register(tip,COL[tip]);types.push(tip);}}if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(100);}}
async function prepareAttendance(){if(!global.SyncEngine||!global.COL?.devamsizlikCizelgesi)return;SyncEngine.register('devamsizlikCizelgesi',COL.devamsizlikCizelgesi);await SyncEngine.localHydrate(['devamsizlikCizelgesi']);SyncEngine.schedule(100);}
async function prepareGradebooks(){if(!global.SyncEngine||!global.COL)return;const u=user(),types=[];for(const tip of GRADE_TYPES){if(COL[tip]){SyncEngine.register(tip,COL[tip],{query:q=>u.admin===true||!u.uid?q:q.where('sahipUid','==',u.uid)});types.push(tip);}}if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(100);}}

global.ToolsData={prepareControlLists,prepareMap,prepareForms,prepareAttendance,prepareGradebooks,teacherId,FORM_TYPES,GRADE_TYPES};
})(window);
