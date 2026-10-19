/* ====================================================================
   BİLDİRİM KONTROL BETİĞİ – TEK SEFERLİK ÇALIŞTIRMA MODU
   GitHub Actions (.github/workflows/notify.yml) düzenli olarak
   bu dosyayı "node check-and-notify.js" ile çalıştırır, iş bitince
   process kapanır.

   Gerekli ortam değişkeni (GitHub > Settings > Secrets > Actions):
     FIREBASE_SERVICE_ACCOUNT  → Firebase service account JSON içeriği
   ==================================================================== */

const admin = require('firebase-admin');

let db;

function firebaseBaslat() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) { console.error('FIREBASE_SERVICE_ACCOUNT eksik!'); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  db = admin.firestore();
}

function pad(n) { return n.toString().padStart(2, '0'); }

function turkiyeSimdi() {
  const simdi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const tarihISO  = `${simdi.getUTCFullYear()}-${pad(simdi.getUTCMonth()+1)}-${pad(simdi.getUTCDate())}`;
  const saatHHMM  = `${pad(simdi.getUTCHours())}:${pad(simdi.getUTCMinutes())}`;
  return { tarihISO, saatHHMM };
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

  // Hatırlatıcılar: yalnızca vadesi gelmiş olabilecek kayıtları getir.
  const hSnap = await db.collection('oy_hatirlaticilar').where('tarih', '<=', bugun).get();
  hSnap.forEach(doc => {
    const v = doc.data();
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

  // Görevler: yalnızca son tarihi bugün veya daha eski kayıtları getir.
  const gSnap = await db.collection('oy_gorevler').where('sonTarih', '<=', bugun).get();
  gSnap.forEach(doc => {
    const v = doc.data();
    if (v.durum === 'tamamlandi' || v.bildirimGonderildi || !v.sonTarih) return;
    gonderilecekler.push({
      baslik: `✅ Görev Vadesi: ${v.baslik || ''}`,
      govde:  v.aciklama || `Son tarih: ${v.sonTarih}`,
      koleksiyon: 'oy_gorevler', docId: doc.id
    });
  });

  // Periyodik işler: aylık otomatik üret, sonra "X gün önce" ve bitiş/gecikme bildirimlerini topla.
  await periyodikAylikUret(bugun).catch(e => console.warn('Aylık üretim hatası:', e.message));
  const pSnap = await db.collection('oy_periyodikIsler').where('bitis', '<=', ileriTarih(bugun, 30)).get();
  pSnap.forEach(doc => {
    const v = doc.data();
    if (v.tamamlandi || !v.bitis) return;
    const fark = gunFarki(v.bitis, bugun), hg = Number.isFinite(Number(v.hatirlatGun)) ? Number(v.hatirlatGun) : 3;
    if (fark > 0 && hg > 0 && fark <= hg && !v.onBildirimGonderildi) {
      gonderilecekler.push({ baslik: `⏳ Aylık İş: ${v.isAdi || ''}`, govde: `${fark} gün kaldı (son gün ${v.bitis})`, koleksiyon: 'oy_periyodikIsler', docId: doc.id, alan: 'onBildirimGonderildi' });
    } else if (fark <= 0 && !v.bildirimGonderildi) {
      gonderilecekler.push({ baslik: `📋 Aylık İş: ${v.isAdi || ''}`, govde: fark === 0 ? 'Bugün son gün' : `${-fark} gün gecikti`, koleksiyon: 'oy_periyodikIsler', docId: doc.id, alan: 'bildirimGonderildi' });
    }
  });

  if (gonderilecekler.length === 0) {
    console.log('Genel bildirim yok.');
  }

  // FCM Tokenları (genel — hatırlatıcı/görev/periyodik için TÜM cihazlara gider)
  const cSnap = await db.collection('oy_cihazTokenleri').get();
  const tokenDocs = cSnap.docs.map(d => ({ id: d.id, token: d.data().token, uid: d.data().uid || null }));
  const tokens = tokenDocs.map(t => t.token).filter(Boolean);

  const gecersiz = new Set();

  for (const item of gonderilecekler) {
    if (tokens.length > 0) {
      try {
        const yanit = await admin.messaging().sendEachForMulticast({
          tokens,
          data: { kategori: 'takvim', baslik: item.baslik, icerik: item.govde }
        });
        yanit.responses.forEach((r, i) => {
          if (!r.success) {
            const kod = r.error?.code || '';
            if (kod.includes('not-registered') || kod.includes('invalid-registration')) {
              gecersiz.add(tokens[i]);
            }
            console.warn('Hata:', kod);
          }
        });
        console.log(`Gönderildi: "${item.baslik}" (${yanit.successCount}/${tokens.length})`);
      } catch (err) {
        console.error('FCM hatası:', err.message);
      }
    }
    await db.collection(item.koleksiyon).doc(item.docId).update({ [item.alan || 'bildirimGonderildi']: true });
  }

  // ---- Mesajlaşma bildirimleri (HEDEFLİ — sadece o konuşmanın katılımcılarına) ----
  let mesajGonderilen = 0;
  const kSnap = await db.collection('oy_konusmalar').get();
  for (const kDoc of kSnap.docs) {
    const k = kDoc.data();
    if (!k.sonMesaj || !k.sonMesaj.tarih) continue;
    const sonBildirilen = k.sonBildirilenMesajTarihi || '';
    if (k.sonMesaj.tarih <= sonBildirilen) continue;

    const aliciUidler = (k.katilimciUidler || []).filter(uid => uid !== k.sonMesaj.gonderenUid);
    const aliciTokenlari = tokenDocs.filter(t => t.uid && aliciUidler.includes(t.uid)).map(t => t.token);

    if (aliciTokenlari.length > 0) {
      const baslik = k.grupMu ? `${k.grupAdi || 'Grup'} — ${k.katilimciAdlari?.[k.sonMesaj.gonderenUid] || 'Biri'}` : (k.katilimciAdlari?.[k.sonMesaj.gonderenUid] || 'Yeni mesaj');
      try {
        const yanit = await admin.messaging().sendEachForMulticast({
          tokens: aliciTokenlari,
          data: { kategori: 'mesaj', baslik: `💬 ${baslik}`, icerik: k.sonMesaj.metin.slice(0, 120) }
        });
        yanit.responses.forEach((r, i) => {
          if (!r.success) {
            const kod = r.error?.code || '';
            if (kod.includes('not-registered') || kod.includes('invalid-registration')) gecersiz.add(aliciTokenlari[i]);
          }
        });
        mesajGonderilen++;
        console.log(`Mesaj bildirimi gönderildi: konuşma ${kDoc.id} (${yanit.successCount}/${aliciTokenlari.length})`);
      } catch (err) {
        console.error('Mesaj FCM hatası:', err.message);
      }
    }
    await db.collection('oy_konusmalar').doc(kDoc.id).update({ sonBildirilenMesajTarihi: k.sonMesaj.tarih });
  }

  // Geçersiz tokenları temizle
  for (const t of gecersiz) {
    const eslesen = tokenDocs.find(d => d.token === t);
    if (eslesen) await db.collection('oy_cihazTokenleri').doc(eslesen.id).delete();
  }

  return {
    gonderilen: gonderilecekler.length,
    mesajBildirimGonderilen: mesajGonderilen
  };
}

// ── Tek seferlik çalıştırma ──────────────────────────────────────────
(async () => {
  try {
    firebaseBaslat();
    const sonuc = await kontrolEt();
    console.log('Tamamlandı:', JSON.stringify(sonuc));
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err.message);
    process.exit(1);
  }
})();