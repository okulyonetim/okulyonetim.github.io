/* Koruk Asistan — Öğretmen hatırlatmalarında eğitim-öğretim yılı sınırı. */
(function(global){
'use strict';
if(global.__korukTeacherReminderAcademicYear)return;
global.__korukTeacherReminderAcademicYear=true;

const MONTHS=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const MONTHLY_RE=/^(?:Sosyal Kulüp Aylık Rapor|Rehberlik Aylık Rapor|Maarif Model Aylık Rapor)\s*[—-]\s*(Oca|Şub|Mar|Nis|May|Haz|Tem|Ağu|Eyl|Eki|Kas|Ara)\s*$/;
const ACADEMIC_SOURCES=new Set(['sosyalKulupler','rehberlik','maarifRapor','zumre','sok','bepPlani','belirliGunler','sinav','kontrolListesi']);

const rows=type=>{const v=global.AppStore?.data?.(type);return Array.isArray(v)?v:[]};
function dateOnly(value){
  const s=String(value||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
  const d=new Date(s+'T00:00:00');
  return Number.isNaN(d.getTime())?null:d;
}
function today(){const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())}
function diffDays(target,now=today()){return Math.round((target-now)/86400000)}
function academicStartYear(now=today()){return now.getMonth()>=8?now.getFullYear():now.getFullYear()-1}
function academicDeadline(shortName,now=today()){
  const month=MONTHS.indexOf(shortName);
  if(month<0)return null;
  const start=academicStartYear(now);
  const reportYear=month>=8?start:start+1;
  let y=reportYear,m=month+1;
  if(m>11){m=0;y++}
  return new Date(y,m,7);
}
function reminderSettings(){return rows('hatirlatmaAyarlari').find(x=>x?.id==='ayarlar')||rows('hatirlatmaAyarlari')[0]||{}}
function schoolSettings(){return rows('dersSaatleri').find(x=>x?.id==='ayarlar')||rows('dersSaatleri')[0]||{}}
function reminderDays(){const n=Number(reminderSettings().gunSayisi);return Number.isFinite(n)?Math.max(0,n):3}
function seasonClosed(now=today()){
  const cfg=schoolSettings(),summer=dateOnly(cfg.tatilBaslangicTarihi),opening=dateOnly(cfg.okulAcilisTarihi);
  if(!summer)return global.SchoolLiveStatus?.status?.()?.mode==='holiday';
  const cutoff=new Date(summer);cutoff.setDate(cutoff.getDate()-7);
  if(now<cutoff)return false;
  if(opening&&now>=opening)return false;
  return true;
}
function monthlyMonth(title){return String(title||'').trim().match(MONTHLY_RE)?.[1]||''}
function normalizeText(value){return String(value||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
function leaveTeacherName(row){if(row?.ogretmenAdi)return String(row.ogretmenAdi).trim();const id=row?.ogretmenId,t=rows('ogretmenler').find(x=>String(x?.id||'')===String(id||''));return String(t?.adSoyad||[t?.ad,t?.soyad].filter(Boolean).join(' ')||'').trim()}
function leaveRange(row){const start=String(row?.baslangic||row?.baslangicTarihi||row?.tarih||'').slice(0,10),end=String(row?.bitis||row?.bitisTarihi||row?.tarih||start).slice(0,10);return{start,end}}
function isLeaveReminder(item){
  const text=normalizeText(item?.baslik||item?.title||item?.altBaslik||item?.subtitle||item?.aciklama||'');
  if(!text)return false;
  const itemDate=String(item?.tarih||item?.date||item?.sonTarih||'').slice(0,10);
  return rows('ogretmenIzinleri').some(row=>{
    const name=normalizeText(leaveTeacherName(row)),{start,end}=leaveRange(row);
    if(!name||!text.includes(name))return false;
    if(itemDate&&start&&itemDate>=start&&itemDate<=end)return true;
    return /izin|rapor|hekim|refakat|hastalik/.test(text);
  });
}
function filterLeaveReminders(items){return(items||[]).filter(x=>!isLeaveReminder(x))}
function patchReminderStore(){
  const store=global.AppStore;
  if(!store||store.__leaveReminderDataPatched||typeof store.data!=='function')return false;
  const original=store.data.bind(store);
  store.data=function(type,...args){
    const value=original(type,...args);
    if(type==='hatirlaticilar'&&Array.isArray(value))return filterLeaveReminders(value);
    return value;
  };
  store.__leaveReminderDataPatched=true;
  return true;
}
function normalizeReminder(item,days=reminderDays(),now=today()){
  if(!item||isLeaveReminder(item))return null;
  if(seasonClosed(now)&&ACADEMIC_SOURCES.has(item.kaynak))return null;
  const month=monthlyMonth(item.baslik);
  if(!month)return item;
  const deadline=academicDeadline(month,now);
  if(!deadline)return null;
  const diff=diffDays(deadline,now);
  if(diff>days)return null;
  return{...item,gunFarki:diff};
}
function normalizeList(items,days=reminderDays(),now=today()){
  if(seasonClosed(now))return filterLeaveReminders(items).filter(x=>!ACADEMIC_SOURCES.has(x?.kaynak));
  return filterLeaveReminders(items).map(x=>normalizeReminder(x,days,now)).filter(Boolean).sort((a,b)=>Number(a.gunFarki||0)-Number(b.gunFarki||0));
}
function patchDashboardApi(){
  const d=global.DashboardModule;
  if(!d||d.__academicReminderPatched)return false;
  d.__academicReminderPatched=true;
  const original=d.collectReminders?.bind(d),renderOriginal=d.render?.bind(d);
  if(original)d.collectReminders=function(days){return normalizeList(original(days),Number.isFinite(Number(days))?Number(days):reminderDays())};
  if(renderOriginal){
    d.render=function(){const result=renderOriginal();requestAnimationFrame(injectTeacherAbsences);return result};
  }
  return true;
}
function activeTeacherLeaves(){const now=today(),todayIso=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');return rows('ogretmenIzinleri').filter(x=>{const{start,end}=leaveRange(x);return start&&start<=todayIso&&(!end||end>=todayIso)})}
function absencesMarkup(){
  const active=activeTeacherLeaves();if(!active.length)return'';
  const calendar='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>';
  return `<section class="kh-section" data-home-section="absences"><div class="kh-section-head"><div class="kh-section-title">${calendar}<span>Bugün İzinli Öğretmenler</span></div></div><div class="kh-card">${active.map(x=>`<div class="kh-row"><div class="kh-row-main"><b>${String(leaveTeacherName(x)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</b></div><span class="kh-chip amber">İZİNLİ</span></div>`).join('')}</div></section>`;
}
function injectTeacherAbsences(){
  const root=document.querySelector('[data-dashboard-module]');if(!root)return;
  const old=root.querySelector('[data-home-section="absences"]');if(old)return;
  const html=absencesMarkup();if(!html)return;
  const anchor=root.querySelector('[data-home-section="upcoming"]')||root.querySelector('[data-home-section="quick"]');
  if(anchor)anchor.insertAdjacentHTML('beforebegin',html);else root.insertAdjacentHTML('beforeend',html);
}
function injectNextLessonFontFix(){
  if(document.getElementById('koruk-next-lesson-font-fix'))return;
  const style=document.createElement('style');style.id='koruk-next-lesson-font-fix';style.textContent=`
.ka-home .kh-focus h3{
  font-size:14px!important;
  line-height:1.2!important;
  font-weight:800!important;
  letter-spacing:0!important;
}
.ka-home .kh-focus .kh-plan-button{
  font-size:12px!important;
  line-height:1.2!important;
}
.ka-home .kh-section[data-home-section="upcoming"] .kh-row-main b{
  font-size:14px!important;
  line-height:1.2!important;
  font-weight:800!important;
  letter-spacing:0!important;
}
.ka-home .kh-section[data-home-section="upcoming"] .kh-row-main small{
  font-size:11.5px!important;
  line-height:1.2!important;
  font-weight:600!important;
}
@media(max-width:480px){
  .ka-home .kh-focus h3{font-size:14px!important;}
  .ka-home .kh-section[data-home-section="upcoming"] .kh-row-main b{font-size:14px!important;}
  .ka-home .kh-section[data-home-section="upcoming"] .kh-row-main small{font-size:11.5px!important;}
}
`;
  document.head.appendChild(style);
}
function patchCalendarApi(){
  const t=global.TakvimRepository;
  if(!t||t.__leaveReminderPatched)return false;
  t.__leaveReminderPatched=true;
  const original=t.hatirlaticilariDinle?.bind(t);if(!original)return false;
  t.hatirlaticilariDinle=function(cb){return original(rowsList=>cb(filterLeaveReminders(rowsList)))};
  return true;
}
function statusFor(diff){
  if(diff<0)return{label:`${Math.abs(diff)} gün gecikti`,state:'is-overdue'};
  if(diff===0)return{label:'Bugün son gün',state:'is-today'};
  return{label:`${diff} gün kaldı`,state:'is-upcoming'};
}
function refreshPopupSummary(modal){
  const items=[...modal.querySelectorAll('.ka-reminder-item')];
  if(!items.length){modal.remove();return}
  const counts={overdue:0,today:0,upcoming:0};
  items.forEach(el=>{if(el.classList.contains('is-overdue'))counts.overdue++;else if(el.classList.contains('is-today'))counts.today++;else counts.upcoming++});
  const desc=modal.querySelector('#dashboardReminderDescription'),name=desc?.querySelector('b')?.textContent||'Öğretmen';
  if(desc){desc.textContent='';const b=document.createElement('b');b.textContent=name;desc.append(b,`, ${items.length} işlemi gözden geçirmeniz gerekiyor.`)}
  const sum=modal.querySelector('.ka-reminder-summary');
  if(sum){const a=sum.querySelector('.is-overdue strong'),b=sum.querySelector('.is-today strong'),c=sum.querySelector('.is-upcoming strong');if(a)a.textContent=counts.overdue;if(b)b.textContent=counts.today;if(c)c.textContent=counts.upcoming}
  const total=modal.querySelector('.ka-reminder-list-head > b');if(total)total.textContent=items.length;
}
function patchPopup(modal){
  if(!modal||modal.dataset.academicYearPatched==='1')return;
  modal.dataset.academicYearPatched='1';
  const now=today(),days=reminderDays();
  if(seasonClosed(now)){modal.remove();return}
  [...modal.querySelectorAll('.ka-reminder-item')].forEach(item=>{
    const title=item.querySelector('.ka-reminder-item__copy strong')?.textContent||'',month=monthlyMonth(title);
    if(isLeaveReminder({baslik:title})){item.remove();return}
    if(!month)return;
    const deadline=academicDeadline(month,now),diff=deadline?diffDays(deadline,now):99999;
    if(diff>days){item.remove();return}
    const s=statusFor(diff);
    item.classList.remove('is-overdue','is-today','is-upcoming');item.classList.add(s.state);
    const badge=item.querySelector('.ka-reminder-item__side b');if(badge)badge.textContent=s.label;
  });
  refreshPopupSummary(modal);
}
function scan(root=document){
  patchReminderStore();
  patchDashboardApi();
  patchCalendarApi();
  injectNextLessonFontFix();
  const modal=root.querySelector?.('#dashboardReminderModal')||document.getElementById('dashboardReminderModal');
  if(modal)patchPopup(modal);
}
const observer=new MutationObserver(records=>{for(const r of records)if(r.addedNodes?.length){scan(document);break}});
function start(){scan(document);observer.observe(document.documentElement,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='dashboard'||e.detail?.name==='communication')setTimeout(()=>scan(document),0)});

global.KorukTeacherReminderAcademicYear={academicStartYear,academicDeadline,seasonClosed,normalizeList,scan};
})(window);