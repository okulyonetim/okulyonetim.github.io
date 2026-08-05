// js/canvasFormGenerator.js
//
// pdfFormGenerator.js AYNI çizim fonksiyonlarını (hizalamaIsaretleriCiz,
// headerCiz, bolumlerCiz, izgaraCiz) kullanarak optik formu bir <canvas>'a
// çizer ve sayfa başına bir PNG data URL üretir. Neden ayrı bir dosya:
//
//   1) ÖNİZLEME: Android'in çıplak WebView bileşeninde <iframe src="blob:...">
//      ile bir PDF göstermek çalışmıyor (PDF görüntüleyici eklentisi yok) —
//      bunun yerine gerçek bir görsel üretip ekranda gösteriyoruz.
//   2) YAZDIRMA: Üretilen görseller, uygulamanın geri kalanında zaten
//      kullanılan "HTML + Yazdır/PDF İndir + Kapat" kalıbına (bkz. js/app.js
//      uygulamaHtmlYazdir) sarılıp gerçek Android sistem yazdırma/önizleme
//      diyaloğu üzerinden yazdırılabiliyor.
//
// Çizim mantığı pdfFormGenerator.js'te KALIYOR — burada sadece "doc" olarak
// canvasFormAdapter.js'in ürettiği nesne veriliyor, böylece PDF çıktısı ile
// önizleme/yazdırma çıktısı birbirinden asla sapmaz.

import { hizalamaIsaretleriCiz, headerCiz, bolumlerCiz, izgaraCiz, serbestOgeleriCiz } from './pdfFormGenerator.js';
import { canvasDocOlustur, gorselleriOnceYukle } from './canvasFormAdapter.js';

async function tekSayfaCiz(canvas, layout, sayfadakiFormOgrenciler, dpi) {
  // YENİ (Sedat geri bildirimi, Ağustos 2026: "Bazı öğeler form önizlemede
  // görünmüyor"): logo görselleri asenkron yükleniyor ama bu fonksiyon
  // TEK SEFERLİK senkron bir çizim yapıyor — resim yüklenene kadar bekleyen
  // bir "bir sonraki çizim" YOK. Bu yüzden önce TÜM logo görsellerini
  // (varsa) yükleyip önbelleğe alıyoruz, ÇİZİMDEN ÖNCE.
  const gorselUrller = [];
  for (const { form } of sayfadakiFormOgrenciler) {
    (form.serbestOgeler || []).forEach((og) => {
      if (og.tip === 'logo' && og.gorselData) gorselUrller.push(og.gorselData);
    });
  }
  if (gorselUrller.length) await gorselleriOnceYukle(gorselUrller);

  const doc = canvasDocOlustur(canvas, layout.sayfaBoyutu.width, layout.sayfaBoyutu.height, dpi);
  for (const { form, ogrenci } of sayfadakiFormOgrenciler) {
    hizalamaIsaretleriCiz(doc, form);
    await headerCiz(doc, form, ogrenci, layout.sinavTuru);
    if (form.bolumler) {
      bolumlerCiz(doc, form);
    } else if (form.izgara) {
      izgaraCiz(doc, form);
    }
    // KÖK NEDEN DÜZELTMESİ: bu çağrı hiç yoktu — Optik Form Editörü'nün
    // logo/kimlik/başlık/metin/çizgi gibi "serbest öğeleri" canvas
    // önizlemesinde/yazdırmasında asla çizilmiyordu (gerçek PDF'te
    // çiziliyordu ama ikisi ayrı kod yollarıydı).
    serbestOgeleriCiz(doc, form, ogrenci);
  }
  return doc;
}

/**
 * Boş (örnek) form için TEK sayfalık önizleme görseli üretir.
 * @returns {Promise<{dataUrl: string, genislikMM: number, yukseklikMM: number}>}
 */
async function bosFormGorseliOlustur(layout, ogrenci, dpi = 200) {
  const canvas = document.createElement('canvas');
  await tekSayfaCiz(canvas, layout, layout.formlar.map((form) => ({ form, ogrenci })), dpi);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    genislikMM: layout.sayfaBoyutu.width,
    yukseklikMM: layout.sayfaBoyutu.height,
  };
}

/**
 * Bir öğrenci listesi için TÜM sayfaların önizleme görsellerini üretir.
 * Sayfalama mantığı topluFormPdfOlustur ile birebir aynıdır (bkz.
 * pdfFormGenerator.js): bir A4'e sığan mini-form sayısı kadar öğrenci bir
 * sayfayı doldurur.
 * @returns {Promise<Array<{dataUrl: string, genislikMM: number, yukseklikMM: number}>>}
 */
async function ogrenciFormGorselleriOlustur(layout, ogrenciListesi, dpi = 200) {
  const slotSayisi = layout.formlar.length;
  const sayfalar = [];

  for (let i = 0; i < ogrenciListesi.length; i += slotSayisi) {
    const sayfadakiOgrenciler = ogrenciListesi.slice(i, i + slotSayisi);
    const eslesme = sayfadakiOgrenciler.map((ogrenci, slot) => ({ form: layout.formlar[slot], ogrenci }));
    const canvas = document.createElement('canvas');
    // eslint-disable-next-line no-await-in-loop
    await tekSayfaCiz(canvas, layout, eslesme, dpi);
    sayfalar.push({
      dataUrl: canvas.toDataURL('image/png'),
      genislikMM: layout.sayfaBoyutu.width,
      yukseklikMM: layout.sayfaBoyutu.height,
    });
  }

  return sayfalar;
}

export { bosFormGorseliOlustur, ogrenciFormGorselleriOlustur };
