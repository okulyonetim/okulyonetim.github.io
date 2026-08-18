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
      await setDoc(doc(db,'oy_kullanicilar','userA'),{uid:'userA',admin:false,aktif:true});
      await setDoc(doc(db,'oy_kullanicilar','userB'),{uid:'userB',admin:false,aktif:true});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_kullaniciTercihleri','userA'),{renkPaketi:'teal'});
    });

    const a = env.authenticatedContext('userA').firestore();
    const b = env.authenticatedContext('userB').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(a,'oy_kullaniciTercihleri','userA')));
    await assertFails(getDoc(doc(b,'oy_kullaniciTercihleri','userA')));
    await assertFails(getDoc(doc(anon,'oy_kullaniciTercihleri','userA')));

    await assertSucceeds(setDoc(doc(a,'oy_kullaniciTercihleri','userA'),{renkPaketi:'mor'},{merge:true}));
    await assertFails(setDoc(doc(a,'oy_kullaniciTercihleri','userB'),{renkPaketi:'mavi'},{merge:true}));
    await assertFails(updateDoc(doc(b,'oy_kullaniciTercihleri','userA'),{renkPaketi:'kirmizi'}));

    await assertSucceeds(getDoc(doc(admin,'oy_kullaniciTercihleri','userA')));
    await assertSucceeds(updateDoc(doc(admin,'oy_kullaniciTercihleri','userA'),{renkPaketi:'yesil'}));

    console.log('Kullanıcı tercihleri sahiplik testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
