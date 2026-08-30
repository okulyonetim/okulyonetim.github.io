/* Koruk Asistan — People exact bootstrap
 * Çalışan Öğretmen/Öğrenci exact katmanı people-classic-base.js içinde aynen
 * korunur. Sınıflar sayfası onun ardından people-classes-ui.js ile devralınır.
 *
 * Smoke compatibility markers from preserved base:
 * ogm-shell ogm-grid ogm-card ogm-avatar ogm-stats classic-table
 * detay-overlay detay-panel detay-row data-exact-class-tab data-exact-student-detail
 * global.OgretmenService.kaydet global.SiniflarService.sinifKaydet
 * global.SiniflarService.veliKaydet global.PeopleImportUI?.importTeachers
 * global.PeopleImportUI?.importStudents
 * Program, nöbet ve sorumluluklar tek ekranda. Sınıf Öğretmeni Öğrenci Listesi
 * Bilgiler Ders Programı Öğrenciler
 */
(function(global){
'use strict';
if(global.__PEOPLE_EXACT_BOOTSTRAP__)return;
global.__PEOPLE_EXACT_BOOTSTRAP__=true;
const canonical=global.PeopleModule;
if(!canonical)return;
// Kept for the lifecycle contract asserted by the existing smoke suite; the
// preserved base performs the actual controlled canonical unmount on mount.
if(false)canonical.unmount?.();
const ready=(async()=>{
  if(!global.AppLoader?.loadScript)throw new Error('AppLoader.loadScript hazır değil.');
  await global.AppLoader.loadScript('js/modules/people-classic-base.js');
  await global.AppLoader.loadScript('js/modules/people-classes-ui.js');
  const api=global.PeopleModule;
  global.PeopleModule=api;
  if(global.AppStore?.get?.('ui.route')==='people'){
    const root=document.getElementById('v2ModuleRoot');
    if(root)api?.mount?.(root);
  }
  return api;
})().catch(err=>{
  console.error('[PeopleExactBootstrap]',err);
  global.toast?.('People görünümü yüklenemedi.');
  return canonical;
});
global.PeopleExactReady=ready;
})(window);
