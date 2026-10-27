const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const JSZip=require('../assets/vendor/jszip.min.js');

function load(files,extra={}){
  const win={console,...extra};
  win.window=win;win.globalThis=win;
  vm.createContext(win);
  for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),win,{filename:f});
  return win;
}
const eq=(a,b,m)=>assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);
const DIR='assets/ogretmen-dosyasi/';

const w=load(['js/modules/evrak-katalog.js','js/modules/ogretmen-dosyasi-core.js'],{JSZip});
const K=w.EvrakKatalog,C=w.OgretmenDosyasiCore;
assert(K&&C,'EvrakKatalog ve OgretmenDosyasiCore yüklenmeli.');

/* ── ortak katalog: Evrak Teslim ile aynı 62 + 33 + 26 madde, tek kaynak ── */
const per={};K.KATALOG.forEach(e=>{(per[e.donem]=per[e.donem]||[]).push(e)});
eq([per.basi.length,per.donem1.length,per.sonu.length],[62,33,26],'Katalog sayıları değişmemeli (kayıtlı işaretler kimliklere bağlı).');
assert.strictEqual(new Set(K.KATALOG.map(e=>e.id)).size,K.KATALOG.length,'Kimlikler benzersiz olmalı.');
assert.strictEqual(K.egitimYili(new Date(2026,9,27)),'2026-2027');assert.strictEqual(K.egitimYili(new Date(2027,5,1)),'2026-2027');assert.strictEqual(K.egitimYili(new Date(2026,7,31)),'2025-2026');
const tek=fs.readFileSync('js/modules/evrak-teslim.js','utf8');
assert(tek.includes('global.EvrakKatalog')&&!/const (BASI|DONEM1|SONU)=\[/.test(tek),'Evrak Teslim listeyi ortak katalogdan almalı, kendi kopyasını tutmamalı.');

/* ── her form anahtarı tanımlı, dosyası var; her uygulama içi sayfa gerçekten var ── */
for(const [k,f] of Object.entries(K.FORMLAR)){
  assert(f.ad&&(f.docx||f.pdf),`${k}: ad ve en az bir dosya olmalı.`);
  for(const t of ['docx','pdf'])if(f[t])assert(fs.existsSync(DIR+f[t]),`${k}: ${f[t]} dosyası yok.`);
}
const navWin=load(['js/core/app-nav.js'],{addEventListener(){},dispatchEvent(){return true},CustomEvent:function(){},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},document:{}});
const araclar=new Set(navWin.AppNav.catalog().map(t=>t.id));
K.KATALOG.forEach(e=>{
  e.formlar.forEach(k=>assert(K.FORMLAR[k],`${e.id}: "${k}" formu tanımsız.`));
  if(e.arac)assert(araclar.has(e.arac),`${e.id}: "${e.arac}" menüde yok.`);
});
const kullanilan=new Set(K.KATALOG.flatMap(e=>e.formlar));
Object.keys(K.FORMLAR).forEach(k=>assert(kullanilan.has(k),`${k} formu hiçbir maddeye bağlı değil.`));
const b07=K.KATALOG.find(e=>/İş Takvimi/.test(e.ad));
eq(K.formlar(b07,'2026-2027').map(f=>f.key),['is-takvimi','takvim'],'Yıla özgü formlar o yılda görünür.');
eq(K.formlar(b07,'2027-2028'),[],'Başka yılda tarihleri yanlış olacak formlar gizlenir.');
assert.strictEqual(K.KATALOG.find(e=>e.ad==='Atatürk Portresi').formlar[0],'ataturk');

/* ── yer tutucu üretimi ── */
assert.strictEqual(C.imzaAd('sedat karagöz'),'Sedat KARAGÖZ');assert.strictEqual(C.imzaAd('  ayşe nur  yılmaz '),'Ayşe Nur YILMAZ');assert.strictEqual(C.imzaAd(''),'');
assert.strictEqual(C.ustMakam('Elazığ','Merkez'),'ELAZIĞ VALİLİĞİ');assert.strictEqual(C.ustMakam('Elazığ',''),'ELAZIĞ VALİLİĞİ');assert.strictEqual(C.ustMakam('Elazığ','Karakoçan'),'KARAKOÇAN KAYMAKAMLIĞI');assert(/VALİLİĞİ/.test(C.ustMakam('','')));
assert.strictEqual(C.okulMudurlugu('Koruk Ortaokulu'),'KORUK ORTAOKULU MÜDÜRLÜĞÜ');assert.strictEqual(C.okulMudurlugu('Koruk Ortaokulu Müdürlüğü'),'KORUK ORTAOKULU MÜDÜRLÜĞÜ','Müdürlüğü iki kez yazılmaz.');
assert.strictEqual(C.bransMetni('Müdür Yardımcısı','Matematik'),'Müdür Yardımcısı');assert.strictEqual(C.bransMetni('Öğretmen','Sosyal Bilgiler'),'Sosyal Bilgiler');
assert.strictEqual(C.gorevMetni('Öğretmen','Sosyal Bilgiler'),'Sosyal Bilgiler Öğretmeni');assert.strictEqual(C.gorevMetni('Müdür Yardımcısı',''),'Müdür Yardımcısı');assert.strictEqual(C.gorevMetni('Öğretmen','Sınıf Öğretmeni'),'Sınıf Öğretmeni');
const v=C.degerler({okul:'Koruk & Oğul İlkokulu',il:'Elazığ',ilce:'Merkez',ad:'ali veli',unvan:'Öğretmen',brans:'Fen Bilimleri',mudur:'mehmet demir',yil:'2026-2027',tarih:'27.10.2026'});
assert.strictEqual(v.AD_SOYAD,'Ali VELİ');assert.strictEqual(v.AD_SOYAD_BUYUK,'ALİ VELİ');assert.strictEqual(v.MUDUR,'Mehmet DEMİR');assert.strictEqual(v.BRANS_BUYUK,'FEN BİLİMLERİ');assert.strictEqual(v.TC,'','T.C. kimlik numarası hiçbir zaman otomatik yazılmaz.');
const bos=C.degerler({});
assert(bos.AD_SOYAD.includes('…')&&bos.OKUL.includes('…')&&bos.MUDUR.includes('…'),'Eksik bilgi noktalı kalır.');
assert.strictEqual(C.xmlDoldur('<w:t>{{OKUL}} {{YOK}} {{AD_SOYAD}}</w:t>',v),'<w:t>Koruk &amp; Oğul İlkokulu  Ali VELİ</w:t>','Değerler XML kaçışlı yazılır, bilinmeyen alan boş kalır.');

/* ── şablonlar: tüm alanlar tanımlı, doldurunca alan ve marka izi kalmaz ── */
const bilinen=new Set(Object.keys(v));
(async()=>{
  for(const [k,f] of Object.entries(K.FORMLAR)){
    if(!f.docx)continue;
    const buf=fs.readFileSync(DIR+f.docx);
    const kaynak=await JSZip.loadAsync(buf);
    for(const ad of Object.keys(kaynak.files)){
      if(kaynak.files[ad].dir||!/\.(xml|rels)$/.test(ad))continue;
      const metin=await kaynak.file(ad).async('string');
      assert(!/evrakburada|filigran/i.test(metin),`${f.docx}/${ad}: üçüncü taraf marka izi var.`);
      (metin.match(/\{\{[A-Z_]+\}\}/g)||[]).forEach(a=>assert(bilinen.has(a.slice(2,-2)),`${f.docx}: ${a} tanımsız alan.`));
      assert(!/Sedat|KARAGÖZ|Bilal|BAYKAR|KORUK ORTAOKULU/i.test(metin),`${f.docx}/${ad}: şablonda kişi/okul adı sabit kalmış.`);
    }
    const core=kaynak.file('docProps/core.xml');
    if(core)assert(!/evrakburada|seferzengin|hakan|BTA/i.test(await core.async('string')),`${f.docx}: dosya bilgisinde eski yazar izi var.`);
    const blob=await C.docxDoldur(buf,v);
    assert.strictEqual(blob.type,C.DOCX_TURU);
    const dolu=await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
    const xml=await dolu.file('word/document.xml').async('string');
    assert(!/\{\{|\}\}/.test(xml),`${k}: doldurulmuş belgede alan kalmış.`);
    assert(Object.keys(dolu.files).includes('[Content_Types].xml'),`${k}: geçerli paket olmalı.`);
  }
  /* kapak: tüm alanlar yerine oturur */
  const kapak=await JSZip.loadAsync(Buffer.from(await (await C.docxDoldur(fs.readFileSync(DIR+K.FORMLAR.kapak.docx),v)).arrayBuffer()));
  const kx=(await kapak.file('word/document.xml').async('string')).replace(/<[^>]+>/g,'').replace(/&amp;/g,'&');
  ['ELAZIĞ VALİLİĞİ','KORUK & OĞUL İLKOKULU MÜDÜRLÜĞÜ','ALİ VELİ','FEN BİLİMLERİ','2026-2027'].forEach(s=>assert(kx.includes(s),`Kapakta "${s}" yok.`));
  /* tutanak: tarih ve görev satırı */
  const tutanak=await JSZip.loadAsync(Buffer.from(await (await C.docxDoldur(fs.readFileSync(DIR+K.FORMLAR['yazili-teslim'].docx),v)).arrayBuffer()));
  const tx=(await tutanak.file('word/document.xml').async('string')).replace(/<[^>]+>/g,' ');
  assert(tx.includes('27.10.2026')&&tx.includes('Fen Bilimleri Öğretmeni')&&tx.includes('Ali VELİ'),'Tutanakta tarih, görev ve ad yazılmalı.');
  /* PDF'lerde üçüncü taraf izi ve indirme numarası kalmamalı */
  for(const f of fs.readdirSync(DIR).filter(x=>x.endsWith('.pdf'))){
    const ham=fs.readFileSync(DIR+f).toString('latin1');
    assert(!/evrakburada|5216856032/i.test(ham),`${f}: filigran/marka izi var.`);
    assert(fs.statSync(DIR+f).size<1.5*1024*1024,`${f}: PDF 1,5 MB'ı aşmamalı (uygulama paketini şişirir).`);
  }

  /* ── ilerleme durumu: cihazlar arası birleştirme ── */
  const a=C.bosDurum(),b=C.bosDurum();
  C.isaretle(a,'b01','h',100);C.isaretle(b,'b01','',200);               // sonraki yazan kazanır
  C.isaretle(a,'b02','h',300);C.isaretle(b,'b03','g',150);
  C.dosyaEkle(a,'f1',{m:'b02',a:'plan.pdf',y:'dokumanlar/u/1_plan.pdf',b:2048},310);
  C.dosyaEkle(b,'f2',{m:'b02',a:'cv.docx',y:'dokumanlar/u/2_cv.docx',b:4096},320);
  C.ozelEkle(a,'o1','Kitap kulübü raporu',400);
  const m=C.durumBirlestir(a,b);
  assert.strictEqual(C.isaret(m,'b01'),'','Daha yeni "temizle" kazanır.');assert.strictEqual(C.isaret(m,'b02'),'h');assert.strictEqual(C.isaret(m,'b03'),'g');
  eq(C.dosyalar(m,'b02').map(x=>x.i),['f1','f2'],'İki cihazda yüklenen dosyalar birleşir.');
  eq(C.ozeller(m).map(x=>x.ad),['Kitap kulübü raporu']);
  const silinmis=C.durumBirlestir(m,C.dosyaSil(JSON.parse(JSON.stringify(m)),'f1',500));
  eq(C.dosyalar(silinmis,'b02').map(x=>x.i),['f2'],'Silinen dosya tekrar dirilmez.');
  assert(C.durumAyni(C.durumBirlestir(m,m),m)&&C.durumAyni(C.durumBirlestir(a,b),C.durumBirlestir(b,a)),'Birleştirme değişmeli ve idempotent olmalı.');
  eq(C.durumTemizle({m:{x:{s:'h',t:'bozuk'}},f:'saçma',o:null}),C.bosDurum(),'Bozuk uzak veri yok sayılır.');
  const ilk=C.bosDurum();C.isaretle(ilk,'b01','h');C.isaretle(ilk,'b02','g');
  eq(C.ilerleme(['b01','b02','b03'],ilk),{hazir:1,gerekmez:1,toplam:2,yuzde:50},'Gerekmez işaretliler toplamdan çıkar.');
  assert.strictEqual(C.durumAnahtari('2026-2027'),'ogretmenDosyasi_2026_2027');
  assert.strictEqual(C.dosyaAdi('Öğretmen Dosyası Kapağı','Ali VELİ','docx'),'Ogretmen_Dosyasi_Kapagi-Ali_VELI.docx','İndirme adı ASCII olmalı.');
  assert.strictEqual(C.dosyaAdi('Atatürk Portresi','','pdf'),'Ataturk_Portresi.pdf');assert.strictEqual(C.dosyaAdi('','','pdf'),'Dosya.pdf');

  /* ── kayıt noktaları ve kurallar ── */
  const nav=fs.readFileSync('js/core/app-nav.js','utf8'),shell=fs.readFileSync('js/core/shell-ui.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8'),ui=fs.readFileSync('js/modules/ogretmen-dosyasi.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8');
  assert(/\['evrak','Tutanak ve Evrak'[^\n]*\n\s*\['ogretmen-dosyasi','Öğretmen Dosyası'/.test(nav),'Öğretmen Dosyası, Tutanak ve Evrak menüsünün ilk sayfası olmalı.');
  assert(!nav.includes("'management:ogretmen-dosyasi'")&&![...navWin.AppNav.TEACHER_HIDDEN].some(x=>x.startsWith('ogretmen-dosyasi')),'Sayfa öğretmen hesabına da açık olmalı.');
  assert(shell.includes("name==='ogretmen-dosyasi'")&&shell.includes('OgretmenDosyasi.open'),'Kabukta rota tanımlı olmalı.');
  ['evrak-katalog.js?v=1','ogretmen-dosyasi-core.js?v=1','ogretmen-dosyasi.js?v=1'].forEach(f=>assert(sw.includes(`./js/modules/${f}`)&&(shell.includes(f)||fs.readFileSync('js/app-loader.js','utf8').includes(f)||ui.includes(f)),`${f} hem yüklenmeli hem önbelleğe alınmalı.`));
  Object.values(K.FORMLAR).filter(f=>f.docx).forEach(f=>assert(sw.includes(`./${DIR}${f.docx}`),`${f.docx} çevrimdışı çalışsın diye önbelleğe alınmalı.`));
  assert(!/localStorage\s*\.\s*setItem/.test(ui)&&ui.includes('KaPrefs'),'Modül tarayıcı depolamasına doğrudan yazmamalı; KaPrefs kullanmalı.');
  assert(ui.includes('remoteListen')&&ui.includes('remoteSet'),'İlerleme hesap tercih belgesine eşitlenmeli.');
  assert(ui.includes('DokumanlarService.dokumanEkle')&&ui.includes('kategori:DOSYA_KATEGORI'),'Kendi dosyaları Dökümanlar servisiyle (Supabase depolama) yüklenmeli.');
  assert(!/<style|createElement\('style'\)/.test(ui),'Stil JS içine gömülmemeli.');
  assert(css.includes('.ka-od-item')&&css.includes('.ka-od-tabs'),'Sayfa stilleri tasarım sistemi CSS dosyasında olmalı.');
  const odCss=css.slice(css.indexOf('ÖĞRETMEN DOSYASI (.ka-od-*)'));
  assert(!/#[0-9a-fA-F]{3,8}\b/.test(odCss)&&!/\d+px/.test(odCss.replace(/@media\(max-width:767px\)/g,'')),'Yeni CSS yalnız tasarım belirteçlerini kullanmalı (sabit renk/px yok).');

  console.log('Öğretmen Dosyası testleri geçti.');
})().catch(e=>{console.error(e);process.exit(1)});
