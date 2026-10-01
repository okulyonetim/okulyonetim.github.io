/* Koruk Asistan — Belirli Gün ve Haftalar katalog veri kaynağı
 * Hazır katalog, seçim ve manuel ekleme katmanı.
 * Kaynak: kullanıcı tarafından sağlanan Belirli-Gun-ve-Haftalar.pdf.
 */
(function(global){
'use strict';
if(global.BelirliGunlerCatalog)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').trim();
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const MONTHS=['Eylül','Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran'];
const MNUM={Eylül:9,Ekim:10,Kasım:11,Aralık:12,Ocak:1,Şubat:2,Mart:3,Nisan:4,Mayıs:5,Haziran:6};
const CATALOG=[
 ['Eylül','İlköğretim Haftası','06-10 Eylül'],
 ['Eylül','Öğrenciler Günü','10 Eylül'],
 ['Eylül','Gaziler Günü','19 Eylül'],
 ['Eylül','15 Temmuz Demokrasi ve Millî Bir. Günü','13-18 Eylül'],
 ['Eylül','Dünya Okul Sütü Günü','28 Eylül'],
 ['Ekim','Hayvanları Koruma Günü','4 Ekim'],
 ['Ekim','Ahilik Kültürü Haftası','8-12 Ekim'],
 ['Ekim','Dünya Afet Azaltma Günü','13 Ekim'],
 ['Ekim','Birleşmiş Milletler Günü','24 Ekim'],
 ['Ekim','Mevlid-i Nebî Haftası','26 Ekim'],
 ['Ekim','Cumhuriyet Bayramı','29 Ekim'],
 ['Ekim','Kızılay Haftası','29 Ekim-4 Kasım'],
 ['Kasım','Organ Bağışı ve Nakli Haftası','3-9 Kasım'],
 ['Kasım','Lösemili Çocuklar Haftası','2-8 Kasım'],
 ['Kasım','Atatürk Haftası','10-16 Kasım'],
 ['Kasım','Afet Eğitimi Hazırlık Günü','12 Kasım'],
 ['Kasım','Dünya Diyabet Günü','14 Kasım'],
 ['Kasım','Dünya Felsefe Günü','20 Kasım'],
 ['Kasım','Dünya Çocuk Hakları Günü','20 Kasım'],
 ['Kasım','Ağız ve Diş Sağlığı Haftası','21-27 Kasım'],
 ['Kasım','Öğretmenler Günü','24 Kasım'],
 ['Aralık','Mevlâna Haftası','2-9 Aralık'],
 ['Aralık','Dünya Engelliler Günü','3 Aralık'],
 ['Aralık','Dünya Madenciler Günü','4 Aralık'],
 ['Aralık','Türk Kadınına Seçme ve Seçilme Hakkının Verilişi','5 Aralık'],
 ['Aralık','İnsan Hakları ve Demokrasi Haftası','6-11 Aralık'],
 ['Aralık','Tutum, Yatırım ve Türk Malları Haftası','12-18 Aralık'],
 ['Ocak','Enerji Tasarrufu Haftası','3-7 Ocak'],
 ['Şubat','Vergi Haftası','21-28 Şubat'],
 ['Şubat','Sivil Savunma Günü','28 Şubat'],
 ['Mart','Yeşilay Haftası','1-5 MART'],
 ['Mart','Girişimcilik Haftası','1-5 MART'],
 ['Mart','Dünya Kadınlar Günü','8 Mart'],
 ['Mart','Bilim ve Teknoloji Haftası','8-14 Mart'],
 ['Mart','İstiklâl Marşı’nın Kabulü ve Mehmet Akif Ersoy’u Anma Günü','12 Mart'],
 ['Mart','Tüketiciyi Koruma Haftası','15-21 Mart'],
 ['Mart','Şehitler Günü Haftası','18 Mart'],
 ['Mart','Yaşlılar Haftası','18-24 Mart'],
 ['Mart','Türk Dünyası ve Toplulukları Haftası','21 Mart'],
 ['Mart','Orman Haftası','21-26 Mart'],
 ['Mart','Dünya Tiyatrolar Günü','27 Mart'],
 ['Nisan','Kanser Haftası','1 – 7 Nisan'],
 ['Nisan','Dünya Otizm Farkındalık Günü','2 Nisan'],
 ['Nisan','Kişisel Verileri Koruma Günü','7 Nisan'],
 ['Nisan','Dünya Sağlık Günü/Dünya Sağlık Haftası','7-13 Nisan'],
 ['Nisan','Turizm Haftası','15-22 Nisan'],
 ['Nisan','Ulusal Egemenlik ve Çocuk Bayramı','23 Nisan'],
 ['Nisan','26 Nisan Dünya Fikrî Mülkiyet Günü','26 Nisan'],
 ['Nisan','Kût’ül Amâre Zaferi','29 Nisan'],
 ['Mayıs','Bilişim Haftası','2-6 Mayıs'],
 ['Mayıs','Trafik ve İlkyardım Haftası','2-6 Mayıs'],
 ['Mayıs','İş Sağlığı ve Güvenliği Haftası','4-10 Mayıs'],
 ['Mayıs','Anneler Günü','8 Mayıs'],
 ['Mayıs','Vakıflar Haftası','9-13 Mayıs'],
 ['Mayıs','Engelliler Haftası','10-16 Mayıs'],
 ['Mayıs','Müzeler Haftası','18 – 24 Mayıs'],
 ['Mayıs','Atatürk’ü Anma ve Gençlik ve Spor Bayramı','19 Mayıs'],
 ['Mayıs','Etik Günü','25 Mayıs 2022'],
 ['Mayıs','İstanbul’un Fethi','29 Mayıs'],
 ['Haziran','Çevre Koruma Haftası','6-1Haziran'],
 ['Haziran','Babalar Günü','20 Haziran']
].map((x,i)=>({id:`katalog-${String(i+1).padStart(3,'0')}`,ay:x[0],ad:x[1],kaynakTarih:x[2]}));

function academicYears(){const now=new Date(),y=now.getFullYear();return [y-1,y,y+1].map(start=>({value:String(start),label:`${start}-${start+1} Eğitim Yılı`}));}
function yearForMonth(startYear,month){return Number(startYear)+(month<9?1:0);}
function parseSourceDate(source){
 const s=String(source||'').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
 const years=s.match(/(\d{4})/g);const clean=s.replace(/\s*\d{4}\s*$/,'');
 const nums=clean.match(/\d{1,2}/g)||[];if(!nums.length)return null;
 return {start:Number(nums[0]),end:Number(nums.length>1?nums[1]:nums[0]),yearOverride:years?Number(years[years.length-1]):null};
}
function isoDate(startYear,month,day){return `${yearForMonth(startYear,month)}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
function datesFor(item,startYear){
 const month=MNUM[item.ay],p=parseSourceDate(item.kaynakTarih);if(!month||!p)return {baslangic:'',bitis:'',gosterim:item.kaynakTarih};
 const y=p.yearOverride||yearForMonth(startYear,month),start=isoDate(startYear,month,p.start),endMonth=p.end< p.start?month+1:month;
 const endYear=p.end<p.start?y+1:y;
 const end=`${endYear}-${String(endMonth).padStart(2,'0')}-${String(p.end).padStart(2,'0')}`;
 return {baslangic:start,bitis:end,gosterim:item.kaynakTarih};
}
function currentStartYear(){const y=new Date().getFullYear(),m=new Date().getMonth()+1;return String(m>=9?y:y-1)}
function selectedMap(startYear){
 const map=new Map();arr('belirliGunler').forEach(r=>{if(r?.katalogId)map.set(String(r.katalogId),r)});return map;
}
function teacherChecks(selected=[]){const set=new Set(Array.isArray(selected)?selected:[]);return `<div class="ka-stack" style="max-height:190px;overflow:auto;border:1px solid var(--ka-border);border-radius:12px;padding:8px">${arr('ogretmenler').slice().sort((a,b)=>`${a.ad||''} ${a.soyad||''}`.localeCompare(`${b.ad||''} ${b.soyad||''}`,'tr')).map(o=>`<label class="ka-row"><input type="checkbox" name="katalogOgretmenIdler" value="${esc(o.id)}" ${set.has(o.id)?'checked':''}><span>${esc(`${o.ad||''} ${o.soyad||''}`.trim())}</span></label>`).join('')||'<span class="ka-muted">Öğretmen bulunamadı.</span>'}</div>`}
function manualTeachers(selected=[]){const set=new Set(Array.isArray(selected)?selected:[]);return `<div class="ka-stack" style="max-height:190px;overflow:auto;border:1px solid var(--ka-border);border-radius:12px;padding:8px">${arr('ogretmenler').slice().sort((a,b)=>`${a.ad||''} ${a.soyad||''}`.localeCompare(`${b.ad||''} ${b.soyad||''}`,'tr')).map(o=>`<label class="ka-row"><input type="checkbox" name="manualOgretmenIdler" value="${esc(o.id)}" ${set.has(o.id)?'checked':''}><span>${esc(`${o.ad||''} ${o.soyad||''}`.trim())}</span></label>`).join('')||'<span class="ka-muted">Öğretmen bulunamadı.</span>'}</div>`}
function catalogModal(){
 const years=academicYears(),start=currentStartYear(),selected=selectedMap(start),groups=new Map();CATALOG.forEach(x=>{if(!groups.has(x.ay))groups.set(x.ay,[]);groups.get(x.ay).push(x)});
 const groupHtml=MONTHS.map(month=>{const list=groups.get(month)||[];if(!list.length)return'';return `<section class="ka-card" style="padding:12px"><div class="ka-row ka-row--between"><strong>${esc(month)}</strong><span class="ka-badge">${list.length} kayıt</span></div><div class="ka-stack" style="margin-top:8px">${list.map(item=>{const r=selected.get(item.id),d=datesFor(start,item);return `<label class="ka-row ka-row--between" style="align-items:flex-start"><span class="ka-row" style="align-items:flex-start;gap:10px"><input type="checkbox" name="katalogSecim" value="${esc(item.id)}" ${r?'checked':''}><span><strong>${esc(item.ad)}</strong><small class="ka-muted" style="display:block">${esc(item.kaynakTarih)} → ${esc(d.baslangic)}${d.bitis&&d.bitis!==d.baslangic?` / ${esc(d.bitis)}`:''}</small></span></span></label>`}).join('')}</div></section>`}).join('');
 return `<div class="ka-modal-backdrop" data-belirli-katalog-modal style="z-index:1450"><form class="ka-modal" data-belirli-katalog-form><div class="ka-modal__header"><h2>Belirli Gün ve Haftalar</h2></div><div class="ka-modal__body ka-stack"><p class="ka-muted">Hazır listedeki istediklerinizi seçin. Seçilenlerin tarih veya tarih aralığı otomatik oluşturulur. Bu liste, yüklediğiniz Belirli Gün ve Haftalar kaynağındaki ad ve tarih bilgilerini kullanır.</p>${field('Eğitim Yılı',`<select name="katalogYil">${years.map(y=>`<option value="${y.value}" ${y.value===start?'selected':''}>${esc(y.label)}</option>`).join('')}</select>`)}<div data-katalog-preview>${groupHtml}</div><hr><div class="ka-card" style="padding:12px"><strong>Manuel Etkinlik Ekle</strong><p class="ka-muted">Listede olmayan bir gün/hafta için aşağıdaki alanları kullanabilirsiniz.</p>${field('Etkinlik Adı',`<input name="manualAd" placeholder="Örn. Okulun Kuruluş Yıl Dönümü">`)}<div class="ka-grid">${field('Başlangıç',`<input type="date" name="manualBaslangic">`)}${field('Bitiş (opsiyonel)',`<input type="date" name="manualBitis">`)}</div>${field('Sorumlu Öğretmenler',manualTeachers())}${field('Notlar',`<textarea name="manualAciklama" rows="3"></textarea>`)}<small class="ka-muted">Manuel kayıtlar listeden bağımsız olarak korunur.</small></div></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-belirli-katalog-cancel>Vazgeç</button><span class="ka-grow"></span><button class="ka-btn" type="submit">Seçimleri Kaydet</button></div></form></div>`;
}
function field(label,input){return `<label class="ka-field"><span class="ka-field__label">${label}</span>${input}</label>`}
function close(){document.querySelector('[data-belirli-katalog-modal]')?.remove();document.body.classList.remove('ka-cizelge-modal-open')}
function open(){
 if(!global.ClassicCizelgelerParity?.currentType||global.ClassicCizelgelerParity.currentType!=='belirliGunler')return false;
 close();document.body.classList.add('ka-cizelge-modal-open');document.body.insertAdjacentHTML('beforeend',catalogModal());const modal=document.querySelector('[data-belirli-katalog-modal]');modal?.querySelector('[data-belirli-katalog-cancel]')?.addEventListener('click',close);modal?.addEventListener('click',e=>{if(e.target===modal)close()});modal?.querySelector('[data-belirli-katalog-form]')?.addEventListener('submit',save);return true;
}
async function save(e){
 e.preventDefault();const f=e.currentTarget,start=String(new FormData(f).get('katalogYil')||currentStartYear()),fd=new FormData(f),wanted=new Set(fd.getAll('katalogSecim').map(String)),rows=arr('belirliGunler'),by=new Map(rows.filter(r=>r?.katalogId).map(r=>[String(r.katalogId),r]));
 try{
  const submit=f.querySelector('[type="submit"]');if(submit)submit.disabled=true;
  for(const item of CATALOG){const selected=wanted.has(item.id),existing=by.get(item.id);if(!selected&&existing){await global.CizelgelerService.kayitSil('belirliGunler',existing.id);continue}if(!selected)continue;const d=datesFor(item,start),payload={ad:item.ad,tarihBaslangic:d.baslangic,tarihBitis:d.bitis===d.baslangic?'':d.bitis,ogretmenIdler:existing?.ogretmenIdler||[],aciklama:existing?.aciklama||`Hazır katalog: ${item.kaynakTarih}`,katalogId:item.id,katalogAy:item.ay,katalogKaynakTarih:item.kaynakTarih,katalogEgitimYili:start,kontroller:existing?.kontroller||[false]};await global.CizelgelerService.kayitKaydet('belirliGunler',existing?.id||null,payload)}
  const manualAd=String(fd.get('manualAd')||'').trim();if(manualAd){const bas=String(fd.get('manualBaslangic')||'');if(!bas)throw new Error('Manuel etkinlik için başlangıç tarihi girin.');const og=fd.getAll('manualOgretmenIdler').map(String).filter(Boolean);await global.CizelgelerService.kayitKaydet('belirliGunler',null,{ad:manualAd,tarihBaslangic:bas,tarihBitis:String(fd.get('manualBitis')||''),ogretmenIdler:og,aciklama:String(fd.get('manualAciklama')||'').trim(),kontroller:[false],manuel:true})}
  global.toast?.('Belirli gün ve hafta seçimleri kaydedildi.');close();global.ClassicCizelgelerParity?.render?.(true);
 }catch(err){global.toast?.(err?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':(err?.message||'Seçimler kaydedilemedi.'))}finally{const submit=f.querySelector('[type="submit"]');if(submit)submit.disabled=false}
}
function install(){
 const parity=global.ClassicCizelgelerParity;if(!parity||parity.__belirliCatalogInstalled)return false;const original=parity.openEdit;parity.openEdit=function(type,id=''){if(type==='belirliGunler'&&!id){return open()}return original.call(parity,type,id)};parity.__belirliCatalogInstalled=true;return true;
}
let tries=0;const timer=setInterval(()=>{if(install()||++tries>80)clearInterval(timer)},100);
global.BelirliGunlerCatalog={CATALOG,open,datesFor,install};
})(window);
