from pathlib import Path
p=Path('tests/teacher-access-results-duty.test.js')
s=p.read_text(encoding='utf-8')
old="assert(css.includes('--ka-duty-head-font:12pt;--ka-duty-cell-font:10pt;--ka-duty-task-font:11pt')&&css.includes('font-size:18pt!important')&&css.includes('.ka-duty-report-signature')&&css.includes('font-size:11pt!important'),'Nöbet raporu tablo fontu küçülürken başlık/kural/imza boyutları korunmalı.');"
new="assert(css.includes('--ka-duty-head-font:9.5pt;--ka-duty-cell-font:8.7pt;--ka-duty-task-font:7.2pt')&&css.includes('font-size:12.8pt!important')&&css.includes('.ka-duty-report-signature')&&css.includes('font-size:10.5pt!important'),'Nöbet raporu tablo öncelikli kompakt font ölçülerini ve okunaklı imza alanını korumalı.');"
if old not in s:
    raise SystemExit('stale duty typography assertion not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
