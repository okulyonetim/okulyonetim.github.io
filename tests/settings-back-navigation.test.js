const fs=require('fs');
const assert=require('assert');
const bridge=fs.readFileSync('js/core/settings-back-navigation.js','utf8');
const loader=fs.readFileSync('js/core/teacher-reminder-academic-year.js','utf8');
new Function(bridge);
new Function(loader);

for(const token of [
  "closest?.('[data-settings-open]')",
  "ShellUI?.routeModule?.('settings'",
  "closest?.('[data-settings-back]')",
  "global.ShellUI?.back?.()",
  "settings.openPage?.('home','Ayarlar')",
  "if(name==='settings'&&!options?.page&&settingsMounted())settings.openPage?.('home','Ayarlar')"
]) assert(bridge.includes(token),`Ayarlar geri navigasyonu sözleşmesi eksik: ${token}`);

assert(loader.includes("settings-back-navigation.js?v=944"),'Ayarlar geri navigasyon köprüsü uygulama başlangıcında yüklenmeli.');
assert(bridge.includes('event.stopImmediatePropagation()'),'Eski doğrudan SettingsModule.openPage tıklaması devre dışı bırakılmalı.');
assert(bridge.includes("remember:true"),'Ayarlar alt sayfası Shell geçmişine kaydedilmeli.');

console.log('Ayarlar geri navigasyonu sözleşmesi başarılı.');
