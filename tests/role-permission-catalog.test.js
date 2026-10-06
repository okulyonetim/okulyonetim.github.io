const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('js/core/role-permission-catalog.js','utf8');
for(const key of [
  'module.food','food.menu','food.audit',
  'management.tasks','management.teacherLeaves','management.puantaj','management.dilekce',
  'documents.tracking','documents.pdf',
  'reports.view','reports.create','reports.customize','reports.pdf','reports.excel',
  'tools.backup','tools.backup.edit','tools.reminders','tools.reminders.edit',
  'settings.users','settings.roles','settings.roles.edit','settings.roles.create','settings.roles.clone','settings.roles.delete',
  'settings.statistics','settings.statistics.edit','settings.storage','settings.storage.edit'
]) assert(source.includes(`['${key}'`)||source.includes(`['${key}',`),`Permission kataloğunda eksik: ${key}`);
for(const level of ['hidden:0','preview:1','read:2','edit:3']) assert(source.includes(level),`Yetki seviyesi eksik: ${level}`);
assert(source.includes('mergeIntoPermissionService'),'PermissionService entegrasyon fonksiyonu eksik.');
console.log('role-permission-catalog: OK');
