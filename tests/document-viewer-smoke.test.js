const fs = require('fs');
const assert = require('assert');

const viewer = fs.readFileSync('js/modules/document-viewer.js', 'utf8');
const proxy = fs.readFileSync('js/dokuman-okuyucu.js', 'utf8');
const documents = fs.readFileSync('js/modules/documents.js', 'utf8');

for (const ext of ['pdf','docx','doc','xlsx','xls','csv','txt','ppt','pptx']) assert(viewer.includes(`'${ext}'`), `${ext} görüntüleyici kapsamından çıkmamalı.`);
assert(viewer.includes('docx.renderAsync'), 'DOCX için docx-preview kullanılmalı.');
assert(viewer.includes('wordSigdir'), 'Word görüntüleyicide sayfaya sığdırma bulunmalı.');
assert(viewer.includes('st.style.transform=`scale(${wordZoom})`'), 'Word zoom yalnız belge sahnesine uygulanmalı.');
assert(viewer.includes("XLSX.read(buf,{type:'array'"), 'XLS için SheetJS uyumluluk yolu bulunmalı.');
assert(viewer.includes('new ExcelJS.Workbook()'), 'XLSX için ExcelJS yolu bulunmalı.');
assert(viewer.includes('pdfjsLib.getDocument'), 'PDF uygulama içinde PDF.js ile açılmalı.');
assert(viewer.includes('cMapUrl:'), 'PDF CMap desteği bulunmalı.');
assert(viewer.includes('standardFontDataUrl:'), 'PDF standard font veri yolu bulunmalı.');
assert(viewer.includes('useSystemFonts:true'), 'PDF sistem fontları etkin olmalı.');
assert(viewer.includes('disableFontFace:false'), 'PDF gömülü font yüzleri devre dışı bırakılmamalı.');
assert(!viewer.includes('view.officeapps.live.com'), 'Firebase belgeleri Office iframe görüntüleyicisine gönderilmemeli.');
assert(viewer.includes('pdfZoomUygula'), 'PDF görüntüleyicide zoom bulunmalı.');
assert(viewer.includes('pdfSigdir'), 'PDF genişliğe sığdırma bulunmalı.');
assert(viewer.includes('pdfTamSayfaSigdir'), 'PDF tam sayfaya sığdırma bulunmalı.');
assert(viewer.includes('id="dv3pdfFitPage"'), 'PDF araç çubuğunda Tam sayfa düğmesi bulunmalı.');
assert(viewer.includes('id="dv3pdfZoomLabel"'), 'PDF zoom yüzdesi gösterilmeli.');
assert(viewer.includes('id="dv3pdfPageInfo"'), 'PDF sayfa sayacı bulunmalı.');
assert(viewer.includes('.dv3pdfviewport{flex:1 1 auto;min-height:0;overflow:auto;width:100%'), 'PDF scroll yalnız viewport alanında olmalı.');
assert(viewer.includes('st.style.transform=`scale(${pdfZoom})`'), 'PDF zoom yalnız PDF sahnesine uygulanmalı.');
assert(viewer.includes('wrap.clientHeight-20'), 'Tam sayfa sığdırma görünür yüksekliği hesaba katmalı.');
assert(viewer.includes('wrap.scrollLeft=Math.max(0,nx*pdfZoom-wrap.clientWidth/2)'), 'PDF zoom görünür merkez odağını korumalı.');
assert(viewer.includes('merkezY=(wrap.scrollTop+wrap.clientHeight/2)'), 'PDF aktif sayfa hesabı viewport merkezine göre yapılmalı.');
assert(viewer.includes("page.dataset.page=String(i)"), 'PDF sayfaları numaralandırılmalı.');
assert(viewer.includes('gap:18px'), 'PDF sayfaları arasında görünür ayrım bulunmalı.');
assert(viewer.includes('excelZoomUygula'), 'Excel zoom fallback yolu korunmalı.');
assert(viewer.includes('excelSigdir'), 'Excel genişliğe sığdırma fallback yolu korunmalı.');
assert(viewer.includes("cellStyles:true"), 'SheetJS XLS stil metadata yolu açık olmalı.');
assert(viewer.includes('function pullToRefreshAyarla(enabled)'), 'Native pull-to-refresh kontrolü korunmalı.');
assert(viewer.includes("p.setEnabled({enabled:!!enabled})"), 'PullToRefreshPlugin setEnabled kullanılmalı.');

assert(proxy.includes("const SRC='js/modules/document-viewer.js'"), 'Root viewer yalnız V2 modül motoruna köprü olmalı.');
assert(proxy.includes('__moduleProxy:true'), 'Root compatibility API proxy olarak işaretlenmeli.');
assert(!proxy.includes('pdfjsLib.getDocument')&&!proxy.includes('new ExcelJS.Workbook()'), 'Ağır viewer motoru root dosyada kalmamalı.');
assert(documents.includes("s.src='js/dokuman-okuyucu.js'"), 'Geçiş boyunca Documents V2 root compatibility proxy yi kullanım anında lazy-load etmeli.');
assert(documents.includes("PermissionService?.can?.('documents.view','preview')"), 'Doküman açma merkezi documents.view yetkisine bağlı kalmalı.');
assert(documents.includes('data-document-open'), 'Documents listesi uygulama içi açma eylemini kullanmalı.');
assert(!documents.includes('js/xlsm-viewer-support.js'), 'Emekli XLSM yaması V2 zincirine geri dönmemeli.');

console.log('Belge görüntüleyici V2 module engine + compatibility proxy smoke testleri başarılı.');
