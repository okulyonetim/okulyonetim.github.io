from pathlib import Path

p = Path('js/yillik-plan.js')
s = p.read_text(encoding='utf-8')
if 'YPL_A4_DIKEY_PX = 794' in s:
    print('Yıllık plan patch zaten uygulanmış.')
    raise SystemExit(0)

def rep(old, new, label):
    global s
    c = s.count(old)
    if c != 1:
        raise SystemExit(f'{label}: expected 1 match, got {c}')
    s = s.replace(old, new, 1)

rep("const YPL_A4_YATAY_PX = 1123;", "const YPL_A4_YATAY_PX = 1123;\nconst YPL_A4_DIKEY_PX = 794;", 'A4 dikey sabiti')
rep("function yillikPlaniYazdir(planId, genislikOverride, fontOverride){", "function yillikPlaniYazdir(planId, genislikOverride, fontOverride, yonOverride){", 'yazdir imzasi')
rep("_raporPenceresiniAc(html, baslik, { ortaliBaslik:true, ustBaslik: okulAdi, yon: 'yatay', logoGoster:true });", "_raporPenceresiniAc(html, baslik, { ortaliBaslik:true, ustBaslik: okulAdi, yon: yonOverride || 'yatay', logoGoster:true });", 'yazdir yonu')
rep("yillikPlaniYazdir(planId, genislik, _yplMevcutFontPx);", "yillikPlaniYazdir(planId, genislik, _yplMevcutFontPx, _yplSayfaYonu);", 'onizleme yazdir yonu')
rep("let _yplTabanZoom = 1, _yplManuelZoom = 1;", "let _yplTabanZoom = 1, _yplManuelZoom = 1, _yplSayfaYonu = 'yatay';", 'zoom globali')

helper = '''function _yplOnizlemeBaslikHtml(tanim){
  const okulAdi = (typeof okulBilgileriAyari!=='undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) || tanim.okulAdiManuel || '';
  const seviyeMetni = `${tanim.seviye}. Sınıf`;
  const baslik = `${tanim.egitimOgretimYili||''} EĞİTİM ÖĞRETİM YILI — ${(tanim.dersAdi||'').toLocaleUpperCase('tr')} DERSİ — ${seviyeMetni} — ÜNİTELENDİRİLMİŞ YILLIK PLAN`.toLocaleUpperCase('tr');
  return `<div style="padding:18px 18px 12px;text-align:center;color:#1a1a1a;background:#fff;">
    ${okulAdi ? `<div style="font-size:13px;font-weight:700;margin-bottom:5px;">${escapeHtml(okulAdi)}</div>` : ''}
    <div style="font-size:15px;font-weight:800;line-height:1.35;">${escapeHtml(baslik)}</div>
  </div>`;
}

'''
rep("function yillikPlanTumunuGoster(planId){", helper + "function yillikPlanTumunuGoster(planId){", 'onizleme baslik helper')
rep("  const tanim = _yplTanim(planId);\n  if (!tanim) return;\n\n  const ov = document.createElement('div');\n  ov.id = 'yplOnizlemeOverlay';", "  const tanim = _yplTanim(planId);\n  if (!tanim) return;\n  _yplAcikPlanId = planId;\n\n  const ov = document.createElement('div');\n  ov.id = 'yplOnizlemeOverlay';", 'onizleme aktif plan')
rep('<div style="font-weight:700;font-size:12.5px;text-align:center;flex:1;min-width:140px;">${escapeHtml(tanim.dersAdi)} — A4 Yatay Önizleme</div>', '<div id="yplOnizlemeBaslikMetni" style="font-weight:700;font-size:12.5px;text-align:center;flex:1;min-width:140px;">${escapeHtml(tanim.dersAdi)} — A4 Yatay Önizleme</div>', 'toolbar baslik id')
rep('''        <button class="btn btn-ghost btn-sm" id="yplFontArtir" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Yazıyı büyüt">Aa➕</button>
        <button class="btn btn-ghost btn-sm" id="yplZoomAzalt"''', '''        <button class="btn btn-ghost btn-sm" id="yplFontArtir" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Yazıyı büyüt">Aa➕</button>
        <button class="btn btn-ghost btn-sm" id="yplYonYatay" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="A4 yatay görünüm">↔ Yatay</button>
        <button class="btn btn-ghost btn-sm" id="yplYonDikey" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="A4 dikey görünüm">↕ Dikey</button>
        <button class="btn btn-ghost btn-sm" id="yplZoomAzalt"''', 'yon butonlari')
rep('''    <div id="yplTuvalKaydirma" style="flex:1;overflow:auto;overscroll-behavior:contain;touch-action:pan-x pan-y;background:#dcdfe1;padding:20px;">
      <div id="yplTuval" style="width:${YPL_A4_YATAY_PX}px;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.25);margin:0 auto;position:relative;padding-bottom:16px;">
        ${_yplTabloHtml(tanim, true)}
        <div style="padding:0 12px;" id="yplImzaBlogu">${_yplImzaBlogu(tanim)}</div>
      </div>
    </div>''', '''    <div id="yplTuvalKaydirma" style="flex:1;overflow:auto;overscroll-behavior:contain;touch-action:pan-x pan-y;background:#dcdfe1;padding:20px;">
      <div id="yplTuvalSahne" style="position:relative;margin:0 auto;width:${YPL_A4_YATAY_PX}px;">
        <div id="yplTuval" style="width:${YPL_A4_YATAY_PX}px;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.25);margin:0;position:relative;padding-bottom:16px;transform-origin:top left;">
          <div id="yplRaporBaslik">${_yplOnizlemeBaslikHtml(tanim)}</div>
          ${_yplTabloHtml(tanim, true)}
          <div style="padding:0 12px;" id="yplImzaBlogu">${_yplImzaBlogu(tanim)}</div>
        </div>
      </div>
    </div>''', 'tuval sahnesi ve baslik')
rep("  _yplDuzenlemeKilidi = true; // her açılışta varsayılan: kilitli\n  requestAnimationFrame(() => {\n    _yplZoomBagla();", "  _yplDuzenlemeKilidi = true; // her açılışta varsayılan: kilitli\n  _yplSayfaYonu = 'yatay';\n  requestAnimationFrame(() => {\n    _yplYonKontrolleriBagla();\n    _yplZoomBagla();", 'yon baglama')

old_zoom = '''function _yplZoomUygula(){
  const tuval = document.getElementById('yplTuval');
  if (tuval) tuval.style.zoom = _yplTabanZoom * _yplManuelZoom;
  if (_yplTutamaclariYerlestir) requestAnimationFrame(_yplTutamaclariYerlestir);
  requestAnimationFrame(_yplSayfaSonlariniCiz);
}
function _yplEkraniSigdir(){
  const kaydirma = document.getElementById('yplTuvalKaydirma');
  if (!kaydirma) return;
  // Overlay ilk DOM'a eklendiği anda bazı Android WebView sürümlerinde
  // clientWidth kısa süreliğine 0 dönebiliyor. Eski hesap negatif zoom
  // üretebildiği için tablo oluşturulsa bile görünmez kalabiliyordu.
  const kapsayiciGenislik = kaydirma.clientWidth || document.documentElement.clientWidth || window.innerWidth || 360;
  const mevcutGenislik = Math.max(240, kapsayiciGenislik - 40);
  _yplTabanZoom = Math.max(0.2, Math.min(1, mevcutGenislik / YPL_A4_YATAY_PX));
  _yplManuelZoom = 1;
  _yplZoomUygula();
}
function _yplZoomBagla(){
  document.getElementById('yplZoomArtir')?.addEventListener('click', () => { _yplManuelZoom = Math.min(3, +(_yplManuelZoom+0.2).toFixed(2)); _yplZoomUygula(); });
  document.getElementById('yplZoomAzalt')?.addEventListener('click', () => { _yplManuelZoom = Math.max(0.3, +(_yplManuelZoom-0.2).toFixed(2)); _yplZoomUygula(); });
  document.getElementById('yplZoomSigdir')?.addEventListener('click', _yplEkraniSigdir);
  _yplEkraniSigdir();
}'''
new_zoom = '''function _yplSayfaGenisligi(){ return _yplSayfaYonu === 'dikey' ? YPL_A4_DIKEY_PX : YPL_A4_YATAY_PX; }
function _yplZoomUygula(){
  const tuval = document.getElementById('yplTuval');
  const sahne = document.getElementById('yplTuvalSahne');
  const olcek = _yplTabanZoom * _yplManuelZoom;
  if (tuval) tuval.style.transform = `scale(${olcek})`;
  if (tuval && sahne) {
    sahne.style.width = Math.ceil(tuval.offsetWidth * olcek) + 'px';
    sahne.style.height = Math.ceil(tuval.offsetHeight * olcek) + 'px';
  }
  const etiket = document.getElementById('yplZoomYuzde');
  if (etiket) etiket.textContent = Math.round(olcek * 100) + '%';
  if (_yplTutamaclariYerlestir) requestAnimationFrame(_yplTutamaclariYerlestir);
  requestAnimationFrame(_yplSayfaSonlariniCiz);
}
function _yplEkraniSigdir(){
  const kaydirma = document.getElementById('yplTuvalKaydirma');
  if (!kaydirma) return;
  const kapsayiciGenislik = kaydirma.clientWidth || document.documentElement.clientWidth || window.innerWidth || 360;
  const mevcutGenislik = Math.max(240, kapsayiciGenislik - 40);
  _yplTabanZoom = Math.max(0.2, Math.min(1, mevcutGenislik / _yplSayfaGenisligi()));
  _yplManuelZoom = 1;
  _yplZoomUygula();
  kaydirma.scrollLeft = 0;
}
function _yplSayfaYonuUygula(yon){
  _yplSayfaYonu = yon === 'dikey' ? 'dikey' : 'yatay';
  const tuval = document.getElementById('yplTuval');
  if (tuval) tuval.style.width = _yplSayfaGenisligi() + 'px';
  const baslik = document.getElementById('yplOnizlemeBaslikMetni');
  const tanim = _yplTanim(_yplAcikPlanId) || null;
  if (baslik) baslik.textContent = `${tanim?.dersAdi || 'Yıllık Plan'} — A4 ${_yplSayfaYonu === 'dikey' ? 'Dikey' : 'Yatay'} Önizleme`;
  const yatay = document.getElementById('yplYonYatay'), dikey = document.getElementById('yplYonDikey');
  if (yatay) yatay.style.background = _yplSayfaYonu === 'yatay' ? '#087c7c' : 'rgba(255,255,255,0.12)';
  if (dikey) dikey.style.background = _yplSayfaYonu === 'dikey' ? '#087c7c' : 'rgba(255,255,255,0.12)';
  _yplEkraniSigdir();
}
function _yplYonKontrolleriBagla(){
  document.getElementById('yplYonYatay')?.addEventListener('click', () => _yplSayfaYonuUygula('yatay'));
  document.getElementById('yplYonDikey')?.addEventListener('click', () => _yplSayfaYonuUygula('dikey'));
  _yplSayfaYonuUygula(_yplSayfaYonu);
}
function _yplZoomBagla(){
  const sigdir = document.getElementById('yplZoomSigdir');
  if (sigdir && !document.getElementById('yplZoomYuzde')) sigdir.insertAdjacentHTML('afterend', '<span id="yplZoomYuzde" style="min-width:44px;text-align:center;font-size:11px;font-weight:700;color:#fff;align-self:center;">100%</span>');
  document.getElementById('yplZoomArtir')?.addEventListener('click', () => { _yplManuelZoom = Math.min(3, +(_yplManuelZoom+0.2).toFixed(2)); _yplZoomUygula(); });
  document.getElementById('yplZoomAzalt')?.addEventListener('click', () => { _yplManuelZoom = Math.max(0.3, +(_yplManuelZoom-0.2).toFixed(2)); _yplZoomUygula(); });
  document.getElementById('yplZoomSigdir')?.addEventListener('click', _yplEkraniSigdir);
  _yplEkraniSigdir();
}'''
rep(old_zoom, new_zoom, 'transform zoom ve yon')

p.write_text(s, encoding='utf-8')

Path('tests/yillik-plan-preview-smoke.test.js').write_text('''const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync('js/yillik-plan.js', 'utf8');
assert(src.includes('YPL_A4_DIKEY_PX = 794'), 'A4 dikey genişliği bulunmalı.');
assert(src.includes('id="yplRaporBaslik"'), 'Önizleme tuvalinde rapor başlığı görünmeli.');
assert(src.includes('_yplOnizlemeBaslikHtml(tanim)'), 'Dosya/rapor başlığı önizlemede üretilmeli.');
assert(src.includes('id="yplYonYatay"') && src.includes('id="yplYonDikey"'), 'Yatay ve dikey görünüm kontrolleri bulunmalı.');
assert(src.includes("tuval.style.transform = `scale(${olcek})`"), 'Zoom yalnız plan tuvaline transform ile uygulanmalı.');
assert(!src.includes('tuval.style.zoom = _yplTabanZoom * _yplManuelZoom'), 'Eski CSS zoom geri gelmemeli.');
assert(src.includes('mevcutGenislik / _yplSayfaGenisligi()'), 'Sığdır seçili yönün genişliğine göre hesaplanmalı.');
assert(src.includes('yillikPlaniYazdir(planId, genislik, _yplMevcutFontPx, _yplSayfaYonu)'), 'Yazdırma seçili sayfa yönünü kullanmalı.');
assert(src.includes('id="yplZoomYuzde"'), 'Zoom yüzdesi görünmeli.');
console.log('Yıllık plan önizleme smoke testleri başarılı.');
''', encoding='utf-8')
print('Yıllık plan patch uygulandı.')
