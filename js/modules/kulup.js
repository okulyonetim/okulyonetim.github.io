/* Koruk Asistan — Sosyal Kulüpler (danışman öğretmen)
 * Kulübü seçin: iç tüzük, yıllık plan, toplum hizmeti planı, toplantı tutanağı, üye listesi, aylık / dönem sonu / yıl sonu raporları ve denetleme kurulu raporu Word olarak indirilir.
 * Kulüp kaydı (oy_sosyalKulupler), danışmanlar, üyeler (öğrenci kaydındaki kulüp) ve okul bilgileri uygulamadan gelir; kulübün hazır evrakları data/kulup/{id}.json ve assets/kulup/{id}/ kataloğundadır.
 * Öğretmenin yazdıkları (üye görevleri, toplantı bilgisi, katılım ve sonuç, değerlendirme yazıları) hesabın tercih belgesinde (KaPrefs → oy_kullaniciTercihleri/{uid}) eğitim yılı ve kulüp başına tutulur.
 * Mantık: kulup-core.js · Word çıktısı: kulup-dosya.js · Stil: css/design-system-base.css (.klp-*)
 */
(function(global){
'use strict';
if(global.KulupModule)return;
if(!global.SinifBaglam||!global.KulupCore)throw new Error('Sosyal Kulüpler bileşenleri yüklenmeden açılamaz.');

const SB=global.SinifBaglam,K=global.KulupCore;
const WORD_CORE='js/modules/ogretmen-dosyasi-core.js?v=5',WORD_DOSYA='js/modules/kulup-dosya.js?v=3';
const toast=m=>global.toast?.(m);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const S={yil:'',kulupId:'',istenenId:'',takipId:'',katalog:null,paket:null,paketId:'',yukleniyor:false,durum:null,acik:new Set()};
let mounted=false,bagli=false,unsubs=[],offPrefs=null,pushT=0,yazT=0;

/* ── bağlam: kulüpler, danışmanlar, üyeler ── */
const rows=t=>SB.rows(t);
function gorunenKulupler(){
 const tid=SB.teacherId(),yonetici=SB.isManager();
 return rows('sosyalKulupler').filter(k=>k&&k.aktif!==false&&String(k.ad||k.kulupAdi||'').trim()&&(yonetici||K.kulupBenim(k,tid)))
  .sort((a,b)=>String(a.ad||a.kulupAdi).localeCompare(String(b.ad||b.kulupAdi),'tr'));
}
const kulup=()=>gorunenKulupler().find(k=>String(k.id)===String(S.kulupId))||null;
const kulupAd=k=>K.kulupAdi(k?.ad||k?.kulupAdi);
function danismanlar(k){
 const ogr=rows('ogretmenler');
 return K.kulupOgretmenIdleri(k).map(id=>SB.adBicimi(SB.adSoyad(ogr.find(t=>String(t.id)===id)))).filter(Boolean);
}
function uyeler(){
 const siniflar=rows('siniflar').map(c=>({id:c.id,ad:c.ad||c.sinifAdi}));
 return S.kulupId?K.uyeler(S.kulupId,rows('veliler'),siniflar,S.durum):[];
}
function baglam(){
 const k=kulup(),o=SB.okulKaydi();
 return{okul:SB.okulAdi(0),il:o.il,ilce:o.ilce,mudur:SB.okulMuduru(),yil:S.yil,danismanlar:danismanlar(k),kulup:k,uyeler:uyeler(),durum:S.durum,paket:S.paket};
}

/* ── katalog ── */
async function jsonAl(yol){
 const r=await global.fetch(yol);
 if(!r.ok)throw new Error(`${yol}: ${r.status}`);
 return r.json();
}
async function katalogYukle(){
 if(S.katalog)return;
 try{S.katalog=await jsonAl('./data/kulup/katalog.json')}catch(e){console.warn('[Sosyal Kulüpler/katalog]',e?.message||e);S.katalog={kulupler:[]}}
}
function katalogKaydi(){
 const k=kulup();if(!k||!S.katalog)return null;
 return K.katalogBul(k,S.katalog,{[k.id]:K.deger(S.durum,'eslesme')});
}
/* Seçili kulübün hazır evrak paketini (data/kulup/{id}.json) yükler; kulüp ya da eşleşme değişince yeniden. */
function paketiSec(){
 const e=katalogKaydi();
 if(!e){S.paket=null;S.paketId='';S.yukleniyor=false;return}
 if(S.paketId===e.id&&(S.paket||S.yukleniyor))return;
 S.paketId=e.id;S.paket=null;S.yukleniyor=true;
 jsonAl(`./data/kulup/${encodeURIComponent(e.id)}.json`).then(p=>{if(S.paketId===e.id){S.paket=p;S.yukleniyor=false;yenile()}})
  .catch(err=>{console.warn('[Sosyal Kulüpler/paket]',err?.message||err);if(S.paketId===e.id){S.yukleniyor=false;yenile()}});
}

/* ── durum: yerelde KaPrefs, hesapta oy_kullaniciTercihleri ── */
const anahtar=()=>K.durumAnahtari(S.kulupId,S.yil);
function yerelOku(){try{return K.durumTemizle(JSON.parse(global.KaPrefs?.get?.(anahtar(),'')||'null'))}catch(_){return K.bosDurum()}}
function yerelYaz(){global.KaPrefs?.set?.(anahtar(),JSON.stringify(S.durum))}
function uzagaYaz(){clearTimeout(pushT);const a=anahtar(),j=JSON.stringify(S.durum);pushT=setTimeout(()=>{global.KaPrefs?.remoteSet?.({[a]:j})},700)}
function kaydet(){yerelYaz();uzagaYaz()}
function kaydetGec(){clearTimeout(yazT);yazT=setTimeout(kaydet,400)}
function uzakGeldi(x){
 if(!mounted||!document.querySelector('[data-klp-page]'))return temizle();
 const j=x?.[anahtar()];if(!j||!S.kulupId)return;
 let r;try{r=K.durumTemizle(JSON.parse(j))}catch(_){return}
 const m=K.durumBirlestir(S.durum,r);
 if(!K.durumAyni(m,r))uzagaYaz();
 if(!K.durumAyni(m,S.durum)){S.durum=m;yerelYaz();yenile()}
}
function temizle(){offPrefs?.();offPrefs=null;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];mounted=false}

/* ── ortak parçalar ── */
const field=(etiket,html,sinif='')=>`<label class="ka-field ${sinif}"><span class="ka-field__label">${esc(etiket)}</span>${html}</label>`;
const girdi=(anah,tip,deger,ek='')=>`<input class="ka-input" type="${tip}" value="${esc(deger)}" data-klp-k="${esc(anah)}" autocomplete="off" ${ek}>`;
const metin=(anah,deger,satir=3)=>`<textarea class="ka-input" rows="${satir}" data-klp-k="${esc(anah)}">${esc(deger)}</textarea>`;
const IND_IKON='<svg class="klp-ik" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
/* sinif verilmezse ana eylem (indir, ikonlu); 'ka-btn--secondary ka-btn--sm' gibi verilirse yalnız yazı */
const dugme=(belge,ad,ek='',sinif='ka-btn--primary')=>`<button type="button" class="ka-btn ${sinif}" data-klp-act="indir" data-klp-belge="${belge}" ${ek}>${sinif==='ka-btn--primary'?IND_IKON:''}<span>${ad}</span></button>`;
const aylar=()=>K.AYLAR;
const duzenleAc=(id,baslik,icerik)=>`<details class="klp-duzenle" data-klp-ac="${id}" ${S.acik.has(id)?'open':''}><summary>${esc(baslik)}</summary><div class="klp-duzenle__govde ka-stack">${icerik}</div></details>`;
const deger=a=>K.deger(S.durum,a);

/* ── evraklara özgü alanlar ── */
function uyelerDuzenle(){
 const l=uyeler();
 const liste=l.length?`<ul class="klp-uyeler">${l.map(u=>`<li><span class="klp-uye__ad"><strong>${esc(u.ad)}</strong><small>${esc(u.sinif)}</small></span>${girdi(`gorev:${u.id}`,'text',u.gorev,'maxlength="60" placeholder="Görevi (örn. Başkan)" aria-label="'+esc(u.ad)+' görevi"')}</li>`).join('')}</ul>`
  :'<p class="ka-muted">Bu kulübe kayıtlı öğrenci yok. Üyeler, öğrenci kaydındaki “Kulüp” alanından gelir.</p>';
 return `<div class="ka-grid">${field('Kulüp başkanı (imzada)',girdi('baskan','text',deger('baskan'),`maxlength="80" placeholder="${esc(K.gorevAdi(l,'baskan',S.durum,'baskan')||'Görevi “Başkan” olan üye')}"`))}${field('Sekreter',girdi('sekreter','text',deger('sekreter'),`maxlength="80" placeholder="${esc(K.gorevAdi(l,'sekreter',S.durum,'sekreter')||'Görevi “Sekreter” olan üye')}"`))}</div>${liste}`;
}
const tutanakDuzenle=()=>`<div class="ka-grid">${field('Toplantı no',girdi('toplantiNo','text',deger('toplantiNo'),'maxlength="10" placeholder="1"'))}${field('Toplantı tarihi',girdi('toplantiTarihi','date',deger('toplantiTarihi')))}${field('Toplantı saati',girdi('toplantiSaati','time',deger('toplantiSaati')))}${field('Toplantı yeri',girdi('toplantiYeri','text',deger('toplantiYeri'),'maxlength="80" placeholder="Okul"'))}</div>`;
const denetlemeDuzenle=()=>`<div class="ka-grid">${field('İnceleme tarihi',girdi('inceleme','date',deger('inceleme')))}${[1,2,3].map(i=>field(`Denetleme kurulu üyesi ${i}`,girdi(`denetleme${i}`,'text',deger(`denetleme${i}`),'maxlength="80" placeholder="Adı Soyadı"'))).join('')}</div>`;
/* Dönem / yıl sonu: ay ay Katılım ve Sonuç + üç değerlendirme yazısı (hazır metinle gelir). onEk: d1 | d2 | y */
function raporDuzenle(onEk,aylarListesi,paket,etiketler){
 const v=K.degerlendirme(paket,onEk,S.durum);
 const satirlar=aylarListesi.map(a=>`<div class="klp-ay"><strong>${esc(K.baslikHarfi(a))}</strong>${girdi(`${onEk}katilim:${a}`,'text',deger(`${onEk}katilim:${a}`),'maxlength="60" placeholder="Katılım" aria-label="'+esc(K.baslikHarfi(a))+' katılım"')}${girdi(`${onEk}sonuc:${a}`,'text',deger(`${onEk}sonuc:${a}`),'maxlength="120" placeholder="Sonuç" aria-label="'+esc(K.baslikHarfi(a))+' sonuç"')}</div>`).join('');
 return `<div class="klp-aylar-liste">${satirlar}</div>${field(etiketler[0],metin(`${onEk}genel`,v.GENEL))}${field(etiketler[1],metin(`${onEk}gucluk`,v.GUCLUK,2))}${field(etiketler[2],metin(`${onEk}oneri`,v.ONERI,2))}`;
}

/* ── evrak kartları ── */
function ciktilar(kod,paket){
 if(kod==='aylik'){
  const l=paket.aylar||[];
  return `<div class="klp-cikti">${dugme('aylik','Bütün aylar (tek dosya)','data-klp-ay=""')}</div><div class="klp-aylar">${l.map(a=>dugme('aylik',esc(K.baslikHarfi(a)),`data-klp-ay="${esc(a)}"`,'ka-btn--secondary ka-btn--sm')).join('')}</div>`;
 }
 if(kod==='denetleme')return `<div class="klp-cikti">${dugme('denetleme','1. Dönem','data-klp-donem="1"')}${dugme('denetleme','2. Dönem','data-klp-donem="2"')}</div>`;
 if(kod==='donem')return `<div class="klp-cikti">${dugme('donem','1. Dönem raporu','data-klp-donem="1"')}${dugme('donem','2. Dönem raporu','data-klp-donem="2"')}</div>`;
 return `<div class="klp-cikti">${dugme(kod,'Word olarak indir')}</div>`;
}
function donemBloklari(paket){
 const ay=K.DONEM_AYLARI;
 return [1,2].map(d=>duzenleAc(`donem${d}`,`${d}. Dönem: katılım, sonuç ve değerlendirme`,raporDuzenle(`d${d}`,ay[d],paket,['B. Kazanımlar','C. Güçlükler','D. Öneriler']))).join('');
}
function duzenleyici(kod,paket){
 switch(kod){
  case 'uyeler':return duzenleAc('uyeler','Başkan, sekreter ve üye görevleri',uyelerDuzenle());
  case 'tutanak':return duzenleAc('tutanak','Toplantı tarihi, saati ve yeri',tutanakDuzenle());
  case 'denetleme':return duzenleAc('denetleme','İnceleme tarihi ve kurul üyeleri',denetlemeDuzenle());
  case 'donem':return donemBloklari(paket);
  case 'yil':return duzenleAc('yil','Katılım, sonuç ve değerlendirme',raporDuzenle('y',aylar(),paket,['B. Genel Değerlendirme','C. Karşılaşılan Güçlükler','D. Gelecek Yıl İçin Öneriler'])+`<div class="ka-grid">${field('Rapor tarihi',girdi('yRaporTarihi','date',deger('yRaporTarihi')))}</div>`);
 }
 return '';
}
function evrakKarti({k:kod,ad,aciklama,katalog},sira){
 const hazir=!katalog||!!S.paket;
 const alt=hazir?`${ciktilar(kod,S.paket||{})}${duzenleyici(kod,S.paket)}`
  :`<p class="ka-muted">${S.yukleniyor?'Evrak hazırlanıyor…':'Bu kulüp için henüz hazır değil.'}</p>`;
 return `<article class="ka-card klp-evrak${hazir?'':' klp-evrak--yok'}" data-klp-evrak="${kod}"><div class="ka-card__body ka-stack"><div class="klp-evrak__ust"><span class="klp-no" aria-hidden="true">${sira}</span><div><strong>${esc(ad)}</strong><small>${esc(aciklama)}</small></div></div>${alt}</div></article>`;
}

/* ── ekran ── */
function kulupKarti(liste){
 const k=kulup(),secenek=liste.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(S.kulupId)?'selected':''}>${esc(kulupAd(x))}</option>`).join('');
 const secici=field('Kulüp',`<select class="ka-input" data-klp-alan="kulup"><option value="">${liste.length?'Seçiniz':'Kulüp yok'}</option>${secenek}</select>`);
 let ozet='';
 if(k){
  const d=danismanlar(k),n=uyeler().length,tema=S.paket?.tema;
  ozet=`<dl class="klp-ozet"><div><dt>Danışman</dt><dd>${esc(d.join(' / ')||'—')}</dd></div><div><dt>Üye</dt><dd>${n?`${n} öğrenci`:'Kayıtlı öğrenci yok'}</dd></div>${tema?.ad?`<div><dt>Tema</dt><dd>${esc(tema.ad)}${tema.kod?` (${esc(tema.kod)})`:''}</dd></div>`:''}</dl>`;
 }
 return `<article class="ka-card"><div class="ka-card__body ka-stack">${secici}${ozet}</div></article>`;
}
/* ── öğretmen: kendi kulübünün evrak teslim durumu (salt okunur; işaretleri okul yönetimi koyar). Yalnız seçili, yani kendi kulübü gösterilir. ── */
const durumDili=x=>x.tamam?['tamam','Teslim edildi']:x.gecikti?['gecikti','Gecikti']:['bekliyor','Bekliyor'];
function takipKarti(){
 const k=kulup();if(!k)return '';
 const d=K.takipDurumu(k);
 const satir=x=>{const [t,e]=durumDili(x);return `<li class="klp-satir"><span class="klp-satir__ad"><strong>${esc(x.ad)}</strong>${x.son?`<small>Son tarih ${esc(K.gunAy(x.son))}</small>`:''}</span><span class="klp-durum klp-durum--${t}">${e}</span></li>`};
 const ay=x=>{const [t,e]=durumDili(x);return `<li class="klp-ayrozet klp-ayrozet--${t}${x.simdi?' klp-ayrozet--simdi':''}" aria-label="${esc(x.ad)}: ${e}${x.simdi?' (bu ay)':''}"><span class="klp-ayrozet__isaret" aria-hidden="true">${x.tamam?'✓':x.gecikti?'!':''}</span>${esc(x.ad)}</li>`};
 return `<article class="ka-card klp-takip" data-klp-takip><div class="ka-card__body ka-stack"><div class="klp-evrak__ust"><span class="klp-no" aria-hidden="true">✓</span><div><strong>Evrak teslim durumu</strong><small>Okul yönetiminin kaydettiği teslimler; yalnız bu kulübünüz gösterilir.</small></div></div>
<div class="klp-takip__ozet"><progress class="klp-takip__bar" value="${d.tamam}" max="${d.toplam}" aria-label="Teslim edilen evrak"></progress><b>${d.tamam}/${d.toplam}</b></div>${d.gecikti?`<p class="klp-takip__uyari">${d.gecikti} evrakın teslimi gecikti.</p>`:''}
<ul class="klp-satirlar">${d.planlar.map(satir).join('')}</ul>
<div class="klp-takip__baslik">Aylık faaliyet raporları</div><ul class="klp-ayrozetler">${d.aylar.map(ay).join('')}</ul>
<ul class="klp-satirlar">${satir(d.yilSonu)}</ul></div></article>`;
}
/* Katalogda karşılığı olmayan kulüp: hazır evrakları olan bir kulüple elle eşleştirilebilir. */
function eslesmeKarti(){
 const l=S.katalog?.kulupler||[];
 if(S.paket||S.yukleniyor||!kulup())return '';
 const secenek=l.map(x=>`<option value="${esc(x.id)}">${esc(x.ad)}</option>`).join('');
 return `<article class="ka-card klp-uyari"><div class="ka-card__body ka-stack"><strong>Bu kulübün hazır evrakları henüz eklenmedi</strong><p class="ka-muted">Üye listesi, toplantı tutanağı ve denetleme kurulu raporu hemen hazırlanır. İç tüzük, yıllık plan, toplum hizmeti ve raporlar için kulübün evrakları kataloğa eklenmelidir.</p>${l.length?field('Hazır evrakları olan bir kulüple eşleştir',`<select class="ka-input" data-klp-alan="eslesme"><option value="">Seçiniz</option>${secenek}</select>`):''}</div></article>`;
}
function viewHtml(){
 const liste=gorunenKulupler(),yonetici=SB.isManager();
 const sekmeler=yonetici?`<nav class="ka-tabs klp-tabs" role="tablist" aria-label="Sosyal Kulüpler"><button type="button" role="tab" class="active" aria-selected="true">Kulüp evrakları</button><button type="button" role="tab" aria-selected="false" data-klp-act="takip">Evrak takibi</button></nav>`:'';
 const bos=!liste.length?`<div class="klp-bos"><strong>${yonetici?'Kayıtlı kulüp yok':'Danışmanı olduğunuz kulüp yok'}</strong><p>${yonetici?'Kulüpler “Evrak takibi” bölümünden eklenir.':'Kulüp danışmanlığınız okul yönetimi tarafından tanımlanır; tanımlandığında evraklarınız burada görünür.'}</p></div>`:'';
 const icerik=kulup()?`${eslesmeKarti()}<div class="klp-liste">${K.BELGELER.map((b,i)=>evrakKarti(b,i+1)).join('')}</div>`
  :liste.length?'<div class="klp-bos"><strong>Kulübü seçin</strong><p>İç tüzük, planlar, tutanak, üye listesi ve raporlar seçtiğiniz kulübe göre hazırlanır.</p></div>':'';
 return `<section class="ka-page ka-stack klp-page" data-klp-page>
<header class="ka-page-head"><span class="ka-page-head__icon" aria-hidden="true">🌟</span><div><small>${esc(S.yil)} EĞİTİM ÖĞRETİM YILI</small><h2>Sosyal Kulüpler</h2></div></header>
${sekmeler}${liste.length?kulupKarti(liste):''}${bos}${yonetici?'':takipKarti()}${icerik}</section>`;
}
function render(){
 const r=document.getElementById('v2ModuleRoot');if(!r||!S.yil)return false;
 const y=global.scrollY;
 r.innerHTML=viewHtml();mounted=true;
 if(!bagli)baglan();
 global.scrollTo?.(0,y);
 return true;
}
/* Yazarken sayfa yeniden çizilmez (odak ve imleç korunur). */
function yenile(){
 if(!mounted||!document.querySelector('[data-klp-page]'))return temizle();
 if(document.activeElement?.closest?.('[data-klp-page]')&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))return;
 const liste=gorunenKulupler();
 if(!S.kulupId&&S.istenenId&&liste.some(k=>String(k.id)===S.istenenId))kulupSec(S.istenenId);
 else if(!S.kulupId&&liste.length===1)kulupSec(String(liste[0].id));
 else paketiSec();
 render();
}

/* ── olaylar ── */
const inPage=e=>!!e.target?.closest?.('[data-klp-page]');
function kulupSec(id){
 S.kulupId=String(id||'');S.durum=S.kulupId?yerelOku():K.bosDurum();S.paket=null;S.paketId='';S.yukleniyor=false;S.acik=new Set();
 paketiSec();
}
async function yukleDosya(){
 if(!global.OgretmenDosyasiCore)await global.AppLoader?.loadScript?.(WORD_CORE);
 if(!global.KulupDosya)await global.AppLoader?.loadScript?.(WORD_DOSYA);
 if(!global.KulupDosya||!global.OgretmenDosyasiCore)throw new Error('İndirme bileşeni yüklenemedi.');
}
async function indir(b){
 if(!kulup())return toast('Önce kulübü seçin.');
 const kod=b.dataset.klpBelge,girdi={};
 if(kod==='aylik'&&b.dataset.klpAy)girdi.aylar=[b.dataset.klpAy];
 if(b.dataset.klpDonem)girdi.donem=Number(b.dataset.klpDonem);
 const eski=b.innerHTML;b.disabled=true;b.textContent='Hazırlanıyor…';
 try{
  await yukleDosya();
  await global.KulupDosya.indir(kod,baglam(),girdi);
  toast('Dosya indirildi.');
 }catch(e){console.warn('[Sosyal Kulüpler/indir]',e);toast(String(e?.message||'Dosya indirilemedi.'))}
 finally{b.disabled=false;b.innerHTML=eski}
}
const ISLEMLER={
 indir,
 /* Evrak takibi: kulüp seçiliyse yalnız o kulübün takibi (ClassicCizelgelerParity, takipKulubu üzerinden okur); seçili değilse tüm kulüpler. */
 takip:()=>{S.takipId=S.kulupId;Promise.resolve(global.ShellUI?.routeModule?.('tools',{page:'form-kulup-kayit',title:'Evrak takibi'})).catch(e=>{console.warn('[Sosyal Kulüpler/takip]',e);toast('Evrak takibi açılamadı.')})}
};
function onClick(e){
 if(!inPage(e))return;
 const b=e.target.closest('[data-klp-act]');if(!b||b.disabled)return;
 ISLEMLER[b.dataset.klpAct]?.(b,e);
}
function onChange(e){
 if(!inPage(e))return;
 const el=e.target,a=el.dataset?.klpAlan;
 if(a==='kulup'){kulupSec(el.value);render();return}
 if(a==='eslesme'){K.ayarla(S.durum,'eslesme',el.value);kaydet();S.paket=null;S.paketId='';paketiSec();render();return}
 if(el.dataset?.klpK&&(el.type==='date'||el.type==='time')){K.ayarla(S.durum,el.dataset.klpK,el.value);kaydet()}
}
function onInput(e){
 if(!inPage(e))return;
 const el=e.target;
 if(el.dataset?.klpK&&(el.tagName==='TEXTAREA'||el.type==='text')){K.ayarla(S.durum,el.dataset.klpK,el.value);kaydetGec()}
}
function onToggle(e){
 const d=e.target;if(!d?.matches?.('details[data-klp-ac]'))return;
 d.open?S.acik.add(d.dataset.klpAc):S.acik.delete(d.dataset.klpAc);
}
function baglan(){
 bagli=true;
 document.addEventListener('click',onClick);
 document.addEventListener('change',onChange);
 document.addEventListener('input',onInput);
 document.addEventListener('toggle',onToggle,true);
}

/* ── açılış ── */
/* kulupId: profildeki "Sosyal kulübüm" bağlantısı gibi doğrudan bir kulüple açılış; yalnız kullanıcının görebildiği kulüpler seçilir. */
function open({kulupId=''}={}){
 S.yil=K.egitimYili();temizle();S.istenenId=String(kulupId||'');
 const liste=gorunenKulupler();
 kulupSec(S.istenenId&&liste.some(k=>String(k.id)===S.istenenId)?S.istenenId:liste.length===1?String(liste[0].id):'');
 const ok=render();
 offPrefs=global.KaPrefs?.remoteListen?.(uzakGeldi)||null;
 SB.abonelik(['sosyalKulupler']).forEach(p=>{const u=global.AppStore?.subscribe?.(p,yenile);if(u)unsubs.push(u)});
 SB.hazirla(['sosyalKulupler']).then(yenile).catch(e=>console.warn('[Sosyal Kulüpler]',e?.message||e));
 katalogYukle().then(()=>{paketiSec();yenile()});
 return ok;
}
function unmount(){clearTimeout(pushT);clearTimeout(yazT);temizle()}

global.KulupModule={open,render,unmount,baglam,kulupSec,takipKulubu:()=>S.takipId,get durum(){return S.durum},get paket(){return S.paket}};
})(window);
