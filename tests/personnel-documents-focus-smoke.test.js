const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('js/modules/personnel-documents.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(src);

assert(src.includes('const drafts={request:Object.create(null),response:Object.create(null)}'),'Diploma form draft state eksik.');
assert(src.includes('data-personnel-document-page=')&&src.includes('${pageKey}')&&src.includes("if(existing?.querySelector?.('[data-personnel-document-form]'))return true"),'Aynı diploma sayfası yeniden açıldığında form DOM’u korunmalı.');
assert(src.includes("form.addEventListener('beforeinput',stop)"),'Mobil yazı girişi üst katmana taşınmamalı.');
assert(src.includes("form.addEventListener('keydown',stop)")&&src.includes("form.addEventListener('keyup',stop)"),'Klavye olayları form sınırında kalmalı.');
assert(src.includes("form.addEventListener('input',sync)")&&src.includes('drafts[pageKey][target.name]=target.value'),'Yazarken yalnız draft güncellenmeli; form yeniden çizilmemeli.');
for(const text of ['Kişi Bilgileri','Diploma Bilgileri','İletişim ve Onay','Belge / Okul Bilgileri','Diploma Okul Dilekçesi'])assert(src.includes(text),`Diploma yeni ekran bölümü eksik: ${text}`);
for(const field of ['adSoyad','tc','babaAdi','kizOglu','dogumTarihi','ogrenimSuresi','diplomaTarihi','diplomaSayisi','adres','cepNo','mudurAdi','okulAdi'])assert(src.includes(`name=\"${field}\"`),`Diploma okul cevabı alanı eksik: ${field}`);
assert(src.includes('<textarea name="adres"'),'Adres alanı mobil kullanım için çok satırlı olmalı.');
assert(src.includes('Diplomamı kaybettiğimden tarafıma diploma kayıt örneği düzenlenmesi hususunda'),'Diploma talep dilekçesi resmî metni korunmalı.');
assert(src.includes('diplomayı almaya hak kazandığı resmi kayıtların incelenmesinden anlaşılmıştır.'),'Diploma okul cevabı resmî metni korunmalı.');
assert(src.includes("const principalName=()=>")||src.includes('function principalName()'),'Okul müdürü mevcut okul/öğretmen verisinden türetilmeli.');
assert(src.includes("SyncEngine.register(type,col)")&&src.includes('SyncEngine.localHydrate(types)'),'Diploma referans verileri local-first hydrate edilmeli.');
assert(src.includes('ReportEngine.printReport(title,body'),'Resmî çıktı merkezi ReportEngine üzerinden kalmalı.');
for(const forbidden of ['db.collection','onSnapshot','localStorage','document.createElement(\'style\')','document.createElement("style")'])assert(!src.includes(forbidden),`Diploma modülü ${forbidden} kullanmamalı.`);
assert(!src.includes('style="'),'Diploma UI inline CSS üretmemeli.');
const runtimeCache=sw.match(/const CACHE_ADI\s*=\s*'oy-cache-v(\d+)'/);
assert(runtimeCache&&Number(runtimeCache[1])>=848,'Diploma güncellemesinden eski cache sürümüne dönülmemeli.');

console.log('Diploma form odak + yeniden tasarım + resmî çıktı/local-first sözleşmesi başarılı.');
