from pathlib import Path
p=Path('tests/exam-lgs-result-ranking.test.js')
s=p.read_text(encoding='utf-8')
old="assert(academic.includes(\"${deneme?`<td>${index+1}</td>`:''}\")&&academic.includes(\"${deneme?'<th>Sıra</th>:''}\"),'Rapor sıra numarasını basmalı.');\nassert(academic.includes(\"${deneme?`<td><strong>${ssFmt(ssLgsPuani(r,s))}</strong></td>`:''}\"),'Rapor LGS puanını basmalı.');"
new="assert(academic.includes('<td>${index+1}</td>')&&academic.includes('<th>Sıra</th>'),'Rapor sıra numarasını basmalı.');\nassert(academic.includes('<th>LGS Puanı</th>')&&academic.includes('ssLgsPuani(r,s)'),'Rapor LGS puanını basmalı.');"
if s.count(old)!=1:
    raise SystemExit(f'test assertion patch: expected 1 match, found {s.count(old)}')
p.write_text(s.replace(old,new,1),encoding='utf-8')
