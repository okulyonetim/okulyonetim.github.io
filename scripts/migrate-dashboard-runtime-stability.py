from pathlib import Path
import re

DASH=Path('js/modules/dashboard.js')
CSS=Path('css/design-system.css')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')
SHELLTEST=Path('tests/classic-shell-v2-smoke.test.js')

dash=DASH.read_text()
css=CSS.read_text()
test=TEST.read_text()
shelltest=SHELLTEST.read_text()

hero_re=re.compile(r"function hero\(\)\{.*?\}\nfunction announcementDateTime",re.S)
hero_new=r'''function liveClock(sec){const s=Math.max(0,Math.floor(Number(sec)||0));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function liveCardView(live=window.SchoolLiveStatus?.status?.()||{}){let big='Zil sayacı',sub='Ders saatleri yükleniyor';if(live.mode==='lesson'){big=`${live.period}. Ders`;sub=`Bitmesine ${liveClock(live.remaining)}`}else if(live.mode==='lunch'){big='Öğle Arası';sub=live.nextPeriod?`${live.nextPeriod}. Ders · ${liveClock(live.remaining)} sonra`:`${liveClock(live.remaining)} kaldı`}else if(live.mode==='break'){big='Teneffüs';sub=live.nextPeriod?`${live.nextPeriod}. Ders · ${liveClock(live.remaining)} sonra`:'Sonraki ders bekleniyor'}else if(live.mode==='before'){big='Dersler başlamadı';sub=live.nextPeriod?`${live.nextPeriod}. Ders · ${liveClock(live.remaining)} sonra`:'Program bekleniyor'}else if(live.mode==='after'){big='Dersler tamamlandı';sub='Bugünkü ders programı sona erdi'}else if(live.mode==='weekend'){big='Hafta sonu';sub='Bugün ders programı yok'}return{big,sub}}
function refreshHeroLive(){const card=document.querySelector('[data-dash-live-status]');if(!card)return;const view=liveCardView(window.SchoolLiveStatus?.status?.()||{}),big=card.querySelector('[data-dash-live-big]'),sub=card.querySelector('[data-dash-live-sub]');if(big&&big.textContent!==view.big)big.textContent=view.big;if(sub&&sub.textContent!==view.sub)sub.textContent=view.sub}
function hero(){const live=window.SchoolLiveStatus?.status?.()||{},reminders=teacherId()?collectReminders().filter(x=>x.gunFarki<=3).length:0,bell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',view=liveCardView(live);return `<header class="kh-hero" data-dashboard-card="welcome"><div class="kh-brand">KORUK ASİSTAN</div><div class="kh-greeting">${esc(greeting())}, ${esc(firstName())} 👋</div><div class="kh-date">${esc(new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date()))}</div><div class="kh-live-stack"><button type="button" class="kh-live-card" data-dash-route="academic" data-dash-page="schedule" data-dash-title="Ders Programı" data-dash-live-status><div class="kh-live-icon">${bell}</div><div class="kh-live-main"><b data-dash-live-big>${esc(view.big)}</b><small data-dash-live-sub>${esc(view.sub)}${reminders?` · 🔔 ${reminders}`:''}</small></div></button></div></header>`}
function announcementDateTime'''
if not hero_re.search(dash):
    raise SystemExit('hero function contract not found')
dash=hero_re.sub(hero_new,dash,count=1)

old="const text=items.map(x=>{const url=x?.url||x?.link,action=url?`data-dash-external=\"${esc(url)}\"`:'data-dash-route=\"communication\" data-dash-page=\"news\" data-dash-title=\"Haberler\"';return `<button type=\"button\" class=\"kh-news-item\" ${action}>${esc(x.baslik||x.ad||'Haber')}</button><span class=\"kh-news-dot\">•</span>`}).join('');"
new=old+"const signature=items.map(x=>[x.id||'',x.baslik||x.ad||'',x.url||x.link||''].join('~')).join('|');"
if old not in dash: raise SystemExit('news text contract not found')
dash=dash.replace(old,new,1)
dash=dash.replace('return `<div class="kh-news" data-home-section="news" style="--kh-ticker-time:${Math.max(22,items.length*8)}s">','return `<div class="kh-news" data-home-section="news" data-news-signature="${esc(signature)}" style="--kh-ticker-time:${Math.max(22,items.length*8)}s">',1)
dash=dash.replace('<div class="kh-news-track">${text}${text}</div>','<div class="kh-news-track"><div class="kh-news-loop">${text}</div><div class="kh-news-loop" aria-hidden="true">${text}</div></div>',1)

render_re=re.compile(r"function render\(\)\{.*?\}\nfunction subscribe",re.S)
render_new=r'''function render(){if(!mounted)return;const root=document.querySelector('[data-dashboard-module]');if(!root)return;const parent=root.parentElement||document.getElementById('v2ModuleRoot'),signature=cards().map(x=>x.key).join('|'),role=isAdmin()?'admin':'teacher';if(root.dataset.cardSignature!==signature||root.dataset.dashboardRole!==role){parent.innerHTML=shell();bindPresentation(parent);refreshHeroLive();return}const oldNews=root.querySelector('.kh-news'),oldNewsSignature=oldNews?.dataset.newsSignature||'',scrollY=window.scrollY;parent.innerHTML=shell();bindPresentation(parent);const freshNews=parent.querySelector('.kh-news');if(oldNews&&freshNews&&oldNewsSignature&&freshNews.dataset.newsSignature===oldNewsSignature)freshNews.replaceWith(oldNews);refreshHeroLive();if(scrollY>0)requestAnimationFrame(()=>window.scrollTo(0,scrollY))}
function subscribe'''
if not render_re.search(dash): raise SystemExit('render contract not found')
dash=render_re.sub(render_new,dash,count=1)

if "trialTimer=setInterval(()=>refreshTrialTimers(),1000)" not in dash: raise SystemExit('trial timer contract not found')
dash=dash.replace("trialTimer=setInterval(()=>refreshTrialTimers(),1000)","trialTimer=setInterval(()=>{refreshTrialTimers();refreshHeroLive()},1000)",1)

DASH.write_text(dash)

anchor='.ka-login-page{min-height:100dvh;display:grid;place-items:center;'
if anchor not in css: raise SystemExit('login css anchor not found')
css=css.replace(anchor,'/* AUTH RESTORE — mevcut Firebase oturumu çözülmeden login yüzeyi boyanmaz. */\nhtml:not(.ka-auth-resolved) #girisEkrani{visibility:hidden!important;pointer-events:none!important}\n'+anchor,1)
old_ticker='.ka-home .kh-news-track{display:inline-flex;align-items:center;gap:28px;width:max-content;padding-left:100%;animation:khTicker var(--kh-ticker-time,28s) linear infinite;will-change:transform}'
new_ticker='.ka-home .kh-news-track{display:flex;align-items:center;gap:0;width:max-content;animation:khTicker var(--kh-ticker-time,28s) linear infinite;will-change:transform;transform:translate3d(0,0,0)}\n.ka-home .kh-news-loop{display:flex;align-items:center;gap:28px;flex:none;padding-right:28px}'
if old_ticker not in css: raise SystemExit('ticker css contract not found')
css=css.replace(old_ticker,new_ticker,1)
css=css.replace('@keyframes khTicker{from{transform:translateX(0)}to{transform:translateX(-100%)}}','@keyframes khTicker{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}',1)
CSS.write_text(css)

old_assert="assert(dash.includes(\"live.mode==='lesson'\")&&dash.includes(\"live.nextPeriod\")&&dash.includes(\"big=`Sonraki · ${live.nextPeriod}. Ders`\"),'Öğretmen karşılama kartı canlı ders durumunu Şimdi/Sıradaki bağlamına çevirmeli.');"
new_assert="assert(dash.includes(\"function liveCardView\")&&dash.includes(\"live.mode==='lesson'\")&&dash.includes(\"big='Teneffüs'\")&&dash.includes(\"liveClock(live.remaining)\"),'Karşılama zil kartı canonical SchoolLiveStatus durumunu canlı geri sayımla göstermeli.');"
if old_assert not in test: raise SystemExit('old live assertion not found')
test=test.replace(old_assert,new_assert,1)
old_timer_assert="assert(dash.includes('trialTimer=setInterval(()=>refreshTrialTimers(),1000)'),'Aktif deneme sayacı ana sayfada canlı güncellenmeli.');"
new_timer_assert="assert(dash.includes('trialTimer=setInterval(()=>{refreshTrialTimers();refreshHeroLive()},1000)'),'Aktif deneme sayacı ve zil kartı aynı saniyelik presentation tick içinde canlı güncellenmeli.');"
if old_timer_assert not in test: raise SystemExit('old trial timer assertion not found')
test=test.replace(old_timer_assert,new_timer_assert,1)
test += "\nassert(dash.includes('data-dash-live-status')&&dash.includes('refreshHeroLive()')&&dash.includes('trialTimer=setInterval(()=>{refreshTrialTimers();refreshHeroLive()},1000)'),'Zil kartı dashboard yeniden render beklemeden her saniye canonical SchoolLiveStatus ile güncellenmeli.');\nassert(dash.includes('data-news-signature')&&dash.includes('freshNews.replaceWith(oldNews)')&&dash.includes('class=\\\"kh-news-loop\\\"'),'Kayan haber DOMu aynı veriyle yeniden yaratılmamalı ve kesintisiz çift şerit kullanmalı.');\n"
TEST.write_text(test)

shelltest += "\nassert(design.includes('html:not(.ka-auth-resolved) #girisEkrani'),'Mevcut Firebase oturumu çözülmeden giriş ekranı boyanmamalı.');\nassert(dashboard.includes('window.SchoolLiveStatus?.status?.()')&&dashboard.includes('refreshHeroLive'),'Dashboard zil kartı ikinci sayaç motoru kurmadan canonical SchoolLiveStatus kullanmalı.');\n"
SHELLTEST.write_text(shelltest)
