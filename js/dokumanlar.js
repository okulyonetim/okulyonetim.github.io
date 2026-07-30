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
    </div>` : `
    <div style="font-size:12px;color:var(--ink-muted);background:var(--nm-bg);border-radius:8px;padding:8px 10px;margin-bottom:4px;">
      🔒 Bu döküman sadece <strong>size</strong> ve <strong>yöneticiye</strong> görünür olacak.
    </div>`}

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
          <div style="font-size:11px;color:var(--ink-muted);margin-top:6px;">Resimleri seçtikten sonra isterseniz "Kırp/Döndür/Sırala" ile düzenleyin, sonra "PDF Oluştur"a basın. PDF hazır olunca aşağıdan Dökümanlar'a kaydedebilir, ya da yukarıdaki İndir/Paylaş ile doğrudan cihaza indirip WhatsApp/Drive/e-posta gibi yerlere gönderebilirsiniz.</div>
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
   Her resim {blob, url, kirpma, ad} nesnesi olarak _dokResimListe'de
   tutulur. url = geçerli (döndürme uygulanmış) çalışma kopyasının
   object URL'i. kirpma = null | {x,y,w,h} — çalışma görselinin
   0..1 aralığında oranları (döndürmeden SONRAKİ kareye göre).

   Döndürme fiziksel olarak uygulanır (canvas'a yeniden çizilip yeni
   bir blob/URL üretilir) — böylece kırpma her zaman "düz" (dönmemiş)
   bir kare üzerinde basit x/y/genişlik/yükseklik matematiğiyle
   çalışır, ayrı bir döndürme+kırpma matris hesaplamasına gerek kalmaz.

   PDF'in kendisi tek bir Blob olarak üretilir; Kaydet sırasında normal
   "dosya" akışına File olarak enjekte edilir (DokumanlarService
   değişmeden çalışır). İndir/Paylaş ise mevcut ortak
   uygulamaDosyaKaydet() köprüsünü (js/app.js — SavePlugin/blob
   fallback, "yedekle" özelliğinde kullanılanla aynı) kullanır.
   ================================================================ */
let _dokResimListe = [];   // [{ blob, url, kirpma, ad }]
let _dokResimPdfBlob = null;
let _dokResimEditorIndex = 0;
let _dokKirpmaSurukleme = null; // 'tl' | 'br' | null

function dokumanResimlerSecildi(input) {
  const dosyalar = Array.from(input.files || []);
  _dokResimListe.forEach(it => URL.revokeObjectURL(it.url));
  _dokResimListe = dosyalar.map(f => ({ blob: f, url: URL.createObjectURL(f), kirpma: null, ad: f.name }));
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
        <img id="dokEditorImg" style="display:block;max-width:88vw;max-height:64vh;user-select:none;-webkit-user-drag:none;">
        <div id="dokEditorKirpma" style="position:absolute;border:2px solid #4caf50;box-shadow:0 0 0 9999px rgba(0,0,0,.5);pointer-events:none;"></div>
        <div id="dokEditorTutTL" style="position:absolute;width:26px;height:26px;margin:-13px;background:#4caf50;border-radius:50%;touch-action:none;border:2px solid #fff;"></div>
        <div id="dokEditorTutBR" style="position:absolute;width:26px;height:26px;margin:-13px;background:#4caf50;border-radius:50%;touch-action:none;border:2px solid #fff;"></div>
      </div>
    </div>
    <div style="padding:10px 12px;background:#17171d;flex-shrink:0;">
      <button class="btn btn-ghost btn-sm" style="color:#fff;width:100%;margin-bottom:8px;" onclick="dokumanResimKirpmaSifirla()">↺ Kırpmayı Sıfırla</button>
      <div id="dokEditorSerit" style="display:flex;gap:6px;overflow-x:auto;padding:6px 0;"></div>
    </div>
  `;
  document.body.appendChild(el);

  const surukleBaslat = (tip) => (e) => { e.preventDefault(); _dokKirpmaSurukleme = tip; };
  document.getElementById('dokEditorTutTL').addEventListener('pointerdown', surukleBaslat('tl'));
  document.getElementById('dokEditorTutBR').addEventListener('pointerdown', surukleBaslat('br'));
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
  img.onload = () => _dokEditorKirpmaKutusunuUygula(it.kirpma);
  img.src = it.url;
  document.getElementById('dokEditorBaslik').textContent = `${index + 1} / ${_dokResimListe.length}`;
  _dokEditorSeritCiz();
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
  if (_dokKirpmaSurukleme) {
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
  it.kirpma = null;
  _dokEditorKirpmaKutusunuUygula(null);
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
  _dokEditorResmiYukle(_dokResimEditorIndex);
}

/* ---------------- PDF üretimi ---------------- */
async function dokumanResimlerdenPdfOlustur() {
  if (!_dokResimListe.length) { toast('Önce resim seçin.'); return; }
  if (typeof window.jspdf === 'undefined') { toast('PDF kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.'); return; }

  const olusturBtn = document.getElementById('dok_resim_olustur_btn');
  const onizle = document.getElementById('dok_resim_onizle');
  const disaAktar = document.getElementById('dok_resim_disa_aktar');
  if (olusturBtn) { olusturBtn.disabled = true; olusturBtn.textContent = 'Oluşturuluyor…'; }

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const A4_W = 210, A4_H = 297, KENAR = 8;

    for (let i = 0; i < _dokResimListe.length; i++) {
      const { dataUrl, w: gw, h: gh } = await _dokResimSikistir(_dokResimListe[i]);
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
    }
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

/* Resmi (varsa kırpma uygulanarak) canvas'a çizip WebView belleğini
   korumak için max 1600px kenara indirger, JPEG'e sıkıştırır (%82). */
function _dokResimSikistir(item) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (item.kirpma) {
        sx = Math.round(item.kirpma.x * img.width);
        sy = Math.round(item.kirpma.y * img.height);
        sw = Math.round(item.kirpma.w * img.width);
        sh = Math.round(item.kirpma.h * img.height);
      }
      const MAX_KENAR = 1600;
      let w = sw, h = sh;
      if (w > MAX_KENAR || h > MAX_KENAR) {
        const oran = Math.min(MAX_KENAR / w, MAX_KENAR / h);
        w = Math.round(w * oran); h = Math.round(h * oran);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.82), w, h });
    };
    img.onerror = reject;
    img.src = item.url;
  });
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
