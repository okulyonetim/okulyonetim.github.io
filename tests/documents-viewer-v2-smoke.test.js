const fs=require('fs');
const assert=require('assert');

const documents=fs.readFileSync('js/modules/documents.js','utf8');
const viewer=fs.readFileSync('js/dokuman-okuyucu.js','utf8');

assert(documents.includes("s.src='js/dokuman-okuyucu.js'"),'Documents V2 belge görüntüleyiciyi yalnız kullanım anında lazy-load etmeli.');
assert(documents.includes("s.dataset.korukCapability='document-viewer'"),'Belge görüntüleyici capability olarak işaretlenmeli.');
assert(documents.includes("PermissionService?.can?.('documents.view','preview')"),'Belge açma documents.view preview/read/edit yetki sözleşmesine uymalı.');
assert(documents.includes('viewer?.destekliMi?.'),'Dosya türü görüntüleyici capability kontrolünden geçmeli.');
assert(documents.includes('await viewer.ac('),'Desteklenen belgeler uygulama içi görüntüleyicide açılmalı.');
assert(documents.includes("window.open(d.dosyaUrl,'_blank','noopener')"),'Desteklenmeyen veya görüntüleyici hatalı belgelerde web fallback korunmalı.');

for(const lib of ['pdf.js/3.11.174/pdf.min.js','docx-preview@0.3.6','exceljs/4.4.0/exceljs.min.js','xlsx/0.18.5/xlsx.full.min.js']) assert(viewer.includes(lib),`Belge görüntüleyici lazy bağımlılığı korunmalı: ${lib}`);
assert(viewer.includes('window.DokumanOkuyucu={'),'Görüntüleyici tek DokumanOkuyucu capability API sunmalı.');
assert(viewer.includes('function pullToRefreshAyarla(enabled)'),'Native pull-to-refresh capability fallback korunmalı.');

console.log('Documents V2 belge görüntüleyici sözleşmesi başarılı.');
