from pathlib import Path

# Academic test: production uses cache-busted central assets; do not pin an obsolete exact generation.
p=Path('tests/academic-separate-pages.test.js')
s=p.read_text(encoding='utf-8')
old="assert(productionShell.includes('css/design-system.css?v=838')&&productionShell.includes('js/app-loader.js?v=838'),'Academic scope düzeltmesi eski PWA cache tarafından maskelenmemeli.');"
new="assert(/css\\/design-system\\.css\\?v=\\d+/.test(productionShell)&&/js\\/app-loader\\.js\\?v=\\d+/.test(productionShell),'Academic scope düzeltmesi sürümlü CSS/AppLoader ile eski PWA cache tarafından maskelenmemeli.');"
if old not in s:
    raise SystemExit('Academic stale cache assertion bulunamadı')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Assistant test: communication module is legitimately cache-busted (communication.js?v=N).
# Normalize only the version query before checking source order so the architecture contract remains strict.
p=Path('tests/assistant-v2-smoke.test.js')
lines=p.read_text(encoding='utf-8').splitlines()
idx=next((i for i,line in enumerate(lines) if line.startswith('const communicationBundle=loader.match(')),None)
if idx is None or idx+1>=len(lines) or not lines[idx+1].startswith('assert(communicationBundle.includes('):
    raise SystemExit('Assistant communication bundle assertion bulunamadı')
lines[idx:idx+2]=[
    lines[idx],
    "const communicationBundleNormalized=communicationBundle.replace(/\\?v=\\d+/g,'');",
    "assert(communicationBundleNormalized.includes(\"'js/modules/communication.js'\")&&communicationBundleNormalized.includes(\"'js/modules/assistant.js'\")&&communicationBundleNormalized.indexOf(\"'js/modules/communication.js'\")<communicationBundleNormalized.indexOf(\"'js/modules/assistant.js'\"),'V2 AI Asistan ek lazy bağımlılıklar olsa da Communication bundle içinde communication.js sonrasında yüklenmeli.');"
]
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')

print('Ek regression sözleşmeleri güncel loader/cache-bust gerçeğine hizalandı.')
