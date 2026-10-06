/* Koruk Asistan — RolePermissionCatalog runtime bridge */
(function(window){
  'use strict';
  let attempts=0;
  const loadEditor=()=>new Promise((resolve,reject)=>{
    const src='js/core/role-permission-editor.js?v=1';
    if([...document.scripts].some(s=>s.src.includes(src.split('?')[0])))return resolve();
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.onload=resolve;
    s.onerror=()=>reject(new Error('Rol yetki editörü yüklenemedi.'));
    document.head.appendChild(s);
  });
  const run=()=>{
    if(window.RolePermissionCatalog?.mergeIntoPermissionService?.()){
      window.dispatchEvent(new CustomEvent('koruk:permission-catalog-ready'));
      loadEditor().catch(e=>console.warn('[RolePermissionEditor]',e?.message||e));
      return true;
    }
    return false;
  };
  if(run()) return;
  const timer=setInterval(()=>{
    if(run() || ++attempts>=120) clearInterval(timer);
  },50);
})(window);