/* Projeler menüsü › Maarif'in Kalbinde Oyun: içerik (20 oyun), Word planlarıyla tutarlılık, menü / rota / önbellek kayıtları, mevcut düzenlere yeni menünün eklenmesi */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const JSZip=require('../assets/vendor/jszip.min.js');
const {loadNav}=require('./helpers/app-nav');
const read=p=>fs.readFileSync(p,'utf8');
const J=x=>JSON.parse(JSON.stringify(x));

const veriSrc=read('js/modules/maarif-oyun-veri.js'),uiSrc=read('js/modules/maarif-oyun.js'),shell=read('js/core/shell-ui.js'),nav=read('js/core/app-nav.js'),sw=read('service-worker.js'),css=read('css/design-system-base.css'),katSrc=read('js/modules/evrak-katalog.js'),odSrc=read('js/modules/ogretmen-dosyasi.js');
const ctx={console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(veriSrc,ctx);vm.runInContext(katSrc,ctx);
const V=ctx.MaarifOyunVeri,K=ctx.EvrakKatalog;

/* ── içerik: 20 oyun, ayda iki ── */
assert.strictEqual(V.OYUNLAR.length,20,'20 oyun olmalı.');
assert.deepStrictEqual(J(V.OYUNLAR.map(o=>o.no)),Array.from({length:20},(_,i)=>i+1),'Oyun numaraları 1–20 sıralı.');
assert.strictEqual(new Set(V.OYUNLAR.map(o=>o.ad)).size,20,'Oyun adları benzersiz.');
V.AYLAR.forEach(ay=>assert.strictEqual(V.oyunlarAy(ay).length,2,`${ay}: iki oyun.`));
assert.deepStrictEqual(J(V.oyunlarDonem(1).map(o=>o.ay).filter((a,i,l)=>l.indexOf(a)===i)),['Eylül','Ekim','Kasım','Aralık','Ocak'],'1. dönem Eylül–Ocak.');
assert.deepStrictEqual(J(V.oyunlarDonem(2).map(o=>o.ay).filter((a,i,l)=>l.indexOf(a)===i)),['Şubat','Mart','Nisan','Mayıs','Haziran'],'2. dönem Şubat–Haziran.');
V.OYUNLAR.forEach(o=>{
  ['ad','tarih','sinif','sure','arac','alan','gun','nasil','guvenlik'].forEach(a=>assert(String(o[a]||'').trim(),`${o.no}. ${o.ad}: ${a} boş olmamalı.`));
  assert(/^\d{1,2}–\d{1,2} [A-ZÇĞİÖŞÜ][a-zçğıöşü]+$/.test(o.tarih),`${o.no}. ${o.ad}: tarih biçimi "gg–gg Ay" (${o.tarih}).`);
  assert(['1–4','2–4','3–4'].includes(o.sinif),`${o.no}. ${o.ad}: sınıf aralığı.`);
  assert(/^\d+(–\d+)? dk$/.test(o.sure),`${o.no}. ${o.ad}: süre biçimi.`);
});
/* ayın oyunu tarihleri o ayda başlar ve sırayla ilerler */
const AYNO={Eylül:9,Ekim:10,Kasım:11,Aralık:12,Ocak:1,Şubat:2,Mart:3,Nisan:4,Mayıs:5,Haziran:6};
let onceki=0;
V.OYUNLAR.forEach(o=>{
  const ay=o.tarih.split(' ').pop();
  assert.strictEqual(ay,o.ay,`${o.no}. ${o.ad}: tarih ayı (${ay}) oyunun ayıyla (${o.ay}) aynı olmalı.`);
  const gunNo=Number(o.tarih.split('–')[0]),sira=(AYNO[o.ay]>=9?AYNO[o.ay]-9:AYNO[o.ay]+3)*100+gunNo;
  assert(sira>onceki,`${o.no}. ${o.ad}: tarihler ilerlemeli.`);onceki=sira;
});
assert.strictEqual(V.DONEMLER.length,2);
assert(V.NEDIR.bolumler.length===3&&V.NEDIR.bolumler[0].maddeler.length===5&&V.NEDIR.bolumler[1].maddeler.length===8&&V.NEDIR.bolumler[2].maddeler.length===6,'Nedir sayfası: 5 + 8 + 6 madde.');
assert(V.ILKOKUL.ozet.length===10&&V.ILKOKUL.ozet.every(([ay],i)=>ay===V.AYLAR[i]),'İlkokul özeti 10 ay, ay sırasıyla.');
assert(V.ORTAOKUL.tema.length===10&&V.ORTAOKUL.tema.every(([ay],i)=>ay===V.AYLAR[i]),'Ortaokul teması 10 ay, ay sırasıyla.');
assert.strictEqual(V.SAYISMACA.tekerlemeler.length,2);
assert(!/evrakburada/i.test(veriSrc+uiSrc),'Üçüncü taraf adı kullanılmaz.');

/* ── Word planlarıyla tutarlılık ── */
const docxMetin=async yol=>{const z=await JSZip.loadAsync(fs.readFileSync(yol)),x=await z.file('word/document.xml').async('string');return x.replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')};
(async()=>{
  const ilk=await docxMetin(K.DOSYA_KOKU+K.FORMLAR[V.PLANLAR.ilkokul.form].docx),orta=await docxMetin(K.DOSYA_KOKU+K.FORMLAR[V.PLANLAR.ortaokul.form].docx);
  V.OYUNLAR.forEach(o=>assert(ilk.includes(o.ad.replace(/ \(.*\)$/,'')),`İlkokul Word planında "${o.ad}" geçmeli.`));
  V.ORTAOKUL.tema.forEach(([ay,tema,ornek,amac,gelenek])=>{
    assert(orta.toLocaleUpperCase('tr').includes(ay.toLocaleUpperCase('tr')),`Ortaokul Word planında ${ay}.`);
    [tema,ornek,amac,gelenek].forEach(t=>assert(orta.includes(t),`Ortaokul Word planıyla aynı içerik: "${t.slice(0,40)}"`));
  });
  Object.values(V.PLANLAR).forEach(p=>{
    assert(K.FORMLAR[p.form]&&K.FORMLAR[p.form].docx,`${p.form}: Öğretmen Dosyası formu var.`);
    assert(K.formlar({formlar:[p.form]},V.YIL).length===1,`${p.form}: ${V.YIL} yılında görünür.`);
  });
  console.log('maarif-oyun-sayfalari: Word tutarlılığı OK');
})().catch(e=>{console.error(e);process.exit(1)});

/* ── menü ve rota ── */
const {N}=loadNav();
const grup=N.menuTree().find(m=>m.id==='projeler');
assert(grup&&grup.ad==='Projeler','"Projeler" menüsü olmalı.');
const tools=N.catalog().filter(t=>t.kat==='projeler');
assert.deepStrictEqual(J(tools.map(t=>[t.id,t.route,t.page])),[['oyun-nedir','maarif-oyun','nedir'],['oyun-aylik','maarif-oyun','oyunlar'],['oyun-ilkokul','maarif-oyun','ilkokul'],['oyun-ortaokul','maarif-oyun','ortaokul']],'Projeler menüsünde dört Maarif Oyun sayfası.');
assert(tools.every(t=>!t.y),'Sayfalar öğretmene de açık.');
['ogretmen','idareci'].forEach(r=>{
  const m=N.defaultLayout(r).menus.find(x=>x.id==='projeler');
  assert(m&&m.ids.length===4,`${r}: varsayılan düzende Projeler menüsü.`);
  assert(N.menuOrder(r).indexOf('projeler')===N.menuOrder(r).indexOf('etkinlik')+1,`${r}: Projeler, Etkinlik ve Gezi'nin hemen ardından.`);
});
Object.values(V.SAYFALAR).forEach((s,i)=>{const k=Object.keys(V.SAYFALAR)[i];assert(tools.some(t=>t.page===k),`${k}: katalogda sayfa var.`)});
assert(['oyun-nedir','oyun-aylik','oyun-ilkokul','oyun-ortaokul'].every(id=>nav.includes(`GLYPHS['${id}']`)||nav.includes(`'${id}':'`)),'Simgeler ve arama sözcükleri.');
assert.deepStrictEqual(J(N.search('maarif kalbinde oyun').map(t=>t.id).sort()),['oyun-aylik','oyun-ilkokul','oyun-nedir','oyun-ortaokul'],'Arama dört sayfayı da bulur.');
assert(/if\(name==='maarif-oyun'\)\{[\s\S]*?MaarifOyunModule\.open\(page\)/.test(shell)&&shell.includes('maarif-oyun-veri.js?v=1')&&shell.includes('maarif-oyun.js?v=3'),'Rota modülleri yükleyip sayfa anahtarıyla açar.');
assert(sw.includes('maarif-oyun-veri.js?v=1')&&sw.includes('maarif-oyun.js?v=3'),'Önbelleğe alınmalı.');
assert(katSrc.includes('{f:["oyun-ilkokul","oyun-ortaokul"],a:["oyun-ilkokul","oyun-ortaokul"]}'),'Öğretmen Dosyası maddesi sayfalara bağlanmalı.');
const madde=K.KATALOG.find(m=>/Kalbinde Oyun/.test(m.ad));
assert.deepStrictEqual(J(madde.araclar),['oyun-ilkokul','oyun-ortaokul']);

/* ── Word indirme: Öğretmen Dosyası'yla aynı yol ── */
assert(/async function formKaydet\(key,tur,ek=\{\}\)/.test(odSrc)&&/OgretmenDosyasi=\{open,render,unmount,formKaydet\}/.test(odSrc),'formKaydet dışa açılmalı.');
assert(/async function formIndir\(key,tur\)[\s\S]*?formKaydet\(key,tur\)/.test(odSrc),'Öğretmen Dosyası da aynı yolu kullanır (kopya yok).');
assert(/formKaydet\(p\.form,'docx',\{okul:planOkulu\(plan\),ad:s\.ogretmen,mudur:s\.mudur,xmlDonustur:xml=>MP\.imzaTablosunuDegistir\(xml,imza\)\}\)/.test(uiSrc),'Sayfa, ekrandaki okul / öğretmen / müdür bilgisiyle ve özelleştirilmiş imza bölümüyle indirir.');
assert(/ogretmen-dosyasi\.js\?v=6/.test(uiSrc)&&shell.includes('ogretmen-dosyasi.js?v=6')&&sw.includes('ogretmen-dosyasi.js?v=6'),'Öğretmen Dosyası pinleri aynı.');
assert(!/localStorage\.setItem/.test(veriSrc+uiSrc)&&!/<style/i.test(veriSrc+uiSrc)&&!/style="/.test(veriSrc+uiSrc),'Modül depolama yazmaz, stil gömmez.');

/* ── CSS: yalnız belirteç ── */
const bas=css.indexOf('/* ===== PROJELER › MAARİF'),son=css.indexOf('/* ===== A4 — Yazılı Sınav Takvimi (.kwr-*)');
assert(bas>0&&son>bas,'mok-* stil bloğu var.');
const mok=css.slice(bas,son),pxSiz=mok.replace(/@media\([^)]*\)\{[\s\S]*?\n\}/g,'');
assert(!/\d(?:\.\d+)?px/.test(pxSiz)&&!/#[0-9a-fA-F]{3,8}\b/.test(mok),'Stiller sabit px / renk içermemeli (px yalnız @media).');

/* ── mevcut (özelleştirilmiş) düzenler: yeni menü eklenir; bilerek silinen menü geri gelmez ── */
{
  const K1='ka-nav-layout:u1:idareci',def=N.defaultLayout('idareci'),projeIds=['oyun-nedir','oyun-aylik','oyun-ilkokul','oyun-ortaokul'];
  const eski=N.scopeIds('idareci').filter(id=>!projeIds.includes(id));
  const menus=def.menus.filter(m=>m.id!=='projeler');
  const {N:M,ls}=loadNav({store:{[K1]:JSON.stringify({v:N.LAYOUT_SURUM,menus,bar:def.bar,gorulen:eski,t:1})}});
  const L=M.layoutRaw('idareci'),p=L.menus.find(m=>m.id==='projeler');
  assert(p&&p.ad==='Projeler'&&JSON.stringify(p.ids)===JSON.stringify(projeIds),'Projeler menüsü kullanıcının düzenine eklenir.');
  assert(!L.menus.some(m=>m.id==='diger'),'"Diğer sayfalar"a düşmez.');
  assert(J(JSON.parse(ls.get(K1)).gorulen).includes('oyun-nedir'),'Görülen listesine yazılır.');
  assert.strictEqual(M.layoutRaw('idareci').menus.filter(m=>m.id==='projeler').length,1,'Tekrar okununca çoğalmaz.');
}
{
  /* Projeler menüsünü bilerek silen kullanıcı (sayfaları görülmüş): menü geri gelmez, yeni sayfa Diğer sayfalar'a düşer */
  const K1='ka-nav-layout:u1:idareci',def=N.defaultLayout('idareci');
  const menus=def.menus.filter(m=>m.id!=='projeler'),bilinen=N.scopeIds('idareci').filter(id=>id!=='oyun-ortaokul');
  const {N:M}=loadNav({store:{[K1]:JSON.stringify({v:N.LAYOUT_SURUM,menus,bar:def.bar,gorulen:bilinen,t:1})}});
  const L=M.layoutRaw('idareci');
  assert(!L.menus.some(m=>m.id==='projeler'),'Silinen menü geri gelmez.');
  assert(L.menus.find(m=>m.id==='diger')?.ids.includes('oyun-ortaokul'),'Yeni sayfa Diğer sayfalar’a düşer.');
}
console.log('maarif-oyun-sayfalari: OK');
