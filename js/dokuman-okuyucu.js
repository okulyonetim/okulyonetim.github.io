/* ====================================================================
   UYGULAMA İÇİ BELGE GÖRÜNTÜLEYİCİ v2
   PDF   : PDF.js ile uygulama içinde sürekli sayfa görünümü
   DOCX  : docx-preview ile Word sayfa geometrisine yakın görünüm
   XLSX  : ExcelJS ile çalışma sayfası/biçim/ölçü görünümü
   XLS   : SheetJS ile eski Excel uyumluluk görünümü
   DOC   : Eski Word ikili formatı için çevrimiçi Office/Google iframe görünümü
   CSV/TXT/RESİM : yerel uygulama içi görünüm
   Diğer Office/OpenDocument türleri: kontrollü çevrimiçi uyumluluk görünümü
   ==================================================================== */
(function () {
  'use strict';

  const YEREL = new Set(['pdf','docx','xlsx','xls','csv','txt','png','jpg','jpeg','webp','gif','bmp','svg']);
  const CEVRIMICI = new Set(['doc','ppt','pptx','rtf','odt','ods']);
  const DESTEKLENEN = new Set([...YEREL, ...CEVRIMICI]);
  const DOCX_PREVIEW_URL = 'https://cdn.jsdelivr.net/npm/docx-preview@0.3.6/dist/docx-preview.min.js';
  const JSZIP_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

  let aktif = null;
  let pdfBelge = null;
  let excelWb = null;
  let eskiExcelWb = null;
  let govdeOncekiOverflow = '';

  function esc(v) {
    if (typeof escapeHtml === 'function') return escapeHtml(v == null ? '' : String(v));
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function uzanti(ad) {
    if (!ad) return '';
    try {
      const temiz = String(ad).split('?')[0].split('#')[0];
      const son = decodeURIComponent(temiz.split('/').pop() || '');
      const i = son.lastIndexOf('.');
      return i >= 0 ? son.slice(i + 1).toLowerCase() : '';
    } catch (_) {
      const s = String(ad); const i = s.lastIndexOf('.');
      return i >= 0 ? s.slice(i + 1).toLowerCase() : '';
    }
  }

  function dosyaAdiBul(ad, url) {
    if (ad && uzanti(ad)) return ad;
    try {
      const temiz = String(url || '').split('?')[0].split('#')[0];
      const son = decodeURIComponent(temiz.split('/').pop() || '');
      return son || ad || 'Belge';
    } catch (_) { return ad || 'Belge'; }
  }

  function scriptYukle(src, globalKontrol) {
    if (globalKontrol && globalKontrol()) return Promise.resolve();
    const varOlan = Array.from(document.scripts).find(s => s.src === src);
    if (varOlan) return new Promise((resolve, reject) => {
      if (globalKontrol && globalKontrol()) return resolve();
      varOlan.addEventListener('load', resolve, { once: true });
      varOlan.addEventListener('error', reject, { once: true });
    });
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Görüntüleme bileşeni yüklenemedi. İnternet bağlantısını kontrol edin.'));
      document.head.appendChild(s);
    });
  }

  async function docxMotorunuHazirla() {
    await scriptYukle(JSZIP_URL, () => typeof JSZip !== 'undefined');
    await scriptYukle(DOCX_PREVIEW_URL, () => typeof docx !== 'undefined' && typeof docx.renderAsync === 'function');
  }

  function yukleniyor(metin) {
    if (!aktif) return;
    aktif.body.innerHTML = `<div class="dv2-status"><div class="dv2-spinner"></div><div>${esc(metin || 'Belge hazırlanıyor…')}</div></div>`;
  }

  function hata(mesaj, detay) {
    if (!aktif) return;
    aktif.body.innerHTML = `<div class="dv2-error"><div class="dv2-error-icon">⚠️</div><h3>Belge görüntülenemedi</h3><p>${esc(mesaj || 'Bilinmeyen hata')}</p>${detay ? `<small>${esc(detay)}</small>` : ''}<div class="dv2-error-actions"><button class="dv2-btn" id="dv2HataIndir">⬇ İndir</button><button class="dv2-btn" id="dv2HataSistem">↗ Sistemle Aç</button></div></div>`;
    const i = aktif.body.querySelector('#dv2HataIndir'); if (i) i.onclick = indir;
    const s = aktif.body.querySelector('#dv2HataSistem'); if (s) s.onclick = sistemleAc;
  }

  function stilKur() {
    if (document.getElementById('dv2-style')) return;
    const st = document.createElement('style'); st.id = 'dv2-style';
    st.textContent = `
      .dv2{position:fixed;inset:0;z-index:1000000;background:#1c2026;color:#fff;display:flex;flex-direction:column;font-family:Inter,Arial,sans-serif}
      .dv2-head{min-height:56px;padding:max(8px,env(safe-area-inset-top)) 10px 8px;display:flex;align-items:center;gap:8px;background:#11151a;border-bottom:1px solid #30363d;box-sizing:border-box}
      .dv2-title{flex:1;min-width:0}.dv2-title strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}.dv2-title small{color:#aeb6c1;font-size:11px}
      .dv2-btn{border:1px solid #404852;background:#252b33;color:#fff;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:600;white-space:nowrap}.dv2-btn:hover{background:#303843}.dv2-btn.primary{background:#0a6e6e;border-color:#0a6e6e}
      .dv2-body{position:relative;flex:1;min-height:0;overflow:auto;background:#333941;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
      .dv2-status,.dv2-error{min-height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;gap:12px;padding:24px;box-sizing:border-box}.dv2-error p{max-width:620px;color:#d7dce2}.dv2-error small{color:#aeb6c1;max-width:700px}.dv2-error-icon{font-size:34px}.dv2-error-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
      .dv2-spinner{width:32px;height:32px;border:3px solid #65707d;border-top-color:#fff;border-radius:50%;animation:dv2spin .8s linear infinite}@keyframes dv2spin{to{transform:rotate(360deg)}}
      .dv2-pdf{display:flex;flex-direction:column;align-items:center;gap:14px;padding:16px;box-sizing:border-box}.dv2-page{background:#fff;box-shadow:0 3px 16px #0008;max-width:100%;height:auto}
      .dv2-word-area{min-width:100%;padding:18px;box-sizing:border-box;display:flex;justify-content:center;align-items:flex-start}.dv2-word-area .docx-wrapper{background:#d8dadd!important;padding:18px!important}.dv2-word-area section.docx{box-shadow:0 3px 14px #0005!important;margin-bottom:18px!important}
      .dv2-excel{min-width:100%;padding:12px;box-sizing:border-box}.dv2-sheetbar{position:sticky;top:0;z-index:4;display:flex;gap:5px;overflow-x:auto;padding:7px;background:#20262d;border-bottom:1px solid #3a424c}.dv2-sheetbar button{border:1px solid #47515d;background:#2b323a;color:#fff;border-radius:7px;padding:7px 10px;white-space:nowrap}.dv2-sheetbar button.active{background:#0a6e6e;border-color:#0a6e6e}.dv2-sheetwrap{overflow:auto;background:#fff;color:#111;max-width:100%;min-height:150px}.dv2-sheet{border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif}.dv2-sheet td{box-sizing:border-box;overflow:hidden}.dv2-sheet img{max-width:100%}
      .dv2-text{background:#fff;color:#111;white-space:pre-wrap;word-break:break-word;margin:16px;padding:18px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;line-height:1.5}
      .dv2-image-area{min-height:100%;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}.dv2-image-area img{max-width:100%;max-height:100%;object-fit:contain;transform-origin:center center;transition:transform .08s linear}
      .dv2-frame{border:0;width:100%;height:100%;background:#fff}.dv2-info{padding:8px 12px;background:#28313a;color:#dbe2e8;font-size:12px;border-bottom:1px solid #404a54;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      @media(max-width:640px){.dv2-head{gap:5px}.dv2-btn{padding:8px;font-size:12px}.dv2-hide-mobile{display:none}.dv2-word-area{padding:6px}.dv2-word-area .docx-wrapper{padding:6px!important}.dv2-excel{padding:0}}
    `;
    document.head.appendChild(st);
  }

  function overlayAc(url, ad, ext) {
    kapat(); stilKur();
    govdeOncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

    const ov = document.createElement('div'); ov.className = 'dv2'; ov.id = 'dokumanOkuyucuV2';
    ov.innerHTML = `<div class="dv2-head"><button class="dv2-btn" id="dv2Kapat">✕</button><div class="dv2-title"><strong>${esc(ad)}</strong><small id="dv2Tur">${esc(ext.toUpperCase() || 'BELGE')}</small></div><button class="dv2-btn dv2-hide-mobile" id="dv2Eksi">−</button><button class="dv2-btn dv2-hide-mobile" id="dv2Sifir">100%</button><button class="dv2-btn dv2-hide-mobile" id="dv2Arti">＋</button><button class="dv2-btn primary" id="dv2Indir">⬇ <span class="dv2-hide-mobile">İndir</span></button></div><div class="dv2-body" id="dv2Body"></div>`;
    document.body.appendChild(ov);
    aktif = { ov, body: ov.querySelector('#dv2Body'), url, ad, ext, zoom:1, zoomHedef:null };
    ov.querySelector('#dv2Kapat').onclick = kapat;
    ov.querySelector('#dv2Indir').onclick = indir;
    ov.querySelector('#dv2Eksi').onclick = () => zoomDegistir(-0.15);
    ov.querySelector('#dv2Arti').onclick = () => zoomDegistir(0.15);
    ov.querySelector('#dv2Sifir').onclick = () => zoomAyarla(1);
    document.addEventListener('keydown', escKapat);
    return ov;
  }

  function escKapat(e){ if(e.key === 'Escape') kapat(); }

  function kapat() {
    const ov = document.getElementById('dokumanOkuyucuV2'); if (ov) ov.remove();
    document.removeEventListener('keydown', escKapat);
    if (aktif) {
      if (aktif.blobUrl) try { URL.revokeObjectURL(aktif.blobUrl); } catch (_) {}
    }
    aktif = null; pdfBelge = null; excelWb = null; eskiExcelWb = null;
    document.body.style.overflow = govdeOncekiOverflow;
    if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
  }

  function zoomAyarla(z) {
    if (!aktif) return;
    aktif.zoom = Math.max(0.5, Math.min(3, z));
    const btn = aktif.ov.querySelector('#dv2Sifir'); if (btn) btn.textContent = Math.round(aktif.zoom * 100) + '%';
    const hedef = aktif.zoomHedef;
    if (hedef) {
      hedef.style.transformOrigin = hedef.classList.contains('dv2-image-target') ? 'center center' : 'top left';
      hedef.style.transform = `scale(${aktif.zoom})`;
      if (!hedef.classList.contains('dv2-image-target')) hedef.style.marginBottom = `${Math.max(0,(aktif.zoom-1)*hedef.scrollHeight)}px`;
    }
  }
  function zoomDegistir(d){ if(aktif) zoomAyarla(aktif.zoom + d); }

  async function fetchKontrollu(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Dosya alınamadı (${r.status})`);
    return r;
  }

  async function indir() {
    if (!aktif) return;
    try {
      if (typeof uygulamaDosyaKaydet === 'function') {
        const r = await fetchKontrollu(aktif.url); const blob = await r.blob();
        const base64 = await new Promise((resolve,reject)=>{ const fr=new FileReader(); fr.onloadend=()=>resolve(String(fr.result).split(',')[1]); fr.onerror=reject; fr.readAsDataURL(blob); });
        await uygulamaDosyaKaydet(base64, aktif.ad || `belge.${aktif.ext}`, blob.type || 'application/octet-stream', false);
      } else {
        const a=document.createElement('a'); a.href=aktif.url; a.download=aktif.ad||'belge'; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove();
      }
    } catch(e) { if(typeof toast==='function') toast('İndirme hatası: '+e.message); }
  }

  function sistemleAc(){ if(aktif) window.open(aktif.url, '_system'); }

  async function pdfAc() {
    if (typeof pdfjsLib === 'undefined') return hata('PDF görüntüleme bileşeni bulunamadı.');
    yukleniyor('PDF hazırlanıyor…');
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfBelge = await pdfjsLib.getDocument(aktif.url).promise;
      aktif.body.innerHTML = '<div class="dv2-pdf" id="dv2Pdf"></div>';
      const alan = aktif.body.querySelector('#dv2Pdf'); aktif.zoomHedef = alan;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      for (let i=1;i<=pdfBelge.numPages;i++) {
        const page=await pdfBelge.getPage(i); const base=page.getViewport({scale:1});
        const cssW=Math.min(Math.max(280, aktif.body.clientWidth-36), base.width*1.35);
        const cssScale=cssW/base.width; const viewport=page.getViewport({scale:cssScale*dpr});
        const c=document.createElement('canvas'); c.className='dv2-page'; c.width=Math.round(viewport.width); c.height=Math.round(viewport.height); c.style.width=Math.round(base.width*cssScale)+'px'; c.style.height=Math.round(base.height*cssScale)+'px'; c.dataset.page=i;
        alan.appendChild(c); await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport}).promise;
      }
    } catch(e){ hata('PDF açılamadı.', e.message); }
  }

  function argbCss(argb, fallback) {
    if (!argb) return fallback || null;
    let x=String(argb).replace('#',''); if(x.length===8)x=x.slice(2); return x.length===6?'#'+x:(fallback||null);
  }
  function borderCss(b){ if(!b||!b.style)return '1px solid #d6d9dc'; const w={hair:'1px',thin:'1px',medium:'2px',thick:'3px',double:'3px'}[b.style]||'1px'; return `${w} solid ${argbCss(b.color&&b.color.argb,'#999')}`; }
  function excelDeger(cell){
    const v=cell.value; if(v==null)return '';
    if(v instanceof Date)return esc(v.toLocaleDateString('tr-TR'));
    if(typeof v==='object'){ if(v.richText)return v.richText.map(x=>esc(x.text||'')).join(''); if(v.result!=null)return esc(v.result); if(v.text!=null)return esc(v.text); if(v.hyperlink)return esc(v.text||v.hyperlink); }
    return esc(v);
  }

  function xlsxTablo(ws) {
    const merges={}; const skip=new Set();
    (ws.model.merges||[]).forEach(r=>{ const [a,b]=r.split(':'); const ca=ws.getCell(a), cb=ws.getCell(b); merges[`${ca.row}:${ca.col}`]={rs:cb.row-ca.row+1,cs:cb.col-ca.col+1}; for(let rr=ca.row;rr<=cb.row;rr++)for(let cc=ca.col;cc<=cb.col;cc++)if(rr!==ca.row||cc!==ca.col)skip.add(`${rr}:${cc}`); });
    const table=document.createElement('table'); table.className='dv2-sheet';
    const colgroup=document.createElement('colgroup');
    for(let c=1;c<=Math.max(1,ws.columnCount);c++){ const col=document.createElement('col'); const w=ws.getColumn(c).width; col.style.width=Math.max(36,Math.min(420,(w||10)*7.3))+'px'; colgroup.appendChild(col); }
    table.appendChild(colgroup);
    const tb=document.createElement('tbody');
    for(let r=1;r<=ws.rowCount;r++){
      const row=ws.getRow(r); if(row.hidden)continue; const tr=document.createElement('tr'); if(row.height)tr.style.height=(row.height*1.333)+'px';
      for(let c=1;c<=ws.columnCount;c++){
        if(ws.getColumn(c).hidden)continue; const key=`${r}:${c}`; if(skip.has(key))continue; const cell=row.getCell(c); const td=document.createElement('td'); const m=merges[key]; if(m){if(m.rs>1)td.rowSpan=m.rs;if(m.cs>1)td.colSpan=m.cs;}
        const f=cell.font||{}, a=cell.alignment||{}, fill=cell.fill||{}, bd=cell.border||{};
        td.style.padding='4px 6px'; td.style.verticalAlign=a.vertical==='middle'?'middle':(a.vertical||'top'); td.style.textAlign=a.horizontal||'left'; td.style.whiteSpace=a.wrapText?'normal':'nowrap';
        if(f.bold)td.style.fontWeight='700'; if(f.italic)td.style.fontStyle='italic'; if(f.underline)td.style.textDecoration='underline'; if(f.size)td.style.fontSize=f.size+'px'; if(f.name)td.style.fontFamily=`${f.name},Arial,sans-serif`; const fc=argbCss(f.color&&f.color.argb); if(fc)td.style.color=fc;
        if(fill.type==='pattern'&&fill.pattern==='solid'){const bg=argbCss(fill.fgColor&&fill.fgColor.argb);if(bg)td.style.backgroundColor=bg;}
        td.style.borderTop=borderCss(bd.top);td.style.borderRight=borderCss(bd.right);td.style.borderBottom=borderCss(bd.bottom);td.style.borderLeft=borderCss(bd.left);
        td.innerHTML=excelDeger(cell); tr.appendChild(td);
      }
      tb.appendChild(tr);
    }
    table.appendChild(tb); return table;
  }

  function excelKabuk(sheetNames, renderFn) {
    aktif.body.innerHTML='<div class="dv2-sheetbar" id="dv2SheetBar"></div><div class="dv2-excel"><div class="dv2-sheetwrap" id="dv2SheetWrap"></div></div>';
    const bar=aktif.body.querySelector('#dv2SheetBar');
    sheetNames.forEach((n,i)=>{const b=document.createElement('button');b.textContent=n;b.onclick=()=>{bar.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderFn(i);};bar.appendChild(b);});
    if(bar.firstChild){bar.firstChild.classList.add('active');renderFn(0);}
  }

  async function xlsxAc() {
    if(typeof ExcelJS==='undefined') return hata('ExcelJS bileşeni bulunamadı.');
    yukleniyor('Excel çalışma kitabı hazırlanıyor…');
    try{
      const buf=await (await fetchKontrollu(aktif.url)).arrayBuffer(); excelWb=new ExcelJS.Workbook(); await excelWb.xlsx.load(buf);
      excelKabuk(excelWb.worksheets.map(w=>w.name),(idx)=>{ const wrap=aktif.body.querySelector('#dv2SheetWrap'); wrap.innerHTML=''; const t=xlsxTablo(excelWb.worksheets[idx]); wrap.appendChild(t); aktif.zoomHedef=t; zoomAyarla(1); });
    }catch(e){ hata('Excel dosyası açılamadı.',e.message); }
  }

  async function xlsAc() {
    if(typeof XLSX==='undefined') return hata('Eski Excel görüntüleme bileşeni bulunamadı.');
    yukleniyor('Eski Excel (.xls) hazırlanıyor…');
    try{
      const buf=await (await fetchKontrollu(aktif.url)).arrayBuffer(); eskiExcelWb=XLSX.read(buf,{type:'array',cellStyles:true,cellDates:true});
      excelKabuk(eskiExcelWb.SheetNames,(idx)=>{ const wrap=aktif.body.querySelector('#dv2SheetWrap'); const ws=eskiExcelWb.Sheets[eskiExcelWb.SheetNames[idx]]; wrap.innerHTML=XLSX.utils.sheet_to_html(ws,{editable:false,id:'dv2LegacyXls'}); const table=wrap.querySelector('table'); if(table){table.className='dv2-sheet'; table.querySelectorAll('td,th').forEach(td=>{td.style.border='1px solid #d6d9dc';td.style.padding='4px 6px';td.style.whiteSpace='nowrap';}); aktif.zoomHedef=table;zoomAyarla(1);} });
    }catch(e){ hata('Eski Excel (.xls) açılamadı.',e.message); }
  }

  async function csvAc(){
    if(typeof XLSX==='undefined') return metinAc();
    yukleniyor('CSV hazırlanıyor…');
    try{const text=await (await fetchKontrollu(aktif.url)).text(); eskiExcelWb=XLSX.read(text,{type:'string'}); excelKabuk(eskiExcelWb.SheetNames,(idx)=>{const wrap=aktif.body.querySelector('#dv2SheetWrap');wrap.innerHTML=XLSX.utils.sheet_to_html(eskiExcelWb.Sheets[eskiExcelWb.SheetNames[idx]]);const table=wrap.querySelector('table');if(table){table.className='dv2-sheet';table.querySelectorAll('td,th').forEach(td=>{td.style.border='1px solid #ddd';td.style.padding='5px 8px';});aktif.zoomHedef=table;}});}catch(e){hata('CSV açılamadı.',e.message);}
  }

  async function docxAc() {
    yukleniyor('Word belgesi hazırlanıyor…');
    try{
      await docxMotorunuHazirla(); const buf=await (await fetchKontrollu(aktif.url)).arrayBuffer();
      aktif.body.innerHTML='<div class="dv2-word-area"><div id="dv2Word"></div></div>'; const cont=aktif.body.querySelector('#dv2Word');
      await docx.renderAsync(buf,cont,null,{inWrapper:true,breakPages:true,ignoreWidth:false,ignoreHeight:false,ignoreFonts:false,renderHeaders:true,renderFooters:true,renderFootnotes:true,renderEndnotes:true,ignoreLastRenderedPageBreak:false,useBase64URL:true,renderChanges:true,renderComments:false,renderAltChunks:true});
      aktif.zoomHedef=cont; zoomAyarla(1);
    }catch(e){
      // İnternet yoksa veya docx-preview yüklenemezse içerik kaybolmasın diye Mammoth ikinci seçenek.
      if(typeof mammoth!=='undefined'){
        try{const buf=await (await fetchKontrollu(aktif.url)).arrayBuffer();const res=await mammoth.convertToHtml({arrayBuffer:buf});aktif.body.innerHTML=`<div class="dv2-info">⚠ Word sayfa motoru kullanılamadı; içerik uyumluluk görünümünde gösteriliyor.</div><div class="dv2-word-area"><div id="dv2WordFallback" style="background:#fff;color:#111;min-width:min(210mm,100%);max-width:210mm;padding:18mm;box-sizing:border-box">${res.value}</div></div>`;aktif.zoomHedef=aktif.body.querySelector('#dv2WordFallback');return;}catch(_){}
      }
      hata('Word (.docx) görüntülenemedi.',e.message);
    }
  }

  async function metinAc(){
    yukleniyor('Metin okunuyor…');
    try{const text=await (await fetchKontrollu(aktif.url)).text();aktif.body.innerHTML=`<pre class="dv2-text">${esc(text)}</pre>`;aktif.zoomHedef=aktif.body.querySelector('.dv2-text');}catch(e){hata('Metin dosyası açılamadı.',e.message);}
  }

  function resimAc(){ aktif.body.innerHTML=`<div class="dv2-image-area"><img class="dv2-image-target" src="${esc(aktif.url)}" alt="${esc(aktif.ad)}"></div>`;aktif.zoomHedef=aktif.body.querySelector('.dv2-image-target'); }

  function officeViewerUrl(url, tur){
    if(tur==='google')return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }

  function cevrimiciAc(ext) {
    const docEski=ext==='doc';
    aktif.body.innerHTML=`<div class="dv2-info"><span>${docEski?'Eski Word (.doc)':'Bu dosya türü'} tarayıcıda yerel olarak birebir işlenemediği için çevrimiçi belge motoruyla görüntüleniyor.</span><button class="dv2-btn" id="dv2Office">Microsoft</button><button class="dv2-btn" id="dv2Google">Google</button><button class="dv2-btn" id="dv2System">Sistemle Aç</button></div><iframe class="dv2-frame" id="dv2Frame" referrerpolicy="no-referrer"></iframe>`;
    const frame=aktif.body.querySelector('#dv2Frame');
    const ac=(t)=>{frame.src=officeViewerUrl(aktif.url,t);};
    aktif.body.querySelector('#dv2Office').onclick=()=>ac('office');aktif.body.querySelector('#dv2Google').onclick=()=>ac('google');aktif.body.querySelector('#dv2System').onclick=sistemleAc;ac('office');
  }

  function bilinmeyenAc(){
    aktif.body.innerHTML=`<div class="dv2-error"><div class="dv2-error-icon">📄</div><h3>Bu dosya türü için yerleşik önizleme yok</h3><p>Dosya otomatik olarak indirilmedi. İsterseniz sistem uygulamasıyla açabilir veya açıkça indirebilirsiniz.</p><div class="dv2-error-actions"><button class="dv2-btn" id="dv2UnknownSystem">↗ Sistemle Aç</button><button class="dv2-btn primary" id="dv2UnknownDownload">⬇ İndir</button></div></div>`;
    aktif.body.querySelector('#dv2UnknownSystem').onclick=sistemleAc;aktif.body.querySelector('#dv2UnknownDownload').onclick=indir;
  }

  function googleDocsMu(url){return typeof url==='string' && /^https:\/\/(docs|drive)\.google\.com\//i.test(url);}
  function googleLinkAc(url,ad){ overlayAc(url,ad,'google'); aktif.body.innerHTML=`<div class="dv2-info">Google belgesi uygulama içinde açılıyor. Oturum gerektirirse “Sistemle Aç” seçeneğini kullanabilirsiniz.<button class="dv2-btn" id="dv2GoogleSystem">↗ Sistemle Aç</button></div><iframe class="dv2-frame" src="${esc(url)}"></iframe>`;aktif.body.querySelector('#dv2GoogleSystem').onclick=sistemleAc; }

  async function ac(url, ad) {
    if(!url)return;
    const isim=dosyaAdiBul(ad,url);
    if(googleDocsMu(url)){googleLinkAc(url,isim||'Google Belge');return;}
    const ext=uzanti(isim)||uzanti(url); overlayAc(url,isim,ext);
    if(ext==='pdf')return pdfAc();
    if(ext==='docx')return docxAc();
    if(ext==='xlsx')return xlsxAc();
    if(ext==='xls')return xlsAc();
    if(ext==='csv')return csvAc();
    if(ext==='txt')return metinAc();
    if(['png','jpg','jpeg','webp','gif','bmp','svg'].includes(ext))return resimAc();
    if(CEVRIMICI.has(ext))return cevrimiciAc(ext);
    return bilinmeyenAc();
  }

  window.DokumanOkuyucu={
    destekliMi(adVeyaUrl){return googleDocsMu(adVeyaUrl)||DESTEKLENEN.has(uzanti(adVeyaUrl));},
    googleDocsMu,
    ac
  };
})();
