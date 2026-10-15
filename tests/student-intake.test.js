/* Öğrenci Tanıma Formu sözleşme testi: seçenek kodları, ön doldurma, kayıt, rapor, cihaz deposu ve bağlantılar. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('js/modules/student-intake.js','utf8');

/* --- sahte IndexedDB (get/put/getAll/delete) --- */
function fakeIdb(){
  const data=new Map();
  const req=fn=>{const r={};setTimeout(()=>{try{r.result=fn();r.onsuccess&&r.onsuccess()}catch(e){r.error=e;r.onerror&&r.onerror()}},0);return r};
  const db={objectStoreNames:{contains:()=>true},transaction:()=>{
    const t={};const done=()=>setTimeout(()=>t.oncomplete&&t.oncomplete(),5);
    t.objectStore=()=>({
      get:k=>{const r=req(()=>data.get(k));done();return r},
      put:v=>{const r=req(()=>{data.set(v.ogrenciId,JSON.parse(JSON.stringify(v)));return v.ogrenciId});done();return r},
      getAll:()=>{const r=req(()=>[...data.values()]);done();return r},
      delete:k=>{const r=req(()=>{data.delete(k)});done();return r}
    });return t}};
  return{open:()=>{const r={result:db};setTimeout(()=>{r.onupgradeneeded&&r.onupgradeneeded();r.onsuccess&&r.onsuccess()},0);return r},data};
}
const idb=fakeIdb();
const students=[
  {id:'s1',ogrenciAdi:'Ayşe Demir',ogrenciNo:'214',sinifId:'c1',cinsiyet:'Kız',dogumTarihi:'2014-03-12',kanGrubu:'A Rh+',tcKimlikNo:'12345678901',veliAdi:'Zeynep Demir',telefon1:'0555 000 00 02',eposta:'z@example.org',adres:'Örnek Mah.'},
  {id:'s2',ogrenciAdi:'Can <b>Yılmaz</b>',ogrenciNo:'215',sinifId:'c1',cinsiyet:'Erkek',veliAdi:'Veli İki'}
];
const win={AppStore:{data:t=>t==='veliler'?students:t==='siniflar'?[{id:'c1',ad:'5-A'}]:[]},indexedDB:idb,navigator:{},toast:()=>{}};
win.window=win;vm.createContext(win);vm.runInContext(src,win);
const SI=win.StudentIntake,T=SI._t;
assert(SI&&SI.openBulk&&SI.hydrate&&SI.store,'API eksik');

/* --- e-Okul seçenek kodları birebir --- */
const pairs=(k)=>T.O[k].map(p=>p.join('=')).sort().join('|');
const want={
  kan:'A Rh(+)=3,A Rh(-)=4,AB Rh(+)=7,AB Rh(-)=8,B Rh(+)=5,B Rh(-)=6,0 Rh(+)=1,0 Rh(-)=2',
  kiminle:'Ailesiyle=0,Annesiyle=1,Babasıyla=2,Velisiyle=3',
  kaza:'Kaza geçirmedi=5,Ev kazası=2,İş kazası=4,Okul kazası=3,Trafik kazası=1',
  evKira:'Kendilerinin=3,Kira=1,Lojman=2',
  ameliyat:'Ameliyatı yok=6,Diğer=5,Apandist=2,Fıtık=3,Göz=4,Kalp=1',
  oda:'Var=1,Yok=2',cihaz:'Cihaz protez yok=5,Diğer=4,Görsel=3,İşitsel=2,Ortopedik=1',
  isinma:'Diğer=4,Elektrikli ısıtıcı=3,Kalorifer=2,Soba=1',
  hastalik:'Hastalık geçirmedi=6,Diğer=5,Çocuk felci=2,Çölyak Hastalığı=7,Havale=4,Menenjit=1,Sara=3',
  okulaGelis:'Ailesiyle=3,Servisle=2,Toplu taşıma=4,Yürüyerek=1',
  surekli:'Alzheimer=9,Astım=1,Böbrek yetmezliği=3,Çölyak Hastalığı=16,Diğer=14,Felç=2,Hepatit=12,Kalp=10,Kanser=5,Parkinson=6,Sara=4,Siroz=11,Sürekli hastalığı yok=15,Şeker=7,Tansiyon=13,Verem=8',
  calisiyor:'Evet=1,Hayır=2',ilac:'Kullandığı ilaç yok=6,Diğer=5,Astım ilacı=2,Kalp ilacı=3,Sara ilacı=1,Şeker ilacı=4',
  aileDisi:'Var=1,Yok=2',
  ozelEgitim:'Evde eğitim alıyor=3,Hastanede eğitim alıyor=2,Okulda eğitim alıyor=1,Okulda Grup Eğitimine Hazırlık Alıyor=4',
  gelir:'Çok İyi=5,Çok Kötü=1,Düşük=2,İyi=4,Orta=3',
  tasimaYemek:'Ücretsiz Öğle Yemeğinden Faydalanmaktadır=1,Ücretsiz Öğle Yemeğinden Faydalanmamaktadır=0'
};
for(const [k,v]of Object.entries(want))assert.strictEqual(pairs(k),v.split(',').sort().join('|'),'Seçenek kodu farklı: '+k);
assert.strictEqual(T.O.tasimaNeden.length,7);assert.strictEqual(T.O.tasimaNeden.find(p=>p[1]==='4')[0],"Geldiği okuda 1-3. sınıflarda öğrenci sayısı 10' dan az");
assert(!T.O.kan.some(p=>p[1]===''||p[1]==='-1'||p[1]==='0'&&p[0]===''),'Anlamsız boş kan grubu seçeneği olmamalı');
assert.strictEqual(T.kanCode('A Rh+'),'3');assert.strictEqual(T.kanCode('0 Rh-'),'2');assert.strictEqual(T.kanCode('Bilinmiyor'),'');

/* --- şema: yasak alanlar yok, zorunlu alanlar var --- */
const labels=T.SEC.flatMap(s=>(s.f||[]).map(f=>f.l)).join('|');
for(const bad of ['Öğrenci tipi','Öğrenci durumu','Kayıt durumu'])assert(!labels.includes(bad),bad+' formda olmamalı');
for(const need of ['T.C. kimlik numarası','Doğum yeri','Uyruğu','Sağ / ölü durumu','Anne ve baba birlikte mi?','Velayet durumu','Toplam kardeş sayısı','Boy','Kilo','Şartlı Eğitim Yardımı Uygulaması Başvuru No'])assert(labels.includes(need),need+' eksik');
assert.strictEqual(JSON.stringify(T.SEC.map(s=>s.no)),'[1,2,3,4,5,6,7,8,9,10,11]');
const ids=T.SEC.flatMap(s=>(s.f||[]).map(f=>f.k));assert.strictEqual(new Set(ids).size,ids.length,'Aynı bilgi için iki kayıt anahtarı olmamalı');

/* --- ön doldurma / geçersiz kılma / boş varsayılan --- */
const ctx={s:students[0],className:'5-A',sinif:'5',sube:'A',okulAdi:'Koruk İlk-Ortaokulu'};
const rec0=T.emptyWork('s1');
assert.strictEqual(T.effVal(T.FIELD.tc,rec0,ctx),'12345678901');
assert.strictEqual(T.effVal(T.FIELD.kan,rec0,ctx),'3');
assert.strictEqual(T.effVal(T.FIELD.babaDurum,rec0,ctx),'','Sağ/ölü varsayılan seçili olmamalı');
assert.strictEqual(T.effVal(T.FIELD.birlikte,rec0,ctx),'');
assert.strictEqual(T.effVal(T.FIELD.sinif,rec0,ctx),'5');assert.strictEqual(T.effVal(T.FIELD.sube,rec0,ctx),'A');
rec0.d.tc='98765432109';assert.strictEqual(T.effVal(T.FIELD.tc,rec0,ctx),'98765432109');
assert.strictEqual(JSON.stringify(T.splitClass('8/B')),'{"sinif":"8","sube":"B"}');

/* --- compact: boş değer ve boş satır kaydedilmez; anne/baba alanları birbirinden bağımsız --- */
const w=T.emptyWork('s1');w.d={babaDurum:'Vefat etmiş',anneDurum:'',birlikte:'',engelli:false,boy:' 140 '};w.yakinlar=[{},{ad:'Fatma',yakinlik:'Nine'}];w.kardesler=[{ad:''}];
const c=T.compact(w);
assert.strictEqual(JSON.stringify(c.d),'{"babaDurum":"Vefat etmiş","boy":"140"}');assert.strictEqual(c.yakinlar.length,1);assert.strictEqual(c.kardesler.length,0);
assert.strictEqual(T.sig(T.emptyWork('s1')),T.sig({...T.emptyWork('s1'),yakinlar:[{}]}),'Boş satır eklemek değişiklik sayılmamalı');

/* --- doğrulama --- */
assert(T.validate({d:{tc:'123'},yakinlar:[],kardesler:[]}).length===1);
assert(T.validate({d:{boy:'900'},yakinlar:[],kardesler:[]}).length===1);
assert(T.validate({d:{},yakinlar:[],kardesler:[{tc:'1234'}]}).length===1);
assert.strictEqual(T.validate({d:{tc:'12345678901',boy:'140',kilo:'35',kardesSayisi:'2'},yakinlar:[],kardesler:[]}).length,0);

/* --- rapor --- */
const full={ogrenciId:'s1',d:{babaAd:'Mehmet Demir',babaDurum:'Vefat etmiş',anneDurum:'Sağ',birlikte:'Ayrı',kaza:'2',ameliyat:'5',ameliyatDiger:'Bademcik',kiminle:'1',engelli:true,genelAcik:'Uzun\nçok satırlı açıklama',boy:'140'},yakinlar:[{ad:'Fatma Demir',yakinlik:'Diğer',yakinlikDiger:'Büyük teyze',tel:'0555 000 00 00',aciklama:'Gündüz evde'}],kardesler:[{ad:'Ali Demir',sinif:'2-B'}],guncellenme:'2026-10-14T09:30:00.000Z'};
const h=T.formHtml(students[0],full);
for(const m of ['ÖĞRENCİ TANIMA FORMU','assets/logo.png','Eğitim öğretim yılı: <b>2026-2027</b>','Form tarihi: <b>14.10.2026</b>','Ayşe Demir','Zeynep Demir','<b>Vefat etmiş</b>','Diğer: Bademcik','Diğer: Büyük teyze','Fatma Demir','Ev kazası','Annesiyle','Ayrı','140 cm','Bu formda yer alan bilgilerin doğru olduğunu beyan ederim.','Veli imzası','height:30mm','pr-dl','bolum-baslik','Uzun\nçok satırlı açıklama'])assert(h.includes(m),'Rapor eksik: '+m);
for(let n=1;n<=11;n++)assert(h.includes(`>${n}. `),`Bölüm ${n} başlığı eksik`);
for(const bad of ['Öğrenci tipi','Öğrenci durumu','Kayıt durumu'])assert(!h.includes(bad));
assert(!h.includes('Can '),'Başka öğrencinin verisi karışmamalı');
const h2=T.formHtml(students[1],null,{first:false});
assert(h2.includes('Can &lt;b&gt;Yılmaz&lt;/b&gt;')&&!h2.includes('<b>Yılmaz'),'HTML kaçışı eksik');
assert(!h2.includes('Mehmet Demir')&&!h2.includes('Fatma Demir'),'Öğrenciler arası sızıntı');
assert(h2.includes('break-before:page'),'İkinci öğrenci yeni sayfada başlamalı');
assert(h.includes('ti-print-page--first')&&h.includes('ti-print-page--second'),'Form iki sayfalık yerleşim bölümlerine ayrılmalı');
assert(h.includes('ti-continuation'),'İkinci sayfada öğrenci tanımlayıcı başlık bulunmalı');
const intakeSrc=fs.readFileSync('js/modules/student-intake.js','utf8');
assert(intakeSrc.includes('border:1px solid #53665e'),'Hücre kenarlıkları belirgin olmalı');
assert(intakeSrc.includes('page-break-before:always'),'İkinci sayfa yeni sayfadan başlamalı');
assert(intakeSrc.includes('compact:true'),'Rapor sıkıştırılmış yazdırma düzenini kullanmalı');
assert(!h.includes('break-before:page'),'İlk öğrenci boş sayfayla başlamamalı');
const blank=T.formHtml(students[0],null);
assert(blank.includes('Ayşe Demir')&&blank.includes('Zeynep Demir'),'Boş formda öğrenci kaydı bilgileri dolu olmalı');
assert(!blank.includes('Vefat'),'Boş formda sağ/ölü seçili olmamalı');
assert.strictEqual((blank.match(/<td style="height:7mm;overflow-wrap:anywhere">/g)||[]).length,3*5+3*7,'Boş form el yazısı satırları');

/* --- cihaz deposu --- */
(async()=>{
  assert.strictEqual(await SI.store.get('s1'),null);
  await SI.store.put({ogrenciId:'s1',v:1,d:{tc:'x'},yakinlar:[],kardesler:[]});
  assert.strictEqual((await SI.store.get('s1')).d.tc,'x');
  assert.strictEqual((await SI.store.all()).length,1);
  const exp=await SI.store.exportAll();
  assert.strictEqual(await SI.store.importAll([...exp,{bozuk:1},{ogrenciId:'s2',d:{boy:'150'}}]),2,'Geçersiz satır atlanmalı');
  assert.strictEqual((await SI.store.get('s2')).kardesler.length,0);
  await SI.store.remove('s2');assert.strictEqual(await SI.store.get('s2'),null);

  /* --- Bağlantılar --- */
  const rd=f=>fs.readFileSync(f,'utf8');
  const loader=rd('js/app-loader.js'),sw=rd('service-worker.js'),dir=rd('js/modules/people-directory.js'),cls=rd('js/modules/classes-mobile-parity.js'),set=rd('js/modules/settings.js');
  assert(loader.indexOf('people-reports.js')<loader.indexOf('student-intake.js')&&loader.indexOf('student-intake.js')<loader.indexOf("'js/modules/people-directory.js'"),'Yükleme sırası');
  assert(sw.includes("'./js/modules/student-intake.js'"),'SW önbelleği');
  assert(dir.includes("['intake','Tanıma Formu']")&&dir.includes('StudentIntake?.hydrate'),'Sekme bağlantısı');
  assert(cls.includes('data-cmp-intake-bulk')&&cls.includes('Tanıma Formlarını Toplu Yazdır')&&cls.includes('StudentIntake?.openBulk'),'Toplu yazdır butonu');
  assert(set.includes('tanimaFormlari')&&set.includes('StudentIntake?.store?.importAll'),'Yedek bağlantısı');
  assert(!/firebase|Firestore|SyncEngine|DeviceData|fetch\(/.test(src.replace(/\/\*[\s\S]*?\*\//g,'')),'Form modülü ağa/senkrona dokunmamalı');
  assert(!/console\.(log|info|warn)/.test(src),'Kişisel veri loglanmamalı');
  assert(!/createElement\(\s*['"]style['"]/.test(src),'Stil enjeksiyonu yok');
  console.log('student-intake: OK');
})().catch(e=>{console.error(e);process.exit(1)});
