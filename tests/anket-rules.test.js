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
      await setDoc(doc(db,'oy_roller','rol-viewer'),{yetkiler:{anket:'goruntule'}});
      await setDoc(doc(db,'oy_roller','rol-hidden'),{yetkiler:{anket:'gizle'}});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','viewer2Uid'),{uid:'viewer2Uid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','hiddenUid'),{uid:'hiddenUid',admin:false,aktif:true,rolId:'rol-hidden'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_anketler','a1'),{
        soru:'Tercihiniz?', secenekler:[{id:'s1',metin:'A'},{id:'s2',metin:'B'}],
        coklu:false, aktif:true, olusturanUid:'adminUid', olusturanAdi:'Admin', oylar:{}
      });
      await setDoc(doc(db,'oy_anketler','kapali'),{
        soru:'Kapalı', secenekler:[{id:'s1',metin:'A'},{id:'s2',metin:'B'}],
        coklu:false, aktif:false, olusturanUid:'adminUid', olusturanAdi:'Admin', oylar:{}
      });
    });

    const viewerDb = testEnv.authenticatedContext('viewerUid').firestore();
    const viewer2Db = testEnv.authenticatedContext('viewer2Uid').firestore();
    const hiddenDb = testEnv.authenticatedContext('hiddenUid').firestore();
    const adminDb = testEnv.authenticatedContext('adminUid').firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewerDb,'oy_anketler','a1')));
    await assertFails(getDoc(doc(hiddenDb,'oy_anketler','a1')));
    await assertFails(getDoc(doc(anonDb,'oy_anketler','a1')));

    await assertFails(setDoc(doc(viewerDb,'oy_anketler','sahte'),{soru:'Sahte',aktif:true,oylar:{}}));
    await assertSucceeds(setDoc(doc(adminDb,'oy_anketler','adminYeni'),{soru:'Yeni',secenekler:[],aktif:true,oylar:{}}));

    await assertSucceeds(updateDoc(doc(viewerDb,'oy_anketler','a1'),{
      'oylar.viewerUid':{secenekIdler:['s1'],ad:'Viewer',tarih:'2026-08-18'}
    }));
    await assertSucceeds(updateDoc(doc(viewerDb,'oy_anketler','a1'),{
      'oylar.viewerUid':{secenekIdler:['s2'],ad:'Viewer',tarih:'2026-08-18'}
    }));
    await assertFails(updateDoc(doc(viewerDb,'oy_anketler','a1'),{soru:'Değiştirildi'}));
    await assertFails(updateDoc(doc(viewerDb,'oy_anketler','a1'),{aktif:false}));
    await assertFails(updateDoc(doc(viewerDb,'oy_anketler','a1'),{
      'oylar.viewer2Uid':{secenekIdler:['s1'],ad:'Sahte',tarih:'2026-08-18'}
    }));
    await assertFails(updateDoc(doc(viewer2Db,'oy_anketler','kapali'),{
      'oylar.viewer2Uid':{secenekIdler:['s1'],ad:'Viewer2',tarih:'2026-08-18'}
    }));
    await assertFails(deleteDoc(doc(viewerDb,'oy_anketler','a1')));
    await assertSucceeds(updateDoc(doc(adminDb,'oy_anketler','a1'),{aktif:false}));

    console.log('Anket güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
