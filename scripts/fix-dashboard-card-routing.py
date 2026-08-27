from pathlib import Path

p=Path('js/core/shell-ui.js')
s=p.read_text()
old="const DASHBOARD_ROUTES={announcements:'communication',polls:'communication',news:'communication',stats:'people',duty:'management',absences:'management',upcoming:'communication',lessons:'academic','week-duty':'management',exams:'academic',schedule:'academic',notes:'communication',calendar:'communication'};"
new="const DASHBOARD_ROUTES={announcements:{module:'communication',page:'announcements',title:'Duyurular'},polls:{module:'communication',page:'polls',title:'Anketler'},news:{module:'communication',page:'news',title:'Haberler'},duty:{module:'management',page:'duty',title:'Nöbet Programı'},absences:{module:'management',page:'leaves',title:'İzinler'},upcoming:{module:'communication',page:'calendar',title:'Takvim'},lessons:{module:'academic',page:'schedule',title:'Ders Programı'},'week-duty':{module:'management',page:'duty',title:'Nöbet Programı'},exams:{module:'academic',page:'written',title:'Yazılı Sınavlar'},schedule:{module:'academic',page:'schedule',title:'Ders Programı'},notes:{module:'communication',page:'notes',title:'Notlar'},calendar:{module:'communication',page:'calendar',title:'Takvim'}};"
if old not in s: raise SystemExit('DASHBOARD_ROUTES contract missing')
s=s.replace(old,new,1)
old="function bindDashboardCards(){document.addEventListener('click',e=>{if(e.target.closest('button,a,input,select,textarea,label'))return;const hero=e.target.closest('.ka-home-hero');if(hero){routeModule('academic',{bottom:'menu'});return}const card=e.target.closest('[data-home-section]');if(!card)return;const target=DASHBOARD_ROUTES[card.dataset.homeSection];if(target)routeModule(target,{bottom:'menu'});})}"
new="function bindDashboardCards(){document.addEventListener('click',e=>{if(e.target.closest('button,a,input,select,textarea,label'))return;const card=e.target.closest('[data-home-section]');if(!card)return;const target=DASHBOARD_ROUTES[card.dataset.homeSection];if(target)routeModule(target.module,{bottom:'menu',page:target.page||'',title:target.title||''});})}"
if old not in s: raise SystemExit('bindDashboardCards contract missing')
s=s.replace(old,new,1)
p.write_text(s)

p=Path('tests/dashboard-card-routes-smoke.test.js')
s=p.read_text()
old="""for(const pair of [\"announcements:'communication'\",\"news:'communication'\",\"stats:'people'\",\"duty:'management'\",\"lessons:'academic'\",\"'week-duty':'management'\",\"exams:'academic'\",\"schedule:'academic'\",\"notes:'communication'\",\"calendar:'communication'\"]){
  assert(shell.includes(pair),`Dashboard kart rotası eksik: ${pair}`);
}
assert(shell.includes(\"closest('[data-home-section]')\"),'Dashboard kart gövdesi tıklanabilir olmalı.');"""
new="""for(const pair of [\"announcements:{module:'communication',page:'announcements'\",\"polls:{module:'communication',page:'polls'\",\"news:{module:'communication',page:'news'\",\"duty:{module:'management',page:'duty'\",\"absences:{module:'management',page:'leaves'\",\"lessons:{module:'academic',page:'schedule'\",\"'week-duty':{module:'management',page:'duty'\",\"exams:{module:'academic',page:'written'\",\"notes:{module:'communication',page:'notes'\",\"calendar:{module:'communication',page:'calendar'\"]){
  assert(shell.includes(pair),`Dashboard kartının gerçek alt sayfa rotası eksik: ${pair}`);
}
assert(shell.includes(\"closest('[data-home-section]')\"),'Dashboard kart gövdesi tıklanabilir olmalı.');
assert(shell.includes(\"routeModule(target.module,{bottom:'menu',page:target.page||'',title:target.title||''})\"),'Dashboard kartı yalnız modüle değil gerçek alt sayfaya gitmeli.');
assert(!shell.includes(\"const hero=e.target.closest('.ka-home-hero');if(hero){routeModule('academic'\"),'Karşılama kartı alakasız Academic sayfasına yönlendirmemeli.');
assert(!shell.includes(\"stats:{module:\"),'Okul Özeti gerçek hedefi olmadığı için rastgele sayfa açmamalı.');"""
if old not in s: raise SystemExit('dashboard route test contract missing')
s=s.replace(old,new,1)
p.write_text(s)
