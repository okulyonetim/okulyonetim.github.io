// js/sayfaTespitCV.js
//
// SAF JAVASCRIPT (cvSaf.js) tabanlı, TEK GEÇİŞTE tüm sayfa çerçevesini
// bulan köşe tespiti. Eski iki yöntemin (kenarCizgisiIleKoseBul +
// enBuyukKareBlobuBul, 4 ayrı köşe penceresinde BAĞIMSIZ çalışıp birbirine
// düşen) yerini alır — layoutEngine.js: sayfaCercevesiHesapla() ile
// basılan TEK kesintisiz dikdörtgen çerçeveyi, klasik doküman tarayıcı
// yöntemiyle (Canny + findContours + approxPolyDP) doğrudan bulur.
//
// SÖZLEŞME (contract), eski omrEngine.js: sayfaKoseleriniAra() ile UYUMLU:
//   girdi:  ImageData (analiz çözünürlüğünde)
//   çıktı:  { solUst, sagUst, solAlt, sagAlt } -- ya HEPSİ dolu (kontur
//           yöntemi all-or-nothing çalışır) ya da hiçbiri (boş obje döner,
//           camera.js:_tumKoselerVarMi() zaten bunu bekliyor)
//
// AĞUSTOS 2026 — KÖKLÜ DEĞİŞİKLİK: OpenCV.js (10.9MB WASM) TAMAMEN
// KALDIRILDI. Sedat'ın "çok yavaş, neredeyse hiç okumuyor" şikayeti
// üzerine — kullanılan ~12 fonksiyon (Canny, findContours, threshold,
// dilate/erode, cvtColor, GaussianBlur, contourArea, arcLength,
// approxPolyDP, minAreaRect) js/cvSaf.js'te saf JS olarak yeniden
// yazıldı. Artık cv.Mat/.delete() bellek yönetimi YOK — düz
// Uint8Array kullanılıyor, JS çöp toplayıcısı hallediyor.
//
// cvHazirBekle/cvHazirMi API'si GERİYE DÖNÜK UYUMLULUK için korundu
// (camera.js, app.js, galeriSecici.js, omrEngine.js hiç değişmeden
// çalışmaya devam ediyor) — ama artık saf JS senkron olduğu için bu
// fonksiyonlar anında resolve olan bir no-op'tur, WASM beklemesi YOK.

import * as cvSaf from './cvSaf.js';

const A4_ORANI_DIKEY = 210 / 297;   // ~0.707 (LGS vb. dikey A4)
const A4_ORANI_YATAY = 297 / 210;   // ~1.414 (yatay çekilirse)
const ORAN_TOLERANS = 0.28;         // en-boy oranında bu kadar sapmaya izin ver — 0.18'den artırıldı:
                                    // perspektif altında (kağıt 10-15° eğik) 4-kenar ortalaması da
                                    // beklenen orandan sapabiliyor, dar tolerans trapezi reddediyordu.

const MIN_ALAN_ORANI = 0.12;        // çerçeve, analiz karesinin en az %12'sini kaplamalı (küçükse -> yanlış kontur)
const MAX_ALAN_ORANI = 0.97;        // %97'den büyükse muhtemelen kare kenarı/masa, sayfa değil

// Saf JS motoru senkron ve her zaman hazır — bekleme YOK. Fonksiyonlar
// SADECE geriye dönük API uyumluluğu için burada duruyor.
const _cvHazir = true;

/**
 * GERİYE DÖNÜK UYUMLULUK: eskiden OpenCV.js WASM'ının yüklenmesini
 * beklerdi (birkaç saniye - onlarca saniye sürebiliyordu). Artık saf JS
 * kullanıldığı için hiçbir şey beklemez, anında resolve olur.
 */
export function cvHazirBekle() {
  return Promise.resolve();
}

export function cvHazirMi() {
  return _cvHazir;
}

// omrEngine.js (klasik <script>, ES module değil) bu fonksiyonlara erişebilsin
// diye window'a da asılıyor — nihai okuma artık canlı önizlemedeki AYNI
// güvenilir tam-çerçeve kontur yöntemini kullanabiliyor (bkz. omrEngine.js:
// formuOtomatikDuzlestir).
window.SayfaTespitCV = { sayfaKoseleriniAraCV, cvHazirBekle, cvHazirMi, oranlariHesapla };

// omrEngine.js:adaptifEsikle de saf-JS motoruna (cvSaf.js) ihtiyaç duyuyor
// (adaptiveThresholdGaussian) — aynı köprü deseniyle window'a asılıyor.
// cvSaf.js'in kendisi tarayıcıya bağımlı değil (saf ES module), sadece bu
// köprü noktası window'a erişiyor.
window.CvSaf = cvSaf;

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

/**
 * Ham kontur noktalarını, approxPolyDP'nin bulduğu 4 köşeye göre 4 gruba
 * böler. Her grup o kenara ait kontur noktalarını içerir.
 * kontur: {x,y} nokta dizisi (cvSaf.findContours çıktısı). Koseler:
 * [p0,p1,p2,p3] (kontur içindeki indeks sırası).
 */
function _konturKenarlariAyir(kontur, koselIndeksler) {
  const n = kontur.length;
  const gruplar = [[], [], [], []];
  for (let i = 0; i < n; i++) {
    // her piksel hangi köşeye en yakın? → o kenarın grubuna girer
    let enYakin = 0, enYakinUzaklik = Infinity;
    const px = kontur[i].x, py = kontur[i].y;
    for (let k = 0; k < 4; k++) {
      const ki = koselIndeksler[k];
      const kx = kontur[ki].x, ky = kontur[ki].y;
      const d = (px - kx) ** 2 + (py - ky) ** 2;
      if (d < enYakinUzaklik) { enYakinUzaklik = d; enYakin = k; }
    }
    gruplar[enYakin].push({ x: px, y: py });
  }
  return gruplar;
}

/**
 * Bir nokta grubuna en küçük kareler doğrusu (ax + by + c = 0) uydurur.
 * Neredeyse dikey çizgiler için x=f(y), diğerleri için y=f(x) kullanılır.
 * Döner: { a, b, c } — doğru denklemi ax + by + c = 0.
 */
function _dogruUydur(noktalar) {
  if (noktalar.length < 2) return null;
  const n = noktalar.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (const { x, y } of noktalar) {
    sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y;
  }
  const mx = sx / n, my = sy / n;
  // Kovaryans matrisi öz vektörü (PCA ile en iyi doğru yönü)
  const cxx = sxx / n - mx * mx;
  const cxy = sxy / n - mx * my;
  const cyy = syy / n - my * my;
  // Normal vektör: kovaryans matrisinin KÜÇÜK öz değerine ait öz vektör
  // θ = atan2(2cxy, cxx-cyy)/2 ile doğru yönünü bul, normal ⊥ buna
  const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  const a = -Math.sin(theta); // doğru yönü (cos θ, sin θ) → normal (-sin θ, cos θ)
  const b = Math.cos(theta);
  const c = -(a * mx + b * my);
  return { a, b, c };
}

/**
 * İki doğrunun (a1x+b1y+c1=0) ve (a2x+b2y+c2=0) kesişim noktasını döner.
 * Paralel doğrular için null döner.
 */
function _dogruKesisimi(d1, d2) {
  const det = d1.a * d2.b - d2.a * d1.b;
  if (Math.abs(det) < 1e-10) return null;
  return {
    x: (d1.b * d2.c - d2.b * d1.c) / (-det),  // Cramer
    y: (d2.a * d1.c - d1.a * d2.c) / (-det),
  };
}

/**
 * approxPolyDP'nin verdiği ham 4 köşeyi, konturun tüm piksellerine doğru
 * fit ederek rafine eder. Başarısızsa orijinal köşeleri döner.
 *
 * kontur    : {x,y} nokta dizisi (cvSaf.findContours çıktısı, kontur
 *             boyunca TÜM piksel noktalarını içerir)
 * yaklasik4 : cvSaf.approxPolyDP çıkışı, {x,y} nokta dizisi (4 nokta)
 * roiOfsX/Y : tam görüntü koordinatına geri taşıma ofsetleri
 */
function _koseRafine(kontur, yaklasik4, roiOfsX, roiOfsY) {
  // approxPolyDP çıkışındaki 4 nokta → kontur üzerindeki indekslerini bul
  const koselIndeksler = [];
  for (let k = 0; k < 4; k++) {
    const tx = yaklasik4[k].x, ty = yaklasik4[k].y;
    let enYakin = 0, enYakinD = Infinity;
    for (let i = 0; i < kontur.length; i++) {
      const d = (kontur[i].x - tx) ** 2 + (kontur[i].y - ty) ** 2;
      if (d < enYakinD) { enYakinD = d; enYakin = i; }
    }
    koselIndeksler.push(enYakin);
  }

  const gruplar = _konturKenarlariAyir(kontur, koselIndeksler);

  // Her kenar grubuna doğru uydur (yeterli nokta yoksa rafine iptal)
  const dogrular = gruplar.map(_dogruUydur);
  if (dogrular.some((d, i) => d === null || gruplar[i].length < 4)) {
    // yeterli nokta yok — orijinal köşeleri kullan
    const ham = [];
    for (let k = 0; k < 4; k++) {
      ham.push({ x: yaklasik4[k].x + roiOfsX, y: yaklasik4[k].y + roiOfsY });
    }
    return noktalariSirala(ham);
  }

  // Komşu iki kenarın kesişimi → rafine köşe
  // Kenar sırası: grup 0(köşe0→köşe1), 1(köşe1→köşe2), 2(köşe2→köşe3), 3(köşe3→köşe0)
  const rafineHam = [];
  for (let k = 0; k < 4; k++) {
    const d1 = dogrular[k];
    const d2 = dogrular[(k + 1) % 4];
    const kesisim = d1 && d2 ? _dogruKesisimi(d1, d2) : null;
    if (kesisim) {
      rafineHam.push({ x: kesisim.x + roiOfsX, y: kesisim.y + roiOfsY });
    } else {
      // bu çift paralel (nadir) — orijinal köşeye geri dön
      rafineHam.push({ x: yaklasik4[k].x + roiOfsX, y: yaklasik4[k].y + roiOfsY });
    }
  }
  return noktalariSirala(rafineHam);
}

/**
 * Bulunan dörtgenin BEKLENEN en-boy oranına yeterince yakın olup olmadığını
 * kontrol eder.
 *
 * ESKİ YÖNTEM hatası: sadece üst kenar / sol kenar oranına bakılıyordu.
 * Kağıt 10-15° eğik tutulunca (perspektif trapezi) üst kenar kısalır, sol
 * kenar da değişir → oran beklentiden sapıyor → ORAN_TOLERANS aşılıyor →
 * trapez reddedilip köşeler hiç güncellenmiyor.
 *
 * YENİ YÖNTEM: 4 kenarın iki ortalamasını kullan —
 *   genislik  = (üst + alt) / 2
 *   yukseklik = (sol + sag) / 2
 * Bu formül perspektif trapezinde gerçek kağıt oranına çok daha yakın çıkar
 * çünkü kısalan üst kenar, uzayan alt kenarla dengelenir.
 */
function enBoyOraniUygunMu(koseler, oranlar) {
  const ust  = kenarUzunluk(koseler.solUst, koseler.sagUst);
  const alt  = kenarUzunluk(koseler.solAlt, koseler.sagAlt);
  const sol  = kenarUzunluk(koseler.solUst, koseler.solAlt);
  const sag  = kenarUzunluk(koseler.sagUst, koseler.sagAlt);
  const genislik  = (ust + alt) / 2;
  const yukseklik = (sol + sag) / 2;
  if (genislik < 1 || yukseklik < 1) return false;
  const oran = genislik / yukseklik;
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
  let enIyi = null;
  let enIyiAlan = -1;
  let enBuyukHamKontur = null; // approx 4'e düşmeyen ama alanı en büyük kontur — minAreaRect yedeği için
  let enBuyukHamAlan = -1;

  // ── ZEMIN BAĞIMSIZ MASKE ─────────────────────────────────────────
  // En parlak %40 pikseli "kağıt bölgesi" olarak maskele.
  // Adaptif eşik: histogramdan %60'ıncı yüzdelik dilim değeri bulunur,
  // bu değerin üstündeki pikseller kağıt sayılır. Zemin rengi (beyaz/
  // koyu/renkli) fark etmez — kağıt her zaman sahnenin en parlak
  // unsurudur (özellikle standart A4 sınav kağıtları için).
  let maske;
  {
    const histogram = new Uint32Array(256);
    const gData = gri.data; // Uint8Array
    const toplamPiksel = gData.length;
    for (let i = 0; i < toplamPiksel; i++) histogram[gData[i]]++;
    // %60'ıncı yüzdelik: aşağıdan toplamın %60'ı geçince o bin
    const hedef = Math.round(toplamPiksel * 0.60);
    let kumu = 0, esik = 200;
    for (let v = 0; v < 256; v++) {
      kumu += histogram[v];
      if (kumu >= hedef) { esik = Math.max(100, v); break; }
    }
    // Eşik üstü = kağıt (255), altı = zemin (0)
    maske = cvSaf.threshold(gri, esik, 255);
    // Küçük delikleri kapat (dilate→erode = morfolojik kapama)
    maske = cvSaf.morfolojikKapama(maske, 15);
  }
  // ─────────────────────────────────────────────────────────────────

  let kenarlar = cvSaf.canny(gri, cannyAlt, cannyUst);
  // Maske uygula: zemin bölgesindeki Canny kenarlarını sıfırla
  kenarlar = cvSaf.bitwiseAnd(kenarlar, maske);
  // CHAIN_APPROX_NONE eşdeğeri: cvSaf.findContours zaten kontur boyunca
  // TÜM pikselleri döndürüyor (_koseRafine'nin doğru fit için ihtiyaç
  // duyduğu şey buydu).
  kenarlar = cvSaf.dilate(kenarlar, 3, 2);
  const konturlar = cvSaf.findContours(kenarlar);

  for (const { points: kontur, alan: hamAlan } of konturlar) {
    const hamAlanOrani = hamAlan / tamAlan;
    if (hamAlanOrani >= MIN_ALAN_ORANI && hamAlanOrani <= MAX_ALAN_ORANI && hamAlan > enBuyukHamAlan) {
      enBuyukHamAlan = hamAlan;
      enBuyukHamKontur = kontur;
    }

    const cevre = cvSaf.konturCevresiHesapla(kontur);
    for (const epsOrani of epsilonlar) {
      const yaklasik = cvSaf.approxPolyDP(kontur, epsOrani * cevre, true);

      if (yaklasik.length === 4 && cvSaf.isContourConvex(yaklasik)) {
        const alan = cvSaf.konturAlaniHesapla(yaklasik);
        const alanOrani = alan / tamAlan;
        if (alanOrani >= MIN_ALAN_ORANI && alanOrani <= MAX_ALAN_ORANI && alan > enIyiAlan) {
          // YENİ: approxPolyDP'nin tek-piksel köşeleri yerine her kenar
          // boyunca doğru fit edip komşu doğruların kesişimini kullan.
          // Kamera titremesinde / farklı çekimlerde köşe konumu çok daha
          // stabil kalıyor (tek pikselin gürültüsü değil, kenarın ortalama
          // yönü belirliyor).
          const sirali = _koseRafine(kontur, yaklasik, roiOfsX, roiOfsY);
          if (enBoyOraniUygunMu(sirali, oranlar)) {
            enIyi = sirali;
            enIyiAlan = alan;
          }
        }
      }
      if (enIyi) break; // bu epsilon işe yaradıysa daha gevşek epsilonu denemeye gerek yok
    }
  }

  // 4-köşeli net bir kontur bulunamadıysa: en büyük makul-alanlı ham
  // konturun döndürülmüş sınırlayıcı dikdörtgenini (minAreaRect) dene —
  // kırışıklık çizgiyi böldüğü için approxPolyDP tam 4 noktaya inemese
  // bile, konturun genel dış hattı genelde hâlâ sayfa boyutuna yakındır.
  if (!enIyi && enBuyukHamKontur) {
    const rotRect = cvSaf.minAreaRect(enBuyukHamKontur);
    const rectAlanOrani = (rotRect.size.width * rotRect.size.height) / tamAlan;
    if (rectAlanOrani >= MIN_ALAN_ORANI && rectAlanOrani <= MAX_ALAN_ORANI) {
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

  let gri = cvSaf.griyeCevir(imageData);
  // YENİ: (5,5) yerine (3,3) — sayfa çerçevesi zaten ince (0.35mm baskı,
  // ~0.8px analiz çözünürlüğünde); (5,5) blur bunu neredeyse tamamen
  // eritiyordu. (3,3) hâlâ gürültüyü azaltır ama ince çizgiyi silmez.
  gri = cvSaf.gaussianBlur(gri, 3);

  const tamAlan = imageData.width * imageData.height;
  let sonuc = null;

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
      const roi = cvSaf.roiKirp(gri, x0, y0, x1 - x0, y1 - y0);
      sonuc = _konturAra(roi, x0, y0, tamAlan, beklenenOranlar);
    }
  }

  // ---- Takip başarısızsa (ya da hiç önceki köşe yoksa) TAM KARE araması ----
  if (!sonuc) {
    sonuc = _konturAra(gri, 0, 0, tamAlan, beklenenOranlar);
  }

  return sonuc || {};
}
