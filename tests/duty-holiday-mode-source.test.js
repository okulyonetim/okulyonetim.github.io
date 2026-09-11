const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const code=fs.readFileSync('js/core/duty-holiday-mode-source.js','utf8');
const firebase=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

const data={
  dersSaatleri:[{id:'ayarlar',tatilAraliklari:[{id:'ara',ad:'Ara Tatil',baslangicTarihi:'2026-09-01',bitisTarihi:'2026-09-04',not:'Planlı tatil'}]}],
  resmiTatiller:[{id:'r1',tarih:'2026-09-07',aciklama:'Resmî Tatil'},{id:'r2',tarih:'2026-09-03',aciklama:'Öncelikli Resmî Tatil'}],
  nobetYerleri:[]
};
const documentStub={querySelector:()=>null,getElementById:()=>null,addEventListener:()=>{}};
const windowStub={
  AppStore:{data:type=>data[type],setData:(type,value)=>{data[type]=value;return value;},subscribe:()=>()=>{}},
  document:documentStub,
  addEventListener:()=>{}
};
const context={window:windowStub,document:documentStub,console,setTimeout,clearTimeout,queueMicrotask,Date,MutationObserver:undefined};
vm.createContext(context);
vm.runInContext(code,context,{filename:'duty-holiday-mode-source.js'});
const source=windowStub.DutyHolidayModeSource;
assert(source,'Nöbet Tatil Modu kaynağı global API oluşturmuyor.');

const ranges=source.ranges();
assert.strictEqual(ranges.length,1,'Planlı tatil aralıkları okunmalı.');
assert.strictEqual(ranges[0].ad,'Ara Tatil','Tatil adı korunmalı.');
assert(source.modeHolidayForDate('2026-09-01'),'Başlangıç tarihi tatil sayılmalı.');
assert(source.modeHolidayForDate('2026-09-04'),'Bitiş tarihi tatil sayılmalı.');
assert(!source.modeHolidayForDate('2026-09-05'),'Aralık dışındaki tarih tatil sayılmamalı.');

const overlap=source.holidayForDate('2026-09-03');
assert.strictEqual(overlap._dutySource,'resmi','Aynı gün hem resmî hem Tatil Modu ise resmî kayıt öncelikli olmalı.');
const combined=source.combinedHolidayRows();
assert.strictEqual(combined.filter(x=>x.tarih==='2026-09-03').length,1,'Bir tarih iki tatil kaynağından gelince mükerrer olmamalı.');
assert(combined.some(x=>x.tarih==='2026-09-02'&&x.__dutyHolidayModeSource===true),'Tatil Modu günleri nöbet için sanal tatil satırına çevrilmeli.');
assert.strictEqual(source.firstDutyWorkday('2026-09'),'2026-09-08','İlk iş günü hesabı Tatil Modu + resmî tatilleri birlikte atlamalı.');

data.dersSaatleri=[{id:'ayarlar',tatilAraliklari:[],tatilModu:true,tatilBaslangicTarihi:'2026-06-20',okulAcilisTarihi:'2026-06-23',tatilModuNotu:'Yaz tatili'}];
const legacy=source.ranges();
assert.strictEqual(legacy.length,1,'Eski Tatil Modu başlangıç/açılış alanları desteklenmeli.');
assert.strictEqual(legacy[0].bitisTarihi,'2026-06-22','Eski Tatil Modunda okul açılışından bir önceki gün son tatil olmalı.');

assert(code.includes("register?.('dersSaatleri',global.COL.dersSaatleri)"),'Nöbet Tatil Modu kaynağı dersSaatleri yerel verisini hazırlamalı.');
assert(code.includes('supplied?.(iso)||modeHolidayForDate(iso)'),'Otomatik nöbet dağıtımı hem resmî hem Tatil Modu tatillerini atlamalı.');
assert(code.includes('ka-duty-grid__holiday-mode'),'Nöbet tablosunda Tatil Modu günleri tatil satırı olarak işaretlenmeli.');
assert(code.includes('withCombinedHolidayRows'),'Nöbet raporu iki tatil kaynağını birlikte kullanmalı.');
assert(code.includes("title.textContent='Tatiller'"),'Nöbet tatil kartı birleşik kaynağı ifade etmeli.');
assert(!code.includes("AppStore?.setData?.('dersProgrami'"),'Bu özellik ders programı verisine yazmamalı.');
assert(!code.includes('COL.dersProgrami'),'Bu özellik ders programı koleksiyonuna dokunmamalı.');
assert(firebase.includes("js/core/duty-holiday-mode-source.js?v=923"),'Nöbet Tatil Modu kaynağı başlangıçta yüklenmeli.');
assert(sw.includes("'./js/core/duty-holiday-mode-source.js?v=923'"),'Nöbet Tatil Modu kaynağı offline precache içinde olmalı.');
const cache=sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/);
assert(cache&&Number(cache[1])>=923,'Yeni nöbet tatil kaynağı için service worker cache sürümü yükseltilmeli.');

console.log('Nöbet Tatil Modu kaynak sözleşmesi başarılı.');
