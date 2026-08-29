/* Koruk Asistan — Classic Personel İşleri parity
 * 708c82a görünür personel çalışma alanını mevcut ManagementModule ve
 * PersonelService davranışlarına dokunmadan geri kurar.
 * Yalnız presentation katmanıdır; veri, repository, router veya tema oluşturmaz.
 */
(function(global){
'use strict';
if(global.ClassicPersonnelParity)return;

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const people=()=>{const v=global.AppStore?.data?.('personel');return Array.isArray(v)?v:[]};
const canEdit=()=>!!(global.PermissionService?.can?.('management.personnel.edit','edit')||global.PermissionService?.can?.('management.personnel','edit')||global.duzenleyebilir?.('personel'));
let search='',observer=null,scheduled=false,newBridge=null;
const detailBridge=new Map();

function name(p){return String(p?.adSoyad||[p?.ad,p?.soyad].filter(Boolean).join(' ')||'İsimsiz Personel').trim()||'İsimsiz Personel';}
function nativeStaffPage(){const content=$('#managementContent');if(!content||content.querySelector('[data-classic-personnel-page]'))return false;return [...content.querySelectorAll('h3')].some(h=>h.textContent.trim()==='Personeller');}
function parityStaffPage(){return !!$('#managementContent [data-classic-personnel-page]');}
function shell(){return $('[data-management-module]');}
function headerRow(){return shell()?.querySelector(':scope > .ka-row.ka-row--between')||null;}
function searchWrap(){return shell()?.querySelector('[data-management-search-wrap]')||null;}

function captureBridges(){
  const content=$('#managementContent');
  if(!content||content.querySelector('[data-classic-personnel-page]'))return;
  const n=content.querySelector('[data-staff-new]');
  if(n)newBridge=n;
  content.querySelectorAll('[data-staff-detail]').forEach(b=>{
    const id=b.dataset.staffDetail;
    if(id&&!detailBridge.has(id))detailBridge.set(id,b);
    else if(id)detailBridge.set(id,b);
  });
}

function restoreShell(){
  const h=headerRow(),s=searchWrap();
  if(h)h.hidden=false;
  if(s)s.hidden=false;
}

function openDetail(id){
  const b=detailBridge.get(id);
  if(!b)return global.toast?.('Personel detayı açılamadı. Sayfayı yenileyip tekrar deneyin.');
  b.click();
}
function openEditor(id){
  const b=detailBridge.get(id);
  if(!b)return global.toast?.('Personel düzenleme ekranı açılamadı.');
  b.click();
  const edit=$('#kaManagementStaffDetail [data-staff-edit]');
  if(edit)edit.click();
}
function openNew(){
  if(newBridge)return newBridge.click();
  global.toast?.('Yeni personel formu açılamadı.');
}

function filtered(){
  const q=norm(search.trim());
  return people().filter(p=>!q||norm(p.adSoyad||[p.ad,p.soyad].filter(Boolean).join(' ')).includes(q)||norm(p.tc).includes(q)||norm(p.gorev||p.unvan).includes(q)).sort((a,b)=>name(a).localeCompare(name(b),'tr'));
}

function row(p){
  const role=p.gorev||p.unvan||'Personel',tc=p.tc?`TC: ${esc(p.tc)}`:'TC kaydı yok',phone=p.telefon?` · 📞 ${esc(p.telefon)}`:'',edit=canEdit()&&detailBridge.has(p.id);
  return `<article class="ka-card ka-list-card" data-classic-personnel-id="${esc(p.id)}"><div class="ka-card__body ka-row ka-row--between"><button type="button" class="ka-grow" data-classic-personnel-detail="${esc(p.id)}" style="border:0;background:none;text-align:left;padding:0;color:inherit;min-width:0"><div class="ka-row ka-wrap"><strong>${esc(name(p))}</strong><span class="ka-badge">${esc(role)}</span></div><div class="ka-muted">${tc}${phone}</div></button>${edit?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-classic-personnel-edit="${esc(p.id)}">Düzenle</button>`:''}</div></article>`;
}

function render(force=false){
  if(!parityStaffPage()&&!nativeStaffPage())return false;
  captureBridges();
  const host=$('#managementContent');if(!host)return false;
  const h=headerRow(),s=searchWrap();if(h)h.hidden=true;if(s)s.hidden=true;
  const list=filtered(),sig=JSON.stringify([search,list.map(p=>[p.id,p.adSoyad,p.tc,p.gorev,p.telefon,p.kadroKademesi,p.guncellenmeTarihi])]);
  if(!force&&host.dataset.classicPersonnelSignature===sig&&host.querySelector('[data-classic-personnel-page]'))return true;
  host.dataset.classicPersonnelSignature=sig;
  host.innerHTML=`<section class="ka-stack" data-classic-personnel-page>
    <div class="ka-row ka-row--between ka-wrap"><div class="ka-grow"><h2>Personel İşleri</h2><p class="ka-muted">Sürekli işçi, hizmetli ve diğer personel kayıtları &amp; dilekçe sistemi</p></div>${canEdit()&&newBridge?'<button class="ka-btn" type="button" data-classic-personnel-new>+ Yeni Personel</button>':''}</div>
    <article class="ka-card"><div class="ka-card__body"><input type="search" data-classic-personnel-search value="${esc(search)}" placeholder="🔍 Ad, TC veya görev ile ara..." aria-label="Personel ara"></div></article>
    <article class="ka-card"><div class="ka-card__body ka-stack" data-classic-personnel-list>${list.length?list.map(row).join(''):'<div class="ka-empty">Henüz personel eklenmedi. “+ Yeni Personel” ile ekleyin.</div>'}</div></article>
  </section>`;
  const count=$('#managementCount');if(count)count.textContent=`${list.length} kayıt`;
  host.querySelector('[data-classic-personnel-new]')?.addEventListener('click',openNew);
  host.querySelector('[data-classic-personnel-search]')?.addEventListener('input',e=>{search=e.currentTarget.value;render(true)});
  host.querySelectorAll('[data-classic-personnel-detail]').forEach(b=>b.onclick=()=>openDetail(b.dataset.classicPersonnelDetail));
  host.querySelectorAll('[data-classic-personnel-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();openEditor(b.dataset.classicPersonnelEdit)});
  global.PermissionService?.apply?.(host);
  requestAnimationFrame(()=>host.querySelector('[data-classic-personnel-search]')?.setSelectionRange?.(search.length,search.length));
  return true;
}

function sync(){
  scheduled=false;
  if(nativeStaffPage()){captureBridges();render();return;}
  if(parityStaffPage())return;
  restoreShell();
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(sync);}
function start(){
  if(observer)return;
  const root=$('#v2ModuleRoot')||document.body;
  observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});
  global.AppStore?.subscribe?.('data.personel',schedule);
  global.PermissionService?.subscribe?.(schedule);
  schedule();
}
function stop(){observer?.disconnect();observer=null;restoreShell();detailBridge.clear();newBridge=null;}

global.ClassicPersonnelParity={start,stop,refresh:()=>render(true)};
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='management')schedule()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
