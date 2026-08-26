/* Koruk Asistan — Kriter / Proje araçları V2 köprüsü
 * Tools presentation'a iki gerçek özelliği lazy olarak bağlar.
 * Legacy motorlar geçici olarak yalnız kullanım anında yüklenir; V2 karşılık
 * tamamlanmadan eski davranış silinmez.
 */
(function(global){
'use strict';
if(global.RubricToolsModule)return;

const TOOLS=[
  {key:'rubric',label:'Kriter Dağıtım',script:'js/kriter-dagitim.js',api:'KriterDagitimAraci',permission:'tools.gradebook'},
  {key:'project',label:'Proje Değerlendirme',script:'js/proje-degerlendirme.js',api:'ProjeDegerlendirmeAraci',permission:'tools.gradebook'}
];
let opening=false;

function canOpen(def){return global.PermissionService?.can?.(def.permission,'preview')!==false;}
async function load(def){
  if(global[def.api])return global[def.api];
  if(!global.AppLoader?.loadScript)throw new Error('AppLoader hazır değil.');
  await global.AppLoader.loadScript(def.script);
  if(!global[def.api])throw new Error(def.label+' yüklenemedi.');
  return global[def.api];
}
async function open(def){
  if(opening)return;
  if(!canOpen(def)){global.toast?.('Bu aracı görüntüleme yetkiniz yok.');return;}
  opening=true;
  try{
    const api=await load(def);
    if(typeof api.ac!=='function')throw new Error(def.label+' açma API’si bulunamadı.');
    api.ac();
  }catch(e){
    console.error('[RubricTools]',e);
    global.toast?.(def.label+' açılamadı: '+(e?.message||e));
  }finally{opening=false;}
}
function inject(){
  const host=document.querySelector('[data-tools-module]');
  const tabs=host?.querySelector('.ka-tabs');
  if(!tabs)return;
  for(const def of TOOLS){
    if(tabs.querySelector(`[data-rubric-tool="${def.key}"]`))continue;
    const b=document.createElement('button');
    b.type='button';
    b.className='ka-tab';
    b.dataset.rubricTool=def.key;
    b.dataset.kaPermission=def.permission;
    b.dataset.kaMinLevel='preview';
    b.textContent=def.label;
    b.onclick=()=>open(def);
    tabs.appendChild(b);
  }
  global.PermissionService?.apply?.(host);
}

global.RubricToolsModule={inject,open,keyList:()=>TOOLS.map(x=>x.key)};
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='tools')requestAnimationFrame(inject);});
})(window);
