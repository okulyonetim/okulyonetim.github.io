const assert=require('assert'),fs=require('fs'),vm=require('vm'),zip=require('./helpers/zip');

const ctx={};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/modules/yillik-plan-core.js','utf8'),ctx);
const C=ctx.YillikPlanCore,J=x=>JSON.parse(JSON.stringify(x));
const docx=zip.oku(fs.readFileSync('tests/fixtures/5-sinif-sosyal-bilgiler-yillik-plan-2026-2027.docx'));
const xml=docx['word/document.xml'].toString('utf8');

/* MEB Word: başlıktan ders/sınıf/yıl, 41 hafta satırı, 38 ders haftası */
const p=C.docxAyristir(xml);
assert.strictEqual(p.dersAdi,'Sosyal Bilgiler');assert.strictEqual(p.seviye,5);assert.strictEqual(p.egitimOgretimYili,'2026-2027');assert.strictEqual(p.grup,'zorunlu');
assert.strictEqual(p.satirlar.length,41);assert.strictEqual(C.dersHaftasi(p),38);
assert.strictEqual(p.yilSonu,'2026/2027 Eğitim-Öğretim Yılı Sonu');assert.strictEqual(p.dipnotlar.length,2);
assert.deepStrictEqual(J(p.basliklar.map(b=>b.anahtar)),['unite_tema','icerik_cercevesi','ogrenme_ciktilari','surec_becerileri','olcme_degerlendirme','sosyal_duygusal','degerler','okuryazarlik','belirli_gunler']);
assert.strictEqual(p.basliklar[0].grup,'TEMA/İÇERİK ÇERÇEVESİ');

/* Tarihler ISO, sıralı ve eğitim yılına sığar */
assert.strictEqual(p.satirlar[0].baslangic,'2026-09-14');assert.strictEqual(p.satirlar[0].bitis,'2026-09-20');assert.strictEqual(p.satirlar[40].bitis,'2027-06-27');
p.satirlar.forEach((r,i)=>{assert(/^\d{4}-\d{2}-\d{2}$/.test(r.baslangic)&&r.baslangic<=r.bitis,`satır ${i+1} tarihi`);if(i)assert(r.baslangic>p.satirlar[i-1].baslangic,`satır ${i+1} sıralı olmalı`)});

/* Tatil/özel satırlar tek hücreli; numara kuralı: yarıyıl tatili ve sosyal etkinlik "—" */
const ozel=p.satirlar.filter(r=>r.ozel);assert(ozel.length>=4,'Ara tatil, yarıyıl tatili ve sosyal etkinlik satırları özel olmalı.');
assert(ozel.some(r=>/ARA TAT/i.test(r.ozel.toLocaleUpperCase('tr'))));assert(ozel.some(r=>/YARIYIL/.test(r.ozel.toLocaleUpperCase('tr'))));assert(ozel.some(r=>/SOSYAL ETK/.test(r.ozel.toLocaleUpperCase('tr'))));
ozel.forEach(r=>assert.deepStrictEqual(Object.keys(r.degerler).filter(k=>k!=='belirli_gunler'),[],'Özel satırda yalnız belirli gün hücresi dolu olabilir.'));
assert.strictEqual(ozel.find(r=>/RAMAZAN/.test(r.ozel)).degerler.belirli_gunler.includes('12 Mart'),true,'Tatil satırında belirli gün korunmalı.');
p.satirlar.filter(r=>/yariyil|sosyal etkinlik/.test(C.norm(r.ozel))).forEach(r=>{assert.strictEqual(r.hafta,'—');assert.strictEqual(r.no,0)});
const numarali=p.satirlar.filter(r=>r.no>0);assert.deepStrictEqual(J(numarali.map(r=>r.no)),Array.from({length:38},(_,i)=>i+1),'Numaralar 1…38 kesintisiz olmalı.');assert.strictEqual(numarali[0].hafta,'1. hafta');

/* Dikey birleşik hücreler değeri devralır ve birlesik'te işaretlenir */
const birlesik=p.satirlar.filter(r=>r.birlesik.length);assert(birlesik.length>0,'vMerge devam hücreleri bulunmalı.');
assert(birlesik.some(r=>r.birlesik.some(k=>r.degerler[k])),'Dolu birleşik hücre alttaki satırlara değerini taşımalı.');
birlesik.forEach((r,i)=>r.birlesik.forEach(k=>{const j=p.satirlar.indexOf(r);if(r.degerler[k])assert.strictEqual(r.degerler[k],p.satirlar[j-1].degerler[k],'Birleşik hücre üstteki değerin aynısı olmalı: '+k)}));

/* Bayram başlığı hücrelerden ayrılır, ünite listesine karışmaz */
const kurban=p.satirlar.find(r=>/KURBAN/.test(r.bayram));assert(kurban,'Kurban Bayramı satırında bayram başlığı olmalı.');assert(/19 MAYIS/.test(kurban.bayram));
assert(!JSON.stringify(kurban.degerler).includes('KURBAN'),'Bayram başlığı hücre metninde kalmamalı.');assert(/Ekonomik Faaliyetler/.test(kurban.degerler.icerik_cercevesi));
assert.strictEqual(kurban.degerler.belirli_gunler.includes('19 Mayıs'),true);

/* Ünite/tema listesi: 6 tema, sınav haftası ve okul temelli planlama ünite sayılmaz, geçiş haftası ayrı tema olmaz */
assert.deepStrictEqual(J(C.uniteListesi(p.satirlar,'unite_tema')),['BİRLİKTE YAŞAMAK','EVİMİZ DÜNYA','ORTAK MİRASIMIZ','YAŞAYAN DEMOKRASİMİZ','HAYATIMIZDAKİ EKONOMİ','TEKNOLOJİ VE SOSYAL BİLİMLER']);
assert.deepStrictEqual(J(C.uniteAdlari('SINAV HAFTASI  ORTAK MİRASIMIZ')),['ORTAK MİRASIMIZ']);
assert.deepStrictEqual(J(C.uniteAdlari('OKUL TEMELLİ PLANLAMA*  YAŞAYAN DEMOKRASİMİZ')),['YAŞAYAN DEMOKRASİMİZ']);
assert.deepStrictEqual(J(C.uniteAdlari('Sınav Haftası 1-11 Haziran')),[]);

/* Tarih ayrıştırma: ay aşan aralık, yıl dönümü, bozuk girdi */
assert.deepStrictEqual(J(C.tarihAraligi('14-20 Eylül','2026-2027')),{baslangic:'2026-09-14',bitis:'2026-09-20'});
assert.deepStrictEqual(J(C.tarihAraligi('28 Aralık-3 Ocak','2026-2027')),{baslangic:'2026-12-28',bitis:'2027-01-03'});
assert.deepStrictEqual(J(C.tarihAraligi('29 Haziran-5 Temmuz','2026-2027')),{baslangic:'2027-06-29',bitis:'2027-07-05'});
assert.strictEqual(C.tarihAraligi('bilinmez','2026-2027'),null);

/* Bu hafta: aralıktaysa o satır, tatildeyse sıradaki, yıl sonundan sonra ilk satır */
assert.strictEqual(C.suAnkiHafta(p,new Date(2026,9,14)),p.satirlar.findIndex(r=>r.baslangic<='2026-10-14'&&r.bitis>='2026-10-14'));
assert.strictEqual(C.suAnkiHafta(p,new Date(2026,8,1)),0);assert.strictEqual(C.suAnkiHafta({satirlar:[]},new Date()),0);

/* Eski kayıt (ay+hafta metni) yedek çözümleme ile okunur */
const eski={egitimOgretimYili:'2026-2027',satirlar:[{ay:'EYLÜL',hafta:'1.HAFTA(14-20)'}]};
const ar=C.satirAraligi(eski.satirlar[0],eski.egitimOgretimYili);assert(ar&&ar.start.getMonth()===8&&ar.start.getDate()===14&&ar.end.getDate()===20,'Eski kayıt satırı aralığa çevrilmeli.');

/* Belirli gün eşleme: satır aralığına değen günler */
const w=p.satirlar.find(r=>r.baslangic<='2026-10-29'&&r.bitis>='2026-10-29');
assert.deepStrictEqual(J(C.haftaGunleri(w,'2026-2027',[{ad:'Cumhuriyet Bayramı',tarihBaslangic:'2026-10-29'},{ad:'Başka',tarihBaslangic:'2027-02-01'}])),['Cumhuriyet Bayramı']);

/* Kayda çevirme: başlık anahtarları havuz kimliklerine döner; yeni alanlar korunur */
const id={};p.basliklar.forEach((b,i)=>id[b.anahtar]='h'+i);
const kayit=C.kayitHazirla(p,id);
assert.deepStrictEqual(J(kayit.sutunlar),J(p.basliklar).map((_,i)=>'h'+i));assert.strictEqual(kayit.baslikGruplari.h0,'TEMA/İÇERİK ÇERÇEVESİ');
assert.strictEqual(kayit.satirlar.length,41);assert.strictEqual(kayit.satirlar[0].degerler.h0,p.satirlar[0].degerler.unite_tema);assert.strictEqual(kayit.satirlar[0].ay,'EYLÜL');
assert(kayit.satirlar.some(r=>r.bayram),'bayram alanı kayda taşınmalı.');assert(kayit.satirlar.some(r=>r.birlesik.includes('h6')));assert.strictEqual(kayit.kaynak,'word');
assert.strictEqual(C.uniteler(kayit,[{id:'h0',ad:'Ünite / Tema'}]).length,6,'Havuz başlığı üzerinden ünite listesi çıkmalı.');

/* Ders eşleme anahtarı ve sınıf çıkarımı */
assert.strictEqual(C.dersAnahtari('Sosyal Bilgiler Dersi'),C.dersAnahtari('sosyal bilgiler'));assert.strictEqual(C.sinifSayisi('5. Sınıf'),5);assert.strictEqual(C.sinifSayisi('Anasınıfı'),null);

/* Başlık takma adları: Excel ve Word içe aktarıcıları aynı kuralı paylaşır */
[['Öğrenme Çıktıları','ogrenme_ciktilari'],['Ölçme ve Değerlendirme','olcme_degerlendirme'],['Belirli Gün ve Haftalar','belirli_gunler'],['Ünite/Tema','unite_tema'],['Değerler','degerler']].forEach(([ad,k])=>assert.strictEqual(C.baslikBilgisi(ad).key,k,ad+' → '+k));
console.log('yillik-plan-v2 çekirdek testleri geçti');
