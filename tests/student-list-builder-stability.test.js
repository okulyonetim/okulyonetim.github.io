const fs=require('fs');
const assert=require('assert');

const entry=fs.readFileSync('js/modules/teacher-list.js','utf8');
const core=fs.readFileSync('js/modules/teacher-list-core.js','utf8');
new Function(entry);
new Function(core);

assert(entry.includes("const CORE='js/modules/teacher-list-core.js'"),'Liste oluşturucu canonical çekirdeği kararlı lazy entry üzerinden yüklemeli.');
assert(entry.includes('async open(...args){await loadCore()'),'İlk açılış canonical çekirdeğin yüklenmesini beklemeli.');
assert(entry.includes("arr('siniflar').forEach"),'Sınıf seçimi yalnız öğretmenin ders programıyla sınırlanmamalı; okulun tüm sınıfları eklenmeli.');
assert(entry.includes("[data-teacher-list-class-card][data-teacher-list-runtime-added=\"1\"]"),'Sonradan eklenen tüm-sınıf kartları seçilebilir olmalı.');
assert(entry.includes("loadScript?.('js/modules/report-engine.js')")||entry.includes("loadScript('js/modules/report-engine.js')"),'A4 önizleme rapor motorunu gerektiğinde yüklemeli.');
assert(entry.includes("[data-teacher-list-report]"),'A4 önizleme butonu için güvenli yeniden deneme bulunmalı.');
assert(entry.includes(".ka-teacher-list-column__tools")&&entry.includes("setProperty('display','grid','important')"),'Mobilde sütun genişliği/hizalama araçları görünür tutulmalı.');

for(const token of ['data-teacher-list-align','data-teacher-list-width','function cycleAlign','function setWidth','ReportEngine.printReport']) {
  assert(core.includes(token),`Canonical liste çekirdeği davranışı korunmalı: ${token}`);
}

console.log('Öğrenci Liste Oluşturucu ilk açılış + tüm sınıflar + A4 + sütun araçları sözleşmesi başarılı.');
