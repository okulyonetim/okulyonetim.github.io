const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function load(files){
  const win={console};
  win.window=win;win.globalThis=win;
  vm.createContext(win);
  for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),win,{filename:f});
  return win;
}
const eq=(a,b,m)=>assert.strictEqual(JSON.stringify(a),JSON.stringify(b),m);
const w=load(['js/modules/idareci-pano-core.js']);
const C=w.IdareciPanoCore;
assert(C,'IdareciPanoCore yüklenmeli.');

/* 26 Ekim 2026 Pazartesi 10:48 — 3. ders (10:30–11:10) */
const NOW=new Date(2026,9,26,10,48,12),TODAY='2026-10-26';
const data={
  ogretmenler:[
    {id:'t1',adSoyad:'Çilem Aydın',aktif:true},
    {id:'t2',adSoyad:'Uygar Halisdemir',aktif:true,derece:3,kademeNo:2,sonrakiTerfiTarihi:'2026-11-05'},
    {id:'t3',adSoyad:'Fatma Şenocak',aktif:true,derece:4,kademeNo:1,sonrakiTerfiTarihi:'2026-10-26'},
    {id:'t4',adSoyad:'Ece Küçük Müldür',aktif:true,sonrakiTerfiTarihi:'2027-03-01'},
    {id:'t5',adSoyad:'Ayşe Boş',aktif:true},
    {id:'t6',adSoyad:'Mehmet Erken',aktif:true},
    {id:'t7',adSoyad:'Pasif Kişi',aktif:false,sonrakiTerfiTarihi:'2026-10-30'}
  ],
  siniflar:[{id:'c1',ad:'1/A',seviye:1,sinifOgretmeniId:'t1'},{id:'c2',ad:'4/A',seviye:4,sinifOgretmeniId:'t2'},{id:'c3',ad:'2/A',seviye:2},{id:'c4',ad:'5/A',seviye:5,sinifOgretmeniId:'t4'}],
  dersProgrami:[
    {gun:'Pazartesi',saat:3,sinif:'1/A',ders:'Hayat Bilgisi',ogretmenId:'t1'},
    {gun:'Pazartesi',saat:3,sinif:'4/A',ders:'Fen Bilimleri',ogretmenId:'t2'},
    {gun:'Pazartesi',saat:1,sinif:'4/A',ders:'Matematik',ogretmenId:'t2'},
    {gun:'Pazartesi',saat:5,sinif:'4/A',ders:'Matematik',ogretmenId:'t2'},
    {gun:'Pazartesi',saat:3,sinif:'5/A',ders:'Türkçe',ogretmenId:'t4'},
    {gun:'Pazartesi',saat:5,sinif:'1/A',ders:'Müzik',ogretmenId:'t5'},
    {gun:'Pazartesi',saat:1,sinif:'1/A',ders:'Resim',ogretmenId:'t5'},
    {gun:'Pazartesi',saat:5,sinif:'2/A',ders:'Oyun',ogretmenId:'t6'},
    {gun:'Salı',saat:3,sinif:'2/A',ders:'Fen',ogretmenId:'t3'}
  ],
  ogretmenIzinleri:[{ogretmenId:'t2',baslangic:'2026-10-26',bitis:'2026-10-28',tur:'Yıllık izin'}],
  nobetYerleri:[{id:'y1',ad:'Bahçe'},{id:'y2',ad:'Bina'},{id:'y3',ad:'Müdür Yardımcısı'}],
  nobetAtamalari:[
    {tarih:TODAY,ogretmenId:'t3',yerId:'y2'},
    {tarih:TODAY,ogretmenId:'t1',yerId:'y1'},
    {tarih:TODAY,ogretmenAdi:'SEDAT KARAGÖZ',yerAdi:'Müdür Yardımcısı'},
    {tarih:'2026-10-27',ogretmenId:'t5',yerId:'y1'}
  ],
  sinavlar:[{tarih:'2026-10-29',saat:'10:00',ad:'Matematik Yazılısı'}],
  denemeSinavlari:[],
  toplantiCizelgesi:[{tarih:'2026-10-27',saat:'15:30',tur:'zumre',kademe:'ilkokul',zumreSeviyeleri:[2,1]}],
  hatirlaticilar:[
    {tarih:'2026-10-28',saat:'09:00',baslik:'Veli toplantısı hazırlığı'},
    {tarih:'2026-10-28',baslik:'Bitmiş iş',tamamlandi:true},
    {tarih:'2026-10-28',baslik:'Uygar Halisdemir yıllık izin'}
  ]
};
const live={
  mode:'lesson',period:3,start:10*3600+30*60,end:11*3600+10*60,remaining:21*60+48,progress:.45,label:'3. Ders',
  segments:[{type:'lesson',period:3,start:37800,end:40200},{type:'break',label:'Teneffüs',start:40200,end:40800},{type:'lesson',period:4,start:40800,end:43200}],index:0
};

/* ── tarih yardımcıları ── */
assert.strictEqual(C.isoOf(NOW),TODAY);
assert.strictEqual(C.dayDiff('2026-10-29',TODAY),3);
assert.strictEqual(C.dayDiff('2026-10-26',TODAY),0);
assert.strictEqual(C.rangeText('2026-10-29','2026-11-04'),'29 Ekim – 4 Kasım');
assert.strictEqual(C.rangeText('2026-10-26','2026-10-28'),'26–28 Ekim');
assert.strictEqual(C.rangeText('2026-10-26','2026-10-26'),'26 Ekim');
assert.strictEqual(C.kalanText(0),'Bugün');assert.strictEqual(C.kalanText(1),'Yarın');assert.strictEqual(C.kalanText(3),'3 gün');
assert.strictEqual(C.hmSec(37800),'10:30');

/* ── şu an ── */
const m=C.snapshot(data,live,NOW);
assert.strictEqual(m.tarih.gun,'Pazartesi');
assert.strictEqual(m.tarih.uzun,'26 Ekim 2026, Pazartesi');
assert.strictEqual(m.canli.title,'3. Ders');
assert.strictEqual(m.canli.aralik,'10:30 – 11:10');
assert.strictEqual(m.canli.progress,45);
assert.strictEqual(m.canli.kalanSn,1308);
assert.strictEqual(m.canli.canli,true);
eq(m.canli.sonraki,{label:'Teneffüs',aralik:'11:10 – 11:20'},'Sıradaki dilim.');
assert.strictEqual(m.donem.p,3);

/* ── sınıflarda şu an ── */
const byClass=Object.fromEntries(m.siniflar.map(s=>[s.sinif,s]));
assert.strictEqual(m.siniflar.length,4);
eq(m.siniflar.map(s=>s.sinif),['1/A','2/A','4/A','5/A'],'Sınıflar doğal sırayla.');
eq(byClass['1/A'],{sinif:'1/A',ders:'Hayat Bilgisi',ogr:'Çilem Aydın',durum:'ders'});
eq(byClass['2/A'],{sinif:'2/A',ders:'Şu an ders yok',ogr:'—',durum:'yok'});
assert.strictEqual(byClass['4/A'].durum,'bos','Öğretmeni izinli sınıf uyarı alır.');
assert.strictEqual(byClass['4/A'].ogr,'Öğretmen izinli');

/* ── öğretmen durumu ── */
const names=a=>a.map(x=>x.ad);
eq(names(m.ogretmenler.oda),['Ayşe Boş'],'1. ve 5. derste dersi olan, şu an boş öğretmen.');
eq(names(m.ogretmenler.gelecek),['Mehmet Erken'],'İlk dersi sonra olan.');
eq(m.ogretmenler.biten,[],'Hiç kimsenin dersi bitmedi.');
assert(!JSON.stringify(m.ogretmenler).includes('Uygar'),'İzinli öğretmen bu listelerde yok.');
assert(!JSON.stringify(m.ogretmenler).includes('Pasif'),'Pasif öğretmen yok.');

/* ── nöbet ── */
eq(m.nobet.amir,['SEDAT KARAGÖZ']);
eq(m.nobet.liste,[{ad:'Çilem Aydın',yer:'Bahçe'},{ad:'Fatma Şenocak',yer:'Bina'}],'Bahçe önce, sonra bina; bugünden başka gün yok.');

/* ── gelmeyenler ── */
eq(m.gelmeyen.liste,[{ad:'Uygar Halisdemir',neden:'Yıllık izin',aralik:'26–28 Ekim'}]);
eq(m.gelmeyen.bosDersler,[{sinif:'4/A',saatler:[1,3,5],ogr:'Uygar Halisdemir'}],'İzinlinin bugünkü dersleri.');
assert.strictEqual(m.kpi.derste,2);
eq(m.kpi.bos,['4/A']);
assert.strictEqual(m.kpi.izinli,1);
assert.strictEqual(m.kpi.sonrakiZil,'11:10');

/* ── teneffüste sıradaki ders gösterilir ── */
const brk=C.snapshot(data,{mode:'break',nextPeriod:4,label:'Teneffüs',start:40200,end:40800,remaining:300,progress:.5,segments:live.segments,index:1},NOW);
assert.strictEqual(brk.donem.p,4);assert.strictEqual(brk.donem.now,false);
assert.strictEqual(brk.canli.canli,false);
/* okul dışı: sınıf ve öğretmen bölümleri boş, çökme yok */
const after=C.snapshot(data,{mode:'after',label:'Okul bitti'},NOW);
eq(after.siniflar,[]);assert.strictEqual(after.ogretmenler,null);assert.strictEqual(after.canli.progress,0);
const empty=C.snapshot({},null,NOW);
eq(empty.nobet,{amir:[],liste:[]});assert.strictEqual(empty.kpi.izinli,0);

/* ── ders programı tablosu ── */
const opt=C.programSecenekleri(data);
eq(opt.ogretmen.map(x=>x.ad).slice(0,2),['Ayşe Boş','Çilem Aydın'],'Öğretmenler Türkçe sıralı, pasif yok.');
assert.strictEqual(opt.ogretmen.some(x=>x.ad==='Pasif Kişi'),false);
const pt=C.programTablosu(data,live,{tur:'ogretmen',id:'t2'},NOW);
eq(pt.saatler[0],{n:3,saat:'10:30–11:10'});
assert.strictEqual(pt.aktif,3);
assert.strictEqual(pt.gunler.length,5);
const mon=pt.gunler[0];
assert.strictEqual(mon.gun,'Pazartesi');assert.strictEqual(mon.bugun,true);
eq(mon.hucre[0],{a:'4/A',b:'Fen Bilimleri',var:true,simdi:true},'Şu anki ders vurgulanır.');
const sinifT=C.programTablosu(data,live,{tur:'sinif',id:'c1'},NOW);
eq(sinifT.gunler[0].hucre[0],{a:'Hayat Bilgisi',b:'Çilem Aydın',var:true,simdi:true},'Sınıf görünümünde öğretmen adı alt satırda.');
/* zil çizelgesi yoksa en büyük ders saatine kadar sütun üretilir */
const noSeg=C.programTablosu(data,null,{tur:'ogretmen',id:'t1'},NOW);
eq(noSeg.saatler.map(s=>s.n),[1,2,3,4,5]);

/* ── terfi ── */
const tf=C.terfiler(data,TODAY,30);
eq(tf.map(x=>x.ad),['Fatma Şenocak','Uygar Halisdemir'],'Yalnız 30 gün içindeki aktif personel, yakından uzağa.');
eq(tf[0],{ad:'Fatma Şenocak',det:'Derece 4 · Kademe 1',tarih:'26 Ekim',kalan:'Bugün',gun:0});
assert.strictEqual(tf[1].kalan,'10 gün');
eq(C.terfiler({ogretmenler:[{id:'x',adSoyad:'A',sonrakiTerfiTarihi:'2026-10-20'}]},TODAY),[],'Geçmiş tarih listelenmez.');

/* ── belirli günler ── */
const gunler=[
  {ad:'Cumhuriyet Bayramı',tarihBaslangic:'2026-10-29',tarihBitis:'2026-10-29',resmi:true},
  {ad:'Kızılay Haftası',tarihBaslangic:'2026-10-29',tarihBitis:'2026-11-04'},
  {ad:'Atatürk’ü Anma Günü',tarihBaslangic:'2026-11-10',tarihBitis:'2026-11-10'},
  {ad:'Dünya Çocuk Günü',tarihBaslangic:'2026-10-20',tarihBitis:'2026-10-24'},
  {ad:'Devam eden hafta',tarihBaslangic:'2026-10-24',tarihBitis:'2026-10-30'}
];
const og=C.ozelGunler(gunler,TODAY,14,4);
eq(og.map(x=>x.ad),['Devam eden hafta','Cumhuriyet Bayramı','Kızılay Haftası'],'Süren, sonra yaklaşan; 14 günden uzak ve bitmiş olan yok.');
assert.strictEqual(og[0].kalan,'Sürüyor');
assert.strictEqual(og[1].tarih,'29 Ekim · resmî');assert.strictEqual(og[1].kalan,'3 gün');
assert.strictEqual(C.ozelGunler(gunler,TODAY,14,2).length,2,'En çok max kadar.');

/* ── olaylar / yaklaşanlar / geri sayım ── */
const ev=C.olaylar(data,gunler);
assert(ev.some(e=>e.tur==='toplanti'&&e.ad==='Zümre: 1. Sınıf, 2. Sınıf'),'Zümre başlığı sınıf seviyelerini sıralı yazar.');
assert(ev.some(e=>e.tur==='ozel'&&e.tarih==='2026-10-31'&&e.ad==='Kızılay Haftası'),'Çok günlü belirli gün her güne yayılır.');
const yak=C.yaklasanlar(ev,TODAY,14,4);
eq(yak.map(x=>x.ad),['Zümre: 1. Sınıf, 2. Sınıf','Veli toplantısı hazırlığı','Matematik Yazılısı'],'Yaklaşanlarda belirli gün yok; tamamlanan ve izin hatırlatıcısı yok; tarihe göre sıralı.');
eq(yak[0],{ad:'Zümre: 1. Sınıf, 2. Sınıf',zaman:'27 Ekim · 15:30',kalan:'Yarın',tur:'toplanti'});
const gs=C.geriSayim([{ad:'LGS',tarih:'2027-06-13'},{ad:'Gizli',tarih:'2026-11-01',goster:false},{ad:'Geçmiş',tarih:'2026-10-01'}],TODAY);
assert.strictEqual(gs.ad,'LGS');assert.strictEqual(gs.gun,230);
assert.strictEqual(C.geriSayim([],TODAY),null);

/* ── ay takvimi ── */
const cal=C.ayTakvimi(2026,9,ev,TODAY);
assert.strictEqual(cal.baslik,'Ekim 2026');
assert.strictEqual(cal.hucreler.length%7,0);
assert.strictEqual(cal.hucreler[0].iso,'2026-09-28','Ekim 2026 Perşembe başlar → hafta Pazartesi’den.');
assert.strictEqual(cal.hucreler.filter(h=>h.bugun).length,1);
assert.strictEqual(cal.hucreler.find(h=>h.iso==='2026-10-29').isaret>=2,true,'Sınav + belirli gün aynı günde.');
assert.strictEqual(cal.hucreler.find(h=>h.iso==='2026-10-03').haftaSonu,true);
eq(C.gunOlaylari(ev,'2026-10-27').map(o=>o.tur).sort(),['ozel','toplanti'],'Gün seçilince o günün toplantısı ve belirli günü gelir.');

/* ── rehber öğretmenler ── */
const rh=C.rehberler(data);
eq(rh.map(x=>[x.sinif,x.ad,x.kademe]),[['1/A','Çilem Aydın','ilk'],['2/A','','ilk'],['4/A','Uygar Halisdemir','ilk'],['5/A','Ece Küçük Müldür','orta']]);

/* ── paylaşım metni ── */
const txt=C.ozetMetni(m,'Koruk İlk-Ortaokulu');
assert(txt.startsWith('Koruk İlk-Ortaokulu — İdareci Pano\n26 Ekim 2026, Pazartesi'));
assert(txt.includes('Nöbetçi idareci: SEDAT KARAGÖZ'));
assert(txt.includes('Gelmeyenler: Uygar Halisdemir — Yıllık izin'));
assert(txt.includes('Dersi boş sınıf: 4/A'));

/* ── bağlantılar: araç kataloğu, alt menü, rota, öğretmen formu, stil ── */
const nav=fs.readFileSync('js/core/app-nav.js','utf8');
assert(/\['idareci-pano','İdareci Pano','[a-z]+','[a-z]+','[^']+','idareci-pano'\]/.test(nav),'Araç kataloğunda İdareci Pano rotası olmalı.');
assert(/idareci:\{\s*bar:\['home','menu:okul','tools','tool:idareci-pano','me'\]/.test(nav),'İdareci varsayılan alt menüsünde İdareci Pano olmalı.');
assert(/M\('okul','Okul','school','indigo',\['idareci-pano'/.test(nav),'İdareci Pano Okul menüsünde de bulunmalı.');
assert(/TEACHER_HIDDEN=new Set\(\['idareci-pano:'/.test(nav),'Öğretmen hesabına kapalı olmalı (izin ve terfi bilgisi içerir).');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
assert(/name==='idareci-pano'[\s\S]{0,400}IdareciPano\.open\(\)/.test(shell),'Kabukta idareci-pano rotası modülü açmalı.');
const people=fs.readFileSync('js/modules/people-directory.js','utf8');
assert(/name="sonrakiTerfiTarihi"/.test(people)&&/sonrakiTerfiTarihi:str\(fd,'sonrakiTerfiTarihi'\)/.test(people),'Öğretmen formunda “Sonraki terfi tarihi” alanı kaydedilmeli.');
const css=fs.readFileSync('css/design-system-base.css','utf8');
assert(css.includes('/* ===== İDARECİ PANO'),'İdareci Pano stil bloğu olmalı.');
const ui=fs.readFileSync('js/modules/idareci-pano.js','utf8');
assert(!/localStorage\.setItem/.test(ui),'Modül doğrudan localStorage yazmamalı (KaPrefs kullanılır).');

console.log('İdareci Pano çekirdek testi geçti.');
