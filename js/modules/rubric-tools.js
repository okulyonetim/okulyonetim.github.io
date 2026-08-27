/* Koruk Asistan — Kriter / Proje araçları V2 köprüsü
 * Tools presentation'a iki aracı tek V2 engine üzerinden lazy bağlar.
 * Kriter ayar parity davranışları bu köprüde tutulur; ayrı adapter dosyası yoktur.
 * Diğer Evraklar, mevcut digerEvrak veri tipini ayrı menü sayfası olarak açar.
 * Diploma belgeleri mevcut okul/personel verilerini okuyup merkezi A4 rapor motorunu kullanır.
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
const DIPLOMA_REQUEST_PAGE='diploma-request';
const DIPLOMA_RESPONSE_PAGE='diploma-response';
let opening=false,otherDocumentsOpen=false,otherDocumentsUnsub=null,diplomaOpen=false,diplomaKind='',diplomaState=null;
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

function diplomaSchool(){const list=rows('okulBilgileri');return list.find(x=>x.id==='ayarlar')||list[0]||global.okulBilgileriAyari||{};}
function diplomaDirector(){const school=diplomaSchool(),teacher=rows('ogretmenler').find(x=>x.id===school.mudurId);return teacher?`${teacher.ad||''} ${teacher.soyad||''}`.trim():(school.mudurAdi||school.mudurAdSoyad||'');}
function dateTr(v){if(!v)return'....../....../............';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('tr-TR');}
function diplomaDefaultState(kind){const school=diplomaSchool();return kind===DIPLOMA_RESPONSE_PAGE?{adSoyad:'',tc:'',babaAdi:'',kizOglu:'kızı',dogumTarihiIso:'',ogrenimSuresi:'',diplomaTarihiIso:'',diplomaSayisi:'',adres:'',cepNo:'',muduAdiManuel:diplomaDirector(),okulAdiManuel:school.okulAdi||'',govdeManuel:''}:{adSoyad:'',tc:'',babaAdi:'',anneAdi:'',dogumYeri:'',dogumTarihiIso:'',mezuniyetTarihiIso:'',mezunSinif:'',adres:'',okulAdiManuel:school.okulAdi||'',govdeManuel:''};}
function diplomaAutoBody(state,kind){const okul=state.okulAdiManuel||diplomaSchool().okulAdi||'...........................';if(kind===DIPLOMA_RESPONSE_PAGE)return `Dilekçe sahibi ${state.tc||'..........................'} T.C. Kimlik Nolu, ${dateTr(state.dogumTarihiIso)} doğumlu, ${state.babaAdi||'...........................'} ${state.kizOglu||'kızı/oğlu'} ${state.adSoyad||'...........................'}'ın ${okul}'ndan (${state.ogrenimSuresi||'.....'} yıllık) ${dateTr(state.diplomaTarihiIso)} tarih ve ${state.diplomaSayisi||'............'} sayılı diplomayı almaya hak kazandığı resmi kayıtların incelenmesinden anlaşılmıştır.`;return `${dateTr(state.mezuniyetTarihiIso)} tarihinde ${okul}'ndan mezun oldum. Diplomamı kaybettiğimden tarafıma diploma kayıt örneği düzenlenmesi hususunda;`;}
function diplomaReportBody(state,kind){const school=diplomaSchool(),okul=(state.okulAdiManuel||school.okulAdi||'KORUK İLK-ORTAOKULU').toLocaleUpperCase('tr'),il=String(school.il||'').toLocaleUpperCase('tr'),govde=state.govdeManuel?.trim()||diplomaAutoBody(state,kind),common=`font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.6;color:#000`;if(kind===DIPLOMA_RESPONSE_PAGE){const mudur=state.muduAdiManuel||diplomaDirector();return `<div style="${common}"><div style="text-align:center;font-weight:700">T.C.<br>${esc(il)} VALİLİĞİ<br>${esc(okul)} MÜDÜRLÜĞÜ</div><h2 style="text-align:center;text-decoration:underline;margin:24px 0">DİPLOMA KAYIT ÖRNEĞİ</h2><p style="text-indent:36px;text-align:justify">${esc(govde)}</p><div style="display:flex;justify-content:space-between;margin-top:52px"><div><div>Adres: ${esc(state.adres||'')}</div><div style="margin-top:24px">Cep No: ${esc(state.cepNo||'')}</div></div><div style="text-align:center;min-width:180px"><div>....../....../............</div><div style="margin-top:24px">${esc(mudur||'')}</div><div>Okul Müdürü</div></div></div></div>`;}return `<div style="${common}"><div style="text-align:center;font-weight:700">${esc(okul)} MÜDÜRLÜĞÜNE<br>${esc(il)}</div><h3 style="text-align:center;text-decoration:underline;margin:20px 0">Dilekçe Sahibinin;</h3><table style="width:100%;border-collapse:collapse;margin-bottom:24px"><tbody>${[['T.C. Kimlik No.su',state.tc],['Adı ve Soyadı',state.adSoyad],['Baba Adı',state.babaAdi],['Anne Adı',state.anneAdi],['Doğum Yeri',state.dogumYeri],['Doğum Tarihi',dateTr(state.dogumTarihiIso)],['Mezun Olduğu Sınıf',state.mezunSinif]].map(([k,v])=>`<tr><td style="width:190px;padding:4px 0">${esc(k)}</td><td style="width:18px">:</td><td>${esc(v||'')}</td></tr>`).join('')}</tbody></table><p style="text-indent:36px;text-align:justify">${esc(govde)}</p><p style="text-indent:36px;margin-top:18px">Gereğini arz ederim.</p><div style="display:flex;justify-content:space-between;margin-top:48px"><div>Adres: ${esc(state.adres||'')}</div><div style="text-align:center;min-width:180px"><div>imza</div><div style="margin-top:8px">....../....../............</div><div style="margin-top:8px;font-weight:700">${esc(state.adSoyad||'')}</div></div></div></div>`;}
function diplomaFieldsHtml(state,kind){const field=(name,label,type='text',extra='')=>`<label class="ka-field"><span class="ka-field__label">${label}</span><input data-diploma-field="${name}" type="${type}" value="${esc(state[name]||'')}" ${extra}></label>`;if(kind===DIPLOMA_RESPONSE_PAGE)return `<div class="ka-grid">${field('adSoyad','Adı ve Soyadı')}${field('tc','T.C. Kimlik No','text','maxlength="11"')}</div><div class="ka-grid">${field('babaAdi','Baba Adı')}<label class="ka-field"><span class="ka-field__label">Kız/Oğul</span><select data-diploma-field="kizOglu"><option value="kızı" ${state.kizOglu==='kızı'?'selected':''}>kızı</option><option value="oğlu" ${state.kizOglu==='oğlu'?'selected':''}>oğlu</option></select></label></div><div class="ka-grid">${field('dogumTarihiIso','Doğum Tarihi','date')}${field('ogrenimSuresi','Öğrenim Süresi (yıl)','number','min="1" max="12"')}</div><div class="ka-grid">${field('diplomaTarihiIso','Diploma Tarihi','date')}${field('diplomaSayisi','Diploma Sayısı')}</div><div class="ka-grid">${field('adres','Adres')}${field('cepNo','Cep No')}</div>${field('muduAdiManuel','Okul Müdürü Adı Soyadı')}${field('okulAdiManuel','Okul Adı')}`;return `<div class="ka-grid">${field('adSoyad','Adı ve Soyadı')}${field('tc','T.C. Kimlik No','text','maxlength="11"')}</div><div class="ka-grid">${field('babaAdi','Baba Adı')}${field('anneAdi','Anne Adı')}</div>${field('dogumYeri','Doğum Yeri')}<div class="ka-grid">${field('dogumTarihiIso','Doğum Tarihi','date')}${field('mezuniyetTarihiIso','Mezuniyet Tarihi','date')}</div><div class="ka-grid">${field('mezunSinif','Mezun Olduğu Sınıf')}${field('adres','Adres')}</div>${field('okulAdiManuel','Okul Adı')}`;}
function renderDiplomaPage(){if(!diplomaOpen||!diplomaState)return;const root=document.getElementById('v2ModuleRoot');if(!root)return;const response=diplomaKind===DIPLOMA_RESPONSE_PAGE,title=response?'Diploma Okul Dilekçesi':'Diploma Kayıt Talep Dilekçesi',auto=diplomaAutoBody(diplomaState,diplomaKind);document.getElementById('v2ModuleTitle').textContent=title;root.innerHTML=`<section class="ka-stack" data-diploma-page><div><h2>${title}</h2><p class="ka-muted">Eski uygulamadaki gerçek diploma belge alanları korunarak merkezi A4 çıktı motoruna taşındı.</p></div><article class="ka-card"><div class="ka-card__body ka-stack">${diplomaFieldsHtml(diplomaState,diplomaKind)}<label class="ka-field"><span class="ka-field__label">Belge Metni</span><textarea data-diploma-body rows="5" placeholder="Boş bırakırsanız otomatik metin kullanılır.">${esc(diplomaState.govdeManuel||'')}</textarea><small class="ka-muted">Otomatik metin: ${esc(auto)}</small></label><div class="ka-row"><button class="ka-btn ka-btn--secondary" type="button" data-diploma-reset>Otomatik Metne Dön</button><button class="ka-btn" type="button" data-diploma-print>A4 Önizle / Yazdır</button></div></div></article><article class="ka-card"><div class="ka-card__header"><h3>Belge Önizlemesi</h3></div><div class="ka-card__body" style="background:#fff;color:#000;overflow:auto">${diplomaReportBody(diplomaState,diplomaKind)}</div></article></section>`;root.querySelectorAll('[data-diploma-field]').forEach(el=>{const event=el.tagName==='SELECT'?'change':'input';el.addEventListener(event,()=>{diplomaState[el.dataset.diplomaField]=el.value;renderDiplomaPage();});});root.querySelector('[data-diploma-body]')?.addEventListener('input',e=>{diplomaState.govdeManuel=e.target.value;});root.querySelector('[data-diploma-reset]')?.addEventListener('click',()=>{diplomaState.govdeManuel='';renderDiplomaPage();});root.querySelector('[data-diploma-print]')?.addEventListener('click',()=>{if(!global.ReportEngine?.printReport)return toast('Rapor motoru hazır değil.');const name=(diplomaState.adSoyad||'Diploma').replace(/\s+/g,'_');global.ReportEngine.printReport(title,diplomaReportBody(diplomaState,diplomaKind),{fileName:`${response?'Diploma_Kayit_Ornegi':'Diploma_Talep'}_${name}`,yon:'dikey'});});global.PermissionService?.apply?.(root);}
function cleanupDiploma(){diplomaOpen=false;diplomaKind='';diplomaState=null;}
async function openDiploma(kind){if(global.PermissionService?.can?.('management.personnel','preview')===false)return toast('Bu sayfayı görüntüleme yetkiniz yok.');cleanupDiploma();const title=kind===DIPLOMA_RESPONSE_PAGE?'Diploma Okul Dilekçesi':'Diploma Kayıt Talep Dilekçesi';await global.ShellUI?.routeModule?.('management',{bottom:'menu',title});global.ManagementModule?.unmount?.();diplomaKind=kind;diplomaState=diplomaDefaultState(kind);diplomaOpen=true;renderDiplomaPage();}
function installDiplomaRoutes(){const groups=global.ShellUI?.MENU_GROUPS;if(!Array.isArray(groups))return;const group=groups.find(x=>x.key==='management');if(!group)return;group.items=Array.isArray(group.items)?group.items:[];if(!group.items.some(x=>x?.[3]===DIPLOMA_REQUEST_PAGE))group.items.push(['Diploma Kayıt Talep Dilekçesi','🎓','management',DIPLOMA_REQUEST_PAGE]);if(!group.items.some(x=>x?.[3]===DIPLOMA_RESPONSE_PAGE))group.items.push(['Diploma Okul Dilekçesi','🏫','management',DIPLOMA_RESPONSE_PAGE]);if(global.__diplomaRoutesInstalled)return;global.__diplomaRoutesInstalled=true;document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-ka-menu-page]');const page=b?.dataset?.kaMenuPage;if(page!==DIPLOMA_REQUEST_PAGE&&page!==DIPLOMA_RESPONSE_PAGE)return;e.preventDefault();e.stopImmediatePropagation();openDiploma(page).catch(err=>{console.error('[Diploma/open]',err);toast('Diploma belgesi açılamadı.');});},true);}

global.RubricToolsModule={inject,open,keyList:()=>TOOLS.map(x=>x.key),createCategory,deleteCustom,openOtherDocuments,openDiploma};
installOtherDocumentsRoute();
installDiplomaRoutes();
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='tools')requestAnimationFrame(inject);else if(otherDocumentsOpen)cleanupOtherDocuments();if(diplomaOpen&&e.detail?.name!=='management')cleanupDiploma();});
})(window);