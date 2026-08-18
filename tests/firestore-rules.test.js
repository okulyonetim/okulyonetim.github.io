const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'demo-okul-rules';

async function main() {
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  const testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules } });

  try {
    await testEnv.clearFirestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'oy_kullanicilar', 'adminUid'), { uid:'adminUid', admin:true, aktif:true, bagliOgretmenId:'ogretmenAdmin' });
      await setDoc(doc(db, 'oy_kullanicilar', 'teacherUid'), { uid:'teacherUid', admin:false, aktif:true, rolId:'ogretmen', bagliOgretmenId:'ogretmen42' });
      await setDoc(doc(db, 'oy_kullanicilar', 'teacher2Uid'), { uid:'teacher2Uid', admin:false, aktif:true, rolId:'ogretmen', bagliOgretmenId:'ogretmen43' });
      await setDoc(doc(db, 'oy_kullanicilar', 'outsiderUid'), { uid:'outsiderUid', admin:false, aktif:true, rolId:'ogretmen', bagliOgretmenId:'ogretmen44' });

      await setDoc(doc(db, 'oy_notlar', 'not-teacher'), { baslik:'Benim Notum', sahipUid:'teacherUid' });
      await setDoc(doc(db, 'oy_notlar', 'not-teacher2'), { baslik:'Başka Öğretmen', sahipUid:'teacher2Uid' });
      await setDoc(doc(db, 'oy_notlar', 'not-eski'), { baslik:'Eski Sahipsiz Not' });

      await setDoc(doc(db, 'oy_hatirlaticilar', 'hat-teacher'), { baslik:'Benim Hatırlatıcım', sahipUid:'teacherUid' });
      await setDoc(doc(db, 'oy_hatirlaticilar', 'hat-teacher2'), { baslik:'Başka Hatırlatıcı', sahipUid:'teacher2Uid' });
      await setDoc(doc(db, 'oy_hatirlaticilar', 'hat-eski'), { baslik:'Eski Sahipsiz Hatırlatıcı' });
      await setDoc(doc(db, 'oy_gorevler', 'gorev-teacher'), { baslik:'Benim Görevim', sahipUid:'teacherUid' });
      await setDoc(doc(db, 'oy_gorevler', 'gorev-teacher2'), { baslik:'Başka Görev', sahipUid:'teacher2Uid' });
      await setDoc(doc(db, 'oy_gorevler', 'gorev-eski'), { baslik:'Eski Sahipsiz Görev' });

      await setDoc(doc(db, 'oy_konusmalar', 'konusma12'), {
        katilimciUidler:['teacherUid','teacher2Uid'], katilimciAdlari:{teacherUid:'Ö1',teacher2Uid:'Ö2'},
        okunmayanlar:{teacherUid:0,teacher2Uid:0}, grupMu:false
      });
      await setDoc(doc(db, 'oy_mesajlar', 'mesaj12'), {
        konusmaId:'konusma12', gonderenUid:'teacherUid', gonderenAdi:'Ö1', metin:'Merhaba'
      });

      await setDoc(doc(db, 'oy_odevTakip', 'odev-teacher'), { ad:'Benim Ödev Çizelgem', sahipUid:'teacherUid', hucreler:{} });
      await setDoc(doc(db, 'oy_odevTakip', 'odev-teacher2'), { ad:'Başka Öğretmen', sahipUid:'teacher2Uid', hucreler:{} });
      await setDoc(doc(db, 'oy_notCizelgesi', 'not-cizelge-teacher'), { ad:'Benim Not Çizelgem', sahipUid:'teacherUid', hucreler:{} });
    });

    const adminDb = testEnv.authenticatedContext('adminUid').firestore();
    const teacherDb = testEnv.authenticatedContext('teacherUid').firestore();
    const teacher2Db = testEnv.authenticatedContext('teacher2Uid').firestore();
    const outsiderDb = testEnv.authenticatedContext('outsiderUid').firestore();
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(anonDb, 'oy_notlar', 'not-teacher')));

    // Notlar sahiplik güvenliği.
    await assertSucceeds(getDoc(doc(teacherDb, 'oy_notlar', 'not-teacher')));
    await assertFails(getDoc(doc(teacherDb, 'oy_notlar', 'not-teacher2')));
    await assertFails(getDoc(doc(teacherDb, 'oy_notlar', 'not-eski')));
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_notlar', 'not-yeni'), { baslik:'Yeni', sahipUid:'teacherUid' }));
    await assertFails(setDoc(doc(teacherDb, 'oy_notlar', 'not-sahte'), { baslik:'Sahte', sahipUid:'teacher2Uid' }));
    await assertSucceeds(updateDoc(doc(teacherDb, 'oy_notlar', 'not-teacher'), { baslik:'Güncellendi' }));
    await assertFails(updateDoc(doc(teacherDb, 'oy_notlar', 'not-teacher'), { sahipUid:'teacher2Uid' }));
    await assertFails(deleteDoc(doc(teacher2Db, 'oy_notlar', 'not-teacher')));
    await assertSucceeds(getDoc(doc(adminDb, 'oy_notlar', 'not-eski')));

    // Hatırlatıcı + görev sahipliği.
    await assertSucceeds(getDoc(doc(teacherDb, 'oy_hatirlaticilar', 'hat-teacher')));
    await assertFails(getDoc(doc(teacherDb, 'oy_hatirlaticilar', 'hat-teacher2')));
    await assertFails(getDoc(doc(teacherDb, 'oy_hatirlaticilar', 'hat-eski')));
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_hatirlaticilar', 'hat-yeni'), { baslik:'Yeni', sahipUid:'teacherUid' }));
    await assertFails(updateDoc(doc(teacherDb, 'oy_hatirlaticilar', 'hat-teacher'), { sahipUid:'teacher2Uid' }));
    await assertSucceeds(getDoc(doc(adminDb, 'oy_hatirlaticilar', 'hat-eski')));

    await assertSucceeds(getDoc(doc(teacherDb, 'oy_gorevler', 'gorev-teacher')));
    await assertFails(getDoc(doc(teacherDb, 'oy_gorevler', 'gorev-teacher2')));
    await assertFails(getDoc(doc(teacherDb, 'oy_gorevler', 'gorev-eski')));
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_gorevler', 'gorev-yeni'), { baslik:'Yeni', sahipUid:'teacherUid' }));
    await assertFails(updateDoc(doc(teacherDb, 'oy_gorevler', 'gorev-teacher'), { sahipUid:'teacher2Uid' }));
    await assertSucceeds(getDoc(doc(adminDb, 'oy_gorevler', 'gorev-eski')));

    // Mesajlaşma: yalnız konuşma katılımcısı erişebilmeli.
    await assertSucceeds(getDoc(doc(teacherDb, 'oy_konusmalar', 'konusma12')));
    await assertSucceeds(getDoc(doc(teacher2Db, 'oy_konusmalar', 'konusma12')));
    await assertFails(getDoc(doc(outsiderDb, 'oy_konusmalar', 'konusma12')));
    await assertSucceeds(getDoc(doc(adminDb, 'oy_konusmalar', 'konusma12')));

    // Katılımcı konuşma özetini güncelleyebilir ama katılımcı listesini değiştiremez.
    await assertSucceeds(updateDoc(doc(teacherDb, 'oy_konusmalar', 'konusma12'), { sonMesaj:{metin:'x',gonderenUid:'teacherUid'} }));
    await assertFails(updateDoc(doc(teacherDb, 'oy_konusmalar', 'konusma12'), { katilimciUidler:['teacherUid','teacher2Uid','outsiderUid'] }));

    // Yeni konuşmayı yalnız oluşturucunun kendisini de içeren katılımcı listesiyle oluşturabilmesi gerekir.
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_konusmalar', 'konusma-yeni'), { katilimciUidler:['teacherUid','teacher2Uid'], grupMu:false }));
    await assertFails(setDoc(doc(teacherDb, 'oy_konusmalar', 'konusma-sahte'), { katilimciUidler:['teacher2Uid','outsiderUid'], grupMu:false }));

    // Mesajlar konuşma üyeliğine bağlıdır ve gönderenUid sahteciliği engellenir.
    await assertSucceeds(getDoc(doc(teacherDb, 'oy_mesajlar', 'mesaj12')));
    await assertFails(getDoc(doc(outsiderDb, 'oy_mesajlar', 'mesaj12')));
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_mesajlar', 'mesaj-yeni'), { konusmaId:'konusma12', gonderenUid:'teacherUid', metin:'Yeni' }));
    await assertFails(setDoc(doc(teacherDb, 'oy_mesajlar', 'mesaj-sahte'), { konusmaId:'konusma12', gonderenUid:'teacher2Uid', metin:'Sahte' }));
    await assertFails(setDoc(doc(outsiderDb, 'oy_mesajlar', 'mesaj-disari'), { konusmaId:'konusma12', gonderenUid:'outsiderUid', metin:'Sahte' }));
    await assertSucceeds(deleteDoc(doc(teacher2Db, 'oy_mesajlar', 'mesaj12')));

    // Rol yönetimi, istatistik ve yıllık plan davranışı.
    await assertFails(setDoc(doc(teacherDb, 'oy_roller', 'rol-test'), { ad:'Test Rol' }));
    await assertSucceeds(setDoc(doc(adminDb, 'oy_roller', 'rol-test'), { ad:'Test Rol' }));
    await assertFails(setDoc(doc(teacherDb, 'oy_kullanicilar', 'baskaUid'), { admin:true }));
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_kullaniciIstatistikleri', 'teacherUid'), { giris:1 }));
    await assertFails(setDoc(doc(teacherDb, 'oy_kullaniciIstatistikleri', 'adminUid'), { giris:999 }));
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_ogretmenYillikPlanSecimleri', 'ogretmen42'), { planlar:['p1'] }));
    await assertFails(setDoc(doc(teacherDb, 'oy_ogretmenYillikPlanSecimleri', 'baskaOgretmen'), { planlar:['p1'] }));

    // Ödev Takip + Not Çizelgesi sahipliği.
    await assertSucceeds(getDoc(doc(teacherDb, 'oy_odevTakip', 'odev-teacher')));
    await assertFails(getDoc(doc(teacher2Db, 'oy_odevTakip', 'odev-teacher')));
    await assertSucceeds(updateDoc(doc(teacherDb, 'oy_odevTakip', 'odev-teacher'), { ad:'Güncellendi' }));
    await assertFails(updateDoc(doc(teacher2Db, 'oy_odevTakip', 'odev-teacher'), { ad:'Yetkisiz' }));
    await assertSucceeds(setDoc(doc(teacherDb, 'oy_odevTakip', 'odev-yeni'), { ad:'Yeni', sahipUid:'teacherUid' }));
    await assertFails(setDoc(doc(teacherDb, 'oy_odevTakip', 'odev-sahte'), { ad:'Sahte', sahipUid:'teacher2Uid' }));
    await assertFails(updateDoc(doc(teacherDb, 'oy_odevTakip', 'odev-teacher'), { sahipUid:'teacher2Uid' }));
    await assertSucceeds(getDoc(doc(teacherDb, 'oy_notCizelgesi', 'not-cizelge-teacher')));
    await assertFails(getDoc(doc(teacher2Db, 'oy_notCizelgesi', 'not-cizelge-teacher')));
    await assertSucceeds(updateDoc(doc(teacherDb, 'oy_notCizelgesi', 'not-cizelge-teacher'), { ad:'Not Güncellendi' }));
    await assertSucceeds(getDoc(doc(adminDb, 'oy_odevTakip', 'odev-teacher')));

    console.log('Firestore Rules testleri başarılı.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
