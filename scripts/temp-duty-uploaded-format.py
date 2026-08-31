from pathlib import Path

management_path = Path('js/modules/management.js')
src = management_path.read_text(encoding='utf-8')
start = src.find('const DUTY_TASKS=[')
end = src.find('\nfunction bindDuty()', start)
if start < 0 or end < 0:
    raise RuntimeError('Duty report block not found')

replacement = r'''const DUTY_TASKS=[
  'Ders başlamadan 30 dk önce okula gelinmesi ve ders bitiminden on beş dakika sonra okulun terk edilmesi',
  'Nöbete başladığında okul bölümlerinin gezilmesi ve nöbet defterinin sabah bölümünün doldurulması',
  'Olumsuz durumların nöbetçi müdür yardımcısına bildirilmesi',
  'Taşıma çizelgesinin servis şoförlerine imzalatılması',
  'Öğrencilerin güvenli çıkışının sağlanması',
  'Tören düzeninin sağlanması',
  'Boş geçen derslerin yönetime bildirilmesi',
  'Ders bitiminde okulun boşaltılması ve nöbet defterinin doldurulması'
];
const DUTY_REPORT_COLUMNS=[
  {label:'BAHÇE',aliases:['Bahçe']},
  {label:'OKUL BİNASI',aliases:['Okul Binası']},
  {label:'GİRİŞ - BAHÇE',aliases:['Giriş - Bahçe','Giriş-Bahçe']}
];
function dutyReportPlace(places,aliases){const wanted=new Set(aliases.map(norm));return places.find(p=>wanted.has(norm(p.ad||'')))||null}
function dutyReportShortDate(y,m,d){return new Date(y,m,d).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'})}
function dutyReportDocumentDate(y,m){return new Date(y,m+1,0).toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})}
function dutyReportLogoUrl(){try{return new URL('assets/icon-192.png',globalThis.location.href).href}catch(_){return'assets/icon-192.png'}}
function dutyReportModal(){const selected=`${dutyYear}-${String(dutyMonth+1).padStart(2,'0')}`,ov=modal('Nöbet Raporu',`<label class="ka-field"><span class="ka-field__label">Ay</span><input type="month" data-month value="${selected}"></label><label class="ka-field"><span class="ka-field__label">Sayfa yönü</span><select data-orientation><option value="dikey">Dikey A4</option><option value="yatay">Yatay A4</option></select></label>`,'Önizle');ov.querySelector('[data-save]').onclick=async()=>{await createDutyReport(ov.querySelector('[data-month]').value,ov.querySelector('[data-orientation]').value);ov.remove()}}
async function createDutyReport(month,yon){if(!globalThis.ReportEngine)await AppLoader.loadScript('js/modules/report-engine.js');const [ys,ms]=String(month).split('-'),y=Number(ys),m=Number(ms)-1;if(!y||m<0)return;const places=NobetService.yerSirali(arr('nobetYerleri')),atamalar=arr('nobetAtamalari'),amirler=arr('nobetciAmirleri'),tatiller=arr('resmiTatiller'),okulRows=arr('okulBilgileri'),okul=okulRows.find(x=>x.id==='ayarlar')||okulRows[0]||{},okulAdi=okul.okulAdi||okul.ad||'KORUK İLK - ORTAOKULU',okulBaslik=String(okulAdi).replace(/\s*[-–]\s*/g,' - ').replace(/\s+/g,' ').trim(),columns=DUTY_REPORT_COLUMNS.map(c=>({...c,place:dutyReportPlace(places,c.aliases)})),gunSayisi=new Date(y,m+1,0).getDate(),rows=[];for(let g=1;g<=gunSayisi;g++){const iso=NobetService.tarihISO(y,m,g),dt=new Date(y,m,g),haftasonu=dt.getDay()===0||dt.getDay()===6,tatil=tatiller.some(t=>t.tarih===iso);if(haftasonu||tatil)continue;const cells=columns.map(c=>{const a=c.place?atamalar.find(x=>x.tarih===iso&&x.yerId===c.place.id):null;return`<td>${esc(String(a?.ogretmenAdSoyad||'').toLocaleUpperCase('tr'))}</td>`}).join(''),amir=amirler.find(a=>a.tarih===iso);rows.push(`<tr><td>${esc(dutyReportShortDate(y,m,g))}</td>${cells}<td>${esc(String(amir?.ad||'').toLocaleUpperCase('tr'))}</td></tr>`)}const monthName=new Date(y,m,1).toLocaleDateString('tr-TR',{month:'long'}).toLocaleUpperCase('tr'),documentDate=dutyReportDocumentDate(y,m),orientation=yon==='yatay'?'landscape':'portrait',body=`<section class="ka-duty-report ka-duty-report--${orientation}"><header class="ka-duty-report-meta"><img class="ka-duty-report-logo" src="${esc(dutyReportLogoUrl())}" alt=""><div class="ka-duty-report-meta-copy"><strong>Öğretmen Nöbet Çizelgesi</strong><span>${esc(okulBaslik.toLocaleUpperCase('tr'))}</span><time>${esc(documentDate)}</time></div></header><section class="ka-duty-report-title"><h1>${esc(okulBaslik.toLocaleUpperCase('tr'))}</h1><p>${esc(monthName)} ${y} ÖĞRETMEN NÖBET ÇİZELGESİ</p></section><table class="ka-duty-report-table"><colgroup><col class="ka-duty-report-col-date"><col class="ka-duty-report-col-garden"><col class="ka-duty-report-col-building"><col class="ka-duty-report-col-entry"><col class="ka-duty-report-col-chief"></colgroup><thead><tr><th>Tarih</th>${columns.map(c=>`<th>${esc(c.label)}</th>`).join('')}<th>Nöbetçi Amir</th></tr></thead><tbody>${rows.join('')}</tbody></table><section class="ka-duty-report-tasks"><h2>NÖBETÇİ ÖĞRETMENİN GÖREVLERİ</h2><ol>${DUTY_TASKS.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section></section>`;return ReportEngine.printReport('Öğretmen Nöbet Çizelgesi',body,{fileName:`Nobet_Cizelgesi_${ys}_${ms}`,yon:yon==='yatay'?'yatay':'dikey',okulAdi,logoGoster:false,tarihGoster:false,baslikGoster:false,compact:false,fontSize:8.5,kenarBosluk:5})}'''

src = src[:start] + replacement + src[end:]
management_path.write_text(src, encoding='utf-8')

css_path = Path('css/design-system.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* Duty report — uploaded A4 reference anatomy, canonical ReportEngine output. */'
css_start = css.find(marker)
if css_start < 0:
    raise RuntimeError('Duty report CSS marker not found')

new_css = r'''/* Duty report — exact uploaded roster anatomy, canonical ReportEngine output. */
.ka-report .ka-duty-report{width:100%;color:#111;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;gap:0;background:#fff}
.ka-report .ka-duty-report--portrait{min-height:287mm}.ka-report .ka-duty-report--landscape{min-height:200mm}
.ka-report .ka-duty-report-meta{display:grid;grid-template-columns:10mm minmax(0,1fr);align-items:center;column-gap:2.5mm;padding:0 0 1.8mm;margin:0 0 2mm;border-bottom:1.15px solid #17684f}
.ka-report .ka-duty-report-logo{width:9mm;height:9mm;object-fit:contain}
.ka-report .ka-duty-report-meta-copy{display:flex;flex-direction:column;align-items:flex-start;min-width:0;line-height:1.1}.ka-report .ka-duty-report-meta-copy strong{color:#17684f!important;font-size:9.1pt!important;font-weight:800!important}.ka-report .ka-duty-report-meta-copy span{margin-top:.45mm;color:#263b34!important;font-size:5.9pt!important;font-weight:700!important}.ka-report .ka-duty-report-meta-copy time{margin-top:.35mm;color:#78827e!important;font-size:5.2pt!important}
.ka-report .ka-duty-report-title{margin:0 0 1.5mm}.ka-report .ka-duty-report-title h1{margin:0!important;color:#111!important;font-size:9.8pt!important;font-weight:800!important;line-height:1.08!important;text-align:center!important}.ka-report .ka-duty-report-title p{margin:.8mm 0 0!important;color:#111!important;font-size:6.8pt!important;font-weight:500!important;line-height:1.08!important;text-align:left!important}
.ka-report .ka-duty-report-table{width:100%!important;table-layout:fixed!important;margin:0!important;border-collapse:collapse!important}.ka-report .ka-duty-report-table th{height:5.4mm!important;padding:.55mm 1mm!important;background:#17684f!important;border:1px solid #397461!important;color:#fff!important;font-size:5.9pt!important;line-height:1.02!important;font-weight:800!important;text-align:center!important}.ka-report .ka-duty-report-table td{height:5.15mm!important;padding:.5mm 1.2mm!important;border:1px solid #c7cfcb!important;background:#fff!important;color:#202825!important;font-size:5.9pt!important;line-height:1.03!important;vertical-align:middle!important;text-align:left!important}.ka-report .ka-duty-report-table tbody tr:nth-child(even) td{background:#f8faf9!important}.ka-report .ka-duty-report-col-date{width:14%}.ka-report .ka-duty-report-col-garden{width:27%}.ka-report .ka-duty-report-col-building{width:27%}.ka-report .ka-duty-report-col-entry{width:18%}.ka-report .ka-duty-report-col-chief{width:14%}.ka-report .ka-duty-report-table td:first-child{text-align:left!important;white-space:nowrap!important}
.ka-report .ka-duty-report-tasks{margin:2.4mm 0 0!important;padding:0!important;color:#111}.ka-report .ka-duty-report-tasks h2{margin:0 0 1.4mm!important;color:#111!important;font-size:8.5pt!important;line-height:1.06!important;font-weight:850!important}.ka-report .ka-duty-report-tasks ol{margin:0!important;padding-left:6mm!important;font-size:6.3pt!important;line-height:1.32!important}.ka-report .ka-duty-report-tasks li{margin:0 0 .45mm!important;padding-left:.5mm!important;color:#111!important;font-size:6.3pt!important;line-height:1.32!important}
@media print{.ka-report .ka-duty-report-table tr,.ka-report .ka-duty-report-tasks{break-inside:avoid;page-break-inside:avoid}}
'''
css = css[:css_start] + new_css
css_path.write_text(css, encoding='utf-8')

Path('tests/duty-report-full-parity.test.js').write_text(r'''const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/management.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
assert(src.includes('class="ka-duty-grid"'),'Aylık nöbet listesi canonical tablo olmalı.');
assert(css.includes('.ka-duty-grid-wrap')&&css.includes('overflow-x:auto'),'Aylık nöbet tablosu mobilde yatay kaydırılabilir olmalı.');
assert(src.includes('const DUTY_REPORT_COLUMNS=['),'Rapor sabit referans sütun tanımlarını kullanmalı.');
for(const header of ['BAHÇE','OKUL BİNASI','GİRİŞ - BAHÇE','Nöbetçi Amir']) assert(src.includes(header),`Yüklenen çizelge sütunu eksik: ${header}`);
for(const marker of ['ka-duty-report-meta','ka-duty-report-title','ka-duty-report-table','ka-duty-report-tasks','ka-duty-report-col-date','ka-duty-report-col-garden','ka-duty-report-col-building','ka-duty-report-col-entry','ka-duty-report-col-chief']) assert(src.includes(marker)||css.includes(marker),`Yüklenen çizelge anatomisi eksik: ${marker}`);
assert(src.includes("if(haftasonu||tatil)continue;"),'Yüklenen rapor örneği gibi hafta sonu ve resmi tatil satırları basılmamalı.');
assert(!src.includes('ka-duty-report-weekend'),'Rapor hafta sonu özel satırı üretmemeli.');
assert(!src.includes('ka-duty-report-holiday'),'Rapor resmi tatil özel satırı üretmemeli.');
for(const removed of ['ka-duty-report-phones','ka-duty-report-footer','ka-duty-report-signature','Geçerlilik Tarihi']) assert(!src.includes(removed),`Referansta bulunmayan rapor bölümü kaldırılmalı: ${removed}`);
assert(src.includes('${esc(monthName)} ${y} ÖĞRETMEN NÖBET ÇİZELGESİ'),'Rapor başlığı AY YIL sırasını korumalı.');
assert(src.includes("toLocaleUpperCase('tr')"),'Rapor öğretmen adlarını büyük harf göstermeli.');
const taskBlock=src.slice(src.indexOf('const DUTY_TASKS=['),src.indexOf('];',src.indexOf('const DUTY_TASKS=['))+2);
assert((taskBlock.match(/^\s*'/gm)||[]).length===8,'Yüklenen referanstaki görev bölümü 8 maddeden oluşmalı.');
for(const text of ['Ders başlamadan 30 dk önce okula gelinmesi','Nöbete başladığında okul bölümlerinin gezilmesi','Taşıma çizelgesinin servis şoförlerine imzalatılması','Öğrencilerin güvenli çıkışının sağlanması','Tören düzeninin sağlanması','Boş geçen derslerin yönetime bildirilmesi']) assert(taskBlock.includes(text),`Referans görev maddesi eksik: ${text}`);
assert(css.includes('background:#17684f!important'),'Rapor sütun başlıkları yeşil dolgu kullanmalı.');
assert(css.includes('text-align:left!important'),'Ay/yıl rapor alt başlığı referanstaki gibi sola hizalanmalı.');
console.log('Yüklenen A4 öğretmen nöbet çizelgesi tam format parity sözleşmesi başarılı.');
''', encoding='utf-8')

sw_path = Path('service-worker.js')
sw = sw_path.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v820';" not in sw:
    raise RuntimeError('Unexpected SW cache version')
sw = sw.replace("const CACHE_ADI='oy-cache-v820';", "const CACHE_ADI='oy-cache-v821';")
sw_path.write_text(sw, encoding='utf-8')
