from pathlib import Path
import re

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

# 1) Academic UI: browser scope must use globalThis/window, not the data-IIFE's `global` parameter.
academic_path=Path('js/modules/academic.js')
academic=read(academic_path)
marker='/* ========================= ACADEMIC UI ========================= */'
if marker not in academic:
    raise SystemExit('Academic UI marker not found')
prefix,ui=academic.split(marker,1)
if 'global.' not in ui:
    raise SystemExit('Expected broken global.* references were not found in Academic UI')
ui=ui.replace('global.','globalThis.')
if re.search(r'\bglobal\.',ui):
    raise SystemExit('Academic UI still contains global.* references')

# Remove the temporary runtime DOM/style patch completely. The renderer owns DOM order; CSS owns appearance.
start=ui.find('\nfunction stabilizeExamRecords(out,count){')
end=ui.find('\nfunction render(){',start)
if start < 0 or end < 0:
    raise SystemExit('stabilizeExamRecords block not found')
ui=ui[:start]+ui[end:]
ui=ui.replace('if(out){out.innerHTML=r.html;stabilizeExamRecords(out,r.count)}','if(out)out.innerHTML=r.html')
ui=ui.replace(";if(active==='written'||active==='trial')requestAnimationFrame(()=>stabilizeExamRecords(out,r.count))",'')
if 'stabilizeExamRecords' in ui:
    raise SystemExit('stabilizeExamRecords references remain')
academic=prefix+marker+ui
write(academic_path,academic)

# 2) Central design system: remove forced visibility/inline-patch companion CSS.
css_path=Path('css/design-system.css')
css=read(css_path)
css,removed=re.subn(r'\n?\.ka-written-card,\.ka-trial-card\{width:100%!important;min-width:0!important;height:auto!important;max-height:none!important;visibility:visible!important;opacity:1!important\}\n?','\n',css,count=1)
if removed != 1:
    raise SystemExit(f'Expected one exam-card important patch, removed={removed}')
patch_marker='\n\n/* ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL */'
idx=css.find(patch_marker)
if idx < 0:
    raise SystemExit('Academic exam visibility patch marker not found')
tail=css[idx:]
if len(tail) > 6000:
    raise SystemExit('Visibility patch is not the expected final CSS tail; refusing to truncate')
css=css[:idx].rstrip()+'\n'
base='.ka-written-page{gap:var(--ka-space-4)}'
clean='.ka-written-page,.ka-trial-page{width:100%;min-width:0}.ka-written-list,.ka-trial-list{width:100%;min-width:0}'
if base not in css:
    raise SystemExit('Canonical written page rule not found')
if clean not in css:
    css=css.replace(base,base+'\n'+clean,1)
if 'ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL' in css:
    raise SystemExit('Visibility patch marker remains')
write(css_path,css)

# 3) Replace the regression test that required the patch with a root-cause scope/ownership contract.
test_path=Path('tests/academic-separate-pages.test.js')
test=read(test_path)
block_start=test.find("assert(academic.includes('function stabilizeExamRecords(out,count)')")
block_end=test.find("console.log('Academic ayrı sayfa + deneme sayacı + sonuç filtreleme sözleşmesi başarılı.');",block_start)
if block_start < 0 or block_end < 0:
    raise SystemExit('Old academic visibility regression block not found')
replacement="""const academicUi=academic.split('/* ========================= ACADEMIC UI ========================= */')[1]||'';\nassert(academicUi&&!/\\bglobal\\./.test(academicUi),'Academic UI browser scope içinde tanımsız global.* kullanmamalı.');\nassert(academicUi.includes(\"globalThis.PermissionService?.can?.('academic.exams.edit','edit')\"),'Sınav düzenleme yetkisi browser-safe globalThis üzerinden okunmalı.');\nassert(!academic.includes('stabilizeExamRecords('),'Sınav kayıt görünürlüğü runtime DOM/style yamasıyla zorlanmamalı.');\nassert(!css.includes('ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL')&&!css.includes('.ka-written-card,.ka-trial-card{width:100%!important'),'Sınav görünürlüğü !important yamasıyla sahiplenilmemeli.');\nassert(css.includes('.ka-written-list{display:grid;gap:10px}')&&css.includes('.ka-trial-list{display:grid;gap:10px}')&&css.includes('.ka-written-page,.ka-trial-page{width:100%;min-width:0}'),'Yazılı/Deneme listeleri tek merkezi design-system CSS akışında görünür kalmalı.');\nconst productionShell=fs.readFileSync('index.html','utf8');\nassert(productionShell.includes('css/design-system.css?v=837')&&productionShell.includes('js/app-loader.js?v=837'),'Academic scope düzeltmesi eski PWA asset cache tarafından maskelenmemeli.');\n"""
test=test[:block_start]+replacement+test[block_end:]
write(test_path,test)

# 4) Cache-bust canonical runtime. No new CSS/runtime owner is introduced.
for path in [Path('index.html'),Path('js/app-loader.js'),Path('service-worker.js')]:
    text=read(path)
    text=text.replace('v=836','v=837').replace('oy-cache-v836','oy-cache-v837')
    write(path,text)

# Keep version assertions in regression tests aligned with the canonical runtime.
for path in Path('tests').glob('*.test.js'):
    text=read(path)
    newer=text.replace('v=836','v=837').replace('oy-cache-v836','oy-cache-v837')
    if newer!=text:
        write(path,newer)

# Final static guards.
academic=read(academic_path)
ui=academic.split(marker,1)[1]
css=read(css_path)
if re.search(r'\bglobal\.',ui):
    raise SystemExit('Final Academic UI still contains global.*')
if 'stabilizeExamRecords' in academic:
    raise SystemExit('Final Academic still contains runtime exam patch')
if 'ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL' in css:
    raise SystemExit('Final CSS still contains exam visibility patch')
if 'style.setProperty' in ui and 'academicRecordsVisible' in ui:
    raise SystemExit('Final Academic still contains forced style patch')
print('Academic scope + canonical exam ownership patch applied.')
