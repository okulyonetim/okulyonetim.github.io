const assert=require('node:assert/strict');const test=require('node:test');const fs=require('node:fs');const vm=require('node:vm');
const src=fs.readFileSync('js/modules/dilekce.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8'),loader=fs.readFileSync('js/app-loader.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
function yukle(data={},user={uid:'u1'}){const win={AppStore:{data:t=>data[t]||[],get:k=>k==='session.user'?user:{}},toast(){}};win.window=win;vm.runInContext(src,vm.createContext({window:win,document:{getElementById:()=>null},navigator:{onLine:false},console}));return win.DilekceModule}
test('1. tekil kişi eki ünlü uyumuna göre eklenir',()=>{const m=yukle();assert.equal(m.ben('Fen Bilimleri Öğretmeni'),'Fen Bilimleri Öğretmeniyim');assert.equal(m.ben('Müdür Yardımcısı'),'Müdür Yardımcısıyım');assert.equal(m.ben('Müdür'),'Müdürüm');assert.equal(m.ben('Rehber Öğretmen'),'Rehber Öğretmenim')});
test('hitap makama MÜDÜRLÜĞÜNE ekler, tam makam yazılırsa dokunmaz',()=>{const m=yukle();assert.equal(m.hitap({makam:'Koruk Ortaokulu'}),'KORUK ORTAOKULU MÜDÜRLÜĞÜNE');assert.equal(m.hitap({makam:'Merkez İlçe Milli Eğitim Müdürlüğüne'}),'MERKEZ İLÇE MİLLİ EĞİTİM MÜDÜRLÜĞÜNE')});
test('çıktı açılış, metin, kapanış, imza ve ekleri içerir; kaçışlanır',()=>{
  const m=yukle();m.reset();
  const h=m.paper({makam:'Koruk Ortaokulu',konu:'İzin',acilis:true,unvan:'Fen Bilimleri Öğretmeni',metin:'İzin istiyorum.<script>',ad:'Ali Veli',tarih:'2026-10-20',ekVar:'evet',ekler:['Rapor']});
  for(const t of['KORUK ORTAOKULU MÜDÜRLÜĞÜNE','Okulunuz Fen Bilimleri Öğretmeniyim.','İzin istiyorum.','Gereğini bilgilerinize arz ederim.','20.10.2026','Ali Veli','EKLER:','Rapor'])assert.ok(h.includes(t),t);
  assert.ok(!h.includes('<script'));
  assert.ok(!m.paper({acilis:false,metin:'x',ekVar:'hayir',ekler:['Rapor']}).includes('EKLER'));
});
test('hazır metinler 50+ ve her kategoride var',()=>{const m=yukle();assert.ok(m.HAZIR.length>=50);m.KATEGORILER.forEach((_,i)=>assert.ok(m.HAZIR.some(h=>h.k===i)));assert.ok(m.HAZIR.every(h=>h.ad&&h.konu&&h.metin.length>40))});
test('öğretmen yalnız kendi, yönetici hepsini görür',()=>{const d={dilekceKayitlari:[{id:'1',olusturanUid:'u1'},{id:'2',olusturanUid:'u2'}]};assert.deepEqual(yukle(d,{uid:'u1'}).records().map(x=>x.id),['1']);assert.equal(yukle(d,{uid:'x',admin:true}).records().length,2)});
test('T.C. kimlik numarası kayda alınmaz',()=>{assert.doesNotMatch(src.match(/const KAYIT_KEYS=[^;]*;/)[0],/tc/);assert.match(src,/tc:''/)});
test('koleksiyon, kurallar, menü, rota, önbellek ve CSS tanımlı; yazım yalnız DeviceData',()=>{
  const rules=fs.readFileSync('firestore.rules','utf8'),init=fs.readFileSync('js/firebase-init.js','utf8');
  assert.match(init,/dilekceKayitlari:'oy_dilekceKayitlari'/);
  const b=rules.slice(rules.indexOf('match /oy_dilekceKayitlari/{id}'));
  assert.match(b,/allow create: if girisYapmis\(\) && request\.resource\.data\.olusturanUid == request\.auth\.uid/);assert.match(b,/allow delete: if girisYapmis\(\)[\s\S]*yoneticiMi\(\)/);
  assert.match(shell,/\['Dilekçe Oluştur','📄','dilekcehazirla'\]/);assert.match(loader,/\['Dilekçe Oluştur','📄','dilekcehazirla'\]/);assert.match(shell,/name==='dilekcehazirla'/);assert.match(sw,/js\/modules\/dilekce\.js/);
  assert.doesNotMatch(src,/firebase\.firestore|\.collection\(/);
  const a=css.indexOf('/* ===== DİLEKÇE OLUŞTUR'),w=css.indexOf('/* ===== WEB ARAYÜZÜ'),c=css.indexOf('/* ===== A4 FORM — Dilekçe'),d=css.indexOf('/* ═══════════ SERVİS OTURMA');
  assert.ok(a>0&&a<w&&c>0&&c<d);assert.ok(!/#[0-9a-f]{3,6}\b/i.test(css.slice(a,w)));assert.ok(!/#[0-9a-f]{3,6}\b/i.test(css.slice(c,d)));
});

// Tam sayfa, düzenlenebilir önizleme ve ayarlanabilir boşluk
{
  const fs = require('fs'), assert = require('assert');
  const js = fs.readFileSync('js/modules/dilekce.js', 'utf8');
  assert(/data-dlk-ed/.test(js) && /function sheetEdit/.test(js), 'önizleme üzerinde düzenleme olmalı');
  assert(/data-dlk-gap/.test(js) && /imzaBosluk/.test(js), 'boşluk ayarı olmalı');
  assert(/govdeOzel/.test(js) && /hitapOzel/.test(js) && /kapanisOzel/.test(js), 'özel metinler saklanmalı');
}
