/* Okul Yönetim — rapor görünümü + ders programı sütun zebrası + menü pull refresh.
 * Merkezi ReportEngine tüm raporlarda toner dostu çok hafif dolgu kullanır.
 * Ders programlarında gün sütunları kendi hafif zebra önceliğini korur.
 * Alt navigasyondaki Menü yüzeyi açıkken, menü en üstteyse aşağı çekme yeniler.
 */
(function(global){
'use strict';
if(global.ScheduleReportColumnZebra)return;

const GLOBAL_SOFT_STYLE=`<style data-ka-report-soft-fill>
.ka-report table th{background:#f3f6f4!important;color:#173e32!important;border-color:#9baba4!important}
.ka-report tbody tr:nth-child(even)>td{background:#fbfcfb!important}
.ka-report .bolum-baslik{background:#f7f9f8!important}
.ka-report .ka-sr-report .ka-sr-neutral{background:#f8faf9!important}
.ka-report .ka-sr-report .scope{background:#f8faf9!important}
.ka-report .ka-sr-class-teacher{display:block;margin:.45mm 0 0;font-size:8pt;line-height:1.08;font-weight:700;color:#53645d;text-align:center}
</style>`;

const COLUMN_ZEBRA_STYLE=`<style data-ka-schedule-column-zebra>
.ka-report .ka-sr-report tbody tr>td.ka-sr-day-a{background:#fbfdfc!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
.ka-report .ka-sr-report tbody tr>td.ka-sr-day-b{background:#fff!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
.ka-report .ka-sr-report thead tr>th.ka-sr-day-a{background:#f3f7f5!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
.ka-report .ka-sr-report thead tr>th.ka-sr-day-b{background:#fafcfb!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
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
    const extra=String(opts.extraHead||'')+GLOBAL_SOFT_STYLE+(schedule?COLUMN_ZEBRA_STYLE:'');
    return original(title,schedule?injectClassTeacher(body):body,{...opts,extraHead:extra});
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

function installMenuPullRefresh(){
  if(global.__kaMenuPullRefresh)return;global.__kaMenuPullRefresh=true;
  const ARM=96,MAX=78,DEAD=8;let tracking=false,armed=false,startX=0,startY=0,reloading=false;
  const menuFor=t=>t?.closest?.('.ka-menu-layer:not([hidden])');
  function scroller(target,menu){for(let el=target instanceof Element?target:null;el&&el!==menu.parentElement;el=el.parentElement){const s=getComputedStyle(el);if((s.overflowY==='auto'||s.overflowY==='scroll'||s.overflowY==='overlay')&&el.scrollHeight>el.clientHeight+2)return el;if(el===menu)break}return menu}
  function indicator(){let el=document.getElementById('kaPullRefreshIndicator');if(el)return el;el=document.createElement('div');el.id='kaPullRefreshIndicator';el.hidden=true;el.setAttribute('aria-hidden','true');el.innerHTML='<img src="assets/icon-192.png" alt=""><span>Yenilemek için çek</span>';document.body.appendChild(el);return el}
  function draw(dy){const el=indicator(),visual=Math.min(MAX,Math.max(0,dy)*.48);armed=dy>=ARM;el.hidden=visual<2;el.classList.toggle('is-armed',armed);el.classList.remove('is-refreshing');el.style.setProperty('--ka-pull-y',`${Math.round(visual)}px`);const label=el.querySelector('span');if(label)label.textContent=armed?'Bırakınca yenile':'Yenilemek için çek'}
  function reset(){tracking=false;armed=false;if(reloading)return;const el=document.getElementById('kaPullRefreshIndicator');if(el){el.classList.remove('is-armed','is-refreshing');el.style.setProperty('--ka-pull-y','0px');el.hidden=true}}
  document.addEventListener('touchstart',e=>{if(reloading||e.touches?.length!==1)return;const menu=menuFor(e.target);if(!menu)return;const s=scroller(e.target,menu);if(Number(s?.scrollTop||0)>1)return;tracking=true;armed=false;startX=e.touches[0].clientX;startY=e.touches[0].clientY},{capture:true,passive:true});
  document.addEventListener('touchmove',e=>{if(!tracking||reloading||e.touches?.length!==1)return;const menu=menuFor(e.target);if(!menu){reset();return}const s=scroller(e.target,menu),t=e.touches[0],dx=t.clientX-startX,dy=t.clientY-startY;if(Number(s?.scrollTop||0)>1||dy<0||Math.abs(dx)>Math.abs(dy)+8){reset();return}if(dy<=DEAD)return;e.preventDefault();draw(dy)},{capture:true,passive:false});
  document.addEventListener('touchend',()=>{if(!tracking||reloading){if(!reloading)reset();return}const refresh=armed;tracking=false;armed=false;if(!refresh){reset();return}reloading=true;const el=indicator();el.hidden=false;el.classList.remove('is-armed');el.classList.add('is-refreshing');el.style.setProperty('--ka-pull-y','74px');const label=el.querySelector('span');if(label)label.textContent='Yenileniyor…';setTimeout(()=>global.location.reload(),120)},{capture:true,passive:true});
  document.addEventListener('touchcancel',reset,{capture:true,passive:true});
}

global.ScheduleReportColumnZebra={install:installReportPatch,patchReportEngine,isScheduleReport,COLUMN_ZEBRA_STYLE,GLOBAL_SOFT_STYLE,injectClassTeacher,classTeacherName,installMenuPullRefresh};
installReportPatch();installMenuPullRefresh();
})(window);
