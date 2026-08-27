import fs from 'node:fs';

const file='js/modules/communication.js';
let src=fs.readFileSync(file,'utf8');
const original=src;

const start=src.indexOf('function announcements(){');
const end=src.indexOf('function canEditNotes(){');
if(start<0||end<=start)throw new Error('Communication passive-card UI block not found; aborting without changes.');

const interactive=`function announcementText(x){return String(x.icerik||x.aciklama||'').replace(/<[^>]*>/g,'').trim()}
function announcements(){
 const l=arr('duyurular').filter(x=>!x.arsivlendi&&match([x.baslik,x.icerik,x.aciklama,x.olusturanAdi])).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')));
 const me=uid();
 return listResult(l,x=>{const read=!!x.okuyanlar?.[me],body=announcementText(x);return \`<article class="ka-card ka-list-card" data-announcement-card="\${esc(x.id)}"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div class="ka-grow"><div class="ka-row"><strong>\${esc(x.baslik||'Duyuru')}</strong>\${read?'<span class="ka-badge">Okundu</span>':'<span class="ka-badge">Yeni</span>'}</div><div class="ka-muted">\${esc([x.olusturanAdi,date(x.tarih)].filter(Boolean).join(' · '))}</div></div>\${!read?\`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-announcement-read="\${esc(x.id)}">Okundu İşaretle</button>\`:''}</div>\${body?\`<details><summary class="ka-btn ka-btn--ghost ka-btn--sm">Duyuruyu Aç</summary><div style="padding:10px 2px;white-space:pre-wrap">\${esc(body)}</div></details>\`:''}\${currentUser().admin===true?\`<div class="ka-row"><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-announcement-delete="\${esc(x.id)}" data-ka-write="communication.announcements">Sil</button></div>\`:''}</div></article>\`},'Duyuru bulunamadı.')
}
function messages(){const me=uid(),l=arr('konusmalar').filter(k=>match([k.grupAdi,k.sonMesaj?.metin,...Object.values(k.katilimciAdlari||{})]));return listResult(l,k=>{const n=k.grupMu?k.grupAdi:Object.entries(k.katilimciAdlari||{}).filter(([id])=>id!==me).map(([,x])=>x).join(', '),u=Number(k.okunmayanlar?.[me]||0);return\`<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>\${esc(n||'Sohbet')}</strong><div class="ka-muted">\${esc(k.sonMesaj?.metin||'Henüz mesaj yok')}</div></div>\${u?\`<span class="ka-badge">\${u}</span>\`:''}</div></article>\`},'Sohbet bulunamadı.')}
function pollCounts(a){const out={};for(const vote of Object.values(a.oylar||{}))for(const id of vote?.secenekIdler||[])out[id]=(out[id]||0)+1;return out}
function polls(){
 const l=arr('anketler').filter(x=>match([x.soru]));
 const admin=currentUser().admin===true;
 return listResult(l,a=>{const mine=globalThis.AnketService?.kendiOyunuGetir?.(a)||null,selected=new Set(mine?.secenekIdler||[]),counts=pollCounts(a),total=Object.keys(a.oylar||{}).length,inputType=a.coklu?'checkbox':'radio',disabled=a.aktif===false?'disabled':'';return \`<article class="ka-card ka-list-card" data-poll-card="\${esc(a.id)}"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div class="ka-grow"><strong>\${esc(a.soru||'Anket')}</strong><div class="ka-muted">\${a.aktif===false?'Kapalı':'Aktif'} · \${total} katılımcı\${mine?' · Oyunuz kaydedildi':''}</div></div>\${admin?\`<div class="ka-row"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-poll-toggle="\${esc(a.id)}">\${a.aktif===false?'Yeniden Aç':'Kapat'}</button><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-poll-delete="\${esc(a.id)}">Sil</button></div>\`:''}</div><div class="ka-stack">\${(a.secenekler||[]).map(o=>\`<label class="ka-row"><input type="\${inputType}" name="poll_\${esc(a.id)}" value="\${esc(o.id)}" data-poll-option="\${esc(a.id)}" \${selected.has(o.id)?'checked':''} \${disabled}><span class="ka-grow">\${esc(o.metin||'Seçenek')}</span><span class="ka-badge">\${counts[o.id]||0}</span></label>\`).join('')}</div>\${a.aktif!==false?\`<button class="ka-btn ka-btn--sm" type="button" data-poll-vote="\${esc(a.id)}">\${mine?'Oyumu Güncelle':'Oy Ver'}</button>\`:''}</div></article>\`},'Anket bulunamadı.')
}
function safeHref(v){try{const u=new URL(String(v||''));return ['http:','https:'].includes(u.protocol)?u.href:''}catch(_){return''}}
function news(){
 const l=arr('haberler').filter(x=>match([x.baslik,x.ozet,x.kaynak,x.kaynakAdi])).sort((a,b)=>String(b.tarih||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.eklenmeTarihi||'')));
 const admin=currentUser().admin===true;
 const sources=arr('haberKaynaklari').slice().sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));
 const cards=l.map(x=>{const href=safeHref(x.link||x.url),summary=String(x.ozet||'').trim();return \`<article class="ka-card ka-list-card"><div class="ka-card__body ka-stack"><div><strong>\${esc(x.baslik||'Haber')}</strong><div class="ka-muted">\${esc([x.kaynak||x.kaynakAdi,date(x.tarih)].filter(Boolean).join(' · '))}</div></div>\${summary?\`<div>\${esc(summary.slice(0,420))}\${summary.length>420?'…':''}</div>\`:''}<div class="ka-row">\${href?\`<a class="ka-btn ka-btn--secondary ka-btn--sm" href="\${esc(href)}" target="_blank" rel="noopener noreferrer">Haberi Aç</a>\`:''}\${admin?\`<button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-news-delete="\${esc(x.id)}">Sil</button>\`:''}</div></div></article>\`}).join('');
 const sourcePanel=admin?\`<details class="ka-card"><summary class="ka-card__body"><strong>Haber Kaynakları</strong> <span class="ka-badge">\${sources.length}</span></summary><div class="ka-card__body ka-stack">\${sources.length?sources.map(s=>\`<div class="ka-row ka-row--between"><div class="ka-grow"><strong>\${esc(s.ad||'Kaynak')}</strong><div class="ka-muted">\${esc(s.url||'URL yok')} · \${s.aktif===false?'Pasif':'Aktif'}</div></div><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-news-source-delete="\${esc(s.id)}">Sil</button></div>\`).join(''):'<div class="ka-empty">Haber kaynağı bulunamadı.</div>'}</div></details>\`:'';
 return{count:l.length,html:sourcePanel+(cards||'<div class="ka-empty">Haber bulunamadı.</div>')}
}
function bindCommunicationActions(out){
 if(!out)return;
 out.querySelectorAll('[data-announcement-read]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;try{await globalThis.DuyurularService?.okunduIsaretle?.(b.dataset.announcementRead);safeToast('Duyuru okundu olarak işaretlendi.');render()}catch(e){safeToast(e?.message||'Duyuru güncellenemedi.')}finally{b.disabled=false}}));
 out.querySelectorAll('[data-announcement-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Bu duyuru silinsin mi?'))return;try{await globalThis.DuyurularService?.duyuruSil?.(b.dataset.announcementDelete);safeToast('Duyuru silindi.');render()}catch(e){safeToast(e?.message||'Duyuru silinemedi.')}}));
 out.querySelectorAll('[data-poll-vote]').forEach(b=>b.addEventListener('click',async()=>{const a=arr('anketler').find(x=>x.id===b.dataset.pollVote);if(!a)return;const card=out.querySelector(\`[data-poll-card="\${CSS.escape(a.id)}"]\`),ids=[...card.querySelectorAll('[data-poll-option]:checked')].map(x=>x.value);if(!ids.length)return safeToast('En az bir seçenek seçin.');if(!a.coklu&&ids.length>1)return safeToast('Bu ankette yalnız bir seçenek seçilebilir.');b.disabled=true;try{await globalThis.AnketService?.oyVer?.(a,ids);safeToast('Oyunuz kaydedildi.');render()}catch(e){safeToast(e?.message||'Oy kaydedilemedi.')}finally{b.disabled=false}}));
 out.querySelectorAll('[data-poll-toggle]').forEach(b=>b.addEventListener('click',async()=>{const a=arr('anketler').find(x=>x.id===b.dataset.pollToggle);if(!a)return;try{await globalThis.AnketService?.anketKapat?.(a.id,a.aktif===false);render()}catch(e){safeToast(e?.message||'Anket güncellenemedi.')}}));
 out.querySelectorAll('[data-poll-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Bu anket silinsin mi?'))return;try{await globalThis.AnketService?.anketSil?.(b.dataset.pollDelete);safeToast('Anket silindi.');render()}catch(e){safeToast(e?.message||'Anket silinemedi.')}}));
 out.querySelectorAll('[data-news-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Bu haber silinsin mi?'))return;try{await globalThis.HaberlerService?.haberSil?.(b.dataset.newsDelete);render()}catch(e){safeToast(e?.message||'Haber silinemedi.')}}));
 out.querySelectorAll('[data-news-source-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Bu haber kaynağı silinsin mi?'))return;try{await globalThis.HaberlerService?.kaynakSil?.(b.dataset.newsSourceDelete);safeToast('Haber kaynağı silindi.');render()}catch(e){safeToast(e?.message||'Kaynak silinemedi.')}}));
}
`;

src=src.slice(0,start)+interactive+src.slice(end);

const oldRender="function render(){if(!mounted)return;document.querySelectorAll('[data-communication-tab]').forEach(b=>b.classList.toggle('active',b.dataset.communicationTab===active));const out=document.getElementById('communicationContent'),c=document.getElementById('communicationCount');if(active==='calendar'){const r=calendar();if(out){out.innerHTML=r.html;bindCalendar(out)}if(c)c.textContent=`${r.count} kayıt`;PermissionService?.applyModule?.('communication');return}if(active==='notes'){const r=notes();if(out){out.innerHTML=r.html;bindNotes(out)}if(c)c.textContent=`${r.count} kayıt`;PermissionService?.applyModule?.('communication');return}const r=active==='messages'?messages():active==='polls'?polls():active==='news'?news():announcements();if(out)out.innerHTML=r.html;if(c)c.textContent=`${r.count} kayıt`;PermissionService?.applyModule?.('communication')}";
const newRender="function render(){if(!mounted)return;document.querySelectorAll('[data-communication-tab]').forEach(b=>b.classList.toggle('active',b.dataset.communicationTab===active));const out=document.getElementById('communicationContent'),c=document.getElementById('communicationCount');if(active==='calendar'){const r=calendar();if(out){out.innerHTML=r.html;bindCalendar(out)}if(c)c.textContent=`${r.count} kayıt`;PermissionService?.applyModule?.('communication');return}if(active==='notes'){const r=notes();if(out){out.innerHTML=r.html;bindNotes(out)}if(c)c.textContent=`${r.count} kayıt`;PermissionService?.applyModule?.('communication');return}const r=active==='messages'?messages():active==='polls'?polls():active==='news'?news():announcements();if(out){out.innerHTML=r.html;bindCommunicationActions(out)}if(c)c.textContent=`${r.count} kayıt`;PermissionService?.applyModule?.('communication')}";
if(!src.includes(oldRender))throw new Error('Communication render contract changed; aborting without writing.');
src=src.replace(oldRender,newRender);

const oldSubscribe="['data.duyurular','data.konusmalar','data.anketler','data.haberler','data.notlar','data.hatirlaticilar','data.gorevler']";
const newSubscribe="['data.duyurular','data.konusmalar','data.anketler','data.haberler','data.haberKaynaklari','data.notlar','data.hatirlaticilar','data.gorevler']";
if(!src.includes(oldSubscribe))throw new Error('Communication subscription contract changed; aborting without writing.');
src=src.replace(oldSubscribe,newSubscribe);

if(src===original)throw new Error('No communication changes generated.');
fs.writeFileSync(file,src,'utf8');
console.log('Communication announcements/polls/news interactive UI patch applied.');
