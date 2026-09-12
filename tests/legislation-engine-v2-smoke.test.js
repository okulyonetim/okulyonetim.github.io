const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/legislation.js','utf8');
const ui=fs.readFileSync('js/modules/legislation-ui.js','utf8');
const shell=fs.readFileSync('index.html','utf8');
const shellUi=fs.readFileSync('js/core/shell-ui.js','utf8');

for(const token of ["RECORD_TYPE='mevzuatKayitlar'","CHUNK_TYPE='mevzuatChunklar'","LEGACY_DB='okulMevzuatDB'",'function split(text)','function stem(word)','async function search(question','async function searchDetailed(question','async function ask(question','async function backup()','async function restore(data)']) assert(src.includes(token),`Mevzuat V3 motor sözleşmesi eksik: ${token}`);
assert(src.includes('global.DeviceData.persist(type'),'Mevzuat yazmaları merkezi DeviceData.persist kapısından geçmeli.');
assert(src.includes('global.SyncEngine.localHydrate([RECORD_TYPE,CHUNK_TYPE])'),'Mevzuat okumaları merkezi local-first hydrate mekanizmasını kullanmalı.');
assert(src.includes("indexedDB.databases()).some(x=>x?.name===LEGACY_DB)"),'Modern tarayıcıda legacy mevzuat DB varlığı oluşturma yapmadan kontrol edilmeli.');
assert(src.includes('req=indexedDB.open(LEGACY_DB)')&&src.includes('req.onupgradeneeded=()=>{upgrade=true;'),'databases() olmayan tarayıcıda legacy DB probe upgrade transaction ile ayırt edilmeli.');
assert(src.includes('req.transaction?.abort?.()'),'Legacy DB yokken probe işlemi upgrade transactionını abort ederek ikinci DB yaratmamalı.');
assert(src.includes('const req=indexedDB.open(LEGACY_DB);'),'Mevcut legacy mevzuat verisi migration amacıyla sürüm zorlamadan okunabilmeli.');
assert(src.includes('indexedDB.deleteDatabase(LEGACY_DB)'),'Başarılı migration sonrası eski ikinci IndexedDB silinmeli.');
assert(!src.includes('createObjectStore(')&&!src.includes("createIndex('mevzuatId'"),'Mevzuat motoru ikinci IndexedDB/store oluşturmamalı.');
assert(!src.includes("const DB_NAME='okulMevzuatDB'")&&!src.includes('function db(){'),'Legacy mevzuat DB çalışma zamanı ana veri deposu olmamalı.');
assert(!src.includes('db.collection(')&&!src.includes('firebase.firestore'),'Mevzuat motoru Firestore kullanmamalı.');
assert(!src.includes('document.getElementById')&&!src.includes('modalAc('),'Mevzuat motoru DOM/modal presentation katmanına bağlı olmamalı.');
assert(src.includes("https://koruk-mevzuat-asistan.sedonet23.workers.dev/"),'Mevcut mevzuat Worker sözleşmesi korunmalı.');

for(const token of ['const EXPANSIONS=','const OFFICIAL_HOSTS=','function expandTerms(question)','function officialScore(value)','function canonicalKey(row)','function phraseScore(text,question)','async function searchDetailed(question,count=12)','function answerInstructions()','function sanitizeHistory(history)']) assert(src.includes(token),`Mevzuat V3 retrieval bileşeni eksik: ${token}`);
assert(src.includes("'mevzuat.gov.tr','resmigazete.gov.tr','meb.gov.tr'"),'Resmî mevzuat web kaynakları öncelik listesinde bulunmalı.');
assert(src.includes("mode:'hybrid'")&&src.includes("responseStyle:'detailed'"),'Worker ayrıntılı hibrit cevap moduyla çağrılmalı.');
assert(src.includes('webSearch:{enabled:true,officialOnly:true'),'Worker resmî web doğrulama isteğini almalı.');
assert(src.includes("freshness:'latest'"),'İnternet doğrulamasında en güncel kaynak istenmeli.');
assert(src.includes("'CEVAP YAPISI: 1) Sonuç 2) Mevzuat dayanağı 3) Ayrıntılı açıklama 4) Okul yönetiminde uygulama 5) İstisnalar/özel durumlar 6) Kaynaklar.'"),'Ayrıntılı cevap şablonu prompt bağlamında bulunmalı.');
assert(src.includes("'YETERSİZ BAĞLAM: Doğrudan hüküm yoksa hemen “bilmiyorum” deme"),'Asistan doğrudan eşleşme yokken hemen vazgeçmemeli.');
assert(src.includes("const messages=[...sanitizeHistory(history),{role:'user',text:soru}]"),'Sohbet geçmişi Worker isteğine eklenebilmeli.');
assert(src.includes('Number(base.chunk.indeks)-1')&&src.includes('Number(base.chunk.indeks)+1'),'İlgili maddenin komşu bölümleri de bağlama eklenmeli.');
assert(src.includes('GEÇİCİ\\s+MADDE')&&src.includes('EK\\s+MADDE'),'Geçici ve ek maddeler parçalama tarafından tanınmalı.');

for(const token of ['data-legislation-v2','data-legislation-add','data-legislation-delete','legislationImport','data-legislation-send','LegislationEngine']) assert(ui.includes(token),`Mevzuat V3 presentation sözleşmesi eksik: ${token}`);
assert(shellUi.includes("['Mevzuat','📖','documents','mevzuat']"),'Mevzuat tek merkezi Menü kataloğunda Documents/mevzuat rotasında bulunmalı.');
assert(shellUi.includes("name==='documents'&&page==='mevzuat'")&&shellUi.includes('global.LegislationModule.mount(root)'),'ShellUI Mevzuat sayfasını Documents altında gerçek presentation API’sine bağlamalı.');
assert(ui.includes("PermissionService?.can?.('documents.view','preview')"),'Mevzuat görüntüleme yetkisi Documents yetki sınırından geçmeli.');
assert(ui.includes("const canEdit=()=>global.PermissionService?.can?.('documents.edit','edit')!==false"),'Mevzuat mutation işlemleri documents.edit sınırına bağlı olmalı.');
assert(ui.includes('function requireEdit()')&&ui.includes("data-ka-write=\"documents.edit\""),'Mevzuat yazma işlemleri hem UI hem işlem katmanında edit yetkisi istemeli.');
for(const fn of ['async function save()','async function importFile(e)']){const i=ui.indexOf(fn);assert(i>=0&&ui.slice(i,i+180).includes('requireEdit()'),`${fn} doğrudan edit yetkisini doğrulamalı.`)}
assert(ui.includes("if(!requireEdit())return;if(!global.confirm?.('Bu mevzuatı ve tüm bölümlerini silmek istediğinize emin misiniz?')"),'Mevzuat silme işlemi eski onay davranışını ve edit yetkisini korumalı.');
assert(ui.includes("ShellUI?.routeModule?.('documents',{bottom:'menu'})"),'Mevzuat geri dönüş API’si Documents modülüne gitmeli.');
assert(ui.includes("PermissionService?.applyModule?.('documents')"),'Mevzuat presentation Documents permission modunu uygulamalı.');
assert(!ui.includes("e.detail?.name==='communication'")&&!ui.includes('data-legislation-open'),'Communication içine ikinci Mevzuat sekmesi enjekte edilmemeli.');
assert(!ui.includes('db.collection(')&&!ui.includes('firebase.firestore'),'Mevzuat presentation Firestore kullanmamalı.');
assert(!/createElement\(\s*['"]style['"]\s*\)/.test(ui),'Mevzuat presentation ikinci runtime tema/style katmanı oluşturmamalı.');

for(const label of [
  '⚖️ Mevzuat Asistanı',
  "Mevzuat metinlerini ekle, cihazında sakla, soru sor — hiçbir veri Firestore'a gitmez",
  '📥 Toplu İçe Aktar','➕ Yeni Mevzuat Ekle','📚 Eklenen Mevzuatlar','💬 Soru Sor','+ Yeni Mevzuat Ekle','Kaynak (opsiyonel)','Bölerek Kaydet','Henüz mevzuat eklenmedi. “+ Yeni Mevzuat Ekle” ile başla.','Örn: Yıllık izin kaç gündür?','Arşiv ve güncel kaynaklar taranıyor…'
]) assert(ui.includes(label),`Mevzuat görünür paritesi eksik: ${label}`);
for(const marker of ['data-legislation-import-trigger','data-legislation-modal','data-legislation-form','legislationCategoryList','rows="10"','rows="2"']) assert(ui.includes(marker),`Mevzuat toolbar/modal/sohbet işareti eksik: ${marker}`);
assert(ui.includes('height:min(60vh,640px)'),'Mevzuat sohbet çalışma alanının yaklaşık 60vh yüksekliği korunmalı.');
assert(ui.includes('MADDE 1-, MADDE 2-'),'Mevzuat ekleme modalı madde bazlı yönlendirmeyi göstermeli.');
assert(ui.includes("PDF'ten metin çıkaramıyorsan"),'Mevzuat ekleme modalı PDF metin çıkarma yardımını göstermeli.');
assert(ui.includes('engine().add({baslik,kaynak,kategori,metin})'),'Yeni mevzuat canonical LegislationEngine.add üzerinden kaydedilmeli.');
assert(ui.includes('engine().importJson(parsed)'),'Toplu içe aktarma canonical LegislationEngine.importJson üzerinden kalmalı.');
assert(ui.includes('engine().remove(b.dataset.legislationDelete)'),'Silme canonical LegislationEngine.remove üzerinden kalmalı.');
assert(ui.includes('engine().ask(q,prior)'),'Soru geçmiş bağlamıyla canonical LegislationEngine.ask üzerinden gitmeli.');
assert(ui.includes('const prior=history.slice(0,-1)'),'UI önceki sohbet turlarını ayrı bağlam olarak taşımalı.');

const sw=fs.readFileSync('service-worker.js','utf8');
assert(!shell.includes('<script src="js/modules/legislation.js" defer></script>')&&!shell.includes('<script src="js/modules/legislation-ui.js" defer></script>'),'Mevzuat motoru ve presentation ilk açılışta eager yüklenmemeli.');
assert(sw.includes("'./js/modules/legislation.js'")&&sw.includes("'./js/modules/legislation-ui.js'"),'Mevzuat motoru ve presentation offline Service Worker cache içinde bulunmalı.');
assert(sw.includes("const CACHE_ADI='oy-cache-v935'"),'Mevzuat V3 yeni PWA cache sürümüyle dağıtılmalı.');
assert(shellUi.includes("loadScript?.('js/modules/legislation.js')")&&shellUi.includes("loadScript?.('js/modules/legislation-ui.js')"),'Mevzuat motoru ve presentation Documents/mevzuat rotasında lazy yüklenmeli.');
assert(!fs.existsSync('js/mevzuat-asistan.js'),'Legacy mevzuat-asistan.js geri dönmemeli.');

console.log('Mevzuat V3 local-first + güçlü retrieval + ayrıntılı/hibrit cevap sözleşmesi başarılı.');
