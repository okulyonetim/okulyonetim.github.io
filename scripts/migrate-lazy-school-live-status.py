from pathlib import Path

INDEX=Path('index.html')
LOADER=Path('js/app-loader.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

index=INDEX.read_text()
loader=LOADER.read_text()
test=TEST.read_text()

line='  <script src="js/modules/school-live-status.js" defer></script>\n'
if line not in index: raise SystemExit('eager SchoolLiveStatus script not found')
index=index.replace(line,'',1)

old="define('dashboard',['js/modules/dashboard.js']);"
new="define('dashboard',['js/modules/school-live-status.js','js/modules/dashboard.js']);"
if old not in loader: raise SystemExit('dashboard registry marker missing')
loader=loader.replace(old,new,1)

old_test="assert(shell.includes('js/modules/school-live-status.js'),'Canlı zil/hava V2 runtime production shell içinde bulunmalı.');"
new_test="assert(!shell.includes('<script src=\"js/modules/school-live-status.js\" defer></script>'),'Canlı zil/hava motoru ilk açılış shellinde eager yüklenmemeli.');"
if old_test not in test: raise SystemExit('stale SchoolLiveStatus shell assertion missing')
test=test.replace(old_test,new_test,1)

marker="const optionalLoaderSource=fs.readFileSync('js/app-loader.js','utf8');"
addition="\nassert(optionalLoaderSource.includes(\"define('dashboard',['js/modules/school-live-status.js','js/modules/dashboard.js'])\"),'Dashboard açılmadan önce SchoolLiveStatus lazy bundle içinde yüklenmeli.');"
if marker not in test: raise SystemExit('optional loader source marker missing')
if addition.strip() not in test: test=test.replace(marker,marker+addition,1)

INDEX.write_text(index)
LOADER.write_text(loader)
TEST.write_text(test)
