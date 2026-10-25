/* Okulumu Kur: kademe seçimi (tek/birleşik kurum), kurulum durumu sayfası ve "Bugün tatil".
 * Gerçek settings.js, vm içinde sahte AppStore/DeviceData ile çalıştırılır. */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const settingsSrc=fs.readFileSync('js/modules/settings.js','utf8');
const shellSrc=fs.readFileSync('js/core/shell-ui.js','utf8');
const loaderSrc=fs.readFileSync('js/app-loader.js','utf8');

function localToday(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}

function build(initial={}){
  const store={okulBilgileri:[],ogretmenler:[],dersSaatleri:[],siniflar:[],dersProgrami:[],nobetAtamalari:[],...initial};
  const saved=[];
  const handlers={};
  const toasts=[];
  const out={innerHTML:'',querySelectorAll:()=>[],querySelector(sel){return handlers[sel]||(handlers[sel]={addEventListener(ev,fn){(handlers[`${sel}|${ev}`]=handlers[`${sel}|${ev}`]||[]).push(fn)},dataset:{},querySelector:()=>null,querySelectorAll:()=>[],matches:()=>false,closest:()=>null})},addEventListener(){}};
  const rootEl={innerHTML:''};
  const win={
    AKTIF_KULLANICI:{admin:true},
    COL:{okulBilgileri:'oy_okulBilgileri',dersSaatleri:'oy_dersSaatleri',ogretmenler:'oy_ogretmenler',siniflar:'oy_siniflar',dersProgrami:'oy_dersProgrami',nobetAtamalari:'oy_nobetAtamalari'},
    AppStore:{data:t=>store[t]||[],get:()=>undefined,subscribe:()=>()=>{}},
    DeviceData:{
      get:(t,id)=>(store[t]||[]).find(x=>x.id===id)||null,
      list:t=>store[t]||[],
      set:async(t,c,id,v,o)=>{saved.push({t,id,v:JSON.parse(JSON.stringify(v)),o});store[t]=[{id,...v}]},
      listen:()=>()=>{}
    },
    SyncEngine:{pull:async()=>{},register(){},localHydrate:async()=>{},schedule(){}},
    toast:m=>toasts.push(m),
    addEventListener(){},removeEventListener(){}
  };
  win.document={getElementById:id=>id==='settingsContent'?out:id==='v2ModuleRoot'?rootEl:null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},activeElement:null};
  const ctx=vm.createContext({...win,console,setTimeout,clearTimeout,Promise,Date,requestAnimationFrame:f=>f()});
  ctx.window=ctx;ctx.globalThis=ctx;
  vm.runInContext(settingsSrc,ctx);
  return {ctx,store,saved,out,handlers,toasts};
}

(async()=>{
  // 1) Kademe normalleştirme
  {
    const {ctx}=build();
    const norm=(l,r)=>JSON.stringify(ctx.OkulKademeleri.normalize(l,r));
    assert.strictEqual(norm(undefined,{ilkokulAdi:'A',ortaokulAdi:'B'}),JSON.stringify(['ilkokul','ortaokul']),'Eski kayıt dolu alanlara göre kademe türetmeli.');
    assert.strictEqual(norm(undefined,{}),JSON.stringify(['ilkokul','ortaokul']),'Boş kayıtta mevcut varsayılan (ilkokul + ortaokul) korunmalı.');
    assert.strictEqual(norm(undefined,{anaokuluKurumKodu:'123'}),JSON.stringify(['anaokulu']),'Yalnız anaokulu alanı dolu ise tek kademe olmalı.');
    assert.strictEqual(norm(['lise'],{ilkokulAdi:'A'}),JSON.stringify(['lise']),'Açık kademe seçimi eski alanlardan önce gelmeli.');
    assert.strictEqual(norm(['lise','gecersiz','ilkokul'],{}),JSON.stringify(['ilkokul','lise']),'Geçersiz kademe atılmalı, sıra sabit olmalı.');
    assert.strictEqual(ctx.OkulKademeleri.ortak({kademeler:['ilkokul','ortaokul']}),true);
    assert.strictEqual(ctx.OkulKademeleri.ortak({kademeler:['lise']}),false);
    const list=ctx.OkulKademeleri.liste({kademeler:['ilkokul','ortaokul'],ilkokulAdi:' Koruk İlkokulu ',ilkokulKurumKodu:'111',ortaokulAdi:'Koruk Ortaokulu',ortaokulKurumKodu:'222'});
    assert.deepStrictEqual(JSON.parse(JSON.stringify(list)),[{key:'ilkokul',ad:'İlkokul',okulAdi:'Koruk İlkokulu',kurumKodu:'111'},{key:'ortaokul',ad:'Ortaokul',okulAdi:'Koruk Ortaokulu',kurumKodu:'222'}],'Kademe listesi ad ve kurum kodunu ayrı ayrı vermeli.');
  }

  // 2) Kayıt: yeni kademe alanları, kısmi kayıtta mevcut alanların korunması
  {
    const {ctx,saved}=build({okulBilgileri:[{id:'ayarlar',okulAdi:'Koruk Okulları',mudurId:'t1',ilkokulAdi:'Koruk İlkokulu',ilkokulKurumKodu:'111',ortaokulAdi:'Koruk Ortaokulu',ortaokulKurumKodu:'222'}]});
    await ctx.OkulBilgileriService.kaydet({kademeler:['ilkokul','ortaokul','lise'],liseAdi:'Koruk Lisesi',liseKurumKodu:'333'});
    let v=saved.at(-1).v;
    assert.deepStrictEqual(v.kademeler,['ilkokul','ortaokul','lise']);
    assert.strictEqual(v.liseAdi,'Koruk Lisesi');assert.strictEqual(v.liseKurumKodu,'333');
    assert.strictEqual(v.ilkokulKurumKodu,'111','Kısmi kayıt mevcut ilkokul alanlarını silmemeli.');
    assert.strictEqual(v.mudurId,'t1','Tek ortak müdür kaydı korunmalı.');
    assert.strictEqual(v.kurulumTamam,false);assert.strictEqual(v.kurulumTarihi,'');
    await ctx.OkulBilgileriService.kaydet({kurulumTamam:true,kurulumTarihi:'2026-10-24T10:00:00.000Z'});
    v=saved.at(-1).v;
    assert.strictEqual(v.kurulumTamam,true);assert.strictEqual(v.kurulumTarihi,'2026-10-24T10:00:00.000Z');
    assert.deepStrictEqual(v.kademeler,['ilkokul','ortaokul','lise'],'Kurulumu tamamlamak kademeleri değiştirmemeli.');
    await ctx.OkulBilgileriService.kaydet({kademeler:['ortaokul']});
    v=saved.at(-1).v;
    assert.strictEqual(v.ilkokulAdi,'Koruk İlkokulu','Kademe kapatılınca girilmiş veri silinmemeli (geri açılabilsin).');
  }

  // 3) Okul Bilgileri sayfası kademe kartları
  {
    const both=build({okulBilgileri:[{id:'ayarlar',kademeler:['ilkokul','ortaokul']}]});
    await both.ctx.SettingsModule.mount();
    both.ctx.SettingsModule.openPage('school','Okul Bilgileri');
    let html=both.out.innerHTML;
    assert(html.includes('id="schoolPrimaryName"')&&html.includes('id="schoolMiddleName"'),'İlkokul + ortaokul kartları görünmeli.');
    assert(!html.includes('id="schoolHighName"')&&!html.includes('id="schoolPreName"'),'Seçilmeyen kademe kartı çıkmamalı.');
    assert.strictEqual((html.match(/data-school-stage=/g)||[]).length,4,'Dört kademe seçeneği listelenmeli.');
    assert(html.includes('Birleşik kurum'),'Birden fazla kademede birleşik kurum notu çıkmalı.');
    const solo=build({okulBilgileri:[{id:'ayarlar',kademeler:['lise'],liseAdi:'X Lisesi'}]});
    await solo.ctx.SettingsModule.mount();
    solo.ctx.SettingsModule.openPage('school','Okul Bilgileri');
    html=solo.out.innerHTML;
    assert(html.includes('id="schoolHighName"')&&html.includes('X Lisesi'),'Lise kartı mevcut adı göstermeli.');
    assert(!html.includes('id="schoolPrimaryName"'),'Tek kademeli kurumda ilkokul kartı çıkmamalı.');
    assert(html.includes('Tek kademeli kurum'));
  }

  // 3b) Okul Bilgileri kaydı: form alanları + kademe kutuları -> kayıt
  {
    const sv=build({okulBilgileri:[{id:'ayarlar',okulAdi:'Koruk Okulları',mudurId:'t1',kademeler:['ilkokul','ortaokul'],ilkokulAdi:'İlk',ilkokulKurumKodu:'111',ortaokulAdi:'Orta',ortaokulKurumKodu:'222'}]});
    const fields={schoolName:'Koruk Okulları',schoolPrincipal:'t1',schoolPrimaryName:'İlk Yeni',schoolPrimaryCode:'111',schoolMiddleName:'Orta',schoolMiddleCode:'222',schoolHighName:'Koruk Lisesi',schoolHighCode:'333'};
    const checked={anaokulu:false,ilkokul:true,ortaokul:true,lise:true};
    const changeHandlers={};
    const boxes=Object.keys(checked).map(k=>({dataset:{schoolStage:k},get checked(){return checked[k]},set checked(v){checked[k]=v},blur(){},addEventListener(ev,fn){if(ev==='change')changeHandlers[k]=fn}}));
    sv.handlers['[data-school-settings]']={querySelector:sel=>{const id=String(sel).replace(/^#/,'');return fields[id]!==undefined?{value:fields[id]}:null},querySelectorAll:sel=>sel==='[data-school-stage]'?boxes:[],addEventListener(){}};
    sv.ctx.document.getElementById=id=>fields[id]!==undefined?{value:fields[id]}:id==='settingsContent'?sv.out:id==='v2ModuleRoot'?{innerHTML:''}:null;
    await sv.ctx.SettingsModule.mount();
    sv.ctx.SettingsModule.openPage('school','Okul Bilgileri');
    await sv.handlers['[data-school-save]|click'][0]();
    const v=sv.saved.at(-1).v;
    assert.deepStrictEqual(v.kademeler,['ilkokul','ortaokul','lise'],'İşaretli kademe kutuları kayda yazılmalı.');
    assert.strictEqual(v.ilkokulAdi,'İlk Yeni');assert.strictEqual(v.liseAdi,'Koruk Lisesi');assert.strictEqual(v.liseKurumKodu,'333');
    assert.strictEqual(v.anaokuluAdi,'','Ekranda olmayan kademe alanı boş kalmalı, başka alanı bozmamalı.');
    // Son kutuyu kapatmaya çalışmak engellenir
    checked.anaokulu=false;checked.ilkokul=false;checked.ortaokul=false;checked.lise=false;
    changeHandlers.lise();
    assert.strictEqual(checked.lise,true,'En az bir kademe seçili kalmalı.');
    assert(sv.toasts.some(m=>/En az bir kademe/.test(m)));
  }

  // 4) Okul bilgileri sayfasındaki kurulum paneli: eksik ve hazır durumları
  {
    const empty=build();
    await empty.ctx.SettingsModule.mount();
    assert.strictEqual(empty.ctx.SettingsModule.openPage('school','Okul Bilgileri'),true,'Yönetici Okul bilgileri sayfasını (kurulum durumu dahil) açabilmeli.');
    let html=empty.out.innerHTML;
    assert(html.includes('data-setup-page')&&html.includes('0 / 5 adım hazır'),'Boş okulda hiçbir adım hazır olmamalı.');
    assert((html.match(/data-setup-step=/g)||[]).length===5,'Beş kurulum adımı gösterilmeli.');
    assert(html.includes('data-setup-complete'),'Düzenleyebilen kullanıcı kurulumu tamamlayabilmeli.');

    const full=build({
      okulBilgileri:[{id:'ayarlar',okulAdi:'Koruk Okulları',mudurId:'t1',kademeler:['ilkokul','ortaokul'],ilkokulAdi:'Koruk İlkokulu',ilkokulKurumKodu:'111',ortaokulAdi:'Koruk Ortaokulu',ortaokulKurumKodu:'222'}],
      ogretmenler:[{id:'t1',ad:'Ayşe',soyad:'Yılmaz',unvan:'Okul Müdürü'},{id:'t2',ad:'Sedat',soyad:'Karagöz',unvan:'Müdür Yardımcısı'},{id:'t3',ad:'Ali',soyad:'Kaya',unvan:'Öğretmen'}],
      dersSaatleri:[{id:'ayarlar',donemler:[{saat:1,baslangic:'08:30',bitis:'09:10'},{saat:2,baslangic:'09:20',bitis:'10:00'}],tatilAraliklari:[{id:'a',ad:'Ara tatil',baslangicTarihi:'2026-11-09',bitisTarihi:'2026-11-13'}]}],
      siniflar:[{id:'c1'},{id:'c2'}],dersProgrami:[{id:'p1'}],nobetAtamalari:[{id:'n1'}]
    });
    await full.ctx.SettingsModule.mount();
    full.ctx.SettingsModule.openPage('school','Okul Bilgileri');
    html=full.out.innerHTML;
    assert(html.includes('5 / 5 adım hazır'),'Tüm veriler varken beş adım hazır görünmeli.');
    assert(html.includes('Müdür: Ayşe Yılmaz'),'Müdür seçimi özetlenmeli.');
    assert(html.includes('1 müdür yardımcısı'),'Müdür yardımcısı unvana göre bulunmalı.');
    assert(html.includes('2 ders saati · 1 planlı tatil'));
    assert(html.includes('İlkokul (111) · Ortaokul (222)'),'Kademeler kurum kodlarıyla özetlenmeli.');
    assert(!html.includes('Eksik:'),'Hazır kurulumda eksik satırı çıkmamalı.');

    const partial=build({
      okulBilgileri:[{id:'ayarlar',okulAdi:'Koruk Okulları',kademeler:['ilkokul','ortaokul'],ilkokulAdi:'Koruk İlkokulu',ilkokulKurumKodu:'111',ortaokulAdi:'Koruk Ortaokulu'}],
      ogretmenler:[{id:'t3',ad:'Ali',soyad:'Kaya',unvan:'Öğretmen'}]
    });
    await partial.ctx.SettingsModule.mount();
    partial.ctx.SettingsModule.openPage('school','Okul Bilgileri');
    html=partial.out.innerHTML;
    assert(html.includes('Eksik: Ortaokul kurum kodu, müdür'),'Eksik alanlar adıyla listelenmeli: '+html.slice(html.indexOf('Eksik:'),html.indexOf('Eksik:')+120));
    assert(html.includes('Müdür Yardımcısı” olan kişi yok'),'Müdür yardımcısı yoksa ipucu çıkmalı.');

    // Kurulumu tamamla
    await partial.handlers['[data-setup-complete]|click'][0]();
    assert.strictEqual(partial.saved.at(-1).v.kurulumTamam,true,'Tamamla düğmesi kurulumTamam yazmalı.');
    assert(/^\d{4}-\d{2}-\d{2}T/.test(partial.saved.at(-1).v.kurulumTarihi));
  }

  // 5) Yetki: öğretmen/yetkisiz kullanıcı kurulum panelini görmez
  {
    const t=build();
    t.ctx.AKTIF_KULLANICI={admin:false,ogretmenId:'t3'};
    await t.ctx.SettingsModule.mount();
    t.ctx.SettingsModule.openPage('school','Okul Bilgileri');
    assert(!t.out.innerHTML.includes('data-setup-page'),'Düzenleme yetkisi olmayan kullanıcı kurulum panelini görmemeli.');
  }

  // 6) Bugün tatil: tek günlük aralık yazar, çakışmayı reddeder
  {
    const h=build({dersSaatleri:[{id:'ayarlar',donemler:[{saat:1,baslangic:'08:30',bitis:'09:10'}]}]});
    await h.ctx.SettingsModule.mount();
    h.ctx.SettingsModule.openPage('holiday','Tatil Modu');
    assert(h.out.innerHTML.includes('data-holiday-today'),'Tatil sayfasında Bugün tatil düğmesi olmalı.');
    const click=h.handlers['[data-holiday-today]|click'][0];
    await click();
    const today=localToday();
    const ranges=h.saved.at(-1).v.tatilAraliklari;
    assert.strictEqual(ranges.length,1);
    assert.strictEqual(ranges[0].baslangicTarihi,today);assert.strictEqual(ranges[0].bitisTarihi,today);
    assert.strictEqual(h.saved.at(-1).v.tatilAraliklariVersion,1);
    assert.deepStrictEqual(h.saved.at(-1).v.donemler.length,1,'Tatil kaydı ders saatlerini bozmamalı.');
    // Aynı gün için ikinci basış: zaten tatilde uyarısı, yeni kayıt yok
    h.ctx.SettingsModule.openPage('holiday','Tatil Modu');
    const before=h.saved.length;
    h.out.querySelectorAll=sel=>sel==='[data-holiday-row]'?[{dataset:{rowId:'x'},querySelector:q=>({'[data-holiday-name]':{value:'Bugün tatil'},'[data-holiday-start]':{value:today},'[data-holiday-end]':{value:today},'[data-holiday-note]':{value:''}}[q]||null)}]:[];
    await h.handlers['[data-holiday-today]|click'].at(-1)();
    assert.strictEqual(h.saved.length,before,'Bugün zaten tatilse ikinci kayıt yazılmamalı.');
    assert(h.toasts.some(m=>/zaten planlı/.test(m)),'Kullanıcıya bilgi verilmeli.');
  }

  // 7) Tek giriş yolu ve sürüm
  assert(!loaderSrc.includes('Okulumu Kur'),'Okulumu Kur menüde ayrı satır olmamalı; tek yol Ayarlar > Okul Bilgileri.');
  assert(!shellSrc.includes('settings:setup')&&!shellSrc.includes("['setup',"),'Okulumu Kur için ayrı shell rotası/gizleme kuralı olmamalı.');
  assert(loaderSrc.includes('js/modules/settings.js?v=897'),'settings.js cache sürümü yenilenmeli.');

  console.log('Okulumu Kur kademe / kurulum / bugün-tatil testi başarılı.');
})().catch(e=>{console.error(e);process.exit(1)});
