const fs = require('fs');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db,'oy_kullanicilar','userA'),{uid:'userA',admin:false,aktif:true,bagliOgretmenId:'ogA'});
      await setDoc(doc(db,'oy_kullanicilar','userB'),{uid:'userB',admin:false,aktif:true,bagliOgretmenId:'ogB'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_ogretmenListeSablon','sablonA'),{ogretmenId:'ogA',sinif:'5-A'});
      await setDoc(doc(db,'oy_ogretmenListeKayit','kayitA'),{ogretmenId:'ogA',sinif:'5-A',ad:'A Çizelgesi'});
      await setDoc(doc(db,'oy_ogretmenListeKayit','kayitB'),{ogretmenId:'ogB',sinif:'6-A',ad:'B Çizelgesi'});
    });

    const a = env.authenticatedContext('userA').firestore();
    const b = env.authenticatedContext('userB').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(a,'oy_ogretmenListeSablon','sablonA')));
    await assertFails(getDoc(doc(b,'oy_ogretmenListeSablon','sablonA')));
    await assertFails(getDoc(doc(anon,'oy_ogretmenListeSablon','sablonA')));

    await assertSucceeds(setDoc(doc(a,'oy_ogretmenListeSablon','newA'),{ogretmenId:'ogA',sinif:'7-A'}));
    await assertFails(setDoc(doc(a,'oy_ogretmenListeSablon','spoof'),{ogretmenId:'ogB',sinif:'7-B'}));
    await assertFails(updateDoc(doc(a,'oy_ogretmenListeSablon','sablonA'),{ogretmenId:'ogB'}));

    await assertSucceeds(getDocs(query(collection(a,'oy_ogretmenListeKayit'),where('ogretmenId','==','ogA'))));
    await assertSucceeds(getDoc(doc(a,'oy_ogretmenListeKayit','kayitA')));
    await assertFails(getDoc(doc(a,'oy_ogretmenListeKayit','kayitB')));
    await assertSucceeds(setDoc(doc(a,'oy_ogretmenListeKayit','newKayitA'),{ogretmenId:'ogA',sinif:'5-B',ad:'Yeni'}));
    await assertFails(setDoc(doc(a,'oy_ogretmenListeKayit','spoofKayit'),{ogretmenId:'ogB',sinif:'5-B',ad:'Sahte'}));
    await assertFails(updateDoc(doc(a,'oy_ogretmenListeKayit','kayitA'),{ogretmenId:'ogB'}));
    await assertSucceeds(deleteDoc(doc(a,'oy_ogretmenListeKayit','kayitA')));

    await assertSucceeds(getDoc(doc(admin,'oy_ogretmenListeKayit','kayitB')));
    await assertSucceeds(deleteDoc(doc(admin,'oy_ogretmenListeSablon','sablonA')));

    console.log('Öğretmen liste sahiplik testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
