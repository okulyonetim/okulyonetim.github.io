/* Alt menü sözleşmesi: beş yuvanın hepsi kullanıcının seçtiği gibidir ("Ben" dahil).
 *   • Kaydedilmiş alt menüde Ben bulunmayabilir; düzen olduğu gibi korunur.
 *   • Tek kural: Menü ya da Ben'den biri alt menüde kalır (profil, çıkış, menü düzeni ve tüm sayfalar bunlardan açılır).
 *   • Ben alt menüde değilse: Menü ekranında "Ben" satırı çıkar; Ayarlar gibi sayfalar Menü'yü aydınlatır ve geri dönüşü Menü'dür;
 *     Ben ve düzenleme sayfaları Menü'ye bağlanır.
 *   • Düzenleyici: Ben'in yuvasına başka öğe konabilir; Menü ve Ben birlikte çıkarılamaz. */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {loadNav}=require('./helpers/app-nav');

const plain=x=>JSON.parse(JSON.stringify(x===undefined?null:x));
const eq=(a,b,m)=>assert.deepStrictEqual(plain(a),plain(b),m);
const R='idareci',K='ka-nav-layout:u1:idareci';
const stored=bar=>{
  const {N}=loadNav();
  const def=N.defaultLayout(R);
  return{N,store:{[K]:JSON.stringify({v:N.LAYOUT_SURUM,menus:def.menus,bar,fav:[],gorulen:N.scopeIds(R),t:1})}};
};

/* ── kayıtlı alt menüde Ben yoksa korunur ── */
{
  const bar=['home','menu:okul','tools','tool:idareci-pano','tool:settings'];
  const {store}=stored(bar);
  const {N}=loadNav({store});
  eq(N.layoutRaw(R).bar,bar,'Ben\'siz alt menü olduğu gibi kalır.');
  eq(N.tabs(R).map(t=>t.key),bar,'Alt çubuk seçilen beş öğeyi gösterir.');
}
{
  const bar=['menu:okul','menu:evrak','tool:written','tool:settings','tool:idareci-pano'];
  const {store}=stored(bar);
  const {N}=loadNav({store});
  const out=N.layoutRaw(R).bar;
  assert(out.includes('tools')||out.includes('me'),'Menü de Ben de yoksa son yuvaya Menü konur.');
  eq(out.slice(0,4),bar.slice(0,4),'Diğer yuvalar değişmez.');
  eq(out[4],'tools');
}
{
  /* Menü yok, Ben var: serbest */
  const bar=['home','menu:okul','menu:evrak','tool:idareci-pano','me'];
  const {store}=stored(bar);
  eq(loadNav({store}).N.layoutRaw(R).bar,bar,'Ben varsa Menü zorunlu değildir.');
}

/* ── Ben alt menüde değilken: sayfa aydınlatma ve geri dönüş Menü'dür ── */
{
  const {store}=stored(['home','menu:okul','tools','tool:idareci-pano','menu:evrak']);
  const {N}=loadNav({store});
  eq(N.tabs(R).some(t=>t.key==='me'),false);
  const ayar=N.tool('settings');
  eq(N.tabOf(ayar.route,ayar.page),'tools','Ayarlar Ben yokken Menü\'yü aydınlatır.');
  const p=N.parentOf(ayar.route,ayar.page);
  assert(p!=='me','Ayarlar\'ın geri dönüşü Ben olamaz (alt menüde yok).');
  assert(p==='tools'||p.startsWith('menu:'),`Geri dönüş Menü ya da bir klasördür (${p}).`);
}
{
  /* Ben alt menüdeyse eski davranış aynen sürer */
  const {N}=loadNav();
  const ayar=N.tool('settings');
  eq(N.tabOf(ayar.route,ayar.page),'me','Ben alt menüdeyken Ayarlar Ben\'i aydınlatır.');
  eq(N.parentOf('settings',''),'me','Ben alt menüdeyken Ayarlar\'ın geri dönüşü Ben.');
}

/* ── sayfalar: NavPages.info ve Menü ekranındaki Ben satırı ── */
function pages(store){
  const {N,win}=loadNav({store});
  win.document={addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,documentElement:{getAttribute:()=>'light'}};
  vm.runInContext(fs.readFileSync('js/core/nav-pages.js','utf8'),win,{filename:'nav-pages.js'});
  const root={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
  return{N,win,hub:()=>{assert(win.NavPages.render('tools',{root}));return root.innerHTML}};
}
{
  const {store}=stored(['home','menu:okul','tools','tool:idareci-pano','menu:evrak']);
  const {win,hub}=pages(store);
  const i=win.NavPages.info('me',R);
  eq([i.tab,i.parent],['tools','tools'],'Ben alt menüde değilse Menü\'ye bağlanır.');
  const h=hub();
  assert(/data-nav-page-go="me"/.test(h),'Menü ekranında "Ben" satırı çıkar.');
  assert(/Profil, görünüm, menü düzeni ve çıkış/.test(h));
  assert(/data-nav-page-go="menu-edit"/.test(h),'Menüyü düzenle düğmesi Menü ekranında durur.');
}
{
  const {win,hub}=pages({});
  const i=win.NavPages.info('me',R);
  eq([i.tab,i.parent],['me',''],'Ben alt menüdeyse eskisi gibi.');
  assert(!/data-nav-page-go="me"/.test(hub()),'Ben alt menüdeyken Menü ekranında ayrıca "Ben" satırı yoktur.');
}

/* ── düzenleyici ── */
{
  const {store}=stored(['home','menu:okul','tools','tool:idareci-pano','me']);
  const {N,win}=loadNav({store});
  const reg={},listeners={},toasts=[];
  win.NavPages={
    register:(k,v)=>{reg[k]=v},current:()=>'bar-pick:4',
    helpers:{esc:s=>String(s??''),ico:()=>'',gico:()=>'',head:(t,s)=>`<h1>${t}</h1><p>${s||''}</p>`,pageRoot:(k,b)=>b,rowCard:x=>x,emptyState:s=>s,chevron:()=>'',ic:n=>`[${n}]`}
  };
  const backs=[];
  const root={contains:()=>true,querySelector:()=>({}),querySelectorAll:()=>[]};
  win.document={addEventListener:(t,f)=>{listeners[t]=f},querySelector:()=>root,querySelectorAll:()=>[]};
  win.ShellUI={back(){backs.push(1)}};
  win.toast=m=>toasts.push(m);
  win.AppNav=N;
  vm.runInContext(fs.readFileSync('js/core/nav-editor.js','utf8'),win,{filename:'nav-editor.js'});
  const click=(slot,key)=>{const btn={dataset:{ne:'pick',slot:String(slot),key}};listeners.click({preventDefault(){},target:{closest:s=>s==='[data-ne]'?btn:null}})};

  /* ana ekran açıklaması: Ben'in kilitli olduğunu söylemez */
  const home=reg['menu-edit'].html('');
  assert(!/“Ben” alt menüde kalmalıdır/.test(home),'Eski "Ben kalmalıdır" açıklaması kalktı.');
  assert(/Beş yuvanın hepsini değiştirebilirsiniz/.test(home),'Açıklama beş yuvanın serbest olduğunu söyler.');

  /* Ben'in yuvasına başka sayfa konabilir */
  click(4,'tool:settings');
  eq(N.layoutRaw(R).bar,['home','menu:okul','tools','tool:idareci-pano','tool:settings'],'Ben\'in yuvası değiştirildi.');
  eq(toasts,[],'Uyarı çıkmaz.');
  assert(backs.length===1,'Seçimden sonra geri dönülür.');

  /* Menü de çıkarılmak istenirse: Menü ya da Ben'den biri kalmalı */
  click(2,'tool:written');
  eq(N.layoutRaw(R).bar,['home','menu:okul','tools','tool:idareci-pano','tool:settings'],'Menü ve Ben birlikte çıkarılamaz; düzen değişmez.');
  assert(/Menü ya da Ben alt menüde kalmalı/.test(toasts[toasts.length-1]||''),'Neden açıklanır.');
  assert(backs.length===1,'Reddedilen seçimde ekran açık kalır.');

  /* Ben'i geri koyunca Menü başka yuvaya gidebilir */
  click(1,'me');
  eq(N.layoutRaw(R).bar,['home','me','tools','tool:idareci-pano','tool:settings'],'Zaten alt menüdeki olmayan öğe seçilince yer değiştirir.');
  click(2,'tool:written');
  eq(N.layoutRaw(R).bar,['home','me','tool:written','tool:idareci-pano','tool:settings'],'Ben alt menüdeyse Menü çıkarılabilir.');

  /* aynı öğeyi başka yuvaya seçmek iki yuvayı değiştirir (öğe iki yerde durmaz) */
  click(0,'tool:settings');
  eq(N.layoutRaw(R).bar,['tool:settings','me','tool:written','tool:idareci-pano','home'],'Seçilen öğe başka yuvadaysa yuvalar yer değiştirir.');

  /* düzenleme sayfaları Ben alt menüdeyken Ben'e bağlıdır */
  eq(reg['menu-edit'].info('',R).tab,'me');
  eq(reg['menu-edit'].info('',R).parent,'me');
  /* Ben çıkınca Menü'ye bağlanır */
  click(1,'tools');
  assert(!N.tabs(R).some(t=>t.key==='me'));
  const e=reg['menu-edit'].info('',R);
  eq([e.tab,e.parent],['tools','tools'],'Ben alt menüde değilse düzenleme sayfaları Menü\'ye bağlanır.');
  eq(reg['bar-pick'].info('1',R).tab,'tools');
  eq(reg['menu-add'].info('okul',R).tab,'tools');
}
console.log('Alt menü sözleşmesi geçti: beş yuva serbest; Menü ya da Ben kalır.');
