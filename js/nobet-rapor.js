/* ====================================================================
   Koruk Asistan — Nöbet Raporu Düzeni v3
   Dikey/yatay A4 seçimi, Android PrintPlugin uyumu, sayfayı alta kadar
   dinamik dolduran nöbet tablosu ve resmi tatil etiketleri.
   ==================================================================== */
(function(){
'use strict';

const YON_KEY='korukNobetRaporYon';
let seciliYon='dikey';
try{seciliYon=localStorage.getItem(YON_KEY)==='yatay'?'yatay':'dikey';}catch(_){ }
window.__nobetRaporYon=seciliYon;

function htmlEscape(v){
  return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function regexEscape(v){return String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

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
  if(tarihGrup)tarihGrup.parentNode.insertBefore(grup,tarihGrup);
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

function tatilSatirlariniEtiketle(html){
  let s=String(html||'');
  try{
    if(typeof nobetTatilMi!=='function'||typeof nobetGoruntulenenYil==='undefined'||typeof nobetGoruntulenenAy==='undefined')return s;
    const yil=nobetGoruntulenenYil, ay=nobetGoruntulenenAy;
    const gunSayisi=new Date(yil,ay+1,0).getDate();
    const baslikThSayisi=(s.match(/<th\b/gi)||[]).length;
    const colspan=Math.max(1,baslikThSayisi-1);
    const ayAdiTR=(typeof AYLAR!=='undefined'&&AYLAR[ay])?AYLAR[ay]:new Date(yil,ay,1).toLocaleDateString('tr-TR',{month:'long'});

    for(let d=1;d<=gunSayisi;d++){
      const iso=(typeof nobetTarihISO==='function')?nobetTarihISO(yil,ay,d):`${yil}-${String(ay+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const tatil=nobetTatilMi(iso);
      if(!tatil)continue;

      const dt=new Date(yil,ay,d);
      const gunAdi=(typeof GUNADI!=='undefined'&&GUNADI[dt.getDay()])?GUNADI[dt.getDay()]:dt.toLocaleDateString('tr-TR',{weekday:'long'});
      const tarihMetin=`${d} ${ayAdiTR} ${yil} ${gunAdi}`;
      let aciklama=(tatil&&typeof tatil==='object')?(tatil.aciklama||tatil.ad||tatil.adi||'RESMİ TATİL'):'RESMİ TATİL';
      aciklama=String(aciklama).trim()||'RESMİ TATİL';

      const gunAy=`${d} ${ayAdiTR}`;
      const gunAyBuyuk=gunAy.toLocaleUpperCase('tr');
      let etiket=aciklama.toLocaleUpperCase('tr');
      if(!etiket.includes(gunAyBuyuk))etiket=`${gunAyBuyuk} ${etiket}`;

      // Tatil hafta sonuna denk gelse bile tatil satırı önceliklidir. Eski
      // çıktı hafta sonunu önce işlediği için 30 Ağustos gibi tatillerin adı
      // kaybolabiliyordu; burada ilgili gün satırını tatil satırına çeviriyoruz.
      const re=new RegExp(`<tr>\\s*<td[^>]*>${regexEscape(tarihMetin)}<\\/td>[\\s\\S]*?<\\/tr>`,'i');
      const yeniSatir=`<tr class="nobet-resmi-tatil"><td class="nobet-tatil-tarih">${htmlEscape(tarihMetin)}</td><td class="nobet-tatil-adi" colspan="${colspan}">${htmlEscape(etiket)}</td></tr>`;
      s=s.replace(re,yeniSatir);
    }
  }catch(e){console.warn('[Nöbet Raporu] Tatil satırı düzenlenemedi:',e);}
  return s;
}

function nobetHtmlDuzenle(html,yon){
  const yatay=yon==='yatay';
  let s=tatilSatirlariniEtiketle(html);

  // Nöbet içeriğinin eski sabit portrait @page tanımını kaldır.
  s=s.replace(/@page\s*\{[^}]*\}/gi,'');
  s=s.replace(
    '<div style="width:100%;max-width:194mm;">',
    `<div class="nobet-a4-fit ${yatay?'nobet-yatay':'nobet-dikey'}" style="width:100%;max-width:none;">`
  );

  // Ana çizelge tablosunu işaretle. Bu tablo kalan A4 yüksekliğini dolduran
  // esnek alan olur; 28/29/30/31 günlük aylarda satırlar otomatik büyür.
  s=s.replace(
    '<table style="border-collapse:collapse;width:100%;">',
    '<table class="nobet-main-table" style="border-collapse:collapse;width:100%;">'
  );

  const css=`<style>
    .rapor-toolbar,.rapor-header{display:none!important;visibility:hidden!important;}

    /* Web önizleme kağıdının ve Android PrintPlugin sayfasının ortak güvenli
       içerik yüksekliği. Dikeyde yaklaşık 286mm, yatayda 199mm kullanılır. */
    .nobet-a4-fit{
      width:100%!important;max-width:none!important;margin:0!important;padding:0!important;
      height:${yatay?'199mm':'286mm'}!important;min-height:${yatay?'199mm':'286mm'}!important;
      display:flex!important;flex-direction:column!important;overflow:hidden!important;
      color:#111!important;font-family:Arial,sans-serif!important;
    }
    .nobet-a4-fit>div{flex:0 0 auto!important;}
    .nobet-main-table{
      width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;
      margin:0!important;flex:1 1 auto!important;height:100%!important;min-height:0!important;
    }
    .nobet-main-table tbody{height:100%!important;}
    .nobet-main-table tbody tr{height:auto!important;}

    .nobet-main-table thead th:first-child,.nobet-main-table tbody td:first-child{text-align:left!important;}
    .nobet-main-table thead th:not(:first-child),.nobet-main-table tbody td:not(:first-child){text-align:center!important;}
    .nobet-main-table thead th:first-child,.nobet-main-table tbody td:first-child{width:${yatay?'15%':'22%'}!important;}
    .nobet-main-table thead th:not(:first-child){width:auto!important;}

    /* Resmî tatiller hafta sonuna denk gelse dahi kendi adıyla görünür. */
    .nobet-main-table .nobet-resmi-tatil td{background:#FFF5D8!important;border-color:#E6D18A!important;}
    .nobet-main-table .nobet-resmi-tatil .nobet-tatil-tarih{text-align:left!important;color:#5D4A08!important;font-weight:750!important;}
    .nobet-main-table .nobet-resmi-tatil .nobet-tatil-adi{text-align:center!important;color:#8A6500!important;font-weight:850!important;letter-spacing:.015em!important;}

    .nobet-a4-fit>div:first-child{border-bottom-color:#145A46!important;margin-bottom:${yatay?'2.5pt':'4pt'}!important;padding-bottom:${yatay?'2pt':'3pt'}!important;}
    .nobet-a4-fit>div:first-child div{color:#145A46!important;}
    .nobet-a4-fit>div:first-child img{height:${yatay?'23pt':'28pt'}!important;}
    .nobet-a4-fit>div:not(:first-child){margin-top:${yatay?'2pt':'3.5pt'}!important;padding-top:${yatay?'1.5pt':'2.5pt'}!important;}

    .nobet-a4-fit ol{margin:0!important;padding-left:${yatay?'10pt':'12pt'}!important;font-size:${yatay?'4.7pt':'5.7pt'}!important;line-height:${yatay?'1.08':'1.18'}!important;}
    .nobet-a4-fit ol li{margin:0!important;padding:0!important;}
    .nobet-a4-fit .imza-alan{margin-top:${yatay?'2pt':'4pt'}!important;font-size:${yatay?'4.8pt':'5.8pt'}!important;line-height:${yatay?'1.15':'1.28'}!important;page-break-inside:avoid!important;break-inside:avoid!important;}
    .nobet-a4-fit .imza-alan p{margin:0!important;}
    .nobet-a4-fit .imza-alan>div{margin-top:${yatay?'2pt':'4pt'}!important;line-height:${yatay?'1.2':'1.4'}!important;}

    .nobet-main-table th{font-size:${yatay?'5.7pt':'6.8pt'}!important;line-height:1.05!important;padding:${yatay?'.45pt 1.2pt':'1pt 2pt'}!important;vertical-align:middle!important;}
    .nobet-main-table td{font-size:${yatay?'5.5pt':'6.6pt'}!important;line-height:1.05!important;padding:${yatay?'.4pt 1.2pt':'.8pt 2pt'}!important;vertical-align:middle!important;}

    @media print{
      html,body{margin:0!important;padding:0!important;overflow:visible!important;}
      .rapor-toolbar,.rapor-header{display:none!important;visibility:hidden!important;}
      .nobet-a4-fit{width:100%!important;max-width:none!important;height:${yatay?'199mm':'286mm'}!important;min-height:${yatay?'199mm':'286mm'}!important;page-break-inside:avoid!important;break-inside:avoid!important;overflow:hidden!important;}
      .nobet-main-table,.nobet-main-table tr{page-break-inside:avoid!important;break-inside:avoid!important;}
    }
  </style>`;
  return css+s;
}

function raporMotorunuSar(){
  const fn=window._raporPenceresiniAc;
  if(typeof fn!=='function'||!fn.__korukPreviewV5||fn.__korukNobetA4)return false;
  const sarilan=function(htmlIcerik,baslik,secenekler){
    if(!nobetHtmlMi(htmlIcerik))return fn.apply(this,arguments);
    const yon=window.__nobetRaporYon==='yatay'?'yatay':'dikey';
    const opts=Object.assign({},secenekler||{}, {yon,nobetRaporu:true,logoGoster:false,ortaliBaslik:false});
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
