const fs=require('fs');
const assert=require('assert');

const feature=fs.readFileSync('js/core/dashboard-announcement-media.js','utf8');
const css=fs.readFileSync('css/dashboard-announcement-media.css','utf8');
const dashboard=fs.readFileSync('js/modules/dashboard.js','utf8');
const init=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

new Function(feature);

for(const token of [
  'function renderGallery(item)',
  'data-home-announcement-track',
  'data-home-announcement-image-index',
  'function openHomeViewer(item,startIndex=0)',
  'data-home-lightbox-image',
  'data-home-lightbox-prev',
  'data-home-lightbox-next',
  'function attachZoomSurface(img,stage',
  "addEventListener('pointerdown'",
  "addEventListener('pointermove'",
  "addEventListener('dblclick'",
  "addEventListener('wheel'",
  'clampScale',
  'function openReaderPopup(anchor,item)',
  'kh-reader-popover',
  'data-home-announcement-readers',
  "removeAttribute('data-dash-route')",
  'stopImmediatePropagation()',
  "document.addEventListener('click',onDocumentClick,true)",
  'function enhanceCommunicationLightbox(box)',
  'data-announcement-lightbox',
  'data-comm-zoom-in',
  'data-comm-zoom-out',
  'data-comm-zoom-reset'
]) assert(feature.includes(token),`Ana sayfa duyuru medya davranışı eksik: ${token}`);

assert(feature.includes("Array.isArray(item?.resimler)"),'Duyuru resimleri mevcut resimler veri modeli üzerinden okunmalı.');
assert(feature.includes("global.AppStore?.data?.(key)"),'Duyuru galerisi local-first AppStore verisini kullanmalı.');
assert(!feature.includes('.collection('),'Duyuru galeri katmanı doğrudan Firestore kullanmamalı.');
assert(!feature.includes('createElement(\'style\')'),'Duyuru galeri stilleri JS içine gömülmemeli.');

for(const token of [
  '.kh-announcement-media__track{display:flex;overflow-x:auto',
  'scroll-snap-type:x mandatory',
  '.kh-announcement-media__slide img{',
  'object-fit:contain',
  'object-position:center',
  '.kh-reader-popover{position:fixed',
  '.ka-home-announcement-lightbox{position:fixed;inset:0',
  '.ka-announcement-zoom-controls{',
  'touch-action:none'
]) assert(css.includes(token),`Duyuru galeri/popup/zoom stili eksik: ${token}`);

assert(dashboard.includes('data-duyuru-id=')&&dashboard.includes('button type=\"button\" class=\"kh-read-count\"'),'Dashboard mevcut duyuru kartı entegrasyon kancalarını korumalı.');
assert(init.includes('dashboard-announcement-media.js?v=921'),'Duyuru medya runtime dosyası v921 ile yüklenmeli.');
const cache=sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/);
assert(cache&&Number(cache[1])>=921,'Service Worker cache sürümü duyuru medya sürümünden geri olmamalı.');
assert(sw.includes("'./js/core/dashboard-announcement-media.js?v=921'"),'Duyuru medya runtime dosyası offline precache içinde olmalı.');
assert(sw.includes("'./css/dashboard-announcement-media.css?v=921'"),'Duyuru medya CSS dosyası offline precache içinde olmalı.');

console.log('Ana sayfa duyuru galeri + zoom + okuyan popover sözleşmesi başarılı.');
