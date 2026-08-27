const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
for(const token of ['Metin Notu','Yapılacaklar','Çizim','Görsel Not','Tablo Notu','Notlarımı Görüntüle','openTextQuickNote','openChecklistQuickNote'])assert(shell.includes(token),`Hızlı Not launcher sözleşmesi eksik: ${token}`);
assert(shell.includes("NotlarService?.notKaydet?.(null"),'Hızlı not kayıtları mevcut NotlarService üzerinden yazılmalı.');
assert(shell.includes("page:'notes'"),'Notlarımı Görüntüle doğrudan Notlarım sayfasını açmalı.');
console.log('Hızlı Not launcher sözleşmesi başarılı.');