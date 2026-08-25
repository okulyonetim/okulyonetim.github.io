/* Koruk Asistan — Öğretmen özel çizelgeleri: local-first servis + V2 Tools editörü.
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
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[];};
const clone=v=>{try{return structuredClone(v)}catch(_){return JSON.parse(JSON.stringify(v))}};
let preparedFor='',selectedClass='',unsubscribe=null,editingId='',draft=null;
const BUILTIN_COLUMNS=[
  {key:'siraNo',label:'Sıra No'},{key:'ogrenciAdi',label:'Ad Soyad'},{key:'ogrenciNo',label:'Öğrenci No'},
  {key:'cinsiyet',label:'Cinsiyet'},{key:'veliAdi',label:'Veli Adı'},{key:'yakinlik',label:'Yakınlık'},
  {key:'telefon1',label:'Telefon 1'},{key:'telefon2',label:'Telefon 2'},{key:'adres',label:'Adres'},
  {key:'servisAdi',label:'Servis'},{key:'kulupAdi',label:'Sosyal Kulüp'},{key:'notlar',label:'Notlar'}
];
const COLUMN_BY_KEY=Object.fromEntries(BUILTIN_COLUMNS.map(x=>[x.key,x]));

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
  prepare,ogretmenId:teacherId,sablonId:templateId,
  async sablonGetir(sinif){await prepare();const id=teacherId();if(!id)return null;return OgretmenListeRepository.sablonGetir(id,sinif);},
  async sablonKaydet(sinif,veri){await prepare();const id=teacherId();if(!id)throw new Error('ogretmen-bagli-degil');return OgretmenListeRepository.sablonKaydet(id,sinif,veri);},
  kayitlariDinle(sinif,cb){const id=teacherId();if(!id){cb([]);return()=>{};}prepare().catch(e=>console.warn('[OgretmenListe]',e?.message||e));return OgretmenListeRepository.kayitlariDinle(id,sinif,cb);},
  async kayitlariGetir(sinif){await prepare();const id=teacherId();if(!id)return[];return OgretmenListeRepository.kayitlariGetir(id,sinif);},
  async kayitKaydet(sinif,mevcutId,veri){await prepare();const id=teacherId();if(!id)throw new Error('ogretmen-bagli-degil');return mevcutId?OgretmenListeRepository.kayitGuncelle(mevcutId,id,{...veri,sinif:safeClass(sinif)}):OgretmenListeRepository.kayitEkle(id,sinif,veri);},
  async kayitSil(id){await prepare();const tid=teacherId();if(!tid)throw new Error('ogretmen-bagli-degil');return OgretmenListeRepository.kayitSil(id,tid);}
};
function ownClasses(){
  const tid=teacherId(),set=new Set();if(!tid)return[];
  data('dersProgrami').filter(x=>x.ogretmenId===tid).forEach(x=>{if(x.sinif)set.add(String(x.sinif));if(x.sinifAdi)set.add(String(x.sinifAdi));});
  data('siniflar').filter(x=>x.sinifOgretmeniId===tid||x.ogretmenId===tid).forEach(x=>{if(x.ad)set.add(String(x.ad));if(x.sinifAdi)set.add(String(x.sinifAdi));});
  data('ogretmenListeKayit').filter(x=>x.ogretmenId===tid&&x.sinif).forEach(x=>set.add(String(x.sinif)));
  return [...set].filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr'));
}
function rosterForClass(sinifAdi){
  const s=data('siniflar').find(x=>x.ad===sinifAdi),sinifId=s?s.id:sinifAdi;
  return data('veliler').filter(v=>v.sinifId===sinifId||v.sinifId===sinifAdi).sort((a,b)=>String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'));
}
function rosterSnapshot(){return rosterForClass(selectedClass).map(v=>({ogrenciAdi:v.ogrenciAdi||'',ogrenciNo:v.ogrenciNo||'',cinsiyet:v.cinsiyet||'',veliAdi:v.veliAdi||'',yakinlik1:v.yakinlik1||v.yakinlik||'',telefon1:v.telefon1||v.telefon||'',telefon2:v.telefon2||'',adres:v.adres||'',servisAdi:v.servisAdi||'',kulupAdi:v.kulupAdi||'',notlar:v.notlar||''}));}
function teacherRecord(){return data('ogretmenler').find(x=>x.id===teacherId())||null;}
function schoolSettings(){const local=data('okulBilgileri');return global.okulBilgileriAyari||(local.length?local[0]:{})||{};}
function academicYear(){const d=new Date(),y=d.getFullYear();return `${y}-${y+1}`;}
function headerDefaults(){
  const og=teacherRecord(),okul=schoolSettings(),mudur=okul.mudurId?data('ogretmenler').find(x=>x.id===okul.mudurId):null;
  return{okulAdi:okul.okulAdi||'',okulAdiGoster:true,egitimYili:academicYear(),egitimYiliGoster:true,altBaslik:'',altBaslikGoster:false,ogretmenAdSoyad:og?`${og.ad||''} ${og.soyad||''}`.trim():'',ogretmenGoster:true,ogretmenBrans:og?.brans||'',ogretmenBransGoster:true,mudurAdSoyad:mudur?`${mudur.ad||''} ${mudur.soyad||''}`.trim():'',mudurGoster:true,mudurUnvan:'Okul Müdürü',mudurUnvanGoster:true,yon:'portrait'};
}
function valueFor(row,key,index){if(key==='siraNo')return String(index+1);if(key==='yakinlik')return row.yakinlik1||row.yakinlik||'';return row[key]??'';}
function setValue(row,key,value){if(key==='yakinlik'){row.yakinlik1=value;delete row.yakinlik;}else row[key]=value;}
function normalizeCustom(cols){return(Array.isArray(cols)?cols:[]).map((c,i)=>typeof c==='string'?{id:`ozel_${i}_${Date.now().toString(36)}`,label:c}:{id:c.id||`ozel_${i}_${Date.now().toString(36)}`,label:c.label||''}).filter(c=>c.label);}
function normalizeDraft(source={}){
  const order=(Array.isArray(source.sutunSirasi)?source.sutunSirasi:BUILTIN_COLUMNS.map(c=>c.key)).filter(k=>COLUMN_BY_KEY[k]);BUILTIN_COLUMNS.forEach(c=>{if(!order.includes(c.key))order.push(c.key)});
  return{ad:source.ad||'',secilenKeyler:Array.isArray(source.secilenKeyler)?source.secilenKeyler.slice():BUILTIN_COLUMNS.map(c=>c.key),sutunSirasi:order,ozelSutunlar:normalizeCustom(source.ozelSutunlar),satirlar:Array.isArray(source.satirlar)?clone(source.satirlar):rosterSnapshot(),sutunGenislikleri:clone(source.sutunGenislikleri||{}),sutunHizalama:clone(source.sutunHizalama||{}),baslikBilgisi:{...headerDefaults(),...clone(source.baslikBilgisi||{})}};
}
async function newDraft(){if(!selectedClass){global.toast?.('Önce bir sınıf seçin.');return;}editingId='';const tpl=await global.OgretmenListeService.sablonGetir(selectedClass);draft=normalizeDraft(tpl||{});draft.ad='';draft.satirlar=rosterSnapshot();renderUI();}
function openRecord(id){const r=data('ogretmenListeKayit').find(x=>x.id===id&&x.ogretmenId===teacherId());if(!r)return;editingId=id;draft=normalizeDraft(r);renderUI();}
function date(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('tr-TR');}
function canEdit(){return global.PermissionService?.can?.('tools.schedules','edit')!==false;}
function alignmentFor(key){if(draft?.sutunHizalama?.[key])return draft.sutunHizalama[key];return key==='siraNo'||key==='ogrenciNo'?'center':'left';}
function selectedColumns(){if(!draft)return[];const built=draft.sutunSirasi.filter(k=>draft.secilenKeyler.includes(k)).map(k=>({key:k,label:COLUMN_BY_KEY[k]?.label||k}));return[...built,...draft.ozelSutunlar.map(c=>({key:c.id,label:c.label}))];}
function recordCard(r){const rc=Array.isArray(r.satirlar)?r.satirlar.length:0,cc=(r.secilenKeyler?.length||0)+(r.ozelSutunlar?.length||0);return `<article class="ka-card ka-list-card"><div class="ka-card__body ka-row ka-row--between"><div class="ka-grow"><strong>${esc(r.ad||'İsimsiz Çizelge')}</strong><div class="ka-muted">${esc(r.sinif||'')} · ${rc} satır · ${cc} sütun · ${esc(date(r.guncellenme||r.olusturulma))}</div></div><div class="ka-row"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-teacher-list-open="${esc(r.id)}">Aç</button>${canEdit()?`<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-teacher-list-delete="${esc(r.id)}" data-ka-permission="tools.schedules" data-ka-write="tools.schedules">Sil</button>`:''}</div></div></article>`;}
function toggleField(id,label,value,checked,editable=true){return `<label class="ka-field"><span class="ka-field__label">${esc(label)}</span><div class="ka-row"><input class="ka-input ka-grow" data-teacher-list-header="${esc(id)}" value="${esc(value||'')}" ${editable?'':'readonly'}><label class="ka-row"><input type="checkbox" data-teacher-list-header-toggle="${esc(id+'Goster')}" ${checked?'checked':''} ${editable?'':'disabled'}><span>Göster</span></label></div></label>`;}
function editorHtml(){
  if(!draft)return'';const cols=selectedColumns(),editable=canEdit(),bs=draft.baslikBilgisi;
  const choices=draft.sutunSirasi.map(k=>`<label class="ka-row"><input type="checkbox" data-teacher-list-column="${esc(k)}" ${draft.secilenKeyler.includes(k)?'checked':''} ${editable?'':'disabled'}><span>${esc(COLUMN_BY_KEY[k]?.label||k)}</span></label>`).join('');
  const custom=draft.ozelSutunlar.map(c=>`<div class="ka-row ka-row--between"><span>${esc(c.label)}</span>${editable?`<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-teacher-list-custom-remove="${esc(c.id)}">Sil</button>`:''}</div>`).join('');
  const table=cols.length?`<div class="ka-table-wrap"><table class="ka-table"><thead><tr>${cols.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${draft.satirlar.map((row,ri)=>`<tr>${cols.map(c=>`<td>${c.key==='siraNo'?esc(ri+1):`<input class="ka-input" data-teacher-list-cell data-row="${ri}" data-key="${esc(c.key)}" value="${esc(valueFor(row,c.key,ri))}" ${editable?'':'readonly'}>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="ka-empty">En az bir sütun seçin.</div>';
  const header=`<details class="ka-card"><summary class="ka-card__body"><strong>Başlık, İmza ve Sayfa Düzeni</strong></summary><div class="ka-card__body ka-stack"><div class="ka-grid">${toggleField('okulAdi','Okul Adı',bs.okulAdi,bs.okulAdiGoster,editable)}${toggleField('egitimYili','Eğitim-Öğretim Yılı',bs.egitimYili,bs.egitimYiliGoster,editable)}${toggleField('altBaslik','Alt Başlık',bs.altBaslik,bs.altBaslikGoster,editable)}${toggleField('ogretmenAdSoyad','Öğretmen Ad Soyad',bs.ogretmenAdSoyad,bs.ogretmenGoster,editable)}${toggleField('ogretmenBrans','Branş',bs.ogretmenBrans,bs.ogretmenBransGoster,editable)}${toggleField('mudurAdSoyad','Okul Müdürü Ad Soyad',bs.mudurAdSoyad,bs.mudurGoster,editable)}${toggleField('mudurUnvan','Müdür Ünvanı',bs.mudurUnvan,bs.mudurUnvanGoster,editable)}</div><div class="ka-row ka-wrap"><strong>Sayfa yönü:</strong><label class="ka-row"><input type="radio" name="teacherListOrientation" data-teacher-list-orientation value="portrait" ${bs.yon!=='landscape'?'checked':''} ${editable?'':'disabled'}> Dikey A4</label><label class="ka-row"><input type="radio" name="teacherListOrientation" data-teacher-list-orientation value="landscape" ${bs.yon==='landscape'?'checked':''} ${editable?'':'disabled'}> Yatay A4</label></div></div></details>`;
  return `<article class="ka-card" data-teacher-list-editor><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div><h3>${editingId?'Çizelgeyi Düzenle':'Yeni Çizelge'}</h3><p class="ka-muted">${esc(selectedClass)} · ${draft.satirlar.length} öğrenci</p></div><button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-teacher-list-close>Kapat</button></div><label class="ka-field"><span class="ka-field__label">Çizelge Adı</span><input class="ka-input" data-teacher-list-name value="${esc(draft.ad)}" placeholder="Örn: 1. Dönem Not Çizelgesi" ${editable?'':'readonly'}></label>${header}<div class="ka-grid"><section class="ka-stack"><h4>Sütunlar</h4>${choices}</section><section class="ka-stack"><h4>Özel Sütunlar</h4>${custom||'<div class="ka-muted">Özel sütun yok.</div>'}${editable?`<div class="ka-row"><input class="ka-input ka-grow" data-teacher-list-custom-name placeholder="Örn: İmza, Konuşma, Puan"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-teacher-list-custom-add>Ekle</button></div>`:''}</section></div>${table}<div class="ka-row ka-wrap"><button class="ka-btn ka-btn--secondary" type="button" data-teacher-list-report>🖨 A4 Önizleme / PDF</button><button class="ka-btn ka-btn--secondary" type="button" data-teacher-list-excel>📊 Excel'e Aktar</button>${editable?`<button class="ka-btn" type="button" data-teacher-list-save data-ka-permission="tools.schedules" data-ka-write="tools.schedules">💾 Çizelgeyi Kaydet</button><button class="ka-btn ka-btn--secondary" type="button" data-teacher-list-template-save data-ka-permission="tools.schedules" data-ka-write="tools.schedules">Sütun Düzenini Şablon Yap</button>`:''}</div></div></article>`;
}
function ensureTab(){const tabs=document.querySelector('[data-tools-module] .ka-tabs');if(!tabs)return;let b=tabs.querySelector('[data-teacher-list-tab]');if(!b){b=document.createElement('button');b.className='ka-tab';b.type='button';b.dataset.teacherListTab='';b.textContent='Öğretmen Çizelgelerim';tabs.appendChild(b);}b.onclick=()=>openUI();if(!b.dataset.teacherListBound){b.dataset.teacherListBound='1';tabs.addEventListener('click',e=>{if(e.target.closest?.('[data-tools-tab]'))b.classList.remove('active');});}}
async function openUI(){await prepare();ensureTab();document.querySelectorAll('[data-tools-tab]').forEach(b=>b.classList.remove('active'));document.querySelector('[data-teacher-list-tab]')?.classList.add('active');if(!selectedClass)selectedClass=ownClasses()[0]||'';renderUI();subscribeSelection();}
function subscribeSelection(){try{unsubscribe?.();}catch(_){}unsubscribe=null;if(!selectedClass)return;unsubscribe=global.OgretmenListeService.kayitlariDinle(selectedClass,()=>requestAnimationFrame(renderUI));}
function renderUI(){
  const content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount');if(!content)return;const classes=ownClasses(),tid=teacherId(),rows=data('ogretmenListeKayit').filter(x=>x.ogretmenId===tid&&(!selectedClass||x.sinif===selectedClass)).sort((a,b)=>String(b.guncellenme||'').localeCompare(String(a.guncellenme||'')));if(count)count.textContent=`${rows.length} çizelge`;if(!tid){content.innerHTML='<div class="ka-empty">Hesabınıza bağlı öğretmen kaydı bulunamadı.</div>';return;}
  content.innerHTML=`<section class="ka-stack" data-teacher-list-ui><article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div><h3>Öğretmen Çizelgelerim</h3><p class="ka-muted">Cihaz verisi anında açılır; Firestore senkronu arka plandadır.</p></div>${selectedClass&&canEdit()?`<button class="ka-btn" type="button" data-teacher-list-new data-ka-permission="tools.schedules" data-ka-write="tools.schedules">+ Yeni Çizelge</button>`:''}</div><label class="ka-field"><span class="ka-field__label">Sınıf</span><select data-teacher-list-class><option value="">— Sınıf seçin —</option>${classes.map(c=>`<option value="${esc(c)}" ${c===selectedClass?'selected':''}>${esc(c)}</option>`).join('')}</select></label></div></article>${draft?editorHtml():(selectedClass?(rows.length?rows.map(recordCard).join(''):'<div class="ka-empty">Bu sınıf için kayıtlı çizelge bulunamadı.</div>'):'<div class="ka-empty">Bir sınıf seçin.</div>')}</section>`;bindUI(rows);global.PermissionService?.apply?.(content);
}
function bindUI(rows){
  const root=document.querySelector('[data-teacher-list-ui]');if(!root)return;
  root.querySelector('[data-teacher-list-class]')?.addEventListener('change',e=>{selectedClass=e.target.value;editingId='';draft=null;subscribeSelection();renderUI();});
  root.querySelector('[data-teacher-list-new]')?.addEventListener('click',()=>newDraft().catch(e=>global.toast?.(e?.message||'Yeni çizelge açılamadı.')));
  root.querySelectorAll('[data-teacher-list-open]').forEach(b=>b.onclick=()=>openRecord(b.dataset.teacherListOpen));
  root.querySelectorAll('[data-teacher-list-delete]').forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.teacherListDelete);if(!r||!global.confirm?.(`"${r.ad||'Bu çizelge'}" silinsin mi?`))return;try{await global.OgretmenListeService.kayitSil(r.id);if(editingId===r.id){editingId='';draft=null;}global.toast?.('Çizelge cihazdan silindi; senkron kuyruğuna alındı.');}catch(e){global.toast?.(e?.message||'Çizelge silinemedi.');}});
  root.querySelector('[data-teacher-list-close]')?.addEventListener('click',()=>{editingId='';draft=null;renderUI();});
  root.querySelector('[data-teacher-list-name]')?.addEventListener('input',e=>{if(draft)draft.ad=e.target.value;});
  root.querySelectorAll('[data-teacher-list-column]').forEach(el=>el.onchange=()=>{if(!draft)return;draft.secilenKeyler=el.checked?[...new Set([...draft.secilenKeyler,el.dataset.teacherListColumn])]:draft.secilenKeyler.filter(k=>k!==el.dataset.teacherListColumn);renderUI();});
  root.querySelector('[data-teacher-list-custom-add]')?.addEventListener('click',()=>{const input=root.querySelector('[data-teacher-list-custom-name]'),label=input?.value?.trim();if(!label||!draft)return;draft.ozelSutunlar.push({id:'ozel_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),label});renderUI();});
  root.querySelectorAll('[data-teacher-list-custom-remove]').forEach(b=>b.onclick=()=>{if(!draft)return;const id=b.dataset.teacherListCustomRemove;draft.ozelSutunlar=draft.ozelSutunlar.filter(c=>c.id!==id);draft.satirlar.forEach(r=>delete r[id]);renderUI();});
  root.querySelectorAll('[data-teacher-list-cell]').forEach(el=>el.oninput=()=>{if(!draft)return;const row=draft.satirlar[Number(el.dataset.row)];if(row)setValue(row,el.dataset.key,el.value);});
  root.querySelectorAll('[data-teacher-list-header]').forEach(el=>el.oninput=()=>{if(draft)draft.baslikBilgisi[el.dataset.teacherListHeader]=el.value;});
  root.querySelectorAll('[data-teacher-list-header-toggle]').forEach(el=>el.onchange=()=>{if(draft)draft.baslikBilgisi[el.dataset.teacherListHeaderToggle]=el.checked;});
  root.querySelectorAll('[data-teacher-list-orientation]').forEach(el=>el.onchange=()=>{if(draft&&el.checked)draft.baslikBilgisi.yon=el.value;});
  root.querySelector('[data-teacher-list-report]')?.addEventListener('click',openReport);
  root.querySelector('[data-teacher-list-excel]')?.addEventListener('click',()=>exportExcel().catch(e=>{console.error('[OgretmenListe/Excel]',e);global.toast?.('Excel oluşturulamadı: '+(e?.message||e));}));
  root.querySelector('[data-teacher-list-save]')?.addEventListener('click',saveDraft);root.querySelector('[data-teacher-list-template-save]')?.addEventListener('click',saveTemplate);
}
function reportTitle(){return String(draft?.ad||'').trim()||`${selectedClass} Sınıfı Öğrenci Listesi`;}
function reportBody(){
  if(!draft)return'';const cols=selectedColumns(),bs=draft.baslikBilgisi||headerDefaults();if(!cols.length)throw new Error('En az bir sütun seçin.');
  let logo='';try{logo=new URL('assets/icon-192.png',global.location.href).href}catch(_){}
  const meta=bs.egitimYiliGoster&&bs.egitimYili?`${esc(bs.egitimYili)} Eğitim-Öğretim Yılı`:'';
  const left=bs.ogretmenGoster?`<div><div>Öğretmen: <strong>${esc(bs.ogretmenAdSoyad||'...............................')}</strong></div>${bs.ogretmenBransGoster&&bs.ogretmenBrans?`<div>${esc(bs.ogretmenBrans)}</div>`:''}<div style="margin-top:24px">İmza: .......................</div></div>`:'';
  const right=bs.mudurGoster?`<div style="text-align:right"><div>${bs.mudurUnvanGoster&&bs.mudurUnvan?esc(bs.mudurUnvan):'Okul Müdürü'}: <strong>${esc(bs.mudurAdSoyad||'...............................')}</strong></div><div style="margin-top:24px">İmza: .......................</div></div>`:'';
  const heads=cols.map(c=>`<th style="text-align:${alignmentFor(c.key)};background:#1B3A5C;color:#fff;padding:6px;border:1px solid #1B3A5C;white-space:nowrap">${esc(c.label)}</th>`).join('');
  const rows=draft.satirlar.map((r,i)=>`<tr>${cols.map(c=>`<td style="text-align:${alignmentFor(c.key)};padding:5px 6px;border:1px solid #d8dde3;vertical-align:top">${esc(valueFor(r,c.key,i))}</td>`).join('')}</tr>`).join('');
  return `<header style="display:grid;grid-template-columns:64px 1fr 64px;align-items:center;gap:10px;border-bottom:2px solid #263746;padding-bottom:10px;margin-bottom:14px">${logo?`<img src="${esc(logo)}" alt="Okul logosu" style="width:58px;height:58px;object-fit:contain">`:'<span></span>'}<div style="text-align:center">${bs.okulAdiGoster&&bs.okulAdi?`<div style="font-size:15px;font-weight:800;text-transform:uppercase">${esc(bs.okulAdi)}</div>`:''}<div style="font-size:13px;font-weight:700;margin-top:4px">${esc(reportTitle())}</div>${bs.altBaslikGoster&&bs.altBaslik?`<div style="font-size:11px;margin-top:3px">${esc(bs.altBaslik)}</div>`:''}${meta?`<div style="font-size:10px;margin-top:4px;color:#5b6470">${meta}</div>`:''}</div><span></span></header><table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table><div style="text-align:right;margin-top:8px;font-size:10px">Toplam öğrenci sayısı: <strong>${draft.satirlar.length}</strong></div>${left||right?`<footer style="display:flex;justify-content:space-between;gap:24px;margin-top:18px;font-size:10px;line-height:1.6">${left||'<span></span>'}${right||'<span></span>'}</footer>`:''}`;
}
function openReport(){try{if(!global.ReportEngine?.printReport)throw new Error('Rapor motoru hazır değil.');const bs=draft?.baslikBilgisi||{};global.ReportEngine.printReport(reportTitle(),reportBody(),{fileName:reportTitle(),yon:bs.yon==='landscape'?'yatay':'dikey'});}catch(e){global.toast?.(e?.message||'Rapor açılamadı.');}}
function loadScript(src,test){if(test())return Promise.resolve();return new Promise((resolve,reject)=>{const old=[...document.scripts].find(x=>x.src===src);if(old){old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return;}const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
async function excelReady(){if(global.ExcelJS)return true;await loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',()=>!!global.ExcelJS);return !!global.ExcelJS;}
function bufferToBase64(buffer){const bytes=new Uint8Array(buffer);let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(out);}
async function exportExcel(){
  if(!draft)return;const cols=selectedColumns();if(!cols.length)throw new Error('En az bir sütun seçin.');if(!await excelReady())throw new Error('Excel kütüphanesi yüklenemedi.');
  const bs=draft.baslikBilgisi||headerDefaults(),wb=new global.ExcelJS.Workbook(),ws=wb.addWorksheet((selectedClass||'Liste').slice(0,31)),n=cols.length;let rn=1;
  const merged=(text,size=11,color='FF1B3A5C')=>{ws.mergeCells(rn,1,rn,n);const c=ws.getCell(rn,1);c.value=text;c.font={bold:true,size,color:{argb:color}};c.alignment={horizontal:'center',vertical:'middle'};rn++;};
  ws.columns=cols.map(c=>({width:Math.max(10,Math.min(45,Math.round((Number(draft.sutunGenislikleri?.[c.key])||126)/7)))}));
  if(bs.okulAdiGoster&&bs.okulAdi)merged(bs.okulAdi,13);merged(reportTitle(),12);if(bs.altBaslikGoster&&bs.altBaslik)merged(bs.altBaslik,10,'FF444444');if(bs.egitimYiliGoster&&bs.egitimYili)merged(`${bs.egitimYili} Eğitim-Öğretim Yılı`,9,'FF666666');rn++;
  const headNo=rn,head=ws.getRow(rn++),border={style:'thin',color:{argb:'FFB8C2CC'}};cols.forEach((c,i)=>{const cell=head.getCell(i+1);cell.value=c.label;cell.font={bold:true,size:10,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1B3A5C'}};cell.alignment={horizontal:alignmentFor(c.key),vertical:'middle'};cell.border={top:border,left:border,bottom:border,right:border};});
  draft.satirlar.forEach((r,ri)=>{const row=ws.getRow(rn++);cols.forEach((c,ci)=>{const cell=row.getCell(ci+1);cell.value=valueFor(r,c.key,ri);cell.font={size:10};cell.alignment={horizontal:alignmentFor(c.key),vertical:'middle'};cell.border={top:border,left:border,bottom:border,right:border};if(ri%2===1)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F7F7'}};});});
  ws.mergeCells(rn,1,rn,n);const total=ws.getCell(rn,1);total.value=`Toplam öğrenci sayısı: ${draft.satirlar.length}`;total.font={italic:true,size:9,color:{argb:'FF444444'}};total.alignment={horizontal:'right'};ws.views=[{state:'frozen',ySplit:headNo}];
  const buffer=await wb.xlsx.writeBuffer(),name=(global.ReportEngine?.fileName?.(reportTitle())||'Ogrenci_Listesi')+'.xlsx',mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if(typeof global.uygulamaDosyaKaydet==='function')await global.uygulamaDosyaKaydet(bufferToBase64(buffer),name,mime,false);else{const blob=new Blob([buffer],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}global.toast?.('Excel dosyası hazırlandı.');
}
async function saveDraft(){if(!draft||!selectedClass)return;const ad=String(draft.ad||'').trim();if(!ad){global.toast?.('Çizelge adı girin.');return;}const payload={ad,secilenKeyler:draft.secilenKeyler.slice(),sutunSirasi:draft.sutunSirasi.slice(),ozelSutunlar:clone(draft.ozelSutunlar),satirlar:clone(draft.satirlar),sutunGenislikleri:clone(draft.sutunGenislikleri||{}),sutunHizalama:clone(draft.sutunHizalama||{}),baslikBilgisi:clone(draft.baslikBilgisi||{})};try{await global.OgretmenListeService.kayitKaydet(selectedClass,editingId||null,payload);global.toast?.(`"${ad}" cihazda kaydedildi.`);editingId='';draft=null;renderUI();}catch(e){global.toast?.(e?.message||'Çizelge kaydedilemedi.');}}
async function saveTemplate(){if(!draft||!selectedClass)return;try{await global.OgretmenListeService.sablonKaydet(selectedClass,{secilenKeyler:draft.secilenKeyler.slice(),sutunSirasi:draft.sutunSirasi.slice(),ozelSutunlar:clone(draft.ozelSutunlar),baslikBilgisi:clone(draft.baslikBilgisi||{})});global.toast?.('Sütun düzeni cihazda şablon olarak kaydedildi.');}catch(e){global.toast?.(e?.message||'Şablon kaydedilemedi.');}}
global.OgretmenListeUI={open:openUI,render:renderUI,newDraft,openRecord,openReport,exportExcel};
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='tools'){prepare().catch(err=>console.warn('[OgretmenListe/prepare]',err?.message||err));queueMicrotask(ensureTab);}});
})(window);
