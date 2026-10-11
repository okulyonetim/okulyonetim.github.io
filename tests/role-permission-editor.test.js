/* Rol yetki editörü artık tek bir editördür: settings.js'in "Roller" sayfası bunu
 * doğrudan çağırır (render/bind), MutationObserver ile kendini DOM'a enjekte etmez.
 * Kayıt, KullaniciYonetimiService.rolKaydet üzerinden (settings.js) DeviceData/IndexedDB'e
 * gider — editör dosyası bunu doğrudan çağırmaz, servis katmanına devreder.
 */
const fs=require('fs');
const assert=require('assert');
const editor=fs.readFileSync('js/core/role-permission-editor.js','utf8');
const catalog=fs.readFileSync('js/core/role-permission-catalog.js','utf8');
const bridge=fs.readFileSync('js/core/role-permission-bridge.js','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');

assert(editor.includes('RolePermissionEditor'),'Rol yetki editörü global API eksik.');
assert(editor.includes("settings.roles"),'Rol görüntüleme permission kontrolü eksik.');
assert(editor.includes("settings.roles.edit"),'Rol düzenleme permission kontrolü eksik.');
assert(editor.includes('service()?.rolKaydet'),'Rol yetkileri KullaniciYonetimiService.rolKaydet üzerinden kaydedilmeli.');
assert(editor.includes('RolePermissionCatalog?.catalog'),'Editör merkezi katalogdan beslenmeli.');
assert(editor.includes('legacyAliases'),'Mevcut legacy yetkiler editörde okunmalı.');
assert(!/new MutationObserver/.test(editor),'Editör artık kendini DOM\'a otomatik enjekte etmemeli (tek editör mimarisi).');
assert(editor.includes('function render(host'),'Editör host parametresiyle doğrudan çağrılabilir olmalı.');
assert(settings.includes("window.RolePermissionEditor?.render?.(host)"),'settings.js merkezi editörü doğrudan çağırmalı.');
assert(bridge.includes('role-permission-editor.js'),'Editör bootstrap zincirine bağlı değil.');
assert(catalog.includes('global.PermissionService'),'Katalog köprüsü PermissionService\'e yansımalı.');
console.log('role-permission-editor tests passed');
