from pathlib import Path
p=Path('tests/menu-customization-v2.test.js')
s=p.read_text(encoding='utf-8')
old="assert(settings.includes('Ana Menü Düzenleyici')&&settings.includes('function readMenuLayoutFromDom()')&&settings.includes('menuLayout:readMenuLayoutFromDom()'),'Gelişmiş Settings menü düzeni yeni sabit panel tasarımında korunmalı.');"
new="assert(settings.includes('Menü ve ekran düzeni')&&settings.includes('function readMenuLayoutFromDom()')&&settings.includes('menuLayout:readMenuLayoutFromDom()'),'Gelişmiş Settings menü düzeni yeni sabit stüdyo tasarımında korunmalı.');"
if old not in s:
    raise SystemExit('old layout studio assertion not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
print('layout regression aligned')
