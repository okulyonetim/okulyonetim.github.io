/* Ana sayfa ve İdareci Pano titremesi: sayfalar her veri değişikliğinde / her saniye baştan kurulmamalı, ortak DomPatch ile yerinde güncellenmeli.
 * (DomPatch'in tarayıcıdaki davranışı Chromium'da ayrıca doğrulanır; burada bağlantı ve kaynak sözleşmesi sınanır.) */
const fs=require('fs'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const patch=read('js/core/dom-patch.js'),dash=read('js/modules/dashboard.js'),pano=read('js/modules/idareci-pano.js');
const index=read('index.html'),beta=read('beta.html'),sw=read('service-worker.js'),loader=read('js/app-loader.js'),css=read('css/design-system-base.css');

new Function(patch);

/* yükleme: iki kabukta aynı sürüm, Service Worker ön belleğinde, modüllerden önce */
for(const [ad,html] of [['index.html',index],['beta.html',beta]]){
  const i=html.indexOf('js/core/dom-patch.js?v=1');
  assert(i>0,ad+': dom-patch.js yüklenmeli');
  assert(i<html.indexOf('js/app-loader.js'),ad+': DomPatch, modül yükleyiciden önce gelmeli');
}
assert(sw.includes("'./js/core/dom-patch.js?v=1'"),'Service Worker ön belleğinde dom-patch.js olmalı');

/* DomPatch: yalnız farkı yazan sözleşme */
assert(/g\.DomPatch=Object\.freeze\(\{apply,node\}\)/.test(patch),'DomPatch.apply ve DomPatch.node dışa açılmalı');
assert(patch.includes('data-patch-sig')&&patch.includes('eklenince'),'imza atlama ve eklenince geri çağrısı olmalı');
assert(!/\.innerHTML\s*=/.test(patch.replace(/t\.innerHTML=String\(html==null\?'':html\)/,'')),'DomPatch kabı innerHTML ile baştan kurmamalı (yalnız şablon ayrıştırır)');

/* Ana sayfa */
{
  const render=dash.slice(dash.indexOf('function render(){'),dash.indexOf('function queueRender()'));
  assert(render.includes('window.DomPatch.apply(parent,shell(),{eklenince:bindPresentation})'),'Ana sayfa yeniden çizimi DomPatch ile olmalı');
  assert((render.match(/innerHTML=shell\(\)/g)||[]).length===1,'Tam yeniden kurulum yalnız kart dizisi/rol değişince olmalı');
  const hero=dash.slice(dash.indexOf('function refreshHeroLive('),dash.indexOf('function hero()'));
  assert(!/\.innerHTML\s*=/.test(hero),'Zil kartı saniyede bir innerHTML ile yeniden kurulmamalı (animasyonlar yeniden başlıyordu)');
  assert(hero.includes('DomPatch.apply(card,model.html)'),'Zil kartı yerinde güncellenmeli');
  const wx=dash.slice(dash.indexOf('function refreshWeatherCard('),dash.indexOf('function clockText('));
  assert(!/\.innerHTML\s*=/.test(wx)&&wx.includes('DomPatch.apply(card,m.html)'),'Hava durumu kartı yerinde güncellenmeli');
  assert(dash.includes('data-patch-sig="${esc(signature)}"'),'Haber bandı aynı içerikte dokunulmadan kalmalı (animasyon sürekliliği)');
  assert(dash.includes("const q=sel=>[...(root.matches?.(sel)?[root]:[]),...root.querySelectorAll(sel)]"),'Dinleyiciler eklenen öğenin kendisine de bağlanabilmeli');
  assert(/dashboard\.js\?v=1114/.test(loader)&&sw.includes('js/modules/dashboard.js?v=1114'),'Ana sayfa modül sürümü yükleyici ve Service Worker\'da aynı olmalı');
}

/* İdareci Pano */
{
  const render=pano.slice(pano.indexOf('function render(){'),pano.indexOf('/* TV\'de kaydırma'));
  assert(render.includes('global.DomPatch.apply(r,pageHtml())')&&render.includes('const acik=alive()&&mounted===r'),'Pano açıkken yeniden çizim DomPatch ile olmalı; ilk açılış baştan kurulur');
  const kart=pano.slice(pano.indexOf('function refreshCard('),pano.indexOf('function alive()'));
  assert(!kart.includes('outerHTML')&&kart.includes('global.DomPatch.node(el,RENDER[id]())'),'Pano kartı yerinde güncellenmeli');
}

/* Zil geri sayımı rakamları sabit genişlikte */
assert(/kh-bell-countdown-ring>b\{[^}]*font-variant-numeric:tabular-nums/.test(css),'Geri sayım rakamları sabit genişlikli olmalı');

console.log('dom-patch: tamam');
