const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/core/schedule-report-redesign.js','utf8');
const init=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

new Function(src);

assert(src.includes("Tekli — Yatay A4"),'Tekli sınıf/öğretmen raporu yatay A4 seçeneğini göstermeli.');
assert(src.includes("İkili — Dikey A4 / sayfa başına 2"),'İkili sınıf/öğretmen raporu dikey A4 seçeneğini göstermeli.');
assert(src.includes('ka-sr-pair-page')&&src.includes('ka-sr-half'),'İkili rapor A4 sayfasını iki bağımsız bölüme ayırmalı.');
assert(src.includes("content:'KESİM'"),'İkili raporda ortadan kesme işareti bulunmalı.');
assert(src.includes('assets/logo.png')&&src.includes('individualCard'),'Her bireysel program kendi logo/başlık yapısını üretmeli.');
assert(src.includes("title='Sınıflar Ders Programı Çarşafı';yon='yatay'"),'Sınıf çarşafı yalnız yatay A4 olmalı.');
assert(src.includes("title='Öğretmenler Ders Programı Çarşafı';yon='yatay'"),'Öğretmen çarşafı yalnız yatay A4 olmalı.');
assert(src.includes('data-schedule-report-teacher-list] input:checked'),'Mevcut öğretmen checkbox seçimi korunmalı.');
assert(src.includes('İmza bölümü ekle')&&src.includes('class="sign"'),'Öğretmen çarşafı isteğe bağlı imza sütunu sunmalı.');
assert(src.includes('Geçerlilik tarihi')&&src.includes('tarihinden itibaren geçerlidir.'),'Seçilebilir geçerlilik tarihi ve alt açıklama olmalı.');
assert(src.includes('Müdür Ad Soyad')&&src.includes('data-sr-principal-title'),'Müdür ad soyad ve unvan alanları olmalı.');
assert(src.includes("background:#f3f7f5!important")&&src.includes("background:#fff!important"),'Rapor dolguları toner dostu çok açık/beyaz olmalı.');
assert(src.includes('print-color-adjust:economy'),'Siyah-beyaz baskıda ekonomik renk işleme istenmeli.');
assert(init.includes('schedule-report-redesign.js?v=918'),'Yeni rapor runtime dosyası uygulama başlangıcında yüklenmeli.');
assert(sw.includes("'./js/core/schedule-report-redesign.js?v=918'"),'Yeni rapor runtime dosyası offline precache içinde olmalı.');
const cache=sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/);assert(cache&&Number(cache[1])>=918,'Service Worker cache sürümü yeni rapor runtime için yükseltilmeli.');

console.log('Ders programı rapor yeniden tasarım sözleşmesi başarılı.');
