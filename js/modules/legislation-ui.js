/* Koruk Asistan — Mevzuat Asistanı presentation
 * Eski görünür çalışma alanını canonical local-first LegislationEngine üzerine kurar.
 * Yeni veri deposu, router, tema veya Firestore erişimi oluşturmaz.
 */
(function(global){
'use strict';
if(global.LegislationModule)return;

let rows=[],history=[],loading=false,view='sources',mountedRoot=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('tr-TR')};
const canEdit=()=>global.PermissionService?.can?.('documents.edit','edit')!==false;
function requireEdit(){if(canEdit())return true;global.toast?.('Mevzuat düzenleme yetkiniz yok.');return false;}
function engine(){if(!global.LegislationEngine)throw new Error('Mevzuat motoru hazır değil.');return global.LegislationEngine;}
function backToDocuments(){return global.ShellUI?.routeModule?.('documents',{bottom:'menu'});}
function categories(){return [...new Set(rows.map(r=>String(r?.kategori||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));}

function shell(){return `<section class="ka-stack" data-legislation-v2>
  <div class="ka-row ka-row--between ka-wrap">
    <div class="ka-grow"><h2>⚖️ Mevzuat Asistanı</h2><p class="ka-muted">Mevzuat metinlerini ekle, cihazında sakla, soru sor — hiçbir veri Firestore'a gitmez</p></div>
    <div class="ka-row ka-wrap" data-ka-permission="documents.edit" data-ka-min-level="edit">
      <button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-legislation-import-trigger data-ka-write="documents.edit">📥 Toplu İçe Aktar</button>
      <input id="legislationImport" class="ka-hidden" type="file" accept="application/json,.json">
      <button class="ka-btn ka-btn--sm" type="button" data-legislation-add data-ka-write="documents.edit">➕ Yeni Mevzuat Ekle</button>
    </div>
  </div>
  <div class="ka-tabs" role="tablist">
    <button class="ka-tab" type="button" data-legislation-view="sources">📚 Eklenen Mevzuatlar</button>
    <button class="ka-tab" type="button" data-legislation-view="chat">💬 Soru Sor</button>
  </div>
  <div id="legislationContent"></div>
</section>`;}

function sourceView(){return `<article class="ka-card"><div class="ka-card__body"><div id="legislationList" class="ka-stack"></div></div></article>`;}

function chatView(){return `<article class="ka-card"><div class="ka-card__body" style="display:flex;flex-direction:column;height:min(60vh,640px);gap:var(--ka-space-3)">
  <div id="legislationMessages" class="ka-stack" style="flex:1;min-height:0;overflow-y:auto;padding:var(--ka-space-2)"></div>
  <div class="ka-row" style="align-items:flex-end">
    <label class="ka-field ka-grow"><span class="ka-field__label">Mevzuat sorunuz</span><textarea id="legislationQuestion" rows="2" placeholder="Örn: Yıllık izin kaç gündür?" style="resize:none"></textarea></label>
    <button class="ka-btn" type="button" data-legislation-send>Sor</button>
  </div>
</div></article>`;}

function closeAddModal(){document.querySelector('[data-legislation-modal]')?.remove();}
function addModalHtml(){const cats=categories();return `<form class="ka-modal" data-legislation-form>
  <div class="ka-modal__header"><div><h2>+ Yeni Mevzuat Ekle</h2><p class="ka-muted">Metin madde ve paragraflara bölünerek cihazdaki local-first indekse kaydedilir.</p></div><button class="ka-icon-button" type="button" data-legislation-close aria-label="Kapat">×</button></div>
  <div class="ka-modal__body ka-stack">
    <label class="ka-field"><span class="ka-field__label">Başlık</span><input id="legislationTitle" required placeholder="Örn: Milli Eğitim Bakanlığı Personeli İzin Yönergesi"></label>
    <label class="ka-field"><span class="ka-field__label">Kaynak (opsiyonel)</span><input id="legislationSource" placeholder="Örn: mevzuat.gov.tr, Resmî Gazete"></label>
    <label class="ka-field"><span class="ka-field__label">Kategori</span><input id="legislationCategory" list="legislationCategoryList" placeholder="Genel" value="Genel"><datalist id="legislationCategoryList">${cats.map(c=>`<option value="${esc(c)}"></option>`).join('')}</datalist></label>
    <label class="ka-field"><span class="ka-field__label">Mevzuat Metni</span><textarea id="legislationText" rows="10" required placeholder="Metni buraya yapıştırın (MADDE 1-, MADDE 2- şeklinde bölünmüş olması aramayı daha isabetli yapar)"></textarea></label>
    <p class="ka-muted">PDF'ten metin çıkaramıyorsan, dosyayı bu sohbete yükleyip “bu PDF'in metnini çıkar” diyebilirsin, çıkan metni buraya yapıştırırsın.</p>
  </div>
  <div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-legislation-close>Vazgeç</button><button class="ka-btn" type="submit" data-legislation-save data-ka-write="documents.edit">Bölerek Kaydet</button></div>
</form>`;}
function openAddModal(){if(!requireEdit())return;closeAddModal();const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.legislationModal='';ov.innerHTML=addModalHtml();document.body.appendChild(ov);ov.querySelectorAll('[data-legislation-close]').forEach(b=>b.onclick=closeAddModal);ov.onclick=e=>{if(e.target===ov)closeAddModal()};ov.querySelector('[data-legislation-form]').onsubmit=e=>{e.preventDefault();save()};global.PermissionService?.apply?.(ov);setTimeout(()=>ov.querySelector('#legislationTitle')?.focus(),0);}

async function refresh(){rows=await engine().list();renderList();}
function renderList(){const host=document.getElementById('legislationList');if(!host)return;host.innerHTML=rows.length?rows.map(r=>`<article class="ka-card ka-list-card"><div class="ka-card__body ka-row ka-row--between"><div class="ka-grow"><div class="ka-row ka-wrap"><strong>${esc(r.baslik)}</strong><span class="ka-badge">${esc(r.kategori||'Genel')}</span></div><div class="ka-muted">${r.kaynak?`${esc(r.kaynak)} · `:''}${Number(r.chunkSayisi||0)} bölüm${r.eklenmeTarihi?` · ${esc(date(r.eklenmeTarihi))}`:''}</div></div><button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-legislation-delete="${esc(r.id)}" data-ka-permission="documents.edit" data-ka-min-level="edit" data-ka-write="documents.edit">Sil</button></div></article>`).join(''):'<div class="ka-empty">Henüz mevzuat eklenmedi. “+ Yeni Mevzuat Ekle” ile başla.</div>';
  host.querySelectorAll('[data-legislation-delete]').forEach(b=>b.onclick=async()=>{if(!requireEdit())return;if(!global.confirm?.('Bu mevzuatı ve tüm bölümlerini silmek istediğinize emin misiniz?'))return;try{await engine().remove(b.dataset.legislationDelete);global.toast?.('Silindi.');await refresh();}catch(e){global.toast?.('Silinemedi: '+(e?.message||e))}});global.PermissionService?.apply?.(host);}

async function save(){if(!requireEdit())return;const baslik=document.getElementById('legislationTitle')?.value?.trim()||'',kaynak=document.getElementById('legislationSource')?.value?.trim()||'',kategori=document.getElementById('legislationCategory')?.value?.trim()||'Genel',metin=document.getElementById('legislationText')?.value||'';try{const row=await engine().add({baslik,kaynak,kategori,metin});global.toast?.(`“${row.baslik}” eklendi (${Number(row.chunkSayisi||0)} bölüm).`);closeAddModal();await refresh();}catch(e){global.toast?.(e?.message||'Mevzuat kaydedilemedi.')}}
function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('Dosya okunamadı.'));r.readAsText(file,'utf-8')})}
async function importFile(e){if(!requireEdit())return;const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await readFile(file)),result=await engine().importJson(parsed);global.toast?.(`İçe aktarma tamamlandı: ${result.eklenen} eklendi, ${result.atlanan} zaten vardı, ${result.hatali} hatalı.`);await refresh();}catch(err){global.toast?.('Dosya okunamadı: '+(err?.message||err));}finally{e.target.value=''}}

function renderMessages(){const host=document.getElementById('legislationMessages');if(!host)return;host.innerHTML=history.map(m=>`<div style="display:flex;justify-content:${m.role==='user'?'flex-end':'flex-start'}"><div style="max-width:min(86%,720px);padding:var(--ka-space-3);border:1px solid var(--ka-border);border-radius:var(--ka-radius-lg);background:${m.role==='user'?'var(--ka-primary-soft)':'var(--ka-muted-bg)'}"><div>${esc(m.text).replace(/\n/g,'<br>')}</div></div></div>`).join('')+(loading?`<div style="display:flex;justify-content:flex-start"><div style="padding:var(--ka-space-3);border:1px solid var(--ka-border);border-radius:var(--ka-radius-lg);background:var(--ka-muted-bg)">Aranıyor…</div></div>`:'');host.scrollTop=host.scrollHeight;}
async function send(){const input=document.getElementById('legislationQuestion'),q=(input?.value||'').trim();if(!q||loading)return;history.push({role:'user',text:q});input.value='';loading=true;renderMessages();try{const result=await engine().ask(q);history.push({role:'model',text:result.text||'(boş yanıt)'});}catch(e){history.push({role:'model',text:'⚠️ Hata: '+(e?.message||e)});}finally{loading=false;renderMessages()}}

function bindShell(){const root=mountedRoot;if(!root)return;root.querySelector('[data-legislation-import-trigger]')?.addEventListener('click',()=>{if(requireEdit())root.querySelector('#legislationImport')?.click()});root.querySelector('#legislationImport')?.addEventListener('change',importFile);root.querySelector('[data-legislation-add]')?.addEventListener('click',openAddModal);root.querySelectorAll('[data-legislation-view]').forEach(b=>b.onclick=()=>{view=b.dataset.legislationView;render()});}
function bindView(){const host=document.getElementById('legislationContent');if(!host)return;if(view==='chat'){renderMessages();host.querySelector('[data-legislation-send]')?.addEventListener('click',send);const q=host.querySelector('#legislationQuestion');if(q)q.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};}else renderList();}
function render(){const host=document.getElementById('legislationContent');if(!host)return;mountedRoot?.querySelectorAll('[data-legislation-view]').forEach(b=>{const active=b.dataset.legislationView===view;b.classList.toggle('active',active);b.setAttribute('aria-selected',active?'true':'false')});host.innerHTML=view==='chat'?chatView():sourceView();bindView();global.PermissionService?.apply?.(mountedRoot);}

async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;if(global.PermissionService?.can?.('documents.view','preview')===false){global.toast?.('Mevzuatı görüntüleme yetkiniz yok.');return false;}unmount();mountedRoot=root;view='sources';root.innerHTML=shell();bindShell();await refresh();render();global.PermissionService?.applyModule?.('documents');return true;}
function unmount(){closeAddModal();mountedRoot=null;loading=false;}

global.LegislationModule={mount,unmount,refresh,send,back:backToDocuments};
})(window);
