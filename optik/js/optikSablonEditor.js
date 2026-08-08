/**
 * optikSablonEditor.js — Optik Form Editörü UI (Ağustos 2026)
 *
 * Sedat'ın isteği: Sınıf Oturma Düzeni editörü gibi bir tuval üzerinde
 * öğeleri (baloncuk blokları, kimlik/numara/kitapçık alanları, başlık,
 * metin, çizgi) sürükle-bırakla yerleştirip TÜM boşluk/sütun/seçenek
 * ayarlarını manuel kontrol etmek — Android mobil uyumlu.
 *
 * MİMARİ: Bu dosya SADECE görsel düzenleme arayüzü. Gerçek koordinat
 * matematiği (baloncuk pozisyonları vb.) optikSablonMotoru.js +
 * layoutEngine.js'den geliyor — editör burada YENİDEN hesaplama YAPMIYOR,
 * canlı önizleme için de aynı sablonuDerle() çağrısını kullanıyor. Böylece
 * editörde gördüğün ile PDF'e basılan/OMR'ın okuduğu birebir aynı.
 *
 * TEKNİK: SVG tabanlı tuval (viewBox = sayfa mm boyutu — çözünürlükten
 * bağımsız, mobilde otomatik ölçekleniyor). Sürükleme/yeniden boyutlandırma
 * Pointer Events ile (mouse + dokunmatik aynı kod yolu, setPointerCapture
 * ile parmak tuvalin dışına çıksa da sürükleme kopmuyor).
 *
 * KULLANIM:
 *   OptikSablonEditor.baslat(containerElement, {
 *     baslangicSablonu: {...} | null,  // null ise boş A4 şablonla başlar
 *     kaydet: async (sablon) => {...}, // "Kaydet" butonuna basılınca çağrılır
 *   });
 */

(function () {
  const LE = window.LayoutEngine;
  const Motoru = window.OptikSablonMotoru;
  if (!LE || !Motoru) {
    throw new Error('optikSablonEditor.js: LayoutEngine veya OptikSablonMotoru bulunamadı — sıralama index.html\'de yanlış olabilir.');
  }

  const MM_VIEWBOX_PAY = 6; // mm — tuval kenarında sayfa dışına taşan sürükleme için görünür pay

  // ---- Öğe tipleri için varsayılan değerler (palet "+ ekle" butonları bunları kullanır) ----
  const OGE_VARSAYILANLARI = {
    baloncukBlok: () => ({
      tip: 'baloncukBlok', x: 20, y: 20,
      dersAdi: 'Yeni Ders', soruSayisi: 10, sikSayisi: 4,
      baloncukCap: LE.STANDART_BALONCUK_CAP, yatayAralikCarpani: 1.3, dikeyAralikCarpani: 1.3,
      genislik: 30, sutunSayisi: 1, sutunlarArasiBosluk: 3, sutunDikeyKaymalari: [0],
    }),
    kimlikAlani: () => ({ tip: 'kimlikAlani', x: 15, y: 15, genislik: 100, yukseklik: 14, baslik: 'AD SOYAD', alan: 'adSoyad' }),
    numaraAlani: () => ({ tip: 'numaraAlani', x: 15, y: 40, basamakSayisi: 4, olcek: 1, yon: 'dikey' }),
    kitapcikAlani: () => ({ tip: 'kitapcikAlani', x: 15, y: 20, secenekSayisi: 4, olcek: 1 }),
    baslik: () => ({ tip: 'baslik', x: 15, y: 15, genislik: 180, yukseklik: 8, metin: 'SINAV CEVAP KAĞIDI' }),
    metin: () => ({ tip: 'metin', x: 15, y: 15, metin: 'Metin', fontPt: 10 }),
    cizgi: () => ({ tip: 'cizgi', x1: 15, y1: 15, x2: 195, y2: 15 }),
    logo: () => ({ tip: 'logo', x: 15, y: 15, genislik: 20, yukseklik: 20 }),
  };

  const OGE_ETIKETLERI = {
    baloncukBlok: 'Baloncuk Bloğu', kimlikAlani: 'Kimlik Alanı', numaraAlani: 'Numara Alanı',
    kitapcikAlani: 'Kitapçık Alanı', baslik: 'Başlık', metin: 'Serbest Metin', cizgi: 'Çizgi', logo: 'Logo',
  };

  let idSayaci = 1;
  function yeniId() { return 'og_' + (idSayaci++) + '_' + Date.now().toString(36); }

  function svgOlustur(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    }
    return el;
  }

  function derinKopya(o) { return JSON.parse(JSON.stringify(o)); }

  /**
   * Bir baloncukBlok öğesinin GERÇEK baloncuk konumlarını hesaplar
   * (optikSablonMotoru.js'deki aynı mantığı, tek öğe için tekrar kullanır)
   * — editördeki önizleme, PDF'e basılanla birebir aynı koordinatlardan
   * gelsin diye.
   */
  function baloncukBlokOnizlemeHesapla(og) {
    const sutunSayisi = og.sutunSayisi || 1;
    const sutunlarArasiBosluk = og.sutunlarArasiBosluk != null ? og.sutunlarArasiBosluk : 3;
    const kaymalar = og.sutunDikeyKaymalari || [];
    const soruBasinaDusen = Math.ceil(og.soruSayisi / sutunSayisi);
    const dersAdiIcin = og.dersAdi || ('Soru Bloğu #' + og.id.slice(-4));
    const baslikGorunur = !!og.dersAdi && og.baslikGizle !== 'evet';
    const baslikYuksekligi = baslikGorunur ? (og.baslikYuksekligi || 8) : 0;
    const baslikFontPt = og.baslikFontPt || 6.4;
    const baslikAltBosluk = baslikGorunur ? 3 : 1;

    // Sütun genişliği: otomatik hesapla (Test Plus gibi içeriğe göre)
    // soruNoGenisligi + sikSayisi × baloncukCap × aralikCarpani
    const cap = og.baloncukCap || LE.STANDART_BALONCUK_CAP;
    const yatay = og.yatayAralikCarpani || 1.3;
    const sikSayisi = og.sikSayisi || 4;
    const maxNo = soruBasinaDusen >= 10 ? 99 : 9;
    const soruNoGen = maxNo >= 10 ? 5.5 : 4.0;
    const otomatikGenislik = soruNoGen + sikSayisi * cap * yatay;
    // Kullanıcı "genislikSabit: true" seçmediyse otomatik kullan
    const sutunGenislik = og.genislikSabit ? (og.genislik || otomatikGenislik) : otomatikGenislik;

    const sutunlar = [];
    for (let s = 0; s < sutunSayisi; s++) {
      const buSutundakiSoruSayisi = Math.min(soruBasinaDusen, og.soruSayisi - s * soruBasinaDusen);
      if (buSutundakiSoruSayisi <= 0) continue;
      try {
        const sutun = LE.dersSutunuHesapla({
          x: og.x + s * (sutunGenislik + sutunlarArasiBosluk),
          y: og.y + (kaymalar[s] || 0),
          width: sutunGenislik,
          dersAdi: dersAdiIcin,
          soruSayisi: buSutundakiSoruSayisi,
          baslangicSoruNo: s * soruBasinaDusen + 1,
          sikSayisi: og.sikSayisi,
          baloncukCap: cap,
          aralikCarpani: yatay,
          dikeyAralikCarpani: og.dikeyAralikCarpani || 1.3,
          baslikYuksekligi,
          baslikFontPt,
          baslikAltBosluk,
        });
        sutun.dersAdiHizalama = og.dersAdiHizalama || 'orta';
        sutun.baslikFontPt = baslikFontPt;
        sutunlar.push(sutun);
      } catch (e) {
        // Geçersiz kombinasyon — önizlemede sessizce atla
      }
    }
    return sutunlar;
  }

  // Standart kağıt boyutları (mm) — Sedat'ın isteği: "bazı formlar A4 bazıları
  // A5 bazıları A8 bile olabilir". A8 GERÇEKTEN çok küçük (bkz. UYARI aşağıda),
  // yine de seçenek olarak bırakıldı — engellemek yerine kullanıcıyı bilgilendirmek
  // tercih edildi.
  const KAGIT_BOYUTLARI = {
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    A6: { width: 105, height: 148 },
    A7: { width: 74, height: 105 },
    A8: { width: 52, height: 74 },
  };
  // Köşe hizalama işaretleri için gereken minimum güvenli kenar boşluğu
  // (layoutEngine.js: KOSE_GUVENLI_PAY) — küçük kağıtlarda kullanılabilir
  // alanın ne kadar dar kaldığını kullanıcıya göstermek için.
  const KOSE_GUVENLI_PAY_MM = 9; // layoutEngine.js ile senkron (eski: 12mm)

  function OptikSablonEditor_baslat(container, secenekler) {
    secenekler = secenekler || {};
    let sablon = secenekler.baslangicSablonu
      ? derinKopya(secenekler.baslangicSablonu)
      : { versiyon: 1, ad: 'Yeni Şablon', sinavTuru: 'ozel', sayfaBoyutu: LE.A4, ogeler: [] };
    const kaydetCallback = secenekler.kaydet || null;

    let seciliId = null;
    const gecmis = []; // undo yığını (snapshot)
    const ileri = [];  // redo yığını

    // ---- Kök DOM iskeleti ----
    container.innerHTML = '';
    const kok = document.createElement('div');
    kok.className = 'osEditor';
    kok.innerHTML = `
      <style>
        /* YENİDEN TASARIM (Sedat geri bildirimi, Ağustos 2026: "3 sabit
           kutucuk (araçlar/panel/tuval) her biri kendi içinde kayıyor,
           işi zorlaştırıyor; tuval tam sayfa olsa, öğe ayarları farklı
           bir yerde/şekilde açılsa") — eski tasarımda araç çubuğu ve öğe
           ayarları paneli SABİT yükseklikli, tuvalin üstünde yer kaplayan
           iki ayrı kutucuktu (34vh + 38vh) ve tuvale sadece kalan dar bir
           alan kalıyordu. Yeni tasarımda:
           1) Üst bar TEK SATIR, taşarsa kendi içinde YATAY kayıyor —
              öğe ekleme ve kağıt boyutu ayrı açılır kutulara (popover)
              taşındı, dikey yer kaplamıyor.
           2) Tuval (osEditor__tuvalSarici) kalan TÜM dikey alanı dolduruyor
              — artık pratikte tam sayfa.
           3) Öğe ayarları paneli artık akışta sabit bir kutucuk DEĞİL,
              tuvalin ÜZERİNE alttan açılan bir "bottom sheet" — öğe
              seçilince kayarak açılıyor, ✕ Kapat'a basılınca veya boş
              alana dokununca kayarak kapanıyor, tuval boyutunu ETKİLEMİYOR.
        */
        .osEditor { display:flex; flex-direction:column; height:100%; font-family:inherit; position:relative; overflow:clip; /* overflow:clip = absolute children taşmaz ama sadece içerik kesilir, menü satırları flex akışında olduğu için bundan etkilenmez */ }
        .osEditor__topbar { display:flex; align-items:center; gap:6px; padding:6px 8px; background:#f3f3f5; border-bottom:1px solid #ddd; overflow-x:auto; -webkit-overflow-scrolling:touch; flex:0 0 auto; }
        .osEditor__topbar button { flex:0 0 auto; min-height:40px; padding:0 12px; border-radius:8px; border:1px solid #ccc; background:#fff; font-size:13px; white-space:nowrap; }
        .osEditor__topbar button:active { background:#e8e8ea; }
        .osEditor__adInput { flex:1 1 120px; min-width:90px; min-height:40px; box-sizing:border-box; border:1px solid #ccc; border-radius:6px; padding:4px 8px; font-size:14px; }
        .osEditor__kaydetBtn, .osEditor__topbar .osEditor__kaydetBtn { background:#0a7cff !important; color:#fff !important; border-color:#0a7cff !important; }
        .osEditor__varsayilanLabel { display:flex; align-items:center; gap:4px; font-size:12px; color:#555; padding:0 4px; flex:0 0 auto; white-space:nowrap; }
        .osEditor__popoverSarici { position:relative; flex:0 0 auto; }
        /* Menü satırı: topbar'ın ALTINDA akış içinde — açılınca tuval aşağı kayar */
        .osEditor__menuSatiri { display:none; flex-wrap:wrap; gap:6px; padding:6px 8px 8px; background:#f3f3f5; border-bottom:1px solid #ddd; flex:0 0 auto; }
        .osEditor__menuSatiri--acik { display:flex; }
        .osEditor__menuSatiri button { min-height:40px; padding:0 12px; border-radius:8px; border:1px solid #ccc; background:#fff; font-size:13px; white-space:nowrap; }
        .osEditor__menuSatiri button:active { background:#e8e8ea; }
        .osEditor__menuSatiri select, .osEditor__menuSatiri input[type=number] { min-height:36px; border:1px solid #ccc; border-radius:6px; padding:2px 6px; box-sizing:border-box; font-size:13px; }
        /* Eski mutlak-konumlu popover (artık kullanılmıyor, geriye uyumluluk için boş bırakıldı) */
        .osEditor__popover { display:none; }
        .osEditor__popover--acik { display:block; }
        /* eski popover--oge / popover--sayfa stilleri menuSatiri'ye taşındı */
        .osEditor__tuvalSarici { flex:1 1 0; min-height:0; overflow:auto; background:#7a7a85; display:flex; align-items:flex-start; justify-content:center; padding:12px; touch-action: pan-x pan-y pinch-zoom; }
        .osEditor__tuval { background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.3); }
        /* Öğe ayarları — alttan açılan sabit-olmayan sayfa (bottom sheet) */
        .osEditor__panel { position:fixed; left:0; right:0; bottom:0; background:#fafafa; border-top:1px solid #ddd; border-radius:14px 14px 0 0; box-shadow:0 -6px 20px rgba(0,0,0,.25); overflow-y:auto; max-height:40vh; padding:10px; font-size:13px; transform:translateY(105%); transition:transform .22s ease; z-index:30; }
        .osEditor__panel--gorunur { display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; transform:translateY(0); }
        .osEditor__panelBaslikSatiri { display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom:2px; }
        .osEditor__panelBaslikSatiri h4 { margin:0; font-size:14px; color:#333; }
        .osEditor__panelKapatBtn { min-height:34px; padding:0 12px; border-radius:8px; border:1px solid #ccc; background:#fff; font-size:13px; }
        .osEditor__alan { margin-bottom:8px; width:140px; }
        .osEditor__alan label { display:block; font-size:11px; color:#777; margin-bottom:2px; }
        .osEditor__alan input, .osEditor__alan select { width:100%; box-sizing:border-box; min-height:36px; padding:4px 6px; border:1px solid #ccc; border-radius:6px; font-size:13px; }
        .osEditor__silBtn { min-height:40px; padding:0 14px; margin-top:2px; background:#fde8e8; border:1px solid #f0b8b8; color:#a33; border-radius:8px; align-self:flex-end; }
        .osOge { cursor:grab; touch-action:none; }
        /* YENİ (Sedat geri bildirimi, Ağustos 2026: "hâlâ takıla takıla
           sürükleniyor") — sürüklerken çok-daireli baloncuk blokları gibi
           ağır öğelerin TÜM içeriğini her karede yeniden boyamak yerine,
           sadece hafif bir çerçeve gösteriyoruz; asıl içerik sürükleme
           bitince tek seferde yeniden çiziliyor. */
        .osOge--suruklemede circle, .osOge--suruklemede > text { display:none; }
        .osOge--suruklemede .osOge__cerceve { stroke-width:0.6; stroke:#0a7cff; fill:rgba(10,124,255,0.10); }
        .osOge--secili rect.osOge__cerceve { stroke:#0a7cff; stroke-width:0.6; }
        .osOge__tutamac { fill:#0a7cff; cursor:nwse-resize; touch-action:none; }
        /* Tam Ekran: üst bar tamamen gizlenir (öğe ayarları paneli artık
           tuvalin üzerine bindiği için tam ekranda da AÇILABİLİR —
           eskiden tam ekranda panel hiç açılamıyordu, ayar yapmak için
           tam ekrandan çıkmak gerekiyordu). */
        .osEditor--tamEkran .osEditor__topbar { display:none; }
        .osEditor--tamEkran .osEditor__menuSatiri { display:none !important; }
        .osEditor__tamEkranCikisBtn { position:fixed; top:8px; right:8px; z-index:35; display:none; min-height:38px; padding:0 14px; background:#0a7cff; color:#fff; border:none; border-radius:20px; font-size:13px; box-shadow:0 2px 10px rgba(0,0,0,.3); }
        .osEditor--tamEkran .osEditor__tamEkranCikisBtn { display:block; }
      </style>
      <div class="osEditor__topbar">
        <input type="text" class="osEditor__adInput" placeholder="Form adı (ör. 8. Sınıf Deneme-3)">
        <div class="osEditor__popoverSarici">
          <button class="osEditor__ekleBtn" type="button">+ Ekle ▾</button>
          <div class="osEditor__popover osEditor__popover--oge"></div>
        </div>
        <button class="osEditor__geriAlBtn" type="button">↶ Geri Al</button>
        <button class="osEditor__ileriAlBtn" type="button">↷ İleri Al</button>
        <button class="osEditor__zoomAzaltBtn" type="button">－</button>
        <button class="osEditor__zoomArtirBtn" type="button">＋</button>
        <div class="osEditor__popoverSarici">
          <button class="osEditor__sayfaBtn" type="button">⚙ Sayfa</button>
          <div class="osEditor__popover osEditor__popover--sayfa"></div>
        </div>
        <label class="osEditor__varsayilanLabel" style="display:none;">
          <input type="checkbox" class="osEditor__varsayilanCheckbox"> Varsayılan yap
        </label>
        <button class="osEditor__kaydetBtn" type="button" style="display:none;">💾 Kaydet</button>
        <button class="osEditor__tamEkranBtn" type="button">⛶ Tam Ekran</button>
      </div>
      <!-- Menü satırları: topbar'ın altında akış içinde — açılınca tuval aşağı kayar -->
      <div class="osEditor__menuSatiri osEditor__menuSatiri--oge"></div>
      <div class="osEditor__menuSatiri osEditor__menuSatiri--sayfa"></div>
      <button class="osEditor__tamEkranCikisBtn" type="button">✕ Küçült</button>
      <div class="osEditor__tuvalSarici"><svg class="osEditor__tuval"></svg></div>
      <div class="osEditor__panel"></div>
    `;
    container.appendChild(kok);

    const topbar = kok.querySelector('.osEditor__topbar');
    const svg = kok.querySelector('.osEditor__tuval');
    const panel = kok.querySelector('.osEditor__panel');
    const tuvalSarici = kok.querySelector('.osEditor__tuvalSarici');
    // NOT: eski tasarımda tuvalSarici'yi saran ayrı bir kaydırılabilir
    // .osEditor__govde kutusu vardı (öğe ayarları paneli onunla aynı akışta,
    // üstünde sıralıydı) — bu, iç içe iki kaydırma konteyneri anlamına
    // geliyordu ve WebView'da sürükleme sırasında touch-action kilidinin
    // ikisine de uygulanması gerekiyordu (bkz. eski sürüm notu). Panel artık
    // akışta değil, tuvalin ÜZERİNE mutlak konumlanan bir bottom sheet
    // olduğundan govde'ye hiç gerek kalmadı — tuvalSarici TEK kaydırma
    // konteyneri, kilit de sadece ona uygulanıyor.
    const ekleBtn = kok.querySelector('.osEditor__ekleBtn');
    const eklePopover = kok.querySelector('.osEditor__menuSatiri--oge');   // artık akış içinde
    const sayfaBtn = kok.querySelector('.osEditor__sayfaBtn');
    const sayfaPopover = kok.querySelector('.osEditor__menuSatiri--sayfa'); // artık akış içinde
    const geriAlBtnEl = kok.querySelector('.osEditor__geriAlBtn');
    const ileriAlBtnEl = kok.querySelector('.osEditor__ileriAlBtn');
    const zoomAzaltBtnEl = kok.querySelector('.osEditor__zoomAzaltBtn');
    const zoomArtirBtnEl = kok.querySelector('.osEditor__zoomArtirBtn');
    const kaydetBtnEl = kok.querySelector('.osEditor__kaydetBtn');
    const varsayilanLabelEl = kok.querySelector('.osEditor__varsayilanLabel');
    const varsayilanCheckboxEl = kok.querySelector('.osEditor__varsayilanCheckbox');
    const tamEkranBtn = kok.querySelector('.osEditor__tamEkranBtn');
    const tamEkranCikisBtn = kok.querySelector('.osEditor__tamEkranCikisBtn');
    const adInput = kok.querySelector('.osEditor__adInput');

    // ---- Açılır kutular (popover): aynı anda sadece biri açık olsun,
    // dışına dokununca kapansın ----
    // ---- Menü satırları (akış içinde — açılınca tuval aşağı kayar) ----
    function menuKapat(haric) {
      [eklePopover, sayfaPopover].forEach((m) => { if (m !== haric) m.classList.remove('osEditor__menuSatiri--acik'); });
    }
    function menuAcKapa(menu) {
      const acikMi = menu.classList.contains('osEditor__menuSatiri--acik');
      menuKapat(menu);
      menu.classList.toggle('osEditor__menuSatiri--acik', !acikMi);
    }
    ekleBtn.addEventListener('click', (ev) => { ev.stopPropagation(); menuAcKapa(eklePopover); });
    sayfaBtn.addEventListener('click', (ev) => { ev.stopPropagation(); menuAcKapa(sayfaPopover); });
    document.addEventListener('click', (ev) => {
      if (!kok.isConnected) return;
      // Topbar'a veya menü satırına tıklanırsa kapatma
      if (ev.target.closest && (ev.target.closest('.osEditor__topbar') || ev.target.closest('.osEditor__menuSatiri'))) return;
      menuKapat(null);
    });
    // Eski adlarla uyumluluk (eklePopover.classList.remove... çağrıları için)
    function digerPopovariKapat(haric) { menuKapat(haric); }

    // ---- Form adı (Sedat isteği: "Forma isim verme de olsun") ----
    adInput.value = sablon.ad || '';
    adInput.addEventListener('change', () => { sablon.ad = adInput.value || 'Adsız Şablon'; });

    // YENİ (Sedat isteği, Ağustos 2026: "Yeni eklenen öğe boş alana eklense
    // daha kolay taşınır") — yeni öğe her zaman AYNI sabit konumda
    // doğmuyor artık; mevcut öğelerle çakışmayan bir yer aranıyor,
    // bulunamazsa kademeli (basamak basamak) kaydırılıyor.
    function bosAlanBul(yeniOg) {
      if (yeniOg.tip === 'cizgi') return; // çizginin kendi konum mantığı ayrı, basitlik için dokunulmuyor
      const boyut = ogeYaklasikBoyut(yeniOg);
      const adim = 12; // mm
      const pay = KOSE_GUVENLI_PAY_MM;
      const cakisiyorMu = (x, y) => sablon.ogeler.some((mevcut) => {
        if (mevcut.tip === 'cizgi') return false;
        const mBoyut = ogeYaklasikBoyut(mevcut);
        return !(x + boyut.w < mevcut.x || mevcut.x + mBoyut.w < x || y + boyut.h < mevcut.y || mevcut.y + mBoyut.h < y);
      });
      let x = yeniOg.x, y = yeniOg.y;
      for (let i = 0; i < 60; i++) {
        const sayfaDisinda = x + boyut.w > sablon.sayfaBoyutu.width - pay || y + boyut.h > sablon.sayfaBoyutu.height - pay;
        if (!sayfaDisinda && !cakisiyorMu(x, y)) { yeniOg.x = x; yeniOg.y = y; return; }
        x += adim;
        if (x + boyut.w > sablon.sayfaBoyutu.width - pay) { x = pay; y += adim; }
        if (y + boyut.h > sablon.sayfaBoyutu.height - pay) { y = pay; } // sayfa dolduysa baştan sar
      }
    }

    Object.keys(OGE_VARSAYILANLARI).forEach((tip) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = '+ ' + OGE_ETIKETLERI[tip];
      b.addEventListener('click', () => {
        gecmiseKaydet();
        const og = OGE_VARSAYILANLARI[tip]();
        og.id = yeniId();
        bosAlanBul(og);
        sablon.ogeler.push(og);
        seciliId = og.id;
        eklePopover.classList.remove('osEditor__menuSatiri--acik'); // ekleyince menü kapansın
        ciz();
      });
      eklePopover.appendChild(b);
    });

    geriAlBtnEl.addEventListener('click', () => {
      if (!gecmis.length) return;
      ileri.push(derinKopya(sablon));
      sablon = gecmis.pop();
      seciliId = null;
      ciz();
    });
    ileriAlBtnEl.addEventListener('click', () => {
      if (!ileri.length) return;
      gecmis.push(derinKopya(sablon));
      sablon = ileri.pop();
      seciliId = null;
      ciz();
    });
    let varsayilanYapilsinMi = false;
    if (kaydetCallback) {
      varsayilanLabelEl.style.display = '';
      varsayilanCheckboxEl.checked = !!secenekler.varsayilanMi;
      varsayilanYapilsinMi = varsayilanCheckboxEl.checked;
      varsayilanCheckboxEl.addEventListener('change', () => { varsayilanYapilsinMi = varsayilanCheckboxEl.checked; });

      kaydetBtnEl.style.display = '';
      kaydetBtnEl.addEventListener('click', async () => {
        if (!adInput.value.trim()) {
          alert('Kaydetmeden önce forma bir isim ver.');
          adInput.focus();
          return;
        }
        sablon.ad = adInput.value.trim();
        try {
          Motoru.sablonuDogrula(sablon);
        } catch (e) {
          alert('Kaydedilemedi: ' + e.message);
          return;
        }
        kaydetBtnEl.disabled = true;
        const eskiMetin = kaydetBtnEl.textContent;
        kaydetBtnEl.textContent = 'Kaydediliyor...';
        try {
          await kaydetCallback(derinKopya(sablon), varsayilanYapilsinMi);
          kaydetBtnEl.textContent = '✓ Kaydedildi';
          setTimeout(() => { kaydetBtnEl.textContent = eskiMetin; kaydetBtnEl.disabled = false; }, 2000);
        } catch (hata) {
          alert('Kaydetme hatası: ' + hata.message);
          kaydetBtnEl.textContent = eskiMetin;
          kaydetBtnEl.disabled = false;
        }
      });
    }
    // Tam Ekran: topbar tamamen gizlenip (bkz. CSS) yerine köşede tek bir
    // "Küçült" düğmesi çıkıyor — giriş/çıkış artık İKİ AYRI düğme (topbar'daki
    // ve köşedeki), tek düğmenin metnini değiştirip toggle etmeye gerek yok.
    tamEkranBtn.addEventListener('click', () => {
      kok.classList.add('osEditor--tamEkran');
      digerPopovariKapat(null);
      requestAnimationFrame(viewBoxAyarla);
    });
    tamEkranCikisBtn.addEventListener('click', () => {
      kok.classList.remove('osEditor--tamEkran');
      requestAnimationFrame(viewBoxAyarla);
    });

    // ---- Kağıt boyutu seçici (Sedat isteği, Ağustos 2026) — artık "⚙ Sayfa"
    // açılır kutusunun içinde, üst barda kalıcı yer kaplamıyor ----
    const kagitSatiri = sayfaPopover;
    kagitSatiri.innerHTML = '<div style="font-size:12px; color:#555; margin-bottom:2px;">Kağıt Boyutu</div>';
    const kagitSelect = document.createElement('select');
    Object.keys(KAGIT_BOYUTLARI).forEach((ad) => {
      const o = document.createElement('option');
      o.value = ad; o.textContent = `${ad} (${KAGIT_BOYUTLARI[ad].width}×${KAGIT_BOYUTLARI[ad].height}mm)`;
      kagitSelect.appendChild(o);
    });
    const ozelOpt = document.createElement('option');
    ozelOpt.value = 'ozel'; ozelOpt.textContent = 'Özel Boyut';
    kagitSelect.appendChild(ozelOpt);

    // YENİ (Sedat isteği): Yatay/Dikey yön seçici — KAGIT_BOYUTLARI hep
    // DİKEY (portre, width<height) olarak tanımlı; yön sadece width/height'i
    // yer değiştiriyor, ayrı bir veri modeli gerekmiyor.
    const yonSelect = document.createElement('select');
    ['dikey', 'yatay'].forEach((y) => {
      const o = document.createElement('option');
      o.value = y; o.textContent = y === 'dikey' ? '↕ Dikey' : '↔ Yatay';
      yonSelect.appendChild(o);
    });

    const ozelGenislikInput = document.createElement('input');
    ozelGenislikInput.type = 'number'; ozelGenislikInput.min = 20; ozelGenislikInput.placeholder = 'Genişlik mm';
    ozelGenislikInput.style.display = 'none';
    const ozelYukseklikInput = document.createElement('input');
    ozelYukseklikInput.type = 'number'; ozelYukseklikInput.min = 20; ozelYukseklikInput.placeholder = 'Yükseklik mm';
    ozelYukseklikInput.style.display = 'none';

    const kagitUyariEl = document.createElement('span');
    kagitUyariEl.style.cssText = 'color:#a33; font-size:11px;';

    function mevcutYon() {
      return sablon.sayfaBoyutu.width > sablon.sayfaBoyutu.height ? 'yatay' : 'dikey';
    }

    function mevcutBoyutAdiBul() {
      const w = sablon.sayfaBoyutu.width, h = sablon.sayfaBoyutu.height;
      const eslesen = Object.keys(KAGIT_BOYUTLARI).find((ad) => {
        const b = KAGIT_BOYUTLARI[ad];
        return (b.width === w && b.height === h) || (b.width === h && b.height === w);
      });
      return eslesen || 'ozel';
    }

    function kagitUyarisiniGuncelle() {
      const kullanilabilirGenislik = sablon.sayfaBoyutu.width - 2 * KOSE_GUVENLI_PAY_MM;
      const kullanilabilirYukseklik = sablon.sayfaBoyutu.height - 2 * KOSE_GUVENLI_PAY_MM;
      if (kullanilabilirGenislik < 20 || kullanilabilirYukseklik < 20) {
        kagitUyariEl.textContent = `⚠ Kullanılabilir alan sadece ~${Math.max(0, kullanilabilirGenislik).toFixed(0)}×${Math.max(0, kullanilabilirYukseklik).toFixed(0)}mm — çok az baloncuk sığar.`;
      } else {
        kagitUyariEl.textContent = '';
      }
    }

    function sayfaBoyutunuUygula(genislik, yukseklik) {
      gecmiseKaydet();
      sablon.sayfaBoyutu = { width: genislik, height: yukseklik };
      kagitUyarisiniGuncelle();
      ciz();
    }

    kagitSelect.value = mevcutBoyutAdiBul();
    yonSelect.value = mevcutYon();
    ozelGenislikInput.style.display = kagitSelect.value === 'ozel' ? '' : 'none';
    ozelYukseklikInput.style.display = kagitSelect.value === 'ozel' ? '' : 'none';
    ozelGenislikInput.value = sablon.sayfaBoyutu.width;
    ozelYukseklikInput.value = sablon.sayfaBoyutu.height;

    kagitSelect.addEventListener('change', () => {
      const yon = yonSelect.value;
      if (kagitSelect.value === 'ozel') {
        ozelGenislikInput.style.display = '';
        ozelYukseklikInput.style.display = '';
        sayfaBoyutunuUygula(parseFloat(ozelGenislikInput.value) || 100, parseFloat(ozelYukseklikInput.value) || 150);
      } else {
        ozelGenislikInput.style.display = 'none';
        ozelYukseklikInput.style.display = 'none';
        const b = KAGIT_BOYUTLARI[kagitSelect.value];
        sayfaBoyutunuUygula(yon === 'yatay' ? b.height : b.width, yon === 'yatay' ? b.width : b.height);
      }
    });
    yonSelect.addEventListener('change', () => {
      // Mevcut genişlik/yüksekliği (standart VEYA özel fark etmeksizin) yer değiştir.
      sayfaBoyutunuUygula(sablon.sayfaBoyutu.height, sablon.sayfaBoyutu.width);
      ozelGenislikInput.value = sablon.sayfaBoyutu.width;
      ozelYukseklikInput.value = sablon.sayfaBoyutu.height;
    });
    [ozelGenislikInput, ozelYukseklikInput].forEach((input) => {
      input.addEventListener('change', () => {
        sayfaBoyutunuUygula(parseFloat(ozelGenislikInput.value) || sablon.sayfaBoyutu.width, parseFloat(ozelYukseklikInput.value) || sablon.sayfaBoyutu.height);
        yonSelect.value = mevcutYon();
      });
    });

    kagitSatiri.appendChild(kagitSelect);
    kagitSatiri.appendChild(yonSelect);
    kagitSatiri.appendChild(ozelGenislikInput);
    kagitSatiri.appendChild(ozelYukseklikInput);
    kagitSatiri.appendChild(kagitUyariEl);
    kagitUyarisiniGuncelle();

    function gecmiseKaydet() {
      gecmis.push(derinKopya(sablon));
      ileri.length = 0; // yeni bir işlem yapıldığında redo geçmişi geçersiz
      if (gecmis.length > 50) gecmis.shift(); // bellek için sınırlı geçmiş
    }

    // ---- Yakınlaştırma (Sedat isteği: "parmakla yaklaştırma uzaklaştırma
    // olsun") — WebView'larda tarayıcının kendi pinch-zoom'u genelde kapalı
    // olduğu için burada JS ile kendi pinch-zoom'umuzu uyguluyoruz. Ayrıca
    // güvenilir bir yedek olarak araç çubuğuna +/- düğmeleri de eklendi.
    let zoomOlcek = 1;
    const ZOOM_MIN = 0.4, ZOOM_MAX = 3;

    // ---- Tuval boyutu (viewBox = mm cinsinden sayfa + pay) ----
    function temelGenislikPx() {
      const w = sablon.sayfaBoyutu.width + 2 * MM_VIEWBOX_PAY;
      const h = sablon.sayfaBoyutu.height + 2 * MM_VIEWBOX_PAY;
      if (kok.classList.contains('osEditor--tamEkran')) {
        // Tam ekranda: sayfanın TAMAMI (kaydırma gerekmeden) sığsın diye
        // hem genişlik hem yükseklik sınırına göre ölçekleniyor.
        const mevcutGenislik = tuvalSarici.clientWidth - 24; // padding payı
        const mevcutYukseklik = tuvalSarici.clientHeight - 24;
        const olcekGenislik = mevcutGenislik / w;
        const olcekYukseklik = mevcutYukseklik / h;
        return w * Math.min(olcekGenislik, olcekYukseklik);
      }
      return Math.min(window.innerWidth * 0.92, w * 3.2);
    }

    function viewBoxAyarla() {
      const w = sablon.sayfaBoyutu.width + 2 * MM_VIEWBOX_PAY;
      const h = sablon.sayfaBoyutu.height + 2 * MM_VIEWBOX_PAY;
      svg.setAttribute('viewBox', `${-MM_VIEWBOX_PAY} ${-MM_VIEWBOX_PAY} ${w} ${h}`);
      svg.style.width = (temelGenislikPx() * zoomOlcek) + 'px';
      svg.style.height = 'auto';
    }

    function zoomUygula(yeniOlcek) {
      zoomOlcek = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, yeniOlcek));
      viewBoxAyarla();
    }

    zoomAzaltBtnEl.addEventListener('click', () => zoomUygula(zoomOlcek - 0.2));
    zoomArtirBtnEl.addEventListener('click', () => zoomUygula(zoomOlcek + 0.2));

    // İki parmakla pinch-zoom (best-effort — bkz. yukarıdaki not)
    const aktifParmaklar = new Map();
    let pinchBaslangicMesafe = 0;
    let pinchBaslangicOlcek = 1;

    function parmakMesafesi() {
      const noktalar = Array.from(aktifParmaklar.values());
      if (noktalar.length < 2) return 0;
      const dx = noktalar[0].x - noktalar[1].x;
      const dy = noktalar[0].y - noktalar[1].y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    tuvalSarici.addEventListener('pointerdown', (ev) => {
      // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026: "yenileme
      // tetikleniyor") — bkz. dosya başındaki AÇIKLAMA notu: burada tekrar
      // tekrar aç/kapa çağırmak GEREKSİZDİ (araç zaten OptikSistemi.ac()
      // ile TEK seferde kapatılıyor) ve native köprüye giden ekstra
      // çağrılar gecikmeli ulaşınca jesti YANLIŞLIKLA tekrar açabiliyordu.
      aktifParmaklar.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (aktifParmaklar.size === 2) {
        pinchBaslangicMesafe = parmakMesafesi();
        pinchBaslangicOlcek = zoomOlcek;
      }
    });
    tuvalSarici.addEventListener('pointermove', (ev) => {
      if (!aktifParmaklar.has(ev.pointerId)) return;
      aktifParmaklar.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (aktifParmaklar.size === 2 && pinchBaslangicMesafe > 0) {
        ev.preventDefault();
        const yeniMesafe = parmakMesafesi();
        zoomUygula(pinchBaslangicOlcek * (yeniMesafe / pinchBaslangicMesafe));
      }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((olayAdi) => {
      tuvalSarici.addEventListener(olayAdi, (ev) => {
        aktifParmaklar.delete(ev.pointerId);
        if (aktifParmaklar.size < 2) pinchBaslangicMesafe = 0;
        // NOT: pull-to-refresh'i tekrar açma çağrısı artık YUKARIDA
        // (pointerdown içindeki window seviyeli tek seferlik dinleyiciler)
        // yapılıyor — burada TEKRAR çağrılırsa sayaç ÇİFT azalır
        // (over-correct), bu yüzden buradan kaldırıldı.
      });
    });

    // Ekran (px) koordinatını SVG kullanıcı birimine (mm) çevirir — Pointer Events için gerekli.
    // ctmInverse verilirse (sürükleme sırasında) getScreenCTM() TEKRAR ÇAĞRILMAZ —
    // bu fonksiyon senkron layout hesaplaması zorluyor, her pointermove'da
    // çağrılması Android'de asıl yavaşlığın sebebiydi (Sedat geri bildirimi,
    // Ağustos 2026). Sürükleme başında BİR KEZ hesaplanıp önbelleğe alınıyor.
    function ekranNoktasindanMM(clientX, clientY, ctmInverse) {
      const pt = svg.createSVGPoint();
      pt.x = clientX; pt.y = clientY;
      const ters = ctmInverse || (svg.getScreenCTM() && svg.getScreenCTM().inverse());
      if (!ters) return { x: 0, y: 0 };
      const donusmus = pt.matrixTransform(ters);
      return { x: donusmus.x, y: donusmus.y };
    }

    // ---- Sürükleme durumu ----
    let surukleme = null; // {ogeId, tip:'tasi'|'boyutlandir', baslangicMM, ogeBaslangic, gEl, ctmInverse}
    const GRID_MM = 1; // ızgaraya yapışma adımı — hizalamayı kolaylaştırır, çakışmayı azaltır

    function grideYapistir(deger) { return Math.round(deger / GRID_MM) * GRID_MM; }

    // ---- Ana uygulamanın "aşağı çekince yenile" (pull-to-refresh) jestini
    // sürükleme sırasında bastır (Sedat geri bildirimi: "sayfa yenileniyor")
    // — optik modülü ayrı bir iframe'de çalıştığı için ana uygulamanın
    // _pullToRefreshAyarla'sına doğrudan erişemiyoruz, window.parent
    // üzerinden köprü kuruyoruz (bkz. app.js: _uygulamaHtmlYazdirCagir'daki
    // aynı desen). Ana uygulama bu fonksiyonu bulamazsa (bağımsız/eski
    // sayfa senaryosu) sessizce yok sayılır.
    function _pullToRefreshBastir(acikMi) {
      try {
        if (window.parent && window.parent !== window && typeof window.parent._pullToRefreshAyarla === 'function') {
          window.parent._pullToRefreshAyarla(acikMi);
        }
      } catch (e) { /* çapraz pencere erişimi engellenmiş olabilir — sorun değil */ }
    }

    // NOT (Sedat geri bildirimi, Ağustos 2026): _pullToRefreshBastir buradan
    // ve pointerDownOge/pointerDownTutamac/suruklemeBitir'den KALDIRILDI —
    // bkz. yukarıdaki (osEditor__panel tanımının hemen üstündeki) geniş
    // açıklama notu: araç zaten OptikSistemi.ac()/kapat() ile tek seferde
    // kapatılıyor, tekrar tekrar açıp kapamak gecikme yüzünden yenilemeyi
    // yanlışlıkla tekrar açabiliyordu.

    function pointerDownOge(ev, og, gEl) {
      ev.stopPropagation();
      ev.preventDefault(); // KÖK NEDEN DÜZELTMESİ: rakip tarayıcı jestlerinin (kaydırma vb.) touch-action CSS'ine rağmen araya girmesini kesin olarak engeller
      seciliId = og.id;
      const ctmInverse = svg.getScreenCTM().inverse(); // sürüklemenin tamamı için TEK sefer
      const nokta = ekranNoktasindanMM(ev.clientX, ev.clientY, ctmInverse);
      // PERFORMANS: og referansı burada BİR KEZ önbelleğe alınıyor —
      // önceden pointermove'daki her karede sablon.ogeler.find(...) ile
      // yeniden aranıyordu (Sedat geri bildirimi: "çok yavaş hareket
      // ediyor öğeler" — CTM önbelleklemesinden sonra kalan tek gereksiz
      // iş buydu, küçük ama gereksiz).
      surukleme = { ogeId: og.id, tip: 'tasi', baslangicMM: nokta, ogeBaslangic: derinKopya(og), gEl, dx: 0, dy: 0, ctmInverse, ogRef: og };
      svg.setPointerCapture(ev.pointerId);
      // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026: "her mm
      // duruyor, tekrar tutup çekmem lazım") — tuvalSarici'nin
      // touch-action: pan-x pan-y değeri, Android WebView'ın SVG <g>
      // elemanlarındaki touch-action:none'u güvenilir tanımaması nedeniyle
      // sürükleme başladıktan ~1-2 mm sonra pointercancel tetiklenip jesti
      // iptal ediyordu. Dokunuş yakalandığı anda kapsayıcıyı anlık olarak
      // 'none' yaparak tarayıcının jest kararını vermeden önce doğru
      // touch-action'ı görmesi sağlanıyor; suruklemeBitir'de geri alınıyor.
      tuvalSarici.style.touchAction = 'none';
      gEl.classList.add('osOge--suruklemede'); // PERFORMANS: ağır içerik (daireler/metin) sürükleme boyunca gizli
      // NOT: gecmiseKaydet() BURADAN KALDIRILDI — suruklemeBitir'e taşındı.
      // Gerekçe: her dokunuşta (taşıma olmasa bile) tüm sablonun derin
      // kopyasını geri al yığınına itmek gereksizdi; artık yalnızca öğe
      // gerçekten hareket ettiğinde kaydediliyor.
      // NOT: cizPanel() BURADAN KALDIRILDI — panel artık sadece hareketsiz
      // tap (sürükleme olmayan dokunuş) sonrasında açılıyor; suruklemeBitir'de
      // !hareketEtti kontrolüyle tetikleniyor. Böylece sürükleme başlarken
      // panel açılıp alanı kapatmıyor.
    }

    function pointerDownTutamac(ev, og, gEl) {
      ev.stopPropagation();
      ev.preventDefault();
      const ctmInverse = svg.getScreenCTM().inverse();
      const nokta = ekranNoktasindanMM(ev.clientX, ev.clientY, ctmInverse);
      surukleme = { ogeId: og.id, tip: 'boyutlandir', baslangicMM: nokta, ogeBaslangic: derinKopya(og), gEl, ctmInverse, ogRef: og };
      svg.setPointerCapture(ev.pointerId);
      tuvalSarici.style.touchAction = 'none'; // bkz. pointerDownOge'daki kök neden notu
      // boyutlandir için gecmiseKaydet burada kalıyor: pointermove og.genislik/yukseklik'i
      // DOĞRUDAN güncelliyor, dolayısıyla suruklemeBitir'de çağırırsak post-state
      // kaydedilir ve geri al çalışmaz. Taşıma (tasi) içinse pointermove yalnızca
      // CSS transform'u değiştiriyor — model koordinatları suruklemeBitir'e kadar
      // güncellenmediğinden gecmiseKaydet orada (hareketEtti kontrolüyle) çağrılabilir.
      gecmiseKaydet();
    }

    // ---- Güvensiz bölgeye (köşe işaretlerinin oturduğu kenar payı) öğe
    // sürüklenmesini engelleme (Sedat isteği, Ağustos 2026: "öğe olmaması
    // gereken alanlar kilitli kalsın ki oraya öğe gelmesin yanlış okumasın") ----
    function ogeYaklasikBoyut(og) {
      if (og.tip === 'baloncukBlok') {
        const sutunSayisi = og.sutunSayisi || 1;
        const sutunlarArasiBosluk = og.sutunlarArasiBosluk != null ? og.sutunlarArasiBosluk : 3;
        const soruBasinaDusen = Math.ceil(og.soruSayisi / sutunSayisi);
        const w = og.genislik * sutunSayisi + (sutunSayisi - 1) * sutunlarArasiBosluk;
        const h = 8 + 3 + soruBasinaDusen * (og.baloncukCap * 2);
        return { w, h };
      }
      if (og.tip === 'numaraAlani') {
        const hesap = LE.numaraAlaniHesapla(0, 0, og.basamakSayisi || 4, og.olcek || 1, og.yon || 'dikey');
        return { w: hesap.width, h: hesap.height };
      }
      if (og.tip === 'kitapcikAlani') {
        const hesap = LE.kitapcikAlaniHesapla(0, 0, og.secenekSayisi || 4, og.olcek || 1, og.yon || 'dikey');
        return { w: hesap.genislik, h: hesap.height };
      }
      if (og.genislik != null && og.yukseklik != null) return { w: og.genislik, h: og.yukseklik };
      return { w: 20, h: 6 }; // metin vb. — nominal küçük kutu
    }

    /** dx/dy'yi, öğe güvensiz kenar bölgesine (köşe işareti payı) girmeyecek şekilde kısıtlar. */
    function guvenliDxDyKisitla(og, baz, dx, dy) {
      const pay = KOSE_GUVENLI_PAY_MM;
      const sayfaW = sablon.sayfaBoyutu.width, sayfaH = sablon.sayfaBoyutu.height;
      if (og.tip === 'cizgi') {
        const minX = Math.min(baz.x1, baz.x2), maxX = Math.max(baz.x1, baz.x2);
        const minY = Math.min(baz.y1, baz.y2), maxY = Math.max(baz.y1, baz.y2);
        const dxMin = pay - minX, dxMax = (sayfaW - pay) - maxX;
        const dyMin = pay - minY, dyMax = (sayfaH - pay) - maxY;
        return {
          dx: Math.min(Math.max(dx, Math.min(dxMin, dxMax)), Math.max(dxMin, dxMax)),
          dy: Math.min(Math.max(dy, Math.min(dyMin, dyMax)), Math.max(dyMin, dyMax)),
        };
      }
      const { w, h } = ogeYaklasikBoyut(og);
      const xMin = pay, xMax = Math.max(pay, sayfaW - pay - w);
      const yMin = pay, yMax = Math.max(pay, sayfaH - pay - h);
      const yeniX = Math.min(Math.max(baz.x + dx, xMin), xMax);
      const yeniY = Math.min(Math.max(baz.y + dy, yMin), yMax);
      return { dx: yeniX - baz.x, dy: yeniY - baz.y };
    }

    // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026: "her mm
    // duruyor, tekrar tutup çekmem lazım" — birden fazla hedefli düzeltme
    // denendi, sonuç değişmedi) — requestAnimationFrame ile olay biriktirme
    // (kare başına en son konumu kullanma) bu WebView'da dokunma/pointer
    // olay döngüsüyle güvenilir etkileşmiyor olabilir; rAF'ın kendisi
    // şüpheli hale geldi. Daha temel bir yaklaşıma geçildi: HER pointermove
    // olayında DOĞRUDAN/senkron güncelleme — kare biriktirme YOK. Önceki
    // optimizasyonlar (og önbelleklenmesi, ağır içeriğin sürüklerken
    // gizlenmesi) kare başına maliyeti zaten düşürdüğünden, senkron
    // güncelleme de akıcı olmalı; asıl kazanç, rAF'ın kendisinin yarattığı
    // (varsa) olay-işleme etkileşim sorununu tamamen ortadan kaldırması.
    svg.addEventListener('pointermove', (ev) => {
      if (!surukleme) return;
      ev.preventDefault(); // bkz. pointerDownOge'daki kök neden notu — rakip jestleri kesin engelle
      const nokta = ekranNoktasindanMM(ev.clientX, ev.clientY, surukleme.ctmInverse);
      // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026: "öğeler
      // tuvalde piksel piksel hareket ediyor") — önceden ızgaraya
      // yapıştırma (1mm) SÜRÜKLEME SIRASINDA her karede uygulanıyordu,
      // bu da hareketi "zıplayarak" hissettiriyordu. Artık sürüklerken
      // TAMAMEN SERBEST/akıcı hareket ediyor.
      let dx = nokta.x - surukleme.baslangicMM.x;
      let dy = nokta.y - surukleme.baslangicMM.y;

      if (surukleme.tip === 'tasi') {
        const og = surukleme.ogRef;
        if (og) {
          const kisitli = guvenliDxDyKisitla(og, surukleme.ogeBaslangic, dx, dy);
          dx = kisitli.dx; dy = kisitli.dy;
        }
        surukleme.dx = dx; surukleme.dy = dy;
        if (surukleme.gEl) surukleme.gEl.setAttribute('transform', `translate(${dx},${dy})`);
      } else if (surukleme.tip === 'boyutlandir') {
        const og = surukleme.ogRef;
        if (!og) return;
        const baz = surukleme.ogeBaslangic;
        if (og.tip === 'baloncukBlok' || og.genislik != null) {
          og.genislik = Math.max(og.tip === 'baloncukBlok' ? 15 : 8, baz.genislik + dx);
          if (og.yukseklik != null) og.yukseklik = Math.max(5, baz.yukseklik + dy);
        }
        cizSadeceTuval();
      }
    });

    function suruklemeBitir() {
      if (!surukleme) return;
      // KÖK NEDEN DÜZELTMESİ — pointerDownOge'da kilitlenen touch-action'ı
      // her zaman (taşıma, boyutlandırma, iptal) geri al; böylece bir
      // sonraki sürükleme öncesi kapsayıcı normal pan davranışına döner.
      tuvalSarici.style.touchAction = '';
      if (surukleme.tip === 'tasi') {
        const og = surukleme.ogRef;
        const baz = surukleme.ogeBaslangic;
        if (og) {
          const hareketEtti = surukleme.dx !== 0 || surukleme.dy !== 0;
          // gecmiseKaydet BURAYA TAŞINDI (pointerDownOge'dan): yalnızca
          // öğe gerçekten hareket ettiğinde geri al yığınına ekleniyor.
          if (hareketEtti) gecmiseKaydet();
          // Panel açma: sadece hareketsiz tap ise aç (sürükleme ise kapalı kalsın)
          if (!hareketEtti) requestAnimationFrame(cizPanel);
          // YENİ (Sedat isteği, Ağustos 2026: "Izgara işini iptal et") —
          // artık bırakıldığında da ızgaraya yapıştırma YOK, öğe tam
          // bırakıldığı noktada kalıyor.
          if (og.tip === 'cizgi') {
            og.x1 = baz.x1 + surukleme.dx; og.y1 = baz.y1 + surukleme.dy;
            og.x2 = baz.x2 + surukleme.dx; og.y2 = baz.y2 + surukleme.dy;
          } else {
            og.x = Math.max(0, baz.x + surukleme.dx);
            og.y = Math.max(0, baz.y + surukleme.dy);
          }
        }
        cizSadeceTuval();
      }
      // boyutlandir dalında burada ek işlem yok: pointermove koordinatları ve
      // tuval çizimini zaten yaptı; gecmiseKaydet pointerDownTutamac'ta çağrıldı.
      surukleme = null;
    }
    svg.addEventListener('pointerup', suruklemeBitir);
    svg.addEventListener('pointercancel', suruklemeBitir);

    // KÖK NEDEN DÜZELTMESİ — ASIL KATMAN (Sedat geri bildirimi: "her
    // kaydırmada en fazla 10 değişiyor") — Android WebView tarayıcı jest
    // kararını (pan/scroll mu, özel sürükleme mi?) touchstart katmanında,
    // pointer event'lerden ÖNCE veriyor.
    //
    // Bu yüzden:
    //   • ev.preventDefault() in pointerdown  → GEÇ KALIYOR
    //   • tuvalSarici.style.touchAction='none' → GEÇ KALIYOR
    //   (her ikisi de pointer event döngüsünde çalışıyor, jest kararı
    //    o noktada zaten verilmiş oluyor — tarayıcı ~10 mm sonra
    //    pointercancel göndererek sürüklemeyi bitiriyor)
    //
    // Çözüm: touchstart dinleyicisine { passive: false } ile preventDefault()
    // — bu DOĞRUDAN touch event katmanında, jest kararı verilmeden iptal eder.
    // Sadece .osOge ve .osOge__tutamac üzerine dokunulduğunda tetikleniyor;
    // boş alana dokunma (tuval kaydırma) etkilenmiyor.
    svg.addEventListener('touchstart', (ev) => {
      const hedef = ev.target;
      if (hedef && hedef.closest && hedef.closest('.osOge, .osOge__tutamac')) {
        ev.preventDefault();
      }
    }, { passive: false });

    svg.addEventListener('pointerdown', (ev) => {
      // Boş alana tıklandıysa seçimi kaldır
      if (ev.target === svg || ev.target.classList.contains('osTuvalArkaplan')) { seciliId = null; cizPanel(); cizSadeceTuval(); }
    });

    // ---- Çizim ----
    function ciz() { viewBoxAyarla(); cizSadeceTuval(); cizPanel(); }

    function cizSadeceTuval() {
      svg.innerHTML = '';
      const bolge = { x: 0, y: 0, width: sablon.sayfaBoyutu.width, height: sablon.sayfaBoyutu.height };

      // Sayfa sınırı
      svg.appendChild(svgOlustur('rect', {
        class: 'osTuvalArkaplan', x: 0, y: 0, width: sablon.sayfaBoyutu.width, height: sablon.sayfaBoyutu.height,
        fill: '#fff', stroke: '#999', 'stroke-width': 0.3,
      }));

      // YENİ (Sedat geri bildirimi, Ağustos 2026): gerçek çıktıda basılan
      // köşe hizalama kareleri + çerçeve çizgisi (bkz. pdfFormGenerator.js:
      // hizalamaIsaretleriCiz) — önceden editörde hiç ÇİZİLMİYORDU (sadece
      // PDF'e basılıyordu), bu da bir öğeyi yanlışlıkla bu bölgeye
      // yerleştirip fark etmemeyi kolaylaştırıyordu. Artık hem GÜVENSİZ
      // bölge (köşe karelerinin oturduğu kenar payı) hafif kırmızı taranarak
      // gösteriliyor, hem de kareler/çerçeve gerçek konumlarında çiziliyor.
      const guvenliPay = KOSE_GUVENLI_PAY_MM;
      if (sablon.sayfaBoyutu.width > 2 * guvenliPay && sablon.sayfaBoyutu.height > 2 * guvenliPay) {
        // GÜVENSİZ bölge: sayfa kenarından guvenliPay mm içerideki sınır.
        // Eski tasarım: guvenliPay mm (12mm) kalınlığında kırmızı stroke
        // görsel olarak içerik alanını çok dar gösteriyordu.
        // Yeni tasarım: yalnızca ince kesik kırmızı çizgi — gerçek sınırı
        // net gösterir ama içerik alanı açık ve geniş görünür.
        // Yalnızca ince kesik çizgi — içerik sınırını gösterir, kenar bandını doldurmaz.
        svg.appendChild(svgOlustur('rect', {
          x: guvenliPay, y: guvenliPay,
          width: sablon.sayfaBoyutu.width - 2 * guvenliPay,
          height: sablon.sayfaBoyutu.height - 2 * guvenliPay,
          fill: 'none', stroke: 'rgba(200,0,0,0.55)', 'stroke-width': 0.45, 'stroke-dasharray': '3,2',
        }));
      }
      const cerceve = LE.sayfaCercevesiHesapla(bolge);
      svg.appendChild(svgOlustur('rect', {
        x: cerceve.x, y: cerceve.y, width: cerceve.width, height: cerceve.height,
        fill: 'none', stroke: '#000', 'stroke-width': 1.0,
      }));
      LE.hizalamaIsaretleriEkle(bolge).forEach((m) => {
        svg.appendChild(svgOlustur('rect', { x: m.x, y: m.y, width: m.boyut, height: m.boyut, fill: '#000' }));
      });

      sablon.ogeler.forEach((og) => ogeCiz(og));
    }

    function ogeCiz(og) {
      const secili = og.id === seciliId;
      const g = svgOlustur('g', { class: 'osOge' + (secili ? ' osOge--secili' : '') });
      g.addEventListener('pointerdown', (ev) => pointerDownOge(ev, og, g));
      // Her öğede HER ZAMAN görünen hafif bir çerçeve (Sedat geri bildirimi:
      // "köşe tutucular görünsün ki çakışma olmasın") — sadece seçiliyken
      // değil, tüm öğeler için, çakışmaları tuvalde görmek kolaylaşsın diye.
      const CERCEVE_SOLUK = { stroke: '#9aa0a6', 'stroke-width': 0.25, 'stroke-dasharray': '1,0.6', fill: 'transparent' };
      const CERCEVE_SECILI = { stroke: '#0a7cff', 'stroke-width': 0.5, fill: 'rgba(10,124,255,0.06)' };

      if (og.tip === 'baloncukBlok') {
        const sutunlar = baloncukBlokOnizlemeHesapla(og);
        let minX = og.x, minY = og.y, maxX = og.x, maxY = og.y;
        sutunlar.forEach((sutun) => {
          sutun.sorular.forEach((soru) => {
            // YENİ (Sedat isteği, Ağustos 2026: "Soru numaraları da editörde
            // görünsün") — gerçek PDF'teki AYNI konumda (soru.etiketX/Y).
            const numT = svgOlustur('text', {
              x: soru.etiketX, y: soru.etiketY, 'font-size': 2.6, fill: '#666', 'text-anchor': 'middle',
            });
            numT.textContent = String(soru.soruNo);
            g.appendChild(numT);
            soru.sikler.forEach((sik) => {
              g.appendChild(svgOlustur('circle', {
                cx: sik.cx, cy: sik.cy, r: sik.r, fill: 'none', stroke: '#000000', 'stroke-width': 0.25,
              }));
              minX = Math.min(minX, sik.cx - sik.r); maxX = Math.max(maxX, sik.cx + sik.r);
              minY = Math.min(minY, sik.cy - sik.r); maxY = Math.max(maxY, sik.cy + sik.r);
            });
          });
          // Kesikli çizgiler — Test Plus gibi satırlar arası
          if (sutun.kesikliCizgiler) {
            for (const cizgi of sutun.kesikliCizgiler) {
              g.appendChild(svgOlustur('line', {
                x1: cizgi.x1, y1: cizgi.y, x2: cizgi.x2, y2: cizgi.y,
                stroke: '#aaa', 'stroke-width': 0.15, 'stroke-dasharray': '0.8,0.8',
              }));
            }
          }
          // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026: "ders
          // isimlerinin olduğu kutucuklar birbiri üstüne çakışıyor... bu
          // kutucuklar form oluşturmada görünmüyor") — gerçek PDF'te
          // (pdfFormGenerator.js: bolumlerCiz) her ders sütununun başlığı
          // GERÇEK bir çerçeve kutusu içinde basılıyordu, ama editör
          // önizlemesi bu kutuyu hiç çizmiyordu — kullanıcı çakışmayı
          // göremiyor, nereden büyütüp küçülteceğini bulamıyordu. Artık
          // gerçek PDF'teki AYNI konum/boyutta (sutun.x, sutun.y,
          // sutun.width, sutun.baslikYuksekligi) çiziliyor.
          //
          // YENİ (Sedat isteği: "Ders adı zorunlu bile olmasın... çok yer
          // kaplıyor") — ders adı boşsa (baslikYuksekligi 0) kutu/metin
          // HİÇ çizilmiyor, tıpkı gerçek PDF'teki gibi.
          // Bireysel sütun başlığı artık çizilmiyor;
          // ortak başlık aşağıda tüm sütunlar hesaplandıktan sonra tek seferde çiziliyor.
          minX = Math.min(minX, sutun.x); maxX = Math.max(maxX, sutun.x + sutun.width);
          minY = Math.min(minY, sutun.y);
        });

        // YENİ (Sedat isteği, Ağustos 2026): tüm sütunlar üzerinde tek ortak başlık
        const baslikGorunur = !!og.dersAdi && og.baslikGizle !== 'evet';
        const baslikH = baslikGorunur ? (og.baslikYuksekligi || 8) : 0;
        const sutunSayisiOni = og.sutunSayisi || 1;
        const sutunlarArasiBoslukOni = og.sutunlarArasiBosluk != null ? og.sutunlarArasiBosluk : 3;
        const toplamGenislikOni = sutunSayisiOni * og.genislik + (sutunSayisiOni - 1) * sutunlarArasiBoslukOni;
        if (baslikGorunur && og.dersAdi) {
          const bFontPt = og.baslikFontPt || 6.4;
          g.appendChild(svgOlustur('rect', {
            x: og.x, y: og.y, width: toplamGenislikOni, height: baslikH,
            fill: 'none', stroke: '#000000', 'stroke-width': 0.35,
          }));
          const bT = svgOlustur('text', {
            x: og.x + toplamGenislikOni / 2, y: og.y + baslikH / 2 + bFontPt / 8,
            'font-size': bFontPt / 2.2, fill: '#000000', 'font-weight': 'bold', 'text-anchor': 'middle',
          });
          bT.textContent = og.dersAdi;
          g.appendChild(bT);
          minY = Math.min(minY, og.y);
        }

        const cerceve = svgOlustur('rect', Object.assign(
          { class: 'osOge__cerceve', x: minX - 1, y: minY - 1, width: (maxX - minX) + 2, height: (maxY - minY) + 2 },
          secili ? CERCEVE_SECILI : CERCEVE_SOLUK
        ));
        g.insertBefore(cerceve, g.firstChild);
        if (secili) {
          const tutamac = svgOlustur('circle', { class: 'osOge__tutamac', cx: maxX, cy: maxY, r: 1.6 });
          tutamac.addEventListener('pointerdown', (ev) => pointerDownTutamac(ev, og, g));
          g.appendChild(tutamac);
        }
      } else if (og.tip === 'kimlikAlani') {
        // YENİ (Sedat isteği, Ağustos 2026: "sınıfını okul adını da
        // ekleyebilme... font büyüklüğü ve hizalama") — artık gerçek
        // PDF'teki gibi etiket+örnek değer birlikte, seçilen hizalamaya göre.
        const hizalama = og.hizalama || 'sol';
        const hizaX = hizalama === 'sag' ? og.x + og.genislik - 2 : hizalama === 'orta' ? og.x + og.genislik / 2 : og.x + 2;
        const ankor = hizalama === 'sag' ? 'end' : hizalama === 'orta' ? 'middle' : 'start';
        g.appendChild(svgOlustur('rect', Object.assign(
          { class: 'osOge__cerceve', x: og.x, y: og.y, width: og.genislik, height: og.yukseklik },
          secili ? CERCEVE_SECILI : Object.assign({}, CERCEVE_SOLUK, { stroke: '#000000' })
        )));
        // YENİ (Sedat isteği, Ağustos 2026): etiket ve içerik yan yana tek satır
        // — PDF'teki etiketDegerKutusu davranışıyla birebir eşleşiyor.
        const ortaY = og.y + og.yukseklik / 2 + 0.8;
        const ornekDeger = { adSoyad: 'ÖRNEK ÖĞRENCİ', sinif: '8-A', okulAdi: 'Okul Adı', sinavAdi: 'Sınav Adı' }[og.alan] || '';
        if (hizalama === 'sol') {
          // Etiket soldan, değer hemen yanında
          const etiketT = svgOlustur('text', { x: og.x + 1.5, y: ortaY, 'font-size': 2.2, fill: '#000000', 'font-weight': 'bold', 'text-anchor': 'start' });
          etiketT.textContent = (og.baslik || 'Etiket') + ': ';
          g.appendChild(etiketT);
          // Tahmini etiket genişliği (SVG'de getComputedTextLength kullanılamaz, yaklaşık)
          const etiketTahminiGenislik = ((og.baslik || 'Etiket').length + 2) * 1.3;
          const degerT = svgOlustur('text', { x: og.x + 1.5 + etiketTahminiGenislik, y: ortaY, 'font-size': (og.fontPt ? og.fontPt / 2.6 : 3.5), fill: '#333', 'text-anchor': 'start', 'font-weight': og.kalin === 'evet' ? 'bold' : 'normal' });
          degerT.textContent = ornekDeger;
          g.appendChild(degerT);
        } else {
          // Orta/sağ hizalamada birleşik metin
          const tamMetin = (og.baslik || 'Etiket') + (ornekDeger ? ': ' + ornekDeger : '');
          const birlesikT = svgOlustur('text', { x: hizaX, y: ortaY, 'font-size': 2.5, fill: '#000000', 'font-weight': 'bold', 'text-anchor': ankor });
          birlesikT.textContent = tamMetin;
          g.appendChild(birlesikT);
        }
        if (secili) {
          const tutamac = svgOlustur('circle', { class: 'osOge__tutamac', cx: og.x + og.genislik, cy: og.y + og.yukseklik, r: 1.6 });
          tutamac.addEventListener('pointerdown', (ev) => pointerDownTutamac(ev, og, g));
          g.appendChild(tutamac);
        }
      } else if (og.tip === 'numaraAlani' || og.tip === 'kitapcikAlani') {
        const hesap = og.tip === 'numaraAlani'
          ? LE.numaraAlaniHesapla(og.x, og.y, og.basamakSayisi || 4, og.olcek || 1, og.yon || 'dikey')
          : LE.kitapcikAlaniHesapla(og.x, og.y, og.secenekSayisi || 4, og.olcek || 1, og.yon || 'dikey');
        const genislik = og.tip === 'numaraAlani' ? hesap.width : hesap.genislik;
        g.appendChild(svgOlustur('rect', Object.assign(
          { class: 'osOge__cerceve', x: hesap.x - 1, y: hesap.y - 1, width: genislik + 2, height: hesap.height + 2 },
          secili ? CERCEVE_SECILI : CERCEVE_SOLUK
        )));
        // Başlık ("NUMARA" / "K") — gerçek PDF'te pdfFormGenerator.js:
        // numaraAlaniCiz/kitapcikAlaniCiz tarafından basılıyor, önizlemede de
        // aynı konumda göster. YENİ (Sedat isteği: "başlık metni manuel
        // düzenlenebilsin") — özel metin varsa onu göster.
        const baslikText = svgOlustur('text', {
          x: hesap.x + genislik / 2, y: hesap.y + hesap.baslikYukseklik * 0.85,
          'font-size': 2.6, 'text-anchor': 'middle', fill: '#000000', 'font-weight': 'bold',
        });
        baslikText.textContent = og.baslikMetni || (og.tip === 'numaraAlani' ? 'NUMARA' : 'K');
        g.appendChild(baslikText);

        // Baloncuk içi rakam/harf etiketleri — gerçek PDF'te her baloncuğun
        // içinde basılı duruyor (kucukBaloncukCiz), önizlemede de aynı
        // (Sedat geri bildirimi: "baloncuklarda rakamlar/harfler yok").
        function etiketliBaloncuk(cx, cy, r, etiket) {
          g.appendChild(svgOlustur('circle', { cx, cy, r, fill: 'none', stroke: '#000000', 'stroke-width': 0.25 }));
          const t = svgOlustur('text', { x: cx, y: cy + r * 0.35, 'font-size': r * 0.9, 'text-anchor': 'middle', fill: '#000000' });
          t.textContent = String(etiket);
          g.appendChild(t);
        }

        if (og.tip === 'numaraAlani') {
          // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026):
          // numaraAlaniHesapla 'sorular/sikler' DEĞİL, 'basamaklar[].bubbles[]'
          // döndürüyor — yanlış alan adı yüzünden baloncuklar hiç çizilmiyordu.
          // YENİ (Sedat isteği, Ağustos 2026): her basamağın üstüne elle yazı kutusu
          const kutucukH = hesap.kutucukPay || hesap.hucreGenislik * 0.9;
          const kutucukY = hesap.y + hesap.baslikYukseklik;
          (hesap.basamaklar || []).forEach((basamak) => {
            const kutucukX = basamak.x - hesap.hucreGenislik / 2;
            g.appendChild(svgOlustur('rect', {
              x: kutucukX, y: kutucukY, width: hesap.hucreGenislik, height: kutucukH,
              fill: 'white', stroke: '#000000', 'stroke-width': 0.3,
            }));
          });
          (hesap.basamaklar || []).forEach((basamak) => {
            (basamak.bubbles || []).forEach((b) => etiketliBaloncuk(b.cx, b.cy, b.r, b.deger));
          });
        } else {
          // kitapcikAlaniHesapla 'secenekler' (düz dizi) döndürüyor.
          (hesap.secenekler || []).forEach((sik) => etiketliBaloncuk(sik.cx, sik.cy, sik.r, sik.harf));
        }
      } else if (og.tip === 'baslik' || og.tip === 'logo') {
        g.appendChild(svgOlustur('rect', Object.assign(
          { class: 'osOge__cerceve', x: og.x, y: og.y, width: og.genislik, height: og.yukseklik, 'stroke-dasharray': og.tip === 'logo' ? '1,1' : (secili ? 'none' : '1,0.6') },
          secili ? CERCEVE_SECILI : Object.assign({}, CERCEVE_SOLUK, { stroke: '#888' })
        )));
        if (og.tip === 'logo' && og.gorselData) {
          g.appendChild(svgOlustur('image', {
            href: og.gorselData, x: og.x, y: og.y, width: og.genislik, height: og.yukseklik, preserveAspectRatio: 'xMidYMid meet',
          }));
        } else if (og.tip === 'logo') {
          const t = svgOlustur('text', { x: og.x + og.genislik / 2, y: og.y + og.yukseklik / 2 + 1, 'font-size': 2.6, 'text-anchor': 'middle', fill: '#999' });
          t.textContent = '🖼 Logo Seç';
          g.appendChild(t);
        }
        if (og.metin) {
          const hizalama = og.hizalama || 'orta';
          const hizaX = hizalama === 'sol' ? og.x + 1 : hizalama === 'sag' ? og.x + og.genislik - 1 : og.x + og.genislik / 2;
          const ankor = hizalama === 'sol' ? 'start' : hizalama === 'sag' ? 'end' : 'middle';
          const t = svgOlustur('text', { x: hizaX, y: og.y + og.yukseklik / 2 + 1, 'font-size': og.fontPt ? og.fontPt / 2.6 : 3.5, 'text-anchor': ankor });
          t.textContent = og.metin;
          g.appendChild(t);
        }
        if (secili) {
          const tutamac = svgOlustur('circle', { class: 'osOge__tutamac', cx: og.x + og.genislik, cy: og.y + og.yukseklik, r: 1.6 });
          tutamac.addEventListener('pointerdown', (ev) => pointerDownTutamac(ev, og, g));
          g.appendChild(tutamac);
        }
      } else if (og.tip === 'metin') {
        const t = svgOlustur('text', { x: og.x, y: og.y, 'font-size': (og.fontPt || 10) / 2.5, 'font-weight': og.kalin === 'evet' ? 'bold' : 'normal' });
        t.textContent = og.metin || '';
        g.appendChild(t);
        // Görünmez/hafif çerçeveli tıklama alanı (kısa metinler için de kolay seçim)
        g.insertBefore(svgOlustur('rect', Object.assign(
          { x: og.x - 1, y: og.y - 5, width: Math.max(20, (og.metin || '').length * 2), height: 6 },
          secili ? CERCEVE_SECILI : { fill: 'transparent', stroke: 'none' }
        )), g.firstChild);
      } else if (og.tip === 'cizgi') {
        // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi: "Çizgi öğesini hiç
        // taşıyamıyorum") — görünen çizgi sadece 0.3-0.6mm kalınlığında,
        // SVG'de sadece TAM o ince çizginin üstüne dokunuş isabet sayılıyor.
        // Görünmez ama geniş (4mm) bir isabet-alanı çizgisi ekleniyor.
        g.appendChild(svgOlustur('line', {
          x1: og.x1, y1: og.y1, x2: og.x2, y2: og.y2,
          stroke: 'transparent', 'stroke-width': 4, 'pointer-events': 'stroke',
        }));
        g.appendChild(svgOlustur('line', {
          x1: og.x1, y1: og.y1, x2: og.x2, y2: og.y2, stroke: secili ? '#0a7cff' : '#555', 'stroke-width': secili ? 0.6 : 0.3,
          'pointer-events': 'none',
        }));
      }

      svg.appendChild(g);
    }

    // ---- Özellik paneli ----
    function alanEkle(og, etiket, alanAdi, tip, ekOzellik, hedefKapsayici) {
      const div = document.createElement('div');
      div.className = 'osEditor__alan';
      const label = document.createElement('label');
      label.textContent = etiket;
      div.appendChild(label);
      const input = document.createElement(tip === 'select' ? 'select' : 'input');
      if (tip !== 'select') input.type = tip;
      if (ekOzellik && ekOzellik.step) input.step = ekOzellik.step;
      if (ekOzellik && ekOzellik.min != null) input.min = ekOzellik.min;
      if (ekOzellik && ekOzellik.yerTutucu && tip !== 'select') input.placeholder = ekOzellik.yerTutucu;
      if (ekOzellik && ekOzellik.opsiyonlar) {
        ekOzellik.opsiyonlar.forEach((op) => {
          const o = document.createElement('option');
          o.value = op; o.textContent = op;
          input.appendChild(o);
        });
      }
      input.value = og[alanAdi] != null ? og[alanAdi] : '';
      input.addEventListener('change', () => {
        gecmiseKaydet();
        let deger = tip === 'number' ? parseFloat(input.value) || 0 : input.value;
        // Minimum değer kontrolü
        if (tip === 'number' && ekOzellik && ekOzellik.min != null && deger < ekOzellik.min) {
          deger = ekOzellik.min;
          input.value = deger;
        }
        og[alanAdi] = deger;
        cizSadeceTuval();
      });
      div.appendChild(input);
      (hedefKapsayici || panel).appendChild(div);
    }

    function cizPanel() {
      panel.innerHTML = '';
      if (!seciliId || kok.classList.contains('osEditor--tamEkran')) {
        panel.classList.remove('osEditor__panel--gorunur');
        return;
      }
      panel.classList.add('osEditor__panel--gorunur');
      const og = sablon.ogeler.find((o) => o.id === seciliId);
      if (!og) { seciliId = null; panel.classList.remove('osEditor__panel--gorunur'); return; }

      // Alttan açılan sayfanın başlık satırı: öğe adı + Kapat düğmesi.
      // Kapat, boş tuval alanına dokunmakla AYNI işi yapar (seçim kalkar,
      // panel kayarak kapanır) — ama panel geniş açıldığında tuvale
      // dokunmadan da kapatabilmek için ayrıca burada duruyor.
      const baslikSatiri = document.createElement('div');
      baslikSatiri.className = 'osEditor__panelBaslikSatiri';
      const baslik = document.createElement('h4');
      baslik.textContent = OGE_ETIKETLERI[og.tip] || og.tip;
      const kapatBtn = document.createElement('button');
      kapatBtn.type = 'button';
      kapatBtn.className = 'osEditor__panelKapatBtn';
      kapatBtn.textContent = '✕ Kapat';
      kapatBtn.addEventListener('click', () => {
        seciliId = null;
        cizPanel();
        cizSadeceTuval();
      });
      baslikSatiri.appendChild(baslik);
      baslikSatiri.appendChild(kapatBtn);
      panel.appendChild(baslikSatiri);

      if (og.tip === 'baloncukBlok') {
        alanEkle(og, 'Ders Adı (cevap anahtarında kullanılır, boş bırakılabilir)', 'dersAdi', 'text');
        alanEkle(og, 'Ders Adı Hizalama', 'dersAdiHizalama', 'select', { opsiyonlar: ['orta', 'sol', 'sag'] });
        // YENİ (Sedat isteği, Ağustos 2026: "kutucuğu çok yer kaplıyor...
        // font ve diğer ayarları yapılabilsin") — ders adı doluyken bu
        // ikisi anlamlı; boşken zaten hiç basılmıyor. "Kağıtta Gizle" ise
        // ders adı DOLU olsa bile (cevap anahtarında görünmeye devam eder)
        // sadece kağıda BASILMASINI engeller.
        alanEkle(og, 'Kağıtta Gizle (sadece anahtarda görünsün)', 'baslikGizle', 'select', { opsiyonlar: ['hayir', 'evet'] });
        alanEkle(og, 'Başlık Yüksekliği (mm)', 'baslikYuksekligi', 'number', { step: 0.5 });
        alanEkle(og, 'Başlık Font (pt)', 'baslikFontPt', 'number', { step: 0.2 });
        alanEkle(og, 'Soru Sayısı', 'soruSayisi', 'number');
        alanEkle(og, 'Şık Sayısı (2-6)', 'sikSayisi', 'number');
        alanEkle(og, 'Baloncuk Çapı (mm)', 'baloncukCap', 'number', { step: 0.05 });
        // Minimum boşluk değerleri omrEngine.js arama penceresinden (±1.3r) gelir
        const minYatay = LE.minYatayAralikCarpani ? LE.minYatayAralikCarpani() : 2.6;
        const minDikey = LE.minDikeyAralikCarpani ? LE.minDikeyAralikCarpani() : 2.6;
        alanEkle(og, `Yatay Boşluk Çarpanı (min: ${minYatay.toFixed(1)})`, 'yatayAralikCarpani', 'number', { step: 0.05, min: minYatay });
        alanEkle(og, `Dikey Boşluk Çarpanı (min: ${minDikey.toFixed(1)})`, 'dikeyAralikCarpani', 'number', { step: 0.05, min: minDikey });
        alanEkle(og, 'Genişlik Modu', 'genislikSabit', 'select', { opsiyonlar: ['otomatik', 'sabit'] });
        if (og.genislikSabit === 'sabit') {
          alanEkle(og, 'Sabit Genişlik (mm)', 'genislik', 'number', { step: 0.5 });
        }
        alanEkle(og, 'Sütun Sayısı', 'sutunSayisi', 'number');
        alanEkle(og, 'Sütunlar Arası Boşluk (mm)', 'sutunlarArasiBosluk', 'number');
        // Her sütun için ayrı dikey kayma alanı — "sütunların dikey yerleşimi manuel" isteği
        const sutunSayisi = og.sutunSayisi || 1;
        if (!Array.isArray(og.sutunDikeyKaymalari)) og.sutunDikeyKaymalari = [];
        for (let s = 0; s < sutunSayisi; s++) {
          if (og.sutunDikeyKaymalari[s] == null) og.sutunDikeyKaymalari[s] = 0;
          const div = document.createElement('div');
          div.className = 'osEditor__alan';
          const label = document.createElement('label');
          label.textContent = `Sütun ${s + 1} Dikey Kayma (mm)`;
          div.appendChild(label);
          const input = document.createElement('input');
          input.type = 'number'; input.step = 0.5;
          input.value = og.sutunDikeyKaymalari[s];
          input.addEventListener('change', () => {
            gecmiseKaydet();
            og.sutunDikeyKaymalari[s] = parseFloat(input.value) || 0;
            cizSadeceTuval();
          });
          div.appendChild(input);
          panel.appendChild(div);
        }
      } else if (og.tip === 'kimlikAlani') {
        alanEkle(og, 'Veri Kaynağı', 'alan', 'select', { opsiyonlar: ['adSoyad', 'sinif', 'okulAdi', 'sinavAdi'] });
        alanEkle(og, 'Başlık Metni', 'baslik', 'text');
        alanEkle(og, 'Hizalama', 'hizalama', 'select', { opsiyonlar: ['sol', 'orta', 'sag'] });
        alanEkle(og, 'Değer Font (pt)', 'fontPt', 'number');
        alanEkle(og, 'Değer Kalın', 'kalin', 'select', { opsiyonlar: ['hayir', 'evet'] });
        alanEkle(og, 'Genişlik (mm)', 'genislik', 'number');
        alanEkle(og, 'Yükseklik (mm)', 'yukseklik', 'number');
      } else if (og.tip === 'numaraAlani') {
        alanEkle(og, 'Başlık Metni', 'baslikMetni', 'text', { yerTutucu: 'NUMARA' });
        alanEkle(og, 'Basamak Sayısı', 'basamakSayisi', 'number');
        alanEkle(og, 'Yön', 'yon', 'select', { opsiyonlar: ['dikey', 'yatay'] });
        // YENİ (Sedat geri bildirimi: "baloncukları diğerleri gibi
        // ayarlanmıyor aralıkları ve boyutları değişmiyor") — bu alan hiç
        // yoktu. NOT: numaraAlaniHesapla boyut ve aralığı TEK bir "ölçek"
        // çarpanıyla birlikte büyütüp küçültüyor (baloncukBlok'taki gibi
        // ayrı ayrı değil) — bu, layoutEngine.js'in kendi tasarımı.
        alanEkle(og, 'Ölçek (boyut + aralık)', 'olcek', 'number', { step: 0.1 });
      } else if (og.tip === 'kitapcikAlani') {
        alanEkle(og, 'Başlık Metni', 'baslikMetni', 'text', { yerTutucu: 'K' });
        alanEkle(og, 'Seçenek Sayısı', 'secenekSayisi', 'number');
        // YENİ (Sedat isteği, Ağustos 2026: "kitapçık türü başlığı da...
        // dikey yatay yapışabilsin") — numara alanındaki AYNI seçenek.
        alanEkle(og, 'Yön', 'yon', 'select', { opsiyonlar: ['dikey', 'yatay'] });
        alanEkle(og, 'Ölçek (boyut + aralık)', 'olcek', 'number', { step: 0.1 });
      } else if (og.tip === 'baslik' || og.tip === 'metin') {
        alanEkle(og, 'Metin', 'metin', 'text');
        alanEkle(og, 'Font (pt)', 'fontPt', 'number');
        if (og.tip === 'metin') {
          alanEkle(og, 'Kalın', 'kalin', 'select', { opsiyonlar: ['hayir', 'evet'] });
        }
        if (og.tip === 'baslik') {
          alanEkle(og, 'Hizalama', 'hizalama', 'select', { opsiyonlar: ['sol', 'orta', 'sag'] });
          alanEkle(og, 'Genişlik (mm)', 'genislik', 'number');
          alanEkle(og, 'Yükseklik (mm)', 'yukseklik', 'number');
        }
      } else if (og.tip === 'logo') {
        alanEkle(og, 'Genişlik (mm)', 'genislik', 'number');
        alanEkle(og, 'Yükseklik (mm)', 'yukseklik', 'number');
        // YENİ (Sedat isteği: "Logo nasıl seçilecek") — cihazdan görsel seç,
        // base64 olarak şablonda saklanır, PDF'e pdfFormGenerator.js:
        // serbestOgeleriCiz üzerinden basılır.
        const gorselDiv = document.createElement('div');
        gorselDiv.className = 'osEditor__alan';
        const gorselLabel = document.createElement('label');
        gorselLabel.textContent = 'Logo Görseli';
        gorselDiv.appendChild(gorselLabel);
        const gorselInput = document.createElement('input');
        gorselInput.type = 'file';
        gorselInput.accept = 'image/png,image/jpeg';
        gorselInput.addEventListener('change', () => {
          const dosya = gorselInput.files && gorselInput.files[0];
          if (!dosya) return;
          if (dosya.size > 2 * 1024 * 1024) {
            alert('Görsel çok büyük (max 2MB) — daha küçük bir dosya seç.');
            return;
          }
          const okuyucu = new FileReader();
          okuyucu.onload = () => {
            gecmiseKaydet();
            og.gorselData = okuyucu.result;
            cizSadeceTuval();
          };
          okuyucu.readAsDataURL(dosya);
        });
        gorselDiv.appendChild(gorselInput);
        panel.appendChild(gorselDiv);
        if (og.gorselData) {
          const kaldirBtn = document.createElement('button');
          kaldirBtn.textContent = '✕ Görseli Kaldır';
          kaldirBtn.style.cssText = 'min-height:36px; border:1px solid #ccc; border-radius:6px; background:#fff; padding:0 10px; align-self:flex-end;';
          kaldirBtn.addEventListener('click', () => {
            gecmiseKaydet();
            delete og.gorselData;
            cizPanel();
            cizSadeceTuval();
          });
          panel.appendChild(kaldirBtn);
        }
      } else if (og.tip === 'cizgi') {
        // YENİ (Sedat isteği, Ağustos 2026: "Çizgi sadece yatay ekleniyor,
        // dikey de yapışabilsin") — Yön (Yatay/Dikey) hızlı seçici +
        // Uzunluk alanı; x1/y1 (başlangıç noktası) sabit tutulup x2/y2
        // buna göre yeniden hesaplanıyor.
        const uzunlukHesapla = () => Math.max(5, Math.hypot(og.x2 - og.x1, og.y2 - og.y1) || 20);
        const yatayMi = Math.abs(og.y2 - og.y1) <= Math.abs(og.x2 - og.x1);

        const yonDiv = document.createElement('div');
        yonDiv.className = 'osEditor__alan';
        const yonLabel = document.createElement('label'); yonLabel.textContent = 'Yön';
        yonDiv.appendChild(yonLabel);
        const yonSelect = document.createElement('select');
        [['yatay', 'Yatay'], ['dikey', 'Dikey']].forEach(([v, t]) => {
          const o = document.createElement('option'); o.value = v; o.textContent = t; yonSelect.appendChild(o);
        });
        yonSelect.value = yatayMi ? 'yatay' : 'dikey';
        yonDiv.appendChild(yonSelect);
        panel.appendChild(yonDiv);

        const uzunlukDiv = document.createElement('div');
        uzunlukDiv.className = 'osEditor__alan';
        const uzunlukLabel = document.createElement('label'); uzunlukLabel.textContent = 'Uzunluk (mm)';
        uzunlukDiv.appendChild(uzunlukLabel);
        const uzunlukInput = document.createElement('input');
        uzunlukInput.type = 'number'; uzunlukInput.step = 1; uzunlukInput.value = uzunlukHesapla().toFixed(0);
        uzunlukDiv.appendChild(uzunlukInput);
        panel.appendChild(uzunlukDiv);

        function cizgiYenidenHesapla() {
          gecmiseKaydet();
          const uzunluk = Math.max(1, parseFloat(uzunlukInput.value) || uzunlukHesapla());
          if (yonSelect.value === 'yatay') { og.x2 = og.x1 + uzunluk; og.y2 = og.y1; }
          else { og.x2 = og.x1; og.y2 = og.y1 + uzunluk; }
          cizSadeceTuval();
        }
        yonSelect.addEventListener('change', cizgiYenidenHesapla);
        uzunlukInput.addEventListener('change', cizgiYenidenHesapla);

        alanEkle(og, 'Başlangıç X (mm)', 'x1', 'number', { step: 0.5 });
        alanEkle(og, 'Başlangıç Y (mm)', 'y1', 'number', { step: 0.5 });
      }

      if (og.tip !== 'cizgi') {
        alanEkle(og, 'X (mm)', 'x', 'number', { step: 0.5 });
        alanEkle(og, 'Y (mm)', 'y', 'number', { step: 0.5 });
      }

      const silBtn = document.createElement('button');
      silBtn.className = 'osEditor__silBtn';
      silBtn.textContent = '🗑 Öğeyi Sil';
      silBtn.addEventListener('click', () => {
        gecmiseKaydet();
        sablon.ogeler = sablon.ogeler.filter((o) => o.id !== og.id);
        seciliId = null;
        ciz();
      });
      panel.appendChild(silBtn);
    }

    ciz();

    return {
      sablonuGetir: () => derinKopya(sablon),
      yenidenCiz: ciz,
    };
  }

  window.OptikSablonEditor = { baslat: OptikSablonEditor_baslat };
})();
