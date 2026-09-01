from pathlib import Path

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

def replace_function(text,name,next_name,replacement):
    start=text.find(f'function {name}(')
    if start<0:
        raise SystemExit(f'Function not found: {name}')
    end=text.find(f'\nfunction {next_name}(',start)
    if end<0:
        raise SystemExit(f'Next function not found after {name}: {next_name}')
    return text[:start]+replacement.rstrip()+text[end:]

academic_path=Path('js/modules/academic.js')
academic=read(academic_path)

academic=replace_function(academic,'closeTrialCounter','trialCounterScheduleHtml',r'''function closeTrialCounter(){trialCounterId='';document.getElementById('kaTrialCounterOverlay')?.remove();document.body.classList.remove('ka-trial-counter-open');if(mounted&&active==='trial')requestAnimationFrame(render)}''')

academic=replace_function(academic,'trialCounterScheduleHtml','trialCounterFollowHtml',r'''function trialCounterScheduleHtml(d,state){
const schedule=trialSchedule(d);return`<section class="ka-trial-counter__section" data-trial-counter-schedule><div class="ka-trial-counter__section-title">OTURUM TAKVİMİ</div><div class="ka-trial-counter__schedule">${schedule.map((x,i)=>{const current=state.running&&i===state.segmentIndex,done=state.status==='done'||(state.running&&i<state.segmentIndex);return`<div class="ka-trial-counter__row ${current?'is-current':''}"><span class="ka-trial-counter__num">${i+1}</span><div><b>${esc(x.name)}</b><small>${esc(x.start)}–${esc(x.end)} · ${esc(trialMinutesText(x.minutes))}</small></div><span class="ka-trial-counter__tag">${current?'AKTİF':done?'BİTTİ':'SIRADA'}</span></div>`}).join('')}</div></section>`;
}''')

academic=replace_function(academic,'trialCounterFollowHtml','trialCounterMainHtml',r'''function trialCounterFollowHtml(d){
const schedule=trialSchedule(d),first=schedule[0]||{},last=schedule[schedule.length-1]||{};return`<section class="ka-trial-counter__section" data-trial-counter-follow><div class="ka-trial-counter__section-title">SINAVI TAKİP ET</div><div class="ka-trial-counter__follow"><div><span>📋</span><small>Toplam Süre</small><b>${esc(trialMinutesText(totalMin(d)))}</b></div><div><span>▶️</span><small>Başlangıç</small><b>${esc(first.start||'—')}</b></div><div><span>🏁</span><small>Bitiş</small><b>${esc(last.end||'—')}</b></div></div></section>`;
}''')

academic=replace_function(academic,'trialCounterMainHtml','trialCounterOverviewHtml',r'''function trialCounterMainHtml(d,state){
if(state.status==='invalid'||state.status==='ready')return`<section class="ka-trial-counter__main" data-trial-counter-main><div class="ka-trial-counter__ready"><span>⚠️</span><h3>Sayaç bilgisi eksik</h3><p>Tarih, başlangıç saati ve sınav süresi bilgilerini kontrol edin.</p></div></section>`;
if(state.status==='scheduled')return`<section class="ka-trial-counter__main" data-trial-counter-main><div class="ka-trial-counter__ready is-scheduled"><span>⏳</span><h3>Sınava ${esc(fmtSec(state.secondsUntilStart))} kaldı</h3><p>Sayaç ${esc(trialSchedule(d)[0]?.start||'—')} saatinde otomatik başlayacak.</p></div></section>`;
if(state.status==='done')return`<section class="ka-trial-counter__main" data-trial-counter-main><div class="ka-trial-counter__ready is-done"><span>✓</span><h3>Sınav tamamlandı</h3><p>Toplam süre: ${esc(trialMinutesText(totalMin(d)))}</p></div></section>`;
const schedule=trialSchedule(d),seg=schedule[state.segmentIndex]||schedule[0]||{},segmentTotal=Math.max(1,(Number(seg.minutes)||0)*60),segmentRemaining=Math.max(0,state.segmentRemaining),segmentProgress=Math.max(0,Math.min(100,100-segmentRemaining/segmentTotal*100)),last=schedule[schedule.length-1]||{},classes=d.sinflar||d.siniflar||'—';
return`<section class="ka-trial-counter__main" data-trial-counter-main><div class="ka-trial-counter__session"><i></i><span>AKTİF OTURUM</span><b>${esc(String(state.label||'Sınav').toLocaleUpperCase('tr'))}</b></div><div class="ka-trial-counter__focus"><div class="ka-trial-counter__ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="52" pathLength="100"></circle><circle class="value" cx="60" cy="60" r="52" pathLength="100" stroke-dasharray="${Math.round(segmentProgress)} 100"></circle></svg><div><small>KALAN SÜRE</small><strong>${esc(fmtSec(segmentRemaining))}</strong><span>SAAT · DAKİKA · SANİYE</span></div></div><div class="ka-trial-counter__meta"><div><span>◷</span><small>BİTİŞ SAATİ</small><b>${esc(seg.end||last.end||'—')}</b></div><div><span>▣</span><small>BUGÜN</small><b>${esc(date(d.tarih))}</b></div><div><span>👥</span><small>SINIFLAR</small><b>${esc(classes)}</b></div></div></div></section>`;
}''')

academic=replace_function(academic,'trialCounterOverviewHtml','renderTrialCounter',r'''function trialCounterOverviewHtml(d,state){
const schedule=trialSchedule(d),seg=schedule[state.segmentIndex]||schedule[0]||{},last=schedule[schedule.length-1]||{};
if(state.status==='done')return`<div class="ka-trial-counter__overview is-done" data-trial-counter-overview><div><small>SINAV DURUMU</small><strong>Tamamlandı</strong></div><div><small>BİTİŞ</small><strong>${esc(last.end||'—')}</strong></div></div>`;
if(state.status==='scheduled')return`<div class="ka-trial-counter__overview is-scheduled" data-trial-counter-overview><div><small>BAŞLAMASINA</small><strong>${esc(fmtSec(state.secondsUntilStart))}</strong></div><div><small>BAŞLANGIÇ</small><strong>${esc(schedule[0]?.start||'—')}</strong></div></div>`;
if(!state.running)return'<div data-trial-counter-overview hidden></div>';
const overall=Math.round(state.progress);return`<div class="ka-trial-counter__overview" data-trial-counter-overview><div><small>${esc(String(seg.name||'Oturum').toLocaleUpperCase('tr'))}</small><strong>${esc(fmtSec(state.segmentRemaining))}</strong><span>Kalan süre</span></div><div><small>TOPLAM SINAV</small><strong class="is-total">${esc(fmtSec(state.remaining))}</strong><span>Kalan süre</span></div><div class="ka-trial-counter__mini"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="track" cx="24" cy="24" r="19" pathLength="100"></circle><circle class="value" cx="24" cy="24" r="19" pathLength="100" stroke-dasharray="${overall} 100"></circle></svg><b>%${overall}</b></div></div>`;
}''')

academic=replace_function(academic,'renderTrialCounter','openTrialCounter',r'''function replaceTrialCounterNode(ov,selector,html){const current=ov.querySelector(selector);if(!current)return false;current.outerHTML=html;return true}
function renderTrialCounter(forceStructure=false){
const ov=document.getElementById('kaTrialCounterOverlay');if(!ov||!trialCounterId)return;const d=arr('denemeSinavlari').find(x=>x.id===trialCounterId);if(!d){closeTrialCounter();return}const state=trialCounterState(d),status=state.status==='done'?'✓ Sınav tamamlandı':state.status==='scheduled'?'◷ Başlamayı bekliyor':state.running?'● Sınav devam ediyor':'Sayaç hazır',mainHtml=trialCounterMainHtml(d,state),scheduleHtml=trialCounterScheduleHtml(d,state),overviewHtml=trialCounterOverviewHtml(d,state);const hasStructure=ov.dataset.counterId===trialCounterId&&!!ov.querySelector('[data-trial-counter-scroll]');
if(forceStructure||!hasStructure){ov.dataset.counterId=trialCounterId;ov.innerHTML=`<div class="ka-trial-counter__top"><button class="ka-icon-button" type="button" data-trial-counter-close aria-label="Geri">←</button><div><strong data-trial-counter-title>${esc(d.ad||'Deneme Sınavı')}</strong><span class="ka-trial-counter__state ${state.running?'is-live':''}" data-trial-counter-state>${esc(status)}</span></div></div><div class="ka-trial-counter__scroll" data-trial-counter-scroll><div class="ka-trial-counter__shell">${mainHtml}${scheduleHtml}${trialCounterFollowHtml(d)}</div></div>${overviewHtml}`;ov.querySelector('[data-trial-counter-close]')?.addEventListener('click',closeTrialCounter);return}
const title=ov.querySelector('[data-trial-counter-title]'),stateEl=ov.querySelector('[data-trial-counter-state]');if(title)title.textContent=d.ad||'Deneme Sınavı';if(stateEl){stateEl.textContent=status;stateEl.classList.toggle('is-live',state.running)}const mainOk=replaceTrialCounterNode(ov,'[data-trial-counter-main]',mainHtml),scheduleOk=replaceTrialCounterNode(ov,'[data-trial-counter-schedule]',scheduleHtml),overviewOk=replaceTrialCounterNode(ov,'[data-trial-counter-overview]',overviewHtml);if(!mainOk||!scheduleOk||!overviewOk)renderTrialCounter(true);
}''')

# Force a fresh structure only when opening; subsequent one-second ticks preserve the scroll container.
old_open="function openTrialCounter(id){const d=arr('denemeSinavlari').find(x=>x.id===id);if(!d)return;trialCounterId=id;let ov=document.getElementById('kaTrialCounterOverlay');if(!ov){ov=document.createElement('section');ov.id='kaTrialCounterOverlay';ov.className='ka-trial-counter';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');document.body.appendChild(ov)}document.body.classList.add('ka-trial-counter-open');renderTrialCounter()}"
new_open="function openTrialCounter(id){const d=arr('denemeSinavlari').find(x=>x.id===id);if(!d)return;trialCounterId=id;let ov=document.getElementById('kaTrialCounterOverlay');if(!ov){ov=document.createElement('section');ov.id='kaTrialCounterOverlay';ov.className='ka-trial-counter';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');document.body.appendChild(ov)}document.body.classList.add('ka-trial-counter-open');renderTrialCounter(true)}"
if old_open not in academic:
    raise SystemExit('openTrialCounter source contract not found')
academic=academic.replace(old_open,new_open,1)

old_tick="timer=setInterval(()=>{if(!mounted||active!=='trial')return;const needsTick=arr('denemeSinavlari').some(x=>{const s=trialCounterState(x);return s.running||(s.status==='scheduled'&&s.secondsUntilStart<=60)});if(needsTick)render();if(trialCounterId)renderTrialCounter()},1000)"
new_tick="timer=setInterval(()=>{if(!mounted||active!=='trial')return;const needsTick=arr('denemeSinavlari').some(x=>{const s=trialCounterState(x);return s.running||(s.status==='scheduled'&&s.secondsUntilStart<=60)});if(trialCounterId){renderTrialCounter();return}if(needsTick)render()},1000)"
if old_tick not in academic:
    raise SystemExit('Academic trial interval contract not found')
academic=academic.replace(old_tick,new_tick,1)

# Static guards: never solve this by storing/restoring scrollTop; keep the scroll node alive instead.
render_start=academic.index('function renderTrialCounter(')
render_end=academic.index('\nfunction openTrialCounter(',render_start)
render_block=academic[render_start:render_end]
if render_block.count('ov.innerHTML=')!=1:
    raise SystemExit('renderTrialCounter must contain exactly one structural innerHTML assignment')
if 'scrollTop' in render_block:
    raise SystemExit('scrollTop preservation patch is forbidden; stable DOM ownership is required')
for token in ['data-trial-counter-scroll','replaceTrialCounterNode','forceStructure||!hasStructure','data-trial-counter-main','data-trial-counter-schedule','data-trial-counter-overview']:
    if token not in academic:
        raise SystemExit(f'Missing trial counter stability token: {token}')
write(academic_path,academic)

# Runtime cache-bust so the Android/PWA client cannot keep the old counter renderer.
for path in [Path('index.html'),Path('js/app-loader.js'),Path('service-worker.js')]:
    text=read(path)
    text=text.replace('v=837','v=838').replace('oy-cache-v837','oy-cache-v838')
    write(path,text)
for path in Path('tests').glob('*.test.js'):
    text=read(path)
    newer=text.replace('v=837','v=838').replace('oy-cache-v837','oy-cache-v838')
    if newer!=text:
        write(path,newer)

# Focused regression contract for the exact scroll-reset bug.
test=Path('tests/trial-counter-scroll-stability.test.js')
test.write_text(r'''const fs=require('fs');
const assert=require('assert');
const academic=fs.readFileSync('js/modules/academic.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const start=academic.indexOf('function renderTrialCounter(');
const end=academic.indexOf('\nfunction openTrialCounter(',start);
assert(start>=0&&end>start,'renderTrialCounter bulunamadı.');
const renderBlock=academic.slice(start,end);
assert(renderBlock.includes("data-trial-counter-scroll"),'Sayaç görünümü kalıcı scroll owner üretmeli.');
assert(renderBlock.includes('replaceTrialCounterNode'),'Saniyelik tikler tüm overlay yerine dinamik sayaç parçalarını güncellemeli.');
assert(renderBlock.includes('forceStructure||!hasStructure'),'Tam overlay yalnız ilk açılışta veya bozuk yapı kurtarmasında kurulmalı.');
assert.strictEqual((renderBlock.match(/ov\.innerHTML=/g)||[]).length,1,'Sayaç renderer yalnız tek yapısal innerHTML yolu içermeli.');
assert(!renderBlock.includes('scrollTop'),'Scroll sorunu scrollTop kaydet/geri yükle yamasıyla çözülmemeli.');
for(const token of ['data-trial-counter-main','data-trial-counter-schedule','data-trial-counter-overview'])assert(academic.includes(token),`Dinamik sayaç slotu eksik: ${token}`);
assert(academic.includes("if(trialCounterId){renderTrialCounter();return}if(needsTick)render()"),'Overlay açıkken alttaki Academic liste her saniye yeniden render edilmemeli.');
assert(academic.includes('renderTrialCounter(true)'),'Sayaç ilk açılışta yapısal render istemeli.');
assert(index.includes('css/design-system.css?v=838')&&index.includes('js/app-loader.js?v=838'),'Üretim shell v838 cache-bust kullanmalı.');
assert(loader.includes('js/modules/academic.js?v=838'),'Academic loader v838 kullanmalı.');
assert(sw.includes("const CACHE_ADI='oy-cache-v838'"),'Service Worker v838 cache kullanmalı.');
console.log('Deneme sayacı scroll konumu kalıcı DOM owner ile stabil.');
''',encoding='utf-8')

print('Trial counter stable-scroll patch applied.')
