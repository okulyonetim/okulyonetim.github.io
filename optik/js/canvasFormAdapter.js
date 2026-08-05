// js/canvasFormAdapter.js
//
// pdfFormGenerator.js'teki hizalamaIsaretleriCiz/headerCiz/bolumlerCiz/izgaraCiz
// fonksiyonları `doc` parametresi üzerinden yalnızca küçük, sabit bir jsPDF alt
// kümesi çağırıyor (setFont, setFontSize, setDrawColor, setFillColor,
// setTextColor, setLineWidth, setLineDashPattern, rect, circle, text). Bu dosya
// AYNI arayüzü bir HTML5 <canvas> 2D context'i üzerinde uyguluyor — böylece o
// fonksiyonlar hiç değiştirilmeden hem PDF üretiminde (gerçek jsPDF ile) hem de
// ekran önizlemesi/yazdırmada (bu adaptörle) kullanılabiliyor. Tek çizim
// kaynağı = PDF ile önizleme arasında asla fark oluşmaz.
//
// jsPDF birimi mm'dir; burada da tüm koordinat/boyut parametreleri mm olarak
// alınır ve `dpi` ile piksele çevrilir (px = mm * dpi / 25.4). Font boyutu
// jsPDF'te pt'dir (1pt = 1/72 inç): px = pt * dpi / 72.
//
// Canvas metin rengi/hizalaması jsPDF ile eşleşecek şekilde ayarlanır: jsPDF
// varsayılan taban çizgisi (baseline) "alphabetic"tir — canvas'ın varsayılanıyla
// birebir aynıdır, bu yüzden y koordinatı ekstra dönüşüm gerektirmez.

function rgbStr(renk) {
  const [r, g, b] = renk;
  return `rgb(${r},${g},${b})`;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} genislikMM
 * @param {number} yukseklikMM
 * @param {number} dpi Ekran önizlemesi için düşük (~150), yazdırma/PDF-benzeri
 *   netlik için yüksek (~300) bir değer kullanın.
 * @returns {object} pdfFormGenerator.js'in beklediği küçük jsPDF alt kümesini
 *   uygulayan bir "doc" nesnesi.
 */
function canvasDocOlustur(canvas, genislikMM, yukseklikMM, dpi = 200) {
  const olcek = dpi / 25.4; // px / mm
  canvas.width = Math.round(genislikMM * olcek);
  canvas.height = Math.round(yukseklikMM * olcek);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'alphabetic';

  const durum = {
    fontAilesi: 'Roboto',
    fontStili: 'normal', // 'normal' | 'bold'
    fontPt: 10,
    cizgiRengi: [0, 0, 0],
    doluRengi: [0, 0, 0],
    metinRengi: [0, 0, 0],
    cizgiKalinligiMM: 0.2,
    dashMM: null,
  };

  const px = (mm) => mm * olcek;

  function cizgiUygula() {
    ctx.lineWidth = Math.max(0.1, px(durum.cizgiKalinligiMM));
    ctx.strokeStyle = rgbStr(durum.cizgiRengi);
    if (durum.dashMM) ctx.setLineDash(durum.dashMM.map(px));
    else ctx.setLineDash([]);
  }

  function fontUygula() {
    const pxBoyut = (durum.fontPt * dpi) / 72;
    const agirlik = durum.fontStili === 'bold' ? 'bold' : 'normal';
    ctx.font = `${agirlik} ${pxBoyut}px ${durum.fontAilesi}, Manrope, Arial, sans-serif`;
  }

  return {
    // PDF'e özgü çağrılar canvas için anlamsız — sessizce yok sayılır.
    addFileToVFS() {},
    addFont() {},
    addPage() {},

    setFont(aile, stil) {
      durum.fontAilesi = aile || durum.fontAilesi;
      durum.fontStili = stil === 'bold' ? 'bold' : 'normal';
    },
    setFontSize(pt) {
      durum.fontPt = pt;
    },
    setDrawColor(...renk) {
      durum.cizgiRengi = renk;
    },
    setFillColor(...renk) {
      durum.doluRengi = renk;
    },
    setTextColor(...renk) {
      durum.metinRengi = renk;
    },
    setLineWidth(mm) {
      durum.cizgiKalinligiMM = mm;
    },
    setLineDashPattern(desenMM) {
      durum.dashMM = desenMM && desenMM.length ? desenMM : null;
    },

    rect(x, y, w, h, stil = 'S') {
      const px_ = px(x), py_ = px(y), pw = px(w), ph = px(h);
      if (stil === 'F' || stil === 'FD' || stil === 'DF') {
        ctx.fillStyle = rgbStr(durum.doluRengi);
        ctx.fillRect(px_, py_, pw, ph);
      }
      if (stil !== 'F') {
        cizgiUygula();
        ctx.strokeRect(px_, py_, pw, ph);
      }
    },

    circle(cx, cy, r, stil = 'S') {
      ctx.beginPath();
      ctx.arc(px(cx), px(cy), px(r), 0, Math.PI * 2);
      if (stil === 'F' || stil === 'FD' || stil === 'DF') {
        ctx.fillStyle = rgbStr(durum.doluRengi);
        ctx.fill();
      }
      if (stil !== 'F') {
        cizgiUygula();
        ctx.stroke();
      }
    },

    text(metin, x, y, opts = {}) {
      fontUygula();
      ctx.fillStyle = rgbStr(durum.metinRengi);
      ctx.textAlign = opts.align === 'center' ? 'center' : (opts.align === 'right' ? 'right' : 'left');
      ctx.fillText(String(metin), px(x), px(y));
    },

    // YENİ (Ağustos 2026): Optik Form Editörü'nün "serbest öğeler" desteği
    // (çizgi, logo) için eklendi — önceden bu adaptörde hiç yoktu, bu
    // yüzden pdfFormGenerator.js:serbestOgeleriCiz bunlara ulaşınca sessizce
    // hata verip döngünün geri kalanını (logo, başlık vb.) hiç çizmiyordu
    // (Sedat geri bildirimi: "Bazı öğeler form önizlemede görünmüyor").
    line(x1, y1, x2, y2) {
      cizgiUygula();
      ctx.beginPath();
      ctx.moveTo(px(x1), px(y1));
      ctx.lineTo(px(x2), px(y2));
      ctx.stroke();
    },

    addImage(gorselData, format, x, y, w, h) {
      // Senkron API bekleniyor (pdfFormGenerator.js diğer çağrılar gibi
      // await'siz çağırıyor) — Image yüklemesi asenkron olduğundan burada
      // BEKLENEMEZ. Görsel önceden (Optik Form Editörü'nde seçilirken)
      // zaten yüklenip önbelleğe alınmış olmalı (bkz. _gorselOnbellek).
      const img = _gorselOnbellek.get(gorselData);
      if (img && img.complete) {
        ctx.drawImage(img, px(x), px(y), px(w), px(h));
      } else if (!img) {
        // İlk görülüşte: yükle ve önbelleğe al, bu çizimde henüz gösterilemez
        // (senkron API) ama BİR SONRAKİ yeniden çizimde (editördeki her
        // parametre değişikliği zaten yeniden çiziyor) görünür olur.
        const yeni = new Image();
        yeni.onload = () => { _gorselOnbellek.set(gorselData, yeni); };
        yeni.src = gorselData;
        _gorselOnbellek.set(gorselData, yeni);
      }
    },

    // Yardımcı: pdfFormGenerator.js kullanmaz ama önizleme/yazdırma kodu
    // sayfayı görsele çevirirken ihtiyaç duyar.
    _canvas: canvas,
  };
}

// YENİ: addImage() için görsel önbelleği — Image yüklemesi asenkron olduğu
// için modül düzeyinde tutuluyor, aynı görsel (aynı base64 data URL)
// birden fazla çizimde tekrar tekrar yüklenmesin diye.
const _gorselOnbellek = new Map();

window.canvasDocOlustur = canvasDocOlustur;
export { canvasDocOlustur };
