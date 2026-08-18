const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main() {
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });

  try {
    await testEnv.clearFirestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'oy_kullanicilar', 'adminUid'), {
        uid: 'adminUid', admin: true, aktif: true, bagliOgretmenId: 'ogretmenAdmin'
      });
      await setDoc(doc(db, 'oy_kullanicilar', 'teacherUid'), {
        uid: 'teacherUid', admin: false, aktif: true, rolId: 'ogretmen', bagliOgretmenId: 'ogretmen42'
      });
    });

    const adminDb = testEnv.authenticatedContext('adminUid').firestore();
    const teacherDb = testEnv.authenticatedContext('teacherUid').firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();

    // Girişsiz erişim kapalı kalmalı.
    await assertFails(getDoc(doc(anonDb, 'oy_notlar', 'n1')));

    // Mevcut genel modül davranışı korunmalı: giriş yapmış kullanıcı normal koleksiyona yazabilmeli.
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_notlar', 'n1'), { metin: 'test' }));

    // Rol yönetimi: normal kullanıcı yazamaz, admin yazabilir.
    await assertFails(setDoc(doc(teacherDb, 'oy_roller', 'rol-test'), { ad: 'Test Rol' }));
    await assertSucceeds(setDoc(doc(adminDb, 'oy_roller', 'rol-test'), { ad: 'Test Rol' }));

    // Kullanıcı yönetimi: normal kullanıcı başka hesap kaydını değiştiremez.
    await assertFails(setDoc(doc(teacherDb, 'oy_kullanicilar', 'baskaUid'), { admin: true }));

    // İstatistik: kullanıcı yalnız kendi belgesine yazabilmeli.
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_kullaniciIstatistikleri', 'teacherUid'), { giris: 1 }));
    await assertFails(setDoc(doc(teacherDb, 'oy_kullaniciIstatistikleri', 'adminUid'), { giris: 999 }));

    // Öğretmen yıllık plan seçimi: bağlı öğretmen ID'si korunmalı.
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_ogretmenYillikPlanSecimleri', 'ogretmen42'), { planlar: ['p1'] }));
    await assertFails(setDoc(doc(teacherDb, 'oy_ogretmenYillikPlanSecimleri', 'baskaOgretmen'), { planlar: ['p1'] }));

    console.log('Firestore Rules testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
