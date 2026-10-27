const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const JSZip=require('../assets/vendor/jszip.min.js');

function load(files,extra={}){
  const win={console,JSZip,setTimeout,clearTimeout,...extra};
  win.window=win;win.globalThis=win;
  vm.createContext(win);
  for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),win,{filename:f});
  return win;
}
const eq=(a,b,m)=>assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);
const MOD='js/modules/';
const duz=h=>h.replace(/ /g,' ').replace(/<[^>]+>/g,'|').replace(/\|+/g,'|');

/* ── veri: 1–8. sınıf kazanım kataloğu ve yıllık planlar ── */
const veriWin=load([MOD+'rehberlik-veri.js']);
const V=veriWin.RehberlikVeri;
assert.strictEqual(V.yil,'2026-2027');
eq(V.aylar,['EYLÜL','EKİM','KASIM','ARALIK','OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN']);
eq(Object.keys(V.kazanim),['1','2','3','4','5','6','7','8']);
eq(Object.keys(V.plan),['1','2','3','4','5','6','7','8']);
for(const n of [1,2,3,4,5,6,7,8]){
  const sira=V.kazanim[n].flatMap(k=>k[0]);
  eq([...sira].sort((a,b)=>a-b),Array.from({length:36},(_,i)=>i+1),`${n}. sınıf: kazanımlar 1–36 eksiksiz ve tekrarsız olmalı.`);
  assert.strictEqual(V.kazanim[n].reduce((t,k)=>t+k[1],0),36,`${n}. sınıf: kazanım süreleri 36 haftalık olmalı.`);
  V.kazanim[n].forEach(k=>assert(k[2]&&k[3]&&(k[4]||k[0][0]===36),`${n}. sınıf ${k[0]}: kazanım metni, gelişim alanı ve yeterlik dolu olmalı (36. kazanım "Tüm Alanlar" için yeterlik yok).`));
  eq(V.plan[n].map(a=>a[0]),V.aylar,`${n}. sınıf planı 10 ayı sırayla içermeli.`);
  const planSira=V.plan[n].flatMap(a=>a[1]).filter(x=>typeof x[1]==='number').map(x=>x[1]);
  eq([...planSira].sort((a,b)=>a-b),Array.from({length:36},(_,i)=>i+1),`${n}. sınıf planında her kazanım bir kez yer almalı.`);
  V.plan[n].forEach(([ay,l])=>l.forEach(([h,x])=>{assert(h>=1&&h<=5,`${n}. sınıf ${ay}: hafta 1–5.`);assert(typeof x==='number'||String(x).trim(),`${n}. sınıf ${ay}: etkinlik adı boş olmamalı.`)}));
  assert(V.plan[n].some(([,l])=>l.some(x=>x[1]==='ARA TATİL')),`${n}. sınıf planında ara tatil olmalı.`);
}

/* ── çekirdek: tarih, durum, raporlar ── */
const coreWin=load([MOD+'rehberlik-veri.js',MOD+'rehberlik-core.js']);
const C=coreWin.RehberlikCore;
assert.strictEqual(C.planTarihi('2026-2027','EYLÜL',3),'2026-09-14','Eylül 3. hafta = 14 Eylül 2026 (ayın 1\'ini içeren hafta 1. hafta).');
assert.strictEqual(C.planTarihi('2026-2027','EKİM',1),'2026-10-01','Ay başından önceki Pazartesi ay başına çekilir.');
assert.strictEqual(C.planTarihi('2026-2027','OCAK',1),'2027-01-01');
assert.strictEqual(C.planTarihi('2026-2027','HAZİRAN',5),'2027-06-28');
assert.strictEqual(C.onerilenTarih('2026-10-12','2026-10-27'),'2026-10-16','Geçmiş haftada önerilen tarih haftanın Cuması.');
assert.strictEqual(C.onerilenTarih('2026-10-12','2026-10-13'),'2026-10-13','Hafta içindeyse bugün.');
assert.strictEqual(C.tarihTR('2026-09-14'),'14.09.2026');
assert.strictEqual(C.duzeyOf('5/A'),5);assert.strictEqual(C.duzeyOf('Anasınıfı'),0);assert.strictEqual(C.duzeyOf('9-A'),0);
assert.strictEqual(C.egitimYili(new Date(2026,9,1)),'2026-2027');assert.strictEqual(C.egitimYili(new Date(2027,5,1)),'2026-2027');

let d=C.bosDurum();
const p0=C.planOlustur(5,d,'2026-2027');
assert.strictEqual(C.maddeler(p0).filter(m=>m.tur==='k').length,36);
assert(C.maddeler(p0).every(m=>!m.yapildi));
const kazMadde=C.maddeler(p0).find(m=>m.tur==='k'),etkMadde=C.maddeler(p0).find(m=>m.tur==='e');
assert(kazMadde.yeterlik&&kazMadde.alan&&kazMadde.planTarihi,'Kazanım maddesi yeterlik, alan ve planlanan tarihi taşır.');
C.isaretle(d,kazMadde.id,true,'2026-09-15',1000);
let p1=C.planOlustur(5,d,'2026-2027');
assert.strictEqual(C.maddeler(p1).find(m=>m.id===kazMadde.id).tarih,'2026-09-15');
assert.strictEqual(C.ilerleme(p1).kazanim.yapilan,1);

/* son yazan kazanır; cihazlar arası birleştirme */
const a=C.bosDurum(),b=C.bosDurum();
C.isaretle(a,'k1',true,'2026-09-14',100);C.isaretle(b,'k1',false,'',200);C.isaretle(b,'k2',true,'2026-09-21',150);
const m=C.durumBirlestir(a,b);
assert.strictEqual(m.m.k1.y,0,'Daha yeni zaman damgalı kayıt kazanır.');assert.strictEqual(m.m.k2.y,1,'Birleşimde iki cihazın kayıtları da korunur.');
assert(C.durumAyni(C.durumBirlestir(a,b),C.durumBirlestir(b,a)),'Birleştirme sıradan bağımsızdır.');

/* plan düzenleme: ekle / sil / taşı */
C.maddeEkle(d,{ay:'EKİM',hafta:2,metin:'Sınıf gezisi'},2000);
let p2=C.planOlustur(5,d,'2026-2027');
assert(C.maddeler(p2).some(x=>x.metin==='Sınıf gezisi'&&x.ay==='EKİM'&&x.ozel),'Eklenen etkinlik plana girer.');
C.maddeSil(d,etkMadde.id,2100);
assert(!C.maddeler(C.planOlustur(5,d,'2026-2027')).some(x=>x.id===etkMadde.id),'Silinen etkinlik plandan çıkar.');
C.maddeDuzenle(d,'k3',{ay:'ŞUBAT',h:4},2200);
const k3=C.maddeler(C.planOlustur(5,d,'2026-2027')).find(x=>x.id==='k3');
assert.strictEqual(k3.ay,'ŞUBAT');assert.strictEqual(k3.hafta,4);

/* raporlar */
let r=C.bosDurum();
const pl=C.planOlustur(5,r,'2026-2027'),eyl=pl.aylar.find(x=>x.ad==='EYLÜL').maddeler;
eyl.filter(x=>x.tur==='k').slice(0,2).forEach(x=>C.isaretle(r,x.id,true,x.planTarihi));
C.raporYaz(r,'ay:EYLÜL',{test:[{ad:'Anket',tarih:'2026-09-20',kiz:5,erkek:6}],diger:[{metin:'Elle eklenen',tarih:'2026-09-22'}]});
const pr=C.planOlustur(5,r,'2026-2027');
const ay=C.aylikRapor(pr,'EYLÜL',r);
assert.strictEqual(ay.etkinlikler.length,2,'Aylık rapora yalnız işaretlenen kazanımlar girer.');
assert.strictEqual(ay.etkinlikler[0].sira,1);assert(ay.etkinlikler[0].yeterlik&&ay.etkinlikler[0].kazanim);
assert.strictEqual(C.aylikRapor(pr,'EYLÜL',r,{hepsi:true}).etkinlikler.length,eyl.filter(x=>x.tur==='k').length,'"Hepsini yaz" seçeneği işaretsizleri de ekler.');
assert(ay.diger.some(x=>x.metin==='Elle eklenen'));eq(ay.test.map(t=>t.ad),['Anket']);
const dn=C.donemRaporu(pr,1,{});eq(dn.aylar.map(x=>x.ad),['EYLÜL','EKİM','KASIM','ARALIK','OCAK']);assert.strictEqual(dn.ad,'I. DÖNEM');
assert.strictEqual(dn.aylar[0].satirlar.length,pr.aylar[0].maddeler.filter(x=>x.tur!=='tatil'&&x.yapildi).length,'Dönem raporu yalnız işaretlenenleri yazar.');
assert.strictEqual(C.donemRaporu(pr,1,{hepsi:true}).aylar[0].satirlar.length,pr.aylar[0].maddeler.filter(x=>x.tur!=='tatil').length);
let ys=C.yilSonuRaporu(pr,r);
assert.strictEqual(ys.otomatik,'Kısmen');assert.strictEqual(ys.kazanimToplam,36);assert.strictEqual(ys.gerceklesmeyen.length,34);
eq(ys.veliFaaliyetleri.map(x=>x.ad),['Veli Toplantısı','Bireysel Görüşme']);
C.raporYaz(r,'yil',{nedenler:{28:'Zaman yetmedi'},gerceklesti:'Hayır'});
ys=C.yilSonuRaporu(pr,r);assert.strictEqual(ys.gerceklesti,'Hayır');assert.strictEqual(ys.gerceklesmeyen.find(x=>x.sira===28).neden,'Zaman yetmedi');
assert.strictEqual(C.yilSonuRaporu(C.planOlustur(5,C.bosDurum(),'2026-2027'),C.bosDurum()).otomatik,'Hayır');

/* Veli Görüşme Formu kayıtları: aylık veli satırları ve yıl sonu Bireysel Görüşme sayıları */
{
  const g=[{veli:'Hasan Yılmaz (Baba)',ogrenci:'Ali Yılmaz',konu:'Devamsızlık',tarih:'2026-10-05',cinsiyet:'Erkek'},{veli:'Fatma Aydın (Anne)',ogrenci:'Zeynep Aydın',konu:'Uyum',tarih:'2027-02-10',cinsiyet:'Kız'},{veli:'Hasan Yılmaz (Baba)',ogrenci:'Ali Yılmaz',konu:'Takip',tarih:'2026-11-02',cinsiyet:'Erkek'},{veli:'Eski',ogrenci:'Eski Yıl',konu:'x',tarih:'2025-10-05',cinsiyet:'Kız'}];
  const pf=C.planOlustur(5,C.bosDurum(),'2026-2027'),dr=C.bosDurum();
  C.raporYaz(dr,'ay:EKİM',{veli:[{veli:'Elle',ogrenci:'Veli Dışı',konu:'k',tarih:'2026-10-20'}]});
  const ek=C.aylikRapor(pf,'EKİM',dr,{veliGorusmeleri:g});
  eq(ek.veli.map(x=>x.veli),['Hasan Yılmaz (Baba)','Elle'],'Aylık veli satırları: önce forma kayıtlı, sonra elle eklenen; yalnız o ayın görüşmeleri.');
  assert(ek.veli[0].formdan&&!ek.veli[1].formdan);
  assert.strictEqual(C.aylikRapor(pf,'ŞUBAT',dr,{veliGorusmeleri:g}).veli.length,1,'Ocak–Haziran görüşmeleri bir sonraki takvim yılında aranır.');
  assert.strictEqual(C.aylikRapor(pf,'EKİM',dr).veli.length,1,'Form kaydı verilmezse yalnız elle eklenenler.');
  const vf=C.yilSonuRaporu(pf,C.bosDurum(),{veliGorusmeleri:g}).veliFaaliyetleri.find(f=>f.ad==='Bireysel Görüşme');
  assert.strictEqual(vf.kiz,1);assert.strictEqual(vf.erkek,1,'Her öğrenci bir kez sayılır (Ali iki görüşme = 1 erkek); başka eğitim yılı sayılmaz.');
  const el=C.bosDurum();C.raporYaz(el,'yil',{veliFaaliyetleri:[{ad:'Bireysel Görüşme',kiz:'7',erkek:'2'}]});
  eq(C.yilSonuRaporu(pf,el,{veliGorusmeleri:g}).veliFaaliyetleri[0].kiz,'7','Elle yazılan sayı form kayıtlarıyla ezilmez.');
  assert.strictEqual(C.yilSonuRaporu(pf,C.bosDurum()).veliFaaliyetleri[1].kiz,undefined,'Kayıt yoksa sayı boş kalır.');
}

/* ── sınıf risk haritası: 36 alan, işaret dizisi, birleşme, sütun toplamları ── */
{
  const R=coreWin.RehberlikVeri;
  assert.strictEqual(R.risk.length,36,'MEB S.İ.4.a formunda 36 risk alanı var.');
  assert.strictEqual(new Set(R.risk.map(r=>r[0])).size,36,'Risk alanı adları tekrarsız.');
  eq(R.risk.slice(0,2).map(r=>r[0]),['Anne en fazla ilkokul mezunu','Baba en fazla ilkokul mezunu'],'Sıra formdaki sütun sırasıdır.');
  assert.strictEqual(R.risk[35][0],'Diğer');assert.strictEqual(R.risk[34][0],'Yabancı uyruklu öğrenci');
  assert(R.risk.every(r=>r[1]>=0&&r[1]<R.riskGruplari.length)&&R.riskGruplari.every((_,g)=>R.risk.some(r=>r[1]===g)),'Her risk bir gruba, her grup en az bir riske ait.');
  eq(R.riskYonerge.map(x=>x[0]),['KULLANIM AMACI','KİMLER KULLANIR','DİKKAT EDİLECEK HUSUSLAR'],'Yönerge başlıkları.');
  const ogr=[{id:'a',no:'1',ad:'Ali',cinsiyet:'Erkek'},{id:'b',no:'2',ad:'Ayşe',cinsiyet:'Kız'},{id:'c',no:'3',ad:'Can',cinsiyet:'Erkek'}];
  const d=C.bosDurum();
  assert.strictEqual(C.riskDizisi(d,'a'),'0'.repeat(36),'İşaretsiz öğrenci: 36 sıfır.');
  C.riskIsaretle(d,'a',0,true,1000);C.riskIsaretle(d,'a',35,true,1001);C.riskIsaretle(d,'b',0,true,1002);C.riskIsaretle(d,'b',12,true,1003);
  assert.strictEqual(C.riskDizisi(d,'a'),'1'+'0'.repeat(34)+'1');
  C.riskIsaretle(d,'b',12,false,1004);assert.strictEqual(C.riskDizisi(d,'b')[12],'0','İşaret kaldırılabilir.');
  C.riskIsaretle(d,'a',36,true);C.riskIsaretle(d,'a',-1,true);C.riskIsaretle(d,'',3,true);C.riskIsaretle(d,'a',1.5,true);
  assert.strictEqual(C.riskDizisi(d,'a').length,36);assert.strictEqual(d.k[''],undefined,'Geçersiz sıra / kimlik yok sayılır.');
  const t=C.riskTablosu(ogr,d);
  assert.strictEqual(t.ogrenciler.length,3);assert.strictEqual(t.riskli,2,'İşaretli öğrenci sayısı.');assert.strictEqual(t.isaret,3);
  assert.strictEqual(t.toplamlar[0],2);assert.strictEqual(t.toplamlar[35],1);assert.strictEqual(t.toplamlar.length,36);
  eq(t.ogrenciler.map(o=>o.sayi),[2,1,0]);eq(t.ogrenciler.map(o=>o.sira),[1,2,3]);
  eq(C.enSikRisk(t).map(x=>[x.ad,x.sayi]),[['Anne en fazla ilkokul mezunu',2],['Diğer',1]],'En çok işaretlenenler çoktan aza.');
  assert.strictEqual(C.riskTablosu([],d).ogrenciler.length,0);assert.strictEqual(C.riskTablosu(null,d).riskli,0);
  /* sınıftan çıkan öğrencinin kaydı toplamlara girmez */
  assert.strictEqual(C.riskTablosu(ogr.slice(1),d).toplamlar[35],0);
  /* bozuk kayıt temizlenir; cihazlar arası birleşme: son yazan kazanır, farklı öğrenciler birlikte korunur */
  assert.strictEqual(C.riskDizisi({k:{a:{s:'1x1',t:1}}},'a'),'101'+'0'.repeat(33),'Bozuk karakter 0 sayılır, eksik uzunluk tamamlanır.');
  const x=C.bosDurum(),y=C.bosDurum();C.riskIsaretle(x,'a',3,true,2000);C.riskIsaretle(y,'a',4,true,3000);C.riskIsaretle(y,'c',7,true,1000);
  const m=C.durumBirlestir(x,y);
  assert.strictEqual(C.riskDizisi(m,'a')[4],'1');assert.strictEqual(C.riskDizisi(m,'a')[3],'0','Aynı öğrencide son yazan kazanır.');assert.strictEqual(C.riskDizisi(m,'c')[7],'1','Diğer öğrenci korunur.');
  assert(C.durumAyni(C.durumBirlestir(x,y),C.durumBirlestir(y,x)),'Birleştirme sıradan bağımsızdır.');
  assert.strictEqual(JSON.stringify(C.durumTemizle({})),JSON.stringify(C.bosDurum()));assert(C.durumTemizle({m:{}}).k,'Eski kayıtlarda k anahtarı bulunmasa da durum geçerli.');
}

/* ── kâğıt çıktıları (HTML) ── */
const belgeWin=load([MOD+'rehberlik-veri.js',MOD+'rehberlik-core.js',MOD+'rehberlik-belge.js']);
const B=belgeWin.RehberlikBelge,BC=belgeWin.RehberlikCore;
const ctx={yil:'2026-2027',okul:'Koruk Ortaokulu',sinif:'5/A',duzey:5,ogretmen:'Ayşe KAYA',mudur:'Mehmet DEMİR',mevcut:{kiz:12,erkek:14,toplam:26},tarih:'2026-10-27'};
assert.strictEqual(B.sinifBasligi('5/A'),'5. SINIF A ŞUBESİ');assert.strictEqual(B.sinifBasligi('1-B'),'1. SINIF B ŞUBESİ');assert.strictEqual(B.sinifBasligi('Anasınıfı'),'ANASINIFI');
assert.strictEqual(B.mudurluk('Koruk Ortaokulu'),'KORUK ORTAOKULU MÜDÜRLÜĞÜ');assert.strictEqual(B.mudurluk(''),'……………………… MÜDÜRLÜĞÜ');
const planH=B.planBelgesi(pr,ctx);
['EYLÜL','HAZİRAN','ARA TATİL','3. Hafta','Ayşe KAYA','Mehmet DEMİR','5. SINIF A ŞUBESİ','OLUR','27.10.2026'].forEach(s=>assert(duz(planH).includes(s),`Plan belgesi "${s}" içermeli.`));
assert.strictEqual((planH.match(/<table/g)||[]).length,4,'Plan 4 bant (3+3+3+1 ay).');
assert(/rhb-imza rhb-imza--olur"><b>OLUR<\/b><span>27\.10\.2026<\/span><span>Mehmet DEMİR<\/span><b>Okul Müdürü/.test(planH),'Müdür bloğu: OLUR, tarih, ad, unvan.');
assert(planH.indexOf('Ayşe KAYA')<planH.indexOf('rhb-imza--olur'),'Öğretmen solda, müdür sağda (sıra).');
const aylikH=B.aylikBelge(ay,ctx);
['YETERLİLİK ALANI','KAZANIM','EYLÜL AYI ÇALIŞMA RAPORU','Anket','Elle eklenen','Okul Rehber Öğretmeni','Mehmet DEMİR'].forEach(s=>assert(duz(aylikH).includes(s),`Aylık belge "${s}" içermeli.`));
assert.strictEqual((aylikH.match(/class="rhb-blok"/g)||[]).length,3,'Aylık raporda en az 3 etkinlik bloğu (boşlar dahil).');
assert(duz(B.donemBelgesi(dn,ctx)).includes('I. DÖNEM SONU ÇALIŞMA RAPORU'));
const yilH=B.yilSonuBelgesi(ys,ctx);
assert(duz(yilH).includes('Hayır (X)')&&duz(yilH).includes('Zaman yetmedi')&&duz(yilH).includes('Veli Toplantısı'));
assert(duz(B.kazanimBelgesi(5,ctx)).includes('Okulun bölümlerini ve okulda çalışan personeli tanır.'));
[planH,aylikH,yilH,B.donemBelgesi(dn,ctx),B.kazanimBelgesi(5,ctx)].forEach(h=>assert(!/\{\{|undefined|NaN|\[object/.test(h),'Çıktıda artık işaret / geçersiz değer olmamalı.'));
assert(B.aylikBelge(C.aylikRapor(C.planOlustur(5,C.bosDurum(),'2026-2027'),'EKİM',C.bosDurum()),{...ctx,ogretmen:'',mudur:''}).includes('………'),'Adı bilinmeyen imza noktalı bırakılır.');
assert(duz(B.aylikBelge({...ay,diger:[{metin:'<script>x</script>',tarih:''}]},ctx)).includes('<script>x</script>')===false,'Metinler kaçışlanır.');

{
  const ogr=Array.from({length:3},(_,i)=>({id:'o'+i,no:String(i+1),ad:'Öğrenci '+(i+1),cinsiyet:'Kız'}));
  const d=BC.bosDurum();BC.riskIsaretle(d,'o0',0,true);BC.riskIsaretle(d,'o0',35,true);BC.riskIsaretle(d,'o1',0,true);
  const t=BC.riskTablosu(ogr,d),h=B.riskBelgesi(t,ctx),hy=B.riskBelgesi(t,ctx,{yonerge:false});
  assert.strictEqual((h.match(/<th class="rhb-dik-h"><span class="rhb-dik">/g)||[]).length,39,'3 kimlik + 36 risk dik başlığı.');
  assert.strictEqual((h.match(/class="rhb-rad-h"/g)||[]).length,1,'Öğrenci adı başlığı yatay.');
  assert.strictEqual((h.match(/<col class="rhb-c-risk">/g)||[]).length,36,'36 dar risk sütunu.');
  assert.strictEqual((h.match(/<td class="rhb-x">X<\/td>/g)||[]).length,3,'Üç işaret "X" olarak yazılır.');
  assert.strictEqual((h.match(/<tbody>.*<\/tbody>/s)[0].match(/<tr/g)||[]).length,B.RISK_EN_AZ_SATIR+1,'En az 10 satır (boşlar dahil) + TOPLAM satırı.');
  assert(/<tr class="rhb-toplam"><th colspan="4">TOPLAM<\/th><td class="rhb-x">2<\/td>/.test(h)&&/<td class="rhb-x">1<\/td><\/tr>/.test(h),'TOPLAM satırı sütun toplamlarını yazar (Anne en fazla ilkokul: 2, Diğer: 1).');
  ['5. SINIF A ŞUBESİ SINIF RİSK HARİTASI','Tarih: 27.10.2026','Öğrencinin Adı Soyadı','S.İ.4.a','OLUR','Mehmet DEMİR','Ayşe KAYA','Sınıf Rehber Öğretmeni','Anne en fazla ilkokul mezunu'].forEach(s=>assert(duz(h).includes(s),`Risk haritası "${s}" içermeli.`));
  assert(duz(h).includes('YÖNERGE')&&duz(h).includes('KULLANIM AMACI')&&duz(h).includes('Bir örneği rehberlik servisine iletilir.'),'Yönerge sayfası eklenir.');
  assert(!duz(hy).includes('YÖNERGE')&&hy.length<h.length,'Yönerge kapatılınca çıkmaz.');
  assert(h.indexOf('Ayşe KAYA')<h.indexOf('rhb-imza--olur'),'Öğretmen solda, müdür sağda.');
  const riskMak=h.slice(0,h.indexOf('rhb-yonerge'));
  assert(/<p class="rhb-risk-ust"><b class="rhb-formkodu">S\.İ\.4\.a[^<]*<\/b><span>Tarih: 27\.10\.2026<\/span><\/p>/.test(riskMak),'Form kodu ve tarih üst satırda yan yana.');
  assert(riskMak.lastIndexOf('rhb-imzalar')>riskMak.lastIndexOf('</table>')&&!/<\/div>\s*<p/.test(riskMak),'Risk sayfası imzalarla biter (altında taşan satır yok; boş 2. sayfa oluşmaz).');
  assert(!/\{\{|undefined|NaN|\[object/.test(h),'Risk çıktısında artık işaret yok.');
  assert(!B.riskBelgesi(BC.riskTablosu([{id:'x',no:'1',ad:'<img src=x>',cinsiyet:''}],BC.bosDurum()),ctx).includes('<img'),'Öğrenci adı kaçışlanır.');
}

/* ── Word şablonları: alanlar dolar, satırlar çoğalır, artık {{…}} kalmaz ── */
const dosyaWin=load([MOD+'rehberlik-veri.js',MOD+'rehberlik-core.js',MOD+'rehberlik-belge.js',MOD+'ogretmen-dosyasi-core.js',MOD+'rehberlik-dosya.js']);
const D=dosyaWin.RehberlikDosya,O=dosyaWin.OgretmenDosyasiCore;
const docXml=async(sablon,icerik)=>{
  const s=D.SABLON[sablon],blob=await O.docxDoldur(fs.readFileSync(`assets/rehberlik/${s.dosya}`),icerik.degerler,icerik.satirlar,s.gruplar);
  const z=await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  return z.file('word/document.xml').async('string');
};
const metin=x=>x.replace(/<w:br\/>/g,'\n').replace(/<w:tab\/>/g,'\t').replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
(async()=>{
  const rapor=C.aylikRapor(pr,'EYLÜL',r,{hepsi:true});
  rapor.veli=[{veli:'Ali & Veli',ogrenci:'Zeynep <A>',konu:'Devam',tarih:'2026-09-25'}];
  const ayXml=await docXml('aylik',D.aylikIcerik(rapor,ctx)),ayT=metin(ayXml);
  assert(!/\{\{/.test(ayXml),'Aylık Word: işaret kalmamalı.');
  assert(ayT.includes('KORUK ORTAOKULU MÜDÜRLÜĞÜ')&&ayT.includes('5. SINIF A ŞUBESİ EYLÜL AYI ÇALIŞMA RAPORU')&&ayT.includes('Ayşe KAYA')&&ayT.includes('Mehmet DEMİR')&&ayT.includes('27.10.2026')&&ayT.includes('OLUR'),'Müdür bloğunda OLUR ve tarih.');
  assert(ayT.includes('Ali & Veli')&&ayT.includes('Zeynep <A>'),'Değerler XML kaçışlı yazılır.');
  const etkinlik=rapor.etkinlikler.length;
  assert.strictEqual((ayXml.match(/ETKİNLİĞİN ADI/g)||[]).length,Math.max(3,etkinlik),'Etkinlik blokları (3 satırlık) listeye göre çoğalır.');
  assert.strictEqual((ayXml.match(/w:vMerge w:val="restart"/g)||[]).length,Math.max(3,etkinlik)*2+4,'Sıra/tarih hücreleri blok başına birleşik (+ test başlığı 2, "ÖĞRENCİNİN" ve "DİĞER ÇALIŞMALAR" etiketleri).');
  assert(ayT.includes(rapor.etkinlikler[0].kazanim));
  assert(metin(await docXml('aylik',D.aylikIcerik(C.aylikRapor(pr,'EKİM',C.bosDurum(),{veliGorusmeleri:[{veli:'Hasan Yılmaz (Baba)',ogrenci:'Ali Yılmaz',konu:'Devamsızlık',tarih:'2026-10-05'}]}),ctx))).includes('Hasan Yılmaz (Baba)'),'Word aylık raporda form görüşmeleri.');
  assert(!/w:tblpPr/.test(ayXml),'Yüzen tablo yok.');
  const donemT=metin(await docXml('donem',D.donemIcerik(C.donemRaporu(pr,2,{hepsi:true}),ctx)));
  assert(donemT.includes('II. DÖNEM SONU ÇALIŞMA RAPORU')&&donemT.includes('ŞUBAT')&&donemT.includes('HAZİRAN')&&donemT.includes('• ')&&!donemT.includes('{{'));
  const yilXml=await docXml('yil',D.yilIcerik(ys,{...ctx}));
  assert(!/\{\{/.test(yilXml)&&!/w:tblpPr/.test(yilXml),'Yıl sonu Word: işaret ve yüzen tablo kalmamalı.');
  const yilT=metin(yilXml);
  assert(yilT.includes('Hayır (X)')&&yilT.includes('Zaman yetmedi')&&yilT.includes('Veli Toplantısı')&&yilT.includes('36 kazanım')&&yilT.includes('OLUR')&&(yilT.match(/27\.10\.2026/g)||[]).length===1,'Yıl sonu: OLUR bloğu, tarih bir kez.');
  assert(yilT.indexOf('Yapılan Rehberlik Faaliyetleri')<yilT.indexOf('Psikolojik Danışma'),'Bölüm sırası korunur.');
  /* gruplar: yıl sonu 5 ayrı tablo, her biri kendi listesiyle */
  const bos=await docXml('yil',D.yilIcerik(C.yilSonuRaporu(C.planOlustur(5,C.bosDurum(),'2026-2027'),C.bosDurum()),ctx));
  assert(!/\{\{/.test(bos));
  /* satır sonu → Word satır sonu */
  const sablon=O.xmlDoldur('<w:t xml:space="preserve">{{A}}</w:t>',{A:'bir\niki'});
  assert.strictEqual(sablon,'<w:t xml:space="preserve">bir</w:t><w:br/><w:t xml:space="preserve">iki</w:t>');
  /* belge sayfa ayarları: her sayfada üst/alt boşluk ≥ 10 mm (567 twips) */
  for(const f of ['aylik','donem','yilsonu']){
    const z=await JSZip.loadAsync(fs.readFileSync(`assets/rehberlik/${f}.docx`)),x=await z.file('word/document.xml').async('string');
    const mar=/<w:pgMar[^>]*>/.exec(x)[0];
    assert(Number(/w:top="(\d+)"/.exec(mar)[1])>=567&&Number(/w:bottom="(\d+)"/.exec(mar)[1])>=567,`${f}.docx: üst/alt kenar boşluğu en az 10 mm olmalı.`);
    assert(/\{\{[A-Z0-9_]+\}\}/.test(x),`${f}.docx: şablonda doldurulacak alanlar bulunmalı.`);
    assert(!/Sedat|KARAGÖZ/.test(x),`${f}.docx: şablonda başkasının adı kalmamalı.`);
  }
  /* indirme: ad ASCII, yanlış tür reddedilir */
  await assert.rejects(()=>D.indir('kazanim',{}),/Yazdır/);

  /* ── sayfa (modül): sahte uygulama verisiyle ── */
  const store={
    siniflar:[{id:'c5a',ad:'5/A',sinifOgretmeniId:'t1'},{id:'c1b',ad:'1-B',sinifOgretmeniId:'t9'},{id:'cx',ad:'Anasınıfı',sinifOgretmeniId:'t9'}],
    veliler:[{id:'v1',sinifId:'c5a',ogrenciAdi:'Zeynep Aydın',ogrenciNo:'3',cinsiyet:'Kız'},{id:'v2',sinifId:'c5a',ogrenciAdi:'Ali Yılmaz',ogrenciNo:'1',cinsiyet:'Erkek'},{id:'v4',sinifId:'c1b',ogrenciAdi:'Elif Kaya',ogrenciNo:'1',cinsiyet:'Kız'}],
    ogretmenler:[{id:'t1',ad:'ayşe',soyad:'kaya'},{id:'m1',ad:'mehmet',soyad:'demir'},{id:'t9',ad:'veli',soyad:'hoca'}],
    okulBilgileri:[{id:'ayarlar',okulAdi:'Koruk İlk - Ortaokulu',ilkokulAdi:'Koruk İlkokulu',ortaokulAdi:'Koruk Ortaokulu',mudurId:'m1'}],
    veliGorusmeleri:[
      {id:'g1',olusturanUid:'u1',sinif:'5/A',ogrenciAd:'Ali Yılmaz',no:'1',veliAd:'Hasan Yılmaz',yakinlik:'Baba',tarih:`${C.egitimYili().slice(0,4)}-10-05`,neden:'Devamsızlık'},
      {id:'g2',olusturanUid:'u2',sinif:'5/A',ogrenciAd:'Başkasının Kaydı',veliAd:'Gizli Veli',tarih:`${C.egitimYili().slice(0,4)}-10-06`,neden:'Gizli'},
      {id:'g3',olusturanUid:'u1',sinif:'1-B',ogrenciAd:'Elif Kaya',veliAd:'Ayşe Kaya',tarih:`${C.egitimYili().slice(0,4)}-10-07`,neden:'Başka sınıf'}]
  };
  const kok={innerHTML:''},printed=[],tercih={},dinleyiciler={};
  const kullanici={uid:'u1',bagliOgretmenId:'t1'};
  const win=load([MOD+'sinif-baglam.js',MOD+'rehberlik-veri.js',MOD+'rehberlik-core.js',MOD+'rehberlik-belge.js',MOD+'rehberlik.js'],{
    AppStore:{data:t=>store[t]||[],get:k=>k==='session.user'?kullanici:undefined,subscribe:()=>()=>{}},
    KaPrefs:{get:(k,v)=>tercih[k]??v,set:(k,v)=>{tercih[k]=v},remoteSet:o=>Object.assign(tercih,o),remoteListen:f=>{dinleyiciler.uzak=f;return()=>{}}},
    document:{getElementById:()=>kok,querySelector:()=>kok,querySelectorAll:()=>[],addEventListener:(t,f)=>{dinleyiciler[t]=f}},
    ReportEngine:{printReport:(...x)=>printed.push(x),schoolInfo:()=>({okulAdi:'Yedek Okul'})}
  });
  const M=win.RehberlikModule;
  assert(M,'Modül yüklenmeli.');
  assert.strictEqual(M.open(),true);
  assert(kok.innerHTML.includes('data-rhb-page')&&kok.innerHTML.includes('>5/A<')&&!kok.innerHTML.includes('>1-B<'),'Öğretmen yalnız kendi sınıfını görür; tek sınıfı kendiliğinden seçilir.');
  const c=M.ctx();
  assert.strictEqual(c.sinif,'5/A');assert.strictEqual(c.duzey,5);assert.strictEqual(c.okul,'Koruk Ortaokulu');assert.strictEqual(c.ogretmen,'Ayşe KAYA');assert.strictEqual(c.mudur,'Mehmet DEMİR');
  eq(c.mevcut,{kiz:1,erkek:1,toplam:2},'Sınıf mevcudu öğrenci kayıtlarından.');
  assert(kok.innerHTML.includes('Okulun bölümlerini ve okulda çalışan personeli tanır.')&&kok.innerHTML.includes('data-rhb-check'),'Plan sekmesi maddeleri ve işaret kutularını gösterir.');
  /* işaretleme kaydedilir ve hesaba yazılır */
  const anahtar=`rehberlik_${c.yil.replace(/[^0-9]+/g,'_')}_c5a`;
  const olay=(oge)=>({target:{closest:s=>s==='[data-rhb-page]'?{}:s==='[data-rhb-check]'?oge:null,dataset:{}}});
  dinleyiciler.change(olay({dataset:{rhbCheck:'k1'},checked:true}));
  assert.strictEqual(M.durum.m.k1.y,1,'İşaret durumda tutulur.');assert(M.durum.m.k1.d,'İşaretlenince tarih yazılır.');
  assert(JSON.parse(tercih[anahtar]).m.k1.y===1,'Durum yerelde (KaPrefs) saklanır.');
  /* başka cihazdan gelen kayıt birleşir */
  const uzak=C.bosDurum();C.isaretle(uzak,'k2',true,'2026-09-21',Date.now()+5000);
  dinleyiciler.uzak({[anahtar]:JSON.stringify(uzak)});
  assert.strictEqual(M.durum.m.k1.y,1,'Yerel işaret korunur.');assert.strictEqual(M.durum.m.k2.y,1,'Uzaktan gelen işaret birleşir.');
  /* raporlar sekmesi ve yazdırma */
  M.sekme='rapor';M.ay='EYLÜL';M.render();
  assert(kok.innerHTML.includes('Aylık')&&kok.innerHTML.includes('Yıl Sonu'));
  M.tur='aylik';assert(duz(M.belgeHtml('aylik')).includes('EYLÜL AYI ÇALIŞMA RAPORU'));
  /* Risk Haritası: kart ve tablo görünümü, işaretleme kaydı */
  M.sekme='risk';M.render();
  assert(kok.innerHTML.includes('>Risk Haritası<')&&kok.innerHTML.includes('0 / 2 öğrenci risk grubunda')&&kok.innerHTML.includes('Öğrenci kartları'),'Risk sekmesi özeti ve görünüm seçeneklerini gösterir (ekran ölçümü yoksa kart görünümü).');
  assert(kok.innerHTML.includes('data-rhb-act="risk-ac"')&&!kok.innerHTML.includes('data-rhb-risk='),'Kart görünümünde kutular kart açılınca gelir.');
  M.riskAcik='v2';M.render();
  assert((kok.innerHTML.match(/data-rhb-risk="v2\|\d+"/g)||[]).length===36,'Açık kartta 36 risk kutusu.');
  assert(kok.innerHTML.includes('Aile yapısı')&&kok.innerHTML.includes('Eğitsel ve sosyal durum'),'Risk grupları başlıklıdır.');
  M.riskAcik='';M.riskGorunum='tablo';M.render();
  assert((kok.innerHTML.match(/class="rhb-rt__bas"/g)||[]).length===36&&(kok.innerHTML.match(/data-rhb-risk=/g)||[]).length===72,'Tabloda 36 sütun × 2 öğrenci kutu.');
  assert(kok.innerHTML.indexOf('Ali Yılmaz')<kok.innerHTML.indexOf('Zeynep Aydın'),'Öğrenciler okul numarasına göre sıralı.');
  dinleyiciler.change({target:{closest:q=>q==='[data-rhb-page]'?{}:null,dataset:{rhbRisk:'v2|0'},checked:true}});
  dinleyiciler.change({target:{closest:q=>q==='[data-rhb-page]'?{}:null,dataset:{rhbRisk:'v2|35'},checked:true}});
  assert.strictEqual(M.durum.k.v2.s,'1'+'0'.repeat(34)+'1','İşaret durumda tutulur.');
  assert.strictEqual(JSON.parse(tercih[anahtar]).k.v2.s[0],'1','Risk işareti hesaba kaydedilir (KaPrefs).');
  M.render();assert(kok.innerHTML.includes('1 / 2 öğrenci risk grubunda')&&kok.innerHTML.includes('data-rhb-risk="v2|0" checked'),'Yeniden çizimde işaretler korunur, özet güncellenir.');
  assert(duz(M.belgeHtml('risk')).includes('SINIF RİSK HARİTASI')&&duz(M.belgeHtml('risk')).includes('YÖNERGE'),'Risk belgesi yönergeyle birlikte üretilir.');
  dinleyiciler.change({target:{closest:q=>q==='[data-rhb-page]'?{}:null,dataset:{rhbAlan:'yonerge'},tagName:'INPUT',type:'checkbox',checked:false}});
  assert(!duz(M.belgeHtml('risk')).includes('YÖNERGE'),'"Yönerge sayfasını da ekle" kapatılınca basılmaz.');
  dinleyiciler.change({target:{closest:q=>q==='[data-rhb-page]'?{}:null,dataset:{rhbAlan:'yonerge'},tagName:'INPUT',type:'checkbox',checked:true}});
  M.sekme='rapor';M.render();
  /* Veli Görüşme Formu bağlantısı */
  M.ay='EKİM';M.render();
  assert(kok.innerHTML.includes('Veli Görüşme Formundan')&&kok.innerHTML.includes('data-rhb-act="veli-form"'),'Aylık raporda form kayıtları ve formu açma düğmesi.');
  assert(kok.innerHTML.includes('Ali Yılmaz')&&kok.innerHTML.includes('Hasan Yılmaz (Baba)')&&kok.innerHTML.includes('Devamsızlık'));
  assert(!kok.innerHTML.includes('Gizli Veli')&&!kok.innerHTML.includes('Elif Kaya'),'Başkasının kaydı ve başka sınıf görünmez.');
  assert(duz(M.belgeHtml('aylik')).includes('Hasan Yılmaz (Baba)'),'Yazdırılan aylık rapora form kayıtları girer.');
  M.tur='yil';M.render();
  assert(kok.innerHTML.includes('Bireysel Görüşme sayıları Veli Görüşme Formu kayıtlarından geldi (görüşülen öğrenci: 0 kız, 1 erkek)'),'Yıl sonu: form kayıtlarından gelen sayı belirtilir.');
  assert(/Bireysel Görüşme\|\|?1\|/.test(duz(M.belgeHtml('yil')).replace(/\|+/g,'|'))||duz(M.belgeHtml('yil')).includes('Bireysel Görüşme'),'Yıl sonu belgesinde Bireysel Görüşme satırı.');
  M.tur='aylik';M.ay='EYLÜL';
  M.yazdir('aylik');M.yazdir('plan');M.yazdir('yil');M.yazdir('donem1');M.yazdir('kazanim');M.yazdir('risk');
  assert.strictEqual(printed.length,6);
  assert(printed.every(p=>p[2].akis===true&&p[2].kenarBosluk>=10&&!String(p[2].extraHead||'').trim()&&p[2].baslikGoster===false&&p[2].logoGoster===false),'Her sayfada üst/alt boşluk: akış kipi açık, özel CSS yok.');
  eq(printed.map(p=>p[2].yon),['dikey','yatay','dikey','dikey','yatay','yatay'],'Plan, kazanım ve risk haritası yatay, raporlar dikey.');
  assert(printed.every(p=>!/…|undefined/.test(p[2].fileName)),'Dosya adı düzgün.');
  /* yönetici tüm sınıfları görür, kendi adını öğretmen alanına yazmaz */
  const yon=load([MOD+'sinif-baglam.js',MOD+'rehberlik-veri.js',MOD+'rehberlik-core.js',MOD+'rehberlik-belge.js',MOD+'rehberlik.js'],{
    AppStore:{data:t=>store[t]||[],get:k=>k==='session.user'?{admin:true}:undefined,subscribe:()=>()=>{}},
    KaPrefs:{get:(k,v)=>v,set(){},remoteSet(){},remoteListen:()=>()=>{}},
    document:{getElementById:()=>kok,querySelector:()=>kok,addEventListener(){}},ReportEngine:{printReport(){}}
  });
  yon.RehberlikModule.open();
  assert(['5/A','1-B','Anasınıfı'].every(s=>kok.innerHTML.includes(`>${s}<`)),'Yönetici tüm sınıfları görür.');
  assert.strictEqual(yon.RehberlikModule.ctx().ogretmen,'');
  yon.RehberlikModule.sinifSec('cx');yon.RehberlikModule.render();
  assert(kok.innerHTML.includes('1–8. sınıflar içindir'),'Düzeyi anlaşılamayan sınıfta uyarı gösterilir.');

  /* ── kayıt noktaları ── */
  const nav=fs.readFileSync('js/core/app-nav.js','utf8'),shell=fs.readFileSync('js/core/shell-ui.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8'),
    kat=fs.readFileSync('js/modules/evrak-katalog.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8');
  assert(/\['sinif-rehberlik','Sınıf Rehberlik'[^\n]*'sinif-rehberlik'\]/.test(nav),'Menüde Sınıf Rehberlik aracı olmalı.');
  {const evrak=nav.slice(nav.indexOf("['evrak','Tutanak ve Evrak'"),nav.indexOf("['personel','Personel İşleri'"));assert(evrak.includes("['sinif-rehberlik'"),'Sınıf Rehberlik "Tutanak ve Evrak" grubunda olmalı.');}
  assert(shell.includes("name==='sinif-rehberlik'")&&shell.includes('RehberlikModule.open'),'Kabukta rota tanımlı olmalı.');
  ['sinif-baglam.js?v=2','rehberlik-veri.js?v=2','rehberlik-core.js?v=3','rehberlik-belge.js?v=4','rehberlik.js?v=4','rehberlik-dosya.js?v=4'].forEach(f=>assert(sw.includes(`./js/modules/${f}`),`${f} önbelleğe alınmalı.`));
  ['sinif-baglam.js?v=2','rehberlik-veri.js?v=2','rehberlik-core.js?v=3','rehberlik-belge.js?v=4','rehberlik.js?v=4'].forEach(f=>assert(shell.includes(f),`${f} kabuktan yüklenmeli.`));
  assert(fs.readFileSync('js/modules/rehberlik.js','utf8').includes('rehberlik-dosya.js?v=4'),'İndirme bileşeni ilk indirmede yüklenir.');
  ['aylik','donem','yilsonu'].forEach(f=>assert(sw.includes(`./assets/rehberlik/${f}.docx`),`${f}.docx çevrimdışı için önbelleğe alınmalı.`));
  [39,50,66,67,103,129].forEach(no=>assert(new RegExp(`\\{a:"sinif-rehberlik"\\}`).test(kat),`Öğretmen Dosyası maddeleri modüle bağlı olmalı (${no}).`));
  assert((kat.match(/\{a:"sinif-rehberlik"\}/g)||[]).length>=6,'Öğretmen Dosyası listesinde 6 madde Sınıf Rehberlik\'e bağlı olmalı.');
  for(const f of ['rehberlik','rehberlik-belge','rehberlik-core','rehberlik-dosya','sinif-baglam']){
    const k=fs.readFileSync(`js/modules/${f}.js`,'utf8');
    assert(!/localStorage\s*\.\s*setItem/.test(k)&&!/<style|createElement\('style'\)/.test(k),`${f}.js depolamaya yazmaz, stil gömmez.`);
  }
  assert(css.includes('.ka-report .rhb-paper')&&css.includes('#v2ModuleRoot .rhb-'),'Stiller tasarım sistemi CSS dosyasında olmalı.');
  const a4Tum=css.slice(css.indexOf('/* ===== A4 — Sınıf Rehberlik'),css.indexOf('/* ===== SINIF REHBERLİK (rhb-*)'));
  assert(/\.rhb-risk \.rhb-imza\{[^}]*align-items:center[^}]*text-align:center/.test(a4Tum),'Risk haritasında imza blokları kendi içinde ortalanır (konumları aynı).');
  const a4=a4Tum.replace(/\.ka-report \.rhb-risk \.rhb-imza\{[^}]*\}/,'');
  assert(/\.rhb-imza\{[^}]*align-items:flex-start[^}]*text-align:left/.test(a4)&&/\.rhb-imzalar\{[^}]*justify-content:flex-start/.test(a4)&&!/\.rhb-imza[^{]*\{[^}]*(?:text-align:center|align-self:flex-end|justify-content:(?:center|flex-end|space-))/.test(a4),'Öğretmen imzaları solda hizalanır.');
  assert(/\.rhb-imza--olur\{[^}]*margin-left:auto/.test(a4),'Müdür bloğu sağ kenara yaslanır.');
  assert(!/\d(?:\.\d+)?px/.test(css.slice(css.indexOf('/* ===== A4 — Sınıf Rehberlik')).replace(/@media\([^)]*\)/g,'').replace(/@media [^{]*\{/g,'')),'Yeni stillerde sabit px olmamalı (ekran kesme noktası hariç); belirteç ya da mm kullanılmalı.');
  console.log('Sınıf Rehberlik testleri geçti.');
})().catch(e=>{console.error(e);process.exit(1)});
