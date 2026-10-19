/* Koruk Asistan — Kullanım Kılavuzu içeriği (tek kaynak).
 * js/modules/guide.js (uygulama içi rehber) ve scripts/guide-build.py (ekran görüntüleri + PDF) bu dosyayı okur.
 * Ekran görüntüleri gerçek uygulamadan, kurgusal örnek veriyle alınır (scripts/guide-seed.js); gerçek kişi verisi içermez.
 * `geometri` bloğu scripts/guide-build.py tarafından otomatik yazılır; elle düzenlemeyin.
 * Metinlerde **kalın** yazım desteklenir. Bir konuya ait yeni ekran eklemek için `ekranlar` içine `cekim` adımlarıyla yeni bir kayıt eklenir. */
(function(global){
'use strict';

const D={
  gorselBoyut:[780,1688],
  kategoriler:[
    {id:'baslangic',ad:'Başlangıç',ikon:'🚀'},
    {id:'kisiler',ad:'Öğretmen & Öğrenciler',ikon:'👥'},
    {id:'programlar',ad:'Programlar',ikon:'🗓️'},
    {id:'iletisim',ad:'İletişim & Haberler',ikon:'💬'},
    {id:'belgeler',ad:'Döküman, Evrak & Rapor',ikon:'📄'},
    {id:'ayarlar',ad:'Ayarlar ve Veriler',ikon:'⚙️'}
  ],
  baglantilar:{
    web:'https://sedonet23.github.io/okul/',
    apk:'https://github.com/okulyonetim/okulyonetim.github.io/releases/latest/download/app-release.apk',
    optik:{
      ad:'Optik Okuyucu',
      aciklama:'Kamera tabanlı optik okuyucu (OMR) Android uygulamasıdır; okul yönetim uygulamasının verilerini kullanır. Koruk Asistan’dan ayrı kurulur.',
      apk:'https://github.com/okulyonetim/optikokuyucu/releases/latest/download/optik-okuyucu.apk',
      depo:'https://github.com/okulyonetim/optikokuyucu/releases/latest',
      not:'Dosya büyüktür (şu an yaklaşık 260 MB); Wi‑Fi bağlantısıyla indirmeniz önerilir. Android, uygulamayı ilk kez kurarken “bilinmeyen kaynaklardan yükleme” izni isteyebilir.'
    },
    degisiklikler:'https://github.com/okulyonetim/okulyonetim.github.io/commits/main',
    pdf:'assets/guide/Koruk_Asistan_Kullanim_Kilavuzu.pdf',
    pdfAciklama:'Tüm rehberleri tek belgede, yazdırmaya uygun A4 düzeninde indirin.'
  },
  sss:[
    {s:'Kılavuzdaki ekran görüntüleri gerçek mi?',c:'Evet. Görüntüler uygulamanın kendi ekranlarından alınmıştır. Yalnızca içindeki öğretmen, öğrenci, sınıf, telefon ve e-posta bilgileri **kurgusal örnek veridir**; gerçek kişilere ait hiçbir bilgi kullanılmamıştır.'},
    {s:'Bir modülün rehberini neden göremiyorum?',c:'Kılavuz, menüde göremediğiniz bir modülün rehberini listelemez. Hangi modülleri göreceğinizi okul yönetimi belirler; erişim gerekiyorsa uygulama yöneticisine başvurun.'},
    {s:'Üst çubuktaki “?” düğmesi ne yapar?',c:'Açık olduğunuz sayfanın rehberini bir pencerede gösterir. Pencere açılırken sayfa yenilenmez; doldurduğunuz form ya da yaptığınız arama olduğu gibi kalır. Kapatınca kaldığınız yere dönersiniz.'},
    {s:'Ekran görüntüsündeki numaralar ne anlama geliyor?',c:'Her görselin altında aynı numaraları taşıyan bir açıklama listesi vardır. Görsele dokunarak büyütebilir, “İşlem adımları” bölümünde ilgili numaranın vurgulandığını görebilirsiniz.'},
    {s:'Web ve Android uygulaması aynı mı?',c:'Aynı uygulamanın iki kullanım biçimidir. Web sürümü tarayıcıdan açılır; Android sürümü telefona kurulur. Ayrıntı için “Uygulama Hakkında” sayfasına bakın.'}
  ],
  sorunlar:[
    {s:'“Bu işlem için yetkiniz yok” uyarısı alıyorum.',c:'Hesabınızın o işlem için yetkisi yok demektir. Rehberdeki bilgi sizi yetkilendirmez; yetki okul yönetimi tarafından verilir. Gerekiyorsa uygulama yöneticisine başvurun.'},
    {s:'Bir sayfa açılmıyor veya boş görünüyor.',c:'İnternet bağlantınızı kontrol edin, ardından sayfayı yenileyin (Android’de uygulamayı kapatıp yeniden açın). Sorun sürerse “Uygulama Hakkında” sayfasından sürümünüzü kontrol edin; eski sürümler yeni özellikleri göstermeyebilir.'},
    {s:'Kaydet’e bastım ama değişiklik görünmüyor.',c:'Kayıt başarılı olduğunda ekranın üstünde kısa bir bildirim çıkar (örneğin “Öğretmen kaydedildi.”). Hata bildirimi çıktıysa mesajı okuyup gerekli alanı düzeltin; bildirim hiç çıkmadıysa bağlantınızı kontrol edip işlemi tekrarlayın.'},
    {s:'Android uygulamam güncel mi, nasıl öğrenirim?',c:'“Uygulama Hakkında” sayfasında bu cihazdaki sürüm ile yayınlanan son sürüm yan yana gösterilir; “Güncellemeleri Kontrol Et” düğmesiyle yeni sürümü yükleyebilirsiniz.'}
  ],
  surumNotKaynagi:'Notlar, her sürümün yayınlandığı işlemin (commit) açıklamasından özetlenmiştir; yalnızca kullanıcıya görünen değişiklikler ve yalnızca yayınlanmış sürümler listelenir.',
  surumNotlari:[
    {surum:'1.3.7131',tarih:'2026-10-19',commit:'88fb248',maddeler:['**Kullanım Kılavuzu**na Yazılı Sınavlar, Deneme Sınavları, Öğrenci Yoklama, Yemek Menüsü, Takvim ve Notlar rehberleri eklendi.']},
    {surum:'1.3.7130',tarih:'2026-10-19',commit:'23b9982',maddeler:['Kullanım Kılavuzu PDF\'inde ekran görüntülerinin üzerine numaralı işaretler çizildi.']},
    {surum:'1.3.7109',tarih:'2026-10-18',commit:'1c43f45',maddeler:['**Harita** arama alanındaki simge boşluğu ve öneri listesi düzeltildi.']},
    {surum:'1.3.7108',tarih:'2026-10-18',commit:'0e3f4f3',maddeler:['Servis oturma planı çıktısı büyütüldü; lejant kaldırıldı ve alt bilgi çakışması giderildi.']},
    {surum:'1.3.7104',tarih:'2026-10-18',commit:'6d71232',maddeler:['**Kurul ve Komisyonlar**: hazır katalog havuzu, görev şablonları ile belge ve dayanak alanları eklendi.','Komisyon raporlarına ekli belge listesi dahil edilir; komisyon kayıtları senkronize edilir.']},
    {surum:'1.3.7093',tarih:'2026-10-18',commit:'a0addfa',maddeler:['Öğretmen raporunda yazdırılan her A4 sayfaya üst ve alt boşluk eklendi.']},
    {surum:'1.3.7089',tarih:'2026-10-18',commit:'cc6507c',maddeler:['Çevrimdışı açılışta Firebase SDK yüklenemese bile uygulama yerel verilerle açılır.']},
    {surum:'1.3.7083',tarih:'2026-10-15',commit:'2a14779',maddeler:['**Öğrenci Tanıma Formu** örnek PDF düzenine uyarlandı: iki sayfalı yerleşim, ayrı soru ve cevap hücreleri.']},
    {surum:'1.3.7049',tarih:'2026-10-14',commit:'dcae216',maddeler:['**Kullanım Kılavuzu**, sayfa içi **Nasıl Kullanılır?** yardımı ve **Uygulama Hakkında** sayfası eklendi.']},
    {surum:'1.3.7048',tarih:'2026-10-14',commit:'fd9cb6b',maddeler:['Düğmelere her basışta çıkan “✓ … seçildi” bildirimi kaldırıldı.']},
    {surum:'1.3.7047',tarih:'2026-10-14',commit:'f675ac0',maddeler:['Raporlarda **Görsel** ve **Paylaş** düğmeleri yeniden çalışır hale geldi; işlem sonucu ekranda bildirim olarak gösterilir.']},
    {surum:'1.3.7046',tarih:'2026-10-14',commit:'b1a44b3',maddeler:['Bilgisayarda uygulama kasması giderildi (cam bulanıklığı efekti ve sürekli çalışan zil animasyonları kapatıldı).']},
    {surum:'1.3.7045',tarih:'2026-10-14',commit:'30b7254',maddeler:['Masaüstü kullanımında yavaşlık azaltıldı (arka plan efektleri sabit hale getirildi).']},
    {surum:'1.3.7044',tarih:'2026-10-14',commit:'28f42dc',maddeler:['**Veriler** sayfasına geri düğmesi eklendi.','Okul ve idari bilgiler admin ile yönetici arasında ortak ve güncel tutulur.']},
    {surum:'1.3.7043',tarih:'2026-10-14',commit:'8e5db0f',maddeler:['Yönetici rolü, bir öğretmen kaydına bağlı olsa bile Personel İşleri ve diğer menüleri görür.']},
    {surum:'1.3.7042',tarih:'2026-10-14',commit:'bb5e5f4',maddeler:['**Yıllık / BEP Planları** ve **Sosyal Kulüpler** sayfaları yeniden tasarlandı; plan sınıfları bağımsız seçilebilir.']},
    {surum:'1.3.7041',tarih:'2026-10-14',commit:'e0be15c',maddeler:['Öğretmen raporu düzeltildi: başka bir öğretmene atanmış rehberlik ve belge kayıtları rapora karışmıyor.']},
    {surum:'1.3.7040',tarih:'2026-10-14',commit:'e4119a1',maddeler:['**Öğretmenler** ve **Öğrenciler** sayfaları, Sınıflar sayfasının tasarım diliyle yeniden tasarlandı.']},
    {surum:'1.3.7039',tarih:'2026-10-14',commit:'306fe1b',maddeler:['Sınıf oturma planı: varsayılan düzen A4 dikey, 8 × 10, “Standart sınıf” oldu.']}
  ],
  konular:[
    {
      id:'kilavuz',kategori:'baslangic',ikon:'📖',baslik:'Kullanım Kılavuzu ve yardım',
      ozet:'Kılavuzda modül arayın, adım adım rehberleri izleyin; açık sayfanın rehberine üstteki “?” düğmesiyle ulaşın.',
      anahtar:'kılavuz yardım nasıl kullanılır soru işareti arama sss sorun giderme rehber pdf',
      ne:'Kullanım Kılavuzu, uygulamadaki modüllerin gerçek ekran görüntüleriyle hazırlanmış rehberlerini tek yerde toplar. Üst çubuktaki **?** düğmesi ise o an açık olan sayfanın rehberini, sayfadan ayrılmadan bir pencerede gösterir.',
      yol:['Ayarlar','Kullanım Kılavuzu'],
      yolNot:'Her sayfada üst çubuktaki **?** düğmesine dokunarak da rehbere ulaşabilirsiniz.',
      rota:['dashboard','guide'],
      eslesme:['dashboard:guide'],
      herkes:true,
      ekranlar:[
        {
          id:'kilavuz-sayfa',baslik:'Kılavuz sayfası',dosya:'kilavuz-sayfa.webp',alt:'Kullanım Kılavuzu sayfası: arama kutusu, kategori düğmeleri ve rehber kartları',baglam:'[data-guide-page]',
          cekim:{rota:['dashboard','guide'],adimlar:[['js',"()=>{let e=document.querySelector('.ka-guide-card');while(e&&!(e.scrollHeight>e.clientHeight+4&&['auto','scroll'].includes(getComputedStyle(e).overflowY)))e=e.parentElement;(e||document.scrollingElement).scrollTop+=170}"]]},
          isaretler:[
            {n:1,baslik:'Yardım (?) düğmesi',aciklama:'Açık olduğunuz sayfanın rehberini pencerede açar. Her sayfada üst çubukta bulunur.',sec:'[data-ka-guide-help]'},
            {n:2,baslik:'Modül ara',aciklama:'Yazdığınız sözcüğe göre rehberleri anında süzer (ör. “nöbet”, “PDF”, “öğretmen”).',sec:'.ka-guide-hero .ka-field'},
            {n:3,baslik:'Kategoriler',aciklama:'Rehberleri konuya göre daraltır. Yanındaki sayı, o kategorideki rehber sayısıdır.',sec:'[data-guide-cats]'},
            {n:4,baslik:'Rehber kartı',aciklama:'“Rehberi Aç” düğmesi modülün ekran tanıtımını, adımlarını ve sık karşılaşılan sorunlarını açar.',sec:'.ka-guide-card'}
          ]
        },
        {
          id:'kilavuz-pencere',baslik:'“Nasıl Kullanılır?” penceresi',dosya:'kilavuz-pencere.webp',alt:'Öğretmenler sayfasının üzerinde açılmış Nasıl Kullanılır? penceresi',
          cekim:{rota:['people','teachers'],adimlar:[['tikla','[data-ka-guide-help]'],['bekle',1200]],sonra:true},
          isaretler:[
            {n:1,baslik:'Pencere başlığı',aciklama:'Hangi sayfanın rehberinin açık olduğunu gösterir.',sec:'.ka-guide-modal__title'},
            {n:2,baslik:'Kapat',aciklama:'Pencereyi kapatır ve sayfaya, kaldığınız yerden döner. Esc tuşu ya da Android’de cihazın geri tuşu da aynı işi görür.',sec:'[data-guide-close]'},
            {n:3,baslik:'Rehber içeriği',aciklama:'Aşağı kaydırarak ekran tanıtımını, adımları ve sorunları okuyun. Açık olduğunuz ekran “Şu an bu ekrandasınız” etiketiyle öne çıkar.',sec:'.ka-guide-modal__body'},
            {n:4,baslik:'Tüm Kılavuz',aciklama:'Pencereyi kapatıp Kullanım Kılavuzu sayfasını açar.',sec:'[data-guide-all]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Kılavuzu açın',metin:'Menüden **Ayarlar › Kullanım Kılavuzu** sayfasını açın.',ekran:'kilavuz-sayfa',isaret:1},
        {baslik:'Rehberi bulun',metin:'Arama kutusuna bir sözcük yazın ya da bir **kategori** düğmesine dokunun.',ekran:'kilavuz-sayfa',isaret:2},
        {baslik:'Rehberi açın',metin:'Karttaki **Rehberi Aç** düğmesine dokunun. Ekran görüntülerindeki numaraları altındaki açıklamalarla eşleştirin; görsele dokunarak büyütebilirsiniz.',ekran:'kilavuz-sayfa',isaret:4},
        {baslik:'Bulunduğunuz sayfanın rehberini açın',metin:'Herhangi bir modül sayfasındayken üst çubuktaki **?** düğmesine dokunun. Rehber, sayfanın üzerinde bir pencerede açılır.',ekran:'kilavuz-pencere',isaret:1},
        {baslik:'Pencereyi kapatın',metin:'**Kapat** düğmesine dokunun. Sayfa yeniden yüklenmez; formda yazdıklarınız ve yaptığınız aramalar olduğu gibi kalır.',ekran:'kilavuz-pencere',isaret:2}
      ],
      kayit:'Kılavuz salt okunur içeriktir; hiçbir kayıt oluşturmaz ya da değiştirmez. Rehber penceresi açılırken ve kapanırken arkadaki sayfa yenilenmez.',
      uyarilar:[
        'Rehberlerin listesi yetkinize göre değişir. Menüde göremediğiniz modülün rehberi listelenmez; rehber penceresindeki “… sayfasına git” düğmesi de yalnızca erişiminiz olan sayfalar için görünür.',
        'Ekran görüntüleri kurgusal örnek verilerle hazırlanmıştır; sizin ekranınızdaki kayıtlar farklı olacaktır.',
        'Menü ya da tam ekran önizleme gibi üst çubuğu kaplayan ekranlarda **?** düğmesi görünmez; önce o ekranı kapatın.'
      ],
      sorunlar:[
        {s:'“Bu ekran için rehber bulunamadı” yazısını görüyorum.',c:'O sayfa için ayrıntılı bir rehber henüz hazırlanmamıştır. Pencerenin altındaki **Tüm Kılavuzu Aç** düğmesiyle diğer rehberlere ulaşabilirsiniz.'},
        {s:'Ekran görüntüsü yerine bir uyarı görüyorum.',c:'Görüntü yüklenemediğinde “Bu ekranın görüntüsü yüklenemedi” uyarısı çıkar. İnternet bağlantınızı kontrol edip rehberi yeniden açın.'}
      ],
      iliskili:['giris-gezinme','hakkinda']
    },
    {
      id:'giris-gezinme',kategori:'baslangic',ikon:'🧭',baslik:'Giriş ve gezinme',
      ozet:'Kullanıcı adı ve şifrenizle giriş yapın; üst çubuk, alt çubuk ve menüyle modüllere ulaşın.',
      anahtar:'giriş şifre kullanıcı adı menü alt çubuk üst çubuk bildirim profil çıkış tema arama hızlı not geri',
      ne:'Uygulamanın giriş ekranı ve her sayfada aynı kalan gezinme düzenidir: **üst çubuk** (ana sayfa, yardım, tema, bildirim, profil), **alt çubuk** (Ana Sayfa, Profilim, Menü, Arama, Hızlı Not) ve modüllerin gruplandığı **Menü**.',
      yolNot:'Giriş ekranı, açık bir oturum yoksa uygulama her açıldığında görünür. Hesabınızı okul yönetimi oluşturur; kendiniz hesap açamazsınız.',
      rota:['dashboard',''],
      eslesme:['view:menu-list','view:search','view:profile','view:profile-detail','view:upcoming'],
      herkes:true,
      ekranlar:[
        {
          id:'giris-ekran',baslik:'Giriş ekranı',dosya:'giris-ekran.webp',alt:'Koruk Asistan giriş ekranı: kullanıcı adı, şifre ve Giriş Yap düğmesi',
          cekim:{ozel:'giris'},
          isaretler:[
            {n:1,baslik:'Kullanıcı adı',aciklama:'Okul yönetiminin size verdiği kullanıcı adını yazın.',sec:'.ka-login-card label:nth-of-type(1)'},
            {n:2,baslik:'Şifre',aciklama:'Şifrenizi yazın. Yanlış girerseniz düğmenin üstünde uyarı çıkar.',sec:'.ka-login-card label:nth-of-type(2)'},
            {n:3,baslik:'Giriş Yap',aciklama:'Bilgilerinizi doğrular. İşlem sürerken düğmede “Giriş yapılıyor…” yazar.',sec:'#girisBtn'}
          ]
        },
        {
          id:'gezinme-ust',baslik:'Üst çubuk ve alt çubuk',dosya:'gezinme-ust.webp',alt:'Ana sayfa: üstte logo, yardım, tema, bildirim ve profil düğmeleri; altta gezinme çubuğu',baglam:'.kh-live-card',
          cekim:{rota:['dashboard','']},
          isaretler:[
            {n:1,baslik:'Okul logosu',aciklama:'Hangi sayfada olursanız olun Ana Sayfa’ya döndürür.',sec:'.ka-app-header [data-ka-home-trigger]'},
            {n:2,baslik:'Nasıl kullanılır?',aciklama:'Açık sayfanın rehberini pencerede gösterir.',sec:'[data-ka-guide-help]'},
            {n:3,baslik:'Tema',aciklama:'Açık ve koyu tema arasında geçiş yapar.',sec:'[data-ka-theme-toggle]'},
            {n:4,baslik:'Bildirimler',aciklama:'Yeni duyuruları ve yaklaşan işleri (hatırlatıcı, sınav) listeler. Üzerindeki sayı bekleyen bildirim sayısıdır.',sec:'[data-ka-header-notification]'},
            {n:5,baslik:'Profil',aciklama:'Profilim, Ayarlar, tema ve Çıkış Yap seçeneklerini açar.',sec:'[data-ka-header-profile]'},
            {n:6,baslik:'Alt çubuk',aciklama:'Ana Sayfa, Profilim, Menü (ortadaki düğme), Arama ve Hızlı Not kısayolları.',sec:'.ka-bottom-nav'}
          ]
        },
        {
          id:'gezinme-menu',baslik:'Menü',dosya:'gezinme-menu.webp',alt:'Tam ekran menü: modül grupları kart olarak listelenir',
          cekim:{rota:['dashboard',''],adimlar:[['tikla','[data-ka-shell-action="menu"]'],['bekle',700]]},
          isaretler:[
            {n:1,baslik:'Düzenle',aciklama:'Menü kartlarını düzenleme moduna alır. Bu düğme yalnızca menüyü düzenleme yetkisi olan kullanıcılarda görünür.',sec:'[data-ka-menu-edit]'},
            {n:2,baslik:'Kapat',aciklama:'Menüyü kapatır.',sec:'[data-ka-menu-close]'},
            {n:3,baslik:'Modül grubu',aciklama:'Karta dokunmak gruptaki sayfaları listeler. Köşedeki sayı, grupta kaç sayfa olduğunu gösterir.',sec:'[data-ka-menu-group="people"]'}
          ]
        },
        {
          id:'gezinme-grup',baslik:'Grup içindeki sayfalar',dosya:'gezinme-grup.webp',alt:'Öğretmen ve Öğrenciler grubunun sayfa listesi',baglam:'[data-ka-menu-key]',
          cekim:{rota:['dashboard',''],adimlar:[['tikla','[data-ka-shell-action="menu"]'],['bekle',600],['tikla','[data-ka-menu-group="people"]'],['bekle',700]]},
          isaretler:[
            {n:1,baslik:'Geri',aciklama:'Menüdeki gruplara döner.',sec:'[data-ka-menu-back]'},
            {n:2,baslik:'Kapat',aciklama:'Menüyü tamamen kapatır.',sec:'[data-ka-menu-close]'},
            {n:3,baslik:'Sayfa',aciklama:'Dokunduğunuz sayfa açılır. Yalnızca erişim yetkiniz olan sayfalar listelenir.',sec:'[data-personel-menu-row]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Giriş yapın',metin:'**Kullanıcı Adı** ve **Şifre** alanlarını doldurup **Giriş Yap**a dokunun.',ekran:'giris-ekran',isaret:3},
        {baslik:'Ana sayfayı tanıyın',metin:'Girişten sonra Ana Sayfa açılır. Üst çubuktan tema, bildirim ve profil işlemlerine; alt çubuktan temel sayfalara ulaşırsınız.',ekran:'gezinme-ust',isaret:6},
        {baslik:'Menüyü açın',metin:'Alt çubuğun ortasındaki **Menü** düğmesine dokunun ve bir modül grubu seçin.',ekran:'gezinme-menu',isaret:3},
        {baslik:'Sayfayı seçin',metin:'Listeden gitmek istediğiniz sayfaya dokunun. Önceki sayfaya dönmek için sayfanın üstündeki **Geri** düğmesini kullanın.',ekran:'gezinme-grup',isaret:3},
        {baslik:'Oturumu kapatın',metin:'Üst çubukta **profil** düğmesine, ardından **Çıkış Yap**a dokunun.',ekran:'gezinme-ust',isaret:5}
      ],
      kayit:'Giriş işlemi yalnızca kullanıcı adınızı ve şifrenizi doğrular; bu ekranda kayıt oluşturulmaz. Çıkış yaptığınızda oturumunuz kapanır ve uygulamayı tekrar kullanmak için yeniden giriş yapmanız gerekir.',
      uyarilar:[
        'Şifrenizi kimseyle paylaşmayın. Ortak kullanılan bir cihazdaysanız işiniz bitince **Çıkış Yap**ın.',
        'Menüde ve alt çubukta yalnızca hesabınızın erişim yetkisi olan sayfalar görünür. Bir sayfayı göremiyorsanız okul yönetimine başvurun.',
        'Android’de cihazın geri tuşu önce açık olan pencereyi kapatır; pencere yoksa önceki sayfaya döner.'
      ],
      sorunlar:[
        {s:'“Kullanıcı adı veya şifre hatalı.” uyarısı alıyorum.',c:'Kullanıcı adını ve şifreyi yeniden yazın (büyük/küçük harfe ve boşluklara dikkat edin). Sorun sürerse şifrenizin sıfırlanması için uygulama yöneticisine başvurun.'},
        {s:'“Çok fazla hatalı deneme yapıldı” uyarısı çıktı.',c:'Güvenlik nedeniyle giriş geçici olarak engellenmiştir. Bir süre bekleyip yeniden deneyin.'},
        {s:'“Bu hesap devre dışı bırakılmış” uyarısı çıktı.',c:'Hesabınız yönetici tarafından devre dışı bırakılmıştır. Yöneticinizle iletişime geçin.'},
        {s:'“Hesap Onayı Bekleniyor” ekranını görüyorum.',c:'Hesabınız için yönetici onayı gerekiyor. Onaylanana kadar uygulamayı kullanamazsınız; **Çıkış Yap** düğmesiyle oturumu kapatabilirsiniz.'}
      ],
      iliskili:['ana-ekran','kilavuz']
    },
    {
      id:'ana-ekran',kategori:'baslangic',ikon:'🏠',baslik:'Ana Sayfa',
      ozet:'Canlı ders durumunu, duyuruları, okul özetini ve günün nöbet ile ders bilgilerini tek ekranda görün.',
      anahtar:'ana sayfa dashboard canlı ders zil kalan süre hava durumu duyuru okul özeti hızlı işlemler nöbetçi takvim notlarım',
      ne:'Ana Sayfa günün özetidir. Kartlara dokunarak ilgili modüle geçebilirsiniz; hangi kartların ve kısayolların göründüğü yetkinize bağlıdır.',
      yol:['Ana Sayfa'],
      yolNot:'Alt çubuktaki **Ana Sayfa** düğmesi ya da üst çubuktaki okul logosu sizi her yerden Ana Sayfa’ya getirir.',
      rota:['dashboard',''],
      eslesme:['dashboard:'],
      herkes:true,
      ekranlar:[
        {
          id:'ana-ekran-ust',baslik:'Karşılama, canlı ders ve duyuru',dosya:'ana-ekran-ust.webp',alt:'Ana sayfanın üst bölümü: karşılama, canlı ders kartı, hava durumu ve duyuru',baglam:'.kh-live-card',
          cekim:{rota:['dashboard','']},
          isaretler:[
            {n:1,baslik:'Canlı ders kartı',aciklama:'Şu an kaçıncı derste olunduğunu, kalan süreyi, ders başlangıç ve bitiş saatini ve sıradaki zil saatini gösterir. Kart, zil saatlerine göre canlı güncellenir.',sec:'.kh-bell-modern'},
            {n:2,baslik:'Hava durumu',aciklama:'Hava durumu bilgisi internet bağlantısıyla alınır; bağlantı yoksa “Veri yükleniyor” görünebilir. Karta dokunmak ayrıntıları açar.',sec:'[data-dash-weather]'}
          ]
        },
        {
          id:'ana-ekran-ozet',baslik:'Okul özeti ve hızlı işlemler',dosya:'ana-ekran-ozet.webp',alt:'Ana sayfa: okul özeti kartları ve hızlı işlem düğmeleri',
          cekim:{rota:['dashboard',''],adimlar:[['goster','.ka-school-summary-card']]},
          isaretler:[
            {n:1,baslik:'Okul özeti',aciklama:'Öğretmen, öğrenci, sınıf ve servis sayıları. Karta dokunmak ilgili listeyi açar.',sec:'.ka-school-summary-card'},
          ]
        },
        {
          id:'ana-ekran-hizli',baslik:'Hızlı işlemler',dosya:'ana-ekran-hizli.webp',alt:'Ana sayfa: Sınav Ekle, Not Ekle, Mesaj Gönder ve Duyurular hızlı işlem düğmeleri',
          cekim:{rota:['dashboard',''],adimlar:[['goster','.kh-quick']]},
          isaretler:[
            {n:1,baslik:'Hızlı işlemler',aciklama:'Sık kullanılan işlemlere kısayol (Sınav Ekle, Not Ekle, Mesaj Gönder, Duyurular). Hesabınızın yetkisi olmayan kısayollar görünmez.',sec:'.kh-quick'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Günün durumuna bakın',metin:'Canlı ders kartı hangi derste olduğunuzu ve dersin bitmesine ne kadar kaldığını gösterir.',ekran:'ana-ekran-ust',isaret:1},
        {baslik:'Duyuruları okuyun',metin:'Duyuru kartındaki **Okudum** kutusunu işaretleyerek duyuruyu okuduğunuzu bildirin; **Duyurular** sayfasından tüm duyurulara ulaşın.'},
        {baslik:'Okul özetine dokunun',metin:'Öğretmen, öğrenci, sınıf ya da servis kartına dokunarak ilgili listeyi açın.',ekran:'ana-ekran-ozet',isaret:1},
        {baslik:'Hızlı işlemleri kullanın',metin:'**Sınav Ekle**, **Mesaj Gönder** gibi düğmeler sizi doğrudan ilgili sayfaya götürür.',ekran:'ana-ekran-hizli',isaret:1},
        {baslik:'Aşağı kaydırın',metin:'Ana Sayfa’nın devamında bugünün nöbetçileri, bugünkü dersler, takvim, haftanın nöbet programı ve notlarınız yer alır; her bölümün yanındaki **Tümü** / **Program** bağlantısı ilgili sayfayı açar.'}
      ],
      kayit:'Ana Sayfa bir görüntüleme ekranıdır. Duyuru kartındaki **Okudum** kutusu dışında kayıt oluşturmaz; kartlara dokunmak yalnızca ilgili sayfayı açar.',
      uyarilar:[
        'Canlı ders kartı **Ayarlar › Ders Saatleri** bölümündeki zil saatlerine dayanır; karta dokunmak (yetkiniz varsa) bu ayara götürür.',
        'Kartlardaki sayılar kayıtlı verilerden hesaplanır. Bir sayıya dokunduğunuzda açılan listeden ayrıntıyı doğrulayabilirsiniz.'
      ],
      sorunlar:[
        {s:'Hızlı işlem düğmelerinden biri görünmüyor.',c:'Düğmeler hesabınızın yetkisine göre gösterilir. Yetkiniz olmayan bir işlemin kısayolu yoktur.'}
      ],
      iliskili:['giris-gezinme','duyurular','nobet-programi','ders-programi']
    },
    {
      id:'ogretmenler',kategori:'kisiler',ikon:'🧑‍🏫',baslik:'Öğretmenler',
      ozet:'Öğretmen kayıtlarını görüntüleyin, ekleyin, düzenleyin; ders programı, nöbet ve görevlerini tek profilde görün.',
      anahtar:'öğretmen personel branş excel dışa aktar profil telefon sınıf öğretmeni ekle düzenle whatsapp',
      ne:'Okuldaki öğretmenlerin kayıtlarını tutar. Her öğretmen için **ders programı, nöbet, görevler ve belgeler** tek profilde toplanır. Diğer modüller (ders programı, nöbet, raporlar) öğretmenleri buradaki kayıttan alır.',
      yol:['Öğretmen & Öğrenciler','Öğretmenler'],
      yolNot:'Öğretmen ekleme ve düzenleme düğmeleri yalnızca bu işlem için yetkisi olan kullanıcılara görünür. Yetkiniz yoksa listeyi ve profilleri görüntüleyebilirsiniz.',
      rota:['people','teachers'],
      eslesme:['people:teachers'],
      ekranlar:[
        {
          id:'ogretmenler-liste',baslik:'Öğretmen listesi',dosya:'ogretmenler-liste.webp',alt:'Öğretmenler sayfası: özet sayıları, branş filtresi, arama kutusu ve öğretmen kartları',baglam:'.kcl-list.kpd-page',
          cekim:{rota:['people','teachers']},
          isaretler:[
            {n:1,baslik:'Öğretmen ekle',aciklama:'Yeni öğretmen formunu açar. Bu düğme yalnızca düzenleme yetkisi olanlarda görünür.',sec:'[data-kpd-act="t-add"]'},
            {n:2,baslik:'Özet sayılar',aciklama:'Kayıtlı öğretmen, branş, bugün nöbetçi ve izinli sayıları.',sec:'.kcl-kpis'},
            {n:3,baslik:'Branş filtresi',aciklama:'Bir branşa dokunarak listeyi daraltın; aynı branşa tekrar dokunmak filtreyi kaldırır.',sec:'.kpd-chips'},
            {n:4,baslik:'Arama',aciklama:'Ad, branş veya telefona göre anında arar. Sağdaki × aramayı temizler.',sec:'.kcl-search'},
            {n:5,baslik:'Excel ile içe aktar',aciklama:'Bir Excel dosyasından öğretmenleri toplu yükler. Aynı ad ve soyada sahip kayıt güncellenir, yoksa yeni eklenir.',sec:'[data-kpd-act="pick-excel"]'},
            {n:6,baslik:'Dışa aktar',aciklama:'Listeyi “ogretmenler.csv” dosyası olarak cihaza indirir.',sec:'[data-kpd-act="export-csv"]'},
            {n:7,baslik:'Öğretmen kartı',aciklama:'Karta dokunmak öğretmenin profilini açar. Kartta bugünkü ders sayısı, sıradaki ders ve haftalık ders saati görünür.',sec:'.kpd-card'},
            {n:8,baslik:'Düzenle',aciklama:'Öğretmenin bilgilerini düzenleme formunda açar.',sec:'.kpd-card [data-kpd-act="t-edit"]'}
          ]
        },
        {
          id:'ogretmenler-form',baslik:'Yeni öğretmen formu',dosya:'ogretmenler-form.webp',alt:'Yeni öğretmen formu: ad, soyad, ünvan, branş, telefon ve e-posta alanları',
          cekim:{rota:['people','teachers'],adimlar:[['tikla','[data-kpd-act="t-add"]'],['bekle',500]]},
          isaretler:[
            {n:1,baslik:'Ad ve soyad',aciklama:'Zorunlu alanlardır (yıldızlı). Boş bırakılırsa form kaydedilmez.',sec:'.kpd-form .ka-modal__body > div:nth-of-type(1)'},
            {n:2,baslik:'Ünvan ve branş',aciklama:'Branş alanına yazarken mevcut branşlar önerilir; listede olmayan yeni bir branş da yazabilirsiniz.',sec:'.kpd-form .ka-modal__body > div:nth-of-type(2)'},
            {n:3,baslik:'Telefon ve e-posta',aciklama:'İsteğe bağlıdır. Telefon girilirse öğretmen kartında “Ara” ve WhatsApp kısayolları çıkar.',sec:'.kpd-form .ka-modal__body > div:nth-of-type(3)'}
          ]
        },
        {
          id:'ogretmenler-form-alt',baslik:'Formun alt bölümü ve Kaydet',dosya:'ogretmenler-form-alt.webp',alt:'Yeni öğretmen formunun alt bölümü: sınıf öğretmenliği, notlar, Vazgeç ve Kaydet düğmeleri',
          cekim:{rota:['people','teachers'],adimlar:[['tikla','[data-kpd-act="t-add"]'],['bekle',500],['kaydir','son'],['bekle',400]]},
          isaretler:[
            {n:1,baslik:'Sınıf öğretmenliği',aciklama:'Öğretmeni bir sınıfın sınıf öğretmeni olarak atar. Seçtiğiniz sınıfın önceki sınıf öğretmeni yenisiyle değişir.',sec:'.kpd-form .ka-field:has([name="sinifId"])'},
            {n:2,baslik:'Notlar',aciklama:'Serbest metin alanıdır; isteğe bağlıdır.',sec:'.kpd-form .ka-field:has([name="notlar"])'},
            {n:3,baslik:'Vazgeç',aciklama:'Formu kaydetmeden kapatır.',sec:'.kpd-form .ka-modal__footer .ka-btn--secondary'},
            {n:4,baslik:'Kaydet',aciklama:'Kaydı oluşturur ve “Öğretmen kaydedildi.” bildirimiyle öğretmenin profilini açar.',sec:'.kpd-form button[type="submit"]'}
          ]
        },
        {
          id:'ogretmenler-profil',baslik:'Öğretmen profili',dosya:'ogretmenler-profil.webp',alt:'Öğretmen profili: kimlik kartı, hızlı işlemler, özet sayılar ve sekmeler',baglam:'.kcl-detail.kpd-page',
          cekim:{rota:['people','teachers'],adimlar:[['tikla','.kpd-card'],['bekle',500]]},
          isaretler:[
            {n:1,baslik:'Geri',aciklama:'Öğretmen listesine döner.',sec:'[data-kpd-act="t-back"]'},
            {n:2,baslik:'Düzenle',aciklama:'Öğretmenin bilgilerini düzenleme formunda açar (yetki gerekir).',sec:'.ka-detail-topbar [data-kpd-act="t-edit"]'},
            {n:3,baslik:'Kimlik kartı',aciklama:'Ad, ünvan, branş ve sınıf öğretmenliği ya da izin durumu.',sec:'.kpd-hero'},
            {n:4,baslik:'Hızlı işlemler',aciklama:'WhatsApp, Ara, Mesaj, Program ve Rapor kısayolları. Telefon kayıtlı değilse ilk ikisi pasif görünür.',sec:'.kpd-actions'},
            {n:5,baslik:'Özet sayılar',aciklama:'Haftalık ders saati, bugünkü ders, nöbet ve görev sayısı.',sec:'.kpd-page .kcl-kpis'},
            {n:6,baslik:'Sekmeler',aciklama:'Genel, Program, Nöbet, Görevler ve Belgeler arasında geçiş yapın.',sec:'.kcl-tabs'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Öğretmenler sayfasını açın',metin:'Menüden **Öğretmen & Öğrenciler › Öğretmenler** sayfasını açın. Kayıtlı öğretmenler kartlar halinde listelenir.',ekran:'ogretmenler-liste',isaret:2},
        {baslik:'Öğretmeni bulun',metin:'Arama kutusuna ad, branş veya telefon yazın; ya da bir **branş** düğmesine dokunarak listeyi daraltın.',ekran:'ogretmenler-liste',isaret:4},
        {baslik:'Yeni öğretmen ekleyin',metin:'**Öğretmen** düğmesine dokunun. Formda en az **Ad** ve **Soyad** alanlarını doldurun.',ekran:'ogretmenler-liste',isaret:1},
        {baslik:'Bilgileri girin',metin:'Ünvan, branş, telefon ve e-posta gibi diğer alanlar isteğe bağlıdır. Sınıf öğretmeniyse formun altındaki **Sınıf öğretmenliği** alanından sınıfı seçin.',ekran:'ogretmenler-form-alt',isaret:1},
        {baslik:'Kaydedin',metin:'**Kaydet** düğmesine dokunun. “Öğretmen kaydedildi.” bildirimi çıkar ve öğretmenin profili açılır. Vazgeçerseniz **Vazgeç** ile formu kapatın.',ekran:'ogretmenler-form-alt',isaret:4},
        {baslik:'Profili inceleyin',metin:'Listeden bir öğretmen kartına dokunun. Profilde **Program**, **Nöbet**, **Görevler** ve **Belgeler** sekmelerine geçebilirsiniz.',ekran:'ogretmenler-profil',isaret:6},
        {baslik:'Bilgileri düzenleyin',metin:'Kart üzerindeki ya da profildeki **düzenle** simgesiyle formu açın, değişikliği yapıp **Kaydet**e dokunun.',ekran:'ogretmenler-profil',isaret:2}
      ],
      kayit:'**Kaydet**e dokunduğunuzda kayıt oluşturulur (ya da güncellenir) ve “Öğretmen kaydedildi.” bildirimi çıkar. Kayıt başarısız olursa “Kaydedilemedi: …” bildirimi görünür, form açık kalır ve girdiğiniz bilgiler silinmez; sorunu düzeltip yeniden deneyebilirsiniz.',
      uyarilar:[
        'Excel ile içe aktarmada **aynı ad ve soyada sahip öğretmen güncellenir**, yeni bir kayıt oluşmaz. İşlem sonunda kaç kaydın eklendiği ve kaçının güncellendiği bildirilir.',
        'Öğretmen formunda silme düğmesi yoktur; kayıt silme bu sayfadan yapılmaz.',
        'Profildeki **Belgeler** sekmesinde kendi belge durumunuzu değiştiremezsiniz; denerseniz “Kendi belge durumunuzu değiştiremezsiniz.” uyarısı çıkar.'
      ],
      sorunlar:[
        {s:'“Öğretmen” düğmesini görmüyorum.',c:'Öğretmen ekleme yetkisi hesabınızda tanımlı değildir. Listeyi görüntüleyebilirsiniz; yetki için uygulama yöneticisine başvurun.'},
        {s:'Excel dosyasını yükleyince hata alıyorum.',c:'Dosyanın .xlsx ya da .xls olduğundan ve ilk satırlarda sütun başlıklarının (ör. Ad, Soyad, Branş) bulunduğundan emin olun. Ekranda çıkan hata mesajını okuyun; içe aktarma yetkiniz yoksa “Bu işlem için yetkiniz yok.” uyarısı görünür.'},
        {s:'Bir öğretmeni başka bir sınıfın sınıf öğretmeni yaptım; önceki sınıfı ne olur?',c:'Bir öğretmen en fazla bir sınıfın sınıf öğretmeni olarak seçilebilir. Formda başka bir sınıf seçip kaydettiğinizde öğretmen önceki sınıfın sınıf öğretmenliğinden çıkarılır; seçtiğiniz sınıfın önceki sınıf öğretmeni de yenisiyle değişir.'}
      ],
      iliskili:[]
    },
    {
      id:'ogrenciler',kategori:'kisiler',ikon:'🎓',baslik:'Öğrenciler',
      ozet:'Öğrenci kayıtlarını seviye, sınıf ve cinsiyete göre süzün; öğrenci ekleyin, düzenleyin ve profilini açın.',
      anahtar:'öğrenci veli numara sınıf seviye cinsiyet ekle düzenle sil whatsapp rapor sınav devamsızlık profil',
      ne:'Okuldaki öğrencilerin ve velilerinin kayıtlarını tutar. Öğrenci profilinde **genel bilgiler, veli, sınavlar ve devamsızlık** sekmeleri bulunur.',
      yol:['Öğretmen & Öğrenciler','Öğrenciler'],
      yolNot:'Öğrenci ekleme, düzenleme ve silme düğmeleri yalnızca bu işlem için yetkisi olan kullanıcılara görünür.',
      rota:['people','students'],
      eslesme:['people:students'],
      ekranlar:[
        {
          id:'ogrenciler-liste',baslik:'Öğrenci listesi',dosya:'ogrenciler-liste.webp',alt:'Öğrenciler sayfası: özet sayıları, seviye ve sınıf filtreleri, arama ve öğrenci satırları',baglam:'.kcl-list.kpd-page',
          cekim:{rota:['people','students'],adimlar:[['tikla','[data-kpd-act="s-level"][data-v="5"]'],['bekle',500]]},
          isaretler:[
            {n:1,baslik:'Öğrenci ekle',aciklama:'Yeni öğrenci formunu açar. Yalnızca ekleme yetkisi olanlarda görünür.',sec:'[data-kpd-act="s-add"]'},
            {n:2,baslik:'Özet sayılar',aciklama:'Öğrenci, kız, erkek ve sınıf sayısı.',sec:'.kcl-kpis'},
            {n:3,baslik:'Seviye filtresi',aciklama:'Bir seviyeye (ör. 5. sınıflar) dokunarak listeyi daraltın. Aynı seviyeye tekrar dokunmak filtreyi kaldırır.',sec:'.kcl-levels'},
            {n:4,baslik:'Sınıf filtresi',aciklama:'Bir seviye seçildiğinde o seviyedeki şubeler (5-A, 5-B …) çıkar; birine dokunarak yalnızca o sınıfı görün.',sec:'.kpd-chips'},
            {n:5,baslik:'Arama',aciklama:'Öğrenci adı, veli adı, numara veya sınıfa göre arar.',sec:'.kcl-search'},
            {n:6,baslik:'Cinsiyet filtresi',aciklama:'Listeyi Kız ya da Erkek öğrencilerle sınırlar.',sec:'.kpd-seg'},
            {n:7,baslik:'Öğrenci satırı',aciklama:'Satıra dokunmak öğrencinin profilini açar. Satırda numara, veli adı ve varsa servis görünür.',sec:'.kcl-stu'}
          ]
        },
        {
          id:'ogrenciler-profil',baslik:'Öğrenci profili',dosya:'ogrenciler-profil.webp',alt:'Öğrenci profili: kimlik kartı, hızlı işlemler, özet sayılar ve sekmeler',baglam:'.kcl-detail.kpd-page',
          cekim:{rota:['people','students'],adimlar:[['tikla','.kcl-stu'],['bekle',600]]},
          isaretler:[
            {n:1,baslik:'Geri',aciklama:'Öğrenci listesine döner.',sec:'[data-kpd-act="s-back"]'},
            {n:2,baslik:'Düzenle',aciklama:'Öğrencinin bilgilerini düzenleme formunda açar (yetki gerekir).',sec:'.ka-detail-topbar [data-kpd-act="s-edit"]'},
            {n:3,baslik:'Kimlik kartı',aciklama:'Öğrencinin adı, sınıfı, numarası ve veli bilgisi.',sec:'.kpd-hero'},
            {n:4,baslik:'Hızlı işlemler',aciklama:'WhatsApp, Ara, Sınavlar, Veli ve Rapor kısayolları. Telefon kayıtlı değilse ilk ikisi pasif görünür.',sec:'.kpd-actions'},
            {n:5,baslik:'Özet sayılar',aciklama:'Sınav sayısı, son net, devamsız ve geç kalma sayısı.',sec:'.kpd-page .kcl-kpis'},
            {n:6,baslik:'Sekmeler',aciklama:'Genel, Veli, Sınavlar ve Devamsızlık bölümleri arasında geçiş yapın.',sec:'.kcl-tabs'}
          ]
        },
        {
          id:'ogrenciler-form',baslik:'Yeni öğrenci formu',dosya:'ogrenciler-form.webp',alt:'Yeni öğrenci formu: sınıf, öğrenci adı soyadı, numara, cinsiyet ve veli alanları',
          cekim:{rota:['people','students'],adimlar:[['tikla','[data-kpd-act="s-add"]'],['bekle',500]]},
          isaretler:[
            {n:1,baslik:'Sınıf',aciklama:'Öğrencinin sınıfı. Seçmezseniz öğrenci “Sınıfsız” kaydedilir.',sec:'.kpd-form .ka-field:has([name="sinifId"])'},
            {n:2,baslik:'Öğrenci adı soyadı ve numara',aciklama:'Ad soyad zorunludur (yıldızlı). Numara isteğe bağlıdır.',sec:'.kpd-form .ka-grid:has([name="ogrenciAdi"])'},
            {n:3,baslik:'Cinsiyet ve doğum tarihi',aciklama:'İsteğe bağlıdır. Cinsiyet, özet sayılarda ve cinsiyet filtresinde kullanılır.',sec:'.kpd-form .ka-grid:has([name="cinsiyet"])'},
            {n:4,baslik:'Veli adı soyadı',aciklama:'Velinin adı. Telefon ve yakınlık bilgileri formun devamındadır.',sec:'.kpd-form .ka-field:has([name="veliAdi"])'}
          ]
        },
        {
          id:'ogrenciler-form-alt',baslik:'Formun alt bölümü ve Kaydet',dosya:'ogrenciler-form-alt.webp',alt:'Yeni öğrenci formunun alt bölümü: servis, kulüp, notlar, Vazgeç ve Kaydet düğmeleri',
          cekim:{rota:['people','students'],adimlar:[['tikla','[data-kpd-act="s-add"]'],['bekle',500],['kaydir','son'],['bekle',400]]},
          isaretler:[
            {n:1,baslik:'Servis ve sosyal kulüp',aciklama:'Öğrenci servis kullanıyorsa servisi, bir sosyal kulübe üyeyse kulübü seçin. Kullanmıyorsa varsayılan seçenekleri olduğu gibi bırakın.',sec:'.kpd-form .ka-grid:has([name="servisId"])'},
            {n:2,baslik:'Notlar',aciklama:'Serbest metin alanıdır; isteğe bağlıdır.',sec:'.kpd-form .ka-field:has([name="notlar"])'},
            {n:3,baslik:'Vazgeç',aciklama:'Formu kaydetmeden kapatır.',sec:'.kpd-form .ka-modal__footer .ka-btn--secondary'},
            {n:4,baslik:'Kaydet',aciklama:'Öğrenciyi kaydeder ve “Öğrenci kaydedildi.” bildirimiyle profilini açar.',sec:'.kpd-form button[type="submit"]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Öğrenciler sayfasını açın',metin:'Menüden **Öğretmen & Öğrenciler › Öğrenciler** sayfasını açın.',ekran:'ogrenciler-liste',isaret:2},
        {baslik:'Listeyi daraltın',metin:'Önce **seviye**, ardından çıkan **sınıf** düğmelerinden birine dokunun. Cinsiyet filtresini de kullanabilirsiniz.',ekran:'ogrenciler-liste',isaret:3},
        {baslik:'Öğrenciyi arayın',metin:'Arama kutusuna öğrenci adı, veli adı, numara ya da sınıf yazın.',ekran:'ogrenciler-liste',isaret:5},
        {baslik:'Yeni öğrenci ekleyin',metin:'**Öğrenci** düğmesine dokunun, **Sınıf**ı seçin ve **Öğrenci adı soyadı** alanını doldurun.',ekran:'ogrenciler-liste',isaret:1},
        {baslik:'Diğer bilgileri girin',metin:'Numara, cinsiyet, veli adı, telefon, servis ve kulüp gibi alanlar isteğe bağlıdır; bildiklerinizi doldurun.',ekran:'ogrenciler-form',isaret:4},
        {baslik:'Kaydedin',metin:'**Kaydet**e dokunun. “Öğrenci kaydedildi.” bildirimi çıkar ve öğrencinin profili açılır.',ekran:'ogrenciler-form-alt',isaret:4},
        {baslik:'Profili inceleyin',metin:'Listeden bir öğrenciye dokunun. **WhatsApp** ve **Ara** ile veliye ulaşabilir, **Sınavlar**, **Veli** ve **Rapor** kısayollarını kullanabilirsiniz.',ekran:'ogrenciler-profil',isaret:4},
        {baslik:'Düzenleyin ya da silin',metin:'Profildeki **düzenle** simgesiyle formu açın. Yetkiniz varsa formun altında **Sil** düğmesi çıkar; silmeden önce onay istenir.',ekran:'ogrenciler-profil',isaret:2}
      ],
      kayit:'**Kaydet**e dokunduğunuzda “Öğrenci kaydedildi.” bildirimi çıkar. Kayıt başarısız olursa “Kaydedilemedi: …” bildirimi görünür, form açık kalır ve girdiğiniz bilgiler silinmez. Silme işleminde “… kaydı silinsin mi?” onayı sorulur; onaylarsanız “Öğrenci silindi.” bildirimi çıkar.',
      uyarilar:[
        'Öğrenci kayıtları kişisel veri içerir (ad, telefon, adres, kimlik no). Alanları yalnızca gerektiği kadar doldurun ve ekran görüntüsü ya da rapor paylaşırken dikkatli olun.',
        '**Sil** düğmesi yalnızca mevcut bir öğrenciyi düzenlerken ve öğretmen olmayan, öğrenci ekleme yetkisi olan hesaplarda görünür. Öğretmen hesapları öğrenci silemez.',
        'Toplu öğrenci yüklemek için **Sınıflar** sayfasındaki Excel ve e-Okul düğmelerini kullanın.'
      ],
      sorunlar:[
        {s:'“Öğrenci” düğmesini görmüyorum.',c:'Öğrenci ekleme yetkisi hesabınızda tanımlı değildir. Listeyi görüntüleyebilirsiniz; yetki için uygulama yöneticisine başvurun.'},
        {s:'Sınıf filtresi (5-A, 5-B …) görünmüyor.',c:'Sınıf düğmeleri bir **seviye** seçildiğinde çıkar. Önce seviye düğmelerinden birine dokunun.'},
        {s:'WhatsApp ve Ara düğmeleri soluk görünüyor.',c:'Öğrenci için telefon numarası kayıtlı değildir. Düzenle formunda **Telefon 1** alanını doldurun.'}
      ],
      iliskili:['siniflar','ogretmenler']
    },
    {
      id:'siniflar',kategori:'kisiler',ikon:'🏫',baslik:'Sınıflar',
      ozet:'Sınıfları ve şubeleri yönetin; sınıf öğretmenini atayın, öğrenci listesini Excel ya da e-Okul dosyasından yükleyin.',
      anahtar:'sınıf şube derslik sınıf öğretmeni excel e-okul içe aktar oturma planı öğrenci listesi ekle düzenle sil',
      ne:'Okuldaki sınıfları ve şubeleri tutar. Her sınıfın detayında **öğrenciler, oturma planı, dersler ve bilgiler** sekmeleri bulunur. Öğrenci listesi bu sayfadan toplu yüklenebilir.',
      yol:['Öğretmen & Öğrenciler','Sınıflar'],
      yolNot:'Sınıf ekleme, düzenleme ve içe aktarma düğmeleri yalnızca yetkisi olan kullanıcılara görünür.',
      rota:['people','classes'],
      eslesme:['people:classes'],
      ekranlar:[
        {
          id:'siniflar-liste',baslik:'Sınıf listesi',dosya:'siniflar-liste.webp',alt:'Sınıflar sayfası: sınıf ekle, Excel düğmeleri, özet sayılar, seviye filtresi, arama ve sınıf kartları',baglam:'[data-cmp-class-add]',
          cekim:{rota:['people','classes']},
          isaretler:[
            {n:1,baslik:'Sınıf Ekle',aciklama:'Yeni sınıf formunu açar.',sec:'[data-cmp-class-add]'},
            {n:2,baslik:'Sınıf Excel',aciklama:'Sınıf listesini bir Excel dosyasından toplu yükler. Dosyada “Sınıf Adı” sütunu bulunmalıdır.',sec:'[data-classic-excel-button="classes"]'},
            {n:3,baslik:'Özet sayılar',aciklama:'Sınıf, öğrenci, kız ve erkek sayıları.',sec:'.kcl-kpis'},
            {n:4,baslik:'Seviye filtresi',aciklama:'Bir seviyeye dokunarak yalnızca o seviyenin sınıflarını görün.',sec:'.kcl-levels'},
            {n:5,baslik:'Arama',aciklama:'Sınıf adı, derslik veya sınıf öğretmenine göre arar.',sec:'.kcl-search'},
            {n:6,baslik:'Excel ve e-Okul',aciklama:'Öğrenci listesini bir Excel dosyasından ya da e-Okul’dan alınan Sınıf Listesi raporundan yükler.',sec:'[data-cmp-directory-excel-pick], [data-cmp-directory-eokul-pick]'},
            {n:7,baslik:'Sınıf kartı',aciklama:'Karta dokunmak sınıfın detayını açar. Kartta sınıf öğretmeni, derslik, öğrenci sayısı ve kız/erkek dağılımı görünür; köşedeki kalem simgesi sınıf bilgilerini düzenleme formunda açar (yetki gerekir).',sec:'.kcl-card'}
          ]
        },
        {
          id:'siniflar-form',baslik:'Yeni sınıf formu',dosya:'siniflar-form.webp',alt:'Yeni sınıf formu: sınıf adı, seviye, derslik, sınıf öğretmeni ve notlar',
          cekim:{rota:['people','classes'],adimlar:[['tikla','[data-cmp-class-add]'],['bekle',500]]},
          isaretler:[
            {n:1,baslik:'Sınıf adı',aciklama:'Zorunludur (ör. 7-A). Aynı ada sahip ikinci bir sınıf eklenemez.',sec:'.ka-modal label.ka-field:has-text("Sınıf Adı")'},
            {n:2,baslik:'Seviye ve derslik',aciklama:'Seviye (1–8) sınıfı seviye filtresinde gruplar; derslik isteğe bağlıdır.',sec:'.ka-modal label.ka-field:has-text("Seviye"), .ka-modal label.ka-field:has-text("Derslik")'},
            {n:3,baslik:'Sınıf öğretmeni',aciklama:'Kayıtlı öğretmenlerden birini seçin ya da “Atanmadı” bırakın.',sec:'.ka-modal label.ka-field:has-text("Sınıf Öğretmeni")'},
            {n:4,baslik:'Vazgeç',aciklama:'Formu kaydetmeden kapatır.',sec:'[data-cmp-class-form] .ka-modal__footer .ka-btn--secondary'},
            {n:5,baslik:'Kaydet',aciklama:'Sınıfı kaydeder ve “Sınıf kaydedildi.” bildirimini gösterir.',sec:'[data-cmp-class-form] button[type="submit"]'}
          ]
        },
        {
          id:'siniflar-detay',baslik:'Sınıf detayı',dosya:'siniflar-detay.webp',alt:'Sınıf detayı: özet sayılar, sekmeler, öğrenci ekle ve içe aktarma düğmeleri, öğrenci satırları',baglam:'[data-cmp-back]',
          cekim:{rota:['people','classes'],adimlar:[['tikla','.kcl-card'],['bekle',700]]},
          isaretler:[
            {n:1,baslik:'Sınıflara dön',aciklama:'Sınıf listesine döner.',sec:'[data-cmp-back]'},
            {n:2,baslik:'Düzenle',aciklama:'Sınıf bilgilerini düzenleme formunda açar.',sec:'.ka-detail-topbar [data-cmp-class-edit]'},
            {n:3,baslik:'Özet sayılar',aciklama:'Sınıftaki öğrenci, kız, erkek ve ders sayısı.',sec:'.kcl-kpis'},
            {n:4,baslik:'Sekmeler',aciklama:'Öğrenciler, Oturma planı, Dersler ve Bilgiler bölümleri arasında geçiş yapın.',sec:'.kcl-tabs'},
            {n:5,baslik:'Öğrenci ekle',aciklama:'Bu sınıfa yeni öğrenci ekleme formunu açar; sınıf alanı hazır gelir.',sec:'[data-cmp-student-add]'},
            {n:6,baslik:'Excel ve e-Okul',aciklama:'Yalnızca bu sınıfa öğrenci listesi yükler.',sec:'[data-cmp-excel-pick], [data-cmp-eokul-pick]'},
            {n:7,baslik:'Öğrenci satırı',aciklama:'Dokunmak öğrencinin profilini açar.',sec:'.kcl-stu'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Sınıflar sayfasını açın',metin:'Menüden **Öğretmen & Öğrenciler › Sınıflar** sayfasını açın.',ekran:'siniflar-liste',isaret:3},
        {baslik:'Sınıf ekleyin',metin:'**Sınıf Ekle** düğmesine dokunun, **Sınıf adı**nı (ör. 7-A) yazın, seviyeyi ve sınıf öğretmenini seçin.',ekran:'siniflar-form',isaret:1},
        {baslik:'Kaydedin',metin:'**Kaydet**e dokunun. “Sınıf kaydedildi.” bildirimi çıkar ve sınıf listede görünür.',ekran:'siniflar-form',isaret:5},
        {baslik:'Sınıfı açın',metin:'Listeden bir sınıf kartına dokunarak sınıfın detayını açın.',ekran:'siniflar-liste',isaret:7},
        {baslik:'Öğrenci ekleyin ya da yükleyin',metin:'Detayda **Öğrenci ekle** ile tek tek, **Excel** ya da **e-Okul** ile toplu öğrenci ekleyin.',ekran:'siniflar-detay',isaret:5},
        {baslik:'Sekmeleri kullanın',metin:'**Oturma planı** ve **Dersler** sekmelerinden sınıfın oturma planına ve ders programına ulaşın.',ekran:'siniflar-detay',isaret:4}
      ],
      kayit:'**Kaydet**e dokunduğunuzda “Sınıf kaydedildi.” bildirimi çıkar; aynı adda bir sınıf varsa “Bu sınıf adı zaten kullanılıyor.” uyarısı görünür ve kayıt yapılmaz. Excel ya da e-Okul yüklemesi bitince eklenen ve güncellenen kayıt sayısı bildirimle gösterilir.',
      uyarilar:[
        '**Sil** düğmesi yalnızca öğrencisi olmayan sınıflarda çıkar. Öğrencisi olan bir sınıfı silmek için önce öğrencileri başka sınıfa taşıyın.',
        'Excel dosyasında başlık satırı bulunmalıdır: öğrenci listesi için **Öğrenci Adı** (ya da Ad Soyad), e-Okul için **Adı** ve **Soyadı** başlıkları gerekir. e-Okul’da “Sınıf Listesi” raporunu indirip yükleyin.',
        'Excel okuma bileşeni internet üzerinden yüklenir; bağlantı yoksa içe aktarma hata verebilir.',
        'Aynı öğrenci tekrar yüklenirse yeni kayıt açılmaz, mevcut kayıt güncellenir.'
      ],
      sorunlar:[
        {s:'“Başlık satırı bulunamadı” hatası alıyorum.',c:'Seçtiğiniz dosyada gerekli sütun başlıkları yoktur. Öğrenci listesi için “Öğrenci Adı” ya da “Ad Soyad”, sınıf listesi için “Sınıf Adı” sütunu olan bir Excel dosyası seçin.'},
        {s:'“İçe aktarma hatası” görüyorum.',c:'Ekranda yazan hata mesajını okuyun. Bağlantınızı kontrol edin; içe aktarma yetkiniz yoksa “Bu işlem için yetkiniz yok.” uyarısı çıkar.'},
        {s:'Sınıf silinmiyor, Sil düğmesi yok.',c:'Sınıfta öğrenci vardır. Öğrencileri başka bir sınıfa taşıdıktan sonra tekrar deneyin.'}
      ],
      iliskili:['ogrenciler','ogretmenler','ders-programi']
    },
    {
      id:'yazili-sinavlar',kategori:'kisiler',ikon:'📝',baslik:'Yazılı Sınavlar',
      ozet:'Yazılı sınav takvimini oluşturun; sınıf, ders, tarih ve öğretmen bilgisini tek kayıtta tutun.',
      anahtar:'yazılı sınav takvim 1. yazılı 2. yazılı senaryo yayınevi dönem sınıf ders tarih öğretmen sınav kaçıncı ders',
      ne:'Okuldaki yazılı sınavları **sınıf, ders, dönem, tarih, ders saati ve öğretmen** bilgisiyle kaydeder. Sayfanın üstündeki üç sayaç toplam sınavı, **7 gün içindekileri** ve **bugünküleri** gösterir. Sınavlar tarihe göre sıralanır; en ileri tarihli sınav listenin başındadır.',
      yol:['Öğretmen & Öğrenciler','Yazılı Sınavlar'],
      yolNot:'Yazılı Ekle ve Düzenle düğmeleri yalnızca sınav düzenleme yetkisi olan hesaplarda görünür. Bir sınavı yönetici, kaydı ekleyen kişi ya da kayıtta öğretmen olarak seçilen öğretmen düzenleyebilir.',
      rota:['academic','written'],
      eslesme:['academic:written'],
      ekranlar:[
        {
          id:'yazili-liste',baslik:'Yazılı sınav listesi',dosya:'yazili-liste.webp',alt:'Yazılı Sınavlar sayfası: arama kutusu, Yazılı Ekle düğmesi, sınav sayaçları ve sınav kartları',baglam:'.ka-written-page',
          cekim:{rota:['academic','written'],adimlar:[['kaydir',120]]},
          isaretler:[
            {n:1,baslik:'Ara',aciklama:'Ders, sınıf, dönem, yazılı sırası, tarih, yayınevi ya da nota göre sınavları süzer.',sec:'[data-academic-search-wrap]'},
            {n:2,baslik:'Yazılı Ekle',aciklama:'Yeni yazılı sınav formunu açar (yetki gerekir).',sec:'[data-written-new]'},
            {n:3,baslik:'Sayaçlar',aciklama:'Toplam sınav, 7 gün içindeki sınavlar ve bugün yapılacak sınavlar.',sec:'.ka-written-summary'},
            {n:4,baslik:'Sınav başlığı',aciklama:'Dersin adı, sınıflar ve tarih görünür. Sınav yaklaşınca “Bugün” ya da “… gün kaldı” yazar.',sec:'.ka-written-card__head'},
            {n:5,baslik:'Düzenle',aciklama:'Kaydı düzenleme formunda açar (yetki gerekir).',sec:'.ka-written-card [data-written-edit]'}
          ]
        },
        {
          id:'yazili-form',baslik:'Yazılı sınav formu',dosya:'yazili-form.webp',alt:'Yazılı Sınav Ekle formu: sınıf seçimi, dönem, yazılı sırası, ders ve öğretmen',
          cekim:{rota:['academic','written'],adimlar:[['tikla','[data-written-new]'],['bekle',600],['tikla','.ka-modal .ka-check:has-text("5-A")'],['tikla','.ka-modal .ka-check:has-text("5-B")'],['sec','.ka-modal [data-w-lesson]','Matematik'],['sec','.ka-modal [data-w-teacher]','t01']]},
          isaretler:[
            {n:1,baslik:'Sınıf(lar)',aciklama:'Sınavın yapılacağı bir ya da birden fazla sınıfı işaretleyin. En az bir sınıf zorunludur.',sec:'.ka-modal fieldset.ka-field'},
            {n:2,baslik:'Dönem ve Yazılı Sırası',aciklama:'1. veya 2. dönem; 1. veya 2. yazılı seçilir.',sec:'.ka-modal label.ka-field:has([data-w-period]), .ka-modal label.ka-field:has([data-w-order])'},
            {n:3,baslik:'Ders',aciklama:'Zorunludur. Liste, Ayarlar › Ders Listesi’nden gelir. Altındaki Öğretmen listesinden dersin öğretmenini seçersiniz; öğretmen hesabıyla giriş yaptıysanız kendi adınız seçili gelir ve değiştirilemez.',sec:'.ka-modal label.ka-field:has([data-w-lesson])'}
          ]
        },
        {
          id:'yazili-form-alt',baslik:'Formun alt bölümü ve Kaydet',dosya:'yazili-form-alt.webp',alt:'Yazılı Sınav Ekle formunun alt bölümü: tarih, kaçıncı ders, senaryo no, yayınevi, notlar, Vazgeç ve Kaydet',
          cekim:{rota:['academic','written'],adimlar:[['tikla','[data-written-new]'],['bekle',600],['kaydir','son'],['bekle',400]]},
          isaretler:[
            {n:1,baslik:'Tarih ve Kaçıncı Ders',aciklama:'Sınav tarihi varsayılan olarak bugündür. Kaçıncı ders olduğu 1 ile 8 arasında yazılır.',sec:'.ka-modal label.ka-field:has([data-w-date]), .ka-modal label.ka-field:has([data-w-hour])'},
            {n:2,baslik:'Senaryo No ve Yayınevi',aciklama:'İsteğe bağlı alanlardır.',sec:'.ka-modal label.ka-field:has([data-w-scenario]), .ka-modal label.ka-field:has([data-w-publisher])'},
            {n:3,baslik:'Notlar',aciklama:'Sınavla ilgili kısa bir not yazabileceğiniz serbest alandır.',sec:'.ka-modal label.ka-field:has([data-w-notes])'},
            {n:4,baslik:'Vazgeç',aciklama:'Formu kaydetmeden kapatır.',sec:'.ka-modal__footer .ka-btn--secondary'},
            {n:5,baslik:'Kaydet',aciklama:'Sınavı kaydeder ve “Yazılı sınav kaydedildi.” bildirimini gösterir.',sec:'.ka-modal__footer [data-save]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Yazılı Sınavlar sayfasını açın',metin:'Menüden **Öğretmen & Öğrenciler › Yazılı Sınavlar** sayfasını açın.',ekran:'yazili-liste',isaret:3},
        {baslik:'Sınavı bulun',metin:'Arama kutusuna ders, sınıf ya da tarih yazın. Kartın başlığında sınav gününe kaç gün kaldığı görünür.',ekran:'yazili-liste',isaret:1},
        {baslik:'Yeni sınav ekleyin',metin:'**Yazılı Ekle**ye dokunun. **Sınıf(lar)** bölümünden bir ya da daha fazla sınıf işaretleyin.',ekran:'yazili-form',isaret:1},
        {baslik:'Dönem, sıra ve dersi seçin',metin:'**Dönem** ve **Yazılı Sırası**nı seçin, ardından **Ders**i ve **Öğretmen**i belirleyin.',ekran:'yazili-form',isaret:3},
        {baslik:'Tarih ve ayrıntıları girin',metin:'Formu aşağı kaydırın; **Tarih**, **Kaçıncı Ders**, isterseniz **Senaryo No**, **Yayınevi** ve **Notlar** alanlarını doldurun.',ekran:'yazili-form-alt',isaret:1},
        {baslik:'Kaydedin',metin:'**Kaydet**e dokunun. “Yazılı sınav kaydedildi.” bildirimi çıkar ve sınav listede görünür.',ekran:'yazili-form-alt',isaret:5},
        {baslik:'Sınavı güncelleyin',metin:'Kartın altındaki **Düzenle**ye dokunun, bilgileri değiştirin ve yeniden **Kaydet**e dokunun.',ekran:'yazili-liste',isaret:5}
      ],
      kayit:'**Kaydet**e dokunduğunuzda “Yazılı sınav kaydedildi.” bildirimi çıkar. Sınıf seçmediyseniz “En az bir sınıf seçin.”, ders seçmediyseniz “Ders zorunludur.” uyarısı görünür ve form açık kalır. Yetkiniz yoksa “Bu işlem için yetkiniz yok.”, kaydı ekleyen dışında biri değiştirmeye çalışırsa “Bu kaydı yalnızca ekleyen kişi düzenleyebilir.” bildirimi gösterilir. Mevcut sınavı düzenlerken **Sil** düğmesi görünür; onaylarsanız “Yazılı sınav silindi.” bildirimi çıkar.',
      uyarilar:[
        'Silmeden önce “Bu yazılı sınav kaydı silinsin mi?” onayı sorulur. Silinen sınavı bu ekrandan geri getiremezsiniz.',
        'Sınıf listesi **Sınıflar** sayfasındaki kayıtlardan gelir. Sınıf yoksa formda “Önce sınıf ekleyin.” yazar.',
        'Sınav tarihi bugünden önceyse kart yalnızca tarihi gösterir; “Bugün” ve “… gün kaldı” bilgisi bugünden itibaren 7 gün içindeki sınavlar için yazılır.'
      ],
      sorunlar:[
        {s:'Yazılı Ekle düğmesi görünmüyor.',c:'Hesabınızda sınav düzenleme yetkisi tanımlı değildir; sınavları yalnızca görüntüleyebilirsiniz. Uygulama yöneticisine başvurun.'},
        {s:'Düzenle düğmesi bazı sınavlarda yok.',c:'Bir sınavı yalnızca yönetici, kaydı ekleyen kişi ya da kayıtta seçili öğretmen düzenleyebilir.'},
        {s:'Ders listesi boş.',c:'Ders adları **Ayarlar › Ders Listesi**’nden gelir. Listeye ders eklenmemişse formdaki **Ders** seçeneği boş kalır.'}
      ],
      iliskili:['deneme-sinavlari','siniflar','ders-programi']
    },
    {
      id:'deneme-sinavlari',kategori:'kisiler',ikon:'⌛',baslik:'Deneme Sınavları',
      ozet:'Deneme sınavı takvimini, oturum saatlerini ve otomatik canlı sayacı yönetin.',
      anahtar:'deneme sınavı sayaç geri sayım oturum sözel sayısal tek oturum iki oturum süre başlama saati canlı kalan süre',
      ne:'Deneme sınavlarını **tarih, oturum türü, başlama saati, süre ve sınıflar** ile kaydeder. Sınav gününde başlama saati geldiğinde sayaç **kendiliğinden başlar**. Bir sınav kartına dokunarak tam ekran sayacı açabilir; kalan süreyi, aktif oturumu ve oturum takvimini izleyebilirsiniz.',
      yol:['Öğretmen & Öğrenciler','Deneme Sınavları'],
      yolNot:'Deneme Sınavı Ekle ve Düzenle düğmeleri sınav düzenleme yetkisi olan hesaplarda görünür. Bir denemeyi yalnızca yönetici ya da kaydı ekleyen kişi düzenleyebilir.',
      rota:['academic','trial'],
      eslesme:['academic:trial'],
      ekranlar:[
        {
          id:'deneme-liste',baslik:'Deneme sınavı listesi',dosya:'deneme-liste.webp',alt:'Deneme Sınavları sayfası: Deneme Sınavı Ekle düğmesi, sayaçlar ve canlı sayaçlı sınav kartı',baglam:'.ka-trial-page',
          cekim:{rota:['academic','trial'],adimlar:[['kaydir',120]]},
          isaretler:[
            {n:1,baslik:'Deneme Sınavı Ekle',aciklama:'Yeni deneme sınavı formunu açar (yetki gerekir).',sec:'[data-trial-new]'},
            {n:2,baslik:'Sayaçlar',aciklama:'Toplam deneme, 7 gün içindeki denemeler ve şu an çalışan sayaçların sayısı.',sec:'.ka-trial-summary'},
            {n:3,baslik:'Sınav kartı',aciklama:'Sınavın adı, oturum türü, tarihi, oturum saatleri ve sınıfları görünür. Karta dokunmak sayaç ekranını açar.',sec:'.ka-trial-card'},
            {n:4,baslik:'Canlı sayaç',aciklama:'Sınav sürerken kalan süre ve ilerleme çubuğu kartın içinde de görünür; kartta “CANLI” rozeti yanar.',sec:'.ka-trial-card__live'},
            {n:5,baslik:'Düzenle',aciklama:'Kaydı düzenleme formunda açar (yetki gerekir).',sec:'.ka-trial-card [data-trial-edit]'}
          ]
        },
        {
          id:'deneme-form',baslik:'Deneme sınavı formu',dosya:'deneme-form.webp',alt:'Deneme Sınavı Ekle formu: ad, tarih, oturum türü, başlama saati ve sınav süresi',
          cekim:{rota:['academic','trial'],adimlar:[['tikla','[data-trial-new]'],['bekle',600],['yaz','.ka-modal [data-t-name]','4. Deneme Sınavı'],['yaz','.ka-modal [data-t-start]','10:00'],['yaz','.ka-modal [data-t-duration]','80']]},
          isaretler:[
            {n:1,baslik:'Deneme Sınavı Adı',aciklama:'Zorunludur. Boş bırakırsanız form kaydedilmez.',sec:'.ka-modal label.ka-field:has([data-t-name])'},
            {n:2,baslik:'Tarih ve Oturum Türü',aciklama:'Tarih varsayılan olarak bugündür. Oturum türü Tek Oturum ya da İki Oturum olur.',sec:'.ka-modal label.ka-field:has([data-t-date]), .ka-modal label.ka-field:has([data-t-type])'},
            {n:3,baslik:'Başlama saati',aciklama:'Sınavın başlama saatini yazın. Altındaki Sınav Süresi (dakika) alanıyla birlikte bitiş saati kendiliğinden hesaplanır; Bitiş Saati alanı elle doldurulmaz.',sec:'.ka-modal label.ka-field:has([data-t-start])'}
          ]
        },
        {
          id:'deneme-form-iki',baslik:'İki oturumlu deneme',dosya:'deneme-form-iki.webp',alt:'Deneme Sınavı formunda İki Oturum seçilmiş: sözel ve sayısal oturum saatleri ile ara süre',
          cekim:{rota:['academic','trial'],adimlar:[['tikla','[data-trial-new]'],['bekle',600],['sec','.ka-modal [data-t-type]','İki Oturum'],['yaz','.ka-modal [data-t-vstart]','09:40'],['yaz','.ka-modal [data-t-vduration]','75'],['yaz','.ka-modal [data-t-break]','20'],['yaz','.ka-modal [data-t-nduration]','75'],['goster','.ka-modal label.ka-field:has([data-t-vend])']]},
          isaretler:[
            {n:1,baslik:'Sözel oturum',aciklama:'Oturum Türü olarak İki Oturum seçilince bu alanlar açılır. Sözel oturumun başlama saatini ve süresini yazın.',sec:'.ka-modal [data-t-double] > .ka-grid:first-of-type'},
            {n:2,baslik:'Sözel bitiş',aciklama:'Elle yazılmaz; başlama saati ile süreden hesaplanır.',sec:'.ka-modal label.ka-field:has([data-t-vend])'},
            {n:3,baslik:'Oturumlar arası süre',aciklama:'Sözel ve sayısal oturum arasındaki ara dakikasıdır. Sayısal oturum bu süre eklenerek başlar.',sec:'.ka-modal label.ka-field:has([data-t-break])'},
            {n:4,baslik:'Sayısal oturum',aciklama:'Başlama saati kendiliğinden gelir; yalnızca sayısal oturumun süresini yazın.',sec:'.ka-modal [data-t-double] > .ka-grid:last-of-type'}
          ]
        },
        {
          id:'deneme-form-alt',baslik:'Formun alt bölümü ve Kaydet',dosya:'deneme-form-alt.webp',alt:'Deneme Sınavı Ekle formunun alt bölümü: sınıf seçimi, notlar, Vazgeç ve Kaydet',
          cekim:{rota:['academic','trial'],adimlar:[['tikla','[data-trial-new]'],['bekle',600],['kaydir','son'],['bekle',400]]},
          isaretler:[
            {n:1,baslik:'Sınıflar',aciklama:'Bu denemeyi yapacak sınıfları işaretleyin.',sec:'.ka-modal fieldset.ka-field'},
            {n:2,baslik:'Notlar',aciklama:'Sınavla ilgili kısa bir not yazabileceğiniz serbest alandır.',sec:'.ka-modal label.ka-field:has([data-t-notes])'},
            {n:3,baslik:'Vazgeç',aciklama:'Formu kaydetmeden kapatır.',sec:'.ka-modal__footer .ka-btn--secondary'},
            {n:4,baslik:'Kaydet',aciklama:'Denemeyi kaydeder ve “Deneme sınavı kaydedildi.” bildirimini gösterir.',sec:'.ka-modal__footer [data-save]'}
          ]
        },
        {
          id:'deneme-sayac',baslik:'Sayaç ekranı',dosya:'deneme-sayac.webp',alt:'Deneme sınavı sayaç ekranı: aktif oturum, kalan süre halkası ve alttaki özet çubuğu',
          cekim:{rota:['academic','trial'],adimlar:[['tikla','[data-trial-open="d1"]'],['bekle',900]]},
          isaretler:[
            {n:1,baslik:'Geri',aciklama:'Sayaç ekranını kapatıp sınav listesine döner.',sec:'[data-trial-counter-close]'},
            {n:2,baslik:'Durum',aciklama:'Sınavın durumunu yazar: “Sınav devam ediyor”, başlamayı bekliyor ya da tamamlandı.',sec:'[data-trial-counter-state]'},
            {n:3,baslik:'Aktif oturum',aciklama:'Şu an hangi oturumun (ör. Sözel Oturum) ya da aranın sürdüğünü gösterir.',sec:'.ka-trial-counter__session'},
            {n:4,baslik:'Kalan süre',aciklama:'Aktif oturumun kalan süresi saat, dakika ve saniye olarak geri sayar.',sec:'.ka-trial-counter__ring'},
            {n:5,baslik:'Özet çubuğu',aciklama:'Aktif oturumun ve toplam sınavın kalan süresi ile ilerleme yüzdesi her zaman altta görünür.',sec:'.ka-trial-counter__overview'}
          ]
        },
        {
          id:'deneme-sayac-takvim',baslik:'Oturum takvimi',dosya:'deneme-sayac-takvim.webp',alt:'Sayaç ekranının alt bölümü: oturum takvimi ve sınavı takip et kartları',
          cekim:{rota:['academic','trial'],adimlar:[['tikla','[data-trial-open="d1"]'],['bekle',900],['kaydir','son'],['bekle',400]]},
          isaretler:[
            {n:1,baslik:'Oturum takvimi',aciklama:'Her oturumun saat aralığı ve süresi listelenir. Etiket AKTİF, BİTTİ ya da SIRADA olarak değişir.',sec:'.ka-trial-counter__schedule'},
            {n:2,baslik:'Sınavı takip et',aciklama:'Toplam süre, başlangıç ve bitiş saati tek satırda görünür.',sec:'.ka-trial-counter__follow'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Deneme Sınavları sayfasını açın',metin:'Menüden **Öğretmen & Öğrenciler › Deneme Sınavları** sayfasını açın.',ekran:'deneme-liste',isaret:2},
        {baslik:'Yeni deneme ekleyin',metin:'**Deneme Sınavı Ekle**ye dokunun. **Deneme Sınavı Adı**nı yazın (ör. “3. Deneme Sınavı”) ve **Tarih**i seçin.',ekran:'deneme-form',isaret:1},
        {baslik:'Oturum türünü seçin',metin:'**Tek Oturum** için başlama saatini ve süreyi yazın. **İki Oturum** için sözel oturumun başlama saatini ve süresini, arada kaç dakika ara verileceğini ve sayısal oturumun süresini yazın. Bitiş saatleri kendiliğinden hesaplanır.',ekran:'deneme-form-iki',isaret:1},
        {baslik:'Sınıfları işaretleyin ve kaydedin',metin:'Formu aşağı kaydırın, denemeyi yapacak **sınıfları** işaretleyin, isterseniz not yazın ve **Kaydet**e dokunun.',ekran:'deneme-form-alt',isaret:4},
        {baslik:'Sayacı izleyin',metin:'Sınav gününde başlama saati gelince sayaç kendiliğinden başlar. Karttaki **CANLI** rozetinden izleyin ya da karta dokunarak tam ekran sayacı açın.',ekran:'deneme-sayac',isaret:4},
        {baslik:'Oturum takvimine bakın',metin:'Sayaç ekranını aşağı kaydırarak oturumların saatlerini ve hangisinin **AKTİF**, **BİTTİ** ya da **SIRADA** olduğunu görün.',ekran:'deneme-sayac-takvim',isaret:1}
      ],
      kayit:'**Kaydet**e dokunduğunuzda “Deneme sınavı kaydedildi.” bildirimi çıkar. Ad boşsa “Deneme sınavı adı zorunludur.” uyarısı görünür. Yetkiniz yoksa “Bu işlem için yetkiniz yok.”, kaydı ekleyen dışında biri değiştirmeye çalışırsa “Bu kaydı yalnızca ekleyen kişi düzenleyebilir.” bildirimi gösterilir. Mevcut kaydı düzenlerken **Sil** düğmesi çıkar; “Bu deneme sınavı kaydı silinsin mi?” onayından sonra “Deneme sınavı silindi.” bildirimi gösterilir.',
      uyarilar:[
        'Sayaç yalnızca **sınav tarihinde** ve başlama saatinden sonra çalışır. Saat gelmeden sayaç ekranında “Sınava … kaldı” yazar.',
        'Tarih, başlama saati ya da süre eksikse sayaç ekranında “Sayaç bilgisi eksik” uyarısı görünür; **Düzenle** ile bilgileri tamamlayın.',
        'Süre bittiğinde sayaç ekranında “Sınav tamamlandı” ve toplam süre yazar.'
      ],
      sorunlar:[
        {s:'Sayaç başlamıyor.',c:'Kayıttaki tarihin bugün, başlama saatinin geçmiş olması gerekir. Tarih, başlama saati ve süreyi **Düzenle** ile kontrol edin.'},
        {s:'Deneme Sınavı Ekle düğmesi görünmüyor.',c:'Hesabınızda sınav düzenleme yetkisi tanımlı değildir. Uygulama yöneticisine başvurun.'},
        {s:'Bitiş saatini elle yazamıyorum.',c:'Bitiş saatleri süreden otomatik hesaplanır; alanlar bilerek kapalıdır. Süreyi ya da başlama saatini değiştirin.'}
      ],
      iliskili:['yazili-sinavlar','siniflar']
    },
    {
      id:'ogrenci-yoklama',kategori:'kisiler',ikon:'☑️',baslik:'Öğrenci Yoklama',
      ozet:'Sınıf ve tarih seçin; Var, Yok, Geç ya da İzinli işaretleyip yoklamayı tek seferde kaydedin.',
      anahtar:'yoklama devamsızlık yok geç izinli var sınıf yoklaması tüm sınıflar devamsızlar veli whatsapp günlük',
      ne:'Günlük sınıf yoklamasını alır. Öğrenciler varsayılan olarak **Var** gelir; yalnızca gelmeyen, geç gelen ya da izinli olanları işaretlemeniz yeterlidir. Yönetici ayrıca bütün sınıfların günlük özetini ve devamsız öğrencileri görür.',
      yol:['Öğretmen & Öğrenciler','Öğrenci Yoklama'],
      yolNot:'Yönetici dışındaki hesaplarda yalnızca ders programında dersi bulunan ya da sınıf öğretmeni olunan sınıflar listelenir. **Tüm Sınıflar** ve **Devamsızlar** sekmeleri yalnızca yönetici hesabında görünür.',
      rota:['tools','student-attendance'],
      eslesme:['tools:student-attendance'],
      ekranlar:[
        {
          id:'yoklama-sinif',baslik:'Sınıf yoklaması',dosya:'yoklama-sinif.webp',alt:'Öğrenci Yoklama sayfası: sınıf ve tarih seçimi, durum sayaçları ve öğrenci listesi',baglam:'[data-student-page="attendance"]',
          cekim:{rota:['people','teachers'],adimlar:[['rota',['tools','student-attendance'],'Öğrenci Yoklama'],['tikla','[data-att-student="v1"][data-att-status="yok"]'],['kaydir',0],['bekle',400]]},
          isaretler:[
            {n:1,baslik:'Sekmeler',aciklama:'Sınıf Yoklaması, Tüm Sınıflar ve Devamsızlar görünümleri arasında geçer (yalnızca yönetici).',sec:'.ka-attendance-admin-tabs'},
            {n:2,baslik:'Sınıf',aciklama:'Yoklaması alınacak sınıfı seçin.',sec:'.ka-attendance-filters label.ka-field:has(#studentAttendanceClass)'},
            {n:3,baslik:'Tarih',aciklama:'Varsayılan olarak bugündür. Başka bir günü seçerseniz o günün kaydı açılır.',sec:'.ka-attendance-filters label.ka-field:has(#studentAttendanceDate)'},
            {n:4,baslik:'Sayaçlar',aciklama:'Toplam, Var, Yok, Geç ve İzinli sayıları işaretledikçe güncellenir.',sec:'.ka-attendance-summary'},
            {n:5,baslik:'Tümünü Var',aciklama:'Listedeki bütün öğrencileri Var yapar; ardından gelmeyenleri düzeltirsiniz.',sec:'[data-att-all-present]'},
            {n:6,baslik:'Durum düğmeleri',aciklama:'Her öğrenci için Var, Yok, Geç ya da İzinli düğmesine dokunun.',sec:'.ka-attendance-statuses'},
            {n:7,baslik:'Yoklamayı Kaydet',aciklama:'Seçimleri kaydeder.',sec:'[data-att-save]'}
          ]
        },
        {
          id:'yoklama-tumu',baslik:'Tüm sınıflar (yönetici)',dosya:'yoklama-tumu.webp',alt:'Öğrenci Yoklama, Tüm Sınıflar sekmesi: seçili günde yoklaması alınan sınıfların özeti',
          cekim:{rota:['people','teachers'],adimlar:[['rota',['tools','student-attendance'],'Öğrenci Yoklama'],['tikla','[data-att-admin-view="all"]'],['bekle',700]]},
          isaretler:[
            {n:1,baslik:'Tarih',aciklama:'Özeti görmek istediğiniz günü seçin.',sec:'.ka-attendance-datebar label.ka-field'},
            {n:2,baslik:'Sınıf kartı',aciklama:'O gün yoklaması alınan her sınıf için öğrenci sayısı ile Var, Yok ve Geç sayıları görünür. Karta dokunmak sınıf yoklamasını açar.',sec:'.ka-attendance-class-card'}
          ]
        },
        {
          id:'yoklama-devamsiz',baslik:'Devamsızlar (yönetici)',dosya:'yoklama-devamsiz.webp',alt:'Öğrenci Yoklama, Devamsızlar sekmesi: yok ve geç öğrencilerin listesi ile veli iletişim düğmesi',
          cekim:{rota:['people','teachers'],adimlar:[['rota',['tools','student-attendance'],'Öğrenci Yoklama'],['tikla','[data-att-student="v1"][data-att-status="yok"]'],['tikla','[data-att-student="v2"][data-att-status="gec"]'],['tikla','[data-att-save]'],['bekle',900],['tikla','[data-att-admin-view="absent"]'],['bekle',700]]},
          isaretler:[
            {n:1,baslik:'Sınıf ve tarih',aciklama:'Devamsızları görmek istediğiniz sınıfı ve günü seçin.',sec:'.ka-attendance-filters'},
            {n:2,baslik:'Sayaçlar',aciklama:'Toplam, Yok, Geç, Bilgilendirildi ve Bekliyor sayıları.',sec:'.ka-attendance-summary'},
            {n:3,baslik:'Devamsız öğrenci',aciklama:'Öğrencinin adı, sınıfı, veli adı ve telefonu ile Yok ya da Geç durumu görünür.',sec:'.ka-attendance-absence'},
            {n:4,baslik:'WhatsApp',aciklama:'Velinin kayıtlı telefonu için WhatsApp bağlantısını açar. Telefon kayıtlı değilse düğme görünmez.',sec:'.ka-attendance-absence [data-att-contact]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Öğrenci Yoklama sayfasını açın',metin:'Menüden **Öğretmen & Öğrenciler › Öğrenci Yoklama** sayfasını açın.',ekran:'yoklama-sinif',isaret:1},
        {baslik:'Sınıfı ve tarihi seçin',metin:'**Sınıf** listesinden sınıfı, **Tarih** alanından günü seçin. Öğrenciler numara sırasına göre listelenir ve hepsi **Var** olarak başlar.',ekran:'yoklama-sinif',isaret:2},
        {baslik:'Gelmeyenleri işaretleyin',metin:'Gelmeyen öğrencinin **Yok**, geç gelenin **Geç**, izinli olanın **İzinli** düğmesine dokunun. Üstteki sayaçlar anında güncellenir.',ekran:'yoklama-sinif',isaret:6},
        {baslik:'Gerekirse sıfırlayın',metin:'**Tümünü Var** düğmesi bütün öğrencileri yeniden Var yapar.',ekran:'yoklama-sinif',isaret:5},
        {baslik:'Kaydedin',metin:'**Yoklamayı Kaydet**e dokunun. “Yoklama kaydedildi.” bildirimi çıkar; aynı sınıf ve günü yeniden açtığınızda kayıtlı durumlar gelir.',ekran:'yoklama-sinif',isaret:7},
        {baslik:'Yönetici: günün özetine bakın',metin:'**Tüm Sınıflar** sekmesinde o gün yoklaması alınan sınıfların özetini, **Devamsızlar** sekmesinde yok ve geç öğrencileri görürsünüz.',ekran:'yoklama-tumu',isaret:2}
      ],
      kayit:'**Yoklamayı Kaydet**e dokunduğunuzda düğme kısa süre “Kaydediliyor…” yazar ve “Yoklama kaydedildi.” bildirimi çıkar. Kaydedilemezse “Yoklama kaydedilemedi.”, yetki yoksa “Bu işlem için yetkiniz yok.” bildirimi gösterilir. Aynı sınıf ve gün için yeniden kaydederseniz önceki kayıt güncellenir.',
      uyarilar:[
        '**Kaydet**e dokunmadan sınıfı ya da tarihi değiştirirseniz o sırada yaptığınız işaretlemeler kaybolur; önce kaydedin.',
        'Durum düğmelerine dokunmak tek başına kaydetmez; yoklama yalnızca **Yoklamayı Kaydet** ile saklanır.',
        'Devamsızlar sekmesindeki bilgiler yalnızca yöneticiye açıktır ve kayıtlı veli telefonlarını içerir; ekranı başkalarıyla paylaşmayın.'
      ],
      sorunlar:[
        {s:'Sınıf listesinde sınıfım yok.',c:'Yönetici dışındaki hesaplarda yalnızca ders programında dersi olan ya da sınıf öğretmeni olunan sınıflar listelenir. Ders Programı’nda dersinizin tanımlı olup olmadığını kontrol edin.'},
        {s:'Tüm Sınıflar ve Devamsızlar sekmeleri yok.',c:'Bu sekmeler yalnızca yönetici hesabında görünür.'},
        {s:'Öğrenci listesi boş.',c:'Seçili sınıfta kayıtlı öğrenci yoktur. Öğrencileri **Öğrenciler** sayfasından ekleyin.'},
        {s:'WhatsApp düğmesi görünmüyor.',c:'Öğrencinin kaydında veli telefonu yoktur. **Öğrenciler** sayfasında telefonu ekleyin.'}
      ],
      iliskili:['siniflar','ogrenciler','ders-programi']
    },
    {
      id:'cizelgeler',kategori:'kisiler',ikon:'📊',baslik:'Ödev Takip ve Not Çizelgeleri',
      ozet:'Sınıf listesinden çizelge oluşturun; ödev durumunu ya da artı/eksi ve puanları öğrenci bazında işaretleyin, PDF alın.',
      anahtar:'ödev takip çizelgesi not çizelgesi artı eksi puan sınıf öğrenci sütun ödev yaptı yapmadı toplam ortalama pdf kaydet çizelge oluştur',
      ne:'İki ayrı çizelge sayfası vardır. **Ödev Takip Çizelgesi**, bir sınıfın ödevlerini öğrenci bazında takip eder: her öğrenci için ödev yapıldı (**+**) ya da yapılmadı (**−**) olarak işaretlenir. **Not Çizelgesi** ise performansı **Artı / Eksi (+/−)** ya da **Sayısal Puan** olarak tutar; puan modunda satır toplamı ve ortalaması otomatik hesaplanır. Çizelge, oluşturulduğu anda seçilen sınıfın öğrenci listesiyle başlar. Her kullanıcı kendi çizelgelerini görür; yönetici hesabı tüm çizelgeleri görür.',
      yol:['İdari İşler','Ödev Takip Çizelgesi  /  Not Çizelgesi'],
      yolNot:'Her iki sayfa da **İdari İşler** menüsünde yer alır; bu menü, yönetim yetkisi bulunmayan öğretmen hesaplarında gösterilmez. Düzenleme düğmeleri yalnızca çizelgenin sahibinde ve yönetici hesabında görünür.',
      rota:['tools','homework'],
      eslesme:['tools:homework','tools:grades'],
      ekranlar:[
        {
          id:'cizelge-odev-liste',baslik:'Ödev Takip Çizelgesi sayfası',dosya:'cizelge-odev-liste.webp',alt:'Ödev Takip Çizelgesi sayfası: öğrenci ve çizelge sayaçları, sınıf, arama ve durum süzgeçleri',baglam:'.ka-gradebook-page',
          cekim:{rota:['tools','homework'],adimlar:[['kaydir',150]]},
          isaretler:[
            {n:1,baslik:'Sayaçlar',aciklama:'Öğrenci ve çizelge sayısı ile işaretlenmiş ödev özeti: Tamamlanan (+), Bekleyen (henüz işaretlenmemiş) ve Eksik (−).',sec:'.ka-gradebook-stats'},
            {n:2,baslik:'Süzgeçler',aciklama:'Çizelgeleri sınıfa göre süzün, adına göre arayın ya da yalnızca ödev sütunu olmayan ya da ödevi hazır çizelgeleri listeleyin.',sec:'.ka-gradebook-toolbar'},
            {n:3,baslik:'+ Yeni Çizelge',aciklama:'Yeni çizelge oluşturma formunu açar.',sec:'[data-on-new]'}
          ]
        },
        {
          id:'cizelge-odev-kartlar',baslik:'Kayıtlı çizelgeler',dosya:'cizelge-odev-kartlar.webp',alt:'Kayıtlı çizelge kartları: çizelge adı, sınıf, öğrenci ve sütun sayısı, Aç ve PDF düğmeleri',
          cekim:{rota:['tools','homework'],adimlar:[['kaydir','son'],['bekle',400]]},
          isaretler:[
            {n:1,baslik:'Çizelge kartı',aciklama:'Çizelgenin adı, sınıfı, öğrenci sayısı ve sütun (ödev) sayısı görünür.',sec:'.ka-gradebook-card'},
            {n:2,baslik:'Sil (×)',aciklama:'Çizelgeyi onayınızla siler; bu işlem geri alınamaz. Yalnızca sahibi ve yönetici görür.',sec:'.ka-gradebook-card [data-on-delete]'},
            {n:3,baslik:'Aç',aciklama:'Çizelgeyi tam ekran çalışma alanında açar.',sec:'.ka-gradebook-card [data-on-open]'},
            {n:4,baslik:'PDF',aciklama:'Çizelgeyi açmadan PDF önizlemesi hazırlar.',sec:'.ka-gradebook-card [data-on-card-report]'}
          ]
        },
        {
          id:'cizelge-odev-yeni',baslik:'Yeni çizelge formu',dosya:'cizelge-odev-yeni.webp',alt:'Yeni Ödev Takip Çizelgesi formu: çizelge adı, sınıf, Vazgeç ve Oluştur',
          cekim:{rota:['tools','homework'],adimlar:[['kaydir',150],['tikla','[data-on-new]'],['bekle',600],['yaz','[data-gradebook-modal-form] [name="ad"]','7-A Fen Ödevleri'],['sec','[data-gradebook-modal-form] [name="sinifId"]','c6']]},
          isaretler:[
            {n:1,baslik:'Çizelge Adı',aciklama:'Zorunludur. Boş bırakırsanız “Çizelgeye bir isim verin.” uyarısı çıkar.',sec:'[data-gradebook-modal-form] label.ka-field:has([name="ad"])'},
            {n:2,baslik:'Sınıf',aciklama:'Zorunludur. Çizelge, seçtiğiniz sınıfın o andaki öğrenci listesiyle oluşturulur.',sec:'[data-gradebook-modal-form] label.ka-field:has([name="sinifId"])'},
            {n:3,baslik:'Vazgeç',aciklama:'Formu kaydetmeden kapatır.',sec:'[data-gradebook-modal-close].ka-btn'},
            {n:4,baslik:'Oluştur',aciklama:'Çizelgeyi oluşturur, “Çizelge oluşturuldu.” bildirimini gösterir ve çalışma alanında açar.',sec:'[data-gradebook-modal-form] button[type="submit"]'}
          ]
        },
        {
          id:'cizelge-odev-editor',baslik:'Ödev çalışma alanı',dosya:'cizelge-odev-editor.webp',alt:'Ödev çalışma alanı: üst düğmeler, ödev sütunu ve öğrenci satırları',
          cekim:{rota:['tools','homework'],adimlar:[['kaydir','son'],['tikla','.ka-gradebook-card [data-on-open]'],['bekle',700]]},
          isaretler:[
            {n:1,baslik:'+ Yeni Ödev',aciklama:'Çizelgeye yeni bir ödev sütunu ekler.',sec:'.ka-gradebook-workspace__actions [data-on-add-col]'},
            {n:2,baslik:'+ Öğrenci',aciklama:'Listede olmayan bir öğrenciyi elle ekler.',sec:'[data-on-add-student]'},
            {n:3,baslik:'PDF',aciklama:'Çizelgenin PDF önizlemesini hazırlar.',sec:'.ka-gradebook-workspace__actions [data-on-report]'},
            {n:4,baslik:'Kaydet',aciklama:'Değişiklikleri kaydeder. Kaydedilmemiş değişiklik varsa düğmede * işareti görünür.',sec:'[data-on-save]'},
            {n:5,baslik:'Kapat',aciklama:'Çalışma alanını kapatır. Kaydedilmemiş değişiklik varsa onay sorar.',sec:'.ka-gradebook-workspace__actions [data-on-close]'},
            {n:6,baslik:'Sütun araçları',aciklama:'Ödev başlığına dokunarak ödevi düzenleyin. + tüm öğrencilere yaptı, − yapmadı işaretini verir; ↺ ödevdeki tüm işaretleri temizler.',sec:'.ka-gradebook-column-head__tools'},
            {n:7,baslik:'Öğrenci durumu',aciklama:'Hücreye her dokunuşta durum sırayla değişir: boş → + (yaptı) → − (yapmadı) → boş.',sec:'[data-on-cell]'}
          ]
        },
        {
          id:'cizelge-odev-yeni-odev',baslik:'Yeni ödev formu',dosya:'cizelge-odev-yeni-odev.webp',alt:'Yeni Ödev formu: ödev başlığı, ders, tarih, açıklama ve Ödevi Ekle düğmesi',
          cekim:{rota:['tools','homework'],adimlar:[['kaydir','son'],['tikla','.ka-gradebook-card [data-on-open]'],['bekle',700],['tikla','.ka-gradebook-workspace__actions [data-on-add-col]'],['bekle',600],['yaz','[data-gradebook-modal-form] [name="baslik"]','2. Ünite Testi'],['yaz','[data-gradebook-modal-form] [name="ders"]','Türkçe']]},
          isaretler:[
            {n:1,baslik:'Ödev Başlığı',aciklama:'Zorunludur. Boş bırakırsanız “Ödev başlığı girin.” uyarısı çıkar.',sec:'[data-gradebook-modal-form] label.ka-field:has([name="baslik"])'},
            {n:2,baslik:'Ders',aciklama:'İsteğe bağlı; sütun başlığının altında görünür.',sec:'[data-gradebook-modal-form] label.ka-field:has([name="ders"])'},
            {n:3,baslik:'Tarih ve Açıklama',aciklama:'İsteğe bağlı alanlardır.',sec:'[data-gradebook-modal-form] label.ka-field:has([name="tarih"]), [data-gradebook-modal-form] label.ka-field:has([name="aciklama"])'},
            {n:4,baslik:'Ödevi Ekle',aciklama:'Sütunu çizelgeye ekler. Çizelge, Kaydet’e dokunana kadar kaydedilmez.',sec:'[data-gradebook-modal-form] button[type="submit"]'}
          ]
        },
        {
          id:'cizelge-not-kartlar',baslik:'Not Çizelgesi sayfası',dosya:'cizelge-not-kartlar.webp',alt:'Not Çizelgesi sayfası: kayıtlı çizelge kartları, Artı / Eksi ve Sayısal Puan modları',
          cekim:{rota:['tools','grades'],adimlar:[['kaydir','son'],['bekle',400]]},
          isaretler:[
            {n:1,baslik:'Çizelge kartı',aciklama:'Kartta çizelgenin adı, sınıfı ve hücre modu (Artı / Eksi ya da Sayısal puan) yazar.',sec:'.ka-gradebook-card'},
            {n:2,baslik:'Aç',aciklama:'Çizelgeyi çalışma alanında açar.',sec:'.ka-gradebook-card [data-on-open]'},
            {n:3,baslik:'PDF',aciklama:'Çizelgeyi açmadan PDF önizlemesi hazırlar.',sec:'.ka-gradebook-card [data-on-card-report]'}
          ]
        },
        {
          id:'cizelge-not-yeni',baslik:'Yeni Not Çizelgesi formu',dosya:'cizelge-not-yeni.webp',alt:'Yeni Not Çizelgesi formu: çizelge adı, sınıf ve hücre modu seçimi',
          cekim:{rota:['tools','grades'],adimlar:[['kaydir','son'],['tikla','[data-on-new]'],['bekle',600],['yaz','[data-gradebook-modal-form] [name="ad"]','7-A Proje Notları'],['sec','[data-gradebook-modal-form] [name="sinifId"]','c6']]},
          isaretler:[
            {n:1,baslik:'Çizelge Adı ve Sınıf',aciklama:'İkisi de zorunludur.',sec:'[data-gradebook-modal-form] label.ka-field:has([name="ad"]), [data-gradebook-modal-form] label.ka-field:has([name="sinifId"])'},
            {n:2,baslik:'Hücre Modu',aciklama:'Artı / Eksi (+/−) ya da Sayısal Puan. Bu seçim çizelge oluşturulduktan sonra değiştirilemez.',sec:'[data-gradebook-modal-form] label.ka-field:has([name="hucreModu"])'},
            {n:3,baslik:'Oluştur',aciklama:'Çizelgeyi oluşturur ve çalışma alanında açar.',sec:'[data-gradebook-modal-form] button[type="submit"]'}
          ]
        },
        {
          id:'cizelge-not-editor',baslik:'Not çalışma alanı (puan modu)',dosya:'cizelge-not-editor.webp',alt:'Not çalışma alanı: puan kutuları, sütun başlıkları ve satır toplamı',
          cekim:{rota:['tools','grades'],adimlar:[['kaydir','son'],['tikla','.ka-gradebook-card [data-on-open]'],['bekle',700]]},
          isaretler:[
            {n:1,baslik:'+ Sütun',aciklama:'Yeni bir değerlendirme sütunu (etkinlik, proje vb.) ekler.',sec:'.ka-gradebook-workspace__actions [data-on-add-col]'},
            {n:2,baslik:'Kaydet',aciklama:'Değişiklikleri kaydeder.',sec:'[data-on-save]'},
            {n:3,baslik:'Sütun başlığı',aciklama:'Başlığa dokunarak sütunu düzenleyin; × sütunu ve içindeki tüm puanları onayınızla siler.',sec:'.ka-gradebook-column-head'},
            {n:4,baslik:'Puan kutusu',aciklama:'Puanı yazın. Boş bırakılan kutu hesaba katılmaz; negatif ya da geçersiz değer için “Geçerli bir puan girin.” uyarısı çıkar.',sec:'[data-on-score]'}
          ]
        },
        {
          id:'cizelge-not-toplam',baslik:'Toplam ve ortalama sütunları',dosya:'cizelge-not-toplam.webp',alt:'Not çalışma alanı sağa kaydırılmış: Toplam ve Ortalama sütunları',
          cekim:{rota:['tools','grades'],adimlar:[['kaydir','son'],['tikla','.ka-gradebook-card [data-on-open]'],['bekle',700],['js','document.querySelector(".ka-gradebook-table-shell").scrollLeft=99999'],['bekle',300]]},
          isaretler:[
            {n:1,baslik:'Toplam',aciklama:'Öğrencinin girilen puanlarının toplamı. Hiç puan girilmemişse — görünür.',sec:'.ka-gradebook-summary-head, [data-gradebook-total]'},
            {n:2,baslik:'Ortalama',aciklama:'Girilen puanların ortalaması; puan girdikçe anında güncellenir.',sec:'[data-gradebook-average]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Sayfayı açın',metin:'**İdari İşler** menüsünden **Ödev Takip Çizelgesi** ya da **Not Çizelgesi** sayfasını açın.',ekran:'cizelge-odev-liste',isaret:2},
        {baslik:'Yeni çizelge oluşturun',metin:'**+ Yeni Çizelge**ye dokunun, **Çizelge Adı**nı yazın, **Sınıf**ı seçin (Not Çizelgesi’nde **Hücre Modu**nu da seçin) ve **Oluştur**a dokunun.',ekran:'cizelge-odev-yeni',isaret:4},
        {baslik:'Ödev ya da sütun ekleyin',metin:'Açılan çalışma alanında **+ Yeni Ödev** (Not Çizelgesi’nde **+ Sütun**) düğmesine dokunun, başlığı yazın ve ekleyin.',ekran:'cizelge-odev-yeni-odev',isaret:4},
        {baslik:'Öğrencileri işaretleyin',metin:'Ödev çizelgesinde bir öğrencinin hücresine dokunarak **+** ya da **−** durumunu belirleyin; tüm sınıfa tek dokunuşla vermek için sütundaki **+**, **−** ya da **↺** araçlarını kullanın. Puan modunda kutulara puanı yazın.',ekran:'cizelge-odev-editor',isaret:7},
        {baslik:'Kaydedin',metin:'**Kaydet**e dokunun. “Çizelge kaydedildi.” bildirimi çıkar ve düğmedeki * işareti kalkar.',ekran:'cizelge-odev-editor',isaret:4},
        {baslik:'PDF alın',metin:'**PDF**ye dokunarak çizelgenin çıktısını hazırlayın. Beşten fazla sütun varsa çıktı yatay hazırlanır.',ekran:'cizelge-odev-editor',isaret:3}
      ],
      kayit:'Çalışma alanında yaptığınız değişiklikler (işaret, puan, sütun, öğrenci) **Kaydet**e dokunana kadar yalnızca ekranda tutulur; bu sırada üstte “Kaydedilmemiş değişiklikleriniz var” uyarısı görünür. **Kaydet**e dokunduğunuzda “Çizelge kaydedildi.” bildirimi çıkar; internet varsa kayıt diğer cihazlarla eşitlenir. Kaydedilemezse “Çizelge kaydedilemedi.”, yetkiniz yoksa “Bu işlem için yetkiniz yok.” bildirimi gösterilir.',
      uyarilar:[
        'Kaydetmeden **Kapat**a ya da başka bir sayfaya geçmek isterseniz uygulama onay sorar; onaylarsanız kaydedilmemiş değişiklikler kaybolur.',
        'Çizelge, oluşturulduğu andaki sınıf listesiyle başlar. Sonradan sınıfa eklenen öğrenciler çizelgeye otomatik eklenmez; **+ Öğrenci** ile elle ekleyebilirsiniz.',
        'Not Çizelgesi’nin hücre modu (Artı / Eksi ya da Sayısal Puan) oluşturulduktan sonra değiştirilemez; farklı bir mod için yeni çizelge oluşturun.',
        'Bir sütunu silmek, sütundaki tüm işaret ve puanları da siler.'
      ],
      sorunlar:[
        {s:'Sınıf listesinde sınıf çıkmıyor ya da “Önce en az bir sınıf tanımlayın.” uyarısı geliyor.',c:'Çizelge bir sınıfa bağlı oluşturulur. Önce **Sınıflar** sayfasından sınıf tanımlayın.'},
        {s:'Çizelgedeki öğrenci listesi boş.',c:'Seçtiğiniz sınıfa o sırada öğrenci eklenmemiş olabilir. **+ Öğrenci** ile öğrenci ekleyin ya da öğrencileri sınıfa ekledikten sonra yeni bir çizelge oluşturun.'},
        {s:'Düzenleme düğmeleri görünmüyor, hücrelere dokunulamıyor.',c:'Çizelgeyi yalnızca sahibi ve yönetici hesabı düzenleyebilir; diğerleri yalnızca PDF alabilir.'},
        {s:'PDF önizlemesi açılmıyor.',c:'“PDF rapor motoru yüklenemedi.” ya da “PDF önizlemesi açılamadı.” bildirimi çıkıyorsa uygulamayı yeniden açıp tekrar deneyin; sorun sürerse uygulama yöneticisine bildirin.'}
      ],
      iliskili:['siniflar','ogrenciler','okul-raporlari']
    },
    {
      id:'ders-programi',kategori:'programlar',ikon:'🗓️',baslik:'Ders Programı',
      ozet:'Sınıfların haftalık ders programını düzenleyin; Excel ile toplu yükleyin, A4 ve çarşaf rapor alın.',
      anahtar:'ders programı haftalık ders saati sınıf öğretmen çakışma excel şablon temizle çarşaf rapor yazdır',
      ne:'Her sınıf için haftalık ders programını (gün, ders saati, ders, öğretmen) tutar. Aynı öğretmenin aynı saatte iki sınıfa yazılmasını engeller; sınıf ve öğretmen programlarını rapor olarak çıkarır.',
      yol:['Programlar','Ders Programı'],
      yolNot:'Ders ekleme, Excel ve temizleme düğmeleri yalnızca ders programı düzenleme yetkisi olanlarda görünür. Herkes programı görüntüleyebilir ve rapor alabilir.',
      rota:['academic','schedule'],
      eslesme:['academic:schedule'],
      ekranlar:[
        {
          id:'ders-programi-ust',baslik:'Sınıf seçimi ve işlemler',dosya:'ders-programi-ust.webp',alt:'Ders Programı sayfası: sınıf seçimi ve altı işlem kartı',baglam:'.ka-schedule-page',
          cekim:{rota:['academic','schedule']},
          isaretler:[
            {n:1,baslik:'Sınıf seçimi',aciklama:'Programını görmek ya da düzenlemek istediğiniz sınıfı seçin.',sec:'.ka-schedule-class-picker'},
            {n:2,baslik:'Ders Ekle',aciklama:'Seçili güne yeni ders ekleme formunu açar.',sec:'[data-schedule-add]'},
            {n:3,baslik:'Excel Şablonu',aciklama:'Güncel sınıf, ders ve öğretmen listeleriyle doldurulmuş bir Excel şablonu indirir.',sec:'[data-schedule-template]'},
            {n:4,baslik:'Excel’den İçe Aktar',aciklama:'Hazırladığınız programı Excel dosyasından toplu yükler.',sec:'[data-schedule-import]'},
            {n:5,baslik:'Tüm Programı Temizle',aciklama:'Dikkat: tüm sınıfların programını siler. Onay ister ve geri alınamaz.',sec:'[data-schedule-clear]'},
            {n:6,baslik:'Ders Programı (A4)',aciklama:'Seçili sınıfın A4 ders programı raporunu hazırlar.',sec:'[data-schedule-report]'},
            {n:7,baslik:'Çarşaf / Toplu Rapor',aciklama:'Sınıf ve öğretmen programlarını toplu çıktı olarak hazırlar.',sec:'[data-schedule-sheet-report]'}
          ]
        },
        {
          id:'ders-programi-gun',baslik:'Gün seçimi ve dersler',dosya:'ders-programi-gun.webp',alt:'Ders Programı: gün sekmeleri ve seçili günün ders kartları',
          cekim:{rota:['academic','schedule'],adimlar:[['goster','[data-schedule-day]']]},
          isaretler:[
            {n:1,baslik:'Gün sekmeleri',aciklama:'Günü seçin; bugün “Bugün” etiketiyle işaretlidir.',sec:'.ka-schedule-mobile-days'},
            {n:2,baslik:'Ders kartı',aciklama:'Dolu bir saate dokunmak dersi düzenleme formunda açar; boş saate dokunmak o saate ders ekler.',sec:'[data-schedule-cell]'}
          ]
        },
        {
          id:'ders-programi-form',baslik:'Ders ekleme formu',dosya:'ders-programi-form.webp',alt:'Ders Ekle formu: sınıf, gün, ders saati, ders ve öğretmen seçimi',
          cekim:{rota:['academic','schedule'],adimlar:[['tikla','[data-schedule-add]'],['bekle',600]]},
          isaretler:[
            {n:1,baslik:'Sınıf',aciklama:'Seçili sınıf burada gösterilir; formda değiştirilemez. Başka sınıfa ders eklemek için önce sayfada o sınıfı seçin.',sec:'.ka-schedule-form-class'},
            {n:2,baslik:'Gün ve ders saati',aciklama:'Dersin gününü ve 1–7 arasındaki ders saatini seçin.',sec:'select[data-day], select[data-period]'},
            {n:3,baslik:'Ders',aciklama:'Ders listesinden dersi seçin. Ders seçmek zorunludur.',sec:'select[data-lesson]'},
            {n:4,baslik:'Öğretmen',aciklama:'Dersi veren öğretmeni seçin. Öğretmen o gün ve saatte başka bir sınıftaysa çakışma uyarısı çıkar.',sec:'.ka-schedule-form-teacher'},
            {n:5,baslik:'Vazgeç',aciklama:'Formu kaydetmeden kapatır.',sec:'.ka-modal__footer [data-close]'},
            {n:6,baslik:'Kaydet',aciklama:'Dersi programa işler ve “Ders programı kaydedildi.” bildirimini gösterir.',sec:'.ka-modal__footer [data-save]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Ders Programı sayfasını açın',metin:'Menüden **Programlar › Ders Programı** sayfasını açın.',ekran:'ders-programi-ust',isaret:1},
        {baslik:'Sınıfı seçin',metin:'**Sınıf** listesinden programını düzenleyeceğiniz sınıfı seçin.',ekran:'ders-programi-ust',isaret:1},
        {baslik:'Günü seçin',metin:'Gün sekmelerinden günü seçin; o günün ders saatleri kartlar halinde listelenir.',ekran:'ders-programi-gun',isaret:1},
        {baslik:'Ders ekleyin',metin:'**Ders Ekle**ye ya da boş bir saatin kartına dokunun. Formda **Gün**, **Ders saati**, **Ders** ve **Öğretmen** alanlarını doldurun.',ekran:'ders-programi-form',isaret:3},
        {baslik:'Kaydedin',metin:'**Kaydet**e dokunun. Başarılı olursa “Ders programı kaydedildi.” bildirimi çıkar.',ekran:'ders-programi-form',isaret:6},
        {baslik:'Dersi düzenleyin ya da silin',metin:'Dolu bir ders kartına dokunun, değişikliği yapıp **Kaydet**e dokunun. Silmek için formdaki **Sil** düğmesini kullanın; silmeden önce onay istenir.',ekran:'ders-programi-gun',isaret:2},
        {baslik:'Rapor alın',metin:'**Ders Programı** ile seçili sınıfın A4 çıktısını, **Çarşaf / Toplu Rapor** ile toplu çıktıyı hazırlayın.',ekran:'ders-programi-ust',isaret:6}
      ],
      kayit:'**Kaydet**e dokunduğunuzda “Ders programı kaydedildi.” bildirimi çıkar. Aynı öğretmen o gün ve saatte başka bir sınıfa yazılmışsa “Çakışma: … bu gün ve saatte zaten … sınıfına giriyor.” uyarısı, seçilen sınıfın o saatinde zaten ders varsa “Seçilen sınıfın bu gün ve saatinde zaten bir ders var.” uyarısı çıkar ve kayıt yapılmaz. Ders silindiğinde “Ders kaydı silindi.” bildirimi görünür.',
      uyarilar:[
        '**Tüm Programı Temizle** tüm sınıfların ders programı kayıtlarını siler. Onay penceresinde “Bu işlem geri alınamaz” uyarısı çıkar; yalnızca yeni bir programı baştan yüklemeden önce kullanın.',
        'Excel ile toplu yüklemeden önce **Excel Şablonu**nu indirip onu doldurun; şablon güncel sınıf, ders ve öğretmen listelerinizle hazırlanır.',
        'Excel dosyasında **Sınıf**, **Gün**, **Saat** ve **Ders** sütunları zorunludur; **Öğretmen** sütunu isteğe bağlıdır. Boş satırlar içe aktarılmaz. Excel bileşeni internet üzerinden yüklenir; bağlantı yoksa işlem hata verebilir.',
        'Ders listesindeki bir ders yoksa önce **Ayarlar › Ders Listesi** bölümünden ekleyin.'
      ],
      sorunlar:[
        {s:'Sınıf listesi boş, “Sınıf eklenmedi” yazıyor.',c:'Ders programı, **Sınıflar** sayfasındaki kayıtlı sınıfları kullanır. Önce Sınıflar sayfasından sınıf ekleyin.'},
        {s:'“Çakışma” uyarısı alıyorum.',c:'Seçtiğiniz öğretmen aynı gün ve saatte başka bir sınıfa zaten yazılmıştır. Farklı bir saat ya da öğretmen seçin.'},
        {s:'Ders Ekle ve Excel düğmeleri görünmüyor.',c:'Ders programını düzenleme yetkisi hesabınızda tanımlı değildir. Programı görüntüleyebilir ve rapor alabilirsiniz.'}
      ],
      iliskili:['siniflar','ogretmenler','nobet-programi']
    },
    {
      id:'nobet-programi',kategori:'programlar',ikon:'🛡️',baslik:'Nöbet Programı',
      ozet:'Aylık nöbet çizelgesini görüntüleyin, nöbet yerlerini tanımlayın, öğretmen atayın ve nöbet listesini yazdırın.',
      anahtar:'nöbet nöbetçi öğretmen nöbet yeri bahçe kat çizelge atama otomatik dağıtım amir tatil excel liste yazdır',
      ne:'Günlük nöbet yerlerine (bahçe, zemin kat gibi) nöbetçi öğretmen atar. Bugünün nöbetçilerini ve ayın tüm nöbet çizelgesini gösterir; çizelgeyi yazdırılabilir liste olarak hazırlar.',
      yol:['Programlar','Nöbet Programı'],
      yolNot:'Nöbet yeri tanımlama, Excel ve otomatik dağıtım düğmeleri yalnızca nöbet düzenleme yetkisi olanlarda görünür.',
      rota:['management','duty'],
      eslesme:['management:duty'],
      ekranlar:[
        {
          id:'nobet-ust',baslik:'İşlemler ve bugünün nöbetçileri',dosya:'nobet-ust.webp',alt:'Nöbet Programı: dört işlem kartı ve bugünün nöbetçileri',baglam:'.ka-duty-page',
          cekim:{rota:['management','duty']},
          isaretler:[
            {n:1,baslik:'Nöbet Yerleri',aciklama:'Bahçe, bina, kat gibi nöbet yerlerini ekleyin ve yönetin.',sec:'[data-duty-places]'},
            {n:2,baslik:'Excel’den İçe Aktar',aciklama:'Hazır bir nöbet çizelgesini Excel dosyasından toplu yükler.',sec:'[data-duty-excel]'},
            {n:3,baslik:'Nöbet Listesi',aciklama:'Aylık nöbet listesini görüntülemek ve yazdırmak için açar.',sec:'[data-duty-report]'},
            {n:4,baslik:'Otomatik Nöbet Dağıtımı',aciklama:'Referans haftaya göre aylık nöbet dağıtımı oluşturur. En az iki nöbet yeri gerekir.',sec:'[data-duty-auto]'},
            {n:5,baslik:'Bugünün nöbetçileri',aciklama:'Bugün hangi nöbet yerinde hangi öğretmenin nöbetçi olduğunu gösterir.',sec:'.ka-duty-summary-card'}
          ]
        },
        {
          id:'nobet-cizelge',baslik:'Aylık nöbet çizelgesi',dosya:'nobet-cizelge.webp',alt:'Aylık nöbet çizelgesi: gün satırları, nöbet yeri sütunları ve nöbetçi amir sütunu',
          cekim:{rota:['management','duty'],adimlar:[['goster','.ka-duty-month']]},
          isaretler:[
            {n:1,baslik:'Ay seçimi',aciklama:'Önceki Ay ve Sonraki Ay düğmeleriyle başka bir ayın çizelgesine geçin.',sec:'.ka-duty-month'},
            {n:2,baslik:'Çizelge',aciklama:'Her satır bir gündür; her sütun bir nöbet yeridir. Sağdaki sütunları görmek için tabloyu yana kaydırın.',sec:'.ka-duty-grid thead'},
            {n:3,baslik:'Nöbet hücresi',aciklama:'Hücreye dokunmak o gün ve yer için nöbetçi atama formunu açar.',sec:'[data-duty-cell]'}
          ]
        },
        {
          id:'nobet-atama',baslik:'Nöbet atama formu',dosya:'nobet-atama.webp',alt:'Nöbet Ata formu: tarih ve yer ile nöbetçi öğretmen seçimi',
          cekim:{rota:['management','duty'],adimlar:[['goster','[data-duty-cell]'],['tikla','[data-duty-cell]'],['bekle',600]]},
          isaretler:[
            {n:1,baslik:'Tarih / Yer',aciklama:'Atamanın yapıldığı gün ve nöbet yeri. Bu alan değiştirilemez.',sec:'#kaManagementModal .ka-field:nth-of-type(1)'},
            {n:2,baslik:'Nöbetçi öğretmen',aciklama:'Listeden nöbetçi öğretmeni seçin. Seçim yapmadan kaydedemezsiniz.',sec:'#kaManagementModal [data-teacher]'},
            {n:3,baslik:'Atamayı Kaldır',aciklama:'Dolu bir hücreyi açtıysanız mevcut atamayı kaldırır.',sec:'#kaManagementModal [data-delete]'},
            {n:4,baslik:'Kaydet',aciklama:'Atamayı kaydeder ve “Nöbet ataması kaydedildi.” bildirimini gösterir.',sec:'#kaManagementModal [data-save]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Nöbet Programı sayfasını açın',metin:'Menüden **Programlar › Nöbet Programı** sayfasını açın. Üstte bugünün nöbetçilerini görürsünüz.',ekran:'nobet-ust',isaret:5},
        {baslik:'Nöbet yerlerini tanımlayın',metin:'**Nöbet Yerleri**ne dokunun ve **Yeni Nöbet Yeri** ile yerleri ekleyin (ör. Bahçe). Aynı adda ikinci bir yer eklenemez.',ekran:'nobet-ust',isaret:1},
        {baslik:'Ayı seçin',metin:'Çizelgenin üstündeki **Önceki Ay / Sonraki Ay** düğmeleriyle çalışacağınız ayı açın.',ekran:'nobet-cizelge',isaret:1},
        {baslik:'Nöbetçi atayın',metin:'Çizelgede ilgili gün ve yerin hücresine dokunun, **Nöbetçi Öğretmen** listesinden öğretmeni seçip **Kaydet**e dokunun.',ekran:'nobet-atama',isaret:2},
        {baslik:'Atamayı değiştirin ya da kaldırın',metin:'Dolu hücreye dokunup başka bir öğretmen seçin ya da **Atamayı Kaldır**a dokunun.',ekran:'nobet-atama',isaret:3},
        {baslik:'Listeyi yazdırın',metin:'**Nöbet Listesi**ne dokunun; aylık nöbet listesini görüntüleyin ve yazdırın.',ekran:'nobet-ust',isaret:3}
      ],
      kayit:'Atamayı kaydettiğinizde “Nöbet ataması kaydedildi.” bildirimi çıkar. **Nöbetçi Öğretmen** seçmeden kaydetmeye çalışırsanız “Öğretmen seçimi zorunludur.” uyarısı görünür. Yeni nöbet yeri eklendiğinde “Nöbet yeri eklendi.” bildirimi çıkar.',
      uyarilar:[
        '**Otomatik Nöbet Dağıtımı** için en az iki nöbet yeri ve kayıtlı öğretmenler gerekir; aksi halde “Otomatik dağıtım için en az 2 nöbet yeri gerekli.” uyarısı çıkar.',
        'Excel’den içe aktarırken dosyadaki en güncel ay sekmesi kullanılır; “Nöbetçi Amir” ve tarih sütunları otomatik algılanır. Excel okuma bileşeni internetten yüklenir; bağlantı yoksa işlem hata verebilir.',
        'Nöbetçi öğretmenler listesi **Öğretmenler** sayfasındaki kayıtlardan gelir; önce öğretmenleri ekleyin.'
      ],
      sorunlar:[
        {s:'Çizelgede bir hücreye dokunuyorum ama form açılmıyor.',c:'Nöbet atama yetkisi hesabınızda tanımlı değildir. Çizelgeyi görüntüleyebilir ve Nöbet Listesi alabilirsiniz.'},
        {s:'“Bu isimde bir nöbet yeri zaten var” uyarısı çıktı.',c:'Yazdığınız ad, kayıtlı bir nöbet yeriyle aynıdır (büyük/küçük harf farkı sayılmaz). Farklı bir ad yazın.'},
        {s:'Öğretmen listesinde aradığım öğretmen yok.',c:'Öğretmen **Öğretmenler** sayfasında kayıtlı olmalıdır. Önce oradan ekleyin.'}
      ],
      iliskili:['ogretmenler','ders-programi','okul-raporlari']
    },
    {
      id:'yemek-menusu',kategori:'programlar',ikon:'🍽️',baslik:'Yemek Menüsü',
      ozet:'Günlük, haftalık ve aylık öğle yemeği menüsünü görüntüleyin; aylık menüyü düzenleyin, A4 çıktı alın.',
      anahtar:'yemek menüsü günlük haftalık aylık öğle yemeği menü yemek ekle denetim formu a4 çıktı yazdır',
      ne:'Okulun öğle yemeği menüsünü gösterir. **Günlük Menü** ve **Haftalık Menü** yalnızca görüntülemedir; menü girişi **Aylık Menü** sayfasında yapılır. Üç sayfadan da menünün **A4 çıktısını** alabilirsiniz. **Yemek Denetimi** ise yazdırılıp elle doldurulan bir kontrol formudur.',
      yol:['Yemek','Aylık Menü'],
      yolNot:'**Yemek** menüsünde ayrıca Günlük Menü, Haftalık Menü ve Yemek Denetimi sayfaları vardır. Yemek ekleme, silme ve düzenleme ayrı yetkilerdir; yetkiniz yoksa uygulama bunu bildirir. Yemek Denetimi sayfası öğretmen hesaplarında gösterilmez.',
      rota:['food','monthly'],
      eslesme:['food:daily','food:weekly','food:monthly','food:audit'],
      ekranlar:[
        {
          id:'yemek-gunluk',baslik:'Günlük menü',dosya:'yemek-gunluk.webp',alt:'Günlük Menü sayfası: gün seçici, A4 çıktı düğmesi ve seçili günün yemekleri',baglam:'[data-fm-day]',
          cekim:{rota:['food','daily']},
          isaretler:[
            {n:1,baslik:'Gün seçici',aciklama:'Ok düğmeleriyle önceki ya da sonraki iş gününe geçin; ortadaki tarihe dokunarak takvimden gün seçin. Hafta sonu günleri atlanır.',sec:'.ka-fm-stepper'},
            {n:2,baslik:'A4 çıktı',aciklama:'Seçili günün menüsünü yemekhane panosuna asılabilecek A4 çıktı olarak hazırlar.',sec:'[data-fm-print="daily"]'},
            {n:3,baslik:'Günün menüsü',aciklama:'Seçili günün yemekleri sıralanır. Başka bir günü görüyorsanız “Bugün” düğmesi çıkar.',sec:'.ka-fm-hero'}
          ]
        },
        {
          id:'yemek-haftalik',baslik:'Haftalık menü',dosya:'yemek-haftalik.webp',alt:'Haftalık Menü sayfası: hafta seçici ve Pazartesiden Cumaya günlük menü kartları',baglam:'[data-fm-week-date]',
          cekim:{rota:['food','weekly']},
          isaretler:[
            {n:1,baslik:'Hafta seçici',aciklama:'Ok düğmeleriyle önceki ya da sonraki haftaya geçin; tarihe dokunarak haftadan bir gün seçin.',sec:'.ka-fm-stepper'},
            {n:2,baslik:'A4 çıktı',aciklama:'Haftalık menüyü A4 çıktı olarak hazırlar.',sec:'[data-fm-print="weekly"]'},
            {n:3,baslik:'Gün kartı',aciklama:'Pazartesiden Cumaya her gün ayrı kartta gösterilir. Menü girilmemiş günde “Menü girilmemiş” yazar.',sec:'.ka-fm-day'}
          ]
        },
        {
          id:'yemek-aylik',baslik:'Aylık menü (düzenleme)',dosya:'yemek-aylik.webp',alt:'Aylık Menü sayfası: ay seçici, doluluk çubuğu, Kaydet ve A4 çıktı düğmeleri, yemek giriş kutuları',baglam:'[data-fm-month]',
          cekim:{rota:['food','monthly']},
          isaretler:[
            {n:1,baslik:'Ay seçici',aciklama:'Ok düğmeleri ya da listeyle ayı değiştirin.',sec:'.ka-fm-stepper'},
            {n:2,baslik:'Doluluk çubuğu',aciklama:'Ayın kaç iş günü için menü girildiğini gösterir (ör. 21 / 22).',sec:'.ka-fm-meter'},
            {n:3,baslik:'Kaydet',aciklama:'Menüyü kaydeder ve senkronizasyon kuyruğuna alır (yetki gerekir).',sec:'[data-fm-save]'},
            {n:4,baslik:'A4 çıktı',aciklama:'Aylık menüyü yatay A4 çıktı olarak hazırlar.',sec:'[data-fm-print="monthly"]'},
            {n:5,baslik:'Yemek kutuları',aciklama:'Her günün altında yemek adı yazılan kutular bulunur. Kutudaki × yemeği siler.',sec:'.ka-fm-day .ka-fm-items'},
            {n:6,baslik:'Yemek ekle',aciklama:'O güne yeni bir yemek kutusu ekler. Bir güne istediğiniz kadar yemek ekleyebilirsiniz.',sec:'.ka-fm-day [data-fm-add]'}
          ]
        },
        {
          id:'yemek-denetim',baslik:'Yemek denetim formu',dosya:'yemek-denetim.webp',alt:'Yemek Denetim Formu sayfası: yemek sunulan öğrenci sayısı, denetim tarihi, denetleyen öğretmen ve yazdır düğmesi',baglam:'#food-count',
          cekim:{rota:['food','audit']},
          isaretler:[
            {n:1,baslik:'A4 / PDF Yazdır',aciklama:'Formu A4 çıktı olarak hazırlar. Evet, Hayır ve Açıklamalar alanları uygulamada doldurulmaz; çıktı üzerinde elle doldurulur.',sec:'[data-food-print]'},
            {n:2,baslik:'Öğrenci sayısı',aciklama:'Yemek sunulan öğrenci sayısıdır; kayıtlı öğrenci sayısıyla başlar, çıktıdan önce değiştirebilirsiniz.',sec:'label.ka-field:has(#food-count)'},
            {n:3,baslik:'Denetim tarihi',aciklama:'Varsayılan olarak bugündür.',sec:'label.ka-field:has(#food-date)'},
            {n:4,baslik:'Denetleyen öğretmen',aciklama:'Çıktıya yazılacak öğretmeni listeden seçin.',sec:'label.ka-field:has([data-food-teacher])'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Menü sayfasını seçin',metin:'**Yemek** menüsünden **Günlük Menü**, **Haftalık Menü** ya da **Aylık Menü** sayfasını açın.',ekran:'yemek-gunluk',isaret:1},
        {baslik:'Günü ya da haftayı değiştirin',metin:'Ok düğmeleriyle önceki/sonraki güne ya da haftaya geçin; ortadaki tarihe dokunarak istediğiniz günü seçin.',ekran:'yemek-haftalik',isaret:1},
        {baslik:'Aylık menüde yemek ekleyin',metin:'**Aylık Menü** sayfasında ayı seçin, günün altındaki **+ Yemek ekle**ye dokunun ve yemeğin adını yazın. Silmek için kutunun yanındaki **×**’e dokunun.',ekran:'yemek-aylik',isaret:6},
        {baslik:'Kaydedin',metin:'**Kaydet**e dokunun. “Yemek menüsü kaydedildi ve senkronizasyon kuyruğuna alındı.” bildirimi çıkar.',ekran:'yemek-aylik',isaret:3},
        {baslik:'Çıktı alın',metin:'Herhangi bir menü sayfasında **A4 çıktı**ya dokunarak yazdırma ya da PDF olarak kaydetme ekranını açın.',ekran:'yemek-aylik',isaret:4},
        {baslik:'Denetim formunu hazırlayın',metin:'**Yemek Denetimi** sayfasında öğrenci sayısını, tarihi ve denetleyen öğretmeni seçip **A4 / PDF Yazdır**a dokunun; formu çıktı üzerinde elle doldurun.',ekran:'yemek-denetim',isaret:1}
      ],
      kayit:'Aylık menüde yemek adı yazdıkça, **+ Yemek ekle** ya da **×** kullandıkça değişiklik cihaza hemen işlenir. **Kaydet**e dokunduğunuzda menü kaydedilir ve “Yemek menüsü kaydedildi ve senkronizasyon kuyruğuna alındı.” bildirimi çıkar; menü internet bağlantısı olduğunda diğer cihazlarla eşitlenir. Yetkiniz yoksa “Yemek menüsü ekleme yetkiniz yok.”, “Yemek menüsü silme yetkiniz yok.” ya da “Yemek menüsü düzenleme yetkiniz yok.” bildirimi gösterilir.',
      uyarilar:[
        'Günlük ve Haftalık menü sayfalarında yemek eklenemez; bir günün menüsü boşsa “Aylık menüde ekle” bağlantısını kullanın.',
        'Çıktı alma, cihazın yazdırma ya da PDF kaydetme ekranını açar. Çıktı hazırlanamazsa “A4 çıktı hazırlanamadı” bildirimi görünür.',
        'Yemek Denetim Formu’nda Evet/Hayır işaretleri uygulamaya kaydedilmez; form yalnızca yazdırılır.'
      ],
      sorunlar:[
        {s:'“Bu gün için menü girilmemiş” yazıyor.',c:'O güne henüz yemek eklenmemiştir. **Aylık menüde ekle**ye dokunun ya da Aylık Menü sayfasında günü bulup yemekleri ekleyin.'},
        {s:'Hafta sonu menü göremiyorum.',c:'Okulda hafta sonu yemek servisi yapılmaz; menüler Pazartesiden Cumaya girilir.'},
        {s:'Yemek eklenmiyor ya da silinmiyor.',c:'Hesabınızın menü ekleme, silme ya da düzenleme yetkisi tanımlı olmayabilir. Uygulama yöneticisine başvurun.'},
        {s:'Yemek Denetimi menüde yok.',c:'Bu sayfa öğretmen hesaplarında gösterilmez.'}
      ],
      iliskili:['ders-programi','nobet-programi']
    },
    {
      id:'duyurular',kategori:'iletisim',ikon:'📣',baslik:'Duyurular',
      ozet:'Okul duyurularını okuyun; yetkiliyseniz başlık, metin ve görselle yeni duyuru yayınlayın.',
      anahtar:'duyuru yayınla arşiv okundu görsel başlık içerik okuyan kişi',
      ne:'Okul içi duyuruları listeler. Her duyuruda **yeni / okundu** durumu görünür; duyuru yöneticileri duyuru yayınlayabilir, düzenleyebilir, arşivleyebilir ve silebilir.',
      yol:['İletişim & Haberler','Duyurular'],
      yolNot:'Yeni duyuru, düzenleme ve silme düğmeleri yalnızca duyuru yönetme yetkisi olanlarda görünür. Herkes duyuruları okuyabilir.',
      rota:['communication','announcements'],
      eslesme:['communication:announcements','view:announcement'],
      ekranlar:[
        {
          id:'duyurular-liste',baslik:'Duyuru listesi',dosya:'duyurular-liste.webp',alt:'Duyurular sayfası: arama, Aktif ve Arşiv sekmeleri, yeni duyuru düğmesi ve duyuru kartı',baglam:'.ka-announcement-toolbar',
          cekim:{rota:['communication','announcements']},
          isaretler:[
            {n:1,baslik:'Ara',aciklama:'Başlık, kişi veya içeriğe göre duyuru arar.',sec:'.ka-communication-search'},
            {n:2,baslik:'Aktif / Arşiv',aciklama:'Yayındaki ve arşive alınmış duyurular arasında geçiş yapar. Yanındaki sayı, o gruptaki duyuru sayısıdır.',sec:'[data-announcement-filter="active"], [data-announcement-filter="archive"]'},
            {n:3,baslik:'Yeni duyuru',aciklama:'Yeni duyuru formunu açar (yetki gerekir).',sec:'[data-announcement-new]'},
            {n:4,baslik:'Duyuru kartı',aciklama:'Başlık, tarih, yayınlayan kişi ve metnin özeti. Köşedeki etiket duyurunun yeni mi okundu mu olduğunu gösterir.',sec:'.ka-announcement-card'},
            {n:5,baslik:'Duyuruyu Aç',aciklama:'Duyurunun tamamını ve görsellerini açar.',sec:'.ka-announcement-card [data-announcement-open]'},
            {n:6,baslik:'Okundu İşaretle',aciklama:'Duyuruyu okuduğunuzu kaydeder; kart “Okundu” olarak işaretlenir.',sec:'.ka-announcement-card [data-announcement-read]'}
          ]
        },
        {
          id:'duyurular-form',baslik:'Yeni duyuru formu',dosya:'duyurular-form.webp',alt:'Yeni Duyuru formu: başlık, duyuru metni ve görsel ekleme alanı',
          cekim:{rota:['communication','announcements'],adimlar:[['tikla','[data-announcement-new]'],['bekle',700]]},
          isaretler:[
            {n:1,baslik:'Başlık',aciklama:'Zorunludur. Boş bırakırsanız “Başlık zorunlu.” uyarısı çıkar.',sec:'[data-announcement-form] .ka-field:nth-of-type(1)'},
            {n:2,baslik:'Duyuru metni',aciklama:'Duyurunun içeriğini yazın.',sec:'[data-announcement-form] .ka-field:nth-of-type(2)'},
            {n:3,baslik:'Görseller',aciklama:'İsteğe bağlı olarak bir ya da birden fazla görsel ekleyin.',sec:'.ka-announcement-upload'},
            {n:4,baslik:'Duyuruyu Yayınla',aciklama:'Duyuruyu yayınlar ve “Duyuru yayınlandı.” bildirimini gösterir.',sec:'[data-announcement-form] button[type="submit"]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Duyurular sayfasını açın',metin:'Menüden **İletişim & Haberler › Duyurular** sayfasını ya da Ana Sayfa’daki duyuru kartını açın.',ekran:'duyurular-liste',isaret:4},
        {baslik:'Duyuruyu okuyun',metin:'Karttaki **Duyuruyu Aç** düğmesine dokunarak metnin ve görsellerin tamamını görün.',ekran:'duyurular-liste',isaret:5},
        {baslik:'Okundu olarak işaretleyin',metin:'**Okundu İşaretle** düğmesine dokunun. Böylece duyuru sizin için “Okundu” olur.',ekran:'duyurular-liste',isaret:6},
        {baslik:'Arşive bakın',metin:'Eski duyurular için **Arşiv** sekmesine dokunun.',ekran:'duyurular-liste',isaret:2},
        {baslik:'Yeni duyuru yayınlayın',metin:'**＋** düğmesine dokunun, **Başlık** ve duyuru metnini yazın, isterseniz görsel ekleyin ve **Duyuruyu Yayınla**ya dokunun.',ekran:'duyurular-form',isaret:1}
      ],
      kayit:'**Duyuruyu Yayınla**ya dokunduğunuzda “Duyuru yayınlandı.”, mevcut duyuruyu güncellediğinizde “Duyuru güncellendi.” bildirimi çıkar. Başlık boşsa “Başlık zorunlu.” uyarısı görünür; görsel yükleme sırasında ilerleme durumu formda gösterilir. Kayıt başarısız olursa hata bildirimi çıkar ve form açık kalır.',
      uyarilar:[
        'Yayınlanan duyuru, duyuruları görme yetkisi olan herkese görünür. Yayınlamadan önce başlığı ve metni kontrol edin.',
        'Kartlardaki “👁 N kişi okudu” bölümü duyuruyu kimlerin okuduğunu gösterir.',
        'Formdaki **Arşivde** kutusunu işaretlerseniz duyuru aktif listeden kaldırılıp arşivde saklanır; arşivlenen duyuru **Arşiv** sekmesine geçer.'
      ],
      sorunlar:[
        {s:'Yeni duyuru (＋) düğmesini göremiyorum.',c:'Duyuru yayınlama yetkisi hesabınızda tanımlı değildir. Duyuruları okuyabilirsiniz; yetki için uygulama yöneticisine başvurun.'},
        {s:'Görsel yüklenmiyor.',c:'Bağlantınızı kontrol edin ve yalnızca görsel dosyası (JPEG, PNG vb.) seçin.'},
        {s:'Duyuru listesi boş.',c:'“Aktif duyuru bulunamadı” yazıyorsa yayında duyuru yoktur. Arşivlenmiş duyurular için **Arşiv** sekmesine bakın.'}
      ],
      iliskili:['ana-ekran']
    },
    {
      id:'takvim',kategori:'iletisim',ikon:'📆',baslik:'Takvim',
      ozet:'Etkinlik (hatırlatıcı) ve görevlerinizi aylık takvimde izleyin, ekleyin ve düzenleyin.',
      anahtar:'takvim etkinlik hatırlatıcı görev son tarih öncelik durum yapılacak devam ediyor tamamlandı geciken yaklaşan 30 gün',
      ne:'Kişisel **etkinlik (hatırlatıcı)** ve **görevlerinizi** aylık takvim üzerinde gösterir. Üstteki sayaçlar bugünkü etkinlik ve görev sayısını ile geciken işleri verir. Takvimin altında seçili günün kayıtları ve **yaklaşan 30 günün** listesi bulunur. Her kullanıcı yalnızca kendi kayıtlarını görür; yönetici hesabı tüm kayıtları görür.',
      yol:['İletişim & Haberler','Takvim'],
      yolNot:'+ Etkinlik ve + Görev düğmeleri ile Düzenle düğmeleri yalnızca takvim düzenleme yetkisi olan hesaplarda görünür.',
      rota:['communication','calendar'],
      eslesme:['communication:calendar'],
      ekranlar:[
        {
          id:'takvim-ana',baslik:'Takvim sayfası',dosya:'takvim-ana.webp',alt:'Takvim sayfası: Etkinlik ve Görev ekleme düğmeleri, sayaçlar ve aylık takvim',baglam:'.ka-calendar-page',
          cekim:{rota:['communication','calendar'],adimlar:[['kaydir',130]]},
          isaretler:[
            {n:1,baslik:'+ Etkinlik',aciklama:'Yeni etkinlik (hatırlatıcı) formunu açar.',sec:'[data-cal-add="hat"]'},
            {n:2,baslik:'+ Görev',aciklama:'Yeni görev formunu açar.',sec:'[data-cal-add="gorev"]'},
            {n:3,baslik:'Sayaçlar',aciklama:'Bugünkü etkinlik, bugünkü görev ve geciken iş sayıları. Geciken iş: tarihi geçmiş ve tamamlanmamış kayıtlardır.',sec:'.ka-calendar-summary'},
            {n:4,baslik:'Ay seçici',aciklama:'Okla önceki ya da sonraki aya geçin; Bugün düğmesi bugüne döner.',sec:'.ka-calendar-page .ka-card__body > .ka-row:first-child'},
            {n:5,baslik:'Takvim günleri',aciklama:'Bir güne dokunarak o günün kayıtlarını görün. Günün altındaki sayı o güne ait etkinlik ve görev toplamıdır; bugün vurgulanır.',sec:'.ka-calendar-grid'}
          ]
        },
        {
          id:'takvim-gun',baslik:'Seçili gün ve yaklaşan işler',dosya:'takvim-gun.webp',alt:'Takvim sayfasının alt bölümü: seçili günün kayıtları ve yaklaşan 30 günün listesi',
          cekim:{rota:['communication','calendar'],adimlar:[['kaydir','son'],['bekle',400]]},
          isaretler:[
            {n:1,baslik:'Seçili günün kayıtları',aciklama:'Seçili günün başlığı ve kayıt sayısı görünür. Etkinlikler 📌, görevler ✓ simgesiyle gösterilir.',sec:'.ka-calendar-page > section.ka-stack:not([data-calendar-upcoming])'},
            {n:2,baslik:'Düzenle',aciklama:'Kaydı düzenleme formunda açar (yetki gerekir).',sec:'.ka-list-card [data-cal-edit]'},
            {n:3,baslik:'Yaklaşan 30 gün',aciklama:'Bugünden itibaren 30 gün içindeki tamamlanmamış etkinlik ve görevler tarih sırasıyla listelenir (en fazla 12 kayıt).',sec:'[data-calendar-upcoming]'}
          ]
        },
        {
          id:'takvim-etkinlik-form',baslik:'Yeni etkinlik (hatırlatıcı) formu',dosya:'takvim-etkinlik-form.webp',alt:'Yeni Hatırlatıcı formu: başlık, tarih, öncelik, açıklama, Vazgeç ve Kaydet',
          cekim:{rota:['communication','calendar'],adimlar:[['tikla','[data-cal-add="hat"]'],['bekle',600],['yaz','[data-cal-modal] [name="baslik"]','Zümre toplantısı']]},
          isaretler:[
            {n:1,baslik:'Başlık',aciklama:'Zorunludur. Boş bırakırsanız form kaydedilmez.',sec:'[data-cal-modal] label.ka-field:has([name="baslik"])'},
            {n:2,baslik:'Tarih ve Öncelik',aciklama:'Etkinliğin tarihini seçin. Öncelik Düşük, Orta ya da Yüksek olabilir.',sec:'[data-cal-modal] .ka-grid'},
            {n:3,baslik:'Açıklama',aciklama:'İsteğe bağlı kısa not.',sec:'[data-cal-modal] label.ka-field:has([name="aciklama"])'},
            {n:4,baslik:'Vazgeç',aciklama:'Formu kaydetmeden kapatır.',sec:'[data-cal-modal-kapat]'},
            {n:5,baslik:'Kaydet',aciklama:'Etkinliği kaydeder ve “Hatırlatıcı kaydedildi.” bildirimini gösterir.',sec:'[data-cal-modal] [type="submit"]'}
          ]
        },
        {
          id:'takvim-gorev-form',baslik:'Yeni görev formu',dosya:'takvim-gorev-form.webp',alt:'Yeni Görev formu: başlık, açıklama, son tarih, durum, Vazgeç ve Kaydet',
          cekim:{rota:['communication','calendar'],adimlar:[['tikla','[data-cal-add="gorev"]'],['bekle',600],['yaz','[data-cal-modal] [name="baslik"]','Dönem planlarını topla']]},
          isaretler:[
            {n:1,baslik:'Başlık',aciklama:'Zorunludur.',sec:'[data-cal-modal] label.ka-field:has([name="baslik"])'},
            {n:2,baslik:'Son Tarih ve Durum',aciklama:'Görevin bitmesi gereken tarihi seçin. Durum: Yapılacak, Devam Ediyor ya da Tamamlandı.',sec:'[data-cal-modal] .ka-grid'},
            {n:3,baslik:'Kaydet',aciklama:'Görevi kaydeder ve “Görev kaydedildi.” bildirimini gösterir.',sec:'[data-cal-modal] [type="submit"]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Takvimi açın',metin:'Menüden **İletişim & Haberler › Takvim** sayfasını açın. Ay seçiciyle istediğiniz aya geçin.',ekran:'takvim-ana',isaret:4},
        {baslik:'Günü seçin',metin:'Takvimde bir güne dokunun. Altta o günün etkinlik ve görevleri listelenir.',ekran:'takvim-ana',isaret:5},
        {baslik:'Etkinlik ekleyin',metin:'**+ Etkinlik**e dokunun, **Başlık**ı yazın, **Tarih** ve **Öncelik**i seçin ve **Kaydet**e dokunun.',ekran:'takvim-etkinlik-form',isaret:1},
        {baslik:'Görev ekleyin',metin:'**+ Görev**e dokunun, **Başlık**ı yazın, **Son Tarih** ve **Durum**u seçin ve **Kaydet**e dokunun.',ekran:'takvim-gorev-form',isaret:2},
        {baslik:'Kaydı güncelleyin',metin:'Seçili günün listesinde ilgili kaydın **Düzenle** düğmesine dokunun. Görev bittiğinde **Durum**u Tamamlandı yapın; kayıt Geciken İş sayısından düşer.',ekran:'takvim-gun',isaret:2},
        {baslik:'Yaklaşan işlere bakın',metin:'Sayfanın altındaki **Yaklaşan 30 Gün** bölümü önümüzdeki 30 günün tamamlanmamış kayıtlarını sıralar.',ekran:'takvim-gun',isaret:3}
      ],
      kayit:'**Kaydet**e dokunduğunuzda düğme kısa süre “Kaydediliyor…” yazar; ardından “Hatırlatıcı kaydedildi.” ya da “Görev kaydedildi.” bildirimi çıkar ve form kapanır. Başlık boşsa “Başlık zorunlu” uyarısı görünür. Yetkiniz yoksa “Bu işlem için yetkiniz yok.”, başkasına ait bir kaydı değiştirmeye çalışırsanız “Bu kayıt size ait değil.” bildirimi gösterilir.',
      uyarilar:[
        'Takvim kayıtları kişiseldir: yönetici dışında kimse başkasının etkinlik ve görevlerini görmez.',
        'Bir görev, **Son Tarih**i olan gün takvimde işaretlenir. Son Tarih boş bırakılırsa görev takvimde bir güne yerleşmez ve Yaklaşan 30 Gün listesinde görünmez.',
        'Etkinlik formunun başlığı “Yeni Hatırlatıcı”dır; **+ Etkinlik** düğmesi bu formu açar.'
      ],
      sorunlar:[
        {s:'+ Etkinlik ve + Görev düğmeleri görünmüyor.',c:'Hesabınızda takvim düzenleme yetkisi tanımlı değildir; takvimi yalnızca görüntüleyebilirsiniz. Uygulama yöneticisine başvurun.'},
        {s:'Eklediğim kayıt takvimde görünmüyor.',c:'Doğru aya ve güne baktığınızdan emin olun. Görevlerde **Son Tarih**, etkinliklerde **Tarih** alanı boşsa kayıt takvim hücrelerinde işaretlenmez.'},
        {s:'Arkadaşımın kaydını göremiyorum.',c:'Kayıtlar kişiseldir; yalnızca yönetici hesabı tüm kayıtları görür.'}
      ],
      iliskili:['notlar','duyurular']
    },
    {
      id:'notlar',kategori:'iletisim',ikon:'📒',baslik:'Notlar',
      ozet:'Metin, yapılacaklar listesi, çizim, görsel ve tablo notlarınızı tek yerde tutun.',
      anahtar:'notlar hızlı not metin yapılacaklar çizim görsel tablo etiket renk not defteri kişisel',
      ne:'Kişisel not defterinizdir. **Metin**, **Yapılacaklar**, **Çizim**, **Görsel** ve **Tablo** olmak üzere beş türde not oluşturabilirsiniz. Üstteki sayaçlar toplam notu, bekleyen yapılacak maddelerini ve bu ay eklenen notları gösterir. Notlarınızı yalnızca siz görürsünüz; yönetici hesabı diğer kullanıcıların notlarını ayrı bir bölümde görür.',
      yol:['İletişim & Haberler','Notlar'],
      yolNot:'Alt çubuktaki **Hızlı Not** düğmesi de aynı notlara açılır: yeni not türünü seçersiniz ya da **Notlarımı Görüntüle**ye dokunursunuz. + Yeni Not, Düzenle ve Sil düğmeleri not düzenleme yetkisi olan hesaplarda görünür.',
      rota:['communication','notes'],
      eslesme:['communication:notes'],
      ekranlar:[
        {
          id:'notlar-liste',baslik:'Notlarım sayfası',dosya:'notlar-liste.webp',alt:'Notlarım sayfası: arama kutusu, Yeni Not düğmesi, not sayaçları ve not kartları',baglam:'.ka-notes-workspace',
          cekim:{rota:['communication','notes'],adimlar:[['kaydir',45]]},
          isaretler:[
            {n:1,baslik:'Ara',aciklama:'Notları başlık, içerik ya da etikete göre arar.',sec:'.ka-communication-search'},
            {n:2,baslik:'+ Yeni Not',aciklama:'Hızlı Not penceresini açar; not türünü orada seçersiniz.',sec:'[data-note-add]'},
            {n:3,baslik:'Sayaçlar',aciklama:'Toplam not, bekleyen yapılacak maddeleri ve bu ay eklenen notlar.',sec:'.ka-notes-summary'},
            {n:4,baslik:'Not kartı',aciklama:'Notun türü, başlığı, tarihi ve kısa önizlemesi görünür. Karta dokunmak notu tam olarak açar.',sec:'.ka-note-card__head'},
            {n:5,baslik:'Düzenle ve Sil',aciklama:'Notu düzenleme formunda açar ya da onayınızla siler.',sec:'.ka-note-card__actions'}
          ]
        },
        {
          id:'notlar-hizli',baslik:'Hızlı Not penceresi',dosya:'notlar-hizli.webp',alt:'Hızlı Not penceresi: Metin Notu, Yapılacaklar, Çizim, Görsel Not, Tablo Notu ve Notlarımı Görüntüle',
          cekim:{rota:['communication','notes'],adimlar:[['tikla','[data-note-add]'],['bekle',700]]},
          isaretler:[
            {n:1,baslik:'Not türleri',aciklama:'Metin Notu (başlık ve metin), Yapılacaklar (kontrol edilebilir görev listesi), Çizim (el yazısı ve serbest çizim), Görsel Not (fotoğraf ve açıklama), Tablo Notu (satır ve sütunlarla kayıt).',sec:'.ka-quick-note-grid'},
            {n:2,baslik:'Notlarımı Görüntüle',aciklama:'Pencereyi kapatıp tüm notlarınızın listesine gider.',sec:'.ka-quick-note-all'},
            {n:3,baslik:'Kapat',aciklama:'Notu kaydetmeden pencereyi kapatır.',sec:'#kaQuickNoteModal [data-note-close]'}
          ]
        },
        {
          id:'notlar-yapilacak',baslik:'Yapılacaklar notu',dosya:'notlar-yapilacak.webp',alt:'Yapılacaklar notu formu: başlık, görev satırı, Görev ekle, İptal ve Kaydet',
          cekim:{rota:['communication','notes'],adimlar:[['tikla','[data-note-add]'],['bekle',700],['tikla','[data-quick-kind="check"]'],['bekle',700],['yaz','[data-note-title]','Haftalık işler'],['yaz','[data-check-text]','Yazılı sınav kâğıtlarını çoğalt']]},
          isaretler:[
            {n:1,baslik:'Başlık',aciklama:'Notun başlığıdır.',sec:'label.ka-field:has([data-note-title])'},
            {n:2,baslik:'Görev satırı',aciklama:'Görevi yazın. Soldaki kutu görev bittiğinde işaretlenir; sağdaki × satırı siler.',sec:'[data-check-text]'},
            {n:3,baslik:'+ Görev ekle',aciklama:'Listeye yeni bir görev satırı ekler.',sec:'[data-check-add]'},
            {n:4,baslik:'İptal',aciklama:'Notu kaydetmeden kapatır.',sec:'[data-note-cancel]'},
            {n:5,baslik:'Kaydet',aciklama:'Notu kaydeder ve “Not kaydedildi.” bildirimini gösterir.',sec:'[data-note-save]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Notlar sayfasını açın',metin:'Menüden **İletişim & Haberler › Notlar** sayfasını açın ya da alt çubuktaki **Hızlı Not**tan **Notlarımı Görüntüle**ye dokunun.',ekran:'notlar-liste',isaret:3},
        {baslik:'Yeni not başlatın',metin:'**+ Yeni Not**a dokunun. Açılan **Hızlı Not** penceresinde not türünü seçin.',ekran:'notlar-hizli',isaret:1},
        {baslik:'Notu yazın',metin:'Örneğin **Yapılacaklar** için başlığı ve görevleri yazın; **+ Görev ekle** ile satır çoğaltın.',ekran:'notlar-yapilacak',isaret:2},
        {baslik:'Kaydedin',metin:'**Kaydet**e dokunun. “Not kaydedildi.” bildirimi çıkar ve not listede görünür.',ekran:'notlar-yapilacak',isaret:5},
        {baslik:'Notu açın, düzenleyin ya da silin',metin:'Not kartına dokunarak tam görünümü açın. **Düzenle** ile başlık, renk, etiket ve tarihi değiştirebilir, **Sil** ile notu kaldırabilirsiniz.',ekran:'notlar-liste',isaret:5}
      ],
      kayit:'Hızlı Not penceresinde **Kaydet**e dokunduğunuzda “Not kaydedildi.” bildirimi çıkar (görsel ve tablo notları için “Görsel not kaydedildi.”, “Tablo notu kaydedildi.”). Kaydedilemezse ilgili “… kaydedilemedi.” bildirimi gösterilir. Not listesindeki **Düzenle** formunda **Kaydet**e dokunursanız yine “Not kaydedildi.” bildirimi çıkar. Başlıksız ve içeriksiz bir metin notu kaydedilmez: “Başlık veya içerik girilmelidir.” uyarısı görünür.',
      uyarilar:[
        '**Sil**e dokunduğunuzda “… silinsin mi?” onayı sorulur. Silinen notu bu ekrandan geri getiremezsiniz.',
        'Notlar kişiseldir. Yalnızca yönetici hesabı diğer kullanıcıların notlarını “Diğer Kullanıcıların Notları” bölümünde görür.',
        'Görsel notlarda büyük fotoğraflar cihazın belleğini kullanır; mümkünse kısa ve küçük görseller ekleyin.'
      ],
      sorunlar:[
        {s:'+ Yeni Not ya da Düzenle düğmeleri görünmüyor.',c:'Hesabınızda not düzenleme yetkisi tanımlı değildir. Uygulama yöneticisine başvurun.'},
        {s:'“Bu not size ait değil.” uyarısı çıktı.',c:'Bir notu yalnızca onu ekleyen kullanıcı düzenleyebilir.'},
        {s:'Notum listede görünmüyor.',c:'Arama kutusunda bir ifade kalmış olabilir; kutuyu temizleyin.'}
      ],
      iliskili:['takvim','giris-gezinme']
    },
    {
      id:'evrak-takibi',kategori:'belgeler',ikon:'🗂️',baslik:'Evrak Takibi',
      ozet:'Gelen ve giden evrakları kaydedin, sorumlu öğretmen atayın ve işlem durumunu izleyin.',
      anahtar:'evrak takibi gelen giden iç yazışma tutanak durum beklemede işlemde tamamlandı arşivlendi sorumlu öğretmen dosya linki',
      ne:'Resmî evrakları ve yazışmaları kaydeder; her evrak için **tür, tarih, durum ve sorumlu öğretmen(ler)** tutar. Evrakları duruma göre süzüp arayabilirsiniz.',
      yol:['Döküman & Evraklar','Evrak Takibi'],
      yolNot:'Evrak ekleme ve düzenleme düğmeleri yalnızca evrak düzenleme yetkisi olanlarda görünür. Görüntüleme yetkiniz yoksa sayfada bu bilgi verilir.',
      rota:['documents','evrak'],
      eslesme:['documents:evrak'],
      ekranlar:[
        {
          id:'evrak-liste',baslik:'Evrak listesi',dosya:'evrak-liste.webp',alt:'Evrak Takibi sayfası: Evrak Ekle düğmesi, arama, durum filtreleri ve evrak kartları',baglam:'[data-evrak-page]',
          cekim:{rota:['documents','evrak']},
          isaretler:[
            {n:1,baslik:'Evrak Ekle',aciklama:'Yeni evrak formunu açar (yetki gerekir).',sec:'[data-evrak-new]'},
            {n:2,baslik:'Ara',aciklama:'Evrak adı, tür veya açıklamaya göre arar.',sec:'[data-evrak-search]'},
            {n:3,baslik:'Durum filtreleri',aciklama:'Tümü, Beklemede, İşlemde, Tamamlandı ve Arşivlendi durumlarına göre listeyi süzer.',sec:'.ka-evrak-filter-row'},
            {n:4,baslik:'Evrak kartı',aciklama:'Evrakın adı, türü, tarihi, sorumlu öğretmenleri ve durumu görünür.',sec:'.ka-list-card'},
            {n:5,baslik:'Düzenle',aciklama:'Evrakı düzenleme formunda açar (yetki gerekir).',sec:'.ka-list-card [data-evrak-edit]'}
          ]
        },
        {
          id:'evrak-form',baslik:'Evrak formu',dosya:'evrak-form.webp',alt:'Evrak Ekle formu: evrak adı, tür, tarih, durum ve sorumlu öğretmen alanları',
          cekim:{rota:['documents','evrak'],adimlar:[['tikla','[data-evrak-new]'],['bekle',600]]},
          isaretler:[
            {n:1,baslik:'Evrak adı',aciklama:'Zorunludur. Boş bırakırsanız form kaydedilmez.',sec:'.ka-modal label.ka-field:has-text("Evrak Adı")'},
            {n:2,baslik:'Tür ve tarih',aciklama:'Tür: Gelen Evrak, Giden Evrak, İç Yazışma, Tutanak ya da Diğer. Tarih varsayılan olarak bugündür.',sec:'.ka-modal label.ka-field:has-text("Tür"), .ka-modal label.ka-field:has-text("Tarih")'},
            {n:3,baslik:'Durum',aciklama:'Beklemede, İşlemde, Tamamlandı veya Arşivlendi.',sec:'.ka-modal label.ka-field:has-text("Durum")'},
            {n:4,baslik:'Sorumlu öğretmen(ler)',aciklama:'Listeden bir ya da birden fazla öğretmen seçebilirsiniz.',sec:'.ka-modal label.ka-field:has-text("Sorumlu")'}
          ]
        },
        {
          id:'evrak-form-alt',baslik:'Formun alt bölümü ve Kaydet',dosya:'evrak-form-alt.webp',alt:'Evrak Ekle formunun alt bölümü: dosya linki, açıklama, Vazgeç ve Kaydet düğmeleri',
          cekim:{rota:['documents','evrak'],adimlar:[['tikla','[data-evrak-new]'],['bekle',600],['kaydir','son'],['bekle',400]]},
          isaretler:[
            {n:1,baslik:'Dosya linki',aciklama:'İsteğe bağlıdır. Evrakın bulunduğu internet adresi (https://…) yazılabilir.',sec:'.ka-modal label.ka-field:has-text("Dosya Linki")'},
            {n:2,baslik:'Açıklama',aciklama:'Evrakla ilgili not yazabileceğiniz serbest alandır.',sec:'.ka-modal label.ka-field:has-text("Açıklama")'},
            {n:3,baslik:'Vazgeç',aciklama:'Formu kaydetmeden kapatır.',sec:'.ka-modal__footer .ka-btn--secondary'},
            {n:4,baslik:'Kaydet',aciklama:'Evrakı kaydeder ve “Evrak kaydedildi.” bildirimini gösterir.',sec:'.ka-modal__footer button[type="submit"]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Evrak Takibi sayfasını açın',metin:'Menüden **Döküman & Evraklar › Evrak Takibi** sayfasını açın.',ekran:'evrak-liste',isaret:4},
        {baslik:'Evrakı bulun',metin:'Arama kutusuna evrak adı ya da tür yazın; **durum** düğmeleriyle listeyi süzün.',ekran:'evrak-liste',isaret:3},
        {baslik:'Yeni evrak ekleyin',metin:'**Evrak Ekle**ye dokunun, **Evrak Adı**nı yazın, **Tür**, **Tarih** ve **Durum**u seçin.',ekran:'evrak-form',isaret:1},
        {baslik:'Sorumlu atayın',metin:'**Sorumlu Öğretmen(ler)** listesinden bir ya da daha fazla öğretmen seçin. İsterseniz dosya bağlantısını ve açıklamayı ekleyin.',ekran:'evrak-form',isaret:4},
        {baslik:'Kaydedin',metin:'**Kaydet**e dokunun. “Evrak kaydedildi.” bildirimi çıkar.',ekran:'evrak-form-alt',isaret:4},
        {baslik:'Durumu güncelleyin',metin:'Evrak kartındaki **Düzenle**ye dokunup **Durum**u değiştirin (ör. Tamamlandı) ve kaydedin.',ekran:'evrak-liste',isaret:5}
      ],
      kayit:'**Kaydet**e dokunduğunuzda “Evrak kaydedildi.” bildirimi çıkar. Yetkiniz yoksa “Bu işlem için yetkiniz yok.”, başka bir nedenle başarısız olursa “Evrak kaydedilemedi.” bildirimi görünür. Mevcut evrakı düzenlerken **Sil** düğmesi çıkar; onaylarsanız “Evrak silindi.” bildirimi gösterilir.',
      uyarilar:[
        'Evrak silmeden önce “Bu evrak kaydı silinsin mi?” onayı sorulur. Silinen kaydı bu ekrandan geri getiremezsiniz; yerine **Arşivlendi** durumunu kullanmayı düşünün.',
        '**Dosya Linki** alanına yalnızca güvendiğiniz bir internet adresi (https://…) yazın; karttaki **Dosyayı Aç** bağlantısı bu adresi yeni sekmede açar.'
      ],
      sorunlar:[
        {s:'“Evrak Takibi için görüntüleme yetkiniz yok” yazıyor.',c:'Hesabınızın bu sayfayı görme yetkisi yoktur. Uygulama yöneticisine başvurun.'},
        {s:'Evrak Ekle düğmesi görünmüyor.',c:'Evrak düzenleme yetkisi hesabınızda tanımlı değildir; evrakları görüntüleyebilirsiniz.'},
        {s:'Aradığım evrak listede yok.',c:'Seçili bir durum filtresi olabilir. **Tümü** düğmesine dokunup aramayı temizleyin.'}
      ],
      iliskili:['ogretmenler','okul-raporlari']
    },
    {
      id:'kurul-komisyonlar',kategori:'belgeler',ikon:'🏛️',baslik:'Kurul ve Komisyonlar',
      ozet:'Okul kurul ve komisyonlarını, üyelerini, görevlerini, notlarını ve belgelerini tek kayıtta yönetin; rapor alın.',
      anahtar:'kurul komisyon başkan asil yedek üye görev sorumluluk belge türü ekli belge mevzuat dayanak not iş rapor katalog öğretmenler kurulu satın alma',
      ne:'Her kurul ya da komisyon için bir kayıt tutulur: **tür** (Kurul, Komisyon, Ekip, Diğer), **eğitim öğretim yılı**, **başkan**, **asil ve yedek üyeler** (öğretmen ve öğrenci), **görev ve sorumluluklar**, **belge türleri**, yüklenen **ekli belgeler**, **mevzuat / dayanak notları**, **notlar** ve takip edilecek **işler**. Kayıt ekranından o kurul ya da komisyonun A4 raporu alınabilir; ayrıca tüm kayıtlar için liste ve görev dağılımı raporları hazırlanır.',
      yol:['Doküman & Evraklar','Kurul ve Komisyonlar'],
      yolNot:'Bu sayfa öğretmen hesaplarında gösterilmez. **+ Yeni Kurul / Komisyon**, **Raporlar**, **Düzenle**, silme ve ekleme düğmeleri yalnızca düzenleme yetkisi olan hesaplarda görünür.',
      rota:['committees','home'],
      eslesme:['committees:home'],
      ekranlar:[
        {
          id:'kurul-liste',baslik:'Kurul ve Komisyonlar listesi',dosya:'kurul-liste.webp',alt:'Kurul ve Komisyonlar sayfası: Raporlar ve Yeni Kurul / Komisyon düğmeleri, arama, yıl süzgeci ve kayıt listesi',baglam:'.ka-committees-page',
          cekim:{rota:['committees','home']},
          isaretler:[
            {n:1,baslik:'Raporlar',aciklama:'Tüm kayıtların listesi ile öğretmen ve öğrenci görev dağılımı raporlarını açar.',sec:'[data-reports]'},
            {n:2,baslik:'+ Yeni Kurul / Komisyon',aciklama:'Yeni kayıt formunu açar.',sec:'[data-add]'},
            {n:3,baslik:'Ara ve yıla göre süz',aciklama:'Kurul ya da komisyon adına göre arayın; Tüm yıllar listesiyle eğitim öğretim yılına göre süzün.',sec:'[data-q], [data-year]'},
            {n:4,baslik:'Kayıt satırı',aciklama:'Ad, tür, yıl ve başkan ile üye sayısı görünür. Satıra dokunmak kaydın ayrıntısını açar.',sec:'.ka-committee-list-row'}
          ]
        },
        {
          id:'kurul-form',baslik:'Yeni kurul / komisyon formu',dosya:'kurul-form.webp',alt:'Yeni Kurul / Komisyon formu: katalog kategorisi, hazır kurul, ad, tür, yıl ve başkan',
          cekim:{rota:['committees','home'],adimlar:[['tikla','[data-add]'],['bekle',700],['yaz','#cf [name="ad"]','Satın Alma Komisyonu']]},
          isaretler:[
            {n:1,baslik:'Katalog',aciklama:'İsteğe bağlı. Kategoriyi ve ardından hazır kurul / komisyonu seçerseniz ad, kategori ve tür kendiliğinden dolar. Seçmek kayıt oluşturmaz.',sec:'#cf label.ka-field:has([data-catalog-category]), #cf label.ka-field:has([data-catalog-name])'},
            {n:2,baslik:'Kurul / komisyon adı',aciklama:'Zorunludur. Katalogdan seçebilir ya da özel bir ad yazabilirsiniz.',sec:'#cf label.ka-field:has([name="ad"])'},
            {n:3,baslik:'Tür ve yıl',aciklama:'Tür: Kurul, Komisyon, Ekip ya da Diğer. Eğitim öğretim yılı varsayılan olarak içinde bulunulan yılı gösterir.',sec:'#cf label.ka-field:has([name="tur"]), #cf label.ka-field:has([name="yil"])'},
            {n:4,baslik:'Başkan',aciklama:'Öğretmen listesinden başkanı seçin.',sec:'#cf label.ka-field:has([name="baskan"])'}
          ]
        },
        {
          id:'kurul-form-uyeler',baslik:'Asil ve yedek üyeler',dosya:'kurul-form-uyeler.webp',alt:'Kurul formunun üyeler bölümü: öğretmen ve öğrenci seçimi, + Öğretmen ve + Öğrenci düğmeleri',
          cekim:{rota:['committees','home'],adimlar:[['tikla','[data-add]'],['bekle',700],['js','document.querySelector("#cf .ka-committee-form-group").scrollIntoView({block:"start"})'],['bekle',300]]},
          isaretler:[
            {n:1,baslik:'Öğretmen seç',aciklama:'Listeden öğretmeni seçip + Öğretmen düğmesine dokunun; üye aşağıdaki listeye eklenir.',sec:'[data-s="asil-ogretmen"]'},
            {n:2,baslik:'+ Öğretmen',aciklama:'Seçilen öğretmeni asil üye olarak ekler. Aynı kişi ikinci kez eklenemez (“Bu kişi zaten kullanılıyor.”).',sec:'[data-a="asil-ogretmen"]'},
            {n:3,baslik:'Öğrenci seç',aciklama:'Aynı şekilde öğrenci üye eklenir; listede öğrencinin sınıfı da yazar.',sec:'[data-s="asil-ogrenci"]'},
            {n:4,baslik:'+ Öğrenci',aciklama:'Seçilen öğrenciyi asil üye olarak ekler. Yedek üyeler için aynı düğmeler Yedek Üyeler bölümünde bulunur.',sec:'[data-a="asil-ogrenci"]'}
          ]
        },
        {
          id:'kurul-form-gorev',baslik:'Görevler, belge türleri ve dayanak',dosya:'kurul-form-gorev.webp',alt:'Kurul formunun alt bölümü: görev ve sorumluluklar, belge türleri, mevzuat notu ve Kaydet',
          cekim:{rota:['committees','home'],adimlar:[['tikla','[data-add]'],['bekle',700],['js','document.querySelector("#cf [data-task-template]").scrollIntoView({block:"start"})'],['bekle',300]]},
          isaretler:[
            {n:1,baslik:'Şablon görevleri ekle',aciklama:'Seçili kategoriye uygun örnek görevleri listeye ekler; kaydetmeden önce gözden geçirin.',sec:'[data-task-template]'},
            {n:2,baslik:'+ Ekle',aciklama:'Boş bir görev satırı ekler. Satırın yanındaki × satırı siler.',sec:'[data-ft]'},
            {n:3,baslik:'Belge türleri',aciklama:'Kurulun tutacağı belgelerin kontrol listesidir; dosya yükleme işlemi değildir.',sec:'.ka-committee-doc-options'}
          ]
        },
        {
          id:'kurul-detay',baslik:'Kayıt ayrıntısı',dosya:'kurul-detay.webp',alt:'Kurul kaydının ayrıntı sayfası: geri, Düzenle, Rapor, Sil düğmeleri ve Başkan bölümü',baglam:'.ka-committee-detail',
          cekim:{rota:['committees','home'],adimlar:[['tikla','[data-open="kk1"]'],['bekle',600]]},
          isaretler:[
            {n:1,baslik:'Geri',aciklama:'Listeye döner.',sec:'.ka-committee-detail [data-back]'},
            {n:2,baslik:'Düzenle',aciklama:'Kaydı düzenleme formunda açar (yetki gerekir).',sec:'.ka-committee-detail [data-edit]'},
            {n:3,baslik:'Rapor',aciklama:'Kurulun A4 raporunu hazırlar: üyeler, görevler, belge türleri ve ekli belgeler yer alır.',sec:'.ka-committee-detail [data-print]'},
            {n:4,baslik:'Sil',aciklama:'Kaydı onayınızla siler.',sec:'.ka-committee-detail [data-del]'},
            {n:5,baslik:'Bölümler',aciklama:'Başkan, Asil Üyeler, Yedek Üyeler, Görev ve Sorumluluklar, Belge Türleri, Ekli Belgeler, Mevzuat / Dayanak Notları, Notlar ve İşler bölümleri alt alta gelir.',sec:'.ka-committee-section'}
          ]
        },
        {
          id:'kurul-detay-alt',baslik:'Belge türleri ve ekli belgeler',dosya:'kurul-detay-alt.webp',alt:'Kurul ayrıntı sayfasında belge türleri ve ekli belgeler bölümleri',
          cekim:{rota:['committees','home'],adimlar:[['tikla','[data-open="kk1"]'],['bekle',600],['js','document.querySelector("[data-add-attachment]").scrollIntoView({block:"center"})'],['bekle',300]]},
          isaretler:[
            {n:1,baslik:'Belge Türleri',aciklama:'Formda işaretlenen belge türleri burada rozet olarak listelenir; kurulun tutması gereken belgelerin kontrol listesidir.',sec:'.ka-committee-section:has(.ka-chip-list)'},
            {n:2,baslik:'+ Belge Ekle',aciklama:'Bir dosya (PDF, Word, Excel ya da görsel) yükleyip kurul kaydına bağlar. Dosya Dökümanlar servisiyle yüklenir ve kişiseldir.',sec:'[data-add-attachment]'}
          ]
        },
        {
          id:'kurul-detay-is',baslik:'Notlar ve işler',dosya:'kurul-detay-is.webp',alt:'Kurul ayrıntı sayfasında notlar ve işler bölümleri',
          cekim:{rota:['committees','home'],adimlar:[['tikla','[data-open="kk1"]'],['bekle',600],['js','document.querySelector("[data-work]").scrollIntoView({block:"center"})'],['bekle',300]]},
          isaretler:[
            {n:1,baslik:'+ Not',aciklama:'Başlıklı kısa bir not ekler; not tarihle birlikte saklanır, en yeni not üstte görünür.',sec:'[data-add-note]'},
            {n:2,baslik:'İş kutusu',aciklama:'İşi tamamlandı olarak işaretler ya da işareti kaldırır (düzenleme yetkisi gerekir). İşin sorumlusu ve son tarihi başlığın altında görünür.',sec:'[data-work]'}
          ]
        },
        {
          id:'kurul-rapor',baslik:'Raporlar penceresi',dosya:'kurul-rapor.webp',alt:'Kurul ve Komisyon Raporları penceresi: liste, öğretmen görev dağılımı ve öğrenci görev dağılımı',
          cekim:{rota:['committees','home'],adimlar:[['tikla','[data-reports]'],['bekle',600]]},
          isaretler:[
            {n:1,baslik:'Kurul / Komisyon Listesi',aciklama:'Tüm kayıtları tek raporda listeler.',sec:'[data-r="list"]'},
            {n:2,baslik:'Öğretmen Görev Dağılımı',aciklama:'Her öğretmenin kaç kurulda başkan, asil ve yedek üye olduğunu gösterir.',sec:'[data-r="teachers"]'},
            {n:3,baslik:'Öğrenci Görev Dağılımı',aciklama:'Öğrencilerin asil ve yedek üyelik sayılarını gösterir.',sec:'[data-r="students"]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Sayfayı açın',metin:'**Doküman & Evraklar** menüsünden **Kurul ve Komisyonlar**ı açın. Gerekirse adla arayın ya da yıla göre süzün.',ekran:'kurul-liste',isaret:3},
        {baslik:'Yeni kayıt başlatın',metin:'**+ Yeni Kurul / Komisyon**a dokunun. İsterseniz **Katalog**dan hazır bir kurul seçin; **Kurul / komisyon adı**nı, **Tür**ü, yılı ve **Başkan**ı belirleyin.',ekran:'kurul-form',isaret:2},
        {baslik:'Üyeleri ekleyin',metin:'**Asil Üyeler** ve **Yedek Üyeler** bölümlerinde öğretmen ya da öğrenciyi seçip **+ Öğretmen** / **+ Öğrenci**ye dokunun.',ekran:'kurul-form-uyeler',isaret:2},
        {baslik:'Görev, belge türü ve dayanağı girin',metin:'Görev satırlarını yazın ya da **Şablon görevleri ekle**yi kullanın; kurulun tutacağı **Belge Türleri**ni işaretleyin; varsa mevzuat dayanağını yazın. Sonunda **Kaydet**e dokunun.',ekran:'kurul-form-gorev',isaret:1},
        {baslik:'Ayrıntıyı açın',metin:'Listeden kayda dokunun. Üyeleri, görevleri ve belgeleri ayrıntı sayfasında görürsünüz.',ekran:'kurul-detay',isaret:5},
        {baslik:'Belge yükleyin',metin:'Ayrıntı sayfasında **+ Belge Ekle**ye dokunun, belge başlığını ve türünü yazın, dosyayı seçip yükleyin.',ekran:'kurul-detay-alt',isaret:2},
        {baslik:'Not alın ve işleri izleyin',metin:'**+ Not** ile not ekleyin; işlerin kutusunu işaretleyerek tamamlananları belirtin.',ekran:'kurul-detay-is',isaret:2},
        {baslik:'Rapor alın',metin:'Ayrıntı sayfasındaki **Rapor**a dokunarak o kurulun çıktısını hazırlayın; tüm kayıtlar için liste ekranındaki **Raporlar**ı kullanın.',ekran:'kurul-rapor',isaret:1}
      ],
      kayit:'Formda **Kaydet**e dokunduğunuzda “Kaydedildi.” bildirimi çıkar, form kapanır ve kaydın ayrıntı sayfası açılır. Kayıt cihaza işlenir ve internet olduğunda diğer cihazlarla eşitlenir. Belge yüklemesi başarılı olursa “Belge yüklendi ve kurul kaydına bağlandı.” bildirimi çıkar; yüklenemezse “Belge yüklenemedi.” bildirimi gösterilir. Yetkiniz yoksa “Bu işlem için yetkiniz yok.” bildirimi çıkar.',
      uyarilar:[
        '**Belge Türleri** işaretleri yalnızca bir kontrol listesidir; dosya yüklemek için ayrıntı sayfasındaki **+ Belge Ekle** kullanılır.',
        '**Mevzuat / Dayanak Notları** alanına yazılanlar otomatik hukuk doğrulaması değildir; güncel mevzuat okul yönetimince ayrıca doğrulanmalıdır.',
        'Aynı kişi aynı kurulda hem asil hem yedek üye olarak, ya da başkan ile üye olarak yer alamaz.',
        'Görev ve sorumluluk satırlarını **Düzenle** formundan değiştirin.',
        'Kaydı silmek ayrıntı sayfasındaki tüm üye, not ve iş bilgilerini de siler; işlem onay sorar.'
      ],
      sorunlar:[
        {s:'Kurul ve Komisyonlar menüde görünmüyor.',c:'Sayfa öğretmen hesaplarında gösterilmez; yönetici ya da yetkili hesaplarla açılır.'},
        {s:'+ Yeni Kurul / Komisyon ve Düzenle düğmeleri yok.',c:'Hesabınızın kurul ve komisyon düzenleme yetkisi yoktur; kayıtları yalnızca görüntüleyebilirsiniz.'},
        {s:'Üye listesinde bir öğretmen ya da öğrenci görünmüyor.',c:'Zaten asil ya da yedek üye olarak eklenmiş kişi listeden çıkar; başkan olarak seçilen öğretmen üye olarak eklenemez.'},
        {s:'“Belge yükleme servisi hazır değil.” uyarısı çıktı.',c:'Uygulamayı yeniden açıp tekrar deneyin; sürerse uygulama yöneticisine bildirin.'}
      ],
      iliskili:['ogretmenler','evrak-takibi','okul-raporlari']
    },
    {
      id:'okul-raporlari',kategori:'belgeler',ikon:'📊',baslik:'Okul Raporları',
      ozet:'Hazır raporları önizleyin, düzenleyin; yazdırın, PDF / görsel olarak indirin ya da paylaşın.',
      anahtar:'rapor önizle yazdır pdf görsel png paylaş word excel indir ders giriş çıkış saatleri öğrenci sayıları a4 yatay dikey',
      ne:'Okul genelindeki hazır raporları (ör. ders giriş-çıkış saatleri, öğrenci sayıları) tek yerde toplar. Her rapor için **Düzenle**, **Önizle** ve **Yazdır** seçenekleri vardır; önizlemeden PDF, Word, Excel ve görsel (PNG) olarak indirilebilir ya da paylaşılabilir.',
      yol:['Döküman & Evraklar','Okul Raporları'],
      yolNot:'Bazı sayfalarda (ör. nöbet çizelgesi, öğretmen ve öğrenci profilleri) rapor düğmeleri kendi sayfalarındadır; hepsi aynı önizleme penceresini kullanır.',
      rota:['reports','home'],
      eslesme:['reports:home','reports:*'],
      ekranlar:[
        {
          id:'rapor-liste',baslik:'Rapor listesi',dosya:'rapor-liste.webp',alt:'Raporlar sayfası: her rapor için Düzenle, Önizle ve Yazdır düğmeleri',baglam:'[data-report-open]',
          cekim:{rota:['reports','home']},
          isaretler:[
            {n:1,baslik:'Rapor kartı',aciklama:'Raporun adı ve kısa açıklaması. Kartta kaç satır / sınıf bulunduğu da görünür.',sec:'.ka-card:has([data-report-open="lesson-times"])'},
            {n:2,baslik:'Düzenle',aciklama:'Raporun başlığını, sayfa yönünü ve görünecek öğeleri ayarlar.',sec:'[data-report-design="lesson-times"]'},
            {n:3,baslik:'Önizle',aciklama:'Raporu ekranda önizleme penceresinde açar.',sec:'[data-report-open="lesson-times"]'},
            {n:4,baslik:'Yazdır',aciklama:'Raporu doğrudan yazdırma ya da PDF kaydetme akışına gönderir.',sec:'[data-report-print="lesson-times"]'}
          ]
        },
        {
          id:'rapor-onizleme',baslik:'Rapor önizleme penceresi',dosya:'rapor-onizleme.webp',alt:'Rapor önizleme: Yazdır, Görsel, Paylaş, yakınlaştırma ve PDF, Word, Excel, PNG indirme düğmeleri',
          cekim:{rota:['reports','home'],adimlar:[['tikla','[data-report-open="all-students"]'],['bekle',1500]]},
          isaretler:[
            {n:1,baslik:'Kapat',aciklama:'Önizlemeyi kapatır ve rapor listesine döner.',sec:'[data-report-close]'},
            {n:2,baslik:'Yazdır',aciklama:'Yazdırma ya da PDF olarak kaydetme penceresini açar.',sec:'.dv3btn[data-report-print]'},
            {n:3,baslik:'Görsel',aciklama:'Raporu yüksek kaliteli bir PNG görseline dönüştürür. İşlem bitince “Yüksek kaliteli PNG hazırlandı.” bildirimi çıkar.',sec:'[data-report-image]'},
            {n:4,baslik:'Paylaş',aciklama:'Rapor görselini cihazın paylaşım menüsüyle gönderir. Paylaşım desteklenmeyen tarayıcıda görsel indirilir.',sec:'.dv3btn[data-report-share]'},
            {n:5,baslik:'Yakınlaştır / uzaklaştır',aciklama:'Önizlemenin boyutunu değiştirir; ortadaki yüzde mevcut ölçeği gösterir.',sec:'[data-report-minus], [data-report-plus]'},
            {n:6,baslik:'İndirme seçenekleri',aciklama:'Raporu PDF, Word, Excel ya da PNG dosyası olarak indirir; Paylaş ile gönderir.',sec:'[data-report-out="pdf"], [data-report-out="png"]'}
          ]
        },
        {
          id:'rapor-duzenle',baslik:'Rapor düzenleme',dosya:'rapor-duzenle.webp',alt:'Rapor ayarları: okul adı, rapor başlığı, alt başlık, başlık hizası, sayfa yönü ve yazı boyutu',
          cekim:{rota:['reports','home'],adimlar:[['tikla','[data-report-design="all-students"]'],['bekle',1000],['kaydir',130]]},
          isaretler:[
            {n:1,baslik:'Okul adı ve rapor başlığı',aciklama:'Raporun üstünde görünecek okul adı ve başlık.',sec:'.ka-field:has([data-rs="schoolName"]), .ka-field:has([data-rs="title"])'},
            {n:2,baslik:'Sayfa yönü',aciklama:'Raporu Dikey A4 ya da Yatay A4 olarak ayarlar.',sec:'.ka-field:has([data-rs="orientation"])'},
            {n:3,baslik:'Yazı boyutu',aciklama:'Rapor yazı boyutunu değiştirir.',sec:'.ka-field:has([data-rs="fontSize"])'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Raporlar sayfasını açın',metin:'Menüden **Döküman & Evraklar › Okul Raporları** sayfasını açın.',ekran:'rapor-liste',isaret:1},
        {baslik:'Raporu önizleyin',metin:'İlgili raporun kartında **Önizle**ye dokunun; rapor tam ekran bir pencerede açılır.',ekran:'rapor-liste',isaret:3},
        {baslik:'Yazdırın ya da PDF alın',metin:'Önizlemede **Yazdır**a dokunun ve açılan pencerede yazıcıyı ya da “PDF olarak kaydet” seçeneğini seçin.',ekran:'rapor-onizleme',isaret:2},
        {baslik:'Görsel olarak alın',metin:'**Görsel**e dokunun; rapor yüksek kaliteli PNG olarak hazırlanır.',ekran:'rapor-onizleme',isaret:3},
        {baslik:'Paylaşın',metin:'**Paylaş**a dokunup paylaşım menüsünden uygulamayı (ör. WhatsApp) seçin.',ekran:'rapor-onizleme',isaret:4},
        {baslik:'Dosya olarak indirin',metin:'Yakınlaştırma düğmelerinin altındaki **PDF İndir**, **Word İndir**, **Excel İndir** ya da **PNG İndir** düğmelerinden birini kullanın.',ekran:'rapor-onizleme',isaret:6},
        {baslik:'Raporu özelleştirin',metin:'Rapor kartındaki **Düzenle** ile başlığı, sayfa yönünü ve görünecek öğeleri değiştirin; **Kaydet**e dokunarak ayarları saklayın.',ekran:'rapor-duzenle',isaret:1}
      ],
      kayit:'Rapor düzenleme ekranında **Kaydet**e dokunduğunuzda “Rapor ayarları kaydedildi.” bildirimi çıkar; **Varsayılana Dön** ayarları ilk haline getirir. Önizleme, yazdırma, görsel ve paylaşma işlemleri verilerinizi değiştirmez; yalnızca rapor çıktısı üretir.',
      uyarilar:[
        'Raporlar kayıtlı öğrenci ve öğretmen bilgilerinden üretilir. Paylaşmadan önce raporda kişisel veri olup olmadığını kontrol edin.',
        'Android’de **Paylaş** ve indirme işlemleri cihazın kaydetme ya da paylaşım penceresini açar.',
        'Hata oluşursa ekranda “Görsel oluşturulamadı”, “Paylaşım başarısız” ya da “Yazdırma açılamadı” gibi bir bildirim çıkar.'
      ],
      sorunlar:[
        {s:'Görsel ya da Paylaş düğmesine dokunuyorum ama bir şey olmuyor gibi.',c:'İşlem sürerken düğmede “Oluşturuluyor…” ya da “Hazırlanıyor…” yazar; bitince bildirim çıkar. Birkaç saniye bekleyin. Hata olursa nedenini bildiren bir uyarı görürsünüz.'},
        {s:'Rapordaki bilgiler eksik ya da güncel değil.',c:'Raporlar kayıtlı verilerden üretilir. Önce ilgili kaydı (sınıf, öğrenci, ders saati) kendi sayfasında güncelleyin, sonra raporu yeniden önizleyin.'},
        {s:'Rapor taşıyor ya da çok küçük yazılıyor.',c:'**Düzenle** ekranında **Sayfa** yönünü Yatay A4 yapın ya da **Yazı Boyutu**nu değiştirin.'}
      ],
      iliskili:['nobet-programi','ogrenciler']
    },
    {
      id:'ayarlar-veriler',kategori:'ayarlar',ikon:'⚙️',baslik:'Ayarlar ve Veriler',
      ozet:'Hesap, akademik yapı ve sistem ayarlarına ulaşın; verilerinizin yedeğini alın.',
      anahtar:'ayarlar veriler yedek yedekleme json geri yükle depolama sınırları güncellemeleri kontrol et ders saatleri okul bilgileri kullanıcı roller görünüm tema',
      ne:'**Ayarlar** sayfası ayarları üç grupta toplar: **Hesap ve Güvenlik**, **Akademik Yapı** ve **Sistem Yönetimi**. **Veriler** sayfası depolama sınırlarını gösterir ve tüm uygulama verilerinin yedeğini almayı sağlar.',
      yol:['Ayarlar','Ayarlar'],
      yolNot:'Hangi ayarları göreceğiniz hesabınızın yetkisine göre değişir. **Veriler** için menüde **Ayarlar › Veriler** yolunu kullanın.',
      rota:['settings',''],
      eslesme:['settings:','settings:*'],
      ekranlar:[
        {
          id:'ayarlar-ana',baslik:'Ayarlar',dosya:'ayarlar-ana.webp',alt:'Ayarlar sayfası: Hesap ve Güvenlik, Akademik Yapı ve Sistem Yönetimi grupları',baglam:'[data-settings-accordion-toggle]',
          cekim:{rota:['settings',''],adimlar:[['tikla','[data-settings-accordion-toggle="academic"]'],['bekle',600]]},
          isaretler:[
            {n:1,baslik:'Ayar grupları',aciklama:'Bir gruba dokunmak içindeki ayarları açar. Gruptaki ayar sayısı yanında yazar.',sec:'[data-settings-accordion-toggle="account"]'},
            {n:2,baslik:'Açılan grup',aciklama:'Örneğin Akademik Yapı: okul bilgileri, ders saatleri, tatil modu, ders ve branş listeleri.',sec:'[data-settings-accordion="academic"]'}
          ]
        },
        {
          id:'veriler-sayfa',baslik:'Veriler',dosya:'veriler-sayfa.webp',alt:'Veriler sayfası: depolama sınırları ve öğretmen listesi şablonları',baglam:'[data-storage-export]',
          cekim:{rota:['settings','data']},
          isaretler:[
            {n:1,baslik:'Depolama sınırları',aciklama:'Dosya yüklenen alanlar (mesajlaşma dosyaları, duyuru galerisi, dokümanlar, akademik takvim) için kullanıcı başına MB sınırını gösterir. “Sınırları Düzenle” düğmesi yalnızca yönetici hesaplarında görünür.',sec:'.ka-card:has([data-storage-edit-limits])'},
          ]
        },
        {
          id:'veriler-yedek',baslik:'Veri yedekleme',dosya:'veriler-yedek.webp',alt:'Veriler sayfası: Yedeği İndir (JSON) ve Yedekten Geri Yükle düğmeleri',
          cekim:{rota:['settings','data'],adimlar:[['goster','[data-storage-export]']]},
          isaretler:[
            {n:1,baslik:'Yedeği İndir (JSON)',aciklama:'Uygulamadaki verilerin yedeğini “koruk-asistan-yedek-TARİH.json” dosyası olarak indirir.',sec:'[data-storage-export]'},
            {n:2,baslik:'Yedekten Geri Yükle',aciklama:'Yalnızca yönetici hesaplarında görünür. Seçtiğiniz yedek dosyasındaki kayıtları mevcut verilerin üzerine yazar.',sec:'[data-storage-import]'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Ayarlar’ı açın',metin:'Menüden **Ayarlar** grubunu, ardından **Ayarlar** sayfasını açın.',ekran:'ayarlar-ana',isaret:1},
        {baslik:'Grubu açın',metin:'**Hesap ve Güvenlik**, **Akademik Yapı** ya da **Sistem Yönetimi** grubuna dokunun ve ilgili ayarı seçin.',ekran:'ayarlar-ana',isaret:2},
        {baslik:'Güncellemeleri kontrol edin',metin:'**Hesap ve Güvenlik** grubundaki **Güncellemeleri Kontrol Et** ayarı mevcut sürümü gösterir; Android uygulamasında yeni sürümü buradan yükleyebilirsiniz.'},
        {baslik:'Veriler sayfasına gidin',metin:'Menüde **Ayarlar › Veriler** sayfasını açın.',ekran:'veriler-sayfa',isaret:1},
        {baslik:'Yedek alın',metin:'**Yedeği İndir (JSON)** düğmesine dokunun. “Yedek dosyası indirildi.” bildirimi çıkar ve dosya cihazınıza kaydedilir.',ekran:'veriler-yedek',isaret:1}
      ],
      kayit:'Yedek indirme verileri değiştirmez; yalnızca bir dosya oluşturur ve “Yedek dosyası indirildi.” bildirimi gösterir. Yedekten geri yükleme ise mevcut kayıtların üzerine yazar; bu yüzden önce “DİKKAT: Yedekten geri yükleme mevcut verilerin üzerine yazar. Devam edilsin mi?” onayı sorulur. Bitince “Geri yükleme tamamlandı: N kayıt işlendi” bildirimi çıkar.',
      uyarilar:[
        'Yedek dosyası öğrenci, öğretmen ve veli bilgileri gibi **kişisel veriler** içerir. Dosyayı güvenli bir yerde saklayın, başkalarıyla paylaşmayın.',
        '**Yedekten Geri Yükle** geri alınamayan sonuçlar doğurabilir: yedekteki kayıtlar mevcut kayıtların üzerine yazılır. Yalnızca ne yaptığınızdan eminseniz ve yönetici hesabıyla kullanın.',
        'Ayarlardaki değişiklikler (ör. ders saatleri, okul bilgileri, roller) tüm kullanıcıları etkileyebilir; değiştirmeden önce emin olun.'
      ],
      sorunlar:[
        {s:'Yedekten Geri Yükle düğmesi görünmüyor.',c:'Bu düğme yalnızca yönetici hesaplarında görünür. Yönetici dışındaki bir hesapla “Bu işlem için yönetici yetkisi gerekir.” uyarısı alırsınız.'},
        {s:'“Geçersiz yedek dosyası formatı” hatası alıyorum.',c:'Seçtiğiniz dosya bu uygulamanın indirdiği bir yedek dosyası (.json) değildir. “koruk-asistan-yedek-…json” dosyasını seçin.'},
        {s:'Bir ayarı Ayarlar listesinde göremiyorum.',c:'Ayarlar yetkinize göre listelenir. Gereken ayara erişiminiz yoksa uygulama yöneticisine başvurun.'}
      ],
      iliskili:['hakkinda','giris-gezinme']
    },
    {
      id:'hakkinda',kategori:'baslangic',ikon:'ℹ️',baslik:'Uygulama Hakkında',
      ozet:'Uygulamanın sürümünü, güncelleme notlarını ve web / Android indirme bağlantılarını görün.',
      anahtar:'hakkında sürüm güncelleme notları apk android web indir optik okuyucu güncelle yayın',
      ne:'Koruk Asistan’ın ne olduğunu, kurulu sürümü, yayınlanan son Android sürümünü ve güncelleme notlarını gösterir. Web uygulaması, Android uygulaması (APK) ve Optik Okuyucu’nun indirme bağlantıları da burada bulunur.',
      yol:['Ayarlar','Uygulama Hakkında'],
      yolNot:'Bu sayfa her kullanıcıya açıktır.',
      rota:['dashboard','about'],
      eslesme:['dashboard:about'],
      herkes:true,
      ekranlar:[
        {
          id:'hakkinda-ust',baslik:'Tanıtım ve sürüm',dosya:'hakkinda-ust.webp',alt:'Uygulama Hakkında sayfasının üst bölümü: uygulama adı, kılavuz düğmesi ve sürüm bilgisi',baglam:'[data-guide-about-page]',
          cekim:{rota:['dashboard','about']},
          isaretler:[
            {n:1,baslik:'Uygulama',aciklama:'Uygulamanın adı ve kimin için hazırlandığı.',sec:'.ka-guide-about-head'},
            {n:2,baslik:'Kullanım Kılavuzu',aciklama:'Kullanım Kılavuzu sayfasını açar.',sec:'[data-about-guide]'},
            {n:3,baslik:'Sürüm bilgisi',aciklama:'Bu cihazdaki sürüm ile GitHub’da yayınlanan son Android sürümü yan yana gösterilir. Web sürümünde sürüm numarası yalnızca Android uygulamasında gösterilir.',sec:'.ka-card:has([data-about-current])'},
            {n:4,baslik:'Güncellemeleri Kontrol Et',aciklama:'Android uygulamasında yeni sürüm olup olmadığını denetler. Web sürümünde bu denetim yapılmaz.',sec:'[data-about-check]'}
          ]
        },
        {
          id:'hakkinda-baglantilar',baslik:'Bağlantılar ve güncelleme notları',dosya:'hakkinda-baglantilar.webp',alt:'Uygulama Hakkında: web, Android ve Optik Okuyucu bağlantıları ile güncelleme notları',
          cekim:{rota:['dashboard','about'],adimlar:[['goster','.ka-guide-links']]},
          isaretler:[
            {n:1,baslik:'Web ve Android',aciklama:'Web uygulamasını tarayıcıda açar; Android uygulamasının (APK) son sürümünü indirir.',sec:'.ka-card:has(.ka-guide-links) >> nth=0'},
            {n:2,baslik:'Optik Okuyucu',aciklama:'Okul verilerini kullanan ayrı Optik Okuyucu uygulamasının APK dosyasını indirir. Dosya büyüktür; Wi‑Fi önerilir.',sec:'.ka-card:has(a[href*="optik-okuyucu"])'}
          ]
        }
      ],
      adimlar:[
        {baslik:'Sayfayı açın',metin:'Menüden **Ayarlar › Uygulama Hakkında** sayfasını açın.',ekran:'hakkinda-ust',isaret:1},
        {baslik:'Sürümü kontrol edin',metin:'**Sürüm** kartında bu cihazdaki sürümle yayınlanan son sürümü karşılaştırın; Android’de **Güncellemeleri Kontrol Et**e dokunun.',ekran:'hakkinda-ust',isaret:3},
        {baslik:'Uygulamayı indirin',metin:'Android uygulamasını yüklemek için **Android uygulamasını indir (APK)** bağlantısına dokunun. Dosya tarayıcıda açılır; indirdikten sonra yükleme için cihazın yönergelerini izleyin.',ekran:'hakkinda-baglantilar',isaret:1},
        {baslik:'Optik Okuyucu’yu indirin',metin:'Optik Okuyucu için ayrı APK bağlantısını kullanın; bu uygulama Koruk Asistan’dan ayrı kurulur.',ekran:'hakkinda-baglantilar',isaret:2},
        {baslik:'Güncelleme notlarını okuyun',metin:'Sayfanın altındaki **Güncelleme notları** bölümünde yayınlanan sürümlerde nelerin değiştiği listelenir.'}
      ],
      kayit:'Bu sayfa yalnızca bilgi gösterir; hiçbir kayıt oluşturmaz ya da değiştirmez. Bağlantılara dokunduğunuzda adres cihazın tarayıcısında açılır.',
      uyarilar:[
        'Android uygulaması ve Optik Okuyucu bilinmeyen kaynaktan yüklenen APK dosyalarıdır; Android ilk kurulumda izin isteyebilir. Yalnızca bu sayfadaki resmî bağlantıları kullanın.',
        'Android uygulaması güncellemeleri GitHub’daki yayınlardan indirilen APK ile alır; web sürümü ise tarayıcıdan açılır ve APK gerektirmez.'
      ],
      sorunlar:[
        {s:'“Okunamadı (çevrimdışı olabilirsiniz)” yazıyor.',c:'Son sürüm bilgisi internetten alınır. Bağlantınızı kontrol edip sayfayı yeniden açın.'},
        {s:'Sürüm numarası yerine “Web sürümü” yazıyor.',c:'Sürüm numarası yalnızca Android uygulamasında gösterilir. Web sürümünü kullanıyorsunuz; web sürümünde sürüm numarası gösterilmez.'}
      ],
      iliskili:['kilavuz','ayarlar-veriler']
    }
  ],
  geometri:/*GEO:BEGIN*/{"ana-ekran-hizli":[[2.1,44,95.9,12.1]],"ana-ekran-ozet":[[2.1,34.2,47.9,31.6]],"ana-ekran-ust":[[6.9,29.6,86.2,35.3],[6.9,64.9,86.2,7.8]],"ayarlar-ana":[[0.3,23.7,99.5,9.7],[0,33.5,100,46]],"cizelge-not-editor":[[3.1,8.3,24,6.4],[72.9,8.3,24,6.4],[60,31.5,27.7,11.5],[65.4,44.1,16.9,6.6]],"cizelge-not-kartlar":[[2.6,26.7,94.9,25.2],[6.7,43.7,43.6,6.4],[49.7,43.7,43.6,6.4]],"cizelge-not-toplam":[[56.8,30.5,22.2,18.1],[83.3,46,8.6,2.6]],"cizelge-not-yeni":[[3.1,56.5,93.8,20],[3.1,76.7,93.8,12.7],[72.5,92.2,24.4,6.4]],"cizelge-odev-editor":[[3.1,8.3,24,6.4],[26.3,8.3,24,6.4],[49.6,8.3,24,6.4],[72.9,8.3,24,6.4],[3.1,14.3,93.8,6.4],[67.7,37,21.4,3.8],[72.5,47.2,11.8,5.5]],"cizelge-odev-kartlar":[[2.6,26.7,94.9,25.2],[79.5,28.6,13.8,6.4],[6.7,43.7,43.6,6.4],[49.7,43.7,43.6,6.4]],"cizelge-odev-liste":[[2.6,16.1,94.9,34.1],[2.6,52.4,94.9,25],[70.4,80.2,26.5,6.4]],"cizelge-odev-yeni":[[3.1,69.4,93.8,9.9],[3.1,79.6,93.8,9.9],[48.6,92.2,24.4,6.4],[72.5,92.2,24.4,6.4]],"cizelge-odev-yeni-odev":[[3.1,44.8,93.8,9.9],[3.1,54.9,93.8,9.9],[3.1,65,93.8,24.4],[67.2,92.2,29.8,6.4]],"deneme-form":[[3.1,29.4,93.8,12.5],[3.1,42.2,93.8,25.2],[6.2,69.1,87.7,12.5]],"deneme-form-alt":[[3.6,44.5,92.8,27.8],[3.1,72.5,93.8,16.9],[49.2,92.2,24.4,6.4],[73.1,92.2,23.8,6.4]],"deneme-form-iki":[[6.2,24.2,87.7,25.2],[6.2,49.4,87.7,12.5],[6.2,61.9,87.7,12.5],[6.2,74.4,87.7,25.2]],"deneme-liste":[[0,22.2,100,6.4],[0,29.3,100,10.2],[0,40.2,100,38.5],[16.2,62.9,80.5,7.9],[72.6,70.7,24.1,6.4]],"deneme-sayac":[[2.3,0.9,13.8,6.4],[16.2,3.6,32.3,4],[6.2,10.7,87.7,8.9],[14.1,20.3,71.8,33.2],[0,82.9,100,9.2]],"deneme-sayac-takvim":[[6.2,36.5,87.7,23.9],[6.2,66.9,87.7,12]],"ders-programi-form":[[3.8,52.1,92.3,9.9],[3.8,65.2,92.3,6.6],[3.8,74.9,46.3,6.6],[3.8,81.5,92.3,9.9],[3.3,92.9,46.9,6.4],[49.7,92.9,46.9,6.4]],"ders-programi-gun":[[2.6,46,94.9,7.9],[2.6,58.8,94.9,9.4]],"ders-programi-ust":[[4.4,37.2,91.3,6.6],[4.4,44.1,46,8.4],[49.6,44.1,46,8.4],[4.4,52.1,46,8.4],[49.6,52.1,46,8.4],[4.4,60.2,46,8.4],[49.6,60.2,46,8.4]],"duyurular-form":[[3.1,20.9,93.8,9.9],[3.1,31.6,93.8,25.4],[3.1,57.8,93.8,22.3],[45.1,92.7,51.9,6.4]],"duyurular-liste":[[0,24.9,100,9.6],[1.3,35.8,80,5.9],[83.1,35.2,16.9,7.1],[0,42.5,100,50.8],[4.1,72.4,91.8,6.4],[4.1,78.7,91.8,6.4]],"evrak-form":[[3.1,18.5,93.8,9.9],[3.1,28.7,93.8,20],[3.1,48.9,93.8,9.9],[3.1,59.1,93.8,19.6]],"evrak-form-alt":[[3.1,64.9,93.8,9.9],[3.1,75.1,93.8,14.3],[49.2,92.1,24.4,6.4],[73.1,92.1,23.8,6.4]],"evrak-liste":[[63,16.4,32.7,6.4],[3.8,30.7,92.3,6.6],[3.8,37.6,92.3,18.7],[0,62.6,100,22.3],[3.3,77,24.1,6.4]],"gezinme-grup":[[2.8,1.3,13.8,6.4],[83.3,1.3,13.8,6.4],[2.3,10.2,95.4,8.5]],"gezinme-menu":[[57.3,1.5,26.6,5.9],[83.3,1.3,13.8,6.4],[2.3,10.4,47.4,16.8]],"gezinme-ust":[[1,1.3,45.1,5.9],[45.6,0.8,13.8,6.4],[59,0.8,13.8,6.4],[72.3,0.8,13.8,6.4],[85.6,0.9,13.3,6.2],[0,90.9,100,9.1]],"giris-ekran":[[7.2,45.6,85.6,9.7],[7.2,55.5,85.6,9.7],[7.2,66.8,85.6,6.4]],"hakkinda-baglantilar":[[4.1,23.9,91.8,34.4],[4.1,58.5,91.8,40.8]],"hakkinda-ust":[[4.4,15.6,91.3,15.9],[7.9,56.4,48.2,6.4],[4.1,64.8,91.8,31],[7.9,87.7,51.1,6.4]],"kilavuz-pencere":[[3.1,9.9,24.6,5.5],[76.3,9.4,20.6,6.4],[0,16.7,100,74.7],[63.9,92.2,33,6.4]],"kilavuz-sayfa":[[45.6,0.8,13.8,6.4],[7.9,14.9,84.1,9.7],[7.9,24.9,84.1,36],[4.1,65.4,91.8,25.3]],"kurul-detay":[[0.0,9.4,13.8,6.4],[0.0,20.1,50.3,6.4],[49.7,20.1,50.3,6.4],[0.0,26.3,13.8,6.4],[0.0,33.8,100.0,14.8]],"kurul-detay-alt":[[0.0,32.4,100.0,12.6],[65.8,46.8,30.3,6.4]],"kurul-detay-is":[[76.4,36.0,19.8,6.4],[3.8,74.4,7.7,3.6]],"kurul-form":[[3.1,18.5,93.8,20.0],[3.1,38.8,93.8,9.9],[3.1,48.9,93.8,20.0],[3.1,69.2,93.8,9.9]],"kurul-form-gorev":[[43.9,7.5,34.5,6.4],[78.9,7.5,18.0,6.4],[3.1,23.8,93.8,69.9]],"kurul-form-uyeler":[[3.1,13.0,93.8,6.6],[3.1,19.9,93.8,6.4],[3.1,26.6,93.8,6.6],[3.1,33.4,93.8,6.4]],"kurul-liste":[[4.4,22.0,31.6,6.4],[42.6,22.0,53.0,6.4],[0.0,30.4,100.0,13.5],[0.3,44.3,99.5,9.3]],"kurul-rapor":[[3.1,78.9,93.8,6.4],[3.1,85.5,93.8,6.4],[3.1,92.2,93.8,6.4]],"nobet-atama":[[3.1,62.8,93.8,9.9],[3.1,76.2,93.8,6.6],[3.1,83.1,93.8,6.4],[73.1,92.2,23.8,6.4]],"nobet-cizelge":[[2.6,46.8,94.9,6.4],[2.8,53.3,97.2,6.2],[62.6,58.3,37.4,6.3]],"nobet-ust":[[0,34.1,50.3,9.2],[49.7,34.1,50.3,9.2],[0,43.1,50.3,9.8],[49.7,43.1,50.3,9.8],[0,53.3,100,30.5]],"notlar-hizli":[[3.1,49.9,93.8,40],[3.1,89.8,93.8,8.8],[83.1,40.7,13.8,6.4]],"notlar-liste":[[0,8.3,100,6.6],[4.4,30,91.3,6.4],[0,38.4,100,10.4],[3.8,51.4,92.3,9.4],[0.3,69.3,99.5,8.8]],"notlar-yapilacak":[[3.1,66.1,93.8,9.9],[10.1,76.2,74.3,6.6],[3.1,83.1,93.8,6.4],[54.6,92.2,19,6.4],[73.1,92.2,23.8,6.4]],"ogrenciler-form":[[3.1,18.5,93.8,9.9],[3.1,28.7,93.8,20],[3.1,48.9,93.8,20],[3.1,69.2,93.8,9.9]],"ogrenciler-form-alt":[[3.1,37,93.8,20],[3.1,77.6,93.8,11.8],[49.2,92.1,24.4,6.4],[73.1,92.1,23.8,6.4]],"ogrenciler-liste":[[68.2,15.4,27.4,6.4],[3.3,30.3,93.3,6.2],[2.3,39.1,95.4,11],[3.3,50.4,93.3,5.7],[0,58.1,100,6.6],[0,64.5,51.3,6.9],[0,75.2,100,8.3]],"ogrenciler-profil":[[2.1,9.2,13.8,6.4],[84.1,9.2,13.8,6.4],[0,16.9,100,13.2],[0,30.7,100,8.1],[3.3,40.8,93.3,6.2],[0,49,100,7.1]],"ogretmenler-form":[[3.1,18.5,93.8,20],[3.1,38.8,93.8,20],[3.1,59.1,93.8,20]],"ogretmenler-form-alt":[[3.1,6.9,93.8,9.9],[3.1,77.6,93.8,11.8],[49.2,92.1,24.4,6.4],[73.1,92.1,23.8,6.4]],"ogretmenler-liste":[[65.3,15.4,30.3,6.4],[3.3,30.3,93.3,6.2],[3.3,36.7,93.3,5.7],[0,44.4,100,6.6],[0,50.8,26.9,6.4],[26.3,50.8,35,6.4],[0,61.1,100,21.7],[84.9,75.8,11.3,5.2]],"ogretmenler-profil":[[2.1,9.2,13.8,6.4],[84.1,9.2,13.8,6.4],[0,16.9,100,13.2],[0,30.7,100,8.1],[3.3,40.8,93.3,6.2],[0,49,100,7.1]],"rapor-duzenle":[[7.9,36,84.1,19.7],[7.9,75.8,84.1,9.7],[7.9,85.8,84.1,9.7]],"rapor-liste":[[4.1,32.3,91.8,18.1],[7.9,42.3,30.3,6.4],[38.8,42.3,26.4,6.4],[65.7,42.3,26.3,6.4]],"rapor-onizleme":[[0.8,0.4,13.8,6.4],[55.9,0.4,43.3,6.4],[13.6,6.3,43.3,6.4],[55.9,6.3,43.3,6.4],[0.8,12.3,45.1,6.4],[3.7,19.7,49.3,12.3]],"siniflar-detay":[[2.1,14.5,13.8,6.4],[84.1,14.5,13.8,6.4],[3.3,37.4,93.3,6.2],[0,48,100,7.1],[0,55.6,39.5,6.4],[39,55.6,55.7,6.4],[0,62.5,100,8.3]],"siniflar-form":[[3.1,37.1,93.8,9.9],[3.1,47.3,93.8,20],[3.1,67.5,93.8,9.9],[49.2,92.2,24.4,6.4],[73.1,92.2,23.8,6.4]],"siniflar-liste":[[68.2,15.4,27.5,6.4],[4.4,26.7,91.3,6.4],[3.3,36.9,93.3,6.2],[2.3,45.7,95.4,11],[0,58.8,100,6.6],[0,65.2,55.7,6.4],[0,75.4,100,20.5]],"takvim-ana":[[54,19.5,23.7,6.4],[78.2,19.5,21.8,6.4],[0,27.3,100,8.1],[3.8,37.4,92.3,6.4],[3.8,48,92.3,30.7]],"takvim-etkinlik-form":[[3.1,47.3,93.8,9.9],[3.1,57.4,93.8,20],[3.1,77.7,93.8,11.8],[49.2,92.2,24.4,6.4],[73.1,92.2,23.8,6.4]],"takvim-gorev-form":[[3.1,47.3,93.8,9.9],[3.1,69.4,93.8,20],[73.1,92.2,23.8,6.4]],"takvim-gun":[[0,24.1,100,23.5],[72.6,29.9,24.1,6.4],[0,47.8,100,42.1]],"veriler-sayfa":[[0,23.6,100,33.4]],"veriler-yedek":[[3.8,72.9,44.9,6.4],[49.3,72.9,46.9,6.4]],"yazili-form":[[3.6,33.4,92.8,25.8],[3.1,59.5,93.8,20],[3.1,79.8,93.8,9.9]],"yazili-form-alt":[[3.1,34.6,93.8,20],[3.1,54.9,93.8,20],[3.1,75.1,93.8,14.3],[49.2,92.2,24.4,6.4],[73.1,92.2,23.8,6.4]],"yazili-liste":[[0,12.3,100,9.7],[0,22.2,100,6.4],[0,29.3,100,10.2],[3.6,41.9,92.8,6.5],[72.3,80.6,24.1,6.4]],"yemek-aylik":[[7.9,32,84.1,6.4],[7.9,38.7,84.1,1.9],[7.9,43.7,42,6.4],[50,43.7,42.1,6.4],[23.8,56.7,69.2,25.1],[23.8,81.6,32.1,5.2]],"yemek-denetim":[[68,30.3,27.9,8.9],[7.9,41.2,84.1,9.7],[7.9,51.1,84.1,9.7],[7.9,59.7,84.1,9.7]],"yemek-gunluk":[[7.9,30,84.1,6.4],[7.9,36.6,84.1,6.4],[4.1,45,91.8,37.1]],"yemek-haftalik":[[7.9,30,84.1,6.4],[7.9,36.6,84.1,6.4],[4.1,45,91.8,20]],"yoklama-devamsiz":[[0,32.3,100,12.3],[0,44.8,100,8.3],[0,59.5,100,12.3],[68.6,64,28.1,6.4]],"yoklama-sinif":[[0,25.9,100,6.2],[2.8,33.6,47.4,9.7],[49.7,33.6,47.4,9.7],[0,44.8,100,8.3],[69,53.6,30.4,6.4],[2.6,66,94.9,5.7],[49.2,85,48,6.4]],"yoklama-tumu":[[2.8,33.6,47.4,9.7],[0,44.8,100,7.8]]}/*GEO:END*/
};

global.KorukGuideData=D;
})(window);
