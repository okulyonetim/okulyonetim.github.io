/* Koruk Asistan — Granular CRUD permission guards
 * Tek merkezi runtime katmanından öğrenci/sınıf CRUD işlemlerini korur.
 * Firestore/IndexedDB şemasını değiştirmez; mevcut servisleri kullanır.
 */
(function(global){
  'use strict';
  if(global.RolePermissionCrudGuards)return;

  const isAdmin=()=>global.AKTIF_KULLANICI?.admin===true||global.AppStore?.get?.('session.user')?.admin===true;
  const can=(key,level='edit')=>isAdmin()||global.PermissionService?.can?.(key,level)===true;
  const deny=()=>{ global.toast?.('Bu işlem için yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); };

  function install(){
    const service=global.SiniflarService;
    if(service&&!service.__granularCrudPermissions){
      if(typeof service.veliKaydet==='function'){
        const original=service.veliKaydet.bind(service);
        service.veliKaydet=(id,data)=>can(id?'people.students.edit':'people.students.create','edit')?original(id,data):deny();
      }
      if(typeof service.veliSil==='function'){
        const original=service.veliSil.bind(service);
        service.veliSil=id=>can('people.students.delete','edit')?original(id):deny();
      }
      if(typeof service.sinifKaydet==='function'){
        const original=service.sinifKaydet.bind(service);
        service.sinifKaydet=(id,data)=>can(id?'people.classes.edit':'people.classes.create','edit')?original(id,data):deny();
      }
      if(typeof service.sinifSil==='function'){
        const original=service.sinifSil.bind(service);
        service.sinifSil=id=>can('people.classes.delete','edit')?original(id):deny();
      }
      service.__granularCrudPermissions=true;
    }

    const importer=global.PeopleImportUI;
    if(importer&&!importer.__granularStudentImportPermissions){
      for(const name of ['importStudents','importEOkul']){
        if(typeof importer[name]!=='function')continue;
        const original=importer[name].bind(importer);
        importer[name]=(...args)=>can('people.students.create','edit')?original(...args):deny();
      }
      importer.__granularStudentImportPermissions=true;
    }
    return !!service||!!importer;
  }

  let attempts=0;
  const timer=setInterval(()=>{if(install()||++attempts>=240)clearInterval(timer)},50);
  global.RolePermissionCrudGuards={install};
})(window);