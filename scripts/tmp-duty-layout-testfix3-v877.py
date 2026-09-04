from pathlib import Path
p=Path('tests/classic-shell-v2-smoke.test.js')
s=p.read_text(encoding='utf-8')
old="assert(ui.includes(\"function visibleGroups(){return MENU_GROUPS.filter(g=>g.hidden!==true&&visibleItems(g).length)}\"),'Bir menü grubunun kendi modülü gizli olsa bile içindeki izinli Tools sayfaları görünmeye devam etmeli.');"
new="assert(ui.includes(\"function visibleGroups(){return MENU_GROUPS.filter(g=>g.hidden!==true)}\")&&ui.includes('teacherMenuGroupAllowed(g)&&visibleItems(g).length'),'Bir menü grubunun kendi modülü gizli olsa bile taşınmış veya izinli alt sayfaları varsa grup görünmeye devam etmeli.');"
if old not in s:
    raise SystemExit('stale visibleGroups assertion not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
