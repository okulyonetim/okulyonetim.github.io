const fs = require('fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main(){
  const rules = fs.readFileSync('firestore.rules','utf8');
  const testEnv = await initializeTestEnvironment({ projectId:PROJECT_ID, firestore:{rules} });
  try {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async context => {
      const db=context.firestore();
      await setDoc(doc(db,'oy_roller','rol-viewer'),{yetkiler:{yoklama:'goruntule'}});
      await setDoc(doc(db,'oy_roller','rol-hidden'),{yetkiler:{yoklama:'gizle'}});
      await setDoc(doc(db,'oy_kullanicilar','teacher1'),{uid:'teacher1',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','teacher2'),{uid:'teacher2',admin:false,aktif:true,rolId:'rol-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','hiddenUid'),{uid:'hiddenUid',admin:false,aktif:true,rolId:'rol-hidden'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});
    });

    const t1=testEnv.authenticatedContext('teacher1').firestore();
    const t2=testEnv.authenticatedContext('teacher2').firestore();
    const hidden=testEnv.authenticatedContext('hiddenUid').firestore();
    const admin=testEnv.authenticatedContext('adminUid').firestore();
    const anon=testEnv.unauthenticatedContext().firestore();
    const ref1=doc(t1,'oy_yoklama','s1_2026-08-18');

    // Repository'nin ilk set(merge) davranışını taklit et: belge yalnız sinifId+tarih ile oluşur.
    await assertSucceeds(setDoc(ref1,{sinifId:'s1',tarih:'2026-08-18'}));
    await assertSucceeds(updateDoc(ref1,{
      'kayitlar.o1':'yok',girenUid:'teacher1',girenAdi:'Öğretmen 1',guncellenmeTarihi:'2026-08-18T10:00:00Z'
    }));
    await assertSucceeds(getDoc(ref1));
    await assertFails(getDoc(doc(anon,'oy_yoklama','s1_2026-08-18')));

    // Modülü gizli kullanıcı yazamaz; okuma mevcut ortak rapor davranışı için açık kalır.
    await assertSucceeds(getDoc(doc(hidden,'oy_yoklama','s1_2026-08-18')));
    await assertFails(updateDoc(doc(hidden,'oy_yoklama','s1_2026-08-18'),{'kayitlar.o2':'var'}));

    // İkinci öğretmenin repository ön-set çağrısı mevcut girenUid yüzünden engellenmemeli.
    await assertSucceeds(setDoc(doc(t2,'oy_yoklama','s1_2026-08-18'),{sinifId:'s1',tarih:'2026-08-18'},{merge:true}));
    await assertSucceeds(updateDoc(doc(t2,'oy_yoklama','s1_2026-08-18'),{
      'kayitlar.o2':'gec',girenUid:'teacher2',girenAdi:'Öğretmen 2',guncellenmeTarihi:'2026-08-18T10:05:00Z'
    }));

    // Kimlik sahteciliği, tarih/sınıf taşıma ve admin alanına müdahale reddedilir.
    await assertFails(updateDoc(ref1,{girenUid:'teacher2'}));
    await assertFails(updateDoc(ref1,{tarih:'2026-08-19'}));
    await assertFails(updateDoc(ref1,{'mesajGonderildi.o1':true}));
    await assertFails(deleteDoc(ref1));

    // Admin veli mesajı işaretini ve silmeyi yönetebilir.
    await assertSucceeds(updateDoc(doc(admin,'oy_yoklama','s1_2026-08-18'),{'mesajGonderildi.o1':true}));
    await assertSucceeds(deleteDoc(doc(admin,'oy_yoklama','s1_2026-08-18')));

    // Belge kimliği sinifId+tarih ile uyuşmalı.
    await assertFails(setDoc(doc(t1,'oy_yoklama','yanlis-id'),{sinifId:'s2',tarih:'2026-08-18'}));

    console.log('Yoklama güvenliği testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
