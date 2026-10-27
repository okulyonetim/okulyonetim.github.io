/* Yönetici rolündeki kullanıcı bir öğretmen kaydına bağlı olsa bile Personel İşleri (ve diğer öğretmenden
 * gizlenen) menü/sayfaları görebilmeli; "öğretmen" adlı roller ise kısıtlı kalmalı.
 * Gerçek kaynak kodu (app-loader.js izin bloğu + app-nav.js sayfa kapıları) vm içinde çalıştırılır. */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const loader=fs.readFileSync('js/app-loader.js','utf8');
const nav=fs.readFileSync('js/core/app-nav.js','utf8');

// ---- 1) PermissionService bloğu
const start=loader.indexOf('const PERMISSION_RANK=');
const end=loader.indexOf('window.gorebilir=');
assert(start>0&&end>start,'İzin bloğu bulunamadı.');
const permissionSource=loader.slice(start,end);

function build(sessionUser,sessionRole,roles=[]){
  const win={AKTIF_KULLANICI:sessionUser,AKTIF_ROL:sessionRole};
  const store={get:k=>k==='session.user'?sessionUser:k==='session.role'?sessionRole:undefined,data:t=>t==='roller'?roles:[]};
  const ctx={window:win,AppStore:store,registry:new Map(),moduleMeta:()=>({visible:true}),applyNavigation(){},document:{querySelectorAll:()=>[],getElementById:()=>null},requestAnimationFrame:f=>f(),CustomEvent:function(){}};
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(permissionSource,ctx);
  return {PermissionService:win.PermissionService,win,store};
}

// ---- 2) app-nav öğretmen kapıları (gerçek satırlar)
const line=name=>{const m=nav.match(new RegExp('^const '+name+'=.*$','m'));assert(m,name+' bulunamadı.');return m[0]};
const shellGates=[line('TEACHER_HIDDEN'),line('isTeacherUser'),line('pageAllowed')].join('\n');

function shellFor(ctx){
  const g={PermissionService:ctx.PermissionService,AKTIF_ROL:ctx.win.AKTIF_ROL,AppStore:ctx.store};
  const sandbox={global:g,user:()=>ctx.win.AKTIF_KULLANICI||{},arr:t=>ctx.store.data(t)};
  vm.createContext(sandbox);
  vm.runInContext(shellGates+'\nthis.api={isTeacherUser,pageAllowed};',sandbox);
  return sandbox.api;
}

const moduleRules={ // Roller sayfasından kaydedilmiş tipik bir rol: tüm modüller açık
  'module.dashboard':'goruntule','module.people':'duzenle','module.academic':'duzenle','module.management':'duzenle',
  'module.communication':'duzenle','module.transport':'duzenle','module.documents':'duzenle','module.reports':'duzenle',
  'module.tools':'duzenle','module.settings':'goruntule','module.food':'duzenle'
};
const run=(user,role,roles)=>{const c=build(user,role,roles);return{ctx:c,ps:c.PermissionService,sh:shellFor(c)}};

// A) Yönetici rolü + bağlı öğretmen (Bilal Baykar senaryosu)
{
  const role={id:'r1',ad:'Yönetici',yetkiler:{...moduleRules}};
  const x=run({uid:'u1',rolId:'r1',bagliOgretmenId:'t1',admin:false},role,[role]);
  assert.strictEqual(x.ps.isManager(),true,'Yönetici rolü yönetici sayılmalı.');
  assert.strictEqual(x.ps.isTeacherAccount(),false,'Yönetici öğretmen hesabı sayılmamalı.');
  assert.strictEqual(x.sh.isTeacherUser(),false,'ShellUI yönetici hesabını öğretmen saymamalı.');
  for(const p of [['management','staff'],['management','tasks'],['documents','evrak'],['transport','services'],['food','audit'],['tools','form-bep'],['tools','form-kulup'],['committees','home']])
    assert.strictEqual(x.sh.pageAllowed(p[0],p[1]),true,`${p.join(':')} yöneticiye görünmeli.`);
  assert.strictEqual(x.ps.moduleLevel('food'),'edit','Yönetici Yemek modülünde düzenleyebilmeli (öğretmen salt-okunur kuralı yok).');
  assert.strictEqual(x.ps.moduleLevel('transport'),'edit','Yönetici Taşıma modülünde düzenleyebilmeli.');
  assert.strictEqual(x.ps.moduleLevel('management'),'edit');
}

// A2) Rol AKTIF_ROL'de yok, yalnız roller listesinde (rolId ile çözülür)
{
  const role={id:'r1',ad:'Okul Müdürü',yetkiler:{...moduleRules}};
  const x=run({uid:'u1',rolId:'r1',bagliOgretmenId:'t1'},null,[role]);
  assert.strictEqual(x.ps.isManager(),true,'Müdür rolü rolId ile çözülüp yönetici sayılmalı.');
  const y=run({uid:'u1',rolId:'r2',bagliOgretmenId:'t1'},{id:'r2',ad:'Müdür Yardımcısı',yetkiler:{...moduleRules}},[]);
  assert.strictEqual(y.ps.isManager(),true,'Müdür yardımcısı yönetici sayılmalı.');
}

// B) Öğretmen rolü kısıtlı kalır
{
  const role={id:'r2',ad:'Öğretmen',yetkiler:{'module.dashboard':'goruntule','module.people':'goruntule','module.management':'goruntule','module.food':'goruntule','module.transport':'goruntule'}};
  const x=run({uid:'u2',rolId:'r2',bagliOgretmenId:'t2'},role,[role]);
  assert.strictEqual(x.ps.isManager(),false);
  assert.strictEqual(x.ps.isTeacherAccount(),true);
  assert.strictEqual(x.sh.isTeacherUser(),true);
  assert.strictEqual(x.sh.pageAllowed('management','staff'),false);
  assert.strictEqual(x.ps.moduleLevel('food'),'read','Öğretmen Yemek modülünde salt-okunur kalmalı.');
  assert.strictEqual(x.ps.moduleLevel('transport'),'read');
}

// B2) "Öğretmen" adlı rolde Yönetim modülü açık olsa bile öğretmen kısıtı sürer
{
  const role={id:'r2',ad:'Öğretmen',yetkiler:{...moduleRules}};
  const x=run({uid:'u2',rolId:'r2',bagliOgretmenId:'t2'},role,[role]);
  assert.strictEqual(x.sh.isTeacherUser(),true,'Öğretmen adlı rolde kısıt korunmalı.');
  assert.strictEqual(x.sh.pageAllowed('management','staff'),false);
}

// C) Başka adlı bir rolde "Yönetim" modülü Roller sayfasında açıkça seçilmişse öğretmen kaydına bağlı olsa da görünür
{
  const role={id:'r3',ad:'Kurul Başkanı',yetkiler:{'module.dashboard':'goruntule','module.people':'goruntule','module.management':'goruntule'}};
  const x=run({uid:'u3',rolId:'r3',bagliOgretmenId:'t3'},role,[role]);
  assert.strictEqual(x.ps.isManager(),false);
  assert.strictEqual(x.ps.isTeacherAccount(),false,'Açıkça seçilen Yönetim izni öğretmen bağlantısını aşmalı.');
  assert.strictEqual(x.sh.isTeacherUser(),false);
  assert.strictEqual(x.sh.pageAllowed('management','staff'),true);
  // ... ama Yönetim seçilmemişse kısıt sürer
  const role2={id:'r4',ad:'Kurul Başkanı',yetkiler:{'module.dashboard':'goruntule','module.people':'goruntule'}};
  const y=run({uid:'u3',rolId:'r4',bagliOgretmenId:'t3'},role2,[role2]);
  assert.strictEqual(y.sh.isTeacherUser(),true,'Yönetim seçilmemiş rolde kısıt sürmeli.');
  // Yönetim açıkça gizliyse hiçbir şekilde açılmaz
  const role3={id:'r5',ad:'Kurul Başkanı',yetkiler:{'module.dashboard':'goruntule','module.management':'gizle'}};
  const z=run({uid:'u3',rolId:'r5',bagliOgretmenId:'t3'},role3,[role3]);
  assert.strictEqual(z.ps.grantsModule('management','read'),false);
  assert.strictEqual(z.ps.moduleLevel('management'),'hidden');
}

// D) Süper admin / kullanıcı yok
{
  const x=run({uid:'a',admin:true,bagliOgretmenId:'t9'},null,[]);
  assert.strictEqual(x.ps.isManager(),false);
  assert.strictEqual(x.ps.isTeacherAccount(),false);
  assert.strictEqual(x.sh.isTeacherUser(),false);
  const y=run(null,null,[]);
  assert.strictEqual(y.ps.isManager(),false);
  assert.strictEqual(y.ps.isTeacherAccount(),false);
}

// E) Kaynak sözleşmeleri
const catalogLabel=(loader.match(/\['module\.management','([^']+)','page'\]/)||[])[1];
assert(/Personel İşleri/.test(catalogLabel||''),'Roller sayfasında Yönetim modülü "Personel İşleri" adıyla bulunabilmeli.');
assert(/'management:staff'/.test(line('TEACHER_HIDDEN')),'Personel İşleri sayfası öğretmen hesabına kapalı listede olmalı.');
const management=fs.readFileSync('js/modules/management.js','utf8');
assert(management.includes("teacher=u.admin!==true&&!!(u.bagliOgretmenId||u.ogretmenId)&&window.PermissionService?.isTeacherAccount?.()!==false"),'Personel İşleri sayfa kapısı aynı kuralı kullanmalı.');
for(const f of ['js/modules/transport.js','js/modules/class-seating.js','js/modules/people.js','js/modules/people-classic-ui.js'])
  assert(fs.readFileSync(f,'utf8').includes('PermissionService?.isManager?.()'),f+' yönetici muafiyetini uygulamalı.');
assert(fs.readFileSync('js/modules/settings.js','utf8').includes("if(global.PermissionService?.isManager?.())return false;"),'Okul bilgileri düzenleme kapısı yöneticiyi öğretmen saymamalı.');

/* Ben sayfasından açılan "Ders programım" kişisel programdır: alttaki "Program ve Takvim" menü bağlantıları yalnız Program sekmesinin kendi sayfasında görünür. */
assert(fs.readFileSync('js/core/nav-pages.js','utf8').includes("const menu=nav().tabs().some(t=>t.key==='program')?nav().menu('program'):null;"),'Program sayfasındaki menü listesi yalnız Program sekmesi varken çizilmeli.');

console.log('manager-linked-teacher-menu.test.js: OK');
