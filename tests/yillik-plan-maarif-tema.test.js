const assert=require('assert'),fs=require('fs'),vm=require('vm'),zip=require('./helpers/zip');

/* Maarif temalı İngilizce planı (tema bilgi tabloları + "Week N" hafta tabloları) Word'den okunur; sonuç tek tablolu MEB planıyla aynı biçimdedir. */
const ctx={};ctx.window=ctx;vm.createContext(ctx);['yillik-plan-core','yillik-plan-word'].forEach(f=>vm.runInContext(fs.readFileSync(`js/modules/${f}.js`,'utf8'),ctx));
const C=ctx.YillikPlanCore,Wd=ctx.YillikPlanWord,J=x=>JSON.parse(JSON.stringify(x));
const xml=zip.oku(fs.readFileSync('tests/fixtures/5-sinif-ingilizce-maarif-yillik-plan-2026-2027.docx'))['word/document.xml'].toString('utf8');
const p=C.docxAyristir(xml);

/* Başlıktan ders/sınıf/yıl ("5. SINIFLAR İNGİLİZCE DERSİ YILLIK PLANI") */
assert.strictEqual(p.dersAdi,'İngilizce');assert.strictEqual(p.seviye,5);assert.strictEqual(p.egitimOgretimYili,'2026-2027');assert.strictEqual(p.grup,'zorunlu');
assert.strictEqual(C.dersAnahtari(p.dersAdi),'ingilizce');

/* 37 satır: oryantasyon + 35 ders haftası + sosyal etkinlik; numaralar Word'deki hafta numaralarıyla aynı */
assert.strictEqual(p.satirlar.length,37);assert.strictEqual(C.dersHaftasi(p),36);
const numarali=p.satirlar.filter(r=>r.no>0);assert.deepStrictEqual(J(numarali.map(r=>r.no)),Array.from({length:36},(_,i)=>i+1));
p.satirlar.forEach((r,i)=>assert.strictEqual(r.no,i<36?r.kaynakNo:0,`satır ${i+1}: numara Word'deki hafta numarasıyla aynı olmalı`));
assert.strictEqual(p.satirlar[0].ozel,'ORIENTATION');assert.strictEqual(p.satirlar[0].baslangic,'2026-09-14');assert.strictEqual(p.satirlar[0].bitis,'2026-09-18');assert.strictEqual(p.satirlar[0].tarih,'14-18 Eylül');
const son=p.satirlar[36];assert.strictEqual(son.ozel,'SOSYAL ETKİNLİK');assert.strictEqual(son.no,0);assert.strictEqual(son.hafta,'—');assert.deepStrictEqual(Object.keys(son.degerler),[]);

/* Tarihler sıralı ISO; Word'de boş bırakılan 25-28. haftalar bir önceki haftanın ardılı olarak çıkarılır (tema başlığıyla uyumlu) */
p.satirlar.forEach((r,i)=>{assert(/^\d{4}-\d{2}-\d{2}$/.test(r.baslangic)&&r.baslangic<=r.bitis,`satır ${i+1} tarihi`);if(i)assert(r.baslangic>p.satirlar[i-1].baslangic,`satır ${i+1} sıralı olmalı`)});
const hafta=n=>p.satirlar.find(r=>r.no===n);
assert.strictEqual(hafta(24).bitis,'2027-03-26');assert.strictEqual(hafta(25).baslangic,'2027-03-29');assert.strictEqual(hafta(28).bitis,'2027-04-23');
assert.strictEqual(hafta(19).baslangic,'2027-02-08','Yarıyıl tatilinden sonraki hafta yazılı tarihini korumalı.');
assert.strictEqual(hafta(15).bitis,'2027-01-01');

/* Saat: "3" → "3 saat"; "SCHOOL-BASED PLANNING" okul temelli planlama */
assert.strictEqual(hafta(4).saat,'3 saat');assert.strictEqual(hafta(9).saat,'Okul temelli planlama');assert.strictEqual(hafta(27).saat,'Okul temelli planlama');

/* Sütunlar: tema bilgi blokları MEB başlık havuzuna eşlenir */
assert.deepStrictEqual(J(p.basliklar.map(b=>b.anahtar)),['unite_tema','icerik_cercevesi','ogrenme_ciktilari','kelime_hazinesi','islevler_yararli_dil','dilbilgisi_yapilari','sosyal_dil','ses_bilgisi','olcme_degerlendirme','farklilastirma','sosyal_duygusal','degerler','okuryazarlik','yerel_kulturel']);
assert.deepStrictEqual(J(C.uniteListesi(p.satirlar,'unite_tema')),['REVISION 1-2','THEME 1: SCHOOL LIFE','THEME 2: CLASSROOM LIFE','THEME 3: PERSONAL LIFE','THEME 4: FAMILY LIFE','THEME 5: LIFE IN THE NEIGHBOURHOOD & CITY','THEME 6: LIFE IN THE WORLD','THEME 7: LIFE IN NATURE','THEME 8: LIFE IN THE UNIVERSE & FUTURE']);

/* Tema bilgisi temanın her haftasına dağılır; ilk hafta birleşik hücrenin başı, sonrakiler "birlesik" olarak işaretlenip aynı değeri taşır */
const t1=p.satirlar.filter(r=>r.degerler.unite_tema==='THEME 1: SCHOOL LIFE');assert.deepStrictEqual(J(t1.map(r=>r.no)),[4,5,6,7]);
const d=t1[0].degerler;
assert(/^Vocabulary for people, places and rules at school/.test(d.kelime_hazinesi),'etiket satırı atılmalı, içerik kalmalı');
assert(/^SELS1\.1\./.test(d.sosyal_duygusal));assert(/^V1\. Justice/.test(d.degerler));assert(/^LS1\. Information Literacy/.test(d.okuryazarlik));
assert(/^PERFORMANCE ASSIGNMENT: Students will create a colourful poster/.test(d.olcme_degerlendirme));assert(/^Expansion/.test(d.farklilastirma));
assert(/^In this theme, specific examples/.test(d.yerel_kulturel));assert(/Intonation of positive statements/.test(d.ses_bilgisi));assert(/Let’s get started!/.test(d.sosyal_dil));
assert(/^Sub-themes: People, places and rules at school/.test(d.icerik_cercevesi));
assert(/ENG\.5\.1\.L1\./.test(d.ogrenme_ciktilari)&&/ENG\.5\.1\.G1\./.test(d.ogrenme_ciktilari)&&/ENG\.5\.1\.W1\./.test(d.ogrenme_ciktilari),'dinleme, dilbilgisi ve yazma çıktıları birlikte');
assert.deepStrictEqual(J(t1[0].birlesik),[]);
t1.slice(1).forEach(r=>{assert(r.birlesik.includes('unite_tema')&&r.birlesik.includes('ogrenme_ciktilari')&&r.birlesik.includes('kelime_hazinesi'));Object.keys(d).forEach(k=>assert.strictEqual(r.degerler[k],d[k],'birleşik hücre üstteki değerin aynısı: '+k))});

/* Tekrar (REVISION) teması: başlık-gövde çifti ve önceki konuların blokları */
const r2=hafta(2).degerler;assert.strictEqual(r2.unite_tema,'REVISION 1-2');
assert(/School Life Diary/.test(r2.olcme_degerlendirme),'"ASSESSMENT AND EVALUATION" başlığının altındaki gövde ölçmeye gitmeli');assert(/^Expansion/.test(r2.farklilastirma));
assert(/Greetings and introductions at school/.test(r2.icerik_cercevesi)&&/THEME 4/.test(r2.icerik_cercevesi),'etiketsiz bloklar içerik çerçevesine eklenmeli');

/* Etiketi aynı satırda yazılmış (iki nokta üst üste yok) kelime bloğu da yakalanır */
assert(/Vocabulary/.test(hafta(21).degerler.kelime_hazinesi||''),'THEME 5 kelime bilgisi bulunmalı');

/* Kayıt: başlık havuzu kimliklerine çevrilir; tek belge Firestore sınırının altında kalır */
const kayit=C.kayitHazirla(p,Object.fromEntries(p.basliklar.map(b=>[b.anahtar,'id_'+b.anahtar])));
assert.strictEqual(kayit.sutunlar.length,14);assert.strictEqual(kayit.satirlar.length,37);assert(JSON.stringify(kayit).length<900000,'plan tek belge sınırının altında olmalı');
assert.strictEqual(C.planAnahtari(kayit),'5|ingilizce|2026-2027');

/* Word çıktısı: plan MEB şablonuna basılır ve aynı ayrıştırıcıyla (tek tablolu biçim) geri okunduğunda eşit çıkar */
const havuz=J(p.basliklar).map((b,i)=>({id:'id_'+b.anahtar,ad:b.ad})),sablonXml=zip.oku(fs.readFileSync('assets/yillik-plan/sablon.docx'))['word/document.xml'].toString('utf8');
const dolu=Wd.belgeXml(sablonXml,kayit,havuz,{okul:'Koruk Ortaokulu',ogretmen:'Ali Veli',zumre:'',mudur:'',tarih:'2026-11-02'}),q=C.docxAyristir(dolu);
assert.strictEqual(q.dersAdi,'İngilizce');assert.strictEqual(q.seviye,5);assert.strictEqual(q.satirlar.length,37);assert.strictEqual(C.dersHaftasi(q),36);
/* Çıktı örnek şablonun 9 sütunluk düzenindedir; şablonda karşılığı olmayan sütunlar (kelime, dil bilgisi…) adıyla "Süreç Becerileri" yuvasına eklenir, içerik kaybolmaz */
const yuva=q.satirlar[3].degerler.surec_becerileri||'';
assert(/Hedef Kelime Bilgisi/.test(yuva)&&/Vocabulary for people, places and rules at school/.test(yuva)&&/Hedef Dil Bilgisi Yapıları/.test(yuva),'şablonda yeri olmayan sütunlar çıktıda korunmalı');
assert.strictEqual(q.satirlar[26].baslangic,p.satirlar[26].baslangic);assert.strictEqual(q.satirlar[3].degerler.ogrenme_ciktilari,p.satirlar[3].degerler.ogrenme_ciktilari);

/* Bu hafta / satır görünümü yeni planda da çalışır */
assert.strictEqual(C.buHafta(kayit,new Date(2026,9,7)),3);   /* 7 Ekim 2026 → 4. hafta (indeks 3) */

console.log('Yıllık plan — Maarif temalı Word içe aktarma testi başarılı.');
