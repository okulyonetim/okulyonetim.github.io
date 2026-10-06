const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('js/core/role-permission-catalog.js','utf8');
for(const key of ['settings.roles','settings.roles.edit','settings.roles.create','settings.roles.clone','settings.roles.delete']){
  assert(source.includes(`['${key}'`),`Permission kataloğunda eksik: ${key}`);
}
assert(source.includes('installRoleActionGuards'),'Rol işlem yetki koruması eksik.');
assert(source.includes("settings.roles.create"),'Yeni rol oluşturma yetkisi çalışma zamanında kontrol edilmeli.');
assert(source.includes("settings.roles.delete"),'Rol silme yetkisi çalışma zamanında kontrol edilmeli.');
assert(source.includes('koruk:module-ready'),'Settings modülü hazır olduktan sonra rol işlem koruması kurulmalı.');
console.log('role-permission-operations: OK');
