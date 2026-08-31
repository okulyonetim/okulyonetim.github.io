from pathlib import Path
import runpy

p=Path('.github/temp-duty-reference-report.py')
s=p.read_text(encoding='utf-8')
old=",new_report,mgmt,count=1,flags=re.S)"
new=",lambda _m:new_report,mgmt,count=1,flags=re.S)"
if old not in s:
    raise SystemExit('reference report replacement marker not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
runpy.run_path(str(p),run_name='__main__')
