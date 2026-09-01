from pathlib import Path
import re

p=Path('css/design-system.css')
c=p.read_text(encoding='utf-8')
patterns=[
    (r'(\.ka-written-page\{gap:var\(--ka-space-4\)\})\.ka-written-hero\{.*?\.ka-written-hero p\{margin:4px 0 0;color:var\(--ka-hero-muted\)\}\n',r'\1\n','written-hero-css'),
    (r'(\.ka-trial-page\{gap:var\(--ka-space-4\)\})\.ka-trial-hero\{.*?\.ka-trial-hero p\{margin:4px 0 0;color:var\(--ka-hero-muted\)\}\n',r'\1\n','trial-hero-css'),
]
for pattern,repl,label in patterns:
    c,n=re.subn(pattern,repl,c,count=1,flags=re.S)
    if n!=1:
        raise SystemExit(f'{label}: expected 1, got {n}')
old='@media(max-width:640px){.ka-trial-hero{align-items:stretch;flex-direction:column;padding:var(--ka-space-4)}.ka-trial-hero .ka-btn{width:100%}.ka-trial-summary{gap:7px}'
new='@media(max-width:640px){.ka-trial-summary{gap:7px}'
if c.count(old)!=1:
    raise SystemExit(f'trial-hero-mobile-css: expected 1, got {c.count(old)}')
c=c.replace(old,new,1)
p.write_text(c,encoding='utf-8')

p=Path('tests/academic-separate-pages.test.js')
t=p.read_text(encoding='utf-8')
anchor="assert(!academic.includes('ka-written-hero')&&!academic.includes('ka-trial-hero'),'Yazılı/Deneme kendi ikinci hero başlığını üretmemeli; ortak Academic başlığı tek görsel owner olmalı.');\n"
extra=anchor+"assert(!css.includes('.ka-written-hero')&&!css.includes('.ka-trial-hero'),'Emekli ikinci sınav hero tasarımları merkezi CSS içinde yama/ölü katman olarak kalmamalı.');\n"
if t.count(anchor)!=1:
    raise SystemExit(f'test-anchor: expected 1, got {t.count(anchor)}')
t=t.replace(anchor,extra,1)
p.write_text(t,encoding='utf-8')
