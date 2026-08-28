from pathlib import Path


def replace_between(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'{label}: start marker not found')
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f'{label}: end marker not found')
    return text[:a] + replacement.rstrip() + '\n' + text[b:]


dash_path = Path('js/modules/dashboard.js')
shell_path = Path('js/core/shell-ui.js')
css_path = Path('css/design-system.css')
test_path = Path('tests/dashboard-card-routes-smoke.test.js')

dash = dash_path.read_text()
shell = shell_path.read_text()
css = css_path.read_text()
test = test_path.read_text()

news = r'''function newsSection(){
  const items=arr('haberler').filter(x=>x&&x.aktif!==false).slice(0,10);if(!items.length)return'';
  const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V5H6.5A2.5 2.5 0 0 0 4 7.5v12Z"/><path d="M8 9h8M8 13h6"/></svg>';
  const text=items.map(x=>{const url=x?.url||x?.link,action=url?`data-dash-external="${esc(url)}"`:'data-dash-route="communication" data-dash-page="news" data-dash-title="Haberler"';return `<button type="button" class="kh-news-item" ${action}>${esc(x.baslik||x.ad||'Haber')}</button><span class="kh-news-dot">•</span>`}).join('');
  return `<div class="kh-news" data-home-section="news" style="--kh-ticker-time:${Math.max(22,items.length*8)}s"><button type="button" class="kh-news-label" aria-label="Haberler" data-dash-route="communication" data-dash-page="news" data-dash-title="Haberler">${icon} HABERLER</button><div class="kh-news-viewport"><div class="kh-news-track">${text}${text}</div></div></div>`
}'''
dash = replace_between(dash, 'function newsSection(){', 'function trialTotalMin', news, 'newsSection')

week = r'''function weekDatesLegacy(){const d=new Date(),diff=(d.getDay()+6)%7,mon=new Date(d);mon.setDate(d.getDate()-diff);mon.setHours(0,0,0,0);return Array.from({length:5},(_,i)=>{const x=new Date(mon);x.setDate(mon.getDate()+i);return x})}
function dutyPlace(x){return x?.yerAdi||arr('nobetYerleri').find(y=>y.id===x?.yerId)?.ad||''}
function isDutyChief(x){const y=normalizeDay(dutyPlace(x)),r=normalizeDay(x?.rol||x?.gorev||x?.tur||'');if(r.includes('mudur')||r.includes('idareci')||r.includes('sorumlu'))return true;return y.includes('mudur yardimci')||y.includes('mudur yrd')||y.includes('idare')||y==='mudur'||y==='mudurluk'}
function dutyPlaceKind(v){const n=normalizeDay(v);if(n.includes('bahce'))return{type:'yard',ico:'🌳'};if(n.includes('bina')||n.includes('kat')||n.includes('koridor'))return{type:'building',ico:'🏫'};if(n.includes('mudur')||n.includes('idare'))return{type:'admin',ico:'🧑‍💼'};return{type:'other',ico:'📍'}}
function dutyPlaceRank(v){return({yard:0,building:1,other:2,admin:3})[dutyPlaceKind(v).type]??4}
function sortDuties(list){return[...list].sort((a,b)=>dutyPlaceRank(dutyPlace(a))-dutyPlaceRank(dutyPlace(b))||teacherLabel(a).localeCompare(teacherLabel(b),'tr'))}
function dutyPlaceHtml(v){const p=dutyPlaceKind(v);return `<span class="kh-place ${p.type}"><span class="kh-place-ico">${p.ico}</span><b>${esc(v||'—')}</b></span>`}
function weekDutySection(){
  const dates=weekDatesLegacy(),all=arr('nobetAtamalari'),today=isoToday(),calendarIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>';
  const rows=dates.map(d=>{const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,entries=sortDuties(all.filter(x=>String(x.tarih||'').slice(0,10)===key&&!isDutyChief(x)));return `<div class="kh-weekday ${key===today?'today':''}"><div class="kh-weekday-head"><span>${esc(dayName(d).toLocaleUpperCase('tr'))}</span>${key===today?'<span class="kh-chip">BUGÜN</span>':''}</div>${entries.length?entries.map(x=>`<div class="kh-mini"><span>${esc(teacherLabel(x))}</span>${dutyPlaceHtml(dutyPlace(x)||'—')}</div>`).join(''):'<div class="kh-mini"><span class="kh-duty-empty">Nöbet kaydı yok</span><span></span></div>'}</div>`}).join('');
  if(!all.some(x=>{const k=String(x.tarih||'').slice(0,10);return dates.some(d=>k===`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)}))return'';
  return `<section class="kh-section" data-home-section="week-duty"><div class="kh-section-head"><div class="kh-section-title">${calendarIcon}<span>Haftanın Nöbet Programı</span></div><button type="button" class="kh-more" data-dash-route="management" data-dash-page="duty" data-dash-title="Nöbet Programı">Tümü ›</button></div><div class="kh-card">${rows}</div></section>`
}'''
dash = replace_between(dash, 'function weekRange(){', 'function examsSection(){', week, 'weekDutySection')

profile = r'''function openProfilePopover(){const anchor=$('[data-ka-header-profile]');if(!anchor)return;const {name,username,photo}=profileInfo(),p=popoverBase(anchor,360),dark=currentTheme()==='dark';p.classList.add('ka-profile-popover-legacy');p.innerHTML=`<div style="padding:10px 10px 12px;border-bottom:1px solid var(--ka-border);display:flex;gap:11px;align-items:center"><span class="ka-avatar" style="width:46px;height:46px;flex-basis:46px">${photo?`<img src="${esc(photo)}" alt="">`:SVG.profile}</span><div style="min-width:0"><strong style="display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(name)}</strong><small class="ka-muted">${esc(username)}</small></div></div><div class="ka-stack" style="gap:4px;padding-top:8px"><button class="ka-btn ka-btn--ghost" style="justify-content:flex-start" data-hp-profile>${SVG.profile}<span>Profilim</span></button><button class="ka-btn ka-btn--ghost" style="justify-content:flex-start" data-hp-settings>${SVG.settings}<span>Ayarlar</span></button><button class="ka-btn ka-btn--ghost" style="justify-content:flex-start" data-hp-theme>${dark?SVG.sun:SVG.moon}<span>${dark?'Açık Temaya Geç':'Koyu Temaya Geç'}</span></button><div style="height:1px;background:var(--ka-border);margin:4px 0"></div><button class="ka-btn ka-btn--ghost" style="justify-content:flex-start;color:var(--ka-danger)" data-hp-logout>${SVG.logout}<span>Çıkış Yap</span></button></div>`;p.querySelector('[data-hp-profile]')?.addEventListener('click',renderProfile);p.querySelector('[data-hp-settings]')?.addEventListener('click',()=>routeModule('settings',{bottom:'menu'}));p.querySelector('[data-hp-theme]')?.addEventListener('click',async()=>{await toggleTheme();openProfilePopover()});p.querySelector('[data-hp-logout]')?.addEventListener('click',()=>{if(confirm('Hesabınızdan çıkış yapmak istediğinize emin misiniz?'))global.cikisYap?.()})}
'''
shell = replace_between(shell, 'function openProfilePopover(){', 'function dateOf', profile, 'openProfilePopover')

legacy_css = r'''
/* ===== LEGACY DASHBOARD SURFACES — CENTRAL THEME =====
   DOM/geometri: eski dashboard-home.css. Renkler yalnız merkezi --ka-* tokenlarından gelir. */
.ka-home .kh-news{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;min-height:42px;overflow:hidden;border:1px solid var(--ka-border);border-radius:15px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm)}
.ka-home .kh-news-label{height:100%;display:flex;align-items:center;gap:5px;padding:0 10px;border:0;background:var(--ka-primary);color:var(--ka-text-inverse);font-size:9.5px;font-weight:900;letter-spacing:.04em;z-index:2;cursor:pointer}
.ka-home .kh-news-label svg{width:15px;height:15px}
.ka-home .kh-news-viewport{overflow:hidden;white-space:nowrap;min-width:0}
.ka-home .kh-news-track{display:inline-flex;align-items:center;gap:28px;width:max-content;padding-left:100%;animation:khTicker var(--kh-ticker-time,28s) linear infinite;will-change:transform}
.ka-home .kh-news:hover .kh-news-track{animation-play-state:paused}
.ka-home .kh-news-item{border:0;background:none;padding:0;color:var(--ka-text);font:inherit;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer}
.ka-home .kh-news-dot{color:var(--ka-primary);font-weight:900}
@keyframes khTicker{from{transform:translateX(0)}to{transform:translateX(-100%)}}
.ka-home .kh-section{display:flex;flex-direction:column;gap:8px}
.ka-home .kh-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 2px}
.ka-home .kh-section-title{display:flex;align-items:center;gap:8px;min-width:0;font-size:15.5px;font-weight:900;color:var(--ka-text)}
.ka-home .kh-section-title svg{width:19px;height:19px;flex:none;color:var(--ka-primary)}
.ka-home .kh-more{border:0;background:transparent;color:var(--ka-primary);font:inherit;font-size:10.5px;font-weight:850;padding:6px 2px;white-space:nowrap;cursor:pointer}
.ka-home .kh-card{overflow:hidden;border:1px solid var(--ka-border);border-radius:20px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm)}
.ka-home .kh-weekday{padding:11px 12px;border-bottom:1px solid var(--ka-border)}
.ka-home .kh-weekday:last-child{border-bottom:0}
.ka-home .kh-weekday.today{background:var(--ka-primary-soft)}
.ka-home .kh-weekday-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;font-size:10px;font-weight:900;letter-spacing:.04em;color:var(--ka-text)}
.ka-home .kh-weekday.today .kh-weekday-head>span:first-child{color:var(--ka-primary)}
.ka-home .kh-chip{display:inline-flex;align-items:center;gap:4px;padding:5px 8px;border-radius:999px;background:var(--ka-primary-soft);color:var(--ka-primary);font-size:9.5px;font-weight:900;white-space:nowrap}
.ka-home .kh-mini{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 0;color:var(--ka-text);font-size:10.5px}
.ka-home .kh-mini+.kh-mini{border-top:1px dotted var(--ka-border)}
.ka-home .kh-place{display:inline-flex;align-items:center;gap:6px;justify-self:end;color:var(--ka-text-muted);max-width:150px}
.ka-home .kh-place-ico{width:28px;height:28px;display:inline-grid;place-items:center;border-radius:9px;background:var(--ka-muted-bg);font-size:15px}
.ka-home .kh-place b{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ka-home .kh-place.yard{color:var(--ka-success)}
.ka-home .kh-place.building{color:var(--ka-primary)}
.ka-home .kh-place.admin{color:var(--ka-warning)}
.ka-home .kh-duty-empty{color:var(--ka-text-muted)}
.ka-profile-popover-legacy .ka-avatar img{width:100%;height:100%;object-fit:cover;border-radius:inherit}
'''
if 'LEGACY DASHBOARD SURFACES — CENTRAL THEME' not in css:
    css = css.rstrip() + '\n' + legacy_css.strip() + '\n'

old_tests = '''assert(dash.includes('ka-home-news-ticker')&&dash.includes('ka-home-news-track')&&dash.includes('HABERLER'),'Haberler referanstaki tek satır kayan altyazı bandı olmalı.');
assert(dash.includes('ka-week-duty-day')&&dash.includes("['Pazartesi','Salı','Çarşamba','Perşembe','Cuma']")&&dash.includes("isToday?' is-today':''"),'Haftanın nöbet programı gün blokları ve Bugün vurgusunu kullanmalı.');
assert(dash.includes("dutyPlaceVisual")&&dash.includes("icon:'🌳'")&&dash.includes("icon:'🏫'"),'Nöbet programı Bahçe ve Okul Binası yerlerini referans ikonlarıyla göstermeli.');
assert(css.includes('DASHBOARD REFERENCE SURFACES')&&css.includes('.ka-home-news-ticker')&&css.includes('.ka-week-duty-day'),'Referans dashboard yüzeyleri merkezi design-system içinde kalmalı.');
assert(shell.includes("p.classList.add('ka-profile-popover')")&&shell.includes('ka-profile-popover__identity')&&shell.includes('Temayı Değiştir'),'Profil popup referanstaki kimlik ve üç işlem düzenini kullanmalı.');
assert(css.includes('.ka-profile-popover__menu')&&css.includes('.ka-profile-popover__logout'),'Profil popup görünümü merkezi design-system içinde kalmalı.');
// Checkpoint: weekly duty, profile popover and scrolling news match the approved reference.
// Final checkpoint trigger for the approved reference surfaces.'''
new_tests = '''assert(dash.includes('class="kh-news"')&&dash.includes('class="kh-news-label"')&&dash.includes('class="kh-news-track"')&&dash.includes('--kh-ticker-time'),'Haberler eski dashboard-home.js kayan bant DOM sözleşmesini korumalı.');
assert(!dash.includes('ka-home-news-ticker'),'Yeni taklit haber bileşeni aktif renderer içinde kalmamalı.');
assert(dash.includes('class="kh-section"')&&dash.includes('class="kh-weekday ')&&dash.includes('class="kh-weekday-head"')&&dash.includes('class="kh-mini"'),'Haftalık nöbet eski kh-section/kh-weekday DOM sözleşmesini korumalı.');
assert(dash.includes('function isDutyChief')&&dash.includes('function sortDuties')&&dash.includes('function dutyPlaceHtml'),'Haftalık nöbet eski sıralama, amir filtreleme ve yer sunum davranışlarını taşımalı.');
assert(!dash.includes('ka-week-duty-day'),'Yeni taklit haftalık nöbet bileşeni aktif renderer içinde kalmamalı.');
assert(css.includes('LEGACY DASHBOARD SURFACES — CENTRAL THEME')&&css.includes('.ka-home .kh-news')&&css.includes('.ka-home .kh-weekday'),'Legacy dashboard geometrisi merkezi design-system içinde yaşamalı.');
assert(css.includes('.ka-home .kh-news{')&&css.includes('background:var(--ka-card-bg)')&&css.includes('color:var(--ka-text)')&&css.includes('background:var(--ka-primary-soft)'),'Legacy yüzeylerin renkleri merkezi --ka-* tema tokenlarından gelmeli.');
assert(shell.includes("const {name,username,photo}=profileInfo(),p=popoverBase(anchor,360)")&&shell.includes("dark?'Açık Temaya Geç':'Koyu Temaya Geç'")&&shell.includes('ka-profile-popover-legacy'),'Profil popup geçmişteki gerçek header hesap popover sözleşmesini kullanmalı.');
assert(!shell.includes('ka-profile-popover__identity'),'Ekran görüntüsünden yeniden üretilen profil popup DOMu kaldırılmalı.');
// Checkpoint: legacy news, weekly duty and profile surfaces are ported onto central themes.'''
if old_tests not in test:
    raise SystemExit('test contract block not found')
test = test.replace(old_tests, new_tests)

for required in ['kh-news-track','kh-weekday-head','function isDutyChief','ka-profile-popover-legacy']:
    if required not in dash + shell:
        raise SystemExit('missing migrated contract: ' + required)
for forbidden in ['ka-home-news-ticker','ka-week-duty-day']:
    if forbidden in dash:
        raise SystemExit('obsolete active renderer remains: ' + forbidden)

dash_path.write_text(dash)
shell_path.write_text(shell)
css_path.write_text(css)
test_path.write_text(test)
print('Legacy dashboard surfaces migrated onto central theme tokens.')
