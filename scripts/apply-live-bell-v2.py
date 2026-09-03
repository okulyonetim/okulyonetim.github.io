from pathlib import Path
import re

# This temporary migration script is removed by the apply workflow after a verified commit.
dash_path=Path('js/modules/dashboard.js')
dash=dash_path.read_text(encoding='utf-8')
replacement=r'''function bellSegmentMeta(seg){const lesson=seg?.type==='lesson',lunch=seg?.type==='lunch';return{label:lesson?`${seg.period}. Ders`:lunch?'Öğle Arası':'Teneffüs',icon:lesson?'book':lunch?'utensils':'coffee'}}
function bellNextSegment(live){const segs=Array.isArray(live?.segments)?live.segments:[],end=Number(live?.end);if(!segs.length)return null;if(!Number.isFinite(end))return segs.find(x=>x?.type==='lesson')||segs[0]||null;return segs.find(x=>Number(x?.start)>=end&&Number(x?.end)>end)||null}
function weekendNextLabel(live){const first=(live?.segments||[]).find(x=>x?.type==='lesson'),now=new Date(),add=now.getDay()===6?2:now.getDay()===0?1:0,next=new Date(now);next.setDate(now.getDate()+add);return first?`${dayName(next)} · ${hmSec(first.start)}`:dayName(next)}
function holidayBellSvg(){return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21V9"/><path d="M12 10c-2.7-3.6-6.3-3.6-9-1 3.2-.3 5.6.7 7.2 3"/><path d="M12 10c2.7-3.6 6.3-3.6 9-1-3.2-.3-5.6.7-7.2 3"/><path d="M12 9c-.5-3-2.1-5-4.8-6 3.2-.2 5.3 1.3 6.1 4.2"/><path d="M12 9c.5-3 2.1-5 4.8-6-3.2-.2-5.3 1.3-6.1 4.2"/><path d="M5 21h14"/></svg>'}
function specialBell(type,title,sub,badge,icon){return{className:`kh-live-card kh-bell-modern kh-bell-${type}`,progress:'',html:`<div class="kh-bell-special"><div class="kh-bell-special-icon kh-icon-${esc(icon)}">${bellSvg(icon)}</div><div class="kh-bell-special-copy"><strong>${esc(title)}</strong><span>${esc(sub)}</span><em>${esc(badge)}</em></div></div>`}}
function weekendBell(live){const next=weekendNextLabel(live);return{className:'kh-live-card kh-bell-modern kh-bell-weekend-v2',progress:'',html:`<div class="kh-bell-rest-v2"><div class="kh-bell-rest-icon">${bellSvg('home')}</div><div class="kh-bell-rest-copy"><small>HAFTA SONU</small><strong>Bugün ders yok</strong><span>İyi dinlenmeler. Hafta sonunun tadını çıkarın.</span></div><div class="kh-bell-rest-next"><span>${bellSvg('clock')}<small>SIRADAKİ DERS</small></span><b>${esc(next)}</b></div></div>`}}
function holidayBell(live){const days=Number.isFinite(Number(live?.remainingDays))?Number(live.remainingDays):null,pct=Math.round(Math.max(0,Math.min(1,Number(live?.holidayProgress)||0))*100),opening=live?.openingLabel||'',message=String(live?.message||'İyi tatiller! Okul açılışında görüşmek üzere.').trim(),countdown=days==null?(live?.countdownLabel||'Tatil devam ediyor'):days===1?'Okulun açılmasına 1 gün kaldı':`Okulun açılmasına ${days} gün kaldı`;return{className:'kh-live-card kh-bell-modern kh-bell-holiday-v2',progress:`${pct}%`,html:`<div class="kh-bell-holiday-v2"><div class="kh-bell-holiday-icon">${holidayBellSvg()}</div><div class="kh-bell-holiday-copy"><small>TATİL MODU</small><strong>Tatilin tadını çıkarın</strong><span>${esc(countdown)}</span></div><div class="kh-bell-holiday-countdown"><b>${days==null?'—':esc(days)}</b><span>GÜN</span></div><div class="kh-bell-holiday-message">${holidayBellSvg()}<span>${esc(message)}</span></div><div class="kh-bell-holiday-opening"><small>OKULUN AÇILIŞI</small><b>${esc(opening||'Açılış tarihi ayarlardan belirlenebilir')}</b></div></div>`}}
function bellTimeline(live){const isLesson=live?.mode==='lesson',isLunch=live?.mode==='lunch',isBreak=live?.mode==='break'||isLunch,title=isLesson?`${live.period}. Ders`:isLunch?'Öğle Arası':isBreak?'Teneffüs':`${live.nextPeriod||1}. Derse`,status=isLesson?'CANLI DERS':isLunch?'ÖĞLE ARASI':isBreak?'TENEFFÜS':'DERSE HAZIRLIK',orb=isLesson?'book':isLunch?'utensils':isBreak?'coffee':'bell',next=bellNextSegment(live),nextMeta=next?bellSegmentMeta(next):{label:'Gün sonu',icon:'check'},pct=Math.round(Math.max(0,Math.min(1,Number(live?.progress)||0))*100),remaining=live?.remaining==null?'—':liveClock(live.remaining),start=hmSec(live?.start),end=hmSec(live?.end);return{className:`kh-live-card kh-bell-modern kh-bell-timeline-card ${isBreak?'kh-bell-break':''}`,progress:`${pct}%`,html:`<div class="kh-bell-timeline-v2"><div class="kh-bell-timeline-head"><span class="kh-bell-timeline-current-icon">${bellSvg(orb)}</span><span class="kh-bell-timeline-copy"><small>${esc(status)}</small><strong>${esc(title)}</strong><span>${esc(start)}–${esc(end)}</span></span><span class="kh-bell-timeline-chip">${isLesson?'CANLI':isBreak?'AKTİF':'YAKLAŞIYOR'}</span></div><div class="kh-bell-timeline" role="group" aria-label="Canlı ders zaman çizgisi"><span class="kh-bell-step is-start"><i>${bellSvg('clock')}</i><small>Başlangıç</small><b>${esc(start)}</b></span><span class="kh-bell-step is-countdown"><span class="kh-bell-countdown-ring"><b>${esc(remaining)}</b><small>KALAN SÜRE</small></span></span><span class="kh-bell-step is-end"><i>${bellSvg('check')}</i><small>Bitiş</small><b>${esc(end)}</b></span><span class="kh-bell-step is-next"><i>${bellSvg(nextMeta.icon)}</i><small>Sıradaki</small><b>${esc(nextMeta.label)}</b>${next?`<span>${esc(hmSec(next.start))}</span>`:''}</span></div><div class="kh-bell-progress-v2" role="progressbar" aria-label="Aktif zaman dilimi ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span>İlerleme</span><i><b></b></i><strong>%${pct}</strong></div></div>`}}
function bellModel(live=window.SchoolLiveStatus?.status?.()||{}){if(live.mode==='holiday')return holidayBell(live);if(live.mode==='weekend')return weekendBell(live);if(live.mode==='empty')return specialBell('idle','Zil sayacı','Ders saatleri yükleniyor','HAZIRLANIYOR','clock');if(live.mode==='after')return specialBell('idle','Dersler tamamlandı','Bugünkü ders programı sona erdi','GÜN TAMAMLANDI','check');if(live.mode==='idle'){const first=(live.segments||[]).find(x=>x.type==='lesson');return specialBell('idle','Ders saatleri',first?`İlk ders ${hmSec(first.start)}’da başlayacak.`:'Program bekleniyor','PROGRAM HAZIR','clock')}return bellTimeline(live)}
function weatherModel()'''
pattern=r"function bellRail\(live\)\{.*?\nfunction weatherModel\(\)"
new_dash,n=re.subn(pattern,replacement,dash,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'dashboard bell block replacement count={n}')
dash_path.write_text(new_dash,encoding='utf-8')

css_path=Path('css/design-system.css')
css=css_path.read_text(encoding='utf-8')
marker='/* DASHBOARD LIVE BELL — MOBILE TIMELINE V2 */'
if marker in css:
    raise SystemExit('timeline v2 CSS marker already exists')
css += r'''

/* DASHBOARD LIVE BELL — MOBILE TIMELINE V2 */
#khBell.kh-bell-modern.kh-bell-timeline-card{--kb-progress:0%;width:100%;max-width:100%;overflow:hidden!important}
#khBell .kh-bell-timeline-v2{min-width:0;padding:13px 13px 12px}
#khBell .kh-bell-timeline-head{min-width:0;display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:10px}
#khBell .kh-bell-timeline-current-icon{width:44px;height:44px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--kb-accent) 36%,var(--kb-line));border-radius:15px;background:color-mix(in srgb,var(--kb-accent) 14%,transparent);color:var(--kb-accent)}
#khBell .kh-bell-timeline-current-icon svg{width:23px;height:23px}
#khBell .kh-bell-timeline-copy{min-width:0;display:block}
#khBell .kh-bell-timeline-copy small,#khBell .kh-bell-timeline-copy strong,#khBell .kh-bell-timeline-copy span{display:block;min-width:0}
#khBell .kh-bell-timeline-copy small{color:var(--kb-accent);font-size:8px;font-weight:950;letter-spacing:.08em}
#khBell .kh-bell-timeline-copy strong{margin-top:2px;color:var(--kb-text);font-size:17px;font-weight:950;line-height:1.08}
#khBell .kh-bell-timeline-copy span{margin-top:2px;color:var(--kb-muted);font-size:9.5px;font-weight:750}
#khBell .kh-bell-timeline-chip{align-self:start;display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border:1px solid color-mix(in srgb,var(--kb-accent) 35%,var(--kb-line));border-radius:999px;background:color-mix(in srgb,var(--kb-accent) 10%,transparent);color:var(--kb-accent);font-size:8px;font-weight:950;letter-spacing:.05em;white-space:nowrap}
#khBell .kh-bell-timeline{position:relative;min-width:0;width:100%;display:grid;grid-template-columns:minmax(0,.78fr) minmax(76px,1.18fr) minmax(0,.78fr) minmax(0,.98fr);align-items:start;gap:4px;margin-top:13px;padding:0 1px}
#khBell .kh-bell-timeline::before{content:"";position:absolute;z-index:0;left:8%;right:8%;top:18px;height:2px;border-radius:999px;background:var(--kb-track)}
#khBell .kh-bell-step{position:relative;z-index:1;min-width:0;display:grid;justify-items:center;align-content:start;text-align:center;color:var(--kb-muted)}
#khBell .kh-bell-step>i{width:36px;height:36px;display:grid;place-items:center;border:2px solid var(--kb-line);border-radius:50%;background:var(--kb-soft);color:var(--kb-accent);font-style:normal}
#khBell .kh-bell-step>i svg{width:17px;height:17px}
#khBell .kh-bell-step>small{display:block;width:100%;margin-top:6px;overflow:hidden;color:var(--kb-muted);font-size:7.5px;font-weight:850;line-height:1.1;text-overflow:ellipsis;white-space:nowrap}
#khBell .kh-bell-step>b{display:block;width:100%;margin-top:2px;overflow:hidden;color:var(--kb-text);font-size:10px;font-weight:950;line-height:1.12;text-overflow:ellipsis;white-space:nowrap}
#khBell .kh-bell-step>span:not(.kh-bell-countdown-ring){display:block;width:100%;margin-top:2px;overflow:hidden;color:var(--kb-muted);font-size:7.5px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}
#khBell .kh-bell-step.is-next>i{border-color:color-mix(in srgb,var(--kb-break) 58%,var(--kb-line));background:color-mix(in srgb,var(--kb-break) 10%,transparent);color:var(--kb-break)}
#khBell .kh-bell-step.is-next>b{color:var(--kb-break)}
#khBell .kh-bell-step.is-countdown{margin-top:-3px}
#khBell .kh-bell-countdown-ring{position:relative;width:78px;height:78px;display:grid;place-content:center;justify-items:center;border-radius:50%;background:conic-gradient(var(--kb-accent) var(--kb-progress),var(--kb-track) 0);box-shadow:0 0 0 1px color-mix(in srgb,var(--kb-accent) 15%,transparent)}
#khBell .kh-bell-countdown-ring::before{content:"";position:absolute;inset:6px;border-radius:50%;background:var(--kb-soft);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--kb-accent) 12%,var(--kb-line))}
#khBell .kh-bell-countdown-ring>b,#khBell .kh-bell-countdown-ring>small{position:relative;z-index:1;display:block;text-align:center}
#khBell .kh-bell-countdown-ring>b{color:var(--kb-text);font-family:var(--ka-font-mono);font-size:15px;font-weight:950;line-height:1}
#khBell .kh-bell-countdown-ring>small{margin-top:4px;color:var(--kb-accent);font-size:6.5px;font-weight:950;letter-spacing:.06em}
#khBell.kh-bell-break .kh-bell-countdown-ring{background:conic-gradient(var(--kb-break) var(--kb-progress),var(--kb-track) 0)}
#khBell.kh-bell-break .kh-bell-countdown-ring>small{color:var(--kb-break)}
#khBell .kh-bell-progress-v2{min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:7px;margin-top:9px;color:var(--kb-muted);font-size:7.5px;font-weight:850}
#khBell .kh-bell-progress-v2>i{min-width:0;height:5px;overflow:hidden;border-radius:999px;background:var(--kb-track);font-style:normal}
#khBell .kh-bell-progress-v2>i>b{display:block;width:var(--kb-progress);height:100%;border-radius:inherit;background:var(--kb-accent)}
#khBell.kh-bell-break .kh-bell-progress-v2>i>b{background:var(--kb-break)}
#khBell .kh-bell-progress-v2>strong{color:var(--kb-accent);font-size:8px}
#khBell.kh-bell-break .kh-bell-progress-v2>strong{color:var(--kb-break)}
#khBell.kh-bell-weekend-v2{--kb-accent:#6da9c8;--kb-soft:color-mix(in srgb,#6da9c8 10%,var(--ka-live-bg));--kb-line:color-mix(in srgb,#6da9c8 30%,var(--ka-live-border));width:100%;max-width:100%;overflow:hidden!important}
#khBell .kh-bell-rest-v2{min-width:0;display:grid;grid-template-columns:52px minmax(0,1fr);gap:11px;align-items:center;padding:14px}
#khBell .kh-bell-rest-icon{width:52px;height:52px;display:grid;place-items:center;border:1px solid var(--kb-line);border-radius:17px;background:var(--kb-soft);color:var(--kb-accent)}
#khBell .kh-bell-rest-icon svg{width:27px;height:27px}
#khBell .kh-bell-rest-copy{min-width:0}
#khBell .kh-bell-rest-copy small{display:block;color:var(--kb-accent);font-size:8px;font-weight:950;letter-spacing:.09em}
#khBell .kh-bell-rest-copy strong{display:block;margin-top:2px;color:var(--kb-text);font-size:17px;font-weight:950;line-height:1.12}
#khBell .kh-bell-rest-copy span{display:block;margin-top:4px;color:var(--kb-muted);font-size:9.5px;font-weight:700;line-height:1.35}
#khBell .kh-bell-rest-next{grid-column:1/-1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:1px;padding:9px 10px;border:1px solid var(--kb-line);border-radius:13px;background:color-mix(in srgb,var(--kb-soft) 60%,transparent)}
#khBell .kh-bell-rest-next>span{min-width:0;display:flex;align-items:center;gap:6px;color:var(--kb-accent)}
#khBell .kh-bell-rest-next svg{width:15px;height:15px;flex:none}
#khBell .kh-bell-rest-next small{font-size:7.5px;font-weight:950;letter-spacing:.05em;white-space:nowrap}
#khBell .kh-bell-rest-next b{min-width:0;overflow:hidden;color:var(--kb-text);font-size:10px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}
#khBell.kh-bell-holiday-v2{--kb-accent:#e6a52d;--kb-soft:color-mix(in srgb,#e6a52d 11%,var(--ka-live-bg));--kb-line:color-mix(in srgb,#e6a52d 33%,var(--ka-live-border));width:100%;max-width:100%;overflow:hidden!important}
#khBell .kh-bell-holiday-v2{min-width:0;display:grid;grid-template-columns:54px minmax(0,1fr) 72px;gap:10px;align-items:center;padding:14px}
#khBell .kh-bell-holiday-icon{width:54px;height:54px;display:grid;place-items:center;border:1px solid var(--kb-line);border-radius:50%;background:var(--kb-soft);color:var(--kb-accent)}
#khBell .kh-bell-holiday-icon svg{width:30px;height:30px}
#khBell .kh-bell-holiday-copy{min-width:0}
#khBell .kh-bell-holiday-copy small{display:block;color:var(--kb-accent);font-size:8px;font-weight:950;letter-spacing:.09em}
#khBell .kh-bell-holiday-copy strong{display:block;margin-top:2px;color:var(--kb-text);font-size:15px;font-weight:950;line-height:1.15}
#khBell .kh-bell-holiday-copy span{display:block;margin-top:4px;color:var(--kb-muted);font-size:9px;font-weight:750;line-height:1.3}
#khBell .kh-bell-holiday-countdown{position:relative;width:70px;height:70px;display:grid;place-content:center;justify-items:center;border-radius:50%;background:conic-gradient(var(--kb-accent) var(--kb-progress),var(--kb-track) 0);color:var(--kb-text)}
#khBell .kh-bell-holiday-countdown::before{content:"";position:absolute;inset:6px;border-radius:50%;background:var(--kb-soft)}
#khBell .kh-bell-holiday-countdown b,#khBell .kh-bell-holiday-countdown span{position:relative;z-index:1}
#khBell .kh-bell-holiday-countdown b{font-size:22px;font-weight:950;line-height:1}
#khBell .kh-bell-holiday-countdown span{margin-top:3px;color:var(--kb-accent);font-size:7px;font-weight:950;letter-spacing:.08em}
#khBell .kh-bell-holiday-message{grid-column:1/-1;min-width:0;display:grid;grid-template-columns:20px minmax(0,1fr);align-items:center;gap:7px;padding:8px 9px;border:1px solid var(--kb-line);border-radius:12px;background:color-mix(in srgb,var(--kb-soft) 55%,transparent);color:var(--kb-muted);font-size:9px;font-weight:750;line-height:1.3}
#khBell .kh-bell-holiday-message svg{width:18px;height:18px;color:var(--kb-accent)}
#khBell .kh-bell-holiday-opening{grid-column:1/-1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:1px}
#khBell .kh-bell-holiday-opening small{color:var(--kb-muted);font-size:7.5px;font-weight:900;letter-spacing:.05em;white-space:nowrap}
#khBell .kh-bell-holiday-opening b{min-width:0;overflow:hidden;color:var(--kb-text);font-size:9.5px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}
#khBell .kh-bell-timeline-v2 *,#khBell .kh-bell-rest-v2 *,#khBell .kh-bell-holiday-v2 *{animation:none!important}
@media(max-width:380px){#khBell .kh-bell-timeline-v2{padding:11px 10px 10px}#khBell .kh-bell-timeline-head{grid-template-columns:40px minmax(0,1fr) auto;gap:7px}#khBell .kh-bell-timeline-current-icon{width:40px;height:40px;border-radius:13px}#khBell .kh-bell-timeline-copy strong{font-size:15px}#khBell .kh-bell-timeline-chip{padding-inline:6px;font-size:7px}#khBell .kh-bell-timeline{grid-template-columns:minmax(0,.72fr) minmax(70px,1.12fr) minmax(0,.72fr) minmax(0,.9fr);gap:2px;margin-top:11px}#khBell .kh-bell-countdown-ring{width:70px;height:70px}#khBell .kh-bell-countdown-ring>b{font-size:13px}#khBell .kh-bell-step>i{width:32px;height:32px}#khBell .kh-bell-timeline::before{top:16px}#khBell .kh-bell-step>b{font-size:8.7px}#khBell .kh-bell-step>small,#khBell .kh-bell-step>span:not(.kh-bell-countdown-ring){font-size:6.8px}#khBell .kh-bell-rest-v2{grid-template-columns:46px minmax(0,1fr);padding:12px 10px;gap:9px}#khBell .kh-bell-rest-icon{width:46px;height:46px}#khBell .kh-bell-rest-copy strong{font-size:15px}#khBell .kh-bell-holiday-v2{grid-template-columns:48px minmax(0,1fr) 64px;padding:12px 10px;gap:8px}#khBell .kh-bell-holiday-icon{width:48px;height:48px}#khBell .kh-bell-holiday-countdown{width:62px;height:62px}#khBell .kh-bell-holiday-countdown b{font-size:19px}#khBell .kh-bell-holiday-copy strong{font-size:13.5px}}
@media(prefers-reduced-motion:reduce){#khBell .kh-bell-timeline-v2 *,#khBell .kh-bell-rest-v2 *,#khBell .kh-bell-holiday-v2 *{animation:none!important;transition:none!important}}
'''
css_path.write_text(css,encoding='utf-8')

index_path=Path('index.html')
index=index_path.read_text(encoding='utf-8')
index=index.replace('css/design-system.css?v=838','css/design-system.css?v=859')
index=index.replace('js/app-loader.js?v=838','js/app-loader.js?v=859')
index_path.write_text(index,encoding='utf-8')

loader_path=Path('js/app-loader.js')
loader=loader_path.read_text(encoding='utf-8')
old="define('dashboard',['js/modules/school-live-status.js','js/modules/communication.js?v=838','js/modules/dashboard.js']);"
new="define('dashboard',['js/modules/school-live-status.js','js/modules/communication.js?v=838','js/modules/dashboard.js?v=859']);"
if old not in loader:
    raise SystemExit('dashboard loader definition not found')
loader=loader.replace(old,new,1)
loader_path.write_text(loader,encoding='utf-8')

sw_path=Path('service-worker.js')
sw=sw_path.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v858'" not in sw:
    raise SystemExit('expected service worker v858 not found')
sw=sw.replace("const CACHE_ADI='oy-cache-v858'","const CACHE_ADI='oy-cache-v859'",1)
sw=sw.replace("'./css/design-system.css?v=838','./js/app-loader.js?v=838'","'./css/design-system.css?v=859','./js/app-loader.js?v=859'",1)
sw=sw.replace("'./js/modules/dashboard.js'","'./js/modules/dashboard.js?v=859','./js/modules/dashboard.js'",1)
sw_path.write_text(sw,encoding='utf-8')

test_path=Path('tests/dashboard-card-routes-smoke.test.js')
test=test_path.read_text(encoding='utf-8')
old_assert="assert(dash.includes(\"orb=isLesson?'book':isLunch?'utensils':isBreak?'coffee':'bell'\")&&dash.includes('kh-icon-${esc(orb)}')&&dash.includes('kh-icon-sun')&&dash.includes(\"specialBell('weekend'\")&&css.includes('@keyframes khBellSwing')&&css.includes('.kh-icon-home svg'),'Zil/ders/teneffüs/hafta sonu/tatil ikonları durum bazlı animasyon sınıfları taşımalı.');"
new_assert="assert(dash.includes('function bellTimeline(live)')&&dash.includes('kh-bell-timeline')&&dash.includes('Number(live?.progress)')&&dash.includes('kh-bell-progress-v2'),'Canlı zil kartı canonical progress verisini mobil zaman çizgisi ve gerçek ilerleme çubuğunda kullanmalı.');\nassert(dash.includes('Bugün ders yok')&&dash.includes('İyi dinlenmeler. Hafta sonunun tadını çıkarın.')&&dash.includes('weekendNextLabel'),'Hafta sonu kartı ders sayacı yerine dinlenme mesajı ve sıradaki ders bilgisini göstermeli.');\nassert(dash.includes('function holidayBellSvg()')&&dash.includes('kh-bell-holiday-countdown')&&dash.includes('Okulun açılmasına')&&dash.includes('live?.message'),'Tatil modu farklı tatil ikonu, okul açılış geri sayımı ve tatil mesajını göstermeli.');\nassert(css.includes('DASHBOARD LIVE BELL — MOBILE TIMELINE V2')&&css.includes('#khBell .kh-bell-timeline{')&&css.includes('conic-gradient(var(--kb-accent) var(--kb-progress)')&&css.includes('@media(max-width:380px){#khBell .kh-bell-timeline-v2'),'Canlı zil tasarımı merkezi design-system içinde, mobil genişliğe sığan responsive sözleşmeyle kalmalı.');"
if old_assert not in test:
    raise SystemExit('old bell animation assertion not found')
test=test.replace(old_assert,new_assert,1)
stale_flow="assert(dash.includes('function bellModel')&&dash.includes('class=\"ka-tabs\"')&&dash.includes('ka-tab kh-bell-node')&&dash.includes(\"current?'current active'\"),'Gün içi akış tek yatay kaydırılabilir satır olmalı ve aktif segment merkezi pulse sınıfını taşımalı.');"
timeline_flow="assert(dash.includes('function bellModel')&&dash.includes('function bellTimeline(live)')&&dash.includes('kh-bell-timeline')&&dash.includes('kh-bell-progress-v2'),'Gün içi akış yatay kaydırma ve pulse yerine mobil zaman çizgisi ve gerçek ilerleme göstergesi kullanmalı.');"
if stale_flow not in test:
    raise SystemExit('stale bell flow assertion not found')
test=test.replace(stale_flow,timeline_flow,1)
test_path.write_text(test,encoding='utf-8')

trial_path=Path('tests/trial-counter-scroll-stability.test.js')
trial=trial_path.read_text(encoding='utf-8')
trial=trial.replace("css/design-system.css?v=838')&&index.includes('js/app-loader.js?v=838","css/design-system.css?v=859')&&index.includes('js/app-loader.js?v=859",1)
trial=trial.replace("'Üretim shell v838 cache-bust kullanmalı.'","'Üretim shell güncel cache-bust sürümünü kullanmalı.'",1)
trial=trial.replace("const CACHE_ADI='oy-cache-v838'","const CACHE_ADI='oy-cache-v859'",1)
trial=trial.replace("'Service Worker v838 cache kullanmalı.'","'Service Worker güncel cache sürümünü kullanmalı.'",1)
trial_path.write_text(trial,encoding='utf-8')
