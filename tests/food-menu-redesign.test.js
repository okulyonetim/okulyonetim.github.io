const assert=require('assert');
const fs=require('fs');
const js=fs.readFileSync('js/modules/food-menu.js','utf8');
const base=fs.readFileSync('css/design-system-base.css','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');

/* Ekran: izin denetimlerinin dayandığı işaretler korunmalı. */
for(const hook of ['data-fm-add','data-fm-remove','data-fm-save','data-fm-item','data-fm-print','data-fm-day-card','data-fm-month-step','data-fm-week-step','data-fm-day-step','data-fm-today']){
  assert(js.includes(hook),`Yemek menüsü işareti eksik: ${hook}`);
}
/* Üç menü sayfası + üç A4 çıktı ayrı gövde üretir. */
for(const fn of ['function foodMenuPrintBody(','function foodWeekPrintBody(','function foodDayPrintBody(','function foodMenuPrintFontSize(']){
  assert(js.includes(fn),`Yemek çıktı fonksiyonu eksik: ${fn}`);
}
assert(js.includes("yon:'yatay'")&&js.includes("yon:'dikey'"),'Aylık/haftalık yatay, günlük dikey A4 olmalı.');
assert(js.includes('foodMenuPrintFontSize(weeks,data)')&&js.includes('fs>=4.5'),'Aylık çıktı en kalabalık haftaya göre yazı boyutu seçmeli ve en uzun menüde de sığmalı.');
assert(js.includes('--fm-rows:'),'Aylık ızgara satır sayısını CSS’e iletmeli (satırlar sayfayı doldurur).');
/* Hiçbir renk/ölçü JS içinde değil: görünüm merkezi CSS'te. */
assert(!/style="[^"]*#[0-9a-fA-F]{3,8}/.test(js),'food-menu.js satır içi renk içermemeli.');
assert(!/rgba?\(/.test(js),'food-menu.js rgb/rgba içermemeli.');
/* Merkezi CSS: ekran + yazdırma blokları ve haftanın günü renkleri. */
assert(base.includes('YEMEK MENÜSÜ'),'Merkezi CSS’te YEMEK MENÜSÜ bloğu olmalı.');
for(const sel of ['.ka-fm-day','.ka-fm-meter','.ka-fmp-grid','.ka-fmp-cell','.ka-fmp--day','.ka-fmp-dishes','.ka-fmp-stripe']){
  assert(base.includes(sel),`Merkezi CSS seçicisi eksik: ${sel}`);
}
for(let i=1;i<=5;i++)assert(base.includes(`--ka-food-d${i}`),`Hafta günü rengi eksik: --ka-food-d${i}`);
assert(base.includes('.ka-fmp[data-dow="3"]'),'Günlük çıktı kök öğesi gün rengini almalı.');
/* A4 kâğıdı tema değişkenlerine değil açık paleti kullanan merkezi sınıflara dayanır. */
assert(!/#v2ModuleRoot[^{]*\.ka-fmp/.test(base),'Yazdırma sınıfları #v2ModuleRoot kapsamına bağlı olmamalı.');
/* Sürüm: değişen modül yeniden yüklensin. */
assert(/food-menu\.js\?v=(10[3-9]\d|1[1-9]\d\d)/.test(loader),'food-menu.js sürümü app-loader içinde yükseltilmiş olmalı.');
console.log('food-menu-redesign: OK');
