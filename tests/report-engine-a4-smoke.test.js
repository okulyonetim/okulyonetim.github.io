const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/report-engine.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
new Function(src);
for(const token of ["A4 landscape","A4 portrait","data-report-minus","data-report-plus","data-report-fit","data-report-100","Yazdır / PDF","PrintPlugin","assets/logo.png","ÇĞİÖŞÜçğıöşü","kenarBosluk","fontSize"]){
  assert(src.includes(token),`Rapor motoru sözleşmesi eksik: ${token}`);
}
for(const token of ['imagesToPdf','mergePdfs','previewPdfBlob','savePdfBlob','archivePdf','openPdfTools','jspdf.umd.min.js','pdf-lib@1.17.1','PDFDocument.load','copyPages','data-pdf-mode="images"','data-pdf-mode="merge"']){
  assert(src.includes(token),`PDF araçları tek motor sözleşmesi eksik: ${token}`);
}
assert(src.includes("AppLoader?.loadScript"),'PDF kütüphaneleri ayrı yerel loader/yama dosyası yerine merkezi AppLoader üzerinden lazy-load edilmeli.');
assert(src.includes("global.ReportEngine={")&&src.includes('imagesToPdf,mergePdfs'),'PDF araçları ReportEngine kanonik API içinde yaşamalı.');
assert(src.includes("DokumanlarService?.dokumanEkle"),'Hazır PDF doğrudan mevcut Dökümanlar arşivine kaydedilebilmeli.');
assert(src.includes("KorukPlatformAdapter?.setPullToRefreshEnabled?.(false)"),'Rapor/PDF önizlemesinde pull-to-refresh merkezi adaptör üzerinden kapanmalı.');
assert(src.includes("className='dv3'")||src.includes("className=\"dv3\""),'Rapor/PDF önizlemesi merkezi tam ekran viewer yüzeyini kullanmalı.');
assert(!src.includes("db.collection"),'Rapor motoru Firestore erişmemeli.');
assert(!src.includes('PdfExportLibs'),'Ayrı PDF loader katmanı geri dönmemeli.');
assert(css.includes('--ka-report-width:210mm'),'Design System A4 genişlik tokenını korumalı.');
assert(css.includes('.dv3pdfviewport'),'A4 önizleme merkezi viewer viewport stilini kullanmalı.');
console.log('Rapor + PDF birleştirme/resimden PDF tek-motor smoke testi başarılı.');
