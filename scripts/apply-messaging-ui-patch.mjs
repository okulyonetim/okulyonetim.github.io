import fs from 'node:fs';

const file='js/modules/communication.js';
let src=fs.readFileSync(file,'utf8');
const original=src;

function replaceOnce(oldText,newText,label){
 if(!src.includes(oldText))throw new Error(`${label} contract not found; aborting without changes.`);
 src=src.replace(oldText,newText);
}

replaceOnce("let active='announcements',query='',mounted=false,unsubs=[];","let active='announcements',query='',mounted=false,unsubs=[],openConversationId='',messageRows=[],messageUnsub=null;",'communication state');

const messageStart=src.indexOf('function messages(){');
const messageEnd=src.indexOf('function pollCounts',messageStart);
if(messageStart<0||messageEnd<=messageStart)throw new Error('Passive messages block not found; aborting.');
const messageUi=`function conversationTitle(k){const me=uid();return k?.grupMu?(k.grupAdi||'Grup'):Object.entries(k?.katilimciAdlari||{}).filter(([id])=>id!==me).map(([,x])=>x).join(', ')||'Sohbet'}
function messageDate(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return d.toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
function teacherName(t){return String(t?.adSoyad||[t?.ad,t?.soyad].filter(Boolean).join(' ')||'Öğretmen').trim()}
function closeMessageConversation(doRender=true){try{messageUnsub?.()}catch(_){}messageUnsub=null;openConversationId='';messageRows=[];if(doRender&&mounted&&active==='messages')render()}
async function openMessageConversation(id){
 const k=arr('konusmalar').find(x=>x.id===id);if(!k)return;
 try{messageUnsub?.()}catch(_){}messageUnsub=null;openConversationId=id;messageRows=[];
 await globalThis.MesajlasmaService?.okunduIsaretle?.(id,k).catch(()=>{});
 messageUnsub=globalThis.MesajlasmaRepository?.mesajlariDinle?.(id,rows=>{messageRows=Array.isArray(rows)?rows:[];if(mounted&&active==='messages'&&openConversationId===id){requestAnimationFrame(()=>{render();requestAnimationFrame(()=>{const stream=document.querySelector('[data-message-stream]');if(stream)stream.scrollTop=stream.scrollHeight})})}})||null;
 render();
}
function openNewMessageModal(){
 document.querySelector('[data-new-message-modal]')?.remove();const me=uid(),teachers=arr('ogretmenler').slice().sort((a,b)=>teacherName(a).localeCompare(teacherName(b),'tr'));
 document.body.insertAdjacentHTML('beforeend',\`<div class="ka-modal-backdrop" data-new-message-modal><form class="ka-modal" data-new-message-form><div class="ka-modal__header"><div><h2>Yeni Mesaj</h2><p class="ka-muted">Bir öğretmen seçerek bire bir konuşma başlatın.</p></div></div><div class="ka-modal__body"><label class="ka-field"><span class="ka-field__label">Öğretmen</span><select name="teacherId" required><option value="">Seçiniz</option>\${teachers.map(t=>\`<option value="\${esc(t.id)}">\${esc(teacherName(t))}\${t.brans?\` — \${esc(t.brans)}\`:''}</option>\`).join('')}</select></label></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-new-message-close>Vazgeç</button><button class="ka-btn" type="submit">Konuşmayı Aç</button></div></form></div>\`);
 const modal=document.querySelector('[data-new-message-modal]'),close=()=>modal?.remove();modal?.querySelector('[data-new-message-close]')?.addEventListener('click',close);modal?.addEventListener('click',e=>{if(e.target===modal)close()});modal?.querySelector('[data-new-message-form]')?.addEventListener('submit',async e=>{e.preventDefault();const id=String(new FormData(e.currentTarget).get('teacherId')||''),t=teachers.find(x=>x.id===id);if(!t)return;const btn=e.currentTarget.querySelector('[type="submit"]');btn.disabled=true;try{const conversationId=await globalThis.MesajlasmaService?.konusmaBaslatOgretmenIle?.(t.id,teacherName(t),arr('konusmalar'),t.profilFotoUrl||t.fotoUrl||'');close();if(conversationId)await openMessageConversation(conversationId)}catch(err){safeToast(err?.message==='hesap-yok'?'Bu öğretmene bağlı kullanıcı hesabı bulunamadı.':err?.message==='kendine-mesaj'?'Kendinize mesaj gönderemezsiniz.':err?.message||'Konuşma başlatılamadı.')}finally{btn.disabled=false}})
}
function messageBubble(m){const mine=m.gonderenUid===uid(),file=m.dosya||null,href=file?safeHref(file.url):'';return \`<article class="ka-card" style="max-width:min(86%,680px);\${mine?'margin-left:auto':'margin-right:auto'}"><div class="ka-card__body ka-stack" style="gap:6px"><div class="ka-row ka-row--between"><strong>\${esc(mine?'Siz':m.gonderenAdi||'Kullanıcı')}</strong><small class="ka-muted">\${esc(messageDate(m.tarih))}</small></div>\${m.metin?\`<div style="white-space:pre-wrap">\${esc(m.metin)}</div>\`:''}\${file?\`<div class="ka-row"><span>📎</span><span class="ka-grow">\${esc(file.ad||'Dosya')}</span>\${href?\`<a class="ka-btn ka-btn--secondary ka-btn--sm" href="\${esc(href)}" target="_blank" rel="noopener noreferrer">Aç</a>\`:''}</div>\`:''}\${globalThis.MesajlasmaService?.mesajSilinebilirMi?.(m)?\`<div class="ka-row"><button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-message-delete="\${esc(m.id)}">Mesajı Sil</button></div>\`:''}</div></article>\`}
function messages(){
 const me=uid(),conversations=arr('konusmalar').filter(k=>match([k.grupAdi,k.sonMesaj?.metin,...Object.values(k.katilimciAdlari||{})])).slice().sort((a,b)=>String(b.guncellenmeTarihi||'').localeCompare(String(a.guncellenmeTarihi||'')));
 if(openConversationId){const k=arr('konusmalar').find(x=>x.id===openConversationId);if(!k){queueMicrotask(()=>closeMessageConversation());return{count:conversations.length,html:'<div class="ka-empty">Sohbet bulunamadı.</div>'}};return{count:conversations.length,html:\`<section class="ka-stack" data-message-chat="\${esc(k.id)}"><div class="ka-row ka-row--between"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-message-back>← Sohbetler</button><div class="ka-grow"><strong>\${esc(conversationTitle(k))}</strong><div class="ka-muted">\${k.grupMu?'Grup konuşması':'Bire bir konuşma'}</div></div><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-conversation-delete="\${esc(k.id)}">Sohbeti Sil</button></div><div class="ka-stack" data-message-stream style="max-height:56dvh;overflow:auto;padding:4px">\${messageRows.length?messageRows.map(messageBubble).join(''):'<div class="ka-empty">Henüz mesaj yok.</div>'}</div><form class="ka-card" data-message-form><div class="ka-card__body ka-stack"><textarea name="message" rows="3" placeholder="Mesajınızı yazın…"></textarea><div class="ka-row ka-wrap"><label class="ka-btn ka-btn--secondary ka-btn--sm">📎 Dosya<input type="file" name="file" hidden accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx"></label><span class="ka-muted ka-grow" data-message-file-name>PDF, Word, Excel veya görsel · en fazla 10 MB</span><button class="ka-btn" type="submit" data-ka-permission="communication.messages.send" data-ka-write="communication.messages.send">Gönder</button></div></div></form></section>\`}}
 return{count:conversations.length,html:\`<div class="ka-row ka-row--between"><div><h3>Mesajlar</h3><div class="ka-muted">Konuşmalar cihazdan anında açılır; mesajlar arka planda senkronize edilir.</div></div><button class="ka-btn" type="button" data-message-new data-ka-permission="communication.messages.send" data-ka-write="communication.messages.send">+ Yeni Mesaj</button></div>\${conversations.length?conversations.map(k=>{const title=conversationTitle(k),unread=Number(k.okunmayanlar?.[me]||0);return \`<button class="ka-card ka-list-card" type="button" data-conversation-open="\${esc(k.id)}" style="width:100%;text-align:left"><div class="ka-card__body ka-row"><span class="ka-avatar">\${esc((title[0]||'💬').toLocaleUpperCase('tr'))}</span><div class="ka-grow"><strong>\${esc(title)}</strong><div class="ka-muted">\${esc(k.sonMesaj?.metin||'Henüz mesaj yok')}</div></div>\${unread?\`<span class="ka-badge">\${unread}</span>\`:''}</div></button>\`}).join(''):'<div class="ka-empty">Henüz bir konuşmanız yok.</div>'}\`}
}
`;
src=src.slice(0,messageStart)+messageUi+src.slice(messageEnd);

replaceOnce("globalThis.AnketService?.anketKapat?.(a.id,a.aktif===false)","globalThis.AnketService?.anketKapat?.(a.id,a.aktif!==false)",'poll close/reopen direction');
replaceOnce("const card=out.querySelector(`[data-poll-card=\"${CSS.escape(a.id)}\"]`),ids=[...card.querySelectorAll('[data-poll-option]:checked')].map(x=>x.value);","const card=b.closest('[data-poll-card]'),ids=[...card.querySelectorAll('[data-poll-option]:checked')].map(x=>x.value);",'poll card lookup');

const bindAnchor="function bindCommunicationActions(out){\n if(!out)return;";
const messageBindings=`function bindCommunicationActions(out){
 if(!out)return;
 out.querySelector('[data-message-new]')?.addEventListener('click',openNewMessageModal);
 out.querySelectorAll('[data-conversation-open]').forEach(b=>b.addEventListener('click',()=>openMessageConversation(b.dataset.conversationOpen).catch(e=>safeToast(e?.message||'Sohbet açılamadı.'))));
 out.querySelector('[data-message-back]')?.addEventListener('click',()=>closeMessageConversation());
 out.querySelector('[data-conversation-delete]')?.addEventListener('click',async b=>{const id=b.currentTarget.dataset.conversationDelete,k=arr('konusmalar').find(x=>x.id===id);if(!k||!confirm('Bu sohbet ve mesajları silinsin mi?'))return;try{await globalThis.MesajlasmaService?.konusmaSil?.(id,k);closeMessageConversation();safeToast('Sohbet silindi.')}catch(e){safeToast(e?.message||'Sohbet silinemedi.')}});
 out.querySelectorAll('[data-message-delete]').forEach(b=>b.addEventListener('click',async()=>{const m=messageRows.find(x=>x.id===b.dataset.messageDelete);if(!m||!confirm('Bu mesaj silinsin mi?'))return;try{await globalThis.MesajlasmaService?.mesajSil?.(m)}catch(e){safeToast(e?.message||'Mesaj silinemedi.')}}));
 const form=out.querySelector('[data-message-form]'),file=form?.querySelector('[name="file"]'),fileName=form?.querySelector('[data-message-file-name]');file?.addEventListener('change',()=>{if(fileName)fileName.textContent=file.files?.[0]?.name||'PDF, Word, Excel veya görsel · en fazla 10 MB'});form?.addEventListener('submit',async e=>{e.preventDefault();const k=arr('konusmalar').find(x=>x.id===openConversationId);if(!k)return;const fd=new FormData(form),text=String(fd.get('message')||'').trim(),attachment=file?.files?.[0]||null;if(!text&&!attachment)return;const button=form.querySelector('[type="submit"]');button.disabled=true;const before=button.textContent;try{if(attachment){button.textContent='Yükleniyor…';await globalThis.MesajlasmaService?.mesajGonderDosyaIle?.(k.id,attachment,k,p=>{button.textContent=\`Yükleniyor %\${p}\`})}if(text)await globalThis.MesajlasmaService?.mesajGonder?.(k.id,text,k);form.reset();if(fileName)fileName.textContent='PDF, Word, Excel veya görsel · en fazla 10 MB'}catch(err){const m=err?.message||'';safeToast(m==='dosya-cok-buyuk'?'Dosya 10 MB sınırını aşıyor.':m==='desteklenmeyen-tur'?'Bu dosya türü desteklenmiyor.':m||'Mesaj gönderilemedi.')}finally{button.disabled=false;button.textContent=before}});`;
replaceOnce(bindAnchor,messageBindings,'message action binding anchor');

const oldTabBind="document.querySelectorAll('[data-communication-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.communicationTab;render()});";
const newTabBind="document.querySelectorAll('[data-communication-tab]').forEach(b=>b.onclick=()=>{const next=b.dataset.communicationTab;if(active==='messages'&&next!=='messages')closeMessageConversation(false);active=next;render()});";
replaceOnce(oldTabBind,newTabBind,'communication tab lifecycle');

const oldUnmount="function unmount(){mounted=false;document.querySelector('[data-note-modal]')?.remove();document.querySelector('[data-cal-modal]')?.remove();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}";
const newUnmount="function unmount(){mounted=false;closeMessageConversation(false);document.querySelector('[data-new-message-modal]')?.remove();document.querySelector('[data-note-modal]')?.remove();document.querySelector('[data-cal-modal]')?.remove();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}";
replaceOnce(oldUnmount,newUnmount,'communication unmount lifecycle');

if(src===original)throw new Error('No messaging changes generated.');
fs.writeFileSync(file,src,'utf8');
console.log('Messaging UI + poll lifecycle patch applied.');
