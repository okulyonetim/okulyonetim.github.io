from pathlib import Path

# Teacher startup reminder UI. Keep the existing local-first reminder engine and routes;
# only replace the presentation layer and cache-busted entry points.

dashboard = Path('js/modules/dashboard.js')
s = dashboard.read_text(encoding='utf-8')
start = s.find('function closeReminderPopup()')
end = s.find('async function maybeShowReminders()', start)
if start < 0 or end < 0:
    raise SystemExit('dashboard reminder presentation block not found')

new_block = r'''function closeReminderPopup(){const ov=document.getElementById('dashboardReminderModal');if(!ov)return;if(ov._reminderKeyHandler)document.removeEventListener('keydown',ov._reminderKeyHandler);ov.remove()}
const REMINDER_KIND_META=Object.freeze({
  gorev:{icon:'✅',label:'Görev',tone:'task'},
  evrak:{icon:'📄',label:'Evrak',tone:'document'},
  nobet:{icon:'🛡️',label:'Nöbet',tone:'duty'},
  sosyalKulupler:{icon:'👥',label:'Sosyal Kulüp',tone:'club'},
  rehberlik:{icon:'🧭',label:'Rehberlik',tone:'guidance'},
  maarifRapor:{icon:'📊',label:'Maarif Raporu',tone:'report'},
  zumre:{icon:'👥',label:'Zümre',tone:'meeting'},
  sok:{icon:'🏫',label:'ŞÖK',tone:'meeting'},
  bepPlani:{icon:'📋',label:'BEP Planı',tone:'plan'},
  belirliGunler:{icon:'📅',label:'Belirli Gün',tone:'calendar'},
  kontrolListesi:{icon:'☑️',label:'Kontrol Listesi',tone:'checklist'},
  sinav:{icon:'📝',label:'Sınav',tone:'exam'}
});
function reminderKind(r){return REMINDER_KIND_META[r?.kaynak]||{icon:'🔔',label:'Hatırlatma',tone:'default'}}
function reminderSummary(items){return{overdue:items.filter(x=>x.gunFarki<0).length,today:items.filter(x=>x.gunFarki===0).length,upcoming:items.filter(x=>x.gunFarki>0).length}}
function reminderStatus(r){if(r.gunFarki<0)return{label:`${Math.abs(r.gunFarki)} gün gecikti`,cls:'ka-badge--danger',state:'is-overdue'};if(r.gunFarki===0)return{label:'Bugün son gün',cls:'ka-badge--warning',state:'is-today'};return{label:`${r.gunFarki} gün kaldı`,cls:'',state:'is-upcoming'}}
function reminderChevron(){return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'}
function reminderCloseIcon(){return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'}
function openReminderPopup(items){
  closeReminderPopup();
  const settings=reminderSettings(),hours=Number(settings.erteleSaat)||4,summary=reminderSummary(items),ov=document.createElement('div');
  ov.id='dashboardReminderModal';
  ov.className='ka-modal-backdrop';
  ov.classList.add('ka-reminder-backdrop');
  ov.innerHTML=`<section class="ka-modal ka-reminder-modal" role="dialog" aria-modal="true" aria-labelledby="dashboardReminderTitle" aria-describedby="dashboardReminderDescription">
    <header class="ka-reminder-head">
      <span class="ka-reminder-head__mark">${bellSvg('bell')}</span>
      <div class="ka-reminder-head__copy"><small>ÖĞRETMEN HATIRLATMALARI</small><h2 id="dashboardReminderTitle">Hatırlatmalarınız</h2><p id="dashboardReminderDescription"><b>${esc(firstName())}</b>, ${items.length} işlemi gözden geçirmeniz gerekiyor.</p></div>
      <button class="ka-reminder-close" type="button" data-reminder-close aria-label="Hatırlatmaları kapat">${reminderCloseIcon()}</button>
    </header>
    <div class="ka-reminder-summary" aria-label="Hatırlatma özeti">
      <div class="is-overdue"><span>!</span><small>Geciken</small><strong>${summary.overdue}</strong></div>
      <div class="is-today"><span>●</span><small>Bugün</small><strong>${summary.today}</strong></div>
      <div class="is-upcoming"><span>→</span><small>Yaklaşan</small><strong>${summary.upcoming}</strong></div>
    </div>
    <div class="ka-reminder-list-head"><div><strong>Yapılacaklar</strong><small>Öncelikli olanlar listenin üstünde</small></div><b>${items.length}</b></div>
    <div class="ka-reminder-list" role="list">${items.map((r,i)=>{const status=reminderStatus(r),kind=reminderKind(r);return`<button class="ka-reminder-item ka-reminder-item--${kind.tone} ${status.state}" type="button" data-reminder-index="${i}" role="listitem"><span class="ka-reminder-item__icon" aria-hidden="true">${kind.icon}</span><span class="ka-reminder-item__copy"><small>${esc(kind.label)}</small><strong>${esc(r.baslik)}</strong>${r.altBaslik?`<span>${esc(r.altBaslik)}</span>`:''}</span><span class="ka-reminder-item__side"><b>${esc(status.label)}</b><i>${reminderChevron()}</i></span></button>`}).join('')}</div>
    <footer class="ka-reminder-footer">
      <button class="ka-reminder-snooze" type="button" data-reminder-snooze>${bellSvg('clock')}<span><strong>${hours} saat sonra</strong><small>Tekrar hatırlat</small></span></button>
      <button class="ka-btn ka-reminder-done" type="button" data-reminder-ok><span>✓</span> Tamam, gördüm</button>
    </footer>
  </section>`;
  document.body.appendChild(ov);
  const close=()=>closeReminderPopup();
  ov.querySelector('[data-reminder-close]').onclick=close;
  ov.querySelector('[data-reminder-ok]').onclick=close;
  ov.querySelector('[data-reminder-snooze]').onclick=snoozeReminders;
  ov.querySelectorAll('[data-reminder-index]').forEach(btn=>btn.onclick=()=>{const r=items[Number(btn.dataset.reminderIndex)];closeReminderPopup();r?.git?.()});
  ov.addEventListener('click',e=>{if(e.target===ov)close()});
  ov._reminderKeyHandler=e=>{if(e.key==='Escape')close()};
  document.addEventListener('keydown',ov._reminderKeyHandler);
  requestAnimationFrame(()=>ov.querySelector('[data-reminder-index]')?.focus({preventScroll:true}));
}
'''
s = s[:start] + new_block + s[end:]
dashboard.write_text(s, encoding='utf-8')

css = Path('css/design-system.css')
c = css.read_text(encoding='utf-8')
marker = '@page{size:A4;margin:0}'
if marker not in c:
    raise SystemExit('design-system print marker not found')
if '/* TEACHER STARTUP REMINDERS — CANONICAL */' in c:
    raise SystemExit('reminder redesign CSS already present')
css_block = r'''
/* TEACHER STARTUP REMINDERS — CANONICAL */
.ka-reminder-backdrop{background:color-mix(in srgb,var(--ka-overlay) 94%,transparent);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
.ka-reminder-modal{width:min(560px,calc(100% - 24px));max-height:min(86dvh,760px);overflow:hidden;display:flex;flex-direction:column;border-radius:26px;border-color:var(--ka-border-strong);background:var(--ka-card-raised-bg);box-shadow:0 24px 70px rgba(5,29,21,.28)}
.ka-reminder-head{flex:0 0 auto;display:grid;grid-template-columns:48px minmax(0,1fr) 38px;align-items:center;gap:12px;padding:17px 17px 14px;border-bottom:1px solid var(--ka-border);background:linear-gradient(145deg,color-mix(in srgb,var(--ka-primary-soft) 72%,var(--ka-card-bg)),var(--ka-card-bg))}
.ka-reminder-head__mark{width:48px;height:48px;border-radius:15px;background:var(--ka-primary);color:var(--ka-button-text);display:grid;place-items:center;box-shadow:0 8px 20px color-mix(in srgb,var(--ka-primary) 24%,transparent)}.ka-reminder-head__mark svg{width:24px;height:24px}.ka-reminder-head__copy{min-width:0}.ka-reminder-head__copy>small{display:block;color:var(--ka-primary);font-size:8.5px;font-weight:900;letter-spacing:.12em;line-height:1.2}.ka-reminder-head__copy h2{margin-top:3px;color:var(--ka-text);font-size:20px;line-height:1.15;letter-spacing:-.02em}.ka-reminder-head__copy p{margin-top:4px;color:var(--ka-text-muted);font-size:10.5px;line-height:1.35}.ka-reminder-head__copy p b{color:var(--ka-text);font-weight:850}.ka-reminder-close{width:38px;height:38px;padding:0;border:1px solid var(--ka-border);border-radius:12px;background:var(--ka-card-bg);color:var(--ka-text-muted);display:grid;place-items:center;cursor:pointer}.ka-reminder-close svg{width:18px;height:18px}.ka-reminder-close:active{background:var(--ka-muted-bg);transform:scale(.96)}.ka-reminder-close:focus-visible{outline:3px solid var(--ka-focus);outline-offset:2px}
.ka-reminder-summary{flex:0 0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding:10px 12px 9px;background:var(--ka-card-raised-bg)}.ka-reminder-summary>div{min-width:0;min-height:52px;padding:7px 8px;border:1px solid var(--ka-border);border-radius:14px;background:var(--ka-card-bg);display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:6px}.ka-reminder-summary>div>span{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;font-size:10px;font-weight:950}.ka-reminder-summary small{min-width:0;color:var(--ka-text-muted);font-size:8.2px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ka-reminder-summary strong{color:var(--ka-text);font-size:15px;line-height:1;font-variant-numeric:tabular-nums}.ka-reminder-summary .is-overdue>span{background:color-mix(in srgb,var(--ka-danger) 13%,transparent);color:var(--ka-danger)}.ka-reminder-summary .is-today>span{background:color-mix(in srgb,var(--ka-warning) 14%,transparent);color:var(--ka-warning)}.ka-reminder-summary .is-upcoming>span{background:var(--ka-primary-soft);color:var(--ka-primary)}
.ka-reminder-list-head{flex:0 0 auto;min-height:43px;padding:5px 14px 7px;display:flex;align-items:center;justify-content:space-between;gap:10px}.ka-reminder-list-head>div{min-width:0}.ka-reminder-list-head strong{display:block;color:var(--ka-text);font-size:12px}.ka-reminder-list-head small{display:block;margin-top:1px;color:var(--ka-text-muted);font-size:8.5px}.ka-reminder-list-head>b{min-width:29px;height:27px;padding:0 7px;border-radius:9px;background:var(--ka-muted-bg);color:var(--ka-text-muted);display:grid;place-items:center;font-size:9px;font-variant-numeric:tabular-nums}
.ka-reminder-list{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:0 11px 11px;display:flex;flex-direction:column;gap:7px;scrollbar-width:thin}.ka-reminder-item{--ka-reminder-accent:var(--ka-primary);--ka-reminder-soft:var(--ka-primary-soft);appearance:none;width:100%;min-width:0;min-height:70px;margin:0;padding:9px 9px 9px 10px;border:1px solid var(--ka-border);border-left:3px solid color-mix(in srgb,var(--ka-reminder-accent) 72%,var(--ka-border));border-radius:16px;background:var(--ka-card-bg);color:var(--ka-text);box-shadow:0 2px 7px rgba(18,69,52,.045);display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:9px;text-align:left;cursor:pointer;transition:transform var(--ka-transition-fast),border-color var(--ka-transition-fast),background var(--ka-transition-fast),box-shadow var(--ka-transition-fast)}.ka-reminder-item:hover{border-color:color-mix(in srgb,var(--ka-reminder-accent) 38%,var(--ka-border));border-left-color:var(--ka-reminder-accent);box-shadow:var(--ka-shadow-sm)}.ka-reminder-item:active{transform:scale(.987);background:color-mix(in srgb,var(--ka-reminder-soft) 38%,var(--ka-card-bg))}.ka-reminder-item:focus-visible{outline:3px solid var(--ka-focus);outline-offset:1px}.ka-reminder-item__icon{width:42px;height:42px;border-radius:13px;background:var(--ka-reminder-soft);color:var(--ka-reminder-accent);display:grid;place-items:center;font-size:19px;line-height:1}.ka-reminder-item__copy{min-width:0;display:flex;flex-direction:column;gap:2px}.ka-reminder-item__copy>small{color:var(--ka-reminder-accent);font-size:8px;font-weight:900;letter-spacing:.045em;text-transform:uppercase}.ka-reminder-item__copy>strong{min-width:0;color:var(--ka-text);font-size:12px;font-weight:850;line-height:1.24;overflow-wrap:anywhere}.ka-reminder-item__copy>span{color:var(--ka-text-muted);font-size:9px;line-height:1.25;overflow-wrap:anywhere}.ka-reminder-item__side{min-width:83px;display:grid;grid-template-columns:minmax(0,1fr) 17px;align-items:center;justify-items:end;gap:5px}.ka-reminder-item__side>b{min-height:25px;padding:4px 7px;border-radius:9px;background:var(--ka-muted-bg);color:var(--ka-text-muted);display:grid;place-items:center;text-align:center;font-size:8px;font-weight:900;line-height:1.15;white-space:nowrap}.ka-reminder-item__side>i{width:17px;height:20px;color:var(--ka-text-muted);display:grid;place-items:center;font-style:normal;opacity:.65}.ka-reminder-item__side svg{width:15px;height:15px}.ka-reminder-item.is-overdue{border-left-color:var(--ka-danger)}.ka-reminder-item.is-overdue .ka-reminder-item__side>b{background:color-mix(in srgb,var(--ka-danger) 12%,transparent);color:var(--ka-danger)}.ka-reminder-item.is-today{border-left-color:var(--ka-warning)}.ka-reminder-item.is-today .ka-reminder-item__side>b{background:color-mix(in srgb,var(--ka-warning) 13%,transparent);color:var(--ka-warning)}.ka-reminder-item.is-upcoming .ka-reminder-item__side>b{background:var(--ka-primary-soft);color:var(--ka-primary)}.ka-reminder-item--document{--ka-reminder-accent:#1769aa;--ka-reminder-soft:#e7f2fb}.ka-reminder-item--duty{--ka-reminder-accent:#735faf;--ka-reminder-soft:#eeeafb}.ka-reminder-item--club,.ka-reminder-item--guidance{--ka-reminder-accent:#237052;--ka-reminder-soft:#e5f2ec}.ka-reminder-item--report,.ka-reminder-item--plan{--ka-reminder-accent:#9a6509;--ka-reminder-soft:#fff1d9}.ka-reminder-item--meeting{--ka-reminder-accent:#a4493d;--ka-reminder-soft:#fae9e6}.ka-reminder-item--calendar{--ka-reminder-accent:#23758a;--ka-reminder-soft:#e3f2f5}.ka-reminder-item--exam{--ka-reminder-accent:#1769aa;--ka-reminder-soft:#e7f2fb}
.ka-reminder-footer{flex:0 0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.08fr);gap:8px;padding:10px 12px calc(10px + var(--ka-safe-bottom));border-top:1px solid var(--ka-border);background:var(--ka-card-raised-bg)}.ka-reminder-snooze{appearance:none;min-width:0;min-height:48px;padding:7px 10px;border:1px solid var(--ka-border);border-radius:14px;background:var(--ka-card-bg);color:var(--ka-text);display:grid;grid-template-columns:24px minmax(0,1fr);align-items:center;gap:7px;text-align:left;cursor:pointer}.ka-reminder-snooze>svg{width:22px;height:22px;color:var(--ka-primary)}.ka-reminder-snooze>span{min-width:0;display:flex;flex-direction:column}.ka-reminder-snooze strong{font-size:10px;line-height:1.15}.ka-reminder-snooze small{margin-top:2px;color:var(--ka-text-muted);font-size:8px}.ka-reminder-snooze:active{background:var(--ka-primary-soft)}.ka-reminder-snooze:focus-visible{outline:3px solid var(--ka-focus);outline-offset:2px}.ka-reminder-done{width:100%;min-width:0;min-height:48px;border-radius:14px;font-size:11px}.ka-reminder-done>span{font-size:14px}
[data-theme="dark"] .ka-reminder-modal{box-shadow:0 28px 76px rgba(0,0,0,.58)}[data-theme="dark"] .ka-reminder-item{box-shadow:none}[data-theme="dark"] .ka-reminder-item--document,[data-theme="dark"] .ka-reminder-item--exam{--ka-reminder-accent:#78b8eb;--ka-reminder-soft:#132b3d}[data-theme="dark"] .ka-reminder-item--duty{--ka-reminder-accent:#b7a4ea;--ka-reminder-soft:#29223f}[data-theme="dark"] .ka-reminder-item--club,[data-theme="dark"] .ka-reminder-item--guidance{--ka-reminder-accent:#67d2aa;--ka-reminder-soft:#18372c}[data-theme="dark"] .ka-reminder-item--report,[data-theme="dark"] .ka-reminder-item--plan{--ka-reminder-accent:#e8bd68;--ka-reminder-soft:#362b15}[data-theme="dark"] .ka-reminder-item--meeting{--ka-reminder-accent:#e78c7f;--ka-reminder-soft:#3a211f}[data-theme="dark"] .ka-reminder-item--calendar{--ka-reminder-accent:#76c6d8;--ka-reminder-soft:#16343b}
@media(max-width:767px){.ka-reminder-backdrop{padding:max(7px,var(--ka-safe-top)) 6px max(6px,var(--ka-safe-bottom));align-items:end}.ka-reminder-modal{width:100%;max-height:min(88dvh,820px);margin:0;border:1px solid var(--ka-border-strong);border-radius:26px 26px 18px 18px}.ka-reminder-head{grid-template-columns:44px minmax(0,1fr) 36px;gap:10px;padding:14px 13px 12px}.ka-reminder-head__mark{width:44px;height:44px;border-radius:14px}.ka-reminder-head__copy h2{font-size:18px}.ka-reminder-head__copy p{font-size:9.5px}.ka-reminder-close{width:36px;height:36px}.ka-reminder-summary{padding:8px 9px 7px;gap:5px}.ka-reminder-summary>div{min-height:46px;padding:5px 6px;grid-template-columns:21px minmax(0,1fr) auto;gap:4px;border-radius:12px}.ka-reminder-summary>div>span{width:21px;height:21px;border-radius:7px;font-size:8px}.ka-reminder-summary small{font-size:7.4px}.ka-reminder-summary strong{font-size:13px}.ka-reminder-list-head{padding-inline:11px}.ka-reminder-list{padding:0 8px 8px;gap:6px}.ka-reminder-item{min-height:66px;padding:8px;grid-template-columns:39px minmax(0,1fr) auto;gap:8px;border-radius:15px}.ka-reminder-item__icon{width:39px;height:39px;border-radius:12px;font-size:18px}.ka-reminder-item__copy>strong{font-size:11.5px}.ka-reminder-item__copy>span{font-size:8.5px}.ka-reminder-item__side{min-width:76px;grid-template-columns:minmax(0,1fr) 14px;gap:3px}.ka-reminder-item__side>b{padding-inline:5px;font-size:7.5px}.ka-reminder-item__side>i{width:14px}.ka-reminder-footer{padding:8px 9px calc(8px + var(--ka-safe-bottom));gap:6px}.ka-reminder-snooze,.ka-reminder-done{min-height:46px;border-radius:13px}.ka-reminder-done{padding-inline:8px;font-size:10.5px}}
@media(max-width:370px){.ka-reminder-head__copy p{max-width:220px}.ka-reminder-summary>div{grid-template-columns:20px minmax(0,1fr);grid-template-rows:auto auto}.ka-reminder-summary strong{grid-column:2}.ka-reminder-item{grid-template-columns:37px minmax(0,1fr) auto}.ka-reminder-item__icon{width:37px;height:37px}.ka-reminder-item__side{min-width:69px}.ka-reminder-item__side>b{font-size:7px}.ka-reminder-snooze{padding-inline:7px}.ka-reminder-snooze strong{font-size:9.2px}.ka-reminder-done{font-size:9.8px}}
'''
c = c.replace(marker, css_block + '\n' + marker, 1)
css.write_text(c, encoding='utf-8')

# Cache-bust every changed entry point while preserving unrelated module versions.
replacements = {
    'js/app-loader.js': [('js/modules/dashboard.js?v=859', 'js/modules/dashboard.js?v=872')],
    'index.html': [('css/design-system.css?v=871', 'css/design-system.css?v=872'), ('js/app-loader.js?v=860', 'js/app-loader.js?v=872')],
    'service-worker.js': [("oy-cache-v871", "oy-cache-v872"), ('./css/design-system.css?v=871', './css/design-system.css?v=872'), ('./js/app-loader.js?v=860', './js/app-loader.js?v=872'), ('./js/modules/dashboard.js?v=859', './js/modules/dashboard.js?v=872')],
}
for file, pairs in replacements.items():
    p = Path(file)
    text = p.read_text(encoding='utf-8')
    for old, new in pairs:
        if old not in text:
            raise SystemExit(f'{file}: expected token missing: {old}')
        text = text.replace(old, new)
    p.write_text(text, encoding='utf-8')

# Update only explicit cache-generation assertions. Do not touch feature semantics.
for p in Path('tests').glob('*.js'):
    text = p.read_text(encoding='utf-8')
    updated = (text
        .replace('css/design-system.css?v=871', 'css/design-system.css?v=872')
        .replace('oy-cache-v871', 'oy-cache-v872')
        .replace('js/app-loader.js?v=860', 'js/app-loader.js?v=872')
        .replace('js/modules/dashboard.js?v=859', 'js/modules/dashboard.js?v=872'))
    if updated != text:
        p.write_text(updated, encoding='utf-8')

redesign_test = Path('tests/dashboard-reminder-redesign.test.js')
redesign_test.write_text(r'''const fs=require('fs');
const assert=require('assert');
const dashboard=fs.readFileSync('js/modules/dashboard.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(dashboard);
assert(dashboard.includes("ov.className='ka-modal-backdrop'")&&dashboard.includes("ov.classList.add('ka-reminder-backdrop')")&&dashboard.includes('ka-reminder-modal'),'Öğretmen açılış hatırlatması merkezi modal yüzeyinde özel reminder tasarımı kullanmalı.');
for(const marker of ['ka-reminder-head','ka-reminder-summary','ka-reminder-list','ka-reminder-item','ka-reminder-footer','reminderSummary(items)','REMINDER_KIND_META']) assert(dashboard.includes(marker),`Hatırlatma yeni görünüm sözleşmesi eksik: ${marker}`);
assert(dashboard.includes('role="dialog"')&&dashboard.includes('aria-modal="true"')&&dashboard.includes('aria-labelledby="dashboardReminderTitle"'),'Hatırlatma penceresi erişilebilir dialog semantiğini korumalı.');
assert(dashboard.includes("if(e.key==='Escape')close()")&&dashboard.includes('if(e.target===ov)close()'),'Hatırlatma penceresi Escape ve arka plan dokunuşuyla kapatılabilmeli.');
assert(dashboard.includes("KorukLocalFirst.meta(u,'reminderSnoozeUntil'"),'Erteleme IndexedDB meta üzerinden local-first kalmalı.');
assert(!dashboard.includes('db.collection(')&&!dashboard.includes('onSnapshot'),'Hatırlatma görünümü doğrudan Firestore kullanmamalı.');
for(const marker of ['/* TEACHER STARTUP REMINDERS — CANONICAL */','.ka-reminder-modal','.ka-reminder-item.is-overdue','.ka-reminder-footer','[data-theme="dark"] .ka-reminder-modal','@media(max-width:767px)']) assert(design.includes(marker),`Merkezi Design System reminder stili eksik: ${marker}`);
assert(index.includes('css/design-system.css?v=872')&&index.includes('js/app-loader.js?v=872'),'Yeni reminder tasarımı cache-busted shell üzerinden yüklenmeli.');
assert(loader.includes('js/modules/dashboard.js?v=872'),'Dashboard yeni reminder sürümüyle lazy-load edilmeli.');
assert(sw.includes("oy-cache-v872")&&sw.includes('./css/design-system.css?v=872')&&sw.includes('./js/app-loader.js?v=872')&&sw.includes('./js/modules/dashboard.js?v=872'),'Service Worker reminder v872 varlıklarını önbelleğe almalı.');
console.log('Öğretmen açılış hatırlatma penceresi redesign sözleşmesi başarılı.');
''', encoding='utf-8')

print('teacher reminder redesign patch prepared')
