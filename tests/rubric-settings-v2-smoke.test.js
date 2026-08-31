const fs=require('fs');
const assert=require('assert');
const vm=require('vm');
const src=fs.readFileSync('js/modules/rubric-settings.js','utf8');
const tools=fs.readFileSync('js/modules/tools.js','utf8');
const index=fs.readFileSync('index.html','utf8');

const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
assert(!index.includes('<script src="js/modules/rubric-settings.js" defer></script>'),'RubricSettingsService ilk açılışta eager yüklenmemeli.');
assert(sw.includes("'./js/modules/rubric-settings.js'"),'RubricSettingsService offline Service Worker cache içinde bulunmalı.');
assert(loader.includes("'js/modules/rubric-settings.js','js/modules/rubric-tools.js'"),'RubricSettingsService Tools lazy bundle ile yüklenmeli.');
for(const token of ["rubric:{local:'krtDagitimAyarlari',field:'kriterDagitimAyari'}","project:{local:'projeDagitimAyarlari',field:'projeDegerlendirmeAyari'}","global.KorukLocalFirst?.meta?.(u,key)","legacy-migrated","migrated===true","global.SyncEngine.register('okulBilgileri',global.COL.okulBilgileri)","global.SyncEngine.localHydrate(['okulBilgileri'])","global.DeviceData.set('okulBilgileri',global.COL.okulBilgileri,'ayarlar'","global.RubricSettingsService={"]){
  assert(src.includes(token),`RubricSettings V2 sözleşmesi eksik: ${token}`);
}
assert(!src.includes('db.collection(')&&!src.includes('firebase.firestore'),'RubricSettingsService doğrudan Firestore kullanmamalı.');
assert(src.includes('localStorage?.getItem?.(d.local)'),'Eski localStorage ayarı yalnız tek seferlik migration kaynağı olarak korunmalı.');
assert(src.includes('localStorage?.removeItem?.(d.local)'),'Başarıyla migrate edilen legacy localStorage kaydı fiziksel olarak silinmeli.');
assert(src.indexOf('await global.KorukLocalFirst?.meta?.(u,key,value)')<src.indexOf('localStorage?.removeItem?.(d.local)'),'Legacy kayıt yalnız IndexedDB yazımı tamamlandıktan sonra silinmeli.');
assert(src.includes("await global.KorukLocalFirst.meta(u,key+':legacy-migrated',true)"),'Kişisel kayıttan sonra legacy migration tekrar çalışmamalı.');
assert(src.includes("await global.KorukLocalFirst.meta(u,key,null);await global.KorukLocalFirst.meta(u,key+':legacy-migrated',true)"),'Kişisel ayar temizlendikten sonra legacy localStorage verisi yeniden dirilmemeli.');

const ciz=src.slice(src.indexOf('CLASSIC ÇİZELGELER PARITY'));
for(const token of [
  'global.ClassicCizelgelerParity=',
  "sosyalKulupler:['Yıllık Plan','Toplum Hizm. Planı','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','Sene Sonu Rap.']",
  "rehberlik:['Yıllık Çalışma Planı','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','1.Dönem Sonu Rap.','Sene Sonu Rap.']",
  "bepPlani:['Yıllık Ders Planı','BEP Planı']",
  "maarifRapor:['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz']",
  "evrakAdi:String(fd.get('evrakAdi')||'').trim()",
  "tur:String(fd.get('tur')||'')",
  "teslimEdildi:fd.has('teslimEdildi')",
  "konu:String(fd.get('konu')||'').trim()",
  "global.CizelgelerService.kayitKaydet",
  "global.CizelgelerService.kayitSil",
  "global.CizelgelerService.kontrolToggle",
  "global.CizelgelerService.cokluKayitOlustur",
  '📅 Tarihleri Toplu Ayarla',
  "global.ReportEngine.printReport",
  '⇪ Excel\'den İçe Aktar'
]) assert(ciz.includes(token),`Classic Çizelgeler parite sözleşmesi eksik: ${token}`);
for(const title of ['Sosyal Kulüpler','Belirli Gün ve Haftalar','Zümre Toplantıları','ŞÖK – Şube Öğretmenler Kurulu','Yıllık / BEP Planları','Rehberlik','Maarif Model Aylık Raporlar','Diğer Evraklar'])assert(ciz.includes(title),`Classic çizelge başlığı eksik: ${title}`);
assert(!ciz.includes('global.DeviceData.')&&!ciz.includes('db.collection(')&&!ciz.includes('firebase.firestore'),'Classic Çizelgeler sunum katmanı doğrudan veri motoruna/Firestore’a yazmamalı.');
assert(!ciz.includes("ogrenciAdi:String(fd.get('ogrenciAdi')"),'BEP formu yanlış öğrenci-adı modeline geri dönmemeli.');
assert(tools.includes('async function prepareClubStudents()'),'Sosyal Kulüp öğrenci yönetimi gerekli local-first kişi cache hazırlığını kullanmalı.');
assert(tools.includes('prepareForms,prepareClubStudents,prepareAttendance'),'prepareClubStudents ToolsData üzerinden sunulmalı.');
for(const token of ['data-club-student-edit','data-club-student-list','openClubStudentEditor','saveClubStudentAssignments','service.ogrenciKulupGuncelle','printClubStudentList',"ustBaslik:'Sosyal Kulüpler'"])assert(ciz.includes(token),`Sosyal Kulüp öğrenci paritesi eksik: ${token}`);
assert(!ciz.includes('SiniflarRepository.veliGuncelle'),'Sosyal Kulüp UI öğrenci repositorysine doğrudan yazmamalı.');
assert(!ciz.includes('new MutationObserver')&&!ciz.includes('ToolsModule.openPage=function'),'Çizelgeler görünümü DOM gözlemcisi veya Tools monkey-patch ile kurulmamali.');
assert(ciz.includes("function open(title='')")&&ciz.includes('function close(){currentType='),'Çizelgeler açık lifecycle API sunmalı.');
assert(!tools.includes('const FORM_COLS=')&&!tools.includes('function renderForms(')&&!tools.includes('function formModal('),'Tools ikinci çizelge renderer taşımamalı.');
assert(tools.includes("active==='forms')global.ClassicCizelgelerParity?.render?.(true)"),'Tools çizelge görünümünü canonical sahibine devretmeli.');
assert(tools.includes("global.ClassicCizelgelerParity?.open?.(title)"),'Tools forms route canonical çizelge open lifecycle kullanmalı.');

(async()=>{
  const metaStore=new Map(),syncCalls={register:[],hydrate:[]},removed=[];
  const legacy={puanMin:1,puanMax:5,puanEtiketleri:['A'],gruplar:[{ad:'G',kriterler:['K']}]};
  const school={puanMin:2,puanMax:4,puanEtiketleri:['B'],gruplar:[{ad:'O',kriterler:['X']}]};
  let schoolRows=[];
  const window={
    AKTIF_KULLANICI:{uid:'u1',admin:true},
    AppStore:{get:()=>null,data:type=>type==='okulBilgileri'?schoolRows:[]},
    localStorage:{getItem:key=>key==='krtDagitimAyarlari'&&!removed.includes(key)?JSON.stringify(legacy):null,removeItem:key=>removed.push(key)},
    KorukLocalFirst:{meta:async(u,k,...rest)=>{const key=u+'|'+k;if(rest.length){metaStore.set(key,rest[0]);return rest[0];}return metaStore.has(key)?metaStore.get(key):null;}},
    SyncEngine:{
      register:(type,col)=>syncCalls.register.push([type,col]),
      localHydrate:async types=>{syncCalls.hydrate.push(types);schoolRows=[{id:'ayarlar',projeDegerlendirmeAyari:school}];}
    },
    DeviceData:{set:async()=>{}},COL:{okulBilgileri:'oy_okulBilgileri'},dispatchEvent:()=>{}
  };
  vm.runInNewContext(src,{window,console,JSON,Object,Array,String,Date,Error,CustomEvent:function(){},setInterval:()=>0,clearInterval:()=>{}});
  const svc=window.RubricSettingsService;
  const first=await svc.personalGet('rubric');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(first)),legacy,'Legacy rubric ayarı ilk erişimde IndexedDB meta katmanına migrate edilmeli.');
  assert.strictEqual(metaStore.get('u1|rubric-settings:rubric:legacy-migrated'),true,'Migration tamamlandı işareti tutulmalı.');
  assert.deepStrictEqual(removed,['krtDagitimAyarlari'],'Migration tamamlandığında legacy localStorage anahtarı bir kez kaldırılmalı.');
  await svc.clearPersonal('rubric');
  const second=await svc.personalGet('rubric');
  assert.strictEqual(second,null,'clearPersonal sonrası legacy localStorage değeri yeniden migrate edilmemeli.');
  assert.deepStrictEqual(removed,['krtDagitimAyarlari'],'Legacy anahtar ikinci kez okunup/silinmemeli.');
  const resolvedProject=await svc.resolve('project',null);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(resolvedProject)),school,'Okul ortak ayarı offline cache hydrate edildikten sonra çözülmeli.');
  assert(syncCalls.register.some(([type,col])=>type==='okulBilgileri'&&col==='oy_okulBilgileri'),'okulBilgileri SyncEngine kaydı yapılmalı.');
  assert(syncCalls.hydrate.some(types=>Array.isArray(types)&&types.includes('okulBilgileri')),'okulBilgileri IndexedDB cache hydrate edilmeli.');
  const parity=window.ClassicCizelgelerParity;
  assert(parity,'ClassicCizelgelerParity browser köprüsü kurulmalı.');
  assert.strictEqual(parity.typeFromTitle('Yıllık Planlar & BEP Planları'),'bepPlani');
  assert.strictEqual(parity.typeFromTitle('ŞÖK'),'sok');
  assert.strictEqual(parity.typeFromTitle('Diğer Evrak'),'digerEvrak');
  console.log('Kriter/Proje local-first ayar servisi + Classic Çizelgeler görünür parite sözleşmesi başarılı.');
})().catch(err=>{console.error(err);process.exitCode=1;});
