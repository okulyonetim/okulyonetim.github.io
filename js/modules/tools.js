/* Koruk Asistan — Tools tek modül
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
  GUN_KISA_ADLARI:['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'],
  _yetkiKontrol(){if(typeof duzenleyebilir!=='function'||!duzenleyebilir('personel')){if(typeof toast==='function')toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  gunSayisi(yil,ay){return new Date(yil,ay,0).getDate();},
  haftaGunu(yil,ay,gun){return new Date(yil,ay-1,gun).getDay();},
  haftaSonuMu(yil,ay,gun){const g=this.haftaGunu(yil,ay,gun);return g===0||g===6;},
  _haftaIciSaat(haftalikSaatler,yil,ay,gun){const g=this.haftaGunu(yil,ay,gun);if(g<1||g>5)return 0;return Number((haftalikSaatler||{})[this.HAFTAICI_ANAHTARLARI[g-1]])||0;},
  _resmiTatilMi(resmiTatiller,iso){return(resmiTatiller||[]).some(t=>t.tarih===iso);},
  _izinTarihAnahtari(v){if(!v)return'';if(typeof v==='string')return v.slice(0,10);if(v?.toDate)v=v.toDate();const d=v instanceof Date?v:new Date(v);if(Number.isNaN(d.getTime()))return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;},
  _aktifIzinKaydi(izinKayitlari,ogretmenId,iso){return(izinKayitlari||[]).find(k=>{if(String(k.ogretmenId||k.personelId||'')!==String(ogretmenId||''))return false;const bas=this._izinTarihAnahtari(k.baslangicTarihi||k.baslangic),bit=this._izinTarihAnahtari(k.bitisTarihi||k.bitis)||bas;return !!bas&&bas<=iso&&iso<=bit})||null;},
  izinTurundenKodUret(tur){return this.IZIN_TUR_KOD_ESLESTIRME[tur]||'İ';},
  otomatikKodUret(ogretmen,yil,ay,gun,resmiTatiller,izinKayitlari){const iso=`${yil}-${String(ay).padStart(2,'0')}-${String(gun).padStart(2,'0')}`,izin=this._aktifIzinKaydi(izinKayitlari,ogretmen.ogretmenId,iso);if(izin)return this.izinTurundenKodUret(izin.tur);if(this._resmiTatilMi(resmiTatiller,iso)){const idareci=this.IDARECI_UNVANLARI.includes(ogretmen.gorev);if(!idareci)return'T';const saat=this._haftaIciSaat(ogretmen.haftalikSaatler,yil,ay,gun);return saat>0?saat:'T';}if(this.haftaSonuMu(yil,ay,gun))return null;return this._haftaIciSaat(ogretmen.haftalikSaatler,yil,ay,gun);},
  ogretmenAyiniOtomatikUret(ogretmen,yil,ay,resmiTatiller,izinKayitlari){const gunler={};for(let gun=1;gun<=this.gunSayisi(yil,ay);gun++){const kod=this.otomatikKodUret(ogretmen,yil,ay,gun,resmiTatiller,izinKayitlari);if(kod!==null)gunler[gun]=kod;}return gunler;},
  excelSatirlarindanAyOlustur(satirlar,yil,ay,mevcutOgretmenler,resmiTatiller,izinKayitlari){const map={};for(const satir of satirlar||[]){const eslesen=this._adaGoreOgretmenBul(mevcutOgretmenler,satir.adSoyad),ogretmenId=satir.ogretmenId||eslesen?.id||`disaridan_${this._slug(satir.adSoyad)}`,ogretmen={ogretmenId,adSoyad:satir.adSoyad,gorev:satir.gorev||eslesen?.unvan||'',haftalikSaatler:{pzt:Number(satir.pzt)||0,sal:Number(satir.sal)||0,car:Number(satir.car)||0,per:Number(satir.per)||0,cum:Number(satir.cum)||0}};ogretmen.gunler=this.ogretmenAyiniOtomatikUret(ogretmen,yil,ay,resmiTatiller,izinKayitlari);map[ogretmenId]=ogretmen;}return map;},
  _adaGoreOgretmenBul(ogretmenler,adSoyad){const norm=v=>String(v||'').trim().toLocaleUpperCase('tr-TR').replace(/\s+/g,' '),hedef=norm(adSoyad);return(ogretmenler||[]).find(o=>norm(`${o.ad||''} ${o.soyad||''}`)===hedef||norm(o.adSoyad)===hedef)||null;},
  _slug(v){return String(v||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');},
  ayOlustur(yil,ay,ogretmenlerMap){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return DevamsizlikCizelgesiRepository.aySetle(yil,ay,{ogretmenler:ogretmenlerMap});},
  gunGuncelle(yil,ay,ogretmenId,gun,kod){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));const ok=['D','İ','Y','R','T','+'].includes(kod)||(!isNaN(Number(kod))&&Number(kod)>=0);if(!ok)return Promise.reject(new Error('Geçersiz kod: '+kod));return DevamsizlikCizelgesiRepository.gunGuncelle(yil,ay,ogretmenId,gun,kod);},
  ogretmeniYenidenOlustur(ogretmen,yil,ay,resmiTatiller,izinKayitlari){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));const veri={...ogretmen,gunler:this.ogretmenAyiniOtomatikUret(ogretmen,yil,ay,resmiTatiller,izinKayitlari)};return DevamsizlikCizelgesiRepository.ogretmenVerisiSetle(yil,ay,ogretmen.ogretmenId,veri);},
  ogretmenVerisiGuncelle(yil,ay,ogretmenId,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return DevamsizlikCizelgesiRepository.ogretmenVerisiSetle(yil,ay,ogretmenId,veri);},
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

async function prepareControlLists(){if(!global.SyncEngine||!global.COL)return;const types=[];for(const tip of ['kontrolListeleri','ogretmenler','siniflar']){if(COL[tip]){SyncEngine.register(tip,COL[tip]);types.push(tip);}}if(COL.kontrolListeTamamlama){const u=user(),admin=!!u.admin,tid=teacherId();SyncEngine.register('kontrolListeTamamlama',COL.kontrolListeTamamlama,{query:q=>admin||!tid?q:q.where('ogretmenId','==',tid)});types.push('kontrolListeTamamlama');}for(const tip of FORM_TYPES){if(COL[tip]){SyncEngine.register(tip,COL[tip]);types.push(tip);}}if(types.length){const hydrated=[...new Set(types)];await SyncEngine.localHydrate(hydrated);if(typeof SyncEngine.pull==='function')await SyncEngine.pull(hydrated);SyncEngine.schedule(100);}}
async function prepareMap(){if(!global.SyncEngine||!global.COL?.haritaFavoriler)return;const u=user();SyncEngine.register('haritaFavoriler',COL.haritaFavoriler,{query:q=>u.admin===true||!u.uid?q:q.where('olusturanUid','==',u.uid)});await SyncEngine.localHydrate(['haritaFavoriler']);SyncEngine.schedule(100);}
async function prepareForms(){if(!global.SyncEngine||!global.COL)return;const types=[];for(const tip of FORM_TYPES){if(COL[tip]){SyncEngine.register(tip,COL[tip]);types.push(tip);}}if(types.length){await SyncEngine.localHydrate(types);
/* KÖK NEDEN DÜZELTMESİ: SyncEngine.schedule() tip almaz; yalnızca AUTO_SYNC_TYPES (duyuru, hatırlatıcı, görev, yemek) çeker.
   Form tipleri (belirliGunler dahil) hiçbir zaman Firestore'dan çekilmiyordu; yalnızca cihazdaki yerel önbellekten okunuyordu.
   Önbellek boşalınca/başka cihazda veri Firestore'da dururken ekrana gelmiyordu. prepareControlLists ile aynı desen: tipler açıkça çekilir. */
try{
  const bos=types.filter(t=>!(global.AppStore?.data?.(t)||[]).length);
  await SyncEngine.pull(types);/* 24 saatlik TTL'e uyar; hiç çekilmemiş tipler "stale" sayılır */
  /* Yerel liste hâlâ boşsa TTL/delta atlanmasın: tam çekim zorla (delta yalnızca değişenleri getirir, boş yerelde eksik kalırdı). */
  const hala=bos.filter(t=>!(global.AppStore?.data?.(t)||[]).length);
  if(hala.length&&typeof SyncEngine.sync==='function')await SyncEngine.sync(hala,{force:true,full:true});
}catch(e){console.warn('[Tools/prepareForms]',e?.message||e)}
SyncEngine.schedule(100);}}
async function prepareClubStudents(){if(!global.SyncEngine||!global.COL)return;const types=['ogretmenler','siniflar','veliler','sosyalKulupler'].filter(type=>COL[type]);for(const type of types)SyncEngine.register(type,COL[type]);if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(100);}}
async function prepareAttendance(){if(!global.SyncEngine||!global.COL)return;const types=['devamsizlikCizelgesi','ogretmenler','dersProgrami','resmiTatiller','ogretmenIzinleri','dersSaatleri'].filter(t=>COL[t]);for(const type of types)SyncEngine.register(type,COL[type]);if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(100);}}
async function prepareGradebooks(){if(!global.SyncEngine||!global.COL)return;const u=user(),types=[];for(const tip of GRADE_TYPES){if(COL[tip]){SyncEngine.register(tip,COL[tip],{query:q=>u.admin===true||!u.uid?q:q.where('sahipUid','==',u.uid)});types.push(tip);}}if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(100);}}

global.ToolsData={prepareControlLists,prepareMap,prepareForms,prepareClubStudents,prepareAttendance,prepareGradebooks,teacherId,FORM_TYPES,GRADE_TYPES};
})(window);

/* ========================= TOOLS UI ========================= */
(function(global){
'use strict';if(global.ToolsModule)return;
let mounted=false,active='checklists',unsubs=[],attendanceDate=new Date(),attendanceScrollLeft=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const teacherRows=()=>{const merged=new Map();for(const row of [...arr('ogretmenler'),...(global.DeviceData?.list?.('ogretmenler')||[])]){if(!row?.id)continue;merged.set(String(row.id),row)}return [...merged.values()]};
const currentTeacherId=()=>global.ToolsData?.teacherId?.()||'';
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
function shell(){return `<section class="ka-stack" data-tools-module><div class="ka-row ka-row--between"><div><h2>Araçlar</h2><p class="ka-muted">Okul yönetimi yardımcı araçları cihaz verisinden çalışır.</p></div><span id="toolsCount" class="ka-badge"></span></div><div id="toolsContent" class="ka-stack"></div></section>`}
let checklistOpenId='',checklistFilter='tumu',checklistModal=null,checklistModalKeyHandler=null;
const CHECKLIST_ICONS=['📌','✅','📋','📝','📚','📅','📎','🔔','🎯','👥','🏫','📊','✍️','📂','🧾','⭐'];
const CHECKLIST_COLORS=['#087653','#0f8f66','#2f80ed','#7c3aed','#d97706','#be123c','#0891b2','#4f46e5'];
const CHECKLIST_LABELS={sosyalKulupler:'Sosyal Kulüp',sok:'ŞÖK',zumre:'Zümre',bepPlani:'Yıllık / BEP Planı',rehberlik:'Rehberlik',maarifRapor:'Maarif Model'};
const CHECKLIST_CONTROL_LABELS={sosyalKulupler:['Yıllık Plan','Toplum Hizm. Planı','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','Sene Sonu Rap.'],zumre:['1. Dönem','2. Dönem','Yıl Sonu'],sok:['1. Dönem','2. Dönem','Yıl Sonu'],bepPlani:['Yıllık Ders Planı','BEP Planı'],rehberlik:['Yıllık Çalışma Planı','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','1.Dönem Sonu Rap.','Sene Sonu Rap.'],maarifRapor:['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz']};
const CHECKLIST_MONTHS=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
function canEditChecklists(){return !!global.KontrolListeleriService?._yaziYetkisiVar?.()}
function teacherName(id,fallback=''){const o=teacherRows().find(x=>String(x?.id||'')===String(id||''));if(!o){const snapshot=String(fallback||'').trim();return snapshot||'Silinmiş öğretmen'}const name=`${o.ad||''} ${o.soyad||''}`.trim()||String(o.adSoyad||'').trim();return name||String(fallback||'').trim()||'İsimsiz öğretmen'}
function teacherStages(o){if(!o)return[];if(Array.isArray(o.gorevYeriKademeleri)&&o.gorevYeriKademeleri.length)return o.gorevYeriKademeleri.slice();if(o.gorevYeriKademesi)return[o.gorevYeriKademesi];if(o.kadroKademesi)return[o.kadroKademesi];return[]}
function itemTargetLabel(item){if(item.baglıEvrak){const ids=linkedIds(item),type=item.baglıEvrak.tip;return `${CHECKLIST_LABELS[type]||type} · ${ids.length} kayıt`}if(!item.hedefTip||item.hedefTip==='herkes')return'Tüm öğretmenler';if(item.hedefTip==='ilkokul')return'İlkokul';if(item.hedefTip==='ortaokul')return'Ortaokul';if(item.hedefTip==='ozel'){const ids=Array.isArray(item.hedefOgretmenIdler)?item.hedefOgretmenIdler:[],snapshots=item.hedefOgretmenAdlari||{};return ids.length?ids.map(id=>teacherName(id,snapshots[String(id)]||'')).join(', '):'Belirli öğretmenler'}return''}
function linkedIds(item){const b=item?.baglıEvrak;if(!b)return[];return Array.isArray(b.kayitIdler)?b.kayitIdler.filter(Boolean):(b.kayitId?[b.kayitId]:[])}
function linkedIndexes(item){const b=item?.baglıEvrak;if(!b)return[];return Array.isArray(b.kontrolIndexler)?b.kontrolIndexler.map(Number).filter(Number.isInteger):(b.kontrolIndex!==undefined?[Number(b.kontrolIndex)]:[])}
function linkedRecords(item){return linkedIds(item).map(id=>arr(item.baglıEvrak?.tip).find(x=>String(x.id)===String(id))).filter(Boolean)}
function recordTeacherIds(type,row){if(!row)return[];if(type==='sosyalKulupler')return Array.isArray(row.ogretmenIdler)?row.ogretmenIdler.filter(Boolean):(row.ogretmenId?[row.ogretmenId]:[]);return row.ogretmenId?[row.ogretmenId]:[]}
function recordTeacherName(row,id){if(!row)return'';const candidates=[row.ogretmenAdSoyad,row.ogretmenAdi,row.ogretmenAdiSoyadi,row.adSoyad,row.teacherName,row.ogretmenAd].filter(Boolean);if(candidates.length){const names=String(candidates[0]).trim();if(names)return names}const map=row.ogretmenAdSoyadlari||row.ogretmenAdlari||{};return String(map?.[String(id)]||'').trim()}
function canonicalTeacherClasses(ids){const wanted=new Set((ids||[]).map(String));if(!wanted.size)return[];const rows=arr('siniflar');const out=[];for(const row of rows){const tid=String(row?.sinifOgretmeniId||row?.ogretmenId||row?.rehberOgretmenId||'');if(!tid||!wanted.has(tid))continue;const label=String(row?.ad||row?.sinifAdi||row?.sinif||'').trim();if(label&&!out.includes(label))out.push(label)}return out}
function recordClassLabel(type,row,ids){if(type==='sok'||type==='rehberlik'){const canonical=canonicalTeacherClasses(ids);if(canonical.length)return canonical.join(', ')}return String(row?.sinif||'').trim()}
function recordLabel(type,row){if(!row)return'Silinmiş kayıt';const ids=recordTeacherIds(type,row),names=ids.map(id=>teacherName(id,recordTeacherName(row,id))).filter(Boolean).join(', '),classLabel=recordClassLabel(type,row,ids);if(type==='sosyalKulupler')return row.ad||row.kulupAdi||names||'Sosyal Kulüp';if(type==='zumre')return [names,row.brans,row.sinif].filter(Boolean).join(' · ')||'Zümre';if(type==='sok')return [names,classLabel,row.ad].filter(Boolean).join(' · ')||'ŞÖK';if(type==='bepPlani')return [names,row.brans,row.sinif,row.ogrenciAdi].filter(Boolean).join(' · ')||'BEP Planı';if(type==='rehberlik')return [names,classLabel,row.ad].filter(Boolean).join(' · ')||'Rehberlik';if(type==='maarifRapor')return [names,row.ders,row.sinif].filter(Boolean).join(' · ')||'Maarif Model';return row.ad||row.baslik||row.id||'Kayıt'}
function itemTargetsTeacher(item,tid=currentTeacherId()){if(!tid)return true;if(item.baglıEvrak)return linkedRecords(item).some(row=>recordTeacherIds(item.baglıEvrak.tip,row).map(String).includes(String(tid)));if(!item.hedefTip||item.hedefTip==='herkes')return true;if(item.hedefTip==='ozel')return(Array.isArray(item.hedefOgretmenIdler)?item.hedefOgretmenIdler:[]).map(String).includes(String(tid));const teacher=arr('ogretmenler').find(x=>String(x.id)===String(tid));return teacherStages(teacher).includes(item.hedefTip)}
function controlLabels(type){return global.BelgeDurumuService?.etiketler?.(type)||CHECKLIST_CONTROL_LABELS[type]||[]}
function monthlyDeadline(label){const idx=CHECKLIST_MONTHS.indexOf(label);if(idx<0)return'';const now=new Date(),candidate=new Date(now.getFullYear(),idx+1,7);if(candidate>now)candidate.setFullYear(candidate.getFullYear()-1);return `${candidate.getFullYear()}-${String(candidate.getMonth()+1).padStart(2,'0')}-07`}
function linkedSingleDate(type,row,index){if(!row)return'';if(type==='zumre'||type==='sok')return row[`tarih${Number(index)+1}`]||'';if(type==='bepPlani')return Number(index)===0?(row.yillikDersPlaniTarihi||''):(row.bepPlaniTarihi||'');if(type==='sosyalKulupler'){if(Number(index)===0)return row.yillikPlanTarihi||'';if(Number(index)===1)return row.toplumHizmetiTarihi||'';if(Number(index)>=2&&Number(index)<=10)return monthlyDeadline(['Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'][Number(index)-2]);return''}if(type==='rehberlik'){if(Number(index)===0)return row.yillikPlanTarihi||'';if(Number(index)>=1&&Number(index)<=9)return monthlyDeadline(['Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'][Number(index)-1]);return''}if(type==='maarifRapor')return monthlyDeadline(controlLabels(type)[Number(index)]||'');return''}
function linkedDate(item,records=linkedRecords(item)){const type=item.baglıEvrak?.tip,indexes=linkedIndexes(item),dates=[];for(const row of records)for(const idx of indexes){const d=linkedSingleDate(type,row,idx);if(d)dates.push(String(d).slice(0,10))}return dates.sort()[0]||''}
function recordComplete(row,indexes,type=''){const live=type==='bepPlani'?indexes.filter(i=>!(i===0?row?.yillikPlanVar===false:i===1?row?.bepPlanVar===false:false)):indexes;return !!row&&indexes.length>0&&live.every(i=>!!row.kontroller?.[i])}
function linkedState(item){const records=linkedRecords(item),indexes=linkedIndexes(item),tid=currentTeacherId();if(!records.length||!indexes.length)return{done:false,total:records.length,doneCount:0,records,indexes};let scoped=records;if(!canEditChecklists()&&tid){const own=records.filter(r=>recordTeacherIds(item.baglıEvrak.tip,r).map(String).includes(String(tid)));if(own.length)scoped=own}const doneCount=scoped.filter(r=>recordComplete(r,indexes,item.baglıEvrak.tip)).length;return{done:scoped.length>0&&doneCount===scoped.length,total:scoped.length,doneCount,records:scoped,indexes}}
function completedFor(listId,tid=currentTeacherId()){if(!tid)return null;return arr('kontrolListeTamamlama').find(x=>String(x.listeId)===String(listId)&&String(x.ogretmenId)===String(tid))||null}
function independentDone(listId,itemId){const rec=completedFor(listId),ids=new Set(rec?.tamamlananMaddeIdler||[]);return ids.has(itemId)}
function dayDiff(date){if(!date)return null;const today=new Date();today.setHours(0,0,0,0);const d=new Date(String(date).slice(0,10)+'T00:00:00');return Number.isNaN(d.getTime())?null:Math.round((d-today)/86400000)}
function formatChecklistDate(date){if(!date)return'';const d=new Date(String(date).slice(0,10)+'T00:00:00');return Number.isNaN(d.getTime())?String(date):d.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})}
function checklistRows(list){let items=(Array.isArray(list?.maddeler)?list.maddeler:[]).slice().sort((a,b)=>(Number(a.sira)||0)-(Number(b.sira)||0));if(!canEditChecklists())items=items.filter(item=>itemTargetsTeacher(item));return items.map((item,index)=>{const linked=!!item.baglıEvrak,state=linked?linkedState(item):null,done=linked?state.done:independentDone(list.id,item.id),date=linked?linkedDate(item,state.records):(item.tarih||''),diff=dayDiff(date);return{item,index,linked,state,done,date,diff,late:!done&&diff!==null&&diff<0,upcoming:!done&&diff!==null&&diff>=0&&diff<=30}})}
function visibleChecklists(){const lists=arr('kontrolListeleri').slice().sort((a,b)=>(Number(a.sira)||0)-(Number(b.sira)||0));return canEditChecklists()?lists:lists.filter(x=>x.yayinda!==false)}
/* ---- Kontrol Listeleri: kcl/kcz tasarım diliyle yeniden tasarlandı (kkl-*) ---- */
const KLI=d=>`<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const KLICON={
  plus:KLI('<path d="M12 5v14M5 12h14"/>'),
  edit:KLI('<path d="M4 20h4L19 9a2.2 2.2 0 0 0-3.1-3.1L5 17z"/><path d="m14 7 3 3"/>'),
  trash:KLI('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>'),
  print:KLI('<path d="M6 9V3h12v6"/><rect x="5" y="14" width="14" height="7" rx="1.6"/><path d="M5 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1"/>'),
  chev:KLI('<path d="m9 6 6 6-6 6"/>'),
  back:KLI('<path d="m15 6-6 6 6 6"/>'),
  check:KLI('<path d="m5 12.5 4.2 4.2L19 7"/>'),
  chart:KLI('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
  gear:KLI('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
  search:KLI('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  cal:KLI('<rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
  link:KLI('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  user:KLI('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>')
};
let checklistListFilter='hepsi',checklistQuery='';
function dayLabel(diff){return diff===null?'':diff<0?`${-diff} gün gecikti`:diff===0?'Bugün':diff===1?'Yarın':`${diff} gün kaldı`}
function shortDate(date){if(!date)return'';const d=new Date(String(date).slice(0,10)+'T00:00:00');return Number.isNaN(d.getTime())?String(date):d.toLocaleDateString('tr-TR')}
function checklistStats(list){
  const rows=checklistRows(list),done=rows.filter(x=>x.done).length,late=rows.filter(x=>x.late).length,upcoming=rows.filter(x=>x.upcoming).length,pct=rows.length?Math.round(done/rows.length*100):0;
  const next=rows.filter(x=>!x.done).slice().sort((a,b)=>(a.date?1:0)===(b.date?1:0)?String(a.date||'').localeCompare(String(b.date||'')):(a.date?-1:1))[0]||null;
  const key=!rows.length?'bos':done===rows.length?'tamam':late?'geciken':'devam';
  return{rows,done,late,upcoming,pct,next,key,total:rows.length}}
function statusText(s){return s.key==='bos'?'Madde yok':s.key==='tamam'?'Tamamlandı':s.key==='geciken'?`${s.late} gecikmiş`:s.upcoming?`${s.upcoming} yaklaşan`:'Devam ediyor'}
function statusTone(s){return s.key==='tamam'?'is-done':s.key==='geciken'?'is-late':s.upcoming?'is-soon':''}
function applyKklVars(scope){scope?.querySelectorAll?.('[data-kkl-p]').forEach(el=>el.style.setProperty('--kkl-p',String(Number(el.dataset.kklP)||0)));scope?.querySelectorAll?.('[data-kkl-accent]').forEach(el=>el.style.setProperty('--kkl-accent',el.dataset.kklAccent||''))}
function kklKpis(list){return `<div class="kcl-kpis kcz-kpis">${list.map(([n,l,c])=>`<div${c?` class="${c}"`:''}><span class="kcl-n">${esc(n)}</span><small>${esc(l)}</small></div>`).join('')}</div>`}
function kklSeg(items,cur,attr){return `<div class="kpd-seg kpd-seg--wide kcz-seg" role="group" aria-label="Durum süzgeci">${items.map(([v,l,n])=>`<button type="button" class="${cur===v?'active':''}" ${attr}="${v}" aria-pressed="${cur===v}">${esc(l)}<small>${n}</small></button>`).join('')}</div>`}
function kklEmpty(title,text){return `<div class="kcl-empty"><b>${esc(title)}</b><span>${esc(text)}</span></div>`}

function checklistCard(list){
  const s=checklistStats(list),editable=canEditChecklists(),tone=statusTone(s);
  return `<article class="kcl-card kkl-card is-${s.key}" data-kl-open="${esc(list.id)}" tabindex="0" role="button" aria-label="${esc(list.ad||'Kontrol listesi')} listesini aç">
  <div class="kkl-top"><span class="kkl-ring" data-kkl-p="${s.pct}" aria-hidden="true"><b>${s.pct}%</b></span><span class="kcl-card-main"><strong>${esc(list.ad||'Kontrol Listesi')}</strong><small><span>${esc(list.aciklama||`${s.total} madde`)}</span></small></span>${editable?`<button class="kcl-icon" type="button" data-kl-settings="${esc(list.id)}" aria-label="${esc(list.ad||'Liste')} ayarları">${KLICON.gear}</button>`:''}</div>
  <div class="kkl-meta"><span class="kbe-when ${tone}">${esc(statusText(s))}</span>${editable&&list.yayinda===false?'<span class="kbe-when">Taslak</span>':''}<span class="kbe-span">${s.done}/${s.total} madde</span></div>
  ${s.next?`<p class="kkl-next"><span>Sıradaki</span><b>${esc(s.next.item.metin||s.next.item.ad||'Madde')}</b>${s.next.date?`<small class="${s.next.late?'is-late':''}">${esc(dayLabel(s.next.diff))}</small>`:''}</p>`:''}
  <footer class="kcl-card-foot kkl-foot"><span class="kcl-chip kbe-open">${s.key==='tamam'?'Tamamlandı':'Listeyi aç'}${KLICON.chev}</span></footer></article>`}
function checklistListMatches(list,f,q){
  const s=checklistStats(list);
  if(q){const hay=norm([list.ad,list.aciklama,...s.rows.map(r=>r.item.metin)].join(' '));if(!hay.includes(norm(q)))return false}
  if(f==='devam')return s.key==='devam'||s.key==='geciken';if(f==='tamam')return s.key==='tamam';if(f==='geciken')return s.key==='geciken';if(f==='taslak')return list.yayinda===false;return true}
function checklistResultsHtml(){
  const lists=visibleChecklists();
  if(!lists.length)return kklEmpty('Henüz kontrol listesi yok',canEditChecklists()?'Yeni liste düğmesiyle ilk listenizi oluşturun.':'Yöneticiniz bir liste yayınladığında burada görünür.');
  const shown=lists.filter(l=>checklistListMatches(l,checklistListFilter,checklistQuery));
  if(!shown.length)return kklEmpty('Sonuç bulunamadı','Arama metnini veya durum süzgecini değiştirin.');
  return `<div class="kkl-grid">${shown.map(checklistCard).join('')}</div>`}
function norm(v){return String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i')}
function checklistOverview(lists){
  const st=lists.map(checklistStats),total=st.reduce((n,s)=>n+s.total,0),done=st.reduce((n,s)=>n+s.done,0),late=st.reduce((n,s)=>n+s.late,0),up=st.reduce((n,s)=>n+s.upcoming,0),
    count=f=>lists.filter(l=>checklistListMatches(l,f,'')).length,items=[['hepsi','Tümü',lists.length],['devam','Devam',count('devam')],['tamam','Tamamlanan',count('tamam')],['geciken','Geciken',count('geciken')]];
  if(canEditChecklists()&&lists.some(l=>l.yayinda===false))items.push(['taslak','Taslak',count('taslak')]);
  return `<section class="kcl-overview" aria-label="Kontrol listeleri özeti">${kklKpis([[lists.length,'Liste'],[`${done}/${total}`,'Madde tamamlandı'],[up,'Yaklaşan'],[late,'Geciken',late?'is-warn':'']])}${lists.length?kklSeg(items,checklistListFilter,'data-kkl-lfilter'):''}</section>`}

function checklistTask(row,list){
  const item=row.item,editable=canEditChecklists(),target=editable?itemTargetLabel(item):'',tone=row.done?'is-done':row.late?'is-late':row.upcoming?'is-soon':'',
    when=row.date?`${shortDate(row.date)}${row.done?'':` · ${dayLabel(row.diff)}`}`:'Son tarih yok',
    linkedMeta=row.linked?`${CHECKLIST_LABELS[item.baglıEvrak.tip]||item.baglıEvrak.tip} · ${row.state.doneCount}/${row.state.total} kayıt`:'';
  return `<article class="kkl-task ${row.done?'is-done':''} ${row.late?'is-late':''}" data-kkl-accent="${esc(item.renk||'')}">
  <label class="kkl-check"><input type="checkbox" data-kl-toggle="${esc(item.id)}" ${row.done?'checked':''} aria-label="${esc(item.metin||'Madde')} tamamlandı"><span class="kkl-check__mark" aria-hidden="true">${KLICON.check}</span></label>
  <button class="kkl-task__main" type="button" data-kl-item-open="${esc(item.id)}" aria-label="${esc(item.metin||'Madde')} ayrıntıları"><span class="kkl-ic" aria-hidden="true">${esc(item.ikon||'📌')}</span><span class="kkl-task__text"><strong>${esc(item.metin||item.ad||'Madde')}</strong><span class="kkl-task__meta"><span class="kbe-when ${tone}">${esc(when)}</span>${target&&!row.linked?`<span class="kkl-chip-meta">${esc(target)}</span>`:''}${row.linked?`<span class="kkl-chip-meta">${KLICON.link}${esc(editable?linkedMeta:(CHECKLIST_LABELS[item.baglıEvrak.tip]||'Bağlı evrak'))}</span>`:''}</span></span><span class="kkl-task__no">${row.index+1}</span></button>
  ${editable?`<span class="kkl-task__acts"><button class="kcl-icon" type="button" data-kl-item-edit="${esc(item.id)}" aria-label="${esc(item.metin||'Madde')} maddesini düzenle">${KLICON.edit}</button><button class="kcl-icon is-danger" type="button" data-kl-item-delete="${esc(item.id)}" aria-label="${esc(item.metin||'Madde')} maddesini sil">${KLICON.trash}</button></span>`:''}</article>`}
function checklistSummary(rows){const done=rows.filter(x=>x.done).length,pct=rows.length?Math.round(done/rows.length*100):0;return `<div class="kkl-hero"><span class="kkl-ring is-lg" data-kkl-p="${pct}" aria-hidden="true"><b>${pct}%</b></span><div class="kkl-hero__text"><strong>${done} / ${rows.length} madde tamamlandı</strong><span class="kkl-bar" aria-hidden="true"><i data-kkl-p="${pct}"></i></span></div></div>`}

function renderChecklists(){
  const content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount');if(!content)return;
  const lists=visibleChecklists(),list=checklistOpenId?lists.find(x=>String(x.id)===String(checklistOpenId)):null,editable=canEditChecklists();
  if(!list){
    checklistOpenId='';if(count)count.textContent=`${lists.length} liste`;
    content.innerHTML=`<section class="kcl-page kkl-page" data-kkl-page><div class="ka-row ka-row--between kkl-head"><p class="ka-muted">Görevleri, teslimleri ve okul süreçlerini tek yerden takip edin.</p>${editable?`<button class="ka-btn ka-class-add" type="button" data-kl-new>${KLICON.plus}<span>Yeni liste</span></button>`:''}</div>${checklistOverview(lists)}${lists.length?`<div class="kcl-toolbar kcz-toolbar"><label class="kcl-search">${KLICON.search}<input data-kkl-search type="search" value="${esc(checklistQuery)}" placeholder="Liste veya madde ara" autocomplete="off" enterkeyhint="search" aria-label="Liste veya madde ara"><button type="button" data-kkl-clear aria-label="Aramayı temizle">×</button></label></div>`:''}<div class="kkl-results" data-kkl-results>${checklistResultsHtml()}</div></section>`;
    bindChecklists();return}
  const s=checklistStats(list),rows=s.rows,
    shown=rows.filter(x=>checklistFilter==='tumu'||checklistFilter==='bekleyen'&&!x.done||checklistFilter==='tamam'&&x.done||checklistFilter==='yaklasan'&&x.upcoming||checklistFilter==='geciken'&&x.late);
  if(count)count.textContent=`${s.done}/${s.total}`;
  const fc=f=>rows.filter(x=>f==='tumu'||f==='bekleyen'&&!x.done||f==='tamam'&&x.done||f==='yaklasan'&&x.upcoming||f==='geciken'&&x.late).length;
  content.innerHTML=`<section class="kcl-page kkl-page kkl-work" data-kkl-page><header class="kkl-wh"><button class="kcl-icon" type="button" data-kl-back aria-label="Listelere dön">${KLICON.back}</button><div class="kkl-wh__title"><small class="ka-people-kicker">KONTROL LİSTESİ</small><h1>${esc(list.ad||'Kontrol Listesi')}</h1><p class="ka-muted">${esc(list.aciklama||`${s.total} madde`)}</p></div></header>
  ${checklistSummary(rows)}
  <div class="kkl-actions"><button class="ka-btn ka-btn--secondary" type="button" data-kl-print>${KLICON.print}<span>PDF / Yazdır</span></button>${editable?`<button class="ka-btn ka-btn--secondary" type="button" data-kl-summary>${KLICON.chart}<span>Özet</span></button><button class="ka-btn ka-btn--secondary" type="button" data-kl-settings="${esc(list.id)}">${KLICON.gear}<span>Ayarlar</span></button><button class="ka-btn ka-class-add" type="button" data-kl-item-new>${KLICON.plus}<span>Madde</span></button>`:''}</div>
  <section class="kcl-overview" aria-label="Liste özeti">${kklKpis([[s.total,'Madde'],[s.done,'Tamamlanan'],[s.upcoming,'Yaklaşan'],[s.late,'Geciken',s.late?'is-warn':'']])}${rows.length?kklSeg([['tumu','Tümü',fc('tumu')],['bekleyen','Bekleyen',fc('bekleyen')],['tamam','Tamamlanan',fc('tamam')],['yaklasan','Yaklaşan',fc('yaklasan')],['geciken','Geciken',fc('geciken')]],checklistFilter,'data-kl-filter'):''}</section>
  <div class="kkl-tasks">${shown.length?shown.map(x=>checklistTask(x,list)).join(''):kklEmpty(rows.length?'Bu süzgeçte madde yok':'Bu listede henüz madde yok',rows.length?'Başka bir durum süzgeci seçin.':editable?'Madde düğmesiyle ilk görevi ekleyin.':'Yöneticiniz madde eklediğinde burada görünür.')}</div>
  ${editable?`<div class="kkl-danger"><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-kl-delete-list>${KLICON.trash}<span>Listeyi sil</span></button></div>`:''}</section>`;
  bindChecklists()}
function checklistModalClose(){if(!checklistModal)return;checklistModal.remove();checklistModal=null;if(checklistModalKeyHandler)document.removeEventListener('keydown',checklistModalKeyHandler);checklistModalKeyHandler=null;if(!document.querySelector('.ka-modal-backdrop'))document.body.classList.remove('ka-layer-open')}
function checklistModalOpen(title,body,submitLabel,onSubmit,{wide=false,hideSubmit=false,kicker='Kontrol listeleri',head=''}={}){
  checklistModalClose();const ov=document.createElement('div');ov.className='ka-modal-backdrop ka-checklist-modal-backdrop';ov.dataset.klModal='';ov.style.zIndex='1400';
  ov.innerHTML=`<form class="ka-modal kcz-form kkl-sheet ${wide?'is-wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}" data-kl-modal-form><div class="ka-modal__header kkl-sheet__head">${head||`<div class="kkl-sheet__title"><small class="ka-people-kicker">${esc(kicker)}</small><h2>${esc(title)}</h2></div>`}<button class="ka-icon-button" type="button" data-kl-modal-close aria-label="Kapat">×</button></div><div class="ka-modal__body ka-stack">${body}</div><div class="ka-modal__footer"><span class="ka-grow"></span><button class="ka-btn ka-btn--secondary" type="button" data-kl-modal-close>${hideSubmit?'Kapat':'Vazgeç'}</button>${hideSubmit?'':`<button class="ka-btn ka-btn--primary" type="submit">${esc(submitLabel||'Kaydet')}</button>`}</div></form>`;
  document.body.appendChild(ov);document.body.classList.add('ka-layer-open');checklistModal=ov;applyKklVars(ov);
  ov.querySelectorAll('[data-kl-modal-close]').forEach(b=>b.onclick=checklistModalClose);ov.onclick=e=>{if(e.target===ov)checklistModalClose()};
  checklistModalKeyHandler=e=>{if(e.key==='Escape'){e.preventDefault();checklistModalClose()}};document.addEventListener('keydown',checklistModalKeyHandler);
  if(!hideSubmit)ov.querySelector('[data-kl-modal-form]').onsubmit=async e=>{e.preventDefault();await onSubmit?.(new FormData(e.currentTarget),e.currentTarget)};
  requestAnimationFrame(()=>ov.querySelector('input:not([type=hidden]),select,textarea')?.focus());return ov}
function pickItem(name,value,checked,label,type='checkbox'){return `<label class="kcz-pick__item"><input type="${type}" name="${name}" value="${esc(value)}" ${checked?'checked':''}><span>${label}</span></label>`}
function teacherChecks(selected=[]){const ids=new Set((selected||[]).map(String)),rows=teacherRows().slice().sort((a,b)=>teacherName(a.id).localeCompare(teacherName(b.id),'tr'));return `<div class="kcz-pick">${rows.map(o=>pickItem('hedefOgretmenIdler',o.id,ids.has(String(o.id)),esc(teacherName(o.id)))).join('')||'<span class="kcz-pick__none">Öğretmen kaydı bulunamadı.</span>'}</div>`}
function iconChoices(selected){return `<div class="kcz-pick kkl-icons">${CHECKLIST_ICONS.map(icon=>pickItem('ikon',icon,icon===(selected||'📌'),esc(icon),'radio')).join('')}</div>`}
function colorChoices(selected){return `<div class="kcz-pick kkl-colors">${CHECKLIST_COLORS.map(color=>`<label class="kcz-pick__item"><input type="radio" name="renk" value="${color}" ${color===(selected||CHECKLIST_COLORS[0])?'checked':''} aria-label="Renk ${color}"><span><i class="kkl-swatch" data-kkl-accent="${color}" aria-hidden="true"></i></span></label>`).join('')}</div>`}
function linkedRecordChoices(type,selected=[]){const ids=new Set((selected||[]).map(String));return `<div class="kcz-pick">${arr(type).map(row=>pickItem('bagliKayitIdler',row.id,ids.has(String(row.id)),esc(recordLabel(type,row)))).join('')||'<span class="kcz-pick__none">Bu evrak türünde kayıt bulunamadı.</span>'}</div>`}
function linkedControlChoices(type,selected=[]){const ids=new Set((selected||[]).map(Number));return `<div class="kcz-pick">${controlLabels(type).map((label,i)=>pickItem('bagliKontrolIndexler',i,ids.has(i),esc(label))).join('')||'<span class="kcz-pick__none">Bu evrak türünde kontrol alanı bulunamadı.</span>'}</div>`}
function refreshItemModalDependencies(ov,type,selectedIds=[],selectedIndexes=[]){const linkBox=ov.querySelector('[data-kl-linked-box]'),independent=ov.querySelector('[data-kl-independent-box]'),records=ov.querySelector('[data-kl-linked-records]'),controls=ov.querySelector('[data-kl-linked-controls]');if(!type){linkBox.hidden=true;independent.hidden=false;return}linkBox.hidden=false;independent.hidden=true;if(records)records.innerHTML=linkedRecordChoices(type,selectedIds);if(controls)controls.innerHTML=linkedControlChoices(type,selectedIndexes)}

function listModal(list=null){const edit=!!list;
  checklistModalOpen(edit?'Liste ayarları':'Yeni kontrol listesi',`<label class="ka-field"><span class="ka-field__label">Liste adı</span><input class="ka-input" name="ad" required value="${esc(list?.ad||'')}" placeholder="Örn: Yıl sonu işlemleri"></label><label class="ka-field"><span class="ka-field__label">Açıklama</span><textarea name="aciklama" rows="3" placeholder="Kısa açıklama">${esc(list?.aciklama||'')}</textarea></label><label class="kcz-switch"><input type="checkbox" name="yayinda" ${list?.yayinda!==false?'checked':''}><span class="kcz-switch__track" aria-hidden="true"></span><span>Diğer kullanıcılara açık</span></label><small class="ka-muted">Kapalıysa liste taslak olarak yalnız düzenleme yetkisi olanlarda görünür.</small>`,edit?'Güncelle':'Oluştur',async fd=>{
    const ad=String(fd.get('ad')||'').trim();if(!ad)return global.toast?.('Liste adı zorunludur.');
    const payload={ad,aciklama:String(fd.get('aciklama')||'').trim(),yayinda:fd.get('yayinda')==='on'};
    try{if(edit)await global.KontrolListeleriService.listeGuncelle(list.id,payload);else await global.KontrolListeleriService.listeEkle({...payload,sira:arr('kontrolListeleri').length,maddeler:[]});global.toast?.(edit?'Liste güncellendi.':'Liste oluşturuldu.');checklistModalClose()}catch(e){global.toast?.(e?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':'Liste kaydedilemedi.')}})}

function itemModal(item=null){
  const list=arr('kontrolListeleri').find(x=>String(x.id)===String(checklistOpenId));if(!list)return;
  const edit=!!item,b=item?.baglıEvrak||{},linkType=b.tip||'',selectedIds=linkedIds(item||{}),selectedIndexes=linkedIndexes(item||{}),target=item?.hedefTip||'herkes';
  const ov=checklistModalOpen(edit?'Maddeyi düzenle':'Yeni madde',`<label class="ka-field"><span class="ka-field__label">Madde</span><textarea name="metin" rows="3" required placeholder="Yapılacak işi yazın">${esc(item?.metin||'')}</textarea></label>
  <section class="kkl-field"><span class="ka-field__label">Simge</span>${iconChoices(item?.ikon||'📌')}</section>
  <section class="kkl-field"><span class="ka-field__label">Renk</span>${colorChoices(item?.renk||CHECKLIST_COLORS[0])}</section>
  <label class="ka-field"><span class="ka-field__label">Bağlı evrak <small>(isteğe bağlı)</small></span><select name="bagliTip" data-kl-link-type><option value="">Bağımsız madde</option>${Object.entries(CHECKLIST_LABELS).map(([type,label])=>`<option value="${type}" ${type===linkType?'selected':''}>${esc(label)}</option>`).join('')}</select></label>
  <div class="kkl-field" data-kl-linked-box ${linkType?'':'hidden'}><div class="kkl-field"><span class="ka-field__label">Bağlanacak kayıtlar</span><div data-kl-linked-records></div></div><div class="kkl-field"><span class="ka-field__label">Dönem / kontrol alanları</span><div data-kl-linked-controls></div></div><small class="ka-muted">Bağlı maddede tarih ve tamamlanma durumu gerçek evrak kaydından okunur.</small></div>
  <div class="kkl-field" data-kl-independent-box ${linkType?'hidden':''}><label class="ka-field"><span class="ka-field__label">Son tarih <small>(isteğe bağlı)</small></span><input class="ka-input" type="date" name="tarih" value="${esc(item?.tarih||'')}"></label><label class="ka-field"><span class="ka-field__label">Hedef</span><select name="hedefTip" data-kl-target-type><option value="herkes" ${target==='herkes'?'selected':''}>Tüm öğretmenler</option><option value="ilkokul" ${target==='ilkokul'?'selected':''}>İlkokul</option><option value="ortaokul" ${target==='ortaokul'?'selected':''}>Ortaokul</option><option value="ozel" ${target==='ozel'?'selected':''}>Belirli öğretmenler</option></select></label><div data-kl-target-teachers ${target==='ozel'?'':'hidden'}><span class="ka-field__label">Öğretmenler</span>${teacherChecks(item?.hedefOgretmenIdler||[])}</div></div>`,edit?'Güncelle':'Ekle',async fd=>{
    const metin=String(fd.get('metin')||'').trim();if(!metin)return global.toast?.('Madde metni zorunludur.');
    const bagliTip=String(fd.get('bagliTip')||''),bagliIds=fd.getAll('bagliKayitIdler').map(String),bagliIndexes=fd.getAll('bagliKontrolIndexler').map(Number).filter(Number.isInteger);
    if(bagliTip&&(!bagliIds.length||!bagliIndexes.length))return global.toast?.('Bağlı evrak için en az bir kayıt ve dönem seçin.');
    const hedefIds=bagliTip?[]:fd.getAll('hedefOgretmenIdler').map(String),hedefOgretmenAdlari=Object.fromEntries(hedefIds.map(id=>[id,teacherName(id)]));
    const payload={id:item?.id||`m${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,sira:item?.sira??list.maddeler?.length??0,ikon:String(fd.get('ikon')||'📌'),renk:String(fd.get('renk')||CHECKLIST_COLORS[0]),metin,tarih:bagliTip?'':String(fd.get('tarih')||''),hedefTip:bagliTip?'herkes':String(fd.get('hedefTip')||'herkes'),hedefOgretmenIdler:hedefIds,hedefOgretmenAdlari:bagliTip?{}:hedefOgretmenAdlari,baglıEvrak:bagliTip?{tip:bagliTip,kayitIdler:bagliIds,kontrolIndexler:bagliIndexes}:null};
    const items=(Array.isArray(list.maddeler)?list.maddeler:[]).slice();
    if(edit){const idx=items.findIndex(x=>String(x.id)===String(item.id));if(idx>=0)items[idx]={...items[idx],...payload}}else items.push(payload);
    try{await global.KontrolListeleriService.listeGuncelle(list.id,{maddeler:items.map((x,i)=>({...x,sira:i}))});global.toast?.(edit?'Madde güncellendi.':'Madde eklendi.');checklistModalClose()}catch(e){global.toast?.(e?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':'Madde kaydedilemedi.')}},{wide:true,kicker:list.ad||'Kontrol listesi'});
  ov.querySelector('[data-kl-link-type]').onchange=e=>refreshItemModalDependencies(ov,e.target.value);
  ov.querySelector('[data-kl-target-type]').onchange=e=>{const t=ov.querySelector('[data-kl-target-teachers]');if(t)t.hidden=e.target.value!=='ozel'};
  refreshItemModalDependencies(ov,linkType,selectedIds,selectedIndexes)}
async function toggleLinked(item,value){const type=item.baglıEvrak.tip,indexes=linkedIndexes(item),records=linkedRecords(item),tid=currentTeacherId();let scoped=records;if(!canEditChecklists()&&tid){const own=records.filter(r=>recordTeacherIds(type,r).map(String).includes(String(tid)));if(own.length)scoped=own}if(!scoped.length)throw new Error('Bağlı kayıt bulunamadı.');for(const row of scoped){const controls=(row.kontroller||[]).slice();for(const i of indexes){while(controls.length<=i)controls.push(false);controls[i]=!!value}await global.CizelgelerService.kontrolToggle(type,row.id,controls)}}
async function toggleChecklistItem(itemId,value){const list=arr('kontrolListeleri').find(x=>String(x.id)===String(checklistOpenId)),item=list?.maddeler?.find(x=>String(x.id)===String(itemId));if(!list||!item)return;if(item.baglıEvrak)return toggleLinked(item,value);const tid=currentTeacherId();if(!tid)throw new Error('Bağlı öğretmen kaydı bulunamadı.');const existing=completedFor(list.id,tid),ids=new Set(existing?.tamamlananMaddeIdler||[]);value?ids.add(item.id):ids.delete(item.id);return global.KontrolListeleriService.tamamlamaKaydet(tid,list.id,[...ids])}

/* Madde ayrıntı penceresi */
function itemDetail(itemId){
  const list=arr('kontrolListeleri').find(x=>String(x.id)===String(checklistOpenId));if(!list)return;
  const row=checklistRows(list).find(r=>String(r.item.id)===String(itemId));if(!row)return;
  const item=row.item,editable=canEditChecklists(),tone=row.done?'is-done':row.late?'is-late':row.upcoming?'is-soon':'';
  const status=row.done?'Tamamlandı':row.late?dayLabel(row.diff):row.date?dayLabel(row.diff):'Bekliyor';
  const facts=[['Durum',status],['Son tarih',row.date?formatChecklistDate(row.date):'Belirlenmemiş'],[row.linked?'Bağlı evrak':'Hedef',row.linked?(CHECKLIST_LABELS[item.baglıEvrak.tip]||item.baglıEvrak.tip):(editable?itemTargetLabel(item):'Size atanmış')]];
  if(row.linked)facts.push(['İlerleme',`${row.state.doneCount}/${row.state.total} kayıt`]);
  const recs=row.linked?row.state.records.map(r=>{const ok=recordComplete(r,row.state.indexes,item.baglıEvrak.tip);return `<li><span class="kkl-dot ${ok?'is-on':''}" aria-hidden="true">${ok?KLICON.check:''}</span><span class="kbe-people__text"><b>${esc(recordLabel(item.baglıEvrak.tip,r))}</b><small>${ok?'Tamamlandı':'Bekliyor'}</small></span></li>`}).join(''):'';
  const labels=row.linked?row.state.indexes.map(i=>controlLabels(item.baglıEvrak.tip)[i]).filter(Boolean):[];
  const head=`<span class="kkl-ic is-lg" data-kkl-accent="${esc(item.renk||'')}" aria-hidden="true">${esc(item.ikon||'📌')}</span><div class="kbe-sheet__title"><small class="ka-people-kicker">${esc(list.ad||'Kontrol listesi')}</small><h2>${esc(item.metin||'Madde')}</h2><p><span class="kbe-when ${tone}">${esc(status)}</span></p></div>`;
  const ov=checklistModalOpen(item.metin||'Madde',`<dl class="kbe-facts">${facts.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${labels.length?`<section class="kbe-block"><h3>Kontrol alanları</h3><div class="kcz-pick">${labels.map(l=>`<span class="kcz-pick__item"><span>${esc(l)}</span></span>`).join('')}</div></section>`:''}${recs?`<section class="kbe-block"><h3>Kayıtlar<span class="kbe-span">${row.state.doneCount}/${row.state.total}</span></h3><ul class="kbe-people">${recs}</ul></section>`:''}<div class="kkl-sheet__acts"><button class="ka-btn ${row.done?'ka-btn--secondary':'ka-btn--primary'}" type="button" data-kkl-sheet-toggle>${KLICON.check}<span>${row.done?'Tamamlandı işaretini kaldır':'Tamamlandı olarak işaretle'}</span></button>${editable?`<button class="ka-btn ka-btn--secondary" type="button" data-kkl-sheet-edit>${KLICON.edit}<span>Düzenle</span></button>`:''}</div>`,'',null,{hideSubmit:true,head});
  ov.querySelector('[data-kkl-sheet-toggle]').onclick=async e=>{const btn=e.currentTarget;btn.disabled=true;try{await toggleChecklistItem(item.id,!row.done);itemDetail(item.id)}catch(err){btn.disabled=false;global.toast?.(err?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':err?.message||'Görev güncellenemedi.')}};
  ov.querySelector('[data-kkl-sheet-edit]')?.addEventListener('click',()=>itemModal(item))}

function checklistSummaryModal(list){
  const rows=checklistRows(list),completions=arr('kontrolListeTamamlama').filter(x=>String(x.listeId)===String(list.id)),st=checklistStats(list);
  const body=`${kklKpis([[completions.length,'İşaretleyen öğretmen'],[st.total,'Madde'],[`${st.pct}%`,'Genel ilerleme'],[st.late,'Geciken',st.late?'is-warn':'']])}<div class="kkl-sumrows">${rows.map(row=>{let count=0,total=completions.length;if(row.linked){count=row.state.doneCount;total=row.state.total}else count=completions.filter(x=>(x.tamamlananMaddeIdler||[]).includes(row.item.id)).length;const pct=total?Math.round(count/total*100):0;return `<div class="kkl-sumrow"><span class="kkl-ic" data-kkl-accent="${esc(row.item.renk||'')}" aria-hidden="true">${esc(row.item.ikon||'📌')}</span><div class="kkl-sumrow__text"><strong>${esc(row.item.metin||'Madde')}</strong><small>${row.linked?'Bağlı evrak':'Öğretmen işaretlemeleri'}</small><span class="kkl-bar" aria-hidden="true"><i data-kkl-p="${pct}"></i></span></div><b>${count}/${total}</b></div>`}).join('')||kklEmpty('Özetlenecek madde yok','Önce listeye madde ekleyin.')}</div>`;
  checklistModalOpen('Tamamlama özeti',body,'',null,{wide:true,hideSubmit:true,kicker:list.ad||'Kontrol listesi'})}

async function printChecklist(list){
  const rows=checklistRows(list);
  if(!global.ReportEngine?.printReport){await global.AppLoader?.loadScript?.('js/core/report-customizer.js?v=1004').catch(()=>{});await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=5').catch(()=>{});}
  if(!global.ReportEngine?.printReport)return global.toast?.('Rapor motoru hazır değil.');
  const st=checklistStats(list),editable=canEditChecklists();
  const body=`${list.aciklama?`<p class="kkr-desc">${esc(list.aciklama)}</p>`:''}<div class="kkr-sum"><div><b>${st.done}/${st.total}</b><span>Tamamlanan</span></div><div><b>%${st.pct}</b><span>İlerleme</span></div><div><b>${st.upcoming}</b><span>Yaklaşan</span></div><div><b>${st.late}</b><span>Geciken</span></div></div><div class="kkr-bar"><i style="width:${st.pct}%"></i></div>
  <table class="kkr-table"><thead><tr><th class="kkr-no">No</th><th class="kkr-st">Durum</th><th>Görev</th><th>${editable?'Kapsam':'Tür'}</th><th class="kkr-dt">Son tarih</th></tr></thead><tbody>${rows.map((r,i)=>{const scope=r.linked?(CHECKLIST_LABELS[r.item.baglıEvrak.tip]||'Bağlı evrak')+` · ${r.state.doneCount}/${r.state.total}`:(editable?itemTargetLabel(r.item):'Bağımsız');const flag=r.done?'':r.late?'<span class="kkr-flag is-late">Gecikti</span>':'';return `<tr class="${r.done?'is-done':''}"><td class="kkr-no">${i+1}</td><td class="kkr-st"><span class="kkr-box${r.done?' is-on':''}">${r.done?'✓':''}</span></td><td><b>${esc(r.item.ikon||'')} ${esc(r.item.metin||'')}</b> ${flag}</td><td>${esc(scope)}</td><td class="kkr-dt">${esc(r.date?formatChecklistDate(r.date):'—')}</td></tr>`}).join('')||'<tr><td colspan="5" class="kkr-empty">Listede madde yok.</td></tr>'}</tbody></table>`;
  global.ReportEngine.printReport(list.ad||'Kontrol Listesi',body,{fileName:list.ad||'Kontrol Listesi',yon:'dikey',ustBaslik:'Kontrol Listeleri'})}

function findList(){return arr('kontrolListeleri').find(x=>String(x.id)===String(checklistOpenId))}
function bindListResults(content){
  content.querySelectorAll('[data-kl-open]').forEach(el=>{const open=()=>{checklistOpenId=el.dataset.klOpen;checklistFilter='tumu';renderChecklists()};el.onclick=e=>{if(e.target.closest('[data-kl-settings]'))return;open()};el.onkeydown=e=>{if(e.target!==el)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});
  content.querySelectorAll('[data-kl-settings]').forEach(b=>b.onclick=e=>{e.stopPropagation();const list=arr('kontrolListeleri').find(x=>String(x.id)===String(b.dataset.klSettings));if(list)listModal(list)});
  applyKklVars(content)}
function bindChecklists(){
  const content=document.getElementById('toolsContent');if(!content)return;
  applyKklVars(content);bindListResults(content);
  content.querySelector('[data-kl-new]')?.addEventListener('click',()=>listModal());
  const search=content.querySelector('[data-kkl-search]'),results=content.querySelector('[data-kkl-results]'),redraw=()=>{if(!results)return;results.innerHTML=checklistResultsHtml();bindListResults(results)};
  if(search)search.oninput=()=>{checklistQuery=search.value;redraw()};
  content.querySelector('[data-kkl-clear]')?.addEventListener('click',()=>{checklistQuery='';if(search){search.value='';search.focus()}redraw()});
  content.querySelectorAll('[data-kkl-lfilter]').forEach(b=>b.onclick=()=>{checklistListFilter=b.dataset.kklLfilter||'hepsi';renderChecklists()});
  content.querySelector('[data-kl-back]')?.addEventListener('click',()=>{checklistOpenId='';checklistFilter='tumu';renderChecklists()});
  content.querySelectorAll('[data-kl-filter]').forEach(b=>b.onclick=()=>{checklistFilter=b.dataset.klFilter||'tumu';renderChecklists()});
  content.querySelectorAll('[data-kl-toggle]').forEach(cb=>cb.onchange=async()=>{const old=!cb.checked;cb.disabled=true;try{await toggleChecklistItem(cb.dataset.klToggle,cb.checked);renderChecklists()}catch(e){cb.checked=old;global.toast?.(e?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':e?.message||'Görev güncellenemedi.')}finally{if(cb.isConnected)cb.disabled=false}});
  content.querySelectorAll('[data-kl-item-open]').forEach(b=>b.onclick=()=>itemDetail(b.dataset.klItemOpen));
  content.querySelector('[data-kl-item-new]')?.addEventListener('click',()=>itemModal());
  content.querySelectorAll('[data-kl-item-edit]').forEach(b=>b.onclick=()=>{const item=findList()?.maddeler?.find(x=>String(x.id)===String(b.dataset.klItemEdit));if(item)itemModal(item)});
  content.querySelectorAll('[data-kl-item-delete]').forEach(b=>b.onclick=async()=>{const list=findList(),item=list?.maddeler?.find(x=>String(x.id)===String(b.dataset.klItemDelete));if(!list||!item||!global.confirm?.(`“${item.metin||'Bu madde'}” silinsin mi?`))return;const maddeler=(list.maddeler||[]).filter(x=>String(x.id)!==String(item.id)).map((x,i)=>({...x,sira:i}));try{await global.KontrolListeleriService.listeGuncelle(list.id,{maddeler});global.toast?.('Madde silindi.')}catch(e){global.toast?.('Madde silinemedi.')}});
  content.querySelector('[data-kl-delete-list]')?.addEventListener('click',async()=>{const list=findList();if(!list||!global.confirm?.(`“${list.ad||'Kontrol listesi'}” tamamen silinsin mi?`))return;try{await global.KontrolListeleriService.listeSil(list.id);checklistOpenId='';global.toast?.('Liste silindi.');renderChecklists()}catch(e){global.toast?.('Liste silinemedi.')}});
  content.querySelector('[data-kl-summary]')?.addEventListener('click',()=>{const list=findList();if(list)checklistSummaryModal(list)});
  content.querySelector('[data-kl-print]')?.addEventListener('click',()=>{const list=findList();if(list)printChecklist(list)})}

function renderMap(){const content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount'),host=document.querySelector('[data-tools-module]');host?.classList.add('ka-tools-map-active');if(count)count.textContent='';if(!content)return;if(content.querySelector('[data-map-workspace]')){global.HaritaUI?.refresh?.();return}if(!global.HaritaUI?.mount){content.innerHTML='<div class="ka-empty">Harita motoru hazır değil.</div>';return}content.innerHTML='<div class="ka-empty">Harita hazırlanıyor…</div>';Promise.resolve(global.HaritaUI.mount(content)).catch(e=>{console.error('[Tools/Harita]',e);if(content.isConnected)content.innerHTML='<div class="ka-empty">Harita açılamadı.</div>'})}
function monthDoc(){const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1;return arr('devamsizlikCizelgesi').find(x=>x.id===`${y}-${m}`)||null}
const ATT_MONTHS=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const ATT_CODES={D:'Devamsız',İ:'İzinli',Y:'Yarım Gün',R:'Raporlu',T:'Tatil','+':'Görevlendirme (+)'};
const ATT_DAY_KEYS={Pazartesi:'pzt','Salı':'sal','Çarşamba':'car',Perşembe:'per',Cuma:'cum'};
function attDateKey(v){if(!v)return'';if(typeof v==='string')return v.slice(0,10);if(v?.toDate)v=v.toDate();const d=v instanceof Date?v:new Date(v);if(Number.isNaN(d.getTime()))return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function attHolidayRows(){const result=[],seen=new Set(),add=(t,ad='Tatil')=>{const key=attDateKey(t);if(!key||seen.has(key))return;seen.add(key);result.push({tarih:key,ad})};arr('resmiTatiller').forEach(x=>add(x?.tarih||x?.date||x,x?.ad||x?.aciklama||'Resmî Tatil'));const cfg=arr('dersSaatleri').find(x=>x.id==='ayarlar')||arr('dersSaatleri')[0]||{};let ranges=Array.isArray(cfg.tatilAraliklari)?cfg.tatilAraliklari:[];if(!ranges.length&&cfg.tatilModu&&cfg.tatilBaslangicTarihi&&cfg.okulAcilisTarihi){const end=new Date(`${cfg.okulAcilisTarihi}T12:00:00`);end.setDate(end.getDate()-1);ranges=[{ad:'Tatil Modu',baslangicTarihi:cfg.tatilBaslangicTarihi,bitisTarihi:attDateKey(end)}]}ranges.forEach(r=>{const bas=attDateKey(r?.baslangicTarihi||r?.baslangic),bit=attDateKey(r?.bitisTarihi||r?.bitis)||bas;if(!bas||!bit||bit<bas)return;const d=new Date(`${bas}T12:00:00`),last=new Date(`${bit}T12:00:00`);for(;d<=last;d.setDate(d.getDate()+1))add(d,r?.ad||'Planlı Tatil')});return result}
function attCanEdit(){return typeof global.duzenleyebilir==='function'&&global.duzenleyebilir('personel')}
function attRolePriority(role){const r=String(role||'').trim().toLocaleUpperCase('tr-TR');if(r==='MÜDÜR'||r==='OKUL MÜDÜRÜ')return 0;if(r==='MÜDÜR YARDIMCISI')return 1;return 2}
function attSortedTeachers(doc){const activeIds=new Set(arr('ogretmenler').map(x=>String(x.id||''))),rows=Object.values(doc?.ogretmenler||{}),visible=activeIds.size?rows.filter(x=>activeIds.has(String(x.ogretmenId||''))):rows;return visible.sort((a,b)=>attRolePriority(a.gorev)-attRolePriority(b.gorev)||String(a.adSoyad||'').localeCompare(String(b.adSoyad||''),'tr'))}
function attDayName(y,m,g){const names=global.DevamsizlikCizelgesiService?.GUN_KISA_ADLARI||['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];return names[new Date(y,m-1,g).getDay()]}
function attWeekend(y,m,g){return global.DevamsizlikCizelgesiService?.haftaSonuMu?.(y,m,g)??[0,6].includes(new Date(y,m-1,g).getDay())}
function attStateClass(value,weekend){if(weekend&&(value===undefined||value===null||value===''))return'is-weekend';if(value==='D')return'is-code-d';if(value==='İ')return'is-code-i';if(value==='Y')return'is-code-y';if(value==='R')return'is-code-r';if(value==='T')return'is-code-t';if(value==='+')return'is-code-plus';if(value!==undefined&&value!==null&&value!==''&&!isNaN(Number(value))&&Number(value)>0)return'is-present';return'is-empty'}
function attTotals(o){let saat=0,devam=0,devamsiz=0;Object.values(o?.gunler||{}).forEach(v=>{if(v!==''&&v!==null&&v!==undefined&&!isNaN(Number(v))){const hours=Number(v)||0;saat+=hours;if(hours>0)devam++}else if(['D','R','İ'].includes(v))devamsiz++});return{saat,devam,devamsiz}}
function attTableHtml(doc,y,m,interactive=true){const days=Array.from({length:global.DevamsizlikCizelgesiService?.gunSayisi?.(y,m)||new Date(y,m,0).getDate()},(_,i)=>i+1),rows=attSortedTeachers(doc),edit=interactive&&attCanEdit();return `<div class="ka-attendance-grid-wrap"><table class="ka-attendance-personnel-table"><thead><tr><th class="ka-att-no" rowspan="2">No</th><th class="ka-att-name" rowspan="2">Adı Soyadı</th><th class="ka-att-role" rowspan="2">Görevi</th>${days.map(g=>`<th class="ka-att-day-head ${attWeekend(y,m,g)?'is-weekend':''}">${g}</th>`).join('')}<th rowspan="2">Toplam<br>Saat</th><th rowspan="2">Toplam<br>Devam</th><th rowspan="2">Toplam<br>Devamsız</th><th class="ka-att-note-head" rowspan="2">Açıklama</th></tr><tr>${days.map(g=>`<th class="ka-att-day-head ka-att-day-name ${attWeekend(y,m,g)?'is-weekend':''}">${esc(attDayName(y,m,g))}</th>`).join('')}</tr></thead><tbody>${rows.map((o,i)=>{const totals=attTotals(o);return `<tr><td class="ka-att-no">${i+1}</td><td class="ka-att-name">${edit?`<button type="button" class="ka-att-name-btn" data-att-hours="${esc(o.ogretmenId||'')}">${esc(o.adSoyad||o.ad||o.ogretmenId||'')}</button>`:`<strong>${esc(o.adSoyad||o.ad||o.ogretmenId||'')}</strong>`}</td><td class="ka-att-role">${esc(o.gorev||'')}</td>${days.map(g=>{const v=o.gunler?.[g],weekend=attWeekend(y,m,g),cls=attStateClass(v,weekend),label=v===undefined||v===null||v===''?'':v;return `<td class="ka-att-day-cell ${cls}">${interactive?`<button type="button" class="ka-att-cell ${cls}" data-att-cell data-att-teacher="${esc(o.ogretmenId||'')}" data-att-day="${g}" ${edit?'':'disabled'}>${esc(label)}</button>`:`<span>${esc(label)}</span>`}</td>`}).join('')}<td class="ka-att-total">${totals.saat}</td><td class="ka-att-total">${totals.devam}</td><td class="ka-att-total">${totals.devamsiz}</td><td class="ka-att-note">${edit?`<button type="button" data-att-note="${esc(o.ogretmenId||'')}">${esc(o.aciklama||'—')}</button>`:esc(o.aciklama||'')}</td></tr>`}).join('')}</tbody></table></div>`}
function attLegendHtml(){const items=[['is-present','Devam (ders saati)'],['is-code-d','D – Devamsız'],['is-code-i','İ – İzinli'],['is-code-y','Y – Yarım Gün'],['is-code-r','R – Raporlu'],['is-code-t','T – Tatil'],['is-code-plus','+ – Görevlendirme (+)'],['is-weekend','Hafta Sonu']];return `<div class="ka-attendance-legend">${items.map(([cls,label])=>`<span class="ka-attendance-legend-item"><i class="${cls}"></i>${esc(label)}</span>`).join('')}</div>`}
function attYearOptions(y){const now=new Date().getFullYear(),years=[now-1,now,now+1,y].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);return years.map(v=>`<option value="${v}" ${v===y?'selected':''}>${v}</option>`).join('')}
function attToolbarHtml(doc,y,m){return `<div class="ka-attendance-toolbar"><label class="ka-field"><span class="ka-field__label">Yıl</span><select data-att-year>${attYearOptions(y)}</select></label><label class="ka-field"><span class="ka-field__label">Ay</span><select data-att-month>${ATT_MONTHS.map((name,i)=>`<option value="${i+1}" ${i+1===m?'selected':''}>${name}</option>`).join('')}</select></label><button class="ka-btn ka-btn--secondary" type="button" data-att-import>Excel'den İçe Aktar</button><input type="file" accept=".xlsx,.xlsm,.xls" data-att-file hidden><button class="ka-btn ka-attendance-print" type="button" data-att-print ${doc?'':'disabled'}>Yazdır</button><button class="ka-btn ka-attendance-auto" type="button" data-att-auto ${doc?'':'disabled'}>Otomatik Doldur/Tazele</button></div>`}
function renderAttendance(){const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1,doc=monthDoc(),teachers=attSortedTeachers(doc),content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount');if(count)count.textContent=`${teachers.length} personel`;if(!content)return;const oldGrid=content.querySelector('.ka-attendance-grid-wrap');if(oldGrid)attendanceScrollLeft=oldGrid.scrollLeft;content.innerHTML=`<section class="ka-stack ka-attendance-page" data-attendance-page>${attToolbarHtml(doc,y,m)}${doc&&teachers.length?attTableHtml(doc,y,m,true)+attLegendHtml():`<div class="ka-card ka-attendance-empty"><div class="ka-card__body ka-stack"><strong>${ATT_MONTHS[m-1]} ${y} için henüz çizelge oluşturulmamış.</strong><span class="ka-muted">Öğretmen listesinden otomatik oluşturabilir veya Excel dosyasından içe aktarabilirsiniz.</span>${attCanEdit()?'<button class="ka-btn" type="button" data-att-create>Öğretmen Listesinden Oluştur</button>':''}</div></div>`}</section>`;bindAttendance();const nextGrid=content.querySelector('.ka-attendance-grid-wrap');if(nextGrid){const restore=()=>{if(!nextGrid.isConnected)return;nextGrid.scrollLeft=Math.min(attendanceScrollLeft,Math.max(0,nextGrid.scrollWidth-nextGrid.clientWidth))};restore();global.requestAnimationFrame?.(restore)}}
function attScheduleTeacherMatches(row,teacher){
  if(!row||!teacher)return false;
  const ids=new Set([
    teacher.id,teacher.uid,teacher.ogretmenId,teacher.kullaniciId,
    teacher.bagliOgretmenId
  ].filter(v=>v!==undefined&&v!==null&&String(v).trim()).map(v=>String(v).trim()));
  const rowIds=[
    row.ogretmenId,row.teacherId,row.teacherUid,row.ogretmenUid,
    row.ogretmen?.id,row.teacher?.id
  ].filter(v=>v!==undefined&&v!==null&&String(v).trim()).map(v=>String(v).trim());
  if(rowIds.some(v=>ids.has(v)))return true;
  const norm=v=>String(v??'').trim().toLocaleUpperCase('tr-TR').replace(/\\s+/g,' ');
  const teacherName=norm(`${teacher.ad||''} ${teacher.soyad||''}`)||norm(teacher.adSoyad);
  if(!teacherName)return false;
  const names=[
    row.ogretmenAdSoyad,row.ogretmenAdi,row.ogretmenAdiSoyadi,
    row.teacherName,row.teacherAdSoyad,
    typeof row.ogretmen==='string'?row.ogretmen:'',
    typeof row.teacher==='string'?row.teacher:''
  ].map(norm).filter(Boolean);
  return names.includes(teacherName);
}
function attScheduleDayKey(value){
  const raw=String(value??'').trim().toLocaleLowerCase('tr-TR');
  if(!raw)return'';
  const key=raw.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/ı/g,'i').replace(/ç/g,'c').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/\\s+/g,'');
  if(/^1$|^pzt$|^pazartesi$/.test(key))return'pzt';
  if(/^2$|^sal$|^sali$/.test(key))return'sal';
  if(/^3$|^car$|^carsamba$/.test(key))return'car';
  if(/^4$|^per$|^persembe$/.test(key))return'per';
  if(/^5$|^cum$|^cuma$/.test(key))return'cum';
  return ATT_DAY_KEYS[String(value||'').trim()]||'';
}
function attWeeklyHours(teacherOrId){
  const out={pzt:0,sal:0,car:0,per:0,cum:0};
  const teachers=arr('ogretmenler');
  const teacher=typeof teacherOrId==='object'&&teacherOrId
    ?teacherOrId
    :teachers.find(t=>String(t?.id||'').trim()===String(teacherOrId||'').trim());
  if(!teacher)return out;
  let rows=arr('dersProgrami').filter(d=>String(d?.ders||'').trim()&&attScheduleTeacherMatches(d,teacher));
  const unique=global.KorukScheduleDataIntegrity?.dedupeRows?.(rows);
  if(Array.isArray(unique?.rows))rows=unique.rows;
  const seen=new Set();
  rows.forEach(d=>{
    const key=attScheduleDayKey(d?.gun??d?.gunAdi??d?.day??d?.dayName);
    if(!key)return;
    const period=Number(d?.saat);
    const slot=Number.isFinite(period)?String(period):String(d?.id||'');
    const classKey=String(d?.sinif||d?.sinifAdi||'').trim();
    const uniqueKey=classKey+'|'+key+'|'+slot;
    if(seen.has(uniqueKey))return;
    seen.add(uniqueKey);
    out[key]++;
  });
  return out;
}
async function attRefreshScheduleData(){
  try{
    if(!global.SyncEngine?.register||!global.COL?.dersProgrami)return;
    global.SyncEngine.register('dersProgrami',global.COL.dersProgrami);
    await global.SyncEngine.localHydrate?.(['dersProgrami']);
    if(global.navigator?.onLine&&typeof global.SyncEngine.sync==='function'){
      await global.SyncEngine.sync(['dersProgrami']);
    }else{
      await global.SyncEngine.localHydrate?.(['dersProgrami']);
    }
  }catch(e){
    console.warn('[Devamsizlik/ders-programi]',e?.message||e);
  }
}
function attTeacherRowsFromStore(){return arr('ogretmenler').map(o=>{const h=attWeeklyHours(o);return{ogretmenId:o.id,adSoyad:`${o.ad||''} ${o.soyad||''}`.trim(),gorev:o.unvan||'',...h}})}
async function attCreateMonth(){if(!attCanEdit())return global.toast?.('Bu işlem için yetkiniz yok.');await attRefreshScheduleData();const rows=attTeacherRowsFromStore();if(!rows.length)return global.toast?.('Öğretmen listesi boş.');const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1,map=global.DevamsizlikCizelgesiService.excelSatirlarindanAyOlustur(rows,y,m,arr('ogretmenler'),attHolidayRows(),arr('ogretmenIzinleri'));try{await global.DevamsizlikCizelgesiService.ayOlustur(y,m,map);global.toast?.('Devamsızlık çizelgesi oluşturuldu.')}catch(e){global.toast?.(e?.message||'Çizelge oluşturulamadı.')}}
async function attAutoRefresh(){const doc=monthDoc();if(!doc||!attCanEdit())return;if(!global.confirm?.('Elle değiştirilmemiş günler güncel izin, planlı tatil, resmî tatil ve ders programına göre yeniden hesaplanacak. Silinmiş personeller çizelgeden kaldırılacak. Devam edilsin mi?'))return;const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1,teacherIds=new Set(arr('ogretmenler').map(t=>String(t.id||''))),holidays=attHolidayRows();try{await attRefreshScheduleData();for(const [rowId,original] of Object.entries(doc.ogretmenler||{})){const o=structuredClone(original),oid=String(o.ogretmenId||rowId||'');if(!teacherIds.has(oid)){await global.DevamsizlikCizelgesiService.ogretmenSil(y,m,rowId);continue}o.haftalikSaatler=attWeeklyHours(arr('ogretmenler').find(t=>String(t?.id||'')===String(oid))||oid);const fresh=global.DevamsizlikCizelgesiService.ogretmenAyiniOtomatikUret(o,y,m,holidays,arr('ogretmenIzinleri')),manual=o.elleGunler||{},merged={...(o.gunler||{})};for(const g of Object.keys(fresh))if(!manual[g])merged[g]=fresh[g];for(let g=1;g<=global.DevamsizlikCizelgesiService.gunSayisi(y,m);g++)if(!manual[g]&&!(g in fresh))delete merged[g];o.gunler=merged;await global.DevamsizlikCizelgesiService.ogretmenVerisiGuncelle(y,m,oid,o)}global.toast?.('Otomatik günler güncel ders programı ve Tatil Modu ile tazelendi.')}catch(e){global.toast?.(e?.message||'Otomatik doldurma başarısız.')}}
function closeAttModal(){document.querySelector('[data-att-modal]')?.remove()}
function openAttModal(title,body){closeAttModal();const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.attModal='';ov.innerHTML=`<section class="ka-modal ka-attendance-modal"><header class="ka-modal__header"><h3>${esc(title)}</h3><button class="ka-icon-button" type="button" data-att-close>×</button></header><div class="ka-modal__body ka-stack">${body}</div></section>`;document.body.appendChild(ov);ov.querySelector('[data-att-close]').onclick=closeAttModal;ov.onclick=e=>{if(e.target===ov)closeAttModal()};return ov}
async function attSaveTeacherRow(o){const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1;await global.DevamsizlikCizelgesiService.ogretmenVerisiGuncelle(y,m,o.ogretmenId,o)}
function openAttCellModal(id,day){const doc=monthDoc(),o=doc?.ogretmenler?.[id];if(!o||!attCanEdit())return;const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1,auto=global.DevamsizlikCizelgesiService.otomatikKodUret(o,y,m,day,attHolidayRows(),arr('ogretmenIzinleri')),current=o.gunler?.[day],defaultHours=current!==undefined&&current!==''&&!isNaN(Number(current))?Number(current):(!isNaN(Number(auto))?Number(auto):0),options=[[String(defaultHours),`Devam (${defaultHours} saat)`,'is-present'],['D','D – Devamsız','is-code-d'],['İ','İ – İzinli','is-code-i'],['Y','Y – Yarım Gün','is-code-y'],['R','R – Raporlu','is-code-r'],['T','T – Tatil','is-code-t'],['+','+ – Görevlendirme','is-code-plus']];const ov=openAttModal(`${o.adSoyad||'Personel'} · ${day} ${ATT_MONTHS[m-1]}`,`<div class="ka-attendance-code-grid">${options.map(([code,label,cls])=>`<button type="button" class="ka-attendance-code-btn ${cls}" data-att-code="${esc(code)}">${esc(label)}</button>`).join('')}</div><label class="ka-field"><span class="ka-field__label">Manuel ders saati</span><div class="ka-row"><input type="number" min="0" max="20" step="1" value="${defaultHours}" data-att-manual-hour><button class="ka-btn ka-btn--secondary" type="button" data-att-manual-save>Kaydet</button></div></label><button class="ka-btn ka-btn--ghost" type="button" data-att-reset-day>Otomatik değere dön</button>`);const save=async value=>{const next=structuredClone(o);next.gunler={...(next.gunler||{}),[day]:value};next.elleGunler={...(next.elleGunler||{}),[day]:true};try{await attSaveTeacherRow(next);closeAttModal();global.toast?.('Kaydedildi.')}catch(e){global.toast?.(e?.message||'Kaydedilemedi.')}};ov.querySelectorAll('[data-att-code]').forEach(b=>b.onclick=()=>save(isNaN(Number(b.dataset.attCode))?b.dataset.attCode:Number(b.dataset.attCode)));ov.querySelector('[data-att-manual-save]').onclick=()=>save(Math.max(0,Number(ov.querySelector('[data-att-manual-hour]').value)||0));ov.querySelector('[data-att-reset-day]').onclick=async()=>{const next=structuredClone(o),manual={...(next.elleGunler||{})};delete manual[day];next.elleGunler=manual;next.gunler={...(next.gunler||{})};if(auto===null)delete next.gunler[day];else next.gunler[day]=auto;try{await attSaveTeacherRow(next);closeAttModal();global.toast?.('Otomatik değer geri yüklendi.')}catch(e){global.toast?.(e?.message||'Kaydedilemedi.')}}}
async function openAttHoursModal(id){const doc=monthDoc(),o=doc?.ogretmenler?.[id];if(!o||!attCanEdit())return;await attRefreshScheduleData();const teacher=arr('ogretmenler').find(t=>String(t?.id||'')===String(id))||{id};const live=attWeeklyHours(teacher),h=live,days=[['pzt','Pazartesi'],['sal','Salı'],['car','Çarşamba'],['per','Perşembe'],['cum','Cuma']],ov=openAttModal(`${o.adSoyad||'Personel'} · Haftalık Ders Saatleri`,days.map(([k,label])=>`<label class="ka-field"><span class="ka-field__label">${label}</span><input type="number" min="0" max="20" step="1" data-att-week="${k}" value="${Number(h[k])||0}"></label>`).join('')+'<button class="ka-btn" type="button" data-att-week-save>Kaydet</button>');ov.querySelector('[data-att-week-save]').onclick=async()=>{const next=structuredClone(o),weekly={};days.forEach(([k])=>weekly[k]=Math.max(0,Number(ov.querySelector(`[data-att-week="${k}"]`).value)||0));next.haftalikSaatler=weekly;next.gunler={...(next.gunler||{})};next.elleGunler={...(next.elleGunler||{})};const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1;for(let g=1;g<=global.DevamsizlikCizelgesiService.gunSayisi(y,m);g++){const dow=global.DevamsizlikCizelgesiService.haftaGunu(y,m,g);if(dow>=1&&dow<=5){const key=global.DevamsizlikCizelgesiService.HAFTAICI_ANAHTARLARI[dow-1];next.gunler[g]=weekly[key];next.elleGunler[g]=true}}try{await attSaveTeacherRow(next);closeAttModal();global.toast?.('Haftalık ders saatleri güncellendi.')}catch(e){global.toast?.(e?.message||'Kaydedilemedi.')}}}
function openAttNoteModal(id){const doc=monthDoc(),o=doc?.ogretmenler?.[id];if(!o||!attCanEdit())return;const ov=openAttModal(`${o.adSoyad||'Personel'} · Açıklama`,`<label class="ka-field"><span class="ka-field__label">Açıklama</span><textarea rows="4" data-att-note-input>${esc(o.aciklama||'')}</textarea></label><button class="ka-btn" type="button" data-att-note-save>Kaydet</button>`);ov.querySelector('[data-att-note-save]').onclick=async()=>{const next=structuredClone(o);next.aciklama=ov.querySelector('[data-att-note-input]').value.trim();try{await attSaveTeacherRow(next);closeAttModal();global.toast?.('Açıklama kaydedildi.')}catch(e){global.toast?.(e?.message||'Kaydedilemedi.')}}}
async function attPrint(){const doc=monthDoc();if(!doc)return;if(!global.ReportEngine?.printReport){await global.AppLoader?.loadScript?.('js/core/report-customizer.js?v=1004').catch(()=>{});await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=5').catch(()=>{});}if(!global.ReportEngine?.printReport)return global.toast?.('Rapor motoru hazır değil.');const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1,days=Array.from({length:global.DevamsizlikCizelgesiService.gunSayisi(y,m)},(_,i)=>i+1),rows=attSortedTeachers(doc),body=`<table class="ka-attendance-print-table"><thead><tr><th>No</th><th>Adı Soyadı</th><th>Görevi</th>${days.map(g=>`<th>${g}<br>${esc(attDayName(y,m,g))}</th>`).join('')}<th>Saat</th><th>Devam</th><th>Devamsız</th><th>Açıklama</th></tr></thead><tbody>${rows.map((o,i)=>{const t=attTotals(o);return `<tr><td>${i+1}</td><td>${esc(o.adSoyad||'')}</td><td>${esc(o.gorev||'')}</td>${days.map(g=>`<td>${esc(o.gunler?.[g]??'')}</td>`).join('')}<td>${t.saat}</td><td>${t.devam}</td><td>${t.devamsiz}</td><td>${esc(o.aciklama||'')}</td></tr>`}).join('')}</tbody></table>`;global.ReportEngine.printReport(`${ATT_MONTHS[m-1]} ${y} Devamsızlık Çizelgesi`,body,{fileName:`Devamsizlik_Cizelgesi_${y}_${String(m).padStart(2,'0')}`,yon:'yatay',compact:true,kenarBosluk:5,fontSize:7,tarihGoster:false})}
async function attEnsureXlsx(){if(global.XLSX)return true;await global.AppLoader?.loadScript?.('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js').catch(()=>{});if(!global.XLSX)throw new Error('Excel okuyucu yüklenemedi.');return true}
function attNormKey(v){return String(v||'').trim().toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/Ç/g,'C').replace(/\s+/g,' ')}
function attField(row,names){const keys=Object.keys(row||{}),wanted=names.map(attNormKey);const key=keys.find(k=>wanted.includes(attNormKey(k)));return key===undefined?'':row[key]}
async function attImportExcel(file){if(!file||!attCanEdit())return;try{await attEnsureXlsx();const wb=global.XLSX.read(await file.arrayBuffer(),{type:'array'}),sheet=wb.Sheets['Öğretmenler']||wb.Sheets['Ogretmenler']||wb.Sheets[wb.SheetNames[0]],raw=global.XLSX.utils.sheet_to_json(sheet,{defval:''});if(!raw.length)throw new Error('Excel sayfasında veri bulunamadı.');const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1,teachers=arr('ogretmenler'),rows=raw.map(r=>({adSoyad:String(attField(r,['ADI SOYADI','AD SOYAD'])||'').trim(),gorev:String(attField(r,['GÖREVİ','GOREVI','GÖREV','GOREV'])||'').trim(),pzt:Number(attField(r,['PZT','PAZARTESİ','PAZARTESI']))||0,sal:Number(attField(r,['SAL','SALI']))||0,car:Number(attField(r,['ÇAR','CAR','ÇARŞAMBA','CARSAMBA']))||0,per:Number(attField(r,['PER','PERŞEMBE','PERSEMBE']))||0,cum:Number(attField(r,['CUM','CUMA']))||0})).filter(r=>r.adSoyad);if(!rows.length)throw new Error('“Adı Soyadı” sütunu bulunamadı.');const hasDayColumns=Object.keys(raw[0]||{}).some(k=>/^\d{1,2}$/.test(String(k).trim()));let map;if(hasDayColumns){map={};for(let i=0;i<rows.length;i++){const src=raw[i],r=rows[i],match=global.DevamsizlikCizelgesiService._adaGoreOgretmenBul(teachers,r.adSoyad),id=match?.id||`disaridan_${global.DevamsizlikCizelgesiService._slug(r.adSoyad)}`,gunler={},elleGunler={};for(let g=1;g<=global.DevamsizlikCizelgesiService.gunSayisi(y,m);g++){const key=Object.keys(src).find(k=>String(k).trim()===String(g)),v=key===undefined?'':src[key];if(v===''||v===null||v===undefined)continue;const value=!isNaN(Number(v))?Number(v):String(v).trim().toLocaleUpperCase('tr-TR');gunler[g]=value;elleGunler[g]=true}map[id]={ogretmenId:id,adSoyad:r.adSoyad,gorev:r.gorev||match?.unvan||'',haftalikSaatler:{pzt:r.pzt,sal:r.sal,car:r.car,per:r.per,cum:r.cum},gunler,elleGunler}}}else map=global.DevamsizlikCizelgesiService.excelSatirlarindanAyOlustur(rows,y,m,teachers,attHolidayRows(),arr('ogretmenIzinleri'));await global.DevamsizlikCizelgesiService.ayOlustur(y,m,map);global.toast?.(`${rows.length} personel Excel'den aktarıldı.`)}catch(e){global.toast?.('Excel içe aktarma: '+(e?.message||e))}}
function render(){if(!mounted)return;if(active==='map')renderMap();else if(active==='forms')global.ClassicCizelgelerParity?.render?.(true);else if(active==='attendance')renderAttendance();else renderChecklists()}
function bindChecks(){document.querySelectorAll('[data-tools-check]').forEach(input=>{input.onchange=async()=>{const tid=currentTeacherId(),listId=input.dataset.toolsCheck,itemId=input.dataset.itemId;if(!tid){input.checked=!input.checked;if(typeof toast==='function')toast('Bağlı öğretmen kaydı bulunamadı.');return}const existing=completedFor(listId),ids=new Set(existing?.tamamlananMaddeIdler||[]);input.checked?ids.add(itemId):ids.delete(itemId);try{await global.KontrolListeleriService.tamamlamaKaydet(tid,listId,[...ids]);}catch(e){input.checked=!input.checked;console.warn('[Tools]',e?.message||e)}}})}
function bindAttendance(){const content=document.getElementById('toolsContent');if(!content)return;const grid=content.querySelector('.ka-attendance-grid-wrap');grid?.addEventListener('scroll',()=>{attendanceScrollLeft=grid.scrollLeft},{passive:true});content.querySelector('[data-att-year]')?.addEventListener('change',e=>{attendanceScrollLeft=0;attendanceDate=new Date(Number(e.target.value),attendanceDate.getMonth(),1);renderAttendance()});content.querySelector('[data-att-month]')?.addEventListener('change',e=>{attendanceScrollLeft=0;attendanceDate=new Date(attendanceDate.getFullYear(),Number(e.target.value)-1,1);renderAttendance()});content.querySelector('[data-att-create]')?.addEventListener('click',attCreateMonth);content.querySelector('[data-att-auto]')?.addEventListener('click',attAutoRefresh);content.querySelector('[data-att-print]')?.addEventListener('click',attPrint);const file=content.querySelector('[data-att-file]');content.querySelector('[data-att-import]')?.addEventListener('click',()=>file?.click());file?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(f)await attImportExcel(f);e.target.value=''});content.querySelectorAll('[data-att-cell]').forEach(b=>b.addEventListener('click',()=>openAttCellModal(b.dataset.attTeacher,Number(b.dataset.attDay))));content.querySelectorAll('[data-att-hours]').forEach(b=>b.addEventListener('click',()=>openAttHoursModal(b.dataset.attHours)));content.querySelectorAll('[data-att-note]').forEach(b=>b.addEventListener('click',()=>openAttNoteModal(b.dataset.attNote)))}
function bind(){}
function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];const paths=['data.kontrolListeleri','data.kontrolListeTamamlama','data.ogretmenler','data.dersProgrami','data.resmiTatiller','data.ogretmenIzinleri','data.dersSaatleri','data.haritaFavoriler','data.servisler','data.devamsizlikCizelgesi',...(global.ToolsData?.FORM_TYPES||[]).map(t=>'data.'+t)];paths.forEach(p=>{const u=global.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)})}
async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bind();subscribe();await global.ToolsData?.prepareControlLists?.();render();return true}
function openPage(page,title=''){const allowed=['checklists','map','forms','attendance'];if(!allowed.includes(page))return false;const previous=active;if(previous==='forms'&&page!=='forms')global.ClassicCizelgelerParity?.close?.();if(previous==='map'&&page!=='map')global.HaritaUI?.unmount?.();active=page;const host=document.querySelector('[data-tools-module]');host?.classList.toggle('ka-tools-map-active',page==='map');const h=host?.querySelector(':scope > .ka-row h2');if(h&&title)h.textContent=title;if(page==='forms')global.ClassicCizelgelerParity?.open?.(title);else render();let prep=null;if(page==='map')prep=global.ToolsData?.prepareMap?.();else if(page==='forms')prep=global.ToolsData?.prepareForms?.();else if(page==='attendance')prep=global.ToolsData?.prepareAttendance?.();else prep=global.ToolsData?.prepareControlLists?.();Promise.resolve(prep).then(()=>{if(!mounted||active!==page)return;if(page==='forms')global.ClassicCizelgelerParity?.render?.(true);else render()}).catch(e=>console.warn('[Tools/openPage]',e?.message||e));return true}
function unmount(){mounted=false;global.HaritaUI?.unmount?.();document.querySelector('[data-tools-module]')?.classList.remove('ka-tools-map-active');unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];global.ClassicCizelgelerParity?.close?.();closeAttModal()}
global.ToolsModule={mount,unmount,render,openPage};global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='tools')mount()});
})(window);

/* ========================= STUDENT PAGES — Tools içinde ========================= */
(function(global){
'use strict';
if(global.StudentPages)return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const fullStudent=v=>String(v?.ogrenciAdi||v?.adSoyad||[v?.ad,v?.soyad].filter(Boolean).join(' ')||'Öğrenci').trim();
const className=s=>s?.ad||s?.sinifAdi||s?.sinif||'Sınıf';
const today=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
let currentPage='',currentTitle='',selectedClass='',selectedDate=today(),query='',openBook='',unsubs=[];
function root(){return $('#v2ModuleRoot')}
function setTitle(v){const h=$('#v2ModuleTitle');if(h)h.textContent=v||''}
function cleanup(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
function subscribe(paths){cleanup();for(const p of paths){const u=global.AppStore?.subscribe?.(p,()=>requestAnimationFrame(()=>render().catch(console.error)));if(u)unsubs.push(u)}}
function allClasses(){return arr('siniflar').slice().sort((a,b)=>className(a).localeCompare(className(b),'tr',{numeric:true}))}
function studentsOf(classId){return arr('veliler').filter(v=>v.sinifId===classId).slice().sort((a,b)=>{const an=Number(a.ogrenciNo||a.no||0),bn=Number(b.ogrenciNo||b.no||0);return(an&&bn?an-bn:0)||fullStudent(a).localeCompare(fullStudent(b),'tr')})}
function ensureClass(classes=allClasses()){if(selectedClass&&classes.some(x=>x.id===selectedClass))return selectedClass;selectedClass=classes[0]?.id||'';return selectedClass}
function classOptions(classes=allClasses()){ensureClass(classes);return `<option value="">Sınıf seçiniz</option>${classes.map(s=>`<option value="${esc(s.id)}" ${s.id===selectedClass?'selected':''}>${esc(className(s))}</option>`).join('')}`}
function pageHead(title,desc,tools=''){return `<div class="ka-row ka-row--between"><div class="ka-grow"><h2>${esc(title)}</h2><p class="ka-muted">${esc(desc)}</p></div>${tools}</div>`}
function empty(text){return `<div class="ka-empty">${esc(text)}</div>`}
function toast(msg){global.toast?.(msg)}
let attendanceDraft={},attendanceDraftKey='',attendanceAdminView='class';
/* YoklamaService people.js içinde tanımlı; Yoklama sayfası Kadrolar açılmadan doğrudan açılırsa yüklenmemiş olur (kayıt TypeError ile başarısız olurdu). */
async function ensureYoklamaService(){if(global.YoklamaService?.yoklamaKaydet)return true;try{await global.AppLoader?.loadScript?.('js/modules/people.js')}catch(e){console.warn('[Yoklama] people.js yüklenemedi',e?.message||e)}return !!global.YoklamaService?.yoklamaKaydet}
async function accessibleAttendanceClasses(){await ensureYoklamaService();try{const list=global.YoklamaService?.erisilebilirSiniflar?.();if(Array.isArray(list))return list}catch(_){}return user().admin===true?allClasses():[]}
async function attendanceRecord(){if(!selectedClass)return null;try{return await global.YoklamaService?.belgeGetir?.(selectedClass,selectedDate)||null}catch(e){console.warn('[StudentPages/yoklama]',e);return null}}
function attendanceStatusMeta(k){return({var:{label:'Var',icon:'✓'},yok:{label:'Yok',icon:'×'},gec:{label:'Geç',icon:'⏱'},izinli:{label:'İzinli',icon:'İZ'}})[k]||{label:k,icon:'•'}}
function draftKey(){return `${selectedClass}|${selectedDate}`}
async function ensureAttendanceDraft(students){const key=draftKey();if(attendanceDraftKey===key)return attendanceDraft;const doc=await attendanceRecord(),saved=doc?.kayitlar||{};attendanceDraft=Object.fromEntries(students.map(s=>[s.id,saved[s.id]||'var']));attendanceDraftKey=key;return attendanceDraft}
function attendanceCounts(students){const counts={toplam:students.length,var:0,yok:0,gec:0,izinli:0};students.forEach(s=>{const k=attendanceDraft[s.id]||'var';if(counts[k]!==undefined)counts[k]++});return counts}
function attendanceSummaryHtml(counts){return `<div class="ka-attendance-summary"><article><small>TOPLAM</small><b>${counts.toplam}</b></article><article class="is-present"><small>VAR</small><b>${counts.var}</b></article><article class="is-absent"><small>YOK</small><b>${counts.yok}</b></article><article class="is-late"><small>GEÇ</small><b>${counts.gec}</b></article><article class="is-leave"><small>İZİNLİ</small><b>${counts.izinli}</b></article></div>`}
function attendanceButtons(studentId,value){return `<div class="ka-attendance-statuses" role="group" aria-label="Yoklama durumu">${['var','yok','gec','izinli'].map(k=>{const m=attendanceStatusMeta(k);return `<button type="button" class="ka-attendance-status is-${k} ${value===k?'is-selected':''}" data-att-status="${k}" data-att-student="${esc(studentId)}" aria-pressed="${value===k?'true':'false'}" title="${esc(m.label)}"><span>${esc(m.icon)}</span><small>${esc(m.label)}</small></button>`}).join('')}</div>`}
function absenceRow(s){
  const wa=global.YoklamaService?.whatsappLinkOlustur?.(s),phone=String(s.telefon||'').trim(),late=s.durum==='gec',status=late?'Geç':'Yok';
  return `<article class="ka-attendance-absence"><div class="ka-grow"><div class="ka-row ka-row--between"><strong>${esc(s.ogrenciAdi||'Öğrenci')}</strong><span class="ka-badge ${late?'ka-badge--warning':'ka-badge--danger'}">${status}</span></div><small>${esc([s.sinifAdi,s.veliAdi].filter(Boolean).join(' · '))}</small>${phone?`<em>${esc(phone)}</em>`:''}</div><div class="ka-stack"><span class="ka-badge ${s.gonderildi?'ka-badge--success':''}">${s.gonderildi?'✓ Bilgilendirildi':'Bilgi bekliyor'}</span>${wa?`<button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-att-contact="${esc(wa)}">WhatsApp</button>`:''}</div></article>`;
}
async function renderAttendanceAdmin(r,classes){
  if(attendanceAdminView==='class')return false;
  if(attendanceAdminView==='all'){
    let docs=[];try{docs=await global.YoklamaService?.gunOzetiGetir?.(selectedDate)||[]}catch(e){docs=[]}
    const rows=docs.map(doc=>{const st=studentsOf(doc.sinifId),states=doc.kayitlar||{},c={toplam:st.length,var:0,yok:0,gec:0,izinli:0};Object.values(states).forEach(k=>{if(c[k]!==undefined)c[k]++});const cls=classes.find(x=>x.id===doc.sinifId);return `<button type="button" class="ka-attendance-class-card" data-att-open-class="${esc(doc.sinifId)}"><span><strong>${esc(className(cls)||'Sınıf')}</strong><small>${c.toplam} öğrenci</small></span><span><b>${c.var}</b> Var</span><span class="is-absent"><b>${c.yok}</b> Yok</span><span class="is-late"><b>${c.gec}</b> Geç</span></button>`}).join('');
    r.innerHTML=`<section class="ka-stack" data-student-page="attendance">${pageHead('Öğrenci Yoklama','Günlük tüm sınıf yoklamaları cihazdaki local-first kayıtlardan gösterilir.')}<div class="ka-attendance-admin-tabs"><button type="button" data-att-admin-view="class">Sınıf Yoklaması</button><button type="button" class="is-active" data-att-admin-view="all">Tüm Sınıflar</button><button type="button" data-att-admin-view="absent">Devamsızlar</button></div><div class="ka-attendance-datebar"><label class="ka-field"><span class="ka-field__label">Tarih</span><input id="studentAttendanceDate" type="date" value="${esc(selectedDate)}"></label></div><div class="ka-stack">${rows||empty('Bu tarihte kaydedilmiş sınıf yoklaması bulunamadı.')}</div></section>`;
    return true
  }
  let all=[];try{all=await global.YoklamaService?.gununDevamsizlariGetir?.(selectedDate)||[]}catch(e){all=[]}
  const list=selectedClass?all.filter(x=>String(x.sinifId)===String(selectedClass)):all;
  const yok=list.filter(x=>x.durum==='yok').length,gec=list.filter(x=>x.durum==='gec').length,bilgilendirildi=list.filter(x=>x.gonderildi===true).length,bekliyor=Math.max(0,list.length-bilgilendirildi);
  const selected=classes.find(x=>String(x.id)===String(selectedClass)),scope=selected?className(selected):'Tüm sınıflar';
  const classOpts=`<option value="">Tüm sınıflar</option>${classes.map(s=>`<option value="${esc(s.id)}" ${String(s.id)===String(selectedClass)?'selected':''}>${esc(className(s))}</option>`).join('')}`;
  const emptyText=selected?`${className(selected)} sınıfında bu tarihte yok veya geç öğrenci bulunmuyor.`:'Bu tarihte yok veya geç öğrenci bulunmuyor.';
  r.innerHTML=`<section class="ka-stack" data-student-page="attendance">${pageHead('Öğrenci Devamsızlığı','Sınıf ve tarihi seçin; yok ve geç öğrencileri görüntüleyip veli iletişimini yönetin.')}<div class="ka-attendance-admin-tabs"><button type="button" data-att-admin-view="class">Sınıf Yoklaması</button><button type="button" data-att-admin-view="all">Tüm Sınıflar</button><button type="button" class="is-active" data-att-admin-view="absent">Devamsızlar</button></div><div class="ka-attendance-filters"><label class="ka-field"><span class="ka-field__label">SINIF</span><select id="studentAttendanceClass">${classOpts}</select></label><label class="ka-field"><span class="ka-field__label">TARİH</span><input id="studentAttendanceDate" type="date" value="${esc(selectedDate)}"></label></div><div class="ka-attendance-summary"><article><small>TOPLAM</small><b>${list.length}</b></article><article class="is-absent"><small>YOK</small><b>${yok}</b></article><article class="is-late"><small>GEÇ</small><b>${gec}</b></article><article class="is-present"><small>BİLGİLENDİRİLDİ</small><b>${bilgilendirildi}</b></article><article><small>BEKLİYOR</small><b>${bekliyor}</b></article></div><div class="ka-row ka-row--between ka-attendance-list-head"><div><strong>${esc(scope)}</strong><small>${esc(selectedDate)}</small></div><span class="ka-badge">${list.length} öğrenci</span></div><div class="ka-stack">${list.length?list.map(absenceRow).join(''):empty(emptyText)}</div></section>`;
  return true
}
async function renderAttendance(){const r=root();if(!r)return;const classes=await accessibleAttendanceClasses();if(user().admin===true&&attendanceAdminView!=='class'){await renderAttendanceAdmin(r,classes);bindAttendancePage(r,classes,[]);return}ensureClass(classes);const students=studentsOf(selectedClass);await ensureAttendanceDraft(students);const counts=attendanceCounts(students),classRow=classes.find(x=>x.id===selectedClass);r.innerHTML=`<section class="ka-stack" data-student-page="attendance">${pageHead('Öğrenci Yoklama','Sınıf ve tarihi seçin; durumları işaretleyip yoklamayı tek seferde kaydedin.')} ${user().admin===true?`<div class="ka-attendance-admin-tabs"><button type="button" class="is-active" data-att-admin-view="class">Sınıf Yoklaması</button><button type="button" data-att-admin-view="all">Tüm Sınıflar</button><button type="button" data-att-admin-view="absent">Devamsızlar</button></div>`:''}<div class="ka-attendance-filters"><label class="ka-field"><span class="ka-field__label">SINIF</span><select id="studentAttendanceClass">${classOptions(classes)}</select></label><label class="ka-field"><span class="ka-field__label">TARİH</span><input id="studentAttendanceDate" type="date" value="${esc(selectedDate)}"></label></div>${attendanceSummaryHtml(counts)}${selectedClass?`<div class="ka-row ka-row--between ka-attendance-list-head"><div><strong>Öğrenci Listesi</strong><small>${esc(className(classRow))}</small></div><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-att-all-present ${students.length?'':'disabled'}>Tümünü Var</button></div>`:''}<div class="ka-attendance-list">${students.length?students.map((s,i)=>`<article class="ka-attendance-student"><span class="ka-attendance-no">${esc(s.ogrenciNo||s.no||i+1)}</span><div class="ka-attendance-name"><strong>${esc(fullStudent(s))}</strong><small>${esc(s.cinsiyet||'')}</small></div>${attendanceButtons(s.id,attendanceDraft[s.id]||'var')}</article>`).join(''):empty(selectedClass?'Bu sınıfta öğrenci bulunamadı.':'Bu kullanıcıya atanmış sınıf bulunamadı.')}</div>${students.length?`<div class="ka-attendance-savebar"><span><strong>${counts.yok+counts.gec+counts.izinli}</strong> farklı durum işaretli</span><button class="ka-btn" type="button" data-att-save>💾 Yoklamayı Kaydet</button></div>`:''}</section>`;bindAttendancePage(r,classes,students)}
function bindAttendancePage(r,classes,students){$('#studentAttendanceClass',r)?.addEventListener('change',e=>{selectedClass=e.target.value;attendanceDraftKey='';renderAttendance()});$('#studentAttendanceDate',r)?.addEventListener('change',e=>{selectedDate=e.target.value||today();attendanceDraftKey='';renderAttendance()});$$('[data-att-admin-view]',r).forEach(b=>b.addEventListener('click',()=>{attendanceAdminView=b.dataset.attAdminView||'class';renderAttendance()}));$$('[data-att-open-class]',r).forEach(b=>b.addEventListener('click',()=>{selectedClass=b.dataset.attOpenClass||'';attendanceAdminView='class';attendanceDraftKey='';renderAttendance()}));$$('[data-att-status]',r).forEach(b=>b.addEventListener('click',()=>{attendanceDraft[b.dataset.attStudent]=b.dataset.attStatus;renderAttendance()}));$('[data-att-all-present]',r)?.addEventListener('click',()=>{students.forEach(s=>attendanceDraft[s.id]='var');renderAttendance()});$('[data-att-save]',r)?.addEventListener('click',async e=>{const b=e.currentTarget,before=b.textContent;b.disabled=true;b.textContent='Kaydediliyor…';try{if(!(await ensureYoklamaService()))throw new Error('yoklama-servisi-yok');await global.YoklamaService.yoklamaKaydet(selectedClass,selectedDate,{...attendanceDraft});toast('Yoklama kaydedildi.');attendanceDraftKey='';await renderAttendance()}catch(err){console.warn('[Yoklama kayıt]',err?.message||err);toast(err?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':'Yoklama kaydedilemedi.');b.disabled=false;b.textContent=before}});$$('[data-att-contact]',r).forEach(b=>b.addEventListener('click',()=>{const url=b.dataset.attContact;if(url)global.open?.(url,'_blank','noopener,noreferrer')}))}
async function render(){if(currentPage==='attendance')return renderAttendance();return false}
async function open(page,title=''){if(page!=='attendance')throw new Error('unsupported-student-page');currentPage='attendance';currentTitle=title||'';setTitle(currentTitle||'Öğrenci Yoklama');subscribe(['data.siniflar','data.veliler','data.yoklama']);await renderAttendance();return true}
function close(){currentPage='';cleanup();document.querySelector('[data-student-book-modal]')?.remove()}
global.StudentPages={open,close,render,get page(){return currentPage}};
})(window);
