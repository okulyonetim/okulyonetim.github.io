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
    pdf:'',
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
  surumNotKaynagi:'Notlar, her sürümün yayınlandığı sürüm kaydındaki (GitHub Releases) işlem açıklamalarından özetlenmiştir; yalnızca yayınlanmış sürümler listelenir.',
  surumNotlari:[
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
  geometri:/*GEO:BEGIN*/{"ana-ekran-hizli":[[2.1,44,95.9,12.1]],"ana-ekran-ozet":[[2.1,34.2,47.9,31.6]],"ana-ekran-ust":[[6.9,29.6,86.2,35.3],[6.9,64.9,86.2,7.8]],"ayarlar-ana":[[0.3,23.7,99.5,9.7],[0,33.5,100,46]],"ders-programi-form":[[3.8,52.1,92.3,9.9],[3.8,65.2,92.3,6.6],[3.8,74.9,46.3,6.6],[3.8,81.5,92.3,9.9],[3.3,92.9,46.9,6.4],[49.7,92.9,46.9,6.4]],"ders-programi-gun":[[2.6,46,94.9,7.9],[2.6,58.8,94.9,9.4]],"ders-programi-ust":[[4.4,37.2,91.3,6.6],[4.4,44.1,46,8.4],[49.6,44.1,46,8.4],[4.4,52.1,46,8.4],[49.6,52.1,46,8.4],[4.4,60.2,46,8.4],[49.6,60.2,46,8.4]],"duyurular-form":[[3.1,20.9,93.8,9.9],[3.1,31.6,93.8,25.4],[3.1,57.8,93.8,22.3],[45.1,92.7,51.9,6.4]],"duyurular-liste":[[0,24.9,100,9.6],[1.3,35.8,80,5.9],[83.1,35.2,16.9,7.1],[0,42.5,100,50.8],[4.1,72.4,91.8,6.4],[4.1,78.7,91.8,6.4]],"evrak-form":[[3.1,18.5,93.8,9.9],[3.1,28.7,93.8,20],[3.1,48.9,93.8,9.9],[3.1,59.1,93.8,19.6]],"evrak-form-alt":[[3.1,64.9,93.8,9.9],[3.1,75.1,93.8,14.3],[49.2,92.1,24.4,6.4],[73.1,92.1,23.8,6.4]],"evrak-liste":[[63,16.4,32.7,6.4],[3.8,30.7,92.3,6.6],[3.8,37.6,92.3,18.7],[0,62.6,100,22.3],[3.3,77,24.1,6.4]],"gezinme-grup":[[2.8,1.3,13.8,6.4],[83.3,1.3,13.8,6.4],[2.3,10.2,95.4,8.5]],"gezinme-menu":[[57.3,1.5,26.6,5.9],[83.3,1.3,13.8,6.4],[2.3,10.4,47.4,16.8]],"gezinme-ust":[[1,1.3,45.1,5.9],[45.6,0.8,13.8,6.4],[59,0.8,13.8,6.4],[72.3,0.8,13.8,6.4],[85.6,0.9,13.3,6.2],[0,90.9,100,9.1]],"giris-ekran":[[7.2,45.6,85.6,9.7],[7.2,55.5,85.6,9.7],[7.2,66.8,85.6,6.4]],"hakkinda-baglantilar":[[4.1,23.9,91.8,34.4],[4.1,58.5,91.8,40.8]],"hakkinda-ust":[[4.4,15.6,91.3,15.9],[7.9,56.4,48.2,6.4],[4.1,64.8,91.8,31],[7.9,87.7,51.1,6.4]],"kilavuz-pencere":[[3.1,9.9,24.6,5.5],[76.3,9.4,20.6,6.4],[0,16.7,100,74.7],[63.9,92.2,33,6.4]],"kilavuz-sayfa":[[45.6,0.8,13.8,6.4],[7.9,14.9,84.1,9.7],[7.9,24.9,84.1,36],[4.1,65.4,91.8,25.3]],"nobet-atama":[[3.1,62.8,93.8,9.9],[3.1,76.2,93.8,6.6],[3.1,83.1,93.8,6.4],[73.1,92.2,23.8,6.4]],"nobet-cizelge":[[2.6,46.8,94.9,6.4],[2.8,53.3,97.2,6.2],[62.6,58.3,37.4,6.3]],"nobet-ust":[[0.0,34.1,50.3,9.2],[49.7,34.1,50.3,9.2],[0.0,43.1,50.3,9.8],[49.7,43.1,50.3,9.8],[0.0,53.3,100.0,30.5]],"ogrenciler-form":[[3.1,18.5,93.8,9.9],[3.1,28.7,93.8,20],[3.1,48.9,93.8,20],[3.1,69.2,93.8,9.9]],"ogrenciler-form-alt":[[3.1,37,93.8,20],[3.1,77.6,93.8,11.8],[49.2,92.1,24.4,6.4],[73.1,92.1,23.8,6.4]],"ogrenciler-liste":[[68.2,15.4,27.4,6.4],[3.3,30.3,93.3,6.2],[2.3,39.1,95.4,11],[3.3,50.4,93.3,5.7],[0,58.1,100,6.6],[0,64.5,51.3,6.9],[0,75.2,100,8.3]],"ogrenciler-profil":[[2.1,9.2,13.8,6.4],[84.1,9.2,13.8,6.4],[0,16.9,100,13.2],[0,30.7,100,8.1],[3.3,40.8,93.3,6.2],[0,49,100,7.1]],"ogretmenler-form":[[3.1,18.5,93.8,20],[3.1,38.8,93.8,20],[3.1,59.1,93.8,20]],"ogretmenler-form-alt":[[3.1,6.9,93.8,9.9],[3.1,77.6,93.8,11.8],[49.2,92.1,24.4,6.4],[73.1,92.1,23.8,6.4]],"ogretmenler-liste":[[65.3,15.4,30.3,6.4],[3.3,30.3,93.3,6.2],[3.3,36.7,93.3,5.7],[0,44.4,100,6.6],[0,50.8,26.9,6.4],[26.3,50.8,35,6.4],[0,61.1,100,21.7],[84.9,75.8,11.3,5.2]],"ogretmenler-profil":[[2.1,9.2,13.8,6.4],[84.1,9.2,13.8,6.4],[0,16.9,100,13.2],[0,30.7,100,8.1],[3.3,40.8,93.3,6.2],[0,49,100,7.1]],"rapor-duzenle":[[7.9,36,84.1,19.7],[7.9,75.8,84.1,9.7],[7.9,85.8,84.1,9.7]],"rapor-liste":[[4.1,32.3,91.8,18.1],[7.9,42.3,30.3,6.4],[38.8,42.3,26.4,6.4],[65.7,42.3,26.3,6.4]],"rapor-onizleme":[[0.8,0.4,13.8,6.4],[55.9,0.4,43.3,6.4],[13.6,6.3,43.3,6.4],[55.9,6.3,43.3,6.4],[0.8,12.3,45.1,6.4],[3.7,19.7,49.3,12.3]],"siniflar-detay":[[2.1,14.5,13.8,6.4],[84.1,14.5,13.8,6.4],[3.3,37.4,93.3,6.2],[0.0,48.0,100.0,7.1],[0.0,55.6,39.5,6.4],[39.0,55.6,55.7,6.4],[0.0,62.5,100.0,8.3]],"siniflar-form":[[3.1,37.1,93.8,9.9],[3.1,47.3,93.8,20.0],[3.1,67.5,93.8,9.9],[49.2,92.2,24.4,6.4],[73.1,92.2,23.8,6.4]],"siniflar-liste":[[68.2,15.4,27.5,6.4],[4.4,26.7,91.3,6.4],[3.3,36.9,93.3,6.2],[2.3,45.7,95.4,11.0],[0.0,58.8,100.0,6.6],[0.0,65.2,55.7,6.4],[0.0,75.4,100.0,20.5]],"veriler-sayfa":[[0,23.6,100,33.4]],"veriler-yedek":[[3.8,72.9,44.9,6.4],[49.3,72.9,46.9,6.4]]}/*GEO:END*/
};

global.KorukGuideData=D;
})(window);
