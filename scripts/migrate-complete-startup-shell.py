from pathlib import Path

SW=Path('service-worker.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

sw=SW.read_text()
test=TEST.read_text()

old="  './js/modules/rubric-settings.js','./js/modules/rubric-tools.js','./js/modules/rubric-tools-engine.js',\n"
new="  './js/modules/payroll-change.js','./js/modules/assistant.js','./js/modules/legislation.js','./js/modules/legislation-ui.js',\n  './js/modules/rubric-settings.js','./js/modules/rubric-tools.js','./js/modules/rubric-tools-engine.js',\n"
if old not in sw:
    raise SystemExit('service worker startup module marker not found')
sw=sw.replace(old,new,1)

marker="for(const lazy of ['./js/modules/dashboard.js','./js/modules/people.js','./js/modules/academic.js','./js/modules/management.js','./js/modules/communication.js','./js/modules/report-engine.js','./js/modules/transport.js','./js/modules/documents.js','./js/modules/tools.js','./js/modules/teacher-list.js','./js/modules/map-ui.js','./js/modules/settings.js']) assert(sw.includes(lazy),`AppLoader lazy modülü offline PWA shell cache içinde bulunmalı: ${lazy}`);"
addition="\nconst sameOriginStartup=[...shell.matchAll(/<script src=\"(?!https?:|\/\/)([^\"]+)\" defer><\\/script>/g)].map(m=>'./'+m[1].replace(/^\.\//,''));\nfor(const src of sameOriginStartup) assert(sw.includes(`'${src}'`),`Aynı-origin startup script offline PWA shell cache içinde bulunmalı: ${src}`);"
if marker not in test:
    raise SystemExit('lazy shell assertion marker not found')
if addition.strip() not in test:
    test=test.replace(marker,marker+addition,1)

SW.write_text(sw)
TEST.write_text(test)
