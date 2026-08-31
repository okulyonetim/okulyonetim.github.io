const fs=require('fs');

const managementPath='js/modules/management.js';
let src=fs.readFileSync(managementPath,'utf8');
const start=src.indexOf('const DUTY_TASKS=[');
const end=src.indexOf('\nfunction bindDuty()',start);
if(start<0||end<0)throw new Error('Duty report block not found');
const replacement=`const DUTY_TASKS=[
  'Ders başlamadan 30 dk önce okula gelinmesi ve ders bitiminden on beş dakika sonra okulun terk edilmesi',
  'Nöbete başlandığında okul bölümlerinin gezilmesi ve nöbet defterinin sabah bölümünün doldurulması',
  'Olumsuz durumların nöbetçi müdür yardımcısına bildirilmesi',
  'Taşıma çizelgesinin servis şoförlerine imzalatılması',
  'Öğrencilerin güvenli çıkışının sağlanması',
  'Tören düzeninin sağlanması',
  'Boş geçen derslerin yönetime bildirilmesi',
  'Ders bitiminde okulun boşaltılması ve nöbet defterinin doldurulması'
];
const DUTY_REPORT_COLUMNS=[
  {label:'BAHÇE',aliases:['BAHÇE','BAHCE']},
  {label:'OKUL BİNASI',aliases:['OKUL BİNASI','OKUL BINASI']},
  {label:'GİRİŞ - BAHÇE',aliases:['GİRİŞ - BAHÇE','GIRIS - BAHCE','GİRİŞ-BAHÇE','GIRIS-BAHCE']}
];
function dutyReportPlace(places,aliases){return places.find(p=>aliases.includes(norm(p.ad||'')))||null}
function dutyReportNumericDate(iso){if(!iso)return'';const d=new Date(iso+'T00:00:00');return Number.isNaN(d.getTime())?iso:d.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'})}
function dutyReportMonthEndDate(y,m){return new Date(y,m+1,0).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}
function dutyReportLogoUrl(){try{return new URL('assets/icon-192.png',globalThis.location.href).href}catch(_){return'assets/icon-192.png'}}
function dutyReportModal(){const selected=\`${dutyYear}-\${String(dutyMonth+1).padStart(2,'0')}\`,ov=modal('Nöbet Raporu',\`<label class="ka-field"><span class="ka-field__label">Ay</span><input type="month" data-month value="\${selected}"></label><label class="ka-field"><span class="ka-field__label">Sayfa yönü</span><select data-orientation><option value="dikey">Dikey A4</option><option value="yatay">Yatay A4</option></select></label>\`,'Önizle');ov.querySelector('[data-save]').onclick=async()=>{await createDutyReport(ov.querySelector('[data-month]').value,ov.querySelector('[data-orientation]').value);ov.remove()}}
async function createDutyReport(month,yon){if(!globalThis.ReportEngine)await AppLoader.loadScript('js/modules/report-engine.js');const [ys,ms]=String(month).split('-'),y=Number(ys),m=Number(ms)-1;if(!y||m<0)return;const places=NobetService.yerSirali(arr('nobetYerleri')),atamalar=arr('nobetAtamalari'),amirler=arr('nobetciAmirleri'),tatiller=arr('resmiTatiller'),okulRows=arr('okulBilgileri'),okul=okulRows.find(x=>x.id==='ayarlar')||okulRows[0]||{},okulAdi=okul.okulAdi||okul.ad||'KORUK İLK - ORTAOKULU',columns=DUTY_REPORT_COLUMNS.map(c=>({...c,place:dutyReportPlace(places,c.aliases)})),gunSayisi=new Date(y,m+1,0).getDate(),rows=[];for(let g=1;g<=gunSayisi;g++){const iso=NobetService.tarihISO(y,m,g),dt=new Date(y,m,g),haftasonu=dt.getDay()===0||dt.getDay()===6,tatil=tatiller.some(t=>t.tarih===iso);if(haftasonu||tatil)continue;const cells=columns.map(c=>{const a=c.place?atamalar.find(x=>x.tarih===iso&&x.yerId===c.place.id):null;return\`<td>\${esc(String(a?.ogretmenAdSoyad||'').toLocaleUpperCase('tr'))}</td>\`}).join(''),amir=amirler.find(a=>a.tarih===iso);rows.push(\`<tr><td>\${esc(dutyReportNumericDate(iso))}</td>\${cells}<td>\${esc(String(amir?.ad||'').toLocaleUpperCase('tr'))}</td></tr>\`)}const monthName=new Date(y,m,1).toLocaleDateString('tr-TR',{month:'long'}).toLocaleUpperCase('tr'),reportDate=dutyReportMonthEndDate(y,m),body=\`<section class="ka-duty-report"><header class="ka-duty-report-brand"><img class="ka-duty-report-logo" src="\${esc(dutyReportLogoUrl())}" alt=""><div><h1>Öğretmen Nöbet Çizelgesi</h1><strong>\${esc(String(okulAdi).toLocaleUpperCase('tr'))}</strong><span>\${esc(reportDate)}</span></div></header><div class="ka-duty-report-rule"></div><header class="ka-duty-report-title"><h2>\${esc(String(okulAdi).toLocaleUpperCase('tr'))}</h2><p>\${y} \${esc(monthName)} AYI ÖĞRETMEN NÖBET ÇİZELGESİ</p></header><table class="ka-duty-report-table"><colgroup><col class="ka-duty-report-col-date"><col class="ka-duty-report-col-garden"><col class="ka-duty-report-col-building"><col class="ka-duty-report-col-entry"><col class="ka-duty-report-col-chief"></colgroup><thead><tr><th>Tarih</th>\${columns.map(c=>\`<th>\${esc(c.label)}</th>\`).join('')}<th>Nöbetçi Amir</th></tr></thead><tbody>\${rows.join('')}</tbody></table><section class="ka-duty-report-tasks"><h2>NÖBETÇİ ÖĞRETMENİN GÖREVLERİ</h2><ol>\${DUTY_TASKS.map(x=>\`<li>\${esc(x)}</li>\`).join('')}</ol></section></section>\`;return ReportEngine.printReport('Öğretmen Nöbet Çizelgesi',body,{fileName:\`Nobet_Cizelgesi_\${ys}_\${ms}\`,yon:yon==='yatay'?'yatay':'dikey',okulAdi,logoGoster:false,tarihGoster:false,baslikGoster:false,compact:true,fontSize:8,kenarBosluk:7})}`;
src=src.slice(0,start)+replacement+src.slice(end);
fs.writeFileSync(managementPath,src);

const cssPath='css/design-system.css';
let css=fs.readFileSync(cssPath,'utf8');
const marker='/* Duty report — full historical roster anatomy, canonical ReportEngine output. */';
const cssStart=css.indexOf(marker);
if(cssStart<0)throw new Error('Duty report CSS marker not found');
const newCss=`/* Duty report — uploaded classic roster format, canonical ReportEngine output. */
.ka-report .ka-duty-report{color:#151515;font-family:Arial,Helvetica,sans-serif;display:block}
.ka-report .ka-duty-report-brand{display:flex;align-items:center;gap:9px;margin:0;padding:0 0 4px}.ka-report .ka-duty-report-logo{width:34px;height:34px;object-fit:contain;flex:0 0 34px}.ka-report .ka-duty-report-brand div{display:flex;min-width:0;flex-direction:column;align-items:flex-start;line-height:1.08}.ka-report .ka-duty-report-brand h1{margin:0!important;color:#17684f!important;font-size:9.6pt!important;font-weight:800!important;line-height:1.08!important}.ka-report .ka-duty-report-brand strong{margin-top:2px;color:#222;font-size:6.1pt;line-height:1.08}.ka-report .ka-duty-report-brand span{margin-top:2px;color:#666;font-size:5.6pt;line-height:1.08}
.ka-report .ka-duty-report-rule{height:0;margin:0 0 5px;border-top:1.2px solid #17684f}.ka-report .ka-duty-report-title{text-align:center;margin:0 0 4px}.ka-report .ka-duty-report-title h2{margin:0!important;color:#111!important;font-size:10pt!important;font-weight:800!important;line-height:1.12!important}.ka-report .ka-duty-report-title p{margin:2px 0 0!important;color:#111!important;font-size:6.9pt!important;line-height:1.12!important}
.ka-report .ka-duty-report-table{width:100%;table-layout:fixed;margin:0!important;border-collapse:collapse!important}.ka-report .ka-duty-report-table th{height:16px!important;padding:2px 3px!important;background:#17684f!important;border:1px solid #5d8e7e!important;color:#fff!important;font-size:6.1pt!important;line-height:1.05!important;font-weight:800!important;text-align:center!important}.ka-report .ka-duty-report-table td{height:13.2px!important;padding:1.1px 4px!important;border:1px solid #c6ceca!important;background:#fff!important;color:#222!important;font-size:6.15pt!important;line-height:1.06!important;vertical-align:middle!important;text-align:left!important}.ka-report .ka-duty-report-table tbody tr:nth-child(even) td{background:#fafcfb!important}.ka-report .ka-duty-report-col-date{width:14%}.ka-report .ka-duty-report-col-garden{width:27%}.ka-report .ka-duty-report-col-building{width:27%}.ka-report .ka-duty-report-col-entry{width:18%}.ka-report .ka-duty-report-col-chief{width:14%}.ka-report .ka-duty-report-table td:first-child{white-space:nowrap!important}
.ka-report .ka-duty-report-tasks{margin:5px 0 0!important;padding:0 0 0 1px!important;color:#111}.ka-report .ka-duty-report-tasks h2{margin:0 0 3px!important;color:#111!important;font-size:7.8pt!important;font-weight:800!important;line-height:1.1!important}.ka-report .ka-duty-report-tasks ol{margin:0!important;padding-left:17px!important;font-size:6.15pt!important;line-height:1.28!important}.ka-report .ka-duty-report-tasks li{margin:0 0 1px!important;padding-left:1px!important;color:#111!important;font-size:6.15pt!important;line-height:1.28!important}
@media print{.ka-report .ka-duty-report{break-inside:avoid;page-break-inside:avoid}.ka-report .ka-duty-report-table tr,.ka-report .ka-duty-report-tasks{break-inside:avoid;page-break-inside:avoid}}
`;
css=css.slice(0,cssStart)+newCss;
fs.writeFileSync(cssPath,css);

const dutyTest=`const fs=require('fs');\nconst assert=require('assert');\nconst src=fs.readFileSync('js/modules/management.js','utf8');\nconst css=fs.readFileSync('css/design-system.css','utf8');\nassert(src.includes('class="ka-duty-grid"'),'Aylık nöbet listesi canonical tablo olmalı.');\nassert(src.includes('overflow-x:auto'),'Nöbet tablosu mobilde yatay kaydırılabilir kalmalı.');\nfor(const header of ['Tarih','BAHÇE','OKUL BİNASI','GİRİŞ - BAHÇE','Nöbetçi Amir']) assert(src.includes(header),\\`Yüklenen çizelge sütunu eksik: \\${header}\\`);\nassert(src.includes('ka-duty-report-brand')&&src.includes('ka-duty-report-rule')&&src.includes('ka-duty-report-title')&&src.includes('ka-duty-report-table')&&src.includes('ka-duty-report-tasks'),'Yüklenen çizelge rapor anatomisi eksik.');\nassert(src.includes("if(haftasonu||tatil)continue;"),'Rapor hafta sonu ve resmi tatil satırlarını yazdırmamalı.');\nassert(!src.includes('ka-duty-report-phones'),'Yüklenen formatta telefon bölümü olmamalı.');\nassert(!src.includes('ka-duty-report-footer'),'Yüklenen formatta ek geçerlilik/footer bölümü olmamalı.');\nassert(!src.includes('ka-duty-report-signature'),'Yüklenen formatta imza bölümü olmamalı.');\nconst taskBlock=src.slice(src.indexOf('const DUTY_TASKS=['),src.indexOf('];',src.indexOf('const DUTY_TASKS=['))+2);\nassert((taskBlock.match(/^\\s*'/gm)||[]).length===8,'Yüklenen örnekteki görev listesi 8 madde olmalı.');\nfor(const marker of ['.ka-duty-report-brand','.ka-duty-report-title','.ka-duty-report-col-date','.ka-duty-report-col-garden','.ka-duty-report-col-building','.ka-duty-report-col-entry','.ka-duty-report-col-chief']) assert(css.includes(marker),\\`Rapor stili eksik: \\${marker}\\`);\nassert(css.includes('background:#17684f!important'),'Sütun başlıkları kurumsal yeşil dolgu kullanmalı.');\nconsole.log('Yüklenen öğretmen nöbet çizelgesi formatı parity sözleşmesi başarılı.');\n`;
fs.writeFileSync('tests/duty-report-full-parity.test.js',dutyTest);

let classic=fs.readFileSync('tests/classic-duty-v2-smoke.test.js','utf8');
classic=classic.replace("assert(src.includes('ka-duty-report-banner')&&src.includes('ka-duty-report-table')&&src.includes('ka-duty-report-tasks')&&src.includes('ka-duty-report-footer'),'Yüklenen tam çizelge örneğine karşılık gelen nöbet rapor anatomisi korunmalı.');","assert(src.includes('ka-duty-report-brand')&&src.includes('ka-duty-report-title')&&src.includes('ka-duty-report-table')&&src.includes('ka-duty-report-tasks'),'Yüklenen çizelge örneğine karşılık gelen nöbet rapor anatomisi korunmalı.');");
classic=classic.replace("assert(src.includes('compact:true')&&src.includes('fontSize:7')&&src.includes('kenarBosluk:5'),'Nöbet raporu tam aylık içeriği tek sayfaya sığdıran kompakt A4 ayarlarını kullanmalı.');","assert(src.includes('compact:true')&&src.includes('fontSize:8')&&src.includes('kenarBosluk:7'),'Nöbet raporu yüklenen dikey A4 görünümüne uygun kompakt ayarları kullanmalı.');");
fs.writeFileSync('tests/classic-duty-v2-smoke.test.js',classic);

const swPath='service-worker.js';
let sw=fs.readFileSync(swPath,'utf8');
if(!sw.includes("const CACHE_ADI='oy-cache-v819';"))throw new Error('Unexpected SW cache version');
sw=sw.replace("const CACHE_ADI='oy-cache-v819';","const CACHE_ADI='oy-cache-v820';");
fs.writeFileSync(swPath,sw);
