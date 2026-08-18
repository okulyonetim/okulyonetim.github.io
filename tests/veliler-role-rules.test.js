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
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','counselorUid'),{uid:'counselorUid',admin:false,aktif:true,rolId:'rol-viewer',bagliOgretmenId:'t1'});
      await setDoc(doc(db,'oy_kullanicilar','otherUid'),{uid:'otherUid',admin:false,aktif:true,rolId:'rol-viewer',bagliOgretmenId:'t3'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_sosyalKulupler','k1'),{ad:'Bilim Kulübü',ogretmenIdler:['t1']});
      await setDoc(doc(db,'oy_sosyalKulupler','k2'),{ad:'Spor Kulübü',ogretmenIdler:['t2']});
      await setDoc(doc(db,'oy_veliler','v1'),{ogrenciAdi:'Ali Öğrenci',sinifId:'s1',veliAdi:'Veli 1',telefon1:'05000000000',kulupId:'k1',kulupAdi:'Bilim Kulübü'});
      await setDoc(doc(db,'oy_veliler','v2'),{ogrenciAdi:'Ayşe Öğrenci',sinifId:'s1',veliAdi:'Veli 2',telefon1:'05000000001',kulupId:'',kulupAdi:''});
    });

    const editor = testEnv.authenticatedContext('editorUid').firestore();
    const counselor = testEnv.authenticatedContext('counselorUid').firestore();
    const other = testEnv.authenticatedContext('otherUid').firestore();
    const admin = testEnv.authenticatedContext('adminUid').firestore();
    const anon = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(counselor,'oy_veliler','v1')));
    await assertFails(getDoc(doc(anon,'oy_veliler','v1')));

    await assertSucceeds(updateDoc(doc(editor,'oy_veliler','v1'),{veliAdi:'Yeni Veli',telefon1:'05551112233'}));
    await assertSucceeds(setDoc(doc(editor,'oy_veliler','v3'),{ogrenciAdi:'Yeni Öğrenci',sinifId:'s1'}));
    await assertSucceeds(deleteDoc(doc(admin,'oy_veliler','v3')));

    // Danışman kendi kulübüne öğrenci atayabilir ve kendi kulübünden çıkarabilir.
    await assertSucceeds(updateDoc(doc(counselor,'oy_veliler','v2'),{kulupId:'k1',kulupAdi:'Bilim Kulübü'}));
    await assertSucceeds(updateDoc(doc(counselor,'oy_veliler','v1'),{kulupId:'',kulupAdi:''}));

    // Danışman öğrenci/veli bilgilerinin diğer alanlarına dokunamaz ve başka kulübe atama yapamaz.
    await assertFails(updateDoc(doc(counselor,'oy_veliler','v1'),{telefon1:'09999999999'}));
    await assertFails(updateDoc(doc(counselor,'oy_veliler','v2'),{kulupId:'k2',kulupAdi:'Spor Kulübü'}));
    await assertFails(updateDoc(doc(other,'oy_veliler','v2'),{kulupId:'k1',kulupAdi:'Bilim Kulübü'}));
    await assertFails(deleteDoc(doc(counselor,'oy_veliler','v1')));

    console.log('Veli/öğrenci rol ve kulüp danışmanı güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
