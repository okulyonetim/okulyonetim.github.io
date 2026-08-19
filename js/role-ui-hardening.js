/* Koruk Asistan — Rol/Yetki UI Sertleştirme v2
 * Olay bazlıdır; global MutationObserver/interval kullanmaz.
 */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const QUICK_PREF='dashboardHizliIslemler', QUICK_LS='oyDashboardHizliIslemlerV2';
let lastQuickSig='', quickReady=false, lastUserKey='';
function gv(n){try{return window[n]!==undefined?window[n]:eval(n)}catch(_){return null}}
function user(){return gv('AKTIF_KULLANICI')}
function adminMi(){return !!(user()&&user().admin===true)}
function gorebilirMi(m){if(!m)return true;try{const f=gv('gorebilir');return typeof f==='function'?!!f(m):true}catch(_){return true}}
function toastMsg(s){try{gv('toast')?.(s)}catch(_){}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function openTab(tab){try{const f=gv('sekmeAc');if(typeof f==='function')f(tab);else $(`[data-tab="${tab}"]`)?.click()}catch(_){}}
window.rhQuickOpen=openTab;window.rhTakvimAc=()=>openTab('takvim');

const QUICK_POOL=[
 {id:'evrak',ad:'Evraklarım',icon:'📄',tab:'evrak',mod:'evrak'},
 {id:'dokumanlar',ad:'Dökümanlar',icon:'📁',tab:'dokumanlar',mod:'dokumanlar'},
 {id:'ogrenciler',ad:'Öğrenciler',icon:'👥',tab:'ogrenciler',mod:'ogrenciler'},
 {id:'nobet',ad:'Nöbetler',icon:'🛡️',tab:'nobet',mod:'nobet'},
 {id:'takvim',ad:'Takvim',icon:'📅',tab:'takvim',mod:'takvim'},
 {id:'arama',ad:'Arama',icon:'🔎',tab:'arama',mod:'arama'},
 {id:'mesajlasma',ad:'Mesajlar',icon:'💬',tab:'mesajlasma',mod:'mesajlasma'},
 {id:'mevzuat',ad:'Mevzuat',icon:'⚖️',tab:'mevzuat',mod:'mevzuat'},
 {id:'siniflar',ad:'Sınıflar',icon:'🏫',tab:'siniflar',mod:'siniflar'},
 {id:'haberler',ad:'Haberler',icon:'📰',tab:'haberler',mod:'haberler'},
 {id:'duyurular',ad:'Duyurular',icon:'📢',tab:'duyurular',mod:'duyurular'},
 {id:'programim',ad:'Programım',icon:'🗓️',tab:'dersNobetProgramim',mod:null}
];
function quickAllowed(){return QUICK_POOL.filter(x=>!x.mod||gorebilirMi(x.mod))}
function quickDefaults(){const a=quickAllowed(),want=['evrak','dokumanlar','ogrenciler','nobet','takvim','arama','programim'];return want.map(id=>a.find(x=>x.id===id)).filter(Boolean).slice(0,4).map(x=>x.id)}
function readLocal(){try{const x=JSON.parse(localStorage.getItem(QUICK_LS)||'null');return Array.isArray(x)?x:null}catch(_){return null}}
function writeLocal(ids){try{localStorage.setItem(QUICK_LS,JSON.stringify(ids))}catch(_){}}
async function readRemote(){const db=gv('db'),auth=gv('auth'),uid=auth?.currentUser?.uid;if(!db||!uid)return null;try{const d=await db.collection('oy_kullaniciTercihleri').doc(uid).get();const v=d.exists?d.data()?.[QUICK_PREF]:null;return Array.isArray(v)?v:null}catch(_){return null}}
async function saveRemote(ids){const db=gv('db'),auth=gv('auth'),uid=auth?.currentUser?.uid;if(!db||!uid)return;try{await db.collection('oy_kullaniciTercihleri').doc(uid).set({[QUICK_PREF]:ids,[QUICK_PREF+'Guncelleme']:new Date().toISOString()},{merge:true})}catch(e){console.warn('Hızlı işlem tercihi kaydedilemedi',e)}}
function normalizeQuick(ids){const allowed=quickAllowed(),valid=new Set(allowed.map(x=>x.id));const out=(Array.isArray(ids)?ids:[]).filter((x,i,a)=>valid.has(x)&&a.indexOf(x)===i).slice(0,4);return out.length?out:quickDefaults()}
function renderQuick(ids){return false; /* renderHizliIslemler tarafından yönetiliyor */
const grid=$('.db4 .db4-quick');if(!grid)return false;const chosen=normalizeQuick(ids||readLocal()||quickDefaults());const map=new Map(quickAllowed().map(x=>[x.id,x]));const use=chosen.map(id=>map.get(id)).filter(Boolean);const sig=use.map(x=>x.id).join('|');
 if(sig!==lastQuickSig||grid.children.length!==use.length){grid.innerHTML=use.map(x=>`<button type="button" data-rh-q="${x.id}" onclick="rhQuickOpen('${x.tab}')"><span class="ico">${x.icon}</span><span>${esc(x.ad)}</span></button>`).join('');lastQuickSig=sig;}
 grid.style.gridTemplateColumns=`repeat(${Math.max(1,use.length)},minmax(0,1fr))`;
 const head=grid.closest('.db4-section')?.querySelector('.db4-section-head');if(head){head.querySelector('h2')&&(head.querySelector('h2').textContent='Hızlı İşlemler');head.querySelectorAll('.db4-more-btn:not(.rh-quick-edit)').forEach(x=>x.remove());let b=head.querySelector('.rh-quick-edit');if(!b){b=document.createElement('button');b.type='button';b.className='db4-more-btn rh-quick-edit';b.textContent='✏️ Düzenle';b.onclick=quickEditor;head.appendChild(b)}}return true}
async function initQuick(force){return; /* renderHizliIslemler tarafından yönetiliyor */
const u=user(),auth=gv('auth'),key=auth?.currentUser?.uid||u?.uid||u?.email||'';if(!u)return;if(!force&&quickReady&&key===lastUserKey){renderQuick();return}lastUserKey=key;quickReady=true;let ids=await readRemote();if(!ids||!ids.length)ids=readLocal();ids=normalizeQuick(ids);writeLocal(ids);renderQuick(ids);if(!(await readRemote())?.length)saveRemote(ids)}
function quickEditor(){return; /* _hiDuzenleAc tarafından yönetiliyor */
const allowed=quickAllowed(),current=normalizeQuick(readLocal());const ov=document.createElement('div');ov.className='rh-overlay';ov.innerHTML=`<div class="rh-sheet"><div class="rh-sheet-head"><strong>Hızlı İşlemleri Düzenle</strong><button type="button" data-close>✕</button></div><p>En fazla 4 kart seçin. Seçilen kartlar ana sayfada aynı sırayla görünür.</p><div class="rh-quick-list">${allowed.map(x=>`<label><input type="checkbox" value="${x.id}" ${current.includes(x.id)?'checked':''}><span class="rh-qicon">${x.icon}</span><span>${esc(x.ad)}</span></label>`).join('')}</div><button class="btn btn-amber rh-save" type="button">Kaydet</button></div>`;document.body.appendChild(ov);ov.querySelector('[data-close]').onclick=()=>ov.remove();ov.onclick=e=>{if(e.target===ov)ov.remove()};ov.querySelector('.rh-save').onclick=async()=>{let ids=$$('input:checked',ov).map(x=>x.value);if(!ids.length)return toastMsg('En az bir kart seçin.');if(ids.length>4)return toastMsg('En fazla 4 kart seçebilirsiniz.');ids=normalizeQuick(ids);writeLocal(ids);await saveRemote(ids);lastQuickSig='';renderQuick(ids);ov.remove();toastMsg('Hızlı işlemler kaydedildi.')}}

const ADMIN_ONLY_SETTINGS=['Optik Puan Referans Ayarları','Hatırlatma Sistemi','Depolama Sınırları'];
const READONLY_SETTINGS=['Ders Saatleri','Ders Listesi','Branş Listesi'];
function settingsContainer(title){return $$('details,.ayar-accordion,.settings-section,.card,.accordion-item,section').find(c=>{const h=c.querySelector('summary,h2,h3,h4,.accordion-header');return (h?.textContent||'').replace(/\s+/g,' ').includes(title)})}
function applySettingsRole(){if(!user()||adminMi())return;for(const t of ADMIN_ONLY_SETTINGS){const c=settingsContainer(t);if(c)c.style.display='none'}for(const t of READONLY_SETTINGS){const c=settingsContainer(t);if(!c)continue;c.dataset.rhReadonly='1';$$('button',c).forEach(b=>{if(/sil|ekle|kaydet|güncelle|düzenle|kaldır|delete|🗑|✕|×/i.test((b.textContent||'')+' '+(b.title||'')))b.style.display='none'});$$('input,select,textarea',c).forEach(i=>{if(i.type!=='checkbox'&&i.type!=='radio')i.disabled=true})}}

function evrakRoot(){return $('#tab-evrak')||$('#evrak-tab')||$('.tab-content[data-tab="evrak"]')||$('.tab-panel[data-tab="evrak"]')}
function gunEtiketi(n){n=Number(n);if(!Number.isFinite(n))return'';return n<0?`${Math.abs(n)} gün gecikti`:n===0?'Bugün':`${n} gün kaldı`}
window.renderKisiselEvrak = async function renderKisiselEvrak(){if(adminMi())return;const root=evrakRoot();if(!root)return;Array.from(root.children).forEach(ch=>{if(ch.id!=='rhKisiselEvrak')ch.classList.add('rh-admin-evrak-source')});let box=$('#rhKisiselEvrak',root);if(!box){box=document.createElement('section');box.id='rhKisiselEvrak';box.className='rh-personal-docs';root.appendChild(box)}box.innerHTML='<div class="rh-personal-head"><div><h2>📌 Teslim Etmem Gerekenler</h2><p>Yalnızca hesabınıza bağlı teslim ve belge hatırlatıcıları.</p></div><button type="button" onclick="rhTakvimAc()">Takvim ›</button></div><div class="rh-reminder-list"><div class="rh-empty">Yükleniyor…</div></div>';let m=[];try{const f=gv('hatirlatmalariTopla');if(typeof f==='function')m=await f()}catch(e){console.warn(e)}m=(m||[]).filter(x=>!/^(gorev|gorevler|nobet|yaziliSinav|sinav)$/i.test(String(x?.kaynak||'')));const list=$('.rh-reminder-list',box);if(!m.length){list.innerHTML='<div class="rh-empty">Şu anda teslim etmeniz gereken yaklaşan bir evrak görünmüyor.</div>';return}list.innerHTML=m.map((x,i)=>`<button class="rh-reminder" type="button" data-i="${i}"><span>📄</span><span class="rh-rem-body"><strong>${esc(x.baslik||'Evrak')}</strong>${x.altBaslik?`<small>${esc(x.altBaslik)}</small>`:''}</span><span class="rh-rem-date ${Number(x.gunFarki)<0?'late':''}">${esc(gunEtiketi(x.gunFarki))}</span></button>`).join('');$$('.rh-reminder',list).forEach((b,i)=>b.onclick=()=>typeof m[i]?.git==='function'&&m[i].git())}

function dashboardClean(){ $$('.db4 .db4-today button').forEach(b=>{/Açık Görev/i.test(b.textContent||'')&&b.remove()}); const grid=$('#db41InfoGrid');if(grid)$$('.db41-info',grid).forEach(b=>{const a=b.querySelector('.a')?.textContent?.trim();if(a==='Açık Görev')b.remove();else if(a==='Hatırlatıcı'){b.onclick=()=>openTab('takvim');b.removeAttribute('onclick')}});}
function css(){if($('#rh-hardening-css'))return;const s=document.createElement('style');s.id='rh-hardening-css';s.textContent=`.rh-admin-evrak-source{display:none!important}.rh-personal-docs{padding:2px 0 96px}.rh-personal-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:14px}.rh-personal-head h2{margin:0;color:var(--ink);font-size:22px}.rh-personal-head p{margin:5px 0 0;color:var(--ink-muted);font-size:12px}.rh-personal-head button{border:0;background:none;color:var(--accent,#087f7b);font-weight:800}.rh-reminder-list{display:flex;flex-direction:column;gap:9px}.rh-reminder{width:100%;display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:10px;text-align:left;border:1px solid var(--border);background:var(--surface,#fff);border-radius:16px;padding:13px;color:var(--ink)}.rh-rem-body{display:flex;flex-direction:column;gap:3px}.rh-rem-body small{color:var(--ink-muted)}.rh-rem-date{font-size:10.5px;font-weight:800;padding:5px 8px;border-radius:999px;background:#e6f5f3;color:#087f7b}.rh-rem-date.late{background:#fdeaea;color:#b52e2e}.rh-empty{padding:28px 14px;text-align:center;color:var(--ink-muted);border:1px dashed var(--border);border-radius:16px}.rh-overlay{position:fixed;inset:0;z-index:12000;background:rgba(3,12,20,.56);display:flex;align-items:flex-end;justify-content:center}.rh-sheet{width:min(560px,100%);max-height:82dvh;overflow:auto;background:var(--surface,#fff);color:var(--ink);border-radius:22px 22px 0 0;padding:18px}.rh-sheet-head{display:flex;justify-content:space-between;align-items:center}.rh-sheet-head button{border:0;background:none;color:var(--ink);font-size:20px}.rh-quick-list{display:flex;flex-direction:column;gap:8px;margin:14px 0}.rh-quick-list label{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:14px;padding:12px 14px;cursor:pointer}.rh-quick-list input{width:18px;height:18px;flex-shrink:0}.rh-qicon{font-size:22px}.rh-save{width:100%}[data-theme="dark"] .rh-sheet,[data-theme="dark"] .rh-reminder{background:#0d2438}@media(max-width:560px){.rh-reminder{grid-template-columns:32px minmax(0,1fr)}.rh-rem-date{grid-column:2;justify-self:start}}`;document.head.appendChild(s)}
function apply(){css();if(!user())return;applySettingsRole();dashboardClean();initQuick(false);const r=evrakRoot();if(r&&!adminMi()&&(r.classList.contains('active')||r.style.display!=='none'))renderKisiselEvrak();}
window.rolArayuzunuYenile=apply;
document.addEventListener('click',e=>{const t=e.target.closest('[data-tab],.nav-tab,.bn-item');if(t)setTimeout(()=>{applySettingsRole();dashboardClean();renderQuick();const r=evrakRoot();if(r&&!adminMi()&&(r.classList.contains('active')||r.style.display!=='none'))renderKisiselEvrak()},80)},true);
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{apply();setTimeout(()=>initQuick(true),900)},250));
window.addEventListener('load',()=>setTimeout(apply,500));
})();
