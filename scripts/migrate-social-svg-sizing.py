from pathlib import Path
css=Path('css/design-system.css').read_text()
test=Path('tests/dashboard-card-routes-smoke.test.js').read_text()
if '.ka-home .kh-social-icon>svg{width:24px;height:24px;display:block}' not in css:
    raise SystemExit('social svg sizing contract missing')
if "assert(css.includes('.ka-home .kh-social-icon>svg{width:24px;height:24px;display:block}')" not in test:
    raise SystemExit('social svg sizing smoke contract missing')
