/* Koruk Asistan v2 — People UI
   Tek UI sahibi: öğretmenler + sınıflar + öğrenciler.
   Veri kaynağı yalnız AppStore/IndexedDB; bu dosya Firestore dinleyicisi açmaz. */
(function(){
'use strict';
if(window.PeopleModule)return;

let activeTab='teachers',query='',mounted=false,unsubs=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
function data(type){const v=window.AppStore?.data?.(type);return Array.isArray(v)?v:[]}
function teachers(){return data('ogretmenler')}
function classes(){return data('siniflar')}
function students(){return data('veliler')}
function fullName(o){return `${o?.ad||''} ${o?.soyad||''}`.trim()||'İsimsiz'}
function className(id){return classes().find(x=>x.id===id)?.ad||'Sınıfsız'}
function matches(values){const q=norm(query.trim());return !q||norm(values.filter(Boolean).join(' ')).includes(q)}
function initials(o){return `${String(o?.ad||'')[0]||''}${String(o?.soyad||'')[0]||''}`.toLocaleUpperCase('tr')||'?'}

function shell(){return `
  <section class="ka-stack" data-people-module>
    <div class="ka-row ka-row--between">
      <div><h2>Okul Kadrosu</h2><p class="ka-muted">Öğretmen, sınıf ve öğrenci kayıtları cihaz verisinden anında gösterilir.</p></div>
      <span class="ka-badge" id="peopleCount"></span>
    </div>
    <div class="ka-tabs" role="tablist">
      <button class="ka-tab" data-people-tab="teachers" type="button">Öğretmenler</button>
      <button class="ka-tab" data-people-tab="classes" type="button">Sınıflar</button>
      <button class="ka-tab" data-people-tab="students" type="button">Öğrenciler</button>
    </div>
    <label class="ka-field"><span class="ka-field__label">Ara</span><input id="peopleSearch" type="search" placeholder="Ad, branş, sınıf, numara veya veli…" autocomplete="off"></label>
    <div id="peopleContent" class="ka-stack"></div>
  </section>`}

function teacherRows(){
  const list=teachers().filter(o=>matches([o.ad,o.soyad,o.brans,o.unvan,o.telefon,o.eposta])).sort((a,b)=>fullName(a).localeCompare(fullName(b),'tr'));
  return {count:list.length,html:list.length?list.map(o=>`<article class="ka-card ka-list-card" data-person-id="${esc(o.id)}"><div class="ka-card__body ka-row"><span class="ka-avatar">${esc(initials(o))}</span><div class="ka-grow"><strong>${esc(fullName(o))}</strong><div class="ka-muted">${esc([o.brans,o.unvan].filter(Boolean).join(' · ')||'Öğretmen')}</div></div>${o.telefon?`<a class="ka-btn ka-btn--ghost ka-btn--sm" href="tel:${esc(o.telefon)}">Ara</a>`:''}</div></article>`).join(''):'<div class="ka-empty">Öğretmen kaydı bulunamadı.</div>'};
}
function classRows(){
  const ss=students();
  const list=classes().filter(s=>matches([s.ad,s.seviye,s.derslik])).sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr',{numeric:true}));
  return {count:list.length,html:list.length?list.map(s=>{const n=ss.filter(v=>v.sinifId===s.id).length;const og=teachers().find(o=>o.id===s.sinifOgretmeniId);return `<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>${esc(s.ad||'Sınıf')}</strong><div class="ka-muted">${esc(s.derslik||'Derslik belirtilmemiş')} · ${n} öğrenci${og?' · '+esc(fullName(og)):''}</div></div><span class="ka-badge">${n}</span></div></article>`}).join(''):'<div class="ka-empty">Sınıf kaydı bulunamadı.</div>'};
}
function studentRows(){
  const list=students().filter(v=>matches([v.ogrenciAdi,v.ogrenciNo,v.veliAdi,v.telefon,v.telefon1,className(v.sinifId),v.servisAdi])).sort((a,b)=>className(a.sinifId).localeCompare(className(b.sinifId),'tr',{numeric:true})||(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
  return {count:list.length,html:list.length?list.map(v=>`<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><span class="ka-avatar">${esc(String(v.ogrenciAdi||'?')[0].toLocaleUpperCase('tr'))}</span><div class="ka-grow"><strong>${esc(v.ogrenciAdi||'Öğrenci')}</strong><div class="ka-muted">${esc(className(v.sinifId))}${v.ogrenciNo?' · No '+esc(v.ogrenciNo):''}${v.veliAdi?' · '+esc(v.veliAdi):''}</div></div>${v.telefon1||v.telefon?`<a class="ka-btn ka-btn--ghost ka-btn--sm" href="tel:${esc(v.telefon1||v.telefon)}">Ara</a>`:''}</div></article>`).join(''):'<div class="ka-empty">Öğrenci kaydı bulunamadı.</div>'};
}
function render(){
  if(!mounted)return;
  document.querySelectorAll('[data-people-tab]').forEach(b=>b.classList.toggle('active',b.dataset.peopleTab===activeTab));
  const result=activeTab==='classes'?classRows():activeTab==='students'?studentRows():teacherRows();
  const out=document.getElementById('peopleContent'),count=document.getElementById('peopleCount');
  if(out)out.innerHTML=result.html;if(count)count.textContent=`${result.count} kayıt`;
}
function bind(){
  document.querySelectorAll('[data-people-tab]').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.peopleTab;render()}));
  const search=document.getElementById('peopleSearch');if(search)search.addEventListener('input',()=>{query=search.value;render()});
}
function subscribe(){
  unsubs.forEach(fn=>{try{fn()}catch(_){}});unsubs=[];
  ['data.ogretmenler','data.siniflar','data.veliler'].forEach(p=>{const u=window.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)});
}
function mount(root=document.getElementById('v2ModuleRoot')){
  if(!root)return false;mounted=true;root.innerHTML=shell();bind();subscribe();render();return true;
}
function unmount(){mounted=false;unsubs.forEach(fn=>{try{fn()}catch(_){}});unsubs=[]}
window.PeopleModule={mount,unmount,render};
window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='people')mount()});
})();
