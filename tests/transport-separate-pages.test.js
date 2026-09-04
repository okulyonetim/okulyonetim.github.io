const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const transport=fs.readFileSync('js/modules/transport.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const build=fs.readFileSync('scripts/build-client-bundles.mjs','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
for(const [label,page] of [['Taşıma','services'],['Servis Oturma','busSeats'],['Sınıf Oturma','classSeats']]){
  assert(shell.includes(`['${label}'`)&&shell.includes(`'transport','${page}'`),`${label} ayrı Transport sayfasına yönlenmeli.`);
}
assert(shell.includes("name==='transport'&&['services','busSeats','classSeats'].includes(page)"),'ShellUI Transport alt sayfalarını doğrudan çözmeli.');
assert(transport.includes('function openPage(page,title=')&&transport.includes('window.TransportModule={mount,unmount,render,prepareLocal,openBusEditor,openClassSeating,openPage,back}'),'TransportModule public openPage / seating / back API sunmalı.');
assert(!transport.includes('data-transport-tab'),'Transport içinde ikinci bir sekme navigasyonu kalmamalı.');

assert(transport.includes("const uiTeacher=()=>uiUser().admin!==true&&!!uiTeacherId()"),'Transport UI öğretmen kullanıcısını bağlı öğretmen kimliğiyle ayırmalı.');
assert(transport.includes("const canEditBusSeats=()=>!uiTeacher()"),'Öğretmen servis oturma planında düzenleme yetkisi alamamalı.');
assert(transport.includes("data-bus-edit=\"${esc(s.id)}\">${editable?'Düzenle':'Görüntüle'}"),'Servis oturma kartı öğretmene Görüntüle eylemi sunmalı.');
assert(transport.includes("editor={servisId,sablon,elements,editable:canEditBusSeats()}"),'Servis oturma modalı düzenleme/salt-okunur durumunu açıkça taşımalı.');
assert(transport.includes("if(!editor?.editable)return"),'Salt okunur servis oturma modalında düzenleme bindingleri kurulmamalı.');
assert(transport.includes("const canEditClassSeat=id=>uiTeacher()?classOwn(id)"),'Öğretmen sınıf oturma planını yalnız kendi sınıfında düzenleyebilmeli.');
assert(transport.includes('data-class-seat-open'),'Sınıf oturma listesi görüntüle/düzenle eylemi sunmalı.');
assert(transport.includes("loadScript?.('js/modules/class-seating.js')")&&transport.includes('openClassSeating'),'Sınıf oturma motoru canonical Transport üzerinden lazy-load edilip açılmalı.');
assert(transport.includes("if(isTeacherUser()){toast?.('Öğretmen kullanıcıları servis oturma planını yalnız görüntüleyebilir.')"),'Servis oturma service katmanı öğretmen yazmasını reddetmeli.');
assert(transport.includes("_yetkiKontrol(id){const u=activeUser(),ok=isTeacherUser()?ownsClass(id)"),'Sınıf oturma service katmanı öğretmeni yalnız kendi sınıfında yazdırmalı.');


for(const token of ['serviceDetailId','serviceFilter','data-service-detail','data-transport-detail-close','data-transport-add-student','data-transport-presidents','data-transport-excel','data-transport-list','data-transport-remove-student','presidentNames(s)','openAddStudents','openPresidents','openExcel','openListBuilder'])assert(transport.includes(token),`Canonical servis detay çalışma alanı eksik: ${token}`);
for(const token of ['TasimaService.ogrencileriServiseAta','TasimaService.servisKaydet','PeopleImportUI.parseStudentExcel','ReportEngine?.printReport'])assert(transport.includes(token),`Servis detay canonical servis davranışı eksik: ${token}`);
assert(!transport.includes('MutationObserver'),'Transport görünür UI ikinci DOM enhancer/MutationObserver kullanmamalı.');
assert(!loader.includes('transport-service-parity.js'),'Transport bundle ikinci UI sahibi yüklememeli.');
assert(!build.includes('transport-service-parity.js'),'Üretim Transport bundle ikinci UI sahibini içermemeli.');
assert(!sw.includes('transport-service-parity.js'),'Emekli Transport companion PWA cache içinde kalmamalı.');
for(const token of ['TransportReportFidelity','SABIT_LISTE_BOYU=30','DENETIM_MADDELERI','TAŞIMA YOLUYLA EĞİTİME ERİŞİM YÖNETMELİĞİ KAPSAMINDA HİZMET SUNAN','(TAŞIMA MERKEZİ OKUL/KURUM MÜDÜRLÜĞÜNCE KULLANILACAK)','ARACIN MODEL YILI','SÜRÜCÜ BELGESİ YIL / SINIFI','data-trp-duty-teacher','contenteditable="true"','global.ServisOturmaRepository?.planServisIdIleGetir','👑','trp-student-grid',"'<td>Hafta Sonu</td>'.repeat(8)","'<td>Resmî Tatil</td>'.repeat(8)",'ReportEngine.documentHtml','ReportEngine.previewHtml','ReportEngine.printHtml','cloneNode(true)','base.denetim=denetim;base.takip=takip;base.takipSec=takipSec',"requireReport('transport.report.inspection')","requireReport('transport.report.monthly')"])assert(transport.includes(token),`Taşıma resmî rapor fidelity sözleşmesi eksik: ${token}`);
assert(transport.includes("(t.unvan||'').trim()!=='Müdür Yardımcısı'"),'Nöbetçi öğretmen seçimi Müdür Yardımcısını dışlamalı.');
assert(transport.includes("t.id!==a.mudurId"),'Nöbetçi öğretmen seçimi okul müdürünü dışlamalı.');
assert(transport.includes('if(target%2)target++'),'30 kişiyi aşan öğrenci listesi iki sütun için çift sayıya tamamlanmalı.');
assert(transport.includes("select.replaceWith(span)"),'Denetim çıktısında seçilen nöbetçi öğretmen yazdırma HTML’ine düz metin olarak aktarılmalı.');
for(const forbidden of ['db.collection','firebase.firestore','localStorage.setItem','localStorage.removeItem'])assert(!transport.includes(forbidden),`Transport canonical modülü doğrudan yasaklı kalıcı katmana yazmamalı: ${forbidden}`);
assert(loader.includes("define('transport',['js/modules/report-engine.js','js/modules/transport.js?v=892'])"),'Transport yalnız canonical UI + ortak ReportEngine ile lazy yüklenmeli.');
assert(build.includes("'transport.js':['js/modules/report-engine.js','js/modules/transport.js']"),'Üretim Transport bundle tek canonical UI kaynağını içermeli.');
assert(transport.includes("if(document.querySelector('[data-class-seating-overlay]')){window.SinifOturma?.kapat?.();return true}"),'Kaydedilmemiş sınıf oturma planında geri kapatma iptal edilse bile alttaki sayfa kapanmamalı.');
console.log('Transport ayrı-sayfa + klasik servis detay/öğrenci yönetimi + resmî rapor parite sözleşmesi başarılı.');
