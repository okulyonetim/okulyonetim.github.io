const admin = require('firebase-admin');
const express = require('express');

const app = express();
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Cron-Secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
let dbReady = false;
let db;
let kontrolCalisiyor = false;
const CHECKPOINT_COLLECTION = 'oy_sistem';
const CHECKPOINT_DOC = 'bildirimKontrol';
const MESSAGE_LOOKBACK_MS = 60 * 60 * 1000;

function firebaseBaslat() {
  if (dbReady) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT eksik!');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  db = admin.firestore();
  dbReady = true;
}

function pad(n) { return String(n).padStart(2, '0'); }
function turkiyeSimdi() {
  const simdi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return {
    tarihISO: `${simdi.getUTCFullYear()}-${pad(simdi.getUTCMonth() + 1)}-${pad(simdi.getUTCDate())}`,
    saatHHMM: `${pad(simdi.getUTCHours())}:${pad(simdi.getUTCMinutes())}`
  };
}

async function sifreyiDogrudanGuncelle(req, res) {
  try {
    firebaseBaslat();
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return res.status(401).json({ ok: false, hata: 'Oturum doğrulanamadı.' });

    const decoded = await admin.auth().verifyIdToken(token);
    const isteyenUid = String(decoded.uid || '').trim();
    if (!isteyenUid) return res.status(401).json({ ok: false, hata: 'Oturum doğrulanamadı.' });

    const isteyenSnap = await db.collection('oy_kullanicilar').doc(isteyenUid).get();
    const isteyen = isteyenSnap.exists ? isteyenSnap.data() || {} : null;
    if (!isteyen || isteyen.admin !== true || isteyen.aktif === false) {
      return res.status(403).json({ ok: false, hata: 'Şifre sıfırlama yetkisi yalnız Süper Admin içindir.' });
    }

    const hedefUid = String(req.body?.hedefUid || '').trim();
    const yeniSifre = String(req.body?.yeniSifre || '');
    if (!hedefUid) return res.status(400).json({ ok: false, hata: 'Hedef kullanıcı UID bulunamadı.' });
    if (hedefUid === isteyenUid) return res.status(400).json({ ok: false, hata: 'Kendi şifrenizi Profilim bölümünden değiştirin.' });
    if (yeniSifre.length < 6) return res.status(400).json({ ok: false, hata: 'Şifre en az 6 karakter olmalıdır.' });

    const hedefAuth = await admin.auth().getUser(hedefUid);
    if (!hedefAuth.email) return res.status(400).json({ ok: false, hata: 'Hedef kullanıcının giriş hesabı bulunamadı.' });

    await admin.auth().updateUser(hedefUid, { password: yeniSifre });
    console.log(`Admin parola güncellemesi tamamlandı: ${hedefUid}`);
    return res.status(200).json({ ok: true, completed: true });
  } catch (err) {
    console.error('Doğrudan şifre güncelleme hatası:', err.stack || err.message);
    const code = String(err?.code || '');
    if (code.includes('auth/id-token-expired') || code.includes('auth/invalid-id-token') || code.includes('auth/argument-error')) {
      return res.status(401).json({ ok: false, hata: 'Oturum süresi dolmuş. Lütfen yeniden giriş yapın.' });
    }
    if (code.includes('auth/user-not-found')) return res.status(404).json({ ok: false, hata: 'Hedef kullanıcı bulunamadı.' });
    if (code.includes('auth/password-does-not-meet-requirements')) return res.status(400).json({ ok: false, hata: 'Yeni şifre Firebase parola kurallarını karşılamıyor.' });
    return res.status(500).json({ ok: false, hata: String(err?.message || 'Şifre güncellenemedi.').slice(0, 300) });
  }
}

async function getMessageCheckpoint() {
  const snap = await db.collection(CHECKPOINT_COLLECTION).doc(CHECKPOINT_DOC).get();
  if (!snap.exists) return new Date(Date.now() - MESSAGE_LOOKBACK_MS).toISOString();
  return String(snap.data()?.sonMesajKontrolTarihi || new Date(Date.now() - MESSAGE_LOOKBACK_MS).toISOString());
}

async function setMessageCheckpoint(value) {
  if (!value) return;
  await db.collection(CHECKPOINT_COLLECTION).doc(CHECKPOINT_DOC).set({
    sonMesajKontrolTarihi: value,
    guncellenmeZamani: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function fcmMulticastInChunks(tokens, data, onResponse) {
  const CHUNK = 500;
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    const response = await admin.messaging().sendEachForMulticast({ tokens: chunk, data });
    response.responses.forEach((r, j) => onResponse?.(r, chunk[j]));
  }
}


// ---- Aylık (periyodik) işler: kuralları aylık otomatik üret + bitişten önce hatırlat ----
// Üretim kimliği uygulamadaki PeriyodikService ile aynıdır (pj_YYYYAA_kuralId): create() var olan kaydı ezmez.
function periyodikKuralId(g) {
  if (g && g.id) return String(g.id);
  return 'k_' + String((g && g.isAdi) || '').toLocaleLowerCase('tr').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function periyodikGunISO(y, a, g) {
  const son = new Date(Date.UTC(y, a + 1, 0)).getUTCDate();
  return `${y}-${pad(a + 1)}-${pad(Math.min(Math.max(Number(g) || 1, 1), son))}`;
}
function gunFarki(iso, bugun) {
  return Math.round((new Date(String(iso).slice(0, 10) + 'T00:00:00Z') - new Date(bugun + 'T00:00:00Z')) / 86400000);
}
async function periyodikAylikUret(bugun) {
  const sDoc = await db.collection('oy_periyodikSablon').doc('sablon').get();
  if (!sDoc.exists) return 0;
  const sablon = sDoc.data() || {};
  const engellenen = Array.isArray(sablon.engellenen) ? sablon.engellenen : [];
  const y = Number(bugun.slice(0, 4)), a = Number(bugun.slice(5, 7)) - 1, ay = bugun.slice(0, 7);
  const mevcut = await db.collection('oy_periyodikIsler').where('bitis', '>=', ay + '-01').get();
  const mevcutlar = mevcut.docs.map(d => ({ id: d.id, ...d.data() }));
  let n = 0;
  for (const g of (Array.isArray(sablon.gorevler) ? sablon.gorevler : [])) {
    if (!g || !g.isAdi || g.aktif === false) continue;
    if (Array.isArray(g.aylar) && g.aylar.length && !g.aylar.map(Number).includes(a + 1)) continue;
    const kid = periyodikKuralId(g), id = `pj_${ay.replace('-', '')}_${kid}`;
    if (engellenen.includes(id)) continue;
    const grup = p => p.ay || String(p.bitis || p.baslangic || '').slice(0, 7);
    if (mevcutlar.some(p => p.id === id || (p.kuralId === kid && grup(p) === ay) || (p.isAdi === g.isAdi && grup(p) === ay))) continue;
    const bitAy = Number(g.bitisGun) < Number(g.baslangicGun) ? a + 1 : a;
    const hg = Number.isFinite(Number(g.hatirlatGun)) ? Math.max(0, Math.min(30, Number(g.hatirlatGun))) : 3;
    try {
      await db.collection('oy_periyodikIsler').doc(id).create({
        isAdi: g.isAdi, baslangic: periyodikGunISO(y, a, g.baslangicGun), bitis: periyodikGunISO(y + (bitAy > 11 ? 1 : 0), bitAy % 12, g.bitisGun),
        not: g.not || '', kuralId: kid, otomatik: true, ay, hatirlatGun: hg, tamamlandi: false, bildirimGonderildi: false, onBildirimGonderildi: false,
        eklenmeTarihi: new Date().toISOString()
      });
      n++;
    } catch (e) { if (!String(e && e.message).includes('ALREADY_EXISTS') && e.code !== 6) console.warn('Aylık iş üretilemedi:', e.message); }
  }
  if (n) console.log(`Aylık işler üretildi: ${n}`);
  return n;
}
function ileriTarih(iso, gun) {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + gun);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

async function kontrolEt() {
  const { tarihISO: bugun, saatHHMM: saat } = turkiyeSimdi();
  const esikSimdi = `${bugun} ${saat}`;
  console.log(`Kontrol: ${esikSimdi}`);

  const gonderilecekler = [];

  const hSnap = await db.collection('oy_hatirlaticilar').where('tarih', '<=', bugun).limit(100).get();
  hSnap.forEach(doc => {
    const v = doc.data() || {};
    if (v.tamamlandi || v.bildirimGonderildi || !v.tarih) return;
    if (`${v.tarih} ${v.saat || '00:00'}` <= esikSimdi) gonderilecekler.push({ baslik: `⏰ Hatırlatıcı: ${v.baslik || ''}`, govde: v.aciklama || `${v.tarih}${v.saat ? ' ' + v.saat : ''}`, koleksiyon: 'oy_hatirlaticilar', docId: doc.id });
  });

  const gSnap = await db.collection('oy_gorevler').where('sonTarih', '<=', bugun).limit(100).get();
  gSnap.forEach(doc => {
    const v = doc.data() || {};
    if (v.durum === 'tamamlandi' || v.bildirimGonderildi || !v.sonTarih) return;
    gonderilecekler.push({ baslik: `✅ Görev Vadesi: ${v.baslik || ''}`, govde: v.aciklama || `Son tarih: ${v.sonTarih}`, koleksiyon: 'oy_gorevler', docId: doc.id });
  });

  // Periyodik işler: aylık otomatik üret, sonra "X gün önce" ve bitiş/gecikme bildirimlerini topla.
  await periyodikAylikUret(bugun).catch(e => console.warn('Aylık üretim hatası:', e.message));
  const pSnap = await db.collection('oy_periyodikIsler').where('bitis', '<=', ileriTarih(bugun, 30)).limit(300).get();
  pSnap.forEach(doc => {
    const v = doc.data() || {};
    if (v.tamamlandi || !v.bitis) return;
    const fark = gunFarki(v.bitis, bugun), hg = Number.isFinite(Number(v.hatirlatGun)) ? Number(v.hatirlatGun) : 3;
    if (fark > 0 && hg > 0 && fark <= hg && !v.onBildirimGonderildi) {
      gonderilecekler.push({ baslik: `⏳ Aylık İş: ${v.isAdi || ''}`, govde: `${fark} gün kaldı (son gün ${v.bitis})`, koleksiyon: 'oy_periyodikIsler', docId: doc.id, alan: 'onBildirimGonderildi' });
    } else if (fark <= 0 && !v.bildirimGonderildi) {
      gonderilecekler.push({ baslik: `📋 Aylık İş: ${v.isAdi || ''}`, govde: fark === 0 ? 'Bugün son gün' : `${-fark} gün gecikti`, koleksiyon: 'oy_periyodikIsler', docId: doc.id, alan: 'bildirimGonderildi' });
    }
  });

  const checkpoint = await getMessageCheckpoint();
  const kSnap = await db.collection('oy_konusmalar')
    .where('sonMesaj.tarih', '>', checkpoint)
    .orderBy('sonMesaj.tarih', 'asc')
    .limit(100)
    .get();
  const mesajAdaylari = kSnap.docs
    .map(doc => ({ doc, data: doc.data() || {} }))
    .filter(x => x.data.sonMesaj?.tarih && x.data.sonMesaj.tarih > (x.data.sonBildirilenMesajTarihi || ''));

  let tokenDocs = [];
  let tokens = [];
  if (gonderilecekler.length || mesajAdaylari.length) {
    const cSnap = await db.collection('oy_cihazTokenleri').limit(1000).get();
    tokenDocs = cSnap.docs.map(d => ({ id: d.id, token: d.data()?.token, uid: d.data()?.uid || null })).filter(x => x.token);
    tokens = tokenDocs.map(x => x.token);
  }

  const gecersiz = new Set();
  for (const item of gonderilecekler) {
    if (tokens.length) {
      try {
        await fcmMulticastInChunks(tokens, { kategori: 'takvim', baslik: item.baslik, icerik: item.govde }, (r, token) => {
          if (!r.success) {
            const code = r.error?.code || '';
            if (code.includes('not-registered') || code.includes('invalid-registration')) gecersiz.add(token);
            console.warn('FCM token hatası:', code);
          }
        });
      } catch (err) { console.error('FCM hatası:', err.message); }
    }
    await db.collection(item.koleksiyon).doc(item.docId).update({ [item.alan || 'bildirimGonderildi']: true });
  }

  let mesajGonderilen = 0;
  let maxMesajTarihi = checkpoint;
  for (const aday of mesajAdaylari) {
    const kDoc = aday.doc;
    const k = aday.data;
    const mesaj = k.sonMesaj;
    if (mesaj.tarih > maxMesajTarihi) maxMesajTarihi = mesaj.tarih;
    const aliciUidler = (k.katilimciUidler || []).filter(uid => uid !== mesaj.gonderenUid);
    const aliciTokenlari = tokenDocs.filter(t => t.uid && aliciUidler.includes(t.uid)).map(t => t.token);
    if (aliciTokenlari.length) {
      const baslik = k.grupMu ? `${k.grupAdi || 'Grup'} — ${k.katilimciAdlari?.[mesaj.gonderenUid] || 'Biri'}` : (k.katilimciAdlari?.[mesaj.gonderenUid] || 'Yeni mesaj');
      try {
        await fcmMulticastInChunks(aliciTokenlari, { kategori: 'mesaj', baslik: `💬 ${baslik}`, icerik: String(mesaj.metin || '').slice(0, 120) }, (r, token) => {
          if (!r.success) {
            const code = r.error?.code || '';
            if (code.includes('not-registered') || code.includes('invalid-registration')) gecersiz.add(token);
          }
        });
        mesajGonderilen++;
      } catch (err) { console.error('Mesaj FCM hatası:', err.message); }
    }
    await kDoc.ref.update({ sonBildirilenMesajTarihi: mesaj.tarih });
  }

  if (kSnap.docs.length) await setMessageCheckpoint(maxMesajTarihi);
  for (const token of gecersiz) {
    const match = tokenDocs.find(x => x.token === token);
    if (match) await db.collection('oy_cihazTokenleri').doc(match.id).delete();
  }

  return { gonderilen: gonderilecekler.length, mesajBildirimGonderilen: mesajGonderilen };
}

app.get('/', (_req, res) => res.status(200).send('OK'));
app.post('/sifre-guncelle', sifreyiDogrudanGuncelle);
app.get('/kontrol', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] !== secret) return res.status(401).send('Unauthorized');
  if (kontrolCalisiyor) return res.status(200).json({ ok: true, skipped: true, reason: 'already-running' });
  kontrolCalisiyor = true;
  try {
    firebaseBaslat();
    const sonuc = await kontrolEt();
    res.status(200).json({ ok: true, ...sonuc });
  } catch (err) {
    console.error('Hata:', err.stack || err.message);
    res.status(500).json({ ok: false, hata: err.message });
  } finally { kontrolCalisiyor = false; }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu çalışıyor: port ${PORT}`));