const test=require('node:test');
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
