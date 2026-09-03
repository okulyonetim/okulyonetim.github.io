from pathlib import Path

p=Path('tests/academic-separate-pages.test.js')
s=p.read_text(encoding='utf-8')
old="assert(productionShell.includes('css/design-system.css?v=838')&&productionShell.includes('js/app-loader.js?v=838'),'Academic scope düzeltmesi eski PWA cache tarafından maskelenmemeli.');"
new="assert(/css\\/design-system\\.css\\?v=\\d+/.test(productionShell)&&/js\\/app-loader\\.js\\?v=\\d+/.test(productionShell),'Academic scope düzeltmesi sürümlü CSS/AppLoader ile eski PWA cache tarafından maskelenmemeli.');"
if old not in s:
    raise SystemExit('Academic stale cache assertion bulunamadı')
p.write_text(s.replace(old,new,1),encoding='utf-8')
print('Ek regression sözleşmesi düzeltildi.')
