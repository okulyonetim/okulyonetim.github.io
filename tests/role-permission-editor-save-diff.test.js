/* Regresyon: role-permission-editor.js'in kaydet işlemi SADECE kullanıcının gerçekten
 * değiştirdiği izinleri yazmalı. Önceki sürüm sayfadaki ~134 iznin HEPSİNİ (dokunulmamış
 * olanlar dahil) her kaydetmede yeniden yazıyordu. Somut sonucu: bir kullanıcı
 * "Yönetim" grubunda "Tümünü Düzenle" tıklayıp kaydettiğinde, rolün hiç module.* kuralı
 * olmadığı (dolayısıyla gerçek erişimin fail-open 'edit' olduğu) module.management gibi
 * dokunulmamış bir sayfa izni de, dropdown'da gösterilen 'hidden' varsayılanına
 * sabitleniyor ve menüdeki ilgili modül aniden kullanıcıdan gizleniyordu.
 */
const fs=require('fs');
const assert=require('assert');
const editor=fs.readFileSync('js/core/role-permission-editor.js','utf8');

assert(editor.includes("data-original="),'Her izin seçimi render anındaki değerini (baseline) DOM\'da taşımalı.');
assert(/if\(el\.value===el\.dataset\.original\)return;/.test(editor),'Kaydetme, değişmemiş seçimleri atlamalı (diff tabanlı kaydet).');
assert(!/host\.querySelectorAll\('\[data-permission\]'\)\.forEach\(el=>\{\s*yetkiler\[el\.dataset\.permission\]/.test(editor),'Kaydetme artık sayfadaki TÜM izinleri koşulsuz yeniden yazmamalı.');

// module.* (sayfa tavanı) girişleri artık kendi alanıyla (people/management/...)
// birlikte gruplanmalı, ayrı etiketsiz bir "module" grubuna düşmemeli.
assert(/parts\[0\]===['"]module['"]\?\(parts\[1\]/.test(editor),'module.* girişleri kendi alan grubuna (ör. management) ait olmalı, ayrı bir "module" grubuna değil.');

// Editördeki "varsayılan" gösterimi, gerçek moduleLevel() fail-open/fail-closed
// mantığıyla tutarlı olmalı (rolde hiç module.* kuralı yoksa varsayılan 'edit').
assert(/hasModuleRules\(r\)\?'hidden':'edit'/.test(editor),'Modül izninin örtük varsayılanı gerçek çalışma zamanı mantığını (moduleLevel) yansıtmalı.');

console.log('role-permission-editor-save-diff: OK');
