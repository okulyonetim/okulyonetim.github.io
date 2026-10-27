/* Okul Yönetim — rapor görünümü + ders programı sütun zebrası + menü pull refresh.
 * Merkezi ReportEngine tüm raporlarda toner dostu çok hafif dolgu kullanır.
 * Ders programlarında gün sütunları kendi hafif zebra önceliğini korur.
 * Alt navigasyondaki Menü yüzeyi açıkken, menü en üstteyse aşağı çekme yeniler.
 */
(function(global){
'use strict';
if(global.ScheduleReportColumnZebra)return;

const GLOBAL_SOFT_STYLE=`<style data-ka-report-soft-fill>
.ka-report table th{background:var(--ka-report-soft-header-bg)!important;color:var(--ka-report-soft-header-text)!important;border-color:var(--ka-report-soft-border)!important}
.ka-report .bolum-baslik{background:var(--ka-report-soft-section-bg)!important}
.ka-report .ka-sr-report .ka-sr-neutral{background:var(--ka-report-soft-neutral-bg)!important}
.ka-report .ka-sr-report .scope{background:var(--ka-report-soft-neutral-bg)!important}
.ka-report .ka-sr-class-teacher{display:block;margin:.45mm 0 0;font-size:8pt;line-height:1.08;font-weight:700;color:var(--ka-report-class-teacher);text-align:center}
</style>`;

const COLUMN_ZEBRA_STYLE=`<style data-ka-schedule-column-zebra>
.ka-report .ka-sr-report tbody tr>td.ka-sr-day-a{background:var(--ka-report-zebra-a)!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
.ka-report .ka-sr-report tbody tr>td.ka-sr-day-b{background:var(--ka-report-zebra-b)!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
.ka-report .ka-sr-report thead tr>th.ka-sr-day-a{background:var(--ka-report-zebra-head-a)!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
.ka-report .ka-sr-report thead tr>th.ka-sr-day-b{background:var(--ka-report-zebra-head-b)!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
</style>`;

const arr=key=>{const v=global.AppStore?.data?.(key);return Array.isArray(v)?v:[]};
const norm=v=>String(v||'').replace(/\s+/g,'').replace(/[-_/\\]/g,'').toLocaleLowerCase('tr-TR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function teacherName(id){const o=arr('ogretmenler').find(x=>String(x.id)===String(id));return o?String(o.adSoyad||`${o.ad||''} ${o.soyad||''}`).trim():''}
function classTeacherName(className){
  const key=norm(className);if(!key)return'';
  const cls=arr('siniflar').find(x=>norm(x.ad||x.sinifAdi||x.sinif)===key)||{};
  const id=cls.sinifOgretmeniId||cls.ogretmenId||cls.rehberOgretmenId||'';
  const direct=id?teacherName(id):'';
  if(direct)return direct;
  const fallback=arr('ogretmenler').find(o=>norm(o.sorumluSinif||o.sinif||o.sinifi)===key);
  return fallback?teacherName(fallback.id):'';
}
function injectClassTeacher(body){
  let html=String(body||'');
  if(!/SINIF[Iİ]?[^<]{0,30}DERS\s+PROGRAMI/i.test(html))return html;
  return html.replace(/<h1([^>]*)>([^<]+)<\/h1>/gi,(whole,attrs,text)=>{
    if(!/SINIF[Iİ]?[^\n]*DERS\s+PROGRAMI/i.test(text))return whole;
    const prefix=String(text).split(/\s+SINIF[Iİ]?\b/i)[0].trim();
    const name=classTeacherName(prefix);
    if(!name)return whole;
    const tail=html.slice(html.indexOf(whole)+whole.length,html.indexOf(whole)+whole.length+180);
    if(/Sınıf Öğretmeni:/i.test(tail))return whole;
    return `${whole}<span class="ka-sr-class-teacher">Sınıf Öğretmeni: ${esc(name)}</span>`;
  });
}
function isScheduleReport(opts){return String(opts?.extraHead||'').includes('.ka-sr-report')}

function patchReportEngine(engine){
  if(!engine?.printReport||engine.printReport.__kaScheduleColumnZebra)return false;
  const original=engine.printReport.bind(engine);
  const wrapped=function(title,body,opts={}){
    const schedule=isScheduleReport(opts);
    /* Ortak stil ekStil ile gider: extraHead'e eklenseydi her rapor "özel CSS'li" sayılıp akış kipi (her sayfada üst/alt boşluk) kapanırdı. */
    return original(title,schedule?injectClassTeacher(body):body,{...opts,ekStil:GLOBAL_SOFT_STYLE+(schedule?COLUMN_ZEBRA_STYLE:'')});
  };
  wrapped.__kaScheduleColumnZebra=true;
  wrapped.__kaReportSoftFill=true;
  engine.printReport=wrapped;
  return true;
}

function installReportPatch(){
  if(patchReportEngine(global.ReportEngine))return true;
  const desc=Object.getOwnPropertyDescriptor(global,'ReportEngine');
  if(desc&&!desc.configurable)return false;
  let current=desc&&Object.prototype.hasOwnProperty.call(desc,'value')?desc.value:undefined;
  Object.defineProperty(global,'ReportEngine',{
    configurable:true,enumerable:true,get(){return current},set(value){
      current=value;patchReportEngine(value);
      Object.defineProperty(global,'ReportEngine',{configurable:true,enumerable:true,writable:true,value});
    }
  });
  return true;
}

global.ScheduleReportColumnZebra={install:installReportPatch,patchReportEngine,isScheduleReport,COLUMN_ZEBRA_STYLE,GLOBAL_SOFT_STYLE,injectClassTeacher,classTeacherName};
installReportPatch();
})(window);
