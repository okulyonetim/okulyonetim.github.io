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
assert(bridge.includes('window.RolePermissionBridge=Object.freeze({allowedRoute})'),'Menü, rota korumasıyla aynı permission kuralını RolePermissionBridge üzerinden almalı.');
const appNav=fs.readFileSync('js/core/app-nav.js','utf8');
assert(appNav.includes("global.RolePermissionBridge?.allowedRoute?.(name,page||'')!==false"),'Araç menüsü (AppNav.canOpen) sayfa düzeyindeki rol izinlerini uygulamalı.');
assert(!bridge.includes('data-ka-shell-route')&&!bridge.includes('data-ka-menu-group'),'Eski menü DOM filtresi geri dönmemeli: menü yetkiye göre baştan üretilir.');
console.log('role-permission-navigation.test.js: OK');