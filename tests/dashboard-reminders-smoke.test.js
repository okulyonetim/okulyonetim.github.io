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
assert(src.includes("function teacherUpcomingRows(){return collectReminders(30).filter(x=>x.kaynak!=='sinav').slice(0,8)}"),'Öğretmen Teslim & Görev Takvimi merkezi 30 günlük motoru kullanmalı ve ayrı yazılı kartındaki sınavları tekrar etmemeli.');
assert(src.includes("if(isAdmin()){const rows=upcomingRows();if(!rows.length)return'';return `<section class=\"kh-section\" data-home-section=\"upcoming\""),'Yönetici Yaklaşan Etkinlik / Görevler kartı öğretmen zaman çizelgesinden ayrılmalı ve legacy kh-section sözleşmesini kullanmalı.');
assert(src.includes('data-dash-reminder-index'),'Öğretmen teslim/görev satırları doğrudan kendi hatırlatma hedefini açabilmeli.');
assert(src.includes("teacherUpcomingRows()[Number(btn.dataset.dashReminderIndex)]?.git?.()"),'Öğretmen satırı merkezi reminder hedefini kullanmalı; ikinci route eşlemesi oluşturulmamalı.');
assert(src.includes("Object.keys(REMINDER_DEFS).map(t=>'data.'+t)"),'Dashboard tüm hatırlatma kaynaklarının AppStore değişikliklerine abone olmalı.');
assert(src.includes("evrak:'📄'"),'Evrak teslimleri öğretmen kartında görünür bir kaynak olmalı.');
assert(src.includes("function collectReminders(daysOverride=null)"),'Hatırlatma motoru popup ve kart için tek motorla farklı görünüm ufku desteklemeli.');
assert(src.includes("scanDocuments(id,days)"),'Öğretmen zaman çizelgesi gerçek evrak takip kaynağını merkezi motor üzerinden kullanmalı.');
console.log('Dashboard birleşik öğretmen teslim/görev zaman çizelgesi sözleşmesi başarılı.');
assert(src.includes("'documents','evrak','Evrak Takibi'"),'Evrak teslim hatırlatması doğrudan Evrak Takibi alt sayfasına gitmeli.');
assert(src.includes("function route(module,page='',title='')"),'Hatırlatma rotası ikinci mapping oluşturmadan modül alt sayfasını taşıyabilmeli.');
console.log('Dashboard local-first hatırlatma motoru smoke testi başarılı.');

for(const target of [
  "sosyalKulupler:['tools','form-kulup','Sosyal Kulüpler']",
  "rehberlik:['tools','form-rehberlik','Rehberlik']",
  "maarifRapor:['tools','form-maarif','Maarif Model']",
  "zumre:['tools','form-zumre','Zümre']",
  "sok:['tools','form-sok','ŞÖK']",
  "bepPlani:['tools','form-bep','BEP Planları']",
  "belirliGunler:['tools','form-belirli','Belirli Günler ve Haftalar']",
  "kontrolListesi:['tools','checklists','Kontrol Listeleri']",
  "nobet:['management','duty','Nöbet Programı']",
  "sinav:['academic','written','Yazılı Sınavlar']"
]) assert(src.includes(target),'Hatırlatma kesin hedefi eksik: '+target);
assert(src.includes('function exactReminder(type,title,subtitle,diff)'),'Hatırlatma satırları genel modül yerine merkezi kesin hedef eşlemesini kullanmalı.');
assert(!src.includes("dayDiff(x.tarih),'academic'))"),'Yazılı hatırlatması genel Academic sayfasına düşmemeli.');
assert(!src.includes("dayDiff(x.tarihBaslangic),'tools'))"),'Belirli gün hatırlatması genel Tools sayfasına düşmemeli.');
// Checkpoint: reminder rows must keep exact subpage routing on main.
