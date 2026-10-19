/* Koruk Asistan — Veli Görüşme Formu
 * Doldur ve yazdır formu: veri kaydedilmez (oturumluk), Firestore'a yazılmaz.
 * Öğrenci/veli bilgisi mevcut öğrenci listesinden (veliler) seçilebilir; çıktı merkezi ReportEngine ile A4 alınır.
 */
(function(global){
'use strict';
if(global.ParentMeetingModule)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const YAKINLIK=['Anne','Baba','Vasi','Büyükanne','Büyükbaba','Abla / Ağabey','Diğer'];
let state=null,pickClass='';
function today(){const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function teacher(){const id=user().bagliOgretmenId||user().ogretmenId||'';return rows('ogretmenler').find(x=>String(x.id)===String(id))||null}
function teacherName(t){return t?(`${t.ad||''} ${t.soyad||''}`.trim()||t.adSoyad||''):''}
function blank(){const t=teacher();return{veliAd:'',yakinlik:'',tarih:today(),ogrenciAd:'',sinif:'',no:'',ogretmenAd:teacherName(t),brans:t?.brans||'',gorev:'Sınıf Öğretmeni',neden:'',konusulanlar:'',sonuc:''}}
function ensure(){if(!state)state=blank();return state}
function classNames(){const set=new Set();rows('siniflar').forEach(x=>{const n=String(x.ad||x.sinifAdi||x.sinif||'').trim();if(n)set.add(n)});return[...set].sort((a,b)=>a.localeCompare(b,'tr',{numeric:true,sensitivity:'base'}))}
function students(name){const c=rows('siniflar').find(x=>String(x.ad||x.sinifAdi||'').trim()===name),id=c?.id||name;return rows('veliler').filter(v=>v.sinifId===id||v.sinifId===name).sort((a,b)=>String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'))}
function trDate(v){if(!v)return'';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?v:d.toLocaleDateString('tr-TR')}
function field(label,html){return`<label class="ka-field"><span class="ka-field__label">${esc(label)}</span>${html}</label>`}
function input(key,type='text',ph='',list=''){return`<input class="ka-input" type="${type}" value="${esc(ensure()[key])}" placeholder="${esc(ph)}" data-vgf="${key}" ${list?`list="${list}"`:''} autocomplete="off">`}
function area(key,rowsN,ph){return`<textarea class="ka-input" rows="${rowsN}" placeholder="${esc(ph)}" data-vgf="${key}">${esc(ensure()[key])}</textarea>`}
function render(root=document.getElementById('v2ModuleRoot')){
 if(!root)return false;
 const s=ensure(),classes=classNames(),list=pickClass?students(pickClass):[];
 root.innerHTML=`<section class="vgf-page" data-vgf-page>
  <header class="vgf-head"><div><h2>Veli Görüşme Formu</h2><p class="ka-muted">Bilgileri doldurun, boş bıraktıklarınızı çıktıda elle yazabilirsiniz. Form kaydedilmez; yazdırıp imzalatın.</p></div><button class="ka-btn" type="button" data-vgf-print>🖨 Yazdır / PDF</button></header>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Öğrenci</strong>
   ${classes.length?`<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Sınıf (listeden seç)</span><select data-vgf-class><option value="">Seçiniz</option>${classes.map(c=>`<option value="${esc(c)}" ${c===pickClass?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label class="ka-field"><span class="ka-field__label">Öğrenci (listeden seç)</span><select data-vgf-student ${pickClass?'':'disabled'}><option value="">${pickClass?'Seçiniz':'Önce sınıf seçin'}</option>${list.map(v=>`<option value="${esc(v.id)}">${esc(v.ogrenciAdi||'Öğrenci')}${v.ogrenciNo?' · '+esc(v.ogrenciNo):''}</option>`).join('')}</select></label></div>`:''}
   <div class="ka-grid">${field('Adı Soyadı',input('ogrenciAd'))}${field('Sınıfı',input('sinif','text','Örn: 5-A'))}${field('Numarası',input('no','text',''))}</div></div></article>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Görüşme yapılan veli</strong>
   <div class="ka-grid">${field('Adı Soyadı',input('veliAd'))}${field('Öğrenciye yakınlığı',input('yakinlik','text','Anne, baba…','vgfYakinlik'))}<datalist id="vgfYakinlik">${YAKINLIK.map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist>${field('Görüşme tarihi',input('tarih','date'))}</div></div></article>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Görüşmeyi yapan öğretmen</strong>
   <div class="ka-grid">${field('Adı Soyadı',input('ogretmenAd'))}${field('Branşı',input('brans'))}${field('Görevi',input('gorev'))}</div></div></article>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Görüşme</strong>${field('Görüşme nedeni',area('neden',3,'Görüşmenin nedeni'))}${field('Görüşme sırasında konuşulanlar',area('konusulanlar',6,'Konuşulan konular'))}${field('Sonuç ve öneriler',area('sonuc',5,'Varılan sonuç ve öneriler'))}</div></article>
  <footer class="vgf-actions"><button class="ka-btn ka-btn--secondary" type="button" data-vgf-reset>Formu temizle</button><button class="ka-btn" type="button" data-vgf-print>🖨 Yazdır / PDF</button></footer>
 </section>`;
 bind(root);return true
}
function bind(root){
 root.querySelectorAll('[data-vgf]').forEach(el=>el.addEventListener('input',()=>{ensure()[el.dataset.vgf]=el.value}));
 root.querySelector('[data-vgf-class]')?.addEventListener('change',e=>{pickClass=e.target.value;render(root)});
 root.querySelector('[data-vgf-student]')?.addEventListener('change',e=>{const v=rows('veliler').find(x=>String(x.id)===e.target.value);if(!v)return;const s=ensure();s.ogrenciAd=v.ogrenciAdi||'';s.no=v.ogrenciNo||'';s.sinif=pickClass;if(v.veliAdi)s.veliAd=v.veliAdi;const y=v.yakinlik1||v.yakinlik;if(y)s.yakinlik=y;render(root)});
 root.querySelectorAll('[data-vgf-print]').forEach(b=>b.addEventListener('click',print));
 root.querySelector('[data-vgf-reset]')?.addEventListener('click',()=>{state=blank();pickClass='';render(root)});
}
function cell(v){return v?esc(v):'&nbsp;'}
function reportBody(){
 const s=ensure(),dots='......................................';
 return`<article class="vgf-paper"><h1 class="vgf-title">VELİ GÖRÜŞME FORMU</h1>
 <table class="vgf-table"><colgroup><col class="vgf-c1"><col class="vgf-c2"><col class="vgf-c3"><col class="vgf-c4"></colgroup><tbody>
 <tr><th rowspan="3" class="vgf-grp">Görüşme Yapılan Velinin</th><th class="vgf-sub">Adı Soyadı</th><td colspan="2">${cell(s.veliAd)}</td></tr>
 <tr><th class="vgf-sub">Öğrenciye Yakınlığı</th><td colspan="2">${cell(s.yakinlik)}</td></tr>
 <tr><th class="vgf-sub">Görüşme Tarihi</th><td colspan="2" class="vgf-mid">${s.tarih?esc(trDate(s.tarih)):'...../...../..........'}</td></tr>
 <tr><th rowspan="2" class="vgf-grp">Öğrencinin</th><th class="vgf-sub">Adı Soyadı</th><td colspan="2">${cell(s.ogrenciAd)}</td></tr>
 <tr><th class="vgf-sub">Sınıfı ve Numarası</th><td colspan="2">${cell([s.sinif,s.no].filter(Boolean).join(' / '))}</td></tr>
 <tr><th rowspan="2" class="vgf-grp">Görüşme Yapan Öğretmenin</th><th class="vgf-sub">Adı Soyadı</th><td colspan="2">${cell(s.ogretmenAd)}</td></tr>
 <tr><th class="vgf-sub">Branşı ve Görevi</th><td>${cell(s.brans)}</td><td class="vgf-mid vgf-bold">${cell(s.gorev)}</td></tr>
 <tr class="vgf-reason"><th class="vgf-grp">Görüşme Nedeni</th><td colspan="3">${cell(s.neden)}</td></tr>
 </tbody></table>
 <div class="vgf-box vgf-box--talk"><b>Görüşme Sırasında Konuşulanlar:</b><p>${esc(s.konusulanlar)}</p></div>
 <div class="vgf-box vgf-box--result"><b>Sonuç ve Öneriler:</b><p>${esc(s.sonuc)}</p></div>
 <div class="vgf-sign"><div><b>Görüşme Yapılan<br>Veli Adı Soyadı</b><span>${esc(s.veliAd)||dots}</span><b class="vgf-imza">İmza</b></div><div><b>Sınıf Öğretmeni</b><span>${esc(s.ogretmenAd)||dots}</span><b class="vgf-imza">İmza</b></div></div></article>`
}
function print(){if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}global.ReportEngine.printReport('Veli Görüşme Formu',reportBody(),{fileName:'Veli Görüşme Formu',yon:'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' '});return true}
function open(){state=blank();pickClass='';return render()}
global.ParentMeetingModule={open,render,print,reportBody,reset:()=>{state=blank();pickClass='';return state}};
})(window);
