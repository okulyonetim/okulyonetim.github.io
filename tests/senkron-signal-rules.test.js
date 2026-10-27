const fs = require('fs');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, deleteDoc, updateDoc, increment } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

/* Değişim işareti (oy_senkron/degisim): girişli herkes okur; kayıtlı kullanıcı yalnız r/s/d alanlarını yazar; silinemez. */
async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db,'oy_kullanicilar','userA'),{uid:'userA',admin:false,aktif:true});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_senkron','degisim'),{r:{ogretmenler:1}});
    });

    const a = env.authenticatedContext('userA').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const stranger = env.authenticatedContext('kayitsiz').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(a,'oy_senkron','degisim')));
    await assertSucceeds(getDoc(doc(stranger,'oy_senkron','degisim')));
    await assertFails(getDoc(doc(anon,'oy_senkron','degisim')));

    await assertSucceeds(setDoc(doc(a,'oy_senkron','degisim'),{r:{ogretmenler:increment(1)},s:{ogretmenler:'sekme-1'},d:{ogretmenler:{t1:Date.now()}}},{merge:true}));
    await assertSucceeds(setDoc(doc(admin,'oy_senkron','degisim'),{r:{siniflar:increment(1)}},{merge:true}));
    await assertSucceeds(updateDoc(doc(a,'oy_senkron','degisim'),{'r.nobetAtamalari':increment(1)}));

    await assertFails(setDoc(doc(a,'oy_senkron','degisim'),{baska:'alan'},{merge:true}));
    await assertFails(setDoc(doc(a,'oy_senkron','baska'),{r:{ogretmenler:1}}));
    await assertFails(setDoc(doc(stranger,'oy_senkron','degisim'),{r:{ogretmenler:1}},{merge:true}));
    await assertFails(setDoc(doc(anon,'oy_senkron','degisim'),{r:{ogretmenler:1}},{merge:true}));
    await assertFails(deleteDoc(doc(a,'oy_senkron','degisim')));
    await assertFails(deleteDoc(doc(admin,'oy_senkron','degisim')));

    console.log('Değişim işareti (oy_senkron) kural testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
