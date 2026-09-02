const fs=require('fs');
const assert=require('assert');
const page=fs.readFileSync('js/modules/meeting-schedule.js','utf8');
const dashboard=fs.readFileSync('js/modules/dashboard.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const firebase=fs.readFileSync('js/firebase-init.js','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(page);new Function(dashboard);

assert(firebase.includes("toplantiCizelgesi:'oy_toplantiCizelgesi'"),'Toplantı çizelgesi gerçek COL haritasında olmalı.');
assert(firebase.includes("dersListesi:'oy_dersListesi'"),'Ortaokul zümresi gerçek ders listesi koleksiyonunu kullanabilmeli.');
assert(loader.includes("['Toplantı Çizelgesi','📅','management','meeting-schedule']"),'Toplantı Çizelgesi Personel İşleri menüsünde olmalı.');
assert(loader.includes("registerPageRoute('meeting-schedule'"),'Toplantı Çizelgesi custom route kayıtlı olmalı.');
assert(loader.includes("loadScript('js/modules/meeting-schedule.js')"),'Toplantı sayfası lazy yüklenmeli.');
assert(shell.includes("['Toplantı Çizelgesi','📅','management','meeting-schedule']"),'Shell varsayılan menüsü de toplantı sayfasını bilmeli.');

assert(rules.includes('match /oy_toplantiCizelgesi/{id}'),'Firestore toplantı çizelgesi kuralı bulunmalı.');
const meetingRule=rules.slice(rules.indexOf('match /oy_toplantiCizelgesi/{id}'),rules.indexOf('match /oy_ogretmenler/{id}'));
assert(meetingRule.includes('allow read: if girisYapmis();'),'Toplantılar giriş yapan kullanıcılara okunabilir kalmalı.');
assert(meetingRule.includes('allow create, update, delete: if adminMi();'),'Toplantı yazma işlemleri Firestore seviyesinde yalnız admin olmalı.');
assert(!meetingRule.includes("moduluDuzenleyebilir('personel')"),'Personel edit yetkisi toplantı yazma hakkı vermemeli.');

assert(page.includes("DeviceData.add(TYPE,COL.toplantiCizelgesi")&&page.includes("DeviceData.update(TYPE,COL.toplantiCizelgesi")&&page.includes("DeviceData.remove(TYPE,COL.toplantiCizelgesi"),'CRUD yalnız DeviceData kapısından geçmeli.');
assert(page.includes("SyncEngine.register(t,c)")&&page.includes("SyncEngine.localHydrate(types)"),'Toplantı sayfası local-first hydrate kullanmalı.');
assert(!/\bdb\s*\.\s*collection\s*\(/.test(page),'Toplantı sayfası doğrudan Firestore kullanmamalı.');
assert(!/localStorage\s*\.\s*(setItem|removeItem)\s*\(/.test(page),'Toplantı sayfası kalıcı veriyi localStorage ile yazmamalı.');

for(const token of ["sok:'ŞÖK'","zumre:'Zümre'","diger:'Diğer'",'[1,2,3,4]','dersListesi','siniflar','type=\"date\"','type=\"time\"','Raporu Yazdır','ReportEngine.printReport']) assert(page.includes(token),`Toplantı davranışı eksik: ${token}`);
assert(page.includes("function lessons(){return arr('dersListesi')"),'Ortaokul zümre seçicisi gerçek dersListesi kaynağını kullanmalı.');
assert(page.includes('function lessonChooser()')&&page.includes('data-meeting-lesson'),'Ortaokul zümresi ders seçicisi üretmeli.');
assert(page.includes("dersId:''")&&page.includes("dersAdi:''"),'Yeni toplantı kayıtları ders kimliği ve adını taşımalı.');
assert(!page.includes("function branches(){return arr('bransListesi')"),'Ortaokul zümresi bransListesi kaynağına dönmemeli.');
assert(!page.includes('data-meeting-branch'),'Eski branş seçici UI geri dönmemeli.');
assert(page.includes("v.dersAdi||v.bransAdi||''")&&page.includes("r.dersAdi||lessons().find(x=>x.id===r.dersId)?.ad||r.bransAdi"),'Eski bransAdi kayıtları yalnız geriye uyumlu normalize/render yolunda okunabilmeli.');
assert(page.includes("function levelChooser(){if(draft.kademe!=='ilkokul'||draft.tur!=='zumre')return''"),'İlkokul zümresi sınıf düzeyi bazlı olmalı.');
assert(page.includes("function lessonChooser(){if(draft.kademe!=='ortaokul'||draft.tur!=='zumre')return''"),'Ortaokul zümresi ders bazlı olmalı.');

assert(page.includes("function canEdit(){return user().admin===true}"),'Toplantı yazma yetkisi yalnız gerçek admin olmalı.');
assert(page.includes("kaydet(id,v){if(!canEdit())return Promise.reject(new Error('yetkisiz'))"),'Service katmanı admin olmayan yazmayı kuyruğa girmeden engellemeli.');
assert(page.includes("sil(id){if(!canEdit())return Promise.reject(new Error('yetkisiz'))"),'Service katmanı admin olmayan silmeyi engellemeli.');
assert(page.includes("${canEdit()?formHtml():''}${listHtml()}"),'Admin olmayan kullanıcıda form gizlenirken kayıt listesi görünmeye devam etmeli.');
assert(page.includes("${canEdit()?`<div class=\"ka-meeting-item__actions\""),'Düzenle/Sil aksiyonları yalnız admin için render edilmeli.');
assert(!page.includes("PermissionService?.can?.('management.personnel','edit')"),'Genel personel edit yetkisi toplantı yazma yetkisi sayılmamalı.');

assert(dashboard.includes("arr('toplantiCizelgesi')"),'Dashboard toplantıları local AppStore snapshotından okumalı.');
assert(dashboard.includes("SyncEngine.register('toplantiCizelgesi',COL.toplantiCizelgesi)"),'Dashboard toplantı tipini mevcut SyncEngine hydrate akışına katmalı.');
assert(dashboard.includes("'data.toplantiCizelgesi'"),'Dashboard toplantı değişikliklerine AppStore üzerinden abone olmalı.');
assert(dashboard.includes("meetingUpcomingRows(14)")&&dashboard.includes("meetingUpcomingRows(30)"),'Yönetici ve öğretmen yaklaşan etkinlik akışları toplantıları içermeli.');
assert(dashboard.includes("route:'management',page:'meeting-schedule',routeTitle:'Toplantı Çizelgesi'"),'Toplantı etkinlik kartı mevcut meeting-schedule routeuna gitmeli.');
assert(dashboard.includes("sortKey:eventSortKey(x.tarih,x.saat)")&&dashboard.includes("a.sortKey.localeCompare(b.sortKey,'tr')"),'Yaklaşan etkinlikler tarih + saat canonical sırasını kullanmalı.');
assert(!/\bdb\s*\.\s*collection\s*\(/.test(dashboard),'Dashboard toplantı entegrasyonu doğrudan Firestore kullanmamalı.');

for(const selector of ['.ka-meeting-page{','.ka-meeting-segmented{','.ka-meeting-chip{','.ka-meeting-item{','.ka-meeting-report{']) assert(design.includes(selector),`Merkezi toplantı stili eksik: ${selector}`);
assert(sw.includes("'./js/modules/meeting-schedule.js'"),'Toplantı sayfası offline shell içinde olmalı.');
assert(page.includes("root.onclick=handleClick")&&page.includes("root.onchange=handleChange")&&page.includes("root.oninput=handleInput"),'Toplantı formu yeniden çizimlere dayanıklı delegated event kullanmalı.');
assert(page.includes("data-meeting-form-message")&&page.includes("formMessage=err;render()"),'Doğrulama hatası form içinde görünür olmalı.');
assert(page.includes("'+ Satırı Ekle'")&&page.includes("save({keepReady:true})"),'Yeni Satır gerçek kayıt ekleme davranışına bağlı olmalı.');
assert(sw.includes("const CACHE_ADI='oy-cache-v853';"),'Toplantı/dash düzeltmesi cache sürümünü yükseltmeli.');
console.log('Meeting Schedule ders listesi + admin-only + dashboard local-first sözleşmesi başarılı.');
