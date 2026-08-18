const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc, setDoc, getDoc, deleteDoc,
  collection, query, where, getDocs,
} = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const testEnv = await initializeTestEnvironment({projectId:PROJECT_ID,firestore:{rules}});
  try{
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async context=>{
      const db = context.firestore();
      await setDoc(doc(db,'oy_roller','rol-editor'),{yetkiler:{harita:'duzenle'}});
      await setDoc(doc(db,'oy_roller','rol-viewer'),{yetkiler:{harita:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','ownerUid'),{uid:'ownerUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','otherUid'),{uid:'otherUid',admin:false,aktif:true,rolId:'rol-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_haritaFavoriler','f1'),{ad:'Ev',lat:38.1,lng:39.1,olusturanUid:'ownerUid',olusturanAdi:'Owner',olusturmaTarihi:'2026-08-18'});
      await setDoc(doc(db,'oy_haritaFavoriler','f2'),{ad:'Diğer',lat:38.2,lng:39.2,olusturanUid:'otherUid',olusturanAdi:'Other',olusturmaTarihi:'2026-08-18'});
      await setDoc(doc(db,'oy_haritaFavoriler','legacy'),{ad:'Eski',lat:38.3,lng:39.3,olusturmaTarihi:'2025-01-01'});
    });

    const owner = testEnv.authenticatedContext('ownerUid').firestore();
    const other = testEnv.authenticatedContext('otherUid').firestore();
    const viewer = testEnv.authenticatedContext('viewerUid').firestore();
    const admin = testEnv.authenticatedContext('adminUid').firestore();
    const anon = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(owner,'oy_haritaFavoriler','f1')));
    await assertFails(getDoc(doc(owner,'oy_haritaFavoriler','f2')));
    await assertFails(getDoc(doc(owner,'oy_haritaFavoriler','legacy')));
    await assertSucceeds(getDoc(doc(admin,'oy_haritaFavoriler','f2')));
    await assertSucceeds(getDoc(doc(admin,'oy_haritaFavoriler','legacy')));
    await assertFails(getDoc(doc(anon,'oy_haritaFavoriler','f1')));

    // Repository normal kullanıcıda tam olarak bu sahiplik sorgusunu kurar.
    await assertSucceeds(getDocs(query(collection(owner,'oy_haritaFavoriler'),where('olusturanUid','==','ownerUid'))));
    await assertFails(getDocs(collection(owner,'oy_haritaFavoriler')));
    await assertSucceeds(getDocs(collection(admin,'oy_haritaFavoriler')));

    await assertSucceeds(setDoc(doc(owner,'oy_haritaFavoriler','f3'),{ad:'Yeni',lat:1,lng:2,olusturanUid:'ownerUid',olusturanAdi:'Owner'}));
    await assertFails(setDoc(doc(owner,'oy_haritaFavoriler','spoof'),{ad:'Sahte',lat:1,lng:2,olusturanUid:'otherUid'}));
    await assertFails(setDoc(doc(viewer,'oy_haritaFavoriler','viewerNew'),{ad:'Yetkisiz',lat:1,lng:2,olusturanUid:'viewerUid'}));

    await assertSucceeds(deleteDoc(doc(owner,'oy_haritaFavoriler','f1')));
    await assertFails(deleteDoc(doc(owner,'oy_haritaFavoriler','f2')));
    await assertSucceeds(deleteDoc(doc(admin,'oy_haritaFavoriler','f2')));

    console.log('Harita favori sahiplik güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
