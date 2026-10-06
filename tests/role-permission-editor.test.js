const fs=require('fs');
const assert=require('assert');
const editor=fs.readFileSync('js/core/role-permission-editor.js','utf8');
const catalog=fs.readFileSync('js/core/role-permission-catalog.js','utf8');
const bridge=fs.readFileSync('js/core/role-permission-bridge.js','utf8');

assert(editor.includes('RolePermissionEditor'),'Rol yetki editörü global API eksik.');
assert(editor.includes("settings.roles"),'Rol görüntüleme permission kontrolü eksik.');
assert(editor.includes("settings.roles.edit"),'Rol düzenleme permission kontrolü eksik.');
assert(editor.includes('DeviceData.update'),'Rol yetkileri DeviceData üzerinden kaydedilmeli.');
assert(editor.includes("global.COL.roller"),'Rol collection sabiti kullanılmalı.');
assert(editor.includes('RolePermissionCatalog?.catalog'),'Editör merkezi katalogdan beslenmeli.');
assert(editor.includes('legacyAliases'),'Mevcut legacy yetkiler editörde okunmalı.');
assert(editor.includes("id='kaRolePermissionEditorHost'"),'Editör mount noktası eksik.');
assert(bridge.includes('role-permission-editor.js'),'Editör bootstrap zincirine bağlı değil.');
assert(catalog.includes('settings.roles.create'),'Granular rol oluşturma permissionı katalogda yok.');
assert(catalog.includes('settings.roles.delete'),'Granular rol silme permissionı katalogda yok.');
console.log('role-permission-editor tests passed');
