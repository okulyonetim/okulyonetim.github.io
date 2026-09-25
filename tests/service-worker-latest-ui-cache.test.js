const fs=require('fs');
const assert=require('assert');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(sw);
assert(sw.includes("const CACHE_ADI='oy-cache-v1065'"),'Service Worker cache sürümü güncellenmeli.');
assert(sw.includes("./js/core/admin-password-reset.js?v=948"),'Şifre sıfırlama köprüsü önbelleğe alınmalı.');
assert(sw.includes("./js/core/app-navigation-behavior.js?v=934"),'Güncel gezinme davranışı önbelleğe alınmalı.');
console.log('Service Worker güncel arayüz cache sözleşmesi başarılı.');
