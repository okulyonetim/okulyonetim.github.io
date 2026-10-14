/* Yıllık / BEP Planları (sınıf bazında bağımsız plan kapsamı) + Sosyal Kulüpler yeniden tasarımı.
 * Çizelge çekirdeği sahte bir pencerede çalıştırılır; sayfa HTML'i ve veri kuralları doğrulanır. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const core=fs.readFileSync('js/modules/rubric-settings-core.js','utf8');
const css=fs.readFileSync('css/design-system-base.css','utf8');

function boot(data){
  const host={dataset:{},innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
  const win={
    AppStore:{data:t=>data[t]||[]},
    PermissionService:{can:()=>true,apply(){}},
    toast(){},
    document:null
  };
  win.window=win;win.global=win;
  win.document={querySelector:s=>s==='#toolsContent'?host:null,querySelectorAll:()=>[],body:{classList:{add(){},remove(){}},insertAdjacentHTML(){}},addEventListener(){},createElement:()=>({})};
  win.CustomEvent=function(){};win.dispatchEvent=()=>{};win.console=console;
  vm.createContext(win);vm.runInContext(core,win,{filename:'rubric-settings-core.js'});
  return {win,host,api:win.ClassicCizelgelerParity};
}
const T=[{id:'t0',ad:'Ayşe',soyad:'Yılmaz'},{id:'t1',ad:'Mehmet',soyad:'Demir'}];
const S=[{id:'c0',ad:'5-A',seviye:5},{id:'c1',ad:'5-B',seviye:5},{id:'c2',ad:'6-A',seviye:6},{id:'c3',ad:'7-A',seviye:7}];
const past='2020-01-01',fut='2999-01-01';
const B=[
  {id:'b0',ogretmenId:'t0',brans:'Matematik',sinif:'5-A',yillikDersPlaniTarihi:past,bepPlaniTarihi:fut,kontroller:[true,false]},                       /* eski kayıt: bayrak yok → iki plan da geçerli */
  {id:'b1',ogretmenId:'t0',brans:'Matematik',sinif:'5-B',yillikDersPlaniTarihi:past,kontroller:[false,false],yillikPlanVar:true,bepPlanVar:false},
  {id:'b2',ogretmenId:'t0',brans:'Matematik',sinif:'7-A',bepPlaniTarihi:fut,kontroller:[false,true],yillikPlanVar:false,bepPlanVar:true},
  {id:'b3',ogretmenId:'t1',brans:'Türkçe',sinif:'6-A',yillikDersPlaniTarihi:fut,kontroller:[false,false]}
];
const K=[
  {id:'k0',ad:'SATRANÇ KULÜBÜ',ogretmenIdler:['t0','t1'],sinifIdler:['c0','c1'],yillikPlanTarihi:fut,aktif:true,kontroller:[true,false,true,false,false,false,false,false,false,false,false,false]},
  {id:'k1',ad:'ESKİ KULÜP',ogretmenIdler:[],sinifIdler:[],aktif:false,kontroller:Array(12).fill(false)}
];
const {api,host,win}=boot({ogretmenler:T,siniflar:S,bepPlani:B,sosyalKulupler:K,veliler:[{id:'v0',sinifId:'c0',ogrenciAdi:'Ali Veli',kulupId:'k0'}]});

/* ---- Yıllık / BEP sayfası ---- */
assert(api.open('BEP Planları'),'BEP sayfası açılmalı.');
let html=host.innerHTML;
assert(html.includes('data-classic-cizelge-page="bepPlani"')&&html.includes('kcz-page'),'Sayfa kcz çalışma alanıyla çizilmeli.');
assert(/^<section[^>]*><h3 data-cizelge-route-label/.test(html),'Rota işaretçisi (kabuk süzgeci için ilk h3) sayfanın başında olmalı.');
assert(!/style="/.test(html),'Yeni sayfa satır içi stil taşımamalı.');
for(const hook of ['data-cizelge-add','data-cizelge-report','data-cizelge-excel','data-cizelge-bulk','data-cizelge-edit','data-cizelge-check'])assert(html.includes(hook),'Davranış kancası korunmalı: '+hook);
const t0=html.slice(html.indexOf('data-cizelge-teacher-group="t0"'),html.indexOf('data-cizelge-teacher-group="t1"'));
const yillik=t0.match(/data-kbp-plan="yillik"[\s\S]*?<\/section>/)[0],bep=t0.match(/data-kbp-plan="bep"[\s\S]*?<\/section>/)[0];
assert(/5-A/.test(yillik)&&/5-B/.test(yillik)&&!/7-A/.test(yillik),'Yıllık plan satırı yalnız yıllık planı olan sınıfları göstermeli.');
assert(/5-A/.test(bep)&&/7-A/.test(bep)&&!/5-B/.test(bep),'BEP satırı yalnız BEP planı olan sınıfları göstermeli (5-B yalnız yıllık).');
assert(/data-id="b1" data-index="0"/.test(yillik)&&!/data-id="b1" data-index="1"/.test(bep),'Bağımsız plan: 5-B yalnız yıllık kontrolüne sahip olmalı.');
assert(/data-id="b2" data-index="1"/.test(bep)&&!/data-id="b2" data-index="0"/.test(yillik),'Bağımsız plan: 7-A yalnız BEP kontrolüne sahip olmalı.');
assert(yillik.includes('is-late'),'Süresi geçmiş ve teslim edilmemiş yıllık plan geciken olarak işaretlenmeli.');
assert(/kcl-kpis[\s\S]*?<span class="kcl-n">2<\/span><small>Öğretmen/.test(html),'Özet: öğretmen sayısı.');
assert(/<span class="kcl-n">1\/3<\/span><small>Yıllık plan/.test(html),'Özet: yıllık plan 1/3 (b0 tamam; b1,b3 değil).');
assert(/<span class="kcl-n">1\/3<\/span><small>BEP planı/.test(html),'Özet: BEP 1/3 (b0, b2 ve bayraksız eski b3; 5-B sayılmaz).');
assert(/<span class="kcl-n">1<\/span><small>Geciken/.test(html),'Özet: geciken yalnız 5-B yıllık planı.');

/* Eski kayıt (bayrak yok) iki plan için de geçerli sayılır */
assert(/data-id="b0" data-index="0"/.test(yillik)&&/data-id="b0" data-index="1"/.test(bep),'Bayrak alanı olmayan eski kayıt iki planda da görünmeli.');

/* ---- Excel: Plan sütunu ---- */
const x=o=>api.excelPayload('bepPlani',{'Öğretmen':'Ayşe Yılmaz','Branş':'Matematik','Sınıf':'5-A','Yıllık Ders Planı Son Tarihi':'2026-10-01','BEP Planı Son Tarihi':'2026-11-01',...o});
let p=x({});assert(p.yillikPlanVar&&p.bepPlanVar&&p.yillikDersPlaniTarihi&&p.bepPlaniTarihi,'Plan sütunu yoksa iki plan da açık olmalı.');
p=x({Plan:'Yalnız BEP'});assert(p.yillikPlanVar===false&&p.bepPlanVar===true&&p.yillikDersPlaniTarihi===null,'Plan=BEP yıllık planı kapatmalı.');
p=x({Plan:'Yıllık'});assert(p.yillikPlanVar===true&&p.bepPlanVar===false&&p.bepPlaniTarihi===null,'Plan=Yıllık BEP planını kapatmalı.');
p=x({Plan:'Yıllık ve BEP'});assert(p.yillikPlanVar&&p.bepPlanVar,'Plan=Yıllık ve BEP iki planı açmalı.');

/* ---- Sosyal Kulüpler sayfası ---- */
assert(api.open('Sosyal Kulüpler'),'Kulüp sayfası açılmalı.');
html=host.innerHTML;
assert(html.includes('data-classic-cizelge-page="sosyalKulupler"')&&html.includes('ksk-card'),'Kulüp sayfası ksk kartlarıyla çizilmeli.');
assert(html.indexOf('SATRANÇ KULÜBÜ')<html.indexOf('ESKİ KULÜP'),'Aktif kulüpler pasiflerden önce listelenmeli.');
assert((html.match(/data-type="sosyalKulupler"/g)||[]).length===24,'Her kulüp için 12 gerçek kontrol (2 kulüp × 12).');
assert(/data-id="k0" data-index="11"/.test(html),'Sene sonu raporu kontrolü bağlı olmalı.');
assert(html.includes('data-club-student-list="k0"')&&html.includes('data-club-student-edit="k0"'),'Kulüp öğrenci yönetimi kancaları korunmalı.');
assert(/Öğrenciler \(1\)/.test(html),'Kulüp öğrenci sayısı veliler.kulupId üzerinden gelmeli.');
assert(/<span class="kcl-n">2<\/span><small>Kulüp/.test(html)&&/<span class="kcl-n">1<\/span><small>Öğrenci/.test(html),'Kulüp özeti: kulüp ve öğrenci sayısı.');
assert(!/style="/.test(html),'Kulüp sayfası satır içi stil taşımamalı.');

/* ---- Diğer sayfalar etkilenmemeli ---- */
assert(api.open('Zümre')&&host.innerHTML.includes('ka-cizelge-page-head'),'Diğer çizelge sayfaları eski başlık yapısını kullanmaya devam etmeli.');

/* ---- Kaynak sözleşmeleri ---- */
assert(core.includes('yillikPlanVar')&&core.includes('bepPlanVar'),'Plan kapsamı alanları tanımlı olmalı.');
assert(/function saveBepGroup\(/.test(core)&&/function deleteBepGroup\(/.test(core),'BEP grup kaydet / sil işlevleri olmalı.');
assert(core.includes("section('yillik','yillikSiniflar'")&&core.includes("section('bep','bepSiniflar'"),'Formda yıllık ve BEP için ayrı sınıf listeleri olmalı.');
assert(core.includes('data-kcz-copy-from')&&core.includes('Yıllık planla aynı'),'BEP listesi için "Yıllık planla aynı" kısayolu olmalı.');
assert(/function routeMarker\(type\)\{return `<h3 data-cizelge-route-label class="ka-guidance-route-marker">/.test(core),'Rota işaretçisi satır içi stil yerine sınıf kullanmalı.');
const people=fs.readFileSync('js/modules/people.js','utf8');
assert(/aktifIndexler\(tip,row\)/.test(people),'BelgeDurumuService geçerli kontrolleri bildirmeli.');
for(const f of ['js/modules/people-directory.js','js/modules/people-reports.js','js/modules/people-classic-ui.js'])assert(fs.readFileSync(f,'utf8').includes('aktifIndexler'),f+' geçerli olmayan planı saymamalı.');
const dash=fs.readFileSync('js/modules/dashboard.js','utf8');
assert(dash.includes("flag:'yillikPlanVar'")&&dash.includes("flag:'bepPlanVar'")&&dash.includes('row[cfg.flag]===false'),'Hatırlatmalar geçerli olmayan planı hariç tutmalı.');

/* ---- CSS: yalnız belirteç, kapsamlı ---- */
const a=css.indexOf('/* ===== YILLIK / BEP PLANLARI & SOSYAL KULÜPLER (kcz-*'),z=css.indexOf('/* ===== WEB ARAYÜZÜ (≥1100px)');
assert(a>0&&a<z&&a>css.indexOf('/* ===== A4 RAPORLAR'),'kcz bölümü A4 raporlardan sonra, WEB ARAYÜZÜ öncesinde olmalı.');
const block=css.slice(a,z).replace(/\/\*[\s\S]*?\*\//g,'');
assert(!/#[0-9a-fA-F]{3,8}\b/.test(block),'kcz bölümünde sabit renk olmamalı.');
assert(!/rgba?\(\s*\d/.test(block),'kcz bölümünde sayısal rgb/rgba olmamalı.');
assert(!/-\d+(px|rem|em)\b/.test(block.replace(/\([^)]*\)/g,'')),'kcz bölümünde negatif sabit boşluk olmamalı.');
const bad=[...block.matchAll(/(^|\})\s*([^{}@]+)\{/gm)].map(m=>m[2].trim()).filter(s=>s&&!/^\d+%|^(from|to)$/.test(s)).map(s=>s.replace(/:is\([^)]*\)/g,'')).filter(s=>s.split(',').some(x=>!/^html\[data-theme\] (#v2ModuleRoot|\.kcz-form)\b/.test(x.trim())));
assert.deepStrictEqual(bad,[],'Seçiciler kapsamlı olmalı: '+bad.slice(0,3).join(' | '));
for(const c of ['.kcz-chip','.kcz-group','.kbp-card','.kbp-plan','.ksk-card','.ksk-months','.kcz-pick','.kcz-quick','.kcz-switch','.kcz-plan-form'])assert(block.includes(c),'CSS sınıfı tanımlı olmalı: '+c);
assert(/prefers-reduced-motion/.test(block),'Azaltılmış hareket desteklenmeli.');
const cacheVer=Number((fs.readFileSync('service-worker.js','utf8').match(/oy-cache-v(\d+)/)||[])[1]);
assert(cacheVer>=1303,'Servis çalışanı önbelleği yeni sürüme yükseltilmeli.');
console.log('cizelge-bep-kulup-redesign: OK');
