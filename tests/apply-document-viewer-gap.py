from pathlib import Path

css_path = Path('css/design-system.css')
test_path = Path('tests/document-viewer-smoke.test.js')

css = css_path.read_text(encoding='utf-8')
test = test_path.read_text(encoding='utf-8')

css_old = '.dv3pdfstage,.dv3wordstage,.dv3sheetstage{position:absolute;left:0;top:0;transform-origin:top left}'
css_new = '.dv3pdfstage{position:absolute;left:0;top:0;transform-origin:top left;display:flex;flex-direction:column;align-items:flex-start;gap:18px}.dv3wordstage,.dv3sheetstage{position:absolute;left:0;top:0;transform-origin:top left}'
assert css.count(css_old) == 1, f'Beklenen PDF stage CSS kuralı tam bir kez bulunmalı, bulunan: {css.count(css_old)}'
css = css.replace(css_old, css_new, 1)

test_old_decl = "const viewer = fs.readFileSync('js/modules/document-viewer.js', 'utf8');\nconst documents = fs.readFileSync('js/modules/documents.js', 'utf8');"
test_new_decl = "const viewer = fs.readFileSync('js/modules/document-viewer.js', 'utf8');\nconst design = fs.readFileSync('css/design-system.css', 'utf8');\nconst documents = fs.readFileSync('js/modules/documents.js', 'utf8');"
assert test.count(test_old_decl) == 1, 'Smoke test design-system okuması için beklenen bildirim bulunamadı.'
test = test.replace(test_old_decl, test_new_decl, 1)

viewport_old = "assert(viewer.includes('.dv3pdfviewport{flex:1 1 auto;min-height:0;overflow:auto;width:100%'), 'PDF scroll yalnız viewport alanında olmalı.');"
viewport_new = "assert(/\\.dv3pdfviewport,[^{]*\\{[^}]*flex:1 1 auto;[^}]*min-height:0;[^}]*overflow:auto;[^}]*width:100%/.test(design), 'PDF scroll yalnız merkezi design-system viewport alanında olmalı.');"
assert test.count(viewport_old) == 1, 'Eski viewer-içi viewport assertion bulunamadı.'
test = test.replace(viewport_old, viewport_new, 1)

gap_old = "assert(viewer.includes('gap:18px'), 'PDF sayfaları arasında görünür ayrım bulunmalı.');"
gap_new = "assert(/\\.dv3pdfstage\\{[^}]*display:flex;[^}]*flex-direction:column;[^}]*align-items:flex-start;[^}]*gap:18px/.test(design), 'PDF sayfaları arasında merkezi design-system içinde 18px görünür ayrım bulunmalı.');"
assert test.count(gap_old) == 1, 'Eski viewer-içi PDF gap assertion bulunamadı.'
test = test.replace(gap_old, gap_new, 1)

css_path.write_text(css, encoding='utf-8')
test_path.write_text(test, encoding='utf-8')
print('Guarded document viewer design patch applied.')
