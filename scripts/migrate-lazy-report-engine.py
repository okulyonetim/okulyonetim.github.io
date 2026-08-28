from pathlib import Path

INDEX=Path('index.html')
LOADER=Path('js/app-loader.js')
UI=Path('js/core/shell-ui.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')
PRINT_TEST=Path('tests/report-native-print-routing-smoke.test.js')

index=INDEX.read_text()
loader=LOADER.read_text()
ui=UI.read_text()
test=TEST.read_text()
print_test=PRINT_TEST.read_text()

line='  <script src="js/modules/report-engine.js" defer></script>\n'
if line not in index: raise SystemExit('eager report engine script not found')
index=index.replace(line,'',1)

for old,new in [
 ("define('academic',['js/modules/academic.js']);","define('academic',['js/modules/report-engine.js','js/modules/academic.js']);"),
 ("define('management',['js/modules/management.js']);","define('management',['js/modules/report-engine.js','js/modules/management.js']);"),
 ("define('documents',['js/modules/documents.js']);","define('documents',['js/modules/report-engine.js','js/modules/documents.js']);")
]:
 if old not in loader: raise SystemExit('registry marker missing: '+old)
 loader=loader.replace(old,new,1)

old="if(!global.PayrollChangeModule?.open)await global.AppLoader?.loadScript?.('js/modules/payroll-change.js');"
new="if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');\n      if(!global.PayrollChangeModule?.open)await global.AppLoader?.loadScript?.('js/modules/payroll-change.js');"
if old not in ui: raise SystemExit('payroll lazy marker missing')
ui=ui.replace(old,new,1)

marker="for(const src of optionalLazy) assert(!shell.includes(`<script src=\"${src}\" defer></script>`),`Opsiyonel araç ilk açılışta eager yüklenmemeli: ${src}`);"
addition="""
assert(!shell.includes('<script src=\"js/modules/report-engine.js\" defer></script>'),'Merkezi ReportEngine ilk açılışta eager yüklenmemeli.');
for(const module of ['academic','management','documents']) assert(appLoaderSource.includes(`define('${module}',['js/modules/report-engine.js','js/modules/${module}.js'])`),`${module} modülü ReportEngine bağımlılığını lazy bundle içinde önce yüklemeli.`);
assert(appLoaderSource.includes("define('transport',['js/modules/report-engine.js','js/modules/transport.js'])"),'Transport modülü ReportEngine bağımlılığını lazy bundle içinde korumalı.');
assert(ui.includes("if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js')"),'Maaş özel rotası ReportEngine hazır değilse ihtiyaç anında yüklemeli.');
assert(sw.includes("'./js/modules/report-engine.js'"),'ReportEngine offline Service Worker cache içinde bulunmalı.');"""
if marker not in test: raise SystemExit('optional lazy assertion marker missing')
if addition.strip() not in test: test=test.replace(marker,marker+addition,1)

old="assert(report.includes('global.open(url,\\'_blank\\')'), 'Web/PWA için yeni pencere fallback’i bulunmalı.');\nassert(report.includes('win.print()'), 'Web fallback tarayıcı yazdırmasını kullanmalı.');"
new="assert(report.includes(\"document.createElement('iframe')\")&&report.includes('f.srcdoc=html'), 'Web/PWA yazdırma izole iframe içinde hazırlanmalı.');\nassert(report.includes('f.contentWindow?.print()'), 'Web fallback iframe contentWindow üzerinden tarayıcı yazdırmasını kullanmalı.');"
if old not in print_test: raise SystemExit('stale web print smoke assertions not found')
print_test=print_test.replace(old,new,1)

INDEX.write_text(index)
LOADER.write_text(loader)
UI.write_text(ui)
TEST.write_text(test)
PRINT_TEST.write_text(print_test)
