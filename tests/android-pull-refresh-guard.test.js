const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const java=fs.readFileSync('android/app/src/main/java/com/koruk/okul/LogoSwipeRefreshLayout.java','utf8');
const main=fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java','utf8');
const core=fs.readFileSync('js/core/core.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
test('Android pull refresh ignores bottom navigation and nested scroll gestures',()=>{
  for(const token of ['BOTTOM_EXCLUSION_DP','bottomExclusionPx','TOP_ACTIVATION_ZONE_DP','topActivationZonePx','gestureExcluded = ev.getY() > topActivationZonePx','getHeight() - bottomExclusionPx','if (gestureExcluded || canChildScrollUp())','if (canChildScrollUp()) {']) assert.ok(java.includes(token),`Eksik native guard: ${token}`);
  assert.ok(main.includes('AndroidPullToRefreshKopru')&&main.includes('innerScrollBildir'),'Native JS bridge korunmalı.');
  for(const token of ['installAndroidPullRefreshGuard','AndroidPullToRefreshKopru','scrollableAncestor','touchstart','touchmove','.ka-app-nav.ka-bottom-nav']) assert.ok(core.includes(token),`Eksik web/native scroll guard: ${token}`);
});
test('browser and PWA overscroll cannot trigger page refresh',()=>{
  assert.ok(css.includes('html,body,.ka-app-shell{overscroll-behavior-y:none}'));
  assert.ok(css.includes('.ka-app-content{overscroll-behavior-y:contain}'));
  assert.ok(css.includes('.ka-app-nav.ka-bottom-nav{overscroll-behavior:none;touch-action:manipulation}'));
});
