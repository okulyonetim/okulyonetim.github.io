from pathlib import Path

root=Path('.')

def replace_once(path, old, new):
    p=root/path
    text=p.read_text(encoding='utf-8')
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}: {old[:80]!r}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Android: prevent false pull-to-refresh from bottom navigation and nested scrollers.
java=Path('android/app/src/main/java/com/koruk/okul/LogoSwipeRefreshLayout.java')
text=java.read_text(encoding='utf-8')
text=text.replace(
    '    private static final int   SPRING_BACK_MS        = 220;\n    private static final float VERTICAL_DOMINANCE    = 1.28f;\n',
    '    private static final int   SPRING_BACK_MS        = 220;\n    private static final float VERTICAL_DOMINANCE    = 1.28f;\n    private static final int   BOTTOM_EXCLUSION_DP   = 104;\n'
)
text=text.replace(
    '    private final float triggerDistancePx;\n    private final float hiddenTranslationY;\n',
    '    private final float triggerDistancePx;\n    private final float hiddenTranslationY;\n    private final float bottomExclusionPx;\n'
)
text=text.replace(
    '    private boolean refreshing = false;\n    private boolean pullEnabled = true;\n',
    '    private boolean refreshing = false;\n    private boolean pullEnabled = true;\n    private boolean gestureExcluded = false;\n'
)
text=text.replace(
    '        this.touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();\n        this.triggerDistancePx = TRIGGER_DISTANCE_DP * density;\n',
    '        this.touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();\n        this.triggerDistancePx = TRIGGER_DISTANCE_DP * density;\n        this.bottomExclusionPx = BOTTOM_EXCLUSION_DP * density;\n'
)
text=text.replace(
    '        if (!enabled && dragging) {\n            dragging = false;\n            springBackTo(0);\n        }\n',
    '        if (!enabled && dragging) {\n            dragging = false;\n            springBackTo(0);\n        }\n        if (!enabled) gestureExcluded = false;\n'
)
text=text.replace(
    '            case MotionEvent.ACTION_DOWN:\n                downX = ev.getX();\n                downY = ev.getY();\n                dragging = false;\n                return false;\n            case MotionEvent.ACTION_MOVE: {\n                if (canChildScrollUp()) return false;\n',
    '            case MotionEvent.ACTION_DOWN:\n                downX = ev.getX();\n                downY = ev.getY();\n                dragging = false;\n                gestureExcluded = getHeight() > 0 && ev.getY() >= getHeight() - bottomExclusionPx;\n                return false;\n            case MotionEvent.ACTION_MOVE: {\n                if (gestureExcluded || canChildScrollUp()) return false;\n'
)
text=text.replace(
    '            default:\n                return false;\n        }\n    }\n\n    @Override\n    public boolean onTouchEvent(MotionEvent ev) {\n        if (!pullEnabled || refreshing) return false;\n',
    '            case MotionEvent.ACTION_UP:\n            case MotionEvent.ACTION_CANCEL:\n                gestureExcluded = false;\n                return false;\n            default:\n                return false;\n        }\n    }\n\n    @Override\n    public boolean onTouchEvent(MotionEvent ev) {\n        if (!pullEnabled || refreshing || gestureExcluded) return false;\n'
)
text=text.replace(
    '            case MotionEvent.ACTION_MOVE: {\n                if (!dragging) return false;\n                float dy = ev.getY() - downY;\n',
    '            case MotionEvent.ACTION_MOVE: {\n                if (!dragging) return false;\n                if (canChildScrollUp()) {\n                    dragging = false;\n                    springBackTo(0);\n                    return false;\n                }\n                float dy = ev.getY() - downY;\n'
)
text=text.replace(
    '            case MotionEvent.ACTION_UP:\n            case MotionEvent.ACTION_CANCEL: {\n                if (!dragging) return false;\n                dragging = false;\n',
    '            case MotionEvent.ACTION_UP:\n            case MotionEvent.ACTION_CANCEL: {\n                gestureExcluded = false;\n                if (!dragging) return false;\n                dragging = false;\n'
)
for token in ['BOTTOM_EXCLUSION_DP','bottomExclusionPx','gestureExcluded = getHeight() > 0','if (gestureExcluded || canChildScrollUp())','if (canChildScrollUp()) {']:
    if token not in text: raise SystemExit(f'Android pull guard token missing: {token}')
java.write_text(text,encoding='utf-8')

# Web shell: report nested scroll/fixed navigation gestures to native before parent intercept.
core=Path('js/core/core.js')
text=core.read_text(encoding='utf-8')
anchor="window.addEventListener('offline',()=>AppStore.set('ui.online',false),{passive:true});\n"
guard="""

/* Android WebView pull-to-refresh yalnız gerçek sayfa tepesinde çalışır.
   İç scroll alanları, modal/menü ve sabit alt navigasyon native katmana bildirilir. */
(function installAndroidPullRefreshGuard(){
  if(window.__kaAndroidPullRefreshGuard)return;window.__kaAndroidPullRefreshGuard=true;
  const BLOCK_SELECTOR='.ka-app-nav.ka-bottom-nav,.ka-menu-layer,.ka-modal-backdrop,.dv3,[role="dialog"],[data-ka-no-pull-refresh]';
  const bridge=()=>window.AndroidPullToRefreshKopru;
  const report=blocked=>{try{bridge()?.innerScrollBildir?.(!!blocked)}catch(_){}};
  const docTop=()=>Math.max(0,Number(window.scrollY||document.scrollingElement?.scrollTop||0));
  function scrollableAncestor(target){
    for(let el=target instanceof Element?target:null;el&&el!==document.body&&el!==document.documentElement;el=el.parentElement){
      const style=getComputedStyle(el),oy=style.overflowY;
      if((oy==='auto'||oy==='scroll'||oy==='overlay')&&el.scrollHeight>el.clientHeight+2)return el;
    }
    return null;
  }
  let nestedGesture=false;
  function begin(e){const target=e.target instanceof Element?e.target:null;nestedGesture=!!(target?.closest?.(BLOCK_SELECTOR)||scrollableAncestor(target));report(nestedGesture||docTop()>0)}
  function move(e){if(nestedGesture){report(true);return}const target=e.target instanceof Element?e.target:null;if(target?.closest?.(BLOCK_SELECTOR)||scrollableAncestor(target)){nestedGesture=true;report(true);return}report(docTop()>0)}
  function end(){nestedGesture=false;report(false)}
  document.addEventListener('touchstart',begin,{capture:true,passive:true});
  document.addEventListener('touchmove',move,{capture:true,passive:true});
  document.addEventListener('touchend',end,{capture:true,passive:true});
  document.addEventListener('touchcancel',end,{capture:true,passive:true});
})();
"""
if 'installAndroidPullRefreshGuard' not in text:
    if anchor not in text: raise SystemExit('core.js online/offline anchor missing')
    text=text.replace(anchor,anchor+guard,1)
core.write_text(text,encoding='utf-8')

# CSS: remove superseded school-summary V2 override and establish one global scroll boundary.
css=Path('css/design-system.css')
text=css.read_text(encoding='utf-8')
v2='/* ===== DASHBOARD SCHOOL SUMMARY READABILITY V2 ===== */'
v3='/* ===== DASHBOARD SCHOOL SUMMARY READABILITY V3 ===== */'
if v2 in text:
    start=text.index(v2); end=text.index(v3,start)
    text=text[:start]+text[end:]
if v3 not in text: raise SystemExit('V3 school summary marker missing')
scroll_marker='/* ===== GLOBAL SCROLL / PULL-TO-REFRESH GUARD ===== */'
if scroll_marker not in text:
    text += '\n\n'+scroll_marker+'\nhtml,body,.ka-app-shell{overscroll-behavior-y:none}\n.ka-app-content{overscroll-behavior-y:contain}\n.ka-app-nav.ka-bottom-nav{overscroll-behavior:none;touch-action:manipulation}\n'
css.write_text(text,encoding='utf-8')

# Consolidate legislation engine + presentation: always opened together.
engine=Path('js/modules/legislation.js')
ui=Path('js/modules/legislation-ui.js')
if ui.exists():
    engine.write_text(engine.read_text(encoding='utf-8').rstrip()+"\n\n/* ===== MERGED: legislation presentation ===== */\n"+ui.read_text(encoding='utf-8').lstrip(),encoding='utf-8')
    ui.unlink()
shellui=Path('js/core/shell-ui.js')
text=shellui.read_text(encoding='utf-8')
old="      if(!global.LegislationEngine)await global.AppLoader?.loadScript?.('js/modules/legislation.js');\n      if(!global.LegislationModule?.mount)await global.AppLoader?.loadScript?.('js/modules/legislation-ui.js');\n"
new="      if(!global.LegislationEngine||!global.LegislationModule?.mount)await global.AppLoader?.loadScript?.('js/modules/legislation.js');\n"
if old in text: text=text.replace(old,new,1)
if 'legislation-ui.js' in text: raise SystemExit('shell-ui still references legislation-ui.js')
shellui.write_text(text,encoding='utf-8')

# Service worker: no forced client navigation on activation; preserve unrelated caches.
sw=Path('service-worker.js')
text=sw.read_text(encoding='utf-8')
text=text.replace("const CACHE_ADI='oy-cache-v898';","const CACHE_ADI='oy-cache-v899';",1)
text=text.replace("'./css/design-system.css?v=896'","'./css/design-system.css?v=897'",1)
text=text.replace(",'./js/modules/legislation-ui.js'",'',1)
old="self.addEventListener('activate',event=>{event.waitUntil((async()=>{const names=await caches.keys(),old=names.filter(n=>n!==CACHE_ADI),runtimeChanged=old.some(n=>/^oy-cache-v\\d+$/.test(n));await Promise.all(old.map(n=>caches.delete(n)));await self.clients.claim();if(runtimeChanged){const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});await Promise.allSettled(windows.map(client=>client.navigate(client.url)))}})())});"
new="self.addEventListener('activate',event=>{event.waitUntil((async()=>{const names=await caches.keys(),old=names.filter(n=>n!==CACHE_ADI&&/^oy-cache-v\\d+$/.test(n));await Promise.all(old.map(n=>caches.delete(n)));await self.clients.claim()})())});"
if old not in text: raise SystemExit('service-worker activate block changed unexpectedly')
text=text.replace(old,new,1)
if 'legislation-ui.js' in text: raise SystemExit('service-worker still references legislation-ui.js')
sw.write_text(text,encoding='utf-8')

# CSS cache-bust only; app-loader is untouched.
index=Path('index.html')
text=index.read_text(encoding='utf-8')
if 'css/design-system.css?v=896' not in text: raise SystemExit('index css version changed unexpectedly')
index.write_text(text.replace('css/design-system.css?v=896','css/design-system.css?v=897',1),encoding='utf-8')

# Update legislation contract test to single-file source.
test=Path('tests/legislation-engine-v2-smoke.test.js')
text=test.read_text(encoding='utf-8')
text=text.replace("const ui=fs.readFileSync('js/modules/legislation-ui.js','utf8');","const ui=src;",1)
text=text.replace("assert(!shell.includes('<script src=\"js/modules/legislation.js\" defer></script>')&&!shell.includes('<script src=\"js/modules/legislation-ui.js\" defer></script>'),'Mevzuat motoru ve presentation ilk açılışta eager yüklenmemeli.');","assert(!shell.includes('<script src=\"js/modules/legislation.js\" defer></script>'),'Mevzuat motoru ve presentation ilk açılışta eager yüklenmemeli.');",1)
text=text.replace("assert(sw.includes(\"'./js/modules/legislation.js'\")&&sw.includes(\"'./js/modules/legislation-ui.js'\"),'Mevzuat motoru ve presentation offline Service Worker cache içinde bulunmalı.');","assert(sw.includes(\"'./js/modules/legislation.js'\")&&!sw.includes('legislation-ui.js'),'Birleştirilmiş Mevzuat motoru/presentation offline Service Worker cache içinde tek dosya olarak bulunmalı.');",1)
text=text.replace("assert(shellUi.includes(\"loadScript?.('js/modules/legislation.js')\")&&shellUi.includes(\"loadScript?.('js/modules/legislation-ui.js')\"),'Mevzuat motoru ve presentation Documents/mevzuat rotasında lazy yüklenmeli.');","assert(shellUi.includes(\"loadScript?.('js/modules/legislation.js')\")&&!shellUi.includes('legislation-ui.js'),'Birleştirilmiş Mevzuat Documents/mevzuat rotasında tek lazy dosya olarak yüklenmeli.');",1)
marker="assert(!fs.existsSync('js/mevzuat-asistan.js'),'Legacy mevzuat-asistan.js geri dönmemeli.');"
if "Birleştirme sonrası legislation-ui.js" not in text:
    text=text.replace(marker,marker+"\nassert(!fs.existsSync('js/modules/legislation-ui.js'),'Birleştirme sonrası legislation-ui.js ayrı dosya olarak geri dönmemeli.');",1)
test.write_text(text,encoding='utf-8')

# Superseded V2 typography regression is replaced by V3.
old_test=Path('tests/dashboard-school-summary-readability.test.js')
if old_test.exists(): old_test.unlink()

# New regression tests.
Path('tests/android-pull-refresh-guard.test.js').write_text("""const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const java=fs.readFileSync('android/app/src/main/java/com/koruk/okul/LogoSwipeRefreshLayout.java','utf8');
const main=fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java','utf8');
const core=fs.readFileSync('js/core/core.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
test('Android pull refresh ignores bottom navigation and nested scroll gestures',()=>{
  for(const token of ['BOTTOM_EXCLUSION_DP','bottomExclusionPx','gestureExcluded = getHeight() > 0','if (gestureExcluded || canChildScrollUp())','if (canChildScrollUp()) {']) assert.ok(java.includes(token),`Eksik native guard: ${token}`);
  assert.ok(main.includes('AndroidPullToRefreshKopru')&&main.includes('innerScrollBildir'),'Native JS bridge korunmalı.');
  for(const token of ['installAndroidPullRefreshGuard','AndroidPullToRefreshKopru','scrollableAncestor','touchstart','touchmove','.ka-app-nav.ka-bottom-nav']) assert.ok(core.includes(token),`Eksik web/native scroll guard: ${token}`);
});
test('browser and PWA overscroll cannot trigger page refresh',()=>{
  assert.ok(css.includes('html,body,.ka-app-shell{overscroll-behavior-y:none}'));
  assert.ok(css.includes('.ka-app-content{overscroll-behavior-y:contain}'));
  assert.ok(css.includes('.ka-app-nav.ka-bottom-nav{overscroll-behavior:none;touch-action:manipulation}'));
});
""",encoding='utf-8')
Path('tests/service-worker-no-forced-reload.test.js').write_text("""const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sw=fs.readFileSync('service-worker.js','utf8');
test('service worker activation preserves live local-first sessions',()=>{
  assert.ok(sw.includes(\"const CACHE_ADI='oy-cache-v899'\"));
  assert.ok(sw.includes(\"old=names.filter(n=>n!==CACHE_ADI&&/^oy-cache-v\\\\d+$/.test(n))\"),'Yalnız uygulamanın eski cache sürümleri temizlenmeli.');
  assert.ok(sw.includes('await self.clients.claim()'),'Yeni worker istemcileri devralmalı.');
  assert.ok(!sw.includes('windows.map(client=>client.navigate(client.url))'),'Cache aktivasyonu açık sayfaları zorla yenilememeli.');
  assert.ok(!sw.includes('runtimeChanged'),'Eski zorunlu reload bayrağı kalmamalı.');
});
""",encoding='utf-8')

# Architecture workflow: native gesture code participates in client audit + all JS gets syntax checked.
wf=Path('.github/workflows/client-architecture.yml')
text=wf.read_text(encoding='utf-8')
text=text.replace("      - 'android/app/src/main/java/com/koruk/okul/PrintPlugin.java'","      - 'android/app/src/main/java/com/koruk/okul/**'",2)
anchor="      - name: Build client bundles\n        run: node scripts/build-client-bundles.mjs\n"
syntax="      - name: Check all client JavaScript syntax\n        run: find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check\n"
if 'Check all client JavaScript syntax' not in text:
    if anchor not in text: raise SystemExit('client architecture build anchor missing')
    text=text.replace(anchor,syntax+anchor,1)
android_anchor="      - name: Verify Android PrintPlugin\n        run: node tests/android-print-plugin-smoke.test.js\n"
extra="      - name: Verify Android pull-to-refresh guard\n        run: node tests/android-pull-refresh-guard.test.js\n      - name: Verify offline activation stability\n        run: node tests/service-worker-no-forced-reload.test.js\n"
if 'Verify Android pull-to-refresh guard' not in text:
    if android_anchor not in text: raise SystemExit('Android PrintPlugin workflow anchor missing')
    text=text.replace(android_anchor,android_anchor+extra,1)
wf.write_text(text,encoding='utf-8')

# APK builds only when runtime/native payload changes.
apk=Path('.github/workflows/build-apk.yml')
text=apk.read_text(encoding='utf-8')
old="on:\n  push:\n    branches: [ main ]\n  workflow_dispatch:\n"
new="""on:
  push:
    branches: [ main ]
    paths:
      - 'index.html'
      - 'css/**'
      - 'js/**'
      - 'assets/**'
      - 'manifest.json'
      - 'service-worker.js'
      - 'capacitor.config.json'
      - 'android/**'
      - 'package.json'
      - 'package-lock.json'
      - 'scripts/build-client-bundles.mjs'
      - '.github/workflows/build-apk.yml'
  workflow_dispatch:
"""
if old not in text: raise SystemExit('build-apk trigger block changed unexpectedly')
apk.write_text(text.replace(old,new,1),encoding='utf-8')

# Consolidation must not leave runtime/test references to retired file.
leftovers=[]
for p in [Path('js'),Path('tests')]:
    for f in p.rglob('*.js'):
        if 'legislation-ui.js' in f.read_text(encoding='utf-8'):
            leftovers.append(str(f))
if leftovers: raise SystemExit('Retired legislation-ui reference remains: '+', '.join(leftovers))
if v2 in css.read_text(encoding='utf-8'): raise SystemExit('Superseded dashboard V2 CSS still present')
