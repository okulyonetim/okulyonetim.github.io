from pathlib import Path
p=Path('js/modules/dashboard.js')
s=p.read_text()
old="function refreshHeroLive(live=window.SchoolLiveStatus?.status?.()||{}){const card=document.querySelector('[data-dash-live-status]');if(!card)return;const view=liveCardView(live),big=card.querySelector('[data-dash-live-big]'),sub=card.querySelector('[data-dash-live-sub]');if(big&&big.textContent!==view.big)big.textContent=view.big;if(sub&&sub.textContent!==view.sub)sub.textContent=view.sub}"
new="function refreshHeroLive(live=window.SchoolLiveStatus?.status?.()||{}){const card=document.querySelector('[data-dash-live-status]');if(!card)return;const view=liveCardView(live),big=card.querySelector('[data-dash-live-big]'),sub=card.querySelector('[data-dash-live-sub]'),suffix=card.dataset.dashLiveReminderSuffix||'',nextSub=view.sub+suffix;if(big&&big.textContent!==view.big)big.textContent=view.big;if(sub&&sub.textContent!==nextSub)sub.textContent=nextSub}"
if old not in s: raise SystemExit('refreshHeroLive target not found')
s=s.replace(old,new,1)
old2="data-dash-live-status><div class=\"kh-live-icon\">${bell}</div><div class=\"kh-live-main\"><b data-dash-live-big>${esc(view.big)}</b><small data-dash-live-sub>${esc(view.sub)}${reminders?` · 🔔 ${reminders}`:''}</small>"
new2="data-dash-live-status data-dash-live-reminder-suffix=\"${reminders?` · 🔔 ${reminders}`:''}\"><div class=\"kh-live-icon\">${bell}</div><div class=\"kh-live-main\"><b data-dash-live-big>${esc(view.big)}</b><small data-dash-live-sub>${esc(view.sub)}${reminders?` · 🔔 ${reminders}`:''}</small>"
if old2 not in s: raise SystemExit('hero live card target not found')
s=s.replace(old2,new2,1)
p.write_text(s)

t=Path('tests/dashboard-card-routes-smoke.test.js')
ts=t.read_text()
anchor="assert(dash.includes(\"function liveCardView\")&&dash.includes(\"live.mode==='lesson'\")&&dash.includes(\"big='Teneffüs'\")&&dash.includes(\"liveClock(live.remaining)\"),'Karşılama zil kartı canonical SchoolLiveStatus durumunu canlı geri sayımla göstermeli.');"
extra=anchor+"\nassert(dash.includes('data-dash-live-reminder-suffix')&&dash.includes(\"suffix=card.dataset.dashLiveReminderSuffix||''\")&&dash.includes('nextSub=view.sub+suffix'),'Canlı zil tick güncellemesi öğretmen hatırlatma ekini ilk saniyede silmemeli.');"
if anchor not in ts: raise SystemExit('dashboard live smoke anchor not found')
t.write_text(ts.replace(anchor,extra,1))
