const fs=require('fs');
const assert=require('assert');

const bridge=fs.readFileSync('js/core/transport-holiday-mode-bridge.js','utf8');
assert(bridge.includes('const originalHydrate'),'Taşıma raporu hydrate yarışını yakalamalı.');
assert(bridge.includes("list.includes('resmiTatiller')"),'resmiTatiller hydrate sonrası Tatil Modu tekrar uygulanmalı.');
assert(bridge.includes('applyCombined()'),'Birleşik tatil kaynağı rapor süresince yeniden uygulanmalı.');

console.log('Taşıma tatil hydrate yarışı testi başarılı.');
