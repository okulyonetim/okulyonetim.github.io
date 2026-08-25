const fs=require('fs');
const assert=require('assert');

const firebase=fs.readFileSync('js/firebase-init.js','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');

assert(firebase.includes("ogretmenListeSablon:'oy_ogretmenListeSablon'"),'Öğretmen liste şablonu merkezi COL haritasında kalmalı.');
assert(firebase.includes("ogretmenListeKayit:'oy_ogretmenListeKayit'"),'Öğretmen liste kayıtları merkezi COL haritasında kalmalı.');
assert(rules.includes('match /oy_ogretmenListeSablon/{id}'),'Öğretmen liste şablonu sahiplik kuralı korunmalı.');
assert(rules.includes('match /oy_ogretmenListeKayit/{id}'),'Öğretmen liste kayıt sahiplik kuralı korunmalı.');
assert(rules.includes('request.resource.data.ogretmenId == kendiOgretmenIdsi()'),'Öğretmen liste yazmaları bağlı öğretmen kimliğiyle sınırlandırılmalı.');

console.log('Öğretmen liste merkezi koleksiyon ve sahiplik sözleşmesi başarılı.');
