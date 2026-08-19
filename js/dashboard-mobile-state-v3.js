/* Koruk Asistan — Mobil Dashboard Durum Yöneticisi v3
 * Bilgi Kartları + Hızlı İşlemler için tek kalıcı kaynak.
 * Firestore kullanici tercihi, local cache, sosyal bağlantı tekilleştirme ve tema kontrastı.
 */
(function(){
'use strict';
if(!window.matchMedia('(max-width: 1023px)').matches||window.__dashboardStateV3)return;
window.__dashboardStateV3=true;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const COL='oy_kullaniciTercihleri';
const INFO_FIELD='dashboardMobilBilgiKartlariV3', QUICK_FIELD='dashboardMobilHizliIslemlerV3';
const INFO_LS='oyDashboardMobilBilgiKartlariV3', QUICK_LS='oyDashboardMobilHizliIslemlerV3';
const OLD_INFO_LS='oyDashboardV4KartDuzeni_v2', OLD_QUICK_LS='oyDashboardHizliIslemlerV2';
let state={uid:'',info:null,quick:null,ready:false},loadPromise=null;
function gv(n){try{return window[n]!==undefined?window[n]:eval(n)}catch(_){return null}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function gorebilir(m){if(!m)return true;try{const f=gv('gorebilir');return typeof f==='function'?!!f(m):true}catch(_){return true}}
function authUid(){return gv('auth')?.currentUser?.uid||''}
function db(){return gv('db')}
function userReady(){return !!(authUid()&&gv('AKTIF_KULLANICI'))}
function tab(tab){try{const f=gv('sekmeAc');if(typeof f==='function')f(tab);else $(`[data-tab="${tab}"]`)?.click()}catch(_){}}
function toast(s){try{gv('toast')?.(s)}catch(_){}}
const INFO=[
 {id:'personel',ad:'Personel',ico:'👨‍🏫',mod:'ogretmenler',tab:'ogretmenler'},
 {id:'ogrenci',ad:'Öğrenciler',ico:'🎓',mod:'ogrenciler',tab:'ogrenciler'},
 {id:'sinif',ad:'Sınıflar',ico:'🏫',mod:'siniflar',tab:'siniflar'},
 {id:'servis',ad:'Servisler',ico:'🚌',mod:'tasima',tab:'tasima'},
 {id:'dokuman',ad:'Dökümanlar',ico:'📁',mod:'dokumanlar',tab:'dokumanlar'},
 {id:'hatirlatici',ad:'Hatırlatıcı',ico:'⏰',mod:'takvim',tab:'takvim'},
 {id:'not',ad:'Notlar',ico:'📝',mod:'notlar',tab:'notlar'},
 {id:'sinav',ad:'Sınavlar',ico:'🧪',mod:'sinavIslemleri',tab:'yaziliSinavlar'},
 {id:'duyuru',ad:'Duyurular',ico:'📢',mod:'duyurular',tab:'duyurular'},
 {id:'mesaj',ad:'Mesajlar',ico:'💬',mod:'mesajlasma',tab:'mesajlasma'},
 {id:'nobet',ad:'Nöbetler',ico:'🛡️',mod:'nobet',tab:'nobet'}
];
const QUICK=[
 {id:'evrak',ad:'Evraklarım',ico:'📄',mod:'evrak',tab:'evrak'},
 {id:'dokumanlar',ad:'Dökümanlar',ico:'📁',mod:'dokumanlar',tab:'dokumanlar'},
 {id:'ogrenciler',ad:'Öğrenciler',ico:'👥',mod:'ogrenciler',tab:'ogrenciler'},
 {id:'nobet',ad:'Nöbetler',ico:'🛡️',mod:'nobet',tab:'nobet'},
 {id:'takvim',ad:'Takvim',ico:'📅',mod:'takvim',tab:'takvim'},
 {id:'arama',ad:'Arama',ico:'🔎',mod:null,tab:'arama'},
 {id:'mesajlasma',ad:'Mesajlar',ico:'💬',mod:'mesajlasma',tab:'mesajlasma'},
 {id:'mevzuat',ad:'Mevzuat',ico:'⚖️',mod:'mevzuat',tab:'mevzuat'},
 {id:'siniflar',ad:'Sınıflar',ico:'🏫',mod:'siniflar',tab:'siniflar'},
 {id:'haberler',ad:'Haberler',ico:'📰',mod:'haberler',tab:'haberler'},
 {id:'duyurular',ad:'Duyurular',ico:'📢',mod:'duyurular',tab:'duyurular'},
 {id:'programim',ad:'Programım',ico:'🗓️',mod:null,tab:'dersNobetProgramim'}
];
function allowed(list){return list.filter(x=>gorebilir(x.mod))}
function uniqValid(ids,list,max){const valid=new Set(allowed(list).map(x=>x.id));const out=[];for(const id of Array.isArray(ids)?ids:[]){if(valid.has(id)&&!out.includes(id)){out.push(id);if(max&&out.length>=max)break}}return out}
function infoDefaults(){const a=allowed(INFO),want=['personel','ogrenci','sinif','servis','dokuman','not'];return want.filter(id=>a.some(x=>x.id===id)).slice(0,6)}
function quickDefaults(){const a=allowed(QUICK),want=['dokumanlar','ogrenciler','mesajlasma','programim','arama','takvim'];const out=[];for(const id of want){if(a.some(x=>x.id===id)&&!out.includes(id))out.push(id);if(out.length===4)break}return out}
function lsGet(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}
function migrateInfo(){const n=lsGet(INFO_LS);if(Array.isArray(n))return n;const old=lsGet(OLD_INFO_LS);if(old&&Array.isArray(old.info)&&old.info.length)return old.info;return infoDefaults()}
function migrateQuick(){const n=lsGet(QUICK_LS);if(Array.isArray(n))return n;const old=lsGet(OLD_QUICK_LS);if(Array.isArray(old)&&old.length)return old;return quickDefaults()}
function normalizeInfo(v){const x=uniqValid(v,INFO);return x.length?x:infoDefaults()}
function normalizeQuick(v){const x=uniqValid(v,QUICK,4);return x.length?x:quickDefaults()}
async function saveFields(fields){const uid=authUid(),d=db();if(!uid||!d)return;try{await d.collection(COL).doc(uid).set(Object.assign({},fields,{dashboardMobilV3Guncelleme:new Date().toISOString()}),{merge:true})}catch(e){console.warn('[DashboardV3] tercih kaydı:',e)}}
async function loadState(force){if(loadPromise&&!force)return loadPromise;loadPromise=(async()=>{if(!userReady())return false;const uid=authUid(),d=db();if(!uid||!d)return false;let remote={};try{const s=await d.collection(COL).doc(uid).get();remote=s.exists?s.data()||{}:{}}catch(e){console.warn('[DashboardV3] tercih okuma:',e)}
 const info=normalizeInfo(Array.isArray(remote[INFO_FIELD])?remote[INFO_FIELD]:migrateInfo());
 const quick=normalizeQuick(Array.isArray(remote[QUICK_FIELD])?remote[QUICK_FIELD]:migrateQuick());
 state={uid,info,quick,ready:true};lsSet(INFO_LS,info);lsSet(QUICK_LS,quick);
 if(!Array.isArray(remote[INFO_FIELD])||!Array.isArray(remote[QUICK_FIELD]))saveFields({[INFO_FIELD]:info,[QUICK_FIELD]:quick});
 applyAll();return true})();try{return await loadPromise}finally{loadPromise=null}}
function css(){if($('#dashboard-state-v3-css'))return;const s=document.createElement('style');s.id='dashboard-state-v3-css';s.textContent=`
#tab-panel.db41 .db4-social #heroSosyalMedya,#tab-panel.db41 .db4-social #heroSosyalMedya *{color:var(--d-text)!important;text-shadow:none!important;opacity:1!important;visibility:visible!important;-webkit-text-fill-color:currentColor!important}
#tab-panel.db41 .db4-social #heroSosyalMedya>a,#tab-panel.db41 .db4-social #heroSosyalMedya>button,#tab-panel.db41 .db4-social #heroSosyalMedya>*{color:var(--d-text)!important}
#tab-panel.db41 .db4-social #heroSosyalMedya span,#tab-panel.db41 .db4-social #heroSosyalMedya small,#tab-panel.db41 .db4-social #heroSosyalMedya label,#tab-panel.db41 .db4-social #heroSosyalMedya div{color:var(--d-text)!important;font-weight:750!important;opacity:1!important}
#tab-panel.db41 #db41InfoGrid .db-state-sentinel{display:none!important}
.db-state-editor{display:flex;flex-direction:column;gap:9px}.db-state-row{display:grid;grid-template-columns:34px minmax(0,1fr) 42px 42px 42px;gap:7px;align-items:center;border:1px solid var(--border);border-radius:14px;padding:9px}.db-state-row .ico{font-size:22px}.db-state-row button{height:38px;border:1px solid var(--border);background:var(--surface-2,var(--surface));color:var(--ink);border-radius:10px}.db-state-add{width:100%;display:flex;align-items:center;gap:9px;border:1px solid var(--border);border-radius:13px;padding:11px;margin:6px 0;background:var(--surface);color:var(--ink);text-align:left}.db-state-quick-list{display:flex;flex-direction:column;gap:8px}.db-state-quick-list label{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:13px;padding:12px 14px;cursor:pointer}.db-state-quick-list input{width:18px;height:18px;flex-shrink:0}
`;document.head.appendChild(s)}
function fixSocial(){const panel=$('#tab-panel.db4');if(!panel)return;const duplicate=$('#db41SocialCard',panel);const original=$('.db4-social',panel);const src=$('#heroSosyalMedya',panel)||$('#heroSosyalMedya');if(original&&src&&!original.contains(src)){original.appendChild(src)}if(duplicate)duplicate.remove();if(original){const h=$('.db4-mini-head strong',original);if(h)h.textContent='Sosyal & Bağlantılar'}if(src)$$('*',src).forEach(e=>{e.style?.removeProperty('color');e.style?.removeProperty('opacity');e.style?.removeProperty('-webkit-text-fill-color')})}
function infoHtml(d){return `<button type="button" class="db41-info" data-state-info="${d.id}" onclick="db41Go('${d.tab}')"><div class="i">${d.ico}</div><div class="v">0</div><div class="a">${esc(d.ad)}</div></button>`}
function renderInfo(){const grid=$('#db41InfoGrid');if(!grid||!state.ready)return;const map=new Map(INFO.map(x=>[x.id,x])),ids=normalizeInfo(state.info);state.info=ids;grid.innerHTML=ids.map(id=>map.get(id)).filter(Boolean).map(infoHtml).join('');if(!ids.includes('servis'))grid.insertAdjacentHTML('beforeend','<span class="db41-info db-state-sentinel" aria-hidden="true"><span class="a">Servisler</span><span class="v">0</span></span>');gv('dashboardBilgiKartlariYenile')?.()}
function renderQuick(){if(typeof renderHizliIslemler==='function'){renderHizliIslemler();return;} const grid=$('.db4 .db4-quick');if(!grid||!state.ready)return;const ids=normalizeQuick(state.quick),map=new Map(QUICK.map(x=>[x.id,x]));state.quick=ids;grid.innerHTML=ids.map(id=>map.get(id)).filter(x=>x&&gorebilir(x.mod)).map(x=>`<button type="button" data-state-quick="${x.id}" onclick="dbStateV3Tab('${x.tab}')"><span class="ico">${x.ico}</span><span>${esc(x.ad)}</span></button>`).join('');grid.style.gridTemplateColumns=`repeat(${Math.max(1,ids.length)},minmax(0,1fr))`;const head=grid.closest('.db4-section')?.querySelector('.db4-section-head');if(head){head.querySelectorAll('.db4-more-btn').forEach(b=>b.remove());let b=$('.db-state-quick-edit',head);if(!b){b=document.createElement('button');b.type='button';b.className='db4-more-btn db-state-quick-edit';b.textContent='✏️ Düzenle';head.appendChild(b)}b.onclick=openQuickEditor}}
window.dbStateV3Tab=tab;
function infoEditorBody(temp){const av=allowed(INFO),map=new Map(INFO.map(x=>[x.id,x]));const chosen=temp.map((id,i)=>{const d=map.get(id);if(!d)return'';return `<div class="db-state-row"><span class="ico">${d.ico}</span><strong>${esc(d.ad)}</strong><button type="button" onclick="dbStateInfoMove(${i},-1)">↑</button><button type="button" onclick="dbStateInfoMove(${i},1)">↓</button><button type="button" onclick="dbStateInfoRemove(${i})">×</button></div>`}).join('');const rest=av.filter(x=>!temp.includes(x.id)).map(x=>`<button type="button" class="db-state-add" onclick="dbStateInfoAdd('${x.id}')"><span>${x.ico}</span><span>+ ${esc(x.ad)}</span></button>`).join('')||'<div class="empty-state">Eklenebilir başka kart yok.</div>';return `<div class="db-state-editor"><div style="font-weight:800">Gösterilen Kartlar</div>${chosen||'<div class="empty-state">Henüz kart seçilmedi.</div>'}<div style="font-weight:800;margin-top:8px">Eklenebilir Kartlar</div>${rest}</div>`}
function drawInfoEditor(){const b=$('#modalBody');if(b)b.innerHTML=infoEditorBody(window.__dbStateInfoTemp||[])}
window.dbStateInfoMove=(i,d)=>{const a=window.__dbStateInfoTemp||[],j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];drawInfoEditor()};
window.dbStateInfoRemove=i=>{const a=window.__dbStateInfoTemp||[];a.splice(i,1);drawInfoEditor()};
window.dbStateInfoAdd=id=>{const a=window.__dbStateInfoTemp||[];if(!a.includes(id))a.push(id);window.__dbStateInfoTemp=a;drawInfoEditor()};
function openInfoEditor(){window.__dbStateInfoTemp=[...(state.ready?state.info:normalizeInfo(migrateInfo()))];const f=gv('modalAc');if(typeof f!=='function')return;f('🏠 Ana Sayfa Bilgi Kartları',infoEditorBody(window.__dbStateInfoTemp),async()=>{const ids=normalizeInfo(window.__dbStateInfoTemp||[]);state.info=ids;lsSet(INFO_LS,ids);lsSet(OLD_INFO_LS,{info:ids});await saveFields({[INFO_FIELD]:ids,dashboardBilgiKartlari:ids});gv('modalKapat')?.();renderInfo();toast('Bilgi kartları kalıcı olarak kaydedildi.')},null,'💾 Kaydet')}
window.dashboardV41Duzenle=openInfoEditor;window.dashboardOzellestirModalAc=openInfoEditor;
function openQuickEditor(){const av=allowed(QUICK),cur=normalizeQuick(state.ready?state.quick:migrateQuick());const f=gv('modalAc');if(typeof f!=='function')return;const body=`<div style="font-size:12px;color:var(--ink-muted);margin-bottom:12px">En fazla 4 kart seçebilirsiniz.</div><div class="db-state-quick-list">${av.map(x=>`<label><input type="checkbox" value="${x.id}" ${cur.includes(x.id)?'checked':''}><span style="font-size:22px">${x.ico}</span><span>${esc(x.ad)}</span></label>`).join('')}</div>`;f('⚡ Hızlı İşlemleri Düzenle',body,async()=>{const ids=$$('#modalBody input:checked').map(x=>x.value);if(!ids.length)return toast('En az bir kart seçin.');if(ids.length>4)return toast('En fazla 4 kart seçebilirsiniz.');const av=new Set(allowed(QUICK).map(x=>x.id));const q=ids.filter(id=>av.has(id)).slice(0,4);if(!q.length)return toast('En az bir kart seçin.');state.quick=q;lsSet(QUICK_LS,q);lsSet(OLD_QUICK_LS,q);await saveFields({[QUICK_FIELD]:q,dashboardHizliIslemler:q});gv('modalKapat')?.();renderQuick();toast('Hızlı işlemler kalıcı olarak kaydedildi.')},null,'💾 Kaydet')}
function removeOldDuplicateCards(){const panel=$('#tab-panel.db4');if(!panel)return;$$('[data-kart-id="bekleyenEvrak"]',panel).forEach(x=>x.remove());const oldSchoolLinks=$$('#db41SocialCard',panel);oldSchoolLinks.forEach(x=>x.remove())}
function applyAll(){css();removeOldDuplicateCards();fixSocial();renderInfo();renderQuick();const infoBtn=$('#db41InfoCard .db41-edit');if(infoBtn)infoBtn.onclick=openInfoEditor}
function boot(){css();const a=gv('auth');if(a?.onAuthStateChanged)a.onAuthStateChanged(()=>setTimeout(()=>loadState(true),80));[200,650,1400,2800].forEach(ms=>setTimeout(()=>{if(userReady())loadState(ms>1000);else applyAll()},ms))}
document.addEventListener('DOMContentLoaded',boot,{once:true});window.addEventListener('load',()=>setTimeout(()=>{loadState(true);applyAll()},250));document.addEventListener('click',e=>{if(e.target.closest('[data-tab],.nav-tab,.bn-item,.bottom-nav'))setTimeout(applyAll,90)},true);document.addEventListener('visibilitychange',()=>{if(!document.hidden){applyAll();if(userReady()&&state.uid!==authUid())loadState(true)}});
window.DashboardMobilStateV3={yenile:()=>loadState(true),uygula:applyAll,bilgiDuzenle:openInfoEditor,hizliDuzenle:openQuickEditor};
})();
