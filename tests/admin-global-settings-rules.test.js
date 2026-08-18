const fs = require('fs');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore:{ rules } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db,'oy_kullanicilar','adminUid'), { uid:'adminUid', admin:true, aktif:true });
      await setDoc(doc(db,'oy_kullanicilar','userUid'), { uid:'userUid', admin:false, aktif:true });
      await setDoc(doc(db,'oy_depolamaAyarlari','ayarlar'), { mesaj:{aktif:true,MB:100} });
      await setDoc(doc(db,'oy_hatirlatmaAyarlari','ayarlar'), { gunSayisi:3, erteleSaat:4 });
    });

    const adminDb = env.authenticatedContext('adminUid').firestore();
    const userDb = env.authenticatedContext('userUid').firestore();
    const anonDb = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(userDb,'oy_depolamaAyarlari','ayarlar')));
    await assertSucceeds(getDoc(doc(userDb,'oy_hatirlatmaAyarlari','ayarlar')));
    await assertFails(getDoc(doc(anonDb,'oy_depolamaAyarlari','ayarlar')));

    await assertFails(updateDoc(doc(userDb,'oy_depolamaAyarlari','ayarlar'), { mesaj:{aktif:false,MB:50} }));
    await assertFails(updateDoc(doc(userDb,'oy_hatirlatmaAyarlari','ayarlar'), { gunSayisi:10 }));

    await assertSucceeds(updateDoc(doc(adminDb,'oy_depolamaAyarlari','ayarlar'), { mesaj:{aktif:false,MB:50} }));
    await assertSucceeds(updateDoc(doc(adminDb,'oy_hatirlatmaAyarlari','ayarlar'), { gunSayisi:10 }));

    console.log('Merkezi admin ayarları testleri başarılı.');
  } finally {
    await env.cleanup();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
