const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('js/dokuman-okuyucu.js', 'utf8');

for (const ext of ['pdf','docx','doc','xlsx','xls','csv','txt','ppt','pptx']) {
  assert(src.includes(`'${ext}'`), `${ext} görüntüleyici kapsamından çıkmamalı.`);
}

assert(src.includes('docx.renderAsync'), 'DOCX için docx-preview kullanılmalı.');
assert(src.includes('wordSigdir'), 'Word görüntüleyicide sayfaya sığdırma bulunmalı.');
assert(src.includes('dv3wordZoomLabel'), 'Word görüntüleyicide zoom göstergesi bulunmalı.');
assert(src.includes('wordZoomUygula'), 'Word görüntüleyicide yakınlaştırma/uzaklaştırma bulunmalı.');
assert(src.includes("st.style.transform=`scale(${wordZoom})`"), 'Word zoom yalnız belge sahnesine transform ile uygulanmalı.');
assert(!src.includes('st.style.zoom=wordZoom'), 'Word zoom CSS zoom kullanmamalı; üst uygulama katmanını büyütmemeli.');
assert(src.includes('uygunW/dogalW'), 'Word Sığdır hesabı gerçek belge genişliğine göre çalışmalı.');
assert(src.includes('gap:22px!important'), 'Word sayfaları arasında görünür sayfa ayrımı bulunmalı.');
assert(src.includes('align-items:flex-start!important'), 'Geniş Word sayfasının sol kenarı kesilmemeli.');
assert(src.includes('overflow:auto'), 'Zoom sonrası yatay/dikey kaydırma korunmalı.');
assert(src.includes('ignoreLastRenderedPageBreak:false'), 'DOCX sayfa kırımları korunmaya çalışılmalı.');
assert(src.includes("XLSX.read(buf,{type:'array'"), 'XLS için SheetJS uyumluluk yolu bulunmalı.');
assert(src.includes('new ExcelJS.Workbook()'), 'XLSX için ExcelJS yolu bulunmalı.');
assert(src.includes('pdfjsLib.getDocument'), 'PDF uygulama içinde PDF.js ile açılmalı.');
assert(src.includes("if(e==='doc')return docAc()"), 'DOC uzantısı içerik tespit yoluna gitmeli.');
assert(src.includes("if(zipMi(buf))return renderDocx(buf)"), 'Yanlış/çift uzantılı DOCX dosyası içerikten tespit edilmeli.');
assert(src.includes("if(e==='xls')return xlsAc()"), 'XLS uzantısı içerik tespit yoluna gitmeli.');
assert(src.includes("if(zipMi(buf))return xlsxAc(buf)"), 'Yanlış/çift uzantılı XLSX dosyası içerikten tespit edilmeli.');
assert(src.includes('cMapUrl:'), 'PDF CMap desteği bulunmalı.');
assert(src.includes('standardFontDataUrl:'), 'PDF standard font veri yolu bulunmalı.');
assert(src.includes('useSystemFonts:true'), 'PDF sistem fontları etkin olmalı.');
assert(!src.includes('view.officeapps.live.com'), 'Firebase Storage belgeleri Office iframe görüntüleyicisine gönderilmemeli.');
assert(src.includes('Otomatik indirme yapılmadı.'), 'Desteklenmeyen dosya otomatik indirmeye düşmemeli.');
assert(!src.includes("window.open(url, '_blank')"), 'Belge açma doğrudan _blank ile indirme/yeni sekmeye düşmemeli.');
assert(src.includes('id="dv3wordScene"'), 'Word için ölçülü belge sahnesi bulunmalı.');
assert(src.includes("scene.style.width=Math.ceil(dogalW*wordZoom)+'px'"), 'Word scroll genişliği gerçek zoomlu belge genişliğine eşitlenmeli.');
assert(src.includes("scene.style.height=Math.ceil(dogalH*wordZoom)+'px'"), 'Word scroll yüksekliği gerçek zoomlu belge yüksekliğine eşitlenmeli.');
assert(src.includes("wrap.style.width='100%'"), 'Word viewport sonsuz yatay genişliğe dönüşmemeli.');
assert(src.includes('color:#fff!important'), 'Koyu temada belge adı yüksek kontrastlı olmalı.');
assert(src.includes("A.body.classList.add('dv3wordbody')"), 'Word alanı siyah boşluk yerine belge zemini kullanmalı.');
assert(src.includes('.dv3body.dv3wordbody{background:#cfd3d7;overflow:hidden;display:flex'), 'Word zoom tüm görüntüleyici gövdesini yatay büyütmemeli.');
assert(src.includes('.dv3wordviewport{flex:1 1 auto;min-height:0;padding:10px;overflow:auto'), 'Word yatay/dikey kaydırma yalnız belge viewportunda olmalı.');
assert(src.includes('const uygunW=Math.max(1,wrap.clientWidth-20)'), 'Word Sığdır gerçek belge viewport genişliğini kullanmalı.');
assert(src.includes('Math.max(0.15,Math.min(1,uygunW/dogalW))'), 'Geniş Word sayfaları %35 alt sınırı nedeniyle sağdan kesilmemeli.');
assert(src.includes("wrap.scrollTo({left:0,top:0"), 'Sığdır sonrası yalnız Word viewportu başa dönmeli.');
assert(src.includes('id=\"dv3wordPageInfo\"'), 'Word sayfa sayacı bulunmalı.');


assert(src.includes('pdfZoomUygula'), 'PDF görüntüleyicide yakınlaştırma/uzaklaştırma bulunmalı.');
assert(src.includes('pdfSigdir'), 'PDF görüntüleyicide Sığdır bulunmalı.');
assert(src.includes('id="dv3pdfPageInfo"'), 'PDF sayfa sayacı bulunmalı.');
assert(src.includes('.dv3pdfviewport{flex:1 1 auto;min-height:0;overflow:auto'), 'PDF kaydırma yalnız belge viewportunda olmalı.');
assert(src.includes('st.style.transform=`scale(${pdfZoom})`'), 'PDF zoom yalnız belge sahnesine uygulanmalı.');
assert(src.includes('cMapUrl:'), 'PDF Türkçe karakter/CMap desteği korunmalı.');
assert(src.includes('standardFontDataUrl:'), 'PDF standard font desteği korunmalı.');


assert(src.includes('excelZoomUygula'), 'Excel görüntüleyicide yakınlaştırma/uzaklaştırma bulunmalı.');
assert(src.includes('excelSigdir'), 'Excel görüntüleyicide Sığdır bulunmalı.');
assert(src.includes('id="dv3excelZoomLabel"'), 'Excel zoom yüzdesi gösterilmeli.');
assert(src.includes('.dv3sheetviewport{flex:1 1 auto;min-height:0;overflow:auto'), 'Excel kaydırma yalnız tablo viewportunda olmalı.');
assert(src.includes('st.style.transform=`scale(${excelZoom})`'), 'Excel zoom yalnız çalışma sayfasına uygulanmalı.');
assert(src.includes('const uygun=Math.max(1,wrap.clientWidth-20)'), 'Excel Sığdır gerçek viewport genişliğini kullanmalı.');


assert(src.includes('function pullToRefreshAyarla(enabled)'), 'Belge görüntüleyici native pull-to-refresh kontrolüne sahip olmalı.');
assert(src.includes("p.setEnabled({enabled:!!enabled})"), 'PullToRefreshPlugin setEnabled kullanılmalı.');
assert(src.includes("govde.addEventListener('touchstart',kapat"), 'Belge gövdesine dokununca pull-to-refresh kapanmalı.');
assert(src.includes("govde.addEventListener('touchend',ac"), 'Belge dokunması bitince pull-to-refresh geri açılmalı.');
assert(src.includes("ust.addEventListener('touchstart',ac"), 'Üst başlık alanında pull-to-refresh açık kalmalı.');
assert(src.includes('function close(){pullToRefreshAyarla(true);'), 'Belge kapanınca pull-to-refresh mutlaka geri açılmalı.');

console.log('Belge görüntüleyici smoke testleri başarılı.');
