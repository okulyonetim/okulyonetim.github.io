const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html','utf8');
const viewer = fs.readFileSync('js/dokuman-okuyucu.js','utf8');
const documents = fs.readFileSync('js/modules/documents.js','utf8');

// Ağır belge kütüphaneleri ana HTML'i parser-blocking biçimde yüklememeli.
assert(!index.includes('<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>'), 'SheetJS ilk açılıştan çıkarılmalı.');
assert(!index.includes('<script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>'), 'ExcelJS ilk açılıştan çıkarılmalı.');
assert(!index.includes('<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>'), 'PDF.js ilk açılıştan çıkarılmalı.');
assert(!index.includes('<script src="https://cdn.jsdelivr.net/npm/docx-preview@0.3.6/dist/docx-preview.min.js"></script>'), 'docx-preview ilk açılıştan çıkarılmalı.');

// Documents modülü önce küçük kalmalı, görüntüleyici yalnız kullanıcı belge açınca gelmeli.
assert(documents.includes("s.src='js/dokuman-okuyucu.js'"), 'Belge görüntüleyici kullanım anında lazy-load edilmeli.');
assert(!documents.includes('pdfjsLib.getDocument'), 'Documents ana modülü PDF.js motorunu içine gömmemeli.');
assert(!documents.includes('new ExcelJS.Workbook()'), 'Documents ana modülü ExcelJS motorunu içine gömmemeli.');

// PDF/Excel/Word görüntüleyici kendi ağır bağımlılıklarını ihtiyaç anında yüklemeli.
assert(viewer.includes("const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'"), 'PDF.js lazy-load URL tanımı bulunmalı.');
assert(viewer.includes('async function pdfReady()'), 'PDF.js hazır olma yükleyicisi bulunmalı.');
assert(viewer.includes('await pdfReady();'), 'PDF açılırken PDF.js beklenmeli.');
assert(viewer.includes("const EXCELJS='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'"), 'ExcelJS lazy-load URL tanımı bulunmalı.');
assert(viewer.includes("const SHEETJS='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'"), 'SheetJS lazy-load URL tanımı bulunmalı.');
assert(viewer.includes("const DOCX='https://cdn.jsdelivr.net/npm/docx-preview@0.3.6/dist/docx-preview.min.js'"), 'docx-preview lazy-load URL tanımı bulunmalı.');
assert(viewer.includes('async function excelJsReady()'), 'ExcelJS lazy yükleyicisi bulunmalı.');
assert(viewer.includes('async function sheetJsReady()'), 'SheetJS lazy yükleyicisi bulunmalı.');
assert(viewer.includes('async function docxReady()'), 'Word görüntüleyici lazy yükleyicisi bulunmalı.');
assert(viewer.includes('await sheetJsReady();'), 'Eski Excel/CSV fallback yolu SheetJS yüklemeli.');

console.log('Lazy belge kütüphaneleri V2 smoke testleri başarılı.');
