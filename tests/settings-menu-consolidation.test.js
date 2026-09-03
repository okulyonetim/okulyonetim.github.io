const fs=require('fs');
const assert=require('assert');
const app=fs.readFileSync('js/app-loader.js','utf8');
const ui=fs.readFileSync('js/core/shell-ui.js','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');

const appMenu=app.slice(app.indexOf('const CLASSIC_MENU_GROUPS=['),app.indexOf('function applyClassicMenuGroups'));
const uiMenu=ui.slice(ui.indexOf('const MENU_GROUPS=['),ui.indexOf('const FORM_PAGES='));
assert(appMenu.length>0&&uiMenu.length>0,'Ayarlar menü katalogları bulunmalı.');

for(const block of [appMenu,uiMenu]){
  assert(block.includes("['Ayarlar','⚙️','settings']"),'Ayarlar menüsü canonical Settings girişini korumalı.');
  assert(block.includes("['Veriler','🗄️','settings','data']"),'Bağımsız Veri Aktarma Merkezi menüden erişilebilir kalmalı.');
  for(const duplicate of [
    "['Okul Bilgileri','🏢','settings','school']",
    "['Ders Saatleri','⏱️','settings','lesson-hours']",
    "['Kullanıcı İşlemleri','🛡️','settings','users']",
    "['Kullanıcı İstatistikleri','📋','settings','statistics']"
  ]) assert(!block.includes(duplicate),`Settings alt sayfası shell menüsünde tekrar etmemeli: ${duplicate}`);
}

for(const canonical of [
  "['school','Okul Bilgileri'",
  "['lesson-hours','Ders Saatleri'",
  "['users','Kullanıcı İşlemleri'",
  "['statistics','Kullanıcı İstatistikleri'"
]) assert(settings.includes(canonical),`Detay ayarı canonical SettingsModule içinde kalmalı: ${canonical}`);

assert(app.includes('function applyClassicMenuGroups()'),'Runtime classic menü uygulama akışı korunmalı.');
assert(ui.includes('function renderMenuList(key)')&&ui.includes('function bindMenuRoutes(root)'),'Shell menü yönlendirme sahibi değişmemeli.');
assert(!ui.includes('db.collection(')&&!ui.includes('firebase.firestore('),'Shell UI doğrudan Firestore kullanmamalı.');
console.log('Ayarlar menüsü tek giriş noktası + ayrı Veriler merkezi sözleşmesi başarılı.');
