from pathlib import Path
import re
D=Path('js/modules/dashboard.js');T=Path('tests/dashboard-card-routes-smoke.test.js');S=Path('service-worker.js')
d=D.read_text(encoding='utf-8')
old="function adminShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${statsSection()}${dutySection()}${absencesSection()}${upcomingSection()}${lessonsSection()}${weekDutySection()}${examsSection()}${notesSection()}`}"
new="function adminShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${statsSection()}${socialSection()}${dutySection()}${absencesSection()}${upcomingSection()}${lessonsSection()}${weekDutySection()}${examsSection()}${notesSection()}`}"
if old not in d: raise SystemExit('adminShell contract changed')
d=d.replace(old,new,1);D.write_text(d,encoding='utf-8')
t=T.read_text(encoding='utf-8')
check="""\nassert(dash.includes("function adminShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${statsSection()}${socialSection()}${dutySection()}"),'Yönetici ana sayfası referanstaki Okul Özeti sonrası sosyal medya/okul siteleri kartını taşımalı.');\nassert(dash.includes("links=Array.isArray(school.sosyalLinkler)?school.sosyalLinkler.filter(x=>x?.url):[];if(!links.length)return''"),'Sosyal medya/okul siteleri kartı gerçek okulBilgileri.sosyalLinkler verisi yoksa hiç render edilmemeli.');\n"""
if 'Yönetici ana sayfası referanstaki Okul Özeti sonrası sosyal medya' not in t:t+=check
T.write_text(t,encoding='utf-8')
s=S.read_text(encoding='utf-8');m=re.search(r"const CACHE_ADI='oy-cache-v(\d+)'",s)
if not m: raise SystemExit('cache missing')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):];S.write_text(s,encoding='utf-8')
