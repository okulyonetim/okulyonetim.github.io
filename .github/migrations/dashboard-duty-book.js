const fs=require('fs');
function once(src,oldValue,newValue,label){const i=src.indexOf(oldValue);if(i<0)throw new Error('Anchor missing: '+label);if(src.indexOf(oldValue,i+oldValue.length)>=0)throw new Error('Anchor ambiguous: '+label);return src.slice(0,i)+newValue+src.slice(i+oldValue.length)}

const corePath='js/core/core.js';let core=fs.readFileSync(corePath,'utf8');
if(!core.includes('window.DutyBookService=')){
 const anchor="window.DeviceData={list:deviceList,get:deviceGet,listen:deviceListen,persist:devicePersist,add:deviceAdd,update:deviceUpdate,set:deviceSet,remove:deviceRemove,newId:deviceId};";
 const add=`${anchor}\n\n/* Nöbet defteri işaretleme davranışı Dashboard ve Management için tek merkezde tutulur. */\nfunction dutyBookTeacherId(){const u=window.AKTIF_KULLANICI||AppStore.get('session.user')||{};return u.bagliOgretmenId||u.ogretmenId||''}\nfunction dutyBookCanToggle(atama){const u=window.AKTIF_KULLANICI||AppStore.get('session.user')||{},tid=dutyBookTeacherId();return !!(u.admin===true||(tid&&atama?.ogretmenId===tid))}\nasync function dutyBookToggle(atama,deger){if(!atama?.id)throw new Error('atama-yok');if(!dutyBookCanToggle(atama))throw new Error('sahip-degil');if(!window.COL?.nobetAtamalari)throw new Error('nobet-koleksiyonu-yok');return deviceUpdate('nobetAtamalari',COL.nobetAtamalari,atama.id,{defterDolduruldu:!!deger})}\nwindow.DutyBookService={teacherId:dutyBookTeacherId,canToggle:dutyBookCanToggle,toggle:dutyBookToggle};`;
 core=once(core,anchor,add,'DeviceData export');fs.writeFileSync(corePath,core);
}

const managementPath='js/modules/management.js';let management=fs.readFileSync(managementPath,'utf8');
if(!management.includes('return global.DutyBookService.toggle(atama,deger)')){
 const old="  defterDolduToggle(atama,deger){const u=global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{},benId=(typeof bagliOgretmenimGetir==='function'?bagliOgretmenimGetir()?.id:null)||u.bagliOgretmenId||u.ogretmenId||null;if(!u.admin&&(!benId||atama.ogretmenId!==benId))return Promise.reject(new Error('sahip-degil'));return NobetRepository.atamaGuncelle(atama.id,{defterDolduruldu:!!deger})},";
 const neu="  defterDolduToggle(atama,deger){if(!global.DutyBookService?.toggle)return Promise.reject(new Error('duty-book-service-yok'));return global.DutyBookService.toggle(atama,deger)},";
 management=once(management,old,neu,'Management duty toggle');fs.writeFileSync(managementPath,management);
}

const dashPath='js/modules/dashboard.js';let dash=fs.readFileSync(dashPath,'utf8');
if(!dash.includes('data-dash-duty-book')){
 const oldRows="function dutyRows(list){const places=arr('nobetYerleri');return list.map(x=>{const p=places.find(y=>y.id===x.yerId);return `<article class=\"ka-home-row\"><span class=\"ka-home-avatar\">${esc((teacherLabel(x).split(/\\s+/).slice(0,2).map(s=>s[0]).join('')||'N').toLocaleUpperCase('tr'))}</span><div class=\"ka-grow\"><strong>${esc(teacherLabel(x))}</strong><small>${esc(x.yerAdi||p?.ad||'Nöbet yeri')}</small></div>${x.defterDolduruldu?'<span class=\"ka-badge ka-badge--success\">Tamam</span>':''}</article>`}).join('')}";
 const newRows="function dutyRows(list){const places=arr('nobetYerleri'),tid=teacherId(),teacherMode=!isAdmin()&&!!tid;return list.map(x=>{const p=places.find(y=>y.id===x.yerId),mine=teacherMode&&x.ogretmenId===tid;return `<article class=\"ka-home-row\"><span class=\"ka-home-avatar\">${esc((teacherLabel(x).split(/\\s+/).slice(0,2).map(s=>s[0]).join('')||'N').toLocaleUpperCase('tr'))}</span><div class=\"ka-grow\"><strong>${esc(teacherLabel(x))}</strong><small>${esc(x.yerAdi||p?.ad||'Nöbet yeri')}</small></div>${mine?`<label class=\"ka-check\"><input type=\"checkbox\" data-dash-duty-book=\"${esc(x.id)}\" ${x.defterDolduruldu?'checked':''}> 📔 Nöbet defterini doldurdum</label>`:x.defterDolduruldu?'<span class=\"ka-badge ka-badge--success\">Tamam</span>':''}</article>`}).join('')}";
 dash=once(dash,oldRows,newRows,'Dashboard duty rows');
 const oldBind="  root.querySelectorAll('[data-dash-lesson-plan]').forEach(btn=>btn.addEventListener('click',async()=>{const ok=await window.ShellUI?.routeModule?.('academic',{bottom:'menu',title:'Yıllık Plan'});if(ok===false)return;const opened=await window.AcademicModule?.openPlanForLesson?.(btn.dataset.lesson||'',btn.dataset.class||'');if(opened===false)window.toast?.('Bu ders ve sınıf için eşleşen yıllık plan bulunamadı.')}));\n  root.querySelector('[data-dash-quick-note]')?.addEventListener('click',()=>window.ShellUI?.openQuickNote?.())";
 const newBind="  root.querySelectorAll('[data-dash-lesson-plan]').forEach(btn=>btn.addEventListener('click',async()=>{const ok=await window.ShellUI?.routeModule?.('academic',{bottom:'menu',title:'Yıllık Plan'});if(ok===false)return;const opened=await window.AcademicModule?.openPlanForLesson?.(btn.dataset.lesson||'',btn.dataset.class||'');if(opened===false)window.toast?.('Bu ders ve sınıf için eşleşen yıllık plan bulunamadı.')}));\n  root.querySelectorAll('[data-dash-duty-book]').forEach(box=>box.addEventListener('change',async()=>{const atama=arr('nobetAtamalari').find(x=>x.id===box.dataset.dashDutyBook);if(!atama)return;box.disabled=true;try{await window.DutyBookService?.toggle?.(atama,box.checked);window.toast?.(box.checked?'✅ Nöbet defteri işaretlendi.':'Nöbet defteri işareti kaldırıldı.')}catch(e){box.checked=!box.checked;window.toast?.(e?.message==='sahip-degil'?'Bu nöbet size ait değil.':'Nöbet defteri durumu güncellenemedi.')}finally{box.disabled=false}}));\n  root.querySelector('[data-dash-quick-note]')?.addEventListener('click',()=>window.ShellUI?.openQuickNote?.())";
 dash=once(dash,oldBind,newBind,'Dashboard bindings');fs.writeFileSync(dashPath,dash);
}

const quickPath='tests/dashboard-quick-actions.test.js';let quick=fs.readFileSync(quickPath,'utf8');
if(!quick.includes('Nöbet defteri Dashboard')){
 const log="console.log('Dashboard hızlı işlem doğrudan rota sözleşmesi başarılı.');";
 const add="assert(dashboard.includes('data-dash-duty-book'),'Öğretmenin kendi nöbetinde Dashboard nöbet defteri kutusu görünmeli.');\nassert(dashboard.includes('DutyBookService?.toggle?.'),'Dashboard nöbet defteri ikinci yazma yolu açmadan ortak servisi kullanmalı.');\nconsole.log('Nöbet defteri Dashboard ortak servis sözleşmesi başarılı.');\n";
 quick=once(quick,log,add+log,'Dashboard test');fs.writeFileSync(quickPath,quick);
}

const dutyTestPath='tests/classic-duty-v2-smoke.test.js';let dutyTest=fs.readFileSync(dutyTestPath,'utf8');
if(!dutyTest.includes('DutyBookService.toggle')){
 const marker="assert(src.includes(\"PermissionService?.can?.('management.duty.edit','edit')\"),'Nöbet yazma işlemleri merkezi management.duty.edit yetkisine bağlı kalmalı.');";
 const add=`${marker}\nassert(src.includes('DutyBookService.toggle(atama,deger)'),'Management nöbet defteri ortak çekirdek servisine delege edilmeli.');`;
 dutyTest=once(dutyTest,marker,add,'Duty test');fs.writeFileSync(dutyTestPath,dutyTest);
}

const boundaryPath='tests/module-bundles-smoke.test.js';
// Core service is intentionally validated separately to avoid making module bundle test depend on core internals.
const coreTestPath='tests/widget-platform-adapter-smoke.test.js';
console.log('Dashboard nöbet defteri ortak servis migration uygulandı.');
