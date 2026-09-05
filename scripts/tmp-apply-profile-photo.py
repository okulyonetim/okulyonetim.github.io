from pathlib import Path

# js/auth.js
auth=Path('js/auth.js')
a=auth.read_text(encoding='utf-8')
old="const kullanici={id:snap.id,...snap.data()};let rol=null;"
new="const kullanici={id:snap.id,...snap.data()};if(user.photoURL){kullanici.photoURL=user.photoURL;kullanici.profilFotoUrl=user.photoURL}let rol=null;"
assert old in a, 'auth server session marker missing'
a=a.replace(old,new,1)
old="async function kendiSifremiDegistir(mevcutSifre,yeniSifre){const user=auth.currentUser;if(!user)throw new Error('oturum-yok');const cred=firebase.auth.EmailAuthProvider.credential(user.email,mevcutSifre);await user.reauthenticateWithCredential(cred);await user.updatePassword(yeniSifre);}\n"
assert old in a, 'password API marker missing'
helper="""async function kendiSifremiDegistir(mevcutSifre,yeniSifre){const user=auth.currentUser;if(!user)throw new Error('oturum-yok');const cred=firebase.auth.EmailAuthProvider.credential(user.email,mevcutSifre);await user.reauthenticateWithCredential(cred);await user.updatePassword(yeniSifre);}

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
"""
a=a.replace(old,helper,1)
old="if(avatar)avatar.src=(ben&&ben.profilFotoUrl)||'assets/icon-192.png';"
new="if(avatar)avatar.src=AKTIF_KULLANICI?.profilFotoUrl||AKTIF_KULLANICI?.photoURL||(ben&&ben.profilFotoUrl)||'assets/icon-192.png';"
assert old in a, 'sidebar avatar marker missing'
a=a.replace(old,new,1)
auth.write_text(a,encoding='utf-8')

# js/core/shell-ui.js
shell=Path('js/core/shell-ui.js')
s=shell.read_text(encoding='utf-8')
old="function profileInfo(){const u=user(),t=linkedTeacher(),name=t?[t.ad,t.soyad].filter(Boolean).join(' '):profileName(u),role=t?.brans||profileRole(u),photo=t?.profilFotoUrl||t?.fotoUrl||u.profilFotoUrl||u.fotoUrl||'',username=u.kullaniciAdi?`@${u.kullaniciAdi}`:(u.email||'');return{u,t,name,role,photo,username}}"
new="function profileInfo(){const u=user(),t=linkedTeacher(),name=t?[t.ad,t.soyad].filter(Boolean).join(' '):profileName(u),role=t?.brans||profileRole(u),photo=u.profilFotoUrl||u.photoURL||u.fotoUrl||t?.profilFotoUrl||t?.fotoUrl||'',username=u.kullaniciAdi?`@${u.kullaniciAdi}`:(u.email||'');return{u,t,name,role,photo,username}}"
assert old in s, 'profileInfo marker missing'
s=s.replace(old,new,1)
marker="function renderProfile({remember=true}={}){"
assert marker in s, 'renderProfile marker missing'
photo_helper="""async function profilePhotoUpdate(file){
  if(!file)return;const root=$('#v2ModuleRoot'),buttons=$$('[data-profile-photo-pick]',root);buttons.forEach(b=>{b.disabled=true;b.setAttribute('aria-busy','true')});
  try{
    if(typeof global.kendiProfilFotografimiGuncelle!=='function')throw new Error('Profil fotoğrafı özelliği hazır değil.');
    await global.kendiProfilFotografimiGuncelle(file);global.toast?.('Profil fotoğrafınız güncellendi.');renderProfile({remember:false});
  }catch(e){console.error('[Profile/photo]',e);global.toast?.(e?.message||'Profil fotoğrafı güncellenemedi.');buttons.forEach(b=>{b.disabled=false;b.removeAttribute('aria-busy')})}
}
"""
s=s.replace(marker,photo_helper+marker,1)
old='''<article class="ka-profile-hero"><div class="ka-profile-avatar">${photo?`<img src="${esc(photo)}" alt="${esc(name)}">`:esc(initials||'K')}</div><div class="ka-profile-copy">'''
new='''<article class="ka-profile-hero"><div class="ka-profile-photo"><div class="ka-profile-avatar-wrap"><div class="ka-profile-avatar">${photo?`<img src="${esc(photo)}" alt="${esc(name)}">`:esc(initials||'K')}</div><button type="button" class="ka-profile-photo-edit" data-profile-photo-pick aria-label="Profil fotoğrafını ${photo?'değiştir':'ekle'}"><span aria-hidden="true">📷</span></button></div><button type="button" class="ka-profile-photo-label" data-profile-photo-pick>${photo?'Fotoğrafı Değiştir':'Fotoğraf Ekle'}</button><input type="file" accept="image/jpeg,image/png,image/webp" data-profile-photo-input hidden></div><div class="ka-profile-copy">'''
assert old in s, 'profile hero avatar marker missing'
s=s.replace(old,new,1)
old="  $$('[data-profile-view]',root).forEach(b=>b.addEventListener('click',()=>renderProfileDetail(b.dataset.profileView)));root.querySelector('[data-profile-logout]')?.addEventListener('click',()=>global.cikisYap?.())\n}"
new="""  $$('[data-profile-view]',root).forEach(b=>b.addEventListener('click',()=>renderProfileDetail(b.dataset.profileView)));root.querySelector('[data-profile-logout]')?.addEventListener('click',()=>global.cikisYap?.());
  const photoInput=root.querySelector('[data-profile-photo-input]');$$('[data-profile-photo-pick]',root).forEach(b=>b.addEventListener('click',()=>photoInput?.click()));if(photoInput)photoInput.addEventListener('change',()=>{const file=photoInput.files?.[0];photoInput.value='';if(file)profilePhotoUpdate(file)});
}"""
assert old in s, 'profile bind marker missing'
s=s.replace(old,new,1)
shell.write_text(s,encoding='utf-8')

# css/design-system.css
css=Path('css/design-system.css')
c=css.read_text(encoding='utf-8')
assert 'Profil fotoğrafı ekle/değiştir v1' not in c
styles="""
/* Profil fotoğrafı ekle/değiştir v1 */
.ka-profile-photo{position:relative;z-index:2;width:92px;display:grid;justify-items:center;gap:7px}.ka-profile-avatar-wrap{position:relative;width:92px;height:92px}.ka-profile-photo-edit{position:absolute;right:-6px;bottom:-6px;width:32px;height:32px;padding:0;border:2px solid rgba(255,255,255,.9);border-radius:50%;background:var(--ka-card-raised-bg);color:var(--ka-primary);box-shadow:0 5px 14px rgba(0,0,0,.22);display:grid;place-items:center;font-size:14px;line-height:1;cursor:pointer}.ka-profile-photo-label{appearance:none;width:92px;min-height:22px;padding:2px 3px;border:0;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font-size:8.6px;line-height:1.25;font-weight:850;cursor:pointer}.ka-profile-photo-edit:hover,.ka-profile-photo-label:hover{filter:brightness(1.08)}.ka-profile-photo-edit:focus-visible,.ka-profile-photo-label:focus-visible{outline:3px solid rgba(255,255,255,.48);outline-offset:2px}.ka-profile-photo-edit:disabled,.ka-profile-photo-label:disabled{opacity:.55;cursor:wait}.ka-profile-photo-edit[aria-busy="true"] span{animation:ka-profile-photo-busy .8s linear infinite}@keyframes ka-profile-photo-busy{to{transform:rotate(360deg)}}
@media(max-width:520px){.ka-profile-photo{width:78px;gap:6px}.ka-profile-avatar-wrap{width:78px;height:78px}.ka-profile-photo-label{width:78px;font-size:7.8px}.ka-profile-photo-edit{width:29px;height:29px;right:-5px;bottom:-5px;font-size:12px}}
@media(max-width:360px){.ka-profile-photo{width:68px}.ka-profile-avatar-wrap{width:68px;height:68px}.ka-profile-photo-label{width:68px;font-size:7.2px}.ka-profile-photo-edit{width:27px;height:27px}}
"""
c += styles
css.write_text(c,encoding='utf-8')

# cache/version contract
index=Path('index.html')
h=index.read_text(encoding='utf-8')
assert 'css/design-system.css?v=898' in h and 'js/core/shell-ui.js?v=880' in h
h=h.replace('css/design-system.css?v=898','css/design-system.css?v=899',1).replace('js/core/shell-ui.js?v=880','js/core/shell-ui.js?v=881',1)
index.write_text(h,encoding='utf-8')

swp=Path('service-worker.js')
sw=swp.read_text(encoding='utf-8')
assert "const CACHE_ADI='oy-cache-v903';" in sw
assert "'./css/design-system.css?v=898'" in sw and "'./js/core/shell-ui.js?v=880'" in sw
assert 'firebase-storage-compat.js' in sw
sw=sw.replace("const CACHE_ADI='oy-cache-v903';","const CACHE_ADI='oy-cache-v904';",1).replace("'./css/design-system.css?v=898'","'./css/design-system.css?v=899'",1).replace("'./js/core/shell-ui.js?v=880'","'./js/core/shell-ui.js?v=881'",1)
swp.write_text(sw,encoding='utf-8')

# Storage ownership emulator regression
storage_test=Path('tests/storage-rules.test.js')
st=storage_test.read_text(encoding='utf-8')
anchor="    // Duyuru görsellerinde artık rol güvenliği var: admin/yetkili yazar,\n"
assert anchor in st
addition="""    // Profil fotoğrafı mevcut dokumanlar/{uid} kişisel Storage alanında tutulur.
    // Kullanıcı ekleyip değiştirebilir; başka kullanıcı aynı objeyi okuyamaz/yazamaz.
    const profileRef = ref(teacherStorage, 'dokumanlar/teacherUid/profil/profil');
    const profileMeta = { contentType:'image/webp', customMetadata:{ olusturanUid:'teacherUid', gorunurluk:'kisisel', tur:'profil-fotografi' } };
    await assertSucceeds(uploadBytes(profileRef, new Uint8Array([1,2,3,4]), profileMeta));
    await assertSucceeds(uploadBytes(profileRef, new Uint8Array([5,6,7,8]), profileMeta));
    await assertSucceeds(getBytes(profileRef));
    await assertFails(getBytes(ref(teacher2Storage, 'dokumanlar/teacherUid/profil/profil')));
    await assertFails(uploadBytes(ref(teacher2Storage, 'dokumanlar/teacherUid/profil/profil'), new Uint8Array([9]), { contentType:'image/webp', customMetadata:{ olusturanUid:'teacherUid', gorunurluk:'kisisel', tur:'profil-fotografi' } }));

"""
st=st.replace(anchor,addition+anchor,1)
storage_test.write_text(st,encoding='utf-8')

# Focused static regression
test=Path('tests/profile-photo.test.js')
assert not test.exists(), 'profile photo test already exists'
test.write_text("""const fs=require('fs');
const assert=require('assert');
const auth=fs.readFileSync('js/auth.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const rules=fs.readFileSync('storage.rules','utf8');
new Function(auth);new Function(shell);new Function(sw);
assert(auth.includes(\"const PROFIL_FOTO_STORAGE_SDK='https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js'\"),'Profil fotoğrafı Storage SDK lazy kaynağını kullanmalı.');
assert(auth.includes('await window.AppLoader.loadScript(PROFIL_FOTO_STORAGE_SDK)'),'Storage SDK yalnız fotoğraf işleminde lazy yüklenmeli.');
assert(auth.includes(\"new Set(['image/jpeg','image/png','image/webp'])\")&&auth.includes('8*1024*1024'),'Profil fotoğrafı tip ve giriş boyutu doğrulanmalı.');
assert(auth.includes('Math.min(512')&&auth.includes(\"canvas.toBlob(resolve,'image/webp',.86)\"),'Fotoğraf cihazda kare/512px WEBP olarak küçültülmeli.');
assert(auth.includes('path=`dokumanlar/${user.uid}/profil/profil`'),'Profil fotoğrafı mevcut kullanıcıya ait korumalı Storage yoluna yazılmalı.');
assert(auth.includes(\"customMetadata:{olusturanUid:user.uid,gorunurluk:'kisisel',tur:'profil-fotografi'}\"),'Profil objesi kişisel sahiplik metadatasıyla yazılmalı.');
assert(auth.includes('await user.updateProfile({photoURL:url})'),'Kalıcı profil fotoğrafı Firebase Auth kullanıcısına bağlanmalı.');
assert(auth.includes(\"window.AppStore?.set?.('session.user',AKTIF_KULLANICI)\")&&auth.includes('authSessionCacheYaz(user.uid,AKTIF_KULLANICI,AKTIF_ROL)'),'Fotoğraf anında session ve offline auth cache içine yansıtılmalı.');
const info=shell.match(/function profileInfo\\(\\)[\\s\\S]*?return\\{u,t,name,role,photo,username\\}\\}/)?.[0]||'';
assert(info.indexOf('u.profilFotoUrl')>=0&&info.indexOf('u.profilFotoUrl')<info.indexOf('t?.profilFotoUrl'),'Kullanıcının seçtiği fotoğraf bağlı öğretmen fotoğrafından öncelikli olmalı.');
for(const token of ['data-profile-photo-pick','data-profile-photo-input','accept=\"image/jpeg,image/png,image/webp\"','profilePhotoUpdate(file)','kendiProfilFotografimiGuncelle'])assert(shell.includes(token),`Profil fotoğrafı UI sözleşmesi eksik: ${token}`);
assert(!/\\bdb\\s*\\.\\s*collection\\s*\\(/.test(shell)&&!shell.includes('firebase.firestore'),'Shell UI doğrudan Firestore yazmamalı.');
for(const token of ['.ka-profile-photo{','.ka-profile-photo-edit{','.ka-profile-photo-label{','Profil fotoğrafı ekle/değiştir v1'])assert(css.includes(token),`Profil fotoğrafı stili eksik: ${token}`);
assert(rules.includes('match /dokumanlar/{sahipUid}/{dosyaYolu=**}')&&rules.includes('request.auth.uid == sahipUid'),'Profil fotoğrafının kullandığı Storage yolu sahiplik kuralıyla korunmalı.');
assert(sw.includes('firebase-storage-compat.js'),'Firebase Storage SDK offline kabukta tutulmalı.');
assert(index.includes('css/design-system.css?v=899')&&index.includes('js/core/shell-ui.js?v=881'),'Yeni profil fotoğrafı UI sürümleri index tarafından zorlanmalı.');
assert(sw.includes(\"const CACHE_ADI='oy-cache-v904';\")&&sw.includes(\"'./css/design-system.css?v=899'\")&&sw.includes(\"'./js/core/shell-ui.js?v=881'\"),'PWA cache yeni profil fotoğrafı sürümünü taşımalı.');
console.log('Kullanıcı profil fotoğrafı ekle/değiştir sözleşmesi başarılı.');
""",encoding='utf-8')

print('Profile photo patch applied.')
