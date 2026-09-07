const fs=require('fs');
const assert=require('assert');

const runtime=fs.readFileSync('js/core/platform/mobile-runtime-fixes.js','utf8');
const activity=fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java','utf8');

new Function(runtime);

assert(runtime.includes("e.stopImmediatePropagation()"),'Arama input olayı eski tam render akışından ayrılmalı.');
assert(runtime.includes('.ogm-search input[data-exact-search]')&&runtime.includes('padding-left:44px!important'),'Öğretmen arama kutusu ikon boşluğu korunmalı.');
assert(runtime.includes('restoreSearchState')&&runtime.includes('applyPeopleSearch'),'Mobil arama DOM sabit filtreleme koruması eksik.');
assert(runtime.includes('holidayDraft')&&runtime.includes('restoreHolidayDraft')&&runtime.includes('data-quality-holiday-start'),'Planlı tatil başlangıç/bitiş taslağı yeniden render sırasında korunmalı.');
assert(activity.includes("window.ShellUI && typeof window.ShellUI.back==='function'"),'Android geri tuşu ShellUI geçmişine yönlendirilmeli.');
assert(activity.includes('mobile-runtime-fixes.js?v=909')&&activity.includes('nativeRuntimeDuzeltmeleriniYukle();'),'Native runtime düzeltme dosyası uygulama hazır olduğunda yüklenmeli.');

console.log('Native geri + arama IME/padding + tatil taslak regresyon sözleşmesi başarılı.');
