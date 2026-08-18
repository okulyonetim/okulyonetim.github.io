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
      const db=context.firestore();
      await setDoc(doc(db,'oy_roller','rol-editor'),{yetkiler:{siniflar:'duzenle'}});
      await setDoc(doc(db,'oy_roller','rol-viewer'),{yetkiler:{siniflar:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_siniflar','s1'),{ad:'5-A',seviye:5,sube:'A'});
    });

    const editorDb=testEnv.authenticatedContext('editorUid').firestore();
    const viewerDb=testEnv.authenticatedContext('viewerUid').firestore();
    const adminDb=testEnv.authenticatedContext('adminUid').firestore();
    const anonDb=testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewerDb,'oy_siniflar','s1')));
    await assertFails(getDoc(doc(anonDb,'oy_siniflar','s1')));
    await assertSucceeds(setDoc(doc(editorDb,'oy_siniflar','s2'),{ad:'6-A',seviye:6,sube:'A'}));
    await assertSucceeds(updateDoc(doc(editorDb,'oy_siniflar','s1'),{derslik:'101'}));
    await assertFails(updateDoc(doc(viewerDb,'oy_siniflar','s1'),{derslik:'999'}));
    await assertFails(deleteDoc(doc(viewerDb,'oy_siniflar','s1')));
    await assertSucceeds(deleteDoc(doc(adminDb,'oy_siniflar','s1')));

    console.log('Sınıflar rol güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
