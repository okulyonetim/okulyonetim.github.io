from pathlib import Path

def edit(path, fn):
    p=Path(path); s=p.read_text(encoding='utf-8'); n=fn(s)
    if n==s: raise SystemExit(f'No change applied: {path}')
    p.write_text(n, encoding='utf-8')

def patch_core(s):
    old="""  const BLOCK_SELECTOR='.ka-app-nav.ka-bottom-nav,.ka-menu-layer,.ka-modal-backdrop,.dv3,[role=\"dialog\"],[data-ka-no-pull-refresh]';
  const ARM_DISTANCE=96,MAX_VISUAL=78,DEAD_ZONE=8;
  let tracking=false,armed=false,startX=0,startY=0,indicator=null,reloading=false;
  const docTop=()=>Math.max(0,Number(window.scrollY||document.scrollingElement?.scrollTop||0));
  function scrollableAncestor(target){
    for(let el=target instanceof Element?target:null;el&&el!==document.body&&el!==document.documentElement;el=el.parentElement){
      const style=getComputedStyle(el),oy=style.overflowY;
      if((oy==='auto'||oy==='scroll'||oy==='overlay')&&el.scrollHeight>el.clientHeight+2)return el;
    }
    return null;
  }
  function blocked(target){return !!(document.body.classList.contains('ka-layer-open')||target?.closest?.(BLOCK_SELECTOR)||scrollableAncestor(target))}
"""
    new="""  const BLOCK_SELECTOR='.ka-app-nav.ka-bottom-nav,.ka-modal-backdrop,.dv3,[role=\"dialog\"],[data-ka-no-pull-refresh]';
  const ARM_DISTANCE=96,MAX_VISUAL=78,DEAD_ZONE=8;
  let tracking=false,armed=false,startX=0,startY=0,indicator=null,reloading=false;
  const docTop=()=>Math.max(0,Number(window.scrollY||document.scrollingElement?.scrollTop||0));
  function scrollableAncestor(target){
    for(let el=target instanceof Element?target:null;el&&el!==document.body&&el!==document.documentElement;el=el.parentElement){
      const style=getComputedStyle(el),oy=style.overflowY;
      if((oy==='auto'||oy==='scroll'||oy==='overlay')&&el.scrollHeight>el.clientHeight+2)return el;
    }
    return null;
  }
  function menuSurface(target){return target?.closest?.('.ka-menu-layer')||null}
  function surfaceTop(target){const scroller=scrollableAncestor(target);if(scroller)return Math.max(0,Number(scroller.scrollTop||0));return menuSurface(target)?0:docTop()}
  function blocked(target){const scroller=scrollableAncestor(target);return !!(target?.closest?.(BLOCK_SELECTOR)||(scroller&&Number(scroller.scrollTop||0)>1))}
"""
    if old not in s: raise SystemExit('core pull block not found')
    s=s.replace(old,new)
    s=s.replace("if(docTop()>1||blocked(target)){tracking=false;return}","if(surfaceTop(target)>1||blocked(target)){tracking=false;return}")
    s=s.replace("if(dy<0||docTop()>1){reset();return}","if(dy<0||surfaceTop(e.target)>1){reset();return}")
    return s
edit('js/core/core.js', patch_core)

def patch_engine(s):
    s=s.replace("border:1px solid #397461!important;background:#17684f!important;color:#fff!important", "border:1px solid #9baba4!important;background:#f1f5f3!important;color:#173e32!important")
    s=s.replace(".ka-report tbody tr:nth-child(even) td{background:#f7faf8!important}", ".ka-report tbody tr:nth-child(even) td{background:#fbfcfb!important}")
    s=s.replace("background:#eaf4ef!important;color:#17684f!important", "background:#f5f8f6!important;color:#17684f!important")
    return s
edit('js/modules/report-engine.js', patch_engine)

def patch_academic(s):
    anchor="function scheduleTeacherInitials(id){const name=teacherName(id);return name&&name!=='—'?name.split(/\\s+/).filter(Boolean).map(x=>x[0]?.toLocaleUpperCase('tr')||'').join(''):''}\n"
    helper="""function scheduleClassTeacherName(className){const clean=v=>String(v||'').replace(/\\s+/g,'').toLocaleLowerCase('tr-TR'),key=clean(className),cls=classes().find(x=>clean(x.ad)===key)||{},id=cls.sinifOgretmeniId||cls.ogretmenId||cls.rehberOgretmenId||'',direct=id?teacherName(id):'',fallback=teachers().find(o=>clean(o.sorumluSinif||o.sinif||o.sinifi)===key);return direct&&direct!=='—'?direct:(fallback?teacherName(fallback.id):'')}\n"""
    if anchor not in s: raise SystemExit('academic teacher initials anchor missing')
    s=s.replace(anchor,anchor+helper)
    old="function scheduleReportMetaHtml(meta,contextTitle){const shownTitle=meta.title&&meta.title!=='Ders Programı'?meta.title:contextTitle,rows=[];if(meta.showSchool&&meta.school)rows.push(`<strong class=\"ka-schedule-report-school\">${esc(meta.school)}</strong>`);if(meta.showTitle&&shownTitle)rows.push(`<h1>${esc(shownTitle)}</h1>`);if(meta.showYear&&meta.year)rows.push(`<span>${esc(meta.year)} Eğitim Öğretim Yılı</span>`);if(meta.showSubtitle&&meta.subtitle)rows.push(`<small>${esc(meta.subtitle)}</small>`);return rows.length?`<header class=\"ka-schedule-report-head\">${rows.join('')}</header>`:''}"
    new="function scheduleReportMetaHtml(meta,contextTitle,detail=''){const shownTitle=meta.title&&meta.title!=='Ders Programı'?meta.title:contextTitle,rows=[];if(meta.showSchool&&meta.school)rows.push(`<strong class=\"ka-schedule-report-school\">${esc(meta.school)}</strong>`);if(meta.showTitle&&shownTitle)rows.push(`<h1>${esc(shownTitle)}</h1>`);if(detail)rows.push(`<small class=\"ka-schedule-report-detail\">${esc(detail)}</small>`);if(meta.showYear&&meta.year)rows.push(`<span>${esc(meta.year)} Eğitim Öğretim Yılı</span>`);if(meta.showSubtitle&&meta.subtitle)rows.push(`<small>${esc(meta.subtitle)}</small>`);return rows.length?`<header class=\"ka-schedule-report-head\">${rows.join('')}</header>`:''}"
    if old not in s: raise SystemExit('academic meta helper missing')
    s=s.replace(old,new)
    old_body="const body=`${scheduleReportMetaHtml(meta,contextTitle)}<div class=\"ka-schedule-report-wrap\">${table}</div>`;"
    new_body="const detail=type==='tekSinif'&&scheduleClassTeacherName(String(selection||''))?`Sınıf Öğretmeni: ${scheduleClassTeacherName(String(selection||''))}`:'';const body=`${scheduleReportMetaHtml(meta,contextTitle,detail)}<div class=\"ka-schedule-report-wrap\">${table}</div>`;"
    if old_body not in s: raise SystemExit('academic report body anchor missing')
    s=s.replace(old_body,new_body)
    s=s.replace("background:#e6efea!important", "background:#fbfcfb!important")
    return s
edit('js/modules/academic.js', patch_academic)

def patch_redesign(s):
    anchor="function teacherBranch(id){const o=teacherObj(id);return normalize(o.brans||o.branş||o.bransi||o.bransAdi||o.alan||'')}\n"
    helper="""function classTeacherName(className){const clean=v=>normalize(v).replace(/\\s+/g,'').toLocaleLowerCase('tr-TR'),key=clean(className),cls=arr('siniflar').find(x=>clean(x.ad)===key)||{},id=cls.sinifOgretmeniId||cls.ogretmenId||cls.rehberOgretmenId||'',direct=id?teacherName(id):'',fallback=arr('ogretmenler').find(o=>clean(o.sorumluSinif||o.sinif||o.sinifi)===key);return direct&&direct!=='—'?direct:(fallback?teacherName(fallback.id):'')}\n"""
    if anchor not in s: raise SystemExit('redesign teacher anchor missing')
    s=s.replace(anchor,anchor+helper)
    s=s.replace(".ka-report .ka-sr-day-a{background:#f4f8f6!important}", ".ka-report .ka-sr-day-a{background:#fbfdfc!important}")
    s=s.replace(".ka-report thead .ka-sr-day-a{background:#eaf2ee!important}", ".ka-report thead .ka-sr-day-a{background:#f3f7f5!important}")
    s=s.replace(".ka-report thead .ka-sr-day-b{background:#f7faf8!important}", ".ka-report thead .ka-sr-day-b{background:#fafcfb!important}")
    s=s.replace(".ka-report .ka-sr-neutral{background:#f1f5f3!important}", ".ka-report .ka-sr-neutral{background:#f7faf8!important}")
    s=s.replace("white-space:normal;background:#f1f5f3!important", "white-space:normal;background:#f7faf8!important")
    old="function individualCard(kind,key,meta){if(kind==='class')return`${reportHead(meta,`${key} SINIFI DERS PROGRAMI`)}${weeklyTable(kind,key)}`;return`${reportHead(meta,`${teacherName(key)} DERS PROGRAMI`,teacherBranch(key))}${weeklyTable(kind,key)}`}"
    new="function individualCard(kind,key,meta){if(kind==='class'){const teacher=classTeacherName(key);return`${reportHead(meta,`${key} SINIFI DERS PROGRAMI`,teacher?`Sınıf Öğretmeni: ${teacher}`:'')}${weeklyTable(kind,key)}`}return`${reportHead(meta,`${teacherName(key)} DERS PROGRAMI`,teacherBranch(key))}${weeklyTable(kind,key)}`}"
    if old not in s: raise SystemExit('individualCard anchor missing')
    return s.replace(old,new)
edit('js/core/schedule-report-redesign.js', patch_redesign)

edit('index.html', lambda s:s.replace('js/core/core.js?v=905','js/core/core.js?v=906'))
edit('js/app-loader.js', lambda s:s.replace("'js/modules/academic.js?v=882'", "'js/modules/academic.js?v=883'"))
edit('js/firebase-init.js', lambda s:s.replace("schedule-report-redesign.js?v=941", "schedule-report-redesign.js?v=942"))
def patch_sw(s):
    s=s.replace("const CACHE_ADI='oy-cache-v941';", "const CACHE_ADI='oy-cache-v942';")
    s=s.replace("./js/core/core.js?v=905", "./js/core/core.js?v=906")
    s=s.replace("./js/modules/academic.js?v=882", "./js/modules/academic.js?v=883")
    s=s.replace("./js/core/schedule-report-redesign.js?v=941", "./js/core/schedule-report-redesign.js?v=942")
    return s
edit('service-worker.js', patch_sw)

for path in ['tests/schedule-report-redesign.test.js','tests/schedule-report-column-zebra.test.js']:
    p=Path(path)
    if p.exists():
        s=p.read_text(encoding='utf-8').replace('#f4f8f6','#fbfdfc').replace('#eaf2ee','#f3f7f5').replace('#f7faf8','#fafcfb')
        p.write_text(s,encoding='utf-8')

Path('tests/menu-refresh-report-fill-class-teacher.test.js').write_text("""const fs=require('fs');const assert=require('assert');\nconst core=fs.readFileSync('js/core/core.js','utf8'),engine=fs.readFileSync('js/modules/report-engine.js','utf8'),academic=fs.readFileSync('js/modules/academic.js','utf8'),redesign=fs.readFileSync('js/core/schedule-report-redesign.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8');\nnew Function(core);new Function(engine);new Function(academic);new Function(redesign);\nassert(core.includes("function menuSurface(target)")&&core.includes("surfaceTop(target)"),'Menü pull-to-refresh üst yüzey desteği eksik.');\nassert(!core.includes("document.body.classList.contains('ka-layer-open')||target?.closest?.(BLOCK_SELECTOR)"),'Açık menü pull-to-refresh tarafından tamamen engellenmemeli.');\nassert(engine.includes('background:#f1f5f3!important;color:#173e32!important'),'Ortak rapor başlık dolgusu çok açık olmalı.');\nassert(academic.includes('function scheduleClassTeacherName(')&&academic.includes('Sınıf Öğretmeni:'),'Doğrudan sınıf raporu sınıf öğretmenini göstermeli.');\nassert(redesign.includes('function classTeacherName(')&&redesign.includes('Sınıf Öğretmeni:'),'Yeni ders programı raporu sınıf öğretmenini göstermeli.');\nassert(redesign.includes('background:#fbfdfc!important'),'Ders programı zebra dolgusu çok hafif olmalı.');\nconst cache=sw.match(/const CACHE_ADI='oy-cache-v(\\d+)'/);assert(cache&&Number(cache[1])>=942,'Yeni runtime için cache sürümü yükseltilmeli.');\nconsole.log('Menü yenileme + açık rapor dolgusu + sınıf öğretmeni regresyon testi başarılı.');\n""",encoding='utf-8')
