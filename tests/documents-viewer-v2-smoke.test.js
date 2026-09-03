const fs=require('fs');
const assert=require('assert');

const documents=fs.readFileSync('js/modules/documents.js','utf8');
const viewer=fs.readFileSync('js/modules/document-viewer.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const live=fs.readFileSync('js/modules/school-live-status.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

new Function(documents);
new Function(viewer);
assert(!fs.existsSync('js/modules/classic-documents-parity.js'),'Classic Documents parity fiziksel olarak emekli edilmeli.');
assert(!live.includes('classic-documents-parity.js'),'Dashboard Documents parity yaması yüklememeli.');
assert(!sw.includes('classic-documents-parity.js'),'Emekli Documents parity offline shell içinde kalmamalı.');

// Viewer stays canonical and lazy.
assert(documents.includes("s.src='js/modules/document-viewer.js'"),'Documents viewer lazy path korunmalı.');
assert(documents.includes("PermissionService?.can?.('documents.view','preview')"),'Documents view permission korunmalı.');
assert(documents.includes('await viewer.ac('),'Desteklenen belgeler uygulama içi viewer ile açılmalı.');
assert(!documents.includes('js/dokuman-okuyucu.js'),'Emekli root viewer geri dönmemeli.');
for(const lib of ['pdf.js/3.11.174/pdf.min.js','docx-preview@0.3.6','exceljs/4.4.0/exceljs.min.js','xlsx/0.18.5/xlsx.full.min.js']) assert(viewer.includes(lib),`Viewer lazy bağımlılığı eksik: ${lib}`);
assert(viewer.includes('window.DokumanOkuyucu={'),'Tek DokumanOkuyucu capability korunmalı.');
assert(!/createElement\(\s*['"]style['"]\s*\)/.test(viewer),'Viewer ikinci runtime style katmanı oluşturmamalı.');
for(const selector of ['dv3','dv3h','dv3body','dv3pdfpage','dv3wordviewport','dv3sheet']) assert(new RegExp(`\\.${selector}\\s*\\{`).test(design),`Viewer stili design-system.css içinde olmalı: .${selector}`);

// Classic visible Documents behavior now belongs directly to DocumentsModule.
assert(!/\bdb\s*\.\s*collection\s*\(/.test(documents),'Documents doğrudan Firestore kullanmamalı.');
assert(!/localStorage\s*\.\s*setItem\s*\(/.test(documents),'Documents kalıcı veriyi localStorage ile yazmamalı.');
for(const api of ['DokumanlarService?.dokumanEkle?.','DokumanlarService?.dokumanSil?.','DokumanlarService?.dokumanGorunurlukGuncelle?.','ensureViewer()']) assert(documents.includes(api),`Canonical Documents API eksik: ${api}`);
for(const label of ['Tüm Kategoriler','+ Doküman Ekle','Harici URL','🌐 Herkese Açık','🔒 Sadece Bana Özel']) assert(documents.includes(label),`Documents görünür davranışı eksik: ${label}`);
const toolbarBlock=(documents.match(/function renderToolbar\(\)\{[\s\S]*?\}\nfunction ensureViewer/)||[''])[0];
assert(toolbarBlock&&!toolbarBlock.includes('data-document-images')&&!toolbarBlock.includes('data-document-merge')&&!toolbarBlock.includes('ka-documents-pdf-actions'),'Doküman listesi içinde PDF araçları tekrar gösterilmemeli; araçlar menüde kalmalı.');
for(const marker of ['data-document-open','data-document-download','data-document-visibility','data-document-delete']) assert(documents.includes(marker),`Documents aksiyonu eksik: ${marker}`);
assert(documents.includes("arr('dokumanlarAcik')")&&documents.includes("arr('dokumanlarBenim')"),'Normal kullanıcı local-first açık/benim cache lerini kullanmalı.');
assert(documents.includes('window.DocumentsPdfTools'),'Menüdeki PDF araçları mevcut DocumentsPdfTools çalışma alanını kullanmalı.');
assert(documents.includes('tools.PAGE_IMAGES')&&documents.includes('tools.PAGE_MERGE'),'Resimden PDF ve PDF Birleştir mevcut sayfalara gitmeli.');
assert(!documents.includes('classic-document-tools.js'),'İkinci eski belge işleme motoru yüklenmemeli.');

// Former global visual patch behavior is owned by shell/index/design-system, not Documents.
assert(index.includes('maximum-scale=1')&&index.includes('user-scalable=no'),'Mobil viewport kararlılığı merkezi shell HTML içinde korunmalı.');
assert(!design.includes('.ka-route-switching{visibility:hidden!important}'),'Sayfa geçişi tüm modül kökünü gizleyip boş kare üretmemeli.');
assert(shell.includes('const reuseModule=moduleRouteMounted(name)')&&shell.includes('if(!reuseModule)await global.AppLoader?.load?.(name)'),'Shell aynı modül geçişlerinde yeniden yükleme yapmamalı; mevcut ekran yeni modül hazır olana kadar korunmalı.');
for(const token of ['.ka-menu-card{position:relative;height:146px;min-height:146px','[data-transport-module]{width:100%;max-width:760px','[data-transport-denetim],#transportContent [data-transport-takip]{display:none!important}','[data-service-edit],#transportContent [data-service-delete]{width:34px']) assert(design.includes(token),`Kompakt mobil görünüm merkezi CSS içinde korunmalı: ${token}`);
assert(design.includes('.ka-document-row{')&&documents.includes('class="evrak-row ka-document-row"'),'Doküman satır yoğunluğu merkezi CSS ile korunmalı.');

// Current advanced image->PDF / PDF merge workspace remains intact until ReportEngine migration package.
assert(documents.includes('if(global.DocumentsPdfTools)return'),'DocumentsPdfTools capability geçiş sırasında tek olmalı.');
assert(documents.includes("const JSPDF_SRC='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'"),'Resimden PDF jsPDF lazy capability kullanmalı.');
assert(documents.includes("const PDFLIB_SRC='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'"),'PDF Birleştir pdf-lib lazy capability kullanmalı.');
for(const fn of ['function exifOrientation(file)','function perspectiveCanvas(img,corners)','function autoCorners(img)','function openEditor(i)']) assert(documents.includes(fn),`Gelişmiş PDF çalışma alanı eksik: ${fn}`);
for(const label of ['Belge Modu','Gri Tonlama','Siyah-Beyaz Metin','Parlaklık','Kontrast','Gölge Giderme','Sıcaklık','Beyazlık','Metin Netliği','Netlik','Hareli (Moiré) Giderme','Gürültü Giderme','Otomatik Algıla','Köşeleri Sıfırla','Kırp','Döndür','Paylaş']) assert(documents.includes(label),`Görsel aracı eksik: ${label}`);
assert(documents.includes('accept="image/*" multiple data-pdf-images'),'Çoklu görsel seçimi korunmalı.');
assert(documents.includes('accept="application/pdf,.pdf" multiple data-pdf-files'),'Çoklu PDF seçimi korunmalı.');
assert(documents.includes('await PDFDocument.load')&&documents.includes('out.copyPages(src,idx)'),'PDF birleştirme rasterize etmeden pdf-lib copyPages kullanmalı.');
assert(documents.includes('await global.uygulamaDosyaKaydet'),'İndir/Paylaş platform kaydetme köprüsünü kullanmalı.');
assert(documents.includes('await global.DokumanlarService.dokumanEkle'),'PDF arşivleme DokumanlarService üzerinden kalmalı.');
assert(documents.includes('global.DocumentsPdfTools={open,cleanup,renderImages,renderMerge,cleanPdfName,PAGE_IMAGES,PAGE_MERGE}'),'Public PDF tools API geçiş boyunca korunmalı.');

// Evrak tracking remains local-first with the real model.
assert(documents.includes("PermissionService?.can?.('documents.tracking','read')"),'Evrak görüntüleme merkezi yetkiyi kullanmalı.');
assert(documents.includes("PermissionService?.can?.('documents.tracking.edit','edit')"),'Evrak yazma merkezi yetkiyi kullanmalı.');
assert(documents.includes("device().add('evrak',COL.evrak")&&documents.includes("device().update('evrak',COL.evrak")&&documents.includes("device().remove('evrak',COL.evrak"),'Evrak CRUD DeviceData kapısında kalmalı.');
assert(documents.includes("SyncEngine.register('evrak',COL.evrak)")&&documents.includes("SyncEngine.localHydrate(['evrak'])"),'Evrak önce cihazdan hydrate edilmeli.');
assert(documents.includes("const TUR=['Gelen Evrak','Giden Evrak','İç Yazışma','Tutanak','Diğer']"),'Gerçek evrak türleri korunmalı.');
assert(documents.includes("const DURUM=['Beklemede','İşlemde','Tamamlandı','Arşivlendi']"),'Gerçek evrak durumları korunmalı.');
for(const field of ['evrakAdi','tur','tarih','durum','sorumluOgretmenIdler','dosyaLinki','aciklama']) assert(documents.includes(field),`Evrak alanı korunmalı: ${field}`);
assert(loader.includes("['documents.tracking','Evrak Takibi','section']")&&loader.includes("['documents.tracking.edit','Evrak Takibi düzenleme','action']"),'Evrak izinleri merkezi katalogda olmalı.');

console.log('Documents canonical workspace + viewer + compact shell ownership + Evrak local-first sözleşmesi başarılı.');
