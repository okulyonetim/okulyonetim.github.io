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
      await setDoc(doc(db,'oy_roller','test-viewer'),{yetkiler:{testSonuclari:'goruntule'}});
      await setDoc(doc(db,'oy_roller','test-hidden'),{yetkiler:{testSonuclari:'gizle'}});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'test-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','hiddenUid'),{uid:'hiddenUid',admin:false,aktif:true,rolId:'test-hidden'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_testSonuclari','s1'),{ad:'Test 1',tarih:'2026-08-18'});
    });

    const viewer = env.authenticatedContext('viewerUid').firestore();
    const hidden = env.authenticatedContext('hiddenUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_testSonuclari','s1')));
    await assertFails(getDoc(doc(anon,'oy_testSonuclari','s1')));
    await assertSucceeds(setDoc(doc(viewer,'oy_testSonuclari','s2'),{ad:'Test 2',tarih:'2026-08-19'}));
    await assertSucceeds(updateDoc(doc(viewer,'oy_testSonuclari','s1'),{ad:'Güncel Test'}));
    await assertSucceeds(deleteDoc(doc(viewer,'oy_testSonuclari','s1')));
    await assertFails(setDoc(doc(hidden,'oy_testSonuclari','s3'),{ad:'Yetkisiz'}));
    await assertSucceeds(setDoc(doc(admin,'oy_testSonuclari','s4'),{ad:'Admin Test'}));

    console.log('Test Sonuçları rol güvenliği testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
