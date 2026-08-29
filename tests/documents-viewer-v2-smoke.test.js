const fs=require('fs');
const assert=require('assert');

const documents=fs.readFileSync('js/modules/documents.js','utf8');
const parity=fs.readFileSync('js/modules/classic-documents-parity.js','utf8');
const advanced=fs.readFileSync('js/modules/classic-document-tools.js','utf8');
const viewer=fs.readFileSync('js/modules/document-viewer.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const live=fs.readFileSync('js/modules/school-live-status.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(parity);
new Function(advanced);

assert(documents.includes("s.src='js/modules/document-viewer.js'"),'Documents V2 belge görüntüleyiciyi doğrudan module path üzerinden yalnız kullanım anında lazy-load etmeli.');
assert(documents.includes("endsWith('js/modules/document-viewer.js')"),'Documents V2 mevcut module viewer scriptini yeniden kullanmalı.');
assert(documents.includes("s.dataset.korukCapability='document-viewer'"),'Belge görüntüleyici capability olarak işaretlenmeli.');
assert(documents.includes("PermissionService?.can?.('documents.view','preview')"),'Belge açma documents.view preview/read/edit yetki sözleşmesine uymalı.');
assert(documents.includes('viewer?.destekliMi?.'),'Dosya türü görüntüleyici capability kontrolünden geçmeli.');
assert(documents.includes('await viewer.ac('),'Desteklenen belgeler uygulama içi görüntüleyicide açılmalı.');
assert(documents.includes("window.open(d.dosyaUrl,'_blank','noopener')"),'Desteklenmeyen veya görüntüleyici hatalı belgelerde web fallback korunmalı.');
assert(!documents.includes('js/dokuman-okuyucu.js'),'Emekli root viewer yolu Documents V2 zincirine geri dönmemeli.');
for(const lib of ['pdf.js/3.11.174/pdf.min.js','docx-preview@0.3.6','exceljs/4.4.0/exceljs.min.js','xlsx/0.18.5/xlsx.full.min.js']) assert(viewer.includes(lib),`Belge görüntüleyici lazy bağımlılığı korunmalı: ${lib}`);
assert(viewer.includes('window.DokumanOkuyucu={'),'Görüntüleyici tek DokumanOkuyucu capability API sunmalı.');
assert(viewer.includes('function pullToRefreshAyarla(enabled)'),'Native pull-to-refresh capability fallback korunmalı.');
assert(!/createElement\(\s*['"]style['"]\s*\)/.test(viewer),'Belge görüntüleyici runtime <style> üretmemeli.');
assert(!viewer.includes('function style(){'),'Eski viewer style() katmanı geri dönmemeli.');
for(const selector of ['dv3','dv3h','dv3body','dv3pdfpage','dv3wordviewport','dv3sheet']) assert(new RegExp(`\\.${selector}\\s*\\{`).test(design),`Belge görüntüleyici stili design-system.css içinde olmalı: .${selector}`);

// Classic Dokümanlar workspace parity: presentation only, current service/repository remains canonical.
assert(!/\bdb\s*\.\s*collection\s*\(/.test(parity),'Classic Dokümanlar paritesi doğrudan Firestore kullanmamalı.');
assert(!/localStorage\s*\.\s*setItem\s*\(/.test(parity),'Classic Dokümanlar paritesi kalıcı veriyi localStorage ile yazmamalı.');
assert(parity.includes('DokumanlarService?.dokumanEkle?.'),'Doküman ekleme mevcut DokumanlarService üzerinden kalmalı.');
assert(parity.includes('DokumanlarService?.dokumanSil?.'),'Doküman silme mevcut DokumanlarService üzerinden kalmalı.');
assert(parity.includes('DokumanlarService?.dokumanGorunurlukGuncelle?.'),'Görünürlük değişimi mevcut DokumanlarService üzerinden kalmalı.');
assert(parity.includes('DocumentsModule?.ensureViewer?.'),'Classic Doküman açma mevcut module viewer capability sini yeniden kullanmalı.');
assert(parity.includes("PermissionService?.can?.('documents.edit','edit')"),'Classic Doküman yazma aksiyonları merkezi documents.edit yetkisine bağlı olmalı.');
for(const label of ['Öğrenci Formları','Veli Formları','Gezi & Etkinlik','Proje Formları','Yazılı Senaryoları','Yönetim & İdari','Diğer']) assert(parity.includes(label),`Eski doküman kategorisi eksik: ${label}`);
for(const marker of ['Tüm Kategoriler','+ Doküman Ekle','📎 Dosya Yükle','🖼 Resimlerden PDF','🔗 PDF Birleştir','🔗 URL Ekle','🌐 Herkese Açık','🔒 Sadece Bana Özel','data-classic-document-open','data-classic-document-download','data-classic-document-visibility','data-classic-document-delete']) assert(parity.includes(marker),`Eski Dokümanlar görünür davranışı eksik: ${marker}`);
assert(parity.includes("arr('dokumanlarAcik')")&&parity.includes("arr('dokumanlarBenim')"),'Normal kullanıcı doküman görünümü mevcut local-first açık/benim cache lerini kullanmalı.');
assert(parity.includes("loadScript?.('js/modules/classic-document-tools.js')"),'Gelişmiş doküman araçları yalnız kullanım anında lazy yüklenmeli.');
assert(parity.includes('ClassicDocumentTools?.fileFor?.(form)'),'Üretilen PDF mevcut DokumanlarService kaydına File olarak teslim edilmeli.');
assert(live.includes("loadScript?.('js/modules/classic-documents-parity.js')"),'Classic Dokümanlar paritesi yalnız dashboard sonrası lazy yüklenmeli.');
assert(sw.includes("'./js/modules/classic-documents-parity.js'"),'Classic Dokümanlar paritesi offline kabukta önbelleğe alınmalı.');
assert(sw.includes("'./js/modules/classic-document-tools.js'"),'Gelişmiş Dokümanlar araçları offline kabukta önbelleğe alınmalı.');

// Advanced image -> PDF / PDF merge parity is a pure processing capability.
assert(!/\bdb\s*\.\s*collection\s*\(/.test(advanced),'Gelişmiş doküman araçları doğrudan Firestore kullanmamalı.');
assert(!/localStorage\s*\.\s*setItem\s*\(/.test(advanced),'Gelişmiş doküman araçları localStorage ile kalıcı veri yazmamalı.');
assert(!/createElement\(\s*['"]style['"]\s*\)/.test(advanced),'Gelişmiş doküman araçları ikinci runtime tema/style katmanı oluşturmamalı.');
assert(advanced.includes('pdf.js/3.11.174/pdf.min.js'),'PDF birleştirme mevcut viewer ile aynı PDF.js sürümünü kullanmalı.');
assert(advanced.includes('pdfjs.getDocument({data:buf'),'PDF birleştirme gerçek PDF sayfalarını PDF.js ile okumalı.');
assert(advanced.includes('page.render({canvasContext:x,viewport:vp'),'PDF sayfaları düzenleme hattına canvas üzerinden aktarılmalı.');
assert(advanced.includes('global.uygulamaDosyaKaydet'),'İndir/Paylaş mevcut platform dosya kaydetme köprüsünü kullanmalı.');
assert(advanced.includes('new File([s.pdfBlob]'),'Oluşturulan PDF canonical belge kaydına File olarak verilmeli.');
for(const fn of ['exifOrientation','orientCanvas','perspectiveCanvas','homography','solveGauss','bilinear','buildPdf']) assert(advanced.includes(`function ${fn}`),`Gelişmiş belge motoru eksik: ${fn}`);
for(const label of ['Belge Modu','Gri Tonlama','Siyah/Beyaz Metin','Parlaklık','Kontrast','Gölge Giderme','Sıcaklık','Beyazlık','Metin Düzeltme','Netlik','Hareli Giderme','Gürültü Giderme','Otomatik Algıla','Köşeleri Sıfırla','Kırp','Döndür','Paylaş']) assert(advanced.includes(label),`Eski görsel/PDF aracı davranışı eksik: ${label}`);
assert(advanced.includes('accept="image/*" multiple'),'Resimlerden PDF çoklu görsel seçimini korumalı.');
assert(advanced.includes('accept="application/pdf,.pdf" multiple'),'PDF Birleştir çoklu PDF seçimini korumalı.');
assert(advanced.includes("orientation==='auto'"),'PDF sayfa yönü otomatik/dikey/yatay seçimini korumalı.');

assert(documents.includes("PermissionService?.can?.('documents.tracking','read')"),'Evrak Takibi görüntüleme merkezi documents.tracking iznini kullanmalı.');
assert(documents.includes("PermissionService?.can?.('documents.tracking.edit','edit')"),'Evrak Takibi yazma merkezi documents.tracking.edit iznini kullanmalı.');
assert(documents.includes("device().add('evrak',COL.evrak")&&documents.includes("device().update('evrak',COL.evrak")&&documents.includes("device().remove('evrak',COL.evrak"),'Evrak CRUD DeviceData local-first kapısında kalmalı.');
assert(documents.includes("SyncEngine.register('evrak',COL.evrak)")&&documents.includes("SyncEngine.localHydrate(['evrak'])"),'Evrak Takibi cihaz verisini önce hydrate edip Firestore senkronunu arkaya bırakmalı.');
assert(documents.includes("const TUR=['Gelen Evrak','Giden Evrak','İç Yazışma','Tutanak','Diğer']"),'Eski gerçek evrak türleri korunmalı.');
assert(documents.includes("const DURUM=['Beklemede','İşlemde','Tamamlandı','Arşivlendi']"),'Eski gerçek evrak durumları korunmalı.');
for(const field of ['evrakAdi','tur','tarih','durum','sorumluOgretmenIdler','dosyaLinki','aciklama']) assert(documents.includes(field),`Evrak gerçek veri alanı korunmalı: ${field}`);
assert(documents.includes('responsibleNames(x.sorumluOgretmenIdler)'),'Evrak kartı gerçek sorumlu öğretmenleri göstermeli.');
assert(!documents.includes("const canView=()=>typeof global.gorebilir==='function'?global.gorebilir('evrak'):true"),'Evrak sayfası eski yetki yardımcısını ana yetki kaynağı olarak kullanmamalı.');
assert(loader.includes("['documents.tracking','Evrak Takibi','section']")&&loader.includes("['documents.tracking.edit','Evrak Takibi düzenleme','action']"),'Evrak izinleri merkezi katalogda olmalı.');
assert(loader.includes("'module.documents':['dokumanlar','evrak']"),'Eski evrak yetkisi Documents modül görünürlüğünü korumalı.');
assert(loader.includes("'documents.tracking':['evrak']")&&loader.includes("'documents.tracking.edit':['evrak']"),'Eski evrak rol yetkisi merkezi izinlere alias olmalı.');
console.log('Documents V2 Evrak Takibi + classic Dokümanlar çalışma alanı local-first paritesi başarılı.');
console.log('Documents gelişmiş Resim→PDF + PDF Birleştir local-first capability sözleşmesi başarılı.');
console.log('Documents V2 doğrudan module viewer + merkezi tasarım sözleşmesi başarılı.');