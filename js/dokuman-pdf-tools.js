/* Koruk Asistan — Döküman PDF araçları v5
 * Resimden PDF + gerçek pdf-lib birleştirme + önizleme + Android dışa aktarma
 * + Dökümanlar arşivine kaydetme + bağımsız navigasyon hedefleri.
 * Türkçe karakterler aynen korunur; yalnız dosya sistemi için geçersiz karakterler temizlenir.
 */
(function(){
'use strict';

const PDFLIB_SRC='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
let _dokPdfOnizlemeUrl=null;

function _dokScriptYukle(src,test){
  if(test()) return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const mevcut=[...document.scripts].find(s=>s.src===src);
    if(mevcut){
      mevcut.addEventListener('load',resolve,{once:true});
      mevcut.addEventListener('error',()=>reject(new Error('Kütüphane yüklenemedi.')),{once:true});
      return;
    }
    const s=document.createElement('script');
    s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Kütüphane yüklenemedi.'));
    document.head.appendChild(s);
  });
}

function _dokPdfDosyaAdi(ad,varsayilan){
  let temiz=String(ad||varsayilan||'belge').trim();
  temiz=temiz.replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '-').replace(/\s+/g,' ').replace(/[. ]+$/g,'');
  if(!temiz) temiz=varsayilan||'belge';
  if(!/\.pdf$/i.test(temiz)) temiz+='.pdf';
  return temiz;
}
window._dokPdfDosyaAdi=_dokPdfDosyaAdi;

function _dokBlobUrlTemizle(){
  if(!_dokPdfOnizlemeUrl) return;
  try{URL.revokeObjectURL(_dokPdfOnizlemeUrl);}catch(_){}
  _dokPdfOnizlemeUrl=null;
}

function dokumanHazirPdfOnizle(){
  if(!_dokResimPdfBlob){toast('Önizlenecek PDF henüz oluşturulmadı.');return;}
  _dokBlobUrlTemizle();
  _dokPdfOnizlemeUrl=URL.createObjectURL(_dokResimPdfBlob);
  const ad=_dokPdfDosyaAdi(document.getElementById('dok_ad')?.value,'belge');
  if(window.DokumanOkuyucu&&typeof window.DokumanOkuyucu.ac==='function'){
    window.DokumanOkuyucu.ac(_dokPdfOnizlemeUrl,ad);
  }else{
    window.open(_dokPdfOnizlemeUrl,'_blank');
  }
}
window.dokumanHazirPdfOnizle=dokumanHazirPdfOnizle;

async function _dokGorselPdfIcinSinirla(islenmis,maxUzunKenar){
  const max=maxUzunKenar||2400;
  if(!islenmis||!islenmis.dataUrl) throw new Error('Görsel işlenemedi.');
  if(Math.max(islenmis.w,islenmis.h)<=max) return islenmis;
  const img=await new Promise((resolve,reject)=>{
    const x=new Image();
    x.onload=()=>resolve(x);x.onerror=()=>reject(new Error('Görsel yeniden boyutlandırılamadı.'));x.src=islenmis.dataUrl;
  });
  const oran=max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height);
  const w=Math.max(1,Math.round((img.naturalWidth||img.width)*oran));
  const h=Math.max(1,Math.round((img.naturalHeight||img.height)*oran));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
  return{dataUrl:canvas.toDataURL('image/jpeg',0.88),w,h};
}

function _dokPdfSonucArayuzu(sayfa,mesaj){
  const onizle=document.getElementById('dok_resim_onizle');
  const disaAktar=document.getElementById('dok_resim_disa_aktar');
  if(onizle){
    onizle.style.display='';
    onizle.innerHTML=`✅ ${mesaj} <button type="button" class="btn btn-ghost btn-sm" onclick="dokumanHazirPdfOnizle()">👁 Önizle</button>`;
  }
  if(disaAktar) disaAktar.style.display='flex';
  _dokPdfArsivButonuGoster();
  const kaydet=document.getElementById('modalKaydetBtn');
  if(kaydet) kaydet.disabled=false;
}

window.dokumanResimlerdenPdfOlustur=async function dokumanResimlerdenPdfOlusturV5(){
  if(!_dokResimListe.length){toast('Önce resim seçin.');return;}
  try{
    if(!window.PdfExportLibs) throw new Error('PDF yükleyicisi bulunamadı.');
    await window.PdfExportLibs.hazir();
  }catch(e){toast('PDF kütüphanesi yüklenemedi: '+e.message);return;}

  const btn=document.getElementById('dok_resim_olustur_btn');
  const onizle=document.getElementById('dok_resim_onizle');
  if(btn){btn.disabled=true;btn.textContent='⏳ PDF hazırlanıyor…';}
  try{
    const {jsPDF}=window.jspdf;
    const KENAR=7;
    let pdf=null;
    for(let i=0;i<_dokResimListe.length;i++){
      if(onizle){onizle.style.display='';onizle.textContent=`Sayfa ${i+1}/${_dokResimListe.length} hazırlanıyor…`;}
      const ham=await _dokResimIsle(_dokResimListe[i]);
      const {dataUrl,w:gw,h:gh}=await _dokGorselPdfIcinSinirla(ham,2400);
      const yatay=_dokResimSayfaYonu==='yatay'?true:_dokResimSayfaYonu==='dikey'?false:gw>gh;
      const A4_W=yatay?297:210,A4_H=yatay?210:297;
      if(!pdf) pdf=new jsPDF({unit:'mm',format:'a4',orientation:yatay?'l':'p',compress:true,putOnlyUsedFonts:true});
      else pdf.addPage('a4',yatay?'l':'p');
      const oran=Math.min((A4_W-KENAR*2)/gw,(A4_H-KENAR*2)/gh);
      const w=gw*oran,h=gh*oran,x=(A4_W-w)/2,y=(A4_H-h)/2;
      pdf.addImage(dataUrl,'JPEG',x,y,w,h,undefined,'FAST');
      await new Promise(r=>setTimeout(r,0));
    }
    _dokResimPdfBlob=pdf.output('blob');
    const ad=document.getElementById('dok_ad');
    if(ad&&!ad.value.trim()) ad.value=_dokResimListe.length>1?`${_dokResimListe.length} Sayfalık Belge`:'Taranan Belge';
    const boyut=typeof dosyaBoyutuFormat==='function'?dosyaBoyutuFormat(_dokResimPdfBlob.size):Math.round(_dokResimPdfBlob.size/1024)+' KB';
    _dokPdfSonucArayuzu(_dokResimListe.length,`PDF hazır (${_dokResimListe.length} sayfa, ${boyut}).`);
    toast('PDF oluşturuldu. Dökümanlara kaydedebilir, indirebilir veya paylaşabilirsiniz.');
  }catch(e){
    console.error('[Dokuman PDF] Resimden PDF hatası:',e);toast('PDF oluşturma hatası: '+e.message);
  }finally{
    if(btn){btn.disabled=_dokResimListe.length===0;btn.textContent='🖨 PDF Oluştur';}
  }
};

window.dokumanPdfBirlestirDosyalarSecildi=async function dokumanPdfBirlestirDosyalarSecildiV5(input){
  const dosyalar=Array.from(input?.files||[]);
  if(!dosyalar.length) return;
  const bilgi=document.getElementById('dok_birlestir_bilgi');
  const kaydet=document.getElementById('modalKaydetBtn');
  if(kaydet) kaydet.disabled=true;
  if(bilgi) bilgi.textContent='PDF birleştirme motoru hazırlanıyor…';
  try{
    await _dokScriptYukle(PDFLIB_SRC,()=>!!(window.PDFLib&&window.PDFLib.PDFDocument));
    const {PDFDocument}=window.PDFLib;
    const hedef=await PDFDocument.create();
    let toplam=0;
    for(let i=0;i<dosyalar.length;i++){
      const dosya=dosyalar[i];
      if(bilgi) bilgi.textContent=`${i+1}/${dosyalar.length} — ${dosya.name} ekleniyor…`;
      let kaynak;
      try{
        kaynak=await PDFDocument.load(new Uint8Array(await dosya.arrayBuffer()),{ignoreEncryption:false,updateMetadata:false});
      }catch(e){
        if(/encrypt|password/i.test(String(e?.message||''))) throw new Error(`“${dosya.name}” şifreli; şifreli PDF birleştirilemez.`);
        throw new Error(`“${dosya.name}” açılamadı: ${e.message}`);
      }
      const indeksler=kaynak.getPageIndices();
      const sayfalar=await hedef.copyPages(kaynak,indeksler);
      sayfalar.forEach(s=>hedef.addPage(s));
      toplam+=sayfalar.length;
      await new Promise(r=>setTimeout(r,0));
    }
    if(!toplam) throw new Error('Birleştirilecek sayfa bulunamadı.');
    const cikti=await hedef.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:30});
    _dokResimPdfBlob=new Blob([cikti],{type:'application/pdf'});
    input.value='';
    const ad=document.getElementById('dok_ad');
    if(ad&&!ad.value.trim()) ad.value=dosyalar.length===1?dosyalar[0].name.replace(/\.pdf$/i,'')+' Birleştirilmiş':`${dosyalar.length} PDF Birleştirilmiş`;
    if(typeof dokumanSekmeAc==='function') dokumanSekmeAc('resim');
    const resimBilgi=document.getElementById('dok_resim_bilgi');
    if(resimBilgi) resimBilgi.textContent=`${dosyalar.length} PDF · ${toplam} sayfa birleştirildi. Metin/vektör yapısı korundu.`;
    const olustur=document.getElementById('dok_resim_olustur_btn'),duzenle=document.getElementById('dok_resim_duzenle_btn');
    if(olustur) olustur.disabled=true;if(duzenle) duzenle.disabled=true;
    const boyut=typeof dosyaBoyutuFormat==='function'?dosyaBoyutuFormat(_dokResimPdfBlob.size):Math.round(_dokResimPdfBlob.size/1024)+' KB';
    _dokPdfSonucArayuzu(toplam,`Birleştirilmiş PDF hazır (${toplam} sayfa, ${boyut}).`);
    if(bilgi) bilgi.textContent=`✅ ${dosyalar.length} PDF, ${toplam} sayfa birleştirildi.`;
    toast(`${toplam} sayfa birleştirildi. Metin ve vektör içeriği korunmuştur.`);
  }catch(e){
    console.error('[Dokuman PDF] Birleştirme hatası:',e);if(bilgi) bilgi.textContent='❌ '+e.message;toast('PDF birleştirme hatası: '+e.message);if(kaydet) kaydet.disabled=false;
  }
};

window._dokResimPdfDisaAktar=async function(paylas){
  if(!_dokResimPdfBlob){toast('Önce PDF oluşturun.');return;}
  if(typeof uygulamaDosyaKaydet!=='function'){toast('Dışa aktarma bu ortamda kullanılamıyor.');return;}
  const ad=_dokPdfDosyaAdi(document.getElementById('dok_ad')?.value,'belge');
  try{
    const base64=await _dokBlobToBase64(_dokResimPdfBlob);
    await uygulamaDosyaKaydet(base64,ad,'application/pdf',!!paylas);
  }catch(e){console.error('[Dokuman PDF] Dışa aktarma hatası:',e);toast('Dışa aktarma hatası: '+(e.message||e));}
};

async function dokumanHazirPdfDokumanlaraKaydet(){
  if(!_dokResimPdfBlob){toast('Önce PDF oluşturun.');return;}
  if(typeof DokumanlarService==='undefined'||typeof DokumanlarService.dokumanEkle!=='function'){toast('Döküman arşivi kullanılamıyor.');return;}
  const btn=document.getElementById('dok_pdf_arsiv_btn');
  const ad=(document.getElementById('dok_ad')?.value||'PDF Belgesi').trim()||'PDF Belgesi';
  const dosyaAdi=_dokPdfDosyaAdi(ad,'belge');
  try{
    if(btn){btn.disabled=true;btn.textContent='⏳ Dökümanlara kaydediliyor…';}
    const file=new File([_dokResimPdfBlob],dosyaAdi,{type:'application/pdf',lastModified:Date.now()});
    await DokumanlarService.dokumanEkle({
      ad,
      kategori:document.getElementById('dok_kategori')?.value||'Diğer',
      aciklama:document.getElementById('dok_aciklama')?.value?.trim()||'',
      gorunurluk:document.getElementById('dok_gorunurluk')?.value||'kisisel'
    },file,p=>{if(btn&&typeof p==='number')btn.textContent=`☁️ Kaydediliyor… %${Math.round(p)}`;});
    if(btn){btn.disabled=true;btn.textContent='✅ Dökümanlara Kaydedildi';}
    toast('PDF Dökümanlar arşivine kaydedildi.');
  }catch(e){
    console.error('[PDF → Dökümanlar]',e);if(btn){btn.disabled=false;btn.textContent='☁️ Dökümanlara Kaydet';}toast('Dökümanlara kaydetme hatası: '+(e.message||e));
  }
}
window.dokumanHazirPdfDokumanlaraKaydet=dokumanHazirPdfDokumanlaraKaydet;

function _dokPdfArsivButonuGoster(){
  const alan=document.getElementById('dok_resim_disa_aktar');
  if(!alan) return;
  let b=document.getElementById('dok_pdf_arsiv_btn');
  if(!b){b=document.createElement('button');b.type='button';b.id='dok_pdf_arsiv_btn';b.className='btn btn-primary';b.onclick=dokumanHazirPdfDokumanlaraKaydet;alan.prepend(b);}
  b.style.display='';b.disabled=false;b.textContent='☁️ Dökümanlara Kaydet';
}

function _pdfAraciModalAc(mod){
  window._dokPdfIslemModu=mod;
  if(typeof dokumanYukleModalAc==='function') dokumanYukleModalAc();
  else toast('PDF aracı yüklenemedi.');
}
window.pdfResimdenAc=()=>_pdfAraciModalAc('resim');
window.pdfBirlestirAc=()=>_pdfAraciModalAc('birlestir');
window.pdfIslemleriAc=function(){
  const html='<div style="display:flex;flex-direction:column;gap:8px"><button class="btn btn-ghost" onclick="modalKapat();pdfResimdenAc()">🖼 Resimden PDF Oluştur</button><button class="btn btn-ghost" onclick="modalKapat();pdfBirlestirAc()">🔗 PDF Birleştir</button></div>';
  if(typeof modalAc==='function'){modalAc('📄 PDF İşlemleri',html,null,null);const b=document.getElementById('modalKaydetBtn');if(b)b.style.display='none';}
};

function _pdfModalSekmeleriniAyarla(mod){
  const goster=(id,v)=>{const e=document.getElementById(id);if(e)e.style.display=v?'':'none';};
  if(mod==='resim'){
    goster('dok_sekme_resim',true);goster('dok_sekme_birlestir',false);
    if(typeof dokumanSekmeAc==='function')dokumanSekmeAc('resim');
  }else if(mod==='birlestir'){
    goster('dok_sekme_resim',false);goster('dok_sekme_birlestir',true);
    if(typeof dokumanSekmeAc==='function')dokumanSekmeAc('birlestir');
  }else{
    goster('dok_sekme_resim',false);goster('dok_sekme_birlestir',false);
  }
}

if(typeof dokumanYukleModalAc==='function'){
  const eskiModal=dokumanYukleModalAc;
  window.dokumanYukleModalAc=function(){
    const mod=window._dokPdfIslemModu||'';
    const r=eskiModal.apply(this,arguments);
    setTimeout(()=>_pdfModalSekmeleriniAyarla(mod),0);
    window._dokPdfIslemModu='';
    return r;
  };
}

/* Merkezi özellik kataloğu: gerçek akordeon yerleşimini nav-accordion.js yönetir. */
const PDF_NAV_META={anahtar:'sistem_pdf_islemleri',ad:'PDF İşlemleri',sekmeAd:'@ozellik:pdf_islemleri',grup:'g7'};
const OGR_DEV_NAV_META={anahtar:'sistem_ogrenci_devamsizlik',ad:'Öğrenci Devamsızlığı',sekmeAd:'@ozellik:ogrenci_devamsizlik',grup:'g1'};
window.PdfNavMeta={PDF_NAV_META,OGR_DEV_NAV_META};

function _pdfOzellikleriKaydet(){
  if(!window.OzellikKatalogu||typeof window.OzellikKatalogu.kaydet!=='function') return false;
  window.OzellikKatalogu.kaydet({id:'pdf_islemleri',ad:'PDF İşlemleri',tip:'aksiyon',modul:'dokumanlar',ikon:'dosya',ac:()=>window.pdfIslemleriAc()});
  window.OzellikKatalogu.kaydet({id:'pdf_resimden',ad:'Resimden PDF Oluştur',tip:'aksiyon',modul:'dokumanlar',ikon:'dosya',ac:()=>window.pdfResimdenAc()});
  window.OzellikKatalogu.kaydet({id:'pdf_birlestir',ad:'PDF Birleştir',tip:'aksiyon',modul:'dokumanlar',ikon:'dosya',ac:()=>window.pdfBirlestirAc()});
  window.OzellikKatalogu.kaydet({id:'ogrenci_devamsizlik',ad:'Öğrenci Devamsızlığı',tip:'aksiyon',modul:'yoklama',ikon:'takvim',ac:()=>{if(typeof yoklamaAc==='function')yoklamaAc();}});
  return true;
}
let _katDeneme=0;const _katTimer=setInterval(()=>{if(_pdfOzellikleriKaydet()||++_katDeneme>100)clearInterval(_katTimer);},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(_pdfOzellikleriKaydet,0));
window.addEventListener('beforeunload',_dokBlobUrlTemizle,{once:true});
})();
