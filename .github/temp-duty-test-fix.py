from pathlib import Path

p=Path('tests/duty-report-full-parity.test.js')
s=p.read_text(encoding='utf-8')
old="assert(report.includes(\"const page=o.yon==='yatay'?'A4 landscape':'A4 portrait'\")&&report.includes('@page{size:${page};margin:0}'),'Merkezi ReportEngine gerçek A4 portrait/landscape sayfa boyutunu korumalı.');"
new="assert(report.includes(\"page=o.yon==='yatay'?'A4 landscape':'A4 portrait'\")&&report.includes('@page{size:${page};margin:0}'),'Merkezi ReportEngine gerçek A4 portrait/landscape sayfa boyutunu korumalı.');"
if old not in s: raise SystemExit('duty report engine assertion not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')

p=Path('tests/classic-duty-v2-smoke.test.js')
s=p.read_text(encoding='utf-8')
old="assert(src.includes('ka-duty-report-meta')&&src.includes('ka-duty-report-title')&&src.includes('ka-duty-report-table')&&src.includes('ka-duty-report-tasks'),'Yüklenen çizelge örneğine karşılık gelen nöbet rapor anatomisi korunmalı.');"
new="assert(src.includes('ka-duty-report-banner')&&src.includes('ka-duty-report-table')&&src.includes('ka-duty-report-weekend')&&src.includes('ka-duty-report-holiday')&&src.includes('ka-duty-report-phones')&&src.includes('ka-duty-report-tasks')&&src.includes('ka-duty-report-footer')&&src.includes('ka-duty-report-signature'),'Tam sayfa nöbet raporu anatomisi korunmalı.');"
if old not in s: raise SystemExit('classic duty anatomy assertion not found')
s=s.replace(old,new,1)
old="assert(src.includes('compact:false')&&src.includes('fontSize:8.5')&&src.includes('kenarBosluk:5'),'Nöbet raporu yüklenen örnekteki okunaklı tam sayfa A4 ayarlarını kullanmalı.');"
new="assert(src.includes('compact:true')&&src.includes('fontSize:7')&&src.includes('kenarBosluk:5'),'Nöbet raporu tüm ayı tek A4 sayfaya sığdıran ayarları kullanmalı.');"
if old not in s: raise SystemExit('classic duty print option assertion not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
