const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/report-engine.js','utf8');

/* Android'in yazdırma ekranı @page boşluğunu yok sayar; üst/alt boşluk tekrar eden thead/tfoot ile verilmeli.
   Bu yöntem yalnız yerel uygulamada değil, Android tarayıcıda (PWA) da açık olmalı. */
assert(/function androidYazdirma\(\)\{[^}]*Android\/i\.test\(global\.navigator\?\.userAgent/.test(src),'Android tarayıcı ayrımı yapılmalı.');
assert(/function androidYazdirma\(\)\{try\{return!!nativePlugin\(\)\|\|/.test(src),'Yerel uygulama da aynı yolu kullanmalı.');
assert(/async function printReport\([^)]*\)\{const o=normalizeOptions\(\{\.\.\.opts,native:androidYazdirma\(\)\}\)/.test(src),'printReport sayfa boşluğu kipini Android’de açmalı.');
assert(!/native:!!nativePlugin\(\)\}\)/.test(src),'Yalnız yerel eklentiye bağlı eski koşul kalmamalı.');

/* Genel rapor sarmalayıcısı her rapora extraHead ekler; akış kipi (her sayfada kenar boşluğu) bu yüzden açıkça istenmeli. */
const bep=fs.readFileSync('js/modules/bep-print.js','utf8');
assert(/ReportEngine\.printReport\('BEP',[^;]*akis:true/.test(bep),'BEP çıktısı akış kipini açıkça istemeli; yoksa devam sayfalarında üst/alt boşluk olmaz.');

console.log('Android yazdırma boşluğu testi geçti.');
