/* Kat Planı / Tahliye Planı sözleşme testi: veri katmanı (model, geometri, kontrol listesi, lejant, sayfa düzeni). */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const win={};win.window=win;vm.createContext(win);
vm.runInContext(fs.readFileSync('js/modules/kat-plani-core.js','utf8'),win);
const C=win.KatPlaniCore;
const eq=(a,b,m)=>assert.strictEqual(JSON.stringify(a),JSON.stringify(b),m);   /* vm bağlamındaki diziler başka gerçeklikten gelir */
assert(C&&C.normalizeKat&&C.okNoktalari&&C.sayfaDuzen,'KatPlaniCore API eksik');

/* --- model --- */
{
  const k=C.normalizeKat({ad:'  Zemin Kat ',w:99999,h:10,ogeler:[{tur:'sondurucu',x:'10.26',y:20,aci:-90},{tur:'yok-tur',x:1,y:1},null,{tur:'alarm',x:5,y:6,aci:450}],
    yollar:[{noktalar:[[0,0],[10,10]]},{noktalar:[[0,0]]},{noktalar:[[0,0],['a',2]]}],buradasiniz:[{x:3,y:4,ad:'Ana giriş'},{x:'x',y:1}]});
  assert.strictEqual(k.ad,'Zemin Kat');
  assert.strictEqual(k.w,6000,'tuval üst sınırı');assert.strictEqual(k.h,200,'tuval alt sınırı');
  assert.strictEqual(k.ogeler.length,2,'bilinmeyen/boş sembol atılır');
  assert.strictEqual(k.ogeler[0].x,10.3);assert.strictEqual(k.ogeler[0].aci,270,'negatif açı 0-359');assert.strictEqual(k.ogeler[1].aci,90);
  assert.strictEqual(k.yollar.length,1,'2 noktadan kısa yol atılır');
  assert.strictEqual(k.buradasiniz.length,1);
  assert.strictEqual(k.sira,0,'zemin kat sırası 0');
  assert(k.id&&k.ogeler.every(o=>o.id),'kimlikler üretilir');
  const bos=C.yeniKat('Bodrum Kat');
  assert.strictEqual(bos.w,C.BOS.w);assert.strictEqual(bos.sira,-1);
  assert(C.katSira('Bodrum Kat')<C.katSira('Zemin Kat')&&C.katSira('Zemin Kat')<C.katSira('1. Kat')&&C.katSira('2. Kat')<C.katSira('Çatı Katı'),'doğal kat sırası');
  assert.strictEqual(C.altlikId('kat_a'),'kat_a__altlik');
  assert.strictEqual(C.katBelgesi(k).tur,'kat');
  {const kb=C.katBelgesi(k);assert.strictEqual(JSON.stringify(kb.yollar[0].p),'[0,0,10,10]','kayıtta noktalar düz dizi (Firestore iç içe dizi kabul etmez)');
   assert(kb.yollar.every(y=>y.p.every(v=>typeof v==='number')),'kayıttaki yol dizisinde yalnız sayı var');
   const geri=C.normalizeKat(JSON.parse(JSON.stringify(kb)));assert.strictEqual(JSON.stringify(geri.yollar[0].noktalar),'[[0,0],[10,10]]','kayıttan geri okuma');}assert(!('altlik' in C.katBelgesi({...k,altlik:{veri:'x'}})),'altlık görüntüsü kat belgesine girmez');
  const a=C.normalizeAyar({});assert.strictEqual(a.baslik,'ACİL DURUM TAHLİYE PLANI');assert.strictEqual(a.onayUnvan,'Okul Müdürü');
}

/* --- yön okları --- */
{
  const oklar=C.okNoktalari([[0,0],[300,0],[300,200]],100);
  assert.strictEqual(oklar.filter(o=>o.uc).length,1,'tek son ok');
  const son=oklar[oklar.length-1];
  assert.deepStrictEqual([son.x,son.y],[300,200]);assert(Math.abs(son.aci-Math.PI/2)<1e-9,'son ok aşağı bakar');
  const ilk=oklar[0];assert(Math.abs(ilk.aci)<1e-9&&ilk.x===50,'ilk ok doğrultusu ve yeri');
  assert.strictEqual(oklar.filter(o=>!o.uc).length,3+2,'300 birimlik parça 3, 200 birimlik parça 2 ok');
  assert.strictEqual(C.okNoktalari([[0,0],[10,0]],100).length,1,'kısa parçada yalnız son ok');
  eq(C.okNoktalari([[0,0]],100),[]);eq(C.okNoktalari([[0,0],[5,5]],0),[]);
  assert.strictEqual(Math.round(C.yolUzunluk([[0,0],[3,4],[3,10]])),11);
}

/* --- dokunma / isabet --- */
{
  const k=C.normalizeKat({w:2000,h:1500,ogeler:[{tur:'alarm',x:500,y:500}],buradasiniz:[{x:520,y:500}],yollar:[{noktalar:[[100,100],[900,100]]}]});
  assert.deepStrictEqual({...C.isabet(k,520,500,10)},{t:'bur',i:0},'buradasınız önce');
  assert.deepStrictEqual({...C.isabet(k,482,500,10)},{t:'oge',i:0});
  assert.deepStrictEqual({...C.isabet(k,100,102,10)},{t:'nokta',yi:0,ni:0},'yol köşesi');
  assert.strictEqual(C.isabet(k,500,100,5).t,'yol','yol doğrusu');
  assert.strictEqual(C.isabet(k,1500,1200,5),null);
  assert(Math.abs(C.noktaSegMesafe(5,5,0,0,10,0)-5)<1e-9);assert(Math.abs(C.noktaSegMesafe(-3,4,0,0,10,0)-5)<1e-9,'uç noktaya uzaklık');
}

/* --- kontrol listesi, lejant, sayfalar --- */
{
  const k=C.normalizeKat({w:2000,h:1500});
  let c=C.kontrol(k,{altlik:false});
  assert(c.length>=7&&c.every(x=>x.ok===false),'boş kat tüm maddelerde eksik');
  assert(['altlik','yol','buradasiniz','sondurucu','alarm','pano','ilkyardim'].every(id=>c.some(x=>x.id===id)),'kılavuz maddeleri');
  const dolu=C.normalizeKat({w:2000,h:1500,ogeler:['sondurucu','alarm','pano','ilkyardim','hortum'].map((t,i)=>({tur:t,x:10*i,y:5})),yollar:[{noktalar:[[0,0],[9,9]]}],buradasiniz:[{x:1,y:1},{x:2,y:2}]});
  c=C.kontrol(dolu,{altlik:true});assert(c.every(x=>x.ok),'tam kat uyarısız');
  const l=C.lejant(dolu);
  assert.strictEqual(l[0].id,'buradasiniz');assert.strictEqual(l[1].id,'yol');
  eq(l.slice(2).map(x=>x.id),['sondurucu','hortum','alarm','ilkyardim','pano'],'lejantta yalnız kullanılan semboller, katalog sırasıyla');
  eq(C.lejant(k),[],'boş katın lejantı boş');
  eq(C.sayfalar(dolu),[0,1],'her buradasınız noktası bir sayfa');
  eq(C.sayfalar(k),[-1],'nokta yoksa tek sayfa');
  assert.strictEqual(C.sayim(dolu).sondurucu,1);
}

/* --- sembol kataloğu: gruplar, benzersiz kimlik, renk/şekil, oda adı --- */
{
  const L=C.SEMBOLLER,ids=L.map(x=>x.id),g=new Set(C.GRUPLAR.map(x=>x.id));
  assert(L.length>=24,'katalog geniş olmalı (yangın, kaçış, uyarı, mekân, yazı)');
  assert.strictEqual(new Set(ids).size,ids.length,'sembol kimlikleri benzersiz');
  assert(L.every(x=>g.has(x.grup)&&x.ad&&x.kisa&&/^#[0-9a-f]{6}$/i.test(x.renk)),'her sembolün grubu, adı ve rengi var');
  C.GRUPLAR.forEach(x=>assert(L.some(y=>y.grup===x.id),'boş grup yok: '+x.id));
  ['kazan','pano','asansor','wc','etiket','salter','dogalgaz','jenerator','aed','siginak','duman','ihbar'].forEach(id=>assert(ids.includes(id),'sembol eksik: '+id));
  assert(L.filter(x=>x.renk===C.RENK.sari).every(x=>x.sekil==='ucgen'),'sarı semboller üçgen (siyah işaret)');
  assert(L.filter(x=>x.onerilen).length===4,'kılavuzun beklediği 4 sembol');
  /* oda adı lejanta girmez; metni model alanı `not` */
  const k=C.normalizeKat({w:2000,h:1500,ogeler:[{tur:'etiket',x:100,y:100,not:'Kazan Dairesi'},{tur:'kazan',x:300,y:100,not:'Zemin'}]});
  eq(C.lejant(k).map(x=>x.id),['kazan'],'oda adı lejantta yok, kazan dairesi var');
  assert.strictEqual(k.ogeler[0].not,'Kazan Dairesi');assert.strictEqual(C.etiketMetni(C.normalizeOge({tur:'etiket',x:1,y:1})),'Oda adı','boş yazı yer tutucu gösterir');
}
/* --- tek sembolün boyutu --- */
{
  const k=C.normalizeKat({w:2000,h:1500,sembolBoyut:1,ogeler:[{tur:'alarm',x:500,y:500},{tur:'alarm',x:900,y:500,boy:2},{tur:'alarm',x:1300,y:500,boy:99},{tur:'alarm',x:1700,y:500,boy:'x'},{tur:'alarm',x:100,y:500,boy:.01}],buradasiniz:[{x:10,y:10,boy:3}]});
  eq(k.ogeler.map(o=>o.boy),[1,2,4,1,.4],'boy 0,4–4 aralığına sınırlanır, geçersizse 1');assert.strictEqual(k.buradasiniz[0].boy,3);
  const sp=C.sembolPx(k);
  assert.strictEqual(C.ogeBoyut(k,k.ogeler[1]),sp*2,'boyut = genel boyut × kendi çarpanı');
  k.sembolBoyut=2;assert.strictEqual(C.ogeBoyut(k,k.ogeler[1]),C.sembolPx(k)*2);k.sembolBoyut=1;
  /* büyütülmüş sembolün isabet alanı da büyür; küçük olan genel tolerans altına inmez */
  const d=sp*1.1;assert.strictEqual(C.isabet(k,900+d,500,0)?.t,'oge','boy 2 → geniş isabet');assert.strictEqual(C.isabet(k,500+d,500,0),null,'boy 1 → dar isabet');
  assert.strictEqual(C.isabet(k,100+sp*.14,500,0)?.i,4,'çok küçük sembol yine de seçilebilir');
  /* oda adı: dikdörtgen isabet, yazı uzadıkça genişler; ölçü işlevi verilirse onu kullanır */
  const e=C.normalizeKat({w:2000,h:1500,ogeler:[{tur:'etiket',x:800,y:400,not:'Müdür Yardımcısı Odası'}]}),a=C.ogeYari(e,e.ogeler[0]);
  assert(a.hw>a.hh*3,'uzun yazı yatay kutu');
  assert.strictEqual(C.isabet(e,800+a.hw*.9,400,0)?.t,'oge');assert.strictEqual(C.isabet(e,800+a.hw*1.6,400,0),null);
  assert.strictEqual(C.ogeYari(e,e.ogeler[0],()=>100).hw,(100+C.ogeBoyut(e,e.ogeler[0])*.5*.9)/2,'tuval ölçüsü kullanılır');
  const b=C.normalizeKat({w:2000,h:1500,ogeler:[{tur:'etiket',x:800,y:400,not:'Müdür Yardımcısı Odası',boy:2}]});
  assert(C.ogeYari(b,b.ogeler[0]).hw>a.hw*1.9,'yazı boyutu çarpanla büyür');
  /* kayıt döngüsü: boy ve yazı korunur */
  const r=C.normalizeKat(JSON.parse(JSON.stringify(C.katBelgesi(b))));assert.strictEqual(r.ogeler[0].boy,2);assert.strictEqual(r.ogeler[0].not,'Müdür Yardımcısı Odası');
}

/* --- sayfa düzeni: her yönde 10 mm kenar boşluğu, bölümler içerik kutusuna sığar --- */
{
  const a3=C.sayfaDuzen('A3'),a4=C.sayfaDuzen('A4'),varsayilan=C.sayfaDuzen('x');
  assert.deepStrictEqual([a3.pw,a3.ph,a3.m,a3.w,a3.h],[420,297,10,400,277],'A3 yatay');
  assert.deepStrictEqual([a4.pw,a4.ph,a4.m,a4.w,a4.h],[297,210,10,277,190],'A4 yatay');
  assert.strictEqual(varsayilan.boyut,'A3','bilinmeyen boyut A3');
  for(const d of [a3,a4]){
    const inside=r=>r.x>=0&&r.y>=0&&r.x+r.w<=d.w+1e-9&&r.y+r.h<=d.h+1e-9;
    assert(inside(d.plan)&&inside(d.lejant)&&inside(d.onay),d.boyut+': bölümler içerik kutusunda');
    assert(d.plan.y>=d.ust&&d.plan.y+d.plan.h<=d.lejant.y,d.boyut+': plan başlık ile alt bölüm arasında');
    assert(d.lejant.x+d.lejant.w<=d.onay.x,d.boyut+': lejant onay bloğuyla çakışmaz');
    assert(d.plan.h>d.h*.6,d.boyut+': plana yeterli alan');
  }
  const f=C.fitRect(2400,1700,a3.plan);
  assert(f.x>=a3.plan.x&&f.y>=a3.plan.y&&f.x+f.w<=a3.plan.x+a3.plan.w+1e-9&&f.y+f.h<=a3.plan.y+a3.plan.h+1e-9,'altlık plan alanına oranı bozulmadan sığar');
  assert(Math.abs(f.w/f.h-2400/1700)<1e-9);
}

/* --- altlık işleme (saf piksel katmanı) --- */
{
  const win2={document:{createElement:()=>({})}};win2.window=win2;vm.createContext(win2);
  vm.runInContext(fs.readFileSync('js/modules/kat-plani-image.js','utf8'),win2);
  const I=win2.KatPlaniImage;assert(I&&I.pikselIsle&&I.sikistir&&I.dosyaAc,'KatPlaniImage API eksik');
  const W=40,H=30;
  const boya=(d,x,y,r,g,b)=>{const i=(y*W+x)*4;d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255};
  const px=(d,x,y)=>d[(y*W+x)*4];
  const koyuTuval=()=>{const d=new Uint8ClampedArray(W*H*4);for(let i=0;i<W*H;i++)d[i*4+3]=255;
    boya(d,2,2,255,255,0);boya(d,6,2,255,0,0);boya(d,10,2,0,0,255);boya(d,14,2,0,255,0);boya(d,18,2,255,255,255);boya(d,22,2,255,165,0);return d};
  /* koyu zemin otomatik algılanır; her renk çizgi olur */
  let d=koyuTuval();let r=I.pikselIsle(d,W,H,{kalin:0,silik:0});
  assert.strictEqual(r.koyuZemin,true,'koyu zemin algılandı');
  assert.strictEqual(px(d,30,20),255,'zemin beyaza döner');
  [2,6,10,14,18,22].forEach(x=>assert(px(d,x,2)<=80,'renk '+x+' çizgi olarak korunur (tüm renkler)'));
  /* duvar süzgeci: yalnız sarı, beyaz, turuncu kalır */
  d=koyuTuval();I.pikselIsle(d,W,H,{renk:'duvar',kalin:0,silik:0});
  assert(px(d,2,2)<=80&&px(d,18,2)<=80&&px(d,22,2)<=80,'sarı, beyaz, turuncu kalır');
  assert.strictEqual(px(d,6,2),255,'kırmızı elenir');assert.strictEqual(px(d,10,2),255,'mavi elenir');assert.strictEqual(px(d,14,2),255,'yeşil elenir');
  /* silikleştirme: çizgi açılır; gri 17'nin katı (16 seviye) */
  const koyuCizgi=s=>{const x=koyuTuval();I.pikselIsle(x,W,H,{kalin:0,silik:s});return px(x,2,2)};
  assert(koyuCizgi(80)>koyuCizgi(0),'silik artınca çizgi açılır');
  assert.strictEqual(koyuCizgi(35)%17,0,'16 gri seviye');
  /* kalınlaştırma: tek piksel 3×3 olur */
  d=koyuTuval();I.pikselIsle(d,W,H,{kalin:1,silik:0});
  assert(px(d,1,1)<255&&px(d,3,3)<255&&px(d,2,3)<255,'1 piksellik çizgi kalınlaşır');assert.strictEqual(px(d,30,20),255);
  /* açık zemin: beyaz kâğıtta koyu çizgi korunur */
  d=new Uint8ClampedArray(W*H*4).fill(255);boya(d,5,5,0,0,0);boya(d,9,5,120,120,120);
  r=I.pikselIsle(d,W,H,{kalin:0,silik:0});
  assert.strictEqual(r.koyuZemin,false,'açık zemin');assert(px(d,5,5)<=80,'siyah çizgi koyu kalır');assert(px(d,9,5)>px(d,5,5)&&px(d,9,5)<255,'gri çizgi daha açık');assert.strictEqual(px(d,20,20),255);
  /* zemini zorla */
  d=koyuTuval();assert.strictEqual(I.pikselIsle(d,W,H,{mod:'acik',kalin:0}).koyuZemin,false,'mod zorlanabilir');
  /* eşik: soluk gürültü atılır */
  d=new Uint8ClampedArray(W*H*4);for(let i=0;i<W*H;i++)d[i*4+3]=255;boya(d,3,3,20,20,20);boya(d,6,6,255,255,255);
  I.pikselIsle(d,W,H,{mod:'koyu',esik:20,kalin:0,silik:0});assert.strictEqual(px(d,3,3),255,'eşik altı gürültü silinir');assert(px(d,6,6)<=80);
  /* içerik kutusu */
  d=new Uint8ClampedArray(W*H*4).fill(255);boya(d,10,8,0,0,0);boya(d,20,15,0,0,0);
  const kb=I.icerikKutusu(d,W,H,0);assert.deepStrictEqual({...kb},{x:10,y:8,w:11,h:8},'içerik kutusu');
  assert.strictEqual(I.icerikKutusu(new Uint8ClampedArray(W*H*4).fill(255),W,H,0),null,'boş görüntüde kutu yok');
  /* seçenek sınırları */
  const o=I.secenek({mod:'x',renk:'duvar',esik:999,silik:-5,kalin:9});
  assert.deepStrictEqual({...o},{mod:'auto',renk:'duvar',esik:80,silik:0,kalin:3},'seçenekler sınırlanır');
}

/* --- kaynak sözleşmesi: kabuk kaydı, depolama, baskı kenar boşluğu, dosya adı --- */
{
  const oku=f=>fs.readFileSync(f,'utf8');
  const mods=['kat-plani','kat-plani-core','kat-plani-image','kat-plani-cizim'].map(a=>[a,oku('js/modules/'+a+'.js')]);
  for(const [a,src] of mods){
    assert(!/<style/i.test(src),a+': modülde <style olmamalı (CSS design-system-base.css içinde)');
    assert(!/localStorage\.setItem/.test(src),a+': localStorage.setItem yasak (yerel-öncelikli DeviceData kullanılır)');
  }
  const ed=oku('js/modules/kat-plani.js');
  const cz=oku('js/modules/kat-plani-cizim.js');
  C.SEMBOLLER.filter(x=>x.sekil!=='yazi').forEach(x=>assert(new RegExp('\\n  '+x.id+'\\(c').test(cz),'çizim işlevi eksik: '+x.id));
  assert(/function etiketCiz/.test(cz)&&/function lejantDuzen/.test(cz),'oda adı kutusu ve uyarlanır lejant');
  ['data-act="grup"','data-act="genelboy"','data-r="ogeboy"','data-r="ogenot"','kplOda'].forEach(t=>assert(ed.includes(t),'editör: '+t));
  assert(!/data-f="sembolBoyut"/.test(ed),'genel boyut yalnız palette (ayar sayfasında yinelenmez)');
  assert(/akis:true,kenarBosluk:10/.test(ed),'yazdırma: akış + 10 mm kenar boşluğu');
  assert(!/extraHead/.test(ed),'yazdırma: extraHead verilirse sayfa kenar boşluğu kaybolur');
  assert(/TR_ASCII/.test(ed),'dosya adları ASCII\'ye çevrilir');
  const nav=oku('js/core/app-nav.js');
  assert(/'kat-plani'[^\n]*adminOrManager/.test(nav),'menü kaydı yalnız idareci/müdür');
  assert(/name==='kat-plani'/.test(oku('js/core/shell-ui.js')),'shell rotası');
  assert(/katPlanlari:'oy_katPlanlari'/.test(oku('js/firebase-init.js').replace(/\s+/g,'')),'COL.katPlanlari');
  assert(/match \/oy_katPlanlari\/\{/.test(oku('firestore.rules')),'firestore kuralı');
  assert(/\.kpl-root/.test(oku('css/design-system-base.css'))&&/\.kpl-gorsel/.test(oku('css/design-system-base.css')),'CSS bloğu');
  const sw=oku('service-worker.js');
  for(const f of ['kat-plani-core','kat-plani-image','kat-plani-cizim','kat-plani'])assert(sw.includes('./js/modules/'+f+'.js?v=2'),'SW önbelleği: '+f);
  /* dosya adı dönüşümü (editör içinde özel; aynı kural burada denetlenir) */
  const m=ed.match(/const TR_ASCII=(\{[^}]*\});\s*const dosyaAdi=([^\n]*)\n/);assert(m,'dosyaAdi tanımı bulunamadı');
  const dosyaAdi=new Function('TR_ASCII','return '+m[2].replace(/;$/,''))(eval('('+m[1]+')'));
  assert.strictEqual(dosyaAdi('Çocuk Bahçesi'),'Cocuk_Bahcesi');assert.strictEqual(dosyaAdi('1. Kat'),'1_Kat');assert.strictEqual(dosyaAdi('ŞU AN İÇ'),'SU_AN_IC');assert.strictEqual(dosyaAdi(''),'Plan');
}
console.log('kat-plani çekirdek testleri geçti');
