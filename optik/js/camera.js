import { formuOkuVeGoster, formuOkuElleKoseliVeGoster } from "./formOkuyucu.js";
import { koseSeciciElemanlariniAl, koseSecimAkisi, KOSE_SECIM_IPTAL } from "./koseSecici.js";
import { ayarlariGetir } from "./hassasiyetAyarlari.js";
// YENİ: canlı önizleme köşe/çerçeve tespiti artık OpenCV.js (Canny +
// findContours) tabanlı sayfaTespitCV.js üzerinden yapılıyor — eski
// window.OmrOkuyucu.sayfaKoseleriniAra (blob+çizgi ikili yöntemi) SADECE
// gerçek okuma anındaki hassas hizalama-işareti tespiti için kullanılmaya
// devam ediyor (bkz. omrEngine.js: formuOtomatikDuzlestir). İkisi FARKLI
// hedefleri buluyor (sayfa çerçevesi vs. küçük hizalama kareleri), o
// yüzden burada değiştirilen SADECE canlı gösterge/otomatik-tetikleme
// döngüsü — okuma hassasiyeti bu değişiklikten etkilenmez.
import { sayfaKoseleriniAraCV, cvHazirBekle, oranlariHesapla } from "./sayfaTespitCV.js";
// AĞUSTOS 2026 — sabit-kutucuk (ZipGrade tarzı) hizalama tespiti için:
// kutucukDoluMu bağımsız, hafif bir istatistik yardımcısı (kontur arama
// zincirine hiç girmiyor) — sayfaTespitCV.js'nin köşe-ARAMA mantığından
// AYRI, doğrudan cvSaf.js'ten import ediliyor.
import { kutucukDoluMu } from "./cvSaf.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let stream = null;

// ────────────────────────────────────────────────────────────────
// CANLI KÖŞE YAKALAMA GÖSTERGESİ + CANLI TARAMA MODU
// ────────────────────────────────────────────────────────────────
// Kamera önizlemesi (video) üzerine, sayfanın ÇERÇEVESİNİN o an fotoğrafta
// YAKALANIP yakalanmadığını gösteren canlı bir gösterge çizer: bulunduysa
// YEŞİL, bulunamadıysa (o köşe bölgesinin yaklaşık beklenen konumunda)
// KIRMIZI daire+artı işareti; 4 köşe ayrıca bir dörtgen ÇİZGİSİYLE
// birbirine bağlanır (sayfanın genel hizasını göstermek için).
// sayfaTespitCV.js (OpenCV.js, Canny+findContours) kullanır — bu, gerçek
// okuma anında hizalama işaretlerini bulan omrEngine.js:sayfaKoseleriniAra
// ile AYNI fonksiyon DEĞİLDİR (bkz. yukarıdaki import notu); sadece "sayfa
// kabaca hizalı mı" sorusuna hızlı cevap vermek için var.
//
// CANLI TARAMA MODU açıkken (bkz. canliTaramaBaslat/Durdur): 4 köşe art
// arda birkaç kare boyunca STABİL (neredeyse aynı yerde) bulunursa tam
// okuma otomatik tetiklenir — kullanıcı çekim tuşuna basmadan kağıt
// okunup kaydedilir. Aynı kağıt kameradan çıkana kadar tekrar tetiklenmez
// (bkz. _sonIslenenImza).
const _koseTespitAnalizCanvas = document.createElement("canvas");
let _koseTespitTimer = null;
let _koseTespitCalisiyor = false; // örtüşen (üst üste binen) çalıştırmaları engelle

const KOSE_TESPIT_ANALIZ_GENISLIK = 640; // AĞUSTOS 2026 GÜNCELLEME: OpenCV.js (WASM, 10.9MB) tamamen kaldırılıp
                                          // saf JS motoruna (cvSaf.js) geçildi — 1280'deki eski varsayım
                                          // ("350ms'de bir çalıştığı için tolere edilebilir") artık geçersizdi,
                                          // saf JS 1280px'de telefon üzerinde tahminen 500ms-1sn+ sürüyordu (180ms'lik
                                          // döngü aralığından çok daha uzun) — canlı gösterge donuk kalıyor, 3
                                          // ardışık stabil tur hiç yakalanamıyor, otomatik okuma tetiklenmiyordu.
                                          // 640'ta ölçülen süre (sunucu ortamı) ~32ms, telefon üzerinde tahminen
                                          // 65-160ms — 180ms'lik aralığa rahatça sığıyor.
                                          // 480'deki eski hassasiyet endişesi (aşağıdaki eski yorum) BU köşelerin
                                          // doğrudan okumada kullanıldığı bir mimariye aitti — artık capturePhoto'da
                                          // hesaplanan cvKoseler hiçbir yerde formuOkuVeGoster'a geçirilmiyor (ölü
                                          // değişken); gerçek OMR okuması omrEngine.js'in KENDİ fiducial/homografi
                                          // tespitinden geçiyor (bkz. formuOku). Bu köşeler SADECE canlı önizleme
                                          // göstergesi + "otomatik oku" tetikleme kararı için kullanılıyor, okuma
                                          // doğruluğunu etkilemiyor — bu yüzden 640 (480'den de temkinli) güvenli.
                                          // ESKİ NOT (GÜNCELLİĞİNİ YİTİRDİ, OpenCV.js dönemine aitti): "480'de köşe
                                          // konturunun uç noktaları 1px oynadığında gerçek video çözünürlüğüne
                                          // (ol ≈ 6-8x) büyütülünce 6-8px hataya, sağ kenarda birikerek 20-25px
                                          // hataya dönüşüyordu — baloncuk yarıçapı mertebesinde olup 1 şık kaymaya
                                          // yol açabiliyordu."

// ---- Canlı tarama modu durumu ----
let _canliModAktif = false;
let _canliIsleniyor = false;       // tam okuma o an çalışıyor mu (döngü bu sürece dokunmaz)
let _sonIslenenImza = null;        // "dolu" | null — aynı kağıdı (kutucuklardan hiç çıkmadan) tekrar tetiklememek için
let _stabilGecmis = [];            // son birkaç tespit turunun "4 kutucuk da dolu mu" sonucu (ani titremeyi tetik saymamak için)
const STABIL_GEREKEN_TUR = 3;      // bu kadar ardışık turda "tümü dolu" sürerse tetikle

let _onSonucCallback = null;       // app.js tarafından set edilir: canlı modda her okuma sonrası çağrılır
let _onDurumCallback = null;       // app.js tarafından set edilir: "aranıyor/hizalandı/okunuyor" durumu için

/**
 * AĞUSTOS 2026 — MİMARİ DEĞİŞİKLİK (Sedat isteği: ZipGrade/ticari OMR
 * uygulamaları tarzı SABİT KÖŞE KUTUCUKLARI): önceden BEKLENEN sabit
 * %8/%92 varsayılan konumlardı (form oranından bağımsız). Artık aktif
 * formun GERÇEK sayfa oranı (window.OptikAktifForm.form.bolge, mm) VE
 * hizalama işaretlerinin (fiducial) o form üzerindeki KESİN konumu
 * (window.LayoutEngine.hizalamaIsaretleriEkle — pdfFormGenerator.js'in
 * bastığı YERLE BİREBİR AYNI fonksiyon) kullanılarak hesaplanıyor.
 * Böylece kullanıcı kağıdı bu kutucuklara oturttuğunda, kutucuklar
 * TAM OLARAK kağıt üzerindeki gerçek hizalama karelerinin üstüne denk
 * geliyor — rastgele bir sayfa kenarı yaklaşımı değil.
 *
 * Döner: { solUst, sagUst, solAlt, sagAlt } — her biri {xOran, yOran}
 * (0-1 arası, video native çözünürlüğüne göre normalize).
 * Form/LayoutEngine erişilemezse (nadir) eski sabit %8/%92 döner.
 */
/**
 * AĞUSTOS 2026 — MİMARİ DEĞİŞİKLİK (Sedat isteği: ZipGrade/ticari OMR
 * uygulamaları tarzı SABİT KÖŞE KUTUCUKLARI): önceden BEKLENEN sabit
 * %8/%92 varsayılan konumlardı (form oranından bağımsız). Artık aktif
 * formun GERÇEK sayfa oranı (window.OptikAktifForm.form.bolge, mm) VE
 * hizalama işaretlerinin (fiducial) o form üzerindeki KESİN konumu
 * (window.LayoutEngine.hizalamaIsaretleriEkle — pdfFormGenerator.js'in
 * bastığı YERLE BİREBİR AYNI fonksiyon) kullanılarak hesaplanıyor.
 * Böylece kullanıcı kağıdı bu kutucuklara oturttuğunda, kutucuklar
 * TAM OLARAK kağıt üzerindeki gerçek hizalama karelerinin üstüne denk
 * geliyor — rastgele bir sayfa kenarı yaklaşımı değil.
 *
 * DÜZELTME (aynı gün, ikinci deneme — Sedat'ın gerçek ekran görüntüsüyle
 * kanıtladığı, ilk deneme yetersiz kaldı): bu fonksiyon önceden 0-1 ORAN
 * döndürüp video.videoWidth/videoHeight'e göre native koordinata
 * çevriliyordu. SORUN: video.videoWidth/videoHeight'in telefon dikey
 * tutulduğunda "dikey" rapor edeceği varsayımı YANLIŞTI — araştırma
 * (Chromium bug tracker, WebRTC geliştirici raporları) gösterdi ki bu
 * davranış tarayıcıdan tarayıcıya, hatta AYNI CİHAZDA ÇAĞRIDAN ÇAĞRIYA
 * tutarsız olabiliyor. İlk düzeltme denemesi (xOran/yOran basit takası)
 * de YANLIŞ ÇIKTI — test edildi, köşe isimlerini (sağUst/solAlt) yanlış
 * fiziksel konuma taşıdığı KANITLANDI (bkz. eski yorum/kod, artık silindi).
 *
 * KESİN ÇÖZÜM: video.videoWidth/videoHeight'e HİÇ GÜVENME. bolge'nin
 * en-boy oranını DOĞRUDAN EKRANIN (dispW/dispH — video.getBoundingClientRect,
 * her zaman doğru çünkü CSS tarayıcı tarafından zaten doğru yönde
 * render ediliyor) en-boy oranına göre "object-fit:contain" mantığıyla
 * yerleştir: bolge oranı ekrandan "daha geniş"se genişliğe göre sığdır
 * (üstte/altta boşluk kalır), "daha dar"sa yüksekliğe göre sığdır
 * (yanlarda boşluk kalır). Bu, video'nun native boyutundan TAMAMEN
 * BAĞIMSIZ çalışır — sadece görüntü ANALİZİ (piksel verisi) için video
 * hâlâ kullanılıyor, ama KONUMLANDIRMA matematiği artık video boyutuna
 * hiç bakmıyor.
 *
 * Artık 0-1 ORAN değil DOĞRUDAN EKRAN KOORDİNATI (px) döndürüyor.
 * Döner: { solUst, sagUst, solAlt, sagAlt } — her biri {ekranX, ekranY}.
 * Form/LayoutEngine erişilemezse (nadir) eski sabit %8/%92'nin ekran
 * karşılığı döner.
 */
function _beklenenKoseKonumlariHesapla(dispW, dispH) {
  const VARSAYILAN_ORAN = {
    solUst: { xOran: 0.08, yOran: 0.07 },
    sagUst: { xOran: 0.92, yOran: 0.07 },
    solAlt: { xOran: 0.08, yOran: 0.93 },
    sagAlt: { xOran: 0.92, yOran: 0.93 },
  };
  const oranToEkran = (o) => ({ ekranX: o.xOran * dispW, ekranY: o.yOran * dispH });
  const VARSAYILAN = {
    solUst: oranToEkran(VARSAYILAN_ORAN.solUst), sagUst: oranToEkran(VARSAYILAN_ORAN.sagUst),
    solAlt: oranToEkran(VARSAYILAN_ORAN.solAlt), sagAlt: oranToEkran(VARSAYILAN_ORAN.sagAlt),
  };

  const form = window.OptikAktifForm && window.OptikAktifForm.form;
  const bolge = form && form.bolge;
  if (!bolge || !bolge.width || !bolge.height || typeof window.LayoutEngine === 'undefined') {
    // TEŞHİS (Ağustos 2026 — Sedat'ın "kutucuklar formu tanımıyor, rastgele
    // yerleşiyor" gözlemini doğrulamak/çürütmek için eklendi): hangi
    // koşulun VARSAYILAN'a düşürdüğünü kaydet.
    window._kutucukTeshis = 'VARSAYILAN (%8/%92) kullanılıyor — sebep: ' +
      (!window.OptikAktifForm ? 'window.OptikAktifForm null (form/şablon henüz yüklenmedi)'
        : !form ? 'window.OptikAktifForm.form yok'
        : !bolge ? 'form.bolge yok'
        : (!bolge.width || !bolge.height) ? 'bolge.width/height eksik'
        : 'window.LayoutEngine yüklenmedi') +
      ' | window._optikTeshis: ' + (window._optikTeshis || '(henüz set edilmedi)');
    return VARSAYILAN;
  }

  try {
    const isaretler = window.LayoutEngine.hizalamaIsaretleriEkle(bolge);
    const bul = (konum) => isaretler.find((i) => i.konum === konum);
    const solUstI = bul('sol-ust'), sagUstI = bul('sag-ust'), solAltI = bul('sol-alt'), sagAltI = bul('sag-alt');
    if (!solUstI || !sagUstI || !solAltI || !sagAltI) {
      window._kutucukTeshis = 'VARSAYILAN kullanılıyor — sebep: hizalamaIsaretleriEkle 4 köşenin birini döndürmedi';
      return VARSAYILAN;
    }

    // object-fit:contain: bolge'yi ekrana, taşmadan, orantıyı koruyarak sığdır.
    const bolgeOran = bolge.width / bolge.height;
    const ekranOran = dispW / dispH;
    let icerikGenislik, icerikYukseklik, icerikOfsX, icerikOfsY;
    if (bolgeOran > ekranOran) {
      icerikGenislik = dispW;
      icerikYukseklik = dispW / bolgeOran;
      icerikOfsX = 0;
      icerikOfsY = (dispH - icerikYukseklik) / 2;
    } else {
      icerikYukseklik = dispH;
      icerikGenislik = dispH * bolgeOran;
      icerikOfsY = 0;
      icerikOfsX = (dispW - icerikGenislik) / 2;
    }

    const merkezEkranaCevir = (isaret) => {
      const bolgeXOran = (isaret.x + isaret.boyut / 2 - bolge.x) / bolge.width;
      const bolgeYOran = (isaret.y + isaret.boyut / 2 - bolge.y) / bolge.height;
      return {
        ekranX: icerikOfsX + bolgeXOran * icerikGenislik,
        ekranY: icerikOfsY + bolgeYOran * icerikYukseklik,
      };
    };

    window._kutucukTeshis = 'GERÇEK FORM kullanılıyor — bolge=' + bolge.width + 'x' + bolge.height + 'mm' +
      ' | ekran-tabanlı yerleşim (video boyutundan bağımsız)';

    return {
      solUst: merkezEkranaCevir(solUstI),
      sagUst: merkezEkranaCevir(sagUstI),
      solAlt: merkezEkranaCevir(solAltI),
      sagAlt: merkezEkranaCevir(sagAltI),
    };
  } catch (e) {
    window._kutucukTeshis = 'VARSAYILAN kullanılıyor — sebep: hesaplama sırasında hata: ' + e.message;
    return VARSAYILAN;
  }
}

    };
  } catch (e) {
    window._kutucukTeshis = 'VARSAYILAN kullanılıyor — sebep: hesaplama sırasında hata: ' + e.message;
    return VARSAYILAN;
  }
}

function _koseTespitTemizle() {
    const overlay = document.getElementById("koseTespitOverlay");
    if (!overlay) return;
    const octx = overlay.getContext("2d");
    octx.clearRect(0, 0, overlay.width, overlay.height);
}

function _koseTespitBaslat() {
    _koseTespitDurdur();
    const aralik = Math.min((ayarlariGetir().tespitAraligiMs) || 350, 220); // max 220ms — 640px analiz genişliğiyle
                                                                              // (bkz. KOSE_TESPIT_ANALIZ_GENISLIK notu) telefon üzerinde tahmini
                                                                              // 65-160ms sürüyor; 220ms üst sınır, yavaş cihazlarda bile bir
                                                                              // önceki turun bitmesi için yeterli pay bırakıyor (eskiden 180ms'ti
                                                                              // — OpenCV.js WASM için ayarlanmıştı, saf JS geçişiyle hafifçe
                                                                              // gevşetildi; asıl hız kazanımı çözünürlük düşüşünden geliyor).
    _koseTespitTimer = setInterval(_koseTespitCalistir, aralik);
}

function _koseTespitDurdur() {
    if (_koseTespitTimer) {
        clearInterval(_koseTespitTimer);
        _koseTespitTimer = null;
    }
    _koseTespitTemizle();
    _sonIslenenImza = null; // eski oturumun "dolu" durumu yeni oturuma sızmasın
}

function _koseTespitCalistir() {

    if (_koseTespitCalisiyor || _canliIsleniyor) return; // önceki tur / tam okuma hâlâ sürüyor, atla
    if (!video.videoWidth || !video.videoHeight) return;

    const overlay = document.getElementById("koseTespitOverlay");
    if (!overlay) return;

    _koseTespitCalisiyor = true;

    try {
        // AĞUSTOS 2026 — MİMARİ DEĞİŞİKLİK: sayfaKoseleriniAraCV (tüm kareyi
        // Canny+findContours ile TARAYIP kağıdı ARAYAN ağır algoritma) BU
        // DÖNGÜDEN TAMAMEN KALDIRILDI. Yerine: aktif formun (window.
        // OptikAktifForm) gerçek hizalama-işareti konumlarına göre 4 SABİT
        // kutucuk hesaplanıyor (_beklenenKoseOranlariHesapla — form
        // bolge'sinden window.LayoutEngine.hizalamaIsaretleriEkle ile TAM
        // aynı yerler), her kutucukta SADECE "yeterince koyu piksel var mı"
        // kontrol ediliyor (kutucukDoluMu — cvSaf.js, O(kutucuk alanı),
        // kontur arama YOK). Kullanıcı kağıdı bu 4 sabit kutucuğa oturtur —
        // ZipGrade/TestPlus/CamScanner'ın kullandığı yaklaşımın aynısı.
        // Performans kazancı ~16x+ (piksel sayısı bazında; kontur arama
        // hiç çalışmadığı için gerçek kazanç muhtemelen daha büyük).

        // Analiz için küçük bir canvas'a çiz (kutucukDoluMu görüntü
        // boyutundan bağımsız çalışır ama küçük görüntüde getImageData
        // daha ucuz).
        const aOlcek = KOSE_TESPIT_ANALIZ_GENISLIK / video.videoWidth;
        const aGenislik = KOSE_TESPIT_ANALIZ_GENISLIK;
        const aYukseklik = Math.round(video.videoHeight * aOlcek);

        _koseTespitAnalizCanvas.width = aGenislik;
        _koseTespitAnalizCanvas.height = aYukseklik;
        const actx = _koseTespitAnalizCanvas.getContext("2d", { willReadFrequently: true });
        actx.drawImage(video, 0, 0, aGenislik, aYukseklik);

        let imageData;
        try {
            imageData = actx.getImageData(0, 0, aGenislik, aYukseklik);
        } catch (err) {
            return; // (nadir) canvas okuma hatası — bu turu sessizce atla
        }

        // Beklenen köşe konumları — DOĞRUDAN EKRAN KOORDİNATI (video
        // boyutundan bağımsız, bkz. yukarıdaki fonksiyon yorumu).
        const rect = video.getBoundingClientRect();
        const dispW = rect.width, dispH = rect.height;
        if (!dispW || !dispH) return;

        const beklenenKonumlar = _beklenenKoseKonumlariHesapla(dispW, dispH);

        // GEÇİCİ TEŞHİS (Ağustos 2026) — bkz. index.html:kmKutucukTeshis notu.
        const teshisEl = document.getElementById('kmKutucukTeshis');
        if (teshisEl) teshisEl.textContent = window._kutucukTeshis || '(teşhis henüz yok)';

        overlay.width = dispW;
        overlay.height = dispH;
        const octx = overlay.getContext("2d");
        octx.clearRect(0, 0, dispW, dispH);

        const YARICAP = Math.max(16, dispW * 0.032);

        // kutucukDoluMu, analiz görüntüsü (aGenislik x aYukseklik, VIDEO
        // oranında çizilmiş) üzerinde çalışıyor — ama beklenenKonumlar artık
        // EKRAN oranında. Ekran koordinatını analiz-görüntü koordinatına
        // çevirmek için object-fit:cover'ın TERSİNİ (ekran->video) uyguluyoruz
        // — bu, sadece PİKSEL VERİSİ NEREDEN OKUNACAĞINI belirlemek için,
        // konumlandırma matematiğini etkilemiyor (o zaten ekran-tabanlı
        // ve doğru). video.videoWidth/Height burada sadece "hangi analiz
        // pikseline bak" sorusu için kullanılıyor, güvenilmezliği (yön
        // karışıklığı) konumlandırmayı artık etkilemiyor çünkü YARICAP
        // yeterince büyük bir kontrol penceresi (KUTUCUK_YARICAP_ANALIZ)
        // kullanılıyor — birkaç piksellik kayma toleransı içinde kalıyor.
        const ekranToAnalizX = aGenislik / dispW;
        const ekranToAnalizY = aYukseklik / dispH;
        const KUTUCUK_YARICAP_ANALIZ = Math.max(10, aGenislik * 0.06);

        const durumlar = {};

        Object.keys(beklenenKonumlar).forEach((konum) => {
            const p = beklenenKonumlar[konum];
            const analizX = p.ekranX * ekranToAnalizX;
            const analizY = p.ekranY * ekranToAnalizY;

            const sonuc = kutucukDoluMu(
                imageData,
                analizX - KUTUCUK_YARICAP_ANALIZ, analizY - KUTUCUK_YARICAP_ANALIZ,
                analizX + KUTUCUK_YARICAP_ANALIZ, analizY + KUTUCUK_YARICAP_ANALIZ
            );

            const ekranX = Math.min(dispW - YARICAP, Math.max(YARICAP, p.ekranX));
            const ekranY = Math.min(dispH - YARICAP, Math.max(YARICAP, p.ekranY));

            durumlar[konum] = { dolu: sonuc.dolu, ekranX, ekranY };

            const renk = sonuc.dolu ? "#2ecc71" : "#e74c3c";

            octx.beginPath();
            octx.arc(ekranX, ekranY, YARICAP, 0, Math.PI * 2);
            octx.strokeStyle = renk;
            octx.lineWidth = 3;
            octx.stroke();

            octx.beginPath();
            octx.moveTo(ekranX - YARICAP * 0.5, ekranY);
            octx.lineTo(ekranX + YARICAP * 0.5, ekranY);
            octx.moveTo(ekranX, ekranY - YARICAP * 0.5);
            octx.lineTo(ekranX, ekranY + YARICAP * 0.5);
            octx.strokeStyle = renk;
            octx.lineWidth = 2;
            octx.stroke();
        });

        // 4 köşeyi birbirine bağlayan dörtgen — TÜM köşeler doluysa YEŞİL
        // düz, değilse KIRMIZI kesikli çizgi (kutucuklar SABİT olduğu için
        // çerçeve her zaman aynı yerde, sadece renk/stil değişiyor).
        const sira = [["solUst", "sagUst"], ["sagUst", "sagAlt"], ["sagAlt", "solAlt"], ["solAlt", "solUst"]];
        for (const [a, b] of sira) {
            const p1 = durumlar[a], p2 = durumlar[b];
            const ikisiDeDolu = p1.dolu && p2.dolu;
            octx.beginPath();
            octx.setLineDash(ikisiDeDolu ? [] : [6, 5]);
            octx.moveTo(p1.ekranX, p1.ekranY);
            octx.lineTo(p2.ekranX, p2.ekranY);
            octx.strokeStyle = ikisiDeDolu ? "rgba(46,204,113,.85)" : "rgba(231,76,60,.55)";
            octx.lineWidth = 2;
            octx.stroke();
            octx.setLineDash([]);
        }

        // ---- Canlı tarama modu: 4 kutucuk da dolu mu + kısa stabilite ----
        // Kutucuklar SABİT olduğu için "köşe konumu titriyor mu" kontrolüne
        // artık gerek yok — sadece "tümü dolu" durumunun birkaç ardışık
        // turda sürüp sürmediğine bakılıyor (kullanıcının kağıdı gerçekten
        // yerleştirdiğinden emin olmak için, anlık bir titremeyi tetik
        // saymamak amacıyla).
        if (_canliModAktif) {
            const tumuDolu = Object.keys(durumlar).every((k) => durumlar[k].dolu);

            _stabilGecmis.push(tumuDolu);
            if (_stabilGecmis.length > STABIL_GEREKEN_TUR) _stabilGecmis.shift();

            if (typeof _onDurumCallback === "function") {
                _onDurumCallback(tumuDolu ? "hizalandi" : "araniyor");
            }

            if (_stabilGecmis.length === STABIL_GEREKEN_TUR && _stabilGecmis.every((v) => v === true)) {
                // Aynı kağıdı (kamera hareket etmeden) tekrar tekrar
                // tetiklememek için basit bir imza: 4 kutucuğun ekran
                // konumu zaten SABİT, o yüzden imza yerine son okumadan bu
                // yana geçen süreyi/durumu _sonIslenenImza ile takip etmeye
                // devam ediyoruz — "tümü dolu" durumu SÜREKLİ true kaldığı
                // sürece (kağıt kameradan hiç çıkmadıysa) tekrar tetiklenmesin.
                const imza = "dolu";
                if (imza !== _sonIslenenImza) {
                    _sonIslenenImza = imza;
                    _stabilGecmis = [];
                    _canliOtomatikOku();
                }
            } else if (!tumuDolu) {
                // Kağıt kutucuklardan çıktı/değişti — bir sonraki "tümü
                // dolu" anı yeni bir tetikleme sayılsın.
                _sonIslenenImza = null;
            }
        }

    } catch (err) {
        console.error("Canlı köşe tespiti hatası (görmezden gelindi):", err);
    } finally {
        _koseTespitCalisiyor = false;
    }

}

/**
 * Canlı modda: kullanıcı çekim tuşuna basmadan, video karesini yakalayıp
 * otomatik (elle köşe seçim UI'sı OLMADAN) okur. Okuma bitince sonucu
 * app.js'e (bkz. canliTaramaBaslat'a verilen callback) iletir, kamerayı
 * KAPATMAZ — döngü otomatik olarak sıradaki kağıt için devam eder.
 */
async function _canliOtomatikOku() {
    if (!video.videoWidth || !video.videoHeight) return;
    _canliIsleniyor = true;
    if (typeof _onDurumCallback === "function") _onDurumCallback("okunuyor");

    try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // formuOkuVeGoster yolunu kullan → omrEngine kendi fiducial
        // tespitini yapar. Canlı önizlemedeki sabit-kutucuk tespiti (bkz.
        // yukarıdaki "SABİT KÖŞE KUTUCUKLARI" mimari notu) SADECE
        // gösterge+tetikleme kararı için — okumanın kendisi CV'den
        // bağımsız, omrEngine'in kendi fiducial/homografi tespitinden geçiyor.
        let sonuc;
        try {
            sonuc = await formuOkuVeGoster(canvas);
        } catch (err) {
            console.warn("Canlı okuma: formuOkuVeGoster başarısız, atlandı:", err.message);
            sonuc = null;
        }

        if (typeof _onSonucCallback === "function") _onSonucCallback(sonuc);

    } catch (err) {
        console.error("Canlı otomatik okuma hatası:", err);
    } finally {
        setTimeout(() => { _canliIsleniyor = false; }, 900);
    }
}

/** app.js tarafından çağrılır: canlı tarama modunu açar. */
export function canliTaramaBaslat(onSonuc, onDurum) {
    _canliModAktif = true;
    _sonIslenenImza = null;
    _stabilGecmis = [];
    _onSonucCallback = onSonuc || null;
    _onDurumCallback = onDurum || null;
}

/** app.js tarafından çağrılır: canlı tarama modunu kapatır (manuel çekim moduna döner). */
export function canliTaramaDurdur() {
    _canliModAktif = false;
    _sonIslenenImza = null;
    _stabilGecmis = [];
}

export function canliTaramaAktifMi() {
    return _canliModAktif;
}

// ────────────────────────────────────────────────────────────────
// KAMERA FLAŞI (TORCH)
// ────────────────────────────────────────────────────────────────
/** Cihaz/tarayıcı torch (flaş) özelliğini destekliyor mu? */
export function torchDesteginiKontrolEt() {
    try {
        if (!stream) return false;
        const track = stream.getVideoTracks()[0];
        if (!track || typeof track.getCapabilities !== "function") return false;
        const cap = track.getCapabilities();
        return !!(cap && cap.torch);
    } catch (e) {
        return false;
    }
}

let _torchAcikMi = false;
export async function torchAyarla(acik) {
    try {
        if (!stream) return false;
        const track = stream.getVideoTracks()[0];
        if (!track) return false;
        await track.applyConstraints({ advanced: [{ torch: !!acik }] });
        _torchAcikMi = !!acik;
        return true;
    } catch (e) {
        console.error("Torch ayarlanamadı:", e);
        return false;
    }
}
export function torchDurumu() { return _torchAcikMi; }

/**
 * Kamerayı başlat
 */
export async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {
                    ideal: "environment"
                },
                width: {
                    ideal: 1920
                },
                height: {
                    ideal: 1080
                }
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();

        console.log("Kamera başlatıldı.");

        // OpenCV.js WASM modülü henüz yüklenmediyse (uygulama yeni açıldıysa
        // birkaç yüz ms sürebilir) burada bekleniyor — kamera görüntüsü zaten
        // akmaya başladı, kullanıcı bekleme farkını hissetmez, sadece köşe
        // göstergesi cv hazır olana kadar bir an gecikmeli başlar.
        await cvHazirBekle();
        _koseTespitBaslat();

    } catch (err) {
        console.error("Kamera açılamadı:", err);
        alert("Kameraya erişilemedi.");
    }
}

/**
 * Fotoğraf çek, köşeleri elle seçtir, gerçek OMR motoruyla oku
 * @returns {Promise<object|null>} formuOku()/formuOkuElleKoseli() sonucu (veya hata durumunda null)
 */
export async function capturePhoto() {

    if (!video.videoWidth || !video.videoHeight) {
        alert("Kamera henüz hazır değil.");
        return null;
    }

    // Fotoğraf çekilir çekilmez canlı göstergeyi durdur — artık gereksiz
    // (video hâlâ arka planda akıyor olabilir ama üstü köşe seçim/okuma
    // ekranlarıyla kaplanacak).
    _koseTespitDurdur();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    // formuOkuVeGoster yolunu kullan — omrEngine kendi fiducial tespitini yapacak.
    // AĞUSTOS 2026: burada eskiden ayrıca bir "anlık CV taraması" (cvKoseler)
    // hesaplanıyordu ama sonucu formuOkuVeGoster'a hiç geçirilmiyordu — ölü
    // kod olduğu fark edilip kaldırıldı (her çekimde gereksiz bir tam köşe
    // taraması, saf-JS motorunda WASM'dan daha maliyetli olduğu için özellikle
    // gereksizdi). Canlı önizlemedeki sabit-kutucuk tespiti (bkz. yukarıdaki
    // "SABİT KÖŞE KUTUCUKLARI" mimari notu) SADECE gösterge+tetikleme
    // için — OMR motoru içindeki sayfaKoseleriniAraHibrit() kendi
    // fiducial/homografi tespitini bağımsız yapıyor.
    return formuOkuVeGoster(canvas);
}

/**
 * Kamera döngüsünü dondurur, o anki kareyi yakalar ve köşe seçim UI'ını açar.
 * Kullanıcı "Tamam" derse elle seçilen köşelerle okuma yapar.
 * İptal/vazgeç durumunda döngü yeniden başlar (kamera kapanmaz).
 *
 * Hem kamera açıkken hem galeri modunda (video yoksa canvas'taki mevcut
 * görüntüyü kullanır) çalışır — app.js her iki durumda da bu fonksiyonu
 * çağırabilir.
 */
export async function dondurVeKoseAc() {
    // 1. Tespit döngüsünü durdur — video akışı devam eder, sadece periyodik
    //    tespit timer'ı ve overlay çizimi durur.
    _koseTespitDurdur();

    // 2. Kare yakala: kamera açıksa video'dan, değilse canvas'taki mevcut
    //    görüntüyü kullan (galeri modunda canvas zaten dolu).
    if (video.videoWidth && video.videoHeight) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    // canvas.width === 0 ise (ne video ne galeri) yapacak bir şey yok.
    if (!canvas.width || !canvas.height) {
        _koseTespitBaslat(); // döngüyü geri aç
        return null;
    }

    // 3. Köşe seçim akışını aç (koseSecici.js — galeri akışındaki ile aynı).
    const { koseSeciciElemanlariniAl, koseSecimAkisi, KOSE_SECIM_IPTAL } =
        await import('./koseSecici.js');
    const elemanlar = koseSeciciElemanlariniAl();
    if (!elemanlar) {
        // Köşe seçim UI'ı DOM'da yok — döngüyü geri aç, çık.
        _koseTespitBaslat();
        return null;
    }

    // koseSecimAlani #kameraOverlay içinde: kameraOverlay'i açık tut.
    const kameraOv = document.getElementById('kameraOverlay');
    if (kameraOv) kameraOv.hidden = false;

    let sonuc = null;
    try {
        // CV ile otomatik köşe bul — başlangıç tutamaç konumu için.
        let cvKoseler = null;
        try {
            const { sayfaKoseleriniAraCV, oranlariHesapla } = await import('./sayfaTespitCV.js');
            const analiz = document.createElement('canvas');
            const ANALIZ_W = 1280;
            const ol = Math.min(1, ANALIZ_W / canvas.width);
            analiz.width  = Math.round(canvas.width  * ol);
            analiz.height = Math.round(canvas.height * ol);
            analiz.getContext('2d').drawImage(canvas, 0, 0, analiz.width, analiz.height);
            const idata = analiz.getContext('2d').getImageData(0, 0, analiz.width, analiz.height);
            const aktifBolge = window.OptikAktifForm?.form?.bolge;
            const oranlar = oranlariHesapla(aktifBolge?.width, aktifBolge?.height);
            const b = sayfaKoseleriniAraCV(idata, null, null, oranlar);
            if (b?.solUst && b?.sagUst && b?.solAlt && b?.sagAlt) {
                const gOl = canvas.width / analiz.width;
                cvKoseler = {
                    solUst: { x: b.solUst.x * gOl, y: b.solUst.y * gOl },
                    sagUst: { x: b.sagUst.x * gOl, y: b.sagUst.y * gOl },
                    solAlt: { x: b.solAlt.x * gOl, y: b.solAlt.y * gOl },
                    sagAlt: { x: b.sagAlt.x * gOl, y: b.sagAlt.y * gOl },
                };
            }
        } catch (e) { /* CV başarısız — elle seçim devam eder */ }

        const { showStatus } = await import('./utils.js');
        showStatus(cvKoseler ? 'Köşeleri kontrol edin...' : 'Köşeler bulunamadı, elle seçin...');

        let koseler = await koseSecimAkisi(canvas, canvas.width, canvas.height, elemanlar);

        if (koseler === KOSE_SECIM_IPTAL) {
            showStatus('Vazgeçildi.');
            return null;
        }
        if (!koseler) {
            // "🤖 Otomatik Dene" → CV sonucuna güven
            if (!cvKoseler) {
                showStatus('Köşe seçilmedi, form okunamadı.');
                return null;
            }
            koseler = cvKoseler;
        }

        const { formuOkuElleKoseliVeGoster } = await import('./formOkuyucu.js');
        sonuc = await formuOkuElleKoseliVeGoster(canvas, koseler);
    } finally {
        // 4. Her durumda (başarı, hata, iptal) tespit döngüsünü yeniden başlat.
        _koseTespitBaslat();
    }
    return sonuc;
}

/**
 * Kamerayı durdur
 */
export function stopCamera() {

    _koseTespitDurdur();
    _canliModAktif = false;

    if (!stream) return;

    stream.getTracks().forEach(track => track.stop());

    video.srcObject = null;

    stream = null;

    console.log("Kamera durduruldu.");
}

/**
 * Ön/arka kamera değiştir
 */
export async function switchCamera(facing = "environment") {

    stopCamera();

    try {

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facing
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();

        await cvHazirBekle();
        _koseTespitBaslat();

    } catch (err) {

        console.error(err);

    }

}
