from pathlib import Path
p=Path('js/modules/school-live-status.js')
s=p.read_text()
old="hydrateLessonHours().then(()=>{updateHeader();tick()})"
new="hydrateLessonHours().then(()=>{updateHeader();lastTick='';tick()})"
if old not in s:
    raise SystemExit('live hydrate tick target not found')
p.write_text(s.replace(old,new,1))

t=Path('tests/classic-shell-v2-smoke.test.js')
ts=t.read_text()
anchor="assert(live.includes(\"SyncEngine.localHydrate(['dersSaatleri'])\"),'Zil sayacı önce cihazdaki ders saatlerini hydrate etmeli.');"
extra=anchor+"\nassert(live.includes(\"hydrateLessonHours().then(()=>{updateHeader();lastTick='';tick()})\"),'Ders saatleri local hydrate tamamlandığı anda fallback durum beklemeden gerçek program yeniden yayınlanmalı.');"
if anchor not in ts:
    raise SystemExit('live hydrate smoke anchor not found')
t.write_text(ts.replace(anchor,extra,1))
