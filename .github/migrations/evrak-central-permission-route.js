const fs=require('fs');
function once(src,oldValue,newValue,label){const i=src.indexOf(oldValue);if(i<0)throw new Error('Anchor missing: '+label);if(src.indexOf(oldValue,i+oldValue.length)>=0)throw new Error('Anchor ambiguous: '+label);return src.slice(0,i)+newValue+src.slice(i+oldValue.length)}

// 1) Central permission catalog + legacy aliases.
const loaderPath='js/app-loader.js';let loader=fs.readFileSync(loaderPath,'utf8');
if(!loader.includes("['documents.tracking','Evrak Takibi','section']")){
  loader=once(loader,
    "['documents.view','Doküman görüntüleme','section'],['documents.edit','Doküman düzenleme','action'],",
    "['documents.view','Doküman görüntüleme','section'],['documents.edit','Doküman düzenleme','action'],['documents.tracking','Evrak Takibi','section'],['documents.tracking.edit','Evrak Takibi düzenleme','action'],",
    'permission catalog');
  loader=once(loader,
    "'module.documents':['dokumanlar'],'documents.view':['dokumanlar'],'documents.edit':['dokumanlar'],",
    "'module.documents':['dokumanlar','evrak'],'documents.view':['dokumanlar'],'documents.edit':['dokumanlar'],'documents.tracking':['evrak'],'documents.tracking.edit':['evrak'],",
    'document permission aliases');
  fs.writeFileSync(loaderPath,loader);
}

// 2) Evrak page keeps real model but uses PermissionService and restores responsible teacher display.
const documentsPath='js/modules/documents.js';let documents=fs.readFileSync(documentsPath,'utf8');
const oldPerm="const canView=()=>typeof global.gorebilir==='function'?global.gorebilir('evrak'):true;\nconst canEdit=()=>typeof global.duzenleyebilir==='function'?global.duzenleyebilir('evrak'):global.AKTIF_KULLANICI?.admin===true;";
if(documents.includes(oldPerm)){
  const newPerm="const canView=()=>global.PermissionService?.can?.('documents.tracking','read')??(typeof global.gorebilir==='function'?global.gorebilir('evrak'):true);\nconst canEdit=()=>global.PermissionService?.can?.('documents.tracking.edit','edit')??(typeof global.duzenleyebilir==='function'?global.duzenleyebilir('evrak'):global.AKTIF_KULLANICI?.admin===true);";
  documents=once(documents,oldPerm,newPerm,'evrak central permissions');
}
if(!documents.includes('function responsibleNames(ids)')){
  const anchor="function name(o){return `${o?.ad||''} ${o?.soyad||''}`.trim()||o?.adSoyad||'Öğretmen';}";
  documents=once(documents,anchor,anchor+"\nfunction responsibleNames(ids){const set=new Set(ids||[]);return teachers().filter(o=>set.has(o.id)).map(name).join(', ');}",'responsible teacher helper');
}
const oldMeta="<div class=\"ka-muted\">${esc([x.tur,x.tarih].filter(Boolean).join(' · '))}</div></div><span class=\"ka-badge\">${esc(x.durum||'Beklemede')}</span>";
if(documents.includes(oldMeta)){
  const newMeta="<div class=\"ka-muted\">${esc([x.tur,x.tarih].filter(Boolean).join(' · '))}</div>${x.sorumluOgretmenIdler?.length?`<div class=\"ka-muted\">👤 ${esc(responsibleNames(x.sorumluOgretmenIdler)||'Sorumlu öğretmen')}</div>`:''}</div><span class=\"ka-badge\">${esc(x.durum||'Beklemede')}</span>";
  documents=once(documents,oldMeta,newMeta,'evrak responsible teachers');
}
fs.writeFileSync(documentsPath,documents);

// 3) Dashboard reminder keeps one reminder engine but can target a module subpage.
const dashPath='js/modules/dashboard.js';let dash=fs.readFileSync(dashPath,'utf8');
const oldRoute="function route(module){return()=>{if(window.ShellUI?.routeModule)return window.ShellUI.routeModule(module,{bottom:'menu'});document.querySelector(`[data-ka-module=\"${module}\"]`)?.click()}}\nfunction reminder(type,title,subtitle,diff,module){return{kaynak:type,baslik:title,altBaslik:subtitle||'',gunFarki:diff,module,git:route(module)}}";
if(dash.includes(oldRoute)){
  const newRoute="function route(module,page='',title=''){return()=>{if(window.ShellUI?.routeModule)return window.ShellUI.routeModule(module,{bottom:'menu',page,title});document.querySelector(`[data-ka-module=\"${module}\"]`)?.click()}}\nfunction reminder(type,title,subtitle,diff,module,page='',pageTitle=''){return{kaynak:type,baslik:title,altBaslik:subtitle||'',gunFarki:diff,module,page,git:route(module,page,pageTitle)}}";
  dash=once(dash,oldRoute,newRoute,'dashboard reminder route');
}
const oldScan="function scanDocuments(id,days){return arr('evrakTakibi').filter(x=>(x.sorumluOgretmenIdler||[]).includes(id)&&!['Tamamlandı','Tamamlandi','Arşivlendi','Arsivlendi'].includes(x.durum)&&x.tarih).map(x=>reminder('evrak',`Evrak: ${x.evrakAdi||x.baslik||'Evrak'}`,x.aciklama,dayDiff(x.tarih),'documents')).filter(x=>x.gunFarki<=days)}";
if(dash.includes(oldScan)){
  const newScan="function scanDocuments(id,days){return arr('evrakTakibi').filter(x=>(x.sorumluOgretmenIdler||[]).includes(id)&&!['Tamamlandı','Tamamlandi','Arşivlendi','Arsivlendi'].includes(x.durum)&&x.tarih).map(x=>reminder('evrak',`Evrak: ${x.evrakAdi||x.baslik||'Evrak'}`,x.aciklama,dayDiff(x.tarih),'documents','evrak','Evrak Takibi')).filter(x=>x.gunFarki<=days)}";
  dash=once(dash,oldScan,newScan,'evrak reminder direct route');
}
fs.writeFileSync(dashPath,dash);

// 4) Consolidate regression coverage into existing Documents + Dashboard reminder tests.
const docsTestPath='tests/documents-viewer-v2-smoke.test.js';let docsTest=fs.readFileSync(docsTestPath,'utf8');
if(!docsTest.includes('documents.tracking')){
  docsTest=once(docsTest,"const design=fs.readFileSync('css/design-system.css','utf8');","const design=fs.readFileSync('css/design-system.css','utf8');\nconst loader=fs.readFileSync('js/app-loader.js','utf8');",'documents test loader');
  const log="console.log('Documents V2 doğrudan module viewer + merkezi tasarım sözleşmesi başarılı.');";
  const add=`assert(documents.includes("PermissionService?.can?.('documents.tracking','read')"),'Evrak Takibi görüntüleme merkezi documents.tracking iznini kullanmalı.');\nassert(documents.includes("PermissionService?.can?.('documents.tracking.edit','edit')"),'Evrak Takibi yazma merkezi documents.tracking.edit iznini kullanmalı.');\nassert(documents.includes("device().add('evrak',COL.evrak")&&documents.includes("device().update('evrak',COL.evrak")&&documents.includes("device().remove('evrak',COL.evrak"),'Evrak CRUD DeviceData local-first kapısında kalmalı.');\nassert(documents.includes('responsibleNames(x.sorumluOgretmenIdler)'),'Evrak kartı gerçek sorumlu öğretmenleri göstermeli.');\nassert(loader.includes("['documents.tracking','Evrak Takibi','section']")&&loader.includes("['documents.tracking.edit','Evrak Takibi düzenleme','action']"),'Evrak izinleri merkezi katalogda olmalı.');\nassert(loader.includes("'module.documents':['dokumanlar','evrak']"),'Eski evrak yetkisi Documents modül görünürlüğünü korumalı.');\nassert(loader.includes("'documents.tracking':['evrak']")&&loader.includes("'documents.tracking.edit':['evrak']"),'Eski evrak rol yetkisi merkezi izinlere alias olmalı.');\nconsole.log('Documents V2 Evrak Takibi merkezi yetki + local-first sözleşmesi başarılı.');\n`;
  docsTest=once(docsTest,log,add+log,'documents evrak assertions');
  fs.writeFileSync(docsTestPath,docsTest);
}
const dashTestPath='tests/dashboard-reminders-smoke.test.js';let dashTest=fs.readFileSync(dashTestPath,'utf8');
if(!dashTest.includes("'documents','evrak','Evrak Takibi'")){
  const log="console.log('Dashboard local-first hatırlatma motoru smoke testi başarılı.');";
  const add=`assert(src.includes("'documents','evrak','Evrak Takibi'"),'Evrak teslim hatırlatması doğrudan Evrak Takibi alt sayfasına gitmeli.');\nassert(src.includes("function route(module,page='',title='')"),'Hatırlatma rotası ikinci mapping oluşturmadan modül alt sayfasını taşıyabilmeli.');\n`;
  dashTest=once(dashTest,log,add+log,'dashboard evrak route assertions');
  fs.writeFileSync(dashTestPath,dashTest);
}
console.log('Evrak central permission/direct route migration applied.');
