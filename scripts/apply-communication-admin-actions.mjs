import fs from 'node:fs';
const path='js/modules/communication.js';
let src=fs.readFileSync(path,'utf8');
function once(oldText,newText,label){if(!src.includes(oldText))throw new Error(label+' contract not found; aborting');src=src.replace(oldText,newText)}

once("let active='announcements',query='',mounted=false,unsubs=[],openConversationId='',messageRows=[],messageUnsub=null,calendarCursor=new Date(),calendarSelected=new Date().toISOString().slice(0,10);","let active='announcements',query='',mounted=false,unsubs=[],openConversationId='',messageRows=[],messageUnsub=null,calendarCursor=new Date(),calendarSelected=new Date().toISOString().slice(0,10),announcementArchive=false;",'Communication state');
once("const l=arr('duyurular').filter(x=>!x.arsivlendi&&match([x.baslik,x.icerik,x.aciklama,x.olusturanAdi])).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')));","const l=arr('duyurular').filter(x=>(announcementArchive?x.arsivlendi===true:x.arsivlendi!==true)&&match([x.baslik,x.icerik,x.aciklama,x.olusturanAdi])).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')));",'Announcement archive filter');

const oldAnnouncementDelete='<button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-announcement-delete="${esc(x.id)}" data-ka-write="communication.announcements">Sil</button>';
const newAnnouncementDelete='<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-announcement-edit="${esc(x.id)}">Düzenle</button>'+oldAnnouncementDelete;
once(oldAnnouncementDelete,newAnnouncementDelete,'Announcement edit button');

const oldSourceDelete='<button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-news-source-delete="${esc(s.id)}">Sil</button>';
const newSourceDelete='<div class="ka-row"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-news-source-edit="${esc(s.id)}">Düzenle</button>'+oldSourceDelete+'</div>';
once(oldSourceDelete,newSourceDelete,'News source edit button');

const anchor='function bindCommunicationActions(out){';
if(!src.includes(anchor))throw new Error('bindCommunicationActions anchor missing');
const helpers=String.raw`
function communicationActionBar(){
 const admin=currentUser().admin===true;
 if(active==='announcements')return '<div class="ka-row ka-row--between ka-wrap"><div class="ka-row"><button class="ka-btn ka-btn--sm '+(!announcementArchive?'':'ka-btn--secondary')+'" type="button" data-announcement-filter="active">Aktif</button><button class="ka-btn ka-btn--sm '+(announcementArchive?'':'ka-btn--secondary')+'" type="button" data-announcement-filter="archive">Arşiv</button></div>'+(admin?'<button class="ka-btn ka-btn--sm" type="button" data-announcement-new>+ Yeni Duyuru</button>':'')+'</div>';
 if(active==='polls'&&admin)return '<div class="ka-row ka-row--end"><button class="ka-btn ka-btn--sm" type="button" data-poll-new>+ Yeni Anket</button></div>';
 if(active==='news'&&admin)return '<div class="ka-row ka-row--end"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-news-source-new>+ Haber Kaynağı</button></div>';
 return'';
}
function openAnnouncementModal(item={}){
 document.querySelector('[data-announcement-modal]')?.remove();
 const title=item.id?'Duyuruyu Düzenle':'Yeni Duyuru';
 document.body.insertAdjacentHTML('beforeend','<div class="ka-modal-backdrop" data-announcement-modal><form class="ka-modal" data-announcement-form><div class="ka-modal__header"><h2>'+esc(title)+'</h2></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Başlık *</span><input name="baslik" required value="'+esc(item.baslik||'')+'"></label><label class="ka-field"><span class="ka-field__label">Duyuru</span><textarea name="icerik" rows="8">'+esc(item.icerik||item.aciklama||'')+'</textarea></label><label class="ka-check"><input type="checkbox" name="arsivlendi" '+(item.arsivlendi?'checked':'')+'> Arşivde</label></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-close>Vazgeç</button><button class="ka-btn" type="submit">Kaydet</button></div></form></div>');
 const modal=document.querySelector('[data-announcement-modal]'),close=()=>modal?.remove();
 modal?.querySelector('[data-close]')?.addEventListener('click',close);modal?.addEventListener('click',e=>{if(e.target===modal)close()});
 modal?.querySelector('[data-announcement-form]')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),v={baslik:String(fd.get('baslik')||'').trim(),icerik:String(fd.get('icerik')||'').trim(),arsivlendi:fd.get('arsivlendi')==='on'};if(!v.baslik)return safeToast('Başlık zorunlu.');try{await globalThis.DuyurularService?.duyuruKaydet?.(item.id||null,v);close();safeToast('Duyuru kaydedildi.');render()}catch(err){safeToast(err?.message||'Duyuru kaydedilemedi.')}});
}
function openPollModal(){
 document.querySelector('[data-poll-modal]')?.remove();
 document.body.insertAdjacentHTML('beforeend','<div class="ka-modal-backdrop" data-poll-modal><form class="ka-modal" data-poll-form><div class="ka-modal__header"><h2>Yeni Anket</h2></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Soru *</span><input name="soru" required></label><div class="ka-stack" data-poll-options></div><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-poll-option-add>+ Seçenek Ekle</button><label class="ka-check"><input type="checkbox" name="coklu"> Birden fazla seçenek işaretlenebilsin</label></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-close>Vazgeç</button><button class="ka-btn" type="submit">Anketi Oluştur</button></div></form></div>');
 const modal=document.querySelector('[data-poll-modal]'),list=modal.querySelector('[data-poll-options]'),add=()=>{const row=document.createElement('div');row.className='ka-row';row.innerHTML='<input class="ka-grow" data-poll-option-text placeholder="Seçenek"><button type="button" class="ka-icon-button" data-remove>×</button>';list.appendChild(row);row.querySelector('[data-remove]').onclick=()=>row.remove()};add();add();modal.querySelector('[data-poll-option-add]').onclick=add;const close=()=>modal.remove();modal.querySelector('[data-close]').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});
 modal.querySelector('[data-poll-form]').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),soru=String(fd.get('soru')||'').trim(),secenekler=[...modal.querySelectorAll('[data-poll-option-text]')].map(x=>x.value.trim()).filter(Boolean);try{await globalThis.AnketService?.anketOlustur?.(soru,secenekler,fd.get('coklu')==='on');close();safeToast('Anket oluşturuldu.');render()}catch(err){safeToast(err?.message==='gecersiz'?'Soru ve en az iki seçenek gerekli.':err?.message||'Anket oluşturulamadı.')}};
}
function openNewsSourceModal(item={}){
 document.querySelector('[data-news-source-modal]')?.remove();
 const title=item.id?'Kaynağı Düzenle':'Yeni Haber Kaynağı';
 document.body.insertAdjacentHTML('beforeend','<div class="ka-modal-backdrop" data-news-source-modal><form class="ka-modal" data-news-source-form><div class="ka-modal__header"><h2>'+esc(title)+'</h2></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Kaynak Adı *</span><input name="ad" required value="'+esc(item.ad||'')+'"></label><label class="ka-field"><span class="ka-field__label">RSS / Atom URL *</span><input name="url" type="url" required value="'+esc(item.url||'')+'"></label><label class="ka-check"><input type="checkbox" name="aktif" '+(item.aktif!==false?'checked':'')+'> Aktif</label></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-close>Vazgeç</button><button class="ka-btn" type="submit">Kaydet</button></div></form></div>');
 const modal=document.querySelector('[data-news-source-modal]'),close=()=>modal.remove();modal.querySelector('[data-close]').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});
 modal.querySelector('[data-news-source-form]').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),v={ad:String(fd.get('ad')||'').trim(),url:String(fd.get('url')||'').trim(),aktif:fd.get('aktif')==='on'};try{await globalThis.HaberlerService?.kaynakKaydet?.(item.id||null,v);close();safeToast('Haber kaynağı kaydedildi.');render()}catch(err){safeToast(err?.message||'Kaynak kaydedilemedi.')}};
}
`;
src=src.replace(anchor,helpers+'\n'+anchor);

once("if(out){out.innerHTML=r.html;bindCommunicationActions(out)}","if(out){out.innerHTML=communicationActionBar()+r.html;bindCommunicationActions(out)}",'Communication action bar render');

const bindStart=" if(!out)return;\n out.querySelector('[data-message-new]')?.addEventListener('click',openNewMessageModal);";
const bindNew=" if(!out)return;\n out.querySelectorAll('[data-announcement-filter]').forEach(b=>b.addEventListener('click',()=>{announcementArchive=b.dataset.announcementFilter==='archive';render()}));\n out.querySelector('[data-announcement-new]')?.addEventListener('click',()=>openAnnouncementModal({}));\n out.querySelectorAll('[data-announcement-edit]').forEach(b=>b.addEventListener('click',()=>{const item=arr('duyurular').find(x=>x.id===b.dataset.announcementEdit);if(item)openAnnouncementModal(item)}));\n out.querySelector('[data-poll-new]')?.addEventListener('click',openPollModal);\n out.querySelector('[data-news-source-new]')?.addEventListener('click',()=>openNewsSourceModal({}));\n out.querySelectorAll('[data-news-source-edit]').forEach(b=>b.addEventListener('click',()=>{const item=arr('haberKaynaklari').find(x=>x.id===b.dataset.newsSourceEdit);if(item)openNewsSourceModal(item)}));\n out.querySelector('[data-message-new]')?.addEventListener('click',openNewMessageModal);";
once(bindStart,bindNew,'Communication bind admin actions');

for(const token of ['data-announcement-new','data-announcement-edit','data-announcement-filter','data-poll-new','data-news-source-new','data-news-source-edit','openAnnouncementModal','openPollModal','openNewsSourceModal'])if(!src.includes(token))throw new Error('Admin action contract lost: '+token);
fs.writeFileSync(path,src,'utf8');
console.log('Communication admin actions migrated.');