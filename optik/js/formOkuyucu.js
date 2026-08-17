// js/formOkuyucu.js
//
// Kamera ile çekilen kareyi doğrudan gerçek OMR motoruna (LayoutEngine +
// OmrOkuyucu) veren köprü. OpenCV.js YOK — kağıt tespiti/perspektif
// düzeltmesi burada gerekmiyor, çünkü OmrOkuyucu.formuOku() zaten QR
// kodun 4 köşesinden kaba bir homografi, sonra hizalama işaretlerinden
// (fiducial marker) hassas bir homografi çıkarıp kendi düzeltmesini
// yapıyor (bkz. omrEngine.js).
//
// Bu dosya sadece: 1) okunacak "form" şablonunu (LayoutEngine ile) kurar,
// 2) canvas'ı OmrOkuyucu.formuOku()'ya verir, 3) sonucu ekrana yansıtır.

import { showStatus } from "./utils.js";

/**
 * Düzeltilmiş (dewarp edilmiş) kağıt görüntüsünü localStorage'a kaydedilecek
 * kadar küçültüp JPEG'e sıkıştırır. Amaç: her taranan kağıdın "sonuca
 * tıklayınca görüntüle + gerekirse elle düzelt" akışında kullanılmak üzere
 * saklanabilmesi — ama tam çözünürlükte onlarca/yüzlerce kağıt saklamak
 * localStorage kotasını (~5-10MB) hızla doldurur, bu yüzden küçültülüyor.
 *
 * Döndürdüğü "olcek" değeri, aynı küçültmenin baloncuk koordinatlarına da
 * (bkz. _baloncukNoktalariniOlcekle) uygulanabilmesi için — böylece
 * "Resim" sekmesinde küçültülmüş görüntünün ÜZERİNE doğru piksel
 * konumunda renkli daire çizilebiliyor.
 * @param {HTMLCanvasElement} canvas
 * @param {number} maxGenislik
 * @param {number} kalite - 0..1 arası JPEG kalitesi
 * @returns {{dataUrl: string|null, olcek: number}}
 */
function _kucukGoruntuVeOlcekUret(canvas, maxGenislik = 900, kalite = 0.55) {
    try {
        let kaynak = canvas;
        let olcek = 1;
        if (canvas.width > maxGenislik) {
            olcek = maxGenislik / canvas.width;
            const kucukCanvas = document.createElement("canvas");
            kucukCanvas.width = maxGenislik;
            kucukCanvas.height = Math.round(canvas.height * olcek);
            kucukCanvas.getContext("2d").drawImage(canvas, 0, 0, kucukCanvas.width, kucukCanvas.height);
            kaynak = kucukCanvas;
        }
        return { dataUrl: kaynak.toDataURL("image/jpeg", kalite), olcek };
    } catch (err) {
        console.error("Kağıt görüntüsü sıkıştırılamadı (kayıt görüntüsüz devam edecek):", err);
        return { dataUrl: null, olcek: 1 };
    }
}

/**
 * omrEngine.js'in her BALONCUK için ürettiği tam piksel örnekleme
 * noktalarını (sonuc.hataAyiklama.ornekNoktalari — tam çözünürlüklü
 * duzCanvas'a göre), kaydedilen (küçültülmüş) kağıt görüntüsünün
 * ölçeğine indirger. Kaydedilen sonuç, "Resim" sekmesinde her baloncuğun
 * üstüne yeşil/kırmızı/sarı renkli daire çizmek için kullanılır (bkz.
 * app.js ogrDetayResimCiz()).
 * @param {Array|null} ornekNoktalari
 * @param {number} olcek
 * @returns {Array|null}
 */
function _baloncukNoktalariniOlcekle(ornekNoktalari, olcek) {
    if (!ornekNoktalari || !ornekNoktalari.length) return null;
    return ornekNoktalari.map((soru) => ({
        ders: soru.ders,
        soruNo: soru.soruNo,
        sikler: soru.sikler.map((s) => ({
            harf: s.harf,
            x: Math.round(s.px * olcek),
            y: Math.round(s.py * olcek),
            r: Math.max(4, Math.round(s.pr * olcek)),
        })),
    }));
}

/**
 * Sayfadaki "Sınav Türü" seçimine (ve varsa soru/şık sayısı girdilerine)
 * göre okunacak form şablonunu kurar. İlgili elemanlar bulunamazsa
 * (ör. eski bir index.html) LGS'ye düşer.
 *
 * KÖK NEDEN DÜZELTMESİ (Ağustos 2026, Sedat'ın "Bu formların okunması nasıl
 * olacak" sorusu üzerine bulundu): #sinavTuru seçim kutusu index.html'de
 * HİÇ VAR OLMAMIŞ — yani gerçek sınav akışında (galeriden/kameradan tarama)
 * bu fonksiyon HER ZAMAN sessizce "lgs"ye düşüyordu; aktif sınav Bursluluk,
 * sabit-Özel veya editörle tasarlanmış özel bir şablon olsa bile. app.js
 * artık her taramadan önce window.OptikAktifForm köprüsünü aktif sınavın
 * GERÇEK formuyla dolduruyor (bkz. app.js: _optikAktifFormGuncelle) — bu
 * köprü varsa öncelikli kullanılır. Yoksa (bağımsız/eski test sayfası
 * senaryosu) eski DOM tabanlı yol yedek olarak kalıyor.
 * @returns {{form: object, sinavTuru: string}}
 */
function testFormunuOlustur(sourceCanvas = null, okumaOpsiyonlari = {}) {

    const dbg2 = (msg) => {
        const el = document.getElementById('sonucKutusu');
        if (el) { el.style.display = 'block'; el.textContent = (el.textContent || '') + '\n' + msg; }
    };

    if (window.OptikAktifForm && window.OptikAktifForm.form) {
        dbg2('✓ OptikAktifForm VAR: ' + window.OptikAktifForm.sinavTuru);

        // v34: Galeriden eski yatay LGS cevap kağıdı içe aktarıldığında
        // aktif yeni/dikey LGS şablonuyla zorla okumaya çalışma. Görüntü
        // oranı yataysa eski yatay koordinat modelini yalnız bu okuma için seç.
        const oran = sourceCanvas && sourceCanvas.height ? sourceCanvas.width / sourceCanvas.height : 0;
        if (okumaOpsiyonlari.galeri === true &&
            window.OptikAktifForm.sinavTuru === 'lgs' &&
            oran > 1.18 &&
            window.LayoutEngine &&
            typeof window.LayoutEngine.lgsYatayEskiSablonuOlustur === 'function') {
            const eski = window.LayoutEngine.lgsYatayEskiSablonuOlustur();
            dbg2('↔ Galeri yatay LGS algılandı; eski yatay LGS şablonu kullanılıyor. oran=' + oran.toFixed(3));
            return { form: eski.formlar[0], sinavTuru: 'lgs', eskiYatayLgs: true };
        }
        return window.OptikAktifForm;
    }

    dbg2('✗ OptikAktifForm YOK. _optikTeshis: ' + (window._optikTeshis || 'yok'));

    const sinavTuruEl = document.getElementById('sinavTuru');
    const sinavTuru = sinavTuruEl ? sinavTuruEl.value : null;
    dbg2('sinavTuru: ' + sinavTuru);

    if (!sinavTuru || sinavTuru === 'lgs' || sinavTuru === 'bursluluk') {
        // Standart şablon — LayoutEngine ile derle
        const secenekler = { sinavTuru: sinavTuru || 'lgs' };
        if (sinavTuru === 'ozel') {
            const soruSayisiInput = document.getElementById('soruSayisi');
            const sikSayisiInput = document.getElementById('sikSayisi');
            secenekler.soruSayisi = soruSayisiInput ? parseInt(soruSayisiInput.value, 10) || 20 : 20;
            secenekler.sikSayisi = sikSayisiInput ? parseInt(sikSayisiInput.value, 10) || 4 : 4;
        }
        const layout = window.LayoutEngine.layoutHesapla(secenekler);
        return { form: layout.formlar[0], sinavTuru: sinavTuru || 'lgs' };
    }

    // Özel tasarım şablonu ama OptikAktifForm set edilmemiş — hata
    throw new Error(
        'Optik form yüklenemedi (window.OptikAktifForm boş). ' +
        'Sınav detayına gidip tekrar taramayı deneyin. ' +
        'SinavTuru: ' + sinavTuru
    );
}

/**
 * Okunan kağıdın FORM KODU'nun (bkz. layoutEngine.js: FORM_KODU_HARFLERI,
 * omrEngine.js: formKoduOku), o an aktif olan sınavın BEKLEDİĞİ form
 * koduyla eşleşip eşleşmediğini doğrular. Eşleşmiyorsa okumayı
 * BAŞARISIZ sayar — amaç, seçili sınavdan farklı bir optik form kağıdının
 * (ör. Bursluluk sınavı açıkken bir LGS kağıdının) yanlışlıkla o sınava
 * ait gibi okunup kaydedilmesini engellemek.
 *
 * `formKodu` okunamadıysa (null — eski/uyumsuz bir şablonla üretilmiş
 * kağıt) doğrulama ATLANIR, geriye dönük uyumluluk için okuma kabul edilir.
 */
function formKoduDogrula(sonuc, sinavTuru) {
    if (!sonuc || !sonuc.basarili || !sonuc.formKodu) return sonuc;

    const beklenen = window.LayoutEngine.formKoduHarfiGetir(sinavTuru);

    if (sonuc.formKodu !== beklenen) {
        sonuc.basarili = false;
        sonuc.uyarilar = [
            'Bu kağıt seçili sınavın optik formuyla eşleşmiyor (başka bir sınava/form türüne ait olabilir). ' +
            'Doğru sınavı seçtiğinizden ve doğru kağıdı taradığınızdan emin olun.',
            ...(sonuc.uyarilar || []),
        ];
    }

    return sonuc;
}

/**
 * Kamera canvas'ını okur, sonucu resultCanvas + status alanına yazar.
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {Promise<object>} OmrOkuyucu.formuOku() sonucu
 */

/**
 * v32 — FORM KALİTE KARAR MOTORU
 * Geometri + bubble + öğrenci no + görüntü uyarılarını tek 0..100 skorda birleştirir.
 * Bu katman OMR motorunun ham cevabını değiştirmez; yalnızca otomatik kayıt kararını verir.
 */
function formKalitesiniHesapla(sonuc) {
    const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(Number(v)) ? Number(v) : 0));
    const cevaplar = Array.isArray(sonuc?.cevaplar) ? sonuc.cevaplar : [];
    const uyarilar = Array.isArray(sonuc?.uyarilar) ? sonuc.uyarilar : [];

    const hizalama = clamp01(
        typeof sonuc?.hizalamaGuveni === 'number'
            ? sonuc.hizalamaGuveni
            : (typeof sonuc?.hataAyiklama?.hizalamaGuveni === 'number'
                ? sonuc.hataAyiklama.hizalamaGuveni : 0.70)
    );

    const bubbleGuvenleri = cevaplar
        .map(c => typeof c?.birlesikGuven === 'number'
            ? clamp01(c.birlesikGuven)
            : (typeof c?.guven === 'number' ? clamp01(c.guven) : null))
        .filter(v => v !== null);
    const bubbleOrt = bubbleGuvenleri.length
        ? bubbleGuvenleri.reduce((a, b) => a + b, 0) / bubbleGuvenleri.length
        : 0.65;

    const dusukGuvenli = cevaplar.filter(c =>
        c?.kontrolOnerilir === true ||
        c?.uyari === 'dusukGuven' ||
        (typeof c?.birlesikGuven === 'number' && c.birlesikGuven < 0.55)
    ).length;
    const coklu = cevaplar.filter(c =>
        c?.uyari === 'coklu' || c?.uyari === 'dusukDolulukOraniCiftIsaretli'
    ).length;

    const dusukOran = cevaplar.length ? dusukGuvenli / cevaplar.length : 0;
    const cokluOran = cevaplar.length ? coklu / cevaplar.length : 0;

    // Öğrenci numarası güveni: belirsiz hane teşhisi ve ham numara birlikte değerlendirilir.
    let ogrenciNoGuveni = 0.75;
    const ogrNo = String(sonuc?.ogrenciKimlik?.ogrenciNo || '');
    if (!ogrNo) ogrenciNoGuveni = 0.55; // numara alanı yok/okunmadı — tek başına formu reddetme
    if (/[\?Xx_]/.test(ogrNo)) ogrenciNoGuveni = 0.25;
    const numaraTeshis = uyarilar.find(u => String(u).startsWith('Numara teşhisi:'));
    if (numaraTeshis) {
        const belirsizSay = (String(numaraTeshis).match(/BELİRSİZ|BELIRSIZ/gi) || []).length;
        if (belirsizSay > 0) ogrenciNoGuveni = Math.min(ogrenciNoGuveni, Math.max(0.20, 0.65 - belirsizSay * 0.15));
    }
    ogrenciNoGuveni = clamp01(ogrenciNoGuveni);

    const goruntuUyarilari = uyarilar.filter(u =>
        /goruntuCokParlak|goruntuCokKoyu|yetersizPiksel|bulan|kontrast|parlama/i.test(String(u))
    );
    const goruntuSkoru = clamp01(1 - Math.min(0.35, goruntuUyarilari.length * 0.08));

    let skor =
        hizalama * 0.30 +
        bubbleOrt * 0.35 +
        ogrenciNoGuveni * 0.15 +
        clamp01(1 - dusukOran * 2.0) * 0.10 +
        clamp01(1 - cokluOran * 3.0) * 0.05 +
        goruntuSkoru * 0.05;

    skor = clamp01(skor);
    let yuzde = Math.round(skor * 100);
    let karar = yuzde >= 85 ? 'guvenli' : (yuzde >= 65 ? 'kontrol' : 'yenidenTara');

    // Sert güvenlik kapıları: kötü geometri ya da yaygın belirsizlik otomatik kaydı engeller.
    if (hizalama < 0.65 || dusukOran > 0.25) karar = 'yenidenTara';
    else if (dusukOran > 0.12 && karar === 'guvenli') karar = 'kontrol';

    // Numara okunmuş görünüyor ama güven düşükse yanlış öğrenciye otomatik bağlamayı engelle.
    if (ogrNo && ogrenciNoGuveni < 0.45 && karar === 'guvenli') karar = 'kontrol';

    const nedenler = [];
    if (hizalama < 0.85) nedenler.push('Hizalama güveni düşük');
    if (bubbleOrt < 0.70) nedenler.push('Cevap baloncuklarının ortalama güveni düşük');
    if (ogrNo && ogrenciNoGuveni < 0.70) nedenler.push('Öğrenci numarası güveni düşük');
    if (dusukGuvenli) nedenler.push(`${dusukGuvenli} soru kontrol gerektiriyor`);
    if (coklu) nedenler.push(`${coklu} soruda çoklu/çift işaret şüphesi`);
    if (goruntuUyarilari.length) nedenler.push(`${goruntuUyarilari.length} görüntü kalite uyarısı`);

    return {
        skor: yuzde,
        karar,
        otomatikKaydet: karar === 'guvenli',
        kontrolGerekli: karar === 'kontrol',
        yenidenTara: karar === 'yenidenTara',
        bilesenler: {
            hizalamaGuveni: Math.round(hizalama * 100),
            bubbleGuveni: Math.round(bubbleOrt * 100),
            ogrenciNoGuveni: Math.round(ogrenciNoGuveni * 100),
            dusukGuvenliSoruOrani: Math.round(dusukOran * 100),
            cokluIsaretOrani: Math.round(cokluOran * 100),
            goruntuKalitesi: Math.round(goruntuSkoru * 100),
        },
        nedenler,
    };
}

function formKaliteKapisiUygula(sonuc) {
    if (!sonuc || !sonuc.basarili) return sonuc;
    const kalite = formKalitesiniHesapla(sonuc);
    sonuc.formKalite = kalite;
    sonuc.otomatikKaydet = kalite.otomatikKaydet;

    if (kalite.karar === 'yenidenTara') {
        sonuc.basarili = false;
        sonuc.kontrolGerekli = true;
        sonuc.uyarilar = [
            `Form kalite skoru ${kalite.skor}/100 — yeniden tarama gerekli.`,
            ...kalite.nedenler,
            ...(sonuc.uyarilar || []),
        ];
    } else if (kalite.karar === 'kontrol') {
        sonuc.kontrolGerekli = true;
        sonuc.uyarilar = [
            `Form kalite skoru ${kalite.skor}/100 — kullanıcı kontrolü gerekli.`,
            ...kalite.nedenler,
            ...(sonuc.uyarilar || []),
        ];
    } else {
        sonuc.kontrolGerekli = false;
    }
    return sonuc;
}


export async function formuOkuVeGoster(sourceCanvas, okumaOpsiyonlari = {}) {

    // DEBUG — ekranda göster
    function dbg(msg) {
        const el = document.getElementById('sonucKutusu') || document.getElementById('statusText');
        if (el) { el.style.display = 'block'; el.textContent = (el.textContent ? el.textContent + '\n' : '') + msg; }
    }

    dbg('▶ formuOkuVeGoster başladı. Canvas: ' + (sourceCanvas ? sourceCanvas.width + 'x' + sourceCanvas.height : 'YOK'));

    if (typeof window.LayoutEngine === "undefined" || typeof window.OmrOkuyucu === "undefined") {
        dbg('❌ LayoutEngine=' + !!window.LayoutEngine + ' OmrOkuyucu=' + !!window.OmrOkuyucu);
        showStatus("OMR motoru yüklenemedi (layoutEngine.js / omrEngine.js).");
        return null;
    }

    showStatus("Form okunuyor...");

    const { form, sinavTuru } = testFormunuOlustur(sourceCanvas, okumaOpsiyonlari);
    dbg('sinavTuru=' + sinavTuru);

    let sonuc;

    try {
        sonuc = await window.OmrOkuyucu.formuOku(sourceCanvas, form, { genelDuzeltmeKullan: false, galeri: okumaOpsiyonlari.galeri === true });
        dbg('formuOku: basarili=' + sonuc?.basarili + ' uyari=' + (sonuc?.uyarilar?.[0] || '-'));
        console.log('[OMR] sonuc: basarili=', sonuc?.basarili, 'uyarilar=', sonuc?.uyarilar);
        formKoduDogrula(sonuc, sinavTuru);
        formKaliteKapisiUygula(sonuc);
    } catch (err) {
        dbg('❌ formuOku HATA: ' + err.message);
        console.error("formuOku hatası:", err);
        showStatus("Okuma sırasında hata oluştu: " + err.message);
        window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: null }));
        return null;
    }

    let gosterSonuc;
    try {
        gosterSonuc = sonucuGoster(sonuc);
    } catch (err) {
        console.error("sonucuGoster hatası:", err);
        showStatus("Sonuç gösterilirken hata oluştu: " + err.message);
        window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: sonuc }));
        return null;
    }

    // Toplu tarama oturumu için sonucu yalnızca 6-nokta geometrisi
    // yeterince güvenliyse yayınla. Orta güvenli sonuç ekranda gösterilir
    // ama otomatik kaydedilmez; kullanıcı yeniden tarayabilir/kontrol edebilir.
    if (sonuc && sonuc.basarili && !sonuc.kontrolGerekli) {
        window.dispatchEvent(new CustomEvent("omrSonucHazir", { detail: sonuc }));
    } else if (sonuc && sonuc.basarili && sonuc.kontrolGerekli) {
        showStatus('Okuma tamamlandı ancak kalite kontrolü gerekli (' +
            (sonuc.formKalite?.skor ?? Math.round((sonuc.hizalamaGuveni || 0) * 100)) +
            '/100). Sonuç otomatik kaydedilmedi.');
    }

    // Başarılı/başarısız fark etmeksizin: okuma süreci bitti (ör. kamera
    // penceresini otomatik kapatmak isteyen UI kodu bunu dinleyebilir).
    window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: sonuc }));

    // v36: Çağıran kodun (özellikle galeri akışının) gerçek OMR durumunu
    // değerlendirebilmesi için UI yardımcı dönüşü yerine HAM sonuc nesnesini
    // döndür. sonucuGoster() yalnızca ekrana yansıtma işidir.
    return sonuc;
}

/**
 * Galeriden TOPLU (çoklu dosya) içe aktarma için kullanılır — otomatik
 * QR + hizalama tespitiyle okur (köşe seçim UI'sini ATLAR, çünkü onlarca
 * fotoğraf için tek tek elle köşe düzeltmesi pratik değil). formuOkuVeGoster()'dan
 * farkı: 1) paylaşılan resultCanvas/sonucKutusu'na diagnostic ÇİZMEZ (her
 * görüntü için pahalı ve gereksiz — sadece son işlenen görünürdü), 2)
 * "omrOkumaTamamlandi" olayını YAYMAZ (bu olay kamera overlay'ini otomatik
 * kapatıyor — toplu işlem sırasında ilk görüntüden sonra kapanmasını
 * engellemek için batch tamamlanana kadar bastırılır, çağıran taraf tüm
 * dosyalar bitince kendi tamamlandı olayını tetikler).
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {Promise<object>} OmrOkuyucu.formuOku() sonucu ({basarili, uyarilar, ...})
 */
export async function formuOkuToplu(sourceCanvas, okumaOpsiyonlari = {}) {

    if (typeof window.LayoutEngine === "undefined" || typeof window.OmrOkuyucu === "undefined") {
        return { basarili: false, uyarilar: ["OMR motoru yüklenemedi."] };
    }

    const { form, sinavTuru } = testFormunuOlustur(sourceCanvas, okumaOpsiyonlari);

    let sonuc;

    try {
        sonuc = await window.OmrOkuyucu.formuOku(sourceCanvas, form, { genelDuzeltmeKullan: false, galeri: okumaOpsiyonlari.galeri === true });
        formKoduDogrula(sonuc, sinavTuru);
        formKaliteKapisiUygula(sonuc);
    } catch (err) {
        console.error("formuOku (toplu) hatası:", err);
        return { basarili: false, uyarilar: ["Hata: " + err.message] };
    }

    if (sonuc && sonuc.basarili && !sonuc.kontrolGerekli) {
        // Kalıcı kayıt için düzeltilmiş kağıt görüntüsünü de ekle (bkz.
        // sonucuGoster()'daki aynı işlem — burada resultCanvas'a çizim
        // yapılmadığı için doğrudan duzeltilmisCanvas'tan üretiliyor).
        const duzCanvas = sonuc.hataAyiklama && sonuc.hataAyiklama.duzeltilmisCanvas;
        if (duzCanvas) {
            const { dataUrl, olcek } = _kucukGoruntuVeOlcekUret(duzCanvas);
            sonuc.kagitGoruntusu = dataUrl;
            sonuc.baloncukNoktalari = _baloncukNoktalariniOlcekle(
                sonuc.hataAyiklama && sonuc.hataAyiklama.ornekNoktalari, olcek
            );
        }
        window.dispatchEvent(new CustomEvent("omrSonucHazir", { detail: sonuc }));
    } else if (sonuc && sonuc.basarili && sonuc.kontrolGerekli) {
        console.warn('[OMR] Toplu taramada kontrol gerektiren form otomatik kaydedilmedi:',
            (sonuc.formKalite?.skor ?? Math.round((sonuc.hizalamaGuveni || 0) * 100)) + '/100');
    }

    return sonuc;

}

/**
 * Kullanıcının elle işaretlediği 4 köşeyle okur (otomatik QR/hizalama
 * tespiti atlanır). Köşe seçimi güvenilmez/başarısız otomatik tespiti
 * atlatmak veya doğrulamak için kullanılır.
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {{solUst,sagUst,solAlt,sagAlt}} koseler - canvas piksel koordinatları
 */
export async function formuOkuElleKoseliVeGoster(sourceCanvas, koseler, okumaOpsiyonlari = {}) {

    if (typeof window.LayoutEngine === "undefined" || typeof window.OmrOkuyucu === "undefined") {
        showStatus("OMR motoru yüklenemedi (layoutEngine.js / omrEngine.js).");
        return null;
    }

    showStatus("Form (elle seçilen köşelerle) okunuyor...");

    // TEŞHİS: OptikAktifForm durumunu uyarı kutusuna yaz
    const dbg = (msg) => {
        const el = document.getElementById('sonucKutusu') || document.getElementById('statusText');
        if (el) { el.style.display = 'block'; el.textContent = (el.textContent ? el.textContent + '\n' : '') + msg; }
    };
    dbg('OptikAktifForm: ' + (window.OptikAktifForm ? 'VAR (sinavTuru=' + window.OptikAktifForm.sinavTuru + ')' : 'YOK/NULL'));
    dbg('Teshis: ' + (window._optikTeshis || 'henüz çalışmadı'));
    dbg('sinavTuruEl: ' + (document.getElementById('sinavTuru')?.value || 'yok'));

    const { form, sinavTuru } = testFormunuOlustur(sourceCanvas, okumaOpsiyonlari);

    let sonuc;

    try {
        sonuc = await window.OmrOkuyucu.formuOkuElleKoseli(sourceCanvas, form, koseler, { genelDuzeltmeKullan: false });
        formKoduDogrula(sonuc, sinavTuru);
        formKaliteKapisiUygula(sonuc);
    } catch (err) {
        console.error("formuOkuElleKoseli hatası:", err);
        showStatus("Okuma sırasında hata oluştu: " + err.message);
        window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: null }));
        return null;
    }

    let gosterSonuc;
    try {
        gosterSonuc = sonucuGoster(sonuc);
    } catch (err) {
        console.error("sonucuGoster hatası:", err);
        showStatus("Sonuç gösterilirken hata oluştu: " + err.message);
        window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: sonuc }));
        return null;
    }

    if (sonuc && sonuc.basarili) {
        window.dispatchEvent(new CustomEvent("omrSonucHazir", { detail: sonuc }));
    }

    window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: sonuc }));

    return sonuc;
}

/**
 * formuOku()/formuOkuElleKoseli() sonucunu resultCanvas + durum +
 * sonuçKutusu'na yansıtan ortak kısım.
 */
function sonucuGoster(sonuc) {

    if (!sonuc.basarili) {
        showStatus("Okunamadı: " + (sonuc.uyarilar[0] || "bilinmeyen hata"));
        return sonuc;
    }

    // Düzeltilmiş (canonical) görüntüyü resultCanvas'ta göster.
    const resultCanvas = document.getElementById("resultCanvas");
    const duzCanvas = sonuc.hataAyiklama && sonuc.hataAyiklama.duzeltilmisCanvas;

    // Kalıcı kayıt için: TEMİZ (teşhis noktaları çizilmeden ÖNCEKİ) kağıt
    // görüntüsünü sıkıştırıp sonuca ekle. TopluTarama.ekle() bunu saklar,
    // "sonuca tıkla → kağıdı gör" akışında kullanılır.
    if (duzCanvas) {
        const { dataUrl, olcek } = _kucukGoruntuVeOlcekUret(duzCanvas);
        sonuc.kagitGoruntusu = dataUrl;
        sonuc.baloncukNoktalari = _baloncukNoktalariniOlcekle(
            sonuc.hataAyiklama && sonuc.hataAyiklama.ornekNoktalari, olcek
        );
    }

    if (duzCanvas && resultCanvas) {
        resultCanvas.width = duzCanvas.width;
        resultCanvas.height = duzCanvas.height;

        const rctx = resultCanvas.getContext("2d");
        rctx.drawImage(duzCanvas, 0, 0);

        // TEŞHİS: otomatik tespitte kullanılan (QR veya hizalama işareti)
        // 4 köşe noktasını sarı daire + numarayla işaretle. Bunlar
        // dewarp edilmiş görüntüdeki karşılıklar — hangi köşenin doğru
        // sayfa köşesine denk geldiğini/gelmediğini gözle görmek için.
        const noktalar = sonuc.hataAyiklama && sonuc.hataAyiklama.hizalamaNoktalari;

        if (noktalar && noktalar.length) {

            const r = Math.max(6, duzCanvas.width * 0.01);

            noktalar.forEach((p, i) => {
                rctx.beginPath();
                rctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                rctx.strokeStyle = "yellow";
                rctx.lineWidth = Math.max(2, duzCanvas.width * 0.002);
                rctx.stroke();
                rctx.fillStyle = "yellow";
                rctx.font = `bold ${Math.max(12, duzCanvas.width * 0.015)}px Arial`;
                rctx.fillText(String(i + 1), p.x + r + 2, p.y - r - 2);
            });

        }

        // TEŞHİS 2: hizalama işaretleri "bulundu ama güvenilmez" sayılıp
        // REDDEDİLDİYSE, sarı noktalar (yukarıdaki) QR köşelerine döner —
        // asıl bulunan (ama reddedilen) noktaları görmek için bunları
        // TURUNCU olarak ayrıca işaretle.
        const hamNoktalar = sonuc.hataAyiklama && sonuc.hataAyiklama.hamHizalamaNoktalari;

        if (hamNoktalar && hamNoktalar.length) {

            const r2 = Math.max(6, duzCanvas.width * 0.01);

            hamNoktalar.forEach((p, i) => {
                rctx.beginPath();
                rctx.arc(p.x, p.y, r2, 0, Math.PI * 2);
                rctx.strokeStyle = "orange";
                rctx.lineWidth = Math.max(2, duzCanvas.width * 0.002);
                rctx.stroke();
                rctx.fillStyle = "orange";
                rctx.font = `bold ${Math.max(12, duzCanvas.width * 0.015)}px Arial`;
                rctx.fillText("H" + (i + 1), p.x + r2 + 2, p.y + r2 + 14);
            });

        }

        // TEŞHİS 3: Her BALONCUĞUN gerçek örnekleme noktasını (homografi +
        // satır-kilit + yerel ince-ayar sonrası kullanılan piksel) küçük bir
        // nokta olarak çiz. AMAÇ: köşeler/homografi doğru olsa bile, kağıt
        // kavisi/bombesi yüzünden ORTAYA ÇIKAN yerel kaymayı (bir sütunun
        // aşağı doğru gittikçe baloncuklardan uzaklaşması gibi) GÖZLE görmek.
        // Renk kodu: koyuluk oranı yüksekse (dolu/işaretli sayılmışsa) YEŞİL,
        // düşükse (boş sayılmışsa) KIRMIZI — böylece "aslında dolu olduğu
        // hâlde nokta baloncuğun dışına düşmüş" durumları hemen fark edilir:
        // fotoğrafta gözle dolu görünen bir baloncukta nokta KIRMIZI ve
        // baloncuğun biraz dışındaysa, sorun kesinlikle yerel hizalamadır.
        //
        // try/catch: bu SADECE görsel bir teşhis katmanı — burada beklenmeyen
        // bir veri şekli/hata olsa bile asıl okuma sonucunu (cevaplar) veya
        // ekrana yansıtmayı ASLA bozmasın diye sarmalandı.
        try {
            const ornekNoktalari = sonuc.hataAyiklama && sonuc.hataAyiklama.ornekNoktalari;

            if (ornekNoktalari && ornekNoktalari.length) {

                const nr = Math.max(2, duzCanvas.width * 0.0025);

                ornekNoktalari.forEach((soru) => {
                    soru.sikler.forEach((s) => {
                        rctx.beginPath();
                        rctx.arc(s.px, s.py, nr, 0, Math.PI * 2);
                        rctx.fillStyle = s.oran >= 0.5 ? "#00ff00" : "#ff2020";
                        rctx.fill();
                    });
                });

            }
        } catch (err) {
            console.error("Örnek noktaları çizilirken hata (görmezden gelindi):", err);
        }

        resultCanvas.classList.add("visible");
    }

    const isaretliSayisi = sonuc.cevaplar.filter((c) => c.isaretliSik).length;

    const kaliteEtiketi = sonuc.formKalite
        ? ` | Kalite: ${sonuc.formKalite.skor}/100 (${
            sonuc.formKalite.karar === 'guvenli' ? 'Güvenli' :
            sonuc.formKalite.karar === 'kontrol' ? 'Kontrol' : 'Yeniden Tara'
          })`
        : "";

    showStatus(
        `Okuma tamamlandı: ${sonuc.cevaplar.length} soru, ${isaretliSayisi} işaretli${kaliteEtiketi}` +
        (sonuc.uyarilar.length ? ` (${sonuc.uyarilar.length} uyarı)` : "")
    );

    // Her sorunun tek tek dökümü — hangi sorunun neden işaretli/işaretsiz
    // sayıldığını görebilmek için (özellikle yanlış pozitif/negatifleri
    // teşhis ederken).
    const sonucKutusu = document.getElementById("sonucKutusu");

    if (sonucKutusu) {

        const baslikSatirlari = sonuc.uyarilar.map((u) => "⚠ " + u);
        if (sonuc.bubbleKalite) {
            baslikSatirlari.push(
                `Bubble kalite: ort. birleşik güven ${Number(sonuc.bubbleKalite.ortalamaBirlesikGuven || 0).toFixed(2)} · ` +
                `kontrol önerilen ${sonuc.bubbleKalite.dusukGuvenliSayisi || 0}/${sonuc.bubbleKalite.toplamSoru || sonuc.cevaplar.length}`
            );
        }

        const satirlar = sonuc.cevaplar.map((c) => {
            const ders = c.ders ? c.ders + " " : "";
            const isaretli = c.isaretliSik || "—";
            const uyari = c.uyari ? ` (${c.uyari})` : "";
            const guven = typeof c.guven === "number" ? c.guven.toFixed(2) : c.guven;
            const birlesik = typeof c.birlesikGuven === "number" ? c.birlesikGuven.toFixed(2) : "—";
            return `${ders}Soru ${c.soruNo}: ${isaretli}${uyari}  [doluluk: ${guven} | birleşik: ${birlesik}]`;
        });

        sonucKutusu.textContent = [...baslikSatirlari, "", ...satirlar].join("\n");
        sonucKutusu.style.display = "block";

    }

    return sonuc;
}
