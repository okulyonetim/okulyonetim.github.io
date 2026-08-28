from pathlib import Path
# trigger: legacy-upcoming-v1

DASH=Path('js/modules/dashboard.js')
CSS=Path('css/design-system.css')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')
SW=Path('service-worker.js')

dash=DASH.read_text(encoding='utf-8')
start=dash.find('function upcomingSection(){')
end=dash.find('\nfunction lessonsSection',start)
if start<0 or end<0: raise SystemExit('upcomingSection boundaries not found')
new=r'''function upcomingSection(){if(!cardVisible('upcoming'))return'';const taskIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';if(isAdmin()){const rows=upcomingRows();if(!rows.length)return'';return `<section class="kh-section" data-home-section="upcoming"><div class="kh-section-head"><div class="kh-section-title">${taskIcon}<span>Yaklaşan Etkinlik / Görevler</span></div><button type="button" class="kh-more" data-dash-route="communication" data-dash-page="calendar" data-dash-title="Takvim">Tümü ›</button></div><div class="kh-card">${rows.map(r=>`<button type="button" class="kh-row" data-dash-route="communication" data-dash-page="calendar" data-dash-title="Takvim"><div class="kh-row-main"><b>${esc(r.title)}</b><small>${esc(r.meta.split(' · ')[0]||r.meta)}</small></div><div class="kh-side">${esc(r.meta.split(' · ')[1]||'Yaklaşıyor')}</div></button>`).join('')}</div></section>`}const rows=teacherUpcomingRows();if(!rows.length)return'';return `<section class="kh-section" data-home-section="upcoming"><div class="kh-section-head"><div class="kh-section-title">${taskIcon}<span>Teslim & Görev Takvimi</span></div><button type="button" class="kh-more" data-dash-route="communication" data-dash-page="calendar" data-dash-title="Takvim">Tümü ›</button></div><div class="kh-card">${rows.map((r,i)=>{const s=reminderStatus(r);return `<button type="button" class="kh-row" data-dash-reminder-index="${i}"><div class="kh-row-main"><b>${esc(r.baslik)}</b><small>${esc(r.altBaslik||'')}</small></div><div class="kh-side ${s.cls==='ka-badge--danger'?'is-danger':s.cls==='ka-badge--warning'?'is-warning':''}">${esc(s.label)}</div></button>`}).join('')}</div></section>`}'''
dash=dash[:start]+new+dash[end:]
DASH.write_text(dash,encoding='utf-8')

css=CSS.read_text(encoding='utf-8')
marker='/* LEGACY UPCOMING TASKS — REFERENCE PORT */'
block='''\n\n/* LEGACY UPCOMING TASKS — REFERENCE PORT */\n.ka-home .kh-section[data-home-section="upcoming"]{display:flex;flex-direction:column;gap:8px}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 2px}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-section-title{display:flex;align-items:center;gap:8px;min-width:0;font-size:15.5px;font-weight:900;color:var(--ka-text)}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-section-title svg{width:19px;height:19px;flex:none;color:var(--ka-primary)}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-more{border:0;background:transparent;color:var(--ka-primary);font:inherit;font-size:10.5px;font-weight:850;padding:6px 2px;white-space:nowrap}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-card{overflow:hidden;border:1px solid var(--ka-border);border-radius:20px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm)}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-row{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 12px;border:0;border-bottom:1px solid var(--ka-border);background:transparent;color:var(--ka-text);text-align:left;font:inherit;cursor:pointer}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-row:last-child{border-bottom:0}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-row-main{min-width:0}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-row-main b{display:block;font-size:12.5px;line-height:1.28;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ka-text)}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-row-main small{display:block;font-size:10.5px;line-height:1.35;color:var(--ka-text-muted);margin-top:3px}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-side{font-size:10px;font-weight:700;color:var(--ka-text-muted);text-align:right;white-space:nowrap}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-side.is-warning{color:var(--ka-warning)}\n.ka-home .kh-section[data-home-section="upcoming"] .kh-side.is-danger{color:var(--ka-danger)}\n'''
if marker not in css: css+=block
CSS.write_text(css,encoding='utf-8')

test=TEST.read_text(encoding='utf-8')
check='''\nassert(dash.includes('<span>Yaklaşan Etkinlik / Görevler</span>')&&dash.includes('<span>Teslim & Görev Takvimi</span>'),'Yönetici ve öğretmen yaklaşan görev başlıkları referans/kişisel sözleşmeyi korumalı.');\nassert(dash.includes('data-home-section="upcoming"')&&dash.includes('class="kh-side'),'Yaklaşan görevler referans kh-card/kh-row/kh-side DOM ailesini kullanmalı.');\nassert(dash.includes("teacherUpcomingRows(){return collectReminders(30).filter(x=>x.kaynak!='sinav')")||dash.includes("teacherUpcomingRows(){return collectReminders(30).filter(x=>x.kaynak!=='sinav')"),'Öğretmen görevleri canonical collectReminders motorundan gelmeli.');\nassert(css.includes('LEGACY UPCOMING TASKS — REFERENCE PORT')&&css.includes('.kh-section[data-home-section="upcoming"] .kh-side'),'Yaklaşan görev legacy geometrisi merkezi design-system içinde kalmalı.');\n// Checkpoint: legacy upcoming tasks / teacher delivery calendar port.\n'''
if 'LEGACY UPCOMING TASKS — REFERENCE PORT' not in test: test+=check
TEST.write_text(test,encoding='utf-8')

sw=SW.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v726';" not in sw: raise SystemExit('unexpected cache version')
sw=sw.replace("const CACHE_ADI='oy-cache-v726';","const CACHE_ADI='oy-cache-v727';",1)
SW.write_text(sw,encoding='utf-8')
