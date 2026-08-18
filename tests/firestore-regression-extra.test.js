const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules-extra';

async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore:{ rules } });
  try{
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async context=>{
      const db=context.firestore();
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_kullanicilar','teacherUid'),{uid:'teacherUid',admin:false,aktif:true});
      await setDoc(doc(db,'oy_kullanicilar','teacher2Uid'),{uid:'teacher2Uid',admin:false,aktif:true});
      await setDoc(doc(db,'oy_kullanicilar','outsiderUid'),{uid:'outsiderUid',admin:false,aktif:true});
      await setDoc(doc(db,'oy_konusmalar','k1'),{katilimciUidler:['teacherUid','teacher2Uid']});
      await setDoc(doc(db,'oy_mesajlar','m1'),{konusmaId:'k1',gonderenUid:'teacherUid',metin:'x'});
      await setDoc(doc(db,'oy_odevTakip','o1'),{sahipUid:'teacherUid',ad:'Ödev'});
    });

    const adminDb=testEnv.authenticatedContext('adminUid').firestore();
    const teacher2Db=testEnv.authenticatedContext('teacher2Uid').firestore();
    const outsiderDb=testEnv.authenticatedContext('outsiderUid').firestore();

    await assertFails(setDoc(doc(outsiderDb,'oy_mesajlar','m-disari'),{konusmaId:'k1',gonderenUid:'outsiderUid',metin:'Sahte'}));
    await assertSucceeds(deleteDoc(doc(teacher2Db,'oy_mesajlar','m1')));
    await assertSucceeds(getDoc(doc(adminDb,'oy_odevTakip','o1')));

    console.log('Ek Firestore regresyon testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{ console.error(err); process.exit(1); });
