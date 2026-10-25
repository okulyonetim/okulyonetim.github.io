const assert=require('node:assert/strict');const test=require('node:test');const fs=require('node:fs');const vm=require('node:vm');
const src=fs.readFileSync('js/modules/tutanak.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8'),loader=fs.readFileSync('js/app-loader.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
function yukle(data={},user={uid:'u1'}){const win={AppStore:{data:t=>data[t]||[],get:k=>k==='session.user'?user:{}},toast(){}};win.window=win;vm.runInContext(src,vm.createContext({window:win,document:{getElementById:()=>null},navigator:{onLine:false},console}));return win.TutanakModule}
test('çıktı başlığı, giriş ve kapanış cümlesi tarih-saat ile oluşur',()=>{
  const m=yukle();m.reset();const h=m.paper({olayTarih:'2026-10-20',olaySaat:'16:20',yer:'7/A sınıfı',ders:'Türkçe',anlatim:'Olay metni',duzTarih:'2026-10-20',duzSaat:'16:30',imzalar:[{ad:'A',unvan:'Öğretmen'},{ad:'B',unvan:'Müdür Yardımcısı'}]});
  for(const t of['TUTANAKTIR','20/10/2026 tarihinde saat 16:20 sıralarında','7/A sınıfı yerinde','(Türkçe)','Olay metni','İş bu tutanak 20/10/2026 tarihinde, saat 16:30 sıralarında tarafımızca düzenlenerek kayıt altına alınmıştır.','İmza','Müdür Yardımcısı'])assert.ok(h.includes(t),t);
});
test('anlatım boşsa noktalı satır, metin kaçışlanır',()=>{const m=yukle();assert.ok(m.paper({imzalar:[]}).includes('ttn-dots'));assert.ok(!m.paper({anlatim:'<script>x</script>',imzalar:[]}).includes('<script'))});
test('hazır metinler var ve boş yer işaretleri içerir',()=>{const m=yukle();assert.ok(m.HAZIR.length>=10);assert.ok(m.HAZIR.every(h=>h.ad&&h.metin.includes('…')))});
test('öğretmen yalnız kendi, yönetici hepsini görür',()=>{
  const d={tutanaklar:[{id:'1',olusturanUid:'u1',olayTarih:'2026-01-01'},{id:'2',olusturanUid:'u2',olayTarih:'2026-01-02'}]};
  assert.deepEqual(yukle(d,{uid:'u1'}).records().map(x=>x.id),['1']);
  assert.deepEqual(yukle(d,{uid:'u9',admin:true}).records().map(x=>x.id).sort(),['1','2']);
});
test('koleksiyon, kurallar, menü, rota ve önbellek tanımlı; yazım yalnız DeviceData',()=>{
  const rules=fs.readFileSync('firestore.rules','utf8'),init=fs.readFileSync('js/firebase-init.js','utf8');
  assert.match(init,/tutanaklar:'oy_tutanaklar'/);
  const blok=rules.slice(rules.indexOf('match /oy_tutanaklar/{id}'));
  assert.match(blok,/allow create: if girisYapmis\(\) && request\.resource\.data\.olusturanUid == request\.auth\.uid/);
  assert.match(blok,/allow update:[\s\S]*olusturanUid == resource\.data\.olusturanUid/);
  assert.match(blok,/allow delete: if girisYapmis\(\)[\s\S]*yoneticiMi\(\)/);
  assert.match(fs.readFileSync('js/core/app-nav.js','utf8'),/\['tutanak','Tutanak Hazırla'[^\]]*'tutanak'\]/);
  assert.match(shell,/name==='tutanak'/);assert.match(sw,/js\/modules\/tutanak\.js/);
  assert.doesNotMatch(src,/firebase\.firestore|\.collection\(/);
});
test('sayfa ve kağıt CSS tokenlarla yazıldı (hex yok)',()=>{
  const a=css.indexOf('/* ===== TUTANAK HAZIRLA'),b=css.indexOf('/* ===== WEB ARAYÜZÜ'),c=css.indexOf('/* ===== A4 FORM — Tutanak'),d=css.indexOf('/* ═══════════ SERVİS OTURMA');
  assert.ok(a>0&&a<b&&c>0&&c<d);
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(css.slice(a,b)));assert.ok(!/#[0-9a-f]{3,6}\b/i.test(css.slice(c,d)));
});

// Çıktıda logo/okul adı olmamalı; önizleme metni her temada okunur olmalı
{
  const fs = require('fs'), assert = require('assert');
  const js = fs.readFileSync('js/modules/tutanak.js', 'utf8');
  const css = fs.readFileSync('css/design-system-base.css', 'utf8');
  assert(!/ttn-brand/.test(js) && !/ttn-brand/.test(css), 'tutanakta logo/okul adı bloğu olmamalı');
  assert(/\.ttn-sheet \*\{color:var\(--ka-report-text\)/.test(css), 'önizleme metin rengi sabit olmalı');
  assert(/öğretmen\/i\.test/.test(js), 'unvan tekrar eklenmemeli');
}

// Tam sayfa, düzenlenebilir önizleme
{
  const fs = require('fs'), assert = require('assert');
  const js = fs.readFileSync('js/modules/tutanak.js', 'utf8');
  assert(/data-ttn-ed/.test(js) && /function sheetEdit/.test(js), 'önizleme üzerinde düzenleme olmalı');
  assert(/girisOzel/.test(js) && /kapanisOzel/.test(js), 'özel metinler saklanmalı');
  const m = require('vm'); // paper(s) yazdırma çıktısında contenteditable olmamalı
  assert(/function paper\(s,edit\)/.test(js) && /ed=\(k\)=>edit\?/.test(js));
}

// Ayarlanabilir boşluklar
{
  const fs = require('fs'), assert = require('assert');
  const js = fs.readFileSync('js/modules/tutanak.js', 'utf8');
  assert(/data-ttn-gap/.test(js) && /imzaBosluk/.test(js) && /function gapOf/.test(js), 'boşluk ayarı olmalı');
}
