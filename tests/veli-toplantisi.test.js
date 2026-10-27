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

/* ── metin verisi: Word paketlerinden gelen 5–8. sınıf metinleri tam, 1–4. sınıf yalnız gündem ── */
const dataWin=load(['js/modules/veli-toplantisi-veri.js']);
const V=dataWin.VeliToplantisiVeri;
assert.strictEqual(V.yil,'2026-2027');assert.strictEqual(V.donem,'I. Dönem');
eq(Object.keys(V.duzeyler),['1','2','3','4','5','6','7','8']);
eq([1,2,3,4,5,6,7,8].map(n=>V.duzeyler[n].gundem.length),[16,15,15,15,15,15,15,16]);
for(const n of [1,2,3,4]){const d=V.duzeyler[n];assert.strictEqual(d.unvan,'Sınıf Öğretmeni');assert(!d.gorusme&&!d.kararlar,`${n}. sınıf için tutanak metni gönderilmedi; uydurulmamalı.`)}
for(const n of [5,6,7,8]){
  const d=V.duzeyler[n];
  assert.strictEqual(d.unvan,'Şube Rehber Öğretmeni');
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
const win=load(['js/modules/veli-toplantisi-veri.js','js/modules/veli-toplantisi.js'],{
  AppStore:{data:t=>store[t]||[],get:k=>k==='session.user'?kullanici:undefined,subscribe:()=>()=>{}},
  document:{getElementById:()=>kok,querySelector:()=>null},
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
h=M.belge('pusula',M.ctx()).replace(/\u00a0/g,' ');assert.strictEqual((h.match(/class="vtp-pusula"/g)||[]).length,3);assert(h.includes('Öğrenci: Ali Yılmaz')&&h.includes('5/A sınıfı veli toplantımız 05 / 11 / 2026 tarihinde saat 14:30'));

/* 1–4. sınıf: dilekçe, imza ve pusula hazır; tutanak metni yok (başka öğretmen: 1-B ve Anasınıfı onun sınıfları) */
kullanici.bagliOgretmenId='t9';M.reset();M.open();
assert(kok.innerHTML.includes('>1-B<')&&kok.innerHTML.includes('>Anasınıfı<')&&!kok.innerHTML.includes('>5/A<'),'Öğretmen yalnız kendi sınıflarını görür.');
M.degistir('sinifId','c1b');
c=M.ctx();assert.strictEqual(c.duzey,1);assert.strictEqual(c.okul,'Koruk İlkokulu');assert.strictEqual(c.ogretmen,'Veli HOCA','Sınıfın öğretmeni sınıftan gelir.');
t=duz(M.belge('dilekce',c));assert(t.includes('KORUK İLKOKULU MÜDÜRLÜĞÜNE')&&t.includes('1-B sınıfı velileriyle')&&t.includes('Veli HOCA')&&t.includes('Sınıf Öğretmeni'));
assert.strictEqual((M.belge('dilekce',c).match(/<li>/g)||[]).length,16);
assert(M.tutanakDurumu(1).includes('1. sınıf tutanak metni henüz eklenmedi'));
assert.strictEqual(M.yazdir('tutanak'),false);assert.strictEqual(printed.length,0,'Metni olmayan tutanak yazdırılmaz.');
M.render();assert(/data-vtp-yazdir="tutanak"[^>]*disabled/.test(kok.innerHTML)&&/data-vtp-yazdir="dilekce"(?![^>]*disabled)/.test(kok.innerHTML));

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
M.degistir('yon','yatay');M.yazdir('imza');assert.strictEqual(printed.at(-1)[2].yon,'yatay');
M.yazdir('dilekce');assert.strictEqual(printed.at(-1)[2].yon,'dikey','Yön yalnız imza sirküsünde seçilir.');
assert(printed.every(p=>p[2].baslikGoster===false&&p[2].logoGoster===false&&!/…/.test(p[2].fileName)));
/* başka eğitim yılı: tutanak (2026/70 sayılı Genelge göndermeleri) kapanır */
M.degistir('sinifId','__elle');M.degistir('duzey','7');assert.strictEqual(M.tutanakDurumu(7),'');
win.VeliToplantisiVeri.yil='2025-2026';assert(M.tutanakDurumu(7).includes('2025-2026'));assert.strictEqual(M.yazdir('tutanak'),false);

/* ── yönetici tüm sınıfları görür ── */
const yon=load(['js/modules/veli-toplantisi-veri.js','js/modules/veli-toplantisi.js'],{
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
assert(shell.includes("name==='veli-toplantisi'")&&shell.includes('VeliToplantisiModule.open'),'Kabukta rota tanımlı olmalı.');
['veli-toplantisi-veri.js?v=1','veli-toplantisi.js?v=1'].forEach(f=>assert(sw.includes(`./js/modules/${f}`)&&shell.includes(f),`${f} hem yüklenmeli hem önbelleğe alınmalı.`));
assert(/\["idari","Veli Toplantısı Evrakları",null,null,\{a:"veli-toplantisi"\}\]/.test(kat)&&/\["rehberlik","Veli Toplantı Tutanakları",null,null,\{a:"veli-toplantisi"\}\]/.test(kat),'Öğretmen Dosyası maddeleri modüle bağlı olmalı.');
assert(!/localStorage\s*\.\s*setItem/.test(ui)&&!/<style|createElement\('style'\)/.test(ui),'Modül depolamaya yazmaz, stil gömmez.');
assert(css.includes('.ka-report .vtp-paper')&&css.includes('#v2ModuleRoot .vtp-page'),'Stiller tasarım sistemi CSS dosyasında olmalı.');
assert(!/\d(?:\.\d+)?px/.test(css.slice(css.indexOf('/* ===== A4 — Veli Toplantısı')).replace(/@media\([^)]*\)/g,'')),'Yeni stillerde sabit px olmamalı (ekran kesme noktası hariç); belirteç ya da mm kullanılmalı.');
console.log('Veli Toplantısı testleri geçti.');
