/* Okul Yönetim — rapor görünümü + ders programı sütun zebrası + menü pull refresh.
 * Merkezi ReportEngine tüm raporlarda toner dostu çok hafif dolgu kullanır.
 * Ders programlarında gün sütunları kendi hafif zebra önceliğini korur.
 * Alt navigasyondaki Menü yüzeyi açıkken, menü en üstteyse aşağı çekme yeniler.
 * Ders programı önizlemesi: gerçek A4 ölçüsü + Yazdır/Görsel/Paylaş araçları.
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

function ensureHtml2Canvas(){
  if(global.html2canvas)return Promise.resolve(global.html2canvas);
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>/html2canvas/i.test(s.src||''));
    if(existing){existing.addEventListener('load',()=>global.html2canvas?resolve(global.html2canvas):reject(new Error('Görsel motoru yüklenemedi.')),{once:true});existing.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';s.async=true;s.onload=()=>global.html2canvas?resolve(global.html2canvas):reject(new Error('Görsel motoru yüklenemedi.'));s.onerror=()=>reject(new Error('Görsel motoru yüklenemedi.'));document.head.appendChild(s);
  });
}
function safeName(v,def='Ders_Programi'){return String(v||def).replace(/[^\w\sÇĞİÖŞÜçğıöşü-]/g,'').trim().replace(/\s+/g,'_')||def}
function setRealA4Preview(iframe,yon){
  if(!iframe)return;
  const land=yon==='yatay',w=land?1122:794,h=land?794:1122;
  const body=iframe.parentElement;
  if(body){body.style.cssText='padding:12px;overflow:auto;width:100%;box-sizing:border-box;';body.classList.add('ka-schedule-a4-viewport');}
  iframe.style.cssText=`display:block;flex:none;width:${w}px;height:${h}px;max-width:none;min-width:${w}px;border:1px solid var(--ka-border,#ddd);border-radius:12px;background:#fff;box-sizing:border-box;`;
}
function reportPreviewActions(preview,title,yon){
  if(!preview)return false;
  const modal=preview.querySelector('.ka-report-preview-modal'),header=modal?.querySelector('.ka-modal__header'),body=modal?.querySelector('.ka-modal__body'),iframe=modal?.querySelector('iframe');
  if(!modal||!header||!body||!iframe)return false;
  if(preview.dataset.kaScheduleActions==='1'){setRealA4Preview(iframe,yon);return true}
  preview.dataset.kaScheduleActions='1';
  const actions=document.createElement('div');
  actions.className='ka-schedule-report-actions';
  actions.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 12px;width:100%;position:relative;z-index:5;';
  actions.innerHTML='<button type="button" class="ka-btn ka-btn--secondary ka-report-preview__print">🖨 Yazdır</button><button type="button" class="ka-btn ka-btn--secondary ka-report-preview__image">🖼 Görsel</button><button type="button" class="ka-btn ka-btn--secondary ka-report-preview__share">↗ Paylaş</button>';
  body.prepend(actions);
  setRealA4Preview(iframe,yon);
  const capture=async()=>{
    const doc=iframe.contentDocument,target=doc?.querySelector('.ka-report');
    if(!target)throw new Error('Rapor görseli hazırlanamadı.');
    const fn=await ensureHtml2Canvas();
    const canvas=await fn(target,{backgroundColor:'#fff',scale:Math.min(2,Math.max(1,global.devicePixelRatio||1)),useCORS:true,allowTaint:false,logging:false});
    return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Görsel oluşturulamadı.')),'image/png',1));
  };
  const download=async()=>{const blob=await capture(),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=safeName(title)+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)};
  const downloadBlobLocal=async(blob,name)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)};
  const share=async()=>{const blob=await capture(),name=safeName(title)+'.png',file=new File([blob],name,{type:'image/png'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:String(title||'Ders Programı'),files:[file]});return}await downloadBlobLocal(blob,name)};
  actions.querySelector('.ka-report-preview__print').onclick=async()=>{try{const engine=global.ReportEngine;if(!engine?.printHtml)throw new Error('Yazdırma motoru hazır değil.');const docHtml=iframe.contentDocument?.documentElement?.outerHTML;if(!docHtml)throw new Error('Rapor yazdırma içeriği hazır değil.');await engine.printHtml('<!doctype html>'+docHtml,title||'Ders Programı',yon||'yatay')}catch(err){global.toast?.(err?.message||'Yazdırma başlatılamadı.')}};
  actions.querySelector('.ka-report-preview__image').onclick=async e=>{const b=e.currentTarget;b.disabled=true;const old=b.textContent;b.textContent='⏳ Hazırlanıyor…';try{await download()}catch(err){global.toast?.(err?.message||'Görsel oluşturulamadı.')}finally{b.disabled=false;b.textContent=old}};
  actions.querySelector('.ka-report-preview__share').onclick=async e=>{const b=e.currentTarget;b.disabled=true;const old=b.textContent;b.textContent='⏳ Hazırlanıyor…';try{await share()}catch(err){if(err?.name!=='AbortError')global.toast?.(err?.message||'Paylaşım başlatılamadı.')}finally{b.disabled=false;b.textContent=old}};
  return true;
}

function patchReportEngine(engine){
  if(!engine?.printReport||engine.printReport.__kaScheduleColumnZebra)return false;
  const original=engine.printReport.bind(engine);
  const wrapped=function(title,body,opts={}){
    const schedule=isScheduleReport(opts);
    const extra=String(opts.extraHead||'')+GLOBAL_SOFT_STYLE+(schedule?COLUMN_ZEBRA_STYLE:'');
    const result=original(title,schedule?injectClassTeacher(body):body,{...opts,extraHead:extra});
    if(schedule){
      Promise.resolve(result).then(()=>{
        const preview=document.getElementById('kaReportPreview');
        if(preview)reportPreviewActions(preview,title,opts.yon||'yatay');
      }).catch(()=>{});
    }
    return result;
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
  if(global.__kaMenuPullRefresh)return;
  if(typeof document==='undefined'||typeof Element==='undefined'||typeof getComputedStyle!=='function')return;
  global.__kaMenuPullRefresh=true;
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

global.ScheduleReportColumnZebra={install:installReportPatch,patchReportEngine,isScheduleReport,COLUMN_ZEBRA_STYLE,GLOBAL_SOFT_STYLE,injectClassTeacher,classTeacherName,reportPreviewActions,installMenuPullRefresh};
installReportPatch();installMenuPullRefresh();
})(window);
