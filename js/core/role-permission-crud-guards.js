/* Koruk Asistan — Granular CRUD permission guards
 * Tek merkezi runtime katmanından CRUD işlemlerini korur.
 * Firestore/IndexedDB şemasını değiştirmez; mevcut servisleri kullanır.
 */
(function(global){
  'use strict';
  if(global.RolePermissionCrudGuards)return;
  const isAdmin=()=>global.AKTIF_KULLANICI?.admin===true||global.AppStore?.get?.('session.user')?.admin===true;
  const can=(key,level='edit')=>isAdmin()||global.PermissionService?.can?.(key,level)===true;
  const deny=()=>{global.toast?.('Bu işlem için yetkiniz yok.');return Promise.reject(new Error('yetkisiz'));};
  function install(){
    const service=global.SiniflarService;
    if(service&&!service.__granularCrudPermissions){
      if(typeof service.veliKaydet==='function'){const original=service.veliKaydet.bind(service);service.veliKaydet=(id,data)=>can(id?'people.students.edit':'people.students.create')?original(id,data):deny();}
      if(typeof service.veliSil==='function'){const original=service.veliSil.bind(service);service.veliSil=id=>can('people.students.delete')?original(id):deny();}
      if(typeof service.sinifKaydet==='function'){const original=service.sinifKaydet.bind(service);service.sinifKaydet=(id,data)=>can(id?'people.classes.edit':'people.classes.create')?original(id,data):deny();}
      if(typeof service.sinifSil==='function'){const original=service.sinifSil.bind(service);service.sinifSil=id=>can('people.classes.delete')?original(id):deny();}
      service.__granularCrudPermissions=true;
    }
    const personnel=global.PersonelService;
    if(personnel&&!personnel.__granularCrudPermissions){
      if(typeof personnel.personelKaydet==='function'){const original=personnel.personelKaydet.bind(personnel);personnel.personelKaydet=(id,data)=>can('management.personnel.edit')?original(id,data):deny();}
      if(typeof personnel.personelSil==='function'){const original=personnel.personelSil.bind(personnel);personnel.personelSil=id=>can('management.personnel.edit')?original(id):deny();}
      personnel.__granularCrudPermissions=true;
    }
    const importer=global.PeopleImportUI;
    if(importer&&!importer.__granularStudentImportPermissions){for(const name of ['importStudents','importEOkul']){if(typeof importer[name]!=='function')continue;const original=importer[name].bind(importer);importer[name]=(...args)=>can('people.students.create')?original(...args):deny();}importer.__granularStudentImportPermissions=true;}
    const transport=global.TasimaService;
    if(transport&&!transport.__granularTransportPermissions){
      if(typeof transport.servisKaydet==='function'){
        const original=transport.servisKaydet.bind(transport);
        transport.servisKaydet=(id,data)=>can(id?'transport.services.edit':'transport.services.create')?original(id,data):deny();
      }
      if(typeof transport.servisSil==='function'){
        const original=transport.servisSil.bind(transport);
        transport.servisSil=id=>can('transport.services.delete')?original(id):deny();
      }
      transport.__granularTransportPermissions=true;
    }
    return !!service||!!personnel||!!importer||!!transport;
  }
  let attempts=0;const timer=setInterval(()=>{if(install()||++attempts>=240)clearInterval(timer)},50);
  global.RolePermissionCrudGuards={install};
})(window);