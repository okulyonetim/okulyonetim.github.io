/* Rol/yetki kataloğu artık tek kaynak: js/app-loader.js (PermissionService).
 * js/core/role-permission-catalog.js bu kataloğu kopyalamaz; sadece eski kodun
 * beklediği window.RolePermissionCatalog global'ini PermissionService'ten yansıtan
 * ince bir uyumluluk katmanıdır — bu yüzden testler asıl kaynağı (app-loader.js)
 * kontrol eder.
 */
const fs=require('fs');
const assert=require('assert');

const loader=fs.readFileSync('js/app-loader.js','utf8');
const catalogBridge=fs.readFileSync('js/core/role-permission-catalog.js','utf8');

for(const key of [
  'module.food','food.menu','food.audit',
  'management.tasks','management.teacherLeaves','management.puantaj','management.dilekce',
  'documents.tracking','documents.pdf',
  'reports.view','reports.create','reports.customize','reports.pdf','reports.excel',
  'tools.backup','tools.backup.edit','tools.reminders','tools.reminders.edit',
  'settings.users','settings.roles','settings.roles.edit','settings.roles.create','settings.roles.clone','settings.roles.delete',
  'settings.statistics','settings.statistics.edit','settings.storage','settings.storage.edit'
]) assert(loader.includes(`['${key}'`)||loader.includes(`['${key}',`),`Permission kataloğunda eksik: ${key}`);

assert(loader.includes('PERMISSION_RANK={hidden:0,preview:1,read:2,edit:3}'),'Yetki seviyeleri eksik.');

// Tek kaynak: app-loader.js BASE_PERMISSION_CATALOG'u ikinci bir listeye kopyalamadan
// doğrudan window.PermissionService.catalog olarak yayar.
assert(loader.includes('window.PermissionService={'),'PermissionService global export eksik.');
assert(loader.includes('catalog:PERMISSION_CATALOG'),'PermissionService katalogu dışa açmıyor.');

// Uyumluluk katmanı kendi kataloğunu tutmaz, PermissionService'i yansıtır.
assert(catalogBridge.includes('mergeIntoPermissionService'),'PermissionService entegrasyon fonksiyonu eksik.');
assert(!/const entries=\[/.test(catalogBridge),'role-permission-catalog.js artık ikinci bir katalog tutmamalı (tek merkez: app-loader.js).');
assert(catalogBridge.includes('global.PermissionService'),'Uyumluluk katmanı PermissionService\'e yansımalı.');

console.log('role-permission-catalog: OK');
