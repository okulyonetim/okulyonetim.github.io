/* Koruk Asistan — Kudüs Ben’im Projesi belgeleri: yıllık plan (A4 yatay), proje ekibi görevlendirme, gönüllü öğrenci grubu listesi, EK-1, EK-2 ve çalışma kâğıtları.
 * - Her belge iki biçimde üretilir: kâğıt HTML’i (sayfadaki önizleme ve ReportEngine çıktısı aynıdır; stil: css/design-system-base.css “.ka-report .kbp-*”)
 *   ve Word metni (WordBelge ile gerçek Word; şablon dosyası yoktur). İkisi de aynı modelden yazılır.
 * - Müdür ad / imza alanı sağda, kendi bloğunda ortalıdır; öğretmen (proje sorumlusu) imzası solda.
 * - Model: ctx = {okul, ilIlce, ogretmen, mudur, duzey}; durum = {ekip, ogrenciler, plan, ek1, ek2} (kudus-benim.js, KaPrefs ile saklanır).
 */
(function(global){
'use strict';
if(global.KudusBenimBelge)return;
const V=global.KudusBenimVeri;
if(!V)throw new Error('Kudüs Ben’im belgeleri için içerik verisi yüklenmedi.');

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const buyuk=s=>String(s||'').toLocaleUpperCase('tr');
const TARIH_BOS='…… / …… / 20……';
const NOKTA='……………………………';
const dolu=v=>String(v??'').trim();
const duzeyAdi=ctx=>(V.DUZEYLER[ctx.duzey]||V.DUZEYLER.ortaokul);
const okulBasligi=ctx=>dolu(ctx.okul)||NOKTA;

/* ── model yardımcıları ── */
const bosDurum=()=>({ekip:[],ogrenciler:[],plan:{},ek1:{},ek2:{}});
function planSatirlari(durum){
 return V.AYLAR.map(ay=>({ay,tema:V.TAKVIM.aylar[ay].tema,ornek:V.TAKVIM.aylar[ay].ornek,etkinlikler:(durum.plan?.[ay]||[]).filter(e=>dolu(e.ad))}));
}
const etkinlikSayisi=durum=>planSatirlari(durum).reduce((a,s)=>a+s.etkinlikler.length,0);
/* “Her ay en az iki etkinlik”: eksik ayların listesi */
const eksikAylar=durum=>planSatirlari(durum).filter(s=>s.etkinlikler.length<2).map(s=>s.ay);
function planEtkinligi(durum,uid){
 for(const ay of V.AYLAR){const e=(durum.plan?.[ay]||[]).find(x=>x.uid===uid);if(e)return{...e,ay}}
 return null;
}
const sorumluAdi=(ctx,durum)=>dolu(durum.ekip?.find(k=>dolu(k.ad))?.ad)||dolu(ctx.ogretmen);
const sorumluUnvani=(ctx,durum)=>{const k=durum.ekip?.find(x=>dolu(x.ad));return dolu(k?.gorev)||'Proje Sorumlusu'};
/* Etkinliğin sorumlusu: etkinlikte yazılı ad, yoksa proje sorumlusu (ekibin ilk üyesi ya da öğretmen). */
const etkinlikSorumlusu=(ctx,durum,e)=>dolu(e?.sorumlu)||sorumluAdi(ctx,durum);

/* EK-1 / EK-2: plandaki etkinlikten önceden doldurulan değerler; kullanıcının elle yazdıkları (durum.ek1[uid]) üstüne biner. */
function ek1Varsayilan(ctx,durum,e){
 const h=e?V.etkinlik(e.havuz):null,gorevliler=(durum.ekip||[]).map(k=>dolu(k.ad)).filter(Boolean).filter(a=>a!==sorumluAdi(ctx,durum));
 return{
  okul:dolu(ctx.okul),ilIlce:dolu(ctx.ilIlce),ad:e?dolu(e.ad):'',tema:e?V.TAKVIM.aylar[e.ay]?.tema||'':'',tur:h?h.tur:'',tarih:e?dolu(e.tarih):'',yer:e?'Okulumuz':'',
  hedef:e?duzeyAdi(ctx).sinif:'',katilimci:'',sorumlu:e?etkinlikSorumlusu(ctx,durum,e):'',gorevli:e?gorevliler.join(', '):'',
  ogrenciGrubu:e&&(durum.ogrenciler||[]).some(o=>dolu(o.ad))?`Gönüllü öğrenci grubu (${durum.ogrenciler.filter(o=>dolu(o.ad)).length} öğrenci)`:'',
  paydas:'',butce:e?'Okul imkânları':'',izin:'',veliIzni:e?'Evet; 18 yaşından küçük öğrenciler için velinin yazılı izni alınır.':'',ozelGereksinim:'',
  guvenlik:h?h.dikkat:'',materyal:'',urun:h?h.urun:''
 };
}
function ek2Varsayilan(ctx,durum,e){return{ad:e?dolu(e.ad):'',tarih:e?dolu(e.tarih):''}}
const ekDegerleri=(varsayilan,ozel)=>{const o={...varsayilan};Object.entries(ozel||{}).forEach(([k,v])=>{if(v!==undefined&&v!==null)o[k]=String(v)});return o};
const ek1Degerleri=(ctx,durum,uid)=>ekDegerleri(ek1Varsayilan(ctx,durum,planEtkinligi(durum,uid)),durum.ek1?.[uid]);
const ek2Degerleri=(ctx,durum,uid)=>ekDegerleri(ek2Varsayilan(ctx,durum,planEtkinligi(durum,uid)),durum.ek2?.[uid]);

/* ── kâğıt HTML’i ── */
const ust=(ctx,baslik,alt='')=>`<header class="kbp-ust"><small>${esc(V.YIL)} EĞİTİM-ÖĞRETİM YILI</small><div class="kbp-okul">${esc(buyuk(okulBasligi(ctx)))}</div><h1 class="kbp-baslik">${esc(baslik)}</h1>${alt?`<div class="kbp-alt">${esc(alt)}</div>`:''}</header>`;
const imzalar=(sol,mudur,ibare)=>`<div class="kbp-imzalar"><div class="kbp-imza"><span>${sol.ad?esc(sol.ad):NOKTA}</span><b>${esc(sol.unvan)}</b></div><div class="kbp-imza kbp-imza--mudur"><b>${esc(ibare)}</b><span>${TARIH_BOS}</span><span>${mudur?esc(mudur):NOKTA}</span><b>Okul Müdürü</b></div></div>`;
const kutular=(ogeler)=>`<div class="kbp-bilgi">${ogeler.map(([k,v])=>`<div class="kbp-kutu"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>`;
const belge=(icerik,yon='dikey')=>`<div class="kbp-belge kbp-belge--${yon}">${icerik}</div>`;
const bosHucre=(n)=>Array.from({length:n},()=>'<td></td>').join('');

function yillikPlanHtml(ctx,durum){
 const d=duzeyAdi(ctx),satirlar=planSatirlari(durum).map(s=>{
  const n=Math.max(1,s.etkinlikler.length),ilk=s.etkinlikler[0];
  const ek=e=>e?`<td>${esc(e.ad)}</td><td>${esc(e.tarih||'')}</td><td>${esc(etkinlikSorumlusu(ctx,durum,e))}</td>`:`<td class="kbp-soluk">${esc(s.ornek)} <small>(örnek; planlanmadı)</small></td><td></td><td></td>`;
  let h=`<tr><td class="kbp-ay" rowspan="${n}">${esc(s.ay)}</td><td rowspan="${n}">${esc(s.tema)}</td>${ek(ilk)}</tr>`;
  for(let i=1;i<n;i++)h+=`<tr>${ek(s.etkinlikler[i])}</tr>`;
  return h;
 }).join('');
 return belge(`${ust(ctx,`${V.AD.toLocaleUpperCase('tr')} YILLIK UYGULAMA PLANI`,`${d.ad} (${d.aralik})`)}
 ${kutular([['SINIF DÜZEYİ',d.ad],['PLANLANAN ETKİNLİK',`${etkinlikSayisi(durum)} etkinlik`],['PROJE SORUMLUSU',sorumluAdi(ctx,durum)||NOKTA]])}
 <table class="kbp-tablo kbp-tablo--plan"><colgroup><col><col><col><col><col></colgroup><thead><tr><th>AY</th><th>TEMATİK ODAK</th><th>ETKİNLİK</th><th>TARİH</th><th>SORUMLU ÖĞRETMEN</th></tr></thead><tbody>${satirlar}</tbody></table>
 <p class="kbp-not">Her ay en az iki etkinlik yapılması esastır (Kılavuz md. 5). Tematik odak ve örnekler kılavuzun örnek yıllık takvimindendir; etkinlik tarihleri okulun takvimine göre belirlenir.</p>
 ${imzalar({ad:sorumluAdi(ctx,durum),unvan:sorumluUnvani(ctx,durum)},ctx.mudur,'OLUR')}`,'yatay');
}
const EKIP_SATIR=8,OGRENCI_SATIR=15;
function ekipHtml(ctx,durum){
 const k=(durum.ekip||[]).filter(x=>dolu(x.ad)||dolu(x.brans)||dolu(x.gorev)),n=Math.max(EKIP_SATIR,k.length);
 const satir=(x,i)=>`<tr><td class="kbp-no">${i+1}</td><td>${esc(x?.ad||'')}</td><td>${esc(x?.brans||'')}</td><td>${esc(x?.gorev||'')}</td><td></td></tr>`;
 return belge(`${ust(ctx,'KUDÜS BEN’İM PROJESİ EKİBİ GÖREVLENDİRMESİ')}
 <p class="kbp-metin">${esc(V.YIL)} eğitim-öğretim yılında okulumuzda yürütülen “Kudüs Ben’im” Projesi kapsamında, aşağıda adı geçen öğretmenler proje ekibi olarak görevlendirilmiştir.</p>
 <table class="kbp-tablo"><colgroup><col><col><col><col><col></colgroup><thead><tr><th>SIRA</th><th>ADI SOYADI</th><th>BRANŞI / GÖREVİ</th><th>PROJEDEKİ GÖREVİ</th><th>İMZA</th></tr></thead><tbody>${Array.from({length:n},(_,i)=>satir(k[i],i)).join('')}</tbody></table>
 <p class="kbp-not">Proje; okul yönetimi ile Din Kültürü ve Ahlak Bilgisi zümresi tarafından yürütülür, gerekirse farklı branşlardan öğretmenler de görev alabilir (Kılavuz md. 5).</p>
 ${imzalar({ad:sorumluAdi(ctx,durum),unvan:sorumluUnvani(ctx,durum)},ctx.mudur,'UYGUNDUR')}`);
}
function ogrenciHtml(ctx,durum){
 const o=(durum.ogrenciler||[]).filter(x=>dolu(x.ad)||dolu(x.sinif)||dolu(x.gorev)),n=Math.max(OGRENCI_SATIR,o.length);
 const satir=(x,i)=>`<tr><td class="kbp-no">${i+1}</td><td>${esc(x?.ad||'')}</td><td>${esc(x?.sinif||'')}</td><td>${esc(x?.gorev||'')}</td><td></td></tr>`;
 return belge(`${ust(ctx,'KUDÜS BEN’İM PROJESİ GÖNÜLLÜ ÖĞRENCİ GRUBU',`${duzeyAdi(ctx).ad} (${duzeyAdi(ctx).aralik})`)}
 <table class="kbp-tablo"><colgroup><col><col><col><col><col></colgroup><thead><tr><th>SIRA</th><th>ADI SOYADI</th><th>SINIFI / ŞUBESİ</th><th>PROJEDEKİ GÖREVİ</th><th>VELİ İZNİ</th></tr></thead><tbody>${Array.from({length:n},(_,i)=>satir(o[i],i)).join('')}</tbody></table>
 <p class="kbp-not">Katılım gönüllülük esasına dayanır; 18 yaşından küçük öğrencilerin sosyal etkinliklere katılımında velilerinden yazılı izin alınır (Kılavuz md. 4). Öğrenci listesi yalnız proje çalışmaları için kullanılır.</p>
 ${imzalar({ad:sorumluAdi(ctx,durum),unvan:sorumluUnvani(ctx,durum)},ctx.mudur,'UYGUNDUR')}`);
}
function ekFormHtml(ctx,durum,baslik,alanlar,degerler,sutunBasligi,uid,etkinlik,genis=false){
 const e=etkinlik,alt=e?`${e.ay} · ${e.ad}`:'';
 return belge(`${ust(ctx,baslik,alt)}
 <table class="kbp-tablo kbp-tablo--form${genis?' kbp-tablo--genis':''}"><colgroup><col><col></colgroup><thead><tr><th>ALAN</th><th>${esc(sutunBasligi)}</th></tr></thead><tbody>${alanlar.map(([ad,k])=>`<tr><td class="kbp-alan">${esc(ad)}</td><td>${esc(degerler[k]||'')}</td></tr>`).join('')}</tbody></table>
 ${imzalar({ad:sorumluAdi(ctx,durum),unvan:sorumluUnvani(ctx,durum)},ctx.mudur,'UYGUNDUR')}`);
}
const ek1Html=(ctx,durum,uid)=>ekFormHtml(ctx,durum,'EK-1: OKUL ETKİNLİK PLANLAMA FORMU',V.EK1,ek1Degerleri(ctx,durum,uid),'BİLGİ',uid,planEtkinligi(durum,uid));
const ek2Html=(ctx,durum,uid)=>ekFormHtml(ctx,durum,'EK-2: ETKİNLİK UYGULAMA VE İZLEME FORMU',V.EK2,ek2Degerleri(ctx,durum,uid),'AÇIKLAMA',uid,planEtkinligi(durum,uid),true);

function kagitBlogu(b){
 if(b.t==='yonerge')return`<p class="kbp-yonerge">${esc(b.m)}</p>`;
 if(b.t==='alan')return`<div class="kbp-ciz"><b>${esc(b.ad)}</b>${Array.from({length:b.satir},()=>'<i></i>').join('')}</div>`;
 if(b.t==='kontrol')return`<ul class="kbp-kontrol">${b.maddeler.map(m=>`<li><span aria-hidden="true">☐</span> ${esc(m)}</li>`).join('')}</ul>`;
 const bas=`<thead><tr>${b.sutunlar.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead>`;
 if(b.t==='tablo')return`<table class="kbp-tablo kbp-tablo--kagit">${bas}<tbody>${Array.from({length:b.satir},()=>`<tr>${bosHucre(b.sutunlar.length)}</tr>`).join('')}</tbody></table>`;
 if(b.t==='dolu')return`<table class="kbp-tablo kbp-tablo--kagit">${bas}<tbody>${b.satirlar.map(r=>`<tr>${r.map(h=>`<td>${esc(h)}</td>`).join('')}</tr>`).join('')}${Array.from({length:b.bos||0},()=>`<tr>${bosHucre(b.sutunlar.length)}</tr>`).join('')}</tbody></table>`;
 return'';
}
function kagitHtml(ctx,kagit){
 return belge(`${ust(ctx,kagit.ad.toLocaleUpperCase('tr'))}<div class="kbp-kimlik">${kagit.kimlik.map(k=>`<span>${esc(k)}: ${'…'.repeat(14)}</span>`).join('')}</div>${kagit.bloklar.map(kagitBlogu).join('')}`);
}

/* ── Word ── */
function wordHazir(){const W=global.WordBelge;if(!W)throw new Error('Word paketleyici yüklenemedi.');return W}
function wBaslik(W,ctx,baslik,alt){
 const {par,calis}=W;
 return[par(calis(`${V.YIL} EĞİTİM-ÖĞRETİM YILI`,{sz:19}),{al:'center',kutu:true}),par(calis(buyuk(okulBasligi(ctx)),{b:true}),{al:'center',kutu:true}),par(calis(baslik,{b:true,sz:26}),{al:'center',kutu:true}),alt?par(calis(alt,{b:true,sz:21}),{al:'center',kutu:true}):''].join('');
}
function wImza(W,yatay,sol,mudur,ibare){
 const {par,calis}=W,orta={al:'center'};
 const s=par(calis(sol.ad||NOKTA),{sonraki:true})+par(calis(sol.unvan,{b:true}),{once:20});
 const m=par(calis(ibare,{b:true}),{...orta,sonraki:true})+par(calis(TARIH_BOS),{...orta,sonraki:true,once:20})+par(calis(mudur||NOKTA),{...orta,sonraki:true,once:20})+par(calis('Okul Müdürü',{b:true}),{...orta,once:20});
 return W.imzaSatiri(yatay,s,m);
}
function wTablo(W,genislikler,basliklar,satirlar,sz=19){
 const {par,calis,hucre,tablo}=W;
 const bas=basliklar.map((b,i)=>hucre(genislikler[i],par(calis(b,{b:true,sz:18}),{al:'center'}),{zemin:'D9D9D9'})).join('');
 const g=satirlar.map(r=>r.map((x,i)=>hucre(genislikler[i],par(calis(x||'',{sz}),{al:i===0&&String(x||'').length<4?'center':'left'}),{dikey:'center'})).join(''));
 return tablo(genislikler,[bas,...g],{baslik:true});
}
function planWord(ctx,durum){
 const W=wordHazir(),{par,calis,hucre,tablo,bosPar}=W,d=duzeyAdi(ctx),gen=[1300,3000,5000,2300,2970];
 const bas=['AY','TEMATİK ODAK','ETKİNLİK','TARİH','SORUMLU ÖĞRETMEN'].map((b,i)=>hucre(gen[i],par(calis(b,{b:true,sz:18}),{al:'center'}),{zemin:'D9D9D9'})).join('');
 const satirlar=[bas];
 planSatirlari(durum).forEach(s=>{
  const n=Math.max(1,s.etkinlikler.length);
  for(let i=0;i<n;i++){
   const e=s.etkinlikler[i],ilk=i===0,vm=n>1?(ilk?'basla':'devam'):'';
   const ay=hucre(gen[0],ilk?par(calis(s.ay,{b:true,sz:17}),{al:'center'}):par(''),{dikeyBirlestir:vm}),tema=hucre(gen[1],ilk?par(calis(s.tema,{sz:17})):par(''),{dikeyBirlestir:vm});
   const ek=e?[e.ad,e.tarih||'',etkinlikSorumlusu(ctx,durum,e)]:[`${s.ornek} (örnek; planlanmadı)`,'',''];
   satirlar.push(ay+tema+ek.map((x,j)=>hucre(gen[2+j],par(calis(x,{sz:17,i:!e,renk:e?'':'666666'})))).join(''));
  }
 });
 const govde=[wBaslik(W,ctx,`${V.AD.toLocaleUpperCase('tr')} YILLIK UYGULAMA PLANI`,`${d.ad} (${d.aralik})`),bosPar(80),tablo(gen,satirlar,{baslik:true,dar:true}),
  par(calis('Her ay en az iki etkinlik yapılması esastır (Kılavuz md. 5). Tematik odak ve örnekler kılavuzun örnek yıllık takvimindendir; etkinlik tarihleri okulun takvimine göre belirlenir.',{sz:16,i:true}),{once:80}),
  bosPar(200),wImza(W,true,{ad:sorumluAdi(ctx,durum),unvan:sorumluUnvani(ctx,durum)},ctx.mudur,'OLUR')].join('');
 return{govde,yatay:true};
}
function listeWord(ctx,durum,baslik,alt,basliklar,satirlar,notMetni,ibare){
 const W=wordHazir(),{par,calis,bosPar}=W,gen=[800,3200,2300,2338,1000];
 const govde=[wBaslik(W,ctx,baslik,alt),bosPar(120),wTablo(W,gen,basliklar,satirlar),par(calis(notMetni,{sz:17,i:true}),{once:120}),bosPar(360),wImza(W,false,{ad:sorumluAdi(ctx,durum),unvan:sorumluUnvani(ctx,durum)},ctx.mudur,ibare)].join('');
 return{govde,yatay:false};
}
function ekipWord(ctx,durum){
 const k=(durum.ekip||[]).filter(x=>dolu(x.ad)||dolu(x.brans)||dolu(x.gorev)),n=Math.max(EKIP_SATIR,k.length);
 const W=wordHazir(),{par,calis}=W,r=listeWord(ctx,durum,'KUDÜS BEN’İM PROJESİ EKİBİ GÖREVLENDİRMESİ','',['SIRA','ADI SOYADI','BRANŞI / GÖREVİ','PROJEDEKİ GÖREVİ','İMZA'],Array.from({length:n},(_,i)=>[String(i+1),k[i]?.ad||'',k[i]?.brans||'',k[i]?.gorev||'','']),
  'Proje; okul yönetimi ile Din Kültürü ve Ahlak Bilgisi zümresi tarafından yürütülür, gerekirse farklı branşlardan öğretmenler de görev alabilir (Kılavuz md. 5).','UYGUNDUR');
 /* açıklama paragrafı başlığın altına eklenir */
 const giris=par(calis(`${V.YIL} eğitim-öğretim yılında okulumuzda yürütülen “Kudüs Ben’im” Projesi kapsamında, aşağıda adı geçen öğretmenler proje ekibi olarak görevlendirilmiştir.`,{sz:21}),{al:'both',once:160,sonra:120});
 const i=r.govde.indexOf('<w:tbl>');
 return{govde:r.govde.slice(0,i)+giris+r.govde.slice(i),yatay:false};
}
function ogrenciWord(ctx,durum){
 const o=(durum.ogrenciler||[]).filter(x=>dolu(x.ad)||dolu(x.sinif)||dolu(x.gorev)),n=Math.max(OGRENCI_SATIR,o.length);
 return listeWord(ctx,durum,'KUDÜS BEN’İM PROJESİ GÖNÜLLÜ ÖĞRENCİ GRUBU',`${duzeyAdi(ctx).ad} (${duzeyAdi(ctx).aralik})`,['SIRA','ADI SOYADI','SINIFI / ŞUBESİ','PROJEDEKİ GÖREVİ','VELİ İZNİ'],Array.from({length:n},(_,i)=>[String(i+1),o[i]?.ad||'',o[i]?.sinif||'',o[i]?.gorev||'','']),
  'Katılım gönüllülük esasına dayanır; 18 yaşından küçük öğrencilerin sosyal etkinliklere katılımında velilerinden yazılı izin alınır (Kılavuz md. 4). Öğrenci listesi yalnız proje çalışmaları için kullanılır.','UYGUNDUR');
}
function ekWord(ctx,durum,baslik,alanlar,degerler,sutun,etkinlik){
 const W=wordHazir(),{par,calis,hucre,tablo,bosPar}=W,gen=[3600,6038];
 const bas=[hucre(gen[0],par(calis('ALAN',{b:true,sz:20}),{al:'center'}),{zemin:'D9D9D9'}),hucre(gen[1],par(calis(sutun,{b:true,sz:20}),{al:'center'}),{zemin:'D9D9D9'})].join('');
 const sat=alanlar.map(([ad,k])=>hucre(gen[0],par(calis(ad,{sz:20})))+hucre(gen[1],par(calis(degerler[k]||'',{sz:20}))));
 const govde=[wBaslik(W,ctx,baslik,etkinlik?`${etkinlik.ay} · ${etkinlik.ad}`:''),bosPar(120),tablo(gen,[bas,...sat],{baslik:true}),bosPar(360),wImza(W,false,{ad:sorumluAdi(ctx,durum),unvan:sorumluUnvani(ctx,durum)},ctx.mudur,'UYGUNDUR')].join('');
 return{govde,yatay:false};
}
const ek1Word=(ctx,durum,uid)=>ekWord(ctx,durum,'EK-1: OKUL ETKİNLİK PLANLAMA FORMU',V.EK1,ek1Degerleri(ctx,durum,uid),'BİLGİ',planEtkinligi(durum,uid));
const ek2Word=(ctx,durum,uid)=>ekWord(ctx,durum,'EK-2: ETKİNLİK UYGULAMA VE İZLEME FORMU',V.EK2,ek2Degerleri(ctx,durum,uid),'AÇIKLAMA',planEtkinligi(durum,uid));

/* Belge türleri: ad, dosya adı, kâğıt yönü ve üreticiler. uid: EK-1/EK-2 için plandaki etkinlik (boş: boş form). */
const dosyaKok=(ctx)=>`Kudus_Benim_${String(V.YIL).replace('-','_')}`;
const TURLER={
 plan:{ad:'Yıllık Uygulama Planı',yon:'yatay',html:yillikPlanHtml,word:planWord,dosya:()=>'Yillik_Uygulama_Plani'},
 ekip:{ad:'Proje Ekibi Görevlendirme',yon:'dikey',html:ekipHtml,word:ekipWord,dosya:()=>'Proje_Ekibi_Gorevlendirme'},
 ogrenci:{ad:'Gönüllü Öğrenci Grubu Listesi',yon:'dikey',html:ogrenciHtml,word:ogrenciWord,dosya:()=>'Gonullu_Ogrenci_Grubu'},
 ek1:{ad:'EK-1 Okul Etkinlik Planlama Formu',yon:'dikey',html:ek1Html,word:ek1Word,dosya:(c,d,uid)=>`EK1_${dosyaEki(d,uid)}`},
 ek2:{ad:'EK-2 Etkinlik Uygulama ve İzleme Formu',yon:'dikey',html:ek2Html,word:ek2Word,dosya:(c,d,uid)=>`EK2_${dosyaEki(d,uid)}`}
};
function dosyaEki(durum,uid){const e=planEtkinligi(durum,uid);return e?String(e.ad).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i').replace(/[^0-9A-Za-z]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40)||'Etkinlik':'Bos_Form'}
const html=(tur,ctx,durum,uid)=>TURLER[tur].html(ctx,durum,uid);
const dosyaAdi=(tur,ctx,durum,uid)=>`${dosyaKok(ctx)}_${TURLER[tur].dosya(ctx,durum,uid)}.docx`;
async function wordIndir(tur,ctx,durum,uid){
 const t=TURLER[tur];if(!t)throw new Error('Bilinmeyen belge.');
 const W=wordHazir(),{govde,yatay}=t.word(ctx,durum,uid);
 await W.indir(govde,dosyaAdi(tur,ctx,durum,uid),{yatay});
 return true;
}

global.KudusBenimBelge={TURLER,bosDurum,planSatirlari,etkinlikSayisi,eksikAylar,planEtkinligi,ek1Degerleri,ek2Degerleri,ek1Varsayilan,ek2Varsayilan,html,kagitHtml,dosyaAdi,wordIndir,
 yillikPlanHtml,ekipHtml,ogrenciHtml,ek1Html,ek2Html,planWord,ekipWord,ogrenciWord,ek1Word,ek2Word,sorumluAdi,sorumluUnvani,etkinlikSorumlusu,TARIH_BOS,NOKTA};
})(window);
