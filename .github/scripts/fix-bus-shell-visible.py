from pathlib import Path

css_path = Path('css/design-system.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* Servis Oturma — eski ekran birebir düzeltme v3'
pos = css.rfind(marker)
if pos < 0:
    raise SystemExit('classic bus v3 marker not found')
head, tail = css[:pos], css[pos:]
old_stage = '''.ka-bus-classic-stage{
  display:block!important;
  width:100%!important;
  overflow-x:hidden!important;
  padding:8px 0 2px!important;
  margin-top:2px!important;
}'''
new_stage = '''.ka-bus-classic-stage{
  display:flex!important;
  justify-content:center!important;
  align-items:flex-start!important;
  width:100%!important;
  height:auto!important;
  min-height:0!important;
  overflow:visible!important;
  padding:8px 0 2px!important;
  margin-top:2px!important;
}'''
if tail.count(old_stage) != 1:
    raise SystemExit(f'classic stage block count={tail.count(old_stage)}')
tail = tail.replace(old_stage, new_stage, 1)
old_shell = '''  max-width:410px!important;
  min-width:0!important;
  min-height:0!important;
  margin:0 auto!important;
  padding:24px 14px 18px!important;'''
new_shell = '''  max-width:410px!important;
  min-width:0!important;
  min-height:560px!important;
  height:auto!important;
  flex:0 0 auto!important;
  margin:0 auto!important;
  padding:24px 14px 18px!important;'''
if tail.count(old_shell) != 1:
    raise SystemExit(f'classic shell size block count={tail.count(old_shell)}')
tail = tail.replace(old_shell, new_shell, 1)
css_path.write_text(head + tail, encoding='utf-8')

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
if 'css/design-system.css?v=890' not in index:
    raise SystemExit('index css version moved')
index = index.replace('css/design-system.css?v=890', 'css/design-system.css?v=891', 1)
index_path.write_text(index, encoding='utf-8')

sw_path = Path('service-worker.js')
sw = sw_path.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v890';" not in sw:
    raise SystemExit('service worker cache moved')
sw = sw.replace("const CACHE_ADI='oy-cache-v890';", "const CACHE_ADI='oy-cache-v891';", 1)
if "'./css/design-system.css?v=890'" not in sw:
    raise SystemExit('service worker css version moved')
sw = sw.replace("'./css/design-system.css?v=890'", "'./css/design-system.css?v=891'", 1)
sw_path.write_text(sw, encoding='utf-8')

parity_path = Path('tests/transport-seating-classic-parity.test.js')
parity = parity_path.read_text(encoding='utf-8')
if "css/design-system.css?v=890" not in parity or "CACHE_ADI='oy-cache-v890'" not in parity:
    raise SystemExit('classic parity cache expectations moved')
parity = parity.replace('css/design-system.css?v=890', 'css/design-system.css?v=891')
parity = parity.replace("CACHE_ADI='oy-cache-v890'", "CACHE_ADI='oy-cache-v891'")
parity = parity.replace("'overflow-x:hidden!important'", "'overflow:visible!important'")
parity_path.write_text(parity, encoding='utf-8')

visibility_test = Path('tests/transport-bus-shell-visible.test.js')
visibility_test.write_text(r'''const fs=require('fs');
const assert=require('assert');
const css=fs.readFileSync('css/design-system.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const marker='/* Servis Oturma — eski ekran birebir düzeltme v3';
const block=css.slice(css.lastIndexOf(marker));
assert(block.includes('.ka-bus-classic-stage{'),'Klasik otobüs sahnesi bulunmalı.');
assert(block.includes('display:flex!important;')&&block.includes('justify-content:center!important;')&&block.includes('overflow:visible!important;'),'Otobüs sahnesi içeriği dikeyde kırpmamalı ve ortalamalı.');
assert(block.includes('min-height:560px!important;'),'Otobüs kabini görünür bir asgari yüksekliğe sahip olmalı.');
assert(block.includes('height:auto!important;'),'Otobüs kabini satır sayısına göre büyüyebilmeli.');
assert(block.includes('flex:0 0 auto!important;'),'Otobüs kabini modal flex alanında sıfıra sıkışmamalı.');
assert(!block.includes('max-width:410px!important;\n  min-width:0!important;\n  min-height:0!important;'),'Klasik kabin tekrar sıfır yüksekliğe düşmemeli.');
assert(index.includes('css/design-system.css?v=891'),'Yeni görünür otobüs CSS sürümü index tarafından yüklenmeli.');
assert(sw.includes("CACHE_ADI='oy-cache-v891'")&&sw.includes("'./css/design-system.css?v=891'"),'Service Worker yeni görünür otobüs CSS sürümünü önbelleğe almalı.');
console.log('Servis oturma otobüs kabini görünürlük kilidi başarılı.');
''', encoding='utf-8')

print('bus shell visibility patch applied')
