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
      await setDoc(doc(db,'oy_roller','rol-editor'),{yetkiler:{ogretmenler:'duzenle'}});
      await setDoc(doc(db,'oy_roller','rol-viewer'),{yetkiler:{ogretmenler:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_ogretmenIzinleri','i1'),{
        ogretmenId:'o1',tur:'Raporlu',baslangic:'2026-08-18',bitis:'2026-08-19',gunSayisi:2
      });
    });

    const editor = testEnv.authenticatedContext('editorUid').firestore();
    const viewer = testEnv.authenticatedContext('viewerUid').firestore();
    const admin = testEnv.authenticatedContext('adminUid').firestore();
    const anon = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_ogretmenIzinleri','i1')));
    await assertFails(getDoc(doc(anon,'oy_ogretmenIzinleri','i1')));

    await assertSucceeds(setDoc(doc(editor,'oy_ogretmenIzinleri','i2'),{
      ogretmenId:'o2',tur:'Yıllık İzin',baslangic:'2026-08-20',bitis:'2026-08-22',gunSayisi:3
    }));
    await assertSucceeds(updateDoc(doc(editor,'oy_ogretmenIzinleri','i1'),{aciklama:'Güncellendi'}));
    await assertFails(updateDoc(doc(viewer,'oy_ogretmenIzinleri','i1'),{aciklama:'Yetkisiz'}));
    await assertFails(deleteDoc(doc(viewer,'oy_ogretmenIzinleri','i1')));
    await assertSucceeds(deleteDoc(doc(admin,'oy_ogretmenIzinleri','i1')));

    console.log('Öğretmen izinleri rol güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{ console.error(err); process.exit(1); });
