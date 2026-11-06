/* Koruk Asistan — Ortak Sınavlar: saf mantık (ekrandan bağımsız, testlenir)
 * Görevlendirme tebliği, gözetmen görev listesi ve sınav evrakı teslim tutanağı için
 * belge gövdeleri, tarih biçimleri ve yardımcı fonksiyonlar.
 * Ekran: ortak-sinav.js  Çıktı: ReportEngine.printReport()
 */
(function(global){
'use strict';
if(global.OrtakSinavCore)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NOKTA='………………………', NK='……………………';

/* ── tarih ── */
const tarihMetni=(iso,bos=NK)=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));return m?`${m[3]}.${m[2]}.${m[1]}`:bos};
const isoBugün=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const gunAdlari=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const tarihGun=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));if(!m)return'';const d=new Date(`${m[1]}-${m[2]}-${m[3]}`);return gunAdlari[d.getDay()]||''};

/* ── gözetmen görev listesi ── */
const GOZETMEN_GOREVLERI=[
 'Gözetmen öğretmenler, görevli oldukları sınavlardan 15 dakika önce sınav merkezinde hazır bulunur.',
 'Sınav salonlarını sınav başlamadan önce sıra numaralarına ve aday sayısına göre düzenler.',
 'Adayların sınav salonlarına usul ve nizama uygun girişini sağlar, kimlik kontrolünü yapar.',
 'Sınav başlamadan önce adaylara sınavın kurallarını hatırlatır.',
 'Sınav süresince salon içinde gereken düzen ve güveni sağlar; kopya girişimini önler.',
 'Sınav süresince adayların birbirleriyle konuşmasına ve başkasının cevaplarını görmesine izin vermez.',
 'Sınav süresi boyunca salon içinde devamlı dolaşır; masalara yaslanmaz, oturmaz.',
 'Sınav süresince yanında çalışır durumda cep telefonu bulundurmaz; acil durumlarda salon dışında kullanır.',
 'Adayların soru kitapçığını ve cevap kâğıdını zamanında alıp almadığını kontrol eder.',
 'Sınav süresi dolduğunda adayların kalemleri bırakmasını sağlar ve cevap kâğıtlarını toplar.',
 'Toplanan cevap kâğıtlarını salon tutanağı ile birlikte sınav komisyonuna teslim eder.'
];

const SINAV_KURALLARI=[
 'Sınava girmek için kimlik belgesi (nüfus cüzdanı, pasaport veya sürücü belgesi) zorunludur.',
 'Cep telefonu, akıllı saat ve iletişim cihazları sınav salonuna alınmaz.',
 'Sınav süresince adaylar soru kitapçığı dışına herhangi bir şey yazamaz.',
 'Sınav başladıktan sonra ilk 15 dakika içinde ve son 15 dakika içinde salon terk edilemez.',
 'Sınavda kopya girişimi tespit edilen adayın sınavı geçersiz sayılır.',
 'Sınav kurallarına uymayan adaylar salondan çıkarılır ve tutanağa geçirilir.'
];

/* ── kapsam ── */
const KAPSAM_SECENEKLERI=['Ülke Geneli','İl Geneli','İlçe Geneli','Okul Geneli'];

/* ── ortak belge stili (tüm bölümler) ── */
function okulBasi(okul,yil,logo){
 const logoHtml=logo?`<img src="${esc(logo)}" alt="Okul logosu" class="os-logo">`:`<div class="os-logo-yer">🏫</div>`;
 return`<div class="os-okul-basi"><div class="os-logo-alan">${logoHtml}</div><div class="os-okul-bilgi"><div class="os-okul-adi">${esc(okul||NOKTA)}</div><div class="os-yil">${esc(yil||'')}</div></div></div>`;
}

/* ══════════════════════════════════════════════
   GÖREVLENDİRME TEBLİĞİ
══════════════════════════════════════════════ */
/* m: {okul, yil, logo, tarih, sayi, sinif, ders, kapsam, ogretmen, gorevlendiren, gorevlendirenUnvan} */
function gorevlendirmeBelgesi(m={}){
 const tarih=tarihMetni(m.tarih);
 const sinifDers=([m.sinif,m.ders].filter(Boolean).join(' '))||NOKTA;
 return`<article class="os-paper">
<div class="os-meb-bant">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
${okulBasi(m.okul,m.yil,m.logo)}
<div class="os-belge-no"><span>Sayı: <b>${esc(m.sayi||NK)}</b></span><span>Tarih: <b>${tarih}</b></span></div>
<h2 class="os-baslik">GÖREVLENDİRME TEBLİĞİ</h2>
<table class="os-bilgi-tablo">
 <tr><th>Adı Soyadı</th><td>${esc(m.ogretmen||NOKTA)}</td></tr>
 <tr><th>Görevi</th><td>${esc(m.gorev||'Öğretmen')}</td></tr>
 <tr><th>Sınıf / Ders</th><td>${esc(sinifDers)}</td></tr>
 <tr><th>Sınav Kapsamı</th><td>${esc(m.kapsam||NOKTA)}</td></tr>
 <tr><th>Sınav Tarihi</th><td>${esc(m.sinavTarihi?tarihMetni(m.sinavTarihi):NOKTA)}</td></tr>
 <tr><th>Sınav Saati</th><td>${esc(m.sinavSaati||NK)}</td></tr>
 <tr><th>Salon</th><td>${esc(m.salon||NK)}</td></tr>
</table>
<div class="os-aciklama">
 <p>Yukarıda bilgileri yazılı ${esc(m.ogretmen||'Sayın Öğretmen')}, <b>${esc(m.kapsam||NOKTA)}</b> kapsamında
 yapılacak ortak sınavda <b>${esc(sinifDers)}</b> sınavında gözetmen olarak görevlendirilmiştir.</p>
 <p>Gereğini saygılarımla arz ederim.</p>
</div>
<div class="os-imza-alan">
 <div class="os-imza-blok">
  <p class="os-imza-unvan">${esc(m.gorevlendirenUnvan||'Müdür Yardımcısı')}</p>
  <p class="os-imza-ad">${esc(m.gorevlendiren||NOKTA)}</p>
  <p class="os-imza-cizgi"></p>
 </div>
</div>
<div class="os-teblig-alt">
 <p><b>Tebliğ Tarihi:</b> ${tarih} &nbsp;&nbsp; <b>Tebliğ Alan:</b> ${esc(m.ogretmen||NOKTA)}</p>
 <p class="os-imza-cizgi os-imza-cizgi--kisa"></p>
</div>
</article>`;
}

/* ══════════════════════════════════════════════
   GÖZETMEN ÖĞRETMEN GÖREVLERİ
══════════════════════════════════════════════ */
/* gorevler: string[], kurallar: string[] */
function gozetmenGorevleriBelgesi(okul,yil,logo,gorevler,kurallar){
 const gorevListesi=(gorevler||GOZETMEN_GOREVLERI).map((g,i)=>`<li><b>${String.fromCharCode(97+i)})</b> ${esc(g)}</li>`).join('');
 const kuralListesi=(kurallar||SINAV_KURALLARI).map((k,i)=>`<li>${i+1}. ${esc(k)}</li>`).join('');
 return`<article class="os-paper">
${okulBasi(okul,yil,logo)}
<h2 class="os-baslik">GÖZETMEN ÖĞRETMEN GÖREVLERİ</h2>
<section class="os-gorev-liste">
 <h3>Gözetmen Öğretmenlerin Görevleri</h3>
 <ol class="os-liste" type="a">${gorevListesi}</ol>
</section>
<section class="os-gorev-liste">
 <h3>Sınavlarda Uyulması Gereken Kurallar</h3>
 <ol class="os-liste">${kuralListesi}</ol>
</section>
</article>`;
}

/* ══════════════════════════════════════════════
   SINAV EVRAKI TESLİM TUTANAĞI
══════════════════════════════════════════════ */
/* m: {okul, yil, logo, sinavAdi, sinavYeri, tarih, saat,
        onceki:{soruKitabi, teslimEden, teslimAlan, diger, tarih, saat},
        sirasinda:{olumsuzluk:bool, olumsuzlukAciklama, katilimci, kitapciDurum},
        sonrasi:{soruKitabi, teslimEden, teslimAlan, tarih, saat},
        gozetmen:{ad, soyad} } */
function tutanakBelgesi(m={}){
 const onc=m.onceki||{}, sir=m.sirasinda||{}, son=m.sonrasi||{}, gzt=m.gozetmen||{};
 const satir=(label,val)=>`<tr><th>${esc(label)}</th><td>${esc(val||NK)}</td></tr>`;
 const cb=val=>`<span class="os-cb${val?' os-cb--secili':''}">${val?'☑':'☐'}</span>`;
 return`<article class="os-paper">
${okulBasi(m.okul,m.yil,m.logo)}
<h2 class="os-baslik">SINAV EVRAKI TESLİM TUTANAĞI</h2>
<table class="os-bilgi-tablo">
 ${satir('Sınav Adı',m.sinavAdi)}
 ${satir('Sınav Yeri (Sınıf/Şube)',m.sinavYeri)}
 ${satir('Tarih',m.tarih?tarihMetni(m.tarih):'')}
 ${satir('Saat',m.saat)}
</table>

<h3 class="os-alt-baslik">A) Sınav Öncesi</h3>
<table class="os-bilgi-tablo">
 ${satir('Soru Kitapçığı Adedi',onc.soruKitabi)}
 ${satir('Teslim Eden',onc.teslimEden)}
 ${satir('Teslim Alan',onc.teslimAlan)}
 ${satir('Diğer',onc.diger)}
 ${satir('Tarih / Saat',[(onc.tarih?tarihMetni(onc.tarih):''), onc.saat].filter(Boolean).join(' / '))}
</table>

<h3 class="os-alt-baslik">B) Sınav Sırasında</h3>
<table class="os-bilgi-tablo">
 <tr><th>Olumsuzluk</th><td>${cb(sir.olumsuzluk)} Var &nbsp;&nbsp; ${cb(!sir.olumsuzluk)} Yok<br><span class="os-aciklama-kucuk">${esc(sir.olumsuzlukAciklama||'')}</span></td></tr>
 ${satir('Katılımcı Sayısı',sir.katilimci)}
 ${satir('Kitapçık Durumu',sir.kitapciDurum)}
</table>

<div class="os-gozetmen-imza">
 <table class="os-bilgi-tablo">
  ${satir('Gözetmen Adı',gzt.ad)}
  ${satir('Gözetmen Soyadı',gzt.soyad)}
 </table>
 <div class="os-imza-kutu"><p>İmza</p><div class="os-imza-alan-bos"></div></div>
</div>

<h3 class="os-alt-baslik">C) Sınav Sonrası</h3>
<table class="os-bilgi-tablo">
 ${satir('Soru Kitapçığı Adedi',son.soruKitabi)}
 ${satir('Teslim Eden',son.teslimEden)}
 ${satir('Teslim Alan',son.teslimAlan)}
 ${satir('Tarih / Saat',[(son.tarih?tarihMetni(son.tarih):''), son.saat].filter(Boolean).join(' / '))}
</table>
</article>`;
}

/* ── print wrapper ── */
function printHtml(belgeIcerigi){
 return`<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#111;background:#fff}
@page{size:A4;margin:16mm 14mm}
@media print{body{background:#fff}.os-paper{box-shadow:none;margin:0;padding:0;page-break-after:always}}
.os-paper{max-width:794px;margin:0 auto;padding:14mm 14mm 14mm 14mm;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.os-meb-bant{text-align:center;font-weight:700;font-size:9pt;letter-spacing:.05em;border-bottom:2px solid #1a237e;padding-bottom:4px;margin-bottom:10px;color:#1a237e}
.os-okul-basi{display:flex;align-items:center;gap:14px;margin-bottom:10px;border-bottom:1px solid #ccc;padding-bottom:8px}
.os-logo-alan{flex:0 0 64px;display:flex;align-items:center;justify-content:center}
.os-logo{max-width:64px;max-height:64px;object-fit:contain}
.os-logo-yer{font-size:40px;line-height:1}
.os-okul-adi{font-size:13pt;font-weight:700;color:#1a237e}
.os-yil{font-size:9pt;color:#555;margin-top:2px}
.os-belge-no{display:flex;gap:24px;font-size:9pt;margin-bottom:8px;color:#333}
.os-baslik{text-align:center;font-size:13pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin:10px 0 10px;border-bottom:2px solid #1a237e;padding-bottom:4px}
.os-alt-baslik{font-size:10pt;font-weight:700;margin:10px 0 4px;color:#1a237e}
.os-bilgi-tablo{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:10pt}
.os-bilgi-tablo th,.os-bilgi-tablo td{border:1px solid #bbb;padding:4px 8px;text-align:left;vertical-align:top}
.os-bilgi-tablo th{background:#f0f4ff;font-weight:600;width:38%}
.os-aciklama{margin:10px 0;font-size:10pt;line-height:1.6}
.os-aciklama p{margin-bottom:6px}
.os-imza-alan{display:flex;justify-content:flex-end;margin-top:14px}
.os-imza-blok{text-align:center;min-width:200px}
.os-imza-unvan{font-size:9pt;font-weight:600;margin-bottom:4px}
.os-imza-ad{font-size:10pt;font-weight:700}
.os-imza-cizgi{border-top:1px solid #333;width:200px;margin:24px auto 4px}
.os-imza-cizgi--kisa{width:140px;margin:12px 0 2px}
.os-teblig-alt{margin-top:12px;font-size:9.5pt;border-top:1px dashed #aaa;padding-top:6px}
.os-gorev-liste{margin-bottom:12px}
.os-gorev-liste h3{font-size:10.5pt;font-weight:700;margin-bottom:6px;color:#1a237e}
.os-liste{padding-left:0;list-style:none;font-size:10pt;line-height:1.65}
.os-liste li{margin-bottom:4px;padding-left:4px}
.os-gozetmen-imza{display:flex;gap:16px;align-items:flex-start;margin-bottom:8px}
.os-gozetmen-imza .os-bilgi-tablo{flex:1}
.os-imza-kutu{flex:0 0 140px;text-align:center;font-size:9pt;font-weight:600;padding-top:4px}
.os-imza-alan-bos{border:1px solid #bbb;height:56px;margin-top:4px}
.os-cb{font-size:13pt;line-height:1}
.os-aciklama-kucuk{font-size:9pt;color:#555}
</style></head><body>${belgeIcerigi}</body></html>`;
}

global.OrtakSinavCore={
 isoBugün, tarihMetni, tarihGun,
 GOZETMEN_GOREVLERI, SINAV_KURALLARI, KAPSAM_SECENEKLERI,
 gorevlendirmeBelgesi, gozetmenGorevleriBelgesi, tutanakBelgesi,
 printHtml
};
})(window);
