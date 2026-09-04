const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('js/modules/tools.js','utf8');

test('admin student absence view supports class filtering',()=>{
  assert.match(src,/pageHead\('Öğrenci Devamsızlığı'/);
  assert.match(src,/<option value="">Tüm sınıflar<\/option>/);
  assert.match(src,/id="studentAttendanceClass"/);
  assert.match(src,/selectedClass\?all\.filter\(x=>String\(x\.sinifId\)===String\(selectedClass\)\):all/);
});

test('absence summary follows selected class and keeps guardian workflow',()=>{
  assert.match(src,/bilgilendirildi=list\.filter\(x=>x\.gonderildi===true\)\.length/);
  assert.match(src,/BİLGİLENDİRİLDİ/);
  assert.match(src,/BEKLİYOR/);
  assert.match(src,/data-att-contact/);
  assert.match(src,/ka-badge--danger/);
  assert.match(src,/ka-badge--warning/);
});