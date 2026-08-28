from pathlib import Path
import re

AUTH=Path('js/auth.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

auth=AUTH.read_text()
test=TEST.read_text()

pattern=re.compile(r"function authDinleyiciKur\(\)\{.*?\n\}\n\nasync function sifremiDegistirTikla",re.S)
if not pattern.search(auth):
    raise SystemExit('authDinleyiciKur contract not found')

replacement=r'''let authSessionActivated=false;
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
  window.AppLoader?.syncLegacySession?.();
  if(!authSessionActivated){authSessionActivated=true;IstatistikService.girisKaydet();if(typeof KonumGirisService!=='undefined')KonumGirisService.kaydet();if(typeof uygulamaBaslat==='function')uygulamaBaslat();if(typeof window._navVerileriniYukle==='function')window._navVerileriniYukle();try{if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PullToRefreshPlugin)window.Capacitor.Plugins.PullToRefreshPlugin.appHazir()}catch(e){}}
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

async function sifremiDegistirTikla'''
auth=pattern.sub(replacement,auth,count=1)
AUTH.write_text(auth)

assertion="""
assert(shell.includes('js/auth.js'),'Auth runtime production shell içinde bulunmalı.');
const authSrc=fs.readFileSync('js/auth.js','utf8');
assert(authSrc.includes("KorukLocalFirst.meta(uid,'authSession'")&&authSrc.includes('authSessionCacheOku(user.uid)'),'Aktif kullanıcı/rol snapshotı IndexedDB meta üzerinden local-first restore edilmeli.');
assert(authSrc.includes('authOturumuUygula(user,cached.user,cached.role,{cached:true})'),'Firebase Auth UID doğrulandıktan sonra cihazdaki oturum Firestore beklenmeden uygulanmalı.');
assert(authSrc.includes('await authSunucuOturumuGetir(user,cached)'),'Firestore kullanıcı/rol kontrolü local restore sonrasında arka plan tazelemesi olarak sürmeli.');
assert(authSrc.includes("'Bu cihazda çevrimdışı oturum verisi bulunmuyor. İlk açılış için internet bağlantısı gerekir.'"),'İlk kez açılan cihaz çevrimdışıysa sahte oturum üretmemeli.');
"""
if "authSessionCacheOku(user.uid)" not in test:
    test += assertion
TEST.write_text(test)
