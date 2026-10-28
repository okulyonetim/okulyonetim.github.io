/* Yazılı sınav formu: ders seçilince o sınıfta o derse giren öğretmen ders programından otomatik gelir. */
const assert=require('assert'),fs=require('fs');
const src=fs.readFileSync('js/modules/academic.js','utf8');
const fn=src.slice(src.indexOf('function lessonTeachers('),src.indexOf('function writtenModal('));
const data={ogretmenler:[{id:'o1'},{id:'o2'},{id:'o3'}],dersProgrami:[
 {sinif:'5-A',ders:'Fen Bilimleri',ogretmenId:'o1'},{sinif:'5-B',ders:'Fen Bilimleri',ogretmenId:'o1'},{sinif:'6-A',ders:'Fen Bilimleri',ogretmenId:'o2'},
 {sinif:'5-A',ders:'Matematik',ogretmenId:'o2'},{sinif:'5-B',ders:'Matematik',ogretmenId:'o3'},{sinif:'5-A',ders:'Türkçe',ogretmenId:''},{sinif:'5-A',ders:'Din',ogretmenId:'yok'}]};
const lessonTeachers=new Function('arr',fn+';return lessonTeachers')(t=>data[t]||[]);
const eq=(a,b,m)=>assert.deepStrictEqual(a,b,m);
eq(lessonTeachers(['5-A'],'Fen Bilimleri'),{durum:'hazir',ids:['o1']},'Tek sınıf, tek öğretmen.');
eq(lessonTeachers(['5-A','5-B'],'Fen Bilimleri'),{durum:'hazir',ids:['o1']},'Birden çok sınıfta aynı öğretmen tek öğretmen sayılır.');
eq(lessonTeachers(['5-A','6-A'],'Fen Bilimleri').durum,'coklu','Farklı öğretmenler: elle seçilir.');
eq(lessonTeachers(['5-A','5-B'],'Matematik').ids.sort(),['o2','o3']);
eq(lessonTeachers(['5-A'],'Resim'),{durum:'yok',ids:[]},'Programda olmayan ders.');
eq(lessonTeachers(['5-A'],'Türkçe').durum,'yok','Öğretmeni boş program satırı sayılmaz.');
eq(lessonTeachers(['5-A'],'Din').durum,'yok','Kayıtlı olmayan öğretmen önerilmez.');
eq(lessonTeachers([],'Fen Bilimleri').durum,'','Sınıf seçilmemişse öneri yok.');
eq(lessonTeachers(['5-A'],'').durum,'','Ders seçilmemişse öneri yok.');
eq(lessonTeachers(['5/a'],' fen bilimleri ').ids,['o1'],'Sınıf ve ders yazımı büyük/küçük harf, / ve boşluktan etkilenmez.');
/* Form bağlantısı */
const form=src.slice(src.indexOf('function writtenModal('),src.indexOf('function trialModal('));
assert(form.includes('data-w-teacher-hint')&&form.includes("lessonSel.addEventListener('change'")&&form.includes("querySelectorAll('[data-exam-class]').forEach(c=>c.addEventListener('change'"),'Ders ve sınıf değişince öğretmen güncellenmeli.');
assert(form.includes('if(teacherLocked)return;'),'Öğretmen hesabında (öğretmen kendine kilitli) otomatik doldurma devre dışı olmalı.');
assert(form.includes("sel.addEventListener('change',()=>{elle=true"),'Elle seçilen öğretmen sınıf değişiminde korunmalı.');
const loader=fs.readFileSync('js/app-loader.js','utf8');
assert(loader.includes('academic.js?v=896'),'academic.js sürümü yenilenmeli.');
console.log('yazili-ogretmen-otomatik: OK');
