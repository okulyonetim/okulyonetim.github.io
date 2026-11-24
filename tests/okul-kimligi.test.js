// İki okul, iki logo: ilkokul (1–4) ve ortaokul (5–8) için okul adı ve logo seçimi
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=f=>fs.readFileSync(f,'utf8');
const idSrc=read('js/core/school-identity.js'),engSrc=read('js/modules/report-engine.js'),sbSrc=read('js/modules/sinif-baglam.js');

const AYAR={id:'ayarlar',okulAdi:'Koruk İlk-Ortaokulu',ilkokulAdi:'',ortaokulAdi:'',kademeler:['ilkokul','ortaokul']};
function ortam({kullanici={},ogretmenler=[],siniflar=[],ayar=AYAR}={}){
  const data={okulBilgileri:[ayar],ogretmenler,siniflar};
  const el=()=>({attrs:{},textContent:'',getAttribute(k){return this.attrs[k]??null},setAttribute(k,v){this.attrs[k]=v}});
  const logo=el(),ad=el();logo.attrs.src='assets/icon-192.png';logo.attrs.alt='Koruk İlk-Ortaokulu';ad.textContent='KORUK İLK-ORTAOKULU';
  const document={readyState:'complete',querySelector:q=>q==='.ka-school-logo'?logo:q==='.ka-app-brand strong'?ad:null,addEventListener(){}};
  const abone=[];
  const win={document,AppStore:{data:t=>data[t]||[],get:p=>p==='session.user'?kullanici:null,subscribe:(p,f)=>{abone.push([p,f]);return()=>{}}},location:{href:'http://x/'},navigator:{userAgent:''}};win.window=win;
  const ctx=vm.createContext({window:win,document,URL,console,Intl,Date,String,Array,Number,Math,Promise,Object,Set,setTimeout,clearTimeout,navigator:win.navigator});
  vm.runInContext(idSrc,ctx);
  return{win,logo,ad,data,abone,ctx};
}
const OGR=(id,ilk,orta)=>({id,ilkokul:ilk,ortaokul:orta});

test('sınıf düzeyi okulu belirler: 1–4 ilkokul, 5–8 ortaokul (varsayılan adlarla)',()=>{
  const {win}=ortam(),S=win.SchoolIdentity;
  for(const c of [1,2,3,4,'3/B','4-A'])assert.equal(S.get(c).kademe,'ilkokul',String(c));
  for(const c of [5,6,7,8,'5/A','8-C',{duzey:6},{sinif:'7/B'}])assert.equal(S.get(c).kademe,'ortaokul',JSON.stringify(c));
  assert.equal(S.okulAdi('2/A'),'Koruk İlkokulu');
  assert.equal(S.okulAdi('5/A'),'Şehit Remzi Yemez Ortaokulu');
  assert.equal(S.logo('2/A'),'assets/logo.png');
  assert.equal(S.logo('5/A'),'assets/logo-ortaokul.png');
});

test('Okul Bilgileri’nde yazılan kademe adları varsayılanın yerine geçer',()=>{
  const {win}=ortam({ayar:{...AYAR,ilkokulAdi:'Koruk Özel İlkokulu',ortaokulAdi:'Remzi Yemez Ortaokulu'}}),S=win.SchoolIdentity;
  assert.equal(S.okulAdi(3),'Koruk Özel İlkokulu');
  assert.equal(S.okulAdi(7),'Remzi Yemez Ortaokulu');
});

test('giriş yapan öğretmenin kademesi: ilkokul → ilkokul logosu, ortaokul → ortaokul logosu',()=>{
  const il=ortam({kullanici:{bagliOgretmenId:'t1'},ogretmenler:[OGR('t1',true,false)]}).win.SchoolIdentity.get();
  assert.equal(il.kademe,'ilkokul');assert.equal(il.logo,'assets/logo.png');assert.equal(il.okulAdi,'Koruk İlkokulu');
  const or=ortam({kullanici:{bagliOgretmenId:'t2'},ogretmenler:[OGR('t2',false,true)]}).win.SchoolIdentity.get();
  assert.equal(or.kademe,'ortaokul');assert.equal(or.logo,'assets/logo-ortaokul.png');assert.equal(or.okulAdi,'Şehit Remzi Yemez Ortaokulu');
});

test('iki kademede de görevli öğretmen sınıf öğretmenliğine, yönetici genel kimliğe düşer',()=>{
  const sinifli=ortam({kullanici:{bagliOgretmenId:'t3'},ogretmenler:[OGR('t3',true,true)],siniflar:[{id:'c1',ad:'6/A',sinifOgretmeniId:'t3'}]});
  assert.equal(sinifli.win.SchoolIdentity.kademe(),'ortaokul');
  const yonetici=ortam({kullanici:{},ogretmenler:[OGR('t3',true,true)]}).win.SchoolIdentity.get();
  assert.equal(yonetici.kademe,'');assert.equal(yonetici.okulAdi,'Koruk İlk-Ortaokulu');assert.equal(yonetici.logo,'assets/logo.png');
});

test('bağlam kullanıcının kademesini ezer; karma sınıf listesi genel kimliği verir',()=>{
  const {win}=ortam({kullanici:{bagliOgretmenId:'t1'},ogretmenler:[OGR('t1',true,false)]}),S=win.SchoolIdentity;
  assert.equal(S.kademe('6/B'),'ortaokul','ilkokul öğretmeni ortaokul sınıfı için belge hazırlarsa ortaokul kimliği');
  assert.equal(S.kademe({siniflar:['3/A','4/B']}),'ilkokul');
  assert.equal(S.kademe({siniflar:['4/A','5/A']}),'','dört ve beşinci sınıf birlikte: genel ad');
  assert.equal(S.get({siniflar:['4/A','5/A']}).okulAdi,'Koruk İlk-Ortaokulu');
});

test('tek kademeli kurumda ayrım yapılmaz',()=>{
  const {win}=ortam({ayar:{...AYAR,kademeler:['ortaokul']}}),S=win.SchoolIdentity;
  assert.equal(S.kademe('2/A'),'');assert.equal(S.logo('2/A'),'assets/logo.png');
});

test('uygulama başlığı giriş yapanın okulunun simgesi ve adıyla güncellenir; yönetici özgün başlığı görür',()=>{
  const o=ortam({kullanici:{bagliOgretmenId:'t2'},ogretmenler:[OGR('t2',false,true)]});
  assert.equal(o.logo.attrs.src,'assets/icon-ortaokul-192.png');
  assert.equal(o.ad.textContent,'ŞEHİT REMZİ YEMEZ ORTAOKULU');
  assert.ok(o.abone.some(([p])=>p==='session.user')&&o.abone.some(([p])=>p==='data.okulBilgileri'),'oturum ve okul bilgisi değişince başlık yenilenir');
  const y=ortam({kullanici:{},ogretmenler:[]});
  assert.equal(y.logo.attrs.src,'assets/icon-192.png');assert.equal(y.ad.textContent,'KORUK İLK-ORTAOKULU');
});

test('logo dosyaları var ve ortaokul logosu saydam PNG',()=>{
  for(const f of ['assets/logo.png','assets/logo-ortaokul.png','assets/icon-192.png','assets/icon-ortaokul-192.png'])assert.ok(fs.existsSync(f),f);
  const b=fs.readFileSync('assets/logo-ortaokul.png');
  assert.equal(b.readUInt32BE(16),b.readUInt32BE(20),'kare');assert.equal(b[25],6,'RGBA (saydam) PNG');
  assert.match(read('index.html'),/js\/core\/school-identity\.js/);
  assert.match(read('service-worker.js'),/school-identity\.js/);
});

function motor(kimlikOrtami){
  const win=kimlikOrtami.win;
  vm.runInContext(engSrc,kimlikOrtami.ctx);
  return win.ReportEngine;
}
test('ReportEngine başlığı sınıfa göre logo ve okul adı üretir',()=>{
  const o=ortam({kullanici:{bagliOgretmenId:'t1'},ogretmenler:[OGR('t1',true,false)]}),e=motor(o);
  const ilk=e.documentHtml('Rapor','<p>x</p>',{akis:true,logoGoster:true}),orta=e.documentHtml('Rapor','<p>x</p>',{akis:true,logoGoster:true,sinif:'5/A'});
  assert.match(ilk,/src="http:\/\/x\/assets\/logo\.png"/);assert.match(ilk,/<span>Koruk İlkokulu<\/span>/);
  assert.match(orta,/src="http:\/\/x\/assets\/logo-ortaokul\.png"/);assert.match(orta,/<span>Şehit Remzi Yemez Ortaokulu<\/span>/);
  assert.match(e.documentHtml('R','<p>x</p>',{akis:true,okulAdi:'Elle Yazılan Okul'}),/<span>Elle Yazılan Okul<\/span>/,'elle yazılan ad kimliği ezer');
  assert.equal(e.schoolInfo('7/C').okulAdi,'Şehit Remzi Yemez Ortaokulu');
  assert.equal(e.logoUrl('7/C'),'http://x/assets/logo-ortaokul.png');
});

test('ReportEngine yalnız belgede geçen logoyu gömer',async()=>{
  const o=ortam(),e=motor(o);let istek=[];
  o.win.fetch=async u=>{istek.push(u);return{ok:true,blob:async()=>({type:'image/png',size:3})}};
  o.win.FileReader=class{readAsDataURL(){this.result='data:image/png;base64,AAA';this.onload()}};
  o.ctx.fetch=o.win.fetch;o.ctx.FileReader=o.win.FileReader;
  const html=`<img src="http://x/assets/logo-ortaokul.png"><b>x</b>`;
  const out=await e.inlineReportAssets(html);
  assert.ok(!out.includes('logo-ortaokul.png'),'ortaokul logosu veri adresine çevrilir');
  assert.deepEqual(istek,['http://x/assets/logo-ortaokul.png'],'kullanılmayan ilkokul logosu indirilmez');
});

test('SinifBaglam.okulAdi düzeye göre okul kimliğini kullanır',()=>{
  const o=ortam({kullanici:{bagliOgretmenId:'t2'},ogretmenler:[OGR('t2',false,true)]});
  const win=o.win;win.AppStore.get=p=>p==='session.user'?{bagliOgretmenId:'t2'}:null;
  vm.runInContext(sbSrc,o.ctx);
  const SB=win.SinifBaglam;
  assert.equal(SB.okulAdi(2),'Koruk İlkokulu');assert.equal(SB.okulAdi(6),'Şehit Remzi Yemez Ortaokulu');
  assert.equal(SB.okulAdi(0),'Şehit Remzi Yemez Ortaokulu','düzey bilinmiyorsa giriş yapan öğretmenin okulu');
});

test('belge modülleri okul adını okul kimliğinden alır; sabit ad ve logo kalmadı',()=>{
  const tum=fs.readdirSync('js/modules').map(f=>'js/modules/'+f).concat(['js/app-loader.js','js/core/app-navigation-behavior.js','js/core/schedule-report-redesign.js']);
  const sabit=[];
  for(const f of tum){if(!f.endsWith('.js')||f.endsWith('/settings.js'))continue;/* ayarlar: “Genel Okul Adı” kutusunun kendi örneği */const s=read(f);
    for(const m of s.matchAll(/[\w.]+\.okulAdi\|\|(?:\w+\.ad\|\|)?'KORUK İLK/g)){const bas=s.slice(Math.max(0,m.index-60),m.index);if(!/SchoolIdentity\?\.okulAdi\?\.\(\)\|\|\s*$/.test(bas))sabit.push(f+': '+m[0])}}
  assert.deepEqual(sabit,[],'ham okul kaydındaki ad okul kimliğinden sonra gelmeli');
  for(const f of ['bus-seating-grid','student-intake','student-list-page','ortak-sinav-core','teacher-list-core'])assert.match(read(`js/modules/${f}.js`),/SchoolIdentity\?\.(logo|get)/,f+' logoyu okul kimliğinden almalı');
  assert.doesNotMatch(read('js/modules/student-intake.js'),/class="tif-logo" src="assets\/logo\.png"/);
});

test('Gezi okul adı seçilen sınıfların kademesine uyar, elle yazılan ad korunur',()=>{
  const gz=read('js/modules/gezi.js');
  assert.match(gz,/SchoolIdentity\?\.okulAdi\?\.\(\{siniflar:/);
  assert.match(gz,/s\.okul===s\.okulOto/,'yalnız otomatik atanmış ad güncellenir');
});

test('Ayarlar: kademe okul adları düzenlenir ve varsayılan örnek gösterilir; özelleştiricide okul adı dolu gelir',()=>{
  const st=read('js/modules/settings.js'),rc=read('js/core/report-customizer.js');
  assert.match(st,/id="\$\{d\.adAlan\}" value="\$\{esc\(s\[`\$\{d\.key\}Adi`\]\|\|''\)\}" placeholder="\$\{esc\(window\.SchoolIdentity\?\.VARSAYILAN_AD/);
  assert.match(rc,/name="okulAdi" value="\$\{esc\(okulAdiBaslangic\(opts\)\)\}"/);
  assert.match(rc,/okulAdi:result\.schoolGoster\?result\.okulAdi:' '/,'“Okul adını göster” kapalıyken ad gizlenir');
});

/* ── sınıfa özel çıktılar seçilen sınıfın okulunu kullanır (oturma planı, çizelgeler, kademe raporları) ── */
test('sınıf oturma planı çıktısı sınıfın kademesine göre okul adı ve logo alır',async()=>{
  const o=ortam({siniflar:[{id:'c7',ad:'7-A'},{id:'c2',ad:'2-B'}]}),e=motor(o),win=o.win;
  let yakalanan=null,gridAc=null;
  win.AppStore.data=t=>({okulBilgileri:[AYAR],ogretmenler:[],siniflar:[{id:'c7',ad:'7-A'},{id:'c2',ad:'2-B'}],veliler:[]}[t]||[]);
  win.ReportEngine={printReport:async(t,b,opts)=>{yakalanan=opts}};
  win.SinifOturmaService={planGetir:async()=>({exists:false})};
  win.ClassSeatingGrid={open:opts=>{gridAc=opts}};
  vm.runInContext(read('js/modules/class-seating.js'),o.ctx);
  for(const [id,ad,okul,logo] of [['c7','7-A','Şehit Remzi Yemez Ortaokulu','logo-ortaokul.png'],['c2','2-B','Koruk İlkokulu','logo.png']]){
    await win.SinifOturma.ac(id);await gridAc.print({title:'Oturma',body:'<p>x</p>',fileName:'f',yon:'dikey'});
    assert.equal(yakalanan.sinif,ad,'sınıf bağlamı ReportEngine\'e geçmeli');
    /* Rapor özelleştirme penceresi başlığı ve logoyu açtığında (ekran görüntüsündeki durum) sınıf bağlamı korunur */
    const html=e.documentHtml('Oturma','<p>x</p>',{...yakalanan,akis:true,logoGoster:true,baslikGoster:true});
    assert.match(html,new RegExp('<span>'+okul+'</span>'),ad+' → '+okul);
    assert.ok(html.includes('assets/'+logo),ad+' → '+logo);
  }
});

test('not/ödev çizelgesi ve kademe raporları sınıfın/kademenin okul kimliğini kullanır',()=>{
  const gb=read('js/modules/gradebooks.js');
  assert.match(gb,/printReport\(draft\.ad\|\|label\(\),body,\{[^}]*sinif:draft\.sinifAdi\|\|classLabel\(draft\.sinifId,''\)/,'çizelge çıktısı sınıf bağlamını geçirmeli');
  const rp=read('js/modules/reports.js');
  assert.match(rp,/const opts=\{fileName:s\.title\|\|'Rapor',kademe:stageKademe\(id\),/,'kademe raporları kademeyi geçirmeli');
  const m=rp.match(/const stageKademe=[^\n]*\nfunction stageSchool[^\n]*/);assert.ok(m,'stageKademe/stageSchool bulunamadı');
  const {win}=ortam(),f=new Function('globalThis',m[0]+';return{stageKademe,stageSchool}')(win);
  assert.equal(f.stageKademe('primary-students'),'ilkokul');assert.equal(f.stageKademe('middle-students'),'ortaokul');assert.equal(f.stageKademe('all-students'),undefined);
  assert.equal(f.stageSchool('middle-students','Koruk İlk-Ortaokulu'),'Şehit Remzi Yemez Ortaokulu','genel ad kademeye uyarlanır');
  assert.equal(f.stageSchool('primary-students',''),'Koruk İlkokulu');
  assert.equal(f.stageSchool('middle-students','Elle Yazılan Okul'),'Elle Yazılan Okul','elle yazılan ad korunur');
  assert.equal(f.stageSchool('all-students','Koruk İlk-Ortaokulu'),'Koruk İlk-Ortaokulu','kademesiz raporlara dokunulmaz');
});

test('sınıf ders programı sayfaları sınıfın kademesine göre okul adı ve logo alır',()=>{
  const src=read('js/core/schedule-report-redesign.js');
  assert.match(src,/function individualCard\(kind,key,meta\)\{if\(kind==='class'\)return`\$\{reportHead\(meta,`\$\{key\} SINIFI DERS PROGRAMI`,'',key\)\}/,'sınıf sayfası sınıf adını bağlam olarak geçirmeli');
  assert.match(src,/<img src="\$\{esc\(logoUrl\(ctx\)\)\}"/,'başlık logosu bağlama göre seçilmeli');
  const m=src.match(/function schoolFor[^\n]*/);assert.ok(m,'schoolFor bulunamadı');
  const {win}=ortam(),schoolFor=new Function('global','normalize',m[0]+';return schoolFor')(win,s=>String(s||'').trim());
  assert.equal(schoolFor('Koruk İlk-Ortaokulu','7-A'),'Şehit Remzi Yemez Ortaokulu');
  assert.equal(schoolFor('Koruk İlk-Ortaokulu','2-B'),'Koruk İlkokulu');
  assert.equal(schoolFor('Elle Yazılan Okul','7-A'),'Elle Yazılan Okul','elle yazılan ad korunur');
  assert.equal(schoolFor('Koruk İlk-Ortaokulu',undefined),'Koruk İlk-Ortaokulu','bağlamsız (öğretmen/çarşaf) sayfalara dokunulmaz');
});
