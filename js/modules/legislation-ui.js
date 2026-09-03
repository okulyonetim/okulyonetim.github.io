/* Koruk Asistan — Mevzuat Asistanı presentation
 * Canonical local-first LegislationEngine için mobil öncelikli çalışma alanı.
 * Yeni veri deposu, router, tema veya Firestore erişimi oluşturmaz.
 */
(function(global){
'use strict';
if(global.LegislationModule)return;

let rows=[],history=[],loading=false,view='sources',sourceQuery='',mountedRoot=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('tr-TR')};
const norm=v=>String(v??'').toLocaleLowerCase('tr').trim();
const canEdit=()=>global.PermissionService?.can?.('documents.edit','edit')!==false;
function requireEdit(){if(canEdit())return true;global.toast?.('Mevzuat düzenleme yetkiniz yok.');return false;}
function engine(){if(!global.LegislationEngine)throw new Error('Mevzuat motoru hazır değil.');return global.LegislationEngine;}
function backToDocuments(){return global.ShellUI?.routeModule?.('documents',{bottom:'menu'});}
function categories(){return [...new Set(rows.map(r=>String(r?.kategori||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));}
function visibleRows(){const q=norm(sourceQuery);if(!q)return rows;return rows.filter(r=>norm([r.baslik,r.kategori,r.kaynak].filter(Boolean).join(' ')).includes(q));}
function totalSections(){return rows.reduce((sum,r)=>sum+Number(r?.chunkSayisi||0),0);}

function shell(){return `<section class="ka-legislation-page ka-stack" data-legislation-v2>
  <section class="ka-legislation-hero" aria-labelledby="legislationTitleHeading">
    <div class="ka-legislation-hero__icon" aria-hidden="true">⚖️</div>
    <div class="ka-legislation-hero__copy">
      <span class="ka-legislation-kicker">MEVZUAT ÇALIŞMA ALANI</span>
      <h2 id="legislationTitleHeading">⚖️ Mevzuat Asistanı</h2>
      <p>Mevzuat metinlerini ekle, cihazında sakla, soru sor — hiçbir veri Firestore'a gitmez</p>
    </div>
    <span class="ka-legislation-local-badge" title="Mevzuat arşivi cihazınızda tutulur"><span aria-hidden="true">🔒</span> Cihazda saklanır</span>
  </section>

  <section class="ka-legislation-summary" aria-label="Mevzuat özeti">
    <article><span aria-hidden="true">📚</span><div><small>MEVZUAT</small><b data-legislation-stat="records">0</b></div></article>
    <article><span aria-hidden="true">📑</span><div><small>BÖLÜM</small><b data-legislation-stat="sections">0</b></div></article>
    <article><span aria-hidden="true">🏷️</span><div><small>KATEGORİ</small><b data-legislation-stat="categories">0</b></div></article>
  </section>

  <section class="ka-legislation-actions" data-ka-permission="documents.edit" data-ka-min-level="edit" aria-label="Mevzuat işlemleri">
    <button class="ka-legislation-action" type="button" data-legislation-import-trigger data-ka-write="documents.edit">
      <span class="ka-legislation-action__icon" aria-hidden="true">📥</span><span><strong>📥 Toplu İçe Aktar</strong><small>JSON arşivini ekle</small></span>
    </button>
    <input id="legislationImport" class="ka-hidden" type="file" accept="application/json,.json">
    <button class="ka-legislation-action ka-legislation-action--primary" type="button" data-legislation-add data-ka-write="documents.edit">
      <span class="ka-legislation-action__icon" aria-hidden="true">＋</span><span><strong>➕ Yeni Mevzuat Ekle</strong><small>Metni böl ve indeksle</small></span>
    </button>
  </section>

  <div class="ka-legislation-switch" role="tablist" aria-label="Mevzuat çalışma modu">
    <button type="button" data-legislation-view="sources" role="tab"><span aria-hidden="true">📚</span><span>Eklenen Mevzuatlar</span><em data-legislation-tab-count>0</em><span class="ka-visually-hidden">📚 Eklenen Mevzuatlar</span></button>
    <button type="button" data-legislation-view="chat" role="tab"><span aria-hidden="true">💬</span><span>Soru Sor</span><span class="ka-visually-hidden">💬 Soru Sor</span></button>
  </div>
  <div id="legislationContent"></div>
</section>`;}

function sourceView(){const has=rows.length>0;return `<section class="ka-legislation-surface" aria-label="Eklenen mevzuatlar">
  <div class="ka-legislation-surface__head">
    <div><small>ARŞİV</small><h3>Mevzuatlarım</h3><p>${has?'Başlık, kategori veya kaynağa göre hızlıca bul.':'İlk mevzuatını ekleyerek kişisel arşivini oluştur.'}</p></div>
    ${has?`<span>${rows.length} kayıt</span>`:''}
  </div>
  ${has?`<label class="ka-legislation-search"><span aria-hidden="true">⌕</span><input id="legislationSourceSearch" type="search" placeholder="Mevzuatlarda ara…" value="${esc(sourceQuery)}" autocomplete="off"><button type="button" data-legislation-search-clear aria-label="Aramayı temizle" ${sourceQuery?'':'hidden'}>×</button></label>`:''}
  <div id="legislationList" class="ka-legislation-list"></div>
</section>`;}

// Sohbet yüksekliği tasarım sisteminde korunur: height:min(60vh,640px).
function chatView(){return `<section class="ka-legislation-chat" aria-label="Mevzuata soru sor">
  <div class="ka-legislation-chat__head"><span aria-hidden="true">✦</span><div><small>MEVZUAT ASİSTANI</small><h3>Arşivine soru sor</h3><p>Yanıtlar yalnızca cihazına eklediğin mevzuat metinlerinden hazırlanır.</p></div></div>
  <div id="legislationMessages" class="ka-legislation-messages" aria-live="polite"></div>
  <div class="ka-legislation-composer">
    <label class="ka-field ka-grow"><span class="ka-field__label">Mevzuat sorunuz</span><textarea id="legislationQuestion" rows="2" placeholder="Örn: Yıllık izin kaç gündür?"></textarea></label>
    <button class="ka-legislation-send" type="button" data-legislation-send aria-label="Soruyu gönder"><span>Sor</span><span aria-hidden="true">➜</span></button>
  </div>
</section>`;}

function closeAddModal(){document.querySelector('[data-legislation-modal]')?.remove();}
function addModalHtml(){const cats=categories();return `<form class="ka-modal ka-legislation-modal" data-legislation-form>
  <div class="ka-modal__header"><div><span class="ka-legislation-modal__kicker">YENİ KAYNAK</span><h2>+ Yeni Mevzuat Ekle</h2><p class="ka-muted">Metin madde ve paragraflara bölünerek cihazdaki local-first indekse kaydedilir.</p></div><button class="ka-icon-button" type="button" data-legislation-close aria-label="Kapat">×</button></div>
  <div class="ka-modal__body ka-stack">
    <div class="ka-legislation-modal__note"><span aria-hidden="true">🔒</span><div><strong>Yerel ve özel</strong><small>Eklediğin mevzuat metni Firestore'a gönderilmez.</small></div></div>
    <label class="ka-field"><span class="ka-field__label">Başlık</span><input id="legislationTitle" required placeholder="Örn: Milli Eğitim Bakanlığı Personeli İzin Yönergesi"></label>
    <div class="ka-legislation-form-grid">
      <label class="ka-field"><span class="ka-field__label">Kaynak (opsiyonel)</span><input id="legislationSource" placeholder="Örn: mevzuat.gov.tr, Resmî Gazete"></label>
      <label class="ka-field"><span class="ka-field__label">Kategori</span><input id="legislationCategory" list="legislationCategoryList" placeholder="Genel" value="Genel"><datalist id="legislationCategoryList">${cats.map(c=>`<option value="${esc(c)}"></option>`).join('')}</datalist></label>
    </div>
    <label class="ka-field"><span class="ka-field__label">Mevzuat Metni</span><textarea id="legislationText" rows="10" required placeholder="Metni buraya yapıştırın (MADDE 1-, MADDE 2- şeklinde bölünmüş olması aramayı daha isabetli yapar)"></textarea></label>
    <p class="ka-legislation-help">💡 PDF'ten metin çıkaramıyorsan, dosyayı bu sohbete yükleyip “bu PDF'in metnini çıkar” diyebilirsin, çıkan metni buraya yapıştırırsın.</p>
  </div>
  <div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-legislation-close>Vazgeç</button><button class="ka-btn" type="submit" data-legislation-save data-ka-write="documents.edit">Bölerek Kaydet</button></div>
</form>`;}
function openAddModal(){if(!requireEdit())return;closeAddModal();const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.legislationModal='';ov.innerHTML=addModalHtml();document.body.appendChild(ov);ov.querySelectorAll('[data-legislation-close]').forEach(b=>b.onclick=closeAddModal);ov.onclick=e=>{if(e.target===ov)closeAddModal()};ov.querySelector('[data-legislation-form]').onsubmit=e=>{e.preventDefault();save()};global.PermissionService?.apply?.(ov);setTimeout(()=>ov.querySelector('#legislationTitle')?.focus(),0);}

function updateSummary(){if(!mountedRoot)return;const values={records:rows.length,sections:totalSections(),categories:categories().length};Object.entries(values).forEach(([key,value])=>{const el=mountedRoot.querySelector(`[data-legislation-stat="${key}"]`);if(el)el.textContent=String(value)});const count=mountedRoot.querySelector('[data-legislation-tab-count]');if(count)count.textContent=String(rows.length);}
async function refresh(){rows=await engine().list();updateSummary();renderList();}
function renderList(){const host=document.getElementById('legislationList');if(!host)return;const list=visibleRows();if(!rows.length){host.innerHTML=`<div class="ka-legislation-empty"><span aria-hidden="true">⚖️</span><strong>Mevzuat arşivin hazır</strong><p>Henüz mevzuat eklenmedi. “+ Yeni Mevzuat Ekle” ile başla.</p><button class="ka-btn" type="button" data-legislation-empty-add data-ka-write="documents.edit">➕ İlk mevzuatı ekle</button></div>`;host.querySelector('[data-legislation-empty-add]')?.addEventListener('click',openAddModal);global.PermissionService?.apply?.(host);return;}
  if(!list.length){host.innerHTML=`<div class="ka-legislation-empty ka-legislation-empty--search"><span aria-hidden="true">⌕</span><strong>Sonuç bulunamadı</strong><p>“${esc(sourceQuery)}” için arşivinde eşleşen mevzuat yok.</p><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-legislation-search-reset>Aramayı temizle</button></div>`;host.querySelector('[data-legislation-search-reset]')?.addEventListener('click',()=>{sourceQuery='';render()});return;}
  host.innerHTML=list.map(r=>`<article class="ka-legislation-source" data-legislation-source="${esc(r.id)}"><div class="ka-legislation-source__icon" aria-hidden="true">§</div><div class="ka-legislation-source__copy"><div class="ka-legislation-source__title"><strong>${esc(r.baslik)}</strong><span>${esc(r.kategori||'Genel')}</span></div><div class="ka-legislation-source__meta">${r.kaynak?`<span>🔗 ${esc(r.kaynak)}</span>`:''}<span>📑 ${Number(r.chunkSayisi||0)} bölüm</span>${r.eklenmeTarihi?`<span>🗓️ ${esc(date(r.eklenmeTarihi))}</span>`:''}</div></div><button class="ka-legislation-delete" type="button" data-legislation-delete="${esc(r.id)}" data-ka-permission="documents.edit" data-ka-min-level="edit" data-ka-write="documents.edit" aria-label="${esc(r.baslik)} kaydını sil">🗑️<span>Sil</span></button></article>`).join('');
  host.querySelectorAll('[data-legislation-delete]').forEach(b=>b.onclick=async()=>{if(!requireEdit())return;if(!global.confirm?.('Bu mevzuatı ve tüm bölümlerini silmek istediğinize emin misiniz?'))return;try{await engine().remove(b.dataset.legislationDelete);global.toast?.('Silindi.');await refresh();}catch(e){global.toast?.('Silinemedi: '+(e?.message||e))}});global.PermissionService?.apply?.(host);}

async function save(){if(!requireEdit())return;const baslik=document.getElementById('legislationTitle')?.value?.trim()||'',kaynak=document.getElementById('legislationSource')?.value?.trim()||'',kategori=document.getElementById('legislationCategory')?.value?.trim()||'Genel',metin=document.getElementById('legislationText')?.value||'';try{const row=await engine().add({baslik,kaynak,kategori,metin});global.toast?.(`“${row.baslik}” eklendi (${Number(row.chunkSayisi||0)} bölüm).`);closeAddModal();sourceQuery='';await refresh();render();}catch(e){global.toast?.(e?.message||'Mevzuat kaydedilemedi.')}}
function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('Dosya okunamadı.'));r.readAsText(file,'utf-8')})}
async function importFile(e){if(!requireEdit())return;const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await readFile(file)),result=await engine().importJson(parsed);global.toast?.(`İçe aktarma tamamlandı: ${result.eklenen} eklendi, ${result.atlanan} zaten vardı, ${result.hatali} hatalı.`);sourceQuery='';await refresh();render();}catch(err){global.toast?.('Dosya okunamadı: '+(err?.message||err));}finally{e.target.value=''}}

function chatWelcome(){if(history.length||loading)return'';return `<div class="ka-legislation-chat-welcome"><span aria-hidden="true">✦</span><strong>Ne öğrenmek istiyorsun?</strong><p>${rows.length?`${rows.length} mevzuat ve ${totalSections()} bölüm içinde ilgili maddeleri bulup yanıtlayabilirim.`:'Önce bir mevzuat ekle. Ardından yalnızca kendi arşivindeki metinlere dayanarak soru sorabilirsin.'}</p>${rows.length?`<div class="ka-legislation-prompts"><button type="button" data-legislation-prompt="Bu mevzuatların kapsamı nedir?">Kapsamı nedir?</button><button type="button" data-legislation-prompt="Görev ve sorumluluklarla ilgili hükümler nelerdir?">Görev ve sorumluluklar</button><button type="button" data-legislation-prompt="İzinlerle ilgili hükümler nelerdir?">İzin hükümleri</button></div>`:''}</div>`;}
function renderMessages(){const host=document.getElementById('legislationMessages');if(!host)return;host.innerHTML=chatWelcome()+history.map(m=>`<div class="ka-legislation-message ka-legislation-message--${m.role==='user'?'user':'assistant'}"><div class="ka-legislation-message__avatar" aria-hidden="true">${m.role==='user'?'S':'⚖️'}</div><div class="ka-legislation-message__bubble">${esc(m.text).replace(/\n/g,'<br>')}</div></div>`).join('')+(loading?`<div class="ka-legislation-message ka-legislation-message--assistant"><div class="ka-legislation-message__avatar" aria-hidden="true">⚖️</div><div class="ka-legislation-message__bubble ka-legislation-thinking"><span></span><span></span><span></span><em>Aranıyor…</em></div></div>`:'');host.querySelectorAll('[data-legislation-prompt]').forEach(b=>b.onclick=()=>{const input=document.getElementById('legislationQuestion');if(!input)return;input.value=b.dataset.legislationPrompt||'';input.focus();});host.scrollTop=host.scrollHeight;}
async function send(){const input=document.getElementById('legislationQuestion'),q=(input?.value||'').trim();if(!q||loading)return;history.push({role:'user',text:q});input.value='';loading=true;renderMessages();try{const result=await engine().ask(q);history.push({role:'model',text:result.text||'(boş yanıt)'});}catch(e){history.push({role:'model',text:'⚠️ Hata: '+(e?.message||e)});}finally{loading=false;renderMessages()}}

function bindShell(){const root=mountedRoot;if(!root)return;root.querySelector('[data-legislation-import-trigger]')?.addEventListener('click',()=>{if(requireEdit())root.querySelector('#legislationImport')?.click()});root.querySelector('#legislationImport')?.addEventListener('change',importFile);root.querySelector('[data-legislation-add]')?.addEventListener('click',openAddModal);root.querySelectorAll('[data-legislation-view]').forEach(b=>b.onclick=()=>{view=b.dataset.legislationView;render()});}
function bindView(){const host=document.getElementById('legislationContent');if(!host)return;if(view==='chat'){renderMessages();host.querySelector('[data-legislation-send]')?.addEventListener('click',send);const q=host.querySelector('#legislationQuestion');if(q)q.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};}else{renderList();const search=host.querySelector('#legislationSourceSearch'),clear=host.querySelector('[data-legislation-search-clear]');if(search)search.oninput=e=>{sourceQuery=e.target.value||'';if(clear)clear.hidden=!sourceQuery;renderList()};if(clear)clear.onclick=()=>{sourceQuery='';render()};}}
function render(){const host=document.getElementById('legislationContent');if(!host)return;mountedRoot?.querySelectorAll('[data-legislation-view]').forEach(b=>{const active=b.dataset.legislationView===view;b.classList.toggle('active',active);b.setAttribute('aria-selected',active?'true':'false')});host.innerHTML=view==='chat'?chatView():sourceView();bindView();updateSummary();global.PermissionService?.apply?.(mountedRoot);}

async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;if(global.PermissionService?.can?.('documents.view','preview')===false){global.toast?.('Mevzuatı görüntüleme yetkiniz yok.');return false;}unmount();mountedRoot=root;view='sources';sourceQuery='';root.innerHTML=shell();bindShell();await refresh();render();global.PermissionService?.applyModule?.('documents');return true;}
function unmount(){closeAddModal();mountedRoot=null;loading=false;sourceQuery='';}

global.LegislationModule={mount,unmount,refresh,send,back:backToDocuments};
})(window);
