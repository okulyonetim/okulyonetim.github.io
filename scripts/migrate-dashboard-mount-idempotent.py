from pathlib import Path

DASH=Path('js/modules/dashboard.js')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')

dash=DASH.read_text()
test=TEST.read_text()

old="let mounted=false,unsubs=[],reminderShown=false,trialTimer=null,calendarSelectedDay='',backTopHandler=null,renderFrame=0;"
new="let mounted=false,mountPromise=null,unsubs=[],reminderShown=false,trialTimer=null,calendarSelectedDay='',backTopHandler=null,renderFrame=0;"
if old not in dash: raise SystemExit('dashboard state contract not found')
dash=dash.replace(old,new,1)

old_mount="async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bindPresentation(root);subscribe();await prepareReminderData();render();clearInterval(trialTimer);trialTimer=setInterval(()=>refreshTrialTimers(),1000);window.removeEventListener('koruk:school-live-tick',liveTickHandler);window.addEventListener('koruk:school-live-tick',liveTickHandler);if(backTopHandler)window.removeEventListener('scroll',backTopHandler);backTopHandler=()=>document.querySelector('[data-dash-backtop]')?.classList.toggle('is-visible',window.scrollY>520);window.addEventListener('scroll',backTopHandler,{passive:true});backTopHandler();requestAnimationFrame(()=>maybeShowReminders());return true}"
new_mount="function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return Promise.resolve(false);if(mounted&&root.querySelector('[data-dashboard-module]'))return mountPromise||Promise.resolve(true);if(mountPromise)return mountPromise;mounted=true;mountPromise=(async()=>{root.innerHTML=shell();bindPresentation(root);subscribe();await prepareReminderData();if(!mounted)return false;render();clearInterval(trialTimer);trialTimer=setInterval(()=>refreshTrialTimers(),1000);window.removeEventListener('koruk:school-live-tick',liveTickHandler);window.addEventListener('koruk:school-live-tick',liveTickHandler);if(backTopHandler)window.removeEventListener('scroll',backTopHandler);backTopHandler=()=>document.querySelector('[data-dash-backtop]')?.classList.toggle('is-visible',window.scrollY>520);window.addEventListener('scroll',backTopHandler,{passive:true});backTopHandler();requestAnimationFrame(()=>maybeShowReminders());return true})().finally(()=>{mountPromise=null});return mountPromise}"
if old_mount not in dash: raise SystemExit('dashboard mount contract not found')
dash=dash.replace(old_mount,new_mount,1)

old_unmount="function unmount(){mounted=false;if(renderFrame)cancelAnimationFrame(renderFrame);renderFrame=0;clearInterval(trialTimer);"
new_unmount="function unmount(){mounted=false;mountPromise=null;if(renderFrame)cancelAnimationFrame(renderFrame);renderFrame=0;clearInterval(trialTimer);"
if old_unmount not in dash: raise SystemExit('dashboard unmount contract not found')
dash=dash.replace(old_unmount,new_unmount,1)
DASH.write_text(dash)

test += "\nassert(dash.includes(\"if(mounted&&root.querySelector('[data-dashboard-module]'))return mountPromise||Promise.resolve(true)\"),'Dashboard aynı module-ready/load zincirinde ikinci kez mount edilmemeli.');\nassert(dash.includes('if(mountPromise)return mountPromise'),'Dashboard eşzamanlı mount çağrılarını tek promise altında birleştirmeli.');\n"
TEST.write_text(test)
