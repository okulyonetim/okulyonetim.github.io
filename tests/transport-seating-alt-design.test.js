const fs=require('fs');
const assert=require('assert');
const css=fs.readFileSync('css/design-system.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
for(const token of ['Servis Oturma — alternatif tasarım v5','.ka-bus-editor-modal.ka-bus-classic-modal','.ka-bus-template-grid{display:flex!important','.ka-bus-tool-grid{display:grid!important','.ka-bus-classic-shell .ka-bus-seat.is-filled','.ka-bus-seat-picker__modal','.ka-bus-student-option','[data-theme="dark"] .ka-bus-classic-stage'])assert(css.includes(token),`Alternatif servis oturma tasarım sözleşmesi eksik: ${token}`);
assert(index.includes('css/design-system.css?v=893'),'Index yeni servis oturma tasarımını yüklemeli.');
assert(sw.includes("CACHE_ADI='oy-cache-v893'")&&sw.includes("'./css/design-system.css?v=893'"),'Service Worker yeni tasarım CSS paketini önbelleğe almalı.');
console.log('Servis oturma alternatif tasarım testi başarılı.');
