// js/galeriSecici.js [GALERI SÜRÜM: v2-teshis] — CV önce otomatik köşe
// dener; kullanıcı isterse gerçek dokunmatik köşe seçim ekranı
// (koseSecici.js) açılır.

import { formuOkuElleKoseliVeGoster, formuOkuToplu } from "./formOkuyucu.js";
import { showStatus } from "./utils.js";
import { cvHazirBekle, sayfaKoseleriniAraCV } from "./sayfaTespitCV.js";
import { koseSeciciElemanlariniAl, koseSecimAkisi, KOSE_SECIM_IPTAL } from "./koseSecici.js";

console.log('[GALERI SÜRÜM: v2-teshis] galeriSecici.js yüklendi.');

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
            canvas.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
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
    const ANALIZ_GENISLIK = 1280; // camera.js'deki KOSE_TESPIT_ANALIZ_GENISLIK ile aynı gerekçe: düşük çözünürlükte 1px köşe hatası büyütme sonrası çok daha fazla piksele karşılık geliyor.
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
//
// DÜZELTME (Ağustos 2026): koseSecimAlani (#koseSecimAlani) DOM'da
// #kameraOverlay'in İÇİNDE yaşıyor (index.html), ve #kameraOverlay
// başlangıçta hidden. koseSecimAlani.style.display='block' yapılsa bile
// ebeveyni hâlâ hidden olduğu için hiçbir şey GÖRÜNMÜYORDU — Sedat'ın
// bildirdiği "galeriden hiçbir şey olmuyor, kameraya geçince (kameraAc()
// #kameraOverlay'i hidden=false yapınca) orada duruyor" davranışı tam
// buydu. Galeri akışı kamerayı hiç açmadığı için (app.js:kameraAc()'e
// erişimi yok, o modül-dışı script kapsamında) burada SADECE gereken
// overlay doğrudan görünür kılınıyor — video/seviye göstergesi gibi
// kamera-özel yan işler tetiklenmiyor, galeri akışında onlara gerek yok.
async function koseleriElleOnaylat(canvas) {
    const elemanlar = koseSeciciElemanlariniAl();
    if (!elemanlar) {
        // Elle seçim ekranı sayfada yoksa (index.html'e eklenmemiş),
        // eskisi gibi davran — yukarıda çağıran taraf CV sonucunu kullanır.
        return null;
    }
    const kameraOv = document.getElementById('kameraOverlay');
    const oncekiHidden = kameraOv ? kameraOv.hidden : null;
    if (kameraOv) kameraOv.hidden = false;
    try {
        return await koseSecimAkisi(canvas, canvas.width, canvas.height, elemanlar);
    } finally {
        // Kamera zaten açıksa (nadir ama mümkün: kullanıcı kamera
        // ekranındayken galeri ikonuna bastıysa) onun durumunu bozma —
        // sadece BİZİM açtığımız durumda (önceden hidden idiyse) geri kapat.
        if (kameraOv && oncekiHidden === true) kameraOv.hidden = true;
    }
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
                // Bkz. koseSecici.js'deki aynı düzeltme: canvas'ın CSS
                // kutusu kameranın sabit oranına göre ayarlanmış olabilir;
                // galeriden gelen fotoğraf farklı oranda olursa görüntü
                // gerilip bozuk görünür. Gerçek orana sabitliyoruz.
                canvas.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                canvas.getContext("2d").drawImage(img, 0, 0);

                // ADIM 1: Önce omrEngine'in otomatik köşe tespitini dene
                // (sayfaKoseleriniAraHibrit — hizalama karelerini kullanır)
                showStatus("Otomatik okuma deneniyor...");
                let otomatikSonuc = null;
                try {
                    otomatikSonuc = await formuOkuVeGoster(canvas);
                } catch (e) { otomatikSonuc = null; }

                if (otomatikSonuc && otomatikSonuc.basarili) {
                    showStatus("Okuma tamamlandı.");
                    return; // Başarılı — bitti
                }

                // ADIM 2: Otomatik başarısız — köşe seçim ekranını aç
                const ilkHata = otomatikSonuc?.uyarilar?.[0] || 'Köşeler bulunamadı';
                showStatus("Otomatik başarısız: " + ilkHata.substring(0, 60) + " — Köşeleri elle seçin.");

                const cvKoseler = await koseleriBul(canvas);
                let koseler = await koseleriElleOnaylat(canvas);

                if (koseler === KOSE_SECIM_IPTAL) {
                    showStatus("Vazgeçildi.");
                    return;
                }
                if (!koseler) {
                    // "🤖 Otomatik Dene" butonuna basıldı — CV köşelerini kullan
                    if (!cvKoseler) {
                        showStatus("Köşeler bulunamadı. Fotoğrafı tekrar çekip köşeleri elle işaretleyin.");
                        return;
                    }
                    koseler = cvKoseler;
                }

                const elleKoseliSonuc = await formuOkuElleKoseliVeGoster(canvas, koseler);
                if (!elleKoseliSonuc || !elleKoseliSonuc.basarili) {
                    const ilkUyari = elleKoseliSonuc?.uyarilar?.[0] || 'Bilinmeyen hata';
                    showStatus('Okuma başarısız: ' + ilkUyari.substring(0, 80));
                }
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
