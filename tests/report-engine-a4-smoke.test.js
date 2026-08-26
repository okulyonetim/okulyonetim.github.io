const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/report-engine.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
new Function(src);
for(const token of ["A4 landscape","A4 portrait","data-report-minus","data-report-plus","data-report-fit","data-report-100","Yazdır / PDF","PrintPlugin","assets/logo.png","ÇĞİÖŞÜçğıöşü","kenarBosluk","fontSize"]){
  assert(src.includes(token),`Rapor motoru sözleşmesi eksik: ${token}`);
}
assert(src.includes("KorukPlatformAdapter?.setPullToRefreshEnabled?.(false)"),'Rapor önizlemesinde pull-to-refresh merkezi adaptör üzerinden kapanmalı.');
assert(src.includes("className='dv3'")||src.includes("className=\"dv3\""),'Rapor önizlemesi merkezi tam ekran viewer yüzeyini kullanmalı.');
assert(!src.includes("db.collection"),'Rapor motoru Firestore erişmemeli.');
assert(css.includes('--ka-report-width:210mm'),'Design System A4 genişlik tokenını korumalı.');
assert(css.includes('.dv3pdfviewport'),'A4 önizleme merkezi viewer viewport stilini kullanmalı.');
console.log('Rapor A4 önizleme/yazdırma smoke testi başarılı.');
