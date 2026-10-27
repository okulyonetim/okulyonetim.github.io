/* Koruk Asistan — Sınıf Rehberlik kâğıt çıktıları (A4)
 * Yıllık plan (yatay) · Aylık çalışma raporu · I./II. dönem sonu raporu · Yıl sonu faaliyet raporu · Kazanım tablosu (yatay) · Sınıf risk haritası (yatay).
 * Düzenler kaynak dosyalardaki (xlsx / docx) görünümü izler; veri rehberlik-core.js'ten gelir, stil css/design-system-base.css (.rhb-*).
 * Her çıktı merkezi ReportEngine ile akış kipinde (akis:true) yazdırılır; imza blokları solda durur.
 * Bağlam c = { yil, okul, sinif, duzey, ogretmen, mudur, mevcut:{kiz,erkek,toplam}, tarih }
 */
(function(global){
'use strict';
if(global.RehberlikBelge)return;

const C=()=>global.RehberlikCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NOKTA='………………………';
const buyuk=s=>String(s||'').toLocaleUpperCase('tr');
const mudurluk=okul=>{const o=buyuk(okul).trim();return!o?'……………………… MÜDÜRLÜĞÜ':/MÜDÜRLÜĞÜ$/.test(o)?o:`${o} MÜDÜRLÜĞÜ`};
/* "5/A" → "5. SINIF A ŞUBESİ", "5. Sınıf A" → aynı; çözülemezse "<ad> SINIFI". */
function sinifBasligi(ad){
 const m=/^\s*(\d{1,2})\s*[./\-\s]*\s*(?:sınıf[ıi]?\s*)?([A-Za-zÇĞİÖŞÜçğıöşü]{1,3})?\s*(?:şubesi)?\s*$/i.exec(String(ad||''));
 if(m)return m[2]?`${m[1]}. SINIF ${buyuk(m[2])} ŞUBESİ`:`${m[1]}. SINIF`;
 const s=buyuk(ad).trim();
 return s?(/SINIF/.test(s)?s:`${s} SINIFI`):'……… SINIFI';
}
const tarih=s=>C().tarihTR(s)||'';
const cols=(...sinif)=>`<colgroup>${sinif.map(c=>`<col${c?` class="${c}"`:''}>`).join('')}</colgroup>`;
const doldur=(liste,en)=>{const l=Array.isArray(liste)?liste.slice():[];while(l.length<en)l.push(null);return l};
const imza=(ad,unvan)=>`<div class="rhb-imza"><span>${esc(ad||NOKTA)}</span><b>${esc(unvan)}</b></div>`;
const ogretmenImza=(c,unvan='Sınıf Rehber Öğretmeni')=>imza(c.ogretmen,unvan);
/* Müdür onayı: sağ kenarda "OLUR", tarih, ad ve unvan (öğretmen imzaları solda kalır). */
const mudurImza=c=>`<div class="rhb-imza rhb-imza--olur"><b>OLUR</b><span>${esc(tarih(c.tarih))}</span><span>${esc(c.mudur||NOKTA)}</span><b>Okul Müdürü</b></div>`;
const baslikBlok=(c,konu)=>`<header class="rhb-baslik"><b>${esc(c.yil)} EĞİTİM ÖĞRETİM YILI</b><b>${esc(mudurluk(c.okul))}</b><b>${esc(konu)}</b></header>`;

/* ── yıllık plan (yatay A4): üçerli ay blokları ── */
function planBelgesi(plan,c){
 const aylar=Object.fromEntries(plan.aylar.map(a=>[a.ad,a]));
 const bant=adlar=>{
  const kolonlar=adlar.map(ad=>aylar[ad]).filter(Boolean),en=Math.max(...kolonlar.map(a=>a.maddeler.length));
  const baslik=kolonlar.map(a=>`<th class="rhb-ay">${esc(a.ad)}</th><th class="rhb-c-hafta">TARİH</th>`).join('');
  const satirlar=Array.from({length:en},(_,i)=>kolonlar.map(a=>{const m=a.maddeler[i];return m?`<td class="rhb-metin${m.tur==='tatil'?' rhb-tatil':''}">${esc(C().maddeMetni(m))}</td><td class="rhb-hafta">${esc(C().haftaMetni(m.hafta))}</td>`:'<td></td><td></td>'}).join('')).map(t=>`<tr>${t}</tr>`).join('');
  return`<table class="rhb-tablo rhb-bant rhb-bant--${kolonlar.length}"><thead><tr>${baslik}</tr></thead><tbody>${satirlar}</tbody></table>`;
 };
 return`<article class="rhb-paper rhb-plan">${baslikBlok(c,`${sinifBasligi(c.sinif)} SINIF REHBERLİK PLANI`)}
${C().PLAN_BANTLARI.map(bant).join('')}
<div class="rhb-imzalar">${ogretmenImza(c,'Sınıf Rehber Öğretmeni')}${mudurImza(c)}</div></article>`;
}

/* ── aylık çalışma raporu ── */
function aylikBelge(r,c){
 const m=c.mevcut||{kiz:0,erkek:0,toplam:0},say=n=>n?String(n):'',konu=`${sinifBasligi(c.sinif)} ${C().ayAdi(r.ay).toLocaleUpperCase('tr')} AYI ÇALIŞMA RAPORU`;
 const etkinlik=doldur(r.etkinlikler,3).map((e,i)=>`<tbody class="rhb-blok"><tr><td class="rhb-sira" rowspan="3">${e?e.sira:i+1}</td><td class="rhb-tarih" rowspan="3">${esc(e?tarih(e.tarih):'')}</td><th>YETERLİLİK ALANI</th><td>${esc(e?.yeterlik||'')}</td></tr><tr><th>KAZANIM</th><td>${esc(e?.kazanim||'')}</td></tr><tr><th>ETKİNLİĞİN ADI</th><td>${esc(e?.ad||'')}</td></tr></tbody>`).join('');
 const test=doldur(r.test,2).map((t,i)=>`<tr><td class="rhb-sira">${i+1}</td><td>${esc(t?.ad||'')}</td><td class="rhb-orta">${esc(t?tarih(t.tarih):'')}</td><td class="rhb-orta">${esc(t?.kiz||'')}</td><td class="rhb-orta">${esc(t?.erkek||'')}</td><td class="rhb-orta">${esc(t?(Number(t.kiz||0)+Number(t.erkek||0)||''):'')}</td></tr>`).join('');
 const veli=doldur(r.veli,3).map((v,i)=>`<tr><td class="rhb-sira">${i+1}</td><td>${esc(v?.veli||'')}</td><td>${esc(v?.ogrenci||'')}</td><td>${esc(v?.konu||'')}</td><td class="rhb-orta">${esc(v?tarih(v.tarih):'')}</td></tr>`).join('');
 const ogr=doldur(r.ogrenci,3).map((o,i)=>`<tr><td class="rhb-sira">${i+1}</td><td class="rhb-orta">${esc(o?.no||'')}</td><td>${esc(o?.ad||'')}</td><td>${esc(o?.konu||'')}</td><td class="rhb-orta">${esc(o?tarih(o.tarih):'')}</td></tr>`).join('');
 const diger=doldur(r.diger,2).map((d,i)=>`<tr>${i?'':`<th rowspan="${Math.max(2,r.diger.length)}">DİĞER ÇALIŞMALAR</th>`}<td class="rhb-sira">${i+1}</td><td>${esc(d?d.metin+(d.tarih?` (${tarih(d.tarih)})`:''):'')}</td></tr>`).join('');
 return`<article class="rhb-paper rhb-aylik">
<table class="rhb-tablo rhb-ustbilgi"><tbody><tr><td colspan="6" class="rhb-baslik-hucre">${esc(mudurluk(c.okul))}<br>${esc(c.yil)} EĞİTİM VE ÖĞRETİM YILI<br>${esc(konu)}</td></tr>
<tr><th>SINIF ÖĞRETMENİ</th><td>${esc(c.ogretmen)}</td><th>NO</th><td></td><th>RAPOR TARİHİ</th><td>${esc(tarih(c.tarih))}</td></tr></tbody></table>
<table class="rhb-tablo rhb-mevcut"><tbody><tr><th>SINIF</th><td>${esc(c.sinif)}</td><th>SINIF MEVCUDU</th><th>KIZ</th><td>${say(m.kiz)}</td><th>ERKEK</th><td>${say(m.erkek)}</td><th>TOPLAM</th><td>${say(m.toplam)}</td></tr></tbody></table>
<table class="rhb-tablo rhb-etkinlik">${cols('rhb-c-sira','rhb-c-tarih','rhb-c-etiket','')}<thead><tr><th class="rhb-c-sira">SIRA</th><th class="rhb-c-tarih">TARİH</th><th colspan="2">ETKİNLİK ÇALIŞMALARI</th></tr></thead>${etkinlik}</table>
<table class="rhb-tablo rhb-test">${cols('rhb-c-sira','','rhb-c-tarih','rhb-c-sayi','rhb-c-sayi','rhb-c-sayi')}<thead><tr><th rowspan="2" class="rhb-c-sira">&nbsp;</th><th rowspan="2">UYGULANAN TEST VE ANKETLER</th><th rowspan="2" class="rhb-c-tarih">UYGULAMA TARİHİ</th><th colspan="3">UYGULANAN ÖĞRENCİ SAYISI</th></tr><tr><th class="rhb-c-sayi">KIZ</th><th class="rhb-c-sayi">ERKEK</th><th class="rhb-c-sayi">TOPLAM</th></tr></thead><tbody>${test}</tbody></table>
<table class="rhb-tablo rhb-veli">${cols('rhb-c-sira','rhb-c-veli','rhb-c-ogr','','rhb-c-tarih')}<thead><tr><th colspan="5">VELİLERLE YAPILAN GÖRÜŞMELER</th></tr><tr><th class="rhb-c-sira">SIRA</th><th>VELİ</th><th>ÖĞRENCİSİ</th><th>GÖRÜŞME KONUSU</th><th class="rhb-c-tarih">TARİH</th></tr></thead><tbody>${veli}</tbody></table>
<table class="rhb-tablo rhb-ogr">${cols('rhb-c-etiket','rhb-c-sira','rhb-c-no','rhb-c-ad','','rhb-c-tarih')}<thead><tr><th colspan="6">ÖĞRENCİLERLE YAPILAN GÖRÜŞMELER</th></tr></thead><tbody><tr><th rowspan="${Math.max(3,r.ogrenci.length)+1}">ÖĞRENCİNİN</th><th>SIRA</th><th>NO</th><th>ADI VE SOYADI</th><th>GÖRÜŞME KONUSU</th><th>TARİH</th></tr>${ogr}</tbody></table>
<table class="rhb-tablo rhb-diger">${cols('rhb-c-etiket','rhb-c-sira','')}<tbody>${diger}</tbody></table>
<div class="rhb-imzalar">${ogretmenImza(c)}${imza('','Okul Rehber Öğretmeni')}${mudurImza(c)}</div></article>`;
}

/* ── dönem sonu raporu ── */
function donemBelgesi(d,c){
 const aylar=d.aylar.map(a=>`<tr><th>${esc(a.ad)}</th><td>${a.satirlar.length?`<ul class="rhb-liste">${a.satirlar.map(s=>`<li>${esc(s.metin)}</li>`).join('')}</ul>`:''}</td></tr>`).join('');
 return`<article class="rhb-paper rhb-donem">${baslikBlok(c,`SINIF REHBERLİK ÇALIŞMALARI ${d.ad} SONU ÇALIŞMA RAPORU`)}
<table class="rhb-tablo rhb-kimlik"><tbody><tr><th>Sınıf/Şube:</th><td>${esc(c.sinif)}</td></tr><tr><th>Sınıf Rehber Öğretmeni:</th><td>${esc(c.ogretmen)}</td></tr></tbody></table>
<h2 class="rhb-alt">YAPILAN AYLIK ETKİNLİKLER</h2>
<table class="rhb-tablo rhb-aylar"><tbody>${aylar}</tbody></table>
<p class="rhb-not">*** Not: Sınıf rehberlik yıllık planına bağlı kalınarak doldurulacaktır.</p>
<div class="rhb-imzalar">${ogretmenImza(c,'Sınıf Öğretmeni')}${mudurImza(c)}</div></article>`;
}

/* ── yıl sonu faaliyet raporu ── */
function yilSonuBelgesi(y,c){
 const isaret=ad=>`${ad} (${y.gerceklesti===ad?'X':'&nbsp;&nbsp;'})`;
 const neden=doldur(y.gerceklesmeyen,8).map((g,i)=>`<tr><td class="rhb-sira">${i+1}</td><td class="rhb-orta">${esc(g?g.sira:'')}</td><td>${esc(g?.neden||'')}</td></tr>`).join('');
 const faal=(liste,en)=>doldur(liste,en).map((f,i)=>`<tr><td class="rhb-sira">${i+1}</td><td>${esc(f?.ad||'')}</td><td class="rhb-orta">${esc(f?.kiz||'')}</td><td class="rhb-orta">${esc(f?.erkek||'')}</td><td class="rhb-orta">${esc(f&&(f.kiz||f.erkek)?Number(f.kiz||0)+Number(f.erkek||0):'')}</td></tr>`).join('');
 const faalTablo=(liste,en)=>`<table class="rhb-tablo rhb-faal"><thead><tr><th class="rhb-c-sira">SN</th><th>YAPILAN ÇALIŞMA</th><th class="rhb-c-sayi">KIZ</th><th class="rhb-c-sayi">ERKEK</th><th class="rhb-c-sayi">TOPLAM</th></tr></thead><tbody>${faal(liste,en)}</tbody></table>`;
 const yonlendirme=doldur(y.yonlendirilen,10).map((o,i)=>`<tr><td class="rhb-sira">${i+1}</td><td>${esc(o?.ad||'')}</td><td class="rhb-orta">${esc(o?.no||'')}</td><td>${esc(o?.veli||'')}</td><td>${esc(o?.neden||'')}</td></tr>`).join('');
 const soru=(s,v)=>`<tr><th>${esc(s)}</th><td>${esc(v).replace(/\n/g,'<br>')}</td></tr>`;
 return`<article class="rhb-paper rhb-yilsonu">${baslikBlok(c,'SINIF REHBERLİK HİZMETLERİ YILSONU FAALİYET RAPORU')}
<p class="rhb-etiket"><b>Sınıf/Şube:</b> ${esc(c.sinif)}</p>
<p class="rhb-etiket">1. Sınıf Rehberlik Planında Yer Alan Kazanımlar:<br><small>*Planında kazanım olmayıp, faaliyet olan sınıflar doldurmayacaktır.</small></p>
<table class="rhb-tablo rhb-kazanim"><tbody><tr><th>Tüm kazanımlar (yıllık plana göre) gerçekleştirilebildi mi?<br><small>${y.kazanimYapilan} / ${y.kazanimToplam} kazanım işaretlendi</small></th><td class="rhb-secim">${isaret('Evet')} ${isaret('Kısmen')} ${isaret('Hayır')}</td></tr>
<tr><td colspan="2" class="rhb-soru">Üstteki soruya cevabınız kısmen ya da hayır ise; gerçekleştirilemeyen kazanım numarasını ve nedenini yazınız.</td></tr></tbody></table>
<table class="rhb-tablo rhb-nedenler">${cols('rhb-c-sira','rhb-c-no','')}<tbody>${neden}</tbody></table>
<p class="rhb-etiket">2. Uygulanan Teknikler (otobiyografi, öğrenci tanıma formu vb.):</p>${faalTablo(y.teknikler,8)}
<p class="rhb-etiket">3. Yapılan Rehberlik Faaliyetleri (oryantasyon, motivasyon, devamsızlık takibi, öğrenci görüşmeleri vb.):</p>${faalTablo(y.faaliyetler,5)}
<p class="rhb-etiket">4. Psikolojik Danışma ve Rehberlik Servisine Yönlendirilen Öğrenci ve Veliler:</p>
<table class="rhb-tablo rhb-yonlendirme"><thead><tr><th class="rhb-c-sira">SN</th><th>ÖĞRENCİ ADI-SOYADI</th><th class="rhb-c-no">NUMARASI</th><th>VELİ ADI</th><th>YÖNLENDİRME NEDENİ</th></tr></thead><tbody>${yonlendirme}</tbody></table>
<p class="rhb-etiket">5. Velilere Yönelik Yapılan Faaliyetler:</p>${faalTablo(y.veliFaaliyetleri,4)}
<section class="rhb-bolum"><p class="rhb-etiket">6. Sınıf Rehberlik Faaliyetlerinde Karşılaşılan Güçlükler ve Çözüm Önerileri:</p>
<table class="rhb-tablo rhb-metinler"><tbody>${soru('Karşılaşılan Güçlükler ve Nedenleri',y.guclukler)}${soru('Çözüm Önerileri',y.cozumler)}</tbody></table></section>
<section class="rhb-bolum"><p class="rhb-etiket">7. Okul PDR Servisi İle İşbirliği:</p>
<table class="rhb-tablo rhb-metinler"><tbody>${soru('Okul PDR Servisi ve sınıf rehber öğretmenleri arasındaki işbirliği nasıl daha güçlü hale getirilebilir?',y.isbirligi)}${soru('Okul PDR Hizmetlerinden beklentileriniz nelerdir?',y.beklenti)}</tbody></table></section>
<p class="rhb-not">*Bu rapor bir örneği sınıf rehberlik dosyasında tutulmak kaydıyla, okul idaresi ya da PDR Servisi tarafından muhafaza edilir.</p>
<div class="rhb-imzalar">${ogretmenImza(c,'Şube Rehber Öğretmeni')}${mudurImza(c)}</div></article>`;
}

/* ── kazanım tablosu (yatay A4) ── */
function kazanimBelgesi(duzey,c){
 const satirlar=C().kazanimlar(duzey).map(k=>`<tr><td class="rhb-sira">${esc(k.sira.map(x=>`${x}.`).join(' '))}</td><td class="rhb-orta">${k.hafta}</td><td>${esc(k.metin)}</td><td>${esc(k.alan)}</td><td>${esc(k.yeterlik)}</td><td>${esc(k.aciklama)}</td></tr>`).join('');
 return`<article class="rhb-paper rhb-kazanimlar"><h1 class="rhb-ust">${esc(duzey)}. SINIF REHBERLİK PROGRAMI KAZANIMLARI</h1>
<table class="rhb-tablo rhb-kaztablo"><thead><tr><th class="rhb-c-sira">İşleniş Sırası</th><th class="rhb-c-sayi">Hafta Sayısı</th><th>KAZANIMLAR</th><th class="rhb-c-alan">Gelişim Alanı</th><th class="rhb-c-yet">Yeterlik</th><th class="rhb-c-ac">Açıklama</th></tr></thead><tbody>${satirlar}</tbody></table></article>`;
}

/* ── sınıf risk haritası (MEB S.İ.4.a, yatay A4): öğrenci × 36 risk alanı; işaretli kutuda "X", son satırda sütun toplamı ── */
const RISK_EN_AZ_SATIR=10;
function riskBelgesi(t,c,{yonerge=true}={}){
 const V=global.RehberlikVeri,riskler=V.risk,dik=m=>`<span class="rhb-dik">${esc(m)}</span>`;
 const cols36=riskler.map(()=>'<col class="rhb-c-risk">').join('');
 const baslik=`<th class="rhb-dik-h">${dik('Sıra No')}</th><th class="rhb-dik-h">${dik('Sınıf/Şube')}</th><th class="rhb-dik-h">${dik('Okul Numarası')}</th><th class="rhb-rad-h">Öğrencinin Adı Soyadı</th>${riskler.map(([ad])=>`<th class="rhb-dik-h">${dik(ad)}</th>`).join('')}`;
 const satir=(n,o)=>`<tr><td class="rhb-sira">${n}</td><td class="rhb-orta">${o?esc(c.sinif):''}</td><td class="rhb-orta">${o?esc(o.no):''}</td><td class="rhb-rad">${o?esc(o.ad):''}</td>${riskler.map((_,k)=>`<td class="rhb-x">${o?.isaret[k]?'X':''}</td>`).join('')}</tr>`;
 const bos=Math.max(0,RISK_EN_AZ_SATIR-t.ogrenciler.length);
 const govde=t.ogrenciler.map((o,i)=>satir(i+1,o)).join('')+Array.from({length:bos},(_,i)=>satir(t.ogrenciler.length+i+1,null)).join('');
 const toplam=`<tr class="rhb-toplam"><th colspan="4">TOPLAM</th>${t.toplamlar.map(n=>`<td class="rhb-x">${n||''}</td>`).join('')}</tr>`;
 const yon=yonerge?`<article class="rhb-paper rhb-yonerge"><h1 class="rhb-ust">SINIF RİSK HARİTASI<br>YÖNERGE</h1><h2 class="rhb-yon-ust">DİKKAT EDİLECEK HUSUSLAR;</h2>${V.riskYonerge.map(([b,m])=>`<h3 class="rhb-yon-baslik">${esc(b)}</h3><p class="rhb-yon-metin">${esc(m)}</p>`).join('')}</article>`:'';
 return`<article class="rhb-paper rhb-risk">${baslikBlok(c,`${sinifBasligi(c.sinif)} SINIF RİSK HARİTASI`)}
<p class="rhb-risk-ust"><b class="rhb-formkodu">S.İ.4.a · ÖZEL EĞİTİM VE REHBERLİK HİZMETLERİ GENEL MÜDÜRLÜĞÜ</b><span>Tarih: ${esc(tarih(c.tarih))}</span></p>
<table class="rhb-tablo rhb-risktablo"><colgroup><col class="rhb-c-rsira"><col class="rhb-c-rsube"><col class="rhb-c-rno"><col class="rhb-c-rad">${cols36}</colgroup><thead><tr>${baslik}</tr></thead><tbody>${govde}${toplam}</tbody></table>
<div class="rhb-imzalar">${ogretmenImza(c,'Sınıf Rehber Öğretmeni')}${mudurImza(c)}</div></article>${yon}`;
}

global.RehberlikBelge={esc,mudurluk,sinifBasligi,doldur,NOKTA,planBelgesi,aylikBelge,donemBelgesi,yilSonuBelgesi,kazanimBelgesi,riskBelgesi,RISK_EN_AZ_SATIR};
})(window);
