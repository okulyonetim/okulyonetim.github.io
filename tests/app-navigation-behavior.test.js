const fs=require('fs');
const assert=require('assert');

const nav=fs.readFileSync('js/core/app-navigation-behavior.js','utf8');
const firebase=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

assert(nav.includes("document.getElementById('kaReportPreview')||document.getElementById('kaPdfPreview')"),'Rapor ve PDF önizlemeleri tek geri-tuştan önce yakalanmalı.');
assert(nav.includes("global.addEventListener('popstate'"),'Tarayıcı/Android geri olayı rapor önizleme katmanında ele alınmalı.');
assert(nav.includes('event.stopImmediatePropagation()'),'Önizleme kapanırken arka sayfa geri navigasyonu durdurulmalı.');
assert(nav.includes("history.state?.kaShellGuard!=='active'")&&nav.includes("history.pushState({...(history.state||{}),kaShellGuard:'active'},'')"),'Önizleme/PDF kapanırken Shell browser guard yeniden kurulmalı.');
assert(nav.includes("event.target.closest?.('[data-ka-home-trigger]')"),'Header okul markası özel ana sayfa davranışına bağlı olmalı.');
assert(nav.includes("global.AppStore?.subscribe?.('ui.route',scrollTopSoon)"),'Modül değişimlerinde sayfa en üste alınmalı.');
assert(nav.includes("'[data-ka-shell-route],[data-dash-route]"),'Alt sayfa/menu yönlendirmeleri üstten açılmalı.');
assert(firebase.includes('app-navigation-behavior.js?v=935'),'Uygulama geneli gezinme katmanı başlangıçta yüklenmeli.');
assert(sw.includes("'./js/core/app-navigation-behavior.js?v=935'"),'Gezinme katmanı offline cache içinde olmalı.');
const cacheVersion=Number(sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/)?.[1]||0);
assert(cacheVersion>=934,'PWA cache sürümü gezinme davranışı sürümünden eski olmamalı.');


const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');
assert(shell.includes("document.querySelectorAll('.ka-modal-backdrop,[role=\"dialog\"]')"),'geri tuşu görünür modalı önce kapatmalı');
assert(shell.indexOf("document.querySelectorAll('.ka-modal-backdrop,[role=\"dialog\"]')")<shell.indexOf('global.TransportModule?.back?.()'),'modal kontrolü modül geri işleminden önce olmalı');
assert(shell.includes("current.name==='settings'&&global.SettingsModule?.currentPage?.()!=='home'"),'Ayarlar alt sayfası önce Ayarlar ana sayfasına dönmeli');
assert(settings.includes("active='home';mounted=true"),'Ayarlar her açılışta ana sayfadan başlamalı');
assert(settings.includes('currentPage:()=>active'),'Shell Ayarlar durumunu ana modülden okumalı');
assert(!fs.existsSync('js/core/settings-back-navigation.js'),'ayrı Ayarlar geri yama dosyası bulunmamalı');
console.log('Uygulama gezinme davranışı sözleşmesi başarılı.');
