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
        <button id="dok_sekme_dosya" class="btn btn-ghost" style="flex:1;border-radius:0;border-bottom:2px solid var(--accent,#4caf50);font-weight:600;" onclick="dokumanSekmeAc('dosya')">📎 Dosya Yükle</button>
        <button id="dok_sekme_resim" class="btn btn-ghost" style="flex:1;border-radius:0;border-bottom:2px solid transparent;" onclick="dokumanSekmeAc('resim')">🖼 Resimlerden PDF</button>
        <button id="dok_sekme_url" class="btn btn-ghost" style="flex:1;border-radius:0;border-bottom:2px solid transparent;" onclick="dokumanSekmeAc('url')">🔗 URL Ekle</button>
      </div>
      <div style="padding:12px;">
        <div id="dok_panel_dosya">
          <input type="file" id="dok_dosya" style="width:100%;" onchange="dokumanDosyaSecildi(this)">
          <div id="dok_dosya_bilgi" style="font-size:12px;color:var(--ink-muted);margin-top:6px;"></div>
        </div>
        <div id="dok_panel_resim" style="display:none;">
          <input type="file" id="dok_resimler" accept="image/*" multiple style="width:100%;" onchange="dokumanResimlerSecildi(this)">
          <div id="dok_resim_bilgi" style="font-size:12px;color:var(--ink-muted);margin-top:6px;"></div>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button id="dok_resim_duzenle_btn" class="btn btn-ghost btn-sm" style="flex:1;" disabled onclick="dokumanResimEditoruAc()">✏️ Kırp/Döndür/Sırala</button>
            <button id="dok_resim_olustur_btn" class="btn btn-primary btn-sm" style="flex:1;" disabled onclick="dokumanResimlerdenPdfOlustur()">🖨 PDF Oluştur</button>
          </div>
          <div id="dok_resim_onizle" style="display:none;font-size:12px;color:#2e7d32;margin-top:6px;"></div>
          <div id="dok_resim_disa_aktar" style="display:none;gap:6px;margin-top:6px;">
            <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="dokumanResimPdfIndir()">⬇ İndir</button>
            <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="dokumanResimPdfPaylas()">📤 Paylaş</button>
          </div>
          <div style="font-size:11px;color:var(--ink-muted);margin-top:6px;">Resimleri seçtikten sonra "Kırp/Döndür/Sırala" ile düzenleyin — dikdörtgen kırpma, döndürme, sıralama, yamuk çekilmiş belgeler için perspektif düzeltme ve gölge/renk düzeltmesi için Belge Modu ya da Gri Tonlama filtreleri var. Sonra "PDF Oluştur"a basın; PDF hazır olunca Dökümanlar'a kaydedebilir ya da doğrudan İndir/Paylaş ile WhatsApp/Drive/e-postaya gönderebilirsiniz.</div>
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
let _dokResimPdfBlob = null;
let _dokResimEditorIndex = 0;
let _dokKirpmaSurukleme = null; // 'tl' | 'br' | 'kose-tl' | 'kose-tr' | 'kose-br' | 'kose-bl' | null

function dokumanResimlerSecildi(input) {
  const dosyalar = Array.from(input.files || []);
  _dokResimListe.forEach(it => URL.revokeObjectURL(it.url));
  _dokResimListe = dosyalar.map(f => ({
    blob: f, url: URL.createObjectURL(f),
    kirpma: null, kose: null, mod: 'dikdortgen', filtre: 'orijinal',
    ad: f.name
  }));
  _dokResimPdfBlob = null;
  _dokResimPanelGuncelle();
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
      <button class="btn btn-ghost btn-sm" style="color:#fff;" onclick="dokumanResimEditoruKapat()">✕ Kapat</button>
      <div id="dokEditorBaslik" style="font-size:13px;font-weight:600;">Resim Düzenle</div>
      <button class="btn btn-ghost btn-sm" style="color:#fff;" onclick="dokumanResimDondur()">↻ Döndür</button>
    </div>
    <div style="flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#000;min-height:0;">
      <div id="dokEditorWrap" style="position:relative;display:inline-block;line-height:0;touch-action:none;">
        <img id="dokEditorImg" style="display:block;max-width:88vw;max-height:56vh;user-select:none;-webkit-user-drag:none;">
        <svg id="dokEditorSvg" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;display:none;" viewBox="0 0 1 1" preserveAspectRatio="none">
          <polygon id="dokEditorPoligon" points="0.06,0.06 0.94,0.06 0.94,0.94 0.06,0.94" fill="rgba(255,152,0,.18)" stroke="#ff9800" stroke-width="0.006" vector-effect="non-scaling-stroke"></polygon>
        </svg>
        <div id="dokEditorKirpma" style="position:absolute;border:2px solid #4caf50;box-shadow:0 0 0 9999px rgba(0,0,0,.5);pointer-events:none;"></div>
        <div id="dokEditorTutTL" class="dok-tutamac" style="position:absolute;width:26px;height:26px;margin:-13px;background:#4caf50;border-radius:50%;touch-action:none;border:2px solid #fff;"></div>
        <div id="dokEditorTutBR" class="dok-tutamac" style="position:absolute;width:26px;height:26px;margin:-13px;background:#4caf50;border-radius:50%;touch-action:none;border:2px solid #fff;"></div>
        <div id="dokEditorKoseTL" class="dok-tutamac" style="position:absolute;width:24px;height:24px;margin:-12px;background:#ff9800;border-radius:50%;touch-action:none;border:2px solid #fff;display:none;"></div>
        <div id="dokEditorKoseTR" class="dok-tutamac" style="position:absolute;width:24px;height:24px;margin:-12px;background:#ff9800;border-radius:50%;touch-action:none;border:2px solid #fff;display:none;"></div>
        <div id="dokEditorKoseBR" class="dok-tutamac" style="position:absolute;width:24px;height:24px;margin:-12px;background:#ff9800;border-radius:50%;touch-action:none;border:2px solid #fff;display:none;"></div>
        <div id="dokEditorKoseBL" class="dok-tutamac" style="position:absolute;width:24px;height:24px;margin:-12px;background:#ff9800;border-radius:50%;touch-action:none;border:2px solid #fff;display:none;"></div>
      </div>
    </div>
    <div style="padding:10px 12px;background:#17171d;flex-shrink:0;">
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <button id="dokEditorModBtn" class="btn btn-ghost btn-sm" style="flex:1;color:#fff;" onclick="dokumanResimModDegistir()">▭ Dikdörtgen Kırpma</button>
        <button class="btn btn-ghost btn-sm" style="flex:1;color:#fff;" onclick="dokumanResimKirpmaSifirla()">↺ Sıfırla</button>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <button id="dokFiltreOrijinalBtn" class="btn btn-ghost btn-sm" style="flex:1;color:#fff;" onclick="dokumanResimFiltreSec('orijinal')">Orijinal</button>
        <button id="dokFiltreBelgeBtn" class="btn btn-ghost btn-sm" style="flex:1;color:#fff;" onclick="dokumanResimFiltreSec('belge')">📄 Belge Modu</button>
        <button id="dokFiltreGriBtn" class="btn btn-ghost btn-sm" style="flex:1;color:#fff;" onclick="dokumanResimFiltreSec('gri')">◑ Gri Tonlama</button>
      </div>
      <div style="font-size:10px;color:#999;margin-bottom:8px;">Perspektif modunda turuncu 4 köşeyi belgenin gerçek köşelerine sürükleyin (yamuksa bile) — çıkışta düz dikdörtgene dönüştürülür. Önizlemedeki filtre yaklaşıktır, gerçek sonuç "PDF Oluştur"da işlenir.</div>
      <div id="dokEditorSerit" style="display:flex;gap:6px;overflow-x:auto;padding:6px 0;"></div>
    </div>
  `;
  document.body.appendChild(el);

  const surukleBaslat = (tip) => (e) => { e.preventDefault(); _dokKirpmaSurukleme = tip; };
  document.getElementById('dokEditorTutTL').addEventListener('pointerdown', surukleBaslat('tl'));
  document.getElementById('dokEditorTutBR').addEventListener('pointerdown', surukleBaslat('br'));
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
  _dokEditorResmiYukle(0);
}

function dokumanResimEditoruKapat() {
  const el = document.getElementById('dokResimEditor');
  if (el) el.style.display = 'none';
  _dokResimPanelGuncelle();
  _dokResimListe.length && (document.getElementById('dok_resim_bilgi').textContent = `${_dokResimListe.length} resim seçildi (düzenlendi).`);
}

function _dokEditorSeritCiz() {
  const serit = document.getElementById('dokEditorSerit');
  if (!serit) return;
  serit.innerHTML = _dokResimListe.map((it, i) => `
    <div style="flex-shrink:0;width:56px;text-align:center;">
      <img src="${it.url}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:2px solid ${i === _dokResimEditorIndex ? '#4caf50' : 'transparent'};cursor:pointer;" onclick="_dokEditorResmiYukle(${i})">
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
  const img = document.getElementById('dokEditorImg');
  img.onload = () => {
    _dokEditorModuUygula(it);
    _dokFiltrePillGuncelle(it.filtre);
    img.style.filter = _dokFiltreCssOnizleme(it.filtre);
  };
  img.src = it.url;
  document.getElementById('dokEditorBaslik').textContent = `${index + 1} / ${_dokResimListe.length}`;
  _dokEditorSeritCiz();
}

/* Dikdörtgen kırpma ile perspektif (4 köşe) modu arasında geçiş —
   ilgili tutamaç/poligon gösterilir, diğeri gizlenir. */
function dokumanResimModDegistir() {
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  it.mod = it.mod === 'perspektif' ? 'dikdortgen' : 'perspektif';
  _dokEditorModuUygula(it);
}

function _dokEditorModuUygula(it) {
  const perspektifMi = it.mod === 'perspektif';
  ['dokEditorKirpma', 'dokEditorTutTL', 'dokEditorTutBR'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = perspektifMi ? 'none' : '';
  });
  document.getElementById('dokEditorSvg').style.display = perspektifMi ? 'block' : 'none';
  ['dokEditorKoseTL', 'dokEditorKoseTR', 'dokEditorKoseBR', 'dokEditorKoseBL'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = perspektifMi ? '' : 'none';
  });
  const modBtn = document.getElementById('dokEditorModBtn');
  if (modBtn) modBtn.textContent = perspektifMi ? '◈ Perspektif (4 köşe)' : '▭ Dikdörtgen Kırpma';

  if (perspektifMi) {
    if (!it.kose) it.kose = _dokVarsayilanKose();
    _dokEditorPoligonCiz(it.kose);
  } else {
    _dokEditorKirpmaKutusunuUygula(it.kirpma);
  }
}

function _dokVarsayilanKose() {
  return { tl: { x: 0.06, y: 0.06 }, tr: { x: 0.94, y: 0.06 }, br: { x: 0.94, y: 0.94 }, bl: { x: 0.06, y: 0.94 } };
}

function _dokEditorPoligonCiz(kose) {
  const k = kose || _dokVarsayilanKose();
  const poligon = document.getElementById('dokEditorPoligon');
  if (poligon) poligon.setAttribute('points', `${k.tl.x},${k.tl.y} ${k.tr.x},${k.tr.y} ${k.br.x},${k.br.y} ${k.bl.x},${k.bl.y}`);
  ['tl', 'tr', 'br', 'bl'].forEach(c => {
    const el = document.getElementById('dokEditorKose' + c.toUpperCase());
    if (el) { el.style.left = (k[c].x * 100) + '%'; el.style.top = (k[c].y * 100) + '%'; }
  });
}

function _dokEditorKirpmaKutusunuUygula(kirpma) {
  const k = kirpma || { x: 0.02, y: 0.02, w: 0.96, h: 0.96 };
  const kutu = document.getElementById('dokEditorKirpma');
  kutu.style.left = (k.x * 100) + '%';
  kutu.style.top = (k.y * 100) + '%';
  kutu.style.width = (k.w * 100) + '%';
  kutu.style.height = (k.h * 100) + '%';
  _dokEditorTutamaclariYerlestir();
}

function _dokEditorTutamaclariYerlestir() {
  const kutu = document.getElementById('dokEditorKirpma');
  const tl = document.getElementById('dokEditorTutTL');
  const br = document.getElementById('dokEditorTutBR');
  if (!kutu || !tl || !br) return;
  tl.style.left = kutu.style.left; tl.style.top = kutu.style.top;
  br.style.left = `calc(${kutu.style.left} + ${kutu.style.width})`;
  br.style.top  = `calc(${kutu.style.top} + ${kutu.style.height})`;
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

  if (_dokKirpmaSurukleme.indexOf('kose-') === 0) {
    const kose = _dokKirpmaSurukleme.slice(5); // tl/tr/br/bl
    const it = _dokResimListe[_dokResimEditorIndex];
    if (!it) return;
    if (!it.kose) it.kose = _dokVarsayilanKose();
    it.kose[kose] = { x, y };
    _dokEditorPoligonCiz(it.kose);
    return;
  }

  const kutu = document.getElementById('dokEditorKirpma');
  const sol = parseFloat(kutu.style.left) / 100;
  const ust = parseFloat(kutu.style.top) / 100;
  const gen = parseFloat(kutu.style.width) / 100;
  const yuk = parseFloat(kutu.style.height) / 100;
  const MIN = 0.08;

  if (_dokKirpmaSurukleme === 'tl') {
    const yeniSol = Math.min(x, sol + gen - MIN);
    const yeniUst = Math.min(y, ust + yuk - MIN);
    kutu.style.width  = ((sol + gen - yeniSol) * 100) + '%';
    kutu.style.height = ((ust + yuk - yeniUst) * 100) + '%';
    kutu.style.left = (yeniSol * 100) + '%';
    kutu.style.top  = (yeniUst * 100) + '%';
  } else if (_dokKirpmaSurukleme === 'br') {
    kutu.style.width  = (Math.max(MIN, x - sol) * 100) + '%';
    kutu.style.height = (Math.max(MIN, y - ust) * 100) + '%';
  }
  _dokEditorTutamaclariYerlestir();
}

function _dokKirpmaSuruklemeBitir() {
  if (_dokKirpmaSurukleme && _dokKirpmaSurukleme.indexOf('kose-') !== 0) {
    const it = _dokResimListe[_dokResimEditorIndex];
    const kutu = document.getElementById('dokEditorKirpma');
    if (it && kutu) {
      it.kirpma = {
        x: parseFloat(kutu.style.left) / 100,
        y: parseFloat(kutu.style.top) / 100,
        w: parseFloat(kutu.style.width) / 100,
        h: parseFloat(kutu.style.height) / 100,
      };
    }
  }
  _dokKirpmaSurukleme = null;
}

function dokumanResimKirpmaSifirla() {
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  if (it.mod === 'perspektif') {
    it.kose = _dokVarsayilanKose();
    _dokEditorPoligonCiz(it.kose);
  } else {
    it.kirpma = null;
    _dokEditorKirpmaKutusunuUygula(null);
  }
}

/* ---------------- Filtre seçimi (önizleme yaklaşık, gerçek işlem PDF üretiminde) ---------------- */
function dokumanResimFiltreSec(filtre) {
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  it.filtre = filtre;
  _dokFiltrePillGuncelle(filtre);
  const img = document.getElementById('dokEditorImg');
  if (img) img.style.filter = _dokFiltreCssOnizleme(filtre);
}

function _dokFiltrePillGuncelle(filtre) {
  const harita = { orijinal: 'dokFiltreOrijinalBtn', belge: 'dokFiltreBelgeBtn', gri: 'dokFiltreGriBtn' };
  Object.entries(harita).forEach(([k, id]) => {
    const btn = document.getElementById(id);
    if (btn) btn.style.background = (k === filtre) ? '#4caf50' : '';
  });
}

function _dokFiltreCssOnizleme(filtre) {
  if (filtre === 'belge') return 'contrast(1.25) brightness(1.08) saturate(.15)';
  if (filtre === 'gri') return 'grayscale(1) contrast(1.15)';
  return 'none';
}

/* Döndürme fiziksel olarak uygulanır: mevcut çalışma görseli canvas'a
   90° çizilip yeni bir blob/URL üretilir, eski URL serbest bırakılır.
   Döndürünce kırpma (artık farklı bir kareye ait olacağı için) sıfırlanır. */
async function dokumanResimDondur() {
  const it = _dokResimListe[_dokResimEditorIndex];
  if (!it) return;
  const kaynak = new Image();
  await new Promise((res, rej) => { kaynak.onload = res; kaynak.onerror = rej; kaynak.src = it.url; });
  const canvas = document.createElement('canvas');
  canvas.width = kaynak.height; canvas.height = kaynak.width;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(kaynak, -kaynak.width / 2, -kaynak.height / 2);
  const yeniBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
  URL.revokeObjectURL(it.url);
  it.blob = yeniBlob;
  it.url = URL.createObjectURL(yeniBlob);
  it.kirpma = null;
  it.kose = null;
  it.mod = 'dikdortgen';
  _dokEditorResmiYukle(_dokResimEditorIndex);
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
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const A4_W = 210, A4_H = 297, KENAR = 8;

    for (let i = 0; i < _dokResimListe.length; i++) {
      if (olusturBtn) olusturBtn.textContent = `Oluşturuluyor… (${i + 1}/${_dokResimListe.length})`;
      const { dataUrl, w: gw, h: gh } = await _dokResimIsle(_dokResimListe[i]);
      const maxW = A4_W - KENAR * 2, maxH = A4_H - KENAR * 2;
      const oran = Math.min(maxW / gw, maxH / gh, 1);
      const w = gw * oran, h = gh * oran;
      const x = (A4_W - w) / 2, y = (A4_H - h) / 2;
      if (i > 0) pdf.addPage();
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
  let canvas = (item.mod === 'perspektif' && item.kose)
    ? _dokPerspektifCanvasUret(img, item.kose)
    : _dokKirpCanvasUret(img, item.kirpma);
  canvas = _dokBoyutSinirla(canvas, 1600);

  const ctx = canvas.getContext('2d');
  if (item.filtre === 'belge') _dokBelgeModuUygula(ctx, canvas.width, canvas.height);
  else if (item.filtre === 'gri') _dokGriTonlamaUygula(ctx, canvas.width, canvas.height);

  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), w: canvas.width, h: canvas.height };
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
  const MAX_ISLEME = 1200; // piksel-piksel warp maliyeti için işleme sırasındaki sınır
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

/* ---------------- Belge Modu / Gri Tonlama filtreleri ----------------
   Belge Modu: görüntü kendi ÇOK küçültülüp geri büyütülmüş (yumuşatılmış)
   kopyasına bölünerek aydınlatma/gölge normalize edilir (klasik "arka
   planı düzleştirme" hilesi), ardından otomatik kontrast germe uygulanır.
   Gri Tonlama: luminans dönüşümü + otomatik kontrast germe. */
function _dokBelgeModuUygula(ctx, w, h) {
  const kucukW = Math.max(8, Math.round(w / 24)), kucukH = Math.max(8, Math.round(h / 24));
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
  for (let i = 0; i < p.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const bg = Math.max(arkaplan[i + k], 1);
      p[i + k] = Math.max(0, Math.min(255, (p[i + k] / bg) * 235));
    }
  }
  ctx.putImageData(veri, 0, 0);
  _dokKontrastGer(ctx, w, h);
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

function _dokKontrastGer(ctx, w, h) {
  const veri = ctx.getImageData(0, 0, w, h);
  const p = veri.data;
  let min = 255, max = 0;
  for (let i = 0; i < p.length; i += 4) {
    const gri = (p[i] + p[i + 1] + p[i + 2]) / 3;
    if (gri < min) min = gri;
    if (gri > max) max = gri;
  }
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
