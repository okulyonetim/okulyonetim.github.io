/* Koruk Asistan — Öğrenci Tanıma Formu
 * Tek sahip: seçenek listeleri + cihaz içi form deposu + "Tanıma Formu" sekmesi + A4 rapor + sınıf toplu yazdırma.
 *
 * KÖK NEDEN DÜZELTMESİ (tasarım kararı): Sağlık/aile bilgileri `oy_veliler` belgesine yazılırsa Firestore kuralı
 * (giriş yapmış herkes okur) yüzünden cihaz dışına çıkar. Bu yüzden form yalnızca bu cihazın IndexedDB'sinde
 * (koruk-tanima-formu) tutulur; senkronize veri deposuna ve Firestore'a hiç yazılmaz. Yedek: settings.js.
 * Öğrenci kaydındaki bilgiler (ad, no, sınıf, TC, veli…) forma okunarak gelir; kopyalanıp ikinci kez saklanmaz.
 * Rapor: ReportEngine.printReport + mevcut .ka-report / pr-dl / bolum-baslik sınıfları (yeni stil yok).
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
   A4 RAPOR — mevcut .ka-report sınıfları (pr-dl, bolum-baslik, pr-ck); yeni stil dosyası yok
   ==================================================================== */
const chkHtml=on=>`<span class="pr-ck${on?' is-on':''}">${on?'✓':'□'}</span>`;
const cellH=v=>v&&v.html!==undefined?v.html:esc(v==null?'':v);
function dispVal(f,rec,ctx){
  const v=effVal(f,rec,ctx);
  if(f.t==='chk')return{html:`${chkHtml(v)}${v?' Evet':''}`};
  if(isEmptyV(v))return'';
  if(f.t==='sel'){
    const l=lab(f.o,v)||String(v),dg=rec?.d?.[f.k+'Diger'];
    if(f.k.endsWith('Durum')&&l==='Vefat etmiş')return{html:'<b>Vefat etmiş</b>'};
    return l==='Diğer'&&dg?`Diğer: ${dg}`:l;
  }
  if(f.t==='date')return dateTR(v);
  return f.u?`${v} ${f.u}`:String(v);
}
function dl(pairs){
  const rows=[];let cur=[];
  pairs.forEach(p=>{
    if(p.full){if(cur.length){rows.push(cur);cur=[]}rows.push([p])}
    else{cur.push(p);if(cur.length===2){rows.push(cur);cur=[]}}
  });
  if(cur.length)rows.push(cur);
  const td=(p,span)=>`<td${span?' colspan="3"':''} style="height:${p.tall?'16mm':'6.5mm'};white-space:pre-wrap;overflow-wrap:anywhere">${cellH(p.v)}</td>`;
  return`<table class="pr-dl" style="table-layout:fixed"><tbody>${rows.map(r=>r.length===1&&r[0].full
    ?`<tr style="break-inside:avoid"><th scope="row">${esc(r[0].l)}</th>${td(r[0],true)}</tr>`
    :`<tr style="break-inside:avoid">${[0,1].map(i=>r[i]?`<th scope="row">${esc(r[i].l)}</th>${td(r[i])}`:'<th></th><td></td>').join('')}</tr>`).join('')}</tbody></table>`;
}
function grid(heads,widths,rows){
  return`<table style="table-layout:fixed"><thead><tr>${heads.map((h,i)=>`<th style="width:${widths[i]}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr style="break-inside:avoid">${r.map(c=>`<td style="height:7mm;overflow-wrap:anywhere">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
const h2=(no,t)=>`<h2 class="bolum-baslik" style="break-after:avoid;page-break-after:avoid">${no}. ${esc(t)}</h2>`;
const pad=(rows,n,cols)=>{const o=rows.slice();while(o.length<n)o.push(Array(cols).fill(''));return o};

/* Yazdırma şablonu: yüklenen iki sayfalı örneğin hücre yerleşimi ve sıralaması. */
function pItem(k,span=1,label,rec,ctx){
  const f=FIELD[k],cls=({veliAdres:'ti-address-cell',surekliAcik:'ti-health-note',saglikAcik:'ti-health-note',digerAcik:'ti-other-note',tasimaDiger:'ti-transport-note',genelAcik:'ti-general-cell'})[k]||'';
  return{span,html:pCell(label||f?.l||k,f?dispVal(f,rec,ctx):'',span,cls)};
}
function pRaw(label,value,span=1,cls=''){return{span,html:pCell(label,value,span,cls)}}
function pCell(label,value,span=1,cls=''){
  return `<td colspan="${span}" class="${cls}"><table class="ti-pair"><tbody><tr><td class="ti-label-cell">${esc(label)}</td><td class="ti-answer-cell"><div class="ti-value">${cellH(value)||'&nbsp;'}</div></td></tr></tbody></table></td>`;
}
function pGrid(rows){
  return `<table class="ti-grid-table"><colgroup>${Array.from({length:12},()=>'<col style="width:8.333%">').join('')}</colgroup><tbody>${rows.map(row=>{
    let used=0;
    const cells=row.map(item=>{const span=Math.max(1,Math.min(12-used,Number(item.span)||1));used+=span;return item.html.replace(/colspan="[^"]*"/, `colspan="${span}"`)}).join('');
    return `<tr>${cells}${used<12?`<td colspan="${12-used}"><div class="ti-cell"><small>&nbsp;</small><div class="ti-value">&nbsp;</div></div></td>`:''}</tr>`;
  }).join('')}</tbody></table>`;
}
function pCheck(k,label,span=4,rec,ctx){
  const f=FIELD[k],v=f?!!effVal(f,rec,ctx):false;
  const answer=`<span class="ti-box${v?' is-on':''}">${v?'✓':''}</span>${(k==='tasima'||k==='tasimaPlan')&&v?' <b>Evet</b>':''}`;
  return{span,html:`<td colspan="${span}" class="ti-check-cell"><table class="ti-pair"><tbody><tr><td class="ti-label-cell">${esc(label||f?.l||k)}</td><td class="ti-answer-cell">${answer}</td></tr></tbody></table></td>`};
}
function pChecks(rows){return `<table class="ti-check-table"><colgroup>${Array.from({length:12},()=>'<col style="width:8.333%">').join('')}</colgroup><tbody>${rows.map(row=>`<tr>${row.map(x=>x.html).join('')}</tr>`).join('')}</tbody></table>`;}
function pSection(no,title){return `<h2 class="ti-section-heading"><span>${no}</span><b>${esc(title)}</b></h2>`;}
function pTable(heads,widths,rows){return `<table class="ti-list-table" style="table-layout:fixed"><colgroup>${widths.map(w=>`<col style="width:${w}">`).join('')}</colgroup><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function formHtml(s,rec,{first=true}={}){
  const ctx=ctxFor(s),r=rec||emptyWork(s.id),now=r.guncellenme||new Date().toISOString();
  const adSoyad=s.ogrenciAdi||'',baslik=String(ctx.okulAdi).toLocaleUpperCase('tr');
  const f=(k,span=1,label)=>pItem(k,span,label,r,ctx);
  const raw=(label,value,span=1,cls='')=>pRaw(label,value,span,cls);
  const ck=(k,label,span=4)=>pCheck(k,label,span,r,ctx);
  const yak=pad((r.yakinlar||[]).map(y=>[y.ad||'',y.yakinlik==='Diğer'&&y.yakinlikDiger?`Diğer: ${y.yakinlikDiger}`:(y.yakinlik||''),y.tel||'',y.aciklama||'']),3,4).map((x,i)=>[String(i+1),...x]);
  const kar=pad((r.kardesler||[]).map(k=>[k.tc||'',k.ad||'',dateTR(k.dogumTarihi),k.dogumYeri||'',k.okul||'',k.sinif||'']),3,6).map((x,i)=>[String(i+1),...x]);
  const veliAd=effVal(FIELD.veliAd,r,ctx);
  const header=`<header class="ti-header"><img src="assets/logo.png" alt="" class="ti-logo"><div class="ti-headcopy"><small>${esc(baslik)}</small><strong>ÖĞRENCİ TANIMA FORMU</strong><span>Öğrencinin kimlik, aile, sağlık, eğitim ve yaşam koşullarına ilişkin bilgiler</span></div><div class="ti-meta">Eğitim öğretim yılı: <b>${acYear(new Date(now))}-${acYear(new Date(now))+1}</b><br>Form tarihi: <b>${esc(dateTR(now.slice(0,10)))}</b></div><div class="ti-photo">Fotoğraf</div></header>`
    +`<div class="ti-student-bar"><b>${esc(adSoyad)}</b><span>Okul no: ${esc(s.ogrenciNo||'')}</span><span>Sınıf/şube: ${esc(ctx.className||'')}</span><small>Kimlik ve aile bilgileri</small></div>`;
  const pageOne=`<div class="ti-print-page ti-print-page--first">${header}`
    +pSection(1,SEC[0].t)
    +pGrid([[f('ad',6),f('tc',6)],[f('cinsiyet',2),f('dogumTarihi',4),f('dogumYeri',4),f('uyruk',2)],[f('kan',2),f('no',2),raw('Sınıfı / Şubesi',`${esc(effVal(FIELD.sinif,r,ctx))}${effVal(FIELD.sube,r,ctx)?` / ${esc(effVal(FIELD.sube,r,ctx))}`:''}`,2),f('yabanciDil',2),f('okul',4)]])
    +pSection(2,SEC[1].t)
    +pGrid([[f('veliAd',4),f('veliTc',4),f('veliTel',4)],[f('veliEposta',4),f('veliAdres',8)]])
    +`<div class="ti-two"><div>${pSection(3,SEC[2].t)}${pGrid([[f('babaAd',12)],[f('babaTc',7),f('babaDurum',5)],[f('babaMeslek',6),f('babaTel',6)],[f('babaEposta',12)],[f('babaCalisma',12)],[f('babaAciklama',12)]])}</div><div>${pSection(4,SEC[3].t)}${pGrid([[f('anneAd',12)],[f('anneTc',7),f('anneDurum',5)],[f('anneMeslek',6),f('anneTel',6)],[f('anneEposta',12)],[f('anneCalisma',12)],[f('anneAciklama',12)]])}</div></div>`
    +pSection(5,SEC[4].t)
    +pGrid([[f('birlikte',3),f('aileYapisi',3),f('vasi',3),f('velayet',3)],[f('aileAciklama',12)]])
    +pSection(6,SEC[5].t)
    +pTable(['#','Adı soyadı','Yakınlık derecesi','Telefon numarası','Açıklama'],['5%','32%','19%','20%','24%'],yak)
    +pSection(7,SEC[6].t)
    +pGrid([[f('kardesSayisi',6),f('kacinciCocuk',6)]])
    +pTable(['#','T.C. kimlik no','Adı soyadı','Doğum tarihi','Doğum yeri','Okul / kurum','Sınıf'],['4%','18%','22%','14%','14%','18%','10%'],kar)
    +`<footer class="ti-page-footer"><span>Koruk Asistan · Öğrenci Tanıma Formu</span><span>Sayfa 1 / 2</span></footer></div>`;
  const pageTwo=`<div class="ti-print-page ti-print-page--second"><div class="ti-continuation"><div><b>ÖĞRENCİ TANIMA FORMU · DEVAM</b><small>${esc(adSoyad)} · Okul no: ${esc(s.ogrenciNo||'')} · Sınıf/şube: ${esc(ctx.className||'')}</small></div><span>Sayfa 2 / 2</span></div>`
    +pSection(8,SEC[7].t)
    +pGrid([[f('surekliHastalik',3),f('ilac',3),f('hastalik',3),f('kaza',3)],[f('ameliyat',4),f('cihaz',4),f('ozelEgitim',4)],[f('surekliAcik',6),f('saglikAcik',6)]])
    +pChecks([[ck('engelli',null,4),ck('rehberlik',null,4),ck('psikolojik',null,4)],[ck('sehitGazi',null,6),ck('deprem',null,6)]])
    +pSection(9,SEC[8].t)
    +pGrid([[f('gelir',3),f('ev',3),f('kiminle',3),f('oda',3)],[f('isinma',3),f('internet',3),f('okulaGelis',3),f('calisiyor',3)],[f('haneKisi',3),f('aileDisi',3),f('boy',3),f('kilo',3)],[f('pansiyon',12)]])
    +`<div class="ti-transport"><div class="ti-transport-title">TAŞIMALI EĞİTİM</div>`
    +pChecks([[ck('tasima','Taşıma kapsamında',6),ck('tasimaPlan','Taşıma planlamaya dahil edilsin',6)]])
    +pGrid([[f('tasimaNeden',9),f('tasimaYil',3)],[f('tasimaYemek',12)]])+`</div>`
    +pSection(10,SEC[9].t)
    +pChecks([[ck('yurtdisi',null,4),ck('yatili',null,4),ck('burslu',null,4)],[ck('sporcu',null,4),ck('destekOda',null,4),ck('kanun',null,4)]])
    +pGrid([[f('seyNo',12)],[f('digerAcik',12)],[f('tasimaDiger',12)]])
    +pSection(11,SEC[10].t)
    +pGrid([[raw('Genel açıklamalar',effVal(FIELD.genelAcik,r,ctx),12,'ti-general-cell')]])
    +`<p class="ti-declaration"><b>Veli beyanı:</b> Bu formda yer alan bilgilerin doğru olduğunu beyan ederim.</p>`
    +`<table class="ti-signature"><colgroup><col style="width:34%"><col style="width:44%"><col style="width:22%"></colgroup><thead><tr><th>Veli adı soyadı</th><th>Veli imzası</th><th>Tarih</th></tr></thead><tbody><tr><td>${esc(veliAd)}</td><td></td><td>${esc(dateTR(now.slice(0,10)))}</td></tr></tbody></table>`
    +`<footer class="ti-page-footer"><span>Koruk Asistan · Öğrenci Tanıma Formu</span><span>Sayfa 2 / 2</span></footer></div>`;
  return `<section class="ti-form" data-ti-student="${esc(s.id)}" style="${first?'':'break-before:page;page-break-before:always'}">${pageOne+pageTwo}</section>`;
}
const REPORT_OPTS={baslikGoster:false,logoGoster:false,tarihGoster:false,fontSize:8,kenarBosluk:7,compact:true,extraHead:`<style>
.ti-form{font-size:7.2pt!important;line-height:1.12!important;color:#17221e!important;font-family:Arial,sans-serif!important}
.ti-print-page{box-sizing:border-box;width:100%;position:relative;padding-bottom:5mm}
.ti-print-page--second{break-before:page;page-break-before:always;padding-top:8mm}
.ti-header{display:flex;align-items:center;gap:2.5mm;padding-bottom:2mm;margin-bottom:2mm;border-bottom:1.2mm solid #17684f}
.ti-logo{width:14mm;height:14mm;object-fit:contain;flex:0 0 auto}
.ti-headcopy{display:flex;flex-direction:column;min-width:0;flex:1}
.ti-headcopy small{font-size:6.4pt;font-weight:700;color:#65766f;text-transform:uppercase;letter-spacing:.04em}
.ti-headcopy strong{font-size:12pt;line-height:1.12;color:#17684f}
.ti-headcopy span{margin-top:1mm;font-size:6.3pt;color:#384b43}
.ti-meta{font-size:6.3pt;line-height:1.5;text-align:right;white-space:nowrap}
.ti-photo{width:19mm;height:23mm;border:1px dashed #87948d;display:flex;align-items:center;justify-content:center;font-size:6.5pt;color:#78857f;text-align:center;flex:0 0 auto}
.ti-student-bar{display:flex;align-items:center;gap:3mm;background:#10523f;color:#fff;border-radius:2mm;padding:2mm 3mm;margin-bottom:2mm;font-size:6.8pt}
.ti-student-bar>b{font-size:8.5pt}.ti-student-bar small{margin-left:auto}.ti-student-bar span{white-space:nowrap}.ti-student-bar small{font-size:6pt}
.ti-section-heading{display:flex;align-items:center;gap:1.5mm;margin:2.1mm 0 1mm!important;padding:0!important;border:0!important;background:transparent!important;color:#10523f!important;font-size:7.7pt!important;line-height:1.1!important;break-after:avoid;page-break-after:avoid}
.ti-section-heading>span{width:5mm;height:5mm;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:#17684f;color:#fff;font-size:6.5pt;flex:0 0 auto}
.ti-section-heading>b{font-weight:800}
.ti-grid-table,.ti-list-table,.ti-check-table,.ti-signature{width:100%!important;border-collapse:collapse!important;border-spacing:0!important;table-layout:fixed;margin:0!important}
.ti-grid-table td,.ti-list-table td,.ti-list-table th,.ti-check-table td,.ti-signature td,.ti-signature th{border:1px solid #aabbb2!important}
.ti-grid-table td{padding:0!important;vertical-align:middle!important}
.ti-pair{width:100%!important;border-collapse:collapse!important;border-spacing:0!important;table-layout:fixed!important;margin:0!important}
.ti-pair td{border:0!important;vertical-align:middle!important;padding:1.3mm 1.5mm!important;overflow-wrap:anywhere;background:#fff!important}
.ti-pair .ti-label-cell{width:38%;background:#fff!important;color:#303a34!important;font-size:6.1pt!important;font-weight:500!important;line-height:1.15!important;border-right:1px solid #c5cec8!important}
.ti-pair .ti-answer-cell{width:62%;background:#fff!important;color:#17221e!important;font-size:7pt!important;line-height:1.15!important}
.ti-value{font-size:7pt;font-weight:500;line-height:1.15;min-height:2.5mm;white-space:pre-wrap;overflow-wrap:anywhere}
.ti-general-cell .ti-pair .ti-label-cell{width:25%}
.ti-general-cell .ti-pair .ti-answer-cell{width:75%;vertical-align:top!important}
.ti-general-cell .ti-pair .ti-answer-cell .ti-value{min-height:22mm}
.ti-health-note .ti-pair .ti-answer-cell .ti-value{min-height:8mm}
.ti-address-cell .ti-pair .ti-answer-cell .ti-value{min-height:5mm}
.ti-check-table .ti-pair .ti-label-cell{width:78%;font-size:6.2pt!important;background:#fff!important;font-weight:500!important}
.ti-check-table .ti-pair .ti-answer-cell{width:22%;text-align:center;font-size:6.5pt!important}
.ti-check-table .ti-pair .ti-answer-cell .ti-box{margin:0}
.ti-grid-table tr:nth-child(even) td{background:#f7faf8!important}
.ti-grid-table .ti-other-note .ti-pair .ti-answer-cell .ti-value{min-height:7mm}
.ti-grid-table .ti-transport-note .ti-pair .ti-answer-cell .ti-value{min-height:10mm}
.ti-two{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.ti-two>div{min-width:0}
.ti-two .ti-section-heading{margin-top:2mm!important}
.ti-two .ti-cell{min-height:6.8mm}
.ti-check-table{margin-top:1.5mm!important;margin-bottom:1mm!important}
.ti-check-cell{padding:1.4mm 1.5mm!important;font-size:6.5pt;line-height:1.1;vertical-align:middle}
.ti-box{display:inline-flex;width:3.2mm;height:3.2mm;border:1px solid #71847a;border-radius:.5mm;align-items:center;justify-content:center;margin-right:1.2mm;font-size:7pt;vertical-align:middle}
.ti-box.is-on{background:#17684f;color:#fff;border-color:#17684f}
.ti-list-table th{background:#e8f0eb!important;color:#244b3b!important;font-size:5.8pt!important;text-align:left!important;padding:1.2mm!important;font-weight:800!important}
.ti-list-table td{height:6.3mm;padding:1mm!important;font-size:6.1pt!important;line-height:1.05;overflow-wrap:anywhere;vertical-align:middle}
.ti-transport{border:1px solid #17684f;border-radius:2mm;overflow:hidden;margin:2mm 0}
.ti-transport-title{background:#17684f;color:#fff;font-weight:800;font-size:7pt;padding:1.5mm 2mm}
.ti-transport .ti-check-table{margin:0!important}
.ti-transport .ti-grid-table td{background:#fff!important}
.ti-transport .ti-cell{min-height:7mm}
.ti-continuation{display:flex;justify-content:space-between;gap:2mm;align-items:center;margin:0 0 2.5mm;padding:2mm 2.5mm;border:1px solid #c2d5ca;border-left:1.5mm solid #17684f;background:#f1f7f3;font-size:7.2pt;line-height:1.2}
.ti-continuation>div{display:flex;flex-direction:column;gap:1mm;min-width:0}
.ti-continuation small{font-size:6.5pt;color:#52635b}
.ti-continuation span{white-space:nowrap;font-size:6.2pt}
.ti-declaration{margin:2.5mm 0 1.5mm;padding:2mm 2.5mm;border-left:1mm solid #17684f;background:#eaf4ef;font-size:7pt;line-height:1.15}
.ti-signature th{background:#e8f0eb!important;color:#244b3b!important;font-size:6pt!important;text-align:left!important;padding:1.2mm!important}
.ti-signature td{height:28mm!important;vertical-align:top!important;padding:1.5mm!important;font-size:7pt!important}
.ti-page-footer{display:flex;justify-content:space-between;border-top:1px solid #c7d2cc;margin-top:2mm;padding-top:1mm;font-size:5.7pt;color:#738078}
@media print{
 .ti-print-page--second{break-before:page!important;page-break-before:always!important;padding-top:8mm!important}
 .ti-print-page{break-inside:avoid;page-break-inside:avoid}
 .ti-two{display:grid!important;grid-template-columns:1fr 1fr!important}
 .ti-grid-table tr,.ti-list-table tr,.ti-check-table tr,.ti-signature tr{break-inside:avoid;page-break-inside:avoid}
}
</style>`};
async function ensureEngine(){
  if(global.ReportEngine?.printReport)return;
  await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=4');
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
  toast('Form bu cihaza kaydedildi.');
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
  _t:{O,SEC,FIELD,kanCode,splitClass,compact,sig,validate,formHtml,effVal,dispVal,emptyWork,dateTR,yearList,validRec}
};
global.StudentIntake=api;
})(window);
