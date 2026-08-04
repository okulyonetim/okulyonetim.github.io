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
    kimlikAlani: () => ({ tip: 'kimlikAlani', x: 15, y: 15, genislik: 100, yukseklik: 14, baslik: 'AD SOYAD' }),
    numaraAlani: () => ({ tip: 'numaraAlani', x: 15, y: 40, basamakSayisi: 4, olcek: 1, yon: 'dikey' }),
    kitapcikAlani: () => ({ tip: 'kitapcikAlani', x: 15, y: 20, secenekSayisi: 4, olcek: 1 }),
    baslik: () => ({ tip: 'baslik', x: 15, y: 5, genislik: 180, yukseklik: 8, metin: 'SINAV CEVAP KAĞIDI' }),
    metin: () => ({ tip: 'metin', x: 15, y: 5, metin: 'Metin', fontPt: 10 }),
    cizgi: () => ({ tip: 'cizgi', x1: 15, y1: 15, x2: 195, y2: 15 }),
    logo: () => ({ tip: 'logo', x: 15, y: 5, genislik: 20, yukseklik: 20 }),
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
    const sutunlar = [];
    for (let s = 0; s < sutunSayisi; s++) {
      const buSutundakiSoruSayisi = Math.min(soruBasinaDusen, og.soruSayisi - s * soruBasinaDusen);
      if (buSutundakiSoruSayisi <= 0) continue;
      try {
        const sutun = LE.dersSutunuHesapla({
          x: og.x + s * (og.genislik + sutunlarArasiBosluk),
          y: og.y + (kaymalar[s] || 0),
          width: og.genislik,
          dersAdi: sutunSayisi > 1 ? `${og.dersAdi} ${s + 1}` : og.dersAdi,
          soruSayisi: buSutundakiSoruSayisi,
          sikSayisi: og.sikSayisi,
          baloncukCap: og.baloncukCap,
          aralikCarpani: og.yatayAralikCarpani || 1.45,
          baslikYuksekligi: 8,
        });
        sutunlar.push(sutun);
      } catch (e) {
        // Geçersiz kombinasyon (ör. genişlik çok dar) — önizlemede sessizce atla,
        // kaydetmeden önce sablonuDogrula zaten kullanıcıyı uyaracak.
      }
    }
    return sutunlar;
  }

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
        .osEditor__arac { display:flex; flex-wrap:wrap; gap:6px; padding:8px; background:#f3f3f5; border-bottom:1px solid #ddd; }
        .osEditor__arac button { min-height:40px; padding:0 12px; border-radius:8px; border:1px solid #ccc; background:#fff; font-size:13px; }
        .osEditor__arac button:active { background:#e8e8ea; }
        .osEditor__govde { display:flex; flex:1; min-height:0; }
        .osEditor__tuvalSarici { flex:1; overflow:auto; background:#7a7a85; display:flex; align-items:flex-start; justify-content:center; padding:12px; touch-action: pan-x pan-y; }
        .osEditor__tuval { background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.3); touch-action:none; }
        .osEditor__panel { width:260px; max-width:42vw; background:#fafafa; border-left:1px solid #ddd; overflow-y:auto; padding:10px; font-size:13px; }
        .osEditor__panel h4 { margin:0 0 8px; font-size:13px; color:#555; }
        .osEditor__alan { margin-bottom:8px; }
        .osEditor__alan label { display:block; font-size:11px; color:#777; margin-bottom:2px; }
        .osEditor__alan input, .osEditor__alan select { width:100%; box-sizing:border-box; min-height:36px; padding:4px 6px; border:1px solid #ccc; border-radius:6px; font-size:13px; }
        .osEditor__silBtn { width:100%; min-height:40px; margin-top:10px; background:#fde8e8; border:1px solid #f0b8b8; color:#a33; border-radius:8px; }
        .osOge { cursor:grab; }
        .osOge--secili rect.osOge__cerceve { stroke:#0a7cff; stroke-width:0.6; }
        .osOge__tutamac { fill:#0a7cff; cursor:nwse-resize; touch-action:none; }
      </style>
      <div class="osEditor__arac"></div>
      <div class="osEditor__govde">
        <div class="osEditor__tuvalSarici"><svg class="osEditor__tuval"></svg></div>
        <div class="osEditor__panel"></div>
      </div>
    `;
    container.appendChild(kok);

    const aracCubugu = kok.querySelector('.osEditor__arac');
    const svg = kok.querySelector('.osEditor__tuval');
    const panel = kok.querySelector('.osEditor__panel');

    // ---- Araç çubuğu: öğe ekleme + geri al/ileri al + kaydet ----
    function aracDugmesiEkle(etiket, tikla) {
      const b = document.createElement('button');
      b.textContent = etiket;
      b.addEventListener('click', tikla);
      aracCubugu.appendChild(b);
      return b;
    }

    Object.keys(OGE_VARSAYILANLARI).forEach((tip) => {
      aracDugmesiEkle('+ ' + OGE_ETIKETLERI[tip], () => {
        gecmiseKaydet();
        const og = OGE_VARSAYILANLARI[tip]();
        og.id = yeniId();
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
    if (kaydetCallback) {
      aracDugmesiEkle('💾 Kaydet', async () => {
        try {
          Motoru.sablonuDogrula(sablon);
        } catch (e) {
          alert('Kaydedilemedi: ' + e.message);
          return;
        }
        await kaydetCallback(derinKopya(sablon));
      });
    }

    function gecmiseKaydet() {
      gecmis.push(derinKopya(sablon));
      ileri.length = 0; // yeni bir işlem yapıldığında redo geçmişi geçersiz
      if (gecmis.length > 50) gecmis.shift(); // bellek için sınırlı geçmiş
    }

    // ---- Tuval boyutu (viewBox = mm cinsinden sayfa + pay) ----
    function viewBoxAyarla() {
      const w = sablon.sayfaBoyutu.width + 2 * MM_VIEWBOX_PAY;
      const h = sablon.sayfaBoyutu.height + 2 * MM_VIEWBOX_PAY;
      svg.setAttribute('viewBox', `${-MM_VIEWBOX_PAY} ${-MM_VIEWBOX_PAY} ${w} ${h}`);
      // Mobilde okunabilir bir genişlik — yükseklik oranı otomatik korunuyor (viewBox sayesinde)
      svg.style.width = 'min(92vw, ' + (w * 3.2) + 'px)';
      svg.style.height = 'auto';
    }

    // Ekran (px) koordinatını SVG kullanıcı birimine (mm) çevirir — Pointer Events için gerekli
    function ekranNoktasindanMM(clientX, clientY) {
      const pt = svg.createSVGPoint();
      pt.x = clientX; pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const donusmus = pt.matrixTransform(ctm.inverse());
      return { x: donusmus.x, y: donusmus.y };
    }

    // ---- Sürükleme durumu ----
    let surukleme = null; // {ogeId, tip:'tasi'|'boyutlandir', baslangicX, baslangicY, ogeBaslangic}

    function pointerDownOge(ev, og) {
      ev.stopPropagation();
      seciliId = og.id;
      const nokta = ekranNoktasindanMM(ev.clientX, ev.clientY);
      surukleme = { ogeId: og.id, tip: 'tasi', baslangicMM: nokta, ogeBaslangic: derinKopya(og) };
      ev.target.setPointerCapture(ev.pointerId);
      gecmiseKaydet();
      cizPanel();
    }

    function pointerDownTutamac(ev, og) {
      ev.stopPropagation();
      const nokta = ekranNoktasindanMM(ev.clientX, ev.clientY);
      surukleme = { ogeId: og.id, tip: 'boyutlandir', baslangicMM: nokta, ogeBaslangic: derinKopya(og) };
      ev.target.setPointerCapture(ev.pointerId);
      gecmiseKaydet();
    }

    svg.addEventListener('pointermove', (ev) => {
      if (!surukleme) return;
      const nokta = ekranNoktasindanMM(ev.clientX, ev.clientY);
      const dx = nokta.x - surukleme.baslangicMM.x;
      const dy = nokta.y - surukleme.baslangicMM.y;
      const og = sablon.ogeler.find((o) => o.id === surukleme.ogeId);
      if (!og) return;
      const baz = surukleme.ogeBaslangic;

      if (surukleme.tip === 'tasi') {
        if (og.tip === 'cizgi') {
          og.x1 = baz.x1 + dx; og.y1 = baz.y1 + dy;
          og.x2 = baz.x2 + dx; og.y2 = baz.y2 + dy;
        } else {
          og.x = Math.max(0, baz.x + dx);
          og.y = Math.max(0, baz.y + dy);
        }
      } else if (surukleme.tip === 'boyutlandir') {
        if (og.tip === 'baloncukBlok') {
          og.genislik = Math.max(15, baz.genislik + dx);
        } else if (og.genislik != null) {
          og.genislik = Math.max(8, baz.genislik + dx);
          if (og.yukseklik != null) og.yukseklik = Math.max(5, baz.yukseklik + dy);
        }
      }
      cizSadeceTuval();
    });

    function suruklemeBitir() { surukleme = null; }
    svg.addEventListener('pointerup', suruklemeBitir);
    svg.addEventListener('pointercancel', suruklemeBitir);

    svg.addEventListener('pointerdown', (ev) => {
      // Boş alana tıklandıysa seçimi kaldır
      if (ev.target === svg) { seciliId = null; cizPanel(); cizSadeceTuval(); }
    });

    // ---- Çizim ----
    function ciz() { viewBoxAyarla(); cizSadeceTuval(); cizPanel(); }

    function cizSadeceTuval() {
      svg.innerHTML = '';
      // Sayfa sınırı
      svg.appendChild(svgOlustur('rect', {
        x: 0, y: 0, width: sablon.sayfaBoyutu.width, height: sablon.sayfaBoyutu.height,
        fill: '#fff', stroke: '#999', 'stroke-width': 0.3,
      }));

      sablon.ogeler.forEach((og) => ogeCiz(og));
    }

    function ogeCiz(og) {
      const secili = og.id === seciliId;
      const g = svgOlustur('g', { class: 'osOge' + (secili ? ' osOge--secili' : '') });
      g.addEventListener('pointerdown', (ev) => pointerDownOge(ev, og));

      if (og.tip === 'baloncukBlok') {
        const sutunlar = baloncukBlokOnizlemeHesapla(og);
        let minX = og.x, minY = og.y, maxX = og.x, maxY = og.y;
        sutunlar.forEach((sutun) => {
          sutun.sorular.forEach((soru) => {
            soru.sikler.forEach((sik) => {
              g.appendChild(svgOlustur('circle', {
                cx: sik.cx, cy: sik.cy, r: sik.r, fill: 'none', stroke: '#b3184a', 'stroke-width': 0.25,
              }));
              minX = Math.min(minX, sik.cx - sik.r); maxX = Math.max(maxX, sik.cx + sik.r);
              minY = Math.min(minY, sik.cy - sik.r); maxY = Math.max(maxY, sik.cy + sik.r);
            });
          });
          const t = svgOlustur('text', {
            x: sutun.x, y: sutun.y + 5, 'font-size': 3.2, fill: '#333',
          });
          t.textContent = sutun.dersAdi;
          g.appendChild(t);
        });
        // Görünmez, geniş seçim/sürükleme çerçevesi (küçük baloncuklara tam isabet zorunluluğunu kaldırır)
        const cerceve = svgOlustur('rect', {
          class: 'osOge__cerceve', x: minX - 1, y: minY - 1, width: (maxX - minX) + 2, height: (maxY - minY) + 2,
          fill: secili ? 'rgba(10,124,255,0.06)' : 'transparent', stroke: secili ? '#0a7cff' : 'transparent', 'stroke-width': 0.5,
        });
        g.insertBefore(cerceve, g.firstChild);
        if (secili) {
          const tutamac = svgOlustur('circle', { class: 'osOge__tutamac', cx: maxX, cy: maxY, r: 1.6 });
          tutamac.addEventListener('pointerdown', (ev) => pointerDownTutamac(ev, og));
          g.appendChild(tutamac);
        }
      } else if (og.tip === 'kimlikAlani') {
        g.appendChild(svgOlustur('rect', {
          class: 'osOge__cerceve', x: og.x, y: og.y, width: og.genislik, height: og.yukseklik,
          fill: secili ? 'rgba(10,124,255,0.08)' : 'rgba(0,0,0,0.03)', stroke: '#b3184a', 'stroke-width': 0.3,
        }));
        const t = svgOlustur('text', { x: og.x + 2, y: og.y + 5, 'font-size': 3 });
        t.textContent = og.baslik || 'Kimlik Alanı';
        g.appendChild(t);
        if (secili) {
          const tutamac = svgOlustur('circle', { class: 'osOge__tutamac', cx: og.x + og.genislik, cy: og.y + og.yukseklik, r: 1.6 });
          tutamac.addEventListener('pointerdown', (ev) => pointerDownTutamac(ev, og));
          g.appendChild(tutamac);
        }
      } else if (og.tip === 'numaraAlani' || og.tip === 'kitapcikAlani') {
        const hesap = og.tip === 'numaraAlani'
          ? LE.numaraAlaniHesapla(og.x, og.y, og.basamakSayisi || 4, og.olcek || 1, og.yon || 'dikey')
          : LE.kitapcikAlaniHesapla(og.x, og.y, og.secenekSayisi || 4, og.olcek || 1);
        g.appendChild(svgOlustur('rect', {
          class: 'osOge__cerceve', x: hesap.x - 1, y: hesap.y - 1, width: hesap.width + 2, height: hesap.height + 2,
          fill: secili ? 'rgba(10,124,255,0.06)' : 'transparent', stroke: secili ? '#0a7cff' : 'transparent', 'stroke-width': 0.4,
        }));
        (hesap.sorular || []).forEach((soru) => {
          (soru.sikler || []).forEach((sik) => {
            g.appendChild(svgOlustur('circle', {
              cx: sik.cx, cy: sik.cy, r: sik.r, fill: 'none', stroke: '#b3184a', 'stroke-width': 0.25,
            }));
          });
        });
      } else if (og.tip === 'baslik' || og.tip === 'logo') {
        g.appendChild(svgOlustur('rect', {
          class: 'osOge__cerceve', x: og.x, y: og.y, width: og.genislik, height: og.yukseklik,
          fill: secili ? 'rgba(10,124,255,0.08)' : 'rgba(0,0,0,0.03)', stroke: '#888', 'stroke-width': 0.3, 'stroke-dasharray': og.tip === 'logo' ? '1,1' : 'none',
        }));
        if (og.metin) {
          const t = svgOlustur('text', { x: og.x + og.genislik / 2, y: og.y + og.yukseklik / 2 + 1, 'font-size': 3.5, 'text-anchor': 'middle' });
          t.textContent = og.metin;
          g.appendChild(t);
        }
        if (secili) {
          const tutamac = svgOlustur('circle', { class: 'osOge__tutamac', cx: og.x + og.genislik, cy: og.y + og.yukseklik, r: 1.6 });
          tutamac.addEventListener('pointerdown', (ev) => pointerDownTutamac(ev, og));
          g.appendChild(tutamac);
        }
      } else if (og.tip === 'metin') {
        const t = svgOlustur('text', { x: og.x, y: og.y, 'font-size': (og.fontPt || 10) / 2.5 });
        t.textContent = og.metin || '';
        g.appendChild(t);
        // Görünmez tıklama alanı (kısa metinler için de kolay seçim)
        g.insertBefore(svgOlustur('rect', {
          x: og.x - 1, y: og.y - 5, width: Math.max(20, (og.metin || '').length * 2), height: 6, fill: 'transparent',
        }), g.firstChild);
      } else if (og.tip === 'cizgi') {
        g.appendChild(svgOlustur('line', {
          x1: og.x1, y1: og.y1, x2: og.x2, y2: og.y2, stroke: secili ? '#0a7cff' : '#555', 'stroke-width': secili ? 0.6 : 0.3,
        }));
      }

      svg.appendChild(g);
    }

    // ---- Özellik paneli ----
    function alanEkle(og, etiket, alanAdi, tip, ekOzellik) {
      const div = document.createElement('div');
      div.className = 'osEditor__alan';
      const label = document.createElement('label');
      label.textContent = etiket;
      div.appendChild(label);
      const input = document.createElement(tip === 'select' ? 'select' : 'input');
      if (tip !== 'select') input.type = tip;
      if (ekOzellik && ekOzellik.step) input.step = ekOzellik.step;
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
      panel.appendChild(div);
    }

    function cizPanel() {
      panel.innerHTML = '';
      if (!seciliId) {
        panel.innerHTML = '<h4>Bir öğe seç veya yukarıdan yeni öğe ekle.</h4>';
        return;
      }
      const og = sablon.ogeler.find((o) => o.id === seciliId);
      if (!og) { seciliId = null; panel.innerHTML = ''; return; }

      const baslik = document.createElement('h4');
      baslik.textContent = OGE_ETIKETLERI[og.tip] || og.tip;
      panel.appendChild(baslik);

      if (og.tip === 'baloncukBlok') {
        alanEkle(og, 'Ders Adı', 'dersAdi', 'text');
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
        alanEkle(og, 'Başlık Metni', 'baslik', 'text');
        alanEkle(og, 'Genişlik (mm)', 'genislik', 'number');
        alanEkle(og, 'Yükseklik (mm)', 'yukseklik', 'number');
      } else if (og.tip === 'numaraAlani') {
        alanEkle(og, 'Basamak Sayısı', 'basamakSayisi', 'number');
        alanEkle(og, 'Yön', 'yon', 'select', { opsiyonlar: ['dikey', 'yatay'] });
      } else if (og.tip === 'kitapcikAlani') {
        alanEkle(og, 'Seçenek Sayısı', 'secenekSayisi', 'number');
      } else if (og.tip === 'baslik' || og.tip === 'metin') {
        alanEkle(og, 'Metin', 'metin', 'text');
        if (og.tip === 'baslik') {
          alanEkle(og, 'Genişlik (mm)', 'genislik', 'number');
          alanEkle(og, 'Yükseklik (mm)', 'yukseklik', 'number');
        } else {
          alanEkle(og, 'Font (pt)', 'fontPt', 'number');
        }
      } else if (og.tip === 'logo') {
        alanEkle(og, 'Genişlik (mm)', 'genislik', 'number');
        alanEkle(og, 'Yükseklik (mm)', 'yukseklik', 'number');
      }

      alanEkle(og, 'X (mm)', 'x', 'number', { step: 0.5 });
      alanEkle(og, 'Y (mm)', 'y', 'number', { step: 0.5 });

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
