from pathlib import Path
# Trigger after workflow registration.
p=Path('css/design-system.css')
s=p.read_text()
needle='.ka-home .kh-social-icon{width:29px;height:29px;display:grid;place-items:center;color:var(--ka-primary);font-size:24px;line-height:1}\n'
insert=needle+'.ka-home .kh-social-icon svg{display:block;width:24px;height:24px;max-width:100%;max-height:100%;flex:none}\n.ka-home .kh-social-icon>span{display:grid;place-items:center;width:24px;height:24px;font-size:20px;line-height:1}\n'
if needle not in s: raise SystemExit('social icon css target not found')
if '.ka-home .kh-social-icon svg{' not in s:s=s.replace(needle,insert,1)
p.write_text(s)

t=Path('tests/dashboard-card-routes-smoke.test.js')
ts=t.read_text()
anchor="assert(dash.includes('function socialIconHtml')&&dash.includes('/instagram/.test(key)')&&dash.includes('/youtube/.test(key)')&&dash.includes('/facebook/.test(key)'),'Sosyal bağlantı ikon anahtarları düz metin olarak basılmamalı; merkezi SVG ikonlarına çevrilmeli.');"
extra=anchor+"\nassert(css.includes('.ka-home .kh-social-icon svg{display:block;width:24px;height:24px'),'Inline sosyal SVG ikonları kart içinde sabit ölçüde kalmalı ve taşmamalı.');"
if anchor not in ts: raise SystemExit('social smoke anchor not found')
if 'Inline sosyal SVG ikonları kart içinde sabit ölçüde kalmalı' not in ts:ts=ts.replace(anchor,extra,1)
t.write_text(ts)
