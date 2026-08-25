/* Koruk Asistan — Legacy UI bridge v3
   Köklü yeniden yazım sırasında eski modern/fix/v2 tasarım katmanlarını
   dinamik olarak YÜKLEMEZ. Tek tasarım kaynağı css/design-system.css'tir.
   Bu dosya yalnız geçişte gerekli iki davranış köprüsünü korur ve index.html
   sadeleştirildiğinde tamamen kaldırılacaktır. */
(function(){
'use strict';
if(window.__KORUK_LEGACY_UI_BRIDGE__)return;
window.__KORUK_LEGACY_UI_BRIDGE__=true;

function scriptYukle(src,key){
  if(document.querySelector('script[data-'+key+']')||document.querySelector('script[src="'+src+'"]'))return null;
  const s=document.createElement('script');s.src=src;s.async=true;s.setAttribute('data-'+key,'1');document.head.appendChild(s);return s;
}

/* Yetki görünürlüğü eski ekranlar taşınana kadar korunur. */
if(!window.__ROLE_UI_HARDENING__)scriptYukle('js/role-ui-hardening.js','role-ui-hardening');

/* Veri tutarlılığı yalnız ilgili ekran ilk açıldığında yüklenir; açılışı bloklamaz. */
let consistencyLoading=false;
function consistencyLoad(){
  if(window.__KORUK_SCHOOL_DATA_CONSISTENCY__||consistencyLoading)return;
  consistencyLoading=true;
  const s=scriptYukle('js/school-data-consistency.js?v=6','school-data-consistency');
  if(!s){consistencyLoading=false;return;}
  s.addEventListener('load',()=>{consistencyLoading=false},{once:true});
  s.addEventListener('error',()=>{consistencyLoading=false},{once:true});
}
document.addEventListener('click',e=>{
  const tab=e.target.closest?.('[data-tab]')?.getAttribute('data-tab');
  if(tab&&['ogretmenler','siniflar','ogrenciler'].includes(tab))consistencyLoad();
},true);

/* Eski görünüm paketlerini artık tasarım kaynağı olarak kullanma. */
try{localStorage.removeItem('oyGorunum')}catch(_){}
document.documentElement.removeAttribute('data-skin');
})();
