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

# Regression: shell menu must not repeat pages already owned by SettingsModule.
test_path = repo / 'tests/classic-shell-v2-smoke.test.js'
test = test_path.read_text(encoding='utf-8')
old_decl = "const ui=fs.readFileSync('js/core/shell-ui.js','utf8');\n"
new_decl = old_decl + "const appLoader=fs.readFileSync('js/app-loader.js','utf8');\n"
if old_decl not in test or "const appLoader=fs.readFileSync('js/app-loader.js','utf8');" in test:
    raise SystemExit('classic-shell appLoader declaration target not found or already patched')
test = test.replace(old_decl, new_decl, 1)
old_direct = "  ['Okul Bilgileri','settings','school'],['Veriler','settings','data'],['Kullanıcı İşlemleri','settings','users'],['Kullanıcı İstatistikleri','settings','statistics']\n"
new_direct = "  ['Veriler','settings','data']\n"
if old_direct not in test:
    raise SystemExit('classic-shell settings directPages target not found')
test = test.replace(old_direct, new_direct, 1)
needle = "for(const [label,route,page] of directPages) assert(ui.includes(`['${label}'`)&&ui.includes(`'${route}','${page}'`),`Doğrudan menü hedefi eksik/yanlış: ${label} -> ${route}/${page}`);\n"
extra = "const uiMenuCatalog=ui.slice(ui.indexOf('const MENU_GROUPS=['),ui.indexOf('const FORM_PAGES='));\nconst appMenuCatalog=appLoader.slice(appLoader.indexOf('const CLASSIC_MENU_GROUPS=['),appLoader.indexOf('function applyClassicMenuGroups'));\nfor(const block of [uiMenuCatalog,appMenuCatalog]){\n  assert(block.includes(\"['Ayarlar','⚙️','settings']\")&&block.includes(\"['Veriler','🗄️','settings','data']\"),'Ayarlar menüsü canonical Settings girişi ile bağımsız Veriler merkezini korumalı.');\n  for(const duplicate of [\"['Okul Bilgileri','🏢','settings','school']\",\"['Ders Saatleri','⏱️','settings','lesson-hours']\",\"['Kullanıcı İşlemleri','🛡️','settings','users']\",\"['Kullanıcı İstatistikleri','📋','settings','statistics']\"])assert(!block.includes(duplicate),`Ayarlar alt sayfası shell menüsünde tekrar etmemeli: ${duplicate}`);\n}\n"
if needle not in test:
    raise SystemExit('classic-shell insertion target not found')
test = test.replace(needle, needle + extra, 1)
test_path.write_text(test, encoding='utf-8')

print('Settings menu duplicate shortcuts consolidated.')
