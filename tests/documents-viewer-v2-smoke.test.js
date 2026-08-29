const fs=require('fs');
const assert=require('assert');

const documents=fs.readFileSync('js/modules/documents.js','utf8');
const parity=fs.readFileSync('js/modules/classic-documents-parity.js','utf8');
const viewer=fs.readFileSync('js/modules/document-viewer.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const live=fs.readFileSync('js/modules/school-live-status.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(parity);

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
for(const marker of ['Tüm Kategoriler','+ Doküman Ekle','🖼 Resimlerden PDF','🔗 PDF Birleştir','Harici URL','🌐 Herkese Açık','🔒 Sadece Bana Özel','data-classic-document-open','data-classic-document-download','data-classic-document-visibility','data-classic-document-delete']) assert(parity.includes(marker),`Eski Dokümanlar görünür davranışı eksik: ${marker}`);
assert(parity.includes("arr('dokumanlarAcik')")&&parity.includes("arr('dokumanlarBenim')"),'Normal kullanıcı doküman görünümü mevcut local-first açık/benim cache lerini kullanmalı.');
assert(parity.includes('global.DocumentsPdfTools'),'Classic Dokümanlar gelişmiş araçlarda canonical DocumentsPdfTools motorunu kullanmalı.');
assert(parity.includes('tools.PAGE_IMAGES')&&parity.includes('tools.PAGE_MERGE'),'Classic Dokümanlar Resimden PDF ve PDF Birleştir canonical sayfalarına yönlenmeli.');
assert(!parity.includes('classic-document-tools.js'),'İkinci bir ClassicDocumentTools işleme motoru yüklenmemeli.');
assert(live.includes("loadScript?.('js/modules/classic-documents-parity.js')"),'Classic Dokümanlar paritesi yalnız dashboard sonrası lazy yüklenmeli.');
assert(sw.includes("'./js/modules/classic-documents-parity.js'"),'Classic Dokümanlar paritesi offline kabukta önbelleğe alınmalı.');
assert(!sw.includes('classic-document-tools.js'),'Silinen paralel belge motoru offline kabuğa geri girmemeli.');

// Canonical DocumentsPdfTools: old image->PDF and PDF merge capability remains one engine.
assert(documents.includes('if(global.DocumentsPdfTools)return'),'Gelişmiş PDF araçları tek DocumentsPdfTools capability olmalı.');
assert(documents.includes("const JSPDF_SRC='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'"),'Resimden PDF mevcut jsPDF lazy capability sini kullanmalı.');
assert(documents.includes("const PDFLIB_SRC='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'"),'PDF Birleştir mevcut pdf-lib lazy capability sini kullanmalı.');
assert(documents.includes('async function exifOrientation(file)'),'Telefon fotoğraflarında EXIF orientation düzeltmesi korunmalı.');
assert(documents.includes('function perspectiveCanvas(img,corners)'),'Dört köşeli perspektif kırpma korunmalı.');
assert(documents.includes('function autoCorners(img)'),'Otomatik belge köşe algılama korunmalı.');
assert(documents.includes('function openEditor(i)'),'Görsel düzenleme ekranı korunmalı.');
for(const label of ['Belge Modu','Gri Tonlama','Siyah-Beyaz Metin','Parlaklık','Kontrast','Gölge Giderme','Sıcaklık','Beyazlık','Metin Netliği','Netlik','Hareli (Moiré) Giderme','Gürültü Giderme','Otomatik Algıla','Köşeleri Sıfırla','Kırp','Döndür','Paylaş']) assert(documents.includes(label),`Canonical görsel/PDF aracı davranışı eksik: ${label}`);
assert(documents.includes('accept="image/*" multiple data-pdf-images'),'Resimden PDF çoklu görsel seçimini korumalı.');
assert(documents.includes('accept="application/pdf,.pdf" multiple data-pdf-files'),'PDF Birleştir çoklu PDF seçimini korumalı.');
assert(documents.includes('await PDFDocument.load')&&documents.includes('out.copyPages(src,idx)'),'PDF Birleştir sayfaları rasterize etmeden pdf-lib ile kopyalamalı.');
assert(documents.includes('await global.uygulamaDosyaKaydet'),'İndir/Paylaş mevcut platform dosya kaydetme köprüsünü kullanmalı.');
assert(documents.includes('await global.DokumanlarService.dokumanEkle'),'Üretilen PDF canonical DokumanlarService ile arşivlenmeli.');
assert(documents.includes('global.DocumentsPdfTools={open,cleanup,renderImages,renderMerge,cleanPdfName,PAGE_IMAGES,PAGE_MERGE}'),'Canonical PDF araçları tek public API üzerinden açılmalı.');

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
console.log('Documents canonical Resim→PDF + PDF Birleştir capability sözleşmesi başarılı.');
console.log('Documents V2 doğrudan module viewer + merkezi tasarım sözleşmesi başarılı.');