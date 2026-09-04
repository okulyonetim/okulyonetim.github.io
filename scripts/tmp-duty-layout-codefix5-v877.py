from pathlib import Path
p=Path('js/modules/settings.js')
s=p.read_text(encoding='utf-8')
old='<h3>Uygulama Düzeni</h3>'
new='<h3>Merkezi Uygulama Düzeni</h3>'
if old not in s:
    raise SystemExit('app layout heading not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
