/* Güvenli aynı-hesap şifre sıfırlama: istemci doğrudan PASSWORD_API'ye
 * (Firebase ID token ile) istek atar; eski Firestore-polling tabanlı akış
 * (oy_idariBilgiler üzerinde 'sifreSifirlama' türünde bekleyen istekler)
 * hiçbir zaman aktif kod yolunca çağrılmıyordu — ölü kod olarak kaldırıldı,
 * check-and-notify.js'teki ilgili arka plan işi de kaldırıldı (her 5
 * dakikada bir artık hiçbir şey bulamayan bir koleksiyon taraması
 * yapılmıyor). */
const fs=require('fs');
const assert=require('assert');

const bridge=fs.readFileSync('js/core/admin-password-reset.js','utf8');
const worker=fs.readFileSync('check-and-notify.js','utf8');
const init=fs.readFileSync('js/firebase-init.js','utf8');

new Function(bridge);
new Function(worker);

assert(bridge.includes("PASSWORD_API='https://okul-8t9q.onrender.com/sifre-guncelle'"),'Şifre güncelleme isteği sunucu API uç noktasına gitmeli.');
assert(bridge.includes('directPasswordUpdate(uid,pw)'),'Şifre sıfırlama doğrudan güncelleme fonksiyonunu kullanmalı.');
assert(bridge.includes("if(clean(username)!==clean(existing))"),'Sıfırlamada kullanıcı adı değiştirilememeli.');
assert(!bridge.includes('REQUEST_COLLECTION'),'Eski Firestore-polling tabanlı sıfırlama akışı (ölü kod) kaldırılmış olmalı.');
assert(!bridge.includes('function prepared('),'Eski prepared()/apply() yardımcıları kaldırılmış olmalı.');
assert(bridge.includes('stopImmediatePropagation()'),'Eski yeni-hesap oluşturma tıklama akışı engellenmeli.');
assert(bridge.includes("textContent='Şifreyi Güncelle'"),'Arayüz sonsuz yüklenme durumundan çıkmalı.');

assert(!worker.includes('sifreSifirlamaIstekleriniIsle'),'check-and-notify.js artık hiç oluşturulmayan eski sıfırlama isteklerini taramamalı.');
assert(!worker.includes("tur === 'sifreSifirlama'"),'Arka plan işi eski sıfırlama türünü aramamalı.');

assert(init.includes("js/core/admin-password-reset.js?v=949"),'Güvenli şifre sıfırlama köprüsü uygulama başlangıcında yüklenmeli.');
console.log('Güvenli aynı-hesap şifre sıfırlama sözleşmesi başarılı.');
