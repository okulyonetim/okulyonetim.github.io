const fs=require('fs');
const assert=require('assert');

const core=fs.readFileSync('js/core/core.js','utf8');
const optimized=fs.readFileSync('js/core/read-optimized-sync.js','utf8');
const firebaseInit=fs.readFileSync('js/firebase-init.js','utf8');

assert(core.includes("options?.force||options?.manual||options?.bootstrap"),
  'Bootstrap/force seçenekleri ALL_SYNC_TYPES yolunu açmalı.');
assert(/async function sync\(types,options=\{\}\).*?const names=syncNames\(types,options\).*?return pull\(names,\{\.\.\.options,baseline\}\)/s.test(core),
  'sync() options değerlerini pull() katmanına iletmeli.');
assert(core.includes('delete x.force;delete x.full;delete x.manual;delete x.baseline;'),
  'sync kontrol seçenekleri revision snapshot içine sızmamalı.');
assert(core.includes("scheduleSync(250,{bootstrap:true})"),
  'İlk başarılı bootstrap çekirdek senkronizasyonunu başlatmalı.');
assert(core.includes("'ogrenciler'"),
  'Öğrenci koleksiyonu ilk senkronizasyon kapsamına alınmalı.');

assert(optimized.includes("'ogrenciler'"),
  'Read-optimized kritik koleksiyonlarda öğrenciler bulunmalı.');
assert(optimized.includes("global.addEventListener('koruk:store-change'"),
  'Oturum sonradan geldiğinde ilk senkronizasyon yeniden tetiklenmeli.');
assert(optimized.includes('await global.SyncEngine.sync(registeredNames(),{force:true,manual:true})'),
  'İlk boş cache durumunda SyncEngine tüm kayıtlı kritik koleksiyonları zorlamalı.');

assert(firebaseInit.includes("CRITICAL_TYPES=['ogretmenler','siniflar','veliler']"),
  'Firestore read guard kritik tip kontrolünü korumalı.');
assert(firebaseInit.includes("if(marker==='__ka_missing__')return true"),
  'Guard eksik cache ile boş cache değerini ayırmalı.');
assert(firebaseInit.includes("if(fresh()&&await criticalCacheReady())return;"),
  'Taze damga yalnız kritik cache hazırsa sync\'i engellemeli.');

console.log('First-login initial sync contract testleri başarılı.');
