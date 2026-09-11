/* Okul Yönetim — ders programı raporlarında yalnız gün sütunlarına zebra dolgusu.
 * Merkezi ReportEngine diğer raporlarda satır zebra kullanmaya devam eder;
 * bu katman yalnız ScheduleReportRedesign çıktılarında gün sütunu rengini önceliklendirir.
 */
(function(global){
'use strict';
if(global.ScheduleReportColumnZebra)return;

const COLUMN_ZEBRA_STYLE=`<style data-ka-schedule-column-zebra>
.ka-report .ka-sr-report tbody tr>td.ka-sr-day-a{background:#f4f8f6!important}
.ka-report .ka-sr-report tbody tr>td.ka-sr-day-b{background:#fff!important}
.ka-report .ka-sr-report thead tr>th.ka-sr-day-a{background:#eaf2ee!important}
.ka-report .ka-sr-report thead tr>th.ka-sr-day-b{background:#f7faf8!important}
</style>`;

function isScheduleReport(opts){
  return String(opts?.extraHead||'').includes('.ka-sr-report');
}

function patchReportEngine(engine){
  if(!engine?.printReport||engine.printReport.__kaScheduleColumnZebra)return false;
  const original=engine.printReport.bind(engine);
  const wrapped=function(title,body,opts={}){
    if(!isScheduleReport(opts))return original(title,body,opts);
    const next={...opts,extraHead:String(opts.extraHead||'')+COLUMN_ZEBRA_STYLE};
    return original(title,body,next);
  };
  wrapped.__kaScheduleColumnZebra=true;
  engine.printReport=wrapped;
  return true;
}

function install(){
  if(patchReportEngine(global.ReportEngine))return true;
  const desc=Object.getOwnPropertyDescriptor(global,'ReportEngine');
  if(desc&&!desc.configurable)return false;
  let current=desc&&Object.prototype.hasOwnProperty.call(desc,'value')?desc.value:undefined;
  Object.defineProperty(global,'ReportEngine',{
    configurable:true,
    enumerable:true,
    get(){return current},
    set(value){
      current=value;
      patchReportEngine(value);
      Object.defineProperty(global,'ReportEngine',{configurable:true,enumerable:true,writable:true,value});
    }
  });
  return true;
}

global.ScheduleReportColumnZebra={install,patchReportEngine,isScheduleReport,COLUMN_ZEBRA_STYLE};
install();
})(window);
