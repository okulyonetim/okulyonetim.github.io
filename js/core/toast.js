/* Koruk Asistan — genel bildirim (toast): window.toast(mesaj[, süreMs | {sure, tur}]).
 * Uygulamanın her yerinde `window.toast?.(…)` olarak çağrılır; bu bileşen olmadan çağrılar sessizce hiçbir şey göstermiyordu
 * (kaydedildi / hata mesajları görünmüyordu). Tek bir yuva kullanır: yeni mesaj eskisinin yerini alır, üst üste binmez.
 * Görünüm css/design-system.css sonundaki ".ka-toast" bölümünde; mesaj her zaman düz metin olarak yazılır. */
(function(global){
'use strict';
if(typeof global.toast==='function'&&global.toast.__ka)return;
const doc=global.document;
let host=null,timer=0;

function mount(){
  if(host&&host.isConnected)return host;
  host=doc.createElement('div');
  host.id='kaToast';host.className='ka-toast';host.hidden=true;
  host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.setAttribute('aria-atomic','true');
  host.addEventListener('click',()=>hide());
  (doc.body||doc.documentElement).appendChild(host);
  return host;
}
function hide(){
  clearTimeout(timer);
  if(!host)return;
  host.classList.remove('is-show');host.hidden=true;
}
function toast(message,options){
  const text=String(message??'').trim();
  if(!text)return false;
  if(!doc||!doc.body){doc?.addEventListener('DOMContentLoaded',()=>toast(text,options),{once:true});return true}
  const opts=typeof options==='number'?{sure:options}:(options&&typeof options==='object'?options:{});
  const error=opts.tur==='hata';
  const el=mount();
  el.className='ka-toast'+(error?' is-error':'');
  el.textContent=text;el.hidden=false;
  void el.offsetWidth;            // geçişin yeniden başlaması için
  el.classList.add('is-show');
  clearTimeout(timer);
  const ms=Math.max(1800,Math.min(9000,Number(opts.sure)||(error?5600:2400+text.length*35)));
  timer=setTimeout(hide,ms);
  return true;
}
toast.hide=hide;
toast.__ka=true;
global.toast=toast;
})(window);
