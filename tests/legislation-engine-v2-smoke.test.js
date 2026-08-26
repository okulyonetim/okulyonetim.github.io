const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/legislation.js','utf8');
const ui=fs.readFileSync('js/modules/legislation-ui.js','utf8');
const shell=fs.readFileSync('index.html','utf8');

for(const token of ["DB_NAME='okulMevzuatDB'","'kayitlar'","'chunklar'","createIndex('mevzuatId'",'function split(text)','function stem(word)','async function search(question','async function ask(question)','async function backup()','async function restore(data)']) assert(src.includes(token),`Mevzuat V2 motor sözleşmesi eksik: ${token}`);
assert(src.includes('indexedDB.open(DB_NAME,DB_VERSION)'),'Mevzuat motoru mevcut IndexedDB veri modelini kullanmalı.');
assert(!src.includes('db.collection(')&&!src.includes('firebase.firestore'),'Mevzuat motoru Firestore kullanmamalı.');
assert(!src.includes('document.getElementById')&&!src.includes('modalAc('),'Mevzuat motoru DOM/modal presentation katmanına bağlı olmamalı.');
assert(src.includes("https://koruk-mevzuat-asistan.sedonet23.workers.dev/"),'Mevcut mevzuat Worker sözleşmesi korunmalı.');
assert(src.includes("messages:[{role:'user',text:soru}],context"),'Worker yalnız soru + cihazda seçilmiş mevzuat bağlamını almalı.');
for(const token of ['data-legislation-v2','data-legislation-add','data-legislation-delete','legislationImport','data-legislation-send','LegislationEngine']) assert(ui.includes(token),`Mevzuat V2 presentation sözleşmesi eksik: ${token}`);
assert(ui.includes("e.detail?.name==='communication'"),'Mevzuat Asistanı Communication altında açılmalı.');
assert(!ui.includes('db.collection(')&&!ui.includes('firebase.firestore'),'Mevzuat presentation Firestore kullanmamalı.');
assert(shell.includes('js/modules/legislation.js')&&shell.includes('js/modules/legislation-ui.js'),'Mevzuat V2 motoru ve presentation üretim shell tarafından yüklenmeli.');
assert(!fs.existsSync('js/mevzuat-asistan.js'),'Legacy mevzuat-asistan.js geri dönmemeli.');

console.log('Mevzuat local-first V2 motor + presentation sözleşmesi başarılı.');
