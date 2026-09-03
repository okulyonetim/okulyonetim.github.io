from pathlib import Path

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)

# 1) Rebalance the existing canonical duty-report block: less empty row height,
#    substantially larger typography in title/cells/rules/principal area.
css_path=Path('css/design-system.css')
css=read(css_path)
start=css.index('/* Duty report — adaptive full-page A4 roster. */')
end=css.index('/* Announcements page — canonical communication redesign. */',start)
new_block=r'''/* Duty report — adaptive full-page A4 roster. */
.ka-report .ka-duty-report{--ka-duty-head-font:6.75pt;--ka-duty-cell-font:6.35pt;--ka-duty-task-font:5.9pt;--ka-duty-footer-font:5.7pt;--ka-duty-table-height:168mm;width:100%;color:#111;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;gap:0;background:#fff;overflow:hidden}
.ka-report .ka-duty-report--portrait{height:287mm;min-height:287mm}.ka-report .ka-duty-report--landscape{height:200mm;min-height:200mm;--ka-duty-head-font:6.15pt;--ka-duty-cell-font:5.8pt;--ka-duty-task-font:5.25pt;--ka-duty-footer-font:5.15pt;--ka-duty-table-height:118mm}
.ka-report .ka-duty-report[data-duty-density="dense"]{--ka-duty-head-font:6.4pt;--ka-duty-cell-font:6.05pt;--ka-duty-task-font:5.65pt;--ka-duty-footer-font:5.5pt;--ka-duty-table-height:171mm}.ka-report .ka-duty-report[data-duty-density="roomy"]{--ka-duty-head-font:7pt;--ka-duty-cell-font:6.65pt;--ka-duty-task-font:6.1pt;--ka-duty-footer-font:5.9pt;--ka-duty-table-height:164mm}.ka-report .ka-duty-report--landscape[data-duty-density="dense"]{--ka-duty-head-font:5.9pt;--ka-duty-cell-font:5.55pt;--ka-duty-task-font:5.05pt;--ka-duty-footer-font:4.95pt;--ka-duty-table-height:121mm}.ka-report .ka-duty-report--landscape[data-duty-density="roomy"]{--ka-duty-head-font:6.4pt;--ka-duty-cell-font:6.05pt;--ka-duty-task-font:5.45pt;--ka-duty-footer-font:5.3pt;--ka-duty-table-height:114mm}
.ka-report .ka-duty-report-banner{position:relative;flex:0 0 auto;width:100%;min-height:15mm;margin:0 0 1.2mm;padding:1mm 0;display:flex;align-items:center;justify-content:center;border-bottom:1.2px solid #17684f;text-align:center}.ka-report .ka-duty-report-logo{position:absolute;left:0;top:50%;transform:translateY(-50%);width:11mm;height:11mm;object-fit:contain}.ka-report .ka-duty-report-banner h1{width:100%;margin:0!important;padding:0 1mm!important;color:#155c46!important;font-size:12.4pt!important;font-weight:850!important;line-height:1.06!important;letter-spacing:.003em!important;text-align:center!important}.ka-report .ka-duty-report--landscape .ka-duty-report-banner h1{font-size:13pt!important}
.ka-report .ka-duty-report-table{flex:0 0 var(--ka-duty-table-height);align-self:stretch;width:100%!important;height:var(--ka-duty-table-height)!important;min-height:0!important;table-layout:fixed!important;margin:0!important;border-collapse:collapse!important;border-spacing:0!important}.ka-report .ka-duty-report-table th{padding:.55mm .75mm!important;background:#173f60!important;border:1px solid #294f6b!important;color:#fff!important;font-size:var(--ka-duty-head-font)!important;line-height:1.04!important;font-weight:800!important;text-align:center!important;white-space:nowrap!important}.ka-report .ka-duty-report-table td{padding:.35mm .75mm!important;border:1px solid #aeb7bb!important;background:#fff!important;color:#111!important;font-size:var(--ka-duty-cell-font)!important;line-height:1.06!important;vertical-align:middle!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.ka-report .ka-duty-report-table tbody tr:nth-child(even) td{background:#f7f7f7!important}.ka-report .ka-duty-report-table td:first-child{text-align:left!important;font-weight:650!important}.ka-report .ka-duty-report-table tbody tr.ka-duty-report-weekend td{background:#e6e6e6!important;color:#666!important;font-weight:600!important}.ka-report .ka-duty-report-holiday td{background:#fff4cf!important;color:#6b5200!important;font-weight:800!important}.ka-report .ka-duty-report-holiday td:not(:first-child){text-align:center!important;letter-spacing:.01em!important}
.ka-report .ka-duty-report--portrait .ka-duty-report-col-date{width:22%}.ka-report .ka-duty-report--portrait .ka-duty-report-col-garden{width:20%}.ka-report .ka-duty-report--portrait .ka-duty-report-col-building{width:20%}.ka-report .ka-duty-report--portrait .ka-duty-report-col-entry{width:18%}.ka-report .ka-duty-report--portrait .ka-duty-report-col-chief{width:20%}.ka-report .ka-duty-report--landscape .ka-duty-report-col-date{width:18%}.ka-report .ka-duty-report--landscape .ka-duty-report-col-garden{width:20%}.ka-report .ka-duty-report--landscape .ka-duty-report-col-building{width:20%}.ka-report .ka-duty-report--landscape .ka-duty-report-col-entry{width:18%}.ka-report .ka-duty-report--landscape .ka-duty-report-col-chief{width:24%}
.ka-report .ka-duty-report-phones{flex:0 0 auto;display:flex;align-items:center;gap:3.2mm;flex-wrap:wrap;margin:.8mm 0 0;padding:.7mm 0;border-top:.45px solid #555;border-bottom:.45px solid #777;font-size:calc(var(--ka-duty-footer-font) + .2pt);line-height:1.08}.ka-report .ka-duty-report-phones>strong{font-size:calc(var(--ka-duty-footer-font) + .55pt)}.ka-report .ka-duty-report-phones span{white-space:nowrap}.ka-report .ka-duty-report-phones b{font-weight:800}
.ka-report .ka-duty-report-tasks{flex:1 1 auto;min-height:0;margin:1mm 0 0!important;padding:0!important;color:#111;display:flex;flex-direction:column}.ka-report .ka-duty-report-tasks h2{flex:0 0 auto;margin:0 0 .8mm!important;color:#111!important;font-size:calc(var(--ka-duty-task-font) + 1.8pt)!important;line-height:1.05!important;font-weight:850!important}.ka-report .ka-duty-report-tasks ol{flex:1 1 auto;min-height:0;margin:0!important;padding-left:4.5mm!important;font-size:var(--ka-duty-task-font)!important;line-height:1.11!important;display:flex;flex-direction:column;justify-content:space-between}.ka-report .ka-duty-report-tasks li{margin:0!important;padding:0!important;color:#111!important;font-size:var(--ka-duty-task-font)!important;line-height:1.11!important}.ka-report .ka-duty-report--landscape .ka-duty-report-tasks ol{columns:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-flow:column;grid-template-rows:repeat(7,minmax(0,1fr));column-gap:8mm;row-gap:.35mm;align-content:stretch}.ka-report .ka-duty-report--landscape .ka-duty-report-tasks li{break-inside:avoid;page-break-inside:avoid}
.ka-report .ka-duty-report-footer{flex:0 0 auto;margin-top:.9mm;padding-top:1mm;border-top:.45px solid #777;color:#111;font-size:var(--ka-duty-footer-font);line-height:1.12;display:grid;grid-template-columns:minmax(0,1fr) 38mm;gap:5mm;align-items:end}.ka-report .ka-duty-report-footer-copy p{margin:0 0 .55mm!important}.ka-report .ka-duty-report-signature{display:flex;flex-direction:column;align-items:center;text-align:center;line-height:1.08}.ka-report .ka-duty-report-signature strong{margin-top:.45mm;font-size:calc(var(--ka-duty-footer-font) + 1.5pt);font-weight:850}.ka-report .ka-duty-report-signature span{display:block}.ka-report .ka-duty-report-signature span:last-child{margin-top:.2mm;font-size:calc(var(--ka-duty-footer-font) + .55pt);font-weight:700}.ka-report .ka-duty-report--landscape .ka-duty-report-footer{grid-template-columns:minmax(0,1fr) 46mm}
@media print{.ka-report .ka-duty-report{break-inside:avoid;page-break-inside:avoid}.ka-report .ka-duty-report-table tr,.ka-report .ka-duty-report-tasks,.ka-report .ka-duty-report-footer{break-inside:avoid;page-break-inside:avoid}}
'''
css=css[:start]+new_block+'\n'+css[end:]
write(css_path,css)

# 2) Update only the focused duty-report contract for the intentional layout rebalance.
test_path=Path('tests/duty-report-full-parity.test.js')
test=r'''const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/management.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const report=fs.readFileSync('js/modules/report-engine.js','utf8');
assert(src.includes('const DUTY_REPORT_COLUMNS=['),'Nöbet raporu sabit referans sütunlarını kullanmalı.');
for(const header of ['BAHÇE','OKUL BİNASI','GİRİŞ - BAHÇE','NÖBETÇİ AMİR']) assert(src.includes(header),`Nöbet raporu sütunu eksik: ${header}`);
for(const marker of ['ka-duty-report-banner','ka-duty-report-weekend','ka-duty-report-holiday','ka-duty-report-phones','ka-duty-report-tasks','ka-duty-report-footer','ka-duty-report-signature']) assert(src.includes(marker)||css.includes(marker),`Tam nöbet raporu anatomisi eksik: ${marker}`);
assert(src.includes('for(let g=1;g<=gunSayisi;g++)'),'Rapor ayın tüm günlerini üretmeli.');
assert(!src.includes('if(haftasonu||tatil)continue;'),'Hafta sonu ve tatil günleri rapordan atılmamalı.');
assert(src.includes('colspan="4"'),'Hafta sonu/tatil satırları üç nöbet alanı + amir sütununu kaplamalı.');
assert(src.includes('Geçerlilik Tarihi')&&src.includes('dutyReportFirstWorkday'),'Rapor geçerlilik tarihi seçimini korumalı.');
assert(src.includes('dutyReportDocumentDate()'),'İmza tarihi raporun oluşturulduğu tarihi kullanmalı.');
const taskBlock=src.slice(src.indexOf('const DUTY_TASKS=['),src.indexOf('];',src.indexOf('const DUTY_TASKS=['))+2);
assert((taskBlock.match(/^\s*'/gm)||[]).length===14,'Tam nöbet talimatı 14 maddeden oluşmalı.');
for(const text of ['Ders başlamadan 30 dk önce okula gelinmesi','Taşıma çizelgesinin her gün servis şoförlerine imzalatılması','Törenlerin yapılması için gerekli düzenin sağlanması','Gün sonunda nöbet defterinin ilgili bölümünün doldurulması']) assert(taskBlock.includes(text),`Nöbet görevi eksik: ${text}`);
assert(src.includes('ka-duty-report--${orientation}'),'Dikey/yatay rapor ayrı orientation sınıfı üretmeli.');
assert(src.includes('function dutyReportDensity(days,assignments,chiefs)')&&src.includes('data-duty-density="${density}"'),'Rapor ay gün sayısı ve isim uzunluğuna göre otomatik punto yoğunluğu seçmeli.');
assert(css.includes('.ka-duty-report--portrait{height:287mm;min-height:287mm}')&&css.includes('.ka-duty-report--landscape{height:200mm;min-height:200mm;'),'Rapor her iki A4 yönünde kullanılabilir alanın tamamını doldurmalı.');
assert(css.includes('--ka-duty-table-height:168mm')&&css.includes('.ka-duty-report-table{flex:0 0 var(--ka-duty-table-height)')&&css.includes('height:var(--ka-duty-table-height)!important'),'Çizelge satırları A4 boşluğunu tek başına şişirmemeli; yoğunluğa bağlı dengeli yükseklik kullanmalı.');
assert(css.includes('.ka-duty-report-banner h1{width:100%')&&css.includes('font-size:12.4pt!important'),'Nöbet raporu başlığı büyük ve tam genişlik olmalı.');
assert(css.includes('--ka-duty-cell-font:6.35pt')&&css.includes('[data-duty-density="dense"]{--ka-duty-head-font:6.4pt;--ka-duty-cell-font:6.05pt')&&css.includes('[data-duty-density="roomy"]{--ka-duty-head-font:7pt;--ka-duty-cell-font:6.65pt'),'Hücre puntoları yoğunluğa göre büyüyüp küçülmeli ve hücreyi okunur biçimde doldurmalı.');
assert(css.includes('.ka-duty-report-tasks{flex:1 1 auto')&&css.includes('justify-content:space-between')&&css.includes('--ka-duty-task-font:5.9pt'),'14 nöbet kuralı kalan alanı kullanmalı ve küçük yazı yerine daha büyük puntoyla yayılmalı.');
assert(css.includes('.ka-duty-report-signature strong{margin-top:.45mm;font-size:calc(var(--ka-duty-footer-font) + 1.5pt)')&&css.includes('.ka-duty-report-signature span:last-child'),'Okul Müdürü imza alanı görünür biçimde daha büyük olmalı.');
assert(css.includes('.ka-duty-report-table tbody tr.ka-duty-report-weekend td{background:#e6e6e6!important'),'Tüm hafta sonu hücreleri satır paritesinden bağımsız aynı dolgu renginde olmalı.');
assert(!css.includes('.ka-duty-report-footer{margin-top:auto'),'Alt onay alanı görevlerden sonra gelmeli; yapay alt boşluk üretmemeli.');
assert(report.includes("page=o.yon==='yatay'?'A4 landscape':'A4 portrait'")&&report.includes('@page{size:${page};margin:0}'),'Merkezi ReportEngine gerçek A4 portrait/landscape sayfa boyutunu korumalı.');
assert(src.includes('kenarBosluk:5'),'Nöbet raporu A4 yüzeyini küçük ve sabit kenar boşluğuyla kullanmalı.');
console.log('Okunaklı ve dengeli tam A4 nöbet çizelgesi sözleşmesi başarılı.');
'''
write(test_path,test)

# 3) Cache bust only the central stylesheet generation.
index_path=Path('index.html')
index=read(index_path)
index=replace_once(index,'css/design-system.css?v=873','css/design-system.css?v=874','index css cache')
write(index_path,index)

sw_path=Path('service-worker.js')
sw=read(sw_path)
sw=replace_once(sw,"const CACHE_ADI='oy-cache-v873';","const CACHE_ADI='oy-cache-v874';",'sw cache key')
sw=replace_once(sw,"'./css/design-system.css?v=873'","'./css/design-system.css?v=874'",'sw css cache')
write(sw_path,sw)

print('duty report typography refinement prepared')
