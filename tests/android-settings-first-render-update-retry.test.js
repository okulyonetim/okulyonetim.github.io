const fs=require('fs');
const assert=require('assert');

const runtime=fs.readFileSync('js/core/platform/mobile-runtime-fixes.js','utf8');
const activity=fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java','utf8');

new Function(runtime);

assert(runtime.includes('function patchSettingsMount()'),'Android Settings mount ilk render koruması eksik.');
assert(runtime.includes('renderSettingsSafely();'),'Settings içeriği local hydrate beklenmeden çizilmeli.');
assert(runtime.includes("event.detail?.name==='settings'"),'Lazy SettingsModule yüklenirken mount sarmalayıcısı uygulanmalı.');
assert(runtime.includes("console.warn('[Settings/hydrate]'"),'Hydrate hatası boş Ayarlar ekranına dönüşmemeli.');
assert(runtime.includes('if(result?.error)startupChecked=false'),'Başlangıç güncelleme kontrolü hata verirse yeniden denenebilir olmalı.');
assert(runtime.includes("global.addEventListener('online',()=>retryStartupCheck(250))"),'Bağlantı geri geldiğinde güncelleme kontrolü yeniden denenmeli.');
assert(runtime.includes("document.visibilityState==='visible'"),'Uygulama yeniden öne geldiğinde başarısız güncelleme kontrolü yeniden denenebilmeli.');
assert(activity.includes('mobile-runtime-fixes.js?v=914'),'Android WebView yeni runtime düzeltmesini eski cache anahtarıyla açmamalı.');

console.log('Android Ayarlar ilk render + güncelleme retry sözleşmesi başarılı.');
