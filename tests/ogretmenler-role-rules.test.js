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
  const testEnv = await initializeTestEnvironment({projectId:PROJECT_ID,firestore:{rules}});
  try{
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async context=>{
      const db = context.firestore();
      await setDoc(doc(db,'oy_roller','rol-editor'),{yetkiler:{ogretmenler:'duzenle'}});
      await setDoc(doc(db,'oy_roller','rol-viewer'),{yetkiler:{ogretmenler:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_ogretmenler','o1'),{adSoyad:'Ali Öğretmen',brans:'Fen Bilimleri'});
    });

    const editor = testEnv.authenticatedContext('editorUid').firestore();
    const viewer = testEnv.authenticatedContext('viewerUid').firestore();
    const admin = testEnv.authenticatedContext('adminUid').firestore();
    const anon = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_ogretmenler','o1')));
    await assertFails(getDoc(doc(anon,'oy_ogretmenler','o1')));

    await assertSucceeds(setDoc(doc(editor,'oy_ogretmenler','o2'),{adSoyad:'Ayşe Öğretmen',brans:'Türkçe'}));
    await assertSucceeds(updateDoc(doc(editor,'oy_ogretmenler','o1'),{brans:'Matematik'}));
    await assertFails(updateDoc(doc(viewer,'oy_ogretmenler','o1'),{brans:'Yetkisiz'}));
    await assertFails(deleteDoc(doc(viewer,'oy_ogretmenler','o1')));
    await assertSucceeds(deleteDoc(doc(admin,'oy_ogretmenler','o1')));

    console.log('Öğretmen rol güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
