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
  const testEnv = await initializeTestEnvironment({ projectId:PROJECT_ID, firestore:{ rules } });
  try{
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async context=>{
      const db=context.firestore();
      await setDoc(doc(db,'oy_roller','rol-haber-editor'),{ad:'Haber Editörü',yetkiler:{haberler:'duzenle'}});
      await setDoc(doc(db,'oy_roller','rol-haber-viewer'),{ad:'Haber Görüntüleyici',yetkiler:{haberler:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'rol-haber-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-haber-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_haberler','h1'),{baslik:'Mevcut Haber',tarih:'2026-08-18'});
      await setDoc(doc(db,'oy_haberKaynaklari','k1'),{ad:'MEB',url:'https://example.test/rss'});
    });

    const editorDb=testEnv.authenticatedContext('editorUid').firestore();
    const viewerDb=testEnv.authenticatedContext('viewerUid').firestore();
    const adminDb=testEnv.authenticatedContext('adminUid').firestore();
    const anonDb=testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewerDb,'oy_haberler','h1')));
    await assertSucceeds(getDoc(doc(viewerDb,'oy_haberKaynaklari','k1')));
    await assertFails(getDoc(doc(anonDb,'oy_haberler','h1')));

    await assertSucceeds(setDoc(doc(editorDb,'oy_haberler','h-editor'),{baslik:'Yeni Haber'}));
    await assertSucceeds(updateDoc(doc(editorDb,'oy_haberler','h1'),{baslik:'Güncellendi'}));
    await assertSucceeds(deleteDoc(doc(editorDb,'oy_haberler','h1')));

    await assertFails(setDoc(doc(viewerDb,'oy_haberler','h-viewer'),{baslik:'Yetkisiz'}));
    await assertFails(updateDoc(doc(viewerDb,'oy_haberKaynaklari','k1'),{ad:'Yetkisiz'}));
    await assertFails(deleteDoc(doc(viewerDb,'oy_haberKaynaklari','k1')));

    await assertSucceeds(setDoc(doc(editorDb,'oy_haberKaynaklari','k-editor'),{ad:'Yeni Kaynak',url:'https://example.test/new'}));
    await assertSucceeds(updateDoc(doc(editorDb,'oy_haberKaynaklari','k1'),{ad:'MEB Güncel'}));
    await assertSucceeds(deleteDoc(doc(editorDb,'oy_haberKaynaklari','k1')));

    await assertSucceeds(setDoc(doc(adminDb,'oy_haberler','h-admin'),{baslik:'Admin Haber'}));
    await assertSucceeds(setDoc(doc(adminDb,'oy_haberKaynaklari','k-admin'),{ad:'Admin Kaynak'}));

    console.log('Haberler rol güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{ console.error(err); process.exit(1); });
