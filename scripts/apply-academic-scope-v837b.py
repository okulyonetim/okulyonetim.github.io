from pathlib import Path
import re

ROOT=Path('.')
def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')

academic_path=Path('js/modules/academic.js')
academic=read(academic_path)
marker='/* ========================= ACADEMIC UI ========================= */'
if marker not in academic: raise SystemExit('Academic UI marker not found')
prefix,ui=academic.split(marker,1)
if 'global.' not in ui: raise SystemExit('Expected Academic UI global.* references not found')
ui=ui.replace('global.','globalThis.')
if re.search(r'\bglobal\.',ui): raise SystemExit('Academic UI still contains global.* references')

start=ui.find('\nfunction stabilizeExamRecords(out,count){')
end=ui.find('\nfunction render(){',start)
if start<0 or end<0: raise SystemExit('stabilizeExamRecords block not found')
ui=ui[:start]+ui[end:]
ui=ui.replace('if(out){out.innerHTML=r.html;stabilizeExamRecords(out,r.count)}','if(out){out.innerHTML=r.html}')
ui=ui.replace(";if(active==='written'||active==='trial')requestAnimationFrame(()=>stabilizeExamRecords(out,r.count))",'')
if 'stabilizeExamRecords' in ui: raise SystemExit('stabilizeExamRecords references remain')
write(academic_path,prefix+marker+ui)

css_path=Path('css/design-system.css')
css=read(css_path)
css,removed=re.subn(r'\n?\.ka-written-card,\.ka-trial-card\{width:100%!important;min-width:0!important;height:auto!important;max-height:none!important;visibility:visible!important;opacity:1!important\}\n?','\n',css,count=1)
if removed!=1: raise SystemExit(f'Expected exam-card important patch, removed={removed}')
patch_marker='\n\n/* ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL */'
idx=css.find(patch_marker)
if idx<0: raise SystemExit('Academic visibility patch marker not found')
if len(css[idx:])>6000: raise SystemExit('Unexpected CSS after academic visibility patch')
css=css[:idx].rstrip()+'\n'
base='.ka-written-page{gap:var(--ka-space-4)}'
clean='.ka-written-page,.ka-trial-page{width:100%;min-width:0}.ka-written-list,.ka-trial-list{width:100%;min-width:0}'
if base not in css: raise SystemExit('Canonical written page rule missing')
if clean not in css: css=css.replace(base,base+'\n'+clean,1)
write(css_path,css)

test_path=Path('tests/academic-separate-pages.test.js')
test=read(test_path)
bs=test.find("assert(academic.includes('function stabilizeExamRecords(out,count)')")
be=test.find("console.log('Academic ayrı sayfa + deneme sayacı + sonuç filtreleme sözleşmesi başarılı.');",bs)
if bs<0 or be<0: raise SystemExit('Old academic visibility test block not found')
replacement="""const academicUi=academic.split('/* ========================= ACADEMIC UI ========================= */')[1]||'';\nassert(academicUi&&!/\\bglobal\\./.test(academicUi),'Academic UI browser scope içinde tanımsız global.* kullanmamalı.');\nassert(academicUi.includes(\"globalThis.PermissionService?.can?.('academic.exams.edit','edit')\"),'Sınav düzenleme yetkisi browser-safe globalThis üzerinden okunmalı.');\nassert(!academic.includes('stabilizeExamRecords('),'Sınav görünürlüğü runtime DOM/style yamasıyla zorlanmamalı.');\nassert(!css.includes('ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL')&&!css.includes('.ka-written-card,.ka-trial-card{width:100%!important'),'Sınav görünürlüğü !important yamasıyla sahiplenilmemeli.');\nassert(css.includes('.ka-written-list{display:grid;gap:10px}')&&css.includes('.ka-trial-list{display:grid;gap:10px}')&&css.includes('.ka-written-page,.ka-trial-page{width:100%;min-width:0}'),'Yazılı/Deneme listeleri tek merkezi design-system CSS akışında görünür kalmalı.');\nconst productionShell=fs.readFileSync('index.html','utf8');\nassert(productionShell.includes('css/design-system.css?v=837')&&productionShell.includes('js/app-loader.js?v=837'),'Academic scope düzeltmesi eski PWA cache tarafından maskelenmemeli.');\n"""
test=test[:bs]+replacement+test[be:]
write(test_path,test)

for path in [Path('index.html'),Path('js/app-loader.js'),Path('service-worker.js')]:
    text=read(path).replace('v=836','v=837').replace('oy-cache-v836','oy-cache-v837')
    write(path,text)
for path in Path('tests').glob('*.test.js'):
    text=read(path); newer=text.replace('v=836','v=837').replace('oy-cache-v836','oy-cache-v837')
    if newer!=text: write(path,newer)

academic=read(academic_path); ui=academic.split(marker,1)[1]; css=read(css_path)
assert not re.search(r'\bglobal\.',ui)
assert 'stabilizeExamRecords' not in academic
assert 'ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL' not in css
assert 'academicRecordsVisible' not in academic
print('Academic browser scope fixed; visibility patches removed.')
