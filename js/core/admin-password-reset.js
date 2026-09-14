/* Koruk Asistan — yönetici şifre sıfırlama köprüsü.
 * Firebase istemci SDK'sı başka bir kullanıcının parolasını değiştiremediği için
 * istek güvenli idari kuyruğa yazılır; GitHub Actions/Firebase Admin SDK aynı UID'nin
 * parolasını günceller. Kullanıcı adı, UID, rol ve öğretmen bağlantısı korunur.
 */
(function(global){
'use strict';
if(global.__korukAdminPasswordResetBridge)return;
global.__korukAdminPasswordResetBridge=true;

const REQUEST_COLLECTION='oy_idariBilgiler';
const REQUEST_PREFIX='sifreReset_';
const POLL_MS=2000;
const MAX_WAIT_MS=12000;

function currentUser(){return global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||null;}
function isAdmin(){return currentUser()?.admin===true;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function cleanUsername(v){return String(v||'').trim().toLocaleLowerCase('tr-TR');}

async function requestPasswordReset(userDoc,requestedUsername,newPassword){
  if(!global.db)throw new Error('Firebase bağlantısı hazır değil.');
  const admin=currentUser();
  if(!admin?.uid||admin.admin!==true)throw new Error('Şifre sıfırlama işlemini yalnız Süper Admin yapabilir.');
  const targetUid=String(userDoc?.id||userDoc?.uid||'').trim();
  if(!targetUid)throw new Error('Hedef kullanıcı UID bulunamadı.');
  const existingUsername=String(userDoc?.kullaniciAdi||'').trim();
  if(!existingUsername)throw new Error('Kullanıcı adı bulunamadı.');
  if(cleanUsername(requestedUsername)!==cleanUsername(existingUsername))throw new Error('Şifre sıfırlamada kullanıcı adı değiştirilemez.');
  const pw=String(newPassword||'');
  if(pw.length<6)throw new Error('Şifre en az 6 karakter olmalıdır.');
  if(typeof navigator!=='undefined'&&navigator.onLine===false)throw new Error('Şifre sıfırlamak için internet bağlantısı gerekiyor.');

  const ref=global.db.collection(REQUEST_COLLECTION).doc(REQUEST_PREFIX+targetUid);
  const requestId=(global.crypto?.randomUUID?.()||(`${Date.now()}_${Math.random().toString(36).slice(2)}`));
  await ref.set({
    tur:'sifreSifirlama',
    durum:'bekliyor',
    istekId:requestId,
    hedefUid:targetUid,
    kullaniciAdi:existingUsername,
    yeniSifre:pw,
    isteyenUid:admin.uid,
    isteyenAdi:admin.ad||admin.adSoyad||admin.kullaniciAdi||'Süper Admin',
    istekZamani:global.firebase?.firestore?.FieldValue?.serverTimestamp?.()||new Date().toISOString()
  },{merge:false});

  // İşlem GitHub Actions tarafından uygulanır. Kısa süre boyunca durum değişmişse
  // anında başarıyı yakala; aksi halde sıraya alındığını bildirip UI'yi serbest bırak.
  const started=Date.now();
  while(Date.now()-started<MAX_WAIT_MS){
    await sleep(POLL_MS);
    const snap=await ref.get();
    if(!snap.exists)return{queued:true,completed:true};
    const d=snap.data()||{};
    if(d.istekId!==requestId)break;
    if(d.durum==='tamamlandi')return{queued:true,completed:true};
    if(d.durum==='hata')throw new Error(d.hata||'Şifre sıfırlama işlemi tamamlanamadı.');
  }
  return{queued:true,completed:false};
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
  if(muted[1])muted[1].textContent='Şifre sıfırlama aynı kullanıcı hesabına uygulanır. Kullanıcı adı ve UID değişmez.';
}

const timer=setInterval(()=>{if(installOverride())clearInterval(timer)},250);
const observer=new MutationObserver(()=>{installOverride();patchResetPanel();});
document.addEventListener('DOMContentLoaded',()=>{observer.observe(document.body,{childList:true,subtree:true});patchResetPanel();});
setTimeout(()=>clearInterval(timer),15000);

global.KorukAdminPasswordReset={requestPasswordReset,patchResetPanel};
})(window);
