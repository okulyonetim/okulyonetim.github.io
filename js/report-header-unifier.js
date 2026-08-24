/* Koruk Asistan — Rapor başlık standardı
   Tüm _raporPenceresiniAc raporlarında nöbet çizelgesi mantığında
   tek, logolu, büyük ana başlık kullanır. Veri/rapor motoruna dokunmaz. */
(function(){
'use strict';

function sadeMetin(v){
  return String(v||'')
    .replace(/[📅📋⏰🚌🎗️📚👨‍👩‍👧📊📄📝🗓️📌🔔✅🏫👤👥]/gu,'')
    .replace(/\s+/g,' ').trim();
}
function norm(v){
  return sadeMetin(v).toLocaleUpperCase('tr-TR')
    .replace(/[^A-ZÇĞİÖŞÜ0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function ayniBaslikMi(html, baslik){
  const m=String(html||'').match(/^\s*<div[^>]*class=["'][^"']*bolum-baslik[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if(!m) return null;
  const txt=m[1].replace(/<[^>]+>/g,' ');
  return norm(txt)===norm(baslik) ? m[0] : null;
}
function stil(){return `<style id="koruk-tek-rapor-baslik">
.rapor-header{
  display:flex!important;align-items:center!important;justify-content:flex-start!important;
  gap:11px!important;border-bottom:2px solid #176b57!important;
  padding:3px 2px 8px!important;margin:0 0 12px!important;
}
.rapor-header>img{width:48px!important;height:48px!important;min-width:48px!important;object-fit:contain!important;}
.rapor-header-text{min-width:0!important;flex:1!important;text-align:left!important;}
.rapor-header-text h1{
  margin:0!important;color:#176b57!important;font-size:21px!important;line-height:1.08!important;
  font-weight:850!important;letter-spacing:-.25px!important;text-transform:none!important;
}
.rapor-header-text h2{margin:4px 0 0!important;color:#374a44!important;font-size:10.5px!important;line-height:1.15!important;font-weight:700!important;}
.rapor-header-text .rapor-tarih{margin-top:2px!important;color:#78857f!important;font-size:9px!important;line-height:1.15!important;}
.rapor-header.rapor-header-ortali{flex-direction:row!important;text-align:left!important;}
.rapor-header.rapor-header-ortali .rapor-header-text{text-align:left!important;}
.rapor-header.rapor-header-ortali .rapor-header-text h1{font-size:21px!important;margin:0!important;}
@media print{
 .rapor-header{padding-bottom:6px!important;margin-bottom:9px!important;}
 .rapor-header>img{width:44px!important;height:44px!important;min-width:44px!important;}
 .rapor-header-text h1,.rapor-header.rapor-header-ortali .rapor-header-text h1{font-size:19px!important;}
}
</style>`;}

function kur(){
  const asil=window._raporPenceresiniAc;
  if(typeof asil!=='function'||asil.__korukTekBaslik) return false;
  const sar=function(html,baslik,secenekler){
    // Nöbet raporu kendi birleşik resmi başlığını zaten üretiyor; onu aynen koru.
    if(secenekler&&secenekler.nobetRaporu) return asil.apply(this,arguments);
    let govde=String(html||'');
    const tekrar=ayniBaslikMi(govde,baslik);
    if(tekrar) govde=govde.replace(tekrar,'');
    const temizBaslik=sadeMetin(baslik);
    const opts=Object.assign({},secenekler||{});
    // Rapor başlığında emoji/ikinci dekoratif başlık yerine tek kurumsal başlık.
    return asil.call(this,stil()+govde,temizBaslik,opts);
  };
  sar.__korukTekBaslik=true;
  sar.__korukAsil=asil;
  window._raporPenceresiniAc=sar;
  return true;
}

let n=0;
const t=setInterval(function(){if(kur()||++n>300)clearInterval(t);},100);
document.addEventListener('DOMContentLoaded',function(){setTimeout(kur,0);});
window.addEventListener('load',function(){setTimeout(kur,80);});
})();
