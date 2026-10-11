/* Regresyon: Raporlar modülü (js/modules/reports.js), izin kataloğu
 * (RolePermissionCatalog) PermissionService'e bağlanmadan önce açılırsa,
 * canReportAction() henüz hazır olmayan izin servisine sorduğu için
 * "⚙️ Düzenle" (sütun özelleştirme) ve "🖨 Yazdır" düğmelerini hiç
 * göstermiyordu. Modül bu bağlanmanın tamamlandığını bildiren olayları
 * dinlemediği için, kullanıcı sayfadan çıkıp tekrar girene kadar düğmeler
 * görünmüyordu ("ilk seferde açılmıyor, sonra açılıyor"). Artık modül bu
 * olayları dinleyip ana sayfayı yeniden çiziyor. */
const fs=require('fs');
const assert=require('assert');
const reports=fs.readFileSync('js/modules/reports.js','utf8');

new Function(reports);

assert(/global\.addEventListener\('koruk:permission-catalog-ready',scheduleRefresh\)/.test(reports),"watchReady() 'koruk:permission-catalog-ready' olayını dinlemeli.");
assert(/global\.addEventListener\('koruk:permission-navigation-ready',scheduleRefresh\)/.test(reports),"watchReady() 'koruk:permission-navigation-ready' olayını dinlemeli.");
assert(/global\.removeEventListener\('koruk:permission-catalog-ready',scheduleRefresh\)/.test(reports),"unwatchReady() dinleyiciyi temizlemeli (sızıntı olmamalı).");
assert(/global\.removeEventListener\('koruk:permission-navigation-ready',scheduleRefresh\)/.test(reports),"unwatchReady() dinleyiciyi temizlemeli (sızıntı olmamalı).");

console.log('reports-permission-ready-race: OK');
