const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const source=fs.readFileSync('js/modules/people-classic-ui.js','utf8');
const helperStart=source.indexOf('function localDateKey(');
const helperEnd=source.indexOf('function teacherCard(',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'İzin tarih yardımcıları people-classic-ui içinde bulunmalı.');
const helpers=source.slice(helperStart,helperEnd);
const sandbox={Date};
vm.createContext(sandbox);
vm.runInContext(helpers+';this.leaveRecordActiveOn=leaveRecordActiveOn;',sandbox);
const active=sandbox.leaveRecordActiveOn;

assert.strictEqual(active({baslangic:'2026-07-02',bitis:'2026-07-03'},'2026-07-02'),true,'Eski alan adlarında başlangıç günü izinli olmalı.');
assert.strictEqual(active({baslangic:'2026-07-02',bitis:'2026-07-03'},'2026-07-03'),true,'Eski alan adlarında bitiş günü izinli olmalı.');
assert.strictEqual(active({baslangic:'2026-07-02',bitis:'2026-07-03'},'2026-09-13'),false,'Geçmiş izin kartta aktif görünmemeli.');
assert.strictEqual(active({baslangicTarihi:'2026-09-14',bitisTarihi:'2026-09-15'},'2026-09-13'),false,'Gelecek izin henüz aktif görünmemeli.');
assert.strictEqual(active({baslangicTarihi:'2026-09-13',bitisTarihi:'2026-09-15'},'2026-09-13'),true,'Yeni alan adlarında tarih aralığı kapsayıcı olmalı.');
assert.strictEqual(active({baslangic:'2026-09-13'},'2026-09-13'),true,'Bitiş tarihi olmayan kayıt yalnız başlangıç gününde aktif olmalı.');
assert.strictEqual(active({baslangic:'2026-09-13'},'2026-09-14'),false,'Bitiş tarihi olmayan kayıt süresiz izin üretmemeli.');
assert.strictEqual(active({},'2026-09-13'),false,'Tarihsiz kayıt süresiz izin üretmemeli.');

console.log('Öğretmen aktif izin rozeti tarih aralığı regresyon testi başarılı.');
