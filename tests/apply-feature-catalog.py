from pathlib import Path
import re


def replace_once(text, old, new, label):
    c = text.count(old)
    if c != 1:
        raise SystemExit(f'{label}: expected 1 match, got {c}')
    return text.replace(old, new, 1)

# ---- index.html: merkezi katalog app/alt-nav'dan önce yüklensin ----
p = Path('index.html')
s = p.read_text(encoding='utf-8')
if 'js/ozellik-katalogu.js' not in s:
    m = re.search(r'<script\s+src=["\']js/app\.js["\'][^>]*></script>', s)
    if not m:
        raise SystemExit('index app.js script tag not found')
    s = s[:m.start()] + '<script src="js/ozellik-katalogu.js"></script>\n' + s[m.start():]
p.write_text(s, encoding='utf-8')

# ---- app.js: Yeni Öğe seçicisinin tek kaynağı merkezi katalog olsun ----
p = Path('js/app.js')
s = p.read_text(encoding='utf-8')
pattern = re.compile(r'/\* Uygulamadaki tüm mevcut sekmeleri \(data-tab\) toplar;.*?function _mevcutSekmeleriTopla\(\)\{.*?\n\}\n\n(?=/\* "Sekme adı" alanı)', re.S)
m = pattern.search(s)
if not m:
    raise SystemExit('_mevcutSekmeleriTopla block not found')
new_block = '''/* Uygulamadaki navigasyona eklenebilir tüm özellikleri toplar.
   Merkezi OzellikKatalogu varsa hem DOM data-tab sekmeleri hem de
   fonksiyon/overlay tabanlı AltNav özellikleri aynı listeden gelir.
   Katalog henüz yüklenmemişse eski DOM taraması güvenli fallback'tir. */
function _mevcutSekmeleriTopla(){
  if(window.OzellikKatalogu && typeof window.OzellikKatalogu.liste === 'function'){
    return window.OzellikKatalogu.liste().map(x => ({ tab:x.deger, label:x.ad, tip:x.tip, kaynak:x.kaynak }));
  }
  const gorulen = new Set();
  const liste = [];
  document.querySelectorAll('.nav-tab[data-tab]').forEach(btn => {
    const tab = btn.getAttribute('data-tab');
    if(!tab || gorulen.has(tab)) return;
    gorulen.add(tab);
    const etiket = btn.querySelector('.nt-label');
    liste.push({ tab, label:(etiket ? etiket.textContent : btn.textContent || tab).trim(), tip:'sekme', kaynak:'dom' });
  });
  return liste;
}

'''
s = s[:m.start()] + new_block + s[m.end():]
p.write_text(s, encoding='utf-8')

# ---- alt-navigasyon.js: built-in katalog öğelerini merkezi kataloğa otomatik kaydet ----
p = Path('js/alt-navigasyon.js')
s = p.read_text(encoding='utf-8')
anchor = '''  // İlk (senkron) doldurma — Firestore verisi henüz gelmeden önce bile
  // GRUPLAR boş kalmasın diye sadece katalogla bir kez inşa edilir.
  _gruplariYenidenOlustur();'''
insert = anchor + '''

  // Merkezi özellik kataloğu: GRUPLAR_KATALOG'a eklenen her yeni özellik
  // Navigasyon Düzeni > Yeni Öğe Ekle listesine otomatik düşer. Böylece
  // sekmeAc kullanmayan overlay/fonksiyon özellikleri de unutulmaz.
  function _ozellikKatalogunuSenkronla(){
    if(!window.OzellikKatalogu || typeof window.OzellikKatalogu.kaydet !== 'function') return;
    GRUPLAR_KATALOG.forEach(g => {
      const tum = (g.ogeler || []).concat(g.altGrup ? (g.altGrup.ogeler || []) : []);
      tum.forEach(o => {
        if(!o || !o.anahtar || typeof o.aksiyon !== 'function') return;
        window.OzellikKatalogu.kaydet({
          id:o.anahtar,
          ad:o.ad,
          tip:'aksiyon',
          modul:o.modul || null,
          ikon:o.ikon || null,
          ac:o.aksiyon
        });
      });
    });
  }
  _ozellikKatalogunuSenkronla();
  window._ozellikKatalogunuSenkronla = _ozellikKatalogunuSenkronla;'''
if '_ozellikKatalogunuSenkronla' not in s:
    s = replace_once(s, anchor, insert, 'feature registry sync')

old = "aksiyon: function(){ sekmeAc(eo.sekmeAd); }"
new = "aksiyon: function(){ if(window.OzellikKatalogu && window.OzellikKatalogu.ac(eo.sekmeAd)) return; sekmeAc(eo.sekmeAd); }"
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit('ekOgeler action not found')

old2 = "aksiyon: function(){ sekmeAc(o.sekmeAd); },"
new2 = "aksiyon: function(){ if(window.OzellikKatalogu && window.OzellikKatalogu.ac(o.sekmeAd)) return; sekmeAc(o.sekmeAd); },"
if old2 in s:
    s = s.replace(old2, new2, 1)
# Özel menü akışı eski sürümde farklıysa fatal yapma; ekOgeler kritik yoldur.
p.write_text(s, encoding='utf-8')

# ---- nav-duzeni-editor.js fallback de merkezi katalogdan beslensin ----
p = Path('js/nav-duzeni-editor.js')
s = p.read_text(encoding='utf-8')
pat = re.compile(r'function _ndSekmeSeciciOlustur\(sekmeAd\)\{.*?\n\}\nfunction _ndSekmeDegeriAl', re.S)
m = pat.search(s)
if not m:
    raise SystemExit('_ndSekmeSeciciOlustur block not found')
new_fn = '''function _ndSekmeSeciciOlustur(sekmeAd){
  if(typeof _sekmeSeciciOlustur === 'function') return _sekmeSeciciOlustur(sekmeAd || '');
  const sel = document.createElement('select');
  sel.className = 'nd-yeni-oge-sekme-fallback';
  sel.style.width = '100%';
  sel.appendChild(new Option('Özellik seçin...', ''));

  if(window.OzellikKatalogu && typeof window.OzellikKatalogu.liste === 'function'){
    window.OzellikKatalogu.liste().forEach(x => {
      const ek = x.kaynak === 'katalog' ? ' — özellik' : '';
      sel.appendChild(new Option((x.ad || x.deger) + ek, x.deger));
    });
  } else {
    const gorulen = new Set();
    document.querySelectorAll('[data-tab]').forEach(el => {
      const deger = (el.getAttribute('data-tab') || '').trim();
      if(!deger || gorulen.has(deger)) return;
      gorulen.add(deger);
      const yazi = (el.textContent || deger).replace(/\\s+/g,' ').trim();
      sel.appendChild(new Option(yazi || deger, deger));
    });
  }
  if(sekmeAd && !Array.from(sel.options).some(o => o.value === sekmeAd)) sel.appendChild(new Option(sekmeAd, sekmeAd));
  if(sekmeAd) sel.value = sekmeAd;
  return sel;
}
function _ndSekmeDegeriAl'''
s = s[:m.start()] + new_fn + s[m.end():]
p.write_text(s, encoding='utf-8')

# ---- service-worker: yeni katalog offline cache + sürüm ----
p = Path('service-worker.js')
s = p.read_text(encoding='utf-8')
if "const CACHE_ADI = 'oy-cache-v437';" in s:
    s = s.replace("const CACHE_ADI = 'oy-cache-v437';", "const CACHE_ADI = 'oy-cache-v438';", 1)
elif "const CACHE_ADI = 'oy-cache-v438';" not in s:
    raise SystemExit('unexpected service worker cache version')
if "'./js/ozellik-katalogu.js'" not in s:
    s = replace_once(s, "  './js/app.js',", "  './js/ozellik-katalogu.js',\n  './js/app.js',", 'precache feature catalog')
p.write_text(s, encoding='utf-8')

# ---- regression test ----
p = Path('tests/feature-catalog-smoke.test.js')
p.write_text(r'''const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const src = fs.readFileSync('js/ozellik-katalogu.js','utf8');
const app = fs.readFileSync('js/app.js','utf8');
const nav = fs.readFileSync('js/alt-navigasyon.js','utf8');
const editor = fs.readFileSync('js/nav-duzeni-editor.js','utf8');
const index = fs.readFileSync('index.html','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');

const opened = [];
const domNodes = [
  { getAttribute:k => k==='data-tab' ? 'panel' : null, textContent:'Ana Sayfa', querySelector:()=>null },
  { getAttribute:k => k==='data-tab' ? 'ogrenciler' : null, textContent:'Öğrenciler', querySelector:()=>null }
];
const windowObj = { sekmeAc:x => opened.push(x) };
const ctx = {
  window: windowObj,
  document: { querySelectorAll:sel => sel==='[data-tab]' ? domNodes : [] },
  Map, Set, String, Object, Array, console
};
vm.createContext(ctx);
vm.runInContext(src, ctx);

let special = 0;
windowObj.OzellikKatalogu.kaydet({ id:'yeniOzellik', ad:'Yeni Özellik', ac:()=>{ special++; } });
const list = windowObj.OzellikKatalogu.liste();
assert(list.some(x => x.deger==='panel'), 'data-tab sekmeleri otomatik keşfedilmeli.');
assert(list.some(x => x.deger==='@ozellik:yeniOzellik'), 'Kayıt edilen özel özellik Yeni Öğe listesine düşmeli.');
assert(windowObj.OzellikKatalogu.ac('panel'), 'Standart sekme açılabilmeli.');
assert.deepStrictEqual(opened, ['panel']);
assert(windowObj.OzellikKatalogu.ac('@ozellik:yeniOzellik'), 'Fonksiyon/overlay özellik açılabilmeli.');
assert.strictEqual(special, 1);

assert(app.includes('window.OzellikKatalogu.liste().map'), 'Ana sekme seçici merkezi katalogdan beslenmeli.');
assert(nav.includes('function _ozellikKatalogunuSenkronla()'), 'AltNav built-in özelliklerini otomatik kataloglamalı.');
assert(nav.includes("id:o.anahtar"), 'Yeni GRUPLAR_KATALOG öğeleri anahtarlarıyla otomatik kaydolmalı.');
assert(nav.includes('window.OzellikKatalogu.ac(eo.sekmeAd)'), 'Kaydedilen ek öğeler merkezi yürütücüyle açılmalı.');
assert(editor.includes('window.OzellikKatalogu.liste().forEach'), 'Navigasyon editörü fallback seçicisi merkezi kataloğu kullanmalı.');
assert(index.includes('<script src="js/ozellik-katalogu.js"></script>'), 'Katalog uygulama scriptlerinden önce yüklenmeli.');
assert(index.indexOf('js/ozellik-katalogu.js') < index.indexOf('js/app.js'), 'Katalog app.js öncesinde yüklenmeli.');
assert(sw.includes("'./js/ozellik-katalogu.js'"), 'Katalog offline precache listesinde olmalı.');
assert(sw.includes("oy-cache-v438"), 'Cache sürümü v438 olmalı.');
console.log('Merkezi özellik kataloğu smoke testleri başarılı.');
''', encoding='utf-8')
