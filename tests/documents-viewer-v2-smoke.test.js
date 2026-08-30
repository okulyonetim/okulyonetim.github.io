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

// Viewer stays canonical and lazy.
assert(documents.includes("s.src='js/modules/document-viewer.js'"),'Documents viewer lazy path korunmalı.');
assert(documents.includes("PermissionService?.can?.('documents.view','preview')"),'Documents view permission korunmalı.');
assert(documents.includes('await viewer.ac('),'Desteklenen belgeler uygulama içi viewer ile açılmalı.');
assert(!documents.includes('js/dokuman-okuyucu.js'),'Emekli root viewer geri dönmemeli.');
for(const lib of ['pdf.js/3.11.174/pdf.min.js','docx-preview@0.3.6','exceljs/4.4.0/exceljs.min.js','xlsx/0.18.5/xlsx.full.min.js']) assert(viewer.includes(lib),`Viewer lazy bağımlılığı eksik: ${lib}`);
assert(viewer.includes('window.DokumanOkuyucu={'),'Tek DokumanOkuyucu capability korunmalı.');
assert(!/createElement\(\s*['"]style['"]\s*\)/.test(viewer),'Viewer ikinci runtime style katmanı oluşturmamalı.');
for(const selector of ['dv3','dv3h','dv3body','dv3pdfpage','dv3wordviewport','dv3sheet']) assert(new RegExp(`\\.${selector}\\s*\\{`).test(design),`Viewer stili design-system.css içinde olmalı: .${selector}`);

// Classic visible Documents workspace remains presentation-only.
assert(!/\bdb\s*\.\s*collection\s*\(/.test(parity),'Classic Documents doğrudan Firestore kullanmamalı.');
assert(!/localStorage\s*\.\s*setItem\s*\(/.test(parity),'Classic Documents kalıcı veriyi localStorage ile yazmamalı.');
for(const api of ['DokumanlarService?.dokumanEkle?.','DokumanlarService?.dokumanSil?.','DokumanlarService?.dokumanGorunurlukGuncelle?.','DocumentsModule?.ensureViewer?.']) assert(parity.includes(api),`Canonical Documents API eksik: ${api}`);
for(const label of ['Tüm Kategoriler','+ Doküman Ekle','🖼 Resimlerden PDF','🔗 PDF Birleştir','Harici URL','🌐 Herkese Açık','🔒 Sadece Bana Özel']) assert(parity.includes(label),`Classic Documents görünür davranışı eksik: ${label}`);
for(const marker of ['data-classic-document-open','data-classic-document-download','data-classic-document-visibility','data-classic-document-delete']) assert(parity.includes(marker),`Classic Documents aksiyonu eksik: ${marker}`);
assert(parity.includes("arr('dokumanlarAcik')")&&parity.includes("arr('dokumanlarBenim')"),'Normal kullanıcı local-first açık/benim cache lerini kullanmalı.');
assert(parity.includes('global.DocumentsPdfTools'),'Classic toolbar canonical DocumentsPdfTools kullanmalı.');
assert(parity.includes('tools.PAGE_IMAGES')&&parity.includes('tools.PAGE_MERGE'),'Resimden PDF ve PDF Birleştir canonical sayfalara gitmeli.');
assert(!parity.includes('classic-document-tools.js'),'İkinci belge işleme motoru yüklenmemeli.');
assert(live.includes("loadScript?.('js/modules/classic-documents-parity.js')"),'Classic Documents yalnız dashboard sonrası lazy yüklenmeli.');
assert(sw.includes("'./js/modules/classic-documents-parity.js'"),'Classic Documents offline shell içinde olmalı.');
assert(!sw.includes('classic-document-tools.js'),'Silinen paralel belge motoru offline shell içinde olmamalı.');

// User-visible classic density and mobile stability stay locked.
for(const token of ['maximum-scale=1','user-scalable=no','pan-x pan-y','function compactMenu()','function compactTransport()','class="evrak-row"']) assert(parity.includes(token),`Klasik mobil görünüm/kararlılık davranışı eksik: ${token}`);
assert(parity.includes("inspection.hidden=true")&&parity.includes("monthly.hidden=true"),'Taşıma ana listesinde raporlar dev buton olarak kalmamalı; servis detayında kullanılmalı.');
assert(parity.includes("edit.textContent='✏️'")&&parity.includes("del.textContent='🗑'"),'Taşıma liste eylemleri eski kompakt ikon düzeninde olmalı.');
assert(parity.includes("target.style.visibility='hidden'")&&parity.includes('requestAnimationFrame(()=>requestAnimationFrame(reveal))'),'Sayfa geçişindeki ara render kullanıcıya gösterilmemeli.');

// One canonical image->PDF / PDF merge engine inside documents.js.
assert(documents.includes('if(global.DocumentsPdfTools)return'),'Tek DocumentsPdfTools capability olmalı.');
assert(documents.includes("const JSPDF_SRC='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'"),'Resimden PDF jsPDF lazy capability kullanmalı.');
assert(documents.includes("const PDFLIB_SRC='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'"),'PDF Birleştir pdf-lib lazy capability kullanmalı.');
for(const fn of ['function exifOrientation(file)','function perspectiveCanvas(img,corners)','function autoCorners(img)','function openEditor(i)']) assert(documents.includes(fn),`Canonical PDF motoru eksik: ${fn}`);
for(const label of ['Belge Modu','Gri Tonlama','Siyah-Beyaz Metin','Parlaklık','Kontrast','Gölge Giderme','Sıcaklık','Beyazlık','Metin Netliği','Netlik','Hareli (Moiré) Giderme','Gürültü Giderme','Otomatik Algıla','Köşeleri Sıfırla','Kırp','Döndür','Paylaş']) assert(documents.includes(label),`Canonical görsel aracı eksik: ${label}`);
assert(documents.includes('accept="image/*" multiple data-pdf-images'),'Çoklu görsel seçimi korunmalı.');
assert(documents.includes('accept="application/pdf,.pdf" multiple data-pdf-files'),'Çoklu PDF seçimi korunmalı.');
assert(documents.includes('await PDFDocument.load')&&documents.includes('out.copyPages(src,idx)'),'PDF birleştirme rasterize etmeden pdf-lib copyPages kullanmalı.');
assert(documents.includes('await global.uygulamaDosyaKaydet'),'İndir/Paylaş platform kaydetme köprüsünü kullanmalı.');
assert(documents.includes('await global.DokumanlarService.dokumanEkle'),'PDF arşivleme DokumanlarService üzerinden kalmalı.');
assert(documents.includes('global.DocumentsPdfTools={open,cleanup,renderImages,renderMerge,cleanPdfName,PAGE_IMAGES,PAGE_MERGE}'),'Tek public PDF tools API korunmalı.');

// Evrak tracking remains local-first with the real model.
assert(documents.includes("PermissionService?.can?.('documents.tracking','read')"),'Evrak görüntüleme merkezi yetkiyi kullanmalı.');
assert(documents.includes("PermissionService?.can?.('documents.tracking.edit','edit')"),'Evrak yazma merkezi yetkiyi kullanmalı.');
assert(documents.includes("device().add('evrak',COL.evrak")&&documents.includes("device().update('evrak',COL.evrak")&&documents.includes("device().remove('evrak',COL.evrak"),'Evrak CRUD DeviceData kapısında kalmalı.');
assert(documents.includes("SyncEngine.register('evrak',COL.evrak)")&&documents.includes("SyncEngine.localHydrate(['evrak'])"),'Evrak önce cihazdan hydrate edilmeli.');
assert(documents.includes("const TUR=['Gelen Evrak','Giden Evrak','İç Yazışma','Tutanak','Diğer']"),'Gerçek evrak türleri korunmalı.');
assert(documents.includes("const DURUM=['Beklemede','İşlemde','Tamamlandı','Arşivlendi']"),'Gerçek evrak durumları korunmalı.');
for(const field of ['evrakAdi','tur','tarih','durum','sorumluOgretmenIdler','dosyaLinki','aciklama']) assert(documents.includes(field),`Evrak alanı korunmalı: ${field}`);
assert(loader.includes("['documents.tracking','Evrak Takibi','section']")&&loader.includes("['documents.tracking.edit','Evrak Takibi düzenleme','action']"),'Evrak izinleri merkezi katalogda olmalı.');

console.log('Documents viewer + classic workspace + compact mobile parity + canonical PDF tools + Evrak local-first sözleşmesi başarılı.');