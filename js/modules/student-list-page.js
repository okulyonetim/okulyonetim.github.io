/* Koruk Asistan — Öğrenci Listesi Oluşturucu bağımsız sayfa sahibi.
 * Canlı sütun düzenleme: sürükle-bırak genişlik + sütun sırası + hizalama.
 * Word/Excel/PDF çıktıları canlı önizleme düzenini kullanır.
 */
(function(global){
'use strict';
if(global.StudentListPage)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]||c));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const clone=v=>{try{return structuredClone(v)}catch(_){return JSON.parse(JSON.stringify(v))}};
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const teacherId=()=>user().bagliOgretmenId||user().ogretmenId||'';

const cols=[
 ['siraNo','Sıra No'],['ogrenciAdi','Ad Soyad'],['ogrenciNo','Öğrenci No'],
 ['cinsiyet','Cinsiyet'],['veliAdi','Veli Adı'],['yakinlik','Yakınlık'],
 ['telefon1','Telefon 1'],['telefon2','Telefon 2'],['adres','Adres'],
 ['servisAdi','Servis'],['kulupAdi','Sosyal Kulüp'],['notlar','Notlar']
];
const labels=Object.fromEntries(cols);
let selectedClass='',draft=null,editingId='',unsubscribe=null,mounted=false;
let resizeState=null;

function root(){return document.getElementById('v2ModuleRoot')}

function schoolClasses(){
 const set=new Set();
 arr('siniflar').forEach(x=>{const n=String(x.ad||x.sinifAdi||x.sinif||'').trim();if(n)set.add(n)});
 arr('ogretmenListeKayit').forEach(x=>{if(x.sinif)set.add(String(x.sinif).trim())});
 return [...set].filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr',{numeric:true,sensitivity:'base'}));
}
function roster(name){
 const c=arr('siniflar').find(x=>String(x.ad||x.sinifAdi||'').trim()===name),id=c?.id||name;
 return arr('veliler').filter(v=>v.sinifId===id||v.sinifId===name)
   .sort((a,b)=>String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'));
}
function snapshot(){
 return roster(selectedClass).map(v=>({
  ogrenciAdi:v.ogrenciAdi||'',ogrenciNo:v.ogrenciNo||'',cinsiyet:v.cinsiyet||'',
  veliAdi:v.veliAdi||'',yakinlik1:v.yakinlik1||v.yakinlik||'',telefon1:v.telefon1||'',
  telefon2:v.telefon2||'',adres:v.adres||'',servisAdi:v.servisAdi||'',
  kulupAdi:v.kulupAdi||'',notlar:v.notlar||''
 }));
}
function school(){
 const x=arr('okulBilgileri')[0]||global.okulBilgileriAyari||{},
       mudur=x.mudurId?arr('ogretmenler').find(o=>o.id===x.mudurId):null,
       t=arr('ogretmenler').find(o=>o.id===teacherId()),y=new Date().getFullYear();
 return{
  okulAdi:x.okulAdi||x.ad||'',egitimYili:`${y}-${y+1}`,
  ogretmen:t?`${t.ad||''} ${t.soyad||''}`.trim():'',brans:t?.brans||'',
  mudur:mudur?`${mudur.ad||''} ${mudur.soyad||''}`.trim():'',
  mudurUnvan:'Okul Müdürü',yon:'portrait'
 };
}
function customColumns(src){
 return(Array.isArray(src)?src:[]).map((c,i)=>({
  id:String(c?.id||`ozel_${i}_${Date.now().toString(36)}`),
  label:String(c?.label||'').trim()
 })).filter(c=>c.label);
}
function normalize(src={}){
 const custom=customColumns(src.ozelSutunlar);
 const customIds=custom.map(c=>c.id);
 let order=Array.isArray(src.sutunSirasi)?src.sutunSirasi.slice():cols.map(x=>x[0]);
 order=order.filter(k=>labels[k]||customIds.includes(k));
 cols.forEach(([k])=>{if(!order.includes(k))order.push(k)});
 custom.forEach(c=>{if(!order.includes(c.id))order.push(c.id)});
 const selected=Array.isArray(src.secilenKeyler)?src.secilenKeyler.slice():cols.map(x=>x[0]).concat(customIds);
 customIds.forEach(id=>{if(!selected.includes(id))selected.push(id)});
 return{
  ad:src.ad||'',secilenKeyler:selected,sutunSirasi:order,ozelSutunlar:custom,
  satirlar:Array.isArray(src.satirlar)?clone(src.satirlar):snapshot(),
  sutunGenislikleri:clone(src.sutunGenislikleri||{}),
  sutunHizalama:clone(src.sutunHizalama||{}),
  baslikBilgisi:{...school(),...(src.baslikBilgisi||{})}
 };
}
function width(k){return Math.max(72,Math.min(420,Number(draft?.sutunGenislikleri?.[k])||126))}
function align(k){return draft?.sutunHizalama?.[k]||(k==='siraNo'||k==='ogrenciNo'?'center':'left')}
function columnLabel(k){
 if(labels[k])return labels[k];
 return (draft?.ozelSutunlar||[]).find(c=>c.id===k)?.label||'Sütun';
}
function selectedCols(){
 if(!draft)return[];
 return draft.sutunSirasi
   .filter(k=>draft.secilenKeyler.includes(k))
   .map(k=>({key:k,label:columnLabel(k)}));
}
function val(row,k,i){
 if(k==='siraNo')return i+1;
 if(k==='yakinlik')return row.yakinlik1||row.yakinlik||'';
 return row[k]??'';
}
function setVal(row,k,v){if(k==='yakinlik')row.yakinlik1=v;else row[k]=v}

function installStyles(){
 if(document.getElementById('student-list-live-resize-style'))return;
 const style=document.createElement('style');
 style.id='student-list-live-resize-style';
 style.textContent=`
 .sl-live-preview-shell{overflow:auto;position:relative;-webkit-overflow-scrolling:touch}
 .sl-live-preview-table{table-layout:fixed;width:max-content;min-width:100%}
 .sl-live-preview-table th,.sl-live-preview-table td{box-sizing:border-box}
 .sl-preview-head-content{position:relative;min-height:28px;display:flex;align-items:center;justify-content:inherit;padding-right:14px}
 .sl-column-resizer{position:absolute;right:-1px;top:-5px;bottom:-5px;width:18px;cursor:col-resize;touch-action:none;z-index:5}
 .sl-column-resizer::after{content:'';position:absolute;right:7px;top:5px;bottom:5px;width:2px;border-radius:2px;background:transparent;transition:background .12s}
 .sl-column-resizer:hover::after,.sl-column-resizer:active::after{background:var(--brand,#2b8f6a)}
 body.sl-column-resizing,body.sl-column-resizing *{cursor:col-resize!important;user-select:none!important}
 .ka-teacher-list-column__top label{min-width:0}
 .ka-teacher-list-column__top label small{display:block;color:var(--ink-muted);font-size:.72em;margin-top:2px}
 @media(max-width:700px){
  .sl-column-resizer{width:24px}
  .sl-column-resizer::after{right:10px}
 }
 `;
 document.head.appendChild(style);
}
function loading(){
 const r=root();
 if(r)r.innerHTML='<section class="ka-page ka-stack"><div class="ka-card"><div class="ka-card__body"><strong>Öğrenci Listesi Oluşturucu açılıyor…</strong><div class="ka-muted">Yerel veriler hazırlanıyor.</div></div></div></section>';
}
function classPanel(){
 const classes=schoolClasses();
 return `<section class="ka-card"><div class="ka-card__body ka-stack">
 <div><small>1. ADIM</small><h3>Sınıf seçin</h3></div>
 <select data-sl-class><option value="">— Sınıf seçiniz —</option>${classes.map(c=>`<option ${c===selectedClass?'selected':''}>${esc(c)}</option>`).join('')}</select>
 <div class="ka-teacher-list-class-grid">${classes.map(c=>`<button type="button" class="ka-teacher-list-class-card ${c===selectedClass?'is-selected':''}" data-sl-class-card="${esc(c)}"><span>${esc(c)}</span><small>${roster(c).length} öğrenci</small></button>`).join('')}</div>
 </div></section>`;
}
function saved(){
 if(!selectedClass)return'';
 const rows=arr('ogretmenListeKayit').filter(x=>x.ogretmenId===teacherId()&&x.sinif===selectedClass)
   .sort((a,b)=>String(b.guncellenme||'').localeCompare(String(a.guncellenme||'')));
 return `<section><div class="ka-row ka-row--between"><div><small>KAYITLI ÇİZELGELER</small><h3>${esc(selectedClass)}</h3></div>
 <button class="ka-btn" data-sl-new>+ Yeni Çizelge</button></div><div class="ka-stack">
 ${rows.length?rows.map(x=>`<article class="ka-card"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>${esc(x.ad||'İsimsiz Çizelge')}</strong><div class="ka-muted">${esc(x.sinif||'')} · ${(x.satirlar||[]).length} öğrenci</div></div>
 <button class="ka-btn ka-btn--secondary ka-btn--sm" data-sl-open="${esc(x.id)}">Aç</button>
 <button class="ka-btn ka-btn--ghost ka-btn--sm" data-sl-del="${esc(x.id)}">Sil</button></div></article>`).join(''):
 '<div class="ka-empty">Bu sınıf için kayıtlı çizelge yok.</div>'}</div></section>`;
}
function orderControls(k){
 return `<div class="ka-teacher-list-column__order">
 <button class="ka-icon-button" type="button" data-sl-move="-1" data-key="${esc(k)}" aria-label="Sütunu sola taşı">↑</button>
 <button class="ka-icon-button" type="button" data-sl-move="1" data-key="${esc(k)}" aria-label="Sütunu sağa taşı">↓</button>
 </div>`;
}
function customManagerRows(){
 return (draft.ozelSutunlar||[]).map(c=>`<article class="ka-teacher-list-column">
 <div class="ka-teacher-list-column__top">
  <label><strong>${esc(c.label)}</strong><small>Özel sütun</small></label>
  ${orderControls(c.id)}
 </div>
 <div class="ka-teacher-list-column__tools" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
  <button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-sl-align="${esc(c.id)}">Hiza: ${align(c.id)==='left'?'Sol':align(c.id)==='center'?'Orta':'Sağ'}</button>
  <label><span>Genişlik</span><input class="ka-input" type="number" min="72" max="420" step="10" value="${width(c.id)}" data-sl-width="${esc(c.id)}"></label>
 </div>
 <div class="ka-row" style="margin-top:8px">
  <input class="ka-input ka-grow" data-sl-custom-rename="${esc(c.id)}" value="${esc(c.label)}" aria-label="${esc(c.label)} sütun adı">
  <button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-sl-custom-rename-save="${esc(c.id)}">Adı Değiştir</button>
  <button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-sl-custom-del="${esc(c.id)}">Sil</button>
 </div>
 </article>`).join('');
}
function builtinManagerRows(){
 return draft.sutunSirasi.filter(k=>labels[k]).map(k=>`<article class="ka-teacher-list-column">
 <div class="ka-teacher-list-column__top">
  <label><input type="checkbox" data-sl-col="${esc(k)}" ${draft.secilenKeyler.includes(k)?'checked':''}><strong>${esc(labels[k])}</strong></label>
  ${orderControls(k)}
 </div>
 <div class="ka-teacher-list-column__tools" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
  <button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-sl-align="${esc(k)}">Hiza: ${align(k)==='left'?'Sol':align(k)==='center'?'Orta':'Sağ'}</button>
  <label><span>Genişlik</span><input class="ka-input" type="number" min="72" max="420" step="10" value="${width(k)}" data-sl-width="${esc(k)}"></label>
 </div>
 </article>`).join('');
}
function previewTable(){
 const sc=selectedCols();
 if(!sc.length)return '<div class="ka-empty">Önizleme için en az bir sütun seçin.</div>';
 const heads=sc.map(c=>`<th class="sl-preview-col" data-sl-preview-col="${esc(c.key)}" style="width:${width(c.key)}px;min-width:${width(c.key)}px;text-align:${align(c.key)};position:relative">
  <div class="sl-preview-head-content"><span>${esc(c.label)}</span><span class="sl-column-resizer" data-sl-resize="${esc(c.key)}" title="Sütun genişliğini sürükleyerek ayarla" aria-label="${esc(c.label)} sütun genişliğini ayarla"></span></div>
 </th>`).join('');
 const rows=draft.satirlar.map((row,i)=>`<tr>${sc.map(c=>`<td class="sl-preview-col" data-sl-preview-col="${esc(c.key)}" style="width:${width(c.key)}px;min-width:${width(c.key)}px;text-align:${align(c.key)}">
  ${c.key==='siraNo'?i+1:`<input class="ka-input" data-sl-cell data-row="${i}" data-key="${esc(c.key)}" value="${esc(val(row,c.key,i))}" style="width:100%;min-width:0;text-align:${align(c.key)}">`}
 </td>`).join('')}</tr>`).join('');
 return `<div class="ka-teacher-list-table-shell sl-live-preview-shell"><table class="ka-table ka-teacher-list-table sl-live-preview-table"><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function editor(){
 if(!draft)return'';
 const bs=draft.baslikBilgisi;
 return `<section class="ka-teacher-list-workspace"><header class="ka-teacher-list-workspace__head"><div><small>ÇALIŞMA ALANI</small><h3>Listeyi düzenleyin</h3><p>${esc(selectedClass)} · ${draft.satirlar.length} öğrenci</p></div></header>
 <div class="ka-teacher-list-workspace__body ka-stack">
 <label class="ka-field"><span class="ka-field__label">Çizelge Adı</span><input class="ka-input" data-sl-name value="${esc(draft.ad)}"></label>
 <details class="ka-card"><summary class="ka-card__body"><strong>Başlık, imza ve sayfa düzeni</strong></summary><div class="ka-card__body ka-grid">
 <label class="ka-field"><span class="ka-field__label">Okul Adı</span><input class="ka-input" data-sl-head="okulAdi" value="${esc(bs.okulAdi||'')}"></label>
 <label class="ka-field"><span class="ka-field__label">Eğitim-Öğretim Yılı</span><input class="ka-input" data-sl-head="egitimYili" value="${esc(bs.egitimYili||'')}"></label>
 <label class="ka-field"><span class="ka-field__label">Öğretmen</span><input class="ka-input" data-sl-head="ogretmen" value="${esc(bs.ogretmen||'')}"></label>
 <label class="ka-field"><span class="ka-field__label">Branş</span><input class="ka-input" data-sl-head="brans" value="${esc(bs.brans||'')}"></label>
 <label class="ka-field"><span class="ka-field__label">Okul Müdürü</span><input class="ka-input" data-sl-head="mudur" value="${esc(bs.mudur||'')}"></label>
 <label class="ka-field"><span class="ka-field__label">Sayfa Yönü</span><select data-sl-head="yon"><option value="portrait" ${bs.yon!=='landscape'?'selected':''}>Dikey A4</option><option value="landscape" ${bs.yon==='landscape'?'selected':''}>Yatay A4</option></select></label>
 </div></details>
 <section class="ka-teacher-list-column-panel"><div class="ka-teacher-list-panel-title"><div><small>SÜTUN YÖNETİMİ</small><h4>Sütunları düzenleyin</h4></div><span>${selectedCols().length} seçili</span></div>
 <div class="ka-teacher-list-columns">${builtinManagerRows()}</div>
 </section>
 <section class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-teacher-list-panel-title"><div><small>ÖZEL SÜTUNLAR</small><h4>Sonradan eklenen sütunlar</h4></div><span>${draft.ozelSutunlar.length}</span></div>
 <div class="ka-teacher-list-columns">${customManagerRows()||'<div class="ka-muted">Henüz özel sütun eklenmedi.</div>'}</div>
 <div class="ka-row"><input class="ka-input ka-grow" data-sl-custom placeholder="Örn: Boy, Kilo, Sınav, Mekik"><button class="ka-btn ka-btn--secondary" type="button" data-sl-custom-add>Ekle</button></div>
 </div></section>
 <section class="ka-teacher-list-preview"><div class="ka-teacher-list-section-head"><div><small>CANLI ÖNİZLEME</small><h3>Sütun genişliğini tablodan ayarlayın</h3><p class="ka-muted">Başlık çizgisindeki tutamacı parmağınızla veya fareyle sağa-sola sürükleyin.</p></div><span>${selectedCols().length} sütun</span></div>${previewTable()}</section>
 </div>
 <footer class="ka-teacher-list-workspace__footer">
 <button class="ka-btn ka-btn--secondary" type="button" data-sl-report>🖨 A4 Önizleme / PDF</button>
 <button class="ka-btn ka-btn--secondary" type="button" data-sl-word>📝 Word'e Aktar</button>
 <button class="ka-btn ka-btn--secondary" type="button" data-sl-template>Şablon Yap</button>
 <button class="ka-btn" type="button" data-sl-save>💾 Kaydet</button>
 </footer></section>`;
}
function render(){
 const r=root();if(!r||!mounted)return;
 const tid=teacherId();
 r.innerHTML=`<section class="ka-page ka-stack ka-teacher-list-page" data-student-list-page>
 <section class="ka-teacher-list-hero"><div class="ka-teacher-list-hero__icon">☷</div><div><small>ÖĞRENCİ LİSTESİ OLUŞTURUCU</small><h2>İhtiyacınıza göre çizelge hazırlayın</h2><p>Tüm okul sınıfları kullanılabilir.</p></div></section>
 ${tid?classPanel()+saved()+editor():'<div class="ka-empty">Bu bölüm, hesabınıza bağlı bir öğretmen kaydı gerektirir.</div>'}</section>`;
 bind();global.PermissionService?.apply?.(r);
}
async function choose(c){
 selectedClass=c||'';editingId='';draft=null;resub();
 if(selectedClass){const tpl=await global.OgretmenListeService.sablonGetir(selectedClass);draft=normalize(tpl||{});draft.ad='';draft.satirlar=snapshot()}
 render();
}
function resub(){try{unsubscribe?.()}catch(_){}unsubscribe=null;if(selectedClass)unsubscribe=global.OgretmenListeService.kayitlariDinle(selectedClass,()=>requestAnimationFrame(render))}
function move(k,d){
 if(!draft)return;
 const i=draft.sutunSirasi.indexOf(k),j=i+d;
 if(i<0||j<0||j>=draft.sutunSirasi.length)return;
 [draft.sutunSirasi[i],draft.sutunSirasi[j]]=[draft.sutunSirasi[j],draft.sutunSirasi[i]];
 render();
}
function setPreviewWidths(key,value){
 const rootEl=root(),v=Math.max(72,Math.min(420,Number(value)||126)),target=String(key);
 if(!rootEl)return;
 rootEl.querySelectorAll('.sl-preview-col').forEach(el=>{
  if(el.dataset.slPreviewCol===target){el.style.width=`${v}px`;el.style.minWidth=`${v}px`;}
 });
 const input=[...rootEl.querySelectorAll('[data-sl-width]')].find(el=>el.dataset.slWidth===target);
 if(input)input.value=String(v);
}
function beginResize(key,event){
 if(!draft)return;
 event.preventDefault();event.stopPropagation();
 const startX=event.clientX,startW=width(key);
 resizeState={key,startX,startW,pointerId:event.pointerId};
 try{event.currentTarget.setPointerCapture?.(event.pointerId)}catch(_){}
 document.body.classList.add('sl-column-resizing');
}
function moveResize(event){
 if(!resizeState||!draft)return;
 event.preventDefault();
 const delta=event.clientX-resizeState.startX;
 const v=Math.max(72,Math.min(420,Math.round(resizeState.startW+delta)));
 draft.sutunGenislikleri[resizeState.key]=v;
 setPreviewWidths(resizeState.key,v);
}
function endResize(){
 if(!resizeState)return;
 resizeState=null;
 document.body.classList.remove('sl-column-resizing');
 render();
}
function renameCustom(id){
 if(!draft)return;
 const input=root()?.querySelector(`[data-sl-custom-rename="${String(id).replace(/"/g,'\\"')}"]`);
 const label=String(input?.value||'').trim();
 if(!label)return global.toast?.('Sütun adı boş olamaz.');
 const c=draft.ozelSutunlar.find(x=>x.id===id);if(c)c.label=label;
 render();
}
function bind(){
 const r=root();if(!r)return;
 r.querySelector('[data-sl-class]')?.addEventListener('change',e=>choose(e.target.value));
 r.querySelectorAll('[data-sl-class-card]').forEach(b=>b.onclick=()=>choose(b.dataset.slClassCard));
 r.querySelector('[data-sl-new]')?.addEventListener('click',()=>choose(selectedClass));
 r.querySelectorAll('[data-sl-open]').forEach(b=>b.onclick=()=>{
  const x=arr('ogretmenListeKayit').find(y=>y.id===b.dataset.slOpen&&y.ogretmenId===teacherId());
  if(x){editingId=x.id;selectedClass=x.sinif;draft=normalize(x);render()}
 });
 r.querySelectorAll('[data-sl-del]').forEach(b=>b.onclick=async()=>{
  if(!confirm('Bu çizelge silinsin mi?'))return;
  await global.OgretmenListeService.kayitSil(b.dataset.slDel);render();
 });
 r.querySelector('[data-sl-name]')?.addEventListener('input',e=>draft.ad=e.target.value);
 r.querySelectorAll('[data-sl-head]').forEach(el=>el.oninput=el.onchange=()=>draft.baslikBilgisi[el.dataset.slHead]=el.value);
 r.querySelectorAll('[data-sl-col]').forEach(el=>el.onchange=()=>{
  draft.secilenKeyler=el.checked?[...new Set([...draft.secilenKeyler,el.dataset.slCol])]:draft.secilenKeyler.filter(k=>k!==el.dataset.slCol);
  render();
 });
 r.querySelectorAll('[data-sl-move]').forEach(b=>b.onclick=()=>move(b.dataset.key,Number(b.dataset.slMove)));
 r.querySelectorAll('[data-sl-align]').forEach(b=>b.onclick=()=>{
  const k=b.dataset.slAlign,n=align(k);
  draft.sutunHizalama[k]={left:'center',center:'right',right:'left'}[n]||'left';render();
 });
 r.querySelectorAll('[data-sl-width]').forEach(el=>el.onchange=()=>{
  draft.sutunGenislikleri[el.dataset.slWidth]=Math.max(72,Math.min(420,Number(el.value)||126));render();
 });
 r.querySelectorAll('[data-sl-custom-rename-save]').forEach(b=>b.onclick=()=>renameCustom(b.dataset.slCustomRenameSave));
 r.querySelectorAll('[data-sl-custom-del]').forEach(b=>b.onclick=()=>{
  const id=b.dataset.slCustomDel;
  draft.ozelSutunlar=draft.ozelSutunlar.filter(c=>c.id!==id);
  draft.sutunSirasi=draft.sutunSirasi.filter(k=>k!==id);
  draft.secilenKeyler=draft.secilenKeyler.filter(k=>k!==id);
  draft.satirlar.forEach(row=>delete row[id]);
  render();
 });
 r.querySelector('[data-sl-custom-add]')?.addEventListener('click',()=>{
  const i=r.querySelector('[data-sl-custom]'),t=i?.value.trim();if(!t)return;
  const id='ozel_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  draft.ozelSutunlar.push({id,label:t});draft.sutunSirasi.push(id);draft.secilenKeyler.push(id);render();
 });
 r.querySelectorAll('[data-sl-cell]').forEach(el=>el.oninput=()=>setVal(draft.satirlar[Number(el.dataset.row)],el.dataset.key,el.value));
 r.querySelectorAll('[data-sl-resize]').forEach(el=>el.addEventListener('pointerdown',e=>beginResize(el.dataset.slResize,e)));
 r.querySelector('[data-sl-save]')?.addEventListener('click',save);
 r.querySelector('[data-sl-template]')?.addEventListener('click',saveTemplate);
 r.querySelector('[data-sl-report]')?.addEventListener('click',openReport);
 r.querySelector('[data-sl-word]')?.addEventListener('click',exportWord);
}
document.addEventListener('pointermove',moveResize,{passive:false});
document.addEventListener('pointerup',endResize);
document.addEventListener('pointercancel',endResize);
function payload(){
 return{
  ad:String(draft.ad||'').trim(),secilenKeyler:draft.secilenKeyler.slice(),sutunSirasi:draft.sutunSirasi.slice(),
  ozelSutunlar:clone(draft.ozelSutunlar),satirlar:clone(draft.satirlar),
  sutunGenislikleri:clone(draft.sutunGenislikleri),sutunHizalama:clone(draft.sutunHizalama),baslikBilgisi:clone(draft.baslikBilgisi)
 };
}
async function save(){
 if(!draft?.ad?.trim())return global.toast?.('Çizelge adı girin.');
 await global.OgretmenListeService.kayitKaydet(selectedClass,editingId||null,payload());
 global.toast?.('Çizelge kaydedildi.');editingId='';draft=null;render();
}
async function saveTemplate(){
 await global.OgretmenListeService.sablonKaydet(selectedClass,{secilenKeyler:draft.secilenKeyler,sutunSirasi:draft.sutunSirasi,ozelSutunlar:draft.ozelSutunlar,sutunGenislikleri:draft.sutunGenislikleri,sutunHizalama:draft.sutunHizalama,baslikBilgisi:draft.baslikBilgisi});
 global.toast?.('Sütun düzeni şablon olarak kaydedildi.');
}
function reportTitle(){return draft?.ad?.trim()||`${selectedClass} Sınıfı Öğrenci Listesi`}
function reportBody(){
 const sc=selectedCols(),bs=draft.baslikBilgisi;
 const heads=sc.map(c=>`<th style="width:${width(c.key)}px;min-width:${width(c.key)}px;text-align:${align(c.key)}">${esc(c.label)}</th>`).join('');
 const rows=draft.satirlar.map((x,i)=>`<tr>${sc.map(c=>`<td style="width:${width(c.key)}px;min-width:${width(c.key)}px;text-align:${align(c.key)}">${esc(val(x,c.key,i))}</td>`).join('')}</tr>`).join('');
 return `<header style="display:grid;grid-template-columns:64px 1fr 64px;align-items:center;gap:10px;border-bottom:2px solid #263746;padding-bottom:10px;margin-bottom:14px"><img src="assets/logo.png" alt="Okul logosu" style="width:58px;height:58px;object-fit:contain"><div style="text-align:center"><div style="font-size:15px;font-weight:800">${esc(bs.okulAdi||'')}</div><div style="font-size:13px;font-weight:700;margin-top:4px">${esc(reportTitle())}</div><div style="font-size:10px;margin-top:4px;color:#5b6470">${esc(bs.egitimYili||'')} Eğitim-Öğretim Yılı</div></div><span></span></header><table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table><div style="text-align:right;margin-top:8px;font-size:10px">Toplam öğrenci sayısı: <strong>${draft.satirlar.length}</strong></div><footer style="display:flex;justify-content:space-between;gap:24px;margin-top:18px;font-size:10px"><div><div>Öğretmen: <strong>${esc(bs.ogretmen||'')}</strong></div><div>${esc(bs.brans||'')}</div><div style="margin-top:24px">İmza: .......................</div></div><div style="text-align:right"><div>${esc(bs.mudurUnvan||'Okul Müdürü')}: <strong>${esc(bs.mudur||'')}</strong></div><div style="margin-top:24px">İmza: .......................</div></div></footer>`;
}
async function openReport(){
 if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
 if(!global.ReportEngine?.printReport)throw new Error('Rapor motoru yüklenemedi.');
 const yon=draft.baslikBilgisi.yon==='landscape'?'yatay':'dikey';
 return global.ReportEngine.printReport(reportTitle(),reportBody(),{fileName:reportTitle(),yon,logoGoster:false,baslikGoster:false,tarihGoster:false});
}
function wordHtml(){
 const sc=selectedCols(),bs=draft.baslikBilgisi,orientation=bs.yon==='landscape'?'landscape':'portrait';
 const tableWidth=sc.reduce((sum,c)=>sum+width(c.key),0);
 const heads=sc.map(c=>`<th style="width:${width(c.key)}px;text-align:${align(c.key)};border:1px solid #7b8794;padding:6px;background:#1b3a5c;color:#fff">${esc(c.label)}</th>`).join('');
 const rows=draft.satirlar.map((x,i)=>`<tr>${sc.map(c=>`<td style="width:${width(c.key)}px;text-align:${align(c.key)};border:1px solid #b8c2cc;padding:5px;vertical-align:top">${esc(val(x,c.key,i))}</td>`).join('')}</tr>`).join('');
 return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(reportTitle())}</title><style>
 @page{size:A4 ${orientation};margin:12mm}
 body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#111;margin:0}
 .head{display:grid;grid-template-columns:58px 1fr 58px;align-items:center;gap:10px;border-bottom:2px solid #263746;padding-bottom:8px;margin-bottom:12px}
 .head img{width:54px;height:54px;object-fit:contain}.title{text-align:center}.school{font-size:14pt;font-weight:700}.name{font-size:12pt;font-weight:700;margin-top:3px}.year{font-size:9pt;color:#5b6470;margin-top:3px}
 table{border-collapse:collapse;width:${Math.max(tableWidth,100)}px;table-layout:fixed}th,td{box-sizing:border-box}
 .footer{display:flex;justify-content:space-between;gap:24px;margin-top:16px;font-size:9pt}.footer>div{min-width:40%}
 </style></head><body>
 <div class="head"><img src="assets/logo.png" alt="Okul logosu"><div class="title"><div class="school">${esc(bs.okulAdi||'')}</div><div class="name">${esc(reportTitle())}</div><div class="year">${esc(bs.egitimYili||'')} Eğitim-Öğretim Yılı</div></div><span></span></div>
 <table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table>
 <div style="text-align:right;margin-top:8px">Toplam öğrenci sayısı: <strong>${draft.satirlar.length}</strong></div>
 <div class="footer"><div>Öğretmen: <strong>${esc(bs.ogretmen||'')}</strong><br>${esc(bs.brans||'')}<br><br>İmza: .......................</div><div style="text-align:right">${esc(bs.mudurUnvan||'Okul Müdürü')}: <strong>${esc(bs.mudur||'')}</strong><br><br>İmza: .......................</div></div>
 </body></html>`;
}
function downloadBlob(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function exportWord(){
 if(!draft)return;
 const html=wordHtml();
 const safeName=(reportTitle()||'Ogrenci_Listesi').replace(/[\\/:*?"<>|]/g,'_').trim()||'Ogrenci_Listesi';
 const blob=new Blob([html],{type:'application/msword;charset=utf-8'});
 downloadBlob(blob,`${safeName}.doc`);
 global.toast?.('Word dosyası hazırlandı.');
}
async function open(){mounted=true;installStyles();loading();await global.TeacherListCoreLoader?.();global.OgretmenListeUI=api;await global.OgretmenListeService?.prepare?.();render();resub();return true}
function close(){mounted=false;try{unsubscribe?.()}catch(_){}unsubscribe=null;resizeState=null;document.body.classList.remove('sl-column-resizing');return true}
const api={open,close,render,newDraft:()=>choose(selectedClass),openRecord:id=>{const x=arr('ogretmenListeKayit').find(y=>y.id===id);if(x){selectedClass=x.sinif;editingId=id;draft=normalize(x);render()}},openReport};
global.StudentListPage=api;
})(window);
