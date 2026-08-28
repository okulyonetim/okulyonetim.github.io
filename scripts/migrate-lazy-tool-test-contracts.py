from pathlib import Path

files={
 'tests/payroll-change-v2-smoke.test.js':(
  "assert(index.includes('js/modules/payroll-change.js'),'V2 maaş formu üretim shell içinde yüklenmeli.');",
  "const shellUi=fs.readFileSync('js/core/shell-ui.js','utf8');\nconst sw=fs.readFileSync('service-worker.js','utf8');\nassert(!index.includes('<script src=\"js/modules/payroll-change.js\" defer></script>'),'V2 maaş formu ilk açılışta eager yüklenmemeli.');\nassert(sw.includes(\"'./js/modules/payroll-change.js'\"),'V2 maaş formu offline Service Worker cache içinde bulunmalı.');\nassert(shellUi.includes(\"loadScript?.('js/modules/payroll-change.js')\"),'V2 maaş formu özel route üzerinden ihtiyaç anında lazy yüklenmeli.');"
 ),
 'tests/assistant-v2-smoke.test.js':(
  "assert(index.includes('js/modules/assistant.js'),'V2 AI Asistan üretim shell içinde yüklenmeli.');",
  "const loader=fs.readFileSync('js/app-loader.js','utf8');\nconst sw=fs.readFileSync('service-worker.js','utf8');\nassert(!index.includes('<script src=\"js/modules/assistant.js\" defer></script>'),'V2 AI Asistan ilk açılışta eager yüklenmemeli.');\nassert(sw.includes(\"'./js/modules/assistant.js'\"),'V2 AI Asistan offline Service Worker cache içinde bulunmalı.');\nassert(loader.includes(\"define('communication',['js/modules/communication.js','js/modules/assistant.js'])\"),'V2 AI Asistan Communication lazy bundle ile yüklenmeli.');"
 ),
 'tests/legislation-engine-v2-smoke.test.js':(
  "assert(shell.includes('js/modules/legislation.js')&&shell.includes('js/modules/legislation-ui.js'),'Mevzuat V2 motoru ve presentation üretim shell tarafından yüklenmeli.');",
  "const sw=fs.readFileSync('service-worker.js','utf8');\nassert(!shell.includes('<script src=\"js/modules/legislation.js\" defer></script>')&&!shell.includes('<script src=\"js/modules/legislation-ui.js\" defer></script>'),'Mevzuat motoru ve presentation ilk açılışta eager yüklenmemeli.');\nassert(sw.includes(\"'./js/modules/legislation.js'\")&&sw.includes(\"'./js/modules/legislation-ui.js'\"),'Mevzuat motoru ve presentation offline Service Worker cache içinde bulunmalı.');\nassert(shellUi.includes(\"loadScript?.('js/modules/legislation.js')\")&&shellUi.includes(\"loadScript?.('js/modules/legislation-ui.js')\"),'Mevzuat motoru ve presentation Documents/mevzuat rotasında lazy yüklenmeli.');"
 ),
 'tests/rubric-settings-v2-smoke.test.js':(
  "assert(index.includes('js/modules/rubric-settings.js'),'RubricSettingsService production shell tarafından yüklenmeli.');",
  "const loader=fs.readFileSync('js/app-loader.js','utf8');\nconst sw=fs.readFileSync('service-worker.js','utf8');\nassert(!index.includes('<script src=\"js/modules/rubric-settings.js\" defer></script>'),'RubricSettingsService ilk açılışta eager yüklenmemeli.');\nassert(sw.includes(\"'./js/modules/rubric-settings.js'\"),'RubricSettingsService offline Service Worker cache içinde bulunmalı.');\nassert(loader.includes(\"'js/modules/rubric-settings.js','js/modules/rubric-tools.js'\"),'RubricSettingsService Tools lazy bundle ile yüklenmeli.');"
 ),
 'tests/rubric-tools-v2-smoke.test.js':(
  "assert(index.includes('js/modules/rubric-tools.js'),'Rubric Tools V2 bridge production shell tarafından yüklenmeli.');",
  "const loader=fs.readFileSync('js/app-loader.js','utf8');\nconst sw=fs.readFileSync('service-worker.js','utf8');\nassert(!index.includes('<script src=\"js/modules/rubric-tools.js\" defer></script>'),'Rubric Tools V2 bridge ilk açılışta eager yüklenmemeli.');\nassert(sw.includes(\"'./js/modules/rubric-tools.js'\"),'Rubric Tools V2 bridge offline Service Worker cache içinde bulunmalı.');\nassert(loader.includes(\"'js/modules/rubric-settings.js','js/modules/rubric-tools.js'\"),'Rubric Tools V2 bridge Tools lazy bundle ile yüklenmeli.');"
 )
}

for name,(old,new) in files.items():
 p=Path(name); s=p.read_text()
 if old not in s: raise SystemExit(f'stale eager assertion not found: {name}')
 p.write_text(s.replace(old,new,1))
