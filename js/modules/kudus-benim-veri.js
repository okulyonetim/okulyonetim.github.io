/* Koruk Asistan — Kudüs Ben’im Projesi: sabit içerik (Projeler menüsü)
 * Kaynak: T.C. Millî Eğitim Bakanlığı Din Öğretimi Genel Müdürlüğü, “Kudüs Ben’im” Projesi Uygulama Kılavuzu, 2026-2027.
 * KILAVUZDAN gelenler: gerekçe, amaç, kapsam, uygulama aşamaları, etkinlik alanları (6.1 okul · 6.2 ilçe/il/ulusal), örnek yıllık takvim,
 * izleme, beklenen sonuçlar, yasal dayanak, EK-1 ve EK-2 form alanları. KILAVUZDA OLMAYANLAR (uygulama önerisi olarak ayrıca işaretlenir):
 * etkinliklerin “uygulama adımları”, ilkokul / ortaokul uyarlamaları, proje ekibi / öğrenci grubu listeleri ve çalışma kâğıtları.
 * Ekran: kudus-benim.js · belgeler (önizleme · PDF · Word): kudus-benim-belge.js.
 */
(function(global){
'use strict';
if(global.KudusBenimVeri)return;

const YIL='2026-2027';
const AD='Kudüs Ben’im Projesi';
const KAYNAK='Kaynak: Din Öğretimi Genel Müdürlüğü — “Kudüs Ben’im” Projesi Uygulama Kılavuzu, 2026-2027.';
const ONERI_NOTU='Uygulama önerisi: kılavuzda bulunmaz; kılavuzdaki ilkelere dayanarak hazırlanmıştır, okulunuza göre değiştirin.';

const SAYFALAR={
 nedir:{ad:'Proje Nedir?',kisa:'Proje Nedir?'},
 ekip:{ad:'Proje Ekibi',kisa:'Proje Ekibi'},
 plan:{ad:'Yıllık Plan ve Takvim',kisa:'Yıllık Plan'},
 havuz:{ad:'Etkinlik Havuzu',kisa:'Etkinlik Havuzu'},
 formlar:{ad:'EK-1 · EK-2 Formları',kisa:'EK-1 · EK-2'},
 kagitlar:{ad:'Çalışma Kâğıtları',kisa:'Çalışma Kâğıtları'}
};

/* Sınıf düzeyi: ilkokul ve ortaokul tek planda seçilir (ortak okullarda “ikisi”). duzey: SinifBaglam.okulAdi kademesi. */
const DUZEYLER={
 ilkokul:{ad:'İlkokul',aralik:'1–4. sınıf',sinif:'1–4. sınıflar',duzey:1},
 ortaokul:{ad:'Ortaokul',aralik:'5–8. sınıf',sinif:'5–8. sınıflar',duzey:5},
 ikisi:{ad:'İlkokul ve ortaokul',aralik:'1–8. sınıf',sinif:'1–8. sınıflar',duzey:0}
};

const AYLAR=['Eylül','Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran'];

/* ── Proje nedir? ── */
const NEDIR={
 giris:'Din Öğretimi Genel Müdürlüğünün 81 ilde resmî ve özel ilkokul, ortaokul ve lise öğrencilerine yönelik yürüttüğü “Kudüs Ben’im” projesi; Kudüs ve Mescid-i Aksa’yı dinî, tarihî, kültürel ve insani boyutlarıyla tanıtan sanat, edebiyat, araştırma, söyleşi, sergi ve sosyal etkinlikleri yıl boyunca tek çatı altında toplar. Her ay en az iki etkinlik yapılması esastır.',
 kutu:'Bu sayfalar ilkokul ve ortaokul için hazırlandı: proje ekibini kurun → yıllık planı oluşturun (etkinlik havuzundan seçin) → etkinlik öncesi EK-1, sonrası EK-2 formunu doldurun → belgeleri Word ya da PDF olarak alın.',
 gerekce:[
  ['Tarihî, dinî ve kültürel miras','Kudüs; ilk kıble Mescid-i Aksa’nın şehri, Miraç hadisesinin gerçekleştiği yer ve pek çok peygamberin yaşadığı tevhit inancının merkezidir. Osmanlı hâkimiyetinde yaklaşık dört asır Türk-İslam tarihinin önemli merkezlerinden biri olmuştur. Proje, bu mirasın öğrenciler tarafından güvenilir kaynaklar üzerinden tanınmasını önemser.'],
  ['Gençlik, kimlik ve medeniyet bilinci','Kudüs yalnız bir coğrafi mekân olarak değil; dinî, tarihî, kültürel ve insani boyutlarıyla ele alınır. Böylece öğrenciler geçmiş ile bugün arasında anlamlı bağ kurar.'],
  ['Ortak hafıza ve insani farkındalık','Filistin ile ortak tarih ve kültür hafızasından hareketle hak, adalet, merhamet, yardımlaşma ve toplumsal sorumluluk değerleri güçlendirilir. Çalışmalar öğrencilerin gelişim düzeyi gözetilerek, ayrıştırıcı ve örseleyici içeriklerden kaçınılarak pedagojik yaklaşımla yürütülür.'],
  ['Yıl boyu ve çok yönlü etkinlik yaklaşımı','Kudüs ve Mescid-i Aksa bilincinin tek günlük ya da haftalık kalmayıp okul kültürünün sürekli bir unsuru olması hedeflenir.']
 ],
 amac:{
  genel:'Öğrencilerin Kudüs’ü dinî, tarihî, kültürel ve insani boyutlarıyla tanımalarını; Mescid-i Aksa’nın İslam tarihi ve kültüründeki yerini kavramalarını; tarihî ve kültürel mirasa karşı sorumluluk bilinci geliştirmelerini ve bu birikimi sanat, edebiyat, araştırma, dijital üretim ve sosyal etkinlikler yoluyla içselleştirmelerini sağlamak.',
  ozel:[
   'Kudüs’ün peygamberler tarihindeki yeri ve önemine ilişkin doğru ve çok yönlü bir farkındalık oluşturmak.',
   'Mescid-i Aksa’nın İslam kültürü ve medeniyetindeki yerinin anlaşılmasına yönelik bilgi ve bilinç düzeyini artırmak.',
   'İlk kıble ve Miraç hadisesi bağlamında Kudüs’ün dinî kültürümüzdeki yerini kavramak; Miraç Kandili döneminde yapılacak çalışmaların tarihî, dinî ve kültürel altyapısını güçlendirmek.',
   'Kudüs’teki Türk-İslam tarihî mirası ile Osmanlı dönemine ait kültürel ve sosyal birikimi öğrencilere tanıtmak.',
   'Adalet, merhamet, yardımlaşma, mazluma duyarlılık ve toplumsal sorumluluk gibi değerleri günlük hayatla ilişkilendirmeyi desteklemek.',
   'Filistin’de yaşanan insan hakları ihlallerine ve haksızlıklara karşı millî, insani ve vicdani bir sorumluluk bilinci oluşturarak tüketim tercihlerinde yerli ve millî ürünlerin kullanımını teşvik etmek.',
   'İşgal altındaki Filistin topraklarında yaşayan Filistinlilerin uğradığı haksızlıklar karşısında dinî, insani ve vicdani bir farkındalık oluşturmak.',
   'Filistinli mazlum Müslümanların yaşadığı hukuksuzluğu gündem ederek mazlumlara karşı sevgi, kardeşlik, merhamet ve yardımlaşma duygularını güçlendirmek.',
   'Sanat, edebiyat, kültür ve dijital medya yoluyla Kudüs ve Mescid-i Aksa temasının özgün ürünlere dönüştürülmesini teşvik etmek.',
   'Araştırma yapma, güvenilir kaynak kullanma, sunum, eleştirel düşünme ve dijital içerik üretme becerilerini geliştirmek.',
   'Okullar arası sosyal etkileşimi, kardeş okul bağlarını ve ortak üretim kültürünü güçlendirmek.',
   'Okullarda Kudüs ve Mescid-i Aksa bilincine yönelik sürdürülebilir ve kurumsal bir eğitim kültürü oluşturmak.'
  ]
 },
 kapsam:[
  ['Hedef kitle','81 ilde resmî ve özel ilkokul, ortaokul ve lise öğrencileri; gönüllü öğretmenler, okul yöneticileri ve veliler.'],
  ['Düzey','Etkinlikler okul içi, ilçe, il veya izin süreçleri tamamlanmak kaydıyla daha geniş katılımlı düzeylerde yapılabilir.'],
  ['Gönüllülük ve izin','Katılım gönüllülük esasına dayanır. 18 yaşından küçük öğrencilerin sosyal etkinliklere katılımında velilerinden yazılı izin alınır.'],
  ['Düzeye uyarlama','Öğrencilerin yaş, gelişim düzeyi, hazırbulunuşluğu, özel gereksinimleri ve okul türü dikkate alınarak etkinliklerin kapsamı ve içeriği farklılaştırılır.']
 ],
 asamalar:[
  ['Koordinasyonun sağlanması','Proje Din Öğretimi Genel Müdürlüğü koordinesinde; il ve ilçe millî eğitim müdürlüklerinin din öğretimi şubeleri aracılığıyla yürür. Okuldaki çalışmaları okul yönetimi ve Din Kültürü ve Ahlak Bilgisi zümresi yürütür.'],
  ['Proje ekibinin oluşturulması','Gönüllü öğretmen ve öğrencilerden bir ekip kurulur; gerekirse farklı branşlardan öğretmenler de görev alır. → Proje Ekibi sekmesi'],
  ['Yıllık planlamanın yapılması','Bakanlıkça belirlenen çerçevede eğitim öğretim yılı boyunca yapılacak etkinlikler planlanır; öğrencilerin yaş ve gelişim özellikleri ile okulun imkânları dikkate alınır. → Yıllık Plan sekmesi'],
  ['Görev dağılımı','Etkinlik öncesi görev dağılımı ve takvim kesinleştirilir; görevliler bilgilendirilir.'],
  ['Etkinliklerin seçilmesi','Kılavuzdaki örnekler bir havuzdur; okul öğrenci düzeyine uygun olanları seçer. Her ay en az iki etkinlik yapılması esastır. → Etkinlik Havuzu sekmesi'],
  ['Öğrencilerin sürece katılması','Öğrenciler yalnız izleyici değil; araştıran, üreten ve görev alan katılımcılar olur. Gerekirse gönüllü öğrenci grupları kurulur.'],
  ['İçerik ve materyallerin hazırlanması','Kitap, film, belgesel, görsel ve dijital materyaller yaş ve gelişim düzeyine uygun seçilir; gerekirse afiş, broşür ve video hazırlanır.'],
  ['İzin ve güvenlik tedbirleri','Okul dışı etkinliklerde mevzuat uygulanır; gerektiğinde veli izni, sağlık-güvenlik ve özel gereksinim tedbirleri alınır. Fotoğraf/video paylaşımında kişisel veriler, telif hakları ve kurumsal tanıtım esaslarına uyulur. → EK-1 formu'],
  ['İş birliklerinin yürütülmesi','Etkinliğin niteliğine göre okul aile birliği, yerel yönetimler, üniversiteler ve ilgili kurumlarla mevzuata uygun iş birliği yapılabilir.'],
  ['Uygulama, izleme ve raporlama','Etkinlikler eğitim öğretimi aksatmadan yürütülür; çalışmalar kayıt altına alınır, öğrenci ürünleri ve iyi uygulamalar dosyalanır. → EK-2 formu']
 ],
 sonuclar:[
  ['Bilinç ve aidiyet','Kudüs ve Mescid-i Aksa’ya ilişkin bilgi, farkındalık ve tarihî-kültürel aidiyetin güçlenmesi.'],
  ['Dinî ve tarihî bilgi','Kudüs’ün dinler tarihi, İslam tarihi, Mescid-i Aksa, Miraç ve Türk-İslam mirası bağlamında doğru kaynaklarla tanınması.'],
  ['Kültür ve sanat','Sanat, edebiyat ve dijital içerik çalışmalarıyla öğrenci duyarlılığının özgün ve kalıcı ürünlere dönüşmesi.'],
  ['Araştırma ve ifade becerileri','Kaynak kullanma, araştırma, sunum, eleştirel düşünme ve dijital üretim becerilerinin gelişmesi.'],
  ['Sosyal değerler','Adalet, merhamet, yardımlaşma, insan onuru ve toplumsal sorumluluk bilincinin güçlenmesi.'],
  ['Okullar arası etkileşim','Farklı okul ve iller arasında ortak üretim, dijital buluşma ve kardeş okul çalışmalarıyla etkileşimin artması.'],
  ['Sürdürülebilirlik','Faaliyetlerin tek seferlik etkinliklerden çıkıp okul kültüründe süreklilik kazanması.'],
  ['Kurumsal kapasite','Okulların sosyal etkinlikleri mevzuata uygun, öğrenci merkezli, güvenli ve izlenebilir biçimde planlama kapasitesinin güçlenmesi.']
 ],
 izleme:'Okul düzeyinde etkinlikler; temel uygulama bilgileri, öğrenci katılımı ve geri bildirimlerle ortaya çıkan ürünler esas alınarak kayıt altına alınır. Değerlendirmede nicelikten çok pedagojik uygunluk, aktif katılım, güvenilir kaynak kullanımı ve gerekli izinler gözetilir. İl/ilçe millî eğitim müdürlükleri uygulamaları Genel Müdürlükçe belirlenen takvim ve format doğrultusunda izler; iyi örnekler dönemsel olarak derlenebilir.',
 yasal:[
  '1739 sayılı Millî Eğitim Temel Kanunu','1 Sayılı Cumhurbaşkanlığı Kararnamesi','6698 sayılı Kişisel Verilerin Korunması Kanunu (24/3/2016)',
  '6331 sayılı İş Sağlığı ve Güvenliği Kanunu (20/6/2012)','5846 sayılı Fikir ve Sanat Eserleri Kanunu (5/12/1951)',
  'MEB Eğitim Kurumları Sosyal Etkinlikler Yönetmeliği','MEB Sosyal Etkinlik İzinleri Yönergesi',
  'MEB Okul Öncesi Eğitim ve İlköğretim Kurumları Yönetmeliği','MEB Ortaöğretim Kurumları Yönetmeliği','İlgili diğer mevzuat ve Bakanlık düzenlemeleri'
 ],
 /* Uygulama önerisi (kılavuzda yok): ilkokul ve ortaokulda yaş ve gelişim düzeyine göre uyarlama. */
 duzeyOnerisi:[
  ['İlkokul (1–4. sınıf)','Kısa, görsel ve etkinlik temelli çalışmalar: resimli bilgi kartı, canlandırma, hikâye dinleme, boyama/pano, kısa şiir. Metinler sade; siyasi ayrıntıdan kaçınılır, adalet–merhamet–paylaşma değerleri öne çıkar. Ürün: resim, pano, kısa sunum.'],
  ['Ortaokul (5–8. sınıf)','Araştırma ve sunum ağırlıklı çalışmalar: kaynak karşılaştırma, harita ve zaman çizelgesi, podcast/dijital hikâye, panel, kısa film. Güvenilir kaynak kullanımı ve kaynak gösterme alışkanlığı kazandırılır. Ürün: sunum, rehber, video/podcast.'],
  ['Ortak okul (1–8)','Etkinlik ortak yapılır; ilkokul grubu görsel-canlandırma, ortaokul grubu araştırma-sunum görevi alır; ürünler Kudüs köşesinde birlikte sergilenir.']
 ]
};

/* ── Etkinlik havuzu: kılavuz 6.1 (okul düzeyi). kilavuz = kılavuz özeti; adimlar/ilkokul/ortaokul/urun = uygulama önerisi. ── */
const ETKINLIKLER=[
 {id:'konferans',ikon:'🎤',ad:'Konferans, Seminer, Söyleşi ve Panel',ay:'Şubat',tur:'Konferans / söyleşi / panel',
  kilavuz:'Kudüs’ün dinî, tarihî, kültürel ve medeniyet boyutları konusunda alan uzmanları, akademisyenler, araştırmacılar ve yetkin konuşmacılarla öğrenci buluşmaları düzenlenebilir. Program öncesinde öğrencilerden sorular toplanabilir; sonrasında kısa değerlendirme, poster veya öğrenci raporu hazırlanabilir.',
  adimlar:['Konuşmacıyı ve konuyu belirleyin; dışarıdan görev alacaksa izin belgelerini tamamlayın.','Bir hafta önce sınıflardan soru toplayın (Söyleşi Soru Hazırlama Formu).','Salon, ses ve sunum düzenini kurun; öğrenci sunucu ve karşılama ekibini görevlendirin.','Program sonrası öğrencilerden üç cümlelik değerlendirme ya da poster isteyin; EK-2’yi doldurun.'],
  ilkokul:'Kısa (20 dk) hikâyeleştirilmiş söyleşi; sorular sınıfta resim ya da tek cümleyle hazırlanır.',
  ortaokul:'Soru-cevap ve panel; öğrenciler sunucu ve soru hazırlama görevi alır.',
  urun:'Değerlendirme notları, poster, öğrenci raporu',
  dikkat:'Dışarıdan konuşmacı için izin belgeleri temin edilir; fotoğraf/video paylaşımında veli izni ve kişisel veri kuralları.'},
 {id:'arastirma',ikon:'🔎',ad:'Öğrenci Araştırmaları ve Öğrenci Sempozyumu',ay:'Ekim',tur:'Araştırma / sunum',
  kilavuz:'Gönüllü öğrenciler Kudüs’ün tarihi, şehir kültürü, dinî mekânları, Osmanlı mirası, edebiyatı, sanatı ve güncel insani boyutları üzerine güvenilir kaynaklara dayalı araştırmalar yapabilir. Sunumlar sınıf, okul veya okullar arası panel/seminer formatında paylaşılabilir.',
  adimlar:['Konu listesini öğrencilere sunun (ör. Kudüs’ün kapıları, Osmanlı vakıfları, Kudüs şiirleri).','Her gruba Güvenilir Kaynak Kontrol Listesini verin; en az üç güvenilir kaynak isteyin.','İki hafta araştırma, bir hafta sunum hazırlığı planlayın; ara kontrolde kaynakları inceleyin.','Sunumları sınıfta, seçilenleri okul sempozyumunda paylaşın; dosyaları proje arşivine koyun.'],
  ilkokul:'Resimli bilgi kartı; “Bildiklerim–Merak Ettiklerim–Öğrendiklerim” tablosu; 2–3 dakikalık sunum.',
  ortaokul:'Kaynaklı rapor; 5 dakikalık sunum; kaynakçalı poster; kısa sempozyum günü.',
  urun:'Araştırma raporu, sunum, bilgi kartı',
  dikkat:'Kaynak gösterme ve görsel telif; öğrenci adı ve görüntüsü paylaşılacaksa veli izni.'},
 {id:'sehir',ikon:'🗺️',ad:'Kudüs Şehir Rehberi ve Dijital İçerik Üretimi',ay:'Kasım',tur:'Dijital içerik üretimi',
  kilavuz:'Öğrenciler Kudüs’teki önemli mekânları tanıtan kısa video, podcast, dijital harita, zaman çizelgesi veya şehir rehberi hazırlayabilir. Doğru bilgi, kaynak gösterme, görsel telif ve kişisel veri kurallarına dikkat edilir.',
  adimlar:['Mekân listesini paylaştırın (Mescid-i Aksa, Kubbetü’s-Sahra, surlar ve kapılar, çarşılar).','Her ekip bir mekân için 1 dakikalık metin yazsın; öğretmen içerik doğruluğunu kontrol etsin.','Ses kaydı (podcast) ya da slayt/video hazırlansın; telifsiz görsel kullanılsın.','Ürünler okulun dijital sergisine ya da QR kodla Kudüs köşesine eklensin.'],
  ilkokul:'Resimli rehber sayfası; sınıf içinde “mekân tanıtım” sunumu.',
  ortaokul:'Podcast, dijital harita ya da kısa tanıtım videosu.',
  urun:'Dijital şehir rehberi, podcast, QR kodlu tanıtım',
  dikkat:'Öğrenci yüzü/sesi yayımlanacaksa veli izni (KVKK); görsellerde telif.'},
 {id:'gezi',ikon:'🥽',ad:'Kudüs Gezileri ve Sanal Geziler',ay:'Aralık',tur:'Sanal gezi / gezi',
  kilavuz:'İmkânlar, güncel güvenlik koşulları ve gerekli izinler çerçevesinde koordinatör öğretmenlere yönelik gezi faaliyetleri planlanabilir. Öğrencilere yönelik ise güvenilir dijital platformlardan 360 derece/VR sanal gezi uygulamalarıyla Kudüs’ün önemli mekânları tanıtılabilir. Gezi sonrasında fotoğraf sergisi, gezi günlüğü veya dijital anlatı hazırlanabilir.',
  adimlar:['Güvenilir bir 360° sanal tur kaynağı seçin ve önceden kendiniz izleyin.','Akıllı tahtada mekân mekân gezin; her durakta bir soru sorun.','Öğrencilerden “gezi günlüğü” yazmalarını isteyin.','Günlüklerden seçilenleri Kudüs köşesinde sergileyin.'],
  ilkokul:'Kısa sanal gezi (15 dk) ve resimli gezi günlüğü.',
  ortaokul:'Durak durak gezi, notlu gezi günlüğü ve dijital anlatı.',
  urun:'Gezi günlüğü, fotoğraf/dijital sergi',
  dikkat:'Fiziki gezi öğrenci için planlanmaz; öğretmen gezileri izin süreçlerine tabidir.'},
 {id:'kose',ikon:'🖼️',ad:'Kudüs Sergisi ve Kudüs Köşesi',ay:'Eylül',tur:'Sergi / köşe',
  kilavuz:'Okul koridorunda veya uygun bir alanda Kudüs’ün dünya haritasındaki konumu, tarihî dönemleri, önemli kişiler ve olaylar, Mescid-i Aksa, şehir mimarisi ve kültürel mirasını anlatan görsel-metin temelli bir “Kudüs ve Medeniyetimiz” köşesi oluşturulabilir. Sergiler dönemsel yenilenebilir; öğrenci ürünleriyle zenginleştirilebilir.',
  adimlar:['Görünür bir duvar ya da pano seçin; başlık “Kudüs ve Medeniyetimiz” olsun.','Kudüs’ün konumunu ve İstanbul’a uzaklığını haritada gösterin.','Her ay o ayın temasına uygun öğrenci ürünlerini ekleyin.','Bilgi kartlarını basıp yerleştirin; köşeyi dönem sonunda yenileyin.'],
  ilkokul:'Resim, boyama ve kısa cümlelerle pano; bilgi kartları büyük puntolu.',
  ortaokul:'Zaman şeridi, harita ve kaynaklı bilgi panoları; QR kodla dijital ürünler.',
  urun:'Kudüs köşesi, dönemsel pano',
  dikkat:'Ayrıştırıcı, örseleyici görsel kullanılmaz; görsellerde telif.'},
 {id:'sanat',ikon:'🎨',ad:'Sanat, Edebiyat ve Tasarım Çalışmaları',ay:'Nisan',tur:'Sanat / edebiyat / tasarım',
  kilavuz:'Resim, şiir, kompozisyon, öykü, hikâye, deneme, afiş, fotoğraf, kısa film ve dijital tasarım alanlarında ürün geliştirme çalışmaları yapılabilir. Yarışma düzenlenecekse takvim, değerlendirme komisyonu, kriterler, ödüller ve itiraz süreci ayrı bir şartnamede açıkça belirtilir.',
  adimlar:['Atölye biçimini seçin (resim, şiir, afiş, kısa film).','Görsel sanatlar ve edebiyat öğretmenleriyle ortak ders planlayın.','Ürünleri sınıfta paylaşın; seçilenleri sergileyin.','Yarışma yapılacaksa ayrı şartname hazırlayın (Sosyal Etkinlik İzinleri Yönergesi).'],
  ilkokul:'Resim, afiş ve kısa şiir; ürünler sınıf panosunda.',
  ortaokul:'Şiir, kompozisyon, afiş, fotoğraf, kısa film ve dijital tasarım.',
  urun:'Resim, şiir, afiş, kısa film',
  dikkat:'Yarışma niteliğindeki faaliyetler için ayrı şartname ve izin süreci gerekir.'},
 {id:'ayak',ikon:'🧳',ad:'“Ayağının Tozu” Buluşmaları',ay:'Mart',tur:'Buluşma / söyleşi',
  kilavuz:'Şehirler ve mekânlarla ilgili eseri veya saha deneyimi bulunan seyyah, akademisyen, yazar, sanatçı, rehber, araştırmacı ve uzmanlarla öğrenciler buluşturulabilir. Programlar, gezi tecrübesini tarihî ve kültürel bilgiyle birleştiren soru-cevap formatında planlanabilir.',
  adimlar:['Konuğu belirleyin; dış konuşmacı izin belgelerini tamamlayın.','Öğrenciler “bir gezginin defterinden” sorular hazırlasın.','Konuşmayı fotoğraf/harita destekli soru-cevap olarak yürütün.','Öğrenciler buluşmadan bir “gezi notu” yazsın.'],
  ilkokul:'Kısa anlatı ve görsel eşliğinde soru-cevap; çocuklar çizim yapar.',
  ortaokul:'Soru-cevap oturumu ve gezi notu yazımı.',
  urun:'Gezi notları, röportaj metni',
  dikkat:'Dış konuşmacı izni; kayıt/fotoğraf için veli izni.'},
 {id:'sinema',ikon:'🎬',ad:'Sinema ve Belgesel Haftası',ay:'Ocak',tur:'Film / belgesel gösterimi',
  kilavuz:'Kudüs, Filistin, şehir medeniyeti ve tarihî miras temalı yaşa uygun film ve belgeseller belirlenerek gösterimler yapılabilir. Gösterim öncesi/sonrası öğretmen rehberliğinde değerlendirme soruları, film okuma formu veya uzman söyleşisi kullanılabilir. Gösterim ve çoğaltma haklarına dikkat edilir.',
  adimlar:['Yaşa uygun, örseleyici sahne içermeyen yapımı önceden izleyerek seçin.','Gösterim hakkını kontrol edin (kamu yayını/eğitim izni).','Öncesinde 3 soru verin; sonrasında Film Okuma Formunu doldurtun.','Kısa bir tartışma ile değerlere (adalet, merhamet) bağlayın.'],
  ilkokul:'Kısa animasyon/belgesel; resimle değerlendirme.',
  ortaokul:'Belgesel + tartışma; film okuma formu.',
  urun:'Doldurulmuş film okuma formları',
  dikkat:'Gösterim hakkı; yaşa uygunluk; örseleyici görüntü kullanılmaz.'},
 {id:'kitaplik',ikon:'📚',ad:'Kudüs Kitaplığı ve Okuma Çalışmaları',ay:'Ocak',tur:'Okuma çalışması',
  kilavuz:'Okul kütüphanesinde Kudüs ve Mescid-i Aksa’ya ilişkin güvenilir ve yaş düzeyine uygun eserlerden oluşan bir bölüm hazırlanabilir. Okuma halkaları, kitap tahlilleri, yazar buluşmaları veya okuma günlükleri düzenlenebilir.',
  adimlar:['Kütüphanede ayrı bir raf/kutu ayırın, etiketleyin.','Kademeye uygun kitapları seçin; veli ve OAB bağışı isteyebilirsiniz.','Okuma halkası kurun: haftada bir 20 dakika paylaşım.','Kitap Tahlili / Okuma Günlüğü formunu kullanın.'],
  ilkokul:'Resimli kitap okuma ve çizimle paylaşım.',
  ortaokul:'Öykü/roman, şiir tahlili ve okuma günlüğü.',
  urun:'Okuma günlükleri, kitap tahlilleri',
  dikkat:'Eser seçimi yaşa uygunluk ve güvenilirlik bakımından kontrol edilir.'},
 {id:'gece',ikon:'🌙',ad:'Kudüs Gecesi / Yıl Sonu Sunum Programı',ay:'Haziran',tur:'Kapanış programı',
  kilavuz:'Yıl içinde üretilen öğrenci çalışmalarının sergilendiği; şiir dinletisi, kısa belgesel, drama, tiyatro, öğrenci sunumu ve dijital içeriklerin paylaşıldığı okul veya il düzeyinde kapanış programı düzenlenebilir.',
  adimlar:['Program akışını hazırlayın (Kudüs Gecesi Program Akışı kâğıdı).','Görev dağılımı yapın: sunucu, dekor, ses, sergi.','Velileri davet edin; ürün sergisini programla birleştirin.','Program sonrası proje değerlendirmesini yapın; EK-2’yi doldurun.'],
  ilkokul:'Sınıf düzeyinde kısa gösteri; resim sergisi.',
  ortaokul:'Şiir, drama, kısa belgesel ve sunumlarla tam program.',
  urun:'Kapanış programı, ürün sergisi',
  dikkat:'Fotoğraf/video izni; salon güvenliği.'},
 {id:'drama',ikon:'🎭',ad:'Drama, Tiyatro ve Atölye Çalışmaları',ay:'Aralık',tur:'Drama / tiyatro / atölye',
  kilavuz:'Kudüs’ün tarihî şahsiyetleri, şehir kültürü, vakıf geleneği, adalet ve merhamet temaları; yaratıcı drama, tiyatro, görsel sanatlar, harita okuma, tarih şeridi, hat/tezhip esintili tasarım ve benzeri atölyelerle ele alınabilir.',
  adimlar:['Tema seçin: vakıf çeşmesi, aşevi (imaret), surları onaran ustalar…','Isınma, canlandırma, değerlendirme aşamalı 40 dk drama planlayın.','Görsel sanatlarda tezhip esintili kenar süsü ya da tarih şeridi yapın.','Ürünleri sergiye, canlandırmaları Kudüs Gecesine taşıyın.'],
  ilkokul:'Canlandırma ve basit rol oyunları.',
  ortaokul:'Drama, tiyatro metni ve tasarım atölyesi.',
  urun:'Canlandırma, tarih şeridi, tasarım ürünleri',
  dikkat:'Örseleyici sahnelerden kaçınılır; öğrenci görüntüsü için veli izni.'},
 {id:'iller',ikon:'🤝',ad:'İller Arası Dijital Buluşmalar ve Kardeş Okul Çalışmaları',ay:'Mayıs',tur:'Dijital buluşma / kardeş okul',
  kilavuz:'Farklı illerdeki okullar arasında çevrim içi öğrenci panelleri, ortak dijital sergiler, eş zamanlı okuma etkinlikleri ve ortak ürün geliştirme çalışmaları yürütülebilir. Çevrim içi uygulamalarda öğrenci güvenliği ve kişisel verilerin korunması gözetilir.',
  adimlar:['İlçe/il din öğretimi şubesi aracılığıyla kardeş okul belirleyin.','Ortak takvim ve platform (kurumsal hesap) seçin.','Eş zamanlı okuma ya da ortak panel düzenleyin.','Ortak dijital sergi hazırlayın.'],
  ilkokul:'Sınıflar arası resim/mektup değişimi ve kısa görüntülü tanışma.',
  ortaokul:'Ortak panel, ortak dijital sergi, podcast.',
  urun:'Ortak panel, dijital sergi',
  dikkat:'Kurumsal platform kullanılır; öğrenci kişisel verisi korunur.'},
 {id:'mirac',ikon:'✨',ad:'Miraç ve Mescid-i Aksa Temalı Etkinlikler',ay:'Şubat',tur:'Dinî-kültürel etkinlik',
  kilavuz:'Miraç Kandili dönemi başta olmak üzere uygun zamanlarda ilk kıble, Mescid-i Aksa ve Miraç hadisesinin dinî-kültürel boyutlarını ele alan okuma, söyleşi, pano, bilgi kartı, dijital hikâye ve öğrenci sunumları düzenlenebilir.',
  adimlar:['Miraç Kandili tarihini takvimden işaretleyin (ayı ona göre değiştirin).','DKAB dersinde İsra ve Miraç’ı ilgili ayetler ve kaynaklarla işleyin.','Öğrenciler “ilk kıble” bilgi kartı ve dijital hikâye hazırlasın.','Kudüs köşesine Miraç bölümü ekleyin.'],
  ilkokul:'Resimli bilgi kartı ve hikâye anlatımı.',
  ortaokul:'Kaynaklı sunum ve dijital hikâye.',
  urun:'Bilgi kartı, dijital hikâye, sunum',
  dikkat:'Güvenilir dinî kaynak kullanılır.'},
 {id:'deger',ikon:'💚',ad:'Değer ve Sosyal Sorumluluk Atölyeleri',ay:'Eylül',tur:'Değer atölyesi',
  kilavuz:'Adalet, merhamet, yardımlaşma, insan onuru, kültürel mirasa sahip çıkma ve toplumsal sorumluluk gibi değerler örnek olaylar, metin incelemeleri, kısa drama ve sınıf içi tartışmalar yoluyla öğrencilerin günlük yaşamıyla ilişkilendirilebilir.',
  adimlar:['Bir değer seçin (ör. merhamet).','Kısa bir örnek olay ya da metin okuyun.','“Ben olsaydım ne yapardım?” tartışması yapın.','Sınıfça bir sosyal sorumluluk adımı belirleyin (yardım kampanyası, mektup).'],
  ilkokul:'Hikâye ve kısa canlandırma.',
  ortaokul:'Örnek olay tartışması ve sosyal sorumluluk projesi.',
  urun:'Değer panosu, sosyal sorumluluk adımı',
  dikkat:'Ayrıştırıcı dil kullanılmaz; gelişim düzeyi gözetilir.'}
];

/* Kılavuz 6.2: ilçe, il ve ulusal düzey (bilgi amaçlı; okul planına eklenmez). */
const ULUSAL=[
 ['Yarışmalar','Resmî ve özel okullarda resim, şiir, kompozisyon, kısa film ve dijital tasarım alanlarında okul, ilçe, il veya ülke genelinde yarışmalar düzenlenebilir; Sosyal Etkinlik İzinleri Yönergesine uygun ayrı şartname hazırlanır.'],
 ['Kudüs ve Mescid-i Aksa köşeleri / sergileri','Okullarda sabit veya dönemsel “Kudüs ve Medeniyetimiz” alanları; il ve ülke düzeyinde seçilen öğrenci ürünlerinden ortak sergiler.'],
 ['İller arası dijital buluşmalar','Farklı illerdeki okul ve öğrencilerin katılımıyla çevrim içi söyleşiler, öğrenci panelleri, ortak sunumlar ve dijital sergiler.'],
 ['Tiyatro ve atölye çalışmaları','Drama, tiyatro, sanat, edebiyat, yaratıcı yazarlık ve dijital üretim atölyeleri; nitelikli çalışmalar il veya ülke düzeyindeki programlarda paylaşılabilir.'],
 ['Öğrenci araştırma ve sunum günleri','Öğrencilerin araştırmalarını sunabilecekleri okul, ilçe, il veya ulusal düzeyde programlar.'],
 ['Ulusal öğrenci paneli ve buluşmaları','Farklı illerden öğrencilerin katılımıyla paneller, çalıştaylar ve tematik buluşmalar.'],
 ['Ulusal dijital içerik ve sergi çalışmaları','Öğrencilerin kısa film, video, podcast, dijital hikâye, afiş ve fotoğraf çalışmalarından ortak dijital sergi veya içerik arşivi.'],
 ['Yıl sonu kapanış programı','Yıl boyunca yapılan çalışmaların ve iyi uygulama örneklerinin paylaşılacağı il veya ülke düzeyinde kapanış programları; usulüne uygun yarışmalarda dereceye girenler ödüllendirilebilir.']
];

/* ── Örnek yıllık takvim (kılavuz bölüm 7). oneri: aya yüklenecek iki etkinlik satırı (havuz = etkinlik kimliği). ── */
const TAKVIM={
 not:'Takvim örnek niteliğindedir. Okullar Bakanlıkça ilan edilen takvim, dinî gün ve gecelerin tarihleri, mahallî imkânlar ve öğrenci gelişim düzeyi doğrultusunda aylık temaları değiştirebilir. Her ay en az iki etkinlik uygulanması esastır.',
 aylar:{
  'Eylül':{tema:'Projenin tanıtımı ve öğrenci gruplarının oluşturulması',ornek:'Kudüs köşesi başlangıç çalışması; ön bilgi/farkındalık etkinliği',oneri:[{ad:'Kudüs köşesi başlangıç çalışması',havuz:'kose'},{ad:'Ön bilgi / farkındalık etkinliği',havuz:'deger'}]},
  'Ekim':{tema:'Kudüs’ün coğrafyası ve tarihî katmanları',ornek:'Harita-zaman çizelgesi; öğrenci araştırma sunumları',oneri:[{ad:'Harita ve zaman çizelgesi çalışması',havuz:null},{ad:'Öğrenci araştırma sunumları',havuz:'arastirma'}]},
  'Kasım':{tema:'Dinler tarihi ve şehir kültürü',ornek:'Dinî-tarihî mekân tanıtımları; dijital şehir rehberi',oneri:[{ad:'Dinî-tarihî mekân tanıtımları',havuz:null},{ad:'Dijital şehir rehberi',havuz:'sehir'}]},
  'Aralık':{tema:'Türk-İslam ve Osmanlı mirası',ornek:'Sergi/pano; vakıf ve şehir medeniyeti atölyesi',oneri:[{ad:'Sergi / pano çalışması',havuz:null},{ad:'Vakıf ve şehir medeniyeti atölyesi',havuz:'drama'}]},
  'Ocak':{tema:'Kudüs edebiyatı ve okuma kültürü',ornek:'Kudüs kitaplığı; kitap/şiir tahlili',oneri:[{ad:'Kudüs kitaplığı',havuz:'kitaplik'},{ad:'Kitap / şiir tahlili',havuz:null}]},
  'Şubat':{tema:'Mescid-i Aksa ve dinî-kültürel hafıza',ornek:'Söyleşi; öğrenci sunumu/dijital hikâye',oneri:[{ad:'Söyleşi',havuz:'konferans'},{ad:'Öğrenci sunumu / dijital hikâye',havuz:'mirac'}]},
  'Mart':{tema:'Araştırma, medya ve bilgi okuryazarlığı',ornek:'Öğrenci paneli; kaynak değerlendirme atölyesi',oneri:[{ad:'Öğrenci paneli',havuz:'ayak'},{ad:'Kaynak değerlendirme atölyesi',havuz:null}]},
  'Nisan':{tema:'Sanat ve estetik',ornek:'Resim, afiş, kısa film, fotoğraf veya tasarım atölyesi',oneri:[{ad:'Resim ve afiş atölyesi',havuz:'sanat'},{ad:'Kısa film, fotoğraf veya tasarım atölyesi',havuz:null}]},
  'Mayıs':{tema:'Kardeş okul ve dijital buluşmalar',ornek:'İller arası panel; ortak dijital sergi/podcast',oneri:[{ad:'İller arası panel',havuz:'iller'},{ad:'Ortak dijital sergi / podcast',havuz:null}]},
  'Haziran':{tema:'Yıl sonu paylaşımı ve değerlendirme',ornek:'Kudüs gecesi/kapanış; ürün sergisi ve proje değerlendirmesi',oneri:[{ad:'Kudüs gecesi / kapanış programı',havuz:'gece'},{ad:'Ürün sergisi ve proje değerlendirmesi',havuz:null}]}
 }
};

/* ── EK-1 ve EK-2 form alanları (kılavuzdaki sıra ve adlarla). anahtar: uygulamadan/plandan önceden doldurulan alan. ── */
const EK1=[
 ['Okulun Adı','okul'],['İl / İlçe','ilIlce'],['Etkinliğin Adı','ad'],['Tema / Konu','tema'],['Etkinlik Türü','tur'],['Tarih / Saat','tarih'],['Yer','yer'],
 ['Hedef Kitle / Sınıf Düzeyi','hedef'],['Tahmini Katılımcı Sayısı','katilimci'],['Sorumlu Yönetici / Öğretmen','sorumlu'],['Görevli Öğretmenler','gorevli'],
 ['Öğrenci Grubu','ogrenciGrubu'],['Paydaşlar (varsa)','paydas'],['Bütçe / Kaynak','butce'],['İzin Durumu / AYSE (gerekiyorsa)','izin'],['Veli İzni Gerekliliği','veliIzni'],
 ['Özel Gereksinim / Erişilebilirlik Tedbirleri','ozelGereksinim'],['Sağlık ve Güvenlik Tedbirleri','guvenlik'],['Kullanılacak Materyaller','materyal'],['Beklenen Ürün / Çıktı','urun']
];
const EK2=[
 ['Etkinliğin Adı','ad'],['Uygulama Tarihi','tarih'],['Katılımcı Sayısı','katilimci'],['Uygulanan Etkinliğin Kısa Açıklaması','aciklama'],['Öğrencilerin Katılım Düzeyi','katilimDuzeyi'],
 ['Ortaya Çıkan Ürünler','urunler'],['Etkinliğe Yönelik Dijital İçerikler / Linkler','linkler'],['Karşılaşılan Güçlükler','guclukler'],['İyi Uygulama / Yenilikçi Yön','iyiUygulama'],
 ['Bir Sonraki Uygulama İçin Öneri','oneri'],['Fotoğraf / Video Paylaşım İzni Durumu','paylasimIzni'],['Raporlama / Arşiv Bilgisi','arsiv']
];

/* ── Çalışma kâğıtları (uygulama önerisi; yazdırılır). bloklar: yonerge · alan(satır sayısı) · tablo(boş satır) · dolu(önceden yazılı satırlar + boş) · kontrol(☐ maddeleri) ── */
const OGRENCI_BASLIK=['Adı Soyadı','Sınıfı / Şubesi','Tarih'];
const KAGITLAR=[
 {id:'bmo',ikon:'🧠',ad:'Bildiklerim · Merak Ettiklerim · Öğrendiklerim',kisa:'Konuya başlamadan ve bitirince öğrencinin dolduracağı üç sütunlu çalışma.',kimlik:OGRENCI_BASLIK,
  bloklar:[{t:'alan',ad:'Çalışma konusu',satir:1},{t:'tablo',sutunlar:['Bildiklerim','Merak Ettiklerim','Öğrendiklerim'],satir:9},{t:'alan',ad:'Bu çalışmada beni en çok etkileyen şey',satir:3}]},
 {id:'harita',ikon:'🗺️',ad:'Harita ve Zaman Çizelgesi Çalışma Kâğıdı',kisa:'Kudüs’ü haritada konumlandırma ve tarih şeridi.',kimlik:OGRENCI_BASLIK,
  bloklar:[{t:'yonerge',m:'Haritadan yararlanarak Kudüs’ün yerini ve çevresindeki önemli şehirleri not edin; ardından tarih şeridini kaynaklarınıza göre doldurun.'},{t:'alan',ad:'Harita notlarım (konum, komşu şehirler, uzaklık)',satir:4},{t:'tablo',sutunlar:['Dönem / Yıl','Olay ya da yer','Kaynak'],satir:8}]},
 {id:'bilgikarti',ikon:'🖼️',ad:'Kudüs Köşesi Bilgi Kartı',kisa:'Kudüs köşesine asılacak sade bilgi kartı (kart başına bir konu).',kimlik:['Hazırlayan','Sınıfı','Tarih'],
  bloklar:[{t:'alan',ad:'Kartın başlığı',satir:1},{t:'alan',ad:'Ne? / Nerede? / Ne zaman?',satir:3},{t:'alan',ad:'Neden önemli?',satir:3},{t:'alan',ad:'Resim ya da harita (kutuya çizin / yapıştırın)',satir:6},{t:'alan',ad:'Kaynak',satir:1}]},
 {id:'degerplan',ikon:'💚',ad:'Değer Atölyesi Ders Planı (40 dk)',kisa:'Adalet, merhamet ve yardımlaşma değerleri için aşamalı ders akışı.',kimlik:['Öğretmen','Sınıf','Tarih'],
  bloklar:[{t:'alan',ad:'Değer',satir:1},{t:'dolu',sutunlar:['Süre','Aşama','Yapılacak çalışma','Materyal'],satirlar:[['5 dk','Giriş','Kısa örnek olay ya da metin okunur.',''],['10 dk','Anlama','Metindeki durum ve duygular konuşulur.',''],['15 dk','Uygulama','Canlandırma ya da küçük grup çalışması yapılır.',''],['5 dk','Tartışma','“Ben olsaydım ne yapardım?” sorusu tartışılır.',''],['5 dk','Sonuç','Sınıfça bir sosyal sorumluluk adımı belirlenir.','']],bos:1},{t:'alan',ad:'Sınıfça seçtiğimiz sosyal sorumluluk adımı',satir:3}]},
 {id:'kitap',ikon:'📖',ad:'Kitap Tahlili ve Okuma Günlüğü',kisa:'Okuma halkası ve kitap tahlili için tek sayfalık form.',kimlik:OGRENCI_BASLIK,
  bloklar:[{t:'alan',ad:'Kitabın adı / yazarı',satir:1},{t:'alan',ad:'Kitapta Kudüs’ü ya da Mescid-i Aksa’yı anlatan bölümler',satir:3},{t:'alan',ad:'Kitaptan öğrendiğim üç bilgi',satir:4},{t:'alan',ad:'Beni en çok etkileyen cümle / bölüm ve nedeni',satir:3},{t:'alan',ad:'Arkadaşlarıma önerir miyim? Neden?',satir:2}]},
 {id:'soylesi',ikon:'🎤',ad:'Söyleşi Soru Hazırlama Formu',kisa:'Konuğa sorulacak soruların önceden hazırlanması için form.',kimlik:['Hazırlayan','Sınıfı','Tarih'],
  bloklar:[{t:'alan',ad:'Söyleşinin konusu / konuk',satir:1},{t:'tablo',sutunlar:['Sorum','Sormak istememin nedeni'],satir:7},{t:'alan',ad:'Söyleşiden sonra not almak istediklerim',satir:3}]},
 {id:'kaynak',ikon:'🔍',ad:'Güvenilir Kaynak Kontrol Listesi',kisa:'Araştırmada kullanılan kaynağın güvenilirliğini sınama listesi.',kimlik:OGRENCI_BASLIK,
  bloklar:[{t:'alan',ad:'Kaynağın adı / adresi',satir:2},{t:'kontrol',maddeler:['Yazarı ya da yayımlayan kurum belli mi?','Yayın tarihi var mı, güncel mi?','Bilgi başka güvenilir kaynaklarla uyuşuyor mu?','Kaynak gösteriyor mu (kitap, belge, uzman)?','Dili tarafsız mı; ayrıştırıcı ya da örseleyici ifade var mı?','Görseller için kaynak ve izin bilgisi var mı?']},{t:'alan',ad:'Sonuç: Bu kaynağı kullanabilirim / kullanamam çünkü…',satir:3}]},
 {id:'film',ikon:'🎬',ad:'Film / Belgesel Okuma Formu',kisa:'Gösterim öncesi ve sonrası doldurulacak değerlendirme formu.',kimlik:OGRENCI_BASLIK,
  bloklar:[{t:'alan',ad:'Filmin / belgeselin adı',satir:1},{t:'alan',ad:'İzlemeden önce: Bu film hakkında ne düşünüyorum?',satir:2},{t:'alan',ad:'Konusu kısaca',satir:3},{t:'alan',ad:'Öğrendiğim yeni bilgiler',satir:3},{t:'alan',ad:'Bende uyandırdığı duygu ve düşünceler',satir:3},{t:'alan',ad:'Filmden aklımda kalan bir değer (adalet, merhamet…)',satir:2}]},
 {id:'gecepro',ikon:'🌙',ad:'Kudüs Gecesi Program Akışı',kisa:'Kapanış programı için akış ve görev dağılımı çizelgesi.',kimlik:['Programın adı','Tarih / Saat','Yer'],
  bloklar:[{t:'dolu',sutunlar:['Sıra','Saat','Bölüm','Sorumlu'],satirlar:[['1','','Açılış ve saygı duruşu',''],['2','','Kur’an-ı Kerim tilaveti',''],['3','','Açılış konuşması',''],['4','','Şiir dinletisi',''],['5','','Drama / tiyatro',''],['6','','Kısa belgesel / dijital sunum',''],['7','','Ürün sergisi gezisi',''],['8','','Kapanış ve teşekkür','']],bos:3},{t:'alan',ad:'Görev dağılımı (sunucu, ses, sahne, sergi, karşılama)',satir:4}]}
];

global.KudusBenimVeri={YIL,AD,KAYNAK,ONERI_NOTU,SAYFALAR,DUZEYLER,AYLAR,NEDIR,ETKINLIKLER,ULUSAL,TAKVIM,EK1,EK2,KAGITLAR,
 etkinlik:id=>ETKINLIKLER.find(e=>e.id===id)||null};
})(window);
