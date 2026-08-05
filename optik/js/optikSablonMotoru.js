/**
 * optikSablonMotoru.js — Optik Form Editörü derleme motoru (Ağustos 2026)
 *
 * AMAÇ: Sedat'ın isteği — "sınıf oturma planı gibi şablon üzerinde öğeleri
 * istediğim yere koyup istediğim şekilde her şeyi manuel düzenlemek".
 *
 * TASARIM KARARI: Bu dosya YENİ bir PDF/OMR hesaplama mantığı YAZMIYOR.
 * Bunun yerine layoutEngine.js'deki, LGS/Bursluluk şablonlarını üreten ve
 * halihazırda pdfFormGenerator.js + omrEngine.js tarafından güvenle
 * kullanılan fonksiyonları (dersSutunuHesapla, numaraAlaniHesapla,
 * kitapcikAlaniHesapla, vb.) doğrudan çağırır. Editör kullanıcıya sadece bu
 * fonksiyonların PARAMETRELERİNİ (x, y, soru sayısı, şık sayısı, baloncuk
 * çapı, yatay/dikey boşluk, sütun sayısı, sütunlar arası boşluk, sütunun
 * dikey konumu) manuel olarak ayarlama imkanı verir. Böylece:
 *   - pdfFormGenerator.js'de SIFIR değişiklik gerekmiyor (aynı "form"
 *     nesne şeklini üretiyoruz — bkz. lgsSablonuOlustur'un return'ü)
 *   - omrEngine.js'de SIFIR değişiklik gerekmiyor (aynı sebepten)
 *   - Editörün ürettiği koordinat matematiği, LGS/Bursluluk'ta yıllardır
 *     kanıtlanmış koddan geliyor — yeni, test edilmemiş bir hesaplama
 *     yolu değil.
 *
 * ŞEMA (editör bu şekli üretir/düzenler, Firestore'da saklanır):
 *   {
 *     versiyon: 1,
 *     ad: "Benim Formum",
 *     sinavTuru: 'ozel',
 *     sayfaBoyutu: {width, height},   // mm, genelde A4
 *     ogeler: [
 *       {
 *         id: "og_1",
 *         tip: 'baloncukBlok',
 *         x, y,                       // sol-üst köşe, mm
 *         dersAdi: "Türkçe",
 *         soruSayisi: 20,
 *         sikSayisi: 4,
 *         baloncukCap: 2.75,          // mm — manuel
 *         yatayAralikCarpani: 1.45,   // baloncuklar arası yatay boşluk çarpanı
 *         dikeyAralikCarpani: 2.0,    // satırlar arası dikey boşluk çarpanı
 *         genislik: 30,               // mm — sütun genişliği
 *         sutunSayisi: 1,             // 1'den fazlaysa yan yana çoklu sütun
 *         sutunlarArasiBosluk: 3,     // mm
 *         sutunDikeyKaymalari: [0],   // her sütun için (varsayılan) y'ye ek kayma — "sütunların dikey yerleşimi manuel" isteği
 *       },
 *       { id: "og_2", tip: 'kimlikAlani', x, y, genislik, yukseklik, baslik: "AD SOYAD" },
 *       { id: "og_3", tip: 'numaraAlani', x, y, basamakSayisi: 4, olcek: 1, yon: 'dikey' },
 *       { id: "og_4", tip: 'kitapcikAlani', x, y, secenekSayisi: 4, olcek: 1 },
 *       { id: "og_5", tip: 'baslik', x, y, genislik, yukseklik, metin: "..." },
 *       { id: "og_6", tip: 'metin', x, y, metin: "...", fontPt: 10 },
 *       { id: "og_7", tip: 'cizgi', x1, y1, x2, y2 },
 *       { id: "og_8", tip: 'logo', x, y, genislik, yukseklik },   // Aşama sonrası: gerçek görsel gömme
 *     ],
 *   }
 *
 * ÇIKTI: lgsSablonuOlustur() ile AYNI şekilde bir "form" nesnesi
 * ({versiyon, sinavTuru, soruSayisi, sikSayisi, sayfaBoyutu, formlar:[{...}]})
 * — pdfFormGenerator.js:topluFormPdfOlustur ve omrEngine.js:formuOku bunu
 * doğrudan tüketebilir.
 */

(function () {
  const LE = typeof window !== 'undefined' && window.LayoutEngine
    ? window.LayoutEngine
    : (typeof require !== 'undefined' ? require('./layoutEngine.js') : null);

  if (!LE) {
    throw new Error('optikSablonMotoru.js: LayoutEngine bulunamadı — önce layoutEngine.js yüklenmeli.');
  }

  const VARSAYILAN_BASLIK_YUKSEKLIGI = 8; // mm — ders sütunu başlık şeridi yüksekliği (LGS/Bursluluk ile aynı)

  /**
   * ŞEMA DOĞRULAMA: editörden/Firestore'dan gelen bir şablonun temel
   * alanlarını kontrol eder. Hatalıysa insan-okunur bir mesajla fırlatır
   * — sessizce yanlış/eksik bir form üretmek yerine erken ve net durur.
   */
  function sablonuDogrula(sablon) {
    if (!sablon || typeof sablon !== 'object') {
      throw new Error('Şablon boş veya geçersiz.');
    }
    if (!Array.isArray(sablon.ogeler) || sablon.ogeler.length === 0) {
      throw new Error('Şablonda hiç öğe yok — en az bir baloncuk bloğu eklenmeli.');
    }
    const izinVerilenTipler = new Set([
      'baloncukBlok', 'kimlikAlani', 'numaraAlani', 'kitapcikAlani', 'baslik', 'metin', 'cizgi', 'logo',
    ]);
    sablon.ogeler.forEach((og, i) => {
      if (!og.id) throw new Error(`Öğe #${i}: id eksik.`);
      if (!izinVerilenTipler.has(og.tip)) {
        throw new Error(`Öğe "${og.id}": bilinmeyen tip "${og.tip}".`);
      }
      if (og.tip === 'baloncukBlok') {
        // YENİ (Sedat isteği, Ağustos 2026: "Ders adı zorunlu bile olmasın")
        // — artık boş bırakılabilir; boşsa başlık kutusu hiç basılmıyor
        // (bkz. pdfFormGenerator.js: bolumlerCiz, optikSablonEditor.js önizleme).
        if (!(og.soruSayisi > 0)) throw new Error(`Öğe "${og.id}": soru sayısı 1'den büyük olmalı.`);
        if (!(og.sikSayisi >= 2 && og.sikSayisi <= 6)) {
          throw new Error(`Öğe "${og.id}": şık sayısı 2-6 arasında olmalı.`);
        }
        if (!(og.baloncukCap >= 1.5)) {
          throw new Error(`Öğe "${og.id}": baloncuk çapı çok küçük (min 1.5mm) — güvenilir kamera okuması için yetersiz.`);
        }
      }
      if (typeof og.x !== 'number' || typeof og.y !== 'number') {
        if (og.tip !== 'cizgi') {
          throw new Error(`Öğe "${og.id}": x/y konumu eksik.`);
        }
      }
    });
    return true;
  }

  /**
   * Bir 'baloncukBlok' öğesini (tek veya çoklu sütun) gerçek koordinatlara
   * çevirir — dersSutunuHesapla'yı her sütun için ayrı ayrı çağırır,
   * sütunlar arası boşluğu ve her sütunun (manuel) dikey kaymasını uygular.
   */
  function baloncukBlokOlustur(og) {
    const sutunSayisi = og.sutunSayisi || 1;
    const sutunlarArasiBosluk = og.sutunlarArasiBosluk != null ? og.sutunlarArasiBosluk : 3;
    const kaymalar = og.sutunDikeyKaymalari || [];
    const soruBasinaDusen = Math.ceil(og.soruSayisi / sutunSayisi);

    // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026 — "resimdeki
    // formu galeriden yükledim yanlış okudu", D:0 Y:0 B:20 çıkıyordu):
    // omrEngine.js cevapları "ders" adını ANAHTAR olarak kullanarak
    // gruplandırıyor (bkz. cevaplariCikar: ders=sutun.dersAdi) ve boş bir
    // anahtarı ("") sessizce ATIYOR (_omrSonucuisle: if(!c.ders) return).
    // "Ders adı zorunlu olmasın" özelliği eklenirken bu, ders adını görsel
    // bir ETİKET sanıp boş bırakmaya izin vermişti — ama aynı alan aynı
    // zamanda cevapların/anahtarın İÇ KİMLİĞİYDİ, boş bırakılınca TÜM
    // cevaplar sessizce kayboluyordu. Artık ikisi AYRILDI: iç kimlik
    // (dersAdiIcin) HİÇBİR ZAMAN boş olamaz (kullanıcı boş bırakırsa öğenin
    // kendi id'sinden okunabilir bir isim üretilir); SADECE görsel
    // basım (baslikYuksekligi) kullanıcının isteğine göre gizlenir.
    const dersAdiIcin = og.dersAdi || ('Soru Bloğu #' + og.id.slice(-4));
    const baslikGorunur = !!og.dersAdi && og.baslikGizle !== 'evet'; // alanEkle select'i string döndürür ('evet'/'hayir'), boolean değil
    const baslikYuksekligi = baslikGorunur ? (og.baslikYuksekligi || VARSAYILAN_BASLIK_YUKSEKLIGI) : 0;
    const baslikFontPt = og.baslikFontPt || 6.4;
    const baslikAltBosluk = baslikGorunur ? 3 : 1;

    const dersSutunlari = [];
    for (let s = 0; s < sutunSayisi; s++) {
      const sutunX = og.x + s * (og.genislik + sutunlarArasiBosluk);
      const sutunY = og.y + (kaymalar[s] || 0);
      const buSutundakiSoruSayisi = Math.min(
        soruBasinaDusen,
        og.soruSayisi - s * soruBasinaDusen
      );
      if (buSutundakiSoruSayisi <= 0) continue;

      const sutun = LE.dersSutunuHesapla({
        x: sutunX,
        y: sutunY,
        width: og.genislik,
        dersAdi: dersAdiIcin, // ASLA boş değil (bkz. yukarıdaki kök neden notu) — OMR gruplandırması buna dayanıyor
        soruSayisi: buSutundakiSoruSayisi,
        baslangicSoruNo: s * soruBasinaDusen + 1, // KÖK NEDEN DÜZELTMESİ: 2. sütun 11'den devam etsin, 1'den başlamasın (bkz. layoutEngine.js notu)
        sikSayisi: og.sikSayisi,
        baloncukCap: og.baloncukCap,
        aralikCarpani: og.yatayAralikCarpani || 1.45,
        baslikYuksekligi,
        baslikFontPt,
        baslikAltBosluk,
      });
      sutun.dersAdiHizalama = og.dersAdiHizalama || 'orta';
      sutun.baslikFontPt = baslikFontPt;
      dersSutunlari.push(sutun);
    }
    return { grupBaslik: og.dersAdi, dersSutunlari };
  }

  /**
   * Editör şemasını, pdfFormGenerator.js/omrEngine.js'nin zaten tükettiği
   * "form" nesnesine derler (bkz. lgsSablonuOlustur'un return şekli).
   */
  function sablonuDerle(sablon) {
    sablonuDogrula(sablon);

    const sayfaBoyutu = sablon.sayfaBoyutu || LE.A4;
    const bolge = { x: 0, y: 0, width: sayfaBoyutu.width, height: sayfaBoyutu.height };

    let kitapcikAlani = null;
    let numaraAlani = null;
    let toplamSoruSayisi = 0;
    let ortakSikSayisi = null;
    const bolumler = []; // her baloncukBlok -> {baslik, dersSutunlari:[...]}
    const serbestOgeler = []; // metin/cizgi/baslik/logo — PDF üreticiye ek çizim talimatı olarak geçilir

    sablon.ogeler.forEach((og) => {
      if (og.tip === 'baloncukBlok') {
        const bolum = baloncukBlokOlustur(og);
        bolumler.push({ baslik: bolum.grupBaslik, dersSutunlari: bolum.dersSutunlari });
        bolum.dersSutunlari.forEach((s) => { toplamSoruSayisi += s.sorular.length; });
        if (ortakSikSayisi === null) ortakSikSayisi = og.sikSayisi;
      } else if (og.tip === 'numaraAlani') {
        numaraAlani = LE.numaraAlaniHesapla(
          og.x, og.y, og.basamakSayisi || 4, og.olcek || 1, og.yon || 'dikey'
        );
        // YENİ (Sedat isteği, Ağustos 2026: "öğrenci no başlık metni manuel
        // düzenlenebilsin") — bkz. pdfFormGenerator.js: numaraAlaniCiz notu.
        numaraAlani.baslik = og.baslikMetni || 'NUMARA';
      } else if (og.tip === 'kitapcikAlani') {
        kitapcikAlani = LE.kitapcikAlaniHesapla(
          og.x, og.y, og.secenekSayisi || 4, og.olcek || 1, og.yon || 'dikey'
        );
        kitapcikAlani.baslik = og.baslikMetni || 'K';
      } else {
        // kimlikAlani / baslik / metin / cizgi / logo — koordinatları
        // olduğu gibi taşınır, pdfFormGenerator.js'nin yeni bir "serbest
        // öğe çizici" fonksiyonu bunları render eder (Aşama 4'te eklenecek).
        serbestOgeler.push(og);
      }
    });

    const gruplar = { // debug/gösterim amaçlı ayrı tutuluyor, bolumler zaten hesaplı
    };

    return {
      versiyon: 1,
      ad: sablon.ad || 'Adsız Şablon',
      sinavTuru: sablon.sinavTuru || 'ozel',
      soruSayisi: toplamSoruSayisi,
      sikSayisi: ortakSikSayisi || 4,
      sayfaDuzeni: 1,
      sayfaBoyutu,
      formlar: [
        {
          formIndex: 0,
          bolge,
          hizalamaIsaretleri: LE.hizalamaIsaretleriEkle(bolge),
          sayfaCercevesi: LE.sayfaCercevesiHesapla(bolge),
          kitapcikAlani,
          numaraAlani,
          bolumler,
          genelIzgaraCercevesi: bolumler.length ? LE.genelIzgaraCercevesiHesapla(bolumler) : null,
          serbestOgeler,
        },
      ],
    };
  }

  const OptikSablonMotoru = {
    sablonuDogrula,
    sablonuDerle,
  };

  if (typeof window !== 'undefined') {
    window.OptikSablonMotoru = OptikSablonMotoru;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptikSablonMotoru;
  }
})();
