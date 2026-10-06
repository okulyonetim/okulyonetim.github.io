const fs=require('fs');
const assert=require('assert');
const bridge=fs.readFileSync('js/core/role-permission-bridge.js','utf8');
assert(bridge.includes('const PAGE_PERMISSIONS=Object.freeze({'),'Navigation permission map eksik.');
for(const key of ['people:teachers','people:students','academic:schedule','management:duty','communication:announcements','transport:services','food:menu','documents:evrak','reports:home','tools:gradebook','settings:roles']){
  assert(bridge.includes(`'${key}'`),`Navigation permission eşleşmesi eksik: ${key}`);
}
assert(bridge.includes("const modulePermission=name=>`module.${String(name||'').trim()}`"),'Modül permission çözümleyici eksik.');
assert(bridge.includes('shell.routeModule=async function(name,options={})'),'Doğrudan rota erişim guardı eksik.');
assert(bridge.includes("if(!allowedRoute(name,page))"),'Rota erişim kontrolü uygulanmıyor.');
assert(bridge.includes("el.dataset.kaShellRoute||''"),'Menü öğesi permission filtresi eksik.');
assert(bridge.includes("card.dataset.kaMenuGroup||''"),'Menü kartı permission filtresi eksik.');
console.log('role-permission-navigation.test.js: OK');