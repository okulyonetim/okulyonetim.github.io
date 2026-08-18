const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  const testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules } });

  try {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'oy_roller', 'rol-editor'), { yetkiler:{ sistemAyarlari:'duzenle' } });
      await setDoc(doc(db, 'oy_roller', 'rol-viewer'), { yetkiler:{ sistemAyarlari:'goruntule' } });
      await setDoc(doc(db, 'oy_kullanicilar', 'editorUid'), { uid:'editorUid', admin:false, aktif:true, rolId:'rol-editor' });
      await setDoc(doc(db, 'oy_kullanicilar', 'viewerUid'), { uid:'viewerUid', admin:false, aktif:true, rolId:'rol-viewer' });
      await setDoc(doc(db, 'oy_kullanicilar', 'adminUid'), { uid:'adminUid', admin:true, aktif:true });
      await setDoc(doc(db, 'oy_dersSaatleri', 'ayarlar'), { dersler:[{baslangic:'08:30',bitis:'09:10'}], tatilModu:false });
    });

    const editorDb = testEnv.authenticatedContext('editorUid').firestore();
    const viewerDb = testEnv.authenticatedContext('viewerUid').firestore();
    const adminDb = testEnv.authenticatedContext('adminUid').firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewerDb, 'oy_dersSaatleri', 'ayarlar')));
    await assertFails(getDoc(doc(anonDb, 'oy_dersSaatleri', 'ayarlar')));
    await assertSucceeds(updateDoc(doc(editorDb, 'oy_dersSaatleri', 'ayarlar'), { tatilModu:true }));
    await assertFails(updateDoc(doc(viewerDb, 'oy_dersSaatleri', 'ayarlar'), { tatilModu:false }));
    await assertSucceeds(updateDoc(doc(adminDb, 'oy_dersSaatleri', 'ayarlar'), { tatilModu:false }));

    console.log('Ders saatleri rol güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
