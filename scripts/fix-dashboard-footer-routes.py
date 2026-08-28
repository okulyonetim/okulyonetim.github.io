from pathlib import Path
p=Path('js/modules/dashboard.js')
s=p.read_text()
old="function routeButton(label,module,icon='→'){return `<button class=\"ka-home-link\" type=\"button\" data-dash-route=\"${module}\"><span>${esc(label)}</span><b>${icon}</b></button>`}"
new="function routeButton(label,module,page='',title='',icon='→'){return `<button class=\"ka-home-link\" type=\"button\" data-dash-route=\"${module}\"${page?` data-dash-page=\"${esc(page)}\"`:''}${title?` data-dash-title=\"${esc(title)}\"`:''}><span>${esc(label)}</span><b>${icon}</b></button>`}"
if old not in s: raise SystemExit('routeButton contract missing')
s=s.replace(old,new,1)
s=s.replace("routeButton('Programım','academic','›')","routeButton('Programım','academic','schedule','Ders Programı','›')",1)
s=s.replace("routeButton('Tüm programı aç','academic','›')","routeButton('Tüm programı aç','academic','schedule','Ders Programı','›')",1)
s=s.replace("routeButton('Takvimi aç','communication','›')","routeButton('Takvimi aç','communication','calendar','Takvim','›')",1)
p.write_text(s)

t=Path('tests/dashboard-card-routes-smoke.test.js')
x=t.read_text()
anchor="assert(!shell.includes(\"stats:{module:\"),'Okul Özeti gerçek hedefi olmadığı için rastgele sayfa açmamalı.');"
extra="\nassert(dash.includes(\"routeButton('Programım','academic','schedule','Ders Programı','›')\"),'Hero Programım düğmesi doğrudan Ders Programı alt sayfasına gitmeli.');\nassert(dash.includes(\"routeButton('Takvimi aç','communication','calendar','Takvim','›')\"),'Takvim footer düğmesi doğrudan Takvim alt sayfasına gitmeli.');"
if extra.strip() not in x:
    if anchor not in x: raise SystemExit('test anchor missing')
    t.write_text(x.replace(anchor,anchor+extra,1))
