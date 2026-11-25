const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const rules=fs.readFileSync('firestore.rules','utf8'),init=fs.readFileSync('js/firebase-init.js','utf8');

test('uygulamanın her oy_ koleksiyonunun Firestore kuralı var (kurulKomisyonlar dahil)',()=>{
  const cols=[...init.matchAll(/(\w+):'(oy_\w+)'/g)].map(m=>m[2]);
  assert.ok(cols.includes('oy_kurulKomisyonlar'),'COL içinde kurulKomisyonlar bulunamadı');
  const var_=new Set([...rules.matchAll(/match \/(oy_\w+)\//g)].map(m=>m[1]));
  const eksik=cols.filter(c=>!var_.has(c));
  assert.deepEqual(eksik,[],'kuralı olmayan koleksiyonlar senkronda izin hatası verir: '+eksik.join(', '));
});

test('oy_kurulKomisyonlar: okuma girişli herkese, yazma admin/yönetici/yönetim düzenleyicisine',()=>{
  const m=rules.match(/match \/oy_kurulKomisyonlar\/\{id\} \{([\s\S]*?)\n    \}/);
  assert.ok(m,'oy_kurulKomisyonlar bloğu yok');
  const b=m[1];
  assert.match(b,/allow read: if girisYapmis\(\);/);
  assert.match(b,/allow create, update, delete: if adminMi\(\) \|\| yoneticiMi\(\)/);
  assert.match(b,/moduluDuzenleyebilir\('module\.management'\)/);
  assert.doesNotMatch(b,/allow (read, )?write: if (true|girisYapmis\(\));/,'herkese açık yazma olmamalı');
});
