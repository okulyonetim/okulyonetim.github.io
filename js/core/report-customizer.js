/* Koruk Asistan — Merkezi rapor özelleştirme katmanı (v2)
 * ReportEngine.printReport() çağrılarını sarmalar.
 *
 *  - Tablo sütunları seçilir / kaldırılır / yeniden adlandırılır / ↑ ↓ ile SIRALANIR.
 *  - Rapor satırları seçilen sütuna göre artan / azalan SIRALANIR (iki ölçüte kadar).
 *  - Sadece "basit" tablolara dokunur (tek başlık satırı, birleştirilmiş hücre yok).
 *    Karmaşık/özel tablolar olduğu gibi korunur.
 *  - Özel raporlar (puantaj, imza sirküsü, dilekçe, maaş değişikliği, denetim formları ...)
 *    ve opts.ozellestirilebilir===false olan raporlar HİÇ değiştirilmez.
 *  - ReportEngine geç yüklense bile (lazy) yama kalıcıdır: süre sınırı yoktur.
 */
(function(global){
'use strict';
if(global.ReportCustomizer&&global.ReportCustomizer.version>=2)return;
const VERSION=2;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const styleId='ka-report-customizer-style';
const STORE_PREFIX='ka-report-customizer:v2:';
const RESET=Symbol('reset');
let closeCurrent=null;

/* ------------------------------------------------------------------ */
/* Stil                                                                */
/* ------------------------------------------------------------------ */
function installStyle(){
 let s=document.getElementById(styleId);
 if(s&&s.dataset.v==='2')return;
 if(!s){s=document.createElement('style');s.id=styleId;document.head.appendChild(s)}
 s.dataset.v='2';
 s.textContent=`
 .ka-report-customizer-backdrop{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.68);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}
 .ka-report-customizer{width:min(820px,100%);max-height:min(94vh,920px);overflow:auto;background:var(--ka-card-bg,#171717);color:var(--ka-text,#fff);border:1px solid var(--ka-border,#3a3a3a);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
 .ka-report-customizer__head{padding:18px 20px;border-bottom:1px solid var(--ka-border,#333);position:sticky;top:0;background:var(--ka-card-bg,#171717);z-index:2}
 .ka-report-customizer__head h2{margin:0;font-size:20px}.ka-report-customizer__head p{margin:5px 0 0;color:var(--ka-text-muted,#aaa);font-size:13px}
 .ka-report-customizer__body{padding:16px 20px}.ka-report-customizer__section{border:1px solid var(--ka-border,#333);border-radius:14px;padding:13px;margin-bottom:12px}
 .ka-report-customizer__section>strong{display:block;margin-bottom:10px}.ka-report-customizer__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .ka-report-customizer label{display:flex;gap:9px;align-items:center;min-height:36px}.ka-report-customizer input[type=text],.ka-report-customizer select{width:100%;box-sizing:border-box;border:1px solid var(--ka-border,#444);border-radius:10px;background:var(--ka-input-bg,#111);color:var(--ka-text,#fff);padding:10px;font:inherit}
 .ka-report-customizer__field{display:block}.ka-report-customizer__field span,.ka-report-customizer__hint{display:block;font-size:12px;color:var(--ka-text-muted,#aaa);margin-bottom:5px}
 .ka-report-customizer__list{display:flex;flex-direction:column;gap:7px}.ka-report-customizer__item{display:grid;grid-template-columns:auto 1fr auto auto;gap:7px;align-items:center;padding:7px;border:1px solid var(--ka-border,#333);border-radius:10px;background:var(--ka-surface,#202020)}
 .ka-report-customizer__item input[type=text]{padding:8px}.ka-report-customizer__move{display:flex;gap:4px}.ka-report-customizer__move button,.ka-report-customizer__remove{width:36px;height:36px;border:1px solid var(--ka-border,#444);border-radius:8px;background:transparent;color:var(--ka-text,#fff);font-weight:800;cursor:pointer}.ka-report-customizer__move button:disabled{opacity:.3}.ka-report-customizer__remove{font-size:15px}
 .ka-report-customizer__sort{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
 .ka-report-customizer__sortlabel{font-size:12px;color:var(--ka-text-muted,#aaa);margin:2px 0 4px}
 .ka-report-customizer__note{font-size:12px;color:var(--ka-text-muted,#aaa);padding:8px 10px;border:1px dashed var(--ka-border,#444);border-radius:10px;margin-bottom:12px}
 .ka-report-customizer__footer{display:flex;gap:8px;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--ka-border,#333);position:sticky;bottom:0;background:var(--ka-card-bg,#171717);z-index:2;flex-wrap:wrap}
 .ka-report-customizer__footer button{border:1px solid var(--ka-border,#444);border-radius:10px;padding:10px 15px;background:transparent;color:var(--ka-text,#fff);font-weight:700}.ka-report-customizer__footer button.primary{background:var(--ka-accent,#ffc400);color:#111;border-color:var(--ka-accent,#ffc400)}
 .ka-report-customizer__footer [data-rc-reset]{margin-right:auto}
 @media(max-width:560px){.ka-report-customizer__grid,.ka-report-customizer__sort{grid-template-columns:1fr}.ka-report-customizer__item{grid-template-columns:auto 1fr}.ka-report-customizer__move{grid-column:2}.ka-report-customizer__remove{grid-column:2;justify-self:end;grid-row:1}}
 `;
}

/* ------------------------------------------------------------------ */
/* Tablo yardımcıları                                                  */
/* ------------------------------------------------------------------ */
function parseBody(body){const doc=new DOMParser().parseFromString(`<div id="ka-report-customizer-root">${String(body||'')}</div>`,'text/html');return doc.querySelector('#ka-report-customizer-root')}
function allTables(root){return [...root.querySelectorAll('table')]}
function headings(root){return [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,.bolum-baslik,[data-report-heading]')]}
const cellText=c=>String(c?.textContent||'').replace(/\s+/g,' ').trim();
function headerCells(table){
 const head=table.tHead;
 if(!head||head.rows.length!==1)return [];
 return [...head.rows[0].cells];
}
function dataRows(table){return [...table.rows].filter(r=>{const p=r.parentElement?.tagName;return p!=='THEAD'&&p!=='TFOOT'})}
/* Basit tablo: tek başlık satırı, birleştirilmiş hücre yok, tüm satırlar aynı sütun sayısında */
function isSimpleTable(table){
 const hs=headerCells(table);
 if(!hs.length)return false;
 if(table.querySelector('table'))return false;
 if(table.querySelector('[colspan]:not([colspan="1"]),[rowspan]:not([rowspan="1"])'))return false;
 return [...table.rows].every(r=>r.cells.length===hs.length);
}
function isSortableTable(table){return isSimpleTable(table)&&table.tBodies.length===1}
function tableSignature(table){return headerCells(table).map(cellText).join('|')}

/* Değer ayrıştırma — sayı / tarih / metin */
function parseNumber(t){
 let s=String(t).replace(/[\s%₺]/g,'');
 if(!/^[-+]?[\d.,]+$/.test(s)||!/\d/.test(s))return NaN;
 if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');
 else if(s.includes(','))s=s.replace(',','.');
 else if(/^[-+]?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
 const n=Number(s);return Number.isFinite(n)?n:NaN;
}
function parseDate(t){
 const s=String(t).trim();let m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
 if(m){const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));return Number.isNaN(d.getTime())?NaN:d.getTime()}
 m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(m){const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));return Number.isNaN(d.getTime())?NaN:d.getTime()}
 return NaN;
}
const isEmptyText=v=>v===''||v==='—'||v==='-';
function columnKind(table,index){
 const vals=dataRows(table).map(r=>cellText(r.cells[index])).filter(v=>!isEmptyText(v));
 if(!vals.length)return 'text';
 if(vals.every(v=>!Number.isNaN(parseDate(v))))return 'date';
 if(vals.every(v=>!Number.isNaN(parseNumber(v))))return 'number';
 return 'text';
}
function rowKey(row,index,kind){
 const t=cellText(row.cells[index]);
 if(isEmptyText(t))return{empty:true,value:null};
 if(kind==='number')return{empty:false,value:parseNumber(t)};
 if(kind==='date')return{empty:false,value:parseDate(t)};
 return{empty:false,value:t};
}
const collator=new Intl.Collator('tr',{numeric:true,sensitivity:'base'});
const SEQ_HEADER=/^(s[ıi]ra|s\.?\s?no\.?|sn|#|s\.n\.?)$/i;
const TOTAL_ROW=/^(genel\s+)?toplam\b/i;

function sortTable(table,rules){
 if(!isSortableTable(table))return;
 const valid=(rules||[]).filter(r=>Number.isInteger(r?.index)&&r.index>=0&&(r.dir==='asc'||r.dir==='desc'));
 if(!valid.length)return;
 const tbody=table.tBodies[0],hs=headerCells(table);
 const rows=[...tbody.rows];
 if(rows.length<2)return;
 /* "Toplam" satırı en sonda sabit kalır */
 const firstText=r=>cellText([...r.cells].find(c=>cellText(c))||r.cells[0]);
 const pinned=rows.filter(r=>TOTAL_ROW.test(firstText(r)));
 const body=rows.filter(r=>!pinned.includes(r));
 /* Sıra no sütunu: sıralamadan önce 1..n ise sonra yeniden numaralanır */
 const seqCols=hs.map((h,i)=>({h,i})).filter(x=>SEQ_HEADER.test(cellText(x.h))).map(x=>x.i)
  .filter(i=>body.every((r,k)=>cellText(r.cells[i])===String(k+1)&&!r.cells[i].children.length));
 const kinds=valid.map(r=>columnKind(table,r.index));
 const decorated=body.map((row,pos)=>({row,pos,keys:valid.map((r,k)=>rowKey(row,r.index,kinds[k]))}));
 decorated.sort((a,b)=>{
  for(let k=0;k<valid.length;k++){
   const x=a.keys[k],y=b.keys[k];
   if(x.empty||y.empty){if(x.empty&&y.empty)continue;return x.empty?1:-1}/* boşlar her zaman sonda */
   const c=typeof x.value==='number'?x.value-y.value:collator.compare(String(x.value),String(y.value));
   if(c!==0)return valid[k].dir==='desc'?-c:c;
  }
  return a.pos-b.pos;
 });
 decorated.forEach(d=>tbody.appendChild(d.row));
 pinned.forEach(r=>tbody.appendChild(r));
 if(seqCols.length)decorated.forEach((d,k)=>seqCols.forEach(i=>{d.row.cells[i].textContent=String(k+1)}));
}

/* ------------------------------------------------------------------ */
/* Seçimi uygulama                                                     */
/* ------------------------------------------------------------------ */
function applySelection(body,selection){
 const root=parseBody(body),ts=allTables(root),hs=headings(root);
 ts.forEach((table,ti)=>{
  if(!isSimpleTable(table))return;/* karmaşık tablo: aynen korunur */
  const sortRules=selection.sortRules?.[ti];
  if(Array.isArray(sortRules)&&sortRules.length)sortTable(table,sortRules);/* önce satır sıralama (orijinal sütun indeksleriyle) */
  const list=Array.isArray(selection.selectedColumns?.[ti])?selection.selectedColumns[ti]:[];
  const titles=new Map((selection.columnTitles?.[ti]||[]).map(x=>[Number(x.index),String(x.title||'')]));
  const rows=[...table.rows],original=[...rows[0]?.cells||[]].map((_,i)=>i),order=list.length?list:original;
  rows.forEach(row=>{
   const cells=[...row.cells];
   order.forEach(index=>{
    const cell=cells[index];if(!cell)return;
    const newTitle=titles.get(index);
    if(row.parentElement?.tagName==='THEAD'&&newTitle)cell.textContent=newTitle;
    row.appendChild(cell);
   });
   cells.forEach((cell,i)=>{if(!order.includes(i))cell.remove()});
  });
  const cg=table.querySelector('colgroup');
  if(cg){const cols=[...cg.querySelectorAll('col')];if(cols.length===original.length){order.forEach(i=>cg.appendChild(cols[i]));cols.forEach((c,i)=>{if(!order.includes(i))c.remove()})}else cg.remove()}
 });
 const selected=new Set(selection.selectedHeadings||[]),ht=new Map((selection.headingTitles||[]).map(x=>[Number(x.index),String(x.title||'')]));
 hs.forEach((h,i)=>{if(!selected.has(i)){h.remove();return}const title=ht.get(i);if(title)h.textContent=title});
 return root.innerHTML;
}

/* ------------------------------------------------------------------ */
/* Kalıcı tercih (rapor başlığı + tablo imzası bazlı)                  */
/* ------------------------------------------------------------------ */
const storeKey=title=>STORE_PREFIX+String(title||'rapor').toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim().slice(0,120);
function loadPrefs(title){try{const raw=global.localStorage?.getItem(storeKey(title));const v=raw?JSON.parse(raw):null;return v&&typeof v==='object'?v:{}}catch(_){return{}}}
function savePrefs(title,prefs){try{global.localStorage?.setItem(storeKey(title),JSON.stringify(prefs))}catch(_){}}
function clearPrefs(title){try{global.localStorage?.removeItem(storeKey(title))}catch(_){}}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */
const DIR_LABELS={
 text:['A → Z (artan)','Z → A (azalan)'],
 number:['0 → 9 (küçükten büyüğe)','9 → 0 (büyükten küçüğe)'],
 date:['Eskiden yeniye (artan)','Yeniden eskiye (azalan)']
};
function dirOptionsHtml(kind,selected){const l=DIR_LABELS[kind]||DIR_LABELS.text;return `<option value="asc" ${selected!=='desc'?'selected':''}>${l[0]}</option><option value="desc" ${selected==='desc'?'selected':''}>${l[1]}</option>`}

function columnSection(table,ti,prefs){
 const cells=headerCells(table);
 const saved=prefs?.tables?.[ti]&&prefs.tables[ti].sig===tableSignature(table)?prefs.tables[ti]:null;
 let order=cells.map((_,i)=>i);
 if(saved&&Array.isArray(saved.items)){
  const seen=new Set(),ord=[];
  saved.items.forEach(it=>{const i=Number(it.i);if(i>=0&&i<cells.length&&!seen.has(i)){seen.add(i);ord.push(i)}});
  cells.forEach((_,i)=>{if(!seen.has(i))ord.push(i)});
  order=ord;
 }
 const meta=new Map((saved?.items||[]).map(it=>[Number(it.i),it]));
 const items=order.map(i=>{
  const th=cells[i],m=meta.get(i),show=m?m.show!==false:true;
  const text=m&&typeof m.title==='string'&&m.title?m.title:(cellText(th)||`Sütun ${i+1}`);
  return `<div class="ka-report-customizer__item" data-rc-col-item="${i}"${show?'':' data-rc-off="1"'}><input type="checkbox" ${show?'checked':''} data-rc-table="${ti}" data-rc-col="${i}" aria-label="Alanı göster"><input type="text" data-rc-col-text="${i}" value="${esc(text)}" aria-label="Alan başlığı"><div class="ka-report-customizer__move"><button type="button" data-rc-up title="Sütunu sola al">↑</button><button type="button" data-rc-down title="Sütunu sağa al">↓</button></div><button type="button" class="ka-report-customizer__remove" data-rc-remove title="Alanı kaldır">×</button></div>`;
 }).join('');
 let sortHtml;
 if(isSortableTable(table)){
  const rules=saved&&Array.isArray(saved.sort)?saved.sort:[];
  const optionsFor=sel=>cells.map((th,i)=>`<option value="${i}" data-kind="${columnKind(table,i)}"${sel===i?' selected':''}>${esc(cellText(th)||`Sütun ${i+1}`)}</option>`).join('');
  const rows=[0,1].map(n=>{
   const r=rules[n],idx=r?Number(r.i):-1,has=Number.isInteger(idx)&&idx>=0&&idx<cells.length;
   const kind=has?columnKind(table,idx):'text';
   return `<div class="ka-report-customizer__sortlabel">${n===0?'Önce şuna göre sırala':'Eşitse şuna göre sırala (isteğe bağlı)'}</div><div class="ka-report-customizer__sort" data-rc-sort-row="${ti}"><select data-rc-sort-col aria-label="Sıralama sütunu"><option value="">— Sıralama yok —</option>${optionsFor(has?idx:-1)}</select><select data-rc-sort-dir aria-label="Sıralama yönü">${dirOptionsHtml(kind,has?r.dir:'asc')}</select></div>`;
  }).join('');
  sortHtml=`<div class="ka-report-customizer__section"><strong>Tablo ${ti+1} — Satırları sırala</strong><span class="ka-report-customizer__hint">Satırlar, sütunların konumundan bağımsız olarak seçtiğiniz sütundaki değere göre dizilir (sınıf, ad soyad, numara, tarih vb.).</span>${rows}</div>`;
 }else{
  sortHtml=`<div class="ka-report-customizer__note">Bu tablonun satırları özel yapıda olduğu için sıralama uygulanmaz; satırlar olduğu gibi korunur.</div>`;
 }
 return `<div class="ka-report-customizer__section"><strong>Tablo ${ti+1} — Sütunlar</strong><span class="ka-report-customizer__hint">İşaretli alanlar rapora girer. ↑ ↓ ile sütunların rapordaki sırasını değiştirin, başlıkları düzenleyin.</span><div class="ka-report-customizer__list" data-rc-table-list="${ti}">${items}</div></div>${sortHtml}`;
}

function ask(title,body,opts){
 installStyle();
 if(typeof closeCurrent==='function')closeCurrent();
 const root=parseBody(body),ts=allTables(root),hs=headings(root),prefs=loadPrefs(title);
 const backdrop=document.createElement('div');backdrop.className='ka-report-customizer-backdrop';backdrop.dataset.kaOverlay='report-customizer';
 const headingSection=hs.length?`<div class="ka-report-customizer__section"><strong>Rapor içindeki başlıklar</strong><span class="ka-report-customizer__hint">Başlığı kaldırabilir veya metnini değiştirebilirsiniz.</span><div class="ka-report-customizer__list">${hs.map((h,i)=>`<div class="ka-report-customizer__item"><input type="checkbox" checked data-rc-heading="${i}" aria-label="Başlığı göster"><input type="text" data-rc-heading-text="${i}" value="${esc((h.textContent||'').trim())}" aria-label="Başlık metni"><span></span><button type="button" class="ka-report-customizer__remove" data-rc-heading-remove="${i}" title="Başlığı kaldır">×</button></div>`).join('')}</div></div>`:'';
 const tableSections=ts.map((table,ti)=>{
  if(!headerCells(table).length&&!table.tHead)return '';
  if(!isSimpleTable(table))return `<div class="ka-report-customizer__section"><strong>Tablo ${ti+1}</strong><div class="ka-report-customizer__note" style="margin-bottom:0">Bu tablo birleştirilmiş/çok satırlı başlık gibi özel bir yapıya sahip. Düzeni bozulmaması için olduğu gibi korunur.</div></div>`;
  return columnSection(table,ti,prefs);
 }).join('');
 backdrop.innerHTML=`<form class="ka-report-customizer"><div class="ka-report-customizer__head"><h2>Raporu Özelleştir</h2><p>${esc(title||'Rapor')} — Seçimler yazdırma, PDF, görsel ve paylaşım çıktısına birlikte uygulanır.</p></div><div class="ka-report-customizer__body">
 <div class="ka-report-customizer__section"><strong>Rapor başlıkları</strong><div class="ka-report-customizer__grid"><label class="ka-report-customizer__field"><span>Ana başlık</span><input type="text" name="title" value="${esc(title||'Rapor')}"></label><label class="ka-report-customizer__field"><span>Üst başlık</span><input type="text" name="ustBaslik" value="${esc(opts.ustBaslik||'')}"></label><label class="ka-report-customizer__field"><span>Okul adı</span><input type="text" name="okulAdi" value="${esc(opts.okulAdi||'')}"></label><label class="ka-report-customizer__field"><span>Dosya adı</span><input type="text" name="fileName" value="${esc(opts.fileName||title||'Koruk_Rapor')}"></label></div></div>
 <div class="ka-report-customizer__section"><strong>Üst bilgi</strong><div class="ka-report-customizer__grid"><label><input type="checkbox" name="baslikGoster" ${opts.baslikGoster!==false?'checked':''}><span>Ana başlığı göster</span></label><label><input type="checkbox" name="logoGoster" ${opts.logoGoster!==false?'checked':''}><span>Okul logosunu göster</span></label><label><input type="checkbox" name="tarihGoster" ${opts.tarihGoster!==false?'checked':''}><span>Tarihi göster</span></label><label><input type="checkbox" name="schoolGoster" ${opts.okulAdi!==''?'checked':''}><span>Okul adını göster</span></label></div></div>
 ${headingSection}${tableSections||'<div class="ka-report-customizer__section"><strong>Veri alanları</strong><span class="ka-report-customizer__hint">Bu raporda tablo başlığı bulunamadı. Üst bilgi ve rapor başlıkları yine özelleştirilebilir.</span></div>'}
 </div><div class="ka-report-customizer__footer"><button type="button" data-rc-reset>Varsayılana dön</button><button type="button" data-rc-cancel>Vazgeç</button><button type="submit" class="primary">Raporu Oluştur</button></div></form>`;
 document.body.appendChild(backdrop);

 const syncList=list=>{const items=[...list.querySelectorAll('.ka-report-customizer__item:not([hidden])')];items.forEach((item,index)=>{item.querySelector('[data-rc-up]').disabled=index===0;item.querySelector('[data-rc-down]').disabled=index===items.length-1})};
 backdrop.querySelectorAll('[data-rc-table-list]').forEach(list=>{
  list.querySelectorAll('[data-rc-off]').forEach(it=>{it.hidden=true;it.querySelector('[data-rc-table]').checked=false});
  syncList(list);
  list.addEventListener('click',e=>{
   const item=e.target.closest('[data-rc-col-item]');if(!item)return;
   if(e.target.closest('[data-rc-remove]')){item.querySelector('[data-rc-table]').checked=false;item.hidden=true;syncList(list);return}
   if(e.target.closest('[data-rc-up]')){let prev=item.previousElementSibling;while(prev&&prev.hidden)prev=prev.previousElementSibling;if(prev)list.insertBefore(item,prev);syncList(list);return}
   if(e.target.closest('[data-rc-down]')){let next=item.nextElementSibling;while(next&&next.hidden)next=next.nextElementSibling;if(next)list.insertBefore(next,item);syncList(list);return}
  });
 });
 backdrop.querySelectorAll('[data-rc-sort-row]').forEach(row=>{
  const colSel=row.querySelector('[data-rc-sort-col]'),dirSel=row.querySelector('[data-rc-sort-dir]');
  colSel.addEventListener('change',()=>{const kind=colSel.selectedOptions[0]?.dataset.kind||'text',cur=dirSel.value;dirSel.innerHTML=dirOptionsHtml(kind,cur)});
 });
 backdrop.querySelectorAll('[data-rc-heading-remove]').forEach(btn=>btn.addEventListener('click',()=>{const i=btn.dataset.rcHeadingRemove,cb=backdrop.querySelector(`[data-rc-heading="${i}"]`);if(cb){cb.checked=false;cb.closest('.ka-report-customizer__item').hidden=true}}));

 return new Promise(resolve=>{
  const form=backdrop.querySelector('form');
  let closer=null;
  const done=value=>{if(closeCurrent===closer)closeCurrent=null;backdrop.remove();resolve(value)};
  closer=()=>done(null);
  closeCurrent=closer;
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)done(null)});
  form.querySelector('[data-rc-cancel]').addEventListener('click',()=>done(null));
  form.querySelector('[data-rc-reset]').addEventListener('click',()=>{clearPrefs(title);done(RESET)});
  form.addEventListener('submit',e=>{
   e.preventDefault();
   const selectedColumns={},columnTitles={},sortRules={},tablePrefs={};
   ts.forEach((table,ti)=>{
    const list=form.querySelector(`[data-rc-table-list="${ti}"]`);
    if(!list){selectedColumns[ti]=[];columnTitles[ti]=[];sortRules[ti]=[];return}
    const all=[...list.children];
    const colOf=item=>Number(item.querySelector('[data-rc-col]').dataset.rcCol);
    selectedColumns[ti]=all.filter(item=>!item.hidden&&item.querySelector('[data-rc-table]')?.checked).map(colOf);
    columnTitles[ti]=all.map(item=>({index:colOf(item),title:String(item.querySelector('[data-rc-col-text]').value||'').trim()}));
    const rules=[],used=new Set();
    form.querySelectorAll(`[data-rc-sort-row="${ti}"]`).forEach(row=>{
     const v=row.querySelector('[data-rc-sort-col]').value;
     if(v===''||used.has(v))return;used.add(v);
     rules.push({index:Number(v),dir:row.querySelector('[data-rc-sort-dir]').value==='desc'?'desc':'asc'});
    });
    sortRules[ti]=rules;
    tablePrefs[ti]={sig:tableSignature(table),items:all.map(item=>({i:colOf(item),show:!item.hidden&&!!item.querySelector('[data-rc-table]')?.checked,title:String(item.querySelector('[data-rc-col-text]').value||'').trim()})),sort:rules.map(r=>({i:r.index,dir:r.dir}))};
   });
   const selectedHeadings=[...form.querySelectorAll('[data-rc-heading]')].filter(x=>x.checked).map(x=>Number(x.dataset.rcHeading));
   const headingTitles=[...form.querySelectorAll('[data-rc-heading-text]')].map(x=>({index:Number(x.dataset.rcHeadingText),title:String(x.value||'').trim()}));
   savePrefs(title,{tables:tablePrefs});
   done({title:String(form.title.value||title||'Rapor').trim()||'Rapor',ustBaslik:String(form.ustBaslik.value||'').trim(),okulAdi:String(form.okulAdi.value||'').trim(),fileName:String(form.fileName.value||title||'Koruk_Rapor').trim()||'Koruk_Rapor',baslikGoster:form.baslikGoster.checked,logoGoster:form.logoGoster.checked,tarihGoster:form.tarihGoster.checked,schoolGoster:form.schoolGoster.checked,selectedColumns,columnTitles,sortRules,selectedHeadings,headingTitles});
  });
 });
}

/* ------------------------------------------------------------------ */
/* Özel rapor koruması                                                 */
/* ------------------------------------------------------------------ */
const PROTECTED=/puantaj|imza\s*sirkus|ogretmen\s*devams|servis\s*aylik\s*takip|aylik\s*denetim|yemek\s*denetim|maas\s*degisikli|dilekce|devamsizlik\s*cizelge|nobet\s*(defter|cizelge|sirkus)|teblig/i;
const ascii=s=>String(s||'').toLocaleLowerCase('tr-TR').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u');
function isBypassed(title,body,opts){
 if(opts?.ozellestirilebilir===false||opts?.ozelRapor===true)return true;
 if(PROTECTED.test(ascii(title))||PROTECTED.test(ascii(opts?.fileName)))return true;
 if(/data-ka-ozel-rapor|data-report-custom="off"/.test(String(body||'')))return true;
 return false;
}

async function wrappedPrint(original,title,body,opts={}){
 if(isBypassed(title,body,opts))return original(title,body,opts);
 let result=null;
 for(let guard=0;guard<4;guard++){result=await ask(title,body,opts);if(result!==RESET)break}
 if(!result||result===RESET)return null;
 const nextBody=applySelection(body,result);
 const nextOpts={...opts,title:result.title,ustBaslik:result.ustBaslik,okulAdi:result.schoolGoster?result.okulAdi:'',baslikGoster:result.baslikGoster,logoGoster:result.logoGoster,tarihGoster:result.tarihGoster,fileName:result.fileName,ozellestirilebilir:false};
 return original(result.title,nextBody,nextOpts);
}

/* ------------------------------------------------------------------ */
/* Kalıcı yama: ReportEngine ne zaman yüklenirse yüklensin             */
/* ------------------------------------------------------------------ */
function patchEngine(engine){
 if(!engine||typeof engine.printReport!=='function'||engine.printReport.__kaCustomized)return false;
 const original=engine.printReport.bind(engine);
 const wrapped=function(title,body,opts={}){return wrappedPrint(original,title,body,opts)};
 wrapped.__kaCustomized=true;
 engine.printReport=wrapped;
 return true;
}
function patch(){return patchEngine(global.ReportEngine)}
function installTrap(){
 if(global.ReportEngine){patchEngine(global.ReportEngine);return}
 const desc=Object.getOwnPropertyDescriptor(global,'ReportEngine');
 if(desc&&(desc.get||desc.set))return;
 let value;
 try{Object.defineProperty(global,'ReportEngine',{configurable:true,enumerable:true,get(){return value},set(v){value=v;try{patchEngine(v)}catch(e){console.warn('[ReportCustomizer]',e)}}})}catch(_){}
}
function watch(){
 installTrap();
 /* Güvence: tuzak çalışmazsa yavaş kontrol — süre sınırı yok, yama tamamlanınca durur */
 let timer=setInterval(()=>{if(patch()||global.ReportEngine?.printReport?.__kaCustomized){clearInterval(timer);timer=null}},1000);
}

installStyle();
watch();
global.ReportCustomizer={version:VERSION,patch,ensure:patch,applySelection,sortTable,isSimpleTable,close:()=>{if(typeof closeCurrent==='function')closeCurrent()},isOpen:()=>!!document.querySelector('.ka-report-customizer-backdrop')};
})(window);
