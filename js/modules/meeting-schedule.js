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
let root=null,mounted=false,unsubs=[],editingId='',draft=blankDraft(),formMessage='';

function blankDraft(kademe='ilkokul'){
  return{kademe,tur:'sok',zumreSeviyeleri:[],dersId:'',dersAdi:'',tumSiniflar:false,sinifIdler:[],tarih:today(),saat:'14:00',konu:''};
}
function canView(){const u=user();return u.admin===true||!!u.uid}
function canEdit(){return user().admin===true}
function levelOf(s){const m=String(s?.ad||'').match(/\d+/);const n=Number(m?.[0]||0);return n>=1&&n<=8?n:0}
function className(s){return String(s?.ad||s?.sinifAdi||'').trim()}
function classes(){return arr('siniflar').slice().filter(x=>className(x)).sort((a,b)=>className(a).localeCompare(className(b),'tr',{numeric:true}))}
function lessons(){return arr('dersListesi').slice().filter(x=>String(x?.ad||'').trim()).sort((a,b)=>String(a.ad).localeCompare(String(b.ad),'tr'))}
function records(){return arr(TYPE).slice().sort((a,b)=>`${a.tarih||''} ${a.saat||''}`.localeCompare(`${b.tarih||''} ${b.saat||''}`,'tr'))}
function eligibleClasses(d=draft){
  let list=classes().filter(s=>d.kademe==='ilkokul'?levelOf(s)>=1&&levelOf(s)<=4:levelOf(s)>=5&&levelOf(s)<=8);
  if(d.kademe==='ilkokul'&&d.tur==='zumre'&&d.zumreSeviyeleri?.length){const set=new Set(d.zumreSeviyeleri.map(Number));list=list.filter(s=>set.has(levelOf(s)))}
  return list;
}
function normalizeDraft(v={}){
  const kademe=v.kademe==='ortaokul'?'ortaokul':'ilkokul',tur=['sok','zumre','diger'].includes(v.tur)?v.tur:'sok';
  return{kademe,tur,zumreSeviyeleri:Array.isArray(v.zumreSeviyeleri)?v.zumreSeviyeleri.map(Number).filter(n=>n>=1&&n<=4):[],dersId:String(v.dersId||''),dersAdi:String(v.dersAdi||v.bransAdi||''),tumSiniflar:!!v.tumSiniflar,sinifIdler:Array.isArray(v.sinifIdler)?v.sinifIdler.filter(Boolean):[],tarih:String(v.tarih||today()),saat:String(v.saat||'14:00'),konu:String(v.konu||'')};
}
function formatDate(iso){if(!iso)return'—';const d=new Date(`${iso}T00:00:00`);return isNaN(d)?iso:d.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'})}
function scopeText(r){if(r.tur!=='zumre')return'—';if(r.kademe==='ilkokul'){const l=(r.zumreSeviyeleri||[]).map(Number).sort((a,b)=>a-b);return l.length?l.map(n=>`${n}. Sınıf`).join(', '):'Sınıf Zümresi'}return r.dersAdi||lessons().find(x=>x.id===r.dersId)?.ad||r.bransAdi||'Ders Zümresi'}
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
  const defs={toplantiCizelgesi:COL.toplantiCizelgesi,siniflar:COL.siniflar,dersListesi:COL.dersListesi,okulBilgileri:COL.okulBilgileri,ogretmenler:COL.ogretmenler},types=[];
  Object.entries(defs).forEach(([t,c])=>{if(c){SyncEngine.register(t,c);types.push(t)}});
  await SyncEngine.localHydrate(types);SyncEngine.schedule(100);return true;
}

function segmented(marker,values,current){return `<div class="ka-meeting-segmented ${values.length===3?'ka-meeting-segmented--3':''}">${values.map(([v,label])=>`<button type="button" class="ka-meeting-segment ${current===v?'is-active':''}" ${marker}="${esc(v)}" aria-pressed="${current===v?'true':'false'}">${esc(label)}</button>`).join('')}</div>`}
function levelChooser(){if(draft.kademe!=='ilkokul'||draft.tur!=='zumre')return'';return `<div class="ka-field"><span class="ka-field__label">Sınıf Bazlı Zümre <small class="ka-muted">(birden fazla seçilebilir)</small></span><div class="ka-meeting-chips">${[1,2,3,4].map(n=>`<button type="button" class="ka-meeting-chip ${draft.zumreSeviyeleri.includes(n)?'is-active':''}" data-meeting-level="${n}" aria-pressed="${draft.zumreSeviyeleri.includes(n)?'true':'false'}">${n}. Sınıf</button>`).join('')}</div><small class="ka-muted">İlkokul zümreleri ders/branş yerine sınıf düzeyine göre planlanır.</small></div>`}
function lessonChooser(){if(draft.kademe!=='ortaokul'||draft.tur!=='zumre')return'';return `<label class="ka-field"><span class="ka-field__label">Ders</span><select data-meeting-lesson><option value="">Ders seçiniz</option>${lessons().map(d=>`<option value="${esc(d.id)}" ${draft.dersId===d.id?'selected':''}>${esc(d.ad)}</option>`).join('')}</select></label>`}
function classChooser(){const list=eligibleClasses();return `<div class="ka-field"><div class="ka-row ka-row--between"><span class="ka-field__label">Sınıflar <small class="ka-muted">(çoklu seçim)</small></span><span class="ka-badge">${draft.tumSiniflar?'Tümü':`${draft.sinifIdler.length} seçili`}</span></div><div class="ka-meeting-class-grid"><button type="button" class="ka-meeting-chip ka-meeting-chip--all ${draft.tumSiniflar?'is-active':''}" data-meeting-all-classes aria-pressed="${draft.tumSiniflar?'true':'false'}">Tüm Sınıflar</button>${list.map(s=>{const on=!draft.tumSiniflar&&draft.sinifIdler.includes(s.id);return`<button type="button" class="ka-meeting-chip ${on?'is-active':''}" data-meeting-class="${esc(s.id)}" aria-pressed="${on?'true':'false'}">${esc(className(s))}</button>`}).join('')}</div>${list.length?'':'<small class="ka-muted">Bu kademeye ait sınıf kaydı bulunamadı.</small>'}</div>`}
function formHtml(){return `<article class="ka-card ka-meeting-form-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div><h3>${editingId?'Toplantıyı Düzenle':'Yeni Toplantı Ekle'}</h3><p class="ka-muted">ŞÖK, zümre ve diğer toplantıları ayrı ayrı ekleyebilirsiniz.</p></div>${editingId?'<span class="ka-badge">Düzenleme</span>':''}</div><div class="ka-field"><span class="ka-field__label">Kademe</span>${segmented('data-meeting-kademe',[['ilkokul','İlkokul'],['ortaokul','Ortaokul']],draft.kademe)}</div><div class="ka-field"><span class="ka-field__label">Toplantı Türü</span>${segmented('data-meeting-type',[['sok','ŞÖK'],['zumre','Zümre'],['diger','Diğer']],draft.tur)}</div>${levelChooser()}${lessonChooser()}${classChooser()}<div class="ka-grid ka-meeting-date-grid"><label class="ka-field"><span class="ka-field__label">Tarih</span><input type="date" data-meeting-date value="${esc(draft.tarih)}"></label><label class="ka-field"><span class="ka-field__label">Saat</span><input type="time" data-meeting-time value="${esc(draft.saat)}"></label></div><label class="ka-field"><span class="ka-field__label">Konu / Açıklama ${draft.tur==='diger'?'<small class="ka-muted">(zorunlu)</small>':'<small class="ka-muted">(isteğe bağlı)</small>'}</span><input data-meeting-topic value="${esc(draft.konu)}" placeholder="Örn. Dönem değerlendirme toplantısı"></label>${formMessage?`<div class="ka-card" data-meeting-form-message role="alert"><div class="ka-card__body"><strong>⚠️ ${esc(formMessage)}</strong></div></div>`:''}<div class="ka-meeting-form-actions"><button type="button" class="ka-btn ka-btn--secondary" data-meeting-new>${editingId?'Vazgeç / Yeni Satır':'+ Satırı Ekle'}</button><button type="button" class="ka-btn" data-meeting-save>💾 ${editingId?'Güncelle':'Kaydet'}</button></div></div></article>`}
function recordCard(r){const scope=scopeText(r),classes=selectedClassNames(r);return `<article class="ka-card ka-meeting-item"><div class="ka-card__body"><div class="ka-meeting-item__top"><div class="ka-row ka-wrap">${typeBadge(r.tur)}<strong>${esc(scope==='—'?(r.konu||TUR_ADI[r.tur]):scope)}</strong></div><span class="ka-meeting-item__date">${esc(formatDate(r.tarih))} · ${esc(r.saat||'—')}</span></div><div class="ka-meeting-item__meta"><span>${esc(KADEME_ADI[r.kademe]||r.kademe||'')}</span><span>${esc(classes)}</span>${r.tur==='zumre'&&scope!=='—'?`<span>${esc(scope)}</span>`:''}${r.konu?`<span>${esc(r.konu)}</span>`:''}</div>${canEdit()?`<div class="ka-meeting-item__actions"><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-meeting-edit="${esc(r.id)}">Düzenle</button><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm ka-meeting-delete" data-meeting-delete="${esc(r.id)}">Sil</button></div>`:''}</div></article>`}
function listHtml(){const list=records();return `<section class="ka-stack ka-meeting-list"><div class="ka-row ka-row--between"><div><h3>Eklenen Toplantılar</h3><p class="ka-muted">Her ŞÖK veya zümre ayrı kayıt olarak eklenebilir.</p></div><span class="ka-badge">${list.length} kayıt</span></div>${list.length?list.map(recordCard).join(''):'<div class="ka-empty">Henüz toplantı eklenmedi.</div>'}<button type="button" class="ka-btn ka-btn--secondary ka-meeting-report-button" data-meeting-report ${list.length?'':'disabled'}>🖨️ Raporu Yazdır</button></section>`}
function pageHtml(){return `<section class="ka-stack ka-meeting-page" data-meeting-schedule-page><div class="ka-meeting-page__intro"><h2>Toplantı Çizelgesi</h2><p class="ka-muted">Toplantı, ŞÖK ve zümre tarih-saat planlarını tek çizelgede yönetin.</p></div>${canEdit()?formHtml():''}${listHtml()}</section>`}

function clearFormMessage(){formMessage='';root?.querySelector('[data-meeting-form-message]')?.remove()}
function pruneClasses(){const eligible=new Set(eligibleClasses().map(s=>s.id));draft.sinifIdler=draft.sinifIdler.filter(id=>eligible.has(id))}
function setKademe(k){if(!canEdit()||!['ilkokul','ortaokul'].includes(k)||k===draft.kademe)return;clearFormMessage();draft.kademe=k;draft.zumreSeviyeleri=[];draft.dersId='';draft.dersAdi='';draft.tumSiniflar=false;draft.sinifIdler=[];render()}
function setType(t){if(!canEdit()||!['sok','zumre','diger'].includes(t)||t===draft.tur)return;clearFormMessage();draft.tur=t;if(t!=='zumre'){draft.zumreSeviyeleri=[];draft.dersId='';draft.dersAdi=''}draft.tumSiniflar=false;draft.sinifIdler=[];render()}
function toggleLevel(n){if(!canEdit())return;clearFormMessage();n=Number(n);const s=new Set(draft.zumreSeviyeleri);s.has(n)?s.delete(n):s.add(n);draft.zumreSeviyeleri=[...s].sort((a,b)=>a-b);draft.tumSiniflar=false;pruneClasses();render()}
function toggleClass(id){if(!canEdit())return;clearFormMessage();draft.tumSiniflar=false;const s=new Set(draft.sinifIdler);s.has(id)?s.delete(id):s.add(id);draft.sinifIdler=[...s];render()}
function validate(){if(!draft.tarih)return'Tarih seçiniz.';if(!draft.saat)return'Saat seçiniz.';if(draft.tur==='zumre'&&draft.kademe==='ilkokul'&&!draft.zumreSeviyeleri.length)return'İlkokul zümresi için 1, 2, 3 veya 4. sınıf düzeylerinden en az birini seçiniz.';if(draft.tur==='zumre'&&draft.kademe==='ortaokul'&&!draft.dersId)return'Ortaokul zümresi için ders seçiniz.';if(!draft.tumSiniflar&&!draft.sinifIdler.length)return'En az bir sınıf seçiniz veya “Tüm Sınıflar” seçeneğini kullanınız.';if(draft.tur==='diger'&&!draft.konu.trim())return'Diğer toplantı türünde konu/açıklama giriniz.';return''}
async function save({keepReady=false}={}){if(!canEdit()){global.toast?.('Bu işlem yalnız yöneticiler tarafından yapılabilir.');return false}const err=validate();if(err){formMessage=err;render();global.toast?.(err);return false}formMessage='';const eligible=new Map(eligibleClasses().map(s=>[s.id,s])),lesson=lessons().find(x=>x.id===draft.dersId),old=editingId?records().find(x=>x.id===editingId):null,u=user(),payload={...normalizeDraft(draft),dersAdi:draft.tur==='zumre'&&draft.kademe==='ortaokul'?String(lesson?.ad||draft.dersAdi||''):'',sinifAdlari:draft.tumSiniflar?[]:draft.sinifIdler.map(id=>className(eligible.get(id))).filter(Boolean),konu:draft.konu.trim(),olusturanUid:old?.olusturanUid||u.uid||'',olusturanAdi:old?.olusturanAdi||currentName(),olusturmaTarihi:old?.olusturmaTarihi||new Date().toISOString(),guncellenmeTarihi:new Date().toISOString()};try{await Service.kaydet(editingId||null,payload);const keep=draft.kademe;editingId='';draft=blankDraft(keep);global.toast?.(keepReady?'Satır eklendi. Yeni toplantıyı girebilirsiniz.':'Toplantı çizelgesine kaydedildi.');render();return true}catch(e){const msg=e?.message==='yetkisiz'?'Bu işlem yalnız yöneticiler tarafından yapılabilir.':'Toplantı kaydedilemedi: '+(e?.message||e);formMessage=msg;render();global.toast?.(msg);return false}}
function edit(id){if(!canEdit())return;const r=records().find(x=>x.id===id);if(!r)return;editingId=id;draft=normalizeDraft(r);render();root?.scrollIntoView?.({behavior:'smooth',block:'start'})}
async function remove(id){if(!canEdit()){global.toast?.('Bu işlem yalnız yöneticiler tarafından yapılabilir.');return}const r=records().find(x=>x.id===id);if(!r||!confirm(`${TUR_ADI[r.tur]||'Toplantı'} kaydı silinsin mi?`))return;try{await Service.sil(id);if(editingId===id){editingId='';draft=blankDraft(draft.kademe)}global.toast?.('Toplantı silindi.');render()}catch(e){global.toast?.(e?.message==='yetkisiz'?'Bu işlem yalnız yöneticiler tarafından yapılabilir.':'Toplantı silinemedi.')}}

function reportBody(){const list=records(),okul=school(),okulAdi=String(okul.okulAdi||okul.ad||'KORUK İLK - ORTAOKULU').toLocaleUpperCase('tr'),rows=list.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(TUR_ADI[r.tur]||r.tur)}</td><td>${esc(KADEME_ADI[r.kademe]||r.kademe)}</td><td>${esc(scopeText(r))}</td><td>${esc(selectedClassNames(r))}</td><td>${esc(formatDate(r.tarih))}</td><td>${esc(r.saat||'')}</td><td>${esc(r.konu||'—')}</td></tr>`).join(''),mudur=principalName();return `<section class="ka-meeting-report"><h1>${esc(okulAdi)} TOPLANTI ÇİZELGESİ</h1><table class="ka-table ka-meeting-report__table"><thead><tr><th>No</th><th>Toplantı Türü</th><th>Kademe</th><th>Zümre / Ders</th><th>Sınıflar</th><th>Tarih</th><th>Saat</th><th>Konu / Açıklama</th></tr></thead><tbody>${rows}</tbody></table><section class="ka-meeting-report__signatures"><div><strong>Hazırlayan</strong><span>${esc(currentName())}</span></div><div><strong>Onay</strong><span>${esc(mudur||'')}</span><small>Okul Müdürü</small></div></section></section>`}
async function printReport(){if(!records().length)return global.toast?.('Yazdırılacak toplantı kaydı yok.');if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');if(!global.ReportEngine?.printReport)return global.toast?.('Rapor motoru hazır değil.');const okul=school(),okulAdi=okul.okulAdi||okul.ad||'KORUK İLK - ORTAOKULU';return global.ReportEngine.printReport('Toplantı Çizelgesi',reportBody(),{fileName:`Toplanti_Cizelgesi_${today()}`,yon:'yatay',okulAdi,logoGoster:true,baslikGoster:false,tarihGoster:true,compact:true,fontSize:8,kenarBosluk:7})}

function handleClick(e){const el=e.target?.closest?.('button');if(!el||!root?.contains(el))return;if(el.hasAttribute('data-meeting-kademe'))return setKademe(el.dataset.meetingKademe);if(el.hasAttribute('data-meeting-type'))return setType(el.dataset.meetingType);if(el.hasAttribute('data-meeting-level'))return toggleLevel(el.dataset.meetingLevel);if(el.hasAttribute('data-meeting-all-classes')){if(!canEdit())return;clearFormMessage();draft.tumSiniflar=!draft.tumSiniflar;if(draft.tumSiniflar)draft.sinifIdler=[];render();return}if(el.hasAttribute('data-meeting-class'))return toggleClass(el.dataset.meetingClass);if(el.hasAttribute('data-meeting-new')){if(!canEdit())return;if(editingId){const keep=draft.kademe;editingId='';draft=blankDraft(keep);clearFormMessage();render();return}void save({keepReady:true});return}if(el.hasAttribute('data-meeting-save')){void save();return}if(el.hasAttribute('data-meeting-edit'))return edit(el.dataset.meetingEdit);if(el.hasAttribute('data-meeting-delete')){void remove(el.dataset.meetingDelete);return}if(el.hasAttribute('data-meeting-report'))void printReport()}
function handleChange(e){const el=e.target;if(!el||!root?.contains(el))return;if(el.matches?.('[data-meeting-lesson]')){if(!canEdit())return;clearFormMessage();draft.dersId=el.value;draft.dersAdi=lessons().find(x=>x.id===draft.dersId)?.ad||'';return}if(el.matches?.('[data-meeting-date]')){if(!canEdit())return;clearFormMessage();draft.tarih=el.value;return}if(el.matches?.('[data-meeting-time]')){if(!canEdit())return;clearFormMessage();draft.saat=el.value}}
function handleInput(e){const el=e.target;if(el?.matches?.('[data-meeting-topic]')){if(!canEdit())return;clearFormMessage();draft.konu=el.value}}
function bind(){if(!root)return;root.onclick=handleClick;root.onchange=handleChange;root.oninput=handleInput;global.PermissionService?.apply?.(root)}
function render(){if(!mounted||!root)return;if(!canView()){root.innerHTML='<div class="ka-empty">Toplantı Çizelgesini görüntülemek için oturum açmanız gerekir.</div>';return}root.innerHTML=pageHtml();bind()}
function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];['data.toplantiCizelgesi','data.siniflar','data.dersListesi','data.okulBilgileri','data.ogretmenler','session.user'].forEach(p=>{const u=global.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)});const routeOff=global.AppStore?.subscribe?.('ui.route',r=>{if(mounted&&r!=='management')unmount()});if(routeOff)unsubs.push(routeOff)}
async function open(target=document.getElementById('v2ModuleRoot')){if(!target)return false;unmount();root=target;mounted=true;draft=blankDraft();editingId='';formMessage='';subscribe();await prepareLocal();render();return true}
function unmount(){mounted=false;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];if(root){root.onclick=null;root.onchange=null;root.oninput=null}root=null;editingId='';formMessage=''}
global.addEventListener('koruk:module-ready',e=>{if(mounted&&e.detail?.name&&(!root||!root.querySelector('[data-meeting-schedule-page]')))unmount()});
global.MeetingSchedulePage={open,unmount,render,prepareLocal,printReport,reportBody,Repository,Service,canView,canEdit};
})(window);
