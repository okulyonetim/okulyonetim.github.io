/* Koruk Asistan — BEP Dosyası Hazırla
 * Öğretmenin kendi öğrencileri için BEP dosyaları: kayıtlı dosya listesi + 6 adımlı hazırlama ekranı.
 * Kayıtlar oy_bepDosyalari koleksiyonunda DeviceData/SyncEngine ile tutulur; her öğretmen yalnız kendi dosyalarını görür (yönetici hepsini).
 * Kazanım kataloğu data/bep/ altındadır; mantık bep-core.js, çıktı (yazdır/PDF/Word) bep-print.js içindedir.
 */
(function(global){
'use strict';
if(global.BepModule)return;

const T='bepDosyalari';
const INDEX_URL='./data/bep/index.json';
const DERS_URL='./data/bep/dersler/';
const C=()=>global.BepCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const device=()=>global.DeviceData;
const isAdmin=()=>user().admin===true;
const toast=m=>global.toast?.(m);

/* ── ekran durumu ── */
const S={view:'list',step:'ogrenci',rec:null,dirty:false,query:'',ders:'',panel:'',gradePick:0,courseQ:'',kzQ:'',units:null,unitsKey:'',open:{},stQ:''};
let catalog=null,catalogErr='',catalogLoading=null,saveTimer=0,remoteAt=0,mounted=null;
const dersCache=new Map();

/* ── ek yüklemeler ── */
async function ensureDeps(){
 const L=global.AppLoader;
 if(!global.BepCore)await L?.loadScript?.('js/modules/bep-core.js');
 if(!global.BepPrint)await L?.loadScript?.('js/modules/bep-print.js');
 if(!global.ReportEngine?.printReport)await L?.loadScript?.('js/modules/report-engine.js');
 if(!global.BepCore||!global.BepPrint)throw new Error('BEP bileşenleri yüklenemedi.');
}
function loadCatalog(){
 if(catalog)return Promise.resolve(catalog);
 if(catalogLoading)return catalogLoading;
 catalogLoading=global.fetch(INDEX_URL).then(r=>{if(!r.ok)throw new Error('Katalog alınamadı ('+r.status+').');return r.json()})
  .then(j=>{catalog=j;catalogErr='';return j})
  .catch(e=>{catalogErr=String(e?.message||e);return null})
  .finally(()=>{catalogLoading=null});
 return catalogLoading;
}
async function loadCourse(dosya){
 if(dersCache.has(dosya))return dersCache.get(dosya);
 const r=await global.fetch(DERS_URL+encodeURIComponent(dosya));
 if(!r.ok)throw new Error('Ders dosyası alınamadı ('+r.status+').');
 const j=await r.json();dersCache.set(dosya,j);return j;
}
function refreshRemote(){
 const now=Date.now();
 if(!navigator.onLine||!global.SyncEngine?.sync||now-remoteAt<45000)return;
 remoteAt=now;
 Promise.resolve(global.SyncEngine.sync([T],{force:true,full:true})).catch(e=>console.warn('[BEP eşitleme]',e?.message||e));
}
async function prepare(){
 const SE=global.SyncEngine,col=global.COL?.bepDosyalari;
 if(!SE||!col)return;
 try{
  const u=user();
  SE.register(T,col,{query:q=>u.admin===true||!u.uid?q:q.where('sahipUid','==',u.uid)});
  await SE.localHydrate([T]);SE.schedule?.(100);refreshRemote();
 }catch(e){console.warn('[BEP]',e?.message||e)}
}

/* ── okul/öğretmen bilgisi ── */
function schoolCtx(){
 const x=rows('okulBilgileri').find(r=>r.id==='ayarlar')||rows('okulBilgileri')[0]||global.okulBilgileriAyari||{};
 const mudur=x.mudurId?rows('ogretmenler').find(o=>o.id===x.mudurId):null;
 const id=user().bagliOgretmenId||user().ogretmenId||'';
 const t=rows('ogretmenler').find(o=>String(o.id)===String(id));
 const name=p=>p?(`${p.ad||''} ${p.soyad||''}`.trim()||p.adSoyad||''):'';
 return{okul:x.okulAdi||x.ad||global.ReportEngine?.schoolInfo?.().okulAdi||'',mudur:name(mudur),ogretmen:name(t)};
}
function newRecord(){
 const s=schoolCtx(),u=user();
 return C().blank({uid:u.uid||'',ad:u.adSoyad||u.ad||u.kullaniciAdi||s.ogretmen,okul:s.okul,mudur:s.mudur,ogretmen:s.ogretmen});
}
function records(){
 const uid=user().uid;
 const all=rows(T).filter(r=>isAdmin()||!uid||r.sahipUid===uid);
 return all.map(r=>C().normalize(r)).sort((a,b)=>String(b.guncelleme).localeCompare(String(a.guncelleme)));
}

/* ── kayıt ── */
function markDirty(){
 S.dirty=true;showStatus();
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{save({silent:true})},1500);
}
function showStatus(){
 const el=mounted?.querySelector('[data-bep-status]');if(!el)return;
 el.textContent=S.dirty?'Kaydedilmedi':(S.rec?.id?'Kaydedildi':'Yeni dosya');
 el.dataset.state=S.dirty?'dirty':'ok';
}
async function save({silent=false}={}){
 clearTimeout(saveTimer);
 const r=S.rec;if(!r)return false;
 if(!String(r.ogrenci.adSoyad||'').trim()){if(!silent)toast('Kaydetmek için öğrencinin adını yazın.');return false}
 try{
  const u=user();
  if(!r.id)r.id=device().newId();
  if(!r.sahipUid)r.sahipUid=u.uid||'';
  if(!r.olusturanAd)r.olusturanAd=u.adSoyad||u.ad||u.kullaniciAdi||'';
  r.guncelleme=new Date().toISOString();
  const clean=C().normalize(r);
  await device().set(T,global.COL.bepDosyalari,clean.id,clean,{merge:false});
  S.dirty=false;showStatus();
  if(!silent)toast('BEP dosyası kaydedildi.');
  return true;
 }catch(e){
  console.warn('[BEP kayıt]',e);
  if(!silent)toast('Kaydedilemedi: '+(e?.message||e));
  return false;
 }
}

/* ── küçük yardımcılar ── */
const field=(label,inner,cls='')=>`<label class="ka-field ${cls}"><span class="ka-field__label">${esc(label)}</span>${inner}</label>`;
const val=(path)=>path.split('.').reduce((o,k)=>o?.[k],S.rec);
function setPath(path,v){
 const parts=path.split('.'),last=parts.pop();
 const o=parts.reduce((x,k)=>x[k],S.rec);o[last]=v;
}
const input=(path,type='text',ph='',extra='')=>`<input class="ka-input" type="${type}" value="${esc(val(path))}" placeholder="${esc(ph)}" data-bep-f="${path}" autocomplete="off" ${extra}>`;
const area=(path,rowsN,ph)=>`<textarea class="ka-input" rows="${rowsN}" placeholder="${esc(ph)}" data-bep-f="${path}">${esc(val(path))}</textarea>`;
function findGoal(gid){
 for(const c of S.rec.dersler){const g=c.amaclar.find(a=>a.id===gid);if(g)return{c,g}}
 return null;
}
const activeCourse=()=>S.rec?.dersler.find(c=>c.key===S.ders)||S.rec?.dersler[0]||null;
function gradeOptions(){
 const list=catalog?C().gradeList(catalog):[];
 return list.length?list.map(g=>({sinif:g.sinif,ad:g.ad})):[1,2,3,4,5,6,7,8].map(n=>({sinif:n,ad:`${n}. Sınıf`}));
}
const trDate=v=>C().trDate(v);

/* ── liste görünümü ── */
function listItem(r){
 const sm=C().summary(r),sinif=r.ogrenci.sinif?`${r.ogrenci.sinif}. Sınıf${r.ogrenci.sube?' / '+esc(r.ogrenci.sube):''}`:'Sınıf yok';
 const sahibi=isAdmin()&&r.olusturanAd?` · ${esc(r.olusturanAd)}`:'';
 const guncel=r.guncelleme?trDate(r.guncelleme.slice(0,10)):'';
 return`<li class="ka-bep-item">
  <button class="ka-bep-item__main" type="button" data-bep-act="open" data-id="${esc(r.id)}">
   <strong>${esc(r.ogrenci.adSoyad||'İsimsiz öğrenci')}</strong>
   <small>${sinif} · ${esc(r.yil)}${sahibi}</small>
   <span class="ka-bep-item__meta"><span class="ka-badge">${sm.ders} ders</span><span class="ka-badge">${sm.amac} amaç</span>${sm.eksik?`<span class="ka-badge ka-bep-warn">${sm.eksik} eksik</span>`:'<span class="ka-badge ka-bep-ok">Hazır</span>'}${guncel?`<small>Güncellendi ${esc(guncel)}</small>`:''}</span>
  </button>
  <div class="ka-bep-item__acts">
   <button class="ka-btn ka-btn--secondary" type="button" data-bep-act="print-rec" data-id="${esc(r.id)}">Yazdır</button>
   <button class="ka-btn ka-btn--secondary" type="button" data-bep-act="dup" data-id="${esc(r.id)}">Yeni yıl için kopyala</button>
   <button class="ka-btn ka-btn--secondary" type="button" data-bep-act="del" data-id="${esc(r.id)}">Sil</button>
  </div>
 </li>`;
}
function viewList(){
 const all=records(),list=all.filter(r=>C().matches(r,S.query));
 const search=all.length>4?`<input class="ka-input" type="search" placeholder="Öğrenci adı, sınıf veya ders ara" value="${esc(S.query)}" data-bep-search aria-label="BEP dosyalarında ara">`:'';
 const body=list.length?`<ul class="ka-bep-list">${list.map(listItem).join('')}</ul>`
  :all.length?`<p class="ka-bep-empty">Aramaya uyan dosya yok.</p>`
  :`<div class="ka-bep-empty ka-bep-empty--big"><strong>Henüz BEP dosyası yok</strong><p>Öğrenciyi, performans düzeyini ve kazanımları adım adım girin; dosya cihazınıza kaydedilir, istediğinizde yazdırır veya Word olarak alırsınız.</p><button class="ka-btn" type="button" data-bep-act="new">İlk BEP dosyasını hazırla</button></div>`;
 return`<header class="vgf-head ka-bep-head"><div><h2>BEP Dosyası Hazırla</h2><p class="ka-muted">Öğrenci için Bireyselleştirilmiş Eğitim Programı hazırlayın. Dosyalarınız yalnız size görünür.</p></div><button class="ka-btn" type="button" data-bep-act="new">Yeni BEP</button></header>${search}${body}`;
}

/* ── düzenleme görünümü ── */
function stepsNav(){
 const st=C().stepStates(S.rec);
 return`<nav class="ka-bep-steps" aria-label="BEP adımları">${C().ADIMLAR.map((a,i)=>`<button type="button" class="ka-bep-step ${S.step===a.id?'is-active':''} is-${st[a.id]}" data-bep-step="${a.id}" aria-current="${S.step===a.id?'step':'false'}"><i>${st[a.id]==='tamam'?'✓':i+1}</i><span>${esc(a.ad)}</span></button>`).join('')}</nav>`;
}
function chips(spec,options,selected){
 const set=new Set(selected);
 return options.map(o=>`<button type="button" class="ka-bep-chip ${set.has(o)?'is-on':''}" aria-pressed="${set.has(o)}" data-bep-tog="${esc(spec)}" data-v="${esc(o)}">${esc(o)}</button>`).join('');
}
function picker(key,label,spec,options,selected){
 const isOpen=!!S.open[key];
 return`<details class="ka-bep-pick" data-bep-pick="${esc(key)}" data-spec="${esc(spec)}" ${isOpen?'open':''}><summary><span>${esc(label)}</span><span class="ka-badge" data-bep-cnt>${selected.length}</span></summary><div class="ka-bep-chips" data-bep-fill>${isOpen?chips(spec,options,selected):''}</div></details>${selected.length?`<p class="ka-bep-picked">${esc(selected.join(', '))}</p>`:''}`;
}
const optYontem=()=>catalog?.yontemler||[];
const optMateryal=()=>catalog?.materyaller||[];
const optTani=()=>catalog?.tanilar||[];
const optOlcut=()=>catalog?.olcutler?.length?catalog.olcutler:C().OLCUTLER;

/* 1 · Öğrenci */
function studentMatches(q){
 const t=C().tr(q).trim();if(t.length<2)return[];
 const cls=rows('siniflar');
 return rows('veliler').filter(v=>C().tr(v.ogrenciAdi).includes(t)).slice(0,8).map(v=>{
  const c=cls.find(x=>x.id===v.sinifId),ad=String(c?.ad||c?.sinifAdi||v.sinifId||'');
  return{id:v.id,ad:v.ogrenciAdi||'',no:v.ogrenciNo||'',sinifAd:ad};
 });
}
function studentResults(list){
 return list.length?`<ul class="ka-bep-pickrows">${list.map(s=>`<li><button type="button" data-bep-act="stpick" data-id="${esc(s.id)}"><strong>${esc(s.ad)}</strong><small>${esc(s.sinifAd)}${s.no?' · No '+esc(s.no):''}</small></button></li>`).join('')}</ul>`:'';
}
function stepOgrenci(){
 const r=S.rec,o=r.ogrenci;
 const y=Number(r.yil.slice(0,4)),yils=[`${y-1}-${y}`,r.yil,`${y+1}-${y+2}`];
 const sel=gradeOptions().map(g=>`<option value="${g.sinif}" ${String(g.sinif)===o.sinif?'selected':''}>${esc(g.ad)}</option>`).join('');
 return`<article class="ka-card"><div class="ka-card__body ka-stack">
  <strong>Öğrenci bilgileri</strong>
  <label class="ka-field"><span class="ka-field__label">Okul listesinden bul (isteğe bağlı)</span><input class="ka-input" type="search" placeholder="Adını yazmaya başlayın" value="${esc(S.stQ)}" data-bep-stq autocomplete="off"></label>
  <div data-bep-stres>${studentResults(studentMatches(S.stQ))}</div>
  <div class="ka-grid">
   ${field('Adı soyadı',input('ogrenci.adSoyad','text','Örn: Ali Yılmaz'))}
   ${field('Sınıfı',`<select class="ka-input" data-bep-f="ogrenci.sinif"><option value="">Seçin</option>${sel}</select>`)}
   ${field('Şubesi',input('ogrenci.sube','text','Örn: A'))}
   ${field('Okul numarası',input('ogrenci.no','text',''))}
   ${field('Doğum tarihi',input('ogrenci.dogum','date'))}
   ${field('Eğitim öğretim yılı',`<select class="ka-input" data-bep-f="yil">${yils.map(v=>`<option value="${v}" ${v===r.yil?'selected':''}>${v}</option>`).join('')}</select>`)}
  </div>
  ${field('Okul adı',input('okul','text','Okulun adı'))}
 </div></article>
 <article class="ka-card"><div class="ka-card__body ka-stack">
  <strong>Tanı ve rapor</strong>
  <p class="ka-muted">RAM raporunda yazan tanıyı seçin; birden fazla seçebilirsiniz.</p>
  ${catalog?`<div class="ka-bep-chips">${chips('rec:ogrenci.tani',optTani(),o.tani)}</div>`:`<p class="ka-bep-empty">Tanı listesi yüklenemedi. ${esc(catalogErr)} <button class="ka-btn ka-btn--secondary" type="button" data-bep-act="reload-catalog">Yeniden dene</button></p>`}
  ${field('Ek not (isteğe bağlı)',input('ogrenci.taniNot','text','Örn: Rapor sonucu, ek açıklama'))}
  <div class="ka-grid">${field('Rapor tarihi',input('ogrenci.raporTarihi','date'))}${field('Raporu veren kurum',input('ogrenci.raporKurum','text','Örn: Rehberlik Araştırma Merkezi'))}</div>
 </div></article>`;
}

/* 2 · Performans */
function stepPerformans(){
 return`<article class="ka-card"><div class="ka-card__body ka-stack">
  <strong>Eğitsel performans düzeyi</strong>
  <p class="ka-muted">Öğrencinin şu andaki durumunu gözleminize göre kısaca yazın. Amaçlar bu bilgiye dayanır.</p>
  ${field('Güçlü yönleri',area('performans.guclu',3,'Örn: Görsel materyallerle öğrenir, yönergeleri tek adımda yerine getirir.'))}
  ${field('İlgi alanları',area('performans.ilgi',2,'Örn: Resim yapmak, hayvanlar, müzik.'))}
  ${field('Gereksinimleri',area('performans.gereksinim',3,'Örn: Okuma akıcılığı ve dört işlem becerilerinde destek.'))}
  ${field('Genel değerlendirme',area('performans.genel',3,'Örn: Dikkat süresi kısa; kısa görevlerle ve pekiştirmeyle verimli çalışır.'))}
 </div></article>`;
}

/* 3 · Amaçlar */
function defaultsCard(){
 const v=S.rec.varsayilan;
 return`<details class="ka-bep-defaults" ${S.open.defaults?'open':''} data-bep-det="defaults"><summary><strong>Varsayılan ayarlar</strong><small>Yeni eklenen her amaca otomatik uygulanır</small></summary>
  <div class="ka-stack">
   ${picker('def-yontem','Öğretim yöntem ve teknikleri','def:yontem',optYontem(),v.yontem)}
   ${picker('def-materyal','Araç ve gereçler','def:materyal',optMateryal(),v.materyal)}
   <div class="ka-grid">
    ${field('Ölçüt',`<select class="ka-input" data-bep-f="varsayilan.olcut">${optOlcut().map(o=>`<option ${o===v.olcut?'selected':''}>${esc(o)}</option>`).join('')}</select>`)}
    ${field('Başlama tarihi',input('varsayilan.baslangic','date'))}
    ${field('Bitiş tarihi',input('varsayilan.bitis','date'))}
   </div>
   <button class="ka-btn ka-btn--secondary" type="button" data-bep-act="apply-defaults">Tüm amaçlara uygula</button>
  </div></details>`;
}
function courseTabs(){
 const list=S.rec.dersler,cur=activeCourse();
 return`<div class="ka-bep-courses">${list.map(c=>`<button type="button" class="ka-bep-course ${cur&&c.key===cur.key?'is-on':''}" data-bep-act="set-course" data-key="${esc(c.key)}"><b>${esc(c.ad)}</b><small>${esc(c.sinif)}. sınıf · ${c.amaclar.length} amaç</small></button>`).join('')}<button type="button" class="ka-bep-course ka-bep-course--add" data-bep-act="panel" data-p="ders">＋ Ders ekle</button></div>`;
}
function coursePanel(){
 const grade=S.gradePick||Number(S.rec.ogrenci.sinif)||1;
 const t=C().tr(S.courseQ).trim();
 const list=catalog?C().coursesOf(catalog,grade).filter(c=>!t||C().tr(c.ad).includes(t)):[];
 const have=new Set(S.rec.dersler.map(c=>c.key));
 return`<article class="ka-card ka-bep-panel"><div class="ka-card__body ka-stack">
  <div class="ka-bep-panel__head"><strong>Ders seç</strong><button class="ka-btn ka-btn--secondary" type="button" data-bep-act="panel" data-p="">Kapat</button></div>
  <p class="ka-muted">Öğrencinin kazanımları genellikle kendi sınıfından alınır; gerekirse alt sınıf seçebilirsiniz.</p>
  <div class="ka-grid">
   ${field('Hangi sınıfın dersleri?',`<select class="ka-input" data-bep-grade>${gradeOptions().map(g=>`<option value="${g.sinif}" ${g.sinif===grade?'selected':''}>${esc(g.ad)}</option>`).join('')}</select>`)}
   ${field('Ders ara',`<input class="ka-input" type="search" value="${esc(S.courseQ)}" placeholder="Ders adı" data-bep-cq autocomplete="off">`)}
  </div>
  <div data-bep-courselist>${courseRows(list,have)}</div>
 </div></article>`;
}
function courseRows(list,have){
 if(!catalog)return`<p class="ka-bep-empty">Ders listesi yüklenemedi. ${esc(catalogErr)} <button class="ka-btn ka-btn--secondary" type="button" data-bep-act="reload-catalog">Yeniden dene</button></p>`;
 if(!list.length)return'<p class="ka-bep-empty">Uyan ders yok.</p>';
 return`<ul class="ka-bep-pickrows">${list.map(c=>`<li><button type="button" class="${have.has(c.key)?'is-on':''}" data-bep-act="pick-course" data-key="${esc(c.key)}" data-sinif="${c.sinif}"><strong>${esc(c.ad)}</strong><small>${c.kazanim} kazanım${have.has(c.key)?' · eklendi':''}</small></button></li>`).join('')}</ul>`;
}
function kazanimPanel(c){
 return`<article class="ka-card ka-bep-panel"><div class="ka-card__body ka-stack">
  <div class="ka-bep-panel__head"><strong>${esc(c.ad)} kazanımları</strong><button class="ka-btn ka-btn--secondary" type="button" data-bep-act="panel" data-p="">Bitti</button></div>
  <p class="ka-muted">Kazanıma dokunarak amaç listesine ekleyin veya çıkarın. Her kazanım uzun dönemli amaç olur; alt basamakları kısa dönemli amaç olarak gelir.</p>
  <input class="ka-input" type="search" value="${esc(S.kzQ)}" placeholder="Kazanım ara (kod veya metin)" data-bep-kq autocomplete="off">
  <div data-bep-kzlist>${kazanimRows(c)}</div>
 </div></article>`;
}
function kazanimRows(c){
 if(S.units==null)return'<p class="ka-bep-empty">Kazanımlar yükleniyor…</p>';
 const units=C().filterUnits(S.units,S.kzQ);
 if(!units.length)return'<p class="ka-bep-empty">Uyan kazanım yok.</p>';
 const forceOpen=!!S.kzQ.trim();
 return units.map((u,ui)=>{
  const n=u.kazanimlar.filter(k=>C().hasGoal(c,k.kod,k.metin)).length;
  const o=S.open['u'+ui];
  return`<details class="ka-bep-unit" ${forceOpen||(o===undefined?ui===0:o)?'open':''} data-bep-det="u${ui}"><summary><span>${esc(u.ad)}</span><span class="ka-badge">${n}/${u.kazanimlar.length}</span></summary><div class="ka-bep-kzs">${u.kazanimlar.map(k=>{
   const on=C().hasGoal(c,k.kod,k.metin);
   return`<label class="ka-bep-kz ${on?'is-on':''}"><input type="checkbox" ${on?'checked':''} data-bep-kz data-kod="${esc(k.kod)}" data-m="${esc(k.metin)}" data-u="${esc(u.ad)}"><span><b>${esc(k.kod||'Kazanım')}</b> ${esc(k.metin)}${k.alt.length?`<small>${k.alt.length} alt basamak</small>`:''}</span></label>`;
  }).join('')}</div></details>`;
 }).join('');
}
function goalCard(g,i,total){
 const k=g.kda.map((x,n)=>`<div class="ka-bep-kda"><span>${n+1}</span><textarea class="ka-input" rows="2" placeholder="Kısa dönemli amaç" data-bep-kda data-gid="${g.id}" data-kid="${x.id}">${esc(x.metin)}</textarea><button type="button" class="ka-bep-x" data-bep-act="rm-kda" data-gid="${g.id}" data-kid="${x.id}" aria-label="Kısa dönemli amacı sil">✕</button></div>`).join('');
 const opt=(arr,cur)=>arr.map(o=>`<option value="${esc(o.id??o)}" ${(o.id??o)===cur?'selected':''}>${esc(o.ad??o)}</option>`).join('');
 return`<article class="ka-card ka-bep-goal" data-gid="${g.id}"><div class="ka-card__body ka-stack">
  <header class="ka-bep-goal__head"><span class="ka-badge">${esc(g.kod||'Özel amaç')}</span><small>${esc(g.unite)}</small>
   <span class="ka-bep-goal__acts"><button type="button" class="ka-bep-x" data-bep-act="goal-up" data-gid="${g.id}" aria-label="Yukarı taşı" ${i===0?'disabled':''}>▲</button><button type="button" class="ka-bep-x" data-bep-act="goal-down" data-gid="${g.id}" aria-label="Aşağı taşı" ${i===total-1?'disabled':''}>▼</button><button type="button" class="ka-bep-x" data-bep-act="rm-goal" data-gid="${g.id}" aria-label="Amacı sil">✕</button></span></header>
  ${field('Uzun dönemli amaç',`<textarea class="ka-input" rows="3" data-bep-ga="uda" data-gid="${g.id}" placeholder="Öğrencinin dönem sonunda kazanması beklenen davranış">${esc(g.uda)}</textarea>`)}
  <div class="ka-bep-sub"><strong>Kısa dönemli amaçlar</strong>${k||'<p class="ka-muted">Henüz kısa dönemli amaç yok.</p>'}<button type="button" class="ka-btn ka-btn--secondary" data-bep-act="add-kda" data-gid="${g.id}">＋ Kısa dönemli amaç ekle</button></div>
  ${picker('y'+g.id,'Yöntem ve teknikler','goal:'+g.id+':yontem',optYontem(),g.yontem)}
  ${picker('m'+g.id,'Araç ve gereçler','goal:'+g.id+':materyal',optMateryal(),g.materyal)}
  <div class="ka-grid">
   ${field('Ölçüt',`<select class="ka-input" data-bep-ga="olcut" data-gid="${g.id}">${opt(optOlcut(),g.olcut)}</select>`)}
   ${field('Başlama tarihi',`<input class="ka-input" type="date" value="${esc(g.baslangic)}" data-bep-ga="baslangic" data-gid="${g.id}">`)}
   ${field('Bitiş tarihi',`<input class="ka-input" type="date" value="${esc(g.bitis)}" data-bep-ga="bitis" data-gid="${g.id}">`)}
   ${field('Değerlendirme',`<select class="ka-input" data-bep-ga="durum" data-gid="${g.id}">${opt(C().DURUMLAR,g.durum)}</select>`)}
  </div>
  ${field('Not (isteğe bağlı)',`<input class="ka-input" type="text" value="${esc(g.not)}" data-bep-ga="not" data-gid="${g.id}" placeholder="Örn: Ekim ayında yeniden değerlendirilecek">`)}
 </div></article>`;
}
function goalsHtml(c){
 if(!c)return'';
 if(!c.amaclar.length)return`<p class="ka-bep-empty">Bu derse henüz amaç eklenmedi. <b>Kazanım seç</b> ile kataloğdan ekleyin ya da kendi amacınızı yazın.</p>`;
 return c.amaclar.map((g,i)=>goalCard(g,i,c.amaclar.length)).join('');
}
function stepAmaclar(){
 const c=activeCourse();
 let head=`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Dersler</strong><p class="ka-muted">BEP’e alınacak dersleri ekleyin; her ders için kazanım seçip amaçları düzenleyin.</p>${courseTabs()}</div></article>`;
 if(S.panel==='ders')head+=coursePanel();
 if(!c)return`${defaultsCard()}${head}`;
 const main=`<article class="ka-card"><div class="ka-card__body ka-stack">
  <div class="ka-bep-panel__head"><strong>${esc(c.ad)} · ${esc(c.sinif)}. sınıf</strong><span class="ka-bep-goal__acts"><button class="ka-btn ka-btn--secondary" type="button" data-bep-act="rm-course" data-key="${esc(c.key)}">Dersi çıkar</button></span></div>
  ${field('Bu dersteki performans düzeyi',`<textarea class="ka-input" rows="2" data-bep-dp placeholder="Örn: Doğal sayılarla toplama yapar, çıkarmada destek ister.">${esc(c.performans)}</textarea>`)}
  <div class="ka-bep-actions"><button class="ka-btn" type="button" data-bep-act="panel" data-p="kazanim">Kazanım seç</button><button class="ka-btn ka-btn--secondary" type="button" data-bep-act="manual-goal">Kendi amacımı yaz</button></div>
 </div></article>`;
 return`${defaultsCard()}${head}${main}${S.panel==='kazanim'?kazanimPanel(c):''}<div data-bep-goals class="ka-stack">${goalsHtml(c)}</div>`;
}

/* 4 · Düzenleme */
const ONERI={
 ortam:['Öğrenci öğretmenin yakınında, ön sırada oturtulur.','Sınıftaki dikkat dağıtıcı uyaranlar azaltılır.','Günlük akış görsel kartlarla gösterilir.','Yönergeler kısa ve adım adım verilir.','Gerektiğinde sakin bir köşe kullanılır.','Teneffüs ve geçişlerde akran desteği sağlanır.'],
 sinav:['Sınav süresi gerektiğinde uzatılır.','Sorular sözlü olarak okunur veya açıklanır.','Sınav sakin ve ayrı bir ortamda yapılır.','Soru sayısı veya kapsamı öğrencinin düzeyine göre azaltılır.','Büyük puntolu, sadeleştirilmiş sınav kâğıdı kullanılır.','Sınav bölümlere ayrılarak uygulanır.'],
 destek:['Destek eğitim odasında haftalık bireysel/küçük grup eğitimi alır.','Rehberlik servisi ile düzenli görüşme yapılır.','Aileye evde yapılacak çalışmalar iletilir.','Ders öğretmenleriyle ortak planlama yapılır.'],
 davranis:['Olumlu davranışlar sözel ve sembolik pekiştireçle ödüllendirilir.','Beklenen davranışlar görsel kurallarla hatırlatılır.','Gerginlik belirtilerinde kısa mola verilir.','Sorun davranış öncesindeki ipuçlarına göre önleyici müdahale yapılır.'],
 aile:['Veli ile ayda bir bilgilendirme görüşmesi yapılır.','Evde yapılabilecek kısa çalışma önerileri paylaşılır.','Günlük geri bildirim iletişim defteri veya mesajla verilir.']
};
function oneriKutu(path,key){return`<div class="ka-bep-sugg">${ONERI[key].map((t,i)=>`<button type="button" class="ka-bep-chip" data-bep-act="suggest" data-path="${path}" data-k="${key}" data-i="${i}">＋ ${esc(t)}</button>`).join('')}</div>`}
function stepDuzenleme(){
 const blok=(label,path,key,ph,n=3)=>`<article class="ka-card"><div class="ka-card__body ka-stack">${field(label,area(path,n,ph))}<details class="ka-bep-pick" data-bep-det="s-${key}" ${S.open['s-'+key]?'open':''}><summary><span>Hazır cümleler</span></summary>${oneriKutu(path,key)}</details></div></article>`;
 return`${blok('Eğitim ortamı düzenlemeleri','duzenleme.ortam','ortam','Sınıf içinde yapılan düzenlemeler')}
 ${blok('Sınav ve değerlendirme uyarlamaları','duzenleme.sinav','sinav','Sınavlarda yapılacak uyarlamalar')}
 ${blok('Destek eğitim hizmetleri','duzenleme.destek','destek','Destek eğitim odası, rehberlik vb.')}
 ${blok('Davranış desteği','duzenleme.davranis','davranis','Davranış yönetimi için yapılacaklar',2)}
 ${blok('Aile katılımı','duzenleme.aile','aile','Veli ile iş birliği',2)}`;
}

/* 5 · Ekip */
function stepEkip(){
 const r=S.rec;
 const team=r.ekip.map((x,i)=>`<div class="ka-bep-team"><div class="ka-grid"><input class="ka-input" type="text" value="${esc(x.unvan)}" placeholder="Görevi" data-bep-team="${i}:unvan" aria-label="Görevi"><input class="ka-input" type="text" value="${esc(x.ad)}" placeholder="Adı soyadı" data-bep-team="${i}:ad" aria-label="Adı soyadı"></div><span class="ka-bep-goal__acts"><button type="button" class="ka-bep-x" data-bep-act="team-up" data-i="${i}" aria-label="Yukarı" ${i===0?'disabled':''}>▲</button><button type="button" class="ka-bep-x" data-bep-act="team-down" data-i="${i}" aria-label="Aşağı" ${i===r.ekip.length-1?'disabled':''}>▼</button><button type="button" class="ka-bep-x" data-bep-act="team-rm" data-i="${i}" aria-label="Sil">✕</button></span></div>`).join('');
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>BEP geliştirme ekibi</strong><p class="ka-muted">İmza bölümüne bu sırayla yazılır. Veli ve gerekirse öğrenci ekipte yer alır.</p>${team||'<p class="ka-muted">Ekipte kimse yok.</p>'}<button class="ka-btn ka-btn--secondary" type="button" data-bep-act="team-add">＋ Kişi ekle</button></div></article>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Toplantı</strong><div class="ka-grid">${field('BEP toplantı tarihi',input('toplanti.tarih','date'))}${field('Toplantı yeri',input('toplanti.yer','text','Örn: Rehberlik servisi'))}${field('Sonraki değerlendirme',input('toplanti.sonraki','date'))}</div></div></article>`;
}

/* 6 · Çıktı */
function stepCikti(){
 const sm=C().summary(S.rec),issues=C().check(S.rec),names=Object.fromEntries(C().ADIMLAR.map(a=>[a.id,a.ad]));
 const list=issues.length?`<ul class="ka-bep-issues">${issues.map(x=>`<li><span>${esc(x.ileti)}</span><button type="button" class="ka-btn ka-btn--secondary" data-bep-act="jump" data-step="${x.adim}">${esc(names[x.adim])}</button></li>`).join('')}</ul>`:'<p class="ka-bep-okmsg">Dosya eksiksiz görünüyor.</p>';
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>${esc(C().titleOf(S.rec))}</strong>
  <p class="ka-muted">${sm.ders} ders · ${sm.amac} uzun dönemli amaç · ${sm.kda} kısa dönemli amaç</p>${list}</div></article>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Çıktı al</strong><p class="ka-muted">Belge A4 yatay hazırlanır. İmzalar için ekip bölümü boş bırakılır; yazdırıp ıslak imza ile onaylayın.</p>
  <div class="ka-bep-actions"><button class="ka-btn" type="button" data-bep-act="print">Yazdır / PDF</button><button class="ka-btn ka-btn--secondary" type="button" data-bep-act="word">Word olarak indir</button><button class="ka-btn ka-btn--secondary" type="button" data-bep-act="save">Kaydet</button></div></div></article>`;
}
const STEP_VIEWS={ogrenci:stepOgrenci,performans:stepPerformans,amaclar:stepAmaclar,duzenleme:stepDuzenleme,ekip:stepEkip,cikti:stepCikti};
function stepBody(){return(STEP_VIEWS[S.step]||stepOgrenci)()}
function viewEdit(){
 const ids=C().ADIMLAR.map(a=>a.id),i=ids.indexOf(S.step);
 return`<header class="ka-bep-bar"><button class="ka-btn ka-btn--secondary" type="button" data-bep-act="close">← Dosyalarım</button><div class="ka-bep-bar__title"><strong>${esc(S.rec.ogrenci.adSoyad||'Yeni BEP dosyası')}</strong><span data-bep-status data-state="${S.dirty?'dirty':'ok'}">${S.dirty?'Kaydedilmedi':(S.rec.id?'Kaydedildi':'Yeni dosya')}</span></div><button class="ka-btn" type="button" data-bep-act="save">Kaydet</button></header>
 <div data-bep-steps>${stepsNav()}</div>
 <div class="ka-stack" data-bep-body>${stepBody()}</div>
 <footer class="ka-bep-foot"><button class="ka-btn ka-btn--secondary" type="button" data-bep-act="prev" ${i<=0?'disabled':''}>Geri</button><button class="ka-btn" type="button" data-bep-act="next" ${i>=ids.length-1?'disabled':''}>İleri</button></footer>`;
}

/* ── çizim ── */
function root(){return document.getElementById('v2ModuleRoot')}
function render(){
 const r=root();if(!r||!global.BepCore)return false;
 mounted=r;
 r.innerHTML=`<section class="vgf-page ka-bep" data-bep-page>${S.view==='edit'&&S.rec?viewEdit():viewList()}</section>`;
 bind(r);
 return true;
}
function renderBody({keepScroll=true}={}){
 const r=mounted;if(!r||S.view!=='edit')return;
 const body=r.querySelector('[data-bep-body]'),nav=r.querySelector('[data-bep-steps]');
 if(!body){render();return}
 const y=global.scrollY;
 body.innerHTML=stepBody();if(nav)nav.innerHTML=stepsNav();
 const ids=C().ADIMLAR.map(a=>a.id),i=ids.indexOf(S.step);
 const prev=r.querySelector('[data-bep-act="prev"]'),next=r.querySelector('[data-bep-act="next"]');
 if(prev)prev.disabled=i<=0;if(next)next.disabled=i>=ids.length-1;
 const t=r.querySelector('.ka-bep-bar__title strong');if(t)t.textContent=S.rec.ogrenci.adSoyad||'Yeni BEP dosyası';
 if(keepScroll)global.scrollTo?.(0,y);
}
function refreshNav(){const n=mounted?.querySelector('[data-bep-steps]');if(n&&S.rec)n.innerHTML=stepsNav()}
function refreshGoals(){
 const box=mounted?.querySelector('[data-bep-goals]');if(box)box.innerHTML=goalsHtml(activeCourse());
 refreshNav();
}
function goStep(id,{scrollTop=true}={}){
 if(!C().ADIMLAR.some(a=>a.id===id))return;
 S.step=id;S.panel='';
 if(S.dirty)save({silent:true});
 renderBody({keepScroll:false});
 if(scrollTop)mounted?.querySelector('.ka-bep-steps')?.scrollIntoView?.({block:'start',behavior:'smooth'});
}

/* ── olaylar ── */
function bind(r){
 if(r.__bepBound)return;
 r.__bepBound=true;
 r.addEventListener('click',onClick);
 r.addEventListener('input',onInput);
 r.addEventListener('change',onInput);
 r.addEventListener('toggle',onToggle,true);
}
const inPage=e=>e.target?.closest?.('[data-bep-page]');
function onToggle(e){
 const d=e.target;if(!d?.matches?.('details')||!inPage(e))return;
 const pk=d.dataset.bepPick,dk=d.dataset.bepDet;
 if(pk){
  S.open[pk]=d.open;
  if(d.open){const fill=d.querySelector('[data-bep-fill]');if(fill&&!fill.children.length){const spec=d.dataset.spec,opts=specOptions(spec);fill.innerHTML=chips(spec,opts,specList(spec)||[])}}
 }
 if(dk)S.open[dk]=d.open;
}
function specOptions(spec){
 const f=spec.split(':').pop();
 return f==='yontem'?optYontem():f==='materyal'?optMateryal():f==='tani'?optTani():[];
}
function specList(spec){
 const[kind,a,b]=spec.split(':');
 if(kind==='rec')return val(a);
 if(kind==='def')return S.rec.varsayilan[a];
 if(kind==='goal'){const f=findGoal(a);return f?.g[b]}
 return null;
}
function onInput(e){
 if(!inPage(e))return;
 const el=e.target,d=el.dataset;
 if(el.matches('[data-bep-search]')){S.query=el.value;const pos=el.selectionStart;const r=mounted;render();const n=r.querySelector('[data-bep-search]');n?.focus();n?.setSelectionRange?.(pos,pos);return}
 if(!S.rec)return;
 if(d.bepF!==undefined){
  let v=el.value;
  if(d.bepF==='ogrenci.sinif'){setPath(d.bepF,v);S.gradePick=0}
  else setPath(d.bepF,v);
  if(d.bepF==='ogrenci.adSoyad'){const t=mounted.querySelector('.ka-bep-bar__title strong');if(t)t.textContent=v.trim()||'Yeni BEP dosyası'}
  markDirty();if(e.type==='change')refreshNav();return;
 }
 if(d.bepGa!==undefined){const f=findGoal(d.gid);if(f){f.g[d.bepGa]=el.value;markDirty()}return}
 if(el.matches('[data-bep-kda]')){const f=findGoal(d.gid),k=f?.g.kda.find(x=>x.id===d.kid);if(k){k.metin=el.value;markDirty()}return}
 if(el.matches('[data-bep-dp]')){const c=activeCourse();if(c){c.performans=el.value;markDirty()}return}
 if(d.bepTeam!==undefined){const[i,k]=d.bepTeam.split(':'),m=S.rec.ekip[Number(i)];if(m){m[k]=el.value;markDirty()}return}
 if(el.matches('[data-bep-stq]')){S.stQ=el.value;const box=mounted.querySelector('[data-bep-stres]');if(box)box.innerHTML=studentResults(studentMatches(S.stQ));return}
 if(el.matches('[data-bep-grade]')){S.gradePick=Number(el.value)||0;const box=mounted.querySelector('[data-bep-courselist]');if(box)box.innerHTML=courseListHtml();return}
 if(el.matches('[data-bep-cq]')){S.courseQ=el.value;const box=mounted.querySelector('[data-bep-courselist]');if(box)box.innerHTML=courseListHtml();return}
 if(el.matches('[data-bep-kq]')){S.kzQ=el.value;const c=activeCourse(),box=mounted.querySelector('[data-bep-kzlist]');if(c&&box)box.innerHTML=kazanimRows(c);return}
 if(el.matches('[data-bep-kz]')){if(e.type==='change')toggleKazanim(el);return}
}
function courseListHtml(){
 const grade=S.gradePick||Number(S.rec.ogrenci.sinif)||1,t=C().tr(S.courseQ).trim();
 const list=catalog?C().coursesOf(catalog,grade).filter(c=>!t||C().tr(c.ad).includes(t)):[];
 return courseRows(list,new Set(S.rec.dersler.map(c=>c.key)));
}
function toggleKazanim(el){
 const c=activeCourse();if(!c)return;
 const item={kod:el.dataset.kod,metin:el.dataset.m,alt:[]};
 const unit=(S.units||[]).find(u=>u.ad===el.dataset.u),src=unit?.kazanimlar.find(k=>k.kod===item.kod&&k.metin===item.metin);
 if(src)item.alt=src.alt;
 if(el.checked){
  if(!C().addGoal(S.rec,c,item,el.dataset.u)){el.checked=false;toast('Bu derse en fazla '+C().LIMIT.amac+' amaç eklenebilir.');return}
 }else{
  const g=c.amaclar.find(a=>(item.kod&&a.kod===item.kod)||(!item.kod&&a.uda===item.metin));
  if(g)C().removeGoal(c,g.id);
 }
 el.closest('.ka-bep-kz')?.classList.toggle('is-on',el.checked);
 const det=el.closest('details'),badge=det?.querySelector('summary .ka-badge');
 if(badge){const n=det.querySelectorAll('[data-bep-kz]:checked').length;badge.textContent=`${n}/${det.querySelectorAll('[data-bep-kz]').length}`}
 markDirty();refreshGoals();
}
function toggleChip(btn){
 const spec=btn.dataset.bepTog,v=btn.dataset.v,[kind,a,b]=spec.split(':');
 let list;
 if(kind==='rec'){list=val(a)}
 else if(kind==='def'){list=S.rec.varsayilan[a]}
 else if(kind==='goal'){const f=findGoal(a);list=f?.g[b]}
 if(!Array.isArray(list))return;
 const i=list.indexOf(v);
 if(i>=0)list.splice(i,1);else if(list.length<C().LIMIT.secenek)list.push(v);else{toast('En fazla '+C().LIMIT.secenek+' seçim yapılabilir.');return}
 const on=i<0;
 btn.classList.toggle('is-on',on);btn.setAttribute('aria-pressed',String(on));
 const det=btn.closest('details'),cnt=det?.querySelector('[data-bep-cnt]');
 if(cnt)cnt.textContent=String(list.length);
 const p=det?.nextElementSibling;
 if(det&&p?.classList.contains('ka-bep-picked')){if(list.length)p.textContent=list.join(', ');else p.remove()}
 else if(det&&list.length&&!p?.classList.contains('ka-bep-picked')){const n=document.createElement('p');n.className='ka-bep-picked';n.textContent=list.join(', ');det.after(n)}
 markDirty();
}
function onClick(e){
 if(!inPage(e))return;
 const tog=e.target.closest('[data-bep-tog]');
 if(tog){toggleChip(tog);return}
 const st=e.target.closest('[data-bep-step]');
 if(st){goStep(st.dataset.bepStep);return}
 const b=e.target.closest('[data-bep-act]');if(!b)return;
 const act=b.dataset.bepAct;
 const h=ACTIONS[act];if(h)h(b,e);
}

/* ── eylemler ── */
async function openRec(rec){
 await loadCatalog();
 S.rec=C().normalize(rec);S.view='edit';S.step='ogrenci';S.dirty=false;S.ders=S.rec.dersler[0]?.key||'';S.panel='';S.courseQ='';S.kzQ='';S.units=null;S.open={};S.stQ='';S.gradePick=0;
 render();global.scrollTo?.(0,0);
}
async function closeEdit(){
 if(S.dirty)await save({silent:true});
 clearTimeout(saveTimer);
 S.view='list';S.rec=null;S.dirty=false;render();
}
async function printNow(rec){
 const issues=C().check(rec);
 if(issues.length&&!global.confirm(`Dosyada ${issues.length} eksik var. Yine de yazdırılsın mı?`))return;
 global.BepPrint.print(rec,{okulAdi:schoolCtx().okul});
}
async function wordNow(rec){
 const issues=C().check(rec);
 if(issues.length&&!global.confirm(`Dosyada ${issues.length} eksik var. Yine de Word dosyası hazırlansın mı?`))return;
 try{await global.BepPrint.word(rec,{okulAdi:schoolCtx().okul});toast('Word dosyası hazırlandı.')}
 catch(err){toast('Word dosyası hazırlanamadı: '+(err?.message||err))}
}
function stepIndex(){return C().ADIMLAR.findIndex(a=>a.id===S.step)}
const ACTIONS={
 'new':()=>openRec(newRecord()),
 'open':b=>{const r=records().find(x=>x.id===b.dataset.id);if(r)openRec(r)},
 'close':()=>closeEdit(),
 'save':async()=>{if(await save()){refreshNav()}},
 'prev':()=>{const i=stepIndex();if(i>0)goStep(C().ADIMLAR[i-1].id)},
 'next':()=>{const i=stepIndex();if(i<C().ADIMLAR.length-1)goStep(C().ADIMLAR[i+1].id)},
 'jump':b=>goStep(b.dataset.step),
 'print':()=>printNow(C().normalize(S.rec)),
 'word':()=>wordNow(C().normalize(S.rec)),
 'print-rec':b=>{const r=records().find(x=>x.id===b.dataset.id);if(r)printNow(r)},
 'dup':async b=>{
  const r=records().find(x=>x.id===b.dataset.id);if(!r)return;
  const n=C().normalize({...r,id:'',yil:C().schoolYear(),olusturma:new Date().toISOString(),sahipUid:user().uid||r.sahipUid});
  n.dersler.forEach(c=>c.amaclar.forEach(a=>{a.durum='';a.not=''}));
  n.toplanti.tarih=C().isoDay();n.toplanti.sonraki='';
  S.rec=n;
  if(await save({silent:true})){toast('Kopya oluşturuldu; yeni eğitim yılı için düzenleyebilirsiniz.');await openRec(S.rec)}
  else{S.rec=null;toast('Kopya oluşturulamadı.')}
 },
 'del':async b=>{
  const r=records().find(x=>x.id===b.dataset.id);if(!r)return;
  if(!global.confirm(`“${r.ogrenci.adSoyad||'Bu BEP dosyası'}” silinsin mi? Bu işlem geri alınamaz.`))return;
  try{await device().remove(T,global.COL.bepDosyalari,r.id);toast('BEP dosyası silindi.');render()}
  catch(err){toast('Silinemedi: '+(err?.message||err))}
 },
 'reload-catalog':async()=>{catalog=null;await loadCatalog();renderBody()},
 'stpick':b=>{
  const v=rows('veliler').find(x=>x.id===b.dataset.id);if(!v)return;
  const c=rows('siniflar').find(x=>x.id===v.sinifId),ad=String(c?.ad||c?.sinifAdi||v.sinifId||'');
  const o=S.rec.ogrenci;o.adSoyad=v.ogrenciAdi||o.adSoyad;o.no=v.ogrenciNo||o.no;
  const g=C().gradeOf(ad);if(g)o.sinif=String(g);
  const sube=ad.match(/([A-ZÇĞİÖŞÜ])\s*$/i);if(sube)o.sube=sube[1].toLocaleUpperCase('tr');
  S.stQ='';markDirty();renderBody();
 },
 'panel':b=>{
  const p=b.dataset.p||'';
  if(p==='ders')S.panel=S.panel==='ders'?'':'ders';
  else if(p==='kazanim'){
   const c=activeCourse();if(!c)return;
   S.panel='kazanim';S.kzQ='';S.units=null;S.unitsKey=c.key;renderBody();
   const dosya=c.dosya||(coursesFor(c)?.dosya);
   if(!dosya){S.units=[];renderBody();toast('Bu dersin kazanım dosyası bulunamadı.');return}
   loadCourse(dosya).then(j=>{if(S.unitsKey!==c.key||S.panel!=='kazanim')return;S.units=C().unitsOf(j);const box=mounted?.querySelector('[data-bep-kzlist]');if(box)box.innerHTML=kazanimRows(activeCourse())})
    .catch(err=>{S.units=[];const box=mounted?.querySelector('[data-bep-kzlist]');if(box)box.innerHTML=`<p class="ka-bep-empty">${esc(err?.message||err)}</p>`});
   return;
  }else S.panel='';
  renderBody();
 },
 'pick-course':b=>{
  const grade=Number(b.dataset.sinif)||S.gradePick||1,key=b.dataset.key;
  const course=catalog?C().coursesOf(catalog,grade).find(c=>c.key===key):null;if(!course)return;
  const c=C().addCourse(S.rec,course);
  if(!c){toast('En fazla '+C().LIMIT.ders+' ders eklenebilir.');return}
  S.ders=c.key;S.panel='kazanim';markDirty();
  ACTIONS.panel({dataset:{p:'kazanim'}});
 },
 'set-course':b=>{S.ders=b.dataset.key;S.panel='';S.units=null;renderBody()},
 'rm-course':b=>{
  const c=S.rec.dersler.find(x=>x.key===b.dataset.key);if(!c)return;
  if(c.amaclar.length&&!global.confirm(`${c.ad} dersi ve ${c.amaclar.length} amacı çıkarılsın mı?`))return;
  C().removeCourse(S.rec,c.key);S.ders=S.rec.dersler[0]?.key||'';S.panel='';markDirty();renderBody();
 },
 'manual-goal':()=>{
  const c=activeCourse();if(!c)return;
  if(c.amaclar.length>=C().LIMIT.amac){toast('Bu derse en fazla '+C().LIMIT.amac+' amaç eklenebilir.');return}
  const g=C().manualGoal(S.rec.varsayilan);c.amaclar.push(g);markDirty();refreshGoals();
  mounted?.querySelector(`[data-gid="${g.id}"][data-bep-ga="uda"]`)?.focus();
 },
 'rm-goal':b=>{const f=findGoal(b.dataset.gid);if(!f)return;C().removeGoal(f.c,f.g.id);markDirty();refreshGoals();if(S.panel==='kazanim'){const box=mounted.querySelector('[data-bep-kzlist]');if(box)box.innerHTML=kazanimRows(f.c)}},
 'goal-up':b=>moveGoal(b.dataset.gid,-1),
 'goal-down':b=>moveGoal(b.dataset.gid,1),
 'add-kda':b=>{
  const f=findGoal(b.dataset.gid);if(!f)return;
  if(f.g.kda.length>=C().LIMIT.kda){toast('En fazla '+C().LIMIT.kda+' kısa dönemli amaç eklenebilir.');return}
  const k={id:C().rid('k'),metin:''};f.g.kda.push(k);markDirty();refreshGoals();
  mounted?.querySelector(`[data-bep-kda][data-kid="${k.id}"]`)?.focus();
 },
 'rm-kda':b=>{const f=findGoal(b.dataset.gid);if(!f)return;f.g.kda=f.g.kda.filter(k=>k.id!==b.dataset.kid);markDirty();refreshGoals()},
 'apply-defaults':()=>{
  if(!S.rec.dersler.some(c=>c.amaclar.length)){toast('Henüz amaç yok; ayarlar yeni eklenen amaçlara uygulanacak.');return}
  if(!global.confirm('Varsayılan yöntem, araç-gereç, ölçüt ve tarihler tüm amaçlara uygulansın mı? Amaçlardaki mevcut seçimlerin üzerine yazılır.'))return;
  C().applyDefaults(S.rec);markDirty();refreshGoals();toast('Varsayılanlar tüm amaçlara uygulandı.');
 },
 'suggest':b=>{
  const path=b.dataset.path,t=ONERI[b.dataset.k][Number(b.dataset.i)];if(!t)return;
  const cur=String(val(path)||'').trim(),lines=cur?cur.split('\n'):[];
  if(lines.some(l=>l.replace(/^•\s*/,'')===t))return;
  setPath(path,(cur?cur+'\n':'')+'• '+t);
  const ta=mounted.querySelector(`[data-bep-f="${path}"]`);if(ta)ta.value=val(path);
  markDirty();
 },
 'team-add':()=>{if(S.rec.ekip.length>=C().LIMIT.ekip){toast('Ekibe en fazla '+C().LIMIT.ekip+' kişi eklenebilir.');return}S.rec.ekip.push({unvan:'',ad:''});markDirty();renderBody()},
 'team-rm':b=>{S.rec.ekip.splice(Number(b.dataset.i),1);markDirty();renderBody()},
 'team-up':b=>{C().moveItem(S.rec.ekip,Number(b.dataset.i),-1);markDirty();renderBody()},
 'team-down':b=>{C().moveItem(S.rec.ekip,Number(b.dataset.i),1);markDirty();renderBody()}
};
function coursesFor(c){return catalog?C().coursesOf(catalog,Number(c.sinif)).find(x=>x.key===c.key):null}
function moveGoal(gid,d){
 const f=findGoal(gid);if(!f)return;
 const i=f.c.amaclar.findIndex(a=>a.id===gid);C().moveItem(f.c.amaclar,i,d);markDirty();refreshGoals();
}

/* ── açılış ── */
async function open(){
 try{await ensureDeps()}catch(e){console.error('[BEP]',e);toast('BEP modülü açılamadı.');return false}
 if(S.dirty&&S.rec)await save({silent:true});
 clearTimeout(saveTimer);
 S.view='list';S.rec=null;S.dirty=false;S.query='';
 render();
 loadCatalog().then(()=>{if(S.view==='edit')renderBody()});
 prepare().then(()=>{if(S.view==='list'&&document.querySelector('[data-bep-page]'))render()});
 return true;
}
function unmount(){clearTimeout(saveTimer);if(S.dirty)save({silent:true});mounted=null}

global.BepModule={open,render,unmount};
})(window);
