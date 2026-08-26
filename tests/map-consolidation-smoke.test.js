const fs=require('fs');
const assert=require('assert');
const map=fs.readFileSync('js/harita.js','utf8');

assert(!fs.existsSync('js/map-libs.js'),'Ayrı map-libs.js geri dönmemeli.');
for(const token of ["LEAFLET_JS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'","LEAFLET_CSS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'",'function leafletCssReady()','function leafletJsReady()','async function ensureLibs()','global.HaritaUI={']) assert(map.includes(token),`Harita tek-dosya sözleşmesi eksik: ${token}`);
assert(!map.includes("loadScript?.('js/map-libs.js')"),'Harita eski map-libs loader yoluna dönmemeli.');
assert(!map.includes('global.MapLibs'),'MapLibs global köprüsü geri dönmemeli.');
assert(map.includes("link.dataset.korukExternal='leaflet'"),'Leaflet vendor CSS capability olarak işaretlenmeli.');
assert(map.includes("script.dataset.korukExternal='leaflet'"),'Leaflet vendor JS capability olarak işaretlenmeli.');
assert(map.includes("global.DeviceData.update('servisler'"),'Servis güzergâhı DeviceData local-first hattında kalmalı.');
assert(map.includes("PermissionService?.require?.('tools.map','edit')"),'Harita yazma yetkisi merkezi PermissionService üzerinden kalmalı.');

console.log('Harita + Leaflet tek dosya konsolidasyon sözleşmesi başarılı.');
