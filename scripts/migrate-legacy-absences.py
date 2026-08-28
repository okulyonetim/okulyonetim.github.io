from pathlib import Path
import re
D=Path('js/modules/dashboard.js');C=Path('css/design-system.css');T=Path('tests/dashboard-card-routes-smoke.test.js');S=Path('service-worker.js')
d=D.read_text(encoding='utf-8')
start=d.find('function absencesSection(){');end=d.find('\nfunction upcomingRows',start)
if start<0 or end<0: raise SystemExit('absences boundaries missing')
new=r'''function absencesSection(){if(!isAdmin())return'';const today=isoToday(),active=[...arr('personelIzinler'),...arr('ogretmenIzinleri')].filter(x=>{const a=String(x.baslangicTarihi||x.baslangic||x.tarih||'').slice(0,10),b=String(x.bitisTarihi||x.bitis||x.tarih||a).slice(0,10);return a&&a<=today&&(!b||b>=today)});if(!active.length)return'';const calendar='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>';return `<section class="kh-section" data-home-section="absences"><div class="kh-section-head"><div class="kh-section-title">${calendar}<span>Bugün İzinli Olanlar</span></div><button type="button" class="kh-more" data-dash-route="management" data-dash-page="leaves" data-dash-title="İzinler">Tümü ›</button></div><div class="kh-card">${active.map(x=>`<div class="kh-row"><div class="kh-row-main"><b>${esc(x.adSoyad||x.personelAdi||x.ogretmenAdi||teacherLabel(x))}</b><small>${esc(x.izinTuru||x.tur||x.aciklama||'İzinli')}</small></div><span class="kh-chip amber">İZİNLİ</span></div>`).join('')}</div></section>`}'''
d=d[:start]+new+d[end:];D.write_text(d,encoding='utf-8')
c=C.read_text(encoding='utf-8');mark='/* LEGACY ABSENCES CARD — REFERENCE PORT */'
if mark not in c:c+='''\n\n/* LEGACY ABSENCES CARD — REFERENCE PORT */\n.ka-home .kh-chip.amber{background:color-mix(in srgb,var(--ka-warning) 13%,var(--ka-card-bg));color:var(--ka-warning)}\n'''
C.write_text(c,encoding='utf-8')
t=T.read_text(encoding='utf-8');chk='''\nassert(dash.includes('data-home-section="absences"')&&dash.includes('<span class="kh-chip amber">İZİNLİ</span>'),'İzinli personel kartı referans kh-section/kh-row/amber chip yüzeyini kullanmalı.');\nassert(dash.includes("[...arr('personelIzinler'),...arr('ogretmenIzinleri')]")&&dash.includes('data-dash-page="leaves"'),'İzinli kartı mevcut birleşik local-first veri kapsamını ve gerçek İzinler rotasını korumalı.');\nassert(css.includes('LEGACY ABSENCES CARD — REFERENCE PORT')&&css.includes('.ka-home .kh-chip.amber'),'İzinli vurgu rengi merkezi warning tokenından gelmeli.');\n'''
if 'LEGACY ABSENCES CARD — REFERENCE PORT' not in t:t+=chk
T.write_text(t,encoding='utf-8')
s=S.read_text(encoding='utf-8');m=re.search(r"const CACHE_ADI='oy-cache-v(\d+)'",s)
if not m: raise SystemExit('cache missing')
s=s[:m.start(1)]+str(int(m.group(1))+1)+s[m.end(1):];S.write_text(s,encoding='utf-8')
# execute after workflow registration
