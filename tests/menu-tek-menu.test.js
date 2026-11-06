/* Menü sözleşmesi: bir sayfa en çok bir klasördedir; hiçbir klasörde olmayan sayfa Menü ekranında doğrudan, A'dan Z'ye listelenir.
 *   • "Diğer sayfalar" gibi sanal klasör yoktur.
 *   • Bir sayfa birden çok klasörde kayıtlıysa ilk klasöründe kalır.
 *   • Klasöre sayfa eklemek sayfayı taşır (eski klasöründe kalmaz) ve menüsüz listeden kaldırır; klasörden çıkarılan sayfa menüsüz listeye geçer.
 *   • Menü ekranı (hub) klasör kutularının altında menüsüz sayfaları A–Z gösterir; hepsi klasördeyse bölüm çıkmaz.
 *   • Menü düzenleyici bunu söyler (Şu an: …, menüsüz sayfa bildirimi ve "Hepsini uygun menüye ekle"). */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {loadNav}=require('./helpers/app-nav');

const plain=x=>JSON.parse(JSON.stringify(x===undefined?null:x));
const eq=(a,b,m)=>assert.deepStrictEqual(plain(a),plain(b),m);
const R='idareci',K='ka-nav-layout:u1:idareci';
const where=(L,id)=>L.menus.filter(m=>m.ids.includes(id)).map(m=>m.id);
const az=list=>[...list].sort((a,b)=>a.label.localeCompare(b.label,'tr')).map(t=>t.id);

/* ── tek klasör: yinelenen kayıt ilk klasörde kalır ── */
{
  const {N}=loadNav();
  const def=N.defaultLayout(R);
  const a=def.menus[0],b=def.menus[1],ortak=a.ids[0];
  const cur={v:N.LAYOUT_SURUM,menus:def.menus.map(m=>m.id===b.id?{...m,ids:[ortak,...m.ids]}:m),bar:def.bar,gorulen:N.scopeIds(R),t:1};
  const M=loadNav({store:{[K]:JSON.stringify(cur)}}).N;
  eq(where(M.layoutRaw(R),ortak),[a.id],'Birden çok klasörde kayıtlı sayfa ilk klasöründe kalır.');
}

/* ── klasörsüz sayfa menüsüz sayılır, A–Z sıralanır; sanal klasör oluşmaz; okumak kaydı değiştirmez ── */
{
  const {N}=loadNav();
  const def=N.defaultLayout(R);
  const menus=def.menus.map(m=>({...m,ids:m.ids.filter(id=>id!=='grades'&&id!=='settings')}));
  const cur={v:N.LAYOUT_SURUM,menus,bar:def.bar,gorulen:[...N.scopeIds(R),'tasi:yazili-teslim>sinav'],t:1};
  const {N:M,ls}=loadNav({store:{[K]:JSON.stringify(cur)}});
  const before=ls.get(K);
  const L=M.layoutRaw(R);
  eq(where(L,'grades'),[],'Klasörsüz sayfa hiçbir klasörde değildir.');
  eq(where(L,'settings'),[]);
  assert(!L.menus.some(m=>m.id==='diger'||m.ad==='Diğer sayfalar'),'"Diğer sayfalar" klasörü oluşturulmaz.');
  const loose=M.inNoMenu(R);
  eq(loose.map(t=>t.id).sort(),['grades','settings'],'Menüsüz liste klasörsüz sayfaları içerir.');
  eq(loose.map(t=>t.id),az(loose),'Menüsüz liste A\'dan Z\'ye sıralıdır.');
  assert.strictEqual(ls.get(K),before,'Okumak kaydı değiştirmez.');
  M.saveLayout(L,R);
  eq(M.inNoMenu(R).map(t=>t.id).sort(),['grades','settings'],'Kaydedildikten sonra da aynı sayfalar menüsüzdür.');
  eq(where(M.layoutRaw(R),'grades'),[],'Kayıt sayfayı sessizce bir klasöre koymaz.');
}

/* ── sayfa ekleme taşır ve menüsüz listeden alır; klasörden çıkarma menüsüz listeye verir; klasör silinince sayfalar menüsüz kalır ── */
{
  const {N}=loadNav();
  const L=N.layoutRaw(R),from=where(L,'grades')[0],to=L.menus.find(m=>m.id!==from).id;
  assert(N.moveTool(L.menus,'grades',to),'moveTool başarılı.');
  eq(where(L,'grades'),[to],'Sayfa yalnız yeni klasörde kalır; eski klasöründe kalmaz.');
  assert.strictEqual(N.moveTool(L.menus,'yok-boyle-sayfa',to),false,'Bilinmeyen sayfa taşınmaz.');
  assert.strictEqual(N.moveTool(L.menus,'grades','yok-boyle-menu'),false,'Bilinmeyen klasöre taşınmaz.');
  eq(where(L,'grades'),[to],'Başarısız taşıma sayfayı yerinde bırakır.');
  N.saveLayout(L,R);
  eq(where(N.layoutRaw(R),'grades'),[to],'Taşıma kaydedilir.');
  assert(!N.inNoMenu(R).some(t=>t.id==='grades'),'Klasördeki sayfa menüsüz listede görünmez.');

  const C=N.layoutRaw(R),out=C.menus.find(m=>m.id===to);
  out.ids=out.ids.filter(id=>id!=='grades');
  N.saveLayout(C,R);
  eq(where(N.layoutRaw(R),'grades'),[],'Klasörden çıkarılan sayfa hiçbir klasörde olmaz.');
  assert(N.inNoMenu(R).some(t=>t.id==='grades'),'Klasörden çıkarılan sayfa menüsüz listeye geçer.');

  const D=N.layoutRaw(R),silinen=D.menus.find(m=>m.id==='okul'),ids=[...silinen.ids];
  D.menus=D.menus.filter(m=>m.id!=='okul');
  N.saveLayout(D,R);
  const E=N.layoutRaw(R),loose=N.inNoMenu(R).map(t=>t.id);
  assert(!E.menus.some(m=>m.id==='diger'),'Klasör silinince sanal klasör oluşmaz.');
  ids.forEach(id=>assert(loose.includes(id),`Silinen klasörün sayfası (${id}) menüsüz listede görünür.`));
  eq(loose,az(N.inNoMenu(R)),'Silme sonrası liste A\'dan Z\'ye.');
}

/* ── sınır durumları: tüm klasörler silinse de her sayfa listede; sayfa sınırı yok ── */
{
  const {N}=loadNav();
  const toplam=N.allTools().length;
  const L=N.layoutRaw(R);
  L.menus=[];
  N.saveLayout(L,R);
  const E=N.layoutRaw(R);
  eq(E.menus,[],'Klasör kalmadıysa sanal klasör eklenmez.');
  eq(N.inNoMenu(R).length,toplam,'Tüm sayfalar menüsüz listede kalır, hiçbiri kaybolmaz.');
  eq(N.toolCount(R),toplam,'Sayfa sayısı yalnız bir kez sayılır.');
}

/* ── placeOrphans: kendi klasörü olan sayfayı yerleştirir, olmayanı menüsüz bırakır ── */
{
  const {N}=loadNav();
  const L=N.layoutRaw(R);
  L.menus.forEach(m=>{m.ids=m.ids.filter(id=>id!=='grades')});
  N.saveLayout(L,R);
  const n=N.placeOrphans(R);
  assert(n>=1,'placeOrphans en az bir sayfayı yerleştirir.');
  eq(where(N.layoutRaw(R),'grades').length,1,'Yerleşen sayfa tam bir klasörde.');
  eq(N.placeOrphans(R),0,'Eklenecek sayfa kalmadıysa 0.');
}

/* ── Menü ekranı: klasör kutularının altında menüsüz sayfalar A–Z, doğrudan listelenir ── */
{
  const {N,win}=loadNav();
  win.document={addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null};
  vm.runInContext(fs.readFileSync('js/core/nav-pages.js','utf8'),win,{filename:'nav-pages.js'});
  const root={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
  const hub=()=>{assert(win.NavPages.render('tools',{root}),'Menü ekranı çizilir.');return root.innerHTML};
  const sayfalar=h=>{
    const i=h.indexOf('<h3>Sayfalar<span>');
    if(i<0)return null;
    const bolum=h.slice(i,h.indexOf('</section>',i)===-1?undefined:h.length);
    return[...bolum.matchAll(/data-nav-tool="([^"]+)"/g)].map(x=>x[1]);
  };

  /* her sayfa klasörde: "Sayfalar" bölümü çıkmaz */
  eq(N.inNoMenu(R).length,0);
  let h=hub();
  assert(!/<h3>Sayfalar<span>/.test(h),'Tüm sayfalar klasördeyken doğrudan sayfa bölümü yoktur.');
  assert(!/Diğer sayfalar/.test(h),'Menü ekranında "Diğer sayfalar" yoktur.');

  /* sayfaları klasörden çıkar: klasör kutularından sonra A–Z listelenir */
  const L=N.layoutRaw(R);
  L.menus.forEach(m=>{m.ids=m.ids.filter(id=>!['settings','grades','about','guide'].includes(id))});
  N.saveLayout(L,R);
  h=hub();
  const gtiles=h.indexOf('ka-nav-gtiles'),bolum=h.indexOf('<h3>Sayfalar<span>4</span></h3>');
  assert(bolum>gtiles&&gtiles>0,'Doğrudan sayfa listesi klasör kutularının altındadır.');
  const ids=[...h.slice(bolum).matchAll(/data-nav-tool="([^"]+)"/g)].map(x=>x[1]).filter((x,i,a)=>a.indexOf(x)===i);
  eq(ids,az(N.inNoMenu(R)),'Doğrudan listelenen sayfalar A\'dan Z\'ye sıralıdır.');
  eq(ids.slice().sort(),['about','grades','guide','settings']);
  assert(/data-nav-star="settings"/.test(h.slice(bolum)),'Satırlarda sık kullanılan yıldızı vardır.');
  assert(!/Diğer sayfalar/.test(h),'Menüsüz sayfalar için klasör kutusu çıkmaz.');

  /* bir klasöre eklenince listeden kalkar, klasörde sayılır */
  const M=N.layoutRaw(R),hedef=M.menus[0];
  N.moveTool(M.menus,'grades',hedef.id);
  N.saveLayout(M,R);
  h=hub();
  const b2=h.indexOf('<h3>Sayfalar<span>3</span></h3>');
  assert(b2>0,'Sayfa sayısı 3\'e düşer.');
  assert(!/data-nav-tool="grades"/.test(h.slice(b2)),'Klasöre eklenen sayfa doğrudan listeden kalkar.');
  eq(where(N.layoutRaw(R),'grades'),[hedef.id]);
}

/* ── menü düzenleyici: gösterir ve uygular ── */
{
  const {N,win}=loadNav();
  const reg={},listeners={};
  win.NavPages={
    register:(k,v)=>{reg[k]=v},current:()=>current,
    helpers:{esc:s=>String(s??''),ico:()=>'',gico:()=>'',head:(t,s)=>`<h1>${t}</h1><p>${s||''}</p>`,pageRoot:(k,b)=>b,rowCard:x=>x,emptyState:s=>s,chevron:()=>'',ic:n=>`[${n}]`}
  };
  let current='menu-edit';
  const small={textContent:''},etiket={querySelector:()=>small};
  const root={contains:()=>true,querySelector:()=>({}),querySelectorAll:()=>[]};
  win.document={addEventListener:(t,f)=>{listeners[t]=f},querySelector:()=>root,querySelectorAll:()=>[]};
  win.ShellUI={back(){}};
  win.AppNav=N;
  vm.runInContext(fs.readFileSync('js/core/nav-editor.js','utf8'),win,{filename:'nav-editor.js'});

  /* ana ekran: her sayfa klasördeyken bildirim yok */
  let home=reg['menu-edit'].html('');
  assert(!/data-ne="orphans"/.test(home),'Menüsüz sayfa yokken "Hepsini ekle" düğmesi çıkmaz.');

  /* Sayfa ekle: başka klasördeki sayfanın alt yazısında yeri yazar, ipucu taşımayı ve menüsüz listeyi söyler */
  const L=N.layoutRaw(R),hedef=L.menus[0],baska=L.menus[1],tid=baska.ids[0];
  const add=reg['menu-add'].html(hedef.id);
  assert(add.includes(`Şu an: ${baska.ad}`),'Başka klasördeki sayfanın hangi klasörde olduğu yazılır.');
  assert(/bu menüye taşınır/.test(add),'İpucu sayfanın taşınacağını söyler.');
  assert(/menüsüz kalır ve Menü ekranında listelenir/.test(add),'İpucu işareti kaldırılınca sayfanın nerede görüneceğini söyler.');
  assert(!/Diğer sayfalar/.test(add),'İpucunda "Diğer sayfalar" geçmez.');

  /* işaretleyince taşınır, alt yazı güncellenir */
  current=`menu-add:${hedef.id}`;
  const target={dataset:{neAdd:tid},checked:true,closest:sel=>sel==='[data-ne-add]'?target:sel==='label'?etiket:null};
  listeners.change({target});
  eq(where(N.layoutRaw(R),tid),[hedef.id],'İşaretlenen sayfa yeni klasöre taşınır, eskisinde kalmaz.');
  assert(!small.textContent.includes('Şu an'),'Sayfa bu klasördeyse alt yazıda konum yazmaz.');

  /* işareti kaldırınca klasörsüz kalır ve Menü ekranında listelenir */
  target.checked=false;
  listeners.change({target});
  eq(where(N.layoutRaw(R),tid),[],'İşaret kaldırılınca sayfa hiçbir klasörde olmaz.');
  assert(N.inNoMenu(R).some(t=>t.id===tid),'İşareti kaldırılan sayfa menüsüz listeye geçer.');
  eq(small.textContent,N.tool(tid).sub||'','Klasörsüz sayfanın alt yazısı yalnız kendi açıklamasıdır; eski klasörü yazmaz.');

  /* ana ekran: menüsüz sayfa bildirimi ve "Hepsini uygun menüye ekle" düğmesi */
  home=reg['menu-edit'].html('');
  assert(/data-ne="orphans"/.test(home),'Menüsüz sayfa varken "Hepsini uygun menüye ekle" düğmesi çıkar.');
  assert(/sayfa hiçbir menüde değil/.test(home)&&/A'dan Z'ye listelenir/.test(home),'Bildirim sayfaların Menü ekranında A–Z listelendiğini söyler.');

  /* klasör sayfası: her klasör silinebilir, sayfa çıkarma açık */
  const normal=reg['menu-edit'].html(hedef.id);
  assert(/data-ne="menu-del"/.test(normal),'Klasörler silinebilir.');
  const del=[...normal.matchAll(/<button[^>]*data-ne="item-del"[^>]*>/g)].map(x=>x[0]);
  assert(del.length&&del.every(b=>!/disabled/.test(b)),'Klasörden sayfa çıkarma kapalı değildir.');

  /* kaynak: silme uyarısı sayfaların menüsüz kaldığını söyler; Diğer sayfalar kalıntısı yok */
  const kaynak=fs.readFileSync('js/core/nav-editor.js','utf8');
  assert(/İçindeki sayfalar silinmez; menüsüz kalır ve Menü ekranında listelenir/.test(kaynak),'Menü silme uyarısı sayfaların nereye gideceğini söyler.');
  assert(!/['"`]diger['"`]|DIGER|Diğer sayfalar/.test(kaynak),'nav-editor.js içinde "Diğer sayfalar" kalıntısı yok.');
  assert(!/['"`]diger['"`]|DIGER|Diğer sayfalar/.test(fs.readFileSync('js/core/nav-pages.js','utf8')),'nav-pages.js içinde "Diğer sayfalar" kalıntısı yok.');
  assert(!/['"`]diger['"`]|DIGER|Diğer sayfalar/.test(fs.readFileSync('js/core/app-nav.js','utf8')),'app-nav.js içinde "Diğer sayfalar" kalıntısı yok.');
}
console.log('Menü sözleşmesi geçti: klasörsüz sayfalar Menü ekranında A–Z, her sayfa tek yerde.');
