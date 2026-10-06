/* Koruk Asistan — Role operation policy
 * Mevcut rol veri modelini değiştirmeden rol işlemlerini granular permission'lara bağlar.
 * Firestore rules / IndexedDB modeli değiştirilmez; KullaniciYonetimiService'in mevcut
 * repository akışı korunur.
 */
(function(window){
  'use strict';
  if(window.__KA_ROLE_PERMISSION_OPERATIONS__) return;
  window.__KA_ROLE_PERMISSION_OPERATIONS__=true;

  const permissionFor=(operation)=>({
    view:'settings.roles',
    edit:'settings.roles.edit',
    create:'settings.roles.create',
    clone:'settings.roles.clone',
    delete:'settings.roles.delete'
  }[operation]||'settings.roles');

  function activeUser(){
    return window.AKTIF_KULLANICI||window.AppStore?.get?.('session.user')||{};
  }

  function allowed(operation){
    const u=activeUser();
    if(u.admin===true) return true;
    return window.PermissionService?.can?.(permissionFor(operation),'edit')===true;
  }

  function deny(){
    window.toast?.('Bu rol işlemi için yetkiniz yok.');
    return Promise.reject(new Error('yetkisiz'));
  }

  function install(){
    const service=window.KullaniciYonetimiService;
    const repo=window.KullaniciYonetimiRepository;
    if(!service||!repo) return false;
    if(service.__roleOperationPolicyInstalled) return true;

    const originalSave=service.rolKaydet.bind(service);
    const originalDelete=service.rolSil.bind(service);

    service.rolKaydet=function(mevcutId,veri){
      return allowed(mevcutId?'edit':'create') ? originalSave(mevcutId,veri) : deny();
    };

    service.rolSil=function(id,atanmisKullaniciSayisi){
      return allowed('delete') ? originalDelete(id,atanmisKullaniciSayisi) : deny();
    };

    service.rolKopyala=function(kaynakId,veri={}){
      if(!allowed('clone')) return deny();
      const kaynak=window.DeviceData?.get?.('roller',kaynakId)||window.AppStore?.data?.('roller')?.find?.(x=>x.id===kaynakId);
      if(!kaynak) return Promise.reject(new Error('rol-bulunamadi'));
      const {id:_id,...kopya}=kaynak;
      const ad=String(veri.ad||kopya.ad||kopya.rolAdi||'Rol').trim();
      return repo.rolEkle({...kopya,...veri,ad,rolAdi:veri.rolAdi||ad});
    };

    service.rolIslemiYetkiliMi=allowed;
    service.__roleOperationPolicyInstalled=true;
    return true;
  }

  function wait(){
    if(install()) return;
    let n=0;
    const timer=setInterval(()=>{
      if(install()||++n>=240) clearInterval(timer);
    },50);
  }

  window.addEventListener('koruk:permission-catalog-ready',wait);
  wait();
})(window);
