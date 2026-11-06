/* Koruk Asistan — Ortak Sınavlar: saf mantık (ekrandan bağımsız, testlenir)
 * Üç belge, okulun kullandığı resmî örneklerle birebir aynı metin ve düzendedir:
 *   1) Görevlendirme Tebliği  2) Görevli/Gözetmen Öğretmenlerin Yapacağı İş ve İşlemler (+ uyulması gereken kurallar)  3) Ortak Sınav Evrakı Teslim Tutanağı.
 * Belge gövdeleri yalnız <article> döner; kâğıt stili css/design-system-base.css (.osn-*). Çıktı merkezi ReportEngine ile yazdırılır / PDF alınır.
 * Ekran: ortak-sinav.js.
 */
(function(global){
'use strict';
if(global.OrtakSinavCore)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NOKTA='………………………',NOKTA_K='………………',NOKTA_U='…………………………………………';
const buyuk=v=>String(v??'').trim().toLocaleUpperCase('tr');

/* ── sayfalar ── */
const SAYFALAR={
 teblig:{ad:'Ortak Sınav Görevlendirme Tebliği'},
 gorevler:{ad:'Gözetmen Öğretmen Görevleri'},
 tutanak:{ad:'Ortak Sınav Evrakı Teslim Tutanağı'}
};
/* Türk alfabesindeki sıra: a b c ç d e f g ğ h ı i j k … (madde işareti). */
const HARFLER=[...'abcçdefgğhıijklmnoöprsştuüvyz'];
const KAPSAMLAR=['ülke','il','ilçe','okul'];
const kapsamNormal=v=>{const k=String(v??'').trim().toLocaleLowerCase('tr').replace(/\s*geneli$/,'');return KAPSAMLAR.includes(k)?k:'ülke'};

/* ── resmî metinler (okulun belgesinden; ekranda düzenlenebilir) ── */
const GOREVLER=[
 'Ortak yazılı sınavlar öncesinde okul müdürü tarafından yapılacak ortak yazılı sınav bilgilendirme toplantısına katılmak,',
 'Ortak yazılı sınav kâğıtlarını ve sınıf listesini sınav başlamadan en geç 10 dakika önce okul müdürlüğünden kapalı sınav güvenlik poşeti içerisinde imza karşılığı teslim almak,',
 'Sınav süresi tamamlandığında “Sınav süresi bitmiştir.” uyarısı yapmak, tüm yazılı sınav kâğıtlarını sayarak toplamak ve okul müdürlüğüne sınav güvenlik poşeti içerisinde imza karşılığı teslim etmek,',
 'Ortak yazılı sınavların sınıfta uygulanmasına yönelik iş ve işlemler konusunda öğrencileri bilgilendirmek ve “Sınavda Uyulması Gereken Kurallar”ı sınav başlamadan önce sınıfta yüksek sesle okumak,',
 'Ortak yazılı sınav başlamadan önce sınavın başlama ve bitiş saatlerini tahtaya yazmak,',
 'Ortak yazılı sınavda açık uçlu soruların cevaplarının belirlenen alanın dışına taşırmadan yazılması gerektiği konusunda öğrencileri uyarmak,',
 'Öğrencilerin, ortak yazılı sınav kâğıtları üzerine yazacakları tüm cevapları kurşun kalemle yazmalarını sağlamak,',
 'Ortak yazılı sınav kâğıdı üzerinde ilgili bölümlerin (adı, soyadı, öğrenci numarası, sınıfı/şubesi vb.) öğrenci tarafından doldurulmasını sağlamak,',
 'Ortak yazılı sınavın 100 (yüz) tam puan üzerinden değerlendirileceğini öğrencilere duyurmak,',
 'Baskı hatası tespit edilen ortak yazılı sınav kâğıtlarının değiştirilmesini sağlamak,',
 'Ortak yazılı sınavda kopya çekildiğinin tespiti hâlinde kopya çeken öğrenci için tutanak düzenleyip bu tutanağı okul müdürlüğüne teslim etmek,',
 'Ortak yazılı sınavların uygulanması aşamasında soruların görüntülerinin alınmamasını ve herhangi bir yerde paylaşımının yapılmamasını sağlamak,',
 'Ortak yazılı sınav kâğıtlarının yırtılması, okunamayacak hâle getirilmesi ya da teslim edilmemesi durumunda tutanak düzenlemek ve tutanağı okul idaresine teslim etmek,',
 'Öğrencinin ortak yazılı sınava katılım durumunu sınıf listesine işlemek (Öğrenci sınava katıldı ise “GİRDİ”, katılmadı ise “GİRMEDİ” şeklinde yazılacaktır.).'
];
const KURALLAR=[
 'Ortak yazılı sınav açık uçlu veya açık uçlu ve kısa cevaplı sorulardan oluşmaktadır. İstediğiniz sorudan başlayabilirsiniz. Sınav süresi 40 dakikadır.',
 'Her sorunun puan değeri sorunun sonunda yer almaktadır.',
 'Ortak yazılı sınav kâğıdının ilgili bölümlerini (adı, soyadı, öğrenci numarası, sınıfı/şubesi vb.) doldurunuz.',
 'Ortak yazılı sınav kâğıdınızı kontrol ediniz. Eksik sayfa veya baskı hatası var ise ortak yazılı sınav kâğıdınız değiştirilecektir.',
 'Ortak yazılı sınav kâğıdına cevaplarınızı yazabilmeniz için her sorunun altında cevaplama alanları oluşturulmuştur. Bu alana cevaplarınızı siyah kurşun kalemle yazınız.',
 'Ortak yazılı sınav esnasında kopya çektiği tespit edilen öğrenciler hakkında ilgili Yönetmelik’e göre işlem yapılacaktır.'
];
const temizListe=(l,varsayilan)=>Array.isArray(l)?l.map(x=>String(x??'').trim()).filter(Boolean):[...varsayilan];

/* ── tarih / saat ── */
const tarihAyir=iso=>/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));
const tarihNokta=(iso,bos=NOKTA_K)=>{const m=tarihAyir(iso);return m?`${m[3]}.${m[2]}.${m[1]}`:bos};
const tarihEgik=(iso,bos=NOKTA_K)=>{const m=tarihAyir(iso);return m?`${m[3]}/${m[2]}/${m[1]}`:bos};
const saatMetni=(v,bos='…… : ……')=>{const m=/^(\d{1,2})[:.](\d{2})$/.exec(String(v||'').trim());return m?`${m[1].padStart(2,'0')} : ${m[2]}`:bos};
const nokta=(v,bos=NOKTA)=>{const s=String(v??'').trim();return s||bos};

/* "7. Sınıf" + "Matematik" → "7. Sınıf Matematik" */
const sinifDers=(sinif,ders)=>[sinif,ders].map(x=>String(x??'').trim()).filter(Boolean).join(' ');

/* ── 1) Görevlendirme tebliği ──
 * m: {ustBaslik1, ustBaslik2, okul, belgeTarihi, ogretmen, sinif, ders, kapsam, sinavTarihi, tebligEden, tebligUnvan, ek} */
function tebligCumlesi(m={}){
 const t=tarihAyir(m.sinavTarihi)?tarihNokta(m.sinavTarihi):NOKTA_K,sd=sinifDers(m.sinif,m.ders)||NOKTA;
 return`${t} tarihinde yapılacak olan ${sd} dersi ${kapsamNormal(m.kapsam)} geneli ortak yazılı sınavına gözetmen öğretmen olarak görevlendirildiniz.`;
}
function gorevlendirmeBelgesi(m={}){
 const ek=String(m.ek??'Gözetmen Öğretmenin Görevleri').trim();
 return`<article class="osn-paper osn-teblig">
<header class="osn-mektup"><img class="osn-logo" src="assets/logo.png" alt=""><div class="osn-mektup-yazi"><div>T.C.</div><div>${esc(nokta(m.ustBaslik1,NOKTA_U))}</div><div>${esc(nokta(m.ustBaslik2,NOKTA_U))}</div><div>${esc(nokta(m.okul,NOKTA_U))}</div></div></header>
<div class="osn-konu"><span>Konu : Görevlendirme Tebliği</span><span>${esc(tarihEgik(m.belgeTarihi))}</span></div>
<div class="osn-muhatap"><span class="osn-sn">Sn: ${esc(nokta(m.ogretmen,NOKTA_U))}</span><span class="osn-okudum"><i>İmza</i><span>Okudum</span></span></div>
<p class="osn-govde">${esc(tebligCumlesi(m))}</p>
<p class="osn-govde">Gereğini bilgilerinize rica ederim.</p>
<div class="osn-imza"><b>${esc(nokta(m.tebligEden,NOKTA_K))}</b><span>${esc(String(m.tebligUnvan||'').trim()||'Tebliğ Eden Mdr Yrd')}</span></div>
${ek?`<div class="osn-ek"><span>Ek</span><span>: ${esc(ek)}</span></div>`:''}
</article>`;
}

/* ── 2) Gözetmen öğretmenlerin yapacağı iş ve işlemler + uyulması gereken kurallar ──
 * m: {gorevler:[], kurallar:[]} */
function gorevlerBelgesi(m={}){
 const g=temizListe(m.gorevler,GOREVLER),k=temizListe(m.kurallar,KURALLAR);
 return`<article class="osn-paper osn-gorevler">
<h2 class="osn-baslik">GÖREVLİ/GÖZETMEN ÖĞRETMENLERİN YAPACAĞI İŞ VE İŞLEMLER</h2>
<ol class="osn-liste">${g.map((x,i)=>`<li><span class="osn-no">${HARFLER[i]||String(i+1)})</span><span>${esc(x)}</span></li>`).join('')}</ol>
<h2 class="osn-baslik osn-baslik--sol osn-baslik--kural">SINAVLARDA UYULMASI GEREKEN KURALLAR</h2>
<h3 class="osn-baslik osn-baslik--alt">ORTAK YAZILI SINAVLARDA UYULMASI GEREKEN KURALLAR</h3>
<p class="osn-not">(Öğretmen tarafından sınav öncesinde sınıfta okunacaktır.)</p>
<ol class="osn-liste">${k.map((x,i)=>`<li><span class="osn-no">${i+1})</span><span>${esc(x)}</span></li>`).join('')}</ol>
</article>`;
}

/* ── 3) Ortak sınav evrakı teslim tutanağı ──
 * m: {okul, kapsam, ders, donem, sinavNo, sinavAdi (elle yazılırsa o kullanılır), sinavYeri, tarih, saat,
 *     onceKitapcik, onceTeslimEden, onceTeslimAlan, onceDiger, onceTarih, onceSaat,
 *     olumsuzluk, olumsuzlukYok, katilan, eksiksiz, gozetmenAd, gozetmenSoyad,
 *     sonraKitapcik, sonraTeslimEden, sonraTeslimAlan, sonraDiger, sonraTarih, sonraSaat} */
function sinavAdi(m={}){
 if(String(m.sinavAdi||'').trim())return String(m.sinavAdi).trim();
 const kapsam=String(m.kapsam||'').trim()?`${buyuk(kapsamNormal(m.kapsam))} GENELİ`:`${NOKTA_K} GENELİ`;
 const ders=String(m.ders||'').trim()?buyuk(m.ders):NOKTA_U;
 const d=String(m.donem||'').trim(),no=String(m.sinavNo||'').trim();
 return`${kapsam} ${ders} DERSİ ${d?`${d}.`:'… .'} DÖNEM ${no?`${no}.`:'…. .'} ORTAK YAZILI SINAVI`;
}
const sinavYeriMetni=v=>{const s=buyuk(v);return s?(/SINIFI$/.test(s)?s:`${s} SINIFI`):'…./A SINIFI'};
const kutu=sec=>`<span class="osn-kutu${sec?' osn-kutu--secili':''}" aria-hidden="true"></span>`;
const satir=metin=>`<div class="osn-satir">${esc(metin)}</div>`;
function tutanakBelgesi(m={}){
 const adet=(v,bos='…….')=>`${String(v??'').trim()||bos} adet`;
 const olumsuzlukMetni=String(m.olumsuzluk||'').trim();
 const katilan=String(m.katilan??'').trim();
 return`<article class="osn-paper osn-tutanak">
<div class="osn-kutuluk osn-kutuluk--baslik"><div>${esc(buyuk(m.okul)||NOKTA_U)}</div><div>ORTAK SINAV EVRAKI TESLİM TUTANAĞI</div></div>
<table class="osn-tablo osn-tablo--bilgi"><colgroup><col class="osn-c-etiket"><col></colgroup><tbody>
<tr><th>Sınav Adı</th><td>${esc(sinavAdi(m))}</td></tr>
<tr><th>Sınav Yeri</th><td>${esc(sinavYeriMetni(m.sinavYeri))}</td></tr>
<tr><th>Tarih ve Saat</th><td>${esc(tarihEgik(m.tarih,'…./…./202..'))} &nbsp;&nbsp; - &nbsp;&nbsp; ${esc(saatMetni(m.saat,'….. : …..'))}</td></tr>
</tbody></table>
<p class="osn-aciklama">Sınav öncesinde sınav evrakı koordinatörlükten alınırken aşağıdaki kısım doldurulacaktır.</p>
<table class="osn-tablo osn-tablo--teslim"><colgroup><col class="osn-c-sol"><col><col></colgroup><tbody><tr>
<td class="osn-sol">${satir(`Soru Kitapçığı: ${adet(m.onceKitapcik)}`)}${satir(`Diğer (belirtiniz): ${String(m.onceDiger??'Gözetmen Öğretmenin Görevleri').trim()}`)}${satir(`Tarih: ${tarihEgik(m.onceTarih,'…../…../202…')}`)}${satir(`Saat: ${saatMetni(m.onceSaat,'….. : …..')}`)}</td>
<td class="osn-imza-hucre"><b>Teslim Eden</b><span>${esc(nokta(m.onceTeslimEden,NOKTA_K))}</span></td>
<td class="osn-imza-hucre"><b>Teslim Alan</b><span>${esc(nokta(m.onceTeslimAlan,NOKTA_K))}</span></td>
</tr></tbody></table>
<table class="osn-tablo osn-tablo--olumsuzluk"><tbody>
<tr><th>Sınav sırasında gözlenen olumsuzlukları ayrıntılı olarak belirtiniz (varsa).</th></tr>
<tr><td class="osn-olumsuzluk">${esc(olumsuzlukMetni)}</td></tr>
<tr><td class="osn-imza-satiri">İmza:</td></tr>
</tbody></table>
<p class="osn-onay">${kutu(m.olumsuzlukYok)}<span>Sınav esnasında sınav ortamını bozan herhangi bir olumsuzluk yaşanmamıştır.</span></p>
<p class="osn-onay">${kutu(m.eksiksiz)}<span>Sınava ${esc(katilan||'…..')} kişi katılmıştır. Soru kitapçıkları eksiksiz alınmıştır.</span></p>
<table class="osn-tablo osn-tablo--gozetmen"><thead><tr><th></th><th>Adı</th><th>Soyadı</th><th>İmza</th></tr></thead><tbody>
<tr><th>Gözetmen</th><td>${esc(String(m.gozetmenAd||'').trim())}</td><td>${esc(String(m.gozetmenSoyad||'').trim())}</td><td></td></tr>
</tbody></table>
<p class="osn-aciklama">Sınav sonrasında sınav evrakı koordinatörlüğe teslim edilirken aşağıdaki kısım doldurulacaktır.</p>
<table class="osn-tablo osn-tablo--sonra"><colgroup><col class="osn-c-etiket"><col class="osn-c-deger"><col><col></colgroup><tbody>
<tr><th>Soru Kitapçığı:</th><td>${esc(adet(m.sonraKitapcik,'………'))}</td><td class="osn-imza-hucre" rowspan="4"><b>Teslim Eden</b><span>${esc(nokta(m.sonraTeslimEden,NOKTA_K))}</span></td><td class="osn-imza-hucre" rowspan="4"><b>Teslim Alan</b><span>${esc(nokta(m.sonraTeslimAlan,NOKTA_K))}</span></td></tr>
<tr><th>Diğer (belirtiniz):</th><td>${esc(String(m.sonraDiger??'').trim())}</td></tr>
<tr><th>Tarih:</th><td>${esc(tarihEgik(m.sonraTarih,'…./…./202…'))}</td></tr>
<tr><th>Saat:</th><td>${esc(saatMetni(m.sonraSaat,'……. : ……..'))}</td></tr>
</tbody></table>
</article>`;
}

global.OrtakSinavCore={SAYFALAR,HARFLER,KAPSAMLAR,kapsamNormal,GOREVLER,KURALLAR,temizListe,tarihNokta,tarihEgik,saatMetni,sinifDers,tebligCumlesi,sinavAdi,sinavYeriMetni,gorevlendirmeBelgesi,gorevlerBelgesi,tutanakBelgesi};
})(window);
