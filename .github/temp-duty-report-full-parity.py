from pathlib import Path
import re

mgmt_path=Path('js/modules/management.js')
css_path=Path('css/design-system.css')
test_path=Path('tests/classic-duty-v2-smoke.test.js')
new_test_path=Path('tests/duty-report-full-parity.test.js')
sw_path=Path('service-worker.js')

mgmt=mgmt_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
test=test_path.read_text(encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')

# Nöbet raporunda okul müdürünü gerçek okulBilgileri.mudurId -> ogretmenler eşleşmesiyle çözebilmek için
# akademik/personel kaynağını da local-first hydrate et.
old_defs='nobetRotasyon:COL.nobetRotasyon,okulBilgileri:COL.okulBilgileri'
new_defs='nobetRotasyon:COL.nobetRotasyon,ogretmenler:COL.ogretmenler,okulBilgileri:COL.okulBilgileri'
if old_defs not in mgmt:
    raise SystemExit('management prepareLocal duty dependency marker not found')
mgmt=mgmt.replace(old_defs,new_defs,1)

report_block=r'''const DUTY_TASKS=[
  'Ders başlamadan 30 dk önce okula gelinmesi ve ders bitiminden on beş dakika sonra okulun terk edilmesi.',
  'Nöbete başlandığında ilk olarak okul bölümlerinin gezilmesi ve nöbet defterinin sabah bölümünün doldurulması.',
  'Nöbet süresince sorumlu olunan alanların düzenli olarak kontrol edilmesi.',
  'Hava şartlarına göre öğrencilerin koridor ve bahçe düzeninin takip edilmesi, sınıf nöbetçilerinin kontrol edilmesi.',
  'Olumsuz durumların nöbetçi müdür yardımcısına bildirilmesi.',
  'Taşıma çizelgesinin her gün servis şoförlerine imzalatılması.',
  'Yemekhane ve paydos saatlerinde öğrencilerin güvenli geçiş ve çıkışlarının sağlanması.',
  'Bahçe ve ortak alan temizliğinin takip edilmesi.',
  'Törenlerin yapılması için gerekli düzenin sağlanması.',
  'Okula gelen yabancılara yardımcı olunması ve gerekli durumların nöbet defterine yazılması.',
  'Derse geç girilen durumların yönetime bildirilmesi.',
  'Boş geçen derslerin yönetime veya nöbetçi müdür yardımcısına bildirilmesi.',
  'Ders bitiminde okulun boşaltılmasının takip edilmesi.',
  'Gün sonunda nöbet defterinin ilgili bölümünün doldurulması.'
];
function dutyReportFirstWorkday(y,m,tatiller=arr('resmiTatiller')){const total=new Date(y,m+1,0).getDate();for(let d=1;d<=total;d++){const day=new Date(y,m,d).getDay(),iso=NobetService.tarihISO(y,m,d);if(day!==0&&day!==6&&!(tatiller||[]).some(t=>t.tarih===iso))return iso}return NobetService.tarihISO(y,m,1)}
function dutyReportLongDate(y,m,d){return new Date(y,m,d).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'})}
function dutyReportDisplayDate(iso){if(!iso)return'';const d=new Date(iso+'T00:00:00');return Number.isNaN(d.getTime())?iso:d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}
function dutyReportLogoUrl(){try{return new URL('assets/logo.png',globalThis.location.href).href}catch(_){return'assets/logo.png'}}
function dutyReportPrincipal(okul){const teacher=arr('ogretmenler').find(o=>o.id===okul?.mudurId);return teacher?{ad:teacherName(teacher),telefon:teacher.telefon||''}:{ad:'—',telefon:''}}
function dutyReportModal(){const selected=`${dutyYear}-${String(dutyMonth+1).padStart(2,'0')}`,first=dutyReportFirstWorkday(dutyYear,dutyMonth),ov=modal('Nöbet Raporu',`<label class="ka-field"><span class="ka-field__label">Ay</span><input type="month" data-month value="${selected}"></label><label class="ka-field"><span class="ka-field__label">Geçerlilik Tarihi</span><input type="date" data-validity value="${first}"></label><label class="ka-field"><span class="ka-field__label">Sayfa yönü</span><select data-orientation><option value="dikey">Dikey A4</option><option value="yatay">Yatay A4</option></select></label>`,'Önizle');const monthInput=ov.querySelector('[data-month]'),validity=ov.querySelector('[data-validity]');monthInput.addEventListener('change',()=>{const [ys,ms]=String(monthInput.value||'').split('-'),y=Number(ys),m=Number(ms)-1;if(y&&m>=0)validity.value=dutyReportFirstWorkday(y,m)});ov.querySelector('[data-save]').onclick=async()=>{await createDutyReport(monthInput.value,ov.querySelector('[data-orientation]').value,validity.value);ov.remove()}}
async function createDutyReport(month,yon,gecerlilikTarihi=''){if(!globalThis.ReportEngine)await AppLoader.loadScript('js/modules/report-engine.js');const [ys,ms]=String(month).split('-'),y=Number(ys),m=Number(ms)-1;if(!y||m<0)return;const yerler=NobetService.yerSirali(arr('nobetYerleri')),atamalar=arr('nobetAtamalari'),amirler=arr('nobetciAmirleri'),tatiller=arr('resmiTatiller'),okulRows=arr('okulBilgileri'),okul=okulRows.find(x=>x.id==='ayarlar')||okulRows[0]||{},okulAdi=okul.okulAdi||okul.ad||'KORUK İLK - ORTAOKULU',mudur=dutyReportPrincipal(okul),gunSayisi=new Date(y,m+1,0).getDate(),rows=[];if(!yerler.length){toast?.('Önce nöbet yeri tanımlayın.');return}for(let g=1;g<=gunSayisi;g++){const iso=NobetService.tarihISO(y,m,g),dt=new Date(y,m,g),haftasonu=dt.getDay()===0||dt.getDay()===6,tatil=tatiller.find(t=>t.tarih===iso),tarihMetin=dutyReportLongDate(y,m,g);if(tatil){const aciklama=String(tatil.aciklama||tatil.ad||tatil.adi||'RESMİ TATİL').trim(),gunAy=dt.toLocaleDateString('tr-TR',{day:'numeric',month:'long'}).toLocaleUpperCase('tr'),etiket=aciklama.toLocaleUpperCase('tr').includes(gunAy)?aciklama.toLocaleUpperCase('tr'):`${gunAy} ${aciklama.toLocaleUpperCase('tr')}`;rows.push(`<tr class="ka-duty-report-holiday"><td>${esc(tarihMetin)}</td><td colspan="${yerler.length+1}">${esc(etiket)}</td></tr>`);continue}if(haftasonu){rows.push(`<tr class="ka-duty-report-weekend"><td>${esc(tarihMetin)}</td><td colspan="${yerler.length+1}"></td></tr>`);continue}const cells=yerler.map(yer=>`<td>${esc(atamalar.find(x=>x.tarih===iso&&x.yerId===yer.id)?.ogretmenAdSoyad||'—')}</td>`).join(''),amir=amirler.find(a=>a.tarih===iso);rows.push(`<tr><td>${esc(tarihMetin)}</td>${cells}<td>${esc(amir?.ad||'—')}</td></tr>`)}const headers=yerler.map(x=>`<th>${esc(String(x.ad||'Nöbet Yeri').toLocaleUpperCase('tr'))}</th>`).join(''),monthName=new Date(y,m,1).toLocaleDateString('tr-TR',{month:'long'}).toLocaleUpperCase('tr'),validity=gecerlilikTarihi||dutyReportFirstWorkday(y,m,tatiller),validityText=dutyReportDisplayDate(validity),chiefPhones=[];amirler.filter(a=>String(a.tarih||'').startsWith(`${ys}-${ms}`)&&a.ad).forEach(a=>{const teacher=a.ogretmenId?arr('ogretmenler').find(o=>o.id===a.ogretmenId):null,name=String(a.ad||'').trim(),phone=String(a.telefon||teacher?.telefon||'').trim();if(name&&!chiefPhones.some(x=>x.ad.localeCompare(name,'tr',{sensitivity:'base'})===0))chiefPhones.push({ad:name,telefon:phone})});const phones=[];if(mudur.ad&&mudur.ad!=='—')phones.push(mudur);chiefPhones.forEach(x=>{if(!phones.some(p=>p.ad.localeCompare(x.ad,'tr',{sensitivity:'base'})===0))phones.push(x)});const phonesHtml=phones.length?`<section class="ka-duty-report-phones"><strong>TELEFONLAR</strong>${phones.map(p=>`<span><b>${esc(p.ad)}</b> ${esc(p.telefon||'—')}</span>`).join('')}</section>`:'',body=`<section class="ka-duty-report"><header class="ka-duty-report-banner"><img class="ka-duty-report-logo" src="${esc(dutyReportLogoUrl())}" alt=""><h1>${esc(String(okulAdi).toLocaleUpperCase('tr'))} ${y} YILI ${esc(monthName)} AYI ÖĞRETMEN NÖBET ÇİZELGESİ</h1></header><table class="ka-duty-report-table"><thead><tr><th>TARİH / GÜN</th>${headers}<th>NÖBETÇİ AMİR</th></tr></thead><tbody>${rows.join('')}</tbody></table>${phonesHtml}<section class="ka-duty-report-tasks"><h2>NÖBETÇİ ÖĞRETMENİN GÖREVLERİ</h2><ol>${DUTY_TASKS.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section><footer class="ka-duty-report-footer"><p>Bu çizelge ${esc(validityText)} tarihinden itibaren geçerlidir.</p><p>Öğretmen arkadaşların okuldaki eğitim öğretim hizmetlerinin verimli geçmesi için yukarıda sayılan talimatlara göre nöbet hizmetlerini yerine getirmelerini rica ederim.</p><div class="ka-duty-report-signature"><span>${esc(validityText)}</span><strong>${esc(mudur.ad)}</strong><span>Okul Müdürü</span></div></footer></section>`;return ReportEngine.printReport('Öğretmen Nöbet Çizelgesi',body,{fileName:`Nobet_Cizelgesi_${ys}_${ms}`,yon:yon==='yatay'?'yatay':'dikey',okulAdi,logoGoster:false,tarihGoster:false,baslikGoster:false,compact:true,fontSize:7,kenarBosluk:5})}'''

pattern=r"const DUTY_TASKS=.*?(?=\nfunction bindDuty\()"
mgmt2,n=re.subn(pattern,report_block,mgmt,count=1,flags=re.S)
if n!=1:
    raise SystemExit(f'duty report block replacement count={n}')
mgmt=mgmt2
mgmt_path.write_text(mgmt,encoding='utf-8')

marker='/* Duty report uses the same ReportEngine shell but preserves the uploaded roster anatomy. */'
idx=css.find(marker)
if idx<0:
    raise SystemExit('duty report css marker not found')
new_css=r'''/* Duty report — full historical roster anatomy, canonical ReportEngine output. */
.ka-report .ka-duty-report{color:#111;font-family:Arial,sans-serif;display:flex;flex-direction:column;gap:0}
.ka-report .ka-duty-report-banner{display:grid;grid-template-columns:32px minmax(0,1fr) 32px;align-items:center;gap:7px;padding:0 0 3px;margin:0 0 3px;border-bottom:1.2px solid #17684f;text-align:center}
.ka-report .ka-duty-report-logo{width:30px;height:30px;object-fit:contain}.ka-report .ka-duty-report-banner h1{grid-column:2;margin:0!important;color:#155c46!important;font-size:7.3pt!important;font-weight:800!important;line-height:1.08!important;letter-spacing:.015em}.ka-report .ka-duty-report-banner img+ h1{grid-column:2}
.ka-report .ka-duty-report-table{width:100%;table-layout:fixed;margin:0!important;border-collapse:collapse!important}.ka-report .ka-duty-report-table th{height:12px!important;padding:.7px 2px!important;background:#17684f!important;border:1px solid #397461!important;color:#fff!important;font-size:5.35pt!important;line-height:1.02!important;font-weight:800!important}.ka-report .ka-duty-report-table td{height:10.2px!important;padding:.35px 2px!important;border:1px solid #b8c2bd!important;background:#fff!important;color:#111!important;font-size:5.15pt!important;line-height:1.02!important;vertical-align:middle!important;text-align:center!important}.ka-report .ka-duty-report-table td:first-child,.ka-report .ka-duty-report-table th:first-child{width:22%!important;text-align:left!important;white-space:nowrap!important}.ka-report .ka-duty-report-table th:last-child,.ka-report .ka-duty-report-table td:last-child{width:17%!important}.ka-report .ka-duty-report-table tbody tr:nth-child(even) td{background:#fafafa!important}
.ka-report .ka-duty-report-weekend td{background:#e7e7e7!important;color:#707070!important;font-weight:600!important}.ka-report .ka-duty-report-holiday td{background:#fff3cd!important;color:#6d5200!important;font-weight:800!important}.ka-report .ka-duty-report-holiday td:not(:first-child){text-align:center!important;letter-spacing:.01em}
.ka-report .ka-duty-report-phones{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:2px 0 0;padding:1.5px 0;border-top:.6px solid #555;border-bottom:.6px solid #777;font-size:4.65pt;line-height:1.05}.ka-report .ka-duty-report-phones>strong{font-size:4.8pt}.ka-report .ka-duty-report-phones span{white-space:nowrap}.ka-report .ka-duty-report-phones b{font-weight:800}
.ka-report .ka-duty-report-tasks{margin:2px 0 0!important;padding:0!important;color:#111}.ka-report .ka-duty-report-tasks h2{margin:0 0 1px!important;color:#111!important;font-size:5.8pt!important;line-height:1.05!important}.ka-report .ka-duty-report-tasks ol{margin:0!important;padding-left:11px!important;font-size:4.5pt!important;line-height:1.06!important}.ka-report .ka-duty-report-tasks li{margin:0!important;padding:0!important;color:#111!important;font-size:4.5pt!important;line-height:1.06!important}
.ka-report .ka-duty-report-footer{position:relative;margin-top:2px;padding-top:1.5px;border-top:.5px solid #777;color:#111;font-size:4.5pt;line-height:1.08;min-height:32px}.ka-report .ka-duty-report-footer p{margin:0 0 1px!important}.ka-report .ka-duty-report-signature{margin-left:auto;margin-top:1px;width:25%;display:flex;flex-direction:column;align-items:center;text-align:center;line-height:1.08}.ka-report .ka-duty-report-signature strong{margin-top:1px;font-size:4.9pt}.ka-report .ka-duty-report-signature span{display:block}
@media print{.ka-report .ka-duty-report{break-inside:avoid;page-break-inside:avoid}.ka-report .ka-duty-report-table tr,.ka-report .ka-duty-report-tasks,.ka-report .ka-duty-report-footer{break-inside:avoid;page-break-inside:avoid}}
'''
css=css[:idx].rstrip()+'\n\n'+new_css
css_path.write_text(css,encoding='utf-8')

old_assert="assert(src.includes('compact:true')&&src.includes('fontSize:8')&&src.includes('kenarBosluk:8'),'Nöbet raporu tek sayfalık kompakt A4 ayarlarını kullanmalı.');"
new_assert="assert(src.includes('compact:true')&&src.includes('fontSize:7')&&src.includes('kenarBosluk:5'),'Nöbet raporu tam aylık içeriği tek sayfaya sığdıran kompakt A4 ayarlarını kullanmalı.');"
if old_assert not in test:
    raise SystemExit('classic duty report A4 assertion marker not found')
test=test.replace(old_assert,new_assert,1)
test_path.write_text(test,encoding='utf-8')

new_test_path.write_text(r'''const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/management.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
assert(src.includes('ogretmenler:COL.ogretmenler'),'Nöbet raporu müdür/telefon eşleşmesi için öğretmenleri local-first hydrate etmeli.');
assert(src.includes('TARİH / GÜN'),'Tam nöbet çizelgesi tarih/gün başlığını korumalı.');
for(const marker of ['ka-duty-report-weekend','ka-duty-report-holiday','ka-duty-report-phones','ka-duty-report-footer','ka-duty-report-signature','Geçerlilik Tarihi','Okul Müdürü']) assert(src.includes(marker),`Tam nöbet raporu bölümü eksik: ${marker}`);
assert(!src.includes('if(gun===0||gun===6)continue;'),'Nöbet raporu hafta sonlarını atlamamalı.');
const reportStart=src.indexOf('async function createDutyReport');
const reportEnd=src.indexOf('\nfunction bindDuty(',reportStart);
const report=src.slice(reportStart,reportEnd);
assert(report.indexOf('if(tatil)')>=0&&report.indexOf('if(haftasonu)')>=0&&report.indexOf('if(tatil)')<report.indexOf('if(haftasonu)'),'Resmi tatil hafta sonundan önce değerlendirilmeli; 30 Ağustos gibi tatiller kaybolmamalı.');
assert(report.includes('mudurId')&&report.includes("arr('ogretmenler')"),'Okul müdürü gerçek okulBilgileri.mudurId üzerinden çözülmeli.');
for(const flag of ['logoGoster:false','tarihGoster:false','baslikGoster:false','compact:true','fontSize:7','kenarBosluk:5']) assert(report.includes(flag),`Rapor motoru tam çizelge ayarı eksik: ${flag}`);
const taskBlock=src.slice(src.indexOf('const DUTY_TASKS=['),src.indexOf('];',src.indexOf('const DUTY_TASKS=['))+2);
assert((taskBlock.match(/^\s*'/gm)||[]).length===14,'Nöbetçi öğretmen görevleri 14 maddelik tam liste olmalı.');
for(const marker of ['.ka-duty-report-weekend','.ka-duty-report-holiday','.ka-duty-report-phones','.ka-duty-report-signature']) assert(css.includes(marker),`Tam nöbet raporu design-system stili eksik: ${marker}`);
console.log('Tam aylık nöbet çizelgesi + telefon + görev + imza parity sözleşmesi başarılı.');
''',encoding='utf-8')

if "const CACHE_ADI='oy-cache-v818';" not in sw:
    raise SystemExit('expected service worker cache v818 not found')
sw=sw.replace("const CACHE_ADI='oy-cache-v818';","const CACHE_ADI='oy-cache-v819';",1)
sw_path.write_text(sw,encoding='utf-8')
print('Complete duty report parity patch applied.')
