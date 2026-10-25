const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm'),{spawnSync}=require('child_process');
const ctx={};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/modules/yillik-plan-core.js','utf8'),ctx);
const C=ctx.YillikPlanCore;

/* Araç: Word dosyası → sınıf JSON'u + dizin; ikinci çalıştırma aynı planı yenisiyle değiştirir (çoğalmaz). */
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'yp-katalog-')),docx='tests/fixtures/5-sinif-sosyal-bilgiler-yillik-plan-2026-2027.docx';
for(let i=0;i<2;i++){const r=spawnSync(process.execPath,['scripts/yillik-plan-katalog.mjs',docx,'--cikti',tmp,'--yayin','MEB Yayınları'],{encoding:'utf8'});assert.strictEqual(r.status,0,r.stderr||r.stdout)}
const k=JSON.parse(fs.readFileSync(path.join(tmp,'5.json'),'utf8')),dizin=JSON.parse(fs.readFileSync(path.join(tmp,'index.json'),'utf8'));
assert.strictEqual(k.sinif,5);assert.strictEqual(k.planlar.length,1);
const p=k.planlar[0];
assert.strictEqual(p.dersAdi,'Sosyal Bilgiler');assert.strictEqual(p.seviye,5);assert.strictEqual(p.egitimOgretimYili,'2026-2027');assert.strictEqual(p.yayin,'MEB Yayınları');assert.strictEqual(p.kaynak,'katalog');
assert.strictEqual(p.satirlar.length,41);assert.ok(p.basliklar.some(b=>b.anahtar==='unite_tema'));
assert.deepStrictEqual(dizin.siniflar['5'],[{ders:'Sosyal Bilgiler',anahtar:C.planAnahtari(p)}]);

/* Uygulamaya gömülü katalog aracın ürettiğiyle aynı plan; kayda dönüşünce 38 ders haftası ve ünite listesi korunur. */
const gomulu=JSON.parse(fs.readFileSync('data/yillik-plan/5.json','utf8')).planlar[0];
assert.strictEqual(C.planAnahtari(gomulu),C.planAnahtari(p));assert.strictEqual(gomulu.satirlar.length,p.satirlar.length);
const anahtarId={};gomulu.basliklar.forEach(b=>{anahtarId[b.anahtar]=`katalog_${b.anahtar}`});
const kayit=C.kayitHazirla({...gomulu,kaynak:'katalog'},anahtarId);
assert.strictEqual(C.dersHaftasi(kayit),38);assert.strictEqual(kayit.sutunlar.length,gomulu.basliklar.length);
assert.ok(C.uniteler(kayit,gomulu.basliklar.map(b=>({id:`katalog_${b.anahtar}`,ad:b.ad}))).length>=5);

/* Arayüz: katalog tembel yüklenir, okulda aynı plan varsa gizlenir; kopya okul havuzuna bağlanır. */
const ui=fs.readFileSync('js/modules/yillik-plan-ui.js','utf8'),dlg=fs.readFileSync('js/modules/yillik-plan-dialog.js','utf8');
assert.ok(ui.includes("data/yillik-plan/")&&ui.includes('katalogYukle(')&&ui.includes('katalogGorunen'));
assert.ok(/katalogMu=p=>!!p\?\._ayrisan/.test(ui),'katalog planı salt okunur olmalı');
assert.ok(dlg.includes('katalogKopyala')&&dlg.includes('baslikCozucu'));
assert.ok(!/localStorage\.setItem/.test(ui+dlg));
console.log('yillik-plan-katalog ok');
