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
      await setDoc(doc(db,'oy_roller','deneme-viewer'),{yetkiler:{denemeSonuclari:'goruntule'}});
      await setDoc(doc(db,'oy_roller','deneme-hidden'),{yetkiler:{denemeSonuclari:'gizle'}});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'deneme-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','hiddenUid'),{uid:'hiddenUid',admin:false,aktif:true,rolId:'deneme-hidden'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_denemeSonuclari','s1'),{ad:'Deneme 1',tarih:'2026-08-18'});
    });

    const viewer = env.authenticatedContext('viewerUid').firestore();
    const hidden = env.authenticatedContext('hiddenUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_denemeSonuclari','s1')));
    await assertFails(getDoc(doc(anon,'oy_denemeSonuclari','s1')));
    // Mevcut ürün kararı: modülü görebilen öğretmen sınav sonuçlarını yazabilir.
    await assertSucceeds(setDoc(doc(viewer,'oy_denemeSonuclari','s2'),{ad:'Deneme 2',tarih:'2026-08-19'}));
    await assertSucceeds(updateDoc(doc(viewer,'oy_denemeSonuclari','s1'),{ad:'Güncel Deneme'}));
    await assertSucceeds(deleteDoc(doc(viewer,'oy_denemeSonuclari','s1')));
    await assertFails(setDoc(doc(hidden,'oy_denemeSonuclari','s3'),{ad:'Yetkisiz'}));
    await assertSucceeds(setDoc(doc(admin,'oy_denemeSonuclari','s4'),{ad:'Admin Deneme'}));

    console.log('Deneme Sonuçları rol güvenliği testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
