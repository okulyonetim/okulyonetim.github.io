const fs=require('fs');
const file=fs.readFileSync('js/core/report-runtime-enhancements.js','utf8');
for(const token of ['Şablonun uygulanacağı sınıf','Sayfa yönü','Satır aralığı','Başlık hizalama','Logo konumu','Logo X','Logo Y','ka-report-template:','Öğrenci List','Belirli Gün','Sosyal Kul','Ders Program'])assert(file.includes(token),`Genel rapor tasarım sözleşmesi eksik: ${token}`);
for(const token of ['puantaj','imza\\s*sirküsü','öğretmen\\s*devamsızlık','servis\\s*aylık\\s*takip','aylık\\s*denetim','yemek\\s*denetim','maaş\\s*değişikliği','dilekçe'])assert(file.includes(token),`Özel rapor koruması eksik: ${token}`);
console.log('general-report-designer.test.js: OK');
