const fs=require('fs');
const assert=require('assert');

const entry=fs.readFileSync('js/modules/teacher-list.js','utf8');
const core=fs.readFileSync('js/modules/teacher-list-core.js','utf8');
const page=fs.readFileSync('js/modules/student-list-page.js','utf8');
new Function(entry);
new Function(core);
new Function(page);

assert(entry.includes("const STUDENT_PAGE='js/modules/student-list-page.js'"),'Liste oluşturucu bağımsız canonical sayfayı yüklemeli.');
assert(entry.includes('claimStudentListSurface()'),'İlk açılışta öğrenci listesi kendi yüzeyini hemen sahiplenmeli.');
assert(page.includes("arr('siniflar').forEach"),'Sınıf seçimi yalnız öğretmenin ders programıyla sınırlanmamalı; okulun tüm sınıfları canonical sayfadan gelmeli.');
assert(page.includes("global.AppLoader?.loadScript?.('js/modules/report-engine.js')"),'A4 önizleme rapor motorunu gerektiğinde yüklemeli.');
assert(page.includes('data-sl-report'),'A4 önizleme butonu canonical sayfada bulunmalı.');
assert(page.includes('data-sl-width')&&page.includes('data-sl-align'),'Mobilde sütun genişliği/hizalama araçları canonical editörde görünür olmalı.');

for(const token of ['data-teacher-list-align','data-teacher-list-width','function cycleAlign','function setWidth','ReportEngine.printReport']) {
  assert(core.includes(token),`Ortak liste çekirdeği davranışı korunmalı: ${token}`);
}

console.log('Öğrenci Listesi Oluşturucu ilk açılış + tüm sınıflar + A4 + sütun araçları canonical sözleşmesi başarılı.');
