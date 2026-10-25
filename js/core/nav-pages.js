/* Koruk Asistan — NavPages
 * Alt sekmelerin sayfaları (Araçlar/Yönetim, araç grubu, Okul, İletişim, Programım, Ben) burada çizilir.
 * Katalog, rol ve favoriler AppNav'dadır; sayfa açma, geri yığını ve alt çubuk ShellUI'dadır.
 * Bu dosya yalnız #v2ModuleRoot içine HTML yazar ve tıklamaları ShellUI.routeModule / ShellUI.openPage'e yönlendirir.
 */
(function(global){
'use strict';
if(global.NavPages)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const nav=()=>global.AppNav;
const ui=()=>global.ShellUI;
const ic=(name,size,sw)=>nav().icon(name,size,sw);
const fold=v=>String(v||'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
const pad=n=>String(n).padStart(2,'0');
const isoOf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const DAYS=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const DAY_SHORT=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
const MONTH_SHORT=['OCA','ŞUB','MAR','NİS','MAY','HAZ','TEM','AĞU','EYL','EKİ','KAS','ARA'];

/* ── sayfa kimlikleri ── */
function parse(id){
  const s=String(id||'');
  if(s.startsWith('tools:'))return{kind:'group',key:s.slice(6)};
  return{kind:s};
}
function info(id,r=nav().role()){
  const p=parse(id);
  if(p.kind==='tools')return{id:'tools',tab:'tools',title:nav().hub(r).title,parent:''};
  if(p.kind==='group'){const g=nav().group(p.key,r);return g?{id:`tools:${g.key}`,tab:'tools',title:g.label,parent:'tools'}:null}
  if(p.kind==='school')return{id:'school',tab:'school',title:'Okul',parent:''};
  if(p.kind==='comm')return r==='idareci'?{id:'comm',tab:'comm',title:'İletişim',parent:''}:null;
  if(p.kind==='program')return r==='ogretmen'?{id:'program',tab:'program',title:'Programım',parent:''}:{id:'program',tab:'me',title:'Ders programım',parent:'me'};
  if(p.kind==='me')return{id:'me',tab:'me',title:'Ben',parent:''};
  return null;
}

/* ── ortak parçalar ── */
const ico=(name,tone,size=40,glyph=20)=>`<span class="ka-nav-ico" data-tone="${esc(tone||'slate')}" data-size="${size}">${ic(name,glyph)}</span>`;
const gico=(g,tone,size=40)=>`<span class="ka-nav-ico" data-tone="${esc(tone||'slate')}" data-size="${size}">${nav().glyph(g)}</span>`;
const pill=(text,tone='slate')=>`<span class="ka-nav-pill" data-tone="${tone}">${esc(text)}</span>`;
const chevron=()=>`<span class="ka-nav-chev" aria-hidden="true">${ic('chev',18)}</span>`;
const head=(title,sub,right='')=>`<header class="ka-nav-head"><div><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div>${right}</header>`;
function searchBox(placeholder){
  return `<label class="ka-nav-search">${ic('search',18)}<input type="search" class="ka-field-bare" data-nav-search placeholder="${esc(placeholder)}" autocomplete="off" aria-label="${esc(placeholder)}"></label>`;
}
function setupPill(){
  const s=setupProgress();
  if(!s)return `<span class="ka-nav-pill" data-tone="indigo" data-nav-setup hidden></span>`;
  return `<span class="ka-nav-pill" data-tone="${s.done?'green':'indigo'}" data-nav-setup>${s.ready} / ${s.total} hazır</span>`;
}
let setupLoading=false;
function setupProgress(){
  const api=global.SettingsModule;
  if(api?.setupProgress)return api.setupProgress();
  if(!setupLoading&&global.AppLoader?.load){
    setupLoading=true;
    Promise.resolve(global.AppLoader.load('settings')).then(()=>refreshSetup()).catch(()=>{}).finally(()=>{setupLoading=false});
  }
  return null;
}
function refreshSetup(){
  const s=global.SettingsModule?.setupProgress?.();
  $$('[data-nav-setup]').forEach(el=>{
    if(!s){el.hidden=true;return}
    el.hidden=false;el.textContent=`${s.ready} / ${s.total} hazır`;el.dataset.tone=s.done?'green':'indigo';
  });
  $$('[data-nav-setup-bar]').forEach(el=>{if(s){el.max=s.total;el.value=s.ready}});
}

function toolRow(t,{star=false,first=false}={}){
  const pinned=star&&nav().isFavorite(t.id);
  const starBtn=star?`<button type="button" class="ka-nav-star${pinned?' is-on':''}" data-nav-star="${esc(t.id)}" aria-pressed="${pinned}" aria-label="${pinned?'Sık kullandıklardan çıkar':'Sık kullandıklara ekle'}: ${esc(t.label)}"><svg class="ka-ni" width="22" height="22" viewBox="0 0 24 24" fill="${pinned?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${nav().ICONS.star}</svg></button>`:chevron();
  return `<div class="ka-nav-row${first?' is-first':''}"><button type="button" class="ka-nav-row__main" data-nav-tool="${esc(t.id)}">${gico(t.glyph,t.tone,40)}<span class="ka-nav-row__copy"><strong>${esc(t.label)}</strong>${t.sub?`<small>${esc(t.sub)}</small>`:''}</span></button>${starBtn}</div>`;
}
const rowCard=html=>`<div class="ka-nav-rowcard">${html}</div>`;
function linkRow(tool,{sub,right=''}={}){
  return `<button type="button" class="ka-nav-row ka-nav-row__main" data-nav-tool="${esc(tool.id)}">${gico(tool.glyph,tool.tone,40)}<span class="ka-nav-row__copy"><strong>${esc(tool.label)}</strong>${(sub??tool.sub)?`<small>${esc(sub??tool.sub)}</small>`:''}</span>${right||chevron()}</button>`;
}
function tile(t,{wide=false,extra=''}={}){
  return `<button type="button" class="ka-nav-tile${wide?' is-wide':''}" data-nav-tool="${esc(t.id)}">${gico(t.glyph,t.tone,32)}<span class="ka-nav-tile__label">${esc(t.label)}</span>${extra}</button>`;
}
function pageRoot(id,inner,extra=''){return `<section class="ka-nav-page" data-nav-page="${esc(id)}"${extra}>${inner}</section>`}
const emptyState=text=>`<div class="ka-empty">${esc(text)}</div>`;

/* ── Araçlar / Yönetim ── */
function searchResults(q){
  const rows=nav().search(q);
  if(!rows.length)return emptyState('Eşleşen araç yok. Başka bir sözcük deneyin.');
  return rowCard(rows.map((t,i)=>toolRow(t,{first:i===0})).join(''));
}
function hubTeacher(r){
  const gs=nav().groups(r),favs=nav().favorites(r),hub=nav().hub(r);
  const favHtml=favs.length?`<div class="ka-nav-section"><h3>Sık kullandıklarım</h3><div class="ka-nav-favs">${favs.map(t=>`<button type="button" class="ka-nav-fav" data-nav-tool="${esc(t.id)}">${gico(t.glyph,t.tone,30)}<span>${esc(t.label)}</span></button>`).join('')}</div></div>`:'';
  const tiles=gs.map(g=>`<button type="button" class="ka-nav-gtile" data-nav-page-go="tools:${esc(g.key)}">${gico(g.glyph,g.tone,40)}<span class="ka-nav-gtile__copy"><strong>${esc(g.label)}</strong><small>${g.tools.length} araç</small></span></button>`).join('');
  return pageRoot('tools',head(hub.title,`${nav().toolCount(r)} araç, ${gs.length} grupta`)+searchBox(hub.search)
    +`<div data-nav-browse class="ka-nav-stack">${favHtml}<div class="ka-nav-gtiles">${tiles}</div></div><div data-nav-results class="ka-nav-stack" hidden></div>`);
}
function hubManager(r){
  const gs=nav().groups(r),hub=nav().hub(r),favs=nav().favorites(r);
  const favHtml=favs.length?`<div class="ka-nav-section"><h3>Sık kullandıklarım</h3><div class="ka-nav-favs">${favs.map(t=>`<button type="button" class="ka-nav-fav" data-nav-tool="${esc(t.id)}">${gico(t.glyph,t.tone,30)}<span>${esc(t.label)}</span></button>`).join('')}</div></div>`:'';
  const rows=gs.map(g=>`<button type="button" class="ka-nav-group" data-tone="${esc(g.tone)}" data-nav-page-go="tools:${esc(g.key)}">${gico(g.glyph,g.tone,46)}<span class="ka-nav-group__copy"><strong>${esc(g.label)}</strong><small>${esc(g.blurb||'')}</small></span><span class="ka-nav-group__count"><b>${g.tools.length}</b><small>araç</small></span></button>`).join('');
  const swap=nav().canSwitch()?`<div class="ka-nav-section ka-nav-section--split"><h3>Hem yönetip hem ders veriyorsanız</h3>${switchCard('compact')}</div>`:'';
  return pageRoot('tools',head(hub.title,`${nav().toolCount(r)} araç, ${gs.length} grupta`)+searchBox(hub.search)
    +`<div data-nav-browse class="ka-nav-stack">${favHtml}${rows}${swap}</div><div data-nav-results class="ka-nav-stack" hidden></div>`);
}
function switchCard(variant='full'){
  if(!nav().canSwitch())return '';
  const next=nav().otherRole(),toTeacher=next==='ogretmen';
  const title=toTeacher?'Öğretmen menüsüne geç':'Yönetim menüsüne geç';
  const sub=toTeacher?(variant==='compact'?'Derse giriyorsanız: not, plan, rehberlik ve formlar':'Ders veren yöneticiler için'):'Okul yönetimi araçları ve özet';
  return `<button type="button" class="ka-nav-switch${variant==='compact'?' is-compact':''}" data-nav-role="${next}" data-tone="${toTeacher?'teal':'indigo'}"><span class="ka-nav-switch__ico">${ic('swap',22)}</span><span class="ka-nav-switch__copy"><strong>${title}</strong><small>${sub}</small></span>${chevron()}</button>`;
}
function renderTools(){
  const r=nav().role();
  return r==='idareci'?hubManager(r):hubTeacher(r);
}

/* ── araç grubu ── */
function renderGroup(key){
  const r=nav().role(),g=nav().group(key,r),hub=nav().hub(r);
  if(!g)return null;
  const banner=g.docs?`<div class="ka-nav-note">${ic('check',18,2.4)}<span>Okul adı, müdür, tarih ve sınıflar Okul bilgilerinden gelir. Her araçta yeniden yazmazsınız.</span></div>`:'';
  return pageRoot(`tools:${g.key}`,`${head(g.label,`${g.tools.length} araç · ${hub.title}`)}${banner}${rowCard(g.tools.map((t,i)=>toolRow(t,{star:true,first:i===0})).join(''))}<p class="ka-nav-hint">Yıldızla işaretlediğiniz araçlar Araçlar sayfasındaki Sık kullandıklarım bölümünde görünür.</p>`);
}

/* ── Okul ── */
function renderSchool(){
  const r=nav().role(),secs=nav().school(r);
  const sub=r==='idareci'?'Bilgiler, kişiler, programlar, kurullar':'İletişim ve okul hayatı';
  const body=secs.map(s=>{
    const tiles=s.tools.map(t=>t.id==='school-info'?tile(t,{wide:true,extra:setupPill()}):tile(t)).join('');
    return `<div class="ka-nav-section"><h3>${esc(s.label)}<span>${s.tools.length}</span></h3><div class="ka-nav-tiles">${tiles}</div></div>`;
  }).join('');
  return pageRoot('school',head('Okul',sub)+(body||emptyState('Bu hesap için açık bir bölüm bulunmuyor.')));
}

/* ── İletişim (İdareci) ── */
function renderComm(){
  const rows=nav().comm();
  return pageRoot('comm',head('İletişim','Mesaj, haber, duyuru, anket ve takvim')+(rows.length?rowCard(rows.map(t=>linkRow(t)).join('')):emptyState('Bu hesap için açık bir bölüm bulunmuyor.')));
}

/* ── Programım (Öğretmen) ── */
let progDate='';
const teacherId=()=>{const u=user();return String(u.bagliOgretmenId||u.ogretmenId||'').trim()};
function weekStart(base){
  const d=new Date(base.getFullYear(),base.getMonth(),base.getDate());
  const wd=d.getDay();
  if(wd===6)d.setDate(d.getDate()+2);else if(wd===0)d.setDate(d.getDate()+1);else d.setDate(d.getDate()-(wd-1));
  return d;
}
function weekDates(selectedIso){
  const base=selectedIso?new Date(`${selectedIso}T12:00:00`):new Date();
  const start=weekStart(base);
  return Array.from({length:5},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});
}
function holidayOn(iso){
  try{const h=global.DutyHolidayModeSource?.holidayForDate?.(iso);if(h)return h}catch(_){}
  return arr('resmiTatiller').find(x=>String(x?.tarih||'').slice(0,10)===iso)||null;
}
function periodTimes(){
  const out=new Map();
  try{(global.SchoolLiveStatus?.schedule?.()||[]).forEach(s=>{if(s?.type==='lesson')out.set(Number(s.period),s)})}catch(_){}
  return out;
}
const hhmm=sec=>sec==null?'':`${pad(Math.floor(sec/3600))}:${pad(Math.floor(sec%3600/60))}`;
function lessonsOf(tid,dayName){
  return arr('dersProgrami').filter(x=>String(x.ogretmenId||'')===tid&&fold(x.gun)===fold(dayName)).sort((a,b)=>(Number(a.saat)||0)-(Number(b.saat)||0));
}
function dutyOn(tid,iso){
  return arr('nobetAtamalari').filter(x=>String(x.ogretmenId||'')===tid&&String(x.tarih||'').slice(0,10)===iso).map(x=>{
    const place=arr('nobetYerleri').find(y=>String(y.id)===String(x.yerId));
    return{place:place?.ad||x.yerAdi||x.nobetYeri||'Nöbet yeri'};
  });
}
function weekEvents(dates,tid){
  const from=isoOf(dates[0]),end=new Date(dates[4]);end.setDate(end.getDate()+2);const to=isoOf(end);
  const inWeek=iso=>iso>=from&&iso<=to;
  const out=[];
  arr('hatirlaticilar').forEach(x=>{const iso=String(x?.tarih||'').slice(0,10);if(x?.tamamlandi!==true&&inWeek(iso))out.push({iso,title:x.baslik||x.ad||'Hatırlatıcı',sub:x.saat||'Hatırlatıcı',tone:'amber'})});
  arr('belirliGunler').forEach(x=>{const iso=String(x?.tarihBaslangic||'').slice(0,10);if(inWeek(iso))out.push({iso,title:x.ad||'Belirli gün',sub:'Belirli gün ve hafta',tone:'rose'})});
  arr('sinavlar').forEach(x=>{const iso=String(x?.tarih||'').slice(0,10);if(inWeek(iso)&&(!tid||!x.ogretmenId||String(x.ogretmenId)===tid))out.push({iso,title:`${x.ders||'Yazılı sınav'} yazılısı`,sub:[x.siniflar||x.sinif,x.saat].filter(Boolean).join(' · ')||'Yazılı sınav',tone:'violet'})});
  const seen=new Set();
  for(const d of dates){const iso=isoOf(d),h=holidayOn(iso);if(!h)continue;const name=h.ad||h.aciklama||'Tatil';if(seen.has(name))continue;seen.add(name);out.push({iso,title:name,sub:'Tatil · ders yok',tone:'orange'})}
  return out.sort((a,b)=>a.iso.localeCompare(b.iso)||a.title.localeCompare(b.title,'tr')).slice(0,6);
}
function renderProgram(){
  const tid=teacherId(),today=isoOf(new Date()),own=nav().role()==='ogretmen';
  const dates=weekDates(progDate||today);
  if(!progDate||!dates.some(d=>isoOf(d)===progDate))progDate=dates.some(d=>isoOf(d)===today)?today:isoOf(dates[0]);
  const selDate=new Date(`${progDate}T12:00:00`),dayName=DAYS[selDate.getDay()],hol=holidayOn(progDate);
  const chips=dates.map(d=>{
    const iso=isoOf(d),on=iso===progDate,off=!!holidayOn(iso);
    return `<button type="button" class="ka-nav-day${on?' is-on':''}${off?' is-off':''}" data-nav-day="${iso}" aria-pressed="${on}" aria-label="${DAYS[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}"><span>${off?'Tatil':DAY_SHORT[d.getDay()]}</span><b>${d.getDate()}</b></button>`;
  }).join('');
  let body='';
  if(!tid){
    body=emptyState('Hesabınız bir öğretmen kaydına bağlı değil. Ders programınızı görmek için Okul › Öğretmenler sayfasından kaydınızı hesabınıza bağlayın.');
  }else if(hol){
    body=`<div class="ka-nav-lesson is-off"><span class="ka-nav-lesson__time">—</span><span class="ka-nav-lesson__copy"><strong>${esc(hol.ad||hol.aciklama||'Tatil')}</strong><small>Tatil · ders yok</small></span></div>`;
  }else{
    const lessons=lessonsOf(tid,dayName),times=periodTimes(),duties=dutyOn(tid,progDate);
    const nowSec=(()=>{const n=new Date();return progDate===today?n.getHours()*3600+n.getMinutes()*60:null})();
    const last=lessons.reduce((m,x)=>Math.max(m,Number(x.saat)||0),0);
    const rows=[];
    for(let p=1;p<=last;p++){
      const les=lessons.find(x=>Number(x.saat)===p),t=times.get(p);
      const state=!les?'free':nowSec!=null&&t&&nowSec>=t.start&&nowSec<t.end?'now':nowSec!=null&&t&&nowSec>=t.end?'done':'next';
      rows.push(`<div class="ka-nav-lesson is-${state}"><span class="ka-nav-lesson__time">${esc(hhmm(t?.start)||`${p}.`)}</span><span class="ka-nav-lesson__copy"><strong>${les?esc([les.ders||'Ders',les.sinif].filter(Boolean).join(' · ')):'Boş ders'}</strong><small>${p}. ders${t?` · ${esc(hhmm(t.start))}–${esc(hhmm(t.end))}`:''}</small></span>${state==='now'?pill('Şimdi','teal'):''}</div>`);
    }
    const dutyHtml=duties.map(d=>`<div class="ka-nav-lesson is-duty">${ic('shield',20)}<span class="ka-nav-lesson__copy"><strong>Nöbet · ${esc(d.place)}</strong></span></div>`).join('');
    body=rows.length||duties.length?`<div class="ka-nav-lessons">${rows.join('')}${dutyHtml}</div>`:emptyState(`${dayName} günü dersiniz yok.`);
  }
  const events=weekEvents(dates,tid);
  const cal=`<article class="ka-nav-cal"><div class="ka-nav-cal__head"><h3>Takvim · bu hafta</h3></div><p class="ka-nav-hint">Tatil günleri okulun tatil takviminden gelir.</p>${events.length?events.map(e=>{const d=new Date(`${e.iso}T12:00:00`);return `<div class="ka-nav-ev" data-tone="${e.tone}"><span class="ka-nav-ev__date"><small>${MONTH_SHORT[d.getMonth()]}</small><b>${d.getDate()}</b></span><span class="ka-nav-ev__copy"><strong>${esc(e.title)}</strong><small>${esc(e.sub)}</small></span></div>`}).join(''):emptyState('Bu hafta kayıtlı etkinlik yok.')}</article>`;
  const links=nav().programLinks();
  const notes=nav().tool('notes');
  const more=[...links,...(notes&&nav().toolAllowed(notes)?[notes]:[])];
  const print=tid?`<button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-nav-print-schedule>${ic('doc',16)}<span>Yazdır</span></button>`:'';
  return pageRoot('program',head(own?'Programım':'Ders programım','Ders, nöbet ve takvim tek yerde',print)+`<div class="ka-nav-days" role="group" aria-label="Hafta günleri">${chips}</div>${body}${cal}${more.length?rowCard(more.map(t=>linkRow(t)).join('')):''}`);
}

/* ── Ben ── */
function renderMe(){
  const r=nav().role(),pi=ui()?.profileInfo?.()||{name:'Kullanıcı',role:'',photo:''};
  const initials=String(pi.name||'').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('tr')||'K';
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  const note=nav().canSwitch()?`<p class="ka-nav-hint">Arayüz unvanınıza göre seçilir; isterseniz diğerine geçebilirsiniz.</p>`:'';
  const prof=`<article class="ka-nav-profile" data-tone="${r==='idareci'?'indigo':'teal'}"><div class="ka-nav-profile__top"><span class="ka-nav-profile__avatar">${pi.photo?`<img src="${esc(pi.photo)}" alt="">`:esc(initials)}</span><span class="ka-nav-profile__copy"><strong>${esc(pi.name)}</strong><small>${esc(pi.role||nav().roleLabel(r))}</small></span>${pill(`${nav().roleLabel(r)} arayüzü`,r==='idareci'?'indigo':'teal')}</div>${note}</article>`;
  const row=(id,label,sub,iconName,tone)=>`<button type="button" class="ka-nav-row ka-nav-row__main" ${id}>${ico(iconName,tone,40,20)}<span class="ka-nav-row__copy"><strong>${esc(label)}</strong>${sub?`<small>${esc(sub)}</small>`:''}</span>${chevron()}</button>`;
  const tool=id=>{const t=nav().tool(id);return t&&nav().toolAllowed(t)?row(`data-nav-tool="${id}"`,t.label,t.sub,t.icon,t.tone):''};
  const list=rowCard(
    row('data-nav-profile','Profilim','Fotoğraf, iletişim bilgileri','user','blue')
    +(r==='idareci'&&teacherId()?row('data-nav-page-go="program"','Ders programım','Derse giriyorsanız ders ve nöbetleriniz','calendar','teal'):'')
    +tool('notes')
    +`<button type="button" class="ka-nav-row ka-nav-row__main" data-nav-theme>${ico(dark?'moon':'sun','violet',40,20)}<span class="ka-nav-row__copy"><strong>Görünüm</strong><small data-nav-theme-label>${dark?'Koyu tema':'Açık tema'}</small></span><span class="ka-nav-toggle${dark?' is-on':''}" aria-hidden="true"><i></i></span></button>`
    +tool('settings')+tool('guide')+tool('about'));
  const out=`<button type="button" class="ka-nav-logout" data-nav-logout>${ic('logout',18)}<span>Çıkış yap</span></button>`;
  return pageRoot('me',head('Ben')+prof+switchCard('full')+list+out);
}

/* ── çizim + olaylar ── */
function html(id){
  const p=parse(id);
  if(p.kind==='tools')return renderTools();
  if(p.kind==='group')return renderGroup(p.key);
  if(p.kind==='school')return renderSchool();
  if(p.kind==='comm')return nav().role()==='idareci'?renderComm():null;
  if(p.kind==='program')return renderProgram();
  if(p.kind==='me')return renderMe();
  return null;
}
function render(id,{root=$('#v2ModuleRoot'),fresh=true}={}){
  if(!root)return false;
  if(fresh&&parse(id).kind==='program')progDate='';
  const out=html(id);
  if(out==null)return false;
  root.innerHTML=out;nav().markGlyphs(root);
  return true;
}
function current(){return $('#v2ModuleRoot [data-nav-page]')?.dataset.navPage||''}
function refresh(){
  const id=current();
  if(!id)return;
  const root=$('#v2ModuleRoot'),q=$('[data-nav-search]',root)?.value||'',scroller=document.scrollingElement;
  const keepTop=scroller?scroller.scrollTop:0;
  if(!render(id,{root,fresh:false})){ui()?.openTab?.('home');return}
  const input=$('[data-nav-search]',root);
  if(input&&q){input.value=q;input.dispatchEvent(new Event('input'))}
  if(scroller)scroller.scrollTop=keepTop;
}
function openToolById(id,parent){
  const t=nav().tool(id);
  if(!t){return}
  Promise.resolve(ui()?.routeModule?.(t.route,{page:t.page,title:t.label,parent})).catch(e=>{console.error('[NavPages/route]',t.id,e);global.toast?.('Sayfa açılamadı.')});
}
function onClick(e){
  const root=$('#v2ModuleRoot');
  const t=e.target;
  if(!root||!root.contains(t)||!$('[data-nav-page]',root))return;
  const page=current();
  const star=t.closest('[data-nav-star]');
  if(star){e.preventDefault();nav().toggleFavorite(star.dataset.navStar);return}
  const tool=t.closest('[data-nav-tool]');
  if(tool){e.preventDefault();openToolById(tool.dataset.navTool,page);return}
  const go=t.closest('[data-nav-page-go]');
  if(go){e.preventDefault();ui()?.openPage?.(go.dataset.navPageGo);return}
  const role=t.closest('[data-nav-role]');
  if(role){e.preventDefault();if(nav().setRole(role.dataset.navRole))ui()?.openTab?.('home');return}
  const day=t.closest('[data-nav-day]');
  if(day){e.preventDefault();progDate=day.dataset.navDay;refresh();return}
  if(t.closest('[data-nav-print-schedule]')){e.preventDefault();Promise.resolve(global.AppNavigationBehavior?.openOwnScheduleReport?.()).catch(err=>console.error('[NavPages/print]',err));return}
  if(t.closest('[data-nav-profile]')){e.preventDefault();ui()?.renderProfile?.();return}
  if(t.closest('[data-nav-theme]')){e.preventDefault();Promise.resolve(ui()?.toggleTheme?.());return}
  if(t.closest('[data-nav-logout]')){e.preventDefault();global.cikisYap?.();return}
}
function onInput(e){
  const input=e.target.closest?.('[data-nav-search]');
  if(!input)return;
  const root=$('#v2ModuleRoot'),browse=$('[data-nav-browse]',root),res=$('[data-nav-results]',root);
  if(!browse||!res)return;
  const q=input.value.trim();
  browse.hidden=!!q;res.hidden=!q;
  res.innerHTML=q?searchResults(q):'';nav().markGlyphs(res);
}
let wired=false;
function wire(){
  if(wired)return;wired=true;
  document.addEventListener('click',onClick);
  document.addEventListener('input',onInput);
  for(const ev of ['koruk:nav-favorites-changed','koruk:permissions-changed','koruk:app-config-changed','koruk:theme-changed'])global.addEventListener(ev,()=>{if(current())refresh()});
  for(const t of ['dersProgrami','nobetAtamalari','nobetYerleri','dersSaatleri','ogretmenler','hatirlaticilar','sinavlar','resmiTatiller','belirliGunler','okulBilgileri'])global.AppStore?.subscribe?.('data.'+t,()=>{if(['program','school','me'].includes(current()))requestAnimationFrame(refresh)});
}
wire();
global.NavPages={render,info,current,refresh,parse,setupProgress,refreshSetup};
})(window);
