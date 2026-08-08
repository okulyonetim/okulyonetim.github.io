// js/galeriSecici.js — köşe seçim UI kaldırıldı, CV ile otomatik tespit

import { formuOkuElleKoseliVeGoster, formuOkuToplu } from "./formOkuyucu.js";
import { showStatus } from "./utils.js";
import { cvHazirBekle, sayfaKoseleriniAraCV } from "./sayfaTespitCV.js";

function dosyayiResmeCevir(dosya) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(dosya);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Görsel yüklenemedi.")); };
        img.src = url;
    });
}

async function topluIceAktar(dosyalar, canvas) {
    const toplam = dosyalar.length;
    let basarili = 0;
    const basarisizlar = [];
    for (let i = 0; i < toplam; i++) {
        const dosya = dosyalar[i];
        showStatus(`Taranıyor... (${i + 1}/${toplam}) ${dosya.name || ""}`);
        try {
            const img = await dosyayiResmeCevir(dosya);
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d").drawImage(img, 0, 0);
            const sonuc = await formuOkuToplu(canvas);
            if (sonuc && sonuc.basarili) basarili++;
            else basarisizlar.push(dosya.name || `#${i + 1}`);
        } catch (err) {
            console.error("Toplu içe aktarma — dosya okunamadı:", dosya.name, err);
            basarisizlar.push(dosya.name || `#${i + 1}`);
        }
    }
    showStatus(`Toplu içe aktarma: ${basarili}/${toplam} başarılı` + (basarisizlar.length ? `, ${basarisizlar.length} başarısız` : ""));
    const sonucKutusu = document.getElementById("sonucKutusu");
    if (sonucKutusu) {
        sonucKutusu.textContent = [`Toplu içe aktarma tamamlandı: ${basarili}/${toplam} başarılı.`].concat(
            basarisizlar.length ? ["", "Okunamayanlar:", ...basarisizlar.map(a => "• " + a)] : []
        ).join("\n");
        sonucKutusu.style.display = "block";
    }
    window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: { toplu: true, basarili, toplam } }));
}

// KABA (hızlı) geçiş için analiz genişliği. Bu çözünürlükte bulunan köşe
// piksel konumlarındaki HER 1 pikseli hata, tam çözünürlüğe geri
// ölçeklenince onlarca piksele katlanıyor (ör. 4000px genişlikte bir fotoda
// ~6.25x) — sayfanın sağına/alt satırlarına doğru büyüyen okuma kaymasının
// asıl kaynağı buydu. İNCELTME (refine) geçişi bunu düzeltir.
const ANALIZ_GENISLIK_KABA = 640;
// İNCELTME geçişi için analiz genişliği: kaba geçişte bulunan köşelerin
// etrafında (sayfaKoseleriniAraCV'nin takip/ROI modunu kullanarak) çok daha
// yüksek çözünürlükte tekrar arama yapar. Tam orijinal çözünürlük yerine
// sabit bir üst sınır kullanılıyor ki çok yüksek çözünürlüklü telefon
// fotoğraflarında (ör. 4000px+) tek seferlik Canny/kontur maliyeti makul
// kalsın; yine de 640'a göre ~2.5x daha hassas köşe konumu verir.
const ANALIZ_GENISLIK_INCE = 1600;

async function _koseleriAraTekGecis(canvas, analizGenislik, sonBilinenKoselerTamCanvas) {
    const kucuk = document.createElement('canvas');
    const ol = Math.min(1, analizGenislik / canvas.width);
    kucuk.width = Math.round(canvas.width * ol);
    kucuk.height = Math.round(canvas.height * ol);
    kucuk.getContext('2d').drawImage(canvas, 0, 0, kucuk.width, kucuk.height);
    const kImageData = kucuk.getContext('2d').getImageData(0, 0, kucuk.width, kucuk.height);

    // Önceki (daha kaba) geçişten bulunan köşeler varsa, bu analiz
    // çözünürlüğüne ölçekleyip takip-modu ROI'sini tetiklemek için ver —
    // bu, aramayı sayfanın olması gereken bölgesine kilitleyip gerçek
    // köşeye daha isabetli kilitlenmesini sağlar.
    let sonBilinenKoseler = null;
    if (sonBilinenKoselerTamCanvas) {
        const g = kucuk.width / canvas.width;
        sonBilinenKoseler = {
            solUst: { x: sonBilinenKoselerTamCanvas.solUst.x * g, y: sonBilinenKoselerTamCanvas.solUst.y * g },
            sagUst: { x: sonBilinenKoselerTamCanvas.sagUst.x * g, y: sonBilinenKoselerTamCanvas.sagUst.y * g },
            solAlt: { x: sonBilinenKoselerTamCanvas.solAlt.x * g, y: sonBilinenKoselerTamCanvas.solAlt.y * g },
            sagAlt: { x: sonBilinenKoselerTamCanvas.sagAlt.x * g, y: sonBilinenKoselerTamCanvas.sagAlt.y * g },
        };
    }

    const bulunan = sayfaKoseleriniAraCV(kImageData, undefined, sonBilinenKoseler);
    if (bulunan?.solUst && bulunan?.sagUst && bulunan?.solAlt && bulunan?.sagAlt) {
        const gOl = canvas.width / kucuk.width;
        return {
            solUst: { x: bulunan.solUst.x * gOl, y: bulunan.solUst.y * gOl },
            sagUst: { x: bulunan.sagUst.x * gOl, y: bulunan.sagUst.y * gOl },
            solAlt: { x: bulunan.solAlt.x * gOl, y: bulunan.solAlt.y * gOl },
            sagAlt: { x: bulunan.sagAlt.x * gOl, y: bulunan.sagAlt.y * gOl },
        };
    }
    return null;
}

async function koseleriBul(canvas) {
    try {
        const kaba = await _koseleriAraTekGecis(canvas, ANALIZ_GENISLIK_KABA, null);
        if (!kaba) return null;

        // İNCELTME geçişi: kaba sonucu daha yüksek çözünürlükte doğrula/düzelt.
        // Bu geçiş herhangi bir sebeple başarısız olursa (ör. WASM hatası),
        // en azından kaba sonuca sessizce geri dönülür — okumanın tamamen
        // durmasındansa daha kaba ama var olan bir tahmin tercih edilir.
        try {
            const ince = await _koseleriAraTekGecis(canvas, ANALIZ_GENISLIK_INCE, kaba);
            if (ince) return ince;
        } catch (e) { /* ince geçiş başarısız — kaba sonuca düş */ }

        return kaba;
    } catch (e) {}
    return null;
}

// Birden fazla input aynı anda okuma başlatmasın
let _galeriIsleniyor = false;

export function baglaGaleriSecici(inputId, canvasId) {
    const input = document.getElementById(inputId);
    const canvas = document.getElementById(canvasId);
    if (!input || !canvas) { console.error("Galeri seçici için gerekli elemanlar bulunamadı."); return; }

    input.addEventListener("change", async () => {
        const dosyalar = input.files;
        if (!dosyalar || !dosyalar.length) return;
        if (_galeriIsleniyor) { input.value = ""; return; } // çift tetiklenmeyi önle
        _galeriIsleniyor = true;
        try {
            await cvHazirBekle();
            if (dosyalar.length > 1) {
                await topluIceAktar(dosyalar, canvas);
            } else {
                showStatus("Fotoğraf yükleniyor...");
                const img = await dosyayiResmeCevir(dosyalar[0]);
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext("2d").drawImage(img, 0, 0);
                const koseler = await koseleriBul(canvas);
                await formuOkuElleKoseliVeGoster(canvas, koseler);
            }
        } catch (err) {
            console.error("Galeriden okuma hatası:", err);
            showStatus("Fotoğraf okunamadı: " + err.message);
        } finally {
            input.value = "";
            _galeriIsleniyor = false;
        }
    });
}
