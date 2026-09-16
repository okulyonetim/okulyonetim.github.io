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
  const wanted=all?'all':'self';if(mode===wanted)return true;if(preparing){await preparing;if(mode===wanted)return true;return prepare(all);}
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
function cikisYap(onayli=false){if(!onayli&&!confirm('Hesabınızdan çıkış yapmak istediğinize emin misiniz?'))return false;if(auth)auth.signOut().finally(()=>window.location.reload());else window.location.reload();return true;}

function _yardimciAuthAl(){if(!window._yardimciFirebaseApp)window._yardimciFirebaseApp=firebase.initializeApp(firebaseConfig,'yardimciOturum_'+Date.now());return window._yardimciFirebaseApp.auth();}
async function adminYeniKullaniciOlustur(kullaniciAdi,sifre,ekBilgiler){ekBilgiler=ekBilgiler||{};const email=kullaniciAdiEmaileDonustur(kullaniciAdi),yardimciAuth=_yardimciAuthAl(),cred=await yardimciAuth.createUserWithEmailAndPassword(email,sifre),uid=cred.user.uid,belge={uid,email,kullaniciAdi,ad:ekBilgiler.ad||kullaniciAdi,admin:!!ekBilgiler.admin,aktif:true,rolId:ekBilgiler.rolId||null,bagliOgretmenId:ekBilgiler.bagliOgretmenId||null,yetkiler:{},olusturmaTarihi:firebase.firestore.FieldValue.serverTimestamp()};await db.collection(COL.kullanicilar).doc(uid).set(belge);await yardimciAuth.signOut();return{uid,email};}
async function adminSifreSifirlaYeniHesapla(eskiKullaniciBelgesi,yeniKullaniciAdi,yeniSifre){const yeni=await adminYeniKullaniciOlustur(yeniKullaniciAdi,yeniSifre,{ad:eskiKullaniciBelgesi.ad||eskiKullaniciBelgesi.adSoyad||yeniKullaniciAdi,rolId:eskiKullaniciBelgesi.rolId,bagliOgretmenId:eskiKullaniciBelgesi.bagliOgretmenId,admin:eskiKullaniciBelgesi.admin});await db.collection(COL.kullanicilar).doc(eskiKullaniciBelgesi.id).update({aktif:false,sifreSifirlandiEskiHesap:true,yeniHesapUid:yeni.uid,yeniKullaniciAdi:yeniKullaniciAdi});return yeni;}
async function kendiSifremiDegistir(mevcutSifre,yeniSifre){const user=auth.currentUser;if(!user)throw new Error('oturum-yok');const cred=firebase.auth.EmailAuthProvider.credential(user.email,mevcutSifre);await user.reauthenticateWithCredential(cred);await user.updatePassword(yeniSifre);}

const PROFIL_FOTO_STORAGE_SDK='https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js';
const PROFIL_FOTO_TURLERI=new Set(['image/jpeg','image/png','image/webp']);
const PROFIL_FOTO_GIRIS_LIMITI=8*1024*1024;
async function profilFotoStorageHazirla(){
  if(window.storage)return window.storage;
  if(typeof window.firebase?.storage!=='function'){
    if(!window.AppLoader?.loadScript)throw new Error('Profil fotoğrafı yükleyicisi hazır değil.');
    await window.AppLoader.loadScript(PROFIL_FOTO_STORAGE_SDK);
  }
  const s=window.firebaseStorageHazirla?.()||window.storage;
  if(!s)throw new Error('Profil fotoğrafı depolama alanı açılamadı.');
  return s;
}
async function profilFotografiniHazirla(file){
  if(!file||!PROFIL_FOTO_TURLERI.has(String(file.type||'').toLowerCase()))throw new Error('JPG, PNG veya WEBP biçiminde bir fotoğraf seçin.');
  if(!file.size||file.size>PROFIL_FOTO_GIRIS_LIMITI)throw new Error('Fotoğraf en fazla 8 MB olabilir.');
  const objectUrl=URL.createObjectURL(file);
  try{
    const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Fotoğraf okunamadı.'));img.src=objectUrl});
    const w=Number(image.naturalWidth||image.width)||0,h=Number(image.naturalHeight||image.height)||0,edge=Math.min(w,h);
    if(!edge)throw new Error('Fotoğraf boyutları okunamadı.');
    const size=Math.max(1,Math.min(512,Math.round(edge))),canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Fotoğraf işlenemedi.');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const sx=Math.max(0,(w-edge)/2),sy=Math.max(0,(h-edge)/2);ctx.drawImage(image,sx,sy,edge,edge,0,0,size,size);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.86));
    if(!blob)throw new Error('Fotoğraf hazırlanamadı.');
    return blob;
  }finally{URL.revokeObjectURL(objectUrl)}
}
async function kendiProfilFotografimiGuncelle(file){
  const user=auth?.currentUser;if(!user?.uid)throw new Error('Aktif kullanıcı oturumu bulunamadı.');
  if(typeof navigator!=='undefined'&&navigator.onLine===false)throw new Error('Profil fotoğrafını değiştirmek için internet bağlantısı gerekiyor.');
  const blob=await profilFotografiniHazirla(file),storage=await profilFotoStorageHazirla(),path=`dokumanlar/${user.uid}/profil/profil`,ref=storage.ref(path);
  const snapshot=await ref.put(blob,{contentType:blob.type||'image/webp',customMetadata:{olusturanUid:user.uid,gorunurluk:'kisisel',tur:'profil-fotografi'}}),url=await snapshot.ref.getDownloadURL();
  await user.updateProfile({photoURL:url});
  const patch={photoURL:url,profilFotoUrl:url,profilFotoGuncellenmeTarihi:new Date().toISOString()};
  AKTIF_KULLANICI={...(AKTIF_KULLANICI||{}),...patch};window.AKTIF_KULLANICI=AKTIF_KULLANICI;window.AppStore?.set?.('session.user',AKTIF_KULLANICI);
  await authSessionCacheYaz(user.uid,AKTIF_KULLANICI,AKTIF_ROL);sidebarHesapGuncelle(user);
  return{url,path};
}
window.kendiProfilFotografimiGuncelle=kendiProfilFotografimiGuncelle;

function sidebarHesapGuncelle(user){
  const kutu=document.getElementById('sidebarHesap');if(!kutu)return;if(!user){kutu.style.display='none';return}kutu.style.display='flex';const avatar=document.getElementById('hesapAvatar'),ad=document.getElementById('hesapAd'),email=document.getElementById('hesapEmail'),bagliVarMi=!!(AKTIF_KULLANICI&&AKTIF_KULLANICI.bagliOgretmenId),ben=(typeof bagliOgretmenimGetir==='function')?bagliOgretmenimGetir():null,ogretmenlerYuklendiMi=typeof ogretmenler!=='undefined'&&ogretmenler.length>0;if(bagliVarMi&&!ben&&!ogretmenlerYuklendiMi)return;if(avatar)avatar.src=AKTIF_KULLANICI?.profilFotoUrl||AKTIF_KULLANICI?.photoURL||(ben&&ben.profilFotoUrl)||'assets/icon-192.png';if(ad)ad.textContent=ben?`${ben.ad||''} ${ben.soyad||''}`.trim():(AKTIF_KULLANICI?.ad||AKTIF_KULLANICI?.kullaniciAdi||'Kullanıcı');if(email)email.textContent=AKTIF_KULLANICI?.kullaniciAdi?'@'+AKTIF_KULLANICI.kullaniciAdi:(user.email||'');
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
  const kullanici={id:snap.id,...snap.data()};if(user.photoURL){kullanici.photoURL=user.photoURL;kullanici.profilFotoUrl=user.photoURL}let rol=null;
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

document.addEventListener('DOMContentLoaded',()=>{document.getElementById('hesapCikisBtn')?.addEventListener('click',()=>cikisYap())});

/* ========================= KULLANICI ŞİFRE YÖNETİMİ =========================
   Kullanıcı İşlemleri ekranındaki oluşturma/sıfırlama kontrollerini geri getirir.
   Firebase istemci SDK başka bir kullanıcının parolasını yerinde değiştiremediği için
   sıfırlama yeni bir giriş hesabı oluşturur; eski uygulama profili yalnız başarılı
   oluşturma sonrasında pasifleştirilir. Böylece başarısız denemede hesap kilitlenmez. */
(function(global){
'use strict';
if(global.__korukUserPasswordManagement)return;global.__korukUserPasswordManagement=true;
let activeEditUid='';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const notify=m=>{if(typeof global.toast==='function')global.toast(m);else alert(m)};
function canEditUsers(){return global.PermissionService?.can?.('settings.users','edit')===true||global.kullaniciYonetimiYetkisiVar?.()===true||global.AKTIF_KULLANICI?.admin===true}
function userById(id){return data('kullanicilar').find(x=>(x.id||x.uid)===id)||null}
function roleOptions(selected=''){return `<option value="">— Rol seçilmedi —</option>${data('roller').slice().sort((a,b)=>String(a.ad||a.rolAdi||'').localeCompare(String(b.ad||b.rolAdi||''),'tr')).map(r=>`<option value="${esc(r.id)}" ${r.id===selected?'selected':''}>${esc(r.ad||r.rolAdi||'Rol')}</option>`).join('')}`}
function teacherOptions(selected=''){return `<option value="">— Bağlantı yok —</option>${data('ogretmenler').slice().sort((a,b)=>`${a.ad||''} ${a.soyad||''}`.localeCompare(`${b.ad||''} ${b.soyad||''}`,'tr')).map(o=>`<option value="${esc(o.id)}" ${o.id===selected?'selected':''}>${esc(`${o.ad||''} ${o.soyad||''}`.trim())}</option>`).join('')}`}
function authMessage(err){const code=err?.code||'',m=err?.message||String(err||'');if(code==='auth/email-already-in-use')return'Bu kullanıcı adı Firebase giriş sisteminde zaten kayıtlı. Şifreyi sıfırlamak için yeni bir kullanıcı adı yazın (ör. hasret2).';if(code==='auth/weak-password')return'Şifre en az 6 karakter olmalıdır.';if(code==='auth/network-request-failed')return'Bu işlem için internet bağlantısı gerekiyor.';if(code==='auth/invalid-email')return'Kullanıcı adı geçerli bir giriş hesabına dönüştürülemedi.';return'İşlem tamamlanamadı: '+m}
function randomPassword(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';let s='';if(global.crypto?.getRandomValues){const a=new Uint32Array(10);crypto.getRandomValues(a);for(const n of a)s+=chars[n%chars.length]}else for(let i=0;i<10;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s}
function bindPasswordTools(root){root.querySelectorAll('[data-pw-toggle]').forEach(b=>b.onclick=()=>{const sel=b.dataset.pwToggle,inp=root.querySelector(sel);if(!inp)return;inp.type=inp.type==='password'?'text':'password';b.textContent=inp.type==='password'?'Göster':'Gizle'});root.querySelectorAll('[data-pw-generate]').forEach(b=>b.onclick=()=>{const target=root.querySelector(b.dataset.pwGenerate);if(!target)return;const value=randomPassword();target.value=value;const confirm=root.querySelector('[data-password-confirm]');if(confirm)confirm.value=value;target.type='text';const t=root.querySelector(`[data-pw-toggle="${b.dataset.pwGenerate}"]`);if(t)t.textContent='Gizle'})}
async function refreshUsers(){try{if(global.SyncEngine?.pull)await global.SyncEngine.pull(['kullanicilar'])}catch(e){console.warn('[Kullanıcı yenileme]',e?.message||e)}try{global.SettingsModule?.render?.()}catch(_){}}
function openCreateUser(){if(!canEditUsers())return;document.getElementById('userPasswordCreateModal')?.remove();const ov=document.createElement('div');ov.id='userPasswordCreateModal';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><strong>Yeni Kullanıcı Oluştur</strong><div class="ka-muted">Öğretmen için kullanıcı adı, şifre ve rol tanımlayın.</div></div><button class="ka-icon-button" type="button" data-close aria-label="Kapat">×</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Kullanıcı Adı</span><input data-new-username autocomplete="off" placeholder="örn. hasret"></label><label class="ka-field"><span class="ka-field__label">Şifre</span><div class="ka-row"><input data-new-password type="password" autocomplete="new-password" style="flex:1"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-pw-toggle="[data-new-password]">Göster</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-pw-generate="[data-new-password]">Üret</button></div></label><label class="ka-field"><span class="ka-field__label">Şifre Tekrar</span><input data-new-password-confirm data-password-confirm type="password" autocomplete="new-password"></label><label class="ka-field"><span class="ka-field__label">Rol</span><select data-new-role>${roleOptions('')}</select></label><label class="ka-field"><span class="ka-field__label">Bağlı Öğretmen Kaydı</span><select data-new-teacher>${teacherOptions('')}</select></label><label class="ka-check"><input type="checkbox" data-new-admin ${global.AKTIF_KULLANICI?.admin===true?'':'disabled'}> Süper Admin</label><div class="ka-muted">Şifre en az 6 karakter olmalıdır. Kullanıcı oluşturma çevrimiçi çalışır.</div></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-close>Vazgeç</button><button class="ka-btn" type="button" data-create>Kullanıcıyı Oluştur</button></div></section>`;document.body.appendChild(ov);ov.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>ov.remove());bindPasswordTools(ov);ov.querySelector('[data-create]').onclick=async()=>{const username=ov.querySelector('[data-new-username]')?.value.trim(),pw=ov.querySelector('[data-new-password]')?.value||'',confirm=ov.querySelector('[data-new-password-confirm]')?.value||'',teacherId=ov.querySelector('[data-new-teacher]')?.value||null,roleId=ov.querySelector('[data-new-role]')?.value||null;if(!username){notify('Kullanıcı adı girin.');return}if(pw.length<6){notify('Şifre en az 6 karakter olmalıdır.');return}if(pw!==confirm){notify('Şifreler eşleşmiyor.');return}const teacher=data('ogretmenler').find(x=>x.id===teacherId),btn=ov.querySelector('[data-create]');btn.disabled=true;btn.textContent='Oluşturuluyor…';try{await adminYeniKullaniciOlustur(username,pw,{ad:teacher?`${teacher.ad||''} ${teacher.soyad||''}`.trim():username,rolId:roleId,bagliOgretmenId:teacherId,admin:!!ov.querySelector('[data-new-admin]')?.checked});notify('Kullanıcı ve giriş şifresi oluşturuldu.');ov.remove();await refreshUsers()}catch(e){console.error('[Kullanıcı oluşturma]',e);notify(authMessage(e));btn.disabled=false;btn.textContent='Kullanıcıyı Oluştur'}};global.PermissionService?.apply?.(ov)}
function enhanceUsersPage(){if(!canEditUsers())return;const first=document.querySelector('[data-user-edit]'),section=first?.closest('section.ka-stack');if(!section||section.querySelector('[data-user-password-toolbar]'))return;const bar=document.createElement('div');bar.className='ka-row ka-row--between';bar.dataset.userPasswordToolbar='1';bar.innerHTML='<div><strong>Kullanıcı Hesapları</strong><div class="ka-muted">Yeni öğretmen hesabı ve giriş şifresi oluşturabilirsiniz.</div></div><button class="ka-btn" type="button" data-create-user-password>+ Yeni Kullanıcı</button>';section.insertBefore(bar,section.firstChild);bar.querySelector('[data-create-user-password]').onclick=openCreateUser}
function enhanceEditModal(){const ov=document.getElementById('userSettingsEditor');if(!ov||ov.querySelector('[data-user-password-panel]')||!activeEditUid||!canEditUsers())return;const u=userById(activeEditUid);if(!u)return;const body=ov.querySelector('.ka-modal__body');if(!body)return;const panel=document.createElement('div');panel.dataset.userPasswordPanel='1';panel.className='ka-stack';panel.innerHTML=`<div class="ka-row ka-row--between"><div><strong>Uygulama Giriş Şifresi</strong><div class="ka-muted">İlk şifreyi oluşturun veya kullanıcı için yeni giriş hesabı üretin.</div></div><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-reset-open>Şifre Oluştur / Sıfırla</button></div><div class="ka-card ka-hidden" data-reset-fields hidden><div class="ka-card__body ka-stack"><label class="ka-field"><span class="ka-field__label">Yeni Kullanıcı Adı</span><input data-reset-username value="${esc(u.kullaniciAdi||'')}" autocomplete="off"></label><label class="ka-field"><span class="ka-field__label">Yeni Şifre</span><div class="ka-row"><input data-reset-password type="password" autocomplete="new-password" style="flex:1"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-pw-toggle="[data-reset-password]">Göster</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-pw-generate="[data-reset-password]">Üret</button></div></label><label class="ka-field"><span class="ka-field__label">Şifre Tekrar</span><input data-reset-confirm data-password-confirm type="password" autocomplete="new-password"></label><div class="ka-muted">Aynı kullanıcı adı Firebase'de zaten varsa farklı bir kullanıcı adı seçmeniz gerekir. Başarılı işlemden sonra eski giriş profili pasifleştirilir.</div><button class="ka-btn" type="button" data-reset-save>Yeni Giriş Hesabını Oluştur</button></div></div>`;body.appendChild(panel);bindPasswordTools(panel);const fields=panel.querySelector('[data-reset-fields]');panel.querySelector('[data-reset-open]').onclick=()=>{const show=fields.hidden;fields.hidden=!show;fields.classList.toggle('ka-hidden',!show)};panel.querySelector('[data-reset-save]').onclick=async()=>{const username=panel.querySelector('[data-reset-username]')?.value.trim(),pw=panel.querySelector('[data-reset-password]')?.value||'',confirm=panel.querySelector('[data-reset-confirm]')?.value||'';if(!username){notify('Yeni kullanıcı adını girin.');return}if(pw.length<6){notify('Şifre en az 6 karakter olmalıdır.');return}if(pw!==confirm){notify('Şifreler eşleşmiyor.');return}const btn=panel.querySelector('[data-reset-save]');btn.disabled=true;btn.textContent='Oluşturuluyor…';try{await adminSifreSifirlaYeniHesapla({...u,id:u.id||u.uid},username,pw);notify('Yeni giriş hesabı ve şifre oluşturuldu. Eski profil pasifleştirildi.');ov.remove();await refreshUsers()}catch(e){console.error('[Şifre sıfırlama]',e);notify(authMessage(e));btn.disabled=false;btn.textContent='Yeni Giriş Hesabını Oluştur'}}}
function scan(){enhanceUsersPage();enhanceEditModal()}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-user-edit]');if(b)activeEditUid=b.dataset.userEdit||''},{capture:true});
const observer=new MutationObserver(scan);document.addEventListener('DOMContentLoaded',()=>{observer.observe(document.body,{childList:true,subtree:true});scan()});
global.KorukUserPasswordManagement={openCreateUser,scan};
})(window);
