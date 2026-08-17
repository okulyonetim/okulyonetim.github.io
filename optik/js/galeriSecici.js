// js/galeriSecici.js [GALERI SÜRÜM: v2-teshis] — CV önce otomatik köşe
// dener; kullanıcı isterse gerçek dokunmatik köşe seçim ekranı
// (koseSecici.js) açılır.

import { formuOkuVeGoster, formuOkuElleKoseliVeGoster, formuOkuToplu } from "./formOkuyucu.js";
import { showStatus } from "./utils.js";
import { cvHazirBekle, sayfaKoseleriniAraCV } from "./sayfaTespitCV.js";
import { koseSeciciElemanlariniAl, koseSecimAkisi, KOSE_SECIM_IPTAL } from "./koseSecici.js";


console.log('[GALERI SÜRÜM: v36-gorunur-hata] galeriSecici.js yüklendi.');

function galeriMesajGoster(mesaj, tur = "bilgi") {
    showStatus(mesaj);
    const kutu = document.getElementById("sonucKutusu");
    if (kutu) {
        kutu.style.display = "block";
        kutu.hidden = false;
        kutu.textContent = mesaj;
        kutu.dataset.galeriDurum = tur;
        // Inline renk yalnız görünürlük garantisi için; mevcut CSS temel görünümü korur.
        kutu.style.border = tur === "hata" ? "2px solid #dc3545"
                          : tur === "uyari" ? "2px solid #f59e0b"
                          : "2px solid #3b82f6";
        kutu.style.padding = "12px";
        kutu.style.borderRadius = "8px";
        kutu.style.whiteSpace = "pre-wrap";
    }
}

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
            const sonuc = await formuOkuToplu(canvas, { galeri: true });
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
        const aktifForm = window.OptikAktifForm && window.OptikAktifForm.form;
        const bolge = aktifForm && aktifForm.bolge;
        let oranlar;
        try {
            if (bolge && bolge.width && bolge.height) {
                const o = bolge.width / bolge.height;
                oranlar = [o, 1 / o];
            }
        } catch (_) {}
        const bulunan = sayfaKoseleriniAraCV(kImageData, oranlar);
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
                galeriMesajGoster("Fotoğraf yükleniyor...");
                const img = await dosyayiResmeCevir(dosyalar[0]);
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                canvas.getContext("2d").drawImage(img, 0, 0);

                // ── ADIM 1: OTOMATİK OKUMA DENEMESİ ─────────────────────────────────
                // omrEngine.js'nin tam otomatik pipeline'ı (sayfaKoseleriniAraHibrit →
                // homografi → baloncuk okuma) kamera akışıyla AYNI kodu kullanır.
                // Galeri fotoğrafları genellikle kameraya göre daha yüksek çözünürlüklü
                // ve daha sakin (blur yok) olduğundan otomatik tespiti daha iyi çalışır.
                galeriMesajGoster("Otomatik okunuyor...");
                let otomatikSonuc = null;
                try {
                    otomatikSonuc = await formuOkuVeGoster(canvas, { galeri: true });
                } catch (err) {
                    console.warn("[GALERI] Otomatik okuma hata verdi, elle seçime düşülüyor:", err);
                }

                if (otomatikSonuc && otomatikSonuc.basarili) {
                    console.log("[GALERI] Otomatik okuma başarılı.");
                    if (otomatikSonuc.kontrolGerekli) {
                        galeriMesajGoster(
                            "Form okundu ancak kalite kontrolü gerekli.\n" +
                            ((otomatikSonuc.uyarilar || []).join("\n") || "Sonucu kontrol edin."),
                            "uyari"
                        );
                    } else {
                        galeriMesajGoster("Form başarıyla okundu.", "bilgi");
                    }
                    return;
                }

                const otomatikNeden = otomatikSonuc && Array.isArray(otomatikSonuc.uyarilar)
                    ? otomatikSonuc.uyarilar.filter(Boolean).join("\n")
                    : "Otomatik okuma formu doğrulayamadı.";
                galeriMesajGoster(
                    "Otomatik okuma başarısız. Köşeler otomatik aranıyor…\n" + otomatikNeden,
                    "uyari"
                );

                // ── ADIM 2: OTOMATİK KÖŞE + ELLE KÖŞE FALLBACK ─────────────────────
                // Otomatik köşe tespiti başarısız olduysa veya formu doğrulayamadıysa
                // kullanıcıdan köşeleri elle onaylaması istenir.
                console.log("[GALERI] Otomatik okuma başarısız, elle seçim açılıyor...");
                const cvKoseler = await koseleriBul(canvas);
                console.log("[GALERI] CV köşe sonucu:", cvKoseler ? JSON.stringify(cvKoseler) : "BULUNAMADI");

                if (cvKoseler) {
                    galeriMesajGoster("Sayfa köşeleri bulundu. Bu köşelerle yeniden okunuyor…");
                    const cvSonuc = await formuOkuElleKoseliVeGoster(canvas, cvKoseler, { galeri: true });
                    if (cvSonuc && cvSonuc.basarili) {
                        galeriMesajGoster(
                            cvSonuc.kontrolGerekli
                                ? "Form okundu ancak kalite kontrolü gerekli."
                                : "Form otomatik köşelerle başarıyla okundu.",
                            cvSonuc.kontrolGerekli ? "uyari" : "bilgi"
                        );
                        return;
                    }

                    const cvNeden = cvSonuc?.uyarilar?.filter(Boolean).join("\n") || "Köşe düzeltmeli okuma da başarısız oldu.";
                    galeriMesajGoster("Otomatik köşe ile okuma başarısız. Elle köşe seçebilirsiniz.\n" + cvNeden, "hata");
                } else {
                    galeriMesajGoster("Sayfa köşeleri otomatik bulunamadı. Lütfen dört köşeyi elle seçin.", "hata");
                }

                let koseler = await koseleriElleOnaylat(canvas);
                if (koseler === KOSE_SECIM_IPTAL) {
                    galeriMesajGoster("Galeri okuması iptal edildi.", "uyari");
                    return;
                }
                if (!koseler) {
                    if (!cvKoseler) {
                        galeriMesajGoster("Köşe seçilmedi; form okunamadı.", "hata");
                        return;
                    }
                    koseler = cvKoseler;
                }

                const elleSonuc = await formuOkuElleKoseliVeGoster(canvas, koseler, { galeri: true });
                if (!elleSonuc || !elleSonuc.basarili) {
                    galeriMesajGoster(
                        "Form okunamadı.\n" +
                        (elleSonuc?.uyarilar?.filter(Boolean).join("\n") || "Bilinmeyen okuma hatası."),
                        "hata"
                    );
                }
            }
        } catch (err) {
            console.error("Galeriden okuma hatası:", err);
            galeriMesajGoster("Fotoğraf okunamadı: " + err.message, "hata");
        } finally {
            input.value = "";
            _galeriIsleniyor = false;
        }
    });
}
