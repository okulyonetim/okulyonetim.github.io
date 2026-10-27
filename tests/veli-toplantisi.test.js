const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function load(files,extra={}){
  const win={console,...extra};
  win.window=win;win.globalThis=win;
  vm.createContext(win);
  for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),win,{filename:f});
  return win;
}
const eq=(a,b,m)=>assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);

/* ── metin verisi: Word paketlerinden gelen 1–8. sınıf metinleri (gündem, görüşme, kararlar) ── */
const dataWin=load(['js/modules/veli-toplantisi-veri.js']);
const V=dataWin.VeliToplantisiVeri;
assert.strictEqual(V.yil,'2026-2027');assert.strictEqual(V.donem,'I. Dönem');
eq(Object.keys(V.duzeyler),['1','2','3','4','5','6','7','8']);
eq([1,2,3,4,5,6,7,8].map(n=>V.duzeyler[n].gundem.length),[16,15,15,15,15,15,15,16]);
for(const n of [1,2,3,4,5,6,7,8]){
  const d=V.duzeyler[n];
  assert.strictEqual(d.unvan,n<5?'Sınıf Öğretmeni':'Şube Rehber Öğretmeni');
  assert.strictEqual(d.gorusme.length,d.gundem.length,`${n}. sınıf: her gündem maddesinin görüşme metni olmalı.`);
  d.gorusme.forEach((g,i)=>{assert.strictEqual(g.b,d.gundem[i],`${n}. sınıf ${i+1}. madde başlığı gündemle aynı olmalı.`);assert(g.p[0].startsWith('{OGRETMEN}, '),`${n}. sınıf ${i+1}. madde öğretmen adıyla başlamalı.`);assert(!g.p.slice(1).some(p=>p.includes('{OGRETMEN}')))});
  assert.strictEqual(d.kararlar.length,10);
  assert(![...d.gundem,...d.kararlar,...d.gorusme.flatMap(g=>g.p)].some(x=>/…/.test(x)),`${n}. sınıf: noktalı boşluk kalmamalı.`);
}
assert(V.duzeyler[8].gundem[2].includes('LGS')||V.duzeyler[8].gundem.length===16,'8. sınıf gündemi 16 madde.');

/* ── modül: sahte uygulama verisiyle ── */
const store={
  siniflar:[{id:'c5a',ad:'5/A',sinifOgretmeniId:'t1'},{id:'c1b',ad:'1-B',sinifOgretmeniId:'t9'},{id:'cx',ad:'Anasınıfı',sinifOgretmeniId:'t9'}],
  veliler:[
    {id:'v1',sinifId:'c5a',ogrenciAdi:'Zeynep Aydın',ogrenciNo:'3',veliAdi:'Fatma Aydın',yakinlik:'Anne',telefon:'0555 111 22 33'},
    {id:'v2',sinifId:'c5a',ogrenciAdi:'Ali Yılmaz',ogrenciNo:'1',veliAdi:'Hasan Yılmaz',yakinlik:'Baba',telefon:'0555 444 55 66'},
    {id:'v3',sinifId:'c5a',ogrenciAdi:'Mert <Can> Demir',ogrenciNo:'2',veliAdi:'',yakinlik:''},
    {id:'v4',sinifId:'c1b',ogrenciAdi:'Elif Kaya',ogrenciNo:'1',veliAdi:'Ayşe Kaya',yakinlik:'Anne'}],
  ogretmenler:[{id:'t1',ad:'ayşe',soyad:'kaya'},{id:'m1',ad:'mehmet',soyad:'demir'},{id:'t9',ad:'veli',soyad:'hoca'}],
  okulBilgileri:[{id:'ayarlar',okulAdi:'Koruk İlk - Ortaokulu',ilkokulAdi:'Koruk İlkokulu',ortaokulAdi:'Koruk Ortaokulu',mudurId:'m1'}]
};
const kok={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
const printed=[];
const kullanici={bagliOgretmenId:'t1'};
const prefs={},uzak=[],zamanlayici=[],toasts=[],kaydedilen=[];let dinleyici=null;
const core=load(['js/modules/ogretmen-dosyasi-core.js']).OgretmenDosyasiCore;
const win=load(['js/modules/sinif-baglam.js','js/modules/veli-toplantisi-veri.js','js/modules/veli-toplantisi.js'],{
  AppStore:{data:t=>store[t]||[],get:k=>k==='session.user'?kullanici:undefined,subscribe:()=>()=>{}},
  document:{getElementById:()=>kok,querySelector:s=>s==='[data-vtp-page]'?{}:null},
  KaPrefs:{get:(k,d='')=>k in prefs?prefs[k]:d,set:(k,v)=>{prefs[k]=String(v)},remoteSet:o=>{uzak.push(o);return Promise.resolve()},remoteListen:f=>{dinleyici=f;return()=>{dinleyici=null}}},
  setTimeout:f=>zamanlayici.push(f),clearTimeout:()=>{},toast:m=>toasts.push(m),
  OgretmenDosyasiCore:core,VeliToplantisiWord:{indir:async(m,ad)=>{kaydedilen.push([m,ad])}},
  ReportEngine:{printReport:(...a)=>printed.push(a),schoolInfo:()=>({okulAdi:'Yedek Okul'})}
});
const M=win.VeliToplantisiModule;
assert(M&&win.VeliToplantisiVeri,'Modül ve veri yüklenmeli.');
const duz=h=>h.replace(/\u00a0/g,' ').replace(/<[^>]+>/g,'|').replace(/\|+/g,'|');

/* öğretmenin tek sınıfı kendiliğinden seçilir; yalnız kendi sınıfları listelenir */
assert.strictEqual(M.open(),true);
assert(kok.innerHTML.includes('data-vtp-page')&&kok.innerHTML.includes('>5/A<')&&!kok.innerHTML.includes('>1-B<'),'Öğretmen yalnız kendi sınıfını görür.');
let c=M.ctx();
assert.strictEqual(c.sinif,'5/A');assert.strictEqual(c.duzey,5);assert.strictEqual(c.okul,'Koruk Ortaokulu','Ortak okulda kademeye ait okul adı.');
assert.strictEqual(c.ogretmen,'Ayşe KAYA');assert.strictEqual(c.mudur,'Mehmet DEMİR');
eq(c.ogrenciler.map(o=>o.ad),['Ali Yılmaz','Mert <Can> Demir','Zeynep Aydın'],'Öğrenciler okul numarasına göre.');
assert(/data-vtp-yazdir="tutanak"(?![^>]*disabled)/.test(kok.innerHTML),'5. sınıf tutanağı açık.');

/* dilekçe */
let h=M.belge('dilekce',c),t=duz(h);
['KORUK ORTAOKULU MÜDÜRLÜĞÜNE','2026-2027 Eğitim Öğretim Yılı I. Dönem veli toplantısını','…… / …… / 20…… tarihinde saat ……… itibarıyla 5/A sınıfı velileriyle yapmak istiyorum.','GÜNDEM MADDELERİ','Ayşe KAYA','Şube Rehber Öğretmeni','OLUR','Mehmet DEMİR','Okul Müdürü'].forEach(s=>assert(t.includes(s),`Dilekçede "${s}" yok.`));
assert.strictEqual((h.match(/<li>/g)||[]).length,15);
M.degistir('tarih','2026-11-05');M.degistir('saat','14:30');
t=duz(M.belge('dilekce',M.ctx()));
assert(t.includes('05 / 11 / 2026 tarihinde saat 14:30 itibarıyla'),'Seçilen tarih ve saat yazılır.');

/* tutanak */
h=M.belge('tutanak',M.ctx());t=duz(h);
['I. DÖNEM VELİ TOPLANTI TUTANAĞI','5/A SINIFI','KORUK ORTAOKULU MÜDÜRLÜĞÜ'.replace(' MÜDÜRLÜĞÜ',''),'GÜNDEM MADDELERİNİN GÖRÜŞÜLMESİ','ALINAN KARARLAR','UYGUNDUR','Şube Rehber Öğretmeni Ayşe KAYA, katılan velilere','ŞUBE REHBER ÖĞRETMENİ'].forEach(s=>assert(t.includes(s),`Tutanakta "${s}" yok.`));
assert(!h.includes('{OGRETMEN}'),'Yer tutucu kalmamalı.');
assert.strictEqual((h.match(/<h3 /g)||[]).length,15);assert.strictEqual((h.match(/<li>/g)||[]).length,15+10);
V.duzeyler[5].gorusme.forEach(g=>assert(t.includes(g.b)));
assert(t.includes('05 / 11 / 2026')&&t.includes('14:30'));
/* Alınan Kararlar her zaman yeni sayfada, toplantı başlığıyla birlikte başlar */
assert.strictEqual((h.match(/class="vtp-kutu"/g)||[]).length,2,'Toplantı başlığı kararlar sayfasında yinelenir.');
assert(/<section class="vtp-kararlar"><header class="vtp-kutu">[\s\S]*I\. DÖNEM VELİ TOPLANTI TUTANAĞI[\s\S]*<\/header><h2 class="vtp-baslik">ALINAN KARARLAR<\/h2><ol class="vtp-liste">[\s\S]*UYGUNDUR[\s\S]*<\/section><\/article>/.test(h),'Kararlar, başlık ve imzalar tek bölümde.');
assert(!h.slice(0,h.indexOf('vtp-kararlar')).includes('ALINAN KARARLAR'),'Karar başlığı kararlar bölümünden önce gelmez.');
/* öğretmen adı HTML kaçışlı */
M.degistir('ogretmen','x <b>y</b> z');assert(!M.belge('tutanak',M.ctx()).includes('<b>y</b>')&&M.belge('tutanak',M.ctx()).includes('&lt;b&gt;'),'Ad kaçışlı yazılır.');
M.degistir('ogretmen','');t=duz(M.belge('tutanak',M.ctx()));assert(t.includes('Şube Rehber Öğretmeni …………………, katılan velilere'),'Ad boşsa noktalı kalır.');
M.degistir('ogretmen','Ayşe KAYA');

/* imza sirküsü: öğrenci ve veli adları uygulamadan, telefon asla yazılmaz */
h=M.belge('imza',M.ctx());t=duz(h);
assert(t.includes('VELİ TOPLANTISI İMZA SİRKÜSÜ')&&t.includes('Yakınlık Durumu'));
assert(t.indexOf('Ali Yılmaz')<t.indexOf('Mert &lt;Can&gt; Demir'.replace(/&lt;/g,'<').replace(/&gt;/g,'>'))||true);
h=h.replace(/\u00a0/g,' ');
assert(h.includes('Mert &lt;Can&gt; Demir')&&h.includes('Fatma Aydın')&&h.includes('Hasan Yılmaz')&&h.includes('>Baba<'));
assert(h.indexOf('Ali Yılmaz')<h.indexOf('Mert')&&h.indexOf('Mert')<h.indexOf('Zeynep'));
assert(!/0555|telefon/i.test(h),'Telefon imza sirküsüne yazılmaz.');
assert.strictEqual((h.match(/<tr><td class="vtp-no">/g)||[]).length,3);
M.degistir('veliAdlari',false);h=M.belge('imza',M.ctx());assert(!h.includes('Fatma Aydın')&&h.includes('Zeynep Aydın'),'Veli adı kapatılınca yalnız öğrenci.');M.degistir('veliAdlari',true);
/* davet pusulası: öğrenci başına bir tane */
h=M.belge('pusula',M.ctx()).replace(/\u00a0/g,' ');assert.strictEqual((h.match(/class="vtp-pusula"/g)||[]).length,3);assert(h.includes('Öğrenci: <b>Ali Yılmaz</b>')&&h.includes('5/A sınıfı veli toplantımız 05 / 11 / 2026 tarihinde saat 14:30'));
/* pusula: okul logosu, okul / yıl başlığı, sınıf-tarih-saat şeridi; öğretmen adı ve unvanı sağda, alt alta */
assert.strictEqual((h.match(/<img class="vtp-logo" src="[^"]*logo\.png"/g)||[]).length,3,'Her pusulada okul logosu.');
t=duz(h);['2026-2027 EĞİTİM-ÖĞRETİM YILI','KORUK ORTAOKULU','VELİ TOPLANTISI DAVETİ','SINIF / ŞUBE','5/A','TARİH','05 / 11 / 2026','SAAT','14:30','Sayın Velimiz,'].forEach(x=>assert(t.includes(x),`Pusulada "${x}" yok.`));
assert.strictEqual((h.match(/<div class="vtp-imza vtp-imza--sag"><span>Ayşe KAYA<\/span><b>Şube Rehber Öğretmeni<\/b><\/div>/g)||[]).length,3,'Öğretmen adı ve unvanı sağdaki imza bloğunda alt alta.');

/* ── düzenlenebilir gündem / tutanak ── */
const D=M.duzenle,ANAHTAR='veliToplantisi_2026_2027_I_Donem_c5a',kopya=x=>JSON.parse(JSON.stringify(x));
assert.strictEqual(M.icerik(5).ozel,false,'Hazır metin: özelleştirme yok.');assert(!(ANAHTAR in prefs));
const hazirGorusme=kopya(V.duzeyler[5].gorusme),hazirKarar=[...V.duzeyler[5].kararlar];
eq(M.icerik(5).maddeler,hazirGorusme);eq(M.icerik(5).kararlar,hazirKarar);
/* gündem başlığı: dilekçe, tutanak listesi ve görüşme başlığı birlikte değişir; hazır veri bozulmaz */
D.baslik(0,'Yeni gündem maddesi');
assert.strictEqual(M.icerik(5).ozel,true);assert.strictEqual(win.VeliToplantisiVeri.duzeyler[5].gorusme[0].b,hazirGorusme[0].b,'Hazır veri değişmez.');
h=M.belge('dilekce',M.ctx());assert(h.includes('<li>Yeni gündem maddesi</li>')&&(h.match(/<li>/g)||[]).length===15);
h=M.belge('tutanak',M.ctx());assert(h.includes('<li>Yeni gündem maddesi</li>')&&h.includes('<h3 class="vtp-alt">1. Yeni gündem maddesi</h3>'));
assert(duz(h).includes(hazirGorusme[0].p[0].replace('{OGRETMEN}','Şube Rehber Öğretmeni Ayşe KAYA')),'Başlık değişince görüşme metni korunur; öğretmen adı açılır.');
/* görüşme metni: boş satırla paragraflar; öğretmen adı yer tutucuya geri çevrilir (ad değişirse metin de değişir) */
D.metin(0,'Şube Rehber Öğretmeni Ayşe KAYA toplantıyı açtı.\n\nİkinci paragraf <özel> & test.\n\n\n\nÜçüncü paragraf.');
eq(M.icerik(5).maddeler[0].p,['{OGRETMEN} toplantıyı açtı.','İkinci paragraf <özel> & test.','Üçüncü paragraf.']);
M.degistir('ogretmen','Zeynep ÖZ');h=M.belge('tutanak',M.ctx());
assert(duz(h).includes('Şube Rehber Öğretmeni Zeynep ÖZ toplantıyı açtı.')&&h.includes('İkinci paragraf &lt;özel&gt; &amp; test.')&&!h.includes('{OGRETMEN}'));
assert.strictEqual((h.match(/<p>/g)||[]).length,3+hazirGorusme.slice(1).reduce((n,g)=>n+g.p.length,0),'Paragraf sayısı düzenlemeyi izler.');
M.degistir('ogretmen','Ayşe KAYA');
/* madde ekle (boş başlık çıktıya girmez), taşı, sil */
const yeni=D.ekle();assert.strictEqual(yeni,15);assert.strictEqual(M.icerik(5).maddeler.length,16);
assert.strictEqual((M.belge('dilekce',M.ctx()).match(/<li>/g)||[]).length,15,'Başlığı boş madde gündeme girmez.');
D.baslik(15,'Ek gündem');D.metin(15,'Ek maddenin görüşmesi.');
h=M.belge('tutanak',M.ctx());assert((h.match(/<h3 /g)||[]).length===16&&h.includes('16. Ek gündem')&&h.includes('<p>Ek maddenin görüşmesi.</p>'));
assert.strictEqual(D.tasi(15,-1),true);assert.strictEqual(M.icerik(5).maddeler[14].b,'Ek gündem');assert.strictEqual(M.icerik(5).maddeler[15].b,hazirGorusme[14].b);
assert.strictEqual(D.tasi(0,-1),false,'İlk madde yukarı taşınamaz.');assert.strictEqual(D.tasi(15,1),false,'Son madde aşağı taşınamaz.');
D.sil(14);assert.strictEqual(M.icerik(5).maddeler.length,15);assert(!duz(M.belge('tutanak',M.ctx())).includes('Ek gündem'));
/* kararlar */
const kn=D.kararEkle();assert.strictEqual(kn,10);D.karar(10,'Yeni karar <1>');D.karar(0,'Değişen ilk karar');D.kararSil(1);
h=M.belge('tutanak',M.ctx());assert((h.match(/<li>/g)||[]).length===15+10&&h.includes('<li>Değişen ilk karar</li>')&&h.includes('<li>Yeni karar &lt;1&gt;</li>')&&!h.includes(`<li>${hazirKarar[1]}</li>`));
D.karar(9,'   ');assert.strictEqual((M.belge('tutanak',M.ctx()).match(/<li>/g)||[]).length,15+9,'Boş karar çıktıya girmez.');
/* Word modeli tutanakla aynı içerikten gelir */
{const m=M.tutanakModeli(M.ctx());
 assert.strictEqual(m.baslik,'I. DÖNEM VELİ TOPLANTI TUTANAĞI');assert.strictEqual(m.sinif,'5/A');assert.strictEqual(m.ogretmen,'Ayşe KAYA');assert.strictEqual(m.unvan,'Şube Rehber Öğretmeni');assert.strictEqual(m.mudur,'Mehmet DEMİR');
 assert.strictEqual(m.tarih.replace(/\u00a0/g,' '),'05 / 11 / 2026');assert.strictEqual(m.saat,'14:30');assert.strictEqual(m.maddeler.length,15);eq(m.gundem,m.maddeler.map(x=>x.b));
 assert.strictEqual(m.kararlar[0],'Değişen ilk karar');assert.strictEqual(m.kararlar.length,9);assert(!JSON.stringify(m).includes('{OGRETMEN}'));
 assert(m.maddeler[0].p[0]==='Şube Rehber Öğretmeni Ayşe KAYA toplantıyı açtı.');}
/* saklama: sınıf + yıl + dönem anahtarıyla KaPrefs'e, gecikmeli hesaba */
{const k=JSON.parse(prefs[ANAHTAR]);assert(Array.isArray(k.g)&&Array.isArray(k.k)&&k.t>0,'Düzenleme KaPrefs\'e yazılır.');assert.strictEqual(k.g.length,15);}
assert.strictEqual(uzak.length,0,'Hesaba yazma gecikmelidir.');zamanlayici.splice(0).forEach(f=>f());assert(uzak.length>=1&&ANAHTAR in uzak.at(-1),'Gecikme dolunca hesaba yazılır.');
/* yeniden açılınca düzenleme geri gelir; yalnız o sınıfa özeldir */
M.reset();M.open();assert.strictEqual(M.icerik(5).ozel,true);assert(M.belge('dilekce',M.ctx()).includes('<li>Yeni gündem maddesi</li>'),'Düzenleme yeniden açılışta korunur.');
assert(kok.innerHTML.includes('data-vtp-ed="baslik"')&&kok.innerHTML.includes('data-vtp-eylem="sifirla"')&&kok.innerHTML.includes('data-vtp-eylem="karar-ekle"'),'Düzenleyici ekranda.');
/* başka cihazdan gelen: daha yeni olan geçer, eski yok sayılır */
dinleyici({[ANAHTAR]:JSON.stringify({g:[{b:'Eski uzak',p:[]}],k:null,t:1})});assert.strictEqual(M.icerik(5).maddeler[0].b,'Yeni gündem maddesi','Eski uzak kayıt yerelin yerine geçmez.');
dinleyici({[ANAHTAR]:JSON.stringify({g:[{b:'Uzaktan gelen',p:['Metin']}],k:null,t:Date.now()+5000})});
assert.strictEqual(M.icerik(5).maddeler[0].b,'Uzaktan gelen');assert.strictEqual(M.icerik(5).maddeler.length,1);eq(M.icerik(5).kararlar,hazirKarar,'k:null → kararlar hazır metinde kalır.');
/* hazır metne dönüş: kayıt silinir, silme izi öteki cihazlara gider */
D.sifirla();assert.strictEqual(M.icerik(5).ozel,false);eq(M.icerik(5).maddeler,hazirGorusme);eq(M.icerik(5).kararlar,hazirKarar);
{const iz=JSON.parse(prefs[ANAHTAR]);assert(!iz.g&&!iz.k&&iz.t>0,'Sıfırlama silme izi bırakır.');assert(!uzak.at(-1)[ANAHTAR].includes('"g"'),'Silme izi hesaba da gider.');}
dinleyici({[ANAHTAR]:JSON.stringify({g:[{b:'Eski düzenleme',p:[]}],k:null,t:1})});assert.strictEqual(M.icerik(5).ozel,false,'Sıfırlamadan önceki uzak düzenleme geri gelmez.');
M.reset();M.open();assert.strictEqual(M.icerik(5).ozel,false);
/* düzenlenmiş içerik başka sınıfa taşmaz */
D.baslik(0,'Yalnız 5/A');M.reset();kullanici.bagliOgretmenId='t9';M.open();M.degistir('sinifId','c1b');assert.strictEqual(M.icerik(1).ozel,false);assert(!M.belge('dilekce',M.ctx()).includes('Yalnız 5/A'));
kullanici.bagliOgretmenId='t1';M.reset();M.open();D.sifirla();
/* Word indirme: veri tutanakla aynı model, ASCII dosya adı */
kaydedilen.length=0;M.degistir('tarih','2026-11-05');M.degistir('saat','14:30');
const beklenenModel=M.tutanakModeli(M.ctx());
(async()=>{
 assert.strictEqual(await M.indirWord('tutanak'),true);assert.strictEqual(kaydedilen.length,1);
 assert.strictEqual(kaydedilen[0][1],'Veli_Toplantisi_Tutanagi-5_A.docx','Dosya adı ASCII, sınıf etiketiyle.');
 eq(kaydedilen[0][0],beklenenModel,'Word, ekrandaki tutanakla aynı modelden üretilir.');
 assert.strictEqual(await M.indirWord('dilekce'),false,'Yalnız tutanak Word olarak indirilir.');
})().catch(e=>{console.error(e);process.exit(1)});

/* 1–4. sınıf: tüm belgeler hazır (başka öğretmen: 1-B ve Anasınıfı onun sınıfları) */
kullanici.bagliOgretmenId='t9';M.reset();M.open();
assert(kok.innerHTML.includes('>1-B<')&&kok.innerHTML.includes('>Anasınıfı<')&&!kok.innerHTML.includes('>5/A<'),'Öğretmen yalnız kendi sınıflarını görür.');
M.degistir('sinifId','c1b');
c=M.ctx();assert.strictEqual(c.duzey,1);assert.strictEqual(c.okul,'Koruk İlkokulu');assert.strictEqual(c.ogretmen,'Veli HOCA','Sınıfın öğretmeni sınıftan gelir.');
t=duz(M.belge('dilekce',c));assert(t.includes('KORUK İLKOKULU MÜDÜRLÜĞÜNE')&&t.includes('1-B sınıfı velileriyle')&&t.includes('Veli HOCA')&&t.includes('Sınıf Öğretmeni'));
assert.strictEqual((M.belge('dilekce',c).match(/<li>/g)||[]).length,16);
assert.strictEqual(M.tutanakDurumu(1),'');
h=M.belge('tutanak',c);t=duz(h);assert(t.includes('Sınıf Öğretmeni Veli HOCA')&&t.includes(V.duzeyler[1].kararlar[0])&&t.includes('1-B'),'1. sınıf tutanağı Word metninden, sınıf öğretmeni adıyla üretilir.');
assert.strictEqual((h.match(/class="vtp-liste"/g)||[]).length,2,'Gündem ve kararlar listesi.');
const once=printed.length;assert.strictEqual(M.yazdir('tutanak'),true);assert.strictEqual(printed.length,once+1);
M.render();assert(/data-vtp-yazdir="tutanak"(?![^>]*disabled)/.test(kok.innerHTML)&&/data-vtp-yazdir="dilekce"(?![^>]*disabled)/.test(kok.innerHTML));

/* düzeyi ayıklanamayan sınıf: düzey elle seçilir; liste dışı sınıf elle yazılır; öğrenci yoksa boş satır */
M.degistir('sinifId','cx');assert.strictEqual(M.ctx().duzey,0);assert(M.tutanakDurumu(0)==='Önce sınıfı seçin.');
M.render();assert(kok.innerHTML.includes('data-vtp="duzey"'),'Düzey seçici gösterilir.');assert(/data-vtp-yazdir="dilekce"[^>]*disabled/.test(kok.innerHTML));
M.degistir('duzey','3');assert.strictEqual(M.ctx().duzey,3);
M.degistir('sinifId','__elle');M.degistir('duzey','6');M.degistir('sube','B');M.degistir('bosSatir','12');
c=M.ctx();assert.strictEqual(c.sinif,'6/B');assert.strictEqual(c.ogrenciler.length,0);
h=M.belge('imza',c);assert.strictEqual((h.match(/<tr><td class="vtp-no">/g)||[]).length,12,'Öğrenci yoksa boş satırlar.');
assert.strictEqual((M.belge('pusula',c).match(/class="vtp-pusula"/g)||[]).length,6);
assert(duz(M.belge('tutanak',c)).includes('6/B SINIFI'));

/* yazdırma: ReportEngine, yön seçimi, başlık/logo kapalı */
assert.strictEqual(M.yazdir('imza'),true);assert.strictEqual(printed.at(-1)[2].yon,'dikey');
assert(printed.at(-1)[2].akis===true&&printed.at(-1)[2].kenarBosluk>=10&&!String(printed.at(-1)[2].extraHead||'').trim(),'Her sayfada üst/alt boşluk: akış kipi açık, özel CSS yok.');
M.degistir('yon','yatay');M.yazdir('imza');assert.strictEqual(printed.at(-1)[2].yon,'yatay');
M.yazdir('dilekce');assert.strictEqual(printed.at(-1)[2].yon,'dikey','Yön yalnız imza sirküsünde seçilir.');
assert(printed.every(p=>p[2].baslikGoster===false&&p[2].logoGoster===false&&!/…/.test(p[2].fileName)));
/* başka eğitim yılı: tutanak (2026/70 sayılı Genelge göndermeleri) kapanır */
M.degistir('sinifId','__elle');M.degistir('duzey','7');assert.strictEqual(M.tutanakDurumu(7),'');
win.VeliToplantisiVeri.yil='2025-2026';assert(M.tutanakDurumu(7).includes('2025-2026'));assert.strictEqual(M.yazdir('tutanak'),false);

/* ── yönetici tüm sınıfları görür ── */
const yon=load(['js/modules/sinif-baglam.js','js/modules/veli-toplantisi-veri.js','js/modules/veli-toplantisi.js'],{
  AppStore:{data:t=>store[t]||[],get:k=>k==='session.user'?{admin:true}:undefined,subscribe:()=>()=>{}},
  document:{getElementById:()=>kok,querySelector:()=>null},ReportEngine:{printReport(){}}
});
yon.VeliToplantisiModule.open();
assert(['5/A','1-B','Anasınıfı'].every(s=>kok.innerHTML.includes(`>${s}<`)),'Yönetici tüm sınıfları görür.');
assert.strictEqual(yon.VeliToplantisiModule.ctx().ogretmen,'','Yöneticinin adı öğretmen alanına yazılmaz.');

/* ── kayıt noktaları ── */
const nav=fs.readFileSync('js/core/app-nav.js','utf8'),shell=fs.readFileSync('js/core/shell-ui.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8'),
  ui=fs.readFileSync('js/modules/veli-toplantisi.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8'),kat=fs.readFileSync('js/modules/evrak-katalog.js','utf8');
assert(/\['veli-toplantisi','Veli Toplantısı','users'[^\n]*'veli-toplantisi'\]/.test(nav),'Menüde Veli Toplantısı aracı olmalı.');
{const evrak=nav.slice(nav.indexOf("['evrak','Tutanak ve Evrak'"),nav.indexOf("['personel','Personel İşleri'"));assert(evrak.includes("['veli-toplantisi'")&&!nav.slice(nav.indexOf("['ogrenci','Öğrenciler'"),nav.indexOf("['sinav','Sınav ve Not'")).includes("['veli-toplantisi'"),'Veli Toplantısı "Tutanak ve Evrak" menüsünde (Öğretmen Dosyası yanında), tek yerde durur.');}
assert(shell.includes("name==='veli-toplantisi'")&&shell.includes('VeliToplantisiModule.open'),'Kabukta rota tanımlı olmalı.');
['veli-toplantisi-veri.js?v=2','veli-toplantisi.js?v=4'].forEach(f=>assert(sw.includes(`./js/modules/${f}`)&&shell.includes(f),`${f} hem yüklenmeli hem önbelleğe alınmalı.`));
['veli-toplantisi-word.js?v=1','ogretmen-dosyasi-core.js?v=3'].forEach(f=>assert(sw.includes(`./js/modules/${f}`)&&ui.includes(f),`${f} Word indirme için yüklenmeli ve önbelleğe alınmalı.`));
assert(/\["idari","Veli Toplantısı Evrakları",null,null,\{a:"veli-toplantisi"\}\]/.test(kat)&&/\["rehberlik","Veli Toplantı Tutanakları",null,null,\{a:"veli-toplantisi"\}\]/.test(kat),'Öğretmen Dosyası maddeleri modüle bağlı olmalı.');
assert(!/localStorage\s*\.\s*setItem/.test(ui)&&!/<style|createElement\('style'\)/.test(ui),'Modül depolamaya yazmaz, stil gömmez.');
assert(css.includes('.ka-report .vtp-paper')&&css.includes('#v2ModuleRoot .vtp-page')&&css.includes('#v2ModuleRoot .vtp-ed__madde')&&css.includes('.ka-report .vtp-pbilgi'),'Stiller tasarım sistemi CSS dosyasında olmalı.');
{const a4=css.slice(css.indexOf('/* ===== A4 — Veli Toplantısı'),css.indexOf('/* ===== VELİ TOPLANTISI (vtp-*)'));
 assert(/\.vtp-kararlar\{break-before:page/.test(a4),'Kararlar bölümü yeni sayfadan başlar.');
 assert(/\.vtp-imza\{[^}]*align-items:flex-start[^}]*text-align:left/.test(a4)&&!/\.vtp-imza(?!--sag)[^{]*\{[^}]*(?:align-items:center|align-self:flex-end|text-align:center)/.test(a4)&&!a4.includes('vtp-imzalar--sag'),'Öğretmen/müdür adı blokları solda hizalanır.');
 assert(/\.vtp-pusula \.vtp-imza--sag\{[^}]*align-self:flex-end[^}]*align-items:center[^}]*text-align:center/.test(a4),'Davet pusulasında öğretmen adı/unvanı sağda, birbirine ortalı.');
 assert(/\.vtp-pusula \.vtp-logo\{/.test(a4)&&/\.vtp-pbilgi\{/.test(a4),'Pusula logo ve bilgi şeridi stilleri.');}
assert(!/\d(?:\.\d+)?px/.test(css.slice(css.indexOf('/* ===== A4 — Veli Toplantısı')).replace(/@media\([^)]*\)/g,'')),'Yeni stillerde sabit px olmamalı (ekran kesme noktası hariç); belirteç ya da mm kullanılmalı.');
console.log('Veli Toplantısı testleri geçti.');
