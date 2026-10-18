/* Koruk Asistan — bildirim izin bilgilendirme kartı
 * İzin yalnızca kullanıcının açık düğme etkileşimiyle istenir.
 * Tarayıcı/Android izin durumu OS tarafından yönetilir; erteleme yalnızca bu kartın gösterimini etkiler.
 */
(function(global){
'use strict';
if(global.KorukNotificationOnboarding)return;
const KEY='ka-notification-onboarding-v1';
let mounted=false,busy=false,showHelp=false;
const $=(s,r=document)=>r.querySelector(s);
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const native=()=>!!global.KorukPlatformAdapter?.isNative?.();
const platform=()=>native()?'android':'web';
const storageKey=()=>KEY+':'+platform()+':'+String(user().uid||'anon');
function read(){try{return JSON.parse(localStorage.getItem(storageKey())||'{}')}catch(_){return{}}}
function write(patch){try{localStorage.setItem(storageKey(),JSON.stringify({...read(),...patch}))}catch(_){}}
function permission(){return global.KorukPlatformAdapter?.pushPermission?.()||Promise.resolve('unsupported')}
function escape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function ensureStyle(){if($('#ka-notification-onboarding-style'))return;const s=document.createElement('style');s.id='ka-notification-onboarding-style';s.textContent='';document.head.appendChild(s)}
function render(status){
 if(mounted||!user()?.uid||status==='unsupported'||status==='granted')return;
 const saved=read(),now=Date.now();
 if(saved.dismissedUntil&&Number(saved.dismissedUntil)>now)return;
 mounted=true;ensureStyle();
 const denied=status==='denied';
 const card=document.createElement('section');
 card.className='ka-notify-onboarding';
 card.setAttribute('role','dialog');
 card.setAttribute('aria-modal','false');
 card.setAttribute('aria-labelledby','ka-notify-onboarding-title');
 card.innerHTML='<div class="ka-notify-onboarding__icon" aria-hidden="true">🔔</div><div class="ka-notify-onboarding__content"><h2 id="ka-notify-onboarding-title">'+(denied?'Bildirim iznini ayarlardan açın':'Bildirimleri açın')+'</h2><p>'+(denied?'Bildirim izni daha önce engellenmiş. Yeniden izin istemek yerine cihaz veya tarayıcı ayarlarından Koruk Asistan bildirimlerini açabilirsiniz.':'Okul duyuruları, görevler, nöbet hatırlatmaları ve sınavlarla ilgili önemli gelişmeleri kaçırmayın.')+'</p>'+(showHelp?'<div class="ka-notify-onboarding__help">'+(native()?'Android: Ayarlar → Uygulamalar → Koruk Asistan → Bildirimler bölümünden bildirimlere izin verin.':'Tarayıcının adres çubuğundaki site izinleri simgesini açın ve Bildirimler iznini İzin ver olarak değiştirin. Gerekirse tarayıcı ayarlarından site izinlerini kontrol edin.')+'</div>':'')+'<div class="ka-notify-onboarding__actions"><button type="button" class="ka-btn" data-ka-notify-enable>'+(denied?'Nasıl açarım?':'Bildirimleri Etkinleştir')+'</button><button type="button" class="ka-btn ka-btn--secondary" data-ka-notify-later>Daha Sonra</button></div><p class="ka-notify-onboarding__status" aria-live="polite" data-ka-notify-status></p></div><button type="button" class="ka-notify-onboarding__close" aria-label="Kartı kapat" data-ka-notify-close>×</button>';
 document.body.appendChild(card);
 const statusEl=$('[data-ka-notify-status]',card),enable=$('[data-ka-notify-enable]',card);
 const close=()=>{card.remove();mounted=false};
 const later=()=>{write({dismissedUntil:Date.now()+7*24*60*60*1000});close()};
 $('[data-ka-notify-later]',card).addEventListener('click',later);
 $('[data-ka-notify-close]',card).addEventListener('click',later);
 enable.addEventListener('click',async()=>{
   if(busy)return;
   if(denied){showHelp=!showHelp;close();permission().then(render);return}
   busy=true;enable.disabled=true;if(statusEl)statusEl.textContent='İzin ve cihaz kaydı kontrol ediliyor…';
   try{
     if(!global.PushService?.tokenGetir){
       if(global.AppLoader?.loadScript)await global.AppLoader.loadScript('js/modules/communication.js');
       else await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='js/modules/communication.js';s.onload=resolve;s.onerror=()=>reject(new Error('Bildirim servisi yüklenemedi.'));document.head.appendChild(s)});
     }
     if(!global.PushService?.tokenGetir)throw new Error('Bildirim servisi hazır değil. Sayfayı yenileyip tekrar deneyin.');
     await global.PushService.tokenGetir({request:true});
     write({enabledAt:Date.now(),dismissedUntil:0});
     if(statusEl)statusEl.textContent='Bildirim izni verildi ve bu cihaz kaydedildi.';
     global.toast?.('Bildirimler etkinleştirildi.');
     setTimeout(close,900);
   }catch(err){
     const message=String(err?.message||err||'');
     if(statusEl)statusEl.textContent=message==='bildirim-engellendi'?'Bildirimler engellenmiş. Tarayıcı veya cihaz ayarlarından izin verin.':message==='bildirim-izni-gerekli'?'Bildirim izni verilmedi. İstediğiniz zaman ayarlardan açabilirsiniz.':message==='token-alinamadi'?'İzin durumu alındı ancak cihaz kaydı tamamlanamadı. İnternet bağlantısını kontrol edip yeniden deneyin.':message||'Bildirimler etkinleştirilemedi.';
     enable.disabled=false;
     if(message==='bildirim-engellendi'||message==='bildirim-izni-gerekli')enable.textContent='İzin nasıl açılır?';
     if(enable.textContent==='İzin nasıl açılır?')enable.onclick=null;
   }finally{busy=false;enable.disabled=false}
 });
}
async function check(){if(!user()?.uid)return;try{const p=await permission();render(p)}catch(_){}}
function start(){if(mounted)return;check();global.addEventListener('koruk:auth-session-ready',check);global.addEventListener('koruk:auth-local-restored',check);global.addEventListener('koruk:app-ready',check);global.AppStore?.subscribe?.('session.user',check)}
global.KorukNotificationOnboarding={check};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
