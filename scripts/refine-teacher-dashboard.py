from pathlib import Path
import re


def replace_function(text, name, new_text):
    pattern = rf"function {re.escape(name)}\([^\n]*"
    match = re.search(pattern, text)
    if not match:
        raise SystemExit(f'function missing: {name}')
    start = match.start()
    i = match.end() - 1
    depth = 0
    quote = None
    escape = False
    template_depth = 0
    while i < len(text):
        ch = text[i]
        if quote:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch in "'\"`":
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return text[:start] + new_text + text[i + 1:]
        i += 1
    raise SystemExit(f'unclosed function: {name}')

p = Path('js/modules/dashboard.js')
s = p.read_text()

s = replace_function(s, 'statsSection', '''function statsSection(){if(!cardVisible('stats'))return'';const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{},name=school.okulAdi||'KORUK İLK - ORTAOKULU',place=[school.ilce,school.il].filter(Boolean).join(' · ');return section('Okul Özeti','▥','stats',`<div class="ka-home-summary-intro"><div><small>OKUL</small><strong>${esc(name)}</strong>${place?`<span>${esc(place)}</span>`:''}</div><span class="ka-badge">Bugün</span></div><div class="ka-home-stats">${statCard('👥','Öğretmen',arr('ogretmenler').length)}${statCard('🎓','Öğrenci',arr('veliler').length)}${statCard('🏫','Sınıf',arr('siniflar').length)}${statCard('🚌','Servis',arr('servisler').length)}</div>`) }''')

s = replace_function(s, 'dutySection', '''function dutySection(){if(!cardVisible('duty'))return'';const list=arr('nobetAtamalari').filter(x=>String(x.tarih||'').slice(0,10)===isoToday());if(isAdmin())return section("Bugünün Nöbetçileri",'🛡️','duty',list.length?dutyRows(list):empty('Bugün için nöbet kaydı yok.'));const tid=teacherId(),mine=list.filter(x=>tid&&x.ogretmenId===tid);if(!mine.length)return'';return section('Bugünkü Nöbetim','🛡️','duty',`<div class="ka-home-duty-focus">${dutyRows(mine)}</div>`,'ka-home-section--duty')}''')

s = replace_function(s, 'quickSection', '''function quickSection(){return section('Hızlı İşlemler','⚡','quick',`<div class="ka-home-quick"><button type="button" data-dash-route="academic" data-dash-page="written" data-dash-title="Yazılı Sınavlar"><span>📝</span><b>Sınav Ekle</b></button><button type="button" data-dash-quick-note><span>📒</span><b>Not Ekle</b></button><button type="button" data-dash-route="communication" data-dash-page="messages" data-dash-title="Mesajlaşma"><span>💬</span><b>Mesaj Gönder</b></button><button type="button" data-dash-route="documents" data-dash-title="Dokümanlar"><span>📄</span><b>Evraklar</b></button></div>`) }''')
p.write_text(s)

p = Path('css/design-system.css')
s = p.read_text()
marker = '/* ===== TEACHER DASHBOARD REFINEMENT ===== */'
if marker not in s:
    s += r'''

/* ===== TEACHER DASHBOARD REFINEMENT ===== */
.ka-home-section__head{padding:7px 4px 9px}.ka-home-section__head>div{width:100%}.ka-home-section__head h3{font-size:17px;font-weight:900;letter-spacing:-.015em}.ka-home-section__icon{color:var(--ka-primary);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ka-primary) 12%,transparent)}
.ka-home-summary-intro{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 1px 12px;margin-bottom:10px;border-bottom:1px solid var(--ka-border)}.ka-home-summary-intro>div{min-width:0;display:flex;flex-direction:column}.ka-home-summary-intro small{color:var(--ka-primary);font-size:9px;font-weight:900;letter-spacing:.12em}.ka-home-summary-intro strong{margin-top:3px;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ka-home-summary-intro span:not(.ka-badge){margin-top:2px;color:var(--ka-text-muted);font-size:10px}
.ka-home-stat{transition:transform var(--ka-transition-fast),border-color var(--ka-transition-fast)}.ka-home-stat>span{width:42px;height:42px;border-radius:14px;background:var(--ka-primary-soft);display:grid;place-items:center;font-size:22px}.ka-home-stat b{color:var(--ka-text);font-variant-numeric:tabular-nums}.ka-home-stat small{color:var(--ka-text-muted)}
.ka-home-duty-focus{border:1px solid color-mix(in srgb,var(--ka-primary) 30%,var(--ka-border));border-radius:17px;background:linear-gradient(135deg,var(--ka-primary-soft),var(--ka-card-bg));padding:2px 12px}.ka-home-duty-focus .ka-home-row{border-bottom:0;min-height:74px}.ka-home-duty-focus .ka-home-avatar{background:var(--ka-primary);color:var(--ka-button-text)}.ka-home-duty-focus .ka-check{background:var(--ka-card-bg);border:1px solid var(--ka-border);border-radius:12px;padding:7px 9px;color:var(--ka-text);font-size:10px}
.ka-home-quick button{position:relative;min-height:92px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);font-weight:850}.ka-home-quick button>span{width:40px;height:40px;border-radius:13px;background:var(--ka-primary-soft);display:grid;place-items:center}.ka-home-quick button:active{transform:scale(.97);background:var(--ka-primary-soft)}
@media(max-width:430px){.ka-home-section__head h3{font-size:16px}.ka-home-summary-intro strong{font-size:13px}.ka-home-stats{gap:8px}.ka-home-stat{min-height:118px}.ka-home-quick{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ka-home-quick button{min-height:86px}.ka-home-duty-focus .ka-home-row{align-items:flex-start;flex-wrap:wrap;padding-block:10px}.ka-home-duty-focus .ka-check{width:100%;justify-content:center}}
'''
    p.write_text(s)

p = Path('tests/dashboard-card-routes-smoke.test.js')
s = p.read_text()
needle = "assert(dash.includes('trialTimer=setInterval(()=>refreshTrialTimers(),1000)'),'Aktif deneme sayacı ana sayfada canlı güncellenmeli.');"
extra = """
assert(dash.includes("if(!mine.length)return''"),'Öğretmenin nöbet kartı yalnız gerçek nöbeti varsa görünmeli.');
assert(dash.includes("section('Bugünkü Nöbetim'"),'Öğretmenin kendi nöbeti ayrı odak kartı olmalı.');
assert(dash.includes('ka-home-summary-intro')&&dash.includes("school.okulAdi"),'Okul özeti mevcut okulBilgileri verisini kullanmalı.');
assert(dash.includes('>Not Ekle</b>')&&dash.includes('>Evraklar</b>'),'Öğretmen hızlı işlemleri dört doğrudan aksiyonu taşımalı.');
assert(css.includes('TEACHER DASHBOARD REFINEMENT')&&css.includes('.ka-home-duty-focus'),'Öğretmen dashboard görsel sözleşmesi merkezi design-system içinde olmalı.');"""
if extra.strip() not in s:
    if needle not in s:
        raise SystemExit('dashboard regression anchor missing')
    p.write_text(s.replace(needle, needle + extra, 1))
