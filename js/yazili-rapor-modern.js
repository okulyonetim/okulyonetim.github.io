/* Koruk Asistan — Yazılı Sınav Raporu Modern v1 */
(function(){
  'use strict';

  function headingTone(txt){
    txt=String(txt||'').toLocaleLowerCase('tr');
    if(txt.includes('sayfa yön')) return 'violet';
    if(txt.includes('başlık')) return 'blue';
    if(txt.includes('dönem')) return 'cyan';
    if(txt.includes('sınıf')) return 'violet';
    if(txt.includes('kolon')) return 'amber';
    return 'blue';
  }

  function reportModalStyle(){
    var okul=document.getElementById('rpr_okulAdi');
    var sinif=document.querySelector('.rprSinifCb');
    if(!okul && !sinif) return false;

    var overlay=document.getElementById('modalOverlay');
    var modal=overlay && overlay.querySelector('.modal');
    var body=document.getElementById('modalBody') || (modal&&modal.querySelector('.modal-body'));
    if(!overlay||!modal||!body) return false;

    overlay.classList.remove('ys-exam-overlay');
    modal.classList.remove('ys-exam-modal');
    body.classList.remove('ys-exam-modal-body');
    overlay.classList.add('ys-report-overlay');
    modal.classList.add('ys-report-modal');
    body.classList.add('ys-report-body');

    var title=document.getElementById('modalTitle') || modal.querySelector('.modal-title');
    if(title){
      title.textContent='Yazılı Sınav Raporu';
      var wrap=title.parentElement;
      if(wrap){wrap.classList.add('ys-report-header');}
    }

    if(!body.querySelector('.ys-report-intro')){
      var intro=document.createElement('div');
      intro.className='ys-report-intro';
      intro.innerHTML='<div class="ys-report-intro-icon">▦</div><div><strong>Raporu hazırlayın</strong><span>Sayfa yönü, başlık, sınıflar ve gösterilecek alanları seçin. Android’de devam ettiğinizde gerçek A4 önizleme açılır.</span></div>';
      body.insertBefore(intro,body.firstChild);
    }

    var children=Array.from(body.children);
    var current=null;
    children.forEach(function(el){
      if(el.classList.contains('ys-report-intro')) return;
      var txt=(el.textContent||'').trim();
      var isHeading=el.tagName==='DIV' && el.children.length===0 && txt && txt.length<40;
      if(isHeading){
        current=document.createElement('section');
        current.className='ys-rpr-section';
        current.dataset.rprTone=headingTone(txt);
        var h=document.createElement('div');
        h.className='ys-rpr-heading'; h.textContent=txt;
        body.insertBefore(current,el);
        current.appendChild(h);
        el.remove();
      }else if(current && !el.classList.contains('ys-rpr-section')){
        current.appendChild(el);
      }
    });

    var footer=modal.querySelector('.modal-footer')||modal.querySelector('.modal-actions')||modal.querySelector('.modal-buttons')||document.getElementById('modalFooter');
    if(footer) footer.classList.add('ys-report-footer');
    var save=document.getElementById('modalKaydetBtn'); if(save) save.textContent='A4 Önizleme';

    modal.style.setProperty('display','flex','important');
    modal.style.setProperty('flex-direction','column','important');
    modal.style.setProperty('overflow','hidden','important');
    body.style.setProperty('flex','1 1 auto','important');
    body.style.setProperty('min-height','0','important');
    body.style.setProperty('overflow-y','auto','important');
    return true;
  }

  function reportHtmlEnhancer(){
    if(window.__ysRaporPencereWrapped) return;
    if(typeof window._raporPenceresiniAc!=='function') return;
    var original=window._raporPenceresiniAc;
    window.__ysRaporPencereWrapped=true;
    window._raporPenceresiniAc=function(html,baslik,opt){
      if(/yazılı sınav/i.test(String(baslik||''))){
        var extra='<style id="ys-report-output-style">'+
          '.rapor-header{border-bottom-color:#4f46e5!important}.rapor-header-text h1{color:#3730a3!important}'+
          'table{border:1px solid #dbe2ee!important;border-radius:8px!important;overflow:hidden!important}'+
          'thead tr{background:linear-gradient(90deg,#2f6fed,#765de0)!important}thead th{color:#fff!important}'+
          'tbody tr:nth-child(even){background:#f6f8fc!important}tbody td{border-bottom:1px solid #e4e9f1!important}'+
          '.ys-report-doc-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 8px}.ys-report-doc-summary>div{padding:6px 8px;border:1px solid #dce4ef;border-radius:8px;background:#f8faff;font-size:8.5px;color:#4b5a6e}.ys-report-doc-summary b{display:block;font-size:11px;color:#17243a;margin-top:1px}'+
          '@media print{.ys-report-doc-summary>div{background:#f8faff!important}}'+
        '</style>';
        var count=0;
        try{count=(typeof sinavlar!=='undefined'&&Array.isArray(sinavlar))?sinavlar.length:0;}catch(_){ }
        var summary='<div class="ys-report-doc-summary"><div>Rapor Türü<b>Yazılı Sınav Takvimi</b></div><div>Kayıt Havuzu<b>'+count+' sınav</b></div><div>Çıktı<b>A4 '+((opt&&opt.yon==='yatay')?'Yatay':'Dikey')+'</b></div></div>';
        html=extra+summary+String(html||'');
      }
      return original.call(this,html,baslik,opt);
    };
  }

  function start(){
    reportHtmlEnhancer();
    var overlay=document.getElementById('modalOverlay')||document.body;
    new MutationObserver(function(){setTimeout(function(){reportModalStyle();reportHtmlEnhancer();},0);}).observe(overlay,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('click',function(e){
    if(e.target.closest('[onclick*="sinavRaporModalAc"]')) setTimeout(reportModalStyle,30);
  },true);
})();
