/* Koruk Asistan — RolePermissionCatalog runtime bridge */
(function(window){
  'use strict';
  let attempts=0;
  const run=()=>{
    if(window.RolePermissionCatalog?.mergeIntoPermissionService?.()){
      window.dispatchEvent(new CustomEvent('koruk:permission-catalog-ready'));
      return true;
    }
    return false;
  };
  if(run()) return;
  const timer=setInterval(()=>{
    if(run() || ++attempts>=120) clearInterval(timer);
  },50);
})(window);