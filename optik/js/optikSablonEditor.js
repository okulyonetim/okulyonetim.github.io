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
      baloncukCap: LE.STANDART_BALONCUK_CAP, yatayAralikCarpani: 1.45,
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
    // KÖK NEDEN DÜZELTMESİ (bkz. optikSablonMotoru.js: baloncukBlokOlustur'daki
    // AYNI not) — iç kimlik (OMR/cevap anahtarı gruplandırması) ASLA boş
    // olmamalı, görsel gizleme SADECE basılıp basılmayacağını etkiler.
    const dersAdiIcin = og.dersAdi || ('Soru Bloğu #' + og.id.slice(-4));
    const baslikGorunur = !!og.dersAdi && og.baslikGizle !== 'evet'; // alanEkle select'i string döndürür ('evet'/'hayir'), boolean değil
    const baslikYuksekligi = baslikGorunur ? (og.baslikYuksekligi || 8) : 0;
    const baslikFontPt = og.baslikFontPt || 6.4;
    const baslikAltBosluk = baslikGorunur ? 3 : 1;
    const sutunlar = [];
    for (let s = 0; s < sutunSayisi; s++) {
      const buSutundakiSoruSayisi = Math.min(soruBasinaDusen, og.soruSayisi - s * soruBasinaDusen);
      if (buSutundakiSoruSayisi <= 0) continue;
      try {
        const sutun = LE.dersSutunuHesapla({
          x: og.x + s * (og.genislik + sutunlarArasiBosluk),
          y: og.y + (kaymalar[s] || 0),
          width: og.genislik,
          dersAdi: dersAdiIcin, // ASLA boş değil — bkz. yukarıdaki kök neden notu
          soruSayisi: buSutundakiSoruSayisi,
          baslangicSoruNo: s * soruBasinaDusen + 1, // KÖK NEDEN DÜZELTMESİ: bkz. optikSablonMotoru.js/layoutEngine.js notu
          sikSayisi: og.sikSayisi,
          baloncukCap: og.baloncukCap,
          aralikCarpani: og.yatayAralikCarpani || 1.45,
          baslikYuksekligi,
          baslikFontPt,
          baslikAltBosluk,
        });
        sutun.dersAdiHizalama = og.dersAdiHizalama || 'orta';
        sutun.baslikFontPt = baslikFontPt;
        sutunlar.push(sutun);
      } catch (e) {
        // Geçersiz kombinasyon (ör. genişlik çok dar) — önizlemede sessizce atla,
        // kaydetmeden önce sablonuDogrula zaten kullanıcıyı uyaracak.
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
  const KOSE_GUVENLI_PAY_MM = 12;

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
        .osEditor { display:flex; flex-direction:column; height:100%; font-family:inherit; }
        .osEditor__arac { display:flex; flex-wrap:wrap; gap:6px; padding:8px; background:#f3f3f5; border-bottom:1px solid #ddd; max-height:34vh; overflow-y:auto; }
        .osEditor__arac button { min-height:40px; padding:0 12px; border-radius:8px; border:1px solid #ccc; background:#fff; font-size:13px; }
        .osEditor__arac button:active { background:#e8e8ea; }
        .osEditor__arac button.osEditor__tamEkranBtn { margin-left:auto; background:#0a7cff; color:#fff; border-color:#0a7cff; }
        .osEditor__govde { display:flex; flex-direction:column; flex:1; min-height:0; overflow-y:auto; }
        .osEditor__tuvalSarici { flex:1; min-height:35vh; overflow:auto; background:#7a7a85; display:flex; align-items:flex-start; justify-content:center; padding:12px; touch-action: pan-x pan-y pinch-zoom; }
        .osEditor__tuval { background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.3); }
        .osEditor__panel { background:#fafafa; border-bottom:1px solid #ddd; overflow-y:auto; max-height:38vh; padding:10px; font-size:13px; display:none; }
        .osEditor__panel--gorunur { display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; }
        .osEditor__panel h4 { margin:0 0 4px; font-size:13px; color:#555; width:100%; }
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
        .osEditor--tamEkran .osEditor__panel { display:none !important; }
        .osEditor--tamEkran .osEditor__arac > button:not(.osEditor__tamEkranBtn) { display:none; }
      </style>
      <div class="osEditor__arac"></div>
      <div class="osEditor__govde">
        <div class="osEditor__panel"></div>
        <div class="osEditor__tuvalSarici"><svg class="osEditor__tuval"></svg></div>
      </div>
    `;
    container.appendChild(kok);

    const aracCubugu = kok.querySelector('.osEditor__arac');
    const svg = kok.querySelector('.osEditor__tuval');
    const panel = kok.querySelector('.osEditor__panel');
    // YENİ (Sedat geri bildirimi, Ağustos 2026: "parametre ayar ekranında
    // da aşağı kaydırma sorunu... yenilemeyi tetikliyor") — panel de
    // tuval gibi kaydırılabilir bir alan; içinde dokunuş varken sistem
    // pull-to-refresh'ini bastır. KÖK NEDEN DÜZELTMESİ: aynı tuvalSarici
    // notu — geri açma çağrısı window seviyesinde, tek seferlik ve
    // GARANTİLİ (parmak panel dışına çıksa bile tetiklenir).
    panel.addEventListener('pointerdown', () => {
      _pullToRefreshBastir(false);
      let acildiMi = false;
      const geriAc = () => { if (!acildiMi) { acildiMi = true; _pullToRefreshBastir(true); } };
      window.addEventListener('pointerup', geriAc, { once: true });
      window.addEventListener('pointercancel', geriAc, { once: true });
    });
    const tuvalSarici = kok.querySelector('.osEditor__tuvalSarici');

    // ---- Form adı (Sedat isteği: "Forma isim verme de olsun") ----
    const adSatiri = document.createElement('div');
    adSatiri.style.cssText = 'display:flex; align-items:center; gap:6px; width:100%; padding:0 0 4px;';
    const adInput = document.createElement('input');
    adInput.type = 'text';
    adInput.placeholder = 'Form adı (ör. 8. Sınıf Deneme-3)';
    adInput.value = sablon.ad || '';
    adInput.style.cssText = 'flex:1; min-height:38px; border:1px solid #ccc; border-radius:6px; padding:4px 8px; font-size:14px;';
    adInput.addEventListener('change', () => { sablon.ad = adInput.value || 'Adsız Şablon'; });
    adSatiri.appendChild(adInput);
    aracCubugu.appendChild(adSatiri);

    // ---- Araç çubuğu: öğe ekleme + geri al/ileri al + kaydet ----
    function aracDugmesiEkle(etiket, tikla) {
      const b = document.createElement('button');
      b.textContent = etiket;
      b.addEventListener('click', tikla);
      aracCubugu.appendChild(b);
      return b;
    }

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
      aracDugmesiEkle('+ ' + OGE_ETIKETLERI[tip], () => {
        gecmiseKaydet();
        const og = OGE_VARSAYILANLARI[tip]();
        og.id = yeniId();
        bosAlanBul(og);
        sablon.ogeler.push(og);
        seciliId = og.id;
        ciz();
      });
    });

    const geriAlBtn = aracDugmesiEkle('↶ Geri Al', () => {
      if (!gecmis.length) return;
      ileri.push(derinKopya(sablon));
      sablon = gecmis.pop();
      seciliId = null;
      ciz();
    });
    const ileriAlBtn = aracDugmesiEkle('↷ İleri Al', () => {
      if (!ileri.length) return;
      gecmis.push(derinKopya(sablon));
      sablon = ileri.pop();
      seciliId = null;
      ciz();
    });
    let varsayilanYapilsinMi = false;
    if (kaydetCallback) {
      const varsayilanLabel = document.createElement('label');
      varsayilanLabel.style.cssText = 'display:flex; align-items:center; gap:4px; font-size:12px; color:#555; padding:0 6px;';
      const varsayilanCheckbox = document.createElement('input');
      varsayilanCheckbox.type = 'checkbox';
      varsayilanCheckbox.checked = !!secenekler.varsayilanMi;
      varsayilanYapilsinMi = varsayilanCheckbox.checked;
      varsayilanCheckbox.addEventListener('change', () => { varsayilanYapilsinMi = varsayilanCheckbox.checked; });
      varsayilanLabel.appendChild(varsayilanCheckbox);
      varsayilanLabel.appendChild(document.createTextNode('Varsayılan form yap'));
      aracCubugu.appendChild(varsayilanLabel);

      aracDugmesiEkle('💾 Kaydet', async () => {
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
        await kaydetCallback(derinKopya(sablon), varsayilanYapilsinMi);
      });
    }
    const tamEkranBtn = document.createElement('button');
    tamEkranBtn.className = 'osEditor__tamEkranBtn';
    tamEkranBtn.textContent = '⛶ Tam Ekran';
    tamEkranBtn.addEventListener('click', () => {
      const tamEkranMi = kok.classList.toggle('osEditor--tamEkran');
      tamEkranBtn.textContent = tamEkranMi ? '✕ Küçült' : '⛶ Tam Ekran';
      requestAnimationFrame(viewBoxAyarla);
    });
    aracCubugu.appendChild(tamEkranBtn);

    // ---- Kağıt boyutu seçici (Sedat isteği, Ağustos 2026) ----
    const kagitSatiri = document.createElement('div');
    kagitSatiri.style.cssText = 'display:flex; align-items:center; gap:6px; width:100%; padding:0 0 4px; font-size:12px; color:#555; flex-wrap:wrap;';
    kagitSatiri.innerHTML = '<span>Kağıt Boyutu:</span>';
    const kagitSelect = document.createElement('select');
    kagitSelect.style.cssText = 'min-height:34px; border:1px solid #ccc; border-radius:6px; padding:2px 6px;';
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
    yonSelect.style.cssText = 'min-height:34px; border:1px solid #ccc; border-radius:6px; padding:2px 6px;';
    ['dikey', 'yatay'].forEach((y) => {
      const o = document.createElement('option');
      o.value = y; o.textContent = y === 'dikey' ? '↕ Dikey' : '↔ Yatay';
      yonSelect.appendChild(o);
    });

    const ozelGenislikInput = document.createElement('input');
    ozelGenislikInput.type = 'number'; ozelGenislikInput.min = 20; ozelGenislikInput.placeholder = 'Genişlik mm';
    ozelGenislikInput.style.cssText = 'width:80px; min-height:34px; border:1px solid #ccc; border-radius:6px; padding:2px 6px; display:none;';
    const ozelYukseklikInput = document.createElement('input');
    ozelYukseklikInput.type = 'number'; ozelYukseklikInput.min = 20; ozelYukseklikInput.placeholder = 'Yükseklik mm';
    ozelYukseklikInput.style.cssText = 'width:80px; min-height:34px; border:1px solid #ccc; border-radius:6px; padding:2px 6px; display:none;';

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
    aracCubugu.appendChild(kagitSatiri);
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

    aracDugmesiEkle('－', () => zoomUygula(zoomOlcek - 0.2));
    aracDugmesiEkle('＋', () => zoomUygula(zoomOlcek + 0.2));

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
      // YENİ (Sedat geri bildirimi: "Kaydırmada sayfa yenileniyor" +
      // "Android'de yenileme kilitleniyor") — tuval alanında dokunuş
      // başladığında pull-to-refresh'i bastır. KÖK NEDEN DÜZELTMESİ: bu
      // alanda touch-action:pan-x pan-y AKTİF (doğal kaydırma isteniyor),
      // bu yüzden setPointerCapture KULLANILAMAZ (native kaydırmayı
      // bozabilir) — bunun yerine parmak tuvalSarici SINIRLARININ DIŞINA
      // çıkıp kalksa bile MUTLAKA tetiklenmesi için "geri aç" çağrısı
      // pencere (window) seviyesinde, TEK SEFERLİK dinleyicilerle
      // garanti ediliyor. Önceki hali (sadece tuvalSarici'nin kendi
      // pointerup/leave'i) parmak dışarıda kalkarsa hiç tetiklenmiyordu —
      // bu da ana uygulamanın paylaşılan sayacını kalıcı olarak kilitli
      // bırakıyordu.
      _pullToRefreshBastir(false);
      let acildiMi = false;
      const geriAc = () => { if (!acildiMi) { acildiMi = true; _pullToRefreshBastir(true); } };
      window.addEventListener('pointerup', geriAc, { once: true });
      window.addEventListener('pointercancel', geriAc, { once: true });
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

    function pointerDownOge(ev, og, gEl) {
      ev.stopPropagation();
      seciliId = og.id;
      _pullToRefreshBastir(false);
      const ctmInverse = svg.getScreenCTM().inverse(); // sürüklemenin tamamı için TEK sefer
      const nokta = ekranNoktasindanMM(ev.clientX, ev.clientY, ctmInverse);
      // PERFORMANS: og referansı burada BİR KEZ önbelleğe alınıyor —
      // önceden pointermove'daki her karede sablon.ogeler.find(...) ile
      // yeniden aranıyordu (Sedat geri bildirimi: "çok yavaş hareket
      // ediyor öğeler" — CTM önbelleklemesinden sonra kalan tek gereksiz
      // iş buydu, küçük ama gereksiz).
      surukleme = { ogeId: og.id, tip: 'tasi', baslangicMM: nokta, ogeBaslangic: derinKopya(og), gEl, dx: 0, dy: 0, ctmInverse, ogRef: og };
      ev.target.setPointerCapture(ev.pointerId);
      gEl.classList.add('osOge--suruklemede'); // PERFORMANS: ağır içerik (daireler/metin) sürükleme boyunca gizli
      gecmiseKaydet();
      cizPanel();
    }

    function pointerDownTutamac(ev, og, gEl) {
      ev.stopPropagation();
      _pullToRefreshBastir(false);
      const ctmInverse = svg.getScreenCTM().inverse();
      const nokta = ekranNoktasindanMM(ev.clientX, ev.clientY, ctmInverse);
      surukleme = { ogeId: og.id, tip: 'boyutlandir', baslangicMM: nokta, ogeBaslangic: derinKopya(og), gEl, ctmInverse, ogRef: og };
      ev.target.setPointerCapture(ev.pointerId);
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

    let hareketZamanlandiMi = false;
    let sonHareketEvent = null;

    svg.addEventListener('pointermove', (ev) => {
      if (!surukleme) return;
      // Android'de pointermove olayları çok sık ateşlenebiliyor; işlemi
      // ekran yenileme hızıyla (rAF) sınırlamak, her olayda çalışmaktan
      // çok daha akıcı — sadece son olayın konumu kullanılıyor.
      sonHareketEvent = ev;
      if (hareketZamanlandiMi) return;
      hareketZamanlandiMi = true;
      requestAnimationFrame(() => {
        hareketZamanlandiMi = false;
        if (!surukleme || !sonHareketEvent) return;
        const ev2 = sonHareketEvent;
        const nokta = ekranNoktasindanMM(ev2.clientX, ev2.clientY, surukleme.ctmInverse);
        // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026: "öğeler
        // tuvalde piksel piksel hareket ediyor") — önceden ızgaraya
        // yapıştırma (1mm) SÜRÜKLEME SIRASINDA her karede uygulanıyordu,
        // bu da hareketi "zıplayarak" hissettiriyordu. Artık sürüklerken
        // TAMAMEN SERBEST/akıcı hareket ediyor; ızgaraya yapıştırma SADECE
        // bırakıldığında (suruklemeBitir) uygulanıyor — görsel akıcılık +
        // hizalama kolaylığı bir arada.
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
    });

    function suruklemeBitir() {
      if (!surukleme) return;
      _pullToRefreshBastir(true);
      if (surukleme.tip === 'tasi') {
        const og = surukleme.ogRef;
        const baz = surukleme.ogeBaslangic;
        if (og) {
          if (og.tip === 'cizgi') {
            og.x1 = grideYapistir(baz.x1 + surukleme.dx); og.y1 = grideYapistir(baz.y1 + surukleme.dy);
            og.x2 = grideYapistir(baz.x2 + surukleme.dx); og.y2 = grideYapistir(baz.y2 + surukleme.dy);
          } else {
            og.x = Math.max(0, grideYapistir(baz.x + surukleme.dx));
            og.y = Math.max(0, grideYapistir(baz.y + surukleme.dy));
          }
        }
        cizSadeceTuval();
      }
      surukleme = null;
    }
    svg.addEventListener('pointerup', suruklemeBitir);
    svg.addEventListener('pointercancel', suruklemeBitir);

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
        svg.appendChild(svgOlustur('rect', {
          x: 0, y: 0, width: sablon.sayfaBoyutu.width, height: sablon.sayfaBoyutu.height,
          fill: 'none', stroke: 'rgba(200,0,0,0.35)', 'stroke-width': guvenliPay, 'stroke-dasharray': '2,1.5',
        }));
      }
      const cerceve = LE.sayfaCercevesiHesapla(bolge);
      svg.appendChild(svgOlustur('rect', {
        x: cerceve.x, y: cerceve.y, width: cerceve.width, height: cerceve.height,
        fill: 'none', stroke: '#000', 'stroke-width': 0.35,
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
                cx: sik.cx, cy: sik.cy, r: sik.r, fill: 'none', stroke: '#b3184a', 'stroke-width': 0.25,
              }));
              minX = Math.min(minX, sik.cx - sik.r); maxX = Math.max(maxX, sik.cx + sik.r);
              minY = Math.min(minY, sik.cy - sik.r); maxY = Math.max(maxY, sik.cy + sik.r);
            });
          });
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
          if (sutun.baslikYuksekligi > 0) {
            g.appendChild(svgOlustur('rect', {
              x: sutun.x, y: sutun.y, width: sutun.width, height: sutun.baslikYuksekligi,
              fill: 'none', stroke: '#b3184a', 'stroke-width': 0.3,
            }));
            const t = svgOlustur('text', {
              x: sutun.dersAdiHizalama === 'sol' ? sutun.x + 1 : sutun.dersAdiHizalama === 'sag' ? sutun.x + sutun.width - 1 : sutun.x + sutun.width / 2,
              y: sutun.y + sutun.baslikYuksekligi / 2 + (sutun.baslikFontPt || 6.4) / 8, 'font-size': (sutun.baslikFontPt || 6.4) / 2.2, fill: '#333',
              'text-anchor': sutun.dersAdiHizalama === 'sol' ? 'start' : sutun.dersAdiHizalama === 'sag' ? 'end' : 'middle',
            });
            t.textContent = sutun.dersAdi;
            g.appendChild(t);
          }
          minX = Math.min(minX, sutun.x); maxX = Math.max(maxX, sutun.x + sutun.width);
          minY = Math.min(minY, sutun.y);
        });
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
          secili ? CERCEVE_SECILI : Object.assign({}, CERCEVE_SOLUK, { stroke: '#b3184a' })
        )));
        const etiketT = svgOlustur('text', { x: hizaX, y: og.y + og.yukseklik * 0.4, 'font-size': 2.2, fill: '#b3184a', 'font-weight': 'bold', 'text-anchor': ankor });
        etiketT.textContent = og.baslik || 'Etiket';
        g.appendChild(etiketT);
        const ornekDeger = { adSoyad: 'ÖRNEK ÖĞRENCİ', sinif: '8-A', okulAdi: 'Okul Adı', sinavAdi: 'Sınav Adı' }[og.alan] || '';
        const degerT = svgOlustur('text', { x: hizaX, y: og.y + og.yukseklik * 0.8, 'font-size': (og.fontPt ? og.fontPt / 2.6 : 3.5), fill: '#333', 'text-anchor': ankor, 'font-weight': og.kalin === 'evet' ? 'bold' : 'normal' });
        degerT.textContent = ornekDeger;
        g.appendChild(degerT);
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
          'font-size': 2.6, 'text-anchor': 'middle', fill: '#b3184a', 'font-weight': 'bold',
        });
        baslikText.textContent = og.baslikMetni || (og.tip === 'numaraAlani' ? 'NUMARA' : 'K');
        g.appendChild(baslikText);

        // Baloncuk içi rakam/harf etiketleri — gerçek PDF'te her baloncuğun
        // içinde basılı duruyor (kucukBaloncukCiz), önizlemede de aynı
        // (Sedat geri bildirimi: "baloncuklarda rakamlar/harfler yok").
        function etiketliBaloncuk(cx, cy, r, etiket) {
          g.appendChild(svgOlustur('circle', { cx, cy, r, fill: 'none', stroke: '#b3184a', 'stroke-width': 0.25 }));
          const t = svgOlustur('text', { x: cx, y: cy + r * 0.35, 'font-size': r * 0.9, 'text-anchor': 'middle', fill: '#b3184a' });
          t.textContent = String(etiket);
          g.appendChild(t);
        }

        if (og.tip === 'numaraAlani') {
          // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026):
          // numaraAlaniHesapla 'sorular/sikler' DEĞİL, 'basamaklar[].bubbles[]'
          // döndürüyor — yanlış alan adı yüzünden baloncuklar hiç çizilmiyordu.
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
        og[alanAdi] = tip === 'number' ? parseFloat(input.value) || 0 : input.value;
        cizSadeceTuval();
      });
      div.appendChild(input);
      (hedefKapsayici || panel).appendChild(div);
    }

    function cizPanel() {
      panel.innerHTML = '';
      if (!seciliId) {
        panel.classList.remove('osEditor__panel--gorunur');
        return;
      }
      panel.classList.add('osEditor__panel--gorunur');
      const og = sablon.ogeler.find((o) => o.id === seciliId);
      if (!og) { seciliId = null; panel.classList.remove('osEditor__panel--gorunur'); return; }

      const baslik = document.createElement('h4');
      baslik.textContent = OGE_ETIKETLERI[og.tip] || og.tip;
      panel.appendChild(baslik);

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
        alanEkle(og, 'Baloncuklar Arası Yatay Boşluk Çarpanı', 'yatayAralikCarpani', 'number', { step: 0.05 });
        alanEkle(og, 'Sütun Genişliği (mm)', 'genislik', 'number');
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
