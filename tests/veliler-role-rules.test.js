const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const testEnv = await initializeTestEnvironment({ projectId:PROJECT_ID, firestore:{rules} });
  try {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db,'oy_roller','rol-editor'),{yetkiler:{siniflar:'duzenle'}});
      await setDoc(doc(db,'oy_roller','rol-viewer'),{yetkiler:{siniflar:'goruntule'}});
      await setDoc(doc(db,'oy_roller','rol-manager'),{ad:'Yönetici',yetkiler:{siniflar:'duzenle'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','teacherUid'),{uid:'teacherUid',admin:false,aktif:true,rolId:'rol-viewer',bagliOgretmenId:'t1'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','managerUid'),{uid:'managerUid',admin:false,aktif:true,rolId:'rol-manager',bagliOgretmenId:'t2'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_veliler','v1'),{ogrenciAdi:'Ali Öğrenci',sinifId:'s1',veliAdi:'Veli 1',telefon1:'05000000000',adres:'Eski adres',kulupId:'',kulupAdi:''});
      await setDoc(doc(db,'oy_ogrenciler','o1'),{ogrenciAdi:'Ali Öğrenci',sinifId:'s1',adres:'Eski adres'});
    });

    const editor = testEnv.authenticatedContext('editorUid').firestore();
    const teacher = testEnv.authenticatedContext('teacherUid').firestore();
    const viewer = testEnv.authenticatedContext('viewerUid').firestore();
    const manager = testEnv.authenticatedContext('managerUid').firestore();
    const admin = testEnv.authenticatedContext('adminUid').firestore();
    const anon = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(teacher,'oy_veliler','v1')));
    await assertFails(getDoc(doc(anon,'oy_veliler','v1')));

    // Öğretmen öğrenci/veli iletişim ve adres bilgilerini güncelleyebilir.
    await assertSucceeds(updateDoc(doc(teacher,'oy_veliler','v1'),{
      veliAdi:'Yeni Veli',
      telefon1:'05551112233',
      adres:'Yeni adres',
    }));
    await assertSucceeds(updateDoc(doc(teacher,'oy_ogrenciler','o1'),{adres:'Yeni öğrenci adresi'}));

    // Öğretmen olmayan salt-okunur kullanıcı düzenleyemez.
    await assertFails(updateDoc(doc(viewer,'oy_veliler','v1'),{adres:'Yetkisiz adres'}));
    await assertFails(updateDoc(doc(viewer,'oy_ogrenciler','o1'),{adres:'Yetkisiz adres'}));

    // Eski düzenleme rolü kayıt oluşturup güncelleyebilir; ancak artık öğrenci silemez.
    await assertSucceeds(updateDoc(doc(editor,'oy_veliler','v1'),{veliAdi:'Editör Veli'}));
    await assertSucceeds(setDoc(doc(editor,'oy_veliler','v2'),{ogrenciAdi:'Yeni Öğrenci',sinifId:'s1'}));
    await assertFails(deleteDoc(doc(editor,'oy_veliler','v2')));

    // Öğretmen silme yapamaz; yönetici/admin yapabilir.
    await assertFails(deleteDoc(doc(teacher,'oy_veliler','v1')));
    await assertFails(deleteDoc(doc(teacher,'oy_ogrenciler','o1')));
    await assertSucceeds(deleteDoc(doc(manager,'oy_veliler','v2')));

    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db,'oy_veliler','v3'),{ogrenciAdi:'Admin Silinecek',sinifId:'s1'});
    });
    await assertSucceeds(deleteDoc(doc(admin,'oy_veliler','v3')));

    console.log('Öğretmen öğrenci düzenleme / silme sınırı güvenlik testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
