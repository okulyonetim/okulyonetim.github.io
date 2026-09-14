const fs=require('fs');
const assert=require('assert');
const auth=fs.readFileSync('js/auth.js','utf8');
new Function(auth);

for(const token of [
  'KULLANICI ŞİFRE YÖNETİMİ',
  'data-create-user-password',
  'Yeni Kullanıcı Oluştur',
  'Şifre Oluştur / Sıfırla',
  'data-reset-password',
  'data-reset-confirm',
  'data-pw-generate',
  'data-pw-toggle'
]) assert(auth.includes(token),`Kullanıcı şifre yönetimi sözleşmesi eksik: ${token}`);

assert(auth.includes("if(pw.length<6)"),'Yönetici tarafından oluşturulan/sıfırlanan şifre için en az 6 karakter kontrolü bulunmalı.');
assert(auth.includes("auth/email-already-in-use"),'Mevcut Firebase kullanıcı adı çakışması anlaşılır şekilde ele alınmalı.');
assert(auth.includes('crypto.getRandomValues'),'Rastgele şifre üretimi güvenli tarayıcı rastgeleliği kullanmalı.');
assert(auth.includes("await global.SyncEngine.pull(['kullanicilar'])"),'Kullanıcı oluşturma/sıfırlama sonrası kullanıcı listesi yeniden eşitlenmeli.');

const resetStart=auth.indexOf('async function adminSifreSifirlaYeniHesapla');
const resetEnd=auth.indexOf('async function kendiSifremiDegistir',resetStart);
const reset=auth.slice(resetStart,resetEnd);
assert(reset.includes('const yeni=await adminYeniKullaniciOlustur'),'Şifre sıfırlama önce yeni Firebase giriş hesabını oluşturmalı.');
assert(reset.includes('sifreSifirlandiEskiHesap:true'),'Başarılı sıfırlamada eski uygulama profili pasifleştirilmeli.');
assert(reset.indexOf('adminYeniKullaniciOlustur')<reset.indexOf('sifreSifirlandiEskiHesap:true'),'Eski profil yeni giriş hesabı başarıyla oluşturulmadan pasifleştirilmemeli.');

console.log('Kullanıcı şifre oluşturma/sıfırlama sözleşmesi başarılı.');
