const fs = require('fs');
const assert = require('assert');

const js = fs.readFileSync('js/dashboard-home.js', 'utf8');
const css = fs.readFileSync('css/dashboard-home.css', 'utf8');
const colors = fs.readFileSync('css/dashboard-home-colors.css', 'utf8');
const loader = fs.readFileSync('js/ui-stability-fixes.js', 'utf8');
const sw = fs.readFileSync('service-worker.js', 'utf8');

assert(js.includes('__KORUK_HOME_OWNER__'), 'Ana sayfa tek renderer sahibi olmalı.');
assert(js.includes("classList.add('kh-home')"), 'Temiz ana sayfa scope sinifi eksik.');
assert(js.includes('replaceChildren(shell,top)'), 'Eski dashboard DOM temizlenip tek shell kurulmalı.');
assert(js.includes('claimDashboardRenderer'), 'Mobilde eski renderDashboard yerine temiz renderer sahiplenilmeli.');
assert(js.includes('Şu Anki Dersler') && js.includes('Haftanın Nöbet Programı'), 'Admin operasyonel kartları eksik.');
assert(js.includes('Yaklaşan Yazılı Sınavlar') && js.includes('Ders Programım') && js.includes('Notlarım'), 'Admin alt kartları eksik.');
assert(js.includes('Şu Anki Dersim') && js.includes('Bugünkü Derslerim'), 'Öğretmen ders/kazanım akışı eksik.');
assert(js.includes('Nöbet defterini doldurdum'), 'Öğretmen nöbet tiki eksik.');
assert(js.includes('Teslim Edilecek Evraklar') && js.includes('Hızlı İşlemler') && js.includes('Takvim'), 'Öğretmen takip alanları eksik.');
assert(js.includes('facebook|youtube'), 'Sosyal bağlantılarda Facebook/YouTube filtreleme kuralı olmalı.');
assert(js.includes('sonHavaVerisi') && js.includes('suankiDersDurumu'), 'Hava ve zil mevcut gerçek servisleri kullanmalı.');
assert(!js.includes('db6-shell') && !js.includes('dashboard-mobile-v4'), 'Eski dashboard katmanına bağımlılık olmamalı.');

assert(js.includes("const teachers=arr('ogretmenler')"), 'Okul özetindeki öğretmen sayısı yalnız öğretmenler koleksiyonundan gelmeli.');
assert(!js.includes("...arr('personelListesi')"), 'Okul özetinde öğretmen dışı personel sayılmamalı.');
assert(js.includes("['users','Öğretmen'"), 'Özet kartı Personel değil Öğretmen olarak etiketlenmeli.');
assert(js.includes('kh-student-split'), 'Öğrenci kartında ilkokul/ortaokul yatay ayrımı bulunmalı.');

assert(css.includes('#tab-panel.kh-home'), 'CSS yalnız temiz dashboard scopeunda olmalı.');
assert(css.includes('[data-theme="dark"] #tab-panel.kh-home'), 'Koyu tema kontrastı tanımlı olmalı.');
assert(css.includes('.kh-live-stack') && css.includes('grid-template-columns:1fr'), 'Hava ve zil alt alta olmalı.');
assert(css.includes('.kh-social') && css.includes('repeat(4'), 'Sosyal bağlantılar dört sütunlu olmalı.');
assert(css.includes('@keyframes khTicker'), 'Haber ticker animasyonu bulunmalı.');
assert(colors.includes('.kh-student-split') && colors.includes('.kh-level-icon'), 'Öğrenci alt kırılımının ikonlu stilleri eksik.');
assert(colors.includes('.kh-section-title>svg'), 'Renkli bölüm ikon sistemi eksik.');

assert(loader.includes('dashboard-home.css') && loader.includes('dashboard-home.js'), 'Loader yalnız yeni dashboard dosyalarını yüklemeli.');
assert(!loader.includes('dashboard-mobile-v4') && !loader.includes('dashboard-mobile-clean.js'), 'Loader eski dashboard dosyalarını yüklememeli.');
assert(sw.includes('dashboard-home.css') && sw.includes('dashboard-home.js'), 'PWA önbelleğinde yeni dashboard bulunmalı.');
assert(!sw.includes('dashboard-mobile-v4') && !sw.includes('dashboard-mobile-clean.js'), 'PWA önbelleğinde eski dashboard olmamalı.');

console.log('Temiz dashboard smoke testleri başarılı.');
