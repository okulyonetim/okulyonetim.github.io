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

// Poll/calendar ownership rules must remain in the service layer.
assert(communication.includes('if(!isAdmin())throw new Error(\'yetkisiz\')'),'Anket oluşturma admin yetkisi servis katmanında kalmalı.');
assert(communication.includes('calendarOwn'),'Takvim kayıt sahipliği merkezi servis kontrolünde kalmalı.');

// RSS retention: only the most recent 30 days may be kept/re-imported.
assert(rss.includes('const HABER_SAKLAMA_GUNU = 30'),'Haber saklama süresi 30 gün olmalı.');
assert(rss.includes('async function eskiHaberleriTemizle(db)'),'Eski haberleri toplu temizleyen işlev bulunmalı.');
assert(rss.includes('await eskiHaberleriTemizle(db);'),'Temizlik her RSS çalışmasında kaynak taramasından önce yapılmalı.');
assert(rss.includes('if(!sonBirAyIcindeMi(it.tarih))'),'30 günden eski feed maddeleri yeniden eklenmemeli.');

console.log('Communication local-first ve 30 günlük haber saklama sözleşmesi başarılı.');
