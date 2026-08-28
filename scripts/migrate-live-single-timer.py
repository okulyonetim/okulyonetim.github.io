from pathlib import Path

DASH=Path('js/modules/dashboard.js')
LIVE=Path('js/modules/school-live-status.js')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')
SHELLTEST=Path('tests/classic-shell-v2-smoke.test.js')

dash=DASH.read_text()
live=LIVE.read_text()
test=TEST.read_text()
shelltest=SHELLTEST.read_text()

old="function refreshHeroLive(){const card=document.querySelector('[data-dash-live-status]');if(!card)return;const view=liveCardView(window.SchoolLiveStatus?.status?.()||{}),big=card.querySelector('[data-dash-live-big]'),sub=card.querySelector('[data-dash-live-sub]');if(big&&big.textContent!==view.big)big.textContent=view.big;if(sub&&sub.textContent!==view.sub)sub.textContent=view.sub}"
new="function refreshHeroLive(live=window.SchoolLiveStatus?.status?.()||{}){const card=document.querySelector('[data-dash-live-status]');if(!card)return;const view=liveCardView(live),big=card.querySelector('[data-dash-live-big]'),sub=card.querySelector('[data-dash-live-sub]');if(big&&big.textContent!==view.big)big.textContent=view.big;if(sub&&sub.textContent!==view.sub)sub.textContent=view.sub}"
if old not in dash: raise SystemExit('refreshHeroLive contract not found')
dash=dash.replace(old,new,1)

old="trialTimer=setInterval(()=>{refreshTrialTimers();refreshHeroLive()},1000)"
new="trialTimer=setInterval(()=>refreshTrialTimers(),1000)"
if old not in dash: raise SystemExit('combined trial/live timer contract not found')
dash=dash.replace(old,new,1)

old="function unmount(){mounted=false;clearInterval(trialTimer);trialTimer=null;if(backTopHandler)window.removeEventListener('scroll',backTopHandler);backTopHandler=null;closeReminderPopup();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}"
new="function unmount(){mounted=false;clearInterval(trialTimer);trialTimer=null;if(backTopHandler)window.removeEventListener('scroll',backTopHandler);backTopHandler=null;window.removeEventListener('koruk:school-live-tick',liveTickHandler);closeReminderPopup();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}"
if old not in dash: raise SystemExit('dashboard unmount contract not found')
dash=dash.replace(old,new,1)

mount_old="async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bindPresentation(root);subscribe();await prepareReminderData();render();clearInterval(trialTimer);trialTimer=setInterval(()=>refreshTrialTimers(),1000);"
mount_new="const liveTickHandler=e=>refreshHeroLive(e?.detail||undefined);\nasync function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bindPresentation(root);subscribe();await prepareReminderData();render();clearInterval(trialTimer);trialTimer=setInterval(()=>refreshTrialTimers(),1000);window.removeEventListener('koruk:school-live-tick',liveTickHandler);window.addEventListener('koruk:school-live-tick',liveTickHandler);"
if mount_old not in dash: raise SystemExit('dashboard mount contract not found')
dash=dash.replace(mount_old,mount_new,1)
DASH.write_text(dash)

old="function tick(){const now=new Date(),key=`${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;if(key===lastTick)return;lastTick=key;if(document.querySelector('.ka-home-hero'))decorate()}"
new="function tick(){const now=new Date(),key=`${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;if(key===lastTick)return;lastTick=key;const current=status(now);try{global.dispatchEvent(new CustomEvent('koruk:school-live-tick',{detail:current}))}catch(_){}if(document.querySelector('.ka-home-hero'))decorate()}"
if old not in live: raise SystemExit('SchoolLiveStatus tick contract not found')
live=live.replace(old,new,1)
LIVE.write_text(live)

test=test.replace("assert(dash.includes('data-dash-live-status')&&dash.includes('refreshHeroLive()')&&dash.includes('trialTimer=setInterval(()=>{refreshTrialTimers();refreshHeroLive()},1000)'),'Zil kartı dashboard yeniden render beklemeden her saniye canonical SchoolLiveStatus ile güncellenmeli.');","assert(dash.includes('data-dash-live-status')&&dash.includes(\"window.addEventListener('koruk:school-live-tick',liveTickHandler)\")&&dash.includes('trialTimer=setInterval(()=>refreshTrialTimers(),1000)'),'Zil kartı SchoolLiveStatus tek zaman motorunun tick eventini dinlemeli; deneme sayacı intervali ayrı yalnız kendi sayacını güncellemeli.');",1)
TEST.write_text(test)

shelltest += "\nassert(live.includes(\"new CustomEvent('koruk:school-live-tick'\")&&dashboard.includes(\"window.addEventListener('koruk:school-live-tick',liveTickHandler)\"),'Canlı zil için tek saniyelik zaman motoru SchoolLiveStatus olmalı; dashboard yalnız tick eventini tüketmeli.');\nassert(!dashboard.includes('trialTimer=setInterval(()=>{refreshTrialTimers();refreshHeroLive()},1000)'),'Dashboard ikinci bir zil intervali çalıştırmamalı.');\n"
SHELLTEST.write_text(shelltest)
