/* Maarif'in Kalbinde Oyun yıllık planı (ilkokul + ortaokul): Öğretmen Dosyası'nda hazır Word formu, alanlar uygulamadan dolar */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const JSZip=require('../assets/vendor/jszip.min.js');
const kat=fs.readFileSync('js/modules/evrak-katalog.js','utf8'),core=fs.readFileSync('js/modules/ogretmen-dosyasi-core.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
const ctx={console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(kat,ctx);vm.runInContext(core,ctx);ctx.JSZip=JSZip;
const K=ctx.EvrakKatalog,C=ctx.OgretmenDosyasiCore;

/* katalog */
const madde=K.KATALOG.find(m=>m.donem==='basi'&&/Maarif'in Kalbinde Oyun/.test(m.ad));
assert(madde,'Sene başı listesinde "Maarif\'in Kalbinde Oyun Yıllık Planı" maddesi olmalı.');
assert.deepStrictEqual(JSON.parse(JSON.stringify(madde.formlar)),['oyun-ilkokul','oyun-ortaokul'],'Madde iki hazır forma bağlı.');
assert.strictEqual(K.formlar(madde,'2026-2027').length,2,'2026-2027’de iki form görünür.');
assert.strictEqual(K.formlar(madde,'2027-2028').length,0,'Yıla özgü form başka yılda gizlenir.');
const ids=K.KATALOG.map(m=>m.id);
assert.strictEqual(new Set(ids).size,ids.length,'Madde kimlikleri benzersiz kalmalı.');

/* şablonlar: alanlar yerinde, doldurunca kalıntı yok */
(async()=>{
 for(const [anahtar,dosya] of [['oyun-ilkokul','ilkokul'],['oyun-ortaokul','ortaokul']]){
  const f=K.FORMLAR[anahtar],yol=K.DOSYA_KOKU+f.docx;
  assert(f.docx===`maarifin-kalbinde-oyun-yillik-plan-${dosya}.docx`&&fs.existsSync(yol),`${anahtar}: şablon dosyası var.`);
  assert(sw.includes(`./${yol}`),`${anahtar}: önbelleğe alınmalı.`);
  const buf=fs.readFileSync(yol),z=await JSZip.loadAsync(buf),xml=await z.file('word/document.xml').async('string');
  ['{{OKUL_BUYUK}}','{{AD_SOYAD}}','{{MUDUR}}'].forEach(a=>assert(xml.includes(a),`${anahtar}: ${a} alanı olmalı.`));
  assert(!/……………… OKULU/.test(xml),`${anahtar}: okul satırı alana çevrilmiş olmalı.`);
  const v=C.degerler({okul:'Koruk İlk - Ortaokulu',ad:'ayşe KAYA',brans:'Matematik',mudur:'bilal baykar',yil:'2026-2027'});
  const dolu=await JSZip.loadAsync(Buffer.from(await (await C.docxDoldur(buf,v)).arrayBuffer())),out=await dolu.file('word/document.xml').async('string');
  assert(!/\{\{|\}\}/.test(out),`${anahtar}: doldurulmuş belgede {{…}} kalmamalı.`);
  assert(out.includes('KORUK İLK - ORTAOKULU')&&out.includes('Ayşe KAYA')&&out.includes('Bilal BAYKAR'),`${anahtar}: okul, öğretmen ve müdür adı yazılmalı.`);
  assert(out.includes('MAARİFİN KALBİNDE OYUN')&&out.includes('2026-2027 EĞİTİM-ÖĞRETİM YILI'),`${anahtar}: plan içeriği korunmalı.`);
  const bos=await JSZip.loadAsync(Buffer.from(await (await C.docxDoldur(buf,C.degerler({}))).arrayBuffer())),bosXml=await bos.file('word/document.xml').async('string');
  assert(!/\{\{/.test(bosXml)&&bosXml.includes('……………………………'),`${anahtar}: bilgi yoksa noktalı kalır.`);
 }
 console.log('maarif-oyun-plani: OK');
})().catch(e=>{console.error(e);process.exit(1)});
