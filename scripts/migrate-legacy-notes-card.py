from pathlib import Path

DASH=Path('js/modules/dashboard.js')
CSS=Path('css/design-system.css')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')
SW=Path('service-worker.js')

dash=DASH.read_text(encoding='utf-8')
start=dash.find('function notesSection(){')
end=dash.find('\nfunction quickSection',start)
if start<0 or end<0: raise SystemExit('notesSection boundaries not found')
new="""function notesSection(){const u=user(),list=arr('notlar').filter(x=>u.admin||!x.sahipUid||x.sahipUid===u.uid).sort((a,b)=>String(b.tarih||b.olusturmaTarihi||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.olusturmaTarihi||a.eklenmeTarihi||''))).slice(0,4),noteIcon='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z\"/><path d=\"M14 2v6h6M8 13h8M8 17h6\"/></svg>';const rows=list.length?list.map(x=>{const raw=String(x.icerik||x.not||x.metin||'').replace(/<[^>]*>/g,'').trim(),title=x.baslik||raw||'Not',stamp=x.tarih||x.olusturmaTarihi||x.eklenmeTarihi||'';return `<button type=\"button\" class=\"kh-row\" data-dash-route=\"communication\" data-dash-page=\"notes\" data-dash-title=\"Notlar\"><div class=\"kh-row-main\"><b>${esc(title)}</b><small>${esc(stamp?date(stamp):'Kişisel not')}</small></div><span class=\"kh-note-arrow\" aria-hidden=\"true\">›</span></button>`}).join(''):'<div class=\"kh-empty\">Henüz kişisel notunuz yok.</div>';return `<section class=\"kh-section\" data-home-section=\"notes\"><div class=\"kh-section-head\"><div class=\"kh-section-title\">${noteIcon}<span>Notlarım</span></div><button type=\"button\" class=\"kh-more\" data-dash-route=\"communication\" data-dash-page=\"notes\" data-dash-title=\"Notlar\">Tümü ›</button></div><div class=\"kh-card\">${rows}</div></section>`}"""
dash=dash[:start]+new+dash[end:]
DASH.write_text(dash,encoding='utf-8')

css=CSS.read_text(encoding='utf-8')
marker='/* LEGACY NOTES CARD — REFERENCE PORT */'
block='''\n\n/* LEGACY NOTES CARD — REFERENCE PORT */\n.ka-home .kh-section[data-home-section="notes"]{display:flex;flex-direction:column;gap:8px}\n.ka-home .kh-section[data-home-section="notes"] .kh-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 2px}\n.ka-home .kh-section[data-home-section="notes"] .kh-section-title{display:flex;align-items:center;gap:8px;min-width:0;font-size:15.5px;font-weight:900;color:var(--ka-text)}\n.ka-home .kh-section[data-home-section="notes"] .kh-section-title>svg{width:19px;height:19px;flex:none;color:var(--ka-primary)}\n.ka-home .kh-section[data-home-section="notes"] .kh-more{border:0;background:transparent;color:var(--ka-primary);font:inherit;font-size:10.5px;font-weight:850;padding:6px 2px;white-space:nowrap}\n.ka-home .kh-section[data-home-section="notes"] .kh-card{overflow:hidden;border:1px solid var(--ka-border);border-radius:20px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm)}\n.ka-home .kh-section[data-home-section="notes"] .kh-row{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 12px;border:0;border-bottom:1px solid var(--ka-border);background:transparent;color:var(--ka-text);text-align:left;font:inherit;cursor:pointer}\n.ka-home .kh-section[data-home-section="notes"] .kh-row:last-child{border-bottom:0}\n.ka-home .kh-section[data-home-section="notes"] .kh-row-main{min-width:0}\n.ka-home .kh-section[data-home-section="notes"] .kh-row-main b{display:block;font-size:12.5px;line-height:1.28;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ka-text)}\n.ka-home .kh-section[data-home-section="notes"] .kh-row-main small{display:block;font-size:10.5px;line-height:1.35;color:var(--ka-text-muted);margin-top:3px}\n.ka-home .kh-note-arrow{font-size:18px;line-height:1;color:var(--ka-primary)}\n.ka-home .kh-section[data-home-section="notes"] .kh-empty{padding:14px 12px;text-align:center;color:var(--ka-text-muted);font-size:11px}\n'''
if marker not in css: css+=block
CSS.write_text(css,encoding='utf-8')

test=TEST.read_text(encoding='utf-8')
check="""\nassert(dash.includes('data-home-section=\"notes\"')&&dash.includes('class=\"kh-card\"')&&dash.includes('class=\"kh-row\" data-dash-route=\"communication\" data-dash-page=\"notes\"'),'Notlarım referans kh-section/kh-card/kh-row sözleşmesini kullanmalı.');\nassert(!dash.includes('class=\"ka-home-note\"'),'Yeni taklit ka-home-note renderer içinde kalmamalı.');\nassert(dash.includes("arr('notlar').filter(x=>u.admin||!x.sahipUid||x.sahipUid===u.uid)"),'Notlarım local-first sahiplik filtresini korumalı.');\nassert(css.includes('LEGACY NOTES CARD — REFERENCE PORT')&&css.includes('.ka-home .kh-section[data-home-section=\"notes\"] .kh-row{'),'Notlarım legacy geometrisi merkezi design-system içinde kalmalı.');\n// Checkpoint: legacy notes card visual port.\n"""
if 'LEGACY NOTES CARD — REFERENCE PORT' not in test: test+=check
TEST.write_text(test,encoding='utf-8')

sw=SW.read_text(encoding='utf-8').replace("const CACHE_ADI='oy-cache-v720';","const CACHE_ADI='oy-cache-v721';")
SW.write_text(sw,encoding='utf-8')
