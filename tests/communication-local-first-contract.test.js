const fs=require('fs');
const assert=require('assert');

const communication=fs.readFileSync('js/modules/communication.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const assistant=fs.readFileSync('js/modules/assistant.js','utf8');
const rss=fs.readFileSync('scripts/rss-fetch.js','utf8');
new Function(communication);
new Function(shell);
new Function(assistant);

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

// Rich note parity now belongs to the canonical Communication + ShellUI surfaces; no retired second UI file may be required.
assert(!/\bdb\s*\.\s*collection\s*\(/.test(shell),'Hızlı Not kabuğu doğrudan Firestore kullanmamalı.');
for(const field of ['maddeler','cizimData','goruntu','tabloVeri']) assert(communication.includes(field)||shell.includes(field),`Zengin not alanı paritesi eksik: ${field}`);
for(const fn of ['openTextQuickNote','openChecklistQuickNote','openDrawingQuickNote','openImageQuickNote','openTableQuickNote']) assert(shell.includes(`function ${fn}`),`Hızlı Not türü eksik: ${fn}`);
for(const type of ["'metin'","'todo'","'cizim'","'goruntu'","'tablo'"]) assert(shell.includes(type),`Hızlı Not veri türü eksik: ${type}`);
assert(shell.includes('global.NotlarService?.notKaydet?.'),'Zengin hızlı not kaydı mevcut NotlarService üzerinden kalmalı.');
assert(communication.includes('window.NotlarService?.notSil?.'),'Notlar sayfası silme işlemini mevcut NotlarService üzerinden yapmalı.');
assert(communication.includes('noteTypePreview')&&communication.includes("x.tip==='cizim'")&&communication.includes("x.tip==='goruntu'")&&communication.includes("x.tip==='tablo'"),'Çizim/görsel/tablo notları Notlar sayfasında önizlenmeli.');
assert(communication.includes('Kim neye oy verdi?'),'Admin anket katılımcı/oy ayrıntısı görünür kalmalı.');
assert(communication.includes('data-announcement-read')&&communication.includes('DuyurularService?.okunduIsaretle'),'Duyuru okundu akışı canonical Communication içinde kalmalı.');
assert(!assistant.includes('communication-legacy-ui.js'),'AI Asistan silinmiş iletişim parite dosyasını yüklemeye çalışmamalı.');

// Poll/calendar ownership rules must remain in the service layer.
assert(communication.includes('if(!isAdmin())throw new Error(\'yetkisiz\')'),'Anket oluşturma admin yetkisi servis katmanında kalmalı.');
assert(communication.includes('calendarOwn'),'Takvim kayıt sahipliği merkezi servis kontrolünde kalmalı.');

// RSS retention: only the most recent 30 days may be kept/re-imported.
assert(rss.includes('const HABER_SAKLAMA_GUNU = 30'),'Haber saklama süresi 30 gün olmalı.');
assert(rss.includes('async function eskiHaberleriTemizle(db)'),'Eski haberleri toplu temizleyen işlev bulunmalı.');
assert(rss.includes('await eskiHaberleriTemizle(db);'),'Temizlik her RSS çalışmasında kaynak taramasından önce yapılmalı.');
assert(rss.includes('if(!sonBirAyIcindeMi(it.tarih))'),'30 günden eski feed maddeleri yeniden eklenmemeli.');

console.log('Communication local-first, zengin eski iletişim paritesi ve 30 günlük haber saklama sözleşmesi başarılı.');
