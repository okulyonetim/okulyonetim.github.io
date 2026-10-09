/* Koruk Asistan — RolePermissionCatalog runtime bridge
 * Permission kataloğunu runtime'a bağlar ve merkezi navigasyon erişimini uygular.
 * Firestore şeması değiştirilmez; mevcut legacy alias'lar PermissionService tarafından korunur.
 */
(function(window){
  'use strict';
  let attempts=0;
  let navigationInstalled=false;

  const loadScript=(src,message)=>new Promise((resolve,reject)=>{
    const clean=src.split('?')[0];
    if([...document.scripts].some(s=>s.src.includes(clean)))return resolve();
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.onload=resolve;
    s.onerror=()=>reject(new Error(message));
    document.head.appendChild(s);
  });
  const loadEditor=()=>loadScript('js/core/role-permission-editor.js?v=4','Rol yetki editörü yüklenemedi.');
  const loadCrudGuards=()=>loadScript('js/core/role-permission-crud-guards.js?v=1','Granular CRUD yetki katmanı yüklenemedi.');

  const PAGE_PERMISSIONS=Object.freeze({
    'people:teachers':'people.teachers','people:classes':'people.classes','people:students':'people.students','people:student-attendance':'people.attendance',
    'academic:written':'academic.exams','academic:trial':'academic.trial','academic:results':'academic.results','academic:plans':'academic.plans','academic:schedule':'academic.schedule','academic:calendar':'academic.calendar',
    'management:duty':'management.duty','management:staff':'management.personnel','management:tasks':'management.tasks','management:leaves':'management.leaves','management:staff-leaves':'management.teacherLeaves','management:leave-annual':'management.teacherLeaves','management:leave-health':'management.teacherLeaves','management:leave-excuse':'management.teacherLeaves','management:leave-other':'management.teacherLeaves','management:puantaj':'management.puantaj','management:dilekce':'management.dilekce','management:meeting-schedule':'management.meetingSchedule',
    'communication:messages':'communication.messages','communication:announcements':'communication.announcements','communication:polls':'communication.polls','communication:news':'communication.news','communication:calendar':'communication.calendar','communication:notes':'communication.notes',
    'transport:services':'transport.services','transport:busSeats':'transport.seating','transport:classSeats':'transport.classSeating','transport:map':'transport.map',
    'food:daily':'food.menu','food:weekly':'food.menu','food:monthly':'food.menu','food:audit':'food.audit',
    'documents:evrak':'documents.tracking','documents:teblig':'documents.tracking','documents:pdf-images':'documents.pdf','documents:pdf-merge':'documents.pdf',
    'reports:home':'reports.view',
    'tools:checklists':'tools.checklists','tools:map':'tools.map','tools:attendance':'tools.attendance','tools:homework':'tools.gradebook','tools:grades':'tools.gradebook','tools:rubric-distribution':'tools.rubric','tools:project-evaluation':'tools.rubric',
    'tools:form-maarif':'tools.formMaarif','tools:form-belirli':'tools.formBelirliGunler','tools:form-sok':'tools.formSok','tools:form-zumre':'tools.formZumre','tools:form-kulup':'tools.formKulup','tools:form-rehberlik':'tools.formRehberlik','tools:form-bep':'tools.formBep','tools:form-diger':'tools.formDigerEvrak','tools:student-list':'management.teacherListBuilder',
    'settings:data':'settings.storage','settings:school':'settings.school','settings:users':'settings.users','settings:statistics':'settings.statistics','settings:roles':'settings.roles','settings:app':'settings.app','settings:storage':'settings.storage','settings:reminders':'tools.reminders'
  });

  const modulePermission=name=>`module.${String(name||'').trim()}`;
  const pagePermission=(name,page)=>PAGE_PERMISSIONS[`${String(name||'')}:${String(page||'')}`]||'';
  const isAdmin=()=>window.AKTIF_KULLANICI?.admin===true||window.AppStore?.get?.('session.user')?.admin===true;
  const can=(permission,level='read')=>isAdmin()||!!window.PermissionService?.can?.(permission,level);
  const allowedRoute=(name,page='')=>{
    if(isAdmin())return true;
    if(!can(modulePermission(name),'read'))return false;
    const specific=pagePermission(name,page);
    return !specific||can(specific,'read');
  };

  function installNavigationGuards(){
    if(navigationInstalled)return true;
    const shell=window.ShellUI;
    if(!shell?.routeModule)return false;
    const originalRoute=shell.routeModule.bind(shell);
    shell.routeModule=async function(name,options={}){
      const page=options?.page||'';
      if(!allowedRoute(name,page)){
        window.toast?.('Bu modüle veya sayfaya erişim yetkiniz yok.');
        return false;
      }
      return originalRoute(name,options);
    };
    shell.__rolePermissionNavigationInstalled=true;
    navigationInstalled=true;
    window.dispatchEvent(new CustomEvent('koruk:permission-navigation-ready'));
    return true;
  }

  function filterMenuDom(){
    if(!window.PermissionService)return;
    document.querySelectorAll('[data-ka-shell-route]').forEach(el=>{
      const name=el.dataset.kaShellRoute||'',page=el.dataset.kaShellPage||'';
      const allowed=allowedRoute(name,page);
      el.hidden=!allowed;
      el.setAttribute('aria-hidden',String(!allowed));
    });
    document.querySelectorAll('[data-ka-menu-group]').forEach(card=>{
      const group=String(card.dataset.kaMenuGroup||'');
      const moduleMap={people:'people',programs:'academic',communication:'communication',documents:'documents',transport:'transport',food:'food',management:'management',settings:'settings',exams:'academic',calendar:'communication'};
      const module=moduleMap[group];
      if(module)card.hidden=!can(modulePermission(module),'read');
    });
  }

  function watchMenu(){
    filterMenuDom();
    if(window.__rolePermissionMenuObserver)return;
    const observer=new MutationObserver(()=>filterMenuDom());
    observer.observe(document.body,{childList:true,subtree:true});
    window.__rolePermissionMenuObserver=observer;
  }

  const run=()=>{
    if(!window.RolePermissionCatalog?.mergeIntoPermissionService?.())return false;
    window.dispatchEvent(new CustomEvent('koruk:permission-catalog-ready'));
    loadEditor().catch(e=>console.warn('[RolePermissionEditor]',e?.message||e));
    loadCrudGuards().catch(e=>console.warn('[RolePermissionCrudGuards]',e?.message||e));
    watchMenu();
    if(!installNavigationGuards()){
      const timer=setInterval(()=>{
        if(installNavigationGuards()||++attempts>=120)clearInterval(timer);
      },50);
    }
    return true;
  };

  if(run())return;
  const timer=setInterval(()=>{
    if(run()||++attempts>=120)clearInterval(timer);
  },50);
})(window);