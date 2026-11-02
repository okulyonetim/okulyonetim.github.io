/* Koruk Asistan — DomPatch
 * Yeni HTML'i mevcut DOM üzerine yerinde uygular: yalnız değişen düğüm, öznitelik ve metin yazılır.
 * Değişmeyen düğümler olduğu gibi kalır; böylece görüntüler yeniden yüklenmez, CSS animasyonları yeniden başlamaz,
 * odak, kaydırma konumu ve düğümlere bağlı olay dinleyicileri korunur. Ana sayfa ve İdareci Pano her veri değişikliğinde
 * kendini baştan kurduğu için titriyordu; ikisi de artık buradan geçer.
 *
 *   DomPatch.apply(kap,html,{eklenince})  → kabın çocuklarını html ile eşitler
 *   DomPatch.node(eski,html,{eklenince})  → tek bir düğümü (dış HTML) eşitler
 *   eklenince(düğüm): yeni eklenen ya da değiştirilen en üst düzey öğeler için çağrılır (olay dinleyicisi bağlamak için);
 *                     değişmeden kalan öğelerin dinleyicileri zaten yerindedir.
 *   data-patch-sig="…": eski ve yeni öğede aynıysa öğe hiç dokunulmaz (ör. zamana bağlı animasyon gecikmesi taşıyan haber bandı).
 */
(function(g){
'use strict';
if(g.DomPatch)return;
const ELEMAN=1;
/* kullanıcının açıp kapattığı <details>, yeniden çizimde kendi durumunu korur */
const korunan=(etiket,ad)=>etiket==='DETAILS'&&ad==='open';
const ayniTur=(a,b)=>a.nodeType===b.nodeType&&a.nodeName===b.nodeName&&a.namespaceURI===b.namespaceURI;

function sablon(html){const t=g.document.createElement('template');t.innerHTML=String(html==null?'':html);return t.content}

function ozellikler(eski,yeni){
  const e=eski.nodeName;
  for(const a of Array.from(eski.attributes))if(!yeni.hasAttribute(a.name)&&!korunan(e,a.name))eski.removeAttribute(a.name);
  for(const a of Array.from(yeni.attributes))if(!korunan(e,a.name)&&eski.getAttribute(a.name)!==a.value)eski.setAttribute(a.name,a.value);
}
/* Form denetimlerinde öznitelik yalnız varsayılandır; canlı değer, kullanıcı o an yazmıyorsa yenisiyle eşitlenir. */
function degerler(eski,yeni){
  const e=eski.nodeName;if(e!=='INPUT'&&e!=='TEXTAREA'&&e!=='SELECT')return;
  if(g.document.activeElement===eski)return;
  if(e==='INPUT'&&(eski.type==='checkbox'||eski.type==='radio')){if(eski.checked!==yeni.checked)eski.checked=yeni.checked;return}
  if(eski.value!==yeni.value)eski.value=yeni.value;
}
function dugum(eski,yeni,ek){
  if(eski.nodeType!==ELEMAN){if(eski.nodeValue!==yeni.nodeValue)eski.nodeValue=yeni.nodeValue;return}
  const imza=yeni.getAttribute('data-patch-sig');
  if(imza!==null&&imza===eski.getAttribute('data-patch-sig'))return;
  ozellikler(eski,yeni);cocuklar(eski,yeni,ek);degerler(eski,yeni);
}
function cocuklar(eski,yeni,ek){
  const y=Array.from(yeni.childNodes);
  for(let i=0;i<y.length;i++){
    const o=eski.childNodes[i],n=y[i];
    if(!o){eski.appendChild(n);if(n.nodeType===ELEMAN)ek.push(n)}
    else if(ayniTur(o,n))dugum(o,n,ek);
    else{eski.replaceChild(n,o);if(n.nodeType===ELEMAN)ek.push(n)}
  }
  while(eski.childNodes.length>y.length)eski.removeChild(eski.lastChild);
}
function bildir(ek,sec){
  const f=sec&&sec.eklenince;if(typeof f!=='function')return;
  for(const n of ek){try{f(n)}catch(e){console.warn('[DomPatch]',e&&e.message||e)}}
}

function apply(kap,html,sec){const ek=[];cocuklar(kap,sablon(html),ek);bildir(ek,sec);return ek}
function node(eski,html,sec){
  const yeni=sablon(html).firstElementChild,ek=[];if(!yeni)return ek;
  if(ayniTur(eski,yeni))dugum(eski,yeni,ek);else{eski.replaceWith(yeni);ek.push(yeni)}
  bildir(ek,sec);return ek;
}

g.DomPatch=Object.freeze({apply,node});
if(typeof module!=='undefined'&&module.exports)module.exports=g.DomPatch;
})(typeof window!=='undefined'?window:globalThis);
