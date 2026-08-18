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
      await setDoc(doc(db,'oy_roller','ders-editor'),{yetkiler:{dersProgrami:'duzenle'}});
      await setDoc(doc(db,'oy_roller','ders-viewer'),{yetkiler:{dersProgrami:'goruntule'}});
      await setDoc(doc(db,'oy_roller','veri-editor'),{yetkiler:{veri:'duzenle'}});
      await setDoc(doc(db,'oy_kullanicilar','dersEditorUid'),{uid:'dersEditorUid',admin:false,aktif:true,rolId:'ders-editor'});
      await setDoc(doc(db,'oy_kullanicilar','dersViewerUid'),{uid:'dersViewerUid',admin:false,aktif:true,rolId:'ders-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','veriEditorUid'),{uid:'veriEditorUid',admin:false,aktif:true,rolId:'veri-editor'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_dersProgrami','d1'),{sinif:'5-A',gun:'Pazartesi',saat:1,ders:'Fen Bilimleri',ogretmenId:'o1'});
    });

    const dersEditor = env.authenticatedContext('dersEditorUid').firestore();
    const dersViewer = env.authenticatedContext('dersViewerUid').firestore();
    const veriEditor = env.authenticatedContext('veriEditorUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(dersViewer,'oy_dersProgrami','d1')));
    await assertFails(getDoc(doc(anon,'oy_dersProgrami','d1')));
    await assertSucceeds(setDoc(doc(dersEditor,'oy_dersProgrami','d2'),{sinif:'5-B',gun:'Salı',saat:2,ders:'Matematik',ogretmenId:'o2'}));
    await assertSucceeds(updateDoc(doc(dersEditor,'oy_dersProgrami','d1'),{saat:3}));
    await assertSucceeds(setDoc(doc(veriEditor,'oy_dersProgrami','d3'),{sinif:'6-A',gun:'Çarşamba',saat:4,ders:'Türkçe',ogretmenId:'o3'}));
    await assertFails(updateDoc(doc(dersViewer,'oy_dersProgrami','d1'),{saat:5}));
    await assertSucceeds(deleteDoc(doc(admin,'oy_dersProgrami','d1')));

    console.log('Ders Programı rol güvenliği testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
