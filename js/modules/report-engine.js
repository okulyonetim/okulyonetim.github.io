/* Koruk Asistan — Tek Rapor Motoru
 * Rapor görünümü css/design-system.css içindeki --ka-report-* tokenları ve .ka-report sınıflarıyla yönetilir.
 * Akış: A4 önizleme -> Android PrintPlugin / Web yazdırma.
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
function closePreview(){document.getElementById('kaReportPreview')?.remove();}
function previewHtml(html,{title='Rapor Önizleme',fileName:name=title,yon='dikey'}={}){closePreview();const ov=document.createElement('div');ov.id='kaReportPreview';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div class="ka-grow"><strong>${esc(title)}</strong><div class="ka-muted">${yon==='yatay'?'Yatay':'Dikey'} A4 önizleme</div></div><button class="ka-btn ka-btn--secondary ka-btn--sm" data-report-close type="button">Kapat</button></div><div class="ka-modal__body"><iframe id="kaReportFrame" class="ka-media" width="100%" height="700" title="${esc(title)}"></iframe></div><div class="ka-modal__footer"><button class="ka-btn" data-report-print type="button">🖨 Yazdır / PDF Kaydet</button></div></section>`;document.body.appendChild(ov);const frame=ov.querySelector('#kaReportFrame');frame.srcdoc=html;ov.querySelector('[data-report-close]').onclick=closePreview;ov.querySelector('[data-report-print]').onclick=async()=>{const b=ov.querySelector('[data-report-print]');b.disabled=true;b.textContent='Hazırlanıyor…';try{await printHtml(html,name,yon);}catch(e){try{toast?.('Yazdırma açılamadı: '+(e?.message||e));}catch(_){}}finally{b.disabled=false;b.textContent='🖨 Yazdır / PDF Kaydet';}};return ov;}
async function printReport(title,body,opts={}){const html=documentHtml(title,body,opts);return previewHtml(html,{title,fileName:opts.fileName||title,yon:opts.yon||'dikey'});}
global.ReportEngine={esc,fileName,styleUrl,documentHtml,printHtml,previewHtml,closePreview,printReport};
global.uygulamaHtmlYazdir=(html,dosyaAdi,yon)=>previewHtml(html,{title:dosyaAdi||'Rapor Önizleme',fileName:dosyaAdi||'Koruk_Rapor',yon:yon||'dikey'});
})(window);
