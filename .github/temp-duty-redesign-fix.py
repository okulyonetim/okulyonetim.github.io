from pathlib import Path

p=Path('js/modules/management.js')
s=p.read_text(encoding='utf-8')
old='<section class="ka-stack ka-duty-page">'
new='<section class="ka-stack ka-duty-page" aria-label="Nöbet Programı">'
if old not in s:
    raise SystemExit('canonical duty page marker not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('Duty page semantic title contract restored.')
