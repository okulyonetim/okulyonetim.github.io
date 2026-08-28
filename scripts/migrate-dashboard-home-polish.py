from pathlib import Path

DASH=Path('js/modules/dashboard.js')
CSS=Path('css/design-system.css')
TEST=Path('tests/dashboard-card-routes-smoke.test.js')

dash=DASH.read_text(encoding='utf-8')
css=CSS.read_text(encoding='utf-8')
test=TEST.read_text(encoding='utf-8')

old_social="""function socialSection(){const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{},links=Array.isArray(school.sosyalLinkler)?school.sosyalLinkler.filter(x=>x?.url):[];if(!links.length)return'';const globe='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18\"/></svg>';return `<section class=\"kh-section\" data-home-section=\"social\"><div class=\"kh-section-head\"><div class=\"kh-section-title\">${globe}<span>Sosyal Medya ve Okul Siteleri</span></div></div><div class=\"kh-social\">${links.slice(0,6).map(x=>`<button type=\"button\" data-dash-external=\"${esc(x.url)}\"><span class=\"kh-social-icon\">${esc(x.ikon||'🌐')}</span><span>${esc(x.etiket||'Okul Sitesi')}</span></button>`).join('')}</div></section>`}"""

new_social="""function socialIconHtml(icon,label=''){const raw=String(icon||'').trim(),key=`${raw} ${label||''}`.toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');if(/instagram/.test(key))return '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><circle cx=\"17.5\" cy=\"6.5\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/></svg>';if(/youtube/.test(key))return '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M21 12c0-3.2-.4-5.1-1.1-5.8C19.2 5.4 17.2 5 12 5s-7.2.4-7.9 1.2C3.4 6.9 3 8.8 3 12s.4 5.1 1.1 5.8C4.8 18.6 6.8 19 12 19s7.2-.4 7.9-1.2C20.6 17.1 21 15.2 21 12Z\"/><path d=\"m10 9 5 3-5 3V9Z\" fill=\"currentColor\" stroke=\"none\"/></svg>';if(/facebook/.test(key))return '<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M13.7 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V4a22 22 0 0 0-2.4-.1c-2.4 0-4 1.5-4 4.1v2H8v3h2.6v8h3.1Z\"/></svg>';if(/(^|\\s)(x|twitter)(\\s|$)/.test(key))return '<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M5 4h3.7l4.1 5.6L17.6 4H19l-5.5 6.5L20 20h-3.7l-4.5-6.2L6.5 20H5l6-7.1L5 4Zm2.2 1.2 9.7 13.6h1.9L9.1 5.2H7.2Z\"/></svg>';if(/(web|site|globe|okul|ortaokul|ilkokul)/.test(key))return '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18\"/></svg>';if(raw&&/[^a-zA-Z0-9 _-]/.test(raw))return `<span aria-hidden=\"true\">${esc(raw)}</span>`;return '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18\"/></svg>'}
function socialSection(){const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{},links=Array.isArray(school.sosyalLinkler)?school.sosyalLinkler.filter(x=>x?.url):[];if(!links.length)return'';const globe='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18\"/></svg>';return `<section class=\"kh-section\" data-home-section=\"social\"><div class=\"kh-section-head\"><div class=\"kh-section-title\">${globe}<span>Sosyal Medya ve Okul Siteleri</span></div></div><div class=\"kh-social\">${links.slice(0,6).map(x=>`<button type=\"button\" data-dash-external=\"${esc(x.url)}\" aria-label=\"${esc(x.etiket||'Okul Sitesi')}\"><span class=\"kh-social-icon\">${socialIconHtml(x.ikon,x.etiket)}</span><span>${esc(x.etiket||'Okul Sitesi')}</span></button>`).join('')}</div></section>`}"""

if old_social not in dash:
    raise SystemExit('socialSection contract not found')
dash=dash.replace(old_social,new_social,1)

old_view='.ka-home .kh-news-viewport{overflow:hidden;white-space:nowrap;min-width:0}'
new_view='.ka-home .kh-news-viewport{overflow:hidden;white-space:nowrap;min-width:0;padding-inline:12px;contain:paint;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 12px,#000 calc(100% - 12px),transparent 100%);mask-image:linear-gradient(to right,transparent 0,#000 12px,#000 calc(100% - 12px),transparent 100%)}'
if old_view not in css:
    raise SystemExit('news viewport contract not found')
css=css.replace(old_view,new_view,1)

old_icon='.ka-home .kh-social-icon{width:29px;height:29px;display:grid;place-items:center;color:var(--ka-primary);font-size:24px;line-height:1}'
new_icon='.ka-home .kh-social-icon{width:29px;height:29px;display:grid;place-items:center;color:var(--ka-primary);font-size:24px;line-height:1;overflow:hidden}.ka-home .kh-social-icon>svg{width:24px;height:24px;display:block}.ka-home .kh-social-icon>span{font-size:22px;line-height:1}'
if old_icon not in css:
    raise SystemExit('social icon CSS contract not found')
css=css.replace(old_icon,new_icon,1)

marker="assert(dash.includes('class=\"kh-news\"')&&dash.includes('class=\"kh-news-label\"')&&dash.includes('class=\"kh-news-track\"')&&dash.includes('--kh-ticker-time'),'Haberler eski dashboard-home.js kayan bant DOM sözleşmesini korumalı.');"
extra="""\nassert(css.includes('.ka-home .kh-news-viewport{overflow:hidden;white-space:nowrap;min-width:0;padding-inline:12px')&&css.includes('mask-image:linear-gradient(to right,transparent 0,#000 12px'),'Haber şeridi etikete yapışmamalı ve kırpılan başlık kenarda yumuşatılmalı.');\nassert(dash.includes('function socialIconHtml')&&dash.includes('/instagram/.test(key)')&&dash.includes('/youtube/.test(key)')&&dash.includes('socialIconHtml(x.ikon,x.etiket)'),'Sosyal bağlantı ikon anahtarları ekranda metin olarak basılmamalı; merkezi SVG ikonlara çevrilmeli.');\nassert(css.includes('.ka-home .kh-social-icon>svg{width:24px;height:24px;display:block}'),'Sosyal kart SVG ikonları sabit ve taşmayan geometri kullanmalı.');"""
if extra.strip() not in test:
    if marker not in test:
        raise SystemExit('dashboard smoke insertion marker not found')
    test=test.replace(marker,marker+extra,1)

DASH.write_text(dash,encoding='utf-8')
CSS.write_text(css,encoding='utf-8')
TEST.write_text(test,encoding='utf-8')
print('dashboard home polish applied')
