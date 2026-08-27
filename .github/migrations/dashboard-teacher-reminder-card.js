const fs=require('fs');
function once(src,oldValue,newValue,label){const i=src.indexOf(oldValue);if(i<0)throw new Error('Anchor missing: '+label);if(src.indexOf(oldValue,i+oldValue.length)>=0)throw new Error('Anchor ambiguous: '+label);return src.slice(0,i)+newValue+src.slice(i+oldValue.length)}

const dashPath='js/modules/dashboard.js';let src=fs.readFileSync(dashPath,'utf8');

if(!src.includes('function teacherUpcomingRows()')){
  const old=`function upcomingSection(){if(!cardVisible('upcoming'))return'';const rows=upcomingRows();return section(isAdmin()?'Yaklaşan Görevler':'Teslim & Görev Takvimi','📅','upcoming',rows.length?rows.map(r=>\`<article class="ka-home-row"><span class="ka-home-rowicon">\${r.icon}</span><div class="ka-grow"><strong>\${esc(r.title)}</strong><small>\${esc(r.meta)}</small></div></article>\`).join(''):empty('Yaklaşan kayıt yok.'))}`;
  const neu=`function reminderIcon(source){return({evrak:'📄',gorev:'✓',nobet:'🛡️',sosyalKulupler:'♡',rehberlik:'🧭',maarifRapor:'🏅',zumre:'👥',sok:'🛡️',bepPlani:'📋',belirliGunler:'📅',sinav:'📝',kontrolListesi:'☑️'})[source]||'🔔'}\nfunction teacherUpcomingRows(){return collectReminders(30).slice(0,8)}\nfunction upcomingSection(){if(!cardVisible('upcoming'))return'';if(isAdmin()){const rows=upcomingRows();return section('Yaklaşan Görevler','📅','upcoming',rows.length?rows.map(r=>\`<article class="ka-home-row"><span class="ka-home-rowicon">\${r.icon}</span><div class="ka-grow"><strong>\${esc(r.title)}</strong><small>\${esc(r.meta)}</small></div></article>\`).join(''):empty('Yaklaşan kayıt yok.'))}const rows=teacherUpcomingRows();return section('Teslim & Görev Takvimi','📅','upcoming',rows.length?rows.map((r,i)=>{const s=reminderStatus(r);return\`<button class="ka-home-row ka-home-reminder-row" type="button" data-dash-reminder-index="\${i}"><span class="ka-home-rowicon">\${reminderIcon(r.kaynak)}</span><div class="ka-grow"><strong>\${esc(r.baslik)}</strong><small>\${esc(r.altBaslik||'')}</small></div><span class="ka-badge \${s.cls}">\${esc(s.label)}</span></button>\`}).join(''):empty('Bekleyen teslim veya görev yok.'))}`;
  src=once(src,old,neu,'upcomingSection');
}

if(src.includes('function collectReminders(){')){
  const old=`function collectReminders(){const id=teacherId();if(!id)return[];const days=Number(reminderSettings().gunSayisi)||3;return[...scanTasks(id,days),...scanDocuments(id,days),...scanDuty(id),...scanMonthly(id,days),...scanPeriods(id,days),...scanOneOff(id,days),...scanSpecialDays(id,days),...scanExams(id,days),...scanChecklists(id,days)].filter(x=>Number.isFinite(x.gunFarki)).sort((a,b)=>a.gunFarki-b.gunFarki)}`;
  const neu=`function collectReminders(daysOverride=null){const id=teacherId();if(!id)return[];const days=Number.isFinite(Number(daysOverride))?Math.max(0,Number(daysOverride)):(Number(reminderSettings().gunSayisi)||3);return[...scanTasks(id,days),...scanDocuments(id,days),...scanDuty(id),...scanMonthly(id,days),...scanPeriods(id,days),...scanOneOff(id,days),...scanSpecialDays(id,days),...scanExams(id,days),...scanChecklists(id,days)].filter(x=>Number.isFinite(x.gunFarki)).sort((a,b)=>a.gunFarki-b.gunFarki)}`;
  src=once(src,old,neu,'collectReminders');
}

if(!src.includes("'[data-dash-reminder-index]'")){
  const old=`  root.querySelectorAll('[data-dash-duty-book]').forEach(box=>box.addEventListener('change',async()=>{const atama=arr('nobetAtamalari').find(x=>x.id===box.dataset.dashDutyBook);if(!atama)return;box.disabled=true;try{await window.DutyBookService?.toggle?.(atama,box.checked);window.toast?.(box.checked?'✅ Nöbet defteri işaretlendi.':'Nöbet defteri işareti kaldırıldı.')}catch(e){box.checked=!box.checked;window.toast?.(e?.message==='sahip-degil'?'Bu nöbet size ait değil.':'Nöbet defteri durumu güncellenemedi.')}finally{box.disabled=false}}));\n  root.querySelector('[data-dash-quick-note]')?.addEventListener('click',()=>window.ShellUI?.openQuickNote?.())`;
  const neu=`  root.querySelectorAll('[data-dash-duty-book]').forEach(box=>box.addEventListener('change',async()=>{const atama=arr('nobetAtamalari').find(x=>x.id===box.dataset.dashDutyBook);if(!atama)return;box.disabled=true;try{await window.DutyBookService?.toggle?.(atama,box.checked);window.toast?.(box.checked?'✅ Nöbet defteri işaretlendi.':'Nöbet defteri işareti kaldırıldı.')}catch(e){box.checked=!box.checked;window.toast?.(e?.message==='sahip-degil'?'Bu nöbet size ait değil.':'Nöbet defteri durumu güncellenemedi.')}finally{box.disabled=false}}));\n  root.querySelectorAll('[data-dash-reminder-index]').forEach(btn=>btn.addEventListener('click',()=>teacherUpcomingRows()[Number(btn.dataset.dashReminderIndex)]?.git?.()));\n  root.querySelector('[data-dash-quick-note]')?.addEventListener('click',()=>window.ShellUI?.openQuickNote?.())`;
  src=once(src,old,neu,'bindPresentation reminder rows');
}

if(!src.includes('Object.keys(REMINDER_DEFS).map(t=>\'data.\'+t)')){
  const old=`function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];['data.ogretmenler','data.dersProgrami','data.siniflar','data.veliler','data.servisler','data.hatirlaticilar','data.gorevler','data.sinavlar','data.denemeSinavlari','data.duyurular','data.haberler','data.anketler','data.nobetAtamalari','data.nobetYerleri','data.personelIzinler','data.ogretmenIzinleri','data.notlar','data.appConfig','session.user'].forEach(p=>{const u=window.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)})}`;
  const neu=`function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];const base=['data.ogretmenler','data.dersProgrami','data.siniflar','data.veliler','data.servisler','data.hatirlaticilar','data.gorevler','data.sinavlar','data.denemeSinavlari','data.duyurular','data.haberler','data.anketler','data.nobetAtamalari','data.nobetYerleri','data.personelIzinler','data.ogretmenIzinleri','data.notlar','data.appConfig','session.user'],paths=[...new Set([...base,...Object.keys(REMINDER_DEFS).map(t=>'data.'+t)])];paths.forEach(p=>{const u=window.AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)})}`;
  src=once(src,old,neu,'subscribe');
}
fs.writeFileSync(dashPath,src);

const testPath='tests/dashboard-reminders-smoke.test.js';let test=fs.readFileSync(testPath,'utf8');
if(!test.includes('teacherUpcomingRows')){
  const log="console.log('Dashboard local-first hatırlatma motoru smoke testi başarılı.');";
  const add=`assert(src.includes('function teacherUpcomingRows(){return collectReminders(30).slice(0,8)}'),'Öğretmen Teslim & Görev Takvimi merkezi hatırlatma motorunun 30 günlük görünümünü kullanmalı.');\nassert(src.includes('data-dash-reminder-index'),'Öğretmen teslim/görev satırları doğrudan kendi hatırlatma hedefini açabilmeli.');\nassert(src.includes("Object.keys(REMINDER_DEFS).map(t=>'data.'+t)"),'Dashboard tüm hatırlatma kaynaklarının AppStore değişikliklerine abone olmalı.');\nassert(src.includes("evrak:'📄'"),'Evrak teslimleri öğretmen kartında görünür bir kaynak olmalı.');\nassert(src.includes("function collectReminders(daysOverride=null)"),'Hatırlatma motoru popup ve kart için tek motorla farklı görünüm ufku desteklemeli.');\n`;
  test=once(test,log,add+log,'reminder regression test');fs.writeFileSync(testPath,test);
}
console.log('Teacher reminder card migration applied.');
