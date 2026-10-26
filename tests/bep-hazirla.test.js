const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function load(files,extra={}){
  const win={console,...extra};
  win.window=win;
  win.globalThis=win;
  vm.createContext(win);
  for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),win,{filename:f});
  return win;
}

const eq=(a,b,m)=>assert.strictEqual(JSON.stringify(a),JSON.stringify(b),m);
const w=load(['js/modules/bep-core.js','js/modules/bep-print.js']);
const C=w.BepCore,P=w.BepPrint;
assert(C&&P,'BepCore ve BepPrint yüklenmeli.');

/* ── eğitim yılı ve sınıf ── */
assert.strictEqual(C.schoolYear(new Date(2026,9,26)),'2026-2027','Ekim ayı: yeni eğitim yılı.');
assert.strictEqual(C.schoolYear(new Date(2027,2,5)),'2026-2027','Mart ayı: yıl önceki Eylül’de başlar.');
assert.strictEqual(C.schoolYear(new Date(2026,7,20)),'2026-2027','Ağustos’tan itibaren yeni yıl.');
assert.strictEqual(C.schoolYear(new Date(2026,5,20)),'2025-2026','Haziran: eski yıl.');
assert.strictEqual(C.gradeOf('3. Sınıf'),3);
assert.strictEqual(C.gradeOf('7/B'),7);
assert.strictEqual(C.gradeOf('anasınıfı'),0);

/* ── gerçek katalogla çalışma ── */
const index=JSON.parse(fs.readFileSync('data/bep/index.json','utf8'));
const grades=C.gradeList(index);
eq(grades.map(g=>g.sinif),[1,2,3,4,5,6,7,8],'Katalog 1–8. sınıfları vermeli.');
const courses=C.coursesOf(index,3);
assert(courses.length>=20,'3. sınıf için ders listesi gelmeli.');
const mat=courses.find(c=>/matematik/i.test(c.ad));
assert(mat&&mat.dosya&&fs.existsSync('data/bep/dersler/'+mat.dosya),'Matematik ders dosyası katalogda bulunmalı.');
const ders=JSON.parse(fs.readFileSync('data/bep/dersler/'+mat.dosya,'utf8'));
const units=C.unitsOf(ders);
assert(units.length>0&&units[0].kazanimlar[0].kod&&units[0].kazanimlar[0].metin,'Ünite ve kazanımlar çıkarılmalı.');
const first=units[0].kazanimlar[0];
assert(C.filterUnits(units,first.kod).some(u=>u.kazanimlar.some(k=>k.kod===first.kod)),'Kazanım koduyla arama çalışmalı.');
assert.strictEqual(C.filterUnits(units,'zzzyokböylebirşey').length,0);
/* Kaynak paketteki bilinen tek eksik: Müzik Okulu kaval modülü (4. sınıf). Yeni bir eksik çıkarsa test uyarır. */
const BILINEN_EKSIK=new Set(['4-m-bireysel-calgi-egitimi-kaval-modulu-muzik-okulu.json']);
index.kademeler.forEach(k=>k.gruplar.forEach(g=>g.dersler.forEach(d=>{
  if(BILINEN_EKSIK.has(d.dosya))return;
  assert(fs.existsSync('data/bep/dersler/'+d.dosya),`Katalogdaki ders dosyası eksik: ${d.dosya}`);
})));

/* ── kayıt şeması ── */
const rec=C.blank({uid:'u1',ad:'Test Öğretmen',okul:'Deneme Okulu',mudur:'Müdür Bey',ogretmen:'Sınıf Hoca'});
assert.strictEqual(rec.sahipUid,'u1','Kayıt sahibinin uid’i yazılmalı (Firestore kuralı sahipUid ister).');
assert.strictEqual(rec.ekip[0].ad,'Müdür Bey');
assert.strictEqual(rec.ekip[1].ad,'Sınıf Hoca');
eq(C.normalize({}).dersler,[],'Boş kayıt normalleşmeli.');
assert.strictEqual(C.normalize({ogrenci:{sinif:'abc'}}).ogrenci.sinif,'','Geçersiz sınıf boşa dönmeli.');
assert.strictEqual(C.normalize({ogrenci:{dogum:'31/12/2015'}}).ogrenci.dogum,'','Geçersiz tarih boşa dönmeli.');
assert.strictEqual(C.normalize({yil:'2026'}).yil,C.schoolYear(),'Geçersiz yıl varsayılana dönmeli.');
const long='x'.repeat(5000);
assert(C.normalize({performans:{guclu:long}}).performans.guclu.length<=C.LIMIT.metin,'Uzun metin sınırlanmalı.');
assert.strictEqual(C.normalize({dersler:Array.from({length:30},(_,i)=>({key:'d'+i,ad:'Ders '+i}))}).dersler.length,C.LIMIT.ders,'Ders sayısı sınırlanmalı.');

/* ── ders ve amaç işlemleri ── */
rec.ogrenci.adSoyad='Ali Yılmaz';rec.ogrenci.sinif='3';rec.ogrenci.tani=['Özel Öğrenme Güçlüğü'];
rec.varsayilan.yontem=['Akran Destekli Öğretim'];rec.varsayilan.olcut='%60 (3/5)';
const c=C.addCourse(rec,mat);
assert.strictEqual(C.addCourse(rec,mat),c,'Aynı ders iki kez eklenmemeli.');
const g1=C.addGoal(rec,c,first,units[0].ad);
assert(g1&&g1.uda===first.metin&&g1.kod===first.kod,'Kazanım uzun dönemli amaç olmalı.');
assert.strictEqual(g1.kda.length,first.alt.length,'Alt basamaklar kısa dönemli amaç olmalı.');
eq(g1.yontem,['Akran Destekli Öğretim'],'Varsayılan yöntem yeni amaca uygulanmalı.');
assert.strictEqual(g1.olcut,'%60 (3/5)');
assert.strictEqual(C.addGoal(rec,c,first,units[0].ad),null,'Aynı kazanım iki kez eklenmemeli.');
assert(C.hasGoal(c,first.kod,first.metin));
const man=C.manualGoal(rec.varsayilan);c.amaclar.push(man);
assert.strictEqual(man.kod,'');
C.removeGoal(c,man.id);
assert.strictEqual(c.amaclar.length,1);
rec.varsayilan.materyal=['Bilgisayar'];C.applyDefaults(rec);
eq(c.amaclar[0].materyal,['Bilgisayar'],'Varsayılanlar tüm amaçlara uygulanabilmeli.');
const arr=[1,2,3];C.moveItem(arr,0,1);eq(arr,[2,1,3]);C.moveItem(arr,2,1);eq(arr,[2,1,3],'Sınır dışı taşıma yok sayılmalı.');

/* ── doğrulama ── */
let issues=C.check(rec);
assert(issues.some(x=>x.adim==='performans'),'Performans boşken uyarı verilmeli.');
assert(issues.some(x=>x.adim==='duzenleme'),'Düzenleme boşken uyarı verilmeli.');
rec.performans.guclu='Görsel öğrenir.';rec.duzenleme.ortam='Ön sıra.';rec.ekip[1].ad='Sınıf Hoca';
issues=C.check(rec);
assert.strictEqual(issues.length,0,'Eksiksiz dosyada uyarı olmamalı: '+JSON.stringify(issues));
assert.strictEqual(C.stepStates(rec).cikti,'tamam');
c.amaclar[0].baslangic='2026-12-01';c.amaclar[0].bitis='2026-10-01';
assert(C.check(rec).some(x=>/bitiş tarihi/.test(x.ileti)),'Bitiş tarihi başlangıçtan önceyse uyarı verilmeli.');
c.amaclar[0].bitis='2027-01-01';
assert.strictEqual(C.summary(rec).amac,1);
assert(C.matches(rec,'ali')&&C.matches(rec,'MATEMATİK')&&!C.matches(rec,'zeynep'),'Listede arama öğrenci ve ders adına bakmalı.');
assert(!/[\\/:*?"<>|]/.test(C.fileName(rec)),'Dosya adında geçersiz karakter olmamalı.');

/* ── çıktı modeli ve Word ── */
const model=P.model(C.normalize(rec),{okulAdi:'Deneme Okulu'});
assert.strictEqual(model.baslik,'BİREYSELLEŞTİRİLMİŞ EĞİTİM PROGRAMI (BEP)');
eq(model.bloklar.map(b=>b.tur),['kv','metin','amac','metin','imza'],'Belge bölümleri sırayla gelmeli.');
const html=P.html(model);
assert(html.includes('Ali Yılmaz')&&html.includes('MAT.3.1.1')&&html.includes('Akran Destekli Öğretim'),'HTML çıktısı öğrenci, kazanım ve yöntemi içermeli.');
assert(!/style=/.test(html),'Çıktı satır içi stil taşımamalı (stiller tasarım sistemi dosyasında).');
const evil=C.normalize({...rec,ogrenci:{...rec.ogrenci,adSoyad:'<script>alert(1)</script>'}});
assert(!P.html(P.model(evil,{})).includes('<script>'),'HTML çıktısında kaçış yapılmalı.');
const xml=P.belgeXml(model);
const stack=[];
for(const m of xml.replace(/<\?xml[^>]*\?>/,'').matchAll(/<(\/?)([\w:]+)([^>]*?)(\/?)>/g)){
  const[,close,name,,self]=m;
  if(self)continue;
  if(close){assert.strictEqual(stack.pop(),name,'Word XML etiketleri dengeli olmalı: '+name)}else stack.push(name);
}
assert.strictEqual(stack.length,0,'Word XML’inde kapanmamış etiket kalmamalı.');
assert(xml.includes('w:orient="landscape"')&&xml.includes('Ali Yılmaz'));
assert(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(P.belgeXml(P.model(C.normalize({...rec,performans:{...rec.performans,guclu:'a\u0001b'}}),{}))),'Word XML’ine geçersiz denetim karakteri girmemeli.');

/* ── bağlantı noktaları ── */
const bepSrc=fs.readFileSync('js/modules/bep.js','utf8');
assert(!/localStorage|sessionStorage|indexedDB/.test(bepSrc+fs.readFileSync('js/modules/bep-core.js','utf8')+fs.readFileSync('js/modules/bep-print.js','utf8')),'BEP modülleri tarayıcı depolamasına doğrudan yazmamalı (DeviceData kullanılır).');
assert(/COL\.bepDosyalari/.test(bepSrc)&&!/COL\.bepPlani/.test(bepSrc),'BEP dosyaları kendi koleksiyonunda tutulmalı; teslim takibi (bepPlani) ile karışmamalı.');
assert(/where\('sahipUid','==',u\.uid\)/.test(bepSrc),'Öğretmen yalnız kendi dosyalarını eşitlemeli.');
assert(/bepDosyalari:'oy_bepDosyalari'/.test(fs.readFileSync('js/firebase-init.js','utf8')),'COL içinde bepDosyalari tanımlı olmalı.');
const rules=fs.readFileSync('firestore.rules','utf8');
const block=rules.slice(rules.indexOf('match /oy_bepDosyalari/{id}'));
const ruleBody=block.slice(0,block.indexOf('\n    }')+6);
assert(/resource\.data\.sahipUid == request\.auth\.uid/.test(ruleBody)&&/adminMi\(\)/.test(ruleBody),'oy_bepDosyalari kuralı sahibine ve yöneticiye açık olmalı.');
assert(!/allow read: if girisYapmis\(\);/.test(ruleBody),'BEP dosyaları (öğrenci verisi) herkese okunur olmamalı.');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
assert(/name==='bep-hazirla'/.test(shell)&&/js\/modules\/bep\.js/.test(shell),'Kabukta bep-hazirla yolu bulunmalı.');
assert(!/BepModule/.test(shell.replace(/name==='bep-hazirla'[\s\S]*?return true;\s*}/,'')),'form-bep (plan teslim takibi) artık BEP modülüne yönlendirilmemeli.');
const nav=fs.readFileSync('js/core/app-nav.js','utf8');
assert(/\['bep-hazirla','BEP Hazırla'/.test(nav)&&/\['form-bep','Yıllık ve BEP Plan Takibi'/.test(nav),'Menüde BEP Hazırla ve plan takibi ayrı sayfalar olmalı.');
const sw=fs.readFileSync('service-worker.js','utf8');
['bep.js','bep-core.js','bep-print.js'].forEach(f=>assert(sw.includes('./js/modules/'+f),`${f} çevrimdışı önbellekte olmalı.`));

console.log('BEP hazırlama testleri geçti.');
