const fs=require('fs');

function replaceOnce(text,oldValue,newValue,label){
  const i=text.indexOf(oldValue);
  if(i<0)throw new Error(`Migration anchor missing: ${label}`);
  if(text.indexOf(oldValue,i+oldValue.length)>=0&&label==='lesson article')throw new Error(`Migration anchor is ambiguous: ${label}`);
  return text.slice(0,i)+newValue+text.slice(i+oldValue.length);
}

const academicPath='js/modules/academic.js';
let academic=fs.readFileSync(academicPath,'utf8');
if(!academic.includes('async function openPlanForLesson(')){
  const anchor="function openPage(page,title=''){";
  const insertion=`function planClassLevel(v){const m=String(v||'').match(/\\d+/);return m?Number(m[0]):null}\nfunction planLessonKey(v){return norm(v).replace(/\\s+dersi$/,'').trim()}\nfunction planForLesson(dersAdi,sinif){const level=planClassLevel(sinif),lesson=planLessonKey(dersAdi);if(!level||!lesson)return null;const tracked=new Set(planSelection()?.planIdler||[]);return arr('yillikPlanTanimlari').filter(p=>planClassLevel(p.seviye)===level&&planLessonKey(p.dersAdi)===lesson).sort((a,b)=>Number(tracked.has(b.id))-Number(tracked.has(a.id))||(a.dersAdi||'').localeCompare(b.dersAdi||'','tr'))[0]||null}\nasync function openPlanForLesson(dersAdi,sinif){active='plans';query='';await prepareLocal();const p=planForLesson(dersAdi,sinif);const h=document.querySelector('[data-academic-module] > .ka-row h2');if(h)h.textContent='Yıllık Plan';if(p){planView={planId:p.id,weekIndex:planCurrentWeekIndex(p)};render();return true}planView={planId:'',weekIndex:0};render();return false}\n`;
  academic=replaceOnce(academic,anchor,insertion+anchor,'academic openPage');
  const oldApi="window.AcademicModule={mount,unmount,render,prepareLocal,timerState,openPage,openSchedule(){return openPage('schedule','Ders Programı')}};";
  const newApi="window.AcademicModule={mount,unmount,render,prepareLocal,timerState,openPage,openPlanForLesson,openSchedule(){return openPage('schedule','Ders Programı')}};";
  academic=replaceOnce(academic,oldApi,newApi,'AcademicModule API');
  fs.writeFileSync(academicPath,academic);
}

const dashboardPath='js/modules/dashboard.js';
let dashboard=fs.readFileSync(dashboardPath,'utf8');
if(!dashboard.includes('data-dash-lesson-plan')){
  dashboard=replaceOnce(
    dashboard,
    '<article data-dash-route="academic"><span>',
    '<article ${mine?`data-dash-lesson-plan data-lesson="${esc(lessonLabel(x))}" data-class="${esc(classLabel(x))}"`:`data-dash-route="academic"`}><span>',
    'lesson article'
  );
  const oldBind="function bindPresentation(root){root.querySelectorAll('[data-dash-route]').forEach(btn=>btn.addEventListener('click',()=>window.ShellUI?.routeModule?.(btn.dataset.dashRoute,{bottom:'menu',page:btn.dataset.dashPage||'',title:btn.dataset.dashTitle||''})));root.querySelector('[data-dash-quick-note]')?.addEventListener('click',()=>window.ShellUI?.openQuickNote?.())}";
  const newBind=`function bindPresentation(root){\n  root.querySelectorAll('[data-dash-route]').forEach(btn=>btn.addEventListener('click',()=>window.ShellUI?.routeModule?.(btn.dataset.dashRoute,{bottom:'menu',page:btn.dataset.dashPage||'',title:btn.dataset.dashTitle||''})));\n  root.querySelectorAll('[data-dash-lesson-plan]').forEach(btn=>btn.addEventListener('click',async()=>{const ok=await window.ShellUI?.routeModule?.('academic',{bottom:'menu',title:'Yıllık Plan'});if(ok===false)return;const opened=await window.AcademicModule?.openPlanForLesson?.(btn.dataset.lesson||'',btn.dataset.class||'');if(opened===false)window.toast?.('Bu ders ve sınıf için eşleşen yıllık plan bulunamadı.')}));\n  root.querySelector('[data-dash-quick-note]')?.addEventListener('click',()=>window.ShellUI?.openQuickNote?.())\n}`;
  dashboard=replaceOnce(dashboard,oldBind,newBind,'dashboard bindPresentation');
  fs.writeFileSync(dashboardPath,dashboard);
}

const dashTestPath='tests/dashboard-quick-actions.test.js';
let dashTest=fs.readFileSync(dashTestPath,'utf8');
if(!dashTest.includes('Dashboard ders kartı yıllık plan')){
  const log="console.log('Dashboard hızlı işlem doğrudan rota sözleşmesi başarılı.');";
  const assertions=`assert(dashboard.includes('data-dash-lesson-plan'),'Öğretmenin bugünkü ders kartı yıllık plan hedefi taşımalı.');\nassert(dashboard.includes("routeModule?.('academic',{bottom:'menu',title:'Yıllık Plan'})"),'Ders kartı Academic modülünü güvenli lifecycle ile yüklemeli.');\nassert(dashboard.includes('AcademicModule?.openPlanForLesson?.'),'Dashboard ders kartı Academic yıllık plan API sine bağlanmalı.');\nconsole.log('Dashboard ders kartı yıllık plan doğrudan rota sözleşmesi başarılı.');\n`;
  dashTest=replaceOnce(dashTest,log,assertions+log,'dashboard regression test');
  fs.writeFileSync(dashTestPath,dashTest);
}

const academicTestPath='tests/academic-separate-pages.test.js';
let academicTest=fs.readFileSync(academicTestPath,'utf8');
if(!academicTest.includes('Ders-sınıf yıllık plan')){
  const log="console.log('Academic ayrı sayfa + deneme sayacı + sonuç filtreleme sözleşmesi başarılı.');";
  const assertions=`assert(academic.includes('async function openPlanForLesson'),'AcademicModule ders ve sınıftan yıllık plan açma API si sağlamalı.');\nassert(academic.includes('planClassLevel')&&academic.includes('planLessonKey')&&academic.includes('planCurrentWeekIndex'),'Ders-sınıf yıllık plan eşleşmesi sınıf seviyesi, ders adı ve mevcut hafta üzerinden yapılmalı.');\nassert(academic.includes('new Set(planSelection()?.planIdler||[])'),'Takip edilen yıllık plan eşleşmede öncelikli olmalı.');\nconsole.log('Ders-sınıf yıllık plan doğrudan açma sözleşmesi başarılı.');\n`;
  academicTest=replaceOnce(academicTest,log,assertions+log,'academic regression test');
  fs.writeFileSync(academicTestPath,academicTest);
}

console.log('Dashboard → mevcut hafta yıllık plan migration uygulandı.');
