const fs=require('fs');
const assert=require('assert');
const map=fs.readFileSync('js/modules/map-ui.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const tools=fs.readFileSync('js/modules/tools.js','utf8');

assert(!fs.existsSync('js/map-libs.js'),'Ayrı map-libs.js geri dönmemeli.');
assert(!fs.existsSync('js/harita.js'),'Emekli root harita.js geri dönmemeli.');
for(const token of ["LEAFLET_JS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'","LEAFLET_CSS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'",'function leafletCssReady()','function leafletJsReady()','async function ensureLibs()','global.HaritaUI={']) assert(map.includes(token),`Harita tek-dosya sözleşmesi eksik: ${token}`);
assert(!map.includes("loadScript?.('js/map-libs.js')"),'Harita eski map-libs loader yoluna dönmemeli.');
assert(!map.includes('global.MapLibs'),'MapLibs global köprüsü geri dönmemeli.');
assert(map.includes("link.dataset.korukExternal='leaflet'"),'Leaflet vendor CSS capability olarak işaretlenmeli.');
assert(map.includes("script.dataset.korukExternal='leaflet'"),'Leaflet vendor JS capability olarak işaretlenmeli.');
assert(!map.includes("global.DeviceData.update('servisler'"),'Harita UI servis güzergâhına doğrudan DeviceData ile yazmamalı.');
assert(map.includes('global.HaritaService.guzergahKaydet('),'Servis güzergâhı canonical HaritaService üzerinden kaydedilmeli.');
assert(map.includes("global.AppLoader?.load?.('transport')"),'Harita gerektiğinde mevcut Taşıma repository sahibini lazy-load etmeli.');
assert(!map.includes('new MutationObserver')&&!map.includes('data-tools-tab'),'Harita eski sekme gözlemcisiyle mount edilmemeli.');
assert(tools.includes('global.HaritaUI.mount(content)')&&tools.includes('global.HaritaUI?.refresh?.()'),'Tools Harita görünümünü canonical HaritaUI sahibine devretmeli.');
assert(tools.includes("previous==='map'&&page!=='map'")&&tools.includes('global.HaritaUI?.unmount?.()'),'Tools Harita lifecycle kapanışını yönetmeli.');
assert(!tools.includes('function mapFavoriteCard(')&&!tools.includes('function routeCard('),'Tools ikinci Harita kart rendererını taşımamalı.');
assert(map.includes("PermissionService?.require?.('tools.map','edit')"),'Harita yazma yetkisi merkezi PermissionService üzerinden kalmalı.');
assert(loader.includes("'js/modules/map-ui.js'"),'Tools registry HaritaUI motorunu module path üzerinden yüklemeli.');
assert(!loader.includes("'js/harita.js'"),'Eski root harita yolu AppLoader a geri dönmemeli.');

console.log('Harita + Leaflet V2 module konsolidasyon sözleşmesi başarılı.');
