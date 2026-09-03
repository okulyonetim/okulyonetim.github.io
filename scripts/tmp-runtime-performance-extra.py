from pathlib import Path

# Academic test: production uses cache-busted central assets; do not pin an obsolete exact generation.
p=Path('tests/academic-separate-pages.test.js')
s=p.read_text(encoding='utf-8')
old="assert(productionShell.includes('css/design-system.css?v=838')&&productionShell.includes('js/app-loader.js?v=838'),'Academic scope düzeltmesi eski PWA cache tarafından maskelenmemeli.');"
new="assert(/css\\/design-system\\.css\\?v=\\d+/.test(productionShell)&&/js\\/app-loader\\.js\\?v=\\d+/.test(productionShell),'Academic scope düzeltmesi sürümlü CSS/AppLoader ile eski PWA cache tarafından maskelenmemeli.');"
if old not in s: raise SystemExit('Academic stale cache assertion bulunamadı')
s=s.replace(old,new,1);p.write_text(s,encoding='utf-8')

# Assistant test: communication module is legitimately cache-busted (communication.js?v=N).
p=Path('tests/assistant-v2-smoke.test.js');lines=p.read_text(encoding='utf-8').splitlines()
idx=next((i for i,line in enumerate(lines) if line.startswith('const communicationBundle=loader.match(')),None)
if idx is None or idx+1>=len(lines) or not lines[idx+1].startswith('assert(communicationBundle.includes('): raise SystemExit('Assistant communication bundle assertion bulunamadı')
lines[idx:idx+2]=[lines[idx],"const communicationBundleNormalized=communicationBundle.replace(/\\?v=\\d+/g,'');","assert(communicationBundleNormalized.includes(\"'js/modules/communication.js'\")&&communicationBundleNormalized.includes(\"'js/modules/assistant.js'\")&&communicationBundleNormalized.indexOf(\"'js/modules/communication.js'\")<communicationBundleNormalized.indexOf(\"'js/modules/assistant.js'\"),'V2 AI Asistan ek lazy bağımlılıklar olsa da Communication bundle içinde communication.js sonrasında yüklenmeli.');"]
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')

# Classic shell: settings consolidation + query-string tolerant lazy loader ownership/order checks.
p=Path('tests/classic-shell-v2-smoke.test.js');s=p.read_text(encoding='utf-8')
old="  ['Okul Bilgileri','settings','school'],['Veriler','settings','data'],['Kullanıcı İşlemleri','settings','users'],['Kullanıcı İstatistikleri','settings','statistics']";new="  ['Veriler','settings','data']"
if old not in s: raise SystemExit('Classic shell eski tekrar eden Settings directPages satırı bulunamadı')
s=s.replace(old,new,1)
anchor="for(const [label,route,page] of directPages) assert(ui.includes(`['${label}'`)&&ui.includes(`'${route}','${page}'`),`Doğrudan menü hedefi eksik/yanlış: ${label} -> ${route}/${page}`);"
if anchor not in s: raise SystemExit('Classic shell directPages assertion bulunamadı')
s=s.replace(anchor,anchor+"\nconst settingsGroup=ui.match(/\\{key:'settings'.*?\\},\\n \\{key:'exams'/s)?.[0]||'';\nfor(const duplicate of [\"['Okul Bilgileri'\",\"['Kullanıcı İşlemleri'\",\"['Kullanıcı İstatistikleri'\"]) assert(!settingsGroup.includes(duplicate),`Settings shell tekrarı geri dönmemeli: ${duplicate}`);",1)
old="const optionalLoaderSource=fs.readFileSync('js/app-loader.js','utf8');";new=old+"\nconst normalizeLoaderBundle=v=>String(v||'').replace(/\\?v=\\d+/g,'');"
if old not in s: raise SystemExit('Classic shell optionalLoaderSource bulunamadı')
s=s.replace(old,new,1)
old="assert(optionalLoaderSource.includes(\"define('dashboard',['js/modules/school-live-status.js','js/modules/communication.js?v=838','js/modules/dashboard.js'])\"),'Dashboard açılmadan önce SchoolLiveStatus ve mevcut tek duyuru servis sahibi lazy bundle içinde yüklenmeli.');"
new="const dashboardBundleNormalized=normalizeLoaderBundle(optionalLoaderSource.match(/define\\('dashboard',\\[([^\\]]+)\\]\\)/)?.[1]||'');\nassert(dashboardBundleNormalized.includes(\"'js/modules/school-live-status.js'\")&&dashboardBundleNormalized.includes(\"'js/modules/communication.js'\")&&dashboardBundleNormalized.includes(\"'js/modules/dashboard.js'\")&&dashboardBundleNormalized.indexOf(\"'js/modules/school-live-status.js'\")<dashboardBundleNormalized.indexOf(\"'js/modules/communication.js'\")&&dashboardBundleNormalized.indexOf(\"'js/modules/communication.js'\")<dashboardBundleNormalized.indexOf(\"'js/modules/dashboard.js'\"),'Dashboard açılmadan önce SchoolLiveStatus ve mevcut tek duyuru servis sahibi lazy bundle içinde yüklenmeli.');"
if old not in s: raise SystemExit('Classic shell dashboard exact loader assertion bulunamadı')
s=s.replace(old,new,1)
old="const academicBundle=optionalLoaderSource.match(/define\\('academic',\\[([^\\]]+)\\]\\)/)?.[1]||'';\nassert(academicBundle.includes('FIREBASE_STORAGE_SDK')&&academicBundle.includes(\"'js/modules/report-engine.js'\")&&academicBundle.includes(\"'js/modules/academic.js?v=838'\")&&!academicBundle.includes('academic-calendar-parity.js')&&academicBundle.indexOf(\"'js/modules/report-engine.js'\")<academicBundle.indexOf(\"'js/modules/academic.js?v=838'\"),'Academic modülü Storage + ReportEngine + tek canonical Academic sırasını lazy bundle içinde korumalı.');"
new="const academicBundle=normalizeLoaderBundle(optionalLoaderSource.match(/define\\('academic',\\[([^\\]]+)\\]\\)/)?.[1]||'');\nassert(academicBundle.includes('FIREBASE_STORAGE_SDK')&&academicBundle.includes(\"'js/modules/report-engine.js'\")&&academicBundle.includes(\"'js/modules/academic.js'\")&&!academicBundle.includes('academic-calendar-parity.js')&&academicBundle.indexOf(\"'js/modules/report-engine.js'\")<academicBundle.indexOf(\"'js/modules/academic.js'\"),'Academic modülü Storage + ReportEngine + tek canonical Academic sırasını lazy bundle içinde korumalı.');"
if old not in s: raise SystemExit('Classic shell academic versioned assertion bulunamadı')
s=s.replace(old,new,1)
old="const communicationBundle=optionalLoaderSource.match(/define\\('communication',\\[([^\\]]+)\\]\\)/)?.[1]||'';\nassert(communicationBundle.includes(\"'js/modules/communication.js?v=838'\")&&communicationBundle.includes(\"'js/modules/assistant.js'\")&&communicationBundle.indexOf(\"'js/modules/communication.js?v=838'\")<communicationBundle.indexOf(\"'js/modules/assistant.js'\"),'AI Asistan ek lazy bağımlılıklar olsa da Communication bundle içinde communication.js sonrasında yüklenmeli.');"
new="const communicationBundle=normalizeLoaderBundle(optionalLoaderSource.match(/define\\('communication',\\[([^\\]]+)\\]\\)/)?.[1]||'');\nassert(communicationBundle.includes(\"'js/modules/communication.js'\")&&communicationBundle.includes(\"'js/modules/assistant.js'\")&&communicationBundle.indexOf(\"'js/modules/communication.js'\")<communicationBundle.indexOf(\"'js/modules/assistant.js'\"),'AI Asistan ek lazy bağımlılıklar olsa da Communication bundle içinde communication.js sonrasında yüklenmeli.');"
if old not in s: raise SystemExit('Classic shell communication versioned assertion bulunamadı')
s=s.replace(old,new,1)
# Dashboard reminder/data preparation currently deduplicates the type list before local hydrate.
old="assert(dashboard.includes(\"SyncEngine.localHydrate(types)\")&&dashboard.includes(\"okulBilgileri:'okulBilgileri'\"),'Dashboard ek verileri Firestore beklemeden IndexedDB üzerinden hydrate etmeli.');"
new="assert(dashboard.includes(\"SyncEngine.localHydrate([...new Set(types)])\")&&dashboard.includes(\"okulBilgileri:'okulBilgileri'\"),'Dashboard ek verileri Firestore beklemeden IndexedDB üzerinden hydrate etmeli.');"
if old not in s: raise SystemExit('Classic shell eski localHydrate assertion bulunamadı')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

print('Ek regression sözleşmeleri güncel loader/cache/settings/local-first gerçeğine hizalandı.')
