/* Koruk Asistan — Öğrenci Tanıma Formu
 * Tek sahip: seçenek listeleri + cihaz içi form deposu + "Tanıma Formu" sekmesi + A4 rapor + sınıf toplu yazdırma.
 *
 * KÖK NEDEN DÜZELTMESİ (tasarım kararı): Sağlık/aile bilgileri `oy_veliler` belgesine yazılırsa Firestore kuralı
 * (giriş yapmış herkes okur) yüzünden cihaz dışına çıkar. Bu yüzden form yalnızca bu cihazın IndexedDB'sinde
 * (koruk-tanima-formu) tutulur; senkronize veri deposuna ve Firestore'a hiç yazılmaz. Yedek: settings.js.
 * Öğrenci kaydındaki bilgiler (ad, no, sınıf, TC, veli…) forma okunarak gelir; kopyalanıp ikinci kez saklanmaz.
 * Rapor: ReportEngine.printReport (akis:true, kenarBosluk:10 → her sayfada üst/alt boşluk) + css/design-system-base.css içindeki `.ka-report .tif-*` kuralları; modül stil üretmez.
 */
(function(global){
'use strict';
if(global.StudentIntake)return;

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const clone=v=>{try{return structuredClone(v)}catch(_){return JSON.parse(JSON.stringify(v))}};
const toast=m=>global.toast?.(m);
const can=(k,m='read')=>!global.PermissionService||global.PermissionService.can(k,m);
const canUse=()=>can('people.students.edit','edit');
const trSort=(a,b)=>String(a||'').localeCompare(String(b||''),'tr',{numeric:true});
const nextTick=()=>new Promise(r=>setTimeout(r,0));

/* ====================================================================
   SEÇENEK LİSTELERİ — [görünen metin, kaynak değeri]
   e-Okul JSON çıktısından alınanlar kaynak değerini aynen korur. "ÖNERİ" işaretliler e-Okul'dan değildir.
   ==================================================================== */
const O={
  kan:[['A Rh(+)','3'],['A Rh(-)','4'],['AB Rh(+)','7'],['AB Rh(-)','8'],['B Rh(+)','5'],['B Rh(-)','6'],['0 Rh(+)','1'],['0 Rh(-)','2']],
  cinsiyet:[['Kız','Kız'],['Erkek','Erkek']],                         /* mevcut öğrenci kayıtlarındaki değerler */
  hayatta:[['Sağ','Sağ'],['Vefat etmiş','Vefat etmiş']],                /* ÖNERİ */
  birlikte:[['Birlikte','Birlikte'],['Ayrı','Ayrı'],['Belirtilmedi','Belirtilmedi']],  /* ÖNERİ */
  aileYapisi:[['Ailesiyle birlikte','Ailesiyle birlikte'],['Anneyle birlikte','Anneyle birlikte'],['Babayla birlikte','Babayla birlikte'],['Veliyle birlikte','Veliyle birlikte'],['Diğer','Diğer'],['Belirtilmedi','Belirtilmedi']], /* ÖNERİ */
  vasi:[['Var','Var'],['Yok','Yok'],['Belirtilmedi','Belirtilmedi']],  /* ÖNERİ */
  velayet:[['Anne ve baba','Anne ve baba'],['Anne','Anne'],['Baba','Baba'],['Vasi','Vasi'],['Diğer','Diğer'],['Belirtilmedi','Belirtilmedi']], /* ÖNERİ */
  yakinlik:[['Dede','Dede'],['Nine','Nine'],['Amca','Amca'],['Hala','Hala'],['Dayı','Dayı'],['Teyze','Teyze'],['Diğer','Diğer']], /* ÖNERİ */
  internet:[['Var','Var'],['Yok','Yok'],['Belirtilmedi','Belirtilmedi']], /* ÖNERİ */
  kiminle:[['Ailesiyle','0'],['Annesiyle','1'],['Babasıyla','2'],['Velisiyle','3']],
  kaza:[['Kaza geçirmedi','5'],['Ev kazası','2'],['İş kazası','4'],['Okul kazası','3'],['Trafik kazası','1']],
  evKira:[['Kendilerinin','3'],['Kira','1'],['Lojman','2']],
  ameliyat:[['Ameliyatı yok','6'],['Diğer','5'],['Apandist','2'],['Fıtık','3'],['Göz','4'],['Kalp','1']],
  oda:[['Var','1'],['Yok','2']],
  cihaz:[['Cihaz protez yok','5'],['Diğer','4'],['Görsel','3'],['İşitsel','2'],['Ortopedik','1']],
  isinma:[['Diğer','4'],['Elektrikli ısıtıcı','3'],['Kalorifer','2'],['Soba','1']],
  hastalik:[['Hastalık geçirmedi','6'],['Diğer','5'],['Çocuk felci','2'],['Çölyak Hastalığı','7'],['Havale','4'],['Menenjit','1'],['Sara','3']],
  okulaGelis:[['Ailesiyle','3'],['Servisle','2'],['Toplu taşıma','4'],['Yürüyerek','1']],
  surekli:[['Alzheimer','9'],['Astım','1'],['Böbrek yetmezliği','3'],['Çölyak Hastalığı','16'],['Diğer','14'],['Felç','2'],['Hepatit','12'],['Kalp','10'],['Kanser','5'],['Parkinson','6'],['Sara','4'],['Siroz','11'],['Sürekli hastalığı yok','15'],['Şeker','7'],['Tansiyon','13'],['Verem','8']],
  calisiyor:[['Evet','1'],['Hayır','2']],
  ilac:[['Kullandığı ilaç yok','6'],['Diğer','5'],['Astım ilacı','2'],['Kalp ilacı','3'],['Sara ilacı','1'],['Şeker ilacı','4']],
  aileDisi:[['Var','1'],['Yok','2']],
  ozelEgitim:[['Evde eğitim alıyor','3'],['Hastanede eğitim alıyor','2'],['Okulda eğitim alıyor','1'],['Okulda Grup Eğitimine Hazırlık Alıyor','4']],
  gelir:[['Çok İyi','5'],['Çok Kötü','1'],['Düşük','2'],['İyi','4'],['Orta','3']],
  tasimaNeden:[ /* kaynak metinleri (yazım farklılıkları dahil) aynen korunur; kod değerleri değişmez */
    ['Bulunduğu yerde okul yok','1'],['Doğal afet ya da başka nedenlerle okulu kullanılmıyor','2'],['Geldiği okuda 1-3. sınıflarda öğrenci sayısı 10\' dan az','4'],
    ['Geldiği okulda 4-8. sınıflar taşımalı','5'],['Geldiği okulda 6-8. sınıflar taşımalı','6'],['Okul binasının onarım yada tadilatta olması','3'],['Özel eğitim ihtiyacı bulunan öğrenci olması','7']],
  tasimaYemek:[['Ücretsiz Öğle Yemeğinden Faydalanmaktadır','1'],['Ücretsiz Öğle Yemeğinden Faydalanmamaktadır','0']]
};
const lab=(o,v)=>{const x=(O[o]||[]).find(p=>String(p[1])===String(v));return x?x[0]:''};

/* Eğitim öğretim yılı listesi sabit değildir: bugünden türetilir, kayıtlı eski/yeni değer korunur. */
const acYear=(d=new Date())=>d.getMonth()+1>=8?d.getFullYear():d.getFullYear()-1;
const yearList=cur=>{const a=acYear(),l=[a-1,a,a+1,a+2].map(y=>`${y}-${y+1}`);if(cur&&!l.includes(cur))l.push(cur);return l};

/* Mevcut kayıttaki kan grubu metni ("A Rh+") → e-Okul kodu. Tanınmayan değer boş kalır, kod uydurulmaz. */
function kanCode(v){
  const n=String(v||'').toLowerCase().replace(/[\s()]/g,'').replace('rh','').replace(/^o/,'0');
  return ({'a+':'3','a-':'4','ab+':'7','ab-':'8','b+':'5','b-':'6','0+':'1','0-':'2'})[n]||'';
}
/* Sınıf adı "5-A" / "5/A" / "5A" → sınıf + şube. Ayrışmazsa tamamı "Sınıfı" olur. */
function splitClass(ad){
  const m=String(ad||'').trim().match(/^(\d+)\s*[-\/. ]?\s*([A-Za-zÇĞİÖŞÜçğıöşü]{1,3})$/);
  return m?{sinif:m[1],sube:m[2].toLocaleUpperCase('tr')}:{sinif:String(ad||''),sube:''};
}

/* ====================================================================
   ŞEMA — ekran formu ve A4 rapor aynı şemadan üretilir (iki ayrı liste tutulmaz)
   k: kayıt anahtarı · l: etiket · t: tür · o: seçenek listesi · src: öğrenci kaydından gelen değer · ro: salt okunur
   ==================================================================== */
const F=(k,l,t,x={})=>({k,l,t,...x});
const parent=(p,ad)=>[
  F(p+'Ad',ad+' adı soyadı','text'),F(p+'Tc','T.C. kimlik numarası','tc'),F(p+'Durum','Sağ / ölü durumu','sel',{o:'hayatta'}),
  F(p+'Meslek','Mesleği','text'),F(p+'Tel','Telefonu','tel'),F(p+'Eposta','E-posta adresi','email'),
  F(p+'Calisma','Çalışma adresi','area',{full:1}),F(p+'Aciklama','Açıklama (isteğe bağlı)','area',{full:1})
];
const SEC=[
  {id:'ogr',no:1,t:'Öğrenci bilgileri',f:[
    F('tc','T.C. kimlik numarası','tc',{src:s=>s.tcKimlikNo||s.tc}),
    F('ad','Adı soyadı','text',{ro:1,src:s=>s.ogrenciAdi}),
    F('cinsiyet','Cinsiyeti','sel',{o:'cinsiyet',src:s=>s.cinsiyet}),
    F('dogumTarihi','Doğum tarihi','date',{src:s=>s.dogumTarihi}),
    F('dogumYeri','Doğum yeri','text'),
    F('kan','Kan grubu','sel',{o:'kan',src:s=>kanCode(s.kanGrubu)}),
    F('uyruk','Uyruğu','text'),
    F('no','Okul numarası','text',{ro:1,src:s=>s.ogrenciNo}),
    F('sinif','Sınıfı','text',{ro:1,src:(s,c)=>c.sinif}),
    F('sube','Şubesi','text',{ro:1,src:(s,c)=>c.sube}),
    F('okul','Okul adı','text',{ro:1,src:(s,c)=>c.okulAdi}),
    F('yabanciDil','Yabancı dil muafiyeti','chk')
  ]},
  {id:'veli',no:2,t:'Veli / ebeveyn bilgileri',f:[
    F('veliAd','Veli adı soyadı','text',{src:s=>s.veliAdi}),F('veliTc','Veli T.C. kimlik numarası','tc'),
    F('veliTel','Veli cep telefonu','tel',{src:s=>s.telefon1||s.telefon}),F('veliEposta','Veli e-posta adresi','email',{src:s=>s.eposta||s.email}),
    F('veliAdres','Veli adresi','area',{full:1,src:s=>s.adres})
  ]},
  {id:'baba',no:3,t:'Baba bilgileri',f:parent('baba','Baba')},
  {id:'anne',no:4,t:'Anne bilgileri',f:parent('anne','Anne')},
  {id:'aile',no:5,t:'Aile durumu',f:[
    F('birlikte','Anne ve baba birlikte mi?','sel',{o:'birlikte'}),F('aileYapisi','Aile yapısı','sel',{o:'aileYapisi'}),
    F('vasi','Vasi var mı?','sel',{o:'vasi'}),F('velayet','Velayet durumu','sel',{o:'velayet'}),
    F('aileAciklama','Aile durumu açıklaması','area',{full:1})
  ]},
  {id:'yakin',no:6,t:'Anne-baba dışında iletişim kurulabilecek yakınlar',list:'yakinlar'},
  {id:'kardes',no:7,t:'Kardeş bilgileri',list:'kardesler',f:[
    F('kardesSayisi','Toplam kardeş sayısı','number'),F('kacinciCocuk','Öğrencinin kaçıncı çocuk olduğu','number')
  ]},
  {id:'saglik',no:8,t:'Özel durum ve sağlık bilgileri',f:[
    F('engelli','Engellilik durumu (engeli var)','chk'),F('ozelEgitim','Özel eğitim durumu','sel',{o:'ozelEgitim'}),
    F('surekliHastalik','Sürekli hastalığı','sel',{o:'surekli'}),F('hastalik','Geçirdiği hastalık','sel',{o:'hastalik'}),
    F('ilac','Sürekli kullandığı ilaç','sel',{o:'ilac'}),F('kaza','Geçirdiği kaza','sel',{o:'kaza'}),
    F('ameliyat','Geçirdiği ameliyat','sel',{o:'ameliyat'}),F('cihaz','Kullandığı cihaz / protez','sel',{o:'cihaz'}),
    F('surekliAcik','Sürekli hastalık açıklaması','area',{full:1}),F('saglikAcik','Sağlık durumuyla ilgili açıklamalar','area',{full:1}),
    F('rehberlik','Rehberlik hizmeti alıyor','chk'),F('psikolojik','Psikolojik destek alıyor','chk'),
    F('sehitGazi','Şehit / gazi yakını','chk'),F('deprem','Depremde anne / baba / vasisi vefat etti','chk')
  ]},
  {id:'yasam',no:9,t:'Yaşam ve konaklama bilgileri',f:[
    F('gelir','Aile gelir durumu','sel',{o:'gelir'}),F('ev','Oturduğu ev (kira / kendilerinin / lojman)','sel',{o:'evKira'}),
    F('kiminle','Kiminle oturuyor','sel',{o:'kiminle'}),F('oda','Kendi odası var mı','sel',{o:'oda'}),
    F('isinma','Ev ne ile ısınıyor','sel',{o:'isinma'}),F('internet','Evde internet durumu','sel',{o:'internet'}),
    F('okulaGelis','Okula nasıl geliyor','sel',{o:'okulaGelis'}),F('calisiyor','Bir işte çalışıyor mu','sel',{o:'calisiyor'}),
    F('tasima','Taşıma kapsamında','chk'),F('tasimaNeden','Taşıma nedeni','sel',{o:'tasimaNeden',full:1}),
    F('tasimaYemek','Taşıma kapsamında aldığı yemek hizmeti','sel',{o:'tasimaYemek',full:1}),
    F('tasimaPlan','Taşıma planlamaya dahil edilsin','chk'),F('tasimaYil','Taşıması planlanan eğitim öğretim yılı','year'),
    F('aileDisi','Aile dışında kalan var mı','sel',{o:'aileDisi'}),F('pansiyon','Kaldığı pansiyon','text'),
    F('haneKisi','Hanede yaşayan kişi sayısı','number'),F('boy','Boy','number',{u:'cm'}),F('kilo','Kilo','number',{u:'kg'})
  ]},
  {id:'diger',no:10,t:'Diğer bilgiler',f:[
    F('digerAcik','Açıklama','area',{full:1}),F('seyNo','Şartlı Eğitim Yardımı Uygulaması Başvuru No','text',{full:1}),
    F('yurtdisi','Yurtdışından geldi','chk'),F('yatili','Yatılı','chk'),F('burslu','Burslu','chk'),
    F('kanun','2828 veya 5395 sayılı kanunlar kapsamında','chk'),F('sporcu','Sporcu lisansı var','chk'),
    F('destekOda','Destek eğitim odasından yararlanıyor','chk'),F('tasimaDiger','Öğrenci taşıma planlamasıyla ilgili diğer bilgiler','area',{full:1})
  ]},
  {id:'genel',no:11,t:'Genel açıklamalar ve onay',f:[F('genelAcik','Genel açıklamalar','area',{full:1})]}
];
const ALLF=SEC.flatMap(s=>s.f||[]);
const FIELD=Object.fromEntries(ALLF.map(f=>[f.k,f]));
const YAKIN_C=['ad','yakinlik','yakinlikDiger','tel','aciklama'];
const KARDES_C=['tc','ad','dogumTarihi','dogumYeri','okul','sinif'];

/* ====================================================================
   CİHAZ İÇİ DEPO (IndexedDB) — senkronize edilmez, Firestore'a gitmez
   ==================================================================== */
const DB='koruk-tanima-formu',STORE='formlar';
let dbp=null;
function openDb(){
  if(dbp)return dbp;
  dbp=new Promise((ok,no)=>{
    if(!global.indexedDB){dbp=null;no(new Error('indexeddb-yok'));return}
    const r=global.indexedDB.open(DB,1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'ogrenciId'})};
    r.onsuccess=()=>ok(r.result);
    r.onerror=()=>{dbp=null;no(r.error||new Error('indexeddb-hata'))};
    r.onblocked=()=>{dbp=null;no(new Error('indexeddb-blocked'))};
  });
  return dbp;
}
function tx(mode,fn){
  return openDb().then(db=>new Promise((ok,no)=>{
    const t=db.transaction(STORE,mode),s=t.objectStore(STORE);let out;
    const rq=fn(s);if(rq)rq.onsuccess=()=>{out=rq.result};
    t.oncomplete=()=>ok(out);t.onerror=()=>no(t.error||new Error('tx-hata'));t.onabort=()=>no(t.error||new Error('tx-iptal'));
  }));
}
const validRec=r=>r&&typeof r==='object'&&typeof r.ogrenciId==='string'&&r.ogrenciId&&r.d&&typeof r.d==='object'&&!Array.isArray(r.d);
const store={
  get:id=>tx('readonly',s=>s.get(String(id))).then(r=>validRec(r)?r:null),
  put:rec=>tx('readwrite',s=>s.put(rec)),
  all:()=>tx('readonly',s=>s.getAll()).then(l=>(l||[]).filter(validRec)),
  remove:id=>tx('readwrite',s=>s.delete(String(id))),
  exportAll:()=>store.all(),
  async importAll(rows){let n=0;for(const r of Array.isArray(rows)?rows:[]){if(!validRec(r))continue;await store.put({...r,ogrenciId:String(r.ogrenciId),yakinlar:Array.isArray(r.yakinlar)?r.yakinlar:[],kardesler:Array.isArray(r.kardesler)?r.kardesler:[]});n++}return n}
};
let persistAsked=false;
function askPersist(){if(persistAsked)return;persistAsked=true;try{global.navigator?.storage?.persist?.()}catch(_){}}

/* ====================================================================
   VERİ YARDIMCILARI
   ==================================================================== */
const students=()=>arr('veliler');
const studentById=id=>students().find(x=>x.id===id)||null;
const emptyWork=id=>({ogrenciId:String(id),d:{},yakinlar:[],kardesler:[]});
const isEmptyV=v=>v===undefined||v===null||v===''||v===false;
const blankRow=(row,cols)=>cols.every(c=>isEmptyV(row?.[c]));
/* Karşılaştırma ve kayıt için boş değerleri ayıklar; kullanıcı boş bıraktığı alana varsayılan değer yazılmaz. */
function compact(work){
  const d={};
  Object.entries(work.d||{}).forEach(([k,v])=>{if(!isEmptyV(v))d[k]=typeof v==='string'?v.trim():v});
  const pick=(list,cols)=>(Array.isArray(list)?list:[]).filter(r=>!blankRow(r,cols)).map(r=>Object.fromEntries(cols.filter(c=>!isEmptyV(r[c])).map(c=>[c,String(r[c]).trim()])));
  return{ogrenciId:String(work.ogrenciId),d,yakinlar:pick(work.yakinlar,YAKIN_C),kardesler:pick(work.kardesler,KARDES_C)};
}
const sig=work=>JSON.stringify(compact(work));
function ctxFor(s){
  const sinifAd=arr('siniflar').find(x=>x.id===s?.sinifId)?.ad||'';
  const o=arr('okulBilgileri'),ok=o.find(r=>r.id==='ayarlar')||o[0]||global.okulBilgileriAyari||{};
  return{s:s||{},className:sinifAd,...splitClass(sinifAd),okulAdi:ok.okulAdi||ok.ad||'Koruk İlk-Ortaokulu'};
}
function effVal(f,rec,ctx){
  if(f.ro)return f.src?String(f.src(ctx.s,ctx)??''):'';
  const v=rec?.d?.[f.k];
  if(f.t==='chk')return v===true;
  if(!isEmptyV(v))return v;
  return f.src?String(f.src(ctx.s,ctx)??''):'';
}
const fromRecord=(f,rec,ctx)=>!!f.src&&(f.ro||isEmptyV(rec?.d?.[f.k]))&&!!effVal(f,rec,ctx);
function dateTR(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}.${m[2]}.${m[1]}`:String(v||'')}
function dateTimeTR(iso){const d=new Date(iso);if(isNaN(d))return '';const p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`}
function validate(work){
  const bad=[],tc=(v,l)=>{if(v&&!/^[1-9]\d{10}$/.test(String(v)))bad.push(`${l} 11 haneli rakam olmalıdır.`)};
  ['tc','veliTc','babaTc','anneTc'].forEach(k=>tc(work.d[k],FIELD[k].l+(k==='tc'?' (öğrenci)':k==='veliTc'?' (veli)':k==='babaTc'?' (baba)':' (anne)')));
  (work.kardesler||[]).forEach((r,i)=>tc(r.tc,`${i+1}. kardeşin T.C. kimlik numarası`));
  [['boy',40,250],['kilo',2,250]].forEach(([k,a,b])=>{const v=work.d[k];if(v&&!(Number(v)>=a&&Number(v)<=b))bad.push(`${FIELD[k].l} ${a}–${b} ${FIELD[k].u} aralığında olmalıdır.`)});
  ['kardesSayisi','kacinciCocuk','haneKisi'].forEach(k=>{const v=work.d[k];if(v&&!(Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<=40))bad.push(`${FIELD[k].l} 0–40 arasında tam sayı olmalıdır.`)});
  return bad;
}

/* ====================================================================
   A4 RAPOR — iki sabit tabaka, biçim css/design-system-base.css `.ka-report .tif-*`
   ==================================================================== */
const kutuBas=on=>`<i class="tif-kutu${on?' is-on':''}">${on?'✓':''}</i>`;
const cellH=v=>v&&v.html!==undefined?v.html:esc(v==null?'':v);
function dispVal(f,rec,ctx){
  const v=effVal(f,rec,ctx);
  if(f.t==='chk')return{html:`${kutuBas(v)}${v?' Evet':''}`};
  if(isEmptyV(v))return'';
  if(f.t==='sel'){
    const l=lab(f.o,v)||String(v),dg=rec?.d?.[f.k+'Diger'];
    if(f.k.endsWith('Durum')&&l==='Vefat etmiş')return{html:'<b>Vefat etmiş</b>'};
    return l==='Diğer'&&dg?`Diğer: ${dg}`:l;
  }
  if(f.t==='date')return dateTR(v);
  return f.u?`${v} ${f.u}`:String(v);
}
const pad=(rows,n,cols)=>{const o=rows.slice();while(o.length<n)o.push(Array(cols).fill(''));return o};

/* Yazdırma şablonu: iki sabit A4 tabaka (.tif-sayfa). Biçim yalnız css/design-system-base.css içindeki `.ka-report .tif-*` kurallarındadır;
   modül stil üretmez. Her hücrede etiket üstte, değer altta; satırlar 12 sütunlu ızgaraya oturur ve toplamı 12'ye tamamlanır. */
const LISTE_KAP={yakinlar:4,kardesler:4};   /* çıktıya sığan en çok satır; fazlası başlıkta "+N kayıt" olarak belirtilir */
const LISTE_MIN=3;
/* Çıktıya sığan uzunluk: [satır başına karakter, en çok satır]. Çıktıdaki kısaltma (CSS) ve ekrandaki uyarı aynı tablodan beslenir. */
const FIT={
  dogumYeri:[30,1],uyruk:[13,1],pansiyon:[24,1],seyNo:[44,1],
  veliAd:[45,1],veliEposta:[46,1],veliAdres:[70,2],
  babaAd:[55,1],babaMeslek:[26,1],babaEposta:[55,1],babaCalisma:[56,2],babaAciklama:[56,2],
  anneAd:[55,1],anneMeslek:[26,1],anneEposta:[55,1],anneCalisma:[56,2],anneAciklama:[56,2],
  aileAciklama:[118,2],surekliAcik:[56,3],saglikAcik:[56,3],digerAcik:[68,2],tasimaDiger:[118,2],genelAcik:[118,13],
  aileYapisiDiger:[20,1],velayetDiger:[20,1],surekliHastalikDiger:[20,1],hastalikDiger:[20,1],ilacDiger:[20,1],ameliyatDiger:[30,1],cihazDiger:[20,1],isinmaDiger:[20,1]
};
const LISTE_FIT={yakinlar:{ad:[34,2],yakinlik:[24,2],tel:[22,2],aciklama:[32,2]},kardesler:{tc:[11,1],ad:[25,2],dogumYeri:[16,2],okul:[27,2],sinif:[10,2]}};
const LISTE_AD={yakinlar:'yakın',kardesler:'kardeş'};
const satirSay=(t,cpl)=>String(t??'').split(/\r?\n/).reduce((a,p)=>a+Math.max(1,Math.ceil(p.length/cpl)),0);
/* Engellemeyen uyarılar: kayıt kabul edilir, ama çıktıda kısaltılacak değerler bildirilir (metin sessizce kesilmez). */
function fitUyari(work){
  const w=[],d=work?.d||{};
  Object.entries(FIT).forEach(([k,[cpl,n]])=>{
    const v=d[k];if(isEmptyV(v))return;
    const base=k.endsWith('Diger')?k.slice(0,-5):k;
    if(satirSay(v,cpl)>n)w.push(`${FIELD[base]?.l||k}${base!==k?' (Diğer)':''} çıktıya sığmayacak kadar uzun, çıktıda kısaltılır`);
  });
  Object.entries(LISTE_FIT).forEach(([liste,cols])=>{
    const rows=work?.[liste]||[];
    if(rows.length>LISTE_KAP[liste])w.push(`Çıktıya en fazla ${LISTE_KAP[liste]} ${LISTE_AD[liste]} sığar (${rows.length} kayıt var)`);
    rows.forEach((r,i)=>Object.entries(cols).some(([c,[cpl,n]])=>{
      const t=c==='yakinlik'&&r.yakinlik==='Diğer'&&r.yakinlikDiger?`Diğer: ${r.yakinlikDiger}`:r[c];
      if(!isEmptyV(t)&&satirSay(t,cpl)>n){w.push(`${i+1}. ${LISTE_AD[liste]} kaydındaki metin çıktıya sığmayacak kadar uzun, çıktıda kısaltılır`);return true}
      return false;
    }));
  });
  return w;
}
function formHtml(s,rec){
  const ctx=ctxFor(s),r=rec||emptyWork(s.id),now=r.guncellenme||new Date().toISOString();
  const ad=s.ogrenciAdi||'',no=s.ogrenciNo||'',sinif=ctx.className||'',okul=String(ctx.okulAdi).toLocaleUpperCase('tr');
  const yil=acYear(new Date(now)),tarih=dateTR(now.slice(0,10));
  /* hücre = {n: sütun aralığı, h: html} */
  const c=(label,value,n,cls='')=>({n,h:`<div class="tif-h tif-s${n}"><small>${esc(label)}</small><div class="tif-v${cls}">${cellH(value)}</div></div>`});
  const f=(k,n,label)=>{const fd=FIELD[k],sat=FIT[k]?.[1]||1;return c(label||fd.l,dispVal(fd,r,ctx),n,sat>1?` tif-v--m tif-l${sat}`:'')};
  const ck=(k,n,label)=>({n,h:`<div class="tif-ck tif-s${n}">${kutuBas(!!effVal(FIELD[k],r,ctx))}<span>${esc(label||FIELD[k].l)}</span></div>`});
  const row=(h,...cells)=>{const t=cells.reduce((a,x)=>a+x.n,0);return `<div class="tif-r${h?` tif-r--${h}`:''}">${cells.map(x=>x.h).join('')}${t<12?`<div class="tif-h tif-s${12-t} tif-bos"></div>`:''}</div>`};
  const grid=(...rows)=>`<div class="tif-g">${rows.join('')}</div>`;
  const bolum=(sn,ek='')=>`<div class="tif-bolum"><i>${sn+1}</i><b>${esc(SEC[sn].t)}</b><span class="tif-cizgi"></span>${ek}</div>`;
  const blk=(sn,body,{cls='',ek=''}={})=>`<section class="tif-b${cls}">${bolum(sn,ek)}${body}</section>`;
  const liste=(tur,heads,rows)=>`<div class="tif-liste tif-liste--${tur}">${heads.map(x=>`<b>${esc(x)}</b>`).join('')}${rows.map((x,i)=>`<i>${i+1}</i>${x.map(v=>`<div><span>${esc(v)}</span></div>`).join('')}`).join('')}</div>`;
  const listeSatir=(list,kap,cols,map)=>{const l=Array.isArray(list)?list:[];return{rows:pad(l.slice(0,kap).map(map),Math.max(LISTE_MIN,Math.min(kap,l.length)),cols),fazla:Math.max(0,l.length-kap)}};
  const fazlaEk=n=>n?`<em class="tif-ek">+${n} kayıt çıktıya sığmadı</em>`:'';
  const alt=n=>`<footer class="tif-alt"><span>Koruk Asistan · Öğrenci Tanıma Formu · ${esc(ad)}${sinif?` · ${esc(sinif)}`:''}${no?` · No: ${esc(no)}`:''}</span><span>Sayfa ${n} / 2</span></footer>`;
  const yak=listeSatir(r.yakinlar,LISTE_KAP.yakinlar,4,y=>[y.ad||'',y.yakinlik==='Diğer'&&y.yakinlikDiger?`Diğer: ${y.yakinlikDiger}`:(y.yakinlik||''),y.tel||'',y.aciklama||'']);
  const kar=listeSatir(r.kardesler,LISTE_KAP.kardesler,6,k=>[k.tc||'',k.ad||'',dateTR(k.dogumTarihi),k.dogumYeri||'',k.okul||'',k.sinif||'']);
  const sube=effVal(FIELD.sube,r,ctx),sayi=effVal(FIELD.kardesSayisi,r,ctx),kacinci=effVal(FIELD.kacinciCocuk,r,ctx);
  const veliAd=effVal(FIELD.veliAd,r,ctx);
  const ust=`<header class="tif-ust"><img class="tif-logo" src="assets/logo.png" alt=""><div class="tif-ust-baslik"><small>${esc(okul)}</small><strong>ÖĞRENCİ TANIMA FORMU</strong><span>Öğrencinin kimlik, aile, sağlık, eğitim ve yaşam koşullarına ilişkin bilgiler</span></div><div class="tif-ust-meta">Eğitim öğretim yılı: <b>${yil}-${yil+1}</b><br>Form tarihi: <b>${esc(tarih)}</b></div></header>`;
  const ogr=`<section class="tif-b">${bolum(0)}<div class="tif-ogr">${grid(
      row('ogr',f('ad',6),f('tc',3),f('cinsiyet',3)),
      row('ogr',f('dogumTarihi',3),f('dogumYeri',4),f('uyruk',2),f('kan',3)),
      row('ogr',f('no',2),c('Sınıfı / Şubesi',`${esc(effVal(FIELD.sinif,r,ctx))}${sube?` / ${esc(sube)}`:''}`,2),f('okul',5),f('yabanciDil',3))
    )}<div class="tif-foto">Fotoğraf<br>25 × 30 mm</div></div></section>`;
  const ebeveyn=(p,sn)=>blk(sn,grid(
      row('',f(p+'Ad',12)),
      row('',f(p+'Tc',7),f(p+'Durum',5)),
      row('',f(p+'Meslek',6),f(p+'Tel',6)),
      row('',f(p+'Eposta',12)),
      row('y2',f(p+'Calisma',12)),
      row('y2',f(p+'Aciklama',12))
    ));
  const sayfa1=`<div class="tif-sayfa tif-sayfa--1">${ust}${ogr}`
    +blk(1,grid(row('',f('veliAd',5),f('veliTc',3),f('veliTel',4)),row('y2',f('veliEposta',5),f('veliAdres',7))))
    +`<div class="tif-iki">${ebeveyn('baba',2)}${ebeveyn('anne',3)}</div>`
    +blk(4,grid(row('',f('birlikte',3),f('aileYapisi',3),f('vasi',3),f('velayet',3)),row('y2',f('aileAciklama',12))))
    +blk(5,liste('yakin',['#','Adı soyadı','Yakınlık derecesi','Telefon numarası','Açıklama'],yak.rows),{cls:' tif-b--esner',ek:fazlaEk(yak.fazla)})
    +blk(6,liste('kardes',['#','T.C. kimlik no','Adı soyadı','Doğum tarihi','Doğum yeri','Okul / kurum','Sınıf'],kar.rows),{cls:' tif-b--esner',ek:`${fazlaEk(kar.fazla)}<span class="tif-ek">${esc(FIELD.kardesSayisi.l)}: <b class="tif-doldur">${esc(sayi)}</b> · Kaçıncı çocuk: <b class="tif-doldur">${esc(kacinci)}</b></span>`})
    +alt(1)+`</div>`;
  const sayfa2=`<div class="tif-sayfa tif-sayfa--2"><div class="tif-devam"><b>ÖĞRENCİ TANIMA FORMU · DEVAM</b><span>${esc(ad)}${no?` · Okul no: ${esc(no)}`:''}${sinif?` · Sınıf/şube: ${esc(sinif)}`:''}</span></div>`
    +blk(7,grid(
      row('',f('surekliHastalik',3),f('ilac',3),f('hastalik',3),f('kaza',3)),
      row('',f('ameliyat',4),f('cihaz',3),f('ozelEgitim',5)),
      row('y3',f('surekliAcik',6),f('saglikAcik',6)),
      row('ck',ck('engelli',4),ck('rehberlik',4),ck('psikolojik',4)),
      row('ck',ck('sehitGazi',6),ck('deprem',6))))
    +blk(8,grid(
      row('',f('gelir',3),f('ev',3,'Oturduğu ev'),f('kiminle',3),f('oda',3)),
      row('',f('isinma',3),f('internet',3),f('okulaGelis',3),f('calisiyor',3)),
      row('',f('haneKisi',2,'Hanedeki kişi sayısı'),f('aileDisi',3),f('boy',2),f('kilo',2),f('pansiyon',3))))
    +`<section class="tif-b tif-tas"><div class="tif-tas-baslik">TAŞIMALI EĞİTİM</div>${grid(
      row('',f('tasima',4),f('tasimaPlan',5),f('tasimaYil',3,'Planlanan eğitim öğretim yılı')),
      row('',f('tasimaNeden',12)),
      row('',f('tasimaYemek',12)),
      row('y2',f('tasimaDiger',12,'Taşıma planlamasıyla ilgili diğer bilgiler')))}</section>`
    +blk(9,grid(
      row('ck',ck('yurtdisi',4),ck('yatili',4),ck('burslu',4)),
      row('ck',ck('sporcu',3),ck('destekOda',4),ck('kanun',5)),
      row('y2',f('seyNo',5),f('digerAcik',7,'Açıklama'))))
    +`<section class="tif-b tif-b--esner">${bolum(10)}<div class="tif-genel"><small>${esc(FIELD.genelAcik.l)}</small><div class="tif-v tif-v--m tif-v--serbest">${cellH(effVal(FIELD.genelAcik,r,ctx))}</div></div>`
    +`<p class="tif-beyan"><b>Veli beyanı:</b> Bu formda yer alan bilgilerin doğru olduğunu beyan ederim.</p>`
    +`<div class="tif-imza"><b>Veli adı soyadı</b><b>Veli imzası</b><b>Tarih</b><div>${esc(veliAd)}</div><div></div><div>${esc(tarih)}</div></div></section>`
    +alt(2)+`</div>`;
  return `<section class="tif-form" data-ti-student="${esc(s.id)}">${sayfa1}${sayfa2}</section>`;
}
const REPORT_OPTS={baslikGoster:false,logoGoster:false,tarihGoster:false,akis:true,kenarBosluk:10};
async function ensureEngine(){
  if(global.ReportEngine?.printReport)return;
  await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=9');
  if(!global.ReportEngine?.printReport)throw new Error('Rapor motoru hazır değil.');
}
const safeName=v=>String(v||'Ogrenci').replace(/[^\p{L}\p{N}]+/gu,'_').replace(/^_|_$/g,'')||'Ogrenci';

/* ====================================================================
   EKRAN FORMU ("Tanıma Formu" sekmesi)
   ==================================================================== */
const S={drafts:new Map(),loading:new Map(),open:new Set(['ogr'])};
const dirtyIds=()=>[...S.drafts].filter(([,st])=>sig(st.work)!==st.base).map(([id])=>id);

function optHtml(o,cur){
  const list=O[o]||[];let h='<option value="">— Seçiniz —</option>';
  h+=list.map(([l,v])=>`<option value="${esc(v)}"${String(cur)===String(v)?' selected':''}>${esc(l)}</option>`).join('');
  if(cur&&!list.some(p=>String(p[1])===String(cur)))h+=`<option value="${esc(cur)}" selected>${esc(cur)}</option>`;
  return h;
}
function fieldHtml(f,rec,ctx){
  const v=effVal(f,rec,ctx),src=fromRecord(f,rec,ctx),tag=src?' <em class="ti-src">Kayıttan</em>':'';
  const wrap=(inner,cls='')=>`<label class="ka-field ti-f${f.full?' ti-full':''}${cls}"><span class="ka-field__label">${esc(f.l)}${f.u?` (${f.u})`:''}${tag}</span>${inner}</label>`;
  const a=`data-ti-k="${f.k}"`;
  if(f.t==='chk')return`<label class="ti-chk${f.full?' ti-full':''}"><input type="checkbox" ${a}${v?' checked':''}><span>${esc(f.l)}</span></label>`;
  if(f.t==='sel'){
    const dg=lab(f.o,v)==='Diğer';
    return wrap(`<select ${a}>${optHtml(f.o,v)}</select><input class="ti-diger" data-ti-k="${f.k}Diger" placeholder="Açıklayın" value="${esc(rec.d[f.k+'Diger']||'')}"${dg?'':' hidden'}>`);
  }
  if(f.t==='year')return wrap(`<select ${a}><option value="">— Seçiniz —</option>${yearList(v).map(y=>`<option${y===v?' selected':''}>${y}</option>`).join('')}</select>`);
  if(f.t==='area')return wrap(`<textarea ${a} rows="3">${esc(v)}</textarea>`);
  const type={tc:'text',tel:'tel',email:'email',date:'date',number:'number'}[f.t]||'text';
  const extra=f.t==='tc'?' inputmode="numeric" maxlength="11" autocomplete="off"':f.t==='tel'?' inputmode="tel"':f.t==='number'?' inputmode="decimal" min="0"':'';
  return wrap(`<input type="${type}" ${a} value="${esc(v)}"${extra}${f.ro?' readonly':''}>`);
}
function yakinRow(r,i){
  const dg=r.yakinlik==='Diğer';
  return`<div class="ti-row" data-ti-rowbox="yakinlar"><div class="ti-row__h"><b>${i+1}.</b><button type="button" class="ka-btn ka-btn--danger" data-ti-act="del" data-list="yakinlar" data-i="${i}">Sil</button></div><div class="ka-grid">`
    +`<label class="ka-field"><span class="ka-field__label">Adı soyadı</span><input data-ti-list="yakinlar" data-i="${i}" data-c="ad" value="${esc(r.ad||'')}"></label>`
    +`<label class="ka-field"><span class="ka-field__label">Yakınlık derecesi</span><select data-ti-list="yakinlar" data-i="${i}" data-c="yakinlik">${optHtml('yakinlik',r.yakinlik||'')}</select><input class="ti-diger" data-ti-list="yakinlar" data-i="${i}" data-c="yakinlikDiger" placeholder="Yakınlık derecesini yazın" value="${esc(r.yakinlikDiger||'')}"${dg?'':' hidden'}></label>`
    +`<label class="ka-field"><span class="ka-field__label">Telefon numarası</span><input type="tel" inputmode="tel" data-ti-list="yakinlar" data-i="${i}" data-c="tel" value="${esc(r.tel||'')}"></label>`
    +`<label class="ka-field"><span class="ka-field__label">Açıklama</span><input data-ti-list="yakinlar" data-i="${i}" data-c="aciklama" value="${esc(r.aciklama||'')}"></label></div></div>`;
}
function kardesRow(r,i){
  const c=(k,l,t='text',x='')=>`<label class="ka-field"><span class="ka-field__label">${l}</span><input type="${t}" ${x} data-ti-list="kardesler" data-i="${i}" data-c="${k}" value="${esc(r[k]||'')}"></label>`;
  return`<div class="ti-row" data-ti-rowbox="kardesler"><div class="ti-row__h"><b>${i+1}.</b><button type="button" class="ka-btn ka-btn--danger" data-ti-act="del" data-list="kardesler" data-i="${i}">Sil</button></div><div class="ka-grid">`
    +c('tc','T.C. kimlik numarası','text','inputmode="numeric" maxlength="11"')+c('ad','Adı soyadı')+c('dogumTarihi','Doğum tarihi','date')+c('dogumYeri','Doğum yeri')+c('okul','Okul / kurum')+c('sinif','Sınıf / şube')+`</div></div>`;
}
function listBox(key,st){
  const rows=st.work[key]||[],fn=key==='yakinlar'?yakinRow:kardesRow,l=key==='yakinlar'?'Yakın ekle':'Kardeş ekle';
  return`<div data-ti-listbox="${key}">${rows.length?rows.map(fn).join(''):`<p class="kpd-note">${key==='yakinlar'?'Henüz yakın eklenmedi.':'Henüz kardeş eklenmedi.'}</p>`}<button type="button" class="ka-btn ka-btn--secondary" data-ti-act="add" data-list="${key}">+ ${l}</button></div>`;
}
function statusHtml(st){
  const dirty=sig(st.work)!==st.base;
  return`<span>${st.rec?.guncellenme?`Son kayıt: ${esc(dateTimeTR(st.rec.guncellenme))} · bu cihazda saklanır`:'Henüz kaydedilmedi · bu cihazda saklanacak'}</span>${dirty?' <b class="ti-dirty">• Kaydedilmemiş değişiklik var</b>':''}`;
}
function sectionHtml(sc,st,ctx){
  const grid=sc.f?`<div class="ka-grid ti-grid">${sc.f.map(f=>fieldHtml(f,st.work,ctx)).join('')}</div>`:'';
  const list=sc.list?listBox(sc.list,st):'';
  return`<details class="kcl-panel ti-sec" data-ti-sec="${sc.id}"${S.open.has(sc.id)?' open':''}><summary><b>${sc.no}. ${esc(sc.t)}</b></summary>${grid}${list}</details>`;
}
function formScreen(s,st){
  const ctx=ctxFor(s);
  return`<div class="ti-wrap"><div class="ti-status" data-ti-status>${statusHtml(st)}</div>`
    +SEC.map(sc=>sectionHtml(sc,st,ctx)).join('')
    +`<p class="kpd-note">Boş bıraktığınız alanlar boş kaydedilir. Bu form yalnızca bu cihazda saklanır; "Kayıttan" yazan alanlar öğrenci kaydından gelir.</p>`
    +`<div class="ti-bar"><button type="button" class="ka-btn ka-btn--secondary" data-ti-act="cancel">Değişiklikleri iptal et</button><button type="button" class="ka-btn ka-btn--secondary" data-ti-act="blank">Boş form</button><button type="button" class="ka-btn ka-btn--secondary" data-ti-act="report">Önizle · Yazdır · PDF</button><button type="button" class="ka-btn" data-ti-act="save">Kaydet</button></div></div>`;
}
function refreshStatus(el,st){const b=$('[data-ti-status]',el);if(b)b.innerHTML=statusHtml(st)}
function repaintList(el,st,key){const box=$(`[data-ti-listbox="${key}"]`,el);if(box)box.outerHTML=listBox(key,st)}

async function loadState(id){
  if(S.drafts.has(id))return S.drafts.get(id);
  if(S.loading.has(id))return S.loading.get(id);
  const p=(async()=>{
    const rec=await store.get(id);
    const work=rec?{...clone(rec),yakinlar:rec.yakinlar||[],kardesler:rec.kardesler||[]}:emptyWork(id);
    const st={rec,work,base:sig(work)};
    S.drafts.set(id,st);return st;
  })();
  S.loading.set(id,p);
  try{return await p}finally{S.loading.delete(id)}
}
async function mountForm(el,id){
  const s=studentById(id);
  if(!s){el.innerHTML='';return}
  if(!canUse()){el.innerHTML='<p class="kpd-note kpd-note--box">Tanıma formunu görüntülemek için yetkiniz yok.</p>';return}
  let st;
  try{st=await loadState(id)}
  catch(e){console.error('[StudentIntake/load]',e?.message||'hata');el.innerHTML='<p class="kpd-note kpd-note--box">Cihaz hafızası açılamadı; form bu tarayıcıda kullanılamıyor.</p>';return}
  if(!el.isConnected||el.dataset.tiMount!==id)return;
  el.innerHTML=formScreen(s,st);
  if(!el._tiBound){el._tiBound=true;bindForm(el,id)}
}
function hydrate(scope){$$('[data-ti-mount]',scope||document).forEach(el=>{mountForm(el,el.dataset.tiMount)})}

function bindForm(el,id){
  const upd=t=>{
    const st=S.drafts.get(id);if(!st)return;
    if(t.dataset.tiList){
      const list=st.work[t.dataset.tiList],i=Number(t.dataset.i),c=t.dataset.c;
      if(list&&list[i])list[i][c]=t.value;
      if(t.dataset.c==='yakinlik'){const d=t.parentElement.querySelector('.ti-diger');if(d)d.hidden=t.value!=='Diğer'}
    }else if(t.dataset.tiK){
      const f=FIELD[t.dataset.tiK];if(f?.ro)return;
      st.work.d[t.dataset.tiK]=t.type==='checkbox'?t.checked:t.value;
      if(f&&f.t==='sel'){const d=t.parentElement.querySelector('.ti-diger');if(d){const dg=lab(f.o,t.value)==='Diğer';d.hidden=!dg;if(!dg){d.value='';delete st.work.d[f.k+'Diger']}}}
    }else return;
    refreshStatus(el,st);
  };
  el.addEventListener('input',e=>{if(e.target.matches('input:not([type=checkbox]),textarea'))upd(e.target)});
  el.addEventListener('change',e=>upd(e.target));
  el.addEventListener('toggle',e=>{const d=e.target;if(d.dataset?.tiSec)d.open?S.open.add(d.dataset.tiSec):S.open.delete(d.dataset.tiSec)},true);
  el.addEventListener('click',async e=>{
    const b=e.target.closest('[data-ti-act]');if(!b||!el.contains(b))return;
    const st=S.drafts.get(id),s=studentById(id);if(!st||!s)return;
    const act=b.dataset.tiAct,key=b.dataset.list;
    if(act==='add'){st.work[key].push({});repaintList(el,st,key);refreshStatus(el,st);const last=$$(`[data-ti-rowbox="${key}"]`,el).pop();last?.querySelector('input')?.focus();return}
    if(act==='del'){
      const i=Number(b.dataset.i),row=st.work[key][i];
      if(row&&!blankRow(row,key==='yakinlar'?YAKIN_C:KARDES_C)&&!global.confirm?.('Bu satır silinsin mi?'))return;
      st.work[key].splice(i,1);repaintList(el,st,key);refreshStatus(el,st);return;
    }
    if(act==='save'){b.disabled=true;try{await saveForm(id)}finally{b.disabled=false}if(el.isConnected)mountForm(el,id);return}
    if(act==='cancel'){
      if(sig(st.work)!==st.base&&!global.confirm?.('Kaydedilmemiş değişiklikler silinsin mi?'))return;
      S.drafts.delete(id);mountForm(el,id);return;
    }
    if(act==='report'||act==='blank'){
      if(act==='report'&&sig(st.work)!==st.base){
        if(!global.confirm?.('Kaydedilmemiş değişiklikler var. Rapor kayıtlı bilgilerden üretilir; önce kaydedilsin mi?'))return;
        if(!await saveForm(id))return;
        if(el.isConnected)mountForm(el,id);
      }
      b.disabled=true;try{await openReport(id,{blank:act==='blank'})}finally{b.disabled=false}
    }
  });
}
async function saveForm(id){
  const st=S.drafts.get(id),s=studentById(id);
  if(!st||!s||st.work.ogrenciId!==String(id)){toast('Öğrenci kaydı doğrulanamadı; form kaydedilmedi.');return false}
  if(!canUse()){toast('Bu işlem için yetkiniz yok.');return false}
  const errs=validate(st.work);
  if(errs.length){toast(errs[0]);return false}
  const rec={...compact(st.work),v:1,guncellenme:new Date().toISOString(),ogrenciAdi:s.ogrenciAdi||'',ogrenciNo:s.ogrenciNo||''};
  try{askPersist();await store.put(rec)}
  catch(e){console.error('[StudentIntake/save]',e?.message||'hata');toast('Form kaydedilemedi; girdiğiniz bilgiler ekranda korunuyor.');return false}
  st.rec=rec;st.work={...clone(rec)};st.base=sig(st.work);
  const uy=fitUyari(st.work);
  toast(uy.length?`Form kaydedildi. Uyarı: ${uy[0]}${uy.length>1?` (+${uy.length-1} uyarı daha)`:''}.`:'Form bu cihaza kaydedildi.');
  return true;
}
async function openReport(id,{blank=false}={}){
  const s=studentById(id);if(!s)return;
  try{
    await ensureEngine();
    const rec=blank?null:await store.get(id);
    await global.ReportEngine.printReport(`${s.ogrenciAdi||'Öğrenci'} — Öğrenci Tanıma Formu`,formHtml(s,rec),{...REPORT_OPTS,fileName:`${safeName(s.ogrenciAdi)}_Ogrenci_Tanima_Formu`});
  }catch(e){console.error('[StudentIntake/report]',e?.message||'hata');toast('Tanıma formu raporu açılamadı.')}
}

/* Kaydedilmemiş değişiklik uyarıları: sekme/geri/menü tıklamaları + sayfa kapatma */
if(global.document){
  document.addEventListener('click',e=>{
    const ids=dirtyIds();if(!ids.length)return;
    if(e.target.closest?.('[data-ti-mount],[data-ti-bulk],.ka-modal-backdrop,#kaReportPreview'))return;
    if(!e.target.closest?.('[data-kpd-act],[data-cmp-back],[data-cmp-tab],[data-cmp-class-detail],.ka-app-nav a,.ka-app-nav button,[data-nav]'))return;
    if(global.confirm?.('Tanıma formunda kaydedilmemiş değişiklikler var. Kaydetmeden çıkılsın mı?')){ids.forEach(i=>S.drafts.delete(i));return}
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  global.addEventListener?.('beforeunload',e=>{if(dirtyIds().length){e.preventDefault();e.returnValue=''}});
}

/* ====================================================================
   SINIF TOPLU YAZDIRMA
   ==================================================================== */
const CHUNK=30;
async function openBulk({classId,className,students:list}={}){
  if(!canUse()){toast('Bu işlem için yetkiniz yok.');return}
  const rows0=Array.isArray(list)?list:[];
  if(!rows0.length){toast('Bu sınıfta öğrenci yok.');return}
  let recs;
  try{recs=new Map((await store.all()).map(r=>[r.ogrenciId,r]))}
  catch(e){console.error('[StudentIntake/bulk]',e?.message||'hata');toast('Cihaz hafızası açılamadı.');return}
  $('[data-ti-bulk]')?.remove();
  const ids=new Set(rows0.map(s=>s.id));
  const sel=new Set(rows0.filter(s=>recs.has(s.id)).map(s=>s.id));
  let part=0,busy=false,cancelled=false;
  const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.tiBulk='';ov.dataset.kpdModal='';
  const done=rows0.filter(s=>recs.has(s.id)),missing=rows0.filter(s=>!recs.has(s.id));
  const picked=()=>rows0.filter(s=>sel.has(s.id));
  const item=s=>`<label class="ti-pick"><input type="checkbox" data-ti-pick="${esc(s.id)}"${sel.has(s.id)?' checked':''}><span>${esc(s.ogrenciAdi||'İsimsiz')}${s.ogrenciNo?` <small>· No ${esc(s.ogrenciNo)}</small>`:''}</span></label>`;
  const paint=()=>{
    const n=picked().length,parts=Math.ceil(n/CHUNK);if(part>=parts)part=0;
    ov.innerHTML=`<div class="ka-modal kpd-form" role="dialog" aria-label="Tanıma formlarını toplu yazdır"><div class="ka-modal__header"><h2>Tanıma Formlarını Toplu Yazdır</h2><button class="ka-icon-button" type="button" data-ti-close aria-label="Kapat">×</button></div>`
      +`<div class="ka-modal__body ka-stack"><div class="ti-kpis"><div><b>${esc(className||'Sınıf')}</b><small>Sınıf</small></div><div><b>${rows0.length}</b><small>Öğrenci</small></div><div><b>${done.length}</b><small>Formu tamam</small></div><div><b>${missing.length}</b><small>Formu eksik</small></div><div><b>${n}</b><small>Çıktıya dahil</small></div></div>`
      +`<div class="ti-bulk-actions"><button class="ka-btn ka-btn--secondary" type="button" data-ti-sel="all">Tümünü seç</button><button class="ka-btn ka-btn--secondary" type="button" data-ti-sel="done">Yalnızca tamamlananlar</button><button class="ka-btn ka-btn--secondary" type="button" data-ti-sel="none">Temizle</button></div>`
      +`<h3 class="ti-h">Formu kayıtlı (${done.length})</h3><div class="ti-list">${done.length?done.map(item).join(''):'<p class="kpd-note">Hiçbir öğrencinin formu kayıtlı değil.</p>'}</div>`
      +`<h3 class="ti-h">Formu eksik (${missing.length})</h3><div class="ti-list">${missing.length?missing.map(item).join(''):'<p class="kpd-note">Eksik form yok.</p>'}</div>`
      +(missing.some(s=>sel.has(s.id))?'<p class="kpd-note kpd-note--box">Seçilen eksik formlu öğrenciler için, öğrenci kaydındaki bilgilerle dolu ve elle doldurulabilir boş form basılır.</p>':'')
      +(parts>1?`<label class="ka-field"><span class="ka-field__label">Çıktı parçası (tarayıcı belleği için ${CHUNK} öğrenciyi aşan seçimler bölünür)</span><select data-ti-part>${Array.from({length:parts},(_,i)=>`<option value="${i}"${i===part?' selected':''}>Parça ${i+1} — ${i*CHUNK+1}–${Math.min(n,(i+1)*CHUNK)}. öğrenci</option>`).join('')}</select></label>`:'')
      +`<p class="kpd-note" data-ti-progress></p></div>`
      +`<div class="ka-modal__footer"><span class="ka-grow"></span><button class="ka-btn ka-btn--secondary" type="button" data-ti-close>Vazgeç</button><button class="ka-btn" type="button" data-ti-go${n&&!busy?'':' disabled'}>Önizle ve yazdır</button></div></div>`;
  };
  const close=()=>{cancelled=true;ov.remove()};
  ov.addEventListener('click',async e=>{
    if(e.target===ov||e.target.closest('[data-ti-close]')){close();return}
    const sb=e.target.closest('[data-ti-sel]');
    if(sb){const m=sb.dataset.tiSel;sel.clear();if(m==='all')rows0.forEach(s=>sel.add(s.id));if(m==='done')done.forEach(s=>sel.add(s.id));paint();return}
    if(e.target.closest('[data-ti-go]')&&!busy){
      busy=true;cancelled=false;
      const chosen=picked().slice(part*CHUNK,part*CHUNK+CHUNK),prog=$('[data-ti-progress]',ov);
      const goBtn=$('[data-ti-go]',ov);if(goBtn)goBtn.disabled=true;
      try{
        await ensureEngine();
        const out=[];
        for(let i=0;i<chosen.length;i++){
          if(cancelled||!ov.isConnected)return;
          const s=chosen[i];
          if(!ids.has(s.id)||!studentById(s.id))continue;           /* yalnız bu sınıfın, mevcut öğrencileri */
          out.push(formHtml(s,recs.get(s.id)||null,{first:out.length===0}));
          if(prog)prog.textContent=`Hazırlanıyor: ${i+1} / ${chosen.length}`;
          if(i%4===3)await nextTick();                                  /* arayüz donmasın */
        }
        if(cancelled||!ov.isConnected)return;
        ov.remove();
        await global.ReportEngine.printReport(`${className||'Sınıf'} — Öğrenci Tanıma Formları`,out.join(''),{...REPORT_OPTS,fileName:`${safeName(className)}_Ogrenci_Tanima_Formlari`});
      }catch(err){console.error('[StudentIntake/bulk]',err?.message||'hata');toast('Toplu çıktı hazırlanamadı.');busy=false;if(ov.isConnected)paint()}
    }
  });
  ov.addEventListener('change',e=>{
    const c=e.target.closest('[data-ti-pick]');
    if(c){c.checked?sel.add(c.dataset.tiPick):sel.delete(c.dataset.tiPick);part=0;paint();return}
    const p=e.target.closest('[data-ti-part]');if(p){part=Number(p.value)||0;paint()}
  });
  paint();document.body.appendChild(ov);
}

const api={
  available:canUse,
  tabHtml:v=>`<div data-ti-mount="${esc(v.id)}"><p class="kpd-note">Form yükleniyor…</p></div>`,
  hydrate,openBulk,openReport,store,
  _t:{O,SEC,FIELD,FIT,fitUyari,LISTE_KAP,kanCode,splitClass,compact,sig,validate,formHtml,effVal,dispVal,emptyWork,dateTR,yearList,validRec}
};
global.StudentIntake=api;
})(window);
