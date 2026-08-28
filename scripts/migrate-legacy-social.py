from pathlib import Path

DASH=Path('js/modules/dashboard.js')
CSS=Path('css/design-system.css')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')
SW=Path('service-worker.js')

dash=DASH.read_text(encoding='utf-8')
old="""function socialSection(){const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{},links=Array.isArray(school.sosyalLinkler)?school.sosyalLinkler.filter(x=>x?.url):[];if(!links.length)return'';return section('Sosyal Medya ve Okul Siteleri','🌐','social',`<div class=\"ka-home-social\">${links.slice(0,6).map(x=>`<button type=\"button\" data-dash-external=\"${esc(x.url)}\"><span>${esc(x.ikon||'🌐')}</span><b>${esc(x.etiket||'Bağlantı')}</b></button>`).join('')}</div>`) }"""
# tolerate exact current spacing (function has no space before })
if old not in dash:
    old="""function socialSection(){const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{},links=Array.isArray(school.sosyalLinkler)?school.sosyalLinkler.filter(x=>x?.url):[];if(!links.length)return'';return section('Sosyal Medya ve Okul Siteleri','🌐','social',`<div class=\"ka-home-social\">${links.slice(0,6).map(x=>`<button type=\"button\" data-dash-external=\"${esc(x.url)}\"><span>${esc(x.ikon||'🌐')}</span><b>${esc(x.etiket||'Bağlantı')}</b></button>`).join('')}</div>`) }"""
current="""function socialSection(){const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{},links=Array.isArray(school.sosyalLinkler)?school.sosyalLinkler.filter(x=>x?.url):[];if(!links.length)return'';return section('Sosyal Medya ve Okul Siteleri','🌐','social',`<div class=\"ka-home-social\">${links.slice(0,6).map(x=>`<button type=\"button\" data-dash-external=\"${esc(x.url)}\"><span>${esc(x.ikon||'🌐')}</span><b>${esc(x.etiket||'Bağlantı')}</b></button>`).join('')}</div>`) }"""
# safer function-bound replacement
start=dash.find("function socialSection(){")
end=dash.find("\nfunction allTodayDutySection",start)
if start<0 or end<0: raise SystemExit('socialSection boundaries not found')
new="""function socialSection(){const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{},links=Array.isArray(school.sosyalLinkler)?school.sosyalLinkler.filter(x=>x?.url):[];if(!links.length)return'';const globe='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18\"/></svg>';return `<section class=\"kh-section\" data-home-section=\"social\"><div class=\"kh-section-head\"><div class=\"kh-section-title\">${globe}<span>Sosyal Medya ve Okul Siteleri</span></div></div><div class=\"kh-social\">${links.slice(0,6).map(x=>`<button type=\"button\" data-dash-external=\"${esc(x.url)}\"><span class=\"kh-social-icon\">${esc(x.ikon||'🌐')}</span><span>${esc(x.etiket||'Okul Sitesi')}</span></button>`).join('')}</div></section>`}"""
dash=dash[:start]+new+dash[end:]
DASH.write_text(dash,encoding='utf-8')

css=CSS.read_text(encoding='utf-8')
# generic exam action may not use danger red; preserve legacy geometry but central emerald accent.
css=css.replace(".ka-home .kh-quick button:nth-child(1){background:linear-gradient(180deg,var(--ka-card-bg),color-mix(in srgb,var(--ka-danger) 7%,var(--ka-card-bg)))}",".ka-home .kh-quick button:nth-child(1){background:linear-gradient(180deg,var(--ka-card-bg),var(--ka-primary-soft))}")
css=css.replace(".ka-home .kh-quick button:nth-child(1) svg{color:var(--ka-danger)}",".ka-home .kh-quick button:nth-child(1) svg{color:var(--ka-primary)}")
marker='/* LEGACY SOCIAL CARDS — REFERENCE PORT */'
block='''\n\n/* LEGACY SOCIAL CARDS — REFERENCE PORT */\n.ka-home .kh-section[data-home-section="social"]{display:flex;flex-direction:column;gap:8px}\n.ka-home .kh-section[data-home-section="social"] .kh-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 2px}\n.ka-home .kh-section[data-home-section="social"] .kh-section-title{display:flex;align-items:center;gap:8px;min-width:0;font-size:15.5px;font-weight:900;color:var(--ka-text)}\n.ka-home .kh-section[data-home-section="social"] .kh-section-title>svg{width:19px;height:19px;flex:none;color:var(--ka-primary)}\n.ka-home .kh-social{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}\n.ka-home .kh-social button{min-width:0;min-height:82px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:8px 4px;border:1px solid var(--ka-border);border-radius:18px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);color:var(--ka-text);font:inherit;font-size:9.5px;font-weight:800;text-align:center;cursor:pointer;transition:transform var(--ka-transition-fast),border-color var(--ka-transition-fast),background var(--ka-transition-fast)}\n.ka-home .kh-social button:active{transform:translateY(1px)}\n.ka-home .kh-social button:focus-visible{outline:3px solid var(--ka-focus);outline-offset:2px}\n.ka-home .kh-social-icon{width:29px;height:29px;display:grid;place-items:center;color:var(--ka-primary);font-size:24px;line-height:1}\n.ka-home .kh-social button span:last-child{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n@media(max-width:380px){.ka-home .kh-social{gap:6px}.ka-home .kh-social button{font-size:8.8px;padding-inline:3px}}\n'''
if marker not in css: css+=block
CSS.write_text(css,encoding='utf-8')

test=TEST.read_text(encoding='utf-8')
check="""\nassert(dash.includes('class=\"kh-social\"')&&dash.includes('data-home-section=\"social\"'),'Sosyal bağlantılar referans kh-social DOM sözleşmesini kullanmalı.');\nassert(!dash.includes('class=\"ka-home-social\"'),'Yeni taklit ka-home-social renderer içinde kalmamalı.');\nassert(css.includes('LEGACY SOCIAL CARDS — REFERENCE PORT')&&css.includes('.ka-home .kh-social button{'),'Sosyal kart legacy geometrisi merkezi design-system içinde kalmalı.');\nassert(!css.includes('.ka-home .kh-quick button:nth-child(1) svg{color:var(--ka-danger)}'),'Sınav Ekle genel aksiyonu danger kırmızısı kullanmamalı.');\n// Checkpoint: legacy social cards visual port.\n"""
if 'LEGACY SOCIAL CARDS — REFERENCE PORT' not in test: test+=check
TEST.write_text(test,encoding='utf-8')

sw=SW.read_text(encoding='utf-8').replace("const CACHE_ADI='oy-cache-v716';","const CACHE_ADI='oy-cache-v717';")
SW.write_text(sw,encoding='utf-8')
