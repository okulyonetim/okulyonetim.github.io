/* Koruk Asistan — Projeler › Maarif'in Kalbinde Oyun: yıllık plan belgesi (önizleme · PDF · Word) ve özelleştirilebilir imza bölümü
 * - PLAN: Word şablonlarındaki (assets/ogretmen-dosyasi/maarifin-kalbinde-oyun-yillik-plan-*.docx) başlık, haftalık tablo ve uygulama esaslarıyla aynı içerik (testle karşılaştırılır).
 * - belge(): A4 yatay belge gövdesi; sayfadaki önizleme ve ReportEngine çıktısı (Yazdır / PDF) aynı kâğıt stilini kullanır (css/design-system-base.css .mpl-*).
 * - İmza bölümü: soldaki imza sahipleri (ad, unvan; ekle / sil / sırala) + sağdaki onay bloğu (ibare, tarih, ad, unvan). Ad "null" ise uygulamadan gelir (ilk imza: plan hazırlayan, onay: okul müdürü).
 * - imzaXml(): aynı imza düzenini Word şablonunun son tablosu olarak yazar (şablonun yazı tipi ve boyutlarıyla).
 * Sayfa: maarif-oyun.js. İçerik metinleri: maarif-oyun-veri.js.
 */
(function(global){
'use strict';
if(global.MaarifOyunPlan)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NOKTA='……………………………';
/* Haftalık satırlar: ilkokul [ay, hafta, hafta notu, 1–2. sınıf, 3–4. sınıf, kazanım, ayın oyunu, oyun notu]; ortaokul [ay, tema, örnek, amaç, önerilen oyun]; düz metin = tatil satırı. */
const PLAN={
 ilkokul:{
  ust:"2026-2027 EĞİTİM-ÖĞRETİM YILI",baslik:"MAARİFİN KALBİNDE OYUN",alt:"YILLIK ÇALIŞMA PLANI (İLKOKUL)",not:"1–4. sınıflar · haftalık oyun planı ve ayın geleneksel oyunu",
  bilgi:[["PLANI HAZIRLAYAN ÖĞRETMENLER",null],["UYGULAYACAK OLANLAR","Tüm sınıf öğretmenleri"],["UYGULAMA SÜRESİ","14 Eylül 2026 – 25 Haziran 2027"]],
  sutunlar:["AY","HAFTA","1–2. SINIF OYUNLARI","3–4. SINIF OYUNLARI","KAZANIM / ODAK","AYIN GELENEKSEL OYUNU"],
  satirlar:[
   ["EYLÜL","14–18 Eylül","","İsmimi Unutma, Tanışma Balonları (tanışma oyunları)","Düğüm Çözme, Güven Çemberi (aidiyet etkinlikleri)","Okul iklimi ve sosyal bağ kurma","Bom","İlköğretim Haftası"],
   ["EYLÜL","21–25 Eylül","","Köşe Kapmaca (fizikî alanları tanıma)","Okul Bahçesi Krokisi (yön bulma yarışması)","Alan farkındalığı ve okulu tanıma","Düğüm","tanışma ve sınıf kuralları"],
   ["EYLÜL","28 Eylül – 2 Ekim","","Don-Ateş (tepki hızı ve basit komut takibi)","Ebe Beni Bul (grup strateji oyunu)","Dikkat, odaklanma ve kurallara uyma","Düğüm","tanışma ve sınıf kuralları"],
   ["EKİM","5–9 Ekim","","Müzikli Heykeller (ritim ve beden kontrolü)","Ritim Aktarımı (grup uyumu oyunu)","Ritim ve motor koordinasyon","Çuval Yarışı","güz şenliği"],
   ["EKİM","12–16 Ekim","","Yağ Satarım Bal Satarım (şarkılı ritim oyunu)","Mendil Kapmaca (takım stratejisi ve çeviklik)","Geleneksel çocuk oyunları ve kültür","Çuval Yarışı","güz şenliği"],
   ["EKİM","19–23 Ekim","","Körebe (duyusal algı ve güven)","Yakar Top (grup dinamikleri ve savunma)","Duyusal algı ve takım hâlinde oynama","Esir","29 Ekim Cumhuriyet Bayramı"],
   ["EKİM","26–30 Ekim","29 Ekim resmî tatil","Cumhuriyet Meşalesi Parkuru (basit istasyonlar)","Cumhuriyet Meşalesi Parkuru (bilgi istasyonları)","Millî ve manevi değerler (Cumhuriyet Haftası)","Esir","29 Ekim Cumhuriyet Bayramı"],
   ["KASIM","2–6 Kasım","","Seksek (kaba motor, tek-çift ayak denge)","Dokuz Taş (taktik düşünme, hamle analizi)","Denge, koordinasyon ve taktik beceriler","İsim Şehir","10 Kasım — Atatürk ve Cumhuriyet kategorileri"],
   ["KASIM","9–13 Kasım","10 Kasım Atatürk’ü Anma","Renk ve Şekil Labirenti (zemin kodlama oyunu)","Dev XOX (stratejik hamle ve öngörü)","Strateji geliştirme ve yön algısı","İsim Şehir","10 Kasım — Atatürk ve Cumhuriyet kategorileri"],
   "16–20 Kasım 2026 · Birinci Dönem Ara Tatili (20 Kasım Dünya Çocuk Hakları Günü)",
   ["KASIM","23–27 Kasım","24 Kasım Öğretmenler Günü","Hedefe Halka Atma (mesafe tahmini)","Kule İnşası (bardaklarla en yüksek kule)","El-göz koordinasyonu ve problem çözme","Mangala","24 Kasım Öğretmenler Günü"],
   ["ARALIK","30 Kasım – 4 Aralık","","Kelime Avcısı (harf ve hece oyunları)","Gizemli Kelime (anlatım becerisi oyunu)","Bilişsel esneklik ve kelime dağarcığı","Beştaş","3 Aralık Dünya Engelliler Günü"],
   ["ARALIK","7–11 Aralık","","Gölge Takibi (gözlem, ışık-gölge kavramı)","Kibrit Çöpü Bilmeceleri (mantık yürütme)","Mantıksal akıl yürütme ve gözlem","Beştaş","3 Aralık Dünya Engelliler Günü"],
   ["ARALIK","14–18 Aralık","","Çizgi Üstünde Yürüme (denge ve nesne taşıma)","Eşli İp Atlama (zamanlama ve uyum)","Denge ve motor beceriler","Turşucular","Yerli Malı Haftası"],
   ["ARALIK","21–25 Aralık","","Labut Devirme (hedef alma ve sayma)","Hedef Vurma Parkuru (puanlı halkalara isabet)","Hedef alma ve mesafe algısı","Turşucular","Yerli Malı Haftası"],
   ["ARALIK","28 Aralık – 1 Ocak","1 Ocak resmî tatil","Ayna Oyunu (hareketleri taklit etme)","Kör Kılavuz (sesle yönlendirilen engelli parkur)","Motor koordinasyon ve karşılıklı güven","Turşucular","Yerli Malı Haftası"],
   ["OCAK","4–8 Ocak","","Balon Havada (balonu yere düşürmeme)","Paslaşma Zinciri (el-ayak koordinasyonu)","Beden farkındalığı ve hızlı tepki","Hımbıl","kış — sınıf içi oyun"],
   ["OCAK","11–15 Ocak","","Duygu Tombalası (yüz ifadelerini tanıma, empati)","Rol Değişimi (drama ile problem çözme)","Sosyal-duygusal öğrenme ve empati","Hımbıl","kış — sınıf içi oyun"],
   ["OCAK","18–22 Ocak","22 Ocak birinci dönem sonu","Aile ve Oyun Haftası (akıl oyunları)","Aile ve Oyun Haftası (strateji oyunları)","Veli katılımı ve dönem sonu değerlendirme","Üçtaş","dönem sonu akıl oyunları"],
   "25 Ocak – 5 Şubat 2027 · Yarıyıl Tatili",
   ["ŞUBAT","8–12 Şubat","","Düğüm Olalım (grup hâlinde iş birliği)","Sessiz Sinema (beden diliyle kavram anlatımı)","İş birliği ve beden dilini kullanma","Tikoça","ikinci dönem ısınma oyunları"],
   ["ŞUBAT","15–19 Şubat","","Origami Hayvanları (kâğıt katlama)","Tangram Dünyası (geometrik hikâye panosu)","İnce motor beceri ve uzamsal düşünme","Tikoça","ikinci dönem ısınma oyunları"],
   ["ŞUBAT","22–26 Şubat","","Büyük Boy Yapboz (parça-bütün ilişkisi)","Üç Boyutlu Mimari (kürdan ve oyun hamuru)","Tasarım, üretkenlik ve geometrik algı","Oturan Top","kapalı alanda hareket"],
   ["MART","1–5 Mart","1–7 Mart Yeşilay Haftası","Mandallarla Örüntü (kurala göre renkli dizilim)","Şifre Çözme (matematiksel gizli yönergeler)","Örüntü kurma ve analitik düşünme","Çember Çevirme","Yeşilay Haftası — ekran yerine oyun"],
   "8–12 Mart 2027 · İkinci Dönem Ara Tatili (Ramazan Bayramı)",
   ["MART","15–19 Mart","","Düğme İlikleme Yarışı (günlük yaşam becerisi)","Makrome ve Örgü (iplerle düğüm teknikleri)","Öz bakım ve el becerisi","Hodak","Orman Haftası"],
   ["MART","22–26 Mart","21–26 Mart Orman Haftası","Doğa Dedektifleri (yaprak ve taş toplama)","Yönümü Buluyorum (pusula ile nesne arama)","Doğa keşfi ve açık hava etkinlikleri","Hodak","Orman Haftası"],
   ["MART","29 Mart – 2 Nisan","","Bahçe Satrancı / Seksek (dev boyutlu alan oyunu)","Ekolojik Ayak İzi Parkuru (geri dönüşüm yarışı)","Çevre bilinci ve büyük alanda hareket","Hodak","Orman Haftası"],
   ["NİSAN","5–9 Nisan","","Rüzgâr Gülü Yarışı (hız oyunu)","Doğal Heykeltıraş (çamur, taş ve çırpıyla)","Duyusal bütünleme ve yaratıcılık","Yılan (Zirve)","bahar ve bahçe oyunları"],
   ["NİSAN","12–16 Nisan","","Kuş Yemliği Yapımı (el becerisi)","Su Taşıma Zinciri (delikli bardaklarla takım)","Hayvan sevgisi ve takım dayanışması","Yılan (Zirve)","bahar ve bahçe oyunları"],
   ["NİSAN","19–23 Nisan","23 Nisan resmî tatil","23 Nisan Aile Korosu (ritim provaları)","23 Nisan Aile Korosu (müzikli drama provaları)","Estetik ve ritmik duyguların gelişimi","Yakan Top","23 Nisan oyun şenliği"],
   ["NİSAN","26–30 Nisan","","Haklarım ve Sorumluluklarım (kart eşleştirme)","Benim Çizgi Romanım (canlandırmalı pano)","Çocuk hakları ve egemenlik bilinci","Yakan Top","23 Nisan oyun şenliği"],
   ["MAYIS","3–7 Mayıs","","Şenlik Günü Yarışmaları (çuval yarışı, yumurta taşıma)","Şenlik Günü Yarışmaları (halat çekme, istasyonlar)","Şenlik oyunları ve takım ruhu","Topaç Çevirme","Anneler Günü — kuşaktan kuşağa"],
   ["MAYIS","10–14 Mayıs","","Mikrofon Sende (tarihî karakter draması)","Mikrofon Sende (Türk bilim insanlarını canlandırma)","Tarih bilinci ve topluluk önünde konuşma","Topaç Çevirme","Anneler Günü — kuşaktan kuşağa"],
   ["MAYIS","17–21 Mayıs","17–19 Mayıs Kurban Bayramı ve 19 Mayıs tatil (20–21 Mayıs)","Kelime Treni (son harfle yeni kelime)","Hikâye Küpleri (görsellerle hikâye kurgulama)","Dil gelişimi ve sözel ifade","Devridağ","19 Mayıs"],
   ["MAYIS","24–28 Mayıs","","Hece Avı (hecelerden kelime yapma)","Anlamını Bul (atasözleriyle sessiz sinema)","Okuryazarlık ve kültürel deyimler","Devridağ","19 Mayıs"],
   ["HAZİRAN","31 Mayıs – 4 Haziran","","Tekerleme Atışması (grup oyunu)","Kelime Türetme (masa başı taktik oyunu)","Diksiyon, kelime türetme ve akıl yürütme","Fasulye Torbası Atma","5 Haziran Dünya Çevre Günü"],
   ["HAZİRAN","7–11 Haziran","","Zıt Anlam Tombalası (kavram kartları)","Hızlı Okuma Parkuru (metin istasyonları)","Kavram gelişimi ve okuma akıcılığı","Fasulye Torbası Atma","5 Haziran Dünya Çevre Günü"],
   ["HAZİRAN","14–18 Haziran","","Geleneksel Oyunlar Turnuvası (sınıflar arası)","Geleneksel Oyunlar Turnuvası (sınıflar arası)","Yıl sonu dostça rekabet ve kurallara saygı","Simit","yıl sonu şenliği"],
   ["HAZİRAN","21–25 Haziran","25 Haziran ders yılı sonu","İstasyon Şenliği (yüz boyama, ritim, kil)","İstasyon Şenliği (serbest tasarım, drama)","Eğlenerek öğrenme ve veda etkinlikleri","Simit","yıl sonu şenliği"],
  ],
  esaslar:[
   "Haftalık oyunlar sınıf düzeyine göre iki grupta verilmiştir; sınıfın durumuna göre aynı hafta içinde yer değiştirilebilir.",
   "“Ayın geleneksel oyunu” sütunundaki oyunlar MEB Temel Eğitim Genel Müdürlüğünün “Yüz Yüze 100 Çocuk Oyunu” kitabından seçilmiştir; her oyun yaklaşık iki hafta oynatılır ve en az üç kez tekrar edilir.",
   "Ayın oyunu okul panosunda duyurulur; teneffüslerde nöbetçi öğretmenler de aynı oyunu başlatabilir.",
   "Hava uygunsa oyunlar bahçede, değilse salon ya da sınıfta oynanır; her ayda bir hareketli bir de sakin (akıl-dil) oyun bulunur.",
   "Kurallar oyundan önce öğrencilerle birlikte konuşulur. Elemeli oyunlarda oyun dışı kalan öğrenciye hakem, puan yazıcı gibi görevler verilir.",
   "Güvenlik: oyun alanı önceden kontrol edilir; ebeleme omuz ve sırta hafif dokunuşla yapılır; top yumuşak seçilir ve belden aşağı atılır; hareketli oyunlardan önce ısınma, ara ara su molası verilir.",
   "Kapsayıcılık: özel gereksinimli öğrenciler için oturarak ya da eşli oynama, mesafeyi kısaltma gibi uyarlamalar yapılır.",
   "Oyunlar veli iletişim kanallarıyla aileye duyurulur; büyükanne ve büyükbabalar sınıfa davet edilerek oyunların yöresel söyleyişleri derlenebilir.",
   "Plan bir öneridir; hava durumu, sınav ve okul etkinliklerine göre haftalar arasında değişiklik yapılabilir.",
  ],
  imzaSayisi:3,imzaUnvan:"Sınıf Öğretmeni"
 },
 ortaokul:{
  ust:"2026-2027 EĞİTİM-ÖĞRETİM YILI",baslik:"MAARİFİN KALBİNDE OYUN",alt:"YILLIK TEMA VE OYUN PLANI (ORTAOKUL)",not:"5–8. sınıflar · aylık tema, örnek oyun ve önerilen geleneksel oyun",
  bilgi:[["PLANI HAZIRLAYAN",null],["UYGULAYACAK OLANLAR","Tüm öğretmenler"],["UYGULAMA SÜRESİ","14 Eylül 2026 – 25 Haziran 2027"]],
  sutunlar:["AY","TEMA","ÖRNEK OYUN / ETKİNLİK","AÇIKLAMA / AMAÇ","ÖNERİLEN GELENEKSEL OYUN · BELİRLİ GÜN"],
  satirlar:[
   ["EYLÜL","Okul, Oyun ve Uyum","İsim Yumağı ve Tanışma Halkası","Okula oyunla uyum sağlar, arkadaşlarıyla bağ kurar ve okula aidiyet duygusunu geliştirir.","Düğüm — İlköğretim Haftası; tanışma ve sınıf kurallarını birlikte belirleme"],
   ["EKİM","Hareket Et, Oyna, Sağlıklı Kal","Hareketli Parkur ve Eğlenceli İstasyonlar","Hareketli oyunlarla bedenini tanır, aktif yaşam alışkanlığı kazanır ve sağlıklı seçimler yapar.","Çuval Yarışı · Esir — 29 Ekim Cumhuriyet Bayramı, takım ruhu"],
   ["KASIM","Oyun Benim Hakkım, Oyunumu Oynarım","Çocuk Hakları Meclisi ve Kendi Oyununu Tasarla","Oyun hakkını bilir, fikrini ifade eder ve oyun süreçlerine katılır.","İsim Şehir (Atatürk ve Cumhuriyet kategorileri) — 10 Kasım; 20 Kasım Dünya Çocuk Hakları Günü"],
   "16–20 Kasım 2026 · Birinci Dönem Ara Tatili",
   ["ARALIK","Oyunla Düşün, Üret","Geri Dönüşüm Atölyesi ve Tasarım Oyunu","Oyunla düşünür, dener, tasarlar ve üretme sürecine katılır.","Mangala · Beştaş — 3 Aralık Dünya Engelliler Günü (herkesin oynayabileceği oyunlar)"],
   ["OCAK","Oyunla Öğreniyorum","Evde Keşif Bulmacası ve Aile Bilmece Saati","Oyunla öğrenir, ailesiyle keşfeder ve yaşam becerilerini geliştirir.","Hımbıl · Üçtaş — kış aylarında sınıf içi akıl oyunları"],
   "25 Ocak – 5 Şubat 2027 · Yarıyıl Tatili",
   ["ŞUBAT","Dijital Çağda Güvenle Oynuyorum","Güvenli Dijital Labirent ve İnternet Avcıları","Dijital oyunların yaş ve içerik uyarılarını tanır, güvenli oyun alışkanlığı geliştirir.","Oturan Top · Tikoça — ekran yerine yüz yüze hareketli oyun"],
   ["MART","Geleneksel Çocuk Oyunları","Mendil Kapmaca, Tombik ve Seksek","Geleneksel oyunları tanır, kültürel değerlerle bağ kurar ve oyun kültürünü sürdürür.","Çember Çevirme — 1–7 Mart Yeşilay Haftası · Hodak — 21–26 Mart Orman Haftası"],
   "8–12 Mart 2027 · İkinci Dönem Ara Tatili (Ramazan Bayramı)",
   ["NİSAN","Herkes Oyuna, Her Yerde Oyun","Kapsayıcı Bahçe Oyunları ve Dostluk Halkası","Farklı ortamlarda oyun kurar, birlikte oynar ve herkesin oyuna katılımını önemser.","Yakan Top — 23 Nisan sınıflar arası oyun şenliği · Yılan (Zirve)"],
   ["MAYIS","Ailemle Oynuyorum","Geleneksel Aile Oyun Günü ve İp Atlama Şenliği","Ailesiyle oyun yoluyla bağ kurar, paylaşır ve birlikte zaman geçirmenin değerini bilir.","Topaç Çevirme — Anneler Günü, kuşaktan kuşağa oyun · Devridağ — 19 Mayıs"],
   ["HAZİRAN","Oyun Şenliği","Yıl Sonu Bahar Şenliği ve Oyun İstasyonları","Yıl boyunca edindiği bilgi, beceri ve deneyimleri oyunla paylaşır; iş birliği, öz güven ve aidiyet duygusunu geliştirir.","Fasulye Torbası Atma — 5 Haziran Dünya Çevre Günü (artık kumaştan malzeme) · Simit"],
  ],
  esaslar:[
   "Bütüncül ve beceri temelli yaklaşım: oyunlar seçilirken yalnız fiziksel hareket değil; bilişsel, duygusal, sosyal ve motor becerilerin birlikte gelişimi hedeflenir.",
   "Kültürel aktarım ve aile katılımı: özellikle Mart (Geleneksel Çocuk Oyunları) ve Mayıs (Ailemle Oynuyorum) aylarında veli katılımı teşvik edilerek okul-aile iş birliği güçlendirilir.",
   "Kapsayıcılık: etkinlikler, özel gereksinimli öğrenciler dâhil sınıftaki bütün öğrencilerin katılımına uygun biçimde uyarlanır.",
   "“Önerilen geleneksel oyun” sütunundaki oyunlar MEB Temel Eğitim Genel Müdürlüğünün “Yüz Yüze 100 Çocuk Oyunu” kitabındaki oyunlardandır; ortaokul öğrencileri için kurallar zorlaştırılabilir, turnuva ya da sınıflar arası şenlik hâline getirilebilir.",
   "Güvenlik: oyun alanı önceden kontrol edilir; ebeleme hafif dokunuşla yapılır, top yumuşak seçilir ve belden aşağı atılır.",
   "Teneffüs oyunu: ayın oyunu okul panosunda duyurulur; öğrenci kulüpleri ve nöbetçi öğretmenler teneffüslerde oyunu başlatabilir.",
  ],
  imzaSayisi:2,imzaUnvan:"Hazırlayan Öğretmen"
 }
};

const YIL_BAS=PLAN.ilkokul.ust.slice(0,4);
const ENCOK_IMZA=6,AD_ENCOK=80,UNVAN_ENCOK=60,ETIKET_ENCOK=30;
const kes=(v,n)=>String(v??'').slice(0,n);

/* ── imza düzeni ── */
const varsayilanImza=plan=>({
 imzalar:Array.from({length:PLAN[plan]?.imzaSayisi||0},(_,i)=>({ad:i===0?null:'',unvan:PLAN[plan].imzaUnvan})),
 onay:{goster:true,etiket:'UYGUNDUR',tarih:'',ad:null,unvan:'Okul Müdürü'}
});
const adDegeri=v=>v==null?null:kes(v,AD_ENCOK);
/* Saklanan / dışarıdan gelen değeri güvenli biçime getirir; bozuksa varsayılan düzen döner. */
function imzaTemizle(plan,x){
 const v=varsayilanImza(plan);
 if(!x||typeof x!=='object'||!Array.isArray(x.imzalar))return v;
 const o=x.onay&&typeof x.onay==='object'?x.onay:{};
 return{
  imzalar:x.imzalar.filter(s=>s&&typeof s==='object').slice(0,ENCOK_IMZA).map(s=>({ad:adDegeri(s.ad),unvan:kes(s.unvan,UNVAN_ENCOK)})),
  onay:{goster:o.goster!==false,etiket:kes(o.etiket,ETIKET_ENCOK),tarih:/^\d{4}-\d{2}-\d{2}$/.test(String(o.tarih||''))?String(o.tarih):'',ad:adDegeri(o.ad),unvan:kes(o.unvan,UNVAN_ENCOK)}
 };
}
/* null ad → uygulamadan gelen ad (imza sahibi: plan hazırlayan öğretmen, onay bloğu: okul müdürü); çıktıya giden düz değerler. */
function imzaCozumle(imza,{ogretmen='',mudur=''}={}){
 const t=v=>String(v??'').trim();
 return{
  imzalar:(imza?.imzalar||[]).map(s=>({ad:t(s.ad==null?ogretmen:s.ad),unvan:t(s.unvan)})),
  onay:imza?.onay?{goster:imza.onay.goster!==false,etiket:t(imza.onay.etiket),tarih:imza.onay.tarih||'',ad:t(imza.onay.ad==null?mudur:imza.onay.ad),unvan:t(imza.onay.unvan)}:null
 };
}
/* "…… / 09 / 2026" (tarih seçilmediyse kâğıtta elle yazılır) ya da "28 / 10 / 2026" */
function tarihMetni(iso){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));
 return m?`${m[3]} / ${m[2]} / ${m[1]}`:`…… / 09 / ${YIL_BAS}`;
}

/* ── A4 belge gövdesi ── m: {okul, ogretmen, imza: imzaCozumle çıktısı} */
function imzaHtml(im){
 const bloklar=(im?.imzalar||[]).map(s=>`<div class="mpl-imza"><span class="mpl-imza__yer"></span><span>${esc(s.ad||NOKTA)}</span>${s.unvan?`<b>${esc(s.unvan)}</b>`:''}</div>`);
 const o=im?.onay;
 if(o&&o.goster)bloklar.push(`<div class="mpl-imza mpl-imza--onay">${o.etiket?`<b class="mpl-imza__etiket">${esc(o.etiket)}</b>`:''}<span>${esc(tarihMetni(o.tarih))}</span><span>${esc(o.ad||NOKTA)}</span>${o.unvan?`<b>${esc(o.unvan)}</b>`:''}</div>`);
 return bloklar.length?`<div class="mpl-imzalar">${bloklar.join('')}</div>`:'';
}
function satirHtml(plan,r){
 const sutun=PLAN[plan].sutunlar.length;
 if(typeof r==='string')return`<tr class="mpl-ara"><td colspan="${sutun}">${esc(r)}</td></tr>`;
 const not=v=>v?`<small>${esc(v)}</small>`:'';
 if(plan==='ilkokul'){
  const [ay,hafta,haftaNot,a,b,odak,oyun,oyunNot]=r;
  return`<tr><td class="mpl-ay">${esc(ay)}</td><td class="mpl-hafta">${esc(hafta)}${not(haftaNot)}</td><td>${esc(a)}</td><td>${esc(b)}</td><td>${esc(odak)}</td><td class="mpl-oyun"><b>${esc(oyun)}</b>${not(oyunNot)}</td></tr>`;
 }
 const [ay,tema,ornek,amac,gelenek]=r;
 return`<tr><td class="mpl-ay">${esc(ay)}</td><td><b>${esc(tema)}</b></td><td>${esc(ornek)}</td><td>${esc(amac)}</td><td>${esc(gelenek)}</td></tr>`;
}
function belge(plan,m={}){
 const P=PLAN[plan];if(!P)return'';
 const okul=String(m.okul||'').trim().toLocaleUpperCase('tr')||NOKTA,ogretmen=String(m.ogretmen||'').trim()||NOKTA;
 const bilgi=P.bilgi.map(([e,d])=>`<div class="mpl-kutu"><small>${esc(e)}</small><b>${esc(d==null?ogretmen:d)}</b></div>`).join('');
 const kolon=P.sutunlar.map(()=>'<col>').join('');
 return`<article class="mpl-belge mpl-belge--${plan}">
<header class="mpl-ust"><small>${esc(P.ust)}</small><div class="mpl-okul">${esc(okul)}</div><div class="mpl-baslik">${esc(P.baslik)}</div><div class="mpl-alt">${esc(P.alt)}</div><small>${esc(P.not)}</small></header>
<div class="mpl-bilgi">${bilgi}</div>
<table class="mpl-tablo"><colgroup>${kolon}</colgroup><thead><tr>${P.sutunlar.map(s=>`<th>${esc(s)}</th>`).join('')}</tr></thead><tbody>${P.satirlar.map(r=>satirHtml(plan,r)).join('')}</tbody></table>
<section class="mpl-esaslar"><div class="mpl-esaslar__baslik">Uygulama Esasları ve Notlar</div>${P.esaslar.map((t,i)=>`<div class="mpl-madde"><b>${i+1}.</b><span>${esc(t)}</span></div>`).join('')}</section>
${imzaHtml(m.imza)}
</article>`;
}

/* ── Word: şablonun son tablosu (imza satırı) yeniden yazılır ── */
const xesc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const KOSU_BR='<w:br/>',GENISLIK=15136;
const kosu=(metin,kalin,renk,boy,once='',sonra='')=>`<w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/>${kalin?'<w:b/>':'<w:b w:val="0"/>'}<w:i w:val="0"/><w:color w:val="${renk}"/><w:sz w:val="${boy}"/></w:rPr>${once}<w:t xml:space="preserve">${xesc(metin)}</w:t>${sonra}</w:r>`;
const hucre=(genislik,kosular)=>`<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="${genislik}"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${kosular.join('')}</w:p></w:tc>`;
function imzaXml(im){
 const hucreler=[];
 (im?.imzalar||[]).forEach(s=>hucreler.push([kosu(s.ad||NOKTA,false,'2E1E12',20,KOSU_BR+KOSU_BR,KOSU_BR),s.unvan?kosu(s.unvan,true,'4A2A14',19):'']));
 const o=im?.onay;
 if(o&&o.goster)hucreler.push([o.etiket?kosu(o.etiket,true,'4A2A14',21,'',KOSU_BR):'',kosu(tarihMetni(o.tarih),false,'2E1E12',20,'',KOSU_BR),kosu(o.ad||NOKTA,false,'2E1E12',20,'',KOSU_BR),o.unvan?kosu(o.unvan,true,'4A2A14',19):'']);
 if(!hucreler.length)return'';
 const w=Math.floor(GENISLIK/hucreler.length);
 return`<w:tbl><w:tblPr><w:tblW w:type="auto" w:w="0"/><w:jc w:val="center"/><w:tblLook w:firstColumn="1" w:firstRow="1" w:lastColumn="0" w:lastRow="0" w:noHBand="0" w:noVBand="1" w:val="04A0"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid>${hucreler.map(()=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${hucreler.map(k=>hucre(w,k)).join('')}</w:tr></w:tbl>`;
}
/* word/document.xml içindeki SON tablo (şablonda imza satırı) imzaXml ile değişir; tablo bulunamazsa metin olduğu gibi kalır. */
function imzaTablosunuDegistir(xml,im){
 const s=String(xml),bas=s.lastIndexOf('<w:tbl>');if(bas<0)return s;
 const son=s.indexOf('</w:tbl>',bas);if(son<0)return s;
 return s.slice(0,bas)+imzaXml(im)+s.slice(son+8);
}

global.MaarifOyunPlan={PLAN,ENCOK_IMZA,AD_ENCOK,UNVAN_ENCOK,ETIKET_ENCOK,varsayilanImza,imzaTemizle,imzaCozumle,tarihMetni,imzaHtml,belge,imzaXml,imzaTablosunuDegistir};
})(window);
