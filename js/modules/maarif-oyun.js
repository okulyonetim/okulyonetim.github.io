/* Koruk Asistan — Projeler › Maarif'in Kalbinde Oyun
 * Dört sayfa (her biri Projeler menüsünde ayrı satır): Maarif'in Kalbinde Oyun nedir · Ayın Oyunları (20 oyun, nasıl oynanır) · İlkokul yıllık planı · Ortaokul yıllık planı.
 * Yıllık plan sayfaları: sayfada A4 önizleme, Yazdır / PDF (ReportEngine) ve Word indirme; okul, öğretmen ve müdür adı uygulamadan yazılır, imza bölümü özelleştirilir
 * (imza sahipleri ve onay bloğu; hesabın tercih belgesinde KaPrefs ile saklanır, önizleme · PDF · Word aynı düzeni kullanır). Word, Öğretmen Dosyası'nın hazır formlarıyla aynı şablon ve indirme yoludur (OgretmenDosyasi.formKaydet).
 * İçerik: maarif-oyun-veri.js · plan belgesi ve imza mantığı: maarif-oyun-plan.js. Ekran stili: css/design-system-base.css (.mok-*, kâğıt .mpl-*).
 */
(function(global){
'use strict';
if(global.MaarifOyunModule)return;
const V=global.MaarifOyunVeri,MP=global.MaarifOyunPlan,B=global.SinifBaglam;
if(!V||!MP||!B)throw new Error('Maarif’in Kalbinde Oyun için gerekli bileşenler yüklenmedi.');

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {rows,adBicimi,adSoyad,teacherId,okulMuduru,okulAdi}=B;
/* Sayfa anahtarı → AppNav sayfa kimliği (menüdeki satır). */
const KIMLIK={nedir:'oyun-nedir',oyunlar:'oyun-aylik',ilkokul:'oyun-ilkokul',ortaokul:'oyun-ortaokul'};
const ALTYAZI='Maarif’in Kalbinde Oyun: ayın oyunları (20 geleneksel oyun), ilkokul ve ortaokul yıllık planları (önizleme, PDF ve Word).';
const A4_GENISLIK=297*96/25.4,A4_YUKSEKLIK=210*96/25.4; /* A4 yatay kâğıt, CSS pikseli (1 in = 96 px) */
const BUYUTME=1.8; /* Büyüt: sığdırma ölçeğinin 1,8 katı; sonra gerçek boyut (kâğıt yana kaydırılır) */
/* Önizleme ve PDF aynı belgeyi (ReportEngine.documentHtml) aynı seçeneklerle kullanır; her sayfada 10 mm üst / alt boşluk. */
const CIKTI={yon:'yatay',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' ',akis:true,kenarBosluk:10,ozellestirilebilir:false};
const DUZEY={nedir:0,oyunlar:0,ilkokul:1,ortaokul:5};

let S=null,unsubs=[],bekleyen={},pushT=0,kagitT=0;

/* ── belge bilgisi: uygulamadan gelir, ekranda değiştirilebilir ── */
function ogretmenAdi(){
 const t=rows('ogretmenler').find(x=>String(x.id)===String(teacherId())),u=B.user();
 return adBicimi(adSoyad(t)||String(u.adSoyad||u.ad||u.displayName||'').trim());
}
const blank=sayfa=>({sayfa,okul:'',ogretmen:'',mudur:'',elle:{},mesgul:new Set(),imza:{},imzaT:{},seviye:0});
const ensure=()=>S||(S=blank('nedir'));
/* Elle değiştirilmeyen alanları veriden doldurur; değişen bir şey olduysa true. */
function varsayilanlar(){
 const s=ensure(),once=JSON.stringify([s.okul,s.ogretmen,s.mudur]);
 if(!s.elle.okul)s.okul=okulAdi(DUZEY[s.sayfa]||0);
 if(!s.elle.ogretmen)s.ogretmen=ogretmenAdi();
 if(!s.elle.mudur)s.mudur=okulMuduru();
 return once!==JSON.stringify([s.okul,s.ogretmen,s.mudur]);
}
/* Plan başına okul adı: ortak okullarda kademeye ait ad; okul adı elle yazıldıysa o. */
const planOkulu=plan=>{const s=ensure();return s.elle.okul?s.okul:okulAdi(V.PLANLAR[plan].duzey)};

/* ── imza düzeni: yıl + plan başına, yerelde ve hesapta (KaPrefs); en yeni zaman damgası geçerli ── */
const slug=v=>String(v||'').replace(/[^0-9A-Za-z]+/g,'_').replace(/^_+|_+$/g,'');
const imzaAnahtar=plan=>`maarifOyunImza_${slug(V.YIL)}_${plan}`;
function imzaOku(plan,j){let x=null;try{x=JSON.parse(j||'null')}catch(_){}return{imza:MP.imzaTemizle(plan,x),t:Number(x?.t)||0}}
function imzaYukle(){
 const s=ensure();
 Object.keys(V.PLANLAR).forEach(p=>{const r=imzaOku(p,global.KaPrefs?.get?.(imzaAnahtar(p),''));s.imza[p]=r.imza;s.imzaT[p]=r.t});
}
function imzaKaydet(plan){
 const s=ensure(),t=s.imzaT[plan]=Date.now(),a=imzaAnahtar(plan),j=JSON.stringify({...s.imza[plan],t});
 global.KaPrefs?.set?.(a,j);
 bekleyen[a]=j;clearTimeout(pushT);
 pushT=setTimeout(()=>{const b=bekleyen;bekleyen={};global.KaPrefs?.remoteSet?.(b)},700);
}
/* Başka cihazdaki daha yeni imza düzeni gelirse yerelin yerine geçer. */
function uzakGeldi(x){
 if(!document.querySelector('[data-mok-page]'))return temizle();
 const s=ensure();let degisti=false;
 Object.keys(V.PLANLAR).forEach(p=>{
  const a=imzaAnahtar(p),j=x?.[a];if(!j)return;
  const r=imzaOku(p,j);
  if(r.t>(s.imzaT[p]||0)){s.imza[p]=r.imza;s.imzaT[p]=r.t;global.KaPrefs?.set?.(a,j);degisti=true}
 });
 if(degisti&&!document.querySelector('[data-mok-page]').contains(document.activeElement))render();
}
const imzaDuzeni=plan=>{const s=ensure();return s.imza[plan]||(s.imza[plan]=MP.varsayilanImza(plan))};
/* Belge modeli: okul, plan hazırlayan ve imza düzeni (null adlar uygulamadan gelen adla doldurulur). */
function model(plan){
 const s=ensure();
 return{okul:planOkulu(plan),ogretmen:s.ogretmen,imza:MP.imzaCozumle(imzaDuzeni(plan),{ogretmen:s.ogretmen,mudur:s.mudur})};
}

/* ── ekran parçaları ── */
const kart=(baslik,icerik,sinif='')=>`<article class="ka-card mok-kart${sinif?` ${sinif}`:''}"><div class="ka-card__body ka-stack">${baslik?`<strong class="mok-kart__baslik">${esc(baslik)}</strong>`:''}${icerik}</div></article>`;
const liste=maddeler=>`<ul class="mok-liste">${maddeler.map(([k,t])=>`<li>${k?`<b>${esc(k)}</b> `:''}${esc(t)}</li>`).join('')}</ul>`;
const tablo=(basliklar,satirlar)=>`<div class="ka-table-wrap mok-tablo"><table class="ka-table"><thead><tr>${basliklar.map(b=>`<th>${esc(b)}</th>`).join('')}</tr></thead><tbody>${satirlar.join('')}</tbody></table></div>`;
const kaynak=()=>`<p class="mok-kaynak">${esc(V.KAYNAK)}</p>`;

function sekmeler(){
 const a=ensure().sayfa;
 return`<nav class="ka-tabs mok-sekmeler" aria-label="Maarif’in Kalbinde Oyun sayfaları">${Object.keys(KIMLIK).map(k=>`<button type="button" class="ka-tab" data-mok-git="${k}"${k===a?' aria-selected="true" aria-current="page"':''}>${esc(V.SAYFALAR[k].kisa)}</button>`).join('')}</nav>`;
}
function bilgiKarti(){
 const s=ensure(),f=(k,ad,ph)=>`<label class="ka-field"><span class="ka-field__label">${esc(ad)}</span><input class="ka-input" type="text" value="${esc(s[k])}" placeholder="${esc(ph)}" data-mok="${k}" autocomplete="off"></label>`;
 return kart('Belgeye yazılacak bilgiler',`<small class="ka-muted">Okul, öğretmen ve müdür adı uygulamadaki kayıtlarınızdan gelir; önizlemeye, PDF’ye ve Word’e bu hâliyle yazılır. Gerekirse buradan değiştirin.</small><div class="ka-grid">${f('okul','Okul adı','Okul adı')}${f('ogretmen','Planı hazırlayan öğretmen','Ad SOYAD')}${f('mudur','Okul müdürü','Ad SOYAD')}</div>`);
}
function belgeSatiri(plan){
 const p=V.PLANLAR[plan],mesgul=ensure().mesgul.has(plan);
 return`<div class="mok-belge"><span class="mok-rozet" aria-hidden="true">WORD</span><div class="mok-belge__metin"><strong>${esc(p.ad)}</strong><small class="ka-muted">${esc(p.not)}</small></div><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-mok-indir="${plan}"${mesgul?' disabled':''}>${mesgul?'Hazırlanıyor…':'İndir'}</button></div>`;
}
const belgeKarti=(baslik,planlar)=>kart(baslik,planlar.map(belgeSatiri).join(''),'mok-belgeler');

/* ── yıllık plan: imza düzenleyici ve A4 önizleme ── */
const imzaOnizle=()=>`<div class="mok-imza-onizle"><iframe class="mok-imza-cerceve" data-mok-imza-onizle title="İmza bölümü önizlemesi"></iframe></div>`;
function imzaKarti(plan){
 const im=imzaDuzeni(plan),cz=model(plan).imza,o=im.onay;
 const girdi=(ozellik,deger,ph,etiket,en,tur='text')=>`<input class="ka-input" type="${tur}" value="${esc(deger)}" placeholder="${esc(ph)}" aria-label="${esc(etiket)}"${en?` maxlength="${en}"`:''} ${ozellik} autocomplete="off">`;
 const satir=(_,i)=>`<div class="mok-imza-satir">${girdi(`data-mok-imza="ad" data-i="${i}"`,cz.imzalar[i].ad,'Ad SOYAD',`${i+1}. imza: ad soyad`,MP.AD_ENCOK)}${girdi(`data-mok-imza="unvan" data-i="${i}"`,cz.imzalar[i].unvan,'Unvan',`${i+1}. imza: unvan`,MP.UNVAN_ENCOK)}<span class="mok-imza-islem"><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-mok-imza-yer="${i}" data-yon="-1" aria-label="Yukarı taşı"${i===0?' disabled':''}>↑</button><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-mok-imza-yer="${i}" data-yon="1" aria-label="Aşağı taşı"${i===im.imzalar.length-1?' disabled':''}>↓</button><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-mok-imza-sil="${i}" aria-label="İmzayı sil">×</button></span></div>`;
 const f=(ad,html)=>`<label class="ka-field"><span class="ka-field__label">${esc(ad)}</span>${html}</label>`;
 const onay=`<div class="mok-onay"><label class="ka-check"><input type="checkbox" data-mok-onay-goster${o.goster?' checked':''}><span>Onay bloğu yazılsın (okul müdürü)</span></label>${o.goster?`<div class="ka-grid">${f('Onay ibaresi',girdi('data-mok-onay="etiket" list="mokOnayIbare"',o.etiket,'UYGUNDUR','Onay ibaresi',MP.ETIKET_ENCOK))}${f('Tarih',girdi('data-mok-onay="tarih"',o.tarih,'','Onay tarihi',0,'date'))}${f('Ad soyad',girdi('data-mok-onay="ad"',cz.onay.ad,'Ad SOYAD','Onay: ad soyad',MP.AD_ENCOK))}${f('Unvan',girdi('data-mok-onay="unvan"',o.unvan,'Okul Müdürü','Onay: unvan',MP.UNVAN_ENCOK))}</div><datalist id="mokOnayIbare"><option value="UYGUNDUR"></option><option value="OLUR"></option><option value="ONAY"></option></datalist><small class="ka-muted">Tarih seçmezseniz kâğıtta “…… / 09 / ${esc(MP.PLAN[plan].ust.slice(0,4))}” gibi elle yazılacak biçimde kalır.</small>`:''}</div>`;
 return kart('İmza bölümü',`<small class="ka-muted">İmza sahiplerini ekleyip silebilir, sıralayabilirsiniz; adı boş bıraktığınız imza noktalı çizgiyle çıkar. Onay bloğunun ibaresini ve tarihini değiştirebilirsiniz. Önizleme, PDF ve Word’de aynı düzen kullanılır; düzeniniz hesabınıza kaydedilir.</small>
 <div class="mok-imza-liste">${im.imzalar.length?im.imzalar.map(satir).join(''):'<small class="ka-muted">İmza sahibi yok; aşağıdan ekleyin.</small>'}</div>
 <div class="mok-eylem"><button type="button" class="ka-btn ka-btn--secondary" data-mok-imza-ekle${im.imzalar.length>=MP.ENCOK_IMZA?' disabled':''}>＋ İmza ekle</button><button type="button" class="ka-btn ka-btn--ghost" data-mok-imza-sifirla>Varsayılan düzene dön</button></div>
 ${onay}<strong class="mok-kart__baslik">İmza bölümü önizlemesi</strong>${imzaOnizle()}`,'mok-imzalar');
}
function onizlemeKarti(plan){
 const s=ensure(),mesgul=s.mesgul.has(plan);
 return kart('Önizleme',`<small class="ka-muted">${esc(MP.PLAN[plan].alt)} · A4 yatay. Telefonda okumak için Büyüt’e dokunun; çıktıda sayfalara bölünür, tablo başlığı her sayfada tekrarlanır.</small>
 <div class="mok-onizle" data-mok-onizle><div class="mok-onizle__sahne" data-mok-sahne><iframe class="mok-kagit" data-mok-kagit title="${esc(`${V.PLANLAR[plan].ad} önizleme`)}"></iframe></div></div>
 <div class="mok-eylem"><button type="button" class="ka-btn ka-btn--primary" data-mok-yazdir="${plan}">Yazdır / PDF</button><button type="button" class="ka-btn ka-btn--secondary" data-mok-indir="${plan}"${mesgul?' disabled':''}>${mesgul?'Hazırlanıyor…':'Word indir'}</button><button type="button" class="ka-btn ka-btn--ghost" data-mok-buyut>Büyüt</button></div>`,'mok-onizleme');
}

/* ── sayfalar ── */
function nedirSayfasi(){
 const N=V.NEDIR;
 return`<p class="mok-giris">${esc(N.giris)}</p><div class="mok-kutu">${esc(N.kutu)}</div>
 ${N.bolumler.map(b=>kart(b.baslik,liste(b.maddeler.map(([k,t])=>[k?`${k}:`:'',t])))).join('')}
 ${bilgiKarti()}${belgeKarti('Bu bölümün belgeleri',['ilkokul','ortaokul'])}${kaynak()}`;
}
function oyunSatiri(o){
 return`<tr><td class="mok-nw">${esc(o.tarih)}<br><small class="ka-muted">${esc(o.sinif)}. sınıf</small></td><td><b>${esc(o.ad)}</b><br><small class="ka-muted">${esc(o.alan)}</small></td><td>${esc(o.gun)}</td></tr>`;
}
function oyunDetay(o){
 return`<details class="mok-oyun"><summary><b>${o.no}. ${esc(o.ad)}</b><small class="ka-muted"> · ${esc(o.tarih)} · ${esc(o.sinif)}. sınıf · ${esc(o.sure)}</small></summary><div class="mok-oyun__govde"><p><b>Araç-gereç:</b> ${esc(o.arac)} · <b>Alan:</b> ${esc(o.alan)}</p><p>${esc(o.nasil)}</p><p class="mok-guvenlik"><b>Güvenlik:</b> ${esc(o.guvenlik)}</p></div></details>`;
}
function oyunlarSayfasi(){
 const Y=V.SAYISMACA,D=V.DEGERLENDIRME;
 return`<p class="mok-giris">${esc(V.YIL)} eğitim-öğretim yılının her ayına iki geleneksel çocuk oyunu: toplam ${V.OYUNLAR.length} oyun. Oyunlar MEB Temel Eğitim Genel Müdürlüğünün “Yüz Yüze 100 Çocuk Oyunu” kitabından ilkokula uygun olanlar arasından seçildi; mevsime, belirli gün ve haftalara ve tatillere göre yerleştirildi.</p>
 <div class="mok-kutu">${esc(V.TAKVIM_NOTU)}</div>
 ${V.DONEMLER.map(d=>kart(`${d.ad} (${d.aralik}) · ${V.oyunlarDonem(d.no).length} oyun`,tablo(['Tarih · Sınıf','Oyun · Alan','Belirli gün / tema'],V.oyunlarDonem(d.no).map(oyunSatiri)))).join('')}
 <h3 class="mok-ara">Oyunlar kısaca nasıl oynanır?</h3>
 <div class="mok-oyunlar">${V.OYUNLAR.map(oyunDetay).join('')}</div>
 ${kart('Sayışmaca tekerlemeleri',`<p>${esc(Y.giris)}</p>${Y.tekerlemeler.map(t=>`<p class="mok-tekerleme">${esc(t)}</p>`).join('')}<small class="ka-muted">${esc(Y.not)}</small>`)}
 ${kart('Oyun sonrası öğretmen değerlendirmesi',`${liste(D.maddeler.map(t=>['',t]))}<small class="ka-muted">${esc(D.not)}</small>`)}
 ${kaynak()}`;
}
function ilkokulSayfasi(){
 const I=V.ILKOKUL;
 return`<h3 class="mok-ara">İlkokul Yıllık Çalışma Planı</h3><p class="mok-giris">${esc(I.giris)}</p>
 ${bilgiKarti()}${imzaKarti('ilkokul')}${onizlemeKarti('ilkokul')}
 ${kart('Aylara göre özet',tablo(['Ay','Haftalık oyunlardan örnekler','Ayın geleneksel oyunları'],I.ozet.map(([ay,ornek])=>`<tr><td class="mok-nw"><b>${esc(ay)}</b></td><td>${esc(ornek)}</td><td>${esc(V.oyunlarAy(ay).map(o=>o.ad).join(' · '))}</td></tr>`)))}
 ${kart('Belgeyi okulunuza uyarlarken',liste(I.uyarlama))}
 <p class="mok-kaynak">Oyunların kısa anlatımı: <button type="button" class="mok-baglanti" data-mok-git="oyunlar">Ayın Oyunları</button></p>${kaynak()}`;
}
function ortaokulSayfasi(){
 const O=V.ORTAOKUL;
 return`<h3 class="mok-ara">Ortaokul Yıllık Tema ve Oyun Planı</h3><p class="mok-giris">${esc(O.giris)}</p>
 ${bilgiKarti()}${imzaKarti('ortaokul')}${onizlemeKarti('ortaokul')}
 ${kart('Yıllık tema planı',tablo(['Ay · Tema','Örnek oyun / etkinlik ve amaç','Önerilen geleneksel oyun · belirli gün'],O.tema.map(([ay,tema,ornek,amac,gelenek])=>`<tr><td><b>${esc(ay)}</b><br>${esc(tema)}</td><td>${esc(ornek)}<br><small class="ka-muted">${esc(amac)}</small></td><td>${esc(gelenek)}</td></tr>`)))}
 ${kart('Uygulama esasları',liste(O.esaslar))}
 <p class="mok-kaynak">Oyunların kısa anlatımı: <button type="button" class="mok-baglanti" data-mok-git="oyunlar">Ayın Oyunları</button></p>${kaynak()}`;
}
const SAYFA_HTML={nedir:nedirSayfasi,oyunlar:oyunlarSayfasi,ilkokul:ilkokulSayfasi,ortaokul:ortaokulSayfasi};

function render(kok=document.getElementById('v2ModuleRoot')){
 if(!kok)return false;
 const s=ensure(),y=global.scrollY;
 varsayilanlar();
 kok.innerHTML=`<section class="mok-page" data-mok-page="${s.sayfa}">
 <header class="mok-head"><h2>${esc(V.SAYFALAR[s.sayfa].ad)}</h2><p class="ka-muted">${esc(ALTYAZI)}</p></header>
 ${sekmeler()}
 ${SAYFA_HTML[s.sayfa]()}
 </section>`;
 baglan(kok);
 cerceveleriYaz();olcekle();
 global.scrollTo?.(0,y);
 return true;
}

/* ── etkileşim ── */
function git(sayfa){
 const t=global.AppNav?.tool?.(KIMLIK[sayfa]);
 if(!t)return global.toast?.('Sayfa açılamadı.');
 Promise.resolve(global.ShellUI?.routeModule?.(t.route,{page:t.page,title:t.label})).catch(()=>global.toast?.('Sayfa açılamadı.'));
}
async function indir(plan){
 const s=ensure(),p=V.PLANLAR[plan];
 if(!p||s.mesgul.has(plan))return false;
 if(!global.OgretmenDosyasi?.formKaydet)await global.AppLoader?.loadScript?.('js/modules/ogretmen-dosyasi.js?v=6');
 if(!global.OgretmenDosyasi?.formKaydet){global.toast?.('Word hazırlama bileşeni yüklenemedi.');return false}
 s.mesgul.add(plan);render();
 try{
  const imza=model(plan).imza;
  const ok=await global.OgretmenDosyasi.formKaydet(p.form,'docx',{okul:planOkulu(plan),ad:s.ogretmen,mudur:s.mudur,xmlDonustur:xml=>MP.imzaTablosunuDegistir(xml,imza)});
  if(ok)global.toast?.('Plan indirildi.');
  return ok;
 }catch(e){console.warn('[Maarif’in Kalbinde Oyun]',e);global.toast?.(String(e?.message||'').startsWith('Form dosyası')||String(e?.message||'').includes('Word')?e.message:'Plan indirilemedi.');return false}
 finally{s.mesgul.delete(plan);if(document.querySelector('[data-mok-page]'))render()}
}
/* Kâğıt ve imza özeti, yazdırma çıktısıyla aynı stil dosyasını kullanan ayrı çerçevelerde çizilir: uygulamanın tema stilleri (koyu tema dâhil) kâğıdın renklerini bozamaz. */
function cerceveYaz(frame,html,yuklenince){
 if(!frame||frame._son===html)return;
 frame._son=html;frame.onload=yuklenince;frame.srcdoc=html;
}
function imzaBelgesi(plan){
 const iz=MP.imzaHtml(model(plan).imza);
 return`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${esc(global.ReportEngine.styleUrl())}"></head><body><div class="mpl-belge">${iz||'<small>İmza bölümü boş.</small>'}</div></body></html>`;
}
function cerceveleriYaz(){
 const plan=ensure().sayfa,R=global.ReportEngine;
 if(!MP.PLAN[plan]||!R?.documentHtml)return;
 cerceveYaz(document.querySelector('[data-mok-kagit]'),R.documentHtml(V.PLANLAR[plan].ad,MP.belge(plan,model(plan)),CIKTI),olcekle);
 const ozet=document.querySelector('[data-mok-imza-onizle]');
 cerceveYaz(ozet,imzaBelgesi(plan),()=>{try{ozet.style.height=`${ozet.contentDocument.body.scrollHeight}px`}catch(_){}});
}
/* İmza düzenleyici ve önizlemeler yerinde yenilenir: yazarken alan odağı kaybolmaz (kâğıt, yazma durunca güncellenir). */
function onizlemeYenile(){
 const plan=ensure().sayfa;if(!MP.PLAN[plan])return;
 /* Uygulamadan gelen (elle yazılmamış) adlar alanlarda da güncel görünür. */
 const cz=model(plan).imza,im=imzaDuzeni(plan);
 document.querySelectorAll('[data-mok-imza="ad"]').forEach(el=>{if(im.imzalar[Number(el.dataset.i)]?.ad==null&&el!==document.activeElement)el.value=cz.imzalar[Number(el.dataset.i)].ad});
 const oad=document.querySelector('[data-mok-onay="ad"]');if(oad&&im.onay.ad==null&&oad!==document.activeElement)oad.value=cz.onay.ad;
 clearTimeout(kagitT);kagitT=setTimeout(cerceveleriYaz,200);
}
/* A4 kâğıdı kutunun genişliğine sığdırır; Büyüt sırayla daha büyük ölçeklere (en sonda gerçek boyut, yana kaydırılır) ve yeniden sığdırmaya geçer. Çerçeve yüksekliği içeriğe uyar. */
function olcekle(){
 const s=ensure();
 document.querySelectorAll('[data-mok-onizle]').forEach(el=>{
  const frame=el.querySelector('[data-mok-kagit]'),sahne=el.querySelector('[data-mok-sahne]'),kutu=el.clientWidth;
  if(!frame||!sahne||!kutu)return;
  let h=A4_YUKSEKLIK;
  try{const d=frame.contentDocument;h=Math.max(h,d?.documentElement?.scrollHeight||0,d?.body?.scrollHeight||0)}catch(_){}
  const sigdir=Math.min(1,kutu/A4_GENISLIK),seviyeler=[...new Set([sigdir,Math.min(1,sigdir*BUYUTME),1].map(v=>Math.floor(v*1000)/1000))];
  if(s.seviye>=seviyeler.length)s.seviye=0;
  const k=seviyeler[s.seviye];
  frame.style.height=`${h}px`;frame.style.transform=`scale(${k})`;
  sahne.style.width=`${Math.ceil(A4_GENISLIK*k)}px`;sahne.style.height=`${Math.ceil(h*k)}px`;
  const dugme=document.querySelector('[data-mok-buyut]');if(dugme)dugme.textContent=s.seviye>=seviyeler.length-1?'Sığdır':'Büyüt';
 });
}
function yazdir(plan){
 const P=V.PLANLAR[plan];
 if(!P||!MP.PLAN[plan])return false;
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 const ad=String(ensure().ogretmen||'').trim();
 global.ReportEngine.printReport(P.ad,MP.belge(plan,model(plan)),{...CIKTI,fileName:`Maarif Oyun Yillik Plan ${plan==='ilkokul'?'Ilkokul':'Ortaokul'}${ad?` ${ad}`:''}`});
 return true;
}
function imzaDegistir(fn){const plan=ensure().sayfa;fn(imzaDuzeni(plan),plan);imzaKaydet(plan)}
function baglan(kok){
 kok.querySelectorAll('[data-mok]').forEach(el=>el.addEventListener('input',()=>{const s=ensure(),k=el.dataset.mok;s[k]=String(el.value??'');s.elle[k]=true;onizlemeYenile()}));
 kok.querySelectorAll('[data-mok-imza]').forEach(el=>el.addEventListener('input',()=>{imzaDegistir(d=>{const g=d.imzalar[Number(el.dataset.i)];if(g)g[el.dataset.mokImza]=String(el.value??'')});onizlemeYenile()}));
 kok.querySelectorAll('[data-mok-onay]').forEach(el=>['input','change'].forEach(o=>el.addEventListener(o,()=>{imzaDegistir(d=>{d.onay[el.dataset.mokOnay]=String(el.value??'')});onizlemeYenile()})));
 kok.querySelector('[data-mok-onay-goster]')?.addEventListener('change',e=>{imzaDegistir(d=>{d.onay.goster=e.target.checked});render(kok)});
 kok.querySelector('[data-mok-imza-ekle]')?.addEventListener('click',()=>{
  imzaDegistir((d,plan)=>{if(d.imzalar.length<MP.ENCOK_IMZA)d.imzalar.push({ad:'',unvan:MP.PLAN[plan].imzaUnvan})});
  render(kok);const son=[...kok.querySelectorAll('[data-mok-imza="ad"]')].pop();son?.focus?.();
 });
 kok.querySelectorAll('[data-mok-imza-sil]').forEach(b=>b.addEventListener('click',()=>{imzaDegistir(d=>{d.imzalar.splice(Number(b.dataset.mokImzaSil),1)});render(kok)}));
 kok.querySelectorAll('[data-mok-imza-yer]').forEach(b=>b.addEventListener('click',()=>{
  imzaDegistir(d=>{const i=Number(b.dataset.mokImzaYer),j=i+Number(b.dataset.yon);if(d.imzalar[i]&&d.imzalar[j])[d.imzalar[i],d.imzalar[j]]=[d.imzalar[j],d.imzalar[i]]});
  render(kok);
 }));
 kok.querySelector('[data-mok-imza-sifirla]')?.addEventListener('click',()=>{
  const s=ensure(),plan=s.sayfa;s.imza[plan]=MP.varsayilanImza(plan);imzaKaydet(plan);render(kok);global.toast?.('İmza düzeni varsayılana döndü.');
 });
 kok.querySelectorAll('[data-mok-yazdir]').forEach(b=>b.addEventListener('click',()=>yazdir(b.dataset.mokYazdir)));
 kok.querySelector('[data-mok-buyut]')?.addEventListener('click',()=>{ensure().seviye+=1;olcekle()});
 kok.querySelectorAll('[data-mok-git]').forEach(b=>b.addEventListener('click',()=>git(b.dataset.mokGit)));
 kok.querySelectorAll('[data-mok-indir]').forEach(b=>b.addEventListener('click',()=>indir(b.dataset.mokIndir)));
}

function temizle(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];clearTimeout(kagitT)}
/* sayfa: 'nedir' | 'oyunlar' | 'ilkokul' | 'ortaokul' (bilinmeyen anahtar → nedir) */
function open(sayfa='nedir'){
 const k=V.SAYFALAR[sayfa]?sayfa:'nedir';
 /* Aynı oturumda sayfalar arasında geçerken elle yazılan belge bilgisi korunur. */
 const onceki=S;S=blank(k);if(onceki){S.elle=onceki.elle;['okul','ogretmen','mudur'].forEach(a=>{if(onceki.elle[a])S[a]=onceki[a]})}
 temizle();
 imzaYukle();
 const ok=render();
 const boyut=()=>olcekle();global.addEventListener('resize',boyut);unsubs.push(()=>global.removeEventListener('resize',boyut));
 const uzak=global.KaPrefs?.remoteListen?.(uzakGeldi);if(uzak)unsubs.push(uzak);
 B.abonelik().forEach(p=>{
  const u=global.AppStore?.subscribe?.(p,()=>{
   const kok=document.querySelector('[data-mok-page]');if(!kok)return temizle();
   /* Veri sonradan geldiyse (senkron) yalnız değişiklik varsa yeniden çiz; yazarken odak kaybolmasın. */
   if(varsayilanlar()&&!kok.contains(document.activeElement))render();
  });
  if(u)unsubs.push(u);
 });
 B.hazirla().catch(e=>console.warn('[Maarif’in Kalbinde Oyun]',e?.message||e));
 return ok;
}

global.MaarifOyunModule={open,render,indir,yazdir,git,model,reset:()=>{S=null;temizle()}};
})(window);
