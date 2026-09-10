const fs=require('fs');
const assert=require('assert');

const activity=fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java','utf8');
const runtime=fs.readFileSync('js/core/platform/mobile-runtime-fixes.js','utf8');
new Function(runtime);

assert(activity.includes("window.ShellUI && typeof window.ShellUI.back==='function'"),'Android geri tuşu ShellUI geçmişine devredilmiyor.');
assert(activity.includes('nativeRuntimeDuzeltmeleriniYukle();'),'Native runtime düzeltmeleri app-ready sırasında yüklenmiyor.');
const runtimeVersion=activity.match(/mobile-runtime-fixes\.js\?v=(\d+)/);
assert(runtimeVersion&&Number(runtimeVersion[1])>=909,'Native runtime düzeltme dosyası sürümlü olarak yüklenmiyor.');
assert(runtime.includes('data-quality-holiday-start')&&runtime.includes('data-quality-holiday-end'),'Tatil tarih alanı taslak koruması eksik.');
assert(runtime.includes('MutationObserver')&&runtime.includes('restoreHolidayDraft'),'Settings yeniden render olduğunda tatil taslağı geri yüklenmiyor.');
assert(runtime.includes('guardSettingsRerenders')&&runtime.includes('holidayEditorFocused'),'Android tarih seçici açıkken teknik Settings renderları engellenmiyor.');
assert(runtime.includes("subscribe?.('data.dersSaatleri'")&&runtime.includes('__korukOriginal'),'Tatil kaydı sonrası taslak yaşam döngüsü eksik.');

console.log('Android geri navigasyonu + planlı tatil tarih taslağı sözleşmesi başarılı.');
