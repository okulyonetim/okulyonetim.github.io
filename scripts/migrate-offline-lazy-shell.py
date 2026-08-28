from pathlib import Path

SW=Path('service-worker.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

sw=SW.read_text()
test=TEST.read_text()

broken="self.addEventListener('notificationclick',event=>{event.notification.close();const hedef=event.notification?.data?.url||'./';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate?.(hedef);return c.focus();}}return clients.openWindow?clients.openWindow(hedef):null});});"
fixed="self.addEventListener('notificationclick',event=>{event.notification.close();const hedef=event.notification?.data?.url||'./';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate?.(hedef);return c.focus();}}return clients.openWindow?clients.openWindow(hedef):null;}));});"
if broken not in sw:
    raise SystemExit('broken notificationclick contract not found')
sw=sw.replace(broken,fixed,1)

old="  './js/firebase-init.js','./js/core/core.js','./js/core/platform/widget-adapter.js','./js/core/shell-ui.js','./js/modules/school-live-status.js','./js/modules/report-engine.js','./js/modules/dashboard.js','./js/modules/people.js','./js/modules/academic.js','./js/modules/management.js','./js/modules/documents.js','./js/modules/tools.js',\n"
new="  './js/firebase-init.js','./js/core/core.js','./js/core/platform/widget-adapter.js','./js/core/shell-ui.js','./js/modules/school-live-status.js','./js/modules/report-engine.js','./js/modules/dashboard.js','./js/modules/people.js','./js/modules/academic.js','./js/modules/management.js','./js/modules/communication.js','./js/modules/transport.js','./js/modules/documents.js','./js/modules/tools.js','./js/modules/teacher-list.js','./js/modules/map-ui.js','./js/modules/settings.js',\n"
if old not in sw:
    raise SystemExit('service worker module shell line not found')
sw=sw.replace(old,new,1)

marker="assert(sw.includes('./js/modules/school-live-status.js'),'Canlı durum offline PWA shell içinde önbelleğe alınmalı.');"
addition="\nfor(const lazy of ['./js/modules/dashboard.js','./js/modules/people.js','./js/modules/academic.js','./js/modules/management.js','./js/modules/communication.js','./js/modules/report-engine.js','./js/modules/transport.js','./js/modules/documents.js','./js/modules/tools.js','./js/modules/teacher-list.js','./js/modules/map-ui.js','./js/modules/settings.js']) assert(sw.includes(lazy),`AppLoader lazy modülü offline PWA shell cache içinde bulunmalı: ${lazy}`);\nassert(sw.includes(\"return clients.openWindow?clients.openWindow(hedef):null;}));});\"),'Service Worker notificationclick event.waitUntil zinciri sözdizimsel olarak tam kapanmalı.');"
if marker not in test:
    raise SystemExit('service worker smoke marker not found')
if addition.strip() not in test:
    test=test.replace(marker,marker+addition,1)

SW.write_text(sw)
TEST.write_text(test)
