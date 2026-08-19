/* Koruk Asistan — Excel tarih yerelleştirme düzeltmesi
 * SheetJS'in İngilizce uzun tarih metnini Türkçe karşılığına çevirir.
 * Hücre numFmt kısa/nümerik tarih ise mevcut biçimlenmiş metne dokunmaz.
 */
(function(){
'use strict';
const EN_MONTHS={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
const EN_DAYS='Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday';
const LONG_RE=new RegExp('^(?:'+EN_DAYS+'),\\s+([A-Za-z]+)\\s+(\\d{1,2}),\\s+(\\d{4})$','i');
function trLong(s){
  const m=LONG_RE.exec(String(s||'').trim());
  if(!m)return null;
  const ay=EN_MONTHS[m[1].toLowerCase()];
  if(ay==null)return null;
  const d=new Date(+m[3],ay,+m[2],12,0,0);
  if(Number.isNaN(d.getTime()))return null;
  return new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
}
function normalize(root){
  (root||document).querySelectorAll('.evf-grid td,.ev3-grid td').forEach(td=>{
    const tr=trLong(td.textContent);
    if(tr)td.textContent=tr;
  });
}
const obs=new MutationObserver(ms=>{
  for(const m of ms)for(const n of m.addedNodes||[])if(n.nodeType===1){
    if(n.matches?.('.evf-grid,.ev3-grid,.evf-grid td,.ev3-grid td'))normalize(n.matches('td')?n.parentElement:n);
    else if(n.querySelector?.('.evf-grid,.ev3-grid'))normalize(n);
  }
});
function kur(){normalize(document);obs.observe(document.documentElement,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kur,{once:true});else kur();
window.ExcelTurkceTarih={normalize,trLong};
})();
