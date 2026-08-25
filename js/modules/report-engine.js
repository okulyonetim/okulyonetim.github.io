/* Koruk Asistan — Tek Rapor Motoru
 * Rapor görünümü css/design-system.css içindeki --ka-report-* tokenları ve .ka-report sınıflarıyla yönetilir.
 * Android: PrintPlugin.yazdir; Web/PWA: tarayıcı yazdırma penceresi.
 */
(function(global){
'use strict';
if(global.ReportEngine)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fileName(v){return String(v||'Koruk_Rapor').replace(/[^\w\sÇĞİÖŞÜçğıöşü-]/g,'').trim().replace(/\s+/g,'_')||'Koruk_Rapor';}
function styleUrl(){try{return new URL('css/design-system.css',global.location.href).href}catch(_){return'css/design-system.css'}}
function documentHtml(title,body,{yon='dikey',extraHead=''}={}){const page=yon==='yatay'?'A4 landscape':'A4 portrait';return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><link rel="stylesheet" href="${esc(styleUrl())}"><style>@page{size:${page};margin:0}html,body{margin:0;padding:0;background:#fff}.ka-report{box-shadow:none}</style>${extraHead}</head><body><main class="ka-report">${body}</main></body></html>`;}
function nativePlugin(){try{return global.Capacitor?.isNativePlatform?.()&&global.Capacitor?.Plugins?.PrintPlugin}catch(_){return null}}
async function printHtml(html,name='Koruk_Rapor',yon='dikey'){const plugin=nativePlugin();if(plugin?.yazdir)return plugin.yazdir({html,isAdi:fileName(name),yon:yon==='yatay'?'yatay':'dikey'});const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),win=global.open(url,'_blank');if(!win){URL.revokeObjectURL(url);throw new Error('Açılır pencere engellendi.');}const clean=()=>setTimeout(()=>URL.revokeObjectURL(url),1000);win.addEventListener?.('load',()=>setTimeout(()=>{try{win.focus();win.print();}finally{clean()}},120),{once:true});setTimeout(clean,60000);return{web:true};}
async function printReport(title,body,opts={}){return printHtml(documentHtml(title,body,opts),opts.fileName||title,opts.yon||'dikey');}
global.ReportEngine={esc,fileName,styleUrl,documentHtml,printHtml,printReport};
global.uygulamaHtmlYazdir=(html,dosyaAdi,yon)=>printHtml(html,dosyaAdi,yon);
})(window);
