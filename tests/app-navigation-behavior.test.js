const fs=require('fs');
const assert=require('assert');

const nav=fs.readFileSync('js/core/app-navigation-behavior.js','utf8');
const firebase=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

assert(nav.includes("document.getElementById('kaReportPreview')||document.getElementById('kaPdfPreview')"),'Rapor ve PDF önizlemeleri tek geri-tuştan önce yakalanmalı.');
assert(nav.includes("global.addEventListener('popstate'"),'Tarayıcı/Android geri olayı rapor önizleme katmanında ele alınmalı.');
assert(nav.includes('event.stopImmediatePropagation()'),'Önizleme kapanırken arka sayfa geri navigasyonu durdurulmalı.');
assert(nav.includes("event.target.closest?.('[data-ka-home-trigger]')"),'Header okul markası özel ana sayfa davranışına bağlı olmalı.');
assert(nav.includes("global.AppStore?.subscribe?.('ui.route',scrollTopSoon)"),'Modül değişimlerinde sayfa en üste alınmalı.');
assert(nav.includes("'[data-ka-shell-route],[data-dash-route]"),'Alt sayfa/menu yönlendirmeleri üstten açılmalı.');
assert(firebase.includes('app-navigation-behavior.js?v=932'),'Uygulama geneli gezinme katmanı başlangıçta yüklenmeli.');
assert(sw.includes("'./js/core/app-navigation-behavior.js?v=932'"),'Gezinme katmanı offline cache içinde olmalı.');
assert(sw.includes("const CACHE_ADI='oy-cache-v932';"),'PWA cache sürümü yeni davranış için yenilenmeli.');

console.log('Uygulama gezinme davranışı sözleşmesi başarılı.');
