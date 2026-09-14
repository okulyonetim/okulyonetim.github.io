/* Koruk Asistan — Öğretmen hatırlatmalarında eğitim-öğretim yılı sınırı. */
(function(global){
'use strict';
if(global.__korukTeacherReminderAcademicYear)return;
global.__korukTeacherReminderAcademicYear=true;

/* Önceki Ayarlar geri navigasyon düzeltmesi dosyada mevcut olsa da başlangıçta
 * yüklenmiyordu. Bu ortak başlangıç köprüsü onu da etkinleştirir. */
(function loadSettingsBackNavigation(){
  if(document.querySelector('script[data-settings-back-navigation]'))return;
  const script=document.createElement('script');
  script.src='js/core/settings-back-navigation.js?v=944';
  script.async=false;
  script.dataset.settingsBackNavigation='';
  document.head.appendChild(script);
})();

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
function normalizeReminder(item,days=reminderDays(),now=today()){
  if(!item)return null;
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
  if(seasonClosed(now))return (items||[]).filter(x=>!ACADEMIC_SOURCES.has(x?.kaynak));
  return (items||[]).map(x=>normalizeReminder(x,days,now)).filter(Boolean).sort((a,b)=>Number(a.gunFarki||0)-Number(b.gunFarki||0));
}
function patchDashboardApi(){
  const d=global.DashboardModule;
  if(!d||d.__academicReminderPatched)return false;
  d.__academicReminderPatched=true;
  const original=d.collectReminders?.bind(d);
  if(original)d.collectReminders=function(days){return normalizeList(original(days),Number.isFinite(Number(days))?Number(days):reminderDays())};
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
  patchDashboardApi();
  const modal=root.querySelector?.('#dashboardReminderModal')||document.getElementById('dashboardReminderModal');
  if(modal)patchPopup(modal);
}
const observer=new MutationObserver(records=>{for(const r of records)if(r.addedNodes?.length){scan(document);break}});
function start(){scan(document);observer.observe(document.documentElement,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='dashboard')setTimeout(()=>scan(document),0)});

global.KorukTeacherReminderAcademicYear={academicStartYear,academicDeadline,seasonClosed,normalizeList,scan};
})(window);
