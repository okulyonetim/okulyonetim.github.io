/* Projeler › Kudüs Ben’im Projesi: içerik (kılavuz), belgeler (kâğıt HTML’i + Word), ekran modülü davranışı, kâğıt / ekran stili, menü · rota · önbellek kayıtları */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const JSZip=require('../assets/vendor/jszip.min.js');
const {loadNav}=require('./helpers/app-nav');
const read=p=>fs.readFileSync(p,'utf8');
const J=x=>JSON.parse(JSON.stringify(x));

const SRC={veri:read('js/modules/kudus-benim-veri.js'),word:read('js/modules/word-belge.js'),belge:read('js/modules/kudus-benim-belge.js'),ui:read('js/modules/kudus-benim.js'),baglam:read('js/modules/sinif-baglam.js')};
const shell=read('js/core/shell-ui.js'),nav=read('js/core/app-nav.js'),sw=read('service-worker.js'),css=read('css/design-system-base.css');

/* ── yardımcı: Word XML’i düzgün biçimli mi (etiketler dengeli) ── */
function xmlDengeli(xml){
  const yigin=[];
  for(const m of xml.matchAll(/<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>/g)){
    if(m[4])continue;
    if(m[1]){assert.strictEqual(yigin.pop(),m[2],`Kapanış etiketi eşleşmiyor: ${m[2]}`)}else yigin.push(m[2]);
  }
  assert.strictEqual(yigin.length,0,'Açık kalan etiket var.');
  return true;
}
function yukle(...dosyalar){
  const w={console,JSZip};w.window=w;w.document={};vm.createContext(w);
  dosyalar.forEach(f=>vm.runInContext(SRC[f],w));
  return w;
}

/* ═══ içerik ═══ */
{
  const w=yukle('veri'),V=w.KudusBenimVeri;
  assert.strictEqual(V.YIL,'2026-2027');
  assert.deepStrictEqual(J(Object.keys(V.DUZEYLER)),['ilkokul','ortaokul','ikisi'],'Tek plan: sınıf düzeyi seçimi (ilkokul · ortaokul · ikisi).');
  assert.deepStrictEqual(J(V.DUZEYLER.ilkokul.aralik),'1–4. sınıf');assert.strictEqual(V.DUZEYLER.ortaokul.aralik,'5–8. sınıf');assert.strictEqual(V.DUZEYLER.ikisi.aralik,'1–8. sınıf');
  assert.deepStrictEqual(J(V.AYLAR),['Eylül','Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran']);
  assert.deepStrictEqual(J(Object.keys(V.SAYFALAR)),['nedir','ekip','plan','havuz','formlar','kagitlar'],'Altı sekme.');
  V.AYLAR.forEach(ay=>{
    const t=V.TAKVIM.aylar[ay];
    assert(t&&String(t.tema).trim()&&String(t.ornek).trim(),`${ay}: tema ve örnek.`);
    assert(t.oneri.length>=2,`${ay}: en az iki önerilen etkinlik (her ay en az iki etkinlik esastır).`);
    t.oneri.forEach(o=>{assert(String(o.ad).trim(),`${ay}: öneri adı.`);assert(o.havuz===null||V.etkinlik(o.havuz),`${ay}: öneri havuzdaki bir etkinliğe bağlı (ya da bağsız).`)});
  });
  assert.strictEqual(V.ETKINLIKLER.length,14,'14 etkinlik türü.');
  assert.strictEqual(new Set(V.ETKINLIKLER.map(e=>e.id)).size,14,'Etkinlik kimlikleri benzersiz.');
  V.ETKINLIKLER.forEach(e=>{
    ['id','ikon','ad','ay','tur','kilavuz','ilkokul','ortaokul','urun','dikkat'].forEach(a=>assert(String(e[a]||'').trim(),`${e.id}: ${a} boş olmamalı.`));
    assert(V.AYLAR.includes(e.ay),`${e.id}: önerilen ay geçerli.`);
    assert(Array.isArray(e.adimlar)&&e.adimlar.length>=3&&e.adimlar.every(a=>String(a).trim()),`${e.id}: en az üç adım.`);
  });
  assert.strictEqual(V.EK1.length,20,'EK-1: 20 alan.');assert.strictEqual(V.EK2.length,12,'EK-2: 12 alan.');
  assert.strictEqual(new Set(V.EK1.map(a=>a[1])).size,20);assert.strictEqual(new Set(V.EK2.map(a=>a[1])).size,12);
  assert.strictEqual(V.KAGITLAR.length,9,'9 çalışma kâğıdı.');
  assert.strictEqual(new Set(V.KAGITLAR.map(k=>k.id)).size,9);
  V.KAGITLAR.forEach(k=>{assert(k.ad&&k.kisa&&k.kimlik.length&&k.bloklar.length,`${k.id}: ad, açıklama, kimlik ve bloklar.`);k.bloklar.forEach(b=>assert(['yonerge','alan','kontrol','tablo','dolu'].includes(b.t),`${k.id}: bilinen blok türü (${b.t}).`))});
  const N=V.NEDIR;
  assert(N.giris&&N.kutu&&N.gerekce.length===4&&N.amac.ozel.length===12&&N.kapsam.length===4&&N.asamalar.length===10&&N.sonuclar.length===8&&N.yasal.length===10&&N.duzeyOnerisi.length===3,'Proje Nedir? bölümleri kılavuzla aynı sayıda.');
  assert.strictEqual(V.ULUSAL.length,8);
  assert(/Kudüs Ben’im/.test(V.KAYNAK)&&/2026-2027/.test(V.KAYNAK),'Kaynak belirtilir.');
  assert(/kılavuzda bulunmaz/.test(V.ONERI_NOTU),'Kılavuzda olmayan öneriler açıkça belirtilir.');
}

/* ═══ belgeler ═══ */
const ctx={okul:'Koruk Ortaokulu',ilIlce:'Elazığ / Merkez',ogretmen:'Ayşe KAYA',mudur:'Bilal BAYKAR',duzey:'ortaokul'};
const wB=yukle('veri','word','belge'),B=wB.KudusBenimBelge,V=wB.KudusBenimVeri,W=wB.WordBelge;
const durum=B.bosDurum();
durum.ekip=[{ad:'Ayşe KAYA',brans:'DKAB',gorev:'Proje Sorumlusu'},{ad:'Can ER',brans:'Türkçe',gorev:'Üye'}];
durum.ogrenciler=[{ad:'Ece Su',sinif:'7/A',gorev:'Sunucu'}];
durum.plan={Eylül:[{uid:'a1',ad:'Kudüs köşesi <b>açılışı</b>',havuz:'kose',tarih:'21.09.2026',iso:'2026-09-21',sorumlu:''},{uid:'a2',ad:'Değer atölyesi',havuz:'deger',tarih:'',iso:'',sorumlu:'Can ER'}],Ekim:[{uid:'a3',ad:'Araştırma sunumları',havuz:'arastirma',tarih:'',iso:'',sorumlu:''}]};
{
  assert.strictEqual(B.etkinlikSayisi(durum),3);
  assert.deepStrictEqual(J(B.eksikAylar(durum)),['Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran'],'Eksik aylar: ikiden az etkinlik.');
  assert.deepStrictEqual(J(B.eksikAylar(B.bosDurum())),J(V.AYLAR),'Boş planda tüm aylar eksik.');
  assert.strictEqual(B.etkinlikSorumlusu(ctx,durum,durum.plan.Eylül[0]),'Ayşe KAYA','Sorumlu boşsa proje sorumlusu (ekibin ilk üyesi).');
  assert.strictEqual(B.etkinlikSorumlusu(ctx,durum,durum.plan.Eylül[1]),'Can ER','Yazılı sorumlu korunur.');
  assert.strictEqual(B.etkinlikSorumlusu(ctx,B.bosDurum(),{sorumlu:''}),'Ayşe KAYA','Ekip yoksa öğretmen adı.');

  /* kâğıt HTML’i */
  const plan=B.html('plan',ctx,durum);
  assert(plan.includes('kbp-belge kbp-belge--yatay')&&plan.includes('YILLIK UYGULAMA PLANI')&&plan.includes('Ortaokul (5–8. sınıf)'),'Plan: A4 yatay, başlık ve sınıf düzeyi.');
  assert(plan.includes('Kudüs köşesi &lt;b&gt;açılışı&lt;/b&gt;')&&!plan.includes('<b>açılışı</b>'),'Etkinlik adı HTML’e çevrilmeden yazılır.');
  assert((plan.match(/<tr>/g)||[]).length>=11,'Plan: başlık + her ay en az bir satır.');
  assert(plan.includes('rowspan="2"')&&plan.includes('(örnek; planlanmadı)'),'Planlanan aylar birleşik satır, boş aylar örnekle gösterilir.');
  assert(plan.includes('21.09.2026'),'Tarih yazılır.');
  const ik=B.html('plan',{...ctx,duzey:'ikisi'},durum);assert(ik.includes('İlkokul ve ortaokul (1–8. sınıf)'),'Seçilen düzey belgeye yazılır.');
  [['plan'],['ekip'],['ogrenci'],['ek1','a1'],['ek2','a1'],['ek1','']].forEach(([t,uid])=>{
    const h=B.html(t,ctx,durum,uid);
    assert(h.includes('Koruk Ortaokulu'.toLocaleUpperCase('tr'))&&h.includes('2026-2027 EĞİTİM-ÖĞRETİM YILI'),`${t}: okul ve yıl başlığı.`);
    assert(/class="kbp-imza kbp-imza--mudur"><b>(OLUR|UYGUNDUR)<\/b><span>…… \/ …… \/ 20……<\/span><span>Bilal BAYKAR<\/span><b>Okul Müdürü<\/b>/.test(h),`${t}: müdür ad / imza alanı kendi bloğunda (ibare, tarih, ad, unvan).`);
    assert(h.includes('class="kbp-imza"><span>Ayşe KAYA</span><b>Proje Sorumlusu</b>'),`${t}: proje sorumlusu imzası solda.`);
  });
  const ekip=B.html('ekip',ctx,durum);assert(ekip.includes('Can ER')&&(ekip.match(/<td class="kbp-no">/g)||[]).length===8,'Ekip: en az 8 satır, yazılı üyeler dolu.');
  const bosEkip=B.html('ekip',ctx,B.bosDurum());assert((bosEkip.match(/<td class="kbp-no">/g)||[]).length===8,'Boş ekip: elle doldurmak için 8 boş satır.');
  const ogr=B.html('ogrenci',ctx,durum);assert(ogr.includes('Ece Su')&&(ogr.match(/<td class="kbp-no">/g)||[]).length===15,'Öğrenci grubu: en az 15 satır.');
  const e1=B.html('ek1',ctx,durum,'a1');
  assert(e1.includes('EK-1: OKUL ETKİNLİK PLANLAMA FORMU')&&e1.includes('Elazığ / Merkez')&&e1.includes('5–8. sınıflar')&&e1.includes('Gönüllü öğrenci grubu (1 öğrenci)'),'EK-1: plandan ve ayarlardan ön doldurulur.');
  assert(e1.includes('Ayşe KAYA')&&e1.includes('Can ER'),'EK-1: sorumlu ve görevli öğretmen ekipten.');
  const d2=J(durum);d2.ek1={a1:{katilimci:'60',okul:'Başka Okul'}};
  const e1b=B.html('ek1',ctx,d2,'a1');assert(e1b.includes('>60<')&&e1b.includes('Başka Okul'),'EK-1: elle yazılan alan ön doldurmanın üstüne biner.');
  const e2=B.html('ek2',ctx,durum,'a1');assert(e2.includes('EK-2: ETKİNLİK UYGULAMA VE İZLEME FORMU')&&e2.includes('21.09.2026'),'EK-2: etkinlik adı ve tarih ön doldurulur.');
  const bos1=B.html('ek1',ctx,durum,'');assert(bos1.includes('Elazığ / Merkez')&&!bos1.includes('Gönüllü öğrenci grubu'),'Boş EK-1: yalnız okul bilgisi dolu.');
  V.KAGITLAR.forEach(k=>{const h=B.kagitHtml(ctx,k);assert(h.includes(k.ad.toLocaleUpperCase('tr'))&&h.includes('kbp-kimlik'),`${k.id}: kâğıt başlığı ve kimlik satırı.`)});
  assert(!B.kagitHtml(ctx,V.KAGITLAR.find(k=>k.id==='kaynak')).includes('undefined'),'Kontrol listesi kâğıdı bozuk değil.');

  /* her kbp-* sınıfı kâğıt stilinde tanımlı ve .ka-report altında (Android yazdırma yalnız bu kuralları satır içine alır) */
  const bas=css.indexOf('/* ===== A4 — Kudüs Ben’im Projesi belgeleri (.kbp-*)'),son=css.indexOf('/* ===== A4 — Yazılı Sınav Takvimi (.kwr-*)');
  assert(bas>0&&son>bas,'kbp-* stil bloğu var.');
  const kagit=css.slice(bas,son);
  const kullanilan=new Set([...SRC.belge.matchAll(/kbp-[a-z0-9]+(?:--[a-z0-9]+)?/g)].map(m=>m[0]).filter(c=>!c.endsWith('-')));
  kullanilan.forEach(c=>{if(c.startsWith('kbp-belge--')||c==='kbp-tablo--plan'||c==='kbp-tablo--form'||c==='kbp-tablo--kagit'||c==='kbp-tablo--genis')return;assert(kagit.includes(`.${c}`),`${c} kâğıt stilinde tanımlı olmalı.`)});
  ['kbp-belge--yatay','kbp-tablo--plan','kbp-tablo--form','kbp-tablo--genis','kbp-tablo--kagit'].forEach(c=>assert(kagit.includes(`.${c}`),`${c} tanımlı.`));
  const kuralSatirlari=kagit.split('\n').filter(l=>/^[.@]/.test(l)&&!l.startsWith('@media'));
  kuralSatirlari.forEach(l=>assert(l.startsWith('.ka-report '),`Kâğıt kuralı .ka-report ile başlamalı: ${l.slice(0,60)}`));
  assert(/\.ka-report \.kbp-imza--mudur\{margin-inline-start:auto\}/.test(kagit)&&/\.kbp-imzalar\{display:flex;justify-content:space-between/.test(kagit),'Müdür bloğu sağda, imzalar yan yana.');
  assert(/\.kbp-imza\{[^}]*align-items:center[^}]*text-align:center/.test(kagit),'İmza blokları kendi içinde ortalı.');
  assert(/\.kbp-tablo thead\{display:table-header-group\}/.test(kagit),'Tablo başlığı her sayfada tekrarlanır.');
  assert(!/\d(?:\.\d+)?px/.test(kagit)&&!/#[0-9a-fA-F]{3,8}\b/.test(kagit),'Kâğıt stili sabit px / renk içermemeli.');
  assert(!/yellow|#ff0|rgb\(255,\s*2[0-9][0-9],\s*0\)/i.test(kagit),'Sarı dolgu yok (sarı üstüne beyaz yazı kuralı).');
}

/* ═══ Word ═══ */
(async()=>{
  for(const [t,uid] of [['plan'],['ekip'],['ogrenci'],['ek1','a1'],['ek2','a1'],['ek1','']]){
    const x=B.TURLER[t].word(ctx,durum,uid),belge=W.belgeXml(x.govde,{yatay:x.yatay});
    xmlDengeli(belge);
    assert.strictEqual(x.yatay,t==='plan',`${t}: yalnız plan yatay.`);
    assert(belge.includes('w:top="1134"')&&belge.includes('w:bottom="1134"'),`${t}: her sayfada üst ve alt boşluk (20 mm).`);
    assert(belge.includes('Koruk Ortaokulu'.toLocaleUpperCase('tr'))&&belge.includes('Bilal BAYKAR')&&belge.includes('Okul Müdürü')&&belge.includes('Ayşe KAYA'),`${t}: okul, müdür ve öğretmen adı.`);
    assert(!belge.includes('FFFF00')&&!/<w:color w:val="FFFFFF"/.test(belge),`${t}: sarı dolgu ve beyaz yazı yok.`);
    assert(!/undefined|\[object/.test(belge),`${t}: bozuk değer yok.`);
    assert(/<w:jc w:val="center"\/>/.test(belge),`${t}: ortalı bloklar var.`);
  }
  const planX=B.TURLER.plan.word(ctx,durum).govde;
  assert(planX.includes('<w:tblHeader/>')&&planX.includes('<w:vMerge w:val="restart"/>')&&planX.includes('Kudüs köşesi &lt;b&gt;açılışı&lt;/b&gt;'),'Plan Word: tekrarlanan başlık, birleşik ay hücreleri, kaçışlı metin.');
  assert(B.TURLER.plan.word(ctx,durum).govde.indexOf('Ayşe KAYA')>planX.indexOf('<w:tbl>'),'İmza tablodan sonra.');
  const blob=await W.paketle(B.TURLER.ekip.word(ctx,durum).govde,{yatay:false});
  const z=await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  assert.deepStrictEqual(J(Object.keys(z.files).filter(f=>!f.endsWith('/')).sort()),['[Content_Types].xml','_rels/.rels','word/_rels/document.xml.rels','word/document.xml','word/styles.xml'].sort(),'Word paketi: beş dosya.');
  for(const f of Object.keys(z.files).filter(f=>f.endsWith('.xml')||f.endsWith('.rels')))xmlDengeli(await z.file(f).async('string'));
  assert(W.DOCX_TURU.endsWith('wordprocessingml.document'));
  assert.strictEqual(B.dosyaAdi('plan',ctx,durum),'Kudus_Benim_2026_2027_Yillik_Uygulama_Plani.docx');
  assert(/^Kudus_Benim_2026_2027_EK1_[0-9A-Za-z_]+\.docx$/.test(B.dosyaAdi('ek1',ctx,durum,'a1')),'Dosya adı yalnız ASCII.');
  assert.strictEqual(B.dosyaAdi('ek2',ctx,durum,''),'Kudus_Benim_2026_2027_EK2_Bos_Form.docx');
  console.log('kudus-benim: Word OK');
  ekranTesti();
})().catch(e=>{console.error(e);process.exit(1)});

/* ═══ ekran modülü: sahte DOM ile davranış ═══ */
function ekranTesti(){
  const veri={
    okulBilgileri:[{id:'ayarlar',okulAdi:'Koruk İlk - Ortaokulu',ilkokulAdi:'Koruk İlkokulu',ortaokulAdi:'Koruk Ortaokulu',il:'Elazığ',ilce:'Merkez',mudurId:'m1'}],
    ogretmenler:[{id:'t1',ad:'ayşe',soyad:'kaya'},{id:'m1',ad:'Bilal',soyad:'Baykar'}],
    siniflar:[{id:'c1',ad:'5-A'},{id:'c2',ad:'2-B'}],
    veliler:[{id:'v1',ogrenciAdi:'Ali Yılmaz',sinifId:'c1',ogrenciNo:'3'},{id:'v2',ogrenciAdi:'Zeynep Demir',sinifId:'c1',ogrenciNo:'4'}]
  };
  const kayit={},uzak=[];let dinleyici=null;
  const dinle={};const kap={addEventListener:(t,f)=>{dinle[t]=f},querySelectorAll:()=>[],contains:()=>false};
  const kok={innerHTML:'',contains:()=>false,querySelector:s=>s==='[data-kb-page]'&&kok.innerHTML?kap:null};
  const toasts=[];
  const w={console,JSON,Math,Date,Set,Object,Array,String,Number,Promise,setTimeout,clearTimeout,JSZip};
  w.window=w;w.scrollY=0;w.scrollTo=()=>{};w.addEventListener=()=>{};w.removeEventListener=()=>{};
  w.toast=m=>toasts.push(m);
  w.document={getElementById:id=>id==='v2ModuleRoot'?kok:null,querySelector:s=>s==='[data-kb-page]'&&kok.innerHTML?kap:null,querySelectorAll:()=>[],activeElement:null};
  w.AppStore={data:t=>veri[t]||[],get:k=>k==='session.user'?{admin:false,bagliOgretmenId:'t1'}:null,subscribe:()=>()=>{}};
  w.KaPrefs={get:(k,d)=>k in kayit?kayit[k]:d,set:(k,v)=>{kayit[k]=v},remoteSet:o=>uzak.push(o),remoteListen:f=>{dinleyici=f;return()=>{dinleyici=null}}};
  w.ReportEngine={documentHtml:()=>'',printReport:()=>{}};
  vm.createContext(w);
  ['veri','word','belge','baglam','ui'].forEach(f=>vm.runInContext(SRC[f],w));
  const M=w.KudusBenimModule,ANAHTAR='kudusBenim_2026_2027';
  const dugme=(oz,ek={})=>({dataset:oz,disabled:false,...ek});
  const tikla=oz=>dinle.click({target:{closest:()=>dugme(oz)}});
  const girdi=(oz,value)=>dinle.input({target:{dataset:oz,value}});
  const saklanan=()=>JSON.parse(kayit[ANAHTAR]||'null');

  /* ilk açılış */
  assert(M.open('nedir'),'Sayfa açılır.');
  let h=kok.innerHTML;
  assert(h.includes('data-kb-page="nedir"')&&h.includes('Kudüs Ben’im Projesi · 2026-2027'),'Başlık.');
  assert.deepStrictEqual(J([...h.matchAll(/data-kb-git="([a-z]+)"/g)].map(m=>m[1])),['nedir','ekip','plan','havuz','formlar','kagitlar'],'Altı sekme düğmesi.');
  assert.deepStrictEqual(J([...h.matchAll(/data-kb-duzey="([a-z]+)" aria-pressed="(true|false)"/g)].map(m=>`${m[1]}:${m[2]}`)),['ilkokul:false','ortaokul:false','ikisi:true'],'Düzey, öğretmenin sınıflarından (1–4 ve 5–8) “ikisi” olarak tahmin edilir.');
  assert(h.includes('Yasal dayanak')&&h.includes('Sınıf düzeyine göre öneriler'),'Proje Nedir? bölümleri.');
  assert.strictEqual((h.match(/kbm-duzey-oneri__kutu--secili/g)||[]).length,3,'Düzey “ikisi”: üç öneri kutusu da seçili.');

  /* düzey seçimi kaydedilir; okul adı kademeye göre gelir */
  tikla({kbDuzey:'ilkokul'});
  assert.strictEqual(M.duzey(),'ilkokul');assert.strictEqual(M.ctx().okul,'Koruk İlkokulu','İlkokul düzeyi: ilkokul adı.');
  assert.strictEqual(saklanan().duzey,'ilkokul');assert(uzak.length===0,'Hesaba yazma beklemede (700 ms).');
  tikla({kbDuzey:'ortaokul'});assert.strictEqual(M.ctx().okul,'Koruk Ortaokulu');
  tikla({kbDuzey:'ikisi'});assert.strictEqual(M.ctx().okul,'Koruk İlk - Ortaokulu','Ortak düzey: genel okul adı.');
  assert.deepStrictEqual(J({il:M.ctx().ilIlce,ogr:M.ctx().ogretmen,mudur:M.ctx().mudur}),{il:'Elazığ / Merkez',ogr:'Ayşe KAYA',mudur:'Bilal BAYKAR'},'Bilgiler uygulama kayıtlarından.');
  tikla({kbDuzey:'ortaokul'});

  /* ekip ve öğrenci grubu */
  tikla({kbGit:'ekip'});h=kok.innerHTML;
  assert(h.includes('data-kb-page="ekip"')&&h.includes('data-kb-ben')&&h.includes('Beni proje sorumlusu olarak ekle'),'Ekip sekmesi.');
  tikla({kbBen:''});assert.deepStrictEqual(J(saklanan().ekip),[{ad:'Ayşe KAYA',brans:'',gorev:'Proje Sorumlusu'}],'Öğretmen proje sorumlusu olarak eklenir.');
  assert(!kok.innerHTML.includes('data-kb-ben'),'Eklenince düğme kalkar.');
  tikla({kbEkle:'ekip'});girdi({kbListe:'ekip',i:'1',k:'ad'},'Can ER');girdi({kbListe:'ekip',i:'1',k:'gorev'},'Üye');
  assert.deepStrictEqual(J(saklanan().ekip[1]),{ad:'Can ER',brans:'',gorev:'Üye'},'Ekip satırı yazılınca saklanır.');
  tikla({kbSil:'ekip',i:'1'});assert.strictEqual(saklanan().ekip.length,1,'Satır silinir.');
  girdi({kb:'mudur'},'Yeni MÜDÜR');assert.strictEqual(M.ctx().mudur,'Yeni MÜDÜR','Elle yazılan müdür adı belgeye gider.');
  assert.strictEqual(saklanan().bilgi.mudur,'Yeni MÜDÜR','Elle yazılan bilgi saklanır.');assert(!('okul' in saklanan().bilgi),'Elle yazılmayan bilgi saklanmaz (uygulamadan gelmeye devam eder).');

  /* plan */
  tikla({kbGit:'plan'});
  assert(kok.innerHTML.includes('Eksik aylar:')&&kok.innerHTML.includes('Eylül, Ekim, Kasım'),'Boş planda eksik aylar uyarısı.');
  assert.strictEqual((kok.innerHTML.match(/class="ka-card kbm-kart kbm-ay"/g)||[]).length,10,'On ay kartı.');
  tikla({kbOneriTum:''});
  let p=saklanan().plan;
  assert.strictEqual(Object.keys(p).length,10,'Boş aylar önerilerle doldurulur.');V.AYLAR.forEach(ay=>assert(p[ay].length>=2,`${ay}: iki etkinlik.`));
  assert(kok.innerHTML.includes('Her ayda en az iki etkinlik planlandı.'),'Uyarı kalkar.');
  const uid0=p.Eylül[0].uid;
  girdi({kbEtk:'ad',uid:uid0},'Açılış');dinle.input({target:{dataset:{kbEtk:'iso',uid:uid0},value:'2026-09-21'}});
  assert.deepStrictEqual(J([saklanan().plan.Eylül[0].ad,saklanan().plan.Eylül[0].tarih,saklanan().plan.Eylül[0].iso]),['Açılış','21.09.2026','2026-09-21'],'Ad ve tarih (gg.aa.yyyy) saklanır.');
  tikla({kbOneriTum:''});assert.strictEqual(Object.values(saklanan().plan).reduce((a,l)=>a+l.length,0),20,'İkinci kez doldurma var olanı çoğaltmaz.');
  tikla({kbEtkSil:p.Ekim[1].uid});assert.strictEqual(saklanan().plan.Ekim.length,1,'Etkinlik silinir.');
  tikla({kbBos:'Ekim'});assert.strictEqual(saklanan().plan.Ekim.length,2,'Boş satır eklenir.');
  /* form alanları plandan gelir, elle yazılan saklanır, silinen etkinliğin formu düşer */
  tikla({kbGit:'formlar'});assert(kok.innerHTML.includes('Eylül · Açılış')&&kok.innerHTML.includes('21.09.2026'),'Formlar sekmesinde planlanan etkinlik.');
  assert(!kok.innerHTML.includes('Ekim · </b>'),'Adı boş etkinlik formlarda listelenmez.');
  girdi({kbEk:'ek1',uid:uid0,k:'katilimci'},'60');girdi({kbEk:'ek1',uid:uid0,k:'bilinmeyen'},'x');
  assert.deepStrictEqual(J(saklanan().ek1[uid0]),{katilimci:'60'},'EK-1: yalnız bilinen alan saklanır.');
  tikla({kbEkSifirla:'ek1',uid:uid0});assert(!(uid0 in saklanan().ek1),'Plandan yeniden doldur: elle yazılanlar silinir.');
  girdi({kbEk:'ek2',uid:uid0,k:'guclukler'},'Yok');tikla({kbEtkSil:uid0});
  assert(!(uid0 in saklanan().ek2),'Etkinlik silinince formları da silinir.');
  tikla({kbGit:'plan'});
  /* havuzdan ekleme */
  tikla({kbGit:'havuz'});assert.strictEqual((kok.innerHTML.match(/<details class="kbm-havuz">/g)||[]).length,14,'14 havuz etkinliği.');
  const once=Object.values(saklanan().plan).reduce((a,l)=>a+l.length,0);
  tikla({kbHavuzEkle:'konferans'});
  assert.strictEqual(saklanan().plan.Şubat.length,3,'Havuzdan etkinlik önerilen aya eklenir.');assert.strictEqual(saklanan().plan.Şubat[2].havuz,'konferans');
  assert.strictEqual(Object.values(saklanan().plan).reduce((a,l)=>a+l.length,0),once+1);
  /* seçili düzeye göre öneri metinleri */
  assert(kok.innerHTML.includes('Ortaokul (5–8. sınıf):')&&!kok.innerHTML.includes('İlkokul (1–4. sınıf):'),'Ortaokul düzeyi: yalnız ortaokul önerisi.');
  tikla({kbDuzey:'ilkokul'});assert(kok.innerHTML.includes('İlkokul (1–4. sınıf):')&&!kok.innerHTML.includes('Ortaokul (5–8. sınıf):'),'İlkokul düzeyi: yalnız ilkokul önerisi.');
  tikla({kbDuzey:'ikisi'});assert(kok.innerHTML.includes('İlkokul (1–4. sınıf):')&&kok.innerHTML.includes('Ortaokul (5–8. sınıf):'),'Ortak düzey: ikisi de.');
  tikla({kbDuzey:'ortaokul'});
  /* çalışma kâğıtları */
  tikla({kbGit:'kagitlar'});assert.strictEqual((kok.innerHTML.match(/data-kb-kagit-yazdir=/g)||[]).length,9,'9 kâğıt.');

  /* yazdırma: ReportEngine’e dikey / yatay ve kenar boşluğuyla gider */
  const yakalanan=[];w.ReportEngine.printReport=(t,h2,o)=>yakalanan.push({t,h2,o});
  M.yazdir('plan');M.yazdir('ekip');M.kagitYazdir('bmo');
  assert.deepStrictEqual(J(yakalanan.map(y=>[y.t,y.o.yon,y.o.kenarBosluk,y.o.akis,y.o.ozellestirilebilir])),[['Yıllık Uygulama Planı','yatay',15,true,false],['Proje Ekibi Görevlendirme','dikey',15,true,false],['Bildiklerim · Merak Ettiklerim · Öğrendiklerim','dikey',15,true,false]],'Yazdırma: yön, her sayfada 15 mm üst / alt boşluk, özelleştirme penceresi yok.');
  assert(yakalanan.every(y=>y.h2.includes('kbp-belge')),'Kâğıt HTML’i gider.');
  assert(/^Kudus_Benim_2026_2027_Yillik_Uygulama_Plani$/.test(yakalanan[0].o.fileName),'Dosya adı.');
  assert.strictEqual(M.yazdir('bilinmeyen'),false);

  /* kalıcılık: yeniden açınca durum gelir */
  const j=kayit[ANAHTAR];M.reset();M.open('plan');
  assert.strictEqual(saklanan().plan.Şubat.length,3,'Durum yeniden açılışta korunur.');
  assert(kok.innerHTML.includes('Açılış')===false,'Silinen etkinlik geri gelmez.');
  assert.strictEqual(M.duzey(),'ortaokul','Seçilen düzey korunur.');assert.strictEqual(M.ctx().mudur,'Yeni MÜDÜR');

  /* başka cihazdan gelen daha yeni durum yerine geçer; eski olan geçmez; bozuk veri temizlenir */
  const yeni=JSON.parse(j);yeni.t=Date.now()+5000;yeni.ekip=[{ad:'Uzak Kişi',brans:'',gorev:'Sorumlu'}];yeni.duzey='ilkokul';
  dinleyici({[ANAHTAR]:JSON.stringify(yeni)});
  assert.strictEqual(M.duzey(),'ilkokul','Daha yeni uzak durum uygulanır.');assert.strictEqual(saklanan().ekip[0].ad,'Uzak Kişi');
  const eski=JSON.parse(j);eski.t=1;eski.ekip=[{ad:'Eski',brans:'',gorev:''}];
  dinleyici({[ANAHTAR]:JSON.stringify(eski)});assert.strictEqual(saklanan().ekip[0].ad,'Uzak Kişi','Daha eski uzak durum yok sayılır.');
  const kotu={t:Date.now()+9000,duzey:'yok',ekip:'x',ogrenciler:[{ad:'A'.repeat(500),sinif:1,gorev:null}],plan:{'__proto__':[{ad:'z'}],Eylül:[{uid:'../x"<',ad:'B'.repeat(500),havuz:'olmayan',tarih:5,iso:'bozuk',sorumlu:{}}],Ocak:'x'},ek1:{'../x"<':{okul:'y'}},ek2:{__proto__:{ad:'p'}}};
  dinleyici({[ANAHTAR]:JSON.stringify(kotu)});
  const t=saklanan();
  assert.strictEqual(t.duzey,'','Bilinmeyen düzey atılır.');assert.deepStrictEqual(J(t.ekip),[],'Dizi olmayan ekip boşalır.');
  assert.strictEqual(t.ogrenciler[0].ad.length,80,'Uzun metin sınırlanır.');assert.strictEqual(t.ogrenciler[0].sinif,'1');
  assert.deepStrictEqual(Object.keys(t.plan),['Eylül'],'Yalnız geçerli ayların planı.');
  assert(t.plan.Eylül[0].ad.length===160&&t.plan.Eylül[0].havuz===''&&t.plan.Eylül[0].iso===''&&/^[0-9A-Za-z_-]+$/.test(t.plan.Eylül[0].uid),'Etkinlik alanları temizlenir; kimlik güvenli.');
  assert.deepStrictEqual(J(t.ek1),{},'Planda olmayan etkinliğin formu düşer.');
  assert.strictEqual(Object.getPrototypeOf(JSON.parse(kayit[ANAHTAR]).plan)===Object.prototype,true,'Prototip kirlenmez.');

  /* hesaba yazma ertelenir ve tek anahtarla gider */
  setTimeout(()=>{
    assert(uzak.length>=1&&Object.keys(uzak[uzak.length-1]).join()===ANAHTAR,'Hesaba tek anahtarla yazılır.');
    statikTesti();
    console.log('kudus-benim: OK');
  },900);
}

/* ═══ kaynak kodu, stil ve kayıtlar ═══ */
function statikTesti(){
  /* ekranda kullanılan her data-kb-* düğmesinin tıklama eylemi var */
  const duğmeler=new Set([...SRC.ui.matchAll(/<button[^>]*>/g)].flatMap(m=>[...m[0].matchAll(/data-(kb-[a-z-]+)(?==|\s|>)/g)].map(x=>x[1])).filter(k=>!['kb-uid'].includes(k)).map(k=>k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())).filter(k=>k!=='kbI'));
  const eylemler=new Set([...SRC.ui.slice(SRC.ui.indexOf('const TIKLA={'),SRC.ui.indexOf('function tikla(e)')).matchAll(/^ (kb[A-Za-z]+):/gm)].map(m=>m[1]));
  duğmeler.forEach(d=>assert(eylemler.has(d),`${d}: tıklama eylemi tanımlı olmalı.`));
  assert(duğmeler.size>=15,'Düğmeler bulundu.');
  assert(!/<style|\.style\.cssText|innerHTML\s*=\s*[^;]*\+\s*/.test(SRC.ui.replace(/frame\.style|sahne\.style|dugme\.style/g,'')),'Modül içinde <style> yok.');
  assert(!/\bconfirm\(|\balert\(|\bprompt\(/.test(SRC.ui),'Tarayıcı iletişim kutusu yok.');

  /* ekran stili: yalnız belirteç */
  const bas=css.indexOf('/* ===== PROJELER › KUDÜS BEN’İM PROJESİ (kbm-*)'),son=css.indexOf('/* ===== A4 — Kudüs Ben’im Projesi belgeleri (.kbp-*)');
  assert(bas>0&&son>bas,'kbm-* stil bloğu var.');
  const kbm=css.slice(bas,son),pxSiz=kbm.replace(/@media\([^)]*\)\{[\s\S]*?\n\}/g,'');
  assert(!/\d(?:\.\d+)?px/.test(pxSiz)&&!/#[0-9a-fA-F]{3,8}\b/.test(kbm),'Ekran stili sabit px / renk içermemeli (px yalnız @media).');
  kbm.split('\n').filter(l=>/^html|^ html/.test(l)).forEach(l=>assert(/html\[data-theme\] #v2ModuleRoot \.kbm-/.test(l),`Ekran kuralı sayfa köküne bağlı: ${l.slice(0,70)}`));
  const kullanilan=new Set([...SRC.ui.matchAll(/kbm-[a-z0-9]+(?:__[a-z0-9]+)?(?:--[a-z0-9]+)?/g)].map(m=>m[0]));
  kullanilan.forEach(c=>assert(kbm.includes(`.${c}`)||['kbm-page'].includes(c)||c==='kbm-alan--uzun'&&kbm.includes('.kbm-alan--uzun'),`${c} ekran stilinde tanımlı olmalı.`));
  assert(!/color-mix\(in srgb,var\(--ka-warning\)[^)]*\)[^;]*;color:var\(--ka-text-inverse\)/.test(kbm)&&!/warning[^;]*;color:#fff/i.test(kbm),'Sarı zemin üstüne beyaz yazı yok.');

  /* menü ve rota */
  const {N}=loadNav();
  const t=N.catalog().find(x=>x.id==='kudus-benim');
  assert(t&&t.kat==='projeler'&&t.route==='kudus-benim'&&t.page==='nedir'&&t.label==='Kudüs Ben’im Projesi','Projeler menüsünde Kudüs Ben’im Projesi.');
  assert(!t.y,'Öğretmene de açık.');
  ['ogretmen','idareci'].forEach(r=>assert(N.defaultLayout(r).menus.find(m=>m.id==='projeler').ids.includes('kudus-benim'),`${r}: varsayılan düzende var.`));
  ['kudüs','kudus','mescid-i aksa','ek-1'].forEach(q=>assert(N.search(q).some(x=>x.id==='kudus-benim'),`Arama: ${q}`));
  assert(nav.includes("GLYPHS['kudus-benim']"),'Simge.');
  assert(/if\(name==='kudus-benim'\)\{[\s\S]*?KudusBenimModule\.open\(page\)/.test(shell),'Rota modülü sayfa anahtarıyla açar.');
  const pinler=['word-belge.js?v=1','kudus-benim-veri.js?v=1','kudus-benim-belge.js?v=1','kudus-benim.js?v=1','report-engine.js?v=10','sinif-baglam.js?v=2'];
  pinler.forEach(p=>assert(shell.includes(p),`Rota ${p} yükler.`));
  pinler.slice(0,4).forEach(p=>assert(sw.includes(`./js/modules/${p}`),`Önbelleğe alınır: ${p}`));
  ['word-belge','kudus-benim-veri','kudus-benim-belge','kudus-benim'].forEach(f=>assert(fs.existsSync(`js/modules/${f}.js`),`${f}.js var.`));
  assert(!/<script[^>]*kudus-benim/.test(read('index.html')),'Modüller açılışta değil, rotada tembel yüklenir.');
  /* stil sürüm zinciri aynı */
  const v1=/design-system\.css\?v=(\d+)/.exec(read('index.html'))[1];
  assert(read('beta.html').includes(`design-system.css?v=${v1}`)&&sw.includes(`design-system.css?v=${v1}`),'Stil sürümü index · beta · service-worker’da aynı.');
}
