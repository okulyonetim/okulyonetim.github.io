/* 1) Veriler sayfasında ("Yedekten Geri Yükle" düğmesi yüzünden) geri çubuğu kayboluyordu.
 * 2) Okul / idari bilgiler admin ile yönetici arasında ortaktır: kayıt ve sayfa açılışı 24 saatlik senkron TTL'sini
 *    beklemeden güncel veriyi çeker; yönetici okul bilgilerini yazabilir (istemci + Firestore kuralı). */
const fs=require('fs');
const assert=require('assert');

const nav=fs.readFileSync('js/core/app-navigation-behavior.js','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');

// --- yerel geri düğmesi tespiti
const m=nav.match(/return (\/\^\(\?:\[[^\n]*?\]\\s\*\)\?geri\(\?:\\s\+dön\)\?\$\/iu)\.test\(text\);/);
assert(m,'syncShellBackbar yerel geri düğmesi yalnız tam "Geri" metnini aramalı.');
const re=eval(m[1]);
for(const t of ['Geri','← Geri','‹ Geri','« Geri','Geri dön','geri'])assert(re.test(t),`"${t}" yerel geri düğmesi sayılmalı.`);
for(const t of ['⬆ Yedekten Geri Yükle','Yedekten Geri Yükle','↩ Geri Al','Geri al','Geri Yükle','Değişikliği geri al','Geri bildirim'])assert(!re.test(t),`"${t}" geri çubuğunu gizletmemeli.`);
assert(!/\(\^\|\\s\)geri\(\\s\|\$\)/i.test(nav),'Eski gevşek /(^|\\s)geri(\\s|$)/ eşleşmesi kalmamalı.');

// --- Veriler'den geri: menü listesine dönülür (Ayarlar ana sayfasına değil)
assert(shell.includes("current.name==='settings'&&current.page!=='data'&&global.SettingsModule?.currentPage?.()!=='home'"),'Veriler (settings:data) geri tuşu ShellUI yığınından menüye dönmeli.');

// --- istemci: yönetici okul bilgilerini yazar ve görür
assert(/global\.OkulBilgileriService=\{_duzenleyebilir\(\)\{if\(global\.AKTIF_KULLANICI\?\.admin===true\)return true;if\(idariBilgiYetkili\(\)\)return true;/.test(settings),'Yönetici okul bilgilerini düzenleyebilmeli.');
assert(settings.includes("schoolVisible=()=>admin()||window.IdariBilgilerService?._yetkili?.()===true"),'Yönetici okul bilgileri sayfasını görmeli.');
assert(settings.includes("function uzaktanTazele(types,ms=5000)")&&settings.includes("global.SyncEngine.pull(types,{force:true})"),'Ortak okul/idari bilgi çekimi zorla (TTL beklemeden) yapılmalı.');
assert(settings.includes("async kaydet(veri){if(!this._duzenleyebilir())throw new Error('yetkisiz');await uzaktanTazele(['okulBilgileri']);"),'Okul bilgisi kaydı öncesinde güncel belge çekilmeli.');
assert(settings.includes("return this.kaydet({sosyalLinkler:normalizeSchoolSocialLinks(sosyalLinkler)})"),'Sosyal bağlantı kaydı eski kopyayla diğer alanları ezmemeli.');
assert(settings.includes("await window.KorukUzaktanTazele?.(['idariBilgiler']);adminInfoData=normalizeAdminInfo"),'İdari bilgiler açılışta zorla tazelenmeli.');
assert(!settings.includes("await window.SyncEngine.pull(['idariBilgiler']);adminInfoData"),'İdari bilgiler 24 saatlik TTL ile çekilmemeli.');
assert(settings.includes("if(page==='school'||page==='social')void window.KorukUzaktanTazele?.(['okulBilgileri']);if(page==='school'&&adminInfoAllowed()&&!adminInfoLoading){adminInfoDraft=null;void loadAdminInfo()}"),'Okul sayfası her açılışta güncel veriyi çekmeli.');
assert(settings.includes('async function adminInfoCatchUp(payload)')&&settings.includes('if(await adminInfoCatchUp(payload))return;await window.IdariBilgilerService.kaydet(payload);'),'Başkası arada kaydettiyse idari bilgiler ezilmemeli.');

// --- Firestore kuralı: Admin + Yönetici okul bilgilerini yazar, idari bilgileri okur/yazar
assert(/match \/oy_okulBilgileri\/\{id\} \{[^}]*allow create, update, delete: if adminMi\(\) \|\| yoneticiMi\(\) \|\| moduluDuzenleyebilir\('okulBilgileri'\);/s.test(rules),'oy_okulBilgileri yazma: admin veya yönetici olmalı.');
assert(/match \/oy_idariBilgiler\/\{id\} \{\s*allow read, create, update, delete: if adminMi\(\) \|\| yoneticiMi\(\);/.test(rules),'oy_idariBilgiler yalnız admin ve yönetici.');
assert(rules.includes("yoneticiRolAdi(get(/databases/$(database)/documents/oy_roller/$(kullaniciBelgesi().data.rolId)).data.get('ad', ''))"),'yoneticiMi rol adını güvenli okumalı (alan yoksa hata vermemeli).');

console.log('settings-shared-info-and-back.test.js: OK');
