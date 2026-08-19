/* Koruk Asistan — Rol/Yetki UI Sertleştirme
 * Normal kullanıcı:
 * - admin-only Ayarlar alanlarını görmez
 * - sistem listelerinde silme/yönetim butonlarını görmez
 * - Evrak Takibi yerine yalnız kendi teslim/iş hatırlatıcılarını görür
 * - Hızlı İşlemler kartlarını kullanıcı bazlı düzenleyebilir
 * - Ana sayfada Açık Görev / anlamsız Tümü öğeleri kaldırılır
 */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const QUICK_PREF='dashboardHizliIslemler';
const QUICK_LS='oyDashboardHizliIslemlerV1';

function gv(name){try{return eval(name)}catch(_){try{return window[name]}catch(__){return null}}}
function adminMi(){const u=gv('AKTIF_KULLANICI');return !!(u&&u.admin===true)}
function rolHazirMi(){return !!gv('AKTIF_KULLANICI')}
function gorebilirMi(mod){try{const f=gv('gorebilir');return typeof f==='function'?!!f(mod):true}catch(_){return true}}
function toastMsg(s){try{const f=gv('toast');if(typeof f==='function')f(s)}catch(_){} }
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

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
function quickDefaults(){return quickAllowed().filter(x=>['evrak','dokumanlar','ogrenciler','nobet'].includes(x.id)).map(x=>x.id).slice(0,4)}
function quickReadLocal(){try{const x=JSON.parse(localStorage.getItem(QUICK_LS)||'null');return Array.isArray(x)&&x.length?x:null}catch(_){return null}}
function quickWriteLocal(ids){try{localStorage.setItem(QUICK_LS,JSON.stringify(ids))}catch(_){}}
async function quickReadRemote(){const db=gv('db'),auth=gv('auth'),uid=auth?.currentUser?.uid;if(!db||!uid)return null;try{const s=await db.collection('oy_kullaniciTercihleri').doc(uid).get();const v=s.exists?s.data()?.[QUICK_PREF]:null;return Array.isArray(v)&&v.length?v:null}catch(_){return null}}
async function quickSave(ids){quickWriteLocal(ids);const db=gv('db'),auth=gv('auth'),uid=auth?.currentUser?.uid;if(db&&uid){try{await db.collection('oy_kullaniciTercihleri').doc(uid).set({[QUICK_PREF]:ids,[QUICK_PREF+'Guncelleme']:new Date().toISOString()},{merge:true})}catch(e){console.warn('Hızlı işlem tercihi kaydedilemedi',e)}}renderQuick(ids)}
let quickInitDone=false;
async function quickInit(){if(quickInitDone||!rolHazirMi())return;quickInitDone=true;const remote=await quickReadRemote();const local=quickReadLocal();let ids=remote||local||quickDefaults();const valid=new Set(quickAllowed().map(x=>x.id));ids=ids.filter(x=>valid.has(x)).slice(0,4);if(!ids.length)ids=quickDefaults();quickWriteLocal(ids);if(!remote)quickSave(ids);renderQuick(ids)}
function openTab(tab){try{const f=gv('sekmeAc');if(typeof f==='function')f(tab);else $(`[data-tab="${tab}"]`)?.click()}catch(_){}}
window.rhQuickOpen=openTab;
function renderQuick(ids){
 const grid=$('.db4 .db4-quick');if(!grid)return;
 const valid=quickAllowed();const map=new Map(valid.map(x=>[x.id,x]));
 const use=(ids&&ids.length?ids:quickReadLocal()||quickDefaults()).map(id=>map.get(id)).filter(Boolean).slice(0,4);
 grid.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';
 grid.innerHTML=use.map(x=>`<button type="button" onclick="rhQuickOpen('${x.tab}')"><span class="ico">${x.icon}</span><span>${esc(x.ad)}</span></button>`).join('');
 const sec=grid.closest('.db4-section');const head=sec?.querySelector('.db4-section-head');if(head){
   const h=head.querySelector('h2');if(h)h.textContent='Hızlı İşlemler';
   let b=head.querySelector('.rh-quick-edit');
   head.querySelectorAll('.db4-more-btn').forEach(x=>x.remove());
   if(!b){b=document.createElement('button');b.type='button';b.className='db4-more-btn rh-quick-edit';b.textContent='✏️ Düzenle';b.onclick=quickEditor;head.appendChild(b)}
 }
}
function quickEditor(){
 const current=new Set(quickReadLocal()||quickDefaults());const opts=quickAllowed();
 const ov=document.createElement('div');ov.className='rh-overlay';
 ov.innerHTML=`<div class="rh-sheet"><div class="rh-sheet-head"><strong>Hızlı İşlemleri Düzenle</strong><button type="button" data-close>✕</button></div><p>En fazla 4 kart seçin. Sıralama seçim sırasına göre yapılır.</p><div class="rh-quick-list">${opts.map(x=>`<label><input type="checkbox" value="${x.id}" ${current.has(x.id)?'checked':''}><span class="rh-qicon">${x.icon}</span><span>${esc(x.ad)}</span></label>`).join('')}</div><button type="button" class="btn btn-amber rh-save">Kaydet</button></div>`;
 document.body.appendChild(ov);ov.querySelector('[data-close]').onclick=()=>ov.remove();ov.addEventListener('click',e=>{if(e.target===ov)ov.remove()});
 ov.querySelector('.rh-save').onclick=async()=>{const ids=$$('input:checked',ov).map(x=>x.value);if(!ids.length){toastMsg('En az bir hızlı işlem seçin.');return}if(ids.length>4){toastMsg('En fazla 4 hızlı işlem seçebilirsiniz.');return}await quickSave(ids);ov.remove();toastMsg('Hızlı işlemler kaydedildi.')};
}

function removeOpenTask(){
 $$('.db4 .db4-today button').forEach(b=>{if(/Açık Görev/i.test(b.textContent||''))b.remove()});
 $$('#db41InfoGrid .db41-info').forEach(b=>{if(/Açık Görev/i.test(b.querySelector('.a')?.textContent||''))b.remove()});
}

const ADMIN_ONLY_SETTINGS=['Optik Puan Referans Ayarları','Hatırlatma Sistemi','Depolama Sınırları'];
const READONLY_SETTINGS=['Ders Saatleri','Ders Listesi','Branş Listesi'];
function settingsContainerByTitle(title){
 const candidates=$$('details,.ayar-accordion,.settings-section,.card,.accordion-item,section');
 return candidates.find(c=>{const t=(c.querySelector('summary,h2,h3,h4,.accordion-header')?.textContent||'').replace(/\s+/g,' ').trim();return t.includes(title)})||null;
}
function ayarlarYetkiUygula(){
 if(!rolHazirMi()||adminMi())return;
 ADMIN_ONLY_SETTINGS.forEach(t=>{const c=settingsContainerByTitle(t);if(c)c.style.display='none'});
 READONLY_SETTINGS.forEach(t=>{const c=settingsContainerByTitle(t);if(!c)return;c.dataset.rhReadonly='1';
   $$('button',c).forEach(b=>{const tx=(b.textContent||'')+' '+(b.title||'');if(/sil|ekle|kaydet|güncelle|düzenle|kaldır|×|✕/i.test(tx)||b.classList.contains('btn-danger'))b.style.display='none'});
   $$('input,select,textarea',c).forEach(i=>{if(i.type!=='checkbox'&&i.type!=='radio')i.disabled=true});
 });
 // Branş listesindeki dinamik satır silme butonları ayrıca yakalanır.
 $$('button').forEach(b=>{const p=b.closest('details,.ayar-accordion,.settings-section,.card,.accordion-item,section');if(!p)return;const txt=(p.textContent||'');if(/Branş Listesi/.test(txt)&&/sil|kaldır|delete|🗑|✕|×/i.test((b.textContent||'')+' '+(b.title||'')))b.style.display='none'});
}

function evrakRoot(){return $('#tab-evrak')||$('#evrak-tab')||$('.tab-content[data-tab="evrak"]')||$('.tab-panel[data-tab="evrak"]')}
function evrakKaynakGizle(root){if(!root)return;Array.from(root.children).forEach(ch=>{if(ch.id!=='rhKisiselEvrak')ch.classList.add('rh-admin-evrak-source')})}
function gunEtiketi(n){n=Number(n);if(!Number.isFinite(n))return'';if(n<0)return `${Math.abs(n)} gün gecikti`;if(n===0)return 'Bugün';return `${n} gün kaldı`}
async function renderKisiselEvrak(){
 if(adminMi())return;const root=evrakRoot();if(!root)return;evrakKaynakGizle(root);
 let box=$('#rhKisiselEvrak',root);if(!box){box=document.createElement('section');box.id='rhKisiselEvrak';box.className='rh-personal-docs';root.appendChild(box)}
 box.innerHTML='<div class="rh-personal-head"><div><h2>📌 Teslim Etmem Gerekenler</h2><p>Yalnızca hesabınıza bağlı teslim ve belge hatırlatıcıları gösterilir.</p></div><button type="button" onclick="rhTakvimAc()">Takvim ›</button></div><div class="rh-reminder-list"><div class="rh-empty">Yükleniyor…</div></div>';
 let maddeler=[];try{const f=gv('hatirlatmalariTopla');if(typeof f==='function')maddeler=await f()}catch(e){console.warn('Kişisel evrak hatırlatıcıları alınamadı',e)}
 const skip=/^(gorev|gorevler|nobet|yaziliSinav|sinav)$/i; maddeler=(maddeler||[]).filter(x=>!skip.test(String(x?.kaynak||'')));
 const list=$('.rh-reminder-list',box);if(!maddeler.length){list.innerHTML='<div class="rh-empty">Şu anda teslim etmeniz gereken yaklaşan bir evrak görünmüyor.</div>';return}
 list.innerHTML=maddeler.map((m,i)=>`<button type="button" class="rh-reminder" data-rh-rem="${i}"><span class="rh-rem-icon">📄</span><span class="rh-rem-body"><strong>${esc(m.baslik||'Evrak / teslim hatırlatıcısı')}</strong>${m.altBaslik?`<small>${esc(m.altBaslik)}</small>`:''}</span><span class="rh-rem-date ${Number(m.gunFarki)<0?'late':''}">${esc(gunEtiketi(m.gunFarki))}</span></button>`).join('');
 $$('.rh-reminder',list).forEach((b,i)=>b.onclick=()=>{const m=maddeler[i];if(m&&typeof m.git==='function')m.git()});
}
window.rhTakvimAc=()=>openTab('takvim');

function aktifSekmeKontrol(){
 const r=evrakRoot();if(!r)return;
 const active=r.classList.contains('active')||r.style.display!=='none';if(active&&!adminMi())renderKisiselEvrak();
}
function clickGuard(e){if(adminMi())return;const t=e.target.closest('button,a');if(!t)return;const c=t.closest('[data-rh-readonly="1"]');if(c){const tx=(t.textContent||'')+' '+(t.title||'');if(/sil|ekle|kaydet|güncelle|düzenle|kaldır|delete|🗑/i.test(tx)){e.preventDefault();e.stopImmediatePropagation();toastMsg('Bu işlem yalnızca yönetici tarafından yapılabilir.')}}}

function css(){if($('#rh-hardening-css'))return;const s=document.createElement('style');s.id='rh-hardening-css';s.textContent=`
.rh-admin-evrak-source{display:none!important}.rh-personal-docs{padding:2px 0 96px}.rh-personal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.rh-personal-head h2{margin:0;color:var(--ink);font-size:22px}.rh-personal-head p{margin:5px 0 0;color:var(--ink-muted);font-size:12px}.rh-personal-head button{border:0;background:none;color:var(--accent,#078b87);font-weight:800}.rh-reminder-list{display:flex;flex-direction:column;gap:9px}.rh-reminder{width:100%;display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:10px;text-align:left;border:1px solid var(--border);background:var(--surface,#fff);border-radius:16px;padding:13px;color:var(--ink)}.rh-rem-icon{font-size:22px}.rh-rem-body{display:flex;flex-direction:column;gap:3px;min-width:0}.rh-rem-body strong{font-size:13px}.rh-rem-body small{color:var(--ink-muted);font-size:11px}.rh-rem-date{font-size:10.5px;font-weight:800;padding:5px 8px;border-radius:999px;background:rgba(8,127,123,.1);color:#087f7b;white-space:nowrap}.rh-rem-date.late{background:rgba(210,58,58,.1);color:#b52e2e}.rh-empty{padding:28px 14px;text-align:center;color:var(--ink-muted);border:1px dashed var(--border);border-radius:16px}
.rh-overlay{position:fixed;inset:0;z-index:12000;background:rgba(3,12,20,.56);display:flex;align-items:flex-end;justify-content:center}.rh-sheet{width:min(560px,100%);max-height:82dvh;overflow:auto;background:var(--surface,#fff);color:var(--ink);border-radius:22px 22px 0 0;padding:18px}.rh-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.rh-sheet-head strong{font-size:18px}.rh-sheet-head button{border:0;background:none;color:var(--ink);font-size:20px}.rh-sheet>p{color:var(--ink-muted);font-size:12px}.rh-quick-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.rh-quick-list label{display:flex;align-items:center;gap:9px;border:1px solid var(--border);border-radius:14px;padding:11px;background:var(--surface-soft,rgba(127,127,127,.05))}.rh-quick-list input{width:18px;height:18px}.rh-qicon{font-size:22px}.rh-save{width:100%}
[data-theme="dark"] .rh-reminder{background:#0d2438;border-color:#31516a}[data-theme="dark"] .rh-sheet{background:#0d2438}[data-theme="dark"] .rh-rem-date{color:#4fe1d9;background:rgba(43,211,202,.12)}
@media(max-width:560px){.rh-personal-head h2{font-size:19px}.rh-reminder{grid-template-columns:34px minmax(0,1fr);}.rh-rem-date{grid-column:2;justify-self:start}.rh-quick-list{grid-template-columns:1fr 1fr}}
`;document.head.appendChild(s)}

function run(){css();if(!rolHazirMi())return;ayarlarYetkiUygula();removeOpenTask();quickInit();renderQuick();aktifSekmeKontrol()}
document.addEventListener('click',clickGuard,true);document.addEventListener('DOMContentLoaded',()=>setTimeout(run,500));
let timer=setInterval(run,900);setTimeout(()=>clearInterval(timer),90000);
let raf=0;new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(run)}).observe(document.documentElement,{childList:true,subtree:true});
})();
