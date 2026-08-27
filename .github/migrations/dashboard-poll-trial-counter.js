const fs=require('fs');
function once(src,oldValue,newValue,label){const i=src.indexOf(oldValue);if(i<0)throw new Error('Anchor missing: '+label);if(src.indexOf(oldValue,i+oldValue.length)>=0)throw new Error('Anchor ambiguous: '+label);return src.slice(0,i)+newValue+src.slice(i+oldValue.length)}

const dashPath='js/modules/dashboard.js';
let dash=fs.readFileSync(dashPath,'utf8');

if(!dash.includes('function trialCounterSection()')){
  dash=once(dash,
    "function newsSection(){const list=arr('haberler').filter(x=>x.aktif!==false).sort((a,b)=>String(b.tarih||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.eklenmeTarihi||''))).slice(0,5);if(!list.length)return'';return section('Kayan Haberler','📰','news',`<div class=\"ka-home-news-strip\">${list.map(x=>`<article><strong>${esc(x.baslik||'Haber')}</strong><span>${esc(String(x.ozet||x.aciklama||x.icerik||'').replace(/<[^>]*>/g,'').slice(0,100))}</span></article>`).join('')}</div>`) }".replace('`) }','`)}'),
    "function newsSection(){const list=arr('haberler').filter(x=>x.aktif!==false).sort((a,b)=>String(b.tarih||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.eklenmeTarihi||''))).slice(0,5);if(!list.length)return'';return section('Kayan Haberler','📰','news',`<div class=\"ka-home-news-strip\">${list.map(x=>`<article><strong>${esc(x.baslik||'Haber')}</strong><span>${esc(String(x.ozet||x.aciklama||x.icerik||'').replace(/<[^>]*>/g,'').slice(0,100))}</span></article>`).join('')}</div>`)}\nfunction trialTotalMin(d){return d?.oturumTuru==='İki Oturum'?(Number(d.sozelSuresiDk)||0)+(Number(d.araSureDk)||0)+(Number(d.sayisalSuresiDk)||0):Number(d?.sinavSuresiDk)||0}\nfunction trialTimerState(d){const mins=trialTotalMin(d),run=d?.sayacDurumu?.aktif===true,start=d?.sayacDurumu?.baslatmaTarihi?new Date(d.sayacDurumu.baslatmaTarihi).getTime():0;if(!run)return{run:false,remaining:mins*60,label:mins>0?'Hazır':'Süre eksik'};if(!start||mins<=0)return{run:true,remaining:0,label:'Sayaç bilgisi geçersiz'};const elapsed=(Date.now()-start)/1000,total=mins*60,remaining=Math.max(0,total-elapsed);if(d.oturumTuru==='İki Oturum'){const verbal=(Number(d.sozelSuresiDk)||0)*60,br=(Number(d.araSureDk)||0)*60;if(elapsed<verbal)return{run:true,remaining,label:'Sözel oturum'};if(elapsed<verbal+br)return{run:true,remaining,label:'Ara'};return{run:true,remaining,label:remaining>0?'Sayısal oturum':'Tamamlandı'}}return{run:true,remaining,label:remaining>0?'Sınav sürüyor':'Tamamlandı'}}\nfunction trialFmt(sec){sec=Math.max(0,Math.floor(Number(sec)||0));return`${String(Math.floor(sec/3600)).padStart(2,'0')}:${String(Math.floor((sec%3600)/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}\nfunction trialCounterSection(){const today=isoToday(),list=arr('denemeSinavlari').filter(x=>x?.sayacDurumu?.aktif===true||String(x?.tarih||'').slice(0,10)===today).sort((a,b)=>Number(b?.sayacDurumu?.aktif===true)-Number(a?.sayacDurumu?.aktif===true)||String(a.tarih||'').localeCompare(String(b.tarih||''))).slice(0,3);if(!list.length)return'';const body=list.map(x=>{const st=trialTimerState(x),running=x?.sayacDurumu?.aktif===true;return`<article class=\"ka-home-row\"><span class=\"ka-home-rowicon\">⏱️</span><div class=\"ka-grow\"><strong>${esc(x.ad||'Deneme sınavı')}</strong><small>${esc([x.sinflar||x.siniflar,x.oturumTuru,st.label].filter(Boolean).join(' · '))}</small></div>${running?`<strong data-dash-trial-timer=\"${esc(x.id)}\">${esc(trialFmt(st.remaining))}</strong>`:`<span class=\"ka-badge\">${esc(date(x.tarih))}</span>`}</article>`}).join('');return section('Deneme / Sayaç','⏱️','trial-counter',`${body}<button class=\"ka-home-link\" type=\"button\" data-dash-route=\"academic\" data-dash-page=\"trial\" data-dash-title=\"Deneme Sınavları\"><span>Deneme Sınavlarını aç</span><b>›</b></button>`)}\nfunction refreshTrialTimers(root=document){root.querySelectorAll?.('[data-dash-trial-timer]').forEach(el=>{const d=arr('denemeSinavlari').find(x=>x.id===el.dataset.dashTrialTimer);if(d)el.textContent=trialFmt(trialTimerState(d).remaining)})}",
    'dashboard trial counter helpers');
}

const oldAdmin="function adminShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${newsSection()}${statsSection()}${dutySection()}${absencesSection()}${upcomingSection()}${lessonsSection()}${weekDutySection()}${examsSection()}${notesSection()}`}";
const newAdmin="function adminShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${statsSection()}${dutySection()}${absencesSection()}${upcomingSection()}${lessonsSection()}${weekDutySection()}${examsSection()}${notesSection()}`}";
if(dash.includes(oldAdmin))dash=once(dash,oldAdmin,newAdmin,'admin trial counter');

const oldTeacher="function teacherShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${newsSection()}${lessonsSection()}${dutySection()}${upcomingSection()}${quickSection()}${examsSection()}${personalScheduleSection()}${notesSection()}${calendarSection()}`}";
const newTeacher="function teacherShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${lessonsSection()}${dutySection()}${upcomingSection()}${quickSection()}${examsSection()}${personalScheduleSection()}${notesSection()}${calendarSection()}`}";
if(dash.includes(oldTeacher))dash=once(dash,oldTeacher,newTeacher,'teacher poll and trial counter');

const oldMounted="let mounted=false,unsubs=[],reminderShown=false;";
if(dash.includes(oldMounted))dash=once(dash,oldMounted,"let mounted=false,unsubs=[],reminderShown=false,trialTimer=null;",'trial timer state');

const oldMount="async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bindPresentation(root);subscribe();await prepareReminderData();render();requestAnimationFrame(()=>maybeShowReminders());return true}";
const newMount="async function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();bindPresentation(root);subscribe();await prepareReminderData();render();clearInterval(trialTimer);trialTimer=setInterval(()=>refreshTrialTimers(),1000);requestAnimationFrame(()=>maybeShowReminders());return true}";
if(dash.includes(oldMount))dash=once(dash,oldMount,newMount,'trial timer mount');

const oldUnmount="function unmount(){mounted=false;closeReminderPopup();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}";
const newUnmount="function unmount(){mounted=false;clearInterval(trialTimer);trialTimer=null;closeReminderPopup();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}";
if(dash.includes(oldUnmount))dash=once(dash,oldUnmount,newUnmount,'trial timer unmount');

fs.writeFileSync(dashPath,dash);

const testPath='tests/dashboard-card-routes-smoke.test.js';
let test=fs.readFileSync(testPath,'utf8');
if(!test.includes('Öğretmen ana sayfası aktif anketleri göstermeli')){
  const log="console.log('Dashboard kart bağlantıları ve geniş mobil yerleşim smoke testi başarılı.');";
  const add="assert(dash.includes(\"function teacherShell(){return`${cardVisible('welcome')?hero():''}${announcementSection()}${pollSection()}${trialCounterSection()}\"),'Öğretmen ana sayfası aktif anketleri göstermeli.');\nassert(dash.includes(\"arr('denemeSinavlari')\")&&dash.includes('sayacDurumu?.aktif')&&dash.includes('baslatmaTarihi'),'Dashboard deneme sayacı gerçek denemeSinavlari.sayacDurumu modelini kullanmalı.');\nassert(dash.includes('data-dash-page=\\\"trial\\\"')&&dash.includes('Deneme Sınavları'),'Dashboard deneme kartı doğrudan Academic trial sayfasına gitmeli.');\nassert(dash.includes('trialTimer=setInterval(()=>refreshTrialTimers(),1000)'),'Aktif deneme sayacı ana sayfada canlı güncellenmeli.');\n";
  test=once(test,log,add+log,'dashboard poll trial assertions');
  fs.writeFileSync(testPath,test);
}

console.log('Dashboard poll/trial counter migration applied.');
