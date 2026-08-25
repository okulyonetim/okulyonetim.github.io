/* Koruk Asistan v2 — Academic UI
   Tek UI sahibi: yazılılar + denemeler + yıllık planlar + akademik takvim.
   UI yalnız AppStore/IndexedDB okur; Firestore erişimi SyncEngine arka planındadır. */
(function(){
'use strict';
if(window.AcademicModule)return;
let active='written',query='',mounted=false,unsubs=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const arr=t=>{const v=window.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const match=vals=>{const q=norm(query.trim());return !q||norm(vals.filter(Boolean).join(' ')).includes(q)};
function date(v){if(!v)return'—';const d=new Date(String(v).length===10?v+'T00:00:00':v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('tr-TR')}
const syncDefs=()=>({
  yillikPlanBasliklari:window.COL?.yillikPlanBasliklari,
  yillikPlanTanimlari:window.COL?.yillikPlanTanimlari,
  ogretmenYillikPlanSecimleri:window.COL?.ogretmenYillikPlanSecimleri,
  yillikPlanNotlari:window.COL?.yillikPlanNotlari,
  dersSaatleri:window.COL?.dersSaatleri,
  akademikTakvim:window.COL?.akademikTakvim,
  denemeSonuclari:window.COL?.denemeSonuclari,
  testSonuclari:window.COL?.testSonuclari
});
async function prepareLocal(){if(!window.SyncEngine)return;const defs=syncDefs(),types=[];Object.entries(defs).forEach(([type,col])=>{if(col){SyncEngine.register(type,col);types.push(type)}});if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(80)}}
function shell(){return `<section class="ka-stack" data-academic-module><div class="ka-row ka-row--between"><div><h2>Akademik</h2><p class="ka-muted">Sınavlar ve planlar önce cihaz verisinden gösterilir.</p></div><span id="academicCount" class="ka-badge"></span></div><div class="ka-tabs" role="tablist"><button class="ka-tab" data-academic-tab="written" type="button">Yazılılar</button><button class="ka-tab" data-academic-tab="trial" type="button">Denemeler</button><button class="ka-tab" data-academic-tab="plans" type="button">Yıllık Planlar</button><button class="ka-tab" data-academic-tab="calendar" type="button">Takvim</button></div><label class="ka-field"><span class="ka-field__label">Ara</span><input id="academicSearch" type="search" placeholder="Sınav, ders, sınıf veya plan ara…"></label><div id="academicContent" class="ka-stack"></div></section>`}
function written(){const list=arr('sinavlar').filter(s=>match([s.ders,s.sinif,s.siniflar,s.donem,s.tur,s.tarih])).sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||''));return{count:list.length,html:list.length?list.map(s=>`<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>${esc(s.ders||'Yazılı sınav')}</strong><div class="ka-muted">${esc(s.siniflar||s.sinif||'Sınıf belirtilmemiş')} · ${esc([s.donem,s.yaziliSirasi].filter(Boolean).join(' · ')||'Yazılı')}</div></div><span class="ka-badge">${esc(date(s.tarih))}</span></div></article>`).join(''):'<div class="ka-empty">Yazılı sınav kaydı bulunamadı.</div>'}}
function trials(){const list=arr('denemeSinavlari').filter(s=>match([s.ad,s.sinflar,s.siniflar,s.tarih])).sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||''));return{count:list.length,html:list.length?list.map(s=>`<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>${esc(s.ad||'Deneme sınavı')}</strong><div class="ka-muted">${esc(s.sinflar||s.siniflar||'')} ${s.sayacDurumu?.aktif?'· Sayaç aktif':''}</div></div><span class="ka-badge">${esc(date(s.tarih))}</span></div></article>`).join(''):'<div class="ka-empty">Deneme sınavı kaydı bulunamadı.</div>'}}
function plans(){const list=arr('yillikPlanTanimlari').filter(p=>match([p.dersAdi,p.seviye,p.egitimOgretimYili])).sort((a,b)=>(a.dersAdi||'').localeCompare(b.dersAdi||'','tr'));return{count:list.length,html:list.length?list.map(p=>`<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>${esc(p.dersAdi||'Yıllık plan')}</strong><div class="ka-muted">${esc(p.seviye?`${p.seviye}. sınıf`:'')} ${p.egitimOgretimYili?'· '+esc(p.egitimOgretimYili):''}</div></div><span class="ka-badge">${Array.isArray(p.satirlar)?p.satirlar.length:0} hafta</span></div></article>`).join(''):'<div class="ka-empty">Yıllık plan bulunamadı.</div>'}}
function calendar(){const docs=arr('akademikTakvim'),d=docs.find(x=>x.id==='aktif')||docs[0];return{count:d?1:0,html:d?`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Akademik Takvim</strong><div class="ka-muted">${esc(d.dosyaAdi||d.baslik||'Aktif okul çalışma takvimi')}</div>${d.gorselUrl?`<img class="ka-media" src="${esc(d.gorselUrl)}" alt="Akademik Takvim" loading="lazy">`:''}</div></article>`:'<div class="ka-empty">Akademik takvim yüklenmemiş.</div>'}}
function render(){if(!mounted)return;document.querySelectorAll('[data-academic-tab]').forEach(b=>b.classList.toggle('active',b.dataset.academicTab===active));const r=active==='trial'?trials():active==='plans'?plans():active==='calendar'?calendar():written();const out=document.getElementById('academicContent'),c=document.getElementById('academicCount');if(out)out.innerHTML=r.html;if(c)c.textContent=`${r.count} kayıt`}
function bind(){document.querySelectorAll('[data-academic-tab]').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.academicTab;render()}));const s=document.getElementById('academicSearch');if(s)s.addEventListener('input',()=>{query=s.value;render()})}
function subscribe(){unsubs.forEach(fn=>{try{fn()}catch(_){}});unsubs=[];['data.sinavlar','data.denemeSinavlari','data.yillikPlanTanimlari','data.akademikTakvim'].forEach(p=>{const u=window.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)})}
async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bind();subscribe();await prepareLocal();render();return true}
function unmount(){mounted=false;unsubs.forEach(fn=>{try{fn()}catch(_){}});unsubs=[]}
window.AcademicModule={mount,unmount,render,prepareLocal};window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='academic')mount()});
})();