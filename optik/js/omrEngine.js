/**
 * omrOkuyucu.js
 * --------------
 * Kamerayla çekilen optik form fotoğrafını okur.
 *
 * AKIŞ (tek fotoğraf -> analiz -> sonuç):
 *   1) Fotoğraftan jsQR ile QR kodu bulunur (öğrenci/sınav kimliği).
 *   2) QR'nin 4 köşesi (bilinen mm konumlarıyla eşleştirilerek) KABA bir
 *      homografi üretir. Bu kaba homografi, sayfanın 4 köşesindeki
 *      hizalama işaretlerinin (fiducial marker) fotoğrafta YAKLAŞIK nerede
 *      olması gerektiğini tahmin etmek için kullanılır.
 *   3) Her hizalama işaretinin tahmini konumu etrafında küçük bir pencerede
 *      "karanlık piksel ağırlık merkezi" hesaplanarak işaretin HASSAS
 *      pikseli bulunur.
 *   4) Bu 4 hassas köşeden (sayfanın kendisi kadar geniş açıklıkta olduğu
 *      için çok daha güvenilir) TAM bir homografi çıkarılır. Matematik:
 *      klasik 4-nokta DLT (Direct Linear Transform) — OpenCV'siz, saf JS,
 *      8x8 lineer sistemi Gauss eleme ile çözüyoruz.
 *   5) Bu homografi kullanılarak form, sabit bir "canonical" çözünürlükte
 *      (mm başına piksel) düzleştirilmiş bir canvas'a ters-eşleme
 *      (inverse warping + bilinear örnekleme) ile çizilir.
 *   6) Düzleştirilmiş canvas'ta artık her koordinat mm * PPMM formülüyle
 *      doğrudan hesaplanabildiği için, layoutEngine.js'in ürettiği baloncuk
 *      merkezlerini (mm) doğrudan piksele çevirip her baloncuğun karanlık
 *      oranını ölçüyoruz ve en koyu (ve yeterince ayırt edici) şıkkı
 *      işaretli kabul ediyoruz.
 *
 * BAĞIMLILIK: jsQR (global `jsQR` fonksiyonu). Örn:
 *   (jsQR inline gömülü)
 *
 * GİRDİ: bir <img>/<video>/<canvas> kaynağı (çekilen fotoğraf) +
 *        layoutEngine.js'in layoutHesapla() çıktısındaki TEK bir mini-form
 *        (örn. layout.formlar[0]). Bu form nesnesi; qrAlani, hizalamaIsaretleri,
 *        ve (izgara veya bolumler) soru koordinatlarının hepsini mm cinsinden,
 *        A4 sayfasına göre GLOBAL konumda içerir.
 *
 * NOT: Fiziksel olarak KESİLMİŞ tek bir mini-formun fotoğrafı okunacağı
 *      varsayılır — yani form.bolge'nin sol-üst köşesi, fotoğraftaki
 *      kağıt parçasının kendi (0,0) noktasıdır. Bu yüzden tüm global mm
 *      koordinatları form.bolge.x / form.bolge.y çıkarılarak yerelleştirilir.
 *
 * ÇIKTI (formuOku'nun döndürdüğü Promise):
 *   {
 *     basarili: boolean,
 *     ogrenciKimlik: object|null,   // QR payload (JSON.parse edilmiş)
 *     cevaplar: [{ ders, soruNo, isaretliSik, guven, uyari }],
 *     uyarilar: string[],           // genel uyarılar (QR bulunamadı, vs.)
 *     hataAyiklama: {               // debug/görselleştirme için
 *       duzeltilmisCanvas: HTMLCanvasElement,
 *       hizalamaNoktalari: {x,y}[4]
 *     }
 *   }
 *
 * KULLANIM:
 *   const layout = layoutHesapla({ sinavTuru: 'ozel', soruSayisi: 20, sikSayisi: 4 });
 *   const form = layout.formlar[0];
 *   const sonuc = await OmrOkuyucu.formuOku(fotografImgElementi, form);
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
  // 1.5) Adaptif eşikleme (Test Plus yaklaşımı)
  //
  // kontrastNormalizeEt'ten SONRA çağrılır. OpenCV.js (window.cv) varsa
  // cv.adaptiveThreshold kullanır — her bölge için ayrı eşik hesaplar,
  // ışık farklılıklarını/parlamayı otomatik telafi eder. cv yoksa
  // basit Otsu eşiklemesine düşer. Sonuç: binary (0/255) ImageData.
  //
  // Bu fonksiyon canonical canvas ImageData'yı YERİNDE değiştirir.
  // baloncukKaranlikOrani yerine baloncukDoluluğuBinary kullanılır.
  // ---------------------------------------------------------------------

  // Adaptif eşiklenmiş binary ImageData — her formuOku çağrısında
  // üretilip baloncuk okuma adımında kullanılır, sonra temizlenir.
  let _binaryImageData = null;

  /**
   * Canonical canvas ImageData'dan adaptif eşikli binary görüntü üretir.
   * window.cv (OpenCV.js) varsa adaptiveThreshold, yoksa basit Otsu kullanır.
   * Sonuç _binaryImageData'ya yazılır.
   */
  function adaptifEsikle(cImageData) {
    const { width, height, data } = cImageData;

    // Düz gri tonlama — form siyah beyaz basıldığı için renk filtresi gereksiz.
    const gri = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gri[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }

    const binary = new Uint8Array(width * height);

    if (typeof cv !== 'undefined' && cv.Mat) {
      let src, dst;
      try {
        src = cv.matFromArray(height, width, cv.CV_8UC1, gri);
        dst = new cv.Mat();
        // blockSize: baloncuk çapının ~3 katı (5.5mm × 8px/mm ≈ 44px → 131px)
        // Tek sayı olmalı. C=8: yerel ortalamadan çıkarılacak sabit.
        cv.adaptiveThreshold(
          src, dst,
          255,
          cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          cv.THRESH_BINARY_INV,
          131,
          8
        );
        const dstData = dst.data;
        for (let i = 0; i < dstData.length; i++) binary[i] = dstData[i];
      } catch (e) {
        _otsuEsikle(gri, binary, width, height);
      } finally {
        if (src) src.delete();
        if (dst) dst.delete();
      }
    } else {
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
   */
  function baloncukDolulukBinary(cx, cy, r) {
    if (!_binaryImageData) return 0;
    const { width, height, data } = _binaryImageData;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(width - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(height - 1, Math.ceil(cy + r));
    if (x1 <= x0 || y1 <= y0) return 0;
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
    return toplam > 0 ? isaretli / toplam : 0;
  }

  // ---------------------------------------------------------------------
  // 2) QR kod okuma
  // ---------------------------------------------------------------------

  function qrKoduBul(imageData) {
    if (typeof jsQR !== 'function') {
      throw new Error(
        'jsQR bulunamadı. omrOkuyucu.js\'ten önce jsQR kütüphanesini yükleyin ' +
        '(ör. jsQR inline gömülü).'
      );
    }
    const kod = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (!kod) return null;
    return {
      metin: kod.data,
      koseler: {
        solUst: kod.location.topLeftCorner,
        sagUst: kod.location.topRightCorner,
        solAlt: kod.location.bottomLeftCorner,
        sagAlt: kod.location.bottomRightCorner,
      },
    };
  }

  function payloadAyristir(metin) {
    try {
      return JSON.parse(metin);
    } catch (e) {
      // QR'de düz metin/öğrenci no da olabilir; JSON değilse ham metni sakla.
      return { ham: metin };
    }
  }

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
    const PARLAKLIK_ESIK = 140; // bu ve üzeri "sayfa/beyaz" sayılır
    const ARDISIK_GEREKEN = Math.max(8, Math.round(Math.min(width, height) * 0.02)); // gürültüyle karışmasın diye art arda bu kadar parlak piksel gerekir

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

  function qrKoseleriMM(form) {
    const { x, y, boyut } = form.qrAlani;
    return {
      solUst: yerelNokta(form, x, y),
      sagUst: yerelNokta(form, x + boyut, y),
      solAlt: yerelNokta(form, x, y + boyut),
      sagAlt: yerelNokta(form, x + boyut, y + boyut),
    };
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
  function formuDuzlestir(fotoImageData, form, ppmm) {
    // AŞAMA 1: QR kodunun 4 köşesiyle KABA bir homografi kur.
    // Bu tek başına nihai homografi olarak kullanılmamalı — QR sayfanın
    // sadece küçük bir bölgesinde (örn. sağ-üst ~28mm kutu) olduğu için,
    // buradan hesaplanan dönüşüm sayfanın uzak bölgelerine (örn. sol
    // taraftaki Türkçe/İnkılap sütunları) ekstrapole edildiğinde KENDİ
    // İÇİNDEKİ küçük bir piksel hatası bile ciddi kaymaya yol açıyordu.
    // (Bu, "QR'ye yakın sorular bazen doğru, uzak sorular hep boş" olarak
    // gözlemlenen hatanın asıl kaynağıydı.)
    const qrMM = qrKoseleriMM(form);
    const qrKoseler = qrKoduBulVeDogrula(fotoImageData);

    const qrKaynak = [
      { x: qrMM.solUst.x * ppmm, y: qrMM.solUst.y * ppmm },
      { x: qrMM.sagUst.x * ppmm, y: qrMM.sagUst.y * ppmm },
      { x: qrMM.solAlt.x * ppmm, y: qrMM.solAlt.y * ppmm },
      { x: qrMM.sagAlt.x * ppmm, y: qrMM.sagAlt.y * ppmm },
    ];
    const qrHedef = [
      qrKoseler.koseler.solUst,
      qrKoseler.koseler.sagUst,
      qrKoseler.koseler.solAlt,
      qrKoseler.koseler.sagAlt,
    ];

    const kabaH = homografiHesapla(qrKaynak, qrHedef);

    // AŞAMA 2: form.hizalamaIsaretleri — sayfanın DÖRT KÖŞESİNE yayılmış
    // fiducial kareler — kaba homografiyle fotoğrafta tahmini konumlarına
    // projekte edilir, sonra HASSAS piksel merkezleri bulunur. Sayfanın
    // tamamına yayılan bu 4 nokta, homografiyi QR'nin küçük kutusundan çok
    // daha güvenilir biçimde belirler.
    //
    // ÖNEMLİ (düzeltilen hata): pencere eskiden fotoğrafın kısa kenarının
    // SABİT bir ORANI kadardı (ARAMA_PENCERE_ORANI=0.20). Bu, yakından/
    // yüksek çözünürlükte çekilmiş fotoğraflarda onlarca mm'ye tekabül
    // edebiliyordu — ve "sağ-üst" köşe işareti QR koduna (~14mm mesafede)
    // sadece bu kadar yakın olduğu için, pencere QR'nin bir kısmını da
    // içine alıp AĞIRLIK MERKEZİNİ QR'YE DOĞRU ÇEKİYORDU. Bu tek köşedeki
    // kayma, homografiye YAYILAN bir döndürme/eğiklik (sayfanın tamamen
    // çarpık görünmesi) olarak ortaya çıkıyordu — kağıdın eğriliğiyle
    // ilgisi yoktu, saf bir köşe-karışması hatasıydı.
    //
    // ÇÖZÜM: (a) pencere artık fotoğrafın gerçek ÖLÇEĞİNE göre (kabaH'den
    // yerel olarak kestirilen mm/piksel oranıyla) SABİT bir mm yarıçapı
    // olarak hesaplanıyor — fotoğrafın çözünürlüğünden/yakınlığından
    // bağımsız; (b) arama, ders sütunu köşelerinde kullandığımız BLOB
    // (bağlı bileşen) tabanlı yönteme geçti — pencere yine de komşu bir
    // şekle (QR gibi) taşsa bile, TAHMİNE EN YAKIN bağlı bileşeni seçtiği
    // için karışmıyor.
    // NOT (v2 ince ayar): sağ-üst köşe artık doğru bulunuyor ama alt iki
    // köşe (sol-alt, sağ-alt) bazen bulunamıyordu. Sebep: kaba homografi
    // SADECE QR'ye (sağ-üst bölge) dayanıyor; alt köşeler QR'den ~290mm
    // uzakta olduğu için ekstrapolasyon hatası orada çok daha büyük
    // olabiliyor — 8mm'lik pencere bu köşeler için yetersiz kalıyordu.
    // Pencere büyütüldü (20mm); bu, sağ-üst köşede QR ile karışma riskini
    // yeniden getirmiyor çünkü blob yöntemi TAHMİNE EN YAKINI seçiyor ve o
    // köşedeki tahmin zaten (QR'ye yakın olduğu için) düşük hatalı.
    // NOT (v3): Sabit 20mm bile bazı köşelerde (özellikle sol-alt, QR'den
    // ~290mm uzakta) hâlâ yetersiz kalabiliyor — ekstrapolasyon hatası
    // mesafeyle BÜYÜR, sabit bir pencere bunu her zaman yakalayamaz. Bu
    // yüzden pencere artık QR merkezinden UZAKLIKLA ORANTILI hesaplanıyor
    // (yakın köşelerde dar/hassas, uzak köşelerde geniş/toleranslı kalsın
    // diye 15mm taban + uzaklığın %12'si).
    const ARAMA_TABAN_MM = 15;
    const ARAMA_ORANI = 0.12;

    /** kabaH'nin (cx,cy) civarındaki YEREL piksel/mm ölçeğini kestirir. */
    function yerelOlcekKestir(H, cx, cy, ppmm) {
      const deltaMM = 5;
      const p0 = noktayiDonustur(H, cx, cy);
      const p1 = noktayiDonustur(H, cx + deltaMM * ppmm, cy);
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      return Math.sqrt(dx * dx + dy * dy) / deltaMM; // fotoğraf pikseli / mm
    }

    const qrMerkezMM = {
      x: (qrMM.solUst.x + qrMM.sagUst.x + qrMM.solAlt.x + qrMM.sagAlt.x) / 4,
      y: (qrMM.solUst.y + qrMM.sagUst.y + qrMM.solAlt.y + qrMM.sagAlt.y) / 4,
    };

    const hizalamaMM = hizalamaMerkezleriMM(form);
    const hassasKaynak = [];
    const hassasHedef = [];
    const bulunamayanIsaretler = [];

    for (const isaret of hizalamaMM) {
      const cx = isaret.nokta.x * ppmm;
      const cy = isaret.nokta.y * ppmm;
      const kabaTahmin = noktayiDonustur(kabaH, cx, cy);
      const pikselPerMM = yerelOlcekKestir(kabaH, cx, cy, ppmm);

      const qrUzaklikMM = Math.sqrt(
        Math.pow(isaret.nokta.x - qrMerkezMM.x, 2) +
        Math.pow(isaret.nokta.y - qrMerkezMM.y, 2)
      );
      const aramaYariCapMM = Math.max(ARAMA_TABAN_MM, qrUzaklikMM * ARAMA_ORANI);

      const yarimPencerePx = aramaYariCapMM * pikselPerMM;
      const hassasMerkez = isaretMerkeziBulBlob(
        fotoImageData, kabaTahmin.x, kabaTahmin.y, yarimPencerePx, yarimPencerePx
      );
      if (hassasMerkez) {
        hassasKaynak.push({ x: cx, y: cy });
        hassasHedef.push(hassasMerkez);
      } else {
        bulunamayanIsaretler.push(isaret.konum);
      }
    }

    // Sayfanın 4 köşesi de bulunabildiyse bunları kullan (asıl amaçlanan,
    // sağlam yöntem, tam perspektif/homografi). TAM 3 köşe bulunduysa
    // (4'ten biri bulunamadıysa) o 3 iyi noktayı çöpe atıp doğrudan kaba
    // QR-homografisine düşmek yerine, o 3 noktadan bir AFİN dönüşüm
    // (döndürme+ölçek+kayma, perspektif olmadan) kuruyoruz — kağıt zaten
    // yaklaşık düz olduğu için bu, sadece QR'ye dayanan kaba homografiden
    // çok daha isabetlidir. Sadece 2 veya daha az köşe bulunduysa (çok
    // güvenilir bir dönüşüm kurulamaz) kaba homografiye düşülür.
    const dortKoseDeBulundu = hassasKaynak.length === 4;
    const ucKoseBulundu = hassasKaynak.length === 3;

    // KENDİ-İÇİ TUTARLILIK KONTROLÜ (v6 — v5'teki AŞIRI-HASSASLIK hatası
    // düzeltildi): v5, her köşeyi "diğer 3'ten AFİN kurup tahmin et" ile
    // test ediyordu. SORUN: afin dönüşüm perspektifi MODELLEMEZ (sadece
    // döndürme+ölçek+kayma); elde tutulan bir telefonla çekilmiş GERÇEK bir
    // fotoğrafta normal/beklenen perspektif bile (kağıt tam karşıdan değil
    // hafif açıyla çekildiğinde) bu afin-tahmininde onlarca mm'lik bir
    // "artık" üretebiliyordu — DOĞRU bulunmuş 4. köşeyi bile "tutarsız"
    // sayıp gereksiz yere dışlıyor, sonra afin (perspektifsiz) bir
    // düzeltmeye düşülüyordu. Bir önceki taramada "sol-alt tutarsız" diye
    // dışlandığı halde sonuç yine bozuk çıkmasının sebebi buydu: dışlanan
    // köşe muhtemelen DOĞRUYDU, ama afin fallback'in kendisi gerçek
    // perspektifi karşılayamadığı için sağ tarafta hâlâ çarpıklık vardı.
    //
    // ÇÖZÜM: Önce PERSPEKTİFTEN BAĞIMSIZ, saf GEOMETRİK bir sağlık kontrolü
    // yapılıyor: bulunan 4 köşe fotoğrafta KONVEKS (dışbükey) bir dörtgen mi
    // oluşturuyor, ve iç açılar mantıklı sınırlar içinde mi (çok sivri/
    // dejenere değil mi)? Bu kontrol, kağıdın GERÇEKTEN ne kadar
    // perspektifle çekildiğinden bağımsızdır. Sağlıklıysa TAM homografi (4
    // nokta, gerçek perspektifi doğru modelleyen 8-serbestlik-dereceli
    // dönüşüm) doğrudan kullanılıyor — afin'e hiç düşülmüyor. Sadece bu
    // geometrik kontrol BAŞARISIZ olursa (gerçekten dejenere/çapraz bir
    // dörtgen — bir köşenin yanlış blob'a kilitlendiğinin güçlü işareti)
    // v5'teki afin leave-one-out testine düşülüp kötü köşe dışlanıyor.
    function carpiklikIsareti(a, b, c) {
      const v1x = b.x - a.x, v1y = b.y - a.y;
      const v2x = c.x - b.x, v2y = c.y - b.y;
      return v1x * v2y - v1y * v2x;
    }

    function icAciDerece(a, b, c) {
      const ux = a.x - b.x, uy = a.y - b.y;
      const vx = c.x - b.x, vy = c.y - b.y;
      const uLen = Math.sqrt(ux * ux + uy * uy) || 1e-9;
      const vLen = Math.sqrt(vx * vx + vy * vy) || 1e-9;
      const cosAci = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (uLen * vLen)));
      return Math.acos(cosAci) * (180 / Math.PI);
    }

    // hassasHedef sırası [sol-ust, sağ-ust, sol-alt, sağ-alt] (bkz.
    // hizalamaIsaretleriEkle); ÇEVRE sırasına çevriliyor: sol-ust -> sağ-ust
    // -> sağ-alt -> sol-alt (indeksler: 0,1,3,2).
    function konveksVeSaglikliMi(dortNokta) {
      const cevre = [dortNokta[0], dortNokta[1], dortNokta[3], dortNokta[2]];
      const n = cevre.length;
      const isaretler = [];
      const acilar = [];
      for (let i = 0; i < n; i++) {
        const a = cevre[(i + n - 1) % n];
        const b = cevre[i];
        const c = cevre[(i + 1) % n];
        isaretler.push(Math.sign(carpiklikIsareti(a, b, c)));
        acilar.push(icAciDerece(a, b, c));
      }
      const konveks = isaretler.every((s) => s === isaretler[0]) && isaretler[0] !== 0;
      const acilarSaglikli = acilar.every((a) => a > 20 && a < 160);
      return konveks && acilarSaglikli;
    }

    const disariBirakilanIsaretler = [];
    let artiklarMM = [];
    let H;

    if (dortKoseDeBulundu) {
      // v7 (v6'daki KAÇIRILAN-DOĞRULAMA hatası düzeltildi): v6, dörtgen
      // KONVEKS ve açıları sağlıklıysa leave-one-out testini hiç
      // ÇALIŞTIRMADAN doğrudan 4 noktalık tam homografiye güveniyordu.
      // SORUN: 4 nokta tam olarak 8 serbestlik derecesini karşıladığı için
      // homografiHesapla bu 4 noktaya SIFIR artıkla (residual) mükemmel
      // uyar — yani "4 nokta birbiriyle ne kadar tutarlı" sorusuna hiç
      // cevap vermez. Bir köşe (örn. sağ-alt) yanlış bir blob'a
      // kilitlense bile, kalan 3 doğru köşeyle birlikte GENELDE yine
      // konveks ve "makul açılı" bir dörtgen oluşturur (dejenere/çapraz
      // olmaz) — bu yüzden konvekslik kontrolü tek başına bu hatayı
      // YAKALAYAMIYORDU. Sonraki QR-holdout kontrolü de bunu kurtarmıyordu
      // çünkü o SADECE QR'ye yakın bölgedeki hatayı ölçüyor; QR'den uzak
      // (örn. sağ-alt) bir köşenin hatası QR bölgesinde küçük kalabiliyor.
      // Sonuç: sayfanın QR'ye yakın kısmı düzgün, uzak kısmı (özellikle
      // sağ/alt) çarpık çıkan tam bu hata.
      //
      // ÇÖZÜM: leave-one-out artık dörtgenin şekline BAKMAKSIZIN HER ZAMAN
      // çalıştırılıyor. Her köşe için "diğer 3'ten afin kurup bu köşeyi
      // tahmin et" yapılıp gerçek konumuyla farkı (mm) ölçülüyor. En kötü
      // artık küçükse (4 köşe birbiriyle gerçekten tutarlı) tam homografi
      // kullanılıyor; büyükse (bir köşe diğerleriyle uyuşmuyor) o köşe
      // dışlanıp kalan 3'ten AFİN düzeltmeye düşülüyor — konvekslik testi
      // artık sadece "hiçbir üçlü alt küme bile mantıklı değil" durumunu
      // (tümüyle dejenere dörtgen) ayıklamak için ikincil bir kontrol.
      artiklarMM = hassasKaynak.map((_, i) => {
        const kalanKaynak = hassasKaynak.filter((_, j) => j !== i);
        const kalanHedef = hassasHedef.filter((_, j) => j !== i);
        // NOT: gaussEleme, NEREDEYSE DOĞRUSAL (collinear) bir 3-nokta alt
        // kümesinde KASITLI OLARAK hata fırlatır (bkz. "Homografi sistemi
        // tekil" — dejenere nokta konfigürasyonuna karşı bir koruma).
        // Leave-one-out burada 4 farklı 3'lü alt küme deniyor; bunlardan
        // biri gerçek fotoğrafta (lens/perspektif çarpıtmasıyla) neredeyse
        // doğrusal çıkabilir. Bu durumda try/catch olmadan hata TÜM
        // okumayı çökertiyordu — kullanıcı bunu "okumuyor, anasayfaya
        // atıyor" olarak görüyordu. Şimdi böyle bir alt küme, sadece
        // "sonsuz kötü" (bu köşe adayı olamaz) sayılıp atlanıyor.
        try {
          const Hsub = afinHesapla(kalanKaynak, kalanHedef);
          const tahmin = noktayiDonustur(Hsub, hassasKaynak[i].x, hassasKaynak[i].y);
          const dx = tahmin.x - hassasHedef[i].x;
          const dy = tahmin.y - hassasHedef[i].y;
          const pxFark = Math.sqrt(dx * dx + dy * dy);
          const pikselPerMM = yerelOlcekKestir(kabaH, hassasKaynak[i].x, hassasKaynak[i].y, ppmm);
          return pxFark / pikselPerMM;
        } catch (e) {
          return Infinity;
        }
      });

      // GERÇEK ÇÖKME HATASI (düzeltildi): artiklarMM.indexOf(Math.max(...))
      // kullanılıyordu. Eğer 3 nokta neredeyse doğrusal (collinear) çıkarsa
      // afinHesapla/gaussEleme NaN üretebiliyor — ve Math.max bir NaN
      // içeren dizide HER ZAMAN NaN döner, .indexOf(NaN) ise (NaN !== NaN
      // olduğu için) HER ZAMAN -1 döner. Sonuçta hizalamaMM[-1].konum
      // "Cannot read properties of undefined" hatasıyla TÜM okumayı
      // çökertiyordu (kullanıcı bunu "okumuyor, anasayfaya atıyor" olarak
      // gördü). Elle, NaN'i "en kötü" sayan güvenli bir arama ile
      // düzeltildi; hiçbir geçerli (sonlu) artık yoksa köşe seçimine hiç
      // güvenilmeyip doğrudan kaba homografiye düşülüyor.
      let enKotuIndex = -1;
      let enKotuDeger = -Infinity;
      for (let i = 0; i < artiklarMM.length; i++) {
        const deger = Number.isFinite(artiklarMM[i]) ? artiklarMM[i] : Infinity;
        if (deger > enKotuDeger) {
          enKotuDeger = deger;
          enKotuIndex = i;
        }
      }

      // Fiducial kareler yüksek hassasiyetle basılıyor; 4 köşe GERÇEKTEN
      // tutarlıysa leave-one-out artığı normalde 1-2mm'nin altında kalır.
      // Bu eşiğin üstü, bir köşenin yanlış bir şekle kilitlendiğinin işareti.
      // v8 (v7'deki AŞIRI-SIKI-EŞİK hatası düzeltildi): v7, bu artığı 4mm
      // gibi sıkı bir eşikle "köşe yanlış" sayıyordu. SORUN: bu artık
      // AFİN bir modelin (perspektifsiz) 3 noktadan 4.'yü ne kadar iyi
      // tahmin ettiğini ölçüyor — ama gerçek bir telefon fotoğrafında
      // sayfa neredeyse HİÇBİR ZAMAN kameraya tam paralel değildir, yani
      // GERÇEK bir perspektif vardır. Afin bu perspektifi MODELLEYEMEZ,
      // bu yüzden 4 köşe de doğru bulunmuş olsa bile (LGS sayfası ~300mm
      // uzun kenara sahip, tipik elde-tutuş açılarında) bu artık kolayca
      // 5-15mm'ye çıkabilir — bu HATA DEĞİL, sadece afin modelin doğal
      // sınırı. v7 bunu "köşe yanlış" sanıp iyi bir köşeyi dışlayıp yerine
      // perspektifi hiç düzeltemeyen bir afin dönüşümle değiştiriyordu ki
      // bu da GÖRÜNEN SONUCU DAHA DA KÖTÜLEŞTİRİYORDU (tam da ekran
      // görüntüsünde gördüğümüz). Eşik, gerçek fotoğraf perspektifini
      // "tutarsızlık" sanmayacak kadar gevşetildi; artık sadece bir köşenin
      // GERÇEKTEN yanlış bir şekle kilitlendiği (onlarca mm'lik hata)
      // durumları yakalıyor.
      const TUTARLILIK_ESIK_MM = 18;

      // Kalibrasyon için: bu 4 artığı konsola yaz. Gerçek fotoğraflarda
      // "iyi" bir okumada bu değerlerin ne kadar çıktığını görüp eşiği
      // ileride gerekirse ince ayar yapabilmek amacıyla.
      console.log(
        'Köşe tutarlılık artıkları (mm):',
        hizalamaMM.map((h, i) => h.konum + '=' + (Number.isFinite(artiklarMM[i]) ? artiklarMM[i].toFixed(1) : 'sonsuz')).join(', ')
      );

      if (
        enKotuIndex !== -1 &&
        Number.isFinite(enKotuDeger) &&
        enKotuDeger <= TUTARLILIK_ESIK_MM &&
        konveksVeSaglikliMi(hassasHedef)
      ) {
        try {
          H = homografiHesapla(hassasKaynak, hassasHedef);
        } catch (e) {
          H = kabaH; // son çare: kaba QR homografisi hiçbir zaman fırlatmaz
        }
      } else if (enKotuIndex === -1 || !Number.isFinite(enKotuDeger)) {
        // Hiçbir kombinasyon geçerli/sonlu bir sonuç vermedi (dörtgen
        // gerçekten dejenere) — güvenli tarafta kal, kaba homografiye düş.
        H = kabaH;
      } else {
        const kalanKaynak = hassasKaynak.filter((_, j) => j !== enKotuIndex);
        const kalanHedef = hassasHedef.filter((_, j) => j !== enKotuIndex);
        H = afinHesapla(kalanKaynak, kalanHedef);
        disariBirakilanIsaretler.push(hizalamaMM[enKotuIndex].konum);
      }
    } else if (ucKoseBulundu) {
      try {
        H = afinHesapla(hassasKaynak, hassasHedef);
      } catch (e) {
        H = kabaH;
      }
    } else {
      H = kabaH;
    }


    // GÜVENLİK KONTROLÜ (v4 — v3'teki TERS MANTIK hatası düzeltildi):
    // v3, hassas H'yi KABA (sadece QR'ye dayanan) homografiyle sayfanın
    // UZAK köşelerinde karşılaştırıp farkı >30mm ise hassas H'yi reddediyordu.
    // SORUN: kabaH zaten yalnızca ~28mm'lik küçük bir QR kutusundan
    // hesaplanıyor; bu dosyanın başındaki notlarda da açıklandığı gibi,
    // QR'den ~300mm uzaktaki noktalara ekstrapole edildiğinde kabaH'nin
    // KENDİSİ büyük ölçüde yanlış olabiliyor. Yani v3, "doğru ama
    // beklenmedik" bir sonucu (hassas H, kabaH'den UZAKTA farklı — ki tam
    // da bunun İÇİN hassas köşeler eklendi) sistematik olarak GÜVENİLMEZ
    // sayıp siliyordu; en çok ihtiyaç duyulan durumda (kabaH'nin gerçekten
    // saptığı büyük/eğri sayfalarda) hassas sonucu iptal edip tekrar
    // kabaH'ye dönüyordu. Ekran görüntülerinde köşelerin gözle doğru
    // bulunduğu ama yine de "güvenilmez" sayılıp reddedildiği durumların
    // sebebi buydu.
    //
    // ÇÖZÜM: hassas H'yi kabaH ile DEĞİL, QR'nin GERÇEKTEN ölçülen piksel
    // köşeleriyle (qrHedef — jsQR'nin bulduğu, ekstrapolasyon içermeyen
    // doğrudan piksel konumları) karşılaştırıyoruz. Bu noktalar hassas H'yi
    // KURMAK için KULLANILMADI (H sadece 4 uzak hizalama işaretinden
    // kuruldu) — yani bu bağımsız bir "holdout" doğrulama noktası kümesi.
    // QR küçük bir alanda olduğu için buradaki hata ekstrapole olmaz;
    // hassas H, QR'nin mm konumunu QR'nin GERÇEKTEN bulunduğu piksele
    // yakın öngörmüyorsa, bu hassas H'nin (örn. bir köşenin yanlış blob'a
    // kilitlenmesi yüzünden) gerçekten hatalı olduğu anlamına gelir —
    // kabaH'nin uzak noktalarda kendisinin de sapmış olması bu durumda
    // sorun değildir, çünkü QR bölgesi kabaH için de hassas H için de
    // "yakın/hatasız" bir bölgedir.
    const QR_HOLDOUT_ESIK_MM = 10; // QR küçük bir alan; sıkı tolerans yeterli
    let uyumsuzlukMM = 0;
    if (H !== kabaH) {
      for (let i = 0; i < qrKaynak.length; i++) {
        const kaynak = qrKaynak[i];
        const hedefGercek = qrHedef[i];
        const tahmin = noktayiDonustur(H, kaynak.x, kaynak.y);
        const dx = tahmin.x - hedefGercek.x;
        const dy = tahmin.y - hedefGercek.y;
        const pxFark = Math.sqrt(dx * dx + dy * dy);
        const pikselPerMM = yerelOlcekKestir(kabaH, kaynak.x, kaynak.y, ppmm);
        const mmFark = pxFark / pikselPerMM;
        if (mmFark > uyumsuzlukMM) uyumsuzlukMM = mmFark;
      }
    }

    const guvenilmezBulunduMu = uyumsuzlukMM > QR_HOLDOUT_ESIK_MM;
    if (guvenilmezBulunduMu) {
      H = kabaH; // hassas köşeler QR ile bile tutarsız — gerçekten güvenilmez
    }

    const koseBulunduMu = (dortKoseDeBulundu || ucKoseBulundu) && !guvenilmezBulunduMu;

    return {
      H,
      hizalamaBulunduMu: koseBulunduMu,
      guvenilmezBulunduMu,
      bulunamayanIsaretler,
      // 4 köşe de bulunmuştu ama biri diğer 3'le tutarsız çıktığı için
      // (leave-one-out testi) dışlanıp kalan 3'ten afin kuruldu.
      disariBirakilanIsaretler,
      hizalamaNoktalari: koseBulunduMu ? hassasHedef : qrHedef,
      // Debug/görselleştirme için: bu noktaların DÜZLEŞTİRİLMİŞ (canonical,
      // perspektifsiz) canvas'taki karşılıkları — hizalamaNoktalari'nin
      // aksine, bunlar orijinal fotoğraf değil dewarp edilmiş görüntü
      // üzerine çizilmek için doğru koordinat sistemindedir.
      hizalamaKanonikNoktalari: koseBulunduMu ? hassasKaynak : qrKaynak,
      // HAM bulunan noktalar (güvenilmez sayılıp REDDEDİLMİŞ olsa bile) —
      // "bulundu ama reddedildi" durumunda asıl neyin yanlış bulunduğunu
      // gözle teşhis edebilmek için. hassasKaynak boşsa (hiç köşe
      // bulunamadıysa) null.
      hamBulunanKanonikNoktalari: hassasKaynak.length ? hassasKaynak : null,
      // Kalibrasyon/teşhis için: her köşenin leave-one-out artığı (mm).
      // dortKoseDeBulundu değilse boş dizi.
      koseArtiklariMM: dortKoseDeBulundu
        ? hizalamaMM.map((h, i) => ({ konum: h.konum, artikMM: artiklarMM[i] }))
        : [],
    };
  }

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

  /** İç kullanım: fotoğrafta QR ara, bulunamazsa açıklayıcı hata fırlat. */
  function qrKoduBulVeDogrula(imageData) {
    const sonuc = qrKoduBul(imageData);
    if (!sonuc) {
      throw new Error('Fotoğrafta QR kod bulunamadı. Işık/odak/açı kontrol edilip tekrar deneyin.');
    }
    return sonuc;
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
  function duzCanvasUret(fotoImageData, H, form, ppmm) {
    const cGenislik = Math.max(1, Math.round(form.bolge.width * ppmm));
    const cYukseklik = Math.max(1, Math.round(form.bolge.height * ppmm));

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
    return { canvas, imageData: cImageData };
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
   * SORUN: Sayfa geneli tek bir homografi (bkz. formuDuzlestir), kağıt
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
  function baloncukKaranlikOraniYerelArama(cImageData, cx, cy, r, aramaOrani = 1.3, adimOrani = 0.12) {
    const aramaMesafesi = r * aramaOrani;
    const adim = Math.max(1, r * adimOrani);

    let enIyiOran = -1;
    let enIyiDx = 0;
    let enIyiDy = 0;

    // Binary görüntü varsa (adaptifEsikle çağrıldıysa) countNonZero yöntemi
    // kullan — Test Plus yaklaşımı, renk/ışık bağımsız.
    const binaryKullan = !!_binaryImageData;

    for (let dy = -aramaMesafesi; dy <= aramaMesafesi; dy += adim) {
      for (let dx = -aramaMesafesi; dx <= aramaMesafesi; dx += adim) {
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

    // TEŞHİS (Ağustos 2026 — Fen #18-19 ile kanıtlandı): satirIcinDikeyKaymaBul'da
    // bulunan "duvara toslama" (bkz. o fonksiyondaki DUVAR_ESIK_ORANI
    // açıklaması), İKİNCİ kademe aramada da AYNI ŞEKİLDE oluyor gibi
    // görünüyor — Fen #19 için yerelDy tam olarak -0.50 (aramaMesafesi ile
    // birebir aynı) çıktı. AMA burada satirIcinDikeyKaymaBul'daki gibi kör
    // bir eşik uygulamak RİSKLİ: Fen #18 (GERÇEKTEN dolu, ham kağıtla
    // doğrulanmış) de yerelDy=0.46 ile benzer bir değer verdi — aynı eşik
    // ikisini de reddedip #18'i de yanlışlıkla etkileyebilir. Bu ikinci
    // kademe (tek bir baloncuk, dar 0.5r pencere) ile birinci kademenin
    // (4r'lik satır aralığı) ölçeği farklı; aynı eşiği doğrudan taşımak
    // güvenli değil. Bu yüzden burada OTOMATİK düzeltme YAPILMIYOR — sadece
    // ham (dx=0,dy=0) oranı hesaplanıp _sonYerelAramaHamOran'a kaydediliyor,
    // teşhiste görünür olsun diye. Gerçek veri (#18'in ham oranı #19'unkinden
    // belirgin yüksekse ayrım mümkün demektir) görülünce doğru eşik/yöntem
    // kararlaştırılacak.
    if (Math.abs(enIyiDy) >= aramaMesafesi * 0.65 || Math.abs(enIyiDx) >= aramaMesafesi * 0.65) {
      _sonYerelAramaHamOran = binaryKullan
        ? baloncukDolulukBinary(cx, cy, r)
        : baloncukKaranlikOrani(cImageData, cx, cy, r);
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


  function cevaplariCikar(cImageData, form, ppmm, genelDuzeltme) {
    const KARANLIK_ESIK = _koyulukEsikGetir(); // her okumada canlı okunur (Ayarlar sheet)
    const AYIRT_EDICI_FARK = _ayirtEdiciFarkGetir(); // her okumada canlı okunur (Ayarlar sheet)
    const sorular = tumSorulariTopla(form);
    const cevaplar = [];
    const ornekNoktalari = []; // debug/görselleştirme: her şıkkın tam örnekleme noktası
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

      // ADIM 1: Her şıkkın homografiyle beklenen (henüz kaydırılmamış)
      // kanonik konumunu hesapla.
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
        const sonuc = baloncukKaranlikOraniYerelArama(cImageData, s.px, py2, s.pr, 0.5, 0.12);
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

      yerelSikler.sort((a, b) => b.oran - a.oran);
      const enKoyu = yerelSikler[0];
      const ikinciKoyu = yerelSikler[1] || { oran: 0 };

      let isaretliSik = null;
      let uyari = null;

      if (enKoyu.oran < KARANLIK_ESIK) {
        uyari = 'bos'; // hiçbir şık yeterince koyu değil
      } else if (enKoyu.oran - ikinciKoyu.oran < AYIRT_EDICI_FARK) {
        uyari = 'coklu'; // iki (veya daha fazla) şık birbirine çok yakın koyulukta
      } else {
        isaretliSik = enKoyu.harf;
      }

      cevaplar.push({
        ders: soru.ders,
        soruNo: soru.soruNo,
        isaretliSik,
        guven: Number(enKoyu.oran.toFixed(3)),
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
            s.harf + '=' + s.oran.toFixed(3) + '(dx' + ((s.yerelDx || 0) / enKoyuPr).toFixed(2) +
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
    _sonKoyulukOzeti = 'guven aralığı: min=' + enDusukOran.toFixed(3) + ' maks=' + enYuksekOran.toFixed(3) +
      ' ort=' + ortalamaOran.toFixed(3) + ' (eşik=' + KARANLIK_ESIK.toFixed(2) + ')';

    return { cevaplar, ornekNoktalari };
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
    const KARANLIK_ESIK = _koyulukEsikGetir(); // her okumada canlı okunur (Ayarlar sheet)
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
      const ortAralik = araliklar.reduce((a, b) => a + b, 0) / araliklar.length;
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
      const ortAralik = araliklar.reduce((a, b) => a + b, 0) / araliklar.length;
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
   * QR'li eski formuDuzlestir'deki v8 mantığıyla AYNI — sadece kabaH
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
   * cv.js yüklenmediyse/başarısız olursa eski yönteme sessizce düşülür.
   */
  /**
   * Sol-orta ve sağ-orta hizalama karelerini arar.
   * 4 köşe bulunmuşsa onlardan interpolasyon yaparak arama penceresi konumlandırır.
   */
  function _ortaKareleriAra(fotoImageData, form, cerceve) {
    const sonuc = { solOrta: null, sagOrta: null };
    if (!cerceve.solUst || !cerceve.solAlt || !cerceve.sagUst || !cerceve.sagAlt) return sonuc;

    const PENCERE = 30; // px (analiz çözünürlüğünde)

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

      const cerceve = window.SayfaTespitCV.sayfaKoseleriniAraCV(fotoImageData, null, null, beklenenOranlar);
      if (!cerceve || !cerceve.solUst || !cerceve.sagUst || !cerceve.solAlt || !cerceve.sagAlt) {
        return sayfaKoseleriniAra(fotoImageData, hassasiyet);
      }
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

  function formuOtomatikDuzlestir(fotoImageData, form, ppmm) {
    const bulunanlar = sayfaKoseleriniAraHibrit(fotoImageData, undefined, form);

    // Orta kareleri de ara (varsa — yeni formlarda sol-orta/sag-orta mevcut)
    const ortaKareler = _ortaKareleriAra(fotoImageData, form, bulunanlar);

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

    // Foto ölçeği (piksel/mm): sol-ust/sag-ust arası bulunan mesafeden
    // kestiriliyor — kabaH olmadığı için bu, tutarlılık artıklarını mm'ye
    // çevirmek için gereken tek referans.
    let pikselPerMM = ppmm; // güvenli varsayılan (bulunamazsa)
    if (hassasKaynak.length >= 2) {
      const kaynakMesafeMM = Math.hypot(hassasKaynak[1].x - hassasKaynak[0].x, hassasKaynak[1].y - hassasKaynak[0].y) / ppmm;
      const hedefMesafePx = Math.hypot(hassasHedef[1].x - hassasHedef[0].x, hassasHedef[1].y - hassasHedef[0].y);
      if (kaynakMesafeMM > 1) pikselPerMM = hedefMesafePx / kaynakMesafeMM;
    }

    const disariBirakilanIsaretler = [];
    let artiklarMM = [];
    let H = null;
    let secilenYontem = null; // YENİ (teşhis): hangi dönüşüm yöntemi seçildi

    if (dortKoseDeBulundu) {
      artiklarMM = hassasKaynak.map((_, i) => {
        const kalanKaynak = hassasKaynak.filter((_, j) => j !== i);
        const kalanHedef = hassasHedef.filter((_, j) => j !== i);
        try {
          const Hsub = afinHesapla(kalanKaynak, kalanHedef);
          const tahmin = noktayiDonustur(Hsub, hassasKaynak[i].x, hassasKaynak[i].y);
          const dx = tahmin.x - hassasHedef[i].x;
          const dy = tahmin.y - hassasHedef[i].y;
          return Math.sqrt(dx * dx + dy * dy) / pikselPerMM;
        } catch (e) {
          return Infinity;
        }
      });

      let enKotuIndex = -1;
      let enKotuDeger = -Infinity;
      let ikinciKotuDeger = -Infinity;
      for (let i = 0; i < artiklarMM.length; i++) {
        const deger = Number.isFinite(artiklarMM[i]) ? artiklarMM[i] : Infinity;
        if (deger > enKotuDeger) {
          ikinciKotuDeger = enKotuDeger;
          enKotuDeger = deger;
          enKotuIndex = i;
        } else if (deger > ikinciKotuDeger) {
          ikinciKotuDeger = deger;
        }
      }

      // NOT (v9 — v8'deki MUTLAK EŞİK hatası düzeltildi): v8, tek bir sabit
      // mm eşiği (20mm) kullanıyordu. SORUN: gerçekten güçlü ama SİMETRİK
      // bir perspektifte (kağıt fotoğrafa belirgin açıyla tutulmuş) 4
      // köşenin de leave-one-out artığı BİRBİRİNE ÇOK YAKIN (hatta neredeyse
      // eşit, ör. hepsi ~76mm) çıkabiliyor — bu tek bir köşenin YANLIŞ
      // bulunduğu anlamına gelmez, tam tersine AFİN modelin gerçek
      // perspektifi hiç karşılayamadığının kanıtıdır. v8 böyle durumda
      // "en kötü" köşeyi (aralarında anlamlı fark olmasa bile) dışlayıp
      // afin'e düşüyordu — ki afin perspektifi modelleyemediği için sonuç
      // AYNI DERECEDE (hatta daha) çarpık çıkıyordu (gözlemlenen: 76mm'lik
      // "tutarsızlık" sonrası hâlâ çok yamuk görüntü).
      //
      // ÇÖZÜM: mutlak eşik yerine, en kötü köşenin İKİNCİ en kötüden ne
      // kadar AYRIŞTIĞINA (göreli aykırı değer) bakılıyor. Sadece tek bir
      // köşe gerçekten belirgin şekilde kötüyse (diğerlerinden hem oransal
      // hem mutlak olarak çok daha büyük) o köşe hatalı sayılıp dışlanıyor.
      // Aksi halde (4 köşe de birbirine yakın artık veriyor — perspektif
      // yüksek olsa bile) tam 4-nokta homografiye güveniliyor, çünkü o,
      // AFİN'in aksine gerçek perspektifi doğru modelleyen tek yöntem.
      const belirginTekKotuKose =
        enKotuIndex !== -1 && Number.isFinite(enKotuDeger) && Number.isFinite(ikinciKotuDeger) &&
        enKotuDeger > ikinciKotuDeger * 1.8 && (enKotuDeger - ikinciKotuDeger) > 8;

      // YENİ (teşhis): hangi dalın seçildiğini ve sağlık kontrolünün ne
      // döndürdüğünü açıkça kaydediyoruz — daha önce bu bilgi hiçbir yerde
      // görünmüyordu, "tam homografi mi afin mi kullanıldı" kör bir kutuydu.
      const saglikliMi = konveksVeSaglikliMiOto(hassasHedef);

      if (belirginTekKotuKose) {
        const kalanKaynak = hassasKaynak.filter((_, j) => j !== enKotuIndex);
        const kalanHedef = hassasHedef.filter((_, j) => j !== enKotuIndex);
        try { H = afinHesapla(kalanKaynak, kalanHedef); } catch (e) { H = null; }
        disariBirakilanIsaretler.push(bulunanKonumlar[enKotuIndex]);
        secilenYontem = 'afin (belirgin tek kötü köşe dışlandı: ' + bulunanKonumlar[enKotuIndex] + ')';
      } else if (saglikliMi) {
        try { H = homografiHesapla(hassasKaynak, hassasHedef); } catch (e) { H = null; }
        secilenYontem = 'tam homografi (4 köşe sağlıklı)';
      } else if (enKotuIndex !== -1 && Number.isFinite(enKotuDeger)) {
        // Dörtgen dejenere görünüyor ama tek bir belirgin kötü köşe de yok
        // — yine de en kötüyü dışlayıp afin dene, hiç okumamaktan iyidir.
        const kalanKaynak = hassasKaynak.filter((_, j) => j !== enKotuIndex);
        const kalanHedef = hassasHedef.filter((_, j) => j !== enKotuIndex);
        try { H = afinHesapla(kalanKaynak, kalanHedef); } catch (e) { H = null; }
        disariBirakilanIsaretler.push(bulunanKonumlar[enKotuIndex]);
        secilenYontem = 'afin (dörtgen sağlıksız/konveks değil, en kötü köşe [' + bulunanKonumlar[enKotuIndex] + '] dışlandı)';
      }
    } else if (ucKoseBulundu) {
      try { H = afinHesapla(hassasKaynak, hassasHedef); } catch (e) { H = null; }
      secilenYontem = 'afin (sadece 3 köşe bulundu)';
    }

    const koseBulunduMu = !!H;

    return {
      H,
      hizalamaBulunduMu: koseBulunduMu,
      bulunamayanIsaretler,
      disariBirakilanIsaretler,
      hizalamaKanonikNoktalari: koseBulunduMu ? hassasHedef : null,
      hamBulunanKanonikNoktalari: hassasKaynak.length ? hassasKaynak : null,
      koseArtiklariMM: dortKoseDeBulundu
        ? bulunanKonumlar.map((konum, i) => ({ konum, artikMM: artiklarMM[i] }))
        : [],
      // YENİ (teşhis alanları):
      secilenYontem,
      bulunanPikselNoktalari: hassasHedef.length
        ? bulunanKonumlar.map((konum, i) => konum + '=(' + hassasHedef[i].x.toFixed(0) + ',' + hassasHedef[i].y.toFixed(0) + ')').join(', ')
        : null,
      pikselPerMM,
    };
  }

  async function formuOku(kaynak, form, secenekler = {}) {
    const ppmm = secenekler.ppmm || VARSAYILAN_PPMM;
    const uyarilar = [];
    _radyalProfilSatirlari = []; // YENİ (teşhis): her okumada sıfırlanır, her hane için bir satır
    _sonKitapcikTeshis = null; // YENİ (teşhis): her okumada sıfırlanır
    _binaryImageData = null; // önceki okumadan kalan binary temizle

    // YENİ (kritik): cv.js henüz yüklenme sürecindeyse BEKLE, sessizce eski
    // yönteme kayma. Önceden burada bir bekleme yoktu — aynı fotoğraf,
    // uygulama yeni açıldığında (cv henüz hazır değil, eski yöntem) ve
    // birkaç dakika sonra (cv hazır, yeni CV yöntemi) FARKLI sonuçlar
    // veriyordu, çünkü hangi yöntemin çalıştığı saf ŞANSA/zamanlamaya
    // bağlıydı. Burada beklemek, her okumanın AYNI (ve en güvenilir)
    // yöntemi kullanmasını garanti eder — tutarlılık, hız kaybından
    // (birkaç saniye, sadece cv henüz yüklenmediyse) daha değerli.
    if (typeof window.SayfaTespitCV !== 'undefined') {
      await window.SayfaTespitCV.cvHazirBekle();
    }

    const { imageData: fotoImageData } = kaynaktanImageDataAl(kaynak);

    const { H, bulunamayanIsaretler, disariBirakilanIsaretler, hizalamaKanonikNoktalari, hamBulunanKanonikNoktalari, koseArtiklariMM, secilenYontem, bulunanPikselNoktalari, pikselPerMM } =
      formuOtomatikDuzlestir(fotoImageData, form, ppmm);

    // Gerçek ölçek: köşelerden hesaplanan pikselPerMM'yi kullan.
    // Böylece A4 formu A5'e küçültülmüş baskıda da, büyütülmüş baskıda da
    // koordinatlar otomatik doğru ölçeklenir — sabit VARSAYILAN_PPMM değil.
    const gercekPpmm = (pikselPerMM && pikselPerMM > 0) ? pikselPerMM : ppmm;

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

    const { canvas: duzCanvas, imageData: cImageData } = duzCanvasUret(fotoImageData, H, form, gercekPpmm);

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

    const belirsizSayisi = cevaplar.filter((c) => c.uyari).length;
    if (belirsizSayisi > 0) {
      uyarilar.push(belirsizSayisi + ' soruda belirsiz/boş/çoklu işaret tespit edildi.');
    }
    if (_sonKoyulukOzeti) {
      uyarilar.push('Koyuluk özeti: ' + _sonKoyulukOzeti);
    }
    uyarilar.push('[KOD SÜRÜMÜ: v25-dinamikOlcek]');
    if (_sonNumaraTeshis) { uyarilar.push('Numara teşhisi: ' + _sonNumaraTeshis); }
    if (_sonKitapcikTeshis) { uyarilar.push('Kitapçık/Form Kodu teşhisi: ' + _sonKitapcikTeshis); }
    if (_cevapTeshisSatirlari.length) { uyarilar.push('Cevap teşhisi (ders başına en fazla 2 örnek):\n' + _cevapTeshisSatirlari.join('\n')); }
    if (_ardisikAyniSikSatirlari.length) { uyarilar.push('⚠ Ardışık aynı şık tespiti:\n' + _ardisikAyniSikSatirlari.join('\n')); }
    if (_radyalProfilSatirlari.length) { uyarilar.push('Radyal koyuluk profili:\n' + _radyalProfilSatirlari.join('\n')); }

    return {
      basarili: true,
      ogrenciKimlik,
      formKodu,
      cevaplar,
      uyarilar,
      hataAyiklama: {
        duzeltilmisCanvas: duzCanvas,
        hizalamaNoktalari: hizalamaKanonikNoktalari,
        hamHizalamaNoktalari: hamBulunanKanonikNoktalari,
        ornekNoktalari: cevaplarSonuc.ornekNoktalari,
        genelDuzeltme,
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

    const { imageData: fotoImageData } = kaynaktanImageDataAl(kaynak);

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

    const { canvas: duzCanvas, imageData: cImageData } = duzCanvasUret(fotoImageData, H, form, gercekPpmm);
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

    const belirsizSayisi = cevaplar.filter((c) => c.uyari).length;
    if (belirsizSayisi > 0) {
      uyarilar.push(belirsizSayisi + ' soruda belirsiz/boş/çoklu işaret tespit edildi.');
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
