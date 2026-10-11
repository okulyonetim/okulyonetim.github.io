const fs=require('fs');
const assert=require('assert');
const rubric=fs.readFileSync('js/modules/rubric-settings-core.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const css=fs.readFileSync('css/design-system-base.css','utf8');
assert(rubric.includes("classChecks('siniflar',r.sinif?[r.sinif]:[],false)"),'Maarif düzenleme formu çoklu sınıf seçimini korumalı.');
assert(rubric.includes("if(type==='maarifRapor'){const classes=getAll(fd,'siniflar')"),'Maarif kaydetme akışı seçili sınıfları ayrı ele almalı.');
assert(rubric.includes("CizelgelerService.cokluKayitOlustur(type,fresh,'sinif',extras)"),'Düzenlemede eklenen sınıflar ayrı takip kayıtları oluşturmalı.');
/* Regresyon: bu sayfalar routeModule() ile açılır, bu yüzden ShellUI'nin genel geri
 * çubuğu (data-ka-shell-back) zaten görünür. Sayfanın kendi "← Geri" düğmesi
 * (eskiden cizelgeBackNav()) bununla aynı ShellUI.back() işlevini çağırıyordu —
 * ekranda İKİ geri düğmesi üst üste görünüyordu. Kaldırıldı; artık sayfa başlığında
 * ikinci bir geri düğmesi YOK.*/
assert(!rubric.includes('data-cizelge-back'),'Çizelge sayfalarında artık ikinci (yinelenen) bir geri düğmesi olmamalı — ShellUI genel geri çubuğu yeterli.');
assert(rubric.includes("ka-cizelge-modal-open")&&rubric.includes("function lockModal()"),'Çizelge modalı arka sayfa kaymasını kilitlemeli.');
assert(shell.includes('[data-cizelge-cancel]'),'Uygulama geri hareketi açık çizelge modalını önce kapatmalı.');
assert(css.includes('body.ka-cizelge-modal-open{overflow:hidden!important')&&css.includes('[data-cizelge-modal] .ka-modal__body'),'Modal scroll zinciri arka sayfaya taşmamalı.');
console.log('Maarif multi-class, modal lock and schedule back navigation OK');
