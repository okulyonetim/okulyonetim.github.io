const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc } = require('firebase/firestore');
const { ref, uploadBytes, getBytes, deleteObject, updateMetadata } = require('firebase/storage');

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

    // Mesaj dosyaları mevcut katılımcı güvenliğini korur.
    await assertSucceeds(uploadBytes(ref(teacherStorage, 'mesajDosyalari/k1/test.pdf'), pdfData, { contentType:'application/pdf' }));
    await assertSucceeds(getBytes(ref(teacher2Storage, 'mesajDosyalari/k1/test.pdf')));
    await assertFails(getBytes(ref(outsiderStorage, 'mesajDosyalari/k1/test.pdf')));
    await assertSucceeds(getBytes(ref(adminStorage, 'mesajDosyalari/k1/test.pdf')));
    await assertFails(getBytes(ref(anonStorage, 'mesajDosyalari/k1/test.pdf')));
    await assertFails(uploadBytes(ref(outsiderStorage, 'mesajDosyalari/k1/sahte.pdf'), pdfData, { contentType:'application/pdf' }));
    await assertFails(uploadBytes(ref(teacherStorage, 'mesajDosyalari/k1/sahte.exe'), new Uint8Array([1,2,3]), { contentType:'application/octet-stream' }));

    // Yeni doküman yolu: sahibi kendi kişisel dosyasını yükleyebilir.
    const privateRef = ref(teacherStorage, 'dokumanlar/teacherUid/ozel.pdf');
    await assertSucceeds(uploadBytes(privateRef, pdfData, {
      contentType:'application/pdf',
      customMetadata:{ olusturanUid:'teacherUid', gorunurluk:'kisisel' }
    }));
    await assertSucceeds(getBytes(privateRef));
    await assertFails(getBytes(ref(teacher2Storage, 'dokumanlar/teacherUid/ozel.pdf')));
    await assertSucceeds(getBytes(ref(adminStorage, 'dokumanlar/teacherUid/ozel.pdf')));
    await assertFails(getBytes(ref(anonStorage, 'dokumanlar/teacherUid/ozel.pdf')));

    // Normal kullanıcı başkasının yoluna yükleyemez ve kendi dosyasını
    // doğrudan 'herkes' yapamaz.
    await assertFails(uploadBytes(ref(teacherStorage, 'dokumanlar/teacher2Uid/sahte.pdf'), pdfData, {
      contentType:'application/pdf', customMetadata:{ olusturanUid:'teacher2Uid', gorunurluk:'kisisel' }
    }));
    await assertFails(uploadBytes(ref(teacherStorage, 'dokumanlar/teacherUid/acik-sahte.pdf'), pdfData, {
      contentType:'application/pdf', customMetadata:{ olusturanUid:'teacherUid', gorunurluk:'herkes' }
    }));
    await assertFails(updateMetadata(privateRef, { customMetadata:{ olusturanUid:'teacherUid', gorunurluk:'herkes' } }));

    // Admin herkese açık dosya yükleyebilir; tüm girişli kullanıcılar okuyabilir.
    const publicRefAdmin = ref(adminStorage, 'dokumanlar/adminUid/acik.pdf');
    await assertSucceeds(uploadBytes(publicRefAdmin, pdfData, {
      contentType:'application/pdf', customMetadata:{ olusturanUid:'adminUid', gorunurluk:'herkes' }
    }));
    await assertSucceeds(getBytes(ref(teacherStorage, 'dokumanlar/adminUid/acik.pdf')));
    await assertSucceeds(getBytes(ref(outsiderStorage, 'dokumanlar/adminUid/acik.pdf')));

    // Admin özel bir dosyanın Storage görünürlüğünü değiştirebilir.
    await assertSucceeds(updateMetadata(ref(adminStorage, 'dokumanlar/teacherUid/ozel.pdf'), {
      customMetadata:{ olusturanUid:'teacherUid', gorunurluk:'herkes' }
    }));
    await assertSucceeds(getBytes(ref(teacher2Storage, 'dokumanlar/teacherUid/ozel.pdf')));

    // Legacy tek-segment yolu mevcut dosyaları kırmamak için çalışmaya devam eder.
    await assertSucceeds(uploadBytes(ref(teacherStorage, 'dokumanlar/legacy.pdf'), pdfData, { contentType:'application/pdf' }));
    await assertSucceeds(getBytes(ref(teacher2Storage, 'dokumanlar/legacy.pdf')));

    // Profil fotoğrafı mevcut dokumanlar/{uid} kişisel Storage alanında tutulur.
    // Kullanıcı ekleyip değiştirebilir; başka kullanıcı aynı objeyi okuyamaz/yazamaz.
    const profileRef = ref(teacherStorage, 'dokumanlar/teacherUid/profil/profil');
    const profileMeta = { contentType:'image/webp', customMetadata:{ olusturanUid:'teacherUid', gorunurluk:'kisisel', tur:'profil-fotografi' } };
    await assertSucceeds(uploadBytes(profileRef, new Uint8Array([1,2,3,4]), profileMeta));
    await assertSucceeds(uploadBytes(profileRef, new Uint8Array([5,6,7,8]), profileMeta));
    await assertSucceeds(getBytes(profileRef));
    await assertFails(getBytes(ref(teacher2Storage, 'dokumanlar/teacherUid/profil/profil')));
    await assertFails(uploadBytes(ref(teacher2Storage, 'dokumanlar/teacherUid/profil/profil'), new Uint8Array([9]), { contentType:'image/webp', customMetadata:{ olusturanUid:'teacherUid', gorunurluk:'kisisel', tur:'profil-fotografi' } }));

    // Duyuru görsellerinde artık rol güvenliği var: admin/yetkili yazar,
    // sıradan girişli kullanıcı yalnız okur, anonim erişemez.
    await assertSucceeds(uploadBytes(ref(adminStorage, 'duyurular/test.png'), new Uint8Array([1,2,3]), { contentType:'image/png' }));
    await assertSucceeds(getBytes(ref(teacherStorage, 'duyurular/test.png')));
    await assertFails(uploadBytes(ref(teacherStorage, 'duyurular/yetkisiz.png'), new Uint8Array([1,2,3]), { contentType:'image/png' }));
    await assertFails(uploadBytes(ref(anonStorage, 'duyurular/anon.png'), new Uint8Array([1,2,3]), { contentType:'image/png' }));

    await assertSucceeds(deleteObject(ref(teacherStorage, 'mesajDosyalari/k1/test.pdf')));
    await assertSucceeds(deleteObject(ref(adminStorage, 'dokumanlar/teacherUid/ozel.pdf')));
    await assertSucceeds(deleteObject(ref(adminStorage, 'duyurular/test.png')));

    console.log('Storage Rules testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
