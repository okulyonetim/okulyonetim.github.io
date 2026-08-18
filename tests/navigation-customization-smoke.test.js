const fs = require('fs');
const assert = require('assert');
const nav = fs.readFileSync('js/alt-navigasyon.js','utf8');
const editor = fs.readFileSync('js/nav-duzeni-editor.js','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');

assert(nav.includes("oyNavDuzeniCacheV1"), 'Navigasyon düzeni ilk çizim için local cache kullanmalı.');
assert(nav.includes('let _navDuzeniVerisi = _navDuzeniCacheOku();'), 'İlk GRUPLAR inşası cached resmi düzenle başlamalı.');
assert(nav.includes('window._navDuzeniYerelUygula = _navDuzeniYerelUygula;'), 'Editör optimistic düzeni gerçek menüye aktarabilmeli.');
assert(nav.includes('_menuResmiVarsayilanGetir'), 'Kart varsayılanı adminin güncel resmi rengini/adını kullanmalı.');
assert(editor.includes("window._navDuzeniYerelUygula(nd)"), 'Navigasyon editörü Firestore beklemeden optimistic UI uygulamalı.');
assert(editor.includes("window._navDuzeniYerelUygula(onceki)"), 'Firestore hatasında optimistic değişiklik geri alınmalı.');
assert(editor.includes('function _ndSekmeSeciciOlustur'), 'Yeni öğe ekleme ana app sekme seçicisi yokken fallback sağlamalı.');
assert(editor.includes("document.querySelectorAll('[data-tab]')"), 'Fallback sekme listesi mevcut uygulama sekmelerinden üretilmeli.');
assert(editor.includes('const sekmeAd = _ndSekmeDegeriAl'), 'Yeni öğe fallback seçicisinden değer okuyabilmeli.');
assert(sw.includes("oy-cache-v437"), 'Yeni navigasyon JS dosyaları için cache sürümü v437 olmalı.');
console.log('Navigasyon özelleştirme smoke testleri başarılı.');
