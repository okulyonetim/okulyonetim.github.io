from pathlib import Path
import re

DASH=Path('js/modules/dashboard.js')
CSS=Path('css/design-system.css')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')
SW=Path('service-worker.js')

dash=DASH.read_text(encoding='utf-8')
start=dash.find('function hero(){')
end=dash.find('\nfunction announcementDateTime',start)
if start<0 or end<0: raise SystemExit('hero boundaries missing')
new=r'''function hero(){const live=window.SchoolLiveStatus?.status?.()||{},teacherMode=!isAdmin(),mine=todayLessons({mine:true}),reminders=teacherId()?collectReminders().filter(x=>x.gunFarki<=3).length:0,bell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';let big='Okul durumu',sub='Ders programı hazır';if(live.mode==='lesson'){big=`${live.period}. Ders`;if(teacherMode){const current=mine.find(x=>Number(x.saat??x.dersSaati)===Number(live.period));sub=current?`${classLabel(current)} · ${lessonLabel(current)}`:'Ders devam ediyor'}else sub='Ders devam ediyor'}else if(live.nextPeriod){big=`Sonraki · ${live.nextPeriod}. Ders`;sub='Ders programı'}else if(live.mode==='after'){big='Dersler tamamlandı';sub='Bugünkü program sona erdi'}else if(live.mode==='weekend'){big='Hafta sonu';sub='Bugün ders programı yok'}else if(live.mode==='before'){big='Dersler başlamadı';sub='Günün ilk dersini bekliyor'}return `<header class="kh-hero" data-dashboard-card="welcome"><div class="kh-brand">KORUK ASİSTAN</div><div class="kh-greeting">${esc(greeting())}, ${esc(firstName())} 👋</div><div class="kh-date">${esc(new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date()))}</div><div class="kh-live-stack"><button type="button" class="kh-live-card" data-dash-route="academic" data-dash-page="schedule" data-dash-title="Ders Programı"><div class="kh-live-icon">${bell}</div><div class="kh-live-main"><b>${esc(big)}</b><small>${esc(sub)}${reminders?` · 🔔 ${reminders}`:''}</small></div></button></div></header>`}'''
dash=dash[:start]+new+dash[end:]
DASH.write_text(dash,encoding='utf-8')

css=CSS.read_text(encoding='utf-8')
marker='/* LEGACY DASHBOARD HERO — REFERENCE PORT */'
if marker not in css:
 css+='''\n\n/* LEGACY DASHBOARD HERO — REFERENCE PORT */\n.ka-home .kh-hero{position:relative;overflow:hidden;border-radius:28px;padding:20px 16px 16px;color:var(--ka-hero-text);background:radial-gradient(circle at 88% 15%,color-mix(in srgb,var(--ka-card-bg) 95%,transparent) 0 6%,transparent 32%),linear-gradient(125deg,var(--ka-primary-soft) 0%,var(--ka-card-bg) 54%,color-mix(in srgb,var(--ka-warning) 8%,var(--ka-card-bg)) 100%);box-shadow:var(--ka-hero-shadow);border:1px solid var(--ka-hero-border);isolation:isolate}\n.ka-home .kh-hero:before{content:"";position:absolute;width:210px;height:210px;border-radius:50%;right:-88px;top:-100px;background:linear-gradient(135deg,color-mix(in srgb,var(--ka-primary) 28%,transparent),color-mix(in srgb,var(--ka-accent) 16%,transparent));filter:blur(2px)}\n.ka-home .kh-hero:after{content:"";position:absolute;width:150px;height:150px;border-radius:50%;left:-58px;bottom:-82px;background:linear-gradient(135deg,color-mix(in srgb,var(--ka-warning) 16%,transparent),color-mix(in srgb,var(--ka-primary) 12%,transparent));filter:blur(1px)}\n.ka-home .kh-hero>*{position:relative;z-index:1}\n.ka-home .kh-brand{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--ka-hero-kicker)}\n.ka-home .kh-greeting{font-size:27px;font-weight:900;line-height:1.12;margin:13px 0 5px;letter-spacing:-.02em;color:var(--ka-hero-text)}\n.ka-home .kh-date{font-size:11.5px;font-weight:700;color:var(--ka-hero-muted)}\n.ka-home .kh-live-stack{display:grid;grid-template-columns:1fr;gap:9px;margin-top:16px}\n.ka-home .kh-live-card{width:100%;min-height:82px;display:flex;align-items:center;gap:12px;padding:12px 13px;border:1px solid var(--ka-live-border);border-radius:20px;background:color-mix(in srgb,var(--ka-live-bg) 88%,transparent);color:var(--ka-live-text);box-shadow:var(--ka-shadow-sm);text-align:left;cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}\n.ka-home .kh-live-card:active{transform:scale(.995)}\n.ka-home .kh-live-icon{width:44px;height:44px;display:grid;place-items:center;flex:none;border-radius:15px;background:var(--ka-live-accent-soft);color:var(--ka-live-accent)}\n.ka-home .kh-live-icon svg{width:24px;height:24px}\n.ka-home .kh-live-main{min-width:0;flex:1;color:var(--ka-live-text)}\n.ka-home .kh-live-main b{display:block;font-size:20px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ka-live-text)}\n.ka-home .kh-live-main small{display:block;margin-top:4px;font-size:10.5px;font-weight:700;color:var(--ka-live-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n@media(max-width:370px){.ka-home .kh-greeting{font-size:24px}.ka-home .kh-live-card{min-height:74px}.ka-home .kh-live-icon{width:40px;height:40px}}\n'''
CSS.write_text(css,encoding='utf-8')

t=TEST.read_text(encoding='utf-8')
checks='''\nassert(dash.includes('class="kh-hero"')&&dash.includes('class="kh-live-card"'),'Dashboard karşılama alanı referans kh-hero/kh-live-card DOM sözleşmesini kullanmalı.');\nassert(dash.includes("window.SchoolLiveStatus?.status?.()")&&dash.includes("data-dash-page=\\\"schedule\\\""),'Hero canlı kartı ikinci sayaç yerine canonical SchoolLiveStatus ve merkezi Ders Programı rotasını kullanmalı.');\nassert(!dash.includes('class="ka-home-hero"'),'Eski geçici ka-home-hero renderer geri dönmemeli.');\nassert(css.includes('LEGACY DASHBOARD HERO — REFERENCE PORT')&&css.includes('.ka-home .kh-live-card'),'Hero referans geometrisi merkezi design-system içinde kalmalı.');\n'''
if 'LEGACY DASHBOARD HERO — REFERENCE PORT' not in t:t+=checks
TEST.write_text(t,encoding='utf-8')

sw=SW.read_text(encoding='utf-8')
m=re.search(r"const CACHE_ADI='oy-cache-v(\d+)'",sw)
if not m: raise SystemExit('cache missing')
sw=sw[:m.start(1)]+str(int(m.group(1))+1)+sw[m.end(1):]
SW.write_text(sw,encoding='utf-8')
