from pathlib import Path

root=Path('.')

# 1) Shared behavior belongs to the JS core; styling stays in the single design-system CSS.
core=root/'js/core/core.js'
text=core.read_text(encoding='utf-8')
start=text.index('/* Android WebView pull-to-refresh yalnız gerçek sayfa tepesinde çalışır.')
end=text.index('/* ========================= EVENT BUS ========================= */', start)
new_block=r'''/* APK / PWA / mobil web için TEK pull-to-refresh davranışı.
   Browser/native varsayılan yenilemeleri CSS ile bastırılır; yalnız gerçek belge
   tepesinde, iç kaydırma alanı dışında ve bilinçli aşağı çekme eşiğinde yenilenir. */
(function installUnifiedPullToRefresh(){
  if(window.__kaUnifiedPullRefresh)return;window.__kaUnifiedPullRefresh=true;
  const BLOCK_SELECTOR='.ka-app-nav.ka-bottom-nav,.ka-menu-layer,.ka-modal-backdrop,.dv3,[role="dialog"],[data-ka-no-pull-refresh]';
  const ARM_DISTANCE=96,MAX_VISUAL=78,DEAD_ZONE=8;
  let tracking=false,armed=false,startX=0,startY=0,indicator=null,reloading=false;
  const docTop=()=>Math.max(0,Number(window.scrollY||document.scrollingElement?.scrollTop||0));
  function scrollableAncestor(target){
    for(let el=target instanceof Element?target:null;el&&el!==document.body&&el!==document.documentElement;el=el.parentElement){
      const style=getComputedStyle(el),oy=style.overflowY;
      if((oy==='auto'||oy==='scroll'||oy==='overlay')&&el.scrollHeight>el.clientHeight+2)return el;
    }
    return null;
  }
  function blocked(target){return !!(document.body.classList.contains('ka-layer-open')||target?.closest?.(BLOCK_SELECTOR)||scrollableAncestor(target))}
  function ensureIndicator(){
    if(indicator?.isConnected)return indicator;
    indicator=document.createElement('div');indicator.id='kaPullRefreshIndicator';indicator.hidden=true;indicator.setAttribute('aria-hidden','true');indicator.innerHTML='<img src="assets/icon-192.png" alt=""><span>Yenilemek için çek</span>';document.body.appendChild(indicator);return indicator;
  }
  function draw(raw){
    const el=ensureIndicator(),visual=Math.min(MAX_VISUAL,Math.max(0,raw)*.48);armed=raw>=ARM_DISTANCE;el.hidden=visual<2;el.classList.toggle('is-armed',armed);el.classList.remove('is-refreshing');el.style.setProperty('--ka-pull-y',`${Math.round(visual)}px`);const label=el.querySelector('span');if(label)label.textContent=armed?'Bırakınca yenile':'Yenilemek için çek';
  }
  function reset(){tracking=false;armed=false;const el=indicator;if(el&&!reloading){el.classList.remove('is-armed','is-refreshing');el.style.setProperty('--ka-pull-y','0px');el.hidden=true}}
  function begin(e){
    if(reloading||e.touches?.length!==1)return;const target=e.target instanceof Element?e.target:null;if(docTop()>1||blocked(target)){tracking=false;return}tracking=true;armed=false;startX=e.touches[0].clientX;startY=e.touches[0].clientY;
  }
  function move(e){
    if(!tracking||reloading||e.touches?.length!==1)return;const touch=e.touches[0],dx=touch.clientX-startX,dy=touch.clientY-startY;if(Math.abs(dx)>Math.abs(dy)+8){reset();return}if(dy<0||docTop()>1){reset();return}if(dy<=DEAD_ZONE)return;e.preventDefault();draw(dy);
  }
  function finish(){
    if(!tracking||reloading){if(!reloading)reset();return}const refresh=armed;tracking=false;armed=false;if(!refresh){reset();return}reloading=true;const el=ensureIndicator();el.hidden=false;el.classList.remove('is-armed');el.classList.add('is-refreshing');el.style.setProperty('--ka-pull-y','74px');const label=el.querySelector('span');if(label)label.textContent='Yenileniyor…';setTimeout(()=>window.location.reload(),120);
  }
  document.addEventListener('touchstart',begin,{capture:true,passive:true});
  document.addEventListener('touchmove',move,{capture:true,passive:false});
  document.addEventListener('touchend',finish,{capture:true,passive:true});
  document.addEventListener('touchcancel',reset,{capture:true,passive:true});
})();

'''
text=text[:start]+new_block+text[end:]
core.write_text(text,encoding='utf-8')

# 2) Keep one visual source of truth. No runtime <style> injection.
css=root/'css/design-system.css'
text=css.read_text(encoding='utf-8')
marker='/* ===== UNIFIED PULL TO REFRESH ===== */'
if marker not in text:
    text += r'''

/* ===== UNIFIED PULL TO REFRESH ===== */
#kaPullRefreshIndicator{--ka-pull-y:0px;position:fixed;z-index:1200000;left:50%;top:max(8px,env(safe-area-inset-top,0px));transform:translate(-50%,calc(var(--ka-pull-y) - 64px));min-width:118px;height:42px;padding:5px 10px 5px 5px;border:1px solid var(--ka-border,#d7e5de);border-radius:999px;background:var(--ka-card-raised-bg,#fff);color:var(--ka-text,#17352b);box-shadow:0 8px 24px rgba(7,36,27,.18);display:flex;align-items:center;gap:7px;pointer-events:none;opacity:.96;transition:transform 110ms ease,opacity 110ms ease}
#kaPullRefreshIndicator[hidden]{display:none!important}
#kaPullRefreshIndicator img{width:30px;height:30px;border-radius:50%;object-fit:cover}
#kaPullRefreshIndicator span{font-size:9px;font-weight:850;white-space:nowrap}
#kaPullRefreshIndicator.is-armed{border-color:var(--ka-primary,#17684f);color:var(--ka-primary,#17684f)}
#kaPullRefreshIndicator.is-refreshing img{animation:kaPullRefreshSpin .75s linear infinite}
@keyframes kaPullRefreshSpin{to{transform:rotate(360deg)}}
'''
css.write_text(text,encoding='utf-8')

# 3) APK native duplicate refresh stays registered for compatibility but is not activated.
main=root/'android/app/src/main/java/com/koruk/okul/MainActivity.java'
text=main.read_text(encoding='utf-8')
old='        setupPullToRefresh();'
if old not in text:
    raise SystemExit('MainActivity setupPullToRefresh call not found')
text=text.replace(old,'        // Pull-to-refresh APK/PWA/web için js/core/core.js tarafından tek merkezden yönetilir.',1)
main.write_text(text,encoding='utf-8')

# 4) Bust only assets changed by this feature.
index=root/'index.html'
text=index.read_text(encoding='utf-8')
if '<script src="js/core/core.js" defer></script>' not in text:
    raise SystemExit('index core script not found')
text=text.replace('<script src="js/core/core.js" defer></script>','<script src="js/core/core.js?v=905" defer></script>',1)
if 'css/design-system.css?v=899' not in text:
    raise SystemExit('index design-system v899 not found')
text=text.replace('css/design-system.css?v=899','css/design-system.css?v=900',1)
index.write_text(text,encoding='utf-8')

sw=root/'service-worker.js'
text=sw.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v904';" not in text:
    raise SystemExit('service worker cache v904 not found')
text=text.replace("const CACHE_ADI='oy-cache-v904';","const CACHE_ADI='oy-cache-v905';",1)
text=text.replace("'./css/design-system.css?v=899'","'./css/design-system.css?v=900'",1)
text=text.replace("'./js/firebase-init.js','./js/core/core.js',","'./js/firebase-init.js','./js/core/core.js?v=905','./js/core/core.js',",1)
sw.write_text(text,encoding='utf-8')

# 5) Regression contract for equal behavior on APK/PWA/web.
test=root/'tests/android-pull-refresh-guard.test.js'
test.write_text(r'''const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const main=fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java','utf8');
const core=fs.readFileSync('js/core/core.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('APK PWA and mobile web share one controlled pull refresh engine',()=>{
  assert.ok(core.includes('installUnifiedPullToRefresh'),'Ortak pull refresh motoru eksik.');
  for(const token of ['ARM_DISTANCE=96','scrollableAncestor','BLOCK_SELECTOR','touchstart','touchmove','passive:false','e.preventDefault()','window.location.reload()','.ka-app-nav.ka-bottom-nav']) assert.ok(core.includes(token),`Eksik ortak pull refresh koruması: ${token}`);
  assert.ok(!core.includes('installAndroidPullRefreshGuard'),'Android-only guard geri dönmemeli.');
  assert.ok(!core.includes('kaUnifiedPullRefreshStyle'),'Pull refresh CSS JS içinde enjekte edilmemeli.');
  assert.ok(!main.includes('\n        setupPullToRefresh();'),'APK native SwipeRefreshLayout artık etkinleştirilmemeli.');
  assert.ok(main.includes('Pull-to-refresh APK/PWA/web için js/core/core.js tarafından tek merkezden yönetilir.'),'Native katmanda ortak motor açıklaması bulunmalı.');
});

test('native overscroll is suppressed and indicator belongs to design system',()=>{
  assert.ok(css.includes('html,body,.ka-app-shell{overscroll-behavior-y:none}'));
  assert.ok(css.includes('.ka-app-content{overscroll-behavior-y:contain}'));
  assert.ok(css.includes('.ka-app-nav.ka-bottom-nav{overscroll-behavior:none;touch-action:manipulation}'));
  assert.ok(css.includes('/* ===== UNIFIED PULL TO REFRESH ===== */'));
  assert.ok(css.includes('#kaPullRefreshIndicator{')&&css.includes('@keyframes kaPullRefreshSpin'));
  assert.ok(index.includes('css/design-system.css?v=900'));
  assert.ok(index.includes('js/core/core.js?v=905'));
  assert.ok(sw.includes("const CACHE_ADI='oy-cache-v905'"));
  assert.ok(sw.includes("'./css/design-system.css?v=900'"));
  assert.ok(sw.includes("'./js/core/core.js?v=905'"));
});
''',encoding='utf-8')

# 6) Existing profile-photo test must accept newer shared CSS/cache revisions.
profile=root/'tests/profile-photo.test.js'
text=profile.read_text(encoding='utf-8')
old="assert(index.includes('css/design-system.css?v=899')&&index.includes('js/core/shell-ui.js?v=881'),'Yeni profil fotoğrafı UI sürümleri index tarafından zorlanmalı.');\nconst cacheVersion=Number(sw.match(/const CACHE_ADI='oy-cache-v(\\d+)'/)?.[1]||0);\nassert(cacheVersion>=904&&sw.includes(\"'./css/design-system.css?v=899'\")&&sw.includes(\"'./js/core/shell-ui.js?v=881'\"),'PWA cache profil fotoğrafı sürümünün gerisine düşmemeli.');"
new="const cssVersion=Number(index.match(/css\\/design-system\\.css\\?v=(\\d+)/)?.[1]||0);\nconst shellVersion=Number(index.match(/js\\/core\\/shell-ui\\.js\\?v=(\\d+)/)?.[1]||0);\nassert(cssVersion>=899&&shellVersion>=881,'Profil fotoğrafı UI varlıkları gerekli sürümün gerisine düşmemeli.');\nconst cacheVersion=Number(sw.match(/const CACHE_ADI='oy-cache-v(\\d+)'/)?.[1]||0);\nassert(cacheVersion>=904&&sw.includes(`'./css/design-system.css?v=${cssVersion}'`)&&sw.includes(`'./js/core/shell-ui.js?v=${shellVersion}'`),'PWA cache profil fotoğrafı sürümünün gerisine düşmemeli.');"
if old not in text:
    raise SystemExit('profile photo asset-version contract not found')
profile.write_text(text.replace(old,new,1),encoding='utf-8')

print('Unified pull-to-refresh patch applied with static design-system styling.')
