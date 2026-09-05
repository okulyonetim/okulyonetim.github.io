const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sw=fs.readFileSync('service-worker.js','utf8');
test('service worker activation preserves live local-first sessions',()=>{
  assert.ok(sw.includes("const CACHE_ADI='oy-cache-v899'"));
  assert.ok(sw.includes('old=names.filter(n=>n!==CACHE_ADI&&/^oy-cache-v\\d+$/.test(n))'),'Yalnız uygulamanın eski cache sürümleri temizlenmeli.');
  assert.ok(sw.includes('await self.clients.claim()'),'Yeni worker istemcileri devralmalı.');
  assert.ok(!sw.includes('windows.map(client=>client.navigate(client.url))'),'Cache aktivasyonu açık sayfaları zorla yenilememeli.');
  assert.ok(!sw.includes('runtimeChanged'),'Eski zorunlu reload bayrağı kalmamalı.');
});
