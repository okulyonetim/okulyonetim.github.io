/**
 * omrEngine.js
 * --------------
 * Kamerayla çekilen optik form fotoğrafını okur.
 *
 * AKIŞ (tek fotoğraf -> analiz -> sonuç):
 *   1) Fotoğraftan sayfaTespitCV.js (OpenCV.js Canny+findContours) ile
 *      sayfanın 4 köşe çerçevesi bulunur.
 *   2) Her köşe bölgesinde `enBuyukKareBlobuBul` ile hizalama karesinin
 *      (fiducial marker, 6×6mm) hassas piksel merkezi bulunur.
 *   3) 4 hassas köşe noktasından TAM homografi (8-DOF DLT) kurulur.
 *      QR koda ihtiyaç yok — doğrudan fiducial tabanlı.
 *   4) Homografi ile form, canonical (mm×ppmm) canvas'a ters-eşleme +
 *      bilinear örneklemeyle düzleştirilir.
 *   5) Düzleştirilmiş canvas'ta baloncuk merkezleri (mm → piksel) örneklenir,
 *      en koyu (ve yeterince ayırt edici) şık işaretli sayılır.
 *
 * BAĞIMLILIK: OpenCV.js (global `cv`) — sayfaTespitCV.js üzerinden.
 *   jsQR artık kullanılmıyor, index.html'den de kaldırıldı.
 *
 * GİRDİ: bir <img>/<video>/<canvas> kaynağı + layoutEngine.js'in
 *        layoutHesapla() çıktısındaki form nesnesi.
 *
 * ÇIKTI (formuOku'nun döndürdüğü Promise):
 *   {
 *     basarili: boolean,
 *     ogrenciKimlik: object|null,   // numara + kitapçık baloncuklarından
 *     cevaplar: [{
 *       ders, soruNo, isaretliSik,
 *       isaretlemeSeviyesi,  // 'tamamenIsaretli'|'normalIsaretli'|'yarimIsaretli'|'azIsaretli'|'cokAzIsaretli'
 *       guven,
 *       uyari                // null | 'bos' | 'coklu' | 'dusukDolulukOraniCiftIsaretli'
 *     }],
 *     birdenFazlaSecenekIsaretleme: [{ ders, soruNo, adaylar:[{harf,oran}] }],
 *     uyarilar: string[],    // 'goruntuCokParlak'/'goruntuCokKoyu'/'yetersizPiksel' dahil
 *     hataAyiklama: {
 *       duzeltilmisCanvas: HTMLCanvasElement,
 *       hizalamaNoktalari: {x,y}[],
 *       ornekNoktalari: array
 *     }
 *   }
 */

window.OmrOkuyucu = (function () {

  // mm başına piksel — düzleştirilmiş (canonical) canvas'ın çözünürlüğü.
  // Küçük tek-form fotoğrafları için yeterli, tam A4 için düşürülebilir.
  const VARSAYILAN_PPMM = 8;

  // (Not: hizalama işareti arama penceresi artık formuDuzlestir içinde,
  // fotoğrafın kendi ölçeğine göre mm bazlı hesaplanıyor — bkz.
  // YEREL_ISARETLER_ARAMA_MM / yerelOlcekKestir.)

  // Bir baloncuğun "işaretli" sayılması için gereken minimum karanlık oranı
  // (0 = tamamen beyaz/renkli baskı, 1 = tamamen siyah/gri işaret).
  //
  // ARTIK SABİT DEĞİL: Ayarlar sheet'indeki "Cevap Koyuluk Eşiği"
  // kaydırıcısından (hassasiyetAyarlari.js: koyulukEsik) CANLI okunur —
  // her tarama denemesinde güncel değeri alır, kod değiştirmeden/yeniden
  // derlemeden kamera ekranından ayarlanabilir. window.HassasiyetAyarlari
  // herhangi bir sebeple yüklenmemişse aşağıdaki yedek değere düşer.
  //
  // NOT (Ağustos 2026): yedek değer 0.28'den 0.40'a yükseltildi —
  // hassasiyetAyarlari.js:koyulukEsik ile aynı gerekçe (gerçek teşhis
  // verisi, bu formun taban gürültüsü 0.28-0.35 arası çıkıyordu).
  // ÖNEMLİ RİSK: hassasiyetAyarlari.js localStorage'da kalıcı saklıyor —
  // Sedat DAHA ÖNCE Ayarlar ekranından bu kaydırıcıyı elle 0.28'e
  // ayarlayıp kaydettiyse, buradaki/oradaki varsayılan değişikliği
  // localStorage'daki eski değeri EZMEZ, görünmez kalır. Sorun devam
  // ederse önce Ayarlar ekranındaki "Cevap Koyuluk Eşiği" kaydırıcısının
  // gerçek değerine bakılmalı.
  function _koyulukEsikGetir() {
    try {
      if (window.HassasiyetAyarlari && typeof window.HassasiyetAyarlari.ayarlariGetir === 'function') {
        const a = window.HassasiyetAyarlari.ayarlariGetir();
        if (typeof a.koyulukEsik === 'number' && !isNaN(a.koyulukEsik)) return a.koyulukEsik;
      }
    } catch (e) { /* ayarlar okunamazsa varsayılana düş */ }
    return 0.40;
  }

  // En koyu şık ile ikinci en koyu şık arasında olması gereken minimum fark.
  // Bunun altındaysa "belirsiz/çoklu işaret" olarak işaretlenir.
  // ARTIK SABİT DEĞİL — Ayarlar sheet'inden canlı okunur (bkz. _koyulukEsikGetir
  // ile aynı desen). Gerçek kullanım verisi gösterdi ki (bkz. "Koyuluk özeti"
  // teşhis satırı) bazı kağıtlarda en kötü sorunun bile en koyu şıkkı eşiğin
  // (KARANLIK_ESIK) rahatça üzerinde olabiliyor, ama işaretli/işaretsiz şıklar
  // birbirine yeterince yakın koyulukta kalabiliyor — asıl darboğaz o zaman
  // KARANLIK_ESIK değil bu fark oluyor.
  function _ayirtEdiciFarkGetir() {
    try {
      if (window.HassasiyetAyarlari && typeof window.HassasiyetAyarlari.ayarlariGetir === 'function') {
        const a = window.HassasiyetAyarlari.ayarlariGetir();
        if (typeof a.ayirtEdiciFark === 'number' && !isNaN(a.ayirtEdiciFark)) return a.ayirtEdiciFark;
      }
    } catch (e) { /* ayarlar okunamazsa varsayılana düş */ }
    return 0.10;
  }

  // Öğrenci numarası hanelerinde AYNI mantığın karşılığı (bkz. numaraOku /
  // baloncukGrubundanEnKoyuyuSec) — ayrı bir ayar, çünkü numara hanelerinin
  // doğal ayırt edicilik marjı cevap şıklarınkinden farklı olabilir.
  function _numaraMinFarkGetir() {
    try {
      if (window.HassasiyetAyarlari && typeof window.HassasiyetAyarlari.ayarlariGetir === 'function') {
        const a = window.HassasiyetAyarlari.ayarlariGetir();
        if (typeof a.numaraMinFark === 'number' && !isNaN(a.numaraMinFark)) return a.numaraMinFark;
      }
    } catch (e) { /* ayarlar okunamazsa varsayılana düş */ }
    return 0.02;
  }

  // YENİ (Ağustos 2026, gerçek kağıt teşhisiyle bulundu — bkz.
  // hassasiyetAyarlari.js:numaraKoyulukEsik açıklaması): _basamakEnKoyusu
  // önceden SADECE numaraMinFark (fark eşiği) kontrol ediyordu, mutlak
  // sinyal seviyesine hiç bakmıyordu. Boş bir hanede en yüksek adaylar
  // birbirine yakın ama HEPSİ zayıf (gürültü) olabiliyordu — düşük bir
  // fark eşiği bu gürültüden bile "kesin" bir rakam üretebiliyordu.
  function _numaraKoyulukEsikGetir() {
    try {
      if (window.HassasiyetAyarlari && typeof window.HassasiyetAyarlari.ayarlariGetir === 'function') {
        const a = window.HassasiyetAyarlari.ayarlariGetir();
        if (typeof a.numaraKoyulukEsik === 'number' && !isNaN(a.numaraKoyulukEsik)) return a.numaraKoyulukEsik;
      }
    } catch (e) { /* ayarlar okunamazsa varsayılana düş */ }
    return 0.45;
  }

  // YENİ (teşhis): duzCanvasUret'in H matrisi testinin sonucu — formuOku
  // tarafından uyarılara eklenir.
  let _sonHTestSonucu = null;
  let _sonHKatsayilari = null;
  let _sonKoyulukOzeti = null;
  let _sonNumaraTeshis = null;
  let _sonKitapcikTeshis = null; // YENİ (teşhis): kitapçık/form kodu okumasında hangi seçeneğin neden seçildiği/belirsiz kaldığı — numaraTeshis ile aynı desen
  let _cevapTeshisSatirlari = []; // YENİ (teşhis): her ders için en fazla 2 örnek belirsiz/boş cevap sorusunun top-3 şık adayı
  let _cevapTeshisSayaci = {}; // YENİ (teşhis): _cevapTeshisSatirlari'nın ders başına kotasını (2) sayar
  let _sonIsaretliSik = {}; // YENİ (teşhis): her ders için en son işaretli bulunan {soruNo, harf, guven} — ardışık aynı-şık tespiti için
  let _sonYerelAramaHamOran = null; // YENİ (teşhis): baloncukKaranlikOraniYerelArama'nın en son çağrısında, eğer bulunan dx/dy "duvara toslama" şüphesi taşıyorsa (bkz. fonksiyon içi not), (dx=0,dy=0) noktasındaki ham oran — Fen #18-19 gibi durumları ayırt etmek için
  let _ardisikAyniSikSatirlari = []; // YENİ (teşhis): ardışık iki sorunun aynı şıkka kilitlendiği durumlar (satır-kilitleme komşu satıra kayması belirtisi)
  let _radyalProfilSatirlari = []; // YENİ (teşhis): bkz. radyalKoyulukProfili — her formuOku çağrısında sıfırlanır

  // Yetersiz piksel guard (bkz. baloncukDolulukBinary açıklaması).
  // Her formuOku/formuOkuElleKoseli çağrısında sıfırlanır; birden fazla
  // baloncuk ROI'si kağıt/koordinat dışına taşarsa buraya eklenir ve
  // uyarilar listesine yansıtılır — C++ tarafının "not enough pixels"
  // exception'ının JS karşılığı.
  let _yetersizPikselUyarilari = [];

  // Okuma öncesi görüntü kalitesi uyarıları (parlama / çok koyu).
  // isParlamaVarKontrol() tarafından doldurulan string[] — her
  // formuOku/formuOkuElleKoseli çağrısında sıfırlanır.
  let _goruntKaliteUyarilari = [];

  // ---------------------------------------------------------------------
  // 1) Genel yardımcılar: görüntü <-> ImageData
  // ---------------------------------------------------------------------

  function kaynaktanImageDataAl(kaynak) {
    const genislik = kaynak.videoWidth || kaynak.naturalWidth || kaynak.width;
    const yukseklik = kaynak.videoHeight || kaynak.naturalHeight || kaynak.height;
    if (!genislik || !yukseklik) {
      throw new Error('Görüntü kaynağının boyutları okunamadı (henüz yüklenmemiş olabilir).');
    }
    const canvas = document.createElement('canvas');
    canvas.width = genislik;
    canvas.height = yukseklik;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(kaynak, 0, 0, genislik, yukseklik);
    const imageData = ctx.getImageData(0, 0, genislik, yukseklik);
    return { canvas, ctx, imageData, genislik, yukseklik };
  }

  function grilikDegeri(data, index) {
    // index: pikselin data dizisindeki BAŞLANGIÇ ofseti (r bileşeni)
    // basit luma yaklaşık formülü
    return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
  }

  /**
   * Bir pikselin "ÖĞRENCİ İŞARETİ" olma olasılığını, sadece parlaklığına değil
   * RENGİNE de bakarak hesaplar.
   *
   * SORUN: Cevap kağıdı şablonu (çember çizgileri, içindeki A/B/C/D harfleri)
   * KOYU PEMBE/BORDO bir mürekkeple basılı. Bu renk, gri tonlamaya
   * çevrildiğinde de epey "koyu" bir değer üretiyor — bu yüzden BOŞ
   * (işaretlenmemiş) bir baloncuk bile sürekli 0.15-0.35 arası bir "taban
   * gürültü" koyuluğu veriyordu (tüm testlerde tekrar eden, hizalamadan
   * bağımsız sabit gürültü budur). Öğrencinin kalem/kurşun kalem işareti ise
   * SİYAH/GRİ, yani RENKSİZ (doygunluğu düşük) — baskının pembesinden bu
   * yönüyle ayrılır.
   *
   * ÇÖZÜM: Parlaklık bazlı koyuluğu, pikselin DOYGUNLUĞUYLA (renklilik
   * derecesiyle) çarpıyoruz — doygunluk yüksekse (yani piksel pembe/bordo
   * gibi renkliyse) puanı hızla düşürüyoruz; doygunluk düşükse (piksel
   * siyah/gri/beyaz gibi renksizse) puanı olduğu gibi bırakıyoruz. Böylece
   * baskının kendi rengi "işaret" sayılmaktan büyük ölçüde çıkarılmış olur.
   */
  function isaretKoyulukPuani(data, index) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const gri = 0.299 * r + 0.587 * g + 0.114 * b;
    const koyuluk = 1 - gri / 255;

    const maxKanal = Math.max(r, g, b);
    const minKanal = Math.min(r, g, b);
    const doygunluk = maxKanal > 0 ? (maxKanal - minKanal) / maxKanal : 0;

    // YENİ: çarpan 2.5 -> 1.2 yumuşatıldı. Gerçek fotoğraflarda (JPEG
    // sıkıştırma, beyaz dengesi, ışık) siyah kalem izi bile hiçbir zaman
    // %0 doygunlukta çıkmıyor — 2.5'lik agresif ceza, gözlemlenen "her
    // soru tekdüze düşük guven (0.07-0.14), gerçek işaretli baloncuk bile
    // ayırt edilemiyor" sorununun kaynağı olabilir: hafif renk sapması
    // olan gerçek işaretleri de baskının pembesiyle birlikte eziyordu.
    const renksizlikCarpani = Math.max(0, 1 - doygunluk * 1.2);

    return koyuluk * renksizlikCarpani;
  }

  /**
   * Düzleştirilmiş (canonical) görüntüye ADAPTİF KONTRAST NORMALİZASYONU uygular.
   *
   * SORUN: baloncukKaranlikOrani, ham fotoğraf pikselinin mutlak parlaklığını
   * (0-255) sabit bir eşikle (KARANLIK_ESIK) karşılaştırıyordu. Telefonla çekilen
   * fotoğraflarda ışık/gölge/JPEG sıkıştırması yüzünden "gerçek beyaz" kağıt
   * genelde 180-230 arası, "gerçek siyah" dolgu ise 40-90 arası bir gri tonda
   * kalıyor — hiçbir zaman 0/255'e ulaşmıyor. Bu da dolu baloncuklarda bile
   * düşük "oran" (guven) değerine, dolayısıyla "boş" olarak yanlış okumaya
   * yol açıyordu (bkz. 86 soruluk toplu "boş/belirsiz" uyarısı).
   *
   * ÇÖZÜM: Görüntünün kendi histogramından, o FOTOĞRAFA özgü siyah/beyaz
   * noktalarını (yüzdelik dilim ile, aşırı uç değerlerden etkilenmemek için)
   * bulup 0-255 aralığına yeniden geriyoruz (histogram stretch / auto-contrast).
   * Böylece her fotoğraf kendi ışık koşuluna göre kalibre olur.
   */
  function kontrastNormalizeEt(imageData, altYuzde = 0.02, ustYuzde = 0.02) {
    const { data, width, height } = imageData;
    const toplamPiksel = width * height;
    if (toplamPiksel === 0) return;

    const histogram = new Uint32Array(256);
    for (let i = 0; i < data.length; i += 4) {
      const gri = Math.round(grilikDegeri(data, i));
      histogram[Math.max(0, Math.min(255, gri))]++;
    }

    let siyahNokta = 0;
    let kumulatif = 0;
    for (let v = 0; v < 256; v++) {
      kumulatif += histogram[v];
      if (kumulatif / toplamPiksel >= altYuzde) {
        siyahNokta = v;
        break;
      }
    }

    let beyazNokta = 255;
    kumulatif = 0;
    for (let v = 255; v >= 0; v--) {
      kumulatif += histogram[v];
      if (kumulatif / toplamPiksel >= ustYuzde) {
        beyazNokta = v;
        break;
      }
    }

    // Dejenere durum (tamamen düz renk vb.) - normalize etmeye değmez.
    if (beyazNokta - siyahNokta < 10) return;

    // YENİ: doğrusal gerdirmeden SONRA hafif bir gama düzeltmesi (<1)
    // uygulanıyor — orta tonları (gerçek işaretli baloncukların genelde
    // düştüğü, tam siyah olmayan gri aralık) daha da karartır, siyah-beyaz
    // benzeri bir kontrast artışı sağlar. Kullanıcı gözlemi: en koyu bulunan
    // işaret bile eşiğe (0.28) çok yakın ama altında kalıyordu (0.246) —
    // bu, doğrusal gerdirmenin tek başına yetersiz kaldığının kanıtı.
    // NOT: 1.8 denendi — cevaplariCikar'daki mutlak eşiği (KARANLIK_ESIK)
    // geçmeye yardımcı oldu ama numaraOku'nun KULLANDIĞI göreli fark
    // (MIN_FARK) koyu tonlar arasında sıkıştığı için basamak okumasını
    // bozdu (aynı fotoğrafta numara önce doğru okunurken 1.8 ile
    // okunamaz oldu). 1.35'e düşürüldü — daha ölçülü, ikisini de gözetir.
    const GAMA = 1.35;
    const aralik = beyazNokta - siyahNokta;
    for (let i = 0; i < data.length; i += 4) {
      for (let kanal = 0; kanal < 3; kanal++) {
        const v = data[i + kanal];
        const gerilmis = Math.max(0, Math.min(255, ((v - siyahNokta) / aralik) * 255));
        data[i + kanal] = Math.round(255 * Math.pow(gerilmis / 255, GAMA));
      }
    }
  }

  // ---------------------------------------------------------------------
  // 1.4) Görüntü kalite ön-kontrolü: parlama / çok koyu
  //
  // C++ tarafındaki isParlamaVar()'ın JS karşılığı. Kanonik canvas
  // üretilmeden ÖNCE ham fotoğraf üzerinde çalışır; sonuç
  // _goruntKaliteUyarilari listesine yansıtılır.
  // Her formuOku/formuOkuElleKoseli çağrısında sıfırlanır.
  // ---------------------------------------------------------------------

  /**
   * Ham fotoğraf ImageData'sında parlama (çok açık) veya çok koyu alan
   * oranlarını histogramdan kontrol eder. Aynı tek geçişte her ikisini de
   * saptar, goruntuCokParlak / goruntuCokKoyu şeklinde uyarı üretir.
   *
   * Eşikler:
   *   - PARLAK_ESIK (>=235/255): gerçek lens/kağıt parlamasının başlangıcı.
   *     Oranı PARLAK_MAX_ORAN (>%18) aşarsa parlama var sayılır.
   *   - KOYU_ESIK  (<=25/255):  neredeyse siyah piksel (aşırı düşük ışık).
   *     Oranı KOYU_MAX_ORAN   (>%35) aşarsa görüntü çok koyu sayılır.
   *
   * Her iki uyarı da AYNI geçişte üretilir — ikisi aynı anda tetiklenebilir
   * (ör. çok kontrastlı bir ışık/gölge durumu).
   *
   * @param {ImageData} imageData - ham fotoğraf (düzleştirilmeden önce)
   */
  function isParlamaVarKontrol(imageData) {
    // C++ liboptikokuyucu.so değerleriyle hizalandı (bkz. isParlamaVar pseudo-code):
    //   PARLAK_ESIK = 220 (C++: threshold(blur, mask, 220, 255, THRESH_BINARY))
    //   PARLAK_MAX_ORAN = 0.05 (C++: countNonZero/total > 0.05)
    // C++ GaussianBlur(5,5) uyguladıktan SONRA eşikliyor; biz blurlamıyoruz,
    // bu yüzden eşiği biraz yukarı (228) ve toleransı biraz gevşet (0.08)
    // alıyoruz — etkin sonuç yaklaşık aynı.
    const PARLAK_ESIK     = 228;  // C++'ın 220'si + blur etkisi telafisi
    const PARLAK_MAX_ORAN = 0.08; // C++'ın %5'i, blur farkı hesaba katıldı
    const KOYU_ESIK       = 30;   // neredeyse siyah piksel
    const KOYU_MAX_ORAN   = 0.40; // görüntünün %40'ı bu kadar koyu → çok karanlık

    const { data, width, height } = imageData;
    const toplamPiksel = width * height;
    if (toplamPiksel === 0) return;

    let parlakSayisi = 0;
    let koyuSayisi   = 0;

    for (let i = 0; i < data.length; i += 4) {
      const gri = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (gri >= PARLAK_ESIK) parlakSayisi++;
      if (gri <= KOYU_ESIK)   koyuSayisi++;
    }

    const parlakOran = parlakSayisi / toplamPiksel;
    const koyuOran   = koyuSayisi   / toplamPiksel;

    if (parlakOran > PARLAK_MAX_ORAN) {
      _goruntKaliteUyarilari.push(
        'goruntuCokParlak — parlak piksel oranı: ' + (parlakOran * 100).toFixed(1) +
        '% (eşik: ' + (PARLAK_MAX_ORAN * 100).toFixed(0) + '%). ' +
        'Kağıdı doğrudan ışık kaynağına doğru tutmaktan kaçının veya ' +
        'flaşı kapatın.'
      );
    }

    if (koyuOran > KOYU_MAX_ORAN) {
      _goruntKaliteUyarilari.push(
        'goruntuCokKoyu — koyu piksel oranı: ' + (koyuOran * 100).toFixed(1) +
        '% (eşik: ' + (KOYU_MAX_ORAN * 100).toFixed(0) + '%). ' +
        'Fotoğraf çok karanlık ortamda veya düşük pozlamada çekilmiş olabilir.'
      );
    }
  }

  // ---------------------------------------------------------------------
  // 1.5) Adaptif eşikleme (Test Plus yaklaşımı)
  //
  // kontrastNormalizeEt'ten SONRA çağrılır. Saf-JS motoru (window.CvSaf,
  // Ağustos 2026'da OpenCV.js'in 10.9MB WASM'ının yerine geçti — bkz.
  // cvSaf.js) her bölge için ayrı eşik hesaplar, ışık farklılıklarını/
  // parlamayı otomatik telafi eder. window.CvSaf henüz yüklenmemişse
  // (nadir — module script henüz çözümlenmemiş olabilir) basit Otsu
  // eşiklemesine düşer. Sonuç: binary (0/255) ImageData.
  //
  // Bu fonksiyon canonical canvas ImageData'yı YERİNDE değiştirir.
  // baloncukKaranlikOrani yerine baloncukDoluluğuBinary kullanılır.
  // ---------------------------------------------------------------------

  // Adaptif eşiklenmiş binary ImageData — her formuOku çağrısında
  // üretilip baloncuk okuma adımında kullanılır, sonra temizlenir.
  let _binaryImageData = null;

  /**
   * Canonical canvas ImageData'dan adaptif eşikli binary görüntü üretir.
   * window.CvSaf (saf-JS motoru) varsa adaptiveThresholdGaussian, yoksa
   * basit Otsu kullanır. Sonuç _binaryImageData'ya yazılır.
   */
  function adaptifEsikle(cImageData) {
    const { width, height, data } = cImageData;

    // Düz gri tonlama — form siyah beyaz basıldığı için renk filtresi gereksiz.
    const gri = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gri[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }

    let binary;

    if (typeof window !== 'undefined' && window.CvSaf) {
      try {
        // blockSize: baloncuk çapının ~3 katı (5.5mm × 8px/mm ≈ 44px → 131px)
        // Tek sayı olmalı. C=8: yerel ortalamadan çıkarılacak sabit.
        // tersine=true: THRESH_BINARY_INV eşdeğeri (koyu piksel = işaretli).
        const sonucGri = window.CvSaf.adaptiveThresholdGaussian(
          { width, height, data: gri },
          131,
          8,
          true
        );
        binary = sonucGri.data;
      } catch (e) {
        binary = new Uint8Array(width * height);
        _otsuEsikle(gri, binary, width, height);
      }
    } else {
      binary = new Uint8Array(width * height);
      _otsuEsikle(gri, binary, width, height);
    }

    _binaryImageData = new ImageData(width, height);
    const bd = _binaryImageData.data;
    for (let i = 0; i < width * height; i++) {
      const v = binary[i];
      bd[i * 4] = v;
      bd[i * 4 + 1] = v;
      bd[i * 4 + 2] = v;
      bd[i * 4 + 3] = 255;
    }
  }

  /** Basit Otsu eşikleme (cv yoksa fallback). */
  function _otsuEsikle(gri, binary, width, height) {
    // Histogram
    const hist = new Uint32Array(256);
    for (let i = 0; i < gri.length; i++) hist[gri[i]]++;
    const n = width * height;
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, maxVar = 0, esik = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (!wB) continue;
      const wF = n - wB;
      if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const diff = mB - mF;
      const varBetween = wB * wF * diff * diff;
      if (varBetween > maxVar) { maxVar = varBetween; esik = t; }
    }
    // THRESH_BINARY_INV: koyu piksel (< esik) = 255 (işaretli)
    for (let i = 0; i < gri.length; i++) {
      binary[i] = gri[i] < esik ? 255 : 0;
    }
  }

  /**
   * Binary ImageData'da bir daire alanındaki işaretli (255) piksel sayısını
   * toplam piksel sayısına böler → 0-1 arası doluluk oranı.
   * Test Plus'ın countNonZero yaklaşımının karşılığı.
   *
   * YENİ — YETERSİZ PİKSEL GUARD (C++ "not enough pixels" exception karşılığı):
   * Kırpılan ROI (bubble bölgesi), koordinat kayması yüzünden kısmen veya
   * tamamen kağıt dışına taşarsa `toplam` beklenen değerin çok altına düşer.
   * Bu durumu sessizce 0 döndürerek yutmak yerine _yetersizPikselUyarilari
   * listesine bir kayıt eklenip uyarı olarak yayımlanan açık bir hata
   * objesi üretiliyor. Eşik: beklenen daire alanının (π*r²) en az %20'si
   * görünür olmalı — bu oran ölçeğe göre otomatik kalibre olur, sabit bir
   * piksel sayısı yerine yarıçapa göre hesaplanır.
   *
   * @param {number} cx - baloncuk merkezi X (kanonik canvas pikseli)
   * @param {number} cy - baloncuk merkezi Y
   * @param {number} r  - baloncuk yarıçapı (piksel)
   * @param {string|null} [bubbleId] - teşhis etiketi (ders+soruNo+harf)
   */
  function baloncukDolulukBinary(cx, cy, r, bubbleId) {
    if (!_binaryImageData) return 0;
    const { width, height, data } = _binaryImageData;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(width - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(height - 1, Math.ceil(cy + r));
    if (x1 <= x0 || y1 <= y0) {
      // ROI tamamen sınır dışı — kesin yetersiz piksel
      _yetersizPikselUyarilari.push({ tur: 'yetersizPiksel', bubbleId: bubbleId || '?', toplam: 0, beklenen: Math.round(Math.PI * r * r) });
      return 0;
    }
    let isaretli = 0, toplam = 0;
    const r2 = r * r;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          toplam++;
          if (data[(y * width + x) * 4] > 127) isaretli++;
        }
      }
    }

    // Görünür piksel sayısı beklenen daire alanının %20'sinden azsa uyar.
    const beklenenPiksel = Math.PI * r * r;
    const MIN_GORUNUM_ORANI = 0.20;
    if (toplam < beklenenPiksel * MIN_GORUNUM_ORANI) {
      _yetersizPikselUyarilari.push({
        tur: 'yetersizPiksel',
        bubbleId: bubbleId || '?',
        toplam,
        beklenen: Math.round(beklenenPiksel),
      });
    }

    return toplam > 0 ? isaretli / toplam : 0;
  }

  // NOT: QR kod okuma kaldırıldı — artık hizalama işaretleri doğrudan bulunuyor.

  // ---------------------------------------------------------------------
  // 3) Homografi: 4 nokta DLT (OpenCV'siz, saf JS)
  // ---------------------------------------------------------------------

  /**
   * kaynakNoktalar -> hedefNoktalar eşlemesini sağlayan 3x3 homografi
   * matrisini (h33 = 1 olacak şekilde, 9 elemanlı düz dizi) döndürür.
   * Her ikisi de [{x,y}, {x,y}, {x,y}, {x,y}] formatında TAM 4 nokta olmalı.
   */
  function homografiHesapla(kaynakNoktalar, hedefNoktalar) {
    if (kaynakNoktalar.length !== 4 || hedefNoktalar.length !== 4) {
      throw new Error('homografiHesapla tam olarak 4 nokta çifti bekler.');
    }

    // 8x9 genişletilmiş matris (8 bilinmeyen: h11..h32, h33=1 sabit)
    const A = [];
    const b = [];
    for (let i = 0; i < 4; i++) {
      const { x: xs, y: ys } = kaynakNoktalar[i];
      const { x: xd, y: yd } = hedefNoktalar[i];
      A.push([xs, ys, 1, 0, 0, 0, -xd * xs, -xd * ys]);
      b.push(xd);
      A.push([0, 0, 0, xs, ys, 1, -yd * xs, -yd * ys]);
      b.push(yd);
    }

    const h = gaussEleme(A, b);
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  }

  /** Gauss eleme (kısmi pivotlama ile) — Ax = b sistemini çözer. */
  function gaussEleme(A, b) {
    const n = b.length;
    // genişletilmiş matrisi kopyala
    const M = A.map((satir, i) => [...satir, b[i]]);

    for (let sutun = 0; sutun < n; sutun++) {
      // pivot seç (en büyük mutlak değerli satır)
      let pivotSatir = sutun;
      let enBuyuk = Math.abs(M[sutun][sutun]);
      for (let satir = sutun + 1; satir < n; satir++) {
        if (Math.abs(M[satir][sutun]) > enBuyuk) {
          enBuyuk = Math.abs(M[satir][sutun]);
          pivotSatir = satir;
        }
      }
      if (enBuyuk < 1e-12) {
        throw new Error('Homografi sistemi tekil (dejenere nokta konfigürasyonu).');
      }
      if (pivotSatir !== sutun) {
        [M[sutun], M[pivotSatir]] = [M[pivotSatir], M[sutun]];
      }
      // sütunu sıfırla
      for (let satir = 0; satir < n; satir++) {
        if (satir === sutun) continue;
        const katsayi = M[satir][sutun] / M[sutun][sutun];
        if (katsayi === 0) continue;
        for (let k = sutun; k <= n; k++) {
          M[satir][k] -= katsayi * M[sutun][k];
        }
      }
    }

    return M.map((satir, i) => satir[n] / satir[i]);
  }

  /** Bir (x,y) noktasını homografi H ile dönüştürür. */
  function noktayiDonustur(H, x, y) {
    const payda = H[6] * x + H[7] * y + H[8];
    return {
      x: (H[0] * x + H[1] * y + H[2]) / payda,
      y: (H[3] * x + H[4] * y + H[5]) / payda,
    };
  }

  // ---------------------------------------------------------------------
  // 4) Hizalama işaretlerini fotoğrafta hassas biçimde bulma
  // ---------------------------------------------------------------------

  /**
   * isaretMerkeziBulBlob (aşağıda): pencere içindeki koyu pikselleri BFS ile
   * bağlı bileşenlere ayırıp tahmine EN YAKIN olanın merkezini döndürür.
   * Global sayfa köşeleri ve ders sütunu ızgara köşeleri için kullanılan tek
   *
   * SORUN: isaretMerkeziBul, pencere içindeki TÜM koyu pikselleri tek bir
   * ağırlık merkezinde toplar. Ders sütunu köşe işaretleri komşu sütunun
   * köşe işaretine sadece ~1-3mm mesafede olduğu için (dar sütun arası
   * boşluk), arama penceresi genişse (veya kağıt eğriliği köşeyi biraz
   * kaydırmışsa) İKİ AYRI kare de pencereye girebilir — bu durumda
   * isaretMerkeziBul ikisinin ARASINDA bir noktaya "yapışır" (yanlış
   * merkez), ki bu da sütun homografisini bozup satırların komple
   * yanlış eşleşmesine (gözlemlenen: rastgele görünen soru kaymaları)
   * yol açar.
   *
   * ÇÖZÜM: Pencere içindeki koyu pikselleri TEK bir kütle olarak değil,
   * BFS ile ayrı bağlı bileşenlere (blob) ayır. Sonra (tahminX, tahminY)
   * tahminine EN YAKIN merkezli bileşeni seç — komşu sütunun karesi
   * pencereye kısmen girse bile, kendi karemiz tahmine daha yakın olduğu
   * için doğru bileşen seçilir ve komşunun pikselleri hesaba katılmaz.
   */
  function isaretMerkeziBulBlob(imageData, tahminX, tahminY, yarimPencereX, yarimPencereY) {
    const { width, height, data } = imageData;
    const x0 = Math.max(0, Math.floor(tahminX - yarimPencereX));
    const x1 = Math.min(width - 1, Math.ceil(tahminX + yarimPencereX));
    const y0 = Math.max(0, Math.floor(tahminY - yarimPencereY));
    const y1 = Math.min(height - 1, Math.ceil(tahminY + yarimPencereY));
    if (x1 <= x0 || y1 <= y0) return null;

    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;

    let toplamGri = 0;
    const griler = new Float32Array(w * h);
    for (let ly = 0; ly < h; ly++) {
      for (let lx = 0; lx < w; lx++) {
        const g = grilikDegeri(data, ((y0 + ly) * width + (x0 + lx)) * 4);
        griler[ly * w + lx] = g;
        toplamGri += g;
      }
    }
    const ortalamaGri = toplamGri / (w * h);
    const esik = ortalamaGri * 0.85;

    const ziyaretEdildi = new Uint8Array(w * h);
    let enIyiMerkez = null;
    let enIyiUzaklik = Infinity;

    const kuyrukX = new Int32Array(w * h);
    const kuyrukY = new Int32Array(w * h);

    for (let ly = 0; ly < h; ly++) {
      for (let lx = 0; lx < w; lx++) {
        const idx0 = ly * w + lx;
        if (ziyaretEdildi[idx0] || griler[idx0] >= esik) continue;

        // BFS ile bu bileşenin tüm koyu piksellerini topla
        let baslangic = 0, bitis = 0;
        kuyrukX[bitis] = lx; kuyrukY[bitis] = ly; bitis++;
        ziyaretEdildi[idx0] = 1;

        let boyut = 0;
        let xToplami = 0;
        let yToplami = 0;

        while (baslangic < bitis) {
          const cx = kuyrukX[baslangic];
          const cy = kuyrukY[baslangic];
          baslangic++;
          boyut++;
          xToplami += cx;
          yToplami += cy;

          const komsular = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
          for (const [nx, ny] of komsular) {
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const nIdx = ny * w + nx;
            if (ziyaretEdildi[nIdx] || griler[nIdx] >= esik) continue;
            ziyaretEdildi[nIdx] = 1;
            kuyrukX[bitis] = nx; kuyrukY[bitis] = ny; bitis++;
          }
        }

        // gürültü pikselini/tek bir noktayı eleyecek minimum boyut
        if (boyut < 4) continue;

        const merkezX = x0 + xToplami / boyut;
        const merkezY = y0 + yToplami / boyut;
        const dx = merkezX - tahminX;
        const dy = merkezY - tahminY;
        const uzaklik = Math.sqrt(dx * dx + dy * dy);
        if (uzaklik < enIyiUzaklik) {
          enIyiUzaklik = uzaklik;
          enIyiMerkez = { x: merkezX, y: merkezY };
        }
      }
    }

    return enIyiMerkez;
  }

  /**
   * Bir dizi {x,y} noktasına en küçük kareler yöntemiyle doğru uydurur.
   * xEksenli=true: y = m*x + c (yatay çizgiler — üst/alt kenar, x bağımsız değişken)
   * xEksenli=false: x = m*y + c (dikey çizgiler — sol/sağ kenar, y bağımsız değişken)
   * Uydurma kalitesini (rmse) de döner — gerçek düz bir çizgi değilse (gölge/gürültü
   * noktaları) rmse yüksek çıkar ve çağıran taraf sonucu reddedebilir.
   */
  function enKucukKarelerDogru(noktalar, xEksenli) {
    const n = noktalar.length;
    if (n < 6) return null;
    let sA = 0, sB = 0, sAB = 0, sAA = 0;
    for (const p of noktalar) {
      const a = xEksenli ? p.x : p.y;
      const b = xEksenli ? p.y : p.x;
      sA += a; sB += b; sAB += a * b; sAA += a * a;
    }
    const payda = n * sAA - sA * sA;
    if (Math.abs(payda) < 1e-6) return null;
    const m = (n * sAB - sA * sB) / payda;
    const c = (sB - m * sA) / n;
    let toplamKare = 0;
    for (const p of noktalar) {
      const a = xEksenli ? p.x : p.y;
      const b = xEksenli ? p.y : p.x;
      const tahmin = m * a + c;
      toplamKare += (b - tahmin) ** 2;
    }
    return { m, c, rmse: Math.sqrt(toplamKare / n), n };
  }

  /**
   * Bir kenar şeridi (yatay ya da dikey) içinde, her satır/sütun boyunca en
   * koyu pikselin konumunu bulup örnek noktalar toplar — bu noktalara
   * doğru uydurulacak (bkz. kenarCizgisiIleKoseBul). Sayfa sınırı ince ama
   * SÜREKLİ bir çizgi olduğundan, her sütun/satırda tutarlı bir koyu nokta
   * bulunması beklenir; bulunamayan (çok açık) örnekler atlanır.
   */
  function _koyuSeritOrnekleri(imageData, x0, y0, x1, y1, yatay, ADIM) {
    const { width, data } = imageData;
    const noktalar = [];
    if (yatay) {
      for (let x = x0; x < x1; x += ADIM) {
        let enKoyuY = -1, enKoyuDeger = 256;
        for (let y = y0; y < y1; y++) {
          const g = grilikDegeri(data, (y * width + x) * 4);
          if (g < enKoyuDeger) { enKoyuDeger = g; enKoyuY = y; }
        }
        if (enKoyuY >= 0 && enKoyuDeger < 180) noktalar.push({ x, y: enKoyuY, deger: enKoyuDeger });
      }
    } else {
      for (let y = y0; y < y1; y += ADIM) {
        let enKoyuX = -1, enKoyuDeger = 256;
        for (let x = x0; x < x1; x++) {
          const g = grilikDegeri(data, (y * width + x) * 4);
          if (g < enKoyuDeger) { enKoyuDeger = g; enKoyuX = x; }
        }
        if (enKoyuX >= 0 && enKoyuDeger < 180) noktalar.push({ x: enKoyuX, y, deger: enKoyuDeger });
      }
    }
    return noktalar;
  }

  /**
   * YENİ (çizgi tabanlı) köşe tespiti: izole bir kare/blob aramak yerine,
   * köşeyi oluşturan iki kenar çizgisini (yatay + dikey) ayrı ayrı bulup
   * en küçük kareler doğrusu uydurur, sonra bu iki doğrunun KESİŞİMİNİ
   * köşe noktası olarak döner. Sayfayı baştan sona kat eden düz bir çizgi,
   * gölge/kırışıklık gibi düzensiz şekillerle karışmaz ve onlarca örnek
   * noktadan hesaplandığı için tek bir blob merkezinden çok daha kararlıdır.
   *
   * Sadece köşe karelerini birbirine bağlayan çerçeve çizgisi BASILI olan
   * formlarda (bkz. layoutEngine.js sayfaCercevesiHesapla) çalışır — eski
   * (çizgisiz) formlarda rmse eşiği aşılamayacağından null döner ve çağıran
   * taraf (sayfaKoseleriniAra) otomatik olarak eski blob yöntemine düşer.
   *
   * @param {boolean} ustMu - bu köşe sayfanın ÜST kenarında mı
   * @param {boolean} solMu - bu köşe sayfanın SOL kenarında mı
   */
  function kenarCizgisiIleKoseBul(imageData, x0, y0, x1, y1, ustMu, solMu) {
    const w = x1 - x0, h = y1 - y0;
    if (w < 10 || h < 10) return null;

    const ADIM = 2;
    const BAND = 0.35; // pencerenin dış %35'lik şeridinde ara (çerçeve payı küçük, tam köşede)

    const ySerit0 = ustMu ? y0 : Math.round(y1 - h * BAND);
    const ySerit1 = ustMu ? Math.round(y0 + h * BAND) : y1;
    const yatayNoktalar = _koyuSeritOrnekleri(imageData, x0, ySerit0, x1, ySerit1, true, ADIM);
    const yatayDogru = enKucukKarelerDogru(yatayNoktalar, true);

    const xSerit0 = solMu ? x0 : Math.round(x1 - w * BAND);
    const xSerit1 = solMu ? Math.round(x0 + w * BAND) : x1;
    const dikeyNoktalar = _koyuSeritOrnekleri(imageData, xSerit0, y0, xSerit1, y1, false, ADIM);
    const dikeyDogru = enKucukKarelerDogru(dikeyNoktalar, false);

    // Kalite kontrolü: her iki doğru da yeterli örnekle ve düşük artıkla
    // (gerçekten DÜZ) bulunmuş olmalı — aksi halde bu yöntemi reddet.
    const RMSE_ESIK = 2.2; // px (analiz çözünürlüğünde)
    if (!yatayDogru || !dikeyDogru) return null;
    if (yatayDogru.rmse > RMSE_ESIK || dikeyDogru.rmse > RMSE_ESIK) return null;
    if (yatayDogru.n < w / ADIM * 0.4 || dikeyDogru.n < h / ADIM * 0.4) return null; // çok fazla kayıp örnek varsa güvenme

    // Kesişim: y = m1*x + c1  ile  x = m2*y + c2
    const { m: m1, c: c1 } = yatayDogru;
    const { m: m2, c: c2 } = dikeyDogru;
    const payda = 1 - m1 * m2;
    if (Math.abs(payda) < 1e-6) return null;
    const y = (m1 * c2 + c1) / payda;
    const x = m2 * y + c2;

    if (x < x0 - w * 0.5 || x > x1 + w * 0.5 || y < y0 - h * 0.5 || y > y1 + h * 0.5) return null;

    return { x, y };
  }

  /**
   * Bir dikdörtgen BÖLGE içinde en "kare ve dolu" koyu blob'u arar (QR/kaba
   * tahmin OLMADAN, sıfırdan). Sayfanın 4 köşesindeki hizalama karelerini
   * doğrudan fotoğrafta bulmak için kullanılıyor — bkz. sayfaKoseleriniAra.
   *
   * Sabit bir karanlık eşiği yerine bölgenin KENDİ piksel dağılımının alt
   * yüzdeliği kullanılıyor (aydınlatma koşulundan bağımsız çalışsın diye):
   * fotoğraf parlak/karanlık çekilmiş olsa bile, "bölgenin en koyu ~%12'si"
   * genelde doğru şekilde basılı kareye karşılık geliyor.
   */
  function enBuyukKareBlobuBul(imageData, x0, y0, x1, y1, disKoseX, disKoseY, hassasiyet) {
    const hsAyar = hassasiyet || {};
    const YUZDELIK = hsAyar.yuzdelik ?? 0.3;           // eşik: bölgenin en koyu %kaçı
    const MIN_DOLULUK = hsAyar.minDoluluk ?? 0.45;      // minimum doluluk oranı
    const MIN_ENBOY = hsAyar.minEnboy ?? 0.5;           // min en/boy oranı
    const MAX_ENBOY = hsAyar.maxEnboy ?? 2.0;           // max en/boy oranı
    const MAX_BOYUT_ORAN = hsAyar.maxBoyutOran ?? 0.22; // pencereye oranla üst boyut sınırı
    const { width, height, data } = imageData;
    x0 = Math.max(0, Math.floor(x0));
    y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(width - 1, Math.ceil(x1));
    y1 = Math.min(height - 1, Math.ceil(y1));
    if (x1 <= x0 || y1 <= y0) return null;

    // Hız için 2 pikselde bir örnekle (kareler onlarca piksel çapında
    // olduğundan hassasiyet kaybı önemsiz, ama BFS 4 kat hızlanıyor).
    const ADIM = 2;
    const w = Math.floor((x1 - x0) / ADIM) + 1;
    const h = Math.floor((y1 - y0) / ADIM) + 1;

    const griler = new Float32Array(w * h);
    for (let ly = 0; ly < h; ly++) {
      for (let lx = 0; lx < w; lx++) {
        const px = x0 + lx * ADIM;
        const py = y0 + ly * ADIM;
        griler[ly * w + lx] = grilikDegeri(data, (py * width + px) * 4);
      }
    }

    // Eşik: bölgenin KENDİ piksel dağılımının alt yüzdeliği kullanılıyor
    // (aydınlatma koşulundan bağımsız çalışsın diye) — ama SAF BEYAZ
    // (>=250) pikseller bu hesaptan ÖNCE ELENİYOR. Neden: LGS gibi
    // formlarda alt köşelere yakın büyük bir BOŞ (baskısız) alan olabiliyor
    // — bu durumda pencerenin %12'sinden FAZLASI zaten tam beyaz (255)
    // oluyor, "%12'lik yüzdelik" hesap DEJENERE OLUP tam 255 çıkıyor, ki
    // bu da "<=255" koşulunu HERKES sağlıyor demek — yani flood-fill koca
    // pencereyi TEK BİR BLOB sanıp (gerçek işaret bulunamadan) boyut/şekil
    // filtrelerine takılıyor. Beyazı hesaptan çıkarıp KALAN (gerçekten
    // koyu/gri) piksellerin yüzdeliğini almak, işareti boş bir pencerede
    // bile güvenilir şekilde izole ediyor (gerçek verilerle doğrulandı).
    const BEYAZ_ESIK = 250;
    const koyuGriler = [];
    for (let i = 0; i < griler.length; i++) {
      if (griler[i] < BEYAZ_ESIK) koyuGriler.push(griler[i]);
    }

    let esik;
    if (koyuGriler.length >= 10) {
      koyuGriler.sort((a, b) => a - b);
      esik = koyuGriler[Math.floor(koyuGriler.length * YUZDELIK)];
    } else {
      // Pencerede neredeyse hiç koyu/gri piksel yok — (nadir/aşırı ışıklı
      // fotoğraf) eski yönteme geri düş.
      const siraliGriler = Array.from(griler).sort((a, b) => a - b);
      esik = siraliGriler[Math.floor(siraliGriler.length * Math.min(YUZDELIK, 0.12))];
    }

    const ziyaretEdildi = new Uint8Array(w * h);
    const kuyrukX = new Int32Array(w * h);
    const kuyrukY = new Int32Array(w * h);

    let enIyi = null;
    let enIyiSkor = -Infinity;

    for (let ly = 0; ly < h; ly++) {
      for (let lx = 0; lx < w; lx++) {
        const idx0 = ly * w + lx;
        if (ziyaretEdildi[idx0] || griler[idx0] > esik) continue;

        let bas = 0, bit = 0;
        kuyrukX[bit] = lx; kuyrukY[bit] = ly; bit++;
        ziyaretEdildi[idx0] = 1;

        let boyut = 0, xToplam = 0, yToplam = 0;
        let minX = lx, maxX = lx, minY = ly, maxY = ly;

        while (bas < bit) {
          const cx = kuyrukX[bas], cy = kuyrukY[bas];
          bas++; boyut++;
          xToplam += cx; yToplam += cy;
          if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;

          const komsular = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
          for (const [nx, ny] of komsular) {
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const nIdx = ny * w + nx;
            if (ziyaretEdildi[nIdx] || griler[nIdx] > esik) continue;
            ziyaretEdildi[nIdx] = 1;
            kuyrukX[bit] = nx; kuyrukY[bit] = ny; bit++;
          }
        }

        if (boyut < 6) continue; // gürültü

        const bbGenislik = maxX - minX + 1;
        const bbYukseklik = maxY - minY + 1;
        const dolulukOrani = boyut / (bbGenislik * bbYukseklik);
        const enBoyOrani = bbGenislik / bbYukseklik;

        // Kare-benzeri (1:2 ile 2:1 arası) ve makul dolulukta (>%45) değilse
        // ele (bir kağıt kenarı/gölge/masa çizgisi gibi uzun ince şekilleri
        // dışlamak için) — hizalama kareleri gerçekte ~%90+ dolu çıkar.
        if (enBoyOrani < MIN_ENBOY || enBoyOrani > MAX_ENBOY || dolulukOrani < MIN_DOLULUK) continue;

        // ÜST BOYUT SINIRI (v2 — "arka planı/gölgeyi köşe sanma" hatası
        // düzeltildi): hizalama karesi sayfanın küçük bir detayıdır; arama
        // penceresinin BÜYÜK bir kısmını kaplayan koyu bir blob (masa,
        // sayfa dışı gölge, siyah arka plan) yanlışlıkla "en büyük ve
        // yeterince kare" diye seçilebiliyordu — gerçek fotoğraflarda
        // gözlemlenen (4 köşenin de aynı, ~50-75mm'lik "tutarlılık artığı"
        // vermesi ve TAM homografiye rağmen görüntünün hâlâ çok çarpık
        // çıkması) tam olarak bu hataya işaret ediyor. Gerçek işaret,
        // arama penceresinin en fazla ~%22'si kadar bir alan kaplar;
        // bundan büyük hiçbir blob köşe adayı olamaz.
        const pencereGenislik = x1 - x0;
        const pencereYukseklik = y1 - y0;
        if (bbGenislik * ADIM > pencereGenislik * MAX_BOYUT_ORAN || bbYukseklik * ADIM > pencereYukseklik * MAX_BOYUT_ORAN) continue;

        const merkezXlok = xToplam / boyut;
        const merkezYlok = yToplam / boyut;
        const merkezX = x0 + merkezXlok * ADIM;
        const merkezY = y0 + merkezYlok * ADIM;

        // Skor: köşeye yakınlık ASIL belirleyici (gerçek sayfa köşesi,
        // arama penceresinin dış ucuna yakın olmalı); boyut sadece
        // gürültüyle (çok küçük noktacıklar) doğru işareti ayırt etmek
        // için hafif bir ek ağırlık. Önceki sürümde boyut baskındı, bu da
        // büyük-ama-yanlış blob'ların köşeye yakın küçük-ama-doğru
        // kareye tercih edilmesine yol açabiliyordu.
        const disKoseUzaklik = Math.sqrt((merkezX - disKoseX) ** 2 + (merkezY - disKoseY) ** 2);
        const skor = -disKoseUzaklik + boyut * 0.15;

        if (skor > enIyiSkor) {
          enIyiSkor = skor;
          enIyi = { x: merkezX, y: merkezY };
        }
      }
    }

    return enIyi;
  }

  /**
   * YENİ: Fotoğrafta kağıdın KABA dış sınırını (bounding box) kestirir —
   * ortadan her 4 yöne doğru tarayıp arka plandan (koyu/masaya ait) sayfaya
   * (sürekli parlak/beyaz) geçişi arar. Kesin bir kontur değil, sadece
   * "sayfa muhtemelen burada başlıyor" tahmini — köşe arama pencerelerini
   * fotoğrafın kendi köşeleri yerine buna göre konumlandırmak için yeterli.
   */
  function sayfaSiniriniKestir(imageData) {
    const { width, height, data } = imageData;
    // ADAPTİF EŞİK (Sorun 2 düzeltmesi): sabit 140 yerine histogram'dan
    // %60'ıncı yüzdelik dilim. Beyaz zemin üzerinde beyaz kağıt gibi
    // düşük kontrastlı sahnelerde sabit 140 hem zemini hem kağıdı
    // "parlak" sayıp sınır tespitini bozuyordu. Adaptif eşik,
    // sahnenin kendi parlaklık dağılımına göre kalibre olur.
    const histogram = new Uint32Array(256);
    const toplamPiksel = width * height;
    for (let i = 0; i < data.length; i += 4) {
      histogram[Math.round(grilikDegeri(data, i))]++;
    }
    let kumu = 0;
    const hedef60 = Math.round(toplamPiksel * 0.60);
    let PARLAKLIK_ESIK = 140;
    for (let v = 0; v < 256; v++) {
      kumu += histogram[v];
      if (kumu >= hedef60) { PARLAKLIK_ESIK = Math.max(110, Math.min(200, v)); break; }
    }
    const ARDISIK_GEREKEN = Math.max(8, Math.round(Math.min(width, height) * 0.02));

    function parlakMi(x, y) {
      return grilikDegeri(data, (y * width + x) * 4) >= PARLAKLIK_ESIK;
    }

    // Sol kenar: orta yükseklikte soldan sağa tara.
    const cy = Math.floor(height / 2);
    let sol = 0, art = 0;
    for (let x = 0; x < width; x++) {
      if (parlakMi(x, cy)) { art++; if (art >= ARDISIK_GEREKEN) { sol = x - ARDISIK_GEREKEN + 1; break; } }
      else art = 0;
    }
    let sag = width - 1; art = 0;
    for (let x = width - 1; x >= 0; x--) {
      if (parlakMi(x, cy)) { art++; if (art >= ARDISIK_GEREKEN) { sag = x + ARDISIK_GEREKEN - 1; break; } }
      else art = 0;
    }
    const cx = Math.floor(width / 2);
    let ust = 0; art = 0;
    for (let y = 0; y < height; y++) {
      if (parlakMi(cx, y)) { art++; if (art >= ARDISIK_GEREKEN) { ust = y - ARDISIK_GEREKEN + 1; break; } }
      else art = 0;
    }
    let alt = height - 1; art = 0;
    for (let y = height - 1; y >= 0; y--) {
      if (parlakMi(cx, y)) { art++; if (art >= ARDISIK_GEREKEN) { alt = y + ARDISIK_GEREKEN - 1; break; } }
      else art = 0;
    }

    // Sağlık kontrolü: sınır dejenere çıktıysa (çok küçük/ters) fotoğrafın
    // tamamına geri düş — eski davranış (kağıt kadrajı dolduruyor varsayımı).
    if (sag - sol < width * 0.3 || alt - ust < height * 0.3) {
      return { sol: 0, ust: 0, sag: width, alt: height };
    }
    return { sol, ust, sag, alt };
  }

  /**
   * Sayfanın 4 köşesindeki hizalama karelerini QR'ye/kaba tahmine HİÇ
   * ihtiyaç duymadan, doğrudan fotoğrafın kendi 4 köşe bölgesinde arar.
   * YENİ: arama pencereleri artık fotoğrafın HAM köşelerine değil, önce
   * sayfaSiniriniKestir() ile kabaca bulunan SAYFA sınırına göre
   * konumlandırılıyor — "kağıt kadrajı tam dolduruyor" varsayımı, kenarlarda
   * boşluk bırakılarak (önerilen/doğru) çekilen fotoğraflarda köşe arama
   * pencerelerinin gerçek köşeye hiç ulaşmamasına yol açıyordu (gözlemlenen:
   * bir köşe onlarca mm yanlış konumda bulunuyordu).
   */
  function sayfaKoseleriniAra(imageData, hassasiyet) {
    const { width, height } = imageData;
    const sinir = sayfaSiniriniKestir(imageData);
    const sGenislik = sinir.sag - sinir.sol;
    const sYukseklik = sinir.alt - sinir.ust;
    const ORAN = 0.4; // her köşe arama penceresi, sayfa sınırının bu kadarı

    const pencereX = sGenislik * ORAN;
    const pencereY = sYukseklik * ORAN;

    function koseBul(x0, y0, x1, y1, disKoseX, disKoseY, ustMu, solMu) {
      // 1) Önce çizgi tabanlı yöntemi dene (çerçeveli formlarda çok daha
      //    kararlı) — başarısız olursa (eski/çizgisiz form, ya da düz
      //    çizgi bulunamadı) eski blob yöntemine düş.
      const cizgiSonuc = kenarCizgisiIleKoseBul(imageData, x0, y0, x1, y1, ustMu, solMu);
      if (cizgiSonuc) {
        const DAR_PENCERE = Math.max(20, (x1 - x0) * 0.15);
        const inceSonuc = enBuyukKareBlobuBul(
          imageData,
          cizgiSonuc.x - DAR_PENCERE, cizgiSonuc.y - DAR_PENCERE,
          cizgiSonuc.x + DAR_PENCERE, cizgiSonuc.y + DAR_PENCERE,
          disKoseX, disKoseY, hassasiyet
        );
        if (inceSonuc) return inceSonuc;
        return cizgiSonuc;
      }
      return enBuyukKareBlobuBul(imageData, x0, y0, x1, y1, disKoseX, disKoseY, hassasiyet);
    }

    const solUst = koseBul(sinir.sol, sinir.ust, sinir.sol + pencereX, sinir.ust + pencereY, sinir.sol, sinir.ust, true, true);
    const sagUst = koseBul(sinir.sag - pencereX, sinir.ust, sinir.sag, sinir.ust + pencereY, sinir.sag, sinir.ust, true, false);
    const solAlt = koseBul(sinir.sol, sinir.alt - pencereY, sinir.sol + pencereX, sinir.alt, sinir.sol, sinir.alt, false, true);
    const sagAlt = koseBul(sinir.sag - pencereX, sinir.alt - pencereY, sinir.sag, sinir.alt, sinir.sag, sinir.alt, false, false);

    return { solUst, sagUst, solAlt, sagAlt };
  }



  function yerelNokta(form, globalX, globalY) {
    return { x: globalX - form.bolge.x, y: globalY - form.bolge.y };
  }

  function hizalamaMerkezleriMM(form) {
    return form.hizalamaIsaretleri.map((m) => ({
      konum: m.konum,
      nokta: yerelNokta(form, m.x + m.boyut / 2, m.y + m.boyut / 2),
    }));
  }

  // ---------------------------------------------------------------------
  // 6) Perspektif düzeltme (dewarp): mm -> canonical piksel -> foto pikseli
  // ---------------------------------------------------------------------

  /**
   * Fotoğraftaki formu, form.bolge boyutunda ve `ppmm` çözünürlüğünde
   * DÜZ (perspektifsiz) bir canvas'a çizer. Dönen nesne, ayrıca kullanılan
   * homografiyi (mmCanonical -> fotoPiksel) de içerir; böylece hata
   * ayıklarken/görselleştirirken tekrar kullanılabilir.
   */
  /**
   * 3 nokta çiftinden AFİN dönüşüm (döndürme+ölçek+kayma, perspektif YOK)
   * kurar ve homografiHesapla ile AYNI 3x3 matris formatında döndürür
   * (alt satır [0,0,1] — yani noktayiDonustur'daki bölme her zaman 1'dir).
   * Tam 4 nokta yerine 3 nokta yeterli çünkü afin dönüşümün 6 serbestlik
   * derecesi var (homografinin 8'ine karşı).
   */
  function afinHesapla(kaynakNoktalar, hedefNoktalar) {
    const A = kaynakNoktalar.map((n) => [n.x, n.y, 1]);
    const bx = hedefNoktalar.map((n) => n.x);
    const by = hedefNoktalar.map((n) => n.y);
    const [a, b, c] = gaussEleme(A, bx);
    const [d, e, f] = gaussEleme(A.map((r) => [...r]), by);
    return [a, b, c, d, e, f, 0, 0, 1];
  }

  function bilinearOrnekle(imageData, x, y) {
    const { width, height, data } = imageData;
    if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) return null;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const dx = x - x0;
    const dy = y - y0;
    const i00 = (y0 * width + x0) * 4;
    const i10 = (y0 * width + x0 + 1) * 4;
    const i01 = ((y0 + 1) * width + x0) * 4;
    const i11 = ((y0 + 1) * width + x0 + 1) * 4;
    const sonuc = [0, 0, 0, 255];
    for (let ch = 0; ch < 3; ch++) {
      sonuc[ch] =
        data[i00 + ch] * (1 - dx) * (1 - dy) +
        data[i10 + ch] * dx * (1 - dy) +
        data[i01 + ch] * (1 - dx) * dy +
        data[i11 + ch] * dx * dy;
    }
    return sonuc;
  }

  /** Kanonik (mm*ppmm) uzayda düzleştirilmiş bir canvas üretir. */
  // KÖK NEDEN SAĞLAMLAŞTIRMASI (Çözüm Planı, Ağustos 2026): canonical tuval
  // boyutu (form.bolge.width/height × ppmm) DOĞRUSAL büyüyor; formuOtomatikDuzlestir
  // artık daha isabetli bir gercekPpmm kestiriyor ve bu bazen (yüksek
  // çözünürlüklü/yakından çekilmiş fotoğraflarda) 15-20px/mm gibi yüksek
  // çıkabiliyor — A4 bir form için bu, onlarca milyon pikselli bir tuval
  // demek, aşağıdaki piksel-piksel homografi örneklemesi (iç içe for) o
  // durumda saniyelerce sürüyor. Baloncuk okumak için birkaç px/mm zaten
  // yeterli olduğundan, toplam piksel sayısına bir üst sınır konuyor —
  // aşılırsa ppmm orantılı küçültülüyor (en/boy oranı KORUNUR).
  const MAKS_TUVAL_PIKSEL = 6_000_000; // ~A4'te ~10px/mm karşılığı

  function duzCanvasUret(fotoImageData, H, form, ppmm) {
    let kullanilanPpmm = ppmm;
    const tahminiPiksel = form.bolge.width * ppmm * form.bolge.height * ppmm;
    if (tahminiPiksel > MAKS_TUVAL_PIKSEL) {
      kullanilanPpmm = ppmm * Math.sqrt(MAKS_TUVAL_PIKSEL / tahminiPiksel);
    }
    const cGenislik = Math.max(1, Math.round(form.bolge.width * kullanilanPpmm));
    const cYukseklik = Math.max(1, Math.round(form.bolge.height * kullanilanPpmm));

    // YENİ (teşhis): H'nin kanonik tuvalin 4 köşesini GERÇEKTEN doğru
    // fotoğraf konumuna gönderip göndermediğini doğrudan test ediyoruz.
    // Matematiksel olarak bu, hassasKaynak/hassasHedef'e TAM UYMALI
    // (H onlardan kuruldu) — uymuyorsa bu, homografiHesapla/gaussEleme
    // içinde SAYISAL bir hesap hatasının kesin kanıtıdır.
    const testKoseleri = [
      { ad: 'sol-ust(0,0)', x: 0, y: 0 },
      { ad: 'sag-ust(gen,0)', x: cGenislik, y: 0 },
      { ad: 'sol-alt(0,yuk)', x: 0, y: cYukseklik },
      { ad: 'sag-alt(gen,yuk)', x: cGenislik, y: cYukseklik },
    ];
    const hTestSonucu = testKoseleri.map((k) => {
      const p = noktayiDonustur(H, k.x, k.y);
      return k.ad + '->foto(' + p.x.toFixed(0) + ',' + p.y.toFixed(0) + ')';
    }).join(', ');
    console.log('[OMR TEŞHİS] H köşe testi:', hTestSonucu, '| H katsayıları:', H.map(v => v.toFixed(4)).join(','));
    _sonHTestSonucu = hTestSonucu;
    _sonHKatsayilari = H.map(v => Number(v.toFixed(4)));

    const canvas = document.createElement('canvas');
    canvas.width = cGenislik;
    canvas.height = cYukseklik;
    const ctx = canvas.getContext('2d');
    const cImageData = ctx.createImageData(cGenislik, cYukseklik);

    for (let cy = 0; cy < cYukseklik; cy++) {
      for (let cx = 0; cx < cGenislik; cx++) {
        const foto = noktayiDonustur(H, cx, cy);
        const renk = bilinearOrnekle(fotoImageData, foto.x, foto.y);
        const hedefIndex = (cy * cGenislik + cx) * 4;
        if (renk) {
          cImageData.data[hedefIndex] = renk[0];
          cImageData.data[hedefIndex + 1] = renk[1];
          cImageData.data[hedefIndex + 2] = renk[2];
          cImageData.data[hedefIndex + 3] = 255;
        } else {
          // fotoğraf sınırları dışına düşen alan: beyaz doldur
          cImageData.data[hedefIndex] = 255;
          cImageData.data[hedefIndex + 1] = 255;
          cImageData.data[hedefIndex + 2] = 255;
          cImageData.data[hedefIndex + 3] = 255;
        }
      }
    }

    ctx.putImageData(cImageData, 0, 0);
    return { canvas, imageData: cImageData, ppmmKullanilan: kullanilanPpmm };
  }

  // ---------------------------------------------------------------------
  // 7) layoutEngine.js çıktısından düz soru/şık listesi çıkarma
  // ---------------------------------------------------------------------

  function tumSorulariTopla(form) {
    const sorular = [];
    if (form.izgara) {
      for (const soru of form.izgara.sorular) {
        sorular.push({ ders: null, soruNo: soru.soruNo, sikler: soru.sikler });
      }
    } else if (form.bolumler) {
      for (const bolum of form.bolumler) {
        for (const ders of bolum.dersSutunlari) {
          for (const soru of ders.sorular) {
            sorular.push({ ders: ders.dersAdi, soruNo: soru.soruNo, sikler: soru.sikler });
          }
        }
      }
    }
    return sorular;
  }

  // ---------------------------------------------------------------------
  // 7.5) Ders sütunu bazlı YEREL hizalama düzeltmesi (kutu/çerçeve tabanlı)
  // ---------------------------------------------------------------------
  //
  // SORUN: formuDuzlestir'deki tek, sayfa-geneli homografi (4 köşeden) kağıt
  // TAM DÜZLEMSEL olduğunda doğru çalışır. Elde tutularak fotoğraflanan
  // kağıt genelde BÖLGEYE GÖRE FARKLI derecede eğrilir/bombeleşir — bu
  // düzlemsel olmayan bir bozulmadır ve tek homografiyle asla tam
  // düzeltilemez. Gözlemlenen belirti: bazı ders sütunlarında (ör.
  // Matematik) satırlar tutarlı biçimde 1-2 satır kaymış okunuyor, komşu
  // sütunlarda (ör. Türkçe) hiç kaymamış — yani kayma sayfa genelinde SABİT
  // değil, sütuna göre değişiyor.
  //
  // ÇÖZÜM (v3 — TEK genel ızgara çerçevesi): v2'de her ders sütununun kendi
  // 4 köşesi vardı, ama sütunlar arası boşluk sadece ~3mm olduğu için komşu
  // sütunun köşesiyle sürekli karışıyordu (pencere ne kadar daraltılsa da).
  // Bunun yerine artık TEK bir çerçeve var: TÜM ders sütunlarını (sözel +
  // sayısal) saran, sayfanın 4 köşesindeki hizalama işaretleriyle AYNI
  // kanıtlanmış mantığı kullanan bir dikdörtgen (bkz. layoutEngine.js:
  // genelIzgaraCercevesiHesapla). Bu köşeler izole olduğu için (en yakın
  // başka bir köşe yok) komşu karışması riski tamamen ortadan kalkıyor;
  // üstelik global sayfa köşelerinden daha YAKIN olduğu için (header/QR
  // alanını atlıyor) daha isabetli bir düzeltme sağlıyor.
  //
  // Bu artık TÜM sorular için TEK bir homografidir (ders bazlı değil).
  // Kağıdın bölgeye göre değişen KALAN ince eğriliği ise satır bazlı
  // çember-kilitleme adımıyla (bkz. satirIcinDikeyKaymaBul) telafi ediliyor.

  const YEREL_ARAMA_YARIM_PENCERE_MM = 18; // (12'den 18'e büyütüldü — bkz. formuDuzlestir'deki benzer not)

  /**
   * TÜM ders sütunlarını saran genel ızgara çerçevesinin 4 köşesini
   * kanonik canvas üzerinde arar ve bulunursa TEK bir homografi kurar.
   * Bulunamazsa null döner (sayfa-geneli homografiye sessizce geri düşülür).
   * dönen = { H, kutuGercek: {sol,sag,ust,alt} } (kutuGercek sadece
   * debug/görselleştirme için bulunan 4 noktanın sınırlayan kutusudur).
   */
  function genelDuzeltmeHesapla(cImageData, form, ppmm) {
    const gc = form.genelIzgaraCercevesi;
    if (!gc || !gc.koseler) return null;

    const yarimPencerePx = YEREL_ARAMA_YARIM_PENCERE_MM * ppmm;
    const koseAdlari = ['solUst', 'sagUst', 'solAlt', 'sagAlt'];
    const kaynakNoktalar = []; // beklenen kanonik piksel (mm * ppmm)
    const hedefNoktalar = []; // kanonik canvas'ta GERÇEK bulunan piksel

    for (const ad of koseAdlari) {
      const koseMM = yerelNokta(form, gc.koseler[ad].x, gc.koseler[ad].y);
      const beklenenPx = { x: koseMM.x * ppmm, y: koseMM.y * ppmm };
      const gercekPx = isaretMerkeziBulBlob(
        cImageData, beklenenPx.x, beklenenPx.y, yarimPencerePx, yarimPencerePx
      );
      if (!gercekPx) return null;
      kaynakNoktalar.push(beklenenPx);
      hedefNoktalar.push(gercekPx);
    }

    let H;
    try {
      H = homografiHesapla(kaynakNoktalar, hedefNoktalar);
    } catch (e) {
      return null;
    }

    // GÜVENLİK KONTROLÜ: bu adımın amacı sadece KÜÇÜK, yerel bir düzeltme
    // yapmak (kağıdın kalan hafif eğriliği) — global homografi zaten kaba
    // hizalamayı yapmış durumda. Eğer kurulan H, ızgaranın İÇ noktalarını
    // (4 kenarın orta noktaları + merkez) olduğu yerden ONLARCA mm öteye
    // taşıyorsa, bu "küçük düzeltme" değil, köşelerden biri yanlış
    // bulunduğu için ortaya çıkan SAÇMA bir dönüşümdür — reddedilip
    // düzeltmesiz (null) dönülür.
    const KUTU_MERKEZ_ESIK_MM = 15;
    const kutu = { sol: Math.min(...kaynakNoktalar.map((n) => n.x)), sag: Math.max(...kaynakNoktalar.map((n) => n.x)),
      ust: Math.min(...kaynakNoktalar.map((n) => n.y)), alt: Math.max(...kaynakNoktalar.map((n) => n.y)) };
    const icNoktalar = [
      { x: (kutu.sol + kutu.sag) / 2, y: kutu.ust },
      { x: (kutu.sol + kutu.sag) / 2, y: kutu.alt },
      { x: kutu.sol, y: (kutu.ust + kutu.alt) / 2 },
      { x: kutu.sag, y: (kutu.ust + kutu.alt) / 2 },
      { x: (kutu.sol + kutu.sag) / 2, y: (kutu.ust + kutu.alt) / 2 },
    ];
    let enBuyukKaymaMM = 0;
    for (const nokta of icNoktalar) {
      const donusmus = noktayiDonustur(H, nokta.x, nokta.y);
      const dx = donusmus.x - nokta.x;
      const dy = donusmus.y - nokta.y;
      const kaymaMM = Math.sqrt(dx * dx + dy * dy) / ppmm;
      if (kaymaMM > enBuyukKaymaMM) enBuyukKaymaMM = kaymaMM;
    }
    if (enBuyukKaymaMM > KUTU_MERKEZ_ESIK_MM) return null;

    const xler = hedefNoktalar.map((n) => n.x);
    const yler = hedefNoktalar.map((n) => n.y);
    return {
      H,
      kutuGercek: { sol: Math.min(...xler), sag: Math.max(...xler), ust: Math.min(...yler), alt: Math.max(...yler) },
    };
  }

  /**
   * Bir (px, py) kanonik noktasına genel ızgara düzeltmesini uygular.
   * Düzeltme yoksa (4 köşe bulunamadıysa) noktayı DEĞİŞTİRMEDEN döndürür —
   * yani sessizce sayfa-geneli homografiye (mevcut davranış) geri düşülmüş
   * olur.
   */
  function yerelDuzeltmeUygula(duzeltme, px, py) {
    if (!duzeltme) return { x: px, y: py };
    return noktayiDonustur(duzeltme.H, px, py);
  }

  // ---------------------------------------------------------------------
  // 8) Baloncuk (bubble) karanlık oranı ölçümü
  // ---------------------------------------------------------------------

  function baloncukKaranlikOrani(cImageData, cx, cy, r) {
    const { width, height, data } = cImageData;

    // KÖK NEDEN DÜZELTMESİ v2 (gerçek radyal koyuluk profili ölçümüyle
    // doğrulandı — bkz. radyalKoyulukProfili teşhis çıktısı, Ağustos 2026):
    // önceki deneme (icYaricap=0.72r, merkezden 0.42r'ye kadar KESEREK
    // dışarıda halka örnekleme) YANLIŞ bölgeyi hedefliyordu. Gerçek ölçüm
    // gösterdi ki: basılı harfin/rakamın mürekkebi TAM ORTADA değil,
    // 0.4r-0.7r aralığında bir halka oluşturuyor (harfin kendi gövde/kavis
    // şekli yüzünden) — tam da eski kodun örneklediği bölge. Buna karşılık
    // baloncuğun EN MERKEZİ (0-0.35r) harften bağımsız olarak HER ZAMAN
    // tertemiz kalıyor (ölçülen: işaretsiz baloncuklarda 0.01-0.05), çünkü
    // hiçbir harf glifi tam merkeze mürekkep bırakmıyor — ama öğrenci
    // baloncuğu doldurduğunda bu merkez de İSTİSNASIZ tam doygun oluyor
    // (ölçülen: işaretli baloncuklarda 1.000). Yani en güvenilir ayırt
    // edici sinyal EN KÜÇÜK merkez disktir, halka değil.
    const icYaricap = r * 0.35;

    const x0 = Math.max(0, Math.floor(cx - icYaricap));
    const x1 = Math.min(width - 1, Math.ceil(cx + icYaricap));
    const y0 = Math.max(0, Math.floor(cy - icYaricap));
    const y1 = Math.min(height - 1, Math.ceil(cy + icYaricap));
    if (x1 <= x0 || y1 <= y0) return 0;

    let toplam = 0;
    let sayac = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= icYaricap * icYaricap) {
          toplam += isaretKoyulukPuani(data, (y * width + x) * 4);
          sayac++;
        }
      }
    }
    return sayac > 0 ? toplam / sayac : 0;
  }

  /**
   * baloncukKaranlikOrani'nin, KÜÇÜK YEREL KAYMALARA karşı toleranslı sürümü.
   *
   * SORUN: Sayfa geneli tek bir homografi (bkz. formuOtomatikDuzlestir), kağıt
   * MATEMATİKSEL OLARAK tam düz (planar) olduğu varsayımıyla çalışır. Elde
   * tutularak fotoğraflanan gerçek kağıt genelde hafifçe kavislidir/bombelidir
   * (özellikle kenarlarda) — bu, global homografi ile düzeltilemeyen, sayfa
   * üzerinde konuma göre değişen KÜÇÜK (bir bubble yarıçapının bir kısmı
   * kadar) yerel kaymalara yol açar. Sonuç: bazı baloncuklar tam isabetle
   * okunurken (örn. sayfa ortasına yakın olanlar), bazıları birkaç piksel
   * kayıklıkla "boş" okunuyordu — halbuki fotoğrafta gözle net biçimde dolu.
   *
   * ÇÖZÜM: Tahmini merkezin (cx, cy) etrafında küçük bir pencerede (aramaOrani
   * * r kadar, komşu şıkka/satıra taşmayacak kadar küçük tutularak) tarama
   * yapıp en yüksek karanlık oranını veren konumu kullanıyoruz — bir nevi
   * "en yakın koyu noktaya yapış" (snap-to-nearest-dark-blob) mantığı.
   */
  /**
   * YENİ (kök neden düzeltmesi — bkz. PyImageSearch/açık kaynak OMR
   * projelerinin standart yöntemi: "baloncuğun OLMASI GEREKEN yerine
   * güvenme, GERÇEKTE nerede olduğunu bul"): eski arama penceresi
   * (aramaOrani=0.35, yani sadece ±0.35×yarıçap) mm-projeksiyonunun
   * neredeyse piksel-hassasiyetinde doğru olduğunu VARSAYIYORDU — ki bu
   * varsayım (gerçek fotoğraflarda ölçülen homografi hatalarına göre)
   * çoğu zaman geçersiz. Komşu baloncuğa (yatay aralık = 1.8×yarıçap)
   * karışma riski olmadan GÜVENLE arayabileceğimiz azami yarıçap ~1.8r'dir
   * — bu yüzden pencere 0.35r'den 1.3r'ye çıkarıldı (komşuya değmeden
   * kalan en geniş güvenli alan). Böylece baloncuk, ızgara varsayımından
   * onlarca piksel kaymış olsa bile gerçekten bulunabiliyor.
   */
  function baloncukKaranlikOraniYerelArama(cImageData, cx, cy, r, aramaOrani = 1.3, adimOrani = 0.12, aramaOraniX = null) {
    // aramaOraniX: yatay eksen için ayrı arama yarıçapı katsayısı.
    // null ise aramaOrani kullanılır (eski davranış).
    // Bu parametre özellikle yatay perspektif kayması olan sütunlar için
    // aramaOrani'nden bağımsız olarak yatay toleransı artırmak amacıyla eklendi.
    const aramaMesafesiY = r * aramaOrani;
    const aramaMesafesiX = r * (aramaOraniX !== null ? aramaOraniX : aramaOrani);
    const adim = Math.max(1, r * adimOrani);

    let enIyiOran = -1;
    let enIyiDx = 0;
    let enIyiDy = 0;

    // Binary görüntü varsa (adaptifEsikle çağrıldıysa) countNonZero yöntemi
    // kullan — Test Plus yaklaşımı, renk/ışık bağımsız.
    const binaryKullan = !!_binaryImageData;

    for (let dy = -aramaMesafesiY; dy <= aramaMesafesiY; dy += adim) {
      for (let dx = -aramaMesafesiX; dx <= aramaMesafesiX; dx += adim) {
        const oran = binaryKullan
          ? baloncukDolulukBinary(cx + dx, cy + dy, r)
          : baloncukKaranlikOrani(cImageData, cx + dx, cy + dy, r);
        if (oran > enIyiOran) {
          enIyiOran = oran;
          enIyiDx = dx;
          enIyiDy = dy;
        }
      }
    }

    // KÖK SEBEP DÜZELTMESİ (Ağustos 2026 — Matematik #19 ile KESİNLEŞTİ):
    // TUR 12-13'te bu düzeltme riskli bulunup ERTELENMİŞTİ çünkü gerçek
    // işaretli bir soru (Fen #18) da benzer yerelDy değeri veriyordu, aynı
    // eşik ikisini de etkileyebilirdi. O turda EKLENEN hamOran ölçümü
    // (kaydırmasız, dx=dy=0 noktasındaki GERÇEK oran) artık bu ayrımı
    // GÜVENLE yapmayı sağlıyor: Matematik #19 guven=0.496 (B'ye kilitli)
    // AMA hamOran=0.250 (KARANLIK_ESIK'in altında, yani #19 KENDİ
    // konumunda gerçekten zayıf/boş) — kanıtlanmış sahte pozitif.
    // KURAL: en iyi sonuç duvara dayanmışsa (|dx| veya |dy| >= %65) VE
    // kaydırmasız ham oran mutlak eşiğin altındaysa, bu GÜVENLE "duvara
    // toslama" sayılır ve (dx=0,dy=0) ham ölçüme dönülür — gerçek işaretli
    // sorular (hamOran zaten yüksek olduğu için) bu kuraldan ETKİLENMEZ.
    // Duvara-toslama koruması: SADECE DİKEY EKSENde uygula.
    // Dikey komşu satır mesafesi 4r — duvara dayanmak komşu satırın
    // sinyaline çekilme belirtisi olabilir.
    // Yatay eksen için bu koruma UYGULANMAZ: komşu şık 3.5r uzakta,
    // aramaOraniX=0.8 ile maksimum 0.8r aranıyor — çakışma matematiksel
    // olarak imkansız, duvara-toslama yanlış pozitif üretir.
    if (Math.abs(enIyiDy) >= aramaMesafesiY * 0.65) {
      const hamOran = binaryKullan
        ? baloncukDolulukBinary(cx, cy, r)
        : baloncukKaranlikOrani(cImageData, cx, cy, r);
      _sonYerelAramaHamOran = hamOran;
      if (hamOran < _koyulukEsikGetir()) {
        return { oran: hamOran, dx: 0, dy: 0 };
      }
    } else {
      _sonYerelAramaHamOran = null;
    }

    return { oran: enIyiOran, dx: enIyiDx, dy: enIyiDy };
  }

  /**
   * Bir baloncuğun ÇEMBER (dış çizgi) halkasındaki ortalama koyuluk.
   *
   * baloncukKaranlikOrani'nden FARKI: o iç dolguyu ölçer (dolu mu boş mu
   * anlamak için) — bu ise SADECE dıştaki basılı çemberi ölçer. Basılı
   * çember, öğrenci hiçbir şeyi işaretlememiş olsa BİLE her zaman kağıtta
   * mevcuttur (dolu baloncukta da iç dolgudan taşıp bu bölgeyi de
   * karartır). Yani bu sinyal, ÖĞRENCİNİN CEVABINDAN BAĞIMSIZ olarak
   * "burada gerçekten bir baloncuk sırası var mı" sorusuna cevap verir —
   * satırların GERÇEK dikey konumunu kilitlemek için homografiden çok
   * daha güvenilir bir referans, çünkü basılı şablonun kendisine dayanır.
   */
  /**
   * DÜZELTME (kök neden — "köşeler doğru seçilse bile satırlar hâlâ yanlış
   * okunuyor" hatası, Ağustos 2026): bu fonksiyon önceden SADECE baloncuğun
   * dış çizgi bandını (0.78r-1.05r halka) örnekliyordu. Ama basılan çember
   * çok ince (0.2mm) ve soluk (açık gri [160,160,160] — bkz.
   * pdfFormGenerator.js:BALONCUK_KALINLIK/BALONCUK_RENK), bu da fotoğraf
   * çözünürlüğü/ışığa göre bu ince bandın gürültüye karışıp satır-kilitleme
   * adımının YANLIŞ satıra kilitlenmesine yol açıyordu — kilitlenince o
   * satırdaki TÜM şıklar birden kayıyor (gözlemlenen: elle seçilen köşeler
   * doğru olsa bile okuma hâlâ bozuk).
   *
   * ÇÖZÜM: dış çizgiye değil, baloncuğun NEREDEYSE TAMAMINA (0-0.9r —
   * çember + harf + varsa öğrenci işareti dahil) bakılıyor. Boş bir
   * baloncuk bile (gri çember + harf glifi yüzünden) etrafındaki boş beyaz
   * kağıttan HER ZAMAN belirgin biçimde daha koyudur — bu, "burada bir
   * baloncuk sırası var" sorusuna, ince tek bir çizgi bandından çok daha
   * gürültüye dayanıklı cevap verir.
   */
  /**
   * Bir baloncuğun dış-çember bandındaki ortalama KARANLIĞI — ama
   * `isaretKoyulukPuani` yerine düz grilik kullanır (renk cezası YOK).
   *
   * NEDEN: `baloncukCemberSinyali` ve `isaretKoyulukPuani`, renkli mürekkeple
   * basılı çemberleri (sarı/kırmızı baskı) doygunluk cezasıyla bastırıyor —
   * bu cevap okumada doğru ama burada (basılı çemberin KENDİ konumunu bulmak
   * için) yanlış: rengi ne olursa olsun basılı çember etrafındaki pikseller
   * çevre kağıttan belirgin biçimde daha koyu. Renk cezası olmadan bu kontrast
   * çok daha güçlü çıkar ve `sutunIcinYatayOffsetBul`'un zirveyi doğru bulma
   * şansı artar.
   *
   * Sadece `sutunIcinYatayOffsetBul` tarafından kullanılır.
   */
  function _baloncukHamGriCemberSinyali(cImageData, cx, cy, r) {
    const { width, height, data } = cImageData;
    // Sadece dış halka: 0.65r – 1.05r arası (basılı çember çizgisi burada)
    const icR2 = (r * 0.65) * (r * 0.65);
    const disR2 = (r * 1.05) * (r * 1.05);
    const x0 = Math.max(0, Math.floor(cx - r * 1.05));
    const x1 = Math.min(width - 1, Math.ceil(cx + r * 1.05));
    const y0 = Math.max(0, Math.floor(cy - r * 1.05));
    const y1 = Math.min(height - 1, Math.ceil(cy + r * 1.05));
    if (x1 <= x0 || y1 <= y0) return 0;
    let toplam = 0, sayac = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= icR2 && d2 <= disR2) {
          // Düz grilik — renk körü, hem sarı/kırmızı hem siyah basılı çemberi eşit görür
          toplam += 1 - grilikDegeri(data, (y * width + x) * 4) / 255;
          sayac++;
        }
      }
    }
    return sayac > 0 ? toplam / sayac : 0;
  }

  function baloncukCemberSinyali(cImageData, cx, cy, r) {
    const { width, height, data } = cImageData;
    const disYaricap = r * 0.9;
    const x0 = Math.max(0, Math.floor(cx - disYaricap));
    const x1 = Math.min(width - 1, Math.ceil(cx + disYaricap));
    const y0 = Math.max(0, Math.floor(cy - disYaricap));
    const y1 = Math.min(height - 1, Math.ceil(cy + disYaricap));
    if (x1 <= x0 || y1 <= y0) return 0;

    let toplam = 0;
    let sayac = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= disYaricap * disYaricap) {
          toplam += isaretKoyulukPuani(data, (y * width + x) * 4);
          sayac++;
        }
      }
    }
    return sayac > 0 ? toplam / sayac : 0;
  }

  /**
   * BİR SORUNUN 4 (veya N) şıkkı için, TÜMÜNÜ BİRLİKTE aynı miktarda dikey
   * kaydırarak, basılı çember sinyalinin (baloncukCemberSinyali) TOPLAMINI
   * en üst düzeye çıkaran dy'yi bulur.
   *
   * NEDEN: Sütun homografisi (bulunsa bile) kağıdın o TAM satırdaki yerel
   * bombeleşmesini birebir yakalayamayabilir — özellikle kayma birkaç
   * satır pitch'i kadar büyükse (gözlemlenen: cevaplar sürekli "boş"
   * okunuyor ama fotoğrafta gözle net dolu). Satırın 4 şıkkı YATAY olarak
   * yan yana, aynı y'de olduğu için, DOĞRU y'de basılı 4 çemberin TOPLAM
   * sinyali güçlü bir tepe (peak) oluşturur — satırlar arası boşluk
   * (baloncukCap kadar) TAMAMEN boş kağıt olduğundan, yanlış y'lerde bu
   * toplam belirgin biçimde düşüktür. Bu, öğrencinin hangi şıkkı
   * işaretlediğinden TAMAMEN bağımsız bir referans olduğu için, homografi
   * ne kadar yanlış olursa olsun satırı doğru yere "kilitleyebilir".
   */
  function satirIcinDikeyKaymaBul(cImageData, sikler, satirAraligiPx, ilkSoruMu, sonSoruMu) {
    // ÖNEMLİ: bu aralık satırAraligi'nin YARISINI GEÇMEMELİ — geçerse arama
    // penceresi komşu satırın kendi çemberler tepesini de kapsar ve (özellikle
    // o komşu satırda dolu/koyu bir baloncuk varsa) oraya "atlayabilir".
    // Gözlemlenen belirti tam olarak buydu: pek çok ardışık soru aynı (ve
    // güçlü) cevaba kilitleniyordu — çünkü geniş pencereler (eskiden 1.6x)
    // birbirine çok örtüşüyor ve hepsi TEK bir uzaktaki güçlü tepeye
    // yöneliyordu. Artık TEK genel çerçeve homografisi (bkz.
    // genelDuzeltmeHesapla) satırı zaten birkaç piksele kadar doğru
    // konumlandırdığından, bu adımın sadece KALAN küçük/ince eğriliği
    // (yarım satırdan az) telafi etmesi yeterli ve güvenli.
    //
    // NOT: genelDuzeltmeHesapla devre dışıysa (bkz. formuOkuElleKoseli),
    // bu varsayım artık geçerli değil ve bir sütunun İLK sorusu için
    // YUKARI (sütun başlığına), SON sorusu için AŞAĞI (çerçeve kenarına)
    // doğru arama, o komşu öğeyi yanlışlıkla "koyu baloncuk" sanabiliyor
    // (gözlemlenen "çoklu" hatası). Bunu önlemek için ilk soruda sadece
    // aşağı, son soruda sadece yukarı doğru aranır.
    // YENİ: 0.4 -> 0.47 (güvenli sınır olan 0.5'e daha yakın — bkz. genelDuzeltme
    // artık çoğu durumda bulunamıyor/atlanıyor, bu adımın TEK BAŞINA satırı
    // doğru yere kilitlemesi gerekiyor, eskisi gibi "zaten yaklaşık doğru"
    // varsayımına güvenemiyor).
    // YENİ (Ağustos 2026 — İKİNCİ AYAR): önceki tur aramaOrani'ni 1.3'ten
    // 0.5'e düşürmüştü (cevaplariCikar çağrısı, bkz. dosya sonu notları),
    // bu komşu satıra kilitlenmeyi AZALTTI ama TAMAMEN ORTADAN KALDIRMADI —
    // Sedat'ın gerçek teşhis verisi (İNKILAP #2-3-4, #6-7-8 zincirleri hâlâ
    // aynı şıkka kilitleniyordu, sadece komşunun guven değeri düştü: 0.909→
    // 0.518, 0.979→0.689) bunu kanıtladı. Matematiksel sebep: 0.47*4r=1.88r
    // (bu satır-kilitleme) + 0.5r (yerel arama) = 2.38r toplam kayma, komşu
    // satıra kalan mesafe 4r-2.38r=1.62r HÂLÂ disk çapı toplamından (0.9r+
    // 0.9r=1.8r) küçüktü — az bir örtüşme payı (0.18r) kalıyordu.
    // 0.47->0.40 ile toplam kayma 2.10r'e, kalan mesafe 1.90r'e çıkıyor —
    // artık disk çapını (1.8r) aşıyor, örtüşme matematiksel olarak imkansız.
    // Satırın hâlâ kendi yarısının %40'ı (1.6r) kadar eğiklik/perspektif
    // hatası telafi edebilmesi, gerçek kağıt taramalarında yeterli bir pay.
    const yarim = satirAraligiPx * 0.40;
    const adim = Math.max(1, satirAraligiPx * 0.04);
    const dyBaslangic = ilkSoruMu ? 0 : -yarim;
    const dyBitis = sonSoruMu ? 0 : yarim;

    let enIyiDy = 0;
    let enIyiSkor = -Infinity;
    for (let dy = dyBaslangic; dy <= dyBitis; dy += adim) {
      let skor = 0;
      for (const s of sikler) skor += baloncukCemberSinyali(cImageData, s.px, s.py + dy, s.pr);
      if (skor > enIyiSkor) { enIyiSkor = skor; enIyiDy = dy; }
    }

    // KÖK SEBEP DÜZELTMESİ (Ağustos 2026 — gerçek satirDy teşhis verisiyle
    // kanıtlandı): boş bir satırda (öğrenci hiçbir şey işaretlememişse)
    // baloncukCemberSinyali skoru dy arttıkça MONOTON ARTIYOR — çünkü her
    // adımda komşu satırdaki GERÇEK işarete biraz daha yaklaşılıyor. Bu
    // yüzden "en iyi" skor neredeyse her zaman arama penceresinin TAM
    // UCUNDA (±yarim sınırında) bulunuyordu — 13 gerçek örnekten 10'unda
    // |enIyiDy| tam olarak yarim'e eşitti. yarim'i küçültmek (0.47→0.40)
    // bu davranışı DEĞİŞTİRMEDİ, sadece "duvarı" biraz yaklaştırdı — arama
    // yine yeni duvara toslamaya devam etti.
    //
    // Gerçek bir eğik/kaymış satırda ise en iyi dy genelde pencerenin
    // İÇİNDE bir yerde (yerel bir tepe noktasında) bulunur, sınıra
    // dayanmaz. Bu yüzden: sonuç sınırın belirli bir oranından fazlasına
    // dayanıyorsa, bu "duvara toslama" (güvenilmez, muhtemelen komşu
    // satırın sinyaline çekilme) belirtisidir — dy=0'a (kayma yok, ham
    // beklenen konum) düşülür.
    //
    // İKİNCİ AYAR (aynı gün, gerçek kağıt+uygulama karşılaştırmasıyla):
    // %90 eşiği 13 zincirden 12'sini düzeltti ama FEN #18-19'u kaçırdı
    // (satirDy1/r=+1.28, satirDy2/r=-1.28 — %90 eşiği olan 1.44r'nin
    // altında kaldı). Sedat'ın gönderdiği HAM KAĞIT görüntüsüyle bu
    // sorunun gerçek olduğu kanıtlandı: kağıtta Fen #19 BOŞ, uygulama
    // #18'in A işaretine kilitlenip #19'u da "A" okumuştu.
    // Tüm 13 örnekteki 26 satirDy değeri incelendiğinde DOĞAL BİR BOŞLUK
    // bulundu: küçük değerler kümesi (0.32r, 0.64r, 0.80r — muhtemelen
    // gerçek eğiklik/gürültü) ile büyük değerler kümesi (1.28r, 1.60r —
    // duvara toslama) arasında 0.80r-1.28r aralığında HİÇ değer yok.
    // Eşik bu boşluğun ortasına (%65 = 1.04r) çekildi — bu, önceki 12
    // örneğin davranışını DEĞİŞTİRMEDEN (hepsi ya ≥1.60r ya ≤0.80r'de)
    // FEN #18-19'un HER İKİ tarafını da (simetrik ±1.28r) doğru şekilde
    // yakalıyor. Gerçek 13 örnekle simüle edilip DOĞRULANDI: 13/13 zincir
    // artık düzeliyor.
    const DUVAR_ESIK_ORANI = 0.65;
    if (Math.abs(enIyiDy) >= yarim * DUVAR_ESIK_ORANI) {
      return 0;
    }
    return enIyiDy;
  }


  /**
   * Bir ders sütununun TÜM satırlarını kapsayan BİR KESİT alıp, yatay
   * tarama yaparak basılı çember sinyali toplamını en üst düzeye çıkaran
   * dx ofsetini döndürür.
   *
   * NEDEN GEREKLİ: Elle köşe modunda (formuOkuElleKoseli) global homografi
   * sağ tarafa doğru kümülatif perspektif hatası biriktirebilir. Sonuç:
   * son sütunlarda (Yabancı Dil, Matematik, Fen Bilimleri gibi) baloncuk
   * koordinatları gerçek konumdan ~1 şık kadar yatay kayabiliyor — mevcut
   * ±0.5r yerel arama bunu yakalamaya yetmiyor.
   *
   * YÖNTEMİN GÜVENLİĞİ: Yatay şık aralığı ~3.5r-4r. Bu fonksiyon en fazla
   * ±1.5r arar — komşu şıka taşma matematiksel olarak imkansız. Sütunun
   * TÜM sorularından SADECE BİR TEMSİLCİ SATIR (ortadaki soru) kullanılır:
   * basılı çember sinyali öğrenci işaretinden BAĞIMSIZ olduğundan, tek bir
   * satırın 4 çemberinin toplamı bile dx tepesini güvenle bulur.
   *
   * @param {ImageData} cImageData - kanonik canvas
   * @param {Array} sutunSorular   - [{sikler:[{px,py,pr},...]},...] bir sütundaki tüm sorular
   * @param {number} sikAralikPx   - iki komşu şık arasındaki mesafe (px) — güvenli arama sınırı için
   * @returns {number} enIyiDx — piksel cinsinden yatay offset (0 = kayma yok)
   */
  function sutunIcinYatayOffsetBul(cImageData, sutunSorular, sikAralikPx) {
    // Bu fonksiyon devre dışı bırakıldı — basılı çember sinyali tüm dx
    // değerlerinde benzer güçte çıktığından güvenilir bir yatay zirve
    // oluşturulamıyor; yanlış offset uygulandığında hatayı ikiye katlıyor.
    // Yatay kayma toleransı artık baloncukKaranlikOraniYerelArama'nın
    // aramaX parametresiyle sağlanıyor (bkz. cevaplariCikar).
    return 0;
  }

  // ---------------------------------------------------------------------
  // 8.5) Kademeli işaretleme seviyesi (Test Plus enum karşılığı)
  //
  // Test Plus'taki tamamenIsaretli/normalIsaretli/yarimIsaretli/azIsaretli/
  // cokAzIsaretli enum'unun JS karşılığı. Doluluk oranı, KARANLIK_ESIK'e
  // göreli 5 bandda sınıflandırılır — böylece KARANLIK_ESIK kullanıcı
  // tarafından değiştirilse bile seviyeler tutarlı kalır.
  //
  // dusukDolulukOraniCiftIsaretliUyari: en koyu şık 'yarimIsaretli' ya da
  // altında VE birden fazla şık eşiği geçiyorsa özel uyarı tetiklenir —
  // "hafifçe iki yere işaret etmiş mi?" durumunu yakalamak için.
  // ---------------------------------------------------------------------

  /**
   * Doluluk oranını (0-1) kademeli işaretleme seviyesine çevirir.
   * @param {number} oran      - baloncuk doluluk oranı
   * @param {number} karanlikEsik - aktif KARANLIK_ESIK
   * @returns {string} seviye adı
   */
  function _isaretlemeSeviyesiHesapla(oran, karanlikEsik) {
    if (oran >= karanlikEsik * 2.0) return 'tamamenIsaretli';
    if (oran >= karanlikEsik * 1.4) return 'normalIsaretli';
    if (oran >= karanlikEsik * 1.0) return 'yarimIsaretli';
    if (oran >= karanlikEsik * 0.5) return 'azIsaretli';
    return 'cokAzIsaretli';
  }

  // ---------------------------------------------------------------------
  // v31 — Birleşik bubble güven skoru
  // Native liboptikokuyucu.so analizindeki iki-geçişli satır normalizasyonu
  // yaklaşımını, mevcut mutlak koyuluk + en iyi/ikinci aday farkı mantığıyla
  // birleştirir. Tek bir threshold'a bağımlı kalmamak için dört bağımsız
  // sinyal kullanılır:
  //   1) mutlak koyuluk / aktif eşik oranı
  //   2) en iyi - ikinci en iyi mutlak fark
  //   3) satır-içi göreli ayrışma (1 - ikinci/enIyi)
  //   4) baloncuk merkezi ile çevresindeki kağıt arasındaki yerel kontrast
  // Sonuç 0..1 arasındadır. Eski `guven` alanı geriye dönük uyumluluk için
  // korunur; yeni karar/kalite katmanı `birlesikGuven` değerini kullanır.
  // ---------------------------------------------------------------------

  function _clamp01(v) { return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0)); }

  function baloncukYerelKontrastPuani(cImageData, cx, cy, r) {
    const { width, height, data } = cImageData;
    if (!width || !height || !(r > 0)) return 0;

    // İç sinyal: öğrencinin işaretinin en temiz olduğu merkez disk.
    const ic = baloncukKaranlikOrani(cImageData, cx, cy, r);

    // Dış referans: basılı baloncuk çemberinin DIŞINDA, komşu baloncuğa
    // taşmayacak 1.15r–1.55r halkası. Böylece bölgesel gölge/kağıt koyuluğu
    // ölçülür; yalnızca mutlak parlaklığa bağımlı kalınmaz.
    const r0 = r * 1.15;
    const r1 = r * 1.55;
    const x0 = Math.max(0, Math.floor(cx - r1));
    const x1 = Math.min(width - 1, Math.ceil(cx + r1));
    const y0 = Math.max(0, Math.floor(cy - r1));
    const y1 = Math.min(height - 1, Math.ceil(cy + r1));
    let toplam = 0, adet = 0;
    const r0k = r0 * r0, r1k = r1 * r1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 >= r0k && d2 <= r1k) {
          toplam += isaretKoyulukPuani(data, (y * width + x) * 4);
          adet++;
        }
      }
    }
    const cevre = adet ? toplam / adet : 0;
    return _clamp01((ic - cevre) / 0.45);
  }

  function _bubbleBirlesikGuvenHesapla(enKoyu, ikinciKoyu, olcekliEsik, ayirtEdiciFark, yerelKontrast) {
    const en = Math.max(0, enKoyu && enKoyu.oran || 0);
    const ikinci = Math.max(0, ikinciKoyu && ikinciKoyu.oran || 0);
    const esik = Math.max(0.05, olcekliEsik || 0.05);
    const fark = Math.max(0, en - ikinci);

    // Eşiğin %65'i civarı sıfıra yakın, ~1.5× eşikte tam puan.
    const mutlakPuan = _clamp01(((en / esik) - 0.65) / 0.85);
    // Kullanıcı ayırt-edici fark eşiğinin 2 katında tam puan.
    const farkPuan = _clamp01(fark / Math.max(0.12, ayirtEdiciFark * 2));
    // Native satır-normalizasyon fikrinin karar karşılığı: ikinci adayın
    // en iyi adaya göre ne kadar geride kaldığı. %35 göreli ayrım tam puan.
    const goreliAyrim = en > 0.01 ? _clamp01((1 - (ikinci / en)) / 0.35) : 0;
    const kontrastPuan = _clamp01(yerelKontrast);

    const toplam = mutlakPuan * 0.40 + farkPuan * 0.25 + goreliAyrim * 0.20 + kontrastPuan * 0.15;
    return {
      toplam: _clamp01(toplam),
      mutlakPuan, farkPuan, goreliAyrim, kontrastPuan,
      fark, normalizeIkinci: en > 0.01 ? _clamp01(ikinci / en) : 1,
    };
  }

  function cevaplariCikar(cImageData, form, ppmm, genelDuzeltme) {
    const _sabitEsik = _koyulukEsikGetir(); // Ayarlar sheet'inden gelen kullanıcı tercihi
    const AYIRT_EDICI_FARK = _ayirtEdiciFarkGetir(); // her okumada canlı okunur (Ayarlar sheet)
    const sorular = tumSorulariTopla(form);

    // ── ADAPTİF EŞİK ──────────────────────────────────────────────────────
    // Sorun: küçük baskıda (ör. A4'e 2 form) baloncuklar küçülür, mürekkep
    // yoğunluğu piksel başına düşer → tüm koyuluk değerleri sabit eşiğin
    // altında kalır → gerçekte işaretli balonlar BOS okunur.
    //
    // Çözüm: ön geçişte her sorunun EN KOYU şığını hızlıca örnekle.
    // Bu değerlerin medyanı o kağıdın "tipik işaretli balon" sinyalini
    // yansıtır. Adaptif eşik = medyan × 0.70 — işaretlilerin alt %30'unu
    // BOS saymak yerine, işaretsizlerden ayırt etmek için kullanılır.
    //
    // Güvenlik: adaptif eşik asla kullanıcının sabit eşiğinin ÜSTÜNE
    // çıkmaz (sabit eşik bir üst sınır gibi davranır), asla 0.20'nin
    // altına düşmez (tamamen beyaz kağıtta gürültüyü bastır).
    // Sonuç: hem normal hem küçük baskıda doğru çalışır.
    let KARANLIK_ESIK = _sabitEsik; // varsayılan — ön geçiş başarısız olursa bu kullanılır
    try {
      const onGecisOranlar = [];
      for (const soru of sorular) {
        const beklenenSikler = soru.sikler.map((s) => {
          const yerel = yerelNokta(form, s.cx, s.cy);
          const ham = { x: yerel.x * ppmm, y: yerel.y * ppmm };
          const { x: px, y: py } = yerelDuzeltmeUygula(genelDuzeltme, ham.x, ham.y);
          return { px, py, pr: s.r * ppmm };
        });
        // Sadece en koyu şıkkı örnekle — hız için aramaOrani dar (0.3)
        let enKoyuOran = 0;
        for (const s of beklenenSikler) {
          const o = baloncukKaranlikOraniYerelArama(cImageData, s.px, s.py, s.pr, 0.3, 0.0, 0.0).oran;
          if (o > enKoyuOran) enKoyuOran = o;
        }
        onGecisOranlar.push(enKoyuOran);
      }
      // Medyan: sıralı dizinin ortası — aykırı değerlerden etkilenmez
      onGecisOranlar.sort((a, b) => a - b);
      const medyan = onGecisOranlar.length % 2 === 1
        ? onGecisOranlar[(onGecisOranlar.length - 1) / 2]
        : (onGecisOranlar[onGecisOranlar.length / 2 - 1] + onGecisOranlar[onGecisOranlar.length / 2]) / 2;
      const adaptifEsik = medyan * 0.70;
      // Adaptif eşik: [0.20, _sabitEsik] aralığında tut
      KARANLIK_ESIK = Math.max(0.20, Math.min(_sabitEsik, adaptifEsik));
    } catch (e) {
      // Ön geçiş hata verirse sabit eşiğe dön — asıl okuma etkilenmesin
      KARANLIK_ESIK = _sabitEsik;
    }
    // ──────────────────────────────────────────────────────────────────────
    const cevaplar = [];
    const ornekNoktalari = []; // debug/görselleştirme: her şıkkın tam örnekleme noktası
    const birdenFazlaSecenekIsaretleme = []; // {ders, soruNo, adaylar[]} — çoklu işaret listesi
    _cevapTeshisSatirlari = []; // YENİ (teşhis): her çağrıda sıfırlanır
    _cevapTeshisSayaci = {};
    _sonIsaretliSik = {};
    _ardisikAyniSikSatirlari = [];

    // Her ders sütunu için en büyük soruNo'yu önceden hesapla — satır-içi
    // dikey arama, bir sütunun SON sorusunda çerçevenin alt kenarına doğru
    // taşıp onu yanlışlıkla "koyu baloncuk" sanmasın diye (bkz.
    // satirIcinDikeyKaymaBul).
    const sonSoruNo = {};
    for (const s of sorular) {
      if (!sonSoruNo[s.ders] || s.soruNo > sonSoruNo[s.ders]) {
        sonSoruNo[s.ders] = s.soruNo;
      }
    }

    for (const soru of sorular) {
      const duzeltme = genelDuzeltme;

      // ADIM 1: Her şıkkın homografiyle beklenen kanonik konumunu hesapla.
      const beklenenSikler = soru.sikler.map((s) => {
        const yerel = yerelNokta(form, s.cx, s.cy);
        const ham = { x: yerel.x * ppmm, y: yerel.y * ppmm };
        const { x: px, y: py } = yerelDuzeltmeUygula(duzeltme, ham.x, ham.y);
        const pr = s.r * ppmm;
        return { harf: s.harf, px, py, pr };
      });

      // ADIM 2: SATIRIN TAMAMINI (4 şıkkı birlikte, basılı çember sinyaline
      // bakarak) doğru y'ye kilitle — bkz. satirIcinDikeyKaymaBul.
      const satirAraligiPx = 4 * beklenenSikler[0].pr; // bkz. layoutEngine: satirAraligi = baloncukCap*2 = 4r
      const ilkSoruMu = soru.soruNo === 1;
      const sonSoruMu = soru.soruNo === sonSoruNo[soru.ders];
      const satirDy = satirIcinDikeyKaymaBul(cImageData, beklenenSikler, satirAraligiPx, ilkSoruMu, sonSoruMu);

      // ADIM 3: Satır-kilitli konum etrafında, HER şık için ayrı ayrı küçük
      // ölçekli ince ayar (baloncukKaranlikOraniYerelArama) yapıp gerçek
      // dolgu oranını ölç.
      //
      // KÖK SEBEP DÜZELTMESİ (Ağustos 2026 — Sedat'ın bildirdiği "gerçekte
      // işaretli bir sorunun hem üstü hem altı aynı şıkla okunuyor"
      // belirtisi, "⚠ Ardışık aynı şık tespiti" teşhisiyle kanıtlandı):
      // bu çağrı önceden aramaOrani parametresi VERMİYORDU, bu da
      // fonksiyonun varsayılanı olan 1.3'ü kullanmasına yol açıyordu.
      // satirIcinDikeyKaymaBul zaten satırı ±1.88r'ye kadar kaydırabiliyor
      // (yarim=0.47*4r); bunun üstüne HER ŞIK için ayrıca ±1.3r'lik bir
      // ikinci arama eklenince toplam olası kayma ±3.18r'e çıkıyordu —
      // satırlar arası mesafe olan 4r'nin neredeyse tamamı. Sonuç: boş bir
      // satırın (kendi zayıf/rastgele sinyaliyle) arama merkezi, komşu
      // satırdaki GERÇEK ve güçlü bir işaretin tam üstüne düşebiliyor,
      // o satır komşusunun cevabını "çalıyordu" (gözlemlenen: 3+ ardışık
      // sorunun hepsi aynı güçlü guven değeriyle aynı şıkka kilitleniyordu).
      // numaraOku ve kitapcikOku bu ikinci aramayı ZATEN 0.5 ile
      // çağırıyordu (satır ~2046, ~2178) — cevap okuma bu tutarlılığı
      // kaçırmıştı. 0.5 ile toplam max kayma 1.88r+0.5r=2.38r, komşu
      // satıra kalan mesafe 1.62r > disk çapı değil ama en azından arama
      // MERKEZİ artık komşu satırın merkezine hiçbir zaman ulaşamıyor
      // (0.5r < 4r-1.88r=2.12r), örtüşme riski disk kenarına indi.
      const yerelSikler = beklenenSikler.map((s) => {
        const py2 = s.py + satirDy;
        const sonuc = baloncukKaranlikOraniYerelArama(cImageData, s.px, py2, s.pr, 0.5, 0.12, 0.8);
        return {
          harf: s.harf,
          oran: sonuc.oran,
          px: s.px + sonuc.dx, // debug görselleştirmesi gerçek (kaymış) noktayı göstersin
          py: py2 + sonuc.dy,
          pr: s.pr,
          yerelDy: sonuc.dy, // YENİ (teşhis): ADIM 3'ün EK kayması (satirDy'ye ilaveten), /pr oranlanabilir
          yerelDx: sonuc.dx, // YENİ (Ağustos 2026, Sedat'ın gönderdiği görselle kanıtlandı: Fen #19'da sahte
                              // sinyal D'nin kendi konumunda değil, C-D ARASINDA görünüyordu — bu YATAY (dx)
                              // kaymayı işaret ediyor, önceki turlarda sadece dy (dikey) ölçülüyordu
          hamOran: _sonYerelAramaHamOran, // YENİ (teşhis): duvara-toslama şüphesi varsa (dx=0,dy=0) noktasındaki ham oran, yoksa null
        };
      });

      // ── SATIR NORMALİZASYONU (C++ _normalizeYardimci karşılığı) ────────────
      // C++ setIsaretlemeler: 1. geçişte satırın maksimum doluluk değerini
      // toplar, 2. geçişte her bubble'ı bu maksimuma böler. Aynı sorunun
      // şıkları arasındaki GÖREL fark korunurken yerel ışık/kontrast
      // farklılığı (gölgede kalan satır, küçük baskı vb.) otomatik telafi
      // edilir.
      //
      // UYGULAMA: yerelSikler sıralanmadan önce, satırdaki maksimum orana
      // bölerek her şıka 0-1 arası bir "normalOran" atanır. Bu değer
      // teşhis bilgisine (`top3` çıktısına) eklenir; asıl karar için
      // aşağıdaki `olcekliEsik` kullanılır.
      const satirMaks = Math.max(...yerelSikler.map((s) => s.oran));
      const satirNormBolen = satirMaks > 0.01 ? satirMaks : 1;
      yerelSikler.forEach((s) => { s.normalOran = s.oran / satirNormBolen; });

      // ── BUBBLE BOYUT ÖLÇEKLEMESİ (C++ _thresholdKarar/localScale) ──────────
      // C++ kodu: efektifEsik = disThreshold * sqrt(bubbleArea / REFERANS_ALAN)
      // Küçük baskıda (ppmm düşük veya fiziksel bubble küçük) bubble alanı
      // REFERANS_ALAN'ın altına düşer; efektif eşik otomatik düşer.
      // REFERANS_ALAN: VARSAYILAN_PPMM=8'de 2.75mm yarıçaplı baloncuk → ~1521 px²
      // localScale sınırlandırılır [0.25, 2.0]: aşırı küçük/büyük ölçeklere
      // karşı eşik 2× altına/üstüne çıkmasın (sqrt(0.25)=0.5, sqrt(2.0)≈1.41).
      const REFERANS_ALAN_PX = Math.PI * (2.75 * VARSAYILAN_PPMM) ** 2; // ≈1521
      const bubbleAlani = Math.PI * beklenenSikler[0].pr ** 2;
      const localScale = Math.max(0.25, Math.min(2.0, bubbleAlani / REFERANS_ALAN_PX));
      // Ölçekli eşik: küçük bubble → eşik düşer, büyük bubble → eşik yükselir.
      const olcekliEsik = KARANLIK_ESIK * Math.sqrt(localScale);

      yerelSikler.sort((a, b) => b.oran - a.oran);
      const enKoyu = yerelSikler[0];
      const ikinciKoyu = yerelSikler[1] || { oran: 0 };

      let isaretliSik = null;
      let uyari = null;

      // Kademeli seviye — cevap kararından bağımsız olarak her zaman hesaplanır.
      // Ölçekli eşik ile hesaplanır: küçük baskıda büyük bir oran da aslında
      // "normal" işaret sayılır; büyük bubble'da daha yüksek orana ihtiyaç var.
      const isaretlemeSeviyesi = _isaretlemeSeviyesiHesapla(enKoyu.oran, olcekliEsik);

      // v31: seçilen gerçek piksel merkezinde yerel kontrast + birleşik güven.
      const yerelKontrast = baloncukYerelKontrastPuani(cImageData, enKoyu.px, enKoyu.py, enKoyu.pr);
      const guvenBilesenleri = _bubbleBirlesikGuvenHesapla(
        enKoyu, ikinciKoyu, olcekliEsik, AYIRT_EDICI_FARK, yerelKontrast
      );
      const birlesikGuven = guvenBilesenleri.toplam;

      if (enKoyu.oran < olcekliEsik) {
        uyari = 'bos'; // hiçbir şık yeterince koyu değil (ölçekli eşiğe göre)
      } else if (enKoyu.oran - ikinciKoyu.oran < AYIRT_EDICI_FARK) {
        uyari = 'coklu'; // iki (veya daha fazla) şık birbirine çok yakın koyulukta

        // Çoklu işaretleme listesine ekle — sadece 'coklu' dalında.
        // Her iki önde gelen adayı da raporla (kağıtta iki şık arasında
        // karar verilmesine yardımcı olsun).
        const cokluAdaylar = yerelSikler
          .filter((s) => s.oran >= KARANLIK_ESIK)
          .map((s) => ({ harf: s.harf, oran: Number(s.oran.toFixed(3)) }));
        birdenFazlaSecenekIsaretleme.push({
          ders: soru.ders,
          soruNo: soru.soruNo,
          adaylar: cokluAdaylar,
        });

        // dusukDolulukOraniCiftIsaretliUyari: en koyu şık eşiği yeni geçiyor
        // (yarimIsaretli) ve aynı zamanda birden fazla şık eşiği aşıyorsa —
        // öğrencinin hafifçe iki şıkka dokunmuş olabileceğine işaret eder.
        if ((isaretlemeSeviyesi === 'yarimIsaretli' || isaretlemeSeviyesi === 'azIsaretli') &&
            cokluAdaylar.length >= 2) {
          uyari = 'dusukDolulukOraniCiftIsaretli';
        }
      } else {
        isaretliSik = enKoyu.harf;
        // Çok zayıf birleşik kanıt varsa, tek bir mutlak koyuluk eşiğini
        // geçti diye cevabı kesinleştirme. Bu sınır kasıtlı olarak düşük
        // tutuldu: soluk ama gerçek işaretleri kaybetmeden belirgin sahte
        // pozitifleri 'dusukGuven' olarak kontrol kuyruğuna gönderir.
        if (birlesikGuven < 0.38) {
          isaretliSik = null;
          uyari = 'dusukGuven';
        }
      }

      cevaplar.push({
        ders: soru.ders,
        soruNo: soru.soruNo,
        isaretliSik,
        isaretlemeSeviyesi, // YENİ: tamamenIsaretli/normalIsaretli/yarimIsaretli/azIsaretli/cokAzIsaretli
        guven: Number(enKoyu.oran.toFixed(3)), // eski mutlak doluluk alanı
        birlesikGuven: Number(birlesikGuven.toFixed(3)),
        guvenBilesenleri: {
          mutlak: Number(guvenBilesenleri.mutlakPuan.toFixed(3)),
          fark: Number(guvenBilesenleri.farkPuan.toFixed(3)),
          goreliAyrim: Number(guvenBilesenleri.goreliAyrim.toFixed(3)),
          yerelKontrast: Number(guvenBilesenleri.kontrastPuan.toFixed(3)),
        },
        kontrolOnerilir: birlesikGuven < 0.55,
        uyari,
      });

      // YENİ (teşhis): _sonNumaraTeshis/_sonKitapcikTeshis ile AYNI desen —
      // ilk birkaç BELİRSİZ/BOŞ sorunun top-3 şık adayını ve oranlarını
      // kaydet. Tüm 70-100 soruyu tek tek yazmak ekranı doldurur; ilk 5
      // YENİ (teşhis, geliştirildi): önceki sürüm TÜM sorular arasında tek
      // bir global kota (ilk 5) kullanıyordu — bir ders kotayı tek başına
      // doldurunca (örn. TÜRKÇE #3-7) diğer derslerden (İNKILAP gibi) HİÇ
      // örnek görünmüyordu. Artık DERS BAŞINA ayrı kota (en fazla 2) var,
      // böylece her ders en az bir örnekle temsil ediliyor.
      // YENİ (Ağustos 2026 — Sedat'ın bildirdiği "Türkçe #20 ve Fen #19
      // gerçekten işaretliydi ama boş/coklu okundu, komşu satırlar
      // tamamen boştu" — ham kağıtla KANITLANDI): bu iki soru DERS SONU
      // (son soru / sona yakın) sorularıydı, ders başına ilk-2 kotası
      // onları hiç yakalamamıştı çünkü #1-3 gibi erken sorular kotayı
      // dolduruyordu. Kota 3'e çıkarıldı VE ders sonundaki soru
      // (soru.soruNo === sonSoruNo[soru.ders]) kotadan bağımsız HER ZAMAN
      // dahil ediliyor — bu örüntü tekrarlıyorsa (hizalama karesine yakın
      // satırlarda sahte sinyal ihtimali) kesin veriyle görünür olsun.
      if (uyari) {
        const dersSonSoru = sonSoruNo[soru.ders] || soru.soruNo;
        const sonaYakinMi = (dersSonSoru - soru.soruNo) <= 1; // son soru VEYA sondan bir önceki
        _cevapTeshisSayaci[soru.ders] = (_cevapTeshisSayaci[soru.ders] || 0);
        if (_cevapTeshisSayaci[soru.ders] < 3 || sonaYakinMi) {
          _cevapTeshisSayaci[soru.ders]++;
          const enKoyuPr = enKoyu.pr || beklenenSikler[0].pr;
          // YENİ (Ağustos 2026, Sedat'ın gönderdiği GÖRSELLE kanıtlandı):
          // Fen #19'da sahte ikinci sinyal (D) kendi konumunda değil,
          // C-D ARASINDA görünüyordu — bu YATAY (dx) kaymayı işaret
          // ediyordu, önceki turda sadece dy ölçülüyordu. Artık top-3
          // adayın HER BİRİNİN kendi (dx/r, dy/r) çifti gösteriliyor.
          const top3 = yerelSikler.slice(0, 3).map((s) =>
            s.harf + '=' + s.oran.toFixed(3) +
            '(n' + (s.normalOran !== undefined ? s.normalOran.toFixed(2) : '?') + ')' +
            '(dx' + ((s.yerelDx || 0) / enKoyuPr).toFixed(2) +
            ',dy' + ((s.yerelDy || 0) / enKoyuPr).toFixed(2) + ')'
          ).join(',');
          _cevapTeshisSatirlari.push(
            soru.ders + ' #' + soru.soruNo + ':[' + top3 + ']->' + uyari.toUpperCase() +
            ' (satirDy/r:' + (satirDy / enKoyuPr).toFixed(2) + ')'
          );
        }
      }
      // YENİ (teşhis): Sedat'ın bildirdiği "gerçekte işaretli bir sorunun
      // hem üstü hem altı aynı şıkla okunuyor" belirtisini otomatik tespit
      // et — satirIcinDikeyKaymaBul'un komşu satırın güçlü sinyaline
      // yanlışlıkla kilitlenip kilitlenmediğini doğrudan gösterir.
      //
      // GENİŞLETME (Ağustos 2026 — yarim/aramaOrani düzeltmeleri kaymayı
      // beklenen kadar azaltmadı, çelişkili sonuç): artık satirDy'nin
      // KENDİSİNİ de (px ve /pr oranı olarak) yazıyoruz. Eğer gerçekten
      // komşu satıra kilitlenme varsa, iki ardışık sorunun satirDy'si
      // BİRBİRİNE YAKIN ve satır aralığına (satirAraligiPx) yakın büyüklükte
      // olmalı. Eğer satirDy KÜÇÜKSE (örn. <0.5r) ama guven yine de
      // yüksekse, sorun satır-kilitlemede DEĞİL — soru kendi gerçek
      // konumunda başka bir nedenden (baskı lekesi, homografi hatası,
      // farklı bir mekanizma) güçlü sinyal veriyor demektir.
      // GENİŞLETME 2 (Ağustos 2026 — satirDy=0.00 olmasına rağmen guven
      // hâlâ yüksek çıkan durum gözlemlendi): artık ADIM 3'ün EKLEDİĞİ
      // ek kayma da (yerelDy/pr) yazılıyor. satirDy=0 ama yerelDy büyükse,
      // sorun satirIcinDikeyKaymaBul'da DEĞİL — baloncukKaranlikOraniYerelArama
      // (ADIM 3, aramaOrani=0.5) kendi küçük penceresinde komşuya kayıyor
      // demektir. yerelDy de küçükse (ikisi de küçük ama guven yüksek),
      // sorun kaymada hiç DEĞİL — sorunun kendi fiziksel bölgesinde
      // gerçek bir kirlilik/gölge/homografi hatası var demektir.
      if (isaretliSik && _sonIsaretliSik[soru.ders] && _sonIsaretliSik[soru.ders].harf === isaretliSik &&
          _sonIsaretliSik[soru.ders].soruNo === soru.soruNo - 1) {
        const oncekiHam = _sonIsaretliSik[soru.ders].hamOran;
        _ardisikAyniSikSatirlari.push(
          soru.ders + ' #' + (soru.soruNo - 1) + ' ve #' + soru.soruNo + ' İKİSİ DE "' + isaretliSik +
          '" (guven: ' + _sonIsaretliSik[soru.ders].guven.toFixed(3) + ', ' + enKoyu.oran.toFixed(3) +
          ') (satirDy/r: ' + (_sonIsaretliSik[soru.ders].satirDy / _sonIsaretliSik[soru.ders].pr).toFixed(2) +
          ', ' + (satirDy / beklenenSikler[0].pr).toFixed(2) +
          ') (yerelDy/r: ' + (_sonIsaretliSik[soru.ders].yerelDy / _sonIsaretliSik[soru.ders].pr).toFixed(2) +
          ', ' + (enKoyu.yerelDy / enKoyu.pr).toFixed(2) +
          ') (hamOran: ' + (oncekiHam !== null && oncekiHam !== undefined ? oncekiHam.toFixed(3) : '-') +
          ', ' + (enKoyu.hamOran !== null ? enKoyu.hamOran.toFixed(3) : '-') + ')'
        );
      }
      if (isaretliSik) { _sonIsaretliSik[soru.ders] = { soruNo: soru.soruNo, harf: isaretliSik, guven: enKoyu.oran, satirDy, pr: beklenenSikler[0].pr, yerelDy: enKoyu.yerelDy, hamOran: enKoyu.hamOran }; }

      ornekNoktalari.push({
        ders: soru.ders,
        soruNo: soru.soruNo,
        sikler: yerelSikler, // her şık için px, py, pr, oran, harf
        enKoyuHarf: enKoyu.harf,
      });
    }

    // YENİ (teşhis): tüm soruların en koyu şık oranı (guven) dağılımını
    // özetle — "hepsi boş" çıktığında bunun sebebi (a) koordinatlar boş
    // kağıda düşüyor (guven hep ~0'a yakın) mu, yoksa (b) eşik çok mu
    // sıkı (guven KARANLIK_ESIK'e yakın ama altında) ayırt etmek için.
    const tumOranlar = cevaplar.map((c) => c.guven);
    const enDusukOran = Math.min(...tumOranlar);
    const enYuksekOran = Math.max(...tumOranlar);
    const ortalamaOran = tumOranlar.reduce((a, b) => a + b, 0) / (tumOranlar.length || 1);
    // Ölçekli eşik: son sorununun değerini kullan (temsili; soru başına farklı)
    const sonOlcekliEsik = (() => {
      try {
        const sonSoru = sorular[sorular.length - 1];
        if (!sonSoru) return KARANLIK_ESIK;
        const pr0 = sonSoru.sikler[0].r * ppmm;
        const ba = Math.PI * pr0 ** 2;
        const ls = Math.max(0.25, Math.min(2.0, ba / (Math.PI * (2.75 * VARSAYILAN_PPMM) ** 2)));
        return KARANLIK_ESIK * Math.sqrt(ls);
      } catch (e) { return KARANLIK_ESIK; }
    })();
    const birlesikGuvenler = cevaplar.map((c) => c.birlesikGuven).filter(Number.isFinite);
    const ortBirlesik = birlesikGuvenler.length
      ? birlesikGuvenler.reduce((a, b) => a + b, 0) / birlesikGuvenler.length : 0;
    const dusukGuvenliSayisi = cevaplar.filter((c) => c.kontrolOnerilir).length;
    _sonKoyulukOzeti = 'guven aralığı: min=' + enDusukOran.toFixed(3) + ' maks=' + enYuksekOran.toFixed(3) +
      ' ort=' + ortalamaOran.toFixed(3) +
      ' (eşik=' + KARANLIK_ESIK.toFixed(2) +
      (KARANLIK_ESIK < _sabitEsik ? ' [adaptif, sabit=' + _sabitEsik.toFixed(2) + ']' : '') +
      ', ölçekli≈' + sonOlcekliEsik.toFixed(2) + ')' +
      ' | birleşik ort=' + ortBirlesik.toFixed(3) + ', kontrol<0.55=' + dusukGuvenliSayisi;

    return {
      cevaplar, ornekNoktalari, birdenFazlaSecenekIsaretleme,
      bubbleKalite: {
        ortalamaBirlesikGuven: Number(ortBirlesik.toFixed(3)),
        dusukGuvenliSayisi,
        toplamSoru: cevaplar.length,
      },
    };
  }

  // ---------------------------------------------------------------------
  // 9) Ana giriş noktası
  // ---------------------------------------------------------------------

  /**
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} kaynak
   * @param {Object} form - layout.formlar[i] (layoutEngine.js çıktısı)
   * @param {Object} [secenekler]
   * @param {number} [secenekler.ppmm] - düzleştirilmiş canvas çözünürlüğü (mm başına px)
   * @returns {Promise<Object>} formuOku çıktı şeması (dosya başındaki dokümana bakın)
   */
  /**
   * Bir baloncuk grubunda (aynı basamak/kitapçık sütunu) en koyu olanı seçer.
   *
   * NOT: Numara/Kitapçık baloncukları ana cevap baloncuklarından KÜÇÜK
   * (sayfanın sol kenarındaki dar bloğa sığması için). Küçük baloncuklarda
   * basılı ÇERÇEVE (renkli kenarlık) toplam alana göre daha büyük bir pay
   * kaplıyor, bu da işaretsiz baloncuklarda bile ölçülen "koyuluk"
   * değerinin sıfıra yakın olmayıp biraz yüksek çıkmasına — dolayısıyla
   * işaretli/işaretsiz farkının küçülüp yanlışlıkla "belirsiz" sayılmasına
   * yol açabiliyor. Bunu telafi etmek için burada arama toleransı
   * (aramaOrani) ve belirsizlik marjı, ana cevap okumasından daha gevşek
   * tutuluyor.
   */
  function baloncukGrubundanEnKoyuyuSec(cImageData, bubbles, ppmm, etiket) {
    // Adaptif eşik — cevaplariCikar ile aynı mantık:
    // numara/kitapçık balonları da küçük baskıda düşük koyuluk verir.
    const _sabitEsikGrup = _koyulukEsikGetir();
    let KARANLIK_ESIK = _sabitEsikGrup;
    try {
      const onGecis = bubbles.map((b) => {
        const s = baloncukKaranlikOraniYerelArama(cImageData, b.cx * ppmm, b.cy * ppmm, b.r * ppmm, 0.3, 0.0, 0.0);
        return s.oran;
      });
      onGecis.sort((a, b) => a - b);
      const med = onGecis.length % 2 === 1
        ? onGecis[(onGecis.length - 1) / 2]
        : (onGecis[onGecis.length / 2 - 1] + onGecis[onGecis.length / 2]) / 2;
      KARANLIK_ESIK = Math.max(0.20, Math.min(_sabitEsikGrup, med * 0.70));
    } catch (e) { KARANLIK_ESIK = _sabitEsikGrup; }
    const sikler = bubbles.map((b) => ({ px: b.cx * ppmm, py: b.cy * ppmm, pr: b.r * ppmm }));

    // YEREL DİKEY KAYMA KİLİDİ (bkz. satirIcinDikeyKaymaBul'un başındaki
    // açıklama — burada AYNI mantık, cevap ızgarasındaki bir "satır" yerine
    // NUMARA/Kitapçık sütunundaki TÜM baloncuklara uygulanıyor).
    //
    // NEDEN GEREKLİ: bu blok sayfanın SOL KENARINDA, köşe hizalama
    // işaretlerinden en uzak noktada duruyor — global (ve varsa genel
    // ızgara) homografinin telafi edemediği artık kağıt eğriliği burada en
    // büyük etkiyi yapıyor. Basılı çember sinyali öğrencinin işaretinden
    // bağımsız olduğu için, homografi ne kadar kayık olursa olsun sütunu
    // doğru yere kilitleyebiliyor (aynı teknik ana ızgarada blank/boş
    // okuma sorununu çözmüştü — bkz. dosya başındaki not).
    let dy = 0;
    if (sikler.length >= 2) {
      const yler = sikler.map((s) => s.py).sort((a, b) => a - b);
      const araliklar = [];
      for (let i = 1; i < yler.length; i++) araliklar.push(yler[i] - yler[i - 1]);
      // KÖK NEDEN SAĞLAMLAŞTIRMASI (Çözüm Planı, Ağustos 2026): ortAralik
      // önceden aritmetik ortalamaydı — tek bir aykırı aralık referans
      // mesafeyi kaydırabiliyordu. Medyan, tek bir aykırıya karşı çok daha
      // dayanıklı (bkz. numaraOku/_basamakEnKoyusu'ndaki AYNI düzeltme).
      araliklar.sort((a, b) => a - b);
      const ortAralik = araliklar.length % 2 === 1
        ? araliklar[(araliklar.length - 1) / 2]
        : (araliklar[araliklar.length / 2 - 1] + araliklar[araliklar.length / 2]) / 2;
      if (ortAralik > 0) {
        dy = satirIcinDikeyKaymaBul(cImageData, sikler, ortAralik, false, false);
      }
    }

    const sonuclar = bubbles.map((b, i) => {
      const px = sikler[i].px;
      const py = sikler[i].py + dy;
      const pr = sikler[i].pr;
      const sonuc = baloncukKaranlikOraniYerelArama(cImageData, px, py, pr, 0.5, 0.15);
      return { deger: b.deger !== undefined ? b.deger : b.harf, oran: sonuc.oran };
    });
    sonuclar.sort((a, b) => b.oran - a.oran);
    const birinci = sonuclar[0];
    const ikinci = sonuclar[1];
    const belirsiz = !birinci || birinci.oran < KARANLIK_ESIK || (ikinci && (birinci.oran - ikinci.oran) < 0.08);
    if (etiket) {
      // YENİ (teşhis): numaraTeshis ile aynı desen — top-3 aday + oranları,
      // hangi eşiğe takıldığı (KARANLIK_ESIK mi, fark mı) görünür olsun.
      const top3 = sonuclar.slice(0, 3).map((s) => s.deger + '=' + s.oran.toFixed(3)).join(',');
      const sonucStr = etiket + ':[' + top3 + ']->' + (belirsiz ? 'BELİRSİZ' : birinci.deger) +
        ' (esik=' + KARANLIK_ESIK.toFixed(2) + (ikinci ? ', fark=' + (birinci ? (birinci.oran - ikinci.oran).toFixed(3) : '-') : '') + ')';
      _sonKitapcikTeshis = (_sonKitapcikTeshis ? _sonKitapcikTeshis + ' | ' : '') + sonucStr;
    }
    return { deger: belirsiz ? null : birinci.deger, guven: birinci ? birinci.oran : 0, belirsiz };
  }

  /** Kitapçık Türü baloncuk bloğunu okur (A/B/C/D...). Alan tanımlı değilse null döner. */
  function kitapcikOku(cImageData, kitapcikAlani, ppmm) {
    if (!kitapcikAlani || !kitapcikAlani.secenekler) return null;
    return baloncukGrubundanEnKoyuyuSec(cImageData, kitapcikAlani.secenekler, ppmm, 'kitapcik').deger;
  }

  /**
   * Form Kodu baloncuk bloğunu okur (A/B/C). Bu, kağıdın HANGİ optik form
   * şablonuyla üretildiğini doğrulamak için kullanılan, PDF üretilirken
   * otomatik önceden işaretlenen sabit bir bloktur (bkz. layoutEngine.js:
   * FORM_KODU_HARFLERI, pdfFormGenerator.js: formKoduAlaniCiz). Alan
   * tanımlı değilse (eski/farklı bir şablon) null döner — bu durumda
   * çağıran taraf doğrulamayı ATLAR (geriye dönük uyumluluk).
   */
  function formKoduOku(cImageData, formKoduAlani, ppmm) {
    if (!formKoduAlani || !formKoduAlani.secenekler) return null;
    return baloncukGrubundanEnKoyuyuSec(cImageData, formKoduAlani.secenekler, ppmm, 'formKodu').deger;
  }

  /**
   * Numara (öğrenci no) baloncuk ızgarasını okur — her basamak sütunu için
   * en koyu baloncuğu seçip rakamları birleştirir. QR'nin YERİNİ alan
   * kimlik-okuma yöntemi (bkz. layoutEngine.js: numaraAlaniHesapla).
   */
  function numaraOku(cImageData, numaraAlani, ppmm) {
    if (!numaraAlani || !numaraAlani.basamaklar) return null;
    let numara = '';
    let tamOkunduMu = true;
    const basamakTeshis = [];
    for (const basamak of numaraAlani.basamaklar) {
      // Numara alanı için eşiksiz mod: her basamakta en koyu baloncuğu
      // her zaman seç. Eşik kontrolü (KARANLIK_ESIK) atlanır çünkü
      // dijital PDF'den üretilen formlarda baskı/tarama farkından dolayı
      // güven değerleri düşük kalabilir; ama yine de en koyu = işaretli.
      const sonuc = _basamakEnKoyusu(cImageData, basamak.bubbles, ppmm, basamak.index);
      // YENİ (teşhis): her hane için en koyu 2 adayı ve aralarındaki farkı
      // kaydet — "hangi hane neden belirsiz kaldı" artık görünür.
      basamakTeshis.push(
        'hane' + basamak.index + ':[' +
        sonuc.detay.slice(0, 3).map((d) => d.deger + '=' + d.oran.toFixed(3)).join(',') +
        ']->' + (sonuc.deger === null ? 'BELİRSİZ' : sonuc.deger)
      );
      if (sonuc.deger === null) {
        // Belirsiz basamak: boş (işaretsiz) kabul et, '0' yaz.
        // Böylece "??19" yerine "0019" üretilir → parseInt → 19.
        numara += '0';
        // tamOkunduMu'yu false yapmıyoruz: bu basamak gerçekten boştu.
      } else {
        numara += String(sonuc.deger);
      }
    }
    _sonNumaraTeshis = basamakTeshis.join(' | ');
    return { numara, tamOkunduMu };
  }

  /**
   * Numara basamakları için eşiksiz seçici.
   * En koyu baloncuğu döndürür. İşaretli baloncuk ile işaretsizler
   * arasındaki fark en az MIN_FARK olmalı; yoksa belirsiz sayılır.
   *
   * DÜZELTME (kök neden — "her seferinde farklı/az öğrenci numarası"
   * hatası): bu fonksiyon önceden HER baloncuğu, sütun için hiçbir
   * dikey-kayma düzeltmesi yapmadan, aramaOrani=1.3 (yani ±1.3×yarıçap)
   * ile bağımsız arıyordu. Ama numara sütunundaki 0-9 baloncukları
   * arasındaki GERÇEK dikey mesafe sadece 2.5×yarıçap'tır (bkz.
   * layoutEngine.js numaraAlaniHesapla: hucreYukseklik=5×ölçek,
   * baloncukYaricap=2×ölçek). ±1.3r'lik arama, yarı-mesafeyi (1.25r) bile
   * aşıyor — işaretsiz bir hanenin araması, hemen üstündeki/altındaki
   * işaretli komşu haneye "kayabiliyor". Fotoğraftaki en ufak açı/kağıt
   * eğriliği farkı bu kaymanın yönünü değiştirdiğinden, aynı kağıt bile
   * çekimden çekime farklı (veya boş) numara üretiyordu.
   *
   * Hemen yanındaki Kitapçık Türü/Form Kodu okuyucusu
   * (baloncukGrubundanEnKoyuyuSec) bu tuzağa düşmüyordu çünkü (a) tek tek
   * baloncuklara bakmadan ÖNCE tüm sütunu satirIcinDikeyKaymaBul ile doğru
   * satıra kilitliyor, (b) çok daha dar bir pencere (aramaOrani=0.5)
   * kullanıyor. Aynı güvenli deseni burada da uyguluyoruz.
   */
  // (bkz. dosya başındaki _radyalProfilSatirlari tanımı — burada yeniden bildirilmiyor)

  function _basamakEnKoyusu(cImageData, bubbles, ppmm, haneIndex) {
    // YENİ: 0.04 -> 0.02 -> artık sabit değil, Ayarlar sheet'inden canlı
    // okunur (bkz. _numaraMinFarkGetir). Marjinal kontrastlı fotoğraflarda
    // (bkz. Koyuluk özeti) doğru basamak ile ikincisi arasındaki fark küçük
    // kalıp "belirsiz/0" yazılabiliyordu (gözlemlenen: "103" -> "3", ilk iki
    // hane boş sayıldı).
    const MIN_FARK = _numaraMinFarkGetir();

    const sikler = bubbles.map(function(b) {
      return { px: b.cx * ppmm, py: b.cy * ppmm, pr: b.r * ppmm };
    });

    // ADIM 1: baloncukGrubundanEnKoyuyuSec ile AYNI mantık — basılı çember
    // sinyaline bakarak sütunun tamamını (öğrencinin işaretinden bağımsız
    // olarak) doğru dikey konuma kilitle.
    let dy = 0;
    if (sikler.length >= 2) {
      const yler = sikler.map((s) => s.py).sort((a, b) => a - b);
      const araliklar = [];
      for (let i = 1; i < yler.length; i++) araliklar.push(yler[i] - yler[i - 1]);
      // KÖK NEDEN SAĞLAMLAŞTIRMASI (Çözüm Planı, Ağustos 2026): ortAralik
      // önceden ARİTMETİK ORTALAMA idi — 0-9 arası 10 baloncuğun 9
      // aralığından TEK biri (ör. baskı/tarama gürültüsünden kaynaklı bir
      // sapma) diğer 8'ine göre belirgin farklı çıksa bile ortalamayı çekip
      // satirIcinDikeyKaymaBul'un kilitlendiği referans mesafeyi
      // kaydırabiliyordu. MEDYAN, tek bir aykırı aralığa karşı çok daha
      // dayanıklı.
      araliklar.sort((a, b) => a - b);
      const ortAralik = araliklar.length % 2 === 1
        ? araliklar[(araliklar.length - 1) / 2]
        : (araliklar[araliklar.length / 2 - 1] + araliklar[araliklar.length / 2]) / 2;
      if (ortAralik > 0) {
        dy = satirIcinDikeyKaymaBul(cImageData, sikler, ortAralik, false, false);
      }
    }

    // ADIM 2: sütun-kilitli konum etrafında, HER hane için dar bir pencerede
    // (aramaOrani=0.5 — komşu haneye taşmayacak kadar küçük, ADIM 1 zaten
    // kaba hizalamayı düzelttiğinden geniş bir pencereye gerek yok) gerçek
    // dolgu oranını ölç.
    const sonuclar = bubbles.map(function(b, i) {
      const px = sikler[i].px;
      const py = sikler[i].py + dy;
      const pr = sikler[i].pr;
      const s = baloncukKaranlikOraniYerelArama(cImageData, px, py, pr, 0.5, 0.12);
      return { deger: b.deger !== undefined ? b.deger : b.harf, oran: s.oran, cx: px + s.dx, cy: py + s.dy, r: pr };
    });
    sonuclar.sort(function(a, b) { return b.oran - a.oran; });

    // YENİ (teşhis): HER hane için, en koyu adayın GERÇEK yarıçap-koyuluk
    // profilini kaydet — "harf etkisi tam nerede bitiyor, işaretli/işaretsiz
    // arada nasıl farklılaşıyor" sorusuna tek bir taramada, tüm hanelerden
    // gerçek veriyle cevap vermek için.
    if (sonuclar.length) {
      const enKoyuAday = sonuclar[0];
      _radyalProfilSatirlari.push(
        'hane' + haneIndex + ' aday=' + enKoyuAday.deger + ' oran=' + enKoyuAday.oran.toFixed(3) +
        ' dilimler(0->1.0r,10): ' +
        radyalKoyulukProfili(cImageData, enKoyuAday.cx, enKoyuAday.cy, enKoyuAday.r)
      );
    }

    const birinci = sonuclar[0];
    const ikinci = sonuclar[1];
    // İkinci yoksa (tek baloncuk) veya fark yeterliyse seç
    if (!birinci) return { deger: null, guven: 0, detay: sonuclar };
    // YENİ: mutlak sinyal eşiği — cevap okumadaki KARANLIK_ESIK mantığının
    // numara karşılığı. Birinci adayın oranı bu eşiğin altındaysa hane
    // BOŞ sayılır, farka hiç bakılmaz (fark ne kadar büyük olursa olsun,
    // 0.28 vs 0.05 gibi bir fark da "kesin" değildir — sadece gürültünün
    // en yüksek ucudur, gerçek öğrenci işareti değildir).
    const NUMARA_KOYULUK_ESIK = _numaraKoyulukEsikGetir();
    if (birinci.oran < NUMARA_KOYULUK_ESIK) {
      return { deger: null, guven: birinci.oran, detay: sonuclar };
    }
    const fark = ikinci ? (birinci.oran - ikinci.oran) : 1;
    if (fark < MIN_FARK) return { deger: null, guven: birinci.oran, detay: sonuclar };
    return { deger: birinci.deger, guven: birinci.oran, detay: sonuclar };
  }

  /**
   * YENİ (teşhis): bir baloncuğun merkezinden dış kenarına kadar, yarıçapın
   * onda birlik dilimlerinde ORTALAMA isaretKoyulukPuani'nı ölçer (ince bir
   * halka olarak, kümülatif değil — her dilim SADECE kendi bandını ölçer).
   *
   * NEDEN: baloncukKaranlikOrani'ndaki merkezDiskYaricap (0.42r) kesimi,
   * basılı harfin VEKTÖR boyutuna göre tahmin edilmişti — ama gerçek
   * fotoğrafta mürekkep yayılması + JPEG/kamera bulanıklığı harfin
   * karanlığını bu tahminden daha geniş bir alana taşıyor olabilir. Kör
   * kör bir üçüncü yarıçap tahmini yapmak yerine, GERÇEK profili ölçüp
   * "harf etkisi tam olarak nerede bitiyor, temiz kağıt nerede başlıyor"
   * sorusuna kesin cevap alıyoruz.
   */
  function radyalKoyulukProfili(cImageData, cx, cy, r) {
    const { width, height, data } = cImageData;
    const dilimSayisi = 10;
    const sonuc = [];
    for (let i = 0; i < dilimSayisi; i++) {
      const icR = r * (i / dilimSayisi);
      const disR = r * ((i + 1) / dilimSayisi);
      const x0 = Math.max(0, Math.floor(cx - disR));
      const x1 = Math.min(width - 1, Math.ceil(cx + disR));
      const y0 = Math.max(0, Math.floor(cy - disR));
      const y1 = Math.min(height - 1, Math.ceil(cy + disR));
      let toplam = 0, sayac = 0;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx, dy = y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 >= icR * icR && d2 <= disR * disR) {
            toplam += isaretKoyulukPuani(data, (y * width + x) * 4);
            sayac++;
          }
        }
      }
      sonuc.push((sayac > 0 ? toplam / sayac : 0).toFixed(3));
    }
    return sonuc.join(',');
  }


  function carpiklikIsaretiOto(a, b, c) {
    const v1x = b.x - a.x, v1y = b.y - a.y;
    const v2x = c.x - b.x, v2y = c.y - b.y;
    return v1x * v2y - v1y * v2x;
  }

  function icAciDereceOto(a, b, c) {
    const ux = a.x - b.x, uy = a.y - b.y;
    const vx = c.x - b.x, vy = c.y - b.y;
    const uLen = Math.sqrt(ux * ux + uy * uy) || 1e-9;
    const vLen = Math.sqrt(vx * vx + vy * vy) || 1e-9;
    const cosAci = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (uLen * vLen)));
    return Math.acos(cosAci) * (180 / Math.PI);
  }

  /** 4 nokta (sol-ust,sag-ust,sol-alt,sag-alt sırasıyla) dışbükey ve makul açılı mı? */
  function konveksVeSaglikliMiOto(dortNokta) {
    const cevre = [dortNokta[0], dortNokta[1], dortNokta[3], dortNokta[2]];
    const n = cevre.length;
    const isaretler = [];
    const acilar = [];
    for (let i = 0; i < n; i++) {
      const a = cevre[(i + n - 1) % n];
      const b = cevre[i];
      const c = cevre[(i + 1) % n];
      isaretler.push(Math.sign(carpiklikIsaretiOto(a, b, c)));
      acilar.push(icAciDereceOto(a, b, c));
    }
    const konveks = isaretler.every((s) => s === isaretler[0]) && isaretler[0] !== 0;
    const acilarSaglikli = acilar.every((a) => a > 20 && a < 160);
    return konveks && acilarSaglikli;
  }

  /**
   * QR'ye TAMAMEN ihtiyaç duymadan, sayfanın 4 köşe hizalama karesini
   * doğrudan fotoğrafta arayıp (sayfaKoseleriniAra) bir homografi/afin
   * dönüşüm kurar. Doğrulama mantığı (leave-one-out tutarlılık + konvekslik)
   * formuOtomatikDuzlestir ile AYNI — sadece kabaH'sız (QR kaldırıldı),
   * bootstrap'i yerine doğrudan bulunan köşeler arasındaki mesafeden
   * fotoğraf ölçeği (piksel/mm) kestiriliyor.
   */
  /**
   * YENİ: Canlı önizlemede güvenilir çalıştığı defalarca doğrulanan CV
   * (OpenCV.js, tam çerçeve kontur) yöntemini nihai okumada da kullanır.
   * Eski sayfaKoseleriniAra() (4 ayrı köşe penceresi) sayfa altında boş
   * alan olduğunda cevap ızgarasının bittiği yere kilitlenip GERÇEK sayfa
   * köşesini kaçırabiliyordu (gözlemlenen: bulunan dörtgen A4 oranına
   * hiç uymuyordu). Tam çerçeve konturu bu sorunu yaşamaz — sayfanın
   * TAMAMININ en büyük dörtgenini bulur, alt boşluk onu etkilemez.
   * CV bulduğu noktalar ÇERÇEVE ÇİZGİSİNİN köşesidir (hizalama karesinin
   * merkezi DEĞİL — aradaki ~7mm için bkz. sayfaKoseleriniAra) — bu yüzden
   * her köşe, etrafında küçük bir pencerede enBuyukKareBlobuBul ile
   * GERÇEK kareye inceltiliyor (aynı "tohum + inceltme" deseni).
   * Saf-JS motoru (window.CvSaf/sayfaTespitCV.js, Ağustos 2026'da
   * OpenCV.js'in yerine geçti) henüz hazır değilse eski yönteme sessizce
   * düşülür — ama artık senkron olduğu için bu pratikte hemen hiç
   * gerçekleşmez (bkz. sayfaTespitCV.js:cvHazirBekle).
   */
  /**
   * Sol-orta ve sağ-orta hizalama karelerini arar.
   * 4 köşe bulunmuşsa onlardan interpolasyon yaparak arama penceresi konumlandırır.
   */
  function _ortaKareleriAra(fotoImageData, form, cerceve, pxPerMmTahmini) {
    const sonuc = { solOrta: null, sagOrta: null };
    if (!cerceve.solUst || !cerceve.solAlt || !cerceve.sagUst || !cerceve.sagAlt) return sonuc;

    // KÖK NEDEN SAĞLAMLAŞTIRMASI (Çözüm Planı, Ağustos 2026): PENCERE sabit
    // 30px'ti — düşük çözünürlüklü bir fotoğrafta bu çok BÜYÜK kalıp yanlış
    // bir blob'u yakalayabiliyor, yüksek çözünürlüklü (ör. 12MP) bir
    // fotoğrafta ise çok KÜÇÜK kalıp orta kare bu pencerenin dışına taşarsa
    // hiç bulunamıyordu. sayfaKoseleriniAraHibrit'teki INCELTME_YARICAP ile
    // AYNI mantıkla (~16mm karşılığı), çağıranın ilettiği kaba px/mm
    // tahminine göre hesaplanıyor.
    const oranli = pxPerMmTahmini && pxPerMmTahmini > 0 ? pxPerMmTahmini : 4;
    const PENCERE = Math.max(20, 16 * oranli); // px (analiz çözünürlüğünde)

    // Sol orta: solUst ile solAlt arasının ortası
    const solOrtaX = (cerceve.solUst.x + cerceve.solAlt.x) / 2;
    const solOrtaY = (cerceve.solUst.y + cerceve.solAlt.y) / 2;
    sonuc.solOrta = enBuyukKareBlobuBul(
      fotoImageData,
      solOrtaX - PENCERE, solOrtaY - PENCERE,
      solOrtaX + PENCERE, solOrtaY + PENCERE,
      solOrtaX, solOrtaY
    );

    // Sağ orta: sagUst ile sagAlt arasının ortası
    const sagOrtaX = (cerceve.sagUst.x + cerceve.sagAlt.x) / 2;
    const sagOrtaY = (cerceve.sagUst.y + cerceve.sagAlt.y) / 2;
    sonuc.sagOrta = enBuyukKareBlobuBul(
      fotoImageData,
      sagOrtaX - PENCERE, sagOrtaY - PENCERE,
      sagOrtaX + PENCERE, sagOrtaY + PENCERE,
      sagOrtaX, sagOrtaY
    );

    return sonuc;
  }

  // AĞUSTOS 2026 — PERFORMANS KÖK SEBEP DÜZELTMESİ: sayfaKoseleriniAraCV
  // (saf-JS motoru, cvSaf.js) TAM ÇÖZÜNÜRLÜKTE (fotoImageData, kamera
  // native boyutu — 1920x1080 tipik, bazı telefonlarda 4K) çağrıldığında
  // sunucu ortamında bile ~650-1750ms, telefon üzerinde tahminen 1.3-8.7
  // SANİYE sürüyordu. camera.js'deki canlı önizleme göstergesi TUR
  // 22'de 640px'e düşürülmüştü ama BU fonksiyon (asıl OMR okuması
  // sırasında çağrılan köşe tespiti) o değişiklikten ETKİLENMEMİŞTİ —
  // "kağıdı düz tutup uzun süre bekliyorum" şikayetinin gerçek kaynağı
  // burasıydı. Çözüm: kaba köşe taramasını KÜÇÜLTÜLMÜŞ bir görüntüde
  // yap, sonucu tam çözünürlüğe geri ölçekle — enBuyukKareBlobuBul
  // (inceltme adımı) zaten tam çözünürlükte, köşe civarında dar bir
  // pencerede çalışıyor, o hassasiyeti kaybetmiyoruz.
  const KOSE_ARAMA_ANALIZ_GENISLIK = 640; // camera.js:KOSE_TESPIT_ANALIZ_GENISLIK ile aynı değer — tutarlılık için

  /**
   * fotoImageData'yı KOSE_ARAMA_ANALIZ_GENISLIK genişliğine küçültür.
   * Zaten bu genişlikten küçükse (nadiren, düşük çözünürlüklü galeri
   * fotoğrafı olabilir) hiç küçültme yapmadan olduğu gibi döner.
   * Döner: { imageData, olcek } — olcek: küçük→büyük dönüşüm çarpanı
   * (küçük görüntüdeki bir koordinatı tam çözünürlüğe çevirmek için
   * BÖLÜNMEZ, ÇARPILIR: buyukX = kucukX * olcek).
   */
  function _kucukAnalizGoruntusuUret(fotoImageData) {
    const { width, height } = fotoImageData;
    if (width <= KOSE_ARAMA_ANALIZ_GENISLIK) {
      return { imageData: fotoImageData, olcek: 1 };
    }
    const olcekKucult = KOSE_ARAMA_ANALIZ_GENISLIK / width;
    const kGenislik = KOSE_ARAMA_ANALIZ_GENISLIK;
    const kYukseklik = Math.round(height * olcekKucult);

    // fotoImageData'yı geçici bir canvas'a çiz, sonra küçük boyutta
    // tekrar bir canvas'a çizip ImageData'sını al (ImageData'dan
    // doğrudan küçültme yapan bir API yok, canvas üzerinden gitmek
    // gerekiyor — putImageData + drawImage).
    const kaynakCanvas = document.createElement('canvas');
    kaynakCanvas.width = width;
    kaynakCanvas.height = height;
    kaynakCanvas.getContext('2d').putImageData(fotoImageData, 0, 0);

    const kucukCanvas = document.createElement('canvas');
    kucukCanvas.width = kGenislik;
    kucukCanvas.height = kYukseklik;
    const kctx = kucukCanvas.getContext('2d', { willReadFrequently: true });
    kctx.drawImage(kaynakCanvas, 0, 0, kGenislik, kYukseklik);

    return { imageData: kctx.getImageData(0, 0, kGenislik, kYukseklik), olcek: width / kGenislik };
  }

  function sayfaKoseleriniAraHibrit(fotoImageData, hassasiyet, form) {
    if (typeof window.SayfaTespitCV === 'undefined' || !window.SayfaTespitCV.cvHazirMi()) {
      return sayfaKoseleriniAra(fotoImageData, hassasiyet);
    }
    try {
      // YENİ (Sedat isteği, Ağustos 2026: "Köşe yakalayıcılar her formda
      // aktif çalışsın") — önceden bu fonksiyon her zaman A4 oranı/210mm
      // genişlik varsayıyordu, Optik Form Editörü ile A4-dışı (A5/A6/A7/
      // Özel Boyut) tasarlanmış formlarda köşe tespiti sessizce reddedip
      // eski (daha zayıf) yönteme düşüyordu. Artık formun GERÇEK sayfa
      // boyutunu (form.bolge) kullanıyor.
      const sayfaGenislikMM = (form && form.bolge && form.bolge.width) || 210;
      const sayfaYukseklikMM = (form && form.bolge && form.bolge.height) || 297;
      const beklenenOranlar = window.SayfaTespitCV.oranlariHesapla(sayfaGenislikMM, sayfaYukseklikMM);

      // Kaba tarama KÜÇÜLTÜLMÜŞ görüntüde (bkz. yukarıdaki performans notu)
      const { imageData: kucukImageData, olcek } = _kucukAnalizGoruntusuUret(fotoImageData);
      const kucukCerceve = window.SayfaTespitCV.sayfaKoseleriniAraCV(kucukImageData, null, null, beklenenOranlar);
      if (!kucukCerceve || !kucukCerceve.solUst || !kucukCerceve.sagUst || !kucukCerceve.solAlt || !kucukCerceve.sagAlt) {
        return sayfaKoseleriniAra(fotoImageData, hassasiyet);
      }
      // Küçük görüntüdeki köşe koordinatlarını TAM ÇÖZÜNÜRLÜĞE geri ölçekle
      // — enBuyukKareBlobuBul (aşağıdaki inceltme adımı) tam çözünürlükteki
      // fotoImageData üzerinde çalışıyor, koordinatların da o uzayda olması
      // gerekiyor.
      const olcekle = (p) => ({ x: p.x * olcek, y: p.y * olcek });
      const cerceve = {
        solUst: olcekle(kucukCerceve.solUst),
        sagUst: olcekle(kucukCerceve.sagUst),
        solAlt: olcekle(kucukCerceve.solAlt),
        sagAlt: olcekle(kucukCerceve.sagAlt),
      };
      // Kaba ölçek: üst kenar uzunluğu ~ (sayfa genişliği - 2*CERCEVE_PAY)
      // kabul edilip px/mm kestiriliyor — sadece inceltme penceresini
      // boyutlandırmak için. Önceden hep "210mm - 8mm" (A4) sabitti.
      const ustGenislikPx = Math.hypot(cerceve.sagUst.x - cerceve.solUst.x, cerceve.sagUst.y - cerceve.solUst.y);
      const pxPerMmTahmini = ustGenislikPx / Math.max(20, sayfaGenislikMM - 8);
      const INCELTME_YARICAP = Math.max(25, 16 * pxPerMmTahmini); // ~16mm

      function inceltVeDon(nokta, disKoseX, disKoseY) {
        const ince = enBuyukKareBlobuBul(
          fotoImageData,
          nokta.x - INCELTME_YARICAP, nokta.y - INCELTME_YARICAP,
          nokta.x + INCELTME_YARICAP, nokta.y + INCELTME_YARICAP,
          disKoseX, disKoseY, hassasiyet
        );
        return ince || nokta; // bulunamazsa çerçeve köşesini (kabaca) kullan
      }

      return {
        solUst: inceltVeDon(cerceve.solUst, cerceve.solUst.x, cerceve.solUst.y),
        sagUst: inceltVeDon(cerceve.sagUst, cerceve.sagUst.x, cerceve.sagUst.y),
        solAlt: inceltVeDon(cerceve.solAlt, cerceve.solAlt.x, cerceve.solAlt.y),
        sagAlt: inceltVeDon(cerceve.sagAlt, cerceve.sagAlt.x, cerceve.sagAlt.y),
      };
    } catch (e) {
      console.error('[OMR] CV köşe tespiti hata verdi, eski yönteme düşülüyor:', e);
      return sayfaKoseleriniAra(fotoImageData, hassasiyet);
    }
  }

  // ---------------------------------------------------------------------
  // 8.8) 6-NOKTA GEOMETRİK DOĞRULAMA (Ağustos 2026)
  // ---------------------------------------------------------------------
  // Native liboptikokuyucu.so analizindeki "nirengi -> geometrik doğrulama
  // -> perspektif" ayrımını web OMR motoruna taşıyan güvenlik katmanı.
  //
  // Temel fikir: 4 köşe işaretinden TAM projektif homografi kurulur; sol-orta
  // ve sağ-orta işaretlerin fotoğrafta olması GEREKEN konum bu homografiyle
  // tahmin edilir. Gerçekte bulunan orta işaret tahminden ne kadar sapıyorsa
  // geometri o kadar güvensizdir. Projektif dönüşüm doğruları koruduğu için
  // ayrıca orta işaretin kendi kenar doğrusundan dik uzaklığı da ölçülür.
  // Böylece "yanlış blob bulundu ama 4 köşe var" durumu cevap okumaya geçmeden
  // yakalanır.
  const HIZALAMA_GUVEN_ESIK_YUKSEK = 0.85;
  const HIZALAMA_GUVEN_ESIK_RED = 0.65;

  function _sinirla01(v) { return Math.max(0, Math.min(1, v)); }

  function _noktaninDogruyaUzakligiPx(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const payda = Math.hypot(dx, dy);
    if (payda < 1e-9) return Infinity;
    return Math.abs(dx * (a.y - p.y) - (a.x - p.x) * dy) / payda;
  }

  function _alMap(liste, anahtar) {
    const m = {};
    for (const x of liste || []) m[x[anahtar]] = x;
    return m;
  }

  /**
   * @returns {{guven:number,durum:string,detay:object,homografi4:array|null}}
   */
  function altiNoktaGeometrisiniDogrula(hizalamaMM, konumEslesme, ppmm, pikselPerMM) {
    const beklenenMap = _alMap(hizalamaMM, 'konum');
    const gozlenen = konumEslesme || {};
    const tumAdlar = ['sol-ust','sag-ust','sol-alt','sag-alt','sol-orta','sag-orta'];
    const koseAdlari = ['sol-ust','sag-ust','sag-alt','sol-alt'];
    const bulunanAdlar = tumAdlar.filter(ad => !!gozlenen[ad]);
    const eksikAdlar = tumAdlar.filter(ad => !gozlenen[ad]);
    const dortKoseTam = koseAdlari.every(ad => !!gozlenen[ad] && !!beklenenMap[ad]);

    const detay = {
      bulunan: bulunanAdlar.length,
      toplam: tumAdlar.length,
      bulunanAdlar,
      eksikAdlar,
      dortKoseTam,
      ortaArtiklariMM: [],
      kenarSapmalariMM: [],
      ortalamaOrtaArtikMM: null,
      maksimumOrtaArtikMM: null,
      konveks: false,
      puanlar: {},
    };

    if (!dortKoseTam) {
      // 4 temel köşe olmadan 6-nokta doğrulaması projektif olarak yapılamaz.
      // Affine fallback eski formlar/manuel kurtarma için motor içinde kalır,
      // fakat otomatik güven skoru bunu güvenli kabul etmez.
      const markerPuani = bulunanAdlar.length / 6;
      const guven = _sinirla01(markerPuani * 0.35);
      detay.puanlar = { marker: markerPuani, geometri: 0, konveks: 0 };
      return { guven, durum: 'red', detay, homografi4: null };
    }

    // Homografi kaynağı: form üzerindeki gerçek marker merkezleri (canonical px).
    const kaynak4 = koseAdlari.map(ad => ({
      x: beklenenMap[ad].nokta.x * ppmm,
      y: beklenenMap[ad].nokta.y * ppmm,
    }));
    const hedef4 = koseAdlari.map(ad => gozlenen[ad]);

    let H4 = null;
    try { H4 = homografiHesapla(kaynak4, hedef4); } catch (e) { H4 = null; }
    detay.konveks = konveksVeSaglikliMiOto([
      gozlenen['sol-ust'], gozlenen['sag-ust'], gozlenen['sol-alt'], gozlenen['sag-alt']
    ]);
    if (!H4 || !detay.konveks) {
      const markerPuani = bulunanAdlar.length / 6;
      const guven = _sinirla01(markerPuani * 0.35 + (detay.konveks ? 0.15 : 0));
      detay.puanlar = { marker: markerPuani, geometri: 0, konveks: detay.konveks ? 1 : 0 };
      return { guven, durum: 'red', detay, homografi4: H4 };
    }

    const olcek = (pikselPerMM && pikselPerMM > 0) ? pikselPerMM : ppmm;
    const ortaTanimlari = [
      { ad:'sol-orta', ust:'sol-ust', alt:'sol-alt' },
      { ad:'sag-orta', ust:'sag-ust', alt:'sag-alt' },
    ];
    for (const t of ortaTanimlari) {
      if (!gozlenen[t.ad] || !beklenenMap[t.ad]) continue;
      const kanonik = beklenenMap[t.ad].nokta;
      const tahmin = noktayiDonustur(H4, kanonik.x * ppmm, kanonik.y * ppmm);
      const gercek = gozlenen[t.ad];
      const artikMM = Math.hypot(tahmin.x - gercek.x, tahmin.y - gercek.y) / olcek;
      const kenarMM = _noktaninDogruyaUzakligiPx(gercek, gozlenen[t.ust], gozlenen[t.alt]) / olcek;
      detay.ortaArtiklariMM.push({ konum:t.ad, artikMM, tahmin, gercek });
      detay.kenarSapmalariMM.push({ konum:t.ad, sapmaMM:kenarMM });
    }

    if (detay.ortaArtiklariMM.length) {
      const vals = detay.ortaArtiklariMM.map(x => x.artikMM);
      detay.ortalamaOrtaArtikMM = vals.reduce((a,b)=>a+b,0) / vals.length;
      detay.maksimumOrtaArtikMM = Math.max(...vals);
    }

    // Puanlama:
    // - 4 köşe var ama orta işaretlerin ikisi de yoksa marker puanı 4/6 ve
    //   toplam güven bilinçli olarak RED sınırının altında kalır.
    // - Orta residual 0-2mm çok iyi, 4mm civarı kontrol, 8mm+ güvensizdir.
    const markerPuani = bulunanAdlar.length / 6;
    let geometriPuani = 0;
    if (detay.ortaArtiklariMM.length) {
      const ort = detay.ortalamaOrtaArtikMM || 0;
      const maks = detay.maksimumOrtaArtikMM || 0;
      const residualPuan = _sinirla01(1 - ort / 8);
      const maxPuan = _sinirla01(1 - Math.max(0, maks - 2) / 10);
      const kenarOrt = detay.kenarSapmalariMM.length
        ? detay.kenarSapmalariMM.reduce((a,x)=>a+x.sapmaMM,0) / detay.kenarSapmalariMM.length : 99;
      const kenarPuan = _sinirla01(1 - kenarOrt / 5);
      geometriPuani = residualPuan * 0.60 + maxPuan * 0.20 + kenarPuan * 0.20;
      // Sadece tek orta marker doğrulandıysa geometrinin kanıt gücünü düşür.
      if (detay.ortaArtiklariMM.length === 1) geometriPuani *= 0.82;
    }

    const konveksPuani = detay.konveks ? 1 : 0;
    const guven = _sinirla01(markerPuani * 0.30 + geometriPuani * 0.55 + konveksPuani * 0.15);
    const durum = guven >= HIZALAMA_GUVEN_ESIK_YUKSEK ? 'guvenli'
      : guven >= HIZALAMA_GUVEN_ESIK_RED ? 'kontrol'
      : 'red';
    detay.puanlar = { marker: markerPuani, geometri: geometriPuani, konveks: konveksPuani };
    return { guven, durum, detay, homografi4: H4 };
  }

  function formuOtomatikDuzlestir(fotoImageData, form, ppmm) {
    const bulunanlar = sayfaKoseleriniAraHibrit(fotoImageData, undefined, form);

    // KÖK NEDEN SAĞLAMLAŞTIRMASI (Çözüm Planı, Ağustos 2026): sayfaKoseleriniAraHibrit
    // içindeki INCELTME_YARICAP zaten fotoğraf çözünürlüğünden bağımsız
    // (mm-bazlı) hale getirilmişti, ama _ortaKareleriAra'nın arama penceresi
    // sabit 30px olarak kalmıştı — aynı kaba px/mm tahminini burada da
    // (bulunan sol-üst/sağ-üst köşe mesafesinden) çıkarıp ona iletiyoruz.
    const sayfaGenislikMM = (form && form.bolge && form.bolge.width) || 210;
    const pxPerMmTahminiOrta = (bulunanlar.solUst && bulunanlar.sagUst)
      ? Math.hypot(bulunanlar.sagUst.x - bulunanlar.solUst.x, bulunanlar.sagUst.y - bulunanlar.solUst.y) / Math.max(20, sayfaGenislikMM - 8)
      : ppmm;

    // Orta kareleri de ara (varsa — yeni formlarda sol-orta/sag-orta mevcut)
    const ortaKareler = _ortaKareleriAra(fotoImageData, form, bulunanlar, pxPerMmTahminiOrta);

    const konumEslesme = {
      'sol-ust': bulunanlar.solUst,
      'sag-ust': bulunanlar.sagUst,
      'sol-alt': bulunanlar.solAlt,
      'sag-alt': bulunanlar.sagAlt,
      'sol-orta': ortaKareler.solOrta,
      'sag-orta': ortaKareler.sagOrta,
    };

    const hizalamaMM = hizalamaMerkezleriMM(form);
    const hassasKaynak = [];
    const hassasHedef = [];
    const bulunanKonumlar = [];
    const bulunamayanIsaretler = [];

    for (const isaret of hizalamaMM) {
      const bulunan = konumEslesme[isaret.konum];
      if (bulunan) {
        hassasKaynak.push({ x: isaret.nokta.x * ppmm, y: isaret.nokta.y * ppmm });
        hassasHedef.push(bulunan);
        bulunanKonumlar.push(isaret.konum);
      } else {
        bulunamayanIsaretler.push(isaret.konum);
      }
    }

    const dortKoseDeBulundu = hassasKaynak.length >= 4;
    const ucKoseBulundu = hassasKaynak.length === 3;

    // Foto ölçeği (piksel/mm): bulunan işaretler arası mesafeden kestiriliyor
    // — kabaH olmadığı için bu, tutarlılık artıklarını mm'ye çevirmek için
    // gereken tek referans.
    // KÖK NEDEN SAĞLAMLAŞTIRMASI (Çözüm Planı, Ağustos 2026): önceden ölçek
    // SADECE bulunan ilk İKİ işaretin (hassasKaynak[0]/[1]) arasındaki
    // mesafeden kestiriliyordu. Bu ikisi hangi konumlarda bulunduysa (ör.
    // sadece sol-üst + sol-alt gibi kısa/dar bir taban) o çiftin piksel
    // gürültüsü DOĞRUDAN ölçeğe yansıyordu — 3, 4 hatta 6 işaret bulunmuş
    // olsa bile geri kalanlar hiç kullanılmıyordu. Artık bulunan TÜM işaret
    // çiftleri (2+ işaret varsa) kullanılıyor: her çiftin piksel ve mm
    // mesafesi toplanıp oranı alınıyor — bu, uzun taban çiftlerine doğal
    // olarak daha fazla ağırlık verir (kısa/gürültülü çiftler payı azdır),
    // basit ortalamadan daha kararlıdır.
    let pikselPerMM = ppmm; // güvenli varsayılan (bulunamazsa)
    if (hassasKaynak.length >= 2) {
      let toplamKaynakMM = 0;
      let toplamHedefPx = 0;
      for (let i = 0; i < hassasKaynak.length; i++) {
        for (let j = i + 1; j < hassasKaynak.length; j++) {
          const kaynakMesafeMM = Math.hypot(hassasKaynak[j].x - hassasKaynak[i].x, hassasKaynak[j].y - hassasKaynak[i].y) / ppmm;
          if (kaynakMesafeMM <= 1) continue; // çok yakın çiftler gürültüye açık, atla
          const hedefMesafePx = Math.hypot(hassasHedef[j].x - hassasHedef[i].x, hassasHedef[j].y - hassasHedef[i].y);
          toplamKaynakMM += kaynakMesafeMM;
          toplamHedefPx += hedefMesafePx;
        }
      }
      if (toplamKaynakMM > 0) pikselPerMM = toplamHedefPx / toplamKaynakMM;
    }

    // 6-nokta doğrulaması H seçilmeden ÖNCE yapılır. Özellikle önemli:
    // homografiHesapla() TAM 4 nokta beklediği için eski kod 6 marker'ın
    // tamamını hassasKaynak/hassasHedef dizileriyle ona gönderdiğinde hata
    // alabiliyordu. Artık tam homografi HER ZAMAN 4 köşe markerından kurulur;
    // iki orta marker ise bağımsız doğrulama kanıtı olarak kullanılır.
    const geometri6 = altiNoktaGeometrisiniDogrula(hizalamaMM, konumEslesme, ppmm, pikselPerMM);

    const disariBirakilanIsaretler = [];
    let artiklarMM = [];
    let H = null;
    let secilenYontem = null; // YENİ (teşhis): hangi dönüşüm yöntemi seçildi

    // Dönüşüm seçimi: 4 köşe varsa gerçek perspektifi modelleyen TAM
    // homografi kullanılır. 5./6. markerlar H'yi kurmak için değil, H'nin
    // doğru olduğunu doğrulamak için ayrılmıştır (native OMR nirengi deseni).
    const koseSirasi = ['sol-ust','sag-ust','sag-alt','sol-alt'];
    const koseKaynak = [];
    const koseHedef = [];
    for (const ad of koseSirasi) {
      const idx = bulunanKonumlar.indexOf(ad);
      if (idx >= 0) { koseKaynak.push(hassasKaynak[idx]); koseHedef.push(hassasHedef[idx]); }
    }

    if (koseKaynak.length === 4 && geometri6.detay.konveks) {
      H = geometri6.homografi4;
      secilenYontem = 'tam homografi (4 köşe) + 6-nokta geometrik doğrulama';
      // Teşhis için 4 köşenin homografi residualı teorik olarak ~0'dır;
      // orta marker residualları daha anlamlıdır ve geometri6'da tutulur.
      artiklarMM = koseSirasi.map(() => 0);
    } else if (koseKaynak.length === 3) {
      try { H = afinHesapla(koseKaynak, koseHedef); } catch (e) { H = null; }
      secilenYontem = 'afin (yalnızca 3 temel köşe bulundu; 6-nokta güvenlik kontrolünü geçemez)';
    }

    const koseBulunduMu = !!H;

    return {
      H,
      hizalamaBulunduMu: koseBulunduMu,
      bulunamayanIsaretler,
      disariBirakilanIsaretler,
      hizalamaKanonikNoktalari: koseBulunduMu ? hassasHedef : null,
      hamBulunanKanonikNoktalari: hassasKaynak.length ? hassasKaynak : null,
      koseArtiklariMM: H
        ? ['sol-ust','sag-ust','sag-alt','sol-alt'].map((konum, i) => ({ konum, artikMM: artiklarMM[i] ?? 0 }))
        : [],
      // YENİ (teşhis alanları):
      secilenYontem,
      bulunanPikselNoktalari: hassasHedef.length
        ? bulunanKonumlar.map((konum, i) => konum + '=(' + hassasHedef[i].x.toFixed(0) + ',' + hassasHedef[i].y.toFixed(0) + ')').join(', ')
        : null,
      pikselPerMM,
      hizalamaGuveni: geometri6.guven,
      hizalamaDurumu: geometri6.durum,
      hizalamaGeometriDetayi: geometri6.detay,
    };
  }

  async function formuOku(kaynak, form, secenekler = {}) {
    const ppmm = secenekler.ppmm || VARSAYILAN_PPMM;
    const uyarilar = [];
    _radyalProfilSatirlari = []; // YENİ (teşhis): her okumada sıfırlanır, her hane için bir satır
    _sonKitapcikTeshis = null; // YENİ (teşhis): her okumada sıfırlanır
    _binaryImageData = null; // önceki okumadan kalan binary temizle
    _yetersizPikselUyarilari = []; // YENİ: "not enough pixels" guard — her okumada sıfırla
    _goruntKaliteUyarilari = [];   // YENİ: parlama/çok koyu uyarıları — her okumada sıfırla

    // Saf-JS motoru (window.CvSaf/sayfaTespitCV.js) SENKRON — WASM
    // indirme/derleme beklemesi YOK (Ağustos 2026'da OpenCV.js'in
    // 10.9MB'lık dosyası kaldırıldı, bkz. cvSaf.js). Bu await artık
    // pratikte anında (<1ms) resolve oluyor — TUR 9'daki "her okuma AYNI
    // yöntemi kullansın, tutarlılık hız kaybından değerlidir" kararı
    // hâlâ geçerli, sadece artık hız kaybı da YOK. Kod bilinçli olarak
    // değiştirilmedi — mekanizma (sayfaTespitCV.js:cvHazirBekle) altta
    // değişti, çağıran kod aynı kaldı.
    if (typeof window.SayfaTespitCV !== 'undefined') {
      await window.SayfaTespitCV.cvHazirBekle();
    }

    const { imageData: fotoImageData } = kaynaktanImageDataAl(kaynak);

    // Parlama / çok koyu ön kontrolü — kağıt düzleştirilmeden önce
    // ham fotoğraf üzerinde çalışır (bkz. isParlamaVarKontrol).
    isParlamaVarKontrol(fotoImageData);

    const { H, bulunamayanIsaretler, disariBirakilanIsaretler, hizalamaKanonikNoktalari, hamBulunanKanonikNoktalari, koseArtiklariMM, secilenYontem, bulunanPikselNoktalari, pikselPerMM, hizalamaGuveni, hizalamaDurumu, hizalamaGeometriDetayi } =
      formuOtomatikDuzlestir(fotoImageData, form, ppmm);

    // Gerçek ölçek: köşelerden hesaplanan pikselPerMM'yi kullan.
    // Böylece A4 formu A5'e küçültülmüş baskıda da, büyütülmüş baskıda da
    // koordinatlar otomatik doğru ölçeklenir — sabit VARSAYILAN_PPMM değil.
    let gercekPpmm = (pikselPerMM && pikselPerMM > 0) ? pikselPerMM : ppmm;

    if (!H) {
      return {
        basarili: false,
        ogrenciKimlik: null,
        cevaplar: [],
        uyarilar: [
          'Sayfanın köşe işaretleri fotoğrafta otomatik olarak bulunamadı ' +
          '(bulunan: ' + (4 - bulunamayanIsaretler.length) + '/4 köşe' +
          (bulunamayanIsaretler.length ? ', eksik: ' + bulunamayanIsaretler.join(', ') : '') +
          '). Kağıdın 4 köşesi de net, gölgesiz ve kadrajın içinde olacak ' +
          'şekilde tekrar deneyin; olmazsa köşe seçim ekranını kullanın.',
        ],
        hataAyiklama: null,
      };
    }

    // 6-nokta kalite kapısı: geometri RED ise cevaplara hiç bakma.
    // Bu, yanlış hizalanmış bir kâğıdın "başarılı" diye kaydedilmesini
    // engeller. 0.65-0.85 arası okumaya izin verilir ama kontrolGerekli=true
    // olarak işaretlenir; üst katman otomatik kaydetmez.
    if (typeof hizalamaGuveni === 'number' && hizalamaGuveni < HIZALAMA_GUVEN_ESIK_RED) {
      const d = hizalamaGeometriDetayi || {};
      return {
        basarili: false,
        kontrolGerekli: false,
        hizalamaGuveni,
        hizalamaDurumu: 'red',
        ogrenciKimlik: null,
        cevaplar: [],
        uyarilar: [
          'Hizalama geometrisi güvenli değil (' + Math.round(hizalamaGuveni * 100) + '/100). ' +
          '6 referans noktasından ' + (d.bulunan || 0) + '/6 bulundu' +
          (d.eksikAdlar && d.eksikAdlar.length ? '; eksik: ' + d.eksikAdlar.join(', ') : '') + '. ' +
          'Kağıdı düzleştirip tüm hizalama kareleri görünür olacak şekilde tekrar tarayın.'
        ],
        hataAyiklama: { hizalamaGeometriDetayi: d },
      };
    }

    const kontrolGerekli = typeof hizalamaGuveni === 'number' && hizalamaGuveni < HIZALAMA_GUVEN_ESIK_YUKSEK;
    if (kontrolGerekli) {
      uyarilar.push('Hizalama güveni orta seviyede: ' + Math.round(hizalamaGuveni * 100) + '/100 — sonuç otomatik kaydedilmeyecek, kullanıcı kontrolü gerekli.');
    } else if (typeof hizalamaGuveni === 'number') {
      uyarilar.push('Hizalama güveni: ' + Math.round(hizalamaGuveni * 100) + '/100 (6-nokta geometrisi doğrulandı).');
    }

    if (koseArtiklariMM && koseArtiklariMM.length) {
      uyarilar.push(
        'Köşe tutarlılık artıkları: ' +
        koseArtiklariMM.map((k) => k.konum + '=' + (Number.isFinite(k.artikMM) ? k.artikMM.toFixed(1) + 'mm' : '∞')).join(', ')
      );
    }

    // YENİ (teşhis): hangi dönüşüm yöntemi seçildi ve köşelerin fotoğraftaki
    // HAM piksel konumları — "tam homografi mi afin mi kullanıldı" artık
    // görünür, kör kutu değil.
    if (secilenYontem) {
      uyarilar.push('Seçilen dönüşüm: ' + secilenYontem);
    }
    if (bulunanPikselNoktalari) {
      uyarilar.push('Köşe piksel konumları (foto): ' + bulunanPikselNoktalari + ' | ölçek≈' + pikselPerMM.toFixed(2) + 'px/mm');
    }

    // (H matrisi kontrolü duzCanvasUret çağrıldıktan SONRA aşağıda eklenecek)

    if (disariBirakilanIsaretler && disariBirakilanIsaretler.length) {
      uyarilar.push(
        'Sayfanın 4 köşesi de bulundu ama biri (' + disariBirakilanIsaretler[0] + ') ' +
        'diğer 3 köşeyle tutarsız çıktığı için dışlanıp kalan 3 köşeden AFİN bir ' +
        'düzeltme kullanıldı — genelde yeterli ama tam homografi kadar hassas ' +
        'olmayabilir.'
      );
    } else if (bulunamayanIsaretler.length === 1) {
      uyarilar.push(
        'Sayfanın 4 köşesinden biri bulunamadı (' + bulunamayanIsaretler[0] + '). ' +
        'Diğer 3 köşeden AFİN bir düzeltme kullanıldı.'
      );
    }

    const { canvas: duzCanvas, imageData: cImageData, ppmmKullanilan } = duzCanvasUret(fotoImageData, H, form, gercekPpmm);
    if (ppmmKullanilan !== gercekPpmm) {
      // Performans sınırı devreye girdi (tuval küçültüldü) — sonraki TÜM
      // piksel<->mm dönüşümlerinin (numaraOku, cevaplariCikar, ...) tuvalle
      // tutarlı kalması için gercekPpmm'i de aynı değere eşitliyoruz.
      uyarilar.push('Fotoğraf çözünürlüğü performans için sınırlandı (≈' + gercekPpmm.toFixed(1) + ' → ' + ppmmKullanilan.toFixed(1) + ' px/mm).');
      gercekPpmm = ppmmKullanilan;
    }

    kontrastNormalizeEt(cImageData);
    duzCanvas.getContext('2d').putImageData(cImageData, 0, 0);
    adaptifEsikle(cImageData);

    // Kimlik: QR yerine Kitapçık+Numara baloncuklarından (elle-köşeli modla aynı yöntem).
    let ogrenciKimlik = null;
    const numaraSonuc = numaraOku(cImageData, form.numaraAlani, gercekPpmm);
    const kitapcikSonuc = kitapcikOku(cImageData, form.kitapcikAlani, gercekPpmm);
    const formKodu = formKoduOku(cImageData, form.formKoduAlani, gercekPpmm);
    if (numaraSonuc) {
      ogrenciKimlik = { ogrenciNo: numaraSonuc.numara, kitapcikTuru: kitapcikSonuc };
      if (!numaraSonuc.tamOkunduMu) {
        uyarilar.push('Öğrenci no baloncukları tam okunamadı (bazı basamaklar belirsiz): ' + numaraSonuc.numara);
      }
    }

    let genelDuzeltme = null;
    if (secenekler.genelDuzeltmeKullan) {
      genelDuzeltme = genelDuzeltmeHesapla(cImageData, form, gercekPpmm);
      if (!genelDuzeltme) {
        uyarilar.push('Izgaranın hizalama işaretleri bulunamadı, sayfa-geneli düzeltme kullanılamadı.');
      }
    }

    const cevaplarSonuc = cevaplariCikar(cImageData, form, gercekPpmm, genelDuzeltme);
    const cevaplar = cevaplarSonuc.cevaplar;
    const birdenFazlaSecenekIsaretleme = cevaplarSonuc.birdenFazlaSecenekIsaretleme;

    // Görüntü kalite uyarıları (parlama / çok koyu) — önce ekle, okuma
    // uyarılarından önce kullanıcı görüntü sorununu fark etsin.
    for (const kUyari of _goruntKaliteUyarilari) uyarilar.unshift(kUyari);

    const belirsizSayisi = cevaplar.filter((c) => c.uyari).length;
    if (belirsizSayisi > 0) {
      uyarilar.push(belirsizSayisi + ' soruda belirsiz/boş/çoklu işaret tespit edildi.');
    }
    if (birdenFazlaSecenekIsaretleme.length > 0) {
      uyarilar.push(
        'birdenFazlaSecenekIsaretleme — ' + birdenFazlaSecenekIsaretleme.length +
        ' soruda birden fazla şık işaretli görünüyor: ' +
        birdenFazlaSecenekIsaretleme.map((b) =>
          (b.ders ? b.ders + ' ' : '') + '#' + b.soruNo +
          ' [' + b.adaylar.map((a) => a.harf + '=' + a.oran).join(',') + ']'
        ).join(', ')
      );
    }
    if (_yetersizPikselUyarilari.length > 0) {
      // Benzersiz bubble-id'leri küçük bir özetle raporla — koordinat
      // kayması olan sütunları hızla tespit etmek için.
      const idler = [...new Set(_yetersizPikselUyarilari.map((u) => u.bubbleId))];
      uyarilar.push(
        'yetersizPiksel — ' + _yetersizPikselUyarilari.length +
        ' baloncuk ROI\'si yeterli piksel içermiyor (koordinat kayması?): ' +
        idler.slice(0, 10).join(', ') + (idler.length > 10 ? '…' : '')
      );
    }
    if (_sonKoyulukOzeti) {
      uyarilar.push('Koyuluk özeti: ' + _sonKoyulukOzeti);
    }
    uyarilar.push('[KOD SÜRÜMÜ: v32-formKaliteMotoru]');
    if (_sonNumaraTeshis) { uyarilar.push('Numara teşhisi: ' + _sonNumaraTeshis); }
    if (_sonKitapcikTeshis) { uyarilar.push('Kitapçık/Form Kodu teşhisi: ' + _sonKitapcikTeshis); }
    if (_cevapTeshisSatirlari.length) { uyarilar.push('Cevap teşhisi (ders başına en fazla 2 örnek):\n' + _cevapTeshisSatirlari.join('\n')); }
    if (_ardisikAyniSikSatirlari.length) { uyarilar.push('⚠ Ardışık aynı şık tespiti:\n' + _ardisikAyniSikSatirlari.join('\n')); }
    if (_radyalProfilSatirlari.length) { uyarilar.push('Radyal koyuluk profili:\n' + _radyalProfilSatirlari.join('\n')); }

    return {
      basarili: true,
      kontrolGerekli,
      hizalamaGuveni,
      hizalamaDurumu,
      ogrenciKimlik,
      formKodu,
      cevaplar,
      bubbleKalite: cevaplarSonuc.bubbleKalite,
      birdenFazlaSecenekIsaretleme, // YENİ: çoklu işaret ayrıntı listesi
      uyarilar,
      hataAyiklama: {
        duzeltilmisCanvas: duzCanvas,
        hizalamaNoktalari: hizalamaKanonikNoktalari,
        hamHizalamaNoktalari: hamBulunanKanonikNoktalari,
        ornekNoktalari: cevaplarSonuc.ornekNoktalari,
        genelDuzeltme,
        hizalamaGeometriDetayi,
      },
    };
  }


  // ---------------------------------------------------------------------
  // 9) ELLE KÖŞE SEÇİMİ (otomatik QR/hizalama tespiti başarısız olduğunda
  //    veya doğrulamak için kullanılan alternatif giriş yolu).
  //
  // Kullanıcı, fotoğraf üzerinde sayfanın 4 köşesindeki dolu kare
  // (hizalama) işaretlerine dokunarak bu 4 pikseli verir. Bu, otomatik
  // QR-tabanlı kaba homografi + hizalama-arama adımlarının HER İKİSİNİ
  // DE atlar — sadece bu 4 nokta ile TAM homografiyi doğrudan kurar.
  // ---------------------------------------------------------------------

  /**
   * @param {object} form
   * @param {{solUst:{x,y}, sagUst:{x,y}, solAlt:{x,y}, sagAlt:{x,y}}} koseler
   *        Fotoğraf piksel koordinatlarında, kullanıcının tıkladığı 4 nokta.
   * @param {number} ppmm
   */
  function homografiElleKoselerdenHesapla(form, koseler, ppmm) {

    // Kullanıcı/CV'nin verdiği köşeler SAYFA DIŞ KÖŞELERİ (CV çerçeve
    // tespiti) veya hizalama kareleri olabilir. Her iki durumda da en
    // güvenilir referans sayfanın kendi 4 köşesidir (bolge 0,0 tabanlı).
    // Canonical canvas'ta (0,0) = sayfanın sol-üst köşesi olduğundan,
    // kaynak olarak tam köşeleri (0,0), (genislik,0) vb. kullanıyoruz.
    const w = form.bolge.width * ppmm;
    const h = form.bolge.height * ppmm;

    const kaynak = [
      { x: 0, y: 0 },   // sol-üst
      { x: w, y: 0 },   // sağ-üst
      { x: w, y: h },   // sağ-alt
      { x: 0, y: h },   // sol-alt
    ];

    const hedef = [koseler.solUst, koseler.sagUst, koseler.sagAlt, koseler.solAlt];

    return homografiHesapla(kaynak, hedef);
  }

  /**
   * formuOku() ile aynı sonucu üretir, ama homografiyi otomatik QR/hizalama
   * tespiti yerine kullanıcının elle seçtiği 4 köşeden kurar.
   * @param {HTMLCanvasElement|HTMLImageElement} kaynak
   * @param {object} form
   * @param {{solUst,sagUst,solAlt,sagAlt}} koseler - foto piksel koordinatları
   * @param {object} secenekler
   */
  async function formuOkuElleKoseli(kaynak, form, koseler, secenekler = {}) {

    const ppmm = secenekler.ppmm || VARSAYILAN_PPMM;
    const uyarilar = ['Köşeler elle seçildi (otomatik hizalama tespiti atlandı).'];
    _radyalProfilSatirlari = [];
    _sonKitapcikTeshis = null;
    _binaryImageData = null;
    _yetersizPikselUyarilari = []; // YENİ: her okumada sıfırla
    _goruntKaliteUyarilari = [];   // YENİ: her okumada sıfırla

    const { imageData: fotoImageData } = kaynaktanImageDataAl(kaynak);

    // Parlama / çok koyu ön kontrolü — düzleştirmeden önce ham fotoğraf
    isParlamaVarKontrol(fotoImageData);

    // Gerçek ölçek: köşe pikselleri arası mesafeden hesapla (boyuttan bağımsız)
    let gercekPpmm = ppmm;
    if (koseler && koseler.solUst && koseler.sagUst) {
      const fotoGenislikPx = Math.hypot(
        koseler.sagUst.x - koseler.solUst.x,
        koseler.sagUst.y - koseler.solUst.y
      );
      const fotoYukseklikPx = Math.hypot(
        koseler.solAlt.x - koseler.solUst.x,
        koseler.solAlt.y - koseler.solUst.y
      );
      // İki yönün ortalamasını al
      const olcekX = fotoGenislikPx / form.bolge.width;
      const olcekY = fotoYukseklikPx / form.bolge.height;
      gercekPpmm = (olcekX + olcekY) / 2;
    }

    const H = homografiElleKoselerdenHesapla(form, koseler, gercekPpmm);

    const { canvas: duzCanvas, imageData: cImageData, ppmmKullanilan } = duzCanvasUret(fotoImageData, H, form, gercekPpmm);
    if (ppmmKullanilan !== gercekPpmm) {
      // bkz. otomatik köşe yolundaki aynı not — tuval sınırlandıysa
      // sonraki piksel<->mm dönüşümleri de aynı değerle tutarlı olsun.
      uyarilar.push('Fotoğraf çözünürlüğü performans için sınırlandı (≈' + gercekPpmm.toFixed(1) + ' → ' + ppmmKullanilan.toFixed(1) + ' px/mm).');
      gercekPpmm = ppmmKullanilan;
    }
    if (_sonHTestSonucu) {
      uyarilar.push('H köşe testi: ' + _sonHTestSonucu);
    }

    kontrastNormalizeEt(cImageData);
    duzCanvas.getContext('2d').putImageData(cImageData, 0, 0);
    adaptifEsikle(cImageData);

    let ogrenciKimlik = null;
    const numaraSonuc = numaraOku(cImageData, form.numaraAlani, gercekPpmm);
    const kitapcikSonuc = kitapcikOku(cImageData, form.kitapcikAlani, gercekPpmm);
    const formKodu = formKoduOku(cImageData, form.formKoduAlani, gercekPpmm);
    if (numaraSonuc) {
      ogrenciKimlik = { ogrenciNo: numaraSonuc.numara, kitapcikTuru: kitapcikSonuc };
      if (!numaraSonuc.tamOkunduMu) {
        uyarilar.push('Öğrenci no baloncukları tam okunamadı (bazı basamaklar belirsiz): ' + numaraSonuc.numara);
      }
    } else {
      uyarilar.push('Bu formda Numara baloncuk alanı tanımlı değil, öğrenci kimliği okunamadı.');
    }
    // DÜZELTME: formuOku() bu satırı zaten ekliyordu (bkz. yukarıdaki
    // fonksiyon), ama formuOkuElleKoseli() bunu hiç eklemiyordu — elle
    // köşe modunda (Sedat'ın kullandığı yol) hane bazlı teşhis
    // ("hane0:[...] -> BELİRSİZ" gibi) İçerik sekmesinde HİÇ görünmüyordu,
    // sorunu araştırmayı zorlaştırıyordu.
    if (_sonNumaraTeshis) { uyarilar.push('Numara teşhisi: ' + _sonNumaraTeshis); }
    if (_sonKitapcikTeshis) { uyarilar.push('Kitapçık/Form Kodu teşhisi: ' + _sonKitapcikTeshis); }
    if (_radyalProfilSatirlari.length) { uyarilar.push('Radyal koyuluk profili:\n' + _radyalProfilSatirlari.join('\n')); }

    // NOT: Elle seçilen 4 sayfa-köşesi zaten hassas bir homografi
    // sağlıyor. Otomatik ızgara-içi ikinci düzeltme adımı (genelDuzeltmeHesapla)
    // KENDİ köşe işaretlerini arayarak çalışır ve Fen Bilimleri gibi bu
    // işaretlere yakın sütunlarda yanlış kilitlenip küçük ama fark edilir
    // bir kaymaya yol açabiliyor (gözlemlenen hata). Bu yüzden elle-köşeli
    // modda bu ikinci adım VARSAYILAN OLARAK ATLANIR. Gerekirse
    // secenekler.genelDuzeltmeKullan: true ile tekrar açılabilir.
    let genelDuzeltme = null;

    if (secenekler.genelDuzeltmeKullan) {
      genelDuzeltme = genelDuzeltmeHesapla(cImageData, form, gercekPpmm);
      if (!genelDuzeltme) {
        uyarilar.push(
          'Izgaranın (tüm ders sütunlarını saran çerçevenin) hizalama işaretleri ' +
          'bulunamadı, sayfa-geneli düzeltme kullanıldı.'
        );
      }
    } else {
      uyarilar.push(
        'Elle köşe modu: ızgara-içi otomatik ikinci düzeltme adımı atlandı ' +
        '(sadece elle seçilen sayfa köşeleri kullanıldı).'
      );
    }

    const cevaplarSonuc = cevaplariCikar(cImageData, form, gercekPpmm, genelDuzeltme);
    const cevaplar = cevaplarSonuc.cevaplar;
    const birdenFazlaSecenekIsaretleme = cevaplarSonuc.birdenFazlaSecenekIsaretleme;

    // Görüntü kalite uyarıları önce (parlama / çok koyu)
    for (const kUyari of _goruntKaliteUyarilari) uyarilar.unshift(kUyari);

    const belirsizSayisi = cevaplar.filter((c) => c.uyari).length;
    if (belirsizSayisi > 0) {
      uyarilar.push(belirsizSayisi + ' soruda belirsiz/boş/çoklu işaret tespit edildi.');
    }
    if (birdenFazlaSecenekIsaretleme.length > 0) {
      uyarilar.push(
        'birdenFazlaSecenekIsaretleme — ' + birdenFazlaSecenekIsaretleme.length +
        ' soruda birden fazla şık işaretli görünüyor: ' +
        birdenFazlaSecenekIsaretleme.map((b) =>
          (b.ders ? b.ders + ' ' : '') + '#' + b.soruNo +
          ' [' + b.adaylar.map((a) => a.harf + '=' + a.oran).join(',') + ']'
        ).join(', ')
      );
    }
    if (_yetersizPikselUyarilari.length > 0) {
      const idler = [...new Set(_yetersizPikselUyarilari.map((u) => u.bubbleId))];
      uyarilar.push(
        'yetersizPiksel — ' + _yetersizPikselUyarilari.length +
        ' baloncuk ROI\'si yeterli piksel içermiyor: ' +
        idler.slice(0, 10).join(', ') + (idler.length > 10 ? '…' : '')
      );
    }
    // DÜZELTME: formuOku() bu satırları zaten ekliyordu, formuOkuElleKoseli()
    // hiç eklemiyordu — numara/kitapçık teşhisiyle aynı eksiklik, cevap
    // tarafında da tekrarlanmıştı.
    if (_sonKoyulukOzeti) { uyarilar.push('Koyuluk özeti: ' + _sonKoyulukOzeti); }
    if (_cevapTeshisSatirlari.length) { uyarilar.push('Cevap teşhisi (ders başına en fazla 2 örnek):\n' + _cevapTeshisSatirlari.join('\n')); }
    if (_ardisikAyniSikSatirlari.length) { uyarilar.push('⚠ Ardışık aynı şık tespiti:\n' + _ardisikAyniSikSatirlari.join('\n')); }

    return {
      basarili: true,
      ogrenciKimlik,
      formKodu,
      cevaplar,
      birdenFazlaSecenekIsaretleme, // YENİ
      uyarilar,
      hataAyiklama: {
        duzeltilmisCanvas: duzCanvas,
        hizalamaNoktalari: null,
        ornekNoktalari: cevaplarSonuc.ornekNoktalari,
        genelDuzeltme,
      },
    };

  }

  return {
    formuOku,
    formuOkuElleKoseli,
    // aşağıdakiler test/hata-ayıklama ve ileri seviye kullanım için dışa açık:
    homografiHesapla,
    noktayiDonustur,
    tumSorulariTopla,
    VARSAYILAN_PPMM,
    // canlı kamera önizlemesinde köşe yakalama göstergesi (camera.js) için:
    sayfaKoseleriniAra,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OmrOkuyucu;
}
