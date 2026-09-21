/* Koruk Asistan — Transport tek modül
 * Veri/repository/service + araç yerleşim şeması + rapor + UI aynı dosyada.
 * Veri akışı: DeviceData/IndexedDB -> AppStore -> UI; Firestore yalnız arka plan senkronizasyonudur.
 */
(function(global){
'use strict';
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
function localDoc(type,id){return device().get(type,id)}
function activeUser(){return global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{}}
function activeTeacherId(){const u=activeUser();return u.bagliOgretmenId||u.ogretmenId||''}
function isTeacherUser(){const u=activeUser();return u.admin!==true&&!!activeTeacherId()}
function ownsClass(id){const tid=activeTeacherId();if(!tid)return false;const s=localDoc('siniflar',id)||device().list('siniflar').find(x=>x.id===id);return s?.sinifOgretmeniId===tid}
function fakeDoc(row,id){return{exists:!!row,id:id||row?.id||'',data:()=>row?{...row}:undefined}}
function fakeQuery(rows){const docs=(rows||[]).map(r=>({id:r.id,data:()=>({...r})}));return{empty:docs.length===0,size:docs.length,docs}}
const SO_SEMA_VERSIYON=3;
function duzenA(siraMax=7){const y=[];y.push({sira:0,konum:'sag-ic',aktif:true},{sira:0,konum:'sag-dis',aktif:true},{sira:1,konum:'sol-dis',kapiSag:true,aktif:true},{sira:1,konum:'sol-ic',kapiSag:true,aktif:true});for(let s=2;s<=siraMax;s++)y.push({sira:s,konum:'sol-dis',aktif:true},{sira:s,konum:'sol-ic',aktif:true},{sira:s,konum:'sag-dis',aktif:true});for(let k=0;k<4;k++)y.push({sira:siraMax+1,konum:'arka',aktif:true});return y;}
function duzenB(siraMax=5){const y=[{sira:0,konum:'sol-dis',soforYani:true,kapiSag:true,aktif:true}];for(let s=1;s<=siraMax;s++)y.push({sira:s,konum:'sol-dis',aktif:true},{sira:s,konum:'sol-ic',aktif:true},{sira:s,konum:'sag-ic',aktif:true},{sira:s,konum:'sag-dis',aktif:true});y.push({sira:siraMax+1,konum:'sol-dis',kapiSag:true,aktif:true},{sira:siraMax+1,konum:'sol-ic',kapiSag:true,aktif:true});for(let k=0;k<4;k++)y.push({sira:siraMax+2,konum:'arka',aktif:true});return y;}
const SO_SABLONLAR={ducato:{ad:'Fiat Ducato',ikon:'🚐',aciklama:'2+1 düzen, orta boy',yerlesimUret:(n=7)=>duzenA(n)},'ford-transit':{ad:'Ford Transit',ikon:'🚐',aciklama:'2+1 düzen, kompakt',yerlesimUret:(n=6)=>duzenA(n)},'mercedes-sprinter':{ad:'Mercedes Sprinter',ikon:'🚐',aciklama:'2+1 düzen, uzun şasi',yerlesimUret:(n=8)=>duzenA(n)},'vw-crafter':{ad:'Volkswagen Crafter',ikon:'🚐',aciklama:'2+1 düzen',yerlesimUret:(n=7)=>duzenA(n)},buyuk:{ad:'Büyük Servis',ikon:'🚍',aciklama:'2+2 düzen + arka sıra',yerlesimUret:(n=5)=>duzenB(n)},midibus:{ad:'Midibüs',ikon:'🚌',aciklama:'2+2 düzen, orta boy',yerlesimUret:(n=7)=>duzenB(n)},ozel:{ad:'Özel Tasarım',ikon:'🛠️',aciklama:'Manuel yerleşim',yerlesimUret:()=>[]}};
function legacyToElements(yerlesim,koltuklar){koltuklar=Array.isArray(koltuklar)?koltuklar:[];return(yerlesim||[]).map((yuva,idx)=>{const no=idx+1,k=koltuklar.find(x=>Number(x.no)===no),p={konum:yuva.konum||'',kapiSag:!!yuva.kapiSag,soforYani:!!yuva.soforYani,studentName:k?.ogrenciAdi||'',stop:k?.durak||'',note:k?.not||'',reserved:!!k?.rezerve};return{id:'el_'+no,type:yuva.soforYani?'sofor':yuva.konum==='arka'?'arka-koltuk':'koltuk',seatNumber:yuva.soforYani?null:no,studentId:k?.ogrenciId||null,row:yuva.sira,column:idx,x:null,y:null,rotation:0,locked:!!k?.kilit,visible:yuva.aktif!==false,color:k?.renk||null,properties:p};});}
function elementsToLegacy(elements){const yerlesim=[],koltuklar=[];(elements||[]).forEach((el,idx)=>{const no=idx+1,p=el.properties||{},yuva={sira:el.row,konum:p.konum||'',aktif:el.visible!==false};if(p.soforYani)yuva.soforYani=true;if(p.kapiSag)yuva.kapiSag=true;yerlesim.push(yuva);if(el.type!=='sofor'&&(el.studentId||p.studentName||p.reserved||p.stop||p.note||el.color||el.locked))koltuklar.push({no,ogrenciId:el.studentId||null,ogrenciAdi:p.studentName||'',rezerve:!!p.reserved,durak:p.stop||'',not:p.note||'',renk:el.color||null,kilit:!!el.locked});});return{yerlesim,koltuklar};}
function elementAssignmentsToLegacy(elements){return(Array.isArray(elements)?elements:[]).map((el,idx)=>{const p=el?.properties||{};if(el?.type==='sofor'||!(el?.studentId||p.studentName||p.reserved||p.stop||p.note||el?.color||el?.locked))return null;return{no:idx+1,ogrenciId:el.studentId||null,ogrenciAdi:p.studentName||'',rezerve:!!p.reserved,durak:p.stop||'',not:p.note||'',renk:el.color||null,kilit:!!el.locked};}).filter(Boolean)}
function busElementLayoutUsable(elements){const list=Array.isArray(elements)?elements:[],seats=list.filter(e=>e&&e.type!=='sofor'&&e.visible!==false);if(!seats.length)return false;const allowed=new Set(['sol-dis','sol-ic','sag-ic','sag-dis','arka']);for(const e of seats){if(e.row===null||e.row===undefined||e.row===''||!Number.isFinite(Number(e.row)))return false;if(!allowed.has(String(e.properties?.konum||'')))return false}const rows=new Map();for(const e of seats){const key=Number(e.row);if(!rows.has(key))rows.set(key,[]);rows.get(key).push(e)}if(seats.length>4&&rows.size<2)return false;for(const row of rows.values()){if(row.length>4)return false;const normal=row.filter(e=>e.properties?.konum!=='arka').map(e=>e.properties?.konum);if(new Set(normal).size!==normal.length)return false}return true}
function planElements(plan,sablon){const sb=sablon||plan?.sablon||'ducato',raw=Array.isArray(plan?.elements)?plan.elements:[];if(sb==='ozel'&&raw.length)return structuredClone(raw);if(raw.length&&busElementLayoutUsable(raw))return structuredClone(raw);const yerlesim=Array.isArray(plan?.yerlesim)&&plan.yerlesim.length?plan.yerlesim:(SO_SABLONLAR[sb]?.yerlesimUret()||[]),assignments=Array.isArray(plan?.koltuklar)&&plan.koltuklar.length?plan.koltuklar:elementAssignmentsToLegacy(raw);return legacyToElements(yerlesim,assignments);}
function elementStats(elements){const seats=(elements||[]).filter(e=>e.type!=='sofor'&&e.visible!==false),dolu=seats.filter(e=>e.studentId||e.properties?.studentName).length,rezerve=seats.filter(e=>e.properties?.reserved&&!(e.studentId||e.properties?.studentName)).length,toplam=seats.length;return{toplam,dolu,bos:Math.max(0,toplam-dolu-rezerve),rezerve,doluluk:toplam?Math.round(dolu/toplam*100):0};}
global.SO_SABLONLAR=SO_SABLONLAR;global.soPlanElementleriGetir=planElements;global.soElementIstatistik=elementStats;
const TasimaRepository={servisleriDinle(callback){return device().listen('servisler',callback);},servisEkle(veri){return device().add('servisler',COL.servisler,{...veri,eklenmeTarihi:new Date().toISOString()});},servisGuncelle(id,veri){return device().update('servisler',COL.servisler,id,veri);},servisSil(id){return device().remove('servisler',COL.servisler,id);}};global.TasimaRepository=TasimaRepository;
const TasimaService={_yetkiKontrol(){const ok=global.PermissionService?PermissionService.can('transport.services.edit','edit'):duzenleyebilir('tasima');if(!ok){toast?.('Bu işlem için yetkiniz yok.');return false;}return true;},servisKaydet(id,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return id?TasimaRepository.servisGuncelle(id,veri):TasimaRepository.servisEkle(veri);},servisSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return TasimaRepository.servisSil(id);},ogrencileriServiseAta(ids,servisId,servisAdi){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return Promise.all((ids||[]).map(id=>device().update('veliler',COL.veliler,id,{servisId,servisAdi})));}};global.TasimaService=TasimaService;
const ServisOturmaRepository={planlariDinle(callback){return device().listen('servisOturma',callback);},planKaydet(servisId,veri,merge){return device().set('servisOturma',COL.servisOturma,servisId,{servisId,...veri},{merge:!!merge});},planGuncelle(servisId,veri){return device().update('servisOturma',COL.servisOturma,servisId,veri);},planServisIdIleGetir(servisId){return Promise.resolve(fakeQuery(device().list('servisOturma').filter(x=>x?.servisId===servisId||x?.id===servisId)));}};global.ServisOturmaRepository=ServisOturmaRepository;
const ServisOturmaService={_yetkiKontrol(){if(isTeacherUser()){toast?.('Öğretmen kullanıcıları servis oturma planını yalnız görüntüleyebilir.');return false;}const ok=global.PermissionService?PermissionService.can('transport.seating.edit','edit'):duzenleyebilir('tasima');if(!ok){toast?.('Bu işlem için yetkiniz yok.');return false;}return true;},planKaydet(servisId,veri,merge){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return ServisOturmaRepository.planKaydet(servisId,veri,merge);},planGuncelle(servisId,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return ServisOturmaRepository.planGuncelle(servisId,veri);},planElementsGetir(servisId,sablon='ducato'){return planElements(localDoc('servisOturma',servisId)||{},sablon);},planElementsKaydet(servisId,sablon,elements,merge=false){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));const legacy=elementsToLegacy(elements);return ServisOturmaRepository.planKaydet(servisId,{sablon,elements,...legacy,semaVersiyon:SO_SEMA_VERSIYON,guncellendi:new Date().toISOString()},merge);},sablonUygula(servisId,sablon){const elements=legacyToElements(SO_SABLONLAR[sablon]?.yerlesimUret?.()||[],[]);return this.planElementsKaydet(servisId,sablon,elements,false);}};global.ServisOturmaService=ServisOturmaService;
const SinifOturmaRepository={planGetir(id){return Promise.resolve(fakeDoc(localDoc('sinifOturma',id),id));},planDinle(id,cb){const run=()=>{const r=localDoc('sinifOturma',id);cb(r?{id,...r}:null,{source:'device'});};run();return AppStore.subscribe('data.sinifOturma',run);},planKaydet(id,veri){return device().set('sinifOturma',COL.sinifOturma,id,{sinifId:id,...veri},{merge:false});}};global.SinifOturmaRepository=SinifOturmaRepository;
const SinifOturmaService={_yetkiKontrol(id){const u=activeUser(),ok=isTeacherUser()?ownsClass(id):(u.admin===true||(global.PermissionService?PermissionService.can('transport.classSeating.edit','edit'):duzenleyebilir('siniflar')));if(!ok){toast?.('Bu sınıf oturma planını düzenleme yetkiniz yok.');return false;}return true;},planGetir:id=>SinifOturmaRepository.planGetir(id),planDinle(id,cb,hata){try{return SinifOturmaRepository.planDinle(id,cb);}catch(e){hata?.(e);return()=>{};}},planKaydet(id,veri){if(!this._yetkiKontrol(id))return Promise.reject(new Error('yetkisiz'));return SinifOturmaRepository.planKaydet(id,veri);}};global.SinifOturmaService=SinifOturmaService;
})(window);


(function(){
'use strict';if(window.TransportModule)return;
let active='services',query='',serviceFilter='all',serviceDetailId='',mounted=false,unsubs=[],editor=null;
const uiUser=()=>window.AKTIF_KULLANICI||window.AppStore?.get?.('session.user')||{};
const uiTeacherId=()=>{const u=uiUser();return u.bagliOgretmenId||u.ogretmenId||''};
const uiTeacher=()=>uiUser().admin!==true&&!!uiTeacherId();
const classOwn=id=>{const t=uiTeacherId(),s=arr('siniflar').find(x=>x.id===id);return !!t&&s?.sinifOgretmeniId===t};
const canEditBusSeats=()=>!uiTeacher()&&(uiUser().admin===true||!window.PermissionService||window.PermissionService.can('transport.seating.edit','edit'));
const canEditClassSeat=id=>uiTeacher()?classOwn(id):(uiUser().admin===true||!window.PermissionService||window.PermissionService.can('transport.classSeating.edit','edit')||window.PermissionService.can('people.classes','edit'));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const arr=t=>{const v=window.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const match=vals=>{const q=norm(query.trim());return!q||norm(vals.filter(Boolean).join(' ')).includes(q)};
const canEditServices=()=>!window.PermissionService||PermissionService.can('transport.services.edit','edit');
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const canEdit=()=>canEditServices();
const service=id=>arr('servisler').find(x=>String(x.id)===String(id))||null;
const className=id=>arr('siniflar').find(x=>String(x.id)===String(id))?.ad||id||'—';
const students=id=>arr('veliler').filter(v=>String(v.servisId||'')===String(id||'')).slice().sort((a,b)=>className(a.sinifId).localeCompare(className(b.sinifId),'tr',{numeric:true})||String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'));
const phone=v=>v.telefon1||v.telefon||v.telefon2||v.telefon3||'';
const close=id=>document.getElementById(id)?.remove();
function presidentNames(s){const ids=new Set(Array.isArray(s?.baskanlar)?s.baskanlar.map(String):[]),names=students(s?.id).filter(v=>ids.has(String(v.id))).map(v=>v.ogrenciAdi||'Öğrenci');return names.length?names.join(', '):'Atanmadı'}
function serviceStatus(s){return String(s?.durum||'Aktif')}
function activeServiceCount(){return arr('servisler').filter(s=>serviceStatus(s)!=='Pasif').length}
function requirePermission(key,min='edit'){if(window.PermissionService){PermissionService.require('module.transport',min==='edit'?'edit':'preview');PermissionService.require(key,min)}return true}
async function prepareLocal(){if(!window.SyncEngine||!window.COL)return;const defs={servisOturma:COL.servisOturma,sinifOturma:COL.sinifOturma,resmiTatiller:COL.resmiTatiller},types=[];Object.entries(defs).forEach(([t,c])=>{if(c){SyncEngine.register(t,c);types.push(t)}});types.push('yemekMenuleri');await SyncEngine.localHydrate(types);if(types.length)SyncEngine.schedule(100)}
function shell(){return `<section class="ka-stack" data-transport-module><div class="ka-row ka-row--between"><div><h2>Taşıma & Yemek</h2><p class="ka-muted">Taşıma, oturma planları ve yemek işlemleri tek bölümden yönetilir.</p></div><span id="transportCount" class="ka-badge"></span></div><label class="ka-field"><span class="ka-field__label">Ara</span><input id="transportSearch" type="search" placeholder="Servis, plaka, güzergâh veya sınıf ara…"></label><div id="transportContent" class="ka-stack"></div></section>`}
function serviceName(s){return s?.servisAdi||s?.guzergah||s?.plaka||'Servis'}
function services(){const all=arr('servisler').filter(s=>match([s.servisAdi,s.guzergah,s.plaka,s.soforAdi,s.soforTelefon,s.soforTc])).sort((a,b)=>serviceName(a).localeCompare(serviceName(b),'tr')),list=all.filter(s=>serviceFilter==='all'||(serviceFilter==='active'?serviceStatus(s)!=='Pasif':serviceStatus(s)==='Pasif')),cards=list.map(s=>{const n=students(s.id).length;return `<article class="ka-card ka-transport-service-card" data-service-detail="${esc(s.id)}" tabindex="0" role="button"><div class="ka-card__body ka-row ka-row--between"><div class="ka-grow ka-transport-service-card__main"><div class="ka-row ka-wrap"><strong>${esc(serviceName(s))}</strong><span class="ka-badge ${serviceStatus(s)==='Pasif'?'ka-badge--muted':'ka-badge--success'}">${esc(serviceStatus(s))}</span></div><div class="ka-muted">${esc([s.soforAdi?`Şoför: ${s.soforAdi}`:'',s.plaka,s.guzergah].filter(Boolean).join(' · '))}</div></div><div class="ka-transport-service-card__side"><span class="ka-badge">${n} öğrenci</span>${canEditServices()?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-service-edit="${esc(s.id)}" data-ka-write="transport.services.edit">Düzenle</button>`:''}</div></div></article>`});return{count:list.length,html:`<div class="ka-row ka-row--between ka-wrap"><div><h3>Servis Listesi</h3><div class="ka-muted">Servise dokunarak ayrıntıları, öğrencileri ve raporları açın.</div></div>${canEditServices()?'<button class="ka-btn" type="button" data-service-add data-ka-write="transport.services.edit">+ Yeni Servis</button>':''}</div><div class="ka-row ka-wrap ka-transport-filters" role="group" aria-label="Servis filtresi"><button class="ka-btn ka-btn--sm ${serviceFilter==='all'?'':'ka-btn--secondary'}" type="button" data-service-filter="all">Tümü</button><button class="ka-btn ka-btn--sm ${serviceFilter==='active'?'':'ka-btn--secondary'}" type="button" data-service-filter="active">Aktif</button><button class="ka-btn ka-btn--sm ${serviceFilter==='passive'?'':'ka-btn--secondary'}" type="button" data-service-filter="passive">Pasif</button></div><div class="ka-stack ka-transport-service-list">${cards.length?cards.join(''):'<div class="ka-empty">Servis kaydı bulunamadı.</div>'}</div>`}}
function serviceDetailStudentRow(v,presidents){
 const isPresident=presidents.has(String(v.id)),gender=String(v.cinsiyet||''),genderClass=norm(gender).includes('erkek')?'is-male':'is-female';
 return `<article class="ka-transport-student-row"><div class="ka-transport-student-avatar ${isPresident?'is-president':''}" aria-hidden="true">${isPresident?'👑':'👤'}</div><div class="ka-transport-student-main"><strong>${esc(v.ogrenciAdi||'Öğrenci')}</strong><div class="ka-transport-student-meta">${v.ogrenciNo?`<span class="ka-transport-student-no">No: ${esc(v.ogrenciNo)}</span>`:''}<span class="ka-transport-chip ka-transport-chip--class">${esc(className(v.sinifId))}</span>${gender?`<span class="ka-transport-chip ka-transport-chip--gender ${genderClass}">${esc(gender)}</span>`:''}${isPresident?'<span class="ka-transport-chip ka-transport-chip--president">Servis Başkanı</span>':''}</div></div>${canEditServices()?`<button class="ka-btn ka-btn--sm ka-transport-remove" type="button" data-transport-remove-student="${esc(v.id)}"><span aria-hidden="true">🗑</span><span>Çıkar</span></button>`:''}</article>`;
}
function serviceDetail(){
 const s=service(serviceDetailId);if(!s){serviceDetailId='';return services()}
 const list=students(s.id),presidents=new Set((Array.isArray(s.baskanlar)?s.baskanlar:[]).map(String)),status=serviceStatus(s),statusClass=status==='Pasif'?'ka-badge--muted':'ka-badge--success';
 return{count:list.length,html:`<section class="ka-stack ka-transport-detail" data-transport-service-detail="${esc(s.id)}"><div class="ka-transport-detail__toolbar ka-transport-action-grid"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-list><span class="ka-transport-action__icon" aria-hidden="true">▣</span><span>Rapor</span></button>${canEditServices()?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-service-edit="${esc(s.id)}"><span class="ka-transport-action__icon" aria-hidden="true">✎</span><span>Düzenle</span></button><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-transport-detail-delete><span class="ka-transport-action__icon" aria-hidden="true">⌫</span><span>Sil</span></button>`:''}<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-detail-close><span class="ka-transport-action__icon" aria-hidden="true">×</span><span>Kapat</span></button></div><header class="ka-card ka-transport-service-hero"><div class="ka-transport-service-hero__icon" aria-hidden="true">🚌</div><div class="ka-transport-service-hero__main"><div class="ka-row ka-wrap"><h2>${esc(serviceName(s))}</h2><span class="ka-badge ${statusClass}">${esc(status)}</span></div><p>${esc([s.guzergah,status].filter(Boolean).join(' · '))}</p></div><span class="ka-transport-service-hero__count">${list.length} öğrenci</span></header><article class="ka-card ka-transport-info-card"><div class="ka-card__body ka-stack"><div class="ka-transport-section-title"><span aria-hidden="true">♢</span><h3>Servis Bilgileri</h3></div><div class="ka-transport-info-grid"><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">👨‍✈️</span><div><small>Şoför</small><strong>${esc(s.soforAdi||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">🪪</span><div><small>Şoför T.C. No</small><strong>${esc(s.soforTc||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">☎</span><div><small>Telefon</small>${s.soforTelefon?`<a href="tel:${esc(s.soforTelefon)}">${esc(s.soforTelefon)}</a>`:'<strong>—</strong>'}</div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">🚘</span><div><small>Plaka</small><strong>${esc(s.plaka||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">◉</span><div><small>Durum</small><span class="ka-badge ${statusClass}">${esc(status)}</span></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">🗺️</span><div><small>Güzergâh</small><strong>${esc(s.guzergah||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">📅</span><div><small>Araç Model Yılı</small><strong>${esc(s.modelYili||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">🪪</span><div><small>Sürücü Belgesi Yılı</small><strong>${esc(s.ehliyetYili||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">🪪</span><div><small>Sürücü Belgesi Sınıfı</small><strong>${esc(s.ehliyetSinifi||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon is-crown" aria-hidden="true">👑</span><div><small>Servis Başkanı</small><strong>${esc(presidentNames(s))}</strong></div></div></div><div class="ka-transport-report-actions"><button class="ka-btn ka-btn--secondary" type="button" data-transport-detail-report="monthly">📋 Aylık Takip</button><button class="ka-btn ka-btn--secondary" type="button" data-transport-detail-report="inspection">📄 Denetim Formu</button></div></div></article><section class="ka-card ka-transport-students-card"><div class="ka-card__body ka-stack"><div class="ka-transport-students-head"><div class="ka-transport-section-title"><span aria-hidden="true">👥</span><h3>Servis Öğrenci Listesi (${list.length})</h3></div><p>Sınıf, öğrenci no ve cinsiyet bilgileri cihazdaki öğrenci kayıtlarından gelir.</p></div><div class="ka-transport-detail-actions">${canEditServices()?'<button class="ka-btn ka-btn--secondary" type="button" data-transport-excel>▤ Excel\'den Ekle</button><button class="ka-btn" type="button" data-transport-add-student>＋ Öğrenci Ekle</button>':''}<button class="ka-btn ka-btn--secondary" type="button" data-transport-list>☷ Liste Oluştur</button>${canEditServices()?'<button class="ka-btn ka-btn--secondary" type="button" data-transport-presidents>👑 Başkanlar</button>':''}</div><div class="ka-transport-student-list">${list.length?list.map(v=>serviceDetailStudentRow(v,presidents)).join(''):'<div class="ka-empty">Bu serviste kayıtlı öğrenci yok.</div>'}</div></div></section></section>`}
}
function openServiceDetail(id){if(!service(id))return;serviceDetailId=id;query='';render();document.getElementById('transportContent')?.scrollIntoView?.({block:'start'})}
function closeServiceDetail(){if(!serviceDetailId)return false;serviceDetailId='';render();return true}

function serviceModal(s={}){return `<div class="ka-modal-backdrop" data-service-modal><form class="ka-modal" id="serviceForm"><div class="ka-modal__header"><h2>${s.id?'Servisi Düzenle':'Yeni Servis'}</h2></div><div class="ka-modal__body ka-stack"><input type="hidden" name="id" value="${esc(s.id||'')}"><label class="ka-field"><span class="ka-field__label">Servis Adı</span><input name="servisAdi" value="${esc(s.servisAdi||'')}" placeholder="Örn. Balıbey Servisi"></label><label class="ka-field"><span class="ka-field__label">Güzergâh *</span><input name="guzergah" required value="${esc(s.guzergah||'')}" placeholder="Örn. Aydınlar - Balıbey"></label><label class="ka-field"><span class="ka-field__label">Plaka *</span><input name="plaka" required value="${esc(s.plaka||'')}" placeholder="23 ABC 123"></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Sürücü Adı Soyadı</span><input name="soforAdi" value="${esc(s.soforAdi||'')}"></label><label class="ka-field"><span class="ka-field__label">Şoför T.C. Kimlik No</span><input name="soforTc" inputmode="numeric" autocomplete="off" maxlength="11" minlength="11" pattern="[0-9]{11}" value="${esc(s.soforTc||'')}" placeholder="11 haneli T.C. kimlik numarası"></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Sürücü Telefonu</span><input name="soforTelefon" inputmode="tel" value="${esc(s.soforTelefon||'')}"></label><label class="ka-field"><span class="ka-field__label">Araç Model Yılı</span><input name="modelYili" inputmode="numeric" maxlength="4" value="${esc(s.modelYili||'')}" placeholder="Örn. 2022"></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Sürücü Belgesi Yılı</span><input name="ehliyetYili" inputmode="numeric" maxlength="4" value="${esc(s.ehliyetYili||'')}" placeholder="Örn. 2014"></label><label class="ka-field"><span class="ka-field__label">Sürücü Belgesi Sınıfı</span><input name="ehliyetSinifi" value="${esc(s.ehliyetSinifi||'')}" placeholder="Örn. B, D1, D"></label></div></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-service-close>Vazgeç</button><button class="ka-btn" type="submit">Kaydet</button></div></form></div>`}
function openServiceModal(item={}){if(!canEditServices())return;document.querySelector('[data-service-modal]')?.remove();document.body.insertAdjacentHTML('beforeend',serviceModal(item));const modal=document.querySelector('[data-service-modal]');modal.querySelector('[data-service-close]')?.addEventListener('click',()=>modal.remove());modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});modal.querySelector('#serviceForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),id=String(fd.get('id')||''),tc=String(fd.get('soforTc')||'').replace(/\D/g,'').slice(0,11),veri={servisAdi:String(fd.get('servisAdi')||'').trim(),guzergah:String(fd.get('guzergah')||'').trim(),plaka:String(fd.get('plaka')||'').trim().toLocaleUpperCase('tr'),soforAdi:String(fd.get('soforAdi')||'').trim(),soforTc:tc,soforTelefon:String(fd.get('soforTelefon')||'').trim(),modelYili:String(fd.get('modelYili')||'').trim(),ehliyetYili:String(fd.get('ehliyetYili')||'').trim(),ehliyetSinifi:String(fd.get('ehliyetSinifi')||'').trim().toLocaleUpperCase('tr')};if(!veri.guzergah||!veri.plaka)return toast?.('Güzergâh ve plaka zorunludur.');if(tc&&tc.length!==11)return toast?.('Şoför T.C. kimlik numarası 11 haneli olmalıdır.');try{await window.TasimaService.servisKaydet(id||null,veri);toast?.('Servis kaydedildi.');modal.remove();render()}catch(err){toast?.('Servis kaydedilemedi: '+(err?.message||err))}})}
async function deleteService(id){if(!canEditServices())return;const s=arr('servisler').find(x=>x.id===id);if(!s)return;const n=arr('veliler').filter(v=>v.servisId===id).length;if(n){toast?.(`Bu servise bağlı ${n} öğrenci var. Önce öğrencileri başka servise taşıyın.`);return}if(!confirm(`“${serviceName(s)}” silinsin mi?`))return;try{await window.TasimaService.servisSil(id);toast?.('Servis silindi.');render()}catch(err){toast?.('Servis silinemedi: '+(err?.message||err))}}
function detailStudentRow(v,presidents){
 const isPresident=presidents.has(v.id),tel=phone(v);
 return `<article class="ka-card"><div class="ka-card__body ka-row ka-row--between" style="gap:12px"><div class="ka-grow"><strong>${isPresident?'👑 ':''}${esc(v.ogrenciAdi||'Öğrenci')}</strong>${v.ogrenciNo?` <span class="ka-muted">No: ${esc(v.ogrenciNo)}</span>`:''}<div class="ka-muted">${esc(className(v.sinifId))}${v.cinsiyet?` · ${esc(v.cinsiyet)}`:''}${v.veliAdi?` · Veli: ${esc(v.veliAdi)}`:''}</div>${tel?`<div class="ka-muted">📞 <a href="tel:${esc(tel)}">${esc(tel)}</a></div>`:''}</div>${canEdit()?`<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-transport-remove-student="${esc(v.id)}">Çıkar</button>`:''}</div></article>`;
}

async function removeStudent(servisId,studentId){
 const v=arr('veliler').find(x=>x.id===studentId);if(!v||!confirm(`“${v.ogrenciAdi||'Öğrenci'}” bu servisten çıkarılsın mı?`))return;
 try{await window.TasimaService.ogrencileriServiseAta([studentId],'','');const s=service(servisId),next=(Array.isArray(s?.baskanlar)?s.baskanlar:[]).filter(x=>x!==studentId);if((s?.baskanlar||[]).length!==next.length)await window.TasimaService.servisKaydet(servisId,{baskanlar:next});window.toast?.('Öğrenci servisten çıkarıldı.');requestAnimationFrame(()=>openServiceDetail(servisId))}catch(e){window.toast?.('Öğrenci çıkarılamadı: '+(e?.message||e))}
}

function classOptions(){return arr('siniflar').slice().sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr',{numeric:true})).map(s=>`<option value="${esc(s.id)}">${esc(s.ad||'Sınıf')}</option>`).join('')}
function openAddStudents(id){
 const s=service(id);if(!s)return;close('transportAddStudents');const ov=document.createElement('div');ov.id='transportAddStudents';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><h2>Öğrenci Ekle</h2><p class="ka-muted">${esc(serviceName(s))}</p></div><button class="ka-icon-button" data-close type="button">×</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Sınıf</span><select data-class><option value="">Sınıf seçin</option>${classOptions()}</select></label><div data-student-list class="ka-stack"><div class="ka-empty">Önce sınıf seçin.</div></div></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" data-close type="button">Vazgeç</button><button class="ka-btn" data-apply type="button">Seçilenleri Servise Ata</button></div></section>`;document.body.appendChild(ov);
 $$('[data-close]',ov).forEach(b=>b.onclick=()=>ov.remove());const list=$('[data-student-list]',ov),sel=$('[data-class]',ov);sel.onchange=()=>{const rs=arr('veliler').filter(v=>v.sinifId===sel.value).sort((a,b)=>String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'));list.innerHTML=rs.length?rs.map(v=>{const here=v.servisId===id,other=v.servisId&&v.servisId!==id;return `<label class="ka-card"><div class="ka-card__body ka-row"><input type="checkbox" value="${esc(v.id)}" data-student-check ${here?'checked disabled':''}><div class="ka-grow"><strong>${esc(v.ogrenciAdi||'')}</strong><div class="ka-muted">${v.ogrenciNo?`No: ${esc(v.ogrenciNo)} · `:''}${here?'Bu serviste':other?`Başka serviste: ${esc(v.servisAdi||'Servis')}`:'Servis atanmamış'}</div></div></div></label>`}).join(''):'<div class="ka-empty">Bu sınıfta öğrenci bulunamadı.</div>'};
 $('[data-apply]',ov).onclick=async()=>{const ids=$$('[data-student-check]:checked:not(:disabled)',ov).map(x=>x.value);if(!ids.length)return window.toast?.('En az bir öğrenci seçin.');if(ids.some(sid=>{const v=arr('veliler').find(x=>x.id===sid);return v?.servisId&&v.servisId!==id})&&!confirm('Seçilen öğrencilerden bazıları başka serviste. Yeni servise taşınsın mı?'))return;const b=$('[data-apply]',ov);b.disabled=true;try{await window.TasimaService.ogrencileriServiseAta(ids,id,serviceName(s));window.toast?.(`${ids.length} öğrenci servise atandı.`);ov.remove();openServiceDetail(id)}catch(e){window.toast?.('Öğrenciler atanamadı: '+(e?.message||e));b.disabled=false}};
}

function openPresidents(id){
 const s=service(id),list=students(id);if(!s)return;close('transportPresidents');const selected=new Set(Array.isArray(s.baskanlar)?s.baskanlar:[]),ov=document.createElement('div');ov.id='transportPresidents';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><h2>Servis Başkanları</h2><p class="ka-muted">Bir veya birden fazla öğrenci seçilebilir.</p></div><button class="ka-icon-button" data-close type="button">×</button></div><div class="ka-modal__body ka-stack">${list.length?list.map(v=>`<label class="ka-card"><div class="ka-card__body ka-row"><input type="checkbox" data-president value="${esc(v.id)}" ${selected.has(v.id)?'checked':''}><span>${esc(v.ogrenciAdi||'')} · ${esc(className(v.sinifId))}</span></div></label>`).join(''):'<div class="ka-empty">Serviste öğrenci yok.</div>'}</div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" data-close type="button">Vazgeç</button><button class="ka-btn" data-save type="button">Kaydet</button></div></section>`;document.body.appendChild(ov);$$('[data-close]',ov).forEach(b=>b.onclick=()=>ov.remove());$('[data-save]',ov).onclick=async()=>{const ids=$$('[data-president]:checked',ov).map(x=>x.value),b=$('[data-save]',ov);b.disabled=true;try{await window.TasimaService.servisKaydet(id,{baskanlar:ids});window.toast?.('Servis başkanları güncellendi.');ov.remove();openServiceDetail(id)}catch(e){window.toast?.('Başkanlar kaydedilemedi: '+(e?.message||e));b.disabled=false}};
}

async function ensureStudentParser(){
 if(window.PeopleImportUI?.parseStudentExcel)return true;
 await window.AppLoader?.loadScript?.('js/modules/people-import.js');
 if(!window.PeopleImportUI?.parseStudentExcel)throw new Error('Excel öğrenci ayrıştırıcısı yüklenemedi.');return true;
}
function findExistingStudent(r){const all=arr('veliler'),no=String(r.ogrenciNo||'').trim();if(no){const byNo=all.find(v=>String(v.ogrenciNo||'').trim()===no);if(byNo)return byNo}return all.find(v=>norm(v.ogrenciAdi)===norm(r.ogrenciAdi)&&(!r.sinifId||v.sinifId===r.sinifId))||null}
function openExcel(id){
 const s=service(id);if(!s)return;close('transportExcelImport');const ov=document.createElement('div');ov.id='transportExcelImport';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><h2>Excel'den Servise Ekle</h2><p class="ka-muted">Mevcut öğrenci kayıtlarını öğrenci no/ad ile eşleştirir; yeni öğrenci kaydı üretmez.</p></div><button class="ka-icon-button" data-close type="button">×</button></div><div class="ka-modal__body"><label class="ka-field"><span class="ka-field__label">Excel Dosyası (.xlsx / .xls)</span><input type="file" accept=".xlsx,.xls" data-file></label><div class="ka-muted" data-result></div></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" data-close type="button">Vazgeç</button><button class="ka-btn" data-import type="button">Eşleştir ve Ata</button></div></section>`;document.body.appendChild(ov);$$('[data-close]',ov).forEach(b=>b.onclick=()=>ov.remove());$('[data-import]',ov).onclick=async()=>{const file=$('[data-file]',ov)?.files?.[0];if(!file)return window.toast?.('Excel dosyası seçin.');const b=$('[data-import]',ov),out=$('[data-result]',ov);b.disabled=true;try{await ensureStudentParser();const parsed=await window.PeopleImportUI.parseStudentExcel(file),matched=[],unmatched=[];for(const r of parsed){const v=findExistingStudent(r);v?matched.push(v.id):unmatched.push(r.ogrenciAdi||r.ogrenciNo||'Bilinmeyen')}const ids=[...new Set(matched)];if(!ids.length)throw new Error('Dosyadaki öğrenciler mevcut kayıtlarla eşleşmedi.');await window.TasimaService.ogrencileriServiseAta(ids,id,serviceName(s));out.textContent=`${ids.length} öğrenci eşleşti ve atandı${unmatched.length?`, ${unmatched.length} satır eşleşmedi`:''}.`;window.toast?.(`${ids.length} öğrenci servise atandı.`);setTimeout(()=>{ov.remove();openServiceDetail(id)},250)}catch(e){out.textContent='İçe aktarma hatası: '+(e?.message||e);b.disabled=false}};
}

const LIST_COLS=[['sira','Sıra'],['ogrenciAdi','Ad Soyad'],['ogrenciNo','Öğrenci No'],['sinif','Sınıf'],['cinsiyet','Cinsiyet'],['baskan','Servis Başkanı'],['veliAdi','Veli Adı'],['yakinlik','Yakınlık'],['telefon1','Telefon 1'],['telefon2','Telefon 2']];
function listValue(k,v,i,s){if(k==='sira')return i+1;if(k==='sinif')return className(v.sinifId);if(k==='baskan')return(Array.isArray(s.baskanlar)&&s.baskanlar.includes(v.id))?'Evet':'';if(k==='yakinlik')return v.yakinlik1||v.yakinlik||'';if(k==='telefon1')return v.telefon1||v.telefon||'';return v[k]||''}
function openListBuilder(id){
 const s=service(id);if(!s)return;close('transportListBuilder');const year=new Date().getFullYear(),ov=document.createElement('div');ov.id='transportListBuilder';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><h2>Servis Listesi Oluştur</h2><p class="ka-muted">${esc(serviceName(s))}</p></div><button class="ka-icon-button" data-close type="button">×</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Başlık</span><input data-title value="${esc(serviceName(s))} ÖĞRENCİ LİSTESİ"></label><label class="ka-field"><span class="ka-field__label">Alt Başlık</span><input data-subtitle value="${year}-${year+1} Eğitim Öğretim Yılı"></label><div class="ka-grid">${LIST_COLS.map(([k,l])=>`<label class="ka-check"><input type="checkbox" data-col value="${k}" ${['sira','ogrenciAdi','ogrenciNo','sinif','baskan','veliAdi','telefon1'].includes(k)?'checked':''}> ${esc(l)}</label>`).join('')}</div><label class="ka-field"><span class="ka-field__label">Sayfa Yönü</span><select data-orientation><option value="dikey">Dikey</option><option value="yatay">Yatay</option></select></label></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" data-close type="button">Vazgeç</button><button class="ka-btn" data-print type="button">Önizle / Yazdır</button></div></section>`;document.body.appendChild(ov);$$('[data-close]',ov).forEach(b=>b.onclick=()=>ov.remove());$('[data-print]',ov).onclick=()=>{const keys=$$('[data-col]:checked',ov).map(x=>x.value);if(!keys.length)return window.toast?.('En az bir sütun seçin.');const list=students(id),school=arr('okulBilgileri')[0]||{},head=`<h1>${esc(school.okulAdi||'KORUK İLK-ORTAOKULU')}</h1><h2>${esc($('[data-title]',ov).value||'SERVİS ÖĞRENCİ LİSTESİ')}</h2><p style="text-align:center">${esc($('[data-subtitle]',ov).value||'')}</p>`,table=`<table><thead><tr>${keys.map(k=>`<th>${esc(LIST_COLS.find(x=>x[0]===k)?.[1]||k)}</th>`).join('')}</tr></thead><tbody>${list.map((v,i)=>`<tr>${keys.map(k=>`<td>${esc(listValue(k,v,i,s))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;window.ReportEngine?.printReport?.('Servis Öğrenci Listesi',head+table,{fileName:`${s.plaka||serviceName(s)}_Ogrenci_Listesi`,yon:$('[data-orientation]',ov).value||'dikey'});};
}

function currentPlan(servisId){return arr('servisOturma').find(p=>p.servisId===servisId||p.id===servisId)||null}
function busSeats(){
 const editable=canEditBusSeats();
 const list=arr('servisler').filter(s=>match([s.servisAdi,s.guzergah,s.plaka,currentPlan(s.id)?.sablon])).sort((a,b)=>serviceName(a).localeCompare(serviceName(b),'tr'));
 return listResult(list,s=>{
  const p=currentPlan(s.id),els=window.soPlanElementleriGetir?.(p||{},p?.sablon||'ducato')||[],st=window.soElementIstatistik?.(els)||{toplam:0,dolu:0};
  return `<div class="ka-card ka-list-card ka-bus-seat-card">
   <div class="ka-card__body ka-row ka-row--between">
    <div class="ka-grow"><strong>${esc(serviceName(s))}</strong>
     <div class="ka-muted">${esc(s.plaka||'')}${s.guzergah?' · '+esc(s.guzergah):''}</div>
     <div class="ka-muted">${esc(window.SO_SABLONLAR?.[p?.sablon]?.ad||p?.sablon||'Henüz plan yok')}</div>
    </div>
    <span class="ka-badge">${st.dolu}/${(st.toplam||'—')}</span>
   </div>
   <div class="ka-card__footer" style="padding-top:0">
    <button class="ka-btn ka-btn--secondary" type="button" data-bus-edit="${esc(s.id)}" aria-label="${esc(serviceName(s))} servis oturma planını aç" onclick="event.preventDefault();event.stopPropagation();window.TransportModule?.openBusEditor?.(this.dataset.busEdit)" style="width:100%;min-height:46px;min-width:44px;display:block;touch-action:manipulation">💺 Oturma Planını Aç</button>
   </div>
  </div>`;
 },'Servis kaydı bulunamadı.')
}
function classSeats(){const plans=arr('sinifOturma'),classes=arr('siniflar').filter(s=>match([s.ad,s.derslik,plans.find(p=>p.sinifId===s.id||p.id===s.id)?.sinifAdi])).sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr',{numeric:true}));return listResult(classes,s=>{const p=plans.find(x=>x.sinifId===s.id||x.id===s.id),items=Array.isArray(p?.koltuklar)?p.koltuklar:Array.isArray(p?.yerlesim)?p.yerlesim:[],editable=canEditClassSeat(s.id);return `<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>${esc(s.ad||p?.sinifAdi||'Sınıf oturma planı')}</strong><div class="ka-muted">${esc(s.derslik||'')}${p?'':' · Henüz plan yok'}</div></div><span class="ka-badge">${items.length} yer</span><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-class-seat-open="${esc(s.id)}">${editable?'Düzenle':'Görüntüle'}</button></div></article>`},'Sınıf bulunamadı.')}
function listResult(list,renderer,empty){return{count:list.length,html:list.length?list.map(renderer).join(''):`<div class="ka-empty">${esc(empty)}</div>`}}
function seatStudentName(e){if(!e)return'';return arr('veliler').find(v=>String(v.id)===String(e.studentId))?.ogrenciAdi||e.properties?.studentName||''}
const SBE_W=900,SBE_H=1320,SBE_MIN=.6,SBE_MAX=2.2;function sablonValue(v){return v==='ducato'?'minibus':v;}
const SBE_TYPES={seat:{label:'Tekli koltuk',icon:'👤',w:145,h:90},double:{label:'İkili koltuk',icon:'👥',w:145,h:105},special:{label:'Özel koltuk',icon:'🪑',w:160,h:95},empty:{label:'Boş alan',icon:'🚫',w:150,h:80},door:{label:'Kapı',icon:'🚪',w:80,h:110},window:{label:'Cam',icon:'🪟',w:150,h:28},emergency:{label:'Acil çıkış',icon:'⛔',w:145,h:42},engine:{label:'Motor',icon:'🔧',w:150,h:65},luggage:{label:'Bagaj',icon:'🧳',w:180,h:65},driver:{label:'Şoför',icon:'🧑‍✈️',w:190,h:82}};
function sbeIsSeat(e){return e?.type==='koltuk'||e?.type==='arka-koltuk'||['seat','double','special'].includes(e?.properties?.kind)}
function sbeKind(e){if(e?.type==='sofor'||e?.properties?.kind==='driver')return'driver';if(['seat','double','special','empty','door','window','emergency','engine','luggage'].includes(e?.properties?.kind))return e.properties.kind;if(e?.type==='arka-koltuk')return'double';return sbeIsSeat(e)?'seat':'special'}
function sbeNormalize(elements){const src=Array.isArray(elements)?structuredClone(elements):[],out=[];let seatNo=1;src.filter(e=>e?.visible!==false).forEach((e,i)=>{const k=sbeKind(e),cfg=SBE_TYPES[k]||SBE_TYPES.special;let x=Number(e.x),y=Number(e.y);if(!Number.isFinite(x)||!Number.isFinite(y)){const row=Number(e.row)||0,p=String(e.properties?.konum||''),mx={'sol-dis':55,'sol-ic':290,'sag-ic':455,'sag-dis':690,'arka':55};x=mx[p]??55+(i%4)*210;y=p==='arka'?1120:145+row*145}e.id=e.id||'obj_'+Date.now()+'_'+i;e.properties={...(e.properties||{}),kind:k};e.width=Number(e.width)||cfg.w;e.height=Number(e.height)||cfg.h;e.x=Math.max(15,Math.min(SBE_W-e.width-15,x));e.y=Math.max(100,Math.min(SBE_H-e.height-15,y));e.rotation=Number(e.rotation)||0;e.visible=true;if(sbeIsSeat(e)){e.type='koltuk';e.seatNumber=Number(e.seatNumber)||seatNo;e.row=Number(e.row)||null;e.column=Number(e.column)||null;e.studentId=e.studentId||null;e.properties.studentName=seatStudentName(e)||e.properties.studentName||'';e.locked=!!e.locked;seatNo++}else if(k==='driver'){e.type='sofor';e.locked=true}out.push(e)});if(!out.some(e=>sbeKind(e)==='driver'))out.unshift({id:'driver_'+Date.now(),type:'sofor',x:355,y:20,width:190,height:82,rotation:0,visible:true,locked:true,studentId:null,properties:{kind:'driver',label:'Şoför'}});

// Eski planlarda tüm koltuklar aynı/çok yakın koordinatlara kaydedilmiş olabiliyor.
// Böyle bir veri tespit edilirse koltukları gerçek satır/kolon düzenine geri dağıt.
const seats=out.filter(sbeIsSeat);
if(seats.length>2){const keys=new Set(seats.map(e=>Math.round(e.x)+'|'+Math.round(e.y)));if(keys.size<Math.max(2,Math.ceil(seats.length*.65))){const doubleLayout=seats.some(e=>sbeKind(e)==='double')||seats.filter(e=>e.properties?.konum==='sag-ic').length>0;const oneTwo=seats.filter(e=>e.properties?.konum==='sol-ic').length>0&&seats.filter(e=>e.properties?.konum==='sag-ic').length>0;const cols=doubleLayout?4:3;const xs=doubleLayout?[30,245,460,675]:oneTwo?[180,410,595]:[55,290,525];seats.sort((a,b)=>(Number(a.seatNumber)||0)-(Number(b.seatNumber)||0));seats.forEach((e,i)=>{const col=i%cols,row=Math.floor(i/cols);e.column=col+1;e.row=row+1;e.x=xs[col];e.y=145+row*(doubleLayout?135:145);e.x=Math.min(SBE_W-e.width-15,e.x);e.y=Math.min(SBE_H-e.height-15,e.y)})}}
return out}
function sbeSeed(key){const cfg={minibus:{rows:6,cols:['sol-dis','sol-ic','sag-dis'],kind:'seat'},'2x2':{rows:5,cols:['sol-dis','sol-ic','sag-ic','sag-dis'],kind:'double'},'1x2':{rows:6,cols:['sol-ic','sag-ic','sag-dis'],kind:'seat'},empty:{rows:0,cols:[],kind:'seat'}}[key]||{rows:6,cols:['sol-dis','sol-ic','sag-dis'],kind:'seat'};const a=[{id:'driver_'+Date.now(),type:'sofor',x:355,y:20,width:190,height:82,rotation:0,visible:true,locked:true,studentId:null,properties:{kind:'driver',label:'Şoför'}}];let n=1;for(let r=0;r<cfg.rows;r++)cfg.cols.forEach((col,i)=>a.push({id:'seat_'+Date.now()+'_'+n,type:'koltuk',seatNumber:n++,studentId:null,x:90+i*195,y:150+r*145,width:145,height:cfg.kind==='double'?105:90,rotation:0,visible:true,locked:false,properties:{kind:cfg.kind,konum:col,studentName:'',reserved:false}}));a.push({id:'door_'+Date.now(),type:'vehicle',x:410,y:1160,width:80,height:110,rotation:0,visible:true,locked:true,studentId:null,properties:{kind:'door',label:'Kapı'}});return a}
function sbeSnapshot(){return JSON.stringify({sablon:editor.sablon,planAdi:editor.planAdi,elements:editor.elements,layout:editor.layout})}
function sbePush(){if(!editor?.editable)return;editor.undo.push(sbeSnapshot());if(editor.undo.length>40)editor.undo.shift();editor.redo=[]}
function sbeRestore(snap){const v=JSON.parse(snap);editor.sablon=v.sablon;editor.planAdi=v.planAdi;editor.elements=sbeNormalize(v.elements);editor.layout=v.layout||editor.layout;editor.selection=[];renderBusEditor(service(editor.servisId))}
function sbeUndo(){if(!editor?.undo.length)return;const cur=sbeSnapshot();editor.redo.push(cur);sbeRestore(editor.undo.pop())}
function sbeRedo(){if(!editor?.redo.length)return;const cur=sbeSnapshot();editor.undo.push(cur);sbeRestore(editor.redo.pop())}
function sbeRect(e){return{x:Number(e.x)||0,y:Number(e.y)||0,right:(Number(e.x)||0)+(Number(e.width)||100),bottom:(Number(e.y)||0)+(Number(e.height)||70)}}
function sbeOverlap(a,b){const A=sbeRect(a),B=sbeRect(b);return A.x<B.right&&A.right>B.x&&A.y<B.bottom&&A.bottom>B.y}
function sbeCollision(ids){const moving=editor.elements.filter(e=>ids.includes(e.id));if(moving.some(e=>{const r=sbeRect(e);return r.x<0||r.y<0||r.right>SBE_W||r.bottom>SBE_H}))return true;return moving.some(a=>editor.elements.some(b=>b!==a&&!ids.includes(b.id)&&b.visible!==false&&b.properties?.kind!=='window'&&b.properties?.kind!=='emergency'&&sbeOverlap(a,b)))}
function sbeNumber(){editor.elements.filter(sbeIsSeat).sort((a,b)=>a.y-b.y||a.x-b.x).forEach((e,i)=>e.seatNumber=i+1)}
function sbeLabel(e){const n=seatStudentName(e),k=sbeKind(e);return sbeIsSeat(e)?(n||'BOŞ'):(e.properties?.label||SBE_TYPES[k]?.label||'Nesne')}
function sbeObject(e,i){const k=sbeKind(e),n=seatStudentName(e),sel=editor.selection.includes(e.id),res=e.properties?.reserved&&!n;return '<button type="button" class="sbe-object sbe-'+k+' '+(sbeIsSeat(e)?'sbe-seat ':'')+(n?'is-filled ':'')+(res?'is-reserved ':'')+(sel?'is-selected ':'')+(e.locked?'is-locked':'')+'" data-sbe-id="'+esc(e.id)+'" style="left:'+e.x+'px;top:'+e.y+'px;width:'+e.width+'px;height:'+e.height+'px;transform:rotate('+(Number(e.rotation)||0)+'deg)" aria-label="'+esc(sbeLabel(e))+'"><span class="sbe-icon">'+(SBE_TYPES[k]?.icon||'◼')+'</span>'+(sbeIsSeat(e)?'<b>'+esc(e.seatNumber||i+1)+'</b><strong>'+esc(n||'BOŞ')+'</strong>'+(n?'<small>'+esc(className(arr('veliler').find(v=>String(v.id)===String(e.studentId))?.sinifId))+'</small>':''):'<strong>'+esc(sbeLabel(e))+'</strong>')+'</button>'}
function sbeStudents(term=''){const q=norm(term);return students(editor.servisId).filter(v=>!q||norm([v.ogrenciAdi,v.ogrenciNo,className(v.sinifId)].join(' ')).includes(q)).map(v=>{const seat=editor.elements.find(e=>String(e.studentId)===String(v.id));return '<button type="button" draggable="true" class="sbe-student '+(editor.pendingStudentId===v.id?'is-pending ':'')+'" data-sbe-student="'+esc(v.id)+'"><span class="sbe-avatar">'+esc(String(v.ogrenciAdi||'Ö').trim().slice(0,1).toLocaleUpperCase('tr'))+'</span><span><strong>'+esc(v.ogrenciAdi||'Öğrenci')+'</strong><small>'+esc(className(v.sinifId))+(seat?' · Koltuk '+esc(seat.seatNumber):'')+'</small></span></button>'}).join('')||'<div class="ka-empty">Öğrenci bulunamadı.</div>'}
function sbeAdd(kind){if(!editor?.editable)return;sbePush();const c=SBE_TYPES[kind]||SBE_TYPES.seat;const e={id:kind+'_'+Date.now(),row:null,column:null,type:sbeIsSeatKind(kind)?'koltuk':'vehicle',seatNumber:null,studentId:null,x:120,y:180,width:c.w,height:c.h,rotation:0,visible:true,locked:['door','window','emergency','engine','luggage','driver'].includes(kind),properties:{kind,studentName:'',reserved:false,label:c.label}};if(kind==='driver')e.type='sofor';if(kind==='engine')e.properties.kind='engine';editor.elements.push(e);sbeNumber();editor.selection=[e.id];renderBusEditor(service(editor.servisId))}
function sbeIsSeatKind(k){return ['seat','double','special'].includes(k)}
function sbeAssign(sid,eid){if(!editor?.editable)return;const person=students(editor.servisId).find(v=>String(v.id)===String(sid)),seat=editor.elements.find(e=>e.id===eid);if(!person||!seat||!sbeIsSeat(seat))return;sbePush();editor.elements.forEach(e=>{if(e!==seat&&String(e.studentId)===String(person.id)){e.studentId=null;e.properties={...(e.properties||{}),studentName:''}}});seat.studentId=person.id;seat.properties={...(seat.properties||{}),studentName:person.ogrenciAdi||'',reserved:false};editor.pendingStudentId=null;renderBusEditor(service(editor.servisId))}
function clearBusSeat(e){
  if(!e)return;
  e.studentId=null;
  e.properties={...(e.properties||{}),studentName:'',reserved:false};
}
function sbeClearAll(s){
  if(!editor?.editable)return;
  sbePush();
  editor.elements.filter(sbeIsSeat).forEach(clearBusSeat);
  editor.pendingStudentId=null;
  editor.selection=[];
  renderBusEditor(s);
  toast?.('Koltuklar temizlendi.');
}
function sbeDelete(){if(!editor?.editable||!editor.selection.length)return;const bad=editor.elements.some(e=>editor.selection.includes(e.id)&&seatStudentName(e));if(bad&&!confirm('Seçili koltukta öğrenci var. Silmek istediğinize emin misiniz?'))return;sbePush();editor.elements=editor.elements.filter(e=>!editor.selection.includes(e.id));editor.selection=[];sbeNumber();renderBusEditor(service(editor.servisId))}
function sbeAlign(mode){if(!editor?.editable||editor.selection.length<2)return;sbePush();const a=editor.elements.filter(e=>editor.selection.includes(e.id));if(mode==='left'){const x=Math.min(...a.map(e=>e.x));a.forEach(e=>e.x=x)}if(mode==='top'){const y=Math.min(...a.map(e=>e.y));a.forEach(e=>e.y=y)}if(mode==='h'){a.sort((x,y)=>x.x-y.x);const step=(a.at(-1).x-a[0].x)/(a.length-1);a.forEach((e,i)=>e.x=a[0].x+step*i)}if(mode==='v'){a.sort((x,y)=>x.y-y.y);const step=(a.at(-1).y-a[0].y)/(a.length-1);a.forEach((e,i)=>e.y=a[0].y+step*i)}renderBusEditor(service(editor.servisId))}
function sbeDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function sbeApplyZoom(){const root=document.getElementById('transportBusEditor');if(!root)return;const z=editor.zoom||1,inner=root.querySelector('.sbe-stage-inner'),scale=root.querySelector('.sbe-canvas-scale'),value=root.querySelector('[data-sbe-zoom-value]');if(inner){inner.style.width=(SBE_W*z)+'px';inner.style.height=(SBE_H*z)+'px'}if(scale)scale.style.transform='scale('+z+')';if(value)value.textContent=Math.round(z*100)+'%'}
function sbePointer(ev){
  if(!editor?.editable)return;
  const node=ev.target.closest?.('[data-sbe-id]');
  if(!node)return;
  const id=node.dataset.sbeId;
  const obj=editor.elements.find(e=>e.id===id);
  if(!obj)return;

  if(editor.pendingStudentId&&sbeIsSeat(obj)){
    ev.preventDefault();
    ev.stopPropagation();
    sbeAssign(editor.pendingStudentId,id);
    return;
  }

  if(ev.type!=='pointerdown'||obj.locked)return;

  ev.preventDefault();
  ev.stopPropagation();
  ev.stopImmediatePropagation();

  editor.selection=ev.shiftKey
    ?(editor.selection.includes(id)
      ?editor.selection.filter(x=>x!==id)
      :editor.selection.concat(id))
    :[id];

  const sx=ev.clientX,sy=ev.clientY;
  const orig=editor.elements
    .filter(e=>editor.selection.includes(e.id))
    .map(e=>({id:e.id,x:e.x,y:e.y}));
  const before=sbeSnapshot();
  const pointerId=ev.pointerId;
  let moved=false;
  editor._drag={id,pointerId};

  const move=e=>{
    if(!editor._drag||e.pointerId!==pointerId||editor._pinch)return;
    e.preventDefault();
    e.stopPropagation();

    const z=editor.zoom||1;
    const dx=(e.clientX-sx)/z;
    const dy=(e.clientY-sy)/z;

    if(Math.abs(dx)+Math.abs(dy)<3&&!moved)return;
    moved=true;

    orig.forEach(o=>{
      const x=editor.elements.find(q=>q.id===o.id);
      if(!x)return;
      x.x=Math.max(0,Math.min(SBE_W-x.width,o.x+dx));
      x.y=Math.max(0,Math.min(SBE_H-x.height,o.y+dy));

      const n=document.querySelector('[data-sbe-id="'+CSS.escape(x.id)+'"]');
      if(n){
        n.style.left=x.x+'px';
        n.style.top=x.y+'px';
      }
    });
  };

  const end=e=>{
    if(!editor._drag||e.pointerId!==pointerId)return;
    e.preventDefault();
    e.stopPropagation();

    window.removeEventListener('pointermove',move,true);
    window.removeEventListener('pointerup',end,true);
    window.removeEventListener('pointercancel',end,true);

    editor._drag=null;

    if(moved){
      if(sbeCollision(editor.selection)){
        orig.forEach(o=>{
          const x=editor.elements.find(q=>q.id===o.id);
          if(x){
            x.x=o.x;
            x.y=o.y;
            const n=document.querySelector('[data-sbe-id="'+CSS.escape(x.id)+'"]');
            if(n){
              n.style.left=x.x+'px';
              n.style.top=x.y+'px';
            }
          }
        });
        toast?.('Çakışma: nesne bu konuma bırakılamaz.');
      }else{
        editor.undo.push(before);
        if(editor.undo.length>40)editor.undo.shift();
        editor.redo=[];
      }
    }

    renderSbeSelectionOnly();
  };

  window.addEventListener('pointermove',move,true);
  window.addEventListener('pointerup',end,true);
  window.addEventListener('pointercancel',end,true);
}
function pinchDistance(p){const a=[...p.values()][0],b=[...p.values()][1];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0}
function sbeBindPinch(stage){if(!stage)return;const pts=new Map();let d0=0,z0=1;stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){editor._pinch=true;editor._mobileZoomUser=true;d0=pinchDistance(pts);z0=editor.zoom}},{passive:false});stage.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){e.preventDefault();editor.zoom=Math.max(SBE_MIN,Math.min(SBE_MAX,z0*pinchDistance(pts)/Math.max(1,d0)));const r=document.getElementById('transportBusEditor'),i=r?.querySelector('[data-sbe-stage-inner]'),c=r?.querySelector('.sbe-canvas-scale'),q=r?.querySelector('.sbe-zoom b');if(i){i.style.width=SBE_W*editor.zoom+'px';i.style.height=SBE_H*editor.zoom+'px'}if(c)c.style.transform='scale('+editor.zoom+')';if(q)q.textContent=Math.round(editor.zoom*100)+'%'}},{passive:false});const end=e=>{pts.delete(e.pointerId);if(pts.size<2)editor._pinch=false};stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end)}
function renderSbeSelectionOnly(){const root=document.getElementById('transportBusEditor');root?.querySelectorAll('[data-sbe-id]').forEach(n=>n.classList.toggle('is-selected',editor.selection.includes(n.dataset.sbeId)))}
function sbeBindStudents(ov){ov.querySelectorAll('[data-sbe-student]').forEach(b=>{b.addEventListener('dragstart',e=>e.dataTransfer?.setData('text/plain',b.dataset.sbeStudent));b.addEventListener('pointerdown',()=>{editor.pendingStudentId=b.dataset.sbeStudent;renderSbeSelectionOnly();toast?.('Şimdi bir koltuğa dokunun.')})})}
function sbeSave(s){if(!editor?.editable)return;if(!canEditBusSeats())return;const b=document.querySelector('[data-sbe-save]');sbeNumber();const servisId=editor.servisId,sablon=editor.sablon,elements=structuredClone(editor.elements),planAdi=editor.planAdi,layout=structuredClone(editor.layout);b&&(b.disabled=true,b.textContent='Kaydedildi ✓');const task=window.ServisOturmaService.planElementsKaydet(servisId,sablon,elements,false);Promise.resolve(task).then(()=>window.ServisOturmaService.planGuncelle(servisId,{planAdi,layout,semaVersiyon:3})).then(()=>toast?.('Oturma planı kaydedildi.')).catch(e=>{console.error('[Transport/seating-save]',e);toast?.('Plan kaydedilemedi: '+(e?.message||e))});setTimeout(()=>{closeEditor();try{render()}catch(e){console.error('[Transport/seating-render]',e)}},120)}
function busPrintReport(s){if(!window.ReportEngine?.printReport)return;const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{},seats=editor.elements.filter(sbeIsSeat),body='<div class="sbe-print"><h1>'+esc(school.okulAdi||'KORUK İLK-ORTAOKULU')+'</h1><h2>SERVİS OTURMA PLANI</h2><p><b>Servis:</b> '+esc(serviceName(s))+' &nbsp; <b>Plaka:</b> '+esc(s.plaka||'—')+' &nbsp; <b>Şoför:</b> '+esc(s.soforAdi||'—')+'</p><p><b>Toplam:</b> '+seats.length+' &nbsp; <b>Öğrenci:</b> '+seats.filter(e=>seatStudentName(e)).length+' &nbsp; <b>Boş:</b> '+seats.filter(e=>!seatStudentName(e)&&!e.properties?.reserved).length+'</p><div class="sbe-print-vehicle">'+seats.map(e=>'<div class="sbe-print-seat" style="left:'+(e.x/SBE_W*100)+'%;top:'+(e.y/SBE_H*100)+'%;width:'+(e.width/SBE_W*100)+'%;height:'+(e.height/SBE_H*100)+'%"><b>'+esc(e.seatNumber||'')+'</b><span>'+esc(seatStudentName(e)||'BOŞ')+'</span></div>').join('')+'</div></div>';const extra='<style>.sbe-print{font-family:Arial,sans-serif}.sbe-print h1,.sbe-print h2{text-align:center}.sbe-print-vehicle{position:relative;width:110mm;height:190mm;margin:8mm auto;border:2px solid #50605a;border-radius:14mm;background:#eef2f0}.sbe-print-seat{position:absolute;box-sizing:border-box;border:1px solid #17684f;border-radius:3mm;background:#fff;padding:2mm;font-size:7pt;text-align:center;overflow:hidden}.sbe-print-seat b,.sbe-print-seat span{display:block}</style>';return window.ReportEngine.printReport(serviceName(s)+' Oturma Planı',body,{yon:'dikey',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:7,fileName:serviceName(s)+'_Oturma_Plani',extraHead:extra})}
function sbeRepairOverlappedSeats(){
  const seats=editor?.elements?.filter(sbeIsSeat);
  if(!seats||seats.length<2)return;
  let pairs=0,overlaps=0;
  for(let i=0;i<seats.length;i++)for(let j=i+1;j<seats.length;j++){pairs++;if(sbeOverlap(seats[i],seats[j]))overlaps++}
  if(overlaps<Math.max(2,Math.floor(pairs*.35)))return;
  const key=editor.sablon||'minibus',cfg={minibus:{cols:3,stepX:195,stepY:145,startX:90,startY:150},'2x2':{cols:4,stepX:180,stepY:145,startX:35,startY:150},'1x2':{cols:3,stepX:195,stepY:145,startX:90,startY:150}}[key]||{cols:3,stepX:195,stepY:145,startX:90,startY:150};
  seats.sort((a,b)=>(Number(a.seatNumber)||0)-(Number(b.seatNumber)||0)).forEach((e,i)=>{
    const col=i%cfg.cols,row=Math.floor(i/cfg.cols);
    e.x=Math.max(15,Math.min(SBE_W-e.width-15,cfg.startX+col*cfg.stepX));
    e.y=Math.max(100,Math.min(SBE_H-e.height-15,cfg.startY+row*cfg.stepY));
  });
}

function sbeTableConfig(){
  const defaults={minibus:[6,3], '2x2':[5,4], '1x2':[6,3], empty:[4,3], custom:[6,3]};
  const d=defaults[editor.sablon]||defaults.minibus;
  const old=editor.layout?.table||{};
  const rows=Math.max(1,Number(old.rows)||d[0]),cols=Math.max(1,Number(old.cols)||d[1]);
  const isCurrent=Number(old.editorVersion)===2;
  const viewport=Math.max(280,(window.innerWidth||360)-32);
  const defaultCol=Math.max(82,Math.floor(Math.min(520,viewport)/cols));
  const rowHeights=Array.from({length:rows},(_,i)=>isCurrent?Math.max(52,Number(old.rowHeights?.[i])||82):82);
  const colWidths=Array.from({length:cols},(_,i)=>isCurrent?Math.max(70,Number(old.colWidths?.[i])||defaultCol):defaultCol);
  const manualRows=Array.from({length:rows},(_,i)=>!!old.manualRows?.[i]);
  const manualCols=Array.from({length:cols},(_,i)=>!!old.manualCols?.[i]);
  editor.layout={...(editor.layout||{}),width:0,height:0,table:{editorVersion:2,rows,cols,rowHeights,colWidths,manualRows,manualCols}};
  const seats=editor.elements.filter(sbeIsSeat);
  seats.forEach((e,i)=>{
    let r=Number(e.row),c=Number(e.column);
    if(!Number.isInteger(r)||r<1||r>rows||!Number.isInteger(c)||c<1||c>cols){
      r=Math.floor(i/cols)+1;c=(i%cols)+1;
      e.row=r;e.column=c;
    }
  });
  return editor.layout.table;
}
function sbeTableNumber(){
  const t=sbeTableConfig();
  editor.elements.filter(sbeIsSeat).forEach(e=>{
    const r=Math.max(1,Number(e.row)||1),c=Math.max(1,Number(e.column)||1);
    e.row=r;e.column=c;e.seatNumber=(r-1)*t.cols+c;
  });
}
function sbeTableCell(r,c){
  return editor.elements.find(e=>Number(e.row)===r&&Number(e.column)===c&&e.visible!==false)||null;
}
function sbeTableSeat(r,c,kind='seat'){
  let e=sbeTableCell(r,c);
  if(e)return e;
  const cfg=SBE_TYPES[kind]||SBE_TYPES.seat;
  const seatKind=sbeIsSeatKind(kind);
  e={id:(seatKind?'seat_':'cell_')+Date.now()+'_'+Math.random().toString(36).slice(2,7),row:r,column:c,type:kind==='driver'?'sofor':(seatKind?'koltuk':'vehicle'),seatNumber:null,studentId:null,x:0,y:0,width:cfg.w,height:cfg.h,rotation:0,visible:true,locked:['door','window','emergency','engine','luggage','driver'].includes(kind),properties:{kind,studentName:'',reserved:false,label:cfg.label}};
  editor.elements.push(e);sbeNumber();return e;
}
function sbeTableRemoveCell(r,c){
  const e=sbeTableCell(r,c);
  if(!e)return;
  if(seatStudentName(e)&&!confirm('Bu hücrede öğrenci var. Silmek istediğinize emin misiniz?'))return;
  sbePush();
  editor.elements=editor.elements.filter(x=>x!==e);
  editor.selection=[];
  sbeTableRender();
}
function sbeTableRender(){
  const root=document.getElementById('transportBusEditor'),host=root?.querySelector('[data-sbe-table]');
  if(!host)return;
  const t=sbeTableConfig(),cols=t.colWidths.map(v=>v+'px').join(' '),rows=t.rowHeights.map(v=>v+'px').join(' ');
  host.style.setProperty('--sbe-cols',cols);host.style.setProperty('--sbe-rows',rows);
  const total=editor.elements.filter(sbeIsSeat).length;
  const cells=[];
  for(let r=1;r<=t.rows;r++)for(let c=1;c<=t.cols;c++){
    const e=sbeTableCell(r,c),n=e?seatStudentName(e):'',sel=e&&editor.selection.includes(e.id),kind=e?sbeKind(e):'empty';
    const icon=SBE_TYPES[kind]?.icon||'';
    const label=e
      ? (n || (sbeIsSeatKind(kind) ? 'BOŞ' : (SBE_TYPES[kind]?.label || '')))
      : '';
    cells.push('<button type="button" aria-label="'+esc(e?(n||SBE_TYPES[kind]?.label||'Hücre'):'Boş hücre')+'" class="sbe-tcell '+(e?'has-object ':'')+(n?'filled ':'')+(sel?'selected ':'')+'sbe-tcell-'+kind+'" data-sbe-cell="'+r+','+c+'">'+
      ''+
      (e?'<span class="sbe-tcell-number">'+(e?.seatNumber||'')+'</span><span class="sbe-tcell-icon">'+icon+'</span><strong>'+esc(label)+'</strong>'+
        (n?'<small>'+esc(className(arr('veliler').find(v=>String(v.id)===String(e.studentId))?.sinifId))+'</small>':''):'')+
      '<span class="sbe-col-resize" data-sbe-col-resize="'+c+'"></span><span class="sbe-row-resize" data-sbe-row-resize="'+r+'"></span>'+
      '</button>');
  }
  host.innerHTML=cells.join('');
  root.querySelector('[data-sbe-table-info]')?.replaceChildren(document.createTextNode(t.rows+' satır · '+t.cols+' sütun · '+total+' koltuk'));
}
function sbeTableSetCell(r,c,kind){
  if(!editor?.editable)return false;
  const existing=sbeTableCell(r,c);
  if(existing){
    sbePush();
    existing.properties={...(existing.properties||{}),kind,label:SBE_TYPES[kind]?.label||existing.properties?.label||''};
    existing.type=kind==='driver'?'sofor':(sbeIsSeatKind(kind)?'koltuk':'vehicle');
    existing.locked=['door','window','emergency','engine','luggage','driver'].includes(kind);
    if(!sbeIsSeatKind(kind)){
      existing.studentId=null;
      existing.properties.studentName='';
      existing.properties.reserved=false;
    }
  }else{
    sbePush();
    const created=sbeTableSeat(r,c,kind);
    created.type=kind==='driver'?'sofor':(sbeIsSeatKind(kind)?'koltuk':'vehicle');
    created.locked=['door','window','emergency','engine','luggage','driver'].includes(kind);
  }
  sbeNumber();sbeTableRender();
  return true;
}
function sbeTableSelectTool(kind){
  if(!editor?.editable)return;
  editor.pendingCellKind=kind;
  editor.pendingStudentId=null;
  const root=document.getElementById('transportBusEditor');
  root?.querySelectorAll('[data-sbe-add-type]').forEach(b=>b.classList.toggle('is-active',b.dataset.sbeAddType===kind));
  toast?.((SBE_TYPES[kind]?.label||'Hücre')+' seçildi. Şimdi tabloda bir hücreye dokunun.');
}
function sbeTableAddRow(){
  if(!editor?.editable)return;sbePush();
  const t=sbeTableConfig();t.rows++;t.rowHeights.push(82);t.manualRows.push(false);sbeTableRender();
}
function sbeTableDeleteRow(){
  if(!editor?.editable)return;const t=sbeTableConfig();if(t.rows<=1)return;
  const r=t.rows;
  if(editor.elements.some(e=>Number(e.row)===r&&sbeIsSeat(e)&&seatStudentName(e))&&!confirm('Son satırda öğrenciler var. Satır silinsin mi?'))return;
  sbePush();editor.elements=editor.elements.filter(e=>Number(e.row)!==r);t.rows--;t.rowHeights.pop();t.manualRows.pop();editor.selection=[];sbeTableRender();
}
function sbeTableAddCol(){
  if(!editor?.editable)return;sbePush();
  const t=sbeTableConfig();t.cols++;t.colWidths.push(Math.max(82,Math.floor(Math.min(520,Math.max(280,(window.innerWidth||360)-32))/t.cols)));t.manualCols.push(false);sbeTableRender();
}
function sbeTableDeleteCol(){
  if(!editor?.editable)return;const t=sbeTableConfig();if(t.cols<=1)return;
  const c=t.cols;
  if(editor.elements.some(e=>Number(e.column)===c&&sbeIsSeat(e)&&seatStudentName(e))&&!confirm('Son sütunda öğrenciler var. Sütun silinsin mi?'))return;
  sbePush();editor.elements=editor.elements.filter(e=>Number(e.column)!==c);t.cols--;t.colWidths.pop();t.manualCols.pop();editor.selection=[];sbeTableRender();
}
function sbeTableResizeStart(ev,type,index){
  if(!editor?.editable)return;
  ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
  const t0=sbeTableConfig();
  const start=type==='col'?ev.clientX:ev.clientY;
  const startSize=(type==='col'?t0.colWidths:t0.rowHeights)[index-1];
  const before=sbeSnapshot();let moved=false;
  const pointerId=ev.pointerId;
  try{ev.target.setPointerCapture?.(pointerId)}catch(_){}
  const move=e=>{
    if(e.pointerId!==pointerId)return;
    e.preventDefault();e.stopPropagation();
    const delta=(type==='col'?e.clientX:e.clientY)-start;
    const next=Math.max(type==='col'?44:52,startSize+delta);
    if(Math.abs(next-startSize)>1)moved=true;
    const t=sbeTableConfig();
    if(type==='col'){
      t.colWidths[index-1]=next;
      t.manualCols[index-1]=true;
    }else{
      t.rowHeights[index-1]=next;
      t.manualRows[index-1]=true;
    }
    const host=document.querySelector('#transportBusEditor [data-sbe-table]');
    if(host){
      host.style.setProperty('--sbe-cols',t.colWidths.map(v=>Math.round(v)+'px').join(' '));
      host.style.setProperty('--sbe-rows',t.rowHeights.map(v=>Math.round(v)+'px').join(' '));
    }
  };
  const end=e=>{
    if(e.pointerId!==pointerId)return;
    e.preventDefault();
    try{ev.target.releasePointerCapture?.(pointerId)}catch(_){}
    window.removeEventListener('pointermove',move,true);
    window.removeEventListener('pointerup',end,true);
    window.removeEventListener('pointercancel',end,true);
    if(moved){editor.undo.push(before);if(editor.undo.length>40)editor.undo.shift();editor.redo=[]}
  };
  window.addEventListener('pointermove',move,true);
  window.addEventListener('pointerup',end,true);
  window.addEventListener('pointercancel',end,true);
}
function sbeTableAssignStudentToCell(r,c){
  const sid=editor.pendingStudentId;if(!sid)return false;
  const seat=sbeTableSeat(r,c,'seat');sbeAssign(sid,seat.id);return true;
}
function sbeTableCellClick(r,c){
  if(!editor?.editable)return;
  if(editor.pendingCellKind){
    const kind=editor.pendingCellKind;
    if(sbeTableSetCell(r,c,kind)){
      editor.pendingCellKind=null;
      editor.selection=[];
    }
    const root=document.getElementById('transportBusEditor');
    root?.querySelectorAll('[data-sbe-add-type]').forEach(b=>b.classList.remove('is-active'));
    return;
  }
  if(sbeTableAssignStudentToCell(r,c))return;
  const e=sbeTableCell(r,c);
  if(e){
    editor.selection=[e.id];
    sbeTableRender();
  }
  // Araç seçilmeden boş hücreye dokunmak yalnızca seçimdir; otomatik koltuk oluşturulmaz.

}
function sbeTableBind(root,s){
  root.querySelector('[data-sbe-table-add-row]')?.addEventListener('click',sbeTableAddRow);
  root.querySelector('[data-sbe-table-del-row]')?.addEventListener('click',sbeTableDeleteRow);
  root.querySelector('[data-sbe-table-add-col]')?.addEventListener('click',sbeTableAddCol);
  root.querySelector('[data-sbe-table-del-col]')?.addEventListener('click',sbeTableDeleteCol);
  root.querySelector('[data-sbe-table]')?.addEventListener('pointerdown',e=>{
    const col=e.target.closest('[data-sbe-col-resize]'),row=e.target.closest('[data-sbe-row-resize]');
    if(col){sbeTableResizeStart(e,'col',Number(col.dataset.sbeColResize));return}
    if(row){sbeTableResizeStart(e,'row',Number(row.dataset.sbeRowResize));return}
    const cell=e.target.closest('[data-sbe-cell]');
    if(cell){e.preventDefault();e.stopPropagation();const [r,c]=cell.dataset.sbeCell.split(',').map(Number);sbeTableCellClick(r,c)}
  },{passive:false});
  sbeBindStudents(root);
}
function sbeRenderTableEditor(s){
  const old=document.getElementById('transportBusEditor');const oldScroll=old?.scrollTop||0;
  document.getElementById('transportBusEditor')?.remove();
  sbeTableConfig();sbeTableNumber();
  const st=window.soElementIstatistik?.(editor.elements)||{toplam:0,dolu:0,bos:0,rezerve:0};
  const templates=[['minibus','Minibüs · 2+1'],['2x2','Servis · 2+2'],['1x2','Servis · 1+2'],['empty','Boş plan'],['custom','Özel düzen']];
  const options=templates.map(x=>'<option value="'+x[0]+'" '+(editor.sablon===x[0]?'selected':'')+'>'+x[1]+'</option>').join('');
  const ov=document.createElement('div');ov.id='transportBusEditor';ov.className='ka-modal-backdrop sbe-backdrop';
  ov.innerHTML='<section class="ka-modal sbe-modal sbe-table-editor">'+
    '<header class="sbe-header"><div><strong>🚌 '+esc(serviceName(s))+'</strong><small>'+esc(s.plaka||'—')+' · '+esc(s.soforAdi||'Şoför')+'</small></div><button class="ka-icon-button" type="button" data-bus-close>×</button></header>'+
    '<div class="sbe-top"><label><span>Plan adı</span><input data-sbe-plan-name value="'+esc(editor.planAdi||'Servis Oturma Planı')+'"></label><label><span>Araç tipi</span><select data-sbe-template>'+options+'</select></label><div class="sbe-stat"><b>'+st.dolu+'/'+st.toplam+'</b><small>'+st.bos+' boş · '+st.rezerve+' rezerve</small></div><div class="sbe-actions"><button class="ka-btn" type="button" data-sbe-save>💾 Kaydet</button><button class="ka-btn ka-btn--secondary" type="button" data-sbe-print>🖨 Yazdır</button><button class="ka-btn ka-btn--secondary" type="button" data-sbe-pdf>📄 PDF</button></div></div>'+
    '<div class="sbe-table-toolbar"><span>Tablo düzeni</span><button type="button" data-sbe-table-add-row>＋ Satır</button><button type="button" data-sbe-table-del-row>− Satır</button><button type="button" data-sbe-table-add-col>＋ Sütun</button><button type="button" data-sbe-table-del-col>− Sütun</button><button type="button" data-sbe-undo>↶</button><button type="button" data-sbe-redo>↷</button><button type="button" data-bus-clear-all>🧹 Temizle</button><button type="button" data-sbe-delete>🗑 Sil</button><button type="button" data-bus-report>🖨 Rapor</button><span data-sbe-table-info></span></div>'+
    '<div class="sbe-table-tools"><button type="button" data-sbe-cell-kind="seat" data-sbe-add-type="seat">＋ Koltuk</button><button type="button" data-sbe-cell-kind="double" data-sbe-add-type="double">👥 İkili</button><button type="button" data-sbe-cell-kind="door" data-sbe-add-type="door">🚪 Kapı</button><button type="button" data-sbe-cell-kind="window" data-sbe-add-type="window">🪟 Cam</button><button type="button" data-sbe-cell-kind="emergency" data-sbe-add-type="emergency">⛔ Acil</button><button type="button" data-sbe-cell-kind="luggage" data-sbe-add-type="luggage">🧳 Bagaj</button><button type="button" data-sbe-cell-kind="engine" data-sbe-add-type="engine">🔧 Motor</button><button type="button" data-sbe-cell-kind="driver" data-sbe-add-type="driver">🧑‍✈️ Şoför</button><button type="button" data-sbe-cell-kind="empty" data-sbe-add-type="empty">⬜ Boş alan</button></div>'+
    '<div class="sbe-table-scroll"><div class="sbe-table" data-sbe-table></div></div>'+
    '<div class="sbe-student-panel"><div class="sbe-panel-title"><b>ÖĞRENCİLER</b><small>Öğrenciyi seçin, sonra tablodaki hücreye dokunun.</small></div><input class="sbe-search" data-sbe-student-search placeholder="🔍 Öğrenci ara…"><div class="sbe-student-list" data-sbe-students>'+sbeStudents()+'</div></div>'+
    '<footer class="sbe-footer"><span>↔ Sütun sınırını · ↕ Satır sınırını sürükleyerek boyutu değiştirin.</span><button class="ka-btn ka-btn--secondary" type="button" data-bus-close>'+ (editor.editable?'Vazgeç':'Kapat') +'</button></footer></section>';
  document.body.appendChild(ov);
  sbeBind(ov,s);sbeTableBind(ov,s);sbeTableRender();
  ov.querySelector('[data-bus-clear-all]')?.addEventListener('click',()=>sbeClearAll(s));
  requestAnimationFrame(()=>{const fresh=document.getElementById('transportBusEditor');if(fresh)fresh.scrollTop=oldScroll});
}
function renderBusEditor(s){return sbeRenderTableEditor(s)}
function sbeBind(ov,s){const canvas=ov.querySelector('[data-sbe-canvas]');ov.querySelector('[data-sbe-save]')?.addEventListener('click',()=>sbeSave(s));ov.querySelector('[data-sbe-print]')?.addEventListener('click',()=>busPrintReport(s));ov.querySelector('[data-sbe-pdf]')?.addEventListener('click',()=>busPrintReport(s));ov.querySelector('[data-bus-report]')?.addEventListener('click',()=>busPrintReport(s));ov.querySelectorAll('[data-bus-close]').forEach(b=>b.addEventListener('click',closeEditor));ov.querySelector('[data-sbe-undo]')?.addEventListener('click',sbeUndo);ov.querySelector('[data-sbe-redo]')?.addEventListener('click',sbeRedo);ov.querySelector('[data-sbe-delete]')?.addEventListener('click',sbeDelete);ov.querySelector('[data-bus-clear-all]')?.addEventListener('click',()=>sbeClearAll(s));ov.querySelectorAll('[data-sbe-align]').forEach(b=>b.addEventListener('click',()=>sbeAlign(b.dataset.sbeAlign)));ov.querySelectorAll('[data-sbe-add-type]').forEach(b=>b.addEventListener('click',e=>{
  e.preventDefault();
  e.stopPropagation();
  const kind=b.dataset.sbeAddType;
  if(ov.querySelector('[data-sbe-table]')) sbeTableSelectTool(kind);
  else sbeAdd(kind);
}));ov.querySelector('[data-sbe-zoom-out]')?.addEventListener('click',()=>{editor._mobileZoomUser=true;editor.zoom=Math.max(SBE_MIN,editor.zoom-.1);renderBusEditor(s)});ov.querySelector('[data-sbe-zoom-in]')?.addEventListener('click',()=>{editor._mobileZoomUser=true;editor.zoom=Math.min(SBE_MAX,editor.zoom+.1);renderBusEditor(s)});ov.querySelector('[data-sbe-zoom-reset]')?.addEventListener('click',()=>{editor._mobileZoomUser=false;editor.zoom=1;renderBusEditor(s)});ov.querySelector('[data-sbe-plan-name]')?.addEventListener('input',e=>editor.planAdi=e.target.value);ov.querySelector('[data-sbe-template]')?.addEventListener('change',e=>{const next=e.target.value;if(next==='custom'){editor.sablon='custom';return}if(!confirm('Şablon uygulanınca mevcut düzen başlangıç düzenine dönecek. Devam edilsin mi?')){e.target.value=editor.sablon;return}sbePush();editor.sablon=next;editor.elements=sbeNormalize(sbeSeed(next));sbeNumber();renderBusEditor(s)});const search=ov.querySelector('[data-sbe-student-search]');search?.addEventListener('input',()=>{ov.querySelector('[data-sbe-students]').innerHTML=sbeStudents(search.value);sbeBindStudents(ov)});sbeBindStudents(ov);sbeBindPinch(ov.querySelector('[data-sbe-stage]'));if(canvas){canvas.addEventListener('pointerdown',sbePointer,true);canvas.addEventListener('pointermove',sbePointer,true);canvas.addEventListener('pointerup',sbePointer,true);canvas.addEventListener('pointercancel',sbePointer,true);canvas.addEventListener('dragover',e=>e.preventDefault());canvas.addEventListener('drop',e=>{e.preventDefault();const sid=e.dataTransfer?.getData('text/plain'),obj=e.target.closest?.('[data-sbe-id]');if(sid&&obj)sbeAssign(sid,obj.dataset.sbeId)})}}
function openBusEditor(servisIdValue){const id=String(servisIdValue??'');if(!id)return false;if(editor&&String(editor.servisId)===id&&document.getElementById('transportBusEditor'))return true;const s=arr('servisler').find(x=>String(x?.id??'')===id);if(!s){console.warn('[Transport/seating] servis bulunamadı:',id);return false}const p=currentPlan(s.id)||{},servisId=s.id,sablon=sablonValue(p.sablon||'minibus'),elements=sbeNormalize(window.soPlanElementleriGetir?.(p,p.sablon||'ducato')||[]);editor={servisId,sablon,elements,editable:canEditBusSeats()};editor.planAdi=p.planAdi||p.ad||'Servis Oturma Planı';editor.selection=[];editor.pendingStudentId=null;editor.pendingCellKind=null;editor.zoom=1;editor._mobileZoomUser=false;editor.layout={...(editor.layout||{}),width:0,height:0};editor.undo=[];editor.redo=[];editor.layoutEditing=false;busPullRefresh(false);renderBusEditor(s);return true}
function closeEditor(){const ov=document.getElementById('transportBusEditor');if(ov)ov.remove();editor=null;busPullRefresh(true);try{document.body.classList.remove('modal-open')}catch(_){}}
function busPullRefresh(on){try{const r=window.KorukPlatformAdapter?.setPullToRefreshEnabled?.(!!on);if(r&&typeof r.catch==='function')r.catch(()=>{})}catch(_){} }
async function openClassSeating(id){try{if(!window.SinifOturma?.ac)await window.AppLoader?.loadScript?.('js/modules/class-seating.js');if(!window.SinifOturma?.ac)throw new Error('Sınıf oturma motoru yüklenemedi.');return await window.SinifOturma.ac(id)}catch(e){console.error('[Transport/class-seating]',e);toast?.('Sınıf oturma planı açılamadı.');return false}}
function back(){if(document.getElementById('transportBusEditor')){closeEditor();return true}if(document.querySelector('[data-class-seating-overlay]')){window.SinifOturma?.kapat?.();return true}if(serviceDetailId)return closeServiceDetail();return false}
async function denetimAc(id){try{requirePermission('transport.report.inspection','preview');await window.TransportReports?.denetim?.(id)}catch(e){if(e?.code==='permission-denied')toast?.('Denetim Formu rolünüz için gizli.');else toast?.('Denetim formu hazırlanamadı: '+(e?.message||e))}}
function takipAc(id){try{requirePermission('transport.report.monthly','preview');window.TransportReports?.takipSec?.(id)}catch(e){if(e?.code==='permission-denied')toast?.('Aylık Takip rolünüz için gizli.');else toast?.('Takip çizelgesi açılamadı: '+(e?.message||e))}}
function bindServiceDetail(out){if(!serviceDetailId)return;out.querySelector('[data-transport-detail-close]')?.addEventListener('click',closeServiceDetail);out.querySelector('[data-transport-detail-delete]')?.addEventListener('click',()=>deleteService(serviceDetailId));out.querySelectorAll('[data-service-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();const s=service(b.dataset.serviceEdit);if(s)openServiceModal(s)});out.querySelector('[data-transport-add-student]')?.addEventListener('click',()=>openAddStudents(serviceDetailId));out.querySelector('[data-transport-presidents]')?.addEventListener('click',()=>openPresidents(serviceDetailId));out.querySelector('[data-transport-excel]')?.addEventListener('click',()=>openExcel(serviceDetailId));out.querySelectorAll('[data-transport-list]').forEach(b=>b.addEventListener('click',()=>openListBuilder(serviceDetailId)));out.querySelectorAll('[data-transport-remove-student]').forEach(b=>b.addEventListener('click',()=>removeStudent(serviceDetailId,b.dataset.transportRemoveStudent)));out.querySelectorAll('[data-transport-detail-report]').forEach(b=>b.addEventListener('click',()=>b.dataset.transportDetailReport==='inspection'?denetimAc(serviceDetailId):takipAc(serviceDetailId)))}
function foodInspectors(){const ts=arr('ogretmenler').filter(x=>x?.id).slice().sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{};const mudur=school.mudurId?ts.find(x=>x.id===school.mudurId):null;const yard=ts.find(x=>/müdür yardımc|mudur yardimc/i.test(String(x.unvan||x.gorev||x.gorevi||'')));return{ts,mudur:mudur?.id||'',yard:yard?.id||''}}
const FOOD_CHECKS=['Yemekler paslanmaz çelik-krom ve ısı yalıtımlı kaplarda taze ve sıcak bir şekilde okula getirildi mi? (Teknik Şartname)','Yemekler, yemek saatinden önce okulda hazır oldu mu? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemekler “Aylık Yemek Listesine” uygun olarak getirildi mi? (Teknik Şartname)','Yemeklerin miktarı ve bozuk olup olmadığı durumu “Muayene Kabul Komisyonu” tarafından teslim alınırken ve öğrencilere servis yapılmadan önce kontrol edildi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Getirilen yemekler imza karşılığı sevk irsaliyesi veya tutanakla okula teslim edildi mi? (Teknik Şartname)','Ambalajlı gıdaların kullanım tarihleri uygun mu? (Teknik Şartname)','Gelen yemeklerden ilgili mevzuatta belirtilen süreye uygun olarak günlük numune alındı mı? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemekler öğrencilere zamanında ve sıcak bir şekilde servis edildi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 13/3-d, 13/4-d, 20/3, Teknik Şartname)','Yemekler, sıhhi ve disposable (tek kullanımlık) malzemelerden oluşan setlerle servis edildi mi? (Teknik Şartname)','Yemekte görevli personel dağıtım esnasında takılması gereken ekipmanları kullanarak yemek servisini gerçekleştirdi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 13/4-e, Teknik Şartname)','Yemekte görevli personel yemek dağıtımı yaparken hijyen şartlarına uygun bir şekilde hareket etti mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemek sonrası; yemek yenilen bölümün temizliği yapıldı mı? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)'];
let foodState={date:new Date().toISOString().slice(0,10),count:String(arr('veliler').length||0),answers:Array(12).fill(''),notes:Array(12).fill(''),inspectors:['','']};
function foodSchool(){const x=arr('okulBilgileri').find(r=>r.id==='ayarlar')||arr('okulBilgileri')[0]||global.okulBilgileriAyari||{};return{il:x.il||x.ili||x.sehir||x.ilAdi||'',ilce:x.ilce||x.ilceAdi||x.mudurluk||'',okulAdi:x.okulAdi||x.ad||'KORUK İLK-ORTAOKULU'}}
function foodInspectorName(id){const x=arr('ogretmenler').find(t=>String(t.id)===String(id));return x?`${x.ad||''} ${x.soyad||''}`.replace(/\\s+/g,' ').trim():''}
function foodRows(){return FOOD_CHECKS.map((q,i)=>`<tr><td class="food-q" style="width:60%!important">${i+1}. ${esc(q)}</td><td class="food-blank" style="width:10%!important"></td><td class="food-blank" style="width:10%!important"></td><td class="food-note-cell" style="width:20%!important"></td></tr>`).join('')}
function foodPrintBody(){const sc=foodSchool(),dt=foodState.date?new Date(foodState.date+'T00:00:00').toLocaleDateString('tr-TR'):'',ins=foodInspectors(),teacher=foodInspectorName(foodState.teacher||'');return`<div class="food-form-page"><style>@page{size:A4 portrait;margin:0}.food-form-page{font-family:Arial,sans-serif;color:#111;font-size:8pt;line-height:1.08;width:100%;min-height:277mm;box-sizing:border-box;padding:5mm 6mm}.food-form-head{border:1px solid #111;text-align:center;padding:2.8mm 2mm 2.4mm;line-height:1.08}.food-form-head div{font-weight:700;font-size:8.5pt}.food-form-head strong{display:block;font-size:10pt;margin-top:1.2mm}.food-form-head b{display:block;font-size:7.4pt;margin-top:.8mm}.food-meta{display:grid;grid-template-columns:1fr 1fr;border-left:1px solid #111;border-right:1px solid #111;border-bottom:1px solid #111}.food-meta>div{display:grid;grid-template-columns:52% 48%;min-height:11mm}.food-meta>div+div{border-left:1px solid #111}.food-meta b{padding:2mm;border-right:1px solid #111;font-size:7.3pt;display:flex;align-items:center}.food-meta span{padding:2mm;font-size:7.6pt;display:flex;align-items:center}.food-note{margin:2.5mm 0 2mm;text-align:center;font-size:7pt;line-height:1.15}.food-table{width:100%;border-collapse:collapse;table-layout:fixed}.food-table col:nth-child(1){width:60%!important}.food-table col:nth-child(2),.food-table col:nth-child(3){width:10%!important}.food-table col:nth-child(4){width:20%!important}.food-table th,.food-table td{border:1px solid #111}.food-table th{background:#fff;text-align:center;padding:2mm .8mm;font-family:Arial,sans-serif;font-size:7.6pt;font-weight:700;line-height:1.08;height:10mm}.food-table td{padding:1.4mm 1.2mm;vertical-align:middle}.food-table .food-q{width:60%!important;font-size:7pt;line-height:1.12}.food-table .food-blank{width:10%!important;height:12mm}.food-table .food-note-cell{width:20%!important;height:12mm}.food-table th:nth-child(1){width:60%}.food-table th:nth-child(2),.food-table th:nth-child(3){width:10%}.food-table th:nth-child(4){width:20%}.food-sign-date{text-align:center;margin:5mm 0 3mm;font-size:7.6pt}.food-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;text-align:center;direction:ltr}.food-signatures>div{min-height:30mm;display:flex;flex-direction:column;justify-content:flex-end}.food-signatures strong{display:block;min-height:6mm;font-size:7.6pt}.food-signatures span{display:block;font-size:7.3pt;margin-top:1.2mm}.food-signatures small{display:block;font-size:7.1pt;margin-top:.4mm}</style><header class="food-form-head"><div>${esc(sc.il).toLocaleUpperCase('tr-TR')} İLİ &nbsp;&nbsp;&nbsp; ${esc(sc.ilce).toLocaleUpperCase('tr-TR')} İLÇESİ &nbsp;&nbsp;&nbsp; ${esc(sc.okulAdi).toLocaleUpperCase('tr-TR')}</div><strong>ÜCRETSİZ ÖĞLE YEMEĞİ DENETİM VE KONTROL FORMU</strong><b>(TAŞIMA MERKEZ OKUL/KURUM MÜDÜRLÜĞÜNCE KULLANILACAK)</b></header><div class="food-meta"><div><b>YEMEK SUNULAN ÖĞRENCİ SAYISI</b><span>${esc(foodState.count)}</span></div><div><b>DENETİM VE KONTROL TARİHİ</b><span>${esc(dt)}</span></div></div><p class="food-note"><b>Not:</b> Çizelgede yer alan denetim ve kontrol maddeleri ile ilgili “Evet / Hayır” bölümü işaretlendikten sonra belirtilen maddelerle ilgili olarak gerek duyulması halinde çizelgede yer alan “AÇIKLAMALAR” bölümü kullanılacaktır.</p><table class="food-table"><colgroup><col style="width:60%"><col style="width:10%"><col style="width:10%"><col style="width:20%"></colgroup><thead><tr><th style="width:60%!important">KONULAR</th><th style="width:10%!important">EVET</th><th style="width:10%!important">HAYIR</th><th style="width:20%!important">AÇIKLAMALAR</th></tr></thead><tbody>${foodRows()}</tbody></table><div class="food-sign-date">${esc(dt)}</div><div class="food-signatures"><div><strong>${esc(teacher)}</strong><span>Denetleyen</span><small>Öğretmen</small></div><div><strong>${esc(foodInspectorName(ins.yard))}</strong><span>Denetleyen</span><small>Müdür Yardımcısı</small></div><div><strong>${esc(foodInspectorName(ins.mudur))}</strong><span>Denetleyen</span><small>Okul Müdürü</small></div></div></div>`}
const FOOD_MENU_KEY='koruk_yemek_menusu_v1',FOOD_DATA_TYPE='yemekMenuleri';let foodMenuCurrentMonth=foodMenuMonthKey(new Date().toISOString().slice(0,10)),foodMenuCache={};
function foodMenuLoad(){const rows=global.DeviceData?.list?.(FOOD_DATA_TYPE)||[];if(rows.length){const out={};rows.forEach(r=>{if(r?.id)out[r.id]=r.menu||{}});foodMenuCache=out;return out}return foodMenuCache}
function foodMenuSave(x){foodMenuCache=x;const rows=Object.entries(x||{}).map(([id,menu])=>({id,menu}));if(global.DeviceData?.persist)global.DeviceData.persist(FOOD_DATA_TYPE,rows).catch(()=>{})}
function foodMenuMonthKey(date){const d=new Date(date+'T00:00:00');return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function foodMenuData(key){const all=foodMenuLoad();all[key]??={};for(let i=1;i<=31;i++)all[key][i]??={corba:'',ana:'',yardimci:'',tatli:''};foodMenuSave(all);return all[key]}
function foodMenuMonthOptions(selected){const now=new Date(),out=[];for(let n=-2;n<=10;n++){const d=new Date(now.getFullYear(),now.getMonth()+n,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');out.push(`<option value="${k}" ${k===selected?'selected':''}>${d.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</option>`)}return out.join('')}
function foodMenuDayName(k,day){const d=new Date(k+'-'+String(day).padStart(2,'0')+'T00:00:00');return d.toLocaleDateString('tr-TR',{weekday:'long'})}
function foodMenuDate(k,day){return k+'-'+String(day).padStart(2,'0')}
function foodMenuFields(x,prefix){return `<input data-fm-field="${prefix}-corba" value="${esc(x.corba||'')}" placeholder="Çorba"><input data-fm-field="${prefix}-ana" value="${esc(x.ana||'')}" placeholder="Ana yemek"><input data-fm-field="${prefix}-yardimci" value="${esc(x.yardimci||'')}" placeholder="Yardımcı / garnitür"><input data-fm-field="${prefix}-tatli" value="${esc(x.tatli||'')}" placeholder="Tatlı / meyve">`}
function foodMenuPrint(mode){
 const sc=foodSchool(),k=foodMenuCurrentMonth||foodMenuMonthKey(new Date().toISOString().slice(0,10)),data=foodMenuData(k);
 const title=mode==='foodMonthly'?'Aylık Yemek Menüsü':mode==='foodWeekly'?'Haftalık Yemek Menüsü':'Günlük Yemek Menüsü';
 let rows='';
 if(mode==='foodDaily'){
  const d=new Date(),x=data[d.getDate()]||{};
  rows='<tr><th>Çorba</th><td>'+esc(x.corba||'')+'</td></tr><tr><th>Ana Yemek</th><td>'+esc(x.ana||'')+'</td></tr><tr><th>Yardımcı / Garnitür</th><td>'+esc(x.yardimci||'')+'</td></tr><tr><th>Tatlı / Meyve</th><td>'+esc(x.tatli||'')+'</td></tr>';
 }else if(mode==='foodWeekly'){
  const t=new Date(),w=t.getDay()||7,m=new Date(t);m.setDate(t.getDate()-w+1);
  rows=Array.from({length:5},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i),kk=foodMenuMonthKey(d.toISOString().slice(0,10)),x=foodMenuData(kk)[d.getDate()]||{};return '<tr><th>'+esc(d.toLocaleDateString('tr-TR',{weekday:'long',day:'2-digit',month:'2-digit'}))+'</th><td>'+esc(x.corba||'')+'</td><td>'+esc(x.ana||'')+'</td><td>'+esc(x.yardimci||'')+'</td><td>'+esc(x.tatli||'')+'</td></tr>'}).join('');
 }else{
  const max=new Date(Number(k.slice(0,4)),Number(k.slice(5,7)),0).getDate();
  rows=Array.from({length:max},(_,i)=>{const n=i+1,x=data[n]||{},d=new Date(k+'-'+String(n).padStart(2,'0')+'T00:00:00');return '<tr><th>'+n+'</th><td>'+esc(d.toLocaleDateString('tr-TR',{weekday:'long'}))+'</td><td>'+esc(x.corba||'')+'</td><td>'+esc(x.ana||'')+'</td><td>'+esc(x.yardimci||'')+'</td><td>'+esc(x.tatli||'')+'</td></tr>'}).join('');
 }
 const head=mode==='foodDaily'?'<tr><th>Yemek</th><th>Menü</th></tr>':mode==='foodWeekly'?'<tr><th>Gün</th><th>Çorba</th><th>Ana Yemek</th><th>Yardımcı</th><th>Tatlı / Meyve</th></tr>':'<tr><th>Gün</th><th>Hafta</th><th>Çorba</th><th>Ana Yemek</th><th>Yardımcı</th><th>Tatlı / Meyve</th></tr>';
 const body='<div class="fm-print"><h1>'+esc(sc.okulAdi)+'</h1><h2>'+esc(title)+'</h2><table><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div>';
 return window.ReportEngine.printReport(title,body,{yon:'dikey',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:6,fontSize:8,compact:true,fileName:title.replaceAll(' ','_')});
}
function foodMenuPage(mode){
 const now=new Date(),initial=foodMenuCurrentMonth||foodMenuMonthKey(now.toISOString().slice(0,10)),data=foodMenuData(initial);
 if(mode==='foodDaily'){const day=now.getDate(),x=data[day]||{};return{count:0,html:`<section class="ka-stack" data-food-menu-page data-food-menu-mode="foodDaily"><div class="ka-row ka-row--between ka-wrap"><div><h3>☀️ Günlük Menü</h3><p class="ka-muted">${esc(now.toLocaleDateString('tr-TR',{dateStyle:'full'}))}</p></div><button class="ka-btn" type="button" data-fm-print>🖨 A4</button></div><div class="ka-card"><div class="ka-card__body"><div class="food-day-menu"><div><b>🥣 Çorba</b><span>${esc(x.corba||'Menü girilmemiş')}</span></div><div><b>🍲 Ana Yemek</b><span>${esc(x.ana||'Menü girilmemiş')}</span></div><div><b>🍚 Yardımcı / Garnitür</b><span>${esc(x.yardimci||'Menü girilmemiş')}</span></div><div><b>🍎 Tatlı / Meyve</b><span>${esc(x.tatli||'Menü girilmemiş')}</span></div></div><p class="ka-muted">Menüyü Aylık Menü ekranından girin; günlük görünüm otomatik güncellenir.</p></div></div></section>`}}
 if(mode==='foodWeekly'){const day=now.getDay()||7,mon=new Date(now);mon.setDate(now.getDate()-day+1);const rows=Array.from({length:5},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);const k=foodMenuMonthKey(d.toISOString().slice(0,10)),x=foodMenuData(k)[d.getDate()]||{};return`<tr><th>${d.toLocaleDateString('tr-TR',{weekday:'long',day:'2-digit',month:'2-digit'})}</th><td>${esc(x.corba||'—')}</td><td>${esc(x.ana||'—')}</td><td>${esc(x.yardimci||'—')}</td><td>${esc(x.tatli||'—')}</td></tr>`}).join('');return{count:5,html:`<section class="ka-stack" data-food-menu-page data-food-menu-mode="foodWeekly"><div class="ka-row ka-row--between ka-wrap"><div><h3>📆 Haftalık Menü</h3><p class="ka-muted">Pazartesi–Cuma</p></div><button class="ka-btn" type="button" data-fm-print>🖨 A4</button></div><div class="ka-card"><div class="ka-card__body"><div class="ka-table-wrap"><table class="ka-table food-week-table"><thead><tr><th>Gün</th><th>Çorba</th><th>Ana Yemek</th><th>Yardımcı</th><th>Tatlı / Meyve</th></tr></thead><tbody>${rows}</tbody></table></div></div></div></section>`}}
 const days=Object.keys(data).map(Number).filter(d=>d<=new Date(initial+'-01T00:00:00').getDate()).sort((a,b)=>a-b);
 const rows=days.map(d=>{const x=data[d]||{};return`<tr><th>${d}</th><td>${foodMenuDayName(initial,d)}</td><td>${foodMenuFields(x,d)}</td></tr>`}).join('');
 return{count:days.length,html:`<section class="ka-stack" data-food-menu-page data-food-menu-mode="foodMonthly"><style>.food-month-head{display:grid;grid-template-columns:52px 120px 1fr;gap:8px;padding:10px;border-bottom:2px solid var(--ka-border,#ddd)}.food-month-list{display:flex;flex-direction:column;gap:6px;margin:8px 0 14px}.food-month-list tr{border-bottom:1px solid #e1e7e4}.food-month-list td,.food-month-list th{padding:6px;vertical-align:top}.food-month-list input{display:block;width:100%;box-sizing:border-box;margin:2px 0;padding:8px;border:1px solid #d7dfdc;border-radius:8px}.food-week-table th,.food-week-table td{vertical-align:top}.food-week-table td{min-width:110px}</style><div class="ka-row ka-row--between ka-wrap"><div><h3>🗓️ Aylık Menü</h3><p class="ka-muted">Aylık yemek listesi ana kayıt ekranıdır. Günlük ve haftalık menüler buradan oluşur.</p></div><div class="ka-row"><select data-fm-month>${foodMenuMonthOptions(initial)}</select><button class="ka-btn" type="button" data-fm-print>🖨 A4</button></div></div><div class="ka-card"><div class="ka-card__body"><div class="food-month-head"><b>Gün</b><b>Hafta</b><b>Yemekler</b></div><div class="food-month-list">${rows}</div><button class="ka-btn" type="button" data-fm-save>💾 Menüyü Kaydet</button></div></div></section>`};
}

function foodPage(){const sc=foodSchool(),ins=foodInspectors(),opts=ins.ts.filter(t=>t.id!==ins.mudur&&t.id!==ins.yard).map(t=>`<option value="${esc(t.id)}" ${String(t.id)===String(foodState.teacher)?"selected":""}>${esc(`${t.ad||''} ${t.soyad||''}`.trim())}</option>`).join('');if(!foodState.teacher)foodState.teacher=ins.ts.find(t=>t.id!==ins.mudur&&t.id!==ins.yard)?.id||'';return{count:12,html:`<section class="ka-stack" data-food-page><div class="ka-row ka-row--between ka-wrap"><div><h3>🍽️ Ücretsiz Öğle Yemeği Denetim ve Kontrol Formu</h3><p class="ka-muted">${esc(sc.okulAdi)} — yalnızca çıktı alınır, form elle doldurulur.</p></div><button class="ka-btn" type="button" data-food-print>🖨 A4 / PDF Yazdır</button></div><div class="ka-card"><div class="ka-card__body"><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Yemek sunulan öğrenci sayısı</span><input id="food-count" inputmode="numeric" value="${esc(foodState.count)}"></label><label class="ka-field"><span class="ka-field__label">Denetim ve kontrol tarihi</span><input id="food-date" type="date" value="${esc(foodState.date)}"></label></div><label class="ka-field"><span class="ka-field__label">Denetleyen öğretmen</span><select data-food-teacher><option value="">Öğretmen seçin</option>${opts}</select></label><p class="ka-muted">Formdaki Evet, Hayır ve Açıklamalar alanlarına uygulama üzerinden veri girilmez. Çıktı üzerinde elle doldurulur.</p></div></div></section>`}}
function render(){if(!mounted)return;const r=active==='foodDaily'?foodMenuPage('foodDaily'):active==='foodWeekly'?foodMenuPage('foodWeekly'):active==='foodMonthly'?foodMenuPage('foodMonthly'):active==='food'?foodPage():active==='services'&&serviceDetailId?serviceDetail():active==='busSeats'?busSeats():active==='classSeats'?classSeats():services(),out=document.getElementById('transportContent'),c=document.getElementById('transportCount'),search=document.getElementById('transportSearch');const h=document.querySelector('[data-transport-module] > .ka-row h2');if(h){const titles={services:'Taşıma',busSeats:'Servis Oturma',foodDaily:'Günlük Menü',foodWeekly:'Haftalık Menü',foodMonthly:'Aylık Menü',food:'Yemek'};h.textContent=titles[active]||'Taşıma & Yemek'}if(out)out.innerHTML=r.html;if(c)c.textContent=serviceDetailId?`${r.count} öğrenci`:`${r.count} kayıt`;if(search)search.closest('.ka-field').hidden=!!serviceDetailId||active==='food';if(serviceDetailId){bindServiceDetail(out);window.PermissionService?.apply?.(document.getElementById('v2ModuleRoot')||document);return}if(['foodDaily','foodWeekly','foodMonthly'].includes(active)){const fm=out?.querySelector('[data-food-menu-page]');if(fm){fm.querySelector('[data-fm-month]')?.addEventListener('change',e=>{foodMenuCurrentMonth=e.target.value;render()});fm.querySelectorAll('[data-fm-field]').forEach(inp=>inp.addEventListener('input',()=>{const parts=inp.dataset.fmField.split('-'),day=Number(parts[0]),field=parts.slice(1).join('-'),d=foodMenuData(foodMenuCurrentMonth);d[day]??={corba:'',ana:'',yardimci:'',tatli:''};d[day][field]=inp.value;foodMenuSave(foodMenuLoad())}));fm.querySelector('[data-fm-save]')?.addEventListener('click',()=>{foodMenuSave(foodMenuLoad());toast?.('Yemek menüsü kaydedildi.');});fm.querySelector('[data-fm-print]')?.addEventListener('click',()=>foodMenuPrint(fm.dataset.foodMenuMode||active).catch(e=>toast?.('A4 çıktı hazırlanamadı: '+(e?.message||e))));}}if(active==='food'){const fp=out?.querySelector('[data-food-page]');if(fp){fp.querySelector('#food-count')?.addEventListener('input',e=>foodState.count=e.target.value);fp.querySelector('#food-date')?.addEventListener('change',e=>{foodState.date=e.target.value;render()});fp.querySelector('[data-food-teacher]')?.addEventListener('change',e=>{foodState.teacher=e.target.value});fp.querySelector('[data-food-print]')?.addEventListener('click',async()=>{const sel=fp.querySelector('[data-food-teacher]');if(sel?.value)foodState.teacher=sel.value;try{await window.ReportEngine.printReport('Ücretsiz Öğle Yemeği Denetim ve Kontrol Formu',foodPrintBody(),{yon:'dikey',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:5,fontSize:8,compact:true,fileName:'Ucretsiz_Ogle_Yemegi_Denetim_Formu'})}catch(e){toast?.('Form hazırlanamadı: '+(e?.message||e))}})}window.PermissionService?.apply?.(document.getElementById('v2ModuleRoot')||document)}document.querySelector('[data-service-add]')?.addEventListener('click',()=>openServiceModal({}));document.querySelectorAll('[data-service-filter]').forEach(b=>b.onclick=()=>{serviceFilter=b.dataset.serviceFilter||'all';render()});document.querySelectorAll('[data-service-detail]').forEach(card=>{const open=()=>openServiceDetail(card.dataset.serviceDetail);card.onclick=e=>{if(e.target.closest('button,a,input,select,textarea'))return;open()};card.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button,a,input,select,textarea')){e.preventDefault();open()}}});document.querySelectorAll('[data-service-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();const s=service(b.dataset.serviceEdit);if(s)openServiceModal(s)});document.querySelectorAll('[data-service-delete]').forEach(b=>b.onclick=()=>deleteService(b.dataset.serviceDelete));document.querySelectorAll('[data-bus-edit]').forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();openBusEditor(b.dataset.busEdit)};b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();openBusEditor(b.dataset.busEdit)}}});document.querySelectorAll('[data-class-seat-open]').forEach(b=>b.onclick=()=>openClassSeating(b.dataset.classSeatOpen));document.querySelectorAll('[data-transport-denetim]').forEach(b=>b.onclick=()=>denetimAc(b.dataset.transportDenetim));document.querySelectorAll('[data-transport-takip]').forEach(b=>b.onclick=()=>takipAc(b.dataset.transportTakip));window.PermissionService?.apply?.(document.getElementById('v2ModuleRoot')||document)}
function bind(){
 const s=document.getElementById('transportSearch');
 if(s)s.oninput=()=>{query=s.value;render()};
 const out=document.getElementById('transportContent');
 if(!out||out.dataset.transportEventsBound==='true')return;
 const openBusFromEvent=e=>{
  const bus=e.target?.closest?.('[data-bus-edit]');
  if(!bus||!out.contains(bus))return false;
  const now=Date.now(),last=Number(bus.dataset.busOpenAt||0);
  if(now-last<800)return true;
  bus.dataset.busOpenAt=String(now);
  e.preventDefault?.();
  e.stopPropagation?.();
  openBusEditor(bus.dataset.busEdit);
  return true;
 };
 const armBusTouch=e=>{
  const bus=e.target?.closest?.('[data-bus-edit]');
  if(!bus||!out.contains(bus))return;
  bus.dataset.busPressX=String(e.clientX??e.touches?.[0]?.clientX??0);
  bus.dataset.busPressY=String(e.clientY??e.touches?.[0]?.clientY??0);
  bus.dataset.busPressAt=String(Date.now());
  clearTimeout(Number(bus.dataset.busPressTimer||0));
  const timer=setTimeout(()=>{
   const sx=Number(bus.dataset.busPressX||0),sy=Number(bus.dataset.busPressY||0);
   const cx=Number(bus.dataset.busLastX||sx),cy=Number(bus.dataset.busLastY||sy);
   if(Math.hypot(cx-sx,cy-sy)>10)return;
   openBusFromEvent(e);
  },120);
  bus.dataset.busPressTimer=String(timer);
 };
 const cancelBusTouch=e=>{
  const bus=e.target?.closest?.('[data-bus-edit]');
  if(!bus||!out.contains(bus))return;
  clearTimeout(Number(bus.dataset.busPressTimer||0));
  bus.dataset.busPressTimer='';
  bus.dataset.busLastX=String(e.clientX??e.touches?.[0]?.clientX??bus.dataset.busPressX??0);
  bus.dataset.busLastY=String(e.clientY??e.touches?.[0]?.clientY??bus.dataset.busPressY??0);
 };
 const openBusOnPress=e=>{
  const bus=e.target?.closest?.('[data-bus-edit]');
  if(!bus||!out.contains(bus))return;
  openBusFromEvent(e);
 };
 out.addEventListener('pointerdown',e=>{openBusOnPress(e)},true);
 out.addEventListener('touchstart',e=>{openBusOnPress(e)},true);
 out.addEventListener('pointermove',e=>{cancelBusTouch(e)},true);
 out.addEventListener('pointercancel',e=>{cancelBusTouch(e)},true);
 out.addEventListener('touchmove',e=>{cancelBusTouch(e)},true);
 out.addEventListener('touchcancel',e=>{cancelBusTouch(e)},true);
 out.addEventListener('pointerup',e=>{openBusFromEvent(e)},true);
 out.addEventListener('touchend',e=>{openBusFromEvent(e)},true);
 out.addEventListener('click',e=>{openBusFromEvent(e)},true);
 out.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const bus=e.target?.closest?.('[data-bus-edit]');
  if(!bus||!out.contains(bus))return;
  e.preventDefault();
  e.stopPropagation();
  openBusEditor(bus.dataset.busEdit);
 },true);
 out.dataset.transportEventsBound='true';
}
function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];['data.servisler','data.veliler','data.siniflar','data.servisOturma','data.sinifOturma','data.resmiTatiller'].forEach(p=>{const u=AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)})}
async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bind();subscribe();await prepareLocal();render();return true}
function openPage(page,title=''){const allowed=['services','busSeats','classSeats','foodDaily','foodWeekly','foodMonthly','food'];if(!allowed.includes(page))return false;active=page;query='';serviceDetailId='';const h=document.querySelector('[data-transport-module] > .ka-row h2');if(h&&title)h.textContent=title;render();return true}
function unmount(){mounted=false;serviceDetailId='';closeEditor();document.querySelector('[data-service-modal]')?.remove();document.getElementById('transportReportPicker')?.remove();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
window.TransportModule={mount,unmount,render,prepareLocal,openBusEditor,openClassSeating,openPage,back};window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='transport')mount()});
})();

/* Canonical official transport report. */
(function(global){
'use strict';
if(global.TransportReports)return;

const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const esc=v=>global.ReportEngine?.esc?.(v)??String(v??'');
const AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const GUNLER=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const SABIT_LISTE_BOYU=30;
const DENETIM_MADDELERI=[
 ['Aracın yaşı “Okul Servis Araçları Yönetmeliğinde” yer alan yaş şartına uygun mu?','Okul Servis Araçları Yönetmeliği 4/1-f'],
 ['Okul servis aracı temiz, bakımlı, güvenli ve her fırsatta havalandırılmış vaziyette bulunduruluyor mu?','Okul Servis Araçları Yönetmeliği 4/1-e'],
 ['Taşıma işinin gerçekleştirildiği okul servis aracı, yüklenici tarafından idareye bildirilen araç mı?','Teknik Şartname'],
 ['Taşımayı gerçekleştiren şoför idareye bildirilen kişi mi?','Teknik Şartname'],
 ['“Sürücü Belgesi” taşıma hizmeti veren aracın kullanımı için yeterli ve uygun mu?','Okul Servis Araçları Yönetmeliği 9/1-c'],
 ['Aracın camları, “Okul servis araçlarının camlarının üzerine renkli film tabakaları yapıştırılması yasaktır.” hükmüne uygun mu?','Okul Servis Araçları Yönetmeliği 4/1-n'],
 ['Aracın arkasında "OKUL TAŞITI" yazısını kapsayan numunesine uygun renk, ebat ve şekilde reflektif (yansıtıcı) bir kuşak var mı?','Okul Servis Araçları Yönetmeliği 4/1-a'],
 ['En az 30 cm çapında kırmızı ışık veren bir lamba ve bu lambanın yakılması halinde üzerinde siyah renkte büyük harflerle "DUR" yazısı okunacak şekilde tesis edilmiş mi?','Okul Servis Araçları Yönetmeliği 4/1-b'],
 ['Öğrencilerin emniyet kemeri takmaları sağlanıyor mu?','Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 15/2-ğ'],
 ['Araca taşıma kapasitesi üzerinde öğrenci/kursiyer/veli alınıyor mu?','Teknik Şartname'],
 ['Taşıma merkezi okul/kurum müdürlüğünce düzenlenen ve takibi yapılan puantaj cetvelleri günlük düzenli olarak imzalanıyor mu?','Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 15/2-e / Teknik Şartname'],
 ['Şoför, temiz ve işe uygun kıyafetlerle çalışıyor mu?','Teknik Şartname'],
 ['Şoför, öğrencilerin oturarak, güvenli ve rahat bir yolculuk yapmalarını sağlayacak tedbirleri alarak taahhüt ettiği şekilde valilikçe belirlenecek okul açılış ve kapanış saatlerine göre, Milli Eğitim Bakanlığınca belirlenen azami sürelere uymak suretiyle taşıyor mu?','Okul Servis Araçları Yönetmeliği 9/1-ğ'],
 ['Rehber personel, (özel eğitim ihtiyacı olan öğrenci varsa) temiz ve işe uygun kıyafetler ile TS EN ISO 20471 standardına uygun, sarı renkte ve üzerinde reflektif (yansıtıcı) şeritler yer alan ve ön ve arka kısmında “REHBER” yazılı ikaz yeleğini kullanıyor mu?','Okul Servis Araçları Yönetmeliği 9/2-f'],
 ['Servis aracında “İlkyardım Çantası” bulunuyor mu?','Teknik Şartname'],
 ['Servis aracında “Trafik Seti” bulunuyor mu?','Teknik Şartname'],
 ['Servis aracında; bakımlı ve son kullanma tarihi geçmemiş yangın söndürme tüpü bulunuyor mu?','Teknik Şartname'],
 ['Araçta öğrencilerin kolayca yetişebileceği camlar ve pencereler sabit mi?','Okul Servis Araçları Yönetmeliği 4/1-c'],
 ['Aracın iç düzenlemesinde, varsa açıkta olan demir aksam yaralanmaya sebebiyet vermeyecek yumuşak bir madde ile kaplanmış mı?','Okul Servis Araçları Yönetmeliği 4/1-c'],
 ['Araçta “Öğrenci Servisi Planlama, Takip, Kontrol, Bilgilendirme ve Yönetim Sistemi” kullanılıyor mu?','Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 21/5, Öğrenci Servisi Planlama, Takip, Kontrol, Bilgilendirme ve Yönetim Sistemi Yönergesi, Teknik Şartname']
];

function requireReport(key){if(global.PermissionService){global.PermissionService.require('module.transport','preview');global.PermissionService.require(key,'preview')}}
async function prepare(){
 if(!global.SyncEngine||!global.COL)return;
 const defs={okulBilgileri:global.COL.okulBilgileri,resmiTatiller:global.COL.resmiTatiller},types=[];
 for(const[t,c]of Object.entries(defs)){
  if(c){global.SyncEngine.register(t,c);types.push(t)}
 }
 if(types.length){
  await global.SyncEngine.localHydrate(types);
  global.SyncEngine.schedule(60);
 }
}
function school(){const rows=arr('okulBilgileri');return rows.find(x=>x.id==='ayarlar')||rows[0]||{}}
function teachers(){return arr('ogretmenler')}
function personName(t){return t?`${t.ad||''} ${t.soyad||''}`.trim():''}
function admins(){const o=school(),ts=teachers(),mudur=ts.find(t=>t.id===o.mudurId)||ts.find(t=>(t.unvan||'').trim()==='Müdür'),yardimci=ts.find(t=>(t.unvan||'').trim()==='Müdür Yardımcısı');return{mudur:personName(mudur),yardimci:personName(yardimci),mudurId:mudur?.id||o.mudurId||'',yardimciId:yardimci?.id||''}}
function schoolTitle(){const o=school(),parts=[];if(o.il)parts.push(`${String(o.il).toLocaleUpperCase('tr')} İLİ`);if(o.ilce)parts.push(`${String(o.ilce).toLocaleUpperCase('tr')} İLÇESİ`);parts.push(String(o.okulAdi||'KORUK İLK-ORTAOKULU').toLocaleUpperCase('tr'));return parts.join(' ')}
function service(id){return arr('servisler').find(s=>s.id===id)||null}
function className(id,fallback=''){return arr('siniflar').find(s=>s.id===id)?.ad||fallback||id||''}
function studentSort(a,b){const c=String(a.sinif||'').localeCompare(String(b.sinif||''),'tr',{numeric:true});return c||String(a.ad||'').localeCompare(String(b.ad||''),'tr')}
function directStudents(servisId,s){const presidents=new Set(Array.isArray(s?.baskanlar)?s.baskanlar:[]);return arr('veliler').filter(v=>v.servisId===servisId).map(v=>({id:v.id,ad:v.ogrenciAdi||'',sinif:className(v.sinifId,v.sinifAdi),baskan:presidents.has(v.id)})).sort(studentSort)}
async function reportStudents(servisId,s){
 let list=directStudents(servisId,s),presidents=new Set(Array.isArray(s?.baskanlar)?s.baskanlar:[]);
 if(!list.length&&global.ServisOturmaRepository?.planServisIdIleGetir){
  try{
   const snap=await global.ServisOturmaRepository.planServisIdIleGetir(servisId),found=[];
   for(const doc of snap?.docs||[]){
    const p=doc.data?.()||{},seats=Array.isArray(p.koltuklar)?p.koltuklar:Object.values(p.koltuklar||{});
    for(const k of seats){if(k?.ogrenciAdi)found.push({id:k.ogrenciId||'',ad:k.ogrenciAdi,sinif:className(k.sinifId,k.sinifAdi),baskan:k.ogrenciId?presidents.has(k.ogrenciId):false})}
    if(!seats.length&&Array.isArray(p.elements))for(const el of p.elements){const n=el?.properties?.studentName;if(n)found.push({id:el.studentId||'',ad:n,sinif:className(el?.properties?.sinifId,el?.properties?.sinifAdi),baskan:el.studentId?presidents.has(el.studentId):false})}
   }
   const seen=new Set();list=found.filter(x=>{const k=x.id||`${x.ad}|${x.sinif}`;if(seen.has(k))return false;seen.add(k);return true}).sort(studentSort);
  }catch(_){list=[]}
 }
 const realCount=list.length;let target=Math.max(SABIT_LISTE_BOYU,realCount);if(target%2)target++;while(list.length<target)list.push({id:'',ad:'',sinif:'',baskan:false});return{list,target,realCount};
}
function dutyTeacherOptions(){const a=admins();return teachers().filter(t=>t.id!==a.mudurId&&(t.unvan||'').trim()!=='Müdür Yardımcısı').map(t=>personName(t)).filter(Boolean).sort((x,y)=>x.localeCompare(y,'tr')).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}
function activeServiceCount(){return arr('servisler').filter(s=>String(s?.durum||'Aktif')!=='Pasif').length}

function inspectionCss(){return `<style>
.ka-report{padding:6mm 6mm!important;font-family:'Segoe UI',Arial,sans-serif!important}.ka-report-content{display:block}.trp-inspection{color:#111}.trp-inspection .trp-head{text-align:center;margin-bottom:4px}.trp-inspection .trp-school{font-size:11pt;font-weight:800;letter-spacing:.1px}.trp-inspection .trp-head-1{font-size:8pt;font-weight:700;margin-top:1px}.trp-inspection .trp-head-2{font-size:10pt;font-weight:800;margin-top:1px}.trp-inspection .trp-head-3{font-size:6.8pt;font-style:italic;color:#333;margin-top:1px}.ka-report .trp-info{margin:5px 0!important;font-size:7.8pt!important;table-layout:fixed}.ka-report .trp-info td{border:1px solid #333!important;padding:2.6px 4px!important;background:#fff!important;color:#111!important;font-size:7.8pt!important;line-height:1.12!important}.ka-report .trp-info .trp-label{font-weight:800!important;white-space:normal!important;overflow-wrap:anywhere;word-break:normal;line-height:1.08;width:22%;font-size:7.1pt!important}.ka-report .trp-info .trp-value{width:28%;font-weight:600!important;white-space:normal!important;overflow-wrap:anywhere}.ka-report .trp-info .trp-license-label{font-size:6.8pt!important;letter-spacing:-.08px}.ka-report .trp-info .trp-driver-value{line-height:1.12}.ka-report .trp-info .trp-driver-value small{display:block;font-size:6.5pt;font-weight:700;margin-top:1px}.ka-report .trp-items{font-size:7.4pt!important;table-layout:fixed}.ka-report .trp-items th{border:1.2px solid #333!important;background:#fff!important;color:#111!important;padding:3px 3px!important;font-size:7.4pt!important;line-height:1.1!important}.ka-report .trp-items td{border:1px solid #555!important;background:#fff!important;color:#111!important;padding:2.7px 3.5px!important;font-size:7.2pt!important;vertical-align:middle!important;line-height:1.12!important}.ka-report .trp-items .trp-topic{width:57%;text-align:left!important;line-height:1.12}.ka-report .trp-items .trp-answer{width:7%;text-align:center}.ka-report .trp-items .trp-explain{width:29%}.trp-ref{display:block;font-size:5.9pt;color:#555;font-style:italic;margin-top:1px;line-height:1.05}.trp-note{font-size:6.4pt;color:#333;margin-top:5px;line-height:1.15}.trp-signatures{display:flex;justify-content:space-around;margin-top:7px;gap:10px}.trp-signature{text-align:center;min-width:0;flex:1}.trp-signature-title{font-size:7.6pt;font-weight:700;margin-bottom:6px}.trp-signature-line{border-top:1px solid #333;padding-top:3px}.trp-signature-name{font-size:8pt;font-weight:700;min-height:11px}.trp-signature-role{font-size:6.8pt;color:#444;margin-top:1px}.trp-duty-select{font-family:inherit;font-size:8pt;font-weight:700;border:none;border-bottom:1px solid #999;background:transparent;text-align:center;width:100%;padding:1px 0}.trp-duty-value{font-size:8pt;font-weight:700;line-height:1.08}[contenteditable="true"]{outline:1px dashed transparent}[contenteditable="true"]:focus{outline-color:#9aa}@media print{[contenteditable="true"]{outline:none!important}.trp-duty-select{appearance:none;border:none!important}.trp-inspection,.trp-inspection *{break-inside:avoid-page}.trp-items tr{break-inside:avoid;page-break-inside:avoid}.trp-signatures{break-inside:avoid;page-break-inside:avoid}}
</style>`}
function inspectionItems(){return DENETIM_MADDELERI.map(([m,r])=>`<tr><td class="trp-topic"><span contenteditable="true" spellcheck="false">${esc(m)}</span><span class="trp-ref" contenteditable="true" spellcheck="false">(${esc(r)})</span></td><td class="trp-answer"></td><td class="trp-answer"></td><td class="trp-explain" contenteditable="true" spellcheck="false"></td></tr>`).join('')}
function inspectionBody(s,count){const a=admins(),vehicleCount=activeServiceCount();return `<div class="trp-inspection"><div class="trp-head"><div class="trp-school">${esc(schoolTitle())}</div><div class="trp-head-1">TAŞIMA YOLUYLA EĞİTİME ERİŞİM YÖNETMELİĞİ KAPSAMINDA HİZMET SUNAN</div><div class="trp-head-2">OKUL SERVİS ARACI DENETİM FORMU</div><div class="trp-head-3">(TAŞIMA MERKEZİ OKUL/KURUM MÜDÜRLÜĞÜNCE KULLANILACAK)</div></div><table class="trp-info"><tbody><tr><td class="trp-label">ARACIN MODEL YILI</td><td class="trp-value" contenteditable="true" spellcheck="false">${esc(s.modelYili||'')}</td><td class="trp-label">TELEFON GSM</td><td class="trp-value" contenteditable="true" spellcheck="false">${esc(s.soforTelefon||'')}</td></tr><tr><td class="trp-label">ARACIN PLAKASI</td><td class="trp-value" contenteditable="true" spellcheck="false">${esc(s.plaka||'')}</td><td class="trp-label">ÖĞRENCİ SAYISI</td><td class="trp-value">${esc(count)}</td></tr><tr><td class="trp-label trp-license-label">SÜRÜCÜ BELGESİNİN ALINDIĞI YIL VE SINIFI</td><td class="trp-value" contenteditable="true" spellcheck="false">${esc(s.ehliyetYili||'')}${s.ehliyetSinifi?` / ${esc(s.ehliyetSinifi)}`:''}</td><td class="trp-label">OKUL/KURUMA GELEN ARAÇ SAYISI</td><td class="trp-value">${esc(vehicleCount)}</td></tr><tr><td class="trp-label">ŞOFÖRÜN ADI/SOYADI<br><span style="font-size:6.8pt">T.C.KİMLİK NO</span></td><td class="trp-value trp-driver-value" contenteditable="true" spellcheck="false">${esc(s.soforAdi||'')}<small>T.C. KİMLİK NO: ${esc(s.soforTc||'')}</small></td><td class="trp-label">DENETLEME TARİHİ</td><td class="trp-value" contenteditable="true" spellcheck="false">……./.……./20……</td></tr><tr><td class="trp-label">ARACIN GÜZERGÂHI</td><td class="trp-value" colspan="3" contenteditable="true" spellcheck="false">${esc(s.guzergah||'')}</td></tr></tbody></table><table class="trp-items"><thead><tr><th class="trp-topic">DENETLEME KONULARI</th><th class="trp-answer">EVET</th><th class="trp-answer">HAYIR</th><th class="trp-explain">AÇIKLAMALAR</th></tr></thead><tbody>${inspectionItems()}</tbody></table><div class="trp-note">Not: 1) Okul servis araçları haftalık olarak denetlenip bu form tutanak haline getirilerek ay sonu puantajları ile birlikte millî eğitim müdürlüğüne bildirilecek ve okul/kurum müdürlüğü dosyasında imzalı ve onaylı bir şekilde saklanacaktır. (bkz. Teknik Şartname)<br>2) Çizelgede yer alan denetim maddeleri ile ilgili “Evet / Hayır” bölümü işaretlendikten sonra gerek duyulması halinde “AÇIKLAMALAR” bölümü kullanılacak.</div><div class="trp-signatures"><div class="trp-signature"><div class="trp-signature-title">Denetleyen</div><div class="trp-signature-line"><select class="trp-duty-select" aria-label="Birinci denetleyen">${'<option value="">Öğretmen Seçiniz</option>'+dutyTeacherOptions()}</select><div class="trp-signature-role">Öğretmen</div></div></div><div class="trp-signature"><div class="trp-signature-title">Denetleyen</div><div class="trp-signature-line"><div class="trp-signature-name">${esc(a.yardimci)}</div><div class="trp-signature-role">Müdür Yardımcısı</div></div></div><div class="trp-signature"><div class="trp-signature-title">Denetleyen</div><div class="trp-signature-line"><div class="trp-signature-name">${esc(a.mudur)}</div><div class="trp-signature-role">Okul Müdürü</div></div></div></div></div>`}
function editablePreview(html,s){const ov=global.ReportEngine.previewHtml(html,{title:'Okul Servis Aracı Denetim Formu',fileName:`${s.plaka||'Servis'}_Denetim`,yon:'dikey'}),old=ov?.querySelector?.('[data-report-print]');if(!old)return ov;const btn=old.cloneNode(true);old.replaceWith(btn);btn.onclick=async()=>{const frame=ov.querySelector('#kaReportFrame'),doc=frame?.contentDocument;if(!doc)return global.toast?.('Rapor önizlemesi henüz hazır değil.');const root=doc.documentElement.cloneNode(true);const liveSelect=doc.querySelector('.trp-duty-select');const printableSelect=root.querySelector('.trp-duty-select');if(printableSelect){const selectedName=liveSelect?.value?.trim()||'';const value=document.createElement('div');value.className='trp-duty-value';value.textContent=selectedName||'Öğretmen Seçiniz';printableSelect.replaceWith(value)}root.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));const printable='<!doctype html>'+root.outerHTML,oldText=btn.textContent;btn.disabled=true;btn.textContent='Hazırlanıyor…';try{await global.ReportEngine.printHtml(printable,`${s.plaka||'Servis'}_Denetim`,'dikey')}catch(e){global.toast?.('Yazdırma açılamadı: '+(e?.message||e))}finally{btn.disabled=false;btn.textContent=oldText}};return ov}
async function denetim(servisId){requireReport('transport.report.inspection');await prepare();const s=service(servisId);if(!s)throw new Error('servis-bulunamadi');const direct=directStudents(servisId,s),count=direct.length||s.ogrenciSayisi||'';const html=global.ReportEngine.documentHtml('Okul Servis Aracı Denetim Formu',inspectionBody(s,count),{yon:'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,kenarBosluk:7,fontSize:8,compact:true,extraHead:inspectionCss()});return editablePreview(html,s)}

function monthlyCss(){return `<style>
.ka-report{padding:5mm 6mm!important;font-family:'Segoe UI',Arial,sans-serif!important}.trp-monthly{color:#111;height:287mm!important;min-height:287mm!important;box-sizing:border-box!important;display:block!important}.trp-monthly-head{text-align:center;margin-bottom:4px}.trp-monthly-school{font-size:14pt;font-weight:800;text-transform:uppercase;letter-spacing:.4px}.trp-monthly-title{font-size:10.5pt;font-weight:700;color:#2e7d32;margin-top:2px}.ka-report .trp-monthly-info{margin-bottom:5px!important;font-size:8.5pt!important;table-layout:auto}.ka-report .trp-monthly-info td{border:1px solid #888!important;padding:2px 6px!important;background:#fff!important;color:#111!important;font-size:8.5pt!important}.ka-report .trp-monthly-info .trp-label{background:#c8e6c9!important;font-weight:700!important;white-space:nowrap;color:#1b5e20!important}.ka-report .trp-student-grid{border:1px solid #888!important;margin-bottom:5px!important;table-layout:fixed}.ka-report .trp-student-grid>tbody>tr>td{width:50%!important;padding:0!important;border:0!important;background:#fff!important;vertical-align:top!important}.ka-report .trp-student-grid>tbody>tr>td+td{border-left:1px solid #888!important}.ka-report .trp-roster{font-size:7pt!important;line-height:1.5;table-layout:fixed}.ka-report .trp-roster th{background:#a5d6a7!important;color:#111!important;font-weight:700!important;padding:1px 2px!important;border:0!important;border-bottom:1px solid #888!important;border-right:1px solid #bbb!important;font-size:7pt!important}.ka-report .trp-roster td{padding:1px 3px!important;text-align:center!important;border:0!important;border-bottom:1px solid #ddd!important;border-right:1px solid #e3e3e3!important;background:#fff!important;color:#111!important;font-size:7pt!important;line-height:1.5}.ka-report .trp-roster tbody tr:nth-child(even) td{background:#f6f6f6!important}.ka-report .trp-roster .trp-roster-no{width:24px!important}.ka-report .trp-roster .trp-roster-class{width:42px!important}.ka-report .trp-roster .trp-roster-name{text-align:left!important;padding-left:4px!important}.ka-report .trp-daily{font-size:6.6pt!important;table-layout:fixed;line-height:1.4;height:155mm!important;margin-bottom:0!important}.ka-report .trp-daily tbody tr{height:var(--trp-day-height)!important;min-height:var(--trp-day-height)!important}.ka-report .trp-daily th,.ka-report .trp-daily td{border:1px solid #888!important;padding:3.3px 2px!important;text-align:center!important;vertical-align:middle!important;font-size:6.6pt!important;color:#111!important;background:#fff!important}.ka-report .trp-daily .trp-date-head{background:#c8e6c9!important;color:#111!important;font-weight:700!important;text-align:left!important;padding-left:6px!important;width:125px!important}.ka-report .trp-daily .trp-group-head{background:#a5d6a7!important;color:#111!important;font-weight:700!important}.ka-report .trp-daily .trp-sub-head{background:#c8e6c9!important;color:#111!important;font-weight:600!important;font-size:6.2pt!important}.ka-report .trp-daily .trp-date{text-align:left!important;padding-left:6px!important;white-space:nowrap!important;background:#fff!important}.ka-report .trp-daily .trp-weekend td,.ka-report .trp-daily .trp-holiday td{background:#e3e3e3!important;color:#777!important;font-style:italic!important}.trp-monthly-signatures{display:flex;justify-content:space-between;padding:7px 10px 0}.trp-monthly-signature{text-align:center;min-width:130px}.trp-monthly-signature strong{font-size:8.5pt}.trp-monthly-signature div{font-size:7.5pt;color:#444;margin-top:3px}@media print{.trp-monthly{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>`}
function rosterColumn(list,start){return `<table class="trp-roster"><thead><tr><th class="trp-roster-no">SIRA</th><th>ÖĞRENCİ ADI SOYADI</th><th class="trp-roster-class">SINIF</th></tr></thead><tbody>${list.map((o,i)=>`<tr><td class="trp-roster-no">${start+i+1}</td><td class="trp-roster-name">${o.baskan?'👑 ':''}${esc(o.ad||'')}</td><td class="trp-roster-class">${esc(o.sinif||'')}</td></tr>`).join('')}</tbody></table>`}
function rosterGrid(list,target){const half=Math.ceil(target/2),left=list.slice(0,half),right=list.slice(half,target);return `<table class="trp-student-grid"><tbody><tr><td>${rosterColumn(left,0)}</td><td>${rosterColumn(right,half)}</td></tr></tbody></table>`}
function holiday(iso){const list=arr('resmiTatiller'),t=global.NobetService?.tatilMi?.(list,iso)||list.find(x=>x.tarih===iso);return t?(t.aciklama||t.ad||'Resmî Tatil'):null}
function dateIso(y,m,d){return`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function dailyRows(y,m){const last=new Date(y,m+1,0).getDate();let out='';for(let d=1;d<=last;d++){const dt=new Date(y,m,d),weekend=dt.getDay()===0||dt.getDay()===6,h=!weekend&&holiday(dateIso(y,m,d)),label=`${d} ${AYLAR[m]} ${y} ${GUNLER[dt.getDay()]}`;if(weekend)out+=`<tr class="trp-weekend"><td class="trp-date">${esc(label)}</td>${'<td>Hafta Sonu</td>'.repeat(8)}</tr>`;else if(h)out+=`<tr class="trp-holiday" title="${esc(h)}"><td class="trp-date">${esc(label)}</td>${'<td>Resmî Tatil</td>'.repeat(8)}</tr>`;else out+=`<tr><td class="trp-date">${esc(label)}</td>${'<td></td>'.repeat(8)}</tr>`}return out}
function monthlyBody(s,y,m,studentData){const a=admins(),lastDay=new Date(y,m+1,0).getDate(),dayHeight=(155/lastDay).toFixed(3),ayAdi=`${AYLAR[m].toLocaleUpperCase('tr')} - ${y}`;return `<div class="trp-monthly"><div class="trp-monthly-head"><div class="trp-monthly-school">${esc(String(school().okulAdi||'KORUK İLK-ORTAOKULU').toLocaleUpperCase('tr'))}</div><div class="trp-monthly-title">${esc(ayAdi)} TAŞIMA TAKİP ÇİZELGESİ</div></div><table class="trp-monthly-info"><tbody><tr><td class="trp-label">SERVİS ADI</td><td colspan="3">${esc(s.servisAdi||s.guzergah||'')}</td><td class="trp-label">CEP NO</td><td>${esc(s.soforTelefon||'')}</td><td class="trp-label">AİT OLDUĞU AY</td><td>${esc(ayAdi)}</td></tr><tr><td class="trp-label">SÜRÜCÜ</td><td colspan="3">${esc(s.soforAdi||'')}</td><td class="trp-label">PLAKA</td><td colspan="3">${esc(s.plaka||'')}</td></tr></tbody></table>${rosterGrid(studentData.list,studentData.target)}<table class="trp-daily" style="--trp-day-height:${dayHeight}mm"><thead><tr><th class="trp-date-head" rowspan="2">TARİH</th><th class="trp-group-head" colspan="4">ÖĞLE</th><th class="trp-group-head" colspan="4">AKŞAM</th></tr><tr><th class="trp-sub-head">GELİŞ<br>SAATİ</th><th class="trp-sub-head">GELEN<br>SAYI</th><th class="trp-sub-head">ŞOFÖR<br>İMZA</th><th class="trp-sub-head">N.ÖĞRT<br>İMZA</th><th class="trp-sub-head">ÇIKIŞ<br>SAATİ</th><th class="trp-sub-head">GİDEN<br>SAYI</th><th class="trp-sub-head">ŞOFÖR<br>İMZA</th><th class="trp-sub-head">N.ÖĞRT<br>İMZA</th></tr></thead><tbody>${dailyRows(y,m)}</tbody></table><div class="trp-monthly-signatures"><div class="trp-monthly-signature"><strong>${esc(a.yardimci)}</strong><div>Müdür Yardımcısı</div></div><div class="trp-monthly-signature"><strong>${esc(a.mudur)}</strong><div>Okul Müdürü</div></div></div></div>`}
async function takip(servisId,yil=new Date().getFullYear(),ay=new Date().getMonth()){requireReport('transport.report.monthly');await prepare();const s=service(servisId);if(!s)throw new Error('servis-bulunamadi');const y=Number(yil),m=Number(ay);if(!Number.isInteger(y)||y<2020||y>2100||!Number.isInteger(m)||m<0||m>11)throw new Error('gecersiz-tarih');const studentData=await reportStudents(servisId,s),ayAdi=`${AYLAR[m].toLocaleUpperCase('tr')} - ${y}`;return global.ReportEngine.printReport(`${ayAdi} Taşıma Takip Çizelgesi`,monthlyBody(s,y,m,studentData),{fileName:`${s.plaka||'Servis'}_${AYLAR[m]}_${y}_Takip`,yon:'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,kenarBosluk:6,fontSize:7,compact:true,extraHead:monthlyCss()})}
function takipSec(servisId){requireReport('transport.report.monthly');document.getElementById('transportReportPicker')?.remove();const now=new Date(),ov=document.createElement('div');ov.id='transportReportPicker';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><strong>Aylık Taşıma Takip Çizelgesi</strong><div class="ka-muted">Eski resmî iki sütunlu öğrenci listesi ve günlük imza düzeniyle hazırlanır.</div></div><button class="ka-btn ka-btn--secondary ka-btn--sm" data-close type="button">Kapat</button></div><div class="ka-modal__body ka-grid"><label class="ka-field"><span class="ka-field__label">Yıl</span><input data-year type="number" min="2020" max="2100" value="${now.getFullYear()}"></label><label class="ka-field"><span class="ka-field__label">Ay</span><select data-month>${AYLAR.map((a,i)=>`<option value="${i}" ${i===now.getMonth()?'selected':''}>${a}</option>`).join('')}</select></label></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" data-prev type="button">◀ Önceki Ay</button><button class="ka-btn ka-btn--secondary" data-next type="button">Sonraki Ay ▶</button><button class="ka-btn" data-print type="button">Önizle / Yazdır</button></div></section>`;document.body.appendChild(ov);const year=ov.querySelector('[data-year]'),month=ov.querySelector('[data-month]'),shift=delta=>{let y=Number(year.value),m=Number(month.value)+delta;if(m<0){m=11;y--}if(m>11){m=0;y++}year.value=y;month.value=m};ov.querySelector('[data-close]').onclick=()=>ov.remove();ov.querySelector('[data-prev]').onclick=()=>shift(-1);ov.querySelector('[data-next]').onclick=()=>shift(1);ov.querySelector('[data-print]').onclick=async()=>{const b=ov.querySelector('[data-print]');b.disabled=true;try{await takip(servisId,Number(year.value),Number(month.value));ov.remove()}catch(e){global.toast?.('Rapor hazırlanamadı: '+(e?.message||e));b.disabled=false}};return ov}
global.TransportReports={prepare,denetim,takip,takipSec,reportStudents};
})(window);
