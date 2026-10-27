/* Koruk Asistan — Sınıf Rehberlik
 * Sınıfı seçin: Yıllık plan (ay ay; "yapıldı" + tarih işaretlenir) · Raporlar (aylık, I./II. dönem sonu, yıl sonu; plandaki işaretlerden dolar) · Kazanımlar.
 * Plan ve kazanım verisi rehberlik-veri.js'te, mantık rehberlik-core.js'te, kâğıt çıktıları rehberlik-belge.js'tedir.
 * Takip durumu hesabın tercih belgesinde (KaPrefs → oy_kullaniciTercihleri/{uid}) eğitim yılı ve sınıf başına tutulur; telefon ve bilgisayar aynı durumu görür.
 * Okul, sınıf, öğrenci ve öğretmen / müdür adları uygulamadan (sinif-baglam.js) gelir. Stil: css/design-system-base.css (.rhb-*).
 */
(function(global){
'use strict';
if(global.RehberlikModule)return;
if(!global.SinifBaglam||!global.RehberlikCore||!global.RehberlikBelge||!global.RehberlikVeri)throw new Error('Sınıf Rehberlik bileşenleri yüklenmeden açılamaz.');

const SB=global.SinifBaglam,C=global.RehberlikCore,B=global.RehberlikBelge,esc=B.esc;
const toast=m=>global.toast?.(m);
const SEKMELER=[['plan','Yıllık Plan'],['rapor','Raporlar'],['kazanim','Kazanımlar']];
const TURLER=[['aylik','Aylık'],['donem1','I. Dönem Sonu'],['donem2','II. Dönem Sonu'],['yil','Yıl Sonu']];
const HAFTALAR=[1,2,3,4,5];
const EK_KOLEKSIYON=['veliGorusmeleri'];       // Veli Görüşme Formu kayıtları raporlara yazılır

const S={sinifId:'',duzey:0,sekme:'plan',tur:'aylik',ay:'',hepsi:false,acik:'',acikAy:new Set(),ogretmen:'',mudur:'',durum:null,yil:'',kazAcik:new Set()};
let mounted=false,bagli=false,unsubs=[],offPrefs=null,pushT=0,yazT=0;

/* ── bağlam ── */
const sinif=()=>SB.sinifBul(S.sinifId);
const duzeyi=()=>{const c=sinif();return c?SB.duzeyOf(c.ad):0};
const bugun=()=>C.bugun();
function bugunAy(){
 const n=new Date().getMonth()+1,e=Object.entries(C.AY_NO).find(([,v])=>v===n);
 return e?e[0]:n===8?'EYLÜL':'HAZİRAN';
}
function ctx(){
 const c=sinif(),duzey=duzeyi();
 return{yil:S.yil,okul:SB.okulAdi(duzey),sinif:c?.ad||'',duzey,ogretmen:S.ogretmen,mudur:S.mudur,mevcut:C.mevcut(c?SB.ogrencilerOf(c.id):[]),tarih:bugun()};
}
const plan=()=>C.planOlustur(S.duzey,S.durum,S.yil);
const formKayitlari=()=>SB.veliGorusmeleri(sinif());   // Veli Görüşme Formu kayıtları (bu sınıf)

/* ── durum: yerelde KaPrefs, hesapta oy_kullaniciTercihleri ── */
const anahtar=()=>C.durumAnahtari(S.yil,S.sinifId);
function yerelOku(){try{return C.durumTemizle(JSON.parse(global.KaPrefs?.get?.(anahtar(),'')||'null'))}catch(_){return C.bosDurum()}}
function yerelYaz(){global.KaPrefs?.set?.(anahtar(),JSON.stringify(S.durum))}
function uzagaYaz(){clearTimeout(pushT);pushT=setTimeout(()=>{global.KaPrefs?.remoteSet?.({[anahtar()]:JSON.stringify(S.durum)})},700)}
function kaydet(){yerelYaz();uzagaYaz()}
/* Yazarken her tuşta değil, kısa bir duraklamadan sonra kaydeder. */
function kaydetGec(){clearTimeout(yazT);yazT=setTimeout(kaydet,400)}
function uzakGeldi(x){
 if(!mounted||!document.querySelector('[data-rhb-page]'))return temizle();
 const j=x?.[anahtar()];if(!j||!S.sinifId)return;
 let r;try{r=C.durumTemizle(JSON.parse(j))}catch(_){return}
 const m=C.durumBirlestir(S.durum,r);
 if(!C.durumAyni(m,r))uzagaYaz();
 if(!C.durumAyni(m,S.durum)){S.durum=m;yerelYaz();render()}
}
function temizle(){offPrefs?.();offPrefs=null;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];mounted=false}

/* ── yazdırma / indirme ── */
const BELGE_ADI={plan:'Sınıf Rehberlik Planı',aylik:'Aylık Çalışma Raporu',donem1:'I. Dönem Sonu Çalışma Raporu',donem2:'II. Dönem Sonu Çalışma Raporu',yil:'Yıl Sonu Faaliyet Raporu',kazanim:'Rehberlik Kazanımları'};
function belgeHtml(tur){
 const c=ctx(),p=tur==='kazanim'?null:plan();
 if(tur==='plan')return B.planBelgesi(p,c);
 if(tur==='aylik')return B.aylikBelge(C.aylikRapor(p,S.ay,S.durum,{hepsi:S.hepsi,veliGorusmeleri:formKayitlari()}),c);
 if(tur==='donem1'||tur==='donem2')return B.donemBelgesi(C.donemRaporu(p,tur==='donem1'?1:2,{hepsi:S.hepsi}),c);
 if(tur==='yil')return B.yilSonuBelgesi(C.yilSonuRaporu(p,S.durum,{veliGorusmeleri:formKayitlari()}),c);
 if(tur==='kazanim')return B.kazanimBelgesi(c.duzey,c);
 return'';
}
function yazdir(tur){
 if(!S.duzey)return toast('Önce sınıfı seçin.');
 if(!global.ReportEngine?.printReport)return toast('Rapor motoru hazır değil.');
 const c=ctx(),ek=tur==='aylik'?` ${C.ayAdi(S.ay)}`:'';
 global.ReportEngine.printReport(`${BELGE_ADI[tur]}${ek}`,belgeHtml(tur),{fileName:`${BELGE_ADI[tur]}${ek} ${c.sinif}`.trim(),yon:tur==='plan'||tur==='kazanim'?'yatay':'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' ',akis:true,kenarBosluk:10});
}
async function indir(tur){
 if(!S.duzey)return toast('Önce sınıfı seçin.');
 try{
  if(!global.RehberlikDosya)await global.AppLoader?.loadScript?.('js/modules/rehberlik-dosya.js?v=3');
  if(!global.RehberlikDosya)throw new Error('İndirme bileşeni yüklenemedi.');
  await global.RehberlikDosya.indir(tur,{ctx:ctx(),plan:plan(),durum:S.durum,ay:S.ay,hepsi:S.hepsi,veliGorusmeleri:formKayitlari()});
  toast('Dosya indirildi.');
 }catch(e){console.warn('[Sınıf Rehberlik/indir]',e);toast(String(e?.message||'Dosya indirilemedi.'))}
}

/* ── ortak parçalar ── */
const field=(label,html)=>`<label class="ka-field"><span class="ka-field__label">${esc(label)}</span>${html}</label>`;
const secenekler=(liste,sec)=>liste.map(([k,ad])=>`<option value="${esc(k)}" ${String(k)===String(sec)?'selected':''}>${esc(ad)}</option>`).join('');
const ayAdlari=()=>global.RehberlikVeri.aylar.map(a=>[a,C.ayAdi(a)]);
const kisaTarih=iso=>{const m=/^\d{4}-(\d{2})-(\d{2})$/.exec(iso||'');return m?`${Number(m[2])} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][Number(m[1])-1]}`:''};
const dugme=(act,ad,ek='',sinif='ka-btn--secondary')=>`<button type="button" class="ka-btn ${sinif}" data-rhb-act="${act}" ${ek}>${ad}</button>`;
const cikti=(tur,indirVar=true)=>`<div class="rhb-cikti">${dugme('yazdir','🖨 Yazdır / PDF',`data-rhb-tur="${tur}"`,'')}${indirVar?dugme('indir',tur==='plan'?'⬇ Excel indir':'⬇ Word indir',`data-rhb-tur="${tur}"`):''}</div>`;

/* ── sınıf seçimi ── */
function sinifKarti(){
 const{liste,own}=SB.siniflar(),opt=c=>`<option value="${esc(c.id)}" ${c.id===S.sinifId?'selected':''}>${esc(c.ad)}</option>`;
 const benim=liste.filter(c=>own.has(c.id)),digerleri=liste.filter(c=>!own.has(c.id)),gruplu=benim.length&&digerleri.length;
 const secici=`<select class="ka-input" data-rhb-alan="sinifId"><option value="">${liste.length?'Seçiniz':'Kayıtlı sınıf yok'}</option>${gruplu?`<optgroup label="Sınıflarım">${benim.map(opt).join('')}</optgroup><optgroup label="Diğer sınıflar">${digerleri.map(opt).join('')}</optgroup>`:liste.map(opt).join('')}</select>`;
 const c=sinif(),n=c?SB.ogrencilerOf(c.id).length:0,uyari=c&&!S.duzey?'Rehberlik planı 1–8. sınıflar içindir; bu sınıfın adından düzey anlaşılamadı (örn. “5/A”).':'';
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-grid">${field('Sınıf / şube',secici)}${S.duzey?field('Sınıf rehber öğretmeni',`<input class="ka-input" type="text" value="${esc(S.ogretmen)}" data-rhb-alan="ogretmen" placeholder="Adı Soyadı" autocomplete="off">`)+field('Okul müdürü',`<input class="ka-input" type="text" value="${esc(S.mudur)}" data-rhb-alan="mudur" placeholder="Adı Soyadı" autocomplete="off">`):''}</div>${uyari?`<small class="ka-muted">${esc(uyari)}</small>`:c?`<small class="ka-muted">${n?`${n} öğrenci uygulamadaki listeden gelir.`:'Bu sınıfta kayıtlı öğrenci yok.'} Takip işaretleri hesabınıza kaydedilir.</small>`:''}</div></article>`;
}
function ozetKarti(p){
 const ip=C.ilerleme(p);
 return`<article class="ka-card"><div class="ka-card__body rhb-ozet"><div class="rhb-ozet__yazi"><strong>${ip.kazanim.yapilan} / ${ip.kazanim.toplam} kazanım yapıldı</strong><span>%${ip.yuzde} tamamlandı · ${ip.etkinlik.yapilan} / ${ip.etkinlik.toplam} diğer etkinlik</span></div><span class="rhb-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ip.yuzde}"><i style="width:${ip.yuzde}%"></i></span></div></article>`;
}

/* ── plan sekmesi ── */
function maddeHtml(m,t){
 const tatil=m.tur==='tatil',gec=C.gecikmis(m,t),durum=m.yapildi?'h':gec?'g':'',acik=S.acik===m.id;
 const alt=[m.yeterlik,C.haftaMetni(m.hafta)+(m.planTarihi?` · ${kisaTarih(m.planTarihi)}`:''),m.yapildi&&m.tarih?`yapıldı ${C.tarihTR(m.tarih)}`:gec?'gecikmiş':''].filter(Boolean).join(' · ');
 return`<li class="rhb-madde${tatil?' rhb-madde--tatil':''}" data-rhb-madde="${esc(m.id)}" data-state="${durum}">
${tatil?'<span class="rhb-check" aria-hidden="true"></span>':`<label class="rhb-check"><input type="checkbox" data-rhb-check="${esc(m.id)}" ${m.yapildi?'checked':''} aria-label="${esc(C.maddeMetni(m))} yapıldı"></label>`}
<button type="button" class="rhb-govde" data-rhb-act="ac" data-rhb-madde="${esc(m.id)}" aria-expanded="${acik}"><span class="rhb-metin">${m.tur==='k'?`<b class="rhb-no">${m.sira}</b>`:''}${esc(m.metin)}</span><small>${esc(alt)}</small></button>
${acik?detayHtml(m):''}</li>`;
}
function detayHtml(m){
 const d=S.durum.p[m.id]||{},degisti=!m.ozel&&(d.ay||d.h||d.m);
 return`<div class="rhb-detay"><div class="ka-grid">
${m.tur==='k'?field('Etkinliğin adı (aylık rapora yazılır)',`<input class="ka-input" type="text" maxlength="160" value="${esc(m.ad)}" data-rhb-alan="madde-ad" data-rhb-madde="${esc(m.id)}" placeholder="Örn. Okulumuzu tanıyorum" autocomplete="off">`):m.tur==='tatil'?'':field('Madde',`<input class="ka-input" type="text" maxlength="160" value="${esc(m.metin)}" data-rhb-alan="madde-metin" data-rhb-madde="${esc(m.id)}" autocomplete="off">`)}
${m.tur==='tatil'?'':field('Yapıldığı tarih',`<input class="ka-input" type="date" value="${esc(m.tarih)}" data-rhb-alan="madde-tarih" data-rhb-madde="${esc(m.id)}" ${m.yapildi?'':'disabled'}>`)}
${field('Ay',`<select class="ka-input" data-rhb-alan="madde-ay" data-rhb-madde="${esc(m.id)}">${secenekler(ayAdlari(),m.ay)}</select>`)}
${field('Hafta',`<select class="ka-input" data-rhb-alan="madde-hafta" data-rhb-madde="${esc(m.id)}">${secenekler(HAFTALAR.map(h=>[h,`${h}. hafta`]),m.hafta)}</select>`)}</div>
<div class="rhb-detay__alt">${m.tur==='k'?'':dugme('sil','Planımdan çıkar',`data-rhb-madde="${esc(m.id)}"`,'ka-btn--ghost ka-btn--sm')}${degisti?dugme('asil','Planın aslına dön',`data-rhb-madde="${esc(m.id)}"`,'ka-btn--ghost ka-btn--sm'):''}${m.tur==='k'&&C.kazanimBul(S.duzey,m.sira)?.aciklama?`<small class="ka-muted">${esc(C.kazanimBul(S.duzey,m.sira).aciklama)}</small>`:''}</div></div>`;
}
function ayHtml(a,t){
 const sayilan=a.maddeler.filter(m=>m.tur!=='tatil'),yapilan=sayilan.filter(m=>m.yapildi).length;
 return`<details class="rhb-ay" data-rhb-ay="${esc(a.ad)}" ${S.acikAy.has(a.ad)?'open':''}><summary><strong>${esc(C.ayAdi(a.ad))}</strong><span class="rhb-sayi">${yapilan}/${sayilan.length}</span></summary>
<ol class="rhb-liste">${a.maddeler.map(m=>maddeHtml(m,t)).join('')}</ol>
<form class="rhb-ekle" data-rhb-ekle="${esc(a.ad)}">${field('Yeni etkinlik',`<input class="ka-input" type="text" name="metin" maxlength="160" placeholder="Örn. Sosyal Etkinlik" autocomplete="off" required>`)}${field('Hafta',`<select class="ka-input" name="hafta">${secenekler(HAFTALAR.map(h=>[h,`${h}. hafta`]),1)}</select>`)}<button type="submit" class="ka-btn ka-btn--secondary">Ekle</button></form></details>`;
}
/* Plandan çıkarılan taban maddeler geri getirilebilir. */
function silinenler(){
 const ad=Object.fromEntries(C.tabanMaddeler(S.duzey).map(m=>[m.id,m]));
 return Object.entries(S.durum.p).filter(([id,e])=>e.x&&ad[id]).map(([id])=>ad[id]);
}
function planSekmesi(){
 const p=plan(),t=bugun(),sil=silinenler();
 return`${ozetKarti(p)}
<div class="rhb-aksiyon">${cikti('plan')}</div>
${p.aylar.map(a=>ayHtml(a,t)).join('')}
${sil.length?`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Planımdan çıkardıklarım</strong>${sil.map(m=>`<div class="rhb-geri"><span>${esc(C.maddeMetni(m))}</span>${dugme('geri','Geri getir',`data-rhb-madde="${esc(m.id)}"`,'ka-btn--ghost ka-btn--sm')}</div>`).join('')}</div></article>`:''}`;
}

/* ── rapor sekmesi ── */
/* Satır listesi düzenleyici: r[anahtar][alan] dizisi; kolonlar = [[alan, etiket, tür]] */
function listeEd(anahtarR,alan,baslik,kolonlar,en=1){
 const r=C.rapor(S.durum,anahtarR),l=Array.isArray(r[alan])?r[alan]:[];
 const satir=(x,i)=>`<div class="rhb-ed__satir">${kolonlar.map(([k,e,tur])=>`<label class="ka-field"><span class="ka-field__label">${esc(e)}</span><input class="ka-input" type="${tur||'text'}" value="${esc(x?.[k]||'')}" data-rhb-satir="${esc(anahtarR)}|${esc(alan)}|${i}|${esc(k)}" ${tur==='number'?'min="0" inputmode="numeric"':''} autocomplete="off"></label>`).join('')}<button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-rhb-act="satir-sil" data-rhb-ref="${esc(anahtarR)}|${esc(alan)}|${i}" aria-label="Satırı sil">×</button></div>`;
 return`<fieldset class="rhb-ed"><legend>${esc(baslik)}</legend>${l.map(satir).join('')}<button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-rhb-act="satir-ekle" data-rhb-ref="${esc(anahtarR)}|${esc(alan)}|${en}">＋ Satır ekle</button></fieldset>`;
}
const metinEd=(anahtarR,alan,etiket)=>field(etiket,`<textarea class="ka-input rhb-metin-ed" rows="3" maxlength="1200" data-rhb-metin="${esc(anahtarR)}|${esc(alan)}">${esc(C.rapor(S.durum,anahtarR)[alan]||'')}</textarea>`);
const hepsiOnay=()=>`<label class="rhb-onay"><input type="checkbox" data-rhb-alan="hepsi" ${S.hepsi?'checked':''}><span>İşaretlenmeyen çalışmaları da yaz (plandaki tarihleriyle)</span></label>`;

function aylikRapor(p){
 const r=C.aylikRapor(p,S.ay,S.durum,{hepsi:S.hepsi,veliGorusmeleri:formKayitlari()}),formdan=r.veli.filter(x=>x.formdan);
 const sec=ayAdlari().map(([k,ad])=>{const a=p.aylar.find(x=>x.ad===k),n=a?a.maddeler.filter(m=>m.yapildi).length:0;return[k,`${ad}${n?` (${n} işaretli)`:''}`]});
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-grid">${field('Rapor ayı',`<select class="ka-input" data-rhb-alan="ay">${secenekler(sec,S.ay)}</select>`)}</div>
${hepsiOnay()}
<small class="ka-muted">${r.etkinlikler.length} kazanım etkinliği ve ${r.diger.length} diğer çalışma rapora yazılacak${S.hepsi?'':` (${r.isaretli} / ${r.planlanan} madde işaretli)`}. İşaretleme Yıllık Plan sekmesindedir.</small></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><div class="rhb-aksiyon"><strong>Veli Görüşme Formundan</strong>${dugme('veli-form','💬 Görüşme formunu aç','','ka-btn--secondary ka-btn--sm')}</div>
${formdan.length?`<ul class="rhb-formdan">${formdan.map(g=>`<li><span>${esc(kisaTarih(g.tarih))}</span><strong>${esc(g.ogrenci||'Öğrenci')}</strong><small>${esc([g.veli,g.konu].filter(Boolean).join(' · '))}</small></li>`).join('')}</ul>`:'<small class="ka-muted">Bu ay bu sınıf için kayıtlı görüşme yok.</small>'}
<small class="ka-muted">Veli Görüşme Formu’na kaydettiğiniz görüşmeler rapora kendiliğinden yazılır; formda olmayanları aşağıdan ekleyebilirsiniz.</small></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Elle eklenecekler</strong>
${listeEd(`ay:${S.ay}`,'test','Uygulanan test ve anketler',[['ad','Test / anket'],['tarih','Uygulama tarihi','date'],['kiz','Kız','number'],['erkek','Erkek','number']])}
${listeEd(`ay:${S.ay}`,'veli','Velilerle yapılan görüşmeler (formda olmayanlar)',[['veli','Veli'],['ogrenci','Öğrencisi'],['konu','Görüşme konusu'],['tarih','Tarih','date']])}
${listeEd(`ay:${S.ay}`,'ogrenci','Öğrencilerle yapılan görüşmeler',[['no','No'],['ad','Adı soyadı'],['konu','Görüşme konusu'],['tarih','Tarih','date']])}
${listeEd(`ay:${S.ay}`,'diger','Diğer çalışmalar',[['metin','Çalışma'],['tarih','Tarih','date']])}</div></article>
${cikti('aylik')}`;
}
function donemRapor(p,tur){
 const d=C.donemRaporu(p,tur==='donem1'?1:2,{hepsi:S.hepsi});
 return`<article class="ka-card"><div class="ka-card__body ka-stack">${hepsiOnay()}
${d.aylar.map(a=>`<div class="rhb-donem"><strong>${esc(C.ayAdi(a.ad))}</strong>${a.satirlar.length?`<ul>${a.satirlar.map(s=>`<li>${esc(s.metin)}</li>`).join('')}</ul>`:'<small class="ka-muted">İşaretlenmiş çalışma yok.</small>'}</div>`).join('')}</div></article>${cikti(tur)}`;
}
function yilRapor(p){
 const y=C.yilSonuRaporu(p,S.durum,{veliGorusmeleri:formKayitlari()}),r=C.rapor(S.durum,'yil'),bireysel=y.veliFaaliyetleri.find(f=>f.formdan);
 const nedenler=y.gerceklesmeyen.length&&y.gerceklesti!=='Evet'?`<details class="rhb-neden"><summary>Gerçekleşmeyen ${y.gerceklesmeyen.length} kazanım ve nedenleri</summary>${y.gerceklesmeyen.map(g=>`<label class="ka-field"><span class="ka-field__label">${g.sira}. ${esc(g.metin)}</span><input class="ka-input" type="text" value="${esc(g.neden)}" data-rhb-neden="${g.sira}" maxlength="160" autocomplete="off"></label>`).join('')}</details>`:'';
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>1. Kazanımlar</strong><small class="ka-muted">${y.kazanimYapilan} / ${y.kazanimToplam} kazanım işaretli.</small>
<div class="ka-grid">${field('Tüm kazanımlar gerçekleştirilebildi mi?',`<select class="ka-input" data-rhb-alan="gerceklesti"><option value="" ${r.gerceklesti?'':'selected'}>Otomatik (${esc(y.otomatik)})</option>${['Evet','Kısmen','Hayır'].map(x=>`<option ${r.gerceklesti===x?'selected':''}>${x}</option>`).join('')}</select>`)}</div>${nedenler}</div></article>
<article class="ka-card"><div class="ka-card__body ka-stack">
${listeEd('yil','teknikler','2. Uygulanan teknikler (otobiyografi, öğrenci tanıma formu vb.)',[['ad','Yapılan çalışma'],['kiz','Kız','number'],['erkek','Erkek','number']],3)}
${listeEd('yil','faaliyetler','3. Yapılan rehberlik faaliyetleri',[['ad','Yapılan çalışma'],['kiz','Kız','number'],['erkek','Erkek','number']],3)}
${listeEd('yil','yonlendirilen','4. Rehberlik servisine yönlendirilen öğrenci ve veliler',[['ad','Öğrenci adı soyadı'],['no','Numarası'],['veli','Veli adı'],['neden','Yönlendirme nedeni']],1)}
${listeEd('yil','veliFaaliyetleri','5. Velilere yönelik faaliyetler',[['ad','Yapılan çalışma'],['kiz','Kız','number'],['erkek','Erkek','number']],2)}
<small class="ka-muted">Boş bıraktığınız “Velilere yönelik faaliyetler” listesinde Veli Toplantısı ve Bireysel Görüşme hazır yazılır.${bireysel?` Bireysel Görüşme sayıları Veli Görüşme Formu kayıtlarından geldi (görüşülen öğrenci: ${bireysel.kiz||0} kız, ${bireysel.erkek||0} erkek).`:''}</small></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack">${metinEd('yil','guclukler','6. Karşılaşılan güçlükler ve nedenleri')}${metinEd('yil','cozumler','Çözüm önerileri')}${metinEd('yil','isbirligi','7. Okul PDR servisi ve sınıf rehber öğretmenleri arasındaki işbirliği nasıl daha güçlü hale getirilebilir?')}${metinEd('yil','beklenti','Okul PDR hizmetlerinden beklentileriniz nelerdir?')}</div></article>${cikti('yil')}`;
}
function raporSekmesi(){
 const p=plan(),tur=S.tur;
 const secici=`<nav class="ka-tabs rhb-tabs" role="tablist" aria-label="Rapor türü">${TURLER.map(([k,ad])=>`<button type="button" role="tab" class="${k===tur?'active':''}" aria-selected="${k===tur}" data-rhb-tur-sec="${k}">${esc(ad)}</button>`).join('')}</nav>`;
 return`${secici}${tur==='aylik'?aylikRapor(p):tur==='yil'?yilRapor(p):donemRapor(p,tur)}`;
}

/* ── kazanım sekmesi ── */
function kazanimSekmesi(){
 const l=C.kazanimlar(S.duzey);
 return`<div class="rhb-aksiyon"><small class="ka-muted">${S.duzey}. sınıf rehberlik programı: ${l.length} kazanım, toplam ${l.reduce((n,k)=>n+k.hafta,0)} hafta.</small>${cikti('kazanim',false)}</div>
<ol class="rhb-kazanimlar">${l.map(k=>{const id=k.sira[0],acik=S.kazAcik.has(id);return`<li class="rhb-kaz"><span class="rhb-kaz__no">${esc(k.sira.map(x=>`${x}.`).join(' '))}</span><div class="rhb-kaz__govde"><strong>${esc(k.metin)}</strong><small>${esc(k.alan)}${k.yeterlik?` · ${esc(k.yeterlik)}`:''} · ${k.hafta} hafta</small>${k.aciklama?`<button type="button" class="rhb-kaz__ac" data-rhb-act="kaz-ac" data-rhb-ref="${id}" aria-expanded="${acik}">Açıklama</button>${acik?`<p class="rhb-kaz__aciklama">${esc(k.aciklama)}</p>`:''}`:''}</div></li>`}).join('')}</ol>`;
}

/* ── ekran ── */
function viewHtml(){
 const sekmeler=SEKMELER.map(([k,ad])=>`<button type="button" role="tab" class="${k===S.sekme?'active':''}" aria-selected="${k===S.sekme}" data-rhb-sekme="${k}">${esc(ad)}</button>`).join('');
 const icerik=!S.duzey?'<div class="rhb-bos"><strong>Sınıfı seçin</strong><p>Yıllık plan, raporlar ve kazanımlar seçtiğiniz sınıfın düzeyine göre hazırlanır.</p></div>'
  :S.sekme==='rapor'?raporSekmesi():S.sekme==='kazanim'?kazanimSekmesi():planSekmesi();
 return`<section class="ka-page ka-stack rhb-page" data-rhb-page>
<header class="ka-page-head"><span class="ka-page-head__icon" aria-hidden="true">🧩</span><div><small>${esc(S.yil)} EĞİTİM ÖĞRETİM YILI</small><h2>Sınıf Rehberlik</h2></div></header>
${sinifKarti()}
${S.duzey?`<nav class="ka-tabs rhb-tabs" role="tablist" aria-label="Rehberlik bölümleri">${sekmeler}</nav>`:''}
${icerik}</section>`;
}
function render(){
 const r=document.getElementById('v2ModuleRoot');if(!r||!S.yil)return false;
 const y=global.scrollY;
 r.innerHTML=viewHtml();mounted=true;
 if(!bagli)baglan();
 global.scrollTo?.(0,y);
 return true;
}

/* ── olaylar ── */
const inPage=e=>!!e.target?.closest?.('[data-rhb-page]');
function sinifSec(id){
 S.sinifId=id;const c=sinif();
 S.duzey=c?SB.duzeyOf(c.ad):0;
 S.ogretmen=c?SB.sinifOgretmeni(c):'';S.mudur=SB.okulMuduru();
 S.durum=S.sinifId?yerelOku():C.bosDurum();
 S.acik='';S.acikAy=new Set([bugunAy()]);S.ay=bugunAy();
}
function maddeBul(id){return C.maddeler(plan()).find(m=>m.id===id)||null}
function isaretle(id,hedef){
 const m=maddeBul(id);if(!m)return;
 C.isaretle(S.durum,id,hedef,hedef?C.onerilenTarih(m.planTarihi,bugun()):'');kaydet();render();
}
function listeDegistir(ref,fn){
 const[anah,alan,i]=ref.split('|'),r=C.rapor(S.durum,anah),l=(Array.isArray(r[alan])?r[alan]:[]).map(x=>({...x}));
 fn(l,Number(i));C.raporYaz(S.durum,anah,{[alan]:l});kaydet();render();
}
const ISLEMLER={
 yazdir:b=>yazdir(b.dataset.rhbTur),
 'veli-form':()=>{const t=global.AppNav?.tool?.('parentmeeting');if(!t)return toast('Veli görüşme formu bulunamadı.');Promise.resolve(global.ShellUI?.routeModule?.(t.route,{page:t.page,title:t.label})).catch(e=>{console.warn('[Sınıf Rehberlik/form]',e);toast('Form açılamadı.')})},
 indir:b=>indir(b.dataset.rhbTur),
 ac:b=>{S.acik=S.acik===b.dataset.rhbMadde?'':b.dataset.rhbMadde;render()},
 sil:b=>{const m=maddeBul(b.dataset.rhbMadde);if(!m||!global.confirm(`“${m.metin}” planınızdan çıkarılsın mı?`))return;C.maddeSil(S.durum,m.id);S.acik='';kaydet();render()},
 asil:b=>{C.maddeDuzenle(S.durum,b.dataset.rhbMadde,{ay:'',h:0,m:''});kaydet();render()},
 geri:b=>{C.maddeDuzenle(S.durum,b.dataset.rhbMadde,{x:0});kaydet();render()},
 'satir-ekle':b=>{const[anah,alan,en]=b.dataset.rhbRef.split('|');listeDegistir(`${anah}|${alan}|0`,l=>{for(let i=0;i<Math.max(1,Number(en)||1);i++)l.push({})})},
 'satir-sil':b=>listeDegistir(b.dataset.rhbRef,(l,i)=>{l.splice(i,1)}),
 'kaz-ac':b=>{const id=Number(b.dataset.rhbRef);S.kazAcik.has(id)?S.kazAcik.delete(id):S.kazAcik.add(id);render()}
};
function onClick(e){
 if(!inPage(e))return;
 const sek=e.target.closest('[data-rhb-sekme]');
 if(sek){S.sekme=sek.dataset.rhbSekme;render();return}
 const tur=e.target.closest('[data-rhb-tur-sec]');
 if(tur){S.tur=tur.dataset.rhbTurSec;render();return}
 const b=e.target.closest('[data-rhb-act]');if(!b||b.disabled)return;
 ISLEMLER[b.dataset.rhbAct]?.(b,e);
}
function alanDegisti(el){
 const a=el.dataset.rhbAlan,id=el.dataset.rhbMadde,v=el.value;
 if(a==='sinifId'){sinifSec(v);render();return}
 if(a==='ogretmen'){S.ogretmen=v;return}
 if(a==='mudur'){S.mudur=v;return}
 if(a==='ay'){S.ay=v;render();return}
 if(a==='hepsi'){S.hepsi=el.checked;render();return}
 if(a==='gerceklesti'){C.raporYaz(S.durum,'yil',{gerceklesti:v});kaydet();render();return}
 if(a==='madde-tarih'){C.tarihYaz(S.durum,id,v);kaydet();return}
 if(a==='madde-ad'){C.etkinlikAdiYaz(S.durum,id,v);kaydetGec();return}
 if(a==='madde-metin'){const m=maddeBul(id);if(m){C.maddeDuzenle(S.durum,id,{m:v.trim()||m.metin});kaydetGec()}return}
 if(a==='madde-ay'||a==='madde-hafta'){
  C.maddeDuzenle(S.durum,id,a==='madde-ay'?{ay:v}:{h:Number(v)});
  if(a==='madde-ay')S.acikAy.add(v);
  kaydet();render();
 }
}
function onChange(e){
 if(!inPage(e))return;
 const el=e.target,c=el.closest('[data-rhb-check]');
 if(c){isaretle(c.dataset.rhbCheck,c.checked);return}
 if(el.dataset?.rhbAlan&&(el.tagName==='SELECT'||el.type==='checkbox'||el.type==='date'))alanDegisti(el);
}
function onInput(e){
 if(!inPage(e))return;
 const el=e.target;
 if(el.dataset?.rhbAlan&&el.tagName==='INPUT'&&el.type==='text')return alanDegisti(el);
 if(el.dataset?.rhbSatir){
  const[anah,alan,i,k]=el.dataset.rhbSatir.split('|'),r=C.rapor(S.durum,anah),l=(Array.isArray(r[alan])?r[alan]:[]).map(x=>({...x}));
  if(!l[Number(i)])return;
  l[Number(i)][k]=el.value;C.raporYaz(S.durum,anah,{[alan]:l});kaydetGec();return;
 }
 if(el.dataset?.rhbMetin){const[anah,alan]=el.dataset.rhbMetin.split('|');C.raporYaz(S.durum,anah,{[alan]:el.value});kaydetGec();return}
 if(el.dataset?.rhbNeden){
  const r=C.rapor(S.durum,'yil'),n={...(r.nedenler||{})};n[el.dataset.rhbNeden]=el.value;
  C.raporYaz(S.durum,'yil',{nedenler:n});kaydetGec();
 }
}
function onToggle(e){
 const d=e.target;if(!d?.matches?.('details[data-rhb-ay]'))return;
 d.open?S.acikAy.add(d.dataset.rhbAy):S.acikAy.delete(d.dataset.rhbAy);
}
function onSubmit(e){
 const f=e.target.closest?.('[data-rhb-ekle]');if(!f)return;
 e.preventDefault();
 const fd=new global.FormData(f),metin=String(fd.get('metin')||'').trim();if(!metin)return;
 const ay=f.dataset.rhbEkle;
 C.maddeEkle(S.durum,{ay,hafta:Number(fd.get('hafta'))||1,metin});S.acikAy.add(ay);kaydet();render();
}
function baglan(){
 bagli=true;
 document.addEventListener('click',onClick);
 document.addEventListener('change',onChange);
 document.addEventListener('input',onInput);
 document.addEventListener('submit',onSubmit);
 document.addEventListener('toggle',onToggle,true);
}

/* ── açılış ── */
function open(){
 S.yil=C.egitimYili();S.sekme='plan';S.tur='aylik';S.hepsi=false;S.kazAcik=new Set();
 temizle();
 const{own}=SB.siniflar();
 sinifSec(own.size===1?[...own][0]:'');
 const ok=render();
 offPrefs=global.KaPrefs?.remoteListen?.(uzakGeldi)||null;
 SB.abonelik(EK_KOLEKSIYON).forEach(p=>{const u=global.AppStore?.subscribe?.(p,()=>{if(!document.querySelector('[data-rhb-page]'))return temizle();
  if(S.sinifId&&!S.ogretmen)S.ogretmen=SB.sinifOgretmeni(sinif());if(!S.mudur)S.mudur=SB.okulMuduru();render()});if(u)unsubs.push(u)});
 SB.hazirla(EK_KOLEKSIYON).catch(e=>console.warn('[Sınıf Rehberlik]',e?.message||e));
 return ok;
}
function unmount(){clearTimeout(pushT);clearTimeout(yazT);temizle()}

global.RehberlikModule={open,render,unmount,ctx,belgeHtml,yazdir,sinifSec,reset:()=>{S.sinifId='';S.duzey=0;S.durum=null;unmount();SB.sifirla()},get durum(){return S.durum},set sekme(v){S.sekme=v},set tur(v){S.tur=v},set ay(v){S.ay=v}};
})(window);
