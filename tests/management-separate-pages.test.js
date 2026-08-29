const fs=require('fs');
const assert=require('assert');
const management=fs.readFileSync('js/modules/management.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const personnel=fs.readFileSync('js/modules/classic-personnel-parity.js','utf8');
const live=fs.readFileSync('js/modules/school-live-status.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(personnel);

assert(!management.includes('data-management-tab'),'Management iç sekme üretmemeli.');
assert(management.includes("function openPage(page,title='')"),'ManagementModule doğrudan sayfa açma API sözleşmesi sağlamalı.');
for(const page of ['staff','tasks','leaves','duty','puantaj','dilekce'])assert(management.includes(`'${page}'`),`Management ayrı sayfa hedefi eksik: ${page}`);
for(const token of ['exceliUygula','otomatikDagitimUygula','defterDolduToggle','createDutyReport','DUTY_TASKS','data-duty-book','nobetYerleri','nobetAtamalari','nobetciAmirleri','resmiTatiller'])assert(management.includes(token),`Nöbet gerçek davranış sözleşmesi eksik: ${token}`);
for(const token of ['data-duty-places','data-duty-excel','dutyPlacesModal','dutyExcelModal','readDutyExcel','dutyExcelMappingModal','xlsx.full.min.js']) assert(management.includes(token),`Nöbet Excel/yer yönetimi sözleşmesi eksik: ${token}`);
assert(management.includes("PermissionService?.can?.('management.duty.edit','edit')"),'Nöbet servis yetkisi merkezi PermissionService kullanmalı.');
assert(management.includes('AppLoader?.loadScript?.'),'Nöbet Excel kütüphanesi merkezi lazy loader ile yüklenmeli.');
assert(shell.includes("name==='management'&&['staff','tasks','leaves','duty','puantaj','dilekce'].includes(page)"),'Shell Management sayfalarını doğrudan route etmelidir.');
assert(shell.includes('ManagementModule?.openPage?.(page,title)'),'Shell Management sayfasını tab click ile değil openPage API ile açmalıdır.');
assert(!shell.includes('[data-management-tab='),'Shell Management tab selector kullanmamalı.');

// Personel gerçek veri ve davranışları ManagementModule içinde canonical kalmalı.
for(const token of [
  "device().add('personel',COL.personel",
  "device().update('personel',COL.personel",
  "device().remove('personel',COL.personel",
  "SyncEngine.register(t,c)",
  "SyncEngine.localHydrate(types)",
  'PersonelService.personelKaydet',
  'PersonelService.personelSil',
  'PersonelService.izinKaydet',
  'PersonelService.izinSil',
  'data-staff-dilekce',
  'data-staff-puantaj',
  'data-staff-leave-new',
  'data-staff-leave-edit'
]) assert(management.includes(token),`Personel canonical davranışı eksik: ${token}`);
for(const field of ['adSoyad','tc','telefon','gorev','kadroKademesi','gorevYeriKademeleri','adres','notlar']) assert(management.includes(field),`Personel gerçek alanı korunmalı: ${field}`);
for(const role of ['Sürekli İşçi','Hizmetli','Memur','Güvenlik Görevlisi','Aşçı','Kaloriferci','Temizlik Görevlisi','Diğer']) assert(management.includes(role),`Personel görev seçeneği korunmalı: ${role}`);

// 708c82a Personel İşleri görünür çalışma alanı presentation paritesi.
assert(!/\bdb\s*\.\s*collection\s*\(/.test(personnel),'Classic Personel paritesi doğrudan Firestore kullanmamalı.');
assert(!/DeviceData\s*\.\s*(?:add|set|update|remove|persist)\s*\(/.test(personnel),'Classic Personel paritesi ikinci veri yazma katmanı oluşturmamalı.');
assert(!/createElement\(\s*['"]style['"]\s*\)/.test(personnel),'Classic Personel paritesi runtime tema/style katmanı oluşturmamalı.');
for(const label of [
  'Personel İşleri',
  'Sürekli işçi, hizmetli ve diğer personel kayıtları &amp; dilekçe sistemi',
  '+ Yeni Personel',
  '🔍 Ad, TC veya görev ile ara...',
  'TC kaydı yok',
  'Düzenle',
  'Henüz personel eklenmedi. “+ Yeni Personel” ile ekleyin.'
]) assert(personnel.includes(label),`Eski Personel görünür paritesi eksik: ${label}`);
assert(personnel.includes("norm(p.adSoyad||[p.ad,p.soyad].filter(Boolean).join(' ')).includes(q)")&&personnel.includes('norm(p.tc).includes(q)')&&personnel.includes('norm(p.gorev||p.unvan).includes(q)'),'Personel araması eski Ad/TC/Görev kapsamını korumalı.');
assert(personnel.includes("data-staff-new")&&personnel.includes("data-staff-detail"),'Classic Personel UI mevcut Management event köprülerini yeniden kullanmalı.');
assert(personnel.includes("#kaManagementStaffDetail [data-staff-edit]"),'Eski satırdaki doğrudan Düzenle davranışı mevcut canonical personel edit modalına delege edilmeli.');
assert(personnel.includes("AppStore?.data?.('personel')"),'Classic Personel listesi cihazdan hydrate edilmiş AppStore personel verisini okumalı.');
assert(personnel.includes("PermissionService?.can?.('management.personnel.edit','edit')"),'Personel düzenleme görünürlüğü merkezi yetkiyi kullanmalı.');
assert(live.includes("loadScript?.('js/modules/classic-personnel-parity.js')"),'Classic Personel paritesi dashboard sonrası lazy yüklenmeli.');
assert(sw.includes("'./js/modules/classic-personnel-parity.js'"),'Classic Personel paritesi offline uygulama kabuğunda bulunmalı.');

console.log('Management ayrı sayfa + nöbet gerçek davranış sözleşmesi başarılı.');
console.log('Personel İşleri classic görünür UX + canonical local-first davranış paritesi başarılı.');
