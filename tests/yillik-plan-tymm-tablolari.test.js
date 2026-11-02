const assert=require('assert'),fs=require('fs'),vm=require('vm'),zip=require('./helpers/zip');

/* TYMM (Maarif) planı, tema başına "tema bilgi tablosu" + "Tarih | Hafta | Saat | Tema | …" hafta tablosu: tarih sütunu hafta sütunundan önce, tatiller tam genişlikte ayrı satır,
 * ders adı başlıktan (sınıf yazılmamış), sınıf dosya adından, başlıktaki yıl ayrı bir satırdan okunur. */
const ctx={};ctx.window=ctx;vm.createContext(ctx);['yillik-plan-core','yillik-plan-word'].forEach(f=>vm.runInContext(fs.readFileSync(`js/modules/${f}.js`,'utf8'),ctx));
const C=ctx.YillikPlanCore,Wd=ctx.YillikPlanWord,J=x=>JSON.parse(JSON.stringify(x));
const DOSYA='8-sinif-gorgu-kurallari-ve-nezaket-i-maarif-m-2-saat-yillik-plan-2026-2027.docx';
const paket=zip.oku(fs.readFileSync(`tests/fixtures/${DOSYA}`)),xml=paket['word/document.xml'].toString('utf8'),ust=Object.keys(paket).filter(a=>/^word\/header\d*\.xml$/.test(a)).map(a=>paket[a].toString('utf8'));
const p=C.docxAyristir(xml,{ustBilgiXml:ust,dosyaAdi:DOSYA});

/* Başlık: ders adı "(2 SAAT)" ve "DERSİ" olmadan; yıl ayrı satırdan; sınıf başlıkta yok → dosya adından */
assert.strictEqual(p.dersAdi,'Görgü Kuralları ve Nezaket I');assert.strictEqual(p.seviye,8);assert.strictEqual(p.egitimOgretimYili,'2026-2027');
assert.strictEqual(C.docxAyristir(xml,{ustBilgiXml:ust}).seviye,0,'sınıf yalnız dosya adından gelir');
assert.strictEqual(C.docxAyristir(xml,{ustBilgiXml:ust,dosyaAdi:DOSYA,seviye:7}).seviye,7,'açık seçenek önceliklidir');
assert.strictEqual(C.baslikBilgi('2026-2027 EĞİTİM-ÖĞRETİM YILI KORUK ORTAOKULU GÖRGÜ KURALLARI VE NEZAKET I (2 SAAT) YILLIK PLANI').dersAdi,'Görgü Kuralları ve Nezaket I','üstbilgi biçimi (okul adıyla)');
assert.strictEqual(C.baslikBilgi('2026-2027 EĞİTİM ÖĞRETİM YILI KORUK ORTAOKULU 7 . SINIF İNGİLİZCE YILLIK PLANI').dersAdi,'İngilizce');

/* 36 ders haftası + 3 tatil satırı + sosyal etkinlik; numaralar Word'deki hafta numaralarıyla aynı, tatiller hafta sayılmaz */
assert.strictEqual(p.satirlar.length,40);assert.strictEqual(C.dersHaftasi(p),36);
const haftalar=p.satirlar.filter(r=>r.no>0);assert.deepStrictEqual(J(haftalar.map(r=>r.no)),Array.from({length:36},(_,i)=>i+1));haftalar.forEach(r=>assert.strictEqual(r.no,r.kaynakNo));
const tatiller=p.satirlar.filter(r=>/tatil/i.test(r.ozel));assert.deepStrictEqual(J(tatiller.map(r=>[r.ozel,r.baslangic,r.bitis,r.no,r.hafta])),[
 ['1. Ara Tatil (16-20 Kasım)','2026-11-16','2026-11-20',0,'—'],['Şubat Tatili (25 Ocak-05 Şubat)','2027-01-25','2027-02-05',0,'—'],['2. Ara Tatil (08-12 Mart)','2027-03-08','2027-03-12',0,'—']]);
const sira=p.satirlar.map(r=>r.ozel&&/tatil/i.test(r.ozel)?'T':r.no);assert.strictEqual(sira[8],9);assert.strictEqual(sira[9],'T');assert.strictEqual(sira[10],10,'tatil satırı iki haftanın arasında');
assert.deepStrictEqual(J(C.numaralandir(J(p.satirlar))),36);const yeniden=J(p.satirlar);C.numaralandir(yeniden);assert.deepStrictEqual(yeniden.map(r=>r.no),J(p.satirlar.map(r=>r.no)),'yeniden numaralama tatil satırlarını hafta saymaz');
const sonuncu=p.satirlar[39];assert.strictEqual(sonuncu.ozel,'*Sosyal Etkinlik Haftası');assert.strictEqual(sonuncu.no,0);assert.strictEqual(sonuncu.bitis,'2027-06-25');
assert.strictEqual(p.satirlar.find(r=>r.no===18).ozel,'*Okul Temelli Planlama');assert.strictEqual(p.satirlar.find(r=>r.no===36).ozel,'*Okul Temelli Planlama');

/* Tarih ayrı (ilk) sütunda: yıl yarıyıla göre */
const h1=p.satirlar[0];assert.strictEqual(h1.baslangic,'2026-09-14');assert.strictEqual(h1.bitis,'2026-09-18');assert.strictEqual(h1.tarih,'14-18 Eylül');assert.strictEqual(h1.saat,'2 Saat');
const hf=n=>p.satirlar.find(r=>r.no===n);assert.strictEqual(hf(15).bitis,'2027-01-01');assert.strictEqual(hf(19).baslangic,'2027-02-08');assert.strictEqual(hf(36).bitis,'2027-06-18');
p.satirlar.forEach((r,i)=>{assert(/^\d{4}-\d{2}-\d{2}$/.test(r.baslangic)&&r.baslangic<=r.bitis,`satır ${i+1} tarihi`);if(i)assert(r.baslangic>p.satirlar[i-1].baslangic,`satır ${i+1} sıralı olmalı`)});

/* Sütunlar: hafta tablosunun 9 sütunu + temanın bilgi tablosundan hafta tablosunda olmayan 6 blok */
assert.deepStrictEqual(J(p.basliklar.map(b=>b.anahtar)),['unite_tema','icerik_cercevesi','ogrenme_ciktilari','surec_bilesenleri','sosyal_duygusal','degerler','okuryazarlik','olcme_degerlendirme','belirli_gunler','unite_aciklamasi','temel_kabuller','anahtar_kavramlar','kopru_kurma','zenginlestirme','destekleme']);
assert.strictEqual(p.haftaBasligi,'HAFTA');assert.strictEqual(p.saatBasligi,'SAAT');
assert(/^GKN\.1\.1\.1\./.test(h1.degerler.ogrenme_ciktilari));assert(/^SDB1\.3\./.test(h1.degerler.sosyal_duygusal),'"Öğrenme Becerileri" sosyal-duygusal sütunudur');assert.strictEqual(h1.degerler.belirli_gunler,'Gaziler Günü');

/* Tema bilgisi temanın her haftasına dağılır (ilk hafta kaynak, sonrakiler birleşik); hafta tablosundaki Ölçme sütunu tema tablosundaki "Öğrenme Kanıtları" ile ezilmez */
assert(/^Bu temada öğrencilerin günlük yaşamda/.test(h1.degerler.unite_aciklamasi));assert.strictEqual(h1.degerler.anahtar_kavramlar,'Birlikte yaşama kültürü, görgü kuralları, nezaket');
const t1=p.satirlar.filter(r=>r.degerler.unite_tema==='1. TEMA: GÖRGÜ KURALLARI VE NEZAKETİN GÜCÜ');assert.strictEqual(t1.length,10);
assert.deepStrictEqual(J(['unite_aciklamasi','temel_kabuller','anahtar_kavramlar','kopru_kurma','zenginlestirme','destekleme'].filter(k=>h1.birlesik.includes(k))),[]);
t1.slice(1).forEach(r=>['unite_aciklamasi','temel_kabuller','anahtar_kavramlar','kopru_kurma','zenginlestirme','destekleme'].forEach(k=>{assert(r.birlesik.includes(k),k);assert.strictEqual(r.degerler[k],h1.degerler[k])}));
assert.notStrictEqual(hf(11).degerler.unite_aciklamasi,h1.degerler.unite_aciklamasi);assert(!hf(11).birlesik.includes('unite_aciklamasi'),'yeni temanın ilk haftası kaynak hücredir');
assert(/^Bu temada yer alan öğrenme çıktıları; açık uçlu/.test(h1.degerler.olcme_degerlendirme));
assert.deepStrictEqual(J(Object.keys(hf(18).degerler).filter(k=>/unite_aciklamasi|zenginlestirme/.test(k))),[],'okul temelli planlama / sosyal etkinlik satırları tema bilgisi taşımaz');
const unite=J(C.uniteListesi(p.satirlar,'unite_tema'));assert.strictEqual(unite.length,4);assert.strictEqual(unite[0],'1. TEMA: GÖRGÜ KURALLARI VE NEZAKETİN GÜCÜ');assert(/^4\. TEMA/.test(unite[3]));

/* Kayıt ve Word çıktısı */
const kayit=C.kayitHazirla(p,Object.fromEntries(p.basliklar.map(b=>[b.anahtar,'id_'+b.anahtar])));
assert.strictEqual(kayit.sutunlar.length,15);assert.strictEqual(kayit.satirlar.length,40);assert(JSON.stringify(kayit).length<900000);assert.strictEqual(kayit.satirlar[9].no,0);assert.strictEqual(kayit.satirlar[9].hafta,'—');
assert.strictEqual(C.planAnahtari(kayit),'8|'+C.dersAnahtari('Görgü Kuralları ve Nezaket I')+'|2026-2027');
const havuz=J(p.basliklar).map(b=>({id:'id_'+b.anahtar,ad:b.ad})),sablonXml=zip.oku(fs.readFileSync('assets/yillik-plan/sablon.docx'))['word/document.xml'].toString('utf8');
const q=C.docxAyristir(Wd.belgeXml(sablonXml,kayit,havuz,{okul:'Koruk Ortaokulu',ogretmen:'Ali Veli',zumre:'',mudur:'',tarih:'2026-11-02'}));
/* Word şablonu tatil dahil her satırı sırayla numaralar (mevcut dışa aktarma davranışı); geri okununca satır sayısı, ders ve tarihler korunur */
assert.strictEqual(q.satirlar.length,40);assert.strictEqual(q.dersAdi,'Görgü Kuralları ve Nezaket I');assert.strictEqual(q.seviye,8);assert.deepStrictEqual(J(q.satirlar.filter(r=>/tatil/i.test(r.ozel)).map(r=>r.baslangic)),['2026-11-16','2027-01-25','2027-03-08']);

console.log('Yıllık plan — TYMM tema tablolu (Görgü Kuralları ve Nezaket) içe aktarma testi başarılı.');
