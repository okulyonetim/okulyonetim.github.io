/* Koruk Asistan — RolePermissionCatalog runtime bridge */
(function(window){
  'use strict';
  let attempts=0;
  const operationScript='js/core/role-permission-operations.js?v=1';
  const loadOperations=()=>new Promise((resolve,reject)=>{
    if([...document.scripts].some(s=>s.src.includes(operationScript.split('?')[0]))) return resolve();
    const s=document.createElement('script');
    s.src=operationScript;
    s.async=false;
    s.onload=resolve;
    s.onerror=()=>reject(new Error(`Rol işlem yetki dosyası yüklenemedi: ${operationScript}`));
    document.head.appendChild(s);
  });
  const run=()=>{
    if(window.RolePermissionCatalog?.mergeIntoPermissionService?.()){
      window.dispatchEvent(new CustomEvent('koruk:permission-catalog-ready'));
      loadOperations().catch(e=>console.warn('[RolePermissionOperations]',e?.message||e));
      return true;
    }
    return false;
  };
  if(run()) return;
  const timer=setInterval(()=>{
    if(run() || ++attempts>=120) clearInterval(timer);
  },50);
})(window);