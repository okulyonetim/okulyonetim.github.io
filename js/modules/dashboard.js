/* Koruk Asistan — Ana sayfa (rol arayüzüne göre)
 * Öğretmen arayüzü "Bugün", idareci arayüzü "Özet" olarak açılır; rol unvana göre AppNav.role() ile gelir.
 * Kalıcı veri kaynağı AppStore/DeviceData; Firestore yalnız SyncEngine arka planıdır.
 * Hatırlatma motoru (aşağıda) tek kaynaktır; eğitim-öğretim yılı sınırı KorukTeacherReminderAcademicYear'dan uygulanır.
 */
(function(){
'use strict';if(window.DashboardModule)return;
let mounted=false,mountPromise=null,unsubs=[],reminderShown=false,trialTimer=null,renderFrame=0,renderTimer=0,scrollIdleTimer=null,scrolling=false,pendingRender=false,lastLiveRenderKey='';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=window.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
function isoToday(){const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function date(v){if(!v)return'—';try{if(typeof v.toDate==='function')return v.toDate().toLocaleDateString('tr-TR');const d=new Date(String(v).length===10?v+'T00:00:00':v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('tr-TR')}catch(_){return String(v)}}
function user(){return window.AppStore?.get?.('session.user')||window.AKTIF_KULLANICI||{}}
function isAdmin(){return user().admin===true}
function displayName(){const u=user(),tid=u.bagliOgretmenId||u.ogretmenId||'',t=tid?arr('ogretmenler').find(x=>x.id===tid):null;return String(t?.adSoyad||[t?.ad,t?.soyad].filter(Boolean).join(' ')||u.adSoyad||[u.ad,u.soyad].filter(Boolean).join(' ')||u.displayName||u.kullaniciAdi||'Kullanıcı').trim()}
function firstName(){return displayName().split(/\s+/)[0]||'Kullanıcı'}
function teacherId(){const u=user();return u.bagliOgretmenId||u.ogretmenId||''}
function greeting(){const h=new Date().getHours();return h<6?'İyi geceler':h<12?'Günaydın':h<18?'İyi günler':'İyi akşamlar'}
function upcoming(list,field,days=14){const now=new Date(isoToday()+'T00:00:00'),max=new Date(now.getTime()+days*86400000);return list.filter(x=>{if(!x?.[field])return false;const d=new Date(String(x[field]).slice(0,10)+'T00:00:00');return !Number.isNaN(d.getTime())&&d>=now&&d<=max}).sort((a,b)=>String(a[field]).localeCompare(String(b[field])))}
function eventSortKey(dateValue,timeValue=''){const d=String(dateValue||'').slice(0,10),t=String(timeValue||'23:59').slice(0,5)||'23:59';return`${d} ${t}`}
function meetingScope(x){if(x?.tur!=='zumre')return'';if(x?.kademe==='ilkokul'){const levels=(x.zumreSeviyeleri||[]).map(Number).filter(Boolean).sort((a,b)=>a-b);return levels.map(n=>`${n}. Sınıf`).join(', ')}return String(x?.dersAdi||x?.bransAdi||'').trim()}
function meetingTitle(x){const type=x?.tur==='sok'?'ŞÖK':x?.tur==='zumre'?'Zümre':'Toplantı',scope=meetingScope(x),topic=String(x?.konu||'').trim();return scope?`${type}: ${scope}`:topic?`${type}: ${topic}`:type}
function meetingUpcomingRows(days=14){return upcoming(arr('toplantiCizelgesi'),'tarih',days).map(x=>({icon:'👥',title:meetingTitle(x),when:`${date(x.tarih)}${x.saat?` · ${x.saat}`:''}`,kind:'Toplantı',dateKey:String(x.tarih||'').slice(0,10),timeKey:String(x.saat||''),sortKey:eventSortKey(x.tarih,x.saat),route:'management',page:'meeting-schedule',routeTitle:'Toplantı Çizelgesi'}))}
const DAY_NAMES=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
function dayName(d=new Date()){return DAY_NAMES[d.getDay()]}
function normalizeDay(v){return String(v||'').toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c')}
function sameDay(a,b){return normalizeDay(a)===normalizeDay(b)}
function sortHour(a,b){return String(a?.saat??a?.dersSaati??'').localeCompare(String(b?.saat??b?.dersSaati??''),'tr',{numeric:true})}
function lessonLabel(x){return x.ders||x.dersAdi||x.brans||'Ders'}
function classLabel(x){return x.sinif||x.sinifAdi||x.sube||'Sınıf'}
function teacherLabel(x){if(x.ogretmenAdSoyad||x.ogretmenAdi)return x.ogretmenAdSoyad||x.ogretmenAdi;const t=arr('ogretmenler').find(o=>o.id===x.ogretmenId);return t?.adSoyad||[t?.ad,t?.soyad].filter(Boolean).join(' ')||'Öğretmen'}
function todayLessons({mine=false}={}){const tid=teacherId(),name=dayName();if(mine&&!tid)return[];return arr('dersProgrami').filter(x=>sameDay(x.gun,name)&&(!mine||x.ogretmenId===tid)).sort(sortHour)}
function isDone(x){return x?.tamamlandi===true||['Tamamlandı','Tamamlandi','tamamlandi'].includes(x?.durum)}
function liveClock(sec){const s=Math.max(0,Math.floor(Number(sec)||0));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function hmSec(sec){if(!Number.isFinite(Number(sec)))return'—';sec=((Math.round(Number(sec))%86400)+86400)%86400;return`${String(Math.floor(sec/3600)).padStart(2,'0')}:${String(Math.floor((sec%3600)/60)).padStart(2,'0')}`}
function bellSvg(type='bell'){const paths={bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"/><path d="M8 7h8M8 11h6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',check:'<path d="m5 12 4 4L19 6"/>',coffee:'<path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2M6 3v2M10 3v2M14 3v2"/>',utensils:'<path d="M7 3v6M4 3v4a3 3 0 0 0 6 0V3M7 10v11"/><path d="M16 3v18M16 3c3 1 4 4 4 7h-4"/>',home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>'};return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type]||paths.bell}</svg>`}
function announcementDateTime(v){if(!v)return'';try{const d=new Date(v);if(Number.isNaN(d.getTime()))return date(v);return d.toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(_){return date(v)}}
const nav=()=>window.AppNav;
const SLS=()=>window.SchoolLiveStatus;
const isManagerView=()=>(nav()?.role?.()||(isAdmin()?'idareci':'ogretmen'))==='idareci';
const icon=(name,size=20)=>nav()?.icon?.(name,size)||'';
const periodOf=x=>Number(x?.saat??x?.dersSaati);
function dateLine(){return new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}
function periodRange(p){const s=(SLS()?.schedule?.()||[]).find(x=>x.type==='lesson'&&Number(x.period)===Number(p));return s?`${hmSec(s.start)}–${hmSec(s.end)}`:''}
function periodStart(p){return periodRange(p).split('–')[0]}
function lessonText(x){return x?`${classLabel(x)} · ${lessonLabel(x)}`:''}
function empty(text){return `<p class="ka-today-empty">${esc(text)}</p>`}
function sectionHtml(title,body,{link='',attrs='',tone=''}={}){return `<section class="ka-today-section"${tone?` data-tone="${tone}"`:''}><div class="ka-today-section__head"><h3>${esc(title)}</h3>${link?`<button type="button" class="ka-today-link" ${attrs}>${esc(link)}<span aria-hidden="true">›</span></button>`:''}</div>${body}</section>`}
function liveRenderKey(live){return [live?.mode||'',live?.period??'',live?.nextPeriod??'',live?.remainingDays??'',live?.openingDate||''].join('|')}
function nextMine(mine,period){return mine.filter(x=>periodOf(x)>period).sort((a,b)=>periodOf(a)-periodOf(b))[0]||null}
function liveModel(mine){
  const live=SLS()?.status?.()||{},mode=live.mode,manager=isManagerView(),mineAt=p=>mine.find(x=>periodOf(x)===Number(p));
  const pct=v=>Math.round(Math.max(0,Math.min(1,Number(v)||0))*100);
  const m={state:mode||'empty',eyebrow:'ZİL SAYACI',title:'Ders saatleri yükleniyor',sub:'',remaining:null,progress:null,days:null,next:''};
  if(mode==='lesson'){const p=Number(live.period),l=mineAt(p),nx=manager?null:nextMine(mine,p);m.eyebrow=`ŞİMDİ · ${p}. DERS`;m.title=manager?`${p}. ders sürüyor`:(l?lessonText(l):'Bu saat dersiniz yok');m.sub=periodRange(p);m.remaining=liveClock(live.remaining);m.progress=pct(live.progress);m.next=nx?`Sıradaki · ${periodOf(nx)}. ders ${periodStart(periodOf(nx))} · ${lessonText(nx)}`:''}
  else if(mode==='break'||mode==='lunch'){const n=Number(live.nextPeriod),l=mineAt(n);m.eyebrow=String(live.label||'Teneffüs').toLocaleUpperCase('tr');m.title=n?`Sıradaki: ${n}. ders`:'Teneffüs';m.sub=[periodStart(n),manager?'':lessonText(l)].filter(Boolean).join(' · ');m.remaining=liveClock(live.remaining);m.progress=pct(live.progress)}
  else if(mode==='before'){const n=Number(live.nextPeriod)||1,l=mineAt(n);m.eyebrow='DERSE HAZIRLIK';m.title=`${n}. ders yaklaşıyor`;m.sub=[periodStart(n),manager?'':lessonText(l)].filter(Boolean).join(' · ');m.remaining=live.remaining==null?null:liveClock(live.remaining);m.progress=pct(live.progress)}
  else if(mode==='idle'){const first=(live.segments||[]).find(x=>x.type==='lesson');m.eyebrow='GÜNE HAZIRLIK';m.title='Ders saatleri';m.sub=first?`İlk ders ${hmSec(first.start)}`:'Program bekleniyor'}
  else if(mode==='after'){m.eyebrow='GÜN TAMAMLANDI';m.title='Dersler bitti';m.sub='İyi dinlenmeler'}
  else if(mode==='weekend'){m.eyebrow='HAFTA SONU';m.title='Bugün ders yok';m.sub='İyi dinlenmeler'}
  else if(mode==='holiday'){const d=Number.isFinite(Number(live.remainingDays))?Number(live.remainingDays):null;m.eyebrow='TATİL MODU';m.title='Tatilin tadını çıkarın';m.sub=live.openingLabel?`Okul ${live.openingLabel} tarihinde açılacak.`:String(live.message||'İyi tatiller!');m.days=d;m.progress=pct(live.holidayProgress)}
  return m;
}
function heroHtml(mine){
  const m=liveModel(mine),count=m.remaining!=null?`<span class="ka-today-hero__count"><b data-live-remaining>${esc(m.remaining)}</b><small>kaldı</small></span>`:m.days!=null?`<span class="ka-today-hero__count"><b>${esc(m.days)}</b><small>gün</small></span>`:'';
  return `<section class="ka-today-hero" data-state="${esc(m.state)}" aria-label="Şu an"><div class="ka-today-hero__copy"><small>${esc(m.eyebrow)}</small><strong>${esc(m.title)}</strong>${m.sub?`<span>${esc(m.sub)}</span>`:''}</div>${count}${m.progress!=null?`<progress class="ka-today-bar" max="100" value="${m.progress}" data-live-progress aria-label="İlerleme"></progress>`:''}${m.next?`<p class="ka-today-hero__next">${esc(m.next)}</p>`:''}</section>`;
}
function refreshHeroLive(live=SLS()?.status?.()||{}){
  if(!['lesson','break','lunch','before'].includes(live.mode))return;
  document.querySelectorAll('[data-live-remaining]').forEach(el=>{if(live.remaining!=null)el.textContent=liveClock(live.remaining)});
  document.querySelectorAll('[data-live-progress]').forEach(el=>{el.value=Math.round(Math.max(0,Math.min(1,Number(live.progress)||0))*100)});
}
function announcementSection(){
  const d=arr('duyurular').filter(x=>x&&!x.arsivlendi&&x.aktif!==false&&!x.pasif).sort((a,b)=>String(b.tarih||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.eklenmeTarihi||'')))[0];if(!d)return'';
  const ok=!!d?.okuyanlar?.[user().uid||''],readers=Object.values(d.okuyanlar||{}).filter(Boolean).length,raw=String(d.icerik||d.aciklama||'').replace(/<[^>]*>/g,'').trim(),short=raw.length>180?raw.slice(0,180).trim()+'…':raw,id=esc(d.id||''),gallery=window.DashboardAnnouncementMedia?.renderGallery?.(d)||'';
  const readCount=isAdmin()?`<button type="button" class="kh-read-count" data-home-announcement-readers="${id}" aria-haspopup="dialog"><span>👁</span><b>${readers}</b> kişi okudu <span class="arrow">›</span></button>`:`<span class="kh-read-count is-static"><span>👁</span><b>${readers}</b> kişi okudu</span>`;
  return `<div class="kh-dynamic"><article class="kh-announcement ${ok?'is-read':'is-unread'}" data-duyuru-id="${id}"><div class="kh-announcement-accent"></div><div class="kh-announcement-head"><div class="kh-announcement-icon" aria-hidden="true">${icon('mega',22)}</div><div class="kh-announcement-title-wrap"><div class="kh-announcement-kicker">DUYURU</div><h3>${esc(d.baslik||d.ad||'Duyuru')}</h3><div class="kh-announcement-meta">${esc(d.olusturanAdi||'Yönetim')}${d.tarih?' · '+esc(announcementDateTime(d.tarih)):''}</div></div><span class="kh-announcement-status ${ok?'read':'new'}">${ok?'✓ OKUNDU':'YENİ'}</span></div>${short?`<button type="button" class="kh-announcement-body" data-dash-route="communication" data-dash-page="announcements" data-dash-title="Duyurular">${esc(short)}</button>`:''}${gallery}<div class="kh-announcement-footer"><label class="kh-read-check ${ok?'checked':''}"><input type="checkbox" data-dash-announcement-read="${id}" ${ok?'checked disabled':''}><span class="kh-read-box" aria-hidden="true">✓</span><span>${ok?'Okundu olarak işaretlendi':'Okudum'}</span></label>${readCount}</div></article></div>`;
}
function trialTotalMin(d){return d?.oturumTuru==='İki Oturum'?(Number(d.sozelSuresiDk)||0)+(Number(d.araSureDk)||0)+(Number(d.sayisalSuresiDk)||0):Number(d?.sinavSuresiDk)||0}
function trialStartClock(d){return d?.oturumTuru==='İki Oturum'?(d.sozelBaslama||d.baslamaSaati||''):d?.baslamaSaati||''}
function trialStartMs(d){const clock=String(trialStartClock(d)||'').slice(0,5);if(!d?.tarih||!/^\d{1,2}:\d{2}$/.test(clock))return 0;const ms=new Date(`${d.tarih}T${clock}:00`).getTime();return Number.isNaN(ms)?0:ms}
function trialTimerState(d,nowMs=Date.now()){
const mins=trialTotalMin(d),total=Math.max(0,mins*60),manualActive=d?.sayacDurumu?.aktif===true,manualRaw=manualActive&&d?.sayacDurumu?.baslatmaTarihi?new Date(d.sayacDurumu.baslatmaTarihi).getTime():0,manualStart=Number.isFinite(manualRaw)?manualRaw:0,start=manualStart||trialStartMs(d),end=start&&total?start+total*1000:0,multiSession=d?.oturumTuru==='İki Oturum';
if(!start||total<=0)return{run:false,status:'ready',remaining:Math.max(0,total),segmentRemaining:Math.max(0,total),label:total>0?'Başlangıç bekleniyor':'Süre eksik',progress:0,segmentProgress:0,multiSession,start,end,secondsUntilStart:0};
const until=(start-nowMs)/1000;if(until>0)return{run:false,status:'scheduled',remaining:total,segmentRemaining:total,label:'Başlamayı bekliyor',progress:0,segmentProgress:0,multiSession,start,end,secondsUntilStart:until};
const elapsed=Math.max(0,(nowMs-start)/1000),remaining=Math.max(0,total-elapsed),progress=Math.max(0,Math.min(100,elapsed/total*100));
if(remaining<=0)return{run:false,status:'done',remaining:0,segmentRemaining:0,label:'Tamamlandı',progress:100,segmentProgress:100,multiSession,start,end,secondsUntilStart:0};
if(multiSession){
  const verbal=Math.max(0,(Number(d.sozelSuresiDk)||0)*60),br=Math.max(0,(Number(d.araSureDk)||0)*60),numeric=Math.max(0,total-verbal-br);
  let label='Sayısal oturum',segmentElapsed=Math.max(0,elapsed-verbal-br),segmentTotal=numeric,status='active';
  if(elapsed<verbal){label='Sözel oturum';segmentElapsed=elapsed;segmentTotal=verbal}
  else if(elapsed<verbal+br){label='Ara';segmentElapsed=Math.max(0,elapsed-verbal);segmentTotal=br;status='break'}
  const segmentRemaining=Math.max(0,segmentTotal-segmentElapsed),segmentProgress=segmentTotal?Math.max(0,Math.min(100,segmentElapsed/segmentTotal*100)):100;
  return{run:true,status,remaining,segmentRemaining,label,progress,segmentProgress,multiSession:true,start,end,secondsUntilStart:0};
}
return{run:true,status:'active',remaining,segmentRemaining:remaining,label:'Sınav sürüyor',progress,segmentProgress:progress,multiSession:false,start,end,secondsUntilStart:0};
}
function trialFmt(sec){sec=Math.max(0,Math.floor(Number(sec)||0));return`${String(Math.floor(sec/3600)).padStart(2,'0')}:${String(Math.floor((sec%3600)/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
function trialLiveRows(){return arr('denemeSinavlari').map(exam=>({exam,state:trialTimerState(exam)})).filter(x=>x.state.run&&x.state.remaining>0).sort((a,b)=>a.state.end-b.state.end)}
function trialCounterMulti(list){return `<section class="kh-trial-live"><div class="kh-trial-live__card kh-trial-live__card--multi"><span class="kh-trial-live__head"><span class="kh-trial-live__badge"><i></i> AKTİF DENEME SINAVLARI</span></span><span class="kh-trial-live__rows">${list.map(({exam:x,state:st})=>{const classes=x.sinflar||x.siniflar||'—',pct=Math.round(st.progress),segPct=Math.round(st.segmentProgress),id=esc(x.id),open=`data-dash-route="academic" data-dash-page="trial" data-dash-title="Deneme Sınavları" data-dash-trial-open="${id}"`,name=esc(x.ad||x.baslik||'Deneme sınavı');if(st.multiSession)return`<button type="button" class="kh-trial-live__row is-multi" ${open}><span class="kh-trial-live__row-main"><b>${name}</b><small>${esc(classes)} · <span data-dash-trial-session-name="${id}">${esc(st.label)}</span></small></span><strong data-dash-trial-session-timer="${id}">${esc(trialFmt(st.segmentRemaining))}</strong><span class="kh-trial-live__bar" role="progressbar" aria-label="Mevcut oturum ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${segPct}"><i data-dash-trial-session-progress="${id}" style="width:${segPct}%"></i></span><span class="kh-trial-live__total"><small>Tüm sınav</small><b data-dash-trial-timer="${id}">${esc(trialFmt(st.remaining))}</b></span><span class="kh-trial-live__bar is-total" role="progressbar" aria-label="Tüm sınav ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i data-dash-trial-progress="${id}" style="width:${pct}%"></i></span></button>`;return`<button type="button" class="kh-trial-live__row" ${open}><span class="kh-trial-live__row-main"><b>${name}</b><small>${esc(classes)} · <span data-dash-trial-label="${id}">${esc(st.label)}</span></small></span><strong data-dash-trial-timer="${id}">${esc(trialFmt(st.remaining))}</strong><span class="kh-trial-live__bar" role="progressbar" aria-label="Sınav ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i data-dash-trial-progress="${id}" style="width:${pct}%"></i></span></button>`}).join('')}</span></div></section>`}
function trialCounterSection(){const list=trialLiveRows();if(list.length>1)return trialCounterMulti(list);if(!list.length)return'';return `<section class="kh-trial-live">${list.map(({exam:x,state:st})=>{const finish=x.oturumTuru==='İki Oturum'?(x.sayisalBitis||x.bitisSaati||'—'):(x.bitisSaati||'—'),classes=x.sinflar||x.siniflar||'—',totalPct=Math.round(st.progress),segmentPct=Math.round(st.segmentProgress);return`<button type="button" class="kh-trial-live__card" data-dash-route="academic" data-dash-page="trial" data-dash-title="Deneme Sınavları" data-dash-trial-open="${esc(x.id)}"><span class="kh-trial-live__head"><span class="kh-trial-live__badge"><i></i> AKTİF DENEME SINAVI</span><span class="kh-trial-live__detail">Detaylar ›</span></span><span class="kh-trial-live__title">${esc(x.ad||x.baslik||'Deneme sınavı')}</span><span class="kh-trial-live__session" data-dash-trial-label="${esc(x.id)}">${esc(st.label)}</span><span class="kh-trial-live__timers">${st.multiSession?`<span class="kh-trial-live__timer is-session"><span class="kh-trial-live__timer-head"><span><small>MEVCUT OTURUM</small><b data-dash-trial-session-name="${esc(x.id)}">${esc(st.label)}</b></span><strong data-dash-trial-session-timer="${esc(x.id)}">${esc(trialFmt(st.segmentRemaining))}</strong></span><span class="kh-trial-live__bar" role="progressbar" aria-label="Mevcut oturum ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${segmentPct}"><i data-dash-trial-session-progress="${esc(x.id)}" style="width:${segmentPct}%"></i></span></span>`:''}<span class="kh-trial-live__timer is-total"><span class="kh-trial-live__timer-head"><span><small>TÜM SINAV</small><b>Kalan toplam süre</b></span><strong data-dash-trial-timer="${esc(x.id)}">${esc(trialFmt(st.remaining))}</strong></span><span class="kh-trial-live__bar" role="progressbar" aria-label="Tüm sınav ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${totalPct}"><i data-dash-trial-progress="${esc(x.id)}" style="width:${totalPct}%"></i></span></span></span><span class="kh-trial-live__meta"><span><small>◷ BİTİŞ</small><b>${esc(finish)}</b></span><span><small>▣ TARİH</small><b>${esc(date(x.tarih))}</b></span><span><small>👥 SINIFLAR</small><b>${esc(classes)}</b></span></span></button>`}).join('')}</section>`}
function refreshTrialTimers(root=document){const live=trialLiveRows(),nodes=[...root.querySelectorAll?.('[data-dash-trial-timer]')||[]],wanted=live.map(x=>String(x.exam.id)).join('|'),shown=nodes.map(x=>String(x.dataset.dashTrialTimer||'')).join('|');if(wanted!==shown){if(mounted)queueRender();return}nodes.forEach(el=>{const item=live.find(x=>String(x.exam.id)===String(el.dataset.dashTrialTimer));if(item)el.textContent=trialFmt(item.state.remaining)});root.querySelectorAll?.('[data-dash-trial-session-timer]').forEach(el=>{const item=live.find(x=>String(x.exam.id)===String(el.dataset.dashTrialSessionTimer));if(item)el.textContent=trialFmt(item.state.segmentRemaining)});root.querySelectorAll?.('[data-dash-trial-label],[data-dash-trial-session-name]').forEach(el=>{const id=el.dataset.dashTrialLabel||el.dataset.dashTrialSessionName,item=live.find(x=>String(x.exam.id)===String(id));if(item)el.textContent=item.state.label});root.querySelectorAll?.('[data-dash-trial-progress]').forEach(el=>{const item=live.find(x=>String(x.exam.id)===String(el.dataset.dashTrialProgress));if(item){const pct=Math.round(item.state.progress);el.style.width=`${pct}%`;el.parentElement?.setAttribute('aria-valuenow',String(pct))}});root.querySelectorAll?.('[data-dash-trial-session-progress]').forEach(el=>{const item=live.find(x=>String(x.exam.id)===String(el.dataset.dashTrialSessionProgress));if(item){const pct=Math.round(item.state.segmentProgress);el.style.width=`${pct}%`;el.parentElement?.setAttribute('aria-valuenow',String(pct))}})}
function leaveReminderMatches(r){
  const d=String(r?.tarih||'').slice(0,10),text=normalizeDay(`${r?.title||r?.baslik||''} ${r?.subtitle||r?.altBaslik||r?.aciklama||''}`);
  if(!d||!text)return false;
  return [...arr('ogretmenIzinleri'),...arr('personelIzinler')].some(x=>{
    const start=String(x?.baslangic||x?.baslangicTarihi||x?.tarih||'').slice(0,10),end=String(x?.bitis||x?.bitisTarihi||x?.tarih||start).slice(0,10);
    if(!start||d<start||d>end)return false;
    const name=String(x?.ogretmenAdi||x?.personelAdi||(x?.ogretmenId?teacherLabel({ogretmenId:x.ogretmenId}):'')).trim();
    const type=String(x?.tur||x?.izinTuru||x?.raporTuru||'').trim();
    if(!name||!text.includes(normalizeDay(name)))return false;
    return !type||text.includes(normalizeDay(type))||text.includes('izin')||text.includes('rapor');
  });
}
function upcomingRows(){const calendarRoute={route:'communication',page:'calendar',routeTitle:'Takvim'},exams=upcoming([...arr('sinavlar'),...arr('denemeSinavlari')],'tarih',14).map(x=>({icon:'📝',title:x.ad||x.ders||x.sinavAdi||'Sınav',when:`${date(x.tarih)}${x.saat?` · ${x.saat}`:''}`,kind:'Sınav',sortKey:eventSortKey(x.tarih,x.saat),...calendarRoute}));const reminders=upcoming(arr('hatirlaticilar'),'tarih',14).filter(x=>!x.tamamlandi&&!leaveReminderMatches({title:x.baslik,subtitle:x.aciklama,tarih:x.tarih})).map(x=>({icon:'🔔',title:x.baslik||'Hatırlatıcı',when:`${date(x.tarih)}${x.saat?` · ${x.saat}`:''}`,kind:'Hatırlatıcı',sortKey:eventSortKey(x.tarih,x.saat),...calendarRoute}));const _tid=teacherId();const tasks=upcoming(arr('gorevler'),'sonTarih',14).filter(x=>!isDone(x)&&(!_tid||(x.sorumluOgretmenIdler||[]).includes(_tid))).map(x=>({icon:'✓',title:x.baslik||'Görev',when:date(x.sonTarih),kind:'Görev',sortKey:eventSortKey(x.sonTarih,x.saat),...calendarRoute}));const specialDays=upcoming(arr('belirliGunler').filter(x=>!(x.kontroller||[])[0]),'tarihBaslangic',14).map(x=>({icon:'🎉',title:x.ad||'Belirli Gün / Hafta',when:date(x.tarihBaslangic),kind:'Belirli Gün / Hafta',sortKey:eventSortKey(x.tarihBaslangic),...calendarRoute}));return[...exams,...reminders,...tasks,...specialDays,...meetingUpcomingRows(14)].sort((a,b)=>a.sortKey.localeCompare(b.sortKey,'tr')).slice(0,8)}
function teacherUpcomingRows(){const reminders=collectReminders(30).filter(x=>x.kaynak!=='sinav').map(x=>({...x,_time:'23:59'})),meetings=meetingUpcomingRows(30).map(x=>({kaynak:'toplanti',baslik:x.title,altBaslik:`${x.when} · Toplantı`,gunFarki:dayDiff(x.dateKey),_time:x.timeKey||'23:59',git:route('management','meeting-schedule','Toplantı Çizelgesi')}));return[...reminders,...meetings].filter(x=>x.gunFarki>=0).sort((a,b)=>a.gunFarki-b.gunFarki||String(a._time||'23:59').localeCompare(String(b._time||'23:59'))).slice(0,8)}
function dutyPlace(x){return x?.yerAdi||arr('nobetYerleri').find(y=>y.id===x?.yerId)?.ad||''}
function dutyPlaceKind(v){const n=normalizeDay(v);if(n.includes('bahce'))return{type:'yard',ico:'🌳'};if(n.includes('bina')||n.includes('kat')||n.includes('koridor'))return{type:'building',ico:'🏫'};if(n.includes('mudur')||n.includes('idare'))return{type:'admin',ico:'🧑‍💼'};return{type:'other',ico:'📍'}}
function dutyPlaceRank(v){return({yard:0,building:1,other:2,admin:3})[dutyPlaceKind(v).type]??4}
function sortDuties(list){return[...list].sort((a,b)=>dutyPlaceRank(dutyPlace(a))-dutyPlaceRank(dutyPlace(b))||teacherLabel(a).localeCompare(teacherLabel(b),'tr'))}
function isPast(p,live){
  if(live.mode==='after')return true;
  if(live.mode==='lesson')return p<Number(live.period);
  if(live.mode==='break'||live.mode==='lunch')return p<Number(live.nextPeriod);
  return false;
}
function lessonRowState(p,live){
  if(live.mode==='lesson'&&Number(live.period)===p)return'is-now';
  if(isPast(p,live))return'is-done';
  if((live.mode==='break'||live.mode==='lunch'||live.mode==='before'||live.mode==='idle')&&Number(live.nextPeriod)===p)return'is-next';
  return'';
}
function statusChip(s){return s==='is-now'?'Şimdi':s==='is-next'?'Sıradaki':s==='is-done'?'Bitti':''}
function myLessonsSection(mine){
  const live=SLS()?.status?.()||{};
  if(!teacherId())return sectionHtml('Bugünkü derslerim',empty('Profilinize bağlı öğretmen kaydı bulunamadı.'));
  if(live.mode==='holiday')return'';
  const body=mine.length?`<div class="ka-today-list">${mine.map(x=>{const p=periodOf(x),s=lessonRowState(p,live),chip=statusChip(s);return `<button type="button" class="ka-today-row ${s}" data-dash-lesson-plan data-lesson="${esc(lessonLabel(x))}" data-class="${esc(classLabel(x))}" aria-label="${esc(lessonLabel(x))} yıllık planını aç"><span class="ka-today-row__no">${esc(p||'•')}</span><span class="ka-today-row__main"><b>${esc(lessonText(x))}</b><small>${esc(periodRange(p))}</small></span>${chip?`<span class="ka-today-row__chip">${chip}</span>`:''}</button>`}).join('')}</div>`:empty(live.mode==='weekend'?'Hafta sonu, ders yok.':'Bugün dersiniz yok.');
  return sectionHtml('Bugünkü derslerim',body,{link:'Programım',attrs:'data-dash-page-go="program"'});
}
function dutyRows(list,{book=false}={}){
  const tid=teacherId();
  return `<div class="ka-today-list">${sortDuties(list).map(x=>{const mine=!!tid&&x.ogretmenId===tid;return `<div class="ka-today-row${mine?' is-me':''}"><span class="ka-today-row__ico" aria-hidden="true">${icon('shield',18)}</span><span class="ka-today-row__main"><b>${esc(dutyPlace(x)||'Nöbet yeri')}</b><small>${esc(teacherLabel(x))}</small></span>${mine?'<span class="ka-today-row__chip">Siz</span>':x.defterDolduruldu?'<span class="ka-today-row__chip">Tamam</span>':''}</div>${book&&mine?`<label class="ka-today-check"><input type="checkbox" data-dash-duty-book="${esc(x.id)}" ${x.defterDolduruldu?'checked':''}><span>Nöbet defterini doldurdum</span></label>`:''}`}).join('')}</div>`;
}
function todayDuties(){return arr('nobetAtamalari').filter(x=>String(x.tarih||'').slice(0,10)===isoToday())}
function myDutySection(){
  const live=SLS()?.status?.()||{};if(live.mode==='holiday'||live.mode==='weekend')return'';
  const tid=teacherId(),mine=todayDuties().filter(x=>tid&&x.ogretmenId===tid);if(!mine.length)return'';
  return sectionHtml('Bugünkü nöbetim',dutyRows(mine,{book:true}),{link:'Program',attrs:'data-dash-tool="duty"',tone:'green'});
}
function allDutySection(){
  const live=SLS()?.status?.()||{};if(live.mode==='holiday'||live.mode==='weekend')return'';
  const list=todayDuties(),link=toolOf('duty')?{link:'Nöbet programı',attrs:'data-dash-tool="duty"'}:{};
  return sectionHtml('Bugünün nöbetçileri',list.length?dutyRows(list):empty('Bugün için nöbet kaydı yok.'),link);
}
function activeLeaves(){const today=isoToday();return arr('ogretmenIzinleri').filter(x=>{const a=String(x.baslangic||x.baslangicTarihi||x.tarih||'').slice(0,10),b=String(x.bitis||x.bitisTarihi||x.tarih||a).slice(0,10);return a&&a<=today&&(!b||b>=today)})}
function leaveName(x){return String(x.ogretmenAdi||teacherLabel(x)||'').trim()}
function leavesSection(){
  const list=activeLeaves();if(!list.length)return'';
  const link=toolOf('staff-leaves')?{link:'İzinler',attrs:'data-dash-tool="staff-leaves"'}:{};
  return sectionHtml('Bugün izinli',`<div class="ka-today-list">${list.map(x=>`<div class="ka-today-row"><span class="ka-today-row__ico" aria-hidden="true">${icon('calendar',18)}</span><span class="ka-today-row__main"><b>${esc(leaveName(x))}</b>${x.tur||x.izinTuru?`<small>${esc(x.tur||x.izinTuru)}</small>`:''}</span><span class="ka-today-row__chip">İzinli</span></div>`).join('')}</div>`,link);
}
function whoIsWhereSection(){
  const live=SLS()?.status?.()||{};if(live.mode!=='lesson')return'';
  const p=Number(live.period),list=todayLessons({mine:false}).filter(x=>periodOf(x)===p);if(!list.length)return'';
  const link=toolOf('schedule')?{link:'Ders programı',attrs:'data-dash-tool="schedule"'}:{};
  return sectionHtml('Şu an kim nerede',`<div class="ka-today-list">${list.slice(0,8).map(x=>`<div class="ka-today-row"><span class="ka-today-row__no">${esc(classLabel(x))}</span><span class="ka-today-row__main"><b>${esc(lessonLabel(x))}</b><small>${esc(teacherLabel(x))}</small></span></div>`).join('')}</div>`,link);
}
function reminderRowText(r){if(/^Kontrol Listesi\s*:/i.test(r.baslik||'')){const sub=String(r.altBaslik||'').trim();return{title:sub||String(r.baslik).replace(/^Kontrol Listesi\s*:\s*/i,'').trim(),sub:''}}return{title:r.baslik,sub:r.altBaslik||''}}
function todoSection(){
  const rows=teacherUpcomingRows().slice(0,4);if(!rows.length)return'';
  return sectionHtml('Yapılacaklar',`<div class="ka-today-list">${rows.map((r,i)=>{const s=reminderStatus(r),t=reminderRowText(r),tone=s.state==='is-overdue'?'rose':s.state==='is-today'?'amber':'slate';return `<button type="button" class="ka-today-row" data-dash-reminder-index="${i}"><span class="ka-today-row__ico" aria-hidden="true">${esc(reminderIcon(r.kaynak))}</span><span class="ka-today-row__main"><b>${esc(t.title)}</b>${t.sub?`<small>${esc(t.sub)}</small>`:''}</span><span class="ka-today-row__chip" data-tone="${tone}">${esc(s.label)}</span></button>`}).join('')}</div>`,{link:'Tümü',attrs:'data-dash-reminders-all'});
}
function upcomingSection(){
  const rows=upcomingRows().slice(0,5);if(!rows.length)return'';
  return sectionHtml('Yaklaşanlar',`<div class="ka-today-list">${rows.map(r=>`<button type="button" class="ka-today-row" data-dash-route="${esc(r.route||'communication')}" data-dash-page="${esc(r.page||'calendar')}" data-dash-title="${esc(r.routeTitle||'Takvim')}"><span class="ka-today-row__ico" aria-hidden="true">${esc(r.icon||'•')}</span><span class="ka-today-row__main"><b>${esc(r.title)}</b><small>${esc(r.when||'')}</small></span><span class="ka-today-row__chip">${esc(r.kind||'')}</span></button>`).join('')}</div>`,toolOf('calendar')?{link:'Takvim',attrs:'data-dash-tool="calendar"'}:{});
}
function quickSection(ids,{note=false}={}){
  const tools=ids.map(toolOf).filter(Boolean);
  const items=tools.map(t=>`<button type="button" class="ka-today-quick__item" data-dash-tool="${esc(t.id)}" data-tone="${esc(t.tone)}"><span class="ka-today-quick__ico" aria-hidden="true">${icon(t.icon,22)}</span><span>${esc(t.label)}</span></button>`);
  if(note)items.push(`<button type="button" class="ka-today-quick__item" data-dash-quick-note data-tone="amber"><span class="ka-today-quick__ico" aria-hidden="true">${icon('note',22)}</span><span>Hızlı not</span></button>`);
  return items.length?sectionHtml('Hızlı araçlar',`<div class="ka-today-quick">${items.join('')}</div>`):'';
}
function toolOf(id){const t=nav()?.tool?.(id);return t&&nav().toolAllowed(t)?t:null}
function kpiHtml(){
  const teachers=arr('ogretmenler'),leaves=activeLeaves(),away=new Set(leaves.map(x=>x.ogretmenId).filter(Boolean)).size||leaves.length,duties=todayDuties().length,soon=upcomingRows().length;
  let setup=null;try{setup=window.NavPages?.setupProgress?.()||null}catch(_){}
  const k=[
    {tool:'teachers',label:'Görevdeki öğretmen',value:teachers.length?`${Math.max(0,teachers.length-away)}/${teachers.length}`:'—',sub:away?`${away} öğretmen izinli`:'Tamamı görevde'},
    {tool:'duty',label:'Bugünkü nöbetçi',value:String(duties),sub:duties?'Nöbet atandı':'Nöbet kaydı yok'},
    {tool:'calendar',label:'Yaklaşan iş',value:String(soon),sub:'Önümüzdeki 14 gün'},
    setup&&!setup.done?{tool:'school-info',label:'Okul kurulumu',value:`${setup.ready}/${setup.total}`,sub:setup.missing?.[0]?`Eksik: ${setup.missing[0]}`:'Adımları tamamla'}:{tool:'students',label:'Öğrenci',value:String(arr('veliler').length),sub:'Kayıtlı öğrenci'}
  ];
  return `<div class="ka-today-kpis">${k.filter(x=>toolOf(x.tool)).map(x=>`<button type="button" class="ka-today-kpi" data-dash-tool="${x.tool}"><small>${esc(x.label)}</small><b>${esc(x.value)}</b><span>${esc(x.sub)}</span></button>`).join('')}</div>`;
}
function headHtml(){const manager=isManagerView();return `<header class="ka-today-head"><p>${esc(dateLine())}</p><h2>${esc(greeting())}, ${esc(firstName())}</h2>${manager?'<small>Okulun bugünkü durumu</small>':''}</header>`}

function safeSection(fn,name){try{return fn()||''}catch(err){console.warn('[Dashboard]',name||'section',err);return''}}
function shell(){
  const manager=isManagerView(),parts=manager?[['hero',()=>heroHtml([])],['kpi',kpiHtml],['leaves',leavesSection],['who',whoIsWhereSection],['duty',allDutySection],['todo',todoSection],['upcoming',upcomingSection],['quick',()=>quickSection(['announcements','duty','tutanak','evrak'])],['announce',announcementSection],['trial',trialCounterSection]]:(()=>{const mine=teacherId()?todayLessons({mine:true}):[];return[['hero',()=>heroHtml(mine)],['lessons',()=>myLessonsSection(mine)],['duty',myDutySection],['todo',todoSection],['quick',()=>quickSection(['student-attendance','tutanak','plans'],{note:true})],['announce',announcementSection],['trial',trialCounterSection]]})();
  return `<section class="ka-today" data-dashboard-module data-dashboard-role="${manager?'idareci':'ogretmen'}">${headHtml()}${parts.map(([n,fn])=>safeSection(fn,n)).join('')}</section>`;
}
function reminderIcon(source){return({evrak:'📄',gorev:'✓',nobet:'🛡️',sosyalKulupler:'♡',rehberlik:'🧭',maarifRapor:'🏅',zumre:'👥',sok:'🛡️',bepPlani:'📋',belirliGunler:'📅',sinav:'📝',kontrolListesi:'☑️',toplanti:'👥',periyodik:'🔁'})[source]||'🔔'}
function bindPresentation(root){
  root.querySelectorAll('[data-dash-external]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const url=btn.dataset.dashExternal;if(url)window.open(url,'_blank','noopener,noreferrer')}));

  root.querySelectorAll('[data-dash-route]').forEach(btn=>btn.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const ok=await window.ShellUI?.routeModule?.(btn.dataset.dashRoute,{page:btn.dataset.dashPage||'',title:btn.dataset.dashTitle||''});if(ok===false)return false;const trialId=btn.dataset.dashTrialOpen;if(trialId)requestAnimationFrame(()=>window.AcademicModule?.openTrialCounter?.(trialId));return ok}));
  root.querySelectorAll('[data-dash-lesson-plan]').forEach(btn=>btn.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const ok=await window.ShellUI?.routeModule?.('academic',{title:'Yıllık Plan'});if(ok===false)return;const opened=await window.AcademicModule?.openPlanForLesson?.(btn.dataset.lesson||'',btn.dataset.class||'');if(opened===false)window.toast?.('Bu ders ve sınıf için eşleşen yıllık plan bulunamadı.')}));
  root.querySelectorAll('[data-dash-duty-book]').forEach(box=>box.addEventListener('change',async()=>{const atama=arr('nobetAtamalari').find(x=>x.id===box.dataset.dashDutyBook);if(!atama)return;box.disabled=true;try{await window.DutyBookService?.toggle?.(atama,box.checked);window.toast?.(box.checked?'✅ Nöbet defteri işaretlendi.':'Nöbet defteri işareti kaldırıldı.')}catch(e){box.checked=!box.checked;window.toast?.(e?.message==='sahip-degil'?'Bu nöbet size ait değil.':'Nöbet defteri durumu güncellenemedi.')}finally{box.disabled=false}}));
  root.querySelectorAll('[data-dash-reminder-index]').forEach(btn=>btn.addEventListener('click',()=>teacherUpcomingRows()[Number(btn.dataset.dashReminderIndex)]?.git?.()));
  root.querySelectorAll('[data-dash-announcement-read]').forEach(box=>{box.addEventListener('click',e=>e.stopPropagation());box.addEventListener('change',async e=>{e.preventDefault();e.stopPropagation();if(!box.checked)return;box.disabled=true;try{if(!window.DuyurularService?.okunduIsaretle)await window.AppLoader?.load?.('communication');if(!window.DuyurularService?.okunduIsaretle)throw new Error('Duyuru servisi yüklenemedi.');await window.DuyurularService.okunduIsaretle(box.dataset.dashAnnouncementRead);window.toast?.('Duyuru okundu olarak işaretlendi.');requestAnimationFrame(render)}catch(err){box.checked=false;window.toast?.(err?.message||'Duyuru güncellenemedi.')}finally{box.disabled=false}})});
  root.querySelectorAll('[data-dash-tool]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();const t=nav()?.tool?.(btn.dataset.dashTool);if(t)Promise.resolve(window.ShellUI?.routeModule?.(t.route,{page:t.page,title:t.label})).catch(()=>window.toast?.('Sayfa açılamadı.'))}));
  root.querySelectorAll('[data-dash-page-go]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();window.ShellUI?.openPage?.(btn.dataset.dashPageGo)}));
  root.querySelectorAll('[data-dash-reminders-all]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();const items=collectReminders();if(items.length)openReminderPopup(items)}));
  root.querySelectorAll('[data-home-announcement-gallery]').forEach(g=>window.DashboardAnnouncementMedia?.bindGallery?.(g));
  root.querySelectorAll('[data-dash-quick-note]').forEach(btn=>btn.addEventListener('click',()=>window.ShellUI?.openQuickNote?.()));
}


/* ========================= LOCAL-FIRST HATIRLATMA MOTORU ========================= */
const REMINDER_DEFS={evrakTakibi:'evrak',sosyalKulupler:'sosyalKulupler',rehberlik:'rehberlik',maarifRapor:'maarifRapor',zumre:'zumre',sok:'sok',bepPlani:'bepPlani',belirliGunler:'belirliGunler',kontrolListeleri:'kontrolListeleri',kontrolListeTamamlama:'kontrolListeTamamlama',hatirlatmaAyarlari:'hatirlatmaAyarlari',dersSaatleri:'dersSaatleri',ogretmenIzinleri:'ogretmenIzinleri',anketler:'anketler',okulBilgileri:'okulBilgileri',yillikPlanTanimlari:'yillikPlanTanimlari',ogretmenYillikPlanSecimleri:'ogretmenYillikPlanSecimleri',periyodikIsler:'periyodikIsler',periyodikSablon:'periyodikSablon'};
const MONTH_NAMES=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const MONTHLY={sosyalKulupler:{aylar:['Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'],start:2,label:'Sosyal Kulüp Aylık Rapor',teacherField:'ogretmenIdler'},rehberlik:{aylar:['Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'],start:1,label:'Rehberlik Aylık Rapor',teacherField:'ogretmenId'},maarifRapor:{aylar:['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'],start:0,label:'Maarif Model Aylık Rapor',teacherField:'ogretmenId'}};
const ONE_OFF=[{type:'sosyalKulupler',field:'yillikPlanTarihi',index:0,label:'Sosyal Kulüp — Yıllık Plan',teacherField:'ogretmenIdler'},{type:'sosyalKulupler',field:'toplumHizmetiTarihi',index:1,label:'Sosyal Kulüp — Toplum Hizmeti Planı',teacherField:'ogretmenIdler'},{type:'rehberlik',field:'yillikPlanTarihi',index:0,label:'Rehberlik — Yıllık Çalışma Planı',teacherField:'ogretmenId'},{type:'bepPlani',field:'yillikDersPlaniTarihi',index:0,label:'Yıllık Ders Planı',teacherField:'ogretmenId',flag:'yillikPlanVar'},{type:'bepPlani',field:'bepPlaniTarihi',index:1,label:'BEP Planı',teacherField:'ogretmenId',flag:'bepPlanVar'}];
function reminderSettings(){return{gunSayisi:3,erteleSaat:4,...(arr('hatirlatmaAyarlari').find(x=>x.id==='ayarlar')||arr('hatirlatmaAyarlari')[0]||{})}}
function dayDiff(iso){if(!iso)return 99999;const a=new Date(isoToday()+'T00:00:00'),b=new Date(String(iso).slice(0,10)+'T00:00:00');return Number.isNaN(b.getTime())?99999:Math.round((b-a)/86400000)}
function nextMonthFirstWeek(year,month0){let m=month0+1,y=year;if(m>11){m=0;y++}return`${y}-${String(m+1).padStart(2,'0')}-07`}
function academicMonthDeadline(shortName){const idx=MONTH_NAMES.indexOf(shortName);if(idx<0)return null;const now=new Date();let iso=nextMonthFirstWeek(now.getFullYear(),idx);if(new Date(iso+'T00:00:00')>now)iso=nextMonthFirstWeek(now.getFullYear()-1,idx);return iso}
function belongs(row,id,field){return field==='ogretmenIdler'?(row?.[field]||[]).includes(id):row?.[field]===id}
function route(module,page='',title=''){return()=>window.ShellUI?.routeModule?.(module,{page,title})}
function reminder(type,title,subtitle,diff,module,page='',pageTitle=''){return{kaynak:type,baslik:title,altBaslik:subtitle||'',gunFarki:diff,module,page,git:route(module,page,pageTitle)}}
const REMINDER_ROUTE_MAP=Object.freeze({sosyalKulupler:['tools','form-kulup','Sosyal Kulüpler'],rehberlik:['tools','form-rehberlik','Rehberlik'],maarifRapor:['tools','form-maarif','Maarif Model'],zumre:['tools','form-zumre','Zümre'],sok:['tools','form-sok','ŞÖK'],bepPlani:['tools','form-bep','BEP Planları'],belirliGunler:['tools','form-belirli','Belirli Günler ve Haftalar'],kontrolListesi:['tools','checklists','Kontrol Listeleri'],nobet:['management','duty','Nöbet Programı'],periyodik:['management','tasks','Aylık İşler'],sinav:['academic','written','Yazılı Sınavlar']});
function exactReminder(type,title,subtitle,diff){const target=REMINDER_ROUTE_MAP[type];if(!target)throw new Error('Hatırlatma hedefi tanımsız: '+type);return reminder(type,title,subtitle,diff,target[0],target[1],target[2])}
function scanTasks(id,days){return arr('gorevler').filter(x=>(x.sorumluOgretmenIdler||[]).includes(id)&&!['tamamlandi','Tamamlandı','Tamamlandi'].includes(x.durum)&&x.sonTarih).map(x=>reminder('gorev',`Görev: ${x.baslik||'Görev'}`,x.aciklama,dayDiff(x.sonTarih),'dashboard')).filter(x=>x.gunFarki<=days)}
function scanDocuments(id,days){return arr('evrakTakibi').filter(x=>(x.sorumluOgretmenIdler||[]).includes(id)&&!['Tamamlandı','Tamamlandi','Arşivlendi','Arsivlendi'].includes(x.durum)&&x.tarih).map(x=>reminder('evrak',`Evrak: ${x.evrakAdi||x.baslik||'Evrak'}`,x.aciklama,dayDiff(x.tarih),'documents','evrak','Evrak Takibi')).filter(x=>x.gunFarki<=days)}
function scanDuty(id){const today=isoToday(),places=arr('nobetYerleri');return arr('nobetAtamalari').filter(x=>x.tarih===today&&x.ogretmenId===id&&!x.defterDolduruldu).map(x=>exactReminder('nobet',`Bugün nöbetçisiniz: ${places.find(p=>p.id===x.yerId)?.ad||x.yerAdi||'Nöbet'}`,'Nöbet defterini doldurmayı unutmayın',0))}
function scanMonthly(id,days){const out=[];Object.entries(MONTHLY).forEach(([type,cfg])=>arr(type).forEach(row=>{if(!belongs(row,id,cfg.teacherField))return;cfg.aylar.forEach((shortName,i)=>{if((row.kontroller||[])[cfg.start+i])return;const target=academicMonthDeadline(shortName),diff=dayDiff(target);if(diff>=-400&&diff<=days)out.push(exactReminder(type,`${cfg.label} — ${shortName}`,row.ders||row.sinif||row.rapor||'',diff))})}));return out}
function scanPeriods(id,days){const out=[];for(const type of ['zumre','sok'])arr(type).forEach(row=>{if(row.ogretmenId!==id)return;['tarih1','tarih2','tarih3'].forEach((field,i)=>{const target=row[field];if(!target||(row.kontroller||[])[i])return;const diff=dayDiff(target);if(diff<=days)out.push(exactReminder(type,`${type==='zumre'?'Zümre Toplantısı':'ŞÖK'} — ${['1. Dönem','2. Dönem','Yıl Sonu'][i]}: ${row.brans||row.konu||row.sinif||''}`.trim(),row.sinif&&row.brans?row.sinif:'',diff))})});return out}
function reminderTeacherName(id){const t=arr('ogretmenler').find(x=>String(x?.id||'')===String(id||''));return String(t?.adSoyad||[t?.ad,t?.soyad].filter(Boolean).join(' ')||'').trim()}function scanOneOff(id,days){const out=[];ONE_OFF.forEach(cfg=>arr(cfg.type).forEach(row=>{if(!belongs(row,id,cfg.teacherField))return;if(cfg.flag&&row[cfg.flag]===false)return;const target=row[cfg.field];if(!target||(row.kontroller||[])[cfg.index])return;const diff=dayDiff(target);if(diff<=days){const subtitle=cfg.type==='bepPlani'?([row.brans,row.sinif].filter(Boolean).join(' · ')||reminderTeacherName(row.ogretmenId)):(row.ad||row.brans||row.sinif||'');out.push(exactReminder(cfg.type,cfg.label,subtitle,diff))}}));return out}
function scanSpecialDays(id,days){return arr('belirliGunler').filter(x=>(x.ogretmenIdler||[]).includes(id)&&!(x.kontroller||[])[0]&&x.tarihBaslangic).map(x=>exactReminder('belirliGunler',`Belirli Gün/Hafta: ${x.ad||''}`,'',dayDiff(x.tarihBaslangic))).filter(x=>x.gunFarki<=days)}
function scanExams(id,days){return arr('sinavlar').filter(x=>x.ogretmenId===id&&x.tarih).map(x=>exactReminder('sinav',`Yazılı Sınav: ${x.ders||''} ${x.sinif||''}`.trim(),x.saat?`Saat: ${x.saat}`:'',dayDiff(x.tarih))).filter(x=>x.gunFarki>=0&&x.gunFarki<=days)}
/* Yıllık / BEP planı sınıf bazında bağımsız atanabilir: geçerli olmayan plan hatırlatma ve kontrol listesi hesabına girmez. */
function planOff(type,row,i){return type==='bepPlani'&&(i===0?row?.yillikPlanVar===false:i===1?row?.bepPlanVar===false:false)}
function linkedTeacherIds(row){if(Array.isArray(row?.ogretmenIdler))return row.ogretmenIdler;if(row?.ogretmenId)return[row.ogretmenId];return[]}
function linkedDate(type,row,index){if(!row)return null;if(type==='zumre'||type==='sok')return row[`tarih${index+1}`]||null;if(type==='sosyalKulupler'){if(index===0)return row.yillikPlanTarihi||null;if(index===1)return row.toplumHizmetiTarihi||null;const short=MONTHLY.sosyalKulupler.aylar[index-2];return short?academicMonthDeadline(short):null}if(type==='rehberlik'){if(index===0)return row.yillikPlanTarihi||null;const short=MONTHLY.rehberlik.aylar[index-1];return short?academicMonthDeadline(short):null}if(type==='bepPlani')return index===0?(row.yillikDersPlaniTarihi||null):(row.bepPlaniTarihi||null);if(type==='maarifRapor'){const short=MONTHLY.maarifRapor.aylar[index];return short?academicMonthDeadline(short):null}if(type==='belirliGunler')return row.tarihBaslangic||null;return row.tarih||row.sonTarih||null}
function itemTargetsTeacher(item,id){if(item.baglıEvrak){const ids=item.baglıEvrak.kayitIdler||(item.baglıEvrak.kayitId?[item.baglıEvrak.kayitId]:[]);return ids.some(rid=>linkedTeacherIds(arr(item.baglıEvrak.tip).find(x=>x.id===rid)).includes(id))}if(!item.hedefTip||item.hedefTip==='herkes')return true;if(item.hedefTip==='ozel')return(item.hedefOgretmenIdler||[]).includes(id);const teacher=arr('ogretmenler').find(x=>x.id===id);if(!teacher||typeof window.kademeFiiliListesi!=='function')return true;return window.kademeFiiliListesi(teacher).includes(item.hedefTip)}
function scanChecklists(id,days){const out=[];for(const list of arr('kontrolListeleri').filter(x=>x.yayinda!==false)){const complete=new Set((arr('kontrolListeTamamlama').find(x=>x.id===`${id}_${list.id}`||x.ogretmenId===id&&x.listeId===list.id)?.tamamlananMaddeIdler)||[]);for(const item of list.maddeler||[]){if(!itemTargetsTeacher(item,id))continue;let target=item.tarih,done=complete.has(item.id);if(item.baglıEvrak){const ids=item.baglıEvrak.kayitIdler||(item.baglıEvrak.kayitId?[item.baglıEvrak.kayitId]:[]),indices=item.baglıEvrak.kontrolIndexler||(item.baglıEvrak.kontrolIndex!==undefined?[item.baglıEvrak.kontrolIndex]:[]),row=ids.map(rid=>arr(item.baglıEvrak.tip).find(x=>x.id===rid)).find(x=>x&&linkedTeacherIds(x).includes(id));if(!row)continue;const relevant=indices.length?indices:[0];const live=relevant.filter(i=>!planOff(item.baglıEvrak.tip,row,i));done=live.every(i=>(row.kontroller||[])[i]);target=live.map(i=>linkedDate(item.baglıEvrak.tip,row,i)).filter(Boolean).sort()[0]||null}if(!target||done)continue;const diff=dayDiff(target);if(diff<=days)out.push(exactReminder('kontrolListesi',`Kontrol Listesi: ${list.ad||'Liste'}`,item.metin||'',diff))}}return out}
function periodicEditor(){return !!(window.PermissionService?.can?.('management.periodic.edit','edit')||window.PermissionService?.can?.('management.periodic','edit')||globalThis.duzenleyebilir?.('periyodikIsler'))}
function scanPeriodic(days){if(!periodicEditor())return[];return arr('periyodikIsler').filter(x=>!x.tamamlandi&&(x.bitis||x.baslangic)).map(x=>({x,diff:dayDiff(x.bitis||x.baslangic),hg:Number.isFinite(Number(x.hatirlatGun))?Number(x.hatirlatGun):3})).filter(r=>r.hg>0&&r.diff>=-90&&r.diff<=Math.max(r.hg,days>6?days:0)).map(r=>exactReminder('periyodik',`Aylık İş: ${r.x.isAdi||'İş'}`,`Son gün: ${String(r.x.bitis||r.x.baslangic).slice(0,10).split('-').reverse().join('.')}`,r.diff))}
let periodicAutoDone='';
async function periodicAutoGenerate(){const ay=isoToday().slice(0,7);if(periodicAutoDone===ay||!periodicEditor()||!window.AppStore?.get?.('meta.lastRemoteSyncAt'))return;const d=arr('periyodikSablon').find(x=>x.id==='sablon'),rules=Array.isArray(d?.gorevler)?d.gorevler:[];if(!rules.length)return;const n=new Date().getMonth()+1,need=rules.some(g=>g.isAdi&&g.aktif!==false&&(!Array.isArray(g.aylar)||!g.aylar.length||g.aylar.map(Number).includes(n))&&!arr('periyodikIsler').some(p=>p.isAdi===g.isAdi&&(p.ay||String(p.bitis||p.baslangic||'').slice(0,7))===ay));if(!need){periodicAutoDone=ay;return}try{await window.AppLoader?.load?.('management');if(window.PeriyodikService?.otomatikOlustur){await window.PeriyodikService.otomatikOlustur(rules,arr('periyodikIsler'),d?.engellenen||[]);periodicAutoDone=ay}}catch(e){console.warn('[Aylık işler]',e?.message||e)}}
function collectRemindersRaw(daysOverride=null){const id=teacherId(),days=Number.isFinite(Number(daysOverride))?Math.max(0,Number(daysOverride)):(Number(reminderSettings().gunSayisi)||3);if(!id)return scanPeriodic(days).sort((a,b)=>a.gunFarki-b.gunFarki);return[...scanTasks(id,days),...scanDocuments(id,days),...scanDuty(id),...scanMonthly(id,days),...scanPeriods(id,days),...scanOneOff(id,days),...scanSpecialDays(id,days),...scanExams(id,days),...scanChecklists(id,days),...scanPeriodic(days)].filter(x=>Number.isFinite(x.gunFarki)).sort((a,b)=>a.gunFarki-b.gunFarki)}
function collectReminders(daysOverride=null){const days=Number.isFinite(Number(daysOverride))?Math.max(0,Number(daysOverride)):(Number(reminderSettings().gunSayisi)||3),list=collectRemindersRaw(daysOverride);return window.KorukTeacherReminderAcademicYear?.normalizeList?.(list,days)||list}
function holidayMode(){return window.SchoolLiveStatus?.status?.()?.mode==='holiday'}
async function reminderSnoozed(){const u=user().uid;if(!u||!window.KorukLocalFirst)return false;const until=await KorukLocalFirst.meta(u,'reminderSnoozeUntil');return Number(until||0)>Date.now()}
async function snoozeReminders(){const hours=Number(reminderSettings().erteleSaat)||4,u=user().uid;if(u&&window.KorukLocalFirst)await KorukLocalFirst.meta(u,'reminderSnoozeUntil',Date.now()+hours*3600000);closeReminderPopup()}
function closeReminderPopup(){const ov=document.getElementById('dashboardReminderModal');if(!ov)return;if(ov._reminderKeyHandler)document.removeEventListener('keydown',ov._reminderKeyHandler);ov.remove()}
const REMINDER_KIND_META=Object.freeze({
  gorev:{icon:'✅',label:'Görev',tone:'task'},
  evrak:{icon:'📄',label:'Evrak',tone:'document'},
  nobet:{icon:'🛡️',label:'Nöbet',tone:'duty'},
  sosyalKulupler:{icon:'👥',label:'Sosyal Kulüp',tone:'club'},
  rehberlik:{icon:'🧭',label:'Rehberlik',tone:'guidance'},
  maarifRapor:{icon:'📊',label:'Maarif Raporu',tone:'report'},
  zumre:{icon:'👥',label:'Zümre',tone:'meeting'},
  sok:{icon:'🏫',label:'ŞÖK',tone:'meeting'},
  bepPlani:{icon:'📋',label:'BEP Planı',tone:'plan'},
  belirliGunler:{icon:'📅',label:'Belirli Gün',tone:'calendar'},
  kontrolListesi:{icon:'☑️',label:'Kontrol Listesi',tone:'checklist'},
  sinav:{icon:'📝',label:'Sınav',tone:'exam'},
  periyodik:{icon:'🔁',label:'Aylık İş',tone:'task'}
});
function reminderKind(r){return REMINDER_KIND_META[r?.kaynak]||{icon:'🔔',label:'Hatırlatma',tone:'default'}}
function reminderSummary(items){return{overdue:items.filter(x=>x.gunFarki<0).length,today:items.filter(x=>x.gunFarki===0).length,upcoming:items.filter(x=>x.gunFarki>0).length}}
function reminderStatus(r){if(r.gunFarki<0)return{label:`${Math.abs(r.gunFarki)} gün gecikti`,cls:'ka-badge--danger',state:'is-overdue'};if(r.gunFarki===0)return{label:'Bugün son gün',cls:'ka-badge--warning',state:'is-today'};return{label:`${r.gunFarki} gün kaldı`,cls:'',state:'is-upcoming'}}
function reminderChevron(){return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'}
function reminderCloseIcon(){return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'}
function openReminderPopup(items){
  closeReminderPopup();
  const settings=reminderSettings(),hours=Number(settings.erteleSaat)||4,summary=reminderSummary(items),ov=document.createElement('div');
  ov.id='dashboardReminderModal';
  ov.className='ka-modal-backdrop';
  ov.classList.add('ka-reminder-backdrop');
  ov.innerHTML=`<section class="ka-modal ka-reminder-modal" role="dialog" aria-modal="true" aria-labelledby="dashboardReminderTitle" aria-describedby="dashboardReminderDescription">
    <header class="ka-reminder-head">
      <span class="ka-reminder-head__mark">${bellSvg('bell')}</span>
      <div class="ka-reminder-head__copy"><small>ÖĞRETMEN HATIRLATMALARI</small><h2 id="dashboardReminderTitle">Hatırlatmalarınız</h2><p id="dashboardReminderDescription"><b>${esc(firstName())}</b>, ${items.length} işlemi gözden geçirmeniz gerekiyor.</p></div>
      <button class="ka-reminder-close" type="button" data-reminder-close aria-label="Hatırlatmaları kapat">${reminderCloseIcon()}</button>
    </header>
    <div class="ka-reminder-summary" aria-label="Hatırlatma özeti">
      <div class="is-overdue"><span>!</span><small>Geciken</small><strong>${summary.overdue}</strong></div>
      <div class="is-today"><span>●</span><small>Bugün</small><strong>${summary.today}</strong></div>
      <div class="is-upcoming"><span>→</span><small>Yaklaşan</small><strong>${summary.upcoming}</strong></div>
    </div>
    <div class="ka-reminder-list-head"><div><strong>Yapılacaklar</strong><small>Öncelikli olanlar listenin üstünde</small></div><b>${items.length}</b></div>
    <div class="ka-reminder-list" role="list">${items.map((r,i)=>{const status=reminderStatus(r),kind=reminderKind(r);return`<button class="ka-reminder-item ka-reminder-item--${kind.tone} ${status.state}" type="button" data-reminder-index="${i}" role="listitem"><span class="ka-reminder-item__icon" aria-hidden="true">${kind.icon}</span><span class="ka-reminder-item__copy"><small>${esc(kind.label)}</small><strong>${esc(r.baslik)}</strong>${r.altBaslik?`<span>${esc(r.altBaslik)}</span>`:''}</span><span class="ka-reminder-item__side"><b>${esc(status.label)}</b><i>${reminderChevron()}</i></span></button>`}).join('')}</div>
    <footer class="ka-reminder-footer">
      <button class="ka-reminder-snooze" type="button" data-reminder-snooze>${bellSvg('clock')}<span><strong>${hours} saat sonra</strong><small>Tekrar hatırlat</small></span></button>
      <button class="ka-btn ka-reminder-done" type="button" data-reminder-ok><span>✓</span> Tamam, gördüm</button>
    </footer>
  </section>`;
  document.body.appendChild(ov);
  const close=()=>closeReminderPopup();
  ov.querySelector('[data-reminder-close]').onclick=close;
  ov.querySelector('[data-reminder-ok]').onclick=close;
  ov.querySelector('[data-reminder-snooze]').onclick=snoozeReminders;
  ov.querySelectorAll('[data-reminder-index]').forEach(btn=>btn.onclick=()=>{const r=items[Number(btn.dataset.reminderIndex)];closeReminderPopup();r?.git?.()});
  ov.addEventListener('click',e=>{if(e.target===ov)close()});
  ov._reminderKeyHandler=e=>{if(e.key==='Escape')close()};
  document.addEventListener('keydown',ov._reminderKeyHandler);
  requestAnimationFrame(()=>ov.querySelector('[data-reminder-index]')?.focus({preventScroll:true}));
}
async function maybeShowReminders(){if(reminderShown||holidayMode()||await reminderSnoozed())return;const items=collectReminders();if(!items.length)return;reminderShown=true;openReminderPopup(items)}
async function prepareReminderData(){if(!window.SyncEngine||!window.COL)return;const types=[];for(const[type,colKey]of Object.entries(REMINDER_DEFS)){const col=COL[colKey];if(!col)continue;SyncEngine.register(type,col);types.push(type)}if(COL.toplantiCizelgesi){SyncEngine.register('toplantiCizelgesi',COL.toplantiCizelgesi);types.push('toplantiCizelgesi')}if(types.length){await SyncEngine.localHydrate([...new Set(types)]);SyncEngine.schedule(120)}}
function render(){
  if(!mounted)return;
  const section=document.querySelector('[data-dashboard-module]');if(!section)return;
  const parent=section.parentElement||document.getElementById('v2ModuleRoot'),scrollY=window.scrollY;
  parent.innerHTML=shell();bindPresentation(parent);refreshHeroLive();
  lastLiveRenderKey=liveRenderKey(SLS()?.status?.()||{});
  if(scrollY>0&&!scrolling)requestAnimationFrame(()=>{if(Math.abs(window.scrollY-scrollY)>2)window.scrollTo(0,scrollY)});
}
function queueRender(){
  if(!mounted)return;
  if(scrolling){pendingRender=true;return}
  /* Yenileme/senkronizasyon sırasında birçok AppStore bildirimi peş peşe gelir; son değişiklikten sonra tek render yapılır. */
  if(renderTimer){clearTimeout(renderTimer);renderTimer=0}
  renderTimer=setTimeout(()=>{
    renderTimer=0;
    if(!mounted||scrolling||renderFrame)return;
    renderFrame=requestAnimationFrame(()=>{renderFrame=0;if(mounted&&!scrolling)render()});
  },350);
}
function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];const base=['data.ogretmenler','data.dersProgrami','data.siniflar','data.veliler','data.hatirlaticilar','data.gorevler','data.sinavlar','data.denemeSinavlari','data.duyurular','data.nobetAtamalari','data.nobetYerleri','data.ogretmenIzinleri','data.okulBilgileri','data.dersSaatleri','data.toplantiCizelgesi','session.user'],paths=[...new Set([...base,...Object.keys(REMINDER_DEFS).map(t=>'data.'+t)])];paths.forEach(p=>{const u=window.AppStore?.subscribe?.(p,queueRender);if(u)unsubs.push(u)})}
const liveTickHandler=e=>{const live=e?.detail||SLS()?.status?.()||{},key=liveRenderKey(live);if(key!==lastLiveRenderKey){lastLiveRenderKey=key;queueRender();return}refreshHeroLive(live)};
const scrollHandler=()=>{scrolling=true;clearTimeout(scrollIdleTimer);scrollIdleTimer=setTimeout(()=>{scrolling=false;if(pendingRender){pendingRender=false;queueRender()}},150)};
function mount(root=document.getElementById('v2ModuleRoot')){
  if(!root)return Promise.resolve(false);
  if(mounted&&root.querySelector('[data-dashboard-module]'))return mountPromise||Promise.resolve(true);
  if(mountPromise)return mountPromise;
  mounted=true;
  mountPromise=(async()=>{
    root.innerHTML=shell();bindPresentation(root);
    await prepareReminderData();
    if(!mounted)return false;
    subscribe();render();
    clearInterval(trialTimer);trialTimer=setInterval(()=>refreshTrialTimers(),1000);
    window.removeEventListener('koruk:school-live-tick',liveTickHandler);window.addEventListener('koruk:school-live-tick',liveTickHandler);
    window.removeEventListener('scroll',scrollHandler);window.addEventListener('scroll',scrollHandler,{passive:true});
    requestAnimationFrame(()=>maybeShowReminders());
    [0,6000,25000].forEach(t=>setTimeout(periodicAutoGenerate,t));
    return true;
  })().finally(()=>{mountPromise=null});
  return mountPromise;
}
function unmount(){mounted=false;mountPromise=null;if(renderFrame)cancelAnimationFrame(renderFrame);renderFrame=0;if(renderTimer)clearTimeout(renderTimer);renderTimer=0;clearInterval(trialTimer);trialTimer=null;window.removeEventListener('scroll',scrollHandler);clearTimeout(scrollIdleTimer);scrollIdleTimer=null;scrolling=false;pendingRender=false;lastLiveRenderKey='';window.removeEventListener('koruk:school-live-tick',liveTickHandler);closeReminderPopup();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
window.DashboardModule={mount,unmount,render,collectReminders,maybeShowReminders,prepareReminderData,meetingUpcomingRows};
window.uygulamaBaslat=function(){window.AppLoader?.load?.('dashboard').then(()=>mount()).catch(e=>console.warn('[Dashboard]',e?.message||e))};
window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='dashboard')mount()});
for(const ev of ['koruk:app-config-changed','koruk:nav-role-changed','koruk:permissions-changed'])window.addEventListener(ev,()=>{if(mounted)requestAnimationFrame(render)});
})();
