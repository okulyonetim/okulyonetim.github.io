/* ====================================================================
   BİLDİRİM KONTROL BETİĞİ – HTTP SUNUCU MODU
   Render.com üzerinde çalışır. cron-job.org her 1 dakikada bir
   /kontrol endpoint'ini çağırır.

   Gerekli ortam değişkenleri (Render.com > Environment):
     FIREBASE_SERVICE_ACCOUNT  → Firebase service account JSON içeriği
     CRON_SECRET               → cron-job.org ile paylaşılan gizli anahtar
   ==================================================================== */

const admin   = require('firebase-admin');
const express = require('express');

const app  = express();
let dbReady = false;
let db;
let kontrolCalisiyor = false;

// Firebase'i bir kez başlat
function firebaseBaslat() {
  if (dbReady) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) { console.error('FIREBASE_SERVICE_ACCOUNT eksik!'); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  db = admin.firestore();
  dbReady = true;
}

function pad(n) { return n.toString().padStart(2, '0'); }

function turkiyeSimdi() {
  const simdi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const tarihISO  = `${simdi.getUTCFullYear()}-${pad(simdi.getUTCMonth()+1)}-${pad(simdi.getUTCDate())}`;
  const saatHHMM  = `${pad(simdi.getUTCHours())}:${pad(simdi.getUTCMinutes())}`;
  return { tarihISO, saatHHMM };
}

async function kontrolEt() {
  const { tarihISO: bugun, saatHHMM: saat } = turkiyeSimdi();
  const esikSimdi = `${bugun} ${saat}`;
  console.log(`Kontrol: ${esikSimdi}`);

  const gonderilecekler = [];

  // ------------------------------------------------------------------
  // ÖNEMLİ KOTA OPTİMİZASYONU
  // Eski sürüm bu üç koleksiyonun tamamını her dakika okuyordu (.get()).
  // Bu, kayıt sayısı büyüdükçe günlük Firestore okuma kotasını tüketiyordu.
  // Sadece vadesi gelmiş olabilecek kayıtlar sorgulanıyor.
  // ------------------------------------------------------------------

  // Hatırlatıcılar: yalnızca bugün veya geçmiş tarihli kayıtlar.
  const hSnap = await db.collection('oy_hatirlaticilar')
    .where('tarih', '<=', bugun)
    .get();
  hSnap.forEach(doc => {
    const v = doc.data() || {};
    if (v.tamamlandi || v.bildirimGonderildi || !v.tarih) return;
    const esik = `${v.tarih} ${v.saat || '00:00'}`;
    if (esik <= esikSimdi) {
      gonderilecekler.push({
        baslik: `⏰ Hatırlatıcı: ${v.baslik || ''}`,
        govde:  v.aciklama || `${v.tarih}${v.saat ? ' ' + v.saat : ''}`,
        koleksiyon: 'oy_hatirlaticilar', docId: doc.id
      });
    }
  });

  // Görevler: yalnızca son tarihi bugün veya geçmiş olanlar.
  const gSnap = await db.collection('oy_gorevler')
    .where('sonTarih', '<=', bugun)
    .get();
  gSnap.forEach(doc => {
    const v = doc.data() || {};
    if (v.durum === 'tamamlandi' || v.bildirimGonderildi || !v.sonTarih) return;
    gonderilecekler.push({
      baslik: `✅ Görev Vadesi: ${v.baslik || ''}`,
      govde:  v.aciklama || `Son tarih: ${v.sonTarih}`,
      koleksiyon: 'oy_gorevler', docId: doc.id
    });
  });

  // Periyodik işler: yalnızca bitiş tarihi bugün veya geçmiş olanlar.
  const pSnap = await db.collection('oy_periyodikIsler')
    .where('bitis', '<=', bugun)
    .get();
  pSnap.forEach(doc => {
    const v = doc.data() || {};
    if (v.tamamlandi || v.bildirimGonderildi || !v.bitis) return;
    gonderilecekler.push({
      baslik: `📋 Periyodik İş: ${v.isAdi || ''}`,
      govde:  v.not || `Bitiş: ${v.bitis}`,
      koleksiyon: 'oy_periyodikIsler', docId: doc.id
    });
  });

  if (gonderilecekler.length === 0) {
    console.log('Genel bildirim yok.');
  }

  // ------------------------------------------------------------------
  // Mesajlaşma: bütün konuşmaları okumak yerine en güncel konuşmaları
  // sırayla alıyoruz. Böylece eski/çok büyük konuşma koleksiyonlarında
  // her dakika binlerce doküman okunmasının önüne geçilir.
  // ------------------------------------------------------------------
  const mesajAdaylari = [];
  const kSnap = await db.collection('oy_konusmalar')
    .orderBy('sonMesaj.tarih', 'desc')
    .limit(100)
    .get();

  for (const kDoc of kSnap.docs) {
    const k = kDoc.data() || {};
    if (!k.sonMesaj || !k.sonMesaj.tarih) continue;
    const sonBildirilen = k.sonBildirilenMesajTarihi || '';
    if (k.sonMesaj.tarih <= sonBildirilen) continue;
    mesajAdaylari.push({ doc: kDoc, data: k });
  }

  // Token koleksiyonunu yalnızca gerçekten bildirim gönderilecekse oku.
  // Eski sürüm bunu her dakika, bildirim olmasa bile okuyordu.
  let tokenDocs = [];
  let tokens = [];
  if (gonderilecekler.length > 0 || mesajAdaylari.length > 0) {
    const cSnap = await db.collection('oy_cihazTokenleri').get();
    tokenDocs = cSnap.docs
      .map(d => ({ id: d.id, token: d.data().token, uid: d.data().uid || null }))
      .filter(t => t.token);
    tokens = tokenDocs.map(t => t.token);
  }

  const gecersiz = new Set();

  // Genel bildirimler
  for (const item of gonderilecekler) {
    if (tokens.length > 0) {
      try {
        const yanit = await admin.messaging().sendEachForMulticast({
          tokens,
          // Sadece data gönderilir; Android tarafındaki özel bildirim servisi çalışır.
          data: { kategori: 'takvim', baslik: item.baslik, icerik: item.govde }
        });
        yanit.responses.forEach((r, i) => {
          if (!r.success) {
            const kod = r.error?.code || '';
            if (kod.includes('not-registered') || kod.includes('invalid-registration')) {
              gecersiz.add(tokens[i]);
            }
            console.warn('FCM token hatası:', kod);
          }
        });
        console.log(`Gönderildi: "${item.baslik}" (${yanit.successCount}/${tokens.length})`);
      } catch (err) {
        console.error('FCM hatası:', err.message);
      }
    }
    await db.collection(item.koleksiyon).doc(item.docId).update({ bildirimGonderildi: true });
  }

  // Hedefli mesaj bildirimleri
  let mesajGonderilen = 0;
  for (const aday of mesajAdaylari) {
    const kDoc = aday.doc;
    const k = aday.data;
    const aliciUidler = (k.katilimciUidler || [])
      .filter(uid => uid !== k.sonMesaj.gonderenUid);
    const aliciTokenlari = tokenDocs
      .filter(t => t.uid && aliciUidler.includes(t.uid))
      .map(t => t.token);

    if (aliciTokenlari.length > 0) {
      const baslik = k.grupMu
        ? `${k.grupAdi || 'Grup'} — ${k.katilimciAdlari?.[k.sonMesaj.gonderenUid] || 'Biri'}`
        : (k.katilimciAdlari?.[k.sonMesaj.gonderenUid] || 'Yeni mesaj');
      try {
        const yanit = await admin.messaging().sendEachForMulticast({
          tokens: aliciTokenlari,
          data: {
            kategori: 'mesaj',
            baslik: `💬 ${baslik}`,
            icerik: String(k.sonMesaj.metin || '').slice(0, 120)
          }
        });
        yanit.responses.forEach((r, i) => {
          if (!r.success) {
            const kod = r.error?.code || '';
            if (kod.includes('not-registered') || kod.includes('invalid-registration')) {
              gecersiz.add(aliciTokenlari[i]);
            }
          }
        });
        mesajGonderilen++;
        console.log(`Mesaj bildirimi gönderildi: konuşma ${kDoc.id} (${yanit.successCount}/${aliciTokenlari.length})`);
      } catch (err) {
        console.error('Mesaj FCM hatası:', err.message);
      }
    }

    await kDoc.ref.update({ sonBildirilenMesajTarihi: k.sonMesaj.tarih });
  }

  // Geçersiz tokenları temizle
  if (gecersiz.size > 0) {
    for (const t of gecersiz) {
      const eslesen = tokenDocs.find(d => d.token === t);
      if (eslesen) {
        await db.collection('oy_cihazTokenleri').doc(eslesen.id).delete();
      }
    }
  }

  return {
    gonderilen: gonderilecekler.length,
    mesajBildirimGonderilen: mesajGonderilen
  };
}

// ── Sağlık kontrolü ──────────────────────────────────────────────────
app.get('/', (req, res) => res.send('OK'));

// ── Cron endpoint ─────────────────────────────────────────────────────
app.get('/kontrol', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] !== secret) {
    return res.status(401).send('Unauthorized');
  }

  // cron-job.org dakikada bir çağırıyor. Önceki çağrı hâlâ çalışıyorsa
  // ikinci bir tam Firestore taraması başlatma.
  if (kontrolCalisiyor) {
    console.warn('Kontrol atlandı: önceki kontrol hâlâ çalışıyor.');
    return res.status(200).json({ ok: true, skipped: true, reason: 'already-running' });
  }

  kontrolCalisiyor = true;
  try {
    firebaseBaslat();
    const sonuc = await kontrolEt();
    res.status(200).json({ ok: true, ...sonuc });
  } catch (err) {
    console.error('Hata:', err.message);
    res.status(500).json({ ok: false, hata: err.message });
  } finally {
    kontrolCalisiyor = false;
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu çalışıyor: port ${PORT}`));
