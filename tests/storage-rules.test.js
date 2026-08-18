const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc } = require('firebase/firestore');
const { ref, uploadBytes, getBytes, deleteObject } = require('firebase/storage');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');
  const storageRules = fs.readFileSync('storage.rules', 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: firestoreRules },
    storage: { rules: storageRules },
  });

  try {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'oy_kullanicilar', 'adminUid'), { uid:'adminUid', admin:true, aktif:true });
      await setDoc(doc(db, 'oy_kullanicilar', 'teacherUid'), { uid:'teacherUid', admin:false, aktif:true });
      await setDoc(doc(db, 'oy_kullanicilar', 'teacher2Uid'), { uid:'teacher2Uid', admin:false, aktif:true });
      await setDoc(doc(db, 'oy_kullanicilar', 'outsiderUid'), { uid:'outsiderUid', admin:false, aktif:true });
      await setDoc(doc(db, 'oy_konusmalar', 'k1'), { katilimciUidler:['teacherUid','teacher2Uid'], grupMu:false });
    });

    const teacherStorage = testEnv.authenticatedContext('teacherUid').storage();
    const teacher2Storage = testEnv.authenticatedContext('teacher2Uid').storage();
    const outsiderStorage = testEnv.authenticatedContext('outsiderUid').storage();
    const adminStorage = testEnv.authenticatedContext('adminUid').storage();
    const anonStorage = testEnv.unauthenticatedContext().storage();

    const pdfData = new Uint8Array([37,80,68,70,45,49,46,52]);
    await assertSucceeds(uploadBytes(ref(teacherStorage, 'mesajDosyalari/k1/test.pdf'), pdfData, { contentType:'application/pdf' }));
    await assertSucceeds(getBytes(ref(teacher2Storage, 'mesajDosyalari/k1/test.pdf')));
    await assertFails(getBytes(ref(outsiderStorage, 'mesajDosyalari/k1/test.pdf')));
    await assertSucceeds(getBytes(ref(adminStorage, 'mesajDosyalari/k1/test.pdf')));
    await assertFails(getBytes(ref(anonStorage, 'mesajDosyalari/k1/test.pdf')));

    await assertFails(uploadBytes(ref(outsiderStorage, 'mesajDosyalari/k1/sahte.pdf'), pdfData, { contentType:'application/pdf' }));
    await assertFails(uploadBytes(ref(teacherStorage, 'mesajDosyalari/k1/sahte.exe'), new Uint8Array([1,2,3]), { contentType:'application/octet-stream' }));

    await assertSucceeds(uploadBytes(ref(teacherStorage, 'duyurular/test.png'), new Uint8Array([1,2,3]), { contentType:'image/png' }));
    await assertFails(uploadBytes(ref(anonStorage, 'duyurular/anon.png'), new Uint8Array([1,2,3]), { contentType:'image/png' }));
    await assertSucceeds(deleteObject(ref(teacherStorage, 'mesajDosyalari/k1/test.pdf')));

    console.log('Storage Rules testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
