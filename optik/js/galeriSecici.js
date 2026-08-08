// js/galeriSecici.js — CV önce otomatik köşe dener; bulamazsa veya
// kullanıcı isterse gerçek dokunmatik köşe seçim ekranı (koseSecici.js)
// açılır. Önceki sürümde bu ekran hiç çağrılmıyordu (bkz. DEGISIKLIKLER.md).

import { formuOkuElleKoseliVeGoster, formuOkuToplu } from "./formOkuyucu.js";
import { showStatus } from "./utils.js";
import { cvHazirBekle, sayfaKoseleriniAraCV } from "./sayfaTespitCV.js";
import { koseSeciciElemanlariniAl, koseSecimAkisi, KOSE_SECIM_IPTAL } from "./koseSecici.js";

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

async function koseleriBul(canvas) {
    const ANALIZ_GENISLIK = 640;
    const kucuk = document.createElement('canvas');
    const ol = Math.min(1, ANALIZ_GENISLIK / canvas.width);
    kucuk.width = Math.round(canvas.width * ol);
    kucuk.height = Math.round(canvas.height * ol);
    kucuk.getContext('2d').drawImage(canvas, 0, 0, kucuk.width, kucuk.height);
    const kImageData = kucuk.getContext('2d').getImageData(0, 0, kucuk.width, kucuk.height);
    try {
        const bulunan = sayfaKoseleriniAraCV(kImageData);
        if (bulunan?.solUst && bulunan?.sagUst && bulunan?.solAlt && bulunan?.sagAlt) {
            const gOl = canvas.width / kucuk.width;
            return {
                solUst: { x: bulunan.solUst.x * gOl, y: bulunan.solUst.y * gOl },
                sagUst: { x: bulunan.sagUst.x * gOl, y: bulunan.sagUst.y * gOl },
                solAlt: { x: bulunan.solAlt.x * gOl, y: bulunan.solAlt.y * gOl },
                sagAlt: { x: bulunan.sagAlt.x * gOl, y: bulunan.sagAlt.y * gOl },
            };
        }
    } catch (e) {
        console.error("Galeri: CV köşe tespiti hata verdi:", e);
    }
    return null; // Bulunamadı — çağıran taraf elle seçime düşer.
}

// Kullanıcının elle köşe düzeltebileceği ekranı açar. koseSecici.js kendi
// varsayılan tutamaç konumlarıyla başlar (CV sonucunu başlangıç noktası
// olarak almıyor — bu yüzden cvKoseler burada sadece "CV zaten bir şey
// buldu mu" bilgisini taşımak için var, ekrana aktarılmıyor).
// Kullanıcı "Otomatik Devam Et"/"Vazgeç" derse null döner → çağıran taraf
// cvKoseler'e (varsa) düşer. "✕ İptal" derse KOSE_SECIM_IPTAL döner →
// o dosya atlanır.
async function koseleriElleOnaylat(canvas) {
    const elemanlar = koseSeciciElemanlariniAl();
    if (!elemanlar) {
        // Elle seçim ekranı sayfada yoksa (index.html'e eklenmemiş),
        // eskisi gibi davran — yukarıda çağıran taraf CV sonucunu kullanır.
        return null;
    }
    return await koseSecimAkisi(canvas, canvas.width, canvas.height, elemanlar);
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

                let koseler = await koseleriBul(canvas);

                if (!koseler) {
                    // CV köşeleri bulamadı: eskiden burada koseler=null ile
                    // devam edilip homografiElleKoselerdenHesapla içinde
                    // null.solUst hatası alınıyordu. Artık kullanıcı elle
                    // seçime yönlendiriliyor.
                    showStatus("Köşeler otomatik bulunamadı, elle seçin...");
                    koseler = await koseleriElleOnaylat(canvas);
                    if (koseler === KOSE_SECIM_IPTAL) {
                        showStatus("Vazgeçildi.");
                        return;
                    }
                    if (!koseler) {
                        showStatus("Köşe seçilmedi, form okunamadı.");
                        return;
                    }
                }

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
