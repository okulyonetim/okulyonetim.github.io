/* Koruk Asistan — Belirli Gün ve Haftalar katalog açılış köprüsü
 * Klasik çizelge sayfasındaki "Yeni Etkinlik" butonunun eski forma düşmesini önler.
 * Mevcut katalog modülünü kullanır; veri modeline ve izin sistemine dokunmaz.
 */
(function(global){
'use strict';
if(global.__BelirliGunlerCatalogBridge)return;
global.__BelirliGunlerCatalogBridge=true;

function openCatalog(){
  const catalog=global.BelirliGunlerCatalog;
  if(catalog?.open?.())return true;
  return false;
}

// Capture aşamasında çalışır; klasik bindPage içindeki eski openEdit çağrısından
// önce yakalayıp katalog seçim ekranını açar.
document.addEventListener('click',function(event){
  const button=event.target?.closest?.('[data-cizelge-add]');
  if(!button)return;
  if(global.ClassicCizelgelerParity?.currentType!=='belirliGunler')return;
  if(button.getAttribute('aria-disabled')==='true'||button.disabled)return;
  if(openCatalog()){
    event.preventDefault();
    event.stopImmediatePropagation();
  }
},true);
})(window);
