/* Koruk Asistan — XLSM belge görüntüleme desteği
 * Makrolar çalıştırılmaz; çalışma kitabı mevcut XLSX görüntüleyici hattında salt okunur açılır.
 */
(function(){
'use strict';
let deneme=0;
function kur(){
  const d=window.DokumanOkuyucu;
  if(!d||typeof d.ac!=='function'||typeof d.destekliMi!=='function'){
    if(deneme++<100)setTimeout(kur,100);
    return;
  }
  if(d.__xlsmDestegi)return;
  const eskiAc=d.ac.bind(d),eskiDestek=d.destekliMi.bind(d);
  const uzanti=s=>{try{const n=decodeURIComponent(String(s||'').split('?')[0].split('#')[0].split('/').pop()||'');const i=n.lastIndexOf('.');return i<0?'':n.slice(i+1).toLowerCase();}catch(_){return '';}};
  d.destekliMi=function(s){return uzanti(s)==='xlsm'||eskiDestek(s);};
  d.ac=async function(url,name){
    const gercekAd=name||decodeURIComponent(String(url||'').split('?')[0].split('/').pop()||'Belge');
    if(uzanti(gercekAd)!=='xlsm'&&uzanti(url)!=='xlsm')return eskiAc(url,name);
    // Mevcut XLSX render hattını kullan. ExcelJS/SheetJS VBA kodunu çalıştırmaz.
    const geciciAd=/\.xlsm$/i.test(gercekAd)?gercekAd.replace(/\.xlsm$/i,'.xlsx'):gercekAd+'.xlsx';
    const sonuc=await eskiAc(url,geciciAd);
    requestAnimationFrame(()=>{
      const kok=document.getElementById('dv3');
      if(!kok)return;
      const baslik=kok.querySelector('.dv3title b');
      const tur=kok.querySelector('.dv3title small');
      if(baslik)baslik.textContent=gercekAd;
      if(tur)tur.textContent='XLSM · Makrolar çalıştırılmaz';
    });
    return sonuc;
  };
  d.__xlsmDestegi=true;
}
kur();
})();