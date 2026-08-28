/* ================================================================
   js/auth.js
   Kullanıcı adı/şifre girişi + oturum + local-first kullanım istatistikleri.
   ================================================================ */

const KULLANICI_ADI_DOMAIN = 'korukokuluportal.com';

let AKTIF_KULLANICI = null; // { uid, email, kullaniciAdi, ad, admin, aktif, rolId, bagliOgretmenId }
let AKTIF_ROL = null;       // { id, ad, kullaniciYonetimi, yetkiler:{...} }

/* ========================= LOCAL-FIRST İSTATİSTİK =========================
   Mevcut veri modeli korunur: oy_kullaniciIstatistikleri / belge ID = uid.
   Yazma: DeviceData -> IndexedDB/AppStore -> SyncEngine queue -> Firestore. */
(function(global){
'use strict';
if(global.IstatistikService?.__localFirst)return;
let mode='',preparing=null,sessionStart=Date.now(),sessionActive=!document.hidden,trackingBound=false;
const type='kullaniciIstatistikleri';
function me(){const u=global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user');if(!u?.uid)return null;return{uid:u.uid,ad:u.ad||u.adSoyad||u.kullaniciAdi||'Kullanıcı'}}
async function prepare(all=false){
  const ben=me();if(!ben||!global.SyncEngine||!global.DeviceData||!global.COL?.kullaniciIstatistikleri)return false;
  const wanted=all?'all':'self';if(mode===wanted)return true;if(preparing)return preparing;
  preparing=(async()=>{const opts=all?{}:{query:q=>q.where(firebase.firestore.FieldPath.documentId(),'==',ben.uid)};SyncEngine.register(type,COL.kullaniciIstatistikleri,opts);await SyncEngine.localHydrate([type]);if(navigator.onLine)await SyncEngine.pull([type]);mode=wanted;return true})().catch(e=>{console.warn('[İstatistik hazırlama]',e?.message||e);return false}).finally(()=>{preparing=null});return preparing;
}
async function mutate(fn){
  const ben=me();if(!ben)return null;await prepare(false);const old=DeviceData.get(type,ben.uid)||{id:ben.uid,uid:ben.uid,ad:ben.ad};const next=fn({...old,uid:ben.uid,ad:ben.ad})||old;next.guncellenmeTarihi=new Date().toISOString();return DeviceData.set(type,COL.kullaniciIstatistikleri,ben.uid,next,{merge:false});
}
const inc=(v,n=1)=>Number(v||0)+Number(n||0);
const service={
  __localFirst:true,prepare,
  girisKaydet(){return mutate(x=>({...x,girisSayisi:inc(x.girisSayisi),sonGiris:new Date().toISOString()}));},
  dosyaYuklemeKaydet(){return mutate(x=>({...x,dosyaYuklemeSayisi:inc(x.dosyaYuklemeSayisi)}));},
  notEklemeKaydet(){return mutate(x=>({...x,notEklemeSayisi:inc(x.notEklemeSayisi)}));},
  sayfaZiyaretiKaydet(sayfa){if(!sayfa)return Promise.resolve();return mutate(x=>({...x,sayfaZiyaretleri:{...(x.sayfaZiyaretleri||{}),[sayfa]:inc(x.sayfaZiyaretleri?.[sayfa])}}));},
  sureEkle(saniye){const n=Math.round(Number(saniye)||0);if(n<1)return Promise.resolve();return mutate(x=>({...x,toplamSureSaniye:inc(x.toplamSureSaniye,n)}));},
  depolamaKullanimEkle(kategori,bayt){const n=Number(bayt)||0;if(!kategori||!n)return Promise.resolve();return mutate(x=>({...x,depolamaKullanimi:{...(x.depolamaKullanimi||{}),[kategori]:Math.max(0,inc(x.depolamaKullanimi?.[kategori],n))}}));},
  depolamaKullanimCikar(kategori,bayt){return this.depolamaKullanimEkle(kategori,-Math.abs(Number(bayt)||0));},
  async depolamaKullanimCikarUid(uid,kategori,bayt){if(!uid||!kategori||!bayt)return;await prepare(true);const old=DeviceData.get(type,uid)||{id:uid,uid},d={...(old.depolamaKullanimi||{})};d[kategori]=Math.max(0,inc(d[kategori],-Math.abs(Number(bayt)||0)));return DeviceData.set(type,COL.kullaniciIstatistikleri,uid,{...old,depolamaKullanimi:d,guncellenmeTarihi:new Date().toISOString()},{merge:false});},
  async tumIstatistikleriGetir(){await prepare(true);return DeviceData.list(type).map(x=>({...x,uid:x.uid||x.id}));},
  async depolamaYenidenHesapla(){
    const u=me();if(!u||!(global.AKTIF_KULLANICI?.admin))throw new Error('yetkisiz');
    await prepare(true);const toplam={};const ekle=(uid,k,b)=>{if(!uid||!b)return;if(!toplam[uid])toplam[uid]={mesaj:0,duyuru:0,dokuman:0,takvim:0};toplam[uid][k]+=Number(b)||0};
    (AppStore.data('dokumanlar')||[]).forEach(v=>ekle(v.olusturanUid,'dokuman',v.dosyaBoyutu));
    (AppStore.data('duyurular')||[]).forEach(v=>(v.resimler||[]).forEach(r=>ekle(v.olusturanUid,'duyuru',r.boyut)));
    (AppStore.data('mesajlar')||[]).forEach(v=>v.dosya?.boyut&&ekle(v.gonderenUid,'mesaj',v.dosya.boyut));
    const tak=(AppStore.data('akademikTakvim')||[]).find(x=>x.id==='aktif')||(AppStore.data('akademikTakvim')||[])[0];if(tak?.dosyaBoyutu)ekle(u.uid,'takvim',tak.dosyaBoyutu);
    DeviceData.list(type).forEach(v=>{const id=v.uid||v.id;if(id&&!toplam[id])toplam[id]={mesaj:0,duyuru:0,dokuman:0,takvim:0}});
    for(const [uid,depolamaKullanimi] of Object.entries(toplam)){const old=DeviceData.get(type,uid)||{id:uid,uid};await DeviceData.set(type,COL.kullaniciIstatistikleri,uid,{...old,depolamaKullanimi,guncellenmeTarihi:new Date().toISOString()},{merge:false})}
    return{kullaniciSayisi:Object.keys(toplam).length};
  }
};
global.IstatistikService=service;
function saveSlice(){if(!sessionActive)return;const sec=(Date.now()-sessionStart)/1000;sessionStart=Date.now();service.sureEkle(sec)}
function bindTracking(){if(trackingBound)return;trackingBound=true;document.addEventListener('visibilitychange',()=>{if(document.hidden){saveSlice();sessionActive=false}else{sessionActive=true;sessionStart=Date.now()}});window.addEventListener('pagehide',saveSlice,{passive:true})}
bindTracking();
})(window);

function kullaniciAdiEmaileDonustur(kullaniciAdi){
  const sade = (kullaniciAdi||'').trim().toLocaleLowerCase('tr')
    .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9._-]/g,'');
  return `${sade}@${KULLANICI_ADI_DOMAIN}`;
}

function authYuzeyiniCoz(){document.documentElement.classList.add('ka-auth-resolved');window.AppLoader?.syncAuthVisibility?.();}
function girisEkraniGoster(){
  document.getElementById('girisEkrani')?.classList.add('active');
  document.getElementById('onayBekleniyorEkrani')?.classList.remove('active');
  const app = document.getElementById('app');
  if(app) app.classList.remove('ready','show');
  authYuzeyiniCoz();
}
function girisEkraniGizle(){document.getElementById('girisEkrani')?.classList.remove('active');}
function onayBekleniyorGoster(){document.getElementById('onayBekleniyorEkrani')?.classList.add('active');document.getElementById('girisEkrani')?.classList.remove('active');const app=document.getElementById('app');if(app)app.classList.remove('ready','show');authYuzeyiniCoz();}
function onayBekleniyorGizle(){document.getElementById('onayBekleniyorEkrani')?.classList.remove('active');}

function _girisHatasiGoster(mesaj){const el=document.getElementById('girisHataMetni');if(!el)return;el.textContent=mesaj;el.style.display=mesaj?'':'none';}
function girisFormGonder(e){
  if(e)e.preventDefault();if(!auth){_girisHatasiGoster('Firebase henüz hazır değil, lütfen sayfayı yenileyin.');return;}
  const kullaniciAdi=document.getElementById('girisKullaniciAdi').value.trim(),sifre=document.getElementById('girisSifre').value;if(!kullaniciAdi||!sifre){_girisHatasiGoster('Kullanıcı adı ve şifre zorunludur.');return;}
  const btn=document.getElementById('girisBtn');if(btn){btn.disabled=true;btn.textContent='Giriş yapılıyor…'}_girisHatasiGoster('');
  auth.signInWithEmailAndPassword(kullaniciAdiEmaileDonustur(kullaniciAdi),sifre).catch(err=>{console.error('Giriş hatası:',err);const kod=err&&err.code;let mesaj='Giriş yapılamadı. Lütfen tekrar deneyin.';if(kod==='auth/user-not-found'||kod==='auth/wrong-password'||kod==='auth/invalid-credential')mesaj='Kullanıcı adı veya şifre hatalı.';else if(kod==='auth/too-many-requests')mesaj='Çok fazla hatalı deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.';else if(kod==='auth/user-disabled')mesaj='Bu hesap devre dışı bırakılmış. Yöneticinizle iletişime geçin.';_girisHatasiGoster(mesaj)}).finally(()=>{if(btn){btn.disabled=false;btn.textContent='Giriş Yap'}});
}
function cikisYap(){if(auth)auth.signOut().finally(()=>window.location.reload());else window.location.reload();}

function _yardimciAuthAl(){if(!window._yardimciFirebaseApp)window._yardimciFirebaseApp=firebase.initializeApp(firebaseConfig,'yardimciOturum_'+Date.now());return window._yardimciFirebaseApp.auth();}
async function adminYeniKullaniciOlustur(kullaniciAdi,sifre,ekBilgiler){ekBilgiler=ekBilgiler||{};const email=kullaniciAdiEmaileDonustur(kullaniciAdi),yardimciAuth=_yardimciAuthAl(),cred=await yardimciAuth.createUserWithEmailAndPassword(email,sifre),uid=cred.user.uid,belge={uid,email,kullaniciAdi,ad:ekBilgiler.ad||kullaniciAdi,admin:!!ekBilgiler.admin,aktif:true,rolId:ekBilgiler.rolId||null,bagliOgretmenId:ekBilgiler.bagliOgretmenId||null,yetkiler:{},olusturmaTarihi:firebase.firestore.FieldValue.serverTimestamp()};await db.collection(COL.kullanicilar).doc(uid).set(belge);await yardimciAuth.signOut();return{uid,email};}
async function adminSifreSifirlaYeniHesapla(eskiKullaniciBelgesi,yeniKullaniciAdi,yeniSifre){await db.collection(COL.kullanicilar).doc(eskiKullaniciBelgesi.id).update({aktif:false,sifreSifirlandiEskiHesap:true});return adminYeniKullaniciOlustur(yeniKullaniciAdi,yeniSifre,{ad:eskiKullaniciBelgesi.ad,rolId:eskiKullaniciBelgesi.rolId,bagliOgretmenId:eskiKullaniciBelgesi.bagliOgretmenId,admin:eskiKullaniciBelgesi.admin});}
async function kendiSifremiDegistir(mevcutSifre,yeniSifre){const user=auth.currentUser;if(!user)throw new Error('oturum-yok');const cred=firebase.auth.EmailAuthProvider.credential(user.email,mevcutSifre);await user.reauthenticateWithCredential(cred);await user.updatePassword(yeniSifre);}

function sidebarHesapGuncelle(user){
  const kutu=document.getElementById('sidebarHesap');if(!kutu)return;if(!user){kutu.style.display='none';return}kutu.style.display='flex';const avatar=document.getElementById('hesapAvatar'),ad=document.getElementById('hesapAd'),email=document.getElementById('hesapEmail'),bagliVarMi=!!(AKTIF_KULLANICI&&AKTIF_KULLANICI.bagliOgretmenId),ben=(typeof bagliOgretmenimGetir==='function')?bagliOgretmenimGetir():null,ogretmenlerYuklendiMi=typeof ogretmenler!=='undefined'&&ogretmenler.length>0;if(bagliVarMi&&!ben&&!ogretmenlerYuklendiMi)return;if(avatar)avatar.src=(ben&&ben.profilFotoUrl)||'assets/icon-192.png';if(ad)ad.textContent=ben?`${ben.ad||''} ${ben.soyad||''}`.trim():(AKTIF_KULLANICI?.ad||AKTIF_KULLANICI?.kullaniciAdi||'Kullanıcı');if(email)email.textContent=AKTIF_KULLANICI?.kullaniciAdi?'@'+AKTIF_KULLANICI.kullaniciAdi:(user.email||'');
}

let authSessionActivated=false;
function authCacheSafe(value){try{return JSON.parse(JSON.stringify(value))}catch(_){return value}}
async function authSessionCacheOku(uid){if(!uid||!window.KorukLocalFirst?.meta)return null;try{return await KorukLocalFirst.meta(uid,'authSession')}catch(_){return null}}
async function authSessionCacheYaz(uid,kullanici,rol){if(!uid||!window.KorukLocalFirst?.meta||!kullanici)return null;const payload={user:authCacheSafe(kullanici),role:authCacheSafe(rol||null),cachedAt:Date.now()};try{await KorukLocalFirst.meta(uid,'authSession',payload);return payload}catch(e){console.warn('[Auth cache]',e?.message||e);return null}}
function authOturumuUygula(firebaseUser,kullanici,rol,{cached=false}={}){
  if(!kullanici?.uid||kullanici.uid!==firebaseUser?.uid)return false;
  AKTIF_KULLANICI=kullanici;AKTIF_ROL=rol||null;sidebarHesapGuncelle(firebaseUser);
  if(!AKTIF_KULLANICI.aktif){onayBekleniyorGoster();return false}
  if(typeof sidebarYetkiUygula==='function')sidebarYetkiUygula();
  if(AKTIF_KULLANICI.bagliOgretmenId){localStorage.setItem('oyAktifKullaniciId',AKTIF_KULLANICI.bagliOgretmenId);localStorage.setItem('oyAktifKullaniciTip','ogretmen');localStorage.setItem('oyKullaniciSecimiYapildi','1');if(typeof aktifKullaniciyiGuncelle==='function')aktifKullaniciyiGuncelle()}
  if(typeof kullaniciYonetimiYetkisiVar==='function'&&kullaniciYonetimiYetkisiVar()&&typeof kullaniciYonetimiDinleyiciKur==='function')kullaniciYonetimiDinleyiciKur();
  onayBekleniyorGizle();girisEkraniGizle();const app=document.getElementById('app');if(app)app.classList.add('ready','show');authYuzeyiniCoz();
  if(!authSessionActivated){authSessionActivated=true;IstatistikService.girisKaydet();if(typeof KonumGirisService!=='undefined')KonumGirisService.kaydet();if(typeof window._navVerileriniYukle==='function')window._navVerileriniYukle();try{if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PullToRefreshPlugin)window.Capacitor.Plugins.PullToRefreshPlugin.appHazir()}catch(e){}}
  if(cached)window.dispatchEvent(new CustomEvent('koruk:auth-local-restored',{detail:{uid:kullanici.uid}}));
  return true
}
async function authSunucuOturumuGetir(user,cached){
  const ref=db.collection(COL.kullanicilar).doc(user.uid),snap=await ref.get();
  if(!snap.exists){console.error('Bu hesap için oy_kullanicilar belgesi bulunamadı:',user.uid);alert('Hesabınız için gerekli kayıt bulunamadı. Lütfen yöneticinizle iletişime geçin.');await auth.signOut();return false}
  const kullanici={id:snap.id,...snap.data()};let rol=null;
  if(kullanici.rolId){try{const rolSnap=await db.collection(COL.roller).doc(kullanici.rolId).get();if(rolSnap.exists)rol={id:rolSnap.id,...rolSnap.data()}}catch(e){if(cached?.role?.id===kullanici.rolId)rol=cached.role;else console.warn('Rol okunamadı:',e)}}
  await authSessionCacheYaz(user.uid,kullanici,rol);
  authOturumuUygula(user,kullanici,rol);
  if(typeof renkUygula==='function'){db.collection('oy_kullaniciTercihleri').doc(user.uid).get().then(tercihSnap=>{if(tercihSnap.exists&&tercihSnap.data().renkPaketi)renkUygula(tercihSnap.data().renkPaketi,false)}).catch(e=>console.warn('Renk tercihi okunamadı:',e))}
  return true
}
function authDinleyiciKur(){
  if(!auth){girisEkraniGoster();return;}
  auth.onAuthStateChanged(async user=>{
    if(!user){sidebarHesapGuncelle(null);AKTIF_KULLANICI=null;AKTIF_ROL=null;authSessionActivated=false;girisEkraniGoster();return;}
    const cached=await authSessionCacheOku(user.uid);let localOpened=false;
    if(cached?.user?.uid===user.uid)localOpened=authOturumuUygula(user,cached.user,cached.role,{cached:true});
    try{await authSunucuOturumuGetir(user,cached)}catch(err){
      console.warn('[Auth refresh]',err?.message||err);
      if(localOpened)return;
      console.error('Kullanıcı belgesi kontrol edilemedi:',err);
      _girisHatasiGoster(navigator.onLine?'Hesap bilgileri okunamadı. Lütfen tekrar deneyin.':'Bu cihazda çevrimdışı oturum verisi bulunmuyor. İlk açılış için internet bağlantısı gerekir.');
      girisEkraniGoster();
    }
  });
}

async function sifremiDegistirTikla(){const mevcut=document.getElementById('fSpMevcutSifre').value,yeni=document.getElementById('fSpYeniSifre').value,tekrar=document.getElementById('fSpYeniSifreTekrar').value;if(!mevcut||!yeni){toast('Tüm alanları doldurun.');return}if(yeni.length<6){toast('Yeni şifre en az 6 karakter olmalıdır.');return}if(yeni!==tekrar){toast('Yeni şifreler eşleşmiyor.');return}try{await kendiSifremiDegistir(mevcut,yeni);toast('Şifreniz güncellendi.');document.getElementById('fSpMevcutSifre').value='';document.getElementById('fSpYeniSifre').value='';document.getElementById('fSpYeniSifreTekrar').value=''}catch(err){console.error(err);let mesaj='Şifre değiştirilemedi: '+err.message;if(err.code==='auth/wrong-password'||err.code==='auth/invalid-credential')mesaj='Mevcut şifreniz hatalı.';if(err.code==='auth/weak-password')mesaj='Yeni şifre çok zayıf, en az 6 karakter olmalı.';toast(mesaj)}}

document.addEventListener('DOMContentLoaded',()=>{document.getElementById('hesapCikisBtn')?.addEventListener('click',()=>{if(confirm('Hesabınızdan çıkış yapmak istediğinize emin misiniz?'))cikisYap()})});