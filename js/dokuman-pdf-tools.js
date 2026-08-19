/* Koruk Asistan — Döküman PDF araçları v5
 * Gerçek pdf-lib birleştirme + resimden PDF + Dökümanlar arşivine kayıt.
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
    s.src = src; s.async = true; s.onload = resolve;
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
  if (window.DokumanOkuyucu && typeof window.DokumanOkuyucu.ac === 'function') window.DokumanOkuyucu.ac(_dokPdfOnizlemeUrl, ad);
  else window.open(_dokPdfOnizlemeUrl, '_blank');
}
window.dokumanHazirPdfOnizle = dokumanHazirPdfOnizle;

async function dokumanHazirPdfDokumanlaraKaydet(){
  if(!_dokResimPdfBlob){ toast('Önce PDF oluşturun.'); return; }
  if(typeof DokumanlarService==='undefined' || typeof DokumanlarService.dokumanEkle!=='function'){
    toast('Döküman arşivi kullanılamıyor.'); return;
  }
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
    },file);
    if(btn) btn.textContent='✅ Dökümanlara Kaydedildi';
    toast('PDF Dökümanlar arşivine kaydedildi.');
  }catch(e){
    console.error('[PDF → Dökümanlar]',e);
    if(btn){btn.disabled=false;btn.textContent='☁️ Dökümanlara Kaydet';}
    toast('Dökümanlara kaydetme hatası: '+(e.message||e));
  }
}
window.dokumanHazirPdfDokumanlaraKaydet=dokumanHazirPdfDokumanlaraKaydet;

function _dokPdfArsivButonuGoster(){
  const alan=document.getElementById('dok_resim_disa_aktar'); if(!alan) return;
  let b=document.getElementById('dok_pdf_arsiv_btn');
  if(!b){
    b=document.createElement('button'); b.type='button'; b.id='dok_pdf_arsiv_btn'; b.className='btn btn-primary';
    b.onclick=dokumanHazirPdfDokumanlaraKaydet; alan.prepend(b);
  }
  b.style.display=''; b.disabled=false; b.textContent='☁️ Dökümanlara Kaydet';
}

async function _dokGorselPdfIcinSinirla(islenmis, maxUzunKenar){
  const max = maxUzunKenar || 2400;
  if (!islenmis || !islenmis.dataUrl) throw new Error('Görsel işlenemedi.');
  if (Math.max(islenmis.w, islenmis.h) <= max) return islenmis;
  const img = await new Promise((resolve, reject) => {
    const x = new Image(); x.onload = () => resolve(x); x.onerror = () => reject(new Error('Görsel yeniden boyutlandırılamadı.')); x.src = islenmis.dataUrl;
  });
  const oran = max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const w = Math.max(1, Math.round((img.naturalWidth || img.width) * oran));
  const h = Math.max(1, Math.round((img.naturalHeight || img.height) * oran));
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', {alpha:false}); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.88), w, h };
}

window.dokumanResimlerdenPdfOlustur = async function dokumanResimlerdenPdfOlusturV5(){
  if (!_dokResimListe.length) { toast('Önce resim seçin.'); return; }
  try { if (!window.PdfExportLibs) throw new Error('PDF yükleyicisi bulunamadı.'); await window.PdfExportLibs.hazir(); }
  catch(e) { toast('PDF kütüphanesi yüklenemedi: '+e.message); return; }
  const olusturBtn=document.getElementById('dok_resim_olustur_btn'),onizle=document.getElementById('dok_resim_onizle'),disaAktar=document.getElementById('dok_resim_disa_aktar');
  if(olusturBtn){olusturBtn.disabled=true;olusturBtn.textContent='⏳ PDF hazırlanıyor…';}
  try{
    const { jsPDF }=window.jspdf; const KENAR=7; let pdf=null;
    for(let i=0;i<_dokResimListe.length;i++){
      if(onizle){onizle.style.display='';onizle.textContent=`Sayfa ${i+1}/${_dokResimListe.length} hazırlanıyor…`;}
      const ham=await _dokResimIsle(_dokResimListe[i]);
      const {dataUrl,w:gw,h:gh}=await _dokGorselPdfIcinSinirla(ham,2400);
      const yatay=_dokResimSayfaYonu==='yatay'?true:_dokResimSayfaYonu==='dikey'?false:gw>gh;
      const A4_W=yatay?297:210,A4_H=yatay?210:297;
      if(!pdf) pdf=new jsPDF({unit:'mm',format:'a4',orientation:yatay?'l':'p',compress:true,putOnlyUsedFonts:true});
      else pdf.addPage('a4',yatay?'l':'p');
      const oran=Math.min((A4_W-KENAR*2)/gw,(A4_H-KENAR*2)/gh),w=gw*oran,h=gh*oran;
      pdf.addImage(dataUrl,'JPEG',(A4_W-w)/2,(A4_H-h)/2,w,h,undefined,'FAST');
      await new Promise(r=>setTimeout(r,0));
    }
    _dokResimPdfBlob=pdf.output('blob');
    const adEl=document.getElementById('dok_ad'); if(adEl&&!adEl.value.trim()) adEl.value=_dokResimListe.length>1?`${_dokResimListe.length} Sayfalık Belge`:'Taranan Belge';
    const kaydetBtn=document.getElementById('modalKaydetBtn'); if(kaydetBtn) kaydetBtn.disabled=false;
    if(onizle){onizle.style.display='';onizle.innerHTML=`✅ PDF hazır (${_dokResimListe.length} sayfa). <button type="button" class="btn btn-ghost btn-sm" onclick="dokumanHazirPdfOnizle()">👁 Önizle</button>`;}
    if(disaAktar)disaAktar.style.display='flex'; _dokPdfArsivButonuGoster();
    toast('PDF oluşturuldu. Önizleyebilir, Dökümanlara kaydedebilir, indirebilir veya paylaşabilirsiniz.');
  }catch(e){console.error('[Dokuman PDF] Resimden PDF hatası:',e);toast('PDF oluşturma hatası: '+e.message);}
  finally{if(olusturBtn){olusturBtn.disabled=_dokResimListe.length===0;olusturBtn.textContent='🖨 PDF Oluştur';}}
};

window.dokumanPdfBirlestirDosyalarSecildi = async function dokumanPdfBirlestirDosyalarSecildiV5(input){
  const dosyalar=Array.from(input?.files||[]); if(!dosyalar.length)return;
  const bilgi=document.getElementById('dok_birlestir_bilgi'),kaydetBtn=document.getElementById('modalKaydetBtn');
  if(kaydetBtn)kaydetBtn.disabled=true; if(bilgi)bilgi.textContent='PDF birleştirme motoru hazırlanıyor…';
  try{
    await _dokScriptYukle(PDFLIB_SRC,()=>!!(window.PDFLib&&window.PDFLib.PDFDocument));
    const {PDFDocument}=window.PDFLib,hedef=await PDFDocument.create(); let toplam=0;
    for(let i=0;i<dosyalar.length;i++){
      const dosya=dosyalar[i]; if(bilgi)bilgi.textContent=`${i+1}/${dosyalar.length} — ${dosya.name} ekleniyor…`;
      let kaynak; try{kaynak=await PDFDocument.load(new Uint8Array(await dosya.arrayBuffer()),{ignoreEncryption:false,updateMetadata:false});}
      catch(e){if(/encrypt|password/i.test(String(e?.message||'')))throw new Error(`“${dosya.name}” şifreli; şifreli PDF birleştirilemez.`);throw new Error(`“${dosya.name}” açılamadı: ${e.message}`);}
      const indeksler=kaynak.getPageIndices(); const sayfalar=await hedef.copyPages(kaynak,indeksler); sayfalar.forEach(s=>hedef.addPage(s)); toplam+=sayfalar.length;
      await new Promise(r=>setTimeout(r,0));
    }
    if(!toplam)throw new Error('Birleştirilecek sayfa bulunamadı.');
    const cikti=await hedef.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:30}); _dokResimPdfBlob=new Blob([cikti],{type:'application/pdf'}); input.value='';
    const adEl=document.getElementById('dok_ad');if(adEl&&!adEl.value.trim())adEl.value=dosyalar.length===1?dosyalar[0].name.replace(/\.pdf$/i,'')+' Birleştirilmiş':`${dosyalar.length} PDF Birleştirilmiş`;
    if(typeof dokumanSekmeAc==='function')dokumanSekmeAc('resim');
    const resimBilgi=document.getElementById('dok_resim_bilgi'),onizle=document.getElementById('dok_resim_onizle'),disaAktar=document.getElementById('dok_resim_disa_aktar');
    if(resimBilgi)resimBilgi.textContent=`${dosyalar.length} PDF · ${toplam} sayfa birleştirildi. Metin/vektör yapısı korundu.`;
    if(onizle){onizle.style.display='';onizle.innerHTML=`✅ Birleştirilmiş PDF hazır (${toplam} sayfa). <button type="button" class="btn btn-ghost btn-sm" onclick="dokumanHazirPdfOnizle()">👁 Önizle</button>`;}
    if(disaAktar)disaAktar.style.display='flex'; if(kaydetBtn)kaydetBtn.disabled=false; if(bilgi)bilgi.textContent=`✅ ${dosyalar.length} PDF, ${toplam} sayfa birleştirildi.`;
    _dokPdfArsivButonuGoster(); toast(`${toplam} sayfa birleştirildi. Metin ve vektör içeriği korunmuştur.`);
  }catch(e){console.error('[Dokuman PDF] Birleştirme hatası:',e);if(bilgi)bilgi.textContent='❌ '+e.message;toast('PDF birleştirme hatası: '+e.message);if(kaydetBtn)kaydetBtn.disabled=false;}
};

if(typeof _dokResimPdfDisaAktar==='function'){
  window._dokResimPdfDisaAktar=async function(paylas){
    if(!_dokResimPdfBlob){toast('Önce PDF oluşturun.');return;}
    if(typeof uygulamaDosyaKaydet!=='function'){toast('Dışa aktarma bu ortamda kullanılamıyor.');return;}
    const ad=_dokPdfDosyaAdi(document.getElementById('dok_ad')?.value,'belge');
    try{const base64=await _dokBlobToBase64(_dokResimPdfBlob);await uygulamaDosyaKaydet(base64,ad,'application/pdf',!!paylas);}catch(e){console.error('[Dokuman PDF] Dışa aktarma hatası:',e);}
  };
}

function _pdfAraciModalAc(mod){window._dokPdfIslemModu=mod;if(typeof dokumanYukleModalAc==='function')dokumanYukleModalAc();else if(typeof toast==='function')toast('PDF aracı yüklenemedi.');}
window.pdfResimdenAc=function(){_pdfAraciModalAc('resim');};
window.pdfBirlestirAc=function(){_pdfAraciModalAc('birlestir');};
window.pdfIslemleriAc=function(){
  const html='<div style="display:flex;flex-direction:column;gap:8px;"><button class="btn btn-ghost" onclick="modalKapat();pdfResimdenAc()">🖼 Resimden PDF Oluştur</button><button class="btn btn-ghost" onclick="modalKapat();pdfBirlestirAc()">🔗 PDF Birleştir</button></div>';
  if(typeof modalAc==='function'){modalAc('📄 PDF İşlemleri',html,null,null);const b=document.getElementById('modalKaydetBtn');if(b)b.style.display='none';}
};

if(typeof dokumanYukleModalAc==='function'){
  const eskiModal=dokumanYukleModalAc;
  window.dokumanYukleModalAc=function(){
    const pdfModu=window._dokPdfIslemModu||''; window._dokPdfIslemModu=''; const r=eskiModal.apply(this,arguments);
    setTimeout(()=>{
      const goster=(id,acik)=>{const el=document.getElementById(id);if(el)el.style.display=acik?'':'none';};
      if(pdfModu==='resim'||pdfModu==='birlestir'){
        goster('dok_sekme_dosya',false);goster('dok_sekme_url',false);goster('dok_sekme_resim',pdfModu==='resim');goster('dok_sekme_birlestir',pdfModu==='birlestir');
        if(typeof dokumanSekmeAc==='function')dokumanSekmeAc(pdfModu);
      }else{
        goster('dok_sekme_resim',false);goster('dok_sekme_birlestir',false);goster('dok_panel_resim',false);goster('dok_panel_birlestir',false);
        if(typeof dokumanSekmeAc==='function')dokumanSekmeAc('dosya');
      }
    },0); return r;
  };
}

const PDF_NAV_MENU_KEY='sistem_pdf_islemleri',OGR_DEV_MENU_KEY='sistem_ogrenci_devamsizlik';
function _pdfNavVarsayilanlariniEkle(veri){
  let nd;try{nd=JSON.parse(JSON.stringify(veri||{}));}catch(_){nd=Object.assign({},veri||{});}nd.ekOgeler=Array.isArray(nd.ekOgeler)?nd.ekOgeler:[];
  if(!nd.ekOgeler.some(x=>x&&x.anahtar===PDF_NAV_MENU_KEY))nd.ekOgeler.push({anahtar:PDF_NAV_MENU_KEY,ad:'PDF İşlemleri',sekmeAd:'@ozellik:pdf_islemleri',grup:'g7',altGrupMu:false});
  if(!nd.ekOgeler.some(x=>x&&x.anahtar===OGR_DEV_MENU_KEY))nd.ekOgeler.push({anahtar:OGR_DEV_MENU_KEY,ad:'Öğrenci Devamsızlığı',sekmeAd:'@ozellik:ogrenci_devamsizlik',grup:'g1',altGrupMu:false});
  return nd;
}
let _pdfNavSarmalandi=false;
function _pdfNavigasyonunuKur(){
  if(window.OzellikKatalogu&&typeof window.OzellikKatalogu.kaydet==='function'){
    window.OzellikKatalogu.kaydet({id:'pdf_islemleri',ad:'PDF İşlemleri',tip:'aksiyon',modul:'dokumanlar',ikon:'dosya',ac:()=>window.pdfIslemleriAc()});
    window.OzellikKatalogu.kaydet({id:'pdf_resimden',ad:'Resimden PDF Oluştur',tip:'aksiyon',modul:'dokumanlar',ikon:'dosya',ac:()=>window.pdfResimdenAc()});
    window.OzellikKatalogu.kaydet({id:'pdf_birlestir',ad:'PDF Birleştir',tip:'aksiyon',modul:'dokumanlar',ikon:'dosya',ac:()=>window.pdfBirlestirAc()});
    window.OzellikKatalogu.kaydet({id:'ogrenci_devamsizlik',ad:'Öğrenci Devamsızlığı',tip:'aksiyon',modul:'yoklama',ikon:'takvim',ac:()=>{if(typeof yoklamaAc==='function')yoklamaAc();}});
  }
  if(!_pdfNavSarmalandi&&typeof window._navDuzeniYerelUygula==='function'){
    const eskiUygula=window._navDuzeniYerelUygula;window._navDuzeniYerelUygula=function(veri,cachele){return eskiUygula(_pdfNavVarsayilanlariniEkle(veri),cachele);};_pdfNavSarmalandi=true;
    const mevcut=typeof window._navDuzeniVerisiGetir==='function'?window._navDuzeniVerisiGetir():{};window._navDuzeniYerelUygula(mevcut,false);
  }
  return !!(window.OzellikKatalogu&&_pdfNavSarmalandi);
}
if(!_pdfNavigasyonunuKur()){let deneme=0;const t=setInterval(()=>{deneme++;if(_pdfNavigasyonunuKur()||deneme>80)clearInterval(t);},250);}
window.addEventListener('beforeunload',_dokBlobUrlTemizle,{once:true});
})();
