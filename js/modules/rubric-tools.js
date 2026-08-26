/* Koruk Asistan — Kriter / Proje araçları V2 köprüsü
 * Tools presentation'a iki aracı tek V2 engine üzerinden lazy bağlar.
 * Kriter ayar parity davranışları bu köprüde tutulur; ayrı adapter dosyası yoktur.
 */
(function(global){
'use strict';
if(global.RubricToolsModule)return;

const ENGINE='js/modules/rubric-tools-v2-engine.js';
const TOOLS=[
  {key:'rubric',label:'Kriter Dağıtım',api:'KriterDagitimAraci',permission:'tools.gradebook'},
  {key:'project',label:'Proje Değerlendirme',api:'ProjeDegerlendirmeAraci',permission:'tools.gradebook'}
];
let opening=false;
const toast=m=>global.toast?.(m);
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

function canOpen(def){return global.PermissionService?.can?.(def.permission,'preview')!==false;}
function settingsBackdrop(){return document.querySelector('.ka-modal-backdrop[style*="100000"]');}
async function currentRubric(){const s=global.RubricSettingsService;return clone((await s?.personalGet?.('rubric'))||s?.schoolGet?.('rubric')||null);}
function modal(title,body,actions){const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.style.zIndex='100001';ov.innerHTML=`<section class="ka-modal"><header class="ka-modal__header"><h3>${title}</h3></header><div class="ka-modal__body">${body}</div><footer class="ka-modal__footer">${actions}</footer></section>`;document.body.appendChild(ov);return ov;}
function closeSettings(){settingsBackdrop()?.remove();}
async function createCategory(){
  const full=await currentRubric();
  if(!full?.varsayilan?.gruplar){toast('Önce genel ölçütleri bu cihaza kaydedin.');return;}
  const ov=modal('Yeni kategori',`<div class="ka-field"><label class="ka-field__label" for="rtnewname">Yeni kategori adı</label><input id="rtnewname" autocomplete="off" placeholder="Örn. Fen Bilimleri"></div>`,`<button type="button" class="ka-btn ka-btn--secondary" id="rtnewcancel">Vazgeç</button><button type="button" class="ka-btn" id="rtnewsave">Oluştur</button>`);
  ov.querySelector('#rtnewcancel').onclick=()=>ov.remove();
  ov.querySelector('#rtnewsave').onclick=async()=>{const name=ov.querySelector('#rtnewname').value.trim();if(!name)return toast('Kategori adı girin.');full.dersOzel=full.dersOzel||{};if(full.dersOzel[name])return toast('Bu kategori zaten var.');full.dersOzel[name]=clone(full.varsayilan);await global.RubricSettingsService.personalSet('rubric',full);ov.remove();closeSettings();toast('Kategori cihaz verisine kaydedildi. Ölçütler panelini yeniden açabilirsiniz.');};
  ov.querySelector('#rtnewname').focus();
}
async function deleteCustom(target){
  const full=await currentRubric();if(!full?.dersOzel?.[target])return toast('Silinecek özel ölçüt bulunamadı.');
  if(!global.confirm?.(`“${target}” özel ölçütleri silinsin ve genel varsayılana dönülsün mü?`))return;
  delete full.dersOzel[target];await global.RubricSettingsService.personalSet('rubric',full);closeSettings();toast('Özel ölçüt silindi; genel varsayılana dönüldü.');
}
function addDeleteButton(){const sel=document.getElementById('rtd'),foot=settingsBackdrop()?.querySelector('.ka-modal__footer');if(!sel||!foot||!sel.value||sel.value==='__new__'||document.getElementById('rtdeletecustom'))return;const b=document.createElement('button');b.type='button';b.id='rtdeletecustom';b.className='ka-btn ka-btn--secondary';b.textContent='Sil, varsayılana dön';b.onclick=()=>deleteCustom(sel.value);foot.prepend(b);}
function installSettingsParity(){
  if(global.__rubricSettingsParityInstalled)return;global.__rubricSettingsParityInstalled=true;
  const mo=new MutationObserver(()=>addDeleteButton());mo.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('change',e=>{if(e.target?.id!=='rtd')return;setTimeout(addDeleteButton,0);if(e.target.value!=='__new__')return;e.preventDefault();e.stopImmediatePropagation();e.target.value='';createCategory().catch(err=>{console.error('[RubricTools/createCategory]',err);toast('Kategori oluşturulamadı.');});},true);
  document.addEventListener('click',e=>{if(e.target?.id!=='rtcloud')return;if(!global.confirm?.('Okul varsayılanı mevcut cihaz ayarının üzerine yüklensin mi?')){e.preventDefault();e.stopImmediatePropagation();}},true);
}
async function load(def){
  if(!global.AppLoader?.loadScript)throw new Error('AppLoader hazır değil.');
  if(!global[def.api])await global.AppLoader.loadScript(ENGINE);
  installSettingsParity();
  if(!global[def.api])throw new Error(def.label+' V2 engine yüklenemedi.');
  return global[def.api];
}
async function open(def){
  if(opening)return;
  if(!canOpen(def)){toast('Bu aracı görüntüleme yetkiniz yok.');return;}
  opening=true;
  try{const api=await load(def);if(typeof api.ac!=='function')throw new Error(def.label+' açma API’si bulunamadı.');api.ac();}
  catch(e){console.error('[RubricTools]',e);toast(def.label+' açılamadı: '+(e?.message||e));}
  finally{opening=false;}
}
function inject(){
  const host=document.querySelector('[data-tools-module]');const tabs=host?.querySelector('.ka-tabs');if(!tabs)return;
  for(const def of TOOLS){if(tabs.querySelector(`[data-rubric-tool="${def.key}"]`))continue;const b=document.createElement('button');b.type='button';b.className='ka-tab';b.dataset.rubricTool=def.key;b.dataset.kaPermission=def.permission;b.dataset.kaMinLevel='preview';b.textContent=def.label;b.onclick=()=>open(def);tabs.appendChild(b);}
  global.PermissionService?.apply?.(host);
}

global.RubricToolsModule={inject,open,keyList:()=>TOOLS.map(x=>x.key),createCategory,deleteCustom};
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='tools')requestAnimationFrame(inject);});
})(window);
