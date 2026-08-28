from pathlib import Path

DASH=Path('js/modules/dashboard.js')
CSS=Path('css/design-system.css')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')
SW=Path('service-worker.js')

dash=DASH.read_text(encoding='utf-8')
start=dash.find('function examsSection(){')
end=dash.find('\nfunction personalScheduleSection',start)
if start<0 or end<0: raise SystemExit('examsSection boundaries not found')
new="""function examsSection(){const teacherMode=!isAdmin(),tid=teacherId();if(teacherMode&&!tid)return'';const list=upcoming(arr('sinavlar'),'tarih',30).filter(x=>!teacherMode||x.ogretmenId===tid).slice(0,6);if(!list.length)return'';const examIcon='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 11l3 3L22 4\"/><path d=\"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11\"/></svg>',groups=[];for(const x of list){const key=String(x.tarih||'').slice(0,10);let g=groups.find(a=>a.key===key);if(!g){g={key,items:[]};groups.push(g)}g.items.push(x)}const body=groups.map(g=>{const dt=new Date(g.key+'T00:00:00'),head=Number.isNaN(dt.getTime())?g.key:dt.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'}).toLocaleUpperCase('tr'),rows=g.items.map(x=>{const d=dayDiff(x.tarih),status=d===0?'Bugün':d===1?'Yarın':`${d} gün`;return `<button type=\"button\" class=\"kh-row\" data-dash-route=\"academic\" data-dash-page=\"written\" data-dash-title=\"Yazılı Sınavlar\"><div class=\"kh-row-main\"><b>${esc(x.ders||x.ad||x.sinavAdi||'Sınav')}</b><small>${esc(x.siniflar||x.sinif||x.sinifAdi||'')}${x.saat?` · ${esc(x.saat)}`:''}</small></div><span class=\"kh-side\">${esc(status)}</span></button>`}).join('');return `<div class=\"kh-exam-date\">${esc(head)}</div>${rows}`}).join('');return `<section class=\"kh-section\" data-home-section=\"exams\"><div class=\"kh-section-head\"><div class=\"kh-section-title\">${examIcon}<span>${teacherMode?'Yaklaşan Yazılı Sınavlar':'Yaklaşan Sınavlar'}</span></div><button type=\"button\" class=\"kh-more\" data-dash-route=\"academic\" data-dash-page=\"written\" data-dash-title=\"Yazılı Sınavlar\">Tümü ›</button></div><div class=\"kh-card\">${body}</div></section>`}"""
dash=dash[:start]+new+dash[end:]
old="collectReminders(6)[Number(btn.dataset.dashCalendarReminder)]?.git?.()"
newhandler="collectReminders(6).filter(x=>x.gunFarki>=0&&x.gunFarki<=6)[Number(btn.dataset.dashCalendarReminder)]?.git?.()"
if old not in dash: raise SystemExit('calendar reminder handler pattern not found')
dash=dash.replace(old,newhandler,1)
DASH.write_text(dash,encoding='utf-8')

css=CSS.read_text(encoding='utf-8')
marker='/* LEGACY EXAMS CARD — REFERENCE PORT */'
block='''\n\n/* LEGACY EXAMS CARD — REFERENCE PORT */\n.ka-home .kh-section[data-home-section="exams"]{display:flex;flex-direction:column;gap:8px}\n.ka-home .kh-section[data-home-section="exams"] .kh-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 2px}\n.ka-home .kh-section[data-home-section="exams"] .kh-section-title{display:flex;align-items:center;gap:8px;min-width:0;font-size:15.5px;font-weight:900;color:var(--ka-text)}\n.ka-home .kh-section[data-home-section="exams"] .kh-section-title>svg{width:19px;height:19px;flex:none;color:var(--ka-primary)}\n.ka-home .kh-section[data-home-section="exams"] .kh-more{border:0;background:transparent;color:var(--ka-primary);font:inherit;font-size:10.5px;font-weight:850;padding:6px 2px;white-space:nowrap}\n.ka-home .kh-section[data-home-section="exams"] .kh-card{overflow:hidden;border:1px solid var(--ka-border);border-radius:20px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm)}\n.ka-home .kh-exam-date{padding:8px 12px 5px;background:var(--ka-surface-muted);color:var(--ka-primary);font-size:9px;font-weight:900;letter-spacing:.04em}\n.ka-home .kh-section[data-home-section="exams"] .kh-row{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 12px;border:0;border-bottom:1px solid var(--ka-border);background:transparent;color:var(--ka-text);text-align:left;font:inherit;cursor:pointer}\n.ka-home .kh-section[data-home-section="exams"] .kh-row:last-child{border-bottom:0}\n.ka-home .kh-section[data-home-section="exams"] .kh-row-main{min-width:0}\n.ka-home .kh-section[data-home-section="exams"] .kh-row-main b{display:block;font-size:12.5px;line-height:1.28;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ka-text)}\n.ka-home .kh-section[data-home-section="exams"] .kh-row-main small{display:block;font-size:10.5px;line-height:1.35;color:var(--ka-text-muted);margin-top:3px}\n.ka-home .kh-section[data-home-section="exams"] .kh-side{font-size:10px;font-weight:700;color:var(--ka-text-muted);text-align:right;white-space:nowrap}\n'''
if marker not in css: css+=block
CSS.write_text(css,encoding='utf-8')

test=TEST.read_text(encoding='utf-8')
old_assert="assert(dash.includes(\"teacherMode?'Yaklaşan Yazılı Sınavlar':'Yaklaşan Sınavlar'\")&&dash.includes('ka-home-exam-row'),'Öğretmenin yaklaşan yazılıları ayrı ve doğrudan yazılı sayfasına bağlı olmalı.');"
new_assert="assert(dash.includes(\"teacherMode?'Yaklaşan Yazılı Sınavlar':'Yaklaşan Sınavlar'\")&&dash.includes('class=\\\"kh-exam-date\\\"')&&dash.includes('data-dash-page=\\\"written\\\"'),'Öğretmenin yaklaşan yazılıları referans tarih gruplarıyla ayrı ve doğrudan yazılı sayfasına bağlı olmalı.');"
if old_assert not in test: raise SystemExit('exam smoke assertion not found')
test=test.replace(old_assert,new_assert,1)
check="""\nassert(dash.includes('data-home-section=\"exams\"')&&dash.includes('class=\"kh-exam-date\"')&&dash.includes('class=\"kh-row\" data-dash-route=\"academic\" data-dash-page=\"written\"'),'Sınavlar referans kh-exam-date/kh-row DOM sözleşmesini kullanmalı.');\nassert(!dash.includes('ka-home-exam-row'),'Yeni taklit ka-home-exam-row renderer içinde kalmamalı.');\nassert(dash.includes("filter(x=>!teacherMode||x.ogretmenId===tid)"),'Öğretmen yazılıları gerçek ogretmenId bağlantısıyla filtrelenmeli.');\nassert(dash.includes("collectReminders(6).filter(x=>x.gunFarki>=0&&x.gunFarki<=6)[Number(btn.dataset.dashCalendarReminder)]"),'Takvim gündem tıklaması görünen kişisel reminder listesiyle aynı indeks uzayını kullanmalı.');\nassert(css.includes('LEGACY EXAMS CARD — REFERENCE PORT')&&css.includes('.ka-home .kh-exam-date{'),'Sınav legacy geometrisi merkezi design-system içinde kalmalı.');\n// Checkpoint: legacy exams visual port + calendar reminder index alignment.\n"""
if 'LEGACY EXAMS CARD — REFERENCE PORT' not in test: test+=check
TEST.write_text(test,encoding='utf-8')

sw=SW.read_text(encoding='utf-8').replace("const CACHE_ADI='oy-cache-v722';","const CACHE_ADI='oy-cache-v723';")
SW.write_text(sw,encoding='utf-8')
