/* Koruk Asistan — Okul kimliği (okul adı + logo)
 * İki okul (1–4. sınıflar ilkokul, 5–8. sınıflar ortaokul) tek uygulamayı kullanır. Başlıkta ve belgelerde hangi okulun adı ve logosunun
 * görüneceği şu sırayla belirlenir:
 *  1) bağlam: açıkça verilen kademe, sınıf düzeyi ya da sınıf adı (5/A → ortaokul); sınıflar iki kademeden ise genel kimlik,
 *  2) giriş yapan kullanıcının bağlı olduğu öğretmenin kademesi (yalnız ilkokul ya da yalnız ortaokul işaretliyse; işaret yoksa
 *     ya da ikisi de işaretliyse sınıf öğretmenliği yaptığı sınıfların kademesi),
 *  3) aksi halde (yönetici, iki kademede de görevli öğretmen) okulun genel adı ve ortak logosu.
 * Okul adları Okul Bilgileri ayarlarındaki "İlkokul adı / Ortaokul adı" alanlarından gelir; boşsa varsayılan ad kullanılır.
 * Bağlam: 'ilkokul' | 'ortaokul' | 5 | '5/A' | { kademe, duzey, sinif, siniflar:['5/A','6/B'] }
 */
(function(global){
'use strict';
if(global.SchoolIdentity)return;
const LOGO={ilkokul:'assets/logo.png',ortaokul:'assets/logo-ortaokul.png',genel:'assets/logo.png'};
const SIMGE={ilkokul:'assets/icon-192.png',ortaokul:'assets/icon-ortaokul-192.png',genel:'assets/icon-192.png'};
const VARSAYILAN_AD={ilkokul:'Koruk İlkokulu',ortaokul:'Şehit Remzi Yemez Ortaokulu'};
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const kayit=()=>{const l=rows('okulBilgileri');return l.find(x=>x.id==='ayarlar')||l[0]||global.okulBilgileriAyari||{}};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const duzeyOf=v=>{const n=parseInt(String(v??'').trim(),10);return n>=1&&n<=8?n:0};
const duzeyKademe=n=>n>=1&&n<=4?'ilkokul':n>=5&&n<=8?'ortaokul':'';
const evet=v=>v===true||v===1||v==='on'||v==='true';
/* Okul tek kademeliyse (Okul Bilgileri → kademeler) ayrım yapılmaz. */
const ortak=()=>{const l=kayit().kademeler;return!Array.isArray(l)||(l.includes('ilkokul')&&l.includes('ortaokul'))};

function baglamKademesi(ctx){
 if(ctx==null||ctx==='')return'';
 if(typeof ctx==='number')return duzeyKademe(ctx);
 if(typeof ctx==='string')return ctx==='ilkokul'||ctx==='ortaokul'?ctx:duzeyKademe(duzeyOf(ctx));
 if(typeof ctx!=='object')return'';
 if(ctx.kademe==='ilkokul'||ctx.kademe==='ortaokul')return ctx.kademe;
 const tek=duzeyKademe(duzeyOf(ctx.duzey))||duzeyKademe(duzeyOf(ctx.sinif));
 if(tek)return tek;
 if(Array.isArray(ctx.siniflar)&&ctx.siniflar.length){const k=new Set(ctx.siniflar.map(s=>duzeyKademe(duzeyOf(s))));return k.size===1?[...k][0]:''}
 return''
}
function kullaniciKademesi(){
 const u=user(),id=String(u.bagliOgretmenId||u.ogretmenId||'');if(!id)return'';
 const o=rows('ogretmenler').find(x=>String(x.id)===id);if(!o)return'';
 const il=evet(o.ilkokul),or=evet(o.ortaokul);
 if(il!==or)return il?'ilkokul':'ortaokul';
 const k=new Set(rows('siniflar').filter(c=>String(c.sinifOgretmeniId||c.ogretmenId||'')===id).map(c=>duzeyKademe(duzeyOf(c.ad||c.sinifAdi||c.seviye))).filter(Boolean));
 return k.size===1?[...k][0]:''
}
function kademe(ctx){
 if(!ortak())return'';
 const acik=baglamKademesi(ctx);
 /* Bağlam verildi ama iki kademeyi kapsıyorsa (ör. karma gezi) kullanıcının kademesine düşmeyip genel kimlik kullanılır. */
 if(acik)return acik;
 if(ctx&&typeof ctx==='object'&&Array.isArray(ctx.siniflar)&&ctx.siniflar.length)return'';
 return kullaniciKademesi()
}
function get(ctx){
 const k=kademe(ctx),o=kayit(),genel=String(o.okulAdi||o.ad||'').trim();
 const ad=k?String(o[`${k}Adi`]||'').trim()||VARSAYILAN_AD[k]:genel;
 return{kademe:k,okulAdi:ad,genelAd:genel,logo:LOGO[k||'genel'],simge:SIMGE[k||'genel']}
}
const okulAdi=ctx=>get(ctx).okulAdi;
const logo=ctx=>get(ctx).logo;
const logolar=()=>[...new Set(Object.values(LOGO))];

/* Uygulama başlığı: giriş yapan öğretmenin kademesi belliyse o okulun simgesi ve adı; değilse sayfanın özgün başlığı. */
let ozgun=null;
function basligiGuncelle(){
 try{
  const d=global.document;if(!d)return;
  const img=d.querySelector('.ka-school-logo'),ad=d.querySelector('.ka-app-brand strong');if(!img&&!ad)return;
  if(!ozgun)ozgun={src:img?.getAttribute('src')||'',alt:img?.getAttribute('alt')||'',ad:ad?.textContent||''};
  const g=get(),k=g.kademe;
  const src=k?g.simge:ozgun.src,alt=k?g.okulAdi:ozgun.alt,metin=k?g.okulAdi.toLocaleUpperCase('tr'):ozgun.ad;
  if(img){if(img.getAttribute('src')!==src)img.setAttribute('src',src);if(img.getAttribute('alt')!==alt)img.setAttribute('alt',alt)}
  if(ad&&ad.textContent!==metin)ad.textContent=metin
 }catch(_){}
}
function baslat(){
 basligiGuncelle();
 const s=global.AppStore?.subscribe;if(typeof s!=='function')return;
 ['session.user','data.okulBilgileri','data.ogretmenler','data.siniflar'].forEach(p=>s(p,basligiGuncelle));
}
global.SchoolIdentity={get,kademe,okulAdi,logo,logolar,kademeOf:baglamKademesi,basligiGuncelle,LOGO,SIMGE,VARSAYILAN_AD};
if(global.document?.readyState==='loading')global.document.addEventListener('DOMContentLoaded',baslat);else baslat();
})(window);
