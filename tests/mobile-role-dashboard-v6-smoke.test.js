const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('js/dashboard-mobile-v4.js', 'utf8');

assert(src.includes('Mobil Rol Bazlı Ana Sayfa v6'), 'Mobil rol bazlı dashboard v6 imzası bulunmalı.');
assert(src.includes("matchMedia('(min-width: 1024px)')") || src.includes('matchMedia("(min-width: 1024px)")'), 'Yeni dashboard yalnızca 1024px altındaki mobil/tablet görünümde çalışmalı.');
assert(src.includes('function isAdmin()'), 'Admin ve öğretmen ayrımı bulunmalı.');
assert(src.includes('adminSections'), 'Admin ana sayfa bölümleri bulunmalı.');
assert(src.includes('teacherSections'), 'Öğretmen ana sayfa bölümleri bulunmalı.');

assert(src.includes('heroHavaSatir'), 'Hava durumu widgetı korunmalı.');
assert(src.includes('zilWidget'), 'Canlı zil sayacı korunmalı.');
assert(src.includes('Deneme') && src.includes('Duyuru') && src.includes('Anket'), 'Dinamik deneme/duyuru/anket alanı bulunmalı.');
assert(src.includes('HABERLER'), 'Kayan haber altyazısı bulunmalı.');

assert(src.includes('Personel') && src.includes('Öğrenci') && src.includes('Sınıflar') && src.includes('Servisler'), 'Admin okul bilgi kartları eksiksiz olmalı.');
assert(src.includes('Bugünün Nöbetçileri'), 'Bugünün nöbetçileri bölümü bulunmalı.');
assert(src.includes('Bugün İzinli'), 'İzinli öğretmen bölümü bulunmalı.');
assert(src.includes('Haftanın Nöbet Programı'), 'Haftalık nöbet programı bulunmalı.');
assert(src.includes('nobetciAmir') || src.includes('Nöbetçi Amir'), 'Nöbetçi amiri dışlama mantığı için alan kontrolü bulunmalı.');
assert(src.includes('Yaklaşan Yazılı Sınavlar'), 'Admin yaklaşan yazılı sınavları bulunmalı.');
assert(src.includes('Şu Anki Dersler'), 'Admin anlık ders görünümü bulunmalı.');

assert(src.includes('Dersim ve Bu Haftanın Kazanımları') || src.includes('Öğrenme Çıktıları') || src.includes('ÖĞRENME ÇIKTILARI'), 'Öğretmen haftalık kazanım/öğrenme çıktısı alanı bulunmalı.');
assert(src.includes('yillikPlanHaftaAc'), 'Bugünkü derslerden yıllık planın güncel haftasına geçiş bulunmalı.');
assert(src.includes('Bugünkü Derslerim'), 'Öğretmen günlük ders listesi bulunmalı.');
assert(src.includes('Nöbet defterini doldurdum'), 'Öğretmen nöbet defteri kontrol kutusu bulunmalı.');
assert(src.includes('Sınavlarım'), 'Öğretmene özel sınav listesi bulunmalı.');
assert(src.includes('Teslim Edilecek Evraklar'), 'Öğretmene özel teslim evrakları bölümü bulunmalı.');
assert(src.includes('Notlarım'), 'Kişisel notlar bölümü bulunmalı.');
assert(src.includes('Hızlı İşlemler'), 'Düzenlenebilir hızlı işlemler alanı bulunmalı.');
assert(src.includes('Takvim'), '7 günlük takvim alanı bulunmalı.');
assert(src.includes('db6-backtop'), 'Yukarı dön butonu bulunmalı.');

// Bu dosya alt navigasyonu yeniden üretmemeli/değiştirmemeli. Üst yorumdaki
// "Alt navigasyona dokunmaz" açıklaması serbest; gerçek bottom-nav seçicisi yasak.
assert(!src.includes('.bottom-nav') && !src.includes("querySelector('.bottom-nav')") && !src.includes('querySelector(".bottom-nav")'), 'Mobil rol dashboard alt navigasyon DOM yapısını değiştirmemeli.');

console.log('Mobil rol bazlı dashboard v6 smoke testleri başarılı.');
