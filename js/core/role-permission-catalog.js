/* Koruk Asistan — Rol / Yetki Kataloğu uyumluluk köprüsü
 * Tek kaynak artık js/app-loader.js içindeki PermissionService'tir (BASE_PERMISSION_CATALOG /
 * LEGACY_PERMISSION_ALIASES). Bu dosya, PermissionService'ten önce yüklenmiş eski kodun
 * beklediği window.RolePermissionCatalog global'ini, katalogu tekrar tanımlamadan, doğrudan
 * PermissionService'ten yansıtarak sağlar. Böylece iki ayrı katalog arasında runtime
 * birleştirme / zamanlama yarışı kalmaz: PermissionService.catalog ilk script-parse anında
 * tamdır.
 * Rol kaydetme/silme yetki kontrolü de tek merkezde: js/core/role-permission-operations.js.
 * Bu dosya artık KullaniciYonetimiService.rolKaydet/rolSil'i tekrar sarmaz (önceki
 * installRoleActionGuards üçüncü ve gereksiz bir katmandı).
 */
(function(global){
  'use strict';
  if(global.RolePermissionCatalog)return;
  function mergeIntoPermissionService(){
    // Geriye dönük uyumluluk: PermissionService zaten tam katalogla başlar, burada
    // sadece hazır olduğunu doğruluyoruz.
    return !!global.PermissionService;
  }
  function snapshot(){
    const ps=global.PermissionService;
    return{
      LEVELS:ps?.LEVELS||Object.freeze({hidden:0,preview:1,read:2,edit:3}),
      catalog:ps?.catalog||[],
      legacyAliases:ps?.aliases||{}
    };
  }
  const api={
    get LEVELS(){return snapshot().LEVELS;},
    get catalog(){return snapshot().catalog;},
    get legacyAliases(){return snapshot().legacyAliases;},
    mergeIntoPermissionService
  };
  global.RolePermissionCatalog=api;
})(window);
