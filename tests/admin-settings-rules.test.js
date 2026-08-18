const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  const testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules } });

  try {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'oy_kullanicilar', 'adminUid'), { uid:'adminUid', admin:true, aktif:true });
      await setDoc(doc(db, 'oy_kullanicilar', 'teacherUid'), { uid:'teacherUid', admin:false, aktif:true });
      await setDoc(doc(db, 'oy_depolamaAyarlari', 'ayarlar'), { mesaj:{ aktif:true, MB:100 } });
      await setDoc(doc(db, 'oy_hatirlatmaAyarlari', 'ayarlar'), { gunSayisi:3, erteleSaat:4 });
    });

    const adminDb = testEnv.authenticatedContext('adminUid').firestore();
    const teacherDb = testEnv.authenticatedContext('teacherUid').firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(teacherDb, 'oy_depolamaAyarlari', 'ayarlar')));
    await assertSucceeds(getDoc(doc(teacherDb, 'oy_hatirlatmaAyarlari', 'ayarlar')));
    await assertFails(getDoc(doc(anonDb, 'oy_depolamaAyarlari', 'ayarlar')));

    await assertFails(updateDoc(doc(teacherDb, 'oy_depolamaAyarlari', 'ayarlar'), { 'mesaj.MB': 500 }));
    await assertFails(updateDoc(doc(teacherDb, 'oy_hatirlatmaAyarlari', 'ayarlar'), { gunSayisi: 30 }));
    await assertFails(setDoc(doc(teacherDb, 'oy_depolamaAyarlari', 'yeni'), { mesaj:{ aktif:false, MB:1 } }));
    await assertFails(deleteDoc(doc(teacherDb, 'oy_hatirlatmaAyarlari', 'ayarlar')));

    await assertSucceeds(updateDoc(doc(adminDb, 'oy_depolamaAyarlari', 'ayarlar'), { 'mesaj.MB': 500 }));
    await assertSucceeds(updateDoc(doc(adminDb, 'oy_hatirlatmaAyarlari', 'ayarlar'), { gunSayisi: 7 }));

    console.log('Admin merkezi ayar güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
