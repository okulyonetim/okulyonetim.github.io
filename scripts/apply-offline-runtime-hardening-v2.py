from pathlib import Path

# Android native pull-to-refresh: bottom navigation and nested scroll state must never start a refresh.
java=Path('android/app/src/main/java/com/koruk/okul/LogoSwipeRefreshLayout.java')
text=java.read_text(encoding='utf-8')
repls=[
('    private static final int   SPRING_BACK_MS        = 220;\n    private static final float VERTICAL_DOMINANCE    = 1.28f;\n',
 '    private static final int   SPRING_BACK_MS        = 220;\n    private static final float VERTICAL_DOMINANCE    = 1.28f;\n    private static final int   BOTTOM_EXCLUSION_DP   = 104;\n'),
('    private final float triggerDistancePx;\n    private final float hiddenTranslationY;\n',
 '    private final float triggerDistancePx;\n    private final float hiddenTranslationY;\n    private final float bottomExclusionPx;\n'),
('    private boolean refreshing = false;\n    private boolean pullEnabled = true;\n',
 '    private boolean refreshing = false;\n    private boolean pullEnabled = true;\n    private boolean gestureExcluded = false;\n'),
('        this.touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();\n        this.triggerDistancePx = TRIGGER_DISTANCE_DP * density;\n',
 '        this.touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();\n        this.triggerDistancePx = TRIGGER_DISTANCE_DP * density;\n        this.bottomExclusionPx = BOTTOM_EXCLUSION_DP * density;\n'),
('        if (!enabled && dragging) {\n            dragging = false;\n            springBackTo(0);\n        }\n',
 '        if (!enabled && dragging) {\n            dragging = false;\n            springBackTo(0);\n        }\n        if (!enabled) gestureExcluded = false;\n'),
('            case MotionEvent.ACTION_DOWN:\n                downX = ev.getX();\n                downY = ev.getY();\n                dragging = false;\n                return false;\n            case MotionEvent.ACTION_MOVE: {\n                if (canChildScrollUp()) return false;\n',
 '            case MotionEvent.ACTION_DOWN:\n                downX = ev.getX();\n                downY = ev.getY();\n                dragging = false;\n                gestureExcluded = getHeight() > 0 && ev.getY() >= getHeight() - bottomExclusionPx;\n                return false;\n            case MotionEvent.ACTION_MOVE: {\n                if (gestureExcluded || canChildScrollUp()) return false;\n'),
('            default:\n                return false;\n        }\n    }\n\n    @Override\n    public boolean onTouchEvent(MotionEvent ev) {\n        if (!pullEnabled || refreshing) return false;\n',
 '            case MotionEvent.ACTION_UP:\n            case MotionEvent.ACTION_CANCEL:\n                gestureExcluded = false;\n                return false;\n            default:\n                return false;\n        }\n    }\n\n    @Override\n    public boolean onTouchEvent(MotionEvent ev) {\n        if (!pullEnabled || refreshing || gestureExcluded) return false;\n'),
('            case MotionEvent.ACTION_MOVE: {\n                if (!dragging) return false;\n                float dy = ev.getY() - downY;\n',
 '            case MotionEvent.ACTION_MOVE: {\n                if (!dragging) return false;\n                if (canChildScrollUp()) {\n                    dragging = false;\n                    springBackTo(0);\n                    return false;\n                }\n                float dy = ev.getY() - downY;\n'),
('            case MotionEvent.ACTION_UP:\n            case MotionEvent.ACTION_CANCEL: {\n                if (!dragging) return false;\n                dragging = false;\n',
 '            case MotionEvent.ACTION_UP:\n            case MotionEvent.ACTION_CANCEL: {\n                gestureExcluded = false;\n                if (!dragging) return false;\n                dragging = false;\n')]
for old,new in repls:
    if old not in text: raise SystemExit('LogoSwipeRefreshLayout contract changed: '+old.splitlines()[0])
    text=text.replace(old,new,1)
java.write_text(text,encoding='utf-8')

# Global JS bridge: all nested scrollable surfaces tell native refresh to stand down during their gesture.
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
    if anchor not in text: raise SystemExit('core.js offline anchor missing')
    text=text.replace(anchor,anchor+guard,1)
core.write_text(text,encoding='utf-8')

# CSS: remove superseded dashboard override and stop browser/PWA overscroll-refresh globally.
css=Path('css/design-system.css')
text=css.read_text(encoding='utf-8')
v2='/* ===== DASHBOARD SCHOOL SUMMARY READABILITY V2 ===== */'
v3='/* ===== DASHBOARD SCHOOL SUMMARY READABILITY V3 ===== */'
if v2 in text:
    if v3 not in text: raise SystemExit('dashboard V3 marker missing')
    text=text[:text.index(v2)]+text[text.index(v3,text.index(v2)):]
scroll_marker='/* ===== GLOBAL SCROLL / PULL-TO-REFRESH GUARD ===== */'
if scroll_marker not in text:
    text+='\n\n'+scroll_marker+'\nhtml,body,.ka-app-shell{overscroll-behavior-y:none}\n.ka-app-content{overscroll-behavior-y:contain}\n.ka-app-nav.ka-bottom-nav{overscroll-behavior:none;touch-action:manipulation}\n'
css.write_text(text,encoding='utf-8')
Path('tests/dashboard-school-summary-readability.test.js').unlink(missing_ok=True)

# Service worker: retain offline cache-first behavior, but never hard-reload live clients during activation.
sw=Path('service-worker.js')
text=sw.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v898';" not in text: raise SystemExit('unexpected service-worker cache version')
text=text.replace("const CACHE_ADI='oy-cache-v898';","const CACHE_ADI='oy-cache-v899';",1)
if "'./css/design-system.css?v=896'" not in text: raise SystemExit('unexpected service-worker css version')
text=text.replace("'./css/design-system.css?v=896'","'./css/design-system.css?v=897'",1)
old="self.addEventListener('activate',event=>{event.waitUntil((async()=>{const names=await caches.keys(),old=names.filter(n=>n!==CACHE_ADI),runtimeChanged=old.some(n=>/^oy-cache-v\\d+$/.test(n));await Promise.all(old.map(n=>caches.delete(n)));await self.clients.claim();if(runtimeChanged){const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});await Promise.allSettled(windows.map(client=>client.navigate(client.url)))}})())});"
new="self.addEventListener('activate',event=>{event.waitUntil((async()=>{const names=await caches.keys(),old=names.filter(n=>n!==CACHE_ADI&&/^oy-cache-v\\d+$/.test(n));await Promise.all(old.map(n=>caches.delete(n)));await self.clients.claim()})())});"
if old not in text: raise SystemExit('service-worker activate contract changed')
text=text.replace(old,new,1)
sw.write_text(text,encoding='utf-8')

# CSS cache version only. App-loader remains untouched.
index=Path('index.html')
text=index.read_text(encoding='utf-8')
if 'css/design-system.css?v=896' not in text: raise SystemExit('unexpected index css version')
index.write_text(text.replace('css/design-system.css?v=896','css/design-system.css?v=897',1),encoding='utf-8')

# Regression coverage.
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
  assert.ok(sw.includes('old=names.filter(n=>n!==CACHE_ADI&&/^oy-cache-v\\\\d+$/.test(n))'),'Yalnız uygulamanın eski cache sürümleri temizlenmeli.');
  assert.ok(sw.includes('await self.clients.claim()'),'Yeni worker istemcileri devralmalı.');
  assert.ok(!sw.includes('windows.map(client=>client.navigate(client.url))'),'Cache aktivasyonu açık sayfaları zorla yenilememeli.');
  assert.ok(!sw.includes('runtimeChanged'),'Eski zorunlu reload bayrağı kalmamalı.');
});
""",encoding='utf-8')

# Client architecture CI: every runtime JS gets syntax validation and every Android native runtime change is audited.
wf=Path('.github/workflows/client-architecture.yml')
text=wf.read_text(encoding='utf-8')
text=text.replace("      - 'android/app/src/main/java/com/koruk/okul/PrintPlugin.java'","      - 'android/app/src/main/java/com/koruk/okul/**'",2)
anchor="      - name: Build client bundles\n        run: node scripts/build-client-bundles.mjs\n"
syntax="      - name: Check all client JavaScript syntax\n        run: find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check\n"
if 'Check all client JavaScript syntax' not in text:
    if anchor not in text: raise SystemExit('client architecture bundle anchor missing')
    text=text.replace(anchor,syntax+anchor,1)
android_anchor="      - name: Verify Android PrintPlugin\n        run: node tests/android-print-plugin-smoke.test.js\n"
extra="      - name: Verify Android pull-to-refresh guard\n        run: node tests/android-pull-refresh-guard.test.js\n      - name: Verify offline activation stability\n        run: node tests/service-worker-no-forced-reload.test.js\n"
if 'Verify Android pull-to-refresh guard' not in text:
    if android_anchor not in text: raise SystemExit('Android PrintPlugin workflow anchor missing')
    text=text.replace(android_anchor,android_anchor+extra,1)
wf.write_text(text,encoding='utf-8')

# Full APK builds only when app/native runtime payload changes.
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
if old not in text: raise SystemExit('build-apk trigger contract changed')
apk.write_text(text.replace(old,new,1),encoding='utf-8')

if v2 in css.read_text(encoding='utf-8'): raise SystemExit('dashboard V2 CSS still present')
