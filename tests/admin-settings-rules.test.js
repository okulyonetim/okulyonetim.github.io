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
      await setDoc(doc(db, 'oy_roller', 'yoneticiRol'), { ad:'Yönetici', yetkiler:{} });
      await setDoc(doc(db, 'oy_roller', 'ogretmenRol'), { ad:'Öğretmen', yetkiler:{} });
      await setDoc(doc(db, 'oy_kullanicilar', 'adminUid'), { uid:'adminUid', admin:true, aktif:true });
      await setDoc(doc(db, 'oy_kullanicilar', 'managerUid'), { uid:'managerUid', admin:false, aktif:true, rolId:'yoneticiRol' });
      await setDoc(doc(db, 'oy_kullanicilar', 'teacherUid'), { uid:'teacherUid', admin:false, aktif:true, rolId:'ogretmenRol', bagliOgretmenId:'o1' });
      await setDoc(doc(db, 'oy_depolamaAyarlari', 'ayarlar'), { mesaj:{ aktif:true, MB:100 } });
      await setDoc(doc(db, 'oy_hatirlatmaAyarlari', 'ayarlar'), { gunSayisi:3, erteleSaat:4 });
      await setDoc(doc(db, 'oy_idariBilgiler', 'ayarlar'), { elektrikAboneNo:'123', uygulamaSifreleri:[{ ad:'Portal', kullaniciAdi:'okul', sifre:'gizli' }] });
    });

    const adminDb = testEnv.authenticatedContext('adminUid').firestore();
    const managerDb = testEnv.authenticatedContext('managerUid').firestore();
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

    // Gizli idari bilgiler: yalnız Admin + Yönetici.
    await assertSucceeds(getDoc(doc(adminDb, 'oy_idariBilgiler', 'ayarlar')));
    await assertSucceeds(getDoc(doc(managerDb, 'oy_idariBilgiler', 'ayarlar')));
    await assertFails(getDoc(doc(teacherDb, 'oy_idariBilgiler', 'ayarlar')));
    await assertFails(getDoc(doc(anonDb, 'oy_idariBilgiler', 'ayarlar')));
    await assertSucceeds(updateDoc(doc(managerDb, 'oy_idariBilgiler', 'ayarlar'), { suAboneNo:'456' }));
    await assertFails(updateDoc(doc(teacherDb, 'oy_idariBilgiler', 'ayarlar'), { suAboneNo:'999' }));

    console.log('Admin/Yönetici merkezi ayar güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
