/* Koruk Asistan — Öğretmen özel çizelgeleri local-first veri servisi + V2 Tools presentation adaptörü.
 * Veri DeviceData/AppStore'da yaşar; Firestore yalnız SyncEngine arka plan senkronudur.
 */
(function(global){
'use strict';
if(global.OgretmenListeService)return;
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const teacherId=()=>user().bagliOgretmenId||user().ogretmenId||'';
const own=(row,id)=>!!row&&!!id&&row.ogretmenId===id;
const safeClass=v=>String(v||'').trim();
const templateId=(ogretmenId,sinif)=>`${ogretmenId}__${safeClass(sinif)}`.replace(/[^\w\-]/g,'_');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const data=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[];};
let preparedFor='',selectedClass='',unsubscribe=null;

async function prepare(){
  const tid=teacherId();
  if(!tid||!global.SyncEngine||!global.COL?.ogretmenListeSablon||!global.COL?.ogretmenListeKayit)return false;
  if(preparedFor===tid)return true;
  preparedFor=tid;
  SyncEngine.register('ogretmenListeSablon',COL.ogretmenListeSablon,{query:q=>q.where('ogretmenId','==',tid)});
  SyncEngine.register('ogretmenListeKayit',COL.ogretmenListeKayit,{query:q=>q.where('ogretmenId','==',tid)});
  await SyncEngine.localHydrate(['ogretmenListeSablon','ogretmenListeKayit']);
  SyncEngine.schedule(100);
  return true;
}

const OgretmenListeRepository={
  sablonId:templateId,
  sablonGetir(ogretmenId,sinif){const id=templateId(ogretmenId,sinif);return Promise.resolve(device().list('ogretmenListeSablon').find(x=>x.id===id)||null);},
  sablonKaydet(ogretmenId,sinif,veri){const id=templateId(ogretmenId,sinif);return device().set('ogretmenListeSablon',COL.ogretmenListeSablon,id,{...veri,ogretmenId,sinif:safeClass(sinif),guncellenme:new Date().toISOString()},{merge:false});},
  kayitlariDinle(ogretmenId,sinif,callback){return device().listen('ogretmenListeKayit',rows=>callback((rows||[]).filter(x=>own(x,ogretmenId)&&x.sinif===safeClass(sinif)).sort((a,b)=>String(b.guncellenme||'').localeCompare(String(a.guncellenme||'')))));},
  kayitlariGetir(ogretmenId,sinif){return Promise.resolve(device().list('ogretmenListeKayit').filter(x=>own(x,ogretmenId)&&x.sinif===safeClass(sinif)).sort((a,b)=>String(b.guncellenme||'').localeCompare(String(a.guncellenme||''))));},
  kayitEkle(ogretmenId,sinif,veri){const now=new Date().toISOString();return device().add('ogretmenListeKayit',COL.ogretmenListeKayit,{...veri,ogretmenId,sinif:safeClass(sinif),olusturulma:veri.olusturulma||now,guncellenme:now});},
  kayitGuncelle(id,ogretmenId,veri){const mevcut=device().list('ogretmenListeKayit').find(x=>x.id===id);if(mevcut&&!own(mevcut,ogretmenId))return Promise.reject(new Error('sahip-degil'));return device().update('ogretmenListeKayit',COL.ogretmenListeKayit,id,{...veri,ogretmenId,guncellenme:new Date().toISOString()});},
  kayitSil(id,ogretmenId){const mevcut=device().list('ogretmenListeKayit').find(x=>x.id===id);if(mevcut&&!own(mevcut,ogretmenId))return Promise.reject(new Error('sahip-degil'));return device().remove('ogretmenListeKayit',COL.ogretmenListeKayit,id);}
};

global.OgretmenListeRepository=OgretmenListeRepository;
global.OgretmenListeService={
  prepare,
  ogretmenId:teacherId,
  sablonId:templateId,
  async sablonGetir(sinif){await prepare();const id=teacherId();if(!id)return null;return OgretmenListeRepository.sablonGetir(id,sinif);},
  async sablonKaydet(sinif,veri){await prepare();const id=teacherId();if(!id)throw new Error('ogretmen-bagli-degil');return OgretmenListeRepository.sablonKaydet(id,sinif,veri);},
  kayitlariDinle(sinif,cb){const id=teacherId();if(!id){cb([]);return()=>{};}prepare().catch(e=>console.warn('[OgretmenListe]',e?.message||e));return OgretmenListeRepository.kayitlariDinle(id,sinif,cb);},
  async kayitlariGetir(sinif){await prepare();const id=teacherId();if(!id)return[];return OgretmenListeRepository.kayitlariGetir(id,sinif);},
  async kayitKaydet(sinif,mevcutId,veri){await prepare();const id=teacherId();if(!id)throw new Error('ogretmen-bagli-degil');return mevcutId?OgretmenListeRepository.kayitGuncelle(mevcutId,id,{...veri,sinif:safeClass(sinif)}):OgretmenListeRepository.kayitEkle(id,sinif,veri);},
  async kayitSil(id){await prepare();const tid=teacherId();if(!tid)throw new Error('ogretmen-bagli-degil');return OgretmenListeRepository.kayitSil(id,tid);}
};

function ownClasses(){
  const tid=teacherId(),set=new Set();
  if(!tid)return[];
  data('dersProgrami').filter(x=>x.ogretmenId===tid).forEach(x=>{if(x.sinif)set.add(String(x.sinif));if(x.sinifAdi)set.add(String(x.sinifAdi));});
  data('siniflar').filter(x=>x.sinifOgretmeniId===tid||x.ogretmenId===tid).forEach(x=>{if(x.ad)set.add(String(x.ad));if(x.sinifAdi)set.add(String(x.sinifAdi));});
  data('ogretmenListeKayit').filter(x=>x.ogretmenId===tid&&x.sinif).forEach(x=>set.add(String(x.sinif)));
  return [...set].filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr'));
}
function date(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('tr-TR');}
function ensureTab(){
  const tabs=document.querySelector('[data-tools-module] .ka-tabs');
  if(!tabs||tabs.querySelector('[data-teacher-list-tab]'))return;
  const b=document.createElement('button');b.className='ka-tab';b.type='button';b.dataset.teacherListTab='';b.textContent='Öğretmen Çizelgelerim';b.onclick=()=>openUI();tabs.appendChild(b);
  tabs.addEventListener('click',e=>{if(e.target.closest?.('[data-tools-tab]'))b.classList.remove('active');});
}
async function openUI(){
  await prepare();ensureTab();
  document.querySelectorAll('[data-tools-tab]').forEach(b=>b.classList.remove('active'));
  document.querySelector('[data-teacher-list-tab]')?.classList.add('active');
  if(!selectedClass)selectedClass=ownClasses()[0]||'';
  renderUI();subscribeSelection();
}
function subscribeSelection(){
  try{unsubscribe?.();}catch(_){}unsubscribe=null;
  if(!selectedClass)return;
  unsubscribe=global.OgretmenListeService.kayitlariDinle(selectedClass,()=>requestAnimationFrame(renderUI));
}
function recordCard(r){
  const rows=Array.isArray(r.satirlar)?r.satirlar.length:0,cols=(r.secilenKeyler?.length||0)+(r.ozelSutunlar?.length||0),canEdit=global.PermissionService?.can?.('tools.schedules','edit')!==false;
  return `<article class="ka-card ka-list-card"><div class="ka-card__body ka-row ka-row--between"><div class="ka-grow"><strong>${esc(r.ad||'İsimsiz Çizelge')}</strong><div class="ka-muted">${esc(r.sinif||'')} · ${rows} satır · ${cols} sütun · ${esc(date(r.guncellenme||r.olusturulma))}</div></div>${canEdit?`<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-teacher-list-delete="${esc(r.id)}" data-ka-permission="tools.schedules" data-ka-write="tools.schedules">Sil</button>`:''}</div></article>`;
}
function renderUI(){
  const content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount');if(!content)return;
  const classes=ownClasses(),tid=teacherId(),rows=data('ogretmenListeKayit').filter(x=>x.ogretmenId===tid&&(!selectedClass||x.sinif===selectedClass)).sort((a,b)=>String(b.guncellenme||'').localeCompare(String(a.guncellenme||'')));
  if(count)count.textContent=`${rows.length} çizelge`;
  if(!tid){content.innerHTML='<div class="ka-empty">Hesabınıza bağlı öğretmen kaydı bulunamadı.</div>';return;}
  content.innerHTML=`<section class="ka-stack" data-teacher-list-ui><article class="ka-card"><div class="ka-card__body ka-stack"><div><h3>Öğretmen Çizelgelerim</h3><p class="ka-muted">Kayıtlı çizelgeler önce cihazdan açılır; sunucu senkronu arka planda yürür.</p></div><label class="ka-field"><span class="ka-field__label">Sınıf</span><select data-teacher-list-class><option value="">— Sınıf seçin —</option>${classes.map(c=>`<option value="${esc(c)}" ${c===selectedClass?'selected':''}>${esc(c)}</option>`).join('')}</select></label></div></article>${selectedClass?(rows.length?rows.map(recordCard).join(''):'<div class="ka-empty">Bu sınıf için kayıtlı çizelge bulunamadı.</div>'):'<div class="ka-empty">Bir sınıf seçin.</div>'}</section>`;
  content.querySelector('[data-teacher-list-class]')?.addEventListener('change',e=>{selectedClass=e.target.value;subscribeSelection();renderUI();});
  content.querySelectorAll('[data-teacher-list-delete]').forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.teacherListDelete);if(!r)return;if(!global.confirm?.(`"${r.ad||'Bu çizelge'}" silinsin mi?`))return;try{await global.OgretmenListeService.kayitSil(r.id);global.toast?.('Çizelge cihazdan silindi; senkron kuyruğuna alındı.');}catch(e){global.toast?.(e?.message||'Çizelge silinemedi.');}});
  global.PermissionService?.apply?.(content);
}

global.OgretmenListeUI={open:openUI,render:renderUI};
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='tools'){prepare().catch(err=>console.warn('[OgretmenListe/prepare]',err?.message||err));queueMicrotask(ensureTab);}});
})(window);
