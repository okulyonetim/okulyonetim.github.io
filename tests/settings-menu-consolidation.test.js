/* Menü kataloğu (js/core/app-nav.js) tek kaynaktır: Ayarlar tek girişten, Settings alt sayfaları ikinci kez araç olarak listelenmez. */
const fs=require('fs');
const assert=require('assert');
const {loadNav}=require('./helpers/app-nav');
const cat=loadNav().N.catalog();
const has=(id,route,page='')=>cat.some(t=>t.id===id&&t.route===route&&t.page===page);
const ui=fs.readFileSync('js/core/shell-ui.js','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');
assert(cat.length>0,'Araç kataloğu bulunmalı.');

assert(has('settings','settings')&&cat.find(t=>t.id==='settings').label==='Ayarlar','Ayarlar canonical Settings girişini korumalı.');
assert(!cat.some(t=>t.route==='settings'&&t.page==='data'),'Veriler Ayarlar > Sistem Yönetimi içinde durur; araç olarak ikinci kez yer almamalı.');
for(const sub of ['lesson-hours','users','statistics','roles'])
  assert(!cat.some(t=>t.route==='settings'&&t.page===sub),`Settings alt sayfası araç listesinde tekrar etmemeli: ${sub}`);

assert(cat.some(t=>t.id==='documents'&&t.label==='Dökümanlar'),'Dokümanlar arşivi korunmalı.');
assert(has('pdf-images','documents','pdf-images')&&has('pdf-merge','documents','pdf-merge'),'PDF araçları (Resimden PDF, PDF Birleştir) doğrudan araç olarak listelenmeli.');
assert(!/mevzuat/i.test(JSON.stringify(cat)),'Mevzuat menüden tamamen kaldırılmış olmalı.');
assert(ui.includes("if(name==='documents'&&page==='evrak'"),'Evrak Takibi canonical route korunmalı.');
assert(!ui.includes("if(name==='documents'&&!page)return false"),'Dökümanlar kök sayfası engellenmemeli.');

for(const canonical of [
  "['school','Okul bilgileri ve kurulum'",
  "['lesson-hours','Ders Saatleri'",
  "['users','Kullanıcı İşlemleri'",
  "['statistics','Kullanıcı İstatistikleri'"
]) assert(settings.includes(canonical),`Detay ayarı canonical SettingsModule içinde kalmalı: ${canonical}`);

assert(!ui.includes('function renderMenuList(')&&!ui.includes('const MENU_GROUPS=['),'Eski ana menü kataloğu/renderlayıcısı geri dönmemeli.');
assert(!ui.includes('db.collection(')&&!ui.includes('firebase.firestore('),'Shell UI doğrudan Firestore kullanmamalı.');
console.log('Ayarlar tek giriş noktası + tek araç kataloğu sözleşmesi başarılı.');
