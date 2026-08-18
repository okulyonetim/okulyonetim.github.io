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
      await setDoc(doc(db,'oy_roller','okul-editor'),{yetkiler:{okulBilgileri:'duzenle'}});
      await setDoc(doc(db,'oy_roller','okul-viewer'),{yetkiler:{okulBilgileri:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'okul-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'okul-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_okulBilgileri','ayarlar'),{okulAdi:'Koruk Ortaokulu',il:'ELAZIĞ'});
    });

    const editor = env.authenticatedContext('editorUid').firestore();
    const viewer = env.authenticatedContext('viewerUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_okulBilgileri','ayarlar')));
    await assertFails(getDoc(doc(anon,'oy_okulBilgileri','ayarlar')));
    await assertSucceeds(updateDoc(doc(editor,'oy_okulBilgileri','ayarlar'),{ilce:'KARAKOÇAN'}));
    await assertFails(updateDoc(doc(viewer,'oy_okulBilgileri','ayarlar'),{ilce:'MERKEZ'}));
    await assertSucceeds(updateDoc(doc(admin,'oy_okulBilgileri','ayarlar'),{ilce:'KARAKOÇAN'}));

    console.log('Okul Bilgileri rol güvenliği testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
