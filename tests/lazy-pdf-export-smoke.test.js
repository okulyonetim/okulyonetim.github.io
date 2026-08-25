const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html','utf8');
const loader = fs.readFileSync('js/pdf-export-libs.js','utf8');
const liste = fs.readFileSync('js/ogretmen-liste-olusturucu.js','utf8');

assert(!index.includes('jspdf/2.5.1/jspdf.umd.min.js'), 'jsPDF ilk açılış head zincirinden çıkarılmalı.');
assert(!index.includes('jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'), 'autoTable ilk açılıştan çıkarılmalı.');
assert(!index.includes('html2canvas/1.4.1/html2canvas.min.js'), 'html2canvas ilk açılıştan çıkarılmalı.');

assert(loader.includes("jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'"), 'Ortak loader jsPDF kaynağını bilmeli.');
assert(loader.includes('async function hazir(secenekler)'), 'Ortak PDF loader hazır fonksiyonu bulunmalı.');
assert(loader.includes('if(o.autoTable)'), 'autoTable yalnız istenirse yüklenmeli.');
assert(loader.includes('if(o.html2canvas)'), 'html2canvas yalnız istenirse yüklenmeli.');
assert(loader.includes('bekleyen = new Map()'), 'Aynı script için yinelenen ağ istekleri tekilleştirilmeli.');
assert(liste.includes('await window.PdfExportLibs.hazir({autoTable:true});'), 'Öğretmen liste PDF’i jsPDF+autoTable yüklenmesini beklemeli.');

console.log('PDF dışa aktarma lazy-load smoke testleri başarılı.');
