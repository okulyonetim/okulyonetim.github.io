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
      await setDoc(doc(db,'oy_roller','rol-nobet'),{yetkiler:{nobet:'duzenle',ogretmenler:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','nobetUid'),{uid:'nobetUid',admin:false,aktif:true,rolId:'rol-nobet'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_ogretmenler','o1'),{ad:'Ali',soyad:'Öğretmen',brans:'Fen Bilimleri'});
    });

    const editor = testEnv.authenticatedContext('editorUid').firestore();
    const viewer = testEnv.authenticatedContext('viewerUid').firestore();
    const nobet = testEnv.authenticatedContext('nobetUid').firestore();
    const admin = testEnv.authenticatedContext('adminUid').firestore();
    const anon = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_ogretmenler','o1')));
    await assertFails(getDoc(doc(anon,'oy_ogretmenler','o1')));

    await assertSucceeds(setDoc(doc(editor,'oy_ogretmenler','o2'),{ad:'Ayşe',soyad:'Öğretmen',brans:'Türkçe'}));
    await assertSucceeds(updateDoc(doc(editor,'oy_ogretmenler','o1'),{brans:'Matematik'}));
    await assertFails(updateDoc(doc(viewer,'oy_ogretmenler','o1'),{brans:'Yetkisiz'}));
    await assertFails(deleteDoc(doc(viewer,'oy_ogretmenler','o1')));

    // Nöbet Excel importu listede olmayan öğretmeni otomatik oluşturabiliyor.
    // Nöbet editörü yalnız bu dar şemayla yeni öğretmen oluşturabilir; mevcut kaydı düzenleyemez/silemez.
    await assertSucceeds(setDoc(doc(nobet,'oy_ogretmenler','o3'),{
      ad:'Mehmet',soyad:'Nöbetçi',unvan:'',brans:'',telefon:'',eposta:'',sorumluSinif:'',eklenmeTarihi:new Date().toISOString()
    }));
    await assertFails(setDoc(doc(nobet,'oy_ogretmenler','o4'),{
      ad:'Yetkisiz',soyad:'Alan',unvan:'',brans:'',telefon:'',eposta:'',sorumluSinif:'',eklenmeTarihi:new Date().toISOString(),admin:true
    }));
    await assertFails(updateDoc(doc(nobet,'oy_ogretmenler','o1'),{brans:'Yetkisiz'}));
    await assertFails(deleteDoc(doc(nobet,'oy_ogretmenler','o1')));

    await assertSucceeds(deleteDoc(doc(admin,'oy_ogretmenler','o1')));

    console.log('Öğretmen rol güvenliği ve Nöbet Excel uyumluluğu testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
