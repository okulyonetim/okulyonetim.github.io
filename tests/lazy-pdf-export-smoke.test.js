const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html','utf8');
const loader = fs.readFileSync('js/pdf-export-libs.js','utf8');
const akademik = fs.readFileSync('js/akademik-takvim.js','utf8');
const dok = fs.readFileSync('js/dokuman-pdf-tools.js','utf8');
const oturma = fs.readFileSync('js/sinif-oturma.js','utf8');
const liste = fs.readFileSync('js/ogretmen-liste-olusturucu.js','utf8');

assert(!index.includes('jspdf/2.5.1/jspdf.umd.min.js'), 'jsPDF ilk açılış head zincirinden çıkarılmalı.');
assert(!index.includes('jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'), 'autoTable ilk açılıştan çıkarılmalı.');
assert(!index.includes('html2canvas/1.4.1/html2canvas.min.js'), 'html2canvas ilk açılıştan çıkarılmalı.');

assert(loader.includes("jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'"), 'Ortak loader jsPDF kaynağını bilmeli.');
assert(loader.includes('async function hazir(secenekler)'), 'Ortak PDF loader hazır fonksiyonu bulunmalı.');
assert(loader.includes('if(o.autoTable)'), 'autoTable yalnız istenirse yüklenmeli.');
assert(loader.includes('if(o.html2canvas)'), 'html2canvas yalnız istenirse yüklenmeli.');
assert(loader.includes('bekleyen = new Map()'), 'Aynı script için yinelenen ağ istekleri tekilleştirilmeli.');
assert(akademik.includes("s.src = 'js/pdf-export-libs.js'"), 'Ortak PDF loader uygulamada yüklenmeli.');

assert(dok.includes('await window.PdfExportLibs.hazir();'), 'Resimden PDF jsPDF yüklenmesini beklemeli.');
assert(oturma.includes('await window.PdfExportLibs.hazir({html2canvas:true});'), 'Sınıf oturma PDF’i jsPDF+html2canvas yüklenmesini beklemeli.');
assert(liste.includes('await window.PdfExportLibs.hazir({autoTable:true});'), 'Öğretmen liste PDF’i jsPDF+autoTable yüklenmesini beklemeli.');

console.log('PDF dışa aktarma lazy-load smoke testleri başarılı.');
