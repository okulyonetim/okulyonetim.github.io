const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../js/modules/committees.js','utf8');
const ros=fs.readFileSync(__dirname+'/../js/core/read-optimized-sync.js','utf8');
test('kurul/komisyon açılırken diğer cihazdaki kayıtlar tam eşitlenir',()=>{
  assert.match(src,/function refreshRemote\(/);
  assert.match(src,/SyncEngine\.sync\(\[T\],\{force:true,full:true\}\)/);
  assert.match(src,/schedule\(100\);refreshRemote\(\)/);
});
test('kurulKomisyonlar arka plan eşitleme listesinde',()=>{assert.match(ros,/'kurulKomisyonlar'/)});
