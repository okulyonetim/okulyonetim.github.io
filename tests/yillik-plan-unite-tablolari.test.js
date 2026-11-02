const assert=require('assert'),fs=require('fs'),vm=require('vm'),zip=require('./helpers/zip');

/* Ünite başına ayrı tablolu İngilizce planı (7./8. sınıf: Week | Date | Hours | Theme | Functions | Outcomes | Testing | Belirli gün): tüm tablolar okunur,
 * başlık sayfa üstbilgisinden gelir, ayrı Tarih sütunu ve yanlış adlı "Evaluation" (belirli gün) sütunu doğru eşlenir. */
const ctx={};ctx.window=ctx;vm.createContext(ctx);['yillik-plan-core','yillik-plan-word'].forEach(f=>vm.runInContext(fs.readFileSync(`js/modules/${f}.js`,'utf8'),ctx));
const C=ctx.YillikPlanCore,Wd=ctx.YillikPlanWord,J=x=>JSON.parse(JSON.stringify(x));
const oku=dosya=>{const p=zip.oku(fs.readFileSync(`tests/fixtures/${dosya}`)),ust=Object.keys(p).filter(a=>/^word\/header\d*\.xml$/.test(a)).map(a=>p[a].toString('utf8'));return{xml:p['word/document.xml'].toString('utf8'),ust}};
const UNITE_HAFTA=[4,4,4,4,4,4,3,3,3,4];
const PLANLAR=[
 {dosya:'7-sinif-ingilizce-yillik-plan-2026-2027.docx',sinif:7,ilkUnite:'1.Appearance And Personality',sonUnite:'10. Planets',sonCikti:'E7.10.L1.'},
 {dosya:'8-sinif-ingilizce-yillik-plan-2026-2027.docx',sinif:8,ilkUnite:'1.Friendship',sonUnite:'10.Natural Forces',sonCikti:'E8.10.L1.'}
];
for(const t of PLANLAR){
 const {xml,ust}=oku(t.dosya),p=C.docxAyristir(xml,{ustBilgiXml:ust});

 /* Başlık üstbilgide ("2026-2027 EĞİTİM ÖĞRETİM YILI … 7 . SINIF İNGİLİZCE YILLIK PLANI") */
 assert.strictEqual(p.dersAdi,'İngilizce',t.dosya);assert.strictEqual(p.seviye,t.sinif);assert.strictEqual(p.egitimOgretimYili,'2026-2027');assert.strictEqual(p.grup,'zorunlu');
 assert.strictEqual(C.dersAnahtari(p.dersAdi),'ingilizce');
 assert.strictEqual(C.docxAyristir(xml).seviye,0,'üstbilgi verilmezse başlık bilinmez (kullanıcı arayüzde seçer)');

 /* 10 üniteden 37 haftanın hepsi, Word'deki hafta numarasıyla */
 assert.strictEqual(p.satirlar.length,37,`${t.dosya}: tüm haftalar okunmalı`);assert.strictEqual(C.dersHaftasi(p),37);
 p.satirlar.forEach((r,i)=>{assert.strictEqual(r.no,i+1);assert.strictEqual(r.kaynakNo,i+1);assert.strictEqual(r.saat,'4 saat');assert.strictEqual(r.ozel,'')});
 const dk=p.satirlar.map(r=>r.baslangic);dk.forEach((b,i)=>{assert(/^\d{4}-\d{2}-\d{2}$/.test(b)&&b<=p.satirlar[i].bitis,`satır ${i+1} tarihi`);if(i)assert(b>dk[i-1],`satır ${i+1} sıralı olmalı`)});
 assert.strictEqual(p.satirlar[0].baslangic,'2026-09-14');assert.strictEqual(p.satirlar[0].tarih,'14 - 18 Eylül');
 assert.strictEqual(p.satirlar[14].bitis,'2027-01-01','Aralık sonu - Ocak başı hafta');assert.strictEqual(p.satirlar[18].baslangic,'2027-02-08','Yarıyıl tatilinden sonraki hafta');
 assert.strictEqual(p.satirlar[36].bitis,'2027-06-25');

 /* Sütunlar: tekrarsız, İngilizce başlıklar MEB havuz anahtarlarına; "Evaluation" yazılı belirli gün sütunu da belirli gün */
 assert.deepStrictEqual(J(p.basliklar.map(b=>b.anahtar)),['unite_tema','islevler_yararli_dil','ogrenme_ciktilari','olcme_degerlendirme','belirli_gunler'],t.dosya);
 assert.strictEqual(p.haftaBasligi,'WEEK');assert.strictEqual(p.saatBasligi,'HOURS');
 assert(/Gaziler Günü/.test(p.satirlar[0].degerler.belirli_gunler));assert(/^Listening/.test(p.satirlar[0].degerler.olcme_degerlendirme));

 /* Üniteler: her tablo bir ünite; ünite hücreleri birleşik (ilk hafta kaynak, sonrakiler "birlesik") */
 const unite=J(C.uniteListesi(p.satirlar,'unite_tema'));assert.strictEqual(unite.length,10);assert.strictEqual(unite[0],t.ilkUnite);assert.strictEqual(unite[9],t.sonUnite);
 const sayilar=unite.map(u=>p.satirlar.filter(r=>r.degerler.unite_tema===u).length);assert.deepStrictEqual(J(sayilar),UNITE_HAFTA);
 let hafta=0;UNITE_HAFTA.forEach(n=>{const grup=p.satirlar.slice(hafta,hafta+n);assert.deepStrictEqual(J(grup[0].birlesik),[],'ünitenin ilk haftası birleşik hücrenin başı');
  grup.slice(1).forEach(r=>{['unite_tema','islevler_yararli_dil','ogrenme_ciktilari','olcme_degerlendirme','belirli_gunler'].forEach(k=>{assert(r.birlesik.includes(k),k);assert.strictEqual(r.degerler[k],grup[0].degerler[k])})});hafta+=n});
 assert(p.satirlar.every((r,i)=>r.degerler.ogrenme_ciktilari&&r.degerler.islevler_yararli_dil),'hiçbir haftanın içeriği boş kalmamalı');

 /* 37. hafta iki satıra yayılmıştır; ikinci satır ayrı hafta sayılmaz, içerik tekrarlanmaz */
 assert(p.satirlar[36].degerler.ogrenme_ciktilari.startsWith(t.sonCikti));assert.strictEqual(p.satirlar[36].degerler.ogrenme_ciktilari,p.satirlar[35].degerler.ogrenme_ciktilari);

 /* Kayıt + Word çıktısı: aynı ayrıştırıcıyla geri okununca 37 hafta kalır */
 const kayit=C.kayitHazirla(p,Object.fromEntries(p.basliklar.map(b=>[b.anahtar,'id_'+b.anahtar])));
 assert.strictEqual(kayit.sutunlar.length,5);assert.strictEqual(kayit.satirlar.length,37);assert(JSON.stringify(kayit).length<900000);assert.strictEqual(C.planAnahtari(kayit),`${t.sinif}|ingilizce|2026-2027`);
 const havuz=J(p.basliklar).map(b=>({id:'id_'+b.anahtar,ad:b.ad})),sablonXml=zip.oku(fs.readFileSync('assets/yillik-plan/sablon.docx'))['word/document.xml'].toString('utf8');
 const q=C.docxAyristir(Wd.belgeXml(sablonXml,kayit,havuz,{okul:'Koruk Ortaokulu',ogretmen:'Ali Veli',zumre:'',mudur:'',tarih:'2026-11-02'}));
 assert.strictEqual(q.dersAdi,'İngilizce');assert.strictEqual(q.seviye,t.sinif);assert.strictEqual(q.satirlar.length,37);
 assert.strictEqual(q.satirlar[20].baslangic,p.satirlar[20].baslangic);assert.strictEqual(q.satirlar[20].degerler.ogrenme_ciktilari,p.satirlar[20].degerler.ogrenme_ciktilari);
}

/* Aynı başlığa düşen ikinci sütun veri kaybettirmez: "Ölçme" iki kez yazılmış, ikincisi gün adı değilse kendi adıyla ayrı sütun olur */
const tc=(m,ek='')=>`<w:tc><w:tcPr>${ek}</w:tcPr><w:p><w:r><w:t>${m}</w:t></w:r></w:p></w:tc>`,tr=(...h)=>`<w:tr>${h.join('')}</w:tr>`;
const mini=`<w:document><w:body><w:p><w:r><w:t>2026-2027 EĞİTİM ÖĞRETİM YILI 6. SINIF FEN BİLİMLERİ DERSİ YILLIK PLANI</w:t></w:r></w:p><w:tbl>${tr(tc('HAFTA'),tc('SAAT'),tc('Ölçme ve Değerlendirme'),tc('Evaluation'))}${tr(tc('1. HAFTA\n14-18 Eylül'),tc('3'),tc('Gözlem'),tc('Proje'))}${tr(tc('2. HAFTA\n21-25 Eylül'),tc('3'),tc('Test'),tc('Portfolyo'))}</w:tbl></w:body></w:document>`;
const m=C.docxAyristir(mini);
assert.strictEqual(m.dersAdi,'Fen Bilimleri');assert.strictEqual(m.seviye,6);assert.deepStrictEqual(J(m.basliklar.map(b=>b.anahtar)),['olcme_degerlendirme','evaluation']);
assert.strictEqual(m.satirlar[1].degerler.evaluation,'Portfolyo');assert.strictEqual(m.satirlar[1].degerler.olcme_degerlendirme,'Test');

console.log('Yıllık plan — ünite tablolu (7./8. sınıf İngilizce) içe aktarma testi başarılı.');
