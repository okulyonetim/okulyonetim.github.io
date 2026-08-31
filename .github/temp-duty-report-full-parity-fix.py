from pathlib import Path
import runpy

runpy.run_path('.github/temp-duty-report-full-parity.py',run_name='__main__')

p=Path('tests/duty-report-full-parity.test.js')
s=p.read_text(encoding='utf-8')
old="assert(report.includes('mudurId')&&report.includes(\"arr('ogretmenler')\"),'Okul müdürü gerçek okulBilgileri.mudurId üzerinden çözülmeli.');"
new="assert(src.includes('function dutyReportPrincipal(okul)')&&src.includes('okul?.mudurId')&&src.includes(\"arr('ogretmenler')\"),'Okul müdürü gerçek okulBilgileri.mudurId üzerinden çözülmeli.');"
if old not in s:
    raise SystemExit('principal parity assertion marker not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')

p=Path('tests/classic-duty-v2-smoke.test.js')
s=p.read_text(encoding='utf-8')
old="assert(src.includes('ka-duty-report-title')&&src.includes('ka-duty-report-table')&&src.includes('ka-duty-report-tasks'),'Yüklenen örneğe karşılık gelen nöbet rapor anatomisi korunmalı.');"
new="assert(src.includes('ka-duty-report-banner')&&src.includes('ka-duty-report-table')&&src.includes('ka-duty-report-tasks')&&src.includes('ka-duty-report-footer'),'Yüklenen tam çizelge örneğine karşılık gelen nöbet rapor anatomisi korunmalı.');"
if old not in s:
    raise SystemExit('classic duty anatomy assertion marker not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
print('Duty report parity assertions corrected.')
