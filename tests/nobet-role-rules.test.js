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
      await setDoc(doc(db,'oy_roller','nobet-editor'),{yetkiler:{nobet:'duzenle'}});
      await setDoc(doc(db,'oy_roller','nobet-viewer'),{yetkiler:{nobet:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','editorUid'),{uid:'editorUid',admin:false,aktif:true,rolId:'nobet-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'nobet-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','teacherUid'),{uid:'teacherUid',admin:false,aktif:true,rolId:'nobet-viewer',bagliOgretmenId:'ogr1'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
      await setDoc(doc(db,'oy_nobetYerleri','y1'),{ad:'Bahçe',sira:1});
      await setDoc(doc(db,'oy_nobetAtamalari','a1'),{tarih:'2026-08-18',yerId:'y1',ogretmenId:'ogr1',ogretmenAdSoyad:'Ali Öğretmen',defterDolduruldu:false});
      await setDoc(doc(db,'oy_nobetAtamalari','a2'),{tarih:'2026-08-19',yerId:'y1',ogretmenId:'ogr2',ogretmenAdSoyad:'Ayşe Öğretmen',defterDolduruldu:false});
      await setDoc(doc(db,'oy_nobetciAmirleri','m1'),{tarih:'2026-08-18',ad:'Müdür Yardımcısı'});
      await setDoc(doc(db,'oy_resmiTatiller','t1'),{tarih:'2026-08-30',aciklama:'Zafer Bayramı'});
      await setDoc(doc(db,'oy_nobetRotasyon','sablon'),{sonHafta:'2026-08-17'});
    });

    const editor = env.authenticatedContext('editorUid').firestore();
    const viewer = env.authenticatedContext('viewerUid').firestore();
    const teacher = env.authenticatedContext('teacherUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_nobetAtamalari','a1')));
    await assertFails(getDoc(doc(anon,'oy_nobetAtamalari','a1')));

    await assertSucceeds(setDoc(doc(editor,'oy_nobetYerleri','y2'),{ad:'Bina',sira:2}));
    await assertSucceeds(setDoc(doc(editor,'oy_nobetAtamalari','a3'),{tarih:'2026-08-20',yerId:'y2',ogretmenId:'ogr1'}));
    await assertSucceeds(updateDoc(doc(editor,'oy_nobetciAmirleri','m1'),{telefon:'05000000000'}));
    await assertSucceeds(deleteDoc(doc(editor,'oy_resmiTatiller','t1')));
    await assertSucceeds(setDoc(doc(editor,'oy_nobetRotasyon','sablon'),{sonHafta:'2026-08-24'}));

    await assertFails(updateDoc(doc(viewer,'oy_nobetYerleri','y1'),{ad:'Yetkisiz'}));
    await assertFails(deleteDoc(doc(viewer,'oy_nobetAtamalari','a2')));

    // Nöbetçi öğretmen yalnız kendi atamasındaki defter işaretini değiştirebilir.
    await assertSucceeds(updateDoc(doc(teacher,'oy_nobetAtamalari','a1'),{defterDolduruldu:true}));
    await assertFails(updateDoc(doc(teacher,'oy_nobetAtamalari','a1'),{yerId:'y2'}));
    await assertFails(updateDoc(doc(teacher,'oy_nobetAtamalari','a2'),{defterDolduruldu:true}));

    await assertSucceeds(deleteDoc(doc(admin,'oy_nobetAtamalari','a2')));
    console.log('Nöbet rol ve sahiplik testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
