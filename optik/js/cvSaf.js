// js/cvSaf.js
//
// OpenCV.js'in (10.9MB WASM) YERİNİ ALAN, sadece bu projenin ihtiyaç
// duyduğu ~12 fonksiyonun saf JavaScript karşılıkları. Amaç: sıfır dış
// bağımlılık, anında (senkron, WASM derlemesi beklemeden) hazır olan bir
// görüntü işleme motoru.
//
// Ağustos 2026 — Sedat'ın "çok yavaş, neredeyse hiç okumuyor" şikayeti
// üzerine: js/opencv.js (10.9MB) kaldırıldı, bu dosya onun yerine geçti.
// sayfaTespitCV.js ve omrEngine.js:adaptifEsikle bu modülü kullanıyor.
//
// TASARIM NOTU: cv.Mat'ın aksine burada Mat nesnesi yok, .delete() yok —
// düz Uint8Array/Int32Array kullanılıyor, JS'in kendi çöp toplayıcısına
// bırakılıyor. Bellek sızıntısı riski YOK (WASM tarafında manuel yönetim
// gerektiren bir şey yok).
//
// Basit gri-tonlama görüntü gösterimi: { width, height, data: Uint8Array }
// (data.length === width*height, tek kanal).

// ─────────────────────────────────────────────────────────────────────────
// Temel dönüşümler
// ─────────────────────────────────────────────────────────────────────────

/**
 * Gri görüntüden bir alt-dikdörtgen (ROI) kırpar. cv.Mat.roi() karşılığı —
 * ama cv.Mat'ın aksine bu bir GERÇEK KOPYA döndürür (view değil), çünkü
 * altta düz Uint8Array kullanıyoruz ve stride/offset takibi ekstra
 * karmaşıklık katardı; bu boyutlardaki görüntüler için kopyalama maliyeti
 * ihmal edilebilir.
 */
export function roiKirp(gri, x0, y0, genislik, yukseklik) {
  const { width, data } = gri;
  const cikti = new Uint8Array(genislik * yukseklik);
  for (let y = 0; y < yukseklik; y++) {
    const kaynakOfs = (y0 + y) * width + x0;
    const hedefOfs = y * genislik;
    for (let x = 0; x < genislik; x++) {
      cikti[hedefOfs + x] = data[kaynakOfs + x];
    }
  }
  return { width: genislik, height: yukseklik, data: cikti };
}

/** RGBA ImageData'dan tek-kanallı gri görüntüye (Uint8Array) çevirir. */
export function griyeCevir(imageData) {
  const { width, height, data } = imageData;
  const gri = new Uint8Array(width * height);
  for (let i = 0, n = width * height; i < n; i++) {
    const idx = i * 4;
    // OpenCV'nin COLOR_RGBA2GRAY ile aynı ağırlıklar (BT.601 luma)
    gri[i] = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) | 0;
  }
  return { width, height, data: gri };
}

/**
 * Ayrılabilir (separable) Gauss bulanıklaştırma. cv.GaussianBlur'un (3,3)
 * çağrısına denk — kernel boyutu tek sayı olmalı.
 */
export function gaussianBlur(gri, kernelBoyutu = 3, sigma = 0) {
  const { width, height, data } = gri;
  const yari = Math.floor(kernelBoyutu / 2);
  if (sigma <= 0) sigma = 0.3 * (yari - 1) + 0.8; // OpenCV'nin varsayılan formülü

  const kernel = new Float32Array(kernelBoyutu);
  let toplam = 0;
  for (let i = 0; i < kernelBoyutu; i++) {
    const x = i - yari;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    toplam += kernel[i];
  }
  for (let i = 0; i < kernelBoyutu; i++) kernel[i] /= toplam;

  // Yatay geçiş
  const yatay = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const satirOfs = y * width;
    for (let x = 0; x < width; x++) {
      let toplamDeger = 0;
      for (let k = 0; k < kernelBoyutu; k++) {
        let sx = x + k - yari;
        // BORDER_REFLECT: kenarları yansıt (OpenCV varsayılanı)
        if (sx < 0) sx = -sx;
        if (sx >= width) sx = 2 * width - sx - 2;
        sx = Math.max(0, Math.min(width - 1, sx));
        toplamDeger += data[satirOfs + sx] * kernel[k];
      }
      yatay[satirOfs + x] = toplamDeger;
    }
  }

  // Dikey geçiş
  const sonuc = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let toplamDeger = 0;
      for (let k = 0; k < kernelBoyutu; k++) {
        let sy = y + k - yari;
        if (sy < 0) sy = -sy;
        if (sy >= height) sy = 2 * height - sy - 2;
        sy = Math.max(0, Math.min(height - 1, sy));
        toplamDeger += yatay[sy * width + x] * kernel[k];
      }
      sonuc[y * width + x] = Math.round(toplamDeger);
    }
  }

  return { width, height, data: sonuc };
}

// ─────────────────────────────────────────────────────────────────────────
// Eşikleme
// ─────────────────────────────────────────────────────────────────────────

/** Basit global eşikleme. THRESH_BINARY: >esik ise 255, değilse 0. */
export function threshold(gri, esikDegeri, maxDeger = 255) {
  const { width, height, data } = gri;
  const cikti = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) {
    cikti[i] = data[i] > esikDegeri ? maxDeger : 0;
  }
  return { width, height, data: cikti };
}

/**
 * cv.adaptiveThreshold(ADAPTIVE_THRESH_GAUSSIAN_C, THRESH_BINARY_INV)
 * karşılığı. Her piksel, kendi yerel (blockSize×blockSize) Gauss-ağırlıklı
 * komşuluk ortalamasından C çıkarılarak eşiklenir — ışık/gölge
 * farklılıklarını global eşiklemeden çok daha iyi tolere eder.
 *
 * PERFORMANS: blockSize büyük (131 gibi) olduğunda naif O(w*h*blockSize²)
 * çok yavaş olur. Bunun yerine integral image (özet toplam tablosu) ile
 * kutu-bulanıklaştırma (box blur) yapılır — Gauss'a görsel olarak çok
 * yakın sonuç verir, O(w*h) karmaşıklıkta. blockSize tek sayıya
 * yuvarlanır (OpenCV kuralı).
 */
export function adaptiveThresholdGaussian(gri, blockSize, C, tersine = true) {
  const { width, height, data } = gri;
  if (blockSize % 2 === 0) blockSize += 1;
  const yari = Math.floor(blockSize / 2);

  // Integral image (satır bazında kümülatif toplam, sonra sütun bazında)
  // (width+1) x (height+1) boyutunda, kenarlarda 0 dolgu.
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let satirToplam = 0;
    const satirOfs = y * width;
    const intYust = y * (width + 1);
    const intYalt = (y + 1) * (width + 1);
    for (let x = 0; x < width; x++) {
      satirToplam += data[satirOfs + x];
      integral[intYalt + x + 1] = integral[intYust + x + 1] + satirToplam;
    }
  }

  const cikti = new Uint8Array(width * height);
  const w1 = width + 1;
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - yari);
    const y1 = Math.min(height - 1, y + yari);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - yari);
      const x1 = Math.min(width - 1, x + yari);
      // Integral image ile bölge toplamı: O(1)
      const toplam =
        integral[(y1 + 1) * w1 + (x1 + 1)] -
        integral[y0 * w1 + (x1 + 1)] -
        integral[(y1 + 1) * w1 + x0] +
        integral[y0 * w1 + x0];
      const alan = (x1 - x0 + 1) * (y1 - y0 + 1);
      const ortalama = toplam / alan;
      const esik = ortalama - C;
      const piksel = data[y * width + x];
      // THRESH_BINARY_INV: piksel <= esik ise 255 (koyu bölge işaretlenir)
      const isaretli = tersine ? piksel <= esik : piksel > esik;
      cikti[y * width + x] = isaretli ? 255 : 0;
    }
  }

  return { width, height, data: cikti };
}

// ─────────────────────────────────────────────────────────────────────────
// Morfoloji (dilate / erode)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Kare yapısal eleman ile genişletme (dilate). AYRILABİLİR (separable)
 * implementasyon: kare kernel'in dilate'i, önce X ekseninde sonra Y
 * ekseninde 1-boyutlu dilate'e eşdeğerdir — O(w*h*k²) yerine O(w*h*k).
 * Binary (0/255) görüntüde en yaygın kullanım.
 */
export function dilate(bin, kernelBoyutu = 3, tekrar = 1) {
  let { width, height, data } = bin;
  const yari = Math.floor(kernelBoyutu / 2);
  for (let t = 0; t < tekrar; t++) {
    // 1) Yatay geçiş: her satırda kayan pencere maksimumu
    const yatay = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      const ofs = y * width;
      for (let x = 0; x < width; x++) {
        let maks = 0;
        const x0 = Math.max(0, x - yari), x1 = Math.min(width - 1, x + yari);
        for (let sx = x0; sx <= x1; sx++) {
          if (data[ofs + sx] > 0) { maks = 255; break; }
        }
        yatay[ofs + x] = maks;
      }
    }
    // 2) Dikey geçiş: yatay sonucun sütunlarında kayan pencere maksimumu
    const cikti = new Uint8Array(width * height);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let maks = 0;
        const y0 = Math.max(0, y - yari), y1 = Math.min(height - 1, y + yari);
        for (let sy = y0; sy <= y1; sy++) {
          if (yatay[sy * width + x] > 0) { maks = 255; break; }
        }
        cikti[y * width + x] = maks;
      }
    }
    data = cikti;
  }
  return { width, height, data };
}

/** Aşındırma (erode) — dilate'in tersi (minimum alma), aynı ayrılabilir yaklaşım. */
export function erode(bin, kernelBoyutu = 3, tekrar = 1) {
  let { width, height, data } = bin;
  const yari = Math.floor(kernelBoyutu / 2);
  for (let t = 0; t < tekrar; t++) {
    const yatay = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      const ofs = y * width;
      for (let x = 0; x < width; x++) {
        let min = 255;
        const x0 = Math.max(0, x - yari), x1 = Math.min(width - 1, x + yari);
        // Kenara yakın piksellerde kernel görüntü dışına taşarsa (border
        // constant=0 varsayımıyla) min otomatik 0 olur.
        if (x - yari < 0 || x + yari >= width) { yatay[ofs + x] = 0; continue; }
        for (let sx = x0; sx <= x1; sx++) {
          if (data[ofs + sx] === 0) { min = 0; break; }
        }
        yatay[ofs + x] = min;
      }
    }
    const cikti = new Uint8Array(width * height);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let min = 255;
        if (y - yari < 0 || y + yari >= height) { cikti[y * width + x] = 0; continue; }
        const y0 = y - yari, y1 = y + yari;
        for (let sy = y0; sy <= y1; sy++) {
          if (yatay[sy * width + x] === 0) { min = 0; break; }
        }
        cikti[y * width + x] = min;
      }
    }
    data = cikti;
  }
  return { width, height, data };
}

/** Morfolojik kapama (dilate sonra erode) — küçük delikleri kapatır. sayfaTespitCV'deki maske temizliği için. */
export function morfolojikKapama(bin, kernelBoyutu = 15) {
  return erode(dilate(bin, kernelBoyutu, 1), kernelBoyutu, 1);
}

/** İki binary görüntünün piksel-bazında VE'si (bitwise_and karşılığı). */
export function bitwiseAnd(binA, binB) {
  const { width, height, data: a } = binA;
  const { data: b } = binB;
  const cikti = new Uint8Array(width * height);
  for (let i = 0; i < a.length; i++) cikti[i] = a[i] > 0 && b[i] > 0 ? 255 : 0;
  return { width, height, data: cikti };
}

// ─────────────────────────────────────────────────────────────────────────
// Kenar tespiti (Canny)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Canny kenar dedektörü — klasik 4 adım: Sobel gradyanı, non-maximum
 * suppression, çift-eşikli histerezis. cv.Canny(gri, alt, ust) ile
 * çağrı-uyumlu (aynı parametre anlamları).
 */
export function canny(gri, altEsik, ustEsik) {
  const { width, height, data } = gri;
  const n = width * height;

  // Sobel gradyanları + magnitüd + yön KOD İZİ (bin) TEK GEÇİŞTE hesaplanır
  // (önceden ayrı bir döngüde atan2/derece çevrimi yapılıyordu — atan2
  // pahalı bir işlem, burada sadece 4 yön-kovasından hangisine düştüğünü
  // bulmak için gx/gy işaretlerine ve |gy| vs |gx| oranına bakmak yeterli,
  // gerçek açıyı hiç hesaplamaya gerek yok).
  const mag = new Float32Array(n);
  const yonKovasi = new Uint8Array(n); // 0:yatay(0°) 1:çapraz(45°) 2:dikey(90°) 3:ters-çapraz(135°)
  // tan(22.5°)≈0.4142, tan(67.5°)≈2.4142 — açı kovalarını gx/gy oranıyla belirle (atan2'siz)
  const TAN22 = 0.4142135624, TAN67 = 2.4142135624;
  for (let y = 1; y < height - 1; y++) {
    const satirOfs = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = satirOfs + x;
      const tl = data[i - width - 1], t = data[i - width], tr = data[i - width + 1];
      const l = data[i - 1], r = data[i + 1];
      const bl = data[i + width - 1], b = data[i + width], br = data[i + width + 1];
      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const gy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      mag[i] = Math.sqrt(gx * gx + gy * gy);

      const agx = Math.abs(gx), agy = Math.abs(gy);
      if (agx < 1e-6 && agy < 1e-6) { yonKovasi[i] = 0; continue; }
      const oran = agx < 1e-6 ? Infinity : agy / agx;
      let kova;
      if (oran < TAN22) kova = 0; // yataya yakın
      else if (oran > TAN67) kova = 2; // dikeye yakın
      else kova = (gx * gy > 0) ? 1 : 3; // aynı işaretse 45°, zıt işaretse 135°
      yonKovasi[i] = kova;
    }
  }

  // Non-maximum suppression: yön kovasına göre sabit komşu ofsetleri kullan
  const bastirilmis = new Float32Array(n);
  for (let y = 1; y < height - 1; y++) {
    const satirOfs = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = satirOfs + x;
      const m = mag[i];
      if (m === 0) continue;
      let komsu1, komsu2;
      switch (yonKovasi[i]) {
        case 0: komsu1 = mag[i - 1]; komsu2 = mag[i + 1]; break;
        case 1: komsu1 = mag[i - width + 1]; komsu2 = mag[i + width - 1]; break;
        case 2: komsu1 = mag[i - width]; komsu2 = mag[i + width]; break;
        default: komsu1 = mag[i - width - 1]; komsu2 = mag[i + width + 1];
      }
      bastirilmis[i] = (m >= komsu1 && m >= komsu2) ? m : 0;
    }
  }

  // Çift eşikli histerezis: güçlü (>=ust) kesin kenar, zayıf (>=alt) sadece
  // güçlü bir kenara bağlıysa kenar sayılır (BFS ile yayılım).
  const KENAR = 255, GUCLU = 2, ZAYIF = 1, YOK = 0;
  const durum = new Uint8Array(n);
  const kuyruk = [];
  for (let i = 0; i < n; i++) {
    if (bastirilmis[i] >= ustEsik) { durum[i] = GUCLU; kuyruk.push(i); }
    else if (bastirilmis[i] >= altEsik) { durum[i] = ZAYIF; }
  }
  const cikti = new Uint8Array(n);
  const ziyaret = new Uint8Array(n);
  while (kuyruk.length) {
    const i = kuyruk.pop();
    if (ziyaret[i]) continue;
    ziyaret[i] = 1;
    cikti[i] = KENAR;
    const x = i % width, y = (i / width) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const ni = ny * width + nx;
        if (!ziyaret[ni] && (durum[ni] === GUCLU || durum[ni] === ZAYIF)) {
          kuyruk.push(ni);
        }
      }
    }
  }

  return { width, height, data: cikti };
}

// ─────────────────────────────────────────────────────────────────────────
// Kontur bulma (findContours) ve poligon yaklaşıklama (approxPolyDP)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Basit sınır-izleme (border following, Moore-neighbor) tabanlı kontur
 * bulucu. cv.findContours(RETR_LIST, CHAIN_APPROX_NONE) karşılığı: iç içe
 * hiyerarşi kurmaz (RETR_LIST zaten kurmuyordu), TÜM dış sınırları (delik
 * konturları dahil, bu projede kullanılmıyor ama zararsız) bulur.
 *
 * Döner: Array<{ points: [{x,y}, ...], alan: number }>
 *   points, kontur boyunca piksel piksel sıralı noktalar (CHAIN_APPROX_NONE
 *   eşdeğeri — approxPolyDP ve rafine adımının çalışması için gerekli).
 */
export function findContours(bin) {
  const { width, height, data } = bin;
  const ziyaretEdildi = new Uint8Array(width * height);
  const konturlar = [];

  // 8-komşuluk, saat yönünde başlangıç sırası (Moore-neighbor tracing)
  const dx8 = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy8 = [0, 1, 1, 1, 0, -1, -1, -1];

  function onPikselMi(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[y * width + x] > 0;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (data[i] === 0 || ziyaretEdildi[i]) continue;
      // Sol komşusu boşsa (yani bu bir dış-sınır başlangıç noktasıysa) izlemeye başla
      if (onPikselMi(x - 1, y)) { ziyaretEdildi[i] = 1; continue; }

      // Moore-neighbor tracing
      const points = [];
      let cx = x, cy = y;
      let girisYonu = 6; // sol taraftan geldik varsayımı (yukarı bakan)
      const baslangicX = x, baslangicY = y;
      let adim = 0;
      const MAKS_ADIM = width * height * 2; // sonsuz döngü koruması

      do {
        points.push({ x: cx, y: cy });
        ziyaretEdildi[cy * width + cx] = 1;

        let bulundu = false;
        let yon = (girisYonu + 6) % 8; // bir önceki yönden 3/4 tur geriden aramaya başla
        for (let k = 0; k < 8; k++) {
          const dyon = (yon + k) % 8;
          const nx = cx + dx8[dyon], ny = cy + dy8[dyon];
          if (onPikselMi(nx, ny)) {
            cx = nx; cy = ny;
            girisYonu = dyon;
            bulundu = true;
            break;
          }
        }
        if (!bulundu) break; // izole piksel
        adim++;
      } while ((cx !== baslangicX || cy !== baslangicY) && adim < MAKS_ADIM);

      if (points.length >= 4) {
        konturlar.push({ points, alan: konturAlaniHesapla(points) });
      }
    }
  }

  return konturlar;
}

/** Shoelace formülü ile kapalı poligon alanı (cv.contourArea karşılığı). */
export function konturAlaniHesapla(points) {
  let alan = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i], p2 = points[(i + 1) % n];
    alan += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(alan) / 2;
}

/** Kapalı poligon çevresi (cv.arcLength(kontur, true) karşılığı). */
export function konturCevresiHesapla(points) {
  let cevre = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i], p2 = points[(i + 1) % n];
    cevre += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }
  return cevre;
}

/**
 * Douglas-Peucker poligon basitleştirme — cv.approxPolyDP karşılığı.
 * epsilon: nokta-doğru mesafesi bu değerin altındaysa nokta atılır.
 * kapali: true ise poligon kapalı kabul edilir (kontur her zaman kapalı).
 */
export function approxPolyDP(points, epsilon, kapali = true) {
  if (points.length < 3) return points.slice();

  function noktaDogruMesafesi(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const uzunluk2 = dx * dx + dy * dy;
    if (uzunluk2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    // Doğrunun normal formu: |dx*(a.y-p.y) - dy*(a.x-p.x)| / uzunluk
    const cross = Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x));
    return cross / Math.sqrt(uzunluk2);
  }

  function dp(pts) {
    if (pts.length < 3) return pts;
    let enUzakMesafe = 0, enUzakIndeks = 0;
    const a = pts[0], b = pts[pts.length - 1];
    for (let i = 1; i < pts.length - 1; i++) {
      const d = noktaDogruMesafesi(pts[i], a, b);
      if (d > enUzakMesafe) { enUzakMesafe = d; enUzakIndeks = i; }
    }
    if (enUzakMesafe > epsilon) {
      const sol = dp(pts.slice(0, enUzakIndeks + 1));
      const sag = dp(pts.slice(enUzakIndeks));
      return sol.slice(0, -1).concat(sag);
    }
    return [a, b];
  }

  if (!kapali) return dp(points);

  // Kapalı poligon: en uzak iki noktadan ikiye bölüp her yarıyı ayrı
  // basitleştir, sonra birleştir (kapalı DP'nin standart yaklaşımı).
  let p1 = 0, p2 = 0, enUzak = -1;
  // En uzak nokta çiftini kabaca bulmak yerine (O(n²) pahalı olabilir),
  // ilk noktadan en uzak noktayı, ondan en uzak noktayı bul (2 geçiş, O(n)).
  function enUzakNoktaBul(baslangicIndeks) {
    let maxD = -1, maxI = baslangicIndeks;
    const ref = points[baslangicIndeks];
    for (let i = 0; i < points.length; i++) {
      const d = (points[i].x - ref.x) ** 2 + (points[i].y - ref.y) ** 2;
      if (d > maxD) { maxD = d; maxI = i; }
    }
    return maxI;
  }
  p1 = enUzakNoktaBul(0);
  p2 = enUzakNoktaBul(p1);

  const yay1 = p1 <= p2 ? points.slice(p1, p2 + 1) : points.slice(p1).concat(points.slice(0, p2 + 1));
  const yay2 = p2 <= p1 ? points.slice(p2, p1 + 1) : points.slice(p2).concat(points.slice(0, p1 + 1));

  const basit1 = dp(yay1);
  const basit2 = dp(yay2);

  // İki yayı birleştir (uç noktalar tekrarlanmasın)
  const sonuc = basit1.slice(0, -1).concat(basit2.slice(0, -1));
  return sonuc;
}

/** Poligonun dışbükey (convex) olup olmadığını kontrol eder (cv.isContourConvex). */
export function isContourConvex(points) {
  const n = points.length;
  if (n < 3) return false;
  let isaret = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n], c = points[(i + 2) % n];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross !== 0) {
      const yeniIsaret = cross > 0 ? 1 : -1;
      if (isaret === 0) isaret = yeniIsaret;
      else if (yeniIsaret !== isaret) return false;
    }
  }
  return true;
}

/**
 * Döndürülmüş en küçük sınırlayıcı dikdörtgen (cv.minAreaRect karşılığı).
 * Rotating calipers yerine (fazla karmaşık, bu kullanım için gereksiz)
 * konturun dışbükey zarfını (convex hull) çıkarıp, zarfın her kenarına
 * hizalı adayları deneyen basit O(h²) yöntem kullanılır — h (hull nokta
 * sayısı) genelde küçük (<50) olduğu için pratikte hızlıdır.
 * Döner: { center: {x,y}, size: {width,height}, angle } (derece).
 */
export function minAreaRect(points) {
  const hull = convexHull(points);
  if (hull.length < 3) {
    // dejenere durum — normal sınırlayıcı kutuya düş
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return {
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      size: { width: maxX - minX, height: maxY - minY },
      angle: 0,
    };
  }

  let enKucukAlan = Infinity;
  let enIyi = null;

  const n = hull.length;
  for (let i = 0; i < n; i++) {
    const a = hull[i], b = hull[(i + 1) % n];
    const aci = Math.atan2(b.y - a.y, b.x - a.x);
    const cosA = Math.cos(-aci), sinA = Math.sin(-aci);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of hull) {
      const rx = p.x * cosA - p.y * sinA;
      const ry = p.x * sinA + p.y * cosA;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }
    const genislik = maxX - minX, yukseklik = maxY - minY;
    const alan = genislik * yukseklik;
    if (alan < enKucukAlan) {
      enKucukAlan = alan;
      // merkezi geri döndür (ters rotasyon)
      const merkezRx = (minX + maxX) / 2, merkezRy = (minY + maxY) / 2;
      const cosB = Math.cos(aci), sinB = Math.sin(aci);
      const merkezX = merkezRx * cosB - merkezRy * sinB;
      const merkezY = merkezRx * sinB + merkezRy * cosB;
      enIyi = {
        center: { x: merkezX, y: merkezY },
        size: { width: genislik, height: yukseklik },
        angle: (aci * 180) / Math.PI,
      };
    }
  }

  return enIyi;
}

/** Andrew's monotone chain — dışbükey zarf (convex hull). O(n log n). */
function convexHull(points) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const n = pts.length;
  if (n < 3) return pts;

  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  const alt = [];
  for (const p of pts) {
    while (alt.length >= 2 && cross(alt[alt.length - 2], alt[alt.length - 1], p) <= 0) alt.pop();
    alt.push(p);
  }
  const ust = [];
  for (let i = n - 1; i >= 0; i--) {
    const p = pts[i];
    while (ust.length >= 2 && cross(ust[ust.length - 2], ust[ust.length - 1], p) <= 0) ust.pop();
    ust.push(p);
  }
  alt.pop();
  ust.pop();
  return alt.concat(ust);
}
