const fs = require('fs');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db,'oy_roller','optik-editor'),{yetkiler:{optikFormOlusturma:'duzenle'}});
      await setDoc(doc(db,'oy_roller','optik-viewer'),{yetkiler:{optikFormOlusturma:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','ownerUid'),{uid:'ownerUid',admin:false,aktif:true,rolId:'optik-editor'});
      await setDoc(doc(db,'oy_kullanicilar','otherUid'),{uid:'otherUid',admin:false,aktif:true,rolId:'optik-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'optik-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_optikSablonlari','owned'),{ad:'Yayınlanan Form',durum:'yayinda',sahipUid:'ownerUid',sablon:'{}'});
      await setDoc(doc(db,'oy_optikSablonlari','legacy'),{ad:'Eski Form',durum:'yayinda',sablon:'{}'});
    });

    const owner = env.authenticatedContext('ownerUid').firestore();
    const other = env.authenticatedContext('otherUid').firestore();
    const viewer = env.authenticatedContext('viewerUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    // Yayındaki şablonlar giriş yapan kullanıcıların Yeni Sınav akışında okunabilir.
    await assertSucceeds(getDoc(doc(viewer,'oy_optikSablonlari','owned')));
    await assertFails(getDoc(doc(anon,'oy_optikSablonlari','owned')));

    // Yeni Firestore kaydı yalnız yayın durumunda, kendi sahipUid'siyle ve düzenleme yetkisiyle açılabilir.
    await assertSucceeds(setDoc(doc(owner,'oy_optikSablonlari','newOwned'),{ad:'Yeni Form',durum:'yayinda',sahipUid:'ownerUid',sablon:'{}'}));
    await assertFails(setDoc(doc(owner,'oy_optikSablonlari','spoof'),{ad:'Sahte Sahip',durum:'yayinda',sahipUid:'otherUid',sablon:'{}'}));
    await assertFails(setDoc(doc(owner,'oy_optikSablonlari','draft'),{ad:'Taslak',durum:'taslak',sahipUid:'ownerUid',sablon:'{}'}));
    await assertFails(setDoc(doc(viewer,'oy_optikSablonlari','viewerWrite'),{ad:'Yetkisiz',durum:'yayinda',sahipUid:'viewerUid',sablon:'{}'}));

    // Sahibi+editör kendi yayınını yönetebilir; başka editör yönetemez ve sahiplik değiştirilemez.
    await assertSucceeds(updateDoc(doc(owner,'oy_optikSablonlari','owned'),{ad:'Güncel Form'}));
    await assertFails(updateDoc(doc(other,'oy_optikSablonlari','owned'),{ad:'Başkasının Formu'}));
    await assertFails(updateDoc(doc(owner,'oy_optikSablonlari','owned'),{sahipUid:'otherUid'}));
    await assertSucceeds(deleteDoc(doc(owner,'oy_optikSablonlari','owned')));

    // Sahipsiz legacy kayıtlar normal kullanıcı tarafından sahiplenilemez; admin yönetebilir.
    await assertFails(updateDoc(doc(owner,'oy_optikSablonlari','legacy'),{sahipUid:'ownerUid'}));
    await assertSucceeds(updateDoc(doc(admin,'oy_optikSablonlari','legacy'),{ad:'Admin Güncelledi'}));
    await assertSucceeds(deleteDoc(doc(admin,'oy_optikSablonlari','legacy')));

    console.log('Optik şablon rol ve sahiplik testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
