from pathlib import Path

DASH=Path('js/modules/dashboard.js')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')
SHELLTEST=Path('tests/classic-shell-v2-smoke.test.js')

dash=DASH.read_text()
test=TEST.read_text()
shelltest=SHELLTEST.read_text()

old="let mounted=false,unsubs=[],reminderShown=false,trialTimer=null,calendarSelectedDay='',backTopHandler=null;"
new="let mounted=false,unsubs=[],reminderShown=false,trialTimer=null,calendarSelectedDay='',backTopHandler=null,renderFrame=0;"
if old not in dash: raise SystemExit('dashboard state contract not found')
dash=dash.replace(old,new,1)

old="function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];const base=['data.ogretmenler','data.dersProgrami','data.siniflar','data.veliler','data.servisler','data.hatirlaticilar','data.gorevler','data.sinavlar','data.denemeSinavlari','data.duyurular','data.haberler','data.anketler','data.nobetAtamalari','data.nobetYerleri','data.personelIzinler','data.ogretmenIzinleri','data.notlar','data.yillikPlanTanimlari','data.ogretmenYillikPlanSecimleri','data.appConfig','session.user'],paths=[...new Set([...base,...Object.keys(REMINDER_DEFS).map(t=>'data.'+t)])];paths.forEach(p=>{const u=window.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)})}"
new="function queueRender(){if(!mounted||renderFrame)return;renderFrame=requestAnimationFrame(()=>{renderFrame=0;render()})}\nfunction subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];const base=['data.ogretmenler','data.dersProgrami','data.siniflar','data.veliler','data.servisler','data.hatirlaticilar','data.gorevler','data.sinavlar','data.denemeSinavlari','data.duyurular','data.haberler','data.anketler','data.nobetAtamalari','data.nobetYerleri','data.ogretmenIzinleri','data.notlar','data.yillikPlanTanimlari','data.ogretmenYillikPlanSecimleri','data.okulBilgileri','data.appConfig','session.user'],paths=[...new Set([...base,...Object.keys(REMINDER_DEFS).map(t=>'data.'+t)])];paths.forEach(p=>{const u=window.AppStore?.subscribe?.(p,queueRender);if(u)unsubs.push(u)})}"
if old not in dash: raise SystemExit('dashboard subscribe contract not found')
dash=dash.replace(old,new,1)

old="function unmount(){mounted=false;clearInterval(trialTimer);trialTimer=null;if(backTopHandler)window.removeEventListener('scroll',backTopHandler);backTopHandler=null;window.removeEventListener('koruk:school-live-tick',liveTickHandler);closeReminderPopup();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}"
new="function unmount(){mounted=false;if(renderFrame)cancelAnimationFrame(renderFrame);renderFrame=0;clearInterval(trialTimer);trialTimer=null;if(backTopHandler)window.removeEventListener('scroll',backTopHandler);backTopHandler=null;window.removeEventListener('koruk:school-live-tick',liveTickHandler);closeReminderPopup();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}"
if old not in dash: raise SystemExit('dashboard unmount contract not found')
dash=dash.replace(old,new,1)
DASH.write_text(dash)

test += '''
assert(dash.includes('function queueRender(){if(!mounted||renderFrame)return')&&dash.includes('AppStore?.subscribe?.(p,queueRender)'),'Dashboard AppStore değişikliklerini aynı animation frame içinde tek rendera birleştirmeli.');
assert(dash.includes("'data.okulBilgileri'")&&!dash.includes("'data.personelIzinler'"),'Dashboard sosyal bağlantıları okulBilgileri değişimini dinlemeli; hizmetli/işçi izinleri ana sayfa render aboneliğine dönmemeli.');
'''
TEST.write_text(test)

shelltest += '''
assert(dashboard.includes('renderFrame=0')&&dashboard.includes('cancelAnimationFrame(renderFrame)'),'Dashboard render kuyruğu unmount sırasında temizlenmeli.');
'''
SHELLTEST.write_text(shelltest)
