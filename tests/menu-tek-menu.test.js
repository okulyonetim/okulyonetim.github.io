/* Menü sözleşmesi: her sayfa menüdedir ve tek menüdedir.
 *   • Hiçbir menüde olmayan sayfa (menüden çıkarılan, menüsü silinen) "Diğer sayfalar" menüsünde görünür; menü Menü ekranında listelenir.
 *   • Bir sayfa birden çok menüde kayıtlıysa ilk menüsünde kalır.
 *   • Menüye sayfa eklemek sayfayı taşır: eski menüsünde kalmaz. Menüden çıkarılan sayfa "Diğer sayfalar"a geçer.
 *   • Sınır durumları: tüm menüler silinse de sayfaların hepsi görünür; 24 menü varken de Diğer sayfalar oluşur; boş Diğer sayfalar saklanmaz.
 *   • Menü düzenleyici bunu gösterir ve uygular (Şu an: …, Diğer sayfalar'dan çıkarılamaz, menüsüz sayfa düğmesi yok). */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {loadNav}=require('./helpers/app-nav');

const plain=x=>JSON.parse(JSON.stringify(x===undefined?null:x));
const eq=(a,b,m)=>assert.deepStrictEqual(plain(a),plain(b),m);
const R='idareci',K='ka-nav-layout:u1:idareci';
const where=(L,id)=>L.menus.filter(m=>m.ids.includes(id)).map(m=>m.id);

/* ── tek menü: yinelenen kayıt ilk menüde kalır ── */
{
  const {N}=loadNav();
  const def=N.defaultLayout(R);
  const a=def.menus[0],b=def.menus[1],ortak=a.ids[0];
  const cur={v:N.LAYOUT_SURUM,menus:def.menus.map(m=>m.id===b.id?{...m,ids:[ortak,...m.ids]}:m),bar:def.bar,gorulen:N.scopeIds(R),t:1};
  const M=loadNav({store:{[K]:JSON.stringify(cur)}}).N;
  eq(where(M.layoutRaw(R),ortak),[a.id],'Birden çok menüde kayıtlı sayfa ilk menüsünde kalır.');
}

/* ── menüsüz sayfa "Diğer sayfalar"da görünür; bu hesaplanır, kullanıcı düzenleyince kayda girer ── */
{
  const {N}=loadNav();
  const def=N.defaultLayout(R);
  const menus=def.menus.map(m=>({...m,ids:m.ids.filter(id=>id!=='grades'&&id!=='settings')}));
  const cur={v:N.LAYOUT_SURUM,menus,bar:def.bar,gorulen:[...N.scopeIds(R),'tasi:yazili-teslim>sinav'],t:1};
  const {N:M,ls}=loadNav({store:{[K]:JSON.stringify(cur)}});
  const before=ls.get(K);
  const L=M.layoutRaw(R);
  eq(where(L,'grades'),['diger'],'Menüsüz sayfa Diğer sayfalar menüsünde görünür.');
  eq(where(L,'settings'),['diger']);
  eq(L.menus.find(m=>m.id==='diger').ad,'Diğer sayfalar');
  const resolved=M.menus(R).find(m=>m.id==='diger');
  eq(resolved.tools.map(t=>t.id).sort(),['grades','settings'],'Menü ekranında Diğer sayfalar menüsü listelenir.');
  eq([...L.menus.flatMap(m=>m.ids)].sort(),[...M.scopeIds(R)].sort(),'Rolün her sayfası tam bir menüdedir.');
  assert.strictEqual(ls.get(K),before,'Okumak kaydı değiştirmez.');
  M.saveLayout(L,R);
  eq(where(M.layoutRaw(R),'grades'),['diger'],'Kaydedildikten sonra da aynı yerde durur.');
}

/* ── sayfa ekleme taşır; menüden çıkarma Diğer sayfalar'a geçirir; menü silinince sayfaları kaybolmaz ── */
{
  const {N}=loadNav();
  const L=N.layoutRaw(R),from=where(L,'grades')[0],to=L.menus.find(m=>m.id!==from&&m.id!=='diger').id;
  assert(N.moveTool(L.menus,'grades',to),'moveTool başarılı.');
  eq(where(L,'grades'),[to],'Sayfa yalnız yeni menüde kalır; eski menüsünde kalmaz.');
  assert.strictEqual(N.moveTool(L.menus,'yok-boyle-sayfa',to),false,'Bilinmeyen sayfa taşınmaz.');
  assert.strictEqual(N.moveTool(L.menus,'grades','yok-boyle-menu'),false,'Bilinmeyen menüye taşınmaz.');
  eq(where(L,'grades'),[to],'Başarısız taşıma sayfayı yerinde bırakır.');
  N.saveLayout(L,R);
  eq(where(N.layoutRaw(R),'grades'),[to],'Taşıma kaydedilir.');

  const C=N.layoutRaw(R),out=C.menus.find(m=>m.id===to);
  out.ids=out.ids.filter(id=>id!=='grades');
  N.saveLayout(C,R);
  eq(where(N.layoutRaw(R),'grades'),['diger'],'Menüden çıkarılan sayfa Diğer sayfalar menüsüne geçer.');

  const D=N.layoutRaw(R),silinen=D.menus.find(m=>m.id==='okul'),ids=[...silinen.ids];
  D.menus=D.menus.filter(m=>m.id!=='okul');
  N.saveLayout(D,R);
  const E=N.layoutRaw(R);
  ids.forEach(id=>eq(where(E,id),['diger'],`Silinen menünün sayfası (${id}) Diğer sayfalar'da görünür.`));
  eq([...E.menus.flatMap(m=>m.ids)].sort(),[...N.scopeIds(R)].sort(),'Menü silinse de her sayfa tam bir menüdedir.');
}

/* ── sınır durumları ── */
{
  /* tüm menüler silindi: rolün sayfalarının hepsi (eski 60 sayfa sınırından fazla) Diğer sayfalar'da */
  const {N}=loadNav();
  const toplam=N.scopeIds(R).length;
  assert(toplam>60,'Deneme anlamlı olsun: sayfa sayısı eski menü sınırından (60) fazla.');
  const L=N.layoutRaw(R);
  L.menus=[];
  N.saveLayout(L,R);
  const E=N.layoutRaw(R);
  eq(E.menus.map(m=>m.id),['diger']);
  eq(E.menus[0].ids.length,toplam,'Tüm sayfalar Diğer sayfalar menüsüne sığar, hiçbiri kaybolmaz.');

  /* 24 menü varken de Diğer sayfalar oluşur (menü sınırına sayılmaz) ve kayıttan sonra da durur */
  const tum=N.scopeIds(R),M24=Array.from({length:N.MENU_MAX},(_,i)=>({id:`m${i}`,ad:`Menü ${i}`,icon:'grid',tone:'slate',ids:[tum[i]]}));
  const X=N.layoutRaw(R);
  X.menus=M24;
  N.saveLayout(X,R);
  const Y=N.layoutRaw(R);
  eq(Y.menus.length,N.MENU_MAX+1,'24 menüye ek olarak Diğer sayfalar menüsü eklenir.');
  eq(Y.menus.find(m=>m.id==='diger').ids.length,tum.length-N.MENU_MAX,'Kalan sayfaların hepsi orada.');

  /* boş Diğer sayfalar saklanmaz */
  const Z=loadNav().N;
  const base=Z.layoutRaw(R);
  base.menus=[...base.menus,{id:'diger',ad:'Diğer sayfalar',icon:'grid',tone:'slate',ids:[]}];
  Z.saveLayout(base,R);
  eq(Z.layoutRaw(R).menus.some(m=>m.id==='diger'),false,'Sayfası kalmayan Diğer sayfalar menüsü saklanmaz.');
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

  /* ana ekran: menüsüz sayfa bildirimi ve düğmesi yok (her sayfa zaten bir menüde) */
  const home=reg['menu-edit'].html('');
  assert(!/data-ne="orphans"/.test(home)&&!/hiçbir menüde yok/.test(home),'Menüsüz sayfa bildirimi ve "Hepsini ekle" düğmesi kalktı.');

  /* Sayfa ekle: başka menüdeki sayfanın alt yazısında hangi menüde olduğu yazar, ipucu taşımayı söyler */
  const L=N.layoutRaw(R),hedef=L.menus[0],baska=L.menus[1],tid=baska.ids[0];
  const add=reg['menu-add'].html(hedef.id);
  assert(add.includes(`Şu an: ${baska.ad}`),'Başka menüdeki sayfanın hangi menüde olduğu yazılır.');
  assert(/bu menüye taşınır/.test(add),'İpucu sayfanın taşınacağını söyler.');

  /* işaretleyince taşınır, alt yazı güncellenir */
  current=`menu-add:${hedef.id}`;
  const target={dataset:{neAdd:tid},checked:true,closest:sel=>sel==='[data-ne-add]'?target:sel==='label'?etiket:null};
  listeners.change({target});
  eq(where(N.layoutRaw(R),tid),[hedef.id],'İşaretlenen sayfa yeni menüye taşınır, eski menüsünde kalmaz.');
  assert(!small.textContent.includes('Şu an'),'Sayfa bu menüde: alt yazıda konum yazmaz.');

  /* işareti kaldırınca Diğer sayfalar'a geçer */
  target.checked=false;
  listeners.change({target});
  eq(where(N.layoutRaw(R),tid),['diger'],'İşaret kaldırılınca sayfa Diğer sayfalar menüsüne geçer.');
  assert(small.textContent.includes('Şu an: Diğer sayfalar'),`Alt yazı yeni konumu gösterir (${small.textContent}).`);

  /* Diğer sayfalar'da işaret kaldırılamaz: sayfa menüsüz kalamaz */
  current='menu-add:diger';
  target.checked=false;
  listeners.change({target});
  assert.strictEqual(target.checked,true,'Diğer sayfalar menüsündeki sayfanın işareti geri alınır.');
  eq(where(N.layoutRaw(R),tid),['diger']);

  /* Diğer sayfalar menüsü: sayfalar çıkarılamaz, menü silinemez, açıklama var */
  const diger=reg['menu-edit'].html('diger');
  assert(!/data-ne="menu-del"/.test(diger),'Diğer sayfalar menüsü silinemez.');
  const del=[...diger.matchAll(/<button[^>]*data-ne="item-del"[^>]*>/g)].map(x=>x[0]);
  assert(del.length&&del.every(b=>/disabled/.test(b)),'Diğer sayfalar menüsündeki sayfalar "Menüden çıkar" ile çıkarılamaz.');
  assert(/Hiçbir menüde olmayan sayfalar burada toplanır/.test(diger));
  const normal=reg['menu-edit'].html(hedef.id);
  assert(/data-ne="menu-del"/.test(normal),'Diğer menüler silinebilir.');

  /* kaynak: silme uyarısı sayfaların Diğer sayfalar'a geçtiğini söyler */
  const kaynak=fs.readFileSync('js/core/nav-editor.js','utf8');
  assert(/İçindeki sayfalar silinmez, “Diğer sayfalar” menüsüne geçer/.test(kaynak),'Menü silme uyarısı sayfaların nereye gideceğini söyler.');
}
console.log('Menü sözleşmesi geçti: her sayfa menüde ve tek menüde.');
