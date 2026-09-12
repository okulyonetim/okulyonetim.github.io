const fs=require('fs');
const assert=require('assert');
const entry=fs.readFileSync('js/modules/teacher-list.js','utf8');
const page=fs.readFileSync('js/modules/student-list-page.js','utf8');
new Function(entry);
new Function(page);

assert(entry.includes('claimStudentListSurface()'),'Öğrenci listesi async yükleme başlamadan kendi yüzeyini sahiplenmeli.');
assert(entry.includes("STUDENT_PAGE='js/modules/student-list-page.js'"),'Öğrenci listesi ayrı canonical sayfa modülünden yüklenmeli.');
const runtime=entry.replace(/\/\*[\s\S]*?\*\//g,'');
assert(!runtime.includes('MutationObserver'),'Eski DOM yaması/MutationObserver runtime mimarisi geri dönmemeli.');
assert(!runtime.includes('data-teacher-list-runtime-added'),'Çalışma zamanında sınıf kartı yamalama geri dönmemeli.');
assert(page.includes("document.getElementById('v2ModuleRoot')"),'Canonical öğrenci listesi doğrudan shell modül köküne sahip olmalı.');
assert(!page.includes("document.getElementById('toolsContent')"),'Öğrenci listesi generic Tools/Kontrol Listeleri içeriğine bağımlı olmamalı.');
assert(page.includes("arr('siniflar').forEach"),'Sınıf seçimi doğrudan okulun tüm sınıflarından üretilmeli.');
assert(page.includes('data-sl-width')&&page.includes('data-sl-align'),'Sütun genişliği ve hizalama canonical editörde görünür olmalı.');
assert(page.includes("logoGoster:false,baslikGoster:false,tarihGoster:false"),'Liste raporu ortak ReportEngine üst başlığını kapatıp tek başlık üretmeli.');
assert(page.includes("global.AppLoader?.loadScript?.('js/modules/report-engine.js')"),'A4 önizleme rapor motorunu gerektiğinde yüklemeli.');
console.log('Öğrenci Listesi canonical route + tek rapor başlığı sözleşmesi başarılı.');
