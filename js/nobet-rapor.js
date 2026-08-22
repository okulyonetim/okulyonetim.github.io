/* ====================================================================
   Koruk Asistan — Nöbet Raporu Düzeni
   Dikey/yatay A4 seçimi, Android PrintPlugin uyumu ve tek sayfa sığdırma.
   Mevcut veri modeli ve modal aç/kapa altyapısını değiştirmez.
   ==================================================================== */
(function(){
'use strict';

const YON_KEY='korukNobetRaporYon';
let seciliYon='dikey';
try{seciliYon=localStorage.getItem(YON_KEY)==='yatay'?'yatay':'dikey';}catch(_){ }
window.__nobetRaporYon=seciliYon;

function yonKontrolEkle(){
  const body=document.getElementById('modalBody');
  const tarih=document.getElementById('nobetGecerlilikTarihi');
  if(!body||!tarih||document.getElementById('nobetRaporYonSec'))return;

  const grup=document.createElement('div');
  grup.className='form-group';
  grup.innerHTML=`
    <label for="nobetRaporYonSec" style="display:block;margin-bottom:6px;font-weight:700;">Sayfa Yönü</label>
    <select id="nobetRaporYonSec" class="form-control" style="width:100%;">
      <option value="dikey" ${window.__nobetRaporYon==='dikey'?'selected':''}>Dikey A4</option>
      <option value="yatay" ${window.__nobetRaporYon==='yatay'?'selected':''}>Yatay A4</option>
    </select>
    <div style="margin-top:6px;font-size:12px;opacity:.72;">Çizelge seçilen A4 yönüne tek sayfada sığdırılır.</div>`;

  const tarihGrup=tarih.closest('.form-group');
  if(tarihGrup) tarihGrup.parentNode.insertBefore(grup,tarihGrup);
  else body.insertBefore(grup,body.firstChild);

  grup.querySelector('#nobetRaporYonSec').addEventListener('change',function(){
    window.__nobetRaporYon=this.value==='yatay'?'yatay':'dikey';
    try{localStorage.setItem(YON_KEY,window.__nobetRaporYon);}catch(_){ }
  });
}

function nobetModaliniSar(){
  const fn=window.raporNobetListesi;
  if(typeof fn!=='function'||fn.__korukYonSecimi)return false;
  window.raporNobetListesi=function(){
    const sonuc=fn.apply(this,arguments);
    requestAnimationFrame(()=>requestAnimationFrame(yonKontrolEkle));
    return sonuc;
  };
  window.raporNobetListesi.__korukYonSecimi=true;
  return true;
}

function nobetHtmlMi(html){
  const s=String(html||'');
  return s.includes('ÖĞRETMEN NÖBET ÇİZELGESİ')&&s.includes('NÖBETÇİ ÖĞRETMENİN GÖREVLERİ');
}

function nobetHtmlDuzenle(html,yon){
  const yatay=yon==='yatay';
  let s=String(html||'');

  // Nöbet içeriğinin eskiden kendi içinde zorladığı portrait @page kuralını
  // kaldır. Sayfa yönünü artık yalnız üst rapor motoru belirler.
  s=s.replace(/@page\s*\{[^}]*\}/gi,'');
  s=s.replace(
    '<div style="width:100%;max-width:194mm;">',
    `<div class="nobet-a4-fit ${yatay?'nobet-yatay':'nobet-dikey'}" style="width:100%;max-width:none;">`
  );

  const css=`<style>
    /* Android PrintPlugin dahil tüm çıktılarda önizleme araçlarını rapordan çıkar. */
    .rapor-toolbar{display:none!important;visibility:hidden!important;}
    .rapor-header{display:none!important;visibility:hidden!important;}

    .nobet-a4-fit{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;color:#111!important;font-family:Arial,sans-serif!important;}
    .nobet-a4-fit table{width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;margin:0!important;}
    .nobet-a4-fit thead th:first-child,.nobet-a4-fit tbody td:first-child{text-align:left!important;}
    .nobet-a4-fit thead th:not(:first-child),.nobet-a4-fit tbody td:not(:first-child){text-align:center!important;}
    .nobet-a4-fit thead th:first-child,.nobet-a4-fit tbody td:first-child{width:${yatay?'15%':'22%'}!important;}
    .nobet-a4-fit thead th:not(:first-child){width:auto!important;}
    .nobet-a4-fit > div:first-child{border-bottom-color:#145A46!important;margin-bottom:${yatay?'2.5pt':'4pt'}!important;padding-bottom:${yatay?'2pt':'3pt'}!important;}
    .nobet-a4-fit > div:first-child div{color:#145A46!important;}
    .nobet-a4-fit > div:first-child img{height:${yatay?'23pt':'28pt'}!important;}
    .nobet-a4-fit > div:not(:first-child){margin-top:${yatay?'2pt':'3.5pt'}!important;padding-top:${yatay?'1.5pt':'2.5pt'}!important;}
    .nobet-a4-fit ol{margin:0!important;padding-left:${yatay?'10pt':'12pt'}!important;font-size:${yatay?'4.7pt':'5.7pt'}!important;line-height:${yatay?'1.08':'1.18'}!important;}
    .nobet-a4-fit ol li{margin:0!important;padding:0!important;}
    .nobet-a4-fit .imza-alan{margin-top:${yatay?'2pt':'4pt'}!important;font-size:${yatay?'4.8pt':'5.8pt'}!important;line-height:${yatay?'1.15':'1.28'}!important;page-break-inside:avoid!important;break-inside:avoid!important;}
    .nobet-a4-fit .imza-alan p{margin:0!important;}
    .nobet-a4-fit .imza-alan > div{margin-top:${yatay?'2pt':'4pt'}!important;line-height:${yatay?'1.2':'1.4'}!important;}

    .nobet-a4-fit th{font-size:${yatay?'5.7pt':'6.8pt'}!important;line-height:1.05!important;padding:${yatay?'.45pt 1.2pt':'1pt 2pt'}!important;height:${yatay?'9pt':'12pt'}!important;vertical-align:middle!important;}
    .nobet-a4-fit td{font-size:${yatay?'5.5pt':'6.6pt'}!important;line-height:1.05!important;padding:${yatay?'.4pt 1.2pt':'.8pt 2pt'}!important;height:${yatay?'10.2pt':'13.5pt'}!important;vertical-align:middle!important;}

    @media print{
      html,body{margin:0!important;padding:0!important;overflow:visible!important;}
      .rapor-toolbar,.rapor-header{display:none!important;visibility:hidden!important;}
      .nobet-a4-fit{width:100%!important;max-width:none!important;page-break-inside:avoid!important;break-inside:avoid!important;}
      .nobet-a4-fit table,.nobet-a4-fit tr{page-break-inside:avoid!important;break-inside:avoid!important;}
    }
  </style>`;
  return css+s;
}

function raporMotorunuSar(){
  const fn=window._raporPenceresiniAc;
  // Rapor önizleme v5 yüklenmeden sarmıyoruz. Böylece web ve Android aynı
  // normalizasyon katmanından geçer; yükleme sırası yarışına girmez.
  if(typeof fn!=='function'||!fn.__korukPreviewV5||fn.__korukNobetA4)return false;

  const sarilan=function(htmlIcerik,baslik,secenekler){
    if(!nobetHtmlMi(htmlIcerik))return fn.apply(this,arguments);
    const yon=window.__nobetRaporYon==='yatay'?'yatay':'dikey';
    const opts=Object.assign({},secenekler||{}, {
      yon,
      nobetRaporu:true,
      logoGoster:false,
      ortaliBaslik:false
    });
    return fn.call(this,nobetHtmlDuzenle(htmlIcerik,yon),baslik,opts);
  };
  sarilan.__korukNobetA4=true;
  window._raporPenceresiniAc=sarilan;
  return true;
}

let deneme=0;
const timer=setInterval(()=>{
  nobetModaliniSar();
  const motor=raporMotorunuSar();
  if((motor||window._raporPenceresiniAc?.__korukNobetA4)&&window.raporNobetListesi?.__korukYonSecimi)clearInterval(timer);
  if(++deneme>400)clearInterval(timer);
},100);

document.addEventListener('DOMContentLoaded',()=>{setTimeout(nobetModaliniSar,0);setTimeout(raporMotorunuSar,0);});
window.addEventListener('load',()=>{setTimeout(nobetModaliniSar,50);setTimeout(raporMotorunuSar,50);});
})();
