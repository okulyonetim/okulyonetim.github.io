const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('js/dokuman-okuyucu.js', 'utf8');
const rich = fs.readFileSync('js/xlsm-viewer-support.js', 'utf8');
const nav = fs.readFileSync('js/nav-accordion.js', 'utf8');

for (const ext of ['pdf','docx','doc','xlsx','xls','csv','txt','ppt','pptx']) assert(src.includes(`'${ext}'`), `${ext} görüntüleyici kapsamından çıkmamalı.`);
assert(src.includes('docx.renderAsync'), 'DOCX için docx-preview kullanılmalı.');
assert(src.includes('wordSigdir'), 'Word görüntüleyicide sayfaya sığdırma bulunmalı.');
assert(src.includes('st.style.transform=`scale(${wordZoom})`'), 'Word zoom yalnız belge sahnesine uygulanmalı.');
assert(src.includes("XLSX.read(buf,{type:'array'"), 'XLS için SheetJS uyumluluk yolu bulunmalı.');
assert(src.includes('new ExcelJS.Workbook()'), 'XLSX için ExcelJS yolu bulunmalı.');
assert(src.includes('pdfjsLib.getDocument'), 'PDF uygulama içinde PDF.js ile açılmalı.');
assert(src.includes('cMapUrl:'), 'PDF CMap desteği bulunmalı.');
assert(src.includes('standardFontDataUrl:'), 'PDF standard font veri yolu bulunmalı.');
assert(src.includes('useSystemFonts:true'), 'PDF sistem fontları etkin olmalı.');
assert(src.includes('disableFontFace:false'), 'PDF gömülü font yüzleri devre dışı bırakılmamalı.');
assert(!src.includes('view.officeapps.live.com'), 'Firebase belgeleri Office iframe görüntüleyicisine gönderilmemeli.');

assert(src.includes('pdfZoomUygula'), 'PDF görüntüleyicide zoom bulunmalı.');
assert(src.includes('pdfSigdir'), 'PDF genişliğe sığdırma bulunmalı.');
assert(src.includes('pdfTamSayfaSigdir'), 'PDF tam sayfaya sığdırma bulunmalı.');
assert(src.includes('id="dv3pdfFitPage"'), 'PDF araç çubuğunda Tam sayfa düğmesi bulunmalı.');
assert(src.includes('id="dv3pdfZoomLabel"'), 'PDF zoom yüzdesi gösterilmeli.');
assert(src.includes('id="dv3pdfPageInfo"'), 'PDF sayfa sayacı bulunmalı.');
assert(src.includes('.dv3pdfviewport{flex:1 1 auto;min-height:0;overflow:auto;width:100%'), 'PDF scroll yalnız viewport alanında olmalı.');
assert(src.includes('st.style.transform=`scale(${pdfZoom})`'), 'PDF zoom yalnız PDF sahnesine uygulanmalı.');
assert(src.includes('wrap.clientHeight-20'), 'Tam sayfa sığdırma görünür yüksekliği hesaba katmalı.');
assert(src.includes('wrap.scrollLeft=Math.max(0,nx*pdfZoom-wrap.clientWidth/2)'), 'PDF zoom görünür merkez odağını korumalı.');
assert(src.includes('merkezY=(wrap.scrollTop+wrap.clientHeight/2)'), 'PDF aktif sayfa hesabı viewport merkezine göre yapılmalı.');
assert(src.includes("page.dataset.page=String(i)"), 'PDF sayfaları numaralandırılmalı.');
assert(src.includes('gap:18px'), 'PDF sayfaları arasında görünür ayrım bulunmalı.');

assert(src.includes('excelZoomUygula'), 'Eski Excel zoom fallback yolu korunmalı.');
assert(src.includes('excelSigdir'), 'Eski Excel genişliğe sığdırma fallback yolu korunmalı.');
assert(src.includes("cellStyles:true"), 'SheetJS XLS stil metadata yolu açık olmalı.');

assert(nav.includes("s.src='js/xlsm-viewer-support.js'"), 'Zengin Excel/XLSM katmanı uygulama başlangıcında yüklenmeli.');
assert(rich.includes("['xlsx','xlsm']"), 'XLSX ve XLSM zengin Excel görüntüleyiciye yönlendirilmeli.');
assert(rich.includes("tur==='xlsm'?'XLSM · Makrolar çalıştırılmaz'"), 'XLSM makrolarının çalıştırılmadığı kullanıcıya açıkça belirtilmeli.');
assert(rich.includes('new ExcelJS.Workbook()'), 'Zengin Excel görüntüleyici ExcelJS kullanmalı.');
assert(rich.includes('(ws.model&&ws.model.merges)||[]'), 'Birleştirilmiş hücreler workbook metadata üzerinden korunmalı.');
assert(rich.includes('rowspan'), 'Dikey birleşik hücreler rowspan ile korunmalı.');
assert(rich.includes('colspan'), 'Yatay birleşik hücreler colspan ile korunmalı.');
assert(rich.includes('fillCss(c.fill)'), 'Hücre dolgu rengi HTML/CSS çıktısına taşınmalı.');
assert(rich.includes('fontCss(c.font)'), 'Yazı tipi/kalınlık/renk HTML/CSS çıktısına taşınmalı.');
assert(rich.includes('alignCss(c.alignment)'), 'Hücre hizalama ve wrap ayarları korunmalı.');
assert(rich.includes('borderCss(c.border)'), 'Excel kenarlıkları korunmalı.');
assert(rich.includes('ws.getColumn(c)'), 'Sütun genişlikleri Excel metadata değerlerinden alınmalı.');
assert(rich.includes('row.height'), 'Satır yüksekliği Excel metadata değerinden alınmalı.');
assert(rich.includes('Array.isArray(v.richText)'), 'Zengin metin parçaları ayrı font stilleriyle gösterilmeli.');
assert(rich.includes('position:sticky'), 'Satır/sütun başlıkları kaydırmada sabit kalmalı.');
assert(rich.includes('Genişliğe sığdır'), 'Zengin Excel görüntüleyicide genişliğe sığdır bulunmalı.');
assert(rich.includes('zoomla(zoom-.15)'), 'Zengin Excel görüntüleyicide bağımsız zoom bulunmalı.');

assert(src.includes('function pullToRefreshAyarla(enabled)'), 'Native pull-to-refresh kontrolü korunmalı.');
assert(src.includes("p.setEnabled({enabled:!!enabled})"), 'PullToRefreshPlugin setEnabled kullanılmalı.');

console.log('Belge görüntüleyici PDF/Excel/XLSM biçimlendirme smoke testleri başarılı.');
