const fs=require('fs');
let dash=fs.readFileSync('js/modules/dashboard.js','utf8');
let shell=fs.readFileSync('js/core/shell-ui.js','utf8');
let css=fs.readFileSync('css/design-system.css','utf8');
let test=fs.readFileSync('tests/dashboard-card-routes-smoke.test.js','utf8');

function once(src,from,to,label){
  const i=src.indexOf(from);
  if(i<0)throw new Error('Eksik kaynak sözleşme: '+label);
  if(src.indexOf(from,i+1)>=0)throw new Error('Birden fazla kaynak eşleşmesi: '+label);
  return src.replace(from,to);
}

// Teacher quick action must match the actual reference target and exact subpage.
dash=once(
  dash,
  '<button type="button" data-dash-route="documents" data-dash-title="Dokümanlar"><span>📄</span><b>Evraklar</b></button>',
  '<button type="button" data-dash-route="communication" data-dash-page="announcements" data-dash-title="Duyurular"><span>📣</span><b>Duyurular</b></button>',
  'teacher quick announcements'
);

// School-wide today duty remains complete, while the signed-in teacher is clearly marked.
const oldToday=`function allTodayDutySection(){if(isAdmin())return'';const list=arr('nobetAtamalari').filter(x=>String(x.tarih||'').slice(0,10)===isoToday());if(!list.length)return'';const places=arr('nobetYerleri');return section("Bugünün Nöbetçileri",'🛡️','today-duty',list.map(x=>\`<article class="ka-home-row"><span class="ka-home-rowicon">🛡️</span><div class="ka-grow"><strong>\${esc(teacherLabel(x))}</strong><small>\${esc(x.yerAdi||places.find(p=>p.id===x.yerId)?.ad||'Nöbet yeri')}</small></div><span class="ka-badge">Bugün</span></article>\`).join(''))}`;
const newToday=`function allTodayDutySection(){if(isAdmin())return'';const list=arr('nobetAtamalari').filter(x=>String(x.tarih||'').slice(0,10)===isoToday());if(!list.length)return'';const places=arr('nobetYerleri'),tid=teacherId();return section("Bugünün Nöbetçileri",'🛡️','today-duty',list.map(x=>{const mine=!!tid&&x.ogretmenId===tid;return\`<article class="ka-home-row\${mine?' is-me':''}"><span class="ka-home-rowicon">🛡️</span><div class="ka-grow"><strong>\${esc(teacherLabel(x))}</strong><small>\${esc(x.yerAdi||places.find(p=>p.id===x.yerId)?.ad||'Nöbet yeri')}</small></div><span class="ka-badge \${mine?'ka-badge--success':''}">\${mine?'Siz':'Bugün'}</span></article>\`}).join(''))}`;
dash=once(dash,oldToday,newToday,'today duty teacher marker');

// Put daily work first; school-wide informational cards follow afterwards.
const oldTeacher="function teacherShell(){return`${cardVisible('welcome')?hero():''}${statsSection()}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${dutySection()}${quickSection()}${notesSection()}${calendarSection()}${socialSection()}${allTodayDutySection()}${weekDutySection()}${upcomingSection()}${examsSection()}${lessonsSection()}`}";
const newTeacher="function teacherShell(){return`${cardVisible('welcome')?hero():''}${statsSection()}${announcementSection()}${pollSection()}${trialCounterSection()}${newsSection()}${lessonsSection()}${dutySection()}${examsSection()}${upcomingSection()}${quickSection()}${calendarSection()}${notesSection()}${allTodayDutySection()}${weekDutySection()}${socialSection()}`}";
dash=once(dash,oldTeacher,newTeacher,'teacher daily priority shell');

// The school-wide today-duty card has a real exact target just like the weekly duty card.
shell=once(
  shell,
  "duty:{module:'management',page:'duty',title:'Nöbet Programı'},absences:",
  "duty:{module:'management',page:'duty',title:'Nöbet Programı'},'today-duty':{module:'management',page:'duty',title:'Nöbet Programı'},absences:",
  'today duty exact shell route'
);

if(!css.includes('TEACHER DASHBOARD DAILY PRIORITY')){
  css += `\n\n/* TEACHER DASHBOARD DAILY PRIORITY */\n.ka-home-row.is-me{background:var(--ka-primary-soft);border-color:color-mix(in srgb,var(--ka-primary) 34%,var(--ka-border));}\n.ka-home-row.is-me .ka-home-rowicon{background:var(--ka-primary-soft);color:var(--ka-primary);}\n[data-dashboard-role="teacher"] .ka-home-section[data-home-section="lessons"]{scroll-margin-top:84px;}\n`;
}

// Keep regression contracts aligned with the new exact behavior.
test=once(test,"assert(dash.includes('>Not Ekle</b>')&&dash.includes('>Evraklar</b>'),'Öğretmen hızlı işlemleri dört doğrudan aksiyonu taşımalı.');","assert(dash.includes('>Not Ekle</b>')&&dash.includes('>Duyurular</b>')&&dash.includes('data-dash-page=\\\"announcements\\\"'),'Öğretmen hızlı işlemleri referanstaki dört doğrudan aksiyonu ve kesin Duyurular rotasını taşımalı.');",'quick action regression');
test=once(test,"assert(dash.includes(\"${upcomingSection()}${examsSection()}${lessonsSection()}`}\"),'Öğretmen günlük akışında görevler, yaklaşan yazılılar ve ders programı tekil sırada kalmalı.');","assert(dash.includes(\"${lessonsSection()}${dutySection()}${examsSection()}${upcomingSection()}${quickSection()}${calendarSection()}${notesSection()}${allTodayDutySection()}${weekDutySection()}${socialSection()}`}\"),'Öğretmen ana sayfasında günlük ders, nöbet, yazılı ve görev akışı genel bilgi kartlarından önce gelmeli.');",'teacher shell regression');
const extra=`\nassert(shell.includes("'today-duty':{module:'management',page:'duty',title:'Nöbet Programı'}"),'Bugünün Nöbetçileri kartı doğrudan Nöbet Programı sayfasına gitmeli.');\nassert(dash.includes("mine?'Siz':'Bugün'")&&dash.includes("ka-home-row\\${mine?' is-me':''}"),'Bugünün Nöbetçileri kartında oturumdaki öğretmen açıkça işaretlenmeli.');\nassert(css.includes('TEACHER DASHBOARD DAILY PRIORITY')&&css.includes('.ka-home-row.is-me'),'Öğretmen günlük öncelik görseli merkezi design-system içinde kalmalı.');\n`;
if(!test.includes('Bugünün Nöbetçileri kartı doğrudan Nöbet Programı'))test+=extra;

fs.writeFileSync('js/modules/dashboard.js',dash);
fs.writeFileSync('js/core/shell-ui.js',shell);
fs.writeFileSync('css/design-system.css',css);
fs.writeFileSync('tests/dashboard-card-routes-smoke.test.js',test);
console.log('Teacher dashboard daily priority migration applied.');
// Triggered after workflow registration.
