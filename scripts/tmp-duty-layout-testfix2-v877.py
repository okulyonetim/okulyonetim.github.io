from pathlib import Path
p=Path('tests/classic-shell-v2-smoke.test.js')
s=p.read_text(encoding='utf-8')
old="assert(optionalLoaderSource.includes(\"define('management',['js/modules/report-engine.js','js/modules/management.js'])\"),'management modülü ReportEngine bağımlılığını lazy bundle içinde önce yüklemeli.');"
new="const managementBundle=normalizeLoaderBundle(optionalLoaderSource.match(/define\\('management',\\[([^\\]]+)\\]\\)/)?.[1]||'');\nassert(managementBundle.includes(\"'js/modules/report-engine.js'\")&&managementBundle.includes(\"'js/modules/management.js'\")&&managementBundle.indexOf(\"'js/modules/report-engine.js'\")<managementBundle.indexOf(\"'js/modules/management.js'\"),'management modülü ReportEngine bağımlılığını lazy bundle içinde önce yüklemeli.');"
if old not in s:
    raise SystemExit('stale management bundle assertion not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
