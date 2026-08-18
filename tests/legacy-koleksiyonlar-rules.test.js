const fs = require('fs');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db,'oy_roller','ogr-editor'),{yetkiler:{ogrenciler:'duzenle'}});
      await setDoc(doc(db,'oy_roller','sinif-editor'),{yetkiler:{siniflar:'duzenle'}});
      await setDoc(doc(db,'oy_roller','ogr-viewer'),{yetkiler:{ogrenciler:'goruntule'}});
      await setDoc(doc(db,'oy_roller','personel-editor'),{yetkiler:{personel:'duzenle'}});
      await setDoc(doc(db,'oy_roller','personel-viewer'),{yetkiler:{personel:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','ogrEditorUid'),{uid:'ogrEditorUid',admin:false,aktif:true,rolId:'ogr-editor'});
      await setDoc(doc(db,'oy_kullanicilar','sinifEditorUid'),{uid:'sinifEditorUid',admin:false,aktif:true,rolId:'sinif-editor'});
      await setDoc(doc(db,'oy_kullanicilar','ogrViewerUid'),{uid:'ogrViewerUid',admin:false,aktif:true,rolId:'ogr-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','personelEditorUid'),{uid:'personelEditorUid',admin:false,aktif:true,rolId:'personel-editor'});
      await setDoc(doc(db,'oy_kullanicilar','personelViewerUid'),{uid:'personelViewerUid',admin:false,aktif:true,rolId:'personel-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_ogrenciler','o1'),{ad:'Eski Öğrenci'});
      await setDoc(doc(db,'oy_dilekceler','d1'),{personelId:'p1',izinTuru:'Yıllık İzin'});
    });

    const ogrEditor = env.authenticatedContext('ogrEditorUid').firestore();
    const sinifEditor = env.authenticatedContext('sinifEditorUid').firestore();
    const ogrViewer = env.authenticatedContext('ogrViewerUid').firestore();
    const personelEditor = env.authenticatedContext('personelEditorUid').firestore();
    const personelViewer = env.authenticatedContext('personelViewerUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(ogrViewer,'oy_ogrenciler','o1')));
    await assertFails(getDoc(doc(anon,'oy_ogrenciler','o1')));
    await assertSucceeds(updateDoc(doc(ogrEditor,'oy_ogrenciler','o1'),{ad:'Güncel Öğrenci'}));
    await assertSucceeds(setDoc(doc(sinifEditor,'oy_ogrenciler','o2'),{ad:'Yeni Öğrenci'}));
    await assertFails(updateDoc(doc(ogrViewer,'oy_ogrenciler','o1'),{ad:'Yetkisiz'}));
    await assertSucceeds(deleteDoc(doc(admin,'oy_ogrenciler','o1')));

    await assertSucceeds(getDoc(doc(personelViewer,'oy_dilekceler','d1')));
    await assertFails(getDoc(doc(anon,'oy_dilekceler','d1')));
    await assertSucceeds(setDoc(doc(personelEditor,'oy_dilekceler','d2'),{personelId:'p2',izinTuru:'Mazeret İzni'}));
    await assertFails(updateDoc(doc(personelViewer,'oy_dilekceler','d1'),{izinTuru:'Diğer'}));
    await assertSucceeds(deleteDoc(doc(admin,'oy_dilekceler','d1')));

    console.log('Legacy koleksiyon rol güvenliği testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
