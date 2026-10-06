/* Koruk Asistan — ortak rapor çıktı/paylaşım köprüsü */
(function(w){
'use strict';
if(w.KAReportOutputBridge)return;
const MIME={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',png:'image/png'};
function blob(value,type){if(value instanceof Blob)return value;return new Blob([value],{type});}
async function share(file, title){
  if(w.navigator?.share && (!w.navigator.canShare || w.navigator.canShare({files:[file]}))){try{await w.navigator.share({title:title||'Koruk Asistan Raporu',files:[file]});return true}catch(e){if(e?.name==='AbortError')return false;}}
  return false;
}
function download(file,name){const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
async function exportBlob(format,data,name,options={}){const key=String(format||'').toLowerCase();const file=blob(data,MIME[key]||'application/octet-stream');const filename=name||`koruk-rapor.${key}`;if(options.share){const ok=await share(new File([file],filename,{type:file.type}),options.title);if(ok)return{shared:true,file}}download(file,filename);return{downloaded:true,file};}
async function fromElement(format,element,name,options={}){if(!element)throw new Error('Rapor alanı bulunamadı.');const key=String(format||'').toLowerCase();if(key==='png'){const canvas=await w.html2canvas?.(element);if(!canvas)throw new Error('PNG üreticisi mevcut değil.');return exportBlob('png',await new Promise(r=>canvas.toBlob(r,'image/png')),name||'rapor.png',options)}if(key==='pdf'){if(w.ReportEngine?.printReport){await w.ReportEngine.printReport(element,options);return{printed:true}}}if(key==='docx'||key==='xlsx'){const html=element.outerHTML;return exportBlob(key,html,name||`rapor.${key}`,options)}throw new Error(`Desteklenmeyen rapor formatı: ${key}`)}
w.KAReportOutputBridge={exportBlob,fromElement,share,download,mime:MIME};
})(window);