/* Koruk Asistan — PDF dışa aktarma kütüphaneleri lazy loader */
(function(){
'use strict';

const SRC = {
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  autotable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
};
const bekleyen = new Map();

function scriptYukle(src, test){
  if (test()) return Promise.resolve();
  if (bekleyen.has(src)) return bekleyen.get(src);
  const p = new Promise((resolve,reject)=>{
    const mevcut=[...document.scripts].find(s=>s.src===src);
    if(mevcut){
      mevcut.addEventListener('load',resolve,{once:true});
      mevcut.addEventListener('error',()=>reject(new Error('Kütüphane yüklenemedi.')),{once:true});
      return;
    }
    const s=document.createElement('script');
    s.src=src;
    s.async=true;
    s.onload=resolve;
    s.onerror=()=>reject(new Error('Kütüphane yüklenemedi: '+src));
    document.head.appendChild(s);
  }).catch(e=>{ bekleyen.delete(src); throw e; });
  bekleyen.set(src,p);
  return p;
}

async function hazir(secenekler){
  const o=secenekler||{};
  await scriptYukle(SRC.jspdf,()=>!!(window.jspdf&&window.jspdf.jsPDF));
  if(o.autoTable){
    await scriptYukle(SRC.autotable,()=>{
      const C=window.jspdf&&window.jspdf.jsPDF;
      return !!(C&&C.API&&typeof C.API.autoTable==='function');
    });
  }
  if(o.html2canvas){
    await scriptYukle(SRC.html2canvas,()=>typeof window.html2canvas==='function');
  }
  return true;
}

window.PdfExportLibs={hazir};
})();
