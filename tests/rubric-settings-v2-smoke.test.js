const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/rubric-settings.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert(index.includes('js/modules/rubric-settings.js'),'RubricSettingsService production shell tarafından yüklenmeli.');
for(const token of ["rubric:{local:'krtDagitimAyarlari',field:'kriterDagitimAyari'}","project:{local:'projeDagitimAyarlari',field:'projeDegerlendirmeAyari'}","global.KorukLocalFirst?.meta?.(u,key)","legacy-migrated","migrated===true","global.DeviceData.set('okulBilgileri',global.COL.okulBilgileri,'ayarlar'","global.RubricSettingsService={"]){
  assert(src.includes(token),`RubricSettings V2 sözleşmesi eksik: ${token}`);
}
assert(!src.includes('db.collection(')&&!src.includes('firebase.firestore'),'RubricSettingsService doğrudan Firestore kullanmamalı.');
assert(src.includes('localStorage?.getItem?.(d.local)'),'Eski localStorage ayarı yalnız tek seferlik migration kaynağı olarak korunmalı.');
assert(src.includes("await global.KorukLocalFirst.meta(u,key+':legacy-migrated',true)"),'Kişisel kayıttan sonra legacy migration tekrar çalışmamalı.');
assert(src.includes("await global.KorukLocalFirst.meta(u,key,null);await global.KorukLocalFirst.meta(u,key+':legacy-migrated',true)"),'Kişisel ayar temizlendikten sonra legacy localStorage verisi yeniden dirilmemeli.');
console.log('Kriter/Proje local-first ayar servisi sözleşmesi başarılı.');
