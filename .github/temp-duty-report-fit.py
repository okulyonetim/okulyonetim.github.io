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

# 1) Duty report: derive a compact/normal/roomy density from the actual month content.
path=Path('js/modules/management.js')
src=read(path)
anchor="function dutyReportDocumentDate(){return new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}\nfunction dutyReportLogoUrl()"
insert="""function dutyReportDocumentDate(){return new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}
function dutyReportDensity(days,assignments,chiefs){const names=[...(assignments||[]).map(x=>x?.ogretmenAdSoyad),...(chiefs||[]).map(x=>x?.ad)].map(x=>String(x||'').trim()).filter(Boolean),longest=names.reduce((n,v)=>Math.max(n,v.length),0),dayCount=Number(days)||31;if(dayCount>=31||longest>=24)return'dense';if(dayCount<=29&&longest<=19)return'roomy';return'normal'}
function dutyReportLogoUrl()"""
src=replace_once(src,anchor,insert,'density helper')
old="const phonesHtml=phones.length?`<section class=\"ka-duty-report-phones\"><strong>TELEFONLAR</strong>${phones.map(p=>`<span><b>${esc(String(p.ad).toLocaleUpperCase('tr'))}</b> ${esc(p.telefon||'—')}</span>`).join('')}</section>`:'',orientation=yon==='yatay'?'landscape':'portrait',body=`<section class=\"ka-duty-report ka-duty-report--${orientation}\">"
new="const monthAssignments=atamalar.filter(a=>String(a.tarih||'').startsWith(`${ys}-${ms}`)),monthChiefs=amirler.filter(a=>String(a.tarih||'').startsWith(`${ys}-${ms}`)),density=dutyReportDensity(gunSayisi,monthAssignments,monthChiefs),phonesHtml=phones.length?`<section class=\"ka-duty-report-phones\"><strong>TELEFONLAR</strong>${phones.map(p=>`<span><b>${esc(String(p.ad).toLocaleUpperCase('tr'))}</b> ${esc(p.telefon||'—')}</span>`).join('')}</section>`:'',orientation=yon==='yatay'?'landscape':'portrait',body=`<section class=\"ka-duty-report ka-duty-report--${orientation}\" data-duty-density=\"${density}\">"
src=replace_once(src,old,new,'report density attribute')
write(path,src)

# 2) Replace only the canonical duty-report CSS block. No additional stylesheet is created.
path=Path('css/design-system.css')
css=read(path)
start=css.index('/* Duty report — full A4 roster anatomy for portrait and landscape output. */')
end=css.index('/* Announcements page — canonical communication redesign. */',start)
new_block=r'''/* Duty report — adaptive full-page A4 roster. */
.ka-report .ka-duty-report{--ka-duty-head-font:5.95pt;--ka-duty-cell-font:5.7pt;--ka-duty-task-font:4.55pt;--ka-duty-footer-font:4.5pt;width:100%;color:#111;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;gap:0;background:#fff;overflow:hidden}
.ka-report .ka-duty-report--portrait{height:287mm;min-height:287mm}.ka-report .ka-duty-report--landscape{height:200mm;min-height:200mm;--ka-duty-head-font:5.45pt;--ka-duty-cell-font:5.25pt;--ka-duty-task-font:4.35pt;--ka-duty-footer-font:4.3pt}
.ka-report .ka-duty-report[data-duty-density="dense"]{--ka-duty-head-font:5.55pt;--ka-duty-cell-font:5.3pt;--ka-duty-task-font:4.3pt;--ka-duty-footer-font:4.25pt}.ka-report .ka-duty-report[data-duty-density="roomy"]{--ka-duty-head-font:6.2pt;--ka-duty-cell-font:5.95pt;--ka-duty-task-font:4.7pt;--ka-duty-footer-font:4.65pt}.ka-report .ka-duty-report--landscape[data-duty-density="dense"]{--ka-duty-head-font:5.2pt;--ka-duty-cell-font:5pt;--ka-duty-task-font:4.15pt;--ka-duty-footer-font:4.15pt}.ka-report .ka-duty-report--landscape[data-duty-density="roomy"]{--ka-duty-head-font:5.7pt;--ka-duty-cell-font:5.5pt;--ka-duty-task-font:4.5pt;--ka-duty-footer-font:4.45pt}
.ka-report .ka-duty-report-banner{position:relative;flex:0 0 auto;width:100%;min-height:13.5mm;margin:0 0 1.2mm;padding:1mm 0;display:flex;align-items:center;justify-content:center;border-bottom:1.2px solid #17684f;text-align:center}.ka-report .ka-duty-report-logo{position:absolute;left:0;top:50%;transform:translateY(-50%);width:10mm;height:10mm;object-fit:contain}.ka-report .ka-duty-report-banner h1{width:100%;margin:0!important;padding:0 1mm!important;color:#155c46!important;font-size:9.4pt!important;font-weight:850!important;line-height:1.06!important;letter-spacing:.005em!important;text-align:center!important}.ka-report .ka-duty-report--landscape .ka-duty-report-banner h1{font-size:10pt!important}
.ka-report .ka-duty-report-table{flex:1 1 0;align-self:stretch;width:100%!important;height:auto!important;min-height:0!important;table-layout:fixed!important;margin:0!important;border-collapse:collapse!important;border-spacing:0!important}.ka-report .ka-duty-report-table th{padding:.45mm .7mm!important;background:#173f60!important;border:1px solid #294f6b!important;color:#fff!important;font-size:var(--ka-duty-head-font)!important;line-height:1!important;font-weight:800!important;text-align:center!important;white-space:nowrap!important}.ka-report .ka-duty-report-table td{padding:.2mm .7mm!important;border:1px solid #aeb7bb!important;background:#fff!important;color:#111!important;font-size:var(--ka-duty-cell-font)!important;line-height:1!important;vertical-align:middle!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.ka-report .ka-duty-report-table tbody tr:nth-child(even) td{background:#f7f7f7!important}.ka-report .ka-duty-report-table td:first-child{text-align:left!important;font-weight:650!important}.ka-report .ka-duty-report-table tbody tr.ka-duty-report-weekend td{background:#e6e6e6!important;color:#666!important;font-weight:600!important}.ka-report .ka-duty-report-holiday td{background:#fff4cf!important;color:#6b5200!important;font-weight:800!important}.ka-report .ka-duty-report-holiday td:not(:first-child){text-align:center!important;letter-spacing:.01em!important}
.ka-report .ka-duty-report--portrait .ka-duty-report-col-date{width:22%}.ka-report .ka-duty-report--portrait .ka-duty-report-col-garden{width:20%}.ka-report .ka-duty-report--portrait .ka-duty-report-col-building{width:20%}.ka-report .ka-duty-report--portrait .ka-duty-report-col-entry{width:18%}.ka-report .ka-duty-report--portrait .ka-duty-report-col-chief{width:20%}.ka-report .ka-duty-report--landscape .ka-duty-report-col-date{width:18%}.ka-report .ka-duty-report--landscape .ka-duty-report-col-garden{width:20%}.ka-report .ka-duty-report--landscape .ka-duty-report-col-building{width:20%}.ka-report .ka-duty-report--landscape .ka-duty-report-col-entry{width:18%}.ka-report .ka-duty-report--landscape .ka-duty-report-col-chief{width:24%}
.ka-report .ka-duty-report-phones{flex:0 0 auto;display:flex;align-items:center;gap:3.2mm;flex-wrap:wrap;margin:.9mm 0 0;padding:.65mm 0;border-top:.45px solid #555;border-bottom:.45px solid #777;font-size:calc(var(--ka-duty-footer-font) + .15pt);line-height:1.05}.ka-report .ka-duty-report-phones>strong{font-size:calc(var(--ka-duty-footer-font) + .35pt)}.ka-report .ka-duty-report-phones span{white-space:nowrap}.ka-report .ka-duty-report-phones b{font-weight:800}
.ka-report .ka-duty-report-tasks{flex:0 0 auto;margin:1mm 0 0!important;padding:0!important;color:#111}.ka-report .ka-duty-report-tasks h2{margin:0 0 .55mm!important;color:#111!important;font-size:calc(var(--ka-duty-task-font) + 1.45pt)!important;line-height:1.04!important;font-weight:850!important}.ka-report .ka-duty-report-tasks ol{margin:0!important;padding-left:4mm!important;font-size:var(--ka-duty-task-font)!important;line-height:1.07!important}.ka-report .ka-duty-report-tasks li{margin:0!important;padding:0!important;color:#111!important;font-size:var(--ka-duty-task-font)!important;line-height:1.07!important}.ka-report .ka-duty-report--landscape .ka-duty-report-tasks ol{columns:2;column-gap:8mm}.ka-report .ka-duty-report--landscape .ka-duty-report-tasks li{break-inside:avoid;page-break-inside:avoid}
.ka-report .ka-duty-report-footer{flex:0 0 auto;margin-top:1mm;padding-top:.9mm;border-top:.45px solid #777;color:#111;font-size:var(--ka-duty-footer-font);line-height:1.08;display:grid;grid-template-columns:minmax(0,1fr) 35mm;gap:5mm;align-items:end}.ka-report .ka-duty-report-footer-copy p{margin:0 0 .45mm!important}.ka-report .ka-duty-report-signature{display:flex;flex-direction:column;align-items:center;text-align:center;line-height:1.06}.ka-report .ka-duty-report-signature strong{margin-top:.4mm;font-size:calc(var(--ka-duty-footer-font) + .35pt)}.ka-report .ka-duty-report-signature span{display:block}.ka-report .ka-duty-report--landscape .ka-duty-report-footer{grid-template-columns:minmax(0,1fr) 45mm}
@media print{.ka-report .ka-duty-report{break-inside:avoid;page-break-inside:avoid}.ka-report .ka-duty-report-table tr,.ka-report .ka-duty-report-tasks,.ka-report .ka-duty-report-footer{break-inside:avoid;page-break-inside:avoid}}
'''
css=css[:start]+new_block+'\n'+css[end:]
write(path,css)

# 3) Update the focused regression test for the requested adaptive layout.
path=Path('tests/duty-report-full-parity.test.js')
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
assert(css.includes('.ka-duty-report--portrait{height:287mm;min-height:287mm}')&&css.includes('.ka-duty-report--landscape{height:200mm;min-height:200mm}'),'Rapor her iki A4 yönünde kullanılabilir alanın tamamını doldurmalı.');
assert(css.includes('.ka-duty-report-table{flex:1 1 0')&&css.includes('height:auto!important'),'Çizelge sabit yükseklik yerine kalan A4 alanını otomatik doldurmalı.');
assert(!css.includes('.ka-duty-report--portrait .ka-duty-report-table{height:187mm}')&&!css.includes('.ka-duty-report--landscape .ka-duty-report-table{height:122mm}'),'Eski sabit tablo yüksekliği geri dönmemeli.');
assert(css.includes('.ka-duty-report-banner h1{width:100%')&&css.includes('font-size:9.4pt!important'),'Nöbet raporu başlığı daha büyük ve tam genişlik olmalı.');
assert(css.includes('font-size:var(--ka-duty-cell-font)!important')&&css.includes('[data-duty-density="dense"]')&&css.includes('[data-duty-density="roomy"]'),'Tablo ve alt veriler otomatik yoğunluk puntosunu kullanmalı.');
assert(css.includes('.ka-duty-report-table tbody tr.ka-duty-report-weekend td{background:#e6e6e6!important'),'Tüm hafta sonu hücreleri satır paritesinden bağımsız aynı dolgu renginde olmalı.');
assert(!css.includes('.ka-duty-report-footer{margin-top:auto')&&css.includes('.ka-duty-report-footer{flex:0 0 auto;margin-top:1mm'),'Alt onay alanı görevlerden sonra gelmeli; büyük yapay boşluk oluşturmamalı.');
assert(css.includes('columns:2'),'Yatay görevler iki sütuna sıkıştırılmalı.');
assert(report.includes("page=o.yon==='yatay'?'A4 landscape':'A4 portrait'")&&report.includes('@page{size:${page};margin:0}'),'Merkezi ReportEngine gerçek A4 portrait/landscape sayfa boyutunu korumalı.');
assert(src.includes('kenarBosluk:5'),'Nöbet raporu A4 yüzeyini küçük ve sabit kenar boşluğuyla kullanmalı.');
console.log('Adaptif tam A4 nöbet çizelgesi portrait/landscape sözleşmesi başarılı.');
'''
write(path,test)

# 4) Cache-bust only the files changed by this package.
path=Path('index.html')
index=read(path)
index=replace_once(index,'css/design-system.css?v=872','css/design-system.css?v=873','index css version')
index=replace_once(index,'js/app-loader.js?v=872','js/app-loader.js?v=873','index loader version')
write(path,index)

path=Path('js/app-loader.js')
loader=read(path)
loader=replace_once(loader,"'js/modules/management.js?v=871'","'js/modules/management.js?v=873'",'management module version')
write(path,loader)

path=Path('service-worker.js')
sw=read(path)
sw=replace_once(sw,"const CACHE_ADI='oy-cache-v872'","const CACHE_ADI='oy-cache-v873'",'sw cache version')
sw=replace_once(sw,"'./css/design-system.css?v=872'","'./css/design-system.css?v=873'",'sw css version')
sw=replace_once(sw,"'./js/app-loader.js?v=872'","'./js/app-loader.js?v=873'",'sw loader version')
sw=replace_once(sw,"'./js/modules/management.js?v=871'","'./js/modules/management.js?v=873'",'sw management version')
write(path,sw)

print('adaptive duty report patch prepared')
