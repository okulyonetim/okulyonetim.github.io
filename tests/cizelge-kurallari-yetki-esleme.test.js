const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const rules=fs.readFileSync('firestore.rules','utf8'),loader=fs.readFileSync('js/app-loader.js','utf8');
const KOLEKSIYONLAR=['sosyalKulupler','belirliGunler','zumre','sok','bepPlani','rehberlik','maarifRapor','digerEvrak'];

test('çizelge koleksiyonlarında arayüzün "cizelgeler" takma adı kurallarda da geçerli',()=>{
  const aliases=loader.match(/const LEGACY_PERMISSION_ALIASES=\{([\s\S]*?)\};/)[1];
  for(const k of KOLEKSIYONLAR){
    assert.match(aliases,new RegExp(`'${k}':\\['cizelgeler'\\]`),`${k} arayüzde cizelgeler anahtarına bağlı değil; kural eşlemesi güncellenmeli`);
    assert.ok(new RegExp(`match /oy_${k}/\\{id\\} \\{[^}]*allow create, update, delete: if cizelgeDuzenleyebilir\\('${k}'\\);`).test(rules),`oy_${k} yazma kuralı cizelgeDuzenleyebilir kullanmalı`);
    assert.ok(!rules.includes(`moduluDuzenleyebilir('${k}')`),`oy_${k} yalnız koleksiyon anahtarına bakmamalı`);
  }
});

test('cizelgeDuzenleyebilir: admin, koleksiyon anahtarı öncelikli, yoksa cizelgeler',()=>{
  const m=rules.match(/function cizelgeDuzenleyebilir\(modul\) \{([\s\S]*?)\n    \}/);
  assert.ok(m,'yardımcı fonksiyon yok');
  const b=m[1];
  assert.match(b,/adminMi\(\)/);
  assert.match(b,/rolBelgemVarMi\(\)/);
  assert.match(b,/modul in get\(/,'koleksiyon anahtarı kontrolü');
  assert.match(b,/!\(modul in get\(/,'koleksiyon anahtarı yoksa yedek yol');
  assert.match(b,/'cizelgeler' in get\(/);
  assert.equal((b.match(/\['duzenle', 'edit'\]/g)||[]).length,2,'yalnız düzenle/edit düzeyleri yazma verir');
});
