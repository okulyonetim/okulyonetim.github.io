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
      await setDoc(doc(db,'oy_roller','personel-editor'),{yetkiler:{personel:'duzenle'}});
      await setDoc(doc(db,'oy_roller','personel-viewer'),{yetkiler:{personel:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'personel-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'personel-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_devamsizlikCizelgesi','2026-08'),{yil:2026,ay:8,ogretmenler:{}});
    });

    const editor = env.authenticatedContext('editorUid').firestore();
    const viewer = env.authenticatedContext('viewerUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_devamsizlikCizelgesi','2026-08')));
    await assertFails(getDoc(doc(anon,'oy_devamsizlikCizelgesi','2026-08')));
    await assertSucceeds(setDoc(doc(editor,'oy_devamsizlikCizelgesi','2026-09'),{yil:2026,ay:9,ogretmenler:{}}));
    await assertSucceeds(updateDoc(doc(editor,'oy_devamsizlikCizelgesi','2026-08'),{guncellemeTarihi:'2026-08-18'}));
    await assertFails(updateDoc(doc(viewer,'oy_devamsizlikCizelgesi','2026-08'),{guncellemeTarihi:'2026-08-18'}));
    await assertSucceeds(deleteDoc(doc(admin,'oy_devamsizlikCizelgesi','2026-08')));

    console.log('Devamsızlık Çizelgesi rol güvenliği testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
