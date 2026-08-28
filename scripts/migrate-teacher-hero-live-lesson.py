from pathlib import Path

p=Path('js/modules/dashboard.js')
s=p.read_text()
old="""function hero(){const mine=todayLessons({mine:true}),next=mine[0],reminders=teacherId()?collectReminders().filter(x=>x.gunFarki<=3).length:0;return `<section class=\"ka-home-hero\" data-dashboard-card=\"welcome\"><div class=\"ka-home-hero__top\"><div><span>${esc(greeting())},</span><h1>${esc(firstName())} 👋</h1><small>${esc(dayLong())}</small></div><span class=\"ka-home-hero__badge\">${isAdmin()?'Yönetici':'Öğretmen'}${reminders?` · 🔔 ${reminders}`:''}</span></div>${next?`<div class=\"ka-home-lesson-focus\"><div><small>Bugünkü ilk dersiniz</small><strong>${esc(lessonLabel(next))}</strong><span>${esc(classLabel(next))}${next.saat?` · ${esc(next.saat)}. ders`:''}</span></div>${routeButton('Programım','academic','schedule','Ders Programı','›')}</div>`:`<div class=\"ka-home-hero__quiet\">${isAdmin()?'Yönetim özeti cihaz verilerinden hazırlandı.':'Bugün için kişisel ders kaydı görünmüyor.'}</div>`}</section>`}
"""
new="""function hero(){const mine=todayLessons({mine:true}),live=window.SchoolLiveStatus?.status?.(),teacherMode=!isAdmin();let focus=mine[0]||null,focusLabel='Bugünkü ilk dersiniz';if(teacherMode&&mine.length){const current=live?.mode==='lesson'?mine.find(x=>Number(x.saat??x.dersSaati)===Number(live?.period)):null,next=mine.find(x=>Number(x.saat??x.dersSaati)===Number(live?.nextPeriod));if(current){focus=current;focusLabel='Şu anki dersiniz'}else if(next){focus=next;focusLabel='Sıradaki dersiniz'}else if(['after','weekend'].includes(live?.mode))focus=null}const reminders=teacherId()?collectReminders().filter(x=>x.gunFarki<=3).length:0,quiet=isAdmin()?'Yönetim özeti cihaz verilerinden hazırlandı.':live?.mode==='weekend'?'Bugün ders günü değil.':live?.mode==='after'?'Bugünkü dersler tamamlandı.':'Bugün için kişisel ders kaydı görünmüyor.';return `<section class=\"ka-home-hero\" data-dashboard-card=\"welcome\"><div class=\"ka-home-hero__top\"><div><span>${esc(greeting())},</span><h1>${esc(firstName())} 👋</h1><small>${esc(dayLong())}</small></div><span class=\"ka-home-hero__badge\">${isAdmin()?'Yönetici':'Öğretmen'}${reminders?` · 🔔 ${reminders}`:''}</span></div>${focus?`<div class=\"ka-home-lesson-focus\"><div><small>${esc(focusLabel)}</small><strong>${esc(lessonLabel(focus))}</strong><span>${esc(classLabel(focus))}${focus.saat?` · ${esc(focus.saat)}. ders`:''}</span></div>${routeButton('Programım','academic','schedule','Ders Programı','›')}</div>`:`<div class=\"ka-home-hero__quiet\">${esc(quiet)}</div>`}</section>`}
"""
if old not in s:
    raise SystemExit('guard failed: hero function contract changed')
s=s.replace(old,new,1)
p.write_text(s)

t=Path('tests/dashboard-card-routes-smoke.test.js')
ts=t.read_text()
extra="""
assert(dash.includes("focusLabel='Bugünkü ilk dersiniz'")&&dash.includes("focusLabel='Şu anki dersiniz'")&&dash.includes("focusLabel='Sıradaki dersiniz'"),'Öğretmen karşılama kartı canlı ders durumunu Şimdi/Sıradaki bağlamına çevirmeli.');
assert(dash.includes("live?.mode==='after'?'Bugünkü dersler tamamlandı.'")&&dash.includes("live?.mode==='weekend'?'Bugün ders günü değil.'"),'Karşılama kartı ders bitince geçmiş ilk dersi tekrar göstermemeli.');
"""
if "focusLabel='Şu anki dersiniz'" not in ts:
    t.write_text(ts+extra)
