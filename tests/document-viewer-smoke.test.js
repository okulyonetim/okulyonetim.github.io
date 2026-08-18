const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('js/dokuman-okuyucu.js', 'utf8');

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

assert(src.includes('excelZoomUygula'), 'Excel zoom bulunmalı.');
assert(src.includes('excelSigdir'), 'Excel genişliğe sığdırma bulunmalı.');
assert(src.includes('id="dv3excelZoomLabel"'), 'Excel zoom yüzdesi gösterilmeli.');
assert(src.includes('.dv3sheetviewport{flex:1 1 auto;min-height:0;overflow:auto;width:100%'), 'Excel scroll yalnız tablo viewportunda olmalı.');
assert(src.includes('st.style.transform=`scale(${excelZoom})`'), 'Excel zoom yalnız çalışma sayfasına uygulanmalı.');
assert(src.includes('excelJsSayfaHtml'), 'XLSX metadata tabanlı özel HTML üretimi bulunmalı.');
assert(src.includes('ws.getColumn(c).width'), 'Excel sütun genişlikleri workbook metadata değerlerinden okunmalı.');
assert(src.includes('row.height'), 'Excel satır yüksekliği workbook metadata değerinden okunmalı.');
assert(src.includes("classList.toggle('active',j===i)"), 'Aktif çalışma sayfası sekmesi görsel olarak işaretlenmeli.');
assert(src.includes("cellStyles:true"), 'SheetJS XLS/XLSX stil metadata yolu açık olmalı.');
assert(src.includes('wrap.scrollLeft=Math.max(0,nx*excelZoom-wrap.clientWidth/2)'), 'Excel zoom görünür merkez odağını korumalı.');

assert(src.includes('function pullToRefreshAyarla(enabled)'), 'Native pull-to-refresh kontrolü korunmalı.');
assert(src.includes("p.setEnabled({enabled:!!enabled})"), 'PullToRefreshPlugin setEnabled kullanılmalı.');

console.log('Belge görüntüleyici PDF/Excel smoke testleri başarılı.');
