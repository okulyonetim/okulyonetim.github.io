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
      await setDoc(doc(db,'oy_roller','evrak-editor'),{yetkiler:{evrak:'duzenle'}});
      await setDoc(doc(db,'oy_roller','evrak-viewer'),{yetkiler:{evrak:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'evrak-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'evrak-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_evrakTakibi','e1'),{evrakAdi:'Mevcut Evrak',tur:'Gelen Evrak',tarih:'2026-08-18',durum:'Beklemede'});
    });

    const editor = env.authenticatedContext('editorUid').firestore();
    const viewer = env.authenticatedContext('viewerUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_evrakTakibi','e1')));
    await assertFails(getDoc(doc(anon,'oy_evrakTakibi','e1')));
    await assertSucceeds(setDoc(doc(editor,'oy_evrakTakibi','e2'),{evrakAdi:'Yeni Evrak',tur:'Tutanak',tarih:'2026-08-18',durum:'Beklemede'}));
    await assertSucceeds(updateDoc(doc(editor,'oy_evrakTakibi','e1'),{durum:'Tamamlandı'}));
    await assertFails(updateDoc(doc(viewer,'oy_evrakTakibi','e1'),{durum:'Arşivlendi'}));
    await assertFails(deleteDoc(doc(viewer,'oy_evrakTakibi','e1')));
    await assertSucceeds(deleteDoc(doc(admin,'oy_evrakTakibi','e1')));

    console.log('Evrak rol güvenliği testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
