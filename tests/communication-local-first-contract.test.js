const fs=require('fs');
const assert=require('assert');

const communication=fs.readFileSync('js/modules/communication.js','utf8');
const legacy=fs.readFileSync('js/modules/communication-legacy-ui.js','utf8');
const rss=fs.readFileSync('scripts/rss-fetch.js','utf8');
new Function(legacy);

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

// Interactive local-first messaging UI must stay wired to the existing service/repository.
assert(communication.includes('data-conversation-open'),'Konuşma kartları sohbet ekranını açabilmeli.');
assert(communication.includes('MesajlasmaRepository?.mesajlariDinle'),'Açık sohbet mesajları repository üzerinden yerel dinleyiciyle açılmalı.');
assert(communication.includes('MesajlasmaService?.okunduIsaretle'),'Sohbet açıldığında okunmamış sayacı servis üzerinden sıfırlanmalı.');
assert(communication.includes('data-message-form'),'Mesaj gönderme formu korunmalı.');
assert(communication.includes('MesajlasmaService?.mesajGonder?.'),'Metin mesajı merkezi servis üzerinden gönderilmeli.');
assert(communication.includes('MesajlasmaService?.mesajGonderDosyaIle?.'),'Dosyalı mesaj merkezi servis üzerinden gönderilmeli.');
assert(communication.includes('data-message-delete'),'Mesaj silme UI eylemi korunmalı.');
assert(communication.includes('MesajlasmaService?.mesajSil?.'),'Mesaj silme merkezi servis üzerinden yapılmalı.');
assert(communication.includes('data-conversation-delete'),'Sohbet silme UI eylemi korunmalı.');
assert(communication.includes('MesajlasmaService?.konusmaSil?.'),'Sohbet silme merkezi servis üzerinden yapılmalı.');
assert(communication.includes('data-message-new'),'Yeni bire bir konuşma UI eylemi korunmalı.');
assert(communication.includes('MesajlasmaService?.konusmaBaslatOgretmenIle?.'),'Yeni öğretmen konuşması mevcut servis üzerinden açılmalı.');
assert(communication.includes('closeMessageConversation(false)'),'Modül/sekme lifecycle mesaj dinleyicisini kapatmalı.');

// Restored V2 interaction contracts: no longer passive read-only cards.
assert(communication.includes('data-announcement-read'),'Duyuru okundu işaretleme UI bağlantısı korunmalı.');
assert(communication.includes('DuyurularService?.okunduIsaretle'),'Duyuru okundu işlemi servis katmanına gitmeli.');
assert(communication.includes('data-poll-option'),'Anket seçenekleri etkileşimli render edilmeli.');
assert(communication.includes('data-poll-vote'),'Anket oy verme eylemi bulunmalı.');
assert(communication.includes('AnketService?.oyVer'),'Anket oyu merkezi servise yazılmalı.');
assert(communication.includes('data-poll-toggle'),'Admin anket kapat/aç eylemi korunmalı.');
assert(communication.includes('AnketService?.anketKapat?.(a.id,a.aktif!==false)'),'Anket kapat/aç yönü servis sözleşmesiyle uyumlu olmalı.');
assert(communication.includes('safeHref'),'Haber dış bağlantıları protokol doğrulamasından geçmeli.');
assert(communication.includes('target="_blank" rel="noopener noreferrer"'),'Haber/dosya dış bağlantısı güvenli sekmede açılmalı.');
assert(communication.includes('data-news-source-delete'),'Haber kaynak yönetimi UI bağlantısı korunmalı.');
assert(communication.includes("'data.haberKaynaklari'"),'Haber kaynakları AppStore değişikliklerine abone olmalı.');
assert(communication.includes('bindCommunicationActions(out)'),'İletişim eylemleri render sonrasında bağlanmalı.');

// Old communication presentation parity must use current services, never a second data layer.
assert(!/\bdb\s*\.\s*collection\s*\(/.test(legacy),'İletişim parite adaptörü doğrudan Firestore kullanmamalı.');
assert(!/localStorage\s*\.\s*setItem\s*\(/.test(legacy),'İletişim parite adaptörü kalıcı veri için localStorage yazmamalı.');
for(const type of ['metin','todo','cizim','goruntu','tablo']) assert(legacy.includes(`${type}:`)||legacy.includes(`'${type}'`),`Eski not türü eksik: ${type}`);
for(const field of ['maddeler','cizimData','goruntu','tabloVeri','renk','etiketler']) assert(legacy.includes(field),`Eski not alanı paritesi eksik: ${field}`);
assert(legacy.includes('NotlarService?.notKaydet?.'),'Zengin not kaydı mevcut NotlarService üzerinden kalmalı.');
assert(legacy.includes('NotlarService?.notSil?.'),'Zengin not silme mevcut NotlarService üzerinden kalmalı.');
assert(legacy.includes('data-hd-rich-editor')&&legacy.includes('contenteditable="true"'),'Eski zengin metin not editörü geri gelmeli.');
assert(legacy.includes('data-hd-drawing')&&legacy.includes('canvas'),'Eski çizim notu editörü geri gelmeli.');
assert(legacy.includes('data-hd-image-file'),'Eski görsel notu editörü geri gelmeli.');
assert(legacy.includes('data-hd-table-editor'),'Eski tablo notu editörü geri gelmeli.');
assert(legacy.includes('Benim Notlarım')&&legacy.includes('Diğer Kullanıcıların Notları'),'Yönetici not sahipliği görünümü korunmalı.');
assert(legacy.includes('AnketService?.oyVer?.'),'Anket detay modalı oy yazımını mevcut servise göndermeli.');
assert(legacy.includes('AnketService?.anketKapat?.'),'Anket detay modalı kapat/aç işlemini mevcut servise göndermeli.');
assert(legacy.includes('Oy Kullananlar')&&legacy.includes('Detay / Sonuçlar'),'Eski anket detay/katılımcı görünümü geri gelmeli.');
assert(legacy.includes('DuyurularService?.okunduIsaretle?.'),'Duyuru detay modalı okundu işlemini mevcut servise göndermeli.');
assert(legacy.includes('Kimler Okudu')&&legacy.includes('data-hd-lightbox'),'Eski duyuru okuyucu listesi ve görsel lightbox geri gelmeli.');

// Poll/calendar ownership rules must remain in the service layer.
assert(communication.includes('if(!isAdmin())throw new Error(\'yetkisiz\')'),'Anket oluşturma admin yetkisi servis katmanında kalmalı.');
assert(communication.includes('calendarOwn'),'Takvim kayıt sahipliği merkezi servis kontrolünde kalmalı.');

// RSS retention: only the most recent 30 days may be kept/re-imported.
assert(rss.includes('const HABER_SAKLAMA_GUNU = 30'),'Haber saklama süresi 30 gün olmalı.');
assert(rss.includes('async function eskiHaberleriTemizle(db)'),'Eski haberleri toplu temizleyen işlev bulunmalı.');
assert(rss.includes('await eskiHaberleriTemizle(db);'),'Temizlik her RSS çalışmasında kaynak taramasından önce yapılmalı.');
assert(rss.includes('if(!sonBirAyIcindeMi(it.tarih))'),'30 günden eski feed maddeleri yeniden eklenmemeli.');

console.log('Communication local-first, zengin eski iletişim paritesi ve 30 günlük haber saklama sözleşmesi başarılı.');
