from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def exact(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 exact match, got {n}')
    return text.replace(old, new, 1)


def between(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'{label}: start marker missing')
    b = text.find(end, a + len(start))
    if b < 0:
        raise SystemExit(f'{label}: end marker missing')
    return text[:a] + replacement + text[b:]


# ------------------------------------------------------------------
# Dashboard: smooth ticker + horizontal current-session/total timers.
# ------------------------------------------------------------------
p = 'js/modules/dashboard.js'
s = read(p)
s = between(
    s,
    'function stabilizeNewsTicker(root=document)',
    'function trialTotalMin',
    "function stabilizeNewsTicker(root=document){root.querySelector?.('.kh-news')?.classList.add('is-ready')}\n",
    'dashboard ticker stabilizer'
)

trial_state = '''function trialTimerState(d,nowMs=Date.now()){
const mins=trialTotalMin(d),total=Math.max(0,mins*60),manualActive=d?.sayacDurumu?.aktif===true,manualRaw=manualActive&&d?.sayacDurumu?.baslatmaTarihi?new Date(d.sayacDurumu.baslatmaTarihi).getTime():0,manualStart=Number.isFinite(manualRaw)?manualRaw:0,start=manualStart||trialStartMs(d),end=start&&total?start+total*1000:0,multiSession=d?.oturumTuru==='İki Oturum';
if(!start||total<=0)return{run:false,status:'ready',remaining:Math.max(0,total),segmentRemaining:Math.max(0,total),label:total>0?'Başlangıç bekleniyor':'Süre eksik',progress:0,segmentProgress:0,multiSession,start,end,secondsUntilStart:0};
const until=(start-nowMs)/1000;if(until>0)return{run:false,status:'scheduled',remaining:total,segmentRemaining:total,label:'Başlamayı bekliyor',progress:0,segmentProgress:0,multiSession,start,end,secondsUntilStart:until};
const elapsed=Math.max(0,(nowMs-start)/1000),remaining=Math.max(0,total-elapsed),progress=Math.max(0,Math.min(100,elapsed/total*100));
if(remaining<=0)return{run:false,status:'done',remaining:0,segmentRemaining:0,label:'Tamamlandı',progress:100,segmentProgress:100,multiSession,start,end,secondsUntilStart:0};
if(multiSession){
  const verbal=Math.max(0,(Number(d.sozelSuresiDk)||0)*60),br=Math.max(0,(Number(d.araSureDk)||0)*60),numeric=Math.max(0,total-verbal-br);
  let label='Sayısal oturum',segmentElapsed=Math.max(0,elapsed-verbal-br),segmentTotal=numeric,status='active';
  if(elapsed<verbal){label='Sözel oturum';segmentElapsed=elapsed;segmentTotal=verbal}
  else if(elapsed<verbal+br){label='Ara';segmentElapsed=Math.max(0,elapsed-verbal);segmentTotal=br;status='break'}
  const segmentRemaining=Math.max(0,segmentTotal-segmentElapsed),segmentProgress=segmentTotal?Math.max(0,Math.min(100,segmentElapsed/segmentTotal*100)):100;
  return{run:true,status,remaining,segmentRemaining,label,progress,segmentProgress,multiSession:true,start,end,secondsUntilStart:0};
}
return{run:true,status:'active',remaining,segmentRemaining:remaining,label:'Sınav sürüyor',progress,segmentProgress:progress,multiSession:false,start,end,secondsUntilStart:0};
}
'''
s = between(s, 'function trialTimerState(d,nowMs=Date.now())', 'function trialFmt', trial_state, 'dashboard trial state')

trial_card = '''function trialCounterSection(){const list=trialLiveRows().slice(0,1);if(!list.length)return'';return `<section class="kh-trial-live" data-home-section="trial-counter">${list.map(({exam:x,state:st})=>{const finish=x.oturumTuru==='İki Oturum'?(x.sayisalBitis||x.bitisSaati||'—'):(x.bitisSaati||'—'),classes=x.sinflar||x.siniflar||'—',totalPct=Math.round(st.progress),segmentPct=Math.round(st.segmentProgress);return`<button type="button" class="kh-trial-live__card" data-dash-route="academic" data-dash-page="trial" data-dash-title="Deneme Sınavları" data-dash-trial-open="${esc(x.id)}"><span class="kh-trial-live__head"><span class="kh-trial-live__badge"><i></i> AKTİF DENEME SINAVI</span><span class="kh-trial-live__detail">Detaylar ›</span></span><span class="kh-trial-live__title">${esc(x.ad||x.baslik||'Deneme sınavı')}</span><span class="kh-trial-live__session" data-dash-trial-label="${esc(x.id)}">${esc(st.label)}</span><span class="kh-trial-live__timers">${st.multiSession?`<span class="kh-trial-live__timer is-session"><span class="kh-trial-live__timer-head"><span><small>MEVCUT OTURUM</small><b data-dash-trial-session-name="${esc(x.id)}">${esc(st.label)}</b></span><strong data-dash-trial-session-timer="${esc(x.id)}">${esc(trialFmt(st.segmentRemaining))}</strong></span><span class="kh-trial-live__bar" role="progressbar" aria-label="Mevcut oturum ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${segmentPct}"><i data-dash-trial-session-progress="${esc(x.id)}" style="width:${segmentPct}%"></i></span></span>`:''}<span class="kh-trial-live__timer is-total"><span class="kh-trial-live__timer-head"><span><small>TÜM SINAV</small><b>Kalan toplam süre</b></span><strong data-dash-trial-timer="${esc(x.id)}">${esc(trialFmt(st.remaining))}</strong></span><span class="kh-trial-live__bar" role="progressbar" aria-label="Tüm sınav ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${totalPct}"><i data-dash-trial-progress="${esc(x.id)}" style="width:${totalPct}%"></i></span></span></span><span class="kh-trial-live__meta"><span><small>◷ BİTİŞ</small><b>${esc(finish)}</b></span><span><small>▣ TARİH</small><b>${esc(date(x.tarih))}</b></span><span><small>👥 SINIFLAR</small><b>${esc(classes)}</b></span></span></button>`}).join('')}</section>`}
'''
s = between(s, 'function trialCounterSection()', 'function refreshTrialTimers', trial_card, 'dashboard trial card')

trial_refresh = '''function refreshTrialTimers(root=document){const live=trialLiveRows().slice(0,1),nodes=[...root.querySelectorAll?.('[data-dash-trial-timer]')||[]],wanted=live.map(x=>String(x.exam.id)).join('|'),shown=nodes.map(x=>String(x.dataset.dashTrialTimer||'')).join('|');if(wanted!==shown){if(mounted)queueRender();return}nodes.forEach(el=>{const item=live.find(x=>String(x.exam.id)===String(el.dataset.dashTrialTimer));if(item)el.textContent=trialFmt(item.state.remaining)});root.querySelectorAll?.('[data-dash-trial-session-timer]').forEach(el=>{const item=live.find(x=>String(x.exam.id)===String(el.dataset.dashTrialSessionTimer));if(item)el.textContent=trialFmt(item.state.segmentRemaining)});root.querySelectorAll?.('[data-dash-trial-label],[data-dash-trial-session-name]').forEach(el=>{const id=el.dataset.dashTrialLabel||el.dataset.dashTrialSessionName,item=live.find(x=>String(x.exam.id)===String(id));if(item)el.textContent=item.state.label});root.querySelectorAll?.('[data-dash-trial-progress]').forEach(el=>{const item=live.find(x=>String(x.exam.id)===String(el.dataset.dashTrialProgress));if(item){const pct=Math.round(item.state.progress);el.style.width=`${pct}%`;el.parentElement?.setAttribute('aria-valuenow',String(pct))}});root.querySelectorAll?.('[data-dash-trial-session-progress]').forEach(el=>{const item=live.find(x=>String(x.exam.id)===String(el.dataset.dashTrialSessionProgress));if(item){const pct=Math.round(item.state.segmentProgress);el.style.width=`${pct}%`;el.parentElement?.setAttribute('aria-valuenow',String(pct))}})}

'''
s = between(s, 'function refreshTrialTimers(root=document)', 'function schoolClassLevel', trial_refresh, 'dashboard trial refresh')
write(p, s)


# ------------------------------------------------------------------
# Shell: every mounted canonical module is a single visual owner.
# ------------------------------------------------------------------
p = 'js/core/shell-ui.js'
s = read(p)
s = exact(
    s,
    "function academicRouteMounted(){const root=$('#v2ModuleRoot');return !!(global.AcademicModule&&root?.querySelector?.('[data-academic-module]'))}",
    "const MODULE_ROOT_SELECTORS=Object.freeze({dashboard:'[data-dashboard-module]',people:'[data-people-module]',academic:'[data-academic-module]',management:'[data-management-module]',communication:'[data-communication-module]',transport:'[data-transport-module]',documents:'[data-documents-module]',tools:'[data-tools-module]',settings:'[data-settings-module]'});\nfunction moduleRouteMounted(name){const root=$('#v2ModuleRoot'),selector=MODULE_ROOT_SELECTORS[name];return !!(selector&&global.AppLoader?.moduleApi?.(name)&&root?.querySelector?.(selector))}",
    'shell canonical module root'
)
s = exact(
    s,
    "  setBottomActive(bottom);const reuseAcademic=name==='academic'&&academicRouteMounted();global.AppLoader?.setActiveModule?.(name);\n  setTitle(title||meta.label||name);if(!reuseAcademic)await global.AppLoader?.load?.(name);",
    "  setBottomActive(bottom);const reuseModule=moduleRouteMounted(name);global.AppLoader?.setActiveModule?.(name);\n  setTitle(title||meta.label||name);if(!reuseModule)await global.AppLoader?.load?.(name);",
    'shell same-module reuse'
)
write(p, s)


# ------------------------------------------------------------------
# Loader: a lazy dependency may load code, but only active route mounts UI.
# ------------------------------------------------------------------
p = 'js/app-loader.js'
s = read(p)
loader = """async function load(name){if(!registry.has(name))throw new Error('module-not-defined:'+name);if(moduleMeta(name).visible===false||moduleLevel(name)==='hidden'){const e=new Error('module-forbidden:'+name);e.code='permission-hidden';throw e}await loadMany(registry.get(name));if(name==='academic'||name==='communication'||name==='documents')window.firebaseStorageHazirla?.();const active=AppStore?.get?.('ui.route')===name;if(active){window.dispatchEvent(new CustomEvent('koruk:module-ready',{detail:{name,permissionLevel:moduleLevel(name)}}));requestAnimationFrame(()=>{if(AppStore?.get?.('ui.route')===name)permissionApplyModule(name)})}return name}
"""
s = between(s, 'async function load(name)', 'function applyTheme', loader, 'loader active route ownership')
write(p, s)


# ------------------------------------------------------------------
# Single canonical CSS: green/gold trial bars + compositor ticker.
# ------------------------------------------------------------------
p = 'css/design-system.css'
c = read(p)
c = exact(
    c,
    '.ka-home .kh-news-track{display:flex;align-items:center;gap:0;width:max-content;animation:none;will-change:transform;transform:translate3d(0,0,0);backface-visibility:hidden;contain:layout paint}.ka-home .kh-news.is-ready .kh-news-track{animation:khTicker var(--kh-ticker-time,28s) linear infinite}',
    '.ka-home .kh-news-track{display:flex;align-items:center;gap:0;width:max-content;animation:none;will-change:transform;transform:translate3d(0,0,0);backface-visibility:hidden;contain:paint}.ka-home .kh-news.is-ready .kh-news-track{animation:khTicker var(--kh-ticker-time,28s) linear infinite}',
    'ticker compositor track'
)
c = exact(c, '@keyframes khTicker{from{transform:translate3d(0,0,0)}to{transform:translate3d(var(--kh-news-distance,-50%),0,0)}}', '@keyframes khTicker{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}', 'ticker fixed loop distance')

home_css = '''.kh-trial-live{width:100%;min-width:0}.kh-trial-live__card{width:100%;display:block;padding:16px;border:1px solid color-mix(in srgb,var(--ka-primary) 32%,var(--ka-border));border-radius:22px;background:radial-gradient(circle at 88% 12%,color-mix(in srgb,var(--ka-warning) 10%,transparent),transparent 34%),linear-gradient(145deg,color-mix(in srgb,var(--ka-primary) 8%,var(--ka-card-bg)),var(--ka-card-bg));color:var(--ka-text);box-shadow:var(--ka-shadow-md);text-align:left;cursor:pointer}.kh-trial-live__head{display:flex;align-items:center;justify-content:space-between;gap:10px}.kh-trial-live__badge{display:inline-flex;align-items:center;gap:7px;color:var(--ka-primary);font-size:10px;font-weight:900;letter-spacing:.07em}.kh-trial-live__badge i{width:7px;height:7px;border-radius:50%;background:var(--ka-success);box-shadow:0 0 0 5px color-mix(in srgb,var(--ka-success) 12%,transparent)}.kh-trial-live__detail{color:var(--ka-primary);font-size:11px;font-weight:850}.kh-trial-live__title{display:block;margin-top:10px;font-size:20px;font-weight:900;line-height:1.2}.kh-trial-live__session{display:block;margin-top:4px;color:var(--ka-text-muted);font-size:12px;font-weight:750}.kh-trial-live__timers{display:grid;gap:10px;margin-top:14px}.kh-trial-live__timer{display:block;padding:12px;border:1px solid var(--ka-border);border-radius:15px;background:color-mix(in srgb,var(--ka-muted-bg) 82%,transparent)}.kh-trial-live__timer.is-session{border-color:color-mix(in srgb,var(--ka-warning) 34%,var(--ka-border));background:color-mix(in srgb,var(--ka-warning) 7%,var(--ka-card-bg))}.kh-trial-live__timer.is-total{border-color:color-mix(in srgb,var(--ka-primary) 32%,var(--ka-border));background:color-mix(in srgb,var(--ka-primary) 7%,var(--ka-card-bg))}.kh-trial-live__timer-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.kh-trial-live__timer-head>span{display:grid;gap:2px;min-width:0}.kh-trial-live__timer-head small{color:var(--ka-text-muted);font-size:8px;font-weight:900;letter-spacing:.08em}.kh-trial-live__timer-head b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kh-trial-live__timer-head strong{flex:0 0 auto;font-family:var(--ka-font-mono);font-size:20px;letter-spacing:.025em}.kh-trial-live__timer.is-session .kh-trial-live__timer-head strong{color:var(--ka-warning)}.kh-trial-live__timer.is-total .kh-trial-live__timer-head strong{color:var(--ka-primary)}.kh-trial-live__bar{display:block;width:100%;height:8px;margin-top:9px;border-radius:var(--ka-radius-pill);overflow:hidden;background:color-mix(in srgb,var(--ka-border) 82%,transparent)}.kh-trial-live__bar i{display:block;height:100%;border-radius:inherit;transition:width .35s linear;will-change:width}.kh-trial-live__timer.is-session .kh-trial-live__bar i{background:linear-gradient(90deg,color-mix(in srgb,var(--ka-warning) 78%,#fff),var(--ka-warning))}.kh-trial-live__timer.is-total .kh-trial-live__bar i{background:linear-gradient(90deg,color-mix(in srgb,var(--ka-primary) 72%,#fff),var(--ka-primary))}.kh-trial-live__meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.kh-trial-live__meta>span{display:grid;gap:2px;padding:9px 10px;border:1px solid var(--ka-border);border-radius:13px;background:color-mix(in srgb,var(--ka-muted-bg) 82%,transparent);min-width:0}.kh-trial-live__meta small{color:var(--ka-text-muted);font-size:8px;font-weight:850;letter-spacing:.05em}.kh-trial-live__meta b{font-size:12px;overflow-wrap:anywhere}
'''
c = between(c, '.kh-trial-live{', '.ka-trial-add', home_css, 'home trial css block')
c = exact(
    c,
    '[data-theme="dark"] .kh-trial-live__card{background:radial-gradient(circle at 86% 10%,color-mix(in srgb,var(--ka-primary) 13%,transparent),transparent 35%),linear-gradient(145deg,color-mix(in srgb,var(--ka-module-transport-1) 16%,var(--ka-card-bg)),color-mix(in srgb,var(--ka-module-exams-2) 11%,var(--ka-card-bg)));box-shadow:0 16px 34px rgba(0,0,0,.32)}',
    '[data-theme="dark"] .kh-trial-live__card{background:radial-gradient(circle at 86% 10%,color-mix(in srgb,var(--ka-warning) 8%,transparent),transparent 35%),linear-gradient(145deg,color-mix(in srgb,var(--ka-primary) 12%,var(--ka-card-bg)),var(--ka-card-bg));box-shadow:0 16px 34px rgba(0,0,0,.32)}',
    'home trial dark colors'
)
c = exact(
    c,
    '.kh-trial-live__card{padding:14px}.kh-trial-live__title{font-size:18px}.kh-trial-live__body{grid-template-columns:145px minmax(0,1fr);gap:11px}.kh-trial-live__ring{width:142px}.kh-trial-live__ring strong{font-size:17px}.kh-trial-live__meta>span{padding:8px}',
    '.kh-trial-live__card{padding:14px}.kh-trial-live__title{font-size:18px}.kh-trial-live__timer-head strong{font-size:18px}.kh-trial-live__meta>span{padding:8px}',
    'home trial mobile 640'
)
c = exact(
    c,
    '.kh-trial-live__body{grid-template-columns:1fr}.kh-trial-live__ring{width:165px;margin:0 auto}.kh-trial-live__meta{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}',
    '.kh-trial-live__timer-head{align-items:flex-start}.kh-trial-live__timer-head strong{font-size:16px}.kh-trial-live__meta{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}',
    'home trial mobile 390'
)
write(p, c)


# ------------------------------------------------------------------
# PWA cache version.
# ------------------------------------------------------------------
p = 'service-worker.js'
w = read(p)
w = exact(w, "const CACHE_ADI='oy-cache-v832';", "const CACHE_ADI='oy-cache-v833';", 'service worker cache version')
write(p, w)


# ------------------------------------------------------------------
# Regression contracts.
# ------------------------------------------------------------------
p = 'tests/trial-auto-timer.test.js'
t = read(p)
t = exact(
    t,
    "for(const token of ['.kh-trial-live__card','.kh-trial-live__ring','.ka-trial-counter__overview','[data-theme=\"dark\"] .kh-trial-live__card'])assert(css.includes(token),`Açık/koyu deneme tasarım sözleşmesi eksik: ${token}`);",
    "for(const token of ['.kh-trial-live__card','.kh-trial-live__timers','.kh-trial-live__bar','.ka-trial-counter__overview','[data-theme=\"dark\"] .kh-trial-live__card'])assert(css.includes(token),`Açık/koyu deneme tasarım sözleşmesi eksik: ${token}`);\nassert(dash.includes('segmentRemaining')&&dash.includes('segmentProgress')&&dash.includes('data-dash-trial-session-timer')&&dash.includes('data-dash-trial-session-progress'),'Çoklu oturumda mevcut oturum ve toplam sınav sayaçları ayrı ilerleme barlarıyla güncellenmeli.');\nassert(!dash.includes('kh-trial-live__ring'),'Ana sayfa deneme kartında dairesel sayaç geri dönmemeli.');",
    'trial regression test'
)
write(p, t)

p = 'tests/dashboard-card-routes-smoke.test.js'
t = read(p)
t = exact(
    t,
    "assert(dash.includes('function stabilizeNewsTicker')&&dash.includes(\"news.classList.add('is-ready')\")&&dash.includes('document.fonts?.ready')&&css.includes('.kh-news.is-ready .kh-news-track')&&!css.includes('.kh-news-track{display:flex;align-items:center;gap:0;width:max-content;animation:khTicker'),'Kayan haberler font/layout ölçülmeden animasyona başlamamalı; ölçülmüş tam loop mesafesiyle kesintisiz akmalı.');",
    "assert(dash.includes(\"function stabilizeNewsTicker(root=document){root.querySelector?.('.kh-news')?.classList.add('is-ready')}\")&&!dash.includes('document.fonts?.ready')&&!dash.includes('getBoundingClientRect().width')&&css.includes('to{transform:translate3d(-50%,0,0)}'),'Kayan haberler layout/font ölçümüyle animasyonu yeniden başlatmadan iki eş loop arasında saf CSS ile kesintisiz akmalı.');\nassert(dash.includes('data-dash-trial-session-timer')&&dash.includes('data-dash-trial-progress')&&css.includes('.kh-trial-live__bar')&&!dash.includes('kh-trial-live__ring'),'Ana sayfa aktif deneme kartı dairesel sayaç yerine mevcut oturum + toplam sınav ilerleme barlarını kullanmalı.');",
    'dashboard ticker regression test'
)
write(p, t)

p = 'tests/classic-shell-v2-smoke.test.js'
t = read(p)
t = exact(
    t,
    "assert(ui.includes(\"const reuseAcademic=name==='academic'&&academicRouteMounted()\")&&ui.includes('if(!reuseAcademic)await global.AppLoader?.load?.(name)'),'Aynı Academic modülü Yazılı/Deneme geçişinde yeniden mount edilmemeli.');",
    "assert(ui.includes('const MODULE_ROOT_SELECTORS=Object.freeze')&&ui.includes('function moduleRouteMounted(name)')&&ui.includes('const reuseModule=moduleRouteMounted(name)')&&ui.includes('if(!reuseModule)await global.AppLoader?.load?.(name)'),'Aynı canonical modülün alt sayfaları arasında geçişte hiçbir modül yeniden mount edilmemeli.');",
    'shell module reuse regression test'
)
write(p, t)

p = 'tests/module-bundles-smoke.test.js'
t = read(p)
anchor = "assert(loader.includes('prepareAccountLocalData'),'Hesap/kota verisi başlangıçta cihaz cache ine alınmalı.');\n"
if anchor not in t:
    raise SystemExit('loader regression anchor missing')
t = t.replace(anchor, anchor + "assert(loader.includes(\"const active=AppStore?.get?.('ui.route')===name\")&&loader.includes(\"if(active){window.dispatchEvent(new CustomEvent('koruk:module-ready'\"),'Lazy yüklenen bağımlılık aktif rota değilse UI mount eventi üretmemeli; eski async yükleme yeni sayfanın üstüne binmemeli.');\n", 1)
write(p, t)

print('dashboard motion stability transform complete')
