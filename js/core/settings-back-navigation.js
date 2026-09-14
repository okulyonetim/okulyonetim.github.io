/* Koruk Asistan — Ayarlar alt sayfa geri navigasyonu düzeltmesi.
 * Alt ayar sayfaları Shell geçmişine ayrı görünüm olarak eklenir.
 * Böylece Android/tarayıcı geri tuşu önce Ayarlar ana sayfasına döner.
 * Ayarlar yeniden açıldığında her zaman ana sayfadan başlar.
 */
(function(global){
'use strict';
if(global.__korukSettingsBackNavigation)return;
global.__korukSettingsBackNavigation=true;

let patched=false;

function settingsMounted(){
  return !!document.querySelector('[data-settings-module]');
}
function settingsTitle(){
  return String(document.querySelector('[data-settings-title]')?.textContent||'').trim();
}
function isSettingsHome(){
  return settingsMounted()&&settingsTitle()==='Ayarlar';
}
function pageTitle(button){
  return String(button?.querySelector('strong')?.textContent||button?.textContent||'').trim();
}

function patchApis(){
  const settings=global.SettingsModule,shell=global.ShellUI;
  if(!settings||!shell)return false;
  if(patched)return true;
  patched=true;

  const originalMount=settings.mount?.bind(settings);
  if(originalMount){
    settings.mount=async function(...args){
      const result=await originalMount(...args);
      settings.openPage?.('home','Ayarlar');
      return result;
    };
  }

  const originalRoute=shell.routeModule?.bind(shell);
  if(originalRoute){
    shell.routeModule=async function(name,options={}){
      const result=await originalRoute(name,options);
      if(name==='settings'&&!options?.page&&settingsMounted())settings.openPage?.('home','Ayarlar');
      return result;
    };
  }
  return true;
}

/* Eski SettingsModule tıklama bağlayıcısından önce çalışır. Alt sayfayı doğrudan
 * openPage ile açmak yerine Shell rotası olarak kaydederiz. Böylece navStack geri
 * tuşunda Ayarlar rotasını kapatmak yerine önce bir önceki Ayarlar görünümüne döner. */
document.addEventListener('click',event=>{
  const button=event.target?.closest?.('[data-settings-open]');
  if(!button||!settingsMounted())return;
  const page=String(button.dataset.settingsOpen||'').trim();
  if(!page)return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  patchApis();
  global.ShellUI?.routeModule?.('settings',{
    bottom:'menu',
    page,
    title:pageTitle(button),
    remember:true
  });
},true);

/* Ayarlar başlığındaki geri butonu da alt sayfadayken Shell geçmişini kullanır.
 * Ana Ayarlar sayfasındaysa mevcut Shell geri davranışı normal şekilde devam eder. */
document.addEventListener('click',event=>{
  const button=event.target?.closest?.('[data-settings-back]');
  if(!button||!settingsMounted()||isSettingsHome())return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  global.ShellUI?.back?.();
},true);

const timer=setInterval(()=>{if(patchApis())clearInterval(timer)},100);
window.addEventListener('koruk:app-ready',patchApis);
window.addEventListener('koruk:module-ready',event=>{if(event.detail?.name==='settings')patchApis()});
document.addEventListener('DOMContentLoaded',patchApis,{once:true});
setTimeout(()=>clearInterval(timer),15000);

global.KorukSettingsBackNavigation={patchApis,isSettingsHome};
})(window);
