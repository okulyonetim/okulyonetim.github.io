const fs=require('fs');
const assert=require('assert');

const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const teacherList=fs.readFileSync('js/modules/teacher-list.js','utf8');

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

console.log('Öğrenci araçları canonical UI routing sözleşmesi başarılı.');
