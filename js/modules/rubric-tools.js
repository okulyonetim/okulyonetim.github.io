/* Koruk Asistan — Kriter / Proje araçları V2 köprüsü
 * Tools presentation'a iki aracı tek V2 engine üzerinden lazy bağlar.
 * Kriter ayar parity davranışları bu köprüde tutulur; ayrı adapter dosyası yoktur.
 * Diğer Evraklar, mevcut digerEvrak veri tipini ayrı menü sayfası olarak açar.
 */
(function(global){
'use strict';
if(global.RubricToolsModule)return;

const ENGINE='js/modules/rubric-tools-engine.js';
const TOOLS=[
  {key:'rubric',label:'Kriter Dağıtım',api:'KriterDagitimAraci',permission:'tools.gradebook'},
  {key:'project',label:'Proje Değerlendirme',api:'ProjeDegerlendirmeAraci',permission:'tools.gradebook'}
];
const OTHER_DOCUMENT_PAGE='other-documents';
let opening=false,otherDocumentsOpen=false,otherDocumentsUnsub=null;
const toast=m=>global.toast?.(m);
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[];};

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

function otherDocumentTeacherName(id){const o=rows('ogretmenler').find(x=>x.id===id);return o?`${o.ad||''} ${o.soyad||''}`.trim():'—';}
function otherDocumentCanEdit(){return global.PermissionService?.can?.('tools.schedules','edit')!==false;}
function otherDocumentSort(){return rows('digerEvrak').slice().sort((a,b)=>String(b.tarih||b.olusturmaTarihi||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.olusturmaTarihi||a.eklenmeTarihi||'')));}
function closeOtherDocumentModal(){document.querySelector('[data-other-document-modal]')?.remove();}
function renderOtherDocuments(){
  if(!otherDocumentsOpen)return;
  const root=document.getElementById('v2ModuleRoot');if(!root)return;
  const list=otherDocumentSort(),edit=otherDocumentCanEdit();
  const title=document.getElementById('v2ModuleTitle');if(title)title.textContent='Diğer Evraklar';
  root.innerHTML=`<section class="ka-stack" data-other-documents-page><div class="ka-row ka-row--between"><div><h2>Diğer Evraklar</h2><p class="ka-muted">Standart modüller dışında kalan okul evraklarını cihazdan yönetin.</p></div><span class="ka-badge">${list.length} kayıt</span></div>${edit?'<button class="ka-btn" type="button" data-other-document-new>+ Yeni Evrak</button>':''}<div class="ka-stack">${list.length?list.map(r=>`<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>${esc(r.baslik||'Evrak')}</strong><div class="ka-muted">${[r.tarih?new Date(r.tarih+'T00:00:00').toLocaleDateString('tr-TR'):'',r.ogretmenId?otherDocumentTeacherName(r.ogretmenId):''].filter(Boolean).map(esc).join(' · ')}</div>${r.aciklama?`<div>${esc(r.aciklama)}</div>`:''}</div>${edit?`<div class="ka-row"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-other-document-edit="${esc(r.id)}">Düzenle</button><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-other-document-delete="${esc(r.id)}">Sil</button></div>`:''}</div></article>`).join(''):'<div class="ka-empty">Henüz diğer evrak kaydı bulunmuyor.</div>'}</div></section>`;
  root.querySelector('[data-other-document-new]')?.addEventListener('click',()=>openOtherDocumentModal());
  root.querySelectorAll('[data-other-document-edit]').forEach(b=>b.addEventListener('click',()=>openOtherDocumentModal(list.find(x=>x.id===b.dataset.otherDocumentEdit)||null)));
  root.querySelectorAll('[data-other-document-delete]').forEach(b=>b.addEventListener('click',async()=>{const item=list.find(x=>x.id===b.dataset.otherDocumentDelete);if(!item||!global.confirm?.(`“${item.baslik||'Evrak'}” kaydı silinsin mi?`))return;try{await global.CizelgelerService?.kayitSil?.('digerEvrak',item.id);toast('Evrak silindi.');}catch(e){console.error('[OtherDocuments/delete]',e);toast('Evrak silinemedi: '+(e?.message||e));}}));
  global.PermissionService?.apply?.(root);
}
function openOtherDocumentModal(item=null){
  if(!otherDocumentCanEdit())return toast('Bu sayfayı düzenleme yetkiniz yok.');
  closeOtherDocumentModal();
  const teachers=rows('ogretmenler').slice().sort((a,b)=>`${a.ad||''} ${a.soyad||''}`.localeCompare(`${b.ad||''} ${b.soyad||''}`,'tr'));
  const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.otherDocumentModal='';
  ov.innerHTML=`<form class="ka-modal"><header class="ka-modal__header"><h3>${item?'Evrakı Düzenle':'Yeni Evrak'}</h3><button class="ka-icon-button" type="button" data-close aria-label="Kapat">×</button></header><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Başlık *</span><input name="baslik" required value="${esc(item?.baslik||'')}"></label><label class="ka-field"><span class="ka-field__label">Sorumlu</span><select name="ogretmenId"><option value="">— Seçiniz —</option>${teachers.map(o=>`<option value="${esc(o.id)}" ${o.id===item?.ogretmenId?'selected':''}>${esc(`${o.ad||''} ${o.soyad||''}`.trim())}${o.brans?` (${esc(o.brans)})`:''}</option>`).join('')}</select></label><label class="ka-field"><span class="ka-field__label">Tarih</span><input name="tarih" type="date" value="${esc(item?.tarih||'')}"></label><label class="ka-field"><span class="ka-field__label">Açıklama</span><textarea name="aciklama">${esc(item?.aciklama||'')}</textarea></label></div><footer class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-close>Vazgeç</button><button class="ka-btn" type="submit">Kaydet</button></footer></form>`;
  document.body.appendChild(ov);
  ov.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeOtherDocumentModal));ov.addEventListener('click',e=>{if(e.target===ov)closeOtherDocumentModal();});
  ov.querySelector('form')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),veri={baslik:String(fd.get('baslik')||'').trim(),ogretmenId:String(fd.get('ogretmenId')||''),tarih:String(fd.get('tarih')||''),aciklama:String(fd.get('aciklama')||'').trim()};if(!veri.baslik)return toast('Başlık zorunludur.');try{await global.CizelgelerService?.kayitKaydet?.('digerEvrak',item?.id||null,veri);closeOtherDocumentModal();toast('Evrak kaydedildi.');}catch(err){console.error('[OtherDocuments/save]',err);toast('Evrak kaydedilemedi: '+(err?.message||err));}});
}
function cleanupOtherDocuments(){otherDocumentsOpen=false;otherDocumentsUnsub?.();otherDocumentsUnsub=null;closeOtherDocumentModal();}
async function openOtherDocuments(){
  if(global.PermissionService?.can?.('tools.schedules','preview')===false)return toast('Bu sayfayı görüntüleme yetkiniz yok.');
  cleanupOtherDocuments();
  await global.ShellUI?.routeModule?.('tools',{bottom:'menu',title:'Diğer Evraklar'});
  global.ToolsModule?.unmount?.();
  await global.ToolsData?.prepareForms?.();
  otherDocumentsOpen=true;
  otherDocumentsUnsub=global.AppStore?.subscribe?.('data.digerEvrak',()=>requestAnimationFrame(renderOtherDocuments))||null;
  renderOtherDocuments();
}
function installOtherDocumentsRoute(){
  const groups=global.ShellUI?.MENU_GROUPS;if(!Array.isArray(groups))return;
  const group=groups.find(x=>x.key==='documents');if(!group)return;
  group.subItems=Array.isArray(group.subItems)?group.subItems:[];
  if(!group.subItems.some(x=>x?.[3]===OTHER_DOCUMENT_PAGE))group.subItems.push(['Diğer Evraklar','📎','tools',OTHER_DOCUMENT_PAGE]);
  if(global.__otherDocumentsRouteInstalled)return;global.__otherDocumentsRouteInstalled=true;
  document.addEventListener('click',e=>{const b=e.target?.closest?.(`[data-ka-menu-page="${OTHER_DOCUMENT_PAGE}"]`);if(!b)return;e.preventDefault();e.stopImmediatePropagation();openOtherDocuments().catch(err=>{console.error('[OtherDocuments/open]',err);toast('Diğer Evraklar açılamadı.');});},true);
}

global.RubricToolsModule={inject,open,keyList:()=>TOOLS.map(x=>x.key),createCategory,deleteCustom,openOtherDocuments};
installOtherDocumentsRoute();
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='tools')requestAnimationFrame(inject);else if(otherDocumentsOpen)cleanupOtherDocuments();});
})(window);