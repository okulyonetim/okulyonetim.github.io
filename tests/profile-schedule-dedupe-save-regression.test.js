const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const code=fs.readFileSync('js/core/schedule-data-integrity.js','utf8');
new Function(code);

class MutationObserver{constructor(){}observe(){}disconnect(){}}
const document={
  readyState:'loading',
  addEventListener(){},
  getElementById(){return null},
  documentElement:{},
  visibilityState:'visible'
};
const context={
  console,
  Date,
  Map,
  Promise,
  setTimeout(){return 0},
  clearTimeout(){},
  setInterval(){return 0},
  clearInterval(){},
  MutationObserver,
  document,
  AppStore:{data(){return[]},setData(){}},
  addEventListener(){},
  dispatchEvent(){},
};
context.window=context;
vm.createContext(context);
vm.runInContext(code,context);

const api=context.KorukScheduleDataIntegrity;
assert(api,'Schedule integrity API yüklenmedi.');
assert.equal(typeof api.dedupeRows,'function','Mantıksal ders slotu tekilleştirme API si eksik.');
assert.equal(typeof api.patchScheduleService,'function','Ders kaydet servis görünür durum koruması eksik.');

const older={id:'old',sinif:'6-A',gun:'Pazartesi',saat:7,ders:'Eski',ogretmenId:'t1',eklenmeTarihi:'2026-09-01T08:00:00.000Z'};
const newer={id:'new',sinif:'6-A',gun:'Pazartesi',saat:7,ders:'Yeni',ogretmenId:'t1',eklenmeTarihi:'2026-09-10T08:00:00.000Z'};
const friday={id:'fri',sinif:'5-A',gun:'Cuma',saat:1,ders:'Bilişim',ogretmenId:'t1',eklenmeTarihi:'2026-09-10T09:00:00.000Z'};
const unique=api.dedupeRows([older,newer,friday]);
assert.equal(unique.rows.length,2,'Aynı sınıf+gün+saat mükerrerleri tek derse indirilmeli.');
assert.equal(unique.rows.find(x=>x.sinif==='6-A').id,'new','Mükerrer slotta en güncel kayıt gösterilmeli.');
assert.equal(unique.changed,true,'Tekilleştirme değişikliği raporlanmalı.');

api.protect('old','upsert');
const protectedPick=api.dedupeRows([older,newer]);
assert.equal(protectedPick.rows[0].id,'old','Yeni yerel düzenleme korunurken eski uzak kopya tercih edilmemeli.');

assert(api.friendlySaveError(new Error('slot-dolu')).includes('zaten bir ders'),'Dolu slot hatası modal içinde anlaşılır gösterilmeli.');
assert(api.friendlySaveError(new Error('cakisma:ÜNAL BALIK:6-A')).includes('ÜNAL BALIK'),'Öğretmen çakışması modal içinde öğretmen adıyla gösterilmeli.');

const firebaseInit=fs.readFileSync('js/firebase-init.js','utf8');
assert(firebaseInit.includes('schedule-data-integrity.js?v=917'),'Yeni schedule integrity dosyası cache-busting sürümüyle yüklenmeli.');
assert(code.includes("btn.textContent='Kaydediliyor…'"),'Kaydet butonu işlem sırasında görünür busy durumuna geçmeli.');
assert(code.includes('data-schedule-save-status'),'Kaydet hatası yalnız toast yerine modal içinde de gösterilmeli.');

console.log('Profil ders programı tekilleştirme + Ders Ekle Kaydet geribildirimi regresyon testi başarılı.');
