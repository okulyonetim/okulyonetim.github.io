from pathlib import Path
import re
D=Path('js/modules/dashboard.js');T=Path('tests/dashboard-card-routes-smoke.test.js');S=Path('service-worker.js')
d=D.read_text(encoding='utf-8')
old="function absencesSection(){if(!isAdmin())return'';const today=isoToday(),active=[...arr('personelIzinler'),...arr('ogretmenIzinleri')].filter(x=>{const a=String(x.baslangicTarihi||x.baslangic||x.tarih||'').slice(0,10),b=String(x.bitisTarihi||x.bitis||x.tarih||a).slice(0,10);return a&&a<=today&&(!b||b>=today)});if(!active.length)return'';"
new="function absencesSection(){if(!isAdmin())return'';const today=isoToday(),active=arr('ogretmenIzinleri').filter(x=>{const a=String(x.baslangicTarihi||x.baslangic||x.tarih||'').slice(0,10),b=String(x.bitisTarihi||x.bitis||x.tarih||a).slice(0,10);return a&&a<=today&&(!b||b>=today)});if(!active.length)return'';"
if old not in d: raise SystemExit('absences source contract missing')
d=d.replace(old,new,1)
D.write_text(d,encoding='utf-8')
t=T.read_text(encoding='utf-8')
old_assert="assert(dash.includes(\"[...arr('personelIzinler'),...arr('ogretmenIzinleri')]\")&&dash.includes('data-dash-page=\"leaves\"'),'İzinli kartı mevcut birleşik local-first veri kapsamını ve gerçek İzinler rotasını korumalı.');"
new_assert="assert(dash.includes(\"active=arr('ogretmenIzinleri').filter\")&&!dash.includes(\"active=[...arr('personelIzinler'),...arr('ogretmenIzinleri')].filter\")&&dash.includes('data-dash-page=\"leaves\"'),'Ana sayfa izin kartı yalnız öğretmen izinlerini kullanmalı; hizmetli/işçi izinlerini göstermemeli.');"
if old_assert not in t: raise SystemExit('old absences test contract missing')
t=t.replace(old_assert,new_assert,1)
extra="\nassert(dash.includes(\"function announcementSection(){\")&&dash.includes(\"if(!d)return'';\"),'Duyuru yoksa duyuru kartı hiç render edilmemeli.');\nassert(dash.includes(\"function pollSection(){\")&&dash.includes(\"if(!list.length)return'';const chart=\"),'Aktif anket yoksa anket kartı hiç render edilmemeli.');\nassert(dash.includes(\"function trialCounterSection(){\")&&dash.includes(\"if(!list.length)return'';const exam=\"),'Aktif deneme sınavı sayacı yoksa sayaç kartı hiç render edilmemeli.');\nassert(dash.includes(\"function absencesSection(){if(!isAdmin())return'';\")&&dash.includes(\"active=arr('ogretmenIzinleri').filter\")&&dash.includes(\"if(!active.length)return'';\"),'Bugün izinli öğretmen yoksa izin kartı hiç render edilmemeli.');\n"
if "Aktif deneme sınavı sayacı yoksa sayaç kartı hiç render edilmemeli." not in t:t+=extra
T.write_text(t,encoding='utf-8')
s=S.read_text(encoding='utf-8');m=re.search(r"const CACHE_ADI='oy-cache-v(\d+)'",s)
if not m: raise SystemExit('cache missing')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):];S.write_text(s,encoding='utf-8')
