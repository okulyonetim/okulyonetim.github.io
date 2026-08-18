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
      await setDoc(doc(db,'oy_roller','sinav-editor'),{yetkiler:{sinavIslemleri:'duzenle'}});
      await setDoc(doc(db,'oy_roller','sinav-viewer'),{yetkiler:{sinavIslemleri:'goruntule'}});
      await setDoc(doc(db,'oy_kullanicilar','ownerUid'),{uid:'ownerUid',admin:false,aktif:true,rolId:'sinav-editor'});
      await setDoc(doc(db,'oy_kullanicilar','otherUid'),{uid:'otherUid',admin:false,aktif:true,rolId:'sinav-editor'});
      await setDoc(doc(db,'oy_kullanicilar','viewerUid'),{uid:'viewerUid',admin:false,aktif:true,rolId:'sinav-viewer'});
      await setDoc(doc(db,'oy_kullanicilar','adminUid'),{uid:'adminUid',admin:true,aktif:true});

      await setDoc(doc(db,'oy_sinavlar','ownedWritten'),{sinif:'5-A',ders:'Fen',sahipUid:'ownerUid'});
      await setDoc(doc(db,'oy_sinavlar','legacyWritten'),{sinif:'6-A',ders:'Matematik'});
      await setDoc(doc(db,'oy_denemeSinavlari','ownedTrial'),{ad:'Deneme 1',sahipUid:'ownerUid',sayacDurumu:{aktif:false}});
      await setDoc(doc(db,'oy_denemeSinavlari','legacyTrial'),{ad:'Eski Deneme',sayacDurumu:{aktif:false}});
    });

    const owner = env.authenticatedContext('ownerUid').firestore();
    const other = env.authenticatedContext('otherUid').firestore();
    const viewer = env.authenticatedContext('viewerUid').firestore();
    const admin = env.authenticatedContext('adminUid').firestore();
    const anon = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(viewer,'oy_sinavlar','ownedWritten')));
    await assertFails(getDoc(doc(anon,'oy_sinavlar','ownedWritten')));

    // Yeni kayıt sahibiyle damgalanmalı; başka UID adına kayıt açılamaz.
    await assertSucceeds(setDoc(doc(owner,'oy_sinavlar','newWritten'),{sinif:'7-A',ders:'Türkçe',sahipUid:'ownerUid'}));
    await assertFails(setDoc(doc(owner,'oy_sinavlar','spoofWritten'),{sinif:'7-B',ders:'Türkçe',sahipUid:'otherUid'}));
    await assertSucceeds(setDoc(doc(owner,'oy_denemeSinavlari','newTrial'),{ad:'Deneme 2',sahipUid:'ownerUid'}));
    await assertFails(setDoc(doc(viewer,'oy_denemeSinavlari','viewerTrial'),{ad:'Yetkisiz',sahipUid:'viewerUid'}));

    // Sahip kendi kaydını yönetir; başka editör sahipli kaydı değiştiremez.
    await assertSucceeds(updateDoc(doc(owner,'oy_sinavlar','ownedWritten'),{ders:'Fen Bilimleri'}));
    await assertFails(updateDoc(doc(other,'oy_sinavlar','ownedWritten'),{ders:'Yetkisiz'}));
    await assertFails(deleteDoc(doc(other,'oy_denemeSinavlari','ownedTrial')));

    // Eski sahipsiz kayıtlar mevcut davranış gereği editörlerce düzenlenebilir/silinebilir.
    await assertSucceeds(updateDoc(doc(other,'oy_sinavlar','legacyWritten'),{ders:'Güncel Matematik'}));
    await assertSucceeds(updateDoc(doc(other,'oy_denemeSinavlari','legacyTrial'),{ad:'Güncel Eski Deneme'}));

    // Ancak sayaç, sahipsiz legacy denemede bile yalnız admin; sahipli kayıtta yalnız sahibi/admin.
    await assertSucceeds(updateDoc(doc(owner,'oy_denemeSinavlari','ownedTrial'),{sayacDurumu:{aktif:true,baslatanUid:'ownerUid'}}));
    await assertFails(updateDoc(doc(other,'oy_denemeSinavlari','ownedTrial'),{sayacDurumu:{aktif:true,baslatanUid:'otherUid'}}));
    await assertFails(updateDoc(doc(other,'oy_denemeSinavlari','legacyTrial'),{sayacDurumu:{aktif:true,baslatanUid:'otherUid'}}));

    // sahipUid sonradan değiştirilemez/eklenemez.
    await assertFails(updateDoc(doc(owner,'oy_sinavlar','ownedWritten'),{sahipUid:'otherUid'}));
    await assertFails(updateDoc(doc(other,'oy_sinavlar','legacyWritten'),{sahipUid:'otherUid'}));

    await assertSucceeds(deleteDoc(doc(admin,'oy_sinavlar','ownedWritten')));
    await assertSucceeds(updateDoc(doc(admin,'oy_denemeSinavlari','legacyTrial'),{sayacDurumu:{aktif:true,baslatanUid:'adminUid'}}));

    console.log('Sınav İşlemleri rol ve sahiplik testleri başarılı.');
  } finally { await env.cleanup(); }
}

main().catch(err=>{ console.error(err); process.exit(1); });
