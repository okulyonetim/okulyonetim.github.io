const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');
const { ref, uploadBytes, getBytes, deleteObject } = require('firebase/storage');

// Storage Rules içindeki firestore.get() çağrıları, emulators:exec ile açılan
// ortak demo proje üzerinde çalışır. Bu nedenle diğer Rules testleriyle aynı
// proje kimliği kullanılmalıdır.
const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const firestoreRules=fs.readFileSync('firestore.rules','utf8');
  const storageRules=fs.readFileSync('storage.rules','utf8');
  const testEnv=await initializeTestEnvironment({
    projectId:PROJECT_ID,
    firestore:{rules:firestoreRules},
    storage:{rules:storageRules},
  });

  try{
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
    await testEnv.withSecurityRulesDisabled(async context=>{
      const db=context.firestore();
      await setDoc(doc(db,'oy_roller','rol-editor'),{ad:'Duyuru Editörü',yetkiler:{duyurular:'duzenle'}});
      await setDoc(doc(db,'oy_roller','rol-viewer'),{ad:'Duyuru Görüntüleyici',yetkiler:{duyurular:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_duyurular','d1'),{baslik:'Mevcut',icerik:'Duyuru',okuyanlar:{}});
    });

    const editorDb=testEnv.authenticatedContext('editorUid').firestore();
    const viewerDb=testEnv.authenticatedContext('viewerUid').firestore();
    const adminDb=testEnv.authenticatedContext('adminUid').firestore();
    const anonDb=testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewerDb,'oy_duyurular','d1')));
    await assertFails(getDoc(doc(anonDb,'oy_duyurular','d1')));
    await assertSucceeds(setDoc(doc(editorDb,'oy_duyurular','d-editor'),{baslik:'Yeni',okuyanlar:{}}));
    await assertFails(setDoc(doc(viewerDb,'oy_duyurular','d-viewer'),{baslik:'Yetkisiz',okuyanlar:{}}));

    await assertSucceeds(updateDoc(doc(viewerDb,'oy_duyurular','d1'),{
      'okuyanlar.viewerUid':{ad:'Viewer',tarih:'2026-08-18'}
    }));
    await assertFails(updateDoc(doc(viewerDb,'oy_duyurular','d1'),{baslik:'Değiştirildi'}));
    await assertFails(updateDoc(doc(viewerDb,'oy_duyurular','d1'),{
      'okuyanlar.editorUid':{ad:'Sahte',tarih:'2026-08-18'}
    }));

    await assertSucceeds(updateDoc(doc(editorDb,'oy_duyurular','d1'),{baslik:'Editör Güncelledi'}));
    await assertSucceeds(updateDoc(doc(adminDb,'oy_duyurular','d1'),{baslik:'Admin Güncelledi'}));
    await assertFails(deleteDoc(doc(viewerDb,'oy_duyurular','d1')));

    const editorStorage=testEnv.authenticatedContext('editorUid').storage();
    const viewerStorage=testEnv.authenticatedContext('viewerUid').storage();
    const adminStorage=testEnv.authenticatedContext('adminUid').storage();
    const anonStorage=testEnv.unauthenticatedContext().storage();
    const img=new Uint8Array([137,80,78,71]);

    await assertSucceeds(uploadBytes(ref(editorStorage,'duyurular/editor.png'),img,{contentType:'image/png'}));
    await assertSucceeds(getBytes(ref(viewerStorage,'duyurular/editor.png')));
    await assertFails(getBytes(ref(anonStorage,'duyurular/editor.png')));
    await assertFails(uploadBytes(ref(viewerStorage,'duyurular/viewer.png'),img,{contentType:'image/png'}));
    await assertFails(deleteObject(ref(viewerStorage,'duyurular/editor.png')));
    await assertSucceeds(deleteObject(ref(adminStorage,'duyurular/editor.png')));

    console.log('Duyuru rol güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
