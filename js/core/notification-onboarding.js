/* Koruk Asistan — bildirim ve konum izinleri bilgilendirme kartı */
(function(global){
'use strict';
if(global.KorukNotificationOnboarding)return;
const KEY='ka-notification-onboarding-v1';
let mounted=false,busy=false,showHelp=false,showLocationHelp=false;
const $=(s,r=document)=>r.querySelector(s);
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const native=()=>!!global.KorukPlatformAdapter?.isNative?.();
const platform=()=>native()?'android':'web';
const storageKey=()=>KEY+':'+platform()+':'+String(user().uid||'anon');
function read(){try{return JSON.parse(localStorage.getItem(storageKey())||'{}')}catch(_){return{}}}
function write(patch){try{localStorage.setItem(storageKey(),JSON.stringify({...read(),...patch}))}catch(_){}}
function permission(){return global.KorukPlatformAdapter?.pushPermission?.()||Promise.resolve('unsupported')}
function render(status){
 if(mounted||!user()?.uid||status==='unsupported'||status==='granted')return;
 const saved=read();if(saved.dismissedUntil&&Number(saved.dismissedUntil)>Date.now())return;
 mounted=true;
 const denied=status==='denied';
 const card=document.createElement('section');card.className='ka-notify-onboarding';
 card.setAttribute('role','dialog');card.setAttribute('aria-modal','false');card.setAttribute('aria-labelledby','ka-notify-onboarding-title');
 card.innerHTML='<div class="ka-notify-onboarding__icon" aria-hidden="true">🔔</div><div class="ka-notify-onboarding__content"><h2 id="ka-notify-onboarding-title">'+(denied?'Bildirim iznini ayarlardan açın':'Bildirimleri açın')+'</h2><p>'+(denied?'Bildirim izni daha önce engellenmiş. Cihaz veya tarayıcı ayarlarından açabilirsiniz.':'Okul duyuruları, görevler, nöbet hatırlatmaları ve sınavlarla ilgili önemli gelişmeleri kaçırmayın.')+'</p>'+(showHelp?'<div class="ka-notify-onboarding__help">'+(native()?'Android: Ayarlar → Uygulamalar → Koruk Asistan → Bildirimler bölümünden izin verin.':'Tarayıcı site izinlerinden Bildirimler iznini açın.')+'</div>':'')+'<div class="ka-notify-onboarding__actions"><button type="button" class="ka-btn" data-ka-notify-enable>'+(denied?'Nasıl açarım?':'Bildirimleri Etkinleştir')+'</button><button type="button" class="ka-btn ka-btn--secondary" data-ka-location-enable>📍 Konum İznini Aç</button><button type="button" class="ka-btn ka-btn--secondary" data-ka-notify-later>Daha Sonra</button></div><p class="ka-notify-onboarding__status" aria-live="polite" data-ka-notify-status></p><div class="ka-notify-onboarding__help">📍 <strong>Konum izni neden gerekli?</strong> Bulunduğunuz yere göre hava durumu, sıcaklık ve hissedilen sıcaklık bilgisini göstermek için konum izni gerekir.</div>'+(showLocationHelp?'<div class="ka-notify-onboarding__help">'+(native()?'Android: Ayarlar → Uygulamalar → Koruk Asistan → İzinler → Konum bölümünden izin verin.':'Tarayıcı site izinlerinden Konum erişimini açın.')+'</div>':'')+'</div><button type="button" class="ka-notify-onboarding__close" aria-label="Kartı kapat" data-ka-notify-close>×</button>';
 document.body.appendChild(card);
 const statusEl=$('[data-ka-notify-status]',card),enable=$('[data-ka-notify-enable]',card),locationEnable=$('[data-ka-location-enable]',card);
 const close=()=>{card.remove();mounted=false};
 const later=()=>{write({dismissedUntil:Date.now()+7*24*60*60*1000});close()};
 $('[data-ka-notify-later]',card).addEventListener('click',later);
 $('[data-ka-notify-close]',card).addEventListener('click',later);
 locationEnable.addEventListener('click',()=>{
  if(!navigator.geolocation){statusEl.textContent='Bu cihaz veya tarayıcı konum özelliğini desteklemiyor.';return}
  locationEnable.disabled=true;statusEl.textContent='Konum izni bekleniyor…';
  navigator.geolocation.getCurrentPosition(async()=>{
   statusEl.textContent='Konum izni verildi. Hava durumu güncelleniyor…';
   try{await global.SchoolLiveStatus?.refreshWeather?.()}catch(_){}
   statusEl.textContent='Konum izni alındı. Hava durumu bulunduğunuz konuma göre güncellenecek.';locationEnable.disabled=false;
  },err=>{
   statusEl.textContent=err?.code===1?'Konum izni verilmedi. Cihaz veya tarayıcı ayarlarından açabilirsiniz.':'Konum alınamadı. Konum servislerini ve internet bağlantısını kontrol edin.';
   locationEnable.disabled=false;
   if(err?.code===1&&!card.querySelector('[data-ka-location-help]')){const help=document.createElement('div');help.className='ka-notify-onboarding__help';help.dataset.kaLocationHelp='1';help.textContent=native()?'Android: Ayarlar → Uygulamalar → Koruk Asistan → İzinler → Konum bölümünden izin verin.':'Tarayıcı adres çubuğundaki site izinlerinden Konum erişimini İzin ver olarak değiştirin.';card.querySelector('.ka-notify-onboarding__content')?.appendChild(help)}
  },{enableHighAccuracy:false,timeout:8000,maximumAge:1800000});
 });
 enable.addEventListener('click',async()=>{
  if(busy)return;
  if(denied){showHelp=!showHelp;close();permission().then(render);return}
  busy=true;enable.disabled=true;statusEl.textContent='İzin ve cihaz kaydı kontrol ediliyor…';
  try{
   if(!global.PushService?.tokenGetir){
    if(global.AppLoader?.loadScript)await global.AppLoader.loadScript('js/modules/communication.js');
    else await new Promise((resolve,reject)=>{const el=document.createElement('script');el.src='js/modules/communication.js';el.onload=resolve;el.onerror=()=>reject(new Error('Bildirim servisi yüklenemedi.'));document.head.appendChild(el)});
   }
   if(!global.PushService?.tokenGetir)throw new Error('Bildirim servisi hazır değil. Sayfayı yenileyip tekrar deneyin.');
   await global.PushService.tokenGetir({request:true});write({enabledAt:Date.now(),dismissedUntil:0});statusEl.textContent='Bildirim izni verildi ve bu cihaz kaydedildi.';global.toast?.('Bildirimler etkinleştirildi.');setTimeout(close,900);
  }catch(err){
   const message=String(err?.message||err||'');
   statusEl.textContent=message==='bildirim-engellendi'?'Bildirimler engellenmiş. Tarayıcı veya cihaz ayarlarından izin verin.':message==='bildirim-izni-gerekli'?'Bildirim izni verilmedi. İstediğiniz zaman ayarlardan açabilirsiniz.':message==='token-alinamadi'?'İzin durumu alındı ancak cihaz kaydı tamamlanamadı. İnternet bağlantısını kontrol edip yeniden deneyin.':message||'Bildirimler etkinleştirilemedi.';
   enable.disabled=false;
   if(message==='bildirim-engellendi'||message==='bildirim-izni-gerekli'){const p=await permission();if(p==='denied'){close();render('denied');return}}
  }finally{busy=false;enable.disabled=false}
 });
}
async function check(){if(!user()?.uid)return;try{render(await permission())}catch(_){}}
function start(){if(mounted)return;check();global.addEventListener('koruk:auth-session-ready',check);global.addEventListener('koruk:auth-local-restored',check);global.addEventListener('koruk:app-ready',check);global.AppStore?.subscribe?.('session.user',check)}
global.KorukNotificationOnboarding={check};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
