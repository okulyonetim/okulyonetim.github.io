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
      await setDoc(doc(db,'oy_roller','periyodik-editor'),{yetkiler:{periyodikIsler:'duzenle'}});
      await setDoc(doc(db,'oy_roller','periyodik-viewer'),{yetkiler:{periyodikIsler:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'periyodik-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'periyodik-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_periyodikIsler','p1'),{isAdi:'Aylık Rapor',baslangic:'2026-08-01',bitis:'2026-08-05',tamamlandi:false});
      await setDoc(doc(db,'oy_periyodikSablon','sablon'),{gorevler:[{isAdi:'Aylık Rapor',baslangicGun:1,bitisGun:5}]});
    });

    const editor = env.authenticatedContext('editorUid').firestore();
    const viewer = env.authenticatedContext('viewerUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_periyodikIsler','p1')));
    await assertSucceeds(getDoc(doc(viewer,'oy_periyodikSablon','sablon')));
    await assertFails(getDoc(doc(anon,'oy_periyodikIsler','p1')));

    await assertSucceeds(setDoc(doc(editor,'oy_periyodikIsler','p2'),{isAdi:'Yeni İş',baslangic:'2026-08-10',bitis:'2026-08-12',tamamlandi:false}));
    await assertSucceeds(updateDoc(doc(editor,'oy_periyodikIsler','p1'),{tamamlandi:true}));
    await assertSucceeds(setDoc(doc(editor,'oy_periyodikSablon','sablon'),{gorevler:[{isAdi:'Yeni Şablon',baslangicGun:10,bitisGun:12}]}));
    await assertFails(updateDoc(doc(viewer,'oy_periyodikIsler','p1'),{tamamlandi:true}));
    await assertFails(setDoc(doc(viewer,'oy_periyodikSablon','sablon'),{gorevler:[]}));
    await assertSucceeds(deleteDoc(doc(admin,'oy_periyodikIsler','p1')));

    console.log('Periyodik İşler rol güvenliği testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
