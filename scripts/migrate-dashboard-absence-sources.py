from pathlib import Path
import re

dash_path = Path('js/modules/dashboard.js')
dash = dash_path.read_text(encoding='utf-8')
new = '''function absenceName(x){if(x?._absenceKind==='staff'){const p=arr('personel').find(o=>o.id===x.personelId);return p?.adSoyad||[p?.ad,p?.soyad].filter(Boolean).join(' ')||x.personelAdi||'Personel'}return x.ogretmenAdi||teacherLabel(x)}
function absencesSection(){if(!isAdmin())return'';const today=isoToday(),active=[...arr('ogretmenIzinleri').map(x=>({...x,_absenceKind:'teacher'})),...arr('personelIzinler').map(x=>({...x,_absenceKind:'staff'}))].filter(x=>{const a=String(x.baslangic||x.baslangicTarihi||x.tarih||'').slice(0,10),b=String(x.bitis||x.bitisTarihi||x.tarih||a).slice(0,10);return a&&a<=today&&(!b||b>=today)});if(!active.length)return'';const calendar='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>';return `<section class="kh-section" data-home-section="absences"><div class="kh-section-head"><div class="kh-section-title">${calendar}<span>Bugün İzinli Olanlar</span></div><button type="button" class="kh-more" data-dash-route="management" data-dash-page="leaves" data-dash-title="İzinler">Tümü ›</button></div><div class="kh-card">${active.map(x=>`<div class="kh-row"><div class="kh-row-main"><b>${esc(absenceName(x))}</b><small>${esc(x.tur||x.izinTuru||x.aciklama||'İzinli')}</small></div><span class="kh-chip amber">İZİNLİ</span></div>`).join('')}</div></section>`}
'''
pattern = r"function absencesSection\(\)\{.*?\}\nfunction upcomingRows"
updated, count = re.subn(pattern, new + 'function upcomingRows', dash, count=1, flags=re.S)
if count != 1:
    raise SystemExit('absencesSection contract not found exactly once')
dash_path.write_text(updated, encoding='utf-8')

test_path = Path('tests/dashboard-card-routes-smoke.test.js')
test = test_path.read_text(encoding='utf-8')
anchor = "assert(shell.includes(\"'today-duty':{module:'management',page:'duty',title:'Nöbet Programı'}\"),'Bugünün Nöbetçileri kartı doğrudan Nöbet Programı sayfasına gitmeli.');"
addition = "assert(dash.includes(\"arr('ogretmenIzinleri').map\")&&dash.includes(\"arr('personelIzinler').map\")&&dash.includes(\"function absenceName\"),'Bugün izinli kartı öğretmen ve personel izinlerini aynı local-first görünümde birleştirmeli.');\n"
if addition.strip() not in test:
    if anchor not in test:
        raise SystemExit('dashboard smoke anchor missing')
    test = test.replace(anchor, addition + anchor, 1)
test_path.write_text(test, encoding='utf-8')
