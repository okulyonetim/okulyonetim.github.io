/* Koruk Asistan — Döküman PDF araçları v2
 * dokumanlar.js'den sonra yüklenir. Resimden PDF ve PDF birleştirme
 * akışlarını Android/Web için güvenli, bellek kontrollü ve önizlemeli hale getirir.
 */
(function(){
'use strict';

const PDFLIB_SRC = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
let _dokPdfOnizlemeUrl = null;

function _dokScriptYukle(src, test){
  if (test()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const mevcut = [...document.scripts].find(s => s.src === src);
    if (mevcut) {
      mevcut.addEventListener('load', resolve, {once:true});
      mevcut.addEventListener('error', () => reject(new Error('Kütüphane yüklenemedi.')), {once:true});
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Kütüphane yüklenemedi.'));
    document.head.appendChild(s);
  });
}

function _dokPdfDosyaAdi(ad, varsayilan){
  let temiz = String(ad || varsayilan || 'belge').trim();
  temiz = temiz.replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ').replace(/[. ]+$/g, '');
  if (!temiz) temiz = varsayilan || 'belge';
  if (!/\.pdf$/i.test(temiz)) temiz += '.pdf';
  return temiz;
}

function _dokBlobUrlTemizle(){
  if (_dokPdfOnizlemeUrl) {
    try { URL.revokeObjectURL(_dokPdfOnizlemeUrl); } catch (_) {}
    _dokPdfOnizlemeUrl = null;
  }
}

function dokumanHazirPdfOnizle(){
  if (!_dokResimPdfBlob) { toast('Önizlenecek PDF henüz oluşturulmadı.'); return; }
  _dokBlobUrlTemizle();
  _dokPdfOnizlemeUrl = URL.createObjectURL(_dokResimPdfBlob);
  const ad = _dokPdfDosyaAdi(document.getElementById('dok_ad')?.value, 'belge');
  if (window.DokumanOkuyucu && typeof window.DokumanOkuyucu.ac === 'function') {
    window.DokumanOkuyucu.ac(_dokPdfOnizlemeUrl, ad);
  } else {
    window.open(_dokPdfOnizlemeUrl, '_blank');
  }
}
window.dokumanHazirPdfOnizle = dokumanHazirPdfOnizle;

async function _dokGorselPdfIcinSinirla(islenmis, maxUzunKenar){
  const max = maxUzunKenar || 2400;
  if (!islenmis || !islenmis.dataUrl) throw new Error('Görsel işlenemedi.');
  if (Math.max(islenmis.w, islenmis.h) <= max) return islenmis;

  const img = await new Promise((resolve, reject) => {
    const x = new Image();
    x.onload = () => resolve(x);
    x.onerror = () => reject(new Error('Görsel yeniden boyutlandırılamadı.'));
    x.src = islenmis.dataUrl;
  });
  const oran = max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const w = Math.max(1, Math.round((img.naturalWidth || img.width) * oran));
  const h = Math.max(1, Math.round((img.naturalHeight || img.height) * oran));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', {alpha:false});
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
  ctx.drawImage(img,0,0,w,h);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.88), w, h };
}

window.dokumanResimlerdenPdfOlustur = async function dokumanResimlerdenPdfOlusturV2(){
  if (!_dokResimListe.length) { toast('Önce resim seçin.'); return; }
  try {
    if (!window.PdfExportLibs) throw new Error('PDF yükleyicisi bulunamadı.');
    await window.PdfExportLibs.hazir();
  } catch(e) { toast('PDF kütüphanesi yüklenemedi: '+e.message); return; }

  const olusturBtn = document.getElementById('dok_resim_olustur_btn');
  const onizle = document.getElementById('dok_resim_onizle');
  const disaAktar = document.getElementById('dok_resim_disa_aktar');
  if (olusturBtn) { olusturBtn.disabled = true; olusturBtn.textContent = '⏳ PDF hazırlanıyor…'; }

  try {
    const { jsPDF } = window.jspdf;
    const KENAR = 7;
    let pdf = null;
    for (let i=0; i<_dokResimListe.length; i++) {
      if (onizle) { onizle.style.display=''; onizle.textContent = `Sayfa ${i+1}/${_dokResimListe.length} hazırlanıyor…`; }
      const ham = await _dokResimIsle(_dokResimListe[i]);
      const {dataUrl, w:gw, h:gh} = await _dokGorselPdfIcinSinirla(ham, 2400);
      const yatay = _dokResimSayfaYonu === 'yatay' ? true : _dokResimSayfaYonu === 'dikey' ? false : gw > gh;
      const A4_W = yatay ? 297 : 210, A4_H = yatay ? 210 : 297;
      if (!pdf) pdf = new jsPDF({unit:'mm', format:'a4', orientation:yatay?'l':'p', compress:true, putOnlyUsedFonts:true});
      else pdf.addPage('a4', yatay?'l':'p');
      const maxW=A4_W-KENAR*2, maxH=A4_H-KENAR*2;
      const oran=Math.min(maxW/gw,maxH/gh);
      const w=gw*oran,h=gh*oran,x=(A4_W-w)/2,y=(A4_H-h)/2;
      pdf.addImage(dataUrl,'JPEG',x,y,w,h,undefined,'FAST');
      await new Promise(r=>setTimeout(r,0));
    }

    _dokResimPdfBlob = pdf.output('blob');
    const adEl=document.getElementById('dok_ad');
    if(adEl&&!adEl.value.trim()) adEl.value=_dokResimListe.length>1?`${_dokResimListe.length} Sayfalık Belge`:'Taranan Belge';
    const kaydetBtn=document.getElementById('modalKaydetBtn');
    if(kaydetBtn) kaydetBtn.disabled=false;
    if(onizle){onizle.style.display='';onizle.innerHTML=`✅ PDF hazır (${_dokResimListe.length} sayfa, ${typeof dosyaBoyutuFormat==='function'?dosyaBoyutuFormat(_dokResimPdfBlob.size):Math.round(_dokResimPdfBlob.size/1024)+' KB'}). <button type="button" class="btn btn-ghost btn-sm" onclick="dokumanHazirPdfOnizle()">👁 Önizle</button>`;}
    if(disaAktar) disaAktar.style.display='flex';
    toast('PDF oluşturuldu. Önizleyebilir, kaydedebilir, indirebilir veya paylaşabilirsiniz.');
  } catch(e){
    console.error('[Dokuman PDF] Resimden PDF hatası:',e);
    toast('PDF oluşturma hatası: '+e.message);
  } finally {
    if(olusturBtn){olusturBtn.disabled=_dokResimListe.length===0;olusturBtn.textContent='🖨 PDF Oluştur';}
  }
};

window.dokumanPdfBirlestirDosyalarSecildi = async function dokumanPdfBirlestirDosyalarSecildiV2(input){
  const dosyalar=Array.from(input?.files||[]);
  if(!dosyalar.length) return;
  const bilgi=document.getElementById('dok_birlestir_bilgi');
  const kaydetBtn=document.getElementById('modalKaydetBtn');
  if(kaydetBtn) kaydetBtn.disabled=true;
  if(bilgi) bilgi.textContent='PDF birleştirme motoru hazırlanıyor…';

  try{
    await _dokScriptYukle(PDFLIB_SRC,()=>!!(window.PDFLib&&window.PDFLib.PDFDocument));
    const {PDFDocument}=window.PDFLib;
    const hedef=await PDFDocument.create();
    let toplam=0;
    for(let i=0;i<dosyalar.length;i++){
      const dosya=dosyalar[i];
      if(bilgi) bilgi.textContent=`${i+1}/${dosyalar.length} — ${dosya.name} ekleniyor…`;
      const bytes=new Uint8Array(await dosya.arrayBuffer());
      let kaynak;
      try{
        kaynak=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false});
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

    const adEl=document.getElementById('dok_ad');
    if(adEl&&!adEl.value.trim()) adEl.value=dosyalar.length===1?dosyalar[0].name.replace(/\.pdf$/i,'')+' Birleştirilmiş':`${dosyalar.length} PDF Birleştirilmiş`;

    if(typeof dokumanSekmeAc==='function') dokumanSekmeAc('resim');
    const resimBilgi=document.getElementById('dok_resim_bilgi');
    const onizle=document.getElementById('dok_resim_onizle');
    const disaAktar=document.getElementById('dok_resim_disa_aktar');
    const olusturBtn=document.getElementById('dok_resim_olustur_btn');
    const duzenleBtn=document.getElementById('dok_resim_duzenle_btn');
    if(resimBilgi) resimBilgi.textContent=`${dosyalar.length} PDF · ${toplam} sayfa birleştirildi. Metin/vektör yapısı korundu.`;
    if(olusturBtn) olusturBtn.disabled=true;
    if(duzenleBtn) duzenleBtn.disabled=true;
    if(onizle){onizle.style.display='';onizle.innerHTML=`✅ Birleştirilmiş PDF hazır (${toplam} sayfa, ${typeof dosyaBoyutuFormat==='function'?dosyaBoyutuFormat(_dokResimPdfBlob.size):Math.round(_dokResimPdfBlob.size/1024)+' KB'}). <button type="button" class="btn btn-ghost btn-sm" onclick="dokumanHazirPdfOnizle()">👁 Önizle</button>`;}
    if(disaAktar) disaAktar.style.display='flex';
    if(kaydetBtn) kaydetBtn.disabled=false;
    if(bilgi) bilgi.textContent=`✅ ${dosyalar.length} PDF, ${toplam} sayfa birleştirildi.`;
    toast(`${toplam} sayfa birleştirildi. Metin ve vektör içeriği korunmuştur.`);
  }catch(e){
    console.error('[Dokuman PDF] Birleştirme hatası:',e);
    if(bilgi) bilgi.textContent='❌ '+e.message;
    toast('PDF birleştirme hatası: '+e.message);
    if(kaydetBtn) kaydetBtn.disabled=false;
  }
};

if(typeof _dokResimPdfDisaAktar==='function'){
  window._dokResimPdfDisaAktar=async function(paylas){
    if(!_dokResimPdfBlob){toast('Önce PDF oluşturun.');return;}
    if(typeof uygulamaDosyaKaydet!=='function'){toast('Dışa aktarma bu ortamda kullanılamıyor.');return;}
    const ad=_dokPdfDosyaAdi(document.getElementById('dok_ad')?.value,'belge');
    try{
      const base64=await _dokBlobToBase64(_dokResimPdfBlob);
      await uygulamaDosyaKaydet(base64,ad,'application/pdf',!!paylas);
    }catch(e){console.error('[Dokuman PDF] Dışa aktarma hatası:',e);}
  };
}

if(typeof dokumanYukleModalAc==='function'){
  const eskiModal=dokumanYukleModalAc;
  window.dokumanYukleModalAc=function(){
    const r=eskiModal.apply(this,arguments);
    setTimeout(()=>{
      const panel=document.getElementById('dok_panel_birlestir');
      if(panel){
        const aciklama=panel.querySelector('div[style*="font-size:11px"]');
        if(aciklama) aciklama.textContent='Birden fazla PDF seçin. Sayfalar doğrudan PDF olarak birleştirilir; metin seçilebilir/aranabilir ve vektör kalite korunur. Birleştirme sonunda Önizle, İndir, Paylaş veya Dökümanlar’a Kaydet seçeneklerini kullanabilirsiniz.';
      }
    },0);
    return r;
  };
}

window.addEventListener('beforeunload',_dokBlobUrlTemizle,{once:true});
})();
