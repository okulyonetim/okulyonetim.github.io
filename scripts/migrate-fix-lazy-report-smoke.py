from pathlib import Path
p=Path('tests/classic-shell-v2-smoke.test.js')
s=p.read_text()
old="for(const module of ['academic','management','documents']) assert(optionalLoaderSource.includes(`define('${module}',['js/modules/report-engine.js','js/modules/${module}.js'])`),`${module} modülü ReportEngine bağımlılığını lazy bundle içinde önce yüklemeli.`);\nassert(optionalLoaderSource.includes(\"define('transport',['js/modules/report-engine.js','js/modules/transport.js'])\"),'Transport modülü ReportEngine bağımlılığını lazy bundle içinde korumalı.');"
new="for(const module of ['academic','management']) assert(optionalLoaderSource.includes(`define('${module}',['js/modules/report-engine.js','js/modules/${module}.js'])`),`${module} modülü ReportEngine bağımlılığını lazy bundle içinde önce yüklemeli.`);\nconst documentsBundle=optionalLoaderSource.match(/define\\('documents',\\[([^\\]]+)\\]\\)/)?.[1]||'';\nassert(documentsBundle.includes(\"'js/modules/report-engine.js'\")&&documentsBundle.includes(\"'js/modules/documents.js'\")&&documentsBundle.indexOf(\"'js/modules/report-engine.js'\")<documentsBundle.indexOf(\"'js/modules/documents.js'\"),'documents modülü ek lazy bağımlılıklar olsa da ReportEngine bağımlılığını documents.js’den önce yüklemeli.');\nassert(optionalLoaderSource.includes(\"define('transport',['js/modules/report-engine.js','js/modules/transport.js'])\"),'Transport modülü ReportEngine bağımlılığını lazy bundle içinde korumalı.');"
if old not in s:
    raise SystemExit('stale report-engine assertion block not found')
s=s.replace(old,new)
old2="assert(optionalLoaderSource.includes(\"define('communication',['js/modules/communication.js','js/modules/assistant.js'])\"),'AI Asistan Communication lazy bundle ile yüklenmeli.');"
new2="const communicationBundle=optionalLoaderSource.match(/define\\('communication',\\[([^\\]]+)\\]\\)/)?.[1]||'';\nassert(communicationBundle.includes(\"'js/modules/communication.js'\")&&communicationBundle.includes(\"'js/modules/assistant.js'\")&&communicationBundle.indexOf(\"'js/modules/communication.js'\")<communicationBundle.indexOf(\"'js/modules/assistant.js'\"),'AI Asistan ek lazy bağımlılıklar olsa da Communication bundle içinde communication.js sonrasında yüklenmeli.');"
if old2 not in s:
    raise SystemExit('stale communication lazy assertion not found')
s=s.replace(old2,new2)
p.write_text(s)
