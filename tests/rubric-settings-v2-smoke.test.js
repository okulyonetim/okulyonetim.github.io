const fs=require('fs');
const assert=require('assert');
const vm=require('vm');
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

(async()=>{
  const metaStore=new Map();
  const legacy={puanMin:1,puanMax:5,puanEtiketleri:['A'],gruplar:[{ad:'G',kriterler:['K']}]};
  const window={
    AKTIF_KULLANICI:{uid:'u1',admin:true},
    AppStore:{get:()=>null,data:()=>[]},
    localStorage:{getItem:key=>key==='krtDagitimAyarlari'?JSON.stringify(legacy):null},
    KorukLocalFirst:{meta:async(u,k,...rest)=>{const key=u+'|'+k;if(rest.length){metaStore.set(key,rest[0]);return rest[0];}return metaStore.has(key)?metaStore.get(key):null;}},
    DeviceData:{set:async()=>{}},COL:{okulBilgileri:'oy_okulBilgileri'},dispatchEvent:()=>{}
  };
  vm.runInNewContext(src,{window,console,JSON,Object,Array,String,Date,Error,CustomEvent:function(){}});
  const svc=window.RubricSettingsService;
  const first=await svc.personalGet('rubric');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(first)),legacy,'Legacy rubric ayarı ilk erişimde IndexedDB meta katmanına migrate edilmeli.');
  assert.strictEqual(metaStore.get('u1|rubric-settings:rubric:legacy-migrated'),true,'Migration tamamlandı işareti tutulmalı.');
  await svc.clearPersonal('rubric');
  const second=await svc.personalGet('rubric');
  assert.strictEqual(second,null,'clearPersonal sonrası legacy localStorage değeri yeniden migrate edilmemeli.');
  console.log('Kriter/Proje local-first ayar servisi + tek-seferlik migration davranışı başarılı.');
})().catch(err=>{console.error(err);process.exitCode=1;});
