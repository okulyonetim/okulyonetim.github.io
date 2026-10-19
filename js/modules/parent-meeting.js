/* Koruk Asistan — Veli Görüşme Formu
 * Doldur, kaydet ve A4 yazdır. Kayıtlar oy_veliGorusmeleri koleksiyonunda DeviceData/SyncEngine ile tutulur;
 * öğretmen yalnız kendi kayıtlarını, yönetici hepsini listede görür.
 * Öğrenci/veli bilgisi mevcut öğrenci listesinden (veliler) seçilebilir; çıktı merkezi ReportEngine ile A4 alınır.
 */
(function(global){
'use strict';
if(global.ParentMeetingModule)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const YAKINLIK=['Anne','Baba','Vasi','Büyükanne','Büyükbaba','Abla / Ağabey','Diğer'];
let state=null,pickClass='',histQuery='';
const device=()=>global.DeviceData;
const isManager=()=>user().admin===true||!!global.PermissionService?.isManager?.();
function today(){const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function teacher(){const id=user().bagliOgretmenId||user().ogretmenId||'';return rows('ogretmenler').find(x=>String(x.id)===String(id))||null}
function teacherName(t){return t?(`${t.ad||''} ${t.soyad||''}`.trim()||t.adSoyad||''):''}
function blank(){const t=teacher();return{id:'',veliAd:'',yakinlik:'',tarih:today(),ogrenciAd:'',sinif:'',no:'',ogretmenAd:teacherName(t),brans:t?.brans||'',gorev:'',neden:'',konusulanlar:'',sonuc:''}}
function ensure(){if(!state)state=blank();return state}
function classNames(){const set=new Set();rows('siniflar').forEach(x=>{const n=String(x.ad||x.sinifAdi||x.sinif||'').trim();if(n)set.add(n)});return[...set].sort((a,b)=>a.localeCompare(b,'tr',{numeric:true,sensitivity:'base'}))}
function students(name){const c=rows('siniflar').find(x=>String(x.ad||x.sinifAdi||'').trim()===name),id=c?.id||name;return rows('veliler').filter(v=>v.sinifId===id||v.sinifId===name).sort((a,b)=>String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'))}
function trDate(v){if(!v)return'';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?v:d.toLocaleDateString('tr-TR')}
const FORM_KEYS=['veliAd','yakinlik','tarih','ogrenciAd','sinif','no','ogretmenAd','brans','gorev','neden','konusulanlar','sonuc'];
function records(){const uid=user().uid,all=rows('veliGorusmeleri'),mine=isManager()?all:all.filter(x=>x.olusturanUid===uid);return mine.slice().sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||''))||String(b.eklenmeTarihi||'').localeCompare(String(a.eklenmeTarihi||'')))}
function norm(v){return String(v||'').toLocaleLowerCase('tr')}
function historyHtml(){const q=norm(histQuery.trim()),list=records().filter(r=>!q||norm([r.ogrenciAd,r.veliAd,r.sinif,r.neden,r.ogretmenAd].join(' ')).includes(q));return`<article class="ka-card"><div class="ka-card__body ka-stack"><div class="vgf-hist-head"><strong>Kayıtlı görüşmeler <span class="ka-badge">${records().length}</span></strong><input class="ka-input" type="search" placeholder="Öğrenci, veli veya konu ara" value="${esc(histQuery)}" data-vgf-search aria-label="Kayıtlı görüşmelerde ara"></div>${list.length?`<div class="vgf-hist">${list.map(r=>`<div class="vgf-rec ${state&&state.id===r.id?'is-open':''}"><button class="vgf-rec__main" type="button" data-vgf-open="${esc(r.id)}"><strong>${esc(r.ogrenciAd||'Öğrenci')}${r.sinif?` · ${esc(r.sinif)}`:''}</strong><small>${esc(trDate(r.tarih))}${r.veliAd?` · Veli: ${esc(r.veliAd)}`:''}${isManager()&&r.ogretmenAd?` · ${esc(r.ogretmenAd)}`:''}</small>${r.neden?`<small class="vgf-rec__why">${esc(r.neden)}</small>`:''}</button><span class="vgf-rec__acts"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-vgf-rprint="${esc(r.id)}">Yazdır</button><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-vgf-del="${esc(r.id)}">Sil</button></span></div>`).join('')}</div>`:`<p class="ka-muted">${records().length?'Aramaya uygun kayıt yok.':'Henüz kayıtlı görüşme yok. Formu doldurup Kaydet’e basın.'}</p>`}</div></article>`}
async function prepare(){const SE=global.SyncEngine,col=global.COL?.veliGorusmeleri;if(!SE||!col)return;try{SE.register('veliGorusmeleri',col);await SE.localHydrate(['veliGorusmeleri']);SE.schedule(100)}catch(e){console.warn('[Veli görüşme]',e?.message||e)}}
async function save(root){const s=ensure();if(!s.ogrenciAd.trim()&&!s.veliAd.trim())return global.toast?.('Öğrenci veya veli adını yazın.');const v={};FORM_KEYS.forEach(k=>v[k]=String(s[k]||'').trim());try{if(s.id){await device().update('veliGorusmeleri',global.COL.veliGorusmeleri,s.id,v)}else{const row=await device().add('veliGorusmeleri',global.COL.veliGorusmeleri,{...v,olusturanUid:user().uid||'',olusturanAd:user().adSoyad||user().ad||user().kullaniciAdi||'',eklenmeTarihi:new Date().toISOString()});s.id=row?.id||(typeof row==='string'?row:'')||s.id}global.toast?.('Görüşme kaydedildi.');render(root)}catch(e){global.toast?.('Kaydedilemedi: '+(e?.message||e))}}
function loadRecord(r,root){state={...blank(),...Object.fromEntries(FORM_KEYS.map(k=>[k,r[k]||''])),id:r.id};render(root);root?.querySelector('[data-vgf-page]')?.scrollIntoView?.({block:'start'})}
function field(label,html){return`<label class="ka-field"><span class="ka-field__label">${esc(label)}</span>${html}</label>`}
function input(key,type='text',ph='',list=''){return`<input class="ka-input" type="${type}" value="${esc(ensure()[key])}" placeholder="${esc(ph)}" data-vgf="${key}" ${list?`list="${list}"`:''} autocomplete="off">`}
function area(key,rowsN,ph){return`<textarea class="ka-input" rows="${rowsN}" placeholder="${esc(ph)}" data-vgf="${key}">${esc(ensure()[key])}</textarea>`}
function render(root=document.getElementById('v2ModuleRoot')){
 if(!root)return false;
 const s=ensure(),classes=classNames(),list=pickClass?students(pickClass):[];
 root.innerHTML=`<section class="vgf-page" data-vgf-page>
  <header class="vgf-head"><div><h2>Veli Görüşme Formu</h2>${s.id?'<span class="ka-badge">Kayıtlı görüşme düzenleniyor</span>':''}<p class="ka-muted">Bilgileri doldurun, kaydedin ve yazdırıp imzalatın. Boş bıraktığınız alanları çıktıda elle yazabilirsiniz.</p></div><button class="ka-btn" type="button" data-vgf-save>${s.id?'Değişiklikleri kaydet':'Kaydet'}</button></header>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Öğrenci</strong>
   ${classes.length?`<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Sınıf (listeden seç)</span><select data-vgf-class><option value="">Seçiniz</option>${classes.map(c=>`<option value="${esc(c)}" ${c===pickClass?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label class="ka-field"><span class="ka-field__label">Öğrenci (listeden seç)</span><select data-vgf-student ${pickClass?'':'disabled'}><option value="">${pickClass?'Seçiniz':'Önce sınıf seçin'}</option>${list.map(v=>`<option value="${esc(v.id)}">${esc(v.ogrenciAdi||'Öğrenci')}${v.ogrenciNo?' · '+esc(v.ogrenciNo):''}</option>`).join('')}</select></label></div>`:''}
   <div class="ka-grid">${field('Adı Soyadı',input('ogrenciAd'))}${field('Sınıfı',input('sinif','text','Örn: 5-A'))}${field('Numarası',input('no','text',''))}</div></div></article>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Görüşme yapılan veli</strong>
   <div class="ka-grid">${field('Adı Soyadı',input('veliAd'))}${field('Öğrenciye yakınlığı',input('yakinlik','text','Anne, baba…','vgfYakinlik'))}<datalist id="vgfYakinlik">${YAKINLIK.map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist>${field('Görüşme tarihi',input('tarih','date'))}</div></div></article>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Görüşmeyi yapan öğretmen</strong>
   <div class="ka-grid">${field('Adı Soyadı',input('ogretmenAd'))}${field('Branşı',input('brans'))}${field('Görevi (boşsa sınıfa göre otomatik)',input('gorev','text','Sınıf Öğretmeni / Sınıf Rehber Öğretmeni'))}</div></div></article>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Görüşme</strong>${field('Görüşme nedeni',area('neden',3,'Görüşmenin nedeni'))}${field('Görüşme sırasında konuşulanlar',area('konusulanlar',6,'Konuşulan konular'))}${field('Sonuç ve öneriler',area('sonuc',5,'Varılan sonuç ve öneriler'))}</div></article>
  <footer class="vgf-actions"><button class="ka-btn ka-btn--secondary" type="button" data-vgf-reset>${s.id?'Yeni form':'Formu temizle'}</button><button class="ka-btn ka-btn--secondary" type="button" data-vgf-blank>Boş form yazdır</button><button class="ka-btn ka-btn--secondary" type="button" data-vgf-print>🖨 Yazdır / PDF</button><button class="ka-btn" type="button" data-vgf-save>${s.id?'Değişiklikleri kaydet':'Kaydet'}</button></footer>
  ${historyHtml()}
 </section>`;
 bind(root);return true
}
function bind(root){
 root.querySelectorAll('[data-vgf]').forEach(el=>el.addEventListener('input',()=>{ensure()[el.dataset.vgf]=el.value}));
 root.querySelector('[data-vgf-class]')?.addEventListener('change',e=>{pickClass=e.target.value;render(root)});
 root.querySelector('[data-vgf-student]')?.addEventListener('change',e=>{const v=rows('veliler').find(x=>String(x.id)===e.target.value);if(!v)return;const s=ensure();s.ogrenciAd=v.ogrenciAdi||'';s.no=v.ogrenciNo||'';s.sinif=pickClass;if(v.veliAdi)s.veliAd=v.veliAdi;const y=v.yakinlik1||v.yakinlik;if(y)s.yakinlik=y;render(root)});
 root.querySelectorAll('[data-vgf-print]').forEach(b=>b.addEventListener('click',()=>print()));
 root.querySelectorAll('[data-vgf-blank]').forEach(b=>b.addEventListener('click',()=>print(emptyForm())));
 root.querySelectorAll('[data-vgf-save]').forEach(b=>b.addEventListener('click',()=>save(root)));
 root.querySelector('[data-vgf-search]')?.addEventListener('input',e=>{histQuery=e.target.value;const pos=e.target.selectionStart;render(root);const n=root.querySelector('[data-vgf-search]');n?.focus();n?.setSelectionRange?.(pos,pos)});
 root.querySelectorAll('[data-vgf-open]').forEach(b=>b.addEventListener('click',()=>{const r=rows('veliGorusmeleri').find(x=>x.id===b.dataset.vgfOpen);if(r)loadRecord(r,root)}));
 root.querySelectorAll('[data-vgf-rprint]').forEach(b=>b.addEventListener('click',()=>{const r=rows('veliGorusmeleri').find(x=>x.id===b.dataset.vgfRprint);if(r)print({...blank(),...Object.fromEntries(FORM_KEYS.map(k=>[k,r[k]||''])),id:r.id})}));
 root.querySelectorAll('[data-vgf-del]').forEach(b=>b.addEventListener('click',async()=>{const r=rows('veliGorusmeleri').find(x=>x.id===b.dataset.vgfDel);if(!r||!confirm(`${r.ogrenciAd||'Bu'} görüşme kaydı silinsin mi?`))return;try{await device().remove('veliGorusmeleri',global.COL.veliGorusmeleri,r.id);if(state?.id===r.id)state=blank();global.toast?.('Kayıt silindi.');render(root)}catch(e){global.toast?.('Silinemedi: '+(e?.message||e))}}));
 root.querySelector('[data-vgf-reset]')?.addEventListener('click',()=>{state=blank();pickClass='';render(root)});
}
function emptyForm(){return{id:'',blank:true}}
// Görev boşsa sınıf düzeyinden belirlenir: 1-4. sınıf ilkokul (Sınıf Öğretmeni), 5-8. sınıf ortaokul (Sınıf Rehber Öğretmeni).
function gorevOf(s){if(s.gorev)return s.gorev;const n=parseInt(String(s.sinif||'').trim(),10);return n>=5?'Sınıf Rehber Öğretmeni':'Sınıf Öğretmeni'}
function cell(v){return v?esc(v):'&nbsp;'}
function reportBody(data){
 const s=data||ensure(),dots='......................................';
 const RE=global.ReportEngine,okul=String(RE?.schoolInfo?.().okulAdi||'').toLocaleUpperCase('tr'),logo=RE?.logoUrl?.()||'assets/logo.png';
 return`<article class="vgf-paper"><div class="vgf-brand"><img src="${esc(logo)}" alt=""><div class="vgf-brand__name">${esc(okul)}</div></div><h1 class="vgf-title">VELİ GÖRÜŞME FORMU</h1>
 <table class="vgf-table"><colgroup><col class="vgf-c1"><col class="vgf-c2"><col class="vgf-c3"><col class="vgf-c4"></colgroup><tbody>
 <tr><th rowspan="3" class="vgf-grp">Görüşme Yapılan Velinin</th><th class="vgf-sub">Adı Soyadı</th><td colspan="2">${cell(s.veliAd)}</td></tr>
 <tr><th class="vgf-sub">Öğrenciye Yakınlığı</th><td colspan="2">${cell(s.yakinlik)}</td></tr>
 <tr><th class="vgf-sub">Görüşme Tarihi</th><td colspan="2" class="vgf-mid">${s.tarih?esc(trDate(s.tarih)):'...../...../..........'}</td></tr>
 <tr><th rowspan="2" class="vgf-grp">Öğrencinin</th><th class="vgf-sub">Adı Soyadı</th><td colspan="2">${cell(s.ogrenciAd)}</td></tr>
 <tr><th class="vgf-sub">Sınıfı ve Numarası</th><td colspan="2">${cell([s.sinif,s.no].filter(Boolean).join(' / '))}</td></tr>
 <tr><th rowspan="2" class="vgf-grp">Görüşme Yapan Öğretmenin</th><th class="vgf-sub">Adı Soyadı</th><td colspan="2">${cell(s.ogretmenAd)}</td></tr>
 <tr><th class="vgf-sub">Branşı ve Görevi</th><td>${cell(s.brans)}</td><td class="vgf-mid vgf-bold">${cell(s.blank?'':gorevOf(s))}</td></tr>
 <tr class="vgf-reason"><th class="vgf-grp">Görüşme Nedeni</th><td colspan="3">${cell(s.neden)}</td></tr>
 </tbody></table>
 <div class="vgf-box vgf-box--talk"><b>Görüşme Sırasında Konuşulanlar:</b><p>${esc(s.konusulanlar)}</p></div>
 <div class="vgf-box vgf-box--result"><b>Sonuç ve Öneriler:</b><p>${esc(s.sonuc)}</p></div>
 <div class="vgf-sign"><div><b>Görüşme Yapılan<br>Veli Adı Soyadı</b><span>${esc(s.veliAd)||dots}</span><b class="vgf-imza">İmza</b></div><div><b>${esc(s.blank?'Sınıf Öğretmeni':gorevOf(s))}</b><span>${esc(s.ogretmenAd)||dots}</span><b class="vgf-imza">İmza</b></div></div></article>`
}
function print(data){if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}global.ReportEngine.printReport('Veli Görüşme Formu',reportBody(data),{fileName:'Veli Görüşme Formu',yon:'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' '});return true}
function open(){state=blank();pickClass='';histQuery='';const ok=render();prepare().then(()=>{if(document.querySelector('[data-vgf-page]'))render()});return ok}
global.ParentMeetingModule={open,render,print,reportBody,records,reset:()=>{state=blank();pickClass='';histQuery='';return state}};
})(window);
