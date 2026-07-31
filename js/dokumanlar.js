/* ====================================================================
   js/dokumanlar.js
   DÖKÜMANLAR MODÜLÜ — UI KATMANI
   - Dosya içeriği: Firebase Storage (bulut — herkes her cihazdan erişir)
   - Metadata: Firestore (oy_dokumanlar)
   - Opsiyonel: harici URL (Google Drive vb.)

   DÜZELTME (v2): Bu modül eskiden dosyaları IndexedDB'de (cihaz hafızası)
   tutuyordu — bu, "paylaşılan döküman arşivi" amacına aykırıydı, çünkü
   bir dosyayı yükleyen kişi DIŞINDA kimse göremiyordu. Artık Firebase
   Storage kullanıldığı için gerçek anlamda paylaşım var.

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → DOM + DokumanlarService çağrısı, db/storage bilmez
     js/core/services/dokumanlar.service.js    → yetki kontrolü
     js/core/repositories/dokumanlar.repository.js → TEK Firestore+Storage erişim noktası
   ==================================================================== */

let dokumanlarListesi = [];

const DOKUMAN_KATEGORILER = [
  'Öğrenci Formları',
  'Veli Formları',
  'Gezi & Etkinlik',
  'Proje Formları',
  'Yazılı Senaryoları',
  'Yönetim & İdari',
  'Diğer',
];

/* ================================================================
   Firestore bağlantısı
   ================================================================ */
function dokumanlarBaglantisiKur() {
  DokumanlarRepository.dokumanlariDinle(v => {
    dokumanlarListesi = DokumanlarService.gorunurListele(v);
    renderDokumanlar();
    renderDokumanKategoriFiltre();
  });
}

/* ================================================================
   Render
   ================================================================ */
function renderDokumanKategoriFiltre() {
  const sel = document.getElementById('dokumanKategoriFiltre');
  if (!sel) return;
  const secili = sel.value;
  const mevcutlar = [...new Set(dokumanlarListesi.map(d => d.kategori).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'tr'));
  sel.innerHTML = '<option value="">Tüm Kategoriler</option>' +
    mevcutlar.map(k => `<option value="${escapeHtml(k)}" ${secili === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('');
}

function renderDokumanlar() {
  const hedef = document.getElementById('dokumanlarListesi');
  if (!hedef) return;

  const filtre = document.getElementById('dokumanKategoriFiltre')?.value || '';
  const liste  = filtre ? dokumanlarListesi.filter(d => d.kategori === filtre) : dokumanlarListesi;

  if (!liste.length) {
    hedef.innerHTML = '<div class="empty-state">Henüz döküman eklenmedi. "+ Döküman Ekle" ile ekleyin.</div>';
    return;
  }

  const gruplar = {};
  liste.forEach(d => {
    const k = d.kategori || 'Diğer';
    if (!gruplar[k]) gruplar[k] = [];
    gruplar[k].push(d);
  });

  hedef.innerHTML = Object.entries(gruplar)
    .sort(([a], [b]) => a.localeCompare(b, 'tr'))
    .map(([kategori, belgeler]) => `
      <div style="margin-bottom:18px;">
        <div style="font-size:12px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding:0 4px;">
          📂 ${escapeHtml(kategori)} <span style="font-weight:400;">(${belgeler.length})</span>
        </div>
        ${belgeler.map(d => dokumanSatirHtml(d)).join('')}
      </div>
    `).join('');
}

function dokumanSatirHtml(d) {
  const tarihObj = d.yuklenmeTarihi
    ? new Date(d.yuklenmeTarihi.seconds ? d.yuklenmeTarihi.seconds * 1000 : d.yuklenmeTarihi)
    : null;
  const tarih   = tarihObj ? tarihObj.toLocaleDateString('tr-TR') + ' ' + tarihObj.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : '—';
  const boyut   = d.dosyaBoyutu ? dosyaBoyutuFormat(d.dosyaBoyutu) : '';
  const uzanti  = (d.dosyaAdi || d.hariciUrl || '').split('.').pop().toLowerCase();
  const ikon    = dosyaIkonu(uzanti);
  const harici  = !!d.hariciUrl;

  const depolamaBadge = harici
    ? `<span style="font-size:10px;color:#888;background:#f0f0f0;padding:1px 5px;border-radius:4px;">🔗 URL</span>`
    : `<span style="font-size:10px;color:#2e7d32;background:#e8f5e9;padding:1px 5px;border-radius:4px;">☁️ Bulutta</span>`;
  const gorunurlukBadge = d.gorunurluk === 'herkes'
    ? `<span style="font-size:10px;color:#1565c0;background:#e3f2fd;padding:1px 5px;border-radius:4px;">🌐 Herkese Açık</span>`
    : `<span style="font-size:10px;color:#8a4b00;background:#fff3e0;padding:1px 5px;border-radius:4px;">🔒 Kişisel</span>`;
  // Kimin eklediği sadece admin için (veya "herkese açık" değilse zaten sahibi görüyordur) anlamlı — admin'e göster.
  const ekleyenGoster = (typeof AKTIF_KULLANICI!=='undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin && d.olusturanAdi)
    ? ` · 👤 ${escapeHtml(d.olusturanAdi)}` : '';
  const silinebilirMi = typeof DokumanlarService !== 'undefined' && DokumanlarService.dokumanSilinebilirMi(d);
  const gorunurlukDegistirilebilirMi = typeof DokumanlarService !== 'undefined' && DokumanlarService.gorunurlukDegistirilebilirMi();

  return `
    <div class="evrak-row">
      <div class="evrak-body" style="display:flex;align-items:center;gap:12px;min-width:0;cursor:pointer;" onclick="dokumanAc('${d.id}')">
        <div style="font-size:26px;line-height:1;flex-shrink:0;">${ikon}</div>
        <div style="min-width:0;flex:1;">
          <div class="evrak-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(d.ad || d.dosyaAdi || 'Belge')}</div>
          <div class="evrak-meta" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            ${depolamaBadge}${gorunurlukBadge}
            <span>${tarih}${boyut ? ' · ' + boyut : ''}${ekleyenGoster}${d.aciklama ? ' · ' + escapeHtml(d.aciklama) : ''}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="dokumanAc('${d.id}')" title="Aç">👁</button>
        <button class="btn btn-ghost btn-sm" onclick="dokumanIndir('${d.id}')" title="İndir">⬇</button>
        ${gorunurlukDegistirilebilirMi ? `<button class="btn btn-ghost btn-sm" onclick="dokumanGorunurlukDegistirTikla('${d.id}', '${d.gorunurluk === 'herkes' ? 'kisisel' : 'herkes'}', '${escapeHtml(d.ad||'')}')" title="${d.gorunurluk === 'herkes' ? 'Kişisel yap' : 'Herkese açık yap'}">${d.gorunurluk === 'herkes' ? '🔒' : '🌐'}</button>` : ''}
        ${silinebilirMi ? `<button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="dokumanSilOnay('${d.id}', '${escapeHtml(d.ad||'')}')">🗑</button>` : ''}
      </div>
    </div>`;
}

/* ================================================================
   Dosya açma / indirme
   Desteklenen türler (pdf, xlsx, xls, docx) js/dokuman-okuyucu.js'deki
   UYGULAMA İÇİ okuyucuda (tam ekran, sayfa çevirici, zoom) açılır.

   DÜZELTME (Android): dokuman-okuyucu.js zaten index.html'de yükleniyordu
   ama dokumanAc() hiç ona yönlendirmiyordu — bu yüzden her tür için
   window.open(url,'_blank') çalışıyordu. Native (Capacitor) WebView'de
   bu, "harici" bir bağlantı gibi Intent.ACTION_VIEW ile sisteme
   devrediliyor; cihazda bunun karşılığı bir görüntüleyici değil de
   doğrudan İndirme Yöneticisi olduğundan "önizle" butonu da indirme
   yapıyormuş gibi davranıyordu. Resim gibi desteklenmeyen türlerde
   (okuyucunun kendisi de böyle davranıyor) eski window.open korunur.
   ================================================================ */
function dokumanAc(id) {
  const d = dokumanlarListesi.find(x => x.id === id);
  if (!d) return;
  const url = d.hariciUrl || d.dosyaUrl;
  if (!url) { toast('Bu dökümanın dosyası bulunamadı.'); return; }
  const ad = d.dosyaAdi || d.hariciUrl || '';
  if (typeof window.DokumanOkuyucu !== 'undefined' && window.DokumanOkuyucu.destekliMi(ad)) {
    window.DokumanOkuyucu.ac(url, ad);
  } else {
    window.open(url, '_blank');
  }
}

function dokumanIndir(id) {
  const d = dokumanlarListesi.find(x => x.id === id);
  if (!d) return;
  const url = d.hariciUrl || d.dosyaUrl;
  if (!url) { toast('Bu dökümanın dosyası bulunamadı.'); return; }
  const a = document.createElement('a');
  a.href = url;
  a.download = d.dosyaAdi || d.ad || 'dosya';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


/* ================================================================
   Yükleme modalı
   ================================================================ */
function dokumanYukleModalAc() {
  const kategoriSecenekleri = DOKUMAN_KATEGORILER
    .map(k => `<option value="${k}">${k}</option>`).join('');
  const adminMi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;

  const body = `
    <div class="form-group">
      <label>Döküman Adı</label>
      <input id="dok_ad" placeholder="örn: Veli Rıza Onay Formu" style="width:100%;">
    </div>
    <div class="form-group">
      <label>Kategori</label>
      <select id="dok_kategori" style="width:100%;">${kategoriSecenekleri}</select>
    </div>
    <div class="form-group">
      <label>Açıklama (isteğe bağlı)</label>
      <input id="dok_aciklama" placeholder="Kısa açıklama..." style="width:100%;">
    </div>

    ${adminMi ? `
    <div class="form-group">
      <label>Görünürlük</label>
      <select id="dok_gorunurluk" style="width:100%;">
        <option value="herkes">🌐 Herkese Açık — tüm kullanıcılar görür</option>
        <option value="kisisel">🔒 Sadece Bana Özel</option>
      </select>
    </div>` : ''}

    <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-top:4px;">
      <div style="display:flex;">
        <button id="dok_sekme_dosya" class="btn btn-ghost" style="flex:1;min-width:0;border-radius:0;border-bottom:2px solid var(--accent,#4caf50);font-weight:600;font-size:12px;padding:8px 4px;white-space:normal;line-height:1.2;" onclick="dokumanSekmeAc('dosya')">📎 Dosya Yükle</button>
        <button id="dok_sekme_resim" class="btn btn-ghost" style="flex:1;min-width:0;border-radius:0;border-bottom:2px solid transparent;font-size:12px;padding:8px 4px;white-space:normal;line-height:1.2;" onclick="dokumanSekmeAc('resim')">🖼 Resimlerden<br>PDF</button>
        <button id="dok_sekme_url" class="btn btn-ghost" style="flex:1;min-width:0;border-radius:0;border-bottom:2px solid transparent;font-size:12px;padding:8px 4px;white-space:normal;line-height:1.2;" onclick="dokumanSekmeAc('url')">🔗 URL Ekle</button>
      </div>
      <div style="padding:12px;">
        <div id="dok_panel_dosya">
          <input type="file" id="dok_dosya" style="width:100%;" onchange="dokumanDosyaSecildi(this)">
          <div id="dok_dosya_bilgi" style="font-size:12px;color:var(--ink-muted);margin-top:6px;"></div>
        </div>
        <div id="dok_panel_resim" style="display:none;">
          <input type="file" id="dok_resimler" accept="image/*" multiple style="width:100%;" onchange="dokumanResimlerSecildi(this)">
          <div id="dok_resim_bilgi" style="font-size:12px;color:var(--ink-muted);margin-top:6px;"></div>
          <div style="margin-top:8px;">
            <label style="font-size:12px;color:var(--ink-muted);">Sayfa Yönü</label>
            <select id="dok_resim_sayfa_yonu" style="width:100%;" onchange="dokumanResimSayfaYonuDegisti(this.value)">
              <option value="otomatik">🤖 Otomatik (her görsele göre)</option>
              <option value="dikey">📄 Dikey</option>
              <option value="yatay">📃 Yatay</option>
            </select>
          </div>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button id="dok_resim_duzenle_btn" class="btn btn-ghost btn-sm" style="flex:1;" disabled onclick="dokumanResimEditoruAc()">✏️ Kırp/Döndür/Sırala</button>
            <button id="dok_resim_olustur_btn" class="btn btn-primary btn-sm" style="flex:1;" disabled onclick="dokumanResimlerdenPdfOlustur()">🖨 PDF Oluştur</button>
          </div>
          <div id="dok_resim_onizle" style="display:none;font-size:12px;color:#2e7d32;margin-top:6px;"></div>
          <div id="dok_resim_disa_aktar" style="display:none;gap:6px;margin-top:6px;">
            <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="dokumanResimPdfIndir()">⬇ İndir</button>
            <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="dokumanResimPdfPaylas()">📤 Paylaş</button>
          </div>
          <div style="font-size:11px;color:var(--ink-muted);margin-top:6px;">Resimleri seçtikten sonra "Kırp/Döndür/Sırala" ile düzenleyin — 4 köşeyi (birbirinden bağımsız, büyüteçli) belgenin gerçek köşelerine sürükleyin, yamuksa bile otomatik düz dikdörtgene dönüştürülür; ayrıca döndürme, sıralama, Belge Modu/Gri Tonlama/Siyah-Beyaz Metin filtreleri ve Parlaklık/Kontrast ayarı var. Sonra "PDF Oluştur"a basın; PDF hazır olunca Dökümanlar'a kaydedebilir ya da doğrudan İndir/Paylaş ile WhatsApp/Drive/e-postaya gönderebilirsiniz.</div>
        </div>
        <div id="dok_panel_url" style="display:none;">
          <input id="dok_url" placeholder="https://drive.google.com/..." style="width:100%;">
          <div style="font-size:12px;color:var(--ink-muted);margin-top:4px;">Google Drive, Dropbox vb. paylaşım linki</div>
        </div>
      </div>
    </div>
    <div id="dok_yukleme_durumu" style="display:none;font-size:12px;color:var(--ink-muted);margin-top:8px;"></div>
  `;

  _dokResimListe.forEach(it => URL.revokeObjectURL(it.url));
  _dokResimListe = [];
  _dokResimPdfBlob = null;

  modalAc('📁 Döküman Ekle', body, () => dokumanKaydet(), null);
  const kb = document.getElementById('modalKaydetBtn');
  if (kb) kb.textContent = '💾 Kaydet';
}

function dokumanSekmeAc(sekme) {
  document.getElementById('dok_panel_dosya').style.display = sekme === 'dosya' ? '' : 'none';
  document.getElementById('dok_panel_resim').style.display = sekme === 'resim' ? '' : 'none';
  document.getElementById('dok_panel_url').style.display   = sekme === 'url'   ? '' : 'none';
  ['dosya', 'resim', 'url'].forEach(s => {
    const btn = document.getElementById('dok_sekme_' + s);
    if (!btn) return;
    btn.style.borderBottom = s === sekme ? '2px solid var(--accent,#4caf50)' : '2px solid transparent';
    btn.style.fontWeight   = s === sekme ? '600' : '400';
  });
}

/* ================================================================
   Resimlerden PDF Oluşturma
   Her resim {blob, url, kirpma, kose, mod, filtre, ad} nesnesi olarak
   _dokResimListe'de tutulur. url = geçerli (döndürme uygulanmış)
   çalışma kopyasının object URL'i.
     kirpma : null | {x,y,w,h} — dikdörtgen kırpma oranları (0..1)
     kose   : null | {tl,tr,br,bl} her biri {x,y} — perspektif (yamuk)
              düzeltme için serbest 4 köşe oranları (0..1)
     mod    : 'dikdortgen' | 'perspektif' — hangi kırpma türü aktif
     filtre : 'orijinal' | 'belge' | 'gri'

   Döndürme fiziksel olarak uygulanır (canvas'a yeniden çizilip yeni
   bir blob/URL üretilir) — böylece kırpma/köşe her zaman "düz"
   (dönmemiş) bir kare üzerinde çalışır.

   Perspektif düzeltme: kullanıcının sürüklediği 4 köşe, düz bir
   dikdörtgene projektif dönüşümle (homografi, 4 nokta eşleşmesinden
   DLT ile çözülür) "düzleştirilir" — piksel piksel ters-eşleme +
   bilinear örnekleme ile.
   Belge Modu: gölgeyi bastırmak için görüntü, kendi yumuşatılmış
   (küçültülüp büyütülmüş) kopyasına bölünür (aydınlatma normalizasyonu),
   ardından otomatik kontrast/seviye germe uygulanır.
   Gri Tonlama: luminans + otomatik kontrast germe.

   PDF'in kendisi tek bir Blob olarak üretilir; Kaydet sırasında normal
   "dosya" akışına File olarak enjekte edilir (DokumanlarService
   değişmeden çalışır). İndir/Paylaş ise mevcut ortak
   uygulamaDosyaKaydet() köprüsünü (js/app.js — SavePlugin/blob
   fallback, "yedekle" özelliğinde kullanılanla aynı) kullanır.
   ================================================================ */
let _dokResimListe = [];   // [{ blob, url, kirpma, kose, mod, filtre, ad }]
let _dokResimSayfaYonu = 'otomatik'; // 'otomatik' | 'dikey' | 'yatay'

function dokumanResimSayfaYonuDegisti(deger) {
  _dokResimSayfaYonu = deger;
}
let _dokResimPdfBlob = null;
let _dokResimEditorIndex = 0;
let _dokKirpmaSurukleme = null; // 'tl' | 'br' | 'kose-tl' | 'kose-tr' | 'kose-br' | 'kose-bl' | null

async function dokumanResimlerSecildi(input) {
  const dosyalar = Array.from(input.files || []);
  _dokResimListe.forEach(it => URL.revokeObjectURL(it.url));
  _dokResimListe = [];
  _dokResimPdfBlob = null;
  const bilgi = document.getElementById('dok_resim_bilgi');
  if (bilgi) bilgi.textContent = 'Hazırlanıyor…';
  _dokResimPanelGuncelle();

  for (const f of dosyalar) {
    let url = URL.createObjectURL(f);
    try {
      // ÖNEMLİ DÜZELTME: telefon kamerası fotoğrafları genelde EXIF
      // "Orientation" etiketiyle kaydedilir (piksel verisi ham/yan
      // yatarken, "gösterirken şu kadar döndür" bilgisi ayrıca tutulur).
      // Ekrandaki <img> önizlemesi bunu otomatik uyguluyor ama arka
      // planda canvas ile işlerken (kırpma/perspektif/PDF üretimi) bu
      // otomatik düzeltme HER ZAMAN garanti değil — WebView sürümüne
      // göre farklı davranabiliyor, bu da "önizlemede yatay görünen
      // belgenin PDF'te yamuk/dikey çıkması" sorununa yol açıyordu.
      // Çözüm: EXIF yönünü kendimiz okuyup, seçim anında BİR KEZ fiziksel
      // olarak düzeltiyoruz; ondan sonra hattaki hiçbir adımın EXIF'le
      // uğraşmasına gerek kalmıyor (canvas çıktısında zaten EXIF yok).
      const yon = await _dokExifYonunuOku(f);
      if (yon && yon !== 1) {
        const img = await _dokImgYukle(url);
        const duzCanvas = _dokYonDuzeltilmisCanvasUret(img, yon);
        URL.revokeObjectURL(url);
        url = duzCanvas.toDataURL('image/jpeg', 0.92);
      }
    } catch (e) { /* EXIF okunamazsa orijinal görüntüyle devam edilir */ }

    _dokResimListe.push({
      blob: f, url,
      kose: null, filtre: 'orijinal',
      parlaklik: 0, kontrast: 0,
      ad: f.name
    });
  }
  _dokResimPanelGuncelle();
  if (_dokResimListe.length) dokumanResimEditoruAc();
}

/* JPEG dosyasının ilk ~128KB'lık kısmından (EXIF başlıkları hep dosya
   başındadır) Orientation etiketini (0x0112) okur. Standart değerler:
   1=normal, 3=180°, 6=90°CW gösterilmeli, 8=90°CCW gösterilmeli vb.
   Ayrıştırılamazsa (JPEG değil, EXIF yok vb.) sessizce 1 döner. */
function _dokExifYonunuOku(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target.result);
        if (view.getUint16(0, false) !== 0xFFD8) { resolve(1); return; }
        const uzunluk = view.byteLength;
        let offset = 2;
        while (offset < uzunluk - 1) {
          const marker = view.getUint16(offset, false);
          offset += 2;
          if (marker === 0xFFE1) {
            if (view.getUint32(offset + 2, false) !== 0x45786966) { resolve(1); return; } // "Exif"
            const tiffOffset = offset + 8;
            const buyukEndian = view.getUint16(tiffOffset, false) === 0x4D4D;
            const ifdOffset = tiffOffset + view.getUint32(tiffOffset + 4, !buyukEndian);
            const girisSayisi = view.getUint16(ifdOffset, !buyukEndian);
            for (let i = 0; i < girisSayisi; i++) {
              const girisOffset = ifdOffset + 2 + i * 12;
              if (view.getUint16(girisOffset, !buyukEndian) === 0x0112) {
                resolve(view.getUint16(girisOffset + 8, !buyukEndian));
                return;
              }
            }
            resolve(1); return;
          } else if ((marker & 0xFF00) !== 0xFF00) {
            break;
          } else {
            offset += view.getUint16(offset, false);
          }
        }
      } catch (err) { /* ayrıştırma başarısız */ }
      resolve(1);
    };
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file.slice(0, 131072));
  });
}

/* EXIF Orientation değerine göre standart 8 durumluk düzeltme matrisi
   (yaygın kullanılan bilinen dönüşüm tablosu). 5-8 arası durumlarda
   genişlik/yükseklik yer değiştirir. */
function _dokYonDuzeltilmisCanvasUret(img, yon) {
  const w = img.width, h = img.height;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (yon >= 5 && yon <= 8) { canvas.width = h; canvas.height = w; } else { canvas.width = w; canvas.height = h; }
  switch (yon) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
    default: break; // 1: değişiklik yok
  }
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function _dokResimPanelGuncelle() {
  const bilgi = document.getElementById('dok_resim_bilgi');
  const olusturBtn = document.getElementById('dok_resim_olustur_btn');
  const duzenleBtn = document.getElementById('dok_resim_duzenle_btn');
  const onizle = document.getElementById('dok_resim_onizle');
  const disaAktar = document.getElementById('dok_resim_disa_aktar');
  if (bilgi) bilgi.textContent = _dokResimListe.length ? `${_dokResimListe.length} resim seçildi.` : '';
  if (olusturBtn) olusturBtn.disabled = _dokResimListe.length === 0;
  if (duzenleBtn) duzenleBtn.disabled = _dokResimListe.length === 0;
  if (onizle) onizle.style.display = 'none';
  if (disaAktar) disaAktar.style.display = 'none';
}

/* ---------------- Sıralama / silme (düzenleyici dışından da kullanılabilir) ---------------- */
function dokumanResimSiraDegistir(index, yon) {
  const yeni = index + yon;
  if (yeni < 0 || yeni >= _dokResimListe.length) return;
  const gecici = _dokResimListe[index];
  _dokResimListe[index] = _dokResimListe[yeni];
  _dokResimListe[yeni] = gecici;
  if (_dokResimEditorIndex === index) _dokResimEditorIndex = yeni;
  else if (_dokResimEditorIndex === yeni) _dokResimEditorIndex = index;
  _dokEditorSeritCiz();
}

function dokumanResimListedenSil(index) {
  if (_dokResimListe.length <= 1) { toast('En az bir resim kalmalı — silmek yerine sekmeyi kapatıp yeniden seçin.'); return; }
  URL.revokeObjectURL(_dokResimListe[index].url);
  _dokResimListe.splice(index, 1);
  if (_dokResimEditorIndex >= _dokResimListe.length) _dokResimEditorIndex = _dokResimListe.length - 1;
  _dokEditorResmiYukle(_dokResimEditorIndex);
}

/* ---------------- Tam ekran düzenleyici ---------------- */
function _dokEditorOlustur() {
  if (document.getElementById('dokResimEditor')) return;
  const el = document.createElement('div');
  el.id = 'dokResimEditor';
  el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0b0f;display:none;flex-direction:column;';
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#17171d;color:#fff;flex-shrink:0;">
      <button class="btn btn-ghost btn-sm" style="color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);" onclick="dokumanResimEditoruKapat()">✕ Kapat</button>
      <div id="dokEditorBaslik" style="font-size:13px;font-weight:600;">Resim Düzenle</div>
      <button class="btn btn-ghost btn-sm" style="color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);" onclick="dokumanResimDondur()">↻ Döndür</button>
    </div>
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#101014;flex-shrink:0;">
      <div id="dokCanliOnizlemeKutu" style="width:52px;height:52px;flex-shrink:0;border-radius:8px;border:2px solid #4caf50;overflow:hidden;background:#222;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="_dokCanliOnizlemeBuyut()">
        <img id="dokCanliOnizlemeImg" style="width:100%;height:100%;object-fit:cover;display:none;-webkit-touch-callout:none;" oncontextmenu="return false;">
        <span id="dokCanliOnizlemeYukleniyor" style="font-size:9px;color:#888;text-align:center;">…</span>
      </div>
      <div style="flex:1;font-size:10px;color:#999;">Gerçek (işlenmiş) sonuç — dokununca büyütür</div>
      <button id="dokEditorKaydetBtn" class="btn btn-primary btn-sm" style="flex:0 0 auto;" onclick="dokumanResimKaydetKisayolu()">💾 Kaydet</button>
    </div>
    <div id="dokEditorGorselAlan" style="flex:1;position:relative;overflow:visible;display:flex;align-items:center;justify-content:center;background:#000;min-height:0;padding:24px;box-sizing:border-box;">
      <div id="dokEditorWrap" style="position:relative;display:inline-block;line-height:0;touch-action:none;">
        <img id="dokEditorImg" style="display:block;max-width:80vw;max-height:60vh;user-select:none;-webkit-user-drag:none;-webkit-touch-callout:none;" oncontextmenu="return false;">
        <div id="dokEditorKenarTLTR" class="dok-kenar" style="position:absolute;height:4px;background:#ff9800;transform-origin:0 50%;pointer-events:none;border-radius:2px;"></div>
        <div id="dokEditorKenarTRBR" class="dok-kenar" style="position:absolute;height:4px;background:#ff9800;transform-origin:0 50%;pointer-events:none;border-radius:2px;"></div>
        <div id="dokEditorKenarBRBL" class="dok-kenar" style="position:absolute;height:4px;background:#ff9800;transform-origin:0 50%;pointer-events:none;border-radius:2px;"></div>
        <div id="dokEditorKenarBLTL" class="dok-kenar" style="position:absolute;height:4px;background:#ff9800;transform-origin:0 50%;pointer-events:none;border-radius:2px;"></div>
        <div id="dokEditorKoseTL" class="dok-tutamac" style="position:absolute;width:26px;height:26px;margin:-13px;background:#ff9800;border-radius:50%;touch-action:none;border:2px solid #fff;"></div>
        <div id="dokEditorKoseTR" class="dok-tutamac" style="position:absolute;width:26px;height:26px;margin:-13px;background:#ff9800;border-radius:50%;touch-action:none;border:2px solid #fff;"></div>
        <div id="dokEditorKoseBR" class="dok-tutamac" style="position:absolute;width:26px;height:26px;margin:-13px;background:#ff9800;border-radius:50%;touch-action:none;border:2px solid #fff;"></div>
        <div id="dokEditorKoseBL" class="dok-tutamac" style="position:absolute;width:26px;height:26px;margin:-13px;background:#ff9800;border-radius:50%;touch-action:none;border:2px solid #fff;"></div>
        <div id="dokEditorBuyutec" style="display:none;position:absolute;width:100px;height:100px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,.6);pointer-events:none;background-repeat:no-repeat;z-index:30;">
          <div style="position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;border:2px solid #ff1744;box-sizing:border-box;"></div>
        </div>
      </div>
    </div>
    <div style="padding:10px 12px;background:#17171d;flex-shrink:0;">
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <button class="btn btn-ghost btn-sm" style="flex:1;color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);" onclick="dokumanResimOtomatikAlgila()">🔍 Otomatik Algıla</button>
        <button class="btn btn-ghost btn-sm" style="flex:1;color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);" onclick="dokumanResimKirpmaSifirla()">↺ Köşeleri Sıfırla</button>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
        <button id="dokFiltreOrijinalBtn" class="btn btn-ghost btn-sm dok-filtre-btn" style="flex:1;min-width:45%;color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);" onclick="dokumanResimFiltreSec('orijinal')">Orijinal</button>
        <button id="dokFiltreBelgeBtn" class="btn btn-ghost btn-sm dok-filtre-btn" style="flex:1;min-width:45%;color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);" onclick="dokumanResimFiltreSec('belge')">📄 Belge Modu</button>
        <button id="dokFiltreGriBtn" class="btn btn-ghost btn-sm dok-filtre-btn" style="flex:1;min-width:45%;color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);" onclick="dokumanResimFiltreSec('gri')">◑ Gri Tonlama</button>
        <button id="dokFiltreBwBtn" class="btn btn-ghost btn-sm dok-filtre-btn" style="flex:1;min-width:45%;color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);" onclick="dokumanResimFiltreSec('bw')">◼ S/B Metin</button>
      </div>
      <div style="margin-bottom:6px;">
        <label style="font-size:11px;color:#ccc;display:flex;justify-content:space-between;">☀️ Parlaklık <span id="dokParlaklikDeger">0</span></label>
        <input type="range" id="dokParlaklikSlider" min="-50" max="50" value="0" style="width:100%;" oninput="dokumanResimParlaklikDegisti(this.value)">
      </div>
      <div style="margin-bottom:8px;">
        <label style="font-size:11px;color:#ccc;display:flex;justify-content:space-between;">◐ Kontrast <span id="dokKontrastDeger">0</span></label>
        <input type="range" id="dokKontrastSlider" min="-50" max="50" value="0" style="width:100%;" oninput="dokumanResimKontrastDegisti(this.value)">
      </div>
      <div style="font-size:10px;color:#999;margin-bottom:8px;">Turuncu 4 köşe birbirinden tamamen bağımsız sürüklenir — her birini belgenin gerçek köşesine götürün (yamuksa bile). Bir köşeyi tutunca ona bağlı iki kenar yeşille vurgulanır ve büyüteç belirir. "PDF Oluştur"da bu 4 köşe otomatik olarak düz (90°) bir dikdörtgene dönüştürülür. Önizlemedeki filtre/parlaklık/kontrast yaklaşıktır, gerçek sonuç işleme sırasında uygulanır.</div>
      <div id="dokEditorSerit" style="display:flex;gap:6px;overflow-x:auto;padding:6px 0;"></div>
    </div>
  `;
  document.body.appendChild(el);

  // Genel önlem: köşe tutamacını basılı tutarken parmak altındaki gerçek
  // görsele (ana görsel, şerit küçük resimleri vb.) denk gelince Android'in
  // yerleşik "resmi kaydet/kopyala/paylaş" uzun-basma menüsü açılabiliyordu.
  // Editörün tamamında bunu engelliyoruz.
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  const surukleBaslat = (tip) => (e) => {
    e.preventDefault();
    _dokKirpmaSurukleme = tip;
    const it = _dokResimListe[_dokResimEditorIndex];
    if (it) _dokBuyutecAc(it.url);
  };
  ['TL', 'TR', 'BR', 'BL'].forEach(k => {
    document.getElementById('dokEditorKose' + k).addEventListener('pointerdown', surukleBaslat('kose-' + k.toLowerCase()));
  });
  document.addEventListener('pointermove', _dokKirpmaSuruklemeIsle);
  document.addEventListener('pointerup', _dokKirpmaSuruklemeBitir);
}

function dokumanResimEditoruAc() {
  if (!_dokResimListe.length) { toast('Önce resim seçin.'); return; }
  _dokEditorOlustur();
  document.getElementById('dokResimEditor').style.display = 'flex';
  _dokEditorResmiYukle(_dokResimEditorIndex || 0);
  _dokEditorGorselBoyutunuAyarla();
}

/* ÖNEMLİ DÜZELTME: görsel önceden sabit bir "vh" (ekran yüksekliği)
   değerine göre boyutlanıyordu — ama alt paneldeki (filtre butonları,
   kaydırıcılar, bilgi metni, şerit) içerik cihaza göre beklenenden fazla
   yer kaplayınca, görsel gerçekte kalan boş alandan BÜYÜK kalıp alt
   panelin üzerine taşıyordu; köşe tutamaçları da o bölgeye düşünce
   alttaki butonlar dokunuşu yutuyor, tutamaç hareket ettirilemiyordu.
   Çözüm: sabit vh yerine, alt panel tamamen render olduktan SONRA,
   ortadaki görsel alanının GERÇEK (o cihazdaki) boş piksel yüksekliği
   ölçülüp görsele üst sınır olarak veriliyor — hangi cihazda alt panel
   ne kadar yer kaplarsa kaplasın taşma imkansız hale geliyor. */
function _dokEditorGorselBoyutunuAyarla() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const alan = document.getElementById('dokEditorGorselAlan');
      const img = document.getElementById('dokEditorImg');
      if (!alan || !img) return;
      const guvenlikPayi = 40; // köşe tutamaçlarının (13px taşma) rahat sığması için
      const h = Math.max(120, alan.clientHeight - guvenlikPayi);
      const w = Math.max(120, alan.clientWidth - guvenlikPayi);
      img.style.maxHeight = h + 'px';
      img.style.maxWidth = w + 'px';
      // Görsel boyutu (dolayısıyla wrap'ın gerçek piksel boyutu) değiştiği
      // için kenar çizgilerini bu yeni boyuta göre yeniden çiz.
      requestAnimationFrame(() => {
        const it = _dokResimListe[_dokResimEditorIndex];
        if (it && it.kose) _dokEditorPoligonCiz(it.kose);
      });
    });
  });
}

function dokumanResimEditoruKapat() {
  const el = document.getElementById('dokResimEditor');
  if (el) el.style.display = 'none';
  _dokResimPanelGuncelle();
  _dokResimListe.length && (document.getElementById('dok_resim_bilgi').textContent = `${_dokResimListe.length} resim seçildi (düzenlendi).`);
}

/* ---------------- Sonucu Gör (gerçek işlenmiş önizleme) ----------------
   PDF oluşturmadan/indirmeden, o an seçili resmin TAM OLARAK PDF'e
   gireceği hali (gerçek kırpma/perspektif/filtre/parlaklık/kontrast
   işlemesinden geçmiş, _dokResimIsle ile) gösterir. Basılı tutunca
   orijinal (işlenmemiş) hali, bırakınca işlenmiş hali görünür. */
/* Küçük önizleme kutusuna (ve büyütülünce lightbox'a) dokununca son
   hesaplanmış GERÇEK sonucu gösterir — yeniden işlemez, sadece son
   otomatik güncellemenin sonucunu büyütür. */
function _dokCanliOnizlemeBuyut() {
  const img = document.getElementById('dokCanliOnizlemeImg');
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!img || !img.src || img.style.display === 'none') { toast('Önizleme henüz hazır değil, bir an bekleyin.'); return; }
  _dokSonucOnizlemeAc(img.src, it ? it.url : img.src);
}

let _dokCanliOnizlemeZamanlayici = null;
let _dokCanliOnizlemeIslemeSirasi = 0;

/* Kırpma/köşe/filtre/parlaklık/kontrast değiştikçe çağrılır — gerçek
   işleme (özellikle perspektif düzeltme) piksel-piksel maliyetli olduğu
   için HER hareket anında değil, kısa bir duraklamadan (debounce) sonra
   tetiklenir; bu sırada küçük önizleme kutusu "…" gösterir. */
function _dokCanliOnizlemeYenile() {
  const kutu = document.getElementById('dokCanliOnizlemeYukleniyor');
  if (kutu) kutu.style.display = '';
  if (_dokCanliOnizlemeZamanlayici) clearTimeout(_dokCanliOnizlemeZamanlayici);
  _dokCanliOnizlemeZamanlayici = setTimeout(_dokCanliOnizlemeIsle, 450);
}

async function _dokCanliOnizlemeIsle() {
  const it = _dokResimListe[_dokResimEditorIndex];
  const img = document.getElementById('dokCanliOnizlemeImg');
  const yukleniyor = document.getElementById('dokCanliOnizlemeYukleniyor');
  if (!it || !img) return;
  const buTur = ++_dokCanliOnizlemeIslemeSirasi;
  try {
    const { dataUrl } = await _dokResimIsle(it);
    if (buTur !== _dokCanliOnizlemeIslemeSirasi) return; // araya yeni bir değişiklik girdi, bu sonucu at
    img.src = dataUrl;
    img.style.display = 'block';
    if (yukleniyor) yukleniyor.style.display = 'none';
  } catch (e) {
    if (yukleniyor) yukleniyor.textContent = '!';
  }
}

function _dokSonucOnizlemeOlustur() {
  if (document.getElementById('dokSonucOnizleme')) return;
  const el = document.createElement('div');
  el.id = 'dokSonucOnizleme';
  el.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#000;display:none;flex-direction:column;align-items:center;justify-content:center;';
  el.innerHTML = `
    <button style="position:absolute;top:14px;left:14px;background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:8px 14px;font-size:13px;" onclick="_dokSonucOnizlemeKapat()">✕ Kapat</button>
    <img id="dokSonucImg" style="max-width:92vw;max-height:76vh;user-select:none;-webkit-user-drag:none;touch-action:none;-webkit-touch-callout:none;" oncontextmenu="return false;">
    <div style="position:absolute;bottom:24px;left:0;right:0;text-align:center;color:#ccc;font-size:12px;">👆 Basılı tutun: orijinal halini gösterir, bırakınca işlenmiş hal döner</div>
  `;
  document.body.appendChild(el);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  const img = el.querySelector('#dokSonucImg');
  const eskiyiGoster = (e) => { e.preventDefault(); if (img.dataset.orijinal) img.src = img.dataset.orijinal; };
  const yeniyeDon = () => { if (img.dataset.islenmis) img.src = img.dataset.islenmis; };
  img.addEventListener('pointerdown', eskiyiGoster);
  img.addEventListener('pointerup', yeniyeDon);
  img.addEventListener('pointerleave', yeniyeDon);
  img.addEventListener('pointercancel', yeniyeDon);
}

function _dokSonucOnizlemeAc(islenmisUrl, orijinalUrl) {
  _dokSonucOnizlemeOlustur();
  const el = document.getElementById('dokSonucOnizleme');
  const img = document.getElementById('dokSonucImg');
  img.dataset.islenmis = islenmisUrl;
  img.dataset.orijinal = orijinalUrl;
  img.src = islenmisUrl;
  el.style.display = 'flex';
}

function _dokSonucOnizlemeKapat() {
  const el = document.getElementById('dokSonucOnizleme');
  if (el) el.style.display = 'none';
}

/* ---------------- Düzenleyicideki Kaydet kısayolu ----------------
   PDF'i (mevcut tüm resimlerden, sırasıyla) oluşturur, düzenleyiciyi
   kapatıp modaldeki normal Kaydet akışını (dokumanKaydet — isim/kategori/
   açıklama/görünürlük alanlarını okuyup Dökümanlar'a yazan fonksiyon)
   tetikler. Tek dokunuşla "düzenle → PDF üret → kaydet". */
async function dokumanResimKaydetKisayolu() {
  if (!_dokResimListe.length) { toast('Önce resim seçin.'); return; }
  const btn = document.getElementById('dokEditorKaydetBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor…'; }
  try {
    await dokumanResimlerdenPdfOlustur();
    if (!_dokResimPdfBlob) throw new Error('PDF oluşturulamadı');
    dokumanResimEditoruKapat();
    await dokumanKaydet();
  } catch (e) {
    toast('Kaydetme hatası: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Kaydet'; }
  }
}

function _dokEditorSeritCiz() {
  const serit = document.getElementById('dokEditorSerit');
  if (!serit) return;
  serit.innerHTML = _dokResimListe.map((it, i) => `
    <div style="flex-shrink:0;width:56px;text-align:center;">
      <img src="${it.url}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:2px solid ${i === _dokResimEditorIndex ? '#4caf50' : 'transparent'};cursor:pointer;-webkit-touch-callout:none;" oncontextmenu="return false;" onclick="_dokEditorResmiYukle(${i})">
      <div style="display:flex;justify-content:center;gap:2px;margin-top:2px;">
        <button style="font-size:10px;padding:2px 4px;background:#333;color:#fff;border:none;border-radius:4px;" onclick="dokumanResimSiraDegistir(${i},-1)">▲</button>
        <button style="font-size:10px;padding:2px 4px;background:#333;color:#fff;border:none;border-radius:4px;" onclick="dokumanResimSiraDegistir(${i},1)">▼</button>
        <button style="font-size:10px;padding:2px 4px;background:#5c2323;color:#fff;border:none;border-radius:4px;" onclick="dokumanResimListedenSil(${i})">🗑</button>
      </div>
    </div>
  `).join('');
}

function _dokEditorResmiYukle(index) {
  if (index < 0 || index >= _dokResimListe.length) return;
  _dokResimEditorIndex = index;
  const it = _dokResimListe[index];
  if (it.parlaklik === undefined) it.parlaklik = 0;
  if (it.kontrast === undefined) it.kontrast = 0;
  const img = document.getElementById('dokEditorImg');
  img.onload = () => {
    if (!it.kose) it.kose = _dokOtomatikKoseAlgila(img) || _dokVarsayilanKose();
    _dokEditorGorselBoyutunuAyarla();
    _dokEditorPoligonCiz(it.kose);
    _dokFiltrePillGuncelle(it.filtre);
    const parlakSlider = document.getElementById('dokParlaklikSlider');
    const kontrastSlider = document.getElementById('dokKontrastSlider');
    if (parlakSlider) parlakSlider.value = it.parlaklik;
    if (kontrastSlider) kontrastSlider.value = it.kontrast;
    document.getElementById('dokParlaklikDeger').textContent = it.parlaklik;
    document.getElementById('dokKontrastDeger').textContent = it.kontrast;
    _dokEditorFiltreOnizlemesiUygula(it);
    const onizlemeImg = document.getElementById('dokCanliOnizlemeImg');
    if (onizlemeImg) onizlemeImg.style.display = 'none';
    _dokCanliOnizlemeYenile();
  };
  img.src = it.url;
  document.getElementById('dokEditorBaslik').textContent = `${index + 1} / ${_dokResimListe.length}`;
  _dokEditorSeritCiz();
}

function _dokVarsayilanKose() {
  return { tl: { x: 0.03, y: 0.03 }, tr: { x: 0.97, y: 0.03 }, br: { x: 0.97, y: 0.97 }, bl: { x: 0.03, y: 0.97 } };
}

/* ---------------- Otomatik köşe algılama ----------------
   Sayfadaki (genelde parlak/beyaz) kağıdı arka plandan (masa, zemin vb.)
   ayırmaya çalışır: küçük bir kopya üzerinde griye çevirip Otsu eşiğiyle
   "kağıt" (parlak) pikselleri ayırır, görüntüyü 4 çeyreğe böler ve her
   çeyrekte köşeye en yakın kağıt pikselini arar (OMR modülündeki
   sayfaKoseleriniAra() ile aynı "çeyrek blob arama" mantığı). Güvenilir
   bir sonuç bulunamazsa (kontrast yetersiz, alan çok küçük vb.) null
   döner — çağıran taraf varsayılan tam-kare köşelere düşer. */
function _dokOtomatikKoseAlgila(img) {
  try {
    const HEDEF_GEN = 240;
    const oran = HEDEF_GEN / img.width;
    const kw = HEDEF_GEN, kh = Math.max(1, Math.round(img.height * oran));
    const c = document.createElement('canvas');
    c.width = kw; c.height = kh;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, kw, kh);
    const veri = ctx.getImageData(0, 0, kw, kh);
    const p = veri.data;
    const gri = new Uint8ClampedArray(kw * kh);
    for (let i = 0, j = 0; i < p.length; i += 4, j++) gri[j] = p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114;

    const esik = _dokOtsuEsigiBasit(gri);
    if (esik < 30 || esik > 235) return null; // kontrast yetersiz, güvenilmez

    const kagitMi = (x, y) => gri[y * kw + x] > esik;
    const yariGen = Math.ceil(kw / 2), yariYuk = Math.ceil(kh / 2);

    function ceyrekAra(x0, x1, y0, y1, skor) {
      let enIyi = null, enIyiSkor = -Infinity;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (!kagitMi(x, y)) continue;
          const s = skor(x, y);
          if (s > enIyiSkor) { enIyiSkor = s; enIyi = { x, y }; }
        }
      }
      return enIyi;
    }

    const tl = ceyrekAra(0, yariGen, 0, yariYuk, (x, y) => -(x + y));
    const tr = ceyrekAra(yariGen, kw, 0, yariYuk, (x, y) => (x - y));
    const br = ceyrekAra(yariGen, kw, yariYuk, kh, (x, y) => (x + y));
    const bl = ceyrekAra(0, yariGen, yariYuk, kh, (x, y) => -(x - y));
    if (!tl || !tr || !br || !bl) return null;

    const kose = {
      tl: { x: tl.x / kw, y: tl.y / kh },
      tr: { x: tr.x / kw, y: tr.y / kh },
      br: { x: br.x / kw, y: br.y / kh },
      bl: { x: bl.x / kw, y: bl.y / kh },
    };

    // Dejenere/çok küçük sonuçları ele (yanlış pozitifleri filtrele)
    const genislik = Math.max(kose.tr.x - kose.tl.x, kose.br.x - kose.bl.x);
    const yukseklik = Math.max(kose.bl.y - kose.tl.y, kose.br.y - kose.tr.y);
    if (genislik < 0.15 || yukseklik < 0.15) return null;

    return kose;
  } catch (e) {
    return null;
  }
}

function _dokOtsuEsigiBasit(griDizi) {
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < griDizi.length; i++) histogram[griDizi[i]]++;
  const toplamPiksel = griDizi.length;
  let toplam = 0;
  for (let t = 0; t < 256; t++) toplam += t * histogram[t];
  let toplamArka = 0, agirlikArka = 0, maxVaryans = 0, esik = 127;
  for (let t = 0; t < 256; t++) {
    agirlikArka += histogram[t];
    if (agirlikArka === 0) continue;
    const agirlikOn = toplamPiksel - agirlikArka;
    if (agirlikOn === 0) break;
    toplamArka += t * histogram[t];
    const ortalamaArka = toplamArka / agirlikArka;
    const ortalamaOn = (toplam - toplamArka) / agirlikOn;
    const araVaryans = agirlikArka * agirlikOn * Math.pow(ortalamaArka - ortalamaOn, 2);
    if (araVaryans > maxVaryans) { maxVaryans = araVaryans; esik = t; }
  }
  return esik;
}

/* "🔍 Otomatik Algıla" butonu — kullanıcı isterse yeniden tetikleyebilir
   (ör. döndürdükten sonra, ya da ilk sonuç yanlışsa). */
async function dokumanResimOtomatikAlgila() {
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  try {
    const img = await _dokImgYukle(it.url);
    const otomatik = _dokOtomatikKoseAlgila(img);
    if (otomatik) {
      it.kose = otomatik;
      _dokEditorPoligonCiz(it.kose);
      _dokCanliOnizlemeYenile();
      toast('Köşeler otomatik bulundu — gerekirse elle ince ayar yapabilirsiniz.');
    } else {
      toast('Köşeler otomatik bulunamadı (kontrast yetersiz) — elle ayarlayın.');
    }
  } catch (e) {
    toast('Otomatik algılama hatası: ' + e.message);
  }
}

/* Köşeleri birleştiren 4 kenarı, wrap'ın GERÇEK piksel boyutuna göre
   (getBoundingClientRect) konumlandırılmış/döndürülmüş basit div'lerle
   çizer. NOT: eskiden SVG <polygon> kullanılıyordu ama bazı Android
   WebView sürümlerinde (özellikle vector-effect="non-scaling-stroke")
   görünmez kalabildiği görüldü — bu yöntem her cihazda aynı şekilde
   çalışan sade CSS transform'lara dayanıyor. */
function _dokEditorPoligonCiz(kose) {
  const k = kose || _dokVarsayilanKose();
  const wrap = document.getElementById('dokEditorWrap');
  const wrapRect = wrap ? wrap.getBoundingClientRect() : { width: 0, height: 0 };
  _dokKenarCiz('dokEditorKenarTLTR', k.tl, k.tr, wrapRect);
  _dokKenarCiz('dokEditorKenarTRBR', k.tr, k.br, wrapRect);
  _dokKenarCiz('dokEditorKenarBRBL', k.br, k.bl, wrapRect);
  _dokKenarCiz('dokEditorKenarBLTL', k.bl, k.tl, wrapRect);
  ['tl', 'tr', 'br', 'bl'].forEach(c => {
    const el = document.getElementById('dokEditorKose' + c.toUpperCase());
    if (el) { el.style.left = (k[c].x * 100) + '%'; el.style.top = (k[c].y * 100) + '%'; }
  });
}

function _dokKenarCiz(divId, p1, p2, wrapRect) {
  const el = document.getElementById(divId);
  if (!el || !wrapRect.width || !wrapRect.height) return;
  const x1 = p1.x * wrapRect.width, y1 = p1.y * wrapRect.height;
  const x2 = p2.x * wrapRect.width, y2 = p2.y * wrapRect.height;
  const dx = x2 - x1, dy = y2 - y1;
  const uzunluk = Math.hypot(dx, dy);
  const aci = Math.atan2(dy, dx) * 180 / Math.PI;
  el.style.left = x1 + 'px';
  el.style.top = (y1 - 2) + 'px'; // 4px kalınlığı ortalamak için
  el.style.width = uzunluk + 'px';
  el.style.transform = `rotate(${aci}deg)`;
}

/* Bir köşe sürüklenirken, o köşeye bağlı İKİ KENARI (önceki-bu köşe ve
   bu köşe-sonraki köşe) yeşile boyayarak vurgular — kullanıcı sadece
   izole bir nokta değil, hangi iki kenarı hareket ettirdiğini görsün diye. */
const _DOK_KOSE_SIRA = ['tl', 'tr', 'br', 'bl'];
const _DOK_KENAR_DIVLERI = ['dokEditorKenarTLTR', 'dokEditorKenarTRBR', 'dokEditorKenarBRBL', 'dokEditorKenarBLTL'];
const _DOK_KENAR_ESLESME = { 'tl-tr': 'dokEditorKenarTLTR', 'tr-br': 'dokEditorKenarTRBR', 'br-bl': 'dokEditorKenarBRBL', 'bl-tl': 'dokEditorKenarBLTL' };

function _dokEditorKenarVurgusuGuncelle(kose, aktifKoseAdi) {
  _DOK_KENAR_DIVLERI.forEach(id => { const el = document.getElementById(id); if (el) el.style.background = '#ff9800'; });
  if (!aktifKoseAdi) return;
  const idx = _DOK_KOSE_SIRA.indexOf(aktifKoseAdi);
  const onceki = _DOK_KOSE_SIRA[(idx + 3) % 4];
  const sonraki = _DOK_KOSE_SIRA[(idx + 1) % 4];
  _dokKenarBoya(onceki, aktifKoseAdi);
  _dokKenarBoya(aktifKoseAdi, sonraki);
}

function _dokKenarBoya(a, b) {
  const id = _DOK_KENAR_ESLESME[`${a}-${b}`] || _DOK_KENAR_ESLESME[`${b}-${a}`];
  const el = id && document.getElementById(id);
  if (el) el.style.background = '#4caf50';
}

function _dokEditorKenarVurgusuGizle() {
  _DOK_KENAR_DIVLERI.forEach(id => { const el = document.getElementById(id); if (el) el.style.background = '#ff9800'; });
}

function _dokKirpmaSuruklemeIsle(e) {
  if (!_dokKirpmaSurukleme) return;
  const wrap = document.getElementById('dokEditorWrap');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  let x = (e.clientX - rect.left) / rect.width;
  let y = (e.clientY - rect.top) / rect.height;
  x = Math.min(1, Math.max(0, x));
  y = Math.min(1, Math.max(0, y));
  _dokBuyutecKonumlandir(e.clientX, e.clientY, x, y, rect);

  const kose = _dokKirpmaSurukleme.slice(5); // 'kose-tl' -> 'tl'
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  if (!it.kose) it.kose = _dokVarsayilanKose();
  it.kose[kose] = { x, y };
  _dokEditorPoligonCiz(it.kose);
  _dokEditorKenarVurgusuGuncelle(it.kose, kose);
}

function _dokKirpmaSuruklemeBitir() {
  const suruklemeVardi = !!_dokKirpmaSurukleme;
  _dokKirpmaSurukleme = null;
  _dokBuyutecKapat();
  _dokEditorKenarVurgusuGizle();
  if (suruklemeVardi) _dokCanliOnizlemeYenile();
}

/* ---------------- Büyüteçli köşe tutucu ----------------
   Bir köşe/tutamaç sürüklenirken parmağın kapattığı bölgeyi
   göstermek için, resmin aynısını arka plan (background-image)
   olarak kullanan yuvarlak bir büyüteç, dokunulan noktanın biraz
   üstünde belirir. Ortadaki kırmızı nokta tam hedef pikseli işaret
   eder. Performans için canvas yerine CSS background-position/size
   kullanılıyor (her hareket olayında yeniden çizim yok). */
function _dokBuyutecAc(url) {
  const b = document.getElementById('dokEditorBuyutec');
  if (!b) return;
  b.style.backgroundImage = `url('${url}')`;
  b.style.display = 'block';
}

function _dokBuyutecKonumlandir(clientX, clientY, xOran, yOran, wrapRect) {
  const b = document.getElementById('dokEditorBuyutec');
  if (!b || b.style.display === 'none') return;
  const BOYUT = 100, ZOOM = 2.8;
  b.style.backgroundSize = `${wrapRect.width * ZOOM}px ${wrapRect.height * ZOOM}px`;
  b.style.backgroundPosition = `${-(xOran * wrapRect.width * ZOOM - BOYUT / 2)}px ${-(yOran * wrapRect.height * ZOOM - BOYUT / 2)}px`;
  const localX = clientX - wrapRect.left;
  const localY = clientY - wrapRect.top;
  let top = localY - BOYUT - 26;
  if (top < -wrapRect.top) top = localY + 26; // yukarıda yer yoksa aşağıda göster
  b.style.left = (localX - BOYUT / 2) + 'px';
  b.style.top = top + 'px';
}

function _dokBuyutecKapat() {
  const b = document.getElementById('dokEditorBuyutec');
  if (b) b.style.display = 'none';
}

function dokumanResimKirpmaSifirla() {
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  it.kose = _dokVarsayilanKose();
  _dokEditorPoligonCiz(it.kose);
  _dokCanliOnizlemeYenile();
}

/* ---------------- Filtre + Parlaklık/Kontrast seçimi
   (önizleme CSS ile yaklaşıktır, gerçek işlem piksel düzeyinde
   PDF üretiminde yapılır) ---------------- */
function dokumanResimFiltreSec(filtre) {
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  it.filtre = filtre;
  _dokFiltrePillGuncelle(filtre);
  _dokEditorFiltreOnizlemesiUygula(it);
  _dokCanliOnizlemeYenile();
}

function dokumanResimParlaklikDegisti(deger) {
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  it.parlaklik = parseInt(deger, 10);
  const etiket = document.getElementById('dokParlaklikDeger');
  if (etiket) etiket.textContent = deger;
  _dokEditorFiltreOnizlemesiUygula(it);
  _dokCanliOnizlemeYenile();
}

function dokumanResimKontrastDegisti(deger) {
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  it.kontrast = parseInt(deger, 10);
  const etiket = document.getElementById('dokKontrastDeger');
  if (etiket) etiket.textContent = deger;
  _dokEditorFiltreOnizlemesiUygula(it);
  _dokCanliOnizlemeYenile();
}

function _dokEditorFiltreOnizlemesiUygula(it) {
  const img = document.getElementById('dokEditorImg');
  if (!img) return;
  const taban = _dokFiltreCssOnizleme(it.filtre);
  const parlaklik = `brightness(${1 + (it.parlaklik || 0) / 100})`;
  const kontrast = `contrast(${1 + (it.kontrast || 0) / 100})`;
  img.style.filter = [taban === 'none' ? '' : taban, parlaklik, kontrast].filter(Boolean).join(' ');
}

function _dokFiltrePillGuncelle(filtre) {
  const harita = { orijinal: 'dokFiltreOrijinalBtn', belge: 'dokFiltreBelgeBtn', gri: 'dokFiltreGriBtn', bw: 'dokFiltreBwBtn' };
  Object.entries(harita).forEach(([k, id]) => {
    const btn = document.getElementById(id);
    if (btn) btn.style.background = (k === filtre) ? '#4caf50' : 'rgba(255,255,255,.15)';
  });
}

function _dokFiltreCssOnizleme(filtre) {
  if (filtre === 'belge') return 'contrast(1.25) brightness(1.08) saturate(.15)';
  if (filtre === 'gri') return 'grayscale(1) contrast(1.15)';
  if (filtre === 'bw') return 'grayscale(1) contrast(2.4) brightness(1.05)';
  return 'none';
}

/* Döndürme fiziksel olarak uygulanır: mevcut çalışma görseli canvas'a
   90° çizilip yeni bir blob/URL üretilir, eski URL serbest bırakılır.
   Döndürünce kırpma (artık farklı bir kareye ait olacağı için) sıfırlanır. */
/* Döndürme fiziksel olarak uygulanır: mevcut çalışma görseli canvas'a
   90° çizilip yeni bir görsele dönüştürülür. NOT: eskiden canvas.toBlob()
   kullanılıyordu — bazı Android WebView sürümlerinde bu API'nin sessizce
   hiç geri çağrı yapmaması/başarısız olması mümkün, bu yüzden daha
   evrensel desteklenen toDataURL()'e geçirildi ve hata olursa artık
   sessizce yutulmuyor, kullanıcıya toast ile bildiriliyor. */
async function dokumanResimDondur() {
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  try {
    const kaynak = await _dokImgYukle(it.url);
    const canvas = document.createElement('canvas');
    canvas.width = kaynak.height; canvas.height = kaynak.width;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(kaynak, -kaynak.width / 2, -kaynak.height / 2);
    const yeniUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (it.url.indexOf('blob:') === 0) URL.revokeObjectURL(it.url);
    it.url = yeniUrl;
    it.kose = null;
    _dokEditorResmiYukle(_dokResimEditorIndex);
  } catch (e) {
    toast('Döndürme hatası: ' + e.message);
  }
}

/* ---------------- PDF üretimi ---------------- */
async function dokumanResimlerdenPdfOlustur() {
  if (!_dokResimListe.length) { toast('Önce resim seçin.'); return; }
  if (typeof window.jspdf === 'undefined') { toast('PDF kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.'); return; }

  const olusturBtn = document.getElementById('dok_resim_olustur_btn');
  const onizle = document.getElementById('dok_resim_onizle');
  const disaAktar = document.getElementById('dok_resim_disa_aktar');
  if (olusturBtn) { olusturBtn.disabled = true; }

  try {
    const { jsPDF } = window.jspdf;
    let pdf = null;
    const KENAR = 8;

    for (let i = 0; i < _dokResimListe.length; i++) {
      if (olusturBtn) olusturBtn.textContent = `Oluşturuluyor… (${i + 1}/${_dokResimListe.length})`;
      const { dataUrl, w: gw, h: gh } = await _dokResimIsle(_dokResimListe[i]);
      const yatay = _dokResimSayfaYonu === 'yatay' ? true : _dokResimSayfaYonu === 'dikey' ? false : gw > gh;
      const A4_W = yatay ? 297 : 210, A4_H = yatay ? 210 : 297;

      if (i === 0) {
        pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: yatay ? 'l' : 'p' });
      } else {
        pdf.addPage('a4', yatay ? 'l' : 'p');
      }

      const maxW = A4_W - KENAR * 2, maxH = A4_H - KENAR * 2;
      const oran = Math.min(maxW / gw, maxH / gh, 1);
      const w = gw * oran, h = gh * oran;
      const x = (A4_W - w) / 2, y = (A4_H - h) / 2;
      pdf.addImage(dataUrl, 'JPEG', x, y, w, h);
    }

    _dokResimPdfBlob = pdf.output('blob');

    const adEl = document.getElementById('dok_ad');
    if (adEl && !adEl.value.trim()) {
      adEl.value = _dokResimListe.length > 1
        ? `${_dokResimListe.length} Sayfalık Belge`
        : (_dokResimListe[0].ad || 'Belge').replace(/\.[^.]+$/, '');
      // DÜZELTME: adEl.value'yu programatik atamak "input" olayını
      // tetiklemiyor — modal'ın genel Kaydet-buton doğrulaması muhtemelen
      // bu olayı dinleyip butonu aktive ediyor, otomatik doldurma bunu
      // hiç tetiklemediği için Kaydet pasif kalıyordu. Olayı elle
      // gönderip, garanti olsun diye butonu da doğrudan aktive ediyoruz.
      adEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const kaydetBtn = document.getElementById('modalKaydetBtn');
    if (kaydetBtn) kaydetBtn.disabled = false;
    if (onizle) {
      onizle.style.display = '';
      onizle.textContent = `✅ PDF hazır (${_dokResimListe.length} sayfa, ${dosyaBoyutuFormat(_dokResimPdfBlob.size)}).`;
    }
    if (disaAktar) disaAktar.style.display = 'flex';
    toast('PDF oluşturuldu — Kaydet, İndir veya Paylaş\'ı kullanabilirsiniz.');
  } catch (e) {
    toast('PDF oluşturma hatası: ' + e.message);
  } finally {
    if (olusturBtn) { olusturBtn.disabled = false; olusturBtn.textContent = '🖨 PDF Oluştur'; }
  }
}

/* Bir resmi PDF'e eklenecek son haline getirir:
   1) Perspektif modundaysa (kose var) homografiyle düzleştirir,
      yoksa dikdörtgen kırpma uygular (kirpma yoksa görselin tamamı).
   2) WebView belleğini korumak için max 1600px kenara indirger.
   3) Seçiliyse Belge Modu (gölge bastırma+kontrast) veya Gri Tonlama
      filtresini piksel düzeyinde uygular.
   4) JPEG'e sıkıştırıp dataURL döndürür. */
async function _dokResimIsle(item) {
  const img = await _dokImgYukle(item.url);
  // Artık tek kırpma sistemi var: 4 bağımsız köşe, her zaman düz (90°)
  // bir dikdörtgene perspektif dönüşümle düzeltilir. Köşe hiç
  // dokunulmamışsa (varsayılan, neredeyse tam kare) sonuç zaten tüm
  // görüntüye çok yakın olur — yani ayrıca "kırpma yok" durumu için özel
  // bir kod yoluna gerek kalmadı.
  let canvas = _dokPerspektifCanvasUret(img, item.kose || _dokVarsayilanKose());
  canvas = _dokBoyutSinirla(canvas, 2000);

  const ctx = canvas.getContext('2d');
  if (item.filtre === 'belge') _dokBelgeModuUygula(ctx, canvas.width, canvas.height);
  else if (item.filtre === 'gri') _dokGriTonlamaUygula(ctx, canvas.width, canvas.height);
  else if (item.filtre === 'bw') _dokSiyahBeyazUygula(ctx, canvas.width, canvas.height);

  if (item.parlaklik || item.kontrast) _dokParlaklikKontrastUygula(ctx, canvas.width, canvas.height, item.parlaklik || 0, item.kontrast || 0);

  return { dataUrl: canvas.toDataURL('image/jpeg', 0.93), w: canvas.width, h: canvas.height };
}

function _dokImgYukle(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function _dokKirpCanvasUret(img, kirpma) {
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (kirpma) {
    sx = Math.round(kirpma.x * img.width);
    sy = Math.round(kirpma.y * img.height);
    sw = Math.round(kirpma.w * img.width);
    sh = Math.round(kirpma.h * img.height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = sw; canvas.height = sh;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}

function _dokBoyutSinirla(canvas, maxKenar) {
  const w = canvas.width, h = canvas.height;
  if (w <= maxKenar && h <= maxKenar) return canvas;
  const oran = Math.min(maxKenar / w, maxKenar / h);
  const yeni = document.createElement('canvas');
  yeni.width = Math.round(w * oran); yeni.height = Math.round(h * oran);
  yeni.getContext('2d').drawImage(canvas, 0, 0, yeni.width, yeni.height);
  return yeni;
}

/* ---------------- Perspektif (yamukluk) düzeltme ----------------
   4 köşe noktasından (kullanıcının sürüklediği) düz bir dikdörtgene
   projektif dönüşüm: çıkış piksellerinden kaynak piksellere TERS
   eşleme (homografi matrisi, 4 nokta eşleşmesinden Gauss eliminasyonu
   ile çözülür) + bilinear örnekleme. */
function _dokPerspektifCanvasUret(img, kose) {
  const kaynakNoktalari = ['tl', 'tr', 'br', 'bl'].map(k => ({
    x: kose[k].x * img.width, y: kose[k].y * img.height
  }));
  const genUst = _dokMesafe(kaynakNoktalari[0], kaynakNoktalari[1]);
  const genAlt = _dokMesafe(kaynakNoktalari[3], kaynakNoktalari[2]);
  const yukSol = _dokMesafe(kaynakNoktalari[0], kaynakNoktalari[3]);
  const yukSag = _dokMesafe(kaynakNoktalari[1], kaynakNoktalari[2]);

  let cikisW = Math.round(Math.max(genUst, genAlt));
  let cikisH = Math.round(Math.max(yukSol, yukSag));
  const MAX_ISLEME = 1500; // piksel-piksel warp maliyeti için işleme sırasındaki sınır
  if (cikisW > MAX_ISLEME || cikisH > MAX_ISLEME) {
    const oran = Math.min(MAX_ISLEME / cikisW, MAX_ISLEME / cikisH);
    cikisW = Math.round(cikisW * oran); cikisH = Math.round(cikisH * oran);
  }
  cikisW = Math.max(cikisW, 20); cikisH = Math.max(cikisH, 20);

  const kaynakCanvas = document.createElement('canvas');
  kaynakCanvas.width = img.width; kaynakCanvas.height = img.height;
  kaynakCanvas.getContext('2d').drawImage(img, 0, 0);
  const kaynakVeri = kaynakCanvas.getContext('2d').getImageData(0, 0, img.width, img.height);

  const destNoktalari = [{ x: 0, y: 0 }, { x: cikisW, y: 0 }, { x: cikisW, y: cikisH }, { x: 0, y: cikisH }];
  const h = _dokHomografiCoz(destNoktalari, kaynakNoktalari); // dest(x,y) -> kaynak(X,Y)

  const cikisCanvas = document.createElement('canvas');
  cikisCanvas.width = cikisW; cikisCanvas.height = cikisH;
  const cikisCtx = cikisCanvas.getContext('2d');
  const cikisVeri = cikisCtx.createImageData(cikisW, cikisH);

  for (let dy = 0; dy < cikisH; dy++) {
    for (let dx = 0; dx < cikisW; dx++) {
      const denom = h[6] * dx + h[7] * dy + 1;
      const sx = (h[0] * dx + h[1] * dy + h[2]) / denom;
      const sy = (h[3] * dx + h[4] * dy + h[5]) / denom;
      const renk = _dokBilinearOrnekle(kaynakVeri, sx, sy);
      const di = (dy * cikisW + dx) * 4;
      cikisVeri.data[di] = renk[0]; cikisVeri.data[di + 1] = renk[1]; cikisVeri.data[di + 2] = renk[2]; cikisVeri.data[di + 3] = 255;
    }
  }
  cikisCtx.putImageData(cikisVeri, 0, 0);
  return cikisCanvas;
}

function _dokMesafe(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function _dokBilinearOrnekle(imgVeri, x, y) {
  const w = imgVeri.width, h = imgVeri.height;
  if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) {
    const cx = Math.max(0, Math.min(w - 1, Math.round(x)));
    const cy = Math.max(0, Math.min(h - 1, Math.round(y)));
    const i = (cy * w + cx) * 4;
    return [imgVeri.data[i], imgVeri.data[i + 1], imgVeri.data[i + 2]];
  }
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const dx = x - x0, dy = y - y0;
  const d = imgVeri.data;
  const i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x0 + 1) * 4, i01 = ((y0 + 1) * w + x0) * 4, i11 = ((y0 + 1) * w + x0 + 1) * 4;
  const sonuc = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const ust = d[i00 + k] * (1 - dx) + d[i10 + k] * dx;
    const alt = d[i01 + k] * (1 - dx) + d[i11 + k] * dx;
    sonuc[k] = ust * (1 - dy) + alt * dy;
  }
  return sonuc;
}

/* 4 nokta eşleşmesinden (başlangıç->bitiş) projektif dönüşüm matrisi:
   X = (h0*x+h1*y+h2)/(h6*x+h7*y+1), Y = (h3*x+h4*y+h5)/(h6*x+h7*y+1)
   8 bilinmeyen için 8 denklemlik doğrusal sistem, Gauss eliminasyonu
   (kısmi pivotlama) ile çözülür. */
function _dokHomografiCoz(baslangicNoktalari, bitisNoktalari) {
  const A = [], B = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = baslangicNoktalari[i];
    const { x: X, y: Y } = bitisNoktalari[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); B.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); B.push(Y);
  }
  return _dokGaussCoz(A, B);
}

function _dokGaussCoz(A, B) {
  const n = A.length;
  for (let i = 0; i < n; i++) A[i].push(B[i]);
  for (let sutun = 0; sutun < n; sutun++) {
    let pivotSatir = sutun;
    for (let s = sutun + 1; s < n; s++) if (Math.abs(A[s][sutun]) > Math.abs(A[pivotSatir][sutun])) pivotSatir = s;
    const gecici = A[sutun]; A[sutun] = A[pivotSatir]; A[pivotSatir] = gecici;
    const pivot = A[sutun][sutun] || 1e-9;
    for (let s = 0; s < n; s++) {
      if (s === sutun) continue;
      const oran = A[s][sutun] / pivot;
      for (let k = sutun; k <= n; k++) A[s][k] -= oran * A[sutun][k];
    }
  }
  return A.map((satir, i) => satir[n] / (satir[i] || 1e-9));
}

/* ---------------- Belge Modu / Gri Tonlama / S-B Metin filtreleri ----------------
   Belge Modu: görüntü kendi ÇOK küçültülüp geri büyütülmüş (yumuşatılmış)
   kopyasına bölünerek aydınlatma/gölge normalize edilir (klasik "arka
   planı düzleştirme" hilesi), ardından otomatik beyaz dengesi ve kontrast
   germe uygulanır.
   ÖNEMLİ DÜZELTME: arka plan bölmesi eskiden HER KANALI KENDİ yerel arka
   plan değerine ayrı ayrı bölüyordu — küçültülmüş arka plan tahmini
   pikselinde ufak bir renk gürültüsü olduğunda (ör. kağıdın bir köşesi
   biraz sarıya/pembeye kaçtığında) bu, tüm görüntüde pembe/yeşil renk
   kaymasına yol açıyordu. Artık TEK bir gri (luminans) arka plan değeri
   kullanılıyor — böylece orijinal renk oranları korunuyor, sadece
   gölge/aydınlık dengeleniyor; renk tonu kayması ayrıca beyaz dengesiyle
   düzeltiliyor.
   Gri Tonlama: luminans dönüşümü + otomatik kontrast germe.
   S/B Metin: gri tonlama + Otsu eşiklemesiyle tam siyah-beyaz (ikili)
   tarama görünümü — metin belgeleri için en yüksek okunabilirlik. */
function _dokBelgeModuUygula(ctx, w, h) {
  // ÖNEMLİ: bir önceki sürümde renk kaymasını önlemek için TEK gri
  // (luminans) arka plan kullanılmıştı — ama bu, kağıdın/ışığın gerçek
  // renk tonuna (pembemsi) hiç dokunmuyordu, sadece parlaklığı düzeltip
  // pembe tonu olduğu gibi bırakıyordu. Asıl düzeltme KANAL BAŞINA yerel
  // beyaz dengesi olmalı — önceki denemedeki rastgele leke sorunu, arka
  // plan tahmininin ÇOK küçük/gürültülü bir gride dayanmasından
  // kaynaklanıyordu. Şimdi daha büyük/yumuşak bir gride dayandırılıyor VE
  // düzeltme oranı makul bir aralıkla sınırlandırılıyor — hem gerçek renk
  // kaymasını düzeltir hem de gürültüden kaynaklı lekelenmeyi önler.
  const kucukW = Math.max(8, Math.round(w / 60)), kucukH = Math.max(8, Math.round(h / 60));
  const kucukCanvas = document.createElement('canvas');
  kucukCanvas.width = kucukW; kucukCanvas.height = kucukH;
  kucukCanvas.getContext('2d').drawImage(ctx.canvas, 0, 0, kucukW, kucukH);
  const buyukCanvas = document.createElement('canvas');
  buyukCanvas.width = w; buyukCanvas.height = h;
  const buyukCtx = buyukCanvas.getContext('2d');
  buyukCtx.drawImage(kucukCanvas, 0, 0, w, h);
  const arkaplan = buyukCtx.getImageData(0, 0, w, h).data;

  const veri = ctx.getImageData(0, 0, w, h);
  const p = veri.data;
  const MIN_ORAN = 0.65, MAX_ORAN = 1.6;
  for (let i = 0; i < p.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const bg = Math.max(arkaplan[i + k], 1);
      const oran = Math.max(MIN_ORAN, Math.min(MAX_ORAN, 250 / bg));
      p[i + k] = Math.max(0, Math.min(255, p[i + k] * oran));
    }
  }
  ctx.putImageData(veri, 0, 0);

  _dokBeyazDengesi(ctx, w, h);
  _dokKontrastGer(ctx, w, h);
}

/* Gri-dünya varsayımına dayalı basit otomatik beyaz dengesi: en parlak
   %8'lik piksellerin (muhtemelen kağıt/arka plan) ortalama R/G/B'sini
   birbirine eşitleyerek kağıdın renk tonundaki (sarımsı/pembemsi) kaymayı
   nötrler. Aşırı düzeltmeyi önlemek için katsayılar sınırlandırılır. */
function _dokBeyazDengesi(ctx, w, h) {
  const veri = ctx.getImageData(0, 0, w, h);
  const p = veri.data;
  const toplamPiksel = p.length / 4;
  const parlakliklar = new Float32Array(toplamPiksel);
  for (let i = 0, j = 0; i < p.length; i += 4, j++) parlakliklar[j] = (p[i] + p[i + 1] + p[i + 2]) / 3;
  const sirali = Array.from(parlakliklar).sort((a, b) => a - b);
  const esik = sirali[Math.floor(toplamPiksel * 0.92)] || 200;

  let toplamR = 0, toplamG = 0, toplamB = 0, sayac = 0;
  for (let i = 0, j = 0; i < p.length; i += 4, j++) {
    if (parlakliklar[j] >= esik) { toplamR += p[i]; toplamG += p[i + 1]; toplamB += p[i + 2]; sayac++; }
  }
  if (sayac < 10) return; // yeterli "kağıt" pikseli bulunamadı, dokunma

  const ortR = toplamR / sayac, ortG = toplamG / sayac, ortB = toplamB / sayac;
  const hedefGri = (ortR + ortG + ortB) / 3;
  const sinirla = (k) => Math.max(0.6, Math.min(1.6, k));
  const kR = sinirla(hedefGri / Math.max(ortR, 1));
  const kG = sinirla(hedefGri / Math.max(ortG, 1));
  const kB = sinirla(hedefGri / Math.max(ortB, 1));

  for (let i = 0; i < p.length; i += 4) {
    p[i]     = Math.max(0, Math.min(255, p[i] * kR));
    p[i + 1] = Math.max(0, Math.min(255, p[i + 1] * kG));
    p[i + 2] = Math.max(0, Math.min(255, p[i + 2] * kB));
  }
  ctx.putImageData(veri, 0, 0);
}

function _dokGriTonlamaUygula(ctx, w, h) {
  const veri = ctx.getImageData(0, 0, w, h);
  const p = veri.data;
  for (let i = 0; i < p.length; i += 4) {
    const gri = p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114;
    p[i] = p[i + 1] = p[i + 2] = gri;
  }
  ctx.putImageData(veri, 0, 0);
  _dokKontrastGer(ctx, w, h);
}

/* Tam siyah-beyaz (ikili) tarama görünümü.
   ÖNEMLİ DÜZELTME: eskiden TÜM görüntüye tek (küresel) bir Otsu eşiği
   uygulanıyordu — belgenin etrafında masa/arka plan gibi farklı
   parlaklıkta alanlar kadraja girdiğinde (kırpma tam belgeye
   oturmadığında) bu tek eşik yanlış seçiliyor ve büyük siyah leke/blok
   artefaktları oluşuyordu. Artık YEREL (uyarlamalı) eşikleme kullanılıyor:
   her piksel kendi civarının ortalama parlaklığına göre karar veriyor —
   bu, Belge Modu'ndaki gölge/arka plan düzleştirmeyle aynı teknik
   (küçültüp geri büyütülmüş yumuşak bir "yerel ortalama" haritası) ve
   masa/arka plan gibi belge-dışı alanlardan çok daha az etkileniyor. */
function _dokSiyahBeyazUygula(ctx, w, h) {
  const veri = ctx.getImageData(0, 0, w, h);
  const p = veri.data;
  for (let i = 0; i < p.length; i += 4) {
    const gri = p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114;
    p[i] = p[i + 1] = p[i + 2] = gri;
  }
  ctx.putImageData(veri, 0, 0);

  // Yerel ortalama parlaklık haritası (küçültüp geri büyüterek yumuşatma)
  const kucukW = Math.max(10, Math.round(w / 20)), kucukH = Math.max(10, Math.round(h / 20));
  const kucukCanvas = document.createElement('canvas');
  kucukCanvas.width = kucukW; kucukCanvas.height = kucukH;
  kucukCanvas.getContext('2d').drawImage(ctx.canvas, 0, 0, kucukW, kucukH);
  const buyukCanvas = document.createElement('canvas');
  buyukCanvas.width = w; buyukCanvas.height = h;
  const buyukCtx = buyukCanvas.getContext('2d');
  buyukCtx.drawImage(kucukCanvas, 0, 0, w, h);
  const yerelOrtalama = buyukCtx.getImageData(0, 0, w, h).data;

  const veri2 = ctx.getImageData(0, 0, w, h);
  const p2 = veri2.data;
  const OFSET = 18; // metin, yerel ortalamadan bu kadar koyu olmalı ki "yazı" sayılsın
  for (let i = 0; i < p2.length; i += 4) {
    const esik = yerelOrtalama[i] - OFSET;
    const v = p2[i] > esik ? 255 : 0;
    p2[i] = p2[i + 1] = p2[i + 2] = v;
  }
  ctx.putImageData(veri2, 0, 0);
}

/* Elle Parlaklık/Kontrast ayarı — kaydırıcı değeri -50..50 aralığında,
   parlaklık piksel ofsetine, kontrast ise 128 orta noktası etrafında
   çarpana çevrilir. */
function _dokParlaklikKontrastUygula(ctx, w, h, parlaklik, kontrast) {
  const veri = ctx.getImageData(0, 0, w, h);
  const p = veri.data;
  const parlakOfset = parlaklik * 2.55;
  const kontrastCarpani = 1 + (kontrast / 100);
  for (let i = 0; i < p.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const v = (p[i + k] - 128) * kontrastCarpani + 128 + parlakOfset;
      p[i + k] = Math.max(0, Math.min(255, v));
    }
  }
  ctx.putImageData(veri, 0, 0);
}

/* Kontrast/seviye germe. ÖNEMLİ: gerçek min/max yerine %1 ve %99
   persentiller kullanılıyor — tek bir aykırı piksel (parlama/gürültü
   gibi) tüm görüntüyü yanlış ölçeklemesin diye. Bu sayede kağıdın
   GENELİ (sadece en parlak tek piksel değil) tam beyaza (255) ulaşıyor
   — A4 kağıdı beyazına daha yakın bir sonuç. */
function _dokKontrastGer(ctx, w, h) {
  const veri = ctx.getImageData(0, 0, w, h);
  const p = veri.data;
  const toplamPiksel = p.length / 4;
  const griler = new Float32Array(toplamPiksel);
  for (let i = 0, j = 0; i < p.length; i += 4, j++) griler[j] = (p[i] + p[i + 1] + p[i + 2]) / 3;
  const sirali = Array.from(griler).sort((a, b) => a - b);
  const min = sirali[Math.floor(toplamPiksel * 0.01)] || 0;
  const max = sirali[Math.floor(toplamPiksel * 0.99)] || 255;
  const aralik = Math.max(1, max - min);
  for (let i = 0; i < p.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      p[i + k] = Math.max(0, Math.min(255, ((p[i + k] - min) / aralik) * 255));
    }
  }
  ctx.putImageData(veri, 0, 0);
}

/* ---------------- Doğrudan İndir / Paylaş ----------------
   Dökümanlar'a (buluta) kaydetmeden, üretilen PDF'i doğrudan cihaza
   indirmek veya Android paylaşım menüsüyle WhatsApp/Drive/e-posta vb.
   göndermek için. Mevcut ortak uygulamaDosyaKaydet() köprüsünü kullanır
   (js/app.js — native'de SavePlugin, web'de blob+<a download>). */
async function dokumanResimPdfIndir() { await _dokResimPdfDisaAktar(false); }
async function dokumanResimPdfPaylas() { await _dokResimPdfDisaAktar(true); }

async function _dokResimPdfDisaAktar(paylas) {
  if (!_dokResimPdfBlob) { toast('Önce "PDF Oluştur" ile PDF üretin.'); return; }
  if (typeof uygulamaDosyaKaydet !== 'function') { toast('Dışa aktarma bu ortamda kullanılamıyor.'); return; }
  const ad = (document.getElementById('dok_ad')?.value.trim() || 'belge') + '.pdf';
  try {
    const base64 = await _dokBlobToBase64(_dokResimPdfBlob);
    await uygulamaDosyaKaydet(base64, ad, 'application/pdf', paylas);
  } catch (e) { /* uygulamaDosyaKaydet kendi hata toast'ını zaten gösteriyor */ }
}

function _dokBlobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dokumanDosyaSecildi(input) {
  const dosya = input.files[0];
  const bilgi = document.getElementById('dok_dosya_bilgi');
  if (dosya && bilgi) {
    bilgi.textContent = `${dosya.name} · ${dosyaBoyutuFormat(dosya.size)}`;
    const adEl = document.getElementById('dok_ad');
    if (adEl && !adEl.value.trim()) {
      adEl.value = dosya.name.replace(/\.[^.]+$/, '');
    }
  }
}

async function dokumanKaydet() {
  const ad       = document.getElementById('dok_ad').value.trim();
  const kategori = document.getElementById('dok_kategori').value;
  const aciklama = document.getElementById('dok_aciklama').value.trim();
  const urlPanel = document.getElementById('dok_panel_url');
  const urlGoster= urlPanel && urlPanel.style.display !== 'none';
  const hariciUrl= urlGoster ? (document.getElementById('dok_url')?.value.trim() || '') : '';
  const resimPanel = document.getElementById('dok_panel_resim');
  const resimGoster = resimPanel && resimPanel.style.display !== 'none';
  const dosyaEl  = document.getElementById('dok_dosya');
  let dosya      = dosyaEl?.files[0];

  if (resimGoster) {
    if (!_dokResimPdfBlob) { toast('Önce "PDF Oluştur" ile PDF üretin.'); return; }
    dosya = new File([_dokResimPdfBlob], (ad || 'belge') + '.pdf', { type: 'application/pdf' });
  }

  if (!ad) { toast('Döküman adı zorunludur.'); return; }
  if (!hariciUrl && !dosya) { toast('Dosya seçin veya URL girin.'); return; }

  const kaydetBtn = document.getElementById('modalKaydetBtn');
  const durumEl = document.getElementById('dok_yukleme_durumu');
  if (kaydetBtn) { kaydetBtn.disabled = true; kaydetBtn.textContent = 'Kaydediliyor...'; }

  try {
    const metaTaban = {
      ad, kategori, aciklama,
      yuklenmeTarihi: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const gorunurlukEl = document.getElementById('dok_gorunurluk');
    if (gorunurlukEl) metaTaban.gorunurluk = gorunurlukEl.value; // sadece admin'de var; DokumanlarService yine de doğrular

    if (hariciUrl) {
      metaTaban.hariciUrl = hariciUrl;
      metaTaban.dosyaAdi  = hariciUrl.split('/').pop().split('?')[0] || 'dosya';
      await DokumanlarService.dokumanEkle(metaTaban, null, null);
    } else {
      if (durumEl) { durumEl.style.display = ''; durumEl.textContent = `Yükleniyor… %0`; }
      await DokumanlarService.dokumanEkle(metaTaban, dosya, (yuzde)=>{
        if (durumEl) durumEl.textContent = `Yükleniyor… %${yuzde}`;
      });
    }

    toast(`"${ad}" kaydedildi.`);
    modalKapat();
  } catch (e) {
    const temizMesaj = e.message && e.message.startsWith('depolama-siniri:') ? e.message.slice('depolama-siniri:'.length) : null;
    toast('Kayıt hatası: ' + (temizMesaj || (e.message==='yetkisiz' ? 'Bu işlem için yetkiniz yok.' : e.message)));
    if (kaydetBtn) { kaydetBtn.disabled = false; kaydetBtn.textContent = '💾 Kaydet'; }
    if (durumEl) durumEl.style.display = 'none';
  }
}

/* ================================================================
   Silme
   ================================================================ */
function dokumanSilOnay(id, ad) {
  if (!confirm(`"${ad}" dökümanını silmek istediğinize emin misiniz?`)) return;
  dokumanSil(id);
}

/* Admin'in başka birinin (veya kendi) dökümanının görünürlüğünü sonradan
   değiştirmesi için — bkz. dokumanlar.service.js "gorunurMu" notu. */
function dokumanGorunurlukDegistirTikla(id, yeniGorunurluk, ad){
  const mesaj = yeniGorunurluk === 'herkes'
    ? `"${ad}" artık HERKESE AÇIK olacak — okuldaki tüm kullanıcılar görebilecek. Devam edilsin mi?`
    : `"${ad}" artık KİŞİSEL olacak — sadece ekleyen kişi ve admin görebilecek. Devam edilsin mi?`;
  if(!confirm(mesaj)) return;
  DokumanlarService.dokumanGorunurlukGuncelle(id, yeniGorunurluk)
    .then(()=> toast('Görünürlük güncellendi.'))
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

async function dokumanSil(id) {
  const d = dokumanlarListesi.find(x => x.id === id);
  try {
    await DokumanlarService.dokumanSil(id, d?.storagePath, d);
    toast('Döküman silindi.');
  } catch (e) {
    if (e.message === 'sahip-degil') { toast('Bu dökümanı sadece ekleyen kişi veya yönetici silebilir.'); return; }
    toast('Silme hatası: ' + (e.message==='yetkisiz' ? 'Bu işlem için yetkiniz yok.' : e.message));
  }
}

/* ================================================================
   Yardımcılar
   ================================================================ */
function dosyaIkonu(uzanti) {
  const ikonlar = {
    pdf: '📄', doc: '📝', docx: '📝',
    xls: '📊', xlsx: '📊',
    ppt: '📊', pptx: '📊',
    jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼',
    zip: '🗜', rar: '🗜',
    mp4: '🎬', mp3: '🎵',
  };
  return ikonlar[uzanti] || '📎';
}

function dosyaBoyutuFormat(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
