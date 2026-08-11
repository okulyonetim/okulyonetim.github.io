// js/hassasiyetAyarlari.js
//
// Köşe tespiti (blob yöntemi) için MANUEL ayarlanabilir hassasiyet
// parametreleri. localStorage'da saklanır, cihaza/ışık koşuluna özel
// kalıcı olur. omrEngine.js'deki enBuyukKareBlobuBul() bu değerleri
// (verilmezse kendi varsayılanlarını) kullanır — bkz. omrEngine.js.

const ANAHTAR = 'optikHassasiyetAyarlari';

export const VARSAYILAN = {
    yuzdelik: 0.30,        // eşik: bölgenin en koyu %kaçı (0.10-0.50 arası mantıklı)
    minDoluluk: 0.45,      // minimum doluluk oranı (0.20-0.70)
    tespitAraligiMs: 250,  // canlı köşe tespiti döngü aralığı (150-800ms) — camera.js max 180ms ile kısıtlı
    koyulukEsik: 0.40,     // cevap baloncuğu "işaretli" sayılması için min koyuluk oranı
                           // (omrEngine.js: KARANLIK_ESIK — 0.10-0.50 arası mantıklı;
                           // düşürmek daha soluk işaretleri de yakalar ama yanlış
                           // pozitif riskini artırır)
                           // YENİ (Ağustos 2026, gerçek "Cevap teşhisi" verisiyle
                           // bulundu — bkz. numaraKoyulukEsik'in aynı kalıptaki
                           // bulgusu): 0.28 varsayılanı bu formun taban gürültüsünü
                           // (boş baloncuklarda ölçülen 0.28-0.35 arası, D şıkkının
                           // sistematik olarak en yüksek çıkması) yakalayamıyordu —
                           // gerçek işaretli sorularda (guven 0.5-1.0) bu değerler
                           // çok daha yüksek. 0.40, gürültü tavanı (0.35) ile gerçek
                           // işaret tabanı (0.5) arasında güvenli bir ayraç.
    ayirtEdiciFark: 0.10, // en koyu şıkla ikinci en koyu şık arasında gereken min fark
                           // (omrEngine.js: AYIRT_EDICI_FARK) — bunun altındaysa
                           // "çoklu/belirsiz işaret" sayılır. Düşürmek daha az soruyu
                           // belirsiz sayar ama yanlış şık seçme riskini artırır.
    numaraMinFark: 0.02,   // öğrenci numarası hanelerinde aynı mantık (omrEngine.js:
                           // MIN_FARK) — çok düşük tutulursa aday hanelerin birbirine
                           // çok yakın koyulukta olduğu (belirsiz) durumları ayırt edemez
    numaraKoyulukEsik: 0.45, // YENİ (Ağustos 2026, gerçek kağıt teşhisiyle bulundu):
                           // koyulukEsik'in numara alanı karşılığı — cevap okumada
                           // (KARANLIK_ESIK) var ama numara okuma (_basamakEnKoyusu)
                           // önceden SADECE numaraMinFark (fark eşiği) kontrol ediyordu,
                           // mutlak sinyal seviyesine hiç bakmıyordu. Gözlemlenen: boş
                           // bir hanede en yüksek 3 aday birbirine çok yakın (~0.25-0.28)
                           // ama HEPSİ zayıf gürültü seviyesindeyken, numaraMinFark=0.02
                           // gibi düşük bir fark eşiği bu gürültüden bile "kesin" bir
                           // rakam üretiyordu (0.277 vs 0.254 farkı 0.02'yi geçiyor diye
                           // "9" gibi hatalı bir rakam seçiliyordu). Artık birinci adayın
                           // oranı bu eşiğin altındaysa (fark ne olursa olsun) hane boş
                           // sayılır. Gerçek işaretli bir hanede oran tipik olarak 0.7+
                           // çıkıyor, bu yüzden 0.45 güvenli bir ayraç.
};

export function ayarlariGetir() {
    try {
        const ham = localStorage.getItem(ANAHTAR);
        if (!ham) return { ...VARSAYILAN };
        return { ...VARSAYILAN, ...JSON.parse(ham) };
    } catch (e) {
        return { ...VARSAYILAN };
    }
}

export function ayarlariKaydet(kismi) {
    // undefined değerleri (ör. sayfada karşılık gelen input yoksa) mevcut
    // kayıtlı değerin üzerine YAZMASIN diye eleniyor.
    const temiz = {};
    Object.keys(kismi || {}).forEach(k => { if (kismi[k] !== undefined) temiz[k] = kismi[k]; });
    const guncel = { ...ayarlariGetir(), ...temiz };
    try { localStorage.setItem(ANAHTAR, JSON.stringify(guncel)); } catch (e) { /* sorun değil */ }
    return guncel;
}

export function ayarlariSifirla() {
    try { localStorage.removeItem(ANAHTAR); } catch (e) {}
    return { ...VARSAYILAN };
}

// app.js modül olmayan/eski yerlerden de erişebilsin diye window'a da asıyoruz.
window.HassasiyetAyarlari = { VARSAYILAN, ayarlariGetir, ayarlariKaydet, ayarlariSifirla };
