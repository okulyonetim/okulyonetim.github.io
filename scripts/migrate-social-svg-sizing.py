from pathlib import Path
import re
p=Path('css/design-system.css')
s=p.read_text()
if '.ka-home .kh-social-icon svg{' not in s:
    m=re.search(r'(\.ka-home \.kh-social-icon\{[^}]+\})',s)
    if not m: raise SystemExit('social icon css rule not found')
    extra="\n.ka-home .kh-social-icon svg{display:block;width:24px;height:24px;max-width:100%;max-height:100%;flex:none}\n.ka-home .kh-social-icon>span{display:grid;place-items:center;width:24px;height:24px;font-size:20px;line-height:1}"
    s=s[:m.end()]+extra+s[m.end():]
p.write_text(s)

t=Path('tests/dashboard-card-routes-smoke.test.js')
ts=t.read_text()
anchor="assert(dash.includes('function socialIconHtml')&&dash.includes('/instagram/.test(key)')&&dash.includes('/youtube/.test(key)')&&dash.includes('/facebook/.test(key)'),'Sosyal bağlantı ikon anahtarları düz metin olarak basılmamalı; merkezi SVG ikonlarına çevrilmeli.');"
extra=anchor+"\nassert(css.includes('.ka-home .kh-social-icon svg{display:block;width:24px;height:24px'),'Inline sosyal SVG ikonları kart içinde sabit ölçüde kalmalı ve taşmamalı.');"
if anchor not in ts: raise SystemExit('social smoke anchor not found')
if 'Inline sosyal SVG ikonları kart içinde sabit ölçüde kalmalı' not in ts:ts=ts.replace(anchor,extra,1)
t.write_text(ts)
