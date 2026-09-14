const fs=require('fs');
const assert=require('assert');
const css=fs.readFileSync('css/design-system.css','utf8');
const dash=fs.readFileSync('js/modules/dashboard.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
assert(css.includes('.ka-home .kh-news-track{display:flex;align-items:center;gap:0;width:max-content;animation:khTicker var(--kh-ticker-time,28s) linear infinite'), 'news ticker must animate immediately without waiting for is-ready');
assert(!css.includes('.kh-news.is-ready .kh-news-track{animation:khTicker'), 'ticker must not depend on delayed is-ready class');
assert(css.includes('.ka-home .kh-weather-emoji{font-size:27px;line-height:1;display:inline-block;animation:none;transform:none}'), 'weather emoji animation must be disabled');
assert(css.includes('.ka-home .kh-weather-card:after{content:none;display:none}'), 'weather shimmer must be disabled');
assert(dash.includes('function stabilizeNewsTicker(root=document)'), 'dashboard compatibility helper should remain harmless');
assert(sw.includes("const CACHE_ADI='oy-cache-v944';"), 'cache must be bumped');
// Regression: dashboard reload should not wait for a JS readiness class before ticker motion begins.
console.log('dashboard motion regression ok');
