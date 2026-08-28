from pathlib import Path
import re
D=Path('js/modules/dashboard.js');C=Path('css/design-system.css');T=Path('tests/dashboard-card-routes-smoke.test.js');S=Path('service-worker.js')
d=D.read_text(encoding='utf-8')
d=d.replace("let mounted=false,unsubs=[],reminderShown=false,trialTimer=null,calendarSelectedDay='';","let mounted=false,unsubs=[],reminderShown=false,trialTimer=null,calendarSelectedDay='',backTopHandler=null;",1)
old="function shell(){const configured=cards().map(x=>x.key).join('|');return`<section class=\"ka-home\" data-dashboard-module data-dashboard-role=\"${isAdmin()?'admin':'teacher'}\" data-card-signature=\"${esc(configured)}\">${isAdmin()?adminShell():teacherShell()}</section>`}"
new="function shell(){const configured=cards().map(x=>x.key).join('|');return`<section class=\"ka-home\" data-dashboard-module data-dashboard-role=\"${isAdmin()?'admin':'teacher'}\" data-card-signature=\"${esc(configured)}\">${isAdmin()?adminShell():teacherShell()}</section><button type=\"button\" class=\"kh-backtop\" data-dash-backtop aria-label=\"Yukarı dön\">↑</button>`}"
if old not in d: raise SystemExit('shell contract missing')
d=d.replace(old,new,1)
anchor="function bindPresentation(root){\n"
if anchor not in d: raise SystemExit('bind anchor missing')
d=d.replace(anchor,anchor+"  root.querySelector('[data-dash-backtop]')?.addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})});\n",1)
oldm="async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bindPresentation(root);subscribe();await prepareReminderData();render();clearInterval(trialTimer);trialTimer=setInterval(()=>refreshTrialTimers(),1000);requestAnimationFrame(()=>maybeShowReminders());return true}"
newm="async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bindPresentation(root);subscribe();await prepareReminderData();render();clearInterval(trialTimer);trialTimer=setInterval(()=>refreshTrialTimers(),1000);if(backTopHandler)window.removeEventListener('scroll',backTopHandler);backTopHandler=()=>document.querySelector('[data-dash-backtop]')?.classList.toggle('is-visible',window.scrollY>520);window.addEventListener('scroll',backTopHandler,{passive:true});backTopHandler();requestAnimationFrame(()=>maybeShowReminders());return true}"
if oldm not in d: raise SystemExit('mount contract missing')
d=d.replace(oldm,newm,1)
oldu="function unmount(){mounted=false;clearInterval(trialTimer);trialTimer=null;closeReminderPopup();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}"
newu="function unmount(){mounted=false;clearInterval(trialTimer);trialTimer=null;if(backTopHandler)window.removeEventListener('scroll',backTopHandler);backTopHandler=null;closeReminderPopup();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}"
if oldu not in d: raise SystemExit('unmount contract missing')
d=d.replace(oldu,newu,1);D.write_text(d,encoding='utf-8')
c=C.read_text(encoding='utf-8');mark='/* LEGACY DASHBOARD BACKTOP — REFERENCE PORT */'
if mark not in c:c+='''\n\n/* LEGACY DASHBOARD BACKTOP — REFERENCE PORT */\n.kh-backtop{position:fixed;right:14px;bottom:calc(var(--ka-bottom-nav-height) + 12px + var(--ka-safe-bottom));width:42px;height:42px;border:0;border-radius:14px;background:var(--ka-primary);color:var(--ka-text-inverse);box-shadow:var(--ka-shadow-md);font-size:20px;z-index:90;display:grid;place-items:center;opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity var(--ka-transition),transform var(--ka-transition)}\n.kh-backtop.is-visible{opacity:1;pointer-events:auto;transform:translateY(0)}\n@media(prefers-reduced-motion:reduce){.kh-backtop{transition:none}}\n'''
C.write_text(c,encoding='utf-8')
t=T.read_text(encoding='utf-8');chk="\nassert(dash.includes('data-dash-backtop')&&dash.includes(\"window.scrollY>520\")&&dash.includes(\"window.scrollTo({top:0,behavior:'smooth'})\"),'Referans yukarı dön düğmesi 520px sonrasında görünmeli ve sayfa başına dönmeli.');\nassert(css.includes('LEGACY DASHBOARD BACKTOP — REFERENCE PORT')&&css.includes('.kh-backtop.is-visible'),'Yukarı dön görünümü merkezi design-system içinde kalmalı.');\n"
if 'LEGACY DASHBOARD BACKTOP — REFERENCE PORT' not in t:t+=chk
T.write_text(t,encoding='utf-8')
s=S.read_text(encoding='utf-8');m=re.search(r"const CACHE_ADI='oy-cache-v(\d+)'",s)
if not m: raise SystemExit('cache missing')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):];S.write_text(s,encoding='utf-8')
