/* Koruk Asistan — Belirli Gün ve Haftalar katalog veri kaynağı ve "Yeni etkinlik" penceresi
 * Hazır katalog + otomatik tarih üretimi + manuel ekleme.
 * Kayıt biçimi ve CizelgelerService.kayitKaydet çağrıları değişmedi; ortak parçalar ClassicCizelgelerParity.ui üzerinden gelir.
 */
(function(global){
'use strict';
if(global.BelirliGunlerCatalog)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const MONTHS=['Eylül','Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran'];
const MNUM={Eylül:9,Ekim:10,Kasım:11,Aralık:12,Ocak:1,Şubat:2,Mart:3,Nisan:4,Mayıs:5,Haziran:6};
const CATALOG=[
['Eylül','İlköğretim Haftası','06-10 Eylül'],['Eylül','Öğrenciler Günü','10 Eylül'],['Eylül','Gaziler Günü','19 Eylül'],['Eylül','15 Temmuz Demokrasi ve Millî Bir. Günü','13-18 Eylül'],['Eylül','Dünya Okul Sütü Günü','28 Eylül'],
['Ekim','Hayvanları Koruma Günü','4 Ekim'],['Ekim','Ahilik Kültürü Haftası','8-12 Ekim'],['Ekim','Dünya Afet Azaltma Günü','13 Ekim'],['Ekim','Birleşmiş Milletler Günü','24 Ekim'],['Ekim','Mevlid-i Nebî Haftası','26 Ekim'],['Ekim','Cumhuriyet Bayramı','29 Ekim'],['Ekim','Kızılay Haftası','29 Ekim-4 Kasım'],
['Kasım','Organ Bağışı ve Nakli Haftası','3-9 Kasım'],['Kasım','Lösemili Çocuklar Haftası','2-8 Kasım'],['Kasım','Atatürk Haftası','10-16 Kasım'],['Kasım','Afet Eğitimi Hazırlık Günü','12 Kasım'],['Kasım','Dünya Diyabet Günü','14 Kasım'],['Kasım','Dünya Felsefe Günü','20 Kasım'],['Kasım','Dünya Çocuk Hakları Günü','20 Kasım'],['Kasım','Ağız ve Diş Sağlığı Haftası','21-27 Kasım'],['Kasım','Öğretmenler Günü','24 Kasım'],
['Aralık','Mevlâna Haftası','2-9 Aralık'],['Aralık','Dünya Engelliler Günü','3 Aralık'],['Aralık','Dünya Madenciler Günü','4 Aralık'],['Aralık','Türk Kadınına Seçme ve Seçilme Hakkının Verilişi','5 Aralık'],['Aralık','İnsan Hakları ve Demokrasi Haftası','6-11 Aralık'],['Aralık','Tutum, Yatırım ve Türk Malları Haftası','12-18 Aralık'],
['Ocak','Enerji Tasarrufu Haftası','3-7 Ocak'],['Şubat','Vergi Haftası','21-28 Şubat'],['Şubat','Sivil Savunma Günü','28 Şubat'],
['Mart','Yeşilay Haftası','1-5 MART'],['Mart','Girişimcilik Haftası','1-5 MART'],['Mart','Dünya Kadınlar Günü','8 Mart'],['Mart','Bilim ve Teknoloji Haftası','8-14 Mart'],['Mart','İstiklâl Marşı’nın Kabulü ve Mehmet Akif Ersoy’u Anma Günü','12 Mart'],['Mart','Tüketiciyi Koruma Haftası','15-21 Mart'],['Mart','Şehitler Günü Haftası','18 Mart'],['Mart','Yaşlılar Haftası','18-24 Mart'],['Mart','Türk Dünyası ve Toplulukları Haftası','21 Mart'],['Mart','Orman Haftası','21-26 Mart'],['Mart','Dünya Tiyatrolar Günü','27 Mart'],
['Nisan','Kanser Haftası','1-7 Nisan'],['Nisan','Dünya Otizm Farkındalık Günü','2 Nisan'],['Nisan','Kişisel Verileri Koruma Günü','7 Nisan'],['Nisan','Dünya Sağlık Günü/Dünya Sağlık Haftası','7-13 Nisan'],['Nisan','Turizm Haftası','15-22 Nisan'],['Nisan','Ulusal Egemenlik ve Çocuk Bayramı','23 Nisan'],['Nisan','26 Nisan Dünya Fikrî Mülkiyet Günü','26 Nisan'],['Nisan','Kût’ül Amâre Zaferi','29 Nisan'],
['Mayıs','Bilişim Haftası','2-6 Mayıs'],['Mayıs','Trafik ve İlkyardım Haftası','2-6 Mayıs'],['Mayıs','İş Sağlığı ve Güvenliği Haftası','4-10 Mayıs'],['Mayıs','Anneler Günü','8 Mayıs'],['Mayıs','Vakıflar Haftası','9-13 Mayıs'],['Mayıs','Engelliler Haftası','10-16 Mayıs'],['Mayıs','Müzeler Haftası','18-24 Mayıs'],['Mayıs','Atatürk’ü Anma ve Gençlik ve Spor Bayramı','19 Mayıs'],['Mayıs','Etik Günü','25 Mayıs'],['Mayıs','İstanbul’un Fethi','29 Mayıs'],
['Haziran','Çevre Koruma Haftası','1-7 Haziran'],['Haziran','Babalar Günü','20 Haziran']
].map((x,i)=>({id:`katalog-${String(i+1).padStart(3,'0')}`,ay:x[0],ad:x[1],kaynakTarih:x[2]}));
function academicYears(){const y=new Date().getFullYear();return [y-1,y,y+1].map(start=>({value:String(start),label:`${start}-${start+1} Eğitim Yılı`}));}
function yearForMonth(startYear,month){return Number(startYear)+(month<9?1:0)}
function parseSourceDate(source){const s=String(source||'').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();const nums=s.replace(/\s*\d{4}\s*$/,'').match(/\d{1,2}/g)||[];return nums.length?{start:Number(nums[0]),end:Number(nums.length>1?nums[1]:nums[0])}:null}
function datesFor(item,startYear){const month=MNUM[item.ay],p=parseSourceDate(item.kaynakTarih);if(!month||!p)return{baslangic:'',bitis:'',gosterim:item.kaynakTarih};const sy=yearForMonth(startYear,month),em=p.end<p.start?(month===12?1:month+1):month,ey=p.end<p.start&&month===12?sy+1:sy;const baslangic=`${sy}-${String(month).padStart(2,'0')}-${String(p.start).padStart(2,'0')}`,bitis=`${ey}-${String(em).padStart(2,'0')}-${String(p.end).padStart(2,'0')}`;return{baslangic,bitis,gosterim:item.kaynakTarih}}
function currentStartYear(){const d=new Date(),y=d.getFullYear();return String(d.getMonth()+1>=9?y:y-1)}
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i').trim();
const ui=()=>global.ClassicCizelgelerParity?.ui||null;
const existingByCatalog=()=>new Map(arr('belirliGunler').filter(r=>r?.katalogId).map(r=>[String(r.katalogId),r]));
function rangeText(d,item){const u=ui();return d.baslangic&&u?u.beRange(d.baslangic,d.bitis):item.kaynakTarih}
function rowHtml(item,start,exists){const d=datesFor(item,start);
  return `<label class="kbe-item" data-kbe-item="${esc(item.id)}" data-kbe-search="${esc(norm(`${item.ay} ${item.ad} ${item.kaynakTarih}`))}"><input type="checkbox" name="katalogSecim" value="${esc(item.id)}"><span class="kbe-item__box" aria-hidden="true"></span><span class="kbe-item__text"><b>${esc(item.ad)}</b><small data-kbe-range>${esc(rangeText(d,item))}</small></span>${exists?'<em class="kbe-item__tag">Eklendi</em>':''}</label>`}
function listHtml(start){const by=existingByCatalog();
  return MONTHS.map(m=>{const items=CATALOG.filter(i=>i.ay===m);return items.length?`<section class="kbe-month" data-kbe-month><h4>${esc(m)}<small>${items.length}</small></h4>${items.map(i=>rowHtml(i,start,by.has(i.id))).join('')}</section>`:''}).join('')}
function sheetHtml(){const u=ui(),years=academicYears(),start=currentStartYear(),items=u.teacherItems();
  return `<div class="ka-modal-backdrop" data-belirli-katalog-modal data-cizelge-modal style="z-index:1450"><form class="ka-modal kcz-form kbe-sheet kbe-new" data-belirli-katalog-form data-kbe-tab="liste" role="dialog" aria-modal="true" aria-label="Yeni etkinlik">
  <div class="ka-modal__header"><h2>Yeni etkinlik</h2></div>
  <div class="ka-modal__body ka-stack">
  <div class="kbe-tabs" role="tablist" aria-label="Ekleme yöntemi"><button type="button" role="tab" class="active" aria-selected="true" data-kbe-tab-btn="liste">Hazır listeden</button><button type="button" role="tab" aria-selected="false" data-kbe-tab-btn="manuel">Kendi etkinliğim</button></div>
  <div class="ka-stack" data-kbe-panel="liste">
    <p class="kbe-lead">Tarihler eğitim yılına göre otomatik doldurulur. Birden fazla etkinlik seçebilirsiniz.</p>
    ${u.field('Eğitim yılı',`<select name="katalogYil">${years.map(y=>`<option value="${y.value}" ${y.value===start?'selected':''}>${esc(y.label)}</option>`).join('')}</select>`)}
    <label class="kbe-search"><svg class="kcl-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" data-kbe-search-input placeholder="Etkinlik veya ay ara" autocomplete="off" enterkeyhint="search" aria-label="Etkinlik veya ay ara"></label>
    <div class="kcz-quick" role="group" aria-label="Hızlı seçim"><button class="kcz-quick__btn" type="button" data-kbe-select="visible">Görünenleri seç</button><button class="kcz-quick__btn is-clear" type="button" data-kbe-select="clear">Temizle</button></div>
    <div class="kbe-pick" data-kbe-pick>${listHtml(start)}</div>
    <p class="kbe-none" data-kbe-nomatch hidden>Aramaya uyan etkinlik yok.</p>
    <details class="kbe-assign"><summary><span>Sorumlu öğretmen ata</span><span class="kcz-count" data-kcz-count="katalogOgretmenIdler" data-kcz-empty="İsteğe bağlı"></span></summary>${u.kczPicker('katalogOgretmenIdler',items,[],{filter:true,emptyText:'Öğretmen bulunamadı.'})}<small class="ka-muted">Seçtiğiniz öğretmenler, işaretlediğiniz tüm etkinliklere atanır.</small></details>
  </div>
  <div class="ka-stack" data-kbe-panel="manuel" hidden>
    <p class="kbe-lead">Listede olmayan bir gün veya haftayı kendiniz ekleyin.</p>
    ${u.field('Etkinlik adı',`<input name="manualAd" maxlength="140" autocomplete="off" placeholder="Örn. Okulun kuruluş yıl dönümü">`)}
    <div class="kbe-dates"><div class="ka-grid">${u.field('Başlangıç tarihi',`<input type="date" name="manualBaslangic">`)}${u.field('Bitiş tarihi (opsiyonel)',`<input type="date" name="manualBitis">`)}</div><p class="kbe-hint" data-kbe-hint aria-live="polite"></p></div>
    ${u.pickField('Sorumlu öğretmenler','manualOgretmenIdler','Seçilmedi',u.kczPicker('manualOgretmenIdler',items,[],{filter:true,emptyText:'Öğretmen bulunamadı.'}))}
    ${u.field('Notlar',`<textarea name="manualAciklama" rows="3"></textarea>`)}
  </div>
  </div>
  <div class="ka-modal__footer"><span class="kbe-count" data-kbe-count aria-live="polite">Seçim yok</span><span class="ka-grow"></span><button class="ka-btn ka-btn--secondary" type="button" data-belirli-katalog-cancel>Vazgeç</button><button class="ka-btn" type="submit" data-kbe-submit>Seçilenleri ekle</button></div></form></div>`}
function close(){document.querySelectorAll('[data-belirli-katalog-modal]').forEach(el=>el.remove());document.body.classList.remove('ka-cizelge-modal-open')}
function setTab(f,tab){f.dataset.kbeTab=tab;f.querySelectorAll('[data-kbe-tab-btn]').forEach(b=>{const on=b.dataset.kbeTabBtn===tab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))});f.querySelectorAll('[data-kbe-panel]').forEach(p=>{p.hidden=p.dataset.kbePanel!==tab});const s=f.querySelector('[data-kbe-submit]');if(s)s.textContent=tab==='liste'?'Seçilenleri ekle':'Etkinliği ekle';refreshCount(f)}
function refreshCount(f){const out=f.querySelector('[data-kbe-count]');if(!out)return;if((f.dataset.kbeTab||'liste')==='liste'){const n=f.querySelectorAll('input[name="katalogSecim"]:checked').length;out.textContent=n?`${n} etkinlik seçildi`:'Seçim yok';out.classList.toggle('is-set',n>0)}else{const ok=!!f.querySelector('[name="manualAd"]')?.value.trim()&&!!f.querySelector('[name="manualBaslangic"]')?.value;out.textContent=ok?'1 etkinlik eklenecek':'Ad ve başlangıç tarihi girin';out.classList.toggle('is-set',ok)}}
function filterList(f){const q=norm(f.querySelector('[data-kbe-search-input]')?.value),items=[...f.querySelectorAll('[data-kbe-item]')];items.forEach(el=>{el.hidden=!!q&&!el.dataset.kbeSearch.includes(q)});f.querySelectorAll('[data-kbe-month]').forEach(m=>{m.hidden=![...m.querySelectorAll('[data-kbe-item]')].some(el=>!el.hidden)});const none=f.querySelector('[data-kbe-nomatch]');if(none)none.hidden=items.some(el=>!el.hidden)}
function refreshRanges(f){const start=String(f.querySelector('[name="katalogYil"]')?.value||currentStartYear());f.querySelectorAll('[data-kbe-item]').forEach(el=>{const item=CATALOG.find(i=>i.id===el.dataset.kbeItem),out=el.querySelector('[data-kbe-range]');if(item&&out)out.textContent=rangeText(datesFor(item,start),item)})}
function bindManualDates(f){const u=ui(),s=f.querySelector('[name="manualBaslangic"]'),e=f.querySelector('[name="manualBitis"]'),out=f.querySelector('[data-kbe-hint]');if(!u||!s||!e||!out)return;
  const sync=()=>{const a=u.dayIndex(s.value),b=u.dayIndex(e.value);let msg='',bad=false;e.min=s.value||'';
    if(Number.isFinite(a)&&e.value&&Number.isFinite(b)){if(b<a){bad=true;msg='Bitiş tarihi başlangıçtan önce olamaz.'}else if(b>a)msg=`${u.beWeekday(a)} – ${u.beWeekday(b)} · ${b-a+1} gün`;else msg=`${u.beWeekday(a)} · tek gün`}
    else if(Number.isFinite(a))msg=`${u.beWeekday(a)} · tek gün`;
    out.textContent=msg;out.classList.toggle('is-bad',bad);refreshCount(f)};
  s.addEventListener('input',sync);e.addEventListener('input',sync);sync()}
function open(){const u=ui();if(!u){global.toast?.('Etkinlik ekranı hazır değil. Sayfayı yenileyip tekrar deneyin.');return false}
  close();u.lockModal();document.body.insertAdjacentHTML('beforeend',sheetHtml());
  const modal=document.querySelector('[data-belirli-katalog-modal]'),f=modal?.querySelector('[data-belirli-katalog-form]');if(!modal||!f)return false;
  u.bindPickers(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  modal.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  f.querySelector('[data-belirli-katalog-cancel]')?.addEventListener('click',close);
  f.querySelectorAll('[data-kbe-tab-btn]').forEach(b=>b.addEventListener('click',()=>setTab(f,b.dataset.kbeTabBtn)));
  f.querySelector('[name="katalogYil"]')?.addEventListener('change',()=>refreshRanges(f));
  f.querySelector('[data-kbe-search-input]')?.addEventListener('input',()=>filterList(f));
  f.querySelectorAll('[data-kbe-select]').forEach(b=>b.addEventListener('click',()=>{const clear=b.dataset.kbeSelect==='clear';f.querySelectorAll('[data-kbe-item]').forEach(el=>{const cb=el.querySelector('input');if(!cb)return;if(clear)cb.checked=false;else if(!el.hidden)cb.checked=true});refreshCount(f)}));
  f.querySelector('[data-kbe-pick]')?.addEventListener('change',()=>refreshCount(f));
  f.querySelectorAll('[name="manualAd"]').forEach(i=>i.addEventListener('input',()=>refreshCount(f)));
  bindManualDates(f);refreshCount(f);
  f.addEventListener('submit',save);return true}
async function save(e){e.preventDefault();const f=e.currentTarget,fd=new FormData(f),tab=f.dataset.kbeTab||'liste',submit=f.querySelector('[type="submit"]'),svc=global.CizelgelerService;
  try{if(submit)submit.disabled=true;let added=0;
/*
 * ÖNEMLİ: Bu pencere mevcut katalog kayıtlarını silmez.
 * Kullanıcı yeni etkinlik ekliyor; seçilmeyen mevcut kayıtlar korunur.
 * Böylece örneğin mevcut 10 etkinliğe 2 yeni etkinlik eklendiğinde diğer 8 etkinlik kaybolmaz.
 */
  if(tab==='liste'){
    const start=String(fd.get('katalogYil')||currentStartYear()),wanted=new Set(fd.getAll('katalogSecim').map(String)),assign=fd.getAll('katalogOgretmenIdler').map(String).filter(Boolean),by=existingByCatalog();
    if(!wanted.size)throw new Error('Listeden en az bir etkinlik seçin.');
    for(const item of CATALOG){
      if(!wanted.has(item.id))continue;
      const existing=by.get(item.id),d=datesFor(item,start);
      const payload={ad:item.ad,tarihBaslangic:d.baslangic,tarihBitis:d.bitis===d.baslangic?'':d.bitis,ogretmenIdler:[...new Set([...(existing?.ogretmenIdler||[]),...assign])],aciklama:existing?.aciklama||`Hazır katalog: ${item.kaynakTarih}`,katalogId:item.id,katalogAy:item.ay,katalogKaynakTarih:item.kaynakTarih,katalogEgitimYili:start,kontroller:existing?.kontroller||[false]};
      await svc.kayitKaydet('belirliGunler',existing?.id||null,payload);added++;
    }
  }else{
    const ad=String(fd.get('manualAd')||'').trim(),bas=String(fd.get('manualBaslangic')||''),bit=String(fd.get('manualBitis')||'');
    if(!ad)throw new Error('Etkinlik adı girin.');
    if(!bas)throw new Error('Başlangıç tarihi girin.');
    if(bit&&bit<bas)throw new Error('Bitiş tarihi başlangıçtan önce olamaz.');
    await svc.kayitKaydet('belirliGunler',null,{ad,tarihBaslangic:bas,tarihBitis:bit,ogretmenIdler:fd.getAll('manualOgretmenIdler').map(String).filter(Boolean),aciklama:String(fd.get('manualAciklama')||'').trim(),kontroller:[false],manuel:true});added=1;
  }
  global.toast?.(added>1?`${added} etkinlik kaydedildi.`:'Etkinlik kaydedildi.');close();global.ClassicCizelgelerParity?.render?.(true)
  }catch(err){global.toast?.(err?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':(err?.message||'Etkinlik kaydedilemedi.'))}finally{if(submit?.isConnected)submit.disabled=false}}
/* Yeni etkinlik artık doğrudan ClassicCizelgelerParity.openEdit içinden bu pencereye gelir; yükleyici ile uyum için install korunur. */
function install(){return true}
/* Resmî bayram ve anma günleri: her okulun kutladığı/andığı günlerdir; ana sayfa bunları okulun seçtiği günlere ek olarak gösterir.
   Kayıt biçimi belirliGunler ile aynıdır; geçerli ve sonraki eğitim yılı birlikte döner (yıl sonuna yakın pencereler boş kalmasın). */
const RESMI=new Set(['Cumhuriyet Bayramı','Atatürk Haftası','Ulusal Egemenlik ve Çocuk Bayramı','Atatürk’ü Anma ve Gençlik ve Spor Bayramı']);
function resmiGunler(){const y=Number(currentStartYear());return[y,y+1].flatMap(start=>CATALOG.filter(i=>RESMI.has(i.ad)).map(i=>{const d=datesFor(i,start);return{katalogId:i.id,ad:i.ad,tarihBaslangic:d.baslangic,tarihBitis:d.bitis===d.baslangic?'':d.bitis}})).filter(x=>x.tarihBaslangic)}
global.BelirliGunlerCatalog={CATALOG,open,close,datesFor,resmiGunler,install};
})(window);
