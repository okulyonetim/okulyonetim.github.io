const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/dashboard.js','utf8');
new Function(src);

for(const api of ['collectReminders','maybeShowReminders','prepareReminderData','reminderSnoozed','snoozeReminders']){
  assert(src.includes(api),`Dashboard hatırlatma motoru ${api} sözleşmesini korumalı.`);
}
for(const source of ['gorevler','evrakTakibi','nobetAtamalari','sosyalKulupler','rehberlik','maarifRapor','zumre','sok','bepPlani','belirliGunler','kontrolListeleri','sinavlar']){
  assert(src.includes(source),`Hatırlatma kaynağı korunmalı: ${source}`);
}
assert(src.includes("return`${y}-${String(m+1).padStart(2,'0')}-07`"),'Aylık rapor teslimi sonraki ayın 7si olarak korunmalı.');
assert(src.includes("KorukLocalFirst.meta(u,'reminderSnoozeUntil'"),'Erteleme localStorage yerine IndexedDB meta kullanmalı.');
assert(!src.includes("localStorage.setItem('hatirlatmaErteleZamani'"),'Eski localStorage erteleme geri dönmemeli.');
assert(!src.includes('db.collection'),'Dashboard hatırlatma motoru Firestore doğrudan kullanmamalı.');
assert(!src.includes('onSnapshot'),'Dashboard hatırlatma motoru snapshot dinlememeli.');
assert(src.includes("className='ka-modal-backdrop'")||src.includes("className='ka-modal-backdrop'"),'Hatırlatma penceresi merkezi modal bileşenini kullanmalı.');
assert(src.includes('holidayMode()'),'Tatil modunda hatırlatma popupı gösterilmemeli.');
assert(src.includes('.sort((a,b)=>a.gunFarki-b.gunFarki)'),'En geciken/en yakın madde üstte kalmalı.');
console.log('Dashboard local-first hatırlatma motoru smoke testi başarılı.');
