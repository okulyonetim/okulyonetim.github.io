/* Koruk Asistan — Kriter / Proje araçları V2 köprüsü
 * Tools presentation'a iki aracı tek V2 engine üzerinden lazy bağlar.
 * Kriter/Proje görünür davranışının tek sahibi rubric-tools-engine.js dosyasıdır.
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
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[];};

function canOpen(def){return global.PermissionService?.can?.(def.permission,'preview')!==false;}
async function load(def){
  if(!global.AppLoader?.loadScript)throw new Error('AppLoader hazır değil.');
  if(!global[def.api])await global.AppLoader.loadScript(ENGINE);
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
async function openPage(page){const def=TOOLS.find(x=>x.key===page);if(!def)return false;await open(def);return true}

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
async function activateOtherDocuments(){
  if(global.PermissionService?.can?.('tools.schedules','preview')===false)return toast('Bu sayfayı görüntüleme yetkiniz yok.');
  cleanupOtherDocuments();
  await global.AppLoader?.load?.('tools');
  global.ToolsModule?.unmount?.();
  await global.ToolsData?.prepareForms?.();
  otherDocumentsOpen=true;
  otherDocumentsUnsub=global.AppStore?.subscribe?.('data.digerEvrak',()=>requestAnimationFrame(renderOtherDocuments))||null;
  renderOtherDocuments();return true;
}
async function openOtherDocuments(){return global.ShellUI?.routeModule?.('tools',{bottom:'menu',page:OTHER_DOCUMENT_PAGE,title:'Diğer Evraklar'});}
function installOtherDocumentsRoute(){
  const groups=global.ShellUI?.MENU_GROUPS;if(!Array.isArray(groups))return;
  const group=groups.find(x=>x.key==='documents');if(!group)return;
  group.subItems=Array.isArray(group.subItems)?group.subItems:[];
  if(!group.subItems.some(x=>x?.[3]===OTHER_DOCUMENT_PAGE))group.subItems.push(['Diğer Evraklar','📎','tools',OTHER_DOCUMENT_PAGE]);
  if(global.__otherDocumentsRouteInstalled)return;global.__otherDocumentsRouteInstalled=true;
  global.ShellUI?.registerPageRoute?.(OTHER_DOCUMENT_PAGE,activateOtherDocuments);
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
async function activateDiploma(kind){if(global.PermissionService?.can?.('management.personnel','preview')===false)return toast('Bu sayfayı görüntüleme yetkiniz yok.');cleanupDiploma();await global.AppLoader?.load?.('management');global.ManagementModule?.unmount?.();diplomaKind=kind;diplomaState=diplomaDefaultState(kind);diplomaOpen=true;renderDiplomaPage();return true;}
async function openDiploma(kind){const title=kind===DIPLOMA_RESPONSE_PAGE?'Diploma Okul Dilekçesi':'Diploma Kayıt Talep Dilekçesi';return global.ShellUI?.routeModule?.('management',{bottom:'menu',page:kind,title});}
function installDiplomaRoutes(){const groups=global.ShellUI?.MENU_GROUPS;if(!Array.isArray(groups))return;const group=groups.find(x=>x.key==='management');if(!group)return;group.items=Array.isArray(group.items)?group.items:[];if(!group.items.some(x=>x?.[3]===DIPLOMA_REQUEST_PAGE))group.items.push(['Diploma Kayıt Talep Dilekçesi','🎓','management',DIPLOMA_REQUEST_PAGE]);if(!group.items.some(x=>x?.[3]===DIPLOMA_RESPONSE_PAGE))group.items.push(['Diploma Okul Dilekçesi','🏫','management',DIPLOMA_RESPONSE_PAGE]);if(global.__diplomaRoutesInstalled)return;global.__diplomaRoutesInstalled=true;global.ShellUI?.registerPageRoute?.(DIPLOMA_REQUEST_PAGE,()=>activateDiploma(DIPLOMA_REQUEST_PAGE));global.ShellUI?.registerPageRoute?.(DIPLOMA_RESPONSE_PAGE,()=>activateDiploma(DIPLOMA_RESPONSE_PAGE));}

global.RubricToolsModule={openPage,open,keyList:()=>TOOLS.map(x=>x.key),openOtherDocuments,openDiploma};
installOtherDocumentsRoute();
installDiplomaRoutes();
global.addEventListener('koruk:module-ready',()=>{if(otherDocumentsOpen)cleanupOtherDocuments();if(diplomaOpen)cleanupDiploma();});
})(window);

/* PDF araçlarının menü/routing köprüsü. Motor js/modules/documents.js içindedir. */
(function(global){
'use strict';
if(global.__documentsPdfRoutesInstalled)return;
const IMAGE='pdf-images',MERGE='pdf-merge';
function install(){const groups=global.ShellUI?.MENU_GROUPS;if(!Array.isArray(groups))return false;const group=groups.find(x=>x.key==='documents');if(!group)return false;group.items=Array.isArray(group.items)?group.items:[];if(!group.items.some(x=>x?.[3]===IMAGE))group.items.push(['Resimden PDF Oluştur','🖼️','documents',IMAGE]);if(!group.items.some(x=>x?.[3]===MERGE))group.items.push(['PDF Birleştir','🔗','documents',MERGE]);if(!global.__documentsPdfRoutesInstalled){global.__documentsPdfRoutesInstalled=true;global.ShellUI?.registerPageRoute?.(IMAGE,()=>open(IMAGE));global.ShellUI?.registerPageRoute?.(MERGE,()=>open(MERGE));}return true;}
async function open(page){if(global.PermissionService?.can?.('documents.view','preview')===false)return global.toast?.('Bu aracı görüntüleme yetkiniz yok.');await global.AppLoader?.load?.('documents');if(!global.DocumentsPdfTools?.open)throw new Error('PDF araç motoru hazır değil.');return global.DocumentsPdfTools.open(page);}
install();global.addEventListener('koruk:app-ready',install);global.addEventListener('koruk:app-config-changed',install);
})(window);

/* Öğrenci Devamsızlığı — mevcut local-first YoklamaService üzerinde ayrı yönetici sayfası. */
(function(global){
'use strict';
if(global.StudentAbsencePage)return;
const PAGE='student-absence';
let mounted=false,date='',unsubs=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const root=()=>document.getElementById('v2ModuleRoot');
const toast=m=>global.toast?.(m);
const today=()=>global.YoklamaService?.bugununTarihi?.()||new Date().toISOString().slice(0,10);
function cleanup(){mounted=false;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];}
function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];for(const p of ['data.yoklama','data.veliler','data.siniflar']){const off=global.AppStore?.subscribe?.(p,()=>{if(mounted)requestAnimationFrame(render)});if(off)unsubs.push(off)}}
function card(s){const wa=global.YoklamaService?.whatsappLinkOlustur?.(s),sms=global.YoklamaService?.smsLinkOlustur?.(s),status=s.durum==='gec'?'Geç':'Yok';return `<article class="ka-card ka-list-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div class="ka-grow"><strong>${esc(s.ogrenciAdi||'Öğrenci')}</strong><div class="ka-muted">${esc([s.sinifAdi,s.veliAdi,s.telefon].filter(Boolean).join(' · '))}</div></div><span class="ka-badge">${esc(status)}</span></div><div class="ka-row ka-wrap">${wa?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-absence-contact="wa" data-sinif="${esc(s.sinifId)}" data-ogrenci="${esc(s.ogrenciId)}" data-url="${esc(wa)}">WhatsApp</button>`:''}${sms?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-absence-contact="sms" data-sinif="${esc(s.sinifId)}" data-ogrenci="${esc(s.ogrenciId)}" data-url="${esc(sms)}">SMS</button>`:''}<span class="ka-muted">${s.gonderildi?'✓ Veli bilgilendirildi':(s.telefon?'Henüz bilgilendirilmedi':'Telefon bilgisi yok')}</span></div></div></article>`;}
async function render(){if(!mounted)return;const r=root();if(!r)return;if(user().admin!==true){r.innerHTML='<div class="ka-empty">Öğrenci Devamsızlığı yalnız yöneticiler tarafından görüntülenebilir.</div>';return;}let list=[];try{list=await global.YoklamaService.gununDevamsizlariGetir(date);}catch(e){if(e?.message==='yetkisiz'){r.innerHTML='<div class="ka-empty">Bu sayfa için yönetici yetkisi gereklidir.</div>';return;}console.error('[StudentAbsence/render]',e);r.innerHTML='<div class="ka-empty">Devamsızlık verileri açılamadı.</div>';return;}const yok=list.filter(x=>x.durum==='yok').length,gec=list.filter(x=>x.durum==='gec').length,sent=list.filter(x=>x.gonderildi).length;document.getElementById('v2ModuleTitle').textContent='Öğrenci Devamsızlığı';r.innerHTML=`<section class="ka-stack" data-student-absence-page><div class="ka-row ka-row--between"><div><h2>Öğrenci Devamsızlığı</h2><p class="ka-muted">Seçilen günün yok ve geç öğrencileri cihazdaki yoklama kayıtlarından gösterilir.</p></div><span class="ka-badge">${list.length} öğrenci</span></div><article class="ka-card"><div class="ka-card__body ka-grid"><label class="ka-field"><span class="ka-field__label">Tarih</span><input type="date" data-absence-date value="${esc(date)}"></label><div class="ka-row ka-wrap"><span class="ka-badge">Yok: ${yok}</span><span class="ka-badge">Geç: ${gec}</span><span class="ka-badge">Bilgilendirildi: ${sent}</span></div></div></article><div class="ka-stack">${list.length?list.map(card).join(''):'<div class="ka-empty">Bu tarihte yok veya geç öğrenci bulunmuyor.</div>'}</div></section>`;r.querySelector('[data-absence-date]')?.addEventListener('change',e=>{date=e.target.value||today();render();});r.querySelectorAll('[data-absence-contact]').forEach(b=>b.addEventListener('click',async()=>{const url=b.dataset.url;if(!url)return;try{if(b.dataset.absenceContact==='sms')global.location.href=url;else global.open(url,'_blank','noopener');await global.YoklamaService.mesajGonderildiIsaretle(b.dataset.sinif,date,b.dataset.ogrenci);toast('Veli bilgilendirme işlemi işaretlendi.');}catch(e){console.error('[StudentAbsence/contact]',e);toast(e?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':'Bilgilendirme durumu kaydedilemedi.');}}));}
async function activate(){if(user().admin!==true)return toast('Öğrenci Devamsızlığı yalnız yöneticiler içindir.');cleanup();await global.AppLoader?.load?.('people');global.PeopleModule?.unmount?.();mounted=true;date=today();subscribe();await render();return true;}
async function open(){return global.ShellUI?.routeModule?.('people',{bottom:'menu',page:PAGE,title:'Öğrenci Devamsızlığı'});}
function install(){const groups=global.ShellUI?.MENU_GROUPS;if(!Array.isArray(groups))return false;const group=groups.find(x=>x.key==='people');if(!group)return false;group.items=Array.isArray(group.items)?group.items:[];const i=group.items.findIndex(x=>x?.[3]===PAGE);if(user().admin===true&&i<0)group.items.push(['Öğrenci Devamsızlığı','🚫','people',PAGE]);else if(user().admin!==true&&i>=0)group.items.splice(i,1);if(!global.__studentAbsenceRouteInstalled){global.__studentAbsenceRouteInstalled=true;global.ShellUI?.registerPageRoute?.(PAGE,activate);}return true;}
global.addEventListener('koruk:module-ready',()=>{if(mounted)cleanup();});
global.addEventListener('koruk:app-ready',install);global.addEventListener('koruk:app-config-changed',install);global.AppStore?.subscribe?.('session.user',install);install();
global.StudentAbsencePage={open,render,cleanup,install};
})(window);
