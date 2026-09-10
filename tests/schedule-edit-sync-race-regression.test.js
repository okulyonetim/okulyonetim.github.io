const fs=require('fs');
const assert=require('assert');

const core=fs.readFileSync('js/core/core.js','utf8');
const academic=fs.readFileSync('js/modules/academic.js','utf8');

new Function(core);
new Function(academic);

assert(core.includes('queueMutationChain=Promise.resolve()'),'Queue değişiklikleri seri hale getirilmiyor.');
assert(core.includes('function mutateQueue(u,mutator)'),'Queue için atomik mutasyon kapısı eksik.');
assert(core.includes('const finalQueue=await mutateQueue'),'Flush sonunda güncel queue yeniden uzlaştırılmıyor.');
assert(core.includes('if(!snapshotIds.has(op.qid)){next.push(op);continue}'),'Flush sırasında eklenen yeni kayıt işlemi korunmuyor.');
assert(core.includes('dataType:type'),'Yerel yazma işlemleri veri tipiyle işaretlenmiyor.');
assert(core.includes('const dataRevisions=new Map(),activeDeviceWrites=new Map()'),'Yerel değişiklik revizyon koruması eksik.');
assert(core.includes('dataRevision(name)!==started[name]||deviceWriteActive(name)||blocked.has(name)'),'Uzak veri, aktif veya bekleyen yerel değişikliğin üstüne yazılabiliyor.');
assert(core.includes('const names=syncNames(types),baseline=revisionSnapshot(names);await flushWrites();return pull(names,baseline)'),'Senkron başlangıç revizyonu flush öncesinden korunmuyor.');

assert(academic.includes("ders:ov.querySelector('[data-lesson]').value"),'Ders düzenleme formu seçilen yeni dersi payload’a almıyor.');
assert(academic.includes("ogretmenId:ov.querySelector('[data-teacher]').value"),'Ders düzenleme formu seçilen yeni öğretmeni payload’a almıyor.');
assert(academic.includes('await DersProgramiService.kaydet(existing?.id||null,veri)'),'Ders düzenleme mevcut kayıt kimliğiyle güncelleme yapmıyor.');

console.log('Ders programı düzenleme + local-first sync yarış koruması başarılı.');
