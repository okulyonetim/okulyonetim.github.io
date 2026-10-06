const fs=require('fs');
const assert=require('assert');

const teacher=fs.readFileSync('js/core/teacher-delete-lifecycle.js','utf8');
assert(teacher.includes("people.teachers.delete"),'Öğretmen silme ayrı granular permission kullanmalı.');
assert(!teacher.includes("people.teachers','edit"),'Öğretmen silme genel düzenleme yetkisine bağlı kalmamalı.');

const bridge=fs.readFileSync('js/core/role-permission-bridge.js','utf8');
assert(bridge.includes("PAGE_PERMISSIONS"),'Merkezi sayfa permission eşlemesi bulunmalı.');
assert(bridge.includes("PermissionService?.can"),'Navigasyon merkezi PermissionService üzerinden kontrol edilmeli.');

const catalog=fs.readFileSync('js/core/role-permission-catalog.js','utf8');
assert(catalog.includes("['people.teachers.delete'"),'Öğretmen silme permission katalogda bulunmalı.');
assert(catalog.includes("['settings.roles.clone'"),'Rol kopyalama permission katalogda bulunmalı.');

console.log('Granular permission action tests passed.');
