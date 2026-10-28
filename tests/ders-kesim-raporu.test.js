/* Ders Kesim Raporu: mantık, belge gövdesi ve uygulama bağlantıları */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const coreSrc=read('js/modules/ders-kesim-core.js'),uiSrc=read('js/modules/ders-kesim.js'),nav=read('js/core/app-nav.js'),shell=read('js/core/shell-ui.js'),katalog=read('js/modules/evrak-katalog.js'),sw=read('service-worker.js'),css=read('css/design-system-base.css');
const ctx={console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(coreSrc,ctx);
const C=ctx.DersKesimCore,J=x=>JSON.parse(JSON.stringify(x));
new Function(uiSrc);

/* dönem tahmini: Eylül–Ocak 1., Şubat–Ağustos 2. */
assert.deepStrictEqual(J([[2026,8,14],[2026,9,28],[2026,11,31],[2027,0,15],[2027,1,8],[2027,4,10],[2027,5,20],[2027,7,31]].map(([y,m,d])=>C.varsayilanDonem(new Date(y,m,d)))),['1','1','1','1','2','2','2','2'],'Varsayılan dönem.');
assert.deepStrictEqual(J(['1','2',1,2,'3','',null,'x'].map(C.donemNo)),['1','2','1','2','1','1','1','1'],'Dönem yalnız 1 ya da 2.');

/* ders programından satırlar */
const program=[
 {id:'a',ogretmenId:'t1',sinif:'5-B',ders:'Matematik',gun:'Pazartesi',saat:1},
 {id:'b',ogretmenId:'t1',sinif:'5-A',ders:'Matematik',gun:'Salı',saat:2},
 {id:'c',ogretmenId:'t1',sinif:'5-A',ders:'Matematik',gun:'Çarşamba',saat:3},
 {id:'d',ogretmenId:'t2',sinif:'5-A',ders:'Fen Bilimleri',gun:'Salı',saat:4},
 {id:'e',ogretmenId:'t1',sinif:'10-A',ders:'Fizik',gun:'Salı',saat:5},
 {id:'f',ogretmenId:'t1',sinif:'5-A',ders:'Fen Bilimleri',gun:'Cuma',saat:1},
 {id:'g',ogretmenId:'t1',sinif:'',ders:'Boş sınıf'},{id:'h',ogretmenId:'t1',sinif:'6-A',ders:' '},null
];
assert.deepStrictEqual(J(C.programSatirlari(program,'t1')),[
 {sinif:'5-A',ders:'Fen Bilimleri',durum:C.DURUM},{sinif:'5-A',ders:'Matematik',durum:C.DURUM},{sinif:'5-B',ders:'Matematik',durum:C.DURUM},{sinif:'10-A',ders:'Fizik',durum:C.DURUM}
],'Öğretmenin sınıf-ders çiftleri bir kez, sınıf sırasıyla (10-A, 5-A’dan sonra), sonra ders adıyla.');
assert.deepStrictEqual(J(C.programSatirlari(program,'t2')).map(r=>r.ders),['Fen Bilimleri'],'Başka öğretmenin satırı karışmaz.');
assert.deepStrictEqual(J(C.programSatirlari(program,'')),[],'Öğretmen yoksa satır yok.');
assert.deepStrictEqual(J(C.programSatirlari(null,'t1')),[]);
assert.strictEqual(C.DURUM,'Müfredata uygun tamamlanmıştır.');

/* metin biçimleri */
assert.strictEqual(C.tarihMetni('2026-10-28'),'28.10.2026');
assert.strictEqual(C.tarihMetni(''),'………………','Tarih yoksa noktalı.');
assert.strictEqual(C.muhatap('Koruk İlk - Ortaokulu'),'KORUK İLK - ORTAOKULU MÜDÜRLÜĞÜNE');
assert.strictEqual(C.muhatap('Koruk Ortaokulu Müdürlüğü'),'KORUK ORTAOKULU MÜDÜRLÜĞÜNE','Müdürlüğü eki tekrarlanmaz.');
assert.strictEqual(C.muhatap(''),'……………………… MÜDÜRLÜĞÜNE');

/* belge */
const m={okul:'Koruk İlk - Ortaokulu',yil:'2026-2027',donem:'2',belgeTarihi:'2027-06-18',ogretmen:'Ayşe KAYA',mudur:'Bilal BAYKAR',satirlar:C.programSatirlari(program,'t1')};
const b=C.belge(m);
assert(b.includes('DERS KESİM RAPORU')&&b.includes('KORUK İLK - ORTAOKULU MÜDÜRLÜĞÜNE'),'Başlık ve muhatap.');
assert(b.includes('2026-2027 Eğitim-Öğretim yılının 2. Döneminde ders verdiğim sınıflara ait ders kesim durumu aşağıdadır. Bilgilerinize arz ederim.'),'Gövde metni.');
assert(b.includes('Ayrıntılı Ders Kesim Durumu')&&['No','Sınıf','Ders Adı','Durum'].every(t=>b.includes(`<th>${t}</th>`)),'Tablo başlıkları.');
assert((b.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr/g)||[]).length===4,'Satır sayısı kadar satır.');
assert(b.includes('<td class="dkr-orta">1</td><td class="dkr-orta">5-A</td><td>Fen Bilimleri</td><td>Müfredata uygun tamamlanmıştır.</td>'),'İlk satır.');
assert(b.includes('18.06.2027')&&b.includes('Okul Müdürü</b><span>Bilal BAYKAR')&&b.includes('Ders Öğretmeni</b><span>Ayşe KAYA'),'Tarih ve imzalar.');
assert(b.indexOf('Okul Müdürü')<b.indexOf('Ders Öğretmeni'),'Müdür solda, öğretmen sağda.');
assert(C.belge({...m,donem:'1'}).includes('1. Döneminde')&&C.belge({...m,donem:'9'}).includes('1. Döneminde'),'Dönem 1’e düşer.');
/* durum satır satır değişir; boş durum boş hücre */
const farkli=C.belge({...m,satirlar:[{sinif:'5-A',ders:'Matematik',durum:'1. ünite işlendi'},{sinif:'5-B',ders:'Fen',durum:''}]});
assert(farkli.includes('<td>1. ünite işlendi</td>')&&farkli.includes('<td>Fen</td><td></td>'),'Satır durumu olduğu gibi yazılır.');
/* boş form: 3 boş satır, noktalı alanlar */
const bos=C.belge({});
assert((bos.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr/g)||[]).length===3,'Boş formda 3 boş satır.');
assert(/>…{4,} Eğitim-Öğretim yılının 1\. Döneminde/.test(bos)&&/dkr-muhatap">…{4,} MÜDÜRLÜĞÜNE/.test(bos)&&(bos.match(/<span>…{4,}<\/span>/g)||[]).length===2,'Eksik bilgiler noktalı kalır.');
/* kaçış */
const xss=C.belge({...m,ogretmen:'<img src=x>',satirlar:[{sinif:'<b>',ders:'"&',durum:"'"}]});
assert(!xss.includes('<img')&&!xss.includes('<b>5')&&xss.includes('&lt;img src=x&gt;')&&xss.includes('&quot;&amp;'),'Metinler kaçışlanır.');

/* uygulama bağlantıları */
assert(/\['ders-kesim','Ders Kesim Raporu','doc'[^\]]*'ders-kesim'\]/.test(nav),'Tutanak ve Evrak menüsünde yer almalı.');
assert(nav.includes("'ders-kesim':'📝'")&&nav.includes("'ders-kesim':'ders kesim raporu"),'Simge ve arama anahtar sözcükleri.');
assert(/if\(name==='ders-kesim'\)\{[\s\S]*?DersKesimModule\.open\(\)/.test(shell)&&shell.includes('ders-kesim-core.js?v=1')&&shell.includes('ders-kesim.js?v=1'),'Rota modülü yükleyip açmalı.');
assert((katalog.match(/\{a:"ders-kesim"\}/g)||[]).length===2,'Öğretmen Dosyası’ndaki iki ders kesim maddesi sayfaya bağlanmalı.');
assert(sw.includes('ders-kesim-core.js?v=1')&&sw.includes('ders-kesim.js?v=1'),'Önbelleğe alınmalı.');
assert(!/localStorage\.setItem/.test(coreSrc+uiSrc)&&!/<style/i.test(coreSrc+uiSrc)&&!/style="/.test(coreSrc+uiSrc),'Modül depolama yazmaz, stil gömmez.');
/* yazdırma: her sayfada üst/alt boşluk, özelleştirme penceresi açılmaz (resmî form) */
const yz=uiSrc.slice(uiSrc.indexOf('function yazdir('),uiSrc.indexOf('function temizle('));
assert(/kenarBosluk:10/.test(yz)&&/akis:true/.test(yz)&&/yon:'dikey'/.test(yz)&&/ozellestirilebilir:false/.test(yz),'Çıktı 10 mm boşluklu akış kipinde, özelleştirmesiz basılır.');
/* CSS */
const bas=css.indexOf('/* ===== A4 — Ders Kesim Raporu (.dkr-*)'),son=css.indexOf('/* ===== A4 — Yazılı Sınav Takvimi (.kwr-*)');
assert(bas>0&&son>bas,'dkr-* stil bloğu var.');
const dkr=css.slice(bas,son),pxSiz=dkr.replace(/@media\([^)]*\)\{[\s\S]*?\n\}/g,'');
assert(!/\d(?:\.\d+)?px/.test(pxSiz)&&!/#[0-9a-fA-F]{3,8}\b/.test(dkr),'Stiller sabit px / renk içermemeli (px yalnız @media).');
assert(/\.dkr-imzalar\{[^}]*justify-content:space-between/.test(dkr)&&/\.dkr-tarih\{[^}]*text-align:right/.test(dkr)&&/\.dkr-baslik\{[^}]*text-align:center/.test(dkr),'Başlık ortada, tarih sağda, imzalar iki uçta.');
assert(/\.dkr-tablo thead\{display:table-header-group\}/.test(dkr),'Başlık satırı her sayfada tekrarlanır.');
console.log('ders-kesim-raporu: OK');
