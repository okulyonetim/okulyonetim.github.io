const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('android/app/src/main/java/com/koruk/okul/PrintPlugin.java', 'utf8');

assert(src.includes('private WebView aktifYazdirmaWebView'), 'Yazdırma WebView yaşam döngüsü boyunca tutulmalı.');
assert(src.includes('loadDataWithBaseURL('), 'Yazdırma HTML’i base URL ile yüklenmeli.');
assert(src.includes('https://sedonet23.github.io/okul/'), 'Göreli rapor kaynakları için uygulama base URL’i kullanılmalı.');
assert(src.includes('PrintJob job = yazdirDiyaloguAc'), 'PrintJob oluşturulmadan çağrı başarılı sayılmamalı.');
assert(src.includes('if (job == null)'), 'Android yazdırma servisi yokluğu ele alınmalı.');
assert(src.includes('call.resolve();'), 'Başarılı PrintJob sonrası çağrı çözülmeli.');
assert(src.includes('handleOnDestroy()'), 'Yazdırma WebView’i plugin kapanışında temizlenmeli.');
assert(!src.includes('call.resolve();\n    }\n\n    private void yazdirDiyaloguAc'), 'Eski erken resolve davranışı geri gelmemeli.');

require('./android-deeplink-smoke.test.js');
console.log('Android PrintPlugin smoke testleri başarılı.');
