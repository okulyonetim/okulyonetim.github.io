from pathlib import Path

p=Path('js/core/shell-ui.js')
text=p.read_text(encoding='utf-8')
old="function visibleGroups(){return MENU_GROUPS.map(menuGroupView).filter(g=>g.hidden!==true&&g.__menuVisible!==false&&visibleItems(g).length).sort((a,b)=>a.__menuOrder-b.__menuOrder)}"
new="function visibleGroups(){return MENU_GROUPS.filter(g=>g.hidden!==true&&visibleItems(g).length)}\nfunction customizedVisibleGroups(){return visibleGroups().map((g,index)=>menuGroupView(g,index)).filter(g=>g.__menuVisible!==false&&visibleItems(g).length).sort((a,b)=>a.__menuOrder-b.__menuOrder)}"
if old not in text: raise SystemExit('visibleGroups generated contract not found')
text=text.replace(old,new,1)
text=text.replace('const cards=visibleGroups();','const cards=customizedVisibleGroups();',1)
text=text.replace("g=visibleGroups().find(x=>x.key===key)","g=customizedVisibleGroups().find(x=>x.key===key)",1)
text=text.replace('class=\"ka-menu-list ka-stack\"','class=\"ka-stack ka-page ka-menu-list\"',1)
p.write_text(text,encoding='utf-8')

p=Path('tests/menu-customization-v2.test.js')
text=p.read_text(encoding='utf-8')
text=text.replace("shell.includes('data-menu-custom-color')&&shell.includes('visibleGroups().find')","shell.includes('data-menu-custom-color')&&shell.includes('customizedVisibleGroups().find')")
p.write_text(text,encoding='utf-8')
