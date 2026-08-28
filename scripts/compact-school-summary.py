from pathlib import Path

css=Path('css/design-system.css')
s=css.read_text(encoding='utf-8')
repls={
'.ka-school-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}':'.ka-school-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
'.ka-school-summary-card{position:relative;min-width:0;min-height:226px;padding:26px 16px 18px;border:1px solid var(--ka-border);border-radius:30px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}':'.ka-school-summary-card{position:relative;min-width:0;min-height:154px;padding:14px 10px 11px;border:1px solid var(--ka-border);border-radius:21px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}',
'.ka-school-summary-card::after{content:"";position:absolute;right:-24px;top:-24px;width:100px;height:100px;border-radius:50%;background:color-mix(in srgb,var(--ka-primary) 10%,transparent);pointer-events:none}':'.ka-school-summary-card::after{content:"";position:absolute;right:-22px;top:-22px;width:72px;height:72px;border-radius:50%;background:color-mix(in srgb,var(--ka-primary) 10%,transparent);pointer-events:none}',
'.ka-school-summary-icon{position:relative;z-index:1;width:66px;height:66px;border-radius:22px;display:grid;place-items:center;background:var(--ka-primary-soft);font-size:31px;margin-bottom:14px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ka-primary) 8%,transparent)}':'.ka-school-summary-icon{position:relative;z-index:1;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--ka-primary-soft);font-size:21px;margin-bottom:7px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ka-primary) 8%,transparent)}',
'.ka-school-summary-card>small{font-size:13px;letter-spacing:.07em;color:var(--ka-text-muted);font-weight:850}':'.ka-school-summary-card>small{font-size:10px;letter-spacing:.055em;color:var(--ka-text-muted);font-weight:850}',
'.ka-school-summary-card>b{font-size:44px;line-height:1.05;margin:8px 0 10px;color:var(--ka-text);font-weight:900}':'.ka-school-summary-card>b{font-size:30px;line-height:1.02;margin:4px 0 6px;color:var(--ka-text);font-weight:900}',
'.ka-school-summary-meta{width:100%;min-height:30px;color:var(--ka-text-muted);font-size:12px;display:flex;justify-content:center;align-items:center;gap:7px;flex-wrap:wrap}':'.ka-school-summary-meta{width:100%;min-height:20px;color:var(--ka-text-muted);font-size:9px;display:flex;justify-content:center;align-items:center;gap:5px;flex-wrap:wrap}',
'.ka-school-summary-card.is-student .ka-school-summary-meta{display:grid;grid-template-columns:1fr 1fr;gap:0;align-items:stretch;border-top:1px solid var(--ka-border);margin-top:2px;padding-top:12px}':'.ka-school-summary-card.is-student .ka-school-summary-meta{display:grid;grid-template-columns:1fr 1fr;gap:0;align-items:stretch;border-top:1px solid var(--ka-border);margin-top:1px;padding-top:7px}',
'.ka-school-stage{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;padding:0 5px}':'.ka-school-stage{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;padding:0 3px}',
'.ka-school-stage-icon{width:30px;height:30px;border-radius:10px;background:var(--ka-muted-bg);display:grid;place-items:center;font-size:15px}':'.ka-school-stage-icon{width:21px;height:21px;border-radius:7px;background:var(--ka-muted-bg);display:grid;place-items:center;font-size:11px}',
'.ka-school-stage>small{font-size:10px;font-weight:850;color:var(--ka-text-muted);letter-spacing:.02em}':'.ka-school-stage>small{font-size:8px;font-weight:850;color:var(--ka-text-muted);letter-spacing:.015em}',
'.ka-school-stage>strong{font-size:24px;line-height:1;color:var(--ka-text)}':'.ka-school-stage>strong{font-size:17px;line-height:1;color:var(--ka-text)}',
'.ka-school-stage>div{display:flex;justify-content:center;gap:6px;font-size:10px;font-weight:800;white-space:nowrap}':'.ka-school-stage>div{display:flex;justify-content:center;gap:4px;font-size:8px;font-weight:800;white-space:nowrap}',
'.ka-school-unassigned{grid-column:1/-1;margin-top:6px;color:var(--ka-text-muted);font-size:10px}':'.ka-school-unassigned{grid-column:1/-1;margin-top:4px;color:var(--ka-text-muted);font-size:8px}',
'@media(max-width:390px){.ka-school-summary-grid{gap:10px}.ka-school-summary-card{min-height:210px;padding:22px 10px 16px;border-radius:25px}.ka-school-summary-icon{width:58px;height:58px;border-radius:19px;font-size:27px}.ka-school-summary-card>b{font-size:39px}.ka-school-summary-meta{font-size:10px}.ka-school-stage>strong{font-size:21px}}':'@media(max-width:390px){.ka-school-summary-grid{gap:7px}.ka-school-summary-card{min-height:144px;padding:12px 7px 9px;border-radius:18px}.ka-school-summary-icon{width:39px;height:39px;border-radius:12px;font-size:19px;margin-bottom:6px}.ka-school-summary-card>b{font-size:27px}.ka-school-summary-meta{font-size:8px}.ka-school-stage>strong{font-size:16px}}'
}
for old,new in repls.items():
    if old not in s: raise SystemExit('missing css contract: '+old[:80])
    s=s.replace(old,new,1)
css.write_text(s,encoding='utf-8')

t=Path('tests/dashboard-reminders-smoke.test.js')
x=t.read_text(encoding='utf-8')
old="assert(src.includes(\"if(isAdmin()){const rows=upcomingRows();return section('Yaklaşan Görevler'\"),'Yönetici Yaklaşan Görevler kartının mevcut davranışı öğretmen zaman çizelgesinden ayrılmalı.');"
new="assert(src.includes(\"if(isAdmin()){const rows=upcomingRows();if(!rows.length)return'';return `<section class=\\\"kh-section\\\" data-home-section=\\\"upcoming\\\"\"),'Yönetici Yaklaşan Etkinlik / Görevler kartı öğretmen zaman çizelgesinden ayrılmalı ve legacy kh-section sözleşmesini kullanmalı.');"
if old not in x: raise SystemExit('missing stale reminder assertion')
x=x.replace(old,new,1)
t.write_text(x,encoding='utf-8')

sw=Path('service-worker.js'); w=sw.read_text(encoding='utf-8')
import re
m=re.search(r"const CACHE_ADI='oy-cache-v(\\d+)'",w)
if not m: raise SystemExit('cache version missing')
w=w[:m.start(1)]+str(int(m.group(1))+1)+w[m.end(1):]
sw.write_text(w,encoding='utf-8')
