const fs=require('fs');
const assert=require('assert');

const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const teacherList=fs.readFileSync('js/modules/teacher-list.js','utf8');
const tools=fs.readFileSync('js/modules/tools.js','utf8');

assert(shell.includes("page==='student-attendance'"),'Öğrenci Yoklama bağımsız route olarak kalmalı.');
assert(shell.includes("StudentPages?.open?.('attendance',title)"),'Yoklama yalnız StudentPages attendance motoruna yönlenmeli.');
assert(shell.includes("page==='student-list'"),'Öğrenci Listesi route sözleşmesi bulunmalı.');
assert(shell.includes('OgretmenListeUI?.open?.()'),'Öğrenci Listesi zengin OgretmenListeUI motoruna yönlenmeli.');
assert(shell.includes("page==='homework'||page==='grades'"),'Ödev/Not route sözleşmesi bulunmalı.');
assert(shell.includes('OdevNotUI?.open?.(studentPages[page])'),'Ödev/Not sayfaları zengin OdevNotUI motoruna yönlenmeli.');
assert(!shell.includes('StudentPages?.open?.(studentPages[page],title)'),'Dört öğrenci aracını basit StudentPages motoruna zorlayan eski routing geri dönmemeli.');

assert(teacherList.includes('function closeUI()'),'Liste Oluşturucu dinleyici lifecycle kapatma işlevi bulunmalı.');
assert(teacherList.includes('close:closeUI'),'OgretmenListeUI close API sunmalı.');
assert(teacherList.includes('get page(){return page}'),'Ödev/Not motoru aktif sayfasını lifecycle sahibine bildirmeli.');
assert(shell.includes('global.OdevNotUI?.page'),'Shell kaydedilmemiş Ödev/Not taslağını sayfa değişiminden önce kontrol etmeli.');
assert(shell.includes("global.OdevNotUI.close?.()===false"),'Kullanıcı sayfadan çıkmayı iptal ederse routing durmalı.');
assert(shell.includes("global.OgretmenListeUI?.close?.()"),'Liste Oluşturucu sayfadan ayrılırken dinleyicisini kapatmalı.');

// StudentPages artık yalnız Yoklama motorudur. Liste ve çizelge UI kopyaları geri dönmemeli.
assert(tools.includes("if(page!=='attendance')throw new Error('unsupported-student-page')"),'StudentPages yalnız attendance sayfasını kabul etmeli.');
assert(tools.includes("subscribe(['data.siniflar','data.veliler','data.yoklama'])"),'Yoklama yalnız gerekli cihaz verilerine abone olmalı.');
for(const legacy of ['function renderStudentList()','function createBookModal(type)','async function renderBookPage()']) {
  assert(!tools.includes(legacy),`Emekliye ayrılan StudentPages UI geri dönmemeli: ${legacy}`);
}
assert(!tools.includes("currentPage==='student-list'")&&!tools.includes("currentPage==='homework'||currentPage==='grades'"),'StudentPages lifecycle tekrar Liste/Ödev/Not sahibi olmamalı.');

// Genel ToolsModule içinde üçüncü bir Ödev/Not motoru bulunmamalı; veri servisi ortak kalmalı.
for(const duplicate of ['data-tools-tab="gradebooks"','function gradeTitle(t)','function gradeTable(t,k)','function gradeCard(t,k)','function renderGradebooks()','function bindGradebooks()','data-grade-cell','data-grade-open']) {
  assert(!tools.includes(duplicate),`Genel Tools içinde duplicate Ödev/Not UI geri dönmemeli: ${duplicate}`);
}
assert(tools.includes('prepareGradebooks'),'Canonical OdevNotUI için ortak local-first gradebook hazırlığı korunmalı.');
assert(tools.includes('OdevNotCizelgeleriService'),'Canonical gradebook service korunmalı.');

console.log('Öğrenci araçları tek canonical UI motoru ve attendance-only StudentPages sözleşmesi başarılı.');

assert(tools.includes("attendanceDraftKey")&&tools.includes("data-att-status=\"${k}\"")&&tools.includes('data-att-save'),'Yoklama referans butonlu durum seçimi ve tek toplu Kaydet akışını canonical StudentPages içinde taşımalı.');
assert(tools.includes('ka-attendance-summary')&&tools.includes("counts={toplam:students.length,var:0,yok:0,gec:0,izinli:0}"),'Yoklama Toplam/Var/Yok/Geç/İzinli canlı özetini canonical renderer içinde üretmeli.');
assert(tools.includes("gunOzetiGetir?.(selectedDate)")&&tools.includes("gununDevamsizlariGetir?.(selectedDate)")&&tools.includes('data-att-admin-view'),'Yönetici Tüm Sınıflar ve Devamsızlar görünümü mevcut YoklamaService APIlerinden beslenmeli.');
assert(!tools.includes('attendanceStatusOptions('),'Eski öğrenci başına select ile anında kayıt yoklama görünümü geri dönmemeli.');
const design=fs.readFileSync('css/design-system.css','utf8');
assert(design.includes('STUDENT ATTENDANCE — REFERENCE VISIBLE WORKSPACE')&&design.includes('.ka-attendance-status.is-var.is-selected')&&design.includes('.ka-attendance-savebar'),'Yoklama açık/koyu uyumlu görünür sözleşmesi tek design-system içinde bulunmalı.');
