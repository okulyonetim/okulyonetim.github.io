const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/core/platform/widget-adapter.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(src);

assert(src.includes('Capacitor?.isNativePlatform?.()'),'Widget adaptörü native capability detection kullanmalı.');
assert(src.includes("registerPlugin?.('WidgetPlugin')"),'WidgetPlugin yalnız platform adaptöründen çözülmeli.');
assert(src.includes("AppStore?.data?.(t)"),'Widget verisi AppStore üzerinden okunmalı.');
assert(src.includes("SyncEngine.register('dersSaatleri',COL.dersSaatleri)"),'Ders saatleri local-first SyncEngine sözleşmesine bağlı olmalı.');
assert(src.includes("SyncEngine.register('okulBilgileri',COL.okulBilgileri)"),'Okul ayarları local-first SyncEngine sözleşmesine bağlı olmalı.');
assert(src.includes("SyncEngine.localHydrate(types)"),'Native widget ilk veriyi cihazdan hydrate etmeli.');
assert(!src.includes('db.collection'),'Platform adaptörü Firestore\'a doğrudan erişmemeli.');
assert(src.includes('p.sayfalariGuncelle'),'Ana Android widget plugin metodu korunmalı.');
assert(src.includes('p.dersZiliGuncelle'),'Ders zili widget plugin metodu korunmalı.');
for(const key of ['okul:','etkinlikJson:','notJson:','nobetJson:','haberJson:','havaIkon:','havaSicaklik:','havaAciklama:'])assert(src.includes(key),`Widget payload alanı korunmalı: ${key}`);
assert(src.includes("bas:s.baslangic||s.bas||''")&&src.includes("bit:s.bitis||s.bit||''"),'oy_dersSaatleri dersler başlangıç/bitiş sözleşmesi native segmente çevrilmeli.');
assert(src.includes("global.addEventListener('koruk:app-ready'"),'Widget uygulama local-first bootstrap tamamlanınca yenilenmeli.');
assert(src.includes("document.addEventListener('visibilitychange'"),'Arka plandan dönüşte widget yenilenmeli.');
assert(index.includes('<script src="js/core/platform/widget-adapter.js" defer></script>'),'Platform adaptörü uygulama çekirdeğiyle yüklenmeli.');
assert(sw.includes("'./js/core/platform/widget-adapter.js'"),'Offline shell platform adaptörünü önbelleğe almalı.');

console.log('Native widget AppStore/SyncEngine platform adaptörü sözleşmesi başarılı.');
