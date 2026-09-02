/* Koruk Asistan — Toplantı Çizelgesi
 * Personel İşleri altında local-first toplantı/zümre planlama sayfası.
 * Veri akışı: DeviceData -> IndexedDB/AppStore -> SyncEngine -> Firestore.
 */
(function(global){
'use strict';
if(global.MeetingSchedulePage)return;

const TYPE='toplantiCizelgesi';
const TUR_ADI=Object.freeze({sok:'ŞÖK',zumre:'Zümre',diger:'Diğer'});
const KADEME_ADI=Object.freeze({ilkokul:'İlkokul',ortaokul:'Ortaokul'});
const now=new Date(),pad=n=>String(n).padStart(2,'0');
const today=()=>`${new Date().getFullYear()}-${pad(new Date().getMonth()+1)}-${pad(new Date().getDate())}`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const currentName=()=>{const u=user();return String(u.adSoyad||u.ad||u.displayName||u.kullaniciAdi||'').trim()||'—'};
let root=null,mounted=false,unsubs=[],editingId='',draft=blankDraft();

function blankDraft(kademe='ilkokul'){
  return{kademe,tur:'sok',zumreSeviyeleri:[],bransId:'',bransAdi:'',tumSiniflar:false,sinifIdler:[],tarih:today(),saat:'14:00',konu:''};
}
function canView(){return global.PermissionService?.can?.('management.personnel','read')??true}
function canEdit(){return global.PermissionService?.can?.('management.personnel','edit')??(typeof global.duzenleyebilir==='function'?global.duzenleyebilir('personel'):user().admin===true)}
function levelOf(s){const m=String(s?.ad||'').match(/\d+/);const n=Number(m?.[0]||0);return n>=1&&n<=8?n:0}
function className(s){return String(s?.ad||s?.sinifAdi||'').trim()}
function classes(){return arr('siniflar').slice().filter(x=>className(x)).sort((a,b)=>className(a).localeCompare(className(b),'tr',{numeric:true}))}
function branches(){return arr('bransListesi').slice().filter(x=>String(x?.ad||'').trim()).sort((a,b)=>String(a.ad).localeCompare(String(b.ad),'tr'))}
function records(){return arr(TYPE).slice().sort((a,b)=>`${a.tarih||''} ${a.saat||''}`.localeCompare(`${b.tarih||''} ${b.saat||''}`,'tr'))}
function eligibleClasses(d=draft){
  let list=classes().filter(s=>d.kademe==='ilkokul'?levelOf(s)>=1&&levelOf(s)<=4:levelOf(s)>=5&&levelOf(s)<=8);
  if(d.kademe==='ilkokul'&&d.tur==='zumre'&&d.zumreSeviyeleri?.length){const set=new Set(d.zumreSeviyeleri.map(Number));list=list.filter(s=>set.has(levelOf(s)))}
  return list;
}
function normalizeDraft(v={}){
  const kademe=v.kademe==='ortaokul'?'ortaokul':'ilkokul',tur=['sok','zumre','diger'].includes(v.tur)?v.tur:'sok';
  return{kademe,tur,zumreSeviyeleri:Array.isArray(v.zumreSeviyeleri)?v.zumreSeviyeleri.map(Number).filter(n=>n>=1&&n<=4):[],bransId:String(v.bransId||''),bransAdi:String(v.bransAdi||''),tumSiniflar:!!v.tumSiniflar,sinifIdler:Array.isArray(v.sinifIdler)?v.sinifIdler.filter(Boolean):[],tarih:String(v.tarih||today()),saat:String(v.saat||'14:00'),konu:String(v.konu||'')};
}
function formatDate(iso){if(!iso)return'—';const d=new Date(`${iso}T00:00:00`);return isNaN(d)?iso:d.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'})}
function scopeText(r){if(r.tur!=='zumre')return'—';if(r.kademe==='ilkokul'){const l=(r.zumreSeviyeleri||[]).map(Number).sort((a,b)=>a-b);return l.length?l.map(n=>`${n}. Sınıf`).join(', '):'Sınıf Zümresi'}return r.bransAdi||branches().find(x=>x.id===r.bransId)?.ad||'Branş Zümresi'}
function selectedClassNames(r){if(r.tumSiniflar)return'Tüm Sınıflar';const map=new Map(classes().map(s=>[s.id,className(s)])),names=(r.sinifAdlari?.length?r.sinifAdlari:(r.sinifIdler||[]).map(id=>map.get(id)).filter(Boolean));return names.length?names.join(', '):'—'}
function typeBadge(t){return `<span class="ka-meeting-badge ka-meeting-badge--${esc(t)}">${esc(TUR_ADI[t]||t||'Toplantı')}</span>`}
function school(){const l=arr('okulBilgileri');return l.find(x=>x.id==='ayarlar')||l[0]||global.okulBilgileriAyari||{}}
function principalName(){const o=school(),id=o.mudurId;if(id){const t=arr('ogretmenler').find(x=>x.id===id);if(t)return`${t.ad||''} ${t.soyad||''}`.trim()}const t=arr('ogretmenler').find(x=>String(x.unvan||'').toLocaleLowerCase('tr')==='müdür');return t?`${t.ad||''} ${t.soyad||''}`.trim():''}

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
  const defs={toplantiCizelgesi:COL.toplantiCizelgesi,siniflar:COL.siniflar,bransListesi:COL.bransListesi,okulBilgileri:COL.okulBilgileri,ogretmenler:COL.ogretmenler},types=[];
  Object.entries(defs).forEach(([t,c])=>{if(c){SyncEngine.register(t,c);types.push(t)}});
  await SyncEngine.localHydrate(types);SyncEngine.schedule(100);return true;
}

function segmented(marker,values,current){return `<div class="ka-meeting-segmented ${values.length===3?'ka-meeting-segmented--3':''}">${values.map(([v,label])=>`<button type="button" class="ka-meeting-segment ${current===v?'is-active':''}" ${marker}="${esc(v)}" aria-pressed="${current===v?'true':'false'}">${esc(label)}</button>`).join('')}</div>`}
function levelChooser(){if(draft.kademe!=='ilkokul'||draft.tur!=='zumre')return'';return `<div class="ka-field"><span class="ka-field__label">Sınıf Bazlı Zümre <small class="ka-muted">(birden fazla seçilebilir)</small></span><div class="ka-meeting-chips">${[1,2,3,4].map(n=>`<button type="button" class="ka-meeting-chip ${draft.zumreSeviyeleri.includes(n)?'is-active':''}" data-meeting-level="${n}" aria-pressed="${draft.zumreSeviyeleri.includes(n)?'true':'false'}">${n}. Sınıf</button>`).join('')}</div><small class="ka-muted">İlkokul zümreleri branş yerine sınıf düzeyine göre planlanır.</small></div>`}
function branchChooser(){if(draft.kademe!=='ortaokul'||draft.tur!=='zumre')return'';return `<label class="ka-field"><span class="ka-field__label">Branş</span><select data-meeting-branch><option value="">Branş seçiniz</option>${branches().map(b=>`<option value="${esc(b.id)}" ${draft.bransId===b.id?'selected':''}>${esc(b.ad)}</option>`).join('')}</select></label>`}
function classChooser(){const list=eligibleClasses();return `<div class="ka-field"><div class="ka-row ka-row--between"><span class="ka-field__label">Sınıflar <small class="ka-muted">(çoklu seçim)</small></span><span class="ka-badge">${draft.tumSiniflar?'Tümü':`${draft.sinifIdler.length} seçili`}</span></div><div class="ka-meeting-class-grid"><button type="button" class="ka-meeting-chip ka-meeting-chip--all ${draft.tumSiniflar?'is-active':''}" data-meeting-all-classes aria-pressed="${draft.tumSiniflar?'true':'false'}">Tüm Sınıflar</button>${list.map(s=>{const on=!draft.tumSiniflar&&draft.sinifIdler.includes(s.id);return`<button type="button" class="ka-meeting-chip ${on?'is-active':''}" data-meeting-class="${esc(s.id)}" aria-pressed="${on?'true':'false'}">${esc(className(s))}</button>`}).join('')}</div>${list.length?'':'<small class="ka-muted">Bu kademeye ait sınıf kaydı bulunamadı.</small>'}</div>`}
function formHtml(){const edit=canEdit();return `<article class="ka-card ka-meeting-form-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div><h3>${editingId?'Toplantıyı Düzenle':'Yeni Toplantı Ekle'}</h3><p class="ka-muted">ŞÖK, zümre ve diğer toplantıları ayrı ayrı ekleyebilirsiniz.</p></div>${editingId?'<span class="ka-badge">Düzenleme</span>':''}</div><div class="ka-field"><span class="ka-field__label">Kademe</span>${segmented('data-meeting-kademe',[['ilkokul','İlkokul'],['ortaokul','Ortaokul']],draft.kademe)}</div><div class="ka-field"><span class="ka-field__label">Toplantı Türü</span>${segmented('data-meeting-type',[['sok','ŞÖK'],['zumre','Zümre'],['diger','Diğer']],draft.tur)}</div>${levelChooser()}${branchChooser()}${classChooser()}<div class="ka-grid ka-meeting-date-grid"><label class="ka-field"><span class="ka-field__label">Tarih</span><input type="date" data-meeting-date value="${esc(draft.tarih)}"></label><label class="ka-field"><span class="ka-field__label">Saat</span><input type="time" data-meeting-time value="${esc(draft.saat)}"></label></div><label class="ka-field"><span class="ka-field__label">Konu / Açıklama ${draft.tur==='diger'?'<small class="ka-muted">(zorunlu)</small>':'<small class="ka-muted">(isteğe bağlı)</small>'}</span><input data-meeting-topic value="${esc(draft.konu)}" placeholder="Örn. Dönem değerlendirme toplantısı"></label>${edit?`<div class="ka-meeting-form-actions"><button type="button" class="ka-btn ka-btn--secondary" data-meeting-new>${editingId?'Vazgeç / Yeni Satır':'+ Yeni Satır'}</button><button type="button" class="ka-btn" data-meeting-save>💾 ${editingId?'Güncelle':'Kaydet'}</button></div>`:'<div class="ka-empty">Bu sayfada düzenleme yetkiniz yok.</div>'}</div></article>`}
function recordCard(r){const scope=scopeText(r),classes=selectedClassNames(r);return `<article class="ka-card ka-meeting-item"><div class="ka-card__body"><div class="ka-meeting-item__top"><div class="ka-row ka-wrap">${typeBadge(r.tur)}<strong>${esc(scope==='—'?(r.konu||TUR_ADI[r.tur]):scope)}</strong></div><span class="ka-meeting-item__date">${esc(formatDate(r.tarih))} · ${esc(r.saat||'—')}</span></div><div class="ka-meeting-item__meta"><span>${esc(KADEME_ADI[r.kademe]||r.kademe||'')}</span><span>${esc(classes)}</span>${r.tur==='zumre'&&scope!=='—'?`<span>${esc(scope)}</span>`:''}${r.konu?`<span>${esc(r.konu)}</span>`:''}</div>${canEdit()?`<div class="ka-meeting-item__actions"><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-meeting-edit="${esc(r.id)}">Düzenle</button><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm ka-meeting-delete" data-meeting-delete="${esc(r.id)}">Sil</button></div>`:''}</div></article>`}
function listHtml(){const list=records();return `<section class="ka-stack ka-meeting-list"><div class="ka-row ka-row--between"><div><h3>Eklenen Toplantılar</h3><p class="ka-muted">Her ŞÖK veya zümre ayrı kayıt olarak eklenebilir.</p></div><span class="ka-badge">${list.length} kayıt</span></div>${list.length?list.map(recordCard).join(''):'<div class="ka-empty">Henüz toplantı eklenmedi.</div>'}<button type="button" class="ka-btn ka-btn--secondary ka-meeting-report-button" data-meeting-report ${list.length?'':'disabled'}>🖨️ Raporu Yazdır</button></section>`}
function pageHtml(){return `<section class="ka-stack ka-meeting-page" data-meeting-schedule-page><div class="ka-meeting-page__intro"><h2>Toplantı Çizelgesi</h2><p class="ka-muted">Toplantı, ŞÖK ve zümre tarih-saat planlarını tek çizelgede yönetin.</p></div>${formHtml()}${listHtml()}</section>`}

function pruneClasses(){const eligible=new Set(eligibleClasses().map(s=>s.id));draft.sinifIdler=draft.sinifIdler.filter(id=>eligible.has(id))}
function setKademe(k){if(!['ilkokul','ortaokul'].includes(k)||k===draft.kademe)return;draft.kademe=k;draft.zumreSeviyeleri=[];draft.bransId='';draft.bransAdi='';draft.tumSiniflar=false;draft.sinifIdler=[];render()}
function setType(t){if(!['sok','zumre','diger'].includes(t)||t===draft.tur)return;draft.tur=t;if(t!=='zumre'){draft.zumreSeviyeleri=[];draft.bransId='';draft.bransAdi=''}draft.tumSiniflar=false;draft.sinifIdler=[];render()}
function toggleLevel(n){n=Number(n);const s=new Set(draft.zumreSeviyeleri);s.has(n)?s.delete(n):s.add(n);draft.zumreSeviyeleri=[...s].sort((a,b)=>a-b);draft.tumSiniflar=false;pruneClasses();render()}
function toggleClass(id){draft.tumSiniflar=false;const s=new Set(draft.sinifIdler);s.has(id)?s.delete(id):s.add(id);draft.sinifIdler=[...s];render()}
function validate(){if(!draft.tarih)return'Tarih seçiniz.';if(!draft.saat)return'Saat seçiniz.';if(draft.tur==='zumre'&&draft.kademe==='ilkokul'&&!draft.zumreSeviyeleri.length)return'İlkokul zümresi için 1, 2, 3 veya 4. sınıf düzeylerinden en az birini seçiniz.';if(draft.tur==='zumre'&&draft.kademe==='ortaokul'&&!draft.bransId)return'Ortaokul zümresi için branş seçiniz.';if(!draft.tumSiniflar&&!draft.sinifIdler.length)return'En az bir sınıf seçiniz veya “Tüm Sınıflar” seçeneğini kullanınız.';if(draft.tur==='diger'&&!draft.konu.trim())return'Diğer toplantı türünde konu/açıklama giriniz.';return''}
async function save(){const err=validate();if(err)return global.toast?.(err);const eligible=new Map(eligibleClasses().map(s=>[s.id,s])),br=branches().find(x=>x.id===draft.bransId),old=editingId?records().find(x=>x.id===editingId):null,u=user(),payload={...normalizeDraft(draft),bransAdi:draft.tur==='zumre'&&draft.kademe==='ortaokul'?String(br?.ad||draft.bransAdi||''):'',sinifAdlari:draft.tumSiniflar?[]:draft.sinifIdler.map(id=>className(eligible.get(id))).filter(Boolean),konu:draft.konu.trim(),olusturanUid:old?.olusturanUid||u.uid||'',olusturanAdi:old?.olusturanAdi||currentName(),olusturmaTarihi:old?.olusturmaTarihi||new Date().toISOString(),guncellenmeTarihi:new Date().toISOString()};try{await Service.kaydet(editingId||null,payload);const keep=draft.kademe;editingId='';draft=blankDraft(keep);global.toast?.('Toplantı çizelgesine kaydedildi.');render()}catch(e){global.toast?.(e?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':'Toplantı kaydedilemedi: '+(e?.message||e))}}
function edit(id){const r=records().find(x=>x.id===id);if(!r)return;editingId=id;draft=normalizeDraft(r);render();root?.scrollIntoView?.({behavior:'smooth',block:'start'})}
async function remove(id){const r=records().find(x=>x.id===id);if(!r||!confirm(`${TUR_ADI[r.tur]||'Toplantı'} kaydı silinsin mi?`))return;try{await Service.sil(id);if(editingId===id){editingId='';draft=blankDraft(draft.kademe)}global.toast?.('Toplantı silindi.');render()}catch(e){global.toast?.(e?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':'Toplantı silinemedi.')}}

function reportBody(){const list=records(),okul=school(),okulAdi=String(okul.okulAdi||okul.ad||'KORUK İLK - ORTAOKULU').toLocaleUpperCase('tr'),rows=list.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(TUR_ADI[r.tur]||r.tur)}</td><td>${esc(KADEME_ADI[r.kademe]||r.kademe)}</td><td>${esc(scopeText(r))}</td><td>${esc(selectedClassNames(r))}</td><td>${esc(formatDate(r.tarih))}</td><td>${esc(r.saat||'')}</td><td>${esc(r.konu||'—')}</td></tr>`).join(''),mudur=principalName();return `<section class="ka-meeting-report"><h1>${esc(okulAdi)} TOPLANTI ÇİZELGESİ</h1><table class="ka-table ka-meeting-report__table"><thead><tr><th>No</th><th>Toplantı Türü</th><th>Kademe</th><th>Zümre / Branş</th><th>Sınıflar</th><th>Tarih</th><th>Saat</th><th>Konu / Açıklama</th></tr></thead><tbody>${rows}</tbody></table><section class="ka-meeting-report__signatures"><div><strong>Hazırlayan</strong><span>${esc(currentName())}</span></div><div><strong>Onay</strong><span>${esc(mudur||'')}</span><small>Okul Müdürü</small></div></section></section>`}
async function printReport(){if(!records().length)return global.toast?.('Yazdırılacak toplantı kaydı yok.');if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');if(!global.ReportEngine?.printReport)return global.toast?.('Rapor motoru hazır değil.');const okul=school(),okulAdi=okul.okulAdi||okul.ad||'KORUK İLK - ORTAOKULU';return global.ReportEngine.printReport('Toplantı Çizelgesi',reportBody(),{fileName:`Toplanti_Cizelgesi_${today()}`,yon:'yatay',okulAdi,logoGoster:true,baslikGoster:false,tarihGoster:true,compact:true,fontSize:8,kenarBosluk:7})}

function bind(){if(!root)return;root.querySelectorAll('[data-meeting-kademe]').forEach(b=>b.onclick=()=>setKademe(b.dataset.meetingKademe));root.querySelectorAll('[data-meeting-type]').forEach(b=>b.onclick=()=>setType(b.dataset.meetingType));root.querySelectorAll('[data-meeting-level]').forEach(b=>b.onclick=()=>toggleLevel(b.dataset.meetingLevel));root.querySelector('[data-meeting-branch]')?.addEventListener('change',e=>{draft.bransId=e.target.value;draft.bransAdi=branches().find(x=>x.id===draft.bransId)?.ad||''});root.querySelector('[data-meeting-all-classes]')?.addEventListener('click',()=>{draft.tumSiniflar=!draft.tumSiniflar;if(draft.tumSiniflar)draft.sinifIdler=[];render()});root.querySelectorAll('[data-meeting-class]').forEach(b=>b.onclick=()=>toggleClass(b.dataset.meetingClass));root.querySelector('[data-meeting-date]')?.addEventListener('change',e=>{draft.tarih=e.target.value});root.querySelector('[data-meeting-time]')?.addEventListener('change',e=>{draft.saat=e.target.value});root.querySelector('[data-meeting-topic]')?.addEventListener('input',e=>{draft.konu=e.target.value});root.querySelector('[data-meeting-new]')?.addEventListener('click',()=>{const keep=draft.kademe;editingId='';draft=blankDraft(keep);render()});root.querySelector('[data-meeting-save]')?.addEventListener('click',save);root.querySelectorAll('[data-meeting-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.meetingEdit));root.querySelectorAll('[data-meeting-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.meetingDelete));root.querySelector('[data-meeting-report]')?.addEventListener('click',printReport);global.PermissionService?.apply?.(root)}
function render(){if(!mounted||!root)return;if(!canView()){root.innerHTML='<div class="ka-empty">Toplantı Çizelgesini görüntüleme yetkiniz yok.</div>';return}root.innerHTML=pageHtml();bind()}
function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];['data.toplantiCizelgesi','data.siniflar','data.bransListesi','data.okulBilgileri','data.ogretmenler'].forEach(p=>{const u=global.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)});const routeOff=global.AppStore?.subscribe?.('ui.route',r=>{if(mounted&&r!=='management')unmount()});if(routeOff)unsubs.push(routeOff)}
async function open(target=document.getElementById('v2ModuleRoot')){if(!target)return false;unmount();root=target;mounted=true;draft=blankDraft();editingId='';subscribe();await prepareLocal();render();return true}
function unmount(){mounted=false;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];root=null;editingId=''}
global.addEventListener('koruk:module-ready',e=>{if(mounted&&e.detail?.name&&(!root||!root.querySelector('[data-meeting-schedule-page]')))unmount()});
global.MeetingSchedulePage={open,unmount,render,prepareLocal,printReport,reportBody,Repository,Service};
})(window);
