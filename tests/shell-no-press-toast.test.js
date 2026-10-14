/* Toast bileşeni geldikten sonra eski "her düğme basışında '✓ … seçildi'" bildirimi görünür hale geldi ve her sayfa
 * açma/kapatmada ekranda çıktı. Bildirimler yalnız gerçek sonuç / hata içindir; düğme basış geri bildirimi (basılı sınıfı) kalır. */
const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const fn=shell.slice(shell.indexOf('function installButtonFeedback()'),shell.indexOf('\n',shell.indexOf('function installButtonFeedback()')));
assert(fn.includes('ka-is-pressed'),'Düğme basış görsel geri bildirimi (ka-is-pressed) korunmalı.');
assert(!/toast/.test(fn),'Düğme tıklaması toast göstermemeli.');
assert(!/seçildi/.test(fn),'"… seçildi" bildirimi olmamalı.');
assert(!/global\.toast\?\.\(`✓/.test(shell),'Genel "✓ … seçildi" toast kalıbı hiçbir yerde olmamalı.');
console.log('shell-no-press-toast.test.js: OK');
