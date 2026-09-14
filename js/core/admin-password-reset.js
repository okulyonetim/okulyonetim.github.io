/* Koruk Asistan — güvenli yönetici şifre sıfırlama köprüsü.
 * Parola sunucuya/Firestore'a gönderilmez. Yönetici yalnız sıfırlama kodu ister;
 * Firebase Admin SDK resmi parola-sıfırlama bağlantısını üretir. Yeni parola daha sonra
 * tarayıcıda Firebase Auth confirmPasswordReset ile aynı UID üzerinde uygulanır.
 */
(function(global){
'use strict';
if(global.__korukAdminPasswordResetBridge)return;
global.__korukAdminPasswordResetBridge=true;

const REQUEST_COLLECTION='oy_idariBilgiler';
const REQUEST_PREFIX='sifreReset_';
const POLL_MS=2000;
const QUICK_WAIT_MS=12000;

function currentUser(){return global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||null;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function cleanUsername(v){return String(v||'').trim().toLocaleLowerCase('tr-TR');}
function notify(message){if(typeof global.toast==='function')global.toast(message);else global.alert?.(message);}
function users(){const v=global.AppStore?.data?.('kullanicilar');return Array.isArray(v)?v:[];}
function oobCodeFromLink(link){try{return new URL(String(link||'')).searchParams.get('oobCode')||''}catch(_){return''}}

async function preparedRequest(ref){
  const snap=await ref.get();
  if(!snap.exists)return null;
  const d=snap.data()||{};
  if(d.tur!=='sifreSifirlama')return null;
  if(d.durum==='hata')throw new Error(d.hata||'Şifre sıfırlama kodu hazırlanamadı.');
  if(d.durum!=='hazir'||!d.resetLink)return null;
  return d;
}

async function applyPreparedReset(ref,newPassword){
  const ready=await preparedRequest(ref);
  if(!ready)return null;
  const code=oobCodeFromLink(ready.resetLink);
  if(!code)throw new Error('Firebase sıfırlama kodu okunamadı. Lütfen yeni bir talep oluşturun.');
  await global.auth.confirmPasswordReset(code,newPassword);
  await ref.delete().catch(()=>{});
  return{completed:true};
}

async function requestPasswordReset(userDoc,requestedUsername,newPassword){
  if(!global.db||!global.auth)throw new Error('Firebase bağlantısı hazır değil.');
  const admin=currentUser();
  if(!admin?.uid||admin.admin!==true)throw new Error('Şifre sıfırlama işlemini yalnız Süper Admin yapabilir.');
  const targetUid=String(userDoc?.id||userDoc?.uid||'').trim();
  if(!targetUid)throw new Error('Hedef kullanıcı UID bulunamadı.');
  if(targetUid===admin.uid)throw new Error('Kendi şifrenizi Profilim bölümünden değiştirebilirsiniz.');
  const existingUsername=String(userDoc?.kullaniciAdi||'').trim();
  const email=String(userDoc?.email||'').trim();
  if(!existingUsername||!email)throw new Error('Kullanıcının giriş hesabı bilgileri eksik.');
  if(cleanUsername(requestedUsername)!==cleanUsername(existingUsername))throw new Error('Şifre sıfırlamada kullanıcı adı değiştirilemez.');
  const pw=String(newPassword||'');
  if(pw.length<6)throw new Error('Şifre en az 6 karakter olmalıdır.');
  if(typeof navigator!=='undefined'&&navigator.onLine===false)throw new Error('Şifre sıfırlamak için internet bağlantısı gerekiyor.');

  const ref=global.db.collection(REQUEST_COLLECTION).doc(REQUEST_PREFIX+targetUid);
  const already=await applyPreparedReset(ref,pw);
  if(already)return already;

  const requestId=(global.crypto?.randomUUID?.()||(`${Date.now()}_${Math.random().toString(36).slice(2)}`));
  await ref.set({
    tur:'sifreSifirlama',
    durum:'bekliyor',
    istekId:requestId,
    hedefUid:targetUid,
    email,
    kullaniciAdi:existingUsername,
    isteyenUid:admin.uid,
    isteyenAdi:admin.ad||admin.adSoyad||admin.kullaniciAdi||'Süper Admin',
    istekZamani:global.firebase?.firestore?.FieldValue?.serverTimestamp?.()||new Date().toISOString()
  },{merge:false});

  const started=Date.now();
  while(Date.now()-started<QUICK_WAIT_MS){
    await sleep(POLL_MS);
    const result=await applyPreparedReset(ref,pw);
    if(result)return result;
  }
  return{completed:false,queued:true};
}

function installOverride(){
  if(typeof global.adminSifreSifirlaYeniHesapla!=='function')return false;
  if(global.adminSifreSifirlaYeniHesapla.__sameAccountReset)return true;
  const replacement=async function(eskiKullaniciBelgesi,yeniKullaniciAdi,yeniSifre){
    return requestPasswordReset(eskiKullaniciBelgesi,yeniKullaniciAdi,yeniSifre);
  };
  replacement.__sameAccountReset=true;
  global.adminSifreSifirlaYeniHesapla=replacement;
  return true;
}

function patchResetPanel(){
  const panel=document.querySelector('[data-user-password-panel]');
  if(!panel)return;
  const userInput=panel.querySelector('[data-reset-username]');
  if(userInput){userInput.readOnly=true;userInput.setAttribute('aria-readonly','true');}
  const userLabel=userInput?.closest('.ka-field')?.querySelector('.ka-field__label');
  if(userLabel)userLabel.textContent='Kullanıcı Adı';
  const openBtn=panel.querySelector('[data-reset-open]');
  if(openBtn)openBtn.textContent='Şifreyi Değiştir / Sıfırla';
  const saveBtn=panel.querySelector('[data-reset-save]');
  if(saveBtn&&!saveBtn.disabled)saveBtn.textContent='Şifreyi Güncelle';
  const muted=[...panel.querySelectorAll('.ka-muted')];
  if(muted[0])muted[0].textContent='Mevcut kullanıcının şifresi güncellenir. Kullanıcı adı, rolü ve tüm verileri korunur.';
  if(muted[1])muted[1].textContent='İlk dokunuşta güvenli sıfırlama kodu hazırlanır. Hazır değilse birkaç dakika sonra aynı yeni şifreyle tekrar dokunun.';
}

async function handleResetClick(event){
  const button=event.target?.closest?.('[data-reset-save]');
  if(!button)return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const panel=button.closest('[data-user-password-panel]');
  if(!panel||button.dataset.directResetBusy==='1')return;
  const username=String(panel.querySelector('[data-reset-username]')?.value||'').trim();
  const password=String(panel.querySelector('[data-reset-password]')?.value||'');
  const confirm=String(panel.querySelector('[data-reset-confirm]')?.value||'');
  if(password.length<6){notify('Şifre en az 6 karakter olmalıdır.');return;}
  if(password!==confirm){notify('Şifreler eşleşmiyor.');return;}
  const user=users().find(x=>cleanUsername(x.kullaniciAdi)===cleanUsername(username));
  if(!user){notify('Kullanıcı kaydı bulunamadı.');return;}
  button.dataset.directResetBusy='1';
  button.disabled=true;
  button.textContent='Kontrol ediliyor…';
  try{
    const result=await requestPasswordReset(user,username,password);
    if(result.completed){
      panel.querySelector('[data-reset-password]').value='';
      panel.querySelector('[data-reset-confirm]').value='';
      notify('Şifre başarıyla güncellendi. Kullanıcı aynı hesabıyla giriş yapabilir.');
    }else{
      notify('Sıfırlama talebi alındı. Birkaç dakika sonra aynı şifreyle “Şifreyi Güncelle” düğmesine tekrar dokunun.');
    }
  }catch(error){
    console.error('[Şifre sıfırlama]',error);
    notify(error?.message||'Şifre sıfırlanamadı.');
  }finally{
    button.dataset.directResetBusy='0';
    button.disabled=false;
    button.textContent='Şifreyi Güncelle';
  }
}

const timer=setInterval(()=>{if(installOverride())clearInterval(timer)},250);
const observer=new MutationObserver(()=>{installOverride();patchResetPanel();});
document.addEventListener('DOMContentLoaded',()=>{observer.observe(document.body,{childList:true,subtree:true});patchResetPanel();});
document.addEventListener('click',handleResetClick,true);
setTimeout(()=>clearInterval(timer),15000);

global.KorukAdminPasswordReset={requestPasswordReset,patchResetPanel};
})(window);

/* Ayarlar alt sayfa geri navigasyonu tüm hesaplarda etkin olsun. */
(function loadSettingsBackNavigation(){
  if(document.querySelector('script[data-settings-back-navigation]'))return;
  const script=document.createElement('script');
  script.src='js/core/settings-back-navigation.js?v=944';
  script.async=false;
  script.dataset.settingsBackNavigation='';
  document.head.appendChild(script);
})();
