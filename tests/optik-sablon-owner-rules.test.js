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
      await setDoc(doc(db,'oy_kullanicilar','ownerUid'),{uid:'ownerUid',admin:false,aktif:true});
      await setDoc(doc(db,'oy_kullanicilar','otherUid'),{uid:'otherUid',admin:false,aktif:true});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_optikSablonlar','adminPublic'),{
        formId:'admin-form',formSurumu:1,ad:'Admin Şablonu',sahipUid:'adminUid',sahipAdi:'Admin',herkeseAcik:true,icerikBase64:'AA=='
      });
    });

    const owner = env.authenticatedContext('ownerUid').firestore();
    const other = env.authenticatedContext('otherUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    // Kullanıcı kendi özel formunu oluşturabilir; başka UID adına veya herkese açık oluşturamaz.
    await assertSucceeds(setDoc(doc(owner,'oy_optikSablonlar','ownerPrivate'),{
      formId:'owner-form',formSurumu:1,ad:'Kendi Formum',sahipUid:'ownerUid',sahipAdi:'Owner',herkeseAcik:false,icerikBase64:'AA=='
    }));
    await assertFails(setDoc(doc(owner,'oy_optikSablonlar','spoof'),{
      formId:'spoof',formSurumu:1,ad:'Sahte',sahipUid:'otherUid',herkeseAcik:false,icerikBase64:'AA=='
    }));
    await assertFails(setDoc(doc(owner,'oy_optikSablonlar','ownerPublic'),{
      formId:'owner-public',formSurumu:1,ad:'Yetkisiz Yayın',sahipUid:'ownerUid',herkeseAcik:true,icerikBase64:'AA=='
    }));

    // Giriş yapan kullanıcı katalog kayıtlarını okuyabilir; anonim kullanıcı okuyamaz.
    await assertSucceeds(getDoc(doc(other,'oy_optikSablonlar','adminPublic')));
    await assertFails(getDoc(doc(anon,'oy_optikSablonlar','adminPublic')));

    // Kullanıcı kendi formunu düzenleyip silebilir ama herkese açık yapamaz.
    await assertSucceeds(updateDoc(doc(owner,'oy_optikSablonlar','ownerPrivate'),{ad:'Kendi Formum Güncel'}));
    await assertFails(updateDoc(doc(owner,'oy_optikSablonlar','ownerPrivate'),{herkeseAcik:true}));

    // Adminin herkese açık şablonu diğer kullanıcı için salt okunurdur.
    await assertFails(updateDoc(doc(other,'oy_optikSablonlar','adminPublic'),{ad:'Yetkisiz Düzenleme'}));
    await assertFails(deleteDoc(doc(other,'oy_optikSablonlar','adminPublic')));

    // Admin yayınlama durumunu ve tüm kayıtları yönetebilir.
    await assertSucceeds(updateDoc(doc(admin,'oy_optikSablonlar','ownerPrivate'),{herkeseAcik:true}));
    await assertSucceeds(updateDoc(doc(admin,'oy_optikSablonlar','adminPublic'),{herkeseAcik:false}));
    await assertSucceeds(deleteDoc(doc(owner,'oy_optikSablonlar','ownerPrivate')));
    await assertSucceeds(deleteDoc(doc(admin,'oy_optikSablonlar','adminPublic')));

    console.log('Optik şablon sahiplik ve admin yayınlama testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
