const fs=require('fs');
const assert=require('assert');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(sw);
assert(sw.includes("const CACHE_ADI='oy-cache-v953'"),'Service Worker cache sürümü güncellenmeli.');
assert(sw.includes("./js/core/admin-password-reset.js?v=948"),'Şifre sıfırlama köprüsü önbelleğe alınmalı.');
assert(sw.includes("./js/core/settings-back-navigation.js?v=944"),'Ayarlar geri navigasyon düzeltmesi önbelleğe alınmalı.');
console.log('Service Worker güncel arayüz cache sözleşmesi başarılı.');
