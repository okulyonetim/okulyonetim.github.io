/* Maarif'in Kalbinde Oyun yıllık planı: sayfadaki önizleme / PDF belgesi, Word şablonuyla aynı içerik, özelleştirilebilir imza bölümü (ekran, PDF ve Word) */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const JSZip=require('../assets/vendor/jszip.min.js');
const read=p=>fs.readFileSync(p,'utf8');
const J=x=>JSON.parse(JSON.stringify(x));

const planSrc=read('js/modules/maarif-oyun-plan.js'),uiSrc=read('js/modules/maarif-oyun.js'),shell=read('js/core/shell-ui.js'),sw=read('service-worker.js'),css=read('css/design-system-base.css'),
 odSrc=read('js/modules/ogretmen-dosyasi.js'),coreSrc=read('js/modules/ogretmen-dosyasi-core.js'),katSrc=read('js/modules/evrak-katalog.js');
const ctx={console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(katSrc,ctx);vm.runInContext(coreSrc,ctx);vm.runInContext(planSrc,ctx);ctx.JSZip=JSZip;
const K=ctx.EvrakKatalog,C=ctx.OgretmenDosyasiCore,M=ctx.MaarifOyunPlan;
new Function(uiSrc);

const docXml=async yol=>(await JSZip.loadAsync(fs.readFileSync(yol))).file('word/document.xml').async('string');
const duzMetin=x=>x.replace(/<w:br\/>/g,'\n').replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const sablon=plan=>K.DOSYA_KOKU+K.FORMLAR[`oyun-${plan}`].docx;

/* ── yapı ── */
assert.deepStrictEqual(Object.keys(M.PLAN),['ilkokul','ortaokul']);
assert.strictEqual(M.PLAN.ilkokul.sutunlar.length,6);assert.strictEqual(M.PLAN.ortaokul.sutunlar.length,5);
assert.strictEqual(M.PLAN.ilkokul.satirlar.filter(r=>Array.isArray(r)).length,37,'İlkokul: 37 haftalık satır.');
assert.strictEqual(M.PLAN.ilkokul.satirlar.filter(r=>typeof r==='string').length,3,'İlkokul: 3 tatil satırı.');
assert.strictEqual(M.PLAN.ortaokul.satirlar.filter(r=>Array.isArray(r)).length,10,'Ortaokul: 10 aylık satır.');
assert.strictEqual(M.PLAN.ortaokul.satirlar.filter(r=>typeof r==='string').length,3,'Ortaokul: 3 tatil satırı.');
M.PLAN.ilkokul.satirlar.filter(r=>Array.isArray(r)).forEach(r=>{assert.strictEqual(r.length,8);[0,1,3,4,5,6].forEach(i=>assert(String(r[i]).trim(),`İlkokul ${r[0]} ${r[1]}: ${i}. alan dolu olmalı.`))});
M.PLAN.ortaokul.satirlar.filter(r=>Array.isArray(r)).forEach(r=>{assert.strictEqual(r.length,5);r.forEach(t=>assert(String(t).trim(),`Ortaokul ${r[0]}: boş alan olmamalı.`))});

/* ── Word şablonuyla aynı içerik ── */
(async()=>{
 for(const plan of ['ilkokul','ortaokul']){
  const P=M.PLAN[plan],metin=duzMetin(await docXml(sablon(plan)));
  [P.ust,P.baslik,P.alt,P.not,...P.sutunlar,...P.esaslar,'Uygulama Esasları ve Notlar'].forEach(t=>assert(metin.includes(t),`${plan}: Word şablonunda "${t.slice(0,50)}" geçmeli.`));
  P.bilgi.forEach(([e,d])=>{assert(metin.includes(e),`${plan}: ${e}`);if(d!=null)assert(metin.includes(d),`${plan}: ${d}`)});
  P.satirlar.forEach(r=>(typeof r==='string'?[r]:r).filter(Boolean).forEach(t=>assert(metin.includes(t),`${plan}: Word şablonunda "${t.slice(0,50)}" geçmeli.`)));
  /* satır sayısı: şablondaki tablo satırları (başlık hariç) */
  const xml=await docXml(sablon(plan)),tablo=xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g)[2];
  assert.strictEqual((tablo.match(/<w:tr[ >]/g)||[]).length-1,P.satirlar.length,`${plan}: tablo satır sayısı şablonla aynı.`);
  /* varsayılan imza düzeni, şablondaki imza satırıyla aynı yazıyı üretir */
  const v=C.degerler({okul:'Koruk İlkokulu',ad:'Sedat KARAGÖZ',mudur:'Bilal BAYKAR'}),buf=fs.readFileSync(sablon(plan));
  const imza=M.imzaCozumle(M.varsayilanImza(plan),{ogretmen:'Sedat KARAGÖZ',mudur:'Bilal BAYKAR'});
  const duz=duzMetin(await(await JSZip.loadAsync(Buffer.from(await(await C.docxDoldur(buf,v)).arrayBuffer()))).file('word/document.xml').async('string'));
  const donusmus=duzMetin(await(await JSZip.loadAsync(Buffer.from(await(await C.docxDoldur(buf,v,undefined,undefined,x=>M.imzaTablosunuDegistir(x,imza))).arrayBuffer()))).file('word/document.xml').async('string'));
  const imzaBolumu=t=>t.slice(t.indexOf('Plan bir öneridir')).replace(/\s+/g,' ').trim();
  const sonSatirlar=t=>t.split('\n').map(s=>s.trim()).filter(Boolean).slice(-8);
  assert.deepStrictEqual(sonSatirlar(donusmus),sonSatirlar(duz),`${plan}: varsayılan imza düzeni şablondaki imza satırıyla aynı yazı.`);
  assert(imzaBolumu(donusmus)===imzaBolumu(duz)&&!/\{\{/.test(donusmus),`${plan}: imza bölümü ve alanlar.`);
 }

 /* ── özel imza: Word çıktısı ── */
 const buf=fs.readFileSync(sablon('ilkokul')),v=C.degerler({okul:'Koruk İlkokulu',ad:'Sedat KARAGÖZ',mudur:'Bilal BAYKAR'});
 const ozel=M.imzaCozumle({imzalar:[{ad:null,unvan:'1. Sınıf Öğretmeni'},{ad:'Fatma <YILMAZ> & Ali',unvan:'2. Sınıf Öğretmeni'},{ad:'',unvan:'Müdür Yardımcısı'}],onay:{goster:true,etiket:'OLUR',tarih:'2026-09-14',ad:null,unvan:'Okul Müdürü'}},{ogretmen:'Sedat KARAGÖZ',mudur:'Bilal BAYKAR'});
 const blob=await C.docxDoldur(buf,v,undefined,undefined,x=>M.imzaTablosunuDegistir(x,ozel));
 const xml=await(await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()))).file('word/document.xml').async('string');
 const son=xml.slice(xml.lastIndexOf('<w:tbl>')),metin=duzMetin(son);
 assert.deepStrictEqual(metin.split('\n').map(s=>s.trim()).filter(Boolean),['Sedat KARAGÖZ','1. Sınıf Öğretmeni','Fatma <YILMAZ> & Ali','2. Sınıf Öğretmeni','……………………………','Müdür Yardımcısı','OLUR','14 / 09 / 2026','Bilal BAYKAR','Okul Müdürü'],'Özel imza düzeni Word’e yazılır.');
 assert((son.match(/<w:tc>/g)||[]).length===4&&(son.match(/<w:gridCol /g)||[]).length===4,'4 sütun: 3 imza + onay.');
 assert(son.includes('Fatma &lt;YILMAZ&gt; &amp; Ali'),'Metin XML için kaçışlanır.');
 assert((xml.match(/<w:tbl>/g)||[]).length===4&&xml.includes('KORUK İLKOKULU'),'Diğer tablolar ve alanlar korunur.');
 assert(xml.endsWith('</w:body></w:document>')&&xml.indexOf('<w:sectPr',xml.lastIndexOf('</w:tbl>'))>0,'Belge sonundaki sayfa ayarı yerinde.');
 /* dengeli etiketler */
 ['w:tbl','w:tr','w:tc','w:p','w:r'].forEach(e=>assert.strictEqual((son.match(new RegExp(`<${e}[ >]`,'g'))||[]).length,(son.match(new RegExp(`</${e}>`,'g'))||[]).length,`${e} etiketleri dengeli.`));
 /* onay bloğu kapalı + imza sahibi yok → tablo kaldırılır; yalnız onay → tek sütun */
 const bos=await C.docxDoldur(buf,v,undefined,undefined,x=>M.imzaTablosunuDegistir(x,M.imzaCozumle({imzalar:[],onay:{goster:false}},{})));
 const bosXml=await(await JSZip.loadAsync(Buffer.from(await bos.arrayBuffer()))).file('word/document.xml').async('string');
 assert.strictEqual((bosXml.match(/<w:tbl>/g)||[]).length,3,'İmza hiç yoksa son tablo kaldırılır.');
 assert.strictEqual(M.imzaXml(M.imzaCozumle({imzalar:[],onay:{goster:true,etiket:'',tarih:'',ad:'',unvan:''}},{})).match(/<w:tc>/g).length,1,'Yalnız onay: tek sütun.');
 assert.strictEqual(M.imzaTablosunuDegistir('<w:body></w:body>',ozel),'<w:body></w:body>','Tablo yoksa metin değişmez.');
 console.log('maarif-oyun-yillik-plan: Word OK');
})().catch(e=>{console.error(e);process.exit(1)});

/* ── imza düzeni: varsayılan, temizleme, çözümleme ── */
const V0=M.varsayilanImza('ilkokul');
assert.deepStrictEqual(J(V0),{imzalar:[{ad:null,unvan:'Sınıf Öğretmeni'},{ad:'',unvan:'Sınıf Öğretmeni'},{ad:'',unvan:'Sınıf Öğretmeni'}],onay:{goster:true,etiket:'UYGUNDUR',tarih:'',ad:null,unvan:'Okul Müdürü'}},'İlkokul: 3 sınıf öğretmeni + müdür onayı.');
assert.deepStrictEqual(J(M.varsayilanImza('ortaokul').imzalar),[{ad:null,unvan:'Hazırlayan Öğretmen'},{ad:'',unvan:'Hazırlayan Öğretmen'}],'Ortaokul: 2 hazırlayan öğretmen.');
assert.deepStrictEqual(J(M.imzaTemizle('ilkokul',null)),J(V0));assert.deepStrictEqual(J(M.imzaTemizle('ilkokul','x')),J(V0));assert.deepStrictEqual(J(M.imzaTemizle('ilkokul',{imzalar:'x'})),J(V0),'Bozuk kayıt varsayılana döner.');
const T=M.imzaTemizle('ilkokul',{imzalar:Array.from({length:12},(_,i)=>({ad:i===0?null:'A'.repeat(200),unvan:'U'.repeat(200)})).concat([null,5]),onay:{goster:false,etiket:'E'.repeat(99),tarih:'14.09.2026',ad:7,unvan:'x'}});
assert.strictEqual(T.imzalar.length,M.ENCOK_IMZA,`En çok ${M.ENCOK_IMZA} imza.`);
assert(T.imzalar[0].ad===null&&T.imzalar[1].ad.length===M.AD_ENCOK&&T.imzalar[1].unvan.length===M.UNVAN_ENCOK,'Uzun alanlar kısaltılır, null ad korunur.');
assert(T.onay.goster===false&&T.onay.etiket.length===M.ETIKET_ENCOK&&T.onay.tarih===''&&T.onay.ad==='7','Onay: bozuk tarih temizlenir, etiket kısaltılır.');
const C0=M.imzaCozumle(V0,{ogretmen:' Sedat KARAGÖZ ',mudur:'Bilal BAYKAR'});
assert.deepStrictEqual(J(C0.imzalar.map(s=>s.ad)),['Sedat KARAGÖZ','',''],'Boş ad boş kalır, null ad öğretmenden gelir.');assert.strictEqual(C0.onay.ad,'Bilal BAYKAR');
/* null ad yer değiştirse de plan hazırlayanı gösterir */
const yer=M.imzaCozumle({imzalar:[{ad:'',unvan:'a'},{ad:null,unvan:'b'}],onay:{goster:true,etiket:'',tarih:'',ad:'Müdür',unvan:''}},{ogretmen:'Sedat'});
assert.deepStrictEqual(J(yer.imzalar.map(s=>s.ad)),['','Sedat'],'Sıra değişse de null ad plan hazırlayanı gösterir.');
assert.strictEqual(M.tarihMetni('2026-09-14'),'14 / 09 / 2026');assert.strictEqual(M.tarihMetni(''),'…… / 09 / 2026');assert.strictEqual(M.tarihMetni('14.09.2026'),'…… / 09 / 2026');

/* ── belge gövdesi (önizleme ve PDF) ── */
const m={okul:'Koruk İlk - Ortaokulu',ogretmen:'Sedat KARAGÖZ',imza:C0};
for(const plan of ['ilkokul','ortaokul']){
 const b=M.belge(plan,{...m,okul:'Koruk İlkokulu'}),P=M.PLAN[plan];
 assert(b.includes('KORUK İLKOKULU')&&b.includes(P.baslik)&&b.includes(P.alt),`${plan}: üst başlık.`);
 assert.strictEqual((b.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr/g)||[]).length,P.satirlar.length,`${plan}: tüm satırlar.`);
 assert.strictEqual((b.match(/class="mpl-ara"/g)||[]).length,3,`${plan}: tatil satırları.`);
 assert.strictEqual((b.match(/<col>/g)||[]).length,P.sutunlar.length,`${plan}: sütun sayısı.`);
 assert.strictEqual((b.match(/class="mpl-madde"/g)||[]).length,P.esaslar.length,`${plan}: uygulama esasları.`);
 assert(b.includes('<small>PLANI HAZIRLAYAN')&&b.includes('<b>Sedat KARAGÖZ</b>'),`${plan}: plan hazırlayan bilgi şeridinde.`);
 assert(b.includes('mpl-imzalar')&&b.indexOf('mpl-esaslar')<b.indexOf('mpl-imzalar'),`${plan}: imzalar esaslardan sonra.`);
 assert(!b.includes('{{')&&!/null|undefined/.test(b),`${plan}: alan kalıntısı yok.`);
}
const hepsi=M.belge('ilkokul',{...m,okul:'<i>x</i>',ogretmen:'"&<'});
assert(!/<[İI]>X/i.test(hepsi)&&hepsi.includes('&lt;İ&gt;X&lt;/İ&gt;')&&hepsi.includes('&quot;&amp;&lt;'),'Metinler kaçışlanır (okul adı büyük harfe çevrilir).');
const iz=M.imzaHtml(C0);
assert((iz.match(/class="mpl-imza"/g)||[]).length===3&&iz.includes('mpl-imza--onay')&&iz.includes('UYGUNDUR')&&iz.includes('…… / 09 / 2026'),'3 imza + onay bloğu.');
assert(iz.indexOf('Sedat KARAGÖZ')<iz.indexOf('mpl-imza--onay'),'Onay bloğu sağda (sonda).');
assert(!M.imzaHtml({imzalar:C0.imzalar,onay:{...C0.onay,goster:false}}).includes('mpl-imza--onay'),'Onay kapalıysa yazılmaz.');
assert(!M.imzaHtml({imzalar:[{ad:'A',unvan:''}],onay:{goster:true,etiket:'',tarih:'',ad:'B',unvan:''}}).includes('<b'),'Boş unvan ve ibare yazılmaz.');
assert.strictEqual(M.imzaHtml({imzalar:[],onay:{goster:false}}),'','İmza yoksa bölüm de yok.');
assert(!M.belge('ilkokul',{...m,imza:{imzalar:[],onay:null}}).includes('mpl-imzalar'),'İmzasız belgede imza bölümü yok.');
assert.strictEqual(M.belge('yok',m),'');

/* ── sayfa: kaynak sözleşmeleri ── */
assert(/ensure\(\)\.imza\[plan\]|s\.imza\[plan\]/.test(uiSrc)&&/KaPrefs\?\.set\?\.\(a,j\)/.test(uiSrc)&&/remoteSet/.test(uiSrc)&&/remoteListen/.test(uiSrc),'İmza düzeni KaPrefs ile yerelde ve hesapta saklanır.');
assert(/maarifOyunImza_\$\{slug\(V\.YIL\)\}_\$\{plan\}/.test(uiSrc),'Anahtar: yıl + plan.');
assert(/function yazdir\(plan\)[\s\S]*?yon:'yatay'[\s\S]*?akis:true,kenarBosluk:10,ozellestirilebilir:false/.test(uiSrc),'PDF çıktısı yatay, 10 mm kenar boşluğu, özelleştirme penceresiz.');
assert(/data-mok-onizle/.test(uiSrc)&&/data-mok-kagit/.test(uiSrc)&&/MP\.belge\(plan,model\(plan\)\)/.test(uiSrc),'Sayfada A4 önizleme var.');
assert(/data-mok-imza-ekle/.test(uiSrc)&&/data-mok-imza-sil/.test(uiSrc)&&/data-mok-imza-yer/.test(uiSrc)&&/data-mok-onay-goster/.test(uiSrc)&&/data-mok-imza-sifirla/.test(uiSrc),'İmza düzenleyici: ekle / sil / sırala / onay / varsayılan.');
assert(/A4_GENISLIK=297\*96\/25\.4/.test(uiSrc)&&/setProperty\('--mok-olcek'/.test(uiSrc),'Önizleme kutuya sığdırılır.');
assert(!/localStorage\.setItem/.test(planSrc+uiSrc)&&!/<style/i.test(planSrc+uiSrc)&&!/style="/.test(planSrc+uiSrc),'Modül depolama yazmaz, stil gömmez.');
assert(/xmlDonustur/.test(odSrc)&&/docxDoldur\(await r\.arrayBuffer\(\),C\(\)\.degerler\(b\),satirlar,undefined,xmlDonustur\)/.test(odSrc),'Öğretmen Dosyası, belge dönüştürücüyü Word hazırlamaya iletir.');
assert(/async function docxDoldur\(tampon,v,satirlar,gruplar,donustur\)/.test(coreSrc)&&/word\/document\.xml'&&typeof donustur==='function'/.test(coreSrc),'Çekirdek dönüştürücüyü alanlar yazıldıktan sonra uygular.');
assert(shell.includes('maarif-oyun-plan.js?v=1')&&shell.includes('report-engine.js?v=9')&&sw.includes('./js/modules/maarif-oyun-plan.js?v=1'),'Rota yükler, önbelleğe alınır.');
assert(/ogretmen-dosyasi-core\.js\?v=4/.test(odSrc)&&sw.includes('ogretmen-dosyasi-core.js?v=4'),'Çekirdek pini yükseltildi.');

/* ── CSS ── */
const bas=css.indexOf("/* ===== A4 — Maarif'in Kalbinde Oyun yıllık planı (.mpl-*)"),son=css.indexOf('/* ===== A4 — Ders Kesim Raporu (.dkr-*)');
assert(bas>0&&son>bas,'mpl-* stil bloğu var.');
const mpl=css.slice(bas,son);
assert(!/\d(?:\.\d+)?px/.test(mpl)&&!/#[0-9a-fA-F]{3,8}\b/.test(mpl),'Kâğıt stili sabit px / renk içermez.');
assert(/\.mpl-tablo thead\{display:table-header-group\}/.test(mpl)&&/\.mpl-tablo tr\{break-inside:avoid/.test(mpl),'Tablo başlığı her sayfada tekrarlanır, satır bölünmez.');
assert(/\.mpl-imzalar\{[^}]*justify-content:space-around[^}]*break-inside:avoid/.test(mpl)&&/\.mpl-imza\{flex:1 1 0/.test(mpl),'İmzalar eşit sütunlarda, sayfa sonunda bölünmez.');
const ek=css.slice(css.indexOf("/* ===== MAARİF'İN KALBİNDE OYUN › yıllık plan"),bas);
assert(/\.mok-onizle__olcek\{zoom:var\(--mok-olcek,1\)/.test(ek)&&/\.mok-kagit\{[^}]*width:297mm/.test(ek),'Önizleme A4 genişliğinde, ölçekle küçülür.');
assert(!/\d(?:\.\d+)?px/.test(ek.replace(/@media\([^)]*\)\{[\s\S]*?\n\}/g,''))&&!/#[0-9a-fA-F]{3,8}\b/.test(ek),'Ekran stili sabit px / renk içermez.');
console.log('maarif-oyun-yillik-plan: OK');
