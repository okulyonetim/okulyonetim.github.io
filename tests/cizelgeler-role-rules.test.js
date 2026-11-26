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
      /* Eski/toplu "cizelgeler" anahtarı: arayüz (PermissionService) koleksiyon anahtarı yoksa buna bakar; Ayarlar > Roller kaydı module.tools'u buna yansıtır. */
      await setDoc(doc(db,'oy_roller','rol-eski-editor'),{yetkiler:{cizelgeler:'duzenle'}});
      await setDoc(doc(db,'oy_roller','rol-eski-viewer'),{yetkiler:{cizelgeler:'goruntule'}});
      await setDoc(doc(db,'oy_roller','rol-bos'),{yetkiler:{}});
      await setDoc(doc(db,'oy_roller','rol-kulup-kisitli'),{yetkiler:{cizelgeler:'duzenle',sosyalKulupler:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','eskiEditorUid'),{uid:'eskiEditorUid',admin:false,aktif:true,rolId:'rol-eski-editor'});
      await setDoc(doc(db,'oy_kullanicilar','eskiViewerUid'),{uid:'eskiViewerUid',admin:false,aktif:true,rolId:'rol-eski-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','bosUid'),{uid:'bosUid',admin:false,aktif:true,rolId:'rol-bos'});
      await setDoc(doc(db,'oy_kullanicilar','kisitliUid'),{uid:'kisitliUid',admin:false,aktif:true,rolId:'rol-kulup-kisitli'});
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

    /* "cizelgeler" anahtarı olan rol: koleksiyon anahtarı yoksa onun düzeyi geçerli; koleksiyon anahtarı varsa o kazanır. */
    const eskiEditor = testEnv.authenticatedContext('eskiEditorUid').firestore();
    const eskiViewer = testEnv.authenticatedContext('eskiViewerUid').firestore();
    const bos = testEnv.authenticatedContext('bosUid').firestore();
    const kisitli = testEnv.authenticatedContext('kisitliUid').firestore();
    for(const [koleksiyon,modul] of CASES){
      await assertSucceeds(setDoc(doc(eskiEditor,koleksiyon,'e1'),{ad:`${modul} eski rol`}));
      await assertSucceeds(updateDoc(doc(eskiEditor,koleksiyon,'e1'),{ad:`${modul} eski rol güncel`}));
      await assertFails(setDoc(doc(eskiViewer,koleksiyon,'e2'),{ad:'Yetkisiz'}));
      await assertFails(setDoc(doc(bos,koleksiyon,'e3'),{ad:'Yetkisiz'}));
      if(modul==='sosyalKulupler')await assertFails(setDoc(doc(kisitli,koleksiyon,'e4'),{ad:'Kulüp anahtarı salt okunur'}));
      else await assertSucceeds(setDoc(doc(kisitli,koleksiyon,'e4'),{ad:`${modul} cizelgeler düzenle`}));
    }

    console.log('Çizelge modülleri rol güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
