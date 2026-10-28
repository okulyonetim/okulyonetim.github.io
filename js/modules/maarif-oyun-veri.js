/* Koruk Asistan — Maarif'in Kalbinde Oyun: sabit içerik (Projeler menüsü)
 * 2026-2027 için ayın oyunları (20 geleneksel oyun), "nedir / nasıl uygulanır" metinleri ve ilkokul / ortaokul yıllık plan özetleri.
 * Oyunlar MEB Temel Eğitim Genel Müdürlüğü'nün "Yüz Yüze 100 Çocuk Oyunu" (2023) kitabından ilkokula uygun olanlar arasından seçilmiştir.
 * Ekran: maarif-oyun.js. Word planları: assets/ogretmen-dosyasi/maarifin-kalbinde-oyun-yillik-plan-*.docx (Öğretmen Dosyası ile ortak, EvrakKatalog.FORMLAR).
 */
(function(global){
'use strict';
if(global.MaarifOyunVeri)return;

const YIL='2026-2027';
const KAYNAK='Kaynak: MEB Temel Eğitim Genel Müdürlüğü, “Yüz Yüze 100 Çocuk Oyunu” (2023) · Türkiye Yüzyılı Maarif Modeli öğretim programları · MEB 2026-2027 çalışma takvimi';
const AYLAR=['Eylül','Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran'];

/* Sayfalar: Projeler menüsündeki satırlar bu anahtarlarla açılır (app-nav.js → 'maarif-oyun' rotası). */
const SAYFALAR={
 nedir:{ad:"Maarif'in Kalbinde Oyun Nedir?",kisa:"Maarif'in Kalbinde Oyun"},
 oyunlar:{ad:'Ayın Oyunları (20 Oyun)',kisa:'Ayın Oyunları'},
 ilkokul:{ad:'İlkokul Yıllık Planı',kisa:'İlkokul Planı'},
 ortaokul:{ad:'Ortaokul Yıllık Planı',kisa:'Ortaokul Planı'}
};
/* Word planları: anahtar → Öğretmen Dosyası form kimliği (EvrakKatalog.FORMLAR), okul kademesi (okul adı için sınıf düzeyi). */
const PLANLAR={
 ilkokul:{form:'oyun-ilkokul',duzey:1,ad:"Maarif'in Kalbinde Oyun Yıllık Çalışma Planı — İlkokul (2026-2027)",not:'Word · yatay A4 · 4 sayfa · okul, öğretmen ve müdür adı otomatik yazılır · imza bölümü özelleştirilebilir'},
 ortaokul:{form:'oyun-ortaokul',duzey:5,ad:"Maarif'in Kalbinde Oyun Yıllık Tema ve Oyun Planı — Ortaokul (2026-2027)",not:'Word · yatay A4 · 2 sayfa · okul, öğretmen ve müdür adı otomatik yazılır · imza bölümü özelleştirilebilir'}
};

/* ── ayın oyunları: ay sırasıyla iki oyun ── */
const O=(no,ad,tarih,sinif,sure,arac,alan,gun,nasil,guvenlik)=>({no,ad,tarih,ay:AYLAR[(no-1)>>1],donem:no<=10?1:2,sinif,sure,arac,alan,gun,nasil,guvenlik});
const OYUNLAR=[
 O(1,'Bom','14–22 Eylül','1–4','10–15 dk','Gerekmez','Sınıf','İlköğretim Haftası — tanışma','Halka olunur, sırayla sayılır; 5 ve 5’in katlarına gelen sayı söylenmez, yerine “Bom!” denir. Yanılan oyundan çıkmaz, sayı hakemi olur. Büyük sınıflarda iki kural birden (3’ün katı “Bom”, 5’in katı “Bim”).','Yanılan öğrenciyle alay edilmez; yanılmak oyunun parçasıdır.'),
 O(2,'Düğüm','23–30 Eylül','1–4','20–25 dk','Yün yumağı','Sınıf / salon','Sınıf kurallarını birlikte belirleme','Halka olan grupta ipin ucunu tutan öğrenci adını ve kendini anlatan bir sözcüğü söyleyip yumağı bir arkadaşına atar. Herkes ipi tutar; ortada bir ağ oluşur, sonra sıra tersten işletilerek düğüm birlikte çözülür.','İp boyna, bileğe dolanmaz; yumak yavaş atılır.'),
 O(3,'Çuval Yarışı','1–15 Ekim','2–4','25–30 dk','Takım sayısı kadar çuval','Bahçe','Güz şenliği','İki takım başlangıç çizgisinde sıralanır; çuvala zıplayarak varış çizgisine gidip döner, çuvalı sıradakine verir. Son oyuncusu ilk dönen takım kazanır.','Zemin taşsız ve düz olmalı; takımlar arasında boşluk bırakılır.'),
 O(4,'Esir','16–30 Ekim','3–4','25–30 dk','Kale olarak iki ağaç / koni','Bahçe','29 Ekim Cumhuriyet Bayramı','İki takımın birer kalesi vardır; kaleden elini çeken oyuncu ebelenebilir ve rakip kalede esir bekler. Takım arkadaşı ona dokunarak kurtarır. Bütün oyuncuları esir düşen takım turu kaybeder.','Ebeleme hafif dokunuşla yapılır; kaleye koşarak çarpılmaz.'),
 O(5,'İsim Şehir','2–13 Kasım','2–4','25–30 dk','Kâğıt, kalem','Sınıf','10 Kasım — Atatürk ve Cumhuriyet kategorileri','Kategoriler (ad, şehir, hayvan, bitki, eşya…) belirlenir, bir harf seçilir; herkes o harfle başlayan sözcükleri yazar. Yalnız sende olan yanıt 10, ortak yanıt 5 puan.','Bir tur “Millî Mücadele ve Cumhuriyet” kategorileriyle oynanabilir.'),
 O(6,'Mangala','23–30 Kasım','2–4','25–30 dk','Mangala tahtası ya da kartona çizilmiş 12 oyuk','Sınıf','24 Kasım Öğretmenler Günü','İki oyuncu, kendi altı oyuğundaki taşları sırayla dağıtır. Son taşın düştüğü yer belirleyicidir: kendi hazinesine düşerse bir kez daha oynanır, rakipte çift sayı oluşursa taşlar alınır. Hazinesinde en çok taş olan kazanır.','Küçük taş yerine büyük düğme ya da kapak kullanılır.'),
 O(7,'Beştaş','1–11 Aralık','2–4','20–25 dk','Beş küçük taş','Sınıf / bahçe','3 Aralık Dünya Engelliler Günü — oturarak, herkesle','Bir taş havaya atılırken yerden taş alınıp düşen taş yakalanır; birler, ikiler, üçler diye etaplar ilerler. Taşı düşürenin sırasını devreder, sonra kaldığı etaptan sürdürür.','Taşlar yutulamayacak büyüklükte ve keskin kenarsız seçilir.'),
 O(8,'Turşucular','14–31 Aralık','1–4','20–25 dk','Gerekmez','Bahçe / salon','Yerli Malı Haftası','Karşılıklı iki grup (turşucular, şekerciler) tekerlemeyle birbirine yürür ve karşı gruptan bir ad sorar; adı söylenen öğrenci karşı gruba geçer. Oyuncusu tükenen grup kaybeder.','Adlar yöresel ürünlerden seçilerek yerli malı teması işlenebilir.'),
 O(9,'Hımbıl','4–13 Ocak','2–4','25–30 dk','Kâğıt, kalem, torba','Sınıf','Kış — sınıf içi oyun','Her ad oyuncu sayısı kadar kâğıda yazılır; herkes dört kâğıt alır ve her turda birini sağındakine verip soldakinden alır. Elindeki dört kâğıdı aynı olan “Hımbıl!” der.','Kâğıtlara çarpım sonuçları ya da eş anlamlı sözcükler yazılarak derse bağlanabilir.'),
 O(10,'Üçtaş','14–22 Ocak','1–4','20 dk','İki renkte üçer taş','Sınıf / bahçe','Dönem sonu akıl oyunları','Kare ve içine artı çizilir; oyuncular taşlarını kesişim noktalarına koyar, sonra çizgi boyunca komşu boş noktaya kaydırır. Üç taşını aynı hizaya getiren kazanır.','Bahçeye büyük çizilip taş yerine öğrencilerle oynanabilir.'),
 O(11,'Tikoça','8–19 Şubat','2–4','25–30 dk','Tebeşir','Bahçe / salon','İkinci dönem ısınma oyunları','Ortadaki halkadan çıkan “tikoça” grubu yalnız tek ayakla sekerek rakipleri ebelemeye çalışır; iki ayağını yere basan halkaya dönmek zorundadır. Bütün oyuncuları ebelenen grup turu kaybeder.','Tek ayak yorucudur; birkaç dakikada bir görev değişimi ve su molası.'),
 O(12,'Oturan Top','22–26 Şubat','2–4','25 dk','Yumuşak top','Salon / bahçe','Kapalı alanda hareket','İki ebe paslaşarak oyuncuları belden aşağı vurmaya çalışır; vurulan oturur. Oturan, yanından geçen topu yakalarsa kalkar ve ebelere katılır. En son kalan kazanır.','Sert top kullanılmaz; atış yalnız belden aşağı.'),
 O(13,'Çember Çevirme','1–5 Mart','1–4','20–25 dk','Çember ve ucu kancalı çubuk','Bahçe','1–7 Mart Yeşilay Haftası — ekran yerine oyun','Çember yere dik tutulur, çubukla arkadan itilerek düşürmeden ilerletilir; beceri artınca dönüşlü parkur ve yarış eklenir.','Çubuğun ucu sivri olmamalı, yukarı kaldırılmaz.'),
 O(14,'Hodak','15–31 Mart','2–4','25–30 dk','Kişi başına sopa, bir kozalak','Bahçe','21–26 Mart Orman Haftası','Ebe kozalağı sopasıyla sürükleyerek kaleye götürmeye, diğerleri sopalarıyla uzaklaştırmaya çalışır. Kalabalık sınıfta hücum-savunma iki takım hâlinde oynanır.','Sopa yerden kaldırılmaz, bel hizasının üstüne çıkmaz.'),
 O(15,'Yılan (Zirve)','1–15 Nisan','1–4','20–25 dk','Tebeşir, kapak ya da bilye','Bahçe','Bahar ve bahçe oyunları','Yere kıvrımlı bir yılan yolu çizilir; piyon parmak ucuyla itilerek kuyruktan başa ilerletilir. Çizgiyi aşan piyon başa döner; başa ilk ulaşan kazanır.','Yol üstüne soru kartları konarak derse bağlanabilir.'),
 O(16,'Yakan Top','16–30 Nisan','3–4','30 dk','Yumuşak top','Bahçe / salon','23 Nisan sınıflar arası oyun şenliği','Uçlardaki takım ortadakileri belden aşağı vurmaya çalışır; havada yakalanan top can kazandırır, can yanan arkadaşa da verilebilir. Sonra takımlar yer değiştirir.','Yüze ve başa atış yapanın hakkı iptal edilir.'),
 O(17,'Topaç Çevirme','3–14 Mayıs','2–4','25 dk','Topaç ve ip','Bahçe (sert zemin)','Anneler Günü — kuşaktan kuşağa oyun','İp topaça sarılır, topaç çizili dairenin içine atılır; daire içinde en uzun dönen ya da yüksek puanlı halkada kalan kazanır.','Topaç asla yukarı ya da birine doğru atılmaz; izleyenler geride durur.'),
 O(18,'Devridağ','20–31 Mayıs','2–4','25–30 dk','Tebeşir','Bahçe / salon','19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı','Oyuncu “Devridağ!” diyerek tek ayak üzerinde karşı grubun çevresinde dolaşıp döner; ayağını yere koyarsa karşı gruba geçer. Oyuncusu kalmayan grup kaybeder.','Her oyuncu turda bir kez görev alır; hakem çarpışmayı önler.'),
 O(19,'Fasulye Torbası Atma','1–11 Haziran','1–4','25 dk','Fasulye dolu kumaş torba, tebeşir','Bahçe','5 Haziran Dünya Çevre Günü — artık kumaştan malzeme','Yere puanlı şekiller çizilir; iki takım sırayla torbayı alttan atar, torbanın tamamen içinde kaldığı şeklin puanı yazılır.','Atış sırası dışındakiler atış çizgisinin gerisinde durur.'),
 O(20,'Simit','14–25 Haziran','1–4','20–25 dk','Tebeşir','Bahçe','Yıl sonu şenliği','Ebe “Simiit!” diye tek nefeste bağırırken kovalar; nefesi biterse dinlenme dairesine dönmelidir. Yakalanan yeni ebe olur.','Tek nefes yarıştırılmaz; baş dönmesinde hemen durulur, gölgede oynanır.')
];
const DONEMLER=[{no:1,ad:'1. Dönem',aralik:'14 Eylül 2026 – 22 Ocak 2027'},{no:2,ad:'2. Dönem',aralik:'8 Şubat – 25 Haziran 2027'}];
const TAKVIM_NOTU='Takvim: ders yılı 14 Eylül 2026 – 25 Haziran 2027 · 1. ara tatil 16–20 Kasım · yarıyıl 25 Ocak – 5 Şubat · 2. ara tatil 8–12 Mart (Ramazan Bayramı) · Kurban Bayramı 17–19 Mayıs. Uygulamaya geçmeden önce okulunuzun yürürlükteki takvimiyle karşılaştırın.';
const oyunlarDonem=no=>OYUNLAR.filter(o=>o.donem===no);
const oyunlarAy=ay=>OYUNLAR.filter(o=>o.ay===ay);

/* ── Maarif'in Kalbinde Oyun nedir? ── */
const NEDIR={
 giris:'Maarif’in Kalbinde Oyun, Millî Eğitim Bakanlığının öne çıkardığı, oyunu okul yaşamının merkezine alan bir yaklaşımdır: geleneksel çocuk oyunlarını okul bahçelerine ve sınıflara geri getirmek, çocukları ekran yerine akranlarıyla yüz yüze, hareketli ve paylaşımlı oyunlarla buluşturmak.',
 kutu:'Bu bölümde: yıl boyu 20 geleneksel oyunluk “Ayın Oyunları” takvimi, düzenlenebilir İlkokul yıllık çalışma planı ve Ortaokul yıllık tema ve oyun planı (Word). Belgeler 2026-2027 çalışma takvimine göre hazırlandı; okul, öğretmen ve müdür adı uygulamadaki bilgilerinizle otomatik yazılır.',
 bolumler:[
  {baslik:'Neden oyun?',maddeler:[
   ['','Oyun, çocuğun dünyayı tanıma ve kendini ifade etme yoludur; oynarken kurala uymayı, sırasını beklemeyi, takımla karar vermeyi, kazanmayı ve kaybetmeyi öğrenir.'],
   ['','Birleşmiş Milletler Çocuk Hakları Sözleşmesi’nin 31. maddesi oyunu çocuğun temel hakları arasında sayar.'],
   ['','Türkiye Yüzyılı Maarif Modeli bilgi, beceri, eğilim ve değerleri birlikte ele alır; oyunseverlik modelin sosyal eğilimleri arasındadır.'],
   ['','İlkokul Beden Eğitimi ve Oyun dersi geleneksel çocuk oyunlarını doğrudan bir öğrenme aracı olarak kullanır.'],
   ['','Geleneksel oyunlar dilimizi, tekerlemelerimizi ve ortak kültürümüzü kuşaktan kuşağa taşır.']]},
  {baslik:'Okulda nasıl uygulanır?',maddeler:[
   ['Ayda iki oyun','ayın ilk oyunu ilk iki hafta, ikincisi son iki hafta oynatılır; her oyun en az üç kez tekrar edilir.'],
   ['Dengeli seçim','her ay bir hareketli (bahçe) bir de sakin (akıl-dil, sınıf içi) oyun — kötü havada da plan aksamaz.'],
   ['Ayın oyunu panoda','oyun okul panosunda duyurulur; nöbetçi öğretmenler teneffüste aynı oyunu başlatabilir.'],
   ['Derslerle bağ','hareketli oyunlar Beden Eğitimi ve Oyun, akıl ve dil oyunları Türkçe ve matematikle birlikte planlanabilir.'],
   ['Kuralları birlikte','kurallar oyundan önce öğrencilerle konuşulur; sınıfın önerdiği yeni kurallar denenir.'],
   ['Herkes oyunda','elemeli oyunlarda dışarıda kalan öğrenciye hakem, puan yazıcı, tempo tutucu gibi görevler verilir.'],
   ['Aile ve kültür','oyunlar velilere duyurulur, evde oynanması teşvik edilir; büyükanne ve büyükbabalar davet edilip yöresel söyleyişler derlenir.'],
   ['Esneklik','plan bir öneridir; hava, sınav ve okul etkinliklerine göre yer değiştirilebilir.']]},
  {baslik:'Güvenli ve kapsayıcı oyun',maddeler:[
   ['','Oyun öncesi zemin, köşe, direk ve kaygan yüzeyler kontrol edilir; alanın sınırları gösterilir.'],
   ['','Hareketli oyunlardan önce kısa ısınma, aralarda su molası; sıcak saatlerde gölge.'],
   ['','Sopa, çubuk, topaç gibi araçların uçları pürüzsüz olmalı; top yumuşak seçilir, atışlar belden aşağı yapılır.'],
   ['','Ebeleme omuz ve sırta hafif dokunuşla; çekiştirme, itme, tutma hiçbir oyunda yok.'],
   ['','Özel gereksinimli öğrenciler için oturarak ya da eşli oynama, mesafeyi kısaltma, görsel ipucu gibi uyarlamalar yapılır.'],
   ['','Kazanan-kaybeden yerine çaba ve iş birliği takdir edilir; her öğrenciye rol verilir.']]}
 ]
};

/* ── Ayın Oyunları sayfası: sayışmaca ve değerlendirme ── */
const SAYISMACA={
 giris:'Ebe ya da başlayan takım çoğu oyunda sayışmacayla seçilir; hem adil olur hem hece-ritim duyarlılığını geliştirir.',
 tekerlemeler:['O piti piti, karamela sepeti, terazi lastik jimnastik, son dersimiz matematik, tik tik tik…','Portakalı soydum, başucuma koydum, ben bir masal uydurdum, duma duma dum, kırmızı mum…'],
 not:'Takım kurarken kaptanlar “aldım verdim, ben seni yendim” diye adım atar; sona hep aynı öğrenciler kalmasın diye kura torbası da kullanılabilir. Ailelerden yöresel sayışmacalar derlenebilir.'
};
const DEGERLENDIRME={
 maddeler:['Katılım (tamamı / çoğunluğu / yarısından azı) ve oyuna ilgi.','Zorlanılan kural, yapılan uyarlama (kolaylaştırma / zenginleştirme), öğrencilerin önerdiği yeni kural.','İlişkilendirilen ders, gözlenen sosyal-duygusal beceriler, eğilimler ve değerler; aileden gelen geri bildirim.'],
 not:'Bu notlar oyunun sınıfa göre uyarlanmasına ve gelecek yılın planına ışık tutar.'
};

/* ── İlkokul planı: aylara göre özet (ayın geleneksel oyunları OYUNLAR'dan gelir) ── */
const ILKOKUL={
 giris:'İlkokul için haftalık plan: her hafta 1–2. sınıflara ve 3–4. sınıflara ayrı oyun, o haftanın kazanım/odak başlığı ve ayın geleneksel oyunu. 14 Eylül 2026’dan 25 Haziran 2027’ye 38 hafta; ara tatiller ve yarıyıl ayrı satırda.',
 ozet:[
  ['Eylül','Tanışma ve aidiyet oyunları, okulu tanıma, dikkat-kural oyunları'],
  ['Ekim','Ritim ve beden kontrolü, Yağ Satarım Bal Satarım, Mendil Kapmaca, Körebe, Cumhuriyet Meşalesi Parkuru'],
  ['Kasım','Seksek, Dokuz Taş, zemin kodlama, Dev XOX, hedefe halka atma (16–20 Kasım ara tatil)'],
  ['Aralık','Kelime avcısı, gölge takibi, denge ve ip atlama, labut devirme, ayna oyunu'],
  ['Ocak','Balon havada, duygu tombalası, drama ile problem çözme, Aile ve Oyun Haftası'],
  ['Şubat','İş birliği oyunları, sessiz sinema, origami, tangram, yapboz'],
  ['Mart','Örüntü ve şifre oyunları, el becerisi, doğa dedektifleri, bahçe satrancı (8–12 Mart ara tatil)'],
  ['Nisan','Rüzgâr gülü, doğal heykeltıraş, su taşıma zinciri, 23 Nisan aile korosu, haklarım kartları'],
  ['Mayıs','Şenlik yarışmaları, Mikrofon Sende, kelime treni, hece avı (17–19 Mayıs bayram)'],
  ['Haziran','Tekerleme atışması, zıt anlam tombalası, geleneksel oyunlar turnuvası, istasyon şenliği']
 ],
 uyarlama:[
  ['Bant altındaki okul adı ve planı hazırlayan öğretmen','alanları uygulamadaki bilgilerinizden yazılır; farklıysa yukarıdan değiştirin (önizleme, PDF ve Word aynı bilgiyle çıkar).'],
  ['İmza bölümü','sınıf öğretmenleri ve okul müdürü onayı olarak hazır gelir; yukarıdan ad, unvan, onay ibaresi ve tarihi değiştirebilir, imza sahibi ekleyebilirsiniz.'],
  ['Hafta sütunundaki notlar','(29 Ekim, 1 Ocak, 23 Nisan, Kurban Bayramı gibi) tatil günlerini gösterir; o hafta oyun kalan günlere yayılır.'],
  ['Sınıfınızın düzeyine uymayan oyunu','aynı haftanın diğer sütunundaki oyunla değiştirebilirsiniz.'],
  ['Plan, okul müdürünün UYGUNDUR onayıyla','dosyalanır.']
 ]
};

/* ── Ortaokul planı: aylık tema (Word planıyla aynı içerik) ── */
const ORTAOKUL={
 giris:'Ortaokul için aylık tema planı: her ayın bir teması, örnek oyun/etkinliği, amacı ve o aya uyan geleneksel oyun önerisi. Ortaokulda kurallar zorlaştırılabilir; oyunlar turnuvaya, sınıflar arası şenliğe ya da öğrenci kulüplerinin teneffüs etkinliğine dönüştürülebilir.',
 tema:[
  ['Eylül','Okul, Oyun ve Uyum','İsim Yumağı ve Tanışma Halkası','Okula oyunla uyum sağlar, arkadaşlarıyla bağ kurar ve okula aidiyet duygusunu geliştirir.','Düğüm — İlköğretim Haftası; tanışma ve sınıf kurallarını birlikte belirleme'],
  ['Ekim','Hareket Et, Oyna, Sağlıklı Kal','Hareketli Parkur ve Eğlenceli İstasyonlar','Hareketli oyunlarla bedenini tanır, aktif yaşam alışkanlığı kazanır ve sağlıklı seçimler yapar.','Çuval Yarışı · Esir — 29 Ekim Cumhuriyet Bayramı, takım ruhu'],
  ['Kasım','Oyun Benim Hakkım, Oyunumu Oynarım','Çocuk Hakları Meclisi ve Kendi Oyununu Tasarla','Oyun hakkını bilir, fikrini ifade eder ve oyun süreçlerine katılır.','İsim Şehir (Atatürk ve Cumhuriyet kategorileri) — 10 Kasım; 20 Kasım Dünya Çocuk Hakları Günü'],
  ['Aralık','Oyunla Düşün, Üret','Geri Dönüşüm Atölyesi ve Tasarım Oyunu','Oyunla düşünür, dener, tasarlar ve üretme sürecine katılır.','Mangala · Beştaş — 3 Aralık Dünya Engelliler Günü (herkesin oynayabileceği oyunlar)'],
  ['Ocak','Oyunla Öğreniyorum','Evde Keşif Bulmacası ve Aile Bilmece Saati','Oyunla öğrenir, ailesiyle keşfeder ve yaşam becerilerini geliştirir.','Hımbıl · Üçtaş — kış aylarında sınıf içi akıl oyunları'],
  ['Şubat','Dijital Çağda Güvenle Oynuyorum','Güvenli Dijital Labirent ve İnternet Avcıları','Dijital oyunların yaş ve içerik uyarılarını tanır, güvenli oyun alışkanlığı geliştirir.','Oturan Top · Tikoça — ekran yerine yüz yüze hareketli oyun'],
  ['Mart','Geleneksel Çocuk Oyunları','Mendil Kapmaca, Tombik ve Seksek','Geleneksel oyunları tanır, kültürel değerlerle bağ kurar ve oyun kültürünü sürdürür.','Çember Çevirme — 1–7 Mart Yeşilay Haftası · Hodak — 21–26 Mart Orman Haftası'],
  ['Nisan','Herkes Oyuna, Her Yerde Oyun','Kapsayıcı Bahçe Oyunları ve Dostluk Halkası','Farklı ortamlarda oyun kurar, birlikte oynar ve herkesin oyuna katılımını önemser.','Yakan Top — 23 Nisan sınıflar arası oyun şenliği · Yılan (Zirve)'],
  ['Mayıs','Ailemle Oynuyorum','Geleneksel Aile Oyun Günü ve İp Atlama Şenliği','Ailesiyle oyun yoluyla bağ kurar, paylaşır ve birlikte zaman geçirmenin değerini bilir.','Topaç Çevirme — Anneler Günü, kuşaktan kuşağa oyun · Devridağ — 19 Mayıs'],
  ['Haziran','Oyun Şenliği','Yıl Sonu Bahar Şenliği ve Oyun İstasyonları','Yıl boyunca edindiği bilgi, beceri ve deneyimleri oyunla paylaşır; iş birliği, öz güven ve aidiyet duygusunu geliştirir.','Fasulye Torbası Atma — 5 Haziran Dünya Çevre Günü (artık kumaştan malzeme) · Simit']
 ],
 esaslar:[
  ['Bütüncül ve beceri temelli:','yalnız fiziksel hareket değil; bilişsel, duygusal, sosyal ve motor beceriler birlikte hedeflenir.'],
  ['Kültürel aktarım ve aile katılımı:','özellikle Mart (Geleneksel Çocuk Oyunları) ve Mayıs (Ailemle Oynuyorum) aylarında veliler sürece katılır.'],
  ['Kapsayıcılık:','etkinlikler özel gereksinimli öğrenciler dâhil herkesin katılımına uygun uyarlanır.'],
  ['Dijital denge:','Şubat temasında yaş ve içerik derecelendirmeleri, ekran süresi ve güvenli oyun alışkanlıkları konuşulur.']
 ]
};

global.MaarifOyunVeri={YIL,KAYNAK,AYLAR,SAYFALAR,PLANLAR,OYUNLAR,DONEMLER,TAKVIM_NOTU,oyunlarDonem,oyunlarAy,NEDIR,SAYISMACA,DEGERLENDIRME,ILKOKUL,ORTAOKUL};
})(window);
