from pathlib import Path
import re
D=Path('js/modules/dashboard.js');T=Path('tests/dashboard-card-routes-smoke.test.js');S=Path('service-worker.js')
d=D.read_text(encoding='utf-8')
start=d.find('function absencesSection(){');end=d.find('\nfunction upcomingRows',start)
if start<0 or end<0: raise SystemExit('absences boundaries missing')
new=r'''function absencesSection(){if(!isAdmin())return'';const today=isoToday(),active=arr('ogretmenIzinleri').filter(x=>{const a=String(x.baslangic||x.baslangicTarihi||x.tarih||'').slice(0,10),b=String(x.bitis||x.bitisTarihi||x.tarih||a).slice(0,10);return a&&a<=today&&(!b||b>=today)});if(!active.length)return'';const calendar='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>';return `<section class="kh-section" data-home-section="absences"><div class="kh-section-head"><div class="kh-section-title">${calendar}<span>Bugün İzinli Öğretmenler</span></div><button type="button" class="kh-more" data-dash-route="management" data-dash-page="leaves" data-dash-title="İzinler">Tümü ›</button></div><div class="kh-card">${active.map(x=>`<div class="kh-row"><div class="kh-row-main"><b>${esc(x.ogretmenAdi||teacherLabel(x))}</b><small>${esc(x.tur||x.izinTuru||x.aciklama||'İzinli')}</small></div><span class="kh-chip amber">İZİNLİ</span></div>`).join('')}</div></section>`}'''
d=d[:start]+new+d[end:]
D.write_text(d,encoding='utf-8')
t=T.read_text(encoding='utf-8')
old="assert(dash.includes(\"function absencesSection(){if(!isAdmin())return'';const today=isoToday(),active=arr('ogretmenIzinleri')\")&&dash.includes(\"if(!active.length)return''\"),'Ana sayfa izin kartı yalnız öğretmen izinleri varsa görünmeli; personelIzinler bu karta karışmamalı.');"
if old in t:
    t=t.replace(old,"assert(dash.includes(\"function absencesSection(){if(!isAdmin())return'';const today=isoToday(),active=arr('ogretmenIzinleri')\")&&dash.includes(\"if(!active.length)return''\")&&dash.includes('<span>Bugün İzinli Öğretmenler</span>'),'Ana sayfa izin kartı yalnız aktif öğretmen izni varsa görünmeli ve öğretmen olarak etiketlenmeli.');")
elif 'Bugün İzinli Öğretmenler' not in t:
    t += "\nassert(dash.includes(\"active=arr('ogretmenIzinleri').filter\")&&dash.includes(\"if(!active.length)return''\")&&dash.includes('<span>Bugün İzinli Öğretmenler</span>'),'Ana sayfa izin kartı yalnız aktif öğretmen izni varsa görünmeli.');\nassert(!dash.includes(\"active=[...arr('personelIzinler'),...arr('ogretmenIzinleri')]\"),'Personel izinleri ana sayfa öğretmen izin kartına karışmamalı.');\n"
T.write_text(t,encoding='utf-8')
s=S.read_text(encoding='utf-8');m=re.search(r"const CACHE_ADI='oy-cache-v(\d+)'",s)
if not m: raise SystemExit('cache missing')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):]
S.write_text(s,encoding='utf-8')
