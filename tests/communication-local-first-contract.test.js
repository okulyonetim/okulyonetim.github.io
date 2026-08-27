const fs=require('fs');
const assert=require('assert');

const communication=fs.readFileSync('js/modules/communication.js','utf8');
const rss=fs.readFileSync('scripts/rss-fetch.js','utf8');

// Communication UI/data layer must remain device-first.
assert(communication.includes("device().listen('konusmalar'"),'Konuşmalar DeviceData üzerinden dinlenmeli.');
assert(communication.includes("device().add('konusmalar'"),'Yeni konuşma DeviceData üzerinden yazılmalı.');
assert(communication.includes("device().listen('hatirlaticilar'"),'Takvim hatırlatıcıları DeviceData üzerinden açılmalı.');
assert(communication.includes("device().listen('anketler'"),'Anketler DeviceData üzerinden açılmalı.');
assert(communication.includes("device().listen('haberler'"),'Haberler DeviceData üzerinden açılmalı.');
assert(communication.includes('SyncEngine.localHydrate([type])'),'İletişim verisi Firestore beklenmeden localHydrate ile hazırlanmalı.');
assert(!/\bdb\s*\.\s*collection\s*\(/.test(communication),'Communication modülü doğrudan db.collection kullanmamalı.');
assert(!/firebase\.firestore\s*\(/.test(communication),'Communication modülü doğrudan firebase.firestore açmamalı.');

// Messaging ownership and offline-first operations must stay intact.
assert(communication.includes('mesajSilinebilirMi'),'Mesaj silme sahiplik kontrolü korunmalı.');
assert(communication.includes('mesajlariTopluSil'),'Sohbet silerken yerel mesaj temizliği korunmalı.');
assert(communication.includes("device().remove(type,COL.mesajlar,m.id)"),'Sohbet mesajları DeviceData üzerinden silinmeli.');
assert(communication.includes('okunmayanlar'),'Okunmamış mesaj sayacı sözleşmesi korunmalı.');

// Restored V2 interaction contracts: no longer passive read-only cards.
assert(communication.includes('data-announcement-read'),'Duyuru okundu işaretleme UI bağlantısı korunmalı.');
assert(communication.includes('DuyurularService?.okunduIsaretle'),'Duyuru okundu işlemi servis katmanına gitmeli.');
assert(communication.includes('data-poll-option'),'Anket seçenekleri etkileşimli render edilmeli.');
assert(communication.includes('data-poll-vote'),'Anket oy verme eylemi bulunmalı.');
assert(communication.includes('AnketService?.oyVer'),'Anket oyu merkezi servise yazılmalı.');
assert(communication.includes('data-poll-toggle'),'Admin anket kapat/aç eylemi korunmalı.');
assert(communication.includes('safeHref'),'Haber dış bağlantıları protokol doğrulamasından geçmeli.');
assert(communication.includes('target="_blank" rel="noopener noreferrer"'),'Haber dış bağlantısı güvenli sekmede açılmalı.');
assert(communication.includes('data-news-source-delete'),'Haber kaynak yönetimi UI bağlantısı korunmalı.');
assert(communication.includes("'data.haberKaynaklari'"),'Haber kaynakları AppStore değişikliklerine abone olmalı.');
assert(communication.includes('bindCommunicationActions(out)'),'Duyuru/anket/haber eylemleri render sonrasında bağlanmalı.');

// Poll/calendar ownership rules must remain in the service layer.
assert(communication.includes('if(!isAdmin())throw new Error(\'yetkisiz\')'),'Anket oluşturma admin yetkisi servis katmanında kalmalı.');
assert(communication.includes('calendarOwn'),'Takvim kayıt sahipliği merkezi servis kontrolünde kalmalı.');

// RSS retention: only the most recent 30 days may be kept/re-imported.
assert(rss.includes('const HABER_SAKLAMA_GUNU = 30'),'Haber saklama süresi 30 gün olmalı.');
assert(rss.includes('async function eskiHaberleriTemizle(db)'),'Eski haberleri toplu temizleyen işlev bulunmalı.');
assert(rss.includes('await eskiHaberleriTemizle(db);'),'Temizlik her RSS çalışmasında kaynak taramasından önce yapılmalı.');
assert(rss.includes('if(!sonBirAyIcindeMi(it.tarih))'),'30 günden eski feed maddeleri yeniden eklenmemeli.');

console.log('Communication local-first, etkileşim ve 30 günlük haber saklama sözleşmesi başarılı.');
