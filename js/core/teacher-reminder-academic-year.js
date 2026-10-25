/* Koruk Asistan — Hatırlatma politikası: eğitim-öğretim yılı sınırı ve izin kayıtlarının hatırlatıcılardan ayıklanması.
 * dashboard.js hatırlatma motoru normalizeList()'i çağırır; bu dosya ana sayfa DOM'una dokunmaz. */
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
function patchCalendarApi(){
  const t=global.TakvimRepository;
  if(!t||t.__leaveReminderPatched)return false;
  t.__leaveReminderPatched=true;
  const original=t.hatirlaticilariDinle?.bind(t);if(!original)return false;
  t.hatirlaticilariDinle=function(cb){return original(rowsList=>cb(filterLeaveReminders(rowsList)))};
  return true;
}
function scan(){
  patchReminderStore();
  patchCalendarApi();
}
function start(){scan();[250,1000,2500].forEach(ms=>setTimeout(scan,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='communication'){setTimeout(scan,0);setTimeout(scan,500)}});

global.KorukTeacherReminderAcademicYear={academicStartYear,academicDeadline,seasonClosed,normalizeList,scan};
})(window);