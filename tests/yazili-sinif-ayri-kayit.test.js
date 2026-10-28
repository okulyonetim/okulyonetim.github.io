/* Yazılı sınav: işaretlenen her sınıf için ayrı Kaçıncı Ders + Senaryo No girilir ve her sınıf ayrı kayıt olur */
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync('js/modules/academic.js','utf8');
const a=src.indexOf('function writtenModal('),b=src.indexOf('function trialModal(');
assert(a>0&&b>a,'writtenModal bulunamadı.');
const modal=src.slice(a,b);

/* form: tek global Kaçıncı Ders / Senaryo alanı yok; sınıf başına satır var */
assert(modal.includes('data-w-class-rows')&&modal.includes('data-w-class-row='),'Sınıfa özel satır alanı olmalı.');
assert((modal.match(/<input data-w-hour /g)||[]).length===1&&(modal.match(/<input data-w-scenario /g)||[]).length===1,'Kaçıncı Ders ve Senaryo No yalnızca sınıf satırı şablonunda bulunur.');
assert(!/ov\.querySelector\('\[data-w-hour\]'\)|ov\.querySelector\('\[data-w-scenario\]'\)/.test(modal),'Kayıt, global alandan değil sınıf satırlarından okur.');

/* kayıt: her satır ayrı sinavKaydet; kayıtta virgüllü sınıf listesi yazılmaz */
assert(/for\(const \[i,r\] of satirlar\.entries\(\)\)\{[^}]*sinavKaydet\(/.test(modal),'Her sınıf satırı için ayrı sinavKaydet çağrılır.');
assert(/siniflar:sinif,sinif,dersSaati:/.test(modal),'Her kayıt tek sınıf taşır.');
assert(!/siniflar:secili\.join/.test(modal),'Çok sınıflı tek kayıt üretilmez.');

/* düzenlenen kayıt kendi sınıfının kaydı olarak güncellenir (kimlik korunur) */
assert(/i===0\?\(existing\?\.id\|\|null\):null/.test(modal),'İlk satır mevcut kaydı günceller, diğerleri yeni kayıt olur.');
console.log('yazili-sinif-ayri-kayit: OK');
