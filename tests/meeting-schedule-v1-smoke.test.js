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

for(const token of ["sok:'ŞÖK'","zumre:'Zümre'","diger:'Diğer'",'dersListesi','siniflar','type="date"','type="time"','Raporu Yazdır','ReportEngine.printReport']) assert(page.includes(token),`Toplantı davranışı eksik: ${token}`);
assert(page.includes("function lessons(){return arr('dersListesi')"),'Ortaokul zümre seçicisi gerçek dersListesi kaynağını kullanmalı.');
assert(page.includes('data-meeting-row-lesson')&&page.includes('data-meeting-row-level'),'Zümre satırları ortaokulda ders, ilkokulda düzey seçicisi üretmeli.');
assert(page.includes("dersId:''")&&page.includes("dersAdi:''"),'Yeni toplantı satırları ders kimliği ve adını taşımalı.');
assert(!page.includes("function branches(){return arr('bransListesi')"),'Ortaokul zümresi bransListesi kaynağına dönmemeli.');
assert(!page.includes('data-meeting-branch'),'Eski branş seçici UI geri dönmemeli.');
assert(page.includes('r.dersAdi||lessons().find(x=>x.id===r.dersId)?.ad||r.bransAdi'),'Eski bransAdi kayıtları yalnız geriye uyumlu render yolunda okunabilmeli.');

assert(page.includes("function canEdit(){return user().admin===true}"),'Toplantı yazma yetkisi yalnız gerçek admin olmalı.');
assert(page.includes("kaydet(id,v){if(!canEdit())return Promise.reject(new Error('yetkisiz'))"),'Service katmanı admin olmayan yazmayı kuyruğa girmeden engellemeli.');
assert(page.includes("sil(id){if(!canEdit())return Promise.reject(new Error('yetkisiz'))"),'Service katmanı admin olmayan silmeyi engellemeli.');
assert(page.includes("${canEdit()?formHtml():''}${listHtml()}"),'Admin olmayan kullanıcıda form gizlenirken kayıt listesi görünmeye devam etmeli.');
assert(!page.includes("PermissionService?.can?.('management.personnel','edit')"),'Genel personel edit yetkisi toplantı yazma yetkisi sayılmamalı.');

assert(page.includes('Toplantı Başlığı <small class="ka-muted">(ortak)</small>'),'Toplantı grubunda tek ortak başlık alanı olmalı.');
assert(page.includes('data-meeting-add-row')&&page.includes('rows.push(blankRow('),'Satır Ekle yalnız yeni taslak satır oluşturmalı.');
assert(!page.includes('save({keepReady:true})'),'Satır Ekle eski tekil kayıt davranışına dönmemeli.');
assert(page.includes('data-meeting-save-all')&&page.includes('async function saveAll()'),'Tümünü Kaydet bütün taslak satırları toplu kayıt akışına göndermeli.');
assert(page.includes('Tümünü Kaydet (${rows.length})'),'Kaydet düğmesi satır sayısını göstermeli.');
assert(page.includes('toplantiBasligi:title')&&page.includes('grupId:grp')&&page.includes('grupSira:index+1'),'Aynı başlıktaki satırlar grup kimliği ve sırasıyla ayrı kayıtlar olarak saklanmalı.');
assert(page.includes('satirKonusu:'),'ŞÖK/Diğer satırları ortak başlıktan ayrı satır konusu taşıyabilmeli.');
assert(page.includes('data-meeting-class-menu')&&page.includes('data-meeting-row-class')&&page.includes('data-meeting-row-all-classes'),'Sınıflar sütunu açılır çoklu seçim ve Tüm Sınıflar seçeneği sunmalı.');
assert(page.includes('ka-meeting-class-summary')&&page.includes("names.slice(0,2).join(', ')")&&page.includes("names.length>2?` +${names.length-2}`"),'Karttaki sınıf alanı seçilen sınıfları okunabilir kompakt özetle göstermeli.');
assert(page.includes('ka-meeting-detail-control')&&page.includes('ka-meeting-date-control')&&page.includes('ka-meeting-time-control'),'Kart alanları ders/konu, tarih ve saat için özel kontrol sınıfları taşımalı.');
assert(page.includes('<article class="ka-meeting-draft-card" data-meeting-row=')&&page.includes('ka-meeting-draft-grid')&&page.includes('ka-meeting-row-badge'),'Her taslak toplantı satırı onaylanan kart düzeninde üretilmeli.');
assert(page.includes('data-meeting-class-panel=')&&!page.includes('data-meeting-class-panel-row'),'Çoklu sınıf seçimi tablo satırı yerine ilgili kartın içinde açılmalı.');
assert(!page.includes('<table class="ka-table ka-meeting-table">'),'Dar mobil tablo düzeni toplantı taslağından kaldırılmalı.');
assert(page.includes("draftField('users','Sınıflar',classDropdown(row)")&&page.includes('Birden fazla sınıf seçebilir veya boş bırakabilirsiniz.')&&!page.includes('En az bir sınıf seçiniz'),'Sınıf seçimi toplantı satırı için zorunlu olmamalı.');
assert(page.includes('function groupedRecords()')&&page.includes('data-meeting-edit-group')&&page.includes('data-meeting-delete-group'),'Kaydedilen satırlar ortak başlık altında grup olarak yönetilebilmeli.');
assert(page.includes('for(let i=0;i<rows.length;i++)')&&page.includes('await Service.kaydet(row.recordId||null,payload)'),'Toplu kaydet her satırı local-first service kapısından geçirmeli.');

assert(dashboard.includes("arr('toplantiCizelgesi')"),'Dashboard toplantıları local AppStore snapshotından okumalı.');
assert(dashboard.includes("SyncEngine.register('toplantiCizelgesi',COL.toplantiCizelgesi)"),'Dashboard toplantı tipini mevcut SyncEngine hydrate akışına katmalı.');
assert(dashboard.includes("'data.toplantiCizelgesi'"),'Dashboard toplantı değişikliklerine AppStore üzerinden abone olmalı.');
assert(dashboard.includes("meetingUpcomingRows(14)")&&dashboard.includes("meetingUpcomingRows(30)"),'Yönetici ve öğretmen yaklaşan etkinlik akışları toplantıları içermeli.');
assert(!/\bdb\s*\.\s*collection\s*\(/.test(dashboard),'Dashboard toplantı entegrasyonu doğrudan Firestore kullanmamalı.');

for(const selector of ['.ka-meeting-page{','.ka-meeting-chip{','.ka-meeting-item{','.ka-meeting-report{','.ka-meeting-draft-card{','.ka-meeting-draft-grid{','.ka-meeting-draft-field{']) assert(design.includes(selector),`Merkezi toplantı stili eksik: ${selector}`);
assert(design.includes('.ka-meeting-draft-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'),'Toplantı kartı ders/sınıf ve tarih/saat alanlarını okunabilir iki sütunlu düzende göstermeli.');
assert(design.includes('.ka-meeting-draft-card{min-width:0;padding:13px 14px;border:1px solid var(--ka-border);border-radius:18px'),'Toplantı satır kartı merkezi tasarım sisteminde belirgin kart yüzeyi kullanmalı.');
assert(design.includes('.ka-meeting-report-button{position:static'),'Rapor düğmesi mobil alt navigasyonun üzerine sticky olarak binmemeli.');
assert(sw.includes("'./js/modules/meeting-schedule.js'"),'Toplantı sayfası offline shell içinde olmalı.');
assert(page.includes("root.onclick=handleClick")&&page.includes("root.onchange=handleChange")&&page.includes("root.oninput=handleInput"),'Toplantı formu yeniden çizimlere dayanıklı delegated event kullanmalı.');
assert(page.includes("data-meeting-form-message")&&page.includes("formMessage=err;render()"),'Doğrulama hatası form içinde görünür olmalı.');
const runtimeCache=sw.match(/const CACHE_ADI\s*=\s*'oy-cache-v(\d+)'/);
assert(runtimeCache&&Number(runtimeCache[1])>=858,'Kart düzenli toplantı formu yeni PWA cache sürümüyle yayınlanmalı.');
console.log('Meeting Schedule kart satır + çoklu sınıf + admin-only + local-first sözleşmesi başarılı.');
