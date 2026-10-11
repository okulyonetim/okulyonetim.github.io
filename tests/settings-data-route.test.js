/* Regresyon: "Veriler" menü öğesi (settings:data) var olmayan global.KaDataPage'i
 * çağırıyordu — hiçbir yerde tanımlı değildi, bu yüzden her tıklamada sessizce
 * "Sayfa açılamadı." hatasına düşüp kullanıcıyı boş bir ekranda bırakıyordu.
 * Artık mevcut, çalışan Ayarlar > Depolama (storage) sekmesini açıyor.
 */
const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');

assert(!/global\.KaDataPage\??\.open/.test(shell),'Var olmayan KaDataPage referansı kalmamalı.');
assert(/registerPageRoute\('data',async\(ctx\)=>\{/.test(shell),"'data' sayfa rotası tanımlı olmalı.");
assert(shell.includes("global.SettingsModule.openPage('storage','Veriler')"),"'Veriler' rotası mevcut Depolama sekmesini açmalı.");

assert(settings.includes('canStorage='),'Depolama sekmesi için granüler izin kontrolü eksik.');
assert(/tab==='storage'\)return canStorage\('preview'\)/.test(settings),'Depolama sekmesi artık settings.storage iznine göre açılmalı (sadece admin değil).');

console.log('settings-data-route: OK');
