/* Koruk Asistan — Sınıflar tek görünüm sahibi
 * Sınıflar ekranını yalnız bu modül render eder. Öğretmen/öğrenci ekranları
 * mevcut People sunumuna delege edilir. İlk modül mount'unda başka bir
 * People görünümü çizilmez; istenen alt sayfa seçildikten sonra tek DOM üretilir.
 * Reads come from AppStore; writes stay on SiniflarService / PeopleImportUI /
 * SinifOturmaService.
 */
(function(global){
'use strict';
if(global.ClassesMobileParity)return;
const base=global.PeopleModule;
if(!base)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const fullName=o=>[o?.ad,o?.soyad].filter(Boolean).join(' ')||o?.adSoyad||'—';
const can=(k,m='read')=>!global.PermissionService||global.PermissionService.can(k,m);
const activeUser=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const activeRole=()=>global.AppStore?.get?.('session.role')||{};
const roleName=()=>norm(activeRole().ad||activeRole().rolAdi||activeUser().rolAdi||activeUser().rol||'');
const linkedTeacherId=()=>activeUser().bagliOgretmenId||activeUser().ogretmenId||'';
const isManagerUser=()=>roleName().includes('yonetici')||roleName().includes('mudur');
const isTeacherUser=()=>activeUser().admin!==true&&!!linkedTeacherId()&&!isManagerUser();
const teacherBlockedWrite=message=>{global.toast?.(message);return Promise.reject(new Error('yetkisiz'))};
function applyTeacherStudentUiPolicy(root=document){
  if(!isTeacherUser())return;
  root.querySelectorAll?.('[data-student-add],[data-exact-student-add],[data-cmp-student-add],[data-student-delete],[data-exact-modal-delete],[data-cmp-directory-excel-pick],[data-cmp-directory-eokul-pick],[data-cmp-excel-pick],[data-cmp-eokul-pick],[data-exact-class-excel],[data-exact-class-eokul]').forEach(el=>el.remove());
}
function installTeacherStudentPolicy(){
  const permission=global.PermissionService;
  if(permission&&!permission.__teacherStudentEditPolicy){
    const originalCan=permission.can.bind(permission);
    permission.can=(key,min='read')=>key==='people.students.edit'&&isTeacherUser()?true:originalCan(key,min);
    permission.canEdit=key=>permission.can(key,'edit');
    permission.__teacherStudentEditPolicy=true;
  }
  const service=global.SiniflarService;
  if(service&&!service.__teacherStudentEditPolicy){
    const originalSave=service.veliKaydet.bind(service),originalDelete=service.veliSil.bind(service),originalImport=service.ogrenciVeliListesiIceAktar?.bind(service),originalEOkul=service.eOkulPlanlariniUygula?.bind(service);
    service.veliKaydet=(id,v)=>isTeacherUser()&&!id?teacherBlockedWrite('Öğretmen hesapları yeni öğrenci kaydı oluşturamaz.'):originalSave(id,v);
    service.veliSil=id=>isTeacherUser()?teacherBlockedWrite('Öğretmen hesapları öğrenci kaydı silemez.'):originalDelete(id);
    if(originalImport)service.ogrenciVeliListesiIceAktar=(...args)=>isTeacherUser()?teacherBlockedWrite('Öğretmen hesaplarında toplu öğrenci içe aktarma kapalıdır.'):originalImport(...args);
    if(originalEOkul)service.eOkulPlanlariniUygula=(...args)=>isTeacherUser()?teacherBlockedWrite('Öğretmen hesaplarında e-Okul toplu eşitleme kapalıdır.'):originalEOkul(...args);
    service.__teacherStudentEditPolicy=true;
  }
  if(!global.__teacherStudentUiObserver){
    global.__teacherStudentUiObserver=new MutationObserver(()=>applyTeacherStudentUiPolicy(document));
    global.__teacherStudentUiObserver.observe(document.documentElement,{childList:true,subtree:true});
  }
  requestAnimationFrame(()=>applyTeacherStudentUiPolicy(document));
}
installTeacherStudentPolicy();
let root=null,active='pending',query='',level='',detailId='',detailTab='students',unsubs=[],seatingReady=false,seatingBusy=false;
const classes=()=>arr('siniflar'),students=()=>arr('veliler'),teachers=()=>arr('ogretmenler');
const classTeacher=s=>teachers().find(o=>o.id===s?.sinifOgretmeniId)||null;
const classLevel=s=>String(s?.seviye||s?.ad||'').match(/\d+/)?.[0]||'';
const stats=s=>{const list=students().filter(v=>v.sinifId===s.id);return{list,total:list.length,girls:list.filter(v=>v.cinsiyet==='Kız').length,boys:list.filter(v=>v.cinsiyet==='Erkek').length}};
const DAY_ORDER={Pazartesi:1,'Salı':2,'Çarşamba':3,'Perşembe':4,Cuma:5};
const schedule=s=>arr('dersProgrami').filter(d=>d.sinifId===s.id||d.sinif===s.ad).slice().sort((a,b)=>{const ad=String(a.gun||'').trim(),bd=String(b.gun||'').trim();return (DAY_ORDER[ad]||99)-(DAY_ORDER[bd]||99)||Number(a.saat||0)-Number(b.saat||0)});
function filtered(){let list=classes().filter(s=>!query||norm(`${s.ad||''} ${s.seviye||''} ${s.derslik||''} ${fullName(classTeacher(s))}`).includes(norm(query)));if(level)list=list.filter(s=>classLevel(s)===level);return list.sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr',{numeric:true}))}
const initial=v=>String(v?.ogrenciAdi||'?').trim().charAt(0).toLocaleUpperCase('tr')||'?';
const ICON={
  seat:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="7" height="6" rx="1.6"/><rect x="14" y="4" width="7" height="6" rx="1.6"/><rect x="3" y="14" width="7" height="6" rx="1.6"/><rect x="14" y="14" width="7" height="6" rx="1.6"/></svg>',
  teacher:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/></svg>',
  room:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V7l8-4 8 4v13"/><path d="M9.5 20v-6h5v6"/></svg>',
  chev:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  edit:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.2 2.2 0 0 0-3.1-3.1L5 17z"/><path d="m14 7 3 3"/></svg>',
  plus:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  sheet:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg>',
  search:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  back:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
  stack:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/></svg>',
  check:'<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
};
const SEAT_COLS={'tekli-sira':1,'ikili-masa':2,'grup-masasi-4':2,'grup-masasi-6':3};
const PLAN_PAGE={dikey:{w:794,h:1063},yatay:{w:1123,h:734}};
const seatingAllowed=()=>can('transport.classSeating','read')||can('people.classes','read');
const planOf=s=>arr('sinifOturma').find(p=>p&&(p.sinifId===s.id||p.id===s.id))||null;
function planInfo(s,st){
  const p=planOf(s),desks=(p&&Array.isArray(p.ogeler)?p.ogeler:[]).filter(o=>o&&SEAT_COLS[o.tur]);
  if(!desks.length)return{plan:null,desks:0,seats:0,seated:0,missing:st.list};
  const byId=new Map(st.list.map(v=>[String(v.id),v])),byName=new Map(st.list.map(v=>[norm(v.ogrenciAdi),v])),placed=new Set();let seats=0;
  desks.forEach(o=>(o.koltuklar||[]).forEach(k=>{seats++;const v=(k.ogrenciId&&byId.get(String(k.ogrenciId)))||(k.isim&&byName.get(norm(k.isim)));if(v)placed.add(v.id)}));
  return{plan:p,desks:desks.length,seats,seated:placed.size,missing:st.list.filter(v=>!placed.has(v.id))};
}
const stageOf=s=>Number(classLevel(s))>=5?'is-orta':Number(classLevel(s))>0?'is-ilk':'';
const genderOf=v=>v?.cinsiyet==='Kız'?'is-girl':v?.cinsiyet==='Erkek'?'is-boy':'';
function genderBar(g,b,extra=''){return `<span class="kcl-split ${extra}${g+b?'':' is-empty'}" data-kcl-g="${g}" data-kcl-b="${b}" role="img" aria-label="${g} kız, ${b} erkek"><i class="is-girl"></i><i class="is-boy"></i></span>`}
function seatChip(s,st){
  if(!seatingAllowed())return '';
  const pi=seatingReady?planInfo(s,st):null;
  const label=!pi?'Oturma planı':pi.plan?`Oturma planı · ${pi.seated}/${st.total}`:'Plan oluştur';
  return `<button class="kcl-chip${pi?.plan?' is-set':''}" type="button" data-cmp-seating="${esc(s.id)}" aria-label="${esc(s.ad||'Sınıf')} oturma planını aç">${ICON.seat}<span>${esc(label)}</span></button>`;
}
function classCard(s){
  const st=stats(s),t=classTeacher(s),editable=can('people.classes','edit'),name=s.ad||'Sınıf';
  return `<article class="kcl-card" data-cmp-class-detail="${esc(s.id)}" role="button" tabindex="0" aria-label="${esc(name)} detayını aç"><div class="kcl-card-top"><span class="kcl-plate ${stageOf(s)}${String(name).length>4?' is-long':''}">${esc(name)}</span><span class="kcl-card-main"><strong>${esc(t?fullName(t):'Sınıf öğretmeni atanmadı')}</strong><small>${ICON.room}<span>${esc(s.derslik||'Derslik girilmemiş')}</span></small></span><span class="kcl-card-count"><b>${st.total}</b><small>öğrenci</small></span></div><div class="kcl-card-gender">${genderBar(st.girls,st.boys)}<span class="is-girl">${st.girls} kız</span><span class="is-boy">${st.boys} erkek</span></div><div class="kcl-card-foot">${seatChip(s,st)}<span class="kcl-card-go">Detay${ICON.chev}</span>${editable?`<button class="kcl-icon" type="button" data-cmp-class-edit="${esc(s.id)}" aria-label="${esc(name)} düzenle">${ICON.edit}</button>`:''}</div></article>`;
}
function classView(){
  const ss=students(),all=classes(),list=filtered(),levels=[...new Set(all.map(classLevel).filter(Boolean))].sort((a,b)=>Number(a)-Number(b)),girls=ss.filter(v=>v.cinsiyet==='Kız').length,boys=ss.filter(v=>v.cinsiyet==='Erkek').length,canEditClasses=can('people.classes','edit'),canImportStudents=can('people.students.edit','edit')&&!isTeacherUser();
  const lvOf=new Map(all.map(s=>[s.id,classLevel(s)])),perLevel={};ss.forEach(v=>{const l=lvOf.get(v.sinifId);if(l)perLevel[l]=(perLevel[l]||0)+1});
  const maxLevel=Math.max(1,...levels.map(l=>perLevel[l]||0));
  const groups=[];list.forEach(s=>{const l=classLevel(s);let g=groups.find(x=>x.l===l);if(!g){g={l,items:[]};groups.push(g)}g.items.push(s)});
  groups.sort((a,b)=>(a.l?Number(a.l):99)-(b.l?Number(b.l):99));
  const levelBtn=x=>{const n=x?(perLevel[x]||0):ss.length,pct=x?Math.max(8,Math.round(n/maxLevel*100)):100;return `<button class="kcl-lv${level===x?' active':''}" type="button" data-cmp-level="${esc(x)}" aria-pressed="${level===x}"><span class="kcl-lv-bar">${x?`<i data-kcl-pct="${pct}"></i>`:ICON.stack}</span><b>${x?esc(x)+'.':'Tümü'}</b><small>${n}</small></button>`};
  const groupHtml=g=>`<section class="kcl-group"><header class="kcl-group-head"><h2>${g.l?esc(g.l)+'. sınıf':'Seviyesiz'}</h2><span>${g.items.length} şube · ${g.items.reduce((n,s)=>n+stats(s).total,0)} öğrenci</span></header><div class="kcl-grid">${g.items.map(classCard).join('')}</div></section>`;
  const empty=all.length?'<div class="kcl-empty"><b>Sınıf bulunamadı</b><span>Aramayı veya seviye filtresini değiştirin.</span></div>':`<div class="kcl-empty"><b>Henüz sınıf eklenmedi</b><span>${canEditClasses?'“Sınıf Ekle” ile ilk sınıfı oluşturun veya Excel / e-Okul ile öğrenci listesini aktarın.':'Sınıflar yönetici tarafından eklendiğinde burada görünür.'}</span></div>`;
  return `<section class="kcl-page kcl-list ka-class-directory"><div class="ka-row ka-row--between ka-people-page-head"><div><small class="ka-people-kicker">SINIF YÖNETİMİ</small><h1>Sınıflar</h1><p class="ka-muted">Sınıfları, öğrencileri ve oturma planlarını buradan yönetin.</p></div><div class="ka-class-head-actions" data-legacy-class-imports>${canEditClasses?'<button class="ka-btn ka-class-add" type="button" data-cmp-class-add>＋ Sınıf Ekle</button>':''}</div></div><section class="kcl-overview" aria-label="Okul özeti"><div class="kcl-kpis"><div><span class="kcl-n">${all.length}</span><small>Sınıf</small></div><div><span class="kcl-n">${ss.length}</span><small>Öğrenci</small></div><div class="is-girl"><span class="kcl-n">${girls}</span><small>Kız</small></div><div class="is-boy"><span class="kcl-n">${boys}</span><small>Erkek</small></div></div>${genderBar(girls,boys,'kcl-split--wide')}${levels.length?`<div class="kcl-levels" role="group" aria-label="Seviye filtresi">${['',...levels].map(levelBtn).join('')}</div>`:''}</section><div class="kcl-toolbar"><label class="kcl-search">${ICON.search}<input data-cmp-search type="search" value="${esc(query)}" placeholder="Sınıf, derslik veya öğretmen ara" autocomplete="off"><button type="button" data-cmp-search-clear aria-label="Aramayı temizle">×</button></label>${canImportStudents?`<div class="kcl-imports"><button class="ka-btn ka-btn--secondary" type="button" data-cmp-directory-excel-pick>${ICON.sheet}<span>Excel</span></button><button class="ka-btn ka-btn--secondary" type="button" data-cmp-directory-eokul-pick>${ICON.sheet}<span>e-Okul</span></button><input type="file" accept=".xlsx,.xls" data-cmp-directory-excel hidden><input type="file" accept=".xlsx,.xls" data-cmp-directory-eokul hidden></div>`:''}</div><div class="kcl-groups">${groups.length?groups.map(groupHtml).join(''):empty}</div></section>`;
}
function studentRow(v){return `<button class="kcl-stu" type="button" data-cmp-student-detail="${esc(v.id)}"><span class="kcl-stu-av ${genderOf(v)}">${esc(initial(v))}</span><span class="kcl-stu-main"><strong>${esc(v.ogrenciAdi||'Öğrenci')}</strong><small>${v.ogrenciNo?'No '+esc(v.ogrenciNo)+' · ':''}${esc(v.veliAdi||'Veli bilgisi yok')}</small></span>${v.servisAdi?`<span class="kcl-tag">${esc(v.servisAdi)}</span>`:''}<span class="kcl-stu-go">${ICON.chev}</span></button>`}
function infoRow(label,value){return `<div class="kcl-info-row"><dt>${esc(label)}</dt><dd>${esc(value||'Bilgi girilmemiş')}</dd></div>`}
function infoBody(s,st,t){return `<section class="kcl-panel kcl-info"><h3>Genel bilgiler</h3><dl>${infoRow('Sınıf öğretmeni',t?fullName(t):'Atanmadı')}${infoRow('Derslik',s.derslik||s.ad||'—')}${infoRow('Seviye',classLevel(s)?classLevel(s)+'. sınıf':'—')}${infoRow('Kayıtlı öğrenci',`${st.total} (${st.girls} kız, ${st.boys} erkek)`)}${infoRow('Notlar',s.notlar||'')}</dl></section>`}
function studentActions(s){
  if(!can('people.students.edit','edit')||isTeacherUser())return '';
  const id=esc(s.id);
  return `<div class="kcl-actions"><button class="ka-btn" type="button" data-cmp-student-add="${id}">${ICON.plus}<span>Öğrenci ekle</span></button><button class="ka-btn ka-btn--secondary" type="button" data-cmp-excel-pick="${id}">${ICON.sheet}<span>Excel</span></button><button class="ka-btn ka-btn--secondary" type="button" data-cmp-eokul-pick="${id}">${ICON.sheet}<span>e-Okul</span></button><input type="file" accept=".xlsx,.xls" data-cmp-excel="${id}" hidden><input type="file" accept=".xlsx,.xls" data-cmp-eokul="${id}" hidden></div>`;
}
function studentsBody(s,st){return `${studentActions(s)}<div class="kcl-students">${st.list.length?st.list.slice().sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr')).map(studentRow).join(''):'<div class="kcl-empty"><b>Bu sınıfta öğrenci yok</b><span>Öğrenci ekleyin veya Excel / e-Okul listesinden aktarın.</span></div>'}</div>`}
function seatPreview(p){
  const land=p.sayfaYonu==='yatay',pg=PLAN_PAGE[land?'yatay':'dikey'];
  const items=(p.ogeler||[]).filter(o=>o&&(SEAT_COLS[o.tur]||['ogretmen-masasi','kapi','pencere','yazi-tahtasi'].includes(o.tur))).map(o=>{
    const cols=SEAT_COLS[o.tur]||0,box=[o.x/pg.w,o.y/pg.h,o.w/pg.w,o.h/pg.h].map(n=>(Number(n)*100).toFixed(2)).join(',');
    const seats=cols?(o.koltuklar||[]).map(k=>`<i${k&&(k.ogrenciId||k.isim)?' class="is-full"':''}></i>`).join(''):'';
    return `<span class="kcl-pv-o is-${esc(o.tur)}" data-kcl-box="${box}" data-kcl-rot="${Number(o.rotasyon)||0}"${cols?` data-kcl-cols="${cols}"`:''}>${seats}</span>`;
  }).join('');
  return `<div class="kcl-pv ${land?'is-land':'is-port'}" role="img" aria-label="Sınıf oturma planı önizlemesi">${items}</div>`;
}
function seatingBody(s,st){
  const id=esc(s.id),pi=planInfo(s,st);
  if(!pi.plan)return `<section class="kcl-panel kcl-seat-empty"><span class="kcl-seat-art">${ICON.seat}</span><h3>${seatingReady?'Bu sınıf için oturma planı yok':'Oturma planı yükleniyor'}</h3><p>Sıraları yerleştirin, öğrencileri koltuklara atayın ve A4 çıktı alın.</p><button class="ka-btn" type="button" data-cmp-seating="${id}">${ICON.seat}<span>Oturma planı oluştur</span></button></section>`;
  const miss=pi.missing,names=miss.slice(0,14).map(v=>`<span>${esc(v.ogrenciAdi||'Öğrenci')}</span>`).join('')+(miss.length>14?`<span class="is-more">+${miss.length-14}</span>`:'');
  return `<section class="kcl-panel kcl-seat"><div class="kcl-seat-stage">${seatPreview(pi.plan)}</div><div class="kcl-seat-side"><div class="kcl-seat-stats"><div><span class="kcl-n">${pi.desks}</span><small>sıra</small></div><div><span class="kcl-n">${pi.seats}</span><small>koltuk</small></div><div><span class="kcl-n">${pi.seated}</span><small>yerleşti</small></div><div class="${miss.length?'is-warn':'is-ok'}"><span class="kcl-n">${miss.length}</span><small>yerleşmedi</small></div></div>${miss.length?`<div class="kcl-missing"><h4>Henüz yerleşmeyenler</h4><div class="kcl-names">${names}</div></div>`:`<p class="kcl-done">${ICON.check}<span>Tüm öğrenciler yerleşti.</span></p>`}<button class="ka-btn" type="button" data-cmp-seating="${id}">${ICON.seat}<span>Planı aç</span></button></div></section>`;
}
function scheduleBody(s){
  const rows=schedule(s);
  if(!rows.length)return '<div class="kcl-empty"><b>Ders programı yok</b><span>Bu sınıf için ders programı kaydı bulunmuyor.</span></div>';
  const days=[];rows.forEach(x=>{const d=String(x.gun||'').trim()||'Gün belirtilmemiş';let g=days.find(a=>a.d===d);if(!g){g={d,items:[]};days.push(g)}g.items.push(x)});
  return `<div class="kcl-days">${days.map(g=>`<section class="kcl-day"><h3>${esc(g.d)}<small>${g.items.length} ders</small></h3><ol>${g.items.map(x=>{const teacher=teachers().find(t=>t.id===x.ogretmenId);return `<li><b>${esc(x.saat||'·')}</b><span><strong>${esc(x.ders||x.dersAdi||'Ders')}</strong><small>${esc(teacher?fullName(teacher):'')}</small></span></li>`}).join('')}</ol></section>`).join('')}</div>`;
}
function detailView(s){
  const st=stats(s),t=classTeacher(s),rows=schedule(s),name=s.ad||'Sınıf',tabs=[['students',`Öğrenciler (${st.total})`],...(seatingAllowed()?[['seating','Oturma planı']]:[]),['schedule','Dersler'],['info','Bilgiler']];
  if(!tabs.some(x=>x[0]===detailTab))detailTab='students';
  const body=detailTab==='students'?studentsBody(s,st):detailTab==='seating'?seatingBody(s,st):detailTab==='schedule'?scheduleBody(s):infoBody(s,st,t);
  return `<section class="kcl-page kcl-detail"><div class="ka-detail-topbar ka-class-detail-topbar"><button class="ka-icon-button" type="button" data-cmp-back aria-label="Sınıflara dön">‹</button><h2>${esc(name)}</h2>${can('people.classes','edit')?`<button class="ka-icon-button" type="button" data-cmp-class-edit="${esc(s.id)}" aria-label="Düzenle">✎</button>`:'<span></span>'}</div><div class="ka-class-hero"><span class="ka-class-hero-avatar">${esc(name)}</span><div><h1>${esc(name)}</h1><p>${classLevel(s)?esc(classLevel(s))+'. seviye':'Seviye bilgisi yok'} · ${esc(s.derslik||'Derslik bilgisi yok')}</p><strong>${esc(t?'Sınıf öğretmeni: '+fullName(t):'Sınıf öğretmeni atanmadı')}</strong></div></div><section class="kcl-overview kcl-overview--detail"><div class="kcl-kpis"><div><span class="kcl-n">${st.total}</span><small>Öğrenci</small></div><div class="is-girl"><span class="kcl-n">${st.girls}</span><small>Kız</small></div><div class="is-boy"><span class="kcl-n">${st.boys}</span><small>Erkek</small></div><div><span class="kcl-n">${rows.length}</span><small>Ders</small></div></div>${genderBar(st.girls,st.boys,'kcl-split--wide')}</section><div class="kcl-tabs" role="tablist">${tabs.map(([key,label])=>`<button class="${detailTab===key?'active':''}" type="button" role="tab" aria-selected="${detailTab===key}" data-cmp-tab="${key}">${esc(label)}</button>`).join('')}</div>${body}</section>`;
}
function applyDynamic(scope){
  $$('[data-kcl-g]',scope).forEach(el=>{const g=Number(el.dataset.kclG)||0,b=Number(el.dataset.kclB)||0,k=el.children;if(k[0])k[0].style.flexGrow=String(g);if(k[1])k[1].style.flexGrow=String(b)});
  $$('[data-kcl-pct]',scope).forEach(el=>el.style.height=el.dataset.kclPct+'%');
  $$('[data-kcl-box]',scope).forEach(el=>{const [l,t,w,h]=el.dataset.kclBox.split(',');Object.assign(el.style,{left:l+'%',top:t+'%',width:w+'%',height:h+'%'});const r=Number(el.dataset.kclRot)||0;if(r)el.style.transform=`rotate(${r}deg)`;if(el.dataset.kclCols)el.style.gridTemplateColumns=`repeat(${el.dataset.kclCols},minmax(0,1fr))`});
}
async function ensureSeating(){
  if(seatingReady||seatingBusy||!seatingAllowed())return;
  seatingBusy=true;
  try{
    if(global.SyncEngine&&global.COL?.sinifOturma){global.SyncEngine.register('sinifOturma',global.COL.sinifOturma);await global.SyncEngine.localHydrate(['sinifOturma']);global.SyncEngine.schedule?.(100)}
    seatingReady=true;
  }catch(e){console.warn('[ClassesMobile/seating-data]',e)}
  seatingBusy=false;
  if(seatingReady)render();
}
function render(){if(active!=='classes'||!root||global.AppStore?.get?.('ui.route')!=='people')return;const s=detailId?classes().find(x=>x.id===detailId):null;root.innerHTML=`<section data-classes-mobile-parity>${s?detailView(s):classView()}</section>`;bind();global.PermissionService?.apply?.(root);applyTeacherStudentUiPolicy(root)}
function stopSubs(){unsubs.forEach(u=>{try{u()}catch(_){}});unsubs=[]}
function subscribe(){stopSubs();for(const p of ['data.siniflar','data.veliler','data.ogretmenler','data.dersProgrami','data.sinifOturma']){const u=global.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)}}
function classModal(s={}){document.querySelector('[data-cmp-modal]')?.remove();const st=s.id?stats(s):{total:0},ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.cmpModal='';ov.innerHTML=`<form class="ka-modal" data-cmp-class-form><div class="ka-modal__header"><h2>${s.id?'Sınıfı Düzenle':'Yeni Sınıf'}</h2><button class="ka-icon-button" type="button" data-cmp-modal-close>×</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Sınıf Adı *</span><input name="ad" required value="${esc(s.ad||'')}" placeholder="Örn. 7-A"></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Seviye</span><select name="seviye"><option value="">—</option>${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}" ${String(s.seviye||classLevel(s))===String(n)?'selected':''}>${n}</option>`).join('')}</select></label><label class="ka-field"><span class="ka-field__label">Derslik</span><input name="derslik" value="${esc(s.derslik||s.ad||'')}"></label></div><label class="ka-field"><span class="ka-field__label">Sınıf Öğretmeni</span><select name="sinifOgretmeniId"><option value="">— Atanmadı —</option>${teachers().slice().sort((a,b)=>fullName(a).localeCompare(fullName(b),'tr')).map(t=>`<option value="${esc(t.id)}" ${t.id===s.sinifOgretmeniId?'selected':''}>${esc(fullName(t))}</option>`).join('')}</select></label><label class="ka-field"><span class="ka-field__label">Notlar</span><textarea name="notlar">${esc(s.notlar||'')}</textarea></label></div><div class="ka-modal__footer">${s.id&&st.total===0?'<button class="ka-btn ka-btn--danger" type="button" data-cmp-class-delete>Sil</button><span class="ka-grow"></span>':''}<button class="ka-btn ka-btn--secondary" type="button" data-cmp-modal-close>Vazgeç</button><button class="ka-btn" type="submit">Kaydet</button></div></form>`;document.body.appendChild(ov);$$('[data-cmp-modal-close]',ov).forEach(b=>b.onclick=()=>ov.remove());ov.onclick=e=>{if(e.target===ov)ov.remove()};$('[data-cmp-class-delete]',ov)?.addEventListener('click',async()=>{if(!confirm(`“${s.ad||'Sınıf'}” silinsin mi?`))return;try{await global.SiniflarService.sinifSil(s.id);detailId='';ov.remove();render();global.toast?.('Sınıf silindi.')}catch(e){global.toast?.('Sınıf silinemedi: '+(e?.message||e))}});$('[data-cmp-class-form]',ov).onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),ad=String(fd.get('ad')||'').trim();if(!ad)return;try{if(!global.SiniflarService.adBenzersizMi(classes(),ad,s.id||''))throw new Error('Bu sınıf adı zaten kullanılıyor.');const result=await global.SiniflarService.sinifKaydet(s.id||null,{ad,seviye:String(fd.get('seviye')||''),derslik:String(fd.get('derslik')||'').trim(),sinifOgretmeniId:String(fd.get('sinifOgretmeniId')||''),notlar:String(fd.get('notlar')||'').trim()});if(!s.id&&result?.id)detailId=result.id;ov.remove();render();global.toast?.('Sınıf kaydedildi.')}catch(err){global.toast?.('Kaydedilemedi: '+(err?.message||err))}}}
function studentModal(classId){document.querySelector('[data-cmp-student-modal]')?.remove();const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.cmpStudentModal='';ov.innerHTML=`<form class="ka-modal" data-cmp-student-form><div class="ka-modal__header"><h2>Öğrenci Ekle</h2><button class="ka-icon-button" type="button" data-cmp-close>×</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Öğrenci Adı Soyadı *</span><input name="ogrenciAdi" required></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Öğrenci No</span><input name="ogrenciNo" inputmode="numeric"></label><label class="ka-field"><span class="ka-field__label">Cinsiyet</span><select name="cinsiyet"><option value="">Belirtilmedi</option><option>Kız</option><option>Erkek</option></select></label></div><label class="ka-field"><span class="ka-field__label">Veli Adı Soyadı</span><input name="veliAdi"></label></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-cmp-close>Vazgeç</button><button class="ka-btn" type="submit">Kaydet</button></div></form>`;document.body.appendChild(ov);$$('[data-cmp-close]',ov).forEach(b=>b.onclick=()=>ov.remove());$('[data-cmp-student-form]',ov).onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await global.SiniflarService.veliKaydet(null,{sinifId:classId,ogrenciAdi:String(fd.get('ogrenciAdi')||'').trim(),ogrenciNo:String(fd.get('ogrenciNo')||'').trim(),cinsiyet:String(fd.get('cinsiyet')||''),veliAdi:String(fd.get('veliAdi')||'').trim(),telefon1:'',telefon2:'',telefon3:'',adres:'',servisId:'',servisAdi:'',notlar:''});ov.remove();render();global.toast?.('Öğrenci kaydedildi.')}catch(err){global.toast?.('Kaydedilemedi: '+(err?.message||err))}}}
async function importFile(file,id,eokul=false){try{if(!global.PeopleImportUI)throw new Error('İçe aktarma servisi hazır değil.');await (eokul?global.PeopleImportUI.importEOkul(file,id):global.PeopleImportUI.importStudents(file,id))}catch(e){console.error('[ClassesMobile/import]',e);global.toast?.((eokul?'e-Okul':'Excel')+' içe aktarma hatası: '+(e?.message||e))}}
async function openSeating(id){try{if(!can('transport.classSeating','read')&&!can('people.classes','read'))throw new Error('yetkisiz');if(!global.SinifOturmaService)await global.AppLoader?.loadScript?.('js/modules/transport.js');if(!global.SinifOturma?.ac)await global.AppLoader?.loadScript?.('js/modules/class-seating.js');if(global.SyncEngine&&global.COL?.sinifOturma){global.SyncEngine.register('sinifOturma',global.COL.sinifOturma);await global.SyncEngine.localHydrate(['sinifOturma']);global.SyncEngine.schedule(100)}if(!global.SinifOturma?.ac)throw new Error('oturma-motoru-yok');await global.SinifOturma.ac(id)}catch(e){console.error('[ClassesMobile/seating]',e);global.toast?.(e?.message==='yetkisiz'?'Sınıf oturma planını görüntüleme yetkiniz yok.':'Sınıf oturma planı açılamadı.')}}
function openStudent(id){active='delegate';stopSubs();root=root||document.getElementById('v2ModuleRoot');base.mount?.(root);base.openPage?.('students');requestAnimationFrame(()=>{const hit=$$('[data-student-detail],[data-exact-student-detail]',root).find(x=>(x.dataset.studentDetail||x.dataset.exactStudentDetail)===id);hit?.click?.()})}
function bind(){const q=$('[data-cmp-search]',root);if(q)q.oninput=()=>{const pos=q.selectionStart;query=q.value;render();const n=$('[data-cmp-search]',root);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(_){}}};$('[data-cmp-search-clear]',root)?.addEventListener('click',()=>{query='';render();requestAnimationFrame(()=>$('[data-cmp-search]',root)?.focus())});$$('[data-cmp-level]',root).forEach(b=>b.onclick=()=>{level=b.dataset.cmpLevel||'';render()});$$('[data-cmp-class-detail]',root).forEach(b=>{b.onclick=e=>{if(e.target.closest('[data-cmp-class-edit],[data-cmp-seating]'))return;detailId=b.dataset.cmpClassDetail;detailTab='students';render();scrollTo({top:0,behavior:'smooth'})};b.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('[data-cmp-class-edit],[data-cmp-seating]')){e.preventDefault();b.click()}}});$('[data-cmp-back]',root)?.addEventListener('click',()=>{detailId='';detailTab='students';render();scrollTo({top:0,behavior:'smooth'})});$$('[data-cmp-tab]',root).forEach(b=>b.onclick=()=>{detailTab=b.dataset.cmpTab||'students';render()});$('[data-cmp-class-add]',root)?.addEventListener('click',()=>classModal({}));$$('[data-cmp-class-edit]',root).forEach(b=>b.onclick=e=>{e.stopPropagation();const s=classes().find(x=>x.id===b.dataset.cmpClassEdit);if(s)classModal(s)});$('[data-cmp-directory-excel-pick]',root)?.addEventListener('click',()=> $('[data-cmp-directory-excel]',root)?.click());$('[data-cmp-directory-eokul-pick]',root)?.addEventListener('click',()=> $('[data-cmp-directory-eokul]',root)?.click());const dirExcel=$('[data-cmp-directory-excel]',root);if(dirExcel)dirExcel.onchange=()=>{const f=dirExcel.files?.[0];dirExcel.value='';if(f)importFile(f,'',false)};const dirEokul=$('[data-cmp-directory-eokul]',root);if(dirEokul)dirEokul.onchange=()=>{const f=dirEokul.files?.[0];dirEokul.value='';if(f)importFile(f,'',true)};$$('[data-cmp-student-add]',root).forEach(b=>b.onclick=()=>studentModal(b.dataset.cmpStudentAdd));$$('[data-cmp-student-detail]',root).forEach(b=>b.onclick=()=>openStudent(b.dataset.cmpStudentDetail));$$('[data-cmp-seating]',root).forEach(b=>b.onclick=()=>openSeating(b.dataset.cmpSeating));$$('[data-cmp-excel-pick]',root).forEach(b=>b.onclick=()=>root.querySelector(`[data-cmp-excel="${b.dataset.cmpExcelPick}"]`)?.click());$$('[data-cmp-eokul-pick]',root).forEach(b=>b.onclick=()=>root.querySelector(`[data-cmp-eokul="${b.dataset.cmpEokulPick}"]`)?.click());$$('[data-cmp-excel]',root).forEach(i=>i.onchange=()=>{const f=i.files?.[0];i.value='';if(f)importFile(f,i.dataset.cmpExcel,false)});$$('[data-cmp-eokul]',root).forEach(i=>i.onchange=()=>{const f=i.files?.[0];i.value='';if(f)importFile(f,i.dataset.cmpEokul,true)});applyDynamic(root)}
function mount(target=document.getElementById('v2ModuleRoot')){root=target||document.getElementById('v2ModuleRoot');if(!root)return false;if(active==='classes'){subscribe();render();ensureSeating();return true}root.replaceChildren();return true}
function openPage(next){root=root||document.getElementById('v2ModuleRoot');if(!root)return false;if(next!=='classes'){active='delegate';stopSubs();detailId='';detailTab='students';query='';level='';base.mount?.(root);return base.openPage?.(next)!==false}base.unmount?.();active='classes';query='';level='';detailId='';detailTab='students';subscribe();render();ensureSeating();return true}
function unmount(){stopSubs();document.querySelector('[data-cmp-modal]')?.remove();document.querySelector('[data-cmp-student-modal]')?.remove();global.SinifOturma?.kapat?.();if(active==='delegate')base.unmount?.();active='pending';root=null}
function rerender(){if(active==='classes')render();else if(active==='delegate')base.render?.()}
const api={mount,openPage,render:rerender,unmount};global.ClassesMobileParity=api;global.PeopleModule=api;
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='people')mount()});
})(window);