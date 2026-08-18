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
      await setDoc(doc(db,'oy_kullanicilar','u1'),{uid:'u1',admin:false,aktif:true});
      await setDoc(doc(db,'oy_kullanicilar','u2'),{uid:'u2',admin:false,aktif:true});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_cihazTokenleri','token1'),{token:'token1',uid:'u1',kategoriler:['genel']});
      await setDoc(doc(db,'oy_cihazTokenleri','legacy'),{token:'legacy',kategoriler:['genel']});
    });

    const u1 = env.authenticatedContext('u1').firestore();
    const u2 = env.authenticatedContext('u2').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(u1,'oy_cihazTokenleri','token1')));
    await assertFails(getDoc(doc(u2,'oy_cihazTokenleri','token1')));
    await assertFails(getDoc(doc(anon,'oy_cihazTokenleri','token1')));
    await assertSucceeds(getDoc(doc(admin,'oy_cihazTokenleri','token1')));

    await assertSucceeds(setDoc(doc(u1,'oy_cihazTokenleri','token2'),{token:'token2',uid:'u1',kategoriler:['duyuru']}));
    await assertFails(setDoc(doc(u1,'oy_cihazTokenleri','spoof'),{token:'spoof',uid:'u2'}));
    await assertSucceeds(updateDoc(doc(u1,'oy_cihazTokenleri','token1'),{kategoriler:['haber']}));
    await assertFails(updateDoc(doc(u2,'oy_cihazTokenleri','token1'),{kategoriler:['haber']}));
    await assertFails(updateDoc(doc(u1,'oy_cihazTokenleri','token1'),{uid:'u2'}));
    await assertSucceeds(updateDoc(doc(u1,'oy_cihazTokenleri','legacy'),{uid:'u1',kategoriler:['haber']}));
    await assertFails(updateDoc(doc(u2,'oy_cihazTokenleri','token1'),{uid:'u2'}));
    await assertSucceeds(deleteDoc(doc(u1,'oy_cihazTokenleri','token1')));

    console.log('Cihaz token sahiplik testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
