const fs = require('fs');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db,'oy_roller','tasima-editor'),{yetkiler:{tasima:'duzenle'}});
      await setDoc(doc(db,'oy_roller','tasima-viewer'),{yetkiler:{tasima:'goruntule'}});
      await setDoc(doc(db,'oy_roller','sinif-editor'),{yetkiler:{siniflar:'duzenle'}});
      await setDoc(doc(db,'oy_roller','sinif-viewer'),{yetkiler:{siniflar:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','tasimaEditorUid'),{uid:'tasimaEditorUid',admin:false,aktif:true,rolId:'tasima-editor'});
      await setDoc(doc(db,'oy_kullanicilar','tasimaViewerUid'),{uid:'tasimaViewerUid',admin:false,aktif:true,rolId:'tasima-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','sinifEditorUid'),{uid:'sinifEditorUid',admin:false,aktif:true,rolId:'sinif-editor'});
      await setDoc(doc(db,'oy_kullanicilar','sinifViewerUid'),{uid:'sinifViewerUid',admin:false,aktif:true,rolId:'sinif-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','ownClassTeacherUid'),{uid:'ownClassTeacherUid',admin:false,aktif:true,rolId:'sinif-viewer',bagliOgretmenId:'teacher1'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_servisOturma','servis1'),{servisId:'servis1',sablon:'minibus',koltuklar:[]});
      await setDoc(doc(db,'oy_siniflar','sinif1'),{ad:'5-A',sinifOgretmeniId:'teacher1'});
      await setDoc(doc(db,'oy_siniflar','sinif2'),{ad:'5-B',sinifOgretmeniId:'teacher2'});
      await setDoc(doc(db,'oy_sinifOturma','sinif1'),{sinifId:'sinif1',sayfaYonu:'yatay',ogeler:[]});
      await setDoc(doc(db,'oy_sinifOturma','sinif2'),{sinifId:'sinif2',sayfaYonu:'yatay',ogeler:[]});
    });

    const tasimaEditor = env.authenticatedContext('tasimaEditorUid').firestore();
    const tasimaViewer = env.authenticatedContext('tasimaViewerUid').firestore();
    const sinifEditor = env.authenticatedContext('sinifEditorUid').firestore();
    const sinifViewer = env.authenticatedContext('sinifViewerUid').firestore();
    const ownClassTeacher = env.authenticatedContext('ownClassTeacherUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(tasimaViewer,'oy_servisOturma','servis1')));
    await assertSucceeds(getDoc(doc(sinifViewer,'oy_sinifOturma','sinif1')));
    await assertFails(getDoc(doc(anon,'oy_servisOturma','servis1')));

    await assertSucceeds(updateDoc(doc(tasimaEditor,'oy_servisOturma','servis1'),{sablon:'midibus'}));
    await assertFails(updateDoc(doc(tasimaViewer,'oy_servisOturma','servis1'),{sablon:'yetkisiz'}));
    await assertFails(updateDoc(doc(sinifEditor,'oy_servisOturma','servis1'),{sablon:'yanlis-rol'}));

    await assertSucceeds(updateDoc(doc(sinifEditor,'oy_sinifOturma','sinif1'),{sayfaYonu:'dikey'}));
    await assertFails(updateDoc(doc(sinifViewer,'oy_sinifOturma','sinif1'),{sayfaYonu:'yetkisiz'}));
    await assertFails(updateDoc(doc(tasimaEditor,'oy_sinifOturma','sinif1'),{sayfaYonu:'yanlis-rol'}));
    await assertSucceeds(updateDoc(doc(ownClassTeacher,'oy_sinifOturma','sinif1'),{sayfaYonu:'ogretmen-kendi-sinifi'}));
    await assertFails(updateDoc(doc(ownClassTeacher,'oy_sinifOturma','sinif2'),{sayfaYonu:'ogretmen-baska-sinif'}));

    await assertSucceeds(setDoc(doc(admin,'oy_servisOturma','servis2'),{servisId:'servis2'}));
    await assertSucceeds(setDoc(doc(admin,'oy_sinifOturma','sinif2'),{sinifId:'sinif2'}));

    console.log('Oturma planları rol güvenliği testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
