from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{path}: anchor count {n}: {old[:100]!r}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


p = Path('js/modules/academic.js')
s = p.read_text(encoding='utf-8')
anchor = "function render(){if(!mounted||!ready)return;"
if s.count(anchor) != 1:
    raise SystemExit(f'academic render anchor count: {s.count(anchor)}')
helper = """function prioritizeExamRecords(out,count){if(!out||(active!=='written'&&active!=='trial'))return;const trial=active==='trial',list=out.querySelector(trial?'.ka-trial-list':'.ka-written-list'),summary=out.querySelector(trial?'.ka-trial-summary':'.ka-written-summary');if(!list||!summary)return;const page=list.parentElement;if(!page||summary.parentElement!==page)return;let head=page.querySelector('[data-academic-record-head]');if(!head){head=document.createElement('div');head.className='ka-exam-record-head';head.dataset.academicRecordHead=active;}head.innerHTML=`<div><strong>${trial?'Deneme Sınavları':'Yazılı Sınavlar'}</strong><small>${Number(count)||0} kayıt</small></div>`;page.insertBefore(head,summary);page.insertBefore(list,summary);out.dataset.academicRecordsVisible='true';}\n"""
s = s.replace(anchor, helper + anchor, 1)
render_anchor = "if(out)out.innerHTML=r.html;if(c)c.textContent=`${r.count} kayıt`;"
n = s.count(render_anchor)
if n != 2:
    raise SystemExit(f'academic out render anchor count: {n}')
s = s.replace(render_anchor, "if(out){out.innerHTML=r.html;prioritizeExamRecords(out,r.count)}if(c)c.textContent=`${r.count} kayıt`;")
p.write_text(s, encoding='utf-8')

css = Path('css/design-system.css')
c = css.read_text(encoding='utf-8')
marker = '/* ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL */'
if marker in c:
    raise SystemExit('exam visibility css marker already present')
c += """

/* ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL */
.ka-exam-record-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 2px 0}.ka-exam-record-head strong{display:block;font-size:14px;font-weight:900}.ka-exam-record-head small{display:block;margin-top:2px;color:var(--ka-text-muted);font-size:10px;font-weight:750}.ka-written-list,.ka-trial-list{display:grid!important;visibility:visible!important;opacity:1!important;min-height:0}.ka-written-page>.ka-written-list,.ka-trial-page>.ka-trial-list{order:1}.ka-written-page>.ka-written-summary,.ka-trial-page>.ka-trial-summary{order:2}.ka-written-page>.ka-exam-record-head,.ka-trial-page>.ka-exam-record-head{order:0}.ka-written-page>.ka-exam-toolbar,.ka-trial-page>.ka-exam-toolbar{order:-1}
@media(max-width:640px){.ka-academic-written-active>[data-academic-heading],.ka-academic-trial-active>[data-academic-heading]{padding:14px 15px}.ka-academic-written-active>[data-academic-heading] h2,.ka-academic-trial-active>[data-academic-heading] h2{font-size:21px}.ka-academic-written-active>[data-academic-heading] p,.ka-academic-trial-active>[data-academic-heading] p{font-size:11px;line-height:1.45}.ka-written-page,.ka-trial-page{gap:10px}.ka-written-summary,.ka-trial-summary{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}.ka-written-summary article,.ka-trial-summary article{min-height:64px!important;padding:8px 4px!important;align-items:center;text-align:center}.ka-written-summary b,.ka-trial-summary b{font-size:20px!important}.ka-written-summary span,.ka-trial-summary span{margin-top:5px!important;font-size:8.5px!important;line-height:1.15}.ka-exam-record-head{padding-inline:3px}.ka-written-card,.ka-trial-card{scroll-margin-top:92px}}
"""
css.write_text(c, encoding='utf-8')

replace_once('index.html', '<link rel="stylesheet" href="css/design-system.css">', '<link rel="stylesheet" href="css/design-system.css?v=834">')
replace_once('index.html', '<script src="js/app-loader.js" defer></script>', '<script src="js/app-loader.js?v=834" defer></script>')
replace_once('js/app-loader.js', "define('academic',[FIREBASE_STORAGE_SDK,'js/modules/report-engine.js','js/modules/academic.js']);", "define('academic',[FIREBASE_STORAGE_SDK,'js/modules/report-engine.js','js/modules/academic.js?v=834']);")

sw = Path('service-worker.js')
w = sw.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v833';" not in w:
    raise SystemExit('service worker cache anchor missing')
w = w.replace("const CACHE_ADI='oy-cache-v833';", "const CACHE_ADI='oy-cache-v834';", 1)
precache = "  './','./index.html','./manifest.json',\n  './css/design-system.css',"
if precache not in w:
    raise SystemExit('service worker precache anchor missing')
w = w.replace(precache, "  './','./index.html','./manifest.json',\n  './css/design-system.css?v=834','./js/app-loader.js?v=834','./js/modules/academic.js?v=834',\n  './css/design-system.css',", 1)
sw.write_text(w, encoding='utf-8')

replace_once('tests/classic-shell-v2-smoke.test.js', '<link rel=\\"stylesheet\\" href=\\"css/design-system.css\\">', '<link rel=\\"stylesheet\\" href=\\"css/design-system.css?v=834\\">')
replace_once('tests/classic-shell-v2-smoke.test.js', "academicBundle.includes(\"'js/modules/academic.js'\")", "academicBundle.includes(\"'js/modules/academic.js?v=834'\")")
replace_once('tests/classic-shell-v2-smoke.test.js', "academicBundle.indexOf(\"'js/modules/report-engine.js'\")<academicBundle.indexOf(\"'js/modules/academic.js'\")", "academicBundle.indexOf(\"'js/modules/report-engine.js'\")<academicBundle.indexOf(\"'js/modules/academic.js?v=834'\")")
replace_once('tests/academic-separate-pages.test.js', "assert(loader.includes(\"define('academic',[FIREBASE_STORAGE_SDK,'js/modules/report-engine.js','js/modules/academic.js'])\"),'Academic loader yalnız Storage SDK + ReportEngine + canonical Academic yüklemeli.');", "assert(loader.includes(\"define('academic',[FIREBASE_STORAGE_SDK,'js/modules/report-engine.js','js/modules/academic.js?v=834'])\"),'Academic loader yalnız Storage SDK + ReportEngine + canonical Academic yüklemeli.');")

t = Path('tests/academic-separate-pages.test.js')
ts = t.read_text(encoding='utf-8')
insert = """
assert(academic.includes('function prioritizeExamRecords(out,count)')&&academic.includes("page.insertBefore(list,summary)")&&academic.includes("academicRecordsVisible='true'"),'Yazılı/Deneme gerçek kayıt listesi mobilde özet kartlarından önce görünür olmalı.');
assert(css.includes('ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL')&&css.includes('.ka-written-list,.ka-trial-list{display:grid!important')&&css.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'),'Sınav özetleri mobilde kompakt üçlü düzen kullanmalı ve kayıt listesi gizlenememeli.');
const productionShell=fs.readFileSync('index.html','utf8');
assert(productionShell.includes('css/design-system.css?v=834')&&productionShell.includes('js/app-loader.js?v=834'),'Sınav görünürlük düzeltmesi eski PWA asset cache tarafından maskelenmemeli.');
"""
log_marker = "console.log('Academic ayrı sayfa + deneme sayacı + sonuç filtreleme sözleşmesi başarılı.');"
if ts.count(log_marker) != 1:
    raise SystemExit('academic test log anchor missing')
ts = ts.replace(log_marker, insert + log_marker, 1)
t.write_text(ts, encoding='utf-8')

print('exam mobile visibility transform complete')
