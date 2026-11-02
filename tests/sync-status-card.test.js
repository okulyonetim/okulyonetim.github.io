/* Eşitleme sağlığı: çekirdek durum/yeniden gönderme API'si, Ayarlar > Veriler kartı ve önbellek sürümlerinin tutarlılığı.
 * (Eşitleme davranışının kendisi tests/sync-signal.test.js içinde iki simüle cihazla sınanır.) */
const fs=require('fs'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const core=read('js/core/core.js'),settings=read('js/modules/settings.js'),index=read('index.html'),beta=read('beta.html'),sw=read('service-worker.js'),loader=read('js/app-loader.js');
new Function(core);new Function(settings);

/* çekirdek: durum ve yeniden gönderme dışa açık, kalıcı hatalı yazma sessizce silinmez */
assert(/flush:flushWrites,retryFailed,status,sync,/.test(core),'SyncEngine.retryFailed ve SyncEngine.status dışa açılmalı');
assert(/if\(dropped\.length\)try\{await deadStore\(u,dropped\)\}/.test(core),'kuyruktan düşen kayıtlar saklanmalı');
assert(core.includes('function errText(e)')&&core.includes('op.lastError=errText(e)'),'hata kodu (permission-denied, invalid-argument) kayda geçmeli');
assert(/ttl=signalState==='acik'\?REMOTE_SYNC_TTL:SIGNAL_OFF_TTL/.test(core),'uzun bayatlık süresi yalnız doğrulanmış değişim işaretiyle geçerli olmalı');
assert(/REMOTE_SYNC_TTL=30\*60\*1000/.test(core),'işaret açıkken güvenlik süresi 30 dk olmalı (işaret yazmayan eski sürümler için)');
assert(/setInterval\(\(\)=>\{if\(document\.hidden\|\|!navigator\.onLine\|\|!booted\|\|!syncReady\(\)\)return;scheduleSync\(0\)\},60000\)/.test(core),'açık duran ekran için periyodik bayatlık denetimi olmalı');
assert(core.includes('function signalBlocked()')&&!/signalState==='reddedildi'\)return/.test(core.replace(/function signalBlocked\(\)\{[^\n]*\n/,'')),'reddedilen işaret süreli yeniden denenmeli, kalıcı kapatılmamalı');

/* Ayarlar > Veriler kartı */
assert(settings.includes('data-sync-status')&&settings.includes('data-sync-now')&&settings.includes('data-sync-retry'),'Eşitleme Durumu kartı olmalı');
assert(/function bindStorage\(out\)\{\s*bindSyncStatus\(out\);/.test(settings),'kart Veriler sayfasında bağlanmalı');
assert(!/style=["'][^"']*#[0-9a-fA-F]{3,8}/.test(settings.slice(settings.indexOf('async function renderSyncStatus'),settings.indexOf('function bindStorage(out)'))),'kartta sabit renk yok');

/* yükleme sürümleri: kabuklar + Service Worker + yükleyici aynı */
const pin=(src,file)=>{const m=src.match(new RegExp(file.replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&')+'\\?v=(\\d+)'));return m?+m[1]:null};
assert.strictEqual(pin(index,'js/core/core.js'),pin(sw,'js/core/core.js'),'core.js sürümü index = Service Worker');
assert.strictEqual(pin(beta,'js/core/core.js'),pin(sw,'js/core/core.js'),'core.js sürümü beta = Service Worker');
assert.strictEqual(pin(loader,'js/modules/settings.js'),pin(sw,'js/modules/settings.js'),'settings.js sürümü yükleyici = Service Worker');
assert.strictEqual(pin(index,'js/app-loader.js'),pin(sw,'js/app-loader.js'),'app-loader sürümü index = Service Worker');
assert.strictEqual(pin(beta,'js/app-loader.js'),pin(sw,'js/app-loader.js'),'app-loader sürümü beta = Service Worker');
assert(pin(sw,'js/core/core.js')>=1047&&pin(sw,'js/modules/settings.js')>=902,'sürümler değişiklikten sonra yükseltilmiş olmalı');
console.log('sync-status-card: tamam');
