const fs=require('fs'),assert=require('assert'),vm=require('vm');

/* Anasayfa "Haberler" şeridi: Haberler sayfasıyla aynı sırada (en yeni önce) ilk 10 haberi gösterir.
 * Sıralamadan önce dilimlenirse kayıt sırasındaki eski haberler şeride girer, yeni haberler görünmez. */
const dash=fs.readFileSync('js/modules/dashboard.js','utf8'),comm=fs.readFileSync('js/modules/communication.js','utf8');
assert(dash.includes(".filter(x=>x&&x.aktif!==false).sort((a,b)=>newsStamp(b).localeCompare(newsStamp(a))).slice(0,10)"),'Şerit önce tarihe göre sıralamalı, sonra ilk 10\'u almalı.');
assert(comm.includes("String(b.tarih||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.eklenmeTarihi||''))"),'Haberler sayfasının sıralama anahtarı (tarih, yoksa eklenme tarihi) değişirse şerit de güncellenmeli.');

/* newsStamp gerçek kaynaktan çalıştırılır: yayın tarihi önce, yoksa eklenme tarihi; Timestamp nesnesi ISO'ya çevrilir */
const src=/function newsStamp\(x\)\{[^\n]*\}/.exec(dash)?.[0];assert(src,'newsStamp bulunamadı');
const newsStamp=vm.runInNewContext(`(${src.replace('function newsStamp','function')})`);
assert.strictEqual(newsStamp({tarih:'2026-11-02T10:00:00.000Z',eklenmeTarihi:'2026-10-01T00:00:00.000Z'}),'2026-11-02T10:00:00.000Z');
assert.strictEqual(newsStamp({eklenmeTarihi:'2026-11-02T09:00:00.000Z'}),'2026-11-02T09:00:00.000Z');
assert.strictEqual(newsStamp({tarih:{toDate:()=>new Date('2026-11-03T00:00:00Z')}}),'2026-11-03T00:00:00.000Z');
assert.strictEqual(newsStamp({}),'');
const sirali=[{id:'e',tarih:'2026-10-12T08:00:00.000Z'},{id:'b',tarih:'2026-11-02T12:30:00.000Z'},{id:'c',eklenmeTarihi:'2026-11-02T09:00:00.000Z'},{id:'a',tarih:'2026-11-02T10:00:00.000Z'}].sort((a,b)=>newsStamp(b).localeCompare(newsStamp(a))).map(x=>x.id);
assert.deepStrictEqual(Array.from(sirali),['b','a','c','e']);

console.log('ana-sayfa-haber-seridi: tamam');
