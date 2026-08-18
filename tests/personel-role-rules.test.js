const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules=fs.readFileSync('firestore.rules','utf8');
  const testEnv=await initializeTestEnvironment({projectId:PROJECT_ID,firestore:{rules}});
  try{
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async context=>{
      const db=context.firestore();
      await setDoc(doc(db,'oy_roller','rol-editor'),{yetkiler:{personel:'duzenle'}});
      await setDoc(doc(db,'oy_roller','rol-viewer'),{yetkiler:{personel:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_personel','p1'),{adSoyad:'Ali Personel',gorev:'Hizmetli'});
      await setDoc(doc(db,'oy_personelIzinler','i1'),{personelId:'p1',baslangic:'2026-08-18',bitis:'2026-08-19',tur:'YILLIK İZİNLİ'});
    });

    const editor=testEnv.authenticatedContext('editorUid').firestore();
    const viewer=testEnv.authenticatedContext('viewerUid').firestore();
    const admin=testEnv.authenticatedContext('adminUid').firestore();
    const anon=testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_personel','p1')));
    await assertSucceeds(getDoc(doc(viewer,'oy_personelIzinler','i1')));
    await assertFails(getDoc(doc(anon,'oy_personel','p1')));

    await assertSucceeds(setDoc(doc(editor,'oy_personel','p2'),{adSoyad:'Ayşe Personel',gorev:'Memur'}));
    await assertSucceeds(updateDoc(doc(editor,'oy_personelIzinler','i1'),{aciklama:'Güncellendi'}));
    await assertFails(updateDoc(doc(viewer,'oy_personel','p1'),{gorev:'Yetkisiz'}));
    await assertFails(deleteDoc(doc(viewer,'oy_personelIzinler','i1')));
    await assertSucceeds(deleteDoc(doc(admin,'oy_personel','p1')));

    console.log('Personel rol güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
