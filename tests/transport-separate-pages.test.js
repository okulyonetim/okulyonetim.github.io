const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const transport=fs.readFileSync('js/modules/transport.js','utf8');
const parity=fs.readFileSync('js/modules/transport-service-parity.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const build=fs.readFileSync('scripts/build-client-bundles.mjs','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
for(const [label,page] of [['Taşıma','services'],['Servis Oturma','busSeats'],['Sınıf Oturma','classSeats']]){
  assert(shell.includes(`['${label}'`)&&shell.includes(`'transport','${page}'`),`${label} ayrı Transport sayfasına yönlenmeli.`);
}
assert(shell.includes("name==='transport'&&['services','busSeats','classSeats'].includes(page)"),'ShellUI Transport alt sayfalarını doğrudan çözmeli.');
assert(transport.includes('function openPage(page,title=')&&transport.includes('window.TransportModule={mount,unmount,render,prepareLocal,openBusEditor,openPage}'),'TransportModule public openPage API sunmalı.');
assert(!transport.includes('data-transport-tab'),'Transport içinde ikinci bir sekme navigasyonu kalmamalı.');

for(const token of ['TransportServiceParity','openDetail','openAddStudents','openPresidents','openExcel','openListBuilder','data-transport-detail','data-transport-remove-student','data-transport-presidents','data-transport-settings-save'])assert(parity.includes(token),`Klasik servis detay çalışma alanı eksik: ${token}`);
for(const token of ['TasimaService.ogrencileriServiseAta','TasimaService.servisKaydet','PeopleImportUI.parseStudentExcel','ReportEngine?.printReport'])assert(parity.includes(token),`Servis detay canonical servis/parite davranışı eksik: ${token}`);
assert(parity.includes("currentPage!=='services'"),'Servis detay paritesi yalnız Transport services sayfasında kartları zenginleştirmeli.');
assert(parity.includes("global.AppStore?.get?.('ui.route')!=='transport'"),'Parite başka modüllerin DOM’una taşmamalı.');

for(const token of [
  'TransportReportParity','SABIT_LISTE_BOYU=30','DENETIM_MADDELERI',
  'TAŞIMA YOLUYLA EĞİTİME ERİŞİM YÖNETMELİĞİ KAPSAMINDA HİZMET SUNAN',
  '(TAŞIMA MERKEZİ OKUL/KURUM MÜDÜRLÜĞÜNCE KULLANILACAK)',
  'ARACIN MODEL YILI','SÜRÜCÜ BELGESİ YIL / SINIFI','data-trp-duty-teacher',
  'contenteditable="true"','global.ServisOturmaRepository?.planServisIdIleGetir','👑',
  'trp-student-grid',"'<td>Hafta Sonu</td>'.repeat(8)","'<td>Resmî Tatil</td>'.repeat(8)",
  'ReportEngine.documentHtml','ReportEngine.previewHtml','ReportEngine.printHtml','cloneNode(true)',
  'base.denetim=denetim;base.takip=takip;base.takipSec=takipSec',
  "requireReport('transport.report.inspection')","requireReport('transport.report.monthly')"
])assert(parity.includes(token),`Taşıma resmî rapor paritesi eksik: ${token}`);
assert(parity.includes("(t.unvan||'').trim()!=='Müdür Yardımcısı'"),'Nöbetçi öğretmen seçimi Müdür Yardımcısını dışlamalı.');
assert(parity.includes("t.id!==a.mudurId"),'Nöbetçi öğretmen seçimi okul müdürünü dışlamalı.');
assert(parity.includes('if(target%2)target++'),'30 kişiyi aşan öğrenci listesi iki sütun için çift sayıya tamamlanmalı.');
assert(parity.includes("select.replaceWith(span)"),'Denetim çıktısında seçilen nöbetçi öğretmen yazdırma HTML’ine düz metin olarak aktarılmalı.');

for(const forbidden of ['db.collection','firebase.firestore','DeviceData','localStorage.setItem','localStorage.removeItem'])assert(!parity.includes(forbidden),`Transport servis/rapor paritesi doğrudan kalıcı veri katmanına yazmamalı: ${forbidden}`);
assert(loader.includes("define('transport',['js/modules/report-engine.js','js/modules/transport.js','js/modules/transport-service-parity.js'])"),'Transport companion UI canonical modülle birlikte lazy yüklenmeli.');
assert(build.includes("'transport.js':['js/modules/report-engine.js','js/modules/transport.js','js/modules/transport-service-parity.js']"),'Üretim Transport bundle servis ve rapor paritesini içermeli.');
assert(sw.includes("'./js/modules/transport-service-parity.js'"),'Transport servis/rapor companion UI çevrimdışı PWA cache içinde olmalı.');
console.log('Transport ayrı-sayfa + klasik servis detay/öğrenci yönetimi + resmî rapor parite sözleşmesi başarılı.');
