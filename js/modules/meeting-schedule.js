/* Koruk Asistan — Toplantı Çizelgesi
 * Ortak toplantı bilgileri + çoklu satır planlama.
 * Veri akışı: DeviceData -> IndexedDB/AppStore -> SyncEngine -> Firestore.
 */
(function(global){
'use strict';
if(global.MeetingSchedulePage)return;

const TYPE='toplantiCizelgesi';
const TUR_ADI=Object.freeze({sok:'ŞÖK',zumre:'Zümre',diger:'Diğer'});
const KADEME_ADI=Object.freeze({ilkokul:'İlkokul',ortaokul:'Ortaokul'});
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const currentName=()=>{const u=user();return String(u.adSoyad||u.ad||u.displayName||u.kullaniciAdi||'').trim()||'—'};
const tempId=()=>`row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const groupId=()=>`meeting_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;

let root=null,mounted=false,unsubs=[],editingGroupId='',editingLegacyKey='',formMessage='',saving=false,openClassRowId='';
let common=blankCommon();
let rows=[blankRow()];

function blankCommon(kademe='ilkokul',tur='sok'){
  return{kademe,tur,baslik:''};
}
function blankRow(seed={}){
  return{
    uid:tempId(),recordId:'',seviye:'',dersId:'',dersAdi:'',satirKonusu:'',
    tumSiniflar:false,sinifIdler:[],tarih:String(seed.tarih||today()),saat:String(seed.saat||'14:00')
  };
}
function canView(){const u=user();return u.admin===true||!!u.uid}
function canEdit(){return user().admin===true}
function levelOf(s){const m=String(s?.ad||s?.sinifAdi||'').match(/\d+/);const n=Number(m?.[0]||0);return n>=1&&n<=8?n:0}
function className(s){return String(s?.ad||s?.sinifAdi||'').trim()}
function classes(){return arr('siniflar').slice().filter(x=>className(x)).sort((a,b)=>className(a).localeCompare(className(b),'tr',{numeric:true}))}
function lessons(){return arr('dersListesi').slice().filter(x=>String(x?.ad||'').trim()).sort((a,b)=>String(a.ad).localeCompare(String(b.ad),'tr'))}
function records(){return arr(TYPE).slice().sort((a,b)=>`${a.tarih||''} ${a.saat||''}`.localeCompare(`${b.tarih||''} ${b.saat||''}`,'tr'))}
function school(){const l=arr('okulBilgileri');return l.find(x=>x.id==='ayarlar')||l[0]||global.okulBilgileriAyari||{}}
function principalName(){const o=school(),id=o.mudurId;if(id){const t=arr('ogretmenler').find(x=>x.id===id);if(t)return`${t.ad||''} ${t.soyad||''}`.trim()}const t=arr('ogretmenler').find(x=>String(x.unvan||'').toLocaleLowerCase('tr')==='müdür');return t?`${t.ad||''} ${t.soyad||''}`.trim():''}
function formatDate(iso){if(!iso)return'—';const d=new Date(`${iso}T00:00:00`);return isNaN(d)?iso:d.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'})}

function eligibleClasses(row){
  let list=classes().filter(s=>common.kademe==='ilkokul'?levelOf(s)>=1&&levelOf(s)<=4:levelOf(s)>=5&&levelOf(s)<=8);
  if(common.kademe==='ilkokul'&&common.tur==='zumre'&&Number(row?.seviye))list=list.filter(s=>levelOf(s)===Number(row.seviye));
  return list;
}
function selectedClassNames(r){
  if(r.tumSiniflar)return'Tüm Sınıflar';
  const map=new Map(classes().map(s=>[s.id,className(s)]));
  const names=(Array.isArray(r.sinifAdlari)&&r.sinifAdlari.length?r.sinifAdlari:(r.sinifIdler||[]).map(id=>map.get(id)).filter(Boolean));
  return names.length?names.join(', '):'—';
}
function scopeText(r){
  if(r.tur!=='zumre')return String(r.satirKonusu||'').trim()||'—';
  if(r.kademe==='ilkokul'){
    const l=(r.zumreSeviyeleri||[]).map(Number).filter(Boolean).sort((a,b)=>a-b);
    return l.length?l.map(n=>`${n}. Sınıf`).join(', '):'Sınıf Zümresi';
  }
  return r.dersAdi||lessons().find(x=>x.id===r.dersId)?.ad||r.bransAdi||'Ders Zümresi';
}
function commonTitle(r){return String(r.toplantiBasligi||r.konu||'').trim()||scopeText(r)||TUR_ADI[r.tur]||'Toplantı'}
function groupKey(r){return r.grupId?`group:${r.grupId}`:`legacy:${r.id}`}
function groupedRecords(){
  const map=new Map();
  records().forEach(r=>{const k=groupKey(r);if(!map.has(k))map.set(k,[]);map.get(k).push(r)});
  return [...map.entries()].map(([key,list])=>({key,list:list.sort((a,b)=>Number(a.grupSira||0)-Number(b.grupSira||0)||`${a.tarih||''} ${a.saat||''}`.localeCompare(`${b.tarih||''} ${b.saat||''}`))}));
}
function typeBadge(t){return `<span class="ka-meeting-badge ka-meeting-badge--${esc(t)}">${esc(TUR_ADI[t]||t||'Toplantı')}</span>`}

const Repository={
  dinle:cb=>global.DeviceData.listen(TYPE,cb),
  ekle:v=>global.DeviceData.add(TYPE,COL.toplantiCizelgesi,v),
  guncelle:(id,v)=>global.DeviceData.update(TYPE,COL.toplantiCizelgesi,id,v),
  sil:id=>global.DeviceData.remove(TYPE,COL.toplantiCizelgesi,id)
};
const Service={
  kaydet(id,v){if(!canEdit())return Promise.reject(new Error('yetkisiz'));return id?Repository.guncelle(id,v):Repository.ekle(v)},
  sil(id){if(!canEdit())return Promise.reject(new Error('yetkisiz'));return Repository.sil(id)}
};
global.ToplantiCizelgesiRepository=Repository;
global.ToplantiCizelgesiService=Service;

async function prepareLocal(){
  if(!global.SyncEngine||!global.COL?.toplantiCizelgesi)return false;
  const defs={toplantiCizelgesi:COL.toplantiCizelgesi,siniflar:COL.siniflar,dersListesi:COL.dersListesi,okulBilgileri:COL.okulBilgileri,ogretmenler:COL.ogretmenler},types=[];
  Object.entries(defs).forEach(([t,c])=>{if(c){SyncEngine.register(t,c);types.push(t)}});
  await SyncEngine.localHydrate(types);SyncEngine.schedule(100);return true;
}

function segmented(marker,values,current){
  return `<div class="ka-meeting-segmented ${values.length===3?'ka-meeting-segmented--3':''}">${values.map(([v,label])=>`<button type="button" class="ka-meeting-segment ${current===v?'is-active':''}" ${marker}="${esc(v)}" aria-pressed="${current===v?'true':'false'}">${esc(label)}</button>`).join('')}</div>`;
}
function rowDetailField(row,index){
  if(common.tur==='zumre'&&common.kademe==='ortaokul'){
    return `<label class="ka-field"><span class="ka-field__label">Ders</span><select data-meeting-row-lesson="${esc(row.uid)}"><option value="">Ders seçiniz</option>${lessons().map(d=>`<option value="${esc(d.id)}" ${row.dersId===d.id?'selected':''}>${esc(d.ad)}</option>`).join('')}</select></label>`;
  }
  if(common.tur==='zumre'&&common.kademe==='ilkokul'){
    return `<label class="ka-field"><span class="ka-field__label">Sınıf Düzeyi</span><select data-meeting-row-level="${esc(row.uid)}"><option value="">Düzey seçiniz</option>${[1,2,3,4].map(n=>`<option value="${n}" ${Number(row.seviye)===n?'selected':''}>${n}. Sınıf</option>`).join('')}</select></label>`;
  }
  const label=common.tur==='sok'?'Konu / Gündem':'Konu / Açıklama';
  return `<label class="ka-field"><span class="ka-field__label">${label} <small class="ka-muted">(isteğe bağlı)</small></span><input data-meeting-row-topic="${esc(row.uid)}" value="${esc(row.satirKonusu)}" placeholder="Örn. Akademik başarı"></label>`;
}
function classDropdown(row){
  const list=eligibleClasses(row),selected=row.tumSiniflar?[]:row.sinifIdler.filter(Boolean),label=row.tumSiniflar?'Tüm Sınıflar':selected.length?selectedClassNames(row):'Sınıf seçiniz',open=openClassRowId===row.uid;
  return `<div class="ka-field"><span class="ka-field__label">Sınıflar <small class="ka-muted">(isteğe bağlı, çoklu)</small></span><button type="button" class="ka-btn ka-btn--secondary" data-meeting-class-menu="${esc(row.uid)}" aria-expanded="${open?'true':'false'}"><span>${esc(label)}</span><span class="ka-badge">${row.tumSiniflar?'Tümü':selected.length}</span></button>${open?`<div class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-meeting-class-grid"><button type="button" class="ka-meeting-chip ka-meeting-chip--all ${row.tumSiniflar?'is-active':''}" data-meeting-row-all-classes="${esc(row.uid)}" aria-pressed="${row.tumSiniflar?'true':'false'}">Tüm Sınıflar</button>${list.map(s=>{const on=!row.tumSiniflar&&selected.includes(s.id);return`<button type="button" class="ka-meeting-chip ${on?'is-active':''}" data-meeting-row-class="${esc(row.uid)}" data-class-id="${esc(s.id)}" aria-pressed="${on?'true':'false'}">${esc(className(s))}</button>`}).join('')}</div>${selected.length||row.tumSiniflar?`<button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-meeting-clear-classes="${esc(row.uid)}">Seçimi Temizle</button>`:''}${list.length?'':'<small class="ka-muted">Bu satıra uygun sınıf kaydı bulunamadı.</small>'}</div></div>`:''}</div>`;
}
function rowHtml(row,index){
  return `<article class="ka-card ka-meeting-item" data-meeting-row="${esc(row.uid)}"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div class="ka-row ka-wrap"><span class="ka-badge">Satır ${index+1}</span>${common.tur==='zumre'?typeBadge('zumre'):''}</div><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm ka-meeting-delete" data-meeting-remove-row="${esc(row.uid)}" ${rows.length===1?'disabled':''}>Sil</button></div><div class="ka-grid">${rowDetailField(row,index)}${classDropdown(row)}<label class="ka-field"><span class="ka-field__label">Tarih</span><input type="date" data-meeting-row-date="${esc(row.uid)}" value="${esc(row.tarih)}"></label><label class="ka-field"><span class="ka-field__label">Saat</span><input type="time" data-meeting-row-time="${esc(row.uid)}" value="${esc(row.saat)}"></label></div></div></article>`;
}
function formHtml(){
  const editMode=!!editingGroupId||!!editingLegacyKey;
  return `<article class="ka-card ka-meeting-form-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div><h3>${editMode?'Toplantı Grubunu Düzenle':'Toplantı Bilgileri'}</h3><p class="ka-muted">Ortak başlığı bir kez girin; farklı ders, sınıf, tarih ve saatleri satırlar halinde ekleyin.</p></div>${editMode?'<span class="ka-badge">Düzenleme</span>':''}</div><div class="ka-field"><span class="ka-field__label">Kademe</span>${segmented('data-meeting-kademe',[['ilkokul','İlkokul'],['ortaokul','Ortaokul']],common.kademe)}</div><div class="ka-field"><span class="ka-field__label">Toplantı Türü</span>${segmented('data-meeting-type',[['sok','ŞÖK'],['zumre','Zümre'],['diger','Diğer']],common.tur)}</div><label class="ka-field"><span class="ka-field__label">Toplantı Başlığı <small class="ka-muted">(ortak)</small></span><input data-meeting-common-title value="${esc(common.baslik)}" placeholder="Örn. 2. Dönem Zümre Toplantıları"></label><div class="ka-row ka-row--between"><div><h3>Toplantı Detayları (Satırlar)</h3><p class="ka-muted">Sınıflar isteğe bağlıdır ve her satırda birden fazla seçilebilir.</p></div><button type="button" class="ka-btn ka-btn--secondary" data-meeting-add-row ${saving?'disabled':''}>＋ Satır Ekle</button></div>${rows.map(rowHtml).join('')}${formMessage?`<div class="ka-card" data-meeting-form-message role="alert"><div class="ka-card__body"><strong>⚠️ ${esc(formMessage)}</strong></div></div>`:''}<div class="ka-meeting-form-actions"><button type="button" class="ka-btn ka-btn--secondary" data-meeting-reset ${saving?'disabled':''}>${editMode?'Vazgeç':'Temizle'}</button><button type="button" class="ka-btn" data-meeting-save-all ${saving?'disabled':''}>💾 ${saving?'Kaydediliyor…':`Tümünü Kaydet (${rows.length})`}</button></div></div></article>`;
}
function groupSummary(group){
  const first=group.list[0]||{},title=commonTitle(first),dates=group.list.map(r=>`${r.tarih||''} ${r.saat||''}`).filter(Boolean).sort(),firstDate=dates[0]?`${formatDate(dates[0].slice(0,10))} ${dates[0].slice(11,16)}`:'—',lastDate=dates.length>1?`${formatDate(dates[dates.length-1].slice(0,10))} ${dates[dates.length-1].slice(11,16)}`:'';
  const chips=group.list.slice(0,5).map(r=>{const detail=scopeText(r);return detail&&detail!=='—'?`<span class="ka-badge">${esc(detail)}</span>`:''}).join('');
  return `<article class="ka-card ka-meeting-item"><div class="ka-card__body ka-stack"><div class="ka-meeting-item__top"><div class="ka-stack"><div class="ka-row ka-wrap">${typeBadge(first.tur)}<strong>${esc(title)}</strong></div><span class="ka-muted">${group.list.length} oturum</span></div><span class="ka-meeting-item__date">${esc(lastDate?`${firstDate} – ${lastDate}`:firstDate)}</span></div><div class="ka-row ka-wrap">${chips}${group.list.length>5?`<span class="ka-badge">+${group.list.length-5}</span>`:''}</div>${group.list.map((r,i)=>`<div class="ka-row ka-row--between"><span>${esc(scopeText(r))}${r.satirKonusu&&r.tur==='zumre'?` · ${esc(r.satirKonusu)}`:''}</span><small class="ka-muted">${esc(selectedClassNames(r))} · ${esc(formatDate(r.tarih))} ${esc(r.saat||'')}</small></div>`).join('')}${canEdit()?`<div class="ka-meeting-item__actions"><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-meeting-edit-group="${esc(group.key)}">Düzenle</button><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm ka-meeting-delete" data-meeting-delete-group="${esc(group.key)}">Sil</button></div>`:''}</div></article>`;
}
function listHtml(){
  const groups=groupedRecords();
  return `<section class="ka-stack ka-meeting-list"><div class="ka-row ka-row--between"><div><h3>Kaydedilen Toplantılar</h3><p class="ka-muted">Aynı ortak başlığa ait satırlar tek grup altında gösterilir.</p></div><span class="ka-badge">${groups.length} grup · ${records().length} satır</span></div>${groups.length?groups.map(groupSummary).join(''):'<div class="ka-empty">Henüz toplantı eklenmedi.</div>'}<button type="button" class="ka-btn ka-btn--secondary ka-meeting-report-button" data-meeting-report ${records().length?'':'disabled'}>🖨️ Raporu Yazdır</button></section>`;
}
function pageHtml(){return `<section class="ka-stack ka-meeting-page" data-meeting-schedule-page><div class="ka-meeting-page__intro"><h2>Toplantı Çizelgesi</h2><p class="ka-muted">Ortak başlık altında Zümre, ŞÖK ve diğer toplantıları çoklu satır halinde planlayın.</p></div>${canEdit()?formHtml():''}${listHtml()}</section>`}

function clearFormMessage(){formMessage='';root?.querySelector('[data-meeting-form-message]')?.remove()}
function rowByUid(uid){return rows.find(r=>r.uid===uid)}
function resetForm({keepKademe=true,keepTur=true}={}){
  const kademe=keepKademe?common.kademe:'ilkokul',tur=keepTur?common.tur:'sok';
  common=blankCommon(kademe,tur);rows=[blankRow()];editingGroupId='';editingLegacyKey='';openClassRowId='';formMessage='';saving=false;
}
function setKademe(k){if(!canEdit()||!['ilkokul','ortaokul'].includes(k)||k===common.kademe)return;clearFormMessage();common.kademe=k;rows=rows.map(r=>blankRow({tarih:r.tarih,saat:r.saat}));openClassRowId='';render()}
function setType(t){if(!canEdit()||!['sok','zumre','diger'].includes(t)||t===common.tur)return;clearFormMessage();common.tur=t;rows=rows.map(r=>blankRow({tarih:r.tarih,saat:r.saat}));openClassRowId='';render()}
function addRow(){if(!canEdit()||saving)return;clearFormMessage();const last=rows[rows.length-1]||{};rows.push(blankRow({tarih:last.tarih,saat:last.saat}));openClassRowId='';render()}
function removeRow(uid){if(!canEdit()||saving||rows.length===1)return;rows=rows.filter(r=>r.uid!==uid);if(openClassRowId===uid)openClassRowId='';render()}
function pruneRowClasses(row){const eligible=new Set(eligibleClasses(row).map(s=>s.id));row.sinifIdler=row.sinifIdler.filter(id=>eligible.has(id));if(row.tumSiniflar&&!eligible.size)row.tumSiniflar=false}
function toggleRowClass(uid,classId){const row=rowByUid(uid);if(!row||!canEdit())return;clearFormMessage();row.tumSiniflar=false;const set=new Set(row.sinifIdler);set.has(classId)?set.delete(classId):set.add(classId);row.sinifIdler=[...set];render()}
function toggleAllClasses(uid){const row=rowByUid(uid);if(!row||!canEdit())return;clearFormMessage();row.tumSiniflar=!row.tumSiniflar;if(row.tumSiniflar)row.sinifIdler=[];render()}
function clearClasses(uid){const row=rowByUid(uid);if(!row||!canEdit())return;row.tumSiniflar=false;row.sinifIdler=[];render()}
function validate(){
  if(!common.baslik.trim())return'Toplantı başlığını giriniz.';
  if(!rows.length)return'En az bir toplantı satırı ekleyiniz.';
  for(let i=0;i<rows.length;i++){
    const r=rows[i],no=i+1;
    if(!r.tarih)return`${no}. satır için tarih seçiniz.`;
    if(!r.saat)return`${no}. satır için saat seçiniz.`;
    if(common.tur==='zumre'&&common.kademe==='ilkokul'&&!Number(r.seviye))return`${no}. satır için sınıf düzeyi seçiniz.`;
    if(common.tur==='zumre'&&common.kademe==='ortaokul'&&!r.dersId)return`${no}. satır için ders seçiniz.`;
  }
  return'';
}
function payloadForRow(row,index,grp,old){
  const eligible=new Map(eligibleClasses(row).map(s=>[s.id,s])),lesson=lessons().find(x=>x.id===row.dersId),u=user(),title=common.baslik.trim();
  return{
    kademe:common.kademe,tur:common.tur,toplantiBasligi:title,konu:title,grupId:grp,grupSira:index+1,
    zumreSeviyeleri:common.tur==='zumre'&&common.kademe==='ilkokul'&&Number(row.seviye)?[Number(row.seviye)]:[],
    dersId:common.tur==='zumre'&&common.kademe==='ortaokul'?String(row.dersId||''):'',
    dersAdi:common.tur==='zumre'&&common.kademe==='ortaokul'?String(lesson?.ad||row.dersAdi||''):'',
    satirKonusu:String(row.satirKonusu||'').trim(),tumSiniflar:!!row.tumSiniflar,
    sinifIdler:row.tumSiniflar?[]:row.sinifIdler.filter(Boolean),
    sinifAdlari:row.tumSiniflar?[]:row.sinifIdler.map(id=>className(eligible.get(id))).filter(Boolean),
    tarih:String(row.tarih||''),saat:String(row.saat||''),
    olusturanUid:old?.olusturanUid||u.uid||'',olusturanAdi:old?.olusturanAdi||currentName(),
    olusturmaTarihi:old?.olusturmaTarihi||new Date().toISOString(),guncellenmeTarihi:new Date().toISOString()
  };
}
async function saveAll(){
  if(!canEdit()||saving){if(!canEdit())global.toast?.('Bu işlem yalnız yöneticiler tarafından yapılabilir.');return false}
  const err=validate();if(err){formMessage=err;render();global.toast?.(err);return false}
  formMessage='';saving=true;render();
  const currentRecords=editingGroupId?records().filter(r=>r.grupId===editingGroupId):(editingLegacyKey?records().filter(r=>`legacy:${r.id}`===editingLegacyKey):[]),grp=editingGroupId||groupId(),used=new Set();
  try{
    for(let i=0;i<rows.length;i++){
      const row=rows[i],old=row.recordId?currentRecords.find(r=>r.id===row.recordId):null,payload=payloadForRow(row,i,grp,old);
      const result=await Service.kaydet(row.recordId||null,payload);if(row.recordId)used.add(row.recordId);else if(result?.id)used.add(result.id);
    }
    for(const old of currentRecords){if(!used.has(old.id))await Service.sil(old.id)}
    const count=rows.length,kademe=common.kademe,tur=common.tur;resetForm({keepKademe:true,keepTur:true});common.kademe=kademe;common.tur=tur;global.toast?.(`${count} toplantı satırı kaydedildi.`);render();return true;
  }catch(e){
    saving=false;const msg=e?.message==='yetkisiz'?'Bu işlem yalnız yöneticiler tarafından yapılabilir.':'Toplantılar kaydedilemedi: '+(e?.message||e);formMessage=msg;render();global.toast?.(msg);return false;
  }
}
function loadGroup(key){
  if(!canEdit())return;const group=groupedRecords().find(g=>g.key===key);if(!group?.list?.length)return;const first=group.list[0];
  editingGroupId=first.grupId||'';editingLegacyKey=first.grupId?'':key;common={kademe:first.kademe==='ortaokul'?'ortaokul':'ilkokul',tur:['sok','zumre','diger'].includes(first.tur)?first.tur:'sok',baslik:commonTitle(first)};
  rows=group.list.map(r=>({uid:tempId(),recordId:r.id||'',seviye:String((r.zumreSeviyeleri||[])[0]||''),dersId:String(r.dersId||''),dersAdi:String(r.dersAdi||r.bransAdi||''),satirKonusu:String(r.satirKonusu||''),tumSiniflar:!!r.tumSiniflar,sinifIdler:Array.isArray(r.sinifIdler)?r.sinifIdler.filter(Boolean):[],tarih:String(r.tarih||today()),saat:String(r.saat||'14:00')}));
  if(!rows.length)rows=[blankRow()];formMessage='';openClassRowId='';render();root?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
async function removeGroup(key){
  if(!canEdit())return global.toast?.('Bu işlem yalnız yöneticiler tarafından yapılabilir.');const group=groupedRecords().find(g=>g.key===key);if(!group?.list?.length)return;const title=commonTitle(group.list[0]);if(!confirm(`“${title}” ve ${group.list.length} toplantı satırı silinsin mi?`))return;
  try{for(const r of group.list)await Service.sil(r.id);if((editingGroupId&&group.list.some(r=>r.grupId===editingGroupId))||editingLegacyKey===key)resetForm();global.toast?.('Toplantı grubu silindi.');render()}catch(e){global.toast?.(e?.message==='yetkisiz'?'Bu işlem yalnız yöneticiler tarafından yapılabilir.':'Toplantı grubu silinemedi.')}
}

function reportBody(){
  const list=records(),okul=school(),okulAdi=String(okul.okulAdi||okul.ad||'KORUK İLK - ORTAOKULU').toLocaleUpperCase('tr'),rowsHtml=list.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(commonTitle(r))}</td><td>${esc(TUR_ADI[r.tur]||r.tur)}</td><td>${esc(KADEME_ADI[r.kademe]||r.kademe)}</td><td>${esc(scopeText(r))}</td><td>${esc(selectedClassNames(r))}</td><td>${esc(formatDate(r.tarih))}</td><td>${esc(r.saat||'')}</td><td>${esc(r.satirKonusu||'—')}</td></tr>`).join(''),mudur=principalName();
  return `<section class="ka-meeting-report"><h1>${esc(okulAdi)} TOPLANTI ÇİZELGESİ</h1><table class="ka-table ka-meeting-report__table"><thead><tr><th>No</th><th>Ortak Başlık</th><th>Tür</th><th>Kademe</th><th>Ders / Düzey</th><th>Sınıflar</th><th>Tarih</th><th>Saat</th><th>Satır Konusu</th></tr></thead><tbody>${rowsHtml}</tbody></table><section class="ka-meeting-report__signatures"><div><strong>Hazırlayan</strong><span>${esc(currentName())}</span></div><div><strong>Onay</strong><span>${esc(mudur||'')}</span><small>Okul Müdürü</small></div></section></section>`;
}
async function printReport(){if(!records().length)return global.toast?.('Yazdırılacak toplantı kaydı yok.');if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');if(!global.ReportEngine?.printReport)return global.toast?.('Rapor motoru hazır değil.');const okul=school(),okulAdi=okul.okulAdi||okul.ad||'KORUK İLK - ORTAOKULU';return global.ReportEngine.printReport('Toplantı Çizelgesi',reportBody(),{fileName:`Toplanti_Cizelgesi_${today()}`,yon:'yatay',okulAdi,logoGoster:true,baslikGoster:false,tarihGoster:true,compact:true,fontSize:8,kenarBosluk:7})}

function handleClick(e){
  const el=e.target?.closest?.('button');if(!el||!root?.contains(el))return;
  if(el.hasAttribute('data-meeting-kademe'))return setKademe(el.dataset.meetingKademe);
  if(el.hasAttribute('data-meeting-type'))return setType(el.dataset.meetingType);
  if(el.hasAttribute('data-meeting-add-row'))return addRow();
  if(el.hasAttribute('data-meeting-remove-row'))return removeRow(el.dataset.meetingRemoveRow);
  if(el.hasAttribute('data-meeting-class-menu')){openClassRowId=openClassRowId===el.dataset.meetingClassMenu?'':el.dataset.meetingClassMenu;render();return}
  if(el.hasAttribute('data-meeting-row-all-classes'))return toggleAllClasses(el.dataset.meetingRowAllClasses);
  if(el.hasAttribute('data-meeting-row-class'))return toggleRowClass(el.dataset.meetingRowClass,el.dataset.classId);
  if(el.hasAttribute('data-meeting-clear-classes'))return clearClasses(el.dataset.meetingClearClasses);
  if(el.hasAttribute('data-meeting-reset')){resetForm();render();return}
  if(el.hasAttribute('data-meeting-save-all')){void saveAll();return}
  if(el.hasAttribute('data-meeting-edit-group'))return loadGroup(el.dataset.meetingEditGroup);
  if(el.hasAttribute('data-meeting-delete-group')){void removeGroup(el.dataset.meetingDeleteGroup);return}
  if(el.hasAttribute('data-meeting-report'))void printReport();
}
function handleChange(e){
  const el=e.target;if(!el||!root?.contains(el)||!canEdit())return;
  if(el.matches?.('[data-meeting-row-lesson]')){const row=rowByUid(el.dataset.meetingRowLesson);if(row){clearFormMessage();row.dersId=el.value;row.dersAdi=lessons().find(x=>x.id===row.dersId)?.ad||''}return}
  if(el.matches?.('[data-meeting-row-level]')){const row=rowByUid(el.dataset.meetingRowLevel);if(row){clearFormMessage();row.seviye=el.value;row.tumSiniflar=false;pruneRowClasses(row);render()}return}
  if(el.matches?.('[data-meeting-row-date]')){const row=rowByUid(el.dataset.meetingRowDate);if(row){clearFormMessage();row.tarih=el.value}return}
  if(el.matches?.('[data-meeting-row-time]')){const row=rowByUid(el.dataset.meetingRowTime);if(row){clearFormMessage();row.saat=el.value}}
}
function handleInput(e){
  const el=e.target;if(!el||!canEdit())return;
  if(el.matches?.('[data-meeting-common-title]')){clearFormMessage();common.baslik=el.value;return}
  if(el.matches?.('[data-meeting-row-topic]')){const row=rowByUid(el.dataset.meetingRowTopic);if(row){clearFormMessage();row.satirKonusu=el.value}}
}
function bind(){if(!root)return;root.onclick=handleClick;root.onchange=handleChange;root.oninput=handleInput;global.PermissionService?.apply?.(root)}
function render(){if(!mounted||!root)return;if(!canView()){root.innerHTML='<div class="ka-empty">Toplantı Çizelgesini görüntülemek için oturum açmanız gerekir.</div>';return}root.innerHTML=pageHtml();bind()}
function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];['data.toplantiCizelgesi','data.siniflar','data.dersListesi','data.okulBilgileri','data.ogretmenler','session.user'].forEach(p=>{const u=global.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)});const routeOff=global.AppStore?.subscribe?.('ui.route',r=>{if(mounted&&r!=='management')unmount()});if(routeOff)unsubs.push(routeOff)}
async function open(target=document.getElementById('v2ModuleRoot')){if(!target)return false;unmount();root=target;mounted=true;common=blankCommon();rows=[blankRow()];editingGroupId='';editingLegacyKey='';formMessage='';saving=false;openClassRowId='';subscribe();await prepareLocal();render();return true}
function unmount(){mounted=false;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];if(root){root.onclick=null;root.onchange=null;root.oninput=null}root=null;editingGroupId='';editingLegacyKey='';formMessage='';saving=false;openClassRowId=''}
global.addEventListener('koruk:module-ready',e=>{if(mounted&&e.detail?.name&&(!root||!root.querySelector('[data-meeting-schedule-page]')))unmount()});
global.MeetingSchedulePage={open,unmount,render,prepareLocal,printReport,reportBody,Repository,Service,canView,canEdit};
})(window);
