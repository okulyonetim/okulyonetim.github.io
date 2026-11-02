const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const JSZip=require('../assets/vendor/jszip.min.js');
const zip=require('./helpers/zip');

/* Sosyal Kulüpler: hazır kulüp kataloğu (data/kulup), mantık (kulup-core), Word çıktısı (kulup-dosya + assets/kulup/sablon) ve kayıt noktaları. */
const J=x=>JSON.parse(JSON.stringify(x));
const dosyaAl=async u=>{const p=String(u).replace(/^\.\//,'');if(!fs.existsSync(p))return{ok:false,status:404};const b=fs.readFileSync(p);return{ok:true,status:200,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
const win={console,JSZip,Blob,URL,setTimeout,clearTimeout,fetch:dosyaAl};win.window=win;win.globalThis=win;vm.createContext(win);
['ogretmen-dosyasi-core','kulup-core','kulup-dosya'].forEach(f=>vm.runInContext(fs.readFileSync(`js/modules/${f}.js`,'utf8'),win,{filename:f}));
const K=win.KulupCore,D=win.KulupDosya,O=win.OgretmenDosyasiCore;

(async()=>{
/* ── katalog: Siberay ── */
const katalog=JSON.parse(fs.readFileSync('data/kulup/katalog.json','utf8')),paket=JSON.parse(fs.readFileSync('data/kulup/siberay.json','utf8'));
assert.deepStrictEqual(J(katalog.kulupler.map(k=>k.id)),['siberay']);
assert.deepStrictEqual(J(katalog.kulupler[0].sayilar),{madde:23,hafta:41,toplumHizmeti:10,aylik:10});
assert.strictEqual(paket.tuzuk.length,23);assert.strictEqual(paket.yillikPlan.satirlar.length,41);assert.strictEqual(paket.toplumHizmeti.length,10);assert.strictEqual(paket.aylikRaporlar.length,10);
assert.deepStrictEqual(J(paket.aylikRaporlar.map(r=>r.ay)),J(K.AYLAR),'Aylık raporlar Eylül–Haziran sırasıyla.');
assert.strictEqual(paket.yilSonu.aylar.length,10);assert.strictEqual(paket.donemSonu.aylar.length,5);
assert(paket.aylikRaporlar.every(r=>r.satirlar.length&&r.satirlar.every(x=>x.tarih&&x.ozet)),'Her aylık raporda dolu satırlar olmalı.');
assert.strictEqual(paket.tema.kod,'B');assert.strictEqual(paket.tema.ad,'Bilim');assert(paket.tema.altHedefler.length>=5&&paket.tema.altHedefler.every(h=>/^[A-Z]+\.\d/.test(h.kod)&&h.ad));
assert(paket.yillikPlan.satirlar.every(r=>r.ay&&r.hafta&&r.tarih),'Plan satırlarında ay, hafta ve tarih dolu.');
assert(paket.yilSonu.b&&paket.yilSonu.c&&paket.yilSonu.d&&paket.donemSonu.b,'Hazır değerlendirme metinleri gelir.');

/* ── eşleşme ── */
assert.strictEqual(K.katalogBul({id:'a',ad:'Siberay'},katalog)?.id,'siberay');
assert.strictEqual(K.katalogBul({id:'a',ad:'Siberay Kulübü'},katalog)?.id,'siberay');
assert.strictEqual(K.katalogBul({id:'a',kulupAdi:'SİBERAY KULÜBÜ (TYMM)'},katalog)?.id,'siberay');
assert.strictEqual(K.katalogBul({id:'a',ad:'Satranç Kulübü'},katalog),null);
assert.strictEqual(K.katalogBul({id:'a',ad:'Siberayan Kültür'},katalog)?.id,undefined,'Yalnız tam sözcük eşleşir.');
assert.strictEqual(K.katalogBul({id:'k9',ad:'Satranç'},katalog,{k9:'siberay'})?.id,'siberay','Elle eşleme önceliklidir.');
assert.strictEqual(K.kulupAdi('Siberay'),'Siberay Kulübü');assert.strictEqual(K.kulupAdi('Siberay Kulübü'),'Siberay Kulübü');assert.strictEqual(K.kulupYonelme('Siberay'),'Siberay Kulübüne');

/* ── yetki, üyeler, durum ── */
assert.strictEqual(K.kulupBenim({ogretmenIdler:['t1','t2']},'t2'),true);assert.strictEqual(K.kulupBenim({ogretmenIdler:['t1']},'t2'),false);assert.strictEqual(K.kulupBenim({ogretmenIdler:['t1']},''),false);
let durum=K.bosDurum();
K.ayarla(durum,'gorev:o1','Kulüp Başkanı',10);K.ayarla(durum,'gorev:o2','Sekreter',10);
const siniflar=[{id:'s1',ad:'5/A'},{id:'s2',ad:'6/B'},{id:'s3',ad:'10/A'}];
const veliler=[{id:'o1',ogrenciAdi:'Zeynep Demir',sinifId:'s2',kulupId:'k1'},{id:'o2',ogrenciAdi:'Mehmet Kaya',sinifId:'s1',kulupId:'k1'},{id:'o3',ogrenciAdi:'Ali Yılmaz',sinifId:'s1',kulupId:'k1'},{id:'o4',ogrenciAdi:'Başka',sinifId:'s1',kulupId:'k2'},{id:'o5',ogrenciAdi:'Ece Su',sinifId:'s3',kulupId:'k1'}];
const uyeler=K.uyeler('k1',veliler,siniflar,durum);
assert.deepStrictEqual(J(uyeler.map(u=>u.ad)),['Ali Yılmaz','Mehmet Kaya','Zeynep Demir','Ece Su'],'Sınıfa (sayısal), sonra ada göre sıralı; başka kulübün öğrencisi yok.');
assert.strictEqual(K.gorevAdi(uyeler,'baskan',durum,'baskan'),'Zeynep Demir');assert.strictEqual(K.gorevAdi(uyeler,'sekreter',durum,'sekreter'),'Mehmet Kaya');
K.ayarla(durum,'baskan','Elle Yazılan',11);assert.strictEqual(K.gorevAdi(uyeler,'baskan',durum,'baskan'),'Elle Yazılan','Elle yazılan alan öncelikli.');
const a=K.bosDurum(),b=K.bosDurum();K.ayarla(a,'x','eski',1);K.ayarla(a,'y','yalnız a',1);K.ayarla(b,'x','yeni',2);
const m=K.durumBirlestir(a,b);assert.strictEqual(K.deger(m,'x'),'yeni');assert.strictEqual(K.deger(m,'y'),'yalnız a');assert(K.durumAyni(m,K.durumBirlestir(b,a)));
assert.deepStrictEqual(J(K.durumTemizle({k:{ok:{v:'1',t:5},kotu:{v:'1'}}}).k),{ok:{v:'1',t:5}},'Zaman damgasız girdi atılır.');
assert.strictEqual(K.egitimYili(new Date(2026,9,1)),'2026-2027');assert.strictEqual(K.egitimYili(new Date(2027,5,1)),'2026-2027');
assert(/^kulup_k_1_2026_2027$/.test(K.durumAnahtari('k-1','2026-2027')));

/* ── Word çıktıları ── */
const okul={okul:'Atatürk Ortaokulu',il:'Ankara',ilce:'Çankaya',mudur:'Ali Veli',yil:'2026-2027',danismanlar:['Ayşe Öğretmen'],kulup:{id:'k1',ad:'Siberay'},uyeler,paket};
K.ayarla(durum,'toplantiTarihi','2026-09-21',12);K.ayarla(durum,'toplantiYeri','Fen Laboratuvarı',12);K.ayarla(durum,'toplantiNo','2',12);
K.ayarla(durum,'d1katilim:EYLÜL','24 öğrenci',12);K.ayarla(durum,'d1sonuc:EYLÜL','Başarılı',12);K.ayarla(durum,'d2katilim:MART','19 öğrenci',12);
K.ayarla(durum,'ygenel','Yıl sonu özel metni.',12);K.ayarla(durum,'denetleme1','Deniz Kurt',12);K.ayarla(durum,'inceleme','2027-01-15',12);K.ayarla(durum,'yRaporTarihi','2027-06-18',12);
const b0={...okul,durum};
const metin=x=>x.replace(/<w:br\/>/g,'\n').replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
function dengeli(xml,ad){
 const st=[];for(const t of xml.match(/<[^>!?][^>]*>/g)||[]){if(/\/>$/.test(t))continue;const n=/^<\/?([A-Za-z0-9:_.-]+)/.exec(t)[1];if(t[1]==='/'){assert.strictEqual(st.pop(),n,`${ad}: kapanış etiketi uyumsuz (${n})`)}else st.push(n)}
 assert.strictEqual(st.length,0,`${ad}: açık etiket kaldı`);
}
async function uret(kod,girdi,bag=b0){
 const {blob,ad}=await D.olustur(kod,bag,girdi);const dosyalar=zip.oku(Buffer.from(await blob.arrayBuffer()));
 const xml=dosyalar['word/document.xml'].toString('utf8');
 return{ad,xml,metin:metin(xml),dosyalar};
}
const sonuc={};
for(const bl of K.BELGELER){
 const girdi=bl.k==='donem'||bl.k==='denetleme'?{donem:1}:{};
 const o=sonuc[bl.k]=await uret(bl.k,girdi);
 assert(/^[A-Za-z0-9_.-]+\.docx$/.test(o.ad),`${bl.k}: dosya adı ASCII olmalı (${o.ad})`);assert(o.ad.startsWith('Siberay_Kulubu_'));
 for(const ad of Object.keys(o.dosyalar).filter(n=>/^word\/(document|header\d*|footer\d*)\.xml$/.test(n))){
  const x=o.dosyalar[ad].toString('utf8');
  assert(!/\{\{|\}\}|\[\[|\]\]/.test(x),`${bl.k}/${ad}: doldurulmamış alan kaldı`);dengeli(x,`${bl.k}/${ad}`);
 }
 /* A4 ve her bölümde üst/alt boşluk ≥ 15 mm (851 twip) */
 const sayfalar=[...o.xml.matchAll(/<w:pgSz[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"[^>]*\/>/g)];assert(sayfalar.length,`${bl.k}: sayfa boyutu`);
 const a4=(v,hedef)=>Math.abs(Number(v)-hedef)<=2;
 sayfalar.forEach(([,w,h])=>assert((a4(w,11906)&&a4(h,16838))||(a4(w,16838)&&a4(h,11906)),`${bl.k}: A4 olmalı (${w}x${h})`));
 const kenarlar=[...o.xml.matchAll(/<w:pgMar([^>]*)\/>/g)];assert(kenarlar.length,`${bl.k}: kenar boşlukları`);
 kenarlar.forEach(([,k])=>{const ust=Number(/w:top="(-?\d+)"/.exec(k)[1]),alt=Number(/w:bottom="(-?\d+)"/.exec(k)[1]);assert(ust>=851&&alt>=851,`${bl.k}: üst/alt boşluk en az 15 mm olmalı (${ust}/${alt})`)});
 /* ortak alanlar */
 assert(/Atatürk Ortaokulu|ATATÜRK ORTAOKULU/.test(o.metin),`${bl.k}: okul adı`);
 assert(/Siberay|SİBERAY/.test(o.metin),`${bl.k}: kulüp adı`);
}
const t=k=>sonuc[k].metin;
/* tüzük */
assert.strictEqual((t('tuzuk').match(/MADDE \d+ –/g)||[]).length,23);assert(t('tuzuk').includes('Ayşe ÖĞRETMEN')&&t('tuzuk').includes('Ali VELİ'));
/* yıllık plan: tema, alt hedef kodları, 41 hafta */
assert(t('plan').includes('Bilim (B)'));paket.tema.altHedefler.forEach(h=>assert(t('plan').includes(h.kod),`Alt hedef kodu ${h.kod} planda olmalı`));
assert((sonuc.plan.xml.match(/<w:tr[ >]/g)||[]).length>=42,'Başlık + 41 hafta satırı.');
assert(t('plan').includes(paket.yillikPlan.satirlar[0].amac.slice(0,30)));
/* toplum hizmeti */
paket.toplumHizmeti.forEach(r=>assert(t('toplum').includes(r.amac.slice(0,25))));
/* tutanak: davet + tutanak + karar (3 sayfa), girilen toplantı bilgileri */
assert.strictEqual((sonuc.tutanak.xml.match(/<w:pageBreakBefore\/>/g)||[]).length,2,'Tutanak 3 sayfa.');
assert(t('tutanak').includes('21.09.2026')&&t('tutanak').includes('Fen Laboratuvarı'));assert(t('tutanak').includes('Elle Yazılan')&&t('tutanak').includes('Mehmet Kaya'),'Kulüp temsilcisi elle yazılandan, sekreter üye görevinden gelir.');
/* üye listesi: sıralı öğrenciler, en az 25 satır */
{const x=t('uyeler'),sira=['Ali Yılmaz','Mehmet Kaya','Zeynep Demir','Ece Su'].map(n=>x.indexOf(n));assert(sira.every(i=>i>=0)&&sira.every((v,i)=>!i||v>sira[i-1]),'Üyeler sınıf ve ada göre sıralı yazılır.');
 assert((sonuc.uyeler.xml.match(/<w:tr[ >]/g)||[]).length>=26,'Başlık + en az 25 satır.');assert(x.includes('Elle Yazılan'),'Başkan elle yazılan alandan.');}
/* aylık raporlar: bütün aylar tek dosyada = 10 bölüm; tek ay = 1 */
{const hepsi=await uret('aylik',{});assert.strictEqual((hepsi.metin.match(/AYLIK FAALİYET RAPORU/g)||[]).length,10);K.AYLAR.forEach(ay=>assert(hepsi.metin.includes(`${ay} AYLIK FAALİYET RAPORU`),`${ay} raporu`));
 assert.strictEqual((hepsi.xml.match(/<w:pageBreakBefore\/>/g)||[]).length,9);
 const ekim=await uret('aylik',{aylar:['EKİM']});assert.strictEqual((ekim.metin.match(/AYLIK FAALİYET RAPORU/g)||[]).length,1);assert(ekim.metin.includes('EKİM AYLIK')&&ekim.ad.endsWith('_EKIM.docx'));assert(ekim.metin.includes('Rapor No: 2'));
 assert(ekim.metin.includes(paket.aylikRaporlar[1].satirlar[0].ozet.slice(0,30)));}
/* dönem sonu: dönemin ayları + katılım/sonuç; yıl sonu: 10 ay + özel metin */
assert(t('donem').includes('EYLÜL')&&t('donem').includes('OCAK')&&!t('donem').includes('HAZİRAN'));assert(t('donem').includes('24 öğrenci')&&t('donem').includes('Başarılı')&&t('donem').includes('1. Dönem'));
assert(t('donem').includes(paket.donemSonu.b.slice(0,30)),'Kazanımlar hazır metinle gelir.');
{const d2=await uret('donem',{donem:2});assert(d2.metin.includes('HAZİRAN')&&d2.metin.includes('ŞUBAT')&&!d2.metin.includes('EYLÜL'));assert(d2.metin.includes('19 öğrenci')&&!d2.metin.includes('24 öğrenci'),'Katılım dönem başına ayrı tutulur.');assert(d2.ad.includes('2_Donem'));}
K.AYLAR.forEach(ay=>assert(t('yil').includes(ay),`Yıl sonu ${ay}`));assert(t('yil').includes('Yıl sonu özel metni.')&&!t('yil').includes(paket.yilSonu.b.slice(0,30)),'Öğretmenin yazdığı değerlendirme hazır metnin yerine geçer.');assert(t('yil').includes('18.06.2027'));
/* denetleme */
assert(t('denetleme').includes('1. Dönem')&&t('denetleme').includes('15.01.2027')&&t('denetleme').includes('Deniz Kurt'));
{const dn=await uret('denetleme',{donem:2});assert(dn.metin.includes('2. Dönem')&&!dn.metin.includes('1. Dönem /'));}

/* katalogsuz kulüp: genel evraklar çalışır, katalog gerektirenler anlaşılır hata verir */
{const kb={...b0,paket:null,kulup:{id:'k2',ad:'Satranç'}};
 for(const k of ['tutanak','uyeler','denetleme']){const o=await uret(k,{donem:1},kb);assert(o.metin.includes('Satranç Kulübü')||o.metin.includes('SATRANÇ KULÜBÜ'),`${k}: kulüp adı`)}
 for(const k of ['tuzuk','plan','toplum','aylik','donem','yil'])await assert.rejects(()=>D.olustur(k,kb,{}),/hazır evrakları henüz eklenmedi/,`${k}: katalogsuz kulüp için açıklayıcı hata`);}
/* eksik bilgi noktalı kalır, boş bırakılmaz */
{const bos=await uret('tutanak',{},{...b0,durum:K.bosDurum(),danismanlar:[],uyeler:[],mudur:''});assert(bos.metin.includes('……'),'Eksik alanlar noktalı kalır.');assert(!/undefined|null|NaN/.test(bos.metin));}
/* XML kaçışı */
{const ozel=await uret('uyeler',{},{...b0,uyeler:[{id:'x',ad:'A & B <C>',sinif:'5/A',no:'',gorev:'"Üye"'}]});assert(ozel.metin.includes('A & B <C>'));dengeli(ozel.xml,'özel karakter');}

/* ── kayıt noktaları ── */
const nav=fs.readFileSync('js/core/app-nav.js','utf8'),shell=fs.readFileSync('js/core/shell-ui.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8'),bridge=fs.readFileSync('js/core/role-permission-bridge.js','utf8');
const gizli=nav.match(/const TEACHER_HIDDEN=new Set\(\[([^\]]*)\]/)[1];
assert(!/'tools:form-kulup'/.test(gizli)&&gizli.includes("'tools:form-kulup-kayit'"),'Öğretmen yeni Sosyal Kulüpler sayfasını görür; klasik kayıt tablosu öğretmenden gizli kalır.');
assert(nav.includes("['form-kulup','Sosyal Kulüpler','star'")&&nav.includes("'tools','form-kulup'],"),'Menü aracı aynı rotada kalır.');
assert(/FORM_PAGES=Object\.freeze\(\{[^}]*'form-kulup-kayit':'Sosyal Kulüpler'/.test(shell)&&!/FORM_PAGES=Object\.freeze\(\{[^}]*'form-kulup':/.test(shell),'Klasik tablo form-kulup-kayit sayfasına taşınır.');
assert(shell.includes("page==='form-kulup'")&&shell.includes('KulupModule.open')&&shell.includes('kulup-core.js?v=1')&&shell.includes('kulup.js?v=1'),'Kabukta Sosyal Kulüpler rotası tanımlı olmalı.');
assert(bridge.includes("'tools:form-kulup-kayit':'tools.formKulup'"));
['kulup-core.js?v=1','kulup.js?v=1','kulup-dosya.js?v=1'].forEach(f=>assert(sw.includes(`./js/modules/${f}`),`${f} önbelleğe alınmalı.`));
fs.readdirSync('assets/kulup/sablon').forEach(f=>assert(sw.includes(`./assets/kulup/sablon/${f}`),`${f} çevrimdışı için önbelleğe alınmalı.`));
assert.strictEqual(fs.readdirSync('assets/kulup/sablon').length,9);['./data/kulup/katalog.json','./data/kulup/siberay.json'].forEach(f=>assert(sw.includes(f),`${f} önbelleğe alınmalı.`));
assert(fs.readFileSync('js/modules/kulup.js','utf8').includes('ogretmen-dosyasi-core.js?v=5')&&sw.includes('ogretmen-dosyasi-core.js?v=5'),'Ortak Word çekirdeği aynı sürümle yüklenir.');
for(const f of ['kulup','kulup-core','kulup-dosya']){
 const k=fs.readFileSync(`js/modules/${f}.js`,'utf8');
 assert(!/localStorage\s*\.\s*setItem/.test(k)&&!/<style|createElement\('style'\)/.test(k),`${f}.js depolamaya yazmaz, stil gömmez.`);
}
assert(css.includes('#v2ModuleRoot .klp-page')&&css.includes('#v2ModuleRoot .klp-evrak__ust'),'Stiller tasarım sistemi CSS dosyasında olmalı.');
assert(!/color:\s*#fff[^;]*;[^}]*background[^}]*warning/.test(css.slice(css.indexOf('/* ===== SOSYAL KULÜPLER'),css.indexOf('/* ===== A4 — Yazılı Kâğıdı'))),'Sarı dolgu üzerine beyaz yazı olmaz.');
console.log('kulup.test.js OK');
})().catch(e=>{console.error(e);process.exit(1)});
