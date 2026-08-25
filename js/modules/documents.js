/* Koruk Asistan v2 — Documents UI
   Doküman listesi kullanıcı yetkisine göre SyncEngine ile cihazda tutulur.
   UI Firestore'a doğrudan erişmez. */
(function(){
'use strict';if(window.DocumentsModule)return;
let query='',mounted=false,unsubs=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const arr=t=>{const v=window.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const uid=()=>window.AKTIF_KULLANICI?.uid||window.AppStore?.get?.('session.user')?.uid||'';
const admin=()=>window.AKTIF_KULLANICI?.admin===true;
function time(d){const t=d?.yuklenmeTarihi;if(!t)return 0;if(typeof t.toMillis==='function')return t.toMillis();if(typeof t.seconds==='number')return t.seconds*1000;return new Date(t).getTime()||0}
function docs(){const map=new Map();const source=admin()?arr('dokumanlar'): [...arr('dokumanlarAcik'),...arr('dokumanlarBenim')];source.forEach(d=>d?.id&&map.set(d.id,d));return [...map.values()].sort((a,b)=>time(b)-time(a))}
async function prepareLocal(){
 if(!window.SyncEngine||!window.COL?.dokumanlar)return;
 const types=[];
 if(admin()){SyncEngine.register('dokumanlar',COL.dokumanlar);types.push('dokumanlar')}
 else{
  SyncEngine.register('dokumanlarAcik',COL.dokumanlar,{query:q=>q.where('gorunurluk','==','herkes')});types.push('dokumanlarAcik');
  const u=uid();if(u){SyncEngine.register('dokumanlarBenim',COL.dokumanlar,{query:q=>q.where('olusturanUid','==',u)});types.push('dokumanlarBenim')}
 }
 if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(120)}
}
function shell(){return `<section class="ka-stack" data-documents-module><div class="ka-row ka-row--between"><div><h2>Dokümanlar ve Raporlar</h2><p class="ka-muted">Erişebildiğiniz dokümanlar cihazdan açılır; dosya metadata'sı arka planda güncellenir.</p></div><span id="documentsCount" class="ka-badge"></span></div><label class="ka-field"><span class="ka-field__label">Ara</span><input id="documentsSearch" type="search" placeholder="Doküman, kategori veya oluşturan kişi ara…"></label><div id="documentsContent" class="ka-stack"></div></section>`}
function render(){if(!mounted)return;const q=norm(query.trim());const list=docs().filter(d=>!q||norm([d.baslik,d.aciklama,d.kategori,d.dosyaAdi,d.olusturanAdi].filter(Boolean).join(' ')).includes(q));const out=document.getElementById('documentsContent'),count=document.getElementById('documentsCount');if(count)count.textContent=`${list.length} kayıt`;if(!out)return;out.innerHTML=list.length?list.map(d=>`<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>${esc(d.baslik||d.dosyaAdi||'Doküman')}</strong><div class="ka-muted">${esc([d.kategori,d.olusturanAdi,d.gorunurluk==='herkes'?'Herkese açık':'Kişisel'].filter(Boolean).join(' · '))}</div></div>${d.dosyaUrl?`<a class="ka-btn ka-btn--ghost ka-btn--sm" href="${esc(d.dosyaUrl)}" target="_blank" rel="noopener">Aç</a>`:''}</div></article>`).join(''):'<div class="ka-empty">Doküman bulunamadı.</div>'}
function bind(){const s=document.getElementById('documentsSearch');if(s)s.oninput=()=>{query=s.value;render()}}
function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];['data.dokumanlar','data.dokumanlarAcik','data.dokumanlarBenim'].forEach(p=>{const u=AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)})}
async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bind();subscribe();await prepareLocal();render();return true}
function unmount(){mounted=false;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
window.DocumentsModule={mount,unmount,render,prepareLocal};window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='documents')mount()});
})();
