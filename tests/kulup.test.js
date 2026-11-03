const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const JSZip=require('../assets/vendor/jszip.min.js');
const zip=require('./helpers/zip');

/* Sosyal Kulüpler: hazır kulüp kataloğu (data/kulup), mantık (kulup-core), Word çıktısı (kulup-dosya + assets/kulup/sablon) ve kayıt noktaları. */
const J=x=>JSON.parse(JSON.stringify(x));
const dosyaAl=async u=>{const p=String(u).replace(/^\.\//,'');if(!fs.existsSync(p))return{ok:false,status:404};const b=fs.readFileSync(p);return{ok:true,status:200,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
const win={console,JSZip,Blob,URL,setTimeout,clearTimeout,fetch:dosyaAl};win.window=win;win.globalThis=win;vm.createContext(win);
['ogretmen-dosyasi-core','kulup-core','kulup-dosya'].forEach(f=>vm.runInContext(fs.readFileSync(`js/modules/${f}.js`,'utf8'),win,{filename:f}));
const K=win.KulupCore,D=win.KulupDosya,O=win.OgretmenDosyasiCore;

(async()=>{
/* ── katalog: kulüp başına data/kulup/{id}.json (özet bilgi, dönem/yıl sonu metinleri) + assets/kulup/{id}/*.docx (kulübün kendi evrakları) ── */
const katalog=JSON.parse(fs.readFileSync('data/kulup/katalog.json','utf8'));
const paketler=Object.fromEntries(katalog.kulupler.map(k=>[k.id,JSON.parse(fs.readFileSync(`data/kulup/${k.id}.json`,'utf8'))]));
assert.deepStrictEqual(J(katalog.kulupler.map(k=>k.id)),['beyazay','kizilay','siberay','yasam-becerileri','yesilay']);
for(const k of katalog.kulupler){
 const p=paketler[k.id];
 assert.strictEqual(p.id,k.id);assert.deepStrictEqual(J(k.sayilar),{aylik:10},`${k.id}: katalog sayıları`);assert(p.tema.ad&&p.yil===k.yil&&k.anahtar.length,`${k.id}: tema, yıl, eşleşme anahtarı`);
 assert.deepStrictEqual(J(p.aylar),J(K.AYLAR),`${k.id}: aylık raporlar Eylül–Haziran sırasıyla.`);
 assert.strictEqual(p.yilSonu.aylar.length,10);assert(p.yilSonu.aylar.every(a=>a.ay&&a.calisma),`${k.id}: yıl sonunda her ayın özeti dolu.`);
 if(k.id==='kizilay')assert(!p.yilSonu.b&&!p.yilSonu.c&&!p.yilSonu.d,'Kızılay dosyasında değerlendirme yazısı yok (Word’de noktalı satır kalır).');
 else assert(p.yilSonu.b&&p.yilSonu.c&&p.yilSonu.d,`${k.id}: hazır değerlendirme metinleri gelir.`);
 assert.deepStrictEqual(fs.readdirSync(`assets/kulup/${k.id}`).sort(),k.id==='yesilay'?['aylik-rapor.docx','toplum-hizmeti.docx','tuzuk.docx','yillik-plan-ortaokul.docx','yillik-plan.docx']:['aylik-rapor.docx','toplum-hizmeti.docx','tuzuk.docx','yillik-plan.docx'],`${k.id}: kulübün evrakları (dört evrak; kademeye özel plan ek dosya)`);
 assert.deepStrictEqual(J(p.planlar||null),k.id==='yesilay'?{ortaokul:'yillik-plan-ortaokul.docx'}:null,`${k.id}: kademeye özel plan yalnız tanımlıysa kayıtlıdır`);
}
const paket=paketler.siberay;
assert.strictEqual(paket.tema.kod,'B');assert.strictEqual(paket.tema.ad,'Bilim');assert.strictEqual(paketler.beyazay.tema.ad,'Doğa-Çevre-Toplum');
assert.strictEqual(paket.donemSonu.aylar.length,5);assert(paket.donemSonu.b);assert.strictEqual(paketler.beyazay.donemSonu,null,'Dönem sonu dosyası gelmeyen kulüpte dönem raporu yıl sonu metinlerinden hazırlanır.');assert.strictEqual(paketler.kizilay.tema.ad,'Doğa-Çevre-Toplum');
/* kulübün evrakları kişisel bilgi taşımaz: ad, okul ve müdür {{ALAN}} olmalı (dosyayı indiren öğretmenin bilgileri başka kulüplere sızmaz) */
for(const k of katalog.kulupler){
 for(const f of fs.readdirSync(`assets/kulup/${k.id}`)){
  const d=zip.oku(fs.readFileSync(`assets/kulup/${k.id}/${f}`)),x=Object.keys(d).filter(n=>/^word\/(document|header\d*|footer\d*)\.xml$/.test(n)).map(n=>d[n].toString('utf8')).join('');
  const duz=[...x.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map(m=>m[1]).join('').toLocaleLowerCase('tr');
  ['karagöz','baykar','koruk'].forEach(a=>assert(!duz.includes(a),`${k.id}/${f}: kişisel bilgi (${a}) şablonda kalmamalı`));
  assert(/\{\{[A-Z_]+\}\}/.test(x),`${k.id}/${f}: doldurulacak alan olmalı`);
 }
 assert(!/karagöz|baykar|koruk/i.test(fs.readFileSync(`data/kulup/${k.id}.json`,'utf8')),`${k.id}.json kişisel bilgi taşımaz`);
}

/* ── eşleşme ── */
assert.strictEqual(K.katalogBul({id:'a',ad:'Siberay'},katalog)?.id,'siberay');
assert.strictEqual(K.katalogBul({id:'a',ad:'Siberay Kulübü'},katalog)?.id,'siberay');
assert.strictEqual(K.katalogBul({id:'a',kulupAdi:'SİBERAY KULÜBÜ (TYMM)'},katalog)?.id,'siberay');
assert.strictEqual(K.katalogBul({id:'a',ad:'Beyazay Kulübü'},katalog)?.id,'beyazay');assert.strictEqual(K.katalogBul({id:'a',ad:'Beyaz Ay'},katalog)?.id,'beyazay');
assert.strictEqual(K.katalogBul({id:'a',ad:'Kızılay Kulübü'},katalog)?.id,'kizilay');assert.strictEqual(K.katalogBul({id:'a',ad:'KIZILAY'},katalog)?.id,'kizilay');
assert.strictEqual(K.katalogBul({id:'a',ad:'Yeşilay Kulübü'},katalog)?.id,'yesilay');assert.strictEqual(K.katalogBul({id:'a',ad:'YEŞİLAY'},katalog)?.id,'yesilay');assert.strictEqual(K.katalogBul({id:'a',ad:'Yeşil Ay Kulübü'},katalog)?.id,'yesilay');
assert.strictEqual(K.katalogBul({id:'a',ad:'Yaşam Becerileri Kulübü'},katalog)?.id,'yasam-becerileri');assert.strictEqual(K.katalogBul({id:'a',ad:'YAŞAM BECERİLERİ'},katalog)?.id,'yasam-becerileri');
assert.strictEqual(K.katalogBul({id:'a',ad:'Satranç Kulübü'},katalog),null);
/* yıllık plan kademeye göre: yalnız ortaokul sınıflarındaki kulüp ortaokul planını alır */
assert.strictEqual(K.kulupKademesi([5,6,8]),'ortaokul');assert.strictEqual(K.kulupKademesi([1,4]),'ilkokul');assert.strictEqual(K.kulupKademesi([4,5]),'','Karışık kademe → genel plan');assert.strictEqual(K.kulupKademesi([]),'');assert.strictEqual(K.kulupKademesi([0,0]),'','Düzeyi bilinmeyen sınıf kademe sayılmaz');
assert.deepStrictEqual(J(K.planSecimi(paketler.yesilay,'ortaokul')),{dosya:'yillik-plan-ortaokul.docx',kademe:'ortaokul'});
assert.deepStrictEqual(J(K.planSecimi(paketler.yesilay,'ilkokul')),{dosya:'yillik-plan.docx',kademe:''});assert.deepStrictEqual(J(K.planSecimi(paketler.yesilay,'')),{dosya:'yillik-plan.docx',kademe:''});
assert.deepStrictEqual(J(K.planSecimi(paketler.beyazay,'ortaokul')),{dosya:'yillik-plan.docx',kademe:''},'Kademeye özel planı olmayan kulüp her zaman genel planı alır.');
assert.strictEqual(K.katalogBul({id:'a',ad:'Siberayan Kültür'},katalog)?.id,undefined,'Yalnız tam sözcük eşleşir.');
assert.strictEqual(K.katalogBul({id:'k9',ad:'Satranç'},katalog,{k9:'siberay'})?.id,'siberay','Elle eşleme önceliklidir.');
assert.strictEqual(K.kulupAdi('Siberay'),'Siberay Kulübü');assert.strictEqual(K.kulupAdi('Siberay Kulübü'),'Siberay Kulübü');assert.strictEqual(K.kulupYonelme('Siberay'),'Siberay Kulübüne');

/* ── yetki, üyeler, durum ── */
assert.strictEqual(K.kulupBenim({ogretmenIdler:['t1','t2']},'t2'),true);assert.strictEqual(K.kulupBenim({ogretmenIdler:['t1']},'t2'),false);assert.strictEqual(K.kulupBenim({ogretmenIdler:['t1']},''),false);
let durum=K.bosDurum();
K.ayarla(durum,'gorev:o1','Kulüp Başkanı',10);K.ayarla(durum,'gorev:o2','Sekreter',10);
const siniflar=[{id:'s1',ad:'5/A'},{id:'s2',ad:'6/B'},{id:'s3',ad:'10/A'}];
const veliler=[{id:'o1',ogrenciAdi:'Zeynep Demir',sinifId:'s2',kulupId:'k1'},{id:'o2',ogrenciAdi:'Mehmet Kaya',sinifId:'s1',kulupId:'k1'},{id:'o3',ogrenciAdi:'Ali Yılmaz',sinifId:'s1',kulupId:'k1'},{id:'o4',ogrenciAdi:'Başka',sinifId:'s1',kulupId:'k2'},{id:'o5',ogrenciAdi:'Ece Su',sinifId:'s3',kulupId:'k1'}];
const uyeler=K.uyeler('k1',veliler,siniflar,durum);
assert.deepStrictEqual(J(uyeler.map(u=>u.ad)),['Ali Yılmaz','Mehmet Kaya','Zeynep Demir','Ece Su'],'Sınıfa (sayısal), sonra ada göre sıralı; başka kulübün öğrencisi yok.');
assert.strictEqual(K.gorevAdi(uyeler,'baskan',durum,'baskan'),'Zeynep Demir');assert.strictEqual(K.gorevAdi(uyeler,'sekreter',durum,'sekreter'),'Mehmet Kaya');
K.ayarla(durum,'baskan','Elle Yazılan',11);assert.strictEqual(K.gorevAdi(uyeler,'baskan',durum,'baskan'),'Elle Yazılan','Elle yazılan alan öncelikli.');
const a=K.bosDurum(),b=K.bosDurum();K.ayarla(a,'x','eski',1);K.ayarla(a,'y','yalnız a',1);K.ayarla(b,'x','yeni',2);
const m=K.durumBirlestir(a,b);assert.strictEqual(K.deger(m,'x'),'yeni');assert.strictEqual(K.deger(m,'y'),'yalnız a');assert(K.durumAyni(m,K.durumBirlestir(b,a)));
assert.deepStrictEqual(J(K.durumTemizle({k:{ok:{v:'1',t:5},kotu:{v:'1'}}}).k),{ok:{v:'1',t:5}},'Zaman damgasız girdi atılır.');
assert.strictEqual(K.egitimYili(new Date(2026,9,1)),'2026-2027');assert.strictEqual(K.egitimYili(new Date(2027,5,1)),'2026-2027');
assert(/^kulup_k_1_2026_2027$/.test(K.durumAnahtari('k-1','2026-2027')));

/* ── Word çıktıları: üç kulüp (Siberay: tablolu/maddeli evraklar; Beyazay: 2 aylık plan, 5 sütunlu toplum hizmeti, maddesiz tüzük; Kızılay: iki aylık yıl sonu satırları, değerlendirme yazısız) ── */
const okul={okul:'Atatürk Ortaokulu',il:'Ankara',ilce:'Çankaya',mudur:'Ali Veli',yil:'2026-2027',danismanlar:['Ayşe Öğretmen'],kulup:{id:'k1',ad:'Siberay'},uyeler,paket};
K.ayarla(durum,'toplantiTarihi','2026-09-21',12);K.ayarla(durum,'toplantiYeri','Fen Laboratuvarı',12);K.ayarla(durum,'toplantiNo','2',12);
K.ayarla(durum,'d1katilim:EYLÜL','24 öğrenci',12);K.ayarla(durum,'d1sonuc:EYLÜL','Başarılı',12);K.ayarla(durum,'d2katilim:MART','19 öğrenci',12);
K.ayarla(durum,'ygenel','Yıl sonu özel metni.',12);K.ayarla(durum,'denetleme1','Deniz Kurt',12);K.ayarla(durum,'inceleme','2027-01-15',12);K.ayarla(durum,'yRaporTarihi','2027-06-18',12);
const metin=x=>x.replace(/<w:br\/>/g,'\n').replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
function dengeli(xml,ad){
 const st=[];for(const t of xml.match(/<[^>!?][^>]*>/g)||[]){if(/\/>$/.test(t))continue;const n=/^<\/?([A-Za-z0-9:_.-]+)/.exec(t)[1];if(t[1]==='/'){assert.strictEqual(st.pop(),n,`${ad}: kapanış etiketi uyumsuz (${n})`)}else st.push(n)}
 assert.strictEqual(st.length,0,`${ad}: açık etiket kaldı`);
}
async function uretK(bag,kod,girdi){
 const {blob,ad}=await D.olustur(kod,bag,girdi);const dosyalar=zip.oku(Buffer.from(await blob.arrayBuffer()));
 const xml=dosyalar['word/document.xml'].toString('utf8');
 return{ad,xml,metin:metin(xml),dosyalar};
}
const sayfaSonlari=xml=>(xml.match(/<w:br w:type="page"\/>/g)||[]).length;
async function kulupSinamasi(id,ad,kulupRe){
 const pk=paketler[id],b0={...okul,paket:pk,kulup:{id:'k1',ad},durum};
 const uret=(kod,girdi,bag=b0)=>uretK(bag,kod,girdi);
 const sonuc={};
 for(const bl of K.BELGELER){
  const girdi=bl.k==='donem'||bl.k==='denetleme'?{donem:1}:{};
  const o=sonuc[bl.k]=await uret(bl.k,girdi);
  assert(/^[A-Za-z0-9_.-]+\.docx$/.test(o.ad),`${id}/${bl.k}: dosya adı ASCII olmalı (${o.ad})`);assert(o.ad.startsWith(`${ad.replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ /g,'_')}_`),`${id}/${bl.k}: dosya adı kulüple başlar (${o.ad})`);
  for(const dosya of Object.keys(o.dosyalar).filter(n=>/^word\/(document|header\d*|footer\d*)\.xml$/.test(n))){
   const x=o.dosyalar[dosya].toString('utf8');
   assert(!/\{\{|\}\}|\[\[|\]\]/.test(x),`${id}/${bl.k}/${dosya}: doldurulmamış alan kaldı`);dengeli(x,`${id}/${bl.k}/${dosya}`);
  }
  /* A4 ve her bölümde üst/alt boşluk ≥ 15 mm (851 twip) */
  const sayfalar=[...o.xml.matchAll(/<w:pgSz[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"[^>]*\/>/g)];assert(sayfalar.length,`${id}/${bl.k}: sayfa boyutu`);
  const a4=(v,hedef)=>Math.abs(Number(v)-hedef)<=2;
  sayfalar.forEach(([,w,h])=>assert((a4(w,11906)&&a4(h,16838))||(a4(w,16838)&&a4(h,11906)),`${id}/${bl.k}: A4 olmalı (${w}x${h})`));
  const kenarlar=[...o.xml.matchAll(/<w:pgMar([^>]*)\/>/g)];assert(kenarlar.length,`${id}/${bl.k}: kenar boşlukları`);
  kenarlar.forEach(([,k])=>{const ust=Number(/w:top="(-?\d+)"/.exec(k)[1]),alt=Number(/w:bottom="(-?\d+)"/.exec(k)[1]);assert(ust>=851&&alt>=851,`${id}/${bl.k}: üst/alt boşluk en az 15 mm olmalı (${ust}/${alt})`)});
  /* ortak alanlar: okul adı ve kulüp adı */
  assert(/Atatürk Ortaokulu|ATATÜRK ORTAOKULU/.test(o.metin),`${id}/${bl.k}: okul adı`);
  assert(kulupRe.test(o.metin),`${id}/${bl.k}: kulüp adı`);
 }
 const t=k=>sonuc[k].metin;
 /* kulübün kendi evrakları: müdür ve danışman adı uygulamadan (Siberay'ın toplum hizmeti planında danışman alanı yok) */
 for(const k of ['tuzuk','plan','toplum'])assert(t(k).includes('Ali VELİ'),`${id}/${k}: müdür adı`);
 for(const k of ['tuzuk','plan'])assert(t(k).includes('Ayşe ÖĞRETMEN'),`${id}/${k}: danışman adı`);
 /* tutanak: davet + tutanak + karar (3 sayfa), girilen toplantı bilgileri */
 assert.strictEqual((sonuc.tutanak.xml.match(/<w:pageBreakBefore\/>/g)||[]).length,2,'Tutanak 3 sayfa.');
 assert(t('tutanak').includes('21.09.2026')&&t('tutanak').includes('Fen Laboratuvarı'));assert(t('tutanak').includes('Elle Yazılan')&&t('tutanak').includes('Mehmet Kaya'),'Kulüp temsilcisi elle yazılandan, sekreter üye görevinden gelir.');
 /* üye listesi: sıralı öğrenciler, en az 25 satır */
 {const x=t('uyeler'),sira=['Ali Yılmaz','Mehmet Kaya','Zeynep Demir','Ece Su'].map(n=>x.indexOf(n));assert(sira.every(i=>i>=0)&&sira.every((v,i)=>!i||v>sira[i-1]),'Üyeler sınıf ve ada göre sıralı yazılır.');
  assert((sonuc.uyeler.xml.match(/<w:tr[ >]/g)||[]).length>=26,'Başlık + en az 25 satır.');assert(x.includes('Elle Yazılan'),'Başkan elle yazılan alandan.');}
 /* aylık raporlar: bütün aylar tek dosyada = 10 rapor (9 sayfa sonu); tek ay = 1 rapor, sayfa sonu yok */
 {const hepsi=sonuc.aylik;assert.strictEqual(sayfaSonlari(hepsi.xml),9,`${id}: bütün aylar 10 rapor`);
  const ekim=await uret('aylik',{aylar:['EKİM']});assert.strictEqual(sayfaSonlari(ekim.xml),0);assert(ekim.metin.includes('EKİM')&&!ekim.metin.includes('KASIM')&&!ekim.metin.includes('EYLÜL')&&ekim.ad.endsWith('_EKIM.docx'),`${id}: yalnız ekim raporu`);
  const iki=await uret('aylik',{aylar:['EYLÜL','MAYIS']});assert.strictEqual(sayfaSonlari(iki.xml),1,`${id}: seçilen iki rapor`);assert(iki.metin.includes('EYLÜL')&&iki.metin.includes('MAYIS')&&!iki.metin.includes('EKİM'));
  assert(hepsi.xml.length>ekim.xml.length*5,'Bütün aylar tek ay raporundan çok daha uzun.');
  await assert.rejects(()=>D.olustur('aylik',b0,{aylar:['TEMMUZ']}),/rapor bulunamadı/);}
 /* dönem sonu: dönemin ayları + katılım/sonuç; yıl sonu: 10 ay + özel metin */
 assert(t('donem').includes('EYLÜL')&&t('donem').includes('OCAK')&&!t('donem').includes('HAZİRAN'));assert(t('donem').includes('24 öğrenci')&&t('donem').includes('Başarılı')&&t('donem').includes('1. Dönem'));
 assert(t('donem').includes((pk.donemSonu||pk.yilSonu).b.slice(0,30)),'Kazanımlar hazır metinle gelir.');
 assert(t('donem').includes(pk.yilSonu.aylar[0].calisma.slice(0,25)),'Ay özeti kulüp kataloğundan gelir.');
 {const d2=await uret('donem',{donem:2});assert(d2.metin.includes('HAZİRAN')&&d2.metin.includes('ŞUBAT')&&!d2.metin.includes('EYLÜL'));assert(d2.metin.includes('19 öğrenci')&&!d2.metin.includes('24 öğrenci'),'Katılım dönem başına ayrı tutulur.');assert(d2.ad.endsWith('_2_Donem.docx'));}
 K.AYLAR.forEach(ay=>assert(t('yil').includes(ay),`Yıl sonu ${ay}`));assert(t('yil').includes('Yıl sonu özel metni.')&&(!pk.yilSonu.b||!t('yil').includes(pk.yilSonu.b.slice(0,30))),'Öğretmenin yazdığı değerlendirme hazır metnin yerine geçer.');assert(t('yil').includes('18.06.2027'));
 /* denetleme */
 assert(t('denetleme').includes('1. Dönem')&&t('denetleme').includes('15.01.2027')&&t('denetleme').includes('Deniz Kurt'));
 {const dn=await uret('denetleme',{donem:2});assert(dn.metin.includes('2. Dönem')&&!dn.metin.includes('1. Dönem /'));}
 return sonuc;
}
const si=await kulupSinamasi('siberay','Siberay Kulübü',/Siberay|S[Iİ]BERAY/);
const by=await kulupSinamasi('beyazay','Beyazay Kulübü',/Beyazay|BEYAZAY/);
const kz=await kulupSinamasi('kizilay','Kızılay Kulübü',/Kızılay|KIZILAY/);
const ye=await kulupSinamasi('yesilay','Yeşilay Kulübü',/Yeşilay|YEŞİLAY/);
const yb=await kulupSinamasi('yasam-becerileri','Yaşam Becerileri Kulübü',/Yaşam Becerileri|YAŞAM BECERİLERİ/);
/* Yeşilay: iki yıllık plan; ortaokul kulübü ortaokul planını (ay ay satırlı), diğeri genel planı (iki aylık satırlı) alır */
{const gen=await uretK({...okul,durum,paket:paketler.yesilay,kulup:{id:'k1',ad:'Yeşilay Kulübü'},kademe:''},'plan',{}),oo=await uretK({...okul,durum,paket:paketler.yesilay,kulup:{id:'k1',ad:'Yeşilay Kulübü'},kademe:'ortaokul'},'plan',{});
 assert(!/\(\s*ORTAOKUL\s*\)/.test(gen.metin)&&/EYLÜL\s*-\s*EKİM/.test(gen.metin),'Genel plan: kademe yazmaz, iki aylık satırlar.');
 assert(/\(\s*ORTAOKUL\s*\)/.test(oo.metin)&&/KADEME\s*Ortaokul/.test(oo.metin)&&!/EYLÜL\s*-\s*EKİM/.test(oo.metin),'Ortaokul planı: kademe yazar, ay ay satırlar.');
 assert(oo.ad.endsWith('_Ortaokul.docx')&&!/Ortaokul/.test(gen.ad),`Ortaokul planının dosya adı kademeyi taşır (${oo.ad}; ${gen.ad})`);
 for(const o of [gen,oo]){assert(!/\{\{|\}\}/.test(o.xml));dengeli(o.xml,'Yeşilay planı');}
 const so=await uretK({...okul,durum,paket:paketler.beyazay,kulup:{id:'k1',ad:'Beyazay Kulübü'},kademe:'ortaokul'},'plan',{});assert(!/Ortaokul/.test(so.ad),'Beyazay ortaokul kulübü de genel planı alır (kademeye özel planı yok).');}
{const kulupSrc=fs.readFileSync('js/modules/kulup.js','utf8');assert(kulupSrc.includes('kademe:kademe(k)')&&kulupSrc.includes('K.kulupKademesi(ids.map(id=>SB.duzeyOf(')&&kulupSrc.includes('K.planSecimi(paket,kademe(kulup()))'),'Ekran kulübün sınıflarından kademeyi bulur, plan kartında hangi planın verileceğini söyler.');}
{const bos=await uretK({...okul,durum:K.bosDurum(),paket:paketler.kizilay,kulup:{id:'k1',ad:'Kızılay Kulübü'}},'yil',{});assert(bos.metin.includes(K.NOKTA),'Dosyada değerlendirme yazısı yoksa noktalı satır kalır.');assert(/Kızılay Kulübü[^]*Eylül ayında|EYLÜL/.test(bos.metin)&&bos.metin.includes(paketler.kizilay.yilSonu.aylar[0].calisma.slice(0,30)),'Ay özetleri aylık raporlardan gelir.');}
/* kulübe özgü içerik kulübün kendi dosyasından gelir */
assert.strictEqual((si.tuzuk.metin.match(/MADDE \d+ –/g)||[]).length,23);assert(si.plan.metin.includes('Bilim (B)')&&(si.plan.xml.match(/<w:tr[ >]/g)||[]).length>=42,'Siberay planı: tema ve 41 hafta.');
assert(si.aylik.metin.split('AYLIK FAALİYET RAPORU').length-1===10&&si.aylik.metin.includes('Rapor No: 10'));
assert(by.plan.metin.includes('Doğa-Çevre-Toplum')&&by.plan.metin.includes('DÇT.1')&&by.plan.metin.includes('YILLIK ÇALIŞMA PLANI'));
assert(by.toplum.metin.includes('KATILANLAR')&&by.toplum.metin.includes('Kulüp Öğrencileri ve Danışman Öğretmen'));
assert(by.aylik.metin.split('AYLIK ÇALIŞMA RAPORU').length-1===10&&by.tuzuk.metin.includes('DAYANAK')&&!/MADDE \d/.test(by.tuzuk.metin));
assert(/Kulüp Başkanı:\s*(Zeynep Demir|Elle Yazılan)/.test(by.tuzuk.metin),'Maddesiz tüzükte kulüp başkanı alanı doldurulur.');

/* katalogsuz kulüp: genel evraklar çalışır, katalog gerektirenler anlaşılır hata verir */
{const kb={...okul,durum,paket:null,kulup:{id:'k2',ad:'Satranç'}};
 for(const k of ['tutanak','uyeler','denetleme']){const o=await uretK(kb,k,{donem:1});assert(o.metin.includes('Satranç Kulübü')||o.metin.includes('SATRANÇ KULÜBÜ'),`${k}: kulüp adı`)}
 for(const k of ['tuzuk','plan','toplum','aylik','donem','yil'])await assert.rejects(()=>D.olustur(k,kb,{}),/hazır evrakları henüz eklenmedi/,`${k}: katalogsuz kulüp için açıklayıcı hata`);}
/* eksik bilgi noktalı kalır, boş bırakılmaz */
{const bos=await uretK({...okul,durum:K.bosDurum(),danismanlar:[],uyeler:[],mudur:'',kulup:{id:'k1',ad:'Beyazay'},paket:paketler.beyazay},'tuzuk',{});assert(bos.metin.includes('……'),'Eksik alanlar noktalı kalır.');assert(!/undefined|null|NaN/.test(bos.metin));}
{const bos=await uretK({...okul,durum:K.bosDurum(),danismanlar:[],uyeler:[],mudur:''},'tutanak',{});assert(bos.metin.includes('……'));assert(!/undefined|null|NaN/.test(bos.metin));}
/* XML kaçışı */
{const ozel=await uretK({...okul,durum,uyeler:[{id:'x',ad:'A & B <C>',sinif:'5/A',no:'',gorev:'"Üye"'}]},'uyeler',{});assert(ozel.metin.includes('A & B <C>'));dengeli(ozel.xml,'özel karakter');}

/* ── aylık rapor bölümleme (kulup-core): en dış öğelerde sayfa sonu paragrafı; tablo içi ve metinli sayfa sonu bölmez ── */
{const p=t=>`<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`,kir='<w:p><w:r><w:br w:type="page"/></w:r></w:p>',tbl=`<w:tbl><w:tr><w:tc>${p('hücre')}${kir}</w:tc></w:tr></w:tbl>`;
 const sect='<w:sectPr><w:pgMar w:top="900" w:bottom="900"/></w:sectPr>';
 const xml=`<w:document><w:body>${p('A1')}${tbl}${kir}${p('B1')}<w:p><w:r><w:t>metinli</w:t><w:br w:type="page"/></w:r></w:p>${p('B2')}${kir}${kir}${p('C1')}${kir}${sect}</w:body></w:document>`;
 const r=K.bolumle(xml.slice(xml.indexOf('<w:body>')+8,xml.indexOf(sect)));
 assert.strictEqual(r.bolumler.length,3,'Üç bölüm: boş bölümler atılır, tablo içi sayfa sonu bölmez.');assert(r.bolumler[0].includes('A1')&&r.bolumler[0].includes('hücre')&&r.bolumler[1].includes('metinli')&&r.bolumler[1].includes('B2')&&r.bolumler[2].includes('C1'));
 const bir=K.bolumSec(xml,[2]);assert(bir.includes('C1')&&!bir.includes('B1')&&!bir.includes('A1')&&bir.includes(sect)&&!bir.includes('w:type="page"'));
 const iki=K.bolumSec(xml,[0,2]);assert.strictEqual((iki.match(/w:type="page"/g)||[]).length,2,'Seçilen bölümler arasına tek sayfa sonu (tablo içindeki dahil 2).');assert(iki.indexOf('A1')<iki.indexOf('C1')&&!iki.includes('B1'));
 assert(K.bolumSec(xml).includes('B1')&&K.bolumSec(xml,[]).includes('C1'),'Seçim boşsa hepsi.');assert.throws(()=>K.bolumSec(xml,[7]),/bulunamadı/);
 assert.throws(()=>K.bolumle('<w:p><w:r>'),/kapanmıyor/);}

/* ── öğretmen: evrak teslim durumu (salt okunur) ── */
{const kayit={id:'k1',ad:'Siberay',aktif:true,yillikPlanTarihi:'2026-10-15',toplumHizmetiTarihi:'2026-10-20',kontroller:[true,false,true,true]};
 const d=K.takipDurumu(kayit,new Date(2026,10,2));
 assert.strictEqual(d.toplam,12,'Teslim listesi: 2 plan + 9 ay + yıl sonu raporu.');
 assert.strictEqual(d.tamam,3,'İşaretli evraklar sayılır.');
 assert.strictEqual(d.gecikti,1,'Toplum hizmeti planı: son tarih geçti, işaret yok → gecikti; Ekim (işaretli) ve yıllık plan (işaretli) gecikmez.');
 assert(d.planlar[0].tamam&&!d.planlar[0].gecikti&&d.planlar[1].gecikti);
 assert(d.aylar[0].tamam&&!d.aylar[0].gecikti&&d.aylar[1].simdi&&!d.aylar[1].gecikti,'Kasım şimdiki aydır; bitmediği için gecikmiş sayılmaz.');
 const bos=K.takipDurumu({id:'k2',ad:'X'},new Date(2027,2,10));
 assert.strictEqual(bos.tamam,0);assert.strictEqual(bos.gecikti,5,'Mart: Ekim–Şubat 5 ay işaretsiz → 5 gecikme.');
 const pasif=K.takipDurumu({id:'k3',aktif:false,kontroller:[]},new Date(2027,2,10));assert.strictEqual(pasif.gecikti,0,'Pasif kulüp gecikmez.');
 assert.strictEqual(K.takipDurumu(null).tamam,0,'Kayıt yoksa çökmez.');
 assert(K.kulupBenim({ogretmenIdler:['t1']},'t1')&&!K.kulupBenim({ogretmenIdler:['t2']},'t1')&&!K.kulupBenim({ogretmenIdler:['t1']},''),'Kulüp yalnız danışmanına aittir.');}

/* ── kayıt noktaları ── */
const nav=fs.readFileSync('js/core/app-nav.js','utf8'),shell=fs.readFileSync('js/core/shell-ui.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8'),bridge=fs.readFileSync('js/core/role-permission-bridge.js','utf8');
const gizli=nav.match(/const TEACHER_HIDDEN=new Set\(\[([^\]]*)\]/)[1];
assert(!/'tools:form-kulup'/.test(gizli)&&gizli.includes("'tools:form-kulup-kayit'"),'Öğretmen yeni Sosyal Kulüpler sayfasını görür; klasik kayıt tablosu öğretmenden gizli kalır.');
assert(nav.includes("['form-kulup','Sosyal Kulüpler','star'")&&nav.includes("'tools','form-kulup'],"),'Menü aracı aynı rotada kalır.');
assert(/FORM_PAGES=Object\.freeze\(\{[^}]*'form-kulup-kayit':'Sosyal Kulüpler'/.test(shell)&&!/FORM_PAGES=Object\.freeze\(\{[^}]*'form-kulup':/.test(shell),'Klasik tablo form-kulup-kayit sayfasına taşınır.');
assert(shell.includes("page==='form-kulup'")&&shell.includes('KulupModule.open')&&shell.includes('kulup-core.js?v=4')&&shell.includes('kulup.js?v=7'),'Kabukta Sosyal Kulüpler rotası tanımlı olmalı.');
assert(bridge.includes("'tools:form-kulup-kayit':'tools.formKulup'"));
/* Öğretmen görünürlüğü ve gizlilik: sayfa rol matrisine takılmaz, yalnız kendi kulübünü görür, profilde "Sosyal kulübüm" bölümü açar */
{const ui=fs.readFileSync('js/modules/kulup.js','utf8'),cz=fs.readFileSync('js/modules/rubric-settings-core.js','utf8');
 assert(/teacherOwnPage=\(name,page\)=>name==='tools'&&page==='form-kulup'&&window\.PermissionService\?\.isTeacherAccount\?\.\(\)===true/.test(bridge)&&bridge.includes('if(isAdmin()||teacherOwnPage(name,page))return true;'),'Öğretmen hesabı kendi kulüp sayfasını rol matrisinden bağımsız açar.');
 assert(!/teacherOwnPage[^;]*form-kulup-kayit/.test(bridge),'Klasik kayıt tablosu için istisna yok.');
 assert(ui.includes("(yonetici||K.kulupBenim(k,tid))")&&ui.includes("${yonetici?'':takipKarti()}"),'Öğretmen yalnız danışmanı olduğu kulüpleri listeler; teslim kartı yalnız öğretmene.');
 assert(ui.includes('S.istenenId&&liste.some(k=>String(k.id)===S.istenenId)'),'Profilden gelen kulüp yalnız görebildiği kulüpler arasındaysa seçilir.');
 assert(cz.includes('arr(\'sosyalKulupler\').filter(clubVisible)')&&cz.includes('catch(_){return false}};'),'Klasik tabloda öğretmen yalnız kendi kulüplerini görür (hata halinde kapalı).');
 assert(!shell.includes("['sosyalKulupler','Sosyal Kulüp'"),'Kulüpler “Diğer Görevlerim”de değil, kendi bölümünde.');
 assert(shell.includes("data-profile-kulup-section")&&shell.includes("clubs.length>1?'Sosyal kulüplerim':'Sosyal kulübüm'")&&shell.includes("routeModule('tools',{page:'form-kulup',title:'Sosyal Kulüpler',kulupId:b.dataset.profileKulup})"),'Profilde “Sosyal kulübüm” bölümü kendi kulüp sayfasını açar.');
 assert(shell.includes('profileRecordTeacherIds(\'sosyalKulupler\',k).map(String).includes(String(tid))')&&shell.includes('k.aktif!==false'),'Profil yalnız öğretmenin danışmanı olduğu aktif kulüpleri listeler.');
 assert(shell.includes('KulupModule.open({kulupId})')&&shell.includes("title:'Sosyal Kulüpler',kulupId})")&&shell.includes("kulupId:view.kulupId||''")&&/a\.title===b\.title&&\(a\.kulupId\|\|''\)===\(b\.kulupId\|\|''\)/.test(shell),'Kulüp kimliği geri/yeniden yükleme yığınında korunur.');
 assert(css.includes('#v2ModuleRoot .klp-takip__bar')&&css.includes('#v2ModuleRoot .klp-durum--gecikti'),'Teslim kartı stilleri tasarım sistemi CSS dosyasında.');}
/* Evrak takibi sekmesi: kulüp seçiliyse yalnız o kulübün takibi (klasik çizelge sayfası takipKulubu kapsamıyla çizilir) */
{const ui=fs.readFileSync('js/modules/kulup.js','utf8'),cz=fs.readFileSync('js/modules/rubric-settings-core.js','utf8');
 assert(ui.includes('data-klp-act="takip">Evrak takibi</button>')&&!ui.includes('Kulüp kayıtları')&&ui.includes('S.takipId=S.kulupId')&&ui.includes('takipKulubu:()=>S.takipId'),'Sekme “Evrak takibi” olur ve seçili kulübü takip sayfasına bildirir.');
 assert(cz.includes('global.KulupModule?.takipKulubu?.()')&&cz.includes("tek?'Evrak Takibi':c.title")&&cz.includes('all.find(x=>String(x.id)===tek)')&&cz.includes('tek?\'\':kind===\'bep\''),'Klasik kulüp çizelgesi kapsam varsa yalnız o kulübü çizer (özet ve araç çubuğu yok).');}
['kulup-core.js?v=4','kulup.js?v=7','kulup-dosya.js?v=4'].forEach(f=>assert(sw.includes(`./js/modules/${f}`),`${f} önbelleğe alınmalı.`));
assert(fs.readFileSync('js/modules/kulup.js','utf8').includes('kulup-dosya.js?v=4'),'Kulüp ekranı aynı kulup-dosya sürümünü yükler.');
fs.readdirSync('assets/kulup/sablon').forEach(f=>assert(sw.includes(`./assets/kulup/sablon/${f}`),`${f} çevrimdışı için önbelleğe alınmalı.`));
assert.deepStrictEqual(fs.readdirSync('assets/kulup/sablon').sort(),['denetleme.docx','donem-sonu.docx','tutanak.docx','uye-listesi.docx','yil-sonu.docx'],'Ortak şablonlar: kulübe bağlı olmayan beş evrak.');
assert(sw.includes('./data/kulup/katalog.json'),'Katalog önbelleğe alınmalı (kulüplerin evrakları seçilince yüklenir).');
assert(fs.readFileSync('js/modules/kulup.js','utf8').includes('ogretmen-dosyasi-core.js?v=5')&&sw.includes('ogretmen-dosyasi-core.js?v=5'),'Ortak Word çekirdeği aynı sürümle yüklenir.');
for(const f of ['kulup','kulup-core','kulup-dosya']){
 const k=fs.readFileSync(`js/modules/${f}.js`,'utf8');
 assert(!/localStorage\s*\.\s*setItem/.test(k)&&!/<style|createElement\('style'\)/.test(k),`${f}.js depolamaya yazmaz, stil gömmez.`);
}
/* APK: data/ klasörü uygulamaya girmezse kulüp kataloğu telefonda hiç yüklenmez; katalog hatası da kalıcı olmaz */
{const wf=fs.readFileSync('.github/workflows/build-apk.yml','utf8'),ui=fs.readFileSync('js/modules/kulup.js','utf8');
 assert(wf.includes('cp -r data www/')&&wf.includes("- 'data/**'"),'APK derlemesi data/ klasörünü www/ içine kopyalar ve veri değişince yeniden derlenir.');
 assert(/catch\(e\)\{[^}]*S\.katalogHata=true\}/.test(ui)&&!ui.includes('S.katalog={kulupler:[]}'),'Katalog yüklenemezse boş katalog kalıcı yazılmaz; açılışta yeniden denenir.');
 assert(ui.includes('Hazır evrak kataloğu yüklenemedi')&&ui.includes('(!S.katalog&&!S.katalogHata)'),'Hata ve yükleniyor durumu “henüz eklenmedi” diye gösterilmez.');}
assert(css.includes('#v2ModuleRoot .klp-page')&&css.includes('#v2ModuleRoot .klp-evrak__ust'),'Stiller tasarım sistemi CSS dosyasında olmalı.');
assert(!/color:\s*#fff[^;]*;[^}]*background[^}]*warning/.test(css.slice(css.indexOf('/* ===== SOSYAL KULÜPLER'),css.indexOf('/* ===== A4 — Yazılı Kâğıdı'))),'Sarı dolgu üzerine beyaz yazı olmaz.');
console.log('kulup.test.js OK');
})().catch(e=>{console.error(e);process.exit(1)});
