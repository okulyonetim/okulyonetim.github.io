from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

# ---- alt-navigasyon.js ----
p = Path('js/alt-navigasyon.js')
s = p.read_text(encoding='utf-8')

s = replace_once(
    s,
    "  let _navDuzeniVerisi = {};",
    """  const _NAV_DUZENI_CACHE_ANAHTARI = 'oyNavDuzeniCacheV1';
  function _navDuzeniCacheOku(){
    try{
      const ham = localStorage.getItem(_NAV_DUZENI_CACHE_ANAHTARI);
      const veri = ham ? JSON.parse(ham) : {};
      return veri && typeof veri === 'object' ? veri : {};
    }catch(_){ return {}; }
  }
  function _navDuzeniCacheKaydet(veri){
    try{ localStorage.setItem(_NAV_DUZENI_CACHE_ANAHTARI, JSON.stringify(veri || {})); }catch(_){}
  }
  // İlk çizim Firestore'u beklemez. Son bilinen resmi navigasyon düzeni
  // doğrudan cihaz cache'inden alınır; böylece eski katalog rengi bir an
  // görünüp sonra yeni renge dönmez.
  let _navDuzeniVerisi = _navDuzeniCacheOku();""",
    'nav cache init'
)

s = replace_once(
    s,
    """  function _yenidenInsaVeYenile(){
    _gruplariYenidenOlustur();
    if(typeof AltNav !== 'undefined' && AltNav._kuruldu) AltNav.yenile();
  }""",
    """  function _yenidenInsaVeYenile(){
    _gruplariYenidenOlustur();
    if(typeof AltNav !== 'undefined' && AltNav._kuruldu) AltNav.yenile();
  }
  function _navDuzeniYerelUygula(veri, cachele){
    try{ _navDuzeniVerisi = JSON.parse(JSON.stringify(veri || {})); }
    catch(_){ _navDuzeniVerisi = veri || {}; }
    if(cachele !== false) _navDuzeniCacheKaydet(_navDuzeniVerisi);
    _yenidenInsaVeYenile();
  }""",
    'local nav apply helper'
)

s = replace_once(
    s,
    """    db.collection(COL.navDuzeni).doc('ayarlar').get().then(doc => {
      _navDuzeniVerisi = doc.exists ? (doc.data() || {}) : {};
      _yenidenInsaVeYenile();
    }).catch(e => {""",
    """    db.collection(COL.navDuzeni).doc('ayarlar').get().then(doc => {
      _navDuzeniYerelUygula(doc.exists ? (doc.data() || {}) : {});
    }).catch(e => {""",
    'firestore nav load uses cache'
)

s = replace_once(
    s,
    "  window._navDuzeniYukle = _navDuzeniYukle;",
    "  window._navDuzeniYukle = _navDuzeniYukle;\n  window._navDuzeniYerelUygula = _navDuzeniYerelUygula;",
    'export local apply'
)

s = replace_once(
    s,
    """  const _GRUPLAR_VARSAYILAN = {};
  GRUPLAR_KATALOG.forEach(g => { _GRUPLAR_VARSAYILAN[g.anahtar] = { renk: g.renk, ad: g.ad }; });""",
    """  const _GRUPLAR_VARSAYILAN = {};
  GRUPLAR_KATALOG.forEach(g => { _GRUPLAR_VARSAYILAN[g.anahtar] = { renk: g.renk, ad: g.ad }; });
  function _menuResmiVarsayilanGetir(anahtar){
    // Kişisel tercih uygulanmadan, admin Navigasyon Düzeni override'ı
    // uygulanmış resmi kart değerini döndür. "Varsayılana Döndür" artık
    // yıllar önceki katalog rengine değil, yöneticinin güncel rengine döner.
    const resmi = _navDuzeniInsaEt(true).find(g => g.anahtar === anahtar);
    if(resmi) return { ad: resmi.ad, renk: resmi.renk };
    return _GRUPLAR_VARSAYILAN[anahtar] || null;
  }""",
    'official default helper'
)

old_default = "const varsayilan = _GRUPLAR_VARSAYILAN[g.anahtar] || { ad: g.ad, renk: g.renk };"
if s.count(old_default) != 2:
    raise SystemExit(f'card default replacements: expected 2, got {s.count(old_default)}')
s = s.replace(old_default, "const varsayilan = _menuResmiVarsayilanGetir(g.anahtar) || { ad: g.ad, renk: g.renk };", 2)

p.write_text(s, encoding='utf-8')

# ---- nav-duzeni-editor.js ----
p = Path('js/nav-duzeni-editor.js')
s = p.read_text(encoding='utf-8')

s = replace_once(
    s,
    """function _ndKaydet(nd, basariMesaji){
  if(typeof db === 'undefined' || typeof COL === 'undefined' || !COL.navDuzeni){
    toast('Firestore bağlantısı bulunamadı.');
    return;
  }
  nd.guncellemeTarihi = new Date().toISOString();
  db.collection(COL.navDuzeni).doc('ayarlar').set(nd).then(() => {
    if(typeof window._navDuzeniYukle === 'function') window._navDuzeniYukle();
    _ndListesiCiz();
    if(basariMesaji) toast(basariMesaji);
  }).catch(e => toast('Kaydetme hatası: ' + e.message));
}""",
    """function _ndKaydet(nd, basariMesaji){
  if(typeof db === 'undefined' || typeof COL === 'undefined' || !COL.navDuzeni){
    toast('Firestore bağlantısı bulunamadı.');
    return;
  }
  const onceki = _ndVerisiOku();
  nd.guncellemeTarihi = new Date().toISOString();
  // Optimistic UI: yeni öğe/renk/sıra önce anında gerçek menüye uygulanır.
  // Firestore gecikmesi yüzünden "ekledim ama görünmedi" hissi oluşmaz.
  if(typeof window._navDuzeniYerelUygula === 'function') window._navDuzeniYerelUygula(nd);
  _ndListesiCiz();
  db.collection(COL.navDuzeni).doc('ayarlar').set(nd).then(() => {
    if(typeof window._navDuzeniYukle === 'function') window._navDuzeniYukle();
    if(basariMesaji) toast(basariMesaji);
  }).catch(e => {
    if(typeof window._navDuzeniYerelUygula === 'function') window._navDuzeniYerelUygula(onceki);
    _ndListesiCiz();
    toast('Kaydetme hatası: ' + e.message);
  });
}""",
    'optimistic full save'
)

s = replace_once(
    s,
    """function _ndKaydetSessiz(nd, sonrasi){
  if(typeof db === 'undefined' || typeof COL === 'undefined' || !COL.navDuzeni) return;
  nd.guncellemeTarihi = new Date().toISOString();
  db.collection(COL.navDuzeni).doc('ayarlar').set(nd).then(() => {
    if(typeof window._navDuzeniYukle === 'function') window._navDuzeniYukle();
    if(sonrasi) setTimeout(sonrasi, 250); // _navDuzeniYukle Firestore'dan tekrar okuduğu için kısa gecikme
    _ndListesiCiz();
  }).catch(e => toast('Kaydetme hatası: ' + e.message));
}""",
    """function _ndKaydetSessiz(nd, sonrasi){
  if(typeof db === 'undefined' || typeof COL === 'undefined' || !COL.navDuzeni) return;
  const onceki = _ndVerisiOku();
  nd.guncellemeTarihi = new Date().toISOString();
  if(typeof window._navDuzeniYerelUygula === 'function') window._navDuzeniYerelUygula(nd);
  _ndListesiCiz();
  if(sonrasi) sonrasi();
  db.collection(COL.navDuzeni).doc('ayarlar').set(nd).then(() => {
    if(typeof window._navDuzeniYukle === 'function') window._navDuzeniYukle();
  }).catch(e => {
    if(typeof window._navDuzeniYerelUygula === 'function') window._navDuzeniYerelUygula(onceki);
    _ndListesiCiz();
    toast('Kaydetme hatası: ' + e.message);
  });
}""",
    'optimistic silent save'
)

anchor = """/* ---- Yeni öğe ekleme ----
   Built-in gruba: nd.ekOgeler'e yeni bir kayıt ekler (bkz. şema notu,
   js/firebase-init.js). Özel gruba: mevcut \"Özel Menü Grupları\" akışı
   zaten kendi öğe ekleme arayüzüne sahip — oraya yönlendirilir. */"""
helper = """function _ndSekmeSeciciOlustur(sekmeAd){
  if(typeof _sekmeSeciciOlustur === 'function') return _sekmeSeciciOlustur(sekmeAd || '');
  const sel = document.createElement('select');
  sel.className = 'nd-yeni-oge-sekme-fallback';
  sel.style.width = '100%';
  const gorulen = new Set();
  document.querySelectorAll('[data-tab]').forEach(el => {
    const deger = (el.getAttribute('data-tab') || '').trim();
    if(!deger || gorulen.has(deger)) return;
    gorulen.add(deger);
    const yazi = (el.textContent || deger).replace(/\\s+/g,' ').trim();
    sel.appendChild(new Option(yazi || deger, deger));
  });
  if(sekmeAd && !gorulen.has(sekmeAd)) sel.appendChild(new Option(sekmeAd, sekmeAd));
  if(sekmeAd) sel.value = sekmeAd;
  return sel;
}
function _ndSekmeDegeriAl(kok){
  if(typeof _omSekmeDegeriAl === 'function') return _omSekmeDegeriAl(kok);
  const sel = kok && kok.querySelector ? kok.querySelector('select') : null;
  return sel ? (sel.value || '').trim() : '';
}

""" + anchor
s = replace_once(s, anchor, helper, 'fallback section selector')
s = s.replace("const sekmeSecici = (typeof _sekmeSeciciOlustur === 'function') ? _sekmeSeciciOlustur('') : null;", "const sekmeSecici = _ndSekmeSeciciOlustur('');", 1)
s = s.replace("const sekmeAd = (typeof _omSekmeDegeriAl === 'function')\n      ? _omSekmeDegeriAl(document.getElementById('ndYeniOgeSekmeYer'))\n      : '';", "const sekmeAd = _ndSekmeDegeriAl(document.getElementById('ndYeniOgeSekmeYer'));", 1)
s = s.replace("  if(sekmeSecici){\n    const yer = document.getElementById('ndYeniOgeSekmeYer');\n    if(yer) yer.appendChild(sekmeSecici);\n  }", "  const yer = document.getElementById('ndYeniOgeSekmeYer');\n  if(yer && sekmeSecici) yer.appendChild(sekmeSecici);", 1)

p.write_text(s, encoding='utf-8')

# ---- regression test ----
t = Path('tests/navigation-customization-smoke.test.js')
t.write_text("""const fs = require('fs');
const assert = require('assert');
const nav = fs.readFileSync('js/alt-navigasyon.js','utf8');
const editor = fs.readFileSync('js/nav-duzeni-editor.js','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');

assert(nav.includes("oyNavDuzeniCacheV1"), 'Navigasyon düzeni ilk çizim için local cache kullanmalı.');
assert(nav.includes('let _navDuzeniVerisi = _navDuzeniCacheOku();'), 'İlk GRUPLAR inşası cached resmi düzenle başlamalı.');
assert(nav.includes('window._navDuzeniYerelUygula = _navDuzeniYerelUygula;'), 'Editör optimistic düzeni gerçek menüye aktarabilmeli.');
assert(nav.includes('_menuResmiVarsayilanGetir'), 'Kart varsayılanı adminin güncel resmi rengini/adını kullanmalı.');
assert(editor.includes("window._navDuzeniYerelUygula(nd)"), 'Navigasyon editörü Firestore beklemeden optimistic UI uygulamalı.');
assert(editor.includes("window._navDuzeniYerelUygula(onceki)"), 'Firestore hatasında optimistic değişiklik geri alınmalı.');
assert(editor.includes('function _ndSekmeSeciciOlustur'), 'Yeni öğe ekleme ana app sekme seçicisi yokken fallback sağlamalı.');
assert(editor.includes("document.querySelectorAll('[data-tab]')"), 'Fallback sekme listesi mevcut uygulama sekmelerinden üretilmeli.');
assert(editor.includes('const sekmeAd = _ndSekmeDegeriAl'), 'Yeni öğe fallback seçicisinden değer okuyabilmeli.');
assert(sw.includes("oy-cache-v437"), 'Yeni navigasyon JS dosyaları için cache sürümü v437 olmalı.');
console.log('Navigasyon özelleştirme smoke testleri başarılı.');
""", encoding='utf-8')

# ---- cache bump ----
sw = Path('service-worker.js')
x = sw.read_text(encoding='utf-8')
if "const CACHE_ADI = 'oy-cache-v436';" in x:
    x = x.replace("const CACHE_ADI = 'oy-cache-v436';", "const CACHE_ADI = 'oy-cache-v437';", 1)
elif "const CACHE_ADI = 'oy-cache-v437';" not in x:
    raise SystemExit('unexpected service worker cache version')
sw.write_text(x, encoding='utf-8')
