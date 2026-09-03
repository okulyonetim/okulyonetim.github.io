from pathlib import Path
p=Path('tests/duty-report-full-parity.test.js')
s=p.read_text(encoding='utf-8')
old="assert(report.includes(\"const page=o.yon==='yatay'?'A4 landscape':'A4 portrait'\")&&report.includes('@page{size:${page};margin:0}'),'Merkezi ReportEngine gerçek A4 portrait/landscape sayfa boyutunu korumalı.');"
new="assert(report.includes(\"page=o.yon==='yatay'?'A4 landscape':'A4 portrait'\")&&report.includes('@page{size:${page};margin:0}'),'Merkezi ReportEngine gerçek A4 portrait/landscape sayfa boyutunu korumalı.');"
if old not in s: raise SystemExit('verification assertion not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
