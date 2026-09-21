const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const main=fs.readFileSync('android/app/src/main/java/com/koruk/okul/MainActivity.java','utf8');
const core=fs.readFileSync('js/core/core.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('APK and browser pull refresh use native platform gesture handlers',()=>{
  assert.ok(core.includes('installPullToRefreshAdapter'),'Platform pull refresh adapter eksik.');
  assert.ok(core.includes('SyncEngine?.sync'),'Programmatic refresh SyncEngine üzerinden yapılmalı.');
  assert.ok(!core.includes('touchstart'),'Core touchstart ile native scroll motorunu engellememeli.');
  assert.ok(!core.includes('touchmove'),'Core touchmove ile native scroll motorunu engellememeli.');
  assert.ok(!core.includes('e.preventDefault()'),'Core pull refresh için preventDefault kullanmamalı.');
  assert.ok(!core.includes('window.location.reload()'),'Programmatic pull refresh tam sayfa reload yapmamalı.');
  assert.ok(main.includes('LogoSwipeRefreshLayout nativePullRefresh'),'APK native pull refresh wrapper eksik.');
  assert.ok(main.includes('setupPullToRefresh()'),'APK native pull refresh kurulumu eksik.');
  assert.ok(main.includes('KorukNativePull'),'Android nested-scroll pull refresh bridge eksik.');
  assert.ok(main.includes('setChildCanScrollUp'),'Android native scroll guard eksik.');
  assert.ok(!main.includes('private LogoSwipeRefreshLayout swipeRefresh'),'Eski swipeRefresh alanı geri dönmemeli.');
});

test('browser scroll chaining is left available for Chrome/Safari native pull refresh',()=>{
  assert.ok(css.includes('html,body,.ka-app-shell{overscroll-behavior-y:auto;touch-action:auto}'));
  assert.ok(css.includes('.ka-app-content{overscroll-behavior-y:auto;touch-action:auto}'));
  assert.ok(css.includes('.ka-app-nav.ka-bottom-nav{overscroll-behavior-y:auto;touch-action:auto}'));
  assert.ok(css.includes('#kaPullRefreshIndicator{')&&css.includes('@keyframes kaPullRefreshSpin'));
  const cssRef=index.match(/css\/design-system\.css\?v=(\d+)/);
  const coreRef=index.match(/js\/core\/core\.js\?v=(\d+)/);
  const cacheRef=sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/);
  assert.ok(cssRef&&Number(cssRef[1])>=900,'Design system sürümü v900 veya daha yeni olmalı.');
  assert.ok(coreRef&&Number(coreRef[1])>=916,'Core pull-refresh sürümü v916 veya daha yeni olmalı.');
  assert.ok(cacheRef&&Number(cacheRef[1])>=968,'Service Worker cache sürümü v968 veya daha yeni olmalı.');
  assert.ok(sw.includes(`'./css/design-system.css?v=${cssRef[1]}'`),'SW, index ile aynı design-system sürümünü precache etmeli.');
  assert.ok(sw.includes(`'./js/core/core.js?v=${coreRef[1]}'`),'SW, index ile aynı core sürümünü precache etmeli.');
});
