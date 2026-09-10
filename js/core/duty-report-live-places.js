/* Okul Yönetim — nöbet raporu canlı nöbet yeri uyumluluğu.
 * Eski rapor şablonundaki sabit Bahçe / Okul Binası / Giriş-Bahçe sütunlarını,
 * AppStore'daki güncel nobetYerleri listesine göre rapor açılırken yeniden kurar.
 */
(function(global){
'use strict';
if(global.DutyReportLivePlacesFix)return;

const arr=type=>{const value=global.AppStore?.data?.(type);return Array.isArray(value)?value:[]};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const teacherName=teacher=>String(teacher?.adSoyad||`${teacher?.ad||''} ${teacher?.soyad||''}`).replace(/\s+/g,' ').trim();
const isoDate=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

function chiefName(record){
  if(!record)return'';
  const teacher=record.ogretmenId?arr('ogretmenler').find(item=>item.id===record.ogretmenId):null;
  return String(record.ad||record.ogretmenAdSoyad||record.adSoyad||record.amirAdSoyad||record.amirAd||(teacher?teacherName(teacher):'')).trim();
}

function reportMonth(options={}){
  const match=String(options.fileName||'').match(/Nobet_Cizelgesi_(\d{4})_(\d{2})/i);
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2])-1;
  return year&&month>=0&&month<=11?{year,month,yearText:match[1],monthText:match[2]}:null;
}

function sortedPlaces(){
  return [...arr('nobetYerleri')].sort((a,b)=>Number(a.sira||0)-Number(b.sira||0)||String(a.ad||'').localeCompare(String(b.ad||''),'tr'));
}

function longDate(y,m,d){
  return new Date(y,m,d).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'});
}

function rebuildDutyTable(body,options={}){
  const period=reportMonth(options);
  if(!period||typeof document==='undefined')return body;

  const template=document.createElement('template');
  template.innerHTML=String(body||'');
  const report=template.content.querySelector('.ka-duty-report');
  const table=template.content.querySelector('.ka-duty-report-table');
  if(!report||!table)return body;

  const places=sortedPlaces();
  const assignments=arr('nobetAtamalari');
  const chiefs=arr('nobetciAmirleri');
  const holidays=arr('resmiTatiller');
  const landscape=report.classList.contains('ka-duty-report--landscape');
  const dateWidth=landscape?18:22;
  const baseChiefWidth=landscape?24:20;
  const chiefWidth=places.length?baseChiefWidth:100-dateWidth;
  const placesWidth=Math.max(0,100-dateWidth-chiefWidth);
  const placeWidth=places.length?placesWidth/places.length:0;

  let colgroup=table.querySelector('colgroup');
  if(!colgroup){colgroup=document.createElement('colgroup');table.prepend(colgroup)}
  colgroup.innerHTML=`<col class="ka-duty-report-col-date" style="width:${dateWidth}%">${places.map(()=>`<col class="ka-duty-report-col-place" style="width:${placeWidth}%">`).join('')}<col class="ka-duty-report-col-chief" style="width:${chiefWidth}%">`;

  let headRow=table.querySelector('thead tr');
  if(!headRow){const thead=document.createElement('thead');headRow=document.createElement('tr');thead.appendChild(headRow);table.prepend(thead)}
  headRow.innerHTML=`<th>TARİH / GÜN</th>${places.map(place=>`<th>${esc(String(place.ad||'Nöbet Yeri').toLocaleUpperCase('tr'))}</th>`).join('')}<th>NÖBETÇİ AMİR</th>`;

  let tbody=table.querySelector('tbody');
  if(!tbody){tbody=document.createElement('tbody');table.appendChild(tbody)}
  const totalDays=new Date(period.year,period.month+1,0).getDate();
  const span=Math.max(1,places.length+1);
  const rows=[];
  for(let day=1;day<=totalDays;day++){
    const iso=isoDate(period.year,period.month,day);
    const dateValue=new Date(period.year,period.month,day);
    const weekend=dateValue.getDay()===0||dateValue.getDay()===6;
    const holiday=holidays.find(item=>item.tarih===iso);
    const dateText=longDate(period.year,period.month,day);
    if(holiday){
      const description=String(holiday.aciklama||holiday.ad||holiday.adi||'RESMİ TATİL').trim();
      const dayMonth=dateValue.toLocaleDateString('tr-TR',{day:'numeric',month:'long'}).toLocaleUpperCase('tr');
      const upper=description.toLocaleUpperCase('tr');
      const label=upper.includes(dayMonth)?upper:`${dayMonth} ${upper}`;
      rows.push(`<tr class="ka-duty-report-holiday"><td>${esc(dateText)}</td><td colspan="${span}">${esc(label)}</td></tr>`);
      continue;
    }
    if(weekend){
      rows.push(`<tr class="ka-duty-report-weekend"><td>${esc(dateText)}</td><td colspan="${span}"></td></tr>`);
      continue;
    }
    const cells=places.map(place=>{
      const assignment=assignments.find(item=>item.tarih===iso&&item.yerId===place.id);
      return `<td>${esc(String(assignment?.ogretmenAdSoyad||'').toLocaleUpperCase('tr'))}</td>`;
    }).join('');
    const chief=chiefs.find(item=>item.tarih===iso);
    rows.push(`<tr><td>${esc(dateText)}</td>${cells}<td>${esc(chiefName(chief).toLocaleUpperCase('tr'))}</td></tr>`);
  }
  tbody.innerHTML=rows.join('');
  table.dataset.dutyLivePlaces=String(places.length);
  return template.innerHTML;
}

function patchReportEngine(){
  const engine=global.ReportEngine;
  if(!engine||typeof engine.printReport!=='function'||engine.__dutyLivePlacesPatched)return false;
  const original=engine.printReport.bind(engine);
  engine.printReport=function(title,body,options={}){
    if(String(title||'')==='Öğretmen Nöbet Çizelgesi'||String(body||'').includes('ka-duty-report')){
      try{body=rebuildDutyTable(body,options)}catch(error){console.warn('[Nöbet Raporu] Canlı nöbet yeri uyarlaması uygulanamadı:',error)}
    }
    return original(title,body,options);
  };
  engine.__dutyLivePlacesPatched=true;
  return true;
}

global.addEventListener?.('koruk:module-ready',event=>{if(event.detail?.name==='management')patchReportEngine()});
global.addEventListener?.('koruk:app-ready',patchReportEngine);
patchReportEngine();
global.DutyReportLivePlacesFix={patch:patchReportEngine,rebuildDutyTable,sortedPlaces};
})(window);
