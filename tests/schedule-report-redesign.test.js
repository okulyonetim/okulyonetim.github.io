const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/core/schedule-report-redesign.js','utf8');
const init=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

new Function(src);

assert(src.includes("Tekli — Yatay A4"),'Tekli sınıf/öğretmen raporu yatay A4 seçeneğini göstermeli.');
assert(src.includes("İkili — Dikey A4 / sayfa başına 2"),'İkili sınıf/öğretmen raporu dikey A4 seçeneğini göstermeli.');
assert(src.includes('ka-sr-pair-page')&&src.includes('ka-sr-half'),'İkili rapor A4 sayfasını iki bağımsız bölüme ayırmalı.');
assert(src.includes("content:'KESİM'"),'İkili raporda ortadan kesme işareti bulunmalı.');
assert(src.includes('assets/logo.png')&&src.includes('ka-sr-head-spacer'),'Logo solda kalırken başlık ortalanmalı.');

assert(src.includes("'ÖĞRETMEN ÇARŞAF DERS PROGRAMI'"),'Öğretmen çarşaf başlığı istenen büyük harf biçiminde olmalı.');
assert(src.includes("'SINIFLAR ÇARŞAF DERS PROGRAMI'"),'Sınıf çarşaf başlığı istenen büyük harf biçiminde olmalı.');
assert(src.includes('displaySchool(meta)')&&src.includes("replace(/\\s*-\\s*/g,'-')"),'Okul adı büyük harf ve birleşik tire düzenine çevrilmeli.');
assert(src.includes('text-align:center')&&src.includes('font-weight:800'),'Okul/yıl/rapor başlık bloğu ortalı ve kalın olmalı.');
assert(src.includes("toLocaleUpperCase('tr-TR')"),'Başlıklar Türkçe büyük harfe güvenli çevrilmeli.');

assert(src.includes('function teacherBranch('),'Tek öğretmen raporu öğretmenin branşını okuyabilmeli.');
assert(src.includes('teacherBranch(key)'),'Tek öğretmen başlığında branş bilgisi kullanılmalı.');
assert(src.includes('(${esc(upper(detail))})'),'Branş ad-soyad başlığının altında parantez içinde gösterilmeli.');
assert(!/sheetTeachers[\s\S]*teacherBranch\(o\.id\)/.test(src),'Öğretmen çarşafındaki ad-soyad sütununa branş eklenmemeli.');

assert(src.includes("const dayClass=i=>i%2===0?'ka-sr-day-a':'ka-sr-day-b'"),'Gün bazlı zebra sınıfları üretilmeli.');
assert(src.includes('.ka-sr-day-a{background:#f4f8f6!important}')&&src.includes('.ka-sr-day-b{background:#fff!important}'),'Gün zebra dolguları toner dostu çok açık/beyaz olmalı.');
assert(src.includes('DAYS.map((d,i)=>')&&src.includes('class="${dayClass(i)}"'),'Haftalık ve çarşaf tablolarında zebra gün sınıfları hücrelere uygulanmalı.');
assert(src.includes('print-color-adjust:economy'),'Siyah-beyaz baskıda ekonomik renk işleme istenmeli.');

assert(src.includes('.ka-sr-sheet tbody tr{height:8mm}'),'Tüm öğretmen/sınıf çarşaf satırları eşit ve standart 8 mm olmalı.');
assert(src.includes('.ka-sr-single-page .ka-sr-weekly tbody tr{height:15mm}'),'Tekli program satırları aşırı büyütülmeden standart 15 mm olmalı.');
assert(src.includes('.ka-sr-half .ka-sr-weekly tbody tr{height:10.5mm}'),'İkili programların yarım sayfa satırları standart yüksekliğe sahip olmalı.');
assert(src.includes('.ka-sr-sheet{table-layout:fixed;height:auto!important}'),'Çarşaf tablo sayfayı zorla doldurmamalı.');
assert(!src.includes('.ka-sr-sheet{table-layout:fixed;height:100%!important}'),'Çarşaf satırları sayfa dolsun diye gereksiz esnetilmemeli.');

assert(src.includes('value="Okul Müdürü" readonly'),'Müdür unvanı Okul Müdürü olarak sabitlenmeli.');
assert(src.includes('<span>Okul Müdürü</span>'),'İmza/onay alanında unvan Okul Müdürü yazmalı.');
assert(src.includes('data-schedule-report-teacher-list] input:checked'),'Mevcut öğretmen checkbox seçimi korunmalı.');
assert(src.includes('İmza bölümü ekle')&&src.includes('class="sign"'),'Öğretmen çarşafı isteğe bağlı imza sütunu sunmalı.');
assert(src.includes('Geçerlilik tarihi')&&src.includes('tarihinden itibaren geçerlidir.'),'Seçilebilir geçerlilik tarihi ve alt açıklama olmalı.');

assert(init.includes('schedule-report-redesign.js?v=920'),'Güncel rapor runtime dosyası uygulama başlangıcında yüklenmeli.');
assert(sw.includes("'./js/core/schedule-report-redesign.js?v=920'"),'Güncel rapor runtime dosyası offline precache içinde olmalı.');
const cache=sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/);assert(cache&&Number(cache[1])>=920,'Service Worker cache sürümü rapor başlık/zebra güncellemesi için yükseltilmeli.');

console.log('Ders programı rapor başlık, zebra ve standart satır sözleşmesi başarılı.');