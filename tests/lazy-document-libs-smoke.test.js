const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html','utf8');
const viewer = fs.readFileSync('js/dokuman-okuyucu.js','utf8');
const yillik = fs.readFileSync('js/yillik-plan.js','utf8');

// Ağır belge kütüphaneleri ana HTML'i parser-blocking biçimde yüklememeli.
assert(!index.includes('<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>'), 'SheetJS ilk açılıştan çıkarılmalı.');
assert(!index.includes('<script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>'), 'ExcelJS ilk açılıştan çıkarılmalı.');
assert(!index.includes('<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>'), 'PDF.js ilk açılıştan çıkarılmalı.');
assert(!index.includes('<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>'), 'Mammoth ilk açılıştan çıkarılmalı.');

// PDF/Excel görüntüleyici kendi ihtiyacını açılış anında yüklemeli.
assert(viewer.includes("const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'"), 'PDF.js lazy-load URL tanımı bulunmalı.');
assert(viewer.includes('async function pdfReady()'), 'PDF.js hazır olma yükleyicisi bulunmalı.');
assert(viewer.includes('await pdfReady();'), 'PDF açılırken PDF.js beklenmeli.');
assert(viewer.includes("const EXCELJS='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'"), 'ExcelJS lazy-load URL tanımı bulunmalı.');
assert(viewer.includes("const SHEETJS='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'"), 'SheetJS lazy-load URL tanımı bulunmalı.');
assert(viewer.includes('async function excelJsReady()'), 'ExcelJS lazy yükleyicisi bulunmalı.');
assert(viewer.includes('async function sheetJsReady()'), 'SheetJS lazy yükleyicisi bulunmalı.');
assert(viewer.includes('await sheetJsReady();'), 'Eski Excel/CSV fallback yolu SheetJS yüklemeli.');

// Yıllık Plan Word içe aktarma Mammoth'u yalnız kullanıcı o akışı açınca yüklemeli.
assert(yillik.includes('function _yplMammothYukle()'), 'Yıllık Plan Mammoth lazy yükleyicisi bulunmalı.');
assert(yillik.includes("sc.src='https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'"), 'Mammoth CDN yalnız kullanım anında eklenmeli.');
assert(yillik.includes('async function yillikPlanWordIceAktarAc()'), 'Word içe aktarma açılışı async lazy-load desteklemeli.');
assert(yillik.includes('await _yplMammothYukle();'), 'Word içe aktarma öncesi Mammoth beklenmeli.');

console.log('Lazy belge kütüphaneleri smoke testleri başarılı.');
