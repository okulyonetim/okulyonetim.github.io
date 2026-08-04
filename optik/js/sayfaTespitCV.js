// js/sayfaTespitCV.js
//
// OpenCV.js (WASM) tabanlı, TEK GEÇİŞTE tüm sayfa çerçevesini bulan köşe
// tespiti. Eski iki yöntemin (kenarCizgisiIleKoseBul + enBuyukKareBlobuBul,
// 4 ayrı köşe penceresinde BAĞIMSIZ çalışıp birbirine düşen) yerini alır —
// layoutEngine.js: sayfaCercevesiHesapla() ile basılan TEK kesintisiz
// dikdörtgen çerçeveyi, klasik doküman tarayıcı yöntemiyle (Canny +
// findContours + approxPolyDP) doğrudan bulur.
//
// SÖZLEŞME (contract), eski omrEngine.js: sayfaKoseleriniAra() ile UYUMLU:
//   girdi:  ImageData (analiz çözünürlüğünde)
//   çıktı:  { solUst, sagUst, solAlt, sagAlt } -- ya HEPSİ dolu (kontur
//           yöntemi all-or-nothing çalışır) ya da hiçbiri (boş obje döner,
//           camera.js:_tumKoselerVarMi() zaten bunu bekliyor)
//
// ÖNEMLİ — BELLEK YÖNETİMİ: cv.Mat nesneleri WASM tarafında manuel
// yönetilir. Her mat mutlaka .delete() ile serbest bırakılmalı, aksi halde
// birkaç dakika içinde bellek sızıntısından uygulama çöker. Bu dosyadaki
// HER fonksiyon try/finally ile bunu garanti eder — yeni kod eklerken aynı
// deseni koruyun.
//
// KURULUM (bu dosyayı kullanmadan önce):
//   1) opencv.js (WASM build) dosyasını www/lib/opencv.js altına koyun
//      (offline APK için CDN'e değil, bundled asset'e ihtiyaç var).
//   2) index.html / kamera.html'e: <script src="lib/opencv.js"></script>
//      (async DEĞİL — cv objesi senkron beklenecek, aşağıdaki cvHazirBekle
//      zaten polling ile bekliyor ama script tag'in DOM'da olması yeterli.)
//   3) Kamera başlamadan önce: await cvHazirBekle();

const A4_ORANI_DIKEY = 210 / 297;   // ~0.707 (LGS vb. dikey A4)
const A4_ORANI_YATAY = 297 / 210;   // ~1.414 (yatay çekilirse)
const ORAN_TOLERANS = 0.18;         // en-boy oranında bu kadar sapmaya izin ver (kağıt hafif eğik tutulabilir)

const MIN_ALAN_ORANI = 0.12;        // çerçeve, analiz karesinin en az %12'sini kaplamalı (küçükse -> yanlış kontur)
const MAX_ALAN_ORANI = 0.97;        // %97'den büyükse muhtemelen kare kenarı/masa, sayfa değil

let _cvHazir = false;
let _cvHazirPromise = null;

/** OpenCV.js WASM modülünün yüklenmesini bekler (uygulama başına bir kere). */
export function cvHazirBekle() {
  if (_cvHazirPromise) return _cvHazirPromise;
  _cvHazirPromise = new Promise((resolve) => {
    if (typeof cv !== "undefined" && cv.Mat) {
      _cvHazir = true;
      resolve();
      return;
    }
    const kontrolAralik = setInterval(() => {
      if (typeof cv !== "undefined" && cv.Mat) {
        clearInterval(kontrolAralik);
        _cvHazir = true;
        resolve();
      }
    }, 50);
  });
  return _cvHazirPromise;
}

export function cvHazirMi() {
  return _cvHazir;
}

// omrEngine.js (klasik <script>, ES module değil) bu fonksiyonlara erişebilsin
// diye window'a da asılıyor — nihai okuma artık canlı önizlemedeki AYNI
// güvenilir tam-çerçeve kontur yöntemini kullanabiliyor (bkz. omrEngine.js:
// formuOtomatikDuzlestir).
window.SayfaTespitCV = { sayfaKoseleriniAraCV, cvHazirBekle, cvHazirMi, oranlariHesapla };

/**
 * YENİ (Sedat isteği, Ağustos 2026): bir sayfanın mm cinsinden genişlik/
 * yüksekliğinden, sayfaKoseleriniAraCV'nin beklediği [dikeyOran, yatayOran]
 * çiftini üretir. width/height verilmezse (veya sıfırsa) A4'e düşer.
 */
export function oranlariHesapla(genislikMM, yukseklikMM) {
  if (!genislikMM || !yukseklikMM) return [A4_ORANI_DIKEY, A4_ORANI_YATAY];
  const dikey = genislikMM / yukseklikMM;
  return [dikey, 1 / dikey];
}

/**
 * 4 noktayı (herhangi bir sırada gelebilir) solUst/sagUst/sagAlt/solAlt
 * olarak sıralar. Standart "sum/diff" yöntemi:
 *   solÜst  = x+y EN KÜÇÜK      sağAlt = x+y EN BÜYÜK
 *   sağÜst  = x-y EN BÜYÜK      solAlt = x-y EN KÜÇÜK
 */
function noktalariSirala(noktalar) {
  const toplamSirali = [...noktalar].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const farkSirali = [...noktalar].sort((a, b) => (a.x - a.y) - (b.x - b.y));
  return {
    solUst: toplamSirali[0],
    sagAlt: toplamSirali[3],
    solAlt: farkSirali[0],
    sagUst: farkSirali[3],
  };
}

function kenarUzunluk(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/** Bulunan dörtgenin BEKLENEN en-boy oranına (dikey ya da yatay) yeterince yakın olup olmadığını kontrol eder. */
function enBoyOraniUygunMu(koseler, oranlar) {
  const ust = kenarUzunluk(koseler.solUst, koseler.sagUst);
  const sol = kenarUzunluk(koseler.solUst, koseler.solAlt);
  if (ust < 1 || sol < 1) return false;
  const oran = ust / sol;
  const [dikeyOran, yatayOran] = oranlar || [A4_ORANI_DIKEY, A4_ORANI_YATAY];
  const dikeyFark = Math.abs(oran - dikeyOran) / dikeyOran;
  const yatayFark = Math.abs(oran - yatayOran) / yatayOran;
  return dikeyFark < ORAN_TOLERANS || yatayFark < ORAN_TOLERANS;
}

// YENİ: kırışık/buruşuk kağıtlarda (kırışıklık gölgeleri çerçeve çizgisini
// Canny'de parçalayabiliyor) TEK bir sabit (Canny eşiği, approx epsilon)
// çifti bazen HİÇBİR kare için kontur bulamıyordu — "köşe yakalayıcılar hiç
// çalışmıyor" olarak gözlemlendi. Artık sırayla birkaç ön ayar (gittikçe
// daha toleranslı) denenir, ilk BAŞARILI olan kullanılır; hiçbiri 4 köşeli
// dışbükey bir kontur bulamazsa, en büyük makul alandaki konturun minAreaRect
// (döndürülmüş sınırlayıcı dikdörtgen) yaklaşıklığına düşülür — bu, çizgi
// approxPolyDP'nin tam 4 noktaya indiremediği durumlarda bile kabaca doğru
// bir dörtgen verir.
const _CANNY_ON_AYARLARI = [
  { alt: 30, ust: 100, epsilonlar: [0.02, 0.035] },  // normal (önceki tek ayar)
  { alt: 15, ust: 60, epsilonlar: [0.02, 0.035, 0.05] }, // düşük kontrast / hafif kırışık
  { alt: 10, ust: 40, epsilonlar: [0.02, 0.04, 0.06] },  // en toleranslı — son çare
];

function _konturAraTekAyar(gri, roiOfsX, roiOfsY, tamAlan, cannyAlt, cannyUst, epsilonlar, oranlar) {
  const kenarlar = new cv.Mat();
  const dilateKernel = cv.Mat.ones(3, 3, cv.CV_8U);
  const konturlar = new cv.MatVector();
  const hiyerarsi = new cv.Mat();

  let enIyi = null;
  let enIyiAlan = -1;
  let enBuyukHamKontur = null; // approx 4'e düşmeyen ama alanı en büyük kontur — minAreaRect yedeği için
  let enBuyukHamAlan = -1;

  try {
    cv.Canny(gri, kenarlar, cannyAlt, cannyUst);
    cv.dilate(kenarlar, kenarlar, dilateKernel, new cv.Point(-1, -1), 2);
    cv.findContours(kenarlar, konturlar, hiyerarsi, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    for (let i = 0; i < konturlar.size(); i++) {
      const kontur = konturlar.get(i);
      const hamAlan = cv.contourArea(kontur);
      const hamAlanOrani = hamAlan / tamAlan;
      if (hamAlanOrani >= MIN_ALAN_ORANI && hamAlanOrani <= MAX_ALAN_ORANI && hamAlan > enBuyukHamAlan) {
        enBuyukHamAlan = hamAlan;
        enBuyukHamKontur = kontur; // .delete() döngü sonunda ayrıca yapılıyor, burada referans tutuluyor
      }

      const cevre = cv.arcLength(kontur, true);
      for (const epsOrani of epsilonlar) {
        const yaklasik = new cv.Mat();
        cv.approxPolyDP(kontur, yaklasik, epsOrani * cevre, true);

        if (yaklasik.rows === 4 && cv.isContourConvex(yaklasik)) {
          const alan = cv.contourArea(yaklasik);
          const alanOrani = alan / tamAlan;
          if (alanOrani >= MIN_ALAN_ORANI && alanOrani <= MAX_ALAN_ORANI && alan > enIyiAlan) {
            const ham = [];
            for (let k = 0; k < 4; k++) {
              ham.push({
                x: yaklasik.data32S[k * 2] + roiOfsX,
                y: yaklasik.data32S[k * 2 + 1] + roiOfsY,
              });
            }
            const sirali = noktalariSirala(ham);
            if (enBoyOraniUygunMu(sirali, oranlar)) {
              enIyi = sirali;
              enIyiAlan = alan;
            }
          }
        }
        yaklasik.delete();
        if (enIyi) break; // bu epsilon işe yaradıysa daha gevşek epsilonu denemeye gerek yok
      }
      if (kontur !== enBuyukHamKontur) kontur.delete();
    }

    // 4-köşeli net bir kontur bulunamadıysa: en büyük makul-alanlı ham
    // konturun döndürülmüş sınırlayıcı dikdörtgenini (minAreaRect) dene —
    // kırışıklık çizgiyi böldüğü için approxPolyDP tam 4 noktaya inemese
    // bile, konturun genel dış hattı genelde hâlâ sayfa boyutuna yakındır.
    if (!enIyi && enBuyukHamKontur) {
      const rotRect = cv.minAreaRect(enBuyukHamKontur);
      const rectAlanOrani = (rotRect.size.width * rotRect.size.height) / tamAlan;
      if (rectAlanOrani >= MIN_ALAN_ORANI && rectAlanOrani <= MAX_ALAN_ORANI) {
        // cv.RotatedRect.points() opencv.js WASM derlemesinde güvenilir
        // biçimde bulunmuyor — köşeleri merkez/boyut/açıdan elle hesapla.
        const { center, size, angle } = rotRect;
        const rad = (angle * Math.PI) / 180;
        const cosA = Math.cos(rad), sinA = Math.sin(rad);
        const yariGenislik = size.width / 2, yariYukseklik = size.height / 2;
        const kenarlarRel = [
          { dx: -yariGenislik, dy: -yariYukseklik },
          { dx: yariGenislik, dy: -yariYukseklik },
          { dx: yariGenislik, dy: yariYukseklik },
          { dx: -yariGenislik, dy: yariYukseklik },
        ];
        const ham = kenarlarRel.map(({ dx, dy }) => ({
          x: center.x + dx * cosA - dy * sinA + roiOfsX,
          y: center.y + dx * sinA + dy * cosA + roiOfsY,
        }));
        const sirali = noktalariSirala(ham);
        if (enBoyOraniUygunMu(sirali, oranlar)) enIyi = sirali;
      }
    }
    if (enBuyukHamKontur) enBuyukHamKontur.delete();
  } finally {
    kenarlar.delete();
    dilateKernel.delete();
    konturlar.delete();
    hiyerarsi.delete();
  }

  return enIyi;
}

/**
 * Bir ROI (bölge, tam gri görüntünün alt-matrisi) içinde en büyük geçerli
 * 4-köşeli konturu arar. roiOfsX/roiOfsY, sonucu ROI koordinatından TAM
 * görüntü koordinatına geri taşımak için eklenir. tamAlan, alan-oranı
 * filtresi için her zaman TAM KARENİN alanı olmalı (ROI'nin değil) —
 * aksi halde takip modunda MIN/MAX_ALAN_ORANI eşikleri anlamsızlaşır.
 *
 * Sırayla _CANNY_ON_AYARLARI listesindeki ön ayarları dener, ilk başarılı
 * olanda durur (bkz. yukarıdaki not — kırışık kağıtlarda tek sabit eşik
 * yetersiz kalıyordu).
 */
function _konturAra(gri, roiOfsX, roiOfsY, tamAlan, oranlar) {
  for (const ayar of _CANNY_ON_AYARLARI) {
    const sonuc = _konturAraTekAyar(gri, roiOfsX, roiOfsY, tamAlan, ayar.alt, ayar.ust, ayar.epsilonlar, oranlar);
    if (sonuc) return sonuc;
  }
  return null;
}

/**
 * ANA FONKSİYON — eski sayfaKoseleriniAra(imageData, hassasiyet) ile
 * ÇAĞRI UYUMLU (camera.js tarafında tek satır değişiklikle takılabilir),
 * ek olarak TAKİP (tracking) için üçüncü parametre alır.
 *
 * @param {ImageData} imageData - analiz çözünürlüğünde kare
 * @param {object} [hassasiyet] - kullanılmıyor, eski çağrı imzasıyla
 *   uyumluluk için tutuldu (camera.js değiştirmeden geçirebilsin diye)
 * @param {{solUst,sagUst,solAlt,sagAlt}|null} [sonBilinenKoseler] - bir
 *   önceki turda bulunan köşeler. Verilirse ÖNCE onun etrafında dar bir
 *   ROI'de aranır (çok daha hızlı, "anlık" hissi bu sayede oluşur);
 *   bulunamazsa otomatik olarak TAM KARE aramasına düşer.
 * @param {[number,number]} [beklenenOranlar] - YENİ (Sedat isteği, Ağustos
 *   2026: "Köşe yakalayıcılar her formda aktif çalışsın") — [dikeyOran,
 *   yatayOran] olarak taranan sayfanın GERÇEK en-boy oranı. Verilmezse
 *   A4'e (LGS/Bursluluk) düşülür — bu yüzden önceden Optik Form Editörü
 *   ile A4-dışı (A5/A6/A7/Özel Boyut) tasarlanmış formlarda köşe tespiti
 *   sessizce reddediyordu (dörtgen bulunuyordu ama "A4 oranına uymuyor"
 *   diye elenip boş dönülüyordu). Her form kendi gerçek oranını göndermeli
 *   (bkz. omrEngine.js: sayfaKoseleriniAraHibrit, camera.js: canlı önizleme).
 * @returns {{solUst,sagUst,solAlt,sagAlt}} bulunamadıysa boş obje {}
 *   (camera.js: _tumKoselerVarMi() bunu "yok" olarak yorumluyor)
 */
export function sayfaKoseleriniAraCV(imageData, hassasiyet, sonBilinenKoseler, beklenenOranlar) {
  if (!_cvHazir) return {};

  const src = cv.matFromImageData(imageData);
  const gri = new cv.Mat();
  let sonuc = null;

  try {
    cv.cvtColor(src, gri, cv.COLOR_RGBA2GRAY);
    // YENİ: (5,5) yerine (3,3) — sayfa çerçevesi zaten ince (0.35mm baskı,
    // ~0.8px analiz çözünürlüğünde); (5,5) blur bunu neredeyse tamamen
    // eritiyordu. (3,3) hâlâ gürültüyü azaltır ama ince çizgiyi silmez.
    cv.GaussianBlur(gri, gri, new cv.Size(3, 3), 0);

    const tamAlan = imageData.width * imageData.height;

    // ---- TAKİP MODU: son bilinen köşelerin etrafında dar ROI'de ara ----
    // Bu, "her turda sıfırdan tam kare taraması" yerine geçen asıl hız
    // kazanımı — önceki mesajda konuşulan "kare-kare hafıza yok" sorununun
    // çözümü burası.
    if (sonBilinenKoseler && sonBilinenKoseler.solUst && sonBilinenKoseler.sagAlt) {
      const PAY_ORANI = 0.28; // her yöne, dörtgen boyutunun bu kadarı kadar genişlet
      const minX = Math.min(sonBilinenKoseler.solUst.x, sonBilinenKoseler.solAlt.x);
      const maxX = Math.max(sonBilinenKoseler.sagUst.x, sonBilinenKoseler.sagAlt.x);
      const minY = Math.min(sonBilinenKoseler.solUst.y, sonBilinenKoseler.sagUst.y);
      const maxY = Math.max(sonBilinenKoseler.solAlt.y, sonBilinenKoseler.sagAlt.y);
      const genislik = maxX - minX, yukseklik = maxY - minY;
      const payX = genislik * PAY_ORANI, payY = yukseklik * PAY_ORANI;

      const x0 = Math.max(0, Math.round(minX - payX));
      const y0 = Math.max(0, Math.round(minY - payY));
      const x1 = Math.min(imageData.width, Math.round(maxX + payX));
      const y1 = Math.min(imageData.height, Math.round(maxY + payY));

      if (x1 - x0 > 20 && y1 - y0 > 20) {
        const roi = gri.roi(new cv.Rect(x0, y0, x1 - x0, y1 - y0));
        sonuc = _konturAra(roi, x0, y0, tamAlan, beklenenOranlar);
        roi.delete();
      }
    }

    // ---- Takip başarısızsa (ya da hiç önceki köşe yoksa) TAM KARE araması ----
    if (!sonuc) {
      sonuc = _konturAra(gri, 0, 0, tamAlan, beklenenOranlar);
    }
  } finally {
    src.delete();
    gri.delete();
  }

  return sonuc || {};
}
