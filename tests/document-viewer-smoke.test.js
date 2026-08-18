const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('js/dokuman-okuyucu.js', 'utf8');

for (const ext of ['pdf','docx','doc','xlsx','xls','csv','txt','ppt','pptx']) {
  assert(src.includes(`'${ext}'`), `${ext} görüntüleyici kapsamından çıkmamalı.`);
}

assert(src.includes('docx.renderAsync'), 'DOCX için docx-preview kullanılmalı.');
assert(src.includes('wordSigdir'), 'Word görüntüleyicide tam sayfaya sığdırma bulunmalı.');
assert(src.includes('dv3wordZoomLabel'), 'Word görüntüleyicide zoom göstergesi bulunmalı.');
assert(src.includes('wordZoomUygula'), 'Word görüntüleyicide yakınlaştırma/uzaklaştırma bulunmalı.');
assert(src.includes('align-items:flex-start!important'), 'Geniş Word sayfasının sol kenarı kesilmemeli.');
assert(src.includes('ignoreLastRenderedPageBreak:false'), 'DOCX sayfa kırımları korunmaya çalışılmalı.');
assert(src.includes("XLSX.read(buf,{type:'array'"), 'XLS için SheetJS uyumluluk yolu bulunmalı.');
assert(src.includes('new ExcelJS.Workbook()'), 'XLSX için ExcelJS yolu bulunmalı.');
assert(src.includes('pdfjsLib.getDocument'), 'PDF uygulama içinde PDF.js ile açılmalı.');
assert(src.includes("if(e==='doc')return docAc()"), 'DOC uzantısı içerik tespit yoluna gitmeli.');
assert(src.includes("if(zipMi(buf))return renderDocx(buf)"), 'Yanlış/çift uzantılı DOCX dosyası içerikten tespit edilmeli.');
assert(src.includes("if(e==='xls')return xlsAc()"), 'XLS uzantısı içerik tespit yoluna gitmeli.');
assert(src.includes("if(zipMi(buf))return xlsxAc(buf)"), 'Yanlış/çift uzantılı XLSX dosyası içerikten tespit edilmeli.');
assert(src.includes('cMapUrl:'), 'PDF CMap desteği bulunmalı.');
assert(src.includes('standardFontDataUrl:'), 'PDF standard font veri yolu bulunmalı.');
assert(src.includes('useSystemFonts:true'), 'PDF sistem fontları etkin olmalı.');
assert(!src.includes('view.officeapps.live.com'), 'Firebase Storage belgeleri Office iframe görüntüleyicisine gönderilmemeli.');
assert(src.includes('Otomatik indirme yapılmadı.'), 'Desteklenmeyen dosya otomatik indirmeye düşmemeli.');
assert(!src.includes("window.open(url, '_blank')"), 'Belge açma doğrudan _blank ile indirme/yeni sekmeye düşmemeli.');

console.log('Belge görüntüleyici smoke testleri başarılı.');
