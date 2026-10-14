/* Koruk Asistan — Öğretmenler ve Öğrenciler (kpd-*)
 * Sınıflar ekranıyla (classes-mobile-parity.js, kcl-*) aynı tasarım dilinde: özet kartı, süzgeç çipleri, gruplu kartlar,
 * tam sayfa detay (üst şerit + kahraman kartı + sekmeler) ve form pencereleri.
 *
 * Bu modül yalnız "teachers" ve "students" sayfalarını çizer; "classes" Sınıflar modülüne devredilir.
 * Okuma AppStore'dan, yazma OgretmenService / SiniflarService / BelgeDurumuService üzerinden (yerel-öncelikli) yapılır.
 * Kulüp / izin / belge kuralları PeopleClassicUI.helpers'tan, A4 raporlar ve sınav hesapları PeopleReports'tan gelir.
 * Bağımlılıklardan biri yüklenmediyse modül kendini kurmaz ve önceki ekranlar çalışmaya devam eder.
 */
(function(global){
'use strict';
if(global.PeopleDirectory)return;
const classesUi=global.ClassesMobileParity,H=global.PeopleClassicUI?.helpers,R=global.PeopleReports;
if(!classesUi||!H||!R)return;

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
const trSort=(a,b)=>String(a||'').localeCompare(String(b||''),'tr',{numeric:true});
const toast=m=>global.toast?.(m);
const fullName=o=>[o?.ad,o?.soyad].filter(Boolean).join(' ')||o?.adSoyad||'İsimsiz';
const initials=o=>{const t=fullName(o).split(/\s+/).filter(Boolean);return((t[0]?.[0]||'?')+(t.length>1?t[t.length-1][0]:'')).toLocaleUpperCase('tr')};
const stuInitial=v=>String(v?.ogrenciAdi||'?').trim().charAt(0).toLocaleUpperCase('tr')||'?';

/* ---------- yetki ---------- */
const can=(k,m='read')=>!global.PermissionService||global.PermissionService.can(k,m);
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const myTeacherId=()=>{const u=user();return u.bagliOgretmenId||u.ogretmenId||''};
const isTeacherUser=()=>classesUi.isTeacherUser?classesUi.isTeacherUser():(user().admin!==true&&!!myTeacherId());
const canEditTeachers=()=>can('people.teachers','edit');
const canEditStudents=()=>can('people.students.edit','edit');
const canAddStudents=()=>canEditStudents()&&!isTeacherUser();
const own=o=>!!o?.id&&myTeacherId()===o.id;
const canSensitive=o=>own(o)||canEditTeachers();
const canTeacherReport=o=>own(o)||(!isTeacherUser()&&canEditTeachers());
const canDocStatus=o=>canEditTeachers()&&!own(o);

/* ---------- veri ---------- */
const teachers=()=>arr('ogretmenler'),classes=()=>arr('siniflar'),students=()=>arr('veliler');
const classOf=id=>classes().find(s=>s.id===id);
const className=id=>classOf(id)?.ad||'Sınıfsız';
const classLevel=s=>String(s?.seviye||s?.ad||'').match(/\d+/)?.[0]||'';
const lessonsOf=id=>arr('dersProgrami').filter(d=>d.ogretmenId===id);
const dutiesOf=id=>arr('nobetAtamalari').filter(n=>n.ogretmenId===id);
const dayIndexToday=()=>(new Date().getDay()+6)%7;
const todayLessons=id=>lessonsOf(id).filter(l=>norm(l.gun)===norm(R.DAYS[dayIndexToday()])).sort((a,b)=>(+a.saat||0)-(+b.saat||0));
const dutyToday=id=>{const k=H.localDateKey();return dutiesOf(id).some(n=>H.leaveDateKey(n.tarih)===k)};
const leavesOf=id=>[...arr('ogretmenIzinleri'),...arr('personelIzinler')].filter(x=>x.ogretmenId===id||x.personelId===id);
const committeesOf=id=>arr('kurulKomisyonlar').filter(r=>String(r.baskanId||'')===String(id)||[...(r.asilUyeler||[]),...(r.yedekUyeler||[])].some(m=>m?.tur==='ogretmen'&&String(m.id)===String(id)));
const teacherClasses=o=>classes().filter(s=>s.sinifOgretmeniId===o.id).map(s=>s.ad).filter(Boolean).join(', ');
const branchesOf=()=>{const m=new Map();teachers().forEach(o=>{const b=(o.brans||'').trim();m.set(b,(m.get(b)||0)+1)});return m};
const studentPhone=v=>v.telefon1||v.telefon||v.telefon2||v.telefon3||'';
const hue=s=>{let h=0;for(const c of String(s||''))h=(h*31+c.charCodeAt(0))>>>0;return h%6};
const photoOf=o=>{const s=String(o?.profilFotoUrl||o?.fotograf||o?.foto||o?.photoURL||o?.profilFoto||'').trim();return/^(https?:|data:image\/|blob:)/i.test(s)?s:''};
function phoneIntl(p){let t=String(p||'').replace(/\D/g,'');if(!t)return'';if(t.startsWith('0090'))t=t.slice(2);if(t.startsWith('90')&&t.length===12)return t;if(t.startsWith('0')&&t.length===11)t=t.slice(1);return t.length===10?'90'+t:t}
const waHref=p=>{const n=phoneIntl(p);return n?`https://wa.me/${n}`:''};
const telHref=p=>`tel:${String(p||'').replace(/[^\d+]/g,'')}`;

/* ---------- ikonlar ---------- */
const I=d=>`<svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON={
  search:I('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  plus:I('<path d="M12 5v14M5 12h14"/>'),
  chev:I('<path d="m9 6 6 6-6 6"/>'),
  back:I('<path d="m15 6-6 6 6 6"/>'),
  edit:I('<path d="M4 20h4L19 9a2.2 2.2 0 0 0-3.1-3.1L5 17z"/><path d="m14 7 3 3"/>'),
  sheet:I('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>'),
  down:I('<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>'),
  phone:I('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.7.5 2.6.6a2 2 0 0 1 2 2.3Z"/>'),
  wa:I('<path d="M20.7 11.6a8.7 8.7 0 0 1-12.8 7.7L3 20.7l1.4-4.7A8.7 8.7 0 1 1 20.7 11.6Z"/><path d="M9 8.6c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.4 0 .7.5.9 1.2 1.6 2.1 2.1.3.2.5.2.7 0l.9-.9c.2-.2.4-.3.7-.2l1.8.9c.3.1.4.3.4.5 0 .4-.2 1.1-.8 1.6-.6.5-1.4.7-2.2.5-1.2-.3-2.8-1-4.4-2.4-1.3-1.2-2.2-2.6-2.6-3.7-.3-.8-.2-1.6.2-2.2Z"/>'),
  msg:I('<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/>'),
  cal:I('<rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
  print:I('<path d="M6 9V3h12v6"/><rect x="5" y="14" width="14" height="7" rx="1.6"/><path d="M5 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1"/>'),
  mail:I('<rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="m4 7 8 6 8-6"/>'),
  user:I('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/>'),
  group:I('<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c.7-3.2 3-4.8 6-4.8s5.3 1.6 6 4.8"/><path d="M16 5.4a3.2 3.2 0 0 1 0 6M17.5 15.4c2 .5 3.2 2 3.5 4.6"/>'),
  stack:I('<path d="m12 4 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/>'),
  bus:I('<rect x="4" y="4" width="16" height="13" rx="2.4"/><path d="M4 11h16M8 20v-3M16 20v-3"/><circle cx="8.5" cy="14" r=".6"/><circle cx="15.5" cy="14" r=".6"/>'),
  duty:I('<path d="M12 3 5 6v5.5c0 4.4 2.9 7.8 7 9.5 4.1-1.7 7-5.1 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>'),
  doc:I('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 14l2 2 4-4"/>'),
  trash:I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>')
};
const empty=(title,text)=>`<div class="kcl-empty"><b>${esc(title)}</b><span>${esc(text)}</span></div>`;
const genderBar=(g,b,extra='')=>`<span class="kcl-split ${extra}" data-kcl-g="${g}" data-kcl-b="${b}" role="img" aria-label="${g} kız, ${b} erkek"><i class="is-girl"></i><i class="is-boy"></i></span>`;
const infoRow=(label,value,action='')=>{const cls=[action?'kpd-dd':'',value?'':'is-empty'].filter(Boolean).join(' ');return `<div class="kcl-info-row"><dt>${esc(label)}</dt><dd${cls?` class="${cls}"`:''}><span>${esc(value||'Bilgi girilmemiş')}</span>${action}</dd></div>`};
/* Gün + kısa ay adı bloğu (nöbet ve devamsızlık satırları) */
const dateBlock=v=>{const k=H.leaveDateKey(v),d=k?new Date(k+'T12:00:00'):null,ok=d&&!Number.isNaN(d.getTime());return `<span class="kpd-date"><b>${ok?String(d.getDate()).padStart(2,'0'):'–'}</b><small>${ok?d.toLocaleDateString('tr-TR',{month:'short'}):''}</small></span>`};
const linkBtn=(href,icon,label,ext=false)=>`<a class="kcl-icon" href="${esc(href)}"${ext?' target="_blank" rel="noopener"':''} aria-label="${esc(label)}">${icon}</a>`;
const avatar=(o,extra='')=>{const src=photoOf(o);return `<span class="kpd-av is-b${hue(o.brans||fullName(o))}${extra}">${src?`<img src="${esc(src)}" alt="" loading="lazy">`:esc(initials(o))}</span>`};
const tabsHtml=(tabs,cur,act)=>`<div class="kcl-tabs" role="tablist">${tabs.map(([k,l])=>`<button class="${cur===k?'active':''}" type="button" role="tab" aria-selected="${cur===k}" data-kpd-act="${act}" data-v="${k}">${esc(l)}</button>`).join('')}</div>`;
const kpis=list=>`<section class="kcl-overview kcl-overview--detail"><div class="kcl-kpis">${list.map(([n,l,c])=>`<div${c?` class="${c}"`:''}><span class="kcl-n">${esc(n)}</span><small>${esc(l)}</small></div>`).join('')}</div></section>`;
const searchBox=(value,ph)=>`<label class="kcl-search">${ICON.search}<input data-kpd-search type="search" value="${esc(value)}" placeholder="${esc(ph)}" autocomplete="off" enterkeyhint="search"><button type="button" data-kpd-act="clear-search" aria-label="Aramayı temizle">×</button></label>`;

/* ---------- durum ---------- */
let root=null,active='pending',origin=null,unsubs=[],renderQueued=0,prepared=false;
const T={q:'',branch:'',id:'',tab:'info'};
const S={q:'',level:'',cls:'',gender:'',id:'',tab:'info',exam:'all'};

function preparePeopleData(){
  if(prepared)return;prepared=true;
  (async()=>{
    if(!global.SyncEngine||!global.COL)return;
    const types=['sosyalKulupler','belirliGunler','zumre','sok','bepPlani','rehberlik','maarifRapor','digerEvrak','personelIzinler','yoklama','denemeSonuclari','testSonuclari'].filter(t=>global.COL[t]);
    types.forEach(t=>global.SyncEngine.register(t,global.COL[t]));
    await global.SyncEngine.localHydrate(types);global.SyncEngine.schedule?.(100);
  })().catch(e=>{prepared=false;console.warn('[PeopleDirectory/data]',e?.message||e)});
}

/* =====================================================================
   ÖĞRETMENLER — liste
   ===================================================================== */
function teacherRows(){return teachers().map(o=>({o,today:todayLessons(o.id),leave:H.teacherOnLeave(o.id),duty:dutyToday(o.id),hours:lessonsOf(o.id).length}))}
function teacherMatch(r){
  const o=r.o,q=norm(T.q.trim());
  if(T.branch!==''&&(o.brans||'')!==(T.branch==='-'?'':T.branch))return false;
  return !q||norm([fullName(o),o.brans,o.unvan,o.telefon,o.eposta||o.email,H.teacherSchool(o)].filter(Boolean).join(' ')).includes(q);
}
function teacherCard(r){
  const o=r.o,id=esc(o.id),name=fullName(o),phone=o.telefon||o.telefon1||'',first=r.today[0],cls=teacherClasses(o),club=H.relatedRows('sosyalKulupler',o.id)[0];
  const school=H.teacherSchool(o),sub=[o.unvan||'Öğretmen',school&&school!=='—'?school:''].filter(Boolean).join(' · ');
  const tags=[r.leave?'<span class="kpd-tag is-leave">İzinli</span>':'',r.duty?'<span class="kpd-tag is-duty">Bugün nöbetçi</span>':'',cls?`<span class="kpd-tag">${esc(cls)} sınıf öğretmeni</span>`:'',club?`<span class="kpd-tag">${esc(club.ad||club.kulupAdi||'Sosyal kulüp')}</span>`:''].join('');
  const next=first?`${esc(first.saat||'')}. ders · ${esc(R.lessonClass(first))} · ${esc(R.lessonName(first))}`:'Bugün dersi yok';
  return `<article class="kcl-card kpd-card" data-kpd-act="t-open" data-id="${id}" role="button" tabindex="0" aria-label="${esc(name)} profilini aç"><div class="kcl-card-top">${avatar(o)}<span class="kcl-card-main"><strong>${esc(name)}</strong><small><span>${esc(sub)}</span></small></span><span class="kcl-card-count"><b>${r.today.length}</b><small>bugün ders</small></span></div><p class="kpd-next${first?'':' is-none'}">${ICON.cal}<span>${next}</span></p>${tags?`<div class="kpd-tags">${tags}</div>`:''}<div class="kcl-card-foot"><span class="kpd-hours">${r.hours} ders saati / hafta</span>${phone?`<span class="kpd-mini">${waHref(phone)?linkBtn(waHref(phone),ICON.wa,`${name} WhatsApp`,true):''}${linkBtn(telHref(phone),ICON.phone,`${name} ara`)}</span>`:''}<span class="kcl-card-go">Profil${ICON.chev}</span>${canEditTeachers()?`<button class="kcl-icon" type="button" data-kpd-act="t-edit" data-id="${id}" aria-label="${esc(name)} düzenle">${ICON.edit}</button>`:''}</div></article>`;
}
function teacherGroups(rows){
  const list=rows.filter(teacherMatch);
  if(!list.length)return teachers().length?empty('Öğretmen bulunamadı','Aramayı veya branş filtresini değiştirin.'):empty('Henüz öğretmen eklenmedi',canEditTeachers()?'“Öğretmen” ile ilk kaydı oluşturun veya Excel ile aktarın.':'Öğretmenler yönetici tarafından eklendiğinde burada görünür.');
  const groups=new Map();
  list.sort((a,b)=>trSort(fullName(a.o),fullName(b.o))).forEach(r=>{const b=(r.o.brans||'').trim();if(!groups.has(b))groups.set(b,[]);groups.get(b).push(r)});
  return [...groups.entries()].sort(([a],[b])=>!a?1:!b?-1:trSort(a,b)).map(([b,items])=>`<section class="kcl-group"><header class="kcl-group-head"><h2>${esc(b||'Branş belirtilmemiş')}</h2><span>${items.length} öğretmen</span></header><div class="kcl-grid">${items.map(teacherCard).join('')}</div></section>`).join('');
}
function teacherList(){
  const rows=teacherRows(),br=branchesOf(),named=[...br.keys()].filter(Boolean).sort(trSort),canEdit=canEditTeachers();
  const dutyN=rows.filter(r=>r.duty).length,leaveN=rows.filter(r=>r.leave).length;
  const chip=(v,label,n)=>`<button class="kcl-chip${T.branch===v?' is-set':''}" type="button" data-kpd-act="branch" data-v="${esc(v)}" aria-pressed="${T.branch===v}"><span>${esc(label)}</span><b>${n}</b></button>`;
  return `<section class="kcl-page kcl-list kpd-page"><div class="ka-row ka-row--between ka-people-page-head"><div><small class="ka-people-kicker">PERSONEL</small><h1>Öğretmenler</h1><p class="ka-muted">Program, nöbet ve sorumluluklar tek ekranda.</p></div><div class="ka-class-head-actions">${canEdit?`<button class="ka-btn ka-class-add" type="button" data-kpd-act="t-add">${ICON.plus}<span>Öğretmen</span></button>`:''}</div></div><section class="kcl-overview" aria-label="Personel özeti"><div class="kcl-kpis"><div><span class="kcl-n">${rows.length}</span><small>Öğretmen</small></div><div><span class="kcl-n">${named.length}</span><small>Branş</small></div><div><span class="kcl-n">${dutyN}</span><small>Nöbetçi</small></div><div><span class="kcl-n">${leaveN}</span><small>İzinli</small></div></div>${named.length>1?`<div class="kpd-chips" role="group" aria-label="Branş filtresi">${chip('','Tümü',rows.length)}${named.map(b=>chip(b,b,br.get(b))).join('')}${br.get('')?chip('-','Branşsız',br.get('')):''}</div>`:''}</section><div class="kcl-toolbar">${searchBox(T.q,'Öğretmen, branş veya telefon ara')}${canEdit?`<div class="kcl-imports"><button class="ka-btn ka-btn--secondary" type="button" data-kpd-act="pick-excel">${ICON.sheet}<span>Excel</span></button><button class="ka-btn ka-btn--secondary" type="button" data-kpd-act="export-csv">${ICON.down}<span>Dışa aktar</span></button><input type="file" accept=".xlsx,.xls" data-kpd-excel hidden></div>`:''}</div><div class="kcl-groups" data-kpd-results>${teacherGroups(rows)}</div></section>`;
}

/* =====================================================================
   ÖĞRETMENLER — detay
   ===================================================================== */
function matrixHtml(tt){
  if(!tt.count)return empty('Ders programı yok','Bu öğretmen için ders programında kayıt bulunmuyor.');
  const today=dayIndexToday();
  const head=`<tr><th scope="col" class="kpd-tt-h">Ders</th>${tt.days.map(d=>`<th scope="col"${d===today?' class="is-today" aria-current="date"':''}>${R.DAY_SHORT[d]}</th>`).join('')}</tr>`;
  const body=Array.from({length:tt.slots},(_,i)=>i+1).map(s=>`<tr><th scope="row" class="kpd-tt-h">${s}</th>${tt.days.map(d=>{const c=tt.cell(d,s),cls=d===today?' is-today':'';return c.length?`<td class="kpd-tt-c${cls}" title="${esc(c.map(l=>`${R.lessonClass(l)} ${R.lessonName(l)}`).join(', '))}">${c.map(l=>`<b>${esc(R.lessonClass(l))}</b><span>${esc(R.lessonName(l))}</span>`).join('')}</td>`:`<td class="kpd-tt-0${cls}"></td>`}).join('')}</tr>`).join('');
  const loose=tt.loose.length?`<p class="kpd-note">Saati belirtilmemiş dersler: ${tt.loose.map(l=>esc([l.gun,R.lessonClass(l),R.lessonName(l)].filter(Boolean).join(' · '))).join('; ')}</p>`:'';
  return `<section class="kcl-panel kpd-ttpanel"><div class="kpd-ttscroll"><table class="kpd-tt"><thead>${head}</thead><tbody>${body}</tbody></table></div>${loose}</section>`;
}
function normHtml(id){
  const n=global.PeopleImportUI?.teacherNormData?.(id);
  if(!n||!n.rows.length)return'';
  const diff=(f,nm)=>nm==null?'<span class="kpd-diff">—</span>':`<span class="kpd-diff ${f-nm>0?'is-over':f-nm<0?'is-under':'is-ok'}">${f-nm>0?'+':''}${f-nm}</span>`;
  return `<section class="kcl-panel kpd-norm"><h3>Haftalık norm analizi</h3><ul>${n.rows.map(r=>`<li><span class="kpd-norm-n"><strong>${esc(r.ders)}</strong><small>${esc(r.sinif)}</small></span><span class="kpd-num"><b>${r.norm==null?'—':r.norm}</b><small>norm</small></span><span class="kpd-num"><b>${r.fiili}</b><small>fiili</small></span>${diff(r.fiili,r.norm)}</li>`).join('')}<li class="is-total"><span class="kpd-norm-n"><strong>Toplam</strong></span><span class="kpd-num"><b>${n.toplamNorm||'—'}</b><small>norm</small></span><span class="kpd-num"><b>${n.toplamFiili}</b><small>fiili</small></span>${diff(n.toplamFiili,n.toplamNorm||null)}</li></ul></section>`;
}
function dutyRows(list,past){
  return `<ul class="kpd-rows">${list.map(x=>{const k=H.leaveDateKey(x.tarih);return `<li class="${past?'is-past':''}">${dateBlock(x.tarih)}<span class="kpd-row-main"><strong>${esc(H.dutyPlace(x)||'Nöbet')}</strong><small>${esc(x.gun||R.dayName(x.tarih))}</small></span>${k===H.localDateKey()?'<span class="kpd-tag is-duty">Bugün</span>':''}</li>`}).join('')}</ul>`;
}
function docGroup(o,type,title,rows){
  if(!rows.length)return'';
  const labels=global.BelgeDurumuService?.etiketler?.(type)||[],editable=canDocStatus(o);
  if(!labels.length)return'';
  /* Yıllık / BEP planı sınıf bazında bağımsız atanabilir: yalnız kaydın geçerli kontrolleri gösterilir ve sayılır. */
  const act=k=>global.BelgeDurumuService?.aktifIndexler?.(type,k)||labels.map((_,i)=>i);
  const done=rows.reduce((n,k)=>n+act(k).filter(i=>!!k.kontroller?.[i]).length,0),all=rows.reduce((n,k)=>n+act(k).length,0),state=done===all&&all?'is-complete':done?'is-partial':'';
  return `<section class="kcl-panel kpd-docs"><header class="kpd-docs-head"><h3>${esc(title)}</h3><span class="kpd-count ${state}">${done}/${all}</span></header><div class="kpd-bar"><i data-kpd-w="${all?Math.round(done/all*100):0}"></i></div>${rows.map(k=>`<div class="kpd-doc"><strong>${esc(H.docSummary(type,k))}</strong><div class="kpd-checks">${labels.map((l,i)=>{if(!act(k).includes(i))return'';const on=!!k.kontroller?.[i];return `<label class="kpd-check${on?' is-on':''}${editable?'':' is-ro'}"><input type="checkbox" ${on?'checked':''} ${editable?'':'disabled'} data-kpd-doc data-doc-type="${esc(type)}" data-doc-id="${esc(k.id)}" data-doc-index="${i}"><span>${esc(l)}</span></label>`}).join('')}</div></div>`).join('')}</section>`;
}
function teacherTabs(o){
  const sens=canSensitive(o);
  const infoRows=[infoRow('Telefon',o.telefon||o.telefon1,(o.telefon||o.telefon1)?linkBtn(telHref(o.telefon||o.telefon1),ICON.phone,'Ara'):''),infoRow('E-posta',o.eposta||o.email,(o.eposta||o.email)?linkBtn('mailto:'+(o.eposta||o.email),ICON.mail,'E-posta gönder'):''),infoRow('Ünvan',o.unvan||'Öğretmen'),infoRow('Branş',o.brans),infoRow('Kariyer basamağı',o.kariyerBasamagi||o.kariyer),infoRow('Derece · kademe',[o.derece,o.kademeNo||o.kademeDerece].filter(Boolean).join(' · ')),infoRow('Kadro',o.kadrosu),infoRow('Okul',H.teacherSchool(o)==='—'?'':H.teacherSchool(o)),infoRow('Sorumlu sınıf',teacherClasses(o)),...(sens&&(o.tcKimlikNo||o.tc)?[infoRow('TC kimlik no',o.tcKimlikNo||o.tc)]:[]),...(sens&&o.notlar?[infoRow('Notlar',o.notlar)]:[])];
  return {
    info:`<section class="kcl-panel kcl-info"><h3>Kişisel bilgiler</h3><dl>${infoRows.join('')}</dl></section>`,
    program:()=>matrixHtml(R.timetable(lessonsOf(o.id)))+normHtml(o.id),
    duty:()=>{
      const k=H.localDateKey(),all=dutiesOf(o.id).slice().sort((a,b)=>String(H.leaveDateKey(a.tarih)).localeCompare(String(H.leaveDateKey(b.tarih))));
      if(!all.length)return empty('Nöbet ataması yok','Nöbet çizelgesine eklendiğinde burada görünür.');
      const next=all.filter(x=>H.leaveDateKey(x.tarih)>=k),past=all.filter(x=>H.leaveDateKey(x.tarih)<k).reverse();
      return `${next.length?`<section class="kcl-panel"><h3>Yaklaşan nöbetler <small class="kpd-sub">${next.length}</small></h3>${dutyRows(next,false)}</section>`:''}${past.length?`<section class="kcl-panel"><h3>Geçmiş nöbetler <small class="kpd-sub">${past.length}</small></h3>${dutyRows(past.slice(0,20),true)}${past.length>20?`<p class="kpd-note">En son 20 kayıt gösteriliyor (${past.length} kayıt var).</p>`:''}</section>`:''}`;
    },
    roles:()=>{
      const clubs=H.relatedRows('sosyalKulupler',o.id),guides=H.relatedRows('rehberlik',o.id),days=H.relatedRows('belirliGunler',o.id),com=committeesOf(o.id),cls=teacherClasses(o);
      const imp=global.PeopleImportUI,manage=k=>imp?.canManageClub?.(k);
      const clubHtml=clubs.length?`<section class="kcl-panel"><h3>Sosyal kulüp danışmanlığı</h3><ul class="kpd-rows">${clubs.map(k=>`<li><span class="kpd-row-ic">${ICON.group}</span><span class="kpd-row-main"><strong>${esc(k.ad||k.kulupAdi||'Sosyal kulüp')}</strong><small>${imp?.clubStudents?.(k.id).length??0} öğrenci</small></span><span class="kpd-row-acts"><button class="kcl-chip" type="button" data-kpd-act="club-list" data-id="${esc(k.id)}"><span>Liste</span></button>${manage(k)?`<button class="kcl-chip" type="button" data-kpd-act="club-add" data-id="${esc(k.id)}"><span>Öğrenci ekle</span></button>`:''}</span></li>`).join('')}</ul></section>`:'';
      const parts=[cls?`<section class="kcl-panel"><h3>Sınıf öğretmenliği</h3><p class="kpd-lead">${esc(cls)}</p></section>`:'',clubHtml,guides.length?`<section class="kcl-panel"><h3>Rehberlik</h3><ul class="kpd-rows">${guides.map(g=>`<li><span class="kpd-row-main"><strong>${esc(g.ad||g.baslik||g.sinif||'Rehberlik')}</strong><small>${esc([g.sinif,g.danisman].filter(Boolean).join(' · '))}</small></span></li>`).join('')}</ul></section>`:'',days.length?`<section class="kcl-panel"><h3>Belirli gün ve haftalar</h3><ul class="kpd-rows">${days.map(x=>`<li><span class="kpd-row-main"><strong>${esc(x.ad||x.baslik||'Etkinlik')}</strong><small>${esc(R.dateTR(x.tarihBaslangic||x.tarih))}</small></span></li>`).join('')}</ul></section>`:'',com.length?`<section class="kcl-panel"><h3>Kurul ve komisyonlar</h3><ul class="kpd-rows">${com.map(x=>`<li><span class="kpd-row-main"><strong>${esc(x.ad||'Kurul / komisyon')}</strong><small>${esc([x.egitimOgretimYili,String(x.baskanId||'')===String(o.id)?'Başkan':(x.yedekUyeler||[]).some(m=>m?.tur==='ogretmen'&&String(m.id)===String(o.id))?'Yedek üye':'Asil üye'].filter(Boolean).join(' · '))}</small></span></li>`).join('')}</ul></section>`:''].filter(Boolean);
      return parts.length?parts.join(''):empty('Görev kaydı yok','Sınıf, kulüp, rehberlik veya kurul görevi bulunmuyor.');
    },
    docs:()=>{
      const leaves=leavesOf(o.id),docs=arr('digerEvrak').filter(x=>x.ogretmenId===o.id||x.personelId===o.id);
      const groups=sens?[docGroup(o,'sosyalKulupler','Sosyal kulüpler',H.relatedRows('sosyalKulupler',o.id)),docGroup(o,'belirliGunler','Belirli gün ve haftalar',H.relatedRows('belirliGunler',o.id)),docGroup(o,'bepPlani','Yıllık / BEP planları',H.relatedRows('bepPlani',o.id)),docGroup(o,'zumre','Zümre',H.relatedRows('zumre',o.id)),docGroup(o,'sok','ŞÖK',H.relatedRows('sok',o.id)),docGroup(o,'rehberlik','Rehberlik',H.relatedRows('rehberlik',o.id)),docGroup(o,'maarifRapor','Maarif raporları',H.relatedRows('maarifRapor',o.id))].filter(Boolean):[];
      const leaveHtml=sens?`<section class="kcl-panel"><header class="kpd-docs-head"><h3>İzin ve raporlar</h3>${canEditTeachers()?`<button class="kcl-chip" type="button" data-kpd-act="t-leave-add">${ICON.plus}<span>Ekle</span></button>`:''}</header>${leaves.length?`<ul class="kpd-rows">${leaves.map(x=>`<li><span class="kpd-row-main"><strong>${esc(x.tur||x.izinTuru||'İzin / rapor')}</strong><small>${esc(R.dateTR(x.baslangicTarihi||x.baslangic))}${x.bitisTarihi||x.bitis?' – '+esc(R.dateTR(x.bitisTarihi||x.bitis)):''}</small></span></li>`).join('')}</ul>`:'<p class="kpd-note">İzin veya rapor kaydı yok.</p>'}</section>`:'';
      const docHtml=`<section class="kcl-panel"><h3>Diğer evrak</h3>${docs.length?`<ul class="kpd-rows">${docs.map(x=>`<li><span class="kpd-row-main"><strong>${esc(x.baslik||x.ad||x.evrakTuru||'Evrak')}</strong><small>${esc(R.dateTR(x.tarih))}</small></span></li>`).join('')}</ul>`:'<p class="kpd-note">Evrak kaydı yok.</p>'}</section>`;
      return `${sens?(groups.length?groups.join(''):`<section class="kcl-panel"><h3>Belge durumu</h3><p class="kpd-note">Bu öğretmene ait belge kaydı yok.</p></section>`):''}${own(o)?'<p class="kpd-note kpd-note--box">Kendi belge durumunuzu siz işaretleyemezsiniz; bu alan yetkili kullanıcı tarafından güncellenir.</p>':''}${leaveHtml}${docHtml}`;
    }
  };
}
function actionBtn(act,id,icon,label){return `<button class="kpd-act" type="button" data-kpd-act="${act}"${id?` data-id="${esc(id)}"`:''}>${icon}<b>${label}</b></button>`}
function teacherDetail(o){
  const id=esc(o.id),name=fullName(o),phone=o.telefon||o.telefon1||'',tabs=teacherTabs(o),lessons=lessonsOf(o.id),duties=dutiesOf(o.id),cls=teacherClasses(o);
  const roleN=H.relatedRows('sosyalKulupler',o.id).length+H.relatedRows('rehberlik',o.id).length+(cls?1:0),leave=H.teacherOnLeave(o.id),sens=canSensitive(o);
  const list=[['info','Genel'],['program','Program'],['duty','Nöbet'],['roles','Görevler'],['docs','Belgeler']];
  if(!list.some(x=>x[0]===T.tab))T.tab='info';
  const body=typeof tabs[T.tab]==='function'?tabs[T.tab]():tabs[T.tab];
  const wa=phone&&waHref(phone);
  const acts=[wa?`<a class="kpd-act" href="${esc(wa)}" target="_blank" rel="noopener">${ICON.wa}<b>WhatsApp</b></a>`:`<span class="kpd-act is-off" aria-disabled="true">${ICON.wa}<b>WhatsApp</b></span>`,phone?`<a class="kpd-act" href="${esc(telHref(phone))}">${ICON.phone}<b>Ara</b></a>`:`<span class="kpd-act is-off" aria-disabled="true">${ICON.phone}<b>Ara</b></span>`,own(o)?'':actionBtn('t-message',o.id,ICON.msg,'Mesaj'),actionBtn('t-tab-program',o.id,ICON.cal,'Program'),canTeacherReport(o)?actionBtn('t-report',o.id,ICON.print,'Rapor'):''].join('');
  return `<section class="kcl-page kcl-detail kpd-page"><div class="ka-detail-topbar ka-class-detail-topbar"><button class="ka-icon-button" type="button" data-kpd-act="t-back" aria-label="Geri">‹</button><h2>${esc(name)}</h2>${canEditTeachers()?`<button class="ka-icon-button" type="button" data-kpd-act="t-edit" data-id="${id}" aria-label="Düzenle">✎</button>`:'<span></span>'}</div><div class="ka-class-hero kpd-hero"><span class="ka-class-hero-avatar kpd-hero-av">${photoOf(o)?`<img src="${esc(photoOf(o))}" alt="">`:esc(initials(o))}</span><div><h1>${esc(name)}</h1><p>${esc([o.unvan||'Öğretmen',o.brans].filter(Boolean).join(' · '))}</p><strong>${esc(leave?'Bugün izinli':cls?cls+' sınıf öğretmeni':'Aktif personel')}</strong></div></div><div class="kpd-actions" role="group" aria-label="Hızlı işlemler">${acts}</div>${kpis([[lessons.length,'Ders saati'],[todayLessons(o.id).length,'Bugün'],[duties.length,'Nöbet'],[roleN,'Görev']])}${tabsHtml(list.filter(x=>x[0]!=='docs'||sens||true),T.tab,'t-tab')}<div class="kpd-tab" data-kpd-tab="${T.tab}">${body}</div></section>`;
}

/* =====================================================================
   ÖĞRENCİLER — liste
   ===================================================================== */
function studentMatch(v){
  const q=norm(S.q.trim());
  if(S.cls&&v.sinifId!==S.cls)return false;
  if(S.level&&classLevel(classOf(v.sinifId))!==S.level)return false;
  if(S.gender&&v.cinsiyet!==S.gender)return false;
  return !q||norm([v.ogrenciAdi,v.ogrenciNo,v.veliAdi,v.telefon,v.telefon1,v.telefon2,v.telefon3,className(v.sinifId),v.servisAdi,v.kulupAdi].filter(Boolean).join(' ')).includes(q);
}
function studentRow(v){
  const g=v.cinsiyet==='Kız'?'is-girl':v.cinsiyet==='Erkek'?'is-boy':'';
  return `<button class="kcl-stu" type="button" data-kpd-act="s-open" data-id="${esc(v.id)}"><span class="kcl-stu-av ${g}">${esc(stuInitial(v))}</span><span class="kcl-stu-main"><strong>${esc(v.ogrenciAdi||'Öğrenci')}</strong><small>${v.ogrenciNo?'No '+esc(v.ogrenciNo)+' · ':''}${esc(v.veliAdi||'Veli bilgisi yok')}</small></span>${v.servisAdi?`<span class="kcl-tag">${esc(v.servisAdi)}</span>`:''}<span class="kcl-stu-go">${ICON.chev}</span></button>`;
}
function studentGroups(){
  const list=students().filter(studentMatch);
  if(!list.length)return students().length?empty('Öğrenci bulunamadı','Aramayı veya süzgeçleri değiştirin.'):empty('Henüz öğrenci eklenmedi',canAddStudents()?'“Öğrenci” ile ilk kaydı oluşturun veya Sınıflar sayfasından Excel / e-Okul listesi aktarın.':'Öğrenciler eklendiğinde burada görünür.');
  const groups=new Map();
  list.sort((a,b)=>trSort(a.ogrenciAdi,b.ogrenciAdi)).forEach(v=>{const k=v.sinifId&&classOf(v.sinifId)?v.sinifId:'';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(v)});
  return [...groups.entries()].sort(([a],[b])=>!a?1:!b?-1:trSort(className(a),className(b))).map(([id,items])=>{const g=items.filter(v=>v.cinsiyet==='Kız').length,b=items.filter(v=>v.cinsiyet==='Erkek').length;return `<section class="kcl-group"><header class="kcl-group-head"><h2>${esc(id?className(id):'Sınıfsız')}</h2><span>${items.length} öğrenci · ${g} kız · ${b} erkek</span></header><div class="kcl-students">${items.map(studentRow).join('')}</div></section>`}).join('');
}
function studentList(){
  const ss=students(),all=classes(),girls=ss.filter(v=>v.cinsiyet==='Kız').length,boys=ss.filter(v=>v.cinsiyet==='Erkek').length;
  const lvOf=new Map(all.map(s=>[s.id,classLevel(s)])),per={};ss.forEach(v=>{const l=lvOf.get(v.sinifId);if(l)per[l]=(per[l]||0)+1});
  const levels=[...new Set(all.map(classLevel).filter(Boolean))].sort((a,b)=>Number(a)-Number(b)),max=Math.max(1,...levels.map(l=>per[l]||0));
  const lvBtn=x=>{const n=x?(per[x]||0):ss.length,pct=x?Math.max(8,Math.round(n/max*100)):100;return `<button class="kcl-lv${S.level===x?' active':''}" type="button" data-kpd-act="s-level" data-v="${esc(x)}" aria-pressed="${S.level===x}"><span class="kcl-lv-bar">${x?`<i data-kcl-pct="${pct}"></i>`:ICON.stack}</span><b>${x?esc(x)+'.':'Tümü'}</b><small>${n}</small></button>`};
  const sub=S.level?all.filter(s=>classLevel(s)===S.level).sort((a,b)=>trSort(a.ad,b.ad)):[];
  const cn=id=>ss.filter(v=>v.sinifId===id).length;
  const seg=(v,l)=>`<button class="${S.gender===v?'active':''}" type="button" data-kpd-act="s-gender" data-v="${v}" aria-pressed="${S.gender===v}">${l}</button>`;
  return `<section class="kcl-page kcl-list kpd-page"><div class="ka-row ka-row--between ka-people-page-head"><div><small class="ka-people-kicker">ÖĞRENCİ &amp; VELİ</small><h1>Öğrenciler</h1><p class="ka-muted">Öğrenci, veli ve sınav bilgilerine hızlı erişim.</p></div><div class="ka-class-head-actions">${canAddStudents()?`<button class="ka-btn ka-class-add" type="button" data-kpd-act="s-add">${ICON.plus}<span>Öğrenci</span></button>`:''}</div></div><section class="kcl-overview" aria-label="Öğrenci özeti"><div class="kcl-kpis"><div><span class="kcl-n">${ss.length}</span><small>Öğrenci</small></div><div class="is-girl"><span class="kcl-n">${girls}</span><small>Kız</small></div><div class="is-boy"><span class="kcl-n">${boys}</span><small>Erkek</small></div><div><span class="kcl-n">${all.length}</span><small>Sınıf</small></div></div>${genderBar(girls,boys,'kcl-split--wide')}${levels.length?`<div class="kcl-levels" role="group" aria-label="Seviye filtresi">${['',...levels].map(lvBtn).join('')}</div>`:''}${sub.length?`<div class="kpd-chips" role="group" aria-label="Sınıf filtresi"><button class="kcl-chip${S.cls?'':' is-set'}" type="button" data-kpd-act="s-class" data-v=""><span>Tüm ${esc(S.level)}. sınıflar</span></button>${sub.map(s=>`<button class="kcl-chip${S.cls===s.id?' is-set':''}" type="button" data-kpd-act="s-class" data-v="${esc(s.id)}" aria-pressed="${S.cls===s.id}"><span>${esc(s.ad)}</span><b>${cn(s.id)}</b></button>`).join('')}</div>`:''}</section><div class="kcl-toolbar">${searchBox(S.q,'Öğrenci, veli, numara veya sınıf ara')}<div class="kpd-seg" role="group" aria-label="Cinsiyet">${seg('','Tümü')}${seg('Kız','Kız')}${seg('Erkek','Erkek')}</div></div><div class="kcl-groups" data-kpd-results>${studentGroups()}</div></section>`;
}

/* =====================================================================
   ÖĞRENCİLER — detay
   ===================================================================== */
function contactRows(v){
  return [1,2,3].map(i=>{const tel=i===1?(v.telefon1||v.telefon):v['telefon'+i],rel=v['yakinlik'+i]||(i===1?v.yakinlik:'');return tel?{tel,rel:rel||(i===1?'Veli':'İletişim '+i)}:null}).filter(Boolean);
}
function examCard(r,M){
  const lg=Number.isFinite(r.score),val=lg?M.fmt(r.score):M.fmt(r.net),lab=lg?'LGS':'Net';
  const stats=[Number.isFinite(r.score)?['LGS puanı',M.fmt(r.score)]:null,Number.isFinite(r.net)?['Toplam net',M.fmt(r.net)]:null,r.rank!=null?['Genel sıra',`${M.intFmt(r.rank)}${r.count!=null?' / '+M.intFmt(r.count):''}`]:null,r.crank!=null?['Sınıf sırası',`${M.intFmt(r.crank)}${r.ccount!=null?' / '+M.intFmt(r.ccount):''}`]:null].filter(Boolean);
  const table=r.lessons.length?`<div class="kpd-exam-tw"><table class="kpd-exam-t"><thead><tr><th scope="col">Ders</th><th scope="col">D</th><th scope="col">Y</th><th scope="col">B</th><th scope="col">Net</th></tr></thead><tbody>${r.lessons.map(x=>`<tr><th scope="row">${esc(x.name)}</th><td>${esc(M.intFmt(x.d))}</td><td>${esc(M.intFmt(x.y))}</td><td>${x.b==null?'—':esc(M.intFmt(x.b))}</td><td><b>${esc(M.fmt(x.n))}</b></td></tr>`).join('')}</tbody></table></div>`:'';
  return `<details class="kpd-exam"><summary><span class="kpd-exam-ic is-${r.type==='Deneme'?'d':'t'}">${r.type==='Deneme'?'D':'T'}</span><span class="kpd-exam-main"><strong>${esc(r.ad)}</strong><small>${esc(r.type)}${r.tarih?' · '+esc(R.dateTR(r.tarih)):''}</small></span><span class="kpd-exam-val"><b>${esc(val)}</b><small>${lab}</small></span><span class="kpd-exam-chev">${ICON.chev}</span></summary>${stats.length||table?`<div class="kpd-exam-body">${stats.length?`<div class="kpd-exam-stats">${stats.map(([l,x])=>`<div><small>${esc(l)}</small><b>${esc(x)}</b></div>`).join('')}</div>`:''}${table}</div>`:''}</details>`;
}
function studentTabsBody(v){
  const M=R.examMath(),rows=R.examRows(v),att=R.attendanceOf(v),svc=v.servisAdi||arr('servisler').find(s=>s.id===v.servisId)?.guzergah||'',club=v.kulupAdi||arr('sosyalKulupler').find(k=>k.id===v.kulupId)?.ad||'',contacts=contactRows(v);
  return {
    info:()=>`<section class="kcl-panel kcl-info"><h3>Öğrenci bilgileri</h3><dl>${infoRow('Sınıf',className(v.sinifId))}${infoRow('Öğrenci numarası',v.ogrenciNo)}${infoRow('Cinsiyet',v.cinsiyet)}${infoRow('Doğum tarihi',v.dogumTarihi?R.dateTR(v.dogumTarihi):'')}${infoRow('Kan grubu',v.kanGrubu)}${infoRow('TC kimlik no',v.tcKimlikNo||v.tc)}</dl></section><section class="kcl-panel kcl-info"><h3>Okul</h3><dl>${infoRow('Servis',svc)}${infoRow('Sosyal kulüp',club)}${infoRow('Notlar',v.notlar)}</dl></section>`,
    guardian:()=>`<section class="kcl-panel kcl-info"><h3>Veli ve iletişim</h3><dl>${infoRow('Veli adı',v.veliAdi)}${contacts.length?contacts.map(c=>infoRow(c.rel,c.tel,`<span class="kpd-mini">${waHref(c.tel)?linkBtn(waHref(c.tel),ICON.wa,c.rel+' WhatsApp',true):''}${linkBtn(telHref(c.tel),ICON.phone,c.rel+' ara')}</span>`)).join(''):infoRow('Telefon','')}${infoRow('E-posta',v.eposta||v.email)}${infoRow('Adres',v.adres)}</dl></section>`,
    exams:()=>{
      const d=rows.filter(r=>r.type==='Deneme'),t=rows.filter(r=>r.type==='Test'),shown=S.exam==='deneme'?d:S.exam==='test'?t:rows;
      if(!rows.length)return empty('Henüz sınav sonucu yok','Deneme veya test sonucu eklendiğinde burada görünür.');
      const trend=R.trendSvg(R.trendPoints(rows)),seg=(k,l,n)=>`<button class="${S.exam===k?'active':''}" type="button" data-kpd-act="s-exam" data-v="${k}" aria-pressed="${S.exam===k}">${l} <small>${n}</small></button>`;
      return `${trend?`<section class="kcl-panel kpd-trend"><h3>Net gelişimi</h3>${trend}</section>`:''}<div class="kpd-seg kpd-seg--wide" role="group" aria-label="Sınav türü">${seg('all','Tümü',rows.length)}${seg('deneme','Deneme',d.length)}${seg('test','Test',t.length)}</div><div class="kpd-exams">${shown.length?shown.map(r=>examCard(r,M)).join(''):empty('Bu türde sonuç yok','Başka bir tür seçin.')}</div>`;
    },
    attendance:()=>{
      const rowsA=att.list.filter(x=>x.durum!=='var'),label={yok:'Yok',gec:'Geç',izinli:'İzinli'};
      if(!att.list.length)return empty('Devamsızlık kaydı yok','Yoklama alındığında bu öğrencinin kayıtları burada görünür.');
      return `<section class="kcl-overview kcl-overview--detail kpd-att"><div class="kcl-kpis"><div><span class="kcl-n">${att.sum.yok}</span><small>Yok</small></div><div><span class="kcl-n">${att.sum.gec}</span><small>Geç</small></div><div><span class="kcl-n">${att.sum.izinli}</span><small>İzinli</small></div><div><span class="kcl-n">${att.sum.var}</span><small>Var</small></div></div></section>${rowsA.length?`<section class="kcl-panel"><h3>Kayıtlar <small class="kpd-sub">${rowsA.length}</small></h3><ul class="kpd-rows">${rowsA.slice(0,60).map(x=>`<li>${dateBlock(x.tarih)}<span class="kpd-row-main"><strong>${esc(R.dayName(x.tarih))}</strong>${x.girenAdi?`<small>${esc(x.girenAdi)}</small>`:''}</span><span class="kpd-state is-${esc(x.durum)}">${esc(label[x.durum]||x.durum)}</span></li>`).join('')}</ul>${rowsA.length>60?`<p class="kpd-note">En son 60 kayıt gösteriliyor.</p>`:''}</section>`:'<p class="kpd-note kpd-note--box">Bu öğrenci için yok / geç / izinli kaydı bulunmuyor.</p>'}`;
    },
    _rows:rows,_att:att,_contacts:contacts
  };
}
function studentDetail(v){
  const id=esc(v.id),tabs=studentTabsBody(v),M=R.examMath(),phone=studentPhone(v),wa=phone&&waHref(phone);
  const list=[['info','Genel'],['guardian','Veli'],['exams','Sınavlar'],['attendance','Devamsızlık']];
  if(!list.some(x=>x[0]===S.tab))S.tab='info';
  const lastNet=tabs._rows.map(r=>r.net).find(n=>Number.isFinite(n)),g=v.cinsiyet==='Kız'?' is-girl':v.cinsiyet==='Erkek'?' is-boy':'';
  const acts=[wa?`<a class="kpd-act" href="${esc(wa)}" target="_blank" rel="noopener">${ICON.wa}<b>WhatsApp</b></a>`:`<span class="kpd-act is-off" aria-disabled="true">${ICON.wa}<b>WhatsApp</b></span>`,phone?`<a class="kpd-act" href="${esc(telHref(phone))}">${ICON.phone}<b>Ara</b></a>`:`<span class="kpd-act is-off" aria-disabled="true">${ICON.phone}<b>Ara</b></span>`,`<button class="kpd-act" type="button" data-kpd-act="s-tab-exams">${ICON.doc}<b>Sınavlar</b></button>`,`<button class="kpd-act" type="button" data-kpd-act="s-tab-guardian">${ICON.user}<b>Veli</b></button>`,`<button class="kpd-act" type="button" data-kpd-act="s-report" data-id="${id}">${ICON.print}<b>Rapor</b></button>`].join('');
  return `<section class="kcl-page kcl-detail kpd-page"><div class="ka-detail-topbar ka-class-detail-topbar"><button class="ka-icon-button" type="button" data-kpd-act="s-back" aria-label="Geri">‹</button><h2>Öğrenci</h2>${canEditStudents()?`<button class="ka-icon-button" type="button" data-kpd-act="s-edit" data-id="${id}" aria-label="Düzenle">✎</button>`:'<span></span>'}</div><div class="ka-class-hero kpd-hero${g}"><span class="ka-class-hero-avatar kpd-hero-av">${esc(stuInitial(v))}</span><div><h1>${esc(v.ogrenciAdi||'Öğrenci')}</h1><p>${esc(className(v.sinifId))}${v.ogrenciNo?' · No '+esc(v.ogrenciNo):''}</p><strong>${esc(v.veliAdi?'Veli: '+v.veliAdi:v.cinsiyet||'Aktif öğrenci')}</strong></div></div><div class="kpd-actions" role="group" aria-label="Hızlı işlemler">${acts}</div>${kpis([[tabs._rows.length,'Sınav'],[M.fmt(lastNet),'Son net'],[tabs._att.sum.yok,'Devamsız'],[tabs._att.sum.gec,'Geç']])}${tabsHtml(list,S.tab,'s-tab')}<div class="kpd-tab" data-kpd-tab="${S.tab}">${tabs[S.tab]()}</div></section>`;
}

/* =====================================================================
   FORMLAR
   ===================================================================== */
const field=(label,input,cls='')=>`<label class="ka-field${cls?' '+cls:''}"><span class="ka-field__label">${label}</span>${input}</label>`;
const val=v=>esc(v??'');
function openModal(title,body,onSave,onDelete=null){
  $('[data-kpd-modal]')?.remove();
  const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.kpdModal='';
  ov.innerHTML=`<form class="ka-modal kpd-form" novalidate><div class="ka-modal__header"><h2>${esc(title)}</h2><button class="ka-icon-button" type="button" data-close aria-label="Kapat">×</button></div><div class="ka-modal__body ka-stack">${body}</div><div class="ka-modal__footer">${onDelete?`<button class="ka-btn ka-btn--danger" type="button" data-kpd-delete>${ICON.trash}<span>Sil</span></button><span class="ka-grow"></span>`:''}<button class="ka-btn ka-btn--secondary" type="button" data-close>Vazgeç</button><button class="ka-btn" type="submit">Kaydet</button></div></form>`;
  document.body.appendChild(ov);
  $$('[data-close]',ov).forEach(b=>b.onclick=()=>ov.remove());
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove()});
  $('[data-kpd-delete]',ov)?.addEventListener('click',async()=>{try{if(await onDelete()!==false)ov.remove()}catch(err){toast('Silinemedi: '+(err?.message||err))}});
  const form=$('form',ov);
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity()){return}
    const btn=$('button[type=submit]',form);btn.disabled=true;
    try{await onSave(new FormData(form));ov.remove()}catch(err){console.error('[PeopleDirectory/save]',err);toast('Kaydedilemedi: '+(err?.message||err));btn.disabled=false}
  });
  requestAnimationFrame(()=>$('input:not([type=hidden]),select,textarea',form)?.focus({preventScroll:true}));
  return ov;
}
const str=(fd,k)=>String(fd.get(k)||'').trim();
function teacherForm(id=''){
  const o=teachers().find(x=>x.id===id)||{},classId=classes().find(s=>s.sinifOgretmeniId===id)?.id||'';
  const branches=[...new Set([...branchesOf().keys(),o.brans].filter(Boolean))].sort(trSort);
  const school=H.teacherSchool(o);
  openModal(id?'Öğretmeni düzenle':'Yeni öğretmen',`<div class="ka-grid">${field('Ad *',`<input name="ad" required value="${val(o.ad)}" autocomplete="off">`)}${field('Soyad *',`<input name="soyad" required value="${val(o.soyad)}" autocomplete="off">`)}</div><div class="ka-grid">${field('Ünvan',`<input name="unvan" value="${val(o.unvan||'Öğretmen')}">`)}${field('Branş',`<input name="brans" list="kpdBranches" value="${val(o.brans)}" autocomplete="off"><datalist id="kpdBranches">${branches.map(b=>`<option value="${esc(b)}"></option>`).join('')}</datalist>`)}</div><div class="ka-grid">${field('Telefon',`<input name="telefon" inputmode="tel" value="${val(o.telefon)}">`)}${field('E-posta',`<input name="eposta" type="email" value="${val(o.eposta||o.email)}">`)}</div><div class="ka-grid">${field('Cinsiyet',`<select name="cinsiyet"><option value="">Belirtilmedi</option><option ${o.cinsiyet==='Kadın'?'selected':''}>Kadın</option><option ${o.cinsiyet==='Erkek'?'selected':''}>Erkek</option></select>`)}${field('Sınıf öğretmenliği',`<select name="sinifId"><option value="">— Yok —</option>${classes().slice().sort((a,b)=>trSort(a.ad,b.ad)).map(s=>`<option value="${esc(s.id)}" ${s.id===classId?'selected':''}>${esc(s.ad||'Sınıf')}</option>`).join('')}</select>`)}</div><div class="ka-field"><span class="ka-field__label">Fiilen çalıştığı okul</span><div class="ka-row"><label class="ka-check"><input type="checkbox" name="ilkokul" ${o.ilkokul||norm(school).includes('ilkokul')?'checked':''}> İlkokul</label><label class="ka-check"><input type="checkbox" name="ortaokul" ${o.ortaokul||norm(school).includes('ortaokul')?'checked':''}> Ortaokul</label></div></div><div class="ka-grid">${field('Kariyer basamağı',`<input name="kariyerBasamagi" value="${val(o.kariyerBasamagi||'Öğretmen')}">`)}${field('Kadro',`<input name="kadrosu" value="${val(o.kadrosu)}">`)}</div><div class="ka-grid">${field('Derece',`<input name="derece" value="${val(o.derece)}">`)}${field('Kademe',`<input name="kademeNo" value="${val(o.kademeNo||o.kademeDerece)}">`)}</div>${field('TC kimlik no',`<input name="tcKimlikNo" inputmode="numeric" maxlength="11" value="${val(o.tcKimlikNo||o.tc)}">`)}${field('Notlar',`<textarea name="notlar">${val(o.notlar)}</textarea>`)}`,
  async fd=>{
    const rec={ad:str(fd,'ad'),soyad:str(fd,'soyad'),unvan:str(fd,'unvan'),kariyerBasamagi:str(fd,'kariyerBasamagi'),brans:str(fd,'brans'),kadrosu:str(fd,'kadrosu'),ilkokul:fd.get('ilkokul')==='on',ortaokul:fd.get('ortaokul')==='on',derece:str(fd,'derece'),kademeNo:str(fd,'kademeNo'),tcKimlikNo:str(fd,'tcKimlikNo'),telefon:str(fd,'telefon'),eposta:str(fd,'eposta'),cinsiyet:str(fd,'cinsiyet'),notlar:str(fd,'notlar'),aktif:true};
    const res=await global.OgretmenService.kaydet(id||null,rec),tid=id||res?.id||res?.docId,target=str(fd,'sinifId');
    if(tid){
      for(const s of classes().filter(x=>x.sinifOgretmeniId===tid&&x.id!==target))await global.SiniflarRepository.sinifGuncelle(s.id,{sinifOgretmeniId:null});
      if(target&&classOf(target)?.sinifOgretmeniId!==tid)await global.SiniflarRepository.sinifGuncelle(target,{sinifOgretmeniId:tid});
    }
    toast('Öğretmen kaydedildi.');
    if(tid){T.id=tid;T.tab='info'}
    scheduleRender(true);
  });
}
const RELATIONS=['Anne','Baba','Diğer'];
const relOptions=(v,blank)=>`${blank?'<option value="">—</option>':''}${RELATIONS.map(x=>`<option ${v===x?'selected':''}>${x}</option>`).join('')}`;
function clubOptions(classId,cur){
  return `<option value="">— Kulüp seçilmedi —</option>${arr('sosyalKulupler').filter(k=>k.id===cur||(k.aktif!==false&&(!Array.isArray(k.sinifIdler)||!k.sinifIdler.length||k.sinifIdler.includes(classId)))).sort((a,b)=>trSort(a.ad||a.kulupAdi,b.ad||b.kulupAdi)).map(k=>`<option value="${esc(k.id)}" ${k.id===cur?'selected':''}>${esc(k.ad||k.kulupAdi||'Sosyal kulüp')}</option>`).join('')}`;
}
function studentForm(id='',presetClass=''){
  const v=students().find(x=>x.id===id)||{sinifId:presetClass},classId=v.sinifId||presetClass||'',teacherUser=isTeacherUser();
  const ov=openModal(id?'Öğrenciyi düzenle':'Yeni öğrenci',`${field('Sınıf',`<select name="sinifId" data-kpd-class><option value="">— Sınıfsız —</option>${classes().slice().sort((a,b)=>trSort(a.ad,b.ad)).map(s=>`<option value="${esc(s.id)}" ${s.id===classId?'selected':''}>${esc(s.ad)}</option>`).join('')}</select>`)}<div class="ka-grid">${field('Öğrenci adı soyadı *',`<input name="ogrenciAdi" required value="${val(v.ogrenciAdi)}" autocomplete="off">`)}${field('Öğrenci no',`<input name="ogrenciNo" inputmode="numeric" value="${val(v.ogrenciNo)}">`)}</div><div class="ka-grid">${field('Cinsiyet',`<select name="cinsiyet"><option value="">Belirtilmedi</option><option ${v.cinsiyet==='Kız'?'selected':''}>Kız</option><option ${v.cinsiyet==='Erkek'?'selected':''}>Erkek</option></select>`)}${field('Doğum tarihi',`<input name="dogumTarihi" type="date" value="${val(v.dogumTarihi)}">`)}</div>${field('Veli adı soyadı',`<input name="veliAdi" value="${val(v.veliAdi)}" autocomplete="off">`)}${[1,2,3].map(i=>`<div class="ka-grid">${field('Telefon '+i,`<input name="telefon${i}" inputmode="tel" value="${val(i===1?(v.telefon1||v.telefon):v['telefon'+i])}">`)}${field('Yakınlık '+i,`<select name="yakinlik${i}">${relOptions(i===1?(v.yakinlik1||v.yakinlik||'Anne'):v['yakinlik'+i]||'',i>1)}</select>`)}</div>`).join('')}${field('E-posta',`<input name="eposta" type="email" value="${val(v.eposta||v.email)}">`)}${field('Adres',`<textarea name="adres">${val(v.adres)}</textarea>`)}<div class="ka-grid">${field('Servis',`<select name="servisId"><option value="">— Servis kullanmıyor —</option>${arr('servisler').slice().sort((a,b)=>trSort(a.servisAdi||a.guzergah,b.servisAdi||b.guzergah)).map(s=>`<option value="${esc(s.id)}" ${s.id===v.servisId?'selected':''}>${esc(s.servisAdi||s.guzergah||'Servis')}</option>`).join('')}</select>`)}${field('Sosyal kulüp',`<select name="kulupId" data-kpd-club>${clubOptions(classId,v.kulupId||'')}</select>`)}</div><div class="ka-grid">${field('Kan grubu',`<select name="kanGrubu"><option value="">—</option>${['A Rh+','A Rh-','B Rh+','B Rh-','AB Rh+','AB Rh-','0 Rh+','0 Rh-'].map(x=>`<option ${v.kanGrubu===x?'selected':''}>${x}</option>`).join('')}</select>`)}${field('TC kimlik no',`<input name="tcKimlikNo" inputmode="numeric" maxlength="11" value="${val(v.tcKimlikNo||v.tc)}">`)}</div>${field('Notlar',`<textarea name="notlar">${val(v.notlar)}</textarea>`)}`,
  async fd=>{
    const servisId=str(fd,'servisId'),kulupId=str(fd,'kulupId'),svc=arr('servisler').find(x=>x.id===servisId),club=arr('sosyalKulupler').find(x=>x.id===kulupId),t1=str(fd,'telefon1'),y1=str(fd,'yakinlik1');
    const rec={...v,sinifId:str(fd,'sinifId'),ogrenciAdi:str(fd,'ogrenciAdi'),ogrenciNo:str(fd,'ogrenciNo'),cinsiyet:str(fd,'cinsiyet'),dogumTarihi:str(fd,'dogumTarihi'),veliAdi:str(fd,'veliAdi'),yakinlik:y1,yakinlik1:y1,yakinlik2:str(fd,'yakinlik2'),yakinlik3:str(fd,'yakinlik3'),telefon:t1,telefon1:t1,telefon2:str(fd,'telefon2'),telefon3:str(fd,'telefon3'),eposta:str(fd,'eposta'),adres:str(fd,'adres'),servisId,servisAdi:servisId?(svc?.servisAdi||svc?.guzergah||''):'',kulupId,kulupAdi:kulupId?(club?.ad||club?.kulupAdi||''):'',kanGrubu:str(fd,'kanGrubu'),tcKimlikNo:str(fd,'tcKimlikNo'),notlar:str(fd,'notlar')};
    delete rec.id;
    const res=await global.SiniflarService.veliKaydet(id||null,rec);
    toast('Öğrenci kaydedildi.');
    if(!id&&res?.id){S.id=res.id;S.tab='info'}
    scheduleRender(true);
  },
  id&&canAddStudents()&&!teacherUser?async()=>{
    if(!global.confirm?.(`“${v.ogrenciAdi||'Öğrenci'}” kaydı silinsin mi?`))return false;
    await global.SiniflarService.veliSil(id);S.id='';toast('Öğrenci silindi.');scheduleRender(true);
  }:null);
  const cls=$('[data-kpd-class]',ov),club=$('[data-kpd-club]',ov);
  cls?.addEventListener('change',()=>{const old=club.value;club.innerHTML=clubOptions(cls.value,old);if(![...club.options].some(o=>o.value===old))club.value=''});
}

/* =====================================================================
   DİĞER İŞLEMLER
   ===================================================================== */
function exportTeachersCsv(){
  const rows=[['Ad','Soyad','Ünvan','Branş','Telefon','E-posta','Okul','Sorumlu Sınıf'],...teachers().map(o=>[o.ad||'',o.soyad||'',o.unvan||'',o.brans||'',o.telefon||'',o.eposta||o.email||'',H.teacherSchool(o)==='—'?'':H.teacherSchool(o),teacherClasses(o)])];
  const csv='﻿'+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(';')).join('\n'),a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='ogretmenler.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function importTeachers(file){
  try{if(!global.PeopleImportUI?.importTeachers)throw new Error('İçe aktarma servisi hazır değil.');await global.PeopleImportUI.importTeachers(file)}
  catch(e){console.error('[PeopleDirectory/import]',e);toast('İçe aktarma hatası: '+(e?.message||e))}
}
async function messageTeacher(o){
  if(global.PermissionService&&!can('communication.messages','read'))return toast('Mesajlaşma için yetkiniz yok.');
  try{
    global.AppLoader?.setActiveModule?.('communication');await global.AppLoader?.load?.('communication');
    const svc=global.MesajlasmaService;
    if(svc)try{await svc.konusmaBaslatOgretmenIle(o.id,fullName(o),arr('konusmalar'),o.fotoUrl||o.foto||'')}catch(err){
      if(err?.message==='hesap-yok')return toast('Bu öğretmene bağlı kullanıcı hesabı bulunamadı.');
      if(err?.message==='kendine-mesaj')return toast('Kendinize mesaj gönderemezsiniz.');
      throw err;
    }
    global.CommunicationModule?.openPage?.('messages','Mesajlaşma');
  }catch(e){console.error('[PeopleDirectory/message]',e);toast('Mesajlaşma ekranı açılamadı.')}
}
function addLeave(){
  global.AppLoader?.setActiveModule?.('management');
  global.AppLoader?.load?.('management').then(()=>global.ManagementModule?.openPage?.('dilekce','Dilekçe & İzinler')).catch(()=>toast('İzin ekranı açılamadı.'));
}

/* =====================================================================
   ÇİZİM, OLAYLAR, YAŞAM DÖNGÜSÜ
   ===================================================================== */
function applyDynamic(scope){
  $$('[data-kcl-g]',scope).forEach(el=>{const g=Number(el.dataset.kclG)||0,b=Number(el.dataset.kclB)||0,k=el.children;if(k[0])k[0].style.flexGrow=String(g);if(k[1])k[1].style.flexGrow=String(b)});
  $$('[data-kcl-pct]',scope).forEach(el=>el.style.height=el.dataset.kclPct+'%');
  $$('[data-kpd-w]',scope).forEach(el=>el.style.width=el.dataset.kpdW+'%');
}
let normFor='';
/* Norm analizi planları bir kez yüklenir; her çizimde yeniden istenirse ekran sonsuz yenilenir. */
function prepareNorm(id){
  if(normFor===id)return;normFor=id;preparePeopleData();
  Promise.resolve(global.PeopleImportUI?.prepareTeacherNormData?.()).then(()=>{if(active==='teachers'&&T.id===id)scheduleRender()}).catch(()=>{});
}
function render(){
  if(!root||(active!=='teachers'&&active!=='students')||global.AppStore?.get?.('ui.route')!=='people')return;
  let html='';
  if(active==='teachers'){
    const o=T.id&&teachers().find(x=>x.id===T.id);if(T.id&&!o)T.id='';
    if(o)prepareNorm(o.id);
    html=o?teacherDetail(o):teacherList();
  }else{
    const v=S.id&&students().find(x=>x.id===S.id);if(S.id&&!v)S.id='';
    html=v?studentDetail(v):studentList();
  }
  root.innerHTML=`<section data-people-module data-kpd>${html}</section>`;
  applyDynamic(root);
  global.PermissionService?.apply?.(root);
}
function scheduleRender(now=false){
  if(now){cancelAnimationFrame(renderQueued);renderQueued=0;render();return}
  if(renderQueued)return;
  renderQueued=requestAnimationFrame(()=>{renderQueued=0;const s=$('[data-kpd-search]',root||document);s&&document.activeElement===s?refreshResults():render()});
}
function refreshResults(){
  const out=$('[data-kpd-results]',root);if(!out){render();return}
  out.innerHTML=active==='teachers'?teacherGroups(teacherRows()):studentGroups();
  applyDynamic(out);
}
function topOfPage(){global.scrollTo?.({top:0,behavior:'smooth'})}
function goTeacher(id){T.id=id;T.tab='info';normFor='';render();topOfPage()}
function goStudent(id,from=null){S.id=id;S.tab='info';S.exam='all';if(from!==undefined)origin=from;render();topOfPage()}
function leaveStudent(){
  const o=origin;origin=null;S.id='';
  if(o?.classId&&classesUi.openClass){stopSubs();active='classes';classesUi.openClass(o.classId);topOfPage();return}
  render();topOfPage();
}
function setQuery(value){
  if(active==='teachers')T.q=value;else S.q=value;
  refreshResults();
}
function onClick(e){
  if(e.target.closest('a[href]'))return;
  const el=e.target.closest('[data-kpd-act]');if(!el||!root.contains(el))return;
  const act=el.dataset.kpdAct,id=el.dataset.id||'',v=el.dataset.v??'';
  if(el.closest('[data-kpd-act="t-open"]')&&e.target.closest('[data-kpd-act="t-edit"]')&&act==='t-open')return;
  switch(act){
    case 'clear-search':{if(active==='teachers')T.q='';else S.q='';const i=$('[data-kpd-search]',root);if(i){i.value='';i.focus()}refreshResults();break}
    case 'branch':T.branch=T.branch===v?'':v;render();break;
    case 't-open':goTeacher(id);break;
    case 't-edit':teacherForm(id);break;
    case 't-add':teacherForm();break;
    case 't-back':T.id='';normFor='';render();topOfPage();break;
    case 't-tab':T.tab=v||'info';render();break;
    case 't-tab-program':T.tab='program';render();break;
    case 't-message':{const o=teachers().find(x=>x.id===id);if(o)messageTeacher(o);break}
    case 't-report':{const o=teachers().find(x=>x.id===id);if(o&&canTeacherReport(o))R.teacher(o);else toast('Bu rapor için yetkiniz yok.');break}
    case 't-leave-add':addLeave();break;
    case 'club-list':global.PeopleImportUI?.printClubStudents?.(id);break;
    case 'club-add':global.PeopleImportUI?.clubStudentModal?.(id);break;
    case 'pick-excel':$('[data-kpd-excel]',root)?.click();break;
    case 'export-csv':exportTeachersCsv();break;
    case 's-open':goStudent(id,null);break;
    case 's-edit':studentForm(id);break;
    case 's-add':studentForm('',S.cls);break;
    case 's-back':leaveStudent();break;
    case 's-tab':S.tab=v||'info';render();break;
    case 's-tab-exams':S.tab='exams';render();break;
    case 's-tab-guardian':S.tab='guardian';render();break;
    case 's-exam':S.exam=v||'all';render();break;
    case 's-report':{const x=students().find(s=>s.id===id);if(x)R.student(x);break}
    case 's-level':S.level=S.level===v?'':v;S.cls='';render();break;
    case 's-class':S.cls=S.cls===v?'':v;render();break;
    case 's-gender':S.gender=S.gender===v?'':v;render();break;
  }
}
function onKey(e){
  if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('[data-kpd-act="t-open"]')){e.preventDefault();e.target.click()}
}
function onInput(e){if(e.target.matches?.('[data-kpd-search]'))setQuery(e.target.value)}
function onChange(e){
  const t=e.target;
  if(t.matches?.('[data-kpd-excel]')){const f=t.files?.[0];t.value='';if(f)importTeachers(f);return}
  if(t.matches?.('[data-kpd-doc]')){
    const tid=T.id,prev=!t.checked;t.disabled=true;
    Promise.resolve(global.BelgeDurumuService?.kontrolKaydet?.(tid,t.dataset.docType,t.dataset.docId,Number(t.dataset.docIndex),t.checked))
      .then(()=>t.closest('.kpd-check')?.classList.toggle('is-on',t.checked))
      .catch(err=>{t.checked=prev;toast(err?.message==='kendi-belgesi'?'Kendi belge durumunuzu değiştiremezsiniz.':'Belge durumu güncellenemedi.')})
      .finally(()=>{if(t.isConnected)t.disabled=false});
  }
}
let boundRoot=null;
function bind(){
  if(boundRoot===root)return;
  if(boundRoot){boundRoot.removeEventListener('click',onClick);boundRoot.removeEventListener('keydown',onKey);boundRoot.removeEventListener('input',onInput);boundRoot.removeEventListener('change',onChange)}
  root.addEventListener('click',onClick);root.addEventListener('keydown',onKey);root.addEventListener('input',onInput);root.addEventListener('change',onChange);boundRoot=root;
}
function stopSubs(){unsubs.forEach(u=>{try{u()}catch(_){}});unsubs=[];cancelAnimationFrame(renderQueued);renderQueued=0}
function subscribe(){
  stopSubs();
  ['ogretmenler','siniflar','veliler','servisler','dersProgrami','dersListesi','nobetAtamalari','nobetYerleri','sosyalKulupler','belirliGunler','ogretmenIzinleri','personelIzinler','digerEvrak','zumre','sok','bepPlani','rehberlik','maarifRapor','kurulKomisyonlar','yoklama','denemeSonuclari','testSonuclari'].forEach(t=>{const u=global.AppStore?.subscribe?.('data.'+t,()=>scheduleRender());if(u)unsubs.push(u)});
}
function closeModals(){$('[data-kpd-modal]')?.remove()}
function start(page){
  root=root||document.getElementById('v2ModuleRoot');if(!root)return false;
  if(active==='classes')classesUi.unmount();
  active=page;origin=null;T.q='';T.branch='';T.id='';T.tab='info';S.q='';S.level='';S.cls='';S.gender='';S.id='';S.tab='info';S.exam='all';
  bind();subscribe();preparePeopleData();render();return true;
}
function mount(target){
  root=target||document.getElementById('v2ModuleRoot');if(!root)return false;
  if(active==='teachers'||active==='students'){bind();subscribe();render();return true}
  if(active==='classes')return classesUi.mount(root);
  root.replaceChildren();return true;
}
function openPage(page){
  root=root||document.getElementById('v2ModuleRoot');if(!root)return false;
  if(page==='teachers'||page==='students')return start(page);
  if(page==='classes'){stopSubs();closeModals();active='classes';return classesUi.openPage('classes')!==false}
  return false;
}
function openStudent(id,opts={}){
  root=root||document.getElementById('v2ModuleRoot');if(!root)return false;
  const from=opts.classId?{classId:opts.classId}:null;
  if(active==='classes')classesUi.unmount();
  if(active!=='students'){active='students';S.q='';S.level='';S.cls='';S.gender='';bind();subscribe();preparePeopleData()}
  goStudent(id,from);return true;
}
function openTeacherDetail(id){
  if(!id)return false;
  if(active!=='teachers')start('teachers');
  goTeacher(String(id));return true;
}
function unmount(){
  stopSubs();closeModals();
  if(boundRoot){boundRoot.removeEventListener('click',onClick);boundRoot.removeEventListener('keydown',onKey);boundRoot.removeEventListener('input',onInput);boundRoot.removeEventListener('change',onChange);boundRoot=null}
  if(active==='classes')classesUi.unmount();
  active='pending';origin=null;T.id='';S.id='';root=null;
}
function back(){
  const modal=$('[data-kpd-modal]');if(modal){modal.remove();return true}
  if(active==='teachers'&&T.id){T.id='';normFor='';render();return true}
  if(active==='students'&&S.id){leaveStudent();return true}
  return false;
}
function rerender(){if(active==='classes')classesUi.render();else render()}

const api={mount,openPage,render:rerender,unmount,back,openStudent,openTeacherDetail};
global.PeopleDirectory=api;global.PeopleModule=api;
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='people')mount()});
})(window);
