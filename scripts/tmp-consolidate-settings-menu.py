from pathlib import Path

repo = Path('.')

# Runtime classic menu owner: keep only the canonical Settings landing and the
# separate Data Transfer Center. Detailed settings live inside SettingsModule.
app_path = repo / 'js/app-loader.js'
app = app_path.read_text(encoding='utf-8')
old_app = "{key:'settings',label:'Ayarlar',icon:'⚙️',tone:'slate',route:'settings',items:[['Ayarlar','⚙️','settings'],['Okul Bilgileri','🏢','settings','school'],['Veriler','🗄️','settings','data'],['Kullanıcı İşlemleri','🛡️','settings','users'],['Kullanıcı İstatistikleri','📋','settings','statistics']]}"
new_app = "{key:'settings',label:'Ayarlar',icon:'⚙️',tone:'slate',route:'settings',items:[['Ayarlar','⚙️','settings'],['Veriler','🗄️','settings','data']]}"
if old_app not in app:
    raise SystemExit('app-loader settings menu target not found')
app = app.replace(old_app, new_app, 1)
app_path.write_text(app, encoding='utf-8')

# Keep ShellUI's fallback catalog consistent with the runtime AppConfig catalog.
shell_path = repo / 'js/core/shell-ui.js'
shell = shell_path.read_text(encoding='utf-8')
old_shell = "{key:'settings',label:'Okul ve Sistem',modernLabel:'Ayarlar',icon:'⚙️',tone:'slate',route:'settings',items:[['Okul Bilgileri','🏢','settings','school'],['Ders Saatleri','⏱️','settings','lesson-hours'],['Veriler','🗄️','settings','data'],['Ayarlar','⚙️','settings'],['Kullanıcı İşlemleri','🛡️','settings','users'],['Kullanıcı İstatistikleri','📋','settings','statistics']]}"
new_shell = "{key:'settings',label:'Okul ve Sistem',modernLabel:'Ayarlar',icon:'⚙️',tone:'slate',route:'settings',items:[['Ayarlar','⚙️','settings'],['Veriler','🗄️','settings','data']]}"
if old_shell not in shell:
    raise SystemExit('shell-ui settings menu target not found')
shell = shell.replace(old_shell, new_shell, 1)
shell_path.write_text(shell, encoding='utf-8')

# Focused regression. Do not rewrite the broader classic-shell test merely to
# accommodate an unrelated stale bundle-version assertion already present there.
test_path = repo / 'tests/settings-menu-consolidation.test.js'
test_path.write_text("""const fs=require('fs');
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
""", encoding='utf-8')

print('Settings menu duplicate shortcuts consolidated.')
