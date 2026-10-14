/* Rapor önizlemesindeki "Görsel" / "Paylaş" düğmeleri ve genel bildirim (toast).
 * Eskiden window.toast hiç tanımlı değildi: kaydedildi / hata mesajları görünmüyor, düğmeler "çalışmıyor" gibi duruyordu.
 * Ayrıca web/PWA yolunda SVG foreignObject çizimi (HTML'i XML sanıp) sessizce başarısız oluyordu; artık tüm platformlar
 * html2canvas tabanlı tek modülü kullanır (yerel kopya önce, CDN yedek). */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const read=f=>fs.readFileSync(f,'utf8');
const toastSrc=read('js/core/toast.js');
const imgSrc=read('js/core/report-image-native-fix.js');
const index=read('index.html'),beta=read('beta.html'),sw=read('service-worker.js'),entryCss=read('css/design-system.css');
const java=read('android/app/src/main/java/com/koruk/okul/MainActivity.java');

// --- toast: küçük bir DOM taklidiyle gerçek kaynak çalıştırılır
function el(){const e={children:[],className:'',hidden:false,_attrs:{},_listeners:{},textContent:'',isConnected:false,
  classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},contains(c){return this._s.has(c)}},
  setAttribute(k,v){this._attrs[k]=v},addEventListener(t,f){this._listeners[t]=f},get offsetWidth(){return 1}};return e}
const body=el();body.appendChild=c=>{c.isConnected=true;body.children.push(c);return c};
const timers=[];
const win={document:{body,documentElement:body,createElement:()=>el(),addEventListener(){}}};
win.window=win;
win.setTimeout=(f,ms)=>{timers.push({f,ms});return timers.length};win.clearTimeout=()=>{};
const ctx=vm.createContext({window:win,document:win.document,setTimeout:win.setTimeout,clearTimeout:win.clearTimeout,Number,Math,String});
vm.runInContext(toastSrc,ctx);
assert.strictEqual(typeof win.toast,'function','window.toast tanımlı olmalı.');
assert(win.toast.__ka,'toast işareti bulunmalı.');
assert.strictEqual(win.toast('   '),false,'Boş mesaj gösterilmemeli.');
assert.strictEqual(win.toast('Görsel kaydedildi.'),true);
const host=body.children[0];
assert(host&&host.id==='kaToast','Toast kapsayıcısı gövdeye eklenmeli.');
assert.strictEqual(host.textContent,'Görsel kaydedildi.','Mesaj düz metin olarak yazılmalı.');
assert(host.classList.contains('is-show')&&!host.hidden,'Toast görünür olmalı.');
assert.strictEqual(host._attrs.role,'status','Toast erişilebilir (role=status) olmalı.');
win.toast('<b>x</b>',{tur:'hata'});
assert.strictEqual(host.textContent,'<b>x</b>','HTML yorumlanmamalı (textContent).');
assert(/is-error/.test(host.className),'Hata türü sınıf almalı.');
assert.strictEqual(body.children.length,1,'Tek yuva: yeni mesaj eskisinin yerini almalı.');
assert(timers.at(-1).ms>=1800&&timers.at(-1).ms<=9000,'Gösterim süresi makul olmalı.');
win.toast.hide();assert(host.hidden,'hide() gizlemeli.');
assert(/\.ka-toast\{[^}]*z-index:2000000/.test(entryCss),'Toast tam ekran önizlemelerin üstünde (z-index) olmalı.');
assert(/\.ka-toast\.is-show\{/.test(entryCss)&&/\.ka-toast\.is-error\{/.test(entryCss),'Toast CSS durumları tanımlı olmalı.');

// --- yükleme: toast, core.js'ten ve tüm uygulama betiklerinden önce
for(const [n,h] of [['index.html',index],['beta.html',beta]]){
  const t=h.indexOf('js/core/toast.js'),c=h.indexOf('js/core/core.js'),r=h.indexOf('js/core/report-image-native-fix.js');
  assert(t>-1&&c>-1&&t<c,n+': toast.js core.js\'ten önce yüklenmeli.');
  assert(r>-1,n+': rapor görsel modülü her sürümde yüklenmeli (web/PWA/APK).');
}
assert(sw.includes("'./js/core/toast.js?v=1'")&&sw.includes("'./js/core/report-image-native-fix.js?v=4'")&&sw.includes("'./assets/vendor/html2canvas.min.js'"),'Service Worker toast, görsel modülü ve yerel html2canvas\'ı önbelleğe almalı.');
assert(java.includes('js/core/report-image-native-fix.js?v=4'),'Android köprüsü aynı modül sürümünü yüklemeli.');

// --- html2canvas yerel kopya
const h2c=read('assets/vendor/html2canvas.min.js');
assert(/html2canvas 1\.4\.1/.test(h2c.slice(0,200)),'Yerel html2canvas 1.4.1 bulunmalı.');
assert(imgSrc.includes("assets/vendor/html2canvas.min.js")&&imgSrc.includes('cdnjs.cloudflare.com'),'Önce yerel, olmazsa CDN kullanılmalı.');
assert(imgSrc.indexOf('injectScript(win,local')<imgSrc.indexOf('injectScript(win,H2C_CDN'),'Yerel kopya CDN\'den önce denenmeli.');

// --- modül: ölçek kademeleri
const calls=[];
const g={document:{baseURI:'https://localhost/',addEventListener:(t,f,c)=>calls.push(t)},toast(){},navigator:{}};
g.window=g;
vm.runInContext(imgSrc,vm.createContext({window:g,document:g.document,navigator:g.navigator,console,setTimeout,clearTimeout,Math,Number,String,Promise,URL,File:function(){},FileReader:function(){},requestAnimationFrame:f=>f()}));
const api=g.KAReportImageNativeFix;
assert(api&&typeof api.scaleSteps==='function'&&typeof api.action==='function','KAReportImageNativeFix dışa açık olmalı.');
const a4=api.scaleSteps(794,1123);
assert(a4[0]>=2.5&&a4[0]<=4,'A4 için ilk ölçek ~300 dpi (≈3x) olmalı: '+a4[0]);
assert(a4[0]*794*a4[0]*1123<=9.05e6,'İlk deneme alanı 9 MP\'i aşmamalı.');
assert(a4.length>=3&&a4.every((v,i)=>i===0||v<a4[i-1]),'Başarısız olursa ölçek kademeli düşmeli: '+a4.join(','));
assert(a4.at(-1)>=1,'Ölçek 1x\'in altına inmemeli.');
const tall=api.scaleSteps(794,1123*6);
assert(tall[0]>=1&&tall[0]*1123*6<=8192,'Çok sayfalı rapor kenar sınırını aşmamalı: '+tall[0]);
assert.strictEqual(JSON.stringify(api.scaleSteps(4000,12000)),'[1]','Çok büyük sayfada tek (1x) deneme kalmalı.');
assert(calls.includes('click'),'Düğme tıklamaları belge düzeyinde yakalanmalı.');

// --- hata mesajı artık "[object Event]" değil; sonuç her zaman toast ile bildirilir
assert(imgSrc.includes("'[object Event]'"),'Olay nesnesi hataları anlaşılır metne çevrilmeli.');
assert(/say\(\(share\?'Paylaşılamadı: ':'Görsel oluşturulamadı: '\)\+errText\(err\),'hata'\)/.test(imgSrc),'Hata, hata türüyle toast edilmeli.');
assert(imgSrc.includes("DONE[r]"),'Başarı sonucu toast edilmeli.');
assert(imgSrc.includes("e?.name==='AbortError')return'iptal'"),'Kullanıcı paylaşımı iptal edince hata gösterilmemeli.');

console.log('report-image-toast.test.js: OK');
