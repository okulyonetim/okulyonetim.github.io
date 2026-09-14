const fs=require('fs');const assert=require('assert');
const core=fs.readFileSync('js/core/core.js','utf8'),dash=fs.readFileSync('js/modules/dashboard.js','utf8'),css=fs.readFileSync('css/design-system.css','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
assert(core.includes('scheduleStaleReset')&&core.includes("window.addEventListener('pageshow'")&&core.includes('reloadFallbackTimer'));
assert(dash.includes('--kh-ticker-delay:${tickerDelay.toFixed(2)}s')&&!dash.includes('freshNews.replaceWith(oldNews)'));
assert(css.includes('animation-delay:var(--kh-ticker-delay,0s)')&&!css.includes('.kh-news:hover .kh-news-track{animation-play-state:paused}'));
assert(sw.includes("const CACHE_ADI='oy-cache-v945';"));
console.log('dashboard refresh/news stability regression ok');
