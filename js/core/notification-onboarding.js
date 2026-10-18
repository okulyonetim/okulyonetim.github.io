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
 /* Inline layout is intentional: legacy global selectors must not make this card transparent or overlap dashboard content. */
 Object.assign(card.style,{position:'relative',zIndex:'1',inset:'auto',width:'100%',maxWidth:'none',maxHeight:'none',margin:'12px 0 16px',padding:'16px',boxSizing:'border-box',display:'block',overflow:'visible',background:'#171722',color:'#f7f7fb',opacity:'1',backdropFilter:'none',WebkitBackdropFilter:'none',border:'1px solid #55556a',borderRadius:'16px',boxShadow:'0 8px 24px rgba(0,0,0,.35)',isolation:'isolate',flex:'0 0 auto'});

 card.innerHTML='<div class="ka-notify-onboarding__icon" aria-hidden="true">🔔</div><div class="ka-notify-onboarding__content"><h2 id="ka-notify-onboarding-title">'+(denied?'Bildirim iznini ayarlardan açın':'Bildirimleri açın')+'</h2><p>'+(denied?'Bildirim izni daha önce engellenmiş. Cihaz veya tarayıcı ayarlarından açabilirsiniz.':'Okul duyuruları, görevler, nöbet hatırlatmaları ve sınavlarla ilgili önemli gelişmeleri kaçırmayın.')+'</p>'+(showHelp?'<div class="ka-notify-onboarding__help">'+(native()?'Android: Ayarlar → Uygulamalar → Koruk Asistan → Bildirimler bölümünden izin verin.':'Tarayıcı site izinlerinden Bildirimler iznini açın.')+'</div>':'')+'<div class="ka-notify-onboarding__actions"><button type="button" class="ka-btn" data-ka-notify-enable>'+(denied?'Nasıl açarım?':'Bildirimleri Etkinleştir')+'</button><button type="button" class="ka-btn ka-btn--secondary" data-ka-location-enable>📍 Konum İznini Aç</button><button type="button" class="ka-btn ka-btn--secondary" data-ka-notify-later>Daha Sonra</button></div><p class="ka-notify-onboarding__status" aria-live="polite" data-ka-notify-status></p><div class="ka-notify-onboarding__help">📍 <strong>Konum izni neden gerekli?</strong> Bulunduğunuz yere göre hava durumu, sıcaklık ve hissedilen sıcaklık bilgisini göstermek için konum izni gerekir.</div>'+(showLocationHelp?'<div class="ka-notify-onboarding__help">'+(native()?'Android: Ayarlar → Uygulamalar → Koruk Asistan → İzinler → Konum bölümünden izin verin.':'Tarayıcı site izinlerinden Konum erişimini açın.')+'</div>':'')+'</div><button type="button" class="ka-notify-onboarding__close" aria-label="Kartı kapat" data-ka-notify-close>×</button>';

 const content=card.querySelector('.ka-notify-onboarding__content');
 if(content)Object.assign(content.style,{position:'static',display:'flex',flexDirection:'column',alignItems:'stretch',gap:'12px',width:'100%',minWidth:'0',overflow:'visible',transform:'none'});
 const title=card.querySelector('h2');if(title)Object.assign(title.style,{position:'static',display:'block',margin:'0',color:'#fff',fontSize:'18px',lineHeight:'1.3',transform:'none',whiteSpace:'normal'});
 const desc=content?.querySelector('p');if(desc)Object.assign(desc.style,{position:'static',display:'block',margin:'0',color:'#e1e1eb',fontSize:'14px',lineHeight:'1.5',transform:'none',whiteSpace:'normal',overflowWrap:'anywhere'});
 const actions=card.querySelector('.ka-notify-onboarding__actions');if(actions)Object.assign(actions.style,{position:'static',display:'grid',gridTemplateColumns:'minmax(0,1fr)',gap:'9px',width:'100%',margin:'4px 0 0',transform:'none'});
 card.querySelectorAll('.ka-notify-onboarding__actions button').forEach(b=>Object.assign(b.style,{position:'static',display:'block',width:'100%',minWidth:'0',minHeight:'46px',height:'auto',margin:'0',padding:'11px 12px',boxSizing:'border-box',whiteSpace:'normal',lineHeight:'1.35',transform:'none',float:'none',opacity:'1'}));
 card.querySelectorAll('.ka-notify-onboarding__help').forEach(el=>Object.assign(el.style,{position:'static',display:'block',margin:'0',padding:'11px',background:'#282838',color:'#f7f7fb',border:'1px solid #45455b',borderRadius:'10px',fontSize:'14px',lineHeight:'1.45',transform:'none',whiteSpace:'normal',overflowWrap:'anywhere'}));
 const closeButton=card.querySelector('[data-ka-notify-close]');if(closeButton)Object.assign(closeButton.style,{position:'absolute',top:'12px',right:'12px',display:'grid',width:'36px',height:'36px',placeItems:'center',background:'#30303d',color:'#fff',border:'1px solid #5a5a6c',borderRadius:'10px',zIndex:'2'});
 if(content)content.style.paddingRight='38px';\n card.style.setProperty('position','relative','important');card.style.setProperty('top','auto','important');card.style.setProperty('right','auto','important');card.style.setProperty('bottom','auto','important');card.style.setProperty('left','auto','important');
 const host=document.querySelector('#app .ka-app-content');\n if(host){host.insertBefore(card,host.firstChild);card.style.marginInline='0';}\n else document.body.appendChild(card);
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
