/* Veli toplantısı tutanağı Word (.docx) üretimi: paket yapısı, sayfa kenar boşlukları, yeni sayfa kuralı, imza hizası, kaçış. */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const JSZip=require('../assets/vendor/jszip.min.js');

const kaydedilen=[];
const win={console,JSZip,Blob,URL,setTimeout,
  uygulamaDosyaKaydet:async(b64,ad,tur,x)=>{kaydedilen.push({b64,ad,tur,x});return true},
  FileReader:class{readAsDataURL(b){b.arrayBuffer().then(buf=>{this.result='data:;base64,'+Buffer.from(buf).toString('base64');this.onload()})}}};
win.window=win;win.globalThis=win;vm.createContext(win);
vm.runInContext(fs.readFileSync('js/modules/veli-toplantisi-word.js','utf8'),win,{filename:'veli-toplantisi-word.js'});
const W=win.VeliToplantisiWord;
assert(W&&W.tutanakDocx&&W.belgeXml&&W.indir,'Word modülü yüklenmeli.');

const model=(o={})=>({yil:'2026-2027',okul:'ÇAMLIK İLKOKULU',sinif:'4/A',baslik:'I. DÖNEM VELİ TOPLANTI TUTANAĞI',unvan:'Sınıf Öğretmeni',ogretmen:'Hasret ÇEÇEN',
  tarih:'…… / …… / 20……',saat:'………',mudur:'Ali VELİ',tarihBos:'…… / …… / 20……',
  gundem:['Açılış','Sınıf kuralları & <düzen>'],
  maddeler:[{b:'Açılış',p:['Toplantı açıldı.','İkinci paragraf.']},{b:'Sınıf kuralları & <düzen>',p:['Kurallar "anlatıldı" & <onaylandı>.']}],
  kararlar:['Birinci karar.','İkinci karar.'],...o});

/* XML iyi biçimli mi: etiketleri yığınla eşle */
function dengeli(xml){
  const st=[];
  for(const m of xml.matchAll(/<(\/?)([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g)){
    if(m[4])continue;
    if(m[1]){assert.strictEqual(st.pop(),m[2],`Kapanış etiketi eşleşmiyor: ${m[2]}`)}else st.push(m[2]);
  }
  assert.strictEqual(st.length,0,'Açık etiket kalmamalı.');
}

(async()=>{
  const blob=await W.tutanakDocx(model());
  const zip=await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  const adlar=Object.keys(zip.files);
  assert.deepStrictEqual(adlar.sort(),['[Content_Types].xml','_rels/.rels','word/_rels/document.xml.rels','word/document.xml','word/styles.xml'].sort(),'Paket yalnız gerekli parçaları içerir (klasör girdisi yok).');
  for(const a of adlar)dengeli(await zip.file(a).async('string'));
  const d=await zip.file('word/document.xml').async('string');

  /* içerik */
  const metin=d.replace(/<w:tab\/>/g,' ').replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'');
  ['2026-2027 EĞİTİM-ÖĞRETİM YILI','ÇAMLIK İLKOKULU','4/A SINIFI','I. DÖNEM VELİ TOPLANTI TUTANAĞI','SINIF / ŞUBE','TARİH','SAAT','SINIF ÖĞRETMENİ','Hasret ÇEÇEN','GÜNDEM MADDELERİ','GÜNDEM MADDELERİNİN GÖRÜŞÜLMESİ','Toplantı açıldı.','İkinci paragraf.','ALINAN KARARLAR','Birinci karar.','İkinci karar.','UYGUNDUR','Ali VELİ','Okul Müdürü'].forEach(x=>assert(metin.includes(x),`Word çıktısında "${x}" yok.`));
  assert(d.includes('&amp;')&&d.includes('&lt;düzen&gt;')&&d.includes('&quot;anlatıldı&quot;')||d.includes('"anlatıldı"'),'Özel karakterler kaçışlanır.');
  assert(!/<düzen>/.test(d)&&!d.includes('{{')&&!d.includes('{OGRETMEN}'),'Ham etiket / yer tutucu kalmaz.');
  assert(/1\.\s*Açılış/.test(metin)&&/2\.\s*Sınıf kuralları/.test(metin),'Görüşme başlıkları numaralı.');

  /* Alınan Kararlar yeni sayfada, toplantı başlığıyla; kutu iki kez */
  assert.strictEqual((d.match(/<w:pageBreakBefore\/>/g)||[]).length,1,'Tek zorunlu sayfa sonu: kararlar sayfası.');
  const i=d.indexOf('<w:pageBreakBefore/>'),j=d.indexOf('ALINAN KARARLAR');
  assert(i>0&&i<j,'Sayfa sonu karar başlığından önce.');
  assert.strictEqual((metin.match(/I\. DÖNEM VELİ TOPLANTI TUTANAĞI/g)||[]).length,2,'Toplantı başlığı kararlar sayfasında yinelenir.');
  assert(d.slice(i,j).includes('I. DÖNEM VELİ TOPLANTI TUTANAĞI'),'Kararlar sayfası başlıkla başlar.');
  assert(!d.slice(0,i).includes('ALINAN KARARLAR'));

  /* sayfa: A4, üst/alt boşluk en az 10 mm (1 mm = 56,7 twips) */
  const s=/<w:pgMar [^>]*>/.exec(d)[0],pg=/<w:pgSz [^>]*>/.exec(d)[0];
  assert(/w:w="11906"/.test(pg)&&/w:h="16838"/.test(pg),'A4.');
  const tw=a=>Number(new RegExp(`w:${a}="(\\d+)"`).exec(s)[1]);
  assert(tw('top')>=567&&tw('bottom')>=567,'Her sayfada üst ve alt boşluk ≥ 10 mm.');

  /* imzalar: öğretmen solda, müdür sağda (UYGUNDUR + tarih + ad + unvan), kenarlıksız iki hücre */
  const imza=d.slice(d.lastIndexOf('<w:tbl>'));
  const hucre=imza.split('<w:tc>').slice(1);
  assert.strictEqual(hucre.length,2,'İmza tablosu iki hücre.');
  assert(hucre[0].includes('Hasret ÇEÇEN')&&hucre[0].includes('Sınıf Öğretmeni')&&!hucre[0].includes('UYGUNDUR'),'Öğretmen solda.');
  assert(hucre[1].includes('UYGUNDUR')&&hucre[1].includes('…… / …… / 20……')&&hucre[1].includes('Ali VELİ')&&hucre[1].includes('Okul Müdürü'),'Müdür sağda; UYGUNDUR ve tarih ile.');
  assert(!/<w:jc w:val="(?:center|right)"\/>/.test(imza),'İmza adları ortalanmaz / sağa yaslanmaz.');
  assert(!/w:val="single"/.test(/<w:tblBorders>[\s\S]*?<\/w:tblBorders>/.exec(imza)?.[0]||''),'İmza tablosu kenarlıksız.');

  /* madde sayısı değişince belge de değişir; boş liste güvenli */
  const kucuk=W.belgeXml(model({gundem:[],maddeler:[],kararlar:[]}));dengeli(kucuk);
  assert(kucuk.includes('ALINAN KARARLAR')&&kucuk.includes('GÜNDEM MADDELERİ'));
  const cok=W.belgeXml(model({maddeler:Array.from({length:20},(_,n)=>({b:`Madde ${n+1}`,p:['Metin.']})),gundem:Array.from({length:20},(_,n)=>`Madde ${n+1}`)}));
  assert(/20\.\s*Madde 20/.test(cok.replace(/<w:tab\/>/g,' ').replace(/<[^>]+>/g,'')));

  /* indirme: uygulamada yerel kaydet (base64 içinde geçerli zip) */
  await W.indir(model(),'Veli_Toplantisi_Tutanagi-4_A.docx');
  assert.strictEqual(kaydedilen.length,1);assert.strictEqual(kaydedilen[0].ad,'Veli_Toplantisi_Tutanagi-4_A.docx');assert.strictEqual(kaydedilen[0].tur,W.DOCX_TURU);
  assert((await JSZip.loadAsync(Buffer.from(kaydedilen[0].b64,'base64'))).file('word/document.xml'),'Kaydedilen dosya geçerli bir .docx paketi.');

  /* kaynak: depolamaya yazmaz, ağ çağrısı yok */
  const kaynak=fs.readFileSync('js/modules/veli-toplantisi-word.js','utf8');
  assert(!/localStorage|fetch\(|XMLHttpRequest/.test(kaynak),'Word modülü depolamaya yazmaz, ağa çıkmaz.');
  console.log('Veli Toplantısı Word testleri geçti.');
})().catch(e=>{console.error(e);process.exit(1)});
