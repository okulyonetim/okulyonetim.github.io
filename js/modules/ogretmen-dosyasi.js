/* Koruk Asistan — Öğretmen Dosyası
 * Öğretmenin yıl boyunca tamamlaması gereken evrakların numaralı kontrol listesi: Genel · Rehberlik · Sosyal Kulüp · 1. Dönem Sonu · Sene Sonu · Diğer.
 * Her maddede: hazır formu indir (Word'e okul/öğretmen/branş/müdür bilgisi otomatik yazılır, PDF olduğu gibi iner), uygulamadaki ilgili sayfayı aç,
 * kendi dosyanı yükle (Supabase depolama; mevcut Dökümanlar servisiyle), hazır / gerekmez olarak işaretle.
 * Liste: evrak-katalog.js (Evrak Teslim ile ortak) · mantık: ogretmen-dosyasi-core.js · şablonlar: assets/ogretmen-dosyasi/
 * İşaretler hesabın tercih belgesinde (KaPrefs → oy_kullaniciTercihleri/{uid}) eğitim-öğretim yılı başına tutulur; telefon ve bilgisayar aynı durumu görür.
 */
(function(global){
'use strict';
if(global.OgretmenDosyasi)return;

const K=()=>global.EvrakKatalog,C=()=>global.OgretmenDosyasiCore;
const SEKMELER=[
 {k:'genel',ad:'Genel',donem:'basi',grup:'idari'},
 {k:'rehberlik',ad:'Rehberlik',donem:'basi',grup:'rehberlik'},
 {k:'kulup',ad:'Sosyal Kulüp',donem:'basi',grup:'kulup'},
 {k:'donem1',ad:'1. Dönem Sonu',donem:'donem1'},
 {k:'sonu',ad:'Sene Sonu',donem:'sonu'},
 {k:'diger',ad:'Diğer'}
];
const DOSYA_KATEGORI='Öğretmen Dosyası';
const DOSYA_ENCOK=25*1024*1024;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const toast=m=>global.toast?.(m);
const adSoyad=t=>t?(`${t.ad||''} ${t.soyad||''}`.replace(/\s+/g,' ').trim()||String(t.adSoyad||'').trim()):'';
const boyut=b=>b>=1048576?`${(b/1048576).toFixed(1).replace('.',',')} MB`:`${Math.max(1,Math.round(b/1024))} KB`;

const S={tab:'genel',yil:'',durum:null,mesgul:new Set()};
let mounted=false,bagli=false,unsubs=[],offPrefs=null,pushT=0,hazirlandi=false;

/* ── hesap ve okul bilgisi: formlara yazılacak değerler ── */
function okul(){const l=arr('okulBilgileri');return l.find(x=>x.id==='ayarlar')||l[0]||global.okulBilgileriAyari||{}}
/* Ders Giriş-Çıkış Saatleri formu: satırlar uygulamadaki Ders Saatleri ayarından gelir. */
const saatSatirlari=()=>{const l=arr('dersSaatleri');return C().dersSaatSatirlari(l.find(x=>x.id==='ayarlar')||l[0]||{})};
const SATIR_KAYNAKLARI={saatler:saatSatirlari};
function bilgi(){
 const u=user(),o=okul(),ogr=arr('ogretmenler'),id=u.bagliOgretmenId||u.ogretmenId||'';
 const t=ogr.find(x=>String(x.id)===String(id))||ogr.find(x=>u.uid&&(x.uid===u.uid||x.hesapUid===u.uid))||null;
 const md=ogr.find(x=>String(x.id)===String(o.mudurId||o.mudirId||''));
 return{
  okul:String(o.okulAdi||o.ad||global.ReportEngine?.schoolInfo?.().okulAdi||'').trim(),il:o.il,ilce:o.ilce,
  ad:adSoyad(t)||String(u.adSoyad||u.ad||u.displayName||'').trim(),unvan:t?.unvan||u.unvan||'',brans:t?.brans||u.brans||'',
  mudur:adSoyad(md)||String(o.mudurAdSoyad||o.mudurAdi||'').trim(),yil:S.yil
 };
}

/* ── liste: sekme → maddeler ── */
function maddeler(k){
 const s=SEKMELER.find(x=>x.k===k);if(!s)return[];
 if(k==='diger')return C().ozeller(S.durum).map(o=>({id:o.id,ad:o.ad,ozel:true,formlar:[],araclar:[],grup:'ozel'}));
 return K().KATALOG.filter(e=>e.donem===s.donem&&(!s.grup||e.grup===s.grup));
}
const tumIdler=()=>[...K().KATALOG.map(e=>e.id),...C().ozeller(S.durum).map(o=>o.id)];
function say(k){return C().ilerleme(maddeler(k).map(e=>e.id),S.durum)}
function maddeBul(id){return K().KATALOG.find(e=>e.id===id)||C().ozeller(S.durum).map(o=>({id:o.id,ad:o.ad,ozel:true})).find(e=>e.id===id)||null}

/* ── ilerleme durumu: yerelde KaPrefs, hesapta oy_kullaniciTercihleri ── */
const anahtar=()=>C().durumAnahtari(S.yil);
function yerelOku(){try{return C().durumTemizle(JSON.parse(global.KaPrefs?.get?.(anahtar(),'')||'null'))}catch(_){return C().bosDurum()}}
function yerelYaz(){global.KaPrefs?.set?.(anahtar(),JSON.stringify(S.durum))}
function uzagaYaz(){clearTimeout(pushT);pushT=setTimeout(()=>{global.KaPrefs?.remoteSet?.({[anahtar()]:JSON.stringify(S.durum)})},700)}
function kaydet(){yerelYaz();uzagaYaz()}
function uzakGeldi(x){
 if(!mounted||!document.querySelector('[data-od-page]'))return temizle();
 const j=x?.[anahtar()];if(!j)return;
 let r;try{r=C().durumTemizle(JSON.parse(j))}catch(_){return}
 const m=C().durumBirlestir(S.durum,r);
 if(!C().durumAyni(m,r))uzagaYaz();           // yerelde daha yeni bilgi var: hesaba da yaz
 if(!C().durumAyni(m,S.durum)){S.durum=m;yerelYaz();render()}
}
function temizle(){offPrefs?.();offPrefs=null;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];mounted=false}

/* ── dosya kaydetme (uygulamada yerel kaydet, tarayıcıda indir) ── */
async function dosyaKaydet(blob,ad,tur){
 if(typeof global.uygulamaDosyaKaydet==='function'){
  const b64=await new Promise((ok,hata)=>{const r=new global.FileReader();r.onload=()=>ok(String(r.result||'').split(',')[1]||'');r.onerror=()=>hata(r.error||new Error('Dosya hazırlanamadı.'));r.readAsDataURL(blob)});
  return global.uygulamaDosyaKaydet(b64,ad,tur,false);
 }
 const url=global.URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=ad;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>global.URL.revokeObjectURL(url),1200);
}
/* Hazır formu (Word: bilgiler doldurulur, PDF: olduğu gibi) hazırlayıp kaydeder. ek: form bilgisini ezer (okul, ad, mudur, yil…);
 * Öğretmen Dosyası dışındaki sayfalar da (Projeler › Maarif'in Kalbinde Oyun) aynı yolu kullanır. Başarıda true, eksik veriyle durunca false döner. */
async function formKaydet(key,tur,ek={}){
 await ensureDeps();
 const f=K().FORMLAR[key];if(!f)throw new Error('Form bulunamadı.');
 const satirlar=f.satir?SATIR_KAYNAKLARI[f.satir]():null;
 if(satirlar&&!satirlar.length){toast('Ders saatleri tanımlı değil. Ayarlar › Ders Saatleri bölümünden ekleyin.');return false}
 const dosya=tur==='docx'?f.docx:f.pdf,r=await global.fetch(`${K().DOSYA_KOKU}${dosya}`);
 if(!r.ok)throw new Error(`Form dosyası alınamadı (${r.status}).`);
 const b={...bilgi(),yil:S.yil||K().egitimYili(),...ek};
 if(tur==='docx'){
  const blob=await C().docxDoldur(await r.arrayBuffer(),C().degerler(b),satirlar);
  await dosyaKaydet(blob,C().dosyaAdi(f.ad,C().imzaAd(b.ad),'docx'),C().DOCX_TURU);
 }else{
  await dosyaKaydet(await r.blob(),C().dosyaAdi(f.ad,'','pdf'),C().PDF_TURU);
 }
 return true;
}
async function formIndir(key,tur){
 const kimlik=`form:${key}:${tur}`;
 if(S.mesgul.has(kimlik))return;
 S.mesgul.add(kimlik);render();
 try{if(await formKaydet(key,tur))toast('Form indirildi.')}
 catch(e){console.warn('[Öğretmen Dosyası/form]',e);toast(String(e?.message||'').startsWith('Form dosyası')||String(e?.message||'').includes('Word')?e.message:'Form indirilemedi.')}
 finally{S.mesgul.delete(kimlik);render()}
}

/* ── kendi dosyan: Dökümanlar servisi → Supabase depolama ── */
async function yuklemeHazir(){
 if(!global.DokumanlarService?.dokumanEkle)await global.AppLoader?.load?.('documents');
 if(!global.DokumanlarService?.dokumanEkle)throw new Error('Dosya yükleme hazır değil.');
 global.firebaseStorageHazirla?.();
 const SE=global.SyncEngine,col=global.COL?.dokumanlar,u=user();
 if(SE&&col){
  const tipler=[];
  if(u.admin===true){SE.register('dokumanlar',col);tipler.push('dokumanlar')}
  else if(u.uid){SE.register('dokumanlarAcik',col,{query:q=>q.where('gorunurluk','==','herkes')});SE.register('dokumanlarBenim',col,{query:q=>q.where('olusturanUid','==',u.uid)});tipler.push('dokumanlarAcik','dokumanlarBenim')}
  if(tipler.length)await SE.localHydrate(tipler);
 }
}
function yuklemeHatasi(e){
 const m=String(e?.message||'');
 if(e?.code==='permission-hidden')return'Dosya yükleme bu hesapta kapalı.';
 if(m==='yetkisiz')return'Dosya yükleme yetkiniz yok.';
 if(m.startsWith('depolama-siniri:'))return m.slice(16)||'Depolama sınırına ulaşıldı.';
 return/internet|bağlantı/i.test(m)?m:'Dosya yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.';
}
const sekmeOf=id=>{const e=K().KATALOG.find(x=>x.id===id);if(!e)return'diger';return SEKMELER.find(s=>s.donem===e.donem&&(!s.grup||s.grup===e.grup))?.k||'genel'};
async function dosyaYukle(maddeId,dosya){
 const m=maddeBul(maddeId);if(!m||!dosya)return;
 if(dosya.size>DOSYA_ENCOK){toast('Dosya en fazla 25 MB olabilir.');return}
 const kimlik=`yukle:${maddeId}`;
 if(S.mesgul.has(kimlik))return;
 S.mesgul.add(kimlik);render();
 try{
  await yuklemeHazir();
  const sekme=SEKMELER.find(s=>s.k===sekmeOf(maddeId))?.ad||'';
  const satir=await global.DokumanlarService.dokumanEkle(
   {ad:String(m.ad).slice(0,150),kategori:DOSYA_KATEGORI,aciklama:`${S.yil} eğitim öğretim yılı · ${sekme}`,ogretmenDosyasi:{yil:S.yil,madde:maddeId}},
   dosya,p=>{const el=document.querySelector(`[data-od-prog="${maddeId}"]`);if(el)el.textContent=`%${p}`});
  C().dosyaEkle(S.durum,satir.id,{m:maddeId,a:dosya.name,y:satir.storagePath,b:dosya.size});
  C().isaretle(S.durum,maddeId,'h');kaydet();
  toast('Dosya yüklendi; madde hazır olarak işaretlendi.');
 }catch(e){console.warn('[Öğretmen Dosyası/yükleme]',e);toast(yuklemeHatasi(e))}
 finally{S.mesgul.delete(kimlik);render()}
}
async function dosyaAc(dosyaId){
 const d=S.durum.f[dosyaId];if(!d||d.x)return;
 try{
  global.firebaseStorageHazirla?.();
  const url=await global.storage.ref().child(d.y).getDownloadURL();
  if(!global.DokumanOkuyucu&&global.AppLoader?.loadScript)await global.AppLoader.loadScript('js/modules/document-viewer.js').catch(()=>{});
  const o=global.DokumanOkuyucu;
  if(o&&(o.destekliMi?.(d.a)||o.destekliMi?.(url))){await o.ac(url,d.a);return}
  global.open(url,'_blank','noopener');
 }catch(e){console.warn('[Öğretmen Dosyası/aç]',e);toast('Dosya açılamadı; Dökümanlar’dan silinmiş olabilir.')}
}
async function dosyaKaldir(dosyaId){
 const d=S.durum.f[dosyaId];if(!d||d.x)return;
 if(!global.confirm(`“${d.a}” dosyası silinsin mi?`))return;
 try{await global.DokumanlarService?.dokumanSil?.(dosyaId,d.y,{olusturanUid:user().uid})}catch(e){console.warn('[Öğretmen Dosyası/sil]',e)}
 C().dosyaSil(S.durum,dosyaId);kaydet();render();
}

/* ── ekran ── */
function etiketler(m){
 const out=[];
 const kimden=K().KIMDEN.find(x=>x[0]===m.kimden);
 if(kimden&&m.kimden!=='herkes')out.push(`<span class="ka-od-tag">${esc(kimden[1])}</span>`);
 return out.join('');
}
function formSatiri(f,madde){
 const dugme=(tur,etiket)=>{const mesgul=S.mesgul.has(`form:${f.key}:${tur}`);return`<button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-od-act="form" data-od-form="${esc(f.key)}" data-od-tur="${tur}" ${mesgul?'disabled':''}>${mesgul?'Hazırlanıyor…':etiket}</button>`};
 const ayni=C().upper(f.ad)===C().upper(madde.ad);   // form adı madde başlığıyla aynıysa yinelenmez
 return`<div class="ka-od-form${ayni?' ka-od-form--tek':''}">${ayni?'':`<span class="ka-od-form__ad">${esc(f.ad)}</span>`}<span class="ka-od-form__act">${f.docx?dugme('docx','Word · doldur ve indir'):''}${f.pdf?dugme('pdf','PDF indir'):''}</span></div>`;
}
function dosyaChip(d){
 return`<span class="ka-od-file"><button type="button" class="ka-od-file__ad" data-od-act="dosya-ac" data-od-dosya="${esc(d.i)}" title="Aç">📎 ${esc(d.a)}<small>${esc(boyut(d.b))}</small></button><button type="button" class="ka-od-file__x" data-od-act="dosya-sil" data-od-dosya="${esc(d.i)}" aria-label="${esc(d.a)} dosyasını sil">×</button></span>`;
}
function satirHtml(m,no){
 const s=C().isaret(S.durum,m.id),formlar=m.ozel?[]:K().formlar(m,S.yil);
 const araclar=(m.araclar||[]).map(id=>global.AppNav?.tool?.(id)).filter(t=>t&&global.AppNav?.toolAllowed?.(t)),aracVar=araclar.length>0;
 const dosyalar=C().dosyalar(S.durum,m.id),yukluyor=S.mesgul.has(`yukle:${m.id}`);
 const yakinda=!m.ozel&&m.donem==='basi'&&!formlar.length&&!aracVar;
 const eylem=[
  ...araclar.map(t=>`<button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-od-act="ac" data-od-arac="${esc(t.id)}">${esc(t.label)} ›</button>`),
  `<button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-od-act="yukle" data-od-madde="${esc(m.id)}" ${yukluyor?'disabled':''}>${yukluyor?`Yükleniyor <span data-od-prog="${esc(m.id)}"></span>`:'Dosya yükle'}</button>`,
  `<button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-od-act="gerekmez" data-od-madde="${esc(m.id)}" aria-pressed="${s==='g'}">${s==='g'?'Gerekli say':'Bende gerekmez'}</button>`,
  m.ozel?`<button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-od-act="ozel-sil" data-od-madde="${esc(m.id)}">Kaldır</button>`:''
 ].join('');
 return`<li class="ka-od-item" data-od-item="${esc(m.id)}" data-state="${s}">
<label class="ka-od-check"><input type="checkbox" data-od-check="${esc(m.id)}" ${s==='h'?'checked':''} ${s==='g'?'disabled':''} aria-label="${esc(m.ad)} hazır"><span class="ka-od-no" aria-hidden="true">${no}</span></label>
<div class="ka-od-body"><strong class="ka-od-title">${esc(m.ad)}</strong>${m.ozel?'':`<div class="ka-od-tags">${etiketler(m)}${yakinda?'<span class="ka-od-tag ka-od-tag--soon">Form yakında</span>':''}</div>`}
${formlar.map(f=>formSatiri(f,m)).join('')}${dosyalar.length?`<div class="ka-od-files">${dosyalar.map(dosyaChip).join('')}</div>`:''}</div>
<div class="ka-od-actions">${eylem}</div></li>`;
}
function listeHtml(k){
 const l=maddeler(k),GR=K().GRUPLAR;
 if(!l.length)return`<div class="ka-od-empty"><strong>Henüz eklediğiniz madde yok</strong><p>Listede olmayan evraklarınızı aşağıdan ekleyin; hazır işaretlemeyi ve dosya yüklemeyi diğer maddelerle aynı şekilde kullanırsınız.</p></div>`;
 const donemSekmesi=k==='donem1'||k==='sonu';
 let no=0,son='';
 return`<ol class="ka-od-list">${l.map(m=>{
  const baslik=donemSekmesi&&m.grup!==son?`<li class="ka-od-group" role="presentation">${esc(GR[m.grup]||'')}</li>`:'';
  son=m.grup;return baslik+satirHtml(m,++no);
 }).join('')}</ol>`;
}
function ekleHtml(){
 return`<form class="ka-od-add" data-od-add><label class="ka-field"><span class="ka-field__label">Yeni madde</span><input class="ka-input" name="ad" maxlength="120" placeholder="Örn. Kitap okuma kulübü raporu" autocomplete="off" required></label><button type="submit" class="ka-btn">Ekle</button></form>`;
}
function bilgiHtml(){
 const b=bilgi(),v=C().degerler(b),eksik=[],saat=saatSatirlari().filter(x=>x.tur==='SAAT'),saatOzet=saat.length?`${saat.length} ders · ${saat[0].GIRIS}–${saat.at(-1).CIKIS}`:'';
 if(!b.okul)eksik.push('okul adı');if(!b.ad)eksik.push('adınız');if(!b.mudur)eksik.push('okul müdürü');if(!saat.length)eksik.push('ders saatleri');
 const satir=(e,d)=>`<div><dt>${e}</dt><dd>${d?esc(d):'<i>boş kalır</i>'}</dd></div>`;
 return`<details class="ka-od-info"><summary>Formlara yazılacak bilgiler${eksik.length?` <span class="ka-od-warn">${eksik.length} eksik</span>`:''}</summary>
<dl>${satir('Okul',b.okul)}${satir('Ad soyad',C().imzaAd(b.ad))}${satir('Branş / görev',C().bransMetni(b.unvan,b.brans))}${satir('Okul müdürü',C().imzaAd(b.mudur))}${satir('Ders saatleri',saatOzet)}${satir('Eğitim yılı',v.YIL)}</dl>
<p>Bilgiler hesabınızdan ve okul ayarlarından alınır; eksik olanlar formda noktalı kalır. T.C. kimlik numarası kişisel veri olduğu için hiçbir forma otomatik yazılmaz.</p></details>`;
}
function viewHtml(){
 const t=SEKMELER.find(s=>s.k===S.tab)||SEKMELER[0],genel=C().ilerleme(tumIdler(),S.durum),bu=say(t.k);
 const sekmeler=SEKMELER.map(s=>{const c=say(s.k);return`<button type="button" role="tab" class="${s.k===t.k?'active':''}" aria-selected="${s.k===t.k}" data-od-tab="${s.k}">${esc(s.ad)}<small>${c.hazir}/${c.toplam}</small></button>`}).join('');
 return`<section class="ka-page ka-stack ka-od" data-od-page>
<header class="ka-page-head"><span class="ka-page-head__icon" aria-hidden="true">📁</span><div><small>${esc(S.yil)} EĞİTİM ÖĞRETİM YILI</small><h2>Öğretmen Dosyası</h2></div></header>
<article class="ka-card"><div class="ka-card__body ka-od-sum"><div class="ka-od-sum__txt"><strong>${genel.hazir} / ${genel.toplam} madde hazır</strong><span>%${genel.yuzde} tamamlandı${genel.gerekmez?` · ${genel.gerekmez} madde sizde gerekmiyor`:''}</span></div><span class="ka-od-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${genel.yuzde}"><i style="width:${genel.yuzde}%"></i></span></div></article>
${bilgiHtml()}
<nav class="ka-tabs ka-od-tabs" role="tablist" aria-label="Dosya bölümleri">${sekmeler}</nav>
<p class="ka-od-tabhint">${t.k==='diger'?'Kendi eklediğiniz evraklar.':`Bu bölümde ${bu.hazir} / ${bu.toplam} madde hazır.`}</p>
${listeHtml(t.k)}${t.k==='diger'?ekleHtml():''}
</section>`;
}
function render(){
 const r=document.getElementById('v2ModuleRoot');if(!r||!S.durum||!K()||!C())return false;
 const y=global.scrollY;
 r.innerHTML=viewHtml();mounted=true;
 if(!bagli)baglan();
 const sekmeler=r.querySelector('.ka-od-tabs'),secili=sekmeler?.querySelector('.active');
 if(secili)sekmeler.scrollLeft=secili.offsetLeft-(sekmeler.clientWidth-secili.offsetWidth)/2;   // seçili sekme dar ekranda görünür kalsın
 global.scrollTo?.(0,y);
 return true;
}

/* ── olaylar ── */
const inPage=e=>!!e.target?.closest?.('[data-od-page]');
function isaretDegistir(id,hedef){
 const simdi=C().isaret(S.durum,id);
 C().isaretle(S.durum,id,simdi===hedef?'':hedef);kaydet();render();
}
const ISLEMLER={
 form:b=>formIndir(b.dataset.odForm,b.dataset.odTur),
 ac:b=>{const t=global.AppNav?.tool?.(b.dataset.odArac);if(!t)return;Promise.resolve(global.ShellUI?.routeModule?.(t.route,{page:t.page,title:t.label})).catch(e=>{console.error('[Öğretmen Dosyası/aç]',e);toast('Sayfa açılamadı.')})},
 yukle:b=>{const i=document.createElement('input');i.type='file';i.accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,application/pdf,image/*';i.onchange=()=>dosyaYukle(b.dataset.odMadde,i.files?.[0]);i.click()},
 gerekmez:b=>isaretDegistir(b.dataset.odMadde,'g'),
 'dosya-ac':b=>dosyaAc(b.dataset.odDosya),
 'dosya-sil':b=>dosyaKaldir(b.dataset.odDosya),
 'ozel-sil':b=>{const m=maddeBul(b.dataset.odMadde);if(!m||!global.confirm(`“${m.ad}” maddesi kaldırılsın mı?`))return;C().ozelSil(S.durum,m.id);kaydet();render()}
};
function onClick(e){
 if(!inPage(e))return;
 const tab=e.target.closest('[data-od-tab]');
 if(tab){S.tab=tab.dataset.odTab;render();return}
 const b=e.target.closest('[data-od-act]');if(!b||b.disabled)return;
 ISLEMLER[b.dataset.odAct]?.(b,e);
}
function onChange(e){
 if(!inPage(e))return;
 const c=e.target.closest('[data-od-check]');
 if(c)isaretDegistir(c.dataset.odCheck,'h');
}
function onSubmit(e){
 const f=e.target.closest?.('[data-od-add]');if(!f)return;
 e.preventDefault();
 const ad=String(new global.FormData(f).get('ad')||'').trim();if(!ad)return;
 C().ozelEkle(S.durum,`o_${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`,ad);kaydet();render();
}
function baglan(){
 bagli=true;
 document.addEventListener('click',onClick);
 document.addEventListener('change',onChange);
 document.addEventListener('submit',onSubmit);
}

/* ── hazırlık ve açılış ── */
async function ensureDeps(){
 const L=global.AppLoader;
 if(!global.EvrakKatalog)await L?.loadScript?.('js/modules/evrak-katalog.js?v=8');
 if(!global.OgretmenDosyasiCore)await L?.loadScript?.('js/modules/ogretmen-dosyasi-core.js?v=3');
 if(!K()||!C())throw new Error('Öğretmen Dosyası bileşenleri yüklenemedi.');
}
async function prepare(){
 const SE=global.SyncEngine,col=global.COL;if(!SE||!col||hazirlandi)return;
 hazirlandi=true;
 const tipler=[];
 for(const [t,c] of Object.entries({ogretmenler:col.ogretmenler,okulBilgileri:col.okulBilgileri,dersSaatleri:col.dersSaatleri}))if(c){SE.register(t,c);tipler.push(t)}
 await SE.localHydrate(tipler);SE.schedule?.(100);
}
async function open(){
 try{await ensureDeps()}catch(e){console.error('[Öğretmen Dosyası]',e);toast('Öğretmen Dosyası açılamadı.');return false}
 S.yil=K().egitimYili();S.durum=yerelOku();S.tab='genel';
 temizle();
 if(!render())return false;
 mounted=true;
 offPrefs=global.KaPrefs?.remoteListen?.(uzakGeldi)||null;
 ['data.okulBilgileri','data.ogretmenler','data.dersSaatleri'].forEach(p=>{const u=global.AppStore?.subscribe?.(p,()=>{if(!document.querySelector('[data-od-page]'))return temizle();render()});if(u)unsubs.push(u)});
 prepare().catch(e=>console.warn('[Öğretmen Dosyası]',e?.message||e));
 return true;
}
function unmount(){clearTimeout(pushT);temizle()}

global.OgretmenDosyasi={open,render,unmount,formKaydet};
})(window);
