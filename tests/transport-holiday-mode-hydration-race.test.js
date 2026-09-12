const fs=require('fs');
const assert=require('assert');
const bridge=fs.readFileSync('js/core/transport-holiday-mode-bridge.js','utf8');
assert(bridge.includes("list.includes('resmiTatiller')"),'Rapor prepare hydrate sonrası Tatil Modu tekrar uygulanmalı.');
assert(bridge.includes('const originalHydrate'),'SyncEngine localHydrate rapor süresince güvenli biçimde köprülenmeli.');
console.log('Taşıma tatil hydrate yarışı testi başarılı.');
