/* Koruk Asistan — Ders + Nöbet mobil kart görünümleri
   ÖNEMLİ: modal/overlay/class observer altyapısına dokunmaz.
   MutationObserver yalnız schedule tablolarının childList değişimini izler;
   callback gözlemlenen tabloya hiçbir DOM/class yazımı yapmaz. */
(function(){
'use strict';
if(window.__DERS_NOBET_MOBILE_VIEW_V1__) return;
window.__DERS_NOBET_MOBILE_VIEW_V1__ = true;

const GUN_KISA = ['Pzt','Sal','Çar','Per','Cum'];
const GUN_UZUN = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
let seciliGun = Math.max(0, Math.min(4, new Date().getDay() - 1));
if(new Date().getDay() === 0 || new Date().getDay() === 6) seciliGun = 0;

function mobilMi(){ return window.matchMedia('(max-width: 760px)').matches; }
function temizMetin(el){ return (el && el.textContent ? el.textContent : '').replace(/\s+/g,' ').trim(); }
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function ikonDers(ad){
  const t=(ad||'').toLocaleLowerCase('tr');
  if(t.includes('fen')) return '🧪';
  if(t.includes('matematik')) return '✖️';
  if(t.includes('türk')) return '📘';
  if(t.includes('ingiliz')) return '🔤';
  if(t.includes('sosyal')) return '🌍';
  if(t.includes('din')) return '📖';
  if(t.includes('beden')) return '🏃';
  if(t.includes('müzik')) return '🎵';
  if(t.includes('görsel') || t.includes('resim')) return '🎨';
  if(t.includes('bilişim')) return '💻';
  return '📚';
}

function ensureDersView(){
  const tablo=document.getElementById('dersGridTablo');
  if(!tablo) return null;
  let view=document.getElementById('dersProgramiMobilView');
  if(!view){
    view=document.createElement('div');
    view.id='dersProgramiMobilView';
    view.className='dn-mobile-view dn-ders-mobile-view';
    tablo.insertAdjacentElement('afterend',view);
  }
  return view;
}

function dersHucreTikla(rowIndex, cellIndex){
  const tablo=document.getElementById('dersGridTablo');
  const row=tablo?.rows?.[rowIndex];
  const cell=row?.cells?.[cellIndex];
  if(cell) cell.click();
}
window.dnDersHucreTikla = dersHucreTikla;
window.dnDersGunSec = function(i){
  seciliGun=Number(i)||0;
  renderDersMobil();
};

function dersSatirlariniOku(tablo){
  const rows=Array.from(tablo.rows||[]);
  if(!rows.length) return {headers:[], dersler:[]};
  const headRow=rows.find(r => Array.from(r.cells||[]).some(c => GUN_UZUN.some(g => temizMetin(c).toLocaleLowerCase('tr').includes(g.toLocaleLowerCase('tr'))))) || rows[0];
  const headers=Array.from(headRow.cells||[]).map(temizMetin);
  const headIndex=rows.indexOf(headRow);
  const dersler=[];
  let sonDers=null;
  for(let ri=headIndex+1; ri<rows.length; ri++){
    const row=rows[ri];
    const cells=Array.from(row.cells||[]);
    if(!cells.length) continue;
    const rowText=temizMetin(row);
    if(/teneff/i.test(rowText)){
      if(sonDers) sonDers.teneffus=rowText.replace(/teneff(ü|u)s:?/i,'').trim() || 'Teneffüs';
      continue;
    }
    if(cells.length < 2) continue;
    const saatText=temizMetin(cells[0]);
    const numMatch=saatText.match(/(^|\s)(\d{1,2})\.?\s/);
    const saatMatch=saatText.match(/\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/);
    if(!numMatch && !saatMatch) continue;
    const ders={rowIndex:ri, no:numMatch?numMatch[2]:String(dersler.length+1), saat:saatMatch?saatMatch[0].replace(/\s/g,''):'', cells:[], teneffus:''};
    for(let ci=1; ci<cells.length; ci++) ders.cells.push({cellIndex:ci, text:temizMetin(cells[ci]), html:cells[ci].innerHTML||'', clickable:!!(cells[ci].getAttribute('onclick') || cells[ci].onclick)});
    dersler.push(ders); sonDers=ders;
  }
  return {headers, dersler};
}

function renderDersMobil(){
  const tablo=document.getElementById('dersGridTablo');
  const view=ensureDersView();
  if(!tablo||!view) return;
  if(!mobilMi()){ view.innerHTML=''; return; }
  const {dersler}=dersSatirlariniOku(tablo);
  const sinif=document.getElementById('dersSinifSecimi');
  const sinifAdi=sinif?.selectedOptions?.[0]?.textContent?.trim() || '';
  const bugun=new Date();
  const bugunGun=bugun.getDay()-1;
  const tabs=GUN_KISA.map((g,i)=>`<button type="button" class="dn-day-tab ${i===seciliGun?'active':''}" onclick="dnDersGunSec(${i})"><strong>${g}</strong>${i===bugunGun?'<small>Bugün</small>':''}</button>`).join('');
  let kartlar='';
  dersler.forEach((d,idx)=>{
    const hucre=d.cells[seciliGun] || {text:'',cellIndex:seciliGun+1,clickable:false};
    const metin=(hucre.text||'').trim();
    const bos=!metin || metin==='+' || metin==='—' || metin==='-';
    let ana=metin, alt='';
    if(!bos){
      const parts=metin.split(/\s{2,}|\n/).map(x=>x.trim()).filter(Boolean);
      ana=parts[0]||metin; alt=parts.slice(1).join(' · ');
    }
    const click=`onclick="dnDersHucreTikla(${d.rowIndex},${hucre.cellIndex})"`;
    kartlar += `<div class="dn-lesson-card ${bos?'is-empty':''}" ${click}>
      <div class="dn-lesson-time"><b>${esc(d.no)}.</b><span>${esc(d.saat||'')}</span></div>
      <div class="dn-lesson-main">${bos
        ? `<div class="dn-add-lesson"><span>＋</span><strong>Ders Ekle</strong></div>`
        : `<div class="dn-lesson-name"><span class="dn-lesson-icon">${ikonDers(ana)}</span><strong>${esc(ana)}</strong></div>${alt?`<div class="dn-lesson-sub">${esc(alt)}</div>`:''}`}
      </div>
      <div class="dn-lesson-action">${bos?'＋':'✎'}</div>
    </div>`;
    if(d.teneffus && idx<dersler.length-1) kartlar += `<div class="dn-break"><span>☕</span> ${esc(d.teneffus)}</div>`;
  });
  if(!dersler.length) kartlar='<div class="dn-empty">Bu sınıf için ders programı bulunamadı.</div>';
  view.innerHTML=`<div class="dn-mobile-title"><div><strong>Ders Programı</strong><span>${esc(sinifAdi)}</span></div></div><div class="dn-day-tabs">${tabs}</div><div class="dn-mobile-date">📅 ${GUN_UZUN[seciliGun]}</div><div class="dn-lessons">${kartlar}</div>`;
}

function ensureNobetView(){
  const tablo=document.getElementById('nobetGridTablo');
  if(!tablo) return null;
  let view=document.getElementById('nobetProgramiMobilView');
  if(!view){
    view=document.createElement('div');
    view.id='nobetProgramiMobilView';
    view.className='dn-mobile-view dn-nobet-mobile-view';
    tablo.insertAdjacentElement('afterend',view);
  }
  return view;
}
function nobetHucreTikla(rowIndex, cellIndex){
  const tablo=document.getElementById('nobetGridTablo');
  const cell=tablo?.rows?.[rowIndex]?.cells?.[cellIndex];
  if(cell) cell.click();
}
window.dnNobetHucreTikla=nobetHucreTikla;

function renderNobetMobil(){
  const tablo=document.getElementById('nobetGridTablo');
  const view=ensureNobetView();
  if(!tablo||!view) return;
  if(!mobilMi()){ view.innerHTML=''; return; }
  const rows=Array.from(tablo.rows||[]);
  if(!rows.length){view.innerHTML='<div class="dn-empty">Nöbet çizelgesi bulunamadı.</div>';return;}
  const headerRow=rows[0];
  const headers=Array.from(headerRow.cells||[]).map(temizMetin);
  let cards='';
  for(let ri=1;ri<rows.length;ri++){
    const row=rows[ri], cells=Array.from(row.cells||[]); if(!cells.length) continue;
    const tarih=temizMetin(cells[0]); if(!tarih) continue;
    const haftasonu=/cumartesi|pazar/i.test(tarih);
    const rowText=temizMetin(row);
    const tatil=/tatil/i.test(rowText);
    let gorevler='';
    for(let ci=1;ci<cells.length;ci++){
      const h=headers[ci]||`Alan ${ci}`;
      const val=temizMetin(cells[ci]);
      if(/amir/i.test(h)) continue;
      const bos=!val || val==='—' || val==='-' || /hafta sonu/i.test(val);
      gorevler += `<button type="button" class="dn-duty-chip ${bos?'is-empty':''}" onclick="dnNobetHucreTikla(${ri},${ci})"><span>${esc(h)}</span><strong>${bos?'—':esc(val)}</strong></button>`;
    }
    cards += `<div class="dn-duty-day ${haftasonu?'is-weekend':''} ${tatil?'is-holiday':''}"><div class="dn-duty-date"><strong>${esc(tarih)}</strong>${tatil?'<span>Resmi Tatil</span>':''}</div><div class="dn-duty-grid">${gorevler}</div></div>`;
  }
  view.innerHTML=`<div class="dn-nobet-head"><span>Gün</span><span>Nöbet Alanları</span></div>${cards || '<div class="dn-empty">Bu ay için kayıt bulunamadı.</div>'}`;
}

function rafDebounce(fn){let raf=0;return function(){cancelAnimationFrame(raf);raf=requestAnimationFrame(fn);};}
const dersYenile=rafDebounce(renderDersMobil), nobetYenile=rafDebounce(renderNobetMobil);
function bagla(){
  const d=document.getElementById('dersGridTablo');
  const n=document.getElementById('nobetGridTablo');
  if(d && !d.dataset.dnMobileObserved){
    d.dataset.dnMobileObserved='1';
    new MutationObserver(dersYenile).observe(d,{childList:true,subtree:true,characterData:true});
  }
  if(n && !n.dataset.dnMobileObserved){
    n.dataset.dnMobileObserved='1';
    new MutationObserver(nobetYenile).observe(n,{childList:true,subtree:true,characterData:true});
  }
  dersYenile(); nobetYenile();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bagla,{once:true}); else bagla();
window.addEventListener('resize',rafDebounce(()=>{renderDersMobil();renderNobetMobil();}));
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-tab="dersProgrami"]')) setTimeout(renderDersMobil,60);
  if(e.target.closest?.('[data-tab="nobet"]')) setTimeout(renderNobetMobil,60);
});
})();
