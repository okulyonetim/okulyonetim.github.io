from pathlib import Path
p=Path('tests/settings-android-stability.test.js')
s=p.read_text(encoding='utf-8')
count=s.count('design-system.css?v=912')
if count!=2:
    raise SystemExit(f'design-system test version expected twice, found {count}')
p.write_text(s.replace('design-system.css?v=912','design-system.css?v=913'),encoding='utf-8')
