const fs=require('fs');
const assert=require('assert');

const bridge=fs.readFileSync('js/core/admin-password-reset.js','utf8');
const worker=fs.readFileSync('check-and-notify.js','utf8');
const init=fs.readFileSync('js/firebase-init.js','utf8');
const workflow=fs.readFileSync('.github/workflows/notify.yml','utf8');
new Function(bridge);
new Function(worker);

assert(bridge.includes("REQUEST_COLLECTION='oy_idariBilgiler'"),'Sıfırlama isteği korumalı idari koleksiyonda tutulmalı.');
assert(bridge.includes('confirmPasswordReset(code,newPassword)'),'Yeni parola tarayıcıda resmi Firebase sıfırlama koduyla uygulanmalı.');
assert(bridge.includes("if(cleanUsername(requestedUsername)!==cleanUsername(existingUsername))"),'Sıfırlamada kullanıcı adı değiştirilememeli.');
assert(!bridge.includes('yeniSifre:pw'),'Yeni parola Firestore isteğine yazılmamalı.');
assert(bridge.includes("event.stopImmediatePropagation()"),'Eski yeni-hesap oluşturma tıklama akışı engellenmeli.');
assert(bridge.includes("button.textContent='Şifreyi Güncelle'"),'Arayüz sonsuz yüklenme durumundan çıkmalı.');

assert(worker.includes("v.tur === 'sifreSifirlama' && v.durum === 'bekliyor'"),'Arka plan işi yalnız bekleyen sıfırlama taleplerini işlemeli.');
assert(worker.includes('isteyen.admin !== true'),'Sunucu tarafı isteği yapan kullanıcının Süper Admin olduğunu doğrulamalı.');
assert(worker.includes('admin.auth().getUser(v.hedefUid)'),'Hedef Firebase UID doğrulanmalı.');
assert(worker.includes('admin.auth().generatePasswordResetLink(hedefAuth.email)'),'Admin SDK resmi sıfırlama bağlantısı üretmeli.');
assert(!worker.includes('updateUser(v.hedefUid,{password'),'Parola GitHub/Firestore üzerinden taşınmamalı.');

assert(init.includes("js/core/admin-password-reset.js?v=948"),'Güvenli şifre sıfırlama köprüsü uygulama başlangıcında yüklenmeli.');
assert(workflow.includes("cron: '*/5 * * * *'"),'Sıfırlama kodları en fazla yaklaşık beş dakikalık zamanlamayla hazırlanmalı.');
console.log('Güvenli aynı-hesap şifre sıfırlama sözleşmesi başarılı.');
