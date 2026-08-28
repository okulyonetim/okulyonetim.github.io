from pathlib import Path

INDEX=Path('index.html')
LOADER=Path('js/app-loader.js')
UI=Path('js/core/shell-ui.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

index=INDEX.read_text()
loader=LOADER.read_text()
ui=UI.read_text()
test=TEST.read_text()

optional=[
 '  <script src="js/modules/payroll-change.js" defer></script>\n',
 '  <script src="js/modules/assistant.js" defer></script>\n',
 '  <script src="js/modules/legislation.js" defer></script>\n',
 '  <script src="js/modules/legislation-ui.js" defer></script>\n',
 '  <script src="js/modules/rubric-settings.js" defer></script>\n',
 '  <script src="js/modules/rubric-tools.js" defer></script>\n',
]
for line in optional:
    if line not in index:
        raise SystemExit('optional startup script not found: '+line.strip())
    index=index.replace(line,'',1)

old="define('communication',['js/modules/communication.js']);"
new="define('communication',['js/modules/communication.js','js/modules/assistant.js']);"
if old not in loader: raise SystemExit('communication registry marker not found')
loader=loader.replace(old,new,1)
old="define('tools',['js/modules/tools.js','js/modules/teacher-list.js','js/modules/map-ui.js']);"
new="define('tools',['js/modules/tools.js','js/modules/teacher-list.js','js/modules/map-ui.js','js/modules/rubric-settings.js','js/modules/rubric-tools.js']);"
if old not in loader: raise SystemExit('tools registry marker not found')
loader=loader.replace(old,new,1)

old="""  if(name==='payroll'){
    if(global.PayrollChangeModule?.open){
      setBottomActive(bottom);setTitle('Maaş Değişikliği Bildirim Formu');
      global.PayrollChangeModule.open();
    }else{
      await routeModule('management',{bottom});
    }
    return true;
  }"""
new="""  if(name==='payroll'){
    try{
      if(!global.PayrollChangeModule?.open)await global.AppLoader?.loadScript?.('js/modules/payroll-change.js');
      if(!global.PayrollChangeModule?.open)throw new Error('Maaş değişikliği modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Maaş Değişikliği Bildirim Formu');
      global.PayrollChangeModule.open();
    }catch(e){
      console.error('[Shell/payroll]',e);global.toast?.('Maaş değişikliği formu açılamadı.');
      await routeModule('management',{bottom});
    }
    return true;
  }"""
if old not in ui: raise SystemExit('payroll route contract not found')
ui=ui.replace(old,new,1)

old="""  if(name==='documents'&&page==='mevzuat'&&global.LegislationModule?.mount){
    global.DocumentsModule?.unmount?.();
    Promise.resolve(global.LegislationModule.mount(root)).catch(e=>{console.error('[Shell/mevzuat]',e);global.toast?.('Mevzuat açılamadı.');});
    if(title)setTitle(title);return true;
  }"""
new="""  if(name==='documents'&&page==='mevzuat'){
    global.DocumentsModule?.unmount?.();
    Promise.resolve((async()=>{
      if(!global.LegislationEngine)await global.AppLoader?.loadScript?.('js/modules/legislation.js');
      if(!global.LegislationModule?.mount)await global.AppLoader?.loadScript?.('js/modules/legislation-ui.js');
      if(!global.LegislationModule?.mount)throw new Error('Mevzuat modülü yüklenemedi.');
      return global.LegislationModule.mount(root);
    })()).catch(e=>{console.error('[Shell/mevzuat]',e);global.toast?.('Mevzuat açılamadı.');});
    if(title)setTitle(title);return true;
  }"""
if old not in ui: raise SystemExit('legislation route contract not found')
ui=ui.replace(old,new,1)

marker="for(const src of sameOriginStartup) assert(sw.includes(`'${src}'`),`Aynı-origin startup script offline PWA shell cache içinde bulunmalı: ${src}`);"
addition="""
const optionalLazy=['js/modules/payroll-change.js','js/modules/assistant.js','js/modules/legislation.js','js/modules/legislation-ui.js','js/modules/rubric-settings.js','js/modules/rubric-tools.js'];
for(const src of optionalLazy) assert(!shell.includes(`<script src=\"${src}\" defer></script>`),`Opsiyonel araç ilk açılışta eager yüklenmemeli: ${src}`);
const optionalLoaderSource=fs.readFileSync('js/app-loader.js','utf8');
assert(optionalLoaderSource.includes("define('communication',['js/modules/communication.js','js/modules/assistant.js'])"),'AI Asistan Communication lazy bundle ile yüklenmeli.');
assert(optionalLoaderSource.includes("'js/modules/rubric-settings.js','js/modules/rubric-tools.js'"),'Rubrik köprüleri Tools lazy bundle ile yüklenmeli.');
assert(ui.includes("loadScript?.('js/modules/payroll-change.js')"),'Maaş değişikliği özel route ihtiyaç anında script yüklemeli.');
assert(ui.includes("loadScript?.('js/modules/legislation.js')")&&ui.includes("loadScript?.('js/modules/legislation-ui.js')"),'Mevzuat özel route motor ve UI scriptlerini ihtiyaç anında yüklemeli.');"""
if marker not in test: raise SystemExit('startup shell assertion marker not found')
if addition.strip() not in test:
    test=test.replace(marker,marker+addition,1)

INDEX.write_text(index)
LOADER.write_text(loader)
UI.write_text(ui)
TEST.write_text(test)
