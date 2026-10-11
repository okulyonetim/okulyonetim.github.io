/* Rol işlemleri (oluştur/düzenle/kopyala/sil) için TEK yetki kontrol noktası artık
 * js/modules/settings.js'teki KullaniciYonetimiService'in kendisidir. Önceki üç katmanlı
 * yapı (burada + role-permission-operations.js [hiç yüklenmiyordu, ölü kod] +
 * role-permission-catalog.js'teki installRoleActionGuards) tek bu dosyaya indirildi.
 */
const fs=require('fs');
const assert=require('assert');
const path=require('path');

assert(!fs.existsSync(path.join(__dirname,'..','js','core','role-permission-operations.js')),'Ölü kod kalmış: role-permission-operations.js hiçbir yerden yüklenmiyordu ve kaldırılmalıydı.');

const settings=fs.readFileSync('js/modules/settings.js','utf8');
for(const op of ['view','edit','create','clone','delete']){
  assert(settings.includes(`${op}:'settings.roles`),`Rol işlemi permission eşlemesi eksik: ${op}`);
}
assert(settings.includes('_rolIslemiYetkiliMi'),'Tek merkezi rol işlem yetki kontrolü eksik.');
assert(settings.includes('rolKaydet(mevcutId,veri){if(!this._rolYetkiKontrol('),'rolKaydet merkezi yetki kontrolünü kullanmalı.');
assert(settings.includes('rolSil(id,atanmisKullaniciSayisi){if(!this._rolYetkiKontrol('),'rolSil merkezi yetki kontrolünü kullanmalı.');
assert(settings.includes('rolKopyala(kaynakId,veri={})'),'Rol kopyalama işlemi tek merkeze taşınmalı.');

const catalogBridge=fs.readFileSync('js/core/role-permission-catalog.js','utf8');
assert(!/function installRoleActionGuards/.test(catalogBridge),'Üçüncü, gereksiz rol işlem yetki koruma katmanı kaldırılmalıydı.');

console.log('role-permission-operations: OK');
