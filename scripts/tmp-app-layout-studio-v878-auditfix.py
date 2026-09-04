from pathlib import Path
p=Path('js/modules/settings.js')
s=p.read_text(encoding='utf-8')
old='<span class="ka-badge">Uygulama Düzeni</span>'
new='<span class="ka-badge">Merkezi Uygulama Düzeni</span>'
if old not in s:
    raise SystemExit('layout intro badge baseline not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
print('architecture label preserved')
