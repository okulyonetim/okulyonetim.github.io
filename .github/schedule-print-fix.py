from pathlib import Path

p = Path('js/modules/academic.js')
s = p.read_text(encoding='utf-8')
old = "async function printScheduleReport(type,selection,meta=defaultScheduleReportMeta()){if(!global.ReportEngine?.printReport){toast?.('Rapor motoru hazır değil.');return false}"
new = "async function ensureScheduleReportEngine(){if(global.ReportEngine?.printReport)return global.ReportEngine;if(global.AppLoader?.loadScript)await global.AppLoader.loadScript('js/modules/report-engine.js');if(!global.ReportEngine?.printReport)throw new Error('Rapor motoru hazır değil.');return global.ReportEngine}\nasync function printScheduleReport(type,selection,meta=defaultScheduleReportMeta()){const reportEngine=await ensureScheduleReportEngine();"
if old not in s:
    raise SystemExit('printScheduleReport başlangıcı bulunamadı')
s = s.replace(old, new, 1)
old2 = "await global.ReportEngine.printReport(contextTitle,body,{fileName:contextTitle,yon:meta.yon,logoGoster:false,tarihGoster:false,baslikGoster:false,compact:type==='tumSiniflar'||type==='tumOgretmenler',fontSize:type==='tumSiniflar'||type==='tumOgretmenler'?7:8.5,kenarBosluk:type==='tumSiniflar'||type==='tumOgretmenler'?4:7});return true}"
new2 = "const preview=await reportEngine.printReport(contextTitle,body,{fileName:contextTitle,yon:meta.yon,logoGoster:false,tarihGoster:false,baslikGoster:false,compact:type==='tumSiniflar'||type==='tumOgretmenler',fontSize:type==='tumSiniflar'||type==='tumOgretmenler'?7:8.5,kenarBosluk:type==='tumSiniflar'||type==='tumOgretmenler'?4:7});if(!preview||!document.getElementById('kaReportPreview'))throw new Error('Rapor önizlemesi açılamadı.');return true}"
if old2 not in s:
    raise SystemExit('ReportEngine çağrısı bulunamadı')
s = s.replace(old2, new2, 1)
p.write_text(s.rstrip()+'\n', encoding='utf-8')

sw = Path('service-worker.js')
t = sw.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v816';" not in t:
    raise SystemExit('cache v816 bulunamadı')
t = t.replace("const CACHE_ADI='oy-cache-v816';", "const CACHE_ADI='oy-cache-v817';", 1)
sw.write_text(t.rstrip()+'\n', encoding='utf-8')

Path('tests/schedule-print-action.test.js').write_text("""const fs=require('fs');\nconst assert=require('assert');\nconst a=fs.readFileSync('js/modules/academic.js','utf8');\nconst sw=fs.readFileSync('service-worker.js','utf8');\nassert(a.includes('async function ensureScheduleReportEngine()'),'Ders programı rapor motoru hazır olma kontrolü eksik.');\nassert(a.includes("loadScript('js/modules/report-engine.js')"),'Rapor motoru gerektiğinde lazy-load edilmeli.');\nassert(a.includes("document.getElementById('kaReportPreview')"),'Yazdır düğmesi gerçek rapor önizlemesini doğrulamalı.');\nassert(a.includes("throw new Error('Rapor önizlemesi açılamadı.')"),'Sessiz yazdırma başarısızlığı engellenmeli.');\nassert(sw.includes("CACHE_ADI='oy-cache-v817'"),'Ders programı yazdırma düzeltmesi için cache sürümü artırılmalı.');\nconsole.log('Ders Programı çarşaf Yazdır akışı başarılı.');\n""",encoding='utf-8')
