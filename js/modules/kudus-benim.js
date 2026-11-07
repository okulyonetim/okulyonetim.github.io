/* Koruk Asistan — Projeler › Kudüs Ben’im Projesi
 * Tek sayfa, altı sekme: Proje Nedir? · Proje Ekibi · Yıllık Plan · Etkinlik Havuzu · EK-1 · EK-2 Formları · Çalışma Kâğıtları.
 * Sınıf düzeyi (ilkokul · ortaokul · ilkokul ve ortaokul) tek yıllık plan içinde seçilir; sayfadaki her şey (öneriler, belgeler) seçilen düzeye göre yazılır.
 * Belgeler: A4 önizleme, Yazdır / PDF (ReportEngine) ve gerçek Word (WordBelge) — hepsi kudus-benim-belge.js’teki aynı modelden üretilir.
 * Kayıt: ekip, öğrenci grubu, plan ve formlar hesabın tercih belgesinde (KaPrefs) tek anahtarda saklanır; telefon ve bilgisayar aynı durumu görür (en yeni zaman damgası geçerli).
 * İçerik: kudus-benim-veri.js · belgeler: kudus-benim-belge.js · ortak Word üretici: word-belge.js. Ekran stili: css/design-system-base.css (.kbm-*, kâğıt .kbp-*).
 */
(function(global){
'use strict';
if(global.KudusBenimModule)return;
const V=global.KudusBenimVeri,K=global.KudusBenimBelge,B=global.SinifBaglam;
if(!V||!K||!B)throw new Error('Kudüs Ben’im Projesi için gerekli bileşenler yüklenmedi.');

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {rows,adBicimi,adSoyad,teacherId,okulMuduru,okulAdi,okulKaydi}=B;
const SEKMELER=['nedir','ekip','plan','havuz','formlar','kagitlar'];
const ALTYAZI='Kudüs Ben’im Projesi: ekip, yıllık plan, etkinlik havuzu, EK-1 · EK-2 formları ve çalışma kâğıtları (önizleme, PDF ve Word).';
const PX=mm=>mm*96/25.4; /* A4, CSS pikseli (1 in = 96 px) */
const BUYUTME=1.8; /* Büyüt: sığdırma ölçeğinin 1,8 katı; sonra gerçek boyut (kâğıt yana kaydırılır) */
/* Önizleme ve PDF aynı belgeyi (ReportEngine.documentHtml) aynı seçeneklerle kullanır; her sayfada 15 mm üst / alt boşluk. */
const CIKTI={logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' ',akis:true,kenarBosluk:15,ozellestirilebilir:false};
const KAGIT_MM={yatay:[297,210],dikey:[210,297]};
const [YIL1,YIL2]=String(V.YIL).split('-').map(Number);
const slug=v=>String(v||'').replace(/[^0-9A-Za-z]+/g,'_').replace(/^_+|_+$/g,'');
const ANAHTAR=`kudusBenim_${slug(V.YIL)}`;
const KAYIT_SINIRI=700000; /* karakter */
const BILGI_ALANLARI=['okul','ilIlce','ogretmen','mudur'];
const UZUN_ALAN=new Set(['gorevli','ogrenciGrubu','paydas','butce','izin','veliIzni','ozelGereksinim','guvenlik','materyal','urun','aciklama','katilimDuzeyi','urunler','linkler','guclukler','iyiUygulama','oneri','paylasimIzni','arsiv']);
const EK_ALANLARI={ek1:new Set(V.EK1.map(a=>a[1])),ek2:new Set(V.EK2.map(a=>a[1]))};

let S=null,unsubs=[],bekleyen={},pushT=0,kagitT=0;

/* ── durum ── */
const yeniUid=()=>`e${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
const kes=(v,n)=>String(v??'').slice(0,n);
const tarihYaz=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');return m?`${m[3]}.${m[2]}.${m[1]}`:''};
/* Saklanan / uzaktan gelen veriyi güvenli biçime sokar: uzunluklar sınırlı, bilinmeyen alanlar atılır, planda olmayan etkinliklerin formları düşer. */
function temizDurum(x){
 const o=K.bosDurum();
 if(!x||typeof x!=='object')return o;
 o.ekip=(Array.isArray(x.ekip)?x.ekip:[]).slice(0,30).map(k=>({ad:kes(k?.ad,80),brans:kes(k?.brans,80),gorev:kes(k?.gorev,80)}));
 o.ogrenciler=(Array.isArray(x.ogrenciler)?x.ogrenciler:[]).slice(0,300).map(k=>({ad:kes(k?.ad,80),sinif:kes(k?.sinif,20),gorev:kes(k?.gorev,80)}));
 const uidler=new Set();
 V.AYLAR.forEach(ay=>{
  const l=Array.isArray(x.plan?.[ay])?x.plan[ay]:[];
  if(!l.length)return;
  o.plan[ay]=l.slice(0,12).map(e=>{
   let uid=kes(e?.uid,40).replace(/[^0-9A-Za-z_-]/g,'');
   if(!uid||uidler.has(uid))uid=yeniUid();
   uidler.add(uid);
   return{uid,ad:kes(e?.ad,160),havuz:V.etkinlik(e?.havuz)?e.havuz:'',tarih:kes(e?.tarih,30),iso:/^\d{4}-\d{2}-\d{2}$/.test(e?.iso||'')?e.iso:'',sorumlu:kes(e?.sorumlu,80)};
  });
 });
 ['ek1','ek2'].forEach(t=>{
  const kaynak=x[t];
  if(!kaynak||typeof kaynak!=='object')return;
  uidler.forEach(uid=>{
   const d=kaynak[uid];
   if(!d||typeof d!=='object')return;
   const r={};
   EK_ALANLARI[t].forEach(k=>{if(typeof d[k]==='string')r[k]=kes(d[k],800)});
   if(Object.keys(r).length)o[t][uid]=r;
  });
 });
 return o;
}
const blank=sekme=>({sekme,duzey:'',okul:'',ilIlce:'',ogretmen:'',mudur:'',elle:{},durum:K.bosDurum(),durumT:0,mesgul:new Set(),seviye:{},acik:new Set(),sinifSec:''});
const ensure=()=>S||(S=blank('nedir'));
/* Sınıf düzeyi: seçilmediyse öğretmenin görebildiği sınıflardan çıkarılır (yalnız 1–4 → ilkokul, yalnız 5–8 → ortaokul, ikisi → ikisi). */
function tahminDuzey(){
 const d=new Set(B.siniflar().liste.map(c=>B.duzeyOf(c.ad)).filter(Boolean)),k=[...d].some(n=>n<=4),o=[...d].some(n=>n>=5);
 return k&&o?'ikisi':k?'ilkokul':'ortaokul';
}
const duzey=()=>ensure().duzey||tahminDuzey();
const duzeyBilgisi=()=>V.DUZEYLER[duzey()];
function ogretmenAdi(){
 const t=rows('ogretmenler').find(x=>String(x.id)===String(teacherId())),u=B.user();
 return adBicimi(adSoyad(t)||String(u.adSoyad||u.ad||u.displayName||'').trim());
}
const ilIlceAdi=()=>{const o=okulKaydi();return[o.il||o.ili||o.sehir||o.ilAdi||'',o.ilce||o.ilceAdi||''].map(v=>String(v).trim()).filter(Boolean).join(' / ')};
/* Elle değiştirilmeyen alanları uygulama verisinden doldurur; değişen bir şey olduysa true. */
function varsayilanlar(){
 const s=ensure(),once=JSON.stringify(BILGI_ALANLARI.map(k=>s[k]));
 if(!s.elle.okul)s.okul=okulAdi(duzeyBilgisi().duzey);
 if(!s.elle.ilIlce)s.ilIlce=ilIlceAdi();
 if(!s.elle.ogretmen)s.ogretmen=ogretmenAdi();
 if(!s.elle.mudur)s.mudur=okulMuduru();
 return once!==JSON.stringify(BILGI_ALANLARI.map(k=>s[k]));
}
const ctx=()=>{const s=ensure();return{okul:s.okul,ilIlce:s.ilIlce,ogretmen:s.ogretmen,mudur:s.mudur,duzey:duzey()}};

/* ── kayıt: yerelde ve hesapta (KaPrefs); en yeni zaman damgası geçerli ── */
function saklanan(){
 const s=ensure(),bilgi={};
 BILGI_ALANLARI.forEach(k=>{if(s.elle[k])bilgi[k]=s[k]});
 return JSON.stringify({v:1,t:s.durumT,duzey:s.duzey,bilgi,...s.durum});
}
function oku(j){
 let x=null;try{x=JSON.parse(j||'null')}catch(_){}
 if(!x||typeof x!=='object')return null;
 const bilgi={};
 BILGI_ALANLARI.forEach(k=>{if(typeof x.bilgi?.[k]==='string')bilgi[k]=kes(x.bilgi[k],200)});
 return{t:Number(x.t)||0,duzey:V.DUZEYLER[x.duzey]?x.duzey:'',bilgi,durum:temizDurum(x)};
}
function uygula(r){
 const s=ensure();
 s.durum=r.durum;s.durumT=r.t;s.duzey=r.duzey;
 BILGI_ALANLARI.forEach(k=>{if(k in r.bilgi){s[k]=r.bilgi[k];s.elle[k]=true}else s.elle[k]=false});
}
function kaydet(){
 const s=ensure();
 s.durumT=Date.now();
 const j=saklanan();
 global.KaPrefs?.set?.(ANAHTAR,j);
 /* Hesap belgesi 1 MB ile sınırlıdır: bu kadar büyüyen kayıt yalnız bu cihazda tutulur. */
 if(j.length>KAYIT_SINIRI){global.toast?.('Kayıt çok büyüdü; yalnız bu cihazda saklanıyor. Kullanılmayan form alanlarını temizleyin.');return}
 bekleyen={[ANAHTAR]:j};clearTimeout(pushT);
 pushT=setTimeout(()=>{const b=bekleyen;bekleyen={};global.KaPrefs?.remoteSet?.(b)},700);
}
/* Başka cihazdaki daha yeni durum gelirse yerelin yerine geçer. */
function uzakGeldi(x){
 const kok=document.querySelector('[data-kb-page]');
 if(!kok)return temizle();
 const j=x?.[ANAHTAR];if(!j)return;
 const r=oku(j),s=ensure();
 if(!r||r.t<=s.durumT)return;
 uygula(r);global.KaPrefs?.set?.(ANAHTAR,saklanan());varsayilanlar();
 if(!kok.contains(document.activeElement))render();
}

/* ── plan yardımcıları ── */
function etkinlikBul(uid){
 for(const ay of V.AYLAR){const e=(ensure().durum.plan[ay]||[]).find(x=>x.uid===uid);if(e)return{e,ay}}
 return null;
}
const planListesi=()=>V.AYLAR.flatMap(ay=>(ensure().durum.plan[ay]||[]).filter(e=>String(e.ad||'').trim()).map(e=>({...e,ay})));
function etkinlikEkle(ay,ad,havuz=''){
 const s=ensure(),l=s.durum.plan[ay]||(s.durum.plan[ay]=[]);
 if(l.length>=12){global.toast?.('Bir aya en çok 12 etkinlik eklenir.');return null}
 const e={uid:yeniUid(),ad,havuz,tarih:'',iso:'',sorumlu:''};
 l.push(e);return e;
}
function etkinlikSil(uid){
 const s=ensure(),b=etkinlikBul(uid);if(!b)return;
 s.durum.plan[b.ay]=s.durum.plan[b.ay].filter(e=>e.uid!==uid);
 if(!s.durum.plan[b.ay].length)delete s.durum.plan[b.ay];
 delete s.durum.ek1[uid];delete s.durum.ek2[uid];s.acik.delete(uid);
}

/* ── ekran parçaları ── */
const kart=(baslik,icerik,sinif='')=>`<article class="ka-card kbm-kart${sinif?` ${sinif}`:''}"><div class="ka-card__body ka-stack">${baslik?`<strong class="kbm-kart__baslik">${esc(baslik)}</strong>`:''}${icerik}</div></article>`;
const liste=maddeler=>`<ul class="kbm-liste">${maddeler.map(([k,t])=>`<li>${k?`<b>${esc(k)}</b> `:''}${esc(t)}</li>`).join('')}</ul>`;
const kaynak=()=>`<p class="kbm-kaynak">${esc(V.KAYNAK)}</p>`;
const not=metin=>`<small class="ka-muted">${esc(metin)}</small>`;
const alanGirdi=(ozellik,deger,ph,etiket,uzun=false)=>uzun
 ?`<textarea class="ka-input" rows="2" placeholder="${esc(ph)}" aria-label="${esc(etiket)}" ${ozellik}>${esc(deger)}</textarea>`
 :`<input class="ka-input" type="text" value="${esc(deger)}" placeholder="${esc(ph)}" aria-label="${esc(etiket)}" ${ozellik} autocomplete="off">`;
const etiketli=(ad,html)=>`<label class="ka-field"><span class="ka-field__label">${esc(ad)}</span>${html}</label>`;

function duzeySecici(){
 const a=duzey();
 return`<div class="kbm-duzey" role="group" aria-label="Sınıf düzeyi">${Object.entries(V.DUZEYLER).map(([k,d])=>`<button type="button" class="ka-btn ka-btn--secondary kbm-duzey__dugme" data-kb-duzey="${k}" aria-pressed="${k===a}"><b>${esc(d.ad)}</b><small>${esc(d.aralik)}</small></button>`).join('')}</div>`;
}
function sekmeler(){
 const a=ensure().sekme;
 return`<nav class="ka-tabs kbm-sekmeler" aria-label="Kudüs Ben’im Projesi sayfaları">${SEKMELER.map(k=>`<button type="button" class="ka-tab" data-kb-git="${k}"${k===a?' aria-selected="true" aria-current="page"':''}>${esc(V.SAYFALAR[k].kisa)}</button>`).join('')}</nav>`;
}
function bilgiKarti(){
 const s=ensure(),f=(k,ad,ph)=>etiketli(ad,alanGirdi(`data-kb="${k}"`,s[k],ph,ad));
 return kart('Belgeye yazılacak bilgiler',`${not('Okul, il/ilçe, öğretmen ve müdür adı uygulamadaki kayıtlarınızdan gelir; belgelere bu hâliyle yazılır. Gerekirse buradan değiştirin.')}<div class="ka-grid">${f('okul','Okul adı','Okulun adı')}${f('ilIlce','İl / ilçe','İl / ilçe')}${f('ogretmen','Proje sorumlusu (öğretmen)','Ad Soyad')}${f('mudur','Okul müdürü','Ad Soyad')}</div>`);
}

/* ── belge önizleme ve eylemleri ── */
const belgeEylem=(tur,uid='',onizleme=false,ek='')=>{
 const mesgul=ensure().mesgul.has(`${tur}:${uid}`);
 return`<div class="kbm-eylem"><button type="button" class="ka-btn ka-btn--primary" data-kb-yazdir="${tur}" data-uid="${esc(uid)}">Yazdır / PDF</button><button type="button" class="ka-btn ka-btn--secondary" data-kb-indir="${tur}" data-uid="${esc(uid)}"${mesgul?' disabled':''}>${mesgul?'Hazırlanıyor…':'Word (.docx)'}</button>${onizleme?`<button type="button" class="ka-btn ka-btn--ghost" data-kb-buyut="${tur}">Büyüt</button>`:''}${ek}</div>`;
};
const onizlemeKarti=(tur,baslik='Önizleme')=>{
 const T=K.TURLER[tur];
 return kart(baslik,`${not(`${T.ad} · A4 ${T.yon}. Telefonda okumak için Büyüt’e dokunun; çıktıda sayfalara bölünür, her sayfada üst ve alt boşluk bırakılır.`)}
 <div class="kbm-onizle" data-kb-onizle="${tur}"><div class="kbm-onizle__sahne" data-kb-sahne><iframe class="kbm-kagit" data-kb-kagit="${tur}" title="${esc(`${T.ad} önizleme`)}"></iframe></div></div>
 ${belgeEylem(tur,'',true)}`);
};

/* ── sekmeler ── */
function nedirSekmesi(){
 const N=V.NEDIR,secili=duzey(),sira={ilkokul:[0],ortaokul:[1],ikisi:[0,1,2]}[secili]||[];
 return`<p class="kbm-giris">${esc(N.giris)}</p><div class="kbm-kutu">${esc(N.kutu)}</div>
 ${kart('Projenin gerekçesi',liste(N.gerekce.map(([k,t])=>[`${k}:`,t])))}
 ${kart('Amaç',`<p><b>Genel amaç:</b> ${esc(N.amac.genel)}</p><strong class="kbm-kart__baslik">Özel amaçlar</strong>${liste(N.amac.ozel.map(t=>['',t]))}`)}
 ${kart('Kapsam',liste(N.kapsam.map(([k,t])=>[`${k}:`,t])))}
 ${kart('Uygulama aşamaları',liste(N.asamalar.map(([k,t])=>[`${k}:`,t])))}
 ${kart('Beklenen sonuçlar',liste(N.sonuclar.map(([k,t])=>[`${k}:`,t])))}
 ${kart('İzleme ve değerlendirme',`<p>${esc(N.izleme)}</p>`)}
 ${kart('Sınıf düzeyine göre öneriler',`${not('Bu bölüm kılavuzdaki ilkelere dayanarak hazırlanmıştır. Seçili düzey işaretlidir.')}<div class="kbm-duzey-oneri">${N.duzeyOnerisi.map(([k,t],i)=>`<div class="kbm-duzey-oneri__kutu${sira.includes(i)?' kbm-duzey-oneri__kutu--secili':''}"><b>${esc(k)}</b><span>${esc(t)}</span></div>`).join('')}</div>`)}
 ${kart('Ulusal ölçekte yürütülen çalışmalar',liste(V.ULUSAL.map(([k,t])=>[`${k}:`,t])))}
 ${kart('Yasal dayanak',liste(N.yasal.map(t=>['',t])))}
 ${kaynak()}`;
}

/* Ekip ve öğrenci grubu satırları: data-kb-liste="ekip|ogrenciler" data-i data-k */
const SATIR_ALANLARI={
 ekip:[['ad','Ad Soyad'],['brans','Branş'],['gorev','Projedeki görevi']],
 ogrenciler:[['ad','Ad Soyad'],['sinif','Sınıf / şube'],['gorev','Projedeki görevi']]
};
function satirlar(liste,bos){
 const l=ensure().durum[liste];
 if(!l.length)return`<small class="ka-muted">${esc(bos)}</small>`;
 return`<div class="kbm-satirlar">${l.map((x,i)=>`<div class="kbm-satir">${SATIR_ALANLARI[liste].map(([k,ph])=>alanGirdi(`data-kb-liste="${liste}" data-i="${i}" data-k="${k}"`,x[k],ph,`${i+1}. satır: ${ph}`)).join('')}<button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-kb-sil="${liste}" data-i="${i}" aria-label="${i+1}. satırı sil">✕</button></div>`).join('')}</div>`;
}
function sinifdanEkle(){
 const s=ensure(),siniflar=B.siniflar().liste;
 if(!siniflar.length)return'';
 const sinif=siniflar.find(c=>c.id===s.sinifSec),var_=new Set(s.durum.ogrenciler.map(o=>`${o.ad}|${o.sinif}`.toLocaleLowerCase('tr')));
 const ogr=sinif?B.ogrencilerOf(sinif.id).filter(o=>!var_.has(`${o.ad}|${sinif.ad}`.toLocaleLowerCase('tr'))):[];
 return`<div class="kbm-sinifdan"><strong class="kbm-kart__baslik">Sınıf listesinden ekle</strong>
 <select class="ka-input" data-kb-sinif aria-label="Sınıf seçin"><option value="">Sınıf seçin…</option>${siniflar.map(c=>`<option value="${esc(c.id)}"${c.id===s.sinifSec?' selected':''}>${esc(c.ad)}</option>`).join('')}</select>
 ${sinif?(ogr.length?`<div class="kbm-ogrenciler">${ogr.map(o=>`<label class="ka-check"><input type="checkbox" data-kb-ogr value="${esc(o.id)}"><span>${esc(o.no?`${o.no} · `:'')}${esc(o.ad)}</span></label>`).join('')}</div>
 <div class="kbm-eylem"><button type="button" class="ka-btn ka-btn--secondary" data-kb-ogr-ekle>Seçilenleri gruba ekle</button><button type="button" class="ka-btn ka-btn--ghost" data-kb-ogr-hepsi>Tümünü seç / bırak</button></div>`:not('Bu sınıfın öğrencilerinin hepsi listede ya da sınıfta öğrenci yok.')):''}
 </div>`;
}
function ekipSekmesi(){
 const s=ensure(),benVar=s.durum.ekip.some(k=>String(k.ad).trim()&&String(k.ad).trim()===String(s.ogretmen).trim());
 return`${bilgiKarti()}
 ${kart('Proje ekibi',`${not('Proje; okul yönetimi ile Din Kültürü ve Ahlak Bilgisi zümresi tarafından yürütülür, gerekirse farklı branşlardan öğretmenler de görev alır (Kılavuz md. 5). İlk sıradaki ad belgelerde proje sorumlusu olarak yazılır; ekip boşsa yukarıdaki öğretmen adı kullanılır.')}
 ${satirlar('ekip','Henüz ekip üyesi eklenmedi.')}
 <div class="kbm-eylem"><button type="button" class="ka-btn ka-btn--secondary" data-kb-ekle="ekip">＋ Ekip üyesi ekle</button>${benVar||!s.ogretmen?'':'<button type="button" class="ka-btn ka-btn--ghost" data-kb-ben>Beni proje sorumlusu olarak ekle</button>'}</div>`)}
 ${onizlemeKarti('ekip','Görevlendirme önizlemesi')}
 ${kart('Gönüllü öğrenci grubu',`${not('Katılım gönüllülük esasına dayanır; 18 yaşından küçük öğrencilerin sosyal etkinliklere katılımında velilerinden yazılı izin alınır (Kılavuz md. 4). Liste yalnız proje çalışmaları için kullanılır ve hesabınızda saklanır.')}
 ${satirlar('ogrenciler','Henüz öğrenci eklenmedi.')}
 <div class="kbm-eylem"><button type="button" class="ka-btn ka-btn--secondary" data-kb-ekle="ogrenciler">＋ Öğrenci ekle</button></div>
 ${sinifdanEkle()}`)}
 ${onizlemeKarti('ogrenci','Öğrenci grubu önizlemesi')}`;
}
function ayKarti(ay){
 const s=ensure(),T=V.TAKVIM.aylar[ay],l=s.durum.plan[ay]||[],adlar=new Set(l.map(e=>String(e.ad).trim()));
 const dolu=l.filter(e=>String(e.ad).trim()).length;
 const satir=e=>`<div class="kbm-etk">${alanGirdi(`data-kb-etk="ad" data-uid="${esc(e.uid)}"`,e.ad,'Etkinlik adı',`${ay}: etkinlik adı`)}<input class="ka-input" type="date" value="${esc(e.iso)}" min="${YIL1}-09-01" max="${YIL2}-08-31" aria-label="${esc(`${ay}: etkinlik tarihi`)}" data-kb-etk="iso" data-uid="${esc(e.uid)}">${alanGirdi(`data-kb-etk="sorumlu" data-uid="${esc(e.uid)}"`,e.sorumlu,'Sorumlu (boşsa proje sorumlusu)',`${ay}: sorumlu`)}<button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-kb-etk-sil="${esc(e.uid)}" aria-label="${esc(`${ay}: etkinliği sil`)}">✕</button></div>`;
 const oneriler=T.oneri.map((o,i)=>adlar.has(o.ad)?'':`<button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-kb-oneri="${ay}" data-i="${i}">＋ ${esc(o.ad)}</button>`).join('');
 return kart('',`<header class="kbm-ay__bas"><strong class="kbm-kart__baslik">${esc(ay)}</strong><span class="ka-badge ${dolu>=2?'ka-badge--success':'ka-badge--warning'}">${dolu>=2?`${dolu} etkinlik`:`${dolu}/2 etkinlik`}</span></header>
 <p class="kbm-tema"><b>Tematik odak:</b> ${esc(T.tema)}</p>
 ${l.length?`<div class="kbm-etkinlikler">${l.map(satir).join('')}</div>`:not(`Örnek: ${T.ornek}`)}
 <div class="kbm-ekle">${oneriler}
 <select class="ka-input" data-kb-ay-havuz="${ay}" aria-label="${esc(`${ay}: havuzdan etkinlik ekle`)}"><option value="">Havuzdan etkinlik ekle…</option>${V.ETKINLIKLER.map(e=>`<option value="${e.id}">${esc(`${e.ikon} ${e.ad}`)}</option>`).join('')}</select>
 <button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-kb-bos="${ay}">＋ Boş satır</button></div>`,'kbm-ay');
}
function planSekmesi(){
 const s=ensure(),eksik=K.eksikAylar(s.durum),d=duzeyBilgisi();
 return`<p class="kbm-giris">${esc(V.TAKVIM.not)}</p>
 ${kart('Yıllık plan',`${not(`${d.ad} (${d.aralik}) için tek yıllık plan. Sınıf düzeyini sayfanın üstünden değiştirebilirsiniz.`)}
 ${eksik.length?`<div class="kbm-uyari">Her ay en az iki etkinlik esastır. Eksik aylar: <b>${esc(eksik.join(', '))}</b></div>`:'<div class="kbm-kutu">Her ayda en az iki etkinlik planlandı.</div>'}
 <div class="kbm-eylem"><button type="button" class="ka-btn ka-btn--secondary" data-kb-oneri-tum>Boş ayları önerilen etkinliklerle doldur</button></div>
 ${not(V.ONERI_NOTU)}`)}
 <div class="kbm-aylar">${V.AYLAR.map(ayKarti).join('')}</div>
 ${onizlemeKarti('plan','Yıllık plan önizlemesi')}`;
}
function havuzSekmesi(){
 const secili=duzey(),goster=k=>secili==='ikisi'||secili===k;
 const etkinlik=e=>`<details class="kbm-havuz"><summary><b>${esc(e.ikon)} ${esc(e.ad)}</b><small class="ka-muted"> · önerilen ay: ${esc(e.ay)} · ${esc(e.tur)}</small></summary><div class="kbm-havuz__govde">
 <p>${esc(e.kilavuz)}</p>
 <strong>Nasıl yapılır?</strong>${liste(e.adimlar.map(t=>['',t]))}
 ${goster('ilkokul')?`<p><b>İlkokul (1–4. sınıf):</b> ${esc(e.ilkokul)}</p>`:''}${goster('ortaokul')?`<p><b>Ortaokul (5–8. sınıf):</b> ${esc(e.ortaokul)}</p>`:''}
 <p><b>Beklenen ürün:</b> ${esc(e.urun)}</p><p class="kbm-dikkat"><b>Dikkat:</b> ${esc(e.dikkat)}</p>
 <div class="kbm-ekle"><select class="ka-input" data-kb-havuz-ay="${e.id}" aria-label="${esc(`${e.ad}: eklenecek ay`)}">${V.AYLAR.map(ay=>`<option value="${ay}"${ay===e.ay?' selected':''}>${ay}</option>`).join('')}</select><button type="button" class="ka-btn ka-btn--secondary" data-kb-havuz-ekle="${e.id}">Plana ekle</button></div>
 </div></details>`;
 return`<p class="kbm-giris">Kılavuzdaki etkinlik türleri. Seçtiğiniz ayın planına eklenir; ardından tarih ve sorumlu yazılır. ${esc(V.ONERI_NOTU)}</p>
 <div class="kbm-havuzlar">${V.ETKINLIKLER.map(etkinlik).join('')}</div>${kaynak()}`;
}
function ekAlanlari(tur,uid,alanlar,d){
 return`<div class="kbm-alanlar">${alanlar.map(([ad,k])=>{
  const uzun=UZUN_ALAN.has(k);
  return`<label class="ka-field${uzun?' kbm-alan--uzun':''}"><span class="ka-field__label">${esc(ad)}</span>${alanGirdi(`data-kb-ek="${tur}" data-uid="${esc(uid)}" data-k="${k}"`,d[k]??'',ad,ad,uzun)}</label>`;
 }).join('')}</div>`;
}
function formlarSekmesi(){
 const s=ensure(),c=ctx(),l=planListesi();
 const blokta=e=>{
  const ac=s.acik.has(e.uid);
  return`<details class="kbm-form" data-kb-ac="${esc(e.uid)}"${ac?' open':''}><summary><b>${esc(e.ay)} · ${esc(e.ad)}</b>${e.tarih?`<small class="ka-muted"> · ${esc(e.tarih)}</small>`:''}</summary>
  <div class="kbm-form__govde">
   <strong class="kbm-kart__baslik">EK-1 · Okul Etkinlik Planlama Formu</strong>${not('Plandaki bilgilerle ön doldurulur; değiştirdiğiniz alanlar saklanır.')}
   ${ekAlanlari('ek1',e.uid,V.EK1,K.ek1Degerleri(c,s.durum,e.uid))}
   ${belgeEylem('ek1',e.uid,false,`<button type="button" class="ka-btn ka-btn--ghost" data-kb-ek-sifirla="ek1" data-uid="${esc(e.uid)}">Plandan yeniden doldur</button>`)}
   <strong class="kbm-kart__baslik">EK-2 · Etkinlik Uygulama ve İzleme Formu</strong>${not('Etkinlikten sonra doldurulur; boş bırakılan alanlar çıktıda yazı için boş kalır.')}
   ${ekAlanlari('ek2',e.uid,V.EK2,K.ek2Degerleri(c,s.durum,e.uid))}
   ${belgeEylem('ek2',e.uid,false,`<button type="button" class="ka-btn ka-btn--ghost" data-kb-ek-sifirla="ek2" data-uid="${esc(e.uid)}">Plandan yeniden doldur</button>`)}
  </div></details>`;
 };
 return`<p class="kbm-giris">Etkinlikten önce EK-1 (planlama), etkinlikten sonra EK-2 (uygulama ve izleme) formu doldurulur. Formlar yıllık plandaki etkinliklerden ön doldurulur.</p>
 ${kart('Boş formlar',`${not('Elle doldurmak için boş EK-1 ve EK-2.')}<div class="kbm-bosformlar"><div><strong>EK-1</strong>${belgeEylem('ek1','')}</div><div><strong>EK-2</strong>${belgeEylem('ek2','')}</div></div>`)}
 ${l.length?`<div class="kbm-formlar">${l.map(blokta).join('')}</div>`:kart('Plandaki etkinlikler',not('Henüz plana etkinlik adı yazılmadı. Önce “Yıllık Plan” sekmesinden etkinlik ekleyin; formlar buraya gelir.'))}`;
}
function kagitlarSekmesi(){
 return`<p class="kbm-giris">Öğrencilerin ve öğretmenin etkinliklerde kullanacağı basılı çalışma kâğıtları. Yazdır / PDF ile alınır; her sayfada üst ve alt boşluk vardır.</p>
 <div class="kbm-kagitlar">${V.KAGITLAR.map(k=>`<article class="ka-card kbm-kagit-kart"><div class="ka-card__body"><span class="kbm-kagit-kart__ikon" aria-hidden="true">${esc(k.ikon)}</span><div class="kbm-kagit-kart__metin"><strong>${esc(k.ad)}</strong><small class="ka-muted">${esc(k.kisa)}</small></div><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-kb-kagit-yazdir="${k.id}">Yazdır / PDF</button></div></article>`).join('')}</div>${kaynak()}`;
}
const SEKME_HTML={nedir:nedirSekmesi,ekip:ekipSekmesi,plan:planSekmesi,havuz:havuzSekmesi,formlar:formlarSekmesi,kagitlar:kagitlarSekmesi};

function render(kok=document.getElementById('v2ModuleRoot'),ust=false){
 if(!kok)return false;
 const s=ensure(),y=ust?0:global.scrollY;
 varsayilanlar();
 kok.innerHTML=`<section class="kbm-page" data-kb-page="${s.sekme}">
 <header class="kbm-head"><h2>${esc(V.AD)} · ${esc(V.YIL)}</h2><p class="ka-muted">${esc(ALTYAZI)}</p></header>
 ${duzeySecici()}
 ${sekmeler()}
 ${SEKME_HTML[s.sekme]()}
 </section>`;
 baglan(kok.querySelector('[data-kb-page]'));
 cerceveleriYaz();olcekle();
 global.scrollTo?.(0,y);
 return true;
}

/* ── kâğıt önizleme: ReportEngine ile aynı belge, ayrı çerçeve (uygulama teması kâğıdın renklerini bozamaz) ── */
function cerceveYaz(frame,html,yuklenince){
 if(!frame||frame._son===html)return;
 frame._son=html;frame.onload=yuklenince;frame.srcdoc=html;
}
function cerceveleriYaz(){
 const R=global.ReportEngine,s=ensure();
 if(!R?.documentHtml)return;
 document.querySelectorAll('[data-kb-kagit]').forEach(frame=>{
  const tur=frame.dataset.kbKagit,T=K.TURLER[tur];if(!T)return;
  cerceveYaz(frame,R.documentHtml(T.ad,K.html(tur,ctx(),s.durum,''),{...CIKTI,yon:T.yon}),olcekle);
 });
}
function onizlemeYenile(){clearTimeout(kagitT);kagitT=setTimeout(cerceveleriYaz,200)}
/* A4 kâğıdı kutunun genişliğine sığdırır; Büyüt sırayla daha büyük ölçeklere (en sonda gerçek boyut, yana kaydırılır) ve yeniden sığdırmaya geçer. Çerçeve yüksekliği içeriğe uyar. */
function olcekle(){
 const s=ensure();
 document.querySelectorAll('[data-kb-onizle]').forEach(el=>{
  const tur=el.dataset.kbOnizle,T=K.TURLER[tur],frame=el.querySelector('[data-kb-kagit]'),sahne=el.querySelector('[data-kb-sahne]'),kutu=el.clientWidth;
  if(!T||!frame||!sahne||!kutu)return;
  const [gen,yuk]=KAGIT_MM[T.yon].map(PX);
  let h=yuk;
  try{const d=frame.contentDocument;h=Math.max(h,d?.documentElement?.scrollHeight||0,d?.body?.scrollHeight||0)}catch(_){}
  const sigdir=Math.min(1,kutu/gen),seviyeler=[...new Set([sigdir,Math.min(1,sigdir*BUYUTME),1].map(v=>Math.floor(v*1000)/1000))];
  if((s.seviye[tur]||0)>=seviyeler.length)s.seviye[tur]=0;
  const k=seviyeler[s.seviye[tur]||0];
  frame.style.width=`${gen}px`;frame.style.height=`${h}px`;frame.style.transform=`scale(${k})`;
  sahne.style.width=`${Math.ceil(gen*k)}px`;sahne.style.height=`${Math.ceil(h*k)}px`;
  const dugme=document.querySelector(`[data-kb-buyut="${tur}"]`);
  if(dugme){dugme.style.display=seviyeler.length<2?'none':'';dugme.textContent=(s.seviye[tur]||0)>=seviyeler.length-1?'Sığdır':'Büyüt'}
 });
}

/* ── belge eylemleri ── */
function yazdir(tur,uid=''){
 const T=K.TURLER[tur],s=ensure();
 if(!T)return false;
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 global.ReportEngine.printReport(T.ad,K.html(tur,ctx(),s.durum,uid),{...CIKTI,yon:T.yon,fileName:K.dosyaAdi(tur,ctx(),s.durum,uid).replace(/\.docx$/,'')});
 return true;
}
function kagitYazdir(id){
 const kg=V.KAGITLAR.find(x=>x.id===id);
 if(!kg)return false;
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 global.ReportEngine.printReport(kg.ad,K.kagitHtml(ctx(),kg),{...CIKTI,yon:'dikey',fileName:`Kudus_Benim_${slug(V.YIL)}_${kg.id}`});
 return true;
}
async function indir(tur,uid='',dugme=null){
 const s=ensure(),anahtar=`${tur}:${uid}`;
 if(!K.TURLER[tur]||s.mesgul.has(anahtar))return false;
 if(!global.WordBelge)await global.AppLoader?.loadScript?.('js/modules/word-belge.js?v=1');
 if(!global.WordBelge){global.toast?.('Word hazırlama bileşeni yüklenemedi.');return false}
 s.mesgul.add(anahtar);
 const yazi=dugme?.textContent;
 if(dugme){dugme.disabled=true;dugme.textContent='Hazırlanıyor…'}
 try{
  await K.wordIndir(tur,ctx(),s.durum,uid);
  global.toast?.('Belge indirildi.');
  return true;
 }catch(e){
  console.warn('[Kudüs Ben’im]',e);
  global.toast?.(String(e?.message||'').includes('Word')?e.message:'Belge indirilemedi.');
  return false;
 }finally{
  s.mesgul.delete(anahtar);
  if(dugme?.isConnected){dugme.disabled=false;dugme.textContent=yazi}
 }
}

/* ── etkileşim ── */
function sekmeDegistir(k){
 if(!SEKMELER.includes(k))return;
 ensure().sekme=k;render(undefined,true);
}
function duzeyDegistir(k){
 const s=ensure();
 if(!V.DUZEYLER[k]||duzey()===k&&s.duzey===k)return;
 s.duzey=k;kaydet();render();
}
function listeEkle(liste,satir){
 const l=ensure().durum[liste],en=liste==='ekip'?30:300;
 if(l.length>=en){global.toast?.(`En çok ${en} satır eklenebilir.`);return false}
 l.push(satir);kaydet();return true;
}
function oneriEkle(ay,i){
 const o=V.TAKVIM.aylar[ay]?.oneri[i];
 if(!o)return;
 if(etkinlikEkle(ay,o.ad,o.havuz||''))kaydet();
}
function oneriTum(){
 const s=ensure();let n=0;
 V.AYLAR.forEach(ay=>{
  if((s.durum.plan[ay]||[]).some(e=>String(e.ad).trim()))return;
  V.TAKVIM.aylar[ay].oneri.forEach(o=>{if(etkinlikEkle(ay,o.ad,o.havuz||''))n++});
 });
 if(n)kaydet();
 global.toast?.(n?`${n} etkinlik plana eklendi.`:'Boş ay yok; plan olduğu gibi kaldı.');
}
function ogrenciEkle(kok){
 const s=ensure(),sinif=B.siniflar().liste.find(c=>c.id===s.sinifSec);
 if(!sinif)return;
 const secilen=new Set([...kok.querySelectorAll('[data-kb-ogr]:checked')].map(x=>x.value)),kisiler=B.ogrencilerOf(sinif.id).filter(o=>secilen.has(o.id));
 if(!kisiler.length)return global.toast?.('Eklemek için öğrenci seçin.');
 const bos=300-s.durum.ogrenciler.length;
 kisiler.slice(0,Math.max(0,bos)).forEach(o=>s.durum.ogrenciler.push({ad:o.ad,sinif:sinif.ad,gorev:''}));
 kaydet();render();
 global.toast?.(`${Math.min(kisiler.length,Math.max(0,bos))} öğrenci eklendi.`);
}
function sonEtkinligeOdak(ay){
 const kart=[...document.querySelectorAll('.kbm-ay')].find(c=>c.querySelector('.kbm-kart__baslik')?.textContent===ay);
 [...(kart?.querySelectorAll('[data-kb-etk="ad"]')||[])].pop()?.focus?.();
}
/* Tıklama eylemleri: düğmenin data-kb-* özniteliğine göre. */
const TIKLA={
 kbGit:b=>sekmeDegistir(b.dataset.kbGit),
 kbDuzey:b=>duzeyDegistir(b.dataset.kbDuzey),
 kbEkle:b=>{if(listeEkle(b.dataset.kbEkle,b.dataset.kbEkle==='ekip'?{ad:'',brans:'',gorev:''}:{ad:'',sinif:'',gorev:''})){render();[...document.querySelectorAll(`[data-kb-liste="${b.dataset.kbEkle}"][data-k="ad"]`)].pop()?.focus?.()}},
 kbBen:()=>{const s=ensure();if(listeEkle('ekip',{ad:s.ogretmen,brans:'',gorev:'Proje Sorumlusu'}))render()},
 kbSil:b=>{ensure().durum[b.dataset.kbSil].splice(Number(b.dataset.i),1);kaydet();render()},
 kbOgrEkle:()=>ogrenciEkle(document.querySelector('[data-kb-page]')),
 kbOgrHepsi:()=>{const k=[...document.querySelectorAll('[data-kb-ogr]')],hepsi=k.every(x=>x.checked);k.forEach(x=>{x.checked=!hepsi})},
 kbOneri:b=>{oneriEkle(b.dataset.kbOneri,Number(b.dataset.i));render()},
 kbOneriTum:()=>{oneriTum();render()},
 kbBos:b=>{if(etkinlikEkle(b.dataset.kbBos,'')){kaydet();render();sonEtkinligeOdak(b.dataset.kbBos)}},
 kbEtkSil:b=>{etkinlikSil(b.dataset.kbEtkSil);kaydet();render()},
 kbHavuzEkle:b=>{
  const e=V.etkinlik(b.dataset.kbHavuzEkle),ay=document.querySelector(`[data-kb-havuz-ay="${b.dataset.kbHavuzEkle}"]`)?.value||e?.ay;
  if(e&&V.AYLAR.includes(ay)&&etkinlikEkle(ay,e.ad,e.id)){kaydet();global.toast?.(`${ay} planına eklendi.`)}
 },
 kbEkSifirla:b=>{delete ensure().durum[b.dataset.kbEkSifirla][b.dataset.uid];kaydet();render()},
 kbYazdir:b=>yazdir(b.dataset.kbYazdir,b.dataset.uid||''),
 kbIndir:b=>indir(b.dataset.kbIndir,b.dataset.uid||'',b),
 kbBuyut:b=>{const s=ensure(),t=b.dataset.kbBuyut;s.seviye[t]=(s.seviye[t]||0)+1;olcekle()},
 kbKagitYazdir:b=>kagitYazdir(b.dataset.kbKagitYazdir)
};
function tikla(e){
 const b=e.target.closest('button');
 if(!b||b.disabled)return;
 const anahtar=Object.keys(TIKLA).find(k=>k in b.dataset);
 if(anahtar)TIKLA[anahtar](b);
}
function girdi(e){
 const el=e.target,d=el.dataset,s=ensure();
 if(d.kb){s[d.kb]=String(el.value??'');s.elle[d.kb]=true;kaydet();onizlemeYenile();return}
 if(d.kbListe){
  const x=s.durum[d.kbListe]?.[Number(d.i)];
  if(x&&d.k in x){x[d.k]=String(el.value??'');kaydet();onizlemeYenile()}
  return;
 }
 if(d.kbEtk){
  const b=etkinlikBul(d.uid);
  if(!b)return;
  if(d.kbEtk==='iso'){b.e.iso=/^\d{4}-\d{2}-\d{2}$/.test(el.value)?el.value:'';b.e.tarih=tarihYaz(b.e.iso)}
  else b.e[d.kbEtk]=String(el.value??'');
  kaydet();onizlemeYenile();
  return;
 }
 if(d.kbEk){
  const t=s.durum[d.kbEk];
  if(!t||!EK_ALANLARI[d.kbEk].has(d.k)||!etkinlikBul(d.uid))return;
  (t[d.uid]||(t[d.uid]={}))[d.k]=String(el.value??'');
  kaydet();
 }
}
function degisti(e){
 const el=e.target,d=el.dataset,s=ensure();
 if(d.kbSinif!==undefined){s.sinifSec=el.value;render();return}
 if(d.kbAyHavuz){
  const eh=V.etkinlik(el.value);
  if(eh&&etkinlikEkle(d.kbAyHavuz,eh.ad,eh.id)){kaydet();render()}
  else el.value='';
  return;
 }
 if(d.kbEtk==='iso')girdi(e);
}
function baglan(kap){
 if(!kap)return;
 kap.addEventListener('click',tikla);
 kap.addEventListener('input',girdi);
 kap.addEventListener('change',degisti);
 kap.querySelectorAll('details[data-kb-ac]').forEach(el=>el.addEventListener('toggle',()=>{const a=ensure().acik;el.open?a.add(el.dataset.kbAc):a.delete(el.dataset.kbAc)}));
}

function temizle(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];clearTimeout(kagitT)}
/* sekme: 'nedir' | 'ekip' | 'plan' | 'havuz' | 'formlar' | 'kagitlar' (bilinmeyen anahtar → nedir) */
function open(sekme='nedir'){
 S=blank(SEKMELER.includes(sekme)?sekme:'nedir');
 temizle();
 const r=oku(global.KaPrefs?.get?.(ANAHTAR,''));
 if(r)uygula(r);
 const ok=render();
 const boyut=()=>olcekle();global.addEventListener('resize',boyut);unsubs.push(()=>global.removeEventListener('resize',boyut));
 const uzak=global.KaPrefs?.remoteListen?.(uzakGeldi);if(uzak)unsubs.push(uzak);
 B.abonelik().forEach(p=>{
  const u=global.AppStore?.subscribe?.(p,()=>{
   const kok=document.querySelector('[data-kb-page]');if(!kok)return temizle();
   /* Veri sonradan geldiyse (senkron) yalnız değişiklik varsa yeniden çiz; yazarken odak kaybolmasın. */
   if(varsayilanlar()&&!kok.contains(document.activeElement))render();
  });
  if(u)unsubs.push(u);
 });
 B.hazirla().catch(e=>console.warn('[Kudüs Ben’im]',e?.message||e));
 return ok;
}

global.KudusBenimModule={open,render,indir,yazdir,kagitYazdir,ctx,duzey,reset:()=>{S=null;temizle()}};
})(window);
