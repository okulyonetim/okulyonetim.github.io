/* ====================================================================
   js/native-report-preview.js
   Android/Capacitor rapor akışını tek standarda getirir:
   Önizleme -> Yazdır / PDF Kaydet -> PrintPlugin.

   Mevcut uygulamaHtmlYazdir() fonksiyonunu yalnız native ortamda sarar.
   Web/PWA davranışı değiştirilmez. Gerçek yazdırma işlemi yine app.js'teki
   kanıtlanmış PrintPlugin köprüsünden geçer.
   ==================================================================== */
(function(){
  'use strict';

  let kurulumDenemesi = 0;
  let aktifRapor = null;

  function nativePrintVarMi(){
    try {
      return !!(window.Capacitor &&
        window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() &&
        window.Capacitor.Plugins && window.Capacitor.Plugins.PrintPlugin);
    } catch (_) { return false; }
  }

  function temizDosyaAdi(ad){
    return String(ad || 'Rapor')
      .replace(/[^\w\sÇĞİÖŞÜçğıöşü-]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'Rapor';
  }

  function onizlemeHtmlHazirla(html){
    const gizle = '<style id="native-rapor-onizleme-css">.rapor-toolbar{display:none!important}html,body{max-width:100%!important;overflow:auto!important}body{padding:0!important}</style>';
    const metin = String(html || '');
    return /<\/head>/i.test(metin)
      ? metin.replace(/<\/head>/i, gizle + '</head>')
      : gizle + metin;
  }

  function zoomEt(delta){
    const frame = document.getElementById('nativeRaporFrame');
    const win = frame && frame.contentWindow;
    if (!win) return;
    try {
      if (typeof win.zoomAyarla === 'function') win.zoomAyarla(delta);
      zoomEtiketiniGuncelle();
    } catch (_) {}
  }

  function zoomSigdir(){
    const frame = document.getElementById('nativeRaporFrame');
    const win = frame && frame.contentWindow;
    if (!win) return;
    try {
      if (typeof win.zoomSigdir === 'function') win.zoomSigdir();
      zoomEtiketiniGuncelle();
    } catch (_) {}
  }

  function zoomYuz(){
    const frame = document.getElementById('nativeRaporFrame');
    const win = frame && frame.contentWindow;
    if (!win) return;
    try {
      if (typeof win.zoomSifirla === 'function') win.zoomSifirla();
      zoomEtiketiniGuncelle();
    } catch (_) {}
  }

  function zoomEtiketiniGuncelle(){
    const label = document.getElementById('nativeRaporZoomLabel');
    const frame = document.getElementById('nativeRaporFrame');
    if (!label || !frame || !frame.contentWindow) return;
    try {
      const z = Number(frame.contentWindow._zoom);
      if (Number.isFinite(z) && z > 0) label.textContent = Math.round(z) + '%';
    } catch (_) {}
  }

  function onizlemeKapat(){
    document.getElementById('nativeRaporOnizleme')?.remove();
    aktifRapor = null;
    document.body.classList.remove('modal-open');
    if (document.body.dataset.nativeRaporOverflow !== undefined) {
      document.body.style.overflow = document.body.dataset.nativeRaporOverflow;
      delete document.body.dataset.nativeRaporOverflow;
    }
    try { if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true); } catch (_) {}
  }

  async function gercekYazdir(){
    if (!aktifRapor || typeof aktifRapor.yazdir !== 'function') return;
    const btn = document.getElementById('nativeRaporYazdirBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Hazırlanıyor…'; }
    try {
      await Promise.resolve(aktifRapor.yazdir(
        aktifRapor.html,
        aktifRapor.dosyaAdi,
        aktifRapor.yon
      ));
    } catch (e) {
      console.error('[NativeRaporOnizleme] Yazdırma hatası:', e);
      try { if (typeof toast === 'function') toast('Yazdırma açılamadı: ' + (e?.message || e)); } catch (_) {}
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🖨 Yazdır / PDF Kaydet'; }
    }
  }

  function onizlemeAc(html, dosyaAdi, yon, gercekYazdirFn){
    onizlemeKapat();
    const guvenliAd = temizDosyaAdi(dosyaAdi);
    const guvenliYon = yon === 'yatay' ? 'yatay' : 'dikey';
    aktifRapor = { html:String(html || ''), dosyaAdi:guvenliAd, yon:guvenliYon, yazdir:gercekYazdirFn };

    document.body.dataset.nativeRaporOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    try { if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false); } catch (_) {}

    const ov = document.createElement('div');
    ov.id = 'nativeRaporOnizleme';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1000002;background:#d7dbe0;display:flex;flex-direction:column;min-width:0;min-height:0;';
    ov.innerHTML = `
      <div style="flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:max(8px,env(safe-area-inset-top)) 8px 8px;background:#101419;color:#fff;border-bottom:1px solid #38424d;overflow-x:auto;white-space:nowrap;">
        <button id="nativeRaporKapatBtn" type="button" style="border:1px solid #46505b;background:#252c34;color:#fff;border-radius:8px;padding:8px 10px;font-weight:700;">✕ Kapat</button>
        <div style="min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;font-weight:700;font-size:13px;">${guvenliAd.replace(/_/g,' ')}</div>
        <span style="font-size:11px;color:#cbd5df;">${guvenliYon === 'yatay' ? 'Yatay' : 'Dikey'}</span>
        <button id="nativeRaporKucultBtn" type="button" style="border:1px solid #46505b;background:#252c34;color:#fff;border-radius:8px;padding:8px 10px;font-weight:800;">−</button>
        <span id="nativeRaporZoomLabel" style="min-width:44px;text-align:center;font-size:12px;font-weight:700;">100%</span>
        <button id="nativeRaporBuyutBtn" type="button" style="border:1px solid #46505b;background:#252c34;color:#fff;border-radius:8px;padding:8px 10px;font-weight:800;">+</button>
        <button id="nativeRaporSigdirBtn" type="button" style="border:1px solid #46505b;background:#252c34;color:#fff;border-radius:8px;padding:8px 10px;font-weight:700;">Sığdır</button>
        <button id="nativeRaporYuzBtn" type="button" style="border:1px solid #46505b;background:#252c34;color:#fff;border-radius:8px;padding:8px 10px;font-weight:700;">100%</button>
        <button id="nativeRaporYazdirBtn" type="button" style="border:0;background:#087c7c;color:#fff;border-radius:8px;padding:9px 12px;font-weight:800;">🖨 Yazdır / PDF Kaydet</button>
      </div>
      <div style="flex:1 1 auto;min-height:0;min-width:0;overflow:hidden;padding:4px;padding-bottom:max(4px,env(safe-area-inset-bottom));">
        <iframe id="nativeRaporFrame" title="Rapor önizleme" style="display:block;width:100%;height:100%;border:0;background:#fff;border-radius:4px;"></iframe>
      </div>`;
    document.body.appendChild(ov);

    const frame = document.getElementById('nativeRaporFrame');
    frame.addEventListener('load', () => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        zoomSigdir();
        zoomEtiketiniGuncelle();
      }));
    }, { once:true });
    frame.srcdoc = onizlemeHtmlHazirla(aktifRapor.html);

    document.getElementById('nativeRaporKapatBtn').onclick = onizlemeKapat;
    document.getElementById('nativeRaporKucultBtn').onclick = () => zoomEt(-10);
    document.getElementById('nativeRaporBuyutBtn').onclick = () => zoomEt(+10);
    document.getElementById('nativeRaporSigdirBtn').onclick = zoomSigdir;
    document.getElementById('nativeRaporYuzBtn').onclick = zoomYuz;
    document.getElementById('nativeRaporYazdirBtn').onclick = gercekYazdir;
  }

  function kur(){
    const mevcut = window.uygulamaHtmlYazdir;
    if (typeof mevcut !== 'function') {
      if (kurulumDenemesi++ < 80) setTimeout(kur, 100);
      return;
    }
    if (mevcut.__nativeRaporOnizlemeSarmali) return;

    const gercekYazdirFn = mevcut.bind(window);
    async function sarmal(html, dosyaAdi, yon){
      if (!nativePrintVarMi()) return gercekYazdirFn(html, dosyaAdi, yon);
      onizlemeAc(html, dosyaAdi, yon, gercekYazdirFn);
      return { preview:true };
    }
    sarmal.__nativeRaporOnizlemeSarmali = true;
    sarmal.__gercekYazdir = gercekYazdirFn;
    window.uygulamaHtmlYazdir = sarmal;
    window.nativeRaporOnizlemeKapat = onizlemeKapat;
  }

  kur();
})();

/* Navigasyon Düzeni: çoklu akordeon alt menü motoru. */
(function navAkordeonYukle(){
  if (document.querySelector('script[data-nav-accordion]')) return;
  const s = document.createElement('script');
  s.src = 'js/nav-accordion.js';
  s.async = false;
  s.dataset.navAccordion = '1';
  document.head.appendChild(s);
})();
