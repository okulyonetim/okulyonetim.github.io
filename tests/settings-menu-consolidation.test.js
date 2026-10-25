/* Menü kataloğu (js/core/app-nav.js) tek kaynaktır: Ayarlar tek girişten, Settings alt sayfaları ikinci kez araç olarak listelenmez. */
const fs=require('fs');
const assert=require('assert');
const nav=fs.readFileSync('js/core/app-nav.js','utf8');
const ui=fs.readFileSync('js/core/shell-ui.js','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');
const catalogEnd=nav.indexOf("].forEach(([id,label,ic,tone,sub,route,page='',need])");
const tools=nav.slice(nav.indexOf('const TOOLS={}'),catalogEnd);
assert(tools.length>0&&catalogEnd>0,'Araç kataloğu bulunmalı.');

assert(tools.includes("['settings','Ayarlar','sliders','slate','Okul, kullanıcılar, hesap','settings']"),'Ayarlar canonical Settings girişini korumalı.');
assert(!/'settings','data'\]/.test(tools),'Veriler Ayarlar > Sistem Yönetimi içinde durur; araç olarak ikinci kez yer almamalı.');
for(const duplicate of ["'settings','lesson-hours'","'settings','users'","'settings','statistics'","'settings','roles'"])
  assert(!tools.includes(duplicate),`Settings alt sayfası araç listesinde tekrar etmemeli: ${duplicate}`);

assert(tools.includes("['documents','Dökümanlar','folder'"),'Dokümanlar arşivi korunmalı.');
assert(tools.includes("'documents','pdf-images']")&&tools.includes("'documents','pdf-merge']"),'PDF araçları (Resimden PDF, PDF Birleştir) doğrudan araç olarak listelenmeli.');
assert(!/mevzuat/i.test(tools),'Mevzuat menüden tamamen kaldırılmış olmalı.');
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
