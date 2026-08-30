const fs=require('fs');
const assert=require('assert');
const sw=fs.readFileSync('service-worker.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const orphan='js/modules/communication-legacy-ui.js';
assert(!fs.existsSync(orphan),'Çağrısız legacy iletişim UI dosyası repoda kalmamalı.');
assert(!sw.includes('./'+orphan),'Emekli legacy iletişim UI Service Worker precache listesinde kalmamalı.');
assert(!loader.includes(orphan),'Emekli legacy iletişim UI AppLoader tarafından yüklenmemeli.');
console.log('Çağrısız legacy iletişim UI emeklilik testi başarılı.');
