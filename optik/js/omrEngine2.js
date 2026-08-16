/**
 * omrEngine2.js — Optik Form Okuyucu (yeniden yazım)
 *
 * Pipeline:
 *   1. Ham fotoğraf → ImageData
 *   2. Kontrast normalize (histogram stretch + gama)
 *   3. Adaptif eşikleme (CvSaf.adaptiveThresholdGaussian veya Otsu fallback)
 *   4. Perspektif düzeltme → canonical canvas (mm × ppmm)
 *   5. Baloncuk doluluk ölçümü (binary countNonZero, merkez disk r×0.35)
 *   6. Satır kilitleme (basılı çember sinyali ile dikey kayma düzeltme)
 *   7. Cevap kararı (adaptif eşik + ayırt edici fark + işaretleme seviyesi)
 *   8. Numara / kitapçık / form kodu okuma
 */

window.OmrOkuyucu2 = (function () {

  'use strict';

  // ─── Sabitler ────────────────────────────────────────────────────────────

  const VARSAYILAN_PPMM = 8;          // canonical canvas px/mm
  const YEDEK_KOYULUK_ESIK = 0.40;   // hassasiyetAyarlari yoksa
  const YEDEK_AYIRT_FARK  = 0.10;
  const YEDEK_NUMARA_FARK = 0.02;
  const YEDEK_NUMARA_KOYULUK = 0.45;
  const MIN_PIKSEL = 5;               // ROI içinde minimum piksel (_pikselDoluluk)

  // ─── Ayarlar (canlı okunur) ───────────────────────────────────────────────

  function _ayar(alan, yedek) {
    try {
      const a = window.HassasiyetAyarlari?.ayarlariGetir?.();
      if (a && typeof a[alan] === 'number' && !isNaN(a[alan])) return a[alan];
    } catch (_) {}
    return yedek;
  }

  const _koyulukEsik   = () => _ayar('koyulukEsik',      YEDEK_KOYULUK_ESIK);
  const _ayirtFark     = () => _ayar('ayirtEdiciFark',    YEDEK_AYIRT_FARK);
  const _numaraFark    = () => _ayar('numaraMinFark',     YEDEK_NUMARA_FARK);
  const _numaraKoyuluk = () => _ayar('numaraKoyulukEsik', YEDEK_NUMARA_KOYULUK);

  // ─── 1. Görüntü yardımcıları ─────────────────────────────────────────────

  function kaynaktanImageData(kaynak) {
    const w = kaynak.videoWidth  || kaynak.naturalWidth  || kaynak.width;
    const h = kaynak.videoHeight || kaynak.naturalHeight || kaynak.height;
    if (!w || !h) throw new Error('Görüntü boyutu okunamadı.');
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(kaynak, 0, 0, w, h);
    return { imageData: ctx.getImageData(0, 0, w, h), genislik: w, yukseklik: h };
  }

  function grilik(data, i) {
    return 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
  }

  /**
   * Piksel işaret puanı:
   *  - Sarı vurgulama (PDF/marker) → 0.85 sabit
   *  - Siyah/gri kalem → koyuluk × renksizlik (pembe baskıyı bastırır)
   */
  function isaretPuani(data, i) {
    const r = data[i], g = data[i+1], b = data[i+2];
    // Sarı tespit: R ve G yüksek, B düşük
    if (r > 150 && g > 150 && b < r * 0.80 && b < g * 0.80) return 0.85;
    const gri = 0.299*r + 0.587*g + 0.114*b;
    const koyuluk = 1 - gri / 255;
    const maxK = Math.max(r, g, b);
    const doy  = maxK > 0 ? (maxK - Math.min(r,g,b)) / maxK : 0;
    return koyuluk * Math.max(0, 1 - doy * 1.2);
  }

  // ─── 2. Kontrast normalizasyon ────────────────────────────────────────────

  function kontrastNormalize(imageData) {
    const { data, width, height } = imageData;
    const n = width * height;
    if (!n) return;

    const hist = new Uint32Array(256);
    for (let i = 0; i < data.length; i += 4)
      hist[Math.round(grilik(data, i))]++;

    // Yüzdelik siyah/beyaz nokta
    let siyah = 0, beyaz = 255, k = 0;
    for (let v = 0; v < 256; v++) { k += hist[v]; if (k/n >= 0.02) { siyah = v; break; } }
    k = 0;
    for (let v = 255; v >= 0; v--) { k += hist[v]; if (k/n >= 0.02) { beyaz = v; break; } }
    if (beyaz - siyah < 10) return;

    // Arka plan modunu tespit et (gama seçimi)
    let parlakSay = 0, ortaGriSay = 0;
    for (let v = 230; v <= 255; v++) parlakSay += hist[v];
    for (let v = 120; v <= 200; v++) ortaGriSay += hist[v];
    const parlakOran = parlakSay / n;
    const ortaGriOran = ortaGriSay / n;

    let gama = 1.35;
    if (parlakOran > 0.60) {
      gama = 2.2;
      beyaz = Math.min(beyaz, 230);
      k = 0;
      for (let v = 0; v < 256; v++) { k += hist[v]; if (k/n >= 0.05) { siyah = v; break; } }
    } else if (ortaGriOran > 0.60) {
      gama = 3.0;
      k = 0;
      let med = 128;
      for (let v = 0; v < 256; v++) { k += hist[v]; if (k/n >= 0.50) { med = v; break; } }
      beyaz = med;
      k = 0;
      for (let v = 0; v < 256; v++) { k += hist[v]; if (k/n >= 0.01) { siyah = v; break; } }
    }

    const aralik = Math.max(1, beyaz - siyah);
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const v = Math.max(0, Math.min(255, ((data[i+c] - siyah) / aralik) * 255));
        data[i+c] = Math.round(255 * Math.pow(v / 255, gama));
      }
    }
  }

  // ─── 3. Adaptif eşikleme → _binaryData ───────────────────────────────────

  let _binaryData = null; // { data: Uint8Array, width, height }

  function adaptifEsikle(imageData) {
    const { data, width, height } = imageData;
    // Gri dizi: sarı pikseli 40 (koyu) olarak zorla
    const gri = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const p = i * 4;
      const r = data[p], g = data[p+1], b = data[p+2];
      if (r > 150 && g > 150 && b < r * 0.80 && b < g * 0.80) { gri[i] = 40; continue; }
      gri[i] = Math.round(0.299*r + 0.587*g + 0.114*b);
    }

    let binary = new Uint8Array(width * height);
    if (window.CvSaf) {
      try {
        const s = window.CvSaf.adaptiveThresholdGaussian({ width, height, data: gri }, 131, 8, true);
        binary = s.data;
      } catch (_) { _otsuEsikle(gri, binary); }
    } else {
      _otsuEsikle(gri, binary);
    }
    _binaryData = { data: binary, width, height };
  }

  function _otsuEsikle(gri, binary) {
    const hist = new Uint32Array(256);
    for (const v of gri) hist[v]++;
    const n = gri.length;
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, maxVar = 0, esik = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue;
      const wF = n - wB; if (!wF) break;
      sumB += t * hist[t];
      const d = sumB/wB - (sum-sumB)/wF;
      const v = wB * wF * d * d;
      if (v > maxVar) { maxVar = v; esik = t; }
    }
    for (let i = 0; i < gri.length; i++) binary[i] = gri[i] < esik ? 255 : 0;
  }

  // ─── 4. Homografi (DLT, N≥4) ─────────────────────────────────────────────

  function homografiHesapla(kaynaklar, hedefler) {
    const n = kaynaklar.length;
    if (n < 4 || hedefler.length !== n)
      throw new Error('En az 4 nokta gerekli.');
    const A = [], b = [];
    for (let i = 0; i < n; i++) {
      const { x: xs, y: ys } = kaynaklar[i];
      const { x: xd, y: yd } = hedefler[i];
      A.push([xs, ys, 1, 0, 0, 0, -xd*xs, -xd*ys]); b.push(xd);
      A.push([0, 0, 0, xs, ys, 1, -yd*xs, -yd*ys]); b.push(yd);
    }
    let h;
    if (n === 4) {
      h = gaussEleme(A, b);
    } else {
      const cols = 8;
      const AtA = Array.from({ length: cols }, () => new Array(cols).fill(0));
      const Atb = new Array(cols).fill(0);
      for (let row = 0; row < A.length; row++)
        for (let c = 0; c < cols; c++) {
          Atb[c] += A[row][c] * b[row];
          for (let d = 0; d < cols; d++) AtA[c][d] += A[row][c] * A[row][d];
        }
      h = gaussEleme(AtA, Atb);
    }
    return [...h, 1];
  }

  function gaussEleme(A, b) {
    const n = b.length;
    const M = A.map((r, i) => [...r, b[i]]);
    for (let col = 0; col < n; col++) {
      let pivR = col, pivV = Math.abs(M[col][col]);
      for (let r = col+1; r < n; r++)
        if (Math.abs(M[r][col]) > pivV) { pivV = Math.abs(M[r][col]); pivR = r; }
      if (pivV < 1e-12) throw new Error('Tekil matris.');
      if (pivR !== col) [M[col], M[pivR]] = [M[pivR], M[col]];
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const k = M[r][col] / M[col][col];
        if (!k) continue;
        for (let j = col; j <= n; j++) M[r][j] -= k * M[col][j];
      }
    }
    return M.map((r, i) => r[n] / r[i]);
  }

  function noktaDonustur(H, x, y) {
    const p = H[6]*x + H[7]*y + H[8];
    return { x: (H[0]*x + H[1]*y + H[2]) / p, y: (H[3]*x + H[4]*y + H[5]) / p };
  }

  // ─── 5. Canonical canvas üretimi ──────────────────────────────────────────

  function duzCanvasUret(fotoData, H, form, ppmm) {
    const MAX_BOYUT = 3000;
    let w = Math.round(form.bolge.width  * ppmm);
    let h = Math.round(form.bolge.height * ppmm);
    let ppmmK = ppmm;
    if (w > MAX_BOYUT || h > MAX_BOYUT) {
      ppmmK = ppmm * MAX_BOYUT / Math.max(w, h);
      w = Math.round(form.bolge.width  * ppmmK);
      h = Math.round(form.bolge.height * ppmmK);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const out = ctx.createImageData(w, h);
    const src = fotoData;

    // Ters homografi ile bilinear örnekle
    const Hinv = homografiHesapla(
      [{ x:0, y:0 }, { x:w, y:0 }, { x:0, y:h }, { x:w, y:h }],
      [noktaDonustur(H, 0, 0), noktaDonustur(H, w, 0),
       noktaDonustur(H, 0, h), noktaDonustur(H, w, h)]
    );

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const { x: sx, y: sy } = noktaDonustur(Hinv, px, py);
        const idx = (py * w + px) * 4;
        if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) {
          out.data[idx+3] = 255; continue;
        }
        // Bilinear
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const x1 = Math.min(x0+1, src.width-1), y1 = Math.min(y0+1, src.height-1);
        const fx = sx - x0, fy = sy - y0;
        for (let c = 0; c < 3; c++) {
          const a = src.data[(y0*src.width+x0)*4+c];
          const b2 = src.data[(y0*src.width+x1)*4+c];
          const cc = src.data[(y1*src.width+x0)*4+c];
          const d = src.data[(y1*src.width+x1)*4+c];
          out.data[idx+c] = Math.round(a*(1-fx)*(1-fy) + b2*fx*(1-fy) + cc*(1-fx)*fy + d*fx*fy);
        }
        out.data[idx+3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    return { canvas, imageData: out, ppmmKullanilan: ppmmK };
  }

  // ─── 6. Köşe/blob arama ──────────────────────────────────────────────────

  /** BFS ile en yakın koyu blobu bulur (hizalama kareleri için) */
  function blobMerkezi(imageData, tahminX, tahminY, pencereX, pencereY) {
    const { width, height, data } = imageData;
    const x0 = Math.max(0, Math.floor(tahminX - pencereX));
    const x1 = Math.min(width-1, Math.ceil(tahminX + pencereX));
    const y0 = Math.max(0, Math.floor(tahminY - pencereY));
    const y1 = Math.min(height-1, Math.ceil(tahminY + pencereY));
    if (x1 <= x0 || y1 <= y0) return null;

    const w = x1-x0+1, h = y1-y0+1;
    const griler = new Float32Array(w * h);
    let toplam = 0;
    for (let ly = 0; ly < h; ly++)
      for (let lx = 0; lx < w; lx++) {
        const g = grilik(data, ((y0+ly)*width+(x0+lx))*4);
        griler[ly*w+lx] = g; toplam += g;
      }
    const esik = (toplam / (w*h)) * 0.85;
    const ziyaret = new Uint8Array(w * h);
    const kX = new Int32Array(w*h), kY = new Int32Array(w*h);
    let en = null, enUzak = Infinity;

    for (let ly = 0; ly < h; ly++)
      for (let lx = 0; lx < w; lx++) {
        const i0 = ly*w+lx;
        if (ziyaret[i0] || griler[i0] >= esik) continue;
        let bas = 0, bit = 0;
        kX[bit] = lx; kY[bit] = ly; bit++; ziyaret[i0] = 1;
        let boy = 0, xT = 0, yT = 0;
        while (bas < bit) {
          const cx = kX[bas], cy = kY[bas]; bas++;
          boy++; xT += cx; yT += cy;
          for (const [nx, ny] of [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]]) {
            if (nx<0||nx>=w||ny<0||ny>=h) continue;
            const ni = ny*w+nx;
            if (ziyaret[ni] || griler[ni] >= esik) continue;
            ziyaret[ni] = 1; kX[bit] = nx; kY[bit] = ny; bit++;
          }
        }
        if (boy < 4) continue;
        const mx = x0 + xT/boy, my = y0 + yT/boy;
        const u = Math.hypot(mx-tahminX, my-tahminY);
        if (u < enUzak) { enUzak = u; en = { x: mx, y: my }; }
      }
    return en;
  }

  function sayfaKoseleriniAra(imageData, hassasiyet) {
    // Mevcut sayfaTespitCV'ye delege
    if (window.SayfaTespitCV?.sayfaKoseleriniAra) {
      return window.SayfaTespitCV.sayfaKoseleriniAra(imageData, hassasiyet);
    }
    return null;
  }

  // ─── 7. Baloncuk doluluk ölçümü ──────────────────────────────────────────

  /**
   * Binary görüntüde daire ROI → white/total oranı.
   * ROI dışına taşarsa -1 (sentinel) döner.
   */
  function pikselDoluluk(cx, cy, r) {
    if (!_binaryData) return 0;
    const { data, width, height } = _binaryData;
    const ir = r * 0.35; // merkez disk (Test Plus: en güvenilir sinyal)
    const x0 = Math.max(0, Math.floor(cx - ir));
    const x1 = Math.min(width-1, Math.ceil(cx + ir));
    const y0 = Math.max(0, Math.floor(cy - ir));
    const y1 = Math.min(height-1, Math.ceil(cy + ir));
    if (x1 <= x0 || y1 <= y0) return -1;
    const ir2 = ir * ir;
    let isaretli = 0, toplam = 0;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = x-cx, dy = y-cy;
        if (dx*dx + dy*dy <= ir2) {
          toplam++;
          if (data[y*width+x] > 127) isaretli++;
        }
      }
    if (toplam < MIN_PIKSEL) return -1;
    return isaretli / toplam;
  }

  /**
   * Ham renkli ImageData üzerinde isaac koyuluk puanı → iç disk ortalaması.
   * Binary yoksa veya tüm şıklar -1 ise fallback.
   */
  function koyulukOlc(cImageData, cx, cy, r) {
    if (_binaryData) return pikselDoluluk(cx, cy, r);
    const { data, width, height } = cImageData;
    const ir = r * 0.35;
    const x0 = Math.max(0, Math.floor(cx-ir)), x1 = Math.min(width-1, Math.ceil(cx+ir));
    const y0 = Math.max(0, Math.floor(cy-ir)), y1 = Math.min(height-1, Math.ceil(cy+ir));
    if (x1<=x0 || y1<=y0) return -1;
    const ir2 = ir*ir;
    let t = 0, s = 0;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = x-cx, dy = y-cy;
        if (dx*dx+dy*dy <= ir2) { t++; s += isaretPuani(data, (y*width+x)*4); }
      }
    return t < MIN_PIKSEL ? -1 : s/t;
  }

  /**
   * Küçük pencerede en yüksek doluluk oranını veren konumu arar.
   * Duvara-toslama koruması: dikey eksende pencere ucuna dayanıyorsa ham konuma dön.
   */
  function yerelArama(cImageData, cx, cy, r, aramaY = 1.3, aramaX = 1.3, adimOran = 0.12) {
    const mesafeY = r * aramaY, mesafeX = r * aramaX;
    const adim = Math.max(1, r * adimOran);
    let enIyi = -1, enDx = 0, enDy = 0;

    for (let dy = -mesafeY; dy <= mesafeY; dy += adim)
      for (let dx = -mesafeX; dx <= mesafeX; dx += adim) {
        const o = koyulukOlc(cImageData, cx+dx, cy+dy, r);
        if (o > enIyi) { enIyi = o; enDx = dx; enDy = dy; }
      }

    // Duvara-toslama: dikey uçta VE ham oran eşiğin altında → ham konuma dön
    if (Math.abs(enDy) >= mesafeY * 0.65) {
      const ham = koyulukOlc(cImageData, cx, cy, r);
      if (ham < _koyulukEsik()) return { oran: ham, dx: 0, dy: 0 };
    }
    return { oran: enIyi, dx: enDx, dy: enDy };
  }

  // ─── 8. Satır kilitleme (basılı çember sinyali) ───────────────────────────

  /**
   * Baloncuğun tamamını (0–0.9r) örnekler — basılı çember sinyali.
   * Öğrenci işaretinden bağımsız; satır konumunu bulmak için kullanılır.
   */
  function cemberSinyali(cImageData, cx, cy, r) {
    const { data, width, height } = cImageData;
    const dr = r * 0.9, dr2 = dr*dr;
    const x0 = Math.max(0,Math.floor(cx-dr)), x1 = Math.min(width-1,Math.ceil(cx+dr));
    const y0 = Math.max(0,Math.floor(cy-dr)), y1 = Math.min(height-1,Math.ceil(cy+dr));
    if (x1<=x0||y1<=y0) return 0;
    let t = 0, s = 0;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = x-cx, dy = y-cy;
        if (dx*dx+dy*dy <= dr2) { t++; s += isaretPuani(data, (y*width+x)*4); }
      }
    return t > 0 ? s/t : 0;
  }

  /**
   * Bir satırdaki N şıkkın çember toplamını en yüksek yapan dikey dy'yi bulur.
   * Arama aralığı: ±satirAraligi×0.40 (komşu satıra geçmeyi matematiksel olarak engeller).
   * Duvara-toslama koruması: pencere ucuna ≥%65 yakınsa dy=0.
   */
  function satirDyBul(cImageData, sikler, satirAraligi, ilkMi, sonMu) {
    const yarim = satirAraligi * 0.40;
    const adim  = Math.max(1, satirAraligi * 0.04);
    const bas = ilkMi ? 0 : -yarim;
    const bit = sonMu ? 0 :  yarim;

    let enIyi = -Infinity, enDy = 0;
    for (let dy = bas; dy <= bit; dy += adim) {
      let s = 0;
      for (const sk of sikler) s += cemberSinyali(cImageData, sk.px, sk.py+dy, sk.pr);
      if (s > enIyi) { enIyi = s; enDy = dy; }
    }
    // Duvara-toslama
    if (Math.abs(enDy) >= yarim * 0.65) return 0;
    return enDy;
  }

  /**
   * Bir sütunun tüm satırlarından alınan temsilci satır üzerinde
   * yatay dx ofsetini bulur (elle köşe modunda sağ-sütun kaymasını düzeltir).
   */
  function sutunDxBul(cImageData, temsilciSikler, sikAralik) {
    const aramaX = sikAralik * 0.40;
    const adim   = Math.max(1, sikAralik * 0.08);
    let enIyi = -Infinity, enDx = 0;
    for (let dx = -aramaX; dx <= aramaX; dx += adim) {
      let s = 0;
      for (const sk of temsilciSikler) s += cemberSinyali(cImageData, sk.px+dx, sk.py, sk.pr);
      if (s > enIyi) { enIyi = s; enDx = dx; }
    }
    if (Math.abs(enDx) >= aramaX * 0.65) return 0;
    return enDx;
  }

  // ─── 9. Genel ızgara düzeltmesi ──────────────────────────────────────────

  function genelIzgaraDuzelt(cImageData, form, ppmm) {
    const gc = form.genelIzgaraCercevesi;
    if (!gc?.koseler) return null;
    const yarimPx = 18 * ppmm;
    const adlar = ['solUst','sagUst','solAlt','sagAlt'];
    const kaynak = [], hedef = [];
    for (const ad of adlar) {
      const mm = yerelNokta(form, gc.koseler[ad].x, gc.koseler[ad].y);
      const bek = { x: mm.x * ppmm, y: mm.y * ppmm };
      const grc = blobMerkezi(cImageData, bek.x, bek.y, yarimPx, yarimPx);
      if (!grc) return null;
      kaynak.push(bek); hedef.push(grc);
    }
    let H;
    try { H = homografiHesapla(kaynak, hedef); } catch (_) { return null; }
    // Güvenlik: iç noktalar 15mm'den fazla kaymamalı
    const kutu = {
      sol: Math.min(...kaynak.map(n=>n.x)), sag: Math.max(...kaynak.map(n=>n.x)),
      ust: Math.min(...kaynak.map(n=>n.y)), alt: Math.max(...kaynak.map(n=>n.y))
    };
    const ic = [
      { x:(kutu.sol+kutu.sag)/2, y:kutu.ust }, { x:(kutu.sol+kutu.sag)/2, y:kutu.alt },
      { x:kutu.sol, y:(kutu.ust+kutu.alt)/2 }, { x:kutu.sag, y:(kutu.ust+kutu.alt)/2 },
    ];
    for (const p of ic) {
      const d = noktaDonustur(H, p.x, p.y);
      if (Math.hypot(d.x-p.x, d.y-p.y)/ppmm > 15) return null;
    }
    return H;
  }

  function duzeltmeUygula(H, px, py) {
    return H ? noktaDonustur(H, px, py) : { x: px, y: py };
  }

  // ─── 10. Form koordinat yardımcıları ──────────────────────────────────────

  function yerelNokta(form, x, y) {
    return {
      x: (form.bolge?.x ?? 0) + x,
      y: (form.bolge?.y ?? 0) + y
    };
  }

  function tumSorulariTopla(form) {
    const sorular = [];
    if (!form.dersler) return sorular;
    for (const ders of form.dersler)
      for (const soru of (ders.sorular || []))
        sorular.push({ ...soru, ders: ders.ad });
    return sorular;
  }

  // ─── 11. Cevap çıkarma ───────────────────────────────────────────────────

  function cevaplariCikar(cImageData, form, ppmm, izgaraH) {
    const sabitEsik   = _koyulukEsik();
    const ayirtFark   = _ayirtFark();
    const sorular     = tumSorulariTopla(form);

    // Adaptif eşik: tüm soruların en koyu şık oranlarının medyanı × 0.70
    let ESIK = sabitEsik;
    try {
      const onOranlar = sorular.map(soru => {
        let en = 0;
        for (const s of soru.sikler) {
          const yerel = yerelNokta(form, s.cx, s.cy);
          const { x: px, y: py } = duzeltmeUygula(izgaraH, yerel.x*ppmm, yerel.y*ppmm);
          const o = yerelArama(cImageData, px, py, s.r*ppmm, 0.3, 0.3, 0).oran;
          if (o > en) en = o;
        }
        return en;
      });
      onOranlar.sort((a,b) => a-b);
      const med = onOranlar.length % 2 === 1
        ? onOranlar[(onOranlar.length-1)/2]
        : (onOranlar[onOranlar.length/2-1] + onOranlar[onOranlar.length/2]) / 2;
      ESIK = Math.max(0.20, Math.min(sabitEsik, med * 0.70));
    } catch (_) {}

    // Her ders sütununun son sorusunu önceden bul (satır-kilitleme sınırı için)
    const sonSoruNo = {};
    for (const s of sorular)
      if (!sonSoruNo[s.ders] || s.soruNo > sonSoruNo[s.ders]) sonSoruNo[s.ders] = s.soruNo;

    const cevaplar = [], ornekNoktalari = [];

    // Sütun bazlı yatay dx ofsetini önceden hesapla
    const sutunDx = {};
    const dersler = [...new Set(sorular.map(s => s.ders))];
    for (const ders of dersler) {
      const dersSorular = sorular.filter(s => s.ders === ders);
      if (!dersSorular.length) continue;
      const ortaSoru = dersSorular[Math.floor(dersSorular.length/2)];
      const temsilci = ortaSoru.sikler.map(s => {
        const yerel = yerelNokta(form, s.cx, s.cy);
        const { x: px, y: py } = duzeltmeUygula(izgaraH, yerel.x*ppmm, yerel.y*ppmm);
        return { px, py, pr: s.r*ppmm };
      });
      const sikAralik = temsilci.length > 1
        ? (temsilci[temsilci.length-1].px - temsilci[0].px) / (temsilci.length-1)
        : temsilci[0].pr * 3.5;
      sutunDx[ders] = sutunDxBul(cImageData, temsilci, sikAralik);
    }

    for (const soru of sorular) {
      const dx = sutunDx[soru.ders] || 0;

      // Beklenen şık konumları
      const beklenen = soru.sikler.map(s => {
        const yerel = yerelNokta(form, s.cx, s.cy);
        const { x: px, y: py } = duzeltmeUygula(izgaraH, yerel.x*ppmm, yerel.y*ppmm);
        return { harf: s.harf, px: px+dx, py, pr: s.r*ppmm };
      });

      // Satır kilitleme
      const satirAralik = 4 * beklenen[0].pr;
      const ilkMi = soru.soruNo === 1;
      const sonMu = soru.soruNo === sonSoruNo[soru.ders];
      const satirDy = satirDyBul(cImageData, beklenen, satirAralik, ilkMi, sonMu);

      // Her şık için yerel ince ayar + doluluk ölçümü
      const sikSonuclari = beklenen.map(s => {
        const py2 = s.py + satirDy;
        const { oran, dx: ldx, dy: ldy } = yerelArama(cImageData, s.px, py2, s.pr, 0.5, 0.8, 0.12);
        return { harf: s.harf, oran, px: s.px+ldx, py: py2+ldy, pr: s.pr };
      });
      sikSonuclari.sort((a,b) => b.oran - a.oran);

      const enKoyu  = sikSonuclari[0];
      const ikinci  = sikSonuclari[1] || { oran: 0 };

      // Karar
      let isaretliSik = null, uyari = null;
      const tumYetersiz = sikSonuclari.every(s => s.oran < 0);

      if (tumYetersiz) {
        uyari = 'yetersizPiksel';
      } else if (enKoyu.oran < ESIK) {
        uyari = 'bos';
      } else if (enKoyu.oran - ikinci.oran < ayirtFark) {
        uyari = 'coklu';
      } else {
        isaretliSik = enKoyu.harf;
      }

      // İşaretleme seviyesi (Test Plus: tamamen/normal/yarım/az/çokAz)
      let seviye = 'isaretlenmemis';
      if (enKoyu.oran >= 0) {
        if      (enKoyu.oran >= ESIK * 1.8) seviye = 'tamamenIsaretli';
        else if (enKoyu.oran >= ESIK * 1.2) seviye = 'normalIsaretli';
        else if (enKoyu.oran >= ESIK)        seviye = 'yarimIsaretli';
        else if (enKoyu.oran >= ESIK * 0.6)  seviye = 'azIsaretli';
        else                                  seviye = 'cokAzIsaretli';
      }

      // Düşük doluluk + çift işaret uyarısı
      const dusukCift = !!(isaretliSik && ikinci.oran >= 0 &&
        (seviye === 'yarimIsaretli' || seviye === 'azIsaretli') &&
        ikinci.oran >= ESIK * 0.5);

      cevaplar.push({
        ders: soru.ders, soruNo: soru.soruNo,
        isaretliSik,
        guven: Number(Math.max(0, enKoyu.oran).toFixed(3)),
        uyari, seviye, dusukDolulukCiftIsaret: dusukCift
      });
      ornekNoktalari.push({ ders: soru.ders, soruNo: soru.soruNo, sikler: sikSonuclari });
    }

    return { cevaplar, ornekNoktalari };
  }

  // ─── 12. Numara / kitapçık okuma ─────────────────────────────────────────

  function _sutunEnKoyusu(cImageData, bubbles, ppmm, aramaY = 0.5) {
    const sikler = bubbles.map(b => ({ px: b.cx*ppmm, py: b.cy*ppmm, pr: b.r*ppmm }));

    // Sütun dikey kilitleme
    let dy = 0;
    if (sikler.length >= 2) {
      const araliklar = [];
      const yler = sikler.map(s => s.py).sort((a,b) => a-b);
      for (let i = 1; i < yler.length; i++) araliklar.push(yler[i]-yler[i-1]);
      araliklar.sort((a,b) => a-b);
      const med = araliklar.length % 2 === 1
        ? araliklar[(araliklar.length-1)/2]
        : (araliklar[araliklar.length/2-1] + araliklar[araliklar.length/2]) / 2;
      if (med > 0) dy = satirDyBul(cImageData, sikler, med, false, false);
    }

    const sonuclar = bubbles.map((b, i) => {
      const { oran } = yerelArama(cImageData, sikler[i].px, sikler[i].py+dy, sikler[i].pr, aramaY, 0.3, 0.12);
      return { deger: b.deger ?? b.harf, oran };
    });
    sonuclar.sort((a,b) => b.oran - a.oran);

    const bir = sonuclar[0], iki = sonuclar[1];
    const esik = _koyulukEsik();
    const belirsiz = !bir || bir.oran < esik || (iki && (bir.oran - iki.oran) < 0.08);
    return { deger: belirsiz ? null : bir.deger, guven: bir?.oran || 0, detay: sonuclar };
  }

  function _basamakEnKoyusu(cImageData, bubbles, ppmm) {
    const minFark     = _numaraFark();
    const numaraEsik  = _numaraKoyuluk();
    const sikler = bubbles.map(b => ({ px: b.cx*ppmm, py: b.cy*ppmm, pr: b.r*ppmm }));

    // Sütun kilitleme
    let dy = 0;
    if (sikler.length >= 2) {
      const araliklar = [];
      const yler = sikler.map(s => s.py).sort((a,b) => a-b);
      for (let i = 1; i < yler.length; i++) araliklar.push(yler[i]-yler[i-1]);
      araliklar.sort((a,b) => a-b);
      const med = araliklar.length % 2 === 1
        ? araliklar[(araliklar.length-1)/2]
        : (araliklar[araliklar.length/2-1] + araliklar[araliklar.length/2]) / 2;
      if (med > 0) dy = satirDyBul(cImageData, sikler, med, false, false);
    }

    const sonuclar = bubbles.map((b, i) => {
      const { oran } = yerelArama(cImageData, sikler[i].px, sikler[i].py+dy, sikler[i].pr, 0.5, 0.3, 0.12);
      return { deger: b.deger ?? b.harf, oran };
    });
    sonuclar.sort((a,b) => b.oran - a.oran);

    const bir = sonuclar[0], iki = sonuclar[1];
    if (!bir || bir.oran < numaraEsik) return { deger: null, guven: bir?.oran||0, detay: sonuclar };
    const fark = iki ? bir.oran - iki.oran : 1;
    if (fark < minFark) return { deger: null, guven: bir.oran, detay: sonuclar };
    return { deger: bir.deger, guven: bir.oran, detay: sonuclar };
  }

  function numaraOku(cImageData, alan, ppmm) {
    if (!alan?.basamaklar) return null;
    let numara = '', tamMi = true;
    for (const bas of alan.basamaklar) {
      const s = _basamakEnKoyusu(cImageData, bas.bubbles, ppmm);
      if (s.deger === null) { numara += '0'; }
      else numara += String(s.deger);
    }
    return { numara, tamOkunduMu: tamMi };
  }

  function kitapcikOku(cImageData, alan, ppmm) {
    if (!alan?.secenekler) return null;
    return _sutunEnKoyusu(cImageData, alan.secenekler, ppmm).deger;
  }

  function formKoduOku(cImageData, alan, ppmm) {
    if (!alan?.secenekler) return null;
    return _sutunEnKoyusu(cImageData, alan.secenekler, ppmm).deger;
  }

  // ─── 13. Parlama ön testi ────────────────────────────────────────────────

  function parlamaUyarisi(imageData) {
    const { data } = imageData;
    const ornekSayisi = Math.min(data.length/4, 5000);
    const adim = Math.max(1, Math.floor(data.length / 4 / ornekSayisi));
    let parlak = 0, koyu = 0;
    for (let i = 0; i < data.length; i += adim*4) {
      const g = grilik(data, i);
      if (g > 240) parlak++; else if (g < 30) koyu++;
    }
    const pOran = parlak/ornekSayisi, kOran = koyu/ornekSayisi;
    if (pOran > 0.35)
      return `goruntuCokParlak: %${Math.round(pOran*100)} aşırı parlak.`;
    if (kOran > 0.60)
      return `goruntuCokKoyu: %${Math.round(kOran*100)} çok koyu.`;
    return null;
  }

  // ─── 14. Homografi (elle köşe) ───────────────────────────────────────────

  function homografiElleKoselerden(form, koseler, ppmm) {
    const { solUst, sagUst, solAlt, sagAlt } = koseler;
    const W = form.bolge.width * ppmm, H2 = form.bolge.height * ppmm;
    return homografiHesapla(
      [solUst, sagUst, solAlt, sagAlt],
      [{ x:0,y:0 }, { x:W,y:0 }, { x:0,y:H2 }, { x:W,y:H2 }]
    );
  }

  // ─── 15. Ana giriş noktaları ─────────────────────────────────────────────

  async function formuOku(kaynak, form, secenekler = {}) {
    const ppmm = secenekler.ppmm || VARSAYILAN_PPMM;
    const uyarilar = [];
    _binaryData = null;

    if (window.SayfaTespitCV) await window.SayfaTespitCV.cvHazirBekle?.();

    const { imageData: fotoData } = kaynaktanImageData(kaynak);

    // Parlama testi
    const parlamaUy = parlamaUyarisi(fotoData);
    if (parlamaUy) uyarilar.push(parlamaUy);

    // Sayfa köşelerini bul
    const koseTespiti = sayfaKoseleriniAra(fotoData, secenekler.hassasiyet);
    if (!koseTespiti?.H) {
      return { basarili: false, uyarilar: [...uyarilar, 'Sayfa köşeleri bulunamadı.'],
               ogrenciKimlik: null, cevaplar: [], formKodu: null, hataAyiklama: {} };
    }

    // Gerçek ölçek
    let gercekPpmm = ppmm;
    const k = koseTespiti.koseler;
    if (k?.solUst && k?.sagUst) {
      const genislikPx = Math.hypot(k.sagUst.x-k.solUst.x, k.sagUst.y-k.solUst.y);
      const yukseklikPx = Math.hypot(k.solAlt.x-k.solUst.x, k.solAlt.y-k.solUst.y);
      gercekPpmm = ((genislikPx/form.bolge.width) + (yukseklikPx/form.bolge.height)) / 2;
    }

    const { canvas: duzCanvas, imageData: cImageData, ppmmKullanilan } =
      duzCanvasUret(fotoData, koseTespiti.H, form, gercekPpmm);
    if (ppmmKullanilan !== gercekPpmm) gercekPpmm = ppmmKullanilan;

    kontrastNormalize(cImageData);
    duzCanvas.getContext('2d').putImageData(cImageData, 0, 0);
    adaptifEsikle(cImageData);

    const izgaraH = genelIzgaraDuzelt(cImageData, form, gercekPpmm);

    return _okumaTamamla(duzCanvas, cImageData, form, gercekPpmm, izgaraH, uyarilar);
  }

  async function formuOkuElleKoseli(kaynak, form, koseler, secenekler = {}) {
    const ppmm = secenekler.ppmm || VARSAYILAN_PPMM;
    const uyarilar = [];
    _binaryData = null;

    const { imageData: fotoData } = kaynaktanImageData(kaynak);

    const parlamaUy = parlamaUyarisi(fotoData);
    if (parlamaUy) uyarilar.push(parlamaUy);

    // Gerçek ölçek köşelerden
    const fGenislik = Math.hypot(koseler.sagUst.x-koseler.solUst.x, koseler.sagUst.y-koseler.solUst.y);
    const fYukseklik = Math.hypot(koseler.solAlt.x-koseler.solUst.x, koseler.solAlt.y-koseler.solUst.y);
    let gercekPpmm = ((fGenislik/form.bolge.width) + (fYukseklik/form.bolge.height)) / 2;

    const H = homografiElleKoselerden(form, koseler, gercekPpmm);
    const { canvas: duzCanvas, imageData: cImageData, ppmmKullanilan } =
      duzCanvasUret(fotoData, H, form, gercekPpmm);
    if (ppmmKullanilan !== gercekPpmm) gercekPpmm = ppmmKullanilan;

    kontrastNormalize(cImageData);
    duzCanvas.getContext('2d').putImageData(cImageData, 0, 0);
    adaptifEsikle(cImageData);

    // Elle köşe modunda genel ızgara düzeltmesi isteğe bağlı
    const izgaraH = secenekler.genelDuzeltmeKullan
      ? genelIzgaraDuzelt(cImageData, form, gercekPpmm)
      : null;

    return _okumaTamamla(duzCanvas, cImageData, form, gercekPpmm, izgaraH, uyarilar);
  }

  function _okumaTamamla(duzCanvas, cImageData, form, ppmm, izgaraH, uyarilar) {
    const numaraSonuc  = numaraOku (cImageData, form.numaraAlani,  ppmm);
    const kitapcik    = kitapcikOku(cImageData, form.kitapcikAlani, ppmm);
    const formKoduDeg = formKoduOku(cImageData, form.formKoduAlani, ppmm);

    let ogrenciKimlik = null;
    if (numaraSonuc) {
      ogrenciKimlik = { ogrenciNo: numaraSonuc.numara, kitapcikTuru: kitapcik };
      if (!numaraSonuc.tamOkunduMu)
        uyarilar.push('Öğrenci no bazı basamaklar belirsiz: ' + numaraSonuc.numara);
    } else {
      uyarilar.push('Numara alanı tanımlı değil.');
    }

    const { cevaplar, ornekNoktalari } = cevaplariCikar(cImageData, form, ppmm, izgaraH);

    // Özet uyarılar
    const belirsiz    = cevaplar.filter(c => c.uyari).length;
    const coklu       = cevaplar.filter(c => c.uyari === 'coklu');
    const yetersiz    = cevaplar.filter(c => c.uyari === 'yetersizPiksel');
    const dusukCift   = cevaplar.filter(c => c.dusukDolulukCiftIsaret);

    if (belirsiz)  uyarilar.push(belirsiz + ' soruda belirsiz/boş/çoklu işaret.');
    if (coklu.length)
      uyarilar.push('birdenFazlaSecenekIsaretleme: ' + coklu.map(c=>(c.ders||'')+' #'+c.soruNo).join(', '));
    if (yetersiz.length)
      uyarilar.push('yetersizPiksel: ' + yetersiz.map(c=>(c.ders||'')+' #'+c.soruNo).join(', '));
    if (dusukCift.length)
      uyarilar.push('dusukDolulukOraniCiftIsaretliUyari: ' + dusukCift.map(c=>(c.ders||'')+' #'+c.soruNo).join(', '));

    uyarilar.push('[KOD SÜRÜMÜ: omrEngine2-v1]');

    return {
      basarili: true,
      ogrenciKimlik,
      formKodu: formKoduDeg,
      cevaplar,
      uyarilar,
      hataAyiklama: {
        duzeltilmisCanvas: duzCanvas,
        hizalamaNoktalari: null,
        ornekNoktalari,
        genelDuzeltme: izgaraH,
      },
    };
  }

  // ─── Public API (omrEngine.js ile aynı yüzey) ────────────────────────────

  return {
    formuOku,
    formuOkuElleKoseli,
    homografiHesapla,
    noktayiDonustur: noktaDonustur,
    tumSorulariTopla,
    VARSAYILAN_PPMM,
    sayfaKoseleriniAra,
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = OmrOkuyucu2;
