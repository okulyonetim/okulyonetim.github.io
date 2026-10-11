/* Regresyon: service-worker.js'in kendisi hiçbir zaman doğrudan `node --check`
 * ile doğrulanmıyordu (yalnızca js/ altındaki dosyalar taranıyordu). 'install'
 * olay dinleyicisinde event.waitUntil(...) için eksik bir kapanış parantezi
 * vardı — bu da dosyayı her tarayıcıda parse hatasına düşürüp Service
 * Worker'ın HİÇBİR ZAMAN kayıt olmamasına yol açıyordu (offline önbellekleme,
 * FCM arka plan bildirimleri, güncelleme akışı — hiçbiri çalışmıyordu).
 * Bu test dosyanın gerçekten parse edilebildiğini doğrular. */
const fs=require('fs');
const assert=require('assert');
const vm=require('vm');
const src=fs.readFileSync('service-worker.js','utf8');

// new Function ile sözdizimi doğrulaması — gerçek bir SyntaxError varsa burada patlar.
assert.doesNotThrow(()=>new vm.Script(src,{filename:'service-worker.js'}),'service-worker.js parse edilebilir olmalı (sözdizimi hatası olmamalı).');

// Regresyonun tam kaynağı: event.waitUntil(Promise.all([...])) çağrısı eskiden
// tek kapanış parantezi eksikti (yalnızca Promise.all'u, waitUntil'i değil
// kapatıyordu), bu da sonraki ';self.skipWaiting();' ifadesinde parse hatası
// veriyordu. Doğru biçim bitişte iki kapanış parantezi ")))" içerir.
assert(src.includes("}))])));self.skipWaiting();"),"event.waitUntil(...) çağrısı doğru kapatılmalı (eksik kapanış parantezi regresyonu).");

console.log('service-worker-syntax: OK');
