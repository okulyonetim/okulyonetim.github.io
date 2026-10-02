/* Koruk Asistan — Merkezi rapor özelleştirme katmanı
 * ReportEngine.printReport() çağrılarını sarmalar. Başlıklar, üst başlık,
 * okul adı, tarih, logo ve tablo sütunları rapor üretilmeden önce seçilebilir.
 */
(function(global){
'use strict';
if(global.ReportCustomizer)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
let patched=false,patchTimer=null;
const styleId='ka-report-customizer-style';
function installStyle(){
 if(document.getElementById(styleId))return;
 const s=document.createElement('style');s.id=styleId;s.textContent=`
 .ka-report-customizer-backdrop{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.68);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
 .ka-report-customizer{width:min(760px,100%);max-height:min(92vh,900px);overflow:auto;background:var(--ka-card-bg,#171717);color:var(--ka-text,#fff);border:1px solid var(--ka-border,#3a3a3a);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
 .ka-report-customizer__head{padding:18px 20px;border-bottom:1px solid var(--ka-border,#333);position:sticky;top:0;background:var(--ka-card-bg,#171717);z-index:2}
 .ka-report-customizer__head h2{margin:0;font-size:20px}.ka-report-customizer__head p{margin:5px 0 0;color:var(--ka-text-muted,#aaa);font-size:13px}
 .ka-report-customizer__body{padding:16px 20px}.ka-report-customizer__section{border:1px solid var(--ka-border,#333);border-radius:14px;padding:13px;margin-bottom:12px}
 .ka-report-customizer__section>strong{display:block;margin-bottom:10px}.ka-report-customizer__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .ka-report-customizer label{display:flex;gap:9px;align-items:center;min-height:36px}.ka-report-customizer input[type=text],.ka-report-customizer select{width:100%;box-sizing:border-box;border:1px solid var(--ka-border,#444);border-radius:10px;background:var(--ka-input-bg,#111);color:var(--ka-text,#fff);padding:10px}
 .ka-report-customizer__field{display:block}.ka-report-customizer__field span{display:block;font-size:12px;color:var(--ka-text-muted,#aaa);margin-bottom:5px}
 .ka-report-customizer__footer{display:flex;gap:8px;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--ka-border,#333);position:sticky;bottom:0;background:var(--ka-card-bg,#171717);z-index:2}
 .ka-report-customizer__footer button{border:1px solid var(--ka-border,#444);border-radius:10px;padding:10px 15px;background:transparent;color:var(--ka-text,#fff);font-weight:700}.ka-report-customizer__footer button.primary{background:var(--ka-accent,#ffc400);color:#111;border-color:var(--ka-accent,#ffc400)}
 .ka-report-customizer__list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 14px}.ka-report-customizer__muted{color:var(--ka-text-muted,#aaa);font-size:12px}
 @media(max-width:560px){.ka-report-customizer__grid,.ka-report-customizer__list{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}
function parseBody(body){const doc=new DOMParser().parseFromString(`<div id="ka-report-customizer-root">${String(body||'')}</div>`,'text/html');return doc.querySelector('#ka-report-customizer-root');}
function tables(root){return [...root.querySelectorAll('table')];}
function headings(root){return [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,.bolum-baslik,[data-report-heading]')];}
function ask(title,body,opts){
 installStyle();
 const root=parseBody(body),ts=tables(root),hs=headings(root);
 const backdrop=document.createElement('div');backdrop.className='ka-report-customizer-backdrop';
 const tableSections=ts.map((table,ti)=>{const cells=[...table.querySelectorAll('thead th')];if(!cells.length)return '';return `<div class="ka-report-customizer__section"><strong>Tablo ${ti+1} — Sütunlar</strong><div class="ka-report-customizer__list">${cells.map((th,i)=>`<label><input type="checkbox" checked data-rc-table="${ti}" data-rc-col="${i}"><span>${esc(th.textContent.trim()||`Sütun ${i+1}`)}</span></label>`).join('')}</div></div>`}).join('');
 const headingSection=hs.length?`<div class="ka-report-customizer__section"><strong>Rapor içindeki başlıklar</strong><div class="ka-report-customizer__list">${hs.map((h,i)=>`<label><input type="checkbox" checked data-rc-heading="${i}"><span>${esc((h.textContent||'').trim()||`Başlık ${i+1}`)}</span></label>`).join('')}</div></div>`:'';
 backdrop.innerHTML=`<form class="ka-report-customizer"><div class="ka-report-customizer__head"><h2>Raporu Özelleştir</h2><p>${esc(title||'Rapor')} — Yazdırma, PDF, görsel ve paylaşım bu seçimleri kullanır.</p></div><div class="ka-report-customizer__body">
 <div class="ka-report-customizer__section"><strong>Rapor başlıkları</strong><div class="ka-report-customizer__grid">
 <label class="ka-report-customizer__field"><span>Ana başlık</span><input type="text" name="title" value="${esc(title||'Rapor')}"></label>
 <label class="ka-report-customizer__field"><span>Üst başlık</span><input type="text" name="ustBaslik" value="${esc(opts.ustBaslik||'')}"></label>
 <label class="ka-report-customizer__field"><span>Okul adı</span><input type="text" name="okulAdi" value="${esc(opts.okulAdi||'')}"></label>
 <label class="ka-report-customizer__field"><span>Dosya adı</span><input type="text" name="fileName" value="${esc(opts.fileName||title||'Koruk_Rapor')}"></label>
 </div></div>
 <div class="ka-report-customizer__section"><strong>Üst bilgi</strong><div class="ka-report-customizer__grid">
 <label><input type="checkbox" name="baslikGoster" ${opts.baslikGoster!==false?'checked':''}><span>Ana başlığı göster</span></label>
 <label><input type="checkbox" name="logoGoster" ${opts.logoGoster!==false?'checked':''}><span>Okul logosunu göster</span></label>
 <label><input type="checkbox" name="tarihGoster" ${opts.tarihGoster!==false?'checked':''}><span>Tarihi göster</span></label>
 <label><input type="checkbox" name="schoolGoster" checked><span>Okul adını göster</span></label>
 </div></div>
 ${headingSection}${tableSections||'<div class="ka-report-customizer__section"><strong>Veri alanları</strong><div class="ka-report-customizer__muted">Bu raporda tablo sütunu bulunamadı. Başlık ve üst bilgi alanlarını yine özelleştirebilirsiniz.</div></div>'}
 </div><div class="ka-report-customizer__footer"><button type="button" data-rc-cancel>Vazgeç</button><button type="submit" class="primary">Raporu Oluştur</button></div></form>`;
 document.body.appendChild(backdrop);
 return new Promise(resolve=>{
  const form=backdrop.querySelector('form');
  const done=value=>{backdrop.remove();resolve(value)};
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)done(null)});
  form.querySelector('[data-rc-cancel]').addEventListener('click',()=>done(null));
  form.addEventListener('submit',e=>{e.preventDefault();
   const selectedColumns={};ts.forEach((_,ti)=>{selectedColumns[ti]=[...form.querySelectorAll(`[data-rc-table="${ti}"]:checked`)].map(x=>Number(x.dataset.rcCol))});
   const selectedHeadings=[...form.querySelectorAll('[data-rc-heading]:checked')].map(x=>Number(x.dataset.rcHeading));
   done({title:String(form.title.value||title||'Rapor').trim()||'Rapor',body:root.innerHTML,ustBaslik:String(form.ustBaslik.value||'').trim(),okulAdi:String(form.okulAdi.value||'').trim(),fileName:String(form.fileName.value||title||'Koruk_Rapor').trim()||'Koruk_Rapor',baslikGoster:form.baslikGoster.checked,logoGoster:form.logoGoster.checked,tarihGoster:form.tarihGoster.checked,schoolGoster:form.schoolGoster.checked,selectedColumns,selectedHeadings,tableCount:ts.length});
  });
 });
}
function applySelection(body,selection){
 const root=parseBody(body),ts=tables(root),hs=headings(root);
 ts.forEach((table,ti)=>{const keep=new Set(selection.selectedColumns?.[ti]||[]);[...table.rows].forEach(row=>[...row.cells].forEach((cell,i)=>{if(!keep.has(i))cell.remove()}));});
 const selected=new Set(selection.selectedHeadings||[]);hs.forEach((h,i)=>{if(!selected.has(i))h.remove()});
 return root.innerHTML;
}
async function wrappedPrint(original,title,body,opts={}){
 if(opts.ozellestirilebilir===false)return original(title,body,opts);
 const result=await ask(title,body,opts);
 if(!result)return original(title,body,opts);
 const nextBody=applySelection(body,result);
 const nextOpts={...opts,title:result.title,ustBaslik:result.ustBaslik,okulAdi:result.okulAdi,baslikGoster:result.baslikGoster,logoGoster:result.logoGoster,tarihGoster:result.tarihGoster,fileName:result.fileName};
 if(!result.schoolGoster)nextOpts.okulAdi='';
 nextOpts.ozellestirilebilir=false;
 return original(result.title,nextBody,nextOpts);
}
function patch(){
 if(patched||!global.ReportEngine?.printReport)return false;
 const original=global.ReportEngine.printReport.bind(global.ReportEngine);
 global.ReportEngine.printReport=function(title,body,opts={}){return wrappedPrint(original,title,body,opts)};
 patched=true;return true;
}
function watch(){if(patch())return;let tries=0;patchTimer=setInterval(()=>{if(patch()||++tries>180){clearInterval(patchTimer);patchTimer=null}},250)}
installStyle();watch();
global.ReportCustomizer={patch,applySelection};
})(window);
