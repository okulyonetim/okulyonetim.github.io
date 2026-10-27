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

/* ── kâğıt çıktıları (HTML) ── */
const belgeWin=load([MOD+'rehberlik-veri.js',MOD+'rehberlik-core.js',MOD+'rehberlik-belge.js']);
const B=belgeWin.RehberlikBelge,BC=belgeWin.RehberlikCore;
const ctx={yil:'2026-2027',okul:'Koruk Ortaokulu',sinif:'5/A',duzey:5,ogretmen:'Ayşe KAYA',mudur:'Mehmet DEMİR',mevcut:{kiz:12,erkek:14,toplam:26},tarih:'2026-10-27'};
assert.strictEqual(B.sinifBasligi('5/A'),'5. SINIF A ŞUBESİ');assert.strictEqual(B.sinifBasligi('1-B'),'1. SINIF B ŞUBESİ');assert.strictEqual(B.sinifBasligi('Anasınıfı'),'ANASINIFI');
assert.strictEqual(B.mudurluk('Koruk Ortaokulu'),'KORUK ORTAOKULU MÜDÜRLÜĞÜ');assert.strictEqual(B.mudurluk(''),'……………………… MÜDÜRLÜĞÜ');
const planH=B.planBelgesi(pr,ctx);
['EYLÜL','HAZİRAN','ARA TATİL','3. Hafta','Ayşe KAYA','Mehmet DEMİR','5. SINIF A ŞUBESİ'].forEach(s=>assert(duz(planH).includes(s),`Plan belgesi "${s}" içermeli.`));
assert.strictEqual((planH.match(/<table/g)||[]).length,4,'Plan 4 bant (3+3+3+1 ay).');
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
  assert(ayT.includes('KORUK ORTAOKULU MÜDÜRLÜĞÜ')&&ayT.includes('5. SINIF A ŞUBESİ EYLÜL AYI ÇALIŞMA RAPORU')&&ayT.includes('Ayşe KAYA')&&ayT.includes('Mehmet DEMİR')&&ayT.includes('27.10.2026'));
  assert(ayT.includes('Ali & Veli')&&ayT.includes('Zeynep <A>'),'Değerler XML kaçışlı yazılır.');
  const etkinlik=rapor.etkinlikler.length;
  assert.strictEqual((ayXml.match(/ETKİNLİĞİN ADI/g)||[]).length,Math.max(3,etkinlik),'Etkinlik blokları (3 satırlık) listeye göre çoğalır.');
  assert.strictEqual((ayXml.match(/w:vMerge w:val="restart"/g)||[]).length,Math.max(3,etkinlik)*2+4,'Sıra/tarih hücreleri blok başına birleşik (+ test başlığı 2, "ÖĞRENCİNİN" ve "DİĞER ÇALIŞMALAR" etiketleri).');
  assert(ayT.includes(rapor.etkinlikler[0].kazanim));
  assert(!/w:tblpPr/.test(ayXml),'Yüzen tablo yok.');
  const donemT=metin(await docXml('donem',D.donemIcerik(C.donemRaporu(pr,2,{hepsi:true}),ctx)));
  assert(donemT.includes('II. DÖNEM SONU ÇALIŞMA RAPORU')&&donemT.includes('ŞUBAT')&&donemT.includes('HAZİRAN')&&donemT.includes('• ')&&!donemT.includes('{{'));
  const yilXml=await docXml('yil',D.yilIcerik(ys,{...ctx}));
  assert(!/\{\{/.test(yilXml)&&!/w:tblpPr/.test(yilXml),'Yıl sonu Word: işaret ve yüzen tablo kalmamalı.');
  const yilT=metin(yilXml);
  assert(yilT.includes('Hayır (X)')&&yilT.includes('Zaman yetmedi')&&yilT.includes('Veli Toplantısı')&&yilT.includes('36 kazanım'));
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
    okulBilgileri:[{id:'ayarlar',okulAdi:'Koruk İlk - Ortaokulu',ilkokulAdi:'Koruk İlkokulu',ortaokulAdi:'Koruk Ortaokulu',mudurId:'m1'}]
  };
  const kok={innerHTML:''},printed=[],tercih={},dinleyiciler={};
  const kullanici={bagliOgretmenId:'t1'};
  const win=load([MOD+'sinif-baglam.js',MOD+'rehberlik-veri.js',MOD+'rehberlik-core.js',MOD+'rehberlik-belge.js',MOD+'rehberlik.js'],{
    AppStore:{data:t=>store[t]||[],get:k=>k==='session.user'?kullanici:undefined,subscribe:()=>()=>{}},
    KaPrefs:{get:(k,v)=>tercih[k]??v,set:(k,v)=>{tercih[k]=v},remoteSet:o=>Object.assign(tercih,o),remoteListen:f=>{dinleyiciler.uzak=f;return()=>{}}},
    document:{getElementById:()=>kok,querySelector:()=>kok,addEventListener:(t,f)=>{dinleyiciler[t]=f}},
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
  M.yazdir('aylik');M.yazdir('plan');M.yazdir('yil');M.yazdir('donem1');M.yazdir('kazanim');
  assert.strictEqual(printed.length,5);
  assert(printed.every(p=>p[2].akis===true&&p[2].kenarBosluk>=10&&!String(p[2].extraHead||'').trim()&&p[2].baslikGoster===false&&p[2].logoGoster===false),'Her sayfada üst/alt boşluk: akış kipi açık, özel CSS yok.');
  eq(printed.map(p=>p[2].yon),['dikey','yatay','dikey','dikey','yatay'],'Plan ve kazanım yatay, raporlar dikey.');
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
  ['sinif-baglam.js?v=1','rehberlik-veri.js?v=1','rehberlik-core.js?v=1','rehberlik-belge.js?v=1','rehberlik.js?v=1','rehberlik-dosya.js?v=1'].forEach(f=>assert(sw.includes(`./js/modules/${f}`),`${f} önbelleğe alınmalı.`));
  ['sinif-baglam.js?v=1','rehberlik-veri.js?v=1','rehberlik-core.js?v=1','rehberlik-belge.js?v=1','rehberlik.js?v=1'].forEach(f=>assert(shell.includes(f),`${f} kabuktan yüklenmeli.`));
  assert(fs.readFileSync('js/modules/rehberlik.js','utf8').includes('rehberlik-dosya.js?v=1'),'İndirme bileşeni ilk indirmede yüklenir.');
  ['aylik','donem','yilsonu'].forEach(f=>assert(sw.includes(`./assets/rehberlik/${f}.docx`),`${f}.docx çevrimdışı için önbelleğe alınmalı.`));
  [39,50,66,67,103,129].forEach(no=>assert(new RegExp(`\\{a:"sinif-rehberlik"\\}`).test(kat),`Öğretmen Dosyası maddeleri modüle bağlı olmalı (${no}).`));
  assert((kat.match(/\{a:"sinif-rehberlik"\}/g)||[]).length>=6,'Öğretmen Dosyası listesinde 6 madde Sınıf Rehberlik\'e bağlı olmalı.');
  for(const f of ['rehberlik','rehberlik-belge','rehberlik-core','rehberlik-dosya','sinif-baglam']){
    const k=fs.readFileSync(`js/modules/${f}.js`,'utf8');
    assert(!/localStorage\s*\.\s*setItem/.test(k)&&!/<style|createElement\('style'\)/.test(k),`${f}.js depolamaya yazmaz, stil gömmez.`);
  }
  assert(css.includes('.ka-report .rhb-paper')&&css.includes('#v2ModuleRoot .rhb-'),'Stiller tasarım sistemi CSS dosyasında olmalı.');
  const a4=css.slice(css.indexOf('/* ===== A4 — Sınıf Rehberlik'),css.indexOf('/* ===== SINIF REHBERLİK (rhb-*)'));
  assert(/\.rhb-imza\{[^}]*align-items:flex-start[^}]*text-align:left/.test(a4)&&/\.rhb-imzalar\{[^}]*justify-content:flex-start/.test(a4)&&!/\.rhb-imza[^{]*\{[^}]*(?:text-align:center|align-self:flex-end|justify-content:(?:center|flex-end|space-))/.test(a4),'Öğretmen/müdür imzaları solda hizalanır.');
  assert(!/\d(?:\.\d+)?px/.test(css.slice(css.indexOf('/* ===== A4 — Sınıf Rehberlik')).replace(/@media\([^)]*\)/g,'').replace(/@media [^{]*\{/g,'')),'Yeni stillerde sabit px olmamalı (ekran kesme noktası hariç); belirteç ya da mm kullanılmalı.');
  console.log('Sınıf Rehberlik testleri geçti.');
})().catch(e=>{console.error(e);process.exit(1)});
