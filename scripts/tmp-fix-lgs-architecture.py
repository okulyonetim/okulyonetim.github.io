from pathlib import Path

helper=Path('js/core/student-exam-result-details.js')
s=helper.read_text(encoding='utf-8')
start=s.find('function installStyles(){')
end=s.find('let pending=false;', start)
if start<0 or end<0:
    raise SystemExit('student result runtime style block not found')
s=s[:start]+s[end:]
if s.count('installStyles();')!=1:
    raise SystemExit(f'installStyles call expected once, found {s.count("installStyles();")}')
s=s.replace('installStyles();\n','',1)
helper.write_text(s,encoding='utf-8')

css=Path('css/design-system.css')
ct=css.read_text(encoding='utf-8')
marker='/* STUDENT EXAM RESULT DETAILS — CANONICAL */'
if marker in ct:
    raise SystemExit('canonical student result styles already exist')
block=r'''

/* STUDENT EXAM RESULT DETAILS — CANONICAL */
.ka-student-result-head{align-items:center}
.ka-student-result-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;margin-top:12px}
.ka-student-result-stats .ka-card{padding:12px;text-align:center}
.ka-student-result-stats .ka-card small{display:block}
.ka-student-result-stats .ka-card b{display:block;margin-top:4px;font-size:20px}
.ka-student-result-ranks{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.ka-student-result-ranks>span{display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--ka-border);border-radius:999px;background:var(--ka-muted-bg)}
.ka-student-result-ranks small{color:var(--ka-text-muted);font-weight:700}
.ka-student-result-table-wrap{margin-top:12px;overflow:hidden}
.ka-student-result-table{min-width:0!important;table-layout:fixed}
.ka-student-result-table th,.ka-student-result-table td{padding:8px 5px}
.ka-student-result-table th:first-child,.ka-student-result-table td:first-child{width:44%;text-align:left}
.ka-student-result-table th:not(:first-child),.ka-student-result-table td:not(:first-child){width:14%}
@media(max-width:720px){
  .ka-results-detail__surface{overflow:visible}
  .ka-results-table-wrap:not(.ka-student-result-table-wrap){overflow:visible;border:0}
  .ka-results-table--mobile-cards{display:block;min-width:0!important;border-collapse:separate}
  .ka-results-table--mobile-cards thead{display:none}
  .ka-results-table--mobile-cards tbody{display:grid;gap:12px}
  .ka-results-table--mobile-cards tr{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--ka-border);border-radius:16px;background:var(--ka-card-bg);overflow:hidden}
  .ka-results-table--mobile-cards td{display:flex!important;justify-content:space-between;gap:10px;align-items:center;text-align:right!important;padding:10px 12px;border-bottom:1px solid var(--ka-border)!important;min-width:0}
  .ka-results-table--mobile-cards td::before{content:attr(data-label);color:var(--ka-text-muted);font-size:11px;font-weight:700;text-align:left}
  .ka-results-table--mobile-cards td:first-child{grid-column:1/-1;position:static!important;background:var(--ka-muted-bg)!important;text-align:left!important}
  .ka-results-table--mobile-cards td:first-child::before{display:none}
  .ka-results-table--mobile-cards td:last-child{border-bottom:0!important}
  .ka-results-table--mobile-cards .ka-results-student strong{font-size:15px}
  .ka-results-table--mobile-cards .ka-results-student small{font-size:11px}
  .ka-student-result-stats .ka-card b{font-size:18px}
}
'''
css.write_text(ct+block,encoding='utf-8')

for path in ['index.html','service-worker.js']:
    p=Path(path); x=p.read_text(encoding='utf-8')
    count=x.count('design-system.css?v=912')
    if count!=1:
        raise SystemExit(f'{path}: design system version expected once, found {count}')
    p.write_text(x.replace('design-system.css?v=912','design-system.css?v=913',1),encoding='utf-8')

test=Path('tests/exam-lgs-result-ranking.test.js')
t=test.read_text(encoding='utf-8')
t=t.replace("const details=fs.readFileSync('js/core/student-exam-result-details.js','utf8');", "const details=fs.readFileSync('js/core/student-exam-result-details.js','utf8');\nconst design=fs.readFileSync('css/design-system.css','utf8');",1)
needle="assert(!details.includes(\"th.textContent='LGS Puanı';head.appendChild(th)\"),'Yardımcı katman Academic LGS sütununu ikinci kez eklememeli.');"
insert=needle+"\nassert(!details.includes('document.createElement(\\'style\\')')&&!details.includes('function installStyles()'),'Öğrenci sonuç yardımcı JS runtime style üretmemeli.');\nassert(design.includes('STUDENT EXAM RESULT DETAILS — CANONICAL')&&design.includes('.ka-student-result-ranks'),'Öğrenci sonuç stilleri merkezi design-system içinde yaşamalı.');"
if t.count(needle)!=1:
    raise SystemExit('architecture test insertion point not found')
t=t.replace(needle,insert,1)
test.write_text(t,encoding='utf-8')
