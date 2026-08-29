from pathlib import Path

css_path = Path('css/design-system.css')
test_path = Path('tests/document-viewer-smoke.test.js')

css = css_path.read_text(encoding='utf-8')
test = test_path.read_text(encoding='utf-8')

assert css.count('.dv3pdfpage::after') == 0, 'PDF sayfa etiketi pseudo-element zaten mevcut; patch uygulanmamalı.'
anchor = '.dv3pdfpage{'
assert css.count(anchor) == 1, f'Beklenen .dv3pdfpage kuralı tam bir kez bulunmalı, bulunan: {css.count(anchor)}'
start = css.index(anchor)
end = css.index('}', start) + 1
label_rule = '.dv3pdfpage::after{content:attr(data-page);position:absolute;right:8px;bottom:8px;background:#111b;color:#fff;border-radius:var(--ka-radius-pill);padding:3px 7px;font:700 11px/1 var(--ka-font)}'
css = css[:end] + label_rule + css[end:]

old = "assert(viewer.includes(\"page.dataset.page=String(i)\"), 'PDF sayfaları numaralandırılmalı.');"
new = old + "\nassert(design.includes('.dv3pdfpage::after{content:attr(data-page);position:absolute;right:8px;bottom:8px;'), 'PDF sayfa numarası merkezi design-system içinde görünür olmalı.');"
assert test.count(old) == 1, 'PDF dataset.page assertion tam bir kez bulunmalı.'
assert 'PDF sayfa numarası merkezi design-system içinde görünür olmalı.' not in test, 'Sayfa etiketi assertion zaten mevcut.'
test = test.replace(old, new, 1)

css_path.write_text(css, encoding='utf-8')
test_path.write_text(test, encoding='utf-8')
print('Guarded PDF page label parity patch applied.')
