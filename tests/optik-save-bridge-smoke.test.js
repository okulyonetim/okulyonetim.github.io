const fs = require('fs');
const assert = require('assert');

const optikApp = fs.readFileSync('optik/js/app.js', 'utf8');
const disaAktar = fs.readFileSync('optik/js/disaAktar.js', 'utf8');
const anaApp = fs.readFileSync('js/app.js', 'utf8');
const optikHtml = fs.readFileSync('optik/index.html', 'utf8');

// Optik ekran DisaAktar köprüsünü yüklemeli.
assert(optikHtml.includes('js/disaAktar.js'), 'Optik ekran DisaAktar kayıt köprüsünü yüklemeli.');

// Boş ve toplu form PDF'leri ortak kayıt yolundan geçmeli.
assert(optikApp.includes("window.DisaAktar && typeof window.DisaAktar.dosyaKaydet === 'function'"), 'Optik PDF kaydı DisaAktar köprüsünü kullanmalı.');
assert(optikApp.includes("await _zamanAsimliBekle(_pdfKaydet(doc"), 'Form PDF kayıtları zaman aşımlı ortak _pdfKaydet yolundan geçmeli.');
assert(optikApp.includes('formPdfOlustur'), 'Boş optik form PDF üretim yolu korunmalı.');
assert(optikApp.includes('topluFormPdfOlustur'), 'Toplu öğrenci form PDF üretim yolu korunmalı.');

// iframe içindeki optik uygulama native plugine doğrudan erişmek yerine parent'a mesaj göndermeli.
assert(disaAktar.includes('__optikDosyaKaydetIstek'), 'Optik iframe kayıt isteği için postMessage protokolü bulunmalı.');
assert(disaAktar.includes('const ustPencere = (window.parent && window.parent !== window) ? window.parent : null;'), 'Üst pencere iframe bağlamında güvenli biçimde doğrulanmalı.');
assert(disaAktar.includes('ustPencere.postMessage'), 'Optik iframe kayıt isteğini doğrulanmış üst pencereye göndermeli.');
assert(disaAktar.includes('__optikDosyaKaydetYanit'), 'Optik kayıt yanıt protokolü bulunmalı.');
assert(disaAktar.includes('setTimeout'), 'Kayıt isteği sonsuza kadar beklememeli; timeout bulunmalı.');

// Ana uygulama isteği karşılayıp native/web ortak kayıt fonksiyonuna aktarmalı.
assert(anaApp.includes('__optikDosyaKaydetIstek'), 'Ana uygulama optik kayıt isteklerini dinlemeli.');
assert(anaApp.includes('uygulamaDosyaKaydet'), 'Ana uygulama kayıt isteğini ortak native/web kayıt fonksiyonuna aktarmalı.');
assert(anaApp.includes('__optikDosyaKaydetYanit'), 'Ana uygulama optik iframe’e kayıt sonucunu dönmeli.');

console.log('Optik PDF kayıt köprüsü smoke testleri başarılı.');
