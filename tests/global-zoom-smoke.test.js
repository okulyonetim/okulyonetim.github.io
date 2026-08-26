const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html','utf8');
const main = fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java','utf8');
const viewer = fs.readFileSync('js/modules/document-viewer.js','utf8');
const plan = fs.readFileSync('js/yillik-plan.js','utf8');

assert(index.includes('maximum-scale=1.0'), 'Global viewport maksimum ölçeği 1 olmalı.');
assert(index.includes('user-scalable=no'), 'Web/PWA global pinch zoom kapalı olmalı.');
assert(main.includes('setSupportZoom(false)'), 'Android WebView zoom desteği kapalı olmalı.');
assert(main.includes('setBuiltInZoomControls(false)'), 'Android WebView built-in zoom kontrolleri kapalı olmalı.');
assert(main.includes('setDisplayZoomControls(false)'), 'Android WebView zoom kontrolleri görünmemeli.');
assert(viewer.includes('scale(${wordZoom})'), 'Word belgeye özel zoom korunmalı.');
assert(plan.includes('tuval.style.transform = `scale(${olcek})`'), 'Yıllık plan belgeye özel zoom korunmalı.');
console.log('Global zoom smoke testleri başarılı.');
