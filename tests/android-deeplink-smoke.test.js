const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java', 'utf8');

assert(main.includes('private volatile boolean appHazir = false;'), 'Native hazır durumu tutulmalı.');
assert(main.includes('bekleyenPage'), 'Widget hedefi native tarafta kuyruklanmalı.');
assert(main.includes('bekleyenKategori'), 'Bildirim hedefi native tarafta kuyruklanmalı.');
assert(main.includes('markAppReady()'), 'JS gerçek hazır sinyali kullanılmalı.');
assert(main.includes('bekleyenHedefleriGonder();'), 'Hazır sinyali bekleyen hedefleri göndermeli.');
assert(main.includes('JSONObject.quote(page)'), 'Widget hedefi JavaScript içine güvenli biçimde aktarılmalı.');
assert(main.includes('JSONObject.quote(kategori)'), 'Bildirim kategorisi JavaScript içine güvenli biçimde aktarılmalı.');
assert(!main.includes('), 300'), 'Widget deep-link sabit 300 ms gecikmeye dönmemeli.');
assert(!main.includes('), 800'), 'Bildirim deep-link sabit 800 ms gecikmeye dönmemeli.');
assert(main.includes('appHazir = false;\n            webView.reload();'), 'Pull-to-refresh yeni sayfayı hazır kabul etmemeli.');

console.log('Android deep-link smoke testleri başarılı.');
