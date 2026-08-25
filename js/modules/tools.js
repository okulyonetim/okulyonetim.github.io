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

/* ========================= TOOLS UI ========================= */
(function(global){
'use strict';if(global.ToolsModule)return;
let mounted=false,active='checklists',unsubs=[],attendanceDate=new Date(),openGradebook='';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const currentTeacherId=()=>global.ToolsData?.teacherId?.()||'';
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const FORM_LABELS={sosyalKulupler:'Sosyal Kulüpler',sok:'ŞÖK',zumre:'Zümre',bepPlani:'BEP Planı',rehberlik:'Rehberlik',maarifRapor:'Maarif Raporu',belirliGunler:'Belirli Günler',digerEvrak:'Diğer Evrak'};
function shell(){return `<section class="ka-stack" data-tools-module><div class="ka-row ka-row--between"><div><h2>Araçlar</h2><p class="ka-muted">Okul yönetimi yardımcı araçları cihaz verisinden çalışır.</p></div><span id="toolsCount" class="ka-badge"></span></div><div class="ka-tabs"><button class="ka-tab" data-tools-tab="checklists">Kontrol Listeleri</button><button class="ka-tab" data-tools-tab="map">Harita</button><button class="ka-tab" data-tools-tab="forms">Çizelgeler</button><button class="ka-tab" data-tools-tab="attendance">Devamsızlık</button><button class="ka-tab" data-tools-tab="gradebooks">Ödev / Not</button></div><div id="toolsContent" class="ka-stack"></div></section>`}
function completedFor(listId){const tid=currentTeacherId();return arr('kontrolListeTamamlama').find(x=>x.listeId===listId&&(!tid||x.ogretmenId===tid))||null}
function checklistCard(list){const items=Array.isArray(list.maddeler)?list.maddeler:[],done=completedFor(list.id),ids=new Set(done?.tamamlananMaddeIdler||[]),count=items.filter(x=>ids.has(x.id)).length,pct=items.length?Math.round(count/items.length*100):0;return `<article class="ka-card ka-list-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div class="ka-grow"><strong>${esc(list.ad||'Kontrol Listesi')}</strong><div class="ka-muted">${esc(list.aciklama||`${items.length} madde`)}</div></div><span class="ka-badge">${count}/${items.length}</span></div>${items.length?`<div class="ka-stack">${items.map(item=>`<label class="ka-row"><input type="checkbox" data-tools-check="${esc(list.id)}" data-item-id="${esc(item.id)}" ${ids.has(item.id)?'checked':''}><span>${esc(item.ikon||'')} ${esc(item.metin||item.ad||'Madde')}</span></label>`).join('')}</div>`:'<div class="ka-empty">Bu listede madde bulunmuyor.</div>'}<div class="ka-muted">Tamamlanma: %${pct}</div></div></article>`}
function renderChecklists(){const lists=arr('kontrolListeleri').slice().sort((a,b)=>(Number(a.sira)||0)-(Number(b.sira)||0)),content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount');if(count)count.textContent=`${lists.length} liste`;if(content)content.innerHTML=lists.length?lists.map(checklistCard).join(''):'<div class="ka-empty">Kontrol listesi bulunamadı.</div>';bindChecks()}
function mapFavoriteCard(f){const coords=(f.lat!=null&&f.lng!=null)?`${Number(f.lat).toFixed(5)}, ${Number(f.lng).toFixed(5)}`:(f.koordinat||f.adres||'Konum bilgisi yok');return `<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>${esc(f.ad||f.baslik||'Favori Konum')}</strong><div class="ka-muted">${esc(coords)}</div>${f.olusturanAdi?`<div class="ka-muted">${esc(f.olusturanAdi)}</div>`:''}</div>${global.HaritaService?.favoriSilinebilirMi?.(f)?`<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-map-remove="${esc(f.id)}">Sil</button>`:''}</div></article>`}
function routeCard(s){const km=Number(s.guzergahMesafe);return `<article class="ka-card ka-list-card"><div class="ka-card__body"><strong>${esc(s.ad||s.servisAdi||s.guzergah||'Servis')}</strong><div class="ka-muted">${Number.isFinite(km)?`${km.toFixed(1)} km`:'Mesafe kaydı yok'} · ${Array.isArray(s.guzergahKoordinatlar)?s.guzergahKoordinatlar.length:0} rota noktası</div></div></article>`}
function renderMap(){const favorites=global.HaritaService?.gorunurFavoriler?.(arr('haritaFavoriler'))||[],routes=arr('servisler').filter(s=>s.guzergahMesafe!=null||Array.isArray(s.guzergahKoordinatlar)),content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount');if(count)count.textContent=`${favorites.length} favori`;if(content)content.innerHTML=`<div class="ka-grid"><section class="ka-stack"><div class="ka-row ka-row--between"><h3>Favori Konumlar</h3><span class="ka-badge">${favorites.length}</span></div>${favorites.length?favorites.map(mapFavoriteCard).join(''):'<div class="ka-empty">Favori konum bulunamadı.</div>'}</section><section class="ka-stack"><div class="ka-row ka-row--between"><h3>Servis Güzergâhları</h3><span class="ka-badge">${routes.length}</span></div>${routes.length?routes.map(routeCard).join(''):'<div class="ka-empty">Kayıtlı servis güzergâhı bulunamadı.</div>'}</section></div>`;bindMap()}
function recordTitle(r){return r.ad||r.baslik||r.konu||r.sinif||r.ogretmenAdi||r.aciklama||'Kayıt'}
function renderForms(){const types=global.ToolsData?.FORM_TYPES||[],sections=types.map(t=>{const rows=arr(t),preview=rows.slice(0,5);return `<article class="ka-card ka-list-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><strong>${esc(FORM_LABELS[t]||t)}</strong><span class="ka-badge">${rows.length} kayıt</span></div>${preview.length?preview.map(r=>`<div class="ka-row ka-row--between"><span>${esc(recordTitle(r))}</span><span class="ka-muted">${esc(r.tarih||r.donem||r.yil||'')}</span></div>`).join(''):'<div class="ka-empty">Kayıt bulunamadı.</div>'}${rows.length>5?'<div class="ka-muted">İlk 5 kayıt gösteriliyor.</div>':''}</div></article>`}),total=types.reduce((n,t)=>n+arr(t).length,0),content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount');if(count)count.textContent=`${total} kayıt`;if(content)content.innerHTML=sections.join('')}
function monthDoc(){const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1;return arr('devamsizlikCizelgesi').find(x=>x.id===`${y}-${m}`)||null}
function attCounts(gunler){const vals=Object.values(gunler||{});return {izin:vals.filter(x=>x==='İ').length,rapor:vals.filter(x=>x==='R').length,tatil:vals.filter(x=>x==='T').length,gorev:vals.filter(x=>x==='+').length};}
function attTeacherCard(o,y,m){const gunler=o.gunler||{},c=attCounts(gunler),days=Array.from({length:new Date(y,m,0).getDate()},(_,i)=>i+1);return `<article class="ka-card ka-list-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div><strong>${esc(o.adSoyad||o.ad||o.ogretmenId)}</strong><div class="ka-muted">${esc(o.gorev||'')}</div></div><span class="ka-badge">İ:${c.izin} R:${c.rapor} T:${c.tatil} +:${c.gorev}</span></div><div class="ka-row ka-wrap">${days.map(g=>{const v=gunler[g];return `<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-att-day="${g}" data-att-teacher="${esc(o.ogretmenId||'')}"><span>${g}</span>&nbsp;<strong>${esc(v??'–')}</strong></button>`}).join('')}</div></div></article>`}
function renderAttendance(){const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1,doc=monthDoc(),teachers=Object.values(doc?.ogretmenler||{}),content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount');if(count)count.textContent=`${teachers.length} personel`;if(content)content.innerHTML=`<div class="ka-row ka-row--between"><button class="ka-btn ka-btn--secondary" type="button" data-att-nav="-1">‹ Önceki</button><div><strong>${attendanceDate.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</strong><div class="ka-muted">Belge: ${y}-${m}</div></div><button class="ka-btn ka-btn--secondary" type="button" data-att-nav="1">Sonraki ›</button></div>${teachers.length?teachers.map(o=>attTeacherCard(o,y,m)).join(''):'<div class="ka-empty">Bu ay için devamsızlık çizelgesi bulunamadı.</div>'}`;bindAttendance()}
function gradeTitle(t){return t==='odevTakip'?'Ödev Takip':'Not Çizelgesi'}
function gradeTable(t,k){const students=k.ogrenciler||[],cols=k.sutunlar||[],cells=k.hucreler||{};if(!students.length||!cols.length)return '<div class="ka-empty">Öğrenci veya sütun bulunmuyor.</div>';return `<div class="ka-table-wrap"><table class="ka-table"><thead><tr><th>Öğrenci</th>${cols.map(c=>`<th>${esc(c.baslik||'Sütun')}</th>`).join('')}</tr></thead><tbody>${students.map(s=>`<tr><td>${esc(s.ad||'Öğrenci')}</td>${cols.map(c=>{const key=s.id+'_'+c.id,v=cells[key]??'';return `<td><button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-grade-cell="${esc(key)}" data-grade-type="${t}" data-grade-id="${esc(k.id)}">${esc(v||'–')}</button></td>`}).join('')}</tr>`).join('')}</tbody></table></div>`}
function gradeCard(t,k){const open=openGradebook===`${t}:${k.id}`;return `<article class="ka-card ka-list-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div><strong>${esc(k.ad||gradeTitle(t))}</strong><div class="ka-muted">${esc(k.sinifId||'Sınıf yok')} · ${(k.ogrenciler||[]).length} öğrenci · ${(k.sutunlar||[]).length} sütun</div></div><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-grade-open="${t}:${esc(k.id)}">${open?'Kapat':'Aç'}</button></div>${open?gradeTable(t,k):''}</div></article>`}
function renderGradebooks(){const u=user(),types=['odevTakip','notCizelgesi'],sections=types.map(t=>{const rows=arr(t).filter(x=>u.admin===true||x.sahipUid===u.uid);return `<section class="ka-stack"><div class="ka-row ka-row--between"><h3>${gradeTitle(t)}</h3><span class="ka-badge">${rows.length}</span></div>${rows.length?rows.map(k=>gradeCard(t,k)).join(''):'<div class="ka-empty">Kayıt bulunamadı.</div>'}</section>`}),total=types.reduce((n,t)=>n+arr(t).filter(x=>u.admin===true||x.sahipUid===u.uid).length,0),content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount');if(count)count.textContent=`${total} çizelge`;if(content)content.innerHTML=sections.join('');bindGradebooks()}
function render(){if(!mounted)return;document.querySelectorAll('[data-tools-tab]').forEach(b=>b.classList.toggle('active',b.dataset.toolsTab===active));if(active==='map')renderMap();else if(active==='forms')renderForms();else if(active==='attendance')renderAttendance();else if(active==='gradebooks')renderGradebooks();else renderChecklists()}
function bindChecks(){document.querySelectorAll('[data-tools-check]').forEach(input=>{input.onchange=async()=>{const tid=currentTeacherId(),listId=input.dataset.toolsCheck,itemId=input.dataset.itemId;if(!tid){input.checked=!input.checked;if(typeof toast==='function')toast('Bağlı öğretmen kaydı bulunamadı.');return}const existing=completedFor(listId),ids=new Set(existing?.tamamlananMaddeIdler||[]);input.checked?ids.add(itemId):ids.delete(itemId);try{await global.KontrolListeleriService.tamamlamaKaydet(tid,listId,[...ids]);}catch(e){input.checked=!input.checked;console.warn('[Tools]',e?.message||e)}}})}
function bindMap(){document.querySelectorAll('[data-map-remove]').forEach(btn=>{btn.onclick=async()=>{const f=arr('haritaFavoriler').find(x=>x.id===btn.dataset.mapRemove);if(!f)return;try{await global.HaritaService.favoriSil(f.id,f)}catch(e){console.warn('[Tools/Harita]',e?.message||e)}}})}
function bindAttendance(){document.querySelectorAll('[data-att-nav]').forEach(b=>b.onclick=async()=>{attendanceDate=new Date(attendanceDate.getFullYear(),attendanceDate.getMonth()+Number(b.dataset.attNav),1);renderAttendance()});document.querySelectorAll('[data-att-day]').forEach(b=>b.onclick=async()=>{const y=attendanceDate.getFullYear(),m=attendanceDate.getMonth()+1,doc=monthDoc(),o=doc?.ogretmenler?.[b.dataset.attTeacher];if(!o)return;const old=o.gunler?.[b.dataset.attDay]??'',next=global.prompt?.(`Kod girin (D, İ, Y, R, T, + veya saat):`,String(old));if(next===null)return;try{await global.DevamsizlikCizelgesiService.gunGuncelle(y,m,b.dataset.attTeacher,b.dataset.attDay,next.trim())}catch(e){if(typeof toast==='function')toast(e.message||'Güncellenemedi.')}})}
function bindGradebooks(){document.querySelectorAll('[data-grade-open]').forEach(b=>b.onclick=()=>{openGradebook=openGradebook===b.dataset.gradeOpen?'':b.dataset.gradeOpen;renderGradebooks()});document.querySelectorAll('[data-grade-cell]').forEach(b=>b.onclick=async()=>{const t=b.dataset.gradeType,k=arr(t).find(x=>x.id===b.dataset.gradeId);if(!k)return;const [studentId,colId]=b.dataset.gradeCell.split(/_(?=s_)/);const old=k.hucreler?.[b.dataset.gradeCell]??'';let next;if(t==='odevTakip')next=old==='✓'?'✗':old==='✗'?'':'✓';else if(k.hucreModu==='puan'){const val=global.prompt?.('Puan:',String(old));if(val===null)return;next=val.trim();if(next!==''&&(isNaN(Number(next))||Number(next)<0)){if(typeof toast==='function')toast('Geçerli bir puan girin.');return}}else next=old==='+'?'-':old==='-'?'':'+';try{await global.OdevNotCizelgeleriService.hucreGuncelle(t,k,studentId,colId,next)}catch(e){console.warn('[Tools/ÖdevNot]',e?.message||e)}})}
function bind(){document.querySelectorAll('[data-tools-tab]').forEach(b=>b.onclick=async()=>{active=b.dataset.toolsTab;if(active==='map')await global.ToolsData?.prepareMap?.();if(active==='forms')await global.ToolsData?.prepareForms?.();if(active==='attendance')await global.ToolsData?.prepareAttendance?.();if(active==='gradebooks')await global.ToolsData?.prepareGradebooks?.();render()})}
function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];const paths=['data.kontrolListeleri','data.kontrolListeTamamlama','data.haritaFavoriler','data.servisler','data.devamsizlikCizelgesi','data.odevTakip','data.notCizelgesi',...(global.ToolsData?.FORM_TYPES||[]).map(t=>'data.'+t)];paths.forEach(p=>{const u=global.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)})}
async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bind();subscribe();await global.ToolsData?.prepareControlLists?.();render();return true}
function unmount(){mounted=false;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
global.ToolsModule={mount,unmount,render};global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='tools')mount()});
})(window);
