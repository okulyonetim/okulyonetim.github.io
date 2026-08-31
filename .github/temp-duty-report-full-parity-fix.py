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
print('Duty report parity assertion corrected.')
