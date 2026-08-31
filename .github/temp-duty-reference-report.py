from pathlib import Path
import re

mgmt_path=Path('js/modules/management.js')
css_path=Path('css/design-system.css')
test_path=Path('tests/duty-report-full-parity.test.js')
classic_test_path=Path('tests/classic-duty-v2-smoke.test.js')
sw_path=Path('service-worker.js')

mgmt=mgmt_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')

new_tasks=r'''const DUTY_TASKS=[
  'Ders başlamadan 30 dk önce okula gelinmesi ve ders bitiminden on beş dakika sonra okulun terk edilmesi',
  'Nöbete başladığında okul bölümlerinin gezilmesi ve nöbet defterinin sabah bölümünün doldurulması',
  'Olumsuz durumların nöbetçi müdür yardımcısına bildirilmesi',
  'Taşıma çizelgesinin servis şoförlerine imzalatılması',
  'Öğrencilerin güvenli çıkışının sağlanması',
  'Tören düzeninin sağlanması',
  'Boş geçen derslerin yönetime bildirilmesi',
  'Ders bitiminde okulun boşaltılması ve nöbet defterinin doldurulması'
];'''
mgmt,n=re.subn(r"const DUTY_TASKS=\[.*?\n\];",new_tasks,mgmt,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'DUTY_TASKS replacement count={n}')

new_report=r'''function dutyReportShortDate(y,m,d){return new Date(y,m,d).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'})}
function dutyReportDocumentDate(y,m){const d=new Date(y,m+1,0);return d.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})}
function dutyReportLogoUrl(){try{return new URL('assets/logo.png',globalThis.location.href).href}catch(_){return'assets/logo.png'}}
function dutyReportPreferredPlaces(list){const key=v=>String(v||'').toLocaleUpperCase('tr').replace(/\s*[-–]\s*/g,' - ').replace(/\s+/g,' ').trim(),priority=new Map([['BAHÇE',0],['OKUL BİNASI',1],['GİRİŞ - BAHÇE',2]]);return[...(list||[])].sort((a,b)=>{const ak=key(a?.ad),bk=key(b?.ad),ap=priority.has(ak)?priority.get(ak):100+Number(a?.sira||0),bp=priority.has(bk)?priority.get(bk):100+Number(b?.sira||0);return ap-bp||Number(a?.sira||0)-Number(b?.sira||0)||ak.localeCompare(bk,'tr')})}
function dutyReportModal(){const selected=`${dutyYear}-${String(dutyMonth+1).padStart(2,'0')}`,ov=modal('Nöbet Raporu',`<label class="ka-field"><span class="ka-field__label">Ay</span><input type="month" data-month value="${selected}"></label><label class="ka-field"><span class="ka-field__label">Sayfa yönü</span><select data-orientation><option value="dikey">Dikey A4</option><option value="yatay">Yatay A4</option></select></label>`,'Önizle');ov.querySelector('[data-save]').onclick=async()=>{await createDutyReport(ov.querySelector('[data-month]').value,ov.querySelector('[data-orientation]').value);ov.remove()}}
async function createDutyReport(month,yon){if(!globalThis.ReportEngine)await AppLoader.loadScript('js/modules/report-engine.js');const [ys,ms]=String(month).split('-'),y=Number(ys),m=Number(ms)-1;if(!y||m<0)return;const yerler=dutyReportPreferredPlaces(NobetService.yerSirali(arr('nobetYerleri'))),atamalar=arr('nobetAtamalari'),amirler=arr('nobetciAmirleri'),tatiller=arr('resmiTatiller'),okulRows=arr('okulBilgileri'),okul=okulRows.find(x=>x.id==='ayarlar')||okulRows[0]||{},okulAdi=okul.okulAdi||okul.ad||'KORUK İLK - ORTAOKULU',okulBaslik=String(okulAdi).replace(/\s*[-–]\s*/g,' - ').replace(/\s+/g,' ').trim(),gunSayisi=new Date(y,m+1,0).getDate(),rows=[];if(!yerler.length){toast?.('Önce nöbet yeri tanımlayın.');return}for(let g=1;g<=gunSayisi;g++){const iso=NobetService.tarihISO(y,m,g),dt=new Date(y,m,g),haftasonu=dt.getDay()===0||dt.getDay()===6,tatil=tatiller.find(t=>t.tarih===iso),tarihMetin=dutyReportShortDate(y,m,g);if(tatil){const aciklama=String(tatil.aciklama||tatil.ad||tatil.adi||'RESMİ TATİL').trim().toLocaleUpperCase('tr');rows.push(`<tr class="ka-duty-report-holiday"><td>${esc(tarihMetin)}</td><td colspan="${yerler.length+1}"><strong>${esc(aciklama)}</strong></td></tr>`);continue}if(haftasonu){rows.push(`<tr class="ka-duty-report-weekend"><td>${esc(tarihMetin)}</td><td colspan="${yerler.length+1}"><strong>HAFTA SONU</strong></td></tr>`);continue}const cells=yerler.map(yer=>`<td>${esc(atamalar.find(x=>x.tarih===iso&&x.yerId===yer.id)?.ogretmenAdSoyad||'')}</td>`).join(''),amir=amirler.find(a=>a.tarih===iso);rows.push(`<tr><td>${esc(tarihMetin)}</td>${cells}<td>${esc(amir?.ad||'')}</td></tr>`)}const headers=yerler.map(x=>`<th>${esc(String(x.ad||'Nöbet Yeri').toLocaleUpperCase('tr'))}</th>`).join(''),monthName=new Date(y,m,1).toLocaleDateString('tr-TR',{month:'long'}).toLocaleUpperCase('tr'),documentDate=dutyReportDocumentDate(y,m),orientation=yon==='yatay'?'landscape':'portrait',body=`<section class="ka-duty-report ka-duty-report--${orientation}"><header class="ka-duty-report-meta"><img class="ka-duty-report-logo" src="${esc(dutyReportLogoUrl())}" alt=""><div class="ka-duty-report-meta-copy"><strong>Öğretmen Nöbet Çizelgesi</strong><span>${esc(okulBaslik.toLocaleUpperCase('tr'))}</span><time>${esc(documentDate)}</time></div></header><section class="ka-duty-report-title"><h1>${esc(okulBaslik.toLocaleUpperCase('tr'))}</h1><p>${esc(monthName)} ${y} ÖĞRETMEN NÖBET ÇİZELGESİ</p></section><table class="ka-duty-report-table"><thead><tr><th>Tarih</th>${headers}<th>Nöbetçi Amir</th></tr></thead><tbody>${rows.join('')}</tbody></table><section class="ka-duty-report-tasks"><h2>NÖBETÇİ ÖĞRETMENİN GÖREVLERİ</h2><ol>${DUTY_TASKS.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section></section>`;return ReportEngine.printReport('Öğretmen Nöbet Çizelgesi',body,{fileName:`Nobet_Cizelgesi_${ys}_${ms}`,yon:yon==='yatay'?'yatay':'dikey',okulAdi,logoGoster:false,tarihGoster:false,baslikGoster:false,compact:false,fontSize:8.5,kenarBosluk:5})}'''
mgmt,n=re.subn(r"function dutyReportFirstWorkday\(.*?(?=\nfunction bindDuty\()",new_report,mgmt,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'duty report block replacement count={n}')
mgmt_path.write_text(mgmt,encoding='utf-8')

old_state=r"\.ka-duty-grid__state\{color:var\(--ka-warning\);background:color-mix\(in srgb,var\(--ka-warning\) 8%,var\(--ka-card-bg\)\)!important;text-align:center;font-weight:850\}\.ka-duty-grid__holiday \.ka-duty-grid__state\{color:var\(--ka-primary\);background:var\(--ka-primary-soft\)!important\}"
new_state='.ka-duty-grid__state{text-align:center;font-weight:850}.ka-duty-grid__weekend>*{background:color-mix(in srgb,var(--ka-text-muted) 7%,var(--ka-card-bg))!important}.ka-duty-grid__weekend .ka-duty-grid__state{color:var(--ka-text-muted)!important;background:color-mix(in srgb,var(--ka-text-muted) 10%,var(--ka-card-bg))!important}.ka-duty-grid__holiday>*{background:color-mix(in srgb,var(--ka-warning) 9%,var(--ka-card-bg))!important}.ka-duty-grid__holiday .ka-duty-grid__state{color:var(--ka-warning)!important;background:color-mix(in srgb,var(--ka-warning) 14%,var(--ka-card-bg))!important}'
css,n=re.subn(old_state,new_state,css,count=1)
if n!=1:
    raise SystemExit(f'duty screen state css replacement count={n}')

marker='/* Duty report — full historical roster anatomy, canonical ReportEngine output. */'
idx=css.find(marker)
if idx<0:
    raise SystemExit('duty report css marker not found')
new_css=r'''/* Duty report — uploaded A4 reference anatomy, canonical ReportEngine output. */
.ka-report .ka-duty-report{width:100%;color:#111;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;gap:0;background:#fff}
.ka-report .ka-duty-report--portrait{min-height:287mm}.ka-report .ka-duty-report--landscape{min-height:200mm}
.ka-report .ka-duty-report-meta{display:grid;grid-template-columns:11mm minmax(0,1fr);align-items:center;column-gap:3mm;padding:0 0 2.2mm;margin:0 0 2.3mm;border-bottom:1.15px solid #17684f}
.ka-report .ka-duty-report-logo{width:10mm;height:10mm;object-fit:contain}
.ka-report .ka-duty-report-meta-copy{display:flex;flex-direction:column;align-items:flex-start;min-width:0;line-height:1.12}.ka-report .ka-duty-report-meta-copy strong{color:#17684f!important;font-size:10.2pt!important;font-weight:800!important}.ka-report .ka-duty-report-meta-copy span{margin-top:.55mm;color:#263b34!important;font-size:6.7pt!important;font-weight:700!important}.ka-report .ka-duty-report-meta-copy time{margin-top:.45mm;color:#78827e!important;font-size:5.8pt!important}
.ka-report .ka-duty-report-title{text-align:center;margin:0 0 2.3mm}.ka-report .ka-duty-report-title h1{margin:0!important;color:#111!important;font-size:10.8pt!important;font-weight:800!important;line-height:1.12!important}.ka-report .ka-duty-report-title p{margin:.8mm 0 0!important;color:#111!important;font-size:8.3pt!important;font-weight:500!important;line-height:1.12!important}
.ka-report .ka-duty-report-table{width:100%!important;table-layout:fixed!important;margin:0!important;border-collapse:collapse!important}.ka-report .ka-duty-report-table th{height:6.2mm!important;padding:.8mm 1.1mm!important;background:#17684f!important;border:1px solid #397461!important;color:#fff!important;font-size:6.45pt!important;line-height:1.04!important;font-weight:800!important;text-align:center!important}.ka-report .ka-duty-report-table td{height:5.75mm!important;padding:.65mm 1.2mm!important;border:1px solid #c7cfcb!important;background:#fff!important;color:#202825!important;font-size:6.25pt!important;line-height:1.05!important;vertical-align:middle!important;text-align:left!important}.ka-report .ka-duty-report-table td:first-child,.ka-report .ka-duty-report-table th:first-child{width:16.5%!important;text-align:center!important;white-space:nowrap!important}.ka-report .ka-duty-report-table th:last-child,.ka-report .ka-duty-report-table td:last-child{width:15.5%!important}.ka-report .ka-duty-report-table tbody tr:nth-child(even):not(.ka-duty-report-weekend):not(.ka-duty-report-holiday) td{background:#f8faf9!important}
.ka-report .ka-duty-report-weekend td{background:#e6e8ea!important;color:#5f6568!important;font-weight:700!important}.ka-report .ka-duty-report-weekend td:not(:first-child){text-align:center!important;letter-spacing:.04em}.ka-report .ka-duty-report-holiday td{background:#fff0c2!important;color:#704d00!important;font-weight:800!important}.ka-report .ka-duty-report-holiday td:not(:first-child){text-align:center!important;letter-spacing:.025em}
.ka-report .ka-duty-report-tasks{margin:3.2mm 0 0!important;padding:0 1.2mm!important;color:#111}.ka-report .ka-duty-report-tasks h2{margin:0 0 2mm!important;color:#111!important;font-size:9.2pt!important;line-height:1.08!important;font-weight:850!important}.ka-report .ka-duty-report-tasks ol{margin:0!important;padding-left:6.2mm!important;font-size:7.15pt!important;line-height:1.36!important}.ka-report .ka-duty-report-tasks li{margin:0 0 .85mm!important;padding-left:.7mm!important;color:#111!important;font-size:7.15pt!important;line-height:1.36!important}
@media print{.ka-report .ka-duty-report-table tr,.ka-report .ka-duty-report-tasks{break-inside:avoid;page-break-inside:avoid}}
'''
css=css[:idx]+new_css
css_path.write_text(css,encoding='utf-8')

test_path.write_text(r'''const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/management.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
assert(src.includes('function dutyReportShortDate')&&src.includes('function dutyReportDocumentDate'),'Referans rapor tarih yardımcıları bulunmalı.');
for(const marker of ['ka-duty-report-meta','ka-duty-report-title','ka-duty-report-table','ka-duty-report-tasks','ka-duty-report-weekend','ka-duty-report-holiday']) assert(src.includes(marker),`Referans nöbet raporu bölümü eksik: ${marker}`);
for(const removed of ['ka-duty-report-phones','ka-duty-report-footer','ka-duty-report-signature','Geçerlilik Tarihi']) assert(!src.includes(removed),`Referansta bulunmayan rapor bölümü kaldırılmalı: ${removed}`);
assert(src.includes('<th>Tarih</th>')&&src.includes('<th>Nöbetçi Amir</th>'),'Referans çizelge sütun başlıkları korunmalı.');
assert(!src.includes('if(gun===0||gun===6)continue;'),'Hafta sonları rapordan atılmamalı.');
const reportStart=src.indexOf('async function createDutyReport');
const reportEnd=src.indexOf('\nfunction bindDuty(',reportStart);
const report=src.slice(reportStart,reportEnd);
assert(report.indexOf('if(tatil)')>=0&&report.indexOf('if(haftasonu)')>=0&&report.indexOf('if(tatil)')<report.indexOf('if(haftasonu)'),'Resmi tatil hafta sonundan önce değerlendirilmeli; 30 Ağustos gibi tatiller resmi tatil rengiyle görünmeli.');
for(const flag of ['logoGoster:false','tarihGoster:false','baslikGoster:false','compact:false','fontSize:8.5','kenarBosluk:5']) assert(report.includes(flag),`Referans A4 rapor motoru ayarı eksik: ${flag}`);
const taskBlock=src.slice(src.indexOf('const DUTY_TASKS=['),src.indexOf('];',src.indexOf('const DUTY_TASKS=['))+2);
assert((taskBlock.match(/^\s*'/gm)||[]).length===8,'Yüklenen referanstaki görev bölümü 8 maddeden oluşmalı.');
for(const text of ['Ders başlamadan 30 dk önce okula gelinmesi','Taşıma çizelgesinin servis şoförlerine imzalatılması','Öğrencilerin güvenli çıkışının sağlanması','Tören düzeninin sağlanması','Boş geçen derslerin yönetime bildirilmesi']) assert(taskBlock.includes(text),`Referans görev maddesi eksik: ${text}`);
for(const marker of ['.ka-duty-report-meta','.ka-duty-report-title','.ka-duty-report-weekend','.ka-duty-report-holiday','.ka-duty-report--portrait']) assert(css.includes(marker),`Referans rapor design-system stili eksik: ${marker}`);
assert(css.includes('#e6e8ea')&&css.includes('#fff0c2'),'Hafta sonu ve resmi tatil raporda ayrı dolgu rengine sahip olmalı.');
console.log('Yüklenen A4 nöbet çizelgesi referans parity sözleşmesi başarılı.');
''',encoding='utf-8')

classic=classic_test_path.read_text(encoding='utf-8')
classic=classic.replace("assert(src.includes('ka-duty-report-banner')&&src.includes('ka-duty-report-table')&&src.includes('ka-duty-report-tasks')&&src.includes('ka-duty-report-footer'),'Yüklenen tam çizelge örneğine karşılık gelen nöbet rapor anatomisi korunmalı.');","assert(src.includes('ka-duty-report-meta')&&src.includes('ka-duty-report-title')&&src.includes('ka-duty-report-table')&&src.includes('ka-duty-report-tasks'),'Yüklenen çizelge örneğine karşılık gelen nöbet rapor anatomisi korunmalı.');")
classic=classic.replace("assert(src.includes('compact:true')&&src.includes('fontSize:7')&&src.includes('kenarBosluk:5'),'Nöbet raporu tam aylık içeriği tek sayfaya sığdıran kompakt A4 ayarlarını kullanmalı.');","assert(src.includes('compact:false')&&src.includes('fontSize:8.5')&&src.includes('kenarBosluk:5'),'Nöbet raporu yüklenen örnekteki okunaklı tam sayfa A4 ayarlarını kullanmalı.');")
classic_test_path.write_text(classic,encoding='utf-8')

if "const CACHE_ADI='oy-cache-v819';" not in sw:
    raise SystemExit('expected service worker cache v819 not found')
sw=sw.replace("const CACHE_ADI='oy-cache-v819';","const CACHE_ADI='oy-cache-v820';",1)
sw_path.write_text(sw,encoding='utf-8')

print('Duty reference report patch applied.')
