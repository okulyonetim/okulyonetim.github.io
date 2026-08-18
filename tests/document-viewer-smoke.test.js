const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('js/dokuman-okuyucu.js', 'utf8');

for (const ext of ['pdf','docx','doc','xlsx','xls','csv','txt','ppt','pptx']) {
  assert(src.includes(`'${ext}'`), `${ext} görüntüleyici kapsamından çıkmamalı.`);
}

assert(src.includes('docx.renderAsync'), 'DOCX için docx-preview kullanılmalı.');
assert(src.includes('ignoreLastRenderedPageBreak:false'), 'DOCX sayfa kırımları korunmaya çalışılmalı.');
assert(src.includes("XLSX.read(buf,{type:'array'"), 'XLS için SheetJS uyumluluk yolu bulunmalı.');
assert(src.includes('new ExcelJS.Workbook()'), 'XLSX için ExcelJS yolu bulunmalı.');
assert(src.includes('pdfjsLib.getDocument'), 'PDF uygulama içinde PDF.js ile açılmalı.');
assert(src.includes('view.officeapps.live.com'), 'Eski DOC/Office türleri için Office çevrimiçi görüntüleyici fallback bulunmalı.');
assert(src.includes('docs.google.com/gview'), 'Alternatif Google görüntüleyici fallback bulunmalı.');
assert(src.includes('Dosya otomatik olarak indirilmedi'), 'Desteklenmeyen dosya otomatik indirmeye düşmemeli.');
assert(!src.includes("window.open(url, '_blank')"), 'Belge açma doğrudan _blank ile indirme/yeni sekmeye düşmemeli.');

console.log('Belge görüntüleyici smoke testleri başarılı.');
