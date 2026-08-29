/* Koruk Asistan — Classic Documents parity
 * Eski Dokümanlar çalışma alanını mevcut local-first DokumanlarService,
 * DocumentsPdfTools ve uygulama içi DokumanOkuyucu üzerine geri kurar.
 * Yeni veri modeli, router, tema veya Firestore erişimi oluşturmaz.
 */
(function(global){
'use strict';
if(global.ClassicDocumentsParity)return;

const CATEGORIES=['Öğrenci Formları','Veli Formları','Gezi & Etkinlik','Proje Formları','Yazılı Senaryoları','Yönetim & İdari','Diğer'];
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
let observer=null,scheduled=false,category='',boundRoot=null,busy=false;

function canEdit(){return global.PermissionService?.can?.('documents.edit','edit')??false}
function admin(){return user().admin===true}
function time(d){const t=d?.yuklenmeTarihi;if(!t)return 0;if(typeof t.toMillis==='function')return t.toMillis();if(typeof t.seconds==='number')return t.seconds*1000;return new Date(t).getTime()||0}
function docs(){const m=new Map(),src=admin()?arr('dokumanlar'):[...arr('dokumanlarAcik'),...arr('dokumanlarBenim')];for(const d of src)if(d?.id)m.set(d.id,d);return[...m.values()].sort((a,b)=>time(b)-time(a))}
function dateText(d){const t=time(d);return t?new Date(t).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
function bytes(n){n=Number(n)||0;if(!n)return'';if(n<1024)return`${n} B`;if(n<1048576)return`${(n/1024).toFixed(1)} KB`;return`${(n/1048576).toFixed(1)} MB`}
function urlOf(d){return String(d?.hariciUrl||d?.dosyaUrl||'').trim()}
function safeUrl(v){try{const u=new URL(String(v||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch(_){return''}}
function ext(d){const n=String(d?.dosyaAdi||d?.hariciUrl||d?.dosyaUrl||'').split('?')[0].split('#')[0].split('/').pop()||'',i=n.lastIndexOf('.');return i<0?'':n.slice(i+1).toLowerCase()}
function icon(d){return({pdf:'📄',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',csv:'📊',ppt:'📊',pptx:'📊',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',webp:'🖼️',zip:'🗜️',rar:'🗜️',mp4:'🎬',mp3:'🎵'})[ext(d)]||'📎'}
function title(d){return String(d?.ad||d?.baslik||d?.dosyaAdi||'Belge')}
function canDelete(d){return !!global.DokumanlarService?.dokumanSilinebilirMi?.(d)}
function canVisibility(){return !!global.DokumanlarService?.gorunurlukDegistirilebilirMi?.()}
function activeMain(){const shell=$('[data-documents-module]'),out=$('#documentsContent');return !!(shell&&out&&!out.querySelector('[data-teblig-back]'))}
function filtered(){const q=norm($('#documentsSearch')?.value||'');return docs().filter(d=>(!category||String(d.kategori||'Diğer')===category)&&(!q||norm([d.ad,d.baslik,d.dosyaAdi,d.kategori,d.olusturanAdi,d.aciklama].filter(Boolean).join(' ')).includes(q)))}
function categories(){const set=new Set(CATEGORIES);for(const d of docs())if(d.kategori)set.add(String(d.kategori));return[...set]}

function launchPdfTool(kind){
  closeAddModal();
  const tools=global.DocumentsPdfTools;
  if(!tools?.open)return global.toast?.('PDF araçları hazır değil.');
  return tools.open(kind==='merge'?tools.PAGE_MERGE:tools.PAGE_IMAGES);
}

function ensureControls(){
  const shell=$('[data-documents-module]');
  if(!shell||!activeMain())return;
  let bar=$('[data-classic-document-toolbar]',shell);
  if(!bar){bar=document.createElement('div');bar.className='ka-row ka-row--between ka-wrap';bar.dataset.classicDocumentToolbar='';$('#documentsSearch')?.closest('.ka-field')?.insertAdjacentElement('beforebegin',bar)}
  bar.innerHTML=`<label class="ka-field ka-grow" style="min-width:190px"><span class="ka-field__label">Kategori</span><select data-classic-document-category><option value="">Tüm Kategoriler</option>${categories().map(k=>`<option value="${esc(k)}" ${category===k?'selected':''}>${esc(k)}</option>`).join('')}</select></label>${canEdit()?'<div class="ka-row ka-wrap"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-classic-document-images>🖼 Resimlerden PDF</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-classic-document-merge>🔗 PDF Birleştir</button><button class="ka-btn" type="button" data-classic-document-add>+ Doküman Ekle</button></div>':''}`;
  $('[data-classic-document-category]',bar)?.addEventListener('change',e=>{category=e.currentTarget.value;renderList(true)});
  $('[data-classic-document-add]',bar)?.addEventListener('click',openAddModal);
  $('[data-classic-document-images]',bar)?.addEventListener('click',()=>launchPdfTool('images'));
  $('[data-classic-document-merge]',bar)?.addEventListener('click',()=>launchPdfTool('merge'));
}

function row(d){
  const vis=d.gorunurluk==='herkes'?'🌐 Herkese Açık':'🔒 Kişisel',cloud=d.hariciUrl?'🔗 URL':'☁️ Bulutta',size=bytes(d.dosyaBoyutu),owner=admin()&&d.olusturanAdi?` · 👤 ${esc(d.olusturanAdi)}`:'',desc=d.aciklama?` · ${esc(d.aciklama)}`:'',u=safeUrl(urlOf(d));
  return `<article class="ka-card ka-list-card" data-classic-document-id="${esc(d.id)}"><div class="ka-card__body ka-row ka-row--between"><button type="button" class="ka-row ka-grow" data-classic-document-open="${esc(d.id)}" style="text-align:left;color:inherit;background:none;border:0;padding:0;min-width:0" ${u?'':'disabled'}><span class="ka-avatar">${icon(d)}</span><span class="ka-grow" style="min-width:0"><strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(title(d))}</strong><span class="ka-muted" style="display:block">${esc(d.kategori||'Diğer')} · ${cloud} · ${vis}</span><small class="ka-muted">${esc(dateText(d))}${size?` · ${esc(size)}`:''}${owner}${desc}</small></span></button><div class="ka-row ka-wrap">${u?`<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-classic-document-open="${esc(d.id)}">👁 Aç</button><button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-classic-document-download="${esc(d.id)}">⬇ İndir</button>`:''}${canVisibility()?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-classic-document-visibility="${esc(d.id)}">${d.gorunurluk==='herkes'?'🔒 Kişisel Yap':'🌐 Herkese Aç'}</button>`:''}${canDelete(d)?`<button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-classic-document-delete="${esc(d.id)}">Sil</button>`:''}</div></div></article>`;
}

function renderList(force=false){
  if(!activeMain())return false;
  ensureControls();
  const out=$('#documentsContent'),list=filtered(),groups=new Map();
  for(const d of list){const k=String(d.kategori||'Diğer');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d)}
  const signature=JSON.stringify([category,$('#documentsSearch')?.value||'',list.map(x=>[x.id,x.guncellenmeTarihi||x.yuklenmeTarihi,x.gorunurluk,x.kategori])]);
  if(!force&&out.dataset.classicDocumentSignature===signature&&out.querySelector('[data-classic-document-list]'))return true;
  out.dataset.classicDocumentSignature=signature;
  out.innerHTML=`<section class="ka-stack" data-classic-document-list>${list.length?[...groups.entries()].sort(([a],[b])=>a.localeCompare(b,'tr')).map(([k,rows])=>`<section class="ka-stack"><div class="ka-row ka-row--between"><h3>📂 ${esc(k)}</h3><span class="ka-badge">${rows.length}</span></div>${rows.map(row).join('')}</section>`).join(''):'<div class="ka-empty">Henüz doküman bulunmuyor. “+ Doküman Ekle” ile yeni kayıt ekleyebilirsiniz.</div>'}</section>`;
  const c=$('#documentsCount');if(c)c.textContent=`${list.length} kayıt`;
  global.PermissionService?.apply?.(out);
  return true;
}

function closeAddModal(){document.querySelector('[data-classic-document-modal]')?.remove()}
function openAddModal(){
  if(!canEdit()||busy)return;
  closeAddModal();
  const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.classicDocumentModal='';
  ov.innerHTML=`<form class="ka-modal" data-classic-document-form><div class="ka-modal__header"><div><h2>📁 Doküman Ekle</h2><div class="ka-muted">Dosya yükleyin veya harici bağlantı ekleyin.</div></div><button class="ka-icon-button" type="button" data-doc-close>×</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Doküman Adı *</span><input name="ad" required maxlength="180"></label><label class="ka-field"><span class="ka-field__label">Kategori</span><select name="kategori">${categories().map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select></label><label class="ka-field"><span class="ka-field__label">Açıklama</span><input name="aciklama" maxlength="300" placeholder="Kısa açıklama..."></label>${admin()?`<label class="ka-field"><span class="ka-field__label">Görünürlük</span><select name="gorunurluk"><option value="herkes">🌐 Herkese Açık</option><option value="kisisel">🔒 Sadece Bana Özel</option></select></label>`:''}<label class="ka-field"><span class="ka-field__label">Dosya</span><input type="file" name="dosya"><small class="ka-muted" data-doc-file-info></small></label><div class="ka-row ka-wrap"><span class="ka-muted">veya</span><label class="ka-field ka-grow"><span class="ka-field__label">Harici URL</span><input type="url" name="hariciUrl" placeholder="https://drive.google.com/..."></label></div><div class="ka-muted" data-doc-upload-state></div></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-doc-close>Vazgeç</button><button class="ka-btn" type="submit">💾 Kaydet</button></div></form>`;
  const form=$('form',ov),file=form.elements.dosya,info=$('[data-doc-file-info]',ov);
  ov.querySelectorAll('[data-doc-close]').forEach(b=>b.onclick=closeAddModal);
  file?.addEventListener('change',()=>{const f=file.files?.[0];if(info)info.textContent=f?`${f.name} · ${bytes(f.size)}`:'';if(f&&!form.elements.ad.value.trim())form.elements.ad.value=f.name.replace(/\.[^.]+$/,'')});
  form.onsubmit=saveDocument;ov.addEventListener('click',e=>{if(e.target===ov)closeAddModal()});document.body.appendChild(ov);
}

async function saveDocument(e){
  e.preventDefault();if(busy)return;
  const form=e.currentTarget,fd=new FormData(form),ad=String(fd.get('ad')||'').trim(),kategori=String(fd.get('kategori')||'Diğer'),aciklama=String(fd.get('aciklama')||'').trim(),gorunurluk=admin()?String(fd.get('gorunurluk')||'herkes'):'kisisel',file=form.elements.dosya?.files?.[0]||null,raw=String(fd.get('hariciUrl')||'').trim(),hariciUrl=raw?safeUrl(raw):'';
  if(!ad)return global.toast?.('Doküman adı zorunludur.');
  if(raw&&!hariciUrl)return global.toast?.('Geçerli bir URL girin.');
  if(!file&&!hariciUrl)return global.toast?.('Dosya seçin veya URL girin.');
  const btn=form.querySelector('[type="submit"]'),state=$('[data-doc-upload-state]',form);busy=true;btn.disabled=true;
  try{const meta={ad,kategori,aciklama,gorunurluk};if(hariciUrl){meta.hariciUrl=hariciUrl;let last='';try{last=decodeURIComponent(new URL(hariciUrl).pathname.split('/').filter(Boolean).pop()||'')}catch(_){}meta.dosyaAdi=(!last||['view','edit','preview','open','pub','export'].includes(last.toLowerCase()))?ad:last}await global.DokumanlarService?.dokumanEkle?.(meta,file,p=>{if(state)state.textContent=`Yükleniyor… %${p}`});global.toast?.(`“${ad}” kaydedildi.`);closeAddModal();renderList(true)}catch(err){const m=String(err?.message||err);global.toast?.(m.startsWith('depolama-siniri:')?m.slice('depolama-siniri:'.length):m==='yetkisiz'?'Bu işlem için yetkiniz yok.':'Kayıt hatası: '+m)}finally{busy=false;if(btn?.isConnected)btn.disabled=false}
}

async function openDocument(id){const d=docs().find(x=>x.id===id),url=safeUrl(urlOf(d));if(!d||!url)return global.toast?.('Bu dokümanın dosyası bulunamadı.');try{if(global.PermissionService?.can?.('documents.view','preview')===false)throw new Error('yetkisiz');const viewer=await global.DocumentsModule?.ensureViewer?.(),name=d.dosyaAdi||d.ad||d.baslik||'Belge';if(viewer&&(viewer.googleDocsMu?.(url)||viewer.destekliMi?.(name)||viewer.destekliMi?.(url))){await viewer.ac(url,name);return}window.open(url,'_blank','noopener')}catch(err){if(err?.message!=='yetkisiz')window.open(url,'_blank','noopener')}}
async function downloadDocument(id){const d=docs().find(x=>x.id===id),url=safeUrl(urlOf(d));if(!d||!url)return;try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('Dosya alınamadı ('+r.status+')');const blob=await r.blob(),name=d.dosyaAdi||d.ad||'dosya';if(typeof global.uygulamaDosyaKaydet==='function'){const fr=new FileReader(),b64=await new Promise((ok,no)=>{fr.onloadend=()=>ok(String(fr.result).split(',')[1]);fr.onerror=no;fr.readAsDataURL(blob)});await global.uygulamaDosyaKaydet(b64,name,blob.type||'application/octet-stream',false);return}const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}catch(err){console.warn('[ClassicDocuments/download]',err);window.open(url,'_blank','noopener')}}
async function toggleVisibility(id){const d=docs().find(x=>x.id===id);if(!d||!canVisibility())return;const next=d.gorunurluk==='herkes'?'kisisel':'herkes',label=next==='herkes'?'HERKESE AÇIK':'KİŞİSEL';if(!confirm(`“${title(d)}” ${label} yapılsın mı?`))return;try{await global.DokumanlarService?.dokumanGorunurlukGuncelle?.(id,next);global.toast?.('Görünürlük güncellendi.');renderList(true)}catch(err){global.toast?.(err?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':'Görünürlük güncellenemedi.')}}
async function deleteDocument(id){const d=docs().find(x=>x.id===id);if(!d||!canDelete(d)||!confirm(`“${title(d)}” dokümanı silinsin mi?`))return;try{await global.DokumanlarService?.dokumanSil?.(id,d.storagePath,d);global.toast?.('Doküman silindi.');renderList(true)}catch(err){global.toast?.(err?.message==='sahip-degil'?'Bu dokümanı yalnız ekleyen kişi veya yönetici silebilir.':'Silme hatası: '+(err?.message||err))}}
function capture(e){const t=e.target;if(!(t instanceof Element)||!activeMain())return;const open=t.closest('[data-classic-document-open]');if(open){e.preventDefault();e.stopImmediatePropagation();openDocument(open.dataset.classicDocumentOpen);return}const down=t.closest('[data-classic-document-download]');if(down){e.preventDefault();e.stopImmediatePropagation();downloadDocument(down.dataset.classicDocumentDownload);return}const vis=t.closest('[data-classic-document-visibility]');if(vis){e.preventDefault();e.stopImmediatePropagation();toggleVisibility(vis.dataset.classicDocumentVisibility);return}const del=t.closest('[data-classic-document-delete]');if(del){e.preventDefault();e.stopImmediatePropagation();deleteDocument(del.dataset.classicDocumentDelete)}}
function run(){scheduled=false;if(!activeMain())return;ensureControls();renderList()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(run)}
function start(){if(observer)return;boundRoot=document.getElementById('v2ModuleRoot')||document.body;boundRoot.addEventListener('click',capture,true);observer=new MutationObserver(schedule);observer.observe(boundRoot,{childList:true,subtree:true});for(const p of ['data.dokumanlar','data.dokumanlarAcik','data.dokumanlarBenim'])global.AppStore?.subscribe?.(p,schedule);$('#documentsSearch')?.addEventListener('input',schedule);schedule()}
function stop(){observer?.disconnect?.();observer=null;if(boundRoot)boundRoot.removeEventListener('click',capture,true);boundRoot=null;scheduled=false;closeAddModal()}

global.ClassicDocumentsParity={start,stop,renderList,openAddModal,openDocument,downloadDocument,launchPdfTool};
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='documents')start()});
if(global.DocumentsModule)start();
})(window);