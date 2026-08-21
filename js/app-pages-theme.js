/* Koruk Asistan — sayfa teması yardımcıları */
(function(){
'use strict';
if(window.__APP_PAGES_THEME_JS__) return;
window.__APP_PAGES_THEME_JS__=true;

function modalSinifEkle(cls){
  const ov=document.getElementById('modalOverlay');
  if(!ov) return;
  ov.classList.remove('ap-ogretmen-modal','ap-sinif-modal','ap-ogrenci-modal','ap-tasima-modal','ap-personel-modal');
  if(cls) ov.classList.add(cls);
}
function ogretmenModalIsaretle(){ modalSinifEkle('ap-ogretmen-modal'); }
function sinifModalIsaretle(){ modalSinifEkle('ap-sinif-modal'); }
function ogrenciModalIsaretle(){ modalSinifEkle('ap-ogrenci-modal'); }
function tasimaModalIsaretle(){ modalSinifEkle('ap-tasima-modal'); }
function personelModalIsaretle(){ modalSinifEkle('ap-personel-modal'); }
function modalTemaTemizle(){ modalSinifEkle(''); }

function detaySinifEkle(cls){
  const ov=document.getElementById('detayOverlay');
  if(!ov) return;
  ov.classList.remove('ap-sinif-detay','ap-tasima-detay','ap-personel-detay');
  if(cls) ov.classList.add(cls);
}
function sinifDetayIsaretle(){ detaySinifEkle('ap-sinif-detay'); }
function tasimaDetayIsaretle(){ detaySinifEkle('ap-tasima-detay'); }
function personelDetayIsaretle(){ detaySinifEkle('ap-personel-detay'); }
function detayTemaTemizle(){ detaySinifEkle(''); }

document.addEventListener('click',function(e){
  const btn=e.target.closest?.('button,[role="button"],tr.row-clickable,[onclick]');
  if(!btn) return;
  const onclick=btn.getAttribute('onclick')||'';
  const text=(btn.textContent||'').trim();
  const ogretmenSekmesinde=!!btn.closest('#tab-ogretmenler');
  const sinifSekmesinde=!!btn.closest('#tab-siniflar');
  const ogrenciSekmesinde=!!btn.closest('#tab-ogrenciler');
  const tasimaSekmesinde=!!btn.closest('#tab-tasima');
  const personelSekmesinde=!!btn.closest('#tab-personel');
  const sinifDetayinda=!!btn.closest('#detayOverlay.ap-sinif-detay');
  const tasimaDetayinda=!!btn.closest('#detayOverlay.ap-tasima-detay');
  const personelDetayinda=!!btn.closest('#detayOverlay.ap-personel-detay');

  if(ogretmenSekmesinde && (onclick.includes('ogretmenModalAc') || /düzenle|yeni öğretmen/i.test(text))){ requestAnimationFrame(ogretmenModalIsaretle); return; }
  if(sinifSekmesinde && (onclick.includes('sinifModalAc') || /düzenle|yeni sınıf/i.test(text))) requestAnimationFrame(sinifModalIsaretle);
  if(sinifSekmesinde && (onclick.includes('sinifDetayAc') || btn.matches('tr.row-clickable'))) requestAnimationFrame(sinifDetayIsaretle);

  if(ogrenciSekmesinde && /ogrenciDetayModalAc|sinifVeliModalAc|sinifOgrenciExcelModalAc/.test(onclick)){
    requestAnimationFrame(ogrenciModalIsaretle);
    return;
  }

  if(tasimaSekmesinde){
    if(onclick.includes('servisDetayAc')) requestAnimationFrame(tasimaDetayIsaretle);
    if(/servis.*ModalAc|oturma.*ModalAc|harita.*ModalAc/.test(onclick) || /yeni servis|düzenle/i.test(text)) requestAnimationFrame(tasimaModalIsaretle);
  }

  if(personelSekmesinde){
    if(onclick.includes('personelDetayAc')) requestAnimationFrame(personelDetayIsaretle);
    if(/personelModalAc|personelIzinModalAc/.test(onclick) || /yeni personel|düzenle/i.test(text)) requestAnimationFrame(personelModalIsaretle);
  }

  if(sinifDetayinda){
    if(onclick.includes('sinifModalAc')) requestAnimationFrame(sinifModalIsaretle);
    if(/sinifVeliModalAc|sinifOgrenciExcelModalAc|ogrenciDetayModalAc/.test(onclick)) requestAnimationFrame(sinifModalIsaretle);
  }

  if(tasimaDetayinda){
    if(/servis.*ModalAc|oturma.*ModalAc|harita.*ModalAc/.test(onclick) || /düzenle|öğrenci ekle|excel|liste oluştur/i.test(text)) requestAnimationFrame(tasimaModalIsaretle);
  }

  if(personelDetayinda){
    if(/personelModalAc|personelIzinModalAc/.test(onclick) || /düzenle|kayıt ekle/i.test(text)) requestAnimationFrame(personelModalIsaretle);
  }
},true);

const baslat=function(){
  const ov=document.getElementById('modalOverlay');
  if(ov){
    const mo=new MutationObserver(function(){
      const gorunur=ov.classList.contains('show')||ov.classList.contains('active')||getComputedStyle(ov).display!=='none';
      if(!gorunur) modalTemaTemizle();
    });
    mo.observe(ov,{attributes:true,attributeFilter:['class','style']});
  }
  const det=document.getElementById('detayOverlay');
  if(det){
    const mo2=new MutationObserver(function(){
      const gorunur=det.classList.contains('active')||det.classList.contains('show')||getComputedStyle(det).display!=='none';
      if(!gorunur) detayTemaTemizle();
    });
    mo2.observe(det,{attributes:true,attributeFilter:['class','style']});
  }
};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true}); else baslat();
})();
