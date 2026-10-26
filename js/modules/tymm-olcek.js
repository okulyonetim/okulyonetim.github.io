/* Koruk Asistan — TYMM İlkokul Ölçekleri
 * 1–4. sınıflar için süreç değerlendirme gözlem formları: sınıf ve ders seç, öğrenci × ölçüt puanla (1–4), ortalama ve düzey otomatik, A4 yatay yazdır.
 * Puanlar oy_tymmOlcekleri koleksiyonunda DeviceData/SyncEngine ile tutulur; her öğretmen yalnız kendi puanlarını görür (yönetici hepsini okuyabilir).
 * Katalog data/tymm/{sinif}.json · mantık tymm-olcek-core.js · çıktı tymm-olcek-print.js
 */
(function(global){
'use strict';
if(global.TymmModule)return;

const T='tymmOlcekleri';
const PREF='tymmBaski';
const KATALOG=n=>`./data/tymm/${n}.json`;
const C=()=>global.TymmCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const device=()=>global.DeviceData;
const isAdmin=()=>user().admin===true;
const teacherId=()=>{const u=user();return u.bagliOgretmenId||u.ogretmenId||''};
const toast=m=>global.toast?.(m);
const personName=p=>p?(`${p.ad||''} ${p.soyad||''}`.trim()||p.adSoyad||''):'';
const okulB=()=>{const l=rows('okulBilgileri');return l.find(r=>r.id==='ayarlar')||l[0]||global.okulBilgileriAyari||{}};

/* ── ekran durumu ── */
const S={view:'home',sinifId:'',donem:0,ders:'',form:'',doc:null,saved:false,dirty:false,legend:false};
let mounted=null,saveTimer=0,remoteAt=0,menu=null,catalogErr='';
const catCache=new Map(),catLoading=new Map();

/* ── yüklemeler ── */
async function ensureDeps(){
 const L=global.AppLoader;
 if(!global.TymmCore)await L?.loadScript?.('js/modules/tymm-olcek-core.js');
 if(!global.ReportEngine?.printReport)await L?.loadScript?.('js/modules/report-engine.js');
 if(!global.TymmCore)throw new Error('TYMM bileşenleri yüklenemedi.');
}
function loadCatalog(g){
 if(catCache.has(g))return Promise.resolve(catCache.get(g));
 if(catLoading.has(g))return catLoading.get(g);
 const p=global.fetch(KATALOG(g)).then(r=>{if(!r.ok)throw new Error('Katalog alınamadı ('+r.status+').');return r.json()})
  .then(j=>{catCache.set(g,j);catalogErr='';return j})
  .catch(e=>{catalogErr=String(e?.message||e);return null})
  .finally(()=>{catLoading.delete(g)});
 catLoading.set(g,p);return p;
}
function refreshRemote(){
 const now=Date.now();
 if(!navigator.onLine||!global.SyncEngine?.sync||now-remoteAt<45000)return;
 remoteAt=now;
 Promise.resolve(global.SyncEngine.sync([T],{force:true,full:true})).catch(e=>console.warn('[TYMM eşitleme]',e?.message||e));
}
async function prepare(){
 const SE=global.SyncEngine,col=global.COL?.tymmOlcekleri;
 if(!SE||!col)return;
 try{
  const u=user();
  SE.register(T,col,{query:q=>!u.uid?q:q.where('sahipUid','==',u.uid)});
  await SE.localHydrate([T]);SE.schedule?.(100);refreshRemote();
 }catch(e){console.warn('[TYMM]',e?.message||e)}
}

/* ── sınıf, öğrenci, katalog seçimi ── */
function classes(){
 const tid=teacherId();
 const all=rows('siniflar').filter(c=>C().isPrimary(c));
 const mine=isAdmin()?all:(tid?all.filter(c=>c.sinifOgretmeniId===tid||rows('dersProgrami').some(d=>d.ogretmenId===tid&&d.sinif===c.ad)):[]);
 return mine.sort((a,b)=>C().classLabel(a).localeCompare(C().classLabel(b),'tr',{numeric:true}));
}
function ensureSelection(){
 const list=classes();
 if(!list.some(c=>c.id===S.sinifId)){
  const tid=teacherId();
  S.sinifId=(list.find(c=>c.sinifOgretmeniId===tid)||list[0])?.id||'';
 }
 if(!S.donem)S.donem=C().currentTerm();
 return list;
}
const curClass=()=>classes().find(c=>c.id===S.sinifId)||null;
const curGrade=()=>C().classGrade(curClass());
const curCatalog=()=>catCache.get(curGrade())||null;
const curCourse=()=>C().courseOf(curCatalog(),S.donem,S.ders);
const curForm=()=>C().formOf(curCourse(),S.form);
const students=()=>C().sortStudents(rows('veliler').filter(v=>v.sinifId===S.sinifId));
const studentIds=()=>students().map(v=>v.id);

/* ── puan belgesi ── */
function docContext(courseKey){
 const c=curClass(),cat=curCatalog();
 return{sahipUid:user().uid||'',sinifId:S.sinifId,sinifAd:C().classLabel(c),sinif:curGrade(),sube:C().branchOf(C().classLabel(c)),yil:cat?.yil||C().schoolYear(),donem:S.donem,ders:courseKey};
}
function storedDoc(courseKey){
 const id=C().docId(docContext(courseKey));
 return rows(T).find(r=>r.id===id)||null;
}
function loadDoc(course){
 const raw=storedDoc(course.key);
 S.saved=!!raw;
 return C().normalize(raw||C().blank(docContext(course.key)),course);
}
function markDirty(){
 S.dirty=true;showStatus();
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{save({silent:true})},700);
}
function showStatus(text){
 const el=mounted?.querySelector('[data-tm-status]');if(!el)return;
 const t=text||(S.dirty?'Kaydedilmedi':(S.saved?'Kaydedildi':'Henüz puan girilmedi'));
 el.textContent=t;el.dataset.state=S.dirty?'dirty':'ok';
}
async function save({silent=false}={}){
 clearTimeout(saveTimer);
 const d=S.doc;if(!d||!S.dirty)return true;
 const hasScore=Object.keys(d.puanlar).length>0;
 if(!hasScore&&!S.saved){S.dirty=false;showStatus();return true}
 try{
  d.sahipUid=d.sahipUid||user().uid||'';
  d.guncelleme=new Date().toISOString();
  await device().set(T,global.COL.tymmOlcekleri,d.id,d,{merge:false});
  S.saved=true;S.dirty=false;showStatus();
  return true;
 }catch(e){
  console.warn('[TYMM kayıt]',e);
  if(!silent)toast('Kaydedilemedi: '+(e?.message||e));
  showStatus('Kaydedilemedi');
  return false;
 }
}

/* ── baskı bilgileri (okul adı, üst makam, müdür, öğretmen) ── */
/* Üst makam: il merkezinde (ilçe boş ya da “Merkez”) Valilik, diğer ilçelerde Kaymakamlık; yazdırma bilgilerinden elle değiştirilir. */
const makamOto=(il,ilce)=>(!String(ilce||'').trim()||/merkez/i.test(ilce))&&String(il||'').trim()?'valilik':'kaymakamlik';
function readPref(){try{const o=JSON.parse(global.KaPrefs?.get?.(PREF,'')||'{}');return o&&typeof o==='object'?o:{}}catch{return{}}}
function writePref(o){
 const txt=JSON.stringify(o);
 global.KaPrefs?.set?.(PREF,txt);global.KaPrefs?.remoteSet?.({[PREF]:txt});
}
function printInfo(){
 const o=okulB(),p=readPref(),cls=curClass();
 const tur=p.makamTur==='valilik'||p.makamTur==='kaymakamlik'?p.makamTur:makamOto(o.il,o.ilce);
 const mudur=personName(rows('ogretmenler').find(t=>t.id===(o.mudurId||o.mudirId)))||String(o.mudurAdSoyad||o.mudurAdi||'').trim();
 const ogretmen=personName(rows('ogretmenler').find(t=>t.id===(cls?.sinifOgretmeniId||teacherId())));
 return{
  okul:p.okul||String(o.okulAdi||o.ad||'').trim(),
  makamTur:tur,
  makamAd:p.makamAd||String((tur==='valilik'?o.il:o.ilce)||'').trim(),
  mudur:p.mudur||mudur,
  ogretmen:p.ogretmen||ogretmen
 };
}

/* ── çizim ── */
function viewHome(list){
 const head=`<header class="vgf-head ka-tm-head"><div><h2>TYMM İlkokul Ölçekleri</h2><p class="ka-muted">1–4. sınıflar için süreç değerlendirme gözlem formları. Puanlarınız yalnız size görünür.</p></div></header>`;
 if(!list.length){
  return head+`<div class="ka-tm-empty"><strong>Ölçek kullanılacak sınıf bulunamadı</strong><p>${isAdmin()?'Sınıflar bölümünde 1–4. sınıf şubesi bulunmuyor.':'Hesabınıza bağlı 1–4. sınıf şubesi yok. Sınıf öğretmeni olarak atanmanız gerekir.'}</p></div>`;
 }
 const g=curGrade(),cat=curCatalog(),courses=C().coursesOf(cat,S.donem),ids=studentIds();
 const classOpts=list.map(c=>`<option value="${esc(c.id)}" ${c.id===S.sinifId?'selected':''}>${esc(C().classLabel(c))}</option>`).join('');
 const termOpts=C().DONEMLER.map(d=>`<option value="${d.n}" ${d.n===S.donem?'selected':''} ${cat&&!C().termOf(cat,d.n)?'disabled':''}>${d.ad}</option>`).join('');
 const filters=`<div class="ka-tm-filters"><label class="ka-field"><span class="ka-field__label">Sınıf</span><select class="ka-input" data-tm-sel="sinif">${classOpts}</select></label><label class="ka-field"><span class="ka-field__label">Dönem</span><select class="ka-input" data-tm-sel="donem">${termOpts}</select></label></div>`;
 let body;
 if(!cat)body=catalogErr?`<div class="ka-tm-empty"><strong>Katalog alınamadı</strong><p>${esc(catalogErr)}</p><button class="ka-btn" type="button" data-tm-act="retry">Yeniden dene</button></div>`:`<p class="ka-tm-empty">Ölçekler yükleniyor…</p>`;
 else if(!courses.length)body=`<div class="ka-tm-empty"><strong>${S.donem}. dönem formları henüz eklenmedi</strong><p>${g}. sınıf için bu dönemin gözlem formları yayınlandığında burada görünür.</p></div>`;
 else{
  const cards=courses.map(co=>{
   const d=storedDoc(co.key),pr=C().courseProgress(d?C().normalize(d,co):C().blank(docContext(co.key)),co,ids);
   return`<button type="button" class="ka-tm-course" data-tm-act="ders" data-key="${esc(co.key)}"><strong>${esc(co.ad)}</strong><small>${co.formlar.length} form · ${C().criteriaCount(co)} ölçüt</small><span class="ka-tm-bar" aria-hidden="true"><i style="width:${pr.yuzde}%"></i></span><small>${ids.length?`%${pr.yuzde} dolu`:'Sınıfta öğrenci yok'}</small></button>`;
  }).join('');
  body=`<div class="ka-tm-courses">${cards}</div>`;
 }
 const pi=printInfo();
 const info=`<details class="ka-card ka-tm-info"><summary>Yazdırma bilgileri</summary><div class="ka-card__body ka-stack"><p class="ka-muted">Gözlem formunun üst yazısı ve imza bölümü için. Boş bırakılanlar okul ayarlarından alınır.</p><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Okul adı</span><input class="ka-input" type="text" value="${esc(readPref().okul||'')}" placeholder="${esc(pi.okul)}" data-tm-pref="okul" autocomplete="off"></label><label class="ka-field"><span class="ka-field__label">Üst makam</span><select class="ka-input" data-tm-pref="makamTur"><option value="valilik" ${pi.makamTur==='valilik'?'selected':''}>Valilik</option><option value="kaymakamlik" ${pi.makamTur==='kaymakamlik'?'selected':''}>Kaymakamlık</option></select></label><label class="ka-field"><span class="ka-field__label">Makam adı (il veya ilçe)</span><input class="ka-input" type="text" value="${esc(readPref().makamAd||'')}" placeholder="${esc(pi.makamAd)}" data-tm-pref="makamAd" autocomplete="off"></label>${[['mudur','Okul müdürü'],['ogretmen','Sınıf öğretmeni']].map(([k,l])=>`<label class="ka-field"><span class="ka-field__label">${l}</span><input class="ka-input" type="text" value="${esc(readPref()[k]||'')}" placeholder="${esc(pi[k]||'')}" data-tm-pref="${k}" autocomplete="off"></label>`).join('')}</div></div></details>`;
 return head+filters+body+info;
}
function formOptions(course){
 return course.formlar.map(f=>`<option value="${esc(f.key)}" ${f.key===S.form?'selected':''}>${esc(C().formText(f))}</option>`).join('');
}
function legendHtml(f){
 let i=0;const items=[];
 if(f.gruplar){for(const g of f.gruplar){items.push(`<li class="ka-tm-legend__g"><strong>${esc(g.ad)}</strong></li>`);for(let k=0;k<g.say;k++,i++){const o=f.olcutler[i];items.push(`<li value="${i+1}"><b>${esc(o.kod)}</b> ${esc(o.metin)}</li>`)}}}
 else f.olcutler.forEach((o,k)=>items.push(`<li value="${k+1}"><b>${esc(o.kod)}</b> ${esc(o.metin)}</li>`));
 return`<details class="ka-card ka-tm-legend" data-tm-legend ${S.legend?'open':''}><summary>Ölçütler (${f.olcutler.length})</summary><ol class="ka-tm-legend__list">${items.join('')}</ol></details>`;
}
function cellSelect(f,o,i){
 const v=C().score(S.doc,f,o.id,i);
 return`<td><select class="ka-tm-cell" data-p="${v}" data-o="${esc(o.id)}" data-i="${i}" aria-label="${esc(C().studentName(o))}, ${i+1}. ölçüt"><option value="0"></option>${C().PUANLAR.map(p=>`<option value="${p.n}" ${p.n===v?'selected':''}>${p.n}</option>`).join('')}</select></td>`;
}
function summaryCells(f,o){
 const s=C().rowSummary(S.doc,f,o.id);
 return`<td class="ka-tm-ort ${s.dolu&&!s.tam?'is-part':''}" data-tm-ort="${esc(o.id)}" ${s.dolu&&!s.tam?`title="${s.dolu}/${s.toplam} ölçüt"`:''}>${esc(s.ortMetin)}</td><td class="ka-tm-dz" data-tm-dz="${esc(o.id)}" data-d="${s.duzey}">${esc(s.duzeyAd)}</td>`;
}
function tableHtml(f,list){
 const n=f.olcutler.length;
 const grp=f.gruplar?`<tr class="ka-tm-grp"><th></th>${f.gruplar.map(g=>`<th colspan="${g.say}">${esc(g.ad)}</th>`).join('')}<th colspan="2"></th></tr>`:'';
 const head=`<tr><th class="ka-tm-name">Öğrenci</th>${f.olcutler.map((o,i)=>`<th class="ka-tm-oc" title="${esc(o.kod+' — '+o.metin)}"><button type="button" class="ka-tm-hd" data-tm-act="col" data-i="${i}" aria-label="${i+1}. ölçüt: tüm öğrencilere puan ver">${i+1}</button></th>`).join('')}<th class="ka-tm-sum">Ort.</th><th class="ka-tm-sum">Değerlendirme</th></tr>`;
 const body=list.map(o=>`<tr data-tm-row="${esc(o.id)}"><th class="ka-tm-name" scope="row"><button type="button" class="ka-tm-who" data-tm-act="row" data-o="${esc(o.id)}" aria-label="${esc(C().studentName(o))}: tüm ölçütlere puan ver"><span class="ka-tm-no">${esc(C().studentNo(o))}</span><span>${esc(C().studentName(o))}</span></button></th>${Array.from(f.olcutler.keys(),i=>cellSelect(f,o,i)).join('')}${summaryCells(f,o)}</tr>`).join('');
 const ids=list.map(o=>o.id);
 const foot=`<tr class="ka-tm-foot"><th class="ka-tm-name">Sınıf ortalaması</th>${Array.from({length:n},(_,i)=>`<td data-tm-col="${i}">${esc(C().columnAverage(S.doc,f,ids,i).ortMetin)}</td>`).join('')}<td></td><td></td></tr>`;
 return`<table class="ka-tm-table"><thead>${grp}${head}</thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table>`;
}
function viewDers(){
 const co=curCourse(),f=curForm(),cls=curClass();
 if(!co||!f)return`<p class="ka-tm-empty">Ders bulunamadı.</p>`;
 const list=students(),i=co.formlar.findIndex(x=>x.key===f.key);
 const bar=`<header class="ka-tm-top"><button class="ka-btn ka-btn--secondary" type="button" data-tm-act="home">← Dersler</button><div class="ka-tm-top__title"><strong>${esc(C().classLabel(cls))} · ${esc(co.ad)}</strong><span data-tm-status data-state="${S.dirty?'dirty':'ok'}">${S.dirty?'Kaydedilmedi':(S.saved?'Kaydedildi':'Henüz puan girilmedi')}</span></div></header>`;
 const picker=`<div class="ka-tm-formbar"><button type="button" class="ka-btn ka-btn--secondary" data-tm-act="prev" aria-label="Önceki form" ${i<=0?'disabled':''}>‹</button><select class="ka-input" data-tm-sel="form" aria-label="Form">${formOptions(co)}</select><button type="button" class="ka-btn ka-btn--secondary" data-tm-act="next" aria-label="Sonraki form" ${i>=co.formlar.length-1?'disabled':''}>›</button></div>`;
 const acts=`<div class="ka-tm-actions"><button class="ka-btn" type="button" data-tm-act="print-form">Yazdır / PDF</button><button class="ka-btn ka-btn--secondary" type="button" data-tm-act="print-all">Dersin tüm formları</button><button class="ka-btn ka-btn--secondary" type="button" data-tm-act="clear">Formu temizle</button></div>`;
 const table=list.length?`<p class="ka-muted ka-tm-hint">Hücreye dokunup puan seçin. Öğrenci adına ya da ölçüt numarasına dokunarak satırı veya sütunu tek seferde doldurabilirsiniz.</p><div class="ka-tm-scroll" data-tm-scroll>${tableHtml(f,list)}</div>`
  :`<div class="ka-tm-empty"><strong>Bu sınıfta öğrenci yok</strong><p>Önce Öğrenciler bölümünden sınıfa öğrenci ekleyin.</p></div>`;
 return`${bar}${picker}<p class="ka-tm-formtitle">${esc(C().printTitle(f))}</p>${acts}${legendHtml(f)}${table}`;
}
function root(){return document.getElementById('v2ModuleRoot')}
function render(){
 const r=root();if(!r||!global.TymmCore)return false;
 mounted=r;closeMenu();
 const list=ensureSelection();
 const g=curGrade();
 if(g&&!catCache.has(g)&&!catLoading.has(g)&&!catalogErr)loadCatalog(g).then(()=>{if(mounted&&document.body.contains(mounted)&&mounted.querySelector('[data-tm-page]'))afterCatalog()});
 r.innerHTML=`<section class="vgf-page ka-tm" data-tm-page>${S.view==='ders'&&S.doc?viewDers():viewHome(list)}</section>`;
 bind(r);
 return true;
}
function afterCatalog(){
 if(S.view==='ders')return;
 const cat=curCatalog();
 if(cat&&!C().termOf(cat,S.donem)){const first=C().DONEMLER.find(d=>C().termOf(cat,d.n));if(first)S.donem=first.n}
 render();
}
function renderTable(){
 const f=curForm(),box=mounted?.querySelector('[data-tm-scroll]');
 if(!f||!box)return render();
 const x=box.scrollLeft,y=global.scrollY;
 box.innerHTML=tableHtml(f,students());box.scrollLeft=x;global.scrollTo?.(0,y);
}
function refreshRow(id){
 const f=curForm(),o=students().find(v=>v.id===id);if(!f||!o||!mounted)return;
 const tr=[...mounted.querySelectorAll('[data-tm-row]')].find(r=>r.dataset.tmRow===id);if(!tr)return;
 tr.querySelectorAll('.ka-tm-cell').forEach(s=>{const v=C().score(S.doc,f,id,Number(s.dataset.i));s.value=String(v);s.dataset.p=String(v)});
 const tmp=document.createElement('tbody');tmp.innerHTML=`<tr>${summaryCells(f,o)}</tr>`;
 const [ort,dz]=tmp.querySelectorAll('td');
 const oldOrt=tr.querySelector('[data-tm-ort]'),oldDz=tr.querySelector('[data-tm-dz]');
 if(oldOrt&&ort)oldOrt.replaceWith(ort);if(oldDz&&dz)oldDz.replaceWith(dz);
}
function refreshFoot(){
 const f=curForm();if(!f||!mounted)return;
 const ids=studentIds();
 mounted.querySelectorAll('[data-tm-col]').forEach(td=>{td.textContent=C().columnAverage(S.doc,f,ids,Number(td.dataset.tmCol)).ortMetin});
}

/* ── hızlı doldurma menüsü (satır / sütun) ── */
function closeMenu(){
 if(!menu)return;
 menu.el.remove();
 document.removeEventListener('pointerdown',menu.away,true);document.removeEventListener('keydown',menu.key,true);
 menu=null;
}
function openMenu(btn,kind,ref){
 closeMenu();
 const f=curForm();if(!f||!mounted)return;
 const o=kind==='col'?f.olcutler[ref]:null;
 const title=kind==='col'?`<b>${ref+1}. ölçüt · ${esc(o?.kod||'')}</b>${esc(o?.metin||'')}<i>Tüm öğrencilere:</i>`:`<b>${esc(C().studentName(students().find(v=>v.id===ref)||{}))}</b><i>Tüm ölçütlere:</i>`;
 const el=document.createElement('div');
 el.className='ka-tm-menu';el.setAttribute('role','menu');
 el.innerHTML=`<span class="ka-tm-menu__t">${title}</span>${C().PUANLAR.map(p=>`<button type="button" role="menuitem" class="ka-tm-menu__b" data-tm-fill="${p.n}" data-p="${p.n}"><b>${p.n}</b><span>${esc(p.ad)}</span></button>`).join('')}<button type="button" role="menuitem" class="ka-tm-menu__b ka-tm-menu__c" data-tm-fill="0">Boşalt</button>`;
 mounted.appendChild(el);
 const r=btn.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight,vw=global.innerWidth,vh=global.innerHeight;
 const left=Math.max(8,Math.min(r.left,vw-w-8));
 const top=r.bottom+h+8>vh?Math.max(8,r.top-h-4):r.bottom+4;
 el.style.left=left+'px';el.style.top=top+'px';
 menu={el,kind,ref,
  away:e=>{if(!el.contains(e.target))closeMenu()},
  key:e=>{if(e.key==='Escape')closeMenu()}};
 document.addEventListener('pointerdown',menu.away,true);document.addEventListener('keydown',menu.key,true);
 el.querySelector('button')?.focus();
}
function applyFill(v){
 if(!menu)return;
 const f=curForm(),{kind,ref}=menu;closeMenu();
 if(!f)return;
 if(kind==='col')C().fillColumn(S.doc,f,studentIds(),ref,v);
 else C().fillRow(S.doc,f,ref,v);
 markDirty();renderTable();
}

/* ── olaylar ── */
function bind(r){
 if(r.__tmBound)return;
 r.__tmBound=true;
 r.addEventListener('click',onClick);
 r.addEventListener('change',onChange);
 r.addEventListener('input',onInput);
 r.addEventListener('toggle',onToggle,true);
}
const inPage=e=>e.target?.closest?.('[data-tm-page],.ka-tm-menu');
function onToggle(e){
 const d=e.target;
 if(d?.matches?.('[data-tm-legend]'))S.legend=d.open;
}
function onInput(e){
 const el=e.target?.closest?.('[data-tm-pref]');if(!el)return;
 const p=readPref(),k=el.dataset.tmPref,v=el.value.trim();
 if(v)p[k]=v;else delete p[k];
 writePref(p);
 if(k==='makamTur'){const ad=mounted?.querySelector('[data-tm-pref="makamAd"]');if(ad)ad.placeholder=printInfo().makamAd}
}
function onChange(e){
 if(!inPage(e))return;
 const cell=e.target.closest('.ka-tm-cell');
 if(cell){
  const f=curForm();if(!f)return;
  const v=Number(cell.value)||0;
  C().setScore(S.doc,f,cell.dataset.o,Number(cell.dataset.i),v);
  cell.dataset.p=String(v);
  refreshRow(cell.dataset.o);refreshFoot();markDirty();
  return;
 }
 const sel=e.target.closest('[data-tm-sel]');
 if(!sel)return;
 const k=sel.dataset.tmSel;
 if(k==='sinif'){S.sinifId=sel.value;render()}
 else if(k==='donem'){S.donem=Number(sel.value)||1;render()}
 else if(k==='form')goForm(sel.value);
}
async function goForm(key){
 if(S.dirty)await save({silent:true});
 S.form=key;render();global.scrollTo?.(0,0);
}
async function openCourse(key){
 const co=C().courseOf(curCatalog(),S.donem,key);if(!co)return;
 S.ders=key;S.form=co.formlar[0]?.key||'';S.doc=loadDoc(co);S.dirty=false;S.view='ders';
 render();global.scrollTo?.(0,0);
}
async function backHome(){
 if(S.dirty)await save({silent:true});
 clearTimeout(saveTimer);
 S.view='home';S.doc=null;S.dirty=false;render();
}
async function ensurePrint(){
 if(!global.TymmPrint)await global.AppLoader?.loadScript?.('js/modules/tymm-olcek-print.js');
 if(!global.TymmPrint)throw new Error('Yazdırma bileşeni yüklenemedi.');
}
async function printForms(all){
 const co=curCourse(),f=curForm();if(!co||!f)return;
 if(S.dirty)await save({silent:true});
 try{
  await ensurePrint();
  const info=printInfo(),cls=curClass(),cat=curCatalog();
  global.TymmPrint.print({
   formlar:all?co.formlar:[f],doc:S.doc,ogrenciler:students(),
   okul:info.okul,makamTur:info.makamTur,makamAd:info.makamAd,mudur:info.mudur,ogretmen:info.ogretmen,
   yil:cat?.yil||C().schoolYear(),donem:S.donem,sinifAd:C().classLabel(cls),sinif:curGrade(),sube:C().branchOf(C().classLabel(cls)),ders:co.ad
  });
 }catch(e){console.warn('[TYMM yazdır]',e);toast('Yazdırma hazırlanamadı: '+(e?.message||e))}
}
const ACTIONS={
 retry:async()=>{catalogErr='';const g=curGrade();catCache.delete(g);render()},
 ders:b=>openCourse(b.dataset.key),
 home:()=>backHome(),
 prev:()=>{const co=curCourse(),i=co.formlar.findIndex(x=>x.key===S.form);if(i>0)goForm(co.formlar[i-1].key)},
 next:()=>{const co=curCourse(),i=co.formlar.findIndex(x=>x.key===S.form);if(i<co.formlar.length-1)goForm(co.formlar[i+1].key)},
 col:b=>openMenu(b,'col',Number(b.dataset.i)),
 row:b=>openMenu(b,'row',b.dataset.o),
 'print-form':()=>printForms(false),
 'print-all':()=>printForms(true),
 clear:()=>{
  const f=curForm();if(!f)return;
  if(!Object.keys(S.doc.puanlar[f.key]||{}).length){toast('Bu formda silinecek puan yok.');return}
  if(!global.confirm('Bu formdaki tüm puanlar silinsin mi? Bu işlem geri alınamaz.'))return;
  C().clearForm(S.doc,f);markDirty();renderTable();
 }
};
function onClick(e){
 if(!inPage(e))return;
 const fill=e.target.closest('[data-tm-fill]');
 if(fill){applyFill(Number(fill.dataset.tmFill)||0);return}
 const b=e.target.closest('[data-tm-act]');if(!b)return;
 ACTIONS[b.dataset.tmAct]?.(b,e);
}

/* ── açılış ── */
async function open(){
 try{await ensureDeps()}catch(e){console.error('[TYMM]',e);toast('TYMM modülü açılamadı.');return false}
 if(S.dirty&&S.doc)await save({silent:true});
 clearTimeout(saveTimer);
 S.view='home';S.doc=null;S.dirty=false;
 render();
 prepare().then(()=>{if(S.view==='home'&&document.querySelector('[data-tm-page]'))render()});
 return true;
}
function unmount(){clearTimeout(saveTimer);if(S.dirty)save({silent:true});closeMenu();mounted=null}

global.TymmModule={open,render,unmount};
})(window);
