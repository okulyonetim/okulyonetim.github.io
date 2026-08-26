const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/legislation.js','utf8');
const legacy=fs.readFileSync('js/mevzuat-asistan.js','utf8');

for(const token of ["DB_NAME='okulMevzuatDB'","'kayitlar'","'chunklar'","createIndex('mevzuatId'",'function split(text)','function stem(word)','async function search(question','async function ask(question)','async function backup()','async function restore(data)']) assert(src.includes(token),`Mevzuat V2 motor sözleşmesi eksik: ${token}`);
assert(src.includes('indexedDB.open(DB_NAME,DB_VERSION)'),'Mevzuat motoru mevcut IndexedDB veri modelini kullanmalı.');
assert(!src.includes('db.collection(')&&!src.includes('firebase.firestore'),'Mevzuat motoru Firestore kullanmamalı.');
assert(!src.includes('document.getElementById')&&!src.includes('modalAc('),'Mevzuat motoru DOM/modal presentation katmanına bağlı olmamalı.');
assert(src.includes("https://koruk-mevzuat-asistan.sedonet23.workers.dev/"),'Mevcut mevzuat Worker sözleşmesi korunmalı.');
assert(src.includes("messages:[{role:'user',text:soru}],context"),'Worker yalnız soru + cihazda seçilmiş mevzuat bağlamını almalı.');
assert(legacy.includes("const MEVZUAT_DB_ADI = 'okulMevzuatDB'"),'Geçiş tamamlanana kadar legacy veri sözleşmesi doğrulanabilir olmalı.');

console.log('Mevzuat local-first V2 motor sözleşmesi başarılı.');
