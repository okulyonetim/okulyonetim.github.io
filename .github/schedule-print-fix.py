from pathlib import Path

academic = Path('js/modules/academic.js')
text = academic.read_text(encoding='utf-8')
old_guard = "async function printScheduleReport(type,selection,meta=defaultScheduleReportMeta()){if(!global.ReportEngine?.printReport){toast?.('Rapor motoru hazır değil.');return false}"
new_guard = "async function printScheduleReport(type,selection,meta=defaultScheduleReportMeta()){if(!globalThis.ReportEngine?.printReport){toast?.('Rapor motoru hazır değil.');return false}"
if old_guard not in text:
    raise SystemExit('printScheduleReport guard bulunamadı')
text = text.replace(old_guard, new_guard, 1)
old_call = "await global.ReportEngine.printReport(contextTitle,body,{"
new_call = "await globalThis.ReportEngine.printReport(contextTitle,body,{"
if old_call not in text:
    raise SystemExit('printScheduleReport çağrısı bulunamadı')
text = text.replace(old_call, new_call, 1)
academic.write_text(text, encoding='utf-8')

sw = Path('service-worker.js')
sw_text = sw.read_text(encoding='utf-8')
if "CACHE_ADI='oy-cache-v816'" not in sw_text:
    raise SystemExit('Beklenen cache sürümü v816 değil')
sw.write_text(sw_text.replace("CACHE_ADI='oy-cache-v816'", "CACHE_ADI='oy-cache-v817'", 1), encoding='utf-8')

Path('tests/schedule-report-print-bridge.test.js').write_text("""const fs=require('fs');
const assert=require('assert');
const academic=fs.readFileSync('js/modules/academic.js','utf8');
const engine=fs.readFileSync('js/modules/report-engine.js','utf8');
const plugin=fs.readFileSync('android/app/src/main/java/com/koruk/okul/PrintPlugin.java','utf8');
const activity=fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
assert(academic.includes('if(!globalThis.ReportEngine?.printReport)'), 'Çarşaf raporunda ReportEngine browser/Android güvenli globalThis üzerinden bulunmalı.');
assert(academic.includes('await globalThis.ReportEngine.printReport(contextTitle,body,{'), 'Çarşaf raporu ReportEngine çağrısını globalThis üzerinden yapmalı.');
assert(!academic.includes('if(!global.ReportEngine?.printReport)'), 'Çarşaf raporunda tanımsız global.ReportEngine guard kalmamalı.');
assert(engine.includes('[data-report-print]')&&engine.includes('await printHtml(html,name,safeYon)'), 'Rapor önizleme Yazdır / PDF düğmesi merkezi printHtml köprüsüne bağlı olmalı.');
assert(engine.includes('Plugins?.PrintPlugin')&&engine.includes('plugin.yazdir({html,isAdi:fileName(name)'), 'Native rapor yazdırma PrintPlugin.yazdir köprüsünü kullanmalı.');
assert(plugin.includes('@CapacitorPlugin(name = \"PrintPlugin\")')&&plugin.includes('public void yazdir(PluginCall call)'), 'Android PrintPlugin yazdir metodu korunmalı.');
assert(activity.includes('registerPlugin(PrintPlugin.class);'), 'MainActivity PrintPlugin kaydını korumalı.');
const m=sw.match(/CACHE_ADI='oy-cache-v(\\d+)'/);assert(m&&Number(m[1])>=817,'Çarşaf yazdırma JS düzeltmesi için PWA cache artırılmalı.');
console.log('Ders Programı çarşaf Yazdır -> ReportEngine -> Android PrintPlugin köprüsü başarılı.');
""", encoding='utf-8')
