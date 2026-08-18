const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';
const CASES = [
  ['oy_sosyalKulupler','sosyalKulupler'],
  ['oy_belirliGunler','belirliGunler'],
  ['oy_zumre','zumre'],
  ['oy_sok','sok'],
  ['oy_bepPlani','bepPlani'],
  ['oy_rehberlik','rehberlik'],
  ['oy_maarifRapor','maarifRapor'],
  ['oy_digerEvrak','digerEvrak'],
];

async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const testEnv = await initializeTestEnvironment({projectId:PROJECT_ID,firestore:{rules}});
  try{
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async context=>{
      const db = context.firestore();
      const editorYetkiler = {};
      const viewerYetkiler = {};
      for(const [,modul] of CASES){ editorYetkiler[modul] = 'duzenle'; viewerYetkiler[modul] = 'goruntule'; }
      await setDoc(doc(db,'oy_roller','rol-editor'),{yetkiler:editorYetkiler});
      await setDoc(doc(db,'oy_roller','rol-viewer'),{yetkiler:viewerYetkiler});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      for(const [koleksiyon] of CASES){
        await setDoc(doc(db,koleksiyon,'r1'),{ad:'Mevcut kayıt',kontroller:{}});
      }
    });

    const editor = testEnv.authenticatedContext('editorUid').firestore();
    const viewer = testEnv.authenticatedContext('viewerUid').firestore();
    const admin = testEnv.authenticatedContext('adminUid').firestore();
    const anon = testEnv.unauthenticatedContext().firestore();

    for(const [koleksiyon,modul] of CASES){
      await assertSucceeds(getDoc(doc(viewer,koleksiyon,'r1')));
      await assertFails(getDoc(doc(anon,koleksiyon,'r1')));

      await assertSucceeds(setDoc(doc(editor,koleksiyon,'r2'),{ad:`${modul} yeni`}));
      await assertSucceeds(updateDoc(doc(editor,koleksiyon,'r1'),{ad:`${modul} güncel`}));
      await assertFails(updateDoc(doc(viewer,koleksiyon,'r1'),{ad:'Yetkisiz'}));
      await assertFails(deleteDoc(doc(viewer,koleksiyon,'r1')));
      await assertSucceeds(deleteDoc(doc(admin,koleksiyon,'r1')));
    }

    console.log('Çizelge modülleri rol güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
